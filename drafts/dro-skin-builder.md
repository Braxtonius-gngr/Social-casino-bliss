---
name: "dro-skin-builder"
description: "Build or rework a Daily Roll Over skin end to end: its Lounge/Quiet room, its 4D moment as the payout, and its Showroom 3D home. Use whenever a skin, theme, Figma skin board, showcase level or 4D breakout for Daily Roll Over comes up."
---

# Building a Daily Roll Over skin

The procedure that took Obsidian Ledger from a Figma board to all three levels
(PRs #110 and #111 in braxtonius-gngr/social-casino-bliss). Follow it for the
next skin (Neon Grid, Dead Channel, West Texas Gore Fest, Prism Noir), and read
the repo's AGENTS.md first: it is the source of truth, and this skill only
says how to go about the work.

## The model you are building into

To the person, a skin is one entry in the Theme picker with up to three
levels (assets/show.js):

- **Showroom**: the visualized skin. Its THEMES entry has `look: '<muted id>'`
  and `table: '<home>'`, and the landing flies into that 3D home after the
  dice.
- **Lounge**: the muted skin, with motion on. This is the Figma board's home
  screen, with its edge light, hero ring and collect moment. The board's
  "4D moment" becomes the **payout**, which plays when a Daily Run finishes
  with something collected.
- **Quiet**: the muted skin with Motion set to Off. Everything is held still,
  with larger numbers.

A **room** is the look (`data-theme`) a skin family wears. It is registered
with `showAddRoom(look, room)`, and the shape is documented at `ROOM` in
show.js: name, lede, showroom, muted, per-level copy and mini art, build,
layout, run(f), collect(card, id) and payout {label, play, clear, busy}. Every
room except R x R's is its own classic script, `assets/rooms/<look>.js`,
loaded after show.js and precached. Homes are modules listed in `ROLL_DESTS`
(index.html). Each exports `prepareTable(opts)`, which returns
`{ dest, fly(world, opts), dispose }`, and `fly()` returns the controller.
table.mjs (the card table) and study.mjs (the study) are the references.

## 1. Read the design, then ask

- **Figma:** the Starter plan caps MCP calls, so spend them carefully. Call
  `get_metadata` on the page once, then `get_screenshot` each skin board
  (spec, home, signature moment). Skip `use_figma` reads unless they're
  essential.
- **Check the code** for what already exists: the skin's THEMES entry, its
  `[data-theme]` rules in app.css, and its effects.
- **Ask before building** about anything the board leaves open. The user has
  said, in so many words, "don't assume". Typical open points:
  - where the 4D moment should play
  - which of two directions they mean
  - a name that is someone else's IP (TCM was renamed West Texas Gore Fest)
  - whether a board is a placeholder that needs a rework
- **Offer 2-3 directions for the Showroom home** and let the user pick. They
  liked "both" joined into one world: the study, with a dive inside its
  orrery.

## 2. Hold every piece to a real maker (set-baseline-intensive)

Load set-baseline-intensive. For each piece, write one line naming the real
maker or craft ("a Georgian table orrery from a London instrument maker's
bench"), then what it shows:

- **across the room:** its silhouette
- **at arm's length:** materials, bevels, seams
- **pinched in 3x:** engraving, grain, wear

For each piece, also note what each surface does with the one key light
(above left, in front of the glass), what it touches (shadows land on the
glass or felt, metal reflects its neighbours), and how it moves: a wind-up,
a small overshoot, a settle, and no two moves identical. Put that list at
the top of the room's file, as rooms/obsidian.js and study.mjs do.

**Hands are hero parts.** When a hand does the shot's action, build it the
way its maker built one:
- **The hand:** a carved or cast hand with mass in the palm (the heel and
  the ball of the thumb), an opposed thumb, fingers with knuckles that taper
  to a nail, and a little spread when open.
- **The cuff:** it closes on the wrist. Nothing hollow shows: no sleeve
  interior, no flat plate. Lace sits outside the cuff and falls over the
  back of the hand.
- **The grip:** pose it for its object *as the lens sees it*. The fingers
  wrap the object's far side, the thumb opposes on the side facing the
  lens, the object stays visible between thumb and index, and the palm
  stays locked to it through the whole move.

Judge a grip only from the shot's own camera at the moment it happens: a
collision scan that passes proves nothing about what reads.

**Study the hand before the shot.** Render each hand alone, from the shot's
camera, in every pose it takes (reach, grip, pull, rest), and hold it to a
reference hand:
- **Proportions:** fingers a quarter to a third of the palm's width (short
  and plump for a child's), and a thumb as long as the palm, set at its
  side.
- **A grip:** the palm's centre over the object's top, the fingers wrapping
  under its widest point, and the thumb on the side opposite them.
- **A rest:** a relaxed curl that grows from index to little finger (15-35°
  a joint), knuckles raised, the thumb alongside, and the fingertips and the
  heel of the hand on the surface.

Only pose the hand in the shot once the study reads.

**Contact.** Everything that rests on something casts a shadow onto it and
receives one: feet, legs, hands on a surface, props, coins.
- Where a shadow map is too soft to plant a foot, add a soft contact blob
  or ambient occlusion under it.
- A hand coming down onto a surface darkens it as it nears.
- Check it in the widest frame: nothing floats.

**Payoffs are physical.**
- A glow is a real light that lights its neighbours (the face, the cloth,
  the table), not just bloom on its source.
- Never recolour a surface to say it is lit; give it a catchlight instead.
- **Skin holds its value.** A mood (a dim, a silence, a gold flood) grades
  the room's light, never the skin. Give skin a shader floor from its own
  base colour so it cannot go grey under a dim or lime under a flood, and a
  warm tint in its shadow side; then the face is the same face in every
  frame. `[idea I17, slots r14]`
- Money has mass: piles with height, overlap and tilt, spilling over a lip.
- A backdrop runs past every edge of the frame: drapes carry on below the
  floor line (cut straight by the floor, no hem in view) and their run ends
  off-frame, so no frame shows where the set stops. `[idea I31, slots r19]`
- Metal reads as metal: a dark gold base, strong environment reflection, an
  embossed stamp.

**Shape a body from its profile.** A torso, a skirt or any vase-like body is
a lathe or loft profile, and everything fixed to it (a window, braid, buttons,
a collar) follows the profile.
- When the body's silhouette is wrong (a barrel or an egg instead of a
  figure), reshape the profile. Don't move a joint the arms, hands or other
  parts hang from: the joint moves and the arm comes away, where a reshaped
  profile carries every dependant with it. A figure is broad at the shoulders,
  tapers to a waist and flares at the hem; squint at 1× to check.
- Close each sleeve with a shoulder cap, so no open end shows.
`[idea I1, slots r9]`
- **A child's trunk is narrow.** Size the body from the head: a child's
  shoulders are about two head-widths and the chest under them narrower
  still, and anything set into the chest (a window, a plaque) is sized to
  that chest, not the chest to it. A body twelve percent too wide reads as a
  barrel at every distance, and shaving it is the one body change that read
  for 15 of 20 auditors. `[idea I27, slots r19]`
- **Profile tuning has a floor.** Once the profile is right, "an egg" that
  remains is the lack of a shoulder line and a coat opening; those are their
  own geometry (a yoke, two coat fronts over a waistcoat), not more profile
  points. Three profile rounds moved nothing past that floor.

**Thin organic parts are strands, not solids.** A plume, a frill, lace, a
fringe or fur is many single fine strands, each tapering to nothing, on
transparent cards, not one solid blade or an extruded tube.
- A hard alpha cut saws at the edge; fade the strand's edge instead.
- A nap on dark cloth wants the faintest bump: a strong one reads as a dot
  grid.
- Lace and soft cloth hang. A loop sags under its weight and a frill
  softens into pleats, never a perfect serrated ring.
- Check any strand you thicken against what it sits under. Fatter strands
  poke through a hat before they read as fuller.
- **Hair and curls are locks of strands.** A ringlet is two or three fine
  strands wound together, each with its own length, width and shade, and each
  tapering to a closed point; a single smooth tube with a blunt end reads as a
  worm or a spring. Lay a dark, dense under-layer beneath the locks so a gap
  shows hair, not scalp.
- **Cards plateau; tubes read.** Alpha strand cards, however shaded, read
  as striped, aliased paper at 3x and moire at 1x. Build each strand as a
  closed tube with a lobed, twisting cross-section that closes to a point,
  and carry the sheen with a groove normal map, so the hair is geometry with
  a lit side. Cap the hair's height under a hat per region, not by one
  slope: a cap tied to a hairline value is wrong where that value is a
  nape's. `[idea I46, slots r26, partial]`
- **A lock must clear the surface it grows from.** At a hairline or over a
  face, aim each lock outward from the skin and start it a little inside the
  hair edge. A lock aimed into the skin leaves only its dark root showing, and
  a dark stub on skin reads as a speck or a fly. Fade the root colour up to a
  warm mid-tone quickly, so the part that shows is never near-black. When
  the face gains relief (a cheekbone, a brow), move the hair's cap and every
  root out with it, by the relief less the hair sphere's margin: a face that
  stands out past the hair shows the roots beside it. `[idea I42, slots r23]`
`[ideas I8, I12, I13, slots r9-r11]`

The user's standing note: "fun, loose, less gravity" motion is fine; anything
unreal or perspectively incorrect is not. Longer durations are fine if they
look better. Never fake a size change by scaling the world. Move the camera,
bring its near plane in, and size what it holds to it.

## 3. PR 1: Lounge and Quiet, plus the payout

1. **Branch** off main as `claude/<skin>-lounge`.
2. **Write `assets/rooms/<look>.js`** with its `showAddRoom` call, loaded in
   index.html after show.js.
   - Type: fetch the skin's Google Fonts when the room is first built
     (`loadFonts()`), not for every skin.
   - Pieces: create them once (build must be idempotent), keyed in CSS on
     `[data-theme="<look>"]` so they hide themselves on other skins.
   - Run: `run(f)` draws today's run, done / tracked (f may undershoot or
     overshoot mid-move). The edge light and the hero ring both carry it.
   - Collect: `collect(card, id)` plays on the re-rendered card. Remove the
     element on `animationend`, and vary each play slightly.
