# The Executive Lounge

A design system, asset-generation brief, and implementation plan for the
Casino Almanac's high-end treatment.

Three deliverables below. Read [AGENTS.md](../AGENTS.md) first if you're going
to implement any of it - the constraints there (build-free, no frameworks,
classic scripts, relative URLs) shape most of the decisions in section 3.

**What already shipped alongside this document:**

| Change | Where |
|---|---|
| `executive` theme wired into the existing theme engine | `index.html` (`THEMES`), `assets/app.css` |
| `font-variant-numeric: tabular-nums` on every ticking number | `assets/app.css` |
| Working layout reference (sticky header, segmented control, three-zone cards, 5 AM math) | [`executive-lounge-prototype.html`](executive-lounge-prototype.html) |
| `docs/*.html` added to the syntax check | `scripts/check-syntax.js` |

---

## 1. Design system

### 1.1 The idea in one line

A dark-mode fintech dashboard that happens to be about casinos - not a casino
skin with a dashboard bolted on. Restraint is the luxury signal. The palette
has exactly one metal, and it is spent only on things you can act on.

The single rule that keeps this coherent: **gold means actionable.** If an
element is gold and tapping it does nothing, the system is broken. This is
why tier badges here are hairline outlines rather than gold pills - a tier is
a rating, not a button, and the catalog's tier letter is derived arithmetic
(see the header comment in `data/catalog.js`), so it should look like a
measurement rather than an advertisement.

### 1.2 Color tokens

Ground and surface:

| Token | Value | Use |
|---|---|---|
| `--color-obsidian` | `#050507` | Page ground. Also `<meta name="theme-color">`. |
| `--bg-raised` | `#101218` | Top of the body gradient; sheet and modal grounds. |
| `--color-glass` | `rgba(22, 24, 29, 0.75)` | Every card, header, and panel, under `blur(12px)`. |
| `--glass-border` | `rgba(212, 175, 55, 0.14)` | Hairline edge - gold at 14%, not grey. |
| `--glass-highlight` | `rgba(255, 255, 255, 0.07)` | Top/left edge only, simulating a light source above. |

Accents:

| Token | Value | Use |
|---|---|---|
| `--gold` | `#D4AF37` | Primary actions, active states, the global countdown. |
| `--gold-bright` | `#E8C860` | Top stop of the button gradient; hover. |
| `--gold-deep` | `#B8912B` | Bottom stop of the button gradient. |
| `--gold-dim` | `rgba(212, 175, 55, 0.16)` | Active segment fill, selected chips. |
| `--cyan` | `#4FD8E8` | Secondary actions, focus rings, informational accents. |
| `--cyan-dim` | `rgba(79, 216, 232, 0.14)` | Secondary fills. |

Text - three steps, no more:

| Token | Value | Use |
|---|---|---|
| `--text-primary` | `#F8F9FA` | Platform names, values, headings. |
| `--text-muted` | `#8A8D93` | Labels, badges, countdown digits. |
| `--text-dim` | `#5E6672` | Eyebrow labels, disabled, metadata. |

Tier ramp - deliberately *not* a red-to-green "good/bad" scale. These are
grind-time bands (S = fastest to a first cash redemption, D = slowest), and a
red D would read as "dangerous" rather than "slow":

| Tier | Value |
|---|---|
| S | `#D4AF37` (gold) |
| A | `#E3E4E5` (silver) |
| B | `#CD7F32` (bronze) |
| C | `#8A93A3` |
| D | `#7D8590` |
| Unranked | `#4A5160` |

`Unranked` is the most common value in this catalog (76 of 137 entries, against
15 for the next largest band) and
is an honest gap, not an error state - it gets the quietest color in the ramp,
never a warning color.

### 1.3 Elevation: the two-state rule

The whole interface runs on one physical metaphor, and it carries the single
most important piece of information in the app - *can I claim this right now?*

- **Raised (actionable).** Gold vertical gradient, 1px light top border,
  outer drop shadow. Reads as a physical key sitting on the surface.
- **Recessed (waiting).** Near-black fill, `inset` shadow, 1px light line
  *below* it. Reads as a well pressed into the card.

These are exact inverses, so the state is legible at a glance and at a
distance, without reading a single digit - and it still works for a
red/green colorblind user, because the cue is shape and depth, not hue.

