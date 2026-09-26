#!/usr/bin/env node
/*
 * Runs sw.js's push and notification-click handlers against fakes of the
 * service worker globals, IndexedDB and the network - no browser, no
 * dependencies - to check how a payload-free push becomes a notification:
 * a new-drop alert for a tracked platform, the usual "ready to collect"
 * alert, or both.
 *
 *   npm run test:sw
 */

const fs = require('fs');
const path = require('path');
const vm = require('vm');

const SOURCE = fs.readFileSync(path.join(__dirname, '..', 'sw.js'), 'utf8');
const HOUR = 3600000;

// An IndexedDB with one database and one object store, which is all sw.js
// and assets/storage.js ever open.
function fakeIndexedDB(initial) {
  const data = new Map(Object.entries(initial || {}));
  const later = fn => setTimeout(fn, 0);
  const request = run => {
    const req = {};
    later(() => { req.result = run(); if (req.onsuccess) req.onsuccess(); });
    return req;
  };
  const db = {
    transaction() {
      const tx = {
        objectStore: () => ({
          get: key => request(() => data.get(key)),
          put: (value, key) => request(() => { data.set(key, value); }),
          delete: key => request(() => { data.delete(key); })
        })
      };
      later(() => later(() => { if (tx.oncomplete) tx.oncomplete(); }));
      return tx;
    }
  };
  return {
    data,
    api: { open: () => { const req = {}; later(() => { req.result = db; if (req.onsuccess) req.onsuccess(); }); return req; } }
  };
}

function loadWorker({ idb, rows, fetchFails, windows }) {
  const handlers = {};
  const shown = [];
  const fetched = [];
  const opened = [];
  const messages = [];
  const openWindows = (windows || []).map(() => ({
    focus: async () => {},
    postMessage: msg => messages.push(msg)
  }));
  const self = {
    addEventListener: (type, fn) => { handlers[type] = fn; },
    registration: { showNotification: async (title, options) => { shown.push({ title, ...options }); } },
    clients: {
      matchAll: async () => openWindows,
      openWindow: async url => { opened.push(url); }
    },
    skipWaiting: () => {}
  };
  const context = vm.createContext({
    self,
    indexedDB: idb.api,
    caches: { open: async () => ({}), keys: async () => [], match: async () => undefined, delete: async () => true },
    fetch: async url => {
      fetched.push(String(url));
      if (fetchFails) throw new TypeError('offline');
      return { ok: true, json: async () => JSON.parse(JSON.stringify(rows || [])) };
    },
    URL,
    console,
    setTimeout,
    Date,
    Promise
  });
  vm.runInContext(SOURCE, context, { filename: 'sw.js' });
  return {
    shown, fetched, opened, messages,
    async push() {
      const waits = [];
      handlers.push({ waitUntil: p => waits.push(p) });
      await Promise.all(waits);
    },
    async click(data) {
      const waits = [];
      handlers.notificationclick({ notification: { data, close() {} }, waitUntil: p => waits.push(p) });
      await Promise.all(waits);
    }
  };
}

const NOW = Date.now();
const STATE = {
  on: true,
  keys: ['name:smokecasino', 'site:smoke.example'],
  since: NOW - 24 * HOUR,
  url: 'https://project.supabase.co',
  key: 'anon-key'
};
const DROP = {
  id: 'd1', platform_name: 'Smoke Casino', bucket: 'A_code', code: 'WIN20', claim_url: null,
  root_domain: 'smoke.example', terms: 'New players only', expires_at: null, announced_at: new Date(NOW - 60000).toISOString()
};
const OTHER = { ...DROP, id: 'd2', platform_name: 'Other Place', code: null, bucket: 'B_claim', root_domain: 'other.example' };

