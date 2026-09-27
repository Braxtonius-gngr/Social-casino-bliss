import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.39.0";
import {
  RateLimiter,
  addressKey,
  clientAddress,
  launchTokenFrom,
  plainResponse,
  platformNameFrom,
  redirectResponse,
  safeDestination,
} from "./redirect.ts";

// GET /go?p=<platform name>[&via=<launch token>] -> 302 to that
// platform's launch link.
//
// The catalogue the browser holds carries each platform's plain address;
// the referral links live in platform_links and only ever leave the
// database as a redirect from here. Anyone can follow a redirect (that is
// the point of a referral link), so the protection is rate: a person
// opens a handful of platforms a day, a harvester wants all of them at
// once. Every follow is counted per platform for the owner's report.
//
// `via` is a launch token a Pro viewer holds for a shared list. The
// database decides whether the sharer's own link applies to this click
// (both Pro, not the sharer's own account, under the monthly cap); when
// it does not, the house link is used as for anyone else.
//
// The limit is kept in the database (allow_link_request), shared by every
// isolate serving this function. The in-memory limiter below is only the
// fallback if that call fails, so a database hiccup degrades to
// per-isolate limiting rather than to none.
const LIMIT_PER_MINUTE = 30;
const localLimiter = new RateLimiter(LIMIT_PER_MINUTE, 60_000);

async function allowed(address: string): Promise<boolean> {
  try {
    const { data, error } = await supabase.rpc("allow_link_request", {
      p_key_hash: await addressKey(address),
      p_limit: LIMIT_PER_MINUTE,
    });
    if (error) throw error;
    if (typeof data === "boolean") return data;
  } catch (err) {
    console.warn("allow_link_request unavailable, limiting per isolate:", err);
  }
  return localLimiter.allow(address);
}

const supabase = createClient(
  Deno.env.get("SUPABASE_URL") ?? "",
  Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "",
  { auth: { persistSession: false } },
);

serve(async (req) => {
  if (req.method !== "GET" && req.method !== "HEAD") {
    return plainResponse(405, "Method not allowed");
  }
  const name = platformNameFrom(new URL(req.url));
  if (!name) return plainResponse(400, "Which platform? Add ?p=<platform name>.");
  if (!(await allowed(clientAddress(req)))) {
    return plainResponse(429, "Too many link requests from this address. Try again in a minute.");
  }

  const { data, error } = await supabase
    .from("platform_links")
    .select("name, launch_url")
    .eq("name_key", name)
    .maybeSingle();
  if (error) {
    console.error("platform_links lookup failed:", error.message);
    return plainResponse(503, "The link service is unavailable right now.");
  }
  const houseDestination = safeDestination(data?.launch_url);
  if (!data || !houseDestination) return plainResponse(404, "No such platform in the catalogue.");

  let destination = houseDestination;
  const via = launchTokenFrom(new URL(req.url));
  if (via) {
    try {
      const { data: shared, error: sharedError } = await supabase.rpc("resolve_shared_link", { p_token: via, p_name_key: name });
      if (sharedError) throw sharedError;
      destination = safeDestination(typeof shared === "string" ? shared : null) ?? houseDestination;
    } catch (err) {
      console.warn("resolve_shared_link failed, using the house link:", err);
    }
  }

  // Counted after the lookup so unknown names never create rows. A failed
  // count must not cost the player their redirect, but it is logged: the
  // client reports failures in the result, not by throwing.
  try {
    const { error: hitError } = await supabase.rpc("record_link_hit", { p_name: data.name });
    if (hitError) console.warn("record_link_hit failed:", hitError.message);
  } catch (err) {
    console.warn("record_link_hit failed:", err);
  }
  return redirectResponse(destination);
});