```css
/* Raised: claimable */
background: linear-gradient(180deg, #E8C860 0%, #D4AF37 55%, #B8912B 100%);
box-shadow: 0 1px 0 rgba(255,255,255,0.28) inset, 0 3px 10px rgba(0,0,0,0.5);

/* Recessed: counting down */
background: rgba(0,0,0,0.42);
box-shadow: inset 0 1px 3px rgba(0,0,0,0.75), 0 1px 0 rgba(255,255,255,0.04);
```

### 1.4 Type

System UI stack for everything functional; a serif for the wordmark only.
The serif is the entire "VIP" budget - spend it once, in the logo, and let the
rest stay a dashboard.

| Role | Spec |
|---|---|
| Wordmark | Georgia / Times, 700, 17px |
| Platform name | System UI, 600, 15px |
| Global countdown | Monospace, 700, 15px, **tabular** |
| Card countdown | Monospace, 600, 13px, **tabular** |
| Eyebrow label | System UI, 600, 10px, `letter-spacing: 0.14em`, uppercase |
| Badge | System UI, 600, 10.5px |

### 1.5 Numbers that don't jitter

Every ticking readout carries:

```css
font-variant-numeric: tabular-nums slashed-zero;
font-feature-settings: "tnum" 1, "zero" 1;
```

With proportional figures, `1` is narrower than `8`, so a countdown physically
changes width as it counts and nudges everything beside it once a second.
Tabular figures lock every digit to one advance width.

**Tabular figures are necessary but not sufficient.** They cannot help when
the string loses a *character*: `10:00:00` → `9:59:59` is a real width change
no font feature addresses. Two further defenses, both applied in the
prototype:

1. Zero-pad to a fixed `HH:MM:SS` shape, so the character count never changes.
2. Give the right zone a **fixed width** (92px), so the row doesn't reflow at
   the moment a countdown expires and a Claim button takes its place.

This is applied theme-agnostically in `assets/app.css`, not scoped to
`[data-theme="executive"]`: a countdown that doesn't jitter is a correctness
property, not a look. Executive Lounge is just the theme that made the jitter
obvious.

### 1.6 Figma mobile layout structure

Frame: **390 × 844** (iPhone 14/15). Grid: 4px base, 16px side gutters.

```
┌─────────────────────────────────────────────┐
│ GLOBAL HEADER          sticky, H 56, fill   │  ← Fixed on scroll
│ ┌───────────────┐        ┌────────────────┐ │
│ │ Logo (hug)    │        │ 5AM countdown  │ │
│ └───────────────┘        └────────────────┘ │
├─────────────────────────────────────────────┤
│ CONTROL BAR            sticky, H 52, fill   │  ← Fixed on scroll
│ ┌─────────────────────────────────────────┐ │
│ │ [ Sort by Tier ][ Sort by Frequency ]   │ │
│ └─────────────────────────────────────────┘ │
├─────────────────────────────────────────────┤
│ CARD LIST              vertical, gap 12     │  ← Scrolls
│ ┌─────────────────────────────────────────┐ │
│ │ ┌────┐ ┌──────────────┐  ┌───────────┐  │ │
│ │ │icon│ │ name + badge │  │  CLAIM /  │  │ │
│ │ │ 44 │ │    (fill)    │  │ countdown │  │ │
│ │ └────┘ └──────────────┘  └─── 92 ────┘  │ │
│ └─────────────────────────────────────────┘ │
└─────────────────────────────────────────────┘
```

**Global header** - Auto-layout horizontal, `Fill × Fixed 56`, space-between,
padding `0 16`. Constraint: `Left & Right` + `Top`, **Fix position when
scrolling** on.
- *Left:* logo text, **Hug**, `nowrap`.
- *Right:* vertical auto-layout, **Hug**, right-aligned. Eyebrow label above
  the value, so the value keeps one fixed baseline while it ticks.

**Control bar** - Auto-layout horizontal, `Fill × Fixed 52`, padding `0 16`,
**Fix position when scrolling** on. In CSS this is `position: sticky; top:
56px` - it must equal the header height exactly, which is why both are tokens
(`--header-h`, `--control-h`) rather than magic numbers.
- *Segmented control:* auto-layout horizontal, **Fill**, padding 3, gap 3,
  radius 10, on `rgba(0,0,0,0.45)` with a hairline border. Both segments
  **Fill** so they're always equal width. Active segment: `--gold-dim` fill,
  `--gold` label, radius 6. Inactive: transparent, `--text-muted`.
  Build it as a component with a boolean `active` variant on each segment.

