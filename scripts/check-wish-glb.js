#!/usr/bin/env node
/*
 * Holds every generated Wish Room prop (assets/intro3d/rare/wish/*.glb) to
 * its row in lab/wish-props.mjs and to the contract in
 * docs/props-specifications.md, and reports which props are still to make.
 *
 * Errors (exit 1) are what the room enforces or cannot survive: a file the
 * table doesn't know, a broken container, a rig / animation / camera /
 * light, a compression that needs a decoder, a mesh whose size doesn't fit
 * its box (the room would rescale it, which hides a wrong-unit export), a
 * material with its colour baked into the emissive channel over a black
 * base (it renders flat and unlit - the trap the Rodin body export fell
 * into), an unlit material, a texture the file doesn't embed.
 *
 * Warnings are the sheet's recommendations: budgets (triangles, texture
 * size, file size), a base off y 0 or a footprint off centre (the loader
 * re-seats, but the file's own tools then disagree with the room),
 * proportions far from the box, double-sided or metallic-by-default
 * materials, glass or glow where the row doesn't expect it. --strict makes
 * them fail too. --dir=<path> checks another folder (a drop folder before
 * the files are moved in).
 *
 * Each file also gets its tessellation metric (scripts/lib/glb-metrics.js):
 * the share of triangles doing no visual work, and the verdict a prop over
 * budget gets from it - decimate, or leave because every triangle is
 * working. scripts/generate-wish-prop.js acts on that verdict.
 *
 * No dependencies: the GLB container and the glTF JSON are read by hand,
 * bounds come from the POSITION accessors' min/max through each node's
 * transform, image sizes from the PNG / JPEG headers.
 */

const fs = require('fs');
const path = require('path');
const { pathToFileURL } = require('url');
const metrics = require('./lib/glb-metrics.js');

const ROOT = path.resolve(__dirname, '..');
const args = process.argv.slice(2);
const STRICT = args.includes('--strict');
const DIR_ARG = (args.find(a => a.startsWith('--dir=')) || '').slice('--dir='.length);

// The sheet's budgets (docs/props-specifications.md, section 2).
const BUDGET = {
  tris: 12000,          // a prop
  trisOne: 2000,        // a single piece of a plural (<file>-one.glb)
  texture: 1024,        // px, unless the row says bigger
  bytes: 1024 * 1024,   // a file
  fit: [0.8, 1.25],     // fitTo()'s tolerance: outside it the room rescales
  seat: 0.01,           // m: how far off y 0 / off centre before a warning
  shape: 1.5            // how far the per-axis fit ratios may differ before a warning
};
const DECODER_EXTS = ['KHR_draco_mesh_compression', 'EXT_meshopt_compression'];
const triangleBudget = single => (single ? BUDGET.trisOne : BUDGET.tris);

// ---------- images ----------

function imageSize(bytes, mime) {
  if (mime === 'image/png' && bytes.length >= 24 && bytes.toString('ascii', 1, 4) === 'PNG') return [bytes.readUInt32BE(16), bytes.readUInt32BE(20)];
  if (mime === 'image/jpeg' && bytes.length > 4 && bytes[0] === 0xFF && bytes[1] === 0xD8) {
    let off = 2;
    while (off + 9 < bytes.length) {
      if (bytes[off] !== 0xFF) { off++; continue; }
      const marker = bytes[off + 1];
      if (marker >= 0xC0 && marker <= 0xCF && marker !== 0xC4 && marker !== 0xC8 && marker !== 0xCC) return [bytes.readUInt16BE(off + 7), bytes.readUInt16BE(off + 5)];
      if (marker === 0xD8 || marker === 0x01 || (marker >= 0xD0 && marker <= 0xD7)) { off += 2; continue; }
      off += 2 + bytes.readUInt16BE(off + 2);
    }
  }
  return null;
}

// ---------- one file ----------

