# Wish Room 3D generator (posture one) - design

Date: 2026-11-08. Status: approved in chat, awaiting written review.

## Intent

The Wish Room (`lab/wish.html`, `lab/wish.mjs`) already has a seam for a real
model generator: `window.WISH_GENERATOR(text, { THREE })` is awaited when a
wish is granted and the room falls back to its procedural library if it is
missing, throws or returns nothing usable. This design fills that seam with a
vendor-hosted text-to-3D model, for the owner alone, in the lab alone.

Success: the owner types a wish in the lab and, during the clay stage, a real
textured GLB from Hyper3D Rodin lands on the table in place of the procedural
model. A repeat of the same wish costs nothing and appears at once. Everyone
else, and every failure, sees exactly what the room shows today.

Not in scope: players wishing, quotas and billing, image-to-3D, rigging the
result, Meshy, any model running on hardware we rent. The provider seam is
shaped so that posture two (open-weight models on rented GPUs) replaces one
file and one env var.

## Decisions taken in chat

- Audience: the owner, in the lab, behind the existing passkey gate.
- Vendor door: fal.ai, one key, queue API. First model `fal-ai/hyper3d/rodin`
  ($0.40 a generation; Rodin v2 is a second row in the same table).
- Job flow: a thin edge function proxy, the browser polls. No webhooks, no
  Realtime. Rodin takes one to three minutes and edge functions die at 150 s.
- Cache and keep: a `wish_models` table keyed by normalised prompt and model,
  and a `wish-models` Storage bucket the GLB is copied into, so the file is
  ours for good (fal keeps results for an hour at most) and the Rodin lab can
  load it later.
- One change from the chat design: the Wish Room does not grow its own email
  sign-in. The lab gate (`assets/intro3d/dev-overlay.mjs`) already holds the
  owner's token - the app's session, or the gate's emailed sign-in - and
  already has `callEdge()`. Those two helpers are exported and reused.

## Pieces

### 1. Edge function `supabase/functions/wish-3d/`

`index.ts` - one POST endpoint, JSON in and out, CORS as `read-drop` (same
origin allow-list). Auth exactly as `read-drop`: a service-role client reads
the Bearer token with `auth.getUser`; anonymous users and any email other
than the owner's get 403. Deployed with `verify_jwt: false` like `read-drop`
because the function checks the token itself.

Two actions:

- `{ action: "submit", prompt }` - prompt trimmed, 1 to 200 characters, else
  400. Cache lookup by `key = normalise(prompt) + "|" + model`. Hit: respond
  `{ state: "done", url, cached: true }`. Miss: `POST
  https://queue.fal.run/<model>` with `Authorization: Key <FAL_KEY>` and the
  model's body (below); respond `{ state: "queued", id: <request_id> }`.
- `{ action: "status", id, prompt }` - `id` must be a UUID (400 otherwise; it
  is spliced into a URL). `GET https://queue.fal.run/<model>/requests/<id>/status`.
  `IN_QUEUE` -> `{ state: "queued", position }`. `IN_PROGRESS` ->
  `{ state: "running" }`. `COMPLETED` -> `GET .../requests/<id>`; a 200 body
  with `model_mesh.url` is downloaded, written to the bucket at
  `<model slug>/<sha256 of key>.glb`, upserted into `wish_models`, and
  answered `{ state: "done", url: <public bucket url>, cached: false }`. Any
  non-200 from the result endpoint (422 model rejected the input, 499
  cancelled, 500 failed, 404 expired) answers `{ state: "failed", message }`
  with fal's `detail` or `error` text. Nothing failed is ever cached.

`fal.ts` - the provider seam, pure functions with no I/O so they can be unit
tested: `normaliseKey(prompt)`, `bodyFor(model, prompt)`, `urlsFor(model,
id)`, `statusFrom(httpStatus, json)`, `meshUrlFrom(json)`. The model table:

| model id | body |
|---|---|
| `fal-ai/hyper3d/rodin` (default) | `{ prompt, geometry_file_format: "glb", material: "PBR", quality: "medium", tier: "Regular" }` |
| `fal-ai/hyper3d/rodin/v2` | `{ prompt, geometry_file_format: "glb", material: "PBR", quality_mesh_option: "20K Triangle" }` |

