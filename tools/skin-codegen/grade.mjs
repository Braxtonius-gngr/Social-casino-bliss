// Programmatic grader: renders generated { html, css, js } in headless
// Chromium and checks it against the case spec. No model calls, so a grade
// is deterministic apart from the measured frame timing.
import { chromium } from 'playwright-core';

const CHROME = process.env.CHROME_PATH || '/opt/pw-browsers/chromium-1194/chrome-linux/chrome';
// Budget for one frame at 60 Hz. A frame interval above 1.5x this means the
// page missed a frame.
const FRAME_MS = 1000 / 60;
const DROP_MS = FRAME_MS * 1.5;
// Measured under a 4x CPU slowdown, the cheap-phone stand-in.
const CPU_SLOWDOWN = 4;
const COMPOSITOR_PROPS = new Set(['transform', 'translate', 'rotate', 'scale', 'opacity']);

let browserPromise = null;
export function browser() {
  browserPromise ??= chromium.launch({ executablePath: CHROME, args: ['--disable-gpu-vsync-throttling'] });
  return browserPromise;
}
export async function closeBrowser() {
  if (browserPromise) await (await browserPromise).close();
  browserPromise = null;
}

// Frame timing is measured one case at a time, so parallel grading can't
// steal CPU from the page being measured.
let frameLock = Promise.resolve();
function exclusive(fn) {
  const run = frameLock.then(fn, fn);
  frameLock = run.catch(() => {});
  return run;
}

// A standalone page for the report and for looking at an output by hand.
// Built the same way as the graded page; closing tags in the output are
// escaped so they can't end the surrounding element.
export function previewHtml(spec, out) {
  const esc = (s, tag) => String(s ?? '').replace(new RegExp(`</(${tag})`, 'gi'), '<\\/$1');
  const bg = spec.canvas.background || '#000';
  return `<!doctype html><html><head><meta charset="utf-8"><title>${spec.id}</title><style>
html,body{margin:0;background:${bg}}
#stage{position:relative;left:20px;top:20px;width:${spec.canvas.width}px;height:${spec.canvas.height}px;outline:1px dashed rgba(255,255,255,.25)}
</style><style>${esc(out.css, 'style')}</style></head><body><div id="stage">${out.html ?? ''}</div>
<script>${esc(out.js, 'script')}</script></body></html>
`;
}

function resolveTokens(value, tokens) {
  return String(value).replace(/\{([\w.-]+)\}/g, (m, k) => (k in (tokens ?? {}) ? tokens[k] : m));
}

// One fresh page per phase so an earlier phase's pausing or seeking can't
// leak into the next.
async function renderPage(spec, out) {
  const b = await browser();
  // Headless Chromium throttles frames in very small windows (under about
  // 90px tall), so the window never shrinks below 320x240.
  const page = await b.newPage({ viewport: { width: Math.max(320, spec.canvas.width + 40), height: Math.max(240, spec.canvas.height + 40) } });
  const errors = [];
  page.on('pageerror', (e) => errors.push(`script: ${e.message}`));
  page.on('console', (m) => { if (m.type() === 'error') errors.push(`console: ${m.text()}`); });
  const bg = spec.canvas.background || '#000';
  await page.setContent(`<!doctype html><html><head><meta charset="utf-8"><style>
    html,body{margin:0;background:${bg}}
    #stage{position:relative;left:20px;top:20px;width:${spec.canvas.width}px;height:${spec.canvas.height}px;overflow:visible}
    #probe{position:absolute;visibility:hidden;left:-9999px;top:0}
  </style></head><body><div id="stage"></div><div id="probe"></div></body></html>`);
  // Inserted as data, never string-spliced into the page, so a stray
  // </style> or </script> in the output can't break the harness.
  await page.evaluate(({ html }) => { document.getElementById('stage').innerHTML = html; }, { html: out.html ?? '' });
  if (out.css) await page.addStyleTag({ content: out.css });
  if (out.js) { try { await page.addScriptTag({ content: out.js }); } catch (e) { errors.push(`script: ${e.message}`); } }
  await page.waitForTimeout(50);
  return { page, errors };
}

