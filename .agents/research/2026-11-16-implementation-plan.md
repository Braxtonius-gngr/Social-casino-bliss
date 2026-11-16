# Implementation Plan — Contrast fixes + Design system depth

## Mode: Standalone
Report: none · Report age: n/a · Staleness warnings: none · Base: `dd8f38f` (branch `claude/design-system-extraction-k4wi2x`)
Work type: Bug fix / improvement · Risk tolerance: **Aggressive** · Timeline: **Flexible (weeks+)**

---

## Codebase Analysis

### Related Code
| File/Module | Relevance | Notes |
|---|---|---|
| `index.html` `THEMES` (~7395–7760) | High | Live source of every skin's `--text-dim` / `--accent-pink` (7 skins); `applyTheme()` writes them inline on `<html>` |
| `assets/app.css` :root + per-theme blocks (1–215) | High | First-paint mirror of THEMES. **Already out of sync**: base pink `#B4485C` vs THEMES `#C8455E`; western pink `#810000` vs `#C41E2E` |
| `assets/app.css` component rules | High | `var(--text-dim)` ×36; `color: var(--accent-pink)` ×22 (text uses: danger button, warnings, errors, ledger purchases, keen title…) |
| `assets/app.css` skin rules | High | `[data-theme]` rule counts: western 217, prism 169, obsidian 112, neon 111, executive 77, glitch 62, burin 56; 11 `data-skin` rules |
| `index.html` inline markup | Low | 2 `var(--text-dim)` uses |
| `assets/rooms/*.js` | Low | No direct use of the two tokens (rooms add their own type/edge light) |
| `tools/design-system/build.mjs` | High | Computes contrast notes; hard-codes `EXTRA`, spacing, radii, type lifted from app.css |
| `tools/design-system/content/components/bundle.css` | High | Hand-copied base rules; no drift detection today |
| Daily sync task `trig_01EhbUvMyN7yRh4AdmLkmwSN` | Med | Prompt must learn about drift + skin layer |
| `.github/workflows/checks.yml` + `package.json` `check` | Med | Where a new mirror check would run |

### Patterns to Follow
| Pattern | Example Location | Apply To |
|---|---|---|
| Dependency-free node check script, wired into `npm run check` | `scripts/check-references.js`, `scripts/check-syntax.js` | THEMES ↔ app.css mirror check |
| Token roles over hues (`-dim` fill + solid border/text) | `.btn-danger`, `.type-badge` | New text-only danger token |
| Skin overrides scoped to `[data-theme="x"]` in app.css | AGENTS.md "Put visual overrides in app.css" | Any per-skin colour tweak |
| Computed notes in generator | `usageFor()` in `build.mjs` | New token usage notes |
| Flat-skin layout check at 390/360px, all skins | AGENTS.md Theme Work | Visual verification |

### Dependencies
| This work depends on | Type |
|---|---|
| THEMES object shape (`vars` per theme) | Required |
| `applyTheme()` writing vars inline | Required |
| Artifact page compiling `[data-theme]` blocks from tokens.json | Required (skin layer) |

| This work will affect | Impact |
|---|---|
| Every skin's secondary/meta text and danger/warning text | High (visual, all skins) |
| Design system artifact (tokens, README, previews) | Med |
| CI (`npm run check` gains a step) | Med |
| Daily sync task | Low |

### Detected Conventions
| Convention | Detected | Evidence |
|---|---|---|
| Build | None (static PWA) | CLAUDE.md, AGENTS.md |
| Theming | CSS vars via THEMES + first-paint mirror in app.css | app.css header comments |
| Motion off | `html[data-motion="off"]` | app.css, show.js |
| Checks | Node scripts, no deps | `scripts/check-*.js` |
| Tests | `npm run check`; smoke test (browser) | package.json |

---

## Feature Spec

| Aspect | Details |
|---|---|
| **What** | (1) Make meta text (`text-dim`) and danger/warning text readable at WCAG AA in all 7 skins, and make the first-paint copy of each palette provably identical to THEMES. (2) Make the design system reflect each skin's real look and warn when the copied component CSS drifts from app.css. |
| **Why** | Low-contrast text is hard to read on phones in sunlight; the danger colour is the one users must not miss. The design system is only trustworthy if it shows the real skins and can't silently go stale. |
| **Scope in** | `--text-dim` and danger text in THEMES + app.css; mirror check; generator tokens/notes; skin layer in the artifact; drift report; sync prompt. |
| **Scope out** | Re-tinting brand fills (blood reds, neon pink fills, glows), the 3D homes, room edge lights, fonts inside the WebGL scenes. |

