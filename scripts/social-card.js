/*
 * The weekly tier-list card: a picture of the week's biggest moves, for the
 * channels that need one (Instagram, Pinterest, TikTok) and the ones that do
 * better with one. It's drawn as HTML in the site's own colours and
 * photographed by headless Chrome, so it needs no image library. GitHub's
 * Ubuntu runners have Chrome; CHROME_PATH picks another one.
 *
 * Two sizes: portrait (1080x1350, 4:5 for feeds) and tall (1080x1920, 9:16
 * for TikTok).
 */

const fs = require('fs');
const os = require('os');
const path = require('path');
const { spawn } = require('child_process');
const { pathToFileURL } = require('url');

// rows is the most a card tries; fitRows() drops any that don't fit whole.
const SIZES = { portrait: { width: 1080, height: 1350, rows: 6 }, tall: { width: 1080, height: 1920, rows: 10 } };
// The app's default skin (assets/app.css --tier-*): light tiers take dark text.
const TIER = {
  S: ['#D4AF37', '#050507'], A: ['#E3E4E5', '#050507'], B: ['#CD7F32', '#050507'],
  C: ['#8A8D93', '#050507'], D: ['#5A5D63', '#F8F9FA'], F: ['#8B4A4A', '#F8F9FA']
};

// The same lookup as scripts/smoke-test.js.
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

