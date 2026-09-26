#!/usr/bin/env node
/*
 * Browser smoke tests for the flows that touch the server: anonymous sign-in
 * and crawlers, Cloud Sync, Pro checkout and entitlements, background push,
 * and self-serve account deletion.
 *
 *   npm run test:smoke       (CHROME_PATH=/path/to/chrome picks the browser)
 *
 * No dependencies, like the other scripts here: it serves the repo with
 * node:http, drives an installed Chrome or Chromium over the DevTools
 * protocol with Node's built-in WebSocket, and answers the supabase-js CDN
 * request with a recording fake (fakeSupabase() below), so nothing leaves
 * the machine and every server call the app makes can be checked. What it
 * proves is the app's side of each flow - the right calls, with the right
 * payloads, in the right order - not the live Supabase or Stripe setup.
 */

const fs = require('fs');
const os = require('os');
const path = require('path');
const http = require('http');
const { spawn } = require('child_process');

const ROOT = path.resolve(__dirname, '..');
const TIMEOUT_MS = 15000;
const CHROME_START_MS = 60000;
const SMOKE_USER = 'smoke-user-1';
const GOOGLEBOT = 'Mozilla/5.0 (compatible; Googlebot/2.1; +http://www.google.com/bot.html)';
const HEADLESS = 'Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) HeadlessChrome/141.0.0.0 Safari/537.36';
// Headless Chrome's own user agent says HeadlessChrome, which the app now
// treats as a scanner; every test runs as an ordinary browser unless it asks
// for a particular one.
const PERSON = 'Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/141.0.0.0 Safari/537.36';

// --- A static server for the repo --------------------------------------

const TYPES = {
  '.html': 'text/html; charset=utf-8', '.js': 'application/javascript; charset=utf-8',
  '.css': 'text/css; charset=utf-8', '.json': 'application/json; charset=utf-8',
  '.webmanifest': 'application/manifest+json', '.png': 'image/png', '.webp': 'image/webp',
  '.svg': 'image/svg+xml', '.ico': 'image/x-icon', '.xml': 'application/xml', '.txt': 'text/plain; charset=utf-8'
};

function startServer() {
  const server = http.createServer((req, res) => {
    let file = decodeURIComponent(new URL(req.url, 'http://x').pathname);
    if (file.endsWith('/')) file += 'index.html';
    const full = path.join(ROOT, path.normalize(file));
    if (!full.startsWith(ROOT + path.sep)) { res.writeHead(403); res.end(); return; }
    fs.readFile(full, (err, body) => {
      if (err) { res.writeHead(404); res.end('not found'); return; }
      res.writeHead(200, { 'content-type': TYPES[path.extname(full)] || 'application/octet-stream', 'cache-control': 'no-store' });
      res.end(body);
    });
  });
  return new Promise(resolve => server.listen(0, '127.0.0.1', () => resolve(server)));
}

// --- Chrome over the DevTools protocol ---------------------------------

function findChrome() {
  const candidates = [
    process.env.CHROME_PATH,
    '/usr/bin/google-chrome', '/usr/bin/google-chrome-stable', '/usr/bin/chromium', '/usr/bin/chromium-browser',
    '/opt/pw-browsers/chromium',
    '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome',
    'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe'
  ];
  try {
    for (const dir of fs.readdirSync('/opt/pw-browsers')) {
      if (/^chromium-\d+$/.test(dir)) candidates.push(`/opt/pw-browsers/${dir}/chrome-linux/chrome`);
    }
  } catch (e) { /* not a Playwright image */ }
  const found = candidates.find(p => p && fs.existsSync(p) && fs.statSync(p).isFile());
  if (!found) throw new Error('No Chrome or Chromium found. Set CHROME_PATH to one.');
  return found;
}

