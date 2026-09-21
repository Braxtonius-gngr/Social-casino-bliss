#!/usr/bin/env node
/*
 * Validates data/catalog.js (CATALOG_DATA) without touching its browser-
 * facing format: it's a classic script (`const CATALOG_DATA = [...]`, no
 * export, no module wrapper), loaded in the browser via a plain
 * <script src>. To read the array's value in Node without changing that,
 * this runs the file's source in a fresh vm context with one bare
 * `CATALOG_DATA` expression appended as the final statement - vm returns
 * the value of the last-evaluated expression, the same trick `const`/`let`
 * relies on for being reachable by later classic <script> tags in a page
 * without ever becoming a `window` property. No dependencies: only Node's
 * built-in `vm`, `fs`, and `path`.
 *
 * Two severities:
 *   - FAILURES: a record's own data is malformed (missing/invalid name,
 *     invalid URL, non-finite or out-of-range numbers, or a malformed/
 *     future "lastVerified" date). These fail the check (exit 1) - they
 *     are unambiguously bugs.
 *   - WARNINGS: duplicate names or duplicate normalized domains. These are
 *     printed but do NOT fail the check, because a repeated domain can be
 *     legitimate here (e.g. two catalog entries deliberately tracking two
 *     different cooldowns on the same platform under different names).
 *     Surfaced for a human to judge, not auto-treated as bugs - this
 *     script never edits catalog data itself.
 *
 * Also prints a review queue: entries whose optional "lastVerified"
 * ("YYYY-MM-DD") is missing or older than REVIEW_STALE_DAYS, oldest/never-
 * verified first. A 140+ entry catalog of cooldowns and SC values rots
 * quietly - dead sites, changed reset windows, stale referral links - and
 * a wrong timer is worse than no timer, so this is the boring nudge to go
 * re-check the platforms most overdue for it. Informational, not a
 * failure: nothing here is a bug in the record itself.
 */

const fs = require('fs');
const path = require('path');
const vm = require('vm');

const ROOT = path.resolve(__dirname, '..');
const CATALOG_PATH = path.join(ROOT, 'data', 'catalog.js');

function loadCatalogData() {
  const source = fs.readFileSync(CATALOG_PATH, 'utf8');
  const script = new vm.Script(`${source}\nCATALOG_DATA`, { filename: CATALOG_PATH });
  return script.runInNewContext({}, { timeout: 5000 });
}

// Same normalization the app itself uses (see domainOf()/rootOf() in
// index.html) to decide whether two URLs point at "the same platform".
function normalizeDomain(rawUrl) {
  try {
    const host = new URL(rawUrl).hostname.toLowerCase()
      .replace(/^(www\.|m\.|wap\.|play\.|fun\.|game\.|app\.)/, '');
    const parts = host.split('.');
    return parts.length >= 2 ? parts.slice(-2).join('.') : host;
  } catch (e) {
    return null;
  }
}

// The provenance values a dailySC may carry. Missing means inherited from the
// original sheets and unsourced, which is why captureNeeded below will not
// treat such a rate as verified.
const SC_SOURCES = ['measured', 'stated', 'ladder-full', 'ladder-partial',
                    'wheel', 'midpoint', 'third-party', 'gated'];

function hasSourcedRate(entry) {
  return isFiniteNumber(entry.dailySC) && entry.dailySC > 0 && SC_SOURCES.includes(entry.scSource);
}

function isFiniteNumber(v) {
  return typeof v === 'number' && Number.isFinite(v);
}

