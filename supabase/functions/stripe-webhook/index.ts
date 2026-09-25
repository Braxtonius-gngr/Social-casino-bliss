import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.39.0";
import Stripe from "https://esm.sh/stripe@14.14.0?target=deno";

const stripe = new Stripe(Deno.env.get("STRIPE_SECRET_KEY") ?? "", {
  apiVersion: "2023-10-16",
  httpClient: Stripe.createFetchHttpClient(),
});
const cryptoProvider = Stripe.createSubtleCryptoProvider();
const allowedOrigins = new Set([
  "https://casino-almanac.app",
  "https://dailyrollover.com",
  "https://www.dailyrollover.com",
  "https://braxtonius-gngr.github.io",
  "http://localhost:8080",
  "http://localhost:5173",
]);
const supportedStatuses = new Set([
  "active", "trialing", "past_due", "canceled", "incomplete",
  "incomplete_expired", "unpaid",
]);

function mapStatus(status: string): string {
  return supportedStatuses.has(status) ? status : "canceled";
}

function errorMessage(error: unknown) {
  return error instanceof Error ? error.message : "Webhook processing failed.";
}

function corsHeaders(req: Request) {
  const origin = req.headers.get("Origin") ?? "";
  return {
    "Access-Control-Allow-Origin": allowedOrigins.has(origin) ? origin : "null",
    "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, stripe-signature",
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

serve(async (req) => {
  const cors = corsHeaders(req);
  if (req.method === "OPTIONS") return new Response("ok", { headers: cors });
  if (req.method !== "POST") return jsonResponse({ error: "POST required." }, 405, cors);
  const signature = req.headers.get("Stripe-Signature");
  const secret = Deno.env.get("STRIPE_WEBHOOK_SECRET");
  if (!signature || !secret) return jsonResponse({ error: "Webhook configuration missing." }, 400, cors);

  let event: Stripe.Event;
  try {
    event = await stripe.webhooks.constructEventAsync(
      await req.text(),
      signature,
      secret,
      undefined,
      cryptoProvider,
    );
  } catch {
    return jsonResponse({ error: "Webhook signature verification failed." }, 400, cors);
  }

  const supabase = createClient(
    Deno.env.get("SUPABASE_URL") ?? "",
    Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "",
  );
  const payload = event.data.object as unknown as Record<string, unknown>;
  const { data: existing, error: existingError } = await supabase
    .from("stripe_webhook_events")
    .select("process_status, created_at")
    .eq("event_id", event.id)
    .maybeSingle();
  if (existingError) return jsonResponse({ error: "Ledger lookup failed." }, 500, cors);
  if (existing?.process_status === "processed") {
    return jsonResponse({ received: true, deduplicated: true }, 200, cors);
  }
  if (!existing) {
    const { error: insertError } = await supabase.from("stripe_webhook_events").insert({
      event_id: event.id,
      event_type: event.type,
      payload,
      process_status: "pending",
    });
    if (insertError && insertError.code !== "23505") {
      return jsonResponse({ error: "Ledger write failed." }, 500, cors);
    }
    if (insertError?.code === "23505") {
      return jsonResponse({ received: true, retry: true }, 409, cors);
    }
  } else if (existing.process_status === "pending") {
    const createdAt = Date.parse(existing.created_at);
    if (Number.isFinite(createdAt) && Date.now() - createdAt < 5 * 60 * 1000) {
      return new Response(JSON.stringify({ received: true, retry: true }), { status: 409 });
    }
    await supabase.from("stripe_webhook_events")
      .update({ process_status: "pending", last_error: null })
      .eq("event_id", event.id)
      .eq("process_status", "pending");
  } else {
    await supabase.from("stripe_webhook_events")
      .update({ process_status: "pending", last_error: null })
      .eq("event_id", event.id);
  }

  try {
    if (
      event.type === "customer.subscription.created" ||
      event.type === "customer.subscription.updated"
    ) {
      const subscription = payload as unknown as Stripe.Subscription;
      const customerId = typeof subscription.customer === "string"
        ? subscription.customer
        : subscription.customer.id;
      let userId = subscription.metadata?.supabase_uid;
      if (!userId) {
        const { data: owner, error: ownerError } = await supabase
          .from("user_subscriptions")
          .select("user_id")
          .eq("stripe_customer_id", customerId)
          .maybeSingle();
        if (ownerError) throw ownerError;
        userId = owner?.user_id;
      }
      if (!userId) throw new Error("Subscription owner could not be resolved.");
      const status = mapStatus(subscription.status);
      const { error } = await supabase.from("user_subscriptions").upsert({
        user_id: userId,
        stripe_customer_id: customerId,
        stripe_subscription_id: subscription.id,
        tier: status === "active" || status === "trialing" ? "pro" : "free",
        status,
        current_period_start: new Date(subscription.current_period_start * 1000).toISOString(),
        current_period_end: new Date(subscription.current_period_end * 1000).toISOString(),
        cancel_at_period_end: subscription.cancel_at_period_end,
        updated_at: new Date().toISOString(),
      });
      if (error) throw error;
    } else if (event.type === "customer.subscription.deleted") {
      const subscription = payload as unknown as Stripe.Subscription;
      const { error } = await supabase.from("user_subscriptions")
        .update({
          tier: "free",
          status: "canceled",
          cancel_at_period_end: false,
          updated_at: new Date().toISOString(),
        })
        .eq("stripe_subscription_id", subscription.id);
      if (error) throw error;
    }

    const { error: processedError } = await supabase.from("stripe_webhook_events")
      .update({
        process_status: "processed",
        processed_at: new Date().toISOString(),
        last_error: null,
      })
      .eq("event_id", event.id);
    if (processedError) throw processedError;
    return jsonResponse({ received: true }, 200, cors);
  } catch (error) {
    await supabase.from("stripe_webhook_events").update({
      process_status: "failed",
      last_error: errorMessage(error).slice(0, 2000),
    }).eq("event_id", event.id);
    return jsonResponse({ error: "Webhook processing failed." }, 500, cors);
  }
});
