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

// A stored Stripe id can belong to the other Stripe mode: once the app
// moves from test to live keys, the customer and subscription ids saved
// while testing don't exist any more. Such an id counts as absent - never
// as an error the account can't get past.
function isMissing(error: unknown): boolean {
  const e = error as { code?: string; statusCode?: number; raw?: { code?: string } } | null;
  return e?.code === "resource_missing" || e?.raw?.code === "resource_missing" || e?.statusCode === 404;
}

// Another checkout or a webhook changed this account's billing row while
// this request was working from an older copy: nothing is decided on the
// stale view. The page shows this and refreshes the account's status.
const BILLING_CHANGED = "Your billing details just changed. Please try again.";

// A customer this request made but couldn't save to the account is never
// used: delete it rather than leave it unattached in Stripe.
async function discardCustomer(customerId: string) {
  try {
    await stripe.customers.del(customerId);
  } catch (error) {
    console.warn("Couldn't delete an unused Stripe customer.", { customerId, error: errorMessage(error) });
  }
}

// A subscription starts when a checkout session is paid, which can be long
// after it was made: an earlier tab left open could still be paid after a
// newer checkout, and the checks a checkout starts with only see
// subscriptions that already exist. So once a new session exists, every
// other open session for this customer that isn't newer is expired, and
// the newest checkout page is the only one left to pay. Two made in the
// same second may expire each other, leaving nothing to pay rather than
// two (the page sends one checkout at a time, so that takes two tabs).
// Stripe's "limit customers to one subscription" setting guards the payment
// itself (see README). Best-effort: a failure here never blocks this
// checkout.
async function expireOlderOpenSessions(customerId: string, current: Stripe.Checkout.Session) {
  try {
    const older = await stripe.checkout.sessions.list({
      customer: customerId,
      status: "open",
      created: { lte: current.created },
      limit: 100,
    });
    for (const session of older.data) {
      if (session.id === current.id) continue;
      try {
        await stripe.checkout.sessions.expire(session.id);
      } catch (error) {
        console.warn("Couldn't expire an older checkout session.", { sessionId: session.id, error: errorMessage(error) });
      }
    }
  } catch (error) {
    console.warn("Couldn't list older checkout sessions.", { customerId, error: errorMessage(error) });
  }
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
  // The client names a plan, not a Stripe price: "price_pro_annual" means
  // this deployment's annual price, and "price_pro_monthly" (or no
  // priceId) its monthly one. Real price ids differ between test and live
  // mode, so the page never carries them; they live in the secrets.
  if (rawPriceId === "price_pro_annual") return Deno.env.get("STRIPE_PRICE_ID_PRO_ANNUAL");
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
      .select("stripe_customer_id, stripe_subscription_id")
      .eq("user_id", user.id)
      .maybeSingle();
    if (lookupError) throw lookupError;

    // Stripe happily attaches a second subscription to the same customer,
    // so a stale client that still shows "Upgrade" must not double-bill.
    // Asks Stripe rather than trusting our row, which lags a missed webhook.
    // The subscription id this request last saw in the account's row: the
    // customer replacement below only lands while the row still holds it.
    let expectedSubscriptionId: string | null = existing?.stripe_subscription_id ?? null;
    if (existing?.stripe_subscription_id) {
      let current: Stripe.Subscription | null = null;
      try {
        current = await stripe.subscriptions.retrieve(existing.stripe_subscription_id);
      } catch (error) {
        if (!isMissing(error)) throw error;
        // Forget the id that no longer resolves, so it stops standing in
        // for the account's subscription; the webhook records the new one.
        // Only if the row still holds that id: a newer one written since
        // must stand.
        const { data: cleared, error: clearError } = await supabase.from("user_subscriptions")
          .update({ stripe_subscription_id: null, updated_at: new Date().toISOString() })
          .eq("user_id", user.id)
          .eq("stripe_subscription_id", existing.stripe_subscription_id)
          .select("user_id");
        if (clearError) throw clearError;
        if (!cleared?.length) return jsonResponse({ error: BILLING_CHANGED }, 409, cors);
        expectedSubscriptionId = null;
      }
      if (current && ["active", "trialing", "past_due", "unpaid"].includes(current.status)) {
        return jsonResponse({
          error: "This account already has a Pro subscription. Use Manage Billing to update or cancel it.",
        }, 409, cors);
      }
    }

    let customerId: string | undefined = existing?.stripe_customer_id ?? undefined;
    if (customerId) {
      try {
        const found = await stripe.customers.retrieve(customerId);
        if ((found as Stripe.DeletedCustomer).deleted) customerId = undefined;
      } catch (error) {
        if (!isMissing(error)) throw error;
        customerId = undefined;
      }
      if (!customerId) console.warn("Stored Stripe customer is gone or from the other mode; making a new one.", { userId: user.id });
    }
    if (!customerId) {
      const customer = await stripe.customers.create({
        email: email,
        metadata: { supabase_uid: user.id },
      });
      customerId = customer.id;
      // A new account gets a free row; an existing row only has its Stripe
      // ids replaced, so its tier (owner, or a Pro period still running)
      // is left for the webhook to change.
      if (existing) {
        // Replaces the ids only if the row still names the customer this
        // request found missing and the subscription it last saw: a customer
        // saved since by another checkout, or a subscription the webhook
        // recorded since, must stand.
        let replace = supabase.from("user_subscriptions")
          .update({ stripe_customer_id: customerId, stripe_subscription_id: null, updated_at: new Date().toISOString() })
          .eq("user_id", user.id);
        replace = existing.stripe_customer_id
          ? replace.eq("stripe_customer_id", existing.stripe_customer_id)
          : replace.is("stripe_customer_id", null);
        replace = expectedSubscriptionId
          ? replace.eq("stripe_subscription_id", expectedSubscriptionId)
          : replace.is("stripe_subscription_id", null);
        const { data: replaced, error: saveError } = await replace.select("user_id");
        if (saveError || !replaced?.length) {
          await discardCustomer(customerId);
          if (saveError) throw saveError;
          return jsonResponse({ error: BILLING_CHANGED }, 409, cors);
        }
      } else {
        const { error: saveError } = await supabase.from("user_subscriptions").upsert({
          user_id: user.id,
          stripe_customer_id: customerId,
          tier: "free",
          status: "active",
        });
        if (saveError) {
          await discardCustomer(customerId);
          throw saveError;
        }
      }
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
    await expireOlderOpenSessions(customerId, session);

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
