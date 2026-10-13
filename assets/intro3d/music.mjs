// The card table's music: three loops of the same piece - Base (sparse,
// idle), Main (the groove) and Lift (the trumpet up, for a collect or a
// rare card) - all 16 bars at 119.73 BPM in D (the takes were stretched to
// one tempo and kick-aligned), cut to the SAME sample length and started
// on one clock, so they stay locked bar for bar. A
// change of layer is a change of volume only: the layer coming in fades up
// over two bars while the one going out fades down - a LINEAR fade, since
// the layers are takes of one piece and add up in phase (an equal-power
// fade swells 3 dB in the middle on correlated material: the hiccup you
// hear as the Hi line coming back quieter) - and each fade starts on the
// next beat rather than mid-beat.
//
// Files: assets/intro3d/rare/music/rxr-{base,main,lift}.mp3 - fetched the
// first time the table is taken and kept by the service worker from then
// on, like the rare tiers' extras (so an install does not carry them).
//
// Browsers hold a page silent until it is tapped. The table is reached by a
// tap (take your seat), and the context is created in that gesture when it
// can be; if it still arrives suspended, the next tap or key anywhere
// resumes it (see unlock below).
//
// createMusic(opts) -> api
//   opts.base   - URL base the file names are resolved against
//   opts.gain   - master level (0..1); the loops sit at about -16 dBFS RMS,
//                 so this is kept low to live under the UI
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
// api.dispose()          stop and release everything

const FILES = { base: 'rare/music/rxr-base.mp3', main: 'rare/music/rxr-main.mp3', lift: 'rare/music/rxr-lift.mp3' };
export const BPM = 119.728;
export const BEAT = 60 / BPM;                 // 0.50114 s
export const BAR = BEAT * 4;
export const LOOP_SAMPLES = 1539494;          // every loop, at 48 kHz
export const LOOP_SECONDS = LOOP_SAMPLES / 48000;   // 32.073 s, 16 bars
// LAME's encoder delay (576) plus the decoder's (529), in case a decoder
// returns the padding instead of trimming it by the Info tag (Chrome,
// Firefox and Safari all trim; this is the fallback).
const MP3_DELAY = 1105 / 48000;
const FADE_BARS = 2;
// Each layer's trim, so the three read as one piece at one level.
const TRIM = { base: 0.9, main: 1.0, lift: 1.0 };

export function createMusic(opts = {}) {
  const o = Object.assign({ base: './assets/intro3d/', gain: 0.42, onState: null }, opts);
  const AC = window.AudioContext || window.webkitAudioContext;
  let ctx = null, master = null;
  const layers = {};        // name -> { buf, src, gain, level }
  let started = false, startAt = 0, disposed = false;
  let want = 'base';        // the layer to settle on
  let lifting = null;       // timeout back from Lift
  let current = null;       // the layer up (or on its way up)
  let muted = false, hiddenPause = false;
  let loading = null;
  const tell = s => { if (o.onState) try { o.onState(s); } catch (e) { /* theirs */ } };

  const makeCtx = () => {
    if (ctx || !AC) return;
    try { ctx = new AC({ latencyHint: 'playback' }); } catch (e) { try { ctx = new AC(); } catch (e2) { ctx = null; } }
    if (!ctx) return;
    master = ctx.createGain();
    master.gain.value = muted ? 0 : o.gain;
    master.connect(ctx.destination);
    const c = ctx;
    c.onstatechange = () => { if (ctx === c) tell(c.state === 'running' ? 'ready' : 'suspended'); };
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
  const hold = (p, t) => {
    if (p.cancelAndHoldAtTime) { try { p.cancelAndHoldAtTime(t); return; } catch (e) { /* fall through */ } }
    const v = p.value;
    p.cancelScheduledValues(t);
    p.setValueAtTime(v, t);
  };
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
    dispose() {
      disposed = true;
      dropUnlock();
      if (lifting) clearTimeout(lifting);
      lifting = null;
      if (!ctx) return;
      const t = ctx.currentTime;
      try { master.gain.cancelScheduledValues(0); master.gain.setTargetAtTime(0, t, 0.08); } catch (e) { /* gone */ }
      const c = ctx;
      ctx = null;
      c.onstatechange = null;
      setTimeout(() => {
        Object.keys(layers).forEach(n => { try { if (layers[n].src) layers[n].src.stop(); } catch (e) { /* stopped */ } });
        try { c.close(); } catch (e) { /* closed */ }
      }, 400);
    }
  };
  return api;
}
