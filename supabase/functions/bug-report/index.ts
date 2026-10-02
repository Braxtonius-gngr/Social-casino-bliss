import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient, type SupabaseClient } from "https://esm.sh/@supabase/supabase-js@2.39.0";
import { addressKey, buildEmbed, cleanErrors, clientAddress, RateLimiter, type Report, validate } from "./report.ts";

// POST { category, text, meta?: { userAgent, appBuild, catalogVersion, theme, trackedCount, recentErrors } }
//   -> { ok: true, id, discord: 'sent' | 'failed' | 'skipped' }
//
// The in-app feedback form. The report is written to public.bug_reports
// first, so nothing is lost if Discord is down, and then the same embed
// the form used to post itself is forwarded to the channel from the
// DISCORD_BUG_WEBHOOK secret. The webhook URL never reaches the browser.
const allowedOrigins = new Set([
  "https://casino-almanac.app",
  "https://dailyrollover.com",
  "https://www.dailyrollover.com",
  "https://braxtonius-gngr.github.io",
  "http://localhost:8080",
  "http://localhost:5173",
]);
// One address gets this many reports per hour before being asked to wait.
// The count lives in the database (allow_bug_report), shared by every
// isolate and counted in one statement, so a parallel burst is counted,
// not raced. The in-memory limiter is only the fallback if that call
// fails, so a database hiccup degrades to per-isolate limiting rather
// than to none.
const RATE_LIMIT = 10;
const RATE_WINDOW_MS = 60 * 60 * 1000;
const localLimiter = new RateLimiter(RATE_LIMIT, RATE_WINDOW_MS);

async function allowed(supabase: SupabaseClient, key: string): Promise<boolean> {
  try {
    const { data, error } = await supabase.rpc("allow_bug_report", { p_key_hash: key, p_limit: RATE_LIMIT });
    if (error) throw error;
    if (typeof data === "boolean") return data;
  } catch (err) {
    console.warn("allow_bug_report unavailable, limiting per isolate:", err);
  }
  return localLimiter.allow(key);
}
// Discord gets this long before the report is recorded as 'failed' and the
// tester still sees a thank-you: the row is already saved.
const DISCORD_TIMEOUT_MS = 8_000;

function corsHeaders(req: Request) {
  const origin = req.headers.get("Origin") ?? "";
  return {
    "Access-Control-Allow-Origin": allowedOrigins.has(origin) ? origin : "null",
    "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
    "Access-Control-Allow-Methods": "POST, OPTIONS",
    "Vary": "Origin",
  };
}

function jsonResponse(body: Record<string, unknown>, status: number, cors: Record<string, string>) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...cors, "Content-Type": "application/json" },
  });
}

async function forwardToDiscord(report: Report, id: number): Promise<"sent" | "failed" | "skipped"> {
  const webhook = Deno.env.get("DISCORD_BUG_WEBHOOK") ?? "";
  if (!webhook) return "skipped";
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), DISCORD_TIMEOUT_MS);
  try {
    const response = await fetch(webhook, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(buildEmbed(report, id)),
      signal: controller.signal,
    });
    if (!response.ok) {
      console.error("Discord refused the bug report", id, response.status, await response.text().catch(() => ""));
      return "failed";
    }
    return "sent";
  } catch (error) {
    console.error("Discord forward failed", id, error);
    return "failed";
  } finally {
    clearTimeout(timer);
  }
}

serve(async (req) => {
  const cors = corsHeaders(req);
  if (req.method === "OPTIONS") return new Response("ok", { headers: cors });
  if (req.method !== "POST") return jsonResponse({ error: "POST only." }, 405, cors);

  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return jsonResponse({ error: "Expected a JSON body." }, 400, cors);
  }

  const checked = validate(body);
  if ("error" in checked) return jsonResponse({ error: checked.error }, 400, cors);
  const report = checked.report;

  const serviceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "";
  const supabase = createClient(Deno.env.get("SUPABASE_URL") ?? "", serviceKey);

  // Count the request before anything is written. The limiter never sees
  // the address itself, only a salted hash.
  const key = await addressKey(clientAddress(req), Deno.env.get("BUG_REPORT_SALT") ?? serviceKey);
  if (!await allowed(supabase, key)) {
    return jsonResponse({ error: "That's plenty for one hour - thank you. Try again a little later." }, 429, cors);
  }

  // The account is recorded when there is one (the device's anonymous
  // account counts); a report from a page with no session is still taken.
  const token = req.headers.get("Authorization")?.replace(/^Bearer\s+/i, "") ?? "";
  let userId: string | null = null;
  if (token) {
    const { data } = await supabase.auth.getUser(token).catch(() => ({ data: { user: null } }));
    userId = data?.user?.id ?? null;
  }

  const { data: inserted, error: insertError } = await supabase
    .from("bug_reports")
    .insert({
      category: report.category,
      body: report.text,
      user_agent: report.meta.userAgent,
      app_build: report.meta.appBuild,
      catalog_version: report.meta.catalogVersion,
      theme: report.meta.theme,
      tracked_count: report.meta.trackedCount,
      recent_errors: cleanErrors(report.meta.recentErrors),
      user_id: userId,
      origin: req.headers.get("Origin"),
    })
    .select("id")
    .single();
  if (insertError || !inserted) {
    console.error("bug_reports insert failed", insertError);
    return jsonResponse({ error: "Couldn't save the report. Try again in a bit." }, 500, cors);
  }

  const discord = await forwardToDiscord(report, inserted.id);
  // The row is saved and Discord has or hasn't got its copy; only the
  // record of which is left. A failed update is retried once and then
  // logged with the id - never resent to Discord, never bounced to the
  // tester, whose report is already in.
  for (let attempt = 1; attempt <= 2; attempt++) {
    const { error } = await supabase.from("bug_reports").update({ discord_status: discord }).eq("id", inserted.id);
    if (!error) break;
    console.error(`discord_status update failed for bug_reports #${inserted.id} (attempt ${attempt})`, error);
  }

  return jsonResponse({ ok: true, id: inserted.id, discord }, 200, cors);
});
