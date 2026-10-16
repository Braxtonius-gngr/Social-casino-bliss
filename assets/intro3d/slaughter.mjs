// THE SLAUGHTER FLOOR: West Texas Gore Fest's home at Showroom (three.js +
// CSS3D).
//
// After the roll intro has floated up, a tap on the landing starts one
// continuous shot, as it does for the card table (table.mjs): the camera
// rises out of the float and glides across the room, away from the gaming
// floor, down to a seat at a bench on the house's killing floor. Over the
// bench a meat rail runs in from over your right shoulder to the wall, and
// on its hooks hangs the day's lot - burlap sacks, a satchel, parcels in
// butcher paper, the leavings that never made it to processing - each
// with a brass tag wired on: your ready platforms, swinging as you come
// in. A sodium lamp hangs over the bench; a saw lies on it; the bone die
// from the fire rests beside it. On the wall behind, under a barn light,
// a scrap of the wall's own cladding with the clock painted on it, what is
// ready, and the hand to deal. Off to the right hangs the hoist's chain:
// today's run is how much of it has gone to ember, from the hook up.
//
// Tap a load or its tag: its card comes up off the hook to you, with its
// Keen Info and its moves (the same card and sheet as the card table's).
// Drag across the bench: the loads swing, and settle. Nothing here is
// scaled to fake a thing: the camera goes where you would sit, and the
// lens is sized for that.
//
// Held to real makers, at three distances (across the room: silhouette;
// at arm's length: materials, bevels, seams; pinched in 3x: engraving,
// grain, wear), for what each surface does with the light, what it touches
// and how it moves:
//   The bench, and the one you sit on - a rustic upholsterer's bench:
//     distressed dark pine (an apron, square legs, stretchers and a slatted
//     shelf), the top a pad drawn over in copper crocodile-embossed leather
//     and close-nailed round its foot with antique brass nailheads. Room: a
//     copper slab on dark posts. Arm: the scales, each its own shade, bright
//     on their crowns, dark in the grooves; the stain worn through to the
//     pine at the edges. 3x: the nailheads' domes, the grain's latewood
//     standing proud where the soft wood has worn away.
//   The rail and the hooks - a meat rail from a packing-house fitter: a
//     steel I-beam on hangers, trolleys on its lower flange, short lengths
//     of forged chain, S-hooks of blacked steel. They swing from the
//     trolley as a heavy load does: slow, a little, settling over ten
//     seconds, no two alike.
//   The loads - burlap sacks tied at the neck with twine, blood soaked up
//     from their bottoms with a dark tide line, dripping; one sack left
//     open, a bone end and a flap of hide over its lip; parcels in Texas
//     pink butcher paper, twine-tied both ways, seeping, a sawn bone end
//     through the paper; an old leather satchel, smeared, hide caught
//     under its flap.
//   The tags - triangular brass tool-check tags: a hole at the apex on a
//     wire ring, a beaded border, the house's W.T.G.F. struck under the
//     hole, the platform's name in a die-struck script, its initials big
//     in letter punches. A spent platform's tag is tarnished, dull.
//   The lamp - a sodium high-bay from an industrial supplier, high over
//     the bench out of the shot: its amber cone is the room's key light.
//   The saw - a professional chainsaw from a forestry dealer, years into
//     its work: an oil-stained cowl in rust orange, a black guide bar, the
//     chain's cutters along it, a pull cord, the rear handle's trigger. It
//     does not run here.
//   The chain - the hoist's own: heavy forged links. Today's run is the
//     chain gone to ember from the hook up, blood red to white-hot at the
//     head, its glow on the wall behind; the rest black iron.
//   The sign - a scrap of the cladding cut with snips and screwed up
//     sideways, its ribs across: an old stencil ghosting through, rust at
//     the cut, and over it the day in brush paint (Special Elite for the
//     labels, Oswald for the numbers), runs under the strokes, the hand's
//     button a box of safety yellow. A gooseneck barn light over it.
//   The floor and the wall - bare concrete, stained, a drain in it; the
//     wall aged brick to above the bench, a steel sill, and over it
//     roll-formed panels in Burnished Slate, ribbed, screwed at the flats,
//     rust run down from the screws.
//
// Coordinates are the seat's own, as the table's: centimetres, the origin
// on the bench's top at the middle of its near edge's line, +z away from
// you, +y up, +x to your LEFT.

import * as THREE from '../vendor/three/three.module.js';
import { CSS3DRenderer, CSS3DObject } from '../vendor/three/three.addons.js';
import { tableKit as K } from './table.mjs';
import { embossTex } from './finish.mjs';

export const DESTS = ['slaughter'];

const DEG = Math.PI / 180;
const clamp01 = x => Math.min(Math.max(x, 0), 1);
const smoother = x => { x = clamp01(x); return x * x * x * (x * (6 * x - 15) + 10); };
const lerp = (a, b, k) => a + (b - a) * k;
const easeOut = (x, k = 3) => 1 - Math.pow(1 - clamp01(x), k);
const V = (x, y, z) => new THREE.Vector3(x, y, z);
const HERE = new URL('./', import.meta.url);
const asset = f => new URL(f, HERE).href;
function seeded(seed) { return () => { seed = (Math.imul(seed, 1664525) + 1013904223) >>> 0; return seed / 4294967296; }; }

// Where the floor stands: across the room from the pit, to the right of the
// card table, the seat facing away from the gaming floor, so the camera
// comes in from behind it.
const SEAT = { at: [440, 0, 60], yaw: 90 };
// The bench: 150 x 70, its near edge a little in front of the origin; the
// leather pad on top (cush), the pine apron under it, square legs.
const BENCH = { w: 150, d: 70, z0: -4, cush: 6.5, apron: 9, floor: -82, legs: 8.5 };
// The bench you sit on, under the camera.
const PEW = { w: 112, d: 40, z0: -168, top: -36, cush: 8, apron: 7, legs: 6.5 };
// The rail: from a hanger over the bench's right front corner back to a
// bracket on the wall, its trolleys a man's height over the bench; the
// loads hang between t0 and t1 along it.
const RAIL = { y: 95, from: [-36, -12], to: [44, 82], t0: 0.124, t1: 0.9075, link: 2.7, flange: 5.5 };
// The loads: s their scale, tag the tags' (both from the sizes they are
// built at); their lowest points a little high and low by turns, over
// the bench, clear of the saw - each tag at the top of its load, so the
// tags step back down the rail together, in the same light.
const LOAD = { s: 1.2, tag: 1.12, low: 32, high: 38 };
// The tags: a triangle w x h, corners rounded r, the hole hole across at
// holeY down from the apex, t thick.
const TAG = { w: 13, h: 12, r: 1.3, hole: 0.62, holeY: 2.05, t: 0.3 };
// The lamp, high over the bench (out of the shot), aimed down it.
const LAMP = { at: [0, 160, 6], aim: [0, 0, 30], top: 262 };
// The wall: brick to brick, then the cladding; its ribs; the sign on it;
// the barn light over the sign (above the shot: its light, not the lamp,
// is what shows); the drain in the floor.
const WALL = { z: 88, w: 520, h: 312, brick: 135 };
const RIB = { pitch: 30, h: 3.2, top: 2.6, base: 8, minor: 0.42 };
const SLATE = { at: [0, 136, 84.5], w: 66, h: 40, px: 30, tilt: -1.2 * DEG, phase: 18.3 };
const BARN = { at: [0, 196, 50], aim: [0, 134, 84] };
const DRAIN = [10, 36];
// The run's chain: off to the right, down to a hook.
const CHAIN = { x: -86, z: 28, top: 142, links: 32, link: 3.0 };
// The saw on the bench, right of the middle; the die left of it.
const SAW = { at: [-12, 0, 16], yaw: -35 * DEG };
const DIE = { at: [34, 0, 16], size: 5.2 };
// The views: the seat, portrait and landscape.
const VIEW = [{ eye: [0, 80, -140], aim: [0, 67, 40], fov: 60 }, { eye: [0, 78, -160], aim: [0, 72, 40], fov: 52 }];
const T = { fly: 4.8, uiIn: 0.6, swing: 11, lift: 0.55 };

// ------------------------------------------------------------ noise
// smooth value noise on a lattice that wraps every wx cells across and wy
// down (0: never), and its octaves (which wrap with it)
function vnoise(seed, wx = 0, wy = 0) {
  const h = (x, y) => {
    if (wx) x = ((x % wx) + wx) % wx;
    if (wy) y = ((y % wy) + wy) % wy;
    let n = (Math.imul(x, 374761393) + Math.imul(y, 668265263) + Math.imul(seed, 1442695041)) | 0;
    n = Math.imul(n ^ (n >>> 13), 1274126177);
    return ((n ^ (n >>> 16)) >>> 0) / 4294967296;
  };
  return (x, y) => {
    const x0 = Math.floor(x), y0 = Math.floor(y), tx = x - x0, ty = y - y0;
    const sx = tx * tx * (3 - 2 * tx), sy = ty * ty * (3 - 2 * ty);
    return lerp(lerp(h(x0, y0), h(x0 + 1, y0), sx), lerp(h(x0, y0 + 1), h(x0 + 1, y0 + 1), sx), sy);
  };
}
function fbm(n, x, y, oct = 4) { let a = 0, w = 0.5, f = 1, t = 0; for (let i = 0; i < oct; i++) { a += w * n(x * f, y * f); t += w; w *= 0.5; f *= 2; } return a / t; }
const sstep = (a, b, x) => { const t = clamp01((x - a) / (b - a)); return t * t * (3 - 2 * t); };
const mix3 = (o, a, b, k) => { o.r = lerp(a[0], b[0], k); o.g = lerp(a[1], b[1], k); o.b = lerp(a[2], b[2], k); };

// One pass over a W x H surface painting its colour, its height (for the
// normal map) and its roughness together: f(x, y, o) sets o.r, o.g, o.b
// (0-255), o.h (0-1) and o.k (roughness, 0-1).
function surface(W, H, f) {
  const mk = () => { const c = document.createElement('canvas'); c.width = W; c.height = H; return c; };
  const cc = mk(), hc = mk(), rc = mk();
  const ci = cc.getContext('2d').createImageData(W, H), hi = hc.getContext('2d').createImageData(W, H), ri = rc.getContext('2d').createImageData(W, H);
  const o = { r: 0, g: 0, b: 0, h: 0, k: 1 };
  for (let y = 0; y < H; y++) for (let x = 0; x < W; x++) {
    f(x, y, o);
    const i = (y * W + x) * 4;
    ci.data[i] = o.r; ci.data[i + 1] = o.g; ci.data[i + 2] = o.b; ci.data[i + 3] = 255;
    hi.data[i] = hi.data[i + 1] = hi.data[i + 2] = o.h * 255; hi.data[i + 3] = 255;
    ri.data[i] = ri.data[i + 1] = ri.data[i + 2] = o.k * 255; ri.data[i + 3] = 255;
  }
  cc.getContext('2d').putImageData(ci, 0, 0); hc.getContext('2d').putImageData(hi, 0, 0); rc.getContext('2d').putImageData(ri, 0, 0);
  return { color: cc, height: hc, rough: rc };
}
function asTex(c, color = true, wrap = false) {
  const t = new THREE.CanvasTexture(c);
  t.colorSpace = color ? THREE.SRGBColorSpace : THREE.NoColorSpace; t.anisotropy = 8;
  if (wrap) t.wrapS = t.wrapT = THREE.RepeatWrapping;
  return t;
}
// ... and its textures: the colour, a normal map, a roughness map (the
// material's roughness left at 1, so the map's grey is the roughness)
function surfaceTex(s, strength, R = 1, wrap = false) {
  const normalMap = embossTex(s.height, strength, R);
  if (wrap) normalMap.wrapS = normalMap.wrapT = THREE.RepeatWrapping;
  return { map: asTex(s.color, true, wrap), normalMap, roughnessMap: asTex(s.rough, false, wrap) };
}

