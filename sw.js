/* The Casino Almanac - service worker
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

const CACHE_NAME = 'almanac-v45';

// Relative paths only. This app is hosted on GitHub Pages at a SUBPATH
// (/Social-casino-bliss/), so a leading "/" would resolve to the domain root
// and silently fail.
const PRECACHE_URLS = ['./', './index.html', './manifest.json', './assets/app.css', './assets/storage.js', './data/catalog.js', './data/catalog.json',
  // Ground texture for the Executive Lounge theme. Precached because a theme
  // whose background only appears once the network is back is not the theme.
  // NOTE: no apostrophes in comments inside this array - check-references.js
  // regex-scans it for quoted strings and would read one as a broken path.
  './assets/background.webp'];

self.addEventListener('install', (event) => {
  // Precache the shell so the very first offline load works, even if the
  // fetch handler never ran while the worker was still activating.
  event.waitUntil(
    caches.open(CACHE_NAME)
      .then((cache) => cache.addAll(PRECACHE_URLS))
      .catch(() => { /* precache is best-effort; don't block install */ })
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
// Announced drops this recent count as new. Longer than the push's own
// time-to-live (six hours), so a delayed delivery still finds its drop.
const DROP_WINDOW_MS = 8 * 3600000;
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
  if (parts.length >= 2) keys.push(`site:${parts.slice(-2).join('.')}`);
  return keys;
}

// Announced drops for tracked platforms this device hasn't shown yet, read
// from the public feed. A push carries no payload, so this is how a drop
// push is told apart from a schedule push. Resolves to [] on any failure.
async function unseenDrops(state, now) {
  if (!state || !state.on || !state.url || !state.key || !Array.isArray(state.keys) || !state.keys.length) return [];
  const since = new Date(Math.max(now - DROP_WINDOW_MS, Number(state.since) || 0)).toISOString();
  const query = 'select=id,platform_name,bucket,code,claim_url,root_domain,terms,expires_at,announced_at'
    + `&active=eq.true&announced_at=gte.${encodeURIComponent(since)}&order=announced_at.desc&limit=10`;
  let rows;
  try {
    const response = await fetch(`${state.url}/rest/v1/public_freebies?${query}`, {
      headers: { apikey: state.key, Authorization: `Bearer ${state.key}` },
      cache: 'no-store'
    });
    if (!response.ok) return [];
    rows = await response.json();
  } catch (e) {
    return [];
  }
  const seen = await readPushState(DROP_SEEN_KEY, false);
  const seenIds = new Set(Array.isArray(seen) ? seen : []);
  const tracked = new Set(state.keys);
  return (Array.isArray(rows) ? rows : []).filter(row => row && row.id && !seenIds.has(row.id)
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

async function showDrops(drops) {
  const shown = drops.slice(0, 3);
  await Promise.all(shown.map(drop => self.registration.showNotification(`New drop: ${drop.platform_name}`, {
    body: dropNotificationBody(drop),
    tag: `almanac-drop-${drop.id}`,
    icon: 'apple-touch-icon.png',
    data: { open: 'freebies' }
  })));
  const seen = await readPushState(DROP_SEEN_KEY, false);
  const ids = (Array.isArray(seen) ? seen : []).concat(drops.map(drop => drop.id));
  await writePushState(DROP_SEEN_KEY, ids.slice(-100));
}

self.addEventListener('push', (event) => {
  event.waitUntil(Promise.all([
    readPushState(PUSH_SCHEDULE_KEY, false),
    readPushState(PUSH_TEST_KEY, true),
    readPushState(DROP_STATE_KEY, false)
  ]).then(async ([schedule, testAt, dropState]) => {
    const now = Date.now();
    // The app stamps this just before asking the server for a test push.
    if (Number(testAt) > now - 120000) {
      return self.registration.showNotification('Casino Almanac', {
        body: 'Test from the server: background alerts reach this device.',
        tag: 'almanac-server-test',
        icon: 'apple-touch-icon.png'
      });
    }
    const drops = await unseenDrops(dropState, now);
    if (drops.length) await showDrops(drops);
    let due = null;
    (Array.isArray(schedule) ? schedule : []).forEach((entry) => {
      if (entry && Number(entry.at) <= now + 60000 && (!due || Number(entry.at) > Number(due.at))) due = entry;
    });
    // A drop push isn't a schedule push: only add the ready alert when an
    // entry has genuinely just come due.
    if (drops.length && !(due && Number(due.at) > now - 300000)) return undefined;
    const count = due ? Number(due.count) : 0;
    let body = 'Your platforms are ready to collect.';
    if (count > 0 && due.digest) {
      body = `Daily digest: ${readySummary(Array.isArray(due.names) ? due.names : [], count)} ready to collect`;
    } else if (count > 0) {
      body = `${count} platform${count === 1 ? '' : 's'} ready to collect`;
    }
    // Same tag as the in-page alert, so an open tab and a push never stack.
    return self.registration.showNotification('Casino Almanac', {
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
  event.waitUntil(
    self.clients.matchAll({ type: 'window', includeUncontrolled: true }).then((windows) => {
      const open = windows.find((client) => 'focus' in client);
      if (open) {
        if (toFreebies) open.postMessage({ type: 'open-freebies' });
        return open.focus();
      }
      return self.clients.openWindow(toFreebies ? './?open=freebies' : './');
    })
  );
});
