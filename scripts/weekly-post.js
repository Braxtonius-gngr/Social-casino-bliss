#!/usr/bin/env node
/*
 * Drafts the weekly "what changed" post from the catalog's history: newly
 * ranked platforms, tier moves, platforms found to have no guaranteed daily,
 * and new additions. Links point at the platform pages, tagged with the
 * channel (?src=reddit, ?src=discord), which those pages pass on into the
 * app - so the visits a post brings show up by source in app_open.
 *
 *   npm run post:weekly                                Reddit markdown, last 7 days
 *   npm run post:weekly -- --format discord            Discord, split into 2,000-character messages
 *   npm run post:weekly -- --since 2026-09-20 --until 2026-09-26   (both days included)
 *
 * Reads history straight from git (scripts/catalog-history.js), so it
 * includes uncommitted catalog edits; without full git history it falls
 * back to the committed data/catalog-history.json.
 */

const { buildHistory, readHistoryFile } = require('./catalog-history');
const { loadCatalog, withSlugs, normalizeBaseUrl, RANKED } = require('./generate-seo-pages');

const TIER_RANK = { S: 6, A: 5, B: 4, C: 3, D: 2, F: 1 };
const SECTION_LIMIT = 15;
const DISCORD_LIMIT = 2000;

function parseArgs(argv) {
  const args = { format: 'reddit', since: null, until: null };
  for (let i = 0; i < argv.length; i++) {
    const [flag, inline] = argv[i].split('=');
    const value = inline !== undefined ? inline : argv[i + 1];
    if (flag === '--format') { args.format = value; if (inline === undefined) i++; }
    else if (flag === '--since') { args.since = value; if (inline === undefined) i++; }
    else if (flag === '--until') { args.until = value; if (inline === undefined) i++; }
    else if (flag === '--help' || flag === '-h') args.help = true;
  }
  return args;
}

