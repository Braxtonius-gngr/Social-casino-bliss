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
const DEFAULT_BASE_URL = 'https://dailyrollover.com';

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
    .disclosure { color: #8A8D93; font-size: 0.85rem; }
    h2 { font-size: 1.1rem; margin-top: 28px; }
    table { width: 100%; border-collapse: collapse; font-size: 0.9rem; font-variant-numeric: tabular-nums; }
    th, td { text-align: left; padding: 8px 6px; border-bottom: 1px solid rgba(255,255,255,0.08); }
    th { color: #8A8D93; font-weight: 600; }
    td:not(:first-child), th:not(:first-child) { text-align: right; }
    ul.plain { columns: 2; padding-left: 18px; }`;

const TIER_ORDER = ['S', 'A', 'B', 'C', 'D', 'F', 'Not Rankable', 'Unranked'];
const TIER_HEADINGS = {
  S: 'Tier S: first cash-out in 60 days or less',
  A: 'Tier A: 61 to 120 days',
  B: 'Tier B: 121 to 182 days',
  C: 'Tier C: 183 to 242 days',
  D: 'Tier D: 243 to 304 days',
  F: 'Tier F: more than 304 days',
  'Not Rankable': 'Not rankable: no guaranteed daily bonus',
  Unranked: 'Not yet ranked: daily rate or cash minimum still unconfirmed'
};
const RANKED = new Set(['S', 'A', 'B', 'C', 'D', 'F']);

function tierOf(entry) {
  return TIER_ORDER.includes(entry.tier) ? entry.tier : 'Unranked';
}

// Ranked tiers by days to first cash-out, everything else by name.
function compareEntries(a, b) {
  const ta = TIER_ORDER.indexOf(tierOf(a.entry));
  const tb = TIER_ORDER.indexOf(tierOf(b.entry));
  if (ta !== tb) return ta - tb;
  const da = typeof a.entry.daysToRedeem === 'number' ? a.entry.daysToRedeem : Infinity;
  const db = typeof b.entry.daysToRedeem === 'number' ? b.entry.daysToRedeem : Infinity;
  if (da !== db) return da - db;
  return a.entry.name.localeCompare(b.entry.name);
}

function isIsoDate(value) {
  return typeof value === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(value);
}

function jsonLdScript(value) {
  const json = JSON.stringify(value).replace(/</g, '\\u003c').replace(/>/g, '\\u003e').replace(/&/g, '\\u0026');
  return `<script type="application/ld+json">${json}</script>`;
}

function headMarkup(title, description, canonicalUrl, jsonLd) {
  return `<head>
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
  ${jsonLdScript(jsonLd)}
  <style>${PAGE_STYLE}
  </style>
</head>`;
}

function pageMarkup(entry, slug, baseUrl, related) {
  const name = entry.name.trim();
  const ranked = RANKED.has(entry.tier) && typeof entry.dailySC === 'number' && typeof entry.daysToRedeem === 'number';
  const title = ranked
    ? `${name} Daily Bonus: ${entry.dailySC} SC/day, ~${entry.daysToRedeem} days to cash out | The Casino Almanac`
    : `${name} Daily Bonus Guide | The Casino Almanac`;
  const description = `${name}: daily bonus rate, redemption minimum, payout speed, and ranking from The Casino Almanac.`;
  const canonicalUrl = `${baseUrl}/platforms/${slug}.html`;
  const jsonLd = {
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
  };

  const facts = [
    ['Tier', entry.tier || 'Unranked'],
    ['Daily rate', formatDailyRate(entry)],
    ['Redemption minimum', entry.minRedeem || 'Not recorded'],
    ['Payout speed', entry.speedHours ? `${entry.speedHours} hours` : 'Not recorded'],
    ['Confidence', entry.confidence || 'Not recorded'],
    ['Last verified', entry.lastVerified || 'Not yet verified']
  ];
  const relatedHeading = RANKED.has(entry.tier) ? `Other tier ${entry.tier} platforms` : `Other ${TIER_HEADINGS[tierOf(entry)].split(':')[0].toLowerCase()} platforms`;
  const relatedMarkup = related.length
    ? `
      <section>
        <h2>${escapeHtml(relatedHeading)}</h2>
        <ul>
${related.map(r => `          <li><a href="${escapeHtml(r.slug)}.html">${escapeHtml(r.entry.name.trim())}</a></li>`).join('\n')}
        </ul>
      </section>`
    : '';

  return `<!doctype html>
<html lang="en">
${headMarkup(title, description, canonicalUrl, jsonLd)}
<body>
  <header>
    <p><a href="../index.html?src=seo">The Casino Almanac</a></p>
    <nav aria-label="Primary"><a href="index.html">Tier list</a> &middot; <a href="../index.html?src=seo">Open the daily tracker</a></nav>
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
      <p class="disclosure">This may be a referral link; The Casino Almanac can earn a bonus if you sign up through it.</p>${relatedMarkup}
    </article>
  </main>
  <footer>
    <p><a href="index.html">Full tier list</a> &middot; <a href="../index.html?src=seo">Back to The Casino Almanac tracker</a></p>
    <p><a href="../privacy.html">Privacy</a> &middot; <a href="../terms.html">Terms</a></p>
  </footer>
</body>
</html>
`;
}

function hubMarkup(entries, baseUrl, updated) {
  const canonicalUrl = `${baseUrl}/platforms/index.html`;
  const ranked = entries.filter(({ entry }) => RANKED.has(entry.tier));
  const title = 'Sweepstakes Casino Daily Bonus Tier List | The Casino Almanac';
  const description = `${entries.length} sweepstakes casinos ranked by how many days of free daily bonuses it takes to reach the minimum cash redemption.`;
  const jsonLd = {
    '@context': 'https://schema.org',
    '@type': 'ItemList',
    name: 'Sweepstakes casino daily bonus tier list',
    itemListOrder: 'https://schema.org/ItemListOrderAscending',
    numberOfItems: ranked.length,
    itemListElement: ranked.map(({ entry, slug }, i) => ({
      '@type': 'ListItem',
      position: i + 1,
      name: entry.name.trim(),
      url: `${baseUrl}/platforms/${slug}.html`
    }))
  };

  const sections = TIER_ORDER.map(tier => {
    const rows = entries.filter(({ entry }) => tierOf(entry) === tier);
    if (!rows.length) return '';
    const heading = `      <h2>${escapeHtml(TIER_HEADINGS[tier])}</h2>`;
    if (!RANKED.has(tier)) {
      return `${heading}
      <ul class="plain">
${rows.map(({ entry, slug }) => `        <li><a href="${escapeHtml(slug)}.html">${escapeHtml(entry.name.trim())}</a></li>`).join('\n')}
      </ul>`;
    }
    return `${heading}
      <table>
        <thead><tr><th>Platform</th><th>SC per day</th><th>Cash minimum</th><th>Days to cash out</th></tr></thead>
        <tbody>
${rows.map(({ entry, slug }) => `          <tr><td><a href="${escapeHtml(slug)}.html">${escapeHtml(entry.name.trim())}</a></td><td>${escapeHtml(entry.dailySC)}</td><td>${escapeHtml(`${entry.cashFloor} SC`)}</td><td>${escapeHtml(`~${entry.daysToRedeem}`)}</td></tr>`).join('\n')}
        </tbody>
      </table>`;
  }).filter(Boolean).join('\n');

  return `<!doctype html>
<html lang="en">
${headMarkup(title, description, canonicalUrl, jsonLd)}
<body>
  <header>
    <p><a href="../index.html?src=seo-hub">The Casino Almanac</a></p>
  </header>
  <main>
    <h1>Sweepstakes casino daily bonus tier list</h1>
    <p>${escapeHtml(description)} Collecting only the free daily bonus is the whole calculation: no purchases, no wins counted.${updated ? ` Last verified entry: ${escapeHtml(updated)}.` : ''}</p>
    <p><a class="cta" href="../index.html?src=seo-hub">Track your daily bonuses in the app</a></p>
${sections}
  </main>
  <footer>
    <p><a href="../index.html?src=seo-hub">The Casino Almanac tracker</a></p>
    <p><a href="../privacy.html">Privacy</a> &middot; <a href="../terms.html">Terms</a></p>
  </footer>
</body>
</html>
`;
}

function sitemapMarkup(entries, baseUrl, updated) {
  const url = (loc, lastmod) => `  <url><loc>${escapeHtml(loc)}</loc>${lastmod ? `<lastmod>${lastmod}</lastmod>` : ''}</url>`;
  const urls = [
    url(`${baseUrl}/platforms/index.html`, updated),
    ...entries.map(({ entry, slug }) => url(`${baseUrl}/platforms/${slug}.html`, isIsoDate(entry.lastVerified) ? entry.lastVerified : null))
  ].join('\n');
  return `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
${urls}
</urlset>
`;
}

// Crawlers only read robots.txt at a host's root, so this takes effect on a
// root-hosted domain (Cloudflare Pages, a custom domain), not a GitHub Pages
// project subpath.
function robotsMarkup(baseUrl) {
  return `User-agent: *
Allow: /

Sitemap: ${baseUrl}/platforms/sitemap.xml
`;
}

function main() {
  const baseUrl = normalizeBaseUrl(process.env.SEO_BASE_URL);
  const catalog = loadCatalog();
  const usedSlugs = new Set(['index']);
  const entries = catalog.map(entry => {
    const baseSlug = slugify(entry.name);
    let slug = baseSlug;
    let suffix = 2;
    while (usedSlugs.has(slug)) slug = `${baseSlug}-${suffix++}`;
    usedSlugs.add(slug);
    return { entry, slug };
  }).sort(compareEntries);
  const updated = entries.map(({ entry }) => entry.lastVerified).filter(isIsoDate).sort().pop() || null;

  // Keys are paths relative to the repo root.
  const expected = new Map();
  for (const item of entries) {
    const related = entries
      .filter(other => other !== item && tierOf(other.entry) === tierOf(item.entry))
      .slice(0, 6);
    expected.set(`platforms/${item.slug}.html`, pageMarkup(item.entry, item.slug, baseUrl, related));
  }
  expected.set('platforms/index.html', hubMarkup(entries, baseUrl, updated));
  expected.set('platforms/sitemap.xml', sitemapMarkup(entries, baseUrl, updated));
  expected.set('robots.txt', robotsMarkup(baseUrl));

  fs.mkdirSync(OUTPUT_DIR, { recursive: true });
  const orphans = fs.readdirSync(OUTPUT_DIR)
    .filter(file => file.endsWith('.html') || file === 'sitemap.xml')
    .map(file => `platforms/${file}`)
    .filter(file => !expected.has(file));

  if (process.argv.includes('--check')) {
    const stale = [...expected].filter(([file, markup]) => {
      const target = path.join(ROOT, file);
      return !fs.existsSync(target) || fs.readFileSync(target, 'utf8') !== markup;
    }).map(([file]) => file);
    if (stale.length || orphans.length) {
      console.error(`SEO pages are out of date with data/catalog.json (${stale.length} stale, ${orphans.length} orphaned):`);
      [...stale, ...orphans].slice(0, 10).forEach(file => console.error(`  ${file}`));
      console.error('Run `npm run build:seo` and commit the result.');
      process.exit(1);
    }
    console.log(`SEO pages up to date: ${entries.length} platforms, hub, sitemap, robots.txt.`);
    return;
  }

  for (const [file, markup] of expected) fs.writeFileSync(path.join(ROOT, file), markup);
  for (const file of orphans) fs.unlinkSync(path.join(ROOT, file));
  console.log(`Generated ${entries.length} SEO platform pages, the tier-list hub, sitemap and robots.txt` +
    (orphans.length ? `; removed ${orphans.length} orphaned page(s)` : ''));
}

main();
