# Agent Guide

## Project Shape

- This is a build-free static PWA: the repository runs as is, including under a subpath. The deploy runs one optional step, `npm run build:site` ([scripts/build-site.js](scripts/build-site.js)), which writes `dist/` with the scripts minified (top-level names kept) and without `data/catalog.json`; CI smoke-tests that output too. See [README.md](README.md) for the full rationale and checks.
- [index.html](index.html) owns the shipped markup and classic inline application JavaScript.
- [assets/app.css](assets/app.css) owns layout, base styles, and theme overrides.
- [assets/accessibility.css](assets/accessibility.css) owns focus, skip-link, reduced-motion, and mobile performance styles.
- [assets/accessibility.js](assets/accessibility.js) owns keyboard and ARIA behavior for dynamic strategy rows.
- [data/catalog.json](data/catalog.json) is the catalogue's source of truth, published to the database when it merges to `main` (the Publish catalogue workflow, `publish_catalog_with_key`) or from the admin page (`publish_catalog`); the app reads it through `get_catalog()` and the file is never deployed. [data/catalog.js](data/catalog.js) only restores the browser's saved copy into `CATALOG_DATA` before the first refresh. Referral links never reach the browser: `launchUrlFor()` sends OPEN through the `go` edge function for platforms flagged `hasReferral`. A Pro account's own link (the edit sheet's referral field, mirrored to `member_links`) comes first; a platform imported from a friend's shared list carries its `shareCode` and adds `&via=<launch token>` so the database can serve the sharer's link when both hold Pro (see README, *Pro referrals and shared lists*).
- [sw.js](sw.js) owns offline caching and same-origin network behavior.

## Working Rules

