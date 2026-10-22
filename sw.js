/* Daily Roll Over - service worker
 *
 * Strategy: NETWORK FIRST for same-origin requests, cache only as an offline
 * fallback. This matters because the app is updated by pasting a new
 * index.html into GitHub - a cache-first worker would leave you staring at a
 * stale version with no obvious way to force an update.
 *
 * Cross-origin requests (the outbound casino links) are never intercepted or
 * cached; they pass straight through to the network.
 *
 * To force every client onto a fresh cache, bump CACHE_NAME below.
 */

const CACHE_NAME = 'almanac-v192';

// Relative paths only. This app is hosted on GitHub Pages at a SUBPATH
// (/Social-casino-bliss/), so a leading "/" would resolve to the domain root
// and silently fail.
//
// Everything the app can load is precached except the rare tiers' extras
// and the homes' music (assets/intro3d/rare/, fetched and kept on
// first use: most launches never need the extras, and the music is for the
// table alone). A new build downloads the whole set once, while the landing
// shows its "Updating" bar (see precacheAll below and appWhenCached in
// index.html), so no launch after that waits on the network. check:refs
// fails if an asset is missing here, or if this CACHE_NAME and index.html
// APP_BUILD disagree.
// NOTE: no apostrophes in comments inside this array - check-references.js
// regex-scans it for quoted strings and would read one as a broken path.
const PRECACHE_URLS = [
  // the shell
  './', './index.html', './manifest.json', './apple-touch-icon.png', './assets/icon-192.webp', './assets/icon-512.webp',
  './assets/app.css', './assets/accessibility.css', './assets/accessibility.js', './assets/storage.js', './assets/show.js',
  // each skin room past the default one (see show.js)
  './assets/rooms/obsidian.js', './assets/rooms/neon.js', './assets/rooms/glitch.js', './assets/rooms/western.js', './assets/rooms/burin.js', './assets/intro3d/bleed.mjs', './assets/intro3d/burin.mjs', './assets/intro3d/valley.mjs', './assets/intro3d/figure.mjs', './assets/intro3d/dev-overlay.mjs', './assets/intro3d/flesh.mjs', './assets/intro3d/inferno.mjs', './assets/intro3d/slaughter.mjs', './assets/rooms/spirit.mjs', './assets/rooms/seance.mjs', './assets/intro3d/moonrise.mjs', './assets/intro3d/arcade.mjs', './assets/intro3d/seance-room.mjs',
  './data/catalog.js', './utils/cleanDropUrl.js', './utils/classifyDropText.js',
  // the Executive Lounge ground
  './assets/background.webp',
  // the CSS intro (the fallback without WebGL 2): its rooms, felt and cash
  './assets/intro/felt.png', './assets/intro/room-lamp.jpg', './assets/intro/room-metal.jpg', './assets/intro/room-both.jpg',
  './assets/intro/bill.svg', './assets/intro/bill-back.svg', './assets/intro/coin-btc.svg', './assets/intro/coin-eth.svg',
  './assets/intro/coin-gold.svg', './assets/intro/coin-gold-back.svg', './assets/intro/scorch.svg',
  // the WebGL intro: three.js, the modules and the set
  './assets/vendor/three/three.core.js', './assets/vendor/three/three.module.js', './assets/vendor/three/three.addons.js',
  './assets/intro3d/intro.mjs', './assets/intro3d/physics.mjs', './assets/intro3d/wheel.mjs', './assets/intro3d/plinko.mjs', './assets/intro3d/blackjack.mjs', './assets/intro3d/slots.mjs', './assets/intro3d/likeness.mjs', './assets/intro3d/table.mjs', './assets/intro3d/finish.mjs', './assets/intro3d/music.mjs',
  // Obsidian Ledger: the orrery (its Lounge payout, and the study - its
  // Showroom home - where it stands on the desk)
  './assets/intro3d/orrery.mjs', './assets/intro3d/study.mjs',
  './assets/intro3d/felt-normal.jpg', './assets/intro3d/rubber-normal.jpg', './assets/intro3d/leather-normal.jpg',
  './assets/intro3d/walnut.jpg', './assets/intro3d/gunmetal.jpg', './assets/intro3d/badge.png',
  './assets/intro3d/gold-trim-color.jpg', './assets/intro3d/gold-trim-alpha.png', './assets/intro3d/gold-trim-normal.jpg',
  './assets/intro3d/walnut-normal.jpg', './assets/intro3d/cushion-normal.jpg',
  './assets/intro3d/carpet-color.jpg', './assets/intro3d/carpet-normal.jpg',
  // the card table: its chips, the clock bezel and the phone icons
  './assets/intro3d/icons/chip-emerald.webp', './assets/intro3d/icons/chip-gold.webp', './assets/intro3d/icons/chip-ivory.webp',
  './assets/intro3d/icons/chip-onyx.webp', './assets/intro3d/icons/chip-oxblood.webp', './assets/intro3d/icons/chip-plum.webp',
  './assets/intro3d/icons/clock-bezel.webp', './assets/intro3d/icons/coin-clock.webp', './assets/intro3d/icons/coin-deck.webp',
  './assets/intro3d/icons/coin-house.webp', './assets/intro3d/icons/coin-send.webp'];
