/*
 * Reading a GLB by hand, and the tessellation metric the Wish Room's prop
 * tools share (scripts/check-wish-glb.js reports it, scripts/generate-wish-
 * prop.js decides from it whether to decimate).
 *
 * The metric is `waste`: the share of a mesh's triangles that do no visual
 * work in the room. A triangle is wasted when
 *   - every one of its three edges is flat: the two faces meeting there
 *     turn so little that the turn cannot be seen - either under FLAT_DEG,
 *     or with a sagitta (how far the surface bends off a straight run across
 *     the edge: edge length x turn / 4) under half of PIXEL_M, the room's
 *     pixel footprint on a prop at the closest zoom (lab/wish.mjs: a 42
 *     degree camera no nearer than 2.2 m, a phone's 1600 device pixels
 *     tall). So flatness is judged at the display's scale: a 2 cm edge
 *     turning 2 degrees and a 1 cm edge turning 10 both bend the surface
 *     under half a pixel and are flat; a 5 cm edge turning 5 is not. A
 *     boundary edge, or a non-manifold one, is never flat: it is a
 *     silhouette or a seam; or
 *   - it is sub-pixel: its longest edge is shorter than PIXEL_M.
 * Seam-split vertices (UV islands, hard normals) are merged by position
 * before the edges are found, so a seam counts as the one edge it is.
 *
 * The verdict for a budget:
 *   keep       at or under budget - never touched, whatever the waste
 *   decimate   over budget with waste at or above WASTE_MIN: the waste is
 *              what the simplifier can take without changing the look, so
 *              the target is the budget, or as far as the waste reaches
 *   efficient  over budget but its triangles are all working: decimating
 *              would lose shape, so it is left as it is and reported -
 *              regenerate at a lower quality, or raise the row's budget
 */

const FLAT_DEG = 3;        // degrees: a dihedral under this is invisible with smooth shading
const PIXEL_M = 0.001;     // metres: the room's pixel footprint on a prop at the closest zoom
const WASTE_MIN = 0.25;    // share of wasted triangles from which decimation is worth it

// ---------- the container ----------

function readGlb(buf) {
  if (buf.length < 20 || buf.toString('ascii', 0, 4) !== 'glTF') throw new Error('not a GLB (no glTF magic)');
  const version = buf.readUInt32LE(4);
  if (version !== 2) throw new Error(`glTF version ${version}; the loader reads 2`);
  const total = buf.readUInt32LE(8);
  if (total !== buf.length) throw new Error(`header says ${total} bytes, the file has ${buf.length}`);
  let off = 12, json = null, bin = null;
  while (off + 8 <= buf.length) {
    const len = buf.readUInt32LE(off), type = buf.readUInt32LE(off + 4);
    const chunk = buf.subarray(off + 8, off + 8 + len);
    if (type === 0x4E4F534A) json = JSON.parse(chunk.toString('utf8'));
    else if (type === 0x004E4942) bin = chunk;
    off += 8 + len;
  }
  if (!json) throw new Error('no JSON chunk');
  return { json, bin };
}

// ---------- transforms (column-major 4x4, as glTF stores them) ----------

function compose(t = [0, 0, 0], [x, y, z, w] = [0, 0, 0, 1], s = [1, 1, 1]) {
  const x2 = x + x, y2 = y + y, z2 = z + z;
  const xx = x * x2, xy = x * y2, xz = x * z2, yy = y * y2, yz = y * z2, zz = z * z2, wx = w * x2, wy = w * y2, wz = w * z2;
  return [
    (1 - (yy + zz)) * s[0], (xy + wz) * s[0], (xz - wy) * s[0], 0,
    (xy - wz) * s[1], (1 - (xx + zz)) * s[1], (yz + wx) * s[1], 0,
    (xz + wy) * s[2], (yz - wx) * s[2], (1 - (xx + yy)) * s[2], 0,
    t[0], t[1], t[2], 1
  ];
}
function mul(a, b) {
  const r = new Array(16);
  for (let c = 0; c < 4; c++) for (let i = 0; i < 4; i++) { let v = 0; for (let k = 0; k < 4; k++) v += a[k * 4 + i] * b[c * 4 + k]; r[c * 4 + i] = v; }
  return r;
}
const IDENTITY = compose();
const xform = (m, [x, y, z]) => [m[0] * x + m[4] * y + m[8] * z + m[12], m[1] * x + m[5] * y + m[9] * z + m[13], m[2] * x + m[6] * y + m[10] * z + m[14]];
const nodeMatrix = n => (n.matrix ? n.matrix.slice() : compose(n.translation, n.rotation, n.scale));