const TESTS = [
  ['a drop push for a tracked platform shows the drop, once', async () => {
    const idb = fakeIndexedDB({ drop_alerts: STATE, push_schedule: [] });
    const sw = loadWorker({ idb, rows: [DROP, OTHER] });
    await sw.push();
    expect(sw.shown.map(n => n.title), ['New drop: Smoke Casino'], 'only the tracked drop');
    expect(sw.shown[0].body, 'Promo code: WIN20 · New players only', 'code and terms');
    expect(sw.shown[0].data, { open: 'freebies' }, 'opens Freebies');
    expect(idb.data.get('drop_seen'), ['d1'], 'remembered as shown');
    expect(/announced_at=gte\./.test(sw.fetched[0]) && /active=eq\.true/.test(sw.fetched[0]), true, 'asks for recently announced, active drops');
    await sw.push();
    expect(sw.shown.map(n => n.title), ['New drop: Smoke Casino', 'Casino Almanac'], 'not shown twice');
  }],

  ['drops announced before alerts were turned on are left out', async () => {
    const since = NOW - HOUR;
    const idb = fakeIndexedDB({ drop_alerts: { ...STATE, since } });
    const sw = loadWorker({ idb, rows: [] });
    await sw.push();
    const asked = decodeURIComponent(sw.fetched[0].match(/announced_at=gte\.([^&]+)/)[1]);
    expect(asked, new Date(since).toISOString(), 'looks back only to when they were turned on');
  }],

  ['with drop alerts off, a push is the usual ready alert and nothing is fetched', async () => {
    const idb = fakeIndexedDB({ drop_alerts: { on: false }, push_schedule: [{ at: NOW - 1000, count: 2 }] });
    const sw = loadWorker({ idb, rows: [DROP] });
    await sw.push();
    expect(sw.fetched.length, 0, 'no fetch');
    expect(sw.shown.map(n => n.body), ['2 platforms ready to collect'], 'ready alert');
  }],

  ['offline, it falls back to the ready alert', async () => {
    const idb = fakeIndexedDB({ drop_alerts: STATE, push_schedule: [{ at: NOW - 1000, count: 1 }] });
    const sw = loadWorker({ idb, fetchFails: true });
    await sw.push();
    expect(sw.shown.map(n => n.body), ['1 platform ready to collect'], 'ready alert');
  }],

  ['a drop push that lands as an alert comes due shows both', async () => {
    const idb = fakeIndexedDB({ drop_alerts: STATE, push_schedule: [{ at: NOW - 1000, count: 3 }] });
    const sw = loadWorker({ idb, rows: [DROP] });
    await sw.push();
    expect(sw.shown.map(n => n.title), ['New drop: Smoke Casino', 'Casino Almanac'], 'both');
  }],

  ['a stale schedule entry does not ride along with a drop', async () => {
    const idb = fakeIndexedDB({ drop_alerts: STATE, push_schedule: [{ at: NOW - 3 * HOUR, count: 3 }] });
    const sw = loadWorker({ idb, rows: [DROP] });
    await sw.push();
    expect(sw.shown.map(n => n.title), ['New drop: Smoke Casino'], 'drop only');
  }],

  ['an expired drop is not shown', async () => {
    const idb = fakeIndexedDB({ drop_alerts: STATE });
    const sw = loadWorker({ idb, rows: [{ ...DROP, expires_at: new Date(NOW - 60000).toISOString() }] });
    await sw.push();
    expect(sw.shown.map(n => n.title), ['Casino Almanac'], 'no drop alert');
  }],

  ['clicking a drop alert opens Freebies', async () => {
    const closed = loadWorker({ idb: fakeIndexedDB() });
    await closed.click({ open: 'freebies' });
    expect(closed.opened, ['./?open=freebies'], 'opens the app on Freebies');
    const open = loadWorker({ idb: fakeIndexedDB(), windows: [{}] });
    await open.click({ open: 'freebies' });
    expect(open.messages, [{ type: 'open-freebies' }], 'tells the open app');
    const ready = loadWorker({ idb: fakeIndexedDB() });
    await ready.click(undefined);
    expect(ready.opened, ['./'], 'a ready alert opens the app as before');
  }]
];

function expect(actual, expected, label) {
  if (JSON.stringify(actual) !== JSON.stringify(expected)) {
    throw new Error(`${label}: got ${JSON.stringify(actual)}, expected ${JSON.stringify(expected)}`);
  }
}

(async () => {
  let passed = 0;
  for (const [name, run] of TESTS) {
    try {
      await run();
      passed++;
      console.log(`ok    ${name}`);
    } catch (error) {
      console.log(`FAIL  ${name}\n      ${error.message}`);
    }
  }
  console.log(`\nService worker push tests: ${passed} passed, ${TESTS.length - passed} failed.`);
  process.exit(passed === TESTS.length ? 0 : 1);
})();
