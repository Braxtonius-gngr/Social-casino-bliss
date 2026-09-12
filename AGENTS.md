# Agent Guide

## Project Shape

- This is a build-free static PWA deployed as-is, including GitHub Pages subpaths. See [README.md](README.md) for the full rationale and checks.
- [index.html](index.html) owns the shipped markup and classic inline application JavaScript.
- [assets/app.css](assets/app.css) owns layout, base styles, and theme overrides.
- [assets/accessibility.css](assets/accessibility.css) owns focus, skip-link, reduced-motion, and mobile performance styles.
- [assets/accessibility.js](assets/accessibility.js) owns keyboard and ARIA behavior for dynamic strategy rows.
- [data/catalog.js](data/catalog.js) owns the `CATALOG_DATA` master array.
- [sw.js](sw.js) owns offline caching and same-origin network behavior.

## Working Rules

- Preserve classic scripts, global functions, inline `onclick` handlers, and the current script-loading order unless deliberately migrating the whole architecture.
- Use two-space indentation, semicolons, and existing naming patterns.
- Keep local URLs relative; the app may run under a GitHub Pages subpath.
- Treat localStorage keys and persisted state as public contracts. Add migration logic before changing a key.
- Do not add frameworks, bundlers, or unrelated refactors. The one exception already in place is `supabase-js`, loaded via CDN `<script src>` (see Cloud Sync below) the same way Google Fonts already is - no bundler, no build step, nothing to `npm install`. Don't add further runtime dependencies beyond that without deliberate discussion.
- Catalog edits must preserve required fields and optional metadata; tracked user copies are persisted separately from the catalog.
- Dynamic interactive rows must retain the existing accessibility behavior.

## Validation

Run from the repository root:

```bash
npm run check
npm run check:syntax
npm run check:refs
npm run check:catalog
```

The authoritative script definitions are in [package.json](package.json), and CI runs the full check through [.github/workflows/checks.yml](.github/workflows/checks.yml). Use the narrowest relevant check first, then the full suite for cross-file changes.

## Theme Work

- Theme definitions live in the inline `THEMES` object in [index.html](index.html).
- Theme variables, `bodyBg`, and browser `theme-color` are applied through the existing theme engine and exposed via `data-theme`.
- Put visual overrides in [assets/app.css](assets/app.css), scoped to the relevant theme selector.
- Preserve accessibility and reduced-motion behavior, including the existing `screenShake()` and `hapticBuzz()` hooks.
- For Ransom Note / Revolver Chamber work, follow [.github/agents/ransom-chamber.agent.md](.github/agents/ransom-chamber.agent.md).

## Cloud Sync

- **On by default, opt-out.** `isSyncEnabled()` reads the enabled key against the literal string `'false'` - an unset key (fresh install) is enabled. `initSync()` runs at boot regardless of the landing screen and signs the device into an anonymous Supabase account automatically (`ensureSyncSignedIn()`), no button click required; `dismissLanding()` also kicks a sync attempt for immediacy. The Settings toggle (`toggleCloudSync()`) is the opt-out, not the opt-in - don't revert this to "disabled by default" without discussion, that was a deliberate later change from the original opt-in design.
- Client code lives in the "Cloud sync" block in the inline script in [index.html](index.html) (search for `SUPABASE_URL`); server schema is the `collection_events` table in the Supabase project (`ewfvyrhlsanzkmozrmhs`) managed via migrations applied through the Supabase MCP tools, not a checked-in `.sql` file - use `list_migrations`/`execute_sql` against that project to inspect it. The `id` column is `text`, not `uuid` - it holds the app's own `uid()`-style ids (e.g. `id_yar7dm8yd`), not real UUIDs; this was a real bug once (every push 400'd) before the column type was fixed to match.
- It's an outbox-and-replay design over `collectionHistory` only (the ledger behind streaks/stats - not `trackedGames`, not settings): local mutations enqueue an op via `enqueueHistorySync(entry, deleted)` (a no-op while sync is disabled), `flushSyncOutbox()` pushes it (upsert by id), `pullAndReplay()` fetches rows changed since the last cursor and applies them locally by id, tombstoning (`deleted: true`) rather than hard-deleting so other devices learn about removals instead of resurrecting them. `kickSync()` is the shared "try now" entry point (seed-if-needed + flush + pull) used by every automatic trigger; `initSync()` sets up the recurring interval/listener exactly once and must not be called more than once per page load.
- Every `collectionHistory` entry needs a stable `id` (assigned by `ensureHistoryEntryIds()` on load, and inline wherever a new entry is created) for this to work - preserve that if you touch collection-history code, even when sync itself isn't what you're changing.
- The anon/publishable key in `index.html` is meant to be public (protected by RLS, not secrecy) - don't treat it as a secret to scrub, but also don't add anything there that would need to be one.

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
- Bump `CACHE_NAME` in [sw.js](sw.js) when cache invalidation is required.
- Keep editor-local `.vscode/` settings and personal Git/Copilot overrides out of the repository.
- Avoid reformatting unrelated sections.
