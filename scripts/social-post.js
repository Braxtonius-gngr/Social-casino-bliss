#!/usr/bin/env node
/*
 * Turns the weekly "what changed" post (scripts/weekly-post.js) into one
 * post per social channel and sends them to Postiz (postiz.com), which
 * publishes to the accounts connected there. Each channel's link carries its
 * own ?src= (x, bluesky, threads, ...), so the visits it brings show up by
 * source in app_open, the way ?src=reddit already does.
 *
 *   npm run post:social                          print every channel's post, send nothing
 *   npm run post:social -- --card                also draw the tier cards (scripts/social-card.js)
 *   npm run post:social -- --send --card         send them to Postiz as drafts, cards attached
 *   npm run post:social -- --send --schedule     schedule them to publish in 15 minutes
 *   npm run post:social -- --since 2026-09-20 --until 2026-09-26   (as in post:weekly)
 *   --card-dir <folder> keeps the card images there (default: a temporary folder)
 *
 * --send needs POSTIZ_API_KEY (Postiz: Settings, Public API) and
 * POSTIZ_CHANNELS: a JSON object from a channel name below to its Postiz
 * integration id (`postiz integrations:list`), or to {"id", "settings"}.
 * A channel with `needs` takes those settings, which only you can look up:
 *   {"x":"cm1","bluesky":"cm2","discord":{"id":"cm3","settings":{"channel":"1122334455"}},
 *    "pinterest":{"id":"cm4","settings":{"board":"987654321"}}}
 * Channels left out are skipped, and so are Instagram, Pinterest and TikTok
 * without a card. Reddit is never sent: subreddits remove automated
 * self-promotion, so its post (npm run post:weekly) stays a hand post. A week
 * with no ranking changes sends nothing.
 */

const fs = require('fs');
const os = require('os');
const path = require('path');
const { loadCatalog, withSlugs, normalizeBaseUrl } = require('./generate-seo-pages');
const {
  netChanges, classify, parseArgs, isoDate, isRealDate, shortDate, loadHistory,
  SECTIONS, SECTION_LIMIT, sortChanges, detail
} = require('./weekly-post');
const { renderCards } = require('./social-card');

// style: short (a headline, the biggest moves, one link), long (every
// section, a few lines each), caption (short, for networks where a link in
// the text can't be tapped) or article (HTML with headings, for blogs and
// email). limit: the channel's character cap, Postiz's or the network's,
// whichever is lower. card: the tier card it carries; cardRequired: it can't
// post without one. needs: settings only you can supply. settings: what this
// script fills in (from the week's title and link); yours override them.
const CHANNELS = {
  x: { style: 'short', limit: 280, card: 'portrait', settings: () => ({ who_can_reply_post: 'everyone' }) },
  bluesky: { style: 'short', limit: 300, card: 'portrait' },
  threads: { style: 'short', limit: 500, card: 'portrait' },
  mastodon: { style: 'short', limit: 500, card: 'portrait' },
  nostr: { style: 'short', limit: 500 },
  // Farcaster counts bytes. Channel ids, if any, go in settings.subreddit.
  farcaster: { style: 'short', limit: 320, card: 'portrait', settings: () => ({ subreddit: [] }) },
  facebook: { style: 'long', limit: 5000, card: 'portrait' },
  // Text only: Telegram cuts a picture's caption at 1,024 characters.
  telegram: { style: 'long', limit: 4096 },
  discord: { style: 'long', limit: 1980, card: 'portrait', needs: ['channel'] },
  linkedin: { style: 'long', limit: 3000, card: 'portrait' },
  tumblr: { style: 'long', limit: 4096, card: 'portrait', settings: (p) => ({ title: p.title }) },
  mewe: { style: 'long', limit: 5000, card: 'portrait', settings: () => ({ postType: 'timeline' }) },
  // Your communities: [{"value":{"subreddit":"name","id":"community id"}}]; each gets the title and link.
  lemmy: {
    style: 'long', limit: 10000, needs: ['subreddit'],
    fill: (p, yours) => ({
      subreddit: (yours.subreddit || []).map((entry) => ({ value: Object.assign({ title: p.title, url: p.url }, entry.value) }))
    })
  },
  whop: { style: 'long', limit: 5000, needs: ['company', 'experience'], settings: (p) => ({ title: p.title }) },
  skool: { style: 'long', limit: 5000, needs: ['group', 'label'], settings: (p) => ({ title: p.title }) },
  medium: { style: 'article', settings: (p) => ({ title: p.title, subtitle: p.subtitle }) },
  wordpress: { style: 'article', settings: (p) => ({ title: p.title, type: 'post' }) },
  listmonk: { style: 'article', needs: ['list'], settings: (p) => ({ subject: p.title, preview: p.subtitle }) },
  instagram: {
    style: 'caption', limit: 2200, card: 'portrait', cardRequired: true, linkInBio: true, hashtags: true,
    settings: () => ({ post_type: 'post' })
  },
  pinterest: {
    style: 'caption', limit: 500, card: 'portrait', cardRequired: true, needs: ['board'],
    settings: (p) => ({ title: p.title.slice(0, 100), link: p.url })
  },
  // A photo post. brand_organic_toggle: the post promotes this site, our own brand.
  tiktok: {
    style: 'caption', limit: 2000, card: 'tall', cardRequired: true, linkInBio: true, hashtags: true,
    settings: (p) => ({
      title: p.title.slice(0, 90), privacy_level: 'PUBLIC_TO_EVERYONE', duet: false, stitch: false, comment: true,
      autoAddMusic: 'yes', brand_content_toggle: false, brand_organic_toggle: true, content_posting_method: 'DIRECT_POST'
    })
  }
};
const LONG_SECTION_LIMIT = 5;
const AGE_NOTE = '18+. Sweepstakes casinos are not available in every state.';
const HASHTAGS = '#sweepstakes #dailybonus #sweeps';
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
function lengthFor(channel) {
  if (channel === 'x') return xLength;
  if (channel === 'farcaster') return (text) => Buffer.byteLength(text, 'utf8');
  return (text) => [...text].length;
}