3. **Put the CSS in app.css** as one section for the skin, scoped to
   `[data-theme="<look>"]`, with a Quiet block at
   `html[data-motion="off"][data-theme="<look>"]`.
   - Lift `.app-container` to `z-index: 2` only, never the docked footer. It
     keeps its 50; CodeRabbit caught this once.
4. **Build the payout (the 4D moment)** as its own module in
   `assets/intro3d/`, loaded on first play. Copy orrery.mjs's
   `createBreakout()`:
   - Draw the scene twice, cut at the glass (the plane z = 0 at 1:1 with the
     page). The part behind the glass goes into a canvas under
     `.app-container` (z 1); the part in front, with a ShadowMaterial
     catcher, goes into one over it (z 98). Copy each half out of one
     WebGL canvas.
   - Give each instrument its own materials. Clipping planes set on shared
     ones leak into other renderers.
   - Compile and upload before the clock starts: `compileAsync`, then
     `initTexture`.
   - Rest still at the end. The next touch folds it back.
   - On `webglcontextrestored`, rebuild `studioEnvironment(renderer)`.
   - Expose `seek(ms, folding)` for the lab.
5. **Housekeeping:** precache every new file in sw.js, and bump `CACHE_NAME`
   and `APP_BUILD` together, past whatever main is at. Update AGENTS.md
   (and CLAUDE.md and the three.js README if module use changes).

