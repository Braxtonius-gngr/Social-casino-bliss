// The intro lab: open the shot at phone size, seek, and screenshot.
// node lab.js '{"game":"blackjack","tier":"standard","seed":7,"times":[0,1,2],"out":"std","w":390,"h":844}'
const { chromium } = require('/opt/npm-tools/node_modules/playwright');
// (the preview server: started here if it is not up - a resumed session
// does not keep the processes of the last one)
const http = require('http'), { spawn } = require('child_process');
const up = () => new Promise(res => { const r = http.get('http://localhost:8765/index.html', x => { x.resume(); res(x.statusCode === 200); }); r.on('error', () => res(false)); r.setTimeout(2000, () => { r.destroy(); res(false); }); });
const ensureServer = async () => {
  if (await up()) return;
  spawn('python3', ['-m', 'http.server', '8765', '--bind', '127.0.0.1'], { cwd: '/home/claude/social-casino-bliss', detached: true, stdio: 'ignore' }).unref();
  for (let k = 0; k < 40; k++) { await new Promise(r => setTimeout(r, 250)); if (await up()) return; }
  throw new Error('preview server would not start');
};
(async () => {
  await ensureServer();
  const o = Object.assign({ game: 'blackjack', tier: 'standard', seed: 7, times: [], out: 'shot', w: 390, h: 844, dpr: 1, evals: [], extra: '' }, JSON.parse(process.argv[2] || '{}'));
  const b = await chromium.launch({ executablePath: '/opt/pw-browsers/chromium-1194/chrome-linux/chrome', args: ['--no-sandbox', '--use-gl=angle', '--use-angle=swiftshader', '--enable-unsafe-swiftshader', '--ignore-gpu-blocklist'] });
  const ctx = await b.newContext({ viewport: { width: o.w, height: o.h }, deviceScaleFactor: o.dpr, isMobile: o.w < o.h, hasTouch: true, serviceWorkers: 'block' });
  await ctx.route('**/*', r => { const u = r.request().url(); if (u.startsWith('http://localhost:8765/')) r.continue(); else r.abort(); });
  await ctx.addInitScript(() => {
    const st = window.setTimeout;
    window.setTimeout = (f, ms, ...a) => st(f, (ms === 6000 || ms === 15000) ? ms * 20 : ms, ...a);
    const ls = { almanac_show_landing: 'true', almanac_email_gate_passed_v1: 'true', almanac_tour_completed: 'true', almanac_skin_rxr_v1: 'done', almanac_intro_sound: 'off', almanac_intro_sound_on_v1: 'done', almanac_motion_v1: 'on', almanac_sync_enabled_v1: 'false' };
    try { Object.entries(ls).forEach(([k, v]) => localStorage.setItem(k, v)); } catch (e) {}
  });
  const page = await ctx.newPage();
  const logs = [];
  page.on('console', m => { if (m.type() === 'error' || m.type() === 'warning') logs.push(m.type() + ': ' + m.text()); });
  page.on('pageerror', e => logs.push('pageerror: ' + e.message));
  const url = `http://localhost:8765/index.html?lab&game=${o.game}&tier=${o.tier}&seed=${o.seed}&quality=low&dest=none${o.extra}`;
  await page.goto(url);
  try { await page.waitForFunction(() => window.rollIntroStill && window.rollIntroPlan, null, { timeout: 500000 }); }
  catch (e) { console.log('NOT READY'); console.log(logs.join('\n')); await b.close(); process.exit(1); }
  await page.addStyleTag({ content: '.r3-loader{display:none!important}' });
  const plan = await page.evaluate(() => JSON.parse(JSON.stringify(window.rollIntroPlan)));
  console.log(JSON.stringify(plan));
  for (const ev of o.evals) console.log('EVAL', ev, JSON.stringify(await page.evaluate(ev)));
  const M = plan.moments || {};
  const resolve = t => typeof t === 'number' ? t : +(Function('m', 'with (m) { return ' + t + '; }')(Object.assign({ reveal: plan.revealReal, total: plan.totalReal }, M))).toFixed(3);
  for (const t0 of o.times) {
    const t = resolve(t0);
    await page.evaluate(t => window.rollIntroStill(t), t);
    await page.waitForTimeout(o.wait || 60);
    await page.screenshot({ path: `${o.out}-${String(o.times.indexOf(t0)).padStart(2, '0')}.png`, timeout: 150000 }); console.log('SHOT', o.times.indexOf(t0), t0, t);
  }
  if (logs.length) console.log('LOGS\n' + logs.slice(0, 30).join('\n'));
  await b.close();
})();