// -> { errors, warnings, tris, metric, verdict }
function checkFile(file, row, single, bytes) {
  const errors = [], warnings = [];
  const err = m => errors.push(m), warn = m => warnings.push(m);
  let parsed;
  try { parsed = metrics.readGlb(bytes); } catch (e) { err(e.message); return { errors, warnings }; }
  const { json, bin } = parsed;
  const box = single ? row.single : row.size;

  // what the room cannot take
  if (json.animations && json.animations.length) err(`${json.animations.length} animation(s): the room poses nothing, export without them`);
  if (json.skins && json.skins.length) err(`${json.skins.length} skin(s): a prop is unrigged`);
  if (json.cameras && json.cameras.length) err(`${json.cameras.length} camera(s) in the file`);
  const used = json.extensionsUsed || [], required = json.extensionsRequired || [];
  if (used.includes('KHR_lights_punctual')) err('lights in the file: the room lights its own table');
  required.filter(x => DECODER_EXTS.includes(x)).forEach(x => err(`${x}: needs a decoder the room does not ship - export uncompressed`));
  if (used.includes('KHR_materials_unlit')) err('KHR_materials_unlit: the prop would ignore the room\'s light - use a lit PBR material');

  // the scene's bounds and triangles
  const acc = json.accessors || [], meshes = json.meshes || [], mats = json.materials || [];
  const scene = json.scenes && json.scenes[json.scene || 0];
  if (!scene || !scene.nodes || !scene.nodes.length) { err('no scene with nodes'); return { errors, warnings }; }
  const mn = [Infinity, Infinity, Infinity], mx = [-Infinity, -Infinity, -Infinity];
  let tris = 0, prims = 0;
  const usedMats = new Set();
  metrics.eachNode(json, (n, m) => {
    if (n.mesh == null || !meshes[n.mesh]) return;
    for (const p of meshes[n.mesh].primitives || []) {
      prims++;
      const mode = p.mode == null ? 4 : p.mode;
      const pos = acc[p.attributes && p.attributes.POSITION];
      if (!pos) { err('a primitive without POSITION'); continue; }
      if (!pos.min || !pos.max) err('a POSITION accessor without min/max (required by glTF; the bounds cannot be checked)');
      else for (let c = 0; c < 8; c++) {
        const w = metrics.xform(m, [c & 1 ? pos.max[0] : pos.min[0], c & 2 ? pos.max[1] : pos.min[1], c & 4 ? pos.max[2] : pos.min[2]]);
        for (let k = 0; k < 3; k++) { mn[k] = Math.min(mn[k], w[k]); mx[k] = Math.max(mx[k], w[k]); }
      }
      const count = p.indices != null && acc[p.indices] ? acc[p.indices].count : pos.count;
      if (mode === 4) tris += count / 3;
      else if (mode === 5 || mode === 6) tris += Math.max(0, count - 2);
      else err(`a primitive drawn as ${['points', 'lines', 'line loop', 'line strip'][mode] || 'mode ' + mode}: props are triangles`);
      if (!p.attributes.NORMAL) warn('a primitive without NORMAL: the loader shades it flat');
      if (p.material != null) {
        usedMats.add(p.material);
        const mat = mats[p.material] || {};
        const pbr = mat.pbrMetallicRoughness || {};
        const textured = Boolean(pbr.baseColorTexture || pbr.metallicRoughnessTexture || mat.normalTexture || mat.emissiveTexture || mat.occlusionTexture);
        if (textured && !p.attributes.TEXCOORD_0) err(`a textured primitive without TEXCOORD_0 (material "${mat.name || p.material}")`);
      } else warn('a primitive with no material: it renders in glTF\'s default white');
    }
  });
  if (!prims) err('no mesh in the scene');

  let metric = null, decision = null;
  if (prims && Number.isFinite(mn[0])) {
    const size = [mx[0] - mn[0], mx[1] - mn[1], mx[2] - mn[2]];
    const fmt = v => v.map(x => x.toFixed(3)).join(' x ');
    const ratios = box.map((b, k) => b / Math.max(size[k], 1e-6));
    const k = Math.min(...ratios);
    if (k < BUDGET.fit[0] || k > BUDGET.fit[1]) {
      const hint = size.some(s => s > 5) ? ' (centimetres, not metres?)' : size.every(s => s < 0.01) ? ' (millimetres?)' : '';
      err(`size ${fmt(size)} m does not fit its box ${fmt(box)} m: fit factor ${k.toFixed(2)}, the room rescales outside ${BUDGET.fit[0]}..${BUDGET.fit[1]}${hint}`);
    } else if (Math.max(...ratios) / Math.min(...ratios) > BUDGET.shape) {
      warn(`proportions ${fmt(size)} m are far from the box ${fmt(box)} m (fit ${ratios.map(r => r.toFixed(2)).join(' / ')} per axis)`);
    }
    if (Math.abs(mn[1]) > BUDGET.seat) warn(`base at y ${mn[1].toFixed(3)} m, not resting on y 0 (the loader re-seats it)`);
    const cx = (mn[0] + mx[0]) / 2, cz = (mn[2] + mx[2]) / 2;
    if (Math.abs(cx) > BUDGET.seat || Math.abs(cz) > BUDGET.seat) warn(`footprint centred at x ${cx.toFixed(3)}, z ${cz.toFixed(3)} m, not on the origin (the loader re-centres it)`);
    const budget = triangleBudget(single);
    if (tris > budget) warn(`${Math.round(tris).toLocaleString()} triangles, over the ${budget.toLocaleString()} budget`);
    // (the tessellation metric: what a prop over budget should get)
    try {
      metric = metrics.tessellationWaste(json, bin);
      decision = metrics.verdict(metric, budget);
      if (decision.action === 'decimate') warn(`${metrics.describe(metric)}: ${decision.reason} (npm run gen:prop -- ${file}${single ? '-one' : ''} --from=<this file>)`);
      else if (decision.action === 'efficient') warn(`${metrics.describe(metric)}: ${decision.reason}`);
    } catch (e) { warn(`tessellation metric could not be read: ${e.message}`); }
  }

  // materials
  for (const mi of usedMats) {
    const mat = mats[mi] || {}, name = `material "${mat.name || mi}"`;
    const pbr = mat.pbrMetallicRoughness || {};
    const base = pbr.baseColorFactor || [1, 1, 1, 1];
    const emissive = Boolean(mat.emissiveTexture) || (mat.emissiveFactor || [0, 0, 0]).some(v => v > 0);
    const baseBlack = !pbr.baseColorTexture && base[0] < 0.05 && base[1] < 0.05 && base[2] < 0.05;
    if (emissive && baseBlack) err(`${name}: colour baked into the emissive channel over a black base - it renders flat and unlit; put the colour in baseColor`);
    else if (emissive && !row.glow) warn(`${name}: emissive on a prop that does not glow`);
    if (mat.alphaMode === 'BLEND' && !row.glass) warn(`${name}: alphaMode BLEND on a prop that is not glass`);
    if (mat.doubleSided) warn(`${name}: doubleSided (keep it for foil or paper only)`);
    if (pbr.metallicFactor == null && !pbr.metallicRoughnessTexture) warn(`${name}: metallicFactor unset, so glTF makes it fully metallic`);
    if (mat.extensions && mat.extensions.KHR_materials_unlit) err(`${name}: unlit`);
  }

  // images
  const views = json.bufferViews || [];
  (json.images || []).forEach((img, i) => {
    const label = `image ${img.name || i}`;
    let data = null;
    if (img.bufferView != null) {
      const v = views[img.bufferView];
      if (!v || !bin) err(`${label}: bufferView missing`);
      else data = bin.subarray(v.byteOffset || 0, (v.byteOffset || 0) + v.byteLength);
    } else if (typeof img.uri === 'string' && img.uri.startsWith('data:')) {
      const m = img.uri.match(/^data:([^;,]+)(;base64)?,(.*)$/);
      if (m) { data = Buffer.from(m[3], m[2] ? 'base64' : 'utf8'); img.mimeType = img.mimeType || m[1]; }
      warn(`${label}: a data URI - embed it in the binary chunk instead (a third smaller)`);
    } else err(`${label}: an external file (${img.uri}) - the room loads one self-contained GLB`);
    if (img.mimeType && !['image/png', 'image/jpeg'].includes(img.mimeType)) err(`${label}: ${img.mimeType}; use PNG or JPEG`);
    if (data) {
      const dims = imageSize(data, img.mimeType);
      const cap = row.texture || BUDGET.texture;
      if (!dims) warn(`${label}: could not read its size`);
      else if (Math.max(...dims) > cap) warn(`${label}: ${dims[0]} x ${dims[1]} px, over the ${cap} px budget`);
    }
  });
  if (bytes.length > BUDGET.bytes) warn(`${(bytes.length / 1048576).toFixed(2)} MB, over the 1 MB budget`);

  return { errors, warnings, tris: Math.round(tris), metric, verdict: decision };
}

