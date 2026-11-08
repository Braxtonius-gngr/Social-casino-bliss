// node --test scripts/check-meshes.test.js
const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('fs');
const path = require('path');
const { checkDir, readGlb, triangleCount, imageSizes, webpSize } = require('./check-meshes.js');

const FIX = path.resolve(__dirname, '..', 'tools', 'meshes', 'fixtures');
const problemsOf = (name) => checkDir(path.join(FIX, name)).problems;

test('good, lossless and extended fixtures pass', () => {
  for (const name of ['good', 'lossless', 'extended']) assert.deepEqual(problemsOf(name), [], name);
  assert.equal(checkDir(path.join(FIX, 'good')).checked, 1);
});

test('over-tris names the triangle budget', () => {
  const p = problemsOf('over-tris');
  assert.equal(p.length, 1);
  assert.match(p[0], /triangles/);
  assert.match(p[0], /12000/);
});

test('draco is refused as unreadable by the vendored loader', () => {
  assert.match(problemsOf('draco').join('\n'), /KHR_draco_mesh_compression/);
});

test('png is refused', () => {
  assert.match(problemsOf('png').join('\n'), /image\/png/);
});

test('an orphan file and a missing file are both reported', () => {
  assert.match(problemsOf('orphan').join('\n'), /stray\.glb.*no manifest row/);
  assert.match(problemsOf('missing').join('\n'), /ghost.*does not exist/);
});

test('a directory with no meshes yet is fine', () => {
  const dir = fs.mkdtempSync(path.join(require('os').tmpdir(), 'nomesh-'));
  assert.deepEqual(checkDir(dir).problems, []);
  assert.deepEqual(checkDir(path.join(dir, 'never-made')).problems, []);
});

test('webpSize reads VP8, VP8L and VP8X headers, and the glb helpers agree with the manifest', () => {
  for (const [name, tag] of [['good', 'VP8 '], ['lossless', 'VP8L'], ['extended', 'VP8X']]) {
    const { json, bin } = readGlb(fs.readFileSync(path.join(FIX, name, 'cube.glb')));
    const [img] = imageSizes(json, bin);
    assert.equal(img.mimeType, 'image/webp');
    assert.equal(img.width, 64, name); assert.equal(img.height, 64, name);
    const view = img.bytes;
    assert.equal(Buffer.from(view.subarray(12, 16)).toString('latin1'), tag, name);
    assert.deepEqual(webpSize(view), { width: 64, height: 64 });
    assert.equal(triangleCount(json), 12);
  }
  assert.equal(webpSize(new Uint8Array(10)), null);
});

test('triangleCount counts strips and fans as count minus two', () => {
  const json = { accessors: [{ count: 30002 }, { count: 7 }, { count: 300 }], meshes: [{ primitives: [{ mode: 5, indices: 0 }, { mode: 6, attributes: { POSITION: 1 } }, { indices: 2 }, { mode: 1, indices: 2 }] }] };
  assert.equal(triangleCount(json), 30000 + 5 + 100);
});
