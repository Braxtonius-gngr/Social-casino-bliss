# Design system generator

Builds the **Daily Roll Over** design system — a Design System artifact on claude.ai,
<https://claude.ai/artifact/3NCwoFwtFUkRaNzqY825Mx> — from this repository, so it stays in
step with the code. Dev-only: nothing here ships or runs in the app.

```bash
npm run build:design-system -- <outDir>
```

writes `<outDir>/project/…` (the artifact's own files) and prints
`{ sourceHash, ref, themes, colors, files, assets }`.

## What comes from where

| Artifact file | Source |
| --- | --- |
| `tokens.json` colours and themes | `THEMES` in `index.html` — every theme with `vars`, in picker order. A new skin or colour appears on its own. Contrast notes are computed. |
| `tokens.json` glass fill, ink on gold, shared tiers | `EXTRA` in `build.mjs`, each with the `app.css` rule it comes from |
| `tokens.json` type, spacing, radius, shadow, z-index | lifted from `assets/app.css` into `build.mjs` |
| `README.md` (brand book) | `content/README.md`; `{{SKINS_TABLE}}` and `{{CONTRAST}}` are filled in from `THEMES` |
| `components/…` (CSS, previews, guidelines, cover) | `content/components/` |
| assets (Logos, Icons, Chips, Props) | `ASSET_GROUPS` in `build.mjs`, by folder — new files appear |
| `sync-state.json` | written by the build: `sourceHash`, the files and the assets (with sha256) it sent |

When you change a component's base rule in `app.css`, update its copy in
`content/components/bundle.css` (and its preview or guideline if the change shows there).
Skin-only overrides (`[data-theme="…"]` rules) are not mirrored.

## Syncing the artifact

`sourceHash` covers everything published except the commit and date. Same hash means nothing to
do. `assemble.mjs` does the bookkeeping; you do the reads, uploads and the publish.

1. On the default branch's head: `npm run build:design-system -- <scratch>`.
2. Read the artifact's `project/sync-state.json` (Artifact `read`, `path`) to `<old>` (none yet: `-`).
   `node tools/design-system/assemble.mjs plan <scratch> <old>` - if `changed` is false, stop.
3. Upload each `upload[].src` (Artifact publish, `asset: true`) and write `<uploads>.json`:
   `{"<Group>/<name>": {"blob": "<id>", "size": <bytes the result reports>}}`.
4. Read the artifact's `project/design-system.json` (the index) to `<index>` right before
   publishing, then `node tools/design-system/assemble.mjs finish <scratch> <index> <old> <uploads> "<note>"`
   (`note`: what changed, one line). It rewrites only `groups`, `assetGroups` and `lastChange`,
   keeps every other key, and prints `file_path`, `root`, `files` and `remove`.
5. Publish once to the artifact url with that `root` and `file_path`, `files` = each of `files`
   mapped to itself, and each of `remove` mapped to `null`.
6. Report in one or two lines: the commit synced and what changed.

An asset no longer in the repo leaves the index; its upload is not deleted.
Never write `tokens.css`, `manifest.json` or `api/` — the artifact page generates them.
