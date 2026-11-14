# Wish Room 3D Generator Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** The owner types a wish in `lab/wish.html` and a real Hyper3D Rodin GLB, fetched through a `wish-3d` edge function from fal.ai, replaces the procedural model; repeats come from a cache.

**Architecture:** A Supabase edge function proxies fal's queue API in two actions (submit, status), checks the caller is the owner, copies a finished GLB into a public Storage bucket and records it in `wish_models`. A browser module installs `window.WISH_GENERATOR` only when the lab gate's token is present, polls the function while the Wish Room's clay stage plays, and loads the GLB with the vendored GLTFLoader. Pure fal helpers live in one file so posture two swaps that file.

**Tech Stack:** Deno edge function (std 0.168 `serve`, supabase-js 2.39 via esm.sh, as `read-drop`), Postgres migration, classic ES module in the browser with vendored three.js, Deno tests.

**Spec:** `docs/superpowers/specs/2026-11-08-wish-3d-generator-design.md`

## Global Constraints

- Build-free static PWA: no bundler, no new runtime dependency; three.js only from `assets/vendor/three/`, GLTFLoader from `three.addons.js`.
- Two-space indentation, semicolons, existing naming. Comments in the repo's voice (plain prose, why not what).
- Owner-only: `ADMIN_EMAIL = "johndopamine210@gmail.com"`, anonymous users refused, exactly as `read-drop`.
- Env names: `FAL_KEY` (required), `WISH_3D_MODEL` (optional, default `fal-ai/hyper3d/rodin`).
- Prompt limits: trimmed, 1 to 200 characters. Request ids must be UUIDs before they reach a URL.
- fal: `POST https://queue.fal.run/<model>`, `GET https://queue.fal.run/<model>/requests/<id>/status`, `GET https://queue.fal.run/<model>/requests/<id>`, header `Authorization: Key <FAL_KEY>`. Statuses `IN_QUEUE`, `IN_PROGRESS`, `COMPLETED`. Result keeps for at most one hour.
- Bucket `wish-models`, public read, 50 MB limit, mime `model/gltf-binary`. Object path `<model slug>/<sha256 hex of key>.glb`.
- Cost: quality `medium`, no `HighPack`, one job in flight per page, cache first.
- `npm run check` passes before finishing; `deno test` and `deno check` lines in `.github/workflows/checks.yml` include the new files.

## Review Focus

- A prompt that is only emoji or punctuation (the chips send "🍩 donuts"-style text through `readWish`, but `wish.raw` is what reaches the generator) must still produce a non-empty cache key and a valid fal body. Test in Task 1.
- fal answering `COMPLETED` on status while the result endpoint answers 400 "not complete" (a race the docs allow) must map to `running`, not `failed`, so the browser keeps polling. Test in Task 1.
- A GLB over the bucket's 50 MB limit must answer `failed` with a clear message, not a 500 with Storage's error text. Test in Task 3 (status mapping of a Storage upload error).
- A wish made while another is generating must fall back to the procedural model at once and leave the running job alone. Test in Task 4 (fake mode).
- The lab opened without the gate's token (a fresh browser) must stay exactly as today: no network, no error in the console, a quiet status line. Test in Task 4.

---

### Task 1: fal provider seam, pure and tested

**Files:**
- Create: `supabase/functions/wish-3d/fal.ts`
- Create: `supabase/functions/wish-3d/fal_test.ts`
- Modify: `.github/workflows/checks.yml:34` (add `supabase/functions/wish-3d/fal_test.ts` to the `deno test` line)