- Preserve classic scripts, global functions, inline `onclick` handlers, and the current script-loading order unless deliberately migrating the whole architecture.
- Use two-space indentation, semicolons, and existing naming patterns.
- Keep local URLs relative; the app may run under a GitHub Pages subpath.
- Treat localStorage keys and persisted state as public contracts. Add migration logic before changing a key.
- Do not add frameworks, bundlers, or unrelated refactors. The one runtime exception already in place is `supabase-js`, loaded via CDN `<script src>` (see Cloud Sync below) the same way Google Fonts already is - no bundler, nothing to `npm install` to run the app. The only dev dependency is `terser`, used by the deploy step alone. The second, agreed for the landing intro: three.js, vendored (minified, unmodified) in `assets/vendor/three/` and loaded only by the WebGL intro (`assets/intro3d/intro.mjs`) and the table it flies into (`assets/intro3d/table.mjs`, which also uses the addons' `CSS3DRenderer` for the page elements laid on the table) through a dynamic `import()` - see `assets/vendor/three/README.md` for the version and how to update it. Don't add further dependencies beyond that without deliberate discussion.
- Catalog edits must preserve required fields and optional metadata; tracked user copies are persisted separately from the catalog.
- Dynamic interactive rows must retain the existing accessibility behavior.

## Validation

Run from the repository root:

```bash
npm run check
npm run check:syntax
npm run check:refs
npm run check:catalog
npm run test:smoke                 # browser flows against a fake Supabase
npm ci && npm run build:site && SMOKE_ROOT=dist npm run test:smoke
```

The authoritative script definitions are in [package.json](package.json), and CI runs the full check through [.github/workflows/checks.yml](.github/workflows/checks.yml). Use the narrowest relevant check first, then the full suite for cross-file changes.

## Theme Work

- Theme definitions live in the inline `THEMES` object in [index.html](index.html). Object order is picker order.
- Theme variables, `bodyBg`, and browser `theme-color` are applied through the existing theme engine and exposed via `data-theme`.
- Skins come in pairs: a **visualized** skin and its **muted** pairing - same colours, different effects. A visualized skin names its pairing in `look` (it wears that theme's palette and every `[data-theme="<look>"]` rule) and the table the landing flies into in `table` (its home; see `assets/intro3d/table.mjs`). `applyTheme()` sets `data-theme` to the look and `data-skin` to the skin itself, so rules that are the visualized skin's own effects (for Refinement × Realization: the drifting three-tone mesh, the sweep on the gold) are scoped `[data-skin="<id>"]`, while the room both share - for Executive Lounge: black cards on brushed obsidian, one slow swaying light, a little gold dust - is `[data-theme="<look>"]`. The muted pairing is the quiet, readable take of the same room. Refinement × Realization (`refinement`, the default) / Executive Lounge is the first pair. Everyone was moved onto it once when it became the default (the `almanac_skin_rxr_v1` flag, set by the pre-paint bootstrap); a skin picked after that is kept. The bootstrap at the top of `index.html` mirrors the look table and must be kept in step.
- The card table (`?dest=card`) is the only destination; `?dest=none` keeps the classic landing. The intro's sound is on unless the speaker switched it off (`almanac_intro_sound`, reset to on once by `almanac_intro_sound_on_v1`); browsers hold a page silent until its first tap or key, so that tap starts it (`createIntro()` in `assets/intro3d/intro.mjs`).
- With motion off (`html[data-motion="off"]`), a visualized skin's pages must be exactly its muted pairing's, and its table is entered with `reduced: true` (a cut to the seat, the cards already dealt, nothing moving after).
- The table's dealer (`makeDeal()` in `assets/intro3d/table.mjs`) picks one of four deals each visit - `single`, `rows`, `columns`, `spread` - and `?deal=<style>` fixes one for testing. Every card is laid face down before it turns, so its back is seen; the backs are engraved SVG drawn by `backArt()` per tier and handed to the page as `--r3t-art-<tier>` / `--r3t-foil-<tier>` custom properties. A tapped card comes up in front of the camera and can be dragged to turn it (`focal`, `spinBy()`); the lab's `rollTable.turnCard(dx, dy)` does the same. The dealer is a seven-axis arm (`buildDealerArm()`): solved every frame from the shoulder to the wrist with the elbow carried out to the side. Its links (`ARM.upper` + `ARM.fore`) must stay longer than the farthest shoulder-to-wrist reach of any deal, or `pose()` clamps and the forearm stops short of the wrist - re-measure (every style, 9 cards) after moving the port, the layout or the grab/lay poses. The hand's wrist attitude (`lean`/`dip` on each `move()`, pivoting at the fingertips, level at every grab and lay) and its fingers (`FIN` presets, played per finger with a lag through `dealer.userData.fingers()`) are part of the plan; a grip arches the fingers so the pads rest on the card instead of curling through it. It rises through an iris port (`buildPort()`, a real hole through the felt and the table, which the arm's own canvas mirrors in depth only). The props (chip float, shoe, discard rack) are modelled in `table.mjs`; the lab's `rollTable.look(eye, aim, fov)` puts the camera anywhere in the seat's frame to look one over (`look()` puts it back).
- Put visual overrides in [assets/app.css](assets/app.css), scoped to the relevant theme selector.
- Preserve accessibility and reduced-motion behavior, including the existing `screenShake()` and `hapticBuzz()` hooks.
- For Ransom Note / Revolver Chamber work, follow [.github/agents/ransom-chamber.agent.md](.github/agents/ransom-chamber.agent.md).

## Cloud Sync

- **On by default, opt-out.** `isSyncEnabled()` reads the enabled key against the literal string `'false'` - an unset key (fresh install) is enabled. `initSync()` runs at boot regardless of the landing screen and signs the device into an anonymous Supabase account automatically (`ensureSyncSignedIn()`), no button click required; `dismissLanding()` also kicks a sync attempt for immediacy. The Settings toggle (`toggleCloudSync()`) is the opt-out, not the opt-in - don't revert this to "disabled by default" without discussion, that was a deliberate later change from the original opt-in design.
- Client code lives in the "Cloud sync" block in the inline script in [index.html](index.html) (search for `SUPABASE_URL`); server schema is the `collection_events` table in the Supabase project (`ewfvyrhlsanzkmozrmhs`) managed via migrations applied through the Supabase MCP tools, not a checked-in `.sql` file - use `list_migrations`/`execute_sql` against that project to inspect it. The `id` column is `text`, not `uuid` - it holds the app's own `uid()`-style ids (e.g. `id_yar7dm8yd`), not real UUIDs; this was a real bug once (every push 400'd) before the column type was fixed to match.
- It's an outbox-and-replay design over `collectionHistory` only (the ledger behind streaks/stats - not `trackedGames`, not settings): local mutations enqueue an op via `enqueueHistorySync(entry, deleted)` (a no-op while sync is disabled), `flushSyncOutbox()` pushes it (upsert by id), `pullAndReplay()` fetches rows changed since the last cursor and applies them locally by id, tombstoning (`deleted: true`) rather than hard-deleting so other devices learn about removals instead of resurrecting them. `kickSync()` is the shared "try now" entry point (seed-if-needed + flush + pull) used by every automatic trigger; `initSync()` sets up the recurring interval/listener exactly once and must not be called more than once per page load.
- Every `collectionHistory` entry needs a stable `id` (assigned by `ensureHistoryEntryIds()` on load, and inline wherever a new entry is created) for this to work - preserve that if you touch collection-history code, even when sync itself isn't what you're changing.
- The anon/publishable key in `index.html` is meant to be public (protected by RLS, not secrecy) - don't treat it as a secret to scrub, but also don't add anything there that would need to be one.
- Browser roles start with nothing: the `least_privilege` migration revoked the default table grants from `anon`/`authenticated` and changed the default privileges, so a new table or RPC is unreachable until its migration says `GRANT` explicitly. Views are `security_invoker`; a public view needs a published-row policy and column grants on its tables, not `SECURITY DEFINER`.
- The catalogue's own RPCs (`get_catalog`, `publish_catalog`, the owner's reports) live in the `catalog_service` migration. Merging a [data/catalog.json](data/catalog.json) change to `main` publishes it through the Publish catalogue workflow; a branch alone changes nothing users see.

