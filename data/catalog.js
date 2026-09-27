/*
 * Runtime bootstrap for the platform catalogue.
 *
 * This stays a classic script because the inline app script consumes
 * CATALOG_DATA synchronously. The catalogue itself lives in the database
 * now (get_catalog, served to the device's signed-in account) and the
 * deployed site carries no catalogue file. What this does is put the last
 * copy this browser saved back on screen instantly; refreshExternalCatalog()
 * in index.html then asks the server whether anything changed. A first
 * visit starts empty and fills in a moment later.
 */
const CATALOG_CACHE_KEY = 'almanac_catalog_cache_v1';
const CATALOG_VERSION_KEY = 'almanac_catalog_version_v1';
const CATALOG_DATA = [];
// The server version the saved copy came from, so the first refresh can
// ask "anything newer than this?" instead of downloading it all again.
let CATALOG_BOOTSTRAP_VERSION = null;

(function loadCatalogBootstrap() {
  let raw = null;
  let version = null;
  try {
    raw = localStorage.getItem(CATALOG_CACHE_KEY);
    version = localStorage.getItem(CATALOG_VERSION_KEY);
  } catch (error) {
    console.warn('Could not read the cached catalogue:', error.message);
  }
  if (!raw) return;
  let parsed = null;
  try {
    parsed = JSON.parse(raw);
  } catch (error) {
    console.warn('The cached catalogue is not valid JSON:', error.message);
  }
  if (!Array.isArray(parsed)) return;
  CATALOG_DATA.push(...parsed);
  CATALOG_BOOTSTRAP_VERSION = version || null;
})();