// ------------------------------------------------------------ textures
// Bare concrete, warm and worn smooth: the aggregate's speckle, the
// trowel's mottle, the saw-cut joints, the stains pooled toward the drain.
function concreteTex(w, h, seed, stains, drain) {
  const k = 2, W = Math.round(w * k), H = Math.round(h * k);
  return K.canvasTex(W, H, (g) => {
    const rnd = seeded(seed);
    g.fillStyle = '#5c554c'; g.fillRect(0, 0, W, H);
    for (let i = 0; i < 26; i++) { const x = rnd() * W, y = rnd() * H, r = 60 + rnd() * 260, gr = g.createRadialGradient(x, y, 0, x, y, r); const c = rnd() > 0.5 ? '120,110,96' : '30,26,22'; gr.addColorStop(0, `rgba(${c},${(0.05 + rnd() * 0.07).toFixed(3)})`); gr.addColorStop(1, `rgba(${c},0)`); g.fillStyle = gr; g.fillRect(x - r, y - r, 2 * r, 2 * r); }
    for (let i = 0; i < W * H / 18; i++) {
      const v = rnd();
      g.fillStyle = v > 0.5 ? `rgba(150,140,124,${((v - 0.5) * 0.12).toFixed(3)})` : `rgba(0,0,0,${((0.5 - v) * 0.16).toFixed(3)})`;
      g.fillRect(rnd() * W, rnd() * H, 1 + rnd() * 1.6, 1 + rnd() * 1.6);
    }
    // the saw-cut joints, every 120
    g.strokeStyle = 'rgba(10,8,6,0.55)'; g.lineWidth = 2;
    for (let x = (w / 2 % 120) * k; x < W; x += 120 * k) { g.beginPath(); g.moveTo(x, 0); g.lineTo(x, H); g.stroke(); }
    for (let y = (h / 2 % 120) * k; y < H; y += 120 * k) { g.beginPath(); g.moveTo(0, y); g.lineTo(W, y); g.stroke(); }
    g.strokeStyle = 'rgba(0,0,0,0.25)'; g.lineWidth = 1;
    for (let i = 0; i < 2; i++) { g.beginPath(); let x = rnd() * W, y = rnd() * H; g.moveTo(x, y); for (let s = 0; s < 12; s++) { x += (rnd() - 0.5) * 50; y += (rnd() - 0.3) * 40; g.lineTo(x, y); } g.stroke(); }
    // the stains: old blood, rust and oil, soft-edged, toward the drain
    for (let i = 0; i < stains; i++) {
      const x = rnd() * W, y = rnd() * H, r = 16 + rnd() * 90, c = rnd();
      const gr = g.createRadialGradient(x, y, 0, x, y, r);
      const col = c < 0.45 ? '66,16,12' : c < 0.7 ? '86,48,24' : '14,12,10';
      gr.addColorStop(0, `rgba(${col},${(0.18 + rnd() * 0.24).toFixed(2)})`); gr.addColorStop(1, `rgba(${col},0)`);
      g.fillStyle = gr; g.fillRect(x - r, y - r, 2 * r, 2 * r);
    }
    if (drain) {
      const [dx, dz] = drain, x = (w / 2 - dx) * k, y = (h / 2 + dz - 30) * k, r = 11 * k;
      const gr = g.createRadialGradient(x, y, r * 0.6, x, y, r * 2.6);
      gr.addColorStop(0, 'rgba(44,16,12,0.6)'); gr.addColorStop(1, 'rgba(44,16,12,0)');
      g.fillStyle = gr; g.fillRect(x - 3 * r, y - 3 * r, 6 * r, 6 * r);
    }
  });
}
// The wall's brick: common bricks in running bond, 20 x 6.5 to a 7.5
// course, aged red-brown, each its own shade, a clinker here and there,
// corners chipped; the joints recessed and dirty; rising damp and splash
// dark at the foot. (Colour and a height for the bump, 3.2 to the cm.)
function brickSurface() {
  const k = 3.2, W = Math.round(WALL.w * k), H = Math.round(WALL.brick * k);
  const mk = () => { const c = document.createElement('canvas'); c.width = W; c.height = H; return c; };
  const color = mk(), height = mk(), g = color.getContext('2d'), hg = height.getContext('2d');
  const rnd = seeded(29);
  g.fillStyle = '#4e463e'; g.fillRect(0, 0, W, H);
  hg.fillStyle = '#262626'; hg.fillRect(0, 0, W, H);
  for (let i = 0; i < W * H / 10; i++) { g.fillStyle = `rgba(${rnd() > 0.5 ? '150,140,124' : '20,18,14'},${(rnd() * 0.2).toFixed(2)})`; g.fillRect(rnd() * W, rnd() * H, 1.5, 1.5); }
  const pal = [[92, 36, 28], [100, 42, 32], [82, 32, 26], [74, 30, 24], [106, 50, 38], [88, 40, 32], [66, 28, 22]];
  const cH = 7.5 * k, bH = 6.5 * k, bL = 21 * k, bW = 20 * k;
  for (let r = 0; r * cH < H + cH; r++) {
    const y = H - (r + 1) * cH + (cH - bH) / 2, off = (r % 2) * bL / 2 + rnd() * 2;
    for (let x = -bL + off; x < W + bL; x += bL) {
      const c = pal[Math.floor(rnd() * pal.length)], v = 0.85 + rnd() * 0.3, clinker = rnd() < 0.06;
      const col = clinker ? [52, 30, 24] : c.map(t => t * v);
      const xx = x + (rnd() - 0.5) * 1.2, yy = y + (rnd() - 0.5) * 1.2, ww = bW + (rnd() - 0.5) * 2, hh = bH + (rnd() - 0.5) * 1.2;
      g.fillStyle = `rgb(${col[0] | 0},${col[1] | 0},${col[2] | 0})`; g.fillRect(xx, yy, ww, hh);
      // its face: fired unevenly, darker at one end, pitted
      const gr = g.createLinearGradient(xx, 0, xx + ww, 0); const a = (rnd() * 0.25).toFixed(2);
      gr.addColorStop(rnd() > 0.5 ? 0 : 1, `rgba(20,8,4,${a})`); gr.addColorStop(0.5, 'rgba(20,8,4,0)'); g.fillStyle = gr; g.fillRect(xx, yy, ww, hh);
      hg.fillStyle = `rgb(${190 + rnd() * 30 | 0},${190 + rnd() * 30 | 0},${190 + rnd() * 30 | 0})`; hg.fillRect(xx, yy, ww, hh);
      for (let p = 0; p < 26; p++) {
        const px = xx + rnd() * ww, py = yy + rnd() * hh, s = 0.8 + rnd() * 2.2;
        g.fillStyle = rnd() > 0.35 ? `rgba(30,14,8,${(0.25 + rnd() * 0.4).toFixed(2)})` : `rgba(200,150,110,${(0.15 + rnd() * 0.2).toFixed(2)})`; g.fillRect(px, py, s, s);
        hg.fillStyle = 'rgba(40,40,40,0.6)'; if (rnd() > 0.5) hg.fillRect(px, py, s, s);
      }
      // a chipped corner or two, down to the mortar's level
      for (let q = 0; q < 2; q++) if (rnd() < 0.3) {
        const cx = rnd() > 0.5 ? xx : xx + ww, cy = rnd() > 0.5 ? yy : yy + hh, s = 3 + rnd() * 6;
        g.fillStyle = '#5a4f45'; hg.fillStyle = '#3a3a3a';
        [g, hg].forEach(c2 => { c2.beginPath(); c2.moveTo(cx, cy); c2.lineTo(cx + (cx === xx ? s : -s), cy); c2.lineTo(cx, cy + (cy === yy ? s * 0.7 : -s * 0.7)); c2.closePath(); c2.fill(); });
      }
    }
  }
  // rising damp and splash at the foot, a soot of years toward the top
  const gr = g.createLinearGradient(0, 0, 0, H); gr.addColorStop(0, 'rgba(10,8,6,0.25)'); gr.addColorStop(0.35, 'rgba(10,8,6,0)'); gr.addColorStop(0.7, 'rgba(10,8,6,0.1)'); gr.addColorStop(1, 'rgba(14,10,8,0.6)');
  g.fillStyle = gr; g.fillRect(0, 0, W, H);
  for (let i = 0; i < 26; i++) { const x = rnd() * W, y = rnd() * H, r = 40 + rnd() * 160, s = g.createRadialGradient(x, y, 0, x, y, r); s.addColorStop(0, `rgba(12,8,6,${(0.18 + rnd() * 0.22).toFixed(2)})`); s.addColorStop(1, 'rgba(12,8,6,0)'); g.fillStyle = s; g.fillRect(x - r, y - r, 2 * r, 2 * r); }
  // the work's spray: old blood flung low across the middle, dried brown
  for (let i = 0; i < 160; i++) { const x = W * (0.3 + rnd() * 0.4), y = H * (0.55 + rnd() * 0.4), s = 1 + rnd() * 3.5; g.fillStyle = `rgba(${60 + rnd() * 20 | 0},10,8,${(0.3 + rnd() * 0.4).toFixed(2)})`; g.beginPath(); g.ellipse(x, y, s, s * (0.6 + rnd()), rnd() * 3, 0, Math.PI * 2); g.fill(); }
  for (let i = 0; i < 12; i++) { const x = W * (0.32 + rnd() * 0.36), y0 = H * (0.5 + rnd() * 0.3), l = (8 + rnd() * 30) * k, rg = g.createLinearGradient(0, y0, 0, y0 + l); rg.addColorStop(0, 'rgba(66,12,8,0.45)'); rg.addColorStop(1, 'rgba(66,12,8,0)'); g.fillStyle = rg; g.fillRect(x, y0, 1.5 + rnd() * 2, l); }
  return { color, height };
}
// The cladding's paint, Burnished Slate, years on: each panel a shade off
// the next, chalked pale toward the top where the weather had it, grime
// down low, rust run down from every screw (screws: [u, v] where they are).
function metalTex(screws) {
  const k = 3.2, W = Math.round(WALL.w * k), H = Math.round((WALL.h - WALL.brick) * k);
  return K.canvasTex(W, H, (g) => {
    const rnd = seeded(43);
    g.fillStyle = '#4a443e'; g.fillRect(0, 0, W, H);
    const pw = RIB.pitch * 3 * k;
    for (let x = 0, i = 0; x < W; x += pw, i++) { g.fillStyle = `rgba(${i % 2 ? '255,250,240' : '0,0,0'},${(0.025 + rnd() * 0.03).toFixed(3)})`; g.fillRect(x, 0, pw, H); }
    for (let i = 0; i < 70; i++) { const x = rnd() * W, y = rnd() * H * 0.6, r = 30 + rnd() * 140, gr = g.createRadialGradient(x, y, 0, x, y, r); gr.addColorStop(0, `rgba(170,165,155,${(0.04 + rnd() * 0.07).toFixed(3)})`); gr.addColorStop(1, 'rgba(170,165,155,0)'); g.fillStyle = gr; g.fillRect(x - r, y - r, 2 * r, 2 * r); }
    for (let i = 0; i < W * H / 30; i++) { const v = rnd(); g.fillStyle = v > 0.5 ? `rgba(200,190,175,${((v - 0.5) * 0.08).toFixed(3)})` : `rgba(0,0,0,${((0.5 - v) * 0.12).toFixed(3)})`; g.fillRect(rnd() * W, rnd() * H, 1.5, 1.5); }
    const gr = g.createLinearGradient(0, 0, 0, H); gr.addColorStop(0, 'rgba(0,0,0,0.15)'); gr.addColorStop(0.5, 'rgba(0,0,0,0)'); gr.addColorStop(1, 'rgba(18,12,8,0.45)');
    g.fillStyle = gr; g.fillRect(0, 0, W, H);
    // the rust run down from each screw
    screws.forEach(([u, v]) => {
      const x = u * W, y = (1 - v) * H;
      for (let s = 0; s < 3; s++) {
        const l = (6 + rnd() * 40) * k, w = 1.5 + rnd() * 3, dx = (rnd() - 0.5) * 3;
        const rg = g.createLinearGradient(0, y, 0, y + l); rg.addColorStop(0, `rgba(122,58,22,${(0.4 + rnd() * 0.3).toFixed(2)})`); rg.addColorStop(1, 'rgba(122,58,22,0)');
        g.fillStyle = rg; g.fillRect(x + dx - w / 2, y, w, l);
      }
      const rr = g.createRadialGradient(x, y, 0, x, y, 9); rr.addColorStop(0, 'rgba(110,50,20,0.6)'); rr.addColorStop(1, 'rgba(110,50,20,0)'); g.fillStyle = rr; g.fillRect(x - 9, y - 9, 18, 18);
    });
    // scratches, and a few old specks of the work low down
    g.lineWidth = 1;
    for (let i = 0; i < 60; i++) { const x = rnd() * W, y = rnd() * H, l = 10 + rnd() * 70, a = (rnd() - 0.5) * 1.2; g.strokeStyle = `rgba(${rnd() > 0.5 ? '170,160,150' : '20,16,12'},${(0.2 + rnd() * 0.3).toFixed(2)})`; g.beginPath(); g.moveTo(x, y); g.lineTo(x + Math.cos(a) * l, y + Math.sin(a) * l); g.stroke(); }
    for (let i = 0; i < 70; i++) { const x = W * (0.25 + rnd() * 0.5), y = H * (0.82 + rnd() * 0.18), s = 1 + rnd() * 2.5; g.fillStyle = `rgba(70,10,8,${(0.3 + rnd() * 0.4).toFixed(2)})`; g.fillRect(x, y, s, s * (1 + rnd())); }
  });
}
// The cladding's profile across x: a major rib every pitch (a trapezoid,
// its corners rolled), two small stiffening ribs in each flat between.
function ribAt(x) {
  const p = RIB.pitch, s = Math.abs((((x % p) + p) % p) - p / 2);
  let z = RIB.h * sstep(RIB.base / 2, RIB.top / 2, s);
  const m = Math.abs(s - (p / 2 - 3.7)) / 0.9;
  if (m < 1) z += RIB.minor * (1 - m * m);
  return z;
}
// a sheet of it, w x h, ribs up and down (axis 'x': the profile across x)
// or across (axis 'y'), its ribs standing toward +z
function corrugatedGeo(w, h, phase = 0, axis = 'x') {
  const geo = axis === 'x' ? new THREE.PlaneGeometry(w, h, Math.round(w * 4), 1) : new THREE.PlaneGeometry(w, h, 1, Math.round(h * 4));
  const p = geo.attributes.position;
  for (let i = 0; i < p.count; i++) p.setZ(i, ribAt((axis === 'x' ? p.getX(i) : p.getY(i)) + phase));
  geo.computeVertexNormals();
  return geo;
}
// Copper crocodile, embossed on leather, from the belly: rectangular
// scales in rows, the rows each a little off the next, each scale its own
// shade of a deep copper-brown, burnished on its crown, dark in the
// grooves. (Tiles; 512 to a 26 cm tile.)
function crocSurface() {
  const N = 512, rnd = seeded(61), ROWS = 13, rows = [];
  let acc = 0; const hs = Array.from({ length: ROWS }, () => 0.8 + rnd() * 0.4), ht = hs.reduce((s, h) => s + h, 0);
  hs.forEach(h => {
    const y0 = acc / ht, y1 = (acc + h) / ht, cells = [], n = 9 + Math.floor(rnd() * 2), off = rnd();
    let cx = 0; const ws = Array.from({ length: n }, () => 0.75 + rnd() * 0.5), wt = ws.reduce((s, w) => s + w, 0);
    ws.forEach(w => { cells.push({ x0: (cx / wt + off) % 1, w: w / wt, t: rnd(), u: rnd() }); cx += w; });
    rows.push({ y0, y1, cells }); acc += h;
  });
  const fine = vnoise(7, 96, 96);
  return surface(N, N, (x, y, o) => {
    const u = x / N, v = y / N, row = rows.find(r => v < r.y1) || rows[ROWS - 1];
    let cell = row.cells[0], du = 1;
    for (const c of row.cells) { let d = (u - c.x0) % 1; if (d < 0) d += 1; if (d < c.w) { cell = c; du = Math.min(d, c.w - d) / c.w; break; } }
    const rh = row.y1 - row.y0, dv = Math.min(v - row.y0, row.y1 - v) / rh;
    // (the distance to the scale's edge, in its own half-sizes, both ways)
    const e = Math.min(du * 2 * cell.w * N / 40, dv * 2 * rh * N / 40), edge = Math.min(du, dv);
    const groove = sstep(0.0, 0.32, e), crown = sstep(0.06, 0.5, edge), n = fine(u * 96, v * 96);
    const tone = (0.7 + cell.t * 0.45) * (0.62 + 0.38 * crown) + (n - 0.5) * 0.08;
    const r = (150 + cell.u * 24) * tone + 50 * crown * crown, gg = (82 + cell.u * 12) * tone + 30 * crown * crown, b = (42 + cell.u * 12) * tone + 14 * crown * crown;
    o.r = lerp(28, r, groove); o.g = lerp(13, gg, groove); o.b = lerp(8, b, groove);
    o.h = groove * (0.5 + 0.5 * crown) + (n - 0.5) * 0.05 * groove;
    o.k = lerp(0.9, 0.38 - 0.1 * crown, groove);
  });
}
// Distressed dark pine: a dark stain over flat-sawn pine, the grain's
// latewood lines, knots with the grain bent round them, the stain worn
// through to the raw wood in patches, scratches and dents. Grain along u.
// (Tiles; 512 to a 40 cm tile.)
function pineSurface() {
  const N = 512, rnd = seeded(83), warp = vnoise(5, 3, 6), streak = vnoise(9, 2, 48), wear = vnoise(13, 5, 5), fine = vnoise(17, 160, 160);
  const knots = [[0.28, 0.3, 0.045], [0.76, 0.74, 0.03]], RINGS = 18;
  const s = surface(N, N, (x, y, o) => {
    const u = x / N, v = y / N;
    let bend = 0, kd = 9, kr = 1;
    for (const [kx, ky, r] of knots) {
      let dx = u - kx, dy = v - ky; dx -= Math.round(dx); dy -= Math.round(dy);
      const d = Math.hypot(dx * 0.55, dy);
      if (d < kd) { kd = d; kr = r; }
      bend += Math.sign(dy) * r * r * 1.6 / (dx * dx * 0.3 + dy * dy + r * r);
    }
    const w = (fbm(warp, u * 3, v * 6, 3) - 0.5) * 1.4 + bend;
    let ring = (v * RINGS + w) % 1; if (ring < 0) ring += 1;
    let late = Math.exp(-Math.pow((ring - 0.78) / 0.08, 2));
    if (kd < kr * 2.4) { const rr = (kd / kr * 3) % 1; late = lerp(late, Math.exp(-Math.pow((rr - 0.7) / 0.12, 2)), sstep(kr * 2.4, kr * 1.2, kd)); }
    const core = sstep(kr * 0.75, kr * 0.45, kd);
    const worn = sstep(0.6, 0.7, fbm(wear, u * 5, v * 5, 4)), st = (streak(u * 2, v * 48) - 0.5) * 0.25, n = fine(u * 160, v * 160) - 0.5;
    const dark = [58 * (1 + st), 36 * (1 + st), 22 * (1 + st)], raw = [150 * (1 + st), 104 * (1 + st), 62 * (1 + st)];
    const base = [lerp(dark[0], raw[0], worn), lerp(dark[1], raw[1], worn), lerp(dark[2], raw[2], worn)];
    const lk = late * (0.5 + 0.2 * worn);
    o.r = base[0] * (1 - lk) * (1 + n * 0.1) * (1 - core * 0.7); o.g = base[1] * (1 - lk) * (1 + n * 0.1) * (1 - core * 0.7); o.b = base[2] * (1 - lk * 0.9) * (1 + n * 0.1) * (1 - core * 0.7);
    o.h = 0.45 + 0.35 * late * (0.6 + 0.4 * worn) + n * 0.06 - core * 0.2;
    o.k = 0.62 + 0.18 * worn + n * 0.05;
  });
  // the scratches across it, pale, and the dents, dark
  const g = s.color.getContext('2d'), hg = s.height.getContext('2d');
  for (let i = 0; i < 70; i++) {
    const x = rnd() * N, y = rnd() * N, l = 10 + rnd() * 80, a = (rnd() - 0.5) * 2.4;
    g.strokeStyle = `rgba(170,120,72,${(0.15 + rnd() * 0.3).toFixed(2)})`; g.lineWidth = 0.6 + rnd(); hg.strokeStyle = 'rgba(20,20,20,0.5)'; hg.lineWidth = 1;
    [g, hg].forEach(c => { c.beginPath(); c.moveTo(x, y); c.lineTo(x + Math.cos(a) * l, y + Math.sin(a) * l); c.stroke(); });
  }
  for (let i = 0; i < 30; i++) { const x = rnd() * N, y = rnd() * N, r = 1.5 + rnd() * 4; g.fillStyle = 'rgba(14,8,4,0.45)'; hg.fillStyle = 'rgba(0,0,0,0.6)'; [g, hg].forEach(c => { c.beginPath(); c.ellipse(x, y, r * 1.6, r, rnd() * 3, 0, Math.PI * 2); c.fill(); }); }
  return s;
}
// Burlap: a loose plain weave of jute, every thread its own thickness; the
// blood soaked up from the sack's bottom to a ragged tide line, darkest
// and wettest at the bottom, blots higher up. (u around the sack, v up.)
function burlapSurface(seed, soak) {
  const N = 512, P = 3, lvl = vnoise(seed, 5, 0), blot = vnoise(seed + 1, 7, 0), grime = vnoise(seed + 2, 6, 0), fz = vnoise(seed + 3, 512, 512);
  const th = i => 0.78 + 0.34 * (((Math.imul(i, 2654435761) + seed) >>> 0) % 1000) / 1000;
  return surface(N, N, (x, y, o) => {
    const ix = Math.floor(x / P), iy = Math.floor(y / P), fx = (x % P + 0.5) / P, fy = (y % P + 0.5) / P;
    const pv = Math.sin(Math.PI * fx), ph = Math.sin(Math.PI * fy);
    let t = ((ix + iy) & 1) ? pv * th(ix) : ph * th(iy + 7919);
    if (pv < 0.6 && ph < 0.6) t = 0.32;
    const u = x / N, vb = 1 - y / N, f = fz(x, y);
    const gr = 0.8 + 0.35 * fbm(grime, u * 6, vb * 4, 3);
    const tone = (0.5 + 0.55 * t) * gr * (0.92 + 0.16 * f);
    const dry = [160 * tone, 124 * tone, 80 * tone];
    const level = soak * (0.75 + 0.55 * fbm(lvl, u * 5, 0.5, 3));
    const s = sstep(level + 0.035, level - 0.04, vb), tide = Math.exp(-Math.pow((vb - level) / 0.012, 2));
    const bl = sstep(0.64, 0.72, fbm(blot, u * 7, vb * 5, 4)) * (1 - s) * sstep(0.95, 0.4, vb);
    const wetK = Math.max(s, bl * 0.8);
    const blood = [112 * tone + 16, 14 * tone + 3, 12 * tone + 3];
    o.r = lerp(dry[0], blood[0] * (1 - 0.35 * sstep(level * 0.6, 0, vb)), wetK) * (1 - 0.45 * tide);
    o.g = lerp(dry[1], blood[1], wetK) * (1 - 0.45 * tide);
    o.b = lerp(dry[2], blood[2], wetK) * (1 - 0.45 * tide);
    o.h = t * (1 - 0.35 * wetK);
    o.k = lerp(0.96, 0.4 - 0.22 * sstep(level, 0, vb), wetK);
  });
}
// Pink butcher paper, as a Texas smokehouse wraps a brisket: the fibre's
// streak, the folds' creases, blood seeping through in blots with a dark
// tide line at their edges, heaviest on the parcel's underside. Six faces
// in a 3 x 2 atlas (see atlasUV): +x, -x, top, bottom, +z, -z.
function paperSurface(seed) {
  const W = 640, H = 320, cw = W / 3, ch = H / 2, rnd = seeded(seed), blot = vnoise(seed, 0, 0), fib = vnoise(seed + 1, 0, 0);
  const wet = [0.6, 0.5, 0.15, 1, 0.65, 0.75];
  const grease = vnoise(seed + 2, 0, 0);
  const creases = wet.map(() => Array.from({ length: 4 }, () => { const a = rnd() * Math.PI, c = Math.cos(a), s = Math.sin(a); return { c, s, d: c * rnd() + s * rnd() }; }));
  return surface(W, H, (x, y, o) => {
    const col = Math.min(2, Math.floor(x / cw)), yb = H - 1 - y, rb = Math.min(1, Math.floor(yb / ch)), k = rb * 3 + col;
    const u = (x - col * cw) / cw, v = (yb - rb * ch) / ch;
    const edge = Math.min(u, 1 - u, v, 1 - v);
    let cr = 0; creases[k].forEach(l => { const d = (u * l.c + v * l.s - l.d) * 190; cr += Math.exp(-d * d) * (d > 0 ? 1 : -0.6); });
    // (the ends folded in as a parcel's are: the top and bottom flaps
    // turned down over the sides, their edges a crease from each corner)
    let flap = 0;
    if (k < 2) { const tl = Math.abs(v - 0.5) - Math.abs(u - 0.5) * 0.9; cr += Math.exp(-Math.pow(tl * 60, 2)) * 1.4; flap = tl > 0 ? (v > 0.5 ? 0.1 : -0.18) : 0; }
    const sideBias = (k === 2 || k === 3) ? 1 : 1.3 - v;
    const field = fbm(blot, u * 3.5 + k * 7.3, v * 3 + k * 3.1, 4) * sideBias * (0.62 + 0.45 * wet[k]);
    const s = sstep(0.6, 0.66, field), tide = Math.exp(-Math.pow((field - 0.6) / 0.012, 2)), deep = sstep(0.68, 0.9, field);
    const fbr = fib(u * 40 + k * 100, v * 6) - 0.5;
    const gs = sstep(0.55, 0.7, fbm(grease, u * 5 + k * 11, v * 5, 3));
    const paper = [158 + fbr * 12, 118 + fbr * 10, 96 + fbr * 8].map(c => c * (1 - 0.3 * sstep(0.07, 0, edge)) * (1 + cr * 0.13 + flap) * (1 - 0.22 * gs));
    const blood = [lerp(118, 66, deep), lerp(28, 10, deep), lerp(24, 8, deep)];
    o.r = lerp(paper[0], blood[0], s) * (1 - 0.4 * tide); o.g = lerp(paper[1], blood[1], s) * (1 - 0.45 * tide); o.b = lerp(paper[2], blood[2], s) * (1 - 0.45 * tide);
    o.h = 0.5 + cr * 0.45 + fbr * 0.1 + flap;
    o.k = lerp(0.86 - 0.3 * gs, 0.32, s * (0.5 + 0.5 * deep));
  });
}
// An old satchel's leather: dark oiled brown, mottled, worn pale at every
// edge and corner (the atlas's cells are its faces, so a cell's border is
// the bag's edge), scuffed; blood wiped across it in smears and run down.
function leatherSurface(seed) {
  const W = 640, H = 320, cw = W / 3, ch = H / 2, rnd = seeded(seed), mot = vnoise(seed, 0, 0), smear = vnoise(seed + 1, 0, 0), grain = vnoise(seed + 2, 0, 0);
  const drips = Array.from({ length: 6 }, () => Array.from({ length: 5 }, () => ({ u: 0.08 + rnd() * 0.84, v0: 0.3 + rnd() * 0.6, l: 0.15 + rnd() * 0.5, w: 0.006 + rnd() * 0.01 })));
  return surface(W, H, (x, y, o) => {
    const col = Math.min(2, Math.floor(x / cw)), yb = H - 1 - y, rb = Math.min(1, Math.floor(yb / ch)), k = rb * 3 + col;
    const u = (x - col * cw) / cw, v = (yb - rb * ch) / ch;
    const edge = Math.min(u, 1 - u, v, 1 - v), worn = sstep(0.07, 0, edge) * (0.6 + 0.4 * mot(u * 30 + k * 9, v * 30));
    const m = fbm(mot, u * 6 + k * 5, v * 6, 4), gr = grain(x * 1.1, y * 1.1) - 0.5;
    const scuff = sstep(0.68, 0.75, fbm(mot, u * 14 + 50, v * 14 + k * 3, 3));
    const base = [62 + m * 30, 38 + m * 18, 22 + m * 10];
    let sm = sstep(0.62, 0.7, fbm(smear, u * 2.2 + k * 4, v * 7, 4)) * (k === 2 ? 0.3 : 1);
    drips[k].forEach(d => { const dv = d.v0 - v; if (dv > 0 && dv < d.l) { const w = d.w * (1 - dv / d.l * 0.6); if (Math.abs(u - d.u) < w) sm = Math.max(sm, 0.9 * (1 - dv / d.l * 0.3)); } });
    const c = [lerp(base[0], 150, worn * 0.6 + scuff * 0.3), lerp(base[1], 104, worn * 0.6 + scuff * 0.3), lerp(base[2], 64, worn * 0.6 + scuff * 0.3)];
    o.r = lerp(c[0], 54, sm); o.g = lerp(c[1], 8, sm); o.b = lerp(c[2], 6, sm);
    o.h = 0.5 + gr * 0.35 + m * 0.1;
    o.k = lerp(0.58 + scuff * 0.2, 0.22, sm);
  });
}
// Cowhide, hair on: brown and cream, the hair's lie down the flap, the
// cut edge raw and red.
function hideTex() {
  const N = 256, rnd = seeded(97), pat = vnoise(97, 0, 0);
  const s = surface(N, N, (x, y, o) => { const p = sstep(0.48, 0.56, fbm(pat, x / N * 3, y / N * 3, 4)); mix3(o, [86, 54, 32], [212, 198, 172], p); o.h = 0.3; o.k = 0.9; });
  const g = s.color.getContext('2d'), hg = s.height.getContext('2d');
  for (let i = 0; i < 2600; i++) {
    const x = rnd() * N, y = rnd() * N, l = 5 + rnd() * 10, a = Math.PI / 2 + (rnd() - 0.5) * 0.7, img = g.getImageData(x | 0, y | 0, 1, 1).data, v = 0.75 + rnd() * 0.5;
    g.strokeStyle = `rgba(${img[0] * v | 0},${img[1] * v | 0},${img[2] * v | 0},0.85)`; g.lineWidth = 0.8 + rnd() * 0.6; hg.strokeStyle = `rgba(255,255,255,${(0.3 + rnd() * 0.5).toFixed(2)})`; hg.lineWidth = 1;
    [g, hg].forEach(c => { c.beginPath(); c.moveTo(x, y); c.lineTo(x + Math.cos(a) * l, y + Math.sin(a) * l); c.stroke(); });
  }
  const gr = g.createLinearGradient(0, 0, 0, 30); gr.addColorStop(0, 'rgba(110,14,12,0.95)'); gr.addColorStop(1, 'rgba(110,14,12,0)'); g.fillStyle = gr; g.fillRect(0, 0, N, 30);
  return { map: asTex(s.color), normalMap: embossTex(s.height, 1.6, 1) };
}
// bone: ivory, clean at its end, stained with the meat it came out of
// toward the wrap (v up the shaft)
function boneTex() {
  return K.canvasTex(64, 256, (g, W, H) => {
    const gr = g.createLinearGradient(0, H, 0, 0); gr.addColorStop(0, '#5a1410'); gr.addColorStop(0.3, '#9a4a38'); gr.addColorStop(0.55, '#d8c4a4'); gr.addColorStop(1, '#ece0c6');
    g.fillStyle = gr; g.fillRect(0, 0, W, H);
    const rnd = seeded(5);
    for (let i = 0; i < 40; i++) { g.strokeStyle = `rgba(${rnd() > 0.5 ? '140,40,30' : '120,100,70'},${(0.1 + rnd() * 0.25).toFixed(2)})`; g.lineWidth = 0.7; g.beginPath(); const x = rnd() * W, y = rnd() * H; g.moveTo(x, y); g.lineTo(x + (rnd() - 0.5) * 6, y - 10 - rnd() * 30); g.stroke(); }
  });
}
// a sawn bone's face: the hard ring, the red marrow in the middle
function marrowTex() {
  return K.canvasTex(128, 128, (g, W) => {
    const rnd = seeded(3), c = W / 2;
    g.fillStyle = '#e4d6b8'; g.beginPath(); g.arc(c, c, c, 0, Math.PI * 2); g.fill();
    const gr = g.createRadialGradient(c, c, 0, c, c, c * 0.62); gr.addColorStop(0, '#6a0e10'); gr.addColorStop(0.8, '#8a1c18'); gr.addColorStop(1, '#4a0a08');
    g.fillStyle = gr; g.beginPath(); g.arc(c + 3, c - 2, c * 0.6, 0, Math.PI * 2); g.fill();
    for (let i = 0; i < 260; i++) { const a = rnd() * 6.28, r = rnd() * c * 0.58; g.fillStyle = `rgba(${rnd() > 0.5 ? '30,4,4' : '170,60,50'},${(0.3 + rnd() * 0.4).toFixed(2)})`; g.fillRect(c + 3 + Math.cos(a) * r, c - 2 + Math.sin(a) * r, 2, 2); }
    g.strokeStyle = 'rgba(140,110,80,0.5)'; g.lineWidth = 2; g.beginPath(); g.arc(c, c, c - 3, 0, Math.PI * 2); g.stroke();
  });
}
// twine: three plies laid up, the lay running round it
function twineTex() {
  const t = K.canvasTex(128, 32, (g, W, H) => {
    g.fillStyle = '#a88a5c'; g.fillRect(0, 0, W, H);
    for (let x = -H; x < W + H; x += 8) { const gr = g.createLinearGradient(x, 0, x + 8, 0); gr.addColorStop(0, 'rgba(60,40,20,0.5)'); gr.addColorStop(0.5, 'rgba(230,200,150,0.25)'); gr.addColorStop(1, 'rgba(60,40,20,0.5)'); g.fillStyle = gr; g.beginPath(); g.moveTo(x, 0); g.lineTo(x + 8, 0); g.lineTo(x + 8 + H, H); g.lineTo(x + H, H); g.fill(); }
  });
  t.wrapS = t.wrapT = THREE.RepeatWrapping; t.repeat.set(24, 1);
  return t;
}
// A tag's face, the triangle's box (TAG.w x TAG.h) at 40 to the cm, the
// apex at the top: brushed brass gone to patina at its edge, the beaded
// border, the rim round the hole, W.T.G.F. struck under it, the platform's
// name in the die's script, its initials in letter punches. (Colour, and
// the height its normal map is made from: the beads and the hole's rim
// raised, the struck letters sunk.) A spent one's brass is tarnished.
const tagFont = { script: '"Pinyon Script", "Brush Script MT", cursive', house: 'Rye, "Special Elite", serif', punch: 'Oswald, Impact, sans-serif' };
function tagArt(card, spent) {
  const U = 40, W = TAG.w * U, H = TAG.h * U;
  const mk = () => { const c = document.createElement('canvas'); c.width = W; c.height = H; return c; };
  const color = mk(), height = mk(), g = color.getContext('2d'), hg = height.getContext('2d');
  const rnd = seeded(K.hash ? K.hash(card.id) : card.initials.charCodeAt(0) * 31 + 7);
  // (the triangle, inset d cm: scaled about its incentre)
  const sl = Math.hypot(W / 2, H), per = W + 2 * sl, ix = W / 2, iy = (W * 0 + sl * H + sl * H) / per, ri = W * H / per;
  const tri = (c, d) => { const k = (ri - d * U) / ri, P = ([x, y]) => [ix + (x - ix) * k, iy + (y - iy) * k]; const [a, b, e] = [[W / 2, 0], [0, H], [W, H]].map(P); c.beginPath(); c.moveTo(...a); c.lineTo(...b); c.lineTo(...e); c.closePath(); return [a, b, e]; };
  // the brass, brushed across
  const gr = g.createLinearGradient(0, 0, W, H);
  gr.addColorStop(0, '#e0ae46'); gr.addColorStop(0.5, '#b1802c'); gr.addColorStop(1, '#d29e3a');
  g.fillStyle = gr; g.fillRect(0, 0, W, H);
  for (let y = 0; y < H; y += 2) { g.fillStyle = `rgba(${rnd() > 0.5 ? '255,240,200' : '70,50,16'},${(0.03 + rnd() * 0.06).toFixed(3)})`; g.fillRect(0, y, W, 1); }
  for (let i = 0; i < 50; i++) { const x = rnd() * W, y = rnd() * H, l = 8 + rnd() * 50, a = (rnd() - 0.5) * 2; g.strokeStyle = `rgba(${rnd() > 0.5 ? '255,245,210' : '60,40,10'},${(0.12 + rnd() * 0.25).toFixed(2)})`; g.lineWidth = 0.8; g.beginPath(); g.moveTo(x, y); g.lineTo(x + Math.cos(a) * l, y + Math.sin(a) * l); g.stroke(); }
  // patina at the edge and in blooms
  for (let s = 0; s < 6; s++) { tri(g, 0.05 + s * 0.12); g.strokeStyle = `rgba(74,60,26,${(0.16 - s * 0.022).toFixed(3)})`; g.lineWidth = 14; g.stroke(); }
  for (let i = 0; i < 9; i++) { const x = rnd() * W, y = H * (0.3 + rnd() * 0.7), r = 10 + rnd() * 34, p = g.createRadialGradient(x, y, 0, x, y, r); p.addColorStop(0, 'rgba(70,64,30,0.22)'); p.addColorStop(1, 'rgba(70,64,30,0)'); g.fillStyle = p; g.fillRect(x - r, y - r, 2 * r, 2 * r); }
  hg.fillStyle = '#8c8c8c'; hg.fillRect(0, 0, W, H);
  // the beaded border
  const [a, b, e] = tri(g, 0.78), bead = (x, y) => {
    const r = 0.17 * U;
    let p = g.createRadialGradient(x - r * 0.35, y - r * 0.35, 0, x, y, r); p.addColorStop(0, 'rgba(255,240,190,0.9)'); p.addColorStop(0.7, 'rgba(190,150,70,0.6)'); p.addColorStop(1, 'rgba(70,50,16,0.5)');
    g.fillStyle = p; g.beginPath(); g.arc(x, y, r, 0, Math.PI * 2); g.fill();
    p = hg.createRadialGradient(x, y, 0, x, y, r); p.addColorStop(0, '#fff'); p.addColorStop(1, '#8c8c8c'); hg.fillStyle = p; hg.beginPath(); hg.arc(x, y, r, 0, Math.PI * 2); hg.fill();
  };
  [[a, b], [b, e], [e, a]].forEach(([p, q]) => { const L = Math.hypot(q[0] - p[0], q[1] - p[1]), n = Math.round(L / (0.6 * U)); for (let i = 0; i < n; i++) bead(lerp(p[0], q[0], i / n), lerp(p[1], q[1], i / n)); });
  // the rim round the hole
  const hy = TAG.holeY * U, hr = (TAG.hole + 0.24) * U;
  g.strokeStyle = 'rgba(255,236,180,0.7)'; g.lineWidth = 0.18 * U; g.beginPath(); g.arc(W / 2, hy, hr, 0, Math.PI * 2); g.stroke();
  hg.strokeStyle = '#fff'; hg.lineWidth = 0.18 * U; hg.beginPath(); hg.arc(W / 2, hy, hr, 0, Math.PI * 2); hg.stroke();
  g.fillStyle = '#120d08'; g.beginPath(); g.arc(W / 2, hy, TAG.hole * U, 0, Math.PI * 2); g.fill();
  // the struck lettering: each a hair off true, its floor dark with grime,
  // a bright lip where the punch's wall catches the light
  const widthAt = d => W * d / TAG.h - 1.9 * U;
  const strike = (text, font, x, y, maxW, px, rot = 0) => {
    let size = px; g.font = `${font.replace('%', size)}`; let w = g.measureText(text).width;
    if (w > maxW) { size = px * maxW / w; }
    const f = font.replace('%', size.toFixed(1));
    [g, hg].forEach(c => { c.save(); c.translate(x, y); c.rotate(rot); c.font = f; c.textAlign = 'center'; c.textBaseline = 'alphabetic'; });
    g.fillStyle = 'rgba(255,240,200,0.55)'; g.fillText(text, 1.2, 1.4);
    g.fillStyle = spent ? '#1c150c' : '#3a280e'; g.fillText(text, 0, 0);
    hg.fillStyle = '#1e1e1e'; hg.fillText(text, 0, 0);
    [g, hg].forEach(c => c.restore());
  };
  const tilt = () => (rnd() - 0.5) * 0.04;
  strike('W.T.G.F.', `400 %px ${tagFont.house}`, W / 2, 4.85 * U, widthAt(4.85) - 0.2 * U, 0.82 * U, tilt());
  strike(card.name, `400 %px ${tagFont.script}`, W / 2, 6.95 * U, widthAt(6.95) - 0.1 * U, 1.7 * U, tilt());
  const cap = 3.1 * U;
  g.font = `700 100px ${tagFont.punch}`; const m = g.measureText('H'), capOf100 = (m.actualBoundingBoxAscent || 72);
  const ps = 100 * cap / capOf100, chars = [...card.initials];
  g.font = `700 ${ps}px ${tagFont.punch}`;
  const cw = chars.map(ch => g.measureText(ch).width), gap = 0.25 * U, tw = cw.reduce((s, w) => s + w, 0) + gap * (chars.length - 1);
  let cx = W / 2 - tw / 2;
  chars.forEach((ch, i) => { strike(ch, `700 %px ${tagFont.punch}`, cx + cw[i] / 2 + (rnd() - 0.5) * 2, 10.85 * U + (rnd() - 0.5) * 2, 999, ps, tilt() * 1.5); cx += cw[i] + gap; });
  // (spent: the brass gone over to a dull grey-green, its blooms of
  // verdigris, the letters still dark - an old tag, not a shadowed one)
  if (spent) {
    g.globalCompositeOperation = 'color'; g.fillStyle = 'rgba(118,132,104,0.85)'; g.fillRect(0, 0, W, H);
    g.globalCompositeOperation = 'multiply'; g.fillStyle = 'rgb(176,180,166)'; g.fillRect(0, 0, W, H);
    g.globalCompositeOperation = 'source-over';
    for (let i = 0; i < 14; i++) { const x = rnd() * W, y = H * (0.25 + rnd() * 0.75), r = 8 + rnd() * 30, p = g.createRadialGradient(x, y, 0, x, y, r); p.addColorStop(0, 'rgba(96,150,120,0.35)'); p.addColorStop(1, 'rgba(96,150,120,0)'); g.fillStyle = p; g.fillRect(x - r, y - r, 2 * r, 2 * r); }
  }
  return { color, height };
}
// the tag's plate: the rounded triangle with its hole, its faces mapped to
// the art's box (the origin at its centroid, the face toward -z)
function tagGeo() {
  const { w, h, r } = TAG, yA = h * 2 / 3, yB = -h / 3;
  const P = [[0, yA], [-w / 2, yB], [w / 2, yB]], s = new THREE.Shape();
  P.forEach((p, i) => {
    const q = P[(i + P.length - 1) % 3], n = P[(i + 1) % 3];
    const a = [q[0] - p[0], q[1] - p[1]], b = [n[0] - p[0], n[1] - p[1]], la = Math.hypot(...a), lb = Math.hypot(...b);
    const ang = Math.acos((a[0] * b[0] + a[1] * b[1]) / la / lb), t = r / Math.tan(ang / 2);
    const p1 = [p[0] + a[0] / la * t, p[1] + a[1] / la * t], p2 = [p[0] + b[0] / lb * t, p[1] + b[1] / lb * t];
    if (i === 0) s.moveTo(...p1); else s.lineTo(...p1);
    s.quadraticCurveTo(p[0], p[1], ...p2);
  });
  s.closePath();
  const hole = new THREE.Path(); hole.absarc(0, yA - TAG.holeY, TAG.hole, 0, Math.PI * 2, true); s.holes.push(hole);
  const uv = {
    generateTopUV(geo, v, a, b, c) { return [a, b, c].map(i => new THREE.Vector2((v[i * 3] + w / 2) / w, (v[i * 3 + 1] - yB) / h)); },
    generateSideWallUV() { return [0, 0, 0, 0].map(() => new THREE.Vector2(0.5, 0.5)); }
  };
  const geo = new THREE.ExtrudeGeometry(s, { depth: TAG.t, bevelEnabled: true, bevelThickness: 0.05, bevelSize: 0.05, bevelSegments: 2, curveSegments: 10, UVGenerator: uv });
  geo.translate(0, 0, -TAG.t / 2);
  geo.rotateY(Math.PI);
  return geo;
}

