// The homes' music: for each, three loops of one piece - Base (sparse,
// idle), Main (the groove) and Lift (the top line, for a collect or a rare
// card) - all 16 bars at one tempo and in one key (the takes were stretched
// to one tempo and kick-aligned), cut to the SAME sample length and started
// on one clock, so they stay locked bar for bar. A
// change of layer is a change of volume only: the layer coming in fades up
// over two bars while the one going out fades down - a LINEAR fade, since
// the layers are takes of one piece and add up in phase (an equal-power
// fade swells 3 dB in the middle on correlated material: the hiccup you
// hear as the Hi line coming back quieter) - and each fade starts on the
// next beat rather than mid-beat.
//
// Pieces (PIECES below):
//   card  - R x R, 119.73 BPM in D: the card table's lounge loop.
//   study - Sifsi, 82.12 BPM in F minor, a 3-3-2 shuffle: the study's. Base
//           is the Remix with its drums and vocals taken out (the stems:
//           synth, keys, strings, guitar, crackle, and the bass smoothed so
//           it holds its notes), Main the Remix, Lift Remix III.
//   wtgf  - West Texas Gore Fest's slaughter floor: a southern-gothic
//           stomp, 75 BPM in E minor (the kick on 1 and 3, half-time).
//           Main is the take, Lift its remix (brighter, harder), Base Main's
//           stems without drums or percussion, the kick-locked duck on the
//           bass and guitar lifted out so it holds steady.
// Files: assets/intro3d/rare/music/<piece>-{base,main,lift}.mp3 - fetched
// the first time the home is taken and kept by the service worker from then
// on, like the rare tiers' extras (so an install does not carry them).
//
// Browsers hold a page silent until it is tapped. The table is reached by a
// tap (take your seat), and the context is created in that gesture when it
// can be; if it still arrives suspended, the next tap or key anywhere
// resumes it (see unlock below).
//
// One home's piece into the next (a change of skin): the two are different
// tempos, so there is no beat to meet on - the outgoing piece plays on until
// the incoming one is loaded, then one fades down as the other fades up, an
// EQUAL-POWER fade this time (two different pieces don't add up in phase: a
// linear fade would dip in the middle). Every piece plays on one shared
// context, so the incoming one starts on a context the browser already let
// play - one made after an await, away from the tap, would be held silent.
//
// createMusic(opts) -> api
//   opts.piece  - 'card' (default) | 'study' | 'wtgf'
//   opts.base   - URL base the file names are resolved against
//   opts.gain   - master level (0..1); the loops sit at about -16 dBFS RMS,
//                 so this is kept low to live under the UI
//   opts.fadeIn - seconds to fade up over when it starts (0: at once)
//   opts.onState(state) - 'loading' | 'ready' | 'suspended' | 'failed'
// api.start()            fetch, decode and start all three (silent until a
//                        layer is set); safe to call again
// api.layer(name)        'base' | 'main' - the layer to settle on
// api.lift(bars)         Lift for `bars` bars (default 4), then back to the
//                        layer set by layer()
// api.active()           the layer playing (or fading in)
// api.mute(on)           silence without stopping the clock
// api.muted              whether muted
// api.suspend()/resume() for the page going to the background and back
// api.dispose(fade)      stop and release everything, fading down over
//                        `fade` seconds first (default: a short fade)

// Each piece: its loops, tempo and the exact sample count of every loop (at
// 48 kHz), and each layer's trim so the three read as one piece at one level.
// A replacement loop must keep its piece's tempo, key and sample count, or
// all three must change together.
export const PIECES = {
  card: {
    files: { base: 'rare/music/rxr-base.mp3', main: 'rare/music/rxr-main.mp3', lift: 'rare/music/rxr-lift.mp3' },
    bpm: 119.728, loopSamples: 1539494,        // 32.073 s, 16 bars
    trim: { base: 0.9, main: 1.0, lift: 1.0 }
  },
  study: {
    files: { base: 'rare/music/sifsi-base.mp3', main: 'rare/music/sifsi-main.mp3', lift: 'rare/music/sifsi-lift.mp3' },
    bpm: 82.117, loopSamples: 2244649,         // 46.764 s, 16 bars (a beat is four 16ths of 0.18267 s)
    trim: { base: 1.0, main: 0.9, lift: 0.85 }    // (Base sits 4 dB under the full takes as cut; Lift is the hotter take)
  },
  wtgf: {
    files: { base: 'rare/music/wtgf-base.mp3', main: 'rare/music/wtgf-main.mp3', lift: 'rare/music/wtgf-lift.mp3' },
    bpm: 75, loopSamples: 2457600,             // 51.200 s, 16 bars
    trim: { base: 1.0, main: 1.0, lift: 1.0 }     // (levelled as cut: Base 4 dB under Main and Lift)
  }
};
// (the card table's, for anything that reads the tempo)
export const BPM = PIECES.card.bpm;
export const BEAT = 60 / BPM;                 // 0.50114 s
export const BAR = BEAT * 4;
export const LOOP_SAMPLES = PIECES.card.loopSamples;
export const LOOP_SECONDS = LOOP_SAMPLES / 48000;
// LAME's encoder delay (576) plus the decoder's (529), in case a decoder
// returns the padding instead of trimming it by the Info tag (Chrome,
// Firefox and Safari all trim; this is the fallback).
const MP3_DELAY = 1105 / 48000;
const FADE_BARS = 2;

