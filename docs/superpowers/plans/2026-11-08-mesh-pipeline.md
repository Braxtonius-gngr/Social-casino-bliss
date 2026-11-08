# Mesh Pipeline Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** A generated or local GLB becomes a budgeted, WebP-textured, centred, scaled asset under `assets/intro3d/rare/meshes/` with a manifest row, a check that fails the build when a kept mesh breaks the rules, a runtime loader, and a lab turntable; the bundled Rodin body is the first kept mesh.

**Architecture:** A dev-only Node tool (`tools/meshes/`, gltf-transform) does the optimising and writes the manifest. A dependency-free check script reads GLB headers and enforces the manifest's budgets in `npm run check`. A tiny shipped module `assets/intro3d/props.mjs` loads kept meshes at runtime; `lab/meshes.html` previews kept meshes and bucket drafts.

**Tech Stack:** Node 22 (`node --test`), `@gltf-transform/core|extensions|functions` 4.x, `meshoptimizer` (simplifier), `sharp` (WebP), vendored three.js r186 (GLTFLoader with `EXT_texture_webp`), Playwright for the lab page.

**Spec:** `docs/superpowers/specs/2026-11-08-mesh-pipeline-design.md`

## Global Constraints

- Build-free static PWA; nothing under `tools/` ships; no new runtime dependency; three.js stays as vendored (no meshopt, Draco or KTX2 decoders).
- Two-space indentation, semicolons, repo voice in comments.
- Defaults: 12,000 triangles, 1,024 px textures, 1,000,000 bytes; global ceiling 3,000,000 bytes, never raised. WebP quality 80. Simplify error 0.001.
- Mesh names match `^[a-z0-9-]+$`. Kept files live at `assets/intro3d/rare/meshes/<name>.glb`; the manifest is `assets/intro3d/rare/meshes/manifest.json`, an array sorted by `name`.
- Bucket rule mirrors `supabase/functions/wish-3d/fal.ts`: `normaliseKey` (lowercase, trim, collapse whitespace, strip trailing `.!?,;:`), `key = norm + "|" + model`, sha256 hex, `path = model.replace(/\//g, "-") + "/" + hex + ".glb"`, public URL `https://ewfvyrhlsanzkmozrmhs.supabase.co/storage/v1/object/public/wish-models/<path>`. Default model `fal-ai/hyper3d/rodin`.
- Forbidden in kept files: `KHR_draco_mesh_compression`, `EXT_meshopt_compression`, `KHR_texture_basisu` in `extensionsRequired`; any image whose `mimeType` is not `image/webp`.
- `npm run check` passes before finishing, with `check:meshes` in the chain.

## Review Focus

- A source GLB already under every budget must come out unchanged in triangle count (simplify skipped), not re-decimated. Test in Task 2.
- A source with no textures at all (Rodin "Shaded" exports can lack maps) must keep without error and record `textures: []`. Test in Task 2.
- A WebP in a kept file may be lossless (`VP8L`) or extended (`VP8X`) as well as lossy (`VP8 `); the check must read all three headers. Test in Task 3.
- `loadProp` called twice for the same name must return two independent groups (moving one must not move the other). Test in Task 4.
- The lab page must render with an empty manifest (a fresh clone before any mesh is kept) without errors. Test in Task 4.

---

### Task 1: tool scaffold and the bucket rule

**Files:**
- Create: `tools/meshes/package.json`, `tools/meshes/README.md`, `tools/meshes/bucket.mjs`, `tools/meshes/bucket.test.mjs`
- Create: `tools/meshes/.gitignore` (`node_modules/`)

**Interfaces:**
- Produces: `normaliseKey(prompt): string`, `cacheKey(prompt, model): string`, `objectPath(model, key): Promise<string>`, `bucketUrl(prompt, model = DEFAULT_MODEL): Promise<string>`, `DEFAULT_MODEL`, `BUCKET_BASE = "https://ewfvyrhlsanzkmozrmhs.supabase.co/storage/v1/object/public/wish-models/"`, `resolveSource(arg, model): Promise<{ kind: "file" | "url" | "prompt", url?: string, path?: string }>` (a path that exists on disk -> file; `https://` -> url; else prompt -> url via `bucketUrl`).

