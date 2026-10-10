#!/usr/bin/env node
/*
 * Turns the weekly "what changed" post (scripts/weekly-post.js) into one
 * post per social channel and sends them to Postiz (postiz.com), which
 * publishes to the accounts connected there. Each channel's link carries its
 * own ?src= (x, bluesky, threads, ...), so the visits it brings show up by
 * source in app_open, the way ?src=reddit already does.
 *
 *   npm run post:social                          print every channel's post, send nothing
 *   npm run post:social -- --send                send them to Postiz as drafts
 *   npm run post:social -- --send --schedule     schedule them to publish in 15 minutes
 *   npm run post:social -- --since 2026-09-20 --until 2026-09-26   (as in post:weekly)
 *
 * --send needs POSTIZ_API_KEY (Postiz: Settings, Public API) and
 * POSTIZ_CHANNELS: a JSON object from a channel name below to its Postiz
 * integration id (`postiz integrations:list`), or to {"id", "settings"}.
 * Discord needs the id of the channel to post in:
 *   {"x":"cm1","bluesky":"cm2","discord":{"id":"cm3","settings":{"channel":"1122334455"}}}
 * Channels left out are skipped. Reddit is never sent: subreddits remove
 * automated self-promotion, so its post (npm run post:weekly) stays a hand
 * post. A week with no ranking changes sends nothing.
 */

const { normalizeBaseUrl } = require('./generate-seo-pages');
const {
  netChanges, classify, parseArgs, isoDate, isRealDate, shortDate, loadHistory,
  SECTIONS, sortChanges, detail
} = require('./weekly-post');

// short: a headline, the biggest moves, one link. long: every section, a few
// lines each. limit is the channel's own character cap.
const CHANNELS = {
  x: { style: 'short', limit: 280, settings: { who_can_reply_post: 'everyone' } },
  bluesky: { style: 'short', limit: 300 },
  threads: { style: 'short', limit: 500 },
  mastodon: { style: 'short', limit: 500 },
  facebook: { style: 'long', limit: 5000 },
  telegram: { style: 'long', limit: 4096 },
  discord: { style: 'long', limit: 2000, needs: 'channel' }
};
const LONG_SECTION_LIMIT = 5;
const AGE_NOTE = '18+. Sweepstakes casinos are not available in every state.';
const API_URL = (process.env.POSTIZ_API_URL || 'https://api.postiz.com').replace(/\/+$/, '');

