# Home Dressing Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** The study dresses itself after the fly-in from `assets/intro3d/dressing.json`; wanted rows show in the lab with their prompt and keep command; `check:meshes` validates the rows; `keep` fills a wanted row in; nothing shared with the loader's cache is disposed on leaving.

**Architecture:** One precached JSON holds per-home rows. A small shipped module `dressing.mjs` loads kept rows through `props.mjs` after arrival, fits each to the row's height (metres to the scene's centimetres), and unhooks them before the home frees its set. The study tags its instanced books so kept book runs can hide them. The check script and the lab read the same JSON; `keep.mjs` updates it.

**Tech Stack:** Vendored three.js r186, classic ES modules, Node 22 (`node:test`), Playwright.

**Spec:** `docs/superpowers/specs/2026-11-08-home-dressing-design.md`

## Global Constraints

- Build-free static PWA; no new runtime dependency; two-space indentation, semicolons, repo voice.
- `dressing.json` is precached: add it to `PRECACHE_URLS` in `sw.js` and bump `CACHE_NAME` and `APP_BUILD` together (v238 -> v239), because `dressing.mjs`, `study.mjs` and `dressing.json` ship.
- Row shape: `{ name: /^[a-z0-9-]+$/, mesh: null | name, at: [x, y, z] finite, yaw: finite, height: > 0, prompt: 1..200 chars, note?: string, hides?: string, shadow?: boolean }`.
- The study's frame: centimetres, origin at the desk's near edge, +x to your LEFT, +z away, +y up. Shelf r (0..5) top y = `-82 + r * (232 / 6) + 2.4`.
- `dress()` is a no-op under `navigator.connection?.saveData`, with `dress=off` in the query, or with no rows.
- `dispose()` removes and forgets; it disposes nothing.

## Review Focus

- A row whose `mesh` names a file that 404s must leave the scene exactly as before, with one warning, and `ready` must still resolve. Test in Task 2.
- `dispose()` called while a load is still in flight must not add the late prop to the seat afterwards. Test in Task 2.
- A `hides` tag with two rows must hide the stand-in only when both have loaded, and show it again on `dispose()`. Test in Task 2.
- `keep` filling in a wanted row must not touch a row whose `mesh` is already set, and must leave the file untouched when no row matches. Test in Task 4.
- The study with an empty or missing `dressing.json` must fly in and dispose as it does today. Test in Task 3 (syntax, and the browser `dress()` test with a 404 JSON).

---

### Task 1: the data and the check

**Files:**
- Create: `assets/intro3d/dressing.json`
- Modify: `scripts/check-meshes.js` (dressing validation; `--dressing <file>`), `scripts/check-meshes.test.js`
- Create: `tools/meshes/fixtures/dressing/good.json`, `unknown-mesh.json`, `bad-rows.json`
- Modify: `sw.js` (`PRECACHE_URLS` gets `'./assets/intro3d/dressing.json'`; `CACHE_NAME` v239), `index.html` (`APP_BUILD` v239)

**Interfaces:**
- Produces: `checkDressing(file, manifestRows): string[]` exported from `check-meshes.js`; `checkDir(dir, { dressing })` runs it when the file exists. CLI: `node scripts/check-meshes.js [dir] [--dressing file]`; default dressing file `assets/intro3d/dressing.json` relative to the repo root.
- `dressing.json` for the study: the ten rows of the spec's table, all `mesh: null`, book rows `study-books-1..6` with `hides: "books"`, `at: [0, topY, 108]`, `height: 32`.

- [ ] **Step 1: Write the fixtures and the failing tests**

`good.json`: `{ "study": [ one wanted row, one row with mesh "cube" (the fixture manifest's kept cube) ] }`. `unknown-mesh.json`: a row with `mesh: "ghost"`. `bad-rows.json`: three rows: no `height`; a 230-character prompt; `mesh: "other"` with `name: "cube"`.

```js
test('dressing: good passes against the good manifest', () => assert.deepEqual(checkDressing(fx('dressing/good.json'), goodRows), []));
test('dressing: a kept mesh that is not in the manifest is reported', () => assert.match(checkDressing(fx('dressing/unknown-mesh.json'), goodRows).join('\n'), /ghost.*not kept/));
test('dressing: bad rows name their field', () => { const p = checkDressing(fx('dressing/bad-rows.json'), goodRows); assert.equal(p.length, 3); assert.match(p.join('\n'), /height/); assert.match(p.join('\n'), /prompt/); assert.match(p.join('\n'), /mesh/); });
test('dressing: the real file validates against the real manifest', () => assert.deepEqual(checkDir(path.join(ROOT, 'assets/intro3d/rare/meshes'), { dressing: path.join(ROOT, 'assets/intro3d/dressing.json') }).problems, []));
```

- [ ] **Step 2: Run to verify they fail** - `node --test scripts/check-meshes.test.js` -> FAIL (`checkDressing` is not a function).

- [ ] **Step 3: Implement** `checkDressing`, wire it into `checkDir` and the CLI, write `dressing.json`, precache it, bump the cache.

- [ ] **Step 4: Verify** - tests pass; `npm run check` passes (check:refs sees the new precache entry and the matching bump).

- [ ] **Step 5: Commit** - `git add assets/intro3d/dressing.json scripts/check-meshes.js scripts/check-meshes.test.js tools/meshes/fixtures/dressing sw.js index.html` / `"dressing.json: the study's wanted props; check:meshes validates the rows"`

---

### Task 2: the loader

