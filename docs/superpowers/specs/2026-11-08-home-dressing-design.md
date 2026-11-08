# Home dressing (3D program, sub-project 2) - design

Date: 2026-11-08. Status: approved in chat, awaiting written review.
Depends on: the mesh pipeline (`2026-11-08-mesh-pipeline-design.md`): kept
meshes under `assets/intro3d/rare/meshes/`, `loadProp()` in
`assets/intro3d/props.mjs`, `check:meshes`, the lab's Meshes page.

## Intent

Put kept meshes into the homes where the procedural set dressing is weakest,
without touching anything that is lit, animated, parametric or signature.
One mechanism for every home, driven by data, so a later swap is one `keep`
command and one row. The study goes first.

Success: the study's `prepareTable` dresses itself after the fly-in from a
list; a row whose mesh is not kept yet is a wanted prop the lab shows with
its prompt and keep command; `npm run check` fails when a row names a mesh
that is not kept; leaving the home frees nothing the loader's cache shares.
With no fal credit yet, everything ships as wanted rows and the runtime is a
no-op until the first keep lands.

Decisions taken in chat: approach A (a dressing list applied after
arrival); the study first; the list below.

## Pieces

### 1. `assets/intro3d/dressing.json` - the one source of truth

Precached (it is small and under `assets/intro3d/`, not `rare/`). Shape:

```json
{
  "study": [
    { "mesh": null, "name": "study-inkstand", "at": [52, 0, 58], "yaw": 20, "height": 12,
      "prompt": "Georgian brass and cut-glass double inkstand on a rectangular tray with a pen rest and a small bell, aged brass, single object, game-ready prop",
      "note": "left back corner of the desk, by the shelves" },
    ...
  ]
}
```

- `name`: the mesh name the row is kept under (`^[a-z0-9-]+$`); `mesh` is
  that same name once kept, else `null` (a wanted row).
- `at` in the home's own frame (centimetres; the study's origin is the
  desk's near edge, +x to your LEFT, +z away), `yaw` in degrees about y,
  `height` in centimetres: the prop is scaled so its bounding box is this
  tall, which also turns the kept metres into the scene's centimetres.