// ------------------------------------------------------------ geometry
// UVs for a tiled surface, laid on by its faces' directions (s cm to a
// tile), its grain along `grain` where a face shows it
function boxUV(geo, s, grain = 'x') {
  const p = geo.attributes.position, n = geo.attributes.normal, uv = geo.attributes.uv, gi = 'xyz'.indexOf(grain);
  for (let i = 0; i < p.count; i++) {
    const nv = [Math.abs(n.getX(i)), Math.abs(n.getY(i)), Math.abs(n.getZ(i))], d = nv.indexOf(Math.max(...nv));
    const rest = [0, 1, 2].filter(a => a !== d), pv = [p.getX(i), p.getY(i), p.getZ(i)];
    const [a, b] = rest.includes(gi) ? [gi, rest.find(q => q !== gi)] : rest;
    uv.setXY(i, pv[a] / s, pv[b] / s);
  }
  uv.needsUpdate = true;
  return geo;
}
// A box w x h x d with its edges rounded r: s rows of the box's grid in
// each rounded edge, m across the flat between (1: one flat face; more
// for a surface that will be pushed about).
function slab(w, h, d, r, s = 3, m = 1) {
  const N = 2 * s + m, g = new THREE.BoxGeometry(1, 1, 1, N, N, N);
  const p = g.attributes.position, n = g.attributes.normal, size = [w, h, d], v = [0, 0, 0];
  const at = (c, L) => { const i = Math.round((c + 0.5) * N), half = L / 2; return i <= s ? -half + r * i / s : i >= s + m ? half - r + r * (i - s - m) / s : -half + r + (L - 2 * r) * (i - s) / m; };
  for (let i = 0; i < p.count; i++) {
    v[0] = at(p.getX(i), w); v[1] = at(p.getY(i), h); v[2] = at(p.getZ(i), d);
    const q = v.map((c, a) => Math.min(size[a] / 2 - r, Math.max(-(size[a] / 2 - r), c)));
    let ex = v[0] - q[0], ey = v[1] - q[1], ez = v[2] - q[2], l = Math.hypot(ex, ey, ez);
    if (l < 1e-6) { ex = n.getX(i); ey = n.getY(i); ez = n.getZ(i); l = 1; }
    ex /= l; ey /= l; ez /= l;
    n.setXYZ(i, ex, ey, ez);
    p.setXYZ(i, q[0] + ex * r, q[1] + ey * r, q[2] + ez * r);
  }
  return g;
}
// a box's six faces onto a 3 x 2 atlas (+x, -x, top / bottom, +z, -z),
// each face by where its points are (so a rounded edge splits between
// the two faces it joins), each the right way up seen from outside
function atlasUV(geo, w, h, d) {
  const p = geo.attributes.position, n = geo.attributes.normal, uv = geo.attributes.uv;
  for (let i = 0; i < p.count; i++) {
    const x = p.getX(i) / w + 0.5, y = p.getY(i) / h + 0.5, z = p.getZ(i) / d + 0.5;
    const ax = Math.abs(n.getX(i)), ay = Math.abs(n.getY(i)), az = Math.abs(n.getZ(i));
    let k, u, v;
    if (ax >= ay && ax >= az) { k = n.getX(i) > 0 ? 0 : 1; u = k ? z : 1 - z; v = y; }
    else if (ay >= az) { k = n.getY(i) > 0 ? 2 : 3; u = x; v = k === 2 ? 1 - z : z; }
    else { k = n.getZ(i) > 0 ? 4 : 5; u = k === 4 ? x : 1 - x; v = y; }
    u = Math.min(0.995, Math.max(0.005, u)); v = Math.min(0.995, Math.max(0.005, v));
    uv.setXY(i, (k % 3 + u) / 3, (Math.floor(k / 3) + v) / 2);
  }
  uv.needsUpdate = true;
  return geo;
}
// the normals of points that sit together made one (a box's faces each
// keep their own points along its edges)
function weldNormals(geo) {
  const p = geo.attributes.position, n = geo.attributes.normal, acc = new Map(), key = i => `${p.getX(i).toFixed(3)},${p.getY(i).toFixed(3)},${p.getZ(i).toFixed(3)}`;
  for (let i = 0; i < p.count; i++) { const k = key(i), a = acc.get(k) || [0, 0, 0]; a[0] += n.getX(i); a[1] += n.getY(i); a[2] += n.getZ(i); acc.set(k, a); }
  for (let i = 0; i < p.count; i++) { const a = acc.get(key(i)), l = Math.hypot(...a) || 1; n.setXYZ(i, a[0] / l, a[1] / l, a[2] / l); }
  n.needsUpdate = true;
  return geo;
}
// push a geometry's points about by a noise (amp), along their normals
function lumpy(geo, amp, scale, seed) {
  const nz = vnoise(seed), p = geo.attributes.position, nr = geo.attributes.normal;
  for (let i = 0; i < p.count; i++) {
    const x = p.getX(i), y = p.getY(i), z = p.getZ(i), d = (fbm(nz, x / scale + z / scale * 0.7, y / scale + z / scale * 0.3, 3) - 0.5) * 2 * amp;
    p.setXYZ(i, x + nr.getX(i) * d, y + nr.getY(i) * d, z + nr.getZ(i) * d);
  }
  return geo;
}
const relit = geo => { geo.computeVertexNormals(); return weldNormals(geo); };
const tube = (pts, r, mat, seg = 32, rs = 8) => new THREE.Mesh(new THREE.TubeGeometry(new THREE.CatmullRomCurve3(pts.map(p => V(...p))), seg, r, rs, false), mat);

