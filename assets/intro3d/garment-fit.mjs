// garment-fit.mjs — separable garment lofts fitted to any procedural man's
// torso sections.  Reads the same T-array that figure.mjs builds and uses the
// same loft / facetSkinned primitives, so the results are identical to dress()'s
// garment blocks but callable from outside buildFigure.
//
// Exports
//   fitShirt(T, kit, hips, arms, rig, opts) → SkinnedMesh
//     T     – the man's torsoSections array (root.userData.torsoSections)
//     kit   – the material kit passed to buildFigure (kit.linen used here)
//     hips  – the hips THREE.Group from root.userData.hips
//     arms  – root.userData.arms  { l, r: { sh, el, hand } }
//     rig   – root.userData.rig   { skeleton, index }
//     opts  –
//       ease     number  extra cm of ease beyond the shirt default (default 0)
//       hem      number  y at which the hem ends (default –29)
//       sleeves  bool    include half-sleeves (default true)
//
//   fitCompressionShort(kit, hips, legs, rig, opts) → [leftMesh, rightMesh]
//     Compression short: one skinned loft per leg, from the hip crease down
//     to the hem.  No torso sections needed — uses the same THIGH profile
//     as dress()'s shortLeg but with compression ease (–0.3 cm).
//     kit   – material kit (kit.linen used)
//     hips  – root.userData.hips
//     legs  – root.userData.legs  { l, r: { hip, kn } }
//     rig   – root.userData.rig
//     opts  –
//       hem   number  y to cut the leg hem (default –10, upper thigh)
//       kT    number  thigh scale from the build (default 1)
//
// All returned meshes have userData.garment = true.
// No physics objects are created; meshes are skinned to the existing skeleton.

import * as THREE from '../vendor/three/three.module.js';

// ── primitives re-imported from figure.mjs ───────────────────────────────────
// (figure.mjs exports them; we bind lazily so the module graph stays
//  acyclic and the dynamic import is deferred until first call)
let _fig = null;
async function fig() {
  if (!_fig) _fig = await import('./figure.mjs');
  return _fig;
}

// ── helpers ───────────────────────────────────────────────────────────────────
const sm01 = x => x <= 0 ? 0 : x >= 1 ? 1 : x * x * (3 - 2 * x);

// ── fitShirt ──────────────────────────────────────────────────────────────────
// Builds and skins a shirt mesh fitted to the supplied torso sections.
// Returns the skinned mesh; the caller is responsible for adding it to the
// scene and setting its material's colour / texture.
//
// NOTE: this function is async because it lazily imports figure.mjs.
export async function fitShirt(T, kit, hips, arms, rig, opts = {}) {
  const { loft, facetSkinned, UVM, dsMat } = await fig();

  const E = opts.ease || 0;         // extra ease (cm)
  const hemY = opts.hem ?? -29;     // hem height (cm, in hips-space)
  const doSleeves = opts.sleeves !== false;

  const S = y => T.find(s => s.y === y);   // exact section lookup (same as secAt)
  const s0 = S(0.0) || T[0];              // waist section fallback

  // ── chest / shoulder measurements ────────────────────────────────────────
  const chest = S(37.0) || T[Math.floor(T.length * 0.7)];
  const cR = chest.rx + 2.4 + E, cZ = chest.rz + 2.4 + E, cF = (chest.front || 0) + 1.6;
  const hipR = s0.rx + 2.8 + E, hipZ = Math.max(s0.rz, (S(-6.0) || s0).rz) + 2.6 + E;

  // ── torso up (collar to chest) ────────────────────────────────────────────
  const upYs = [56.2, 54.0, 51.0, 47.5, 43.0, 37.0, 30.0];
  const up = upYs.map(y => {
    if (y === 56.2) return { y, rx: 7.2 + E * 0.3, rz: 6.6 + E * 0.3 };
    const t = S(y) || T[0];
    return {
      y,
      rx: t.rx + 2.4 + E,
      rz: t.rz + 2.4 + E,
      front: (t.front || 0) + (y <= 43 && y >= 30 ? 1.6 : 0.3),
      back: t.back || 0,
      z: t.z || 0,
    };
  });

  // ── torso down (chest to hem) ─────────────────────────────────────────────
  const downPts = [
    [23.0, 0.012], [17.0, 0.02], [11.0, 0.03], [5.0, 0.04],
    [0.0,  0.05],  [-6.0, 0.06], [-14.0, 0.07], [-22.0, 0.08], [hemY, 0.09],
  ].filter(([y]) => y >= hemY);

  const down = downPts.map(([y, f], i) => {
    const t = T.find(q => q.y === y) || s0;
    const rz = Math.max(t.rz + 2.6 + E, cZ * 0.92, y <= 0 ? hipZ : 0);
    return {
      y,
      rx: Math.max(t.rx + 2.8 + E, cR * 0.92, y <= 0 ? hipR : 0),
      rz,
      front: Math.max(t.front || 0, cF * 0.8),
      back: (t.back || 0) + (y <= 0 ? 0.8 : 0.4),
      folds: [7, f, i * 0.4],
      locks: y === hemY ? 0.8 : 0,
    };
  });

  // ── bone-index lookup ─────────────────────────────────────────────────────
  const bi = rig.index;
  const nb = rig.skeleton.bones.length;

  const shirtWeights = (px, py, pz) => {
    const w = new Array(nb).fill(0); let rest = 1;
    ['l', 'r'].forEach(k => {
      const sh = arms[k].sh.position;
      const d = Math.hypot(px - sh.x, py - sh.y, pz - sh.z);
      const share = 0.5 * sm01(1 - d / 9);   // (kA = 1 baseline)
      w[bi['sh' + k.toUpperCase()]] = share;
      rest -= share;
    });
    w[bi.hips] = rest;
    return w;
  };

  // ── body mesh ─────────────────────────────────────────────────────────────
  const secs = [...up, ...down].sort((a, b) => b.y - a.y);
  const shirt = facetSkinned(
    loft(secs, { n: 20, metric: UVM.linen, cap: false }),
    kit.linen, hips, 1.5, rig.skeleton, shirtWeights,
  );
  shirt.userData.garment = true;

  // ── sleeves (half-length, to the elbow) ───────────────────────────────────
  if (doSleeves) {
    [-1, 1].forEach(s => {
      const k = s < 0 ? 'r' : 'l', A = arms[k];
      const slevSecs = [
        [3.0,   0.4,  0.4 ],
        [2.4,   5.8,  5.6 ],
        [0.8,   8.0,  7.8 ],
        [-2.0,  9.0,  8.8 ],
        [-8,    8.6,  8.4 ],
        [-14,   8.2,  8.0 ],
        [-20,   7.9,  7.7 ],
        [-21.5, 7.7,  7.5 ],
      ].map(([y, rx, rz], i) => ({
        y, rx: rx * (1 + E * 0.06), rz: rz * (1 + E * 0.06),
        folds: i > 3 ? [6, 0.03 * (i - 3), s] : null,
      }));
      const sl = new THREE.Mesh(
        loft(slevSecs, { n: 16, metric: UVM.linen, cap: false }),
        dsMat(kit.linen, 'linen'),
      );
      sl.userData.garment = true;
      A.sh.add(sl);
    });
  }

  return shirt;
}

