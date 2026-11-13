# Props: the missing 3D generations and their specifications

What still needs a generated mesh, and the contract each one must meet to drop
into the code as it stands. Everything here is read off the repo: the Wish Room
(`lab/wish.mjs`), the one generation already in use (the Rodin body,
`assets/intro3d/rodin-body.mjs`, `assets/intro3d/rare/bodies/rodin-lean.glb`),
and the cache rules in `sw.js` / AGENTS.md.

## 1. What is missing

**The Wish Room.** Thirteen wishes have a procedural model (`LIBRARY`): donut,
pizza, cake, coffee, burger, dice, plant, trophy, ball, lamp, gift, ice cream,
apple. Thirty-five more are recognised but land as an emoji token only. One of
those, the cookie, is offered as a chip on the page itself. These 35 are the
missing generations; each is a row of `lab/wish-props.mjs` with its
box from section 3, so the room already knows its size and its file name and
shows the token until the file exists.

**The scenes.** No scene prop expects a generated mesh today. The card table,
study, seance room, slaughter floor and arcade props are all built in code,
each held to a real maker in the comment above it (AGENTS.md). Nothing is
missing there unless we decide to replace one.

**The Rodin body.** One generation exists and works. Its open items (head and
face on the head's bone, the hands' grip, the feet's ankle, fitted garments,
the anatomy) are rigging work in `rodin-body.mjs`, not new generations. A
second body build would be a generation; its contract is in section 4.

## 2. The contract for a Wish Room generation

Derived from how `grantWish()` places, fits and re-skins a model. Items marked
*code* are enforced by the code; items marked *recommended* are budgets chosen
for a phone PWA with up to eight props on the table at once.

| Property | Specification | Source |
|---|---|---|
| Format | glTF 2.0 binary (`.glb`), no animations, lights, cameras or rig | *code*: `GLTFLoader` is vendored in `assets/vendor/three/three.addons.js`; lights inside a model are hidden until the final stage |
| Units | metres, +y up | *code*: the room, table (`TABLE_Y` 0.62) and every `size` are in metres |
| Origin | centre of the footprint, resting plane at y = 0 | *code*: the model is added at the holder's origin, which sits on the table top; the body file rests on y 0 the same way. The loader re-seats what it gets (base to y 0, footprint centred), so a file a little off still lands, but author it right so its own tools agree with the room |
| Facing | front toward +z | *code*: the holder is turned so its +z faces the camera |
| Size | exactly the `size` box `[w, h, d]`; a bounding box off by more than 20 % is rescaled uniformly | *code*: `fitTo()` scales when the fit factor is below 0.8 or above 1.25 |
| Footprint | width and depth at most 0.5 m; height at most 0.5 m | *recommended*: table slots (`SLOTS`) are as close as 0.63 m apart; the default unknown box is 0.26 × 0.36 × 0.26 |
| Stands | anything that cannot rest on its own gets a base: a pad, a stand, a string's weight | *recommended*: there is no physics, a floating mesh reads as a glitch |
| Material | metallic-roughness PBR with the colour in `baseColorTexture`; `emissive` only for things that glow (fire, sun) | *code*: the final stage shows the file's own material under the room's key, hemisphere and rim lights. The body export baked its colour into `emissiveTexture` with a black `baseColorFactor`, which the body loader discards; a prop would render flat and unlit |
| Transparency | opaque, except glass (`alphaMode` BLEND, opacity 0.3 to 0.6) | *code*: `setOpacity()` respects a material's own base opacity |
| Double-sided | off, except foil or paper thin enough to be seen from behind | *recommended* |
| Triangles | at most 12 k per prop, at most 2 k for a single piece of a plural (a cookie, a coin) | *recommended*: the body is 32,950 triangles / 18,040 vertices and is the whole scene; eight props at 12 k is within a phone's budget |
| Textures | one PNG, 1024² (2048² only for the slot machine) | *recommended*: the body's one PNG makes most of its 3.5 MB |
| File size | at most 1 MB per prop | *recommended* |
| Vertex attributes | `POSITION`, `NORMAL`, `TEXCOORD_0` | *code*: what the working body carries; `TANGENT` optional |
| Shadows | nothing to do: the loader sets `castShadow` and `receiveShadow` on each mesh and gives each copy its own materials | *code*: `loadGlbSource()` and `loadWish()`; a loaded GLB arrives with both off and would otherwise share one material between two copies on the table |
| Plural vs single | a wish for "cookies" gets the full box and `<file>.glb`; "a cookie" gets `<file>-one.glb` in the row's `single` box | *code*: `readWish()` sets `plural`; a row without `single` uses the one file for both; a procedural entry's single falls back to a 0.33 × 0.12 × 0.33 box |
| Location | `assets/intro3d/rare/wish/<file>.glb`, the `file` of its row in `lab/wish-props.mjs` (the first word); a wish that can be one or many has a second file, `<file>-one.glb`, for the single | *code*: `loadGlbSource()` builds the URL from the row; `rare/` is fetched on first use and skipped by the update download, and the lab is not precached, so nothing is added to `PRECACHE_URLS` until a prop ships in the app proper |
| Registration | none for the 35 below: drop the file in and the wish picks it up. A new prop is a row of `lab/wish-props.mjs` `{ file, words, emoji, size, single?, glow?, glass?, texture? }`; a procedural one is a `LIBRARY` row in `lab/wish.mjs` with a `build`; or `window.WISH_GENERATOR(text, { THREE })` resolving to `{ object }` | *code*: `finalModel()` tries the generator first, then the library (generated rows included), then the emoji token; a file missing or broken falls back to the token with a console warning |

