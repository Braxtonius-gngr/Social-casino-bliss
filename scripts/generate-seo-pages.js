#!/usr/bin/env node
/*
 * Generates dependency-free static landing pages from the authoritative
 * platform catalog. The generated files are ordinary deployment artifacts:
 * the runtime PWA remains index.html plus its existing assets.
 */

const fs = require('fs');
const path = require('path');

const ROOT = path.resolve(__dirname, '..');
const CATALOG_PATH = path.join(ROOT, 'data', 'catalog.json');
const OUTPUT_DIR = path.join(ROOT, 'platforms');
const DEFAULT_BASE_URL = 'https://braxtonius-gngr.github.io/Social-casino-bliss';

function escapeHtml(value) {
  return String(value == null ? '' : value)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

function slugify(name) {
  const slug = String(name || '')
    .normalize('NFKD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '');
  if (!slug) throw new Error(`Cannot create a platform id from "${name}"`);
  return slug;
}

function normalizeBaseUrl(value) {
  const raw = String(value || DEFAULT_BASE_URL).trim().replace(/\/+$/, '');
  let parsed;
  try {
    parsed = new URL(raw);
  } catch (error) {
    throw new Error(`SEO_BASE_URL must be an absolute URL: ${raw}`);
  }
  if (parsed.protocol !== 'https:' && parsed.protocol !== 'http:') {
    throw new Error('SEO_BASE_URL must use http or https');
  }
  return parsed.href.replace(/\/+$/, '');
}

function loadCatalog() {
  const catalog = JSON.parse(fs.readFileSync(CATALOG_PATH, 'utf8'));
  if (!Array.isArray(catalog)) throw new Error('data/catalog.json must contain an array');
  return catalog.filter(entry => entry && typeof entry.name === 'string' && entry.name.trim() && entry.url);
}

function formatDailyRate(entry) {
  return typeof entry.dailySC === 'number' && Number.isFinite(entry.dailySC)
    ? `${entry.dailySC} Sweepstakes Coins per day`
    : 'Daily rate not yet verified';
}

function pageMarkup(entry, slug, baseUrl) {
  const name = entry.name.trim();
  const title = `${name} Daily Bonus Guide | The Casino Almanac`;
  const description = `${name}: daily bonus rate, redemption details, payout speed, and verification notes from The Casino Almanac.`;
  const canonicalUrl = `${baseUrl}/platforms/${slug}.html`;
  const jsonLd = JSON.stringify({
    '@context': 'https://schema.org',
    '@type': 'WebApplication',
    name: `${name} Daily Bonus Guide`,
    applicationCategory: 'FinanceApplication',
    operatingSystem: 'Web',
    url: canonicalUrl,
    description,
    isAccessibleForFree: true,
    offers: {
      '@type': 'Offer',
      price: '0',
      priceCurrency: 'USD'
    }
  }).replace(/</g, '\\u003c').replace(/>/g, '\\u003e').replace(/&/g, '\\u0026');

  const facts = [
    ['Tier', entry.tier || 'Unranked'],
    ['Daily rate', formatDailyRate(entry)],
    ['Redemption minimum', entry.minRedeem || 'Not recorded'],
    ['Payout speed', entry.speedHours ? `${entry.speedHours} hours` : 'Not recorded'],
    ['Confidence', entry.confidence || 'Not recorded'],
    ['Last verified', entry.lastVerified || 'Not yet verified']
  ];

  return `<!doctype html>
<html lang="en">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1">
  <title>${escapeHtml(title)}</title>
  <meta name="description" content="${escapeHtml(description)}">
  <link rel="canonical" href="${escapeHtml(canonicalUrl)}">
  <meta property="og:type" content="website">
  <meta property="og:title" content="${escapeHtml(title)}">
  <meta property="og:description" content="${escapeHtml(description)}">
  <meta property="og:url" content="${escapeHtml(canonicalUrl)}">
  <meta property="og:site_name" content="The Casino Almanac">
  <script type="application/ld+json">${jsonLd}</script>
</head>
<body>
  <header>
    <p><a href="../index.html">The Casino Almanac</a></p>
    <nav aria-label="Primary"><a href="../index.html">Open the daily tracker</a></nav>
  </header>
  <main>
    <article>
      <h1>${escapeHtml(name)} daily bonus guide</h1>
      <p>${escapeHtml(description)}</p>
      <dl>
${facts.map(([label, value]) => `        <div><dt>${escapeHtml(label)}</dt><dd>${escapeHtml(value)}</dd></div>`).join('\n')}
      </dl>
      ${entry.notes ? `<section><h2>Verification notes</h2><p>${escapeHtml(entry.notes)}</p></section>` : ''}
      <p><a href="${escapeHtml(entry.url)}" rel="noopener noreferrer">Visit ${escapeHtml(name)}</a></p>
    </article>
  </main>
  <footer>
    <p><a href="../index.html">Back to The Casino Almanac tracker</a></p>
  </footer>
</body>
</html>
`;
}

function sitemapMarkup(entries, baseUrl) {
  const urls = entries.map(({ slug }) => `  <url><loc>${escapeHtml(`${baseUrl}/platforms/${slug}.html`)}</loc></url>`).join('\n');
  return `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
${urls}
</urlset>
`;
}

function main() {
  const baseUrl = normalizeBaseUrl(process.env.SEO_BASE_URL);
  const catalog = loadCatalog();
  const usedSlugs = new Set();
  const entries = catalog.map(entry => {
    const baseSlug = slugify(entry.name);
    let slug = baseSlug;
    let suffix = 2;
    while (usedSlugs.has(slug)) slug = `${baseSlug}-${suffix++}`;
    usedSlugs.add(slug);
    return { entry, slug };
  });

  fs.mkdirSync(OUTPUT_DIR, { recursive: true });
  for (const { entry, slug } of entries) {
    fs.writeFileSync(path.join(OUTPUT_DIR, `${slug}.html`), pageMarkup(entry, slug, baseUrl));
  }
  fs.writeFileSync(path.join(OUTPUT_DIR, 'sitemap.xml'), sitemapMarkup(entries, baseUrl));
  console.log(`Generated ${entries.length} SEO platform pages and sitemap in ${path.relative(ROOT, OUTPUT_DIR)}/`);
}

main();
