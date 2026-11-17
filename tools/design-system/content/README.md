Daily Roll Over is a daily bonus tracker for sweepstakes and social casino platforms: a dark, phone-first ledger where gold means "act now" and everything else stays quiet. One layout wears seven skins; tokens carry the skin, components never hard-code it.

## Content fundamentals

- **Voice:** a dealer's, brief and a little wry. Speak to the player as "you"/"your": "Your Daily Roll's Over", "DEAL YOUR HAND", "Stay put", "Skip this one".
- **Casing:** buttons are short UPPERCASE verbs — OPEN, SAVE, CANCEL, REMOVE, DONE, SEND TEST ALERT. Section labels and form labels are uppercase in `label-caps`. Names, sentences and help text are sentence case.
- **Numbers:** times and countdowns in the mono family (`detail-mono`, `.status-time`): READY, `6:12:40`, "next roll 08:00".
- **Legal line** is always present on the landing: "18+ (21+ where required). Not available where sweepstakes play is prohibited." Keep it in `text-muted`, never hidden.
- No emoji in UI copy. Glyphs allowed: `⋯` for menus, `✕` to remove, `▾` for sort, `•` and `·` as separators ("DAILY DROPS • TIMERS • REDEMPTIONS").

## Skins (themes)

Each theme id is the app's `data-theme` value. Switch skins by setting `data-theme` on `<html>`; never branch component CSS on a skin except for that skin's own effects.

{{SKINS_TABLE}}

## Visual foundations

**Color.** Ground is `bg-base`; every surface on it is `glass-surface` with a `glass-border` edge and `glass-highlight` hairline. `accent-gold` is reserved for action and money — primary buttons, the active tab or chip, the brand word, focus. Text on gold is always `ink-on-gold`. State colours: `accent-green` ready, `accent-orange` warning/sort, `accent-pink` danger, `accent-cyan` secondary info; each has a `-dim` fill used behind the solid colour as border + text. The accent names are historical — in Burin "gold" is bone and in Dead Channel it is phosphor white; use the role, not the hue.

**Contrast.** {{CONTRAST}} Status is never colour alone — tiers carry their letter, D/F/Not Rankable differ by dashed/dotted borders.

**Type.** System sans for all UI (`sans`); Georgia (`serif`) only for the wordmark and sheet titles; Courier New (`mono`) for initials, times and detail lines. Weights run heavy: 800–900 for names, badges and buttons, 600–700 for chips and labels. Tracking opens on caps (`date-header` 0.15em, `label-caps` 0.05em) and tightens on names (−0.01em). Skins bring their own display faces from Google Fonts (Cormorant Garamond, Cinzel, IBM Plex Mono, IM Fell English, Pinyon Script, Special Elite, Oswald, Tilt Neon, Rajdhani, Orbitron, VT323), loaded by the skin's room on first build.

**Space and shape.** Spacing runs in 2px steps from `space-2` to `space-24`; cards pad `space-14`, sheets `space-24`. Radii grow with the element: `radius-sm` badges → `radius-input` fields → `radius-card` cards → `radius-pill` buttons, sheets and hero → `radius-rail` the nav rail. Round things (`radius-round`) are avatars, dots and the hero ring. Content column max 640px; sheets max 440px.

**Depth.** `shadow-panel` on surfaces, `shadow-button` on the gold pill, `shadow-dock` lifting the docked footer. Blur is light (12px panels, 20px dock, 4px backdrop) and Executive drops it for performance — depth by border, not by blur. Stacking: `z-dock` < `z-fab` < `z-tour` < `z-sheet` < `z-run`.

**Motion.** Theme switches crossfade colours over 450ms. Presses spring to scale .965 (`cubic-bezier(.34,1.56,.64,1)`, 130ms). Cards rise 10px with a 30ms stagger; sheets rise 18px over 300ms. With `html[data-motion="off"]` or reduced motion, all of it stops and visualized skins show their muted pairing.

**Focus.** Inputs swap their border to `accent-gold`; buttons take a 2px `accent-gold` outline offset 2px (3:1 or better on `bg-base` in every skin).

## Iconography

- The mark is the gold coin app icon (Logos). Use it as-is on dark ground; never recolour or redraw it.
- App icons are gold coins struck with a glyph (Icons: clock, deck, house, send): the card table's phone shows them as its apps, and `coin-send` marks the daily run (`.r3t-run-coin`, 62px disc). Use them whole, round, at 40px or larger.
- In-page controls use text glyphs (`⋯ ✕ ▾ ⚙`), not an icon font or SVG set.
- Illustrative props: casino chips (Chips) and the coins and bills of the landing's money shot (Intro props). They are scene art, not UI icons — don't use them at icon size inside controls.

## Components

Glass surface, buttons, nav tabs, filter chips, tier badges, ledger card, hero stat, form fields and the sheet modal. Each is a set of the app's own CSS classes (`components/bundle.css`); use the class names exactly and supply your own markup and text.

## Not synced

- Previews are static renditions of the app's CSS classes; the app has no component library to bundle.
- Skin-specific restyling in `app.css` (Executive's gradient panels, Dead Channel's scanlines, West Texas's torn edges, room edge lights) is not reproduced — previews show the token-driven base.
- Body gradients (`bodyBg`), `--gold-metal` and the 3D homes are not tokens (gradients and WebGL); see `index.html` THEMES and `assets/intro3d/`.
- Skin display fonts are hosted on Google Fonts and not bundled.