**Interfaces:**
- Produces:
  - `export const DEFAULT_MODEL = "fal-ai/hyper3d/rodin"`
  - `export const MODELS: Record<string, (prompt: string) => Record<string, unknown>>` with keys `fal-ai/hyper3d/rodin` and `fal-ai/hyper3d/rodin/v2`
  - `export function normaliseKey(prompt: string): string` - lowercase, trim, collapse runs of whitespace to one space, strip trailing `.!?,;:` characters
  - `export function cacheKey(prompt: string, model: string): string` - `normaliseKey(prompt) + "|" + model`
  - `export function bodyFor(model: string, prompt: string): Record<string, unknown>` - throws `Error("Unknown model")` for a model not in `MODELS`
  - `export function urlsFor(model: string, id = ""): { submit: string; status: string; result: string }`
  - `export function isUuid(id: string): boolean`
  - `export type JobState = { state: "queued"; position?: number } | { state: "running" } | { state: "completed" } | { state: "failed"; message: string }`
  - `export function statusFrom(httpStatus: number, json: Record<string, unknown>): JobState` - 200/202 with `IN_QUEUE` -> queued (position from `queue_position`), `IN_PROGRESS` -> running, `COMPLETED` -> completed; 404 -> failed "fal has no such job (it may have expired)"; anything else -> failed with `detail` or `error` text or `fal status <code>`
  - `export function resultFrom(httpStatus: number, json: Record<string, unknown>): { state: "running" } | { state: "failed"; message: string } | { state: "done"; url: string; seed: number | null; textures: string[] }` - 400 -> running; 200 with `model_mesh.url` -> done; 200 without it -> failed "fal returned no mesh"; 404/422/499/500/504 -> failed with the body's `detail` (string, or the first element's `msg` when `detail` is an array) or `error`, else `fal result <code>`
  - `export function objectPath(model: string, key: string): Promise<string>` - `<model slug>/<sha256 hex of key>.glb`, slug = model with `/` replaced by `-`
  - `export function failedMessage(json: Record<string, unknown>, fallback: string): string` - the shared `detail`/`error` reader above

- [ ] **Step 1: Write the failing tests**

```ts
import { assertEquals, assertThrows } from "https://deno.land/std@0.168.0/testing/asserts.ts";
import { DEFAULT_MODEL, bodyFor, cacheKey, isUuid, normaliseKey, objectPath, resultFrom, statusFrom, urlsFor } from "./fal.ts";

Deno.test("normaliseKey lowercases, trims, collapses spaces and drops trailing punctuation", () => {
  assertEquals(normaliseKey("  A  Birthday   CAKE!! "), "a birthday cake");
  assertEquals(normaliseKey("🍩 donuts"), "🍩 donuts");
  assertEquals(cacheKey("Pizza", DEFAULT_MODEL), "pizza|fal-ai/hyper3d/rodin");
});

Deno.test("bodyFor builds each model's body and refuses unknown models", () => {
  assertEquals(bodyFor("fal-ai/hyper3d/rodin", "a trophy"), { prompt: "a trophy", geometry_file_format: "glb", material: "PBR", quality: "medium", tier: "Regular" });
  assertEquals(bodyFor("fal-ai/hyper3d/rodin/v2", "a trophy"), { prompt: "a trophy", geometry_file_format: "glb", material: "PBR", quality_mesh_option: "20K Triangle" });
  assertThrows(() => bodyFor("fal-ai/nope", "x"), Error, "Unknown model");
});

Deno.test("urlsFor and isUuid", () => {
  const id = "019a1b2c-3d4e-7f80-9a1b-2c3d4e5f6a7b";
  assertEquals(urlsFor(DEFAULT_MODEL, id), {
    submit: "https://queue.fal.run/fal-ai/hyper3d/rodin",
    status: `https://queue.fal.run/fal-ai/hyper3d/rodin/requests/${id}/status`,
    result: `https://queue.fal.run/fal-ai/hyper3d/rodin/requests/${id}`,
  });
  assertEquals(isUuid(id), true);
  assertEquals(isUuid("../other"), false);
});

Deno.test("statusFrom maps fal's queue states", () => {
  assertEquals(statusFrom(202, { status: "IN_QUEUE", queue_position: 3 }), { state: "queued", position: 3 });
  assertEquals(statusFrom(202, { status: "IN_PROGRESS" }), { state: "running" });
  assertEquals(statusFrom(200, { status: "COMPLETED" }), { state: "completed" });
  assertEquals(statusFrom(404, { detail: "Request not found" }).state, "failed");
  assertEquals(statusFrom(500, { detail: "boom" }), { state: "failed", message: "boom" });
});