## 4. PR 2: the Showroom home

1. **Add the visualized skin** to THEMES, before its muted pairing, with
   `look` and `table`. Also add it to the pre-paint bootstrap's `look` map.
   Set the room's `showroom` field and give it Showroom copy and mini art.
2. **Write `assets/intro3d/<home>.mjs`** exporting `prepareTable` with the
   table's contract, and add it to `ROLL_DESTS`.
   - Build into the intro's scene (`scene.userData.set` holds the house
     materials). Keep the seat hidden until `o.warm({ show: [seat], spread: true })`
     has run.
   - Place it in the room away from the card table (212, 0, -18) and the
     craps table at the origin; the study is at (-236, 0, 12), yaw -90.
   - Reuse the fly path: a bezier from the float to the chair, the cruise
     under the craps lamp (y <= 150), then in from behind the chair.
   - Reuse `tableKit` (exported from table.mjs): the card, back ink, info
     sheet markup, phone, fmtLeft/esc/tierOf and the finishes.
   - Portrait first. A phone held upright has a horizontal FOV of about
     24 degrees at vfov 52. Lay the scene out vertically (the UI object in
     front, the centrepiece behind), use a wide lens (vfov ~64), and
     check landscape too.
   - Readable, tappable UI in 3D is a big CSS3D element: 30-34 page px per
     cm, with real buttons. Make tap targets at least ~44 px on screen from
     the chair, and give 3D targets a tap tolerance.
   - Every light the home will ever use goes in at build time, at intensity
     0. A light added later recompiles every material.
     `rollTable.programs` must hold still through the fly, any lift and
     any camera move.
   - Motion off (`fo.reduced`): cut to the chair, make camera moves cuts,
     and let nothing move on its own.
   - Controller: `seek`, lab helpers (`screenOf(id)`, `state`, `programs`),
     no-op `setFelt`/`setTrim`, and a `dispose()` that removes every window
     listener.