### Checking a file

`npm run check:glb` (part of `npm run check`) holds every file in
`assets/intro3d/rare/wish/` to its row and to this sheet, and lists what is
still to make. It fails on what the room cannot take or would silently paper
over: a file no row knows, a broken container, a rig, animation, camera or
light, Draco or meshopt compression, a size outside the fit tolerance (the
room would rescale it, which hides a centimetre export), the emissive bake
over a black base, an unlit material, a texture not embedded. It warns on the
budgets, a base off y 0 or off centre, proportions far from the box, double
sided or metallic-by-default materials, and glass or glow on a row that does
not expect them; `--strict` fails on those too. `--dir=<folder>` checks a drop
folder before the files are moved in.

### Making a file

`npm run gen:prop -- <file>` (`scripts/generate-wish-prop.js`) makes one prop
end to end: it submits the row's `prompt` (`promptOne` for `<file>-one`) to
fal.ai's hosted Rodin with the box's proportions as `bbox_condition`, polls
the queue, downloads the GLB, measures it, decimates it only if the measure
says so, lints it, and with `--install` copies a clean result into
`assets/intro3d/rare/wish/`. `--from=<glb>` skips the generation and runs the
rest on a file in hand. It needs `FAL_KEY` (a fal.ai API key) and runs
gltf-transform through npx, pinned, so nothing is added to the app.

### Triangles: the waste metric and when to decimate

A generator's triangle count says nothing about whether the triangles are
needed, so the budget alone would decimate a detailed prop that earned its
count and leave a smooth one that did not. The tools measure **waste**
instead (`scripts/lib/glb-metrics.js`): the share of triangles doing no
visual work in the room. A triangle is wasted when every one of its edges is
flat, or when it is sub-pixel.

- **Flat edge.** The two faces meeting at the edge turn so little that the
  turn cannot be seen at the room's closest zoom: under 3 degrees, or with a
  sagitta (edge length x turn / 4, how far the surface bends off a straight
  run) under half a pixel. The pixel is 1 mm: a 42 degree camera no nearer
  than 2.2 m on a phone 1600 device pixels tall. A 2 cm edge turning 2
  degrees and a 1 cm edge turning 10 are both flat; a 5 cm edge turning 5 is
  not. A boundary or non-manifold edge is never flat: it is a silhouette or a
  seam. Seam-split vertices are merged by position first, so a UV seam counts
  as the one edge it is.
