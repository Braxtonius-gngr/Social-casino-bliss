#!/usr/bin/env node
/*
 * Syntax-checks every classic <script> this app ships: the .js files under
 * assets/ and utils/, plus the inline <script> block in index.html (the one
 * with no src= attribute - the app has no build step, so that block is real,
 * shipped code, not a template).
 *
 * Uses `node --check`, which parses without executing and needs no
 * dependencies beyond Node itself. This app deliberately has no linter: it
 * relies on 130+ inline onclick="..." handlers calling globals defined in a
 * classic (non-module) script, and ESLint only gives meaningful coverage of
 * index.html's inline script after that script is extracted to its own
 * file - which is exactly what this check already does internally to run
 * `node --check` on it. Doing that extraction just for linting, without
 * changing how the app actually loads the code, would add a dependency and
 * a build step for no real safety gain over syntax checking; this script is
 * the smaller, dependency-free alternative that runs today.
 */

const fs = require('fs');
const path = require('path');
const os = require('os');
const { execFileSync } = require('child_process');

const ROOT = path.resolve(__dirname, '..');

function findJsFiles(dir) {
  const results = [];
  if (!fs.existsSync(dir)) return results;
  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    const full = path.join(dir, entry.name);
    if (entry.isDirectory()) results.push(...findJsFiles(full));
    else if (entry.isFile() && entry.name.endsWith('.js')) results.push(full);
  }
  return results;
}

function extractInlineScript(htmlPath) {
  const html = fs.readFileSync(htmlPath, 'utf8');
  // Only <script> tags with no src= attribute carry real inline JS here.
  const scriptTagRe = /<script(\s[^>]*)?>([\s\S]*?)<\/script>/gi;
  const blocks = [];
  let match;
  while ((match = scriptTagRe.exec(html))) {
    const attrs = match[1] || '';
    if (/\bsrc\s*=/.test(attrs)) continue;
    if (/\btype\s*=\s*["']application\/json["']/i.test(attrs)) continue;
    blocks.push(match[2]);
  }
  return blocks;
}

function checkFile(label, source) {
  const tmpFile = path.join(os.tmpdir(), `syntax-check-${Date.now()}-${Math.random().toString(36).slice(2)}.js`);
  fs.writeFileSync(tmpFile, source);
  try {
    execFileSync(process.execPath, ['--check', tmpFile], { stdio: 'pipe' });
    return { label, ok: true };
  } catch (err) {
    const stderr = err.stderr ? err.stderr.toString() : err.message;
    // Strip the temp path so the error reads cleanly.
    return { label, ok: false, error: stderr.split(tmpFile).join(label) };
  } finally {
    fs.unlinkSync(tmpFile);
  }
}

function main() {
  const results = [];

  const jsFiles = [
    ...findJsFiles(path.join(ROOT, 'assets')),
    ...findJsFiles(path.join(ROOT, 'utils')),
    ...findJsFiles(path.join(ROOT, 'scripts')),
  ];
  for (const file of jsFiles) {
    const rel = path.relative(ROOT, file);
    const source = fs.readFileSync(file, 'utf8');
    results.push(checkFile(rel, source));
  }

  const indexPath = path.join(ROOT, 'index.html');
  if (fs.existsSync(indexPath)) {
    const inlineBlocks = extractInlineScript(indexPath);
    inlineBlocks.forEach((source, i) => {
      const label = inlineBlocks.length > 1
        ? `index.html (inline <script> #${i + 1})`
        : 'index.html (inline <script>)';
      results.push(checkFile(label, source));
    });
    if (inlineBlocks.length === 0) {
      console.warn('Warning: no inline <script> block (without src=) found in index.html.');
    }
  }

  const failed = results.filter((r) => !r.ok);
  for (const r of results) {
    console.log(`${r.ok ? 'OK  ' : 'FAIL'}  ${r.label}`);
  }
  if (failed.length) {
    console.log('');
    for (const r of failed) {
      console.log(`--- ${r.label} ---`);
      console.log(r.error.trim());
      console.log('');
    }
    console.error(`Syntax check failed: ${failed.length}/${results.length} file(s) have syntax errors.`);
    process.exit(1);
  }

  console.log(`\nSyntax check passed: ${results.length}/${results.length} file(s) OK.`);
}

main();
