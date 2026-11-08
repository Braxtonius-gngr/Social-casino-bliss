// Builds the check script's fixtures (run once; the outputs are committed):
// each folder is a meshes directory with its own manifest.json.
import { mkdir, writeFile } from 'node:fs/promises';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { NodeIO } from '@gltf-transform/core';
import { ALL_EXTENSIONS } from '@gltf-transform/extensions';
import { DEFAULT_BUDGET, optimise } from '../optimise.mjs';
import { makeManyTriangles, makeTexturedCube } from '../testlib.mjs';

const here = dirname(fileURLToPath(import.meta.url));
const io = new NodeIO().registerExtensions(ALL_EXTENSIONS);
const row = (name, bytes, over = {}) => ({ name, prompt: 'fixture', model: 'fal-ai/hyper3d/rodin', source: 'fixture', seed: null, triangles: 12, textures: [], bytes, budget: { ...DEFAULT_BUDGET }, height: 0.2, kept: '2026-11-08', ...over });

async function folder(name, files, rows) {
  const dir = join(here, name);
  await mkdir(dir, { recursive: true });
  for (const [file, bytes] of Object.entries(files)) await writeFile(join(dir, file), bytes);
  await writeFile(join(dir, 'manifest.json'), JSON.stringify(rows, null, 2) + '\n');
}

const cube = async (format, px = 64) => {
  const { document } = await optimise(await makeTexturedCube({ texPx: px, format }), { budget: { ...DEFAULT_BUDGET, tex: px }, height: 0.2 });
  return io.writeBinary(document);
};

// good: a lossy WebP cube under budget
const good = await cube('webp');
await folder('good', { 'cube.glb': good }, [row('cube', good.byteLength, { textures: [{ slot: 'baseColorTexture', size: 64 }] })]);

// lossless: textureCompress with lossless WebP (VP8L)
{
  const { document } = await optimise(await makeTexturedCube({ texPx: 64, format: 'webp-lossless' }), { budget: { ...DEFAULT_BUDGET, tex: 64 }, height: 0.2 });
  // re-encode the texture losslessly so the header is VP8L
  const sharp = (await import('sharp')).default;
  for (const t of document.getRoot().listTextures()) t.setImage(new Uint8Array(await sharp(Buffer.from(t.getImage())).webp({ lossless: true }).toBuffer())).setMimeType('image/webp');
  const bytes = await io.writeBinary(document);
  await folder('lossless', { 'cube.glb': bytes }, [row('cube', bytes.byteLength, { textures: [{ slot: 'baseColorTexture', size: 64 }] })]);
}

// extended: a VP8X header (an alpha channel forces the extended container)
{
  const { document } = await optimise(await makeTexturedCube({ texPx: 64, format: 'webp' }), { budget: { ...DEFAULT_BUDGET, tex: 64 }, height: 0.2 });
  const sharp = (await import('sharp')).default;
  // (a varying alpha channel makes libwebp write the extended VP8X container)
  const px = 64, rgba = Buffer.alloc(px * px * 4);
  for (let i = 0; i < px * px; i++) { rgba[i * 4] = (i % px) * 4; rgba[i * 4 + 1] = 90; rgba[i * 4 + 2] = 160; rgba[i * 4 + 3] = 40 + ((i / px) | 0) * 3; }
  for (const t of document.getRoot().listTextures()) t.setImage(new Uint8Array(await sharp(rgba, { raw: { width: px, height: px, channels: 4 } }).webp({ quality: 80 }).toBuffer())).setMimeType('image/webp');
  const bytes = await io.writeBinary(document);
  await folder('extended', { 'cube.glb': bytes }, [row('cube', bytes.byteLength, { textures: [{ slot: 'baseColorTexture', size: 64 }] })]);
}

// over-tris: a 14k-triangle sheet with a row budget of 12k (not optimised)
{
  const bytes = await io.writeBinary(makeManyTriangles(14000));
  await folder('over-tris', { 'sheet.glb': bytes }, [row('sheet', bytes.byteLength, { triangles: 14112, budget: { ...DEFAULT_BUDGET, tris: 12000 } })]);
}

// draco: the good cube's JSON chunk with extensionsRequired spliced in
{
  const json = JSON.parse(new TextDecoder().decode(good.subarray(20, 20 + new DataView(good.buffer, good.byteOffset + 12, 4).getUint32(0, true))));
  json.extensionsRequired = ['KHR_draco_mesh_compression'];
  const jsonBytes = new TextEncoder().encode(JSON.stringify(json));
  const pad = (4 - (jsonBytes.length % 4)) % 4;
  const jsonChunk = new Uint8Array(jsonBytes.length + pad).fill(0x20); jsonChunk.set(jsonBytes);
  const jsonLen = new DataView(good.buffer, good.byteOffset + 12, 4).getUint32(0, true);
  const rest = good.subarray(20 + jsonLen); // the BIN chunk header and data
  const out = new Uint8Array(12 + 8 + jsonChunk.length + rest.length);
  const dv = new DataView(out.buffer);
  dv.setUint32(0, 0x46546C67, true); dv.setUint32(4, 2, true); dv.setUint32(8, out.length, true);
  dv.setUint32(12, jsonChunk.length, true); dv.setUint32(16, 0x4E4F534A, true);
  out.set(jsonChunk, 20); out.set(rest, 20 + jsonChunk.length);
  await folder('draco', { 'cube.glb': out }, [row('cube', out.byteLength)]);
}

// png: a PNG texture left as is
{
  const bytes = await io.writeBinary(await makeTexturedCube({ texPx: 64, format: 'png' }));
  await folder('png', { 'cube.glb': bytes }, [row('cube', bytes.byteLength)]);
}

// orphan: a second file with no row
await folder('orphan', { 'cube.glb': good, 'stray.glb': good }, [row('cube', good.byteLength, { textures: [{ slot: 'baseColorTexture', size: 64 }] })]);

// missing: a row with no file
await folder('missing', { 'cube.glb': good }, [row('cube', good.byteLength, { textures: [{ slot: 'baseColorTexture', size: 64 }] }), row('ghost', 123)]);

console.log('fixtures built');