### User Stories
| # | As a... | I want... | So that... |
|---|---|---|---|
| 1 | player on a phone | meta lines (verify tags, summaries, timestamps) readable in every skin | I can trust what the card says without squinting |
| 2 | player | warnings and danger actions to read clearly | I don't miss a purchase gate or delete something by accident |
| 3 | maintainer | CI to fail if a skin's first-paint palette differs from THEMES | the first frame never flashes wrong colours |
| 4 | designer/agent using the system | to see each skin as it really looks | I design with the real thing, not the base |
| 5 | maintainer | to be told when copied component CSS drifts | the system never quietly goes stale |

### Acceptance Criteria
| # | Criterion | How to Verify |
|---|---|---|
| 1 | `text-dim` ≥ 4.5:1 on `bg-base` in all 7 skins | Generator contrast output; tokens.json usage notes no longer flag it |
| 2 | Every text use of the danger colour ≥ 4.5:1 on `bg-base` in all 7 skins | Same, for the new text token |
| 3 | Brand fills (pink borders, glows, danger fills) unchanged unless they carry text | Screenshot diff per skin |
| 4 | `text-dim` stays visibly dimmer than `text-muted` in each skin | dim ratio < muted ratio per skin |
| 5 | `npm run check` fails when an app.css first-paint token ≠ THEMES | Introduce a deliberate mismatch → check fails; revert → passes |
| 6 | Artifact previews show skin-specific styling for the 10 components when the page's theme switches | Headless render per skin vs app screenshot |
| 7 | Build reports each bundle.css rule whose app.css source changed since lift | Edit a base rule → build lists it |
| 8 | Daily sync report includes drift lines | Fire the task after a test change |

**Target values (minimal HSL lift to 4.5:1, hue and saturation kept) — starting points, tune by eye:**
| Skin | text-dim now → target | danger text now → target |
|---|---|---|
| executive | `#5A5D63` 2.96 → `#767a82` 4.53 | `#C8455E` 4.16 → `#cb4f67` 4.51 |
| prism | `#645e56` 3.08 → `#7f786e` 4.51 | `#9e3540` 2.85 → `#c65560` 4.56 |
| neon | `#4d665b` 3.18 → `#618072` 4.57 | `#ff007f` 5.24 → ok |
| obsidian | `#655e56` 2.86 → `#877e73` 4.58 | `#a86b62` 4.29 → `#ab7067` 4.54 |
| glitch | `#4E5661` 2.73 → `#6d7887` 4.51 | `#E0242F` 4.31 → `#e22f3a` 4.53 |
| western | `#6b6b66` 3.67 → `#797974` 4.52 | `#C41E2E` 3.35 → `#e03747` 4.52 |
| burin | `#6B5A4E` 2.96 → `#8d7767` 4.57 | `#B81414` 2.91 → `#e93030` 4.54 |

---

## T-shirt Sizing
| # | Task | Size | Files |
|---|---|---|---|
| 1 | THEMES ↔ app.css mirror check + resync drifted first-paint values | M | `scripts/check-theme-mirror.js` (new), `package.json`, `assets/app.css` |
| 2 | Contrast token pass: lift `--text-dim`; add text-only danger token; repoint the 22 text uses | M | `index.html` (THEMES ×7), `assets/app.css` (first-paint ×7 + ~22 rules), `AGENTS.md` |
| 3 | Skin override sweep: rules that set colour over/next to these tokens per skin | S | `assets/app.css` |
| 4 | Generator: new token, notes, README wording, bundle.css uses danger text | M | `tools/design-system/build.mjs`, `content/README.md`, `content/components/bundle.css` |
| 5 | Drift detector for lifted CSS | M | `tools/design-system/build.mjs`, `tools/design-system/lifted.mjs` (new), `content/lifted.json` (new), `tools/design-system/README.md` |
| 6 | Skin layer: extract `[data-theme]` rules for the 10 components into the artifact | M | `tools/design-system/skin-layer.mjs` (new), `build.mjs`, `content/components/` previews as needed, `tools/design-system/README.md` |
| 7 | Skins showcase card + per-skin display fonts | M | `content/components/Skins/preview.html` + `README.md` (new), `build.mjs` (type families per skin), `content/README.md` |
| 8 | Sync prompt + docs | S | daily task prompt, `AGENTS.md`, `tools/design-system/README.md` |

