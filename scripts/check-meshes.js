#!/usr/bin/env node
/*
 * Checks the kept meshes under assets/intro3d/rare/meshes/ against their
 * manifest: every .glb has a row and every row a file; the file is a valid
 * GLB; it needs no decoder the vendored three.js lacks (no Draco, meshopt or
 * KTX2); every image is WebP within the row's texture cap; the triangle
 * count is within the row's budget; and the bytes are within the row's
 * budget and the 3 MB ceiling. The rows are written by tools/meshes/keep.mjs.
 *
 * No dependencies: the GLB container, the glTF JSON and the WebP headers are
 * small enough to read by hand. `node scripts/check-meshes.js [dir]`.
 */

const fs = require('fs');
const path = require('path');

const ROOT = path.resolve(__dirname, '..');
const DEFAULT_DIR = path.join(ROOT, 'assets', 'intro3d', 'rare', 'meshes');
const CEILING_BYTES = 3000000;
const FORBIDDEN = ['KHR_draco_mesh_compression', 'EXT_meshopt_compression', 'KHR_texture_basisu'];

function readGlb(buffer) {
  const dv = new DataView(buffer.buffer, buffer.byteOffset, buffer.byteLength);
  if (buffer.length < 20 || dv.getUint32(0, true) !== 0x46546C67) throw new Error('not a GLB (bad magic)');
  if (dv.getUint32(4, true) !== 2) throw new Error('GLB version is not 2');
  const jsonLen = dv.getUint32(12, true);
  if (dv.getUint32(16, true) !== 0x4E4F534A) throw new Error('first chunk is not JSON');
  const json = JSON.parse(buffer.subarray(20, 20 + jsonLen).toString('utf8'));
  let bin = new Uint8Array(0);
  const binStart = 20 + jsonLen;
  if (buffer.length >= binStart + 8) {
    const binLen = dv.getUint32(binStart, true);
    if (dv.getUint32(binStart + 4, true) === 0x004E4942) bin = buffer.subarray(binStart + 8, binStart + 8 + binLen);
  }
  return { json, bin };
}

function triangleCount(json) {
  let n = 0;
  for (const mesh of json.meshes || []) {
    for (const prim of mesh.primitives || []) {
      if (prim.mode !== undefined && prim.mode !== 4) continue;
      const acc = prim.indices !== undefined ? json.accessors[prim.indices] : json.accessors[(prim.attributes || {}).POSITION];
      if (acc) n += Math.floor(acc.count / 3);
    }
  }
  return n;
}

// WebP: RIFF <size> WEBP, then a VP8 (lossy), VP8L (lossless) or VP8X
// (extended) chunk whose header carries the canvas size.
function webpSize(bytes) {
  if (!bytes || bytes.length < 30) return null;
  const tag = (o) => String.fromCharCode(bytes[o], bytes[o + 1], bytes[o + 2], bytes[o + 3]);
  if (tag(0) !== 'RIFF' || tag(8) !== 'WEBP') return null;
  const kind = tag(12);
  if (kind === 'VP8 ') {
    return { width: (bytes[26] | (bytes[27] << 8)) & 0x3fff, height: (bytes[28] | (bytes[29] << 8)) & 0x3fff };
  }
  if (kind === 'VP8L') {
    const b = bytes[21] | (bytes[22] << 8) | (bytes[23] << 16) | (bytes[24] << 24);
    return { width: 1 + (b & 0x3fff), height: 1 + ((b >>> 14) & 0x3fff) };
  }
  if (kind === 'VP8X') {
    return { width: 1 + (bytes[24] | (bytes[25] << 8) | (bytes[26] << 16)), height: 1 + (bytes[27] | (bytes[28] << 8) | (bytes[29] << 16)) };
  }
  return null;
}

