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

const CACHE_NAME = 'almanac-v1';

// Relative paths only. This app is hosted on GitHub Pages at a SUBPATH
// (/Social-casino-bliss/), so a leading "/" would resolve to the domain root
// and silently fail.
const PRECACHE_URLS = ['./', './index.html', './manifest.json'];

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
    fetch(req)
      .then((response) => {
        // Only cache genuinely successful responses.
        if (response && response.status === 200 && response.type === 'basic') {
          const copy = response.clone();
          caches.open(CACHE_NAME).then((cache) => cache.put(req, copy));
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