- [ ] **Step 1: package.json and the failing test**

`package.json`: `{ "name": "meshes", "private": true, "type": "module", "scripts": { "test": "node --test" }, "dependencies": { "@gltf-transform/core": "^4.5.1", "@gltf-transform/extensions": "^4.5.1", "@gltf-transform/functions": "^4.5.1", "meshoptimizer": "^0.22.0", "sharp": "^0.33.5" } }`. Run `npm install` in `tools/meshes`.

```js
// bucket.test.mjs
import test from 'node:test'; import assert from 'node:assert/strict';
import { normaliseKey, cacheKey, objectPath, bucketUrl, resolveSource, DEFAULT_MODEL, BUCKET_BASE } from './bucket.mjs';
test('normalise and key match fal.ts', () => {
  assert.equal(normaliseKey('  A  Birthday   CAKE!! '), 'a birthday cake');
  assert.equal(cacheKey('Pizza', DEFAULT_MODEL), 'pizza|fal-ai/hyper3d/rodin');
});
test('objectPath is the model slug over the sha256 of the key', async () => {
  const key = 'pizza|fal-ai/hyper3d/rodin';
  const hex = (await import('node:crypto')).createHash('sha256').update(key).digest('hex');
  assert.equal(await objectPath(DEFAULT_MODEL, key), `fal-ai-hyper3d-rodin/${hex}.glb`);
  assert.equal(await bucketUrl('Pizza'), BUCKET_BASE + `fal-ai-hyper3d-rodin/${hex}.glb`);
});
test('resolveSource tells a file, a url and a prompt apart', async () => {
  assert.equal((await resolveSource('https://x/y.glb', DEFAULT_MODEL)).kind, 'url');
  assert.equal((await resolveSource('./bucket.mjs', DEFAULT_MODEL)).kind, 'file');
  assert.equal((await resolveSource('a trophy', DEFAULT_MODEL)).kind, 'prompt');
});
```

- [ ] **Step 2: Run to verify it fails**

Run: `cd tools/meshes && npm test`
Expected: FAIL, cannot find module `./bucket.mjs`.

- [ ] **Step 3: Implement `bucket.mjs`**

Pure functions as listed; `objectPath` with `crypto.subtle.digest`. A comment at the top says it mirrors `fal.ts` and the test pins them together.

- [ ] **Step 4: Run to verify it passes**

Run: `cd tools/meshes && npm test`
Expected: 3 passed.

- [ ] **Step 5: README and commit**

`README.md`: what the tool is, that it is dev-only, the commands (`npm install`, `npm test`, `node tools/meshes/keep.mjs ...` from the repo root), the budgets, and that drafts stay in the bucket while kept meshes are committed.

```bash
git add tools/meshes/package.json tools/meshes/package-lock.json tools/meshes/.gitignore tools/meshes/README.md tools/meshes/bucket.mjs tools/meshes/bucket.test.mjs
git commit -m "meshes: tool scaffold and the bucket rule, pinned to fal.ts's vectors"
```

---

### Task 2: optimise and keep

**Files:**
- Create: `tools/meshes/optimise.mjs`, `tools/meshes/optimise.test.mjs`, `tools/meshes/keep.mjs`, `tools/meshes/testlib.mjs`