// Walk the default scene: fn(node, worldMatrix) for every node.
function eachNode(json, fn) {
  const nodes = json.nodes || [];
  const scene = json.scenes && json.scenes[json.scene || 0];
  if (!scene || !scene.nodes) return;
  const visit = (ni, parent) => {
    const n = nodes[ni]; if (!n) return;
    const m = mul(parent, nodeMatrix(n));
    fn(n, m);
    (n.children || []).forEach(c => visit(c, m));
  };
  scene.nodes.forEach(ni => visit(ni, IDENTITY));
}

// ---------- accessors ----------

const COMP = { 5120: [1, 'getInt8', 127], 5121: [1, 'getUint8', 255], 5122: [2, 'getInt16', 32767], 5123: [2, 'getUint16', 65535], 5125: [4, 'getUint32', 0], 5126: [4, 'getFloat32', 0] };
const SIZE = { SCALAR: 1, VEC2: 2, VEC3: 3, VEC4: 4, MAT4: 16 };

// A reader over one accessor: get(i, c) -> the c-th component of element i.
function accessorReader(json, bin, idx) {
  const a = (json.accessors || [])[idx];
  if (!a) throw new Error(`accessor ${idx} missing`);
  if (a.sparse || a.bufferView == null) throw new Error(`accessor ${idx}: sparse or without a bufferView`);
  const v = json.bufferViews[a.bufferView];
  if (!bin) throw new Error('no binary chunk');
  const [size, getter, maxInt] = COMP[a.componentType];
  const comps = SIZE[a.type];
  const stride = v.byteStride || size * comps;
  const base = (v.byteOffset || 0) + (a.byteOffset || 0);
  const dv = new DataView(bin.buffer, bin.byteOffset, bin.byteLength);
  const norm = a.normalized && maxInt ? 1 / maxInt : 0;
  return {
    count: a.count, comps,
    get: (i, c) => { const x = dv[getter](base + i * stride + c * size, true); return norm ? Math.max(-1, x * norm) : x; }
  };
}

// Every triangle of the scene in world space: fn([ax,ay,az],[bx,..],[cx,..]).
// Strips and fans are unrolled; other modes are skipped (the linter flags them).
function eachTriangle(json, bin, fn) {
  const meshes = json.meshes || [];
  eachNode(json, (n, m) => {
    if (n.mesh == null || !meshes[n.mesh]) return;
    for (const p of meshes[n.mesh].primitives || []) {
      const mode = p.mode == null ? 4 : p.mode;
      if (mode < 4 || !p.attributes || p.attributes.POSITION == null) continue;
      const pos = accessorReader(json, bin, p.attributes.POSITION);
      const idx = p.indices != null ? accessorReader(json, bin, p.indices) : null;
      const n = idx ? idx.count : pos.count;
      const at = i => { const k = idx ? idx.get(i, 0) : i; return xform(m, [pos.get(k, 0), pos.get(k, 1), pos.get(k, 2)]); };
      if (mode === 4) for (let i = 0; i + 2 < n; i += 3) fn(at(i), at(i + 1), at(i + 2));
      else if (mode === 5) for (let i = 0; i + 2 < n; i++) fn(at(i + (i & 1)), at(i + 1 - (i & 1)), at(i + 2));
      else for (let i = 1; i + 1 < n; i++) fn(at(0), at(i), at(i + 1));
    }
  });
}

// ---------- the metric ----------

const sub = (a, b) => [a[0] - b[0], a[1] - b[1], a[2] - b[2]];
const cross = (a, b) => [a[1] * b[2] - a[2] * b[1], a[2] * b[0] - a[0] * b[2], a[0] * b[1] - a[1] * b[0]];
const len = a => Math.hypot(a[0], a[1], a[2]);
const dist = (a, b) => len(sub(a, b));

