# Mesh pipeline (3D program, sub-project 1) - design

Date: 2026-11-08. Status: approved in chat, awaiting written review.
Depends on: the Wish Room generator (`2026-11-08-wish-3d-generator-design.md`),
which puts generated GLBs in the `wish-models` bucket.

## Intent

Generated meshes are cheap now. What is missing is the road from "a draft in
the bucket" to "an asset a scene can load on a phone": a size budget, an
optimise step, a place in the repo, a record of what each asset is, a page to
look at them, and a check that keeps every later swap honest. This is the
tooling every later sub-project (props in the homes, hero objects, new
Showrooms, figures) stands on. It changes no scene.

Success: `node tools/meshes/keep.mjs <prompt|url|file> --as <name>` turns a
draft into `assets/intro3d/rare/meshes/<name>.glb` under budget with a
manifest row; `npm run check` fails when a kept mesh breaks the rules;
`lab/meshes.html` shows kept meshes and bucket drafts on a turntable; and
the bundled Rodin body goes through the whole road as the first kept mesh,
with no paid generation needed.

Decisions taken in chat: drafts stay in the bucket at full quality, what
ships is committed in the repo ("both"); approach A, a Node tool run in a
session, not the edge function and not a browser-only tool.

## Measurements the design rests on

The bundled `rodin-lean.glb` (3.5 MB, 33k triangles, one 2048 px PNG) through
gltf-transform 4.5.1: simplify to a quarter of the triangles 2.97 MB, textures
to 1024 px 1.65 MB, meshopt 1.50 MB, WebP 167 KB. Textures are the weight;
WebP is the win. The vendored three.js r186 GLTFLoader reads
`EXT_texture_webp` with nothing added, while meshopt and Draco would each need
a decoder vendored for a small further gain. So: no meshopt, no Draco, no
KTX2 in this sub-project; the check refuses files that require them.

## Pieces

### 1. `tools/meshes/` - the keep tool (dev only, not shipped)

Own `package.json` (as `tools/skin-codegen/`): `@gltf-transform/core`,
`@gltf-transform/extensions`, `@gltf-transform/functions`, `meshoptimizer`
(the simplifier), `sharp` (texture resize and WebP). `build:site` already
skips `tools/`.

`keep.mjs <source> --as <name> [--tris N] [--tex PX] [--bytes N] [--height M] [--model ID]`

- `source`: a local path; an `https://` URL; or anything else, read as a
  prompt and resolved to the bucket's public URL by the function's own rule
  (`normaliseKey` -> `key = norm|model` -> sha256 hex -> `<model slug>/<hex>.glb`
  under `https://<project>.supabase.co/storage/v1/object/public/wish-models/`).
  `fal.ts` stays the source of truth; `tools/meshes/bucket.mjs` carries a
  JavaScript copy of the three functions and a test pins it to the same
  vectors `fal_test.ts` uses.
- Optimise, in order: `dedup`, `prune`, `weld`, `simplify` to the triangle
  budget (ratio = budget / current, error 0.001; skipped when already under),
  `textureCompress` to WebP at the texture cap (quality 80), `center` with
  the base on y = 0, scale so the bounding box is `--height` metres tall when
  given, `prune` again.
- Default budget: 12,000 triangles, 1,024 px textures, 1,000,000 bytes.
  Flags raise it per mesh; a global ceiling of 3,000,000 bytes is never
  raised.
- Writes `assets/intro3d/rare/meshes/<name>.glb` and upserts the row in
  `assets/intro3d/rare/meshes/manifest.json` (an array sorted by name).
  Refuses to overwrite a kept mesh unless `--force`. Prints a one-line
  summary: triangles before/after, textures, bytes, budget.
- `name` is `[a-z0-9-]+`.

### 2. Manifest row