**Interfaces:**
- Consumes: Task 1's `resolveSource`, `DEFAULT_MODEL`.
- Produces:
  - `DEFAULT_BUDGET = { tris: 12000, tex: 1024, bytes: 1_000_000 }`, `CEILING_BYTES = 3_000_000`
  - `simplifyRatio(current, budget): number | null` - `null` when `current <= budget`, else `budget / current`
  - `optimise(document, { budget, height }): Promise<{ document, stats }>` where `stats = { trianglesBefore, triangles, textures: [{ slot, size }], height }`; steps in the spec's order: dedup, prune, weld, simplify (when ratio), textureCompress to WebP at `budget.tex`, center pivot `below`, scale to `height` metres when given (bake with `transformMesh`), prune
  - `readStats(document): { triangles, textures }` (used by keep and by the lab-draft inspector)
  - `keep({ source, name, budget, height, model, force, root })` in `keep.mjs`: resolves the source, reads with `NodeIO` + `ALL_EXTENSIONS` (fetching a URL to a buffer first), optimises, writes the GLB, refuses if `bytes > min(budget.bytes, CEILING_BYTES)`, upserts the manifest row (sorted by name), prints the summary line; CLI: `node tools/meshes/keep.mjs <source> --as <name> [--tris N] [--tex PX] [--bytes N] [--height M] [--model ID] [--force]`
  - `testlib.mjs`: `makeTexturedCube({ size = 2, texPx = 2048, format = 'png' })` builds a Document with one cube mesh (12 triangles, indexed) and a `baseColorTexture` of `texPx` square; `makeManyTriangles(n)` a mesh of n triangles with no texture

- [ ] **Step 1: Write the failing tests**

```js
test('simplifyRatio skips when already under budget', () => { assert.equal(simplifyRatio(8000, 12000), null); assert.equal(simplifyRatio(24000, 12000), 0.5); });
test('a cube already under budget keeps its 12 triangles, gets a 1024 WebP, sits on y=0 at the asked height', async () => {
  const { document, stats } = await optimise(makeTexturedCube({ texPx: 2048 }), { budget: DEFAULT_BUDGET, height: 0.5 });
  assert.equal(stats.triangles, 12); assert.equal(stats.trianglesBefore, 12);
  assert.deepEqual(stats.textures, [{ slot: 'baseColorTexture', size: 1024 }]);
  const tex = document.getRoot().listTextures()[0]; assert.equal(tex.getMimeType(), 'image/webp');
  const b = bounds(document); assert.ok(Math.abs(b.min[1]) < 1e-6); assert.ok(Math.abs((b.max[1] - b.min[1]) - 0.5) < 1e-6);
});
test('a mesh over the triangle budget is simplified under it', async () => {
  const { stats } = await optimise(makeManyTriangles(30000), { budget: { ...DEFAULT_BUDGET, tris: 12000 } });
  assert.ok(stats.triangles <= 12000 && stats.triangles > 1000, String(stats.triangles));
});
test('a mesh with no textures keeps with textures: []', async () => {
  const { stats } = await optimise(makeManyTriangles(100), { budget: DEFAULT_BUDGET }); assert.deepEqual(stats.textures, []);
});
test('keep writes the file and the manifest row, and refuses a second keep without --force', async () => { /* tmp root dir; keep(...) twice; read manifest; assert row fields and the thrown message */ });
```

(`bounds(document)` is a helper in `testlib.mjs` using `getBounds` from `@gltf-transform/core` on the default scene.)

- [ ] **Step 2: Run to verify they fail**

Run: `cd tools/meshes && npm test`
Expected: FAIL, modules missing.

- [ ] **Step 3: Implement `testlib.mjs`, `optimise.mjs`, `keep.mjs`**

`makeManyTriangles` lays n triangles on a grid so `weld`/`simplify` have real adjacency (a plane of (k x k) quads, two triangles each). `simplify` uses `MeshoptSimplifier` from `meshoptimizer` (`await MeshoptSimplifier.ready`). `textureCompress({ encoder: sharp, targetFormat: 'webp', resize: [tex, tex], quality: 80 })`. Scale: compute bounds, factor `height / (max.y - min.y)`, `transformMesh(mesh, scaleMatrix)` per mesh, then `center` again. `keep.mjs` parses argv by hand (no dependency), `root` defaults to the repo root (two levels up).

- [ ] **Step 4: Run to verify they pass**