// ------------------------------------------------------------ the set
function steelMat(color = 0x2a2724, rough = 0.5) {
  const m = new THREE.MeshStandardMaterial({ color, metalness: 0.85, roughness: rough });
  return K.finished(m, 'brushed', 2, 2, 0.12);
}
// (the heavy surfaces are painted one at a time, the page let breathe
// between them, so the shot playing while the room is built keeps time)
const breathe = () => new Promise(r => setTimeout(r, 0));
async function buildFloorAndWall() {
  const g = new THREE.Group();
  const floor = new THREE.Mesh(new THREE.PlaneGeometry(520, 460), new THREE.MeshStandardMaterial({ map: concreteTex(520, 460, 3, 30, DRAIN), roughness: 0.86, metalness: 0 }));
  floor.rotation.x = -Math.PI / 2; floor.position.set(0, BENCH.floor + 0.15, 30); floor.receiveShadow = true;
  g.add(floor);
  // the drain: a cast grate in a dished ring
  const drain = new THREE.Group();
  drain.position.set(DRAIN[0], BENCH.floor + 0.2, DRAIN[1]);
  const ring = new THREE.Mesh(new THREE.RingGeometry(9, 12, 32), new THREE.MeshStandardMaterial({ color: 0x1c1a18, metalness: 0.7, roughness: 0.6 }));
  ring.rotation.x = -Math.PI / 2; drain.add(ring);
  const grate = new THREE.Mesh(new THREE.CircleGeometry(9, 32), new THREE.MeshStandardMaterial({ color: 0x0b0a09, metalness: 0.6, roughness: 0.7 }));
  grate.rotation.x = -Math.PI / 2; grate.position.y = -0.6; drain.add(grate);
  const bars = new THREE.InstancedMesh(new THREE.BoxGeometry(1, 0.6, 1), new THREE.MeshStandardMaterial({ color: 0x24211e, metalness: 0.7, roughness: 0.55 }), 7);
  const m4 = new THREE.Matrix4();
  for (let i = 0; i < 7; i++) { const x = (i - 3) * 2.6, l = 2 * Math.sqrt(Math.max(0, 81 - x * x)); m4.makeScale(1.1, 1, l).setPosition(x, -0.1, 0); bars.setMatrixAt(i, m4); }
  drain.add(bars);
  g.add(drain);
  // the brick, proud of the cladding by a veneer's depth, to over the bench
  await breathe();
  const bs = brickSurface();
  await breathe();
  const brick = new THREE.Mesh(new THREE.PlaneGeometry(WALL.w, WALL.brick), new THREE.MeshStandardMaterial({ map: asTex(bs.color), normalMap: embossTex(bs.height, 2.4, 1), roughness: 0.93, metalness: 0 }));
  brick.position.set(0, BENCH.floor + WALL.brick / 2, WALL.z - 4); brick.rotation.y = Math.PI; brick.receiveShadow = true;
  g.add(brick);
  // the sill over it: a steel angle the cladding stands on
  const sill = new THREE.Mesh(new THREE.BoxGeometry(WALL.w, 1.5, 6), steelMat(0x2e2a26, 0.6));
  sill.position.set(0, BENCH.floor + WALL.brick + 0.75, WALL.z - 3.4); sill.castShadow = true; sill.receiveShadow = true;
  g.add(sill);
  // the cladding: ribs up and down, screwed at the flats beside each rib
  const mh = WALL.h - WALL.brick, screws = [];
  const sx0 = RIB.pitch / 2 - 5.8, sx1 = sx0 - RIB.pitch * Math.floor((WALL.w / 2 + sx0) / RIB.pitch);
  for (let x = sx1; x < WALL.w / 2 - 2; x += RIB.pitch) [10, 70, 140].forEach(y => screws.push([x, y - mh / 2]));
  await breathe();
  const metalMat = new THREE.MeshStandardMaterial({ map: metalTex(screws.map(([x, y]) => [(x + WALL.w / 2) / WALL.w, (y + mh / 2) / mh])), roughness: 0.55, metalness: 0.3 });
  K.finished(metalMat, 'peel', 6, 4, 0.2); metalMat.roughness = 0.55;
  const metal = new THREE.Mesh(corrugatedGeo(WALL.w, mh), metalMat);
  metal.position.set(0, BENCH.floor + WALL.brick + mh / 2, WALL.z); metal.rotation.y = Math.PI; metal.receiveShadow = true;
  const screw = new THREE.CylinderGeometry(0.62, 0.62, 0.4, 6); screw.rotateX(Math.PI / 2);
  const heads = new THREE.InstancedMesh(screw, steelMat(0x4a4038, 0.6), screws.length), q = new THREE.Quaternion(), one = V(1, 1, 1);
  screws.forEach(([x, y], i) => { heads.setMatrixAt(i, m4.compose(V(x, y, ribAt(x) + 0.2), q, one)); });
  metal.add(heads);
  g.add(metal);
  return g;
}
// A bench in the reference's make: the pad on top in copper croc, close
// nailed round its foot; under it a pine apron, square legs to the floor,
// stretchers and a slatted shelf low down. top: the pad's top; z0: its
// near edge.
function buildBench(mats, b) {
  const g = new THREE.Group();
  const { w, d, z0, top, cush, apron, legs } = b, zc = z0 + d / 2, inset = 1.2;
  const add = (geo, mat, x, y, z) => { const m = new THREE.Mesh(geo, mat); m.position.set(x, y, z); m.castShadow = true; m.receiveShadow = true; g.add(m); return m; };
  add(boxUV(slab(w, cush, d, 1.5, 4), 26), mats.croc, 0, top - cush / 2, zc);
  // the nailheads, close set round the pad's foot
  const pitch = 2.3, ny = top - cush + 1.7, pts = [];
  for (let x = -w / 2 + 2; x <= w / 2 - 2; x += pitch) { pts.push([x, z0 - 0.02, 0, -1]); pts.push([x, z0 + d + 0.02, 0, 1]); }
  for (let z = z0 + 2 + pitch; z <= z0 + d - 2 - pitch / 2; z += pitch) { pts.push([w / 2 + 0.02, z, 1, 0]); pts.push([-w / 2 - 0.02, z, -1, 0]); }
  const head = new THREE.SphereGeometry(0.62, 12, 6, 0, Math.PI * 2, 0, Math.PI / 2);
  const nails = new THREE.InstancedMesh(head, mats.nail, pts.length), m4 = new THREE.Matrix4(), q = new THREE.Quaternion(), one = V(1, 1, 1);
  pts.forEach(([x, z, nx, nz], i) => { q.setFromUnitVectors(V(0, 1, 0), V(nx, 0, nz)); nails.setMatrixAt(i, m4.compose(V(x, ny, z), q, one)); });
  nails.castShadow = true; g.add(nails);
  // the apron, set in a little under the pad
  const ay = top - cush - apron / 2, th = 2.6;
  [z0 + inset + th / 2, z0 + d - inset - th / 2].forEach(z => add(boxUV(slab(w - 2 * inset, apron, th, 0.5, 2), 40, 'x'), mats.pine, 0, ay, z));
  [-1, 1].forEach(sx => add(boxUV(slab(th, apron, d - 2 * inset - 2 * th, 0.5, 2), 40, 'z'), mats.pine, sx * (w / 2 - inset - th / 2), ay, zc));
  // the legs, their arrises broken
  const legH = top - cush - BENCH.floor, ly = top - cush - legH / 2;
  [-1, 1].forEach(sx => [-1, 1].forEach(sz => add(boxUV(slab(legs, legH, legs, 0.7, 2), 40, 'y'), mats.pine, sx * (w / 2 - inset - legs / 2), ly, zc + sz * (d / 2 - inset - legs / 2))));
  // the stretchers and the shelf's slats on them
  const sy = BENCH.floor + legH * 0.2, xl = w - 2 * inset - 2 * legs, zl = d - 2 * inset - 2 * legs;
  [-1, 1].forEach(sz => add(boxUV(slab(xl, 5, th, 0.5, 2), 40, 'x'), mats.pine, 0, sy, zc + sz * (d / 2 - inset - legs / 2)));
  [-1, 1].forEach(sx => add(boxUV(slab(th, 5, zl, 0.5, 2), 40, 'z'), mats.pine, sx * (w / 2 - inset - legs / 2), sy, zc));
  const n = Math.max(3, Math.round(zl / 9)), sw = zl / n - 1.2;
  for (let i = 0; i < n; i++) add(boxUV(slab(xl + legs, 1.8, sw, 0.4, 2), 40, 'x'), mats.pine, 0, sy + 3.4, zc - zl / 2 + (i + 0.5) * zl / n);
  return g;
}
// the rail: an I-beam from RAIL.from to RAIL.to at RAIL.y, an end stop at
// the wall, on hangers up into the dark
const railAt = t => [lerp(RAIL.from[0], RAIL.to[0], t), lerp(RAIL.from[1], RAIL.to[1], t)];
const RAIL_YAW = Math.atan2(-(RAIL.to[1] - RAIL.from[1]), RAIL.to[0] - RAIL.from[0]);
function buildRail() {
  const g = new THREE.Group();
  const steel = new THREE.MeshStandardMaterial({ color: 0x8a8984, metalness: 0.6, roughness: 0.48 });
  K.finished(steel, 'blast', 2, 2, 0.15);
  const L = Math.hypot(RAIL.to[0] - RAIL.from[0], RAIL.to[1] - RAIL.from[1]), [mx, mz] = railAt(0.5);
  const beam = new THREE.Group(); beam.position.set(mx, 0, mz); beam.rotation.y = RAIL_YAW;
  const web = new THREE.Mesh(new THREE.BoxGeometry(L, 7.4, 1.0), steel); web.position.y = RAIL.y + 4.6;
  const fl1 = new THREE.Mesh(new THREE.BoxGeometry(L, 1.2, RAIL.flange), steel); fl1.position.y = RAIL.y + 8.6;
  const fl2 = new THREE.Mesh(new THREE.BoxGeometry(L, 1.2, RAIL.flange), steel); fl2.position.y = RAIL.y + 0.6;
  const stop = new THREE.Mesh(new THREE.BoxGeometry(2.4, 5, RAIL.flange + 1), steel); stop.position.set(L / 2 - 1.2, RAIL.y + 1.2, 0);
  [web, fl1, fl2, stop].forEach(m => { m.castShadow = true; m.receiveShadow = true; beam.add(m); });
  g.add(beam);
  // (a hanger up into the dark at the near end; at the wall, a bracket
  // plate screwed through the cladding and a stub out to the rail's end)
  { const [x, z] = railAt(0.03); const h = new THREE.Mesh(new THREE.BoxGeometry(3.4, 200, 3.4), steel); h.position.set(x, RAIL.y + 109, z); h.rotation.y = RAIL_YAW; h.castShadow = true; g.add(h); }
  { const [x, z] = railAt(1), wz = WALL.z - RIB.h - 0.5;
    const plate = new THREE.Mesh(new THREE.BoxGeometry(12, 18, 1), steel); plate.position.set(x, RAIL.y + 4.5, wz); plate.castShadow = true; g.add(plate);
    const stub = new THREE.Mesh(new THREE.BoxGeometry(3, 9, Math.max(1, wz - z)), steel); stub.position.set(x, RAIL.y + 4.5, (z + wz) / 2); stub.castShadow = true; g.add(stub);
    const bolt = new THREE.CylinderGeometry(0.7, 0.7, 0.6, 6); bolt.rotateX(Math.PI / 2);
    [[-4, -6.5], [4, -6.5], [-4, 6.5], [4, 6.5]].forEach(([bx, by]) => { const b = new THREE.Mesh(bolt, steel); b.position.set(x + bx, RAIL.y + 4.5 + by, wz - 0.7); g.add(b); }); }
  return g;
}
// a length of chain: forged oval links, each turned ninety degrees from
// the last, hanging straight down from (x, y0, z) by n links
function chainGeo() {
  const geo = new THREE.TorusGeometry(1.05, 0.28, 8, 18);
  geo.scale(1, 1.45, 1);
  return geo;
}
function buildChain(mat, n, pitch, x, y0, z, parent) {
  const geo = chainGeo();
  const inst = new THREE.InstancedMesh(geo, mat, n);
  const m4 = new THREE.Matrix4(), q = new THREE.Quaternion(), p = V(0, 0, 0), s = V(pitch / 2.7, pitch / 2.7, pitch / 2.7);
  for (let i = 0; i < n; i++) {
    q.setFromAxisAngle(V(0, 1, 0), i % 2 ? Math.PI / 2 : 0);
    p.set(x, y0 - i * pitch - pitch / 2, z);
    m4.compose(p, q, s);
    inst.setMatrixAt(i, m4);
  }
  inst.castShadow = true;
  parent.add(inst);
  return inst;
}