### Email linking (device-independent recovery)

- Anonymous auth alone has no credential to sign back in with elsewhere - clearing a device's storage loses local access to that device's cloud copy. Email linking closes that gap: `linkEmailToAccount()` attaches an email to the CURRENT (anonymous) account via `client.auth.updateUser({ email })` - same user id, same data, now with a credential. `sendRecoverySignIn()` is the opposite direction - pulling a previously-linked account's data onto a new/wiped device via `client.auth.signInWithOtp({ email, options: { shouldCreateUser: false } })`. `shouldCreateUser: false` is load-bearing: without it, recovering with an email that was never linked to anything would silently create a new blank account instead of failing, which would look like recovery while doing the opposite. Keep that flag.
- Both flows use passwordless email links, not passwords - no password field exists anywhere in this UI, and none should be added without discussion.
- `getEmailRedirectTo()` resolves to `window.location.origin + window.location.pathname` at call time - no hardcoded production URL, since there's no build step to bake one in and the app also runs on GitHub Pages subpaths, custom domains, and localhost. This only works if that exact resolved URL (or a matching wildcard) is in the Supabase project's Auth "Redirect URLs" allow list (dashboard, not available via any MCP tool here) - if email links stop completing after a domain change, check that list first, not the code.
- `getSupabaseClient()` registers a single `onAuthStateChange` listener (fires on the routine anonymous sign-in too, not just an email link completing) that repaints the email section and kicks a sync attempt - don't register a second one elsewhere, and don't call `initSync()` more than once per page load for the same reason `kickSync()`'s interval/listener setup already warns about above.
- `renderSyncEmailUI()` distinguishes a linked account from anonymous via `session.user.is_anonymous` - an anonymous session still has RLS access (`authenticated` role either way), so this is a display/UX signal, not a security boundary; don't repurpose it as one.

### First-collect email gate

- `markCollected()`, `collect()`, `collectCurrentDailyRun()`, and `openDrop()` (only when it would actually log a collection) each open with `interceptForEmailGate(retryFn)` - a synchronous check against `cachedHasLinkedEmail`/`EMAIL_GATE_PASSED_KEY`, not an async session lookup, since these are synchronous `onclick` handlers. If it returns `true` the caller must return immediately without doing any of its own work; `retryFn` is what re-runs the original action once the gate clears, so add the check to any NEW function that logs a collection the same way, and keep it a closure over the same args the original call had.
- `collectCurrentDailyRun()` is gated at its own level even though it calls `collect()`, which is also gated - `collect()` bailing out on its own wouldn't stop the daily-run wrapper from still advancing `dailyRunIndex`/stats as if the collection had happened. Any future wrapper around a gated function needs the same double-gating, not just the inner call.
- The gate only requires *submitting* an email (`linkEmailCore()` resolving, i.e. the confirmation email queued), not waiting for the confirmation click - that's a deliberate friction tradeoff (chosen explicitly over a harder "block until confirmed" gate and a softer "just nag, never block" one), not an oversight. Don't tighten it to wait for confirmation, or loosen it to a dismissible reminder, without discussion.
- Browsing, adding/removing platforms, and every non-collecting action stay completely ungated - only actions that call `logCollection()` (directly or via the functions above) are.
- Canceling the gate (`cancelEmailGate()`) must never let the pending action through - it only clears `pendingGatedAction` and closes the modal. There is no bypass path; verify this stays true if this code is touched.

## Change Hygiene

- Read the owning abstraction and a nearby call site before editing.
- Keep `index.html` syntax-valid; an inline-script error breaks the shipped app.
- Run reference checks after renaming or adding local files.
- Bump `CACHE_NAME` in [sw.js](sw.js) and `APP_BUILD` in [index.html](index.html) together whenever a shipped file changes (`npm run check:refs` fails if they differ). A new build downloads every file except the rare tiers' extras (`assets/intro3d/rare/`) while the landing shows its "Updating" bar, and the intro waits for that download and a refresh (`appWhenCached()`). A new asset must be added to `PRECACHE_URLS`; `check:refs` fails if one is missing.
- After a catalogue edit, run `npm run build:seo` (the pages and history are generated from the file); merging to `main` publishes the catalogue.
- Keep editor-local `.vscode/` settings and personal Git/Copilot overrides out of the repository.
- Avoid reformatting unrelated sections.
