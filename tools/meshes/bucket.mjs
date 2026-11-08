// Where a Wish Room draft lives: the same rule as supabase/functions/wish-3d/
// fal.ts (normaliseKey, cacheKey, objectPath), in JavaScript for the tool and
// the lab page. bucket.test.mjs pins this copy to fal_test.ts's vectors; a
// change there is a change here.
import { access } from 'node:fs/promises';
import { resolve } from 'node:path';

export const DEFAULT_MODEL = 'fal-ai/hyper3d/rodin';
export const BUCKET_BASE = 'https://ewfvyrhlsanzkmozrmhs.supabase.co/storage/v1/object/public/wish-models/';

export function normaliseKey(prompt) {
  return String(prompt).toLowerCase().trim().replace(/\s+/g, ' ').replace(/[.!?,;:]+$/, '');
}

export function cacheKey(prompt, model) {
  return `${normaliseKey(prompt)}|${model}`;
}

export async function objectPath(model, key) {
  const buf = await crypto.subtle.digest('SHA-256', new TextEncoder().encode(key));
  const hex = [...new Uint8Array(buf)].map(b => b.toString(16).padStart(2, '0')).join('');
  return `${model.replace(/\//g, '-')}/${hex}.glb`;
}

export async function bucketUrl(prompt, model = DEFAULT_MODEL) {
  return BUCKET_BASE + await objectPath(model, cacheKey(prompt, model));
}

// A source argument is a file on disk, an https URL, or else a prompt.
export async function resolveSource(arg, model = DEFAULT_MODEL) {
  if (/^https?:\/\//i.test(arg)) return { kind: 'url', url: arg };
  const path = resolve(arg);
  try { await access(path); return { kind: 'file', path }; } catch (_) { /* not a file */ }
  return { kind: 'prompt', url: await bucketUrl(arg, model) };
}