// ------------------------------------------------------------ the loads
// Each hangs from the hook's bend at its origin, down -y, its front to -z;
// each says where its tag's ring is (ring), which way the tag leans out
// (lean) and rolls (roll), where its bottom is (foot).
async function loadKit(set) {
  const burlap = [];
  for (let i = 0; i < 2; i++) { burlap.push(new THREE.MeshStandardMaterial(Object.assign(surfaceTex(burlapSurface(101 + i * 17, 0.3 + i * 0.12), 1.3, 0), { roughness: 1, metalness: 0, side: THREE.DoubleSide }))); await breathe(); }
  const paper = new THREE.MeshStandardMaterial(Object.assign(surfaceTex(paperSurface(131), 1.2, 1), { roughness: 1, metalness: 0 }));
  await breathe();
  const leather = new THREE.MeshStandardMaterial(Object.assign(surfaceTex(leatherSurface(151), 1.4, 1), { roughness: 1, metalness: 0 }));
  await breathe();
  const hide = new THREE.MeshStandardMaterial(Object.assign(hideTex(), { roughness: 0.9, metalness: 0, side: THREE.DoubleSide }));
  const bone = new THREE.MeshPhysicalMaterial({ map: boneTex(), roughness: 0.42, clearcoat: 0.35, clearcoatRoughness: 0.35 });
  const marrow = new THREE.MeshPhysicalMaterial({ map: marrowTex(), roughness: 0.35, clearcoat: 0.6, clearcoatRoughness: 0.2 });
  const twine = new THREE.MeshStandardMaterial({ map: twineTex(), roughness: 0.95, metalness: 0 });
  const blood = new THREE.MeshPhysicalMaterial({ color: 0x3c0405, roughness: 0.14, clearcoat: 1, clearcoatRoughness: 0.05 });
  const meat = new THREE.MeshPhysicalMaterial({ color: 0x5c100e, roughness: 0.32, clearcoat: 0.7, clearcoatRoughness: 0.2 });
  const wire = steelMat(0x77736a, 0.38);
  const galv = new THREE.MeshStandardMaterial({ color: 0x8a8984, metalness: 0.6, roughness: 0.48 });
  K.finished(galv, 'blast', 2, 2, 0.15);
  const brass = K.polishedOf(set.brass, 0.32);
  const iron = steelMat(0x1f1d1b, 0.5), ironBright = K.polishedOf(iron, 0.35);
  return { burlap, paper, leather, hide, bone, marrow, twine, blood, meat, wire, brass, galv, iron, ironBright };
}
// a bone's end: its shaft out of whatever holds it (from base, toward
// dir, len long) and its end - the joint's knuckles, or the saw's face
function boneEnd(kit, base, dir, len, r, sawn) {
  const g = new THREE.Group(), d = dir.clone().normalize();
  const shaft = new THREE.Mesh(new THREE.CylinderGeometry(r, r * 1.12, len, 14, 1, true), kit.bone);
  shaft.position.copy(base).addScaledVector(d, len / 2); shaft.quaternion.setFromUnitVectors(V(0, 1, 0), d); g.add(shaft);
  const tip = base.clone().addScaledVector(d, len);
  if (sawn) {
    const face = new THREE.Mesh(new THREE.CircleGeometry(r, 20), kit.marrow);
    face.position.copy(tip); face.quaternion.setFromUnitVectors(V(0, 0, 1), d); g.add(face);
  } else {
    const side = V(1, 0, 0).cross(d).lengthSq() > 0.01 ? V(1, 0, 0).cross(d).normalize() : V(0, 0, 1);
    [[-0.62, 1.35], [0.62, 1.22]].forEach(([s, k]) => { const kn = new THREE.Mesh(new THREE.SphereGeometry(r * k, 16, 12), kit.bone); kn.position.copy(tip).addScaledVector(side, s * r).addScaledVector(d, r * 0.25); kn.scale.set(1, 0.9, 1); g.add(kn); });
  }
  g.traverse(m => { if (m.isMesh) m.castShadow = true; });
  return g;
}
// a drop gathering at a low point, and a run of blood down from it
function drip(kit, x, y, z, s) {
  const g = new THREE.Group();
  const run = new THREE.Mesh(new THREE.CylinderGeometry(0.1 * s, 0.22 * s, 1.6 * s, 8), kit.blood); run.position.set(x, y - 0.8 * s, z); g.add(run);
  const m = new THREE.Mesh(new THREE.SphereGeometry(0.6 * s, 12, 10), kit.blood);
  m.scale.set(1, 1.5, 1); m.position.set(x, y - 2.0 * s, z); g.add(m);
  return g;
}
// the twine loop a load hangs by: from its tie, up through the hook's bend
// at the origin, and down again
function hangLoop(kit, spread, low) {
  return tube([[-spread, low, 0], [-spread * 0.8, low * 0.45, 0.15], [-0.9, -0.55, 0], [0, 0.35, 0], [0.9, -0.55, 0], [spread * 0.8, low * 0.45, -0.15], [spread, low, 0]], 0.24, kit.twine, 40, 6);
}
// The burlap sack: tied at the neck with three turns of twine, the top
// gathered over the tie, its belly lumpy with what is in it and sagging
// off true, the blood up from its bottom; or (open) the neck loose, a
// bone's knuckle out of its mouth, a flap of hide over the lip, meat at it.
function buildSack(kit, rnd, open) {
  const g = new THREE.Group();
  // (a sack, not a purse: a woven tube sewn across its bottom, so it hangs
  // long and straight-sided, flat front to back, its bottom seam's two
  // corners standing out as ears; the top twisted and tied, not flared)
  const prof = open
    ? [[0, -28], [4.6, -27.8], [6.5, -27], [6.9, -24.5], [6.9, -18], [6.6, -12.5], [5.8, -9], [4.6, -6.6], [3.9, -5.2], [3.8, -4.3], [4.2, -2.8], [4.6, -1.4], [4.6, -0.6]]
    : [[0, -28], [4.6, -27.8], [6.4, -27], [6.8, -24.5], [6.8, -18], [6.5, -12.5], [5.6, -9.4], [4.0, -7.4], [2.6, -6.0], [1.75, -4.9], [1.55, -4.3], [1.8, -3.7], [2.2, -2.9], [2.3, -1.9], [2.0, -1.1], [1.6, -0.6]];
  // (spaced by length, so the cloth's texture lies evenly up the sack)
  const pts = new THREE.SplineCurve(prof.map(([r, y]) => new THREE.Vector2(r, y))).getSpacedPoints(64).map(p => new THREE.Vector2(Math.max(0, p.x), p.y));
  const S = 48, geo = new THREE.LatheGeometry(pts, S);
  // (turned at random first, so its stains fall anywhere; the squash and
  // the sag stay front to back)
  geo.rotateY(rnd() * Math.PI * 2);
  const pos = geo.attributes.position, n1 = vnoise(Math.floor(rnd() * 1e6), 6, 0), n2 = vnoise(Math.floor(rnd() * 1e6), 11, 0), lean = (rnd() - 0.5) * 0.6;
  for (let i = 0; i < pos.count; i++) {
    let x = pos.getX(i), z = pos.getZ(i);
    const y = pos.getY(i), r = Math.hypot(x, z);
    if (r > 1e-4) {
      const th = (Math.atan2(z, x) / (Math.PI * 2) + 1) % 1, body = sstep(-6.5, -10, y);
      let k = 1 + body * 0.16 * (fbm(n1, th * 6, y / 5, 3) - 0.5) * 2;
      if (!open) k *= 1 + 0.16 * Math.exp(-Math.pow((y + 6.6) / 2.2, 2)) * Math.sin(th * Math.PI * 2 * 11 + n2(th * 11, y) * 4);
      if (y > (open ? -5 : -3.7)) k *= 1 + 0.3 * (n2(th * 7 + y * 0.8, y * 2.2) - 0.5) * 2;
      // (the ears: the bottom seam's corners, out to either side)
      const ear = sstep(-23, -27.6, y) * Math.pow(Math.abs(Math.cos(th * Math.PI * 2)), 3) * 0.22;
      x *= k * (1 + ear); z *= k * 0.72 * (1 - ear * 0.6);
    }
    // (what is in it sits low and off true)
    x += lean * sstep(-8, -24, y) * 2.2;
    pos.setXYZ(i, x, y, z);
  }
  geo.computeVertexNormals();
  // (the lathe's seam: its two columns of normals made one)
  const nr = geo.attributes.normal, P = pts.length;
  for (let j = 0; j < P; j++) { const a = j, b = S * P + j, nx = nr.getX(a) + nr.getX(b), ny = nr.getY(a) + nr.getY(b), nz = nr.getZ(a) + nr.getZ(b), l = Math.hypot(nx, ny, nz) || 1; nr.setXYZ(a, nx / l, ny / l, nz / l); nr.setXYZ(b, nx / l, ny / l, nz / l); }
  const body = new THREE.Mesh(geo, kit.burlap[open ? 1 : (rnd() < 0.5 ? 0 : 1)]);
  body.castShadow = true; body.receiveShadow = true; g.add(body);
  const neckY = open ? -4.7 : -4.4, neckR = open ? 3.95 : 1.62;
  for (let i = 0; i < 3; i++) {
    const t = new THREE.Mesh(new THREE.TorusGeometry(neckR + 0.28, 0.25, 6, 28), kit.twine);
    t.rotation.x = Math.PI / 2 + (rnd() - 0.5) * 0.14; t.scale.y = 0.78; t.position.y = neckY - i * 0.48; t.castShadow = true; g.add(t);
  }
  g.add(hangLoop(kit, neckR * 0.7, neckY + 0.2));
  if (open) {
    g.add(boneEnd(kit, V(-1.4, -9, 0.6), V(0.45, 1, -0.3), 12, 1.15, false));
    // the hide: up from inside, over the front lip, down the outside
    const flap = new THREE.PlaneGeometry(6.5, 6, 8, 10), fp = flap.attributes.position;
    const B = a => { const b = 1 - a; return [b * b * -6.6 + 2 * a * b * 3.4 + a * a * -2.0, b * b * -5.9 + 2 * a * b * -5.6 + a * a * -1.6]; };
    for (let i = 0; i < fp.count; i++) { const x = fp.getX(i), a = (fp.getY(i) + 3) / 6, [yy, zz] = B(a); fp.setXYZ(i, x * (1 - 0.18 * (1 - a)), yy, zz + Math.sin(x * 1.2) * 0.2); }
    flap.computeVertexNormals();
    const hide = new THREE.Mesh(flap, kit.hide); hide.position.x = 1.2; hide.rotation.y = 0.3; hide.castShadow = true; g.add(hide);
    [[-1.6, -0.9, -3.4, 1.3], [-3.0, -1.4, -2.2, 1.0]].forEach(([x, y, z, r]) => { const m = new THREE.Mesh(new THREE.SphereGeometry(r, 12, 10), kit.meat); m.position.set(x, y, z); m.scale.set(1.25, 0.8, 1); g.add(m); });
  }
  const foot = prof[0][1];
  for (let i = 0, nd = 1 + Math.floor(rnd() * 2); i < nd; i++) g.add(drip(kit, lean * 2.2 + (rnd() - 0.5) * 2.4, foot + 0.4, (rnd() - 0.5) * 1.8, 0.8 + rnd() * 0.5));
  // (its tag on the tie, at the front, out over the belly)
  return { group: g, ring: V(1.0, neckY - 0.7, -(neckR + 0.3) * 0.78), lean: 0.52, roll: -0.08, foot };
}
// The parcel: pink butcher paper over something heavy and lumpy, sagging
// in the middle, tied both ways with twine, hung by a loop from the knot;
// seeping; a sawn bone end out through the paper at one end (bone).
function buildBundle(kit, rnd, bone) {
  const g = new THREE.Group();
  const w = 14 + rnd() * 2.5, h = 8.6 + rnd() * 1.6, d = 8.2, drop = 5.4, cy = -drop - h / 2;
  const geo = atlasUV(slab(w, h, d, 2.1, 3, 6), w, h, d);
  lumpy(geo, 0.85, 3.6, Math.floor(rnd() * 1e6));
  const pp = geo.attributes.position;
  for (let i = 0; i < pp.count; i++) { const x = pp.getX(i), y = pp.getY(i); if (y < 0) pp.setY(i, y - 0.9 * Math.max(0, 1 - Math.pow(x / (w / 2), 2)) * (-y / (h / 2))); }
  relit(geo);
  const parcel = new THREE.Mesh(geo, kit.paper); parcel.position.y = cy; parcel.castShadow = true; parcel.receiveShadow = true; g.add(parcel);
  // the twine round it both ways, bitten into the paper
  const band = ax => {
    const a = (ax === 'x' ? d : w) / 2 + 0.25, b = h / 2 + 0.25, pts = [];
    for (let i = 0; i < 64; i++) { const t = i / 64 * Math.PI * 2, c = Math.cos(t), s = Math.sin(t), u = Math.sign(c) * Math.pow(Math.abs(c), 0.3) * a, v = Math.sign(s) * Math.pow(Math.abs(s), 0.3) * b; pts.push(ax === 'x' ? V(0, cy + v, u) : V(u, cy + v, 0)); }
    const m = new THREE.Mesh(new THREE.TubeGeometry(new THREE.CatmullRomCurve3(pts, true), 128, 0.3, 6, true), kit.twine); m.castShadow = true; return m;
  };
  g.add(band('x'), band('z'));
  const knot = new THREE.Mesh(new THREE.SphereGeometry(0.55, 10, 8), kit.twine); knot.position.set(0, -drop + 0.1, 0); g.add(knot);
  g.add(hangLoop(kit, 0.5, -drop));
  if (bone) {
    const s = rnd() < 0.5 ? 1 : -1;
    g.add(boneEnd(kit, V(s * (w / 2 - 3), cy + 0.6, -0.6), V(s, 0.12, -0.1), 6.2, 1.25, true));
  }
  const foot = cy - h / 2 - 1;
  for (let i = 0; i < 2; i++) g.add(drip(kit, (rnd() - 0.5) * w * 0.5, foot + 0.5, (rnd() - 0.5) * 3, 0.8 + rnd() * 0.4));
  // (its tag on the twine where it turns over the front, hanging down it)
  return { group: g, ring: V(0, cy + h / 2 - 0.4, -d / 2 - 0.45), lean: 0.07, roll: 0.04, foot };
}
// The satchel: an old leather bag hung by its strap, its flap buckled
// down, smeared, a flap of hide caught under the flap at one side.
function buildSatchel(kit, rnd) {
  const g = new THREE.Group();
  const w = 15, h = 11, d = 6.4, drop = 6.5, top = -drop, cy = top - h / 2;
  const bg = atlasUV(slab(w, h, d, 1.7, 3, 3), w, h, d);
  const body = new THREE.Mesh(relit(lumpy(bg, 0.25, 5, Math.floor(rnd() * 1e6))), kit.leather);
  body.position.y = cy; body.castShadow = true; body.receiveShadow = true; g.add(body);
  // the flap: over the top and down the front, its edge lifting a little
  const flap = new THREE.Mesh(atlasUV(slab(w + 0.5, 7.4, 0.55, 0.25, 2), w + 0.5, 7.4, 0.55), kit.leather);
  flap.position.set(0, top - 3.5, -d / 2 - 0.3); flap.rotation.x = -0.07; flap.castShadow = true; g.add(flap);
  const lid = new THREE.Mesh(atlasUV(slab(w + 0.5, 0.55, d + 0.6, 0.25, 2), w + 0.5, 0.55, d + 0.6), kit.leather);
  lid.position.set(0, top + 0.12, 0); lid.castShadow = true; g.add(lid);
  // the strap down the flap and its buckle
  const strap = new THREE.Mesh(new THREE.BoxGeometry(1.6, 5.2, 0.3), kit.leather); strap.position.set(0, top - 7.2, -d / 2 - 0.62); g.add(strap);
  const bk = new THREE.Group(); bk.position.set(0, top - 7.2, -d / 2 - 0.85);
  [[0, 1.05, 2.6, 0.3], [0, -1.05, 2.6, 0.3], [1.15, 0, 0.3, 2.4], [-1.15, 0, 0.3, 2.4], [0, 0, 0.18, 2.2]].forEach(([x, y, ww, hh]) => { const m = new THREE.Mesh(new THREE.BoxGeometry(ww, hh, 0.3), kit.brass); m.position.set(x, y, 0); bk.add(m); });
  g.add(bk);
  // the strap it hangs by, up through the hook's bend, on its rings
  g.add(tube([[-w / 2 + 1.2, top + 0.2, 0], [-w / 2 + 0.8, top + 3.0, 0], [-2.6, -1.4, 0], [0, 0.4, 0], [2.6, -1.4, 0], [w / 2 - 0.8, top + 3.0, 0], [w / 2 - 1.2, top + 0.2, 0]], 0.42, kit.leather, 48, 6));
  [-1, 1].forEach(s => { const r = new THREE.Mesh(new THREE.TorusGeometry(0.7, 0.14, 6, 16), kit.brass); r.position.set(s * (w / 2 - 1.2), top + 0.5, 0); g.add(r); });
  // the hide caught under the flap, hanging out at one side
  const hs = rnd() < 0.5 ? 1 : -1, hg = new THREE.PlaneGeometry(4.6, 6.5, 6, 8), hp = hg.attributes.position;
  for (let i = 0; i < hp.count; i++) { const x = hp.getX(i), y = hp.getY(i), a = (3.25 - y) / 6.5; hp.setXYZ(i, x + a * a * 0.8 * hs, y, -Math.sin(a * 2.2) * 1.1 + Math.sin(x * 1.3) * 0.2); }
  hg.computeVertexNormals();
  const hide = new THREE.Mesh(hg, kit.hide); hide.position.set(hs * (w / 2 - 2.6), top - 6.4, -d / 2 - 0.2); hide.castShadow = true; g.add(hide);
  const foot = cy - h / 2;
  g.add(drip(kit, -hs * (w / 2 - 1.5), foot + 0.4, -d / 2 + 0.8, 1));
  // (its tag on the flap's strap, at the top, hanging down the flap)
  return { group: g, ring: V(2.6, top - 0.4, -d / 2 - 0.95), lean: 0.1, roll: 0.05, foot };
}
const LOADS = ['sack', 'bundle', 'open', 'satchel', 'sack', 'bundleBone', 'satchel'];
function buildLoad(kit, kind, rnd) {
  if (kind === 'sack') return buildSack(kit, rnd, false);
  if (kind === 'open') return buildSack(kit, rnd, true);
  if (kind === 'satchel') return buildSatchel(kit, rnd);
  return buildBundle(kit, rnd, kind === 'bundleBone' || rnd() < 0.3);
}
// A trolley on the rail, a short chain down from it, an S-hook, and the
// load on the hook with its tag; the whole thing swings from the trolley.
// The load (and its tag) is turned to the seat, and the hook square to
// the load's loop, so the loop goes through it.
function buildHook(set, kit, card, t, kind, rnd, low) {
  const [x, z] = railAt(t);
  const pivot = new THREE.Group();
  pivot.position.set(x, RAIL.y, z);
  const steel = kit.iron;
  // (the trolley: two wheels each side of the web on the lower flange, its
  // cheeks down outside the flange to a yoke under it)
  const trolley = new THREE.Group(); trolley.rotation.y = RAIL_YAW; pivot.add(trolley);
  const galv = kit.galv, cz = RAIL.flange / 2 + 0.45;
  const yoke = new THREE.Mesh(new THREE.BoxGeometry(3.6, 1.3, 2 * cz + 0.4), galv); yoke.position.y = -1.0; trolley.add(yoke);
  const wheel = new THREE.CylinderGeometry(1.15, 1.15, 0.8, 16); wheel.rotateX(Math.PI / 2);
  [-1, 1].forEach(s => [-1, 1].forEach(sz => { const w = new THREE.Mesh(wheel, galv); w.position.set(s * 1.7, 2.35, sz * 1.9); trolley.add(w); }));
  [-1, 1].forEach(sz => { const cheek = new THREE.Mesh(new THREE.BoxGeometry(4.6, 5.2, 0.35), galv); cheek.position.set(0, 1.2, sz * cz); cheek.castShadow = true; trolley.add(cheek); });
  const face = Math.atan2(x, 140 + z);
  // the load first: how far down it reaches (its foot, or its tag hung
  // below it) sets the chain, so the loads hang low and high by turns
  const L = buildLoad(kit, kind, rnd), ts = LOAD.tag / LOAD.s;
  L.group.scale.setScalar(LOAD.s);
  const reach = Math.max(-L.foot, -(L.ring.y - 12.2 * ts)) * LOAD.s;
  const n = THREE.MathUtils.clamp(Math.round((RAIL.y - 2.4 - 7.24 - reach - (low ? LOAD.low : LOAD.high)) / RAIL.link), 2, 12);
  const hang = new THREE.Group(); hang.rotation.y = face + Math.PI / 2; pivot.add(hang);
  buildChain(steel, n, RAIL.link, 0, -2.4, 0, hang);
  const y0 = -2.4 - n * RAIL.link;
  const pts = [V(0, y0 + 1, 0), V(0, y0 - 1.5, 0), V(1.6, y0 - 3.2, 0), V(2.6, y0 - 1.6, 0), V(1.4, y0 - 0.4, 0), V(0.2, y0 - 2.2, 0), V(-1.2, y0 - 4.6, 0), V(-2.4, y0 - 6.2, 0), V(-1.2, y0 - 7.6, 0), V(0.6, y0 - 6.6, 0)];
  const hook = new THREE.Mesh(new THREE.TubeGeometry(new THREE.CatmullRomCurve3(pts), 48, 0.42, 8, false), kit.ironBright);
  hook.castShadow = true; hang.add(hook);
  // the load, its loop over the hook's lower bend
  L.group.position.copy(V(-1.3, y0 - 7.24, 0).applyAxisAngle(V(0, 1, 0), face + Math.PI / 2));
  L.group.rotation.y = face + (rnd() - 0.5) * 0.3;
  pivot.add(L.group);
  // the tag on its wire ring (the ring's top at L.ring; the hole's top
  // edge on the ring's bottom), leaning out where the load bulges,
  // turned square to the seat
  const tagHang = new THREE.Group();
  tagHang.position.copy(L.ring); tagHang.rotation.set(L.lean, face - L.group.rotation.y + (rnd() - 0.5) * 0.14, L.roll, 'YXZ'); tagHang.scale.setScalar(ts);
  const ring = new THREE.Mesh(new THREE.TorusGeometry(0.85, 0.11, 6, 20), kit.wire);
  ring.position.y = -0.85; ring.rotation.y = Math.PI / 2; tagHang.add(ring);
  const art = tagArt(card, false), normalMap = embossTex(art.height, 2.6, 1);
  const faceMat = new THREE.MeshStandardMaterial({ map: asTex(art.color), normalMap, metalness: 0.85, roughness: 0.3 });
  faceMat.normalScale.set(1.4, 1.4);
  const plate = new THREE.Mesh(tagGeo(), [faceMat, set.brass]);
  plate.position.y = -(1.59 + TAG.hole) - (TAG.h * 2 / 3 - TAG.holeY); plate.castShadow = true; plate.receiveShadow = true;
  tagHang.add(plate); L.group.add(tagHang);
  const tag = { userData: { id: card.id, plate, spentTex: null, liveTex: faceMat.map, card } };
  pivot.userData = { tag, plate, load: L, phase: rnd() * 6.28, rate: 0.8 + rnd() * 0.3, amp: 0, tilt: (rnd() - 0.5) * 0.06 };
  return pivot;
}
// the drops on the bench's leather under the loads (at: [x, z] each)
function buildSpatter(at) {
  const W = BENCH.w, D = BENCH.d, k = 6, rnd = seeded(71);
  const tex = K.canvasTex(W * k, D * k, (g, Wc, Hc) => {
    at.forEach(([x, z]) => {
      const cx = (W / 2 - x) * k, cy = (BENCH.z0 + D - z) * k;
      if (cx < -20 || cx > Wc + 20 || cy < -20 || cy > Hc + 20) return;
      for (let i = 0; i < 9; i++) {
        const a = rnd() * 6.28, r = Math.pow(rnd(), 1.6) * 3.2 * k, s = (0.12 + rnd() * 0.5) * k, x2 = cx + Math.cos(a) * r, y2 = cy + Math.sin(a) * r;
        g.fillStyle = 'rgba(40,4,4,0.92)'; g.beginPath(); g.arc(x2, y2, s, 0, Math.PI * 2); g.fill();
        g.fillStyle = 'rgba(90,10,8,0.6)'; g.beginPath(); g.arc(x2 - s * 0.2, y2 - s * 0.2, s * 0.6, 0, Math.PI * 2); g.fill();
      }
    });
  });
  const m = new THREE.Mesh(new THREE.PlaneGeometry(W, D), new THREE.MeshPhysicalMaterial({ map: tex, transparent: true, roughness: 0.12, clearcoat: 1, depthWrite: false, polygonOffset: true, polygonOffsetFactor: -2 }));
  m.rotation.x = -Math.PI / 2; m.rotation.z = Math.PI; m.position.set(0, 0.03, BENCH.z0 + D / 2);
  m.receiveShadow = true;
  return m;
}
function buildLamp() {
  const g = new THREE.Group();
  const alu = new THREE.MeshStandardMaterial({ color: 0x9a9892, metalness: 0.9, roughness: 0.35 });
  K.finished(alu, 'brushed', 3, 1, 0.1);
  const [x, y, z] = LAMP.at;
  const shade = new THREE.Mesh(new THREE.LatheGeometry([[2.5, 14], [4, 13], [5, 9], [9, 4], [16, 0], [18, -1.2], [17.4, -1.6], [15.4, -0.4], [8.6, 3.6], [4.4, 8.6], [3.4, 12.4], [2.2, 13.6]].map(([r, h]) => new THREE.Vector2(r, h)), 40), alu);
  shade.position.set(x, y, z); shade.castShadow = true;
  g.add(shade);
  const lining = new THREE.Mesh(new THREE.CircleGeometry(15.2, 40), new THREE.MeshBasicMaterial({ color: new THREE.Color(1.9, 1.3, 0.5) }));
  lining.rotation.x = -Math.PI / 2; lining.position.set(x, y - 0.9, z);
  g.add(lining);
  // the guard: wire hoops
  const wire = new THREE.MeshStandardMaterial({ color: 0x5a5852, metalness: 0.8, roughness: 0.5 });
  [[-3, 15.5], [-6, 12], [-9, 7]].forEach(([dy, r]) => { const h = new THREE.Mesh(new THREE.TorusGeometry(r, 0.22, 6, 48), wire); h.rotation.x = Math.PI / 2; h.position.set(x, y + dy, z); g.add(h); });
  for (let i = 0; i < 8; i++) { const a = i / 8 * Math.PI * 2; const b = new THREE.Mesh(new THREE.CylinderGeometry(0.2, 0.2, 10, 6), wire); b.position.set(x + Math.cos(a) * 11, y - 6, z + Math.sin(a) * 11); b.rotation.z = Math.cos(a) * 0.55; b.rotation.x = -Math.sin(a) * 0.55; g.add(b); }
  // hung from the ceiling on a chain
  buildChain(steelMat(0x1f1d1b, 0.5), Math.round((LAMP.top - y - 14) / 2.7), 2.7, x, LAMP.top, z, g);
  const light = new THREE.SpotLight(0xffb45a, 0, 0, 0.98, 0.65, 0);
  light.position.set(x, y - 2, z);
  light.target.position.set(...LAMP.aim);
  light.castShadow = true;
  light.shadow.mapSize.set(1024, 1024);
  light.shadow.camera.near = 10; light.shadow.camera.far = 290;
  light.shadow.bias = -0.0005; light.shadow.normalBias = 0.03; light.shadow.radius = 4;
  g.add(light, light.target);
  return { group: g, light, lining };
}
// the run's chain: heavy links, the lit ones a second set over the first
function buildRunChain() {
  const g = new THREE.Group();
  const iron = steelMat(0x1a1816, 0.6);
  const cold = buildChain(iron, CHAIN.links, CHAIN.link, CHAIN.x, CHAIN.top, CHAIN.z, g);
  // (from a beam clamp on a hanger up into the dark)
  const clamp = new THREE.Mesh(new THREE.BoxGeometry(5, 4, 5), iron); clamp.position.set(CHAIN.x, CHAIN.top + 2, CHAIN.z); g.add(clamp);
  const rod = new THREE.Mesh(new THREE.BoxGeometry(3, 160, 3), iron); rod.position.set(CHAIN.x, CHAIN.top + 84, CHAIN.z); rod.castShadow = true; g.add(rod);
  const hot = new THREE.InstancedMesh(chainGeo(), new THREE.MeshBasicMaterial({ toneMapped: false }), CHAIN.links);
  const m4 = new THREE.Matrix4(), col = new THREE.Color();
  for (let i = 0; i < CHAIN.links; i++) { cold.getMatrixAt(i, m4); hot.setMatrixAt(i, m4); hot.setColorAt(i, col.set(0xffffff)); }
  g.add(hot);
  // the big hook at the end
  const y0 = CHAIN.top - CHAIN.links * CHAIN.link;
  const pts = [V(CHAIN.x, y0 + 1, CHAIN.z), V(CHAIN.x, y0 - 3, CHAIN.z), V(CHAIN.x + 2, y0 - 7, CHAIN.z), V(CHAIN.x + 5.5, y0 - 8, CHAIN.z), V(CHAIN.x + 8, y0 - 5, CHAIN.z), V(CHAIN.x + 7.5, y0 - 1.5, CHAIN.z)];
  const hook = new THREE.Mesh(new THREE.TubeGeometry(new THREE.CatmullRomCurve3(pts), 40, 1.1, 10, false), K.polishedOf(iron, 0.4));
  hook.castShadow = true; g.add(hook);
  // its glow on the wall and the floor
  const glow = new THREE.PointLight(0xff6a13, 0, 90, 1.6);
  glow.position.set(CHAIN.x, y0 + 20, CHAIN.z - 10);
  g.add(glow);
  return { group: g, cold, hot, glow, y0 };
}
// a box with its edges rounded (the die's way), any size
function roundedBox(w, h, d, r, seg = 6) {
  const g = new THREE.BoxGeometry(w, h, d, seg, seg, seg);
  const p = g.attributes.position, n = g.attributes.normal, hx = w / 2 - r, hy = h / 2 - r, hz = d / 2 - r;
  const v = V(0, 0, 0), q = V(0, 0, 0);
  for (let i = 0; i < p.count; i++) {
    v.fromBufferAttribute(p, i);
    q.set(Math.min(hx, Math.max(-hx, v.x)), Math.min(hy, Math.max(-hy, v.y)), Math.min(hz, Math.max(-hz, v.z)));
    v.sub(q); if (v.lengthSq() < 1e-8) v.fromBufferAttribute(n, i); v.normalize();
    n.setXYZ(i, v.x, v.y, v.z); v.multiplyScalar(r).add(q); p.setXYZ(i, v.x, v.y, v.z);
  }
  p.needsUpdate = true; n.needsUpdate = true;
  return g;
}
// The saw's cowl: a rust-orange moulding years into its work - the colour
// faded where the sun has had it, oil run down from the caps, dust packed
// into the corners, scuffs to the grey plastic under the paint, and the
// model band along its flank (a cream stripe with a black keyline, no
// name on it).
function cowlTex() {
  return K.canvasTex(512, 512, (g, W, H) => {
    const rnd = seeded(23);
    const base = g.createLinearGradient(0, 0, 0, H);
    base.addColorStop(0, '#8a3c18'); base.addColorStop(0.55, '#70300f'); base.addColorStop(1, '#4a1d0a');
    g.fillStyle = base; g.fillRect(0, 0, W, H);
    // the moulding's fine orange-peel, and the sun's fade in blotches
    for (let i = 0; i < 9000; i++) { const v = rnd(); g.fillStyle = v > 0.5 ? `rgba(255,190,140,${((v - 0.5) * 0.08).toFixed(3)})` : `rgba(40,10,0,${((0.5 - v) * 0.1).toFixed(3)})`; g.fillRect(rnd() * W, rnd() * H, 1 + rnd() * 2, 1 + rnd() * 2); }
    for (let i = 0; i < 10; i++) { const x = rnd() * W, y = rnd() * H * 0.5, r = 40 + rnd() * 90; const gr = g.createRadialGradient(x, y, 0, x, y, r); gr.addColorStop(0, 'rgba(220,150,100,0.18)'); gr.addColorStop(1, 'rgba(220,150,100,0)'); g.fillStyle = gr; g.fillRect(x - r, y - r, 2 * r, 2 * r); }
    // the model band: cream, a black keyline over it
    g.fillStyle = 'rgba(232,222,196,0.85)'; g.fillRect(0, H * 0.62, W, H * 0.08);
    g.fillStyle = 'rgba(18,16,14,0.9)'; g.fillRect(0, H * 0.6, W, H * 0.014); g.fillRect(0, H * 0.71, W, H * 0.01);
    // the oil run down from the caps: dark streaks, glossy at their heads
    for (let i = 0; i < 16; i++) { const x = rnd() * W, y0 = rnd() * H * 0.4, l = 60 + rnd() * 220, w = 2 + rnd() * 7; const gr = g.createLinearGradient(0, y0, 0, y0 + l); gr.addColorStop(0, 'rgba(25,14,6,0.55)'); gr.addColorStop(1, 'rgba(25,14,6,0)'); g.fillStyle = gr; g.fillRect(x, y0, w, l); }
    // scuffs to the grey plastic, and the scratches of the job
    for (let i = 0; i < 26; i++) { const x = rnd() * W, y = rnd() * H, r = 3 + rnd() * 12; g.fillStyle = `rgba(150,140,128,${(0.35 + rnd() * 0.3).toFixed(2)})`; g.beginPath(); g.ellipse(x, y, r, r * (0.3 + rnd() * 0.5), rnd() * 3, 0, Math.PI * 2); g.fill(); }
    g.lineWidth = 1;
    for (let i = 0; i < 90; i++) { const x = rnd() * W, y = rnd() * H, l = 8 + rnd() * 60, a = (rnd() - 0.5) * 1.4; g.strokeStyle = `rgba(${rnd() > 0.5 ? '230,200,170' : '30,12,4'},${(0.15 + rnd() * 0.3).toFixed(2)})`; g.beginPath(); g.moveTo(x, y); g.lineTo(x + Math.cos(a) * l, y + Math.sin(a) * l); g.stroke(); }
    // sawdust packed into the foot of each face
    const dust = g.createLinearGradient(0, H * 0.82, 0, H);
    dust.addColorStop(0, 'rgba(196,160,110,0)'); dust.addColorStop(1, 'rgba(196,160,110,0.55)');
    g.fillStyle = dust; g.fillRect(0, H * 0.82, W, H * 0.18);
  });
}
// The saw: a professional chainsaw from a forestry dealer, years into its
// work - the powerhead (cowl, recoil starter, caps, muffler), the wrap
// handle and the chain brake's hand guard, the rear handle with its
// trigger and lockout, the bumper spikes, the clutch cover with its two
// bar nuts, the guide bar and the chain round it: drive links in the
// groove, side straps, and the cutters, left and right in turn, each with
// its top plate. Its left side - the starter's - is toward the stool, as
// a saw put down on its right-handed owner's bench lies, the bar angled
// away across the bench toward the wall.
//   Room: an orange powerhead, a long dark bar. Arm: the louvres in the
//   starter, the wrap handle's rubber, the spikes, the chain's teeth along
//   the bar. 3x: each cutter's top plate catching the lamp, the bar's
//   oiled sheen, the dust in the cowl's corners, the scuffs to grey.
function buildSaw() {
  const g = new THREE.Group();
  const cowl = new THREE.MeshStandardMaterial({ map: cowlTex(), roughness: 0.58, metalness: 0.05 });
  K.finished(cowl, 'blast', 3, 3, 0.25);
  const black = new THREE.MeshStandardMaterial({ color: 0x151412, roughness: 0.62, metalness: 0.15 });
  const rubber = new THREE.MeshStandardMaterial({ color: 0x0f0f0f, roughness: 0.85, metalness: 0 });
  K.finished(rubber, 'pebble', 2, 6, 0.6);
  const steel = steelMat(0x3a3733, 0.45);
  const chrome = K.polishedOf(steelMat(0xd4d4d8, 0.25), 0.14);
  const add = (m, cast = true) => { if (cast) m.castShadow = true; m.receiveShadow = true; g.add(m); return m; };
  const tube = (pts, r, mat) => add(new THREE.Mesh(new THREE.TubeGeometry(new THREE.CatmullRomCurve3(pts.map(p => V(...p))), 48, r, 12, false), mat));

  // the powerhead: the crankcase and its top cover, a seam between them
  add(new THREE.Mesh(roundedBox(26, 15, 15, 3.2), cowl)).position.set(0, 7.6, 0);
  add(new THREE.Mesh(roundedBox(22, 8, 13.4, 2.8), cowl)).position.set(-1.5, 18.2, 0);
  add(new THREE.Mesh(new THREE.BoxGeometry(22.6, 0.45, 13.9), black), false).position.set(-1.5, 14.3, 0);
  // the air filter cover's intake slots, the cover's thumb knob
  for (let i = 0; i < 7; i++) add(new THREE.Mesh(new THREE.BoxGeometry(0.55, 0.25, 8.5), black), false).position.set(-8 + i * 2.1, 22.27, 0);
  const knob = add(new THREE.Mesh(new THREE.CylinderGeometry(1.4, 1.6, 1.1, 20), black)); knob.position.set(6, 22.6, 0);
  for (let i = 0; i < 6; i++) { const r = add(new THREE.Mesh(new THREE.BoxGeometry(0.3, 1.0, 0.5), black), false); const a = i / 6 * Math.PI * 2; r.position.set(6 + Math.cos(a) * 1.55, 22.6, Math.sin(a) * 1.55); r.rotation.y = -a; }

  // the recoil starter on the left (toward the stool): a housing with its
  // louvres round a hub, the pull handle on its cord
  const sx = -4, sy = 8.5, sz = -7.9;
  const housing = add(new THREE.Mesh(new THREE.CylinderGeometry(6.2, 6.4, 1.6, 40), black)); housing.rotation.x = Math.PI / 2; housing.position.set(sx, sy, sz);
  for (let i = 0; i < 20; i++) {
    const a = i / 20 * Math.PI * 2, l = add(new THREE.Mesh(new THREE.BoxGeometry(2.6, 0.32, 0.4), new THREE.MeshStandardMaterial({ color: 0x050505, roughness: 0.9 })), false);
    l.position.set(sx + Math.cos(a) * 4.0, sy + Math.sin(a) * 4.0, sz - 0.75); l.rotation.z = a;
  }
  const hub = add(new THREE.Mesh(new THREE.CylinderGeometry(1.6, 1.6, 0.6, 24), steel)); hub.rotation.x = Math.PI / 2; hub.position.set(sx, sy, sz - 0.95);
  const grip = add(new THREE.Mesh(roundedBox(5, 1.6, 1.8, 0.7), rubber)); grip.position.set(-11, 16.4, -8.3); grip.rotation.z = 0.25;
  const cord = add(new THREE.Mesh(new THREE.CylinderGeometry(0.16, 0.16, 6.6, 8), new THREE.MeshStandardMaterial({ color: 0x3a3a34, roughness: 0.9 })), false);
  cord.position.set(-8.3, 13, -8.3); cord.rotation.z = 0.68;
  // the caps on the back: fuel (black) and bar oil (black, a ring on it),
  // knurled for the thumb
  [[-4, 0x151412], [4, 0x151412]].forEach(([z, c], k) => {
    const cap = add(new THREE.Mesh(new THREE.CylinderGeometry(2.1, 2.1, 1.3, 28), new THREE.MeshStandardMaterial({ color: c, roughness: 0.55 }))); cap.rotation.z = Math.PI / 2; cap.position.set(-13.7, 5.2, z);
    for (let i = 0; i < 12; i++) { const n = add(new THREE.Mesh(new THREE.BoxGeometry(1.3, 0.35, 0.35), black), false); const a = i / 12 * Math.PI * 2; n.position.set(-13.7, 5.2 + Math.sin(a) * 2.1, z + Math.cos(a) * 2.1); }
    if (k) { const ring = add(new THREE.Mesh(new THREE.TorusGeometry(1.1, 0.15, 6, 24), chrome), false); ring.rotation.y = Math.PI / 2; ring.position.set(-14.4, 5.2, z); }
  });
  // the muffler at the front, low on the left: a pressed-steel can behind
  // a slotted heat shield, gone brown with heat
  const muff = add(new THREE.Mesh(roundedBox(4, 7, 5, 0.8), new THREE.MeshStandardMaterial({ color: 0x3a2a1e, metalness: 0.6, roughness: 0.65 }))); muff.position.set(12.4, 4.6, -4.6);
  for (let i = 0; i < 4; i++) add(new THREE.Mesh(new THREE.BoxGeometry(2.6, 0.4, 0.2), new THREE.MeshStandardMaterial({ color: 0x050505 })), false).position.set(12.4, 2.4 + i * 1.5, -7.15);

  // the handles: the wrap handle over the top and down both sides, in
  // black rubber; the chain brake's hand guard in front of it; the rear
  // handle closing the loop behind, its trigger under and lockout over
  tube([[7, 2, -9.2], [7.4, 13, -10.4], [8, 23.5, -7.5], [8.2, 26, 0], [8, 23.5, 7.5], [7.4, 13, 10.4], [7, 4, 9.6]], 1.15, rubber);
  const guard = add(new THREE.Mesh(roundedBox(1.0, 13, 15, 0.45), black)); guard.position.set(13.2, 23.6, 0); guard.rotation.z = -0.38;
  tube([[-11, 17.5, 0], [-19, 18.6, 0], [-27, 16.5, 0], [-30.5, 9.5, 0], [-27, 2.6, 0], [-18, 1.6, 0], [-12, 2.4, 0]], 1.35, rubber);
  add(new THREE.Mesh(roundedBox(3.2, 1.6, 1.4, 0.5), black)).position.set(-19.5, 16.7, 0);
  add(new THREE.Mesh(roundedBox(2.4, 1.2, 1.2, 0.45), black)).position.set(-18.5, 19.9, 0);

  // the bumper spikes, either side of the bar at the powerhead's front
  [-1, 1].forEach(sd => {
    add(new THREE.Mesh(new THREE.BoxGeometry(0.7, 12, 3.2), steel)).position.set(13.4, 7.2, sd * 2.7);
    [2.6, 6.6, 10.6].forEach(y => { const sp = add(new THREE.Mesh(new THREE.ConeGeometry(0.7, 1.9, 4), steel)); sp.rotation.z = -Math.PI / 2; sp.position.set(14.6, y, sd * 2.7); });
  });
  // the clutch cover on the right, over the bar's root, its two bar nuts
  add(new THREE.Mesh(roundedBox(15, 11, 3.2, 1.3), black)).position.set(15.5, 7, 3.4);
  [13.2, 17.8].forEach(x => { const n = add(new THREE.Mesh(new THREE.CylinderGeometry(0.95, 0.95, 0.9, 6), chrome)); n.rotation.x = Math.PI / 2; n.position.set(x, 7, 5.3); });

  // the guide bar: a laminated steel bar, its nose round, oiled dark, three
  // rivets in the nose sprocket and the oil hole at its root
  const bs = new THREE.Shape();
  bs.moveTo(10, 3.25); bs.lineTo(71, 3.25); bs.absarc(71, 7, 3.75, -Math.PI / 2, Math.PI / 2, false); bs.lineTo(10, 10.75); bs.lineTo(10, 3.25);
  const bg = new THREE.ExtrudeGeometry(bs, { depth: 0.9, bevelEnabled: true, bevelThickness: 0.08, bevelSize: 0.08, bevelSegments: 1, curveSegments: 24 });
  bg.translate(0, 0, -0.45);
  const barMat = new THREE.MeshStandardMaterial({ color: 0x55565a, metalness: 0.9, roughness: 0.28 });
  K.finished(barMat, 'brushed', 6, 1, 0.12);
  add(new THREE.Mesh(bg, barMat));
  [[70.2, 7.9], [71.8, 7.9], [71, 6.1]].forEach(([x, y]) => { const r = add(new THREE.Mesh(new THREE.CylinderGeometry(0.32, 0.32, 1.2, 12), chrome), false); r.rotation.x = Math.PI / 2; r.position.set(x, y, 0); });
  add(new THREE.Mesh(new THREE.CylinderGeometry(0.45, 0.45, 1.0, 12), new THREE.MeshStandardMaterial({ color: 0x050505 })), false).rotation.x = Math.PI / 2;
  g.children[g.children.length - 1].position.set(24, 7, 0);

  // the chain, round the bar from the clutch cover to the nose and back:
  // at each pitch a pair of side straps; every other pitch a cutter, left
  // and right in turn - a side plate and its top plate leaning back
  const R = 3.75 + 0.55, X0 = 14, X1 = 71, Y = 7, P = 0.95;
  const L = 2 * (X1 - X0) + Math.PI * R, N = Math.floor(L / P);
  const at = s => {
    if (s < X1 - X0) return { p: V(X0 + s, Y + R, 0), t: V(1, 0, 0), n: V(0, 1, 0) };
    s -= X1 - X0;
    if (s < Math.PI * R) { const f = s / R; return { p: V(X1 + R * Math.sin(f), Y + R * Math.cos(f), 0), t: V(Math.cos(f), -Math.sin(f), 0), n: V(Math.sin(f), Math.cos(f), 0) }; }
    s -= Math.PI * R;
    return { p: V(X1 - s, Y - R, 0), t: V(-1, 0, 0), n: V(0, -1, 0) };
  };
  const strap = new THREE.InstancedMesh(new THREE.BoxGeometry(0.88, 0.52, 0.12), steelMat(0x9a9a9e, 0.3), N * 2);
  const side = new THREE.InstancedMesh(new THREE.BoxGeometry(0.86, 0.95, 0.13), chrome, Math.ceil(N / 2));
  const top = new THREE.InstancedMesh(new THREE.BoxGeometry(0.8, 0.12, 0.62), chrome, Math.ceil(N / 2));
  const m4 = new THREE.Matrix4(), b = new THREE.Matrix4(), z = V(0, 0, 1), o = V(0, 0, 0), lean = new THREE.Matrix4();
  let ci = 0;
  for (let i = 0; i < N; i++) {
    const { p, t, n } = at(i * P + P / 2);
    b.makeBasis(t, n, z);
    [-1, 1].forEach((sd, k) => { o.copy(p).addScaledVector(n, 0.12).addScaledVector(z, sd * 0.56); m4.copy(b).setPosition(o); strap.setMatrixAt(i * 2 + k, m4); });
    if (i % 2 === 0) {
      const sd = (ci % 2) ? 1 : -1;
      o.copy(p).addScaledVector(n, 0.45).addScaledVector(z, sd * 0.58); m4.copy(b).setPosition(o); side.setMatrixAt(ci, m4);
      // (the top plate: across the chain from its side plate, leaning back)
      lean.makeRotationZ(0.18);
      o.copy(p).addScaledVector(n, 0.9).addScaledVector(z, sd * 0.3); m4.copy(b).multiply(lean).setPosition(o); top.setMatrixAt(ci, m4);
      ci++;
    }
  }
  side.count = top.count = ci;
  [strap, side, top].forEach(m => { m.castShadow = true; g.add(m); });

  // the sawdust it has left on the bench round it: chips and a fine drift
  const dust = new THREE.InstancedMesh(new THREE.BoxGeometry(1, 1, 1), new THREE.MeshStandardMaterial({ color: 0xc8a46e, roughness: 0.95 }), 140);
  const rnd = seeded(77), dq = new THREE.Quaternion(), ds = V(1, 1, 1);
  for (let i = 0; i < 140; i++) {
    const x = 18 + rnd() * 60, zz = (rnd() - 0.5) * 18 * (0.4 + rnd()), sz = 0.12 + rnd() * 0.45;
    ds.set(sz * (1 + rnd()), 0.06 + rnd() * 0.1, sz); dq.setFromAxisAngle(V(0, 1, 0), rnd() * 6.28);
    m4.compose(V(x, 0.05, zz), dq, ds); dust.setMatrixAt(i, m4);
  }
  dust.receiveShadow = true; g.add(dust);

  g.position.set(...SAW.at); g.rotation.y = SAW.yaw;
  return g;
}
// the bone die: the same one the fire throws (inferno.mjs), at rest
function buildDie(size) {
  const rnd = seeded(7);
  const faces = [3, 4, 1, 6, 2, 5];
  const pipAt = { 1: [[0, 0]], 2: [[-1, 1], [1, -1]], 3: [[-1, 1], [0, 0], [1, -1]], 4: [[-1, 1], [1, 1], [-1, -1], [1, -1]], 5: [[-1, 1], [1, 1], [0, 0], [-1, -1], [1, -1]], 6: [[-1, 1], [1, 1], [-1, 0], [1, 0], [-1, -1], [1, -1]] };
  const mats = faces.map(n => new THREE.MeshPhysicalMaterial({ map: K.canvasTex(128, 128, (x, w) => {
    const g = x.createRadialGradient(w * 0.42, w * 0.4, w * 0.1, w / 2, w / 2, w * 0.75);
    g.addColorStop(0, '#f4ecd8'); g.addColorStop(0.6, '#e6d9bf'); g.addColorStop(1, '#c9ac7c');
    x.fillStyle = g; x.fillRect(0, 0, w, w);
    x.strokeStyle = 'rgba(120,90,50,0.14)'; for (let k = 0; k < 20; k++) { const y = rnd() * w; x.beginPath(); x.moveTo(0, y); x.lineTo(w, y + rnd() * 6 - 3); x.stroke(); }
    pipAt[n].forEach(([px, py]) => { const cx = w / 2 + px * w * 0.26, cy = w / 2 - py * w * 0.26, r = w * 0.085; const gr = x.createRadialGradient(cx - r * 0.3, cy - r * 0.3, r * 0.1, cx, cy, r); gr.addColorStop(0, '#d9304a'); gr.addColorStop(0.6, '#a8172a'); gr.addColorStop(1, '#3a0a10'); x.fillStyle = gr; x.beginPath(); x.arc(cx, cy, r, 0, Math.PI * 2); x.fill(); });
  }), roughness: 0.42, clearcoat: 0.35, clearcoatRoughness: 0.3 }));
  const g = new THREE.BoxGeometry(size, size, size, 6, 6, 6);
  const pos = g.attributes.position, nrm = g.attributes.normal, h = size / 2 - size * 0.13, r = size * 0.13, v = V(0, 0, 0), qq = V(0, 0, 0);
  for (let i = 0; i < pos.count; i++) {
    v.fromBufferAttribute(pos, i); qq.set(Math.min(h, Math.max(-h, v.x)), Math.min(h, Math.max(-h, v.y)), Math.min(h, Math.max(-h, v.z)));
    v.sub(qq); if (v.lengthSq() < 1e-8) v.fromBufferAttribute(nrm, i); v.normalize(); nrm.setXYZ(i, v.x, v.y, v.z); v.multiplyScalar(r).add(qq); pos.setXYZ(i, v.x, v.y, v.z);
  }
  const mesh = new THREE.Mesh(g, mats);
  mesh.castShadow = true; mesh.receiveShadow = true;
  mesh.position.set(DIE.at[0], size / 2, DIE.at[2]); mesh.rotation.y = 0.5;
  return mesh;
}
// The sign's body and its paint (the day as the page's own elements show
// it, painted on the scrap itself for the fly in): a scrap of the wall's
// cladding, ribs across, cut ragged with snips and screwed to the wall at
// its corners, a little off true.
function buildSlateBody() {
  const g = new THREE.Group();
  const c = document.createElement('canvas');
  c.width = 2160; c.height = Math.round(2160 * SLATE.h / SLATE.w);
  const tex = new THREE.CanvasTexture(c); tex.colorSpace = THREE.SRGBColorSpace; tex.anisotropy = 8;
  // (the snips' cut: a ragged edge, a corner gone)
  const rnd = seeded(37);
  const edge = K.canvasTex(540, Math.round(540 * SLATE.h / SLATE.w), (e, W, H) => {
    e.fillStyle = '#000'; e.fillRect(0, 0, W, H); e.fillStyle = '#fff'; e.beginPath();
    const pts = [];
    const side = (x0, y0, x1, y1, n) => { for (let i = 0; i < n; i++) { const t = i / n, j = (rnd() - 0.5) * 3.2 + Math.sin(t * 9 + rnd()) * 1.2; pts.push([lerp(x0, x1, t) + (y1 - y0 ? j : 0), lerp(y0, y1, t) + (x1 - x0 ? j : 0)]); } };
    const m = 4;
    side(m + 16, m, W - m, m + 1, 40); side(W - m, m + 1, W - m - 1, H - m, 24); side(W - m - 1, H - m, m, H - m - 1, 40); side(m, H - m - 1, m, m + 14, 24);
    e.moveTo(...pts[0]); pts.forEach(p => e.lineTo(...p)); e.closePath(); e.fill();
  });
  edge.colorSpace = THREE.NoColorSpace;
  const mat = new THREE.MeshStandardMaterial({ map: tex, alphaMap: edge, alphaTest: 0.5, roughness: 0.6, metalness: 0.22, emissive: 0xffffff, emissiveMap: tex, emissiveIntensity: 0.18, side: THREE.DoubleSide });
  K.finished(mat, 'peel', 3, 2, 0.25); mat.roughness = 0.6;
  const face = new THREE.Mesh(corrugatedGeo(SLATE.w, SLATE.h, SLATE.phase, 'y'), mat);
  face.castShadow = true; face.receiveShadow = true; g.add(face);
  // four roofing screws through it, their washers' rubber gone hard
  const screw = new THREE.CylinderGeometry(0.62, 0.62, 0.42, 6); screw.rotateX(Math.PI / 2);
  const washer = new THREE.CylinderGeometry(0.95, 0.95, 0.18, 16); washer.rotateX(Math.PI / 2);
  const steel = steelMat(0x5a5048, 0.55), rubber = new THREE.MeshStandardMaterial({ color: 0x161412, roughness: 0.9 });
  [[-1, 1], [1, 1], [-1, -1], [1, -1]].forEach(([sx, sy]) => {
    const x = sx * (SLATE.w / 2 - 2.4), y = sy * (SLATE.h / 2 - 2.2), z = ribAt(y + SLATE.phase);
    const w = new THREE.Mesh(washer, rubber); w.position.set(x, y, z + 0.1); g.add(w);
    const s = new THREE.Mesh(screw, steel); s.position.set(x, y, z + 0.38); s.castShadow = true; g.add(s);
  });
  g.userData.print = { mesh: face, draw: v => { drawSlate(c.getContext('2d'), c.width, c.height, v); tex.needsUpdate = true; } };
  return g;
}
// The sign carries three things, big enough to read from the seat on a
// phone: the clock, what is ready, and the hand to deal. (Laid out to the
// pixel as the page's own slate is - app.css, .r3w-* - each line placed by
// its baseline: top = baseline - 0.8 of its size; the labels painted
// larger than the page's, at label, to read from the seat - and READY
// carries the hand's worth.) Brush paint over the
// scrap's own weathered Burnished Slate: runs under the strokes, chipped.
const SL = { x: 70, rx: 1250, eyebrowY: 110, eyebrow: 48, numY: 600, now: 380, ampm: 60, ready: 460, runY: 790, runH: 240, run: 112, label: 74 };
let slateBack = null, slateLayer = null;
function slateBackOf(W, H) {
  if (slateBack && slateBack.width === W) return slateBack;
  slateBack = document.createElement('canvas'); slateBack.width = W; slateBack.height = H;
  const g = slateBack.getContext('2d'), rnd = seeded(11);
  g.fillStyle = '#4a443e'; g.fillRect(0, 0, W, H);
  for (let i = 0; i < 40; i++) { const x = rnd() * W, y = rnd() * H, r = 60 + rnd() * 260, gr = g.createRadialGradient(x, y, 0, x, y, r); gr.addColorStop(0, `rgba(180,172,160,${(0.04 + rnd() * 0.07).toFixed(3)})`); gr.addColorStop(1, 'rgba(180,172,160,0)'); g.fillStyle = gr; g.fillRect(x - r, y - r, 2 * r, 2 * r); }
  for (let i = 0; i < 9000; i++) { const v = rnd(); g.fillStyle = v > 0.5 ? `rgba(210,200,185,${((v - 0.5) * 0.12).toFixed(3)})` : `rgba(0,0,0,${((0.5 - v) * 0.16).toFixed(3)})`; g.fillRect(rnd() * W, rnd() * H, 2, 2); }
  // rust at the cut and round the screw holes, run down
  const k = W / 66;
  for (let i = 0; i < 4; i++) { const t = 18 + i * 10; g.strokeStyle = `rgba(${120 - i * 10},${56 - i * 4},22,${(0.5 - i * 0.1).toFixed(2)})`; g.lineWidth = t; g.strokeRect(0, 0, W, H); }
  for (let i = 0; i < 70; i++) { const side = Math.floor(rnd() * 4), x = side % 2 ? (side === 1 ? W - rnd() * 40 : rnd() * 40) : rnd() * W, y = side % 2 ? rnd() * H : (side === 0 ? rnd() * 40 : H - rnd() * 40), r = 6 + rnd() * 30, gr = g.createRadialGradient(x, y, 0, x, y, r); gr.addColorStop(0, 'rgba(126,60,22,0.55)'); gr.addColorStop(1, 'rgba(126,60,22,0)'); g.fillStyle = gr; g.fillRect(x - r, y - r, 2 * r, 2 * r); }
  [[-1, 1], [1, 1], [-1, -1], [1, -1]].forEach(([sx, sy]) => {
    const x = W / 2 + sx * (33 - 2.4) * k, y = H / 2 - sy * (20 - 2.2) * k;
    for (let s = 0; s < 4; s++) { const l = (4 + rnd() * 14) * k, w = 4 + rnd() * 8, rg = g.createLinearGradient(0, y, 0, y + l); rg.addColorStop(0, 'rgba(120,56,20,0.6)'); rg.addColorStop(1, 'rgba(120,56,20,0)'); g.fillStyle = rg; g.fillRect(x + (rnd() - 0.5) * 12 - w / 2, y, w, l); }
  });
  g.lineWidth = 2;
  for (let i = 0; i < 90; i++) { const x = rnd() * W, y = rnd() * H, l = 20 + rnd() * 160, a = (rnd() - 0.5) * 1.4; g.strokeStyle = `rgba(${rnd() > 0.5 ? '190,180,168' : '20,16,12'},${(0.15 + rnd() * 0.25).toFixed(2)})`; g.beginPath(); g.moveTo(x, y); g.lineTo(x + Math.cos(a) * l, y + Math.sin(a) * l); g.stroke(); }
  return slateBack;
}
function drawSlate(g, W, H, v) {
  const k = W / (SLATE.w * SLATE.px), P = n => n * k;
  g.drawImage(slateBackOf(W, H), 0, 0);
  if (!slateLayer || slateLayer.width !== W) { slateLayer = document.createElement('canvas'); slateLayer.width = W; slateLayer.height = H; }
  const L = slateLayer.getContext('2d');
  L.clearRect(0, 0, W, H);
  const rnd = seeded(K.hash(`${v.now}|${v.ampm}|${v.ready}`));
  // brush paint: laid on in a few passes, each a hair off the last
  const paint = (s, x, y, font, color, align = 'left') => {
    L.font = font; L.textAlign = align; L.textBaseline = 'alphabetic'; L.fillStyle = color;
    for (let i = 0; i < 3; i++) { L.globalAlpha = i ? 0.45 : 1; L.fillText(s, x + (rnd() - 0.5) * P(3), y + (rnd() - 0.5) * P(3)); }
    L.globalAlpha = 1;
  };
  // runs: where the paint's foot is heavy (found from what is painted
  // along the line), a drip down from it
  const runs = (x0, x1, y, color, n, len) => {
    const a = Math.max(0, Math.floor(x0)), b = Math.min(W, Math.ceil(x1)), yy = Math.round(y - P(4));
    if (b - a < 2 || yy < 0 || yy >= H) return;
    const row = L.getImageData(a, yy, b - a, 1).data, cols = [];
    for (let i = 0; i < b - a; i += 3) if (row[i * 4 + 3] > 160) cols.push(a + i);
    L.fillStyle = color;
    for (let i = 0; i < n && cols.length; i++) {
      const x = cols[Math.floor(rnd() * cols.length)], l = P(len * (0.25 + rnd())), w = P(3 + rnd() * 4);
      L.beginPath(); L.moveTo(x - w / 2, yy); L.lineTo(x - w * 0.3, yy + l); L.arc(x, yy + l, w * 0.55, Math.PI, 0, true); L.lineTo(x + w / 2, yy); L.closePath(); L.fill();
    }
  };
  const cream = '#ece4d2', dim = 'rgba(236,228,210,0.8)', red = '#d0393f', yellow = '#e4b52a';
  paint('THE FLOOR', P(SL.x), P(SL.eyebrowY), `${P(SL.label)}px "Special Elite", monospace`, dim);
  const nowFont = `600 ${P(SL.now)}px Oswald, Impact, sans-serif`;
  paint(v.now, P(SL.x), P(SL.numY), nowFont, cream);
  L.font = nowFont; const nowW = L.measureText(v.now).width;
  runs(P(SL.x), P(SL.x) + nowW, P(SL.numY), cream, 5, 70);
  paint(v.ampm, P(SL.x) + nowW + P(14), P(SL.numY), `${P(SL.ampm)}px "Special Elite", monospace`, dim);
  paint(v.value > 0 ? `READY \u00b7 ~$${v.value.toFixed(2)}` : 'READY', P(SL.rx), P(SL.eyebrowY), `${P(SL.label)}px "Special Elite", monospace`, red);
  const readyFont = `600 ${P(SL.ready)}px Oswald, Impact, sans-serif`;
  paint(v.ready, P(SL.rx), P(SL.numY), readyFont, cream);
  L.font = readyFont; runs(P(SL.rx), P(SL.rx) + L.measureText(v.ready).width, P(SL.numY), cream, 3, 70);
  // the hand's box, brushed on in safety yellow, ragged at its edges
  const bx = P(SL.x), by = P(SL.runY), bw = W - 2 * P(SL.x), bh = P(SL.runH);
  L.fillStyle = yellow; L.beginPath();
  const jag = () => (rnd() - 0.5) * P(7);
  L.moveTo(bx + jag(), by + jag());
  for (let x = bx; x <= bx + bw; x += P(40)) L.lineTo(x + jag(), by + jag());
  for (let y = by; y <= by + bh; y += P(30)) L.lineTo(bx + bw + jag(), y + jag());
  for (let x = bx + bw; x >= bx; x -= P(40)) L.lineTo(x + jag(), by + bh + jag());
  for (let y = by + bh; y >= by; y -= P(30)) L.lineTo(bx + jag(), y + jag());
  L.closePath(); L.fill();
  for (let i = 0; i < 26; i++) { const y = by + rnd() * bh; L.fillStyle = `rgba(${rnd() > 0.5 ? '255,236,170' : '150,100,10'},${(0.08 + rnd() * 0.12).toFixed(2)})`; L.fillRect(bx + rnd() * P(60), y, bw - P(120) * rnd(), P(2 + rnd() * 6)); }
  runs(bx, bx + bw, by + bh + P(4), yellow, 7, 60);
  paint('DEAL YOUR HAND', bx + bw / 2, by + bh / 2 + P(SL.run * 0.36), `600 ${P(SL.run)}px Oswald, Impact, sans-serif`, '#141210', 'center');
  // the paint chipped where the sheet has been knocked about
  L.globalCompositeOperation = 'destination-out';
  for (let i = 0; i < 900; i++) { const x = rnd() * W, y = rnd() * H, edge = Math.min(x, W - x, y, H - y) < P(60) ? 3 : 1, s = P(1 + rnd() * 3) * edge; L.fillStyle = `rgba(0,0,0,${(0.5 + rnd() * 0.5).toFixed(2)})`; L.fillRect(x, y, s, s * (0.5 + rnd())); }
  L.globalCompositeOperation = 'source-over';
  g.drawImage(slateLayer, 0, 0);
}
// The barn light over the sign: a galvanised RLM shade on a gooseneck out
// of the wall, aimed down at it, its bulb up inside the dome.
function buildBarnLight() {
  const g = new THREE.Group();
  const [x, y, z] = BARN.at;
  const enamel = new THREE.MeshStandardMaterial({ color: 0x9a9890, roughness: 0.42, metalness: 0.65 });
  K.finished(enamel, 'blast', 2, 2, 0.12);
  const pipe = steelMat(0x2a2622, 0.5);
  const aim = V(...BARN.aim).sub(V(x, y, z)).normalize();
  // the gooseneck: out of a wall plate, up and over to the shade's neck
  const neck = V(x, y, z).addScaledVector(aim, -3.2);
  const wallZ = WALL.z - RIB.h - 0.4;
  const plate = new THREE.Mesh(new THREE.CylinderGeometry(3, 3, 0.8, 24), pipe); plate.rotation.x = Math.PI / 2; plate.position.set(x, y + 14, wallZ); g.add(plate);
  const gn = tube([[x, y + 14, wallZ], [x, y + 15.5, wallZ - 8], [x, y + 13, wallZ - 18], [neck.x, neck.y + 3, neck.z + 2], [neck.x, neck.y, neck.z]], 0.75, pipe, 40, 10);
  gn.castShadow = true; g.add(gn);
  // the shade: a shallow dome, white inside, the lamp's glow in it
  const shade = new THREE.Group(); shade.position.set(x, y, z); shade.quaternion.setFromUnitVectors(V(0, -1, 0), aim); g.add(shade);
  const outer = new THREE.Mesh(new THREE.LatheGeometry([[1.4, 3.6], [1.8, 3.0], [3.2, 2.0], [6.5, 0.8], [9.5, -0.4], [10.2, -0.9], [10.0, -1.1]].map(([r, h]) => new THREE.Vector2(r, h)), 40), enamel);
  outer.castShadow = true; shade.add(outer);
  const lining = new THREE.Mesh(new THREE.LatheGeometry([[9.7, -0.85], [6.3, 0.5], [3.0, 1.6], [1.4, 2.6]].map(([r, h]) => new THREE.Vector2(r, h)), 40), new THREE.MeshBasicMaterial({ color: new THREE.Color(1.5, 1.2, 0.85), side: THREE.BackSide }));
  shade.add(lining);
  const bulb = new THREE.Mesh(new THREE.SphereGeometry(1.5, 16, 12), new THREE.MeshBasicMaterial({ color: new THREE.Color(3.2, 2.5, 1.6) })); bulb.position.y = 1.9; shade.add(bulb);
  const light = new THREE.SpotLight(0xffd6a0, 0, 0, 0.5, 0.55, 0);
  light.position.set(x, y - 1, z); light.target.position.set(...BARN.aim);
  light.castShadow = true; light.shadow.mapSize.set(512, 512); light.shadow.camera.near = 20; light.shadow.camera.far = 120; light.shadow.bias = -0.0008; light.shadow.normalBias = 0.03; light.shadow.radius = 3;
  g.add(light, light.target);
  return { group: g, light, lining, bulb };
}
function slateHTML() {
  return `<div class="r3w-slate-in">
    <div class="r3w-eyebrow r3w-a">THE FLOOR</div>
    <div class="r3w-clock"><b class="r3w-now">--:--</b><small class="r3w-ampm"></small></div>
    <div class="r3w-eyebrow r3w-b r3w-red">READY</div>
    <div class="r3w-ready">&mdash;</div>
    <button type="button" class="r3w-run">DEAL YOUR HAND</button>
  </div>`;
}

