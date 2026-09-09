#!/usr/bin/env node
/*
 * Imports timer definitions from Bonus Farmer's public client bundle.
 *
 * This is deliberately a maintenance command, not browser runtime code. The
 * upstream site does not publish a supported API, and its hashed Next.js
 * chunks can change at any time. Keeping a reviewed snapshot in this repo
 * makes the deployed PWA deterministic and keeps it working offline.
 *
 *   node scripts/sync-cooldowns.js          # print a match report
 *   node scripts/sync-cooldowns.js --write  # refresh data/cooldowns.js
 *
 * The parser accepts data literals only; it never executes downloaded code.
 */

const crypto = require('crypto');
const fs = require('fs');
const path = require('path');
const vm = require('vm');

const ROOT = path.resolve(__dirname, '..');
const SOURCE_URL = 'https://bonusfarmer.app/';
const OUTPUT_PATH = path.join(ROOT, 'data', 'cooldowns.js');
const MIN_MATCHES_TO_WRITE = 100;
const MAX_BUNDLE_BYTES = 5 * 1024 * 1024;

function balancedSlice(source, start, open, close) {
  let depth = 0;
  let quote = null;
  let escaped = false;

  for (let i = start; i < source.length; i += 1) {
    const char = source[i];
    if (quote) {
      if (escaped) escaped = false;
      else if (char === '\\') escaped = true;
      else if (char === quote) quote = null;
      continue;
    }
    if (char === '"' || char === "'") {
      quote = char;
      continue;
    }
    if (char === open) depth += 1;
    else if (char === close && --depth === 0) return source.slice(start, i + 1);
  }
  throw new Error(`Could not find closing ${close} after offset ${start}`);
}

function parseQuotedField(source, field) {
  const match = source.match(new RegExp(`(?:^|[,\\{])${field}:("(?:\\\\.|[^"\\\\])*")`));
  return match ? JSON.parse(match[1]) : null;
}

function parseStreams(siteSource) {
  const marker = siteSource.indexOf('collectionStreams:[');
  if (marker < 0) return [];
  const arrayStart = siteSource.indexOf('[', marker);
  const arraySource = balancedSlice(siteSource, arrayStart, '[', ']');
  const streams = [];

  for (let i = 1; i < arraySource.length - 1;) {
    while (/[\s,]/.test(arraySource[i])) i += 1;
    if (arraySource[i] !== '{') break;
    const streamSource = balancedSlice(arraySource, i, '{', '}');
    i += streamSource.length;

    const type = parseQuotedField(streamSource, 'type');
    const bonusName = parseQuotedField(streamSource, 'name') || 'Bonus';
    if (type === 'interval') {
      const duration = streamSource.match(/rechargeDurationMinutes:(\d+(?:\.\d+)?)/);
      if (duration && Number(duration[1]) > 0) {
        streams.push({ id: bonusName, type: 'interval', minutes: Number(duration[1]) });
      }
    } else if (type === 'fixedTime') {
      const timesMarker = streamSource.indexOf('collectionTimesUtc:[');
      if (timesMarker < 0) continue;
      const timesStart = streamSource.indexOf('[', timesMarker);
      const timesSource = balancedSlice(streamSource, timesStart, '[', ']');
      const times = [...timesSource.matchAll(/"(\d{1,2}:\d{2})"/g)].reduce((valid, match) => {
        const [hour, minute] = match[1].split(':').map(Number);
        if (minute > 59 || hour > 24 || (hour === 24 && minute !== 0)) return valid;
        valid.push(`${String(hour % 24).padStart(2, '0')}:${String(minute).padStart(2, '0')}`);
        return valid;
      }, []);
      if (times.length) streams.push({ id: bonusName, type: 'fixedUtc', times });
    }
  }

  const seen = new Map();
  return streams.map((stream) => {
    const count = (seen.get(stream.id) || 0) + 1;
    seen.set(stream.id, count);
    return count === 1 ? stream : { ...stream, id: `${stream.id} ${count}` };
  });
}

function parseSites(bundle) {
  const marker = bundle.indexOf('sites:[');
  if (marker < 0) throw new Error('The upstream bundle did not contain a sites array');
  const arrayStart = bundle.indexOf('[', marker);
  const arraySource = balancedSlice(bundle, arrayStart, '[', ']');
  const sites = [];

  for (let i = 1; i < arraySource.length - 1;) {
    while (/[\s,]/.test(arraySource[i])) i += 1;
    if (arraySource[i] !== '{') break;
    const siteSource = balancedSlice(arraySource, i, '{', '}');
    i += siteSource.length;
    const streamsMarker = siteSource.indexOf('collectionStreams:');
    const siteFields = streamsMarker >= 0 ? siteSource.slice(0, streamsMarker) : siteSource;
    const name = parseQuotedField(siteFields, 'name');
    const claimLink = parseQuotedField(siteFields, 'claimLink');
    const streams = parseStreams(siteSource);
    if (name && streams.length) sites.push({ name, claimLink, streams });
  }
  return sites;
}

function loadCatalog() {
  const catalogPath = path.join(ROOT, 'data', 'catalog.js');
  const source = fs.readFileSync(catalogPath, 'utf8');
  return new vm.Script(`${source}\nCATALOG_DATA`, { filename: catalogPath })
    .runInNewContext({}, { timeout: 5000 });
}

function normalizedName(name) {
  return name.toLowerCase()
    .replace(/\bcasino\b|\.us|\bthe\b/g, '')
    .replace(/[^a-z0-9]/g, '');
}

