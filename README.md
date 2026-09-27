# Daily Roll Over

Daily bonus tracker for sweepstakes and social casino platforms. A single
static `index.html` (plus a handful of small `assets/`/`utils/` scripts and
stylesheets) - no build step to run the app. The deploy runs one optional
step (`npm run build:site`, below) that minifies the scripts and leaves the
catalogue file out; the repository itself stays readable and runs as is.

Everything is local-first: platforms, timers, notes, balances and settings
live in this browser, always. User-owned platform records, collection history,
daily-run history and the spend/redeem ledger are stored in IndexedDB, with a
versioned migration from the older localStorage keys and a synchronous
localStorage fallback for first paint or browsers without IndexedDB. Collection
history (the ledger behind streaks/stats - the one thing the manual JSON backup
doesn't cover) also mirrors to a Supabase
project automatically, under an anonymous account created on-device with no
email, password, or button click - Settings → Cloud Sync turns it off for
anyone who'd rather stay fully local-only. It's an outbox-and-replay design:
local changes queue up and push when online; pulling replays whatever
changed elsewhere back in, matched by each entry's own id. The anonymous
account alone has no credential to sign back in with, so on its own this
only covers redundancy and multi-tab/multi-browser use on the same device -
Settings → **Link Email** closes that gap by attaching a passwordless email
to it (no password anywhere in this app), and **Recover a Linked Account**
pulls that same account's history onto a new or wiped device via a sign-in
link, without creating a blank new account if the email was never linked.
Your very first collection (the moment there's actually data worth losing)
prompts for this inline before it's logged, rather than leaving it as
something you might never get around to - browsing and adding platforms
stays completely unblocked either way.

## Tester feedback

A floating feedback button (bottom-right, above the docked footer) opens a
small modal for structured bug reports and ideas - a category
(timer bug / catalogue-rule correction / feature idea / other) plus a free-text
description. Submitting posts a Discord embed via a webhook, with
`navigator.userAgent`, the loaded catalogue version, and the last few
in-memory app errors auto-attached so reports are debuggable without asking
the tester follow-up questions. Configure it by setting
`FEEDBACK_WEBHOOK_URL` in `index.html`'s inline script to a Discord channel
webhook URL (Server/Channel Settings → Integrations → Webhooks); the button
still opens with an empty value, it just tells the tester feedback isn't
wired up yet instead of sending anything. Like `SUPABASE_ANON_KEY`, this URL
is not a real secret once shipped client-side - anyone who extracts it can
post to the channel directly - so treat it as fine for a small trusted
tester build, not a substitute for real auth at wider scale.

## Quality checks

Three dependency-free Node scripts catch the most common ways this kind of
build-free static site breaks silently: a JS typo that never gets compiled
out, a renamed/moved file that `index.html`, `manifest.json`, or `sw.js`
still points at the old name for, or a malformed record in the platform
catalog.

```bash
npm run check           # all three checks below
npm run check:syntax    # syntax-checks every .js file (assets/, utils/, scripts/, data/) plus index.html's inline <script>
npm run check:refs      # confirms every local href/src/precache reference resolves to a real file
npm run check:catalog   # validates data/catalog.json's records (see below)
```

`data/catalog.json` is the authoritative platform-rules payload, edited in
the repository and published to the database (see **The catalogue** below);
the deployed site never carries the file. `data/catalog.js` is only a
bootstrap that puts the browser's last saved copy back on screen before the
first refresh answers. `check:catalog`
requires every entry to have a non-empty `name` and a valid
`http(s)` URL, and validates numeric fields when present (finite values;
`reliability` between 0-100; positive `cooldown`/`speedHours`). It also
warns - without failing the check - about duplicate names or duplicate
normalized domains, since this catalog legitimately has a few (e.g. two
entries tracking different cooldowns on the same underlying platform under
different names); those are printed for a human to judge, never edited
automatically. It also checks the optional fields the platform pages print:
`ladder` (the daily streak as read off the site, Day 1 first, `null` for an
unread day; a `ladder-full` ladder must average out to its own `dailySC`,
which catches a mistyped rung), `ladderNote`, and `redeemMethods` (the
cash-out methods seen, each with its minimum when one was shown).

Each entry also takes an optional `lastVerified: "YYYY-MM-DD"` field: the
date someone last actually re-checked that its URL, cooldown, and reset
window are still correct. `check:catalog` validates the format and prints
a review queue of the entries most overdue for a re-check (missing the
field, or older than 90 days), oldest/never-verified first - the same
ordering the in-app Catalogue's "Needs Review First" sort and "Needs
Review" filter use. Re-checking a platform and bumping its date is a
manual, human step; nothing here fabricates or auto-updates the field.

No `npm install` needed - both scripts use only Node's standard library.
They also run automatically on every push and pull request via
[`.github/workflows/checks.yml`](.github/workflows/checks.yml).

`npm run test:smoke` runs browser smoke tests for the flows that talk to the
server: anonymous sign-in (exactly one per device, and none for crawlers),
the catalogue download and its rate-limit fallback, Cloud Sync, Pro checkout
and entitlements, background push, and account deletion. It drives an
installed Chrome or Chromium over the DevTools protocol (set `CHROME_PATH`
if it isn't found) against a recording fake of Supabase, so it needs no
network and, like the checks, no `npm install`. CI runs it after
`npm run check`, and again with `SMOKE_ROOT=dist` against the built output.

## Deploying

```bash
npm ci                 # terser, the one dev dependency
npm run build:site     # writes dist/
```

`dist/` is what the host serves: every file the site needs, every script
(inline ones included) minified with top-level names kept, and no
`data/catalog.json`, migrations, scripts or docs. On Cloudflare Pages set
the build command to `npm ci && npm run build:site` and the output directory
to `dist`. A deploy that skips the build still never serves the repo-only
paths: `_redirects` sends them to the home page. If GitHub Pages is still
enabled for the repository, turn it off; it serves the raw repository.

## The catalogue

The catalogue is served by the database, not as a file. `get_catalog()`
answers a signed-in account (the device's anonymous one counts, a crawler
never gets one), returns only `{unchanged: true}` when the app already
holds the current version, and counts full downloads per account per day,
refusing past forty. The published payload carries each platform's plain
address; referral links stay in `platform_links` and players reach them
through the `go` edge function (`/functions/v1/go?p=<platform name>`),
which redirects, rate-limits by address and counts each follow. The SEO
pages link there too.

To publish after editing `data/catalog.json`: open `admin/freebies.html`,
choose the file under **Publish Catalogue** and press Publish. The database
splits the referral links off and stores the rest under a new version; the
app picks it up within five minutes or on its next focus. Publishing an
unchanged file does nothing.

The owner's Staff tab shows who downloaded the catalogue in the last seven
days (heaviest first) and which platform links were followed, from
`catalog_access_report()` and `link_hits_report()`.

### Pro referrals and shared lists

Everyone opens a platform through the house link. A Pro account (an active
or trialing Pro subscription, or the owner) can also save its own referral
link per platform: the field on the platform's edit sheet unlocks, the link
is used when that account opens the platform, and it is kept in
`member_links` (`set_my_referral_link`, `list_my_referral_links`) so it
follows the account across devices. Every card carries a Share button that
hands out the account's own link on Pro and the house link otherwise.

**Share My List** (Settings, Pro) stores the deck's platform names and tags
under an eight-character code (`share_my_list`, one list per account,
updated in place; `unshare_my_list` removes it) and offers the link
`?list=CODE`. Anyone signed in can import a code (`get_shared_list`, or
opening the link); the platforms are added with the code on them. While the
sharer and the importer both hold Pro, those platforms open through
`go?p=<name>&via=<launch token>`: `mint_launch_tokens` issues the importer a
24-hour token per code (none for a free account or for one's own list), and
`resolve_shared_link` decides per click whether the sharer's link is
followed, refusing when either side has lost Pro, when the click is the
sharer's own, when the platform is not on the shared list, and once
`share_cap()` (20) uses have been served in the calendar month on
platforms where the house has a referral link of its own; other platforms
do not count, and a refused click is not counted. Any refusal falls back
to the house link. The token is a bearer credential: the redirect is a
plain navigation, so whoever holds the OPEN address for those 24 hours
gets the same answer. It is never part of what the Share button hands
out, and a leaked one can only reach the sharer's own links for platforms
the sharer chose to share: on platforms where the house has a referral
link it spends the sharer's 20 capped uses, and on the rest, which are
deliberately uncapped, it follows the sharer's link for as long as the
token lasts. The sharer sees the
month's count in Settings (`my_share_status`). These RPCs live in the
`pro_referrals` migration.

The optional `npm run build:seo` command uses the same catalog to generate
semantic static landing pages under `platforms/` and a sitemap. It does not
change the runtime PWA or introduce a bundler. Set `SEO_BASE_URL` when
deploying somewhere other than the canonical https://dailyrollover.com.
It first rebuilds `data/catalog-history.json`, each platform's tier and
rate changes read from the catalog's git history (`npm run build:history`
alone). That needs a full clone; in a shallow one it warns and keeps the
committed file (`git fetch --unshallow` fixes it).

`npm run post:weekly` drafts the weekly "what changed" post from that
history: newly ranked platforms, tier moves, platforms found to have no
guaranteed daily, and additions, each linked to its page with
`?src=reddit` so the visits it brings are counted by source. Add
`-- --format discord` for Discord (split into 2,000-character messages),
or `-- --since 2026-09-20 --until 2026-09-26` for another week (both days
included; the default is the last seven days, uncommitted catalog edits
included). It only prints the draft; posting is a manual step.

`npm run test:sw` runs `sw.js`'s push handler against fakes (no browser):
which push becomes a new-drop alert, a "ready to collect" alert, or both.
CI also runs the edge functions' Deno tests.

## Drops from screenshots

`admin/freebies.html` has a **Read Screenshots** panel. Paste up to four
Discord image links (cdn.discordapp.com / media.discordapp.net; they expire
after about a day) or choose the screenshots, and the `read-drop` edge
function has Claude read each offer into a draft: platform (matched to the
catalogue when it can be), code, claim link, reward, expiry, terms. Nothing
is published until you load a draft into the form, check it and SAVE. The
function is admin-only, fetches images only from Discord's hosts, and costs
roughly a cent or two per read.

Saving with **On save, alert the users who track this platform** ticked (or
pressing **NOTIFY** on an entry later) asks the `web-push` function to
announce it, once per entry. Only devices that turned on Settings →
**Alert me to new drops for platforms I track** and track that platform
(matched by name or root domain) get a push; the service worker then reads
the drop from the public feed and opens Freebies when tapped.

Setup, once:

```bash
supabase db push                                  # drop_alerts, owner_tier, least_privilege, catalog_service, rollup_view_and_link_rate
supabase secrets set ANTHROPIC_API_KEY="sk-ant-..."
supabase functions deploy read-drop --no-verify-jwt
supabase functions deploy web-push --no-verify-jwt
supabase functions deploy go --no-verify-jwt      # referral redirects
```

Every function checks its own caller (the admin email, the cron secret,
the signed-in user), and `go` is public by design: browsers follow it
without a token. Deploy them with `--no-verify-jwt`, or the gateway
answers 401 before the function runs.

Apply the migration before the app update reaches people. The app copes
with a server without it (drop alerts say they aren't available yet), but
the admin's NOTIFY needs it.

Phase 3 moderation is also kept behind the database boundary: the staff tab
is hidden until `is_moderator()` succeeds, and its queue reads and
approve/reject actions use the moderator-only RPCs in
`supabase/migrations/20260925000002_phase3_moderation_rpc.sql`. Browser roles never
receive direct raw-table moderation access.

Above moderators sits one **owner** (`community_profiles.is_owner`, set by
migration to the site's admin account; the migration refuses to apply until
that email is linked and confirmed in the app, rather than committing with
no owner). The owner has every moderator power,
is the only account that can make or unmake moderators (the Moderators panel
at the bottom of the staff console, by the email the person linked and
confirmed in Settings; an anonymous device can't be one), and is protected
by a trigger: nothing but a migration can demote,
mute or delete the owner's row, and no second owner can be set. Self-serve
deletion refuses the owner and moderators.

**Why not ESLint?** This app has no build step: 130+ inline `onclick="..."`
handlers in `index.html` call plain global functions defined in a classic
(non-module) `<script>` block. ESLint only gives meaningful coverage of that
inline script once it's extracted to its own file - and `check:syntax`
already does that extraction internally just to run `node --check` on it.
Doing the same extraction purely for linting, without changing how the app
actually loads its code, would add a dependency and a build step for little
real safety gain beyond what syntax checking already catches today.

## Phase 4: Monetization and billing operations

Phase 4 Pro billing keeps the catalog, timers, local collection tracking,
notifications, and Community browsing/voting free. Pro currently adds
unlimited custom tags and granular turnaround telemetry. Scheduled automated
backups remain disabled until a durable external runner is provisioned.

### Stripe configuration

1. Create two products (type: service), each with the statement descriptor
   **DAILYROLLOVER PRO** and a plain description of what Pro is:
   - **Daily Roll Over Pro (Monthly)**: a recurring price of **$4.99 USD/month**;
     store its ID as `STRIPE_PRICE_ID_PRO_MONTHLY`.
   - **Daily Roll Over Pro (Annual)**: a recurring price of **$49.90 USD/year**
     (two months free); store its ID as `STRIPE_PRICE_ID_PRO_ANNUAL`.
   Keep product names and descriptions literal: no nicknames or slang. Stripe
   reviews them when the account goes live.
2. Enable the Stripe Customer Portal: cancel at period end, payment-method
   updates, invoice history, and links to `/terms.html` and `/privacy.html`.
3. Limit customers to one subscription: in *Settings → Checkout and Payment
   Links → Subscriptions*, redirect customers who already have an active
   subscription to your website (`https://dailyrollover.com/`, where Manage
   Billing is). Stripe then stops a second subscription when a checkout page
   is opened. The checkout function can't do that alone: it only sees
   subscriptions that exist when a checkout starts, and a checkout page left
   open can be paid later. (Each new checkout also tries to expire the
   account's older open checkout pages, within a few seconds. That is
   best-effort, and it doesn't replace this setting.)

### Supabase deployment

Set secrets without committing them:

```bash
supabase secrets set STRIPE_SECRET_KEY="sk_test_..."
supabase secrets set STRIPE_WEBHOOK_SECRET="whsec_..."
supabase secrets set STRIPE_PRICE_ID_PRO_MONTHLY="price_..."
supabase secrets set STRIPE_PRICE_ID_PRO_ANNUAL="price_..."
```

Deploy in this order:

```bash
supabase db push
supabase functions deploy create-checkout-session
supabase functions deploy create-portal-session
supabase functions deploy stripe-webhook
```

Register the webhook at
`https://<project-ref>.supabase.co/functions/v1/stripe-webhook` for:

- `checkout.session.completed` (unlocks Pro the moment checkout finishes)
- `customer.subscription.created`
- `customer.subscription.updated`
- `customer.subscription.deleted`

### Going live (test keys to live keys)

One Supabase project serves both modes, so changing the four Stripe secrets
moves every account at once. Do these in order:

1. **Before activating:** the Terms page states the refund policy, and
   `support@dailyrollover.com` receives mail (for example, Cloudflare Email
   Routing forwarding it to a personal inbox).
2. **Activate the Stripe account** in the dashboard (business details, bank
   account, identity). Describe the business as it is: subscription software.
   Daily Roll Over is a daily-bonus tracker and reminder app for people who
   use sweepstakes casinos. It does not run games, take entries, hold deposits
   or pay prizes; Pro is a monthly or annual software subscription.
3. **Products:** on each product in test mode, use *Copy to live mode*. Check
   the names, the prices ($4.99/month, $49.90/year) and the statement
   descriptor, then note the two live price IDs.
4. **Customer Portal and Checkout settings:** configure the portal again in
   live mode (test and live settings are separate) as in *Stripe
   configuration* above, and check that the one-subscription limit is on in
   live mode.
5. **Webhook:** add a live endpoint at the same URL with the four events above,
   and copy its signing secret.
6. **Secrets:** set `STRIPE_SECRET_KEY` (`sk_live_...`),
   `STRIPE_WEBHOOK_SECRET` (the live endpoint's), and both
   `STRIPE_PRICE_ID_PRO_*` to the live price IDs, then redeploy the three
   billing functions.
7. **Test-mode endpoint:** disable it. Its events now fail the live signature
   check.
8. **Leftovers from testing:** the checkout and portal functions treat
   customer and subscription IDs saved in test mode as absent, so an account
   that tested checkout can still buy for real. A test Pro period keeps its
   entitlement until its `current_period_end`. To end those at once instead,
   run this right after the switch, with the switch time filled in:

   ```sql
   update public.user_subscriptions
   set tier = 'free', status = 'canceled', stripe_customer_id = null,
       stripe_subscription_id = null, current_period_end = null,
       cancel_at_period_end = false
   where stripe_customer_id is not null
     and updated_at < '<switch time, UTC>';
   ```

9. **A real purchase:** buy the monthly plan with a real card, confirm Pro
   unlocks, open Manage Billing and cancel, then refund the charge from the
   dashboard.

The client reads entitlements through `get_my_entitlement()` and fails closed
to Free when the account is anonymous, expired, offline, or unavailable. Stripe
IDs and entitlement authority are never stored in IndexedDB or localStorage.
Run `npm.cmd run check` and `git diff --check` locally; migration execution,
Edge Function deployment, webhook registration, and Stripe test-mode events
still require live Supabase/Stripe verification.