**Casino card** - Auto-layout **horizontal**, `Fill × Hug`, padding 12,
gap 12, radius 16, `--glass` fill, 1px `--glass-border`, **vertical align
center**.

| Zone | Sizing | Contents |
|---|---|---|
| Left | Hug (44×44) | Icon, radius 10, 2px border in the tier color. The border *is* the tier signal. |
| Middle | **Fill**, `min-width: 0` | Name (1 line, truncate) over a badge row: tier letter + frequency badge. |
| Right | **Fixed 92** | Claim button **or** countdown well - never both, always the same footprint. |

Three details that matter more than they look:

- The middle zone is the **only** Fill zone, so it absorbs every pixel of
  slack. That makes it the only place text is allowed to truncate, which is
  correct - a casino name can be long, a countdown never can.
- In CSS, `min-width: 0` on that zone is **required**. A flex child defaults to
  `min-width: auto`, which refuses to shrink below its content, and
  `text-overflow: ellipsis` silently does nothing. This is the single most
  common bug in this layout.
- The right zone is Fixed, not Hug. Hug would let the card reflow the instant a
  timer hits zero and the wider Claim button swaps in.

**States to build as variants:** `ready` (gold Claim), `cooldown` (recessed
well), `snoozed` (well at 60% opacity), `never-collected` (Claim + a cyan dot).

---

## 2. Midjourney assets

### 2.1 Read this before generating anything

This app is a **build-free static PWA that caches itself for offline use**
(`sw.js`). That makes raster assets expensive in a way they wouldn't be in a
normal web app:

- Everything precached is downloaded before first paint and again on every
  `CACHE_NAME` bump.
- The current repo ships one raster asset total (`apple-touch-icon.png`, 7.6KB).
  A single 9:16 Midjourney background at usable density is **300-600KB** - that
  is 40-80× the app's entire current image payload, for a texture that sits at
  7% opacity behind everything.

So: **generate for exploration, ship almost none of it.** Concretely:

| Asset | Generate? | Ship? |
|---|---|---|
| Background texture | Yes - to agree on a direction | **No.** Reproduce as a CSS gradient. |
| Icon set | Yes - as reference | **No.** Trace in Figma, ship inline SVG. |
| Tier medallions | Yes | Only as traced SVG, if at all. |
| App icon / splash | Yes | **Yes** - these are genuinely raster, and already required by `manifest.json`. |

The background in the shipped theme is a two-layer CSS gradient costing zero
bytes:

```css
background:
  radial-gradient(120% 80% at 50% -10%, rgba(212,175,55,0.07) 0%, transparent 55%),
  linear-gradient(180deg, #101218 0%, #0B0C10 62%, #07080B 100%);
```

Use Midjourney to decide *what that gradient should look like*, then throw the
PNG away. That is the highest-value use of it here.

### 2.2 The two specified prompts

**Background**

```
A seamless, ultra-minimalist dark abstract background, subtle brushed metal
texture, absolute black and deep charcoal, high-end luxury, clean, ui
background --ar 9:16 --style raw --v 6.0
```

Good as written. Two notes: `--tile` is worth adding if you actually want
seamless (the word "seamless" in the prompt does not produce a tiling image;
the parameter does), and add `--chaos 0` for reproducible variations while
you're narrowing down a direction.

```
A seamless, ultra-minimalist dark abstract background, subtle brushed metal
texture, absolute black and deep charcoal, high-end luxury, clean, ui
background --tile --chaos 0 --ar 9:16 --style raw --v 6.0
```

**Icons**

```
A minimalist UI icon set for a fintech app, representing 'coins', 'timers',
and 'guides', designed in sleek metallic gold against a dark background,
vector style, flat shading --v 6.0
```

Also good, with one expectation to set: "vector style" produces a raster image
*that looks like* vector art. It is not SVG, the strokes will not be optically
consistent between icons, and the set will not sit on a shared grid. Treat the
output as a **mood reference to trace**, not as a deliverable. Add `--ar 1:1`
so each icon is generated square, and generate the three subjects separately -
asking for a "set" in one image gives you three icons drawn at three different
scales.

### 2.3 Recommended additional prompts

**Tier medallions** - the S/A/B/C/D badge language, generated once as a family
so the five share a visual system:

