import test from 'node:test';
import assert from 'node:assert/strict';
import { createHash } from 'node:crypto';
import { BUCKET_BASE, DEFAULT_MODEL, bucketUrl, cacheKey, normaliseKey, objectPath, resolveSource } from './bucket.mjs';

test('normalise and key match fal.ts', () => {
  assert.equal(normaliseKey('  A  Birthday   CAKE!! '), 'a birthday cake');
  assert.equal(normaliseKey('🍩 donuts'), '🍩 donuts');
  assert.equal(cacheKey('Pizza', DEFAULT_MODEL), 'pizza|fal-ai/hyper3d/rodin');
});

test('objectPath is the model slug over the sha256 of the key', async () => {
  const key = 'pizza|fal-ai/hyper3d/rodin';
  const hex = createHash('sha256').update(key).digest('hex');
  assert.equal(await objectPath(DEFAULT_MODEL, key), `fal-ai-hyper3d-rodin/${hex}.glb`);
  assert.equal(await bucketUrl('Pizza'), BUCKET_BASE + `fal-ai-hyper3d-rodin/${hex}.glb`);
});

test('resolveSource tells a file, a url and a prompt apart', async () => {
  assert.equal((await resolveSource('https://x/y.glb', DEFAULT_MODEL)).kind, 'url');
  const file = await resolveSource('./bucket.mjs', DEFAULT_MODEL);
  assert.equal(file.kind, 'file');
  assert.ok(file.path.endsWith('bucket.mjs'));
  const prompt = await resolveSource('a trophy', DEFAULT_MODEL);
  assert.equal(prompt.kind, 'prompt');
  assert.ok(prompt.url.startsWith(BUCKET_BASE));
});
