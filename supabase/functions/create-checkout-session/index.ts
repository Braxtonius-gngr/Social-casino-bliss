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

// Another checkout for the account started while this one was being made,
// and its page is the one left to pay.
const CHECKOUT_ELSEWHERE = "A checkout for this account just started in another tab or window. Finish it there, or try again.";

// Best-effort Stripe calls finish by a deadline or give up, and never retry
// (a retry would start over). Stripe's own `timeout` only runs until the
// response headers arrive; it reads the body afterwards. So these calls go
// through a client whose fetch reads the whole body before it disarms the
// deadline's abort.
function fetchUntil(deadline: number): typeof fetch {
  return async (input, init) => {
    const abort = new AbortController();
    const timer = setTimeout(() => abort.abort(), Math.max(0, deadline - Date.now()));
    const signal = init?.signal ? AbortSignal.any([init.signal, abort.signal]) : abort.signal;
    try {
      const response = await fetch(input, { ...init, signal });
      const body = await response.arrayBuffer();
      const nullBody = [101, 204, 205, 304].includes(response.status);
      return new Response(nullBody ? null : body, {
        status: response.status,
        statusText: response.statusText,
        headers: response.headers,
      });
    } finally {
      clearTimeout(timer);
    }
  };
}

function bestEffortStripe(deadline: number) {
  return new Stripe(Deno.env.get('STRIPE_SECRET_KEY') ?? '', {
    apiVersion: '2025-01-27.acacia' as any,
    httpClient: Stripe.createFetchHttpClient(fetchUntil(deadline)),
    maxNetworkRetries: 0,
    timeout: Math.max(1, deadline - Date.now()),
  });
}

// Short, so the 409 it runs before comes back promptly.
const DISCARD_CUSTOMER_TIMEOUT_MS = 2000;

// A customer this request made that the account's row turned down (another
// request saved its own first) is never used: delete it rather than leave
// it unattached in Stripe. Not after a save error: the write may still have
// landed, and then the row names this customer.
async function discardCustomer(customerId: string) {
  try {
    await bestEffortStripe(Date.now() + DISCARD_CUSTOMER_TIMEOUT_MS).customers.del(customerId);
  } catch (error) {
    console.warn("Couldn't delete an unused Stripe customer.", { customerId, error: errorMessage(error) });
  }
}

// A subscription starts when a checkout session is paid, which can be long
// after it was made: an earlier tab left open could still be paid after a
// newer checkout, and the checks a checkout starts with only see
// subscriptions that already exist. So once a new session exists, all of
// the customer's open sessions are ranked, newest first, and all but the
// first are expired: the newest checkout page is the only one left to pay.
// Two made in the same second rank by id, so every request ranks them the
// same way and they agree on which one stays. If another session outranks
// this request's own (a newer one, or a same-second one with a higher id),
// its own is expired too and its URL isn't handed out (the caller answers
// 409). That holds even when the other request's cleanup failed. Stripe's "limit customers to one
// subscription" setting guards the payment itself (see README).
// Best-effort and bounded: it gets a few seconds, each Stripe call gives up
// when they run out, and if listing fails this request's session stays.
// Normally there is at most one other open session, since each checkout
// expires the ones before it.
const SESSION_CLEANUP_BUDGET_MS = 3000;

type OpenSession = { id: string; created: number };

function outranks(a: OpenSession, b: OpenSession) {
  return a.created !== b.created ? a.created > b.created : a.id > b.id;
}

// Returns whether this request's own session is the one left to pay.
async function keepNewestOpenSession(customerId: string, current: Stripe.Checkout.Session): Promise<boolean> {
  const deadline = Date.now() + SESSION_CLEANUP_BUDGET_MS;
  const remaining = () => deadline - Date.now();
  const client = bestEffortStripe(deadline);
  const open: OpenSession[] = [{ id: current.id, created: current.created }];
  try {
    // Every page is read before anything is expired, so expiring doesn't
    // move the list under the cursor.
    let startingAfter: string | undefined;
    do {
      const page = await client.checkout.sessions.list({
        customer: customerId,
        status: "open",
        limit: 100,
        ...(startingAfter ? { starting_after: startingAfter } : {}),
      });
      for (const session of page.data) {
        if (session.id !== current.id) open.push({ id: session.id, created: session.created });
      }
      startingAfter = page.has_more ? page.data[page.data.length - 1]?.id : undefined;
    } while (startingAfter && remaining() > 0);
  } catch (error) {
    console.warn("Couldn't list older checkout sessions.", { customerId, error: errorMessage(error) });
  }
  const newest = open.reduce((best, session) => outranks(session, best) ? session : best);
  const stale = open.filter((session) => session.id !== newest.id);
  for (const [index, session] of stale.entries()) {
    if (remaining() <= 0) {
      console.warn("Out of time expiring older checkout sessions.", { customerId, leftOpen: stale.length - index });
      break;
    }
    try {
      await client.checkout.sessions.expire(session.id);
    } catch (error) {
      console.warn("Couldn't expire an older checkout session.", { sessionId: session.id, error: errorMessage(error) });
    }
  }
  return newest.id === current.id;
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
        if (saveError) throw saveError;
        if (!replaced?.length) {
          await discardCustomer(customerId);
          return jsonResponse({ error: BILLING_CHANGED }, 409, cors);
        }
      } else {
        // Only if the account still has no row: two first checkouts at once
        // each make a customer, and the one saved first must stand, or the
        // two sessions would belong to different customers and could both
        // be paid.
        const { data: inserted, error: saveError } = await supabase.from("user_subscriptions").upsert({
          user_id: user.id,
          stripe_customer_id: customerId,
          tier: "free",
          status: "active",
        }, { onConflict: "user_id", ignoreDuplicates: true }).select("user_id");
        if (saveError) throw saveError;
        if (!inserted?.length) {
          await discardCustomer(customerId);
          return jsonResponse({ error: BILLING_CHANGED }, 409, cors);
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
      // Checkout Studio settings. "hosted" is this SDK's name for the
      // Stripe-hosted page (stripe-node 21+ calls it "hosted_page"). Its
      // origin_context and integration_identifier wait for an API version
      // newer than the one pinned above: see STRIPE_INTEGRATION_TODO.md.
      ui_mode: "hosted",
      billing_address_collection: "auto",
      phone_number_collection: { enabled: false },
      // Stripe Tax: on only once STRIPE_AUTOMATIC_TAX is "on" - set it after
      // Stripe Tax is set up in that mode's dashboard (origin address,
      // default tax code and behaviour, registrations), or every session
      // fails. The address Checkout collects for it is saved to the
      // customer, which Stripe requires when the customer already exists.
      automatic_tax: { enabled: Deno.env.get("STRIPE_AUTOMATIC_TAX") === "on" },
      customer_update: { address: "auto" },
      allow_promotion_codes: false,
      payment_method_collection: "always",
      submit_type: "auto",
    });
    if (!(await keepNewestOpenSession(customerId, session))) {
      return jsonResponse({ error: CHECKOUT_ELSEWHERE }, 409, cors);
    }

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
