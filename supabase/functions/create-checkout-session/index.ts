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
    const body = await req.json();
    const email = user?.email || user?.user_metadata?.email || body?.email;
    if (authError || !user || !email) {
      return jsonResponse({ error: "Email linking required before purchasing Pro." }, 400, cors);
    }

    const targetPriceId = body?.priceId || Deno.env.get("STRIPE_PRICE_ID_PRO_MONTHLY");
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

    return new Response(JSON.stringify({ url: session.url }), {
      status: 200,
      headers: { ...cors, "Content-Type": "application/json" },
    });
  } catch (error) {
    return jsonResponse({ error: errorMessage(error) }, 400, cors);
  }
});
