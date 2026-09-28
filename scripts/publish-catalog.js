#!/usr/bin/env node
/*
 * Publishes data/catalog.json to the database: the same publish as the
 * admin page's Publish Catalogue button, for GitHub Actions. The Publish
 * catalogue workflow (.github/workflows/publish-catalog.yml) runs it on every
 * push to main that changes the catalogue, so a merged catalogue edit goes
 * live without anyone picking a file.
 *
 * It authenticates with a publish key instead of the owner's session. The
 * database's publish_catalog_with_key() checks the key against the SHA-256
 * hashes in catalog_publish_keys, then runs the owner's publish unchanged
 * (supabase/migrations/20260928153000_catalog_publish_key.sql). The project
 * URL and the public anon key are read from index.html, so each has one copy.
 *
 * Usage:  CATALOG_PUBLISH_KEY=... node scripts/publish-catalog.js
 * Publishing an unchanged file does nothing and still exits 0.
 */

const fs = require('fs');
const path = require('path');
const ROOT = path.resolve(__dirname, '..');

// Reads a `const NAME = '...'` string literal out of index.html's inline script.
function readConst(html, name) {
  const match = html.match(new RegExp(`const ${name} = '([^']+)'`));
  return match ? match[1] : null;
}

async function main() {
  const key = process.env.CATALOG_PUBLISH_KEY;
  if (!key) {
    console.error('CATALOG_PUBLISH_KEY is not set - add it as a repository secret (README, "The catalogue").');
    process.exit(1);
  }
  const html = fs.readFileSync(path.join(ROOT, 'index.html'), 'utf8');
  const url = process.env.SUPABASE_URL || readConst(html, 'SUPABASE_URL');
  const anonKey = process.env.SUPABASE_ANON_KEY || readConst(html, 'SUPABASE_ANON_KEY');
  if (!url || !anonKey) {
    console.error('Could not find SUPABASE_URL and SUPABASE_ANON_KEY in index.html.');
    process.exit(1);
  }
  const catalog = JSON.parse(fs.readFileSync(path.join(ROOT, 'data', 'catalog.json'), 'utf8'));

  const res = await fetch(`${url}/rest/v1/rpc/publish_catalog_with_key`, {
    method: 'POST',
    headers: { apikey: anonKey, Authorization: `Bearer ${anonKey}`, 'Content-Type': 'application/json' },
    body: JSON.stringify({ p_key: key, p_catalog: catalog })
  });
  const text = await res.text();
  let data = null;
  try { data = JSON.parse(text); } catch (e) { data = null; }
  if (!res.ok || !data || typeof data.version !== 'string') {
    const message = data && data.message ? data.message : text.slice(0, 300);
    console.error(`Publish failed (HTTP ${res.status}): ${message}`);
    process.exit(1);
  }
  if (data.entries !== catalog.length) {
    console.error(`Publish stored ${data.entries} platforms from a ${catalog.length}-platform file.`);
    process.exit(1);
  }
  const dropped = Array.isArray(data.droppedFields) ? data.droppedFields : [];
  if (dropped.length) console.log(`::warning::Not published (unknown fields): ${dropped.join(', ')}`);
  console.log(data.changed
    ? `Published ${data.entries} platforms (${data.referralLinks} with referral links kept server-side). Version ${data.version.slice(0, 8)}.`
    : `Already live: ${data.entries} platforms, version ${data.version.slice(0, 8)}. Nothing changed.`);
}

main().catch((err) => {
  console.error(`Publish failed: ${err && err.message ? err.message : err}`);
  process.exit(1);
});