// The one context every piece plays on, and how many are using it.
const shared = { ctx: null, users: 0 };
// An equal-power fade from `from` to `to` (see above), as a gain curve.
const fadeCurve = (from, to, n = 64) => {
  const a = new Float32Array(n);
  for (let i = 0; i < n; i++) {
    const t = i / (n - 1);
    a[i] = to > from ? from + (to - from) * Math.sin(t * Math.PI / 2) : to + (from - to) * Math.cos(t * Math.PI / 2);
  }
  return a;
};
const holdAt = (p, t) => {
  if (p.cancelAndHoldAtTime) { try { p.cancelAndHoldAtTime(t); return; } catch (e) { /* fall through */ } }
  const v = p.value;
  p.cancelScheduledValues(t);
  p.setValueAtTime(v, t);
};
// Fade a gain to `to` over `dur` seconds from `at` (from where it stands).
const fadeGain = (c, p, to, at, dur) => {
  const t = Math.max(at, c.currentTime + 0.005);
  holdAt(p, c.currentTime);
  const from = p.value;
  try { p.setValueCurveAtTime(fadeCurve(from, to), t, dur); }
  catch (e) { p.setValueAtTime(from, t); p.linearRampToValueAtTime(to, t + dur); }
};

export function createMusic(opts = {}) {
  const o = Object.assign({ piece: 'card', base: './assets/intro3d/', gain: 0.42, fadeIn: 0, onState: null }, opts);
  const piece = PIECES[o.piece] || PIECES.card;
  const FILES = piece.files, TRIM = piece.trim;
  const BEAT = 60 / piece.bpm, BAR = BEAT * 4, LOOP_SECONDS = piece.loopSamples / 48000;
  const AC = window.AudioContext || window.webkitAudioContext;
  let ctx = null, master = null, fader = null, onCtxState = null;
  const layers = {};        // name -> { buf, src, gain, level }
  let started = false, startAt = 0, disposed = false;
  let want = 'base';        // the layer to settle on
  let lifting = null;       // timeout back from Lift
  let current = null;       // the layer up (or on its way up)
  let muted = false, hiddenPause = false;
  let loading = null;
  const tell = s => { if (o.onState) try { o.onState(s); } catch (e) { /* theirs */ } };

  // The layers go through the master (the level, and mute) and then this
  // piece's fader (its fade in and out) to the shared context.
  const makeCtx = () => {
    if (ctx || !AC) return;
    if (!shared.ctx || shared.ctx.state === 'closed') {
      shared.ctx = null; shared.users = 0;
      try { shared.ctx = new AC({ latencyHint: 'playback' }); } catch (e) { try { shared.ctx = new AC(); } catch (e2) { shared.ctx = null; } }
    }
    if (!shared.ctx) return;
    ctx = shared.ctx;
    shared.users++;
    master = ctx.createGain();
    master.gain.value = muted ? 0 : o.gain;
    fader = ctx.createGain();
    fader.gain.value = o.fadeIn > 0 ? 0 : 1;
    master.connect(fader); fader.connect(ctx.destination);
    const c = ctx;
    onCtxState = () => { if (ctx === c) tell(c.state === 'running' ? 'ready' : 'suspended'); };
    c.addEventListener('statechange', onCtxState);
  };

  // The next tap or key anywhere starts a context the browser is holding.
  const UNLOCK_ON = ['pointerup', 'touchend', 'click', 'keydown'];
  const dropUnlock = () => UNLOCK_ON.forEach(t => window.removeEventListener(t, unlock, true));
  const unlock = () => {
    if (!ctx || ctx.state !== 'suspended' || hiddenPause) { if (!ctx || ctx.state === 'running') dropUnlock(); return; }
    ctx.resume().then(() => dropUnlock()).catch(() => { /* not a gesture the browser counts: the next one */ });
  };
  const armUnlock = () => { if (ctx && ctx.state !== 'running') UNLOCK_ON.forEach(t => window.addEventListener(t, unlock, true)); };

  const fetchAll = () => Promise.all(Object.keys(FILES).map(name => fetch(new URL(FILES[name], new URL(o.base, document.baseURI)).href)
    .then(r => { if (!r.ok) throw new Error(name + ' ' + r.status); return r.arrayBuffer(); })
    .then(bytes => new Promise((res, rej) => {
      // (the callback form: Safari's promise form is newer)
      const p = ctx.decodeAudioData(bytes, res, rej);
      if (p && p.catch) p.catch(rej);
    }))
    .then(buf => { layers[name] = { buf, src: null, gain: null, level: 0 }; })));

  // All three on one clock, looping over exactly the same stretch.
  const begin = () => {
    if (started || disposed) return;
    started = true;
    const when = ctx.currentTime + 0.08;
    startAt = when;
    Object.keys(layers).forEach(name => {
      const L = layers[name];
      const src = ctx.createBufferSource();
      src.buffer = L.buf;
      src.loop = true;
      // A decoder that kept the MP3 padding leaves a buffer longer than the
      // loop: the loop is then the stretch after the encoder delay. One
      // that trimmed it leaves the loop exactly (to the resampling).
      const extra = L.buf.duration - LOOP_SECONDS;
      src.loopStart = extra > 0.01 ? MP3_DELAY : 0;
      src.loopEnd = src.loopStart + Math.min(LOOP_SECONDS, L.buf.duration - src.loopStart);
      const g = ctx.createGain();
      g.gain.value = 0;
      src.connect(g); g.connect(master);
      src.start(when, src.loopStart);
      L.src = src; L.gain = g;
    });
    // (the layer asked for while loading)
    const first = current || want;
    current = null;
    set(first, true);
    if (o.fadeIn > 0) fadeGain(ctx, fader.gain, 1, when, o.fadeIn);
  };

  // The next beat from now (a fade starts on a beat, not between two).
  const nextBeat = () => {
    const now = ctx.currentTime;
    if (now < startAt) return startAt;
    const k = Math.ceil((now - startAt) / BEAT + 1e-4);
    return startAt + k * BEAT;
  };

  // Bring `name` up and the others down over two bars (or at once, at the
  // start). A fade already running is held where it is and continued from
  // there (cancelAndHoldAtTime; cancelScheduledValues alone can snap a
  // ramp back to where it began).
  const hold = holdAt;
  const set = (name, now) => {
    if (!started || !layers[name] || current === name) return;
    current = name;
    const t0 = now ? ctx.currentTime : nextBeat();
    const dur = now ? 0.02 : FADE_BARS * BAR;
    Object.keys(layers).forEach(n => {
      const L = layers[n], p = L.gain.gain;
      const to = n === name ? TRIM[n] : 0;
      if (L.level === to) return;
      const tc = ctx.currentTime;
      hold(p, tc);
      p.setValueAtTime(p.value, Math.max(tc, t0 - 0.001));
      p.linearRampToValueAtTime(to, t0 + dur);
      L.level = to;
    });
  };

  const api = {
    get muted() { return muted; },
    get ready() { return started; },
    get piece() { return o.piece; },
    active() { return current; },
    start() {
      if (disposed) return Promise.resolve(false);
      if (loading) return loading;
      makeCtx();
      if (!ctx) { tell('failed'); return Promise.resolve(false); }
      tell('loading');
      armUnlock();
      loading = fetchAll().then(() => { if (!disposed) begin(); tell(ctx.state === 'running' ? 'ready' : 'suspended'); return true; })
        .catch(e => { console.warn('music', e); tell('failed'); return false; });
      return loading;
    },
    layer(name) {
      if (name !== 'base' && name !== 'main') return;
      want = name;
      if (lifting) return;        // (after the Lift)
      if (started) set(name); else current = name;
    },
    lift(bars) {
      if (!started) return;
      if (lifting) clearTimeout(lifting);
      set('lift');
      const hold = ((bars || 4) + FADE_BARS) * BAR * 1000;
      lifting = setTimeout(() => { lifting = null; set(want); }, hold);
    },
    mute(on) {
      muted = !!on;
      if (!master || !ctx) return;
      master.gain.cancelScheduledValues(0);
      master.gain.setTargetAtTime(muted ? 0 : o.gain, ctx.currentTime, 0.05);
    },
    suspend() { hiddenPause = true; if (ctx && ctx.state === 'running') ctx.suspend().catch(() => {}); },
    resume() { hiddenPause = false; if (ctx && ctx.state === 'suspended') { ctx.resume().catch(() => {}); armUnlock(); } },
    dispose(fade) {
      if (disposed) return;
      disposed = true;
      dropUnlock();
      if (lifting) clearTimeout(lifting);
      lifting = null;
      if (!ctx) return;
      const c = ctx, f = fader, out = fade > 0 ? fade : 0;
      ctx = null;
      c.removeEventListener('statechange', onCtxState);
      try {
        if (out) fadeGain(c, f.gain, 0, c.currentTime, out);
        else { master.gain.cancelScheduledValues(0); master.gain.setTargetAtTime(0, c.currentTime, 0.08); }
      } catch (e) { /* gone */ }
      // (the context is closed with the last piece on it - not under one
      // that is still fading up)
      setTimeout(() => {
        Object.keys(layers).forEach(n => { try { if (layers[n].src) layers[n].src.stop(); } catch (e) { /* stopped */ } });
        try { f.disconnect(); } catch (e) { /* gone */ }
        if (shared.ctx === c && --shared.users <= 0) {
          shared.ctx = null; shared.users = 0;
          try { c.close(); } catch (e) { /* closed */ }
        }
      }, out * 1000 + 400);
    }
  };
  return api;
}
