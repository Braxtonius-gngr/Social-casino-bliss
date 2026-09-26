# Daily Roll Over

Daily bonus tracker for sweepstakes and social casino platforms. A single
static `index.html` (plus a handful of small `assets/`/`utils/` scripts and
stylesheets) - no build step, deployed as-is via GitHub Pages.

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

`data/catalog.json` is the authoritative, network-loaded platform-rules
payload. `data/catalog.js` is only a bootstrap loader that reads the JSON (or
the last valid local cache) before the first refresh succeeds. `check:catalog`
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
Cloud Sync, Pro checkout and entitlements, background push, and account
deletion. It drives an installed Chrome or Chromium over the DevTools
protocol (set `CHROME_PATH` if it isn't found) against a recording fake of
Supabase, so it needs no network and, like the checks, no `npm install`. CI
runs it after `npm run check`.

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
supabase db push                                  # 20260926174321_drop_alerts.sql
supabase secrets set ANTHROPIC_API_KEY="sk-ant-..."
supabase functions deploy read-drop
supabase functions deploy web-push
```

Apply the migration before the app update reaches people. The app copes
with a server without it (drop alerts say they aren't available yet), but
the admin's NOTIFY needs it.

Phase 3 moderation is also kept behind the database boundary: the staff tab
is hidden until `is_moderator()` succeeds, and its queue reads and
approve/reject actions use the moderator-only RPCs in
`supabase/migrations/20260925000002_phase3_moderation_rpc.sql`. Browser roles never
receive direct raw-table moderation access.

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

1. Create a Stripe product named **Daily Roll Over Pro**.
2. Create a recurring monthly price of **$4.99 USD** and store its ID as
   `STRIPE_PRICE_ID_PRO_MONTHLY`.
3. Optionally create a **$45.00 USD/year** price and store its ID as
   `STRIPE_PRICE_ID_PRO_ANNUAL`.
4. Enable Stripe Customer Portal with cancellation and payment-method updates.

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

- `customer.subscription.created`
- `customer.subscription.updated`
- `customer.subscription.deleted`

The client reads entitlements through `get_my_entitlement()` and fails closed
to Free when the account is anonymous, expired, offline, or unavailable. Stripe
IDs and entitlement authority are never stored in IndexedDB or localStorage.
Run `npm.cmd run check` and `git diff --check` locally; migration execution,
Edge Function deployment, webhook registration, and Stripe test-mode events
still require live Supabase/Stripe verification.