function launchChrome() {
  const profile = fs.mkdtempSync(path.join(os.tmpdir(), 'almanac-smoke-'));
  const proc = spawn(findChrome(), [
    '--headless=new', '--no-sandbox', '--disable-gpu', '--disable-dev-shm-usage', '--no-first-run',
    '--no-default-browser-check', '--disable-extensions', '--remote-debugging-port=0',
    // The app refuses to sign automation in (navigator.webdriver), which is
    // right for scanners and wrong for these tests: they stand in for a
    // person's browser. The tests that want a bot set one up themselves.
    '--disable-blink-features=AutomationControlled',
    `--user-data-dir=${profile}`, 'about:blank'
  ], { stdio: ['ignore', 'ignore', 'pipe'] });
  // A cold start on a CI runner can take well over the per-step timeout.
  // The address is read from stderr or, failing that, from the
  // DevToolsActivePort file Chrome writes into the profile.
  return new Promise((resolve, reject) => {
    let stderr = '';
    let settled = false;
    const finish = (error, wsUrl) => {
      if (settled) return;
      settled = true;
      clearTimeout(timer);
      clearInterval(poll);
      if (error) {
        proc.kill();
        reject(error);
      } else {
        resolve({ proc, profile, wsUrl });
      }
    };
    const timer = setTimeout(() => finish(new Error(`Chrome did not start within ${CHROME_START_MS / 1000}s:\n${stderr}`)), CHROME_START_MS);
    const poll = setInterval(() => {
      try {
        const [port, wsPath] = fs.readFileSync(path.join(profile, 'DevToolsActivePort'), 'utf8').split('\n');
        if (/^\d+$/.test(port) && wsPath) finish(null, `ws://127.0.0.1:${port}${wsPath.trim()}`);
      } catch (e) { /* not written yet */ }
    }, 250);
    proc.stderr.on('data', chunk => {
      stderr += chunk;
      const match = /DevTools listening on (ws:\/\/\S+)/.exec(stderr);
      if (match) finish(null, match[1]);
    });
    proc.on('exit', code => finish(new Error(`Chrome exited (${code}):\n${stderr}`)));
  });
}

class Connection {
  constructor(ws) {
    this.ws = ws;
    this.nextId = 1;
    this.pending = new Map();
    this.listeners = new Set();
    ws.addEventListener('message', event => {
      const msg = JSON.parse(event.data);
      if (msg.id && this.pending.has(msg.id)) {
        const { resolve, reject, method } = this.pending.get(msg.id);
        this.pending.delete(msg.id);
        if (msg.error) reject(new Error(`${method}: ${msg.error.message}`));
        else resolve(msg.result);
      } else if (msg.method) {
        for (const fn of this.listeners) fn(msg);
      }
    });
  }

  static open(url) {
    const ws = new WebSocket(url);
    return new Promise((resolve, reject) => {
      ws.addEventListener('open', () => resolve(new Connection(ws)), { once: true });
      ws.addEventListener('error', () => reject(new Error(`Could not connect to ${url}`)), { once: true });
    });
  }

  send(method, params = {}, sessionId) {
    const id = this.nextId++;
    const msg = { id, method, params };
    if (sessionId) msg.sessionId = sessionId;
    this.ws.send(JSON.stringify(msg));
    return new Promise((resolve, reject) => this.pending.set(id, { resolve, reject, method }));
  }
}

// --- The fake Supabase client (runs in the page) ------------------------

// Served in place of supabase-js. Every call is appended to a log in
// sessionStorage, so it survives the checkout redirect; answers come from
// the test's config (answers["rpc:<name>"], ["invoke:<name>"],
// ["from:<table>"]) or sensible empty defaults.
function fakeSupabase() {
  const readJson = (store, key, fallback) => { try { return JSON.parse(store.getItem(key)) || fallback; } catch (e) { return fallback; } };
  const log = entry => {
    const calls = readJson(sessionStorage, '__smokeCalls', []);
    calls.push(entry);
    sessionStorage.setItem('__smokeCalls', JSON.stringify(calls));
  };
  const answer = key => {
    const answers = readJson(sessionStorage, '__smokeConfig', {}).answers || {};
    return answers[key] === undefined ? undefined : JSON.parse(JSON.stringify(answers[key]));
  };
  const clone = value => (value === undefined ? null : JSON.parse(JSON.stringify(value)));
  const SESSION_KEY = '__smokeSession';
  const session = () => readJson(localStorage, SESSION_KEY, null);
  const listeners = [];
  const emit = (event, value) => setTimeout(() => listeners.forEach(fn => { try { fn(event, value); } catch (e) { /* app's problem */ } }), 0);

  function thenable(run) {
    return { then: (ok, bad) => Promise.resolve().then(run).then(ok, bad) };
  }

  function query(table) {
    const chain = [];
    const run = () => {
      log({ type: 'from', table, chain });
      const custom = answer(`from:${table}`);
      if (custom !== undefined) return custom;
      const ops = chain.map(c => c[0]);
      if (table === 'tracked_games_snapshot' && ops.includes('upsert')) {
        return { data: { updated_at: new Date().toISOString() }, error: null };
      }
      return { data: ops.includes('single') || ops.includes('maybeSingle') ? null : [], error: null };
    };
    const builder = new Proxy({}, {
      get(target, prop) {
        if (prop === 'then') return thenable(run).then;
        return (...args) => { chain.push([String(prop), clone(args)]); return builder; };
      }
    });
    return builder;
  }

  const RPC_DEFAULTS = {
    server_time: () => ({ data: new Date().toISOString(), error: null }),
    get_my_entitlement: () => ({ data: [], error: null }),
    is_moderator: () => ({ data: false, error: null })
  };

  const auth = {
    getSession: async () => ({ data: { session: session() }, error: null }),
    getUser: async () => ({ data: { user: session() && session().user }, error: null }),
    signInAnonymously: async () => {
      log({ type: 'auth', method: 'signInAnonymously' });
      const value = { access_token: 'smoke-token', token_type: 'bearer', user: { id: 'smoke-user-1', is_anonymous: true, email: '' } };
      localStorage.setItem(SESSION_KEY, JSON.stringify(value));
      emit('SIGNED_IN', value);
      return { data: { session: value, user: value.user }, error: null };
    },
    signOut: async options => {
      log({ type: 'auth', method: 'signOut', args: clone(options) });
      localStorage.removeItem(SESSION_KEY);
      emit('SIGNED_OUT', null);
      return { error: null };
    },
    onAuthStateChange: fn => {
      listeners.push(fn);
      emit('INITIAL_SESSION', session());
      return { data: { subscription: { unsubscribe() {} } } };
    }
  };

  const client = {
    auth: new Proxy(auth, {
      get(target, prop) {
        if (prop in target) return target[prop];
        return async (...args) => { log({ type: 'auth', method: String(prop), args: clone(args) }); return { data: {}, error: null }; };
      }
    }),
    from: table => query(table),
    rpc: (name, args) => thenable(() => {
      log({ type: 'rpc', name, args: clone(args) });
      const custom = answer(`rpc:${name}`);
      if (custom !== undefined) return custom;
      return RPC_DEFAULTS[name] ? RPC_DEFAULTS[name]() : { data: null, error: null };
    }),
    functions: {
      invoke: async (name, options) => {
        log({ type: 'invoke', name, method: (options && options.method) || 'POST', body: clone(options && options.body) });
        const custom = answer(`invoke:${name}`);
        return custom !== undefined ? custom : { data: null, error: { message: `no smoke answer for ${name}` } };
      }
    },
    channel: () => ({ on() { return this; }, subscribe() { return this; }, unsubscribe() {} }),
    removeChannel: () => {}
  };
  window.supabase = { createClient: () => client };
}

