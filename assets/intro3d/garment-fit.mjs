// garment-fit.mjs — separable shirt/top loft fitted to any procedural man's
// torso sections.  Reads the same T-array that figure.mjs builds and uses the
// same loft / facetSkinned primitives, so the result is identical to dress()'s
// shirt block but callable from outside buildFigure.
//
// Exports
//   fitShirt(T, kit, hips, arms, rig, opts) → SkinnedMesh
//     T     – the man's torsoSections array (root.userData.torsoSections)
//     kit   – the material kit passed to buildFigure (kit.linen used here)
//     hips  – the hips THREE.Group from root.userData.hips
//     arms  – root.userData.arms  { l, r: { sh, el, hand } }
//     rig   – root.userData.rig   { skeleton, index }
//     opts  –
//       ease  number  extra cm of ease beyond the shirt default (default 0)
//       hem   number  y at which the hem ends (default –29)
//       sleeves bool  include half-sleeves (default true)
//
// The returned mesh has userData.garment = true so the lab's garment-view
// toggle works, and is already added to hips by the caller (not here).
//
// No physics objects are created.  The mesh is skinned to the existing
// skeleton; nothing is added to the physics world.

import * as THREE from '../vendor/three/three.module.js';
import { outlineOf } from './burin.mjs';

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
