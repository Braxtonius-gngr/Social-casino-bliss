import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.39.0";
import Stripe from 'npm:stripe@^17.7.0';

const stripe = new Stripe(Deno.env.get('STRIPE_SECRET_KEY') ?? '', {
  apiVersion: '2025-01-27.acacia' as any,
  httpClient: Stripe.createFetchHttpClient(),
});
const allowedOrigins = new Set([
  "https://casino-almanac.app",
  "https://dailyrollover.com",
  "https://www.dailyrollover.com",
  "https://braxtonius-gngr.github.io",
  "http://localhost:8080",
  "http://localhost:5173",
]);

function corsHeaders(req: Request) {
  const origin = req.headers.get("Origin") ?? "";
  return {
    "Access-Control-Allow-Origin": allowedOrigins.has(origin) ? origin : "null",
    "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
    "Access-Control-Allow-Methods": "POST, OPTIONS",
    "Vary": "Origin",
  };
}

function validReturnUrl(value: unknown) {
  const url = new URL(String(value ?? ""));
  const isHttps = url.protocol === "https:";
  const isLocal = url.hostname === "localhost" || url.hostname === "127.0.0.1";
  if (!allowedOrigins.has(url.origin) || (!isHttps && !isLocal)) {
    throw new Error("Invalid return URL origin.");
  }
  return url.toString();
}

// The origin the caller came from, used when the request body carries no
// usable returnUrl of its own. Mirrors create-checkout-session so a client
// that omits the field still lands back on the app instead of erroring.
function defaultReturnUrl(req: Request) {
  const origin = req.headers.get("Origin");
  if (origin && allowedOrigins.has(origin)) return origin;
  const referer = req.headers.get("Referer");
  if (referer) {
    try {
      const refererOrigin = new URL(referer).origin;
      if (allowedOrigins.has(refererOrigin)) return refererOrigin;
    } catch {
      // Ignore malformed Referer headers.
    }
  }
  return undefined;
}

function errorMessage(error: unknown) {
  return error instanceof Error ? error.message : "Portal session creation failed.";
}

function jsonResponse(body: Record<string, unknown>, status: number, cors: Record<string, string>) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...cors, "Content-Type": "application/json" },
  });
}

serve(async (req) => {
  const cors = corsHeaders(req);
  if (req.method === "OPTIONS") return new Response("ok", { headers: cors });
  if (req.method !== "POST") {
    return jsonResponse({ error: "POST required." }, 405, cors);
  }

  try {
    const token = req.headers.get("Authorization")?.replace(/^Bearer\s+/i, "");
    if (!token) throw new Error("Missing authorization.");
    const supabase = createClient(
      Deno.env.get("SUPABASE_URL") ?? "",
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "",
    );
    const { data: { user }, error: authError } = await supabase.auth.getUser(token);
    // Only an unresolvable user is rejected here. Requiring an email
    // would be inconsistent with create-checkout-session, which lets
    // Stripe collect one at checkout - so a user can reach Pro without
    // ever linking an email, and must still be able to manage it.
    if (authError || !user) {
      return jsonResponse({ error: "Not authenticated. Please reload and try again." }, 401, cors);
    }
    // Tolerant parse: an empty or malformed body is not an error here,
    // it just means "no returnUrl supplied" - which is precisely the
    // case defaultReturnUrl() exists to cover. Letting json() throw
    // would make that fallback unreachable.
    let body: Record<string, unknown> | null = null;
    try {
      body = await req.json();
    } catch {
      body = null;
    }
    const returnUrl = validReturnUrl(body?.returnUrl || defaultReturnUrl(req));
    const { data: subscription, error: lookupError } = await supabase
      .from("user_subscriptions")
      .select("stripe_customer_id")
      .eq("user_id", user.id)
      .maybeSingle();
    if (lookupError) throw lookupError;
    // 409 with a machine-readable code, not the generic 400 everything
    // else in this function returns: "you have never subscribed" is a
    // normal state for a free account clicking Manage, and the client
    // needs to tell it apart from a real failure to word the message.
    if (!subscription?.stripe_customer_id) {
      return jsonResponse(
        { error: "No active subscription to manage yet.", code: "no_customer" },
        409,
        cors,
      );
    }

    // Stripe sends the user back here when they close the portal. The
    // billing=portal_return marker is what tells the client to re-pull
    // entitlements (a cancellation inside the portal changes them) and
    // then strip itself back out of the address bar.
    const portalReturn = new URL(returnUrl);
    portalReturn.searchParams.set("billing", "portal_return");

    const session = await stripe.billingPortal.sessions.create({
      customer: subscription.stripe_customer_id,
      return_url: portalReturn.toString(),
    });
    return new Response(JSON.stringify({ url: session.url }), {
      status: 200,
      headers: { ...cors, "Content-Type": "application/json" },
    });
  } catch (error) {
    return jsonResponse({ error: errorMessage(error) }, 400, cors);
  }
});
