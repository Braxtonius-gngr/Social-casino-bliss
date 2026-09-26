/*
 * IndexedDB storage for user-owned application data.
 *
 * The app still reads the legacy localStorage values synchronously for the
 * first paint. This adapter then migrates those values into IndexedDB and
 * provides asynchronous read/write access for the larger, frequently changed
 * collections that should not be constrained by localStorage quotas.
 */
(function () {
  'use strict';

  const DB_NAME = 'casino-almanac';
  const DB_VERSION = 1;
  const STORE_NAME = 'state';
  const MIGRATION_MARKER = 'almanac_indexeddb_migrated_v1';
  let dbPromise = null;

  function open() {
    if (dbPromise) return dbPromise;
    dbPromise = new Promise((resolve, reject) => {
      if (!window.indexedDB) {
        reject(new Error('IndexedDB is unavailable'));
        return;
      }
      const request = indexedDB.open(DB_NAME, DB_VERSION);
      request.onupgradeneeded = () => {
        request.result.createObjectStore(STORE_NAME);
      };
      request.onsuccess = () => resolve(request.result);
      request.onerror = () => reject(request.error || new Error('Could not open IndexedDB'));
    });
    return dbPromise;
  }

  function transaction(mode, callback) {
    return open().then(db => new Promise((resolve, reject) => {
      const tx = db.transaction(STORE_NAME, mode);
      const store = tx.objectStore(STORE_NAME);
      let request;
      try {
        request = callback(store);
      } catch (error) {
        reject(error);
        return;
      }
      // A request's success is not a commit; a write can still abort (quota).
      tx.oncomplete = () => resolve(request.result);
      tx.onerror = tx.onabort = () => reject(tx.error || request.error || new Error('IndexedDB transaction failed'));
    }));
  }

  function get(key) {
    return transaction('readonly', store => store.get(key));
  }

  function set(key, value) {
    return transaction('readwrite', store => store.put(value, key));
  }

  function migrateLegacy(keys) {
    if (localStorage.getItem(MIGRATION_MARKER) === 'true') return Promise.resolve(false);
    const values = {};
    keys.forEach(key => {
      const raw = localStorage.getItem(key);
      if (raw !== null) {
        try { values[key] = JSON.parse(raw); } catch (error) { /* keep malformed legacy data out */ }
      }
    });
    return Promise.all(Object.keys(values).map(key => set(key, values[key])))
      .then(() => {
        localStorage.setItem(MIGRATION_MARKER, 'true');
        return Object.keys(values).length > 0;
      });
  }

  window.AlmanacDB = {
    get: get,
    set: set,
    migrateLegacy: migrateLegacy
  };
})();