// ── fitCompressionShort ───────────────────────────────────────────────────────
// Builds one skinned loft per leg from the hip crease (y = 4) down to `hem`
// (default y = –10, upper thigh — the basketball/training-short line).
// Ease is –0.3 cm so the cloth hugs the skin without intersecting it.
// Returns [leftMesh, rightMesh]; both are added to their leg hip groups
// and have userData.garment = true.
//
// THIGH profile matches figure.mjs's THIGH constant exactly.
const THIGH_PROFILE = [
  [4.0,  8.0,  8.4,  0,   0   ],
  [0,    9.6,  10.2, 0,   1.3 ],
  [-10,  9.4,  9.8,  1.1, 0   ],
  [-22,  8.2,  8.6,  0.9, 0   ],
  [-30,  7.2,  7.6,  0,   0   ],
  [-36,  6.6,  7.0,  0,   0   ],
];

export async function fitCompressionShort(kit, hips, legs, rig, opts = {}) {
  const { loft, facetSkinned, UVM } = await fig();

  const hemY = opts.hem ?? -10;      // upper-thigh hem
  const kT   = opts.kT  ?? 1;        // thigh scale (from build)
  const E    = -0.3;                  // compression ease: sits on the skin
  const nb   = rig.skeleton.bones.length;
  const bi   = rig.index;

  // interpolate a clean hem ring at hemY between the two bracketing rows
  const rows = THIGH_PROFILE.filter(r => r[0] > hemY);
  const j = THIGH_PROFILE.findIndex(r => r[0] <= hemY);
  if (j > 0) {
    const a = THIGH_PROFILE[j - 1], b = THIGH_PROFILE[j];
    const t = (a[0] - hemY) / (a[0] - b[0]);
    rows.push(a.map((v, i) => i === 0 ? hemY : v + ((b[i] || 0) - v) * t));
  }

  const meshes = [-1, 1].map(s => {
    const k = s < 0 ? 'r' : 'l', L = legs[k];
    const K = k.toUpperCase();

    // weight: blends hips → leg bone over the top ~10 cm of the garment
    const weightAt = (px, py) => {
      const w = new Array(nb).fill(0);
      const h = Math.max(0, Math.min(1, (py + 6) / 10));
      w[bi.hips] = h;
      w[bi['leg' + K]] = 1 - h;
      return w;
    };

    const secs = rows.map(([y, rx, rz, f, bk], i) => ({
      y,
      rx: rx * kT + E,
      rz: rz * kT + E,
      front: (f || 0) * kT,
      back:  (bk || 0) * kT,
      // no folds: compression fabric doesn't bunch
    }));

    const mesh = facetSkinned(
      loft(secs, { n: 16, metric: UVM.linen, cap: false }),
      kit.linen, L.hip, 1.2, rig.skeleton, weightAt,
    );
    mesh.userData.garment = true;
    return mesh;
  });

  return meshes;
}