- `prompt`: under 200 characters, one object, how the Wish Room should ask.
- optional `hides`: a tag; the home sets `userData.dressTag` on a procedural
  stand-in group, and when every row with that tag has loaded, the stand-in
  is hidden. (The study's shelves tag their instanced books `books`.)
- optional `shadow: false` for a prop that should not cast.

### 2. `assets/intro3d/dressing.mjs` - the loader (shipped, small)

```js
export async function loadDressing()                // fetches and caches dressing.json
export function dress(seat, home, opts = {})       // -> { ready: Promise<void>, dispose() }
export function fitHeight(group, heightCm)          // scales a seated group so its box is heightCm tall
```

- `dress()` returns at once; `ready` resolves when every kept row has
  loaded or failed. For each row with `mesh`: `loadProp(mesh)`,
  `fitHeight`, `rotation.y = yaw`, `position.set(...at)`, cast and receive
  shadows (unless `shadow: false`), `seat.add`. A failed load is one
  `console.warn` and nothing else, as the intro treats its rare extras.
- Does nothing (resolves `ready` at once) when `navigator.connection &&
  navigator.connection.saveData`, when the page's query has `dress=off`,
  or when the home has no rows.
- `hides`: counts rows per tag; when a tag's rows have all loaded, every
  object under `seat` with `userData.dressTag === tag` gets `visible =
  false`; `dispose()` sets them visible again.
- `dispose()` removes the prop groups from the seat and forgets them. It
  disposes nothing: the groups are clones sharing geometry, materials and
  textures with `props.mjs`'s cache. The home calls it before `freeTree`.

### 3. The study (`assets/intro3d/study.mjs`)

- `buildShelves`: the books' `InstancedMesh` and the bands get
  `userData.dressTag = 'books'`.
- In `fly()`, where `arrived` is set: `dressing = dress(seat, 'study')`.
- In the controller's `dispose()`: `if (dressing) dressing.dispose();` before
  `K.freeTree(seat, ...)`.
- The first list (all `mesh: null` today):

| name | at (cm) | yaw | height | prompt (one object, under 200 chars) |
|---|---|---|---|---|
| study-inkstand | [52, 0, 58] | 20 | 12 | Georgian brass and cut-glass double inkstand on a rectangular tray with a pen rest and a small bell, aged brass, single object, game-ready prop |
| study-letter-tray | [50, 0, 22] | -8 | 7 | Victorian oak and brass letter tray holding a few folded cream letters and a red wax seal, single object, game-ready prop |
| study-carriage-clock | [-58, 0, 20] | 15 | 14 | Antique brass carriage clock with a white enamel dial, bevelled glass panels and a folding top handle, polished brass, single object, game-ready prop |
| study-globe | [135, -82, 95] | -30 | 110 | Antique terrestrial globe on a turned walnut floor stand with a brass meridian ring, aged paper map, single object, game-ready prop |
| study-books-1 .. study-books-6 | one per shelf, at the shelf's middle, x 0, z 112, y the shelf's top | 0 | the shelf gap less 3 | A row of twenty antique leather-bound books with gilt-tooled spines in oxblood, bottle green and brown, standing upright as one run, single object, game-ready prop |

The book rows carry `hides: "books"`. The shelf y values come from
`buildShelves`'s own numbers (floor -82, six rows of 232 / 6 cm): row r's
top is `-82 + r * 38.67 + 2.4`; the plan writes them out.

### 4. Check and lab

- `scripts/check-meshes.js` also reads `assets/intro3d/dressing.json`
  (argument-free: the same default root; a `--dressing <file>` flag for the
  fixtures): each home is an array; each row has a `name` matching the
  pattern, `at` of three finite numbers, finite `yaw`, `height > 0`, a
  non-empty `prompt` of at most 200 characters, `mesh` null or equal to
  `name`, and a `mesh` that is non-null must be in the manifest. Output
  as before.
- `lab/meshes.mjs`: under the kept list, a "Wanted" strip per home: the
  row's name, its prompt (tap to copy) and the keep command
  `node tools/meshes/keep.mjs "<prompt>" --as <name> --height <m>` with the
  height in metres. A kept row (mesh set) is not wanted.
- `tools/meshes/keep.mjs`: after a keep, if `dressing.json` has a row whose
  `name` equals the kept name and `mesh` is null, set `mesh` to the name
  (`--no-dress` leaves it). So the loop closes in one command.

### 5. Testing

- `scripts/check-meshes.test.js`: dressing fixtures in
  `tools/meshes/fixtures/dressing/`: good (wanted rows and one kept row
  that is in the fixture manifest), unknown-mesh, bad-row (missing height,
  long prompt, `mesh` not equal to `name`).
- Browser (`dressing-browser-test.mjs` in the session scratchpad, on the
  Meshes page as a host): with a routed `dressing.json` and GLB, `dress()`
  on a bare `THREE.Group` adds the kept rows at the row's height, yaw and
  position; a wanted row adds nothing; `?dress=off` adds nothing;
  `hides` hides a tagged stand-in once its rows load and `dispose()`
  shows it again and removes the props without firing `dispose` on their
  geometry.
- `tools/meshes`: `keep` fills in a wanted row's `mesh`.
- `npm run check`; the Wish Room and Meshes browser suites still green.
- The study: a headless run of `index.html?dest=study` under software GL if
  the intro renders there, checking `dress` was called with the study's
  seat; otherwise a look on the branch preview. Documented either way.

## Out of scope

Keeping any mesh (no fal credit yet); the other homes' lists (their rows
follow the same shape and come with their own sub-projects of this one);
quality-step awareness beyond data saver; replacing anything lit or
animated.
