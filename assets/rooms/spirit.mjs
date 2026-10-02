// assets/rooms/spirit.mjs
// Dead Channel's spirit: the face that comes through the static.
//
// Held to a real maker: a scratchboard engraver's plate - clay board inked
// black, the light cut into it with a nib - worked the way a banknote
// engraver works a portrait: the head is modelled first (a relief), and
// then every cut line swells where the form faces the lamp and thins to
// nothing where it turns away, so the light is made of line weight alone.
// Lit from the one key light, above left and in front.
// - Across the room: a gaunt head thrown back in a scream, eyes shut, hair
//   streaming up and to the right in locks like a flame pulled into the
//   signal, a few falling past the jaw.
// - At arm's length: the cuts run over the forms (they bow over the brow,
//   dip into the sockets, climb the cheekbones); the sockets, the nose and
//   the mouth are left as ink; the skin is gnarled, as old as the signal.
// - Pinched in 3x: each line is a tapered ribbon, its width changing along
//   it; in the brightest places a second set of cuts crosses the first;
//   hair locks are bone at the root and burn to blood red at their tips.
//
// Drawn on a canvas (it is always shown as pixels: the collect's face in
// the snow, the payout, the séance set's screen), from a seed, so no two
// are quite alike.

// (the plate: the head's forms are laid out in a 480 x 640 box, set into
// a wider, taller plate so the locks have room to stream up and out)
const W = 480, H = 640, PAD_X = 40, PAD_TOP = 190, PAD_R = 120;
export const SPIRIT_SIZE = { w: W + PAD_X + PAD_R, h: H + PAD_TOP };
// where the head is on the plate (the collect crops its face to it)
export const HEAD_BOX = { x: PAD_X + 112, y: PAD_TOP + 132, w: 200, h: 366 };

// a colour (#rrggbb) at an alpha
const rgba = (hex, a) => { const n = parseInt(hex.slice(1), 16); return `rgba(${n >> 16},${(n >> 8) & 255},${n & 255},${a})`; };

function rng(seed) {
  let s = ((seed >>> 0) * 2654435761) >>> 0 || 1;
  return () => { s ^= s << 13; s >>>= 0; s ^= s >>> 17; s ^= s << 5; s >>>= 0; return s / 4294967296; };
}
// smooth value noise (for the skin's gnarl and the locks' sway)
function noise2(seed) {
  const r = rng(seed), P = new Float32Array(64 * 64);
  for (let i = 0; i < P.length; i++) P[i] = r();
  const at = (x, y) => P[((y & 63) << 6) | (x & 63)];
  return (x, y) => {
    const xi = Math.floor(x), yi = Math.floor(y), fx = x - xi, fy = y - yi;
    const sx = fx * fx * (3 - 2 * fx), sy = fy * fy * (3 - 2 * fy);
    const a = at(xi, yi), b = at(xi + 1, yi), c = at(xi, yi + 1), d = at(xi + 1, yi + 1);
    return a + (b - a) * sx + (c - a) * sy + (a - b - c + d) * sx * sy;
  };
}

// ---- The forms, in the plate's 480 x 640 box. The head is thrown back and
// turned a little to its right (so its left side, on our left, is the lit
// and nearer one).
const CX = 196;
const HEAD = 'M150 176 C126 206 116 252 120 292 C124 322 136 344 142 368 C148 398 156 428 170 456 C182 478 196 490 212 490 C228 489 242 478 254 456 C270 426 278 396 284 366 C290 338 302 316 304 288 C308 244 296 202 274 176 C256 152 232 138 210 138 C188 138 166 152 150 176 Z';
const NECK = 'M170 452 C174 500 166 560 150 640 L286 640 C272 560 262 504 256 452 C244 476 228 488 212 489 C196 488 182 478 170 452 Z';
// ink: where nothing is cut
const SOCKET_L = 'M134 262 C140 242 162 234 182 240 C196 246 200 262 194 276 C186 292 164 296 148 290 C138 286 132 274 134 262 Z';
const SOCKET_R = 'M224 270 C220 254 230 240 250 236 C272 232 290 244 294 260 C296 274 286 288 266 292 C246 296 228 286 224 270 Z';
const NOSE = 'M212 296 C206 306 196 320 196 330 C196 340 204 342 211 335 C218 342 227 340 227 331 C227 320 218 306 212 296 Z';
const MOUTH = 'M176 374 C182 358 198 350 213 350 C230 350 244 360 248 376 C254 400 252 432 240 450 C230 464 196 464 186 450 C174 432 170 400 176 374 Z';