function tessellationWaste(json, bin, opts = {}) {
  const flatDeg = opts.flatDeg != null ? opts.flatDeg : FLAT_DEG;
  const pixel = opts.pixel != null ? opts.pixel : PIXEL_M;
  const flatRad = flatDeg * Math.PI / 180;
  const ids = new Map();                       // quantized position -> vertex id
  const key = p => `${Math.round(p[0] * 1e5)},${Math.round(p[1] * 1e5)},${Math.round(p[2] * 1e5)}`;
  const id = p => { const k = key(p); let v = ids.get(k); if (v == null) { v = ids.size; ids.set(k, v); } return v; };
  const tris = [];                             // { n: normal, area, edges: [k,k,k], longest }
  const edges = new Map();                     // "a,b" -> { faces: [tri index, ...], len }
  let area = 0;
  eachTriangle(json, bin, (a, b, c) => {
    const nv = cross(sub(b, a), sub(c, a)), l = len(nv);
    if (!(l > 0)) return;                      // degenerate: no area, no edges worth counting
    const ia = id(a), ib = id(b), ic = id(c);
    if (ia === ib || ib === ic || ia === ic) return;
    const sides = [[ia, ib, dist(a, b)], [ib, ic, dist(b, c)], [ic, ia, dist(c, a)]];
    const e = sides.map(([u, v]) => (u < v ? `${u},${v}` : `${v},${u}`));
    const t = { n: [nv[0] / l, nv[1] / l, nv[2] / l], area: l / 2, edges: e, longest: Math.max(sides[0][2], sides[1][2], sides[2][2]) };
    e.forEach((k, i) => { const edge = edges.get(k); if (edge) edge.faces.push(tris.length); else edges.set(k, { faces: [tris.length], len: sides[i][2] }); });
    tris.push(t); area += t.area;
  });
  const flat = new Map();                      // edge key -> is it flat
  for (const [k, { faces, len: L }] of edges) {
    if (faces.length !== 2) { flat.set(k, false); continue; }
    const n1 = tris[faces[0]].n, n2 = tris[faces[1]].n;
    const turn = Math.acos(Math.max(-1, Math.min(1, n1[0] * n2[0] + n1[1] * n2[1] + n1[2] * n2[2])));
    // (invisible by angle, or by how far the turn bends the surface at this edge's length)
    flat.set(k, turn < flatRad || L * turn / 4 < pixel / 2);
  }
  let flatTris = 0, subPixel = 0, wasted = 0, wastedArea = 0;
  for (const t of tris) {
    const isFlat = t.edges.every(k => flat.get(k));
    const isSub = t.longest < pixel;
    if (isFlat) flatTris++;
    if (isSub) subPixel++;
    if (isFlat || isSub) { wasted++; wastedArea += t.area; }
  }
  const n = tris.length || 1;
  return {
    tris: tris.length, vertices: ids.size, area,
    flatShare: flatTris / n, subPixelShare: subPixel / n,
    waste: wasted / n, wasteArea: area ? wastedArea / area : 0,
    thresholds: { flatDeg, pixel }
  };
}

// What to do with a mesh of `tris` triangles and this `waste` against a budget.
function verdict(metric, budget) {
  const { tris, waste } = metric;
  if (tris <= budget) return { action: 'keep', target: tris, reason: `${tris.toLocaleString()} triangles, within the ${budget.toLocaleString()} budget` };
  if (waste >= WASTE_MIN) {
    const target = Math.max(budget, Math.ceil(tris * (1 - waste)));
    const short = target > budget ? `; the waste alone does not reach the budget, so it stays ${(target - budget).toLocaleString()} over` : '';
    return { action: 'decimate', target, reason: `${tris.toLocaleString()} triangles over the ${budget.toLocaleString()} budget with ${Math.round(waste * 100)}% doing no visual work: decimate to ${target.toLocaleString()}${short}` };
  }
  return { action: 'efficient', target: tris, reason: `${tris.toLocaleString()} triangles over the ${budget.toLocaleString()} budget but only ${Math.round(waste * 100)}% wasted (under ${Math.round(WASTE_MIN * 100)}%): every triangle is working, so it is left as it is - regenerate at a lower quality or raise the row's budget` };
}

const describe = m => `waste ${Math.round(m.waste * 100)}% (flat ${Math.round(m.flatShare * 100)}%, sub-pixel ${Math.round(m.subPixelShare * 100)}%)`;

module.exports = { FLAT_DEG, PIXEL_M, WASTE_MIN, readGlb, compose, mul, IDENTITY, xform, nodeMatrix, eachNode, accessorReader, eachTriangle, tessellationWaste, verdict, describe };