function validateEntry(entry, index, failures) {
  const label = `entry ${index + 1}${entry && typeof entry.name === 'string' && entry.name ? ` (${entry.name})` : ''}`;

  if (!entry || typeof entry !== 'object') {
    failures.push(`${label}: not an object`);
    return;
  }

  if (typeof entry.name !== 'string' || entry.name.trim() === '') {
    failures.push(`${label}: field "name" must be a non-empty string`);
  }

  if (typeof entry.url !== 'string' || entry.url.trim() === '') {
    failures.push(`${label}: field "url" must be a non-empty string`);
  } else {
    try {
      const parsed = new URL(entry.url);
      if (parsed.protocol !== 'http:' && parsed.protocol !== 'https:') {
        failures.push(`${label}: field "url" must be http(s), got "${parsed.protocol}"`);
      }
    } catch (e) {
      failures.push(`${label}: field "url" is not a valid URL ("${entry.url}")`);
    }
  }

  if (entry.dailySC !== undefined && !isFiniteNumber(entry.dailySC)) {
    failures.push(`${label}: field "dailySC" must be a finite number, got ${JSON.stringify(entry.dailySC)}`);
  }

  if (entry.resetHour !== undefined && !isFiniteNumber(entry.resetHour)) {
    failures.push(`${label}: field "resetHour" must be a finite number, got ${JSON.stringify(entry.resetHour)}`);
  }

  if (entry.reliability !== undefined) {
    if (!isFiniteNumber(entry.reliability)) {
      failures.push(`${label}: field "reliability" must be a finite number, got ${JSON.stringify(entry.reliability)}`);
    } else if (entry.reliability < 0 || entry.reliability > 100) {
      failures.push(`${label}: field "reliability" must be between 0 and 100, got ${entry.reliability}`);
    }
  }

  if (entry.cooldown !== undefined) {
    if (!isFiniteNumber(entry.cooldown)) {
      failures.push(`${label}: field "cooldown" must be a finite number, got ${JSON.stringify(entry.cooldown)}`);
    } else if (entry.cooldown <= 0) {
      failures.push(`${label}: field "cooldown" must be positive, got ${entry.cooldown}`);
    }
  }

  if (entry.speedHours !== undefined) {
    if (!isFiniteNumber(entry.speedHours)) {
      failures.push(`${label}: field "speedHours" must be a finite number, got ${JSON.stringify(entry.speedHours)}`);
    } else if (entry.speedHours <= 0) {
      failures.push(`${label}: field "speedHours" must be positive, got ${entry.speedHours}`);
    }
  }

  if (entry.scSource !== undefined) {
    if (!SC_SOURCES.includes(entry.scSource)) {
      failures.push(`${label}: field "scSource" must be one of ${SC_SOURCES.join(', ')}, got ${JSON.stringify(entry.scSource)}`);
    }
  }

  // Tier is DERIVED, not asserted: it is a band over daysToRedeem, which is
  // itself cashFloor / dailySC. Checking that here is the whole point - it
  // stops a letter drifting away from the arithmetic that produced it, which
  // is exactly how the previous inherited tiers ended up meaningless (S-tier
  // entries needing 5,000+ days to reach their own redemption floor).
  const TIERS = ['S', 'A', 'B', 'C', 'D', 'Unranked'];
  if (entry.tier !== undefined && !TIERS.includes(entry.tier)) {
    failures.push(`${label}: field "tier" must be one of ${TIERS.join(', ')}, got ${JSON.stringify(entry.tier)}`);
  }

  for (const key of ['cashFloor', 'daysToRedeem']) {
    if (entry[key] !== undefined) {
      if (!isFiniteNumber(entry[key])) {
        failures.push(`${label}: field "${key}" must be a finite number, got ${JSON.stringify(entry[key])}`);
      } else if (entry[key] <= 0) {
        failures.push(`${label}: field "${key}" must be positive, got ${entry[key]}`);
      }
    }
  }

  if (entry.confidence !== undefined) {
    const LEVELS = ['high', 'medium', 'low', 'none'];
    if (!LEVELS.includes(entry.confidence)) {
      failures.push(`${label}: field "confidence" must be one of ${LEVELS.join(', ')}, got ${JSON.stringify(entry.confidence)}`);
    }
  }

  if (entry.blocker !== undefined && (typeof entry.blocker !== 'string' || !entry.blocker.trim())) {
    failures.push(`${label}: field "blocker" must be a non-empty string, got ${JSON.stringify(entry.blocker)}`);
  }

  if (isFiniteNumber(entry.cashFloor) && isFiniteNumber(entry.dailySC) && entry.dailySC > 0) {
    // Both inputs are present, so the derivation must be WRITTEN DOWN. Letting a
    // missing daysToRedeem through would skip every check below it and leave the
    // tier asserted again - the exact failure this rework exists to prevent.
    // A "blocker" entry is exempt from the REQUIREMENT, because the contract says
    // no day count applies where a rule stops free play reaching the floor at all.
    if (!entry.blocker && !isFiniteNumber(entry.daysToRedeem)) {
      failures.push(`${label}: has cashFloor and dailySC but no "daysToRedeem" - record the derivation rather than implying it`);
    } else if (isFiniteNumber(entry.daysToRedeem)) {
      // A blocker that does record a day count still has it checked for accuracy.
      const expectedDays = Math.round(entry.cashFloor / entry.dailySC);
      if (Math.abs(entry.daysToRedeem - expectedDays) > 1) {
        failures.push(`${label}: "daysToRedeem" is ${entry.daysToRedeem} but cashFloor/dailySC = ${expectedDays}`);
      }
      // The BAND is what a blocker overrides: it is ranked by rule, not arithmetic.
      if (!entry.blocker) {
        const d = entry.daysToRedeem;
        // Bands are INCLUSIVE of their upper bound: 60 days is S, 250 is B, 500
        // is C. That is what every entry note states and what makes "D beyond
        // 500" true, since 500 itself is not beyond 500.
        const expectedTier = d <= 60 ? 'S' : d <= 120 ? 'A' : d <= 250 ? 'B' : d <= 500 ? 'C' : 'D';
        if (entry.tier !== expectedTier) {
          failures.push(`${label}: tier is "${entry.tier}" but ${d} days to redeem derives "${expectedTier}"`);
        }
      }
    }
  } else if (!entry.blocker && entry.tier !== 'Unranked') {
    // No arithmetic behind the letter. A stray daysToRedeem is not a licence to
    // keep one, and neither is omitting the tier altogether - the contract wants
    // the gap stated as "Unranked", not left blank.
    const shown = entry.tier === undefined ? 'no tier at all' : `tier "${entry.tier}"`;
    failures.push(`${label}: has ${shown} but no cashFloor/dailySC behind it - an entry missing either input must say "Unranked"`);
  }

  if (entry.lastVerified !== undefined) {
    if (typeof entry.lastVerified !== 'string' || !/^\d{4}-\d{2}-\d{2}$/.test(entry.lastVerified)) {
      failures.push(`${label}: field "lastVerified" must be a "YYYY-MM-DD" string, got ${JSON.stringify(entry.lastVerified)}`);
    } else {
      const parsed = new Date(entry.lastVerified + 'T00:00:00Z');
      if (Number.isNaN(parsed.getTime())) {
        failures.push(`${label}: field "lastVerified" is not a real calendar date ("${entry.lastVerified}")`);
      } else if (parsed.getTime() > Date.now()) {
        failures.push(`${label}: field "lastVerified" is in the future ("${entry.lastVerified}")`);
      }
    }
  }
}

