#!/usr/bin/env node
// Finds seeds whose first throw the landing shot can play as it is, and
// writes them into DICE_SEEDS in assets/intro3d/intro.mjs (between its two
// marker lines). A launch takes one of these, so the throw is simulated
// once rather than searched for (a dozen or more throws, a second or two of
// a phone's loading screen). Run again after any change to the physics
// (physics.mjs), the throw's judge, or the stick's line (intro.mjs):
//
//   node scripts/dice-seeds.mjs            # 1000 seeds, from seed 1 up
//   node scripts/dice-seeds.mjs 600 5000   # 600 seeds, from seed 5000 up
//
// Which seeds pass depends on the engine's arithmetic (V8's, here and in
// Chrome; another engine's last digits can differ): a seed that does not
// pass first time elsewhere is simply searched on from, as any seed was.
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const want = Math.max(1, parseInt(process.argv[2], 10) || 1000);
const from = Math.max(1, parseInt(process.argv[3], 10) || 1);
const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const file = path.join(root, 'assets', 'intro3d', 'intro.mjs');
const { firstThrowOk } = await import(path.join(root, 'assets', 'intro3d', 'intro.mjs'));

const seeds = [];
const t0 = Date.now();
let tried = 0;
for (let seed = from; seeds.length < want && seed < 4294967296; seed++) {
  tried++;
  if (firstThrowOk(seed)) seeds.push(seed);
  if (tried % 2000 === 0) process.stderr.write(`${seeds.length}/${want} after ${tried} seeds, ${((Date.now() - t0) / 1000).toFixed(0)}s\n`);
}
process.stderr.write(`${seeds.length} seeds from ${tried} tried (${(100 * seeds.length / tried).toFixed(1)}%), ${((Date.now() - t0) / 1000).toFixed(0)}s\n`);

const src = fs.readFileSync(file, 'utf8');
const open = '// DICE_SEEDS: written by scripts/dice-seeds.mjs - do not edit by hand\n';
const close = '// DICE_SEEDS: end\n';
const a = src.indexOf(open), b = src.indexOf(close);
if (a < 0 || b < 0 || b < a) { console.error('markers not found in intro.mjs'); process.exit(1); }
const rows = [];
for (let i = 0; i < seeds.length; i += 12) rows.push('  ' + seeds.slice(i, i + 12).join(', '));
const block = `${open}export const DICE_SEEDS = [\n${rows.join(',\n')}\n];\n`;
fs.writeFileSync(file, src.slice(0, a) + block + src.slice(b));
console.log(`wrote ${seeds.length} seeds to ${path.relative(root, file)}`);