No L tasks. Tasks 4–6 all touch `build.mjs`, so they run sequentially (see Depends On).

---

## Impact Analysis
| Area | Files Affected | Risk Level | Notes |
|---|---|---|---|
| Theme data | `index.html` THEMES | Med | 7 skins × 2 values + 1 new var each; picker swatches read vars |
| Stylesheet | `assets/app.css` | High | First-paint blocks + ~22 component rules + skin overrides; every skin visually affected |
| CI | `package.json`, new check script | Med | New failing condition for future PRs |
| Docs | `AGENTS.md` | Low | Token vocabulary + mirror rule |
| Design system generator | `tools/design-system/*` | Low | Dev-only, not shipped |
| Artifact | published files | Low | Republished by sync |
| Tests | `npm run check`, smoke test, screenshots | Med | Visual review needed across 7 skins × 2 widths |

---

## Implementation Plan
| Phase | # | Task | Size | Files | Urgency | Risk | ROI | Blast | LOE | Depends On |
|---|---|---|---|---|---|---|---|---|---|---|
| **A: Foundation** | 1 | Add a dependency-free check that every app.css first-paint token equals THEMES `vars` for that skin (base `:root` = executive); wire into `npm run check`; fix the values already drifted (base pink, western pink and any others it finds) | M | `scripts/check-theme-mirror.js`, `package.json`, `assets/app.css` | H | L | H | All skins' first frame | 3h | - |
| **B: Contrast** | 2 | Lift `--text-dim` to ≥4.5:1 in all 7 skins (targets above). Add a text-only danger token (e.g. `--accent-pink-text`) per skin at ≥4.5:1, leaving `--accent-pink` fills/borders/glows as they are; repoint the ~22 `color: var(--accent-pink)` text rules (incl. skin rules at app.css:2210, 3476, 4024). Document the token in AGENTS.md. Acceptance: criteria 1–4 | M | `index.html`, `assets/app.css`, `AGENTS.md` | M | M | H | Every skin, all secondary + danger text | 5h | Task 1 |
| B: Contrast | 3 | Sweep each skin's `[data-theme]` rules for hard-coded text colours that sit where `text-dim`/danger text was meant (e.g. western hover, neon date header glow, burin/glitch rooms' labels) and for `.btn-danger:hover` text-on-fill; adjust only failing pairs. Acceptance: no text pair under 4.5:1 in screenshots of ledger, settings sheet and catalogue, every skin at 390px and 360px | S | `assets/app.css` | M | M | M | Per-skin pages | 4h | Task 2 |
| **C: Design system** | 4 | Generator picks up the new danger-text token (computed note), drops the now-false "below 4.5:1" wording automatically, README contrast line regenerates; bundle.css text uses switch to the new token. Republish via sync | M | `build.mjs`, `content/README.md`, `content/components/bundle.css` | M | L | M | Artifact only | 2h | Task 2 |
| C: Design system | 5 | Drift detector: record, per bundle.css selector, the app.css base rule it was lifted from and a hash of its declarations (`content/lifted.json`); build compares and prints drifted selectors (non-fatal; `--strict` exits 1). Also check `EXTRA` literals against their app.css rules | M | `build.mjs`, `lifted.mjs`, `content/lifted.json`, `tools/design-system/README.md` | M | L | H | Dev tooling | 4h | Task 4 |
| C: Design system | 6 | Skin layer: extract every `[data-theme="x"] <selector>` rule from app.css whose selector targets only the 10 components' classes into a generated `components/skins.css` loaded with bundle.css; carry skin-local custom props (e.g. `--ob-ink`) they need; skip and list rules using `url()`, `data-skin`, `data-motion`, or classes outside the components. Acceptance: criterion 6 for ≥80% of component rules; skipped list in README "Not synced" | M | `skin-layer.mjs`, `build.mjs`, previews as needed, `tools/design-system/README.md` | L | M | H | Artifact previews | 8h | Task 5 |
| C: Design system | 7 | "Skins" showcase card: one ledger card + button row per skin side by side (nested `data-theme` wrappers). Add each skin's display faces (from AGENTS.md: Cormorant Garamond, Cinzel, IBM Plex Mono, IM Fell English/SC/DW Pica, Pinyon Script, Special Elite, Oswald, Tilt Neon, Rajdhani, Orbitron, VT323) as hosted families in tokens with which skin uses them | M | `content/components/Skins/*` (new), `build.mjs`, `content/README.md` | L | L | M | Artifact only | 4h | Task 6 |
| **D: Polish** | 8 | Update the daily sync task prompt to report drift lines and skipped skin rules; AGENTS.md points to the mirror check and drift report | S | trigger prompt, `AGENTS.md`, `tools/design-system/README.md` | L | L | M | Automation | 1h | Tasks 5–7 |

