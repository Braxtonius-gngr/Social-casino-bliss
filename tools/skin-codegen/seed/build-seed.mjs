// Writes the seed eval set: cases/<id>.json (the spec the model sees) and
// cases/<id>.oracle.json (a hand-written correct answer, used only to prove
// each case is passable). Run: node tools/skin-codegen/seed/build-seed.mjs
//
// Sources:
//   canva-dro  "Daily Roll Over System" Canva deck (DAHWWIBbmQI): colour
//              tokens, type rules, tracker card states, header, sort bar;
//              the component boards in DAHWZ7PJKM4 for buttons, pills,
//              badges and toggles. The deck gives no pixel sizes or motion,
//              so boxes and timings are set here and marked `derived`.
//   app-css    assets/app.css in this repo. Values are the app's own. Where
//              the app animates a paint property (box-shadow, background-
//              position), the case restates it as a layer whose opacity or
//              transform moves, the way the frame-budget rule requires;
//              those are marked `adapted`.
//
// Style values are px, never em (the grader resolves each value on its own
// probe element, so em would resolve against the wrong font size).
import { mkdirSync, writeFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const OUT = join(dirname(fileURLToPath(import.meta.url)), '..', 'cases');
const UI = 'Inter, Roboto, sans-serif';
const MONO = '"Roboto Mono", monospace';
const SERIF = 'Georgia, "Times New Roman", serif';

const DRO = { ready: '#10B981', pending: '#4B5563', expiring: '#F59E0B', bg: '#121212', surface: '#1C1C1C', text: '#F8F9FA', muted: '#8A8D93' };
const EXEC = { gold: '#D4AF37', text: '#F8F9FA', muted: '#8A8D93', 'gold-metal': 'linear-gradient(180deg, #F3DA92 0%, #D4AF37 48%, #A87A22 100%)' };
const WEST = { gold: '#FFC107', blood: '#810000', ink: '#0B0B0B', ember: '#C16B2C', bone: '#E3DAC9' };

const anim = (target, duration_ms, easing, properties, extra = {}) =>
  ({ target, duration_ms, delay_ms: 0, iterations: 1, direction: 'normal', easing, properties, ...extra });
const loop = (target, duration_ms, easing, properties, extra = {}) =>
  anim(target, duration_ms, easing, properties, { iterations: 'infinite', ...extra });

const cases = [];
const add = (c) => cases.push(c);

// --- Daily Roll Over (Canva) -------------------------------------------------

const trackerCss = (border, extra = '') => `
.tc{position:absolute;left:16px;top:16px;width:328px;height:88px;box-sizing:border-box;padding:16px;background-color:#1C1C1C;border:1px solid ${border};border-radius:12px;font-family:${UI}}
.tc [data-part=dot]{position:absolute;left:16px;top:16px;width:8px;height:8px;border-radius:50%}
.tc [data-part=name]{position:absolute;left:32px;top:10px;color:#F8F9FA;font-size:15px;font-weight:700;letter-spacing:1px;white-space:nowrap}
.tc [data-part=tier]{position:absolute;left:16px;top:44px;color:#8A8D93;font-family:${MONO};font-size:12px;white-space:nowrap}
${extra}`;

add({
  id: 'dro-tracker-ready', tags: ['card', 'canva-dro', 'derived'],
  source: 'canva:DAHWWIBbmQI p8 Tracker Card, READY state',
  canvas: { width: 360, height: 120, background: '#121212' }, tokens: DRO,
  component: {
    description: 'Tracker card, READY state: platform name, SC tier, a live status dot that pulses, and a CLAIM NOW button.',
    root: { box: { x: 16, y: 16, width: 328, height: 88 }, styles: { 'background-color': '{surface}', 'border-radius': '12px', border: '1px solid {ready}', padding: '16px' } },
    parts: [
      { name: 'dot', box: { x: 33, y: 33, width: 8, height: 8 }, styles: { 'background-color': '{ready}', 'border-radius': '50%' } },
      { name: 'name', text: 'NORTHSTAR', styles: { color: '{text}', 'font-family': UI, 'font-size': '15px', 'font-weight': '700', 'letter-spacing': '1px' } },
      { name: 'tier', text: 'SC TIER · 1.00', styles: { color: '{muted}', 'font-family': MONO, 'font-size': '12px' } },
      { name: 'cta', text: 'CLAIM NOW', box: { x: 226, y: 44, width: 102, height: 32 }, styles: { 'background-color': '{ready}', color: '{bg}', 'border-radius': '6px', 'font-size': '13px', 'font-weight': '800' } },
    ],
  },
  animations: [loop('dot', 2200, 'ease-in-out', ['opacity'])],
  oracle: {
    html: '<div class="tc" data-part="root"><span data-part="dot"></span><span data-part="name">NORTHSTAR</span><span data-part="tier">SC TIER · 1.00</span><span data-part="cta">CLAIM NOW</span></div>',
    css: trackerCss('#10B981', `.tc [data-part=dot]{background-color:#10B981;animation:tick 2200ms ease-in-out infinite}
@keyframes tick{0%,100%{opacity:.45}50%{opacity:1}}
.tc [data-part=cta]{position:absolute;left:209px;top:27px;width:102px;height:32px;box-sizing:border-box;display:flex;align-items:center;justify-content:center;background-color:#10B981;color:#121212;border-radius:6px;font-size:13px;font-weight:800}`),
  },
});

add({
  id: 'dro-tracker-counting', tags: ['card', 'canva-dro', 'derived'],
  source: 'canva:DAHWWIBbmQI p8 Tracker Card, COUNTING DOWN state',
  canvas: { width: 360, height: 120, background: '#121212' }, tokens: DRO,
  component: {
    description: 'Tracker card, COUNTING DOWN state: grey status dot and the time left to the next claim. Static.',
    root: { box: { x: 16, y: 16, width: 328, height: 88 }, styles: { 'background-color': '{surface}', 'border-radius': '12px', border: '1px solid {pending}', padding: '16px' } },
    parts: [
      { name: 'dot', box: { x: 33, y: 33, width: 8, height: 8 }, styles: { 'background-color': '{pending}', 'border-radius': '50%' } },
      { name: 'name', text: 'LUCKY BAY', styles: { color: '{text}', 'font-family': UI, 'font-size': '15px', 'font-weight': '700', 'letter-spacing': '1px' } },
      { name: 'tier', text: 'SC TIER · 1.00', styles: { color: '{muted}', 'font-family': MONO, 'font-size': '12px' } },
      { name: 'countdown', text: '04:37:12', styles: { color: '{text}', 'font-family': MONO, 'font-size': '15px', 'font-weight': '500' } },
    ],
  },
  animations: [],
  oracle: {
    html: '<div class="tc" data-part="root"><span data-part="dot"></span><span data-part="name">LUCKY BAY</span><span data-part="tier">SC TIER · 1.00</span><span data-part="countdown">04:37:12</span></div>',
    css: trackerCss('#4B5563', `.tc [data-part=dot]{background-color:#4B5563}
.tc [data-part=countdown]{position:absolute;right:16px;top:30px;color:#F8F9FA;font-family:${MONO};font-size:15px;font-weight:500}`),
  },
});

add({
  id: 'dro-tracker-expiring', tags: ['card', 'canva-dro', 'derived'],
  source: 'canva:DAHWWIBbmQI p8 Tracker Card, EXPIRING SOON state',
  canvas: { width: 360, height: 120, background: '#121212' }, tokens: DRO,
  component: {
    description: 'Tracker card, EXPIRING SOON state: amber countdown and an amber glow layer the size of the card that breathes in and out.',
    root: { box: { x: 16, y: 16, width: 328, height: 88 }, styles: { 'background-color': '{surface}', 'border-radius': '12px', border: '1px solid {expiring}', padding: '16px' } },
    parts: [
      { name: 'glow', box: { x: 16, y: 16, width: 328, height: 88 }, styles: { 'border-radius': '12px', 'box-shadow': '0 0 16px rgba(245, 158, 11, 0.55)' } },
      { name: 'dot', box: { x: 33, y: 33, width: 8, height: 8 }, styles: { 'background-color': '{expiring}', 'border-radius': '50%' } },
      { name: 'name', text: 'NORTHSTAR', styles: { color: '{text}', 'font-family': UI, 'font-size': '15px', 'font-weight': '700', 'letter-spacing': '1px' } },
      { name: 'tier', text: 'SC TIER · 1.00', styles: { color: '{muted}', 'font-family': MONO, 'font-size': '12px' } },
      { name: 'countdown', text: '00:12:44', styles: { color: '{expiring}', 'font-family': MONO, 'font-size': '15px', 'font-weight': '500' } },
    ],
  },
  animations: [loop('glow', 1200, 'ease-in-out', ['opacity'], { direction: 'alternate' })],
  oracle: {
    html: '<div class="tc" data-part="root"><span data-part="glow"></span><span data-part="dot"></span><span data-part="name">NORTHSTAR</span><span data-part="tier">SC TIER · 1.00</span><span data-part="countdown">00:12:44</span></div>',
    css: trackerCss('#F59E0B', `.tc [data-part=dot]{background-color:#F59E0B}
.tc [data-part=glow]{position:absolute;left:-1px;top:-1px;width:328px;height:88px;border-radius:12px;box-shadow:0 0 16px rgba(245,158,11,.55);animation:breathe 1200ms ease-in-out infinite alternate}
@keyframes breathe{from{opacity:.25}to{opacity:1}}
.tc [data-part=countdown]{position:absolute;right:16px;top:30px;color:#F59E0B;font-family:${MONO};font-size:15px;font-weight:500}`),
  },
});

add({
  id: 'dro-global-header', tags: ['banner', 'canva-dro', 'derived'],
  source: 'canva:DAHWWIBbmQI p7 Global Header',
  canvas: { width: 360, height: 80, background: '#121212' }, tokens: DRO,
  component: {
    description: 'Sticky global header: app name on the left, the local overnight reset time on the right. Static.',
    root: { box: { x: 0, y: 0, width: 360, height: 56 }, styles: { 'background-color': '{bg}', 'border-bottom': '1px solid rgba(255, 255, 255, 0.08)' } },
    parts: [
      { name: 'title', text: 'DAILY ROLL OVER', styles: { color: '{text}', 'font-family': UI, 'font-size': '14px', 'font-weight': '800', 'letter-spacing': '2px' } },
      { name: 'reset', text: 'RESET 05:00', styles: { color: '{ready}', 'font-family': MONO, 'font-size': '11px' } },
    ],
  },
  animations: [],
  oracle: {
    html: '<header class="gh" data-part="root"><span data-part="title">DAILY ROLL OVER</span><span data-part="reset">RESET 05:00</span></header>',
    css: `.gh{position:absolute;left:0;top:0;width:360px;height:56px;box-sizing:border-box;padding:0 16px;display:flex;align-items:center;justify-content:space-between;background-color:#121212;border-bottom:1px solid rgba(255,255,255,.08)}
.gh [data-part=title]{color:#F8F9FA;font-family:${UI};font-size:14px;font-weight:800;letter-spacing:2px}
.gh [data-part=reset]{color:#10B981;font-family:${MONO};font-size:11px}`,
  },
});

add({
  id: 'dro-sort-bar', tags: ['banner', 'canva-dro', 'derived'],
  source: 'canva:DAHWWIBbmQI p9 Sorting Bar; fade-in from app.css .sort-drawer',
  canvas: { width: 360, height: 72, background: '#121212' }, tokens: DRO,
  component: {
    description: 'Sorting bar with the active sort chip and an inactive one. The bar fades in, dropping 4px into place.',
    root: { box: { x: 16, y: 16, width: 328, height: 40 }, styles: {} },
    parts: [
      { name: 'active', text: 'SC TIER', styles: { 'background-color': 'rgba(16, 185, 129, 0.15)', color: '{ready}', border: '1px solid {ready}', 'border-radius': '6px', 'font-size': '11px', 'font-weight': '700', padding: '6px 10px' } },
      { name: 'option', text: 'FREQUENCY', styles: { 'background-color': 'rgba(0, 0, 0, 0)', color: '{muted}', border: '1px solid rgba(255, 255, 255, 0.12)', 'border-radius': '6px', 'font-size': '11px', 'font-weight': '700', padding: '6px 10px' } },
    ],
  },
  animations: [anim('root', 200, 'ease-in-out', ['opacity', 'transform'])],
  oracle: {
    html: '<div class="sb" data-part="root"><span data-part="active">SC TIER</span><span data-part="option">FREQUENCY</span></div>',
    css: `.sb{position:absolute;left:16px;top:16px;width:328px;height:40px;display:flex;align-items:center;gap:8px;font-family:${UI};animation:fadeIn 200ms ease-in-out}
@keyframes fadeIn{from{opacity:0;transform:translateY(-4px)}to{opacity:1;transform:translateY(0)}}
.sb span{border-radius:6px;font-size:11px;font-weight:700;padding:6px 10px}
.sb [data-part=active]{background-color:rgba(16,185,129,.15);color:#10B981;border:1px solid #10B981}
.sb [data-part=option]{background-color:transparent;color:#8A8D93;border:1px solid rgba(255,255,255,.12)}`,
  },
});

const claimCss = (bg, extra) => `.cb{position:absolute;left:40px;top:36px;width:200px;height:48px;box-sizing:border-box;border:0;padding:0;display:flex;align-items:center;justify-content:center;background-color:${bg};border-radius:8px}
.cb [data-part=label]{font-family:${UI};font-size:15px;font-weight:800;letter-spacing:1px}
${extra}`;

add({
  id: 'dro-claim-idle', tags: ['button', 'canva-dro', 'derived'],
  source: 'canva:DAHWZ7PJKM4 buttons board, Primary; breathe timing from app.css run-btn-breathe',
  canvas: { width: 280, height: 120, background: '#121212' }, tokens: DRO,
  component: {
    description: 'Claim button, idle and ready to press: it breathes, scaling up 4% and back.',
    root: { box: { x: 40, y: 36, width: 200, height: 48 }, styles: { 'background-color': '{ready}', 'border-radius': '8px' } },
    parts: [{ name: 'label', text: 'CLAIM NOW', styles: { color: '{bg}', 'font-family': UI, 'font-size': '15px', 'font-weight': '800', 'letter-spacing': '1px' } }],
  },
  animations: [loop('root', 2200, 'ease-in-out', ['transform'])],
  oracle: {
    html: '<button class="cb" data-part="root"><span data-part="label">CLAIM NOW</span></button>',
    css: claimCss('#10B981', `.cb{animation:breathe 2200ms ease-in-out infinite}.cb [data-part=label]{color:#121212}
@keyframes breathe{0%,100%{transform:scale(1)}50%{transform:scale(1.04)}}`),
  },
});

add({
  id: 'dro-claim-pressed', tags: ['button', 'canva-dro', 'derived'],
  source: 'canva:DAHWZ7PJKM4 buttons board, Primary pressed; spring press from app.css control transitions',
  canvas: { width: 280, height: 120, background: '#121212' }, tokens: { ...DRO, 'ready-press': '#0E9F6E' },
  component: {
    description: 'Claim button, pressed: darker green with an inset shadow, and a single springy dip (scale down to 96% and back, overshooting on the way).',
    root: { box: { x: 40, y: 36, width: 200, height: 48 }, styles: { 'background-color': '{ready-press}', 'border-radius': '8px', 'box-shadow': 'inset 0 2px 0 rgba(0, 0, 0, 0.25)' } },
    parts: [{ name: 'label', text: 'CLAIM NOW', styles: { color: '{bg}', 'font-family': UI, 'font-size': '15px', 'font-weight': '800', 'letter-spacing': '1px' } }],
  },
  animations: [anim('root', 130, 'cubic-bezier(0.34, 1.56, 0.64, 1)', ['transform'])],
  oracle: {
    html: '<button class="cb" data-part="root"><span data-part="label">CLAIM NOW</span></button>',
    css: claimCss('#0E9F6E', `.cb{box-shadow:inset 0 2px 0 rgba(0,0,0,.25);animation:dip 130ms cubic-bezier(.34,1.56,.64,1)}.cb [data-part=label]{color:#121212}
@keyframes dip{0%,100%{transform:scale(1)}50%{transform:scale(.96)}}`),
  },
});

add({
  id: 'dro-claim-disabled', tags: ['button', 'canva-dro', 'derived'],
  source: 'canva:DAHWZ7PJKM4 buttons board; disabled uses the PENDING token',
  canvas: { width: 280, height: 120, background: '#121212' }, tokens: DRO,
  component: {
    description: 'Claim button, disabled: grey, dimmed label, not-allowed cursor. Static.',
    root: { box: { x: 40, y: 36, width: 200, height: 48 }, styles: { 'background-color': '{pending}', 'border-radius': '8px', cursor: 'not-allowed' } },
    parts: [{ name: 'label', text: 'CLAIM NOW', styles: { color: 'rgba(248, 249, 250, 0.55)', 'font-family': UI, 'font-size': '15px', 'font-weight': '800', 'letter-spacing': '1px' } }],
  },
  animations: [],
  oracle: {
    html: '<button class="cb" data-part="root" disabled><span data-part="label">CLAIM NOW</span></button>',
    css: claimCss('#4B5563', '.cb{cursor:not-allowed}.cb [data-part=label]{color:rgba(248,249,250,.55)}'),
  },
});

add({
  id: 'dro-status-pills', tags: ['badge', 'canva-dro', 'derived'],
  source: 'canva:DAHWZ7PJKM4 status indicators board; error colour is the app accent-pink',
  canvas: { width: 360, height: 80, background: '#121212' }, tokens: { ...DRO, error: '#B4485C' },
  component: {
    description: 'Row of status pills: Success, Warning, Error, and Syncing, whose small ring icon spins.',
    root: { box: { x: 12, y: 20, width: 336, height: 40 }, styles: {} },
    parts: [
      { name: 'success', text: 'Success', styles: { 'background-color': 'rgba(16, 185, 129, 0.12)', color: '{ready}', border: '1px solid {ready}', 'border-radius': '999px', 'font-size': '12px', 'font-weight': '700' } },
      { name: 'warning', text: 'Warning', styles: { 'background-color': 'rgba(245, 158, 11, 0.12)', color: '{expiring}', border: '1px solid {expiring}', 'border-radius': '999px', 'font-size': '12px', 'font-weight': '700' } },
      { name: 'error', text: 'Error', styles: { 'background-color': 'rgba(180, 72, 92, 0.12)', color: '{error}', border: '1px solid {error}', 'border-radius': '999px', 'font-size': '12px', 'font-weight': '700' } },
      { name: 'syncing', text: 'Syncing', styles: { 'background-color': 'rgba(138, 141, 147, 0.12)', color: '{muted}', border: '1px solid {muted}', 'border-radius': '999px', 'font-size': '12px', 'font-weight': '700' } },
      { name: 'spinner', styles: { width: '10px', height: '10px', 'border-radius': '50%', 'border-bottom': '2px solid {muted}', 'border-top': '2px solid rgba(0, 0, 0, 0)' } },
    ],
  },
  animations: [loop('spinner', 900, 'linear', ['transform'])],
  oracle: {
    html: '<div class="sp" data-part="root"><span data-part="success">Success</span><span data-part="warning">Warning</span><span data-part="error">Error</span><span data-part="syncing"><i data-part="spinner"></i>Syncing</span></div>',
    css: `.sp{position:absolute;left:12px;top:20px;width:336px;height:40px;display:flex;align-items:center;gap:6px;font-family:${UI}}
.sp>span{display:inline-flex;align-items:center;gap:5px;padding:4px 9px;border-radius:999px;font-size:12px;font-weight:700;white-space:nowrap}
.sp [data-part=success]{background-color:rgba(16,185,129,.12);color:#10B981;border:1px solid #10B981}
.sp [data-part=warning]{background-color:rgba(245,158,11,.12);color:#F59E0B;border:1px solid #F59E0B}
.sp [data-part=error]{background-color:rgba(180,72,92,.12);color:#B4485C;border:1px solid #B4485C}
.sp [data-part=syncing]{background-color:rgba(138,141,147,.12);color:#8A8D93;border:1px solid #8A8D93}
.sp [data-part=spinner]{display:block;box-sizing:content-box;width:10px;height:10px;border-radius:50%;border:2px solid #8A8D93;border-top-color:transparent;animation:spin 900ms linear infinite}
@keyframes spin{to{transform:rotate(360deg)}}`,
  },
});

add({
  id: 'dro-badge-new-pop', tags: ['badge', 'canva-dro', 'derived'],
  source: 'canva:DAHWZ7PJKM4 badges & tags board, New; colour is the app accent-orange',
  canvas: { width: 120, height: 72, background: '#121212' }, tokens: { ...DRO, new: '#C2843C' },
  component: {
    description: 'A "NEW" tag that pops in once: grows from small and transparent with a springy overshoot.',
    root: { box: { x: 32, y: 24, width: 56, height: 24 }, styles: { 'background-color': '{new}', 'border-radius': '6px' } },
    parts: [{ name: 'label', text: 'NEW', styles: { color: '{bg}', 'font-family': UI, 'font-size': '11px', 'font-weight': '800', 'letter-spacing': '1px' } }],
  },
  animations: [anim('root', 240, 'cubic-bezier(0.34, 1.56, 0.64, 1)', ['transform', 'opacity'])],
  oracle: {
    html: '<span class="nb" data-part="root"><span data-part="label">NEW</span></span>',
    css: `.nb{position:absolute;left:32px;top:24px;width:56px;height:24px;display:flex;align-items:center;justify-content:center;background-color:#C2843C;border-radius:6px;animation:pop 240ms cubic-bezier(.34,1.56,.64,1) both}
.nb [data-part=label]{color:#121212;font-family:${UI};font-size:11px;font-weight:800;letter-spacing:1px}
@keyframes pop{from{opacity:0;transform:scale(.6)}to{opacity:1;transform:scale(1)}}`,
  },
});

add({
  id: 'dro-toggle-on', tags: ['toggle', 'canva-dro', 'derived'],
  source: 'canva:DAHWZ7PJKM4 toggles & switches board, on state',
  canvas: { width: 92, height: 72, background: '#121212' }, tokens: DRO,
  component: {
    description: 'Visibility toggle switching on: the knob slides from the left end to the right end once.',
    root: { box: { x: 24, y: 24, width: 44, height: 24 }, styles: { 'background-color': '{ready}', 'border-radius': '12px' } },
    parts: [{ name: 'knob', box: { x: 46, y: 26, width: 20, height: 20 }, styles: { 'background-color': '{text}', 'border-radius': '50%' } }],
  },
  animations: [anim('knob', 180, 'ease-out', ['transform'])],
  oracle: {
    html: '<span class="tg" data-part="root"><span data-part="knob"></span></span>',
    css: `.tg{position:absolute;left:24px;top:24px;width:44px;height:24px;background-color:#10B981;border-radius:12px}
.tg [data-part=knob]{position:absolute;left:22px;top:2px;width:20px;height:20px;border-radius:50%;background-color:#F8F9FA;animation:slide 180ms ease-out}
@keyframes slide{from{transform:translateX(-20px)}to{transform:none}}`,
  },
});

add({
  id: 'dro-countdown-expiring', tags: ['timer', 'canva-dro', 'derived'],
  source: 'canva:DAHWWIBbmQI p5 tabular figures, p8 EXPIRING SOON',
  canvas: { width: 248, height: 112, background: '#121212' }, tokens: DRO,
  component: {
    description: 'Large countdown in tabular mono digits with a small label under it. The digits fade softly in and out while the window is closing.',
    root: { box: { x: 24, y: 24, width: 200, height: 64 }, styles: {} },
    parts: [
      { name: 'digits', text: '00:12:44', styles: { color: '{expiring}', 'font-family': MONO, 'font-size': '28px', 'font-weight': '500' } },
      { name: 'label', text: 'EXPIRING SOON', styles: { color: '{muted}', 'font-family': UI, 'font-size': '10px', 'font-weight': '700', 'letter-spacing': '2px' } },
    ],
  },
  animations: [loop('digits', 1000, 'ease-in-out', ['opacity'], { direction: 'alternate' })],
  oracle: {
    html: '<div class="cd" data-part="root"><span data-part="digits">00:12:44</span><span data-part="label">EXPIRING SOON</span></div>',
    css: `.cd{position:absolute;left:24px;top:24px;width:200px;height:64px;display:flex;flex-direction:column;align-items:center;justify-content:center;gap:2px}
.cd [data-part=digits]{color:#F59E0B;font-family:${MONO};font-size:28px;font-weight:500;animation:blink 1000ms ease-in-out infinite alternate}
.cd [data-part=label]{color:#8A8D93;font-family:${UI};font-size:10px;font-weight:700;letter-spacing:2px}
@keyframes blink{from{opacity:1}to{opacity:.45}}`,
  },
});

// --- App skin (assets/app.css) -----------------------------------------------

const tierBadge = (id, text, color, wash, border, width) => add({
  id, tags: ['badge', 'app-css', 'executive'],
  source: `app:assets/app.css .tier-badge + .tier-${text === 'NOT RANKABLE' ? 'Not-Rankable' : text}`,
  canvas: { width: width + 64, height: 56, background: '#050507' }, tokens: { tier: color },
  component: {
    description: `Tier badge "${text}". Static.`,
    root: { box: { x: 32, y: 19, width, height: 18 }, styles: { 'background-color': wash, color: '{tier}', border: `1px ${border} {tier}`, 'border-radius': '4px', 'font-size': '11px', 'font-weight': '900', 'text-transform': 'uppercase' } },
    parts: [],
  },
  animations: [],
  oracle: {
    html: `<span class="tb" data-part="root">${text.toLowerCase()}</span>`,
    css: `.tb{position:absolute;left:32px;top:19px;width:${width}px;height:18px;box-sizing:border-box;display:flex;align-items:center;justify-content:center;background-color:${wash.replace(/ /g, '')};color:${color};border:1px ${border} ${color};border-radius:4px;font:900 11px/1 system-ui,sans-serif;text-transform:uppercase}`,
  },
});
tierBadge('tier-badge-s', 'S', '#D4AF37', 'rgba(212, 175, 55, 0.2)', 'solid', 22);
tierBadge('tier-badge-a', 'A', '#E3E4E5', 'rgba(227, 228, 229, 0.2)', 'solid', 22);
tierBadge('tier-badge-f', 'F', '#8B4A4A', 'rgba(139, 74, 74, 0.2)', 'dashed', 22);
tierBadge('tier-badge-not-rankable', 'NOT RANKABLE', '#6E5A8C', 'rgba(110, 90, 140, 0.14)', 'dotted', 112);

add({
  id: 'type-badge-slots', tags: ['badge', 'app-css', 'executive'],
  source: 'app:assets/app.css .type-badge',
  canvas: { width: 108, height: 56, background: '#050507' }, tokens: { orange: '#C2843C' },
  component: {
    description: 'Game-type badge "SLOTS". Static.',
    root: { box: { x: 32, y: 19, width: 44, height: 18 }, styles: { 'background-color': 'rgba(194, 132, 60, 0.15)', color: '{orange}', border: '1px solid {orange}', 'border-radius': '4px', 'font-size': '10px', 'font-weight': '800' } },
    parts: [],
  },
  animations: [],
  oracle: {
    html: '<span class="ty" data-part="root">SLOTS</span>',
    css: '.ty{position:absolute;left:32px;top:19px;width:44px;height:18px;box-sizing:border-box;display:flex;align-items:center;justify-content:center;background-color:rgba(194,132,60,.15);color:#C2843C;border:1px solid #C2843C;border-radius:4px;font:800 10px/1 system-ui,sans-serif}',
  },
});

const ledgerParts = [
  { name: 'avatar', text: 'CC', box: { x: 33, y: 40, width: 40, height: 40 }, styles: { 'background-color': 'rgba(212, 175, 55, 0.15)', color: '{gold}', 'border-radius': '10px', 'font-size': '14px', 'font-weight': '800' } },
  { name: 'name', text: 'Crown Coins', styles: { color: '{text}', 'font-size': '15px', 'font-weight': '800' } },
  { name: 'tier', text: 'S', styles: { color: '{gold}', border: '1px solid {gold}', 'background-color': 'rgba(212, 175, 55, 0.2)', 'border-radius': '4px', 'font-size': '11px', 'font-weight': '900' } },
  { name: 'dot', box: { x: 86, y: 66, width: 8, height: 8 }, styles: { 'background-color': '{green}', 'border-radius': '50%' } },
  { name: 'status', text: 'READY', styles: { color: '{text}', 'font-family': 'monospace', 'font-size': '12px', 'font-weight': '600' } },
];
const ledgerHtml = '<div class="lc" data-part="root"><span data-part="avatar">CC</span><span data-part="name">Crown Coins</span><span data-part="tier">S</span><span data-part="dot"></span><span data-part="status">READY</span>__EXTRA__</div>';
const ledgerCss = (bg, border) => `.lc{position:absolute;left:20px;top:24px;width:340px;height:72px;box-sizing:border-box;background-color:${bg};border:${border};border-radius:14px;font-family:system-ui,sans-serif}
.lc [data-part=avatar]{position:absolute;left:12px;top:15px;width:40px;height:40px;display:flex;align-items:center;justify-content:center;background-color:rgba(212,175,55,.15);color:#D4AF37;border-radius:10px;font-size:14px;font-weight:800}
.lc [data-part=name]{position:absolute;left:64px;top:12px;color:#F8F9FA;font-size:15px;font-weight:800;white-space:nowrap}
.lc [data-part=tier]{position:absolute;left:170px;top:13px;padding:2px 6px;color:#D4AF37;border:1px solid #D4AF37;background-color:rgba(212,175,55,.2);border-radius:4px;font-size:11px;font-weight:900}
.lc [data-part=dot]{position:absolute;left:65px;top:41px;width:8px;height:8px;border-radius:50%;background-color:#3FBF8F}
.lc [data-part=status]{position:absolute;left:80px;top:37px;color:#F8F9FA;font-family:monospace;font-size:12px;font-weight:600}`;

add({
  id: 'ledger-card-rise', tags: ['card', 'app-css', 'executive'],
  source: 'app:assets/app.css .ledger-card-wrapper card-rise, card title row, tier badge, status dot',
  canvas: { width: 380, height: 120, background: '#050507' }, tokens: { ...EXEC, green: '#3FBF8F' },
  component: {
    description: 'Platform card frame with avatar, name, tier badge and READY status. It rises 10px into place while fading in, after a 40ms stagger delay.',
    root: { box: { x: 20, y: 24, width: 340, height: 72 }, styles: { 'background-color': '#0E0E12', border: '1px solid rgba(255, 255, 255, 0.08)', 'border-radius': '14px' } },
    parts: ledgerParts,
  },
  animations: [anim('root', 340, 'cubic-bezier(0.22, 1, 0.36, 1)', ['opacity', 'transform'], { delay_ms: 40 })],
  oracle: {
    html: ledgerHtml.replace('__EXTRA__', ''),
    css: ledgerCss('#0E0E12', '1px solid rgba(255,255,255,.08)') + `
.lc{animation:rise 340ms cubic-bezier(.22,1,.36,1) 40ms backwards}
@keyframes rise{from{opacity:0;transform:translateY(10px)}to{opacity:1;transform:none}}`,
  },
});

add({
  id: 'prism-card-ready-glow', tags: ['card', 'app-css', 'prism', 'adapted'],
  source: 'app:assets/app.css prism-live-glow (box-shadow pulse restated as a glow layer) + prism-tick',
  canvas: { width: 380, height: 120, background: '#07070A' }, tokens: { ...EXEC, green: '#3FBF8F', amber: '#FF8A1F' },
  component: {
    description: 'Prism-theme platform card in the READY state. A warm glow layer the size of the card runs in and out, and a small amber tick pulses beside the name.',
    root: { box: { x: 20, y: 24, width: 340, height: 72 }, styles: { 'background-color': '#0D0B0A', border: '1px solid rgba(255, 138, 31, 0.35)', 'border-radius': '14px' } },
    parts: [
      ...ledgerParts,
      { name: 'glow', box: { x: 20, y: 24, width: 340, height: 72 }, styles: { 'border-radius': '14px', 'box-shadow': 'rgba(255, 180, 60, 0.95) 3px 0px 0px -1px inset' } },
      { name: 'tick', box: { x: 338, y: 36, width: 8, height: 8 }, styles: { 'background-color': '{amber}', 'border-radius': '50%' } },
    ],
  },
  animations: [loop('glow', 3000, 'ease-in-out', ['opacity']), loop('tick', 2200, 'ease-in-out', ['opacity'])],
  oracle: {
    html: ledgerHtml.replace('__EXTRA__', '<span data-part="glow"></span><span data-part="tick"></span>'),
    css: ledgerCss('#0D0B0A', '1px solid rgba(255,138,31,.35)') + `
.lc [data-part=glow]{position:absolute;left:-1px;top:-1px;width:340px;height:72px;border-radius:14px;box-shadow:inset 3px 0 0 -1px rgba(255,180,60,.95);animation:live 3000ms ease-in-out infinite}
.lc [data-part=tick]{position:absolute;left:317px;top:11px;width:8px;height:8px;border-radius:50%;background-color:#FF8A1F;animation:tick 2200ms ease-in-out infinite}
@keyframes live{0%,100%{opacity:.35}50%{opacity:1}}
@keyframes tick{0%,100%{opacity:.45}50%{opacity:1}}`,
  },
});

add({
  id: 'sheet-modal-rise', tags: ['modal', 'app-css', 'executive'],
  source: 'app:assets/app.css .sheet-modal + sheet-rise; button fill is --gold-metal',
  canvas: { width: 360, height: 280, background: '#000000' }, tokens: EXEC,
  component: {
    description: 'Bottom-sheet modal: serif uppercase title, one line of body text, and a full-width gold SAVE button. The sheet rises 18px into place from 98.5% scale while fading in.',
    root: { box: { x: 20, y: 40, width: 320, height: 200 }, styles: { 'background-color': '#111014', border: '1px solid rgba(255, 255, 255, 0.08)', 'border-radius': '20px', padding: '24px' } },
    parts: [
      { name: 'title', text: 'Set tier', styles: { color: '{text}', 'font-family': SERIF, 'font-size': '22px', 'font-weight': '400', 'letter-spacing': '1px', 'text-transform': 'uppercase' } },
      { name: 'body', text: 'Pick a tier for 3 platforms.', styles: { color: '{muted}', 'font-size': '14px' } },
      { name: 'save', text: 'SAVE', box: { x: 45, y: 171, width: 270, height: 44 }, styles: { 'background-image': '{gold-metal}', color: '#050507', 'border-radius': '10px', 'font-size': '13px', 'font-weight': '800' } },
    ],
  },
  animations: [anim('root', 300, 'cubic-bezier(0.22, 1, 0.36, 1)', ['opacity', 'transform'])],
  oracle: {
    html: '<div class="sm" data-part="root"><h3 data-part="title">Set tier</h3><p data-part="body">Pick a tier for 3 platforms.</p><button data-part="save">SAVE</button></div>',
    css: `.sm{position:absolute;left:20px;top:40px;width:320px;height:200px;box-sizing:border-box;padding:24px;background-color:#111014;border:1px solid rgba(255,255,255,.08);border-radius:20px;font-family:system-ui,sans-serif;animation:rise 300ms cubic-bezier(.22,1,.36,1)}
@keyframes rise{from{opacity:0;transform:translateY(18px) scale(.985)}to{opacity:1;transform:none}}
.sm [data-part=title]{margin:0 0 8px;color:#F8F9FA;font-family:${SERIF};font-size:22px;font-weight:400;letter-spacing:1px;text-transform:uppercase}
.sm [data-part=body]{margin:0;color:#8A8D93;font-size:14px}
.sm [data-part=save]{position:absolute;left:24px;top:130px;width:270px;height:44px;border:0;background-image:linear-gradient(180deg,#F3DA92 0%,#D4AF37 48%,#A87A22 100%);color:#050507;border-radius:10px;font-size:13px;font-weight:800}`,
  },
});

add({
  id: 'update-refresh-pill', tags: ['button', 'app-css', 'landing'],
  source: 'app:assets/app.css .app-update-go + app-update-in',
  canvas: { width: 240, height: 96, background: '#050404' }, tokens: {},
  component: {
    description: 'The "REFRESH" pill offered when a new build is cached. It fades in, rising 4px.',
    root: { box: { x: 60, y: 32, width: 120, height: 32 }, styles: { 'background-color': 'rgba(12, 10, 9, 0.6)', border: '1px solid rgba(232, 200, 106, 0.6)', 'border-radius': '20px', color: '#F0DCA6', 'font-size': '11.5px', 'font-weight': '600', 'letter-spacing': '2.3px', 'text-transform': 'uppercase' } },
    parts: [],
  },
  animations: [anim('root', 400, 'ease-out', ['opacity', 'transform'])],
  oracle: {
    html: '<button class="up" data-part="root">Refresh</button>',
    css: `.up{position:absolute;left:60px;top:32px;width:120px;height:32px;box-sizing:border-box;padding:0;background-color:rgba(12,10,9,.6);border:1px solid rgba(232,200,106,.6);border-radius:20px;color:#F0DCA6;font:600 11.5px/1 system-ui,sans-serif;letter-spacing:2.3px;text-transform:uppercase;animation:in 400ms ease-out both}
@keyframes in{from{opacity:0;transform:translateY(4px)}to{opacity:1;transform:none}}`,
  },
});

add({
  id: 'update-progress-track', tags: ['loader', 'app-css', 'landing', 'adapted'],
  source: 'app:assets/app.css .app-update-track (transition restated as a one-shot fill animation)',
  canvas: { width: 240, height: 60, background: '#050404' }, tokens: {},
  component: {
    description: 'Slim download progress track. The gold fill grows from the left edge to full width once.',
    root: { box: { x: 45, y: 29, width: 150, height: 2 }, styles: { 'background-color': 'rgba(214, 176, 98, 0.18)', 'border-radius': '2px' } },
    parts: [{ name: 'fill', box: { x: 45, y: 29, width: 150, height: 2 }, styles: { 'background-image': 'linear-gradient(90deg, #B98A33, #F2D894)' } }],
  },
  animations: [anim('fill', 1600, 'ease-out', ['transform'])],
  oracle: {
    html: '<div class="tr" data-part="root"><i data-part="fill"></i></div>',
    css: `.tr{position:absolute;left:45px;top:29px;width:150px;height:2px;border-radius:2px;background-color:rgba(214,176,98,.18);overflow:hidden}
.tr [data-part=fill]{position:absolute;inset:0;background-image:linear-gradient(90deg,#B98A33,#F2D894);transform-origin:0 50%;animation:fill 1600ms ease-out both}
@keyframes fill{from{transform:scaleX(0)}to{transform:scaleX(1)}}`,
  },
});

add({
  id: 'loader-seal', tags: ['loader', 'app-css', 'landing'],
  source: 'app:assets/app.css .r3-loader-seal + r3-loader-turn',
  canvas: { width: 240, height: 200, background: '#050404' }, tokens: {},
  component: {
    description: 'Loading seal: a gold-ringed circle with a serif monogram, and a dashed outer ring that turns slowly and continuously.',
    root: { box: { x: 78, y: 58, width: 84, height: 84 }, styles: { border: '1.5px solid rgba(214, 176, 98, 0.75)', 'border-radius': '50%' } },
    parts: [
      { name: 'ring', box: { x: 69, y: 49, width: 102, height: 102 }, styles: { border: '1px dashed rgba(214, 176, 98, 0.45)', 'border-radius': '50%' } },
      { name: 'mark', text: 'DR', styles: { color: '#D9B467', 'font-family': SERIF, 'font-size': '19px', 'font-weight': '700', 'letter-spacing': '1.5px' } },
    ],
  },
  animations: [loop('ring', 9000, 'linear', ['transform'])],
  oracle: {
    html: '<div class="sl" data-part="root"><span data-part="ring"></span><b data-part="mark">DR</b></div>',
    css: `.sl{position:absolute;left:78px;top:58px;width:84px;height:84px;box-sizing:border-box;display:grid;place-items:center;border:1.5px solid rgba(214,176,98,.75);border-radius:50%}
.sl [data-part=ring]{position:absolute;left:-10.5px;top:-10.5px;width:102px;height:102px;box-sizing:border-box;border:1px dashed rgba(214,176,98,.45);border-radius:50%;animation:turn 9000ms linear infinite}
.sl [data-part=mark]{color:#D9B467;font:700 19px/1 ${SERIF};letter-spacing:1.5px}
@keyframes turn{to{transform:rotate(360deg)}}`,
  },
});

add({
  id: 'loader-line', tags: ['loader', 'app-css', 'landing', 'adapted'],
  source: 'app:assets/app.css .r3-loader-line (background-position run restated as a moving streak)',
  canvas: { width: 200, height: 40, background: '#050404' }, tokens: {},
  component: {
    description: 'Hairline loader: a faint 96px line with a bright streak that runs across it from left to right and repeats. The streak is masked to the line.',
    root: { box: { x: 52, y: 20, width: 96, height: 1 }, styles: { 'background-color': 'rgba(214, 176, 98, 0.12)' } },
    parts: [{ name: 'streak', box: { x: 52, y: 20, width: 48, height: 1 }, styles: { 'background-image': 'linear-gradient(90deg, rgba(214, 176, 98, 0), rgba(214, 176, 98, 0.85), rgba(214, 176, 98, 0))' } }],
  },
  animations: [loop('streak', 1600, 'ease-in-out', ['transform'])],
  oracle: {
    html: '<div class="ln" data-part="root"><i data-part="streak"></i></div>',
    css: `.ln{position:absolute;left:52px;top:20px;width:96px;height:1px;background-color:rgba(214,176,98,.12);overflow:hidden}
.ln [data-part=streak]{position:absolute;left:0;top:0;width:48px;height:1px;background-image:linear-gradient(90deg,rgba(214,176,98,0),rgba(214,176,98,.85),rgba(214,176,98,0));animation:run 1600ms ease-in-out infinite}
@keyframes run{from{transform:translateX(-48px)}to{transform:translateX(96px)}}`,
  },
});

add({
  id: 'western-hero-ring', tags: ['reward', 'app-css', 'western', 'adapted'],
  source: 'app:assets/app.css western .hero-ring-circle heartbeat-pulse + hero-number-pulse (glow restated as a layer)',
  canvas: { width: 200, height: 200, background: '#0B0B0B' }, tokens: WEST,
  component: {
    description: 'Ready-count medallion: a blood-red disc with the count, beating with a double thump, while a red-to-gold glow behind it breathes on its own slightly faster cycle.',
    root: { box: { x: 54, y: 54, width: 92, height: 92 }, styles: { 'background-color': '{blood}', border: '3px solid {ink}', 'border-radius': '50%' } },
    parts: [
      { name: 'glow', box: { x: 38, y: 38, width: 124, height: 124 }, styles: { 'background-image': 'radial-gradient(circle, rgba(193, 18, 31, 0.42) 40%, rgba(255, 193, 7, 0) 70%)', 'border-radius': '50%' } },
      { name: 'count', text: '3', styles: { color: '{bone}', 'font-size': '32px', 'font-weight': '700' } },
    ],
  },
  animations: [loop('root', 2400, 'ease-in-out', ['transform']), loop('glow', 2200, 'ease-in-out', ['opacity'])],
  oracle: {
    html: '<div class="hr" data-part="root"><span data-part="glow"></span><span data-part="count">3</span></div>',
    css: `.hr{position:absolute;left:54px;top:54px;width:92px;height:92px;box-sizing:border-box;display:grid;place-items:center;background-color:#810000;border:3px solid #0B0B0B;border-radius:50%;animation:beat 2400ms ease-in-out infinite}
.hr [data-part=glow]{position:absolute;left:-19px;top:-19px;width:124px;height:124px;border-radius:50%;background-image:radial-gradient(circle,rgba(193,18,31,.42) 40%,rgba(255,193,7,0) 70%);animation:heat 2200ms ease-in-out infinite}
.hr [data-part=count]{position:relative;color:#E3DAC9;font:700 32px/1 system-ui,sans-serif}
@keyframes beat{0%,100%{transform:scale(1)}14%{transform:scale(1.12)}28%{transform:scale(1)}42%{transform:scale(1.08)}56%{transform:scale(1)}}
@keyframes heat{0%,100%{opacity:0}50%{opacity:1}}`,
  },
});

add({
  id: 'western-run-cta', tags: ['button', 'app-css', 'western'],
  source: 'app:assets/app.css western .hero-run-btn run-btn-breathe + run-chevron-nudge',
  canvas: { width: 300, height: 80, background: '#1A1410' }, tokens: WEST,
  component: {
    description: 'Boxless call to action: gold text with a hard offset shadow and a chevron at its right end. The label breathes (grows 11% from its left edge and back) while the chevron nudges right and brightens on its own faster cycle.',
    root: { box: { x: 20, y: 24, width: 220, height: 32 }, styles: {} },
    parts: [
      { name: 'label', text: "RUN TODAY'S DROPS", styles: { color: '{gold}', 'font-size': '15px', 'font-weight': '800', 'text-shadow': '1px 1px 0 {ink}' } },
      { name: 'chevron', text: '»', styles: { color: '{gold}', 'font-size': '15px', 'font-weight': '900' } },
    ],
  },
  animations: [loop('root', 2200, 'ease-in-out', ['transform']), loop('chevron', 1300, 'ease-in-out', ['transform', 'opacity'])],
  oracle: {
    html: '<button class="rc" data-part="root"><span data-part="label">RUN TODAY\'S DROPS</span><span data-part="chevron">»</span></button>',
    css: `.rc{position:absolute;left:20px;top:24px;width:220px;height:32px;box-sizing:border-box;padding:0;border:0;background:none;display:flex;align-items:center;gap:6px;font-family:system-ui,sans-serif;transform-origin:left center;animation:breathe 2200ms ease-in-out infinite}
.rc [data-part=label]{color:#FFC107;font-size:15px;font-weight:800;text-shadow:1px 1px 0 #0B0B0B;white-space:nowrap}
.rc [data-part=chevron]{color:#FFC107;font-size:15px;font-weight:900;animation:nudge 1300ms ease-in-out infinite}
@keyframes breathe{0%,100%{transform:scale(1)}50%{transform:scale(1.11)}}
@keyframes nudge{0%,100%{transform:translateX(0);opacity:.55}50%{transform:translateX(9px) scale(1.15);opacity:1}}`,
  },
});

add({
  id: 'western-collect-btn', tags: ['button', 'app-css', 'western', 'adapted'],
  source: 'app:assets/app.css western .btn-run-collect btn-collect-gleam (background-position sweep restated as a moving sheen layer)',
  canvas: { width: 320, height: 120, background: '#1A1410' }, tokens: WEST,
  component: {
    description: 'Hard-edged gold COLLECT button with a black border and offset shadow. A white sheen sweeps across the face from left to right and repeats, masked to the button.',
    root: { box: { x: 30, y: 34, width: 260, height: 52 }, styles: { 'background-color': '{gold}', border: '3px solid {ink}', 'box-shadow': '4px 4px 0 {ink}' } },
    parts: [
      { name: 'label', text: 'COLLECT', styles: { color: '{ink}', 'font-size': '16px', 'font-weight': '900', 'letter-spacing': '2px' } },
      { name: 'sheen', box: { x: 33, y: 37, width: 52, height: 46 }, styles: { 'background-image': 'linear-gradient(115deg, rgba(255, 255, 255, 0) 0%, rgba(255, 255, 255, 0.9) 50%, rgba(255, 255, 255, 0) 100%)' } },
    ],
  },
  animations: [loop('sheen', 1800, 'linear', ['transform'])],
  oracle: {
    html: '<button class="cl" data-part="root"><span data-part="sheen"></span><span data-part="label">COLLECT</span></button>',
    css: `.cl{position:absolute;left:30px;top:34px;width:260px;height:52px;box-sizing:border-box;padding:0;display:flex;align-items:center;justify-content:center;background-color:#FFC107;border:3px solid #0B0B0B;box-shadow:4px 4px 0 #0B0B0B;overflow:hidden}
.cl [data-part=label]{position:relative;color:#0B0B0B;font:900 16px/1 system-ui,sans-serif;letter-spacing:2px}
.cl [data-part=sheen]{position:absolute;left:0;top:0;width:52px;height:46px;background-image:linear-gradient(115deg,rgba(255,255,255,0) 0%,rgba(255,255,255,.9) 50%,rgba(255,255,255,0) 100%);animation:sweep 1800ms linear infinite}
@keyframes sweep{from{transform:translateX(-60px)}to{transform:translateX(270px)}}`,
  },
});

add({
  id: 'western-ember-burst', tags: ['reward', 'app-css', 'western'],
  source: 'app:assets/app.css western #emberField ember-burst',
  canvas: { width: 200, height: 160, background: '#0B0B0B' }, tokens: WEST,
  component: {
    description: 'Collect burst: three embers shoot up about 60px, drift right, shrink and fade, one after another 80ms apart.',
    root: { box: { x: 60, y: 40, width: 80, height: 100 }, styles: {} },
    parts: [
      { name: 'ember-1', box: { x: 80, y: 134, width: 3, height: 3 }, styles: { 'background-color': '{gold}', 'border-radius': '50%' } },
      { name: 'ember-2', box: { x: 99, y: 136, width: 3, height: 3 }, styles: { 'background-color': '{blood}', 'border-radius': '50%' } },
      { name: 'ember-3', box: { x: 118, y: 134, width: 3, height: 3 }, styles: { 'background-color': '{ember}', 'border-radius': '50%' } },
    ],
  },
  animations: [
    anim('ember-1', 600, 'ease-out', ['transform', 'opacity']),
    anim('ember-2', 600, 'ease-out', ['transform', 'opacity'], { delay_ms: 80 }),
    anim('ember-3', 600, 'ease-out', ['transform', 'opacity'], { delay_ms: 160 }),
  ],
  oracle: {
    html: '<div class="eb" data-part="root"><i data-part="ember-1"></i><i data-part="ember-2"></i><i data-part="ember-3"></i></div>',
    css: `.eb{position:absolute;left:60px;top:40px;width:80px;height:100px}
.eb i{position:absolute;width:3px;height:3px;border-radius:50%;animation:burst 600ms ease-out both}
.eb [data-part=ember-1]{left:20px;top:94px;background-color:#FFC107}
.eb [data-part=ember-2]{left:39px;top:96px;background-color:#810000;animation-delay:80ms}
.eb [data-part=ember-3]{left:58px;top:94px;background-color:#C16B2C;animation-delay:160ms}
@keyframes burst{from{transform:translate(0,0) scale(1);opacity:.95}to{transform:translate(14px,-60px) scale(.6);opacity:0}}`,
  },
});

add({
  id: 'western-splatter', tags: ['reward', 'app-css', 'western'],
  source: 'app:assets/app.css western collect flash splatter-burst',
  canvas: { width: 240, height: 160, background: '#0B0B0B' }, tokens: WEST,
  component: {
    description: 'Collect-flash splatter: a blood-red radial blot bursts in from a quarter size, overshoots to 120%, settles, then swells to 135% while fading out. Plays once.',
    root: { box: { x: 60, y: 50, width: 120, height: 60 }, styles: { 'background-image': 'radial-gradient(circle, rgb(129, 0, 0) 0%, rgba(129, 0, 0, 0) 70%)', 'border-radius': '50%' } },
    parts: [],
  },
  animations: [anim('root', 700, 'ease-out', ['opacity', 'transform'])],
  oracle: {
    html: '<div class="sp" data-part="root"></div>',
    css: `.sp{position:absolute;left:60px;top:50px;width:120px;height:60px;border-radius:50%;background-image:radial-gradient(circle,#810000 0%,rgba(129,0,0,0) 70%);animation:splat 700ms ease-out both}
@keyframes splat{0%{opacity:0;transform:scale(.25)}12%{opacity:1;transform:scale(1.2)}30%{opacity:1;transform:scale(1)}100%{opacity:0;transform:scale(1.35)}}`,
  },
});

add({
  id: 'coin-reward-pop', tags: ['reward', 'app-css', 'executive', 'derived'],
  source: 'app:assets/app.css --gold-metal fill, springy press curve, roll-rise',
  canvas: { width: 240, height: 140, background: '#050507' }, tokens: EXEC,
  component: {
    description: 'Reward trigger: a gold coin pops in with a springy overshoot, then the "+1.00 SC" amount rises 12px into place under it, starting 150ms later.',
    root: { box: { x: 70, y: 30, width: 100, height: 80 }, styles: {} },
    parts: [
      { name: 'coin', box: { x: 100, y: 34, width: 40, height: 40 }, styles: { 'background-image': '{gold-metal}', border: '2px solid #A87A22', 'border-radius': '50%' } },
      { name: 'amount', text: '+1.00 SC', styles: { color: '{gold}', 'font-family': MONO, 'font-size': '16px', 'font-weight': '700' } },
    ],
  },
  animations: [
    anim('coin', 420, 'cubic-bezier(0.34, 1.56, 0.64, 1)', ['transform', 'opacity']),
    anim('amount', 600, 'ease-out', ['transform', 'opacity'], { delay_ms: 150 }),
  ],
  oracle: {
    html: '<div class="cr" data-part="root"><i data-part="coin"></i><span data-part="amount">+1.00 SC</span></div>',
    css: `.cr{position:absolute;left:70px;top:30px;width:100px;height:80px}
.cr [data-part=coin]{position:absolute;left:30px;top:4px;width:40px;height:40px;box-sizing:border-box;border-radius:50%;border:2px solid #A87A22;background-image:linear-gradient(180deg,#F3DA92 0%,#D4AF37 48%,#A87A22 100%);animation:pop 420ms cubic-bezier(.34,1.56,.64,1) both}
.cr [data-part=amount]{position:absolute;left:0;right:0;top:54px;text-align:center;color:#D4AF37;font-family:${MONO};font-size:16px;font-weight:700;animation:rise 600ms ease-out 150ms both}
@keyframes pop{from{opacity:0;transform:scale(.6)}to{opacity:1;transform:scale(1)}}
@keyframes rise{from{opacity:0;transform:translateY(12px)}to{opacity:1;transform:none}}`,
  },
});

// --- write ---------------------------------------------------------------------

if (cases.length !== 30) throw new Error(`expected 30 cases, built ${cases.length}`);
mkdirSync(OUT, { recursive: true });
for (const { oracle, ...spec } of cases) {
  writeFileSync(join(OUT, `${spec.id}.json`), JSON.stringify(spec, null, 2) + '\n');
  writeFileSync(join(OUT, `${spec.id}.oracle.json`), JSON.stringify({ ...oracle, js: '' }, null, 2) + '\n');
}
console.log(`wrote ${cases.length} cases to ${OUT}`);