function isoDate(date) {
  const pad = (n) => String(n).padStart(2, '0');
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}`;
}

// A real calendar day in YYYY-MM-DD, so 2026-02-31 is refused rather than
// quietly read as March 3.
function isRealDate(iso) {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(iso)) return false;
  const [y, m, d] = iso.split('-').map(Number);
  const date = new Date(Date.UTC(y, m - 1, d));
  return date.getUTCFullYear() === y && date.getUTCMonth() === m - 1 && date.getUTCDate() === d;
}

function shortDate(iso) {
  const [y, m, d] = iso.split('-').map(Number);
  return new Date(y, m - 1, d).toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
}

function loadHistory() {
  try {
    return buildHistory();
  } catch (error) {
    console.error(`(Using the committed data/catalog-history.json: ${error.message.split('\n')[0]})`);
    return readHistoryFile();
  }
}

// The period's net change for each platform: where it started (before the
// first change in range) and where it ended up (after the last).
function netChanges(history, since, until) {
  const out = [];
  for (const [name, events] of Object.entries(history)) {
    const inRange = events.filter(e => e.date >= since && e.date <= until).reverse();   // oldest first
    if (!inRange.length) continue;
    const first = inRange[0];
    const last = inRange[inRange.length - 1];
    if (last.removed) {
      if (!first.added) out.push({ name, kind: 'removed', from: first.from });
      continue;
    }
    const from = first.added ? null : first.from;
    const to = last.to;
    if (from && from.tier === to.tier && from.dailySC === to.dailySC && from.cashFloor === to.cashFloor && from.blocker === to.blocker) continue;
    out.push({ name, from, to, added: !!first.added });
  }
  return out;
}

function classify(change) {
  if (change.kind === 'removed') return 'removed';
  const { from, to } = change;
  const toRank = TIER_RANK[to.tier] || 0;
  const fromRank = from ? (TIER_RANK[from.tier] || 0) : 0;
  if (change.added) return toRank ? 'newlyRanked' : 'added';
  if (to.tier === 'Not Rankable' && from.tier !== 'Not Rankable') return 'notRankable';
  if (toRank && !fromRank) return 'newlyRanked';
  if (!toRank && fromRank) return 'unranked';
  if (toRank > fromRank) return 'up';
  if (toRank < fromRank) return 'down';
  // Numbers noted on a platform that is still unranked aren't news yet.
  return toRank ? 'corrected' : null;
}

// A blocker entry has no day count that applies (validate-catalog.js), so the
// post names the rule instead of quoting one. Mirrors BLOCKER_LABELS in index.html.
const BLOCKER_TEXT = {
  'purchase-gated-daily': 'daily claim needs a purchase',
  'free-play-cannot-reach-floor': 'no free path to cash-out',
  '20x-promo-playthrough-last-in-queue': '20x promo playthrough first',
  'lifetime-cap-one-redemption': 'lifetime cap of one redemption'
};
const blocked = (slug) => BLOCKER_TEXT[slug] || slug.replace(/-/g, ' ');

function numbers(s) {
  const parts = [];
  if (typeof s.dailySC === 'number') parts.push(`${s.dailySC} SC/day`);
  if (typeof s.cashFloor === 'number') parts.push(`${s.cashFloor} SC to cash out`);
  if (s.blocker) parts.push(blocked(s.blocker));
  else if (typeof s.daysToRedeem === 'number') parts.push(`~${s.daysToRedeem} days`);
  return parts.join(' · ');
}

// Why a ranked platform moved: the inputs that changed.
function reason(from, to) {
  const parts = [];
  if (from.dailySC !== to.dailySC && typeof to.dailySC === 'number') {
    parts.push(typeof from.dailySC === 'number' && from.dailySC > 0 ? `daily ${from.dailySC} → ${to.dailySC} SC` : `daily ${to.dailySC} SC`);
  }
  if (from.cashFloor !== to.cashFloor && typeof to.cashFloor === 'number') {
    parts.push(typeof from.cashFloor === 'number' ? `cash minimum ${from.cashFloor} → ${to.cashFloor}` : `cash minimum ${to.cashFloor}`);
  }
  if (to.blocker) parts.push(blocked(to.blocker));
  else if (typeof to.daysToRedeem === 'number') parts.push(`~${to.daysToRedeem} days`);
  return parts.join(', ');
}

const SECTIONS = [
  { key: 'newlyRanked', title: 'Newly ranked' },
  { key: 'up', title: 'Moved up' },
  { key: 'down', title: 'Moved down' },
  { key: 'notRankable', title: 'Now Not Rankable (no guaranteed daily)' },
  { key: 'corrected', title: 'Same tier, corrected numbers' },
  { key: 'unranked', title: 'Pulled from the rankings until re-verified' },
  { key: 'added', title: 'New to the catalog, not ranked yet' },
  { key: 'removed', title: 'Removed from the catalog' }
];

function sortChanges(list) {
  return list.slice().sort((a, b) => {
    const ta = a.to ? (TIER_RANK[a.to.tier] || 0) : 0;
    const tb = b.to ? (TIER_RANK[b.to.tier] || 0) : 0;
    if (ta !== tb) return tb - ta;
    const da = a.to && typeof a.to.daysToRedeem === 'number' ? a.to.daysToRedeem : Infinity;
    const db = b.to && typeof b.to.daysToRedeem === 'number' ? b.to.daysToRedeem : Infinity;
    if (da !== db) return da - db;
    return a.name.localeCompare(b.name);
  });
}

function detail(change, key) {
  const { from, to } = change;
  if (key === 'newlyRanked') return `**${to.tier}** · ${numbers(to)}`;
  if (key === 'up' || key === 'down') return `${from.tier} → **${to.tier}**${reason(from, to) ? ` (${reason(from, to)})` : ''}`;
  if (key === 'corrected') return `**${to.tier}**${reason(from, to) ? ` (${reason(from, to)})` : ''}`;
  if (key === 'unranked') return `was ${from.tier}`;
  if (key === 'notRankable') return from && RANKED.has(from.tier) ? `was ${from.tier}` : '';
  return '';
}

function buildPost({ history, since, until, format, baseUrl, slugs }) {
  const src = format === 'discord' ? 'discord' : 'reddit';
  const pageUrl = (name) => (slugs.has(name) ? `${baseUrl}/platforms/${slugs.get(name)}.html?src=${src}` : null);
  const tierListUrl = `${baseUrl}/platforms/index.html?src=${src}`;
  const groups = {};
  for (const change of netChanges(history, since, until)) {
    const key = classify(change);
    if (key) (groups[key] = groups[key] || []).push(change);
  }
  const range = `${shortDate(since)} – ${shortDate(until)}`;
  const total = Object.values(groups).reduce((n, list) => n + list.length, 0);

  if (format === 'discord') {
    const lines = [`**Sweeps tier list: what changed, ${range}**`, 'Tier = days of free daily bonuses to the site\'s own cash-out minimum, from the site\'s own pages and screenshots of its claim and redeem screens. A platform with a rule warning is placed by that rule, not by a day count.'];
    if (!total) lines.push('', 'No ranking changes this week.');
    for (const { key, title } of SECTIONS) {
      const list = sortChanges(groups[key] || []);
      if (!list.length) continue;
      lines.push('', `**${title} (${list.length})**`);
      const shown = list.slice(0, SECTION_LIMIT);
      for (const change of shown) {
        const d = detail(change, key).replace(/\*\*/g, '');
        lines.push(`• ${change.name}${d ? ` - ${d}` : ''}`);
      }
      if (list.length > shown.length) lines.push(`• …and ${list.length - shown.length} more`);
    }
    lines.push('', `Full tier list: <${tierListUrl}>`);
    return splitMessages(lines, DISCORD_LIMIT);
  }

  const lines = [
    `Title: Sweepstakes daily bonus tier list: what changed ${range}`,
    '',
    `Every tier is the number of days of free daily bonuses it takes to reach that site's own minimum cash redemption - no purchases, no wins counted. Each change below comes from the site's own published pages or screenshots of its daily-claim and redeem screens. A platform with a rule warning (such as no free path to cash-out) is placed by that rule, not by a day count.`
  ];
  if (!total) lines.push('', 'No ranking changes this week.');
  for (const { key, title } of SECTIONS) {
    const list = sortChanges(groups[key] || []);
    if (!list.length) continue;
    lines.push('', `**${title} (${list.length})**`, '');
    const shown = list.slice(0, SECTION_LIMIT);
    for (const change of shown) {
      const url = pageUrl(change.name);
      const label = url ? `[${change.name}](${url})` : change.name;
      const d = detail(change, key);
      lines.push(`- ${label}${d ? ` - ${d}` : ''}`);
    }
    if (list.length > shown.length) lines.push(`- …and ${list.length - shown.length} more on the [full tier list](${tierListUrl})`);
  }
  lines.push('', `Full tier list, with every platform's numbers: ${tierListUrl}`);
  return [lines.join('\n')];
}