// Runs before the app's own scripts on every page load: seeds storage on
// the first load only, and stands in for the service worker and push
// service, which a headless browser can't provide.
function pageSetup(config) {
  try {
    if (!sessionStorage.getItem('__smokeConfig')) {
      sessionStorage.setItem('__smokeConfig', JSON.stringify(config));
      for (const [key, value] of Object.entries(config.localStorage || {})) {
        localStorage.setItem(key, typeof value === 'string' ? value : JSON.stringify(value));
      }
    }
  } catch (e) { return; }   // about:blank has no storage
  if (config.webdriver) {
    try { Object.defineProperty(navigator, 'webdriver', { get: () => true, configurable: true }); } catch (e) { /* read-only here */ }
  }
  const log = entry => {
    const calls = JSON.parse(sessionStorage.getItem('__smokeCalls') || '[]');
    calls.push(entry);
    sessionStorage.setItem('__smokeCalls', JSON.stringify(calls));
  };
  let subscription = null;
  const pushManager = {
    getSubscription: async () => subscription,
    permissionState: async () => 'granted',
    subscribe: async options => {
      log({ type: 'push', method: 'subscribe', hasKey: !!(options && options.applicationServerKey) });
      subscription = {
        endpoint: 'https://fcm.googleapis.com/fcm/send/smoke-endpoint',
        expirationTime: null,
        options: {},
        getKey: () => null,
        toJSON() { return { endpoint: this.endpoint }; },
        unsubscribe: async () => { log({ type: 'push', method: 'unsubscribe' }); subscription = null; return true; }
      };
      return subscription;
    }
  };
  const registration = {
    scope: location.origin + '/', active: { state: 'activated', postMessage() {} }, installing: null, waiting: null,
    pushManager,
    showNotification: async (title, options) => log({ type: 'notification', title, body: options && options.body }),
    getNotifications: async () => [], update: async () => {}, unregister: async () => true,
    addEventListener() {}, removeEventListener() {}
  };
  const proto = window.ServiceWorkerContainer && ServiceWorkerContainer.prototype;
  if (proto) {
    Object.defineProperty(proto, 'register', { value: async () => registration, configurable: true, writable: true });
    Object.defineProperty(proto, 'getRegistration', { value: async () => registration, configurable: true, writable: true });
    Object.defineProperty(proto, 'getRegistrations', { value: async () => [registration], configurable: true, writable: true });
    Object.defineProperty(proto, 'ready', { get: () => Promise.resolve(registration), configurable: true });
    Object.defineProperty(proto, 'controller', { get: () => null, configurable: true });
  }
  window.confirm = () => true;
}

// --- Pages ----------------------------------------------------------------

class Page {
  constructor(conn, origin) {
    this.conn = conn;
    this.origin = origin;
    this.errors = [];
    this.waiters = new Set();
  }

