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
  const focused = [];
  const precached = [];
  const openWindows = (windows || []).map(url => ({
    url,
    focus: async () => { focused.push(url); },
    postMessage: msg => messages.push({ url, ...msg })
  }));
  const self = {
    addEventListener: (type, fn) => { handlers[type] = fn; },
    registration: {
      scope: 'https://app.test/',
      showNotification: async (title, options) => { shown.push({ title, ...options }); }
    },
    clients: {
      matchAll: async () => openWindows,
      openWindow: async url => { opened.push(url); }
    },
    skipWaiting: () => {}
  };
  const context = vm.createContext({
    self,
    indexedDB: idb.api,
    caches: {
      open: async () => ({
        addAll: async urls => { precached.push(...urls); },
        put: async () => {}
      }),
      keys: async () => [],
      match: async () => undefined,
      delete: async () => true
    },
    fetch: async url => {
      fetched.push(String(url));
      if (fetchFails) throw new TypeError('offline');
      // Serves the requested page, as the REST feed does.
      const params = new URL(String(url)).searchParams;
      const offset = Number(params.get('offset')) || 0;
      const limit = Number(params.get('limit')) || 1000;
      const page = (rows || []).slice(offset, offset + limit);
      return { ok: true, json: async () => JSON.parse(JSON.stringify(page)) };
    },
    URL,
    console,
    setTimeout,
    Date,
    Promise
  });
  vm.runInContext(SOURCE, context, { filename: 'sw.js' });
  return {
    shown, fetched, opened, messages, focused,
    async install() {
      const waits = [];
      handlers.install({ waitUntil: p => waits.push(p) });
      await Promise.all(waits);
      return precached.slice();
    },
    async pushTogether(n) {
      const waits = [];
      for (let i = 0; i < n; i++) handlers.push({ waitUntil: p => waits.push(p) });
      await Promise.all(waits);
    },
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
  ['the table destination module and icon assets are precached', async () => {
    const sw = loadWorker({ idb: fakeIndexedDB() });
    const precached = await sw.install();
    [
      './assets/intro3d/table.mjs',
      './assets/intro3d/icons/chip-emerald.webp',
      './assets/intro3d/icons/chip-gold.webp',
      './assets/intro3d/icons/chip-ivory.webp',
      './assets/intro3d/icons/chip-onyx.webp',
      './assets/intro3d/icons/chip-oxblood.webp',
      './assets/intro3d/icons/chip-plum.webp',
      './assets/intro3d/icons/clock-bezel.webp',
      './assets/intro3d/icons/coin-clock.webp',
      './assets/intro3d/icons/coin-deck.webp',
      './assets/intro3d/icons/coin-house.webp',
      './assets/intro3d/icons/coin-send.webp'
    ].forEach(url => expect(precached.includes(url), true, `${url} precached`));
  }],

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
    expect(sw.shown.map(n => n.title), ['New drop: Smoke Casino', 'Daily Roll Over'], 'not shown twice');
  }],

  ['past three drops, the rest are summed up and all count as seen', async () => {
    const many = [1, 2, 3, 4, 5].map(n => ({ ...DROP, id: `m${n}`, platform_name: 'Smoke Casino', code: `CODE${n}` }));
    const idb = fakeIndexedDB({ drop_alerts: STATE });
    const sw = loadWorker({ idb, rows: many });
    await sw.push();
    expect(sw.shown.map(n => n.title), ['New drop: Smoke Casino', 'New drop: Smoke Casino', '3 more new drops'], 'two drops and a summary');
    expect(sw.shown[2].data, { open: 'freebies' }, 'summary opens Freebies');
    expect(idb.data.get('drop_seen'), ['m1', 'm2', 'm3', 'm4', 'm5'], 'every drop was put in front of the user');
  }],

  ['up to three drops each get their own alert', async () => {
    const three = [1, 2, 3].map(n => ({ ...DROP, id: `t${n}` }));
    const sw = loadWorker({ idb: fakeIndexedDB({ drop_alerts: STATE }), rows: three });
    await sw.push();
    expect(sw.shown.length, 3, 'three alerts, no summary');
  }],

  ['an older tracked drop behind a page of other drops is still found', async () => {
    const others = Array.from({ length: 60 }, (_, n) => ({ ...OTHER, id: `o${n}` }));
    const sw = loadWorker({ idb: fakeIndexedDB({ drop_alerts: STATE }), rows: others.concat([DROP]) });
    await sw.push();
    expect(sw.shown.map(n => n.title), ['New drop: Smoke Casino'], 'found on the second page');
    expect(sw.fetched.length, 2, 'read two pages');
  }],

  ['two pushes at once show a drop only once', async () => {
    const sw = loadWorker({ idb: fakeIndexedDB({ drop_alerts: STATE }), rows: [DROP] });
    await sw.pushTogether(2);
    expect(sw.shown.filter(n => n.title === 'New drop: Smoke Casino').length, 1, 'one drop alert');
  }],

  ['with nothing new and nothing due, it makes no ready claim', async () => {
    const sw = loadWorker({ idb: fakeIndexedDB({ drop_alerts: STATE, push_schedule: [{ at: NOW - 5 * HOUR, count: 4 }] }), rows: [] });
    await sw.push();
    expect(sw.shown.map(n => n.body), ["Open Daily Roll Over to see what's new."], 'neutral note');
  }],

  ['sites under a two-part country suffix match only themselves', async () => {
    const state = { ...STATE, keys: ['site:luckycasino.co.uk'] };
    const mine = { ...DROP, id: 'uk1', platform_name: 'Lucky', root_domain: 'luckycasino.co.uk' };
    const other = { ...DROP, id: 'uk2', platform_name: 'Other UK', root_domain: 'otherplace.co.uk' };
    const sw = loadWorker({ idb: fakeIndexedDB({ drop_alerts: state }), rows: [other, mine] });
    await sw.push();
    expect(sw.shown.map(n => n.title), ['New drop: Lucky'], 'only the tracked .co.uk site');
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
    expect(sw.shown.map(n => n.title), ['New drop: Smoke Casino', 'Daily Roll Over'], 'both');
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
    expect(sw.shown.map(n => n.title), ['Daily Roll Over'], 'no drop alert');
  }],

  ['clicking a drop alert opens Freebies', async () => {
    const closed = loadWorker({ idb: fakeIndexedDB() });
    await closed.click({ open: 'freebies' });
    expect(closed.opened, ['./?open=freebies'], 'opens the app on Freebies');
    const open = loadWorker({ idb: fakeIndexedDB(), windows: ['https://app.test/admin/freebies.html', 'https://app.test/?src=x'] });
    await open.click({ open: 'freebies' });
    expect(open.messages, [{ url: 'https://app.test/?src=x', type: 'open-freebies' }], 'tells the app window, not the admin page');
    expect(open.focused, ['https://app.test/?src=x'], 'focuses the app window');
    const onlyAdmin = loadWorker({ idb: fakeIndexedDB(), windows: ['https://app.test/admin/freebies.html'] });
    await onlyAdmin.click({ open: 'freebies' });
    expect(onlyAdmin.opened, ['./?open=freebies'], 'opens the app when only another page is open');
    expect(onlyAdmin.messages, [], 'no message to a page that cannot handle it');
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
