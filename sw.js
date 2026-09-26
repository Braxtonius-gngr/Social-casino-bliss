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

const CACHE_NAME = 'almanac-v41';

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

function readPushSchedule() {
  return new Promise((resolve) => {
    let request;
    try {
      request = indexedDB.open(PUSH_DB_NAME, PUSH_DB_VERSION);
    } catch (e) {
      resolve([]);
      return;
    }
    // Same schema assets/storage.js creates, in case the worker opens first.
    request.onupgradeneeded = () => request.result.createObjectStore(PUSH_STORE);
    request.onerror = () => resolve([]);
    request.onsuccess = () => {
      try {
        const get = request.result.transaction(PUSH_STORE, 'readonly').objectStore(PUSH_STORE).get(PUSH_SCHEDULE_KEY);
        get.onsuccess = () => resolve(Array.isArray(get.result) ? get.result : []);
        get.onerror = () => resolve([]);
      } catch (e) {
        resolve([]);
      }
    };
  });
}

self.addEventListener('push', (event) => {
  event.waitUntil(readPushSchedule().then((schedule) => {
    const now = Date.now();
    let due = null;
    schedule.forEach((entry) => {
      if (entry && Number(entry.at) <= now + 60000 && (!due || Number(entry.at) > Number(due.at))) due = entry;
    });
    const count = due ? Number(due.count) : 0;
    const body = count > 0
      ? `${count} platform${count === 1 ? '' : 's'} ready to collect`
      : 'Your platforms are ready to collect.';
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
  event.waitUntil(
    self.clients.matchAll({ type: 'window', includeUncontrolled: true }).then((windows) => {
      const open = windows.find((client) => 'focus' in client);
      return open ? open.focus() : self.clients.openWindow('./');
    })
  );
});