function groupChanges(history, since, until) {
  const groups = {};
  for (const change of netChanges(history, since, until)) {
    const key = classify(change);
    if (key) (groups[key] = groups[key] || []).push(change);
  }
  for (const key of Object.keys(groups)) groups[key] = sortChanges(groups[key]);
  return groups;
}
const countChanges = (groups) => Object.values(groups).reduce((n, list) => n + list.length, 0);

// The moves people stop scrolling for, best first: tier changes, then new rankings.
function highlights(groups) {
  const out = [];
  for (const change of groups.up || []) out.push(`Up: ${change.name} ${change.from.tier} → ${change.to.tier}`);
  for (const change of groups.down || []) out.push(`Down: ${change.name} ${change.from.tier} → ${change.to.tier}`);
  for (const change of groups.newlyRanked || []) out.push(`New: ${change.name} ranked ${change.to.tier}`);
  for (const change of groups.notRankable || []) out.push(`${change.name}: no guaranteed daily`);
  return out;
}

// As many highlights as fit, the rest counted.
function highlightPost(groups, range, tail, limit, length) {
  const head = `Sweeps daily bonus tier list, what changed ${range}:`;
  const picks = highlights(groups);
  const total = countChanges(groups);
  for (let shown = picks.length; shown >= 0; shown--) {
    const more = total - shown;
    const lines = [head, ...picks.slice(0, shown)];
    if (more > 0) lines.push(shown ? `+${more} more changes` : `${more} changes this week`);
    const text = [...lines, '', ...tail].join('\n');
    if (length(text) <= limit) return text;
  }
  return [head, '', ...tail].join('\n');
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
  return highlightPost(groups, range, [`Full list: ${url}`, '18+'], limit, length);
}