Deno.test("resultFrom maps the result endpoint", () => {
  assertEquals(resultFrom(400, { detail: "Request is still in progress" }), { state: "running" });
  assertEquals(resultFrom(200, { model_mesh: { url: "https://v3.fal.media/files/x.glb" }, seed: 7, textures: [{ url: "https://v3.fal.media/t.png" }] }),
    { state: "done", url: "https://v3.fal.media/files/x.glb", seed: 7, textures: ["https://v3.fal.media/t.png"] });
  assertEquals(resultFrom(200, { textures: [] }), { state: "failed", message: "fal returned no mesh" });
  assertEquals(resultFrom(422, { detail: [{ msg: "prompt too long" }] }), { state: "failed", message: "prompt too long" });
  assertEquals(resultFrom(500, { error: "runner died" }), { state: "failed", message: "runner died" });
  assertEquals(resultFrom(499, {}), { state: "failed", message: "fal result 499" });
});

Deno.test("objectPath is the model slug over the key's sha256", async () => {
  const key = "pizza|fal-ai/hyper3d/rodin";
  const buf = await crypto.subtle.digest("SHA-256", new TextEncoder().encode(key));
  const hex = [...new Uint8Array(buf)].map(b => b.toString(16).padStart(2, "0")).join("");
  assertEquals(await objectPath(DEFAULT_MODEL, key), `fal-ai-hyper3d-rodin/${hex}.glb`);
});
```

- [ ] **Step 2: Run the tests to verify they fail**

Run: `deno test supabase/functions/wish-3d/fal_test.ts`
Expected: FAIL, module `./fal.ts` not found.

- [ ] **Step 3: Implement `fal.ts` with the interfaces above**

`failedMessage` reads `detail` (string, or array whose first element has `msg`) then `error`, else the fallback. `statusFrom` and `resultFrom` both use it. `objectPath` uses `crypto.subtle.digest("SHA-256", ...)`.

- [ ] **Step 4: Run the tests to verify they pass**

Run: `deno test supabase/functions/wish-3d/fal_test.ts`
Expected: 6 passed.

- [ ] **Step 5: Add the test file to CI and commit**

Append `supabase/functions/wish-3d/fal_test.ts` to the `deno test` command at `.github/workflows/checks.yml:34`.

```bash
git add supabase/functions/wish-3d/fal.ts supabase/functions/wish-3d/fal_test.ts .github/workflows/checks.yml
git commit -m "wish-3d: fal provider seam, pure helpers with tests"
```

---

### Task 2: cache table and bucket

**Files:**
- Create: `supabase/migrations/20261108120000_wish_models.sql`

**Interfaces:**
- Produces: table `public.wish_models(key text pk, prompt text, model text, path text, url text, bytes integer, seed integer, created_at timestamptz)`; bucket `wish-models`, public read.

- [ ] **Step 1: Write the migration**

The SQL in the spec's section 2, verbatim, with a two-line header comment in the style of `20261022090000_webauthn_credentials.sql` saying what the table is for and that only the service role touches it. Use `create table if not exists` and `on conflict (id) do nothing` on the bucket insert so a re-run is harmless.

- [ ] **Step 2: Apply it to the project**

Use the Supabase MCP `apply_migration` with `project_id: ewfvyrhlsanzkmozrmhs`, `name: wish_models`, and the file's contents.

- [ ] **Step 3: Verify**

Use `execute_sql`: `select id, public, file_size_limit from storage.buckets where id = 'wish-models'; select count(*) from public.wish_models;`
Expected: one bucket row, public true, 52428800; count 0.

- [ ] **Step 4: Commit**

```bash
git add supabase/migrations/20261108120000_wish_models.sql
git commit -m "wish-3d: wish_models cache table and wish-models bucket"
```

---

### Task 3: the `wish-3d` edge function

**Files:**
- Create: `supabase/functions/wish-3d/index.ts`
- Modify: `.github/workflows/checks.yml:39` (add `supabase/functions/wish-3d/index.ts` to the `deno check` line)

**Interfaces:**
- Consumes: everything Task 1 exports; Task 2's table and bucket.
- Produces (HTTP, JSON, POST only, CORS as `read-drop`):
  - request `{ action: "submit", prompt: string }` -> 200 `{ state: "done", url, cached: true }` on a cache hit, else 200 `{ state: "queued", id }`
  - request `{ action: "status", id: string, prompt: string }` -> 200 `{ state: "queued", position? } | { state: "running" } | { state: "done", url, cached: false } | { state: "failed", message }`
  - 400 `{ error }` for a bad body, prompt or id; 401/403 as `read-drop`; 500 `{ error: "FAL_KEY isn't set for this project's edge functions." }`; 502 `{ error }` when fal refuses the submit (401 -> "fal refused the key") or cannot be reached.

- [ ] **Step 1: Write `index.ts`**

Copy `read-drop`'s skeleton: `allowedOrigins`, `corsHeaders`, `jsonResponse`, `ADMIN_EMAIL`, the `serve` prologue through the admin check. Then:

- `model = Deno.env.get("WISH_3D_MODEL") || DEFAULT_MODEL`; a value not in `MODELS` -> 500 `{ error: "WISH_3D_MODEL names a model this function doesn't know." }`.
- `submit`: validate prompt; `key = cacheKey(prompt, model)`; `select url from wish_models where key = $key` via the service client -> cached hit; else `fetch(urlsFor(model).submit, { method: "POST", headers: { Authorization: "Key " + falKey, "Content-Type": "application/json" }, body: JSON.stringify(bodyFor(model, prompt)) })`; non-ok -> 502 with `failedMessage`; ok -> `{ state: "queued", id: json.request_id }`.
- `status`: validate `isUuid(id)` and the prompt; GET status with the same header; `statusFrom`; on `completed` GET result; `resultFrom`; on `done`: download `url` (fail with `{ state: "failed", message: "could not fetch the mesh from fal" }` if not ok), `supabase.storage.from("wish-models").upload(await objectPath(model, key), bytes, { contentType: "model/gltf-binary", upsert: true })`; an upload error -> `{ state: "failed", message: "storage: " + error.message }` (this is the over-50 MB case, see Review Focus); then `getPublicUrl(path).data.publicUrl`, `upsert` the `wish_models` row `{ key, prompt, model, path, url, bytes: bytes.byteLength, seed }`, answer `{ state: "done", url, cached: false }`.
- Any other `action` -> 400 `{ error: "Unknown action." }`.

- [ ] **Step 2: Type-check**

Run: `DENO_NO_PACKAGE_JSON=1 deno check supabase/functions/wish-3d/index.ts`
Expected: no errors.

- [ ] **Step 3: Deploy**

Supabase MCP `deploy_edge_function`: `project_id: ewfvyrhlsanzkmozrmhs`, `name: wish-3d`, `entrypoint_path: index.ts`, `verify_jwt: false` (the function checks the token itself, as `read-drop` does), files `index.ts` and `fal.ts`.

- [ ] **Step 4: Smoke the deployed function without spending**

From the container, with no token: `curl -sS -X POST https://ewfvyrhlsanzkmozrmhs.supabase.co/functions/v1/wish-3d -H 'Content-Type: application/json' -H 'apikey: <anon key from dev-overlay.mjs>' -d '{"action":"submit","prompt":"x"}'`
Expected: 401 `{"error":"Not authenticated."}`. (Anything about `FAL_KEY` here would mean the secret is not set; it is read only after auth, so a 401 proves the deploy is live, not the key.)