// The table the room uses, as the linter and the pipeline read it.
async function loadRows() {
  const { GENERATED, WISH_GLB_DIR } = await import(pathToFileURL(path.join(ROOT, 'lab', 'wish-props.mjs')).href);
  return { GENERATED, WISH_GLB_DIR, rows: new Map(GENERATED.map(r => [r.file, r])) };
}

// A file name -> its row and whether it is the single ({ file, row, single }), or null.
function rowFor(rows, name) {
  const stem = name.endsWith('.glb') ? name.slice(0, -4) : name;
  const single = stem.endsWith('-one');
  const file = single ? stem.slice(0, -4) : stem;
  const row = rows.get(file);
  return row ? { file, row, single, stem } : null;
}

// ---------- the folder ----------

async function main() {
  const { GENERATED, WISH_GLB_DIR, rows } = await loadRows();
  const dir = DIR_ARG ? path.resolve(ROOT, DIR_ARG) : path.join(ROOT, WISH_GLB_DIR);
  const present = new Set();
  let errorCount = 0, warningCount = 0, checked = 0;

  const entries = fs.existsSync(dir) ? fs.readdirSync(dir).filter(f => !f.startsWith('.')).sort() : [];
  for (const name of entries) {
    const full = path.join(dir, name);
    if (!fs.statSync(full).isFile()) continue;
    if (!name.endsWith('.glb')) { console.log(`WARN  ${name}: not a .glb, the room ignores it`); warningCount++; continue; }
    const hit = rowFor(rows, name);
    let result;
    if (!hit) result = { errors: [`no wish knows this file: name it after a row of lab/wish-props.mjs (${[...rows.keys()].slice(0, 6).join(', ')}, ...)`], warnings: [] };
    else if (hit.single && !hit.row.single) result = { errors: [`"${hit.file}" is one thing, not one or many: it has no -one file`], warnings: [] };
    else { result = checkFile(hit.file, hit.row, hit.single, fs.readFileSync(full)); present.add(hit.stem); }
    checked++;
    errorCount += result.errors.length; warningCount += result.warnings.length;
    const status = result.errors.length ? 'FAIL' : result.warnings.length ? 'WARN' : 'OK  ';
    const tris = result.tris != null ? ` (${result.tris.toLocaleString()} tris${result.metric ? ', ' + metrics.describe(result.metric) : ''})` : '';
    console.log(`${status}  ${name}${tris}`);
    result.errors.forEach(m => console.log(`        error: ${m}`));
    result.warnings.forEach(m => console.log(`        warn:  ${m}`));
  }

  const missing = [];
  for (const r of GENERATED) {
    if (!present.has(r.file)) missing.push(`${r.file}.glb`);
    if (r.single && !present.has(`${r.file}-one`)) missing.push(`${r.file}-one.glb`);
  }
  const wanted = GENERATED.length + GENERATED.filter(r => r.single).length;
  console.log(`\nWish props: ${checked} file(s) checked in ${path.relative(ROOT, dir) || '.'}; ${wanted - missing.length}/${wanted} made.`);
  if (missing.length) console.log(`Still to make (${missing.length}): ${missing.join(', ')}`);

  if (errorCount || (STRICT && warningCount)) {
    console.error(`\nWish prop check failed: ${errorCount} error(s), ${warningCount} warning(s)${STRICT ? ' (--strict)' : ''}.`);
    process.exit(1);
  }
  console.log(`Wish prop check passed: ${errorCount} error(s), ${warningCount} warning(s).`);
}

module.exports = { BUDGET, checkFile, loadRows, rowFor, triangleBudget };

if (require.main === module) main().catch(e => { console.error(`Wish prop check could not run: ${e.message}`); process.exit(1); });