**Files:**
- Create: `assets/intro3d/dressing.mjs`
- Modify: `sw.js` (`PRECACHE_URLS` gets `'./assets/intro3d/dressing.mjs'`; no further bump, v239 already covers this branch)
- Test: `dressing-browser-test.mjs` in the session scratchpad, hosted on `lab/meshes.html`

**Interfaces:**
- Produces: `loadDressing(): Promise<object>` (cached; `{}` on any failure), `fitHeight(group, heightCm): number` (returns the factor), `dress(seat, home, { fetchImpl } = {}): { ready: Promise<void>, dispose(): void }`.
- Consumes: `loadProp` from `./props.mjs`; `THREE.Box3`.

- [ ] **Step 1: Write the failing browser tests** (routes: `**/assets/intro3d/dressing.json` -> a fake with rows for home `test`, `**/rare/meshes/*.glb` -> the bundled body)

(J1) two kept rows at heights 30 and 60 cm, yaw 90 and 0, at [10,0,20] and [-10,0,0]: after `ready`, the seat has two children whose world boxes are 30 and 60 tall (within 1%), whose positions match, and `rotation.y` of the first is `Math.PI / 2`; (J2) a wanted row adds nothing; (J3) `?dress=off` (navigate with the query) adds nothing and `ready` resolves; (J4) a row whose GLB 404s adds nothing, one `console.warn`, `ready` resolves; (J5) `dispose()` called before `ready`: after `ready`, the seat has no children; (J6) `hides: "x"` on two rows and a child of the seat with `userData.dressTag = "x"`: it is visible until both load, then hidden, then visible again after `dispose()`; and no `dispose` event fires on any prop geometry across `dispose()`.

- [ ] **Step 2: Run to verify they fail** - import of `/assets/intro3d/dressing.mjs` 404s.

- [ ] **Step 3: Implement `dressing.mjs`** (~90 lines). `fitHeight`: `Box3.setFromObject`, `k = heightCm / (max.y - min.y)`, `group.scale.multiplyScalar(k)` (the group is a seated `props.mjs` group, so the base stays on y = 0). `dress`: `let dead = false`; for each kept row `loadProp(row.mesh).then(g => { if (dead) return; ...; seat.add(g); placed.push(g); tagDone(row.hides); }).catch(err => console.warn('dressing:', row.name, err.message || err))`; `ready = Promise.allSettled(...).then(() => {})`; `dispose()` sets `dead`, removes `placed`, un-hides tagged stand-ins.

- [ ] **Step 4: Verify** - J1..J6 pass; `node scripts/check-syntax.js` and `check:refs` OK.

- [ ] **Step 5: Commit** - `"dressing.mjs: props after the fly-in, from the list, unhooked before dispose"`

---

### Task 3: the study takes it

**Files:**
- Modify: `assets/intro3d/study.mjs` (import `dress`; `buildShelves` tags `inst` and `bands` with `userData.dressTag = 'books'`; `fly()` calls `dress(seat, 'study')` where `arrived` is set (line ~790), keeping the handle in a closure variable `dressing`; `dispose()` calls `if (dressing) dressing.dispose();` before `K.freeTree`)

- [ ] **Step 1: The failing check** - a grep-based assertion in the session (no test harness runs the study): `grep -c "dress(seat, 'study')" assets/intro3d/study.mjs` is 0 now.

- [ ] **Step 2: Implement** the four edits.

- [ ] **Step 3: Verify** - `node scripts/check-syntax.js` OK; `npm run check` OK; attempt `index.html?dest=study&lab` headless under SwiftShader for 25 s and look for a console error; if the intro does not render there, record that in the ledger and rely on the preview look.

- [ ] **Step 4: Commit** - `"Study: dressed from the list after the fly-in; the books are a tagged stand-in"`

---

### Task 4: keep fills a wanted row; the lab lists wanted props

**Files:**
- Modify: `tools/meshes/keep.mjs` (after writing the manifest: read `assets/intro3d/dressing.json` under `root`; if a row with `name === name` and `mesh === null` exists, set `mesh = name` and write the file back, unless `--no-dress`), `tools/meshes/optimise.test.mjs` (a keep test with a temp `dressing.json`)
- Modify: `lab/meshes.mjs`, `lab/meshes.html` (a "Wanted" strip under the kept list: per home, each wanted row as a card with name, note, prompt, and the keep command; tapping the prompt copies it with `navigator.clipboard` when available), `tools/meshes/README.md` (the loop in four lines)

**Interfaces:**
- Produces in keep: `fillDressing(root, name): Promise<boolean>` exported for the test.

- [ ] **Step 1: Failing tests** - keep test: a temp root with `assets/intro3d/dressing.json` holding `{ "study": [{ name: "cube", mesh: null, ... }, { name: "other", mesh: "other", ... }] }`; after `keep({ name: 'cube' })`, the first row's `mesh` is `"cube"` and the second is untouched; a second temp root with no dressing file keeps without error. Browser: (K1) with a routed dressing JSON holding two wanted rows and one kept, the Wanted strip shows two cards with the prompt text and a command containing `--as <name> --height <m>`.

- [ ] **Step 2: Run to verify they fail.**

- [ ] **Step 3: Implement.**

- [ ] **Step 4: Verify** - tool tests pass; Meshes browser suite passes with K1; `npm run check` OK.

- [ ] **Step 5: Commit** - `"keep fills a wanted dressing row; the lab lists wanted props with their prompt and keep command"`

---

### Task 5: docs, push, PR

- [ ] AGENTS.md: a sentence after the mesh pipeline bullet on `dressing.json`, `dress()`, the study's wanted list and `?dress=off`.
- [ ] `npm run check`; both browser suites; tool tests; check tests.
- [ ] Commit `"AGENTS: home dressing"`, push, update PR #269's body.
