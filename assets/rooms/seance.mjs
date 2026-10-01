// assets/rooms/seance.mjs
// Dead Channel's payout: the séance. When a Daily Run is finished, the set
// loses the channel, the snow comes up, and out of it a spirit locks in -
// first behind the glass, then through it. It hangs there over your deck
// until the next touch, when the set is switched off under it: the picture
// folds to a line, the line to a dot, the dot fades.
//
// Held to a real maker: a 1970s console television on a dead channel,
// tuned by hand - the vertical hold slipping and catching, the colour
// convergence out and coming in, the tube's phosphor holding a trace of
// what it showed a moment ago; and the spirit, a scratchboard engraving
// (spirit.mjs).
// - Across the room: the screen's snow, the head swelling out of it, and
//   the smoke it brings spilling past the edges of the glass.
// - At arm's length: while it is behind the glass it is under the tube's
//   scanlines and the glass's sheen; its red and blue images are apart and
//   close up as it locks in; once through, it is clean, and it throws a
//   soft shadow down and to the right onto the glass (the lamp is above
//   left, in front).
// - Pinched in 3x: the snow is grain, not blur; the tear lines are one
//   row high; the smoke is layered wisps, each with its own shadow.
// Motion: the hold slips, overshoots and catches; the lock-in is stepped at
// the set's field rate (it is a picture on a tube); the push through the
// glass eases in, overshoots a hair and settles; at rest it breathes. The
// switch-off is the tube's own: fast, bright, then gone.
//
// Pure 2D canvas: one layer over the app, under every sheet.

import { spiritCanvas, SPIRIT_SIZE, HEAD_BOX } from './spirit.mjs';

// the face's middle on the plate (between the eyes and the mouth)
const FACE = { x: HEAD_BOX.x + HEAD_BOX.w * 0.5, y: HEAD_BOX.y + HEAD_BOX.h * 0.45 };

const T = { jolt: 360, snow: 900, lock: 2600, push: 4200, off: 900 };
const rngOf = seed => { let s = (seed >>> 0) || 7; return () => { s ^= s << 13; s >>>= 0; s ^= s >>> 17; s ^= s << 5; s >>>= 0; return s / 4294967296; }; };
const clamp01 = v => Math.max(0, Math.min(1, v));
const smooth = v => { v = clamp01(v); return v * v * (3 - 2 * v); };
// ease in, overshoot a hair, settle
const push = v => {
  v = clamp01(v);
  const c1 = 1.1, c3 = c1 + 1, u = v - 1;
  return 1 + c3 * u * u * u + c1 * u * u;
};