Env: `FAL_KEY` (required; missing -> 500 with a plain message),
`WISH_3D_MODEL` (optional, must be a key of the table, default Rodin v1).
`SUPABASE_URL` and `SUPABASE_SERVICE_ROLE_KEY` as every function.

Errors: fal 401 -> 502 "fal refused the key"; other fal 4xx/5xx on submit ->
502 with fal's message; network failure -> 502. The browser shows the message
in the bar and the room falls back to the procedural model.

Posture two: a second provider file with the same five functions, chosen by
`WISH_3D_MODEL`. The browser, the table and the bucket do not change.

### 2. Migration `supabase/migrations/<ts>_wish_models.sql`

```sql
create table public.wish_models (
  key        text primary key,          -- normalised prompt | model id
  prompt     text not null,             -- as typed, for the record
  model      text not null,
  path       text not null,             -- object path in the bucket
  url        text not null,             -- public url of that object
  bytes      integer,
  seed       integer,
  created_at timestamptz not null default now()
);
alter table public.wish_models enable row level security;
-- no policies: the service role alone reads and writes it.
insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values ('wish-models', 'wish-models', true, 52428800, array['model/gltf-binary']);
-- public read of the bucket's objects so GLTFLoader can fetch them plainly;
-- writes come only through the service role.
create policy "wish-models public read" on storage.objects
  for select using (bucket_id = 'wish-models');
```

Applied through the Supabase MCP `apply_migration` and committed as a file,
as the existing migrations are.

### 3. Browser `lab/wish-generator.mjs`

`installWishGenerator({ onStatus })`:

- If `signedIn()` from dev-overlay is false, install nothing and call
  `onStatus("Pass the lab gate to wish for real")`. The room stays procedural.
- Otherwise set `window.WISH_GENERATOR = async (text, { THREE }) => ...`:
  - one job at a time; a wish made while one is in flight returns `null` so
    the room uses its procedural model for that wish.
  - `callEdge("wish-3d", { action: "submit", prompt })`; then poll
    `status` every 3 s for the first minute and every 5 s after, until
    `done` or `failed`, with a 6 minute ceiling that throws.
  - `done`: load `url` with `GLTFLoader` from `../assets/vendor/three/three.addons.js`
    and return `{ object: gltf.scene, url, cached }`. wish.mjs already fits
    and crossfades whatever object comes back.
  - `failed` or thrown: `onStatus` gets the message; the error propagates
    and wish.mjs falls back as it does today.
  - `onStatus` is called on every poll with queue position or elapsed time.
- `?fake3d` in the address: no network at all; the generator resolves after
  two seconds with the bundled `../assets/intro3d/rare/bodies/rodin-lean.glb`.
  This exercises load, fit and crossfade for free.

### 4. Edits

- `assets/intro3d/dev-overlay.mjs`: `export` the existing `callEdge` and
  `signedIn`. No behaviour change.
- `lab/wish.html`: import and call `installWishGenerator`, with a second
  status line under the bar for the generator's messages.
- `lab/wish.mjs`: no change needed. (`finalModel` already guards the seam.)
- `AGENTS.md`, lab bullet: one sentence on the generator, `FAL_KEY` and
  `WISH_3D_MODEL`, and `?fake3d`.

## Data flow

```
owner types wish -> wish.mjs grantWish -> placeholder lands
  -> WISH_GENERATOR(text)
       -> wish-3d submit  (cache hit: url at once)
       -> wish-3d status ... queued / running ...
       -> wish-3d status: done -> function copies GLB to bucket, upserts row
       -> GLTFLoader(url) -> object
  -> wish.mjs fits, crossfades through wire / clay / painted
```

## Testing

- `supabase/functions/wish-3d/fal_test.ts` (Deno, as `go/redirect_test.ts`):
  normalisation (case, spaces, trailing punctuation), both model bodies, the
  status and result URL shapes, status mapping for 202/200 and each
  completed outcome (200 with mesh, 422, 499, 500, 404), mesh url extraction
  with and without `model_mesh`.
- `?fake3d` in the lab for the browser path, by hand.
- `npm run check` before finishing.
- One paid end-to-end wish from the lab after deploy, read back from the
  table and the bucket.

## Operations

- `FAL_KEY` is already set in the project's function secrets.
- Deploy with the Supabase MCP `deploy_edge_function`, `verify_jwt: false`.
- Cost control: owner-only, cache, one job in flight per page, quality
  `medium`, no HighPack add-on (it triples the bill).
