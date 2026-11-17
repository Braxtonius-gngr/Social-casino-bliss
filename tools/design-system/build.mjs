#!/usr/bin/env node
/*
 * Builds the Daily Roll Over design system (a Design System artifact on
 * claude.ai) from this repository, so it stays in step with the code.
 *
 *   node tools/design-system/build.mjs <outDir> [--root <repoDir>]
 *
 * Writes <outDir>/project/... - the files the artifact keeps - and prints a
 * JSON summary: { sourceHash, ref, themes, colors, assets }. Nothing here is
 * shipped or run by the app; it is a dev tool, like tools/skin-codegen.
 *
 * Sources:
 *   - index.html  THEMES: every theme with `vars` becomes a theme, in picker
 *     order (a new skin appears on its own). Values are the live ones
 *     applyTheme() sets, not app.css's first-paint copies.
 *   - assets/app.css: a few literals with no variable (glass fill, ink on
 *     gold) are listed in EXTRA below with the rule they come from.
 *   - content/: the hand-written parts (brand book, component CSS, previews,
 *     asset notes). README.md's {{SKINS_TABLE}} and {{CONTRAST}} are filled
 *     in here, from THEMES and computed contrast.
 *   - assets: the groups in ASSET_GROUPS, by folder (new files appear).
 *
 * sourceHash covers everything published except the commit and date, so an
 * unchanged hash means there is nothing to republish.
 */