// Gaussian bump
const g = (x, y, cx, cy, sx, sy, a = 0) => {
  const c = Math.cos(a), s = Math.sin(a);
  const dx = x - cx, dy = y - cy, u = (dx * c + dy * s) / sx, v = (-dx * s + dy * c) / sy;
  return Math.exp(-(u * u + v * v));
};

// Rasterise a path into a coverage grid (0..1), w x h.
function coverage(d, w, h) {
  const c = document.createElement('canvas');
  c.width = w; c.height = h;
  const x = c.getContext('2d');
  x.fillStyle = '#fff'; x.fill(new Path2D(d));
  const px = x.getImageData(0, 0, w, h).data, out = new Float32Array(w * h);
  for (let i = 0; i < out.length; i++) out[i] = px[i * 4 + 3] / 255;
  return out;
}
// A box blur, three passes (near enough a gaussian): the head's mask blurred
// is its pillow, the inflated shape the features are carved into.
function blur(src, w, h, rad) {
  let a = Float32Array.from(src), b = new Float32Array(w * h);
  for (let pass = 0; pass < 3; pass++) {
    for (let y = 0; y < h; y++) {
      let acc = 0; const row = y * w;
      for (let x = -rad; x < w; x++) {
        if (x + rad < w) acc += a[row + x + rad];
        if (x - rad - 1 >= 0) acc -= a[row + x - rad - 1];
        if (x >= 0) b[row + x] = acc / (2 * rad + 1);
      }
    }
    for (let x = 0; x < w; x++) {
      let acc = 0;
      for (let y = -rad; y < h; y++) {
        if (y + rad < h) acc += b[(y + rad) * w + x];
        if (y - rad - 1 >= 0) acc -= b[(y - rad - 1) * w + x];
        if (y >= 0) a[y * w + x] = acc / (2 * rad + 1);
      }
    }
  }
  return a;
}

