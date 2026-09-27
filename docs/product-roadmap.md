# Product Roadmap

This roadmap separates **implemented foundations / in-flight verified work** from **future proposals**. It is repository-grounded, not a revenue claim, and it preserves Free safety/basic data access. Estimated bonus values remain estimates, not redeemed money or guaranteed earnings.

## Implemented foundations already in the repo

- **F-01 · Local-first deck + history**  
  **Owners:** `index.html` persistence + collection history, `assets/storage.js` IndexedDB mirror  
  **What exists:** tracked platforms, timers, collection history, daily-run history, export/import, local undo paths.
- **F-02 · Cloud sync + linked-email recovery**  
  **Owners:** `index.html` sync/email-gate blocks  
  **What exists:** synced collection history, synced tracked-game snapshot, anonymous-by-default sync, linked-email recovery for the synced account.  
  **Important boundary:** this does **not** claim full settings/deck-history recovery beyond the currently synced deck/history surfaces.
- **F-03 · Catalog verification primitives**  
  **Owners:** `data/catalog.json`, `index.html`, admin catalog tools  
  **What exists:** verification dates, catalog refresh, published catalog versioning, history/build checks.
- **F-04 · Pro/billing/referral foundations**  
  **Owners:** `README.md`, `supabase/functions/*`, billing schema/migrations  
  **What exists:** Pro entitlement checks, checkout/portal flows, referral routing, shared-list support.  
  **Boundary:** pricing and revenue fit remain hypotheses until validated.

## Prioritized backlog

| ID | Priority | Workstream | Depends on | Owning files / subsystems | Acceptance criteria | Verification |
|---|---|---|---|---|---|---|
| DR-01 | P0 | Daily-run correctness + regression tests | F-01, F-02 | `index.html` daily-run + collect/gate code, `scripts/smoke-test.js` | Opening a platform does not itself confirm a daily-run collection; confirmation records once and advances at most once; canceling/failing the email gate causes no collection, cooldown change, or advancement; resume/focus re-evaluates readiness without resetting a valid run. | Smoke coverage for open-vs-confirm, duplicate-tap protection, gate cancel/retry, focus/resume readiness refresh; `npm run check`; `npm run test:smoke`. |
| DR-02 | P1 | Daily-run UX, accessibility, and honest persistence messaging | DR-01 | `index.html`, `assets/app.css`, `assets/accessibility.css` only if needed | Daily-run labels clearly distinguish open vs confirm; progress and completion states are understandable; status text does not rely on color alone; copy distinguishes estimated SC/GC value from redeemed money; persistence/recovery wording accurately distinguishes device-local data, synced history, and linked-email recovery. | Manual keyboard/mobile pass, smoke coverage where practical, `npm run check`. |
| DR-03 | P1 | Catalog verification + change transparency | F-03 | `index.html`, admin catalog flow, `README.md`, build/check scripts as needed | Users can see what changed, when it was last verified, and when information is stale; catalog changes do not silently overwrite user-owned tracked data. | Catalog/build checks, manual catalog refresh verification, no user-data regressions. |
| DR-04 | P2 (future only) | Pro value and billing lifecycle validation | F-04 | Billing edge functions, entitlement UI, README/product copy | Validate trial/checkout/recovery/cancel flows, support expectations, and what recurring utility Pro actually delivers before changing price or promise. No pricing/billing changes in this phase by default. | End-to-end billing walkthroughs in test/staging environments, support-script review, exact flow checklist. |
| DR-05 | P2 (future only) | Evidence-backed change summaries | DR-03 | Catalog/admin tooling, `README.md`, possible admin UI additions | Each meaningful catalog change can surface a human-readable summary backed by evidence, without claiming unverifiable facts. | Review sample summaries against source evidence and stale-data rules. |
| DR-06 | P2 (future only) | User-selected time-budget planning | DR-01, DR-02 | `index.html` filtering/sorting/daily-run UI | Users can choose a short session budget (for example 5–10 minutes) and see ready items ordered by usefulness, never by monetization pressure or guaranteed-income language. | Manual scenario tests; regression checks that Free access and current filters still work. |
| DR-07 | P2 (future only) | Distribution experiments | DR-03, DR-05 | SEO/share surfaces, docs/reporting | Try evidence-backed acquisition/distribution ideas without introducing manipulative ranking, gambling pressure, or unsupported earning claims. | Written experiment plan, success/failure criteria, reversible rollout steps. |

## Current focused PR slice

- **Included now:** DR-01 plus the smallest DR-02 polish needed to make the corrected flow understandable and testable.
- **Explicitly deferred:** multi-tab conflict coordination beyond current local refresh behavior, undo semantics that would require new sync-conflict rules, billing/pricing changes, new analytics services, backend migrations, and catalog content edits.

## Residual limitations to keep honest

- Daily Run is still a device-local session; this roadmap does **not** claim crash-proof or reload-proof run resumption without a later, migration-tested persistence design.
- Multi-tab coordination remains best-effort. UI can refresh from shared local state, but a stronger “single active run across tabs/devices” guarantee would need additional persisted coordination that is intentionally out of scope for the focused reliability slice.
- Future Pro pricing and revenue assumptions are hypotheses until validated; no monetization-influenced ranking or earnings promises belong in the product.
