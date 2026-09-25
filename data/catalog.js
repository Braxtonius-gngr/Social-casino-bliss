/*
 * Runtime bootstrap for the external platform-rules payload.
 *
 * This stays a classic script because the inline app script consumes
 * CATALOG_DATA synchronously. The JSON file is authoritative; the local
 * snapshot only lets a previously loaded catalogue render before the next
 * network refresh, including when the service worker is serving offline.
 */
const CATALOG_CACHE_KEY = 'almanac_catalog_cache_v1';
const CATALOG_DATA = [];

(function loadCatalogBootstrap() {
  let raw = null;
  try {
    const xhr = new XMLHttpRequest();
    xhr.open('GET', 'data/catalog.json', false);
    xhr.send();
    if (xhr.status >= 200 && xhr.status < 300) raw = xhr.responseText;
  } catch (error) {
    console.warn('Could not load the external catalogue:', error.message);
  }

  if (!raw) {
    try {
      raw = localStorage.getItem(CATALOG_CACHE_KEY);
    } catch (error) {
      console.warn('Could not read the cached catalogue:', error.message);
    }
  }

  if (!raw) return;
  try {
    const parsed = JSON.parse(raw);
    if (Array.isArray(parsed)) CATALOG_DATA.push(...parsed);
    else console.warn('The external catalogue is not an array.');
  } catch (error) {
    console.warn('The external catalogue is not valid JSON:', error.message);
  }
})();