// The relief (height, in px of depth) and its light, on a half-size grid.
function model(seed) {
  const S = 2, w = W / S, h = H / S;
  const scaled = d => d.replace(/-?\d+(\.\d+)?/g, n => String(+n / S));
  const head = coverage(scaled(HEAD), w, h), neck = coverage(scaled(NECK), w, h);
  // (the ink's edge softened a little, so the cuts taper into it)
  const ink = blur(coverage(scaled(SOCKET_L + SOCKET_R + NOSE + MOUTH), w, h), w, h, 2);
  const pillowH = blur(head, w, h, 14), pillowN = blur(neck, w, h, 9);
  const n = noise2(seed * 7 + 3), n2 = noise2(seed * 13 + 5);
  const Hf = new Float32Array(w * h), mask = new Float32Array(w * h);
  for (let j = 0; j < h; j++) for (let i = 0; i < w; i++) {
    const k = j * w + i, x = i * S, y = j * S;
    const inHead = head[k], inNeck = neck[k] * (1 - inHead);
    let z = Math.sqrt(Math.max(0, pillowH[k])) * 70 * inHead + Math.sqrt(Math.max(0, pillowN[k])) * 38 * inNeck;
    if (inHead > 0) {
      // the brow ridges and the dome's centre line
      z += 9 * g(x, y, 162, 236, 34, 9, 0.12) + 9 * g(x, y, 256, 234, 34, 9, -0.1);
      z += 5 * g(x, y, 210, 190, 14, 40);
      // the sockets, sunk; the lids rounded in them
      z -= 26 * g(x, y, 164, 266, 30, 22, 0.1) + 26 * g(x, y, 258, 264, 32, 22, -0.1);
      z += 7 * g(x, y, 164, 268, 18, 9, 0.1) + 6 * g(x, y, 258, 268, 18, 9, -0.1);
      // the cheekbones, high and sharp; the hollows under them
      z += 14 * g(x, y, 146, 300, 26, 10, 0.55) + 12 * g(x, y, 280, 298, 24, 10, -0.5);
      z -= 20 * g(x, y, 150, 350, 18, 34, 0.1) + 20 * g(x, y, 278, 348, 18, 34, -0.1);
      // the nose's bridge
      z += 8 * g(x, y, 212, 280, 8, 30);
      // the stretched lips and the chin
      z += 8 * g(x, y, 212, 470, 26, 16);
      z -= 30 * g(x, y, 212, 404, 32, 46);
      // the temples
      z -= 8 * g(x, y, 132, 220, 12, 30) + 8 * g(x, y, 294, 216, 12, 30);
      // the gnarl: old skin, cracked and furrowed
      z += (n(x / 14, y / 11) - 0.5) * 4.5 + (n2(x / 4, y / 4) - 0.5) * 1.1;
      // furrows across the brow, the skin drawn tight by the scream
      z += Math.sin(y / 5.5 + n(x / 30, y / 30) * 4) * 1.3 * g(x, y, 210, 200, 60, 26);
    } else if (inNeck > 0) {
      // the neck's tendons, standing out as the head goes back
      z += 7 * g(x, y, 186, 520, 6, 70, 0.08) + 7 * g(x, y, 240, 520, 6, 70, -0.1) + 4 * g(x, y, 212, 500, 5, 40);
      z += (n(x / 10, y / 18) - 0.5) * 4;
    }
    Hf[k] = z;
    mask[k] = Math.max(inHead, inNeck) * (1 - ink[k]);
  }
  // light: above left, in front
  const L = [-0.52, -0.62, 0.59], lm = Math.hypot(...L);
  const T = new Float32Array(w * h);
  for (let j = 1; j < h - 1; j++) for (let i = 1; i < w - 1; i++) {
    const k = j * w + i;
    if (mask[k] <= 0) continue;
    const dx = (Hf[k + 1] - Hf[k - 1]) / (2 * S), dy = (Hf[k + w] - Hf[k - w]) / (2 * S);
    const nm = Math.hypot(dx, dy, 1);
    const dif = Math.max(0, (-dx * L[0] - dy * L[1] + L[2]) / (nm * lm));
    // (and a little light from below, off the static: the shadow side
    // keeps a trace of form)
    const bounce = Math.max(0, (dy * 0.7 + 0.3) / nm) * 0.12;
    // (cavities hold less light)
    const occ = Math.min(1, Math.max(0, 0.55 + Hf[k] / 90));
    // (the far side of the head turns away into the dark; under the jaw
    // the neck is in the head's shadow)
    const x = i * S, y = j * S;
    const side = Math.min(1, Math.max(0.34, 1.3 - (x - 170) / 190));
    const jawShade = y > 440 ? Math.max(0.25, 1 - g(x, y, 212, 470, 60, 30) * 0.9) * Math.min(1, 0.55 + (y - 440) / 260) : 1;
    const d = Math.pow(Math.max(0, dif), 1.2);
    // (the neck fades out into the ink below)
    const foot = y > 560 ? Math.max(0, (640 - y) / 80) : 1;
    T[k] = Math.min(1, (d * 1.38 + bounce) * occ * side * jawShade * foot) * mask[k];
  }
  return { w, h, S, Hf, T };
}

// The cut lines: a family of level lines of (the plate's axis + the relief),
// so they bow over every form; each is a ribbon whose width is the light.
function engrave(ctx, M, { angle, gap, lift, wmax, floor, color, alpha = 1, r }) {
  const { w, h, S, Hf, T } = M;
  const ca = Math.cos(angle), sa = Math.sin(angle);
  const sample = (A, x, y) => {
    const i = x / S, j = y / S;
    if (i < 0 || j < 0 || i >= w - 1 || j >= h - 1) return 0;
    const i0 = i | 0, j0 = j | 0, fx = i - i0, fy = j - j0, k = j0 * w + i0;
    return (A[k] * (1 - fx) + A[k + 1] * fx) * (1 - fy) + (A[k + w] * (1 - fx) + A[k + w + 1] * fx) * fy;
  };
  // the plate's axes: u along the lines, v across them
  const diag = Math.hypot(W, H);
  ctx.fillStyle = color;
  ctx.globalAlpha = alpha;
  for (let v = -diag / 2; v < diag / 2; v += gap * (0.92 + r() * 0.16)) {
    let run = [];
    const flush = () => {
      if (run.length > 2) {
        const left = [], right = [];
        for (let q = 0; q < run.length; q++) {
          const [x, y, wd] = run[q];
          const a = run[Math.max(0, q - 1)], b = run[Math.min(run.length - 1, q + 1)];
          let tx = b[0] - a[0], ty = b[1] - a[1]; const m = Math.hypot(tx, ty) || 1; tx /= m; ty /= m;
          // (the nib's entry and exit taper)
          const end = Math.min(1, q / 2, (run.length - 1 - q) / 2);
          const hw = wd * 0.5 * (0.35 + 0.65 * end);
          left.push([x - ty * hw, y + tx * hw]); right.push([x + ty * hw, y - tx * hw]);
        }
        ctx.beginPath();
        ctx.moveTo(left[0][0], left[0][1]);
        for (let q = 1; q < left.length; q++) ctx.lineTo(left[q][0], left[q][1]);
        for (let q = right.length - 1; q >= 0; q--) ctx.lineTo(right[q][0], right[q][1]);
        ctx.closePath(); ctx.fill();
      }
      run = [];
    };
    for (let u = -diag / 2; u < diag / 2; u += 1.6) {
      // the point on this level line at u: start on the straight line, then
      // let the relief lift it (a few fixed-point steps)
      let x = W / 2 + ca * u - sa * v, y = H / 2 + sa * u + ca * v;
      for (let it = 0; it < 3; it++) {
        const z = sample(Hf, x, y);
        x = W / 2 + ca * u - sa * (v - z * lift);
        y = H / 2 + sa * u + ca * (v - z * lift);
      }
      const t = sample(T, x, y);
      const wd = (t - floor) / (1 - floor) * wmax;
      if (wd > 0.22) run.push([x, y, wd]); else flush();
    }
    flush();
  }
  ctx.globalAlpha = 1;
}