function imageSizes(json, bin) {
  const out = [];
  (json.images || []).forEach((img, index) => {
    let bytes = null;
    if (img.bufferView !== undefined && json.bufferViews && json.bufferViews[img.bufferView]) {
      const bv = json.bufferViews[img.bufferView];
      bytes = bin.subarray(bv.byteOffset || 0, (bv.byteOffset || 0) + bv.byteLength);
    }
    const size = img.mimeType === 'image/webp' && bytes ? webpSize(bytes) : null;
    out.push({ index, mimeType: img.mimeType || (img.uri ? 'uri' : 'unknown'), width: size ? size.width : null, height: size ? size.height : null, bytes });
  });
  return out;
}

function checkFile(file, row, problems) {
  const label = path.basename(file);
  const buffer = fs.readFileSync(file);
  if (buffer.length !== row.bytes) problems.push(`${label}: ${buffer.length} bytes on disk, manifest says ${row.bytes} (keep it again)`);
  const budget = row.budget || {};
  if (budget.bytes && buffer.length > budget.bytes) problems.push(`${label}: ${buffer.length} bytes is over its ${budget.bytes} byte budget`);
  if (buffer.length > CEILING_BYTES) problems.push(`${label}: ${buffer.length} bytes is over the ${CEILING_BYTES} byte ceiling`);
  let glb;
  try { glb = readGlb(buffer); } catch (err) { problems.push(`${label}: ${err.message}`); return; }
  const { json, bin } = glb;
  for (const ext of json.extensionsRequired || []) {
    if (FORBIDDEN.includes(ext)) problems.push(`${label}: requires ${ext}, which the vendored three.js cannot decode`);
  }
  const tris = triangleCount(json);
  if (budget.tris && tris > budget.tris) problems.push(`${label}: ${tris} triangles is over its ${budget.tris} triangle budget`);
  for (const img of imageSizes(json, bin)) {
    if (img.mimeType !== 'image/webp') { problems.push(`${label}: image ${img.index} is ${img.mimeType}, not image/webp`); continue; }
    if (img.width === null) { problems.push(`${label}: image ${img.index} has an unreadable WebP header`); continue; }
    if (budget.tex && Math.max(img.width, img.height) > budget.tex) problems.push(`${label}: image ${img.index} is ${img.width}x${img.height}, over its ${budget.tex} px cap`);
  }
}

function checkDir(dir) {
  const problems = [];
  const manifestFile = path.join(dir, 'manifest.json');
  const files = fs.existsSync(dir) ? fs.readdirSync(dir).filter(f => f.endsWith('.glb')) : [];
  if (!fs.existsSync(manifestFile)) {
    if (files.length) problems.push(`${dir}: ${files.length} .glb file(s) but no manifest.json`);
    return { problems, checked: 0 };
  }
  let rows;
  try { rows = JSON.parse(fs.readFileSync(manifestFile, 'utf8')); } catch (err) { return { problems: [`manifest.json: ${err.message}`], checked: 0 }; }
  if (!Array.isArray(rows)) return { problems: ['manifest.json: not an array'], checked: 0 };
  const byName = new Map(rows.map(r => [r.name, r]));
  for (const f of files) {
    const name = f.slice(0, -4);
    if (!byName.has(name)) problems.push(`${f}: no manifest row (keep it with tools/meshes/keep.mjs, or delete it)`);
  }
  let checked = 0;
  for (const row of rows) {
    const file = path.join(dir, `${row.name}.glb`);
    if (!fs.existsSync(file)) { problems.push(`${row.name}: manifest row but ${row.name}.glb does not exist`); continue; }
    checkFile(file, row, problems);
    checked += 1;
  }
  return { problems, checked };
}

if (require.main === module) {
  const dir = process.argv[2] ? path.resolve(process.argv[2]) : DEFAULT_DIR;
  const { problems, checked } = checkDir(dir);
  if (problems.length) {
    console.log(`FAIL  ${problems.length} problem(s) in ${path.relative(ROOT, dir) || dir}:`);
    for (const p of problems) console.log(`  - ${p}`);
    process.exit(1);
  }
  console.log(checked ? `OK    ${checked} kept mesh(es) within budget in ${path.relative(ROOT, dir)}` : 'OK    no meshes kept yet');
}

module.exports = { readGlb, triangleCount, webpSize, imageSizes, checkDir, CEILING_BYTES, FORBIDDEN };