// How many whole days old a "YYYY-MM-DD" verification date is. A missing
// date is not neutral - it is the most urgent case - so it sorts as
// Infinity rather than being excluded from the review queue.
function verifiedAgeDays(entry) {
  if (typeof entry.lastVerified !== 'string' || !/^\d{4}-\d{2}-\d{2}$/.test(entry.lastVerified)) return Infinity;
  const ms = Date.now() - new Date(entry.lastVerified + 'T00:00:00Z').getTime();
  if (!Number.isFinite(ms)) return Infinity;
  return Math.max(0, Math.floor(ms / 86400000));
}

const REVIEW_STALE_DAYS = 90;
const TIER_RANK = { S: 5, A: 4, B: 3, C: 2, D: 1 };

// Surfaces the platforms most overdue for a human to re-check: a stale or
// never-verified cooldown/redeem entry is actively worse than an absent
// one, because it keeps looking trustworthy right up until it burns
// someone's timer. Never-verified entries come first (grouped by tier, S
// most urgent), then dated entries oldest-first - the same ordering the
// in-app "Needs Review First" catalog sort uses, so the CLI queue and the
// UI queue always agree.
function buildReviewQueue(catalog) {
  return catalog
    .map((entry, index) => ({ entry, index, age: verifiedAgeDays(entry) }))
    .filter((row) => row.age > REVIEW_STALE_DAYS)
    .sort((a, b) => {
      if (b.age !== a.age) return b.age - a.age;
      return (TIER_RANK[b.entry.tier] || 0) - (TIER_RANK[a.entry.tier] || 0);
    });
}

// What single screenshot would move an entry forward. Since tier is derived
// from cashFloor/dailySC, an entry is Unranked for exactly one of two missing
// inputs - and naming which one turns a vague "needs checking" list into a
// shooting list, where each line says what to open and what to capture.
function captureNeeded(entry) {
  const hasFloor = typeof entry.cashFloor === 'number';
  // Provenance is required, not just a number: an inherited dailySC with no
  // scSource is unsourced by the catalog's own definition, and counting it as
  // known would let the queue below claim a verified rate this entry lacks.
  const hasRate = hasSourcedRate(entry);
  if (entry.blocker) return null;             // ranked by rule, not by arithmetic
  if (!entry.lastVerified && !hasFloor && !hasRate) return 'everything - never verified';
  if (!hasRate && !hasFloor) return 'the daily-claim panel AND the redeem screen';
  if (!hasRate) return 'the daily-claim panel (no SC rate known)';
  if (!hasFloor) return 'the redeem screen (no cash floor known)';
  if (entry.scSource === 'ladder-partial') return 'optional: Day 1 of the ladder, to close the lower bound';
  return null;
}

function buildCaptureQueue(catalog) {
  return catalog
    .map((entry, index) => ({ entry, index, need: captureNeeded(entry) }))
    .filter((row) => row.need && !row.need.startsWith('optional'))
    .sort((a, b) => {
      // Entries that already carry a verified daily rate are the cheapest wins:
      // one redeem screenshot each and they re-enter the ranking.
      const aOne = a.need.startsWith('the redeem') ? 0 : 1;
      const bOne = b.need.startsWith('the redeem') ? 0 : 1;
      if (aOne !== bOne) return aOne - bOne;
      return (b.entry.dailySC || 0) - (a.entry.dailySC || 0);
    });
}