// Stored last, once the whole set is in: the build is complete.
const PRECACHE_MARK = './__precache-complete__';

// Downloads the set, four files at a time, telling every open window how
// far it has got - including a first visit's page, which this worker does
// not control yet - as { type: 'precache', version, done, total }, and
// finally { ..., complete: true, failed }. Each file is fetched past the
// browser's HTTP cache (cache: 'no-cache' revalidates) so a new build never
// stores an old copy, and tried twice before it counts as failed. One run
// at a time: a second ask joins the first.
let precaching = null;
let progress = { done: 0, total: 0 };
function precacheAll() {
  if (precaching) return precaching;
  precaching = (async () => {
    const cache = await caches.open(CACHE_NAME);
    const total = PRECACHE_URLS.length;
    let done = 0, next = 0;
    progress = { done, total };
    const failed = [];
    const tell = async (extra) => {
      const wins = await self.clients.matchAll({ type: 'window', includeUncontrolled: true });
      wins.forEach((w) => w.postMessage(Object.assign({ type: 'precache', version: CACHE_NAME, done, total }, extra)));
    };
    const fetchOne = async (url) => {
      for (let attempt = 0; attempt < 2; attempt++) {
        try {
          const response = await fetch(url, { cache: 'no-cache' });
          if (response && response.ok) { await cache.put(url, response); return true; }
        } catch (e) { /* try again, then count it */ }
      }
      return false;
    };
    const lane = async () => {
      while (next < total) {
        const url = PRECACHE_URLS[next++];
        if (!(await fetchOne(url))) failed.push(url);
        done++;
        progress = { done, total };
        await tell();
      }
    };
    await Promise.all([lane(), lane(), lane(), lane()]);
    // (marked whole only when every file came down: a build with files
    // missing is not whole, so a page waits on it again - and asks for
    // the download again - rather than playing with gaps in it)
    if (!failed.length) await cache.put(PRECACHE_MARK, new Response(JSON.stringify({ version: CACHE_NAME }), { headers: { 'Content-Type': 'application/json' } }));
    await tell({ complete: true, failed: failed.length });
  })();
  precaching.catch(() => {}).then(() => { precaching = null; });
  return precaching;
}

// How this build stands, for a page deciding whether its intro can play
// from the cache: { type: 'precache-status', version, complete }.
async function precacheStatus() {
  const cache = await caches.open(CACHE_NAME);
  const mark = await cache.match(PRECACHE_MARK);
  return { type: 'precache-status', version: CACHE_NAME, complete: !!mark, running: !!precaching, done: progress.done, total: progress.total };
}

self.addEventListener('install', (event) => {
  // The whole set, before this build takes over; a failure is best-effort
  // (the pages still work from the network) and never blocks the install.
  event.waitUntil(
    precacheAll()
      .catch(() => { /* best-effort */ })
      .then(() => self.skipWaiting())
  );
});

self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys()
      .then((names) => Promise.all(
        names.map((n) => (n !== CACHE_NAME ? caches.delete(n) : null))
      ))
      .then(() => self.clients.claim())
  );
});