const escape = (s) => String(s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');

function badge(tier) {
  const [bg, fg] = TIER[tier] || ['#2A2B30', '#F8F9FA'];
  return `<span class="badge" style="background:${bg};color:${fg}">${escape(tier || '?')}</span>`;
}

// Tier moves first, then new rankings: the rows people stop scrolling for.
function cardRows(groups) {
  const rows = [];
  for (const c of groups.up || []) rows.push({ name: c.name, mark: 'up', from: c.from.tier, to: c.to.tier });
  for (const c of groups.down || []) rows.push({ name: c.name, mark: 'down', from: c.from.tier, to: c.to.tier });
  for (const c of groups.newlyRanked || []) rows.push({ name: c.name, mark: 'new', to: c.to.tier });
  return rows;
}

function cardHtml({ groups, range, size }) {
  const { width, height, rows: limit } = SIZES[size];
  const all = cardRows(groups);
  const total = Object.values(groups).reduce((n, list) => n + list.length, 0);
  const shown = all.slice(0, limit);
  const more = total - shown.length;
  const row = (r) => {
    const label = r.mark === 'up' ? '<span class="mark up">▲ UP</span>'
      : r.mark === 'down' ? '<span class="mark down">▼ DOWN</span>'
        : '<span class="mark new">NEW</span>';
    const tiers = r.from ? `${badge(r.from)}<span class="arrow">→</span>${badge(r.to)}` : badge(r.to);
    return `<li>${label}<span class="name">${escape(r.name)}</span><span class="tiers">${tiers}</span></li>`;
  };
  return `<!doctype html>
<html><head><meta charset="utf-8"><style>
  * { box-sizing: border-box; }
  html, body { margin: 0; width: ${width}px; height: ${height}px; overflow: hidden; }
  body { background: #050507; color: #F8F9FA; font-family: system-ui, -apple-system, "Segoe UI", "DejaVu Sans", sans-serif;
    display: flex; flex-direction: column; padding: 80px 72px 72px;
    background-image: radial-gradient(circle at 85% 0%, rgba(212,175,55,0.18), transparent 55%); }
  .brand { color: #D4AF37; font-size: 30px; font-weight: 700; letter-spacing: 0.22em; }
  h1 { font-size: 76px; line-height: 1.05; margin: 28px 0 12px; font-weight: 800; }
  .range { color: #8A8D93; font-size: 36px; margin: 0 0 48px; }
  ul { list-style: none; margin: 0; padding: 0; display: flex; flex-direction: column; gap: 16px; min-height: 0; overflow: hidden; }
  li { flex: none; display: flex; align-items: center; gap: 24px; padding: 18px 26px; border: 2px solid rgba(255,255,255,0.08);
    border-radius: 20px; background: rgba(255,255,255,0.03); }
  .mark { flex: 0 0 150px; font-size: 26px; font-weight: 800; letter-spacing: 0.06em; }
  .up { color: #3D8767; } .down { color: #C0504D; } .new { color: #D4AF37; }
  .name { flex: 1; min-width: 0; font-size: 42px; font-weight: 650; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }
  .tiers { display: flex; align-items: center; gap: 14px; }
  .badge { display: inline-flex; align-items: center; justify-content: center; width: 72px; height: 72px; border-radius: 16px;
    font-size: 42px; font-weight: 800; }
  .arrow { color: #8A8D93; font-size: 40px; }
  .more { color: #8A8D93; font-size: 34px; margin: 28px 4px 0; }
  .empty { color: #8A8D93; font-size: 40px; }
  footer { margin-top: auto; padding-top: 32px; display: flex; justify-content: space-between; align-items: flex-end; gap: 24px; }
  .site { color: #D4AF37; font-size: 40px; font-weight: 700; }
  .what { color: #8A8D93; font-size: 26px; margin-top: 8px; }
  .age { color: #8A8D93; font-size: 26px; text-align: right; }
</style></head><body>
  <div class="brand">DAILY ROLL OVER</div>
  <h1>Sweeps tier list:<br>what changed</h1>
  <p class="range">${escape(range)}</p>
  ${shown.length ? `<ul>${shown.map(row).join('')}</ul>` : '<p class="empty">No tier moves this week.</p>'}
  <p class="more" data-more="${more}"></p>
  <footer>
    <div><div class="site">dailyrollover.com</div><div class="what">Tier = days of free dailies to cash out</div></div>
    <div class="age">18+<br>Not available in every state</div>
  </footer>
  <script>
    // Called once fonts are in: drops rows that don't fit whole and counts them in the "more" line.
    window.fitRows = function () {
      var list = document.querySelector('ul');
      var more = document.querySelector('.more');
      var count = Number(more.dataset.more);
      while (list && list.children.length > 1 && list.scrollHeight > list.clientHeight) {
        list.lastElementChild.remove();
        count++;
      }
      more.textContent = count > 0 ? '+' + count + ' more change' + (count === 1 ? '' : 's') + ' on the full list' : '';
    };
  </script>
</body></html>`;
}

// Headless Chrome over --remote-debugging-pipe: JSON messages ending in a NUL
// byte, written to its fd 3 and read from its fd 4. Its --screenshot flag
// can't be used: it counts the hidden window frame in --window-size, so the
// page comes out about 85px short.
function openChrome(chrome, profileDir) {
  const proc = spawn(chrome, [
    '--headless=new', '--no-sandbox', '--disable-gpu', '--disable-dev-shm-usage', '--no-first-run',
    '--no-default-browser-check', '--disable-extensions', '--hide-scrollbars',
    '--disable-background-networking', '--disable-component-update',
    `--user-data-dir=${profileDir}`, '--remote-debugging-pipe', 'about:blank'
  ], { stdio: ['ignore', 'ignore', 'pipe', 'pipe', 'pipe'] });
  const waiting = new Map();
  const events = [];
  let nextId = 1;
  let buffer = '';
  let stderr = '';
  proc.stderr.on('data', (chunk) => { stderr = (stderr + chunk).slice(-2000); });
  // A Chrome that won't start, or dies mid-write, ends in "Chrome exited" below, not a crash.
  proc.on('error', (error) => { stderr += error.message; });
  proc.stdio[3].on('error', () => {});
  proc.stdio[4].setEncoding('utf8');
  proc.stdio[4].on('data', (chunk) => {
    buffer += chunk;
    let end;
    while ((end = buffer.indexOf('\0')) >= 0) {
      const message = JSON.parse(buffer.slice(0, end));
      buffer = buffer.slice(end + 1);
      const pending = message.id && waiting.get(message.id);
      if (pending) {
        waiting.delete(message.id);
        if (message.error) pending.reject(new Error(`${pending.method}: ${message.error.message}`));
        else pending.resolve(message.result);
      } else {
        events.forEach((fn) => fn(message));
      }
    }
  });
  const exited = new Promise((resolve) => { proc.on('exit', resolve); proc.on('error', resolve); });
  exited.then(() => {
    for (const pending of waiting.values()) pending.reject(new Error(`Chrome exited. ${stderr.trim()}`));
    waiting.clear();
  });
  const send = (method, params = {}, sessionId) => new Promise((resolve, reject) => {
    const id = nextId++;
    waiting.set(id, { resolve, reject, method });
    proc.stdio[3].write(JSON.stringify(sessionId ? { id, method, params, sessionId } : { id, method, params }) + '\0');
  });
  const once = (method, sessionId) => new Promise((resolve) => {
    const fn = (message) => {
      if (message.method === method && message.sessionId === sessionId) {
        events.splice(events.indexOf(fn), 1);
        resolve(message.params);
      }
    };
    events.push(fn);
  });
  // Resolves once Chrome has exited, so its profile folder can be deleted.
  const close = async () => {
    send('Browser.close').catch(() => { /* already gone */ });
    const force = setTimeout(() => proc.kill('SIGKILL'), 5000);
    await exited;
    clearTimeout(force);
  };
  return { send, once, close };
}

async function screenshot(browser, url, width, height) {
  const { targetId } = await browser.send('Target.createTarget', { url: 'about:blank' });
  const { sessionId } = await browser.send('Target.attachToTarget', { targetId, flatten: true });
  await browser.send('Page.enable', {}, sessionId);
  await browser.send('Emulation.setDeviceMetricsOverride', { width, height, deviceScaleFactor: 1, mobile: false }, sessionId);
  const loaded = browser.once('Page.loadEventFired', sessionId);
  await browser.send('Page.navigate', { url }, sessionId);
  await loaded;
  await browser.send('Runtime.evaluate', { expression: 'document.fonts.ready.then(() => window.fitRows())', awaitPromise: true }, sessionId);
  const { data } = await browser.send('Page.captureScreenshot', {
    format: 'png', clip: { x: 0, y: 0, width, height, scale: 1 }
  }, sessionId);
  await browser.send('Target.closeTarget', { targetId });
  return Buffer.from(data, 'base64');
}

const withTimeout = (promise, ms, what) => Promise.race([
  promise,
  new Promise((resolve, reject) => setTimeout(() => reject(new Error(`${what} took over ${ms / 1000}s.`)), ms).unref())
]);

// Writes tier-card-<size>.png for each size into outDir and resolves to their paths.
async function renderCards({ groups, range, outDir }) {
  const chrome = findChrome();
  fs.mkdirSync(outDir, { recursive: true });
  const work = fs.mkdtempSync(path.join(os.tmpdir(), 'tier-card-'));
  const browser = openChrome(chrome, path.join(work, 'profile'));
  const files = {};
  try {
    for (const [size, { width, height }] of Object.entries(SIZES)) {
      const html = path.join(work, `${size}.html`);
      const png = path.resolve(outDir, `tier-card-${size}.png`);
      fs.writeFileSync(html, cardHtml({ groups, range, size }));
      fs.writeFileSync(png, await withTimeout(screenshot(browser, pathToFileURL(html).href, width, height), 60000, `The ${size} card`));
      files[size] = png;
    }
  } finally {
    await browser.close();
    fs.rmSync(work, { recursive: true, force: true, maxRetries: 3 });
  }
  return files;
}

module.exports = { SIZES, cardHtml, renderCards };
