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
  if (!allowedOrigins.has(url.origin) || url.protocol !== "https:" && !url.hostname.startsWith("localhost")) {
    throw new Error("Invalid return URL origin.");
  }
  return url.toString();
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
    // No email requirement: checkout accepts anonymous users, so they must
    // be able to manage (and cancel) what they bought.
    if (authError || !user) {
      throw new Error("Not authenticated. Please reload and try again.");
    }
    const body = await req.json();
    const returnUrl = validReturnUrl(body?.returnUrl);
    const { data: subscription, error: lookupError } = await supabase
      .from("user_subscriptions")
      .select("stripe_customer_id")
      .eq("user_id", user.id)
      .maybeSingle();
    if (lookupError) throw lookupError;
    if (!subscription?.stripe_customer_id) throw new Error("No billing customer profile found.");

    let session: Stripe.BillingPortal.Session;
    try {
      session = await stripe.billingPortal.sessions.create({
        customer: subscription.stripe_customer_id,
        return_url: returnUrl,
      });
    } catch (error) {
      // A customer saved while the app ran on Stripe test keys doesn't
      // exist under live keys: there is no real billing to manage. Any
      // other missing resource (the portal configuration itself) is a setup
      // fault and stays an error.
      const e = error as { code?: string; param?: string; raw?: { code?: string; param?: string } } | null;
      const code = e?.code ?? e?.raw?.code;
      const param = e?.param ?? e?.raw?.param;
      if (code === "resource_missing" && param === "customer") {
        return jsonResponse({ error: "There's no billing to manage on this account yet. Upgrade to start a subscription." }, 404, cors);
      }
      throw error;
    }
    return new Response(JSON.stringify({ url: session.url }), {
      status: 200,
      headers: { ...cors, "Content-Type": "application/json" },
    });
  } catch (error) {
    return jsonResponse({ error: errorMessage(error) }, 400, cors);
  }
});