3. **CSS3D pitfalls** (all hit on the study):
   - CSS3D elements are always drawn over the canvas: no depth test, and
     artifacts when behind the lens. If the camera passes something
     written on, print the same layout to a canvas texture on the object,
     unlit (`MeshBasicMaterial`, `toneMapped: false`) and laid out
     identically. Show the print in flight and while the camera moves near
     it; show the CSS at rest. The handover is then invisible.
   - Setting `el.style.visibility = 'visible'` on a child shows it through
     a hidden parent. Use `''` to inherit.
   - Only handle touches whose target is inside the stage
     (`world.canvas.parentElement.contains(e.target)`), so sheets and
     modals over the home never reach it.
4. **Glass** is colour 0x000000 with a Fresnel alpha (see the dome in
   orrery.mjs). Any colour makes it a lit, milky film.
5. **Felt and trim** are the card table's alone: guard them with
   `themeTable() !== 'card'`.

## 5. Verify at phone resolution, pinched and frame by frame

Headless Chromium runs WebGL on SwiftShader, which is slow. Make these
adjustments for tests only:

- Launch with `--use-gl=angle --use-angle=swiftshader --enable-unsafe-swiftshader`
  and `executable_path='/opt/pw-browsers/chromium-1194/chrome-linux/chrome'`.
  Set `service_workers='block'` and a phone context (390x844, is_mobile,
  touch). Serve the repo with a local HTTP server and abort all other
  hosts, except Google Fonts served from a local cache.
- In an init script, stretch the app's fallback timers so the scene isn't
  abandoned: wrap `setTimeout` so 6000 and 15000 ms become 20x. Seed
  localStorage: theme, `almanac_skin_rxr_v1=done`, landing off, tour done,
  show sheet seen, email gate passed, sync off, motion on or off, and a
  deck of 7 S/A platforms from data/catalog.json with a couple collected.
- Drive homes through the lab: `?lab&dest=<home>&quality=low` at DPR 1,
  wait for `window.rollTableFly`, call `rollTableFly({ manual: true })`,
  then `rollTable.seek(t)` and your lab helpers, one screenshot each.
  Don't leave `?dest=` in the URL when testing skin switches: it pins the
  home.
- Seek CSS animations with `el.getAnimations({subtree:true})` (pause, set
  currentTime). Step WebGL moments with the module's `seek`.
- Send taps as real PointerEvents at `rollTable.screenOf(id)`, and drag
  with pointermove steps.