- [ ] **Step 5: Add the entry point to CI's `deno check` and commit**

```bash
git add supabase/functions/wish-3d/index.ts .github/workflows/checks.yml
git commit -m "wish-3d: edge function, owner-only proxy over fal's queue with a kept copy"
```

---

### Task 4: the browser side

**Files:**
- Modify: `assets/intro3d/dev-overlay.mjs:82` and `:57` (`export` on `callEdge` and `signedIn`; nothing else changes)
- Create: `lab/wish-generator.mjs`
- Modify: `lab/wish.html` (a second status line under the bar; import and call the installer)

**Interfaces:**
- Consumes: `callEdge(fn: string, body: object): Promise<any>` and `signedIn(): boolean` from `../assets/intro3d/dev-overlay.mjs`; `GLTFLoader` from `../assets/vendor/three/three.addons.js`; Task 3's HTTP shapes.
- Produces: `export function installWishGenerator({ onStatus }: { onStatus: (text: string) => void }): boolean` - returns whether a generator was installed. Sets `window.WISH_GENERATOR = async (text, { THREE }) => ({ object, url, cached } | null)`.

- [ ] **Step 1: Export the two gate helpers**

In `dev-overlay.mjs` change `function signedIn()` to `export function signedIn()` and `async function callEdge(` to `export async function callEdge(`. Run `node scripts/check-syntax.js` and confirm OK.