```
A set of five minimalist metallic rank insignia medallions, single letter
engraved, brushed gold and gunmetal, flat top-down view, isolated on pure
black, luxury membership card aesthetic, no text except the letter
--ar 1:1 --style raw --v 6.0
```

**App icon** - genuinely needs to be raster, and `manifest.json` already
declares the sizes:

```
An app icon for a luxury finance almanac, a single embossed gold monogram on
deep obsidian, centered, minimal, no text, soft rim light, premium mobile app
icon --ar 1:1 --style raw --v 6.0
```

**Empty-state illustration** - the one place a generated raster earns its
weight, because it appears once and carries real emotional load:

```
A minimal luxury still life, a single empty brushed gold coin tray on deep
obsidian, dramatic low key rim lighting, lots of negative space, editorial
product photography --ar 1:1 --style raw --v 6.0
```

**Card texture** (optional, for the hero panel only, never the list):

```
Extreme close up of black anodized aluminum with a fine circular brush finish,
subtle gold fleck, macro, even lighting, abstract texture --tile --ar 1:1
--style raw --v 6.0
```

### 2.4 Handoff

Midjourney → Figma → code, and the code end should almost always be CSS or
inline SVG:

1. Generate, pick a direction, and **sample the actual hex values** out of the
   winning image. That is the real output.
2. Rebuild in Figma with those values as gradients and vector shapes.
3. Export icons as SVG, run them through SVGO, paste inline. Inline SVG inherits
   `currentColor`, so one icon works across all six themes; a gold PNG only
   works in this one.
4. For the app icon only, export PNG at the sizes `manifest.json` declares, and
   bump `CACHE_NAME` in `sw.js`.

---

## 3. Implementation plan

### 3.1 What the brief assumed, and what's actually here

The brief describes building a single-file PWA from scratch with 5 AM reset
logic, sorting, and localStorage persistence. **That app already exists**, and
most of that logic is already written and more careful than a fresh
implementation would be:

| Brief item | Already in `index.html` |
|---|---|
| 5:00 AM reset math | `lastResetInstant()`, `nextResetInstant()`, `zonedHourToUtc()` |
| Timezone correctness | `getLockedTZ()`, `isValidTimeZone()`, `resetTZ` per platform |
| Readiness | `getCooldownState()` - one source of truth for rolling *and* fixed resets |
| Sorting | `SORT_CONFIG` + multi-key sort stacks (`compareByStack`) |
| localStorage | `VIEW_STATE_KEY`, `sanitizeViewState()`, `ALL_APP_STORAGE_KEYS` |
| Theming | `THEMES` + `applyTheme()` + `data-theme` |

So the work is **not** "write the app." It's "restyle the app, and fill the
real gaps." Rewriting any of the above would be a regression - in particular:

- `nextResetInstant()` handles a reset pinned to a *fixed* zone (5 AM ET
  regardless of where you are), via `Intl`-based conversion. Naive
  `setHours(5,0,0,0)` only handles device-local. Both are correct for
  different platforms; the app already distinguishes them.
- `getCooldownState()` is deliberately the only place a platform's mode
  (rolling cooldown vs. fixed reset hour) is interpreted. Adding a second
  interpretation is how the two drift apart.

### 3.2 Gaps this actually closed

1. **No tabular figures anywhere.** `font-variant-numeric` appeared zero times
   in the repo. Every countdown in the app jittered. Fixed globally.
2. **No theme matching the brief.** Added `executive` to `THEMES`, using the
   brief's exact values (`#050507`, `rgba(22,24,29,0.75)`, `#D4AF37`),
   plus `--accent-silver` and `--accent-bronze` for the tier podium.
3. **No layout reference.** Added the prototype as a runnable spec.

### 3.3 Wiring the theme in (done)

Three touch points, because the theme engine already does the rest:

1. `THEMES.executive` in `index.html` - the variable set, `bodyBg`, `metaColor`.
2. The pre-paint bootstrap array at the top of `index.html` -
   `['western', 'prism', 'neon', 'obsidian', 'glitch', 'executive']`. **Easy to
   miss.** `getActiveThemeId()` validates against `THEMES`, but the inline
   bootstrap script runs before that object exists and has its own hardcoded
   list. Omit it and the theme works until you reload, then flashes Boot Hill.
3. `[data-theme="executive"]` overrides in `assets/app.css`.

The settings picker needs no change - `renderThemeUI()` enumerates `THEMES`.

