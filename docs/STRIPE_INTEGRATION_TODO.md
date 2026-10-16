# Stripe Checkout: remaining setup

The single list of what is left to do for Pro checkout. Daily Roll Over
already had a working Checkout Session call, so this change only set the
Checkout Studio parameters on it. No new files, routes or functions besides
this one. For the full billing runbook (products, portal, going live) see
README, *Phase 4: Monetization and billing operations*.

## Values to Replace

None in code. The call builds its URLs and prices from real values:

**Files containing placeholders:**
- none ([supabase/functions/create-checkout-session/index.ts](../supabase/functions/create-checkout-session/index.ts) has no placeholder values)

| Field | Current Value | What to Set |
|-------|--------------|-------------|
| mode | `"subscription"` | Nothing. Pro is a recurring subscription. |
| success_url | the page that opened checkout, plus `?billing=success&session_id={CHECKOUT_SESSION_ID}` | Nothing. Only origins in `allowedOrigins` are accepted. |
| cancel_url | the page that opened checkout, plus `?billing=canceled` | Nothing. |
| line_items[].price | `STRIPE_PRICE_ID_PRO_MONTHLY` or `STRIPE_PRICE_ID_PRO_ANNUAL` (Supabase secrets) | Set both secrets to your real Price IDs (`price_...`) from https://dashboard.stripe.com/prices: test IDs while testing, live IDs when you go live. |

## Configured Parameters

These parameters were configured in Checkout Studio and are already set correctly.

**Files containing these parameters:**
- [supabase/functions/create-checkout-session/index.ts](../supabase/functions/create-checkout-session/index.ts)

| Parameter | Value |
|-----------|-------|
| ui_mode | `hosted` (this is stripe-node 17's name; 21+ calls it `hosted_page`) |
| billing_address_collection | `auto` |
| phone_number_collection | `{ enabled: false }` |
| automatic_tax | `{ enabled: STRIPE_AUTOMATIC_TAX === "on" }` (off until that secret is set) |
| customer_update | `{ address: "auto" }` (Stripe Tax needs the address on an existing customer) |
| allow_promotion_codes | `false` |
| payment_method_collection | `always` (included because mode is `subscription`) |
| submit_type | `auto` |

### Held back: need a newer Stripe API version

The billing functions pin `npm:stripe@^17.7.0` with API version
`2025-01-27.acacia`. Two Checkout Studio parameters are newer than that, so
sending them now could make Stripe reject every checkout:

| Parameter | Value | Available from |
|-----------|-------|----------------|
| origin_context | `mobile_app` | `2025-07-30.basil` |
| integration_identifier | `hosted_mobile_app_0001` | `2026-03-25.dahlia` (stripe-node 21+) |

Both only affect Stripe's page optimizations and Dashboard reporting, not
whether a payment goes through. To add them later, upgrade all three billing
functions together (checkout, portal, webhook) to stripe-node 21+ and its API
version. Before that upgrade, fix one thing: since `2025-03-31.basil`,
`current_period_end` is on each subscription item, not on the subscription,
so [stripe-webhook](../supabase/functions/stripe-webhook/index.ts) must read
`subscription.items.data[0].current_period_end`. Then set `ui_mode` to
`hosted_page` and add the two parameters above.

### Kept: not part of Checkout Studio

`customer`, `client_reference_id`, `metadata.supabase_uid` and
`subscription_data.metadata.supabase_uid` stay. The webhook uses them to
link the payment to the right account. Without them, a paid checkout
wouldn't unlock Pro.

## Setup and next steps

### Secrets (Supabase, not `.env`)

The site has no `.env` file. Secrets live in Supabase (Dashboard → Edge
Functions → Secrets, or the CLI). The names must match the code exactly:

```bash
supabase secrets set STRIPE_SECRET_KEY="sk_test_..."
supabase secrets set STRIPE_WEBHOOK_SECRET="whsec_..."
supabase secrets set STRIPE_PRICE_ID_PRO_MONTHLY="price_..."
supabase secrets set STRIPE_PRICE_ID_PRO_ANNUAL="price_..."
```

No publishable key is needed. The browser never talks to Stripe directly; it
only follows the hosted page URL the function returns.

### Deploy

```bash
supabase functions deploy create-checkout-session
```

Deploying the portal and webhook again is only needed if their code or secrets
changed. The webhook must be registered for `checkout.session.completed` and
`customer.subscription.created/updated/deleted` (README, *Supabase
deployment*).

### New files

```
docs/STRIPE_INTEGRATION_TODO.md   this checklist (docs/ is never deployed)
```

### How it works

1. A player (anonymous or linked-email account) starts Pro checkout. The app
   calls the `create-checkout-session` edge function with the chosen price.
2. The function checks the account, finds or creates its Stripe customer,
   creates a hosted Checkout Session with the parameters above, expires
   older open sessions for that customer, and returns `session.url`.
3. The app redirects to Stripe's hosted page. On payment Stripe returns to
   `?billing=success`; on cancel, to `?billing=canceled`.
4. `stripe-webhook` receives `checkout.session.completed` and the subscription
   events, and writes `user_subscriptions`. `get_my_entitlement()` then
   reports Pro.

### Testing (test mode only)

| Card | Result |
|------|--------|
| `4242 4242 4242 4242` | Succeeds |
| `4000 0025 0000 3155` | Asks for 3D Secure authentication |
| `4000 0000 0000 9995` | Declined (insufficient funds) |

Use any future expiry date, any 3-digit CVC and any postal code. Check the result
in Stripe Dashboard → Payments and in the app's Pro badge, then cancel with
Manage Billing.

### Next steps

- Copy both products to live mode and switch the four secrets (README,
  *Going live*, steps 1-10, including the real-card purchase and refund).
- Stripe Tax (decided: on). In each mode's dashboard, under Tax: set the
  origin (head office) address; set the default product tax code to
  *Software as a service (SaaS) - personal use* and the default tax
  behaviour to *exclusive* (tax added on top of $4.99 / $49.90); add a
  registration for each state you're registered in (register with that
  state first - Texas through the Comptroller). Then set the Supabase secret
  `STRIPE_AUTOMATIC_TAX=on` and redeploy `create-checkout-session`. Until
  the secret is on, checkout runs without tax, so the order can't break it.
- Refund policy (decided): a full refund on request within 7 days of a first
  payment; renewals and later requests are not refunded, cancel any time.
  It's on the Terms page. To honour one: in the Stripe dashboard open the
  customer's subscription, *Cancel subscription* > *Immediately*, and tick
  refund of the last payment. The webhook's `customer.subscription.deleted`
  then ends Pro. (A refund on its own leaves Pro running to the period end.)
- Watch `user_subscriptions` and Stripe's Subscriptions page for the first
  real signups. Fulfilment is automatic: the webhook grants Pro.

### Resources

- https://support.stripe.com
- https://docs.stripe.com/mcp
