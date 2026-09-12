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

- Optional, opt-in, off by default. Everything works exactly as before with zero network calls unless the user enables it in Settings.
- Client code lives in the "Cloud sync" block in the inline script in [index.html](index.html) (search for `SUPABASE_URL`); server schema is the `collection_events` table in the Supabase project (`ewfvyrhlsanzkmozrmhs`) managed via migrations applied through the Supabase MCP tools, not a checked-in `.sql` file - use `list_migrations`/`execute_sql` against that project to inspect it.
- It's an outbox-and-replay design over `collectionHistory` only (the ledger behind streaks/stats - not `trackedGames`, not settings): local mutations enqueue an op via `enqueueHistorySync(entry, deleted)`, `flushSyncOutbox()` pushes it (upsert by id), `pullAndReplay()` fetches rows changed since the last cursor and applies them locally by id, tombstoning (`deleted: true`) rather than hard-deleting so other devices learn about removals instead of resurrecting them.
- Every `collectionHistory` entry needs a stable `id` (assigned by `ensureHistoryEntryIds()` on load, and inline wherever a new entry is created) for this to work - preserve that if you touch collection-history code, even when sync itself isn't what you're changing.
- The anon/publishable key in `index.html` is meant to be public (protected by RLS, not secrecy) - don't treat it as a secret to scrub, but also don't add anything there that would need to be one.

## Change Hygiene

- Read the owning abstraction and a nearby call site before editing.
- Keep `index.html` syntax-valid; an inline-script error breaks the shipped app.
- Run reference checks after renaming or adding local files.
- Bump `CACHE_NAME` in [sw.js](sw.js) when cache invalidation is required.
- Keep editor-local `.vscode/` settings and personal Git/Copilot overrides out of the repository.
- Avoid reformatting unrelated sections.