// X counts every link as 23 characters and most characters past Latin and
// general punctuation (arrows included) as two.
function xLength(text) {
  let n = 0;
  for (const part of text.split(/(https?:\/\/\S+)/)) {
    if (/^https?:\/\//.test(part)) { n += 23; continue; }
    for (const ch of part) {
      const c = ch.codePointAt(0);
      const single = c <= 4351 || (c >= 8192 && c <= 8205) || (c >= 8208 && c <= 8223) || (c >= 8242 && c <= 8247);
      n += single ? 1 : 2;
    }
  }
  return n;
}
const lengthFor = (channel) => (channel === 'x' ? xLength : (text) => [...text].length);

function groupChanges(history, since, until) {
  const groups = {};
  for (const change of netChanges(history, since, until)) {
    const key = classify(change);
    if (key) (groups[key] = groups[key] || []).push(change);
  }
  for (const key of Object.keys(groups)) groups[key] = sortChanges(groups[key]);
  return groups;
}

// The moves people stop scrolling for, best first: tier changes, then new rankings.
function highlights(groups) {
  const out = [];
  for (const change of groups.up || []) out.push(`Up: ${change.name} ${change.from.tier} → ${change.to.tier}`);
  for (const change of groups.down || []) out.push(`Down: ${change.name} ${change.from.tier} → ${change.to.tier}`);
  for (const change of groups.newlyRanked || []) out.push(`New: ${change.name} ranked ${change.to.tier}`);
  for (const change of groups.notRankable || []) out.push(`${change.name}: no guaranteed daily`);
  return out;
}

function shortPost(groups, range, url, limit, length) {
  const head = `Sweeps daily bonus tier list, what changed ${range}:`;
  const tail = ['', `Full list: ${url}`, '18+'];
  const picks = highlights(groups);
  const total = Object.values(groups).reduce((n, list) => n + list.length, 0);
  for (let shown = picks.length; shown >= 0; shown--) {
    const more = total - shown;
    const lines = [head, ...picks.slice(0, shown)];
    if (more > 0) lines.push(shown ? `+${more} more changes` : `${more} changes this week`);
    const text = [...lines, ...tail].join('\n');
    if (length(text) <= limit) return text;
  }
  return [head, ...tail].join('\n');
}

function longPost(groups, range, url, limit, length) {
  for (let cap = LONG_SECTION_LIMIT; cap >= 1; cap--) {
    const lines = [
      `Sweeps daily bonus tier list: what changed, ${range}`,
      'Tier = days of free daily bonuses to reach the site\'s own cash-out minimum. No purchases, no wins counted.'
    ];
    for (const { key, title } of SECTIONS) {
      const list = groups[key] || [];
      if (!list.length) continue;
      lines.push('', `${title} (${list.length})`);
      for (const change of list.slice(0, cap)) {
        const d = detail(change, key).replace(/\*\*/g, '');
        lines.push(`• ${change.name}${d ? ` - ${d}` : ''}`);
      }
      if (list.length > cap) lines.push(`• …and ${list.length - cap} more`);
    }
    lines.push('', `Full tier list: ${url}`, '', AGE_NOTE);
    const text = lines.join('\n');
    if (length(text) <= limit) return text;
  }
  return shortPost(groups, range, url, limit, length);
}

function buildSocialPosts({ history, since, until, baseUrl }) {
  const groups = groupChanges(history, since, until);
  const total = Object.values(groups).reduce((n, list) => n + list.length, 0);
  const range = `${shortDate(since)} – ${shortDate(until)}`;
  const posts = {};
  for (const [channel, { style, limit }] of Object.entries(CHANNELS)) {
    const url = `${baseUrl}/platforms/index.html?src=${channel}`;
    const render = style === 'short' ? shortPost : longPost;
    posts[channel] = render(groups, range, url, limit, lengthFor(channel));
  }
  return { total, posts };
}

// Postiz stores a post as the editor's HTML: one paragraph per line.
function toPostizHtml(text) {
  const escape = (s) => s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
  return text.split('\n').map((line) => `<p>${escape(line)}</p>`).join('');
}

function readChannels(raw) {
  if (!raw) return {};
  let parsed;
  try {
    parsed = JSON.parse(raw);
  } catch (error) {
    throw new Error(`POSTIZ_CHANNELS is not valid JSON: ${error.message}`);
  }
  const out = {};
  for (const [channel, value] of Object.entries(parsed || {})) {
    if (!CHANNELS[channel]) {
      console.error(`(POSTIZ_CHANNELS: skipping "${channel}", not one of ${Object.keys(CHANNELS).join(', ')})`);
      continue;
    }
    const entry = typeof value === 'string' ? { id: value } : value || {};
    if (!entry.id) {
      console.error(`(POSTIZ_CHANNELS: skipping "${channel}", no integration id)`);
      continue;
    }
    const settings = Object.assign({}, CHANNELS[channel].settings, entry.settings);
    const needs = CHANNELS[channel].needs;
    if (needs && !settings[needs]) {
      console.error(`(POSTIZ_CHANNELS: skipping "${channel}", its settings need "${needs}")`);
      continue;
    }
    out[channel] = { id: entry.id, settings };
  }
  return out;
}

async function sendToPostiz({ channel, id, settings, text, schedule, apiKey, now }) {
  const minutes = schedule ? 15 : 60;
  const body = {
    type: schedule ? 'schedule' : 'draft',
    date: new Date(now + minutes * 60000).toISOString(),
    // Keep our own links: a shortened one would drop the ?src= the visit is counted by.
    shortLink: false,
    tags: [],
    creationMethod: 'API',
    posts: [{
      integration: { id },
      value: [{ content: toPostizHtml(text), image: [] }],
      settings
    }]
  };
  const response = await fetch(`${API_URL}/public/v1/posts`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', Authorization: apiKey },
    body: JSON.stringify(body)
  });
  const reply = await response.text();
  if (!response.ok) throw new Error(`${channel}: Postiz answered ${response.status}: ${reply.slice(0, 300)}`);
  return reply;
}

async function main() {
  const argv = process.argv.slice(2);
  const args = parseArgs(argv);
  const send = argv.includes('--send');
  const schedule = argv.includes('--schedule');
  if (args.help) {
    console.log('Usage: npm run post:social -- [--send [--schedule]] [--since YYYY-MM-DD] [--until YYYY-MM-DD]');
    return;
  }
  const today = new Date();
  const until = args.until || isoDate(today);
  // Seven days, both ends included.
  const since = args.since || isoDate(new Date(today.getFullYear(), today.getMonth(), today.getDate() - 6));
  if (!isRealDate(since) || !isRealDate(until) || since > until) {
    console.error('--since and --until take dates like 2026-09-20, the first no later than the second (both included).');
    process.exit(1);
  }
  const { total, posts } = buildSocialPosts({
    history: loadHistory(),
    since,
    until,
    baseUrl: normalizeBaseUrl(process.env.SEO_BASE_URL)
  });
  for (const [channel, text] of Object.entries(posts)) {
    console.log(`----- ${channel} (${lengthFor(channel)(text)}/${CHANNELS[channel].limit}) -----`);
    console.log(`${text}\n`);
  }
  if (!send) return;
  if (!total) {
    console.log('No ranking changes this week: nothing sent.');
    return;
  }
  const apiKey = process.env.POSTIZ_API_KEY;
  const channels = readChannels(process.env.POSTIZ_CHANNELS);
  if (!apiKey || !Object.keys(channels).length) {
    console.log('POSTIZ_API_KEY or POSTIZ_CHANNELS is not set: nothing sent.');
    return;
  }
  const now = Date.now();
  let failed = 0;
  for (const [channel, { id, settings }] of Object.entries(channels)) {
    try {
      await sendToPostiz({ channel, id, settings, text: posts[channel], schedule, apiKey, now });
      console.log(`Sent ${channel} to Postiz as a ${schedule ? 'scheduled post' : 'draft'}.`);
    } catch (error) {
      failed++;
      console.error(error.message);
    }
  }
  if (failed) process.exit(1);
}

module.exports = { CHANNELS, xLength, buildSocialPosts, toPostizHtml, readChannels };

if (require.main === module) {
  main().catch((error) => {
    console.error(error.message);
    process.exit(1);
  });
}