// A page asks how this build stands ('precache-status'), or asks it to
// finish a set an earlier run left incomplete ('precache-start').
self.addEventListener('message', (event) => {
  const data = event.data || {};
  const reply = (msg) => {
    if (event.ports && event.ports[0]) event.ports[0].postMessage(msg);
    else if (event.source) event.source.postMessage(msg);
  };
  if (data.type === 'precache-status') {
    event.waitUntil(precacheStatus().then(reply));
  } else if (data.type === 'precache-start') {
    event.waitUntil(precacheAll().catch(() => {}));
  }
});

self.addEventListener('fetch', (event) => {
  const req = event.request;

  // Only handle same-origin GETs. Everything else - including every outbound
  // casino link - passes through untouched.
  let url;
  try {
    url = new URL(req.url);
  } catch (e) {
    return;
  }
  if (req.method !== 'GET' || url.origin !== self.location.origin) return;

  // The landing's intro - three.js, its modules, textures and sounds, and
  // the table it flies into - is served from the cache straight away and
  // refreshed behind it (stale-while-revalidate). Network-first made every
  // launch wait on a round of revalidations, one module level at a time,
  // before the shot could start: the lag on each first play. A changed
  // file is fetched in the background and used from the next launch (a
  // CACHE_NAME bump replaces the whole set at once, as ever).
  if (isIntroAsset(url)) {
    event.respondWith(introFromCache(event, req, url));
    return;
  }

  event.respondWith(
    // cache: 'no-cache' always revalidates with the server, so a fresh
    // deploy is never masked by the browser's HTTP cache (e.g. app.css,
    // which has no cache-busting query string) - but an unchanged file
    // comes back as a small 304 instead of a full re-download.
    fetch(req, { cache: 'no-cache' })
      .then((response) => {
        // Only cache genuinely successful responses. Keyed without the
        // query string (matching the ignoreSearch lookups below) so
        // ?v=... or ?billing=... URLs overwrite one entry instead of
        // each adding a new one forever.
        if (response && response.status === 200 && response.type === 'basic') {
          const copy = response.clone();
          caches.open(CACHE_NAME).then((cache) => cache.put(url.origin + url.pathname, copy));
        }
        return response;
      })
      .catch(async () => {
        // Offline. ignoreSearch matters because cache-busting query strings
        // like ?v=4 would otherwise miss the cached copy entirely.
        const hit = await caches.match(req, { ignoreSearch: true });
        if (hit) return hit;

        // For a page navigation with nothing cached under that exact URL,
        // fall back to the app shell.
        if (req.mode === 'navigate') {
          const shell = await caches.match('./', { ignoreSearch: true })
            || await caches.match('./index.html', { ignoreSearch: true });
          if (shell) return shell;
        }

        return new Response('Offline and no cached copy is available.', {
          status: 503,
          headers: { 'Content-Type': 'text/plain' }
        });
      })
  );
});

// The directories served cache-first (see the fetch handler), as absolute
// paths under this worker's scope, so a subpath deploy still matches.
// (worked out on first use: nothing but the fetch handler needs them)
let introDirs = null;
function isIntroAsset(url) {
  if (!introDirs) {
    introDirs = ['assets/intro3d/', 'assets/vendor/three/', 'assets/intro/']
      .map((dir) => new URL(dir, self.registration.scope).pathname);
  }
  return introDirs.some((dir) => url.pathname.startsWith(dir));
}

async function introFromCache(event, req, url) {
  const cache = await caches.open(CACHE_NAME);
  const key = url.origin + url.pathname;
  const hit = await cache.match(key);
  const refresh = fetch(req, { cache: 'no-cache' }).then((response) => {
    if (response && response.status === 200 && response.type === 'basic') {
      const copy = response.clone();
      event.waitUntil(cache.put(key, copy));
    }
    return response;
  });
  if (hit) {
    // (the refresh finishes in the background; offline, it simply fails)
    event.waitUntil(refresh.catch(() => {}));
    return hit;
  }
  return refresh.catch(() => new Response('Offline and no cached copy is available.', {
    status: 503,
    headers: { 'Content-Type': 'text/plain' }
  }));
}