// A lock of hair: a spine from the scalp, and strands laid along it, each a
// tapered ribbon, the lit ones (toward the lamp) brighter; bone at the
// root, burning to the tip colour.
function locks(ctx, r, sway, { color, tip }) {
  const scalp = [[150, 186], [158, 162], [176, 146], [200, 138], [224, 138], [248, 146], [270, 162], [284, 186], [294, 214]];
  const along = u => {
    const k = u * (scalp.length - 1), i = Math.min(scalp.length - 2, Math.floor(k)), f = k - i;
    return [scalp[i][0] + (scalp[i + 1][0] - scalp[i][0]) * f, scalp[i][1] + (scalp[i + 1][1] - scalp[i][1]) * f];
  };
  const lockList = [];
  // streaming up and to the right
  for (let l = 0; l < 22; l++) {
    const u = (l + r() * 0.8) / 22;
    lockList.push({ u, up: true, len: 250 + r() * 200 + u * 90, width: 10 + r() * 14 });
  }
  // falling past the temples
  for (let l = 0; l < 7; l++) lockList.push({ u: l < 3 ? r() * 0.08 : 0.9 + r() * 0.1, up: false, left: l < 3, len: 210 + r() * 160, width: 8 + r() * 8 });
  // far locks first
  lockList.sort((a, b) => (a.up === b.up ? a.u - b.u : a.up ? -1 : 1));
  lockList.forEach((L, li) => {
    const [x0, y0] = along(L.u);
    const steps = 48, spine = [[x0, y0]];
    let x = x0, y = y0;
    // a lock leaves the scalp along the skull, then the pull takes it: it
    // sweeps round toward up-and-right in one long S, and its tip curls
    let ang = L.up ? -Math.PI / 2 - 0.75 + L.u * 1.15 + (r() - 0.5) * 0.2 : (L.left ? Math.PI / 2 + 0.5 + r() * 0.2 : Math.PI / 2 - 0.3 - r() * 0.2);
    const target = L.up ? -0.5 - r() * 0.32 : (L.left ? Math.PI / 2 + 0.15 : Math.PI / 2 - 0.05);
    const waveA = 0.05 + r() * 0.05, waveF = 1.2 + r() * 1.1, ph = r() * 6.28;
    const curlDir = r() < 0.6 ? 1 : -1, curlAt = 0.72 + r() * 0.16;
    for (let i = 1; i <= steps; i++) {
      const k = i / steps;
      ang += (target - ang) * (L.up ? 0.07 : 0.04);
      ang += Math.sin(ph + k * Math.PI * 2 * waveF) * waveA * (0.4 + k);
      ang += (sway(x / 70, y / 70 + li) - 0.5) * 0.05;
      if (k > curlAt) ang += curlDir * 0.11 * (k - curlAt) / (1 - curlAt) * (L.up ? 1 : 0.5);
      const stepLen = L.len / steps * (1 - k * 0.25);
      x += Math.cos(ang) * stepLen; y += Math.sin(ang) * stepLen;
      spine.push([x, y]);
    }
    const nS = 9 + Math.floor(r() * 7);
    for (let s = 0; s < nS; s++) {
      const off = (s / (nS - 1) - 0.5) * L.width, jit = (r() - 0.5) * 3, fan = 1 + r() * 0.8;
      const pts = spine.map((p, i) => {
        const a = spine[Math.max(0, i - 1)], b = spine[Math.min(steps, i + 1)];
        let tx = b[0] - a[0], ty = b[1] - a[1]; const m = Math.hypot(tx, ty) || 1; tx /= m; ty /= m;
        const k = i / steps;
        // (the lock gathers at the root and fans at the tip)
        const o = off * (0.35 + k * fan) + jit * k + Math.sin(k * 9 + s) * 1.4 * k;
        return [p[0] - ty * o, p[1] + tx * o];
      });
      // a strand stops somewhere along the lock
      const cut = Math.floor(steps * (0.55 + r() * 0.45));
      const P = pts.slice(0, cut + 1);
      const lit = Math.max(0.25, Math.min(1, 0.55 - off / L.width * 0.9 + (L.u < 0.5 ? 0.25 : 0)));
      const w0 = (0.55 + r() * 0.9) * (0.6 + lit * 0.6);
      const grad = ctx.createLinearGradient(P[0][0], P[0][1], P[P.length - 1][0], P[P.length - 1][1]);
      // (in the head's shadow at the root, catching the light along the
      // lock, burning at the tip)
      grad.addColorStop(0, rgba(color, 0.18)); grad.addColorStop(0.16, rgba(color, 0.9)); grad.addColorStop(L.up ? 0.5 : 0.75, color); grad.addColorStop(1, L.up ? tip : rgba(color, 0.6));
      ctx.fillStyle = grad;
      ctx.globalAlpha = 0.35 + lit * 0.65;
      const left = [], right = [];
      P.forEach((p, i) => {
        const a = P[Math.max(0, i - 1)], b = P[Math.min(P.length - 1, i + 1)];
        let tx = b[0] - a[0], ty = b[1] - a[1]; const m = Math.hypot(tx, ty) || 1; tx /= m; ty /= m;
        const k = i / (P.length - 1);
        const hw = w0 * Math.min(1, k * 3) * Math.pow(1 - k, 0.7);
        left.push([p[0] - ty * hw, p[1] + tx * hw]); right.push([p[0] + ty * hw, p[1] - tx * hw]);
      });
      ctx.beginPath(); ctx.moveTo(left[0][0], left[0][1]);
      left.forEach(p => ctx.lineTo(p[0], p[1]));
      for (let q = right.length - 1; q >= 0; q--) ctx.lineTo(right[q][0], right[q][1]);
      ctx.closePath(); ctx.fill();
    }
  });
  ctx.globalAlpha = 1;
}

