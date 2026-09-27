#!/usr/bin/env node
/*
 * Picks the next batch of platforms for the daily catalogue sweep, the
 * unattended job that re-checks each entry's URL, cooldown, reset window and
 * redeem floor against the platform's own public pages and records what it
 * found as a dated "SWEEP YYYY-MM-DD (...)" note. Read-only: this script
 * never edits data/catalog.json, it only says where to look next.
 *
 * Ordering is the same one check:catalog's review queue and the app's
 * "Needs Review First" sort use - never-verified entries first, then the
 * oldest "lastVerified" - so the whole catalogue rotates through the sweep
 * at BATCH_SIZE a day (about a month per lap at the default) instead of the
 * sweep re-checking the same never-verified handful every morning. An entry
 * whose notes already carry a SWEEP note dated inside SKIP_DAYS is skipped:
 * a login-gated site that the sweep could not read yesterday will not read
 * today either, and it should not crowd out the rest of the queue. It comes
 * back around once the skip window passes.
 *
 * Usage:  node scripts/sweep-batch.js [--size N] [--skip-days D] [--json]
 */

const fs = require('fs');
const path = require('path');
const ROOT = path.resolve(__dirname, '..');
const CATALOG_PATH = path.join(ROOT, 'data', 'catalog.json');

const DEFAULT_BATCH_SIZE = 6;
const DEFAULT_SKIP_DAYS = 14;
const DAY_MS = 24 * 60 * 60 * 1000;

function readArg(name, fallback) {
  const i = process.argv.indexOf(name);
  if (i === -1 || i === process.argv.length - 1) return fallback;
  const n = Number(process.argv[i + 1]);
  return Number.isInteger(n) && n > 0 ? n : fallback;
}

function daysSince(dateText) {
  if (typeof dateText !== 'string' || !/^\d{4}-\d{2}-\d{2}$/.test(dateText)) return Infinity;
  const ms = Date.now() - new Date(dateText + 'T00:00:00Z').getTime();
  return Number.isFinite(ms) ? ms / DAY_MS : Infinity;
}

// The most recent sweep date recorded in the notes, or null. Notes are free
// text, so this only looks for the exact "SWEEP YYYY-MM-DD" marker the sweep
// writes; a hand-written note that happens to mention a sweep is ignored.
function lastSweepDate(notes) {
  if (typeof notes !== 'string') return null;
  const dates = [...notes.matchAll(/\bSWEEP (\d{4}-\d{2}-\d{2})\b/g)].map(m => m[1]);
  return dates.length ? dates.sort().pop() : null;
}

function main() {
  const size = readArg('--size', DEFAULT_BATCH_SIZE);
  const skipDays = readArg('--skip-days', DEFAULT_SKIP_DAYS);
  const asJson = process.argv.includes('--json');
  const catalog = JSON.parse(fs.readFileSync(CATALOG_PATH, 'utf8'));

  const rows = catalog.map((entry, index) => ({
    index,
    name: entry.name,
    tier: entry.tier || 'Unranked',
    url: entry.url,
    lastVerified: entry.lastVerified || null,
    verifiedAge: daysSince(entry.lastVerified),
    lastSweep: lastSweepDate(entry.notes)
  }));

  const eligible = rows.filter(r => daysSince(r.lastSweep) >= skipDays);
  const skipped = rows.length - eligible.length;
  eligible.sort((a, b) => b.verifiedAge - a.verifiedAge || a.index - b.index);
  const batch = eligible.slice(0, size);

  if (asJson) {
    process.stdout.write(JSON.stringify(batch, null, 2) + '\n');
    return;
  }

  console.log(`Sweep batch: ${batch.length} of ${rows.length} entries (${skipped} skipped, swept within ${skipDays} days).`);
  console.log('Never-verified first, then oldest lastVerified:\n');
  batch.forEach(r => {
    const verified = r.lastVerified ? `verified ${r.lastVerified}` : 'never verified';
    const swept = r.lastSweep ? `, last sweep ${r.lastSweep}` : '';
    console.log(`  [${r.tier}] entry ${r.index + 1} (${r.name}): ${verified}${swept}`);
    console.log(`      ${r.url}`);
  });
  if (!batch.length) console.log('  (nothing eligible - every entry was swept recently)');
}

main();