  async open({ userAgent, config }) {
    const { browserContextId } = await this.conn.send('Target.createBrowserContext', { disposeOnDetach: true });
    this.contextId = browserContextId;
    const { targetId } = await this.conn.send('Target.createTarget', { url: 'about:blank', browserContextId });
    const { sessionId } = await this.conn.send('Target.attachToTarget', { targetId, flatten: true });
    this.sessionId = sessionId;
    this.conn.listeners.add(this.onEvent = msg => { if (msg.sessionId === sessionId) this.handle(msg); });
    const send = (method, params) => this.conn.send(method, params, sessionId);
    this.send = send;
    await send('Runtime.enable');
    await send('Page.enable');
    await this.conn.send('Browser.grantPermissions', { permissions: ['notifications'], origin: this.origin, browserContextId });
    await send('Emulation.setUserAgentOverride', { userAgent: userAgent || PERSON });
    await send('Fetch.enable', { patterns: [{ urlPattern: '*', requestStage: 'Request' }] });
    await send('Page.addScriptToEvaluateOnNewDocument', { source: `(${pageSetup})(${JSON.stringify(config)});` });
    return this;
  }

  handle(msg) {
    if (msg.method === 'Fetch.requestPaused') this.route(msg.params).catch(() => {});
    if (msg.method === 'Runtime.exceptionThrown') {
      const d = msg.params.exceptionDetails;
      this.errors.push((d.exception && d.exception.description) || d.text);
    }
    for (const waiter of this.waiters) waiter(msg);
  }

  // Only this server's files and the fake reach the page; everything else
  // external (fonts) is answered empty or refused.
  async route({ requestId, request }) {
    const fulfill = (body, type) => this.send('Fetch.fulfillRequest', {
      requestId, responseCode: 200,
      responseHeaders: [{ name: 'Content-Type', value: type }],
      body: Buffer.from(body).toString('base64')
    });
    if (request.url.startsWith(this.origin)) return this.send('Fetch.continueRequest', { requestId });
    if (/cdn\.jsdelivr\.net\/npm\/@supabase\/supabase-js/.test(request.url)) return fulfill(`(${fakeSupabase})();`, 'application/javascript');
    if (/fonts\.googleapis\.com/.test(request.url)) return fulfill('', 'text/css');
    return this.send('Fetch.failRequest', { requestId, errorReason: 'BlockedByClient' });
  }

  waitForEvent(method, timeout = TIMEOUT_MS) {
    return new Promise((resolve, reject) => {
      const timer = setTimeout(() => { this.waiters.delete(waiter); reject(new Error(`Timed out waiting for ${method}`)); }, timeout);
      const waiter = msg => {
        if (msg.method !== method) return;
        clearTimeout(timer);
        this.waiters.delete(waiter);
        resolve(msg.params);
      };
      this.waiters.add(waiter);
    });
  }

  async goto(pathname) {
    const loaded = this.waitForEvent('Page.loadEventFired');
    await this.send('Page.navigate', { url: this.origin + pathname });
    await loaded;
  }

  async evaluate(fn, arg) {
    const expression = `(${fn})(${arg === undefined ? '' : JSON.stringify(arg)})`;
    const { result, exceptionDetails } = await this.send('Runtime.evaluate', { expression, awaitPromise: true, returnByValue: true });
    if (exceptionDetails) throw new Error((exceptionDetails.exception && exceptionDetails.exception.description) || exceptionDetails.text);
    return result.value;
  }

  // Polls a condition in the page until it holds.
  async waitFor(fn, arg, timeout = TIMEOUT_MS) {
    const deadline = Date.now() + timeout;
    for (;;) {
      if (await this.evaluate(fn, arg).catch(() => false)) return;
      if (Date.now() > deadline) throw new Error(`Timed out waiting for ${String(fn).slice(0, 120)}`);
      await new Promise(r => setTimeout(r, 100));
    }
  }

  calls() {
    return this.evaluate(() => JSON.parse(sessionStorage.getItem('__smokeCalls') || '[]'));
  }

  async close() {
    this.conn.listeners.delete(this.onEvent);
    await this.conn.send('Target.disposeBrowserContext', { browserContextId: this.contextId }).catch(() => {});
  }
}

// --- The tests --------------------------------------------------------------

const SEED = {
  almanac_show_landing: 'false',
  almanac_tour_completed: 'true',
  almanac_email_gate_passed_v1: 'true',
  the_casino_almanac_v7: [{
    id: 'smoke1', name: 'Smoke Casino', url: 'https://smoke.example', tier: 'A', dailySC: 0.5,
    speedHours: 24, reliability: 90, hasLive: false, minRedeem: '50 SC', notes: '', referralUrl: '',
    cooldownHours: 24, lastCollected: 0
  }]
};

