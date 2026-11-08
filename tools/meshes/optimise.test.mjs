import test from 'node:test';
import assert from 'node:assert/strict';
import { mkdtemp, readFile, stat } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { CEILING_BYTES, DEFAULT_BUDGET, optimise, readStats, simplifyRatio } from './optimise.mjs';
import { keep } from './keep.mjs';
import { bounds, makeManyTriangles, makeTexturedCube } from './testlib.mjs';

test('simplifyRatio skips when already under budget', () => {
  assert.equal(simplifyRatio(8000, 12000), null);
  assert.equal(simplifyRatio(12000, 12000), null);
  assert.equal(simplifyRatio(24000, 12000), 0.5);
  assert.equal(CEILING_BYTES, 3_000_000);
});

test('a cube already under budget keeps its 12 triangles, gets a 1024 WebP, sits on y=0 at the asked height', async () => {
  const { document, stats } = await optimise(await makeTexturedCube({ texPx: 2048 }), { budget: DEFAULT_BUDGET, height: 0.5 });
  assert.equal(stats.trianglesBefore, 12);
  assert.equal(stats.triangles, 12);
  assert.deepEqual(stats.textures, [{ slot: 'baseColorTexture', size: 1024 }]);
  assert.equal(document.getRoot().listTextures()[0].getMimeType(), 'image/webp');
  const b = bounds(document);
  assert.ok(Math.abs(b.min[1]) < 1e-5, `base at ${b.min[1]}`);
  assert.ok(Math.abs((b.max[1] - b.min[1]) - 0.5) < 1e-5, `height ${b.max[1] - b.min[1]}`);
  assert.ok(Math.abs(b.min[0] + b.max[0]) < 1e-5 && Math.abs(b.min[2] + b.max[2]) < 1e-5, 'centred in x and z');
});

test('a mesh over the triangle budget is simplified under it', async () => {
  const { stats } = await optimise(makeManyTriangles(30000), { budget: { ...DEFAULT_BUDGET, tris: 12000 } });
  assert.ok(stats.trianglesBefore >= 30000);
  assert.ok(stats.triangles <= 12000 && stats.triangles > 1000, String(stats.triangles));
});

test('a mesh with no textures keeps with textures: []', async () => {
  const { stats } = await optimise(makeManyTriangles(100), { budget: DEFAULT_BUDGET });
  assert.deepEqual(stats.textures, []);
  assert.deepEqual((await readStats((await optimise(makeManyTriangles(100), { budget: DEFAULT_BUDGET })).document)).textures, []);
});

test('keep writes the file and the manifest row, and refuses a second keep without --force', async () => {
  const root = await mkdtemp(join(tmpdir(), 'meshes-'));
  const src = join(root, 'src.glb');
  const { NodeIO } = await import('@gltf-transform/core');
  await new NodeIO().write(src, await makeTexturedCube({ texPx: 512 }));
  const row = await keep({ source: src, name: 'test-cube', height: 0.3, root });
  const glb = join(root, 'assets/intro3d/rare/meshes/test-cube.glb');
  assert.equal((await stat(glb)).size, row.bytes);
  const manifest = JSON.parse(await readFile(join(root, 'assets/intro3d/rare/meshes/manifest.json'), 'utf8'));
  assert.equal(manifest.length, 1);
  assert.equal(manifest[0].name, 'test-cube');
  assert.equal(manifest[0].triangles, 12);
  assert.equal(manifest[0].height, 0.3);
  assert.deepEqual(manifest[0].budget, DEFAULT_BUDGET);
  assert.equal(manifest[0].source, src);
  assert.match(manifest[0].kept, /^\d{4}-\d{2}-\d{2}$/);
  await assert.rejects(keep({ source: src, name: 'test-cube', root }), /--force/);
  await keep({ source: src, name: 'test-cube', root, force: true });
  assert.equal(JSON.parse(await readFile(join(root, 'assets/intro3d/rare/meshes/manifest.json'), 'utf8')).length, 1);
  await assert.rejects(keep({ source: src, name: 'Bad Name', root }), /name/);
});