- **Sub-pixel.** The longest edge is under 1 mm.

The verdict against the row's budget (12k a prop, 2k a single):

| Count | Waste | Verdict |
|---|---|---|
| at or under budget | any | **keep**: never touched |
| over budget | 25 % or more | **decimate**: to the budget, or as far as the waste reaches |
| over budget | under 25 % | **efficient**: left as it is and reported; regenerate at a lower quality or raise the row's budget |

`check:glb` prints the metric and the verdict for every file. `gen:prop`
acts on it: `--decimate=auto` (the default) follows the verdict, `always`
takes a file over budget down to the budget whatever its waste, `never`
leaves every file as generated. Decimation is gltf-transform's `weld` then
`simplify` (meshoptimizer), with the error bound at 0.2 % of the mesh's
extent, so it stops short of the target rather than change the look.

## 3. The 35 missing generations

Sizes are `[w, h, d]` in metres, chosen to read from the room's camera the way
the existing library does (an apple at 0.22, a burger at 0.33: toy scale, about
two to three times life, never over the 0.5 cap). Facing is the side turned to
+z. P marks a wish whose default is plural, with the single box after it.

### Food and drink

| Wish | Emoji | Box | Notes |
|---|---|---|---|
| cookie, cookies, biscuit | 🍪 | P 0.36 × 0.08 × 0.36; single 0.18 × 0.03 × 0.18 | a plate of five, chips in relief; the single lies flat, face up |
| taco | 🌮 | 0.32 × 0.18 × 0.14 | lying on its fold, the open edge up, filling toward +z |
| fries | 🍟 | 0.24 × 0.32 × 0.16 | a carton standing, fries fanned, the carton's face to +z |
| hotdog | 🌭 | 0.38 × 0.12 × 0.14 | lying along x, mustard line on top |
| sushi | 🍣 | P 0.40 × 0.10 × 0.26; single 0.12 × 0.07 × 0.08 | a board with six pieces in two rows; the single is one nigiri |
| beer | 🍺 | 0.20 × 0.34 × 0.20 | a mug, handle to +x, foam over the rim; glass as BLEND |
| wine | 🍷 | 0.14 × 0.38 × 0.14 | stemmed glass, red; stem at least 8 mm thick to read |
| cocktail | 🍸 | 0.18 × 0.34 × 0.18 | coupe, a garnish on the rim toward +z |
| banana | 🍌 | 0.36 × 0.10 × 0.10 | lying along x, curve up |
| cherry | 🍒 | 0.20 × 0.20 × 0.12 | a pair joined at the stems, stems up |
| popcorn | 🍿 | 0.26 × 0.36 × 0.26 | striped box, heaped above the rim |
| candy | 🍬 | P 0.34 × 0.10 × 0.34; single 0.14 × 0.06 × 0.08 | wrapped twists scattered; the single lies along x |
| chocolate | 🍫 | 0.30 × 0.04 × 0.16 | a bar lying flat, segments up, foil peeled back at +x |

### Casino and treasure

| Wish | Emoji | Box | Notes |
|---|---|---|---|
| money | 💰 | 0.32 × 0.36 × 0.28 | a tied sack, a few coins spilled at its foot toward +z |
| cash | 💵 | 0.30 × 0.12 × 0.16 | a banded stack of notes, lying flat |
| coin | 🪙 | P 0.34 × 0.08 × 0.34; single 0.16 × 0.02 × 0.16 | a loose pile; the single lies flat, face up |
| chips | 🪙 | 0.34 × 0.16 × 0.30 | three stacks of casino chips, different heights; generic colours, not the table's float |
| diamond | 💎 | 0.22 × 0.20 × 0.22 | cushion brilliant resting on a small velvet pad, table up; glass as BLEND |
| crown | 👑 | 0.30 × 0.24 × 0.30 | gold, five points, jewels, velvet cap inside |
| slot | 🎰 | 0.30 × 0.45 × 0.22 | tabletop slot machine, reels to +z, lever on +x; the one 2048² texture |
| cards | 🃏 | 0.34 × 0.06 × 0.26 | a deck and a fanned hand, faces up, the fan opening toward +z |
| clover | 🍀 | 0.28 × 0.04 × 0.28 | four-leaf, lying flat, stem toward -z |