const escapeHtml = (s) => String(s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');

// Postiz's HTML for a blog post or newsletter: headings, lists and links.
function articleHtml(groups, url, pageUrl) {
  const parts = [
    '<p>Every tier is the number of days of free daily bonuses it takes to reach that site\'s own minimum cash redemption: no purchases, no wins counted. Each change below comes from the site\'s own published pages or screenshots of its daily-claim and redeem screens.</p>'
  ];
  for (const { key, title } of SECTIONS) {
    const list = groups[key] || [];
    if (!list.length) continue;
    const items = list.slice(0, SECTION_LIMIT).map((change) => {
      const link = pageUrl(change.name);
      const name = link ? `<a href="${escapeHtml(link)}">${escapeHtml(change.name)}</a>` : escapeHtml(change.name);
      const d = detail(change, key).replace(/\*\*/g, '');
      return `<li>${name}${d ? ` - ${escapeHtml(d)}` : ''}</li>`;
    });
    if (list.length > SECTION_LIMIT) items.push(`<li>…and ${list.length - SECTION_LIMIT} more on the full tier list</li>`);
    parts.push(`<h2>${escapeHtml(title)} (${list.length})</h2>`, `<ul>${items.join('')}</ul>`);
  }
  parts.push(`<p><a href="${escapeHtml(url)}">Full tier list, with every platform's numbers</a></p>`, `<p>${escapeHtml(AGE_NOTE)}</p>`);
  return parts.join('');
}

// Every channel's post for the week: { channel: { text, html, title, url } }.
function buildSocialPosts({ history, since, until, baseUrl, slugs }) {
  const groups = groupChanges(history, since, until);
  const range = `${shortDate(since)} – ${shortDate(until)}`;
  const title = `Sweeps daily bonus tier list: what changed ${range}`;
  const subtitle = 'Which sweepstakes casinos moved tiers this week, from each site\'s own claim and redeem screens.';
  const posts = {};
  for (const [channel, def] of Object.entries(CHANNELS)) {
    const url = `${baseUrl}/platforms/index.html?src=${channel}`;
    const length = lengthFor(channel);
    const post = { title, subtitle, url };
    if (def.style === 'article') {
      const pageUrl = (name) => (slugs.has(name) ? `${baseUrl}/platforms/${slugs.get(name)}.html?src=${channel}` : null);
      post.html = articleHtml(groups, url, pageUrl);
    } else if (def.style === 'caption') {
      const tail = [
        def.linkInBio ? `Full tier list: ${baseUrl.replace(/^https?:\/\//, '')}/platforms (link in bio)` : `Full tier list at ${baseUrl.replace(/^https?:\/\//, '')}`,
        AGE_NOTE
      ];
      if (def.hashtags) tail.push(HASHTAGS);
      post.text = highlightPost(groups, range, tail, def.limit, length);
    } else if (def.style === 'short') {
      post.text = highlightPost(groups, range, [`Full list: ${url}`, '18+'], def.limit, length);
    } else {
      post.text = longPost(groups, range, url, def.limit, length);
    }
    posts[channel] = post;
  }
  return { groups, range, total: countChanges(groups), posts };
}

// Postiz stores a post as the editor's HTML: one paragraph per line.
function toPostizHtml(text) {
  return text.split('\n').map((line) => `<p>${escapeHtml(line)}</p>`).join('');
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
    const yours = entry.settings || {};
    const missing = (CHANNELS[channel].needs || []).filter((key) => {
      const v = yours[key];
      return Array.isArray(v) ? !v.length : !v;
    });
    if (missing.length) {
      console.error(`(POSTIZ_CHANNELS: skipping "${channel}", its settings need ${missing.map((k) => `"${k}"`).join(' and ')})`);
      continue;
    }
    out[channel] = { id: entry.id, settings: yours };
  }
  return out;
}

function channelSettings(channel, post, yours) {
  const def = CHANNELS[channel];
  return Object.assign({}, def.settings ? def.settings(post) : {}, yours, def.fill ? def.fill(post, yours) : {});
}

async function postiz(endpoint, init, apiKey) {
  const response = await fetch(`${API_URL}${endpoint}`, Object.assign({}, init, {
    headers: Object.assign({ Authorization: apiKey }, init.headers)
  }));
  const reply = await response.text();
  if (!response.ok) {
    const error = new Error(`Postiz answered ${response.status}: ${reply.slice(0, 300)}`);
    error.status = response.status;
    throw error;
  }
  return reply;
}

async function uploadCard(file, apiKey) {
  const form = new FormData();
  form.append('file', new Blob([fs.readFileSync(file)], { type: 'image/png' }), path.basename(file));
  const media = JSON.parse(await postiz('/public/v1/upload', { method: 'POST', body: form }, apiKey));
  if (!media.id || !media.path) throw new Error('Postiz returned no id or path for the uploaded card.');
  return { id: media.id, path: media.path };
}

function createPosts(entries, { schedule, apiKey, now }) {
  const minutes = schedule ? 15 : 60;
  const body = {
    type: schedule ? 'schedule' : 'draft',
    date: new Date(now + minutes * 60000).toISOString(),
    // Keep our own links: a shortened one would drop the ?src= the visit is counted by.
    shortLink: false,
    tags: [],
    creationMethod: 'API',
    posts: entries.map(({ id, content, image, settings }) => ({
      integration: { id },
      value: [{ content, image }],
      settings
    }))
  };
  return postiz('/public/v1/posts', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body)
  }, apiKey);
}

// One request for every channel (Postiz limits API calls per hour). If Postiz
// turns the batch down, each channel goes on its own, so one channel's bad
// settings don't hold back the rest.
async function sendAll(entries, options) {
  try {
    await createPosts(entries, options);
    return entries.map(({ channel }) => ({ channel }));
  } catch (error) {
    if (entries.length === 1 || !(error.status >= 400 && error.status < 500)) {
      return entries.map(({ channel }) => ({ channel, error }));
    }
    console.error(`The batch was refused (${error.message}). Sending each channel on its own.`);
  }
  const results = [];
  for (const entry of entries) {
    try {
      await createPosts([entry], options);
      results.push({ channel: entry.channel });
    } catch (error) {
      results.push({ channel: entry.channel, error });
    }
  }
  return results;
}

