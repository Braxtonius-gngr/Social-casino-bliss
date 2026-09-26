/*
 * Runtime bootstrap for the external platform-rules payload.
 *
 * This stays a classic script because the inline app script consumes
 * CATALOG_DATA synchronously. The JSON file is authoritative; the saved
 * snapshot renders instantly and refreshExternalCatalog() replaces it with
 * the live copy moments later. Only a first visit, with nothing saved yet,
 * blocks on the network.
 */
const CATALOG_CACHE_KEY = 'almanac_catalog_cache_v1';
const CATALOG_DATA = [];
// The exact text CATALOG_DATA came from, so the live refresh can skip
// re-parsing and re-rendering when nothing changed.
let CATALOG_BOOTSTRAP_TEXT = null;

(function loadCatalogBootstrap() {
  function parseCatalog(raw) {
    try {
      const parsed = JSON.parse(raw);
      if (Array.isArray(parsed)) return parsed;
      console.warn('The catalogue is not an array.');
    } catch (error) {
      console.warn('The catalogue is not valid JSON:', error.message);
    }
    return null;
  }

  let raw = null;
  try {
    raw = localStorage.getItem(CATALOG_CACHE_KEY);
  } catch (error) {
    console.warn('Could not read the cached catalogue:', error.message);
  }
  let parsed = raw ? parseCatalog(raw) : null;

  if (!parsed) {
    try {
      const xhr = new XMLHttpRequest();
      xhr.open('GET', 'data/catalog.json', false);
      xhr.send();
      if (xhr.status >= 200 && xhr.status < 300) {
        raw = xhr.responseText;
        parsed = parseCatalog(raw);
        if (parsed) {
          try { localStorage.setItem(CATALOG_CACHE_KEY, raw); } catch (error) { /* quota; refresh retries */ }
        }
      }
    } catch (error) {
      console.warn('Could not load the external catalogue:', error.message);
    }
  }

  if (!parsed) return;
  CATALOG_DATA.push(...parsed);
  CATALOG_BOOTSTRAP_TEXT = raw;
})();