// ------------------------------------------------------------ prepare
export async function prepareTable(opts) {
  const o = Object.assign({ scene: null, dest: 'slaughter', hooks: {} }, opts);
  const scene = o.scene;
  if (!scene.userData.set) throw new Error('slaughter: the intro set is missing');
  const set = K.fineSet(scene.userData.set);
  const hooks = o.hooks || {};
  const seat = new THREE.Group();
  seat.position.set(...SEAT.at);
  seat.rotation.y = SEAT.yaw * DEG;
  seat.visible = false;
  scene.add(seat);

  // (the tags' type: the house's letters and the die's script - ask for
  // them, and wait for them, with the sign's)
  const TYPE = 'https://fonts.googleapis.com/css2?family=Pinyon+Script&family=Rye&display=swap';
  if (![...document.querySelectorAll('link[rel="stylesheet"]')].some(l => l.href === TYPE)) {
    const l = document.createElement('link'); l.rel = 'stylesheet'; l.href = TYPE; document.head.appendChild(l);
  }
  if (document.fonts && document.fonts.load) await Promise.all(['700 92px Oswald', '600 92px Oswald', '30px "Special Elite"', '400 40px "Pinyon Script"', '400 40px Rye'].map(f => document.fonts.load(f).catch(() => {})));

  seat.add(await buildFloorAndWall());
  await breathe();
  const croc = surfaceTex(crocSurface(), 2.2, 1, true);
  await breathe();
  const pine = surfaceTex(pineSurface(), 1.6, 1, true);
  await breathe();
  const benchMats = {
    croc: new THREE.MeshStandardMaterial(Object.assign(croc, { roughness: 1, metalness: 0.62, envMapIntensity: 1.1 })),
    pine: new THREE.MeshStandardMaterial(Object.assign(pine, { roughness: 1, metalness: 0 })),
    nail: (() => { const m = K.polishedOf(set.brass, 0.3); m.color = m.color.clone().multiplyScalar(0.62); return m; })()
  };
  seat.add(buildBench(benchMats, { w: BENCH.w, d: BENCH.d, z0: BENCH.z0, top: 0, cush: BENCH.cush, apron: BENCH.apron, legs: BENCH.legs }));
  seat.add(buildBench(benchMats, PEW));
  seat.add(buildRail());
  const lamp = buildLamp();
  seat.add(lamp.group);
  const barn = buildBarnLight();
  seat.add(barn.group);
  // a fill from where you sit, low and soft: the room's own bounce, so
  // what faces you is not lost to black under the key light
  const fill = new THREE.SpotLight(0xffdcb8, 0, 0, 0.6, 0.85, 0);
  fill.position.set(0, 50, -150); fill.target.position.set(0, 50, 40);
  seat.add(fill, fill.target);
  const run = buildRunChain();
  seat.add(run.group);
  seat.add(buildSaw());
  seat.add(buildDie(DIE.size));
  const slateBody = buildSlateBody();
  slateBody.position.set(...SLATE.at); slateBody.rotation.set(0, Math.PI, SLATE.tilt);
  seat.add(slateBody);
  const cs1 = K.contactShadow(26, 15, 6, 2.2, [], 0.5); cs1.position.set(SAW.at[0], 0.03, SAW.at[2]); cs1.rotation.z = SAW.yaw;
  const cs2 = K.contactShadow(DIE.size, DIE.size, 1, 1.2, [], 0.5); cs2.position.set(DIE.at[0], 0.03, DIE.at[2]);
  seat.add(cs1, cs2);

  // The loads: the deck's ready platforms (the demonstration hand with
  // nothing ready), best first - the best nearest you, down the rail.
  const hand = ((hooks.deck && hooks.deck()) || []).slice(0, 7);
  const cards = hand.length ? hand : K.demoHand().slice(0, 6);
  cards.forEach(c => { c.initials = K.initials(c.name); c.spent = c.remaining > 0; });
  const rnd = seeded(41);
  const kit = await loadKit(set);
  const hooksG = new THREE.Group();
  const pivots = [];
  for (let i = 0; i < cards.length; i++) {
    const c = cards[i], t = cards.length > 1 ? lerp(RAIL.t0, RAIL.t1, i / (cards.length - 1)) : (RAIL.t0 + RAIL.t1) / 2;
    const p = buildHook(set, kit, c, t, LOADS[i % LOADS.length], rnd, i % 2 === 1);
    pivots.push(p); hooksG.add(p);
    await breathe();
  }
  seat.add(hooksG);
  seat.add(buildSpatter(pivots.map(p => [p.position.x, p.position.z])));
  const pivotOf = id => pivots.find(p => p.userData.tag.userData.id === id);
  const setSpent = (id, spent) => {
    const p = pivotOf(id); if (!p) return;
    const t = p.userData.tag.userData;
    if (spent && !t.spentTex) t.spentTex = asTex(tagArt(t.card, true).color);
    const m = t.plate.material[0];
    m.map = spent ? t.spentTex : t.liveTex; m.roughness = spent ? 0.6 : 0.3; m.metalness = spent ? 0.45 : 0.85; m.needsUpdate = true;
  };
  cards.forEach(c => { if (c.spent) setSpent(c.id, true); });

  // The lamp comes up while the intro floats, so the bench is there, lit,
  // before the camera turns toward it.
  let lampT0 = performance.now();
  const lampUp = () => {
    const k = smoother((performance.now() - lampT0) / 2200);
    lamp.light.intensity = 6.5 * k;
    lamp.lining.material.color.setRGB(1.9 * k + 0.05, 1.3 * k + 0.04, 0.5 * k + 0.02);
    barn.light.intensity = 3.2 * k;
    fill.intensity = 0.85 * k;
    barn.lining.material.color.setRGB(1.5 * k + 0.04, 1.2 * k + 0.03, 0.85 * k + 0.02);
    barn.bulb.material.color.setRGB(3.2 * k + 0.1, 2.5 * k + 0.08, 1.6 * k + 0.05);
    return k;
  };
  lampUp();
  // today's run on the chain, from the hook up: the lit links are the
  // hot set drawn over the iron, the rest of that set folded away
  let runNow = 0;
  const col = new THREE.Color(), m4r = new THREE.Matrix4(), none = new THREE.Matrix4().makeScale(0, 0, 0);
  const drawRun = f => {
    runNow = f;
    const lit = Math.round(clamp01(f) * CHAIN.links);
    for (let i = 0; i < CHAIN.links; i++) {
      // (instance i hangs i links down: the lit run counts up from the hook)
      const k = CHAIN.links - 1 - i;
      if (k < lit) {
        run.cold.getMatrixAt(i, m4r); m4r.scale(V(1.06, 1.06, 1.06)); run.hot.setMatrixAt(i, m4r);
        const u = lit > 1 ? k / (lit - 1) : 1;
        col.setRGB(0.77, 0.12, 0.18).lerp(new THREE.Color(1, 0.42, 0.07), smoother(u / 0.6)).lerp(new THREE.Color(1, 0.96, 0.85), smoother((u - 0.7) / 0.3));
        run.hot.setColorAt(i, col);
      } else run.hot.setMatrixAt(i, none);
    }
    run.hot.instanceMatrix.needsUpdate = true;
    if (run.hot.instanceColor) run.hot.instanceColor.needsUpdate = true;
    run.hot.visible = lit > 0;
    run.glow.intensity = 2.4 * clamp01(f * 1.5);
    run.glow.position.y = run.y0 + lit * CHAIN.link * 0.5;
  };
  drawRun(0);

  async function fly(world, flyOpts = {}) {
    const fo = Object.assign({ manual: false, reduced: false, duration: 0, onArrive: null, host: null, seatView: null }, flyOpts);
    const { camera } = world;
    if (fo.reduced) lampT0 = -Infinity;
    const stageEl = fo.host || document.body;
    world.overlays.forEach(el => { el.style.visibility = 'hidden'; });
    const css = new CSS3DRenderer();
    css.domElement.className = 'r3t-css r3w-css';
    const cssScene = new THREE.Scene();
    const cssSeat = new THREE.Group();
    cssSeat.position.copy(seat.position); cssSeat.quaternion.copy(seat.quaternion);
    cssScene.add(cssSeat);
    let aspect = 1;
    const size = () => {
      world.size();
      const box = world.canvas.parentElement || world.host;
      const w = box.clientWidth || window.innerWidth, h = box.clientHeight || window.innerHeight;
      css.setSize(w, h);
      return w / h;
    };
    aspect = size();
    stageEl.appendChild(css.domElement);

    const toWorld = v => seat.localToWorld(v.clone());
    seat.updateMatrixWorld(true);
    const seatView = () => {
      if (fo.seatView) { const [ey, ez, az, fv] = fo.seatView; return { eye: V(0, ey, ez), aim: V(0, 60, az), fov: fv }; }
      const v = VIEW[aspect < 0.62 ? 0 : 1];
      return { eye: V(...v.eye), aim: V(...v.aim), fov: v.fov };
    };
    let sv = seatView();
    let E1 = toWorld(sv.eye), A1 = toWorld(sv.aim);

    // The path in: one unbroken glide from the float to the stool, as the
    // card table's - up to a cruise over the gaming floor, the bench held
    // in the middle of the view, then down from behind the stool.
    const E0 = camera.position.clone(), q0 = camera.quaternion.clone();
    const seatBack = toWorld(V(0, 0, -1)).sub(toWorld(V(0, 0, 0))).normalize();
    const F = toWorld(V(0, 60, 36));
    const cruise = THREE.MathUtils.clamp(Math.max(E0.y, E1.y) + 55, 110, 150);
    const bez = (u, a, b, c, d) => { const v = 1 - u; return v * v * v * a + 3 * v * v * u * b + 3 * v * u * u * c + u * u * u * d; };
    const P1 = V(0, 0, 0), P2 = V(0, 0, 0);
    const eyeAt = (k, out) => {
      const u = smoother(k);
      P1.copy(E0).lerp(E1, 0.2);
      P2.copy(E1).addScaledVector(seatBack, 60);
      const y = E0.y + (cruise - E0.y) * easeOut(k / 0.34, 2) - (cruise - E1.y) * smoother((k - 0.46) / 0.54);
      return out.set(bez(u, E0.x, P1.x, P2.x, E1.x), y, bez(u, E0.z, P1.z, P2.z, E1.z));
    };
    const m4 = new THREE.Matrix4(), up = V(0, 1, 0);
    const lookQ = (eye, at, out) => out.setFromRotationMatrix(m4.lookAt(eye, at, up));
    const FLY = fo.reduced ? 0.01 : fo.duration > 0 ? fo.duration : T.fly;
    const UI_IN = fo.reduced ? 0.01 : T.uiIn;
    const fov0 = camera.fov, near0 = camera.near;
    const lens0 = world.lights.lensLight.intensity;
    const pendant0 = world.lights.pendant.intensity;
    const bloom0 = world.bloom ? world.bloom.strength : 0;
    const introT0 = world.t;
    const env0 = world.scene.environmentIntensity == null ? 1 : world.scene.environmentIntensity;

    // ---- The UI, built now, shown on arrival.
    const ui = document.createElement('div');
    ui.className = 'r3t-ui';
    css.domElement.appendChild(ui);
    const slateEl = document.createElement('div');
    slateEl.className = 'r3w-slate';
    slateEl.style.width = `${Math.round(SLATE.w * SLATE.px)}px`;
    slateEl.style.height = `${Math.round(SLATE.h * SLATE.px)}px`;
    slateEl.innerHTML = slateHTML();
    const slateObj = new CSS3DObject(slateEl);
    slateObj.position.set(SLATE.at[0], SLATE.at[1], SLATE.at[2] - 1.2);
    slateObj.rotation.set(0, Math.PI, SLATE.tilt);
    slateObj.scale.setScalar(1 / SLATE.px);
    cssSeat.add(slateObj);
    const cardEl = document.createElement('div');
    cardEl.className = 'r3t-card r3w-card';
    cardEl.setAttribute('role', 'button');
    cardEl.tabIndex = -1;
    cardEl.style.visibility = 'hidden';
    const cardObj = new CSS3DObject(cardEl);
    cssSeat.add(cardObj);
    K.inkBacks(css.domElement, cards);
    const infoEl = document.createElement('div');
    infoEl.className = 'r3t-info';
    infoEl.setAttribute('role', 'region');
    infoEl.style.visibility = 'hidden';
    css.domElement.appendChild(infoEl);
    const phoneEl = document.createElement('div');
    phoneEl.className = 'r3t-phone';
    phoneEl.setAttribute('role', 'group');
    phoneEl.setAttribute('aria-label', 'Phone');
    phoneEl.innerHTML = K.phoneHTML(asset);
    css.domElement.appendChild(phoneEl);
    let phoneHeld = false;
    const holdPhone = on => { phoneHeld = !!on; phoneEl.classList.toggle('r3t-held', phoneHeld); };
    const srList = document.createElement('div');
    srList.className = 'r3t-sr';
    srList.innerHTML = `<ul>${cards.map(c => `<li><button type="button" data-id="${K.esc(c.id)}">${K.esc(c.name)}, ${K.esc(K.cardShown(c))}</button></li>`).join('')}</ul>`;
    css.domElement.appendChild(srList);
    css.domElement.classList.add('r3t-hide');

    // ---- Time and the slate's readouts.
    const q = s => slateEl.querySelector(s);
    const put = (el, v) => { if (el && el.textContent !== v) el.textContent = v; };
    const sample = () => ({ ready: cards.length, value: cards.reduce((t, c) => t + (c.ev || 0), 0), next: null, done: 0 });
    let spentChanged = false;
    // The slate's chalk is drawn on the board itself, so the hooks' chains
    // hanging in front of it cover it as they should (the page's own slate
    // lies over it unseen, for the taps, the keyboard and screen readers):
    // redrawn when what it says changes.
    let slateKey = '', slateValue = 0;
    function printSlate() {
      slateBody.userData.print.draw({ now: q('.r3w-now').textContent, ampm: q('.r3w-ampm').textContent, ready: q('.r3w-ready').textContent, value: slateValue });
    }
    const tick = () => {
      const d = new Date();
      const hh = d.getHours(), mm = d.getMinutes();
      const hm = `${((hh + 11) % 12) + 1}:${String(mm).padStart(2, '0')}`;
      put(q('.r3w-now'), hm);
      put(q('.r3w-ampm'), hh < 12 ? 'AM' : 'PM');
      const st = (hand.length && hooks.status && hooks.status()) || sample();
      put(q('.r3w-ready'), String(st.ready));
      slateValue = st.value || 0;
      const key = `${hm}|${hh < 12 ? 'AM' : 'PM'}|${st.ready}|${slateValue.toFixed(2)}`;
      if (key !== slateKey) { slateKey = key; printSlate(); spentChanged = true; }
      phoneEl.querySelectorAll('.r3t-ph-clock, .r3t-ph-big').forEach(n => put(n, hm));
      put(phoneEl.querySelector('.r3t-ph-day'), d.toLocaleDateString(undefined, { weekday: 'long', month: 'long', day: 'numeric' }));
      put(phoneEl.querySelector('.r3t-ph-ready'), `${st.ready} ready${st.value > 0 ? ` · ~$${st.value.toFixed(2)}` : ''}`);
      put(phoneEl.querySelector('.r3t-ph-next'), st.next ? `Next comes ready in ${K.fmtLeft(st.next)}` : `All caught up · ${st.done} done today`);
      const total = st.ready + st.done;
      const f = total > 0 ? st.done / total : 0;
      if (Math.abs(f - runNow) > 1e-3) { drawRun(f); spentChanged = true; }
      if (hooks.cardState) cards.forEach(c => {
        const now = hooks.cardState(c.id);
        if (!now) return;
        const spent = now.remaining > 0;
        if (spent !== !!c.spentNow) { c.spentNow = spent; c.remaining = now.remaining; setSpent(c.id, spent); spentChanged = true; }
      });
      if (spentChanged) { spentChanged = false; show(); }
    };

    // ---- The swing: the hooks move as a load does when something passes -
    // on arrival, from the draught of your coming in; a drag across the
    // bench pushes them; each settles on its own time.
    let swingT0 = -1, push = 0, pushDir = 1;
    const swing = (p, tt) => {
      const d = p.userData;
      let a = 0;
      if (swingT0 >= 0 && !fo.reduced) {
        const u = (tt - swingT0);
        const env = Math.exp(-u / 3.4) * (1 - Math.exp(-u / 0.35));
        a = Math.sin(u * d.rate * 2.1 + d.phase) * 0.075 * d.amp * env;
      }
      p.rotation.z = a + d.tilt * 0.3;
      p.rotation.x = a * 0.35;
    };
    const kick = (amp, dir) => { swingT0 = tNow; pivots.forEach(p => { p.userData.amp = amp * (0.6 + Math.random() * 0.8); p.userData.phase = dir > 0 ? 0.3 : Math.PI - 0.3; }); wake(); };

    // ---- A tag's card: off the hook and up to you, turning from its back
    // to its face as it comes; back onto the hook when it goes.
    let cardId = null, lift = 0, liftTo = 0, liftFrom = 0, liftT0 = 0;
    const pw = V(0, 0, 0), qw = new THREE.Quaternion(), seatQi = new THREE.Quaternion();
    const focusPose = (outP, outQ) => {
      const fov = camera.fov * DEG;
      const d = K.CARD.h / (0.42 * 2 * Math.tan(fov / 2));
      outP.set(0, 0.1 * d, -d).applyQuaternion(camera.quaternion).add(camera.position);
      outQ.copy(camera.quaternion);
      return 1;
    };
    const _p0 = V(0, 0, 0), _p1 = V(0, 0, 0), _q1 = new THREE.Quaternion(), flipQ = new THREE.Quaternion();
    const poseCard = tt => {
      if (!cardId) { if (cardEl.style.visibility !== 'hidden') cardEl.style.visibility = 'hidden'; return; }
      lift = fo.reduced ? liftTo : lerp(liftFrom, liftTo, smoother((tt - liftT0) / T.lift));
      if (lift <= 0.001 && liftTo === 0) { cardId = null; cardEl.style.visibility = 'hidden'; hideInfo(); return; }
      const p = pivotOf(cardId);
      if (!p) return;
      p.userData.plate.getWorldPosition(_p0);
      focusPose(_p1, _q1);
      const k = lift;
      pw.copy(_p0).lerp(_p1, k);
      pw.addScaledVector(V(0, 1, 0).applyQuaternion(camera.quaternion), Math.sin(Math.PI * k) * 3);
      flipQ.setFromAxisAngle(V(0, 1, 0), Math.PI * (1 - smoother(clamp01((k - 0.15) / 0.7))));
      qw.copy(_q1).multiply(flipQ);
      const tagPx = TAG.h * LOAD.tag / K.CARD.h;
      const sc = lerp(tagPx, 1, smoother(k)) / K.CARD.px;
      seatQi.copy(seat.quaternion).invert();
      cardObj.position.copy(pw); seat.worldToLocal(cardObj.position);
      cardObj.quaternion.copy(seatQi).multiply(qw);
      cardObj.scale.setScalar(sc);
      cardEl.style.visibility = 'visible';
      const n = V(0, 0, 1).applyQuaternion(qw), toCam = camera.position.clone().sub(pw);
      cardEl.classList.toggle('r3t-up', n.dot(toCam) > 0);
      // (the tag itself is off its hook while its card is up)
      p.userData.plate.visible = k < 0.5;
    };
    const showInfo = id => {
      const d = hooks.cardInfo ? hooks.cardInfo(id) : null;
      if (!d) { hideInfo(); return; }
      const tier = K.tierOf(d.tier);
      infoEl.setAttribute('aria-label', `${d.name}: keen info`);
      infoEl.innerHTML = `<div class="r3t-info-in">
        <div class="r3t-info-head"><span class="r3t-info-tier t-${tier}">${tier === 'U' ? '&bull;' : tier}</span><b>${K.esc(d.name)}</b><span class="r3t-info-state${d.ready ? ' r3t-ready' : ''}">${K.esc(d.state)}</span><button type="button" class="r3t-info-x" aria-label="Put the card back">&times;</button></div>
        <div class="r3t-info-acts">${(d.acts || []).map(([act, label]) => `<button type="button" class="r3t-act r3t-act-${K.esc(act)}" data-act="${K.esc(act)}">${K.esc(label)}</button>`).join('')}</div>
        <div class="r3t-info-body">${d.html || ''}</div>
      </div>`;
      infoEl.style.visibility = 'visible';
      requestAnimationFrame(() => { if (cardId === id) infoEl.classList.add('r3t-open'); });
    };
    function hideInfo() { infoEl.classList.remove('r3t-open'); infoEl.style.visibility = 'hidden'; }
    const takeCard = id => {
      const c = cards.find(x => x.id === id);
      if (!c) return;
      if (cardId && cardId !== id) { const p = pivotOf(cardId); if (p) p.userData.plate.visible = true; cardId = null; lift = 0; }
      cardId = id;
      cardEl.innerHTML = K.cardHTML(Object.assign({}, c, { remaining: c.spentNow ? c.remaining : 0 }));
      cardEl.dataset.id = id;
      liftFrom = lift; liftTo = 1; liftT0 = tNow;
      showInfo(id);
      // (a card brought up: an S-tier one lifts the music, as at the table)
      if (hooks.cardTap) hooks.cardTap(id, true, c.tier);
      wake();
    };
    const putBack = () => {
      if (!cardId) return;
      liftFrom = lift; liftTo = 0; liftT0 = tNow;
      hideInfo();
      if (hooks.cardTap) hooks.cardTap(cardId, false);
      wake();
    };

    // ---- The frame at time tt (seconds from the tap).
    let tNow = 0, arrived = false;
    const flyEye = V(0, 0, 0), qTable = new THREE.Quaternion(), qSeat = new THREE.Quaternion(), camQ = new THREE.Quaternion();
    const placeCamera = tt => {
      camera.up.copy(up);
      if (tt < FLY) {
        const u = smoother(tt / FLY);
        const e = eyeAt(tt / FLY, flyEye);
        lookQ(e, F, qTable);
        lookQ(E1, A1, qSeat);
        camQ.copy(q0).slerp(qTable, smoother(tt / (FLY * 0.3))).slerp(qSeat, smoother((u - 0.62) / 0.38));
        camera.position.copy(e);
        camera.quaternion.copy(camQ);
        camera.fov = lerp(fov0, sv.fov, smoother(u));
      } else {
        camera.position.copy(E1); camera.lookAt(A1); camera.fov = sv.fov;
      }
      camera.near = near0;
      camera.updateProjectionMatrix();
      camera.updateMatrixWorld();
    };
    const update = tt => {
      tNow = tt;
      lampUp();
      placeCamera(tt);
      world.stage(introT0 + tt);
      const sat = fo.reduced ? 1 : smoother((tt - FLY * 0.45) / (FLY * 0.55));
      world.scene.environmentIntensity = env0 * lerp(1, K.ROOM_ENV, sat);
      world.lights.pendant.intensity = pendant0;
      const kf = fo.reduced ? 1 : clamp01(tt / 0.9);
      world.lights.lensLight.intensity = lens0 * (1 - kf);
      world.lights.rim.intensity *= 1 - 0.6 * kf;
      if (world.bloom) world.bloom.strength = fo.reduced ? 0 : lerp(bloom0, 0.32, kf);
      // the hooks swing as you come in, and when pushed
      if (!fo.reduced && swingT0 < 0 && tt >= FLY - 0.4) { swingT0 = tt; pivots.forEach(p => { p.userData.amp = 0.7 + Math.random() * 0.6; }); }
      pivots.forEach(p => swing(p, tt));
      poseCard(tt);
      // (the slate is print on the board all the way; on the stool the
      // page's own, unseen, lies over it for the taps)
      slateEl.style.visibility = tt < FLY ? 'hidden' : '';
      const stg = world.canvas.parentElement;
      if (stg && stg.classList.contains('r3t-focus') !== !!(cardId && liftTo)) stg.classList.toggle('r3t-focus', !!(cardId && liftTo));
      const uiK = clamp01((tt - FLY + 0.1) / UI_IN);
      css.domElement.style.setProperty('--r3t-in', uiK.toFixed(3));
      css.domElement.classList.toggle('r3t-hide', uiK <= 0);
      if (!arrived && tt >= FLY) { arrived = true; if (fo.onArrive) fo.onArrive(css.domElement); }
    };
    const draw = () => { world.paint(); css.render(cssScene, camera); };
    const show = () => { if (running) draw(); else world.rest(draw); };

    // ---- The loop: runs while anything moves, then holds the frame.
    let running = false, raf = 0, last = 0, woke = 0, disposed = false, dragging = false;
    const pacer = world.pacer ? world.pacer() : null;
    const busy = () => tNow < FLY + UI_IN + 0.1 || (swingT0 >= 0 && tNow - swingT0 < T.swing) || dragging || (cardId && Math.abs(lift - liftTo) > 1e-3);
    const loop = now => {
      if (!running) return;
      if (pacer && !pacer.due(now)) { raf = requestAnimationFrame(loop); return; }
      const dt = last ? Math.min(0.1, (now - last) / 1000) : 1 / 60;
      if (last && ++woke > 6 && !document.hidden && now - last < 250) world.pace((now - last) / 1000);
      last = now;
      update(tNow + dt);
      if (!busy()) { running = false; world.rest(draw); return; }
      draw();
      raf = requestAnimationFrame(loop);
    };
    const wake = () => {
      if (disposed) return;
      if (fo.manual) { update(tNow); world.rest(draw); return; }
      if (!running) { running = true; last = 0; woke = 0; if (pacer) pacer.reset(); world.move(); raf = requestAnimationFrame(loop); }
    };
    if (world.onRestore) world.onRestore(() => { if (!disposed) show(); });

    // ---- Touch: a tag (its card), the bench (a push on the hooks).
    const ray = new THREE.Raycaster(), ndc = new THREE.Vector2();
    const hitAt = e => {
      const r = css.domElement.getBoundingClientRect();
      ndc.set(((e.clientX - r.left) / r.width) * 2 - 1, -((e.clientY - r.top) / r.height) * 2 + 1);
      ray.setFromCamera(ndc, camera);
      // (a load is its card: the load or its tag under the finger, or
      // failing that a tag a little way off)
      const hit = ray.intersectObject(hooksG, true)[0];
      if (hit) { let o = hit.object; while (o && o.parent !== hooksG) o = o.parent; if (o && o.userData.tag) return { id: o.userData.tag.userData.id }; }
      let best = null, bestD = Infinity;
      pivots.forEach(p => {
        p.userData.plate.getWorldPosition(pw);
        const d = ray.ray.distanceToPoint(pw), tol = 7;
        if (d < tol && d < bestD) { bestD = d; best = { id: p.userData.tag.userData.id }; }
      });
      return best;
    };
    let press = null;
    const onStage = e => { const st = world.canvas.parentElement; return !!(st && e.target && st.contains(e.target)); };
    const onDown = e => {
      if (tNow < FLY || e.button > 0 || !onStage(e)) return;
      if (e.target.closest && e.target.closest('.r3w-slate, .r3t-info, .r3t-phone, .r3t-card')) return;
      press = { id: e.pointerId, x: e.clientX, y: e.clientY, moved: 0 };
    };
    const onMove = e => {
      if (!press || e.pointerId !== press.id) return;
      const dx = e.clientX - press.x, dy = e.clientY - press.y;
      press.moved += Math.abs(dx) + Math.abs(dy);
      push += dx; pushDir = Math.sign(dx) || pushDir;
      if (press.moved > 8 && !dragging) { dragging = true; putBack(); wake(); }
    };
    const onUp = e => {
      if (!press || e.pointerId !== press.id) return;
      const wasDrag = dragging;
      dragging = false;
      press = null;
      if (wasDrag) { kick(Math.min(1.6, 0.4 + Math.abs(push) / 120), pushDir); push = 0; return; }
      if (cardId && liftTo) { putBack(); return; }
      const h = hitAt(e);
      if (h && h.id) takeCard(h.id);
    };
    window.addEventListener('pointerdown', onDown, true);
    window.addEventListener('pointermove', onMove, true);
    window.addEventListener('pointerup', onUp, true);
    const onCancel = () => { dragging = false; press = null; push = 0; };
    window.addEventListener('pointercancel', onCancel, true);
    css.domElement.addEventListener('click', e => {
      const act = e.target.closest('.r3t-info [data-act]');
      if (act) { const id = cardId; putBack(); if (hooks.cardAction && id) hooks.cardAction(id, act.dataset.act); tick(); return; }
      if (e.target.closest('.r3t-info-x')) { putBack(); return; }
      if (e.target.closest('.r3t-card')) { putBack(); return; }
      if (e.target.closest('.r3w-run')) { if (hooks.run) hooks.run(); return; }
      const sr = e.target.closest('.r3t-sr button');
      if (sr) { takeCard(sr.dataset.id); return; }
      const tile = e.target.closest('.r3t-ph-tile, .r3t-ph-gear');
      if (tile) { if (hooks.openView) hooks.openView(tile.dataset.view); return; }
      if (e.target.closest('.r3t-ph-pickup')) { holdPhone(true); return; }
      if (e.target.closest('.r3t-ph-put')) { holdPhone(false); return; }
      if (e.target.closest('.r3t-phone') && !phoneHeld) holdPhone(true);
    });
    const onKey = e => {
      if (e.key !== 'Escape') return;
      if (phoneHeld) holdPhone(false);
      else if (cardId && liftTo) putBack();
    };
    css.domElement.addEventListener('keydown', onKey);
    const onResize = () => {
      aspect = size();
      sv = seatView(); E1 = toWorld(sv.eye); A1 = toWorld(sv.aim);
      update(tNow); show();
    };
    window.addEventListener('resize', onResize);

    tick();
    const clock = setInterval(tick, 1000);
    update(0);
    if (fo.manual) world.rest(draw);
    else { draw(); running = true; raf = requestAnimationFrame(loop); }

    return {
      dest: 'slaughter',
      duration: FLY,
      get t() { return tNow; },
      seek(t) { tNow = t; update(t); show(); },
      takeCard(id) { takeCard(id || cards[0].id); },
      putBack,
      swing(amp = 1, dir = 1) { kick(amp, dir); update(tNow); show(); },
      swingAt(u) { swingT0 = tNow - u; pivots.forEach(p => { p.userData.amp = 1; }); update(tNow); show(); },
      pickUpPhone(on = true) { holdPhone(on); },
      tags: cards.map(c => c.id),
      screenOf(id) {
        const r = css.domElement.getBoundingClientRect();
        const m = id === 'run' ? null : (pivotOf(id) || {}).userData && pivotOf(id).userData.plate;
        if (id === 'run') { const b = slateEl.querySelector('.r3w-run').getBoundingClientRect(); return { x: b.left + b.width / 2, y: b.top + b.height / 2 }; }
        if (!m) return null;
        const p = m.getWorldPosition(V(0, 0, 0)).project(camera);
        return { x: r.left + (p.x + 1) / 2 * r.width, y: r.top + (1 - p.y) / 2 * r.height };
      },
      get state() { return { card: cardId, lift: +lift.toFixed(3), swing: swingT0 >= 0 ? +(tNow - swingT0).toFixed(2) : null, run: +runNow.toFixed(3), running }; },
      get programs() { return world.renderer.info.programs.length; },
      setFelt() {},
      setTrim() {},
      dispose() {
        disposed = true; running = false; cancelAnimationFrame(raf);
        clearInterval(clock);
        window.removeEventListener('resize', onResize);
        window.removeEventListener('pointerdown', onDown, true);
        window.removeEventListener('pointermove', onMove, true);
        window.removeEventListener('pointerup', onUp, true);
        window.removeEventListener('pointercancel', onCancel, true);
        world.scene.environmentIntensity = env0;
        camera.near = near0; camera.updateProjectionMatrix();
        css.domElement.remove();
      }
    };
  }

  if (o.warm) {
    try { await o.warm({ show: [seat], spread: true }); } catch (e) { /* compiled on first draw */ }
  }
  seat.visible = true;

  return {
    dest: 'slaughter',
    fly,
    dispose() { scene.remove(seat); K.freeTree(seat, scene.userData.set); }
  };
}
