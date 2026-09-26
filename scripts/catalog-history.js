#!/usr/bin/env node
/*
 * The catalog's change history, from git. Every version of the catalog that
 * shipped - the first-parent commits of HEAD, which on main are the merges -
 * plus the working copy when it differs, diffed platform by platform.
 *
 *   node scripts/catalog-history.js   writes data/catalog-history.json
 *
 * The SEO pages render that file (so the drift check never needs git), and
 * scripts/weekly-post.js reads recent entries from buildHistory() directly.
 * It needs full history: in a shallow clone or without git it warns and
 * leaves the committed file alone (`git fetch --unshallow` fixes a clone).
 */

const fs = require('fs');
const path = require('path');
const vm = require('vm');
const { execFileSync } = require('child_process');

const ROOT = path.resolve(__dirname, '..');
const HISTORY_PATH = path.join(ROOT, 'data', 'catalog-history.json');
const CATALOG_PATH = path.join(ROOT, 'data', 'catalog.json');
// The fields a change is recorded for; daysToRedeem follows from two of them.
const COMPARED = ['tier', 'dailySC', 'cashFloor'];

function git(args) {
  return execFileSync('git', args, { cwd: ROOT, encoding: 'utf8', maxBuffer: 256 * 1024 * 1024, stdio: ['ignore', 'pipe', 'ignore'] });
}

function gitShow(sha, file) {
  try { return git(['show', `${sha}:${file}`]); } catch (error) { return null; }
}

// Before 2026-09-24 the catalog was a CATALOG_DATA array literal in
// data/catalog.js; after, that file only bootstraps data/catalog.json.
function parseCatalogJs(source) {
  const sandbox = {
    window: {},
    console: { log() {}, warn() {} },
    localStorage: { getItem() { return null; }, setItem() {} },
    XMLHttpRequest: function () { return { open() {}, send() {}, status: 0 }; }
  };
  try {
    const data = vm.runInNewContext(`${source}\n;typeof CATALOG_DATA !== 'undefined' ? CATALOG_DATA : null`, sandbox, { timeout: 2000 });
    return Array.isArray(data) && data.length ? data : null;
  } catch (error) {
    return null;
  }
}

function catalogAt(sha) {
  const json = gitShow(sha, 'data/catalog.json');
  if (json !== null) {
    try {
      const data = JSON.parse(json);
      if (Array.isArray(data)) return data;
    } catch (error) { /* fall through to the older format */ }
  }
  const js = gitShow(sha, 'data/catalog.js');
  return js === null ? null : parseCatalogJs(js);
}

function snapshot(entry) {
  const num = (value) => (typeof value === 'number' && Number.isFinite(value) ? value : null);
  return {
    tier: typeof entry.tier === 'string' && entry.tier ? entry.tier : 'Unranked',
    dailySC: num(entry.dailySC),
    cashFloor: num(entry.cashFloor),
    daysToRedeem: num(entry.daysToRedeem)
  };
}

function byName(catalog) {
  const map = new Map();
  for (const entry of catalog) {
    if (entry && typeof entry.name === 'string' && entry.name.trim()) map.set(entry.name.trim(), snapshot(entry));
  }
  return map;
}

function changedFields(from, to) {
  return COMPARED.filter(field => from[field] !== to[field]);
}

// "Goldenhearts Games" -> "Golden Hearts Games" is a respelling, not a new platform.
function nameKey(name) {
  return name.toLowerCase().replace(/[^a-z0-9]/g, '');
}