// The teeth: long, uneven, one missing; the gums drawn back from them.
function teeth(ctx, r, color) {
  const row = (y, dir, n, x0, x1, curve) => {
    for (let i = 0; i < n; i++) {
      if (r() < 0.1) continue;
      const u = (i + 0.5) / n;
      const x = x0 + (x1 - x0) * u + (r() - 0.5) * 1.5;
      const yy = y + curve * (2 * u - 1) ** 2;
      const w = (x1 - x0) / n * (0.7 + r() * 0.2), h = 11 + r() * 8 - Math.abs(u - 0.5) * 9;
      const lit = 1 - u * 0.5;
      const gr = ctx.createLinearGradient(x - w / 2, yy, x + w / 2, yy);
      gr.addColorStop(0, color); gr.addColorStop(1, 'rgba(120,112,100,0.8)');
      ctx.fillStyle = gr; ctx.globalAlpha = 0.5 + lit * 0.5;
      ctx.beginPath();
      ctx.moveTo(x - w / 2, yy); ctx.lineTo(x + w / 2, yy);
      ctx.lineTo(x + w * 0.36, yy + dir * h);
      ctx.quadraticCurveTo(x, yy + dir * (h + 2.5), x - w * 0.36, yy + dir * h);
      ctx.closePath(); ctx.fill();
    }
  };
  row(360, 1, 8, 186, 242, 6);
  row(454, -1, 7, 192, 236, -5);
  ctx.globalAlpha = 1;
}