function rootDomain(rawUrl) {
  try {
    const host = new URL(rawUrl).hostname.toLowerCase()
      .replace(/^(www\.|m\.|wap\.|play\.|fun\.|game\.|app\.)/, '');
    const parts = host.split('.');
    return parts.length >= 2 ? parts.slice(-2).join('.') : host;
  } catch (error) {
    return null;
  }
}

function matchCatalog(catalog, sites) {
  const matches = new Map();
  const claimedSites = new Set();
  const catalogDomainCounts = catalog.reduce((counts, item) => {
    const domain = rootDomain(item.url);
    if (domain) counts.set(domain, (counts.get(domain) || 0) + 1);
    return counts;
  }, new Map());
  const hasAmbiguousDomain = (item) => catalogDomainCounts.get(rootDomain(item.url)) > 1;
  // This upstream record was renamed from Fortune Coins while retaining the
  // old domain. Matching it by its new display name would update the wrong
  // (fortunewins.com) catalog entry.
  const unsafeNameOnly = new Set(['Fortune Wins']);

  for (const item of catalog) {
    if (unsafeNameOnly.has(item.name) || hasAmbiguousDomain(item)) continue;
    const candidates = sites.filter((site) => normalizedName(site.name) === normalizedName(item.name));
    if (candidates.length === 1 && !claimedSites.has(candidates[0])) {
      matches.set(item.name, candidates[0]);
      claimedSites.add(candidates[0]);
    }
  }

  for (const item of catalog) {
    if (matches.has(item.name) || hasAmbiguousDomain(item)) continue;
    const domain = rootDomain(item.url);
    if (!domain) continue;
    const candidates = sites.filter((site) => (
      !claimedSites.has(site) && rootDomain(site.claimLink) === domain
    ));
    if (candidates.length === 1) {
      matches.set(item.name, candidates[0]);
      claimedSites.add(candidates[0]);
    }
  }
  return matches;
}

async function fetchSource() {
  const pageResponse = await fetch(SOURCE_URL, { signal: AbortSignal.timeout(15000) });
  if (!pageResponse.ok) throw new Error(`Upstream page returned HTTP ${pageResponse.status}`);
  const html = await pageResponse.text();
  const scriptPaths = [...html.matchAll(/<script[^>]+src="([^"]+)"/g)].map((match) => match[1]);
  for (const scriptPath of scriptPaths) {
    const scriptUrl = new URL(scriptPath, SOURCE_URL);
    const response = await fetch(scriptUrl, { signal: AbortSignal.timeout(15000) });
    if (!response.ok) continue;
    const contentLength = Number(response.headers.get('content-length'));
    if (Number.isFinite(contentLength) && contentLength > MAX_BUNDLE_BYTES) continue;
    if (!response.body) continue;
    const reader = response.body.getReader();
    const chunks = [];
    let received = 0;
    let tooLarge = false;
    while (true) {
      const { done, value } = await reader.read();
      if (done) break;
      received += value.byteLength;
      if (received > MAX_BUNDLE_BYTES) {
        tooLarge = true;
        await reader.cancel();
        break;
      }
      chunks.push(value);
    }
    if (tooLarge) continue;
    const source = Buffer.concat(chunks.map(chunk => Buffer.from(chunk))).toString('utf8');
    if (source.includes('collectionTimesUtc') && source.includes('rechargeDurationMinutes')) {
      return { source, scriptUrl: scriptUrl.toString() };
    }
  }
  throw new Error('Could not locate timer data in the upstream client bundles');
}

function renderOutput(matches, sourceRevision, scriptUrl) {
  const commentSafeScriptUrl = scriptUrl.replace(/\*/g, '%2A');
  const definitions = Object.fromEntries([...matches.entries()]
    .sort(([a], [b]) => (a < b ? -1 : a > b ? 1 : 0))
    .map(([catalogName, site]) => [catalogName, {
      sourceName: site.name,
      streams: site.streams,
    }]));
  return `/* Generated by scripts/sync-cooldowns.js. Do not edit by hand.\n` +
    ` * Source: ${SOURCE_URL}\n` +
    ` * Bundle: ${commentSafeScriptUrl}\n` +
    ` * Revision: ${sourceRevision}\n` +
    ` */\n` +
    `const CURATED_COOLDOWN_DATA = ${JSON.stringify({
      source: SOURCE_URL,
      revision: sourceRevision,
      definitions,
    }, null, 2)};\n`;
}

async function main() {
  const catalog = loadCatalog();
  const { source, scriptUrl } = await fetchSource();
  const sites = parseSites(source);
  const matches = matchCatalog(catalog, sites);
  const sourceRevision = crypto.createHash('sha256').update(source).digest('hex').slice(0, 16);
  const unmatched = catalog.filter((item) => !matches.has(item.name)).map((item) => item.name);

  console.log(`Bonus Farmer sites with timers: ${sites.length}`);
  console.log(`Catalog matches: ${matches.size}/${catalog.length}`);
  console.log(`Unmatched catalog entries (${unmatched.length}): ${unmatched.join(', ') || 'none'}`);

  if (process.argv.includes('--write')) {
    if (matches.size < MIN_MATCHES_TO_WRITE) {
      throw new Error(`Refusing to replace cooldown data: fewer than ${MIN_MATCHES_TO_WRITE} matches`);
    }
    fs.writeFileSync(OUTPUT_PATH, renderOutput(matches, sourceRevision, scriptUrl));
    console.log(`Wrote ${path.relative(ROOT, OUTPUT_PATH)}`);
  }
}

main().catch((error) => {
  console.error(`Cooldown sync failed: ${error.message}`);
  process.exit(1);
});