import fs from 'node:fs';
import path from 'node:path';
import crypto from 'node:crypto';
import { execFileSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';

const HERE = path.dirname(fileURLToPath(import.meta.url));
const args = process.argv.slice(2);
const outDir = args[0];
if (!outDir || outDir.startsWith('--')) {
  console.error('usage: node tools/design-system/build.mjs <outDir> [--root <repoDir>]');
  process.exit(2);
}
const rootIdx = args.indexOf('--root');
const ROOT = path.resolve(rootIdx > -1 ? args[rootIdx + 1] : path.join(HERE, '..', '..'));
const CONTENT = path.join(HERE, 'content');
const OUT = path.join(path.resolve(outDir), 'project');

// ---------- THEMES from index.html ----------
function readThemes() {
  const src = fs.readFileSync(path.join(ROOT, 'index.html'), 'utf8');
  const at = src.indexOf('const THEMES = {');
  if (at < 0) throw new Error('THEMES not found in index.html');
  const start = src.indexOf('{', at);
  let depth = 0;
  let end = start;
  for (; end < src.length; end++) {
    const c = src[end];
    if (c === '{') depth++;
    else if (c === '}' && --depth === 0) break;
  }
  // The object literal is plain data (strings, nulls, comments).
  return Function('return ' + src.slice(start, end + 1))();
}

const THEMES = readThemes();
const themes = Object.entries(THEMES)
  .filter(([, t]) => t && t.vars)
  .map(([id, t]) => ({ id, name: t.name, description: t.description || '', vars: t.vars }));
if (!themes.length) throw new Error('no themes with vars in THEMES');
if (themes.length > 8) console.error(`warning: ${themes.length} themes; the artifact shows at most 8`);
const first = themes[0].id;

// ---------- colour helpers ----------
const lc = (v) => (v.startsWith('#') ? v.toLowerCase() : v.replace(/\s+/g, ' '));
function lum(hex) {
  const h = hex.replace('#', '');
  const full = h.length === 3 ? h.split('').map((c) => c + c).join('') : h.slice(0, 6);
  const ch = [0, 2, 4].map((i) => parseInt(full.substr(i, 2), 16) / 255)
    .map((c) => (c <= 0.03928 ? c / 12.92 : ((c + 0.055) / 1.055) ** 2.4));
  return 0.2126 * ch[0] + 0.7152 * ch[1] + 0.0722 * ch[2];
}
const ratio = (a, b) => {
  const x = lum(a);
  const y = lum(b);
  return (Math.max(x, y) + 0.05) / (Math.min(x, y) + 0.05);
};
const isHex = (v) => /^#[0-9a-f]{3,8}$/i.test(v || '');
function contrastOf(name, ground = '--bg-base') {
  return themes
    .filter((t) => isHex(t.vars['--' + name]) && isHex(t.vars[ground]))
    .map((t) => ({ id: t.id, name: t.name, r: ratio(t.vars['--' + name], t.vars[ground]) }));
}
const fmt = (r) => r.toFixed(1);
const range = (list) => {
  const rs = list.map((x) => x.r);
  return `${fmt(Math.min(...rs))}–${fmt(Math.max(...rs))}:1`;
};

// ---------- colour tokens ----------
// Literals in app.css with no variable of their own.
const EXTRA = {
  // .glass-panel base; [data-theme="obsidian"] .glass-panel; [data-theme="glitch"] .glass-panel
  'glass-surface': { [first]: 'rgba(22, 24, 29, 0.75)', obsidian: 'rgba(27, 25, 22, 0.94)', glitch: 'rgba(8, 10, 13, 0.78)' },
  // .btn-open / .btn-primary text; [data-theme="obsidian"] .btn-open
  'ink-on-gold': { [first]: '#0a0a0a', obsidian: '#201c14' },
  // :root in app.css (shared across skins, not in THEMES)
  'tier-d': { [first]: '#5a5d63' },
  'tier-f': { [first]: '#8b4a4a' },
  'tier-notrankable': { [first]: '#6e5a8c' }
};

const ORDER = ['bg-base', 'glass-surface', 'glass-border', 'glass-highlight', 'text-main', 'text-muted', 'text-dim',
  'accent-gold', 'accent-gold-hover', 'accent-gold-dim', 'accent-gold-glow', 'ink-on-gold', 'accent-silver', 'accent-bronze',
  'accent-green', 'accent-green-dim', 'accent-pink', 'accent-pink-dim', 'accent-orange', 'accent-orange-dim',
  'accent-cyan', 'accent-cyan-dim', 'tier-s', 'tier-a', 'tier-b', 'tier-c', 'tier-d', 'tier-f', 'tier-notrankable'];

const allVarNames = new Set();
for (const t of themes) for (const k of Object.keys(t.vars)) allVarNames.add(k.replace(/^--/, ''));
for (const k of Object.keys(EXTRA)) allVarNames.add(k);
const names = [...ORDER.filter((n) => allVarNames.has(n)), ...[...allVarNames].filter((n) => !ORDER.includes(n)).sort()];

function failing(name, floor = 4.5) {
  return contrastOf(name).filter((x) => x.r < floor);
}
function usageFor(name) {
  const pinkFail = failing('accent-pink');
  const muted = contrastOf('text-muted');
  const dim = contrastOf('text-dim');
  const goldInk = themes.map((t) => ratio((EXTRA['ink-on-gold'][t.id] || EXTRA['ink-on-gold'][first]), t.vars['--accent-gold']));
  const U = {
    'bg-base': 'Page ground behind every glass surface; also the browser theme-color. Each skin layers its own bodyBg gradient over it.',
    'glass-surface': 'Fill of .glass-panel (cards, sheets, rails). Executive paints a gradient (#17181d → #0a0b0e) over this; Obsidian and Dead Channel use their own solid fills, recorded per theme.',
    'glass-border': '1px border on every glass surface, input, chip and pill.',
    'glass-highlight': 'Top and left hairline of a glass surface (light off metal) and the dock\'s top rule.',
    'text-main': 'Primary text: names, headings, input values, on bg-base and glass-surface.',
    'text-muted': `Secondary text: labels, inactive tabs and chips, summaries. ${range(muted)} on bg-base.`,
    'text-dim': `Tertiary meta only (verify tags, disclosure summaries). ${range(dim)} on bg-base${dim.some((x) => x.r < 4.5) ? ' - below 4.5:1, kept exact from source; never for body copy' : ''}.`,
    'accent-gold': 'The action colour: primary buttons, active tab and chip, wordmark brand word, focus borders. Text on it is ink-on-gold.',
    'accent-gold-hover': 'Hover state of any accent-gold fill.',
    'accent-gold-dim': 'Fill behind an active tab or chip (with an accent-gold border and text).',
    'accent-gold-glow': 'Halo round an active gold control.',
    'ink-on-gold': `Text on an accent-gold fill (btn-open, btn-primary, landing CTA, tour tip). ${fmt(Math.min(...goldInk))}:1 or more on gold in every skin.`,
    'accent-silver': 'Tier A in the Executive podium.',
    'accent-bronze': 'Tier B in the Executive podium.',
    'accent-green': 'Ready / go: status dot, hero ring, add-tier hover, tracked catalog row.',
    'accent-green-dim': 'Fill behind green states (tracked row, ring wash).',
    'accent-pink': 'Danger and alerts: btn-danger, keen info popover, toggles.' + (pinkFail.length ? ` Under 4.5:1 as text in ${pinkFail.map((x) => x.name).join(', ')} - kept exact; pair with a word.` : ''),
    'accent-pink-dim': 'Fill of btn-danger and remove-tier hover.',
    'accent-orange': 'Warnings and sorting: type badge, sort chips and priority numbers, stale verify tags, blocked summaries.',
    'accent-orange-dim': 'Fill of an active sort option and type badge.',
    'accent-cyan': 'Secondary accent: opened disclosure summaries, info highlights.',
    'accent-cyan-dim': 'Fill behind cyan highlights.',
    'tier-s': 'Tier S badge (text, border, 20% wash). Executive: gold.',
    'tier-a': 'Tier A badge. Executive: silver.',
    'tier-b': 'Tier B badge. Executive: bronze.',
    'tier-c': 'Tier C badge.',
    'tier-d': 'Tier D badge, dashed border. Shared across skins; bold 10px text, kept exact.',
    'tier-f': 'Tier F (warning) badge, dashed border. Shared across skins.',
    'tier-notrankable': 'Not Rankable badge, dotted border - permanent, unlike Unranked (a data gap).'
  };
  if (U[name]) return U[name];
  const owners = themes.filter((t) => t.vars['--' + name]).map((t) => t.name);
  if (name.startsWith('wire-')) return `${owners.join(', ')} circuit-board wiring only.`;
  return `var(--${name}) in ${owners.length === themes.length ? 'every skin' : owners.join(', ')}.`;
}

const colorTokens = names.map((n) => {
  const value = {};
  for (const t of themes) if (t.vars['--' + n]) value[t.id] = lc(t.vars['--' + n]);
  Object.assign(value, EXTRA[n] || {});
  return { name: n, value, usage: usageFor(n) };
});

// ---------- the rest of tokens.json (lifted from app.css) ----------
const SPACING = [[2, 'Badge vertical padding; nav-tab label gap.'], [4, 'Settings gear padding; tag-pill gap; swatch gap.'],
  [6, 'Chip and pill gaps; ledger card wrapper gap; tier button pair.'], [8, 'Card-action gap; title-row gap; sort grid gap.'],
  [10, 'Ledger card inner gap; modal-actions gap; tier action card padding.'], [12, 'Game list gap; catalog row padding; input padding.'],
  [14, 'Ledger card padding; avatar-to-name gap; sort drawer padding.'], [16, 'Docked footer padding; form-group spacing; catalog row side padding.'],
  [18, 'Hero card inner gap; btn-open side padding.'], [20, 'Hero card padding; section margins; modal action top margin.'],
  [24, 'Sheet modal padding; wordmark bottom margin.']];
const RADII = [['radius-xs', '3px', 'Tag pill.'], ['radius-sm', '4px', 'Tier and type badges.'], ['radius-md', '6px', 'Sort chips, tier toggle buttons.'],
  ['radius-lg', '8px', 'Tier action cards, sort options, plan rows, settings select.'], ['radius-input', '10px', 'Form inputs and modal buttons (btn-primary, btn-cancel, btn-danger).'],
  ['radius-xl', '12px', 'Catalog search, catalog rows, keen popover.'], ['radius-card', '14px', 'Ledger card, sort drawer, tour tip.'],
  ['radius-pill', '20px', 'btn-open, filter chips, hero stat card, sheet modal.'], ['radius-tab', '24px', 'Nav tab inside the rail.'],
  ['radius-rail', '30px', 'Nav pill rail, landing CTA.'], ['radius-round', '50%', 'Avatar, status dot, hero ring, sort priority number.']];

const style = (name, fontSize, fontWeight, lineHeight, sample, usage, letterSpacing) =>
  Object.assign({ name, fontSize, fontWeight }, letterSpacing ? { letterSpacing } : {}, { lineHeight, sample, usage });

const TYPE = {
  fonts: [],
  families: {
    sans: '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, "Helvetica Neue", Arial, sans-serif',
    serif: 'Georgia, "Times New Roman", serif',
    mono: '"Courier New", Courier, monospace'
  },
  groups: [
    { name: 'Wordmark', family: 'serif', styles: [
      style('landing-title', '2.6rem', 700, 1.1, 'Daily Roll Over', 'Landing wordmark (.landing-title); brand word in accent-gold.', '0.01em'),
      style('app-title', '2rem', 700, 1.15, 'Daily Roll Over', 'In-app wordmark (.app-title), centred; brand word in accent-gold.', '0.01em'),
      style('sheet-title', '1.35rem', 400, 1.2, 'SETTINGS', 'Sheet modal heading (.sheet-modal h3), uppercase.', '0.02em')] },
    { name: 'UI', family: 'sans', styles: [
      style('hero-stat', '1.5rem', 900, 1, '12', 'Ready count inside the hero ring.'),
      style('hero-heading', '1.15rem', 800, 1.25, 'Your daily run', 'Hero details heading.', '-0.015em'),
      style('card-name', '0.98rem', 800, 1.3, 'Golden Hearts', 'Platform name on a ledger card; ellipsizes.', '-0.01em'),
      style('body', '0.9rem', 600, 1.4, 'Daily bonus tracker for sweepstakes platforms.', 'Inputs, toggle rows, search.'),
      style('button', '0.85rem', 900, 1, 'OPEN', 'btn-open; btn-primary uses 0.9rem at the same weight.'),
      style('popover', '0.8rem', 400, 1.5, 'Purchase required before the daily bonus unlocks.', 'Keen info popover and research notes.'),
      style('nav-tab', '0.76rem', 700, 1.2, 'Ledger', 'Nav tabs and filter chips (filter chips at weight 600).'),
      style('label-caps', '0.75rem', 800, 1.2, 'DISPLAY NAME', 'Form labels and drawer headers, uppercase.', '0.05em'),
      style('date-header', '0.75rem', 800, 1.2, 'FRIDAY 13 NOVEMBER', 'Date line atop the app, uppercase, text-muted.', '0.15em'),
      style('badge', '0.65rem', 900, 1.2, 'S', 'Tier badge, uppercase.'),
      style('tag', '0.62rem', 700, 1.2, 'CRYPTO', 'Tag pills and type badges.')] },
    { name: 'Mono', family: 'mono', styles: [
      style('avatar', '1rem', 900, 1, 'GH', 'Platform initials in the avatar disc.'),
      style('detail-mono', '0.78rem', 400, 1.4, 'next roll 08:00', 'Hero detail lines and status times.')] }
  ]
};

const tokens = {
  name: 'Daily Roll Over',
  version: 1,
  color: { themes: themes.map(({ id, name }) => ({ id, name })), tokens: colorTokens },
  type: TYPE,
  spacing: { tokens: SPACING.map(([n, usage]) => ({ name: 'space-' + n, value: n + 'px', usage })) },
  radius: { tokens: RADII.map(([name, value, usage]) => ({ name, value, usage })) },
  shadow: { tokens: [
    { name: 'shadow-panel', value: '0 1px 0 rgba(255, 255, 255, 0.03) inset, 0 6px 24px rgba(0, 0, 0, 0.55)', usage: 'Base .glass-panel depth.' },
    { name: 'shadow-button', value: '0 2px 10px rgba(0, 0, 0, 0.45)', usage: 'btn-open lift.' },
    { name: 'shadow-dock', value: '0 -10px 40px rgba(0, 0, 0, 0.8)', usage: 'Docked footer, casting upward.' },
    { name: 'shadow-float', value: '0 10px 40px rgba(0, 0, 0, 0.55)', usage: 'Tour tooltip and floating popovers.' }] },
  zIndex: { note: 'Stacking order from app.css.', tokens: [
    { name: 'z-dock', value: '50', usage: 'Docked footer.' },
    { name: 'z-fab', value: '60', usage: 'Feedback button above the dock.' },
    { name: 'z-tour', value: '98', usage: 'Tour tip (its target at 99): above the page, below sheets.' },
    { name: 'z-sheet', value: '100', usage: 'Sheet backdrop and modal.' },
    { name: 'z-run', value: '300', usage: 'Daily run overlay.' }] }
};

// ---------- README fill-ins ----------
const CHARACTER = {
  executive: 'The base. Gold on obsidian, opaque panels, gold/silver/bronze tier podium.',
  prism: 'Gold on near-black with circuit wiring in `wire-*` neon.',
  neon: 'Neon sign shop: hot pink, cyan, acid green.',
  obsidian: 'Georgian almanac: muted brass, sage, no text glow.',
  glitch: 'Dead TV channel: bone phosphor, spirit blue, blood red.',
  western: 'Amber on black under a red bloom.',
  burin: 'Copper engraving: bone ink on dark plate, blood red.'
};
const firstSentence = (s) => (s.split(/(?<=\.)\s/)[0] || '').replace(/\|/g, '/');
const skinsTable = ['| id | name | character |', '| --- | --- | --- |',
  ...themes.map((t) => `| \`${t.id}\` | ${t.name} | ${CHARACTER[t.id] || firstSentence(t.description)} |`)].join('\n');

const mainFail = failing('text-main');
const mutedFail = failing('text-muted');
const dimList = contrastOf('text-dim');
const pinkFail = failing('accent-pink');
const contrast = [
  !mainFail.length && !mutedFail.length
    ? '`text-main` and `text-muted` clear 4.5:1 on `bg-base` in every skin.'
    : `\`text-main\`/\`text-muted\` miss 4.5:1 on \`bg-base\` in ${[...mainFail, ...mutedFail].map((x) => x.name).join(', ')}.`,
  dimList.some((x) => x.r < 4.5)
    ? `\`text-dim\` does not (${range(dimList)}): meta only.`
    : '`text-dim` also clears 4.5:1.',
  pinkFail.length
    ? `\`accent-pink\` as text is under 4.5:1 in ${pinkFail.length === 1 ? 'one skin' : pinkFail.length + ' skins'}: pair it with a word, never rely on it alone.`
    : ''
].filter(Boolean).join(' ');

// ---------- assets ----------
const ASSET_GROUPS = [
  { group: 'Logos', dir: 'assets', match: /^icon-\d+\.webp$/, order: (a, b) => parseInt(b.match(/\d+/)) - parseInt(a.match(/\d+/)) },
  { group: 'Icons', dir: 'assets/intro3d/icons', match: /^coin-.*\.(webp|png|svg)$/, order: (a, b) => a.localeCompare(b) },
  { group: 'Chips', dir: 'assets/intro3d/icons', match: /^(chip-|clock-).*\.(webp|png|svg)$/, order: (a, b) => (a.startsWith('chip-gold') ? -1 : b.startsWith('chip-gold') ? 1 : a.localeCompare(b)) },
  { group: 'Props', dir: 'assets/intro', match: /\.svg$/, order: (a, b) => a.localeCompare(b) }
];
const TYPES = { webp: 'image/webp', png: 'image/png', svg: 'image/svg+xml', jpg: 'image/jpeg' };
const sha = (buf) => crypto.createHash('sha256').update(buf).digest('hex');
const assets = [];
for (const g of ASSET_GROUPS) {
  const dir = path.join(ROOT, g.dir);
  const files = fs.readdirSync(dir).filter((f) => g.match.test(f) && fs.statSync(path.join(dir, f)).isFile()).sort(g.order);
  for (const name of files) {
    const buf = fs.readFileSync(path.join(dir, name));
    assets.push({ group: g.group, name, src: path.posix.join(g.dir, name), size: buf.length, type: TYPES[path.extname(name).slice(1)], sha256: sha(buf) });
  }
}

// ---------- write ----------
function copyTree(from, to, out = []) {
  for (const e of fs.readdirSync(from, { withFileTypes: true })) {
    const a = path.join(from, e.name);
    const b = path.join(to, e.name);
    if (e.isDirectory()) copyTree(a, b, out);
    else {
      fs.mkdirSync(path.dirname(b), { recursive: true });
      let text = fs.readFileSync(a, 'utf8');
      if (path.relative(CONTENT, a) === 'README.md') text = text.replace('{{SKINS_TABLE}}', skinsTable).replace('{{CONTRAST}}', contrast);
      fs.writeFileSync(b, text);
      out.push([path.relative(OUT, b).split(path.sep).join('/'), text]);
    }
  }
  return out;
}

fs.rmSync(OUT, { recursive: true, force: true });
fs.mkdirSync(OUT, { recursive: true });
const written = copyTree(CONTENT, OUT).sort(([a], [b]) => a.localeCompare(b));

const hash = crypto.createHash('sha256');
hash.update(JSON.stringify(tokens));
for (const [p, text] of written) hash.update(p + '\0' + text + '\0');
for (const a of assets) hash.update(`${a.group}/${a.name}:${a.sha256}\0`);
const sourceHash = hash.digest('hex').slice(0, 16);

let ref = 'unknown';
let synced = '';
try {
  ref = execFileSync('git', ['-C', ROOT, 'rev-parse', '--short', 'HEAD'], { encoding: 'utf8' }).trim();
  synced = execFileSync('git', ['-C', ROOT, 'log', '-1', '--format=%cs'], { encoding: 'utf8' }).trim();
} catch { /* not a checkout */ }

tokens.meta = {
  source: 'github',
  repo: 'braxtonius-gngr/social-casino-bliss',
  ref,
  package: '.',
  paths: {
    tokens: ['index.html (THEMES)', 'assets/app.css'],
    fonts: [],
    assets: ASSET_GROUPS.map((g) => g.dir + '/'),
    docs: ['AGENTS.md', 'tools/design-system/content/']
  },
  components: {},
  generator: 'tools/design-system/build.mjs',
  sourceHash,
  synced
};
fs.writeFileSync(path.join(OUT, 'tokens.json'), JSON.stringify(tokens, null, 1) + '\n');

// Kept in the artifact so the next sync knows what it last sent (no UI).
fs.writeFileSync(path.join(OUT, 'sync-state.json'), JSON.stringify({ sourceHash, ref, files: ['tokens.json', ...written.map(([p]) => p)].sort(), assets }, null, 1) + '\n');

console.log(JSON.stringify({ sourceHash, ref, themes: themes.map((t) => t.id), colors: colorTokens.length, files: written.length + 2, assets: assets.length }));