export async function grade(spec, out) {
  const tokens = spec.tokens ?? {};
  const parts = [{ name: 'root', ...spec.component.root }, ...(spec.component.parts ?? [])];
  const explanation = {};
  const perf = {};

  // --- Phase 1: syntax, animation inventory -------------------------------
  let { page, errors } = await renderPage(spec, out);
  const inv = await page.evaluate(({ names }) => {
    const stage = document.getElementById('stage');
    const missing = names.filter((n) => !stage.querySelector(`[data-part="${n}"]`));
    let cssRules = 0;
    for (const s of document.styleSheets) { try { cssRules += s.cssRules.length; } catch {} }
    const anims = document.getAnimations().map((a) => {
      const eff = a.effect;
      const t = eff?.getTiming?.() ?? {};
      const kfs = eff?.getKeyframes?.() ?? [];
      const host = eff?.target;
      const part = host?.closest?.('[data-part]')?.dataset.part ?? null;
      const props = new Set();
      for (const k of kfs) for (const p of Object.keys(k))
        if (!['offset', 'computedOffset', 'easing', 'composite'].includes(p)) props.add(p);
      const easing = t.easing && t.easing !== 'linear' ? t.easing : (kfs.find((k) => k.easing && k.easing !== 'linear')?.easing ?? 'linear');
      return { part, duration: Number(t.duration) || 0, delay: Number(t.delay) || 0,
        iterations: t.iterations, direction: t.direction ?? 'normal', easing, props: [...props],
        name: a.animationName ?? null, pseudo: eff?.pseudoElement ?? null };
    });
    return { missing, cssRules, anims };
  }, { names: parts.map((p) => p.name) });

  const syntaxProblems = [...errors];
  if (inv.missing.length) syntaxProblems.push(`missing parts: ${inv.missing.join(', ')}`);
  if ((out.css ?? '').trim() && inv.cssRules === 0) syntaxProblems.push('css produced no rules');
  const syntax = syntaxProblems.length ? 0 : 1;
  explanation.syntax = syntaxProblems.join('; ') || 'ok';

  // --- Phase 2: timing against the spec -----------------------------------
  const norm = (e) => {
    const named = { linear: [0, 0, 1, 1], ease: [0.25, 0.1, 0.25, 1], 'ease-in': [0.42, 0, 1, 1],
      'ease-out': [0, 0, 0.58, 1], 'ease-in-out': [0.42, 0, 0.58, 1] };
    const s = String(e).trim().toLowerCase();
    if (named[s]) return named[s];
    const m = s.match(/^cubic-bezier\(([^)]+)\)$/);
    return m ? m[1].split(',').map(Number) : s.replace(/\s+/g, '');
  };
  const sameEasing = (a, b) => {
    const x = norm(a), y = norm(b);
    if (Array.isArray(x) && Array.isArray(y)) return x.every((v, i) => Math.abs(v - y[i]) < 1e-3);
    return JSON.stringify(x) === JSON.stringify(y);
  };
  const camel = (p) => p.replace(/-([a-z])/g, (_, c) => c.toUpperCase());
  const timingNotes = [];
  let matched = 0;
  for (const want of spec.animations ?? []) {
    const iters = want.iterations === 'infinite' ? Infinity : Number(want.iterations ?? 1);
    const hit = inv.anims.find((a) =>
      a.part === want.target
      && Math.abs(a.duration - want.duration_ms) <= 1
      && Math.abs(a.delay - (want.delay_ms ?? 0)) <= 1
      && (a.iterations === iters || (iters === Infinity && a.iterations === null))
      && (!want.direction || a.direction === want.direction)
      && sameEasing(a.easing, want.easing)
      && (want.properties ?? []).every((p) => a.props.includes(camel(p))));
    if (hit) matched++;
    else {
      const near = inv.anims.filter((a) => a.part === want.target)
        .map((a) => `${a.duration}ms ${a.easing} x${a.iterations} ${a.direction} [${a.props}]`).join(' | ');
      timingNotes.push(`${want.target}: wanted ${want.duration_ms}ms ${want.easing} x${want.iterations}` + (near ? `, found ${near}` : ', no animation on it'));
    }
  }
  const nWant = (spec.animations ?? []).length;
  const timing = nWant ? matched / nWant : 1;
  explanation.timing = timingNotes.join('; ') || `${matched}/${nWant} matched`;
  await page.close();

  // --- Phase 3: fidelity at rest (animations cancelled) -------------------
  ({ page } = await renderPage(spec, out));
  const checks = parts.flatMap((p) => [
    ...Object.entries(p.box ?? {}).map(([k, v]) => ({ part: p.name, kind: 'box', key: k, want: Number(v) })),
    ...Object.entries(p.styles ?? {}).map(([k, v]) => ({ part: p.name, kind: 'style', key: k, want: resolveTokens(v, tokens) })),
  ]);
  const fid = await page.evaluate(({ checks }) => {
    for (const a of document.getAnimations()) a.cancel();
    const stage = document.getElementById('stage');
    const sr = stage.getBoundingClientRect();
    const probe = document.getElementById('probe');
    return checks.map((c) => {
      const el = stage.querySelector(`[data-part="${c.part}"]`);
      if (!el) return { ...c, got: null, ok: false };
      if (c.kind === 'box') {
        // Layout box without transforms: offset from the stage's origin.
        let x = 0, y = 0, n = el;
        while (n && n !== stage) { x += n.offsetLeft; y += n.offsetTop; n = n.offsetParent; }
        const got = { x, y, width: el.offsetWidth, height: el.offsetHeight }[c.key];
        // offset* round; fall back to the sub-pixel rect for width/height.
        const r = el.getBoundingClientRect();
        const exact = { x: r.left - sr.left, y: r.top - sr.top, width: r.width, height: r.height }[c.key];
        const ok = Math.abs(got - c.want) <= 0.5 || Math.abs(exact - c.want) <= 0.5;
        return { ...c, got: Math.round(exact * 100) / 100, ok };
      }
      probe.style.cssText = '';
      probe.style.setProperty(c.key, c.want);
      const want = getComputedStyle(probe).getPropertyValue(c.key);
      const got = getComputedStyle(el).getPropertyValue(c.key);
      return { ...c, want, got, ok: want === got && want !== '' };
    });
  }, { checks });
  const fidOk = fid.filter((c) => c.ok).length;
  const fidelity = checks.length ? fidOk / checks.length : 1;
  explanation.fidelity = fid.filter((c) => !c.ok).slice(0, 6)
    .map((c) => `${c.part}.${c.key}: want ${c.want}, got ${c.got}`).join('; ') || `${fidOk}/${checks.length} exact`;
  await page.close();

  // --- Phase 4: clipping at sampled points of every animation -------------
  ({ page } = await renderPage(spec, out));
  const clip = await page.evaluate(() => {
    const stage = document.getElementById('stage');
    const sr = stage.getBoundingClientRect();
    const anims = document.getAnimations();
    for (const a of anims) a.pause();
    const problems = [];
    const clips = (el) => { const o = getComputedStyle(el); return /(hidden|clip|scroll|auto)/.test(o.overflow + o.overflowX + o.overflowY); };
    for (const f of [0, 0.25, 0.5, 0.75, 0.99]) {
      for (const a of anims) {
        const t = a.effect?.getTiming?.() ?? {};
        a.currentTime = (Number(t.delay) || 0) + f * (Number(t.duration) || 0);
      }
      for (const el of stage.querySelectorAll('*')) {
        const r = el.getBoundingClientRect();
        if (!r.width && !r.height) continue;
        const tag = el.dataset.part ? `[${el.dataset.part}]` : el.tagName.toLowerCase();
        // What's actually painted: the box cut down by every clipping
        // ancestor. A decorative layer masked by its container (a sheen
        // sweeping across a button) is intended; text cut by one isn't.
        const v = { left: r.left, top: r.top, right: r.right, bottom: r.bottom };
        let cutText = false;
        const ownText = [...el.childNodes].some((n) => n.nodeType === 3 && n.textContent.trim());
        for (let p = el.parentElement; p && p !== stage; p = p.parentElement) {
          if (!clips(p)) continue;
          const pr = p.getBoundingClientRect();
          if (ownText && (r.left < pr.left - 0.5 || r.top < pr.top - 0.5 || r.right > pr.right + 0.5 || r.bottom > pr.bottom + 0.5)) cutText = true;
          v.left = Math.max(v.left, pr.left); v.top = Math.max(v.top, pr.top);
          v.right = Math.min(v.right, pr.right); v.bottom = Math.min(v.bottom, pr.bottom);
        }
        if (cutText) problems.push(`${tag} text clipped by its container at ${f * 100}%`);
        if (v.right > v.left && v.bottom > v.top
            && (v.left < sr.left - 0.5 || v.top < sr.top - 0.5 || v.right > sr.right + 0.5 || v.bottom > sr.bottom + 0.5))
          problems.push(`${tag} leaves the stage at ${f * 100}%`);
      }
      // Text must fit the box that holds it: each run of text is measured
      // against its nearest non-inline container. Glyphs poking a couple of
      // px past a tight line-height are fine; text wider than its box, or a
      // wrapped extra line, isn't. Decorative layers overflowing a parent
      // don't count, since only text is measured.
      const walker = document.createTreeWalker(stage, NodeFilter.SHOW_TEXT);
      for (let n = walker.nextNode(); n; n = walker.nextNode()) {
        if (!n.textContent.trim()) continue;
        let box = n.parentElement;
        while (box !== stage && ['inline', 'contents'].includes(getComputedStyle(box).display)) box = box.parentElement;
        if (box === stage) continue;
        const range = document.createRange();
        range.selectNodeContents(n);
        const rs = [...range.getClientRects()].filter((q) => q.width || q.height);
        if (!rs.length) continue;
        const u = { left: Math.min(...rs.map((q) => q.left)), right: Math.max(...rs.map((q) => q.right)),
          top: Math.min(...rs.map((q) => q.top)), bottom: Math.max(...rs.map((q) => q.bottom)) };
        const br = box.getBoundingClientRect();
        const tol = Math.max(2, (parseFloat(getComputedStyle(n.parentElement).fontSize) || 16) * 0.3);
        if (u.left < br.left - 1 || u.right > br.right + 1 || u.top < br.top - tol || u.bottom > br.bottom + tol) {
          const tag = box.dataset.part ? `[${box.dataset.part}]` : box.tagName.toLowerCase();
          problems.push(`${tag} text overflows its box at ${f * 100}%`);
        }
      }
    }
    return [...new Set(problems)];
  });
  const no_clip = clip.length ? 0 : 1;
  explanation.no_clip = clip.slice(0, 5).join('; ') || 'ok';
  await page.close();

  // --- Phase 5: frame budget ----------------------------------------------
  const nonCompositor = [...new Set(inv.anims.flatMap((a) => a.props.map((p) => p.replace(/[A-Z]/g, (c) => '-' + c.toLowerCase())))
    .filter((p) => !COMPOSITOR_PROPS.has(p)))];
  let frames = { p95: 0, dropped: 0, n: 0 };
  if (inv.anims.length) frames = await exclusive(async () => {
    ({ page } = await renderPage(spec, out));
    const cdp = await page.context().newCDPSession(page);
    await cdp.send('Emulation.setCPUThrottlingRate', { rate: CPU_SLOWDOWN });
    const measured = await page.evaluate(({ dropMs }) => new Promise((done) => {
      const deltas = []; let last = null; const t0 = performance.now();
      const tick = (t) => {
        if (last != null && t - t0 > 200) deltas.push(t - last);
        last = t;
        if (t - t0 < 1700) requestAnimationFrame(tick);
        else {
          deltas.sort((a, b) => a - b);
          const p95 = deltas[Math.floor(deltas.length * 0.95)] ?? 0;
          done({ p95, dropped: deltas.filter((d) => d > dropMs).length / (deltas.length || 1), n: deltas.length });
        }
      };
      requestAnimationFrame(tick);
    }), { dropMs: DROP_MS });
    await cdp.send('Emulation.setCPUThrottlingRate', { rate: 1 });
    await page.close();
    return measured;
  });
  perf.frame_p95_ms = Math.round(frames.p95 * 10) / 10;
  perf.dropped_pct = Math.round(frames.dropped * 1000) / 10;
  // A 60 Hz interval sits at ~16.7 ms, so the budget is "no dropped frames":
  // p95 interval under 1.5 frames.
  const measuredOk = frames.p95 <= DROP_MS;
  const frame_ok = nonCompositor.length === 0 && measuredOk ? 1 : 0;
  explanation.frame_ok = [
    nonCompositor.length ? `animates non-compositor properties: ${nonCompositor.join(', ')}` : '',
    measuredOk ? '' : `p95 frame interval ${perf.frame_p95_ms} ms, ${perf.dropped_pct}% dropped`,
  ].filter(Boolean).join('; ') || `p95 ${perf.frame_p95_ms} ms, compositor-only`;

  const pass = syntax && fidelity === 1 && timing === 1 && no_clip && frame_ok ? 1 : 0;
  return { grade: { pass, syntax, fidelity, timing, no_clip, frame_ok }, explanation, perf };
}