```json
{
  "name": "sample-body",
  "prompt": "bundled Rodin lean body",
  "model": "fal-ai/hyper3d/rodin",
  "source": "assets/intro3d/rare/bodies/rodin-lean.glb",
  "seed": null,
  "triangles": 8200,
  "textures": [{ "slot": "emissiveTexture", "size": 1024 }],
  "bytes": 166740,
  "budget": { "tris": 12000, "tex": 1024, "bytes": 1000000 },
  "height": 1.8,
  "kept": "2026-11-08"
}
```

`prompt` is as typed (or a note for a local source), `source` the URL or
path it came from, `seed` from `wish_models` when known, else null.

### 3. `scripts/check-meshes.js` - in the `npm run check` chain

No dependencies. For every `.glb` in `assets/intro3d/rare/meshes/`:

- it has a manifest row and the row's `bytes` matches the file;
- the GLB header is valid (magic, version 2, JSON chunk);
- `extensionsRequired` contains none of `KHR_draco_mesh_compression`,
  `EXT_meshopt_compression`, `KHR_texture_basisu`;
- every image is `image/webp` and its width and height (from the WebP
  header in the BIN chunk) are at most the row's `budget.tex`;
- triangles (sum over primitives of indices count / 3, or positions / 3
  when unindexed, from the accessors) are at most `budget.tris`;
- bytes are at most `budget.bytes` and at most 3,000,000.

And every manifest row names a file that exists. Output and exit code in
the style of `check-references.js`. `package.json` gets `check:meshes` and
the `check` chain includes it.

### 4. `assets/intro3d/props.mjs` - the runtime loader (shipped, tiny)

```js
export function seatOnBase(object)      // moved here from lab/wish-generator.mjs
export function loadProp(name)          // -> Promise<THREE.Group>, seated
export function propUrl(name)           // './rare/meshes/<name>.glb' from this module
```

`loadProp` loads each name once (a cached promise of the parsed scene) and
returns a fresh seated `Group` wrapping a `clone()` per call, so a scene can
place the same prop twice. It does not consult the manifest at runtime; the
manifest is a dev-time record. Scenes adopt it in sub-project 2; in this one
only the lab page and the Wish Room use it. `wish-generator.mjs` imports
`seatOnBase` from here.

### 5. `lab/meshes.html` + `lab/meshes.mjs` - the turntable

The Wish Room's room, lights and camera (its scene code is reused by
import where it is exported, otherwise copied minimally). A list of kept
meshes from `manifest.json` with name, triangles, bytes and height; tap one
to put it on the table, turning slowly. A text box takes a prompt or URL
and previews the bucket draft (resolved by the same rule as the tool, in
the browser) so a draft can be judged before it is kept, with its raw
triangle count and bytes shown. No gate: both sources are public. A link
to it in the lab bar beside Wish.

### 6. First kept mesh

`node tools/meshes/keep.mjs assets/intro3d/rare/bodies/rodin-lean.glb --as sample-body --height 1.8`
is run once and its output committed. It proves the road end to end and
gives the lab page something to show. `rodin-body.mjs` keeps loading the
original; the rigger wants the full mesh.

## Testing

- `tools/meshes/*.test.mjs` with `node --test`: bucket-rule parity with
  `fal_test.ts`'s vectors; budget math (ratio, skip-when-under, ceiling);
  a synthetic GLB (a textured cube built with gltf-transform in the test)
  through `optimise()` comes out under budget, WebP, based on y = 0, at the
  asked height.
- `scripts/check-meshes.js` against fixtures in `tools/meshes/fixtures/`:
  one good file, one over its triangle budget, one requiring Draco, one
  missing from the manifest. The script takes a directory argument so the
  fixtures can be checked without touching the real folder.
- Playwright: `lab/meshes.html` lists the manifest and puts `sample-body`
  on the table with no console errors.
- `npm run check` passes with `check:meshes` in the chain.

## Out of scope

Swapping any prop in any scene; quality-step awareness in `loadProp`;
meshopt, Draco or KTX2; a Rodin v2 default (a one-line env change,
decided per generation); figures and rigging.