export function createBreakout() {
  let state = 'idle', raf = 0, t0 = 0, offT0 = 0, afterOff = null;
  let cv = null, ctx = null, W = 0, H = 0, dpr = 1;
  let spirit = null, red = null, blue = null, soft = null, softDark = null;
  let snowTiles = [], wisps = [], wispsDark = [], smoke = [], seed = 1, r = Math.random;
  let fit = null;           // where the spirit sits: x, y, w, h (css px)
  const work = document.createElement('canvas'), wctx = work.getContext('2d');
  const mask = document.createElement('canvas'), mctx = mask.getContext('2d');

  // ---- made once per play (the spirit is drawn fresh each time: a new seed)
  // a copy in one colour: by its shape (for shadows), or by its light (for
  // the convergence's red and blue images: the ink stays black, so drawn
  // additively it adds nothing)
  function tinted(src, color, byLight) {
    const c = document.createElement('canvas');
    c.width = src.width; c.height = src.height;
    const x = c.getContext('2d');
    if (byLight) {
      // (its alpha is its light: the ink and the ground both go)
      x.drawImage(src, 0, 0);
      const img = x.getImageData(0, 0, c.width, c.height), d = img.data;
      const n = parseInt(color.slice(1), 16), cr = n >> 16, cg = (n >> 8) & 255, cb = n & 255;
      for (let i = 0; i < d.length; i += 4) {
        const l = Math.max(d[i], d[i + 1], d[i + 2]) * d[i + 3] / 255;
        d[i] = cr; d[i + 1] = cg; d[i + 2] = cb; d[i + 3] = l;
      }
      x.putImageData(img, 0, 0);
      return c;
    }
    x.drawImage(src, 0, 0);
    x.globalCompositeOperation = 'source-in';
    x.fillStyle = color; x.fillRect(0, 0, c.width, c.height);
    return c;
  }
  function makeSnow() {
    // four tiles of grain at half a css pixel, cycled a field at a time
    snowTiles = [];
    for (let k = 0; k < 4; k++) {
      const c = document.createElement('canvas'); c.width = 192; c.height = 192;
      const x = c.getContext('2d'), img = x.createImageData(192, 192), d = img.data;
      for (let i = 0; i < d.length; i += 4) {
        const v = Math.random();
        // (analog snow: mostly dark, sparse bright grains, a cold cast)
        const b = v < 0.62 ? v * 90 : 60 + (v - 0.62) * 510;
        d[i] = b * 0.94; d[i + 1] = b * 0.97; d[i + 2] = Math.min(255, b * 1.05); d[i + 3] = 255;
      }
      x.putImageData(img, 0, 0);
      snowTiles.push(c);
    }
  }
  function makeWisps() {
    // soft smoke wisps: noise shaped into a torn plume, drawn once
    wisps = []; wispsDark = [];
    for (let k = 0; k < 5; k++) {
      const S = 220, c = document.createElement('canvas'); c.width = c.height = S;
      const x = c.getContext('2d');
      for (let i = 0; i < 70; i++) {
        const a = r() * Math.PI * 2, d = Math.pow(r(), 0.7) * S * 0.34;
        const px = S / 2 + Math.cos(a) * d * 1.3, py = S / 2 + Math.sin(a) * d * 0.7;
        const rad = 10 + r() * 34;
        const g = x.createRadialGradient(px, py, 0, px, py, rad);
        const al = 0.06 + r() * 0.07;
        g.addColorStop(0, `rgba(214,220,230,${al})`); g.addColorStop(1, 'rgba(214,220,230,0)');
        x.fillStyle = g; x.beginPath(); x.arc(px, py, rad, 0, Math.PI * 2); x.fill();
      }
      wisps.push(c);
      wispsDark.push(tinted(c, 'rgba(0,0,0,0.5)'));
    }
  }
  function size() {
    dpr = Math.min(2, window.devicePixelRatio || 1);
    W = window.innerWidth; H = window.innerHeight;
    cv.width = Math.round(W * dpr); cv.height = Math.round(H * dpr);
    work.width = cv.width; work.height = cv.height;
    // the spirit fills the height of the glass, a little left of centre
    // (its locks stream off to the right)
    const h = Math.min(H * 0.94, W * 1.55), w = h * SPIRIT_SIZE.w / SPIRIT_SIZE.h;
    const fx = FACE.x / SPIRIT_SIZE.w, fy = FACE.y / SPIRIT_SIZE.h;
    fit = { w, h, x: W / 2 - w * fx, y: H * 0.44 - h * fy, fx, fy };
  }

  // ---- the frame
  function snowLayer(alpha, field, slip) {
    if (alpha <= 0.003) return;
    const tile = snowTiles[field % snowTiles.length];
    ctx.save();
    ctx.globalAlpha = alpha;
    ctx.imageSmoothingEnabled = false;
    const S = 192 * 2 * dpr / 2;   // a grain is half a css pixel... drawn a css pixel square
    const oy = ((slip % S) + S) % S;
    for (let y = -S; y < cv.height + S; y += S) for (let x = 0; x < cv.width; x += S) ctx.drawImage(tile, x, y + oy, S, S);
    ctx.restore();
  }
  // the spirit composed into the work canvas: its reveal (blocks of the
  // picture arriving out of the snow), its convergence (red and blue images
  // apart), and its scale about its own centre
  let composed = '', lastBox = null, maskStep = -1;
  function composeSpirit(reveal, conv, scale, glow) {
    const key = reveal.toFixed(3) + '|' + conv.toFixed(1) + '|' + scale.toFixed(4) + '|' + glow.toFixed(2);
    if (key === composed && lastBox) return lastBox;
    composed = key;
    wctx.setTransform(1, 0, 0, 1, 0, 0);
    wctx.clearRect(0, 0, work.width, work.height);
    // (scaled about the face: it comes toward you face first)
    const k = dpr * scale;
    const cx = (fit.x + fit.w * fit.fx) * dpr, cy = (fit.y + fit.h * fit.fy) * dpr;
    const w = fit.w * k, h = fit.h * k, x = cx - w * fit.fx, y = cy - h * fit.fy;
    wctx.globalCompositeOperation = 'lighter';
    if (conv > 0.2) {
      wctx.globalAlpha = 0.55;
      wctx.drawImage(red, x - conv * dpr, y, w, h);
      wctx.drawImage(blue, x + conv * dpr, y + conv * 0.25 * dpr, w, h);
    }
    wctx.globalAlpha = conv > 0.2 ? 0.8 : 1;
    wctx.drawImage(spirit, x, y, w, h);
    if (glow > 0) {
      // the phosphor's bloom round the brightest cuts (a small copy drawn
      // large is its own blur, on every browser)
      wctx.globalAlpha = glow;
      wctx.drawImage(soft, x, y, w, h);
    }
    wctx.globalAlpha = 1;
    wctx.globalCompositeOperation = 'source-over';
    lastBox = { x, y, w, h };
    if (reveal < 1) {
      // blocks arriving: a coarse grid, each block in once its number is up
      const B = 7 * dpr, cols = Math.ceil(work.width / B), rows = Math.ceil(work.height / B);
      if (maskStep !== reveal || mask.width !== cols || mask.height !== rows) {
        maskStep = reveal;
        if (mask.width !== cols || mask.height !== rows) { mask.width = cols; mask.height = rows; }
        const img = mctx.createImageData(cols, rows), d = img.data;
        const rr = rngOf(seed * 31 + 7);
        for (let i = 0; i < cols * rows; i++) {
          const th = rr();
          // (rows arrive in bands, as a picture does when the hold catches)
          const band = Math.sin((Math.floor(i / cols) / rows) * 18 + seed) * 0.12;
          d[i * 4 + 3] = th + band < reveal ? 255 : 0;
        }
        mctx.putImageData(img, 0, 0);
      }
      wctx.globalCompositeOperation = 'destination-in';
      wctx.imageSmoothingEnabled = false;
      wctx.drawImage(mask, 0, 0, cols * B, rows * B);
      wctx.imageSmoothingEnabled = true;
      wctx.globalCompositeOperation = 'source-over';
    }
    return lastBox;
  }
  // draw the work canvas to the screen in slices, each row band shifted by
  // the hold's slip (a sine down the picture, and a tear here and there)
  function blitWobbly(amp, t, alpha) {
    const band = 5 * dpr;
    ctx.globalAlpha = alpha;
    if (amp < 0.5) { ctx.drawImage(work, amp * Math.sin(t / 700) * dpr, 0); ctx.globalAlpha = 1; return; }
    for (let y = 0; y < work.height; y += band) {
      let dx = amp * Math.sin(y / (38 * dpr) + t / 140) * dpr;
      if (amp > 1.5 && ((y / band + Math.floor(t / 90)) % 23) === 0) dx += amp * 2.4 * dpr * (r() - 0.5);
      ctx.drawImage(work, 0, y, work.width, band, dx, y, work.width, band);
    }
    ctx.globalAlpha = 1;
  }
  function scanlines(alpha) {
    if (alpha <= 0.01) return;
    ctx.save();
    ctx.globalAlpha = alpha;
    ctx.fillStyle = '#000';
    const step = 3 * dpr;
    for (let y = 0; y < cv.height; y += step) ctx.fillRect(0, y, cv.width, dpr);
    // the glass's sheen: the lamp caught top left on the curved face
    const g = ctx.createRadialGradient(cv.width * 0.18, cv.height * 0.1, 0, cv.width * 0.18, cv.height * 0.1, cv.width * 0.7);
    g.addColorStop(0, 'rgba(230,236,245,0.10)'); g.addColorStop(0.4, 'rgba(230,236,245,0.03)'); g.addColorStop(1, 'rgba(230,236,245,0)');
    ctx.fillStyle = g; ctx.fillRect(0, 0, cv.width, cv.height);
    ctx.restore();
  }
  function spawnSmoke(n, box) {
    for (let i = 0; i < n; i++) {
      // from behind the head's shoulders and the screen's edges, out over
      // the glass
      const fromEdge = r() < 0.45;
      const x = fromEdge ? (r() < 0.5 ? -40 : W + 40) : box.x / dpr + box.w / dpr * (0.2 + r() * 0.6);
      const y = fromEdge ? H * (0.25 + r() * 0.7) : box.y / dpr + box.h / dpr * (0.55 + r() * 0.4);
      const dir = fromEdge ? (x < 0 ? 1 : -1) : (r() < 0.5 ? -1 : 1);
      const wi = Math.floor(r() * wisps.length);
      smoke.push({ x, y, vx: dir * (18 + r() * 40), vy: -8 - r() * 22, s: 0.5 + r() * 0.9, grow: 0.12 + r() * 0.2, a: 0, life: 0, max: 2.8 + r() * 2.6, rot: r() * 6.28, vr: (r() - 0.5) * 0.3, img: wisps[wi], dark: wispsDark[wi] });
    }
  }
  function drawSmoke(dt, rest) {
    ctx.save();
    for (let i = smoke.length - 1; i >= 0; i--) {
      const p = smoke[i];
      p.life += dt;
      if (p.life > p.max && !rest) { smoke.splice(i, 1); continue; }
      const u = p.life / p.max;
      p.x += p.vx * dt * (rest ? 0.25 : 1); p.y += p.vy * dt * (rest ? 0.25 : 1);
      p.vx *= 0.995; p.rot += p.vr * dt;
      const a = rest ? Math.min(0.9, p.a + dt * 0.2) : Math.sin(Math.PI * clamp01(u)) * 0.9;
      p.a = a;
      const S = 220 * (p.s + p.grow * p.life) * dpr;
      // its shadow on the glass: down and right of it, darker, softer
      ctx.globalAlpha = a * 0.7;
      ctx.globalCompositeOperation = 'source-over';
      ctx.setTransform(1, 0, 0, 1, (p.x + 14) * dpr, (p.y + 20) * dpr);
      ctx.rotate(p.rot);
      ctx.drawImage(p.dark, -S / 2, -S / 2, S, S);
      ctx.globalCompositeOperation = 'screen';
      ctx.globalAlpha = a;
      ctx.setTransform(1, 0, 0, 1, p.x * dpr, p.y * dpr);
      ctx.rotate(p.rot);
      ctx.drawImage(p.img, -S / 2, -S / 2, S, S);
    }
    ctx.restore();
  }

  let last = 0, field = 0, fieldT = 0, rested = false;
  function frame(now) {
    raf = requestAnimationFrame(frame);
    const t = now - t0, dt = Math.min(0.05, (now - (last || now)) / 1000);
    last = now;
    // the set's fields: the snow and the lock-in step at 30 a second
    if (now - fieldT > 33) { field++; fieldT = now; }
    ctx.setTransform(1, 0, 0, 1, 0, 0);
    ctx.clearRect(0, 0, cv.width, cv.height);

    if (state === 'off') { switchOff(now - offT0); return; }

    const tJ = T.jolt, tS = T.snow, tL = T.lock, tP = T.push;
    // the snow: up over the jolt, thick while the spirit locks in, thinning
    // as it comes through
    const snowA = t < tJ ? 0.25 * (t / tJ) : t < tS ? 0.25 + 0.35 * smooth((t - tJ) / (tS - tJ)) : t < tL ? 0.6 - 0.12 * smooth((t - tS) / (tL - tS)) : 0.48 - 0.3 * smooth((t - tL) / (tP - tL));
    const slip = t < tL ? (t / 3) * (1 - smooth((t - tS) / (tL - tS))) * 6 : 0;
    snowLayer(snowA * (0.9 + 0.1 * Math.sin(field)), field, slip);
    if (t < tS) { scanlines(0.35); return; }

    // the lock-in, then the push through the glass
    const lockU = clamp01((t - tS) / (tL - tS));
    const lockStep = Math.floor(lockU * 16) / 16;          // stepped: field by field
    const pushU = clamp01((t - tL) / (tP - tL));
    const breathe = state === 'resting' ? Math.sin(now / 1400) * 0.006 : 0;
    const scale = 1 + 0.2 * push(pushU) + breathe;
    const conv = 16 * (1 - smooth(lockU)) + 1.2 * (1 - pushU);
    const box = composeSpirit(lockStep, conv, scale, 0.25 + 0.2 * (1 - pushU));
    // once through the glass it throws its shadow on it
    if (pushU > 0) {
      ctx.save();
      ctx.globalAlpha = 0.6 * smooth(pushU);
      ctx.drawImage(softDark, box.x + 22 * dpr * pushU, box.y + 30 * dpr * pushU, box.w, box.h);
      ctx.restore();
    }
    const amp = 12 * (1 - smooth(lockU)) + 0.8 * (1 - pushU) + (state === 'resting' ? 0.35 : 0);
    // behind the glass it is light on the tube (added to what is there);
    // once through, it is a thing, and hides what is behind it
    const solid = smooth(pushU * 1.3);
    ctx.globalCompositeOperation = 'screen';
    blitWobbly(amp, t, 1 - solid);
    ctx.globalCompositeOperation = 'source-over';
    if (solid > 0) blitWobbly(amp, t, solid);
    // behind the glass it is under the tube's lines; through it, clear
    scanlines(0.38 * (1 - smooth(pushU * 1.6)));
    // the smoke it brings
    if (pushU > 0 && !rested) { spawnSmoke(pushU < 0.6 ? 2 : 1, box); }
    if (pushU >= 1 && state === 'playing') { state = 'resting'; rested = true; }
    drawSmoke(dt, state === 'resting');
  }
  // the set switched off: the picture folds to a line, the line to a dot,
  // the dot fades - fast, bright, gone
  function switchOff(ms) {
    const u1 = clamp01(ms / 230), u2 = clamp01((ms - 230) / 300), u3 = clamp01((ms - 530) / (T.off - 530));
    const sy = Math.max(0.004, 1 - smooth(u1)), sx = u2 > 0 ? Math.max(0.01, 1 - smooth(u2)) : 1;
    const cx = cv.width / 2, cy = cv.height / 2;
    ctx.save();
    ctx.translate(cx, cy); ctx.scale(sx, sy); ctx.translate(-cx, -cy);
    ctx.globalAlpha = 1 - u3;
    ctx.filter = `brightness(${1 + u1 * 2.5})`;
    ctx.drawImage(work, 0, 0);
    ctx.filter = 'none';
    ctx.restore();
    if (u1 > 0.6) {
      // the line, then the dot, white-hot
      const lw = cv.width * sx, lh = Math.max(2.5 * dpr, 3.5 * dpr * (1 - u2));
      ctx.globalAlpha = (1 - u3);
      const g = ctx.createLinearGradient(cx - lw / 2, 0, cx + lw / 2, 0);
      g.addColorStop(0, 'rgba(180,200,255,0)'); g.addColorStop(0.12, 'rgba(230,236,255,0.85)'); g.addColorStop(0.5, 'rgba(255,255,255,1)'); g.addColorStop(0.88, 'rgba(230,236,255,0.85)'); g.addColorStop(1, 'rgba(180,200,255,0)');
      ctx.fillStyle = g;
      ctx.fillRect(cx - lw / 2, cy - lh / 2, lw, lh);
      // (its bloom on the glass)
      ctx.globalAlpha = (1 - u3) * 0.35;
      ctx.fillRect(cx - lw / 2, cy - lh * 2.5, lw, lh * 5);
      ctx.globalAlpha = (1 - u3);
      ctx.fillStyle = '#fff';
      if (u2 > 0.7) { ctx.beginPath(); ctx.arc(cx, cy, 3 * dpr * (1 - u3), 0, Math.PI * 2); ctx.fill(); }
      ctx.globalAlpha = 1;
    }
    if (ms >= T.off) teardown();
  }

  function play(opts = {}) {
    if (state !== 'idle') return false;
    seed = (opts.seed || Math.floor(Math.random() * 1e9)) >>> 0;
    r = rngOf(seed);
    cv = document.createElement('canvas');
    cv.className = 'dc-seance';
    cv.setAttribute('aria-hidden', 'true');
    ctx = cv.getContext('2d');
    size();
    // the spirit, drawn at the size it is shown at (the push's full size)
    const k = Math.min(2, (fit.h * 1.22 * dpr) / SPIRIT_SIZE.h);
    spirit = spiritCanvas({ seed: seed % 997 + 1, scale: k });
    red = tinted(spirit, '#E0242F', true); blue = tinted(spirit, '#6FA8E8', true);
    // the bloom and the shadow: the spirit drawn small (drawn large again,
    // that is a blur on every browser)
    soft = document.createElement('canvas');
    soft.width = Math.max(1, Math.round(spirit.width / 10)); soft.height = Math.max(1, Math.round(spirit.height / 10));
    soft.getContext('2d').drawImage(spirit, 0, 0, soft.width, soft.height);
    softDark = tinted(soft, '#000');
    makeSnow(); makeWisps();
    smoke = []; rested = false; last = 0; field = 0; composed = ''; lastBox = null; maskStep = -1;
    document.body.appendChild(cv);
    // the app's own jolt, once, as the channel goes
    document.documentElement.classList.remove('dc-jolt-now');
    void document.documentElement.offsetWidth;
    document.documentElement.classList.add('dc-jolt-now');
    setTimeout(() => document.documentElement.classList.remove('dc-jolt-now'), 700);
    state = 'playing';
    t0 = performance.now();
    window.addEventListener('resize', onResize);
    raf = requestAnimationFrame(frame);
    return true;
  }
  const onResize = () => { if (cv) { size(); composed = ''; maskStep = -1; } };
  function off(then) {
    if (state === 'idle') { if (then) then(); return; }
    if (state === 'off') return;
    afterOff = then || null;
    // (what is on the screen now is what folds away)
    wctx.setTransform(1, 0, 0, 1, 0, 0);
    wctx.clearRect(0, 0, work.width, work.height);
    wctx.drawImage(cv, 0, 0);
    state = 'off';
    offT0 = performance.now();
  }
  function teardown() {
    cancelAnimationFrame(raf); raf = 0;
    state = 'idle';
    window.removeEventListener('resize', onResize);
    if (cv) cv.remove();
    cv = ctx = null; spirit = red = blue = soft = softDark = null; smoke = [];
    const then = afterOff; afterOff = null;
    if (then) then();
  }
  function clear() { afterOff = null; if (state !== 'idle') teardown(); }
  // the next touch switches the set off (the touch still reaches what it
  // lands on)
  document.addEventListener('pointerdown', () => { if (state === 'playing' || state === 'resting') off(); }, true);
  // (the lab's: stop the clock and show the payout at ms from its start, or
  // switching off at ms from the touch)
  function seek(ms, switching) {
    if (state === 'idle') return false;
    cancelAnimationFrame(raf); raf = 0;
    if (switching) {
      if (state !== 'off') off();
      offT0 = performance.now() - ms;
    } else {
      state = ms >= T.push ? 'resting' : 'playing';
      rested = ms >= T.push;
      t0 = performance.now() - ms;
    }
    last = performance.now() - 16;
    frame(performance.now());
    cancelAnimationFrame(raf); raf = 0;
    return true;
  }
  const resume = () => { if (state !== 'idle' && !raf) raf = requestAnimationFrame(frame); };
  return { play, clear, off, busy: () => state !== 'idle', seek, resume, timing: T };
}