function localDate(date) {
  const pad = (n) => String(n).padStart(2, '0');
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}`;
}

// The versions to diff, oldest first: { date, catalog }. A commit's date is
// the day in its own timezone (the merge on main, for anything shipped).
function catalogVersions({ includeWorkingCopy = true } = {}) {
  const log = git(['log', '--first-parent', '--format=%H %cI', 'HEAD', '--', 'data/catalog.json', 'data/catalog.js'])
    .trim().split('\n').filter(Boolean).reverse();
  const versions = [];
  for (const line of log) {
    const [sha, iso] = line.split(' ');
    const catalog = catalogAt(sha);
    if (catalog) versions.push({ date: iso.slice(0, 10), catalog });
  }
  if (includeWorkingCopy) {
    const working = fs.readFileSync(CATALOG_PATH, 'utf8');
    const head = gitShow('HEAD', 'data/catalog.json');
    if (working !== head) versions.push({ date: localDate(new Date()), catalog: JSON.parse(working) });
  }
  return versions;
}

// { "<platform>": [ { date, added?, removed?, renamedFrom?, changed: [...], from, to }, newest first ] }
// A renamed platform's earlier events move to its new name.
function buildHistory(options) {
  const shallow = git(['rev-parse', '--is-shallow-repository']).trim() === 'true';
  if (shallow) throw new Error('This clone is shallow, so its catalog history is incomplete. Run `git fetch --unshallow` first.');
  const versions = catalogVersions(options);
  const events = new Map();
  const push = (name, event) => {
    if (!events.has(name)) events.set(name, []);
    const list = events.get(name);
    const last = list[list.length - 1];
    // Several versions on one day read as one change: first "from", last "to".
    if (last && last.date === event.date && !last.removed && !event.added) {
      if (event.removed) {
        list.pop();
        if (!last.added) list.push({ date: event.date, removed: true, from: last.from });
        return;
      }
      last.to = event.to;
      if (!last.added) {
        if (event.renamedFrom && !last.renamedFrom) last.renamedFrom = event.renamedFrom;
        last.changed = changedFields(last.from, last.to);
        if (!last.changed.length && !last.renamedFrom) list.pop();
      }
      return;
    }
    list.push(event);
  };
  for (let i = 1; i < versions.length; i++) {
    const before = byName(versions[i - 1].catalog);
    const after = byName(versions[i].catalog);
    const date = versions[i].date;
    const renamedFrom = new Map();   // new name -> old name
    const addedByKey = new Map();
    for (const name of after.keys()) if (!before.has(name)) addedByKey.set(nameKey(name), name);
    for (const name of before.keys()) {
      const newName = after.has(name) ? null : addedByKey.get(nameKey(name));
      if (newName && !renamedFrom.has(newName)) {
        renamedFrom.set(newName, name);
        if (events.has(name)) {
          events.set(newName, events.get(name).concat(events.get(newName) || []));
          events.delete(name);
        }
      }
    }
    const renamedAway = new Set(renamedFrom.values());
    for (const [name, to] of after) {
      const oldName = renamedFrom.get(name);
      const from = before.get(oldName || name);
      if (!from) push(name, { date, added: true, to });
      else if (oldName) push(name, { date, renamedFrom: oldName, changed: changedFields(from, to), from, to });
      else if (changedFields(from, to).length) push(name, { date, changed: changedFields(from, to), from, to });
    }
    for (const [name, from] of before) {
      if (!after.has(name) && !renamedAway.has(name)) push(name, { date, removed: true, from });
    }
  }
  const out = {};
  for (const name of [...events.keys()].sort((a, b) => a.localeCompare(b))) out[name] = events.get(name).slice().reverse();
  return out;
}

function readHistoryFile() {
  try {
    const parsed = JSON.parse(fs.readFileSync(HISTORY_PATH, 'utf8'));
    return parsed && typeof parsed === 'object' ? parsed : {};
  } catch (error) {
    return {};
  }
}

function main() {
  let history;
  try {
    history = buildHistory();
  } catch (error) {
    console.warn(`Catalog history not rebuilt: ${error.message.split('\n')[0]} Keeping data/catalog-history.json as it is.`);
    return;
  }
  const text = `${JSON.stringify(history, null, 2)}\n`;
  const previous = fs.existsSync(HISTORY_PATH) ? fs.readFileSync(HISTORY_PATH, 'utf8') : null;
  if (previous !== text) fs.writeFileSync(HISTORY_PATH, text);
  const count = Object.values(history).reduce((n, list) => n + list.length, 0);
  console.log(`Catalog history: ${count} change(s) across ${Object.keys(history).length} platform(s)${previous === text ? ', unchanged' : ''}.`);
}

module.exports = { buildHistory, readHistoryFile, HISTORY_PATH };

if (require.main === module) main();