// --- Background push alerts ---
// Pushes arrive with no payload (the server never holds message text). The
// app writes its upcoming alert schedule to IndexedDB, and the latest entry
// that has come due says how many platforms are ready.
const PUSH_DB_NAME = 'casino-almanac';
const PUSH_DB_VERSION = 1;
const PUSH_STORE = 'state';
const PUSH_SCHEDULE_KEY = 'push_schedule';

const PUSH_TEST_KEY = 'push_test';
// New-drop alerts: the app keeps { on, keys, since, url, key } here, and the
// ids of drops already shown go under DROP_SEEN_KEY.
const DROP_STATE_KEY = 'drop_alerts';
const DROP_SEEN_KEY = 'drop_seen';
// Mirrors MULTI_LABEL_SLDS in utils/classifyDropText.js.
const MULTI_LABEL_SLDS = new Set(['co', 'com', 'net', 'org', 'gov', 'edu', 'ac', 'ltd', 'plc']);
// Announced drops this recent count as new. Longer than the push's own
// time-to-live (six hours), so a delayed delivery still finds its drop.
const DROP_WINDOW_MS = 8 * 3600000;
// Pages of the announced-drops feed read per push. Filtering (tracked,
// already shown, expired) happens here, after the fetch, so the feed is
// paged until the window is exhausted rather than cut at one page.
const DROP_PAGE = 50;
const DROP_MAX_PAGES = 4;
// A schedule entry counts as the reason for a push only while it is fresh:
// alongside a drop, when it came due in the last five minutes; alone, within
// the push's own time-to-live plus the dispatcher's cadence.
const DUE_WITH_DROP_MS = 5 * 60000;
const DUE_ALONE_MS = 2 * 3600000;
const DROP_BUCKET_TEXT = { A_code: 'Promo code', B_claim: 'Free claim', C_purchase: 'Purchase offer' };

// "Zula, Punt and 3 more" - a copy of readySummary() in index.html, for the
// daily digest (its names come from this device's copy of the schedule).
function readySummary(names, count) {
  if (!names.length) return `${count} platform${count === 1 ? '' : 's'}`;
  const shown = names.slice(0, 3);
  const rest = count - shown.length;
  if (rest > 0) return `${shown.join(', ')} and ${rest} more`;
  return shown.length > 1 ? `${shown.slice(0, -1).join(', ')} and ${shown[shown.length - 1]}` : shown[0];
}

// Reads (and optionally deletes) one key from the app's IndexedDB state store.
function readPushState(key, remove) {
  return new Promise((resolve) => {
    let request;
    try {
      request = indexedDB.open(PUSH_DB_NAME, PUSH_DB_VERSION);
    } catch (e) {
      resolve(undefined);
      return;
    }
    // Same schema assets/storage.js creates, in case the worker opens first.
    request.onupgradeneeded = () => request.result.createObjectStore(PUSH_STORE);
    request.onerror = () => resolve(undefined);
    request.onsuccess = () => {
      try {
        const store = request.result.transaction(PUSH_STORE, remove ? 'readwrite' : 'readonly').objectStore(PUSH_STORE);
        const get = store.get(key);
        get.onsuccess = () => {
          if (remove && get.result !== undefined) store.delete(key);
          resolve(get.result);
        };
        get.onerror = () => resolve(undefined);
      } catch (e) {
        resolve(undefined);
      }
    };
  });
}

function writePushState(key, value) {
  return new Promise((resolve) => {
    let request;
    try {
      request = indexedDB.open(PUSH_DB_NAME, PUSH_DB_VERSION);
    } catch (e) {
      resolve();
      return;
    }
    request.onupgradeneeded = () => request.result.createObjectStore(PUSH_STORE);
    request.onerror = () => resolve();
    request.onsuccess = () => {
      try {
        const tx = request.result.transaction(PUSH_STORE, 'readwrite');
        tx.objectStore(PUSH_STORE).put(value, key);
        tx.oncomplete = () => resolve();
        tx.onerror = () => resolve();
      } catch (e) {
        resolve();
      }
    };
  });
}