Why step 3 is long: the base stylesheet bakes neon lighting in at the
component level as literal `rgba()` values (`box-shadow: 0 0 20px
rgba(0,255,102,0.4)`). No variable swap can reach those, so each surface is
restated. This is the same shape as the existing Obsidian Ledger block - follow
that precedent rather than inventing a new mechanism.

On blur: panels are `rgba(22,24,29,0.75)` under `backdrop-filter: blur(12px)`,
both straight from the brief. An earlier pass used 0.85/6px on frame-budget
grounds - `backdrop-filter` is priced per pixel per frame and this app scrolls
a long column of panels - but at 0.75 the blur is genuinely visible rather
than decorative, so it earns its cost. If it ever needs clawing back on
low-end hardware, lower the radius; don't raise the opacity, which is what
makes the glass read as glass.

### 3.3a The background image

`assets/background.webp` is referenced from `THEMES.executive.bodyBg`, not from
a `body { }` rule in `app.css`, and that placement is load-bearing twice over:

- `applyTheme()` assigns `bodyBg` to `document.body.style.background` - an
  inline **shorthand**, which resets `background-image/-size/-position/
  -attachment`. The equivalent CSS rule would be wiped on every theme apply.
- CSS resolves a relative `url()` against the **stylesheet's** URL. `app.css`
  lives in `assets/`, so `url('assets/background.webp')` written there resolves
  to `assets/assets/background.webp`. An inline style resolves against the
  **document**, where the path is correct - and stays correct under a GitHub
  Pages subpath, since it never starts with a slash.

Until the file exists the two gradient stops simply paint over `#050507`.
`check:refs` never scans CSS `url()`, so the dangling reference cannot break
CI - but `PRECACHE_URLS` **is** scanned, which is why the service worker entry
and the `CACHE_NAME` bump wait until the file is actually committed.

### 3.4 Order of work if you take this further

Smallest blast radius first. Each step is independently shippable and
independently revertible:

1. **(done)** Tabular figures. Theme-agnostic, benefits all six themes.
2. **(done)** `executive` theme. Purely additive - no existing theme changes.
3. **Global 5 AM countdown in the header.** The highest-value *new* feature in
   the brief and the only piece of it the app genuinely lacks. Reuse
   `nextResetInstant(serverNow(), 5, getLockedTZ())` - do not write new date
   math. Drive it from the existing render interval, not a new `setInterval`.
4. **Fixed-width right zone on cards.** Currently `.card-actions` hugs its
   contents, so rows shift when READY/WAIT swap. A fixed min-width removes it.
5. **Segmented sort control.** The app has a richer multi-key sort stack than
   the brief's two-way switch, so this is a *presentation* change over
   `SORT_CONFIG` - surface "Tier" and "Frequency" as the two prominent
   presets, keep the full stack behind the existing Sort button. Don't delete
   capability to match a mockup.

### 3.5 Constraints that bite

From [AGENTS.md](../AGENTS.md), the ones most likely to be violated by a
visual pass:

- **No build step.** No PostCSS, no Sass, no Tailwind. `assets/app.css` is
  hand-written and shipped as-is.
- **Classic scripts.** Inline `onclick` handlers and global functions are the
  architecture, not tech debt. `renderGames()` builds HTML strings; match that.
- **Relative URLs.** The app runs under GitHub Pages subpaths. A leading `/`
  breaks it there and nowhere else, so it survives local testing.
- **localStorage keys are public contracts.** Adding a key is free; renaming
  one needs migration logic.
- **Escape interpolated values.** `escHtml()` exists and platform names are
  user-editable.
- **`npm run check` before finishing.** Syntax, references, catalog.

### 3.6 Verification

The prototype was verified in headless Chromium, not by inspection:

- Tier sort → `S, A, B, C, D, Unranked`; frequency sort → `4h, 12h, 24h…`,
  alphabetical within ties.
- `nextResetAt()` lands on exactly `05:00` local, strictly in the future,
  within one day.
- Claim → the row swaps to a recessed well with no reflow; state survives
  reload.
- A corrupt `localStorage` payload (`{"sort":"bogus","collected":{"nope":"NaN"}}`)
  degrades to defaults and still renders all six cards.
- No horizontal overflow at 320 / 360 / 390 / 430px.
- `font-variant-numeric` resolves to `tabular-nums slashed-zero` on
  `.status-time` and `.cooldown-chip` in the real app.