const PRO_ANSWER = {
  data: [{ tier: 'pro', status: 'active', current_period_end: '2099-01-01T00:00:00Z', cancel_at_period_end: false, is_pro_active: true }],
  error: null
};

const signedIn = page => page.waitFor(() => !!localStorage.getItem('__smokeSession'));
const byType = (calls, type, name) => calls.filter(c => c.type === type && (!name || c.name === name || c.table === name || c.method === name));
const op = (call, name) => (call.chain.find(c => c[0] === name) || [null, null])[1];

const TESTS = [
  ['boots signed in anonymously, and reports app_open', async page => {
    await page.goto('/');
    await signedIn(page);
    await page.waitFor(() => document.querySelectorAll('.ledger-card').length === 1);
    await page.evaluate(() => flushAnalytics());
    const calls = await page.calls();
    expect(byType(calls, 'auth', 'signInAnonymously').length, 1, 'one anonymous sign-in');
    const events = byType(calls, 'from', 'app_events').flatMap(c => op(c, 'insert')[0]);
    expect(events.some(e => e.name === 'app_open' && e.user_id === SMOKE_USER), true, 'app_open recorded for the signed-in user');
  }],

  ['never signs a crawler in', async page => {
    await page.goto('/');
    await page.waitFor(() => document.querySelectorAll('.ledger-card').length === 1);
    await page.evaluate(() => Promise.all([kickSync(), flushSyncOutbox(), syncUserEntitlements()]));
    await new Promise(r => setTimeout(r, 500));
    expect(byType(await page.calls(), 'auth', 'signInAnonymously').length, 0, 'no anonymous sign-in');
  }, { userAgent: GOOGLEBOT }],

  ['never signs a headless browser in', async page => {
    await page.goto('/');
    await page.waitFor(() => document.querySelectorAll('.ledger-card').length === 1);
    await page.evaluate(() => Promise.all([kickSync(), flushSyncOutbox(), syncUserEntitlements()]));
    await new Promise(r => setTimeout(r, 500));
    expect(byType(await page.calls(), 'auth', 'signInAnonymously').length, 0, 'no anonymous sign-in');
  }, { userAgent: HEADLESS }],

  ['never signs automation in, whatever it calls itself', async page => {
    await page.goto('/');
    await page.waitFor(() => document.querySelectorAll('.ledger-card').length === 1);
    await page.evaluate(() => Promise.all([kickSync(), flushSyncOutbox(), syncUserEntitlements()]));
    await new Promise(r => setTimeout(r, 500));
    expect(await page.evaluate(() => navigator.webdriver), true, 'test set navigator.webdriver');
    expect(byType(await page.calls(), 'auth', 'signInAnonymously').length, 0, 'no anonymous sign-in');
  }, { webdriver: true }],

  ['syncs a collection and the deck', async page => {
    await page.goto('/');
    await signedIn(page);
    await page.evaluate(() => { markCollected('smoke1'); return flushSyncOutbox(); });
    await page.evaluate(() => syncTrackedGamesSnapshot());
    const calls = await page.calls();
    const rows = byType(calls, 'from', 'collection_events').filter(c => op(c, 'upsert')).flatMap(c => op(c, 'upsert')[0]);
    expect(rows.some(r => r.platform_name === 'Smoke Casino' && r.user_id === SMOKE_USER && r.deleted === false), true, 'collection upserted for the user');
    const decks = byType(calls, 'from', 'tracked_games_snapshot').filter(c => op(c, 'upsert'));
    expect(decks.some(c => op(c, 'upsert')[0].games.some(g => g.id === 'smoke1' && g.lastCollected > 0)), true, 'deck snapshot carries the collection');
    expect(await page.evaluate(() => loadSyncOutbox().length), 0, 'outbox emptied');
  }],

  ['starts annual checkout with the price and lands on the returned URL', async page => {
    await page.goto('/');
    await signedIn(page);
    const annualPriceId = await page.evaluate(() => PRO_ANNUAL_PRICE_ID);
    const landed = page.waitForEvent('Page.loadEventFired');
    await page.evaluate(() => { initiateProCheckout(PRO_ANNUAL_PRICE_ID); });
    await landed;
    const calls = await page.calls();
    const invoke = byType(calls, 'invoke', 'create-checkout-session')[0];
    const annual = await page.evaluate(() => location.search);
    expect(!!invoke, true, 'checkout function invoked');
    expect(invoke && invoke.body.priceId, annualPriceId, 'annual price sent');
    expect(invoke && typeof invoke.body.returnUrl === 'string' && invoke.body.returnUrl.startsWith(page.origin), true, 'return URL is this origin');
    expect(annual, '?checkout=smoke', 'redirected to the checkout URL');
    const events = byType(calls, 'from', 'app_events').flatMap(c => op(c, 'insert')[0]);
    expect(events.some(e => e.name === 'checkout_started' && e.props.plan === 'annual'), true, 'checkout_started sent before leaving');
  }, { answers: { 'invoke:create-checkout-session': { data: { url: '/platforms/index.html?checkout=smoke' }, error: null } } }],

  ['unlocks Pro rules from the entitlement', async page => {
    await page.goto('/');
    await signedIn(page);
    await page.waitFor(() => clientEntitlements.isPro === true);
    const cache = await page.evaluate(() => JSON.parse(localStorage.getItem('almanac_pro_cache_v1')));
    expect(cache && cache.uid, SMOKE_USER, 'Pro cached for this account');
    expect(await page.evaluate(() => alertRulesActive()), true, 'alert rules active');
  }, { answers: { 'rpc:get_my_entitlement': PRO_ANSWER } }],

  ['turns background push on and off', async page => {
    await page.goto('/');
    await signedIn(page);
    await page.evaluate(() => toggleBackgroundPush(true));
    let calls = await page.calls();
    expect(byType(calls, 'push', 'subscribe').length, 1, 'browser subscribed');
    const upsert = byType(calls, 'from', 'push_subscriptions').find(c => op(c, 'upsert'));
    const row = upsert && op(upsert, 'upsert')[0];
    expect(row && row.endpoint, 'https://fcm.googleapis.com/fcm/send/smoke-endpoint', 'subscription stored');
    expect(row && row.user_id === SMOKE_USER && Array.isArray(row.schedule), true, 'with the user and a schedule');
    expect(await page.evaluate(() => isPushEnabled()), true, 'push marked on');
    await page.evaluate(() => toggleBackgroundPush(false));
    calls = await page.calls();
    const removed = byType(calls, 'from', 'push_subscriptions').find(c => op(c, 'delete'));
    expect(!!removed && op(removed, 'eq')[1], 'https://fcm.googleapis.com/fcm/send/smoke-endpoint', 'subscription row deleted');
    expect(byType(calls, 'push', 'unsubscribe').length, 1, 'browser unsubscribed');
  }, { answers: { 'invoke:web-push': { data: { publicKey: 'BEl62iUYgUivxIkv69yViEuiBIa-Ib9-SkvMeAtA3LFgDzkrxZJjSgSnfckjBJuBkr3qBUYIHBQFLXYp5Nksh8U' }, error: null } } }],

  ['turns new-drop alerts on for the platforms tracked', async page => {
    await page.goto('/');
    await signedIn(page);
    await page.evaluate(() => toggleBackgroundPush(true));
    await page.evaluate(() => toggleDropAlerts(true));
    const upserts = byType(await page.calls(), 'from', 'push_subscriptions').filter(c => op(c, 'upsert'));
    const row = upserts.length && op(upserts[upserts.length - 1], 'upsert')[0];
    expect(row && row.drop_alerts, true, 'drop alerts stored');
    expect(row && row.drop_keys, ['name:smokecasino', 'site:smoke.example'], 'with the tracked platform\'s keys');
    const state = await page.evaluate(() => window.AlmanacDB.get('drop_alerts'));
    expect(state && state.on && state.keys.length === 2 && state.since > 0 && /supabase\.co$/.test(state.url), true, 'service worker copy written');
    await page.evaluate(() => toggleBackgroundPush(false));
    expect(await page.evaluate(() => isDropAlertsEnabled()), false, 'off with background alerts');
  }, { answers: { 'invoke:web-push': { data: { publicKey: 'BEl62iUYgUivxIkv69yViEuiBIa-Ib9-SkvMeAtA3LFgDzkrxZJjSgSnfckjBJuBkr3qBUYIHBQFLXYp5Nksh8U' }, error: null } } }],

  ['does not opt in to drop alerts until this device has saved what to look for', async page => {
    await page.goto('/');
    await signedIn(page);
    await page.evaluate(() => toggleBackgroundPush(true));
    await page.evaluate(() => {
      const realSet = window.__realSet = window.AlmanacDB.set;
      window.AlmanacDB.set = (key, value) => (key === 'drop_alerts' ? Promise.reject(new Error('quota')) : realSet(key, value));
      return toggleDropAlerts(true);
    });
    const upserts = byType(await page.calls(), 'from', 'push_subscriptions').filter(c => op(c, 'upsert'));
    const row = op(upserts[upserts.length - 1], 'upsert')[0];
    expect([row.drop_alerts, row.drop_keys], [false, []], 'server not told to send drops');
    expect(await page.evaluate(() => document.getElementById('toastMsg').textContent.startsWith("Drop alerts couldn't be set up")), true, 'says it is not set up yet');
    await page.evaluate(() => flushAnalytics());
    const events = byType(await page.calls(), 'from', 'app_events').flatMap(c => op(c, 'insert')[0]);
    expect(events.some(e => e.name === 'drop_alerts_enabled'), false, 'not counted as turned on');
    // Once saving works again, the next ordinary sync opts in.
    await page.evaluate(() => {
      window.AlmanacDB.set = window.__realSet;
      return syncPushSchedule(false);
    });
    const later = byType(await page.calls(), 'from', 'push_subscriptions').filter(c => op(c, 'upsert'));
    const retried = op(later[later.length - 1], 'upsert')[0];
    expect(later.length > upserts.length && retried.drop_alerts, true, 'retried and opted in');
  }, { answers: { 'invoke:web-push': { data: { publicKey: 'BEl62iUYgUivxIkv69yViEuiBIa-Ib9-SkvMeAtA3LFgDzkrxZJjSgSnfckjBJuBkr3qBUYIHBQFLXYp5Nksh8U' }, error: null } } }],

  ['keeps alert uploads working on a server without drop alerts', async page => {
    await page.goto('/');
    await signedIn(page);
    await page.evaluate(() => toggleBackgroundPush(true));
    await page.evaluate(() => toggleDropAlerts(true));
    const upserts = byType(await page.calls(), 'from', 'push_subscriptions').filter(c => op(c, 'upsert')).map(c => op(c, 'upsert')[0]);
    expect('drop_alerts' in upserts[0], true, 'first upload tried the new columns');
    expect(upserts.slice(1).every(row => !('drop_alerts' in row) && !('drop_keys' in row)), true, 'later uploads leave them out');
    expect(await page.evaluate(() => isDropAlertsEnabled()), false, 'drop alerts switched back off');
    expect(await page.evaluate(() => document.getElementById('toastMsg').textContent.includes("aren't switched on")), true, 'says why');
  }, { answers: {
    'invoke:web-push': { data: { publicKey: 'BEl62iUYgUivxIkv69yViEuiBIa-Ib9-SkvMeAtA3LFgDzkrxZJjSgSnfckjBJuBkr3qBUYIHBQFLXYp5Nksh8U' }, error: null },
    'from:push_subscriptions': { data: null, error: { code: 'PGRST204', message: "Could not find the 'drop_alerts' column of 'push_subscriptions' in the schema cache" } }
  } }],

  ['opens the Freebies tab from a drop alert', async page => {
    await page.goto('/?open=freebies');
    await page.waitFor(() => document.getElementById('viewFreebies').style.display === 'block');
    expect(await page.evaluate(() => location.search), '', 'link parameter removed');
    expect(await page.evaluate(() => document.getElementById('tabFreebies').classList.contains('active')), true, 'tab marked active');
  }],

  ['admin: reads a screenshot into the form and alerts once', async page => {
    await page.goto('/admin/freebies.html');
    await page.waitFor(() => document.getElementById('adminApp').style.display === '');
    await page.evaluate(() => {
      document.getElementById('shotLinks').value = 'See https://cdn.discordapp.com/attachments/1/2/shot.png?ex=1&hm=2.';
      return readScreenshots();
    });
    let calls = await page.calls();
    const read = byType(calls, 'invoke', 'read-drop')[0];
    expect(read && read.body.images, [{ url: 'https://cdn.discordapp.com/attachments/1/2/shot.png?ex=1&hm=2' }], 'image link sent, trailing punctuation dropped');
    expect(read && read.body.platforms.includes('McLuck') && typeof read.body.tz === 'string', true, 'catalogue names and time zone sent');
    expect(await page.evaluate(() => document.getElementById('shotStatus').textContent), 'Found 1 offer. (about 1.8\u00a2)', 'result and cost shown');
    await page.evaluate(() => loadShotIntoForm(0));
    const form = await page.evaluate(() => ({
      platform: document.getElementById('fPlatform').value,
      code: document.getElementById('fCode').value,
      url: document.getElementById('fClaimUrl').value,
      terms: document.getElementById('fTerms').value,
      notify: document.getElementById('fNotify').checked
    }));
    expect(form, { platform: 'McLuck', code: 'LUCKY5', url: 'https://www.mcluck.com/promo', terms: '5 SC · New players only', notify: false }, 'draft loaded, tracking stripped, alerting left to a deliberate tick');
    await page.evaluate(() => loadEntries().then(() => announceEntry('11111111-1111-1111-1111-111111111111')));
    calls = await page.calls();
    expect(byType(calls, 'invoke', 'web-push').map(c => c.body), [{ announce: '11111111-1111-1111-1111-111111111111' }], 'announced by id');
    expect(await page.evaluate(() => document.getElementById('statusMsg').textContent), 'Alerted 2 of 3 devices tracking McLuck.', 'reports the reach');
  }, {
    localStorage: { __smokeSession: { access_token: 'admin-token', user: { id: 'admin-1', email: 'johndopamine210@gmail.com' } } },
    answers: {
      'invoke:read-drop': { data: { drops: [{
        platform_name: 'McLuck Casino', catalog_match: 'McLuck', bucket: 'A_code', code: 'LUCKY5',
        claim_url: 'https://www.mcluck.com/promo?utm_source=discord', root_domain: 'mcluck.com', reward: '5 SC',
        expires_at: null, terms: 'New players only', is_account_tied: false, confidence: 'high', evidence: 'Use LUCKY5 for 5 SC'
      }], unreadable: null, usage: { input_tokens: 2100, output_tokens: 300 } }, error: null },
      'invoke:web-push': { data: { matched: 3, sent: 2, removed: 1, failed: 0 }, error: null },
      'from:public_freebies': { data: [{ id: '11111111-1111-1111-1111-111111111111', platform_name: 'McLuck', bucket: 'A_code', active: true, announced_at: null }], error: null }
    }
  }],

  ['deletes the cloud account and stops syncing', async page => {
    await page.goto('/');
    await signedIn(page);
    await page.evaluate(() => deleteMyCloudData());
    const calls = await page.calls();
    expect(byType(calls, 'rpc', 'delete_my_account').length, 1, 'deletion requested');
    expect(byType(calls, 'auth', 'signOut').map(c => c.args && c.args.scope), ['local'], 'signed out locally');
    expect(await page.evaluate(() => isSyncEnabled()), false, 'Cloud Sync off');
    expect(await page.evaluate(() => document.querySelectorAll('.ledger-card').length), 1, 'local deck kept');
    await page.evaluate(() => kickSync());
    await new Promise(r => setTimeout(r, 300));
    expect(byType(await page.calls(), 'auth', 'signInAnonymously').length, 1, 'no new account made afterwards');
  }],

  ['sync work queued before a deletion does not make a new account', async page => {
    await page.goto('/');
    await signedIn(page);
    // Hold the sign-in queue with a background pull waiting in it, then
    // delete: the pull must not sign in again once it gets its turn.
    await page.evaluate(() => {
      window.__queued = null;
      signInQueue = signInQueue.then(() => new Promise(release => { window.__release = release; }));
      window.__queued = pullAndReplay();
    });
    await page.waitFor(() => typeof window.__release === 'function');
    await page.evaluate(() => deleteMyCloudData());
    await page.evaluate(() => { window.__release(); return window.__queued; });
    await page.evaluate(() => signInQueue);
    expect(byType(await page.calls(), 'auth', 'signInAnonymously').length, 1, 'no replacement account');
  }],

  ['refuses deletion while Pro is running, and keeps syncing', async page => {
    await page.goto('/');
    await signedIn(page);
    await page.evaluate(() => deleteMyCloudData());
    const calls = await page.calls();
    expect(byType(calls, 'auth', 'signOut').length, 0, 'still signed in');
    expect(await page.evaluate(() => isSyncEnabled()), true, 'Cloud Sync still on');
    expect(await page.evaluate(() => document.getElementById('toastMsg').textContent.startsWith('Cancel your Pro subscription')), true, 'explains what to do');
  }, { answers: { 'rpc:delete_my_account': { data: null, error: { message: 'ACTIVE_SUBSCRIPTION: cancel the Pro subscription first' } } } }]
];