- Check each of these, and fix whatever looks fake:
  - the fly at 4-6 points
  - the rest frame in portrait and landscape
  - every interaction
  - the move at 0, 5, 30, 50 and 100%
  - motion off
  - `programs` steady
  - a 3x crop of each piece
  - a skin switch to and from R x R
  - the Lounge payout replayed
  - **the pinch pass.** Render at DPR 3 and take a 3× crop of every contact
    (a grip, a press, a pick-up, a rest) from the shot's own camera, at its
    start, middle and end, and of every hero surface.
    - Contact must read from the pixels, not from a collision scan: fingers
      round the object, the thumb opposed, the object itself visible.
    - Surfaces must be free of shadow acne, moiré and visible tiling. Tune
      the shadow `bias` and `normalBias`, and break up any repeat.
  - **the widest frame, for contact:** nothing floats.
  - **find what is actually drawing a defect.** When a defect doesn't move
    under the fix you expected, stop adjusting the fix. Isolate the culprit
    (hide layers one at a time, or move the camera) and fix that.
    - A room's fixed geometry (its back wall, floor, fog) is shared by every
      game in it. Hand it to a game through the `room` it receives, never as
      a magic number, and run cloth and props along a wall instead of across
      it, where the wall cuts them off.
    `[idea I10, slots r9]`
  - **the titles-off test.** Hide the overlays and look at each tier's
    deciding frames. A viewer must be able to tell which tier it is from
    the scene alone: the win, the near miss, the jackpot. If only the title
    says so, the moment isn't built yet.
    - A jackpot's light is measured, not assumed. Sample the subject's face,
      the cloth and the table before and at the peak: they must visibly
      warm and brighten, and its catchlight must read at 1×.
    - A near miss, a tooth or an edge is framed so the deciding detail
      fills a good third of the screen at 1×, and the camera holds there
      until it has read.
  - **A tight beat frames the whole mechanism.** For a deciding detail (a
    reel on its tooth, a die on its edge), the tight frame shows the whole
    window with the other parts dimmed and the deciding line heavier, so the
    eye is told where to look; a held frame after it takes in what the figure
    is looking at (the desk, the table), and the figure's eyes stay open
    through a freeze. `[idea I35, slots r19]`
  - **the last-frame test.** Look at each tier's final frame on its own. The
    outcome (what was won, how much) must read in it without the frames
    before it: light inside containers, a held glow, the pile still in view.
  - **the readability pass.**
    - The small tier caption sits on its own dark pill in gold small caps,
      the tier's name and its odds, so it reads on any backdrop and never
      as loose text. `[idea I38, slots r19]`
    - In every frame with a caption or title, check what is behind the
      letters in that exact frame: contrast, no hand or prop through them,
      and a soft backing wherever they cross gilt or mid-tones.
    - Where a close shot puts the subject inside the text's band for more than
      a beat (a drawer, a prop, a hand), hide the text through those shots,
      keyed to the camera moves, and bring it back as the lens pulls out. A
      backing plate there would hide the scene. `[idea I5, slots r9]`
    - At every close key, in portrait and in landscape, the whole subject
      sits inside the frame with margin, headwear, plumes and raised hands
      included. Fit the camera to the tallest part, not to the face, and check
      its top against the frame's top edge at 1×. `[idea I6, slots r9]`
    - The deciding element (the winning symbols, the near miss) must be the
      clearest thing in its frame at phone size: bold marks, emphasised at
      the moment of decision.
    - A mood change (a dim, a silence) grades the light, not the materials:
      a bisque face stays bisque. Drop the room and its fill, and keep a
      key on the subject (cooler, a little lower), so the subject keeps its
      value while the room goes dark around it. Check the skin's value
      before and after.

## 6. Ship

1. Run `npm run check`. Then run
   `CHROME_PATH=/opt/pw-browsers/chromium-1194/chrome-linux/chrome npm run test:smoke`,
   and again after `npm run build:site` with `SMOKE_ROOT=dist` (the
   minified build). Load the new modules in node to catch undefined
   exports.
2. Re-read the diff for trouble: leaked listeners, shared state across
   renderers, z-index regressions.
3. Commit with the session's attribution lines. Before pushing, fetch main.
   If it moved, rebase, resolve (keep both sides' precache entries) and
   bump the build past main's.
4. Open the PR through the GitHub API ($GH_TOKEN). Keep an eye on it: read
   CI, CodeRabbit and Copilot. Treat bot findings as bug reports: verify,
   fix, reply on the thread with the commit.
5. Keep updates to the user short. Send key frames as a contact sheet as
   soon as they're useful, and end with what shipped and the one decision
   that's theirs next.