Run: `cd tools/meshes && npm test`
Expected: all passed (Task 1's 3 plus these 5).

- [ ] **Step 5: Commit**

```bash
git add tools/meshes/optimise.mjs tools/meshes/optimise.test.mjs tools/meshes/keep.mjs tools/meshes/testlib.mjs
git commit -m "meshes: optimise to budget and keep with a manifest row"
```

---

### Task 3: the check script

**Files:**
- Create: `scripts/check-meshes.js`, `tools/meshes/fixtures/build-fixtures.mjs`, `tools/meshes/fixtures/<case>/...` (committed outputs), `scripts/check-meshes.test.js`
- Modify: `package.json` (`check:meshes` script; `check` chain)

**Interfaces:**
- Consumes: the manifest row shape; Task 2's `testlib.mjs` to build fixtures.
- Produces: `node scripts/check-meshes.js [dir]` exits 0 with `OK` lines or 1 with `FAIL` lines; exports (when required as a module) `readGlb(buffer): { json, bin }`, `triangleCount(json)`, `imageSizes(json, bin): [{ index, mimeType, width, height }]`, `webpSize(bytes): { width, height } | null` (VP8, VP8L, VP8X), `checkDir(dir): { problems: string[], checked: number }`.

- [ ] **Step 1: Build the fixtures and write the failing tests**

`build-fixtures.mjs` (run once, outputs committed, each a folder with `manifest.json` and GLBs): `good/` (a cube, 64 px lossy WebP, row budget default); `over-tris/` (a 30,000-triangle plane with a row budget of `tris: 12000`); `draco/` (the good cube's JSON with `extensionsRequired: ["KHR_draco_mesh_compression"]` spliced in); `png/` (the cube with a PNG texture); `orphan/` (the good cube plus a second `.glb` with no manifest row); `missing/` (a manifest row naming a file that does not exist); `lossless/` (a cube with a `VP8L` WebP, under budget, must pass); `extended/` (a cube with a `VP8X` WebP, under budget, must pass).

```js
// scripts/check-meshes.test.js (node:test, CommonJS)
const { checkDir, webpSize } = require('./check-meshes.js');
test('good, lossless and extended fixtures pass', ...)                      // problems.length === 0 for each
test('over-tris names the triangle budget', ...)                           // /triangles/ in problems[0]
test('draco is refused as unreadable by the vendored loader', ...)
test('png is refused', ...)
test('an orphan file and a missing file are both reported', ...)
test('webpSize reads VP8, VP8L and VP8X headers', ...)                      // against bytes from the fixtures
```

- [ ] **Step 2: Run to verify it fails**

Run: `node --test scripts/check-meshes.test.js`
Expected: FAIL, cannot find `./check-meshes.js`.

- [ ] **Step 3: Implement `scripts/check-meshes.js`**

GLB: magic `0x46546C67`, version 2, chunk 0 JSON (`0x4E4F534A`), chunk 1 BIN (`0x004E4942`). Triangles: per primitive with `mode` 4 or absent, `indices ? accessors[indices].count / 3 : accessors[attributes.POSITION].count / 3`. Images: `images[i].bufferView` -> slice of BIN. WebP: `RIFF....WEBP`, then `VP8 ` (width/height 14 bits at offsets 26 and 28, little-endian, masked `0x3fff`), `VP8L` (offset 21: `1 + (bits & 0x3fff)` wide, `1 + ((bits >> 14) & 0x3fff)` high from a 32-bit LE read), `VP8X` (24-bit LE at 24 and 27, each plus 1). Default dir `assets/intro3d/rare/meshes`; a missing dir with no manifest is `OK (no meshes yet)`. Style of output as `check-references.js`.

- [ ] **Step 4: Run to verify it passes, then wire it in**

Run: `node --test scripts/check-meshes.test.js` -> all passed. Add `"check:meshes": "node scripts/check-meshes.js"` and append `&& npm run check:meshes` to `check` in `package.json`. Run `npm run check` -> passes (prints `OK (no meshes yet)`).

- [ ] **Step 5: Commit**

```bash
git add scripts/check-meshes.js scripts/check-meshes.test.js tools/meshes/fixtures package.json
git commit -m "check:meshes - budgets, manifest and loader compatibility of kept meshes"
```

---

### Task 4: runtime loader and the lab turntable

**Files:**
- Create: `assets/intro3d/props.mjs`, `lab/meshes.html`, `lab/meshes.mjs`
- Modify: `lab/wish-generator.mjs` (import `seatOnBase` from `../assets/intro3d/props.mjs`, delete its local copy), `lab/anatomy.html` (a `Meshes` link beside `Wish`)
- Test: the browser suite in the session scratchpad (extend `wish-browser-test.mjs` or a sibling `meshes-browser-test.mjs`)

**Interfaces:**
- Produces: `seatOnBase(object): THREE.Group`, `propUrl(name): string`, `loadProp(name): Promise<THREE.Group>` (cached parse per name, fresh `clone()` per call, seated).
- `lab/meshes.mjs`: reads `../assets/intro3d/rare/meshes/manifest.json`; a list of kept meshes (name, triangles, bytes, height); tapping one calls `loadProp(name)` and puts it on the table, turning; a text box for a prompt or URL resolves a draft URL in the browser with the same rule (`normaliseKey`, sha256 via `crypto.subtle`), loads it with `GLTFLoader`, seats it, and shows raw triangle count and bytes from the fetched `ArrayBuffer`; the room is a small standalone scene (hemisphere + key + fill lights, a round table, drag to orbit) in the Wish Room's palette.

- [ ] **Step 1: Write the failing browser tests**

Against a static server on the repo root: (H1) `lab/meshes.html` loads with the real manifest (empty at this point) and no console errors, the list says "No meshes kept yet"; (H2) with `page.route` serving a fake manifest naming `sample-body` and the GLB route serving `rodin-lean.glb`, tapping the row puts a mesh on the table (`window.__meshes.current` is an Object3D with a mesh in it); (H3) `loadProp` twice yields two groups whose children differ in identity; moving one leaves the other; (H4) the Wish Room suite still passes 22/22 with `seatOnBase` imported from `props.mjs`.

- [ ] **Step 2: Run to verify they fail**

Expected: H1 404 on `lab/meshes.html`; H3 import failure on `props.mjs`.

- [ ] **Step 3: Implement**

`props.mjs` ~40 lines; `lab/meshes.mjs` ~150 lines; `lab/meshes.html` modelled on `wish.html`'s bar and status styles; `window.__meshes = { current, show(name), preview(src) }` for the lab and the test.

- [ ] **Step 4: Run to verify they pass**

Run both browser suites. Expected: all green. Run `node scripts/check-syntax.js` and `node scripts/check-references.js`. Expected: OK.

- [ ] **Step 5: Commit**

```bash
git add assets/intro3d/props.mjs lab/meshes.html lab/meshes.mjs lab/wish-generator.mjs lab/anatomy.html
git commit -m "props.mjs runtime loader; lab turntable for kept meshes and bucket drafts"
```

---

### Task 5: first kept mesh, docs, final checks

**Files:**
- Create (by the tool): `assets/intro3d/rare/meshes/sample-body.glb`, `assets/intro3d/rare/meshes/manifest.json`
- Modify: `AGENTS.md` (a bullet after the Wish Room's), `tools/meshes/README.md` if anything changed

- [ ] **Step 1: Keep the sample**

Run: `node tools/meshes/keep.mjs assets/intro3d/rare/bodies/rodin-lean.glb --as sample-body --height 1.8`
Expected: a summary line with triangles 33k -> about 8-12k, one 1024 WebP, bytes well under 1,000,000; the two files written.

- [ ] **Step 2: Check and look**

Run: `npm run check` -> `check:meshes` reports 1 mesh OK. Open `lab/meshes.html` in headless Chromium against the real manifest, tap `sample-body`, screenshot for a human look (`deviceScaleFactor: 2`).

- [ ] **Step 3: Document and commit**

AGENTS.md bullet: the pipeline in three sentences (drafts in the bucket, `keep` to the repo under budget, `check:meshes`, `props.mjs`, the lab page), and that meshopt/Draco/KTX2 are deliberately not used so three.js stays as vendored.

```bash
git add assets/intro3d/rare/meshes AGENTS.md tools/meshes/README.md
git commit -m "meshes: sample-body, the first kept mesh; AGENTS on the pipeline"
```

- [ ] **Step 4: Push and update PR #268**

`git push origin ccr-b9a9c7b5-peyogk-meshes`; update the PR body from "spec only" to what shipped and how it was verified.
