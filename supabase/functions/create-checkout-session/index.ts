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
const allowedPrices = new Set([
  Deno.env.get("STRIPE_PRICE_ID_PRO_MONTHLY"),
  Deno.env.get("STRIPE_PRICE_ID_PRO_ANNUAL"),
].filter(Boolean));

function corsHeaders(req: Request) {
  const origin = req.headers.get("Origin") ?? "";
  const allowed = allowedOrigins.has(origin);
  return {
    "Access-Control-Allow-Origin": allowed ? origin : "null",
    "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
    "Access-Control-Allow-Methods": "POST, OPTIONS",
    "Vary": "Origin",
  };
}

function errorMessage(error: unknown) {
  return error instanceof Error ? error.message : "Checkout creation failed.";
}

function jsonResponse(body: Record<string, unknown>, status: number, cors: Record<string, string>) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...cors, "Content-Type": "application/json" },
  });
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

function resolveTargetPriceId(rawPriceId: unknown): string | undefined {
  const monthlyEnvPrice = Deno.env.get("STRIPE_PRICE_ID_PRO_MONTHLY");
  // The client may send the literal alias "price_pro_monthly" (a stand-in
  // for "whichever price this deployment's monthly plan uses"), or omit
  // priceId entirely - both cases mean "use the configured monthly price",
  // not an actual Stripe price id, so map them to the env var instead of
  // passing them straight through to allowedPrices/Stripe.
  if (typeof rawPriceId !== "string" || !rawPriceId || rawPriceId === "price_pro_monthly" || !rawPriceId.startsWith("price_")) {
    return monthlyEnvPrice;
  }
  return rawPriceId;
}

serve(async (req) => {
  const cors = corsHeaders(req);

  // Logged on every invocation, not just failures - this is the only way
  // to tell "gateway rejected the request before our code ran" (nothing
  // below this line will have executed) apart from "our code ran and
  // failed" once Supabase's dashboard shows nothing but boot/listening
  // lines. Authorization is redacted to a presence flag + length only -
  // it's a bearer token (anon key or a real user JWT), not something to
  // put in plaintext logs.
  const redactedHeaders = Object.fromEntries(
    Array.from(req.headers.entries()).map(([key, value]) =>
      key.toLowerCase() === "authorization"
        ? [key, value ? `<redacted, len=${value.length}>` : value]
        : [key, value]
    )
  );
  console.log("Incoming request method:", req.method, "headers:", redactedHeaders);

  if (req.method === "OPTIONS") return new Response("ok", { status: 200, headers: cors });
  if (req.method !== "POST") {
    return jsonResponse({ error: "POST required." }, 405, cors);
  }

  try {
    const token = req.headers.get("Authorization")?.replace(/^Bearer\s+/i, "");
    if (!token) {
      console.error("Rejecting request: no Authorization header present.");
      return jsonResponse({ error: "Missing authorization." }, 401, cors);
    }

    const supabase = createClient(
      Deno.env.get("SUPABASE_URL") ?? "",
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "",
    );
    const { data: { user }, error: authError } = await supabase.auth.getUser(token);
    console.log("Auth check result:", { hasUser: !!user, isAnonymous: user?.is_anonymous, authError: authError?.message });
    // A bare anon key is itself a validly-signed JWT (it just has no
    // `sub` claim pointing at a real user row), so it reaches this point
    // rather than being rejected earlier by Supabase's gateway - but
    // getUser() can't resolve it to a user, which is exactly what we
    // need to reject here: not "no email", an actual missing/invalid
    // user identity. A real anonymous-auth session (signInAnonymously())
    // does resolve to a user and is allowed through with no email.
    if (authError || !user) {
      console.error("Rejecting request: no resolvable user for the given token.", authError?.message);
      return jsonResponse({ error: "Not authenticated. Please reload and try again." }, 401, cors);
    }

    const body = await req.json();
    const email = user.email || user.user_metadata?.email || body?.email || undefined;

    const targetPriceId = resolveTargetPriceId(body?.priceId);
    if (!targetPriceId || !allowedPrices.has(targetPriceId)) {
      console.error("Price lookup failed. Received:", body?.priceId, "Allowed:", Array.from(allowedPrices));
      throw new Error("Invalid or unsupported price selection.");
    }
    const returnUrl = validReturnUrl(body?.returnUrl || defaultReturnUrl(req));

    const { data: existing, error: lookupError } = await supabase
      .from("user_subscriptions")
      .select("stripe_customer_id")
      .eq("user_id", user.id)
      .maybeSingle();
    if (lookupError) throw lookupError;

    let customerId = existing?.stripe_customer_id;
    if (!customerId) {
      const customer = await stripe.customers.create({
        email: email,
        metadata: { supabase_uid: user.id },
      });
      customerId = customer.id;
      const { error: saveError } = await supabase.from("user_subscriptions").upsert({
        user_id: user.id,
        stripe_customer_id: customerId,
        tier: "free",
        status: "active",
      });
      if (saveError) throw saveError;
    }

    const success = new URL(returnUrl);
    success.searchParams.set("billing", "success");
    success.searchParams.set("session_id", "{CHECKOUT_SESSION_ID}");
    const cancel = new URL(returnUrl);
    cancel.searchParams.set("billing", "canceled");
    const session = await stripe.checkout.sessions.create({
      customer: customerId,
      line_items: [{ price: targetPriceId, quantity: 1 }],
      mode: "subscription",
      success_url: success.toString(),
      cancel_url: cancel.toString(),
      client_reference_id: user.id,
      metadata: { supabase_uid: user.id },
      subscription_data: { metadata: { supabase_uid: user.id } },
    });

    console.log("Checkout session created:", { userId: user.id, hasEmail: !!email, priceId: targetPriceId });
    return new Response(JSON.stringify({ url: session.url }), {
      status: 200,
      headers: { ...cors, "Content-Type": "application/json" },
    });
  } catch (error) {
    console.error("create-checkout-session failed:", error instanceof Error ? error.stack || error.message : error);
    return jsonResponse({ error: errorMessage(error) }, 400, cors);
  }
});
