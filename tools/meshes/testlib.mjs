// Synthetic documents for the tests: a textured cube and a flat sheet of
// many triangles, built with gltf-transform's own API so no fixture binary is
// needed for the optimiser's tests.
import { Document, getBounds } from '@gltf-transform/core';
import sharp from 'sharp';

// (a gradient, not a flat colour: prune() folds a solid texture into the
// material's factor, which is right for real assets and wrong for a test)
async function squareImage(px, format) {
  const raw = Buffer.alloc(px * px * 3);
  for (let y = 0; y < px; y++) for (let x = 0; x < px; x++) { const i = (y * px + x) * 3; raw[i] = (x * 255 / px) | 0; raw[i + 1] = (y * 255 / px) | 0; raw[i + 2] = 96; }
  const img = sharp(raw, { raw: { width: px, height: px, channels: 3 } });
  if (format === 'webp') return { bytes: new Uint8Array(await img.webp({ quality: 80 }).toBuffer()), mime: 'image/webp' };
  if (format === 'webp-lossless') return { bytes: new Uint8Array(await img.webp({ lossless: true }).toBuffer()), mime: 'image/webp' };
  return { bytes: new Uint8Array(await img.png().toBuffer()), mime: 'image/png' };
}

function cubeArrays(size) {
  const h = size / 2;
  const faces = [
    [[1, 0, 0], [0, 0, 1], [0, 1, 0]], [[-1, 0, 0], [0, 0, -1], [0, 1, 0]],
    [[0, 1, 0], [1, 0, 0], [0, 0, 1]], [[0, -1, 0], [1, 0, 0], [0, 0, -1]],
    [[0, 0, 1], [-1, 0, 0], [0, 1, 0]], [[0, 0, -1], [1, 0, 0], [0, 1, 0]],
  ];
  const pos = [], nor = [], uv = [], idx = [];
  faces.forEach(([n, u, v], f) => {
    const base = f * 4;
    for (const [su, sv] of [[-1, -1], [1, -1], [1, 1], [-1, 1]]) {
      pos.push(h * (n[0] + su * u[0] + sv * v[0]), h * (n[1] + su * u[1] + sv * v[1]), h * (n[2] + su * u[2] + sv * v[2]));
      nor.push(...n); uv.push((su + 1) / 2, (sv + 1) / 2);
    }
    idx.push(base, base + 1, base + 2, base, base + 2, base + 3);
  });
  return { pos: new Float32Array(pos), nor: new Float32Array(nor), uv: new Float32Array(uv), idx: new Uint16Array(idx) };
}

// A cube of `size` metres centred on the origin, with a square texture of
// `texPx` on its base colour. 12 triangles.
export async function makeTexturedCube({ size = 2, texPx = 2048, format = 'png' } = {}) {
  const doc = new Document();
  const buffer = doc.createBuffer();
  const { pos, nor, uv, idx } = cubeArrays(size);
  const prim = doc.createPrimitive()
    .setAttribute('POSITION', doc.createAccessor().setType('VEC3').setArray(pos).setBuffer(buffer))
    .setAttribute('NORMAL', doc.createAccessor().setType('VEC3').setArray(nor).setBuffer(buffer))
    .setAttribute('TEXCOORD_0', doc.createAccessor().setType('VEC2').setArray(uv).setBuffer(buffer))
    .setIndices(doc.createAccessor().setType('SCALAR').setArray(idx).setBuffer(buffer));
  const { bytes, mime } = await squareImage(texPx, format);
  const tex = doc.createTexture('color').setImage(bytes).setMimeType(mime);
  prim.setMaterial(doc.createMaterial('mat').setBaseColorTexture(tex));
  const mesh = doc.createMesh('cube').addPrimitive(prim);
  const node = doc.createNode('cube').setMesh(mesh);
  doc.createScene('scene').addChild(node);
  return doc;
}

// A flat sheet of at least `n` triangles (a k x k grid of quads) with no
// texture, so weld and simplify have real adjacency to work on.
export function makeManyTriangles(n) {
  const k = Math.max(1, Math.ceil(Math.sqrt(n / 2)));
  const pos = [], idx = [];
  for (let j = 0; j <= k; j++) for (let i = 0; i <= k; i++) pos.push(i / k - 0.5, Math.sin(i * 0.7) * Math.cos(j * 0.5) * 0.05, j / k - 0.5);
  for (let j = 0; j < k; j++) for (let i = 0; i < k; i++) {
    const a = j * (k + 1) + i, b = a + 1, c = a + k + 1, d = c + 1;
    idx.push(a, c, b, b, c, d);
  }
  const doc = new Document();
  const buffer = doc.createBuffer();
  const Idx = pos.length / 3 > 65535 ? Uint32Array : Uint16Array;
  const prim = doc.createPrimitive()
    .setAttribute('POSITION', doc.createAccessor().setType('VEC3').setArray(new Float32Array(pos)).setBuffer(buffer))
    .setIndices(doc.createAccessor().setType('SCALAR').setArray(new Idx(idx)).setBuffer(buffer));
  prim.setMaterial(doc.createMaterial('plain'));
  const node = doc.createNode('sheet').setMesh(doc.createMesh('sheet').addPrimitive(prim));
  doc.createScene('scene').addChild(node);
  return doc;
}

export function bounds(document) {
  return getBounds(document.getRoot().getDefaultScene() || document.getRoot().listScenes()[0]);
}