function expect(actual, expected, label) {
  if (JSON.stringify(actual) !== JSON.stringify(expected)) {
    throw new Error(`${label}: got ${JSON.stringify(actual)}, expected ${JSON.stringify(expected)}`);
  }
}

async function main() {
  const server = await startServer();
  const origin = `http://127.0.0.1:${server.address().port}`;
  const chrome = await launchChrome();
  let conn;
  let passed = 0;
  try {
    conn = await Connection.open(chrome.wsUrl);
    for (const [name, run, options = {}] of TESTS) {
      const page = await new Page(conn, origin).open({
        userAgent: options.userAgent,
        config: { localStorage: options.localStorage || SEED, answers: options.answers || {}, webdriver: !!options.webdriver }
      });
      try {
        await run(page);
        if (page.errors.length) throw new Error(`page errors: ${page.errors.join(' | ')}`);
        passed++;
        console.log(`ok    ${name}`);
      } catch (error) {
        console.log(`FAIL  ${name}\n      ${error.message}`);
      } finally {
        await page.close();
      }
    }
  } finally {
    if (conn) conn.ws.close();
    chrome.proc.kill();
    server.close();
    try { fs.rmSync(chrome.profile, { recursive: true, force: true }); } catch (e) { /* best effort */ }
  }
  console.log(`\nSmoke tests: ${passed} passed, ${TESTS.length - passed} failed.`);
  process.exit(passed === TESTS.length ? 0 : 1);
}

main().catch(error => {
  console.error(error.stack || error.message);
  process.exit(1);
});
