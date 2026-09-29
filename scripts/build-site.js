#!/usr/bin/env node
/*
 * The deploy step. The repository stays build-free and readable; this
 * writes what the host should actually serve to dist/:
 *
 *   - everything the site needs, copied as is;
 *   - never data/catalog.json (the catalogue is served by the database
 *     to signed-in accounts) nor anything else repo-only: scripts,
 *     migrations, docs, package files;
 *   - every script minified with terser, inline ones included, keeping
 *     top-level names (inline onclick handlers and the classic scripts
 *     depend on them). Casual copying gets harder; the app is unchanged.
 *
 * Cloudflare Pages: build command `npm ci && npm run build:site`, output
 * directory `dist`. The smoke tests run against this output in CI
 * (SMOKE_ROOT=dist), so a minification that broke anything would fail
 * there before it deployed.
 */
'use strict';

const fs = require('fs');
const path = require('path');
const { minify } = require('terser');

const ROOT = path.resolve(__dirname, '..');
const OUT = path.join(ROOT, process.env.BUILD_OUT || 'dist');

// Repo-only: never served.
const SKIP_DIRS = new Set(['.git', '.github', '.claude', '.vscode', 'node_modules', 'dist', 'docs', 'scripts', 'supabase', 'tools']);
const SKIP_FILES = new Set([
  '.gitignore', 'package.json', 'package-lock.json',
  'AGENTS.md', 'CLAUDE.md', 'README.md', 'SECURITY.md'
]);
// The catalogue and anything else under data/ that is data rather than
// the bootstrap script.
const isSkippedDataFile = rel => rel.startsWith('data' + path.sep) && rel.endsWith('.json');

const TERSER_OPTIONS = {
  ecma: 2020,
  compress: { passes: 2 },
  // Top-level names stay: classic scripts share globals across files and
  // 130+ inline onclick handlers call them by name.
  mangle: { toplevel: false },
  format: { comments: false }
};

async function minifyJs(code, label) {
  const result = await minify(code, TERSER_OPTIONS);
  if (!result.code) throw new Error(`terser produced nothing for ${label}`);
  return result.code;
}

// Every <script> without a src attribute, minified in place.
async function minifyInlineScripts(html, label) {
  const pattern = /<script(\s[^>]*)?>([\s\S]*?)<\/script>/g;
  const pieces = [];
  let last = 0;
  let match;
  let count = 0;
  while ((match = pattern.exec(html)) !== null) {
    const attrs = match[1] || '';
    const body = match[2];
    pieces.push(html.slice(last, match.index));
    if (/\ssrc\s*=/.test(attrs) || (/\stype\s*=/.test(attrs) && !/\stype\s*=\s*["']?(text\/javascript|module)/.test(attrs)) || !body.trim()) {
      pieces.push(match[0]);
    } else {
      const minified = await minifyJs(body, `${label} inline script ${count + 1}`);
      pieces.push(`<script${attrs}>${minified}</script>`);
      count++;
    }
    last = match.index + match[0].length;
  }
  pieces.push(html.slice(last));
  return { html: pieces.join(''), count };
}

function walk(dir, rel = '') {
  const out = [];
  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    const entryRel = rel ? path.join(rel, entry.name) : entry.name;
    if (entry.isDirectory()) {
      if (!rel && SKIP_DIRS.has(entry.name)) continue;
      out.push(...walk(path.join(dir, entry.name), entryRel));
    } else if (entry.isFile()) {
      if (!rel && SKIP_FILES.has(entry.name)) continue;
      if (isSkippedDataFile(entryRel)) continue;
      out.push(entryRel);
    }
  }
  return out;
}

async function main() {
  fs.rmSync(OUT, { recursive: true, force: true });
  fs.mkdirSync(OUT, { recursive: true });
  const files = walk(ROOT);
  let scripts = 0;
  let inline = 0;
  let before = 0;
  let after = 0;
  for (const rel of files) {
    const src = path.join(ROOT, rel);
    const dest = path.join(OUT, rel);
    fs.mkdirSync(path.dirname(dest), { recursive: true });
    if (rel.endsWith('.js')) {
      const code = fs.readFileSync(src, 'utf8');
      const minified = await minifyJs(code, rel);
      fs.writeFileSync(dest, minified);
      scripts++;
      before += code.length;
      after += minified.length;
    } else if (rel.endsWith('.html')) {
      const html = fs.readFileSync(src, 'utf8');
      const result = await minifyInlineScripts(html, rel);
      fs.writeFileSync(dest, result.html);
      inline += result.count;
      before += html.length;
      after += result.html.length;
    } else {
      fs.copyFileSync(src, dest);
    }
  }
  if (fs.existsSync(path.join(OUT, 'data', 'catalog.json'))) throw new Error('data/catalog.json must not be deployed');
  const kb = n => `${Math.round(n / 1024)} KB`;
  console.log(`Built ${path.relative(ROOT, OUT)}/: ${files.length} files, ${scripts} scripts and ${inline} inline scripts minified (${kb(before)} -> ${kb(after)}); no catalogue file.`);
}

main().catch(error => {
  console.error(`Build failed: ${error.message}`);
  process.exit(1);
});