### Creatures

| Wish | Emoji | Box | Notes |
|---|---|---|---|
| cat | 🐈 | 0.26 × 0.38 × 0.36 | sitting, facing +z, tail round the feet |
| dog | 🐕 | 0.30 × 0.42 × 0.44 | sitting, facing +z |
| skull | 💀 | 0.22 × 0.26 × 0.28 | human, jaw on, facing +z; a realistic one, not the valley's woodcut (`buildSkull`) |
| bone | 🦴 | 0.40 × 0.10 × 0.12 | a femur lying along x |

### Symbols

| Wish | Emoji | Box | Notes |
|---|---|---|---|
| star | ⭐ | 0.30 × 0.30 × 0.08 | five points, extruded, gold, standing on two points, face to +z |
| heart | ❤️ | 0.28 × 0.26 × 0.14 | red, glossy, standing, face to +z |
| fire | 🔥 | 0.26 × 0.40 × 0.26 | a brazier bowl with three solid tongues of flame; emissive allowed |
| moon | 🌙 | 0.30 × 0.32 × 0.08 | a crescent on a small base, face to +z |
| sun | ☀️ | 0.36 × 0.36 × 0.08 | a disc with rays on a stand, face to +z; emissive allowed |
| balloon | 🎈 | 0.24 × 0.50 × 0.24 | on a string tied to a small weight at y 0 |

### Vehicles and things

| Wish | Emoji | Box | Notes |
|---|---|---|---|
| rocket | 🚀 | 0.22 × 0.50 × 0.22 | standing on its fins, nose up, porthole to +z |
| guitar | 🎸 | 0.50 × 0.08 × 0.20 | electric, lying on its back along x, headstock to -x, strings up |
| car | 🚗 | 0.46 × 0.18 × 0.22 | a toy car, length along x, nose to +x, side to the camera |

## 4. The contract for a Rodin body

Only if another build of the man is wanted. Read off `rodin-body.mjs` and the
file that works (`rodin-lean.glb`, 18,040 vertices, 32,950 triangles, one
PNG, 3.5 MB, re-exported through Blender's glTF I/O).

| Property | Specification |
|---|---|
| Format | `.glb`, one unrigged mesh, one material, `POSITION` / `NORMAL` / `TEXCOORD_0` |
| Units and frame | metres; feet on y 0; 1.80 m tall; centred on x and z; facing +z (the loader turns it to the lab's -z and scales to cm) |
| Pose | A-pose, arms hanging out from the body; the loader lays them down |
| Clothing | shorts are fine: the front of the pelvis is drawn back to a plain surface for the anatomy |
| Material | ignored; the loader puts the lab's own flesh plate on it, so the emissive bake does no harm here |
| Landmarks | re-measure `LM` for the new mesh: knee, hip, shoulder, top; the +x arm's S, E, W, H; head, torso and leg seed boxes. A fit from the mesh is listed as the next step |
| Build | set `RODIN_BUILD` (height, mass, muscle, age) to the man the mesh is closest to |

## 5. Not generations

Open items that look like missing props but are code work: the Rodin body's
head and face on its own bone, hands' grip and feet's ankle, garments fitted to
it, its anatomy; and `WISH_GENERATOR` itself (the text-to-visual generator the
Wish Room is written to call), which is the pipeline that would produce the 35
above.