function readFlag(argv, flag) {
  const i = argv.findIndex((a) => a === flag || a.startsWith(`${flag}=`));
  if (i < 0) return null;
  return argv[i].includes('=') ? argv[i].split('=').slice(1).join('=') : argv[i + 1];
}

async function main() {
  const argv = process.argv.slice(2);
  const args = parseArgs(argv);
  const send = argv.includes('--send');
  const schedule = argv.includes('--schedule');
  const cardDir = readFlag(argv, '--card-dir');
  const wantCards = argv.includes('--card') || !!cardDir;
  if (args.help) {
    console.log('Usage: npm run post:social -- [--send [--schedule]] [--card] [--card-dir <folder>] [--since YYYY-MM-DD] [--until YYYY-MM-DD]');
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
  const slugs = new Map(withSlugs(loadCatalog()).map(({ entry, slug }) => [entry.name.trim(), slug]));
  const { groups, range, total, posts } = buildSocialPosts({
    history: loadHistory(),
    since,
    until,
    baseUrl: normalizeBaseUrl(process.env.SEO_BASE_URL),
    slugs
  });
  for (const [channel, post] of Object.entries(posts)) {
    const def = CHANNELS[channel];
    const size = post.text ? ` (${lengthFor(channel)(post.text)}/${def.limit})` : ' (HTML)';
    console.log(`----- ${channel}${size}${def.card ? `, ${def.card} card` : ''} -----`);
    console.log(`${post.text || post.html}\n`);
  }
  if (send && !total) {
    console.log('No ranking changes this week: nothing sent.');
    return;
  }

  let cards = null;
  let failed = 0;
  // Without --card-dir, a send deletes its cards afterwards; a dry run keeps them to look at.
  const tempDir = wantCards && !cardDir ? fs.mkdtempSync(path.join(os.tmpdir(), 'tier-cards-')) : null;
  if (wantCards) {
    try {
      cards = await renderCards({ groups, range, outDir: cardDir || tempDir });
      console.log(`Cards: ${Object.values(cards).join(', ')}`);
    } catch (error) {
      failed++;
      console.error(`No cards this week (${error.message}). Channels that need one are skipped.`);
    }
  }
  if (!send) {
    if (failed) {
      if (tempDir) fs.rmSync(tempDir, { recursive: true, force: true });
      process.exit(1);
    }
    return;
  }
  try {
    failed += await sendToPostiz({ posts, cards, schedule });
  } finally {
    if (tempDir) fs.rmSync(tempDir, { recursive: true, force: true });
  }
  if (failed) process.exit(1);
}

// Sends every configured channel's post; resolves to the number of failures.
async function sendToPostiz({ posts, cards, schedule }) {
  let failed = 0;
  const apiKey = process.env.POSTIZ_API_KEY;
  const channels = readChannels(process.env.POSTIZ_CHANNELS);
  if (!apiKey || !Object.keys(channels).length) {
    console.log('POSTIZ_API_KEY or POSTIZ_CHANNELS is not set: nothing sent.');
    return 0;
  }
  // Each card size is uploaded once, the first time a channel wants it.
  const uploads = {};
  const media = async (size) => {
    if (!cards || !cards[size]) return null;
    if (!(size in uploads)) {
      try {
        uploads[size] = await uploadCard(cards[size], apiKey);
      } catch (error) {
        failed++;
        console.error(`The ${size} card didn't upload: ${error.message}`);
        uploads[size] = null;
      }
    }
    return uploads[size];
  };
  const entries = [];
  for (const [channel, { id, settings }] of Object.entries(channels)) {
    const def = CHANNELS[channel];
    const post = posts[channel];
    const image = def.card ? await media(def.card) : null;
    if (def.cardRequired && !image) {
      console.error(`Skipped ${channel}: it needs the ${def.card} card.`);
      continue;
    }
    entries.push({
      channel,
      id,
      content: post.html || toPostizHtml(post.text),
      image: image ? [image] : [],
      settings: channelSettings(channel, post, settings)
    });
  }
  const results = entries.length ? await sendAll(entries, { schedule, apiKey, now: Date.now() }) : [];
  for (const { channel, error } of results) {
    if (error) {
      failed++;
      console.error(`${channel}: ${error.message}`);
    } else {
      console.log(`Sent ${channel} to Postiz as a ${schedule ? 'scheduled post' : 'draft'}.`);
    }
  }
  return failed;
}

module.exports = { CHANNELS, xLength, buildSocialPosts, toPostizHtml, readChannels, channelSettings };

if (require.main === module) {
  main().catch((error) => {
    console.error(error.message);
    process.exit(1);
  });
}
