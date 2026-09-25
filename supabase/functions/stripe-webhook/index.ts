import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.39.0";
// Deliberately npm:stripe (not esm.sh/stripe?target=deno) - esm.sh's Deno
// transform shims Node built-ins via deno.land/std's node compat layer,
// and that shim is what threw "Deno.core.runMicrotasks() is not supported
// in this environment" from _next_tick.ts. The npm: specifier resolves
// through Deno's own native npm compatibility instead, which doesn't hit
// that code path. Version/apiVersion matched to create-checkout-session
// and create-portal-session (both already on npm:stripe@^17.7.0 /
// 2025-01-27.acacia) - the three functions handle the same Stripe
// customers/subscriptions and must agree on API version, since it
// determines payload shape (e.g. where current_period_start/end live on
// a Subscription).
import Stripe from "npm:stripe@^17.7.0";

const stripe = new Stripe(Deno.env.get("STRIPE_SECRET_KEY") ?? "", {
  apiVersion: "2025-01-27.acacia" as any,
  httpClient: Stripe.createFetchHttpClient(),
});
// SubtleCrypto-based signature verification - works with Deno's native
// Web Crypto, no Node 'crypto' polyfill involved.
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

// Thrown when a Stripe customer/subscription can't be tied to a real
// user_subscriptions row (e.g. a customer created outside our own
// create-checkout-session flow, or genuine data drift). Deliberately never
// guesses an owner - a wrong guess would misattribute another customer's
// billing status onto an unrelated real account. This is reported (not
// retried forever) instead of resolved: Stripe redelivers a failed webhook
// for up to ~3 days, and retrying an unresolvable mapping can never
// succeed, so it's marked failed in the ledger for manual reconciliation
// and acknowledged with 200 so Stripe stops resending it.
class UnresolvableOwnerError extends Error {}

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
  if (existingError) {
    console.error(
      "Ledger lookup failed for event",
      event.id,
      event.type,
      JSON.stringify({
        message: existingError.message,
        code: existingError.code,
        details: existingError.details,
        hint: existingError.hint,
      }),
    );
    return jsonResponse({ error: "Ledger lookup failed." }, 500, cors);
  }
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
    if (event.type === "checkout.session.completed") {
      // Fires once, right after a successful Checkout - before
      // customer.subscription.created/updated necessarily lands, so this
      // flips the user to 'pro' immediately instead of leaving them on
      // 'free' until the (usually near-simultaneous, but not guaranteed
      // ordered) subscription event arrives. That subscription event
      // still runs its own upsert below with the authoritative
      // status/period data; this just can't wait for it.
      const checkoutSession = payload as unknown as Stripe.Checkout.Session;
      const customerId = typeof checkoutSession.customer === "string"
        ? checkoutSession.customer
        : checkoutSession.customer?.id;
      const subscriptionId = typeof checkoutSession.subscription === "string"
        ? checkoutSession.subscription
        : checkoutSession.subscription?.id;
      let userId = checkoutSession.metadata?.supabase_uid || checkoutSession.client_reference_id || undefined;
      if (!userId && customerId) {
        const { data: owner, error: ownerError } = await supabase
          .from("user_subscriptions")
          .select("user_id")
          .eq("stripe_customer_id", customerId)
          .maybeSingle();
        if (ownerError) throw ownerError;
        userId = owner?.user_id;
      }
      if (!userId) {
        throw new UnresolvableOwnerError(
          `Checkout session owner could not be resolved (customer=${customerId ?? "none"}).`,
        );
      }
      if (!customerId) throw new Error("Checkout session had no customer.");

      let periodStart: string | null = null;
      let periodEnd: string | null = null;
      let cancelAtPeriodEnd = false;
      if (subscriptionId) {
        const subscription = await stripe.subscriptions.retrieve(subscriptionId);
        periodStart = new Date(subscription.current_period_start * 1000).toISOString();
        periodEnd = new Date(subscription.current_period_end * 1000).toISOString();
        cancelAtPeriodEnd = subscription.cancel_at_period_end;
      }

      const { error } = await supabase.from("user_subscriptions").upsert({
        user_id: userId,
        stripe_customer_id: customerId,
        stripe_subscription_id: subscriptionId ?? null,
        tier: "pro",
        status: "active",
        current_period_start: periodStart,
        current_period_end: periodEnd,
        cancel_at_period_end: cancelAtPeriodEnd,
        updated_at: new Date().toISOString(),
      });
      if (error) throw error;
    } else if (
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
      if (!userId) {
        throw new UnresolvableOwnerError(
          `Subscription owner could not be resolved (customer=${customerId}, subscription=${subscription.id}).`,
        );
      }
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
    if (error instanceof UnresolvableOwnerError) {
      console.error("Unresolvable webhook owner:", event.id, event.type, error.message);
      // Acknowledge so Stripe stops redelivering an event that can never
      // resolve on retry; the failure is preserved in stripe_webhook_events
      // (process_status='failed', last_error) for manual reconciliation.
      return jsonResponse({ received: true, unresolved: true }, 200, cors);
    }
    console.error("Webhook processing failed:", event.id, event.type, errorMessage(error));
    return jsonResponse({ error: "Webhook processing failed." }, 500, cors);
  }
});
