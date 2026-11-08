#!/usr/bin/env node
// keep: a Wish Room draft (by prompt or URL) or a local GLB, optimised to
// budget and written under assets/intro3d/rare/meshes/ with its manifest
// row. See README.md. From the repo root:
//   node tools/meshes/keep.mjs <source> --as <name> [--tris N] [--tex PX]
//        [--bytes N] [--height M] [--model ID] [--seed N] [--force] [--no-dress]
import { mkdir, readFile, stat, writeFile } from 'node:fs/promises';
import { dirname, join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { NodeIO } from '@gltf-transform/core';
import { ALL_EXTENSIONS } from '@gltf-transform/extensions';
import { DEFAULT_MODEL, resolveSource } from './bucket.mjs';
import { CEILING_BYTES, DEFAULT_BUDGET, optimise } from './optimise.mjs';

export const MESHES_DIR = 'assets/intro3d/rare/meshes';
const REPO_ROOT = resolve(dirname(fileURLToPath(import.meta.url)), '..', '..');

async function readManifest(file) {
  let text;
  try { text = await readFile(file, 'utf8'); } catch (err) { if (err.code === 'ENOENT') return []; throw err; }
  const rows = JSON.parse(text); // a corrupt or conflicted manifest is an error, never silently replaced
  if (!Array.isArray(rows)) throw new Error(`${file} is not an array`);
  return rows;
}

// After a keep: if assets/intro3d/dressing.json has a wanted row of this
// name (mesh null), it is now kept - fill the mesh in. Returns whether a row
// changed; a missing file is simply no rows.
export async function fillDressing(root, name) {
  const file = join(root, 'assets', 'intro3d', 'dressing.json');
  let text;
  try { text = await readFile(file, 'utf8'); } catch (err) { if (err.code === 'ENOENT') return false; throw err; }
  const homes = JSON.parse(text);
  let changed = false;
  for (const rows of Object.values(homes)) {
    if (!Array.isArray(rows)) continue;
    for (const row of rows) if (row && row.name === name && row.mesh === null) { row.mesh = name; changed = true; }
  }
  if (changed) await writeFile(file, JSON.stringify(homes, null, 2) + '\n');
  return changed;
}

export async function keep({ source, name, budget = {}, height, model = DEFAULT_MODEL, force = false, root = REPO_ROOT, seed = null, noDress = false, log = () => {} }) {
  if (!/^[a-z0-9-]+$/.test(name || '')) throw new Error(`A mesh name is lowercase letters, digits and dashes, not "${name}".`);
  const b = { ...DEFAULT_BUDGET, ...budget };
  if (b.bytes > CEILING_BYTES) throw new Error(`--bytes ${b.bytes} is over the ${CEILING_BYTES} ceiling, which is never raised.`);
  const dir = join(root, MESHES_DIR);
  const out = join(dir, `${name}.glb`);
  const manifestFile = join(dir, 'manifest.json');
  const manifest = await readManifest(manifestFile);
  if (!force && manifest.some(r => r.name === name)) throw new Error(`${name} is already kept; pass --force to replace it.`);

  const src = await resolveSource(source, model);
  const io = new NodeIO().registerExtensions(ALL_EXTENSIONS);
  let document;
  if (src.kind === 'file') {
    document = await io.read(src.path);
  } else {
    log(`fetching ${src.url}`);
    const r = await fetch(src.url);
    if (!r.ok) throw new Error(`${src.kind === 'prompt' ? 'No draft in the bucket for that prompt' : 'Could not fetch the source'} (${r.status} ${src.url})`);
    document = await io.readBinary(new Uint8Array(await r.arrayBuffer()));
  }

  const { document: outDoc, stats } = await optimise(document, { budget: b, height });
  if (stats.triangles > b.tris) throw new Error(`${name} is still ${stats.triangles} triangles after simplifying, over its ${b.tris} budget; raise --tris or start from a lighter draft.`);
  const bytes = await io.writeBinary(outDoc);
  if (bytes.byteLength > b.bytes) throw new Error(`${name} comes out at ${bytes.byteLength} bytes, over its ${b.bytes} budget; raise --bytes (up to ${CEILING_BYTES}) or lower --tris / --tex.`);
  await mkdir(dir, { recursive: true });
  await writeFile(out, bytes);
  const row = {
    name,
    prompt: src.kind === 'prompt' ? source : (src.kind === 'url' ? '' : `local file ${source}`),
    model,
    source: src.kind === 'file' ? source : src.url,
    seed,
    triangles: stats.triangles,
    textures: stats.textures,
    bytes: bytes.byteLength,
    budget: b,
    simplifyError: stats.simplifyError,
    height: stats.height,
    kept: new Date().toISOString().slice(0, 10),
  };
  const rows = manifest.filter(r => r.name !== name).concat([row]).sort((x, y) => x.name.localeCompare(y.name));
  await writeFile(manifestFile, JSON.stringify(rows, null, 2) + '\n');
  if (!noDress && await fillDressing(root, name)) log(`dressing.json: ${name} was wanted; its row is now kept`);
  log(`${name}: ${stats.trianglesBefore} -> ${stats.triangles} triangles${stats.simplifyError !== null ? ` (simplify error ${stats.simplifyError})` : ''}, ${stats.textures.map(t => `${t.slot} ${t.size}px`).join(', ') || 'no textures'}, ${bytes.byteLength} bytes (budget ${b.tris} tris / ${b.tex}px / ${b.bytes} bytes), ${stats.height} m tall`);
  return row;
}

function parseArgs(argv) {
  const o = { budget: {} };
  const rest = [];
  for (let i = 0; i < argv.length; i++) {
    const a = argv[i];
    const next = () => argv[++i];
    if (a === '--as') o.name = next();
    else if (a === '--tris') o.budget.tris = Number(next());
    else if (a === '--tex') o.budget.tex = Number(next());
    else if (a === '--bytes') o.budget.bytes = Number(next());
    else if (a === '--height') o.height = Number(next());
    else if (a === '--model') o.model = next();
    else if (a === '--seed') o.seed = Number(next());
    else if (a === '--force') o.force = true;
    else if (a === '--no-dress') o.noDress = true;
    else rest.push(a);
  }
  o.source = rest.join(' ');
  return o;
}

if (process.argv[1] && resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  const o = parseArgs(process.argv.slice(2));
  if (!o.source || !o.name) {
    console.error('usage: node tools/meshes/keep.mjs <prompt|url|file> --as <name> [--tris N] [--tex PX] [--bytes N] [--height M] [--model ID] [--seed N] [--force] [--no-dress]');
    process.exit(2);
  }
  keep({ ...o, log: console.log }).then(() => process.exit(0), err => { console.error(err.message || err); process.exit(1); });
}
