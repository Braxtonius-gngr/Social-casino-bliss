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

// Mirrors BLOCKER_LABELS in index.html.
const BLOCKER_LABELS = {
  'purchase-gated-daily': 'Requires a purchase to unlock the daily claim',
  'free-play-cannot-reach-floor': "Free play alone can't reach the redeem floor",
  '20x-promo-playthrough-last-in-queue': 'Promo SC needs 20x playthrough before free SC clears',
  'lifetime-cap-one-redemption': 'Lifetime cap - only one redemption, ever'
};

function formatDailyRate(entry) {
  if (entry.noGuaranteedDaily) return 'No guaranteed daily bonus';
  return typeof entry.dailySC === 'number' && Number.isFinite(entry.dailySC)
    ? `${entry.dailySC} Sweepstakes Coins per day${entry.scIsAveraged ? ' (average)' : ''}`
    : 'Daily rate not yet verified';
}

// The same plain-English read the app's Keen Info summary gives. The raw
// research notes stay in the catalog for the record; they are working
// notes, not visitor-facing copy.
function summarize(entry, name) {
  if (entry.blocker) {
    return `Warning: ${BLOCKER_LABELS[entry.blocker] || entry.blocker.replace(/-/g, ' ')}.`;
  }
  if (entry.noGuaranteedDaily) {
    return `${name} has no guaranteed daily Sweepstakes Coins bonus, so it is not ranked by days to first cash-out.`;
  }
  if (typeof entry.cashFloor === 'number' && typeof entry.daysToRedeem === 'number') {
    return `Collecting only the free daily bonus reaches the $${entry.cashFloor} cash redemption minimum in about ${entry.daysToRedeem} days.`;
  }
  return `The daily rate or redemption minimum for ${name} has not been confirmed yet, so it is not ranked yet.`;
}

const PAGE_STYLE = `
    body { margin: 0; background: #050507; color: #F8F9FA; font: 16px/1.55 system-ui, -apple-system, "Segoe UI", sans-serif; }
    header, main, footer { max-width: 640px; margin: 0 auto; padding: 16px; }
    a { color: #D4AF37; }
    h1 { font-size: 1.6rem; line-height: 1.25; }
    dl { display: grid; gap: 8px; margin: 20px 0; }
    dl div { display: flex; justify-content: space-between; gap: 12px; padding: 10px 12px; border: 1px solid rgba(255,255,255,0.08); border-radius: 8px; }
    dt { color: #8A8D93; }
    dd { margin: 0; text-align: right; font-variant-numeric: tabular-nums; }
    .cta { display: inline-block; padding: 10px 16px; border: 1px solid #D4AF37; border-radius: 8px; text-decoration: none; }
    .disclosure { color: #8A8D93; font-size: 0.85rem; }`;

function pageMarkup(entry, slug, baseUrl) {
  const name = entry.name.trim();
  const title = `${name} Daily Bonus Guide | The Casino Almanac`;
  const description = `${name}: daily bonus rate, redemption minimum, payout speed, and ranking from The Casino Almanac.`;
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
  <style>${PAGE_STYLE}
  </style>
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
      <p>${escapeHtml(summarize(entry, name))}</p>
      <p><a class="cta" href="${escapeHtml(entry.url)}" rel="sponsored noopener noreferrer">Visit ${escapeHtml(name)}</a></p>
      <p class="disclosure">This may be a referral link; The Casino Almanac can earn a bonus if you sign up through it.</p>
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

  const expected = new Map(entries.map(({ entry, slug }) => [`${slug}.html`, pageMarkup(entry, slug, baseUrl)]));
  expected.set('sitemap.xml', sitemapMarkup(entries, baseUrl));
  fs.mkdirSync(OUTPUT_DIR, { recursive: true });
  const onDisk = fs.readdirSync(OUTPUT_DIR).filter(file => file.endsWith('.html') || file === 'sitemap.xml');
  const orphans = onDisk.filter(file => !expected.has(file));

  if (process.argv.includes('--check')) {
    const stale = [...expected].filter(([file, markup]) => {
      const target = path.join(OUTPUT_DIR, file);
      return !fs.existsSync(target) || fs.readFileSync(target, 'utf8') !== markup;
    }).map(([file]) => file);
    if (stale.length || orphans.length) {
      console.error(`SEO pages are out of date with data/catalog.json (${stale.length} stale, ${orphans.length} orphaned):`);
      [...stale, ...orphans].slice(0, 10).forEach(file => console.error(`  platforms/${file}`));
      console.error('Run `npm run build:seo` and commit the result.');
      process.exit(1);
    }
    console.log(`SEO pages up to date: ${entries.length} platforms.`);
    return;
  }

  for (const [file, markup] of expected) fs.writeFileSync(path.join(OUTPUT_DIR, file), markup);
  for (const file of orphans) fs.unlinkSync(path.join(OUTPUT_DIR, file));
  console.log(`Generated ${entries.length} SEO platform pages and sitemap in ${path.relative(ROOT, OUTPUT_DIR)}/` +
    (orphans.length ? `; removed ${orphans.length} orphaned page(s)` : ''));
}

main();
