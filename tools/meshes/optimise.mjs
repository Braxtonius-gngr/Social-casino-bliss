// The optimise step: a generated mesh to an asset a phone can load. Order:
// dedup, prune, weld, simplify to the triangle budget (skipped when already
// under), textures capped and turned to WebP, centred with the base on
// y = 0, scaled to a real height, pruned again. No meshopt, Draco or KTX2:
// the vendored three.js reads WebP with nothing added, and on a Rodin mesh
// the textures are nearly all of the weight anyway.
import { getBounds } from '@gltf-transform/core';
import { center, dedup, prune, simplify, textureCompress, weld } from '@gltf-transform/functions';
import { MeshoptSimplifier } from 'meshoptimizer';
import sharp from 'sharp';

export const DEFAULT_BUDGET = { tris: 12000, tex: 1024, bytes: 1_000_000 };
export const CEILING_BYTES = 3_000_000;
// simplify's error bound is a fraction of the mesh's radius; the ladder is
// tried in order until the triangle budget is met, so a smooth surface keeps
// its shape and a noisy one still gets under budget.
export const SIMPLIFY_ERRORS = [0.001, 0.0025, 0.005, 0.01, 0.02, 0.05];
export const WEBP_QUALITY = 80;

export function simplifyRatio(current, budget) {
  return current <= budget ? null : budget / current;
}

function sceneOf(document) {
  const root = document.getRoot();
  return root.getDefaultScene() || root.listScenes()[0];
}

export function triangleCount(document) {
  let n = 0;
  for (const mesh of document.getRoot().listMeshes()) {
    for (const prim of mesh.listPrimitives()) {
      const mode = prim.getMode();
      const idx = prim.getIndices();
      const count = idx ? idx.getCount() : (prim.getAttribute('POSITION')?.getCount() || 0);
      if (mode === 4 || mode === undefined) n += Math.floor(count / 3);
      else if (mode === 5 || mode === 6) n += Math.max(0, count - 2); // strips and fans
    }
  }
  return n;
}

// Strips and fans become plain triangles, so the simplifier (which skips
// them) and the check (which counts them) see one kind of primitive.
export function triangulate(document) {
  for (const mesh of document.getRoot().listMeshes()) {
    for (const prim of mesh.listPrimitives()) {
      const mode = prim.getMode();
      if (mode !== 5 && mode !== 6) continue;
      const idx = prim.getIndices();
      const count = idx ? idx.getCount() : (prim.getAttribute('POSITION')?.getCount() || 0);
      const at = i => (idx ? idx.getScalar(i) : i);
      const out = [];
      for (let i = 2; i < count; i++) {
        if (mode === 5) { const flip = i % 2 === 1; out.push(at(i - 2), at(flip ? i : i - 1), at(flip ? i - 1 : i)); }
        else out.push(at(0), at(i - 1), at(i));
      }
      const Arr = Math.max(...out, 0) > 65535 ? Uint32Array : Uint16Array;
      const buffer = (idx && idx.getBuffer()) || document.getRoot().listBuffers()[0] || document.createBuffer();
      prim.setIndices(document.createAccessor().setType('SCALAR').setArray(new Arr(out)).setBuffer(buffer)).setMode(4);
      if (idx && idx.listParents().length <= 1) idx.dispose();
    }
  }
}

const SLOTS = ['baseColorTexture', 'emissiveTexture', 'normalTexture', 'metallicRoughnessTexture', 'occlusionTexture'];

// (gltf-transform reads PNG and JPEG sizes itself but not WebP's without its
// IO extensions, so the size comes from sharp, which reads them all)
async function textureSize(tex) {
  const image = tex.getImage();
  if (!image) return 0;
  try { const m = await sharp(Buffer.from(image)).metadata(); return Math.max(m.width || 0, m.height || 0); } catch (_) { const s = tex.getSize(); return s ? Math.max(s[0], s[1]) : 0; }
}

export async function readStats(document) {
  const textures = [];
  for (const tex of document.getRoot().listTextures()) {
    const size = await textureSize(tex);
    const slots = new Set();
    for (const mat of document.getRoot().listMaterials()) {
      for (const slot of SLOTS) {
        const getter = 'get' + slot[0].toUpperCase() + slot.slice(1);
        if (typeof mat[getter] === 'function' && mat[getter]() === tex) slots.add(slot);
      }
    }
    const slot = slots.size ? [...slots].sort()[0] : 'texture';
    textures.push({ slot, size });
  }
  textures.sort((a, b) => a.slot.localeCompare(b.slot));
  return { triangles: triangleCount(document), textures };
}

export async function optimise(document, { budget = DEFAULT_BUDGET, height } = {}) {
  const trianglesBefore = triangleCount(document);
  triangulate(document);
  await document.transform(dedup(), prune(), weld());
  let simplifyError = null;
  for (const error of SIMPLIFY_ERRORS) {
    const ratio = simplifyRatio(triangleCount(document), budget.tris);
    if (ratio === null) break;
    await MeshoptSimplifier.ready;
    await document.transform(simplify({ simplifier: MeshoptSimplifier, ratio, error }));
    simplifyError = error;
  }
  if (document.getRoot().listTextures().length) {
    await document.transform(textureCompress({ encoder: sharp, targetFormat: 'webp', resize: [budget.tex, budget.tex], quality: WEBP_QUALITY }));
  }
  await document.transform(center({ pivot: 'below' }));
  if (height) {
    const b = getBounds(sceneOf(document));
    const h = b.max[1] - b.min[1];
    if (h > 0) {
      // scale the scene's root nodes about the origin (S x M on each), so a
      // multi-node source keeps its parts in proportion - scaling vertices
      // alone would leave the nodes' translations where they were
      const k = height / h;
      for (const node of sceneOf(document).listChildren()) {
        const m = node.getMatrix().slice();
        // S x M, column-major: every x, y, z row entry, the translation too
        for (const i of [0, 1, 2, 4, 5, 6, 8, 9, 10, 12, 13, 14]) m[i] *= k;
        node.setMatrix(m);
      }
      await document.transform(center({ pivot: 'below' }));
    }
  }
  await document.transform(prune());
  const stats = await readStats(document);
  const b = getBounds(sceneOf(document));
  return { document, stats: { trianglesBefore, ...stats, simplifyError, height: +(b.max[1] - b.min[1]).toFixed(4) } };
}
