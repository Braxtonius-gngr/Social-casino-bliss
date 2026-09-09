#!/usr/bin/env node
/*
 * Checks that every local file index.html, manifest.json, and sw.js declare
 * a reference to actually exists on disk. This is exactly the class of bug
 * that shipped once already in this repo: index.html linked manifest.json,
 * sw.js, and apple-touch-icon.png while the real files were committed under
 * different names, so all three silently 404'd.
 *
 * No dependencies: plain regexes over the text (this is a small, hand-
 * written, non-templated static site, so a full HTML/JS parser would be
 * more machinery than the problem needs) plus fs.existsSync.
 */

const fs = require('fs');
const path = require('path');

const ROOT = path.resolve(__dirname, '..');
const problems = [];
let checkedCount = 0;

function isLocalPath(value) {
  if (!value) return false;
  if (/^(https?:)?\/\//i.test(value)) return false; // absolute or protocol-relative URL
  if (/^(data|mailto|tel|javascript):/i.test(value)) return false;
  if (value.startsWith('#')) return false; // pure in-page anchor
  return true;
}

function stripFragmentAndQuery(value) {
  return value.split('#')[0].split('?')[0];
}

function checkLocalRef(sourceFile, rawValue, context) {
  if (!isLocalPath(rawValue)) return;
  const cleaned = stripFragmentAndQuery(rawValue);
  if (!cleaned) return; // e.g. "foo.html#section" with nothing before '#'
  checkedCount += 1;
  const resolved = path.resolve(ROOT, cleaned);
  if (!fs.existsSync(resolved)) {
    problems.push({ sourceFile, rawValue, context });
  }
}

function checkIndexHtml() {
  const file = 'index.html';
  const full = path.join(ROOT, file);
  if (!fs.existsSync(full)) {
    problems.push({ sourceFile: file, rawValue: '(file itself)', context: 'index.html is missing entirely' });
    return;
  }
  const html = fs.readFileSync(full, 'utf8');

  // href="..." and src="..." attributes (single- or double-quoted).
  const attrRe = /\b(?:href|src)\s*=\s*(["'])(.*?)\1/gi;
  let m;
  while ((m = attrRe.exec(html))) {
    checkLocalRef(file, m[2], `${m[2].length > 60 ? m[2].slice(0, 60) + '...' : m[2]} (href/src attribute)`);
  }

  // navigator.serviceWorker.register('sw.js') - a runtime string, not a
  // markup attribute, but a real declared reference worth catching.
  const swRe = /serviceWorker\.register\(\s*(["'])(.*?)\1/;
  const swMatch = html.match(swRe);
  if (swMatch) {
    checkLocalRef(file, swMatch[2], `${swMatch[2]} (serviceWorker.register call)`);
  }
}

function checkManifest() {
  const file = 'manifest.json';
  const full = path.join(ROOT, file);
  if (!fs.existsSync(full)) {
    problems.push({ sourceFile: file, rawValue: '(file itself)', context: 'manifest.json is missing entirely' });
    return;
  }
  let manifest;
  try {
    manifest = JSON.parse(fs.readFileSync(full, 'utf8'));
  } catch (err) {
    problems.push({ sourceFile: file, rawValue: '(parse)', context: `invalid JSON: ${err.message}` });
    return;
  }
  for (const icon of manifest.icons || []) {
    if (icon && typeof icon.src === 'string') {
      checkLocalRef(file, icon.src, `icons[].src (${icon.sizes || 'unknown size'})`);
    }
  }
}

function checkServiceWorker() {
  const file = 'sw.js';
  const full = path.join(ROOT, file);
  if (!fs.existsSync(full)) {
    problems.push({ sourceFile: file, rawValue: '(file itself)', context: 'sw.js is missing entirely' });
    return;
  }
  const source = fs.readFileSync(full, 'utf8');
  const arrayMatch = source.match(/PRECACHE_URLS\s*=\s*\[([^\]]*)\]/);
  if (!arrayMatch) {
    console.warn('Warning: could not find a PRECACHE_URLS array in sw.js - skipping that check.');
    return;
  }
  const itemRe = /(["'])(.*?)\1/g;
  let m;
  while ((m = itemRe.exec(arrayMatch[1]))) {
    checkLocalRef(file, m[2], `${m[2]} (PRECACHE_URLS entry)`);
  }
}

function main() {
  checkIndexHtml();
  checkManifest();
  checkServiceWorker();

  if (problems.length) {
    console.log(`Found ${problems.length} broken local reference(s):\n`);
    for (const p of problems) {
      console.log(`  ${p.sourceFile}: ${p.context}`);
    }
    console.error(`\nReference check failed: ${problems.length} broken reference(s) out of ${checkedCount} checked.`);
    process.exit(1);
  }

  console.log(`Reference check passed: ${checkedCount}/${checkedCount} local reference(s) resolved.`);
}

main();