// Draw the spirit into a context, at a scale. opts: seed; color (the cut
// lines); tip (the locks' tips); ember (deep in the throat); sway (0..1,
// the locks' drift - the payout moves it a hair between frames).
export function drawSpirit(ctx, opts = {}) {
  const o = Object.assign({ seed: 1, scale: 1, color: '#E9E4D8', tip: '#E0242F', ember: 'rgba(224,36,47,0.22)', sway: 0 }, opts);
  const r = rng(o.seed);
  const M = model(o.seed);
  const swayN = noise2(o.seed * 3 + 1);
  const sway = (x, y) => swayN(x + o.sway * 0.6, y - o.sway * 0.4);
  ctx.save();
  ctx.scale(o.scale, o.scale);
  ctx.translate(PAD_X, PAD_TOP);
  // the far locks, behind the head
  ctx.save(); ctx.globalAlpha = 0.6; locks(ctx, rng(o.seed + 11), sway, { color: o.color, tip: o.tip }); ctx.restore();
  // the head's ink, over them
  ctx.fillStyle = '#050608';
  ctx.fill(new Path2D(HEAD)); ctx.fill(new Path2D(NECK));
  // the cuts: the main set over the forms, a crossing set where it is
  // brightest (the brow, the cheekbone, the forehead)
  engrave(ctx, M, { angle: -0.06, gap: 3.2, lift: 0.75, wmax: 2.05, floor: 0.07, color: o.color, r });
  engrave(ctx, M, { angle: 0.95, gap: 4.4, lift: 0.6, wmax: 1.2, floor: 0.6, color: o.color, alpha: 0.75, r });
  // the throat's ember, and the teeth
  const eg = ctx.createRadialGradient(212, 418, 2, 212, 418, 34);
  eg.addColorStop(0, o.ember); eg.addColorStop(1, 'rgba(0,0,0,0)');
  ctx.fillStyle = eg; ctx.fill(new Path2D(MOUTH));
  teeth(ctx, r, o.color);
  // the shut lids: a lash line each, cut hard
  ctx.strokeStyle = o.color; ctx.lineCap = 'round';
  ctx.lineWidth = 1.7; ctx.beginPath(); ctx.moveTo(146, 272); ctx.bezierCurveTo(156, 281, 175, 283, 190, 274); ctx.stroke();
  ctx.lineWidth = 1.1; ctx.globalAlpha = 0.8; ctx.beginPath(); ctx.moveTo(232, 274); ctx.bezierCurveTo(244, 283, 264, 285, 282, 276); ctx.stroke();
  ctx.globalAlpha = 1;
  // the near locks, over the crown
  locks(ctx, rng(o.seed + 23), sway, { color: o.color, tip: o.tip });
  ctx.restore();
}

// The face alone as a soft mask, white where it catches the light (the
// collect's face in the snow).
export function drawFaceMask(ctx, opts = {}) {
  const o = Object.assign({ seed: 1, scale: 1 }, opts);
  const M = model(o.seed);
  ctx.save(); ctx.scale(o.scale, o.scale); ctx.translate(PAD_X, PAD_TOP); ctx.scale(1 / o.scale, 1 / o.scale);
  const img = ctx.createImageData(M.w, M.h);
  for (let k = 0; k < M.T.length; k++) { const v = Math.min(255, M.T[k] * 330); img.data[k * 4] = img.data[k * 4 + 1] = img.data[k * 4 + 2] = 255; img.data[k * 4 + 3] = v; }
  const c = document.createElement('canvas'); c.width = M.w; c.height = M.h;
  c.getContext('2d').putImageData(img, 0, 0);
  ctx.save(); ctx.scale(o.scale * M.S, o.scale * M.S); ctx.drawImage(c, 0, 0); ctx.restore();
  ctx.restore();
}

// A canvas holding the spirit, drawn at a scale (for whoever shows it as
// pixels every frame).
export function spiritCanvas(opts = {}) {
  const scale = opts.scale || 1;
  const c = document.createElement('canvas');
  c.width = Math.round(SPIRIT_SIZE.w * scale); c.height = Math.round(SPIRIT_SIZE.h * scale);
  const x = c.getContext('2d');
  drawSpirit(x, Object.assign({}, opts, { scale }));
  // (the plate's foot fades into the dark: the neck has no end)
  const g = x.createLinearGradient(0, c.height * 0.84, 0, c.height);
  g.addColorStop(0, 'rgba(0,0,0,0)'); g.addColorStop(1, 'rgba(0,0,0,1)');
  x.globalCompositeOperation = 'destination-out';
  x.fillStyle = g; x.fillRect(0, c.height * 0.84, c.width, c.height * 0.16);
  x.globalCompositeOperation = 'source-over';
  return c;
}
