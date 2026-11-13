#!/usr/bin/env node
/*
 * The two bookkeeping steps of a design-system sync (see README.md), after
 * build.mjs has written <outDir>/project/.
 *
 *   node tools/design-system/assemble.mjs plan <outDir> <oldSyncState.json|->
 *     Prints { changed, sourceHash, upload: [{key, src}], removedFiles: [...] }.
 *     `changed: false` means the artifact is already current: stop.
 *
 *   node tools/design-system/assemble.mjs finish <outDir> <currentIndex.json> <oldSyncState.json|-> <uploads.json|-> [note]
 *     uploads.json maps "<Group>/<name>" to the blob id each upload returned.
 *     Writes <outDir>/project/design-system.json (the current index with only
 *     groups, assetGroups and lastChange rewritten) and fills each asset's
 *     blob into <outDir>/project/sync-state.json. Prints the files to publish.
 */

import fs from 'node:fs';
import path from 'node:path';

const [mode, outDir, ...rest] = process.argv.slice(2);
const readJson = (p) => (p && p !== '-' && fs.existsSync(p) ? JSON.parse(fs.readFileSync(p, 'utf8')) : null);
const PROJECT = path.join(path.resolve(outDir || '.'), 'project');
const statePath = path.join(PROJECT, 'sync-state.json');
const fresh = readJson(statePath);
if (!fresh) {
  console.error('run build.mjs first: no ' + statePath);
  process.exit(2);
}
const key = (a) => `${a.group}/${a.name}`;

function plan(oldState) {
  const old = new Map((oldState?.assets || []).map((a) => [key(a), a]));
  const upload = fresh.assets
    .filter((a) => !old.has(key(a)) || old.get(key(a)).sha256 !== a.sha256 || !old.get(key(a)).blob)
    .map((a) => ({ key: key(a), src: a.src }));
  const removedFiles = (oldState?.files || []).filter((f) => !fresh.files.includes(f));
  return { changed: !oldState || oldState.sourceHash !== fresh.sourceHash, sourceHash: fresh.sourceHash, upload, removedFiles };
}

if (mode === 'plan') {
  console.log(JSON.stringify(plan(readJson(rest[0])), null, 1));
} else if (mode === 'finish') {
  const [indexPath, oldPath, uploadsPath, note] = rest;
  const index = readJson(indexPath);
  if (!index || !index.createdOnFiles) {
    console.error('the current index is missing or has no createdOnFiles marker: read project/design-system.json from the artifact first');
    process.exit(2);
  }
  const oldState = readJson(oldPath);
  const old = new Map((oldState?.assets || []).map((a) => [key(a), a]));
  const uploads = readJson(uploadsPath) || {};
  const missing = [];
  for (const a of fresh.assets) {
    const prev = old.get(key(a));
    const up = uploads[key(a)];
    if (up) {
      // An upload's result: its id, or {blob, size} when the store reports another size (SVG is normalised).
      a.blob = typeof up === 'string' ? up : up.blob;
      a.storedSize = (typeof up === 'object' && up.size) || a.size;
    } else if (prev && prev.sha256 === a.sha256 && prev.blob) {
      a.blob = prev.blob;
      a.storedSize = prev.storedSize || prev.size;
    } else if (!oldState) {
      // The first sync's assets were uploaded before sync-state existed: take them from the index by name.
      const rec = index.assetGroups?.[a.group]?.files?.[a.name];
      if (rec) {
        a.blob = rec.blob;
        a.storedSize = rec.size;
      }
    }
    if (!a.blob) missing.push(key(a));
  }
  if (missing.length) {
    console.error('no blob id for: ' + missing.join(', ') + ' - upload them and list them in uploads.json');
    process.exit(3);
  }
  const groups = [...new Set(fresh.assets.map((a) => a.group))];
  const assetGroups = {};
  for (const g of groups) {
    const files = fresh.assets.filter((a) => a.group === g);
    const prev = index.assetGroups?.[g] || {};
    assetGroups[g] = {
      ...prev,
      name: g,
      tile: prev.tile || (g === 'Logos' ? 'l' : 'm'),
      order: files.map((a) => a.name),
      files: Object.fromEntries(files.map((a) => [a.name.replace(/[^A-Za-z0-9_./-]/g, (c) => '~' + c.charCodeAt(0).toString(16).padStart(2, '0')),
        { name: a.name, blob: a.blob, size: a.storedSize, type: a.type }]))
    };
  }
  index.groups = groups;
  index.assetGroups = assetGroups;
  index.lastChange = {
    by: 'Claude',
    at: new Date().toISOString().replace(/\.\d+Z$/, 'Z'),
    via: `GitHub · braxtonius-gngr/social-casino-bliss@${fresh.ref}`,
    note: (note || `Synced to ${fresh.ref}`).slice(0, 280)
  };
  fs.writeFileSync(path.join(PROJECT, 'design-system.json'), JSON.stringify(index, null, 1) + '\n');
  fs.writeFileSync(statePath, JSON.stringify(fresh, null, 1) + '\n');
  const p = plan(oldState);
  console.log(JSON.stringify({
    file_path: path.join(PROJECT, 'design-system.json'),
    root: path.dirname(PROJECT),
    files: [...fresh.files.map((f) => 'project/' + f), 'project/sync-state.json'],
    remove: p.removedFiles.map((f) => 'project/' + f)
  }, null, 1));
} else {
  console.error('usage: assemble.mjs plan <outDir> <oldSyncState|-> | finish <outDir> <currentIndex> <oldSyncState|-> <uploads|-> [note]');
  process.exit(2);
}