// Discord caps a message at 2,000 characters; break between lines.
function splitMessages(lines, limit) {
  const messages = [];
  let current = '';
  for (const line of lines) {
    const next = current ? `${current}\n${line}` : line;
    if (next.length > limit && current) {
      messages.push(current);
      current = line;
    } else {
      current = next;
    }
  }
  if (current) messages.push(current);
  return messages;
}

function main() {
  const args = parseArgs(process.argv.slice(2));
  if (args.help || !['reddit', 'discord'].includes(args.format)) {
    console.log('Usage: npm run post:weekly -- [--format reddit|discord] [--since YYYY-MM-DD] [--until YYYY-MM-DD]');
    process.exit(args.help ? 0 : 1);
  }
  const today = new Date();
  const until = args.until || isoDate(today);
  // Seven days, both ends included.
  const since = args.since || isoDate(new Date(today.getFullYear(), today.getMonth(), today.getDate() - 6));
  if (!isRealDate(since) || !isRealDate(until) || since > until) {
    console.error('--since and --until take dates like 2026-09-20, the first no later than the second (both included).');
    process.exit(1);
  }
  const slugs = new Map(withSlugs(loadCatalog()).map(({ entry, slug }) => [entry.name.trim(), slug]));
  const messages = buildPost({
    history: loadHistory(),
    since,
    until,
    format: args.format,
    baseUrl: normalizeBaseUrl(process.env.SEO_BASE_URL),
    slugs
  });
  messages.forEach((message, i) => {
    if (messages.length > 1) console.log(`${i ? '\n' : ''}----- message ${i + 1} of ${messages.length} -----`);
    console.log(message);
  });
}

module.exports = {
  netChanges, classify, buildPost, splitMessages,
  parseArgs, isoDate, isRealDate, shortDate, loadHistory, SECTIONS, SECTION_LIMIT, sortChanges, detail
};

if (require.main === module) main();