// The same keys the app uploads for what it tracks (dropKeysFor() in
// index.html) and the server derives from a drop.
function dropKeys(drop) {
  const keys = [];
  const name = String(drop.platform_name || '').toLowerCase().replace(/[^a-z0-9]/g, '');
  if (name) keys.push(`name:${name}`);
  let host = String(drop.root_domain || '').trim().toLowerCase();
  if (!host && drop.claim_url) {
    try { host = new URL(drop.claim_url).hostname.toLowerCase(); } catch (e) { host = ''; }
  }
  host = host.replace(/^https?:\/\//, '').replace(/\/.*$/, '');
  const parts = host.split('.').filter(Boolean);
  // example.co.uk is its own site, not "co.uk" (same rule as rootOf()).
  const take = parts.length >= 3 && parts[parts.length - 1].length === 2 && MULTI_LABEL_SLDS.has(parts[parts.length - 2]) ? 3 : 2;
  if (parts.length >= 2) keys.push(`site:${parts.slice(-take).join('.')}`);
  return keys;
}

// Announced drops for tracked platforms this device hasn't shown yet, read
// from the public feed. A push carries no payload, so this is how a drop
// push is told apart from a schedule push. Resolves to [] on any failure.
async function unseenDrops(state, now) {
  if (!state || !state.on || !state.url || !state.key || !Array.isArray(state.keys) || !state.keys.length) return [];
  const since = new Date(Math.max(now - DROP_WINDOW_MS, Number(state.since) || 0)).toISOString();
  const base = 'select=id,platform_name,bucket,code,claim_url,root_domain,terms,expires_at,announced_at'
    + `&active=eq.true&announced_at=gte.${encodeURIComponent(since)}&order=announced_at.desc,id.asc&limit=${DROP_PAGE}`;
  const rows = [];
  for (let page = 0; page < DROP_MAX_PAGES; page++) {
    let batch;
    try {
      const response = await fetch(`${state.url}/rest/v1/public_freebies?${base}&offset=${page * DROP_PAGE}`, {
        headers: { apikey: state.key, Authorization: `Bearer ${state.key}` },
        cache: 'no-store'
      });
      if (!response.ok) return [];
      batch = await response.json();
    } catch (e) {
      return [];
    }
    if (!Array.isArray(batch)) return [];
    rows.push(...batch);
    if (batch.length < DROP_PAGE) break;
  }
  const seen = await readPushState(DROP_SEEN_KEY, false);
  const seenIds = new Set(Array.isArray(seen) ? seen : []);
  const tracked = new Set(state.keys);
  return rows.filter(row => row && row.id && !seenIds.has(row.id)
    && !(row.expires_at && Date.parse(row.expires_at) < now)
    && dropKeys(row).some(k => tracked.has(k)));
}

function dropNotificationBody(drop) {
  const parts = [DROP_BUCKET_TEXT[drop.bucket] || 'New offer'];
  if (drop.code) parts[0] += `: ${drop.code}`;
  if (drop.terms) parts.push(String(drop.terms).slice(0, 80));
  if (drop.expires_at) {
    parts.push(`ends ${new Date(drop.expires_at).toLocaleString([], { month: 'short', day: 'numeric', hour: 'numeric', minute: '2-digit' })}`);
  }
  return parts.join(' · ');
}

// At most three notifications per push: past that, the last one sums up
// the rest, so every drop recorded as seen was actually put in front of the
// user (the rest are listed in Freebies, where the summary opens).
async function showDrops(drops) {
  const individual = drops.length > 3 ? drops.slice(0, 2) : drops;
  const notes = individual.map(drop => self.registration.showNotification(`New drop: ${drop.platform_name}`, {
    body: dropNotificationBody(drop),
    tag: `almanac-drop-${drop.id}`,
    icon: 'apple-touch-icon.png',
    data: { open: 'freebies' }
  }));
  const rest = drops.slice(individual.length);
  if (rest.length) {
    const names = rest.slice(0, 3).map(drop => drop.platform_name);
    notes.push(self.registration.showNotification(`${rest.length} more new drops`, {
      body: `${names.join(', ')}${rest.length > names.length ? ' and more' : ''}. Tap to see them in Freebies.`,
      tag: 'almanac-drops-more',
      icon: 'apple-touch-icon.png',
      data: { open: 'freebies' }
    }));
  }
  await Promise.all(notes);
  const seen = await readPushState(DROP_SEEN_KEY, false);
  const ids = (Array.isArray(seen) ? seen : []).concat(drops.map(drop => drop.id));
  // Room for more than one push's worth of drops, so a full batch never
  // falls out of the list while still inside the look-back window.
  await writePushState(DROP_SEEN_KEY, ids.slice(-(DROP_PAGE * DROP_MAX_PAGES + 100)));
}

let dropQueue = Promise.resolve();

self.addEventListener('push', (event) => {
  event.waitUntil(Promise.all([
    readPushState(PUSH_SCHEDULE_KEY, false),
    readPushState(PUSH_TEST_KEY, true),
    readPushState(DROP_STATE_KEY, false)
  ]).then(async ([schedule, testAt, dropState]) => {
    const now = Date.now();
    // The app stamps this just before asking the server for a test push.
    if (Number(testAt) > now - 120000) {
      return self.registration.showNotification('Daily Roll Over', {
        body: 'Test from the server: background alerts reach this device.',
        tag: 'almanac-server-test',
        icon: 'apple-touch-icon.png'
      });
    }
    // One push at a time from here: reading the seen list, showing and
    // recording must not interleave, or two pushes close together would
    // both show the same drop.
    const drops = await (dropQueue = dropQueue.then(async () => {
      const found = await unseenDrops(dropState, now);
      if (found.length) await showDrops(found);
      return found;
    }).catch(() => []));
    let due = null;
    (Array.isArray(schedule) ? schedule : []).forEach((entry) => {
      if (entry && Number(entry.at) <= now + 60000 && (!due || Number(entry.at) > Number(due.at))) due = entry;
    });
    const fresh = due && Number(due.at) > now - (drops.length ? DUE_WITH_DROP_MS : DUE_ALONE_MS);
    if (drops.length && !fresh) return undefined;
    if (!fresh) {
      // Nothing new and nothing due (a repeated drop push, a drop that has
      // since expired, or a lookup that failed): a push must still show
      // something, so it makes no claim about what is ready.
      return self.registration.showNotification('Daily Roll Over', {
        body: 'Open Daily Roll Over to see what\'s new.',
        tag: 'almanac-ready',
        renotify: false,
        icon: 'apple-touch-icon.png'
      });
    }
    const count = Number(due.count) || 0;
    let body = 'Your platforms are ready to collect.';
    if (count > 0 && due.digest) {
      body = `Daily digest: ${readySummary(Array.isArray(due.names) ? due.names : [], count)} ready to collect`;
    } else if (count > 0) {
      body = `${count} platform${count === 1 ? '' : 's'} ready to collect`;
    }
    // Same tag as the in-page alert, so an open tab and a push never stack.
    return self.registration.showNotification('Daily Roll Over', {
      body,
      tag: 'almanac-ready',
      renotify: false,
      icon: 'apple-touch-icon.png'
    });
  }));
});

self.addEventListener('notificationclick', (event) => {
  event.notification.close();
  const toFreebies = !!(event.notification.data && event.notification.data.open === 'freebies');
  // Only the app itself (the scope's root or index.html) handles the
  // open-freebies message; other pages here, such as the admin page or a
  // platform guide, don't, so a new app window opens instead.
  const scope = new URL(self.registration.scope);
  const isApp = (client) => {
    try {
      const url = new URL(client.url);
      return url.origin === scope.origin && (url.pathname === scope.pathname || url.pathname === `${scope.pathname}index.html`);
    } catch (e) {
      return false;
    }
  };
  event.waitUntil(
    self.clients.matchAll({ type: 'window', includeUncontrolled: true }).then((windows) => {
      const open = windows.find((client) => 'focus' in client && isApp(client));
      if (open) {
        if (toFreebies) open.postMessage({ type: 'open-freebies' });
        return open.focus();
      }
      return self.clients.openWindow(toFreebies ? './?open=freebies' : './');
    })
  );
});