- [ ] **Step 2: Write `lab/wish-generator.mjs`**

Constants: `POLL_FAST_MS = 3000`, `POLL_SLOW_MS = 5000`, `FAST_FOR_MS = 60_000`, `CEILING_MS = 360_000`, `FAKE_GLB = new URL('../assets/intro3d/rare/bodies/rodin-lean.glb', import.meta.url).href`.

- `fake = new URLSearchParams(location.search).has('fake3d')`.
- If `!fake && !signedIn()`: `onStatus('Pass the lab gate to wish for real')`, return `false`.
- `let busy = false`. The generator: if `busy` return `null`; set `busy`, `try { ... } finally { busy = false }`.
- Fake: `await wait(2000)`, load `FAKE_GLB`, return `{ object, url: FAKE_GLB, cached: true }`.
- Real: `r = await callEdge('wish-3d', { action: 'submit', prompt: text })`. If `r.state === 'done'` go to load. Else loop: `await wait(elapsed < FAST_FOR_MS ? POLL_FAST_MS : POLL_SLOW_MS)`; `s = await callEdge('wish-3d', { action: 'status', id: r.id, prompt: text })`; `onStatus` with `Queued, ${position} ahead` / `Sculpting… ${Math.round(elapsed / 1000)}s` / the cached-or-fresh `Ready`; `failed` -> `onStatus(message)` and `throw new Error(message)`; past `CEILING_MS` -> throw `'Gave up after six minutes'`.
- Load: `new GLTFLoader().loadAsync(url)` -> `{ object: gltf.scene, url, cached }`.
- `onStatus` is also called with the submit error text when `callEdge` throws (it throws the response body text).

- [ ] **Step 3: Wire `wish.html`**

Add `<div class="status" id="genStatus" role="status" aria-live="polite"></div>` beside `#wishStatus`, and in the module script: `import { installWishGenerator } from './wish-generator.mjs';` then `const gen = document.getElementById('genStatus'); installWishGenerator({ onStatus(t) { gen.textContent = t; gen.classList.toggle('on', !!t); } });`. Leave `grantWish`'s own stage line as it is.

- [ ] **Step 4: Verify in a browser, free**

Run a static server from the repo root (`python3 -m http.server 8080`) and open `http://localhost:8080/lab/wish.html?fake3d` in headless Chromium with Playwright; wish for "a trophy"; after the stages, assert a mesh whose geometry came from the GLB is on the table (`window.__wish` is not exposed, so check the console for no errors and screenshot the table). Then open without `?fake3d` in a fresh context: the status line reads "Pass the lab gate to wish for real" and no request to `/functions/v1/wish-3d` is made (check `page.on('request')`). Also wish twice quickly in fake mode: the second resolves at once with a procedural model while the first still loads (busy guard).

- [ ] **Step 5: Run the repo checks and commit**

Run: `npm run check`
Expected: all OK.

```bash
git add assets/intro3d/dev-overlay.mjs lab/wish-generator.mjs lab/wish.html
git commit -m "Wish Room: real meshes through wish-3d when the lab gate is passed; ?fake3d loads the bundled body"
```

---

### Task 5: documentation and the one paid run

**Files:**
- Modify: `AGENTS.md` (the lab bullet, line 68 area)

- [ ] **Step 1: Document**

After the sentence that introduces the lab, add one sentence: the Wish Room (`lab/wish.html`) asks the `wish-3d` function for a real Rodin mesh through fal.ai when the gate's token is present (`FAL_KEY` and optional `WISH_3D_MODEL` in the project's function secrets; results kept in the `wish-models` bucket and `wish_models` table; `?fake3d` loads the bundled body with no network).

- [ ] **Step 2: Run the checks and commit**

Run: `npm run check`

```bash
git add AGENTS.md
git commit -m "AGENTS: the Wish Room's generator, its secrets and ?fake3d"
```

- [ ] **Step 3: Push and hand over the paid run**

`git push -u origin ccr-b9a9c7b5-peyogk`. The owner opens the Cloudflare branch preview's `lab/anatomy.html`, passes the gate, then opens `lab/wish.html` and wishes once. Afterwards: `select key, model, bytes, url from public.wish_models;` shows one row and the URL loads. Report the result and the cost (one generation, $0.40).
