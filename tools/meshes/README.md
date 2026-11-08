# meshes

Dev-only tooling, not part of the shipped site (the site build skips
`tools/`). It takes a generated mesh - a Wish Room draft in the `wish-models`
bucket, any URL, or a local file - and keeps it as an asset the scenes can
load on a phone: welded, simplified to a triangle budget, textures capped and
converted to WebP, centred with its base on y = 0, scaled to a real height,
written to `assets/intro3d/rare/meshes/<name>.glb` with a row in the manifest
beside it.

Drafts stay in the bucket at full quality. What ships is committed here.

## Setup

```sh
cd tools/meshes && npm install
npm test
```

## Keep a mesh

From the repo root:

```sh
node tools/meshes/keep.mjs "antique brass cash register" --as study-register --height 0.35
node tools/meshes/keep.mjs https://.../something.glb --as lamp
node tools/meshes/keep.mjs assets/intro3d/rare/bodies/rodin-lean.glb --as sample-body --height 1.8
```

A prompt resolves to the bucket's public URL by the function's own rule
(`bucket.mjs` mirrors `supabase/functions/wish-3d/fal.ts`), so no database
access is needed. Flags: `--tris N` (default 12000), `--tex PX` (1024),
`--bytes N` (1,000,000; the 3,000,000 ceiling is never raised), `--height M`,
`--model ID` (default `fal-ai/hyper3d/rodin`), `--force` to overwrite a kept
mesh.

`npm run check` includes `check:meshes` (`scripts/check-meshes.js`, no
dependencies), which fails when a kept mesh is over its recorded budget, is
missing from the manifest, or needs a decoder the vendored three.js lacks
(meshopt, Draco, KTX2 are deliberately not used). `lab/meshes.html` shows
kept meshes and bucket drafts on a turntable.

## The loop, for a wanted prop

`assets/intro3d/dressing.json` lists each home's props: a row with `mesh:
null` is wanted. The lab's Meshes page shows wanted rows with their prompt
and keep command. Wish the prompt in the Wish Room, preview the draft on
the Meshes page, then run the keep command: it files the mesh under the
row's name and fills the row's `mesh` in (`--no-dress` leaves it), and the
home dresses itself with it after the fly-in. The service worker serves
`rare/` stale-while-revalidate, so after a `--force` re-keep the lab shows
the old mesh for one load. `dressing.json` is a shipped, precached file, so a
keep that fills a row in wants `CACHE_NAME` and `APP_BUILD` bumped together,
as AGENTS.md says of every shipped change.