function findDuplicates(catalog) {
  const byName = new Map();
  const byDomain = new Map();

  catalog.forEach((entry, index) => {
    if (entry && typeof entry.name === 'string' && entry.name.trim()) {
      const key = entry.name.trim().toLowerCase();
      if (!byName.has(key)) byName.set(key, []);
      byName.get(key).push(index + 1);
    }
    if (entry && typeof entry.url === 'string') {
      const domain = normalizeDomain(entry.url);
      if (domain) {
        if (!byDomain.has(domain)) byDomain.set(domain, []);
        byDomain.get(domain).push({ index: index + 1, name: entry.name });
      }
    }
  });

  const nameWarnings = [];
  for (const [name, indices] of byName) {
    if (indices.length > 1) {
      nameWarnings.push(`duplicate name "${name}": entries ${indices.join(', ')}`);
    }
  }

  const domainWarnings = [];
  for (const [domain, entries] of byDomain) {
    if (entries.length > 1) {
      const desc = entries.map((e) => `${e.index} (${e.name})`).join(', ');
      domainWarnings.push(`duplicate domain "${domain}": entries ${desc}`);
    }
  }

  return { nameWarnings, domainWarnings };
}

function main() {
  let catalog;
  try {
    catalog = loadCatalogData();
  } catch (err) {
    console.error(`Failed to load CATALOG_DATA from ${path.relative(ROOT, CATALOG_PATH)}: ${err.message}`);
    process.exit(1);
  }

  if (!Array.isArray(catalog)) {
    console.error(`CATALOG_DATA must be an array, got ${typeof catalog}`);
    process.exit(1);
  }

  const failures = [];
  catalog.forEach((entry, index) => validateEntry(entry, index, failures));
  const { nameWarnings, domainWarnings } = findDuplicates(catalog);

  if (nameWarnings.length || domainWarnings.length) {
    console.log(`Warnings (${nameWarnings.length + domainWarnings.length}) - not treated as failures, since a repeated domain can be a deliberate separate-cooldown entry:\n`);
    for (const w of [...nameWarnings, ...domainWarnings]) console.log(`  ${w}`);
    console.log('');
  }

  if (failures.length) {
    console.log(`Found ${failures.length} invalid record(s) out of ${catalog.length}:\n`);
    for (const f of failures) console.log(`  ${f}`);
    console.error(`\nCatalog validation failed: ${failures.length} failure(s) across ${catalog.length} entries.`);
    process.exit(1);
  }

  const reviewQueue = buildReviewQueue(catalog);
  if (reviewQueue.length) {
    const neverVerified = reviewQueue.filter((row) => row.age === Infinity).length;
    console.log(`Review queue: ${reviewQueue.length}/${catalog.length} entries never verified or checked more than ${REVIEW_STALE_DAYS} days ago (${neverVerified} never verified).`);
    console.log('Oldest first - re-check the platform, then set/refresh its "lastVerified" date:\n');
    for (const row of reviewQueue.slice(0, 15)) {
      const ageLabel = row.age === Infinity ? 'never verified' : `${row.age}d ago`;
      console.log(`  [${row.entry.tier || '?'}] entry ${row.index + 1} (${row.entry.name}): ${ageLabel}`);
    }
    if (reviewQueue.length > 15) console.log(`  ...and ${reviewQueue.length - 15} more.`);
    console.log('');
  }

  const captureQueue = buildCaptureQueue(catalog);
  if (captureQueue.length) {
    const oneShot = captureQueue.filter((r) => r.need.startsWith('the redeem')).length;
    const showAll = process.argv.includes('--captures');
    console.log(`Capture queue: ${captureQueue.length}/${catalog.length} entries cannot be tiered until something is captured.`);
    console.log(`${oneShot} of them need only a REDEEM SCREEN - they already have a verified daily rate, so one screenshot each puts them back in the ranking.`);
    console.log(showAll ? '' : 'Run with --captures for the full list.\n');
    for (const row of showAll ? captureQueue : captureQueue.slice(0, 12)) {
      const sc = row.entry.dailySC ? `${row.entry.dailySC}/day` : 'no rate';
      console.log(`  ${row.entry.name.padEnd(22)} ${String(sc).padEnd(10)} needs ${row.need}`);
    }
    if (!showAll && captureQueue.length > 12) console.log(`  ...and ${captureQueue.length - 12} more.`);
    console.log('');
  }

  console.log(`Catalog validation passed: ${catalog.length}/${catalog.length} entries valid.`);
}

main();