**Total LOE ≈ 31h.** Phase A and B can ship as one app PR; Phase C/D as a tools-only PR.

---

## Risk Assessment
| Risk | Likelihood | Impact | Mitigation | Phase |
|---|---|---|---|---|
| Lighter `text-dim` flattens hierarchy against `text-muted` | Med | Med | Keep dim ratio below muted per skin (criterion 4); check obsidian/executive where the gap is smallest (muted 5.9) | B |
| Brighter danger text clashes with a skin's identity (Burin blood, West Texas) | Med | Med | Only text changes; fills, borders and glows keep the brand hue; tune by eye on the skin's pages | B |
| Missed `var(--accent-pink)` text site keeps failing | Med | Low | Grep for `color:` + `--accent-pink` after the change; mirror check doesn't cover this — add a grep step to Task 3 acceptance | B |
| New mirror check breaks unrelated PRs | Low | Med | Land it with all current drift fixed; message names the token, skin and both values | A |
| Visualized skins (Showroom) style text separately from muted pairing | Med | Low | Include Showroom level screenshots for skins with one; motion-off must equal muted pairing (AGENTS rule) | B |
| Skin rules depend on context the artifact lacks (parent classes, data-skin, textures) | High | Low | Extractor skips and lists; previews degrade to base, never break | C |
| Generator grows complex for a dev tool | Med | Low | Keep each concern in its own module (`lifted.mjs`, `skin-layer.mjs`); deterministic output check stays | C |
| Daily sync republishes far more often once skins.css tracks 800+ rules | Med | Low | Hash covers only extracted rules; acceptable at most once a day | C/D |

---

## Test Plan
| Test Type | What to Test | Priority | Phase |
|---|---|---|---|
| Unit (script) | Mirror check passes on clean tree; fails on one changed var with a clear message | High | A |
| Integration | `npm run check` green locally and in CI | High | A, B |
| Contrast (computed) | Generator output: no `text-dim`/danger-text ratio < 4.5 in any skin; dim < muted | High | B, C |
| Visual | Ledger, settings sheet, catalogue in all 7 skins at 390px + 360px, motion on and off (+ Showroom where a skin has one) | High | B |
| Smoke | `npm run test:smoke` (browser flows) | Med | B |
| Unit (tool) | Drift detector: unchanged → no drift; edited base rule → listed; `--strict` exit code | Med | C |
| Visual (artifact) | Headless render of each component preview per skin vs app screenshot | Med | C |
| Determinism | Two builds byte-identical; `plan` after sync reports `changed: false` | Med | C |
| End-to-end | Fire the daily task after merge: republish + drift lines in report | Low | D |

---

## Rollback Strategy
| Phase | Scenario | Rollback Action |
|---|---|---|
| A | Mirror check blocks a legitimate PR | Revert the `package.json` wiring (script stays runnable by hand) |
| B | A skin looks wrong after the lift | Revert that skin's two THEMES values + its first-paint block; mirror check keeps them in step |
| B | New danger token breaks a component | Revert the commit; `--accent-pink` text rules return to the shared token |
| C | Skin layer renders broken previews | Drop `components/skins.css` from the publish (`null` it); base previews still work |
| C | Drift detector noisy | Run non-strict only; regenerate `lifted.json` from current app.css |
| D | Sync task misbehaves | Disable the scheduled task (update_trigger enabled=false); artifact keeps its last version |

---

## Deliverables
| Deliverable | Status |
|---|---|
| Mode detection | Done |
| Codebase analysis | Done |
| Feature spec | Done |
| T-shirt sizing | Done |
| Impact analysis | Done |
| Phased implementation plan | Done |
| Risk assessment | Done |
| Test plan | Done |
| Rollback strategy | Done |
| Written to file | Done |
