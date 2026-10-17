// THE SLAUGHTER FLOOR: West Texas Gore Fest's home at Showroom (three.js +
// CSS3D).
//
// After the roll intro has floated up, a tap on the landing starts one
// continuous shot, as it does for the card table (table.mjs): the camera
// rises out of the float and glides across the room, away from the gaming
// floor, down to a seat at a butcher's block on the house's killing floor.
// The room is dark. Over the block one fluorescent tube, dying, buzzes and
// flutters - it catches as you come down, and every so often it fails and
// catches again. Under it a meat rail runs in from over your right
// shoulder to the wall, and on its hooks hang the day's hog sides, split
// down the spine, raw, dripping onto the block, flies about them, each
// with a rusted tin tag nailed into its ham: your ready platforms. The
// hooks are never still; the chains creak. The cleaver is hacked into the
// block, a saw lies across it, the bone die from the fire rests in the
// blood. Propped against the brick at the back of the block, under your
// thumb, a scrap of the wall's own cladding with the clock painted on it,
// what is ready, and the hand to deal. Off to the right hangs the hoist's
// chain: today's run is how much of it has gone to ember, from the hook up.
//
// Tap a side or its tag: its card comes up off the hook to you, with its
// Keen Info and its moves (the same card and sheet as the card table's).
// Drag across the block: the sides swing, and settle. Nothing here is
// scaled to fake a thing: the camera goes where you would sit, and the
// lens is sized for that.
//
// The light flickers, but never as a strobe: the tube's fast flutter moves
// its light by no more than BURN.buzz (7%); its failures - the light gone
// near black for a moment - come at most two to a second, and seconds
// apart. With reduced motion it burns steady and nothing moves on its own.
//
// Held to real makers, at three distances (across the room: silhouette;
// at arm's length: materials, bevels, seams; pinched in 3x: engraving,
// grain, wear), for what each surface does with the light, what it touches
// and how it moves:
//   The block, and the one you sit at - a butcher's block of end-grain
//     maple on stained posts, stretchers and a slatted shelf: the top gone
//     near black with blood where the work is done, scored every way by
//     the cleaver, chopped out in divots, dried pools dark-rimmed, fresh
//     smears wet over them, scraps of fat left; blood run down its sides.
//   The rail and the hooks - a meat rail from a packing-house fitter: a
//     rusted I-beam on hangers, trolleys on its lower flange, short lengths
//     of forged chain, meat hooks of blacked steel through each side's
//     hock. They sway from the trolley as a heavy load does and turn on
//     the hook, never quite still; now and then one jerks, as if knocked.
//   The sides - hog sides, scalded, split and hung a day: the cut face
//     (the backfat and skin round it, the halved spine, the ribs under
//     their membrane, the cut pelvis, bacon's layers in the belly, the
//     shoulder blade, a raw clotted neck, the foreleg to its trotter) and
//     the inspector's purple stamp; blood run down them, dripping from the
//     trotters, pooling where it lands.
//   The tags - a meat packer's tin tags: galvanised sheet gone to rust,
//     struck with the house's W.T.G.F., a lot number and the platform's
//     initials big, smeared with blood, nailed into the ham at its edge. A
//     spent platform's tag is rust over, and punched.
//   The tube - a strip light from a plant room: a pressed-steel channel on
//     two chains, one tube, its ends gone black. Its sickly green-white is
//     the only light; most of the room stays in the dark.
//   The saw - a professional chainsaw from a forestry dealer, years into
//     its work: an oil-stained cowl in rust orange, blood on it, a dark
//     guide bar, the chain's cutters along it. It does not run here.
//   The chain - the hoist's own: heavy forged links. Today's run is the
//     chain gone to ember from the hook up, blood red to white-hot at the
//     head, its glow on the wall behind; the rest black iron.
//   The sign - a scrap of the cladding cut with snips, its ribs across,
//     propped on the block against the brick: rust at the cut and its old
//     screw holes, and over it the day in brush paint (Special Elite for
//     the labels, Oswald for the numbers), runs under the strokes, the
//     hand's button a box of blood red, a bloody hand dragged off its end.
//   The floor and the wall - bare concrete, a drain in it, blood pooled
//     and dragged across it; the wall aged brick to above the block, damp
//     and mould in it, blood flung up it, a hand smeared down it, a tally
//     scratched; a steel sill, and over it roll-formed panels in Burnished
//     Slate, ribbed, rust run down from every screw, the work's cast-off
//     flung across them.
//
// The sound, with the music on (through its own level and mute): the
// tube's hum, which fails with it; the flies; the chains' creak.
//
// Coordinates are the seat's own, as the table's: centimetres, the origin
// on the block's top at the middle of its near edge's line, +z away from
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
// The block: 150 x 70, its near edge a little in front of the origin, its
// top the origin's; thick, on square posts to the floor.
const BENCH = { w: 150, d: 70, z0: -4, thick: 14, legs: 11, floor: -82 };
// The block you sit at, under the camera.
const PEW = { w: 112, d: 40, z0: -168, top: -36, thick: 10, legs: 8 };
// The rail: overhead, from a hanger over the block's right front corner
// back to a bracket on the wall; the sides hang between t0 and t1 along
// it, above the sign.
const RAIL = { y: 160, from: [-36, -12], to: [44, 82], t0: 0.124, t1: 0.9075, link: 2.7, flange: 5.5 };
// The sides: s their scale (from the size their outline is drawn at); each
// hook's chain, in links; where each tag is nailed (in the outline's own
// units: at the ham's belly edge, so each tag stands out past its side's
// edge and clear of the next side's, the tags stepping back down the rail);
// turn: each turned from the seat that much toward the tube.
const HOG = { s: 0.78, links: [3, 4, 3, 4, 3, 4, 3], tag: [12, -26], turn: 0.3 };
// The tube: up to your right, running away from you toward the wall over
// the block's right end - its far end, the dying one, in the top corner of
// the view; its light from its near end, aimed down across the block; and
// what it throws back off the ceiling, a little, from behind you (fill).
const TUBE = { at: [-44, 150, 26], len: 92, yaw: Math.PI / 2, light: [-44, 147, -14], aim: [0, 20, 45], fill: [-30, 150, -120], fillAim: [5, 95, 40] };
// How it burns: its light (its falloff, and where that is measured) and
// its glow at full; the flutter, never more than buzz of its light; the fits' failures
// at least gap seconds apart (so never more than two to a second).
const BURN = { light: 2.8, decay: 0, at: 140, glow: 0.9, fill: 0.55, buzz: 0.07, gap: 0.5 };
// The room's environment: low - the tube is the light.
const ENV = 0.12;
// The wall: brick to brick, then the cladding; its ribs. The sign: propped
// on the back of the block at the right, leaning back (lean) against the
// brick, under your thumb - at: its middle, its foot on the block, its top
// on the brick. The drain in the floor.
const WALL = { z: 88, w: 520, h: 312, brick: 135 };
const RIB = { pitch: 30, h: 3.2, top: 2.6, base: 8, minor: 0.42 };
const SLATE = { at: [-22, 17.75, 74.4], lean: 0.49, w: 66, h: 40, px: 30, tilt: -0.8 * DEG, phase: 18.3 };
const DRAIN = [10, 36];
// The run's chain: off to the right, down to a hook.
const CHAIN = { x: -86, z: 28, top: 142, links: 32, link: 3.0 };
// The saw toward the back on the left, its bar angled in toward you; the
// cleaver hacked in at the front, in the middle (at: its heel on the
// edge's line, y its depth in the wood); the die in the blood.
const SAW = { at: [54, 0, 46], yaw: Math.PI - 0.56 };
const CLEAVER = { at: [2, -2.4, 16], yaw: 0.35, lean: 0.06 };
const DIE = { at: [-12, 0, 36], size: 5.2 };
// The drips: each side lets one go every `every` seconds or so (g: cm/s/s);
// a pool spreads to `pool` across. The flies.
const DRIP = { every: [1.3, 4.0], g: 980, pool: 20 };
const FLIES = 44;
// The sound's levels, into the music's bus (under its own level and mute).
const SND = { hum: 0.05, flies: 0.075, creak: 2.2 };
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
function concreteTex(w, h, seed, stains, drain, gore) {
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
    // (a point on the floor, x and z, to the map: the plane laid down, its
    // middle at z 30)
    const X = x => (w / 2 + x) * k, Z = z => (h / 2 + z - 30) * k;
    if (gore) {
      // the day's: a pool spread out from under the block's front, dragged
      // off across the floor in wide smears, trodden, flecked round about
      const px = X(20), pz = Z(-22);
      g.fillStyle = 'rgba(46,5,4,0.88)'; g.beginPath();
      for (let i = 0; i <= 48; i++) { const a = i / 48 * Math.PI * 2, r = (1 + (rnd() - 0.5) * 0.35) * k; g.lineTo(px + Math.cos(a) * 64 * r, pz + Math.sin(a) * 30 * r); }
      g.closePath(); g.fill();
      g.lineCap = 'round';
      for (let i = 0; i < 5; i++) {
        let x = px + (rnd() - 0.5) * 60 * k, y = pz - 10 * k;
        const ex = X(-90 + rnd() * 120), ey = Z(-150 - rnd() * 60);
        for (let s = 0; s < 3; s++) {
          g.strokeStyle = `rgba(${50 + rnd() * 20 | 0},6,5,${(0.22 + rnd() * 0.2).toFixed(2)})`; g.lineWidth = (10 + rnd() * 14) * k;
          g.beginPath(); g.moveTo(x + (rnd() - 0.5) * 8 * k, y); g.quadraticCurveTo(lerp(x, ex, 0.5) + (rnd() - 0.5) * 40 * k, lerp(y, ey, 0.5), ex + (rnd() - 0.5) * 10 * k, ey); g.stroke();
        }
      }
      for (let i = 0; i < 9; i++) { const x = X(-60 + rnd() * 140), y = Z(-40 - rnd() * 120), a = (rnd() - 0.5) * 0.6; g.save(); g.translate(x, y); g.rotate(a); g.fillStyle = `rgba(40,6,4,${(0.3 + rnd() * 0.25).toFixed(2)})`; g.fillRect(-5 * k, -13 * k, 10 * k, 26 * k); g.restore(); }
      for (let i = 0; i < 260; i++) { const x = px + (rnd() - 0.5) * 300 * k, y = pz + (rnd() - 0.5) * 160 * k, s = (0.4 + rnd() * 1.6) * k; g.fillStyle = `rgba(${50 + rnd() * 30 | 0},6,5,${(0.4 + rnd() * 0.4).toFixed(2)})`; g.beginPath(); g.arc(x, y, s, 0, Math.PI * 2); g.fill(); }
    }
    if (drain) {
      const [dx, dz] = drain, x = X(dx), y = Z(dz), r = 11 * k;
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
  // Above the block, where it is seen (a point on the wall, x and y, to the
  // map: the face turned to you, so +x is to the map's left):
  const X = x => (WALL.w / 2 - x) * k, Y = y => (WALL.brick + BENCH.floor - y) * k;
  // mould: green-black in the joints and spreading from them, worst low
  for (let i = 0; i < 70; i++) { const x = rnd() * W, y = H * Math.pow(rnd(), 0.6), r = (4 + rnd() * 22) * k, gr = g.createRadialGradient(x, y, 0, x, y, r); gr.addColorStop(0, `rgba(24,34,18,${(0.25 + rnd() * 0.3).toFixed(2)})`); gr.addColorStop(1, 'rgba(24,34,18,0)'); g.fillStyle = gr; g.fillRect(x - r, y - r, 2 * r, 2 * r); }
  // blood flung up it from the work: a fine spray thick just over the
  // block, thinning upward, the drops drawn out upward as they struck;
  // here and there a heavy one run down
  for (let i = 0; i < 1300; i++) {
    const x = X((rnd() - 0.5) * 150), y = Y(Math.pow(rnd(), 1.8) * 52), s = (0.12 + Math.pow(rnd(), 3) * 1.2) * k;
    g.fillStyle = `rgba(${44 + rnd() * 40 | 0},${4 + rnd() * 6 | 0},4,${(0.45 + rnd() * 0.45).toFixed(2)})`;
    g.beginPath(); g.ellipse(x, y, s * 0.7, s * (1 + rnd() * 1.4), (rnd() - 0.5) * 0.5, 0, Math.PI * 2); g.fill();
  }
  for (let i = 0; i < 26; i++) {
    const x = X((rnd() - 0.5) * 140), y0 = Y(4 + rnd() * 44), l = (6 + rnd() * 30) * k, w = (0.25 + rnd() * 0.5) * k, rg = g.createLinearGradient(0, y0, 0, y0 + l);
    rg.addColorStop(0, 'rgba(70,6,5,0.85)'); rg.addColorStop(0.8, 'rgba(60,6,5,0.6)'); rg.addColorStop(1, 'rgba(60,6,5,0)');
    g.fillStyle = rg; g.fillRect(x - w / 2, y0, w, l); g.fillStyle = 'rgba(66,6,5,0.9)'; g.beginPath(); g.arc(x, y0 + l * 0.86, w * 0.9, 0, Math.PI * 2); g.fill();
  }
  // a hand, laid flat on the brick and dragged down it - twice
  const hand = (cx, cy, a, sc, alpha) => {
    for (let s = 0; s < 7; s++) {
      g.save(); g.translate(cx, cy + s * 2.2 * k * sc); g.rotate(a); g.scale(sc * k, sc * k);
      g.fillStyle = `rgba(${74 - s * 4},7,6,${(alpha * (s ? 0.32 - s * 0.03 : 1)).toFixed(3)})`;
      g.beginPath(); g.ellipse(0, 0, 4.4, 5.2, 0, 0, Math.PI * 2); g.fill();
      [[-3.4, -6.6, 0.95, 3.4, -0.25], [-1.2, -8.4, 0.95, 4.1, -0.08], [1.1, -8.5, 0.95, 4.2, 0.06], [3.2, -7.2, 0.85, 3.6, 0.2], [5.0, -1.2, 0.9, 3.2, 1.0]].forEach(([fx, fy, rw, rh, fa]) => { g.beginPath(); g.ellipse(fx, fy, rw, rh, fa, 0, Math.PI * 2); g.fill(); });
      g.restore();
    }
    // the fingers' trails, run on down
    for (let f = 0; f < 4; f++) { const x = cx + (-3.4 + f * 2.2) * sc * k, y0 = cy - 4 * sc * k, l = (14 + rnd() * 18) * k, rg = g.createLinearGradient(0, y0, 0, y0 + l); rg.addColorStop(0, `rgba(66,6,5,${(alpha * 0.6).toFixed(2)})`); rg.addColorStop(1, 'rgba(66,6,5,0)'); g.fillStyle = rg; g.fillRect(x - 0.5 * k, y0, k, l); }
  };
  hand(X(50), Y(42), 0.12, 1, 0.8);
  hand(X(-68), Y(31), -0.3, 0.95, 0.65);
  // a tally scratched in the brick over the sign: the scratches pale, their
  // floors dark
  const tx = X(-24), ty = Y(48);
  for (let gq = 0; gq < 5; gq++) {
    const gx = tx + gq * 9 * k;
    for (let m = 0; m < 5; m++) {
      const x0 = m < 4 ? gx + m * 1.6 * k : gx - 1.2 * k, y0 = m < 4 ? ty : ty + 1.2 * k, x1 = m < 4 ? x0 + (rnd() - 0.5) * 0.8 * k : gx + 6.8 * k, y1 = m < 4 ? ty + 6.4 * k : ty + 5.0 * k;
      g.strokeStyle = 'rgba(150,128,108,0.42)'; g.lineWidth = 0.45 * k; g.beginPath(); g.moveTo(x0, y0); g.lineTo(x1, y1); g.stroke();
      g.strokeStyle = 'rgba(20,10,6,0.55)'; g.lineWidth = 0.22 * k; g.beginPath(); g.moveTo(x0 + 0.2 * k, y0); g.lineTo(x1 + 0.2 * k, y1); g.stroke();
      hg.strokeStyle = 'rgba(30,30,30,0.9)'; hg.lineWidth = 0.5 * k; hg.beginPath(); hg.moveTo(x0, y0); hg.lineTo(x1, y1); hg.stroke();
    }
  }
  return { color, height };
}
// The cladding's paint, Burnished Slate, years on: each panel a shade off
// the next, chalked pale toward the top where the weather had it, grime
// down low, rust run down from every screw (screws: [u, v] where they are).
function metalTex(screws) {
  const k = 3.2, W = Math.round(WALL.w * k), H = Math.round((WALL.h - WALL.brick) * k);
  return K.canvasTex(W, H, (g) => {
    const rnd = seeded(43);
    g.fillStyle = '#3e4347'; g.fillRect(0, 0, W, H);
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
    // rust come through the paint in blooms, worst low and along the sill,
    // run down the flats
    for (let i = 0; i < 90; i++) { const x = rnd() * W, y = H * (0.35 + Math.pow(rnd(), 0.5) * 0.65), r = (3 + rnd() * 16) * k, gr = g.createRadialGradient(x, y, 0, x, y, r); gr.addColorStop(0, `rgba(104,44,16,${(0.35 + rnd() * 0.35).toFixed(2)})`); gr.addColorStop(0.7, 'rgba(84,36,14,0.2)'); gr.addColorStop(1, 'rgba(84,36,14,0)'); g.fillStyle = gr; g.fillRect(x - r, y - r, 2 * r, 2 * r); }
    for (let i = 0; i < 60; i++) { const x = rnd() * W, y0 = H * (0.3 + rnd() * 0.6), l = (8 + rnd() * 50) * k, w = (0.4 + rnd() * 1.2) * k, rg = g.createLinearGradient(0, y0, 0, y0 + l); rg.addColorStop(0, 'rgba(110,48,18,0.55)'); rg.addColorStop(1, 'rgba(110,48,18,0)'); g.fillStyle = rg; g.fillRect(x, y0, w, l); }
    // the work's cast-off: arcs of drops flung up off a swung blade, each
    // drop drawn out along its flight, smaller to its end; a few heavy
    // splashes run down the panels (a point on the wall, x and height, to
    // the map: the face turned to you, its top at the wall's)
    const X = x => (WALL.w / 2 - x) * k, Y = y => (WALL.h + BENCH.floor - y) * k;
    for (let a = 0; a < 6; a++) {
      const cx = X((rnd() - 0.5) * 150), cy = Y(30 + rnd() * 30), R = (40 + rnd() * 50) * k, a0 = -Math.PI * (0.15 + rnd() * 0.3), span = (0.5 + rnd() * 0.7) * (rnd() < 0.5 ? -1 : 1), n = 18 + Math.floor(rnd() * 22);
      for (let i = 0; i < n; i++) {
        const u = i / n, th = a0 + span * u, x = cx + Math.cos(th) * R, y = cy + Math.sin(th) * R * 0.8, s = (1.1 - u * 0.8) * (0.4 + rnd() * 0.6) * k;
        g.save(); g.translate(x, y); g.rotate(th + Math.PI / 2 * Math.sign(span)); g.fillStyle = `rgba(${60 + rnd() * 30 | 0},5,5,${(0.6 + rnd() * 0.35).toFixed(2)})`;
        g.beginPath(); g.ellipse(0, 0, s * 2.2, s * 0.7, 0, 0, Math.PI * 2); g.fill(); g.restore();
      }
    }
    for (let i = 0; i < 9; i++) {
      const x = X((rnd() - 0.5) * 140), y = Y(60 + rnd() * 70), r = (1.2 + rnd() * 2.4) * k;
      g.fillStyle = 'rgba(64,5,5,0.9)'; g.beginPath(); g.arc(x, y, r, 0, Math.PI * 2); g.fill();
      for (let s = 0; s < 3; s++) { const l = (10 + rnd() * 40) * k, w = (0.3 + rnd() * 0.6) * k, dx = (rnd() - 0.5) * r, rg = g.createLinearGradient(0, y, 0, y + l); rg.addColorStop(0, 'rgba(64,5,5,0.85)'); rg.addColorStop(1, 'rgba(64,5,5,0)'); g.fillStyle = rg; g.fillRect(x + dx - w / 2, y, w, l); }
    }
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
// ------------------------------------------------------------ the hogs
// A hog side, split down the spine and hung head down by its hind leg on
// a hook through the hock, the head off, the foreleg hanging below (built
// round, apart: see buildForeleg). Its outline as it hangs: x across
// (the spine's edge at -x, the belly's at +x), y down from the hock's top
// (cm, before HOG.s); the box its cut face's art covers, the bevel in it.
const HOG_OUT = [[-2.6, 0.4], [0.2, 1.2], [2.8, 0.2], [3.6, -3.2], [4.2, -6.5], [8.5, -11], [11.8, -16], [13.4, -23], [12.2, -31], [9.6, -38], [10.4, -45], [11.6, -52], [12.6, -60], [14.2, -67], [14.4, -74], [13.2, -82], [12.2, -86.4], [9.9, -88.4], [7.6, -86.4], [6.4, -84.2], [4.6, -84.6], [0.6, -86], [-3.4, -85.2], [-7.2, -83], [-10.2, -79.6], [-11.4, -72], [-10.6, -63], [-10.2, -50], [-10.6, -38], [-11.4, -29], [-11.2, -20], [-8.6, -12.5], [-4.6, -6.8], [-3.6, -3.2]];
const HOG_BOX = { x0: -14.4, x1: 17.4, y0: -92.0, y1: 4.2 };
// the outline traced smoothly (through the midpoints, each point a control)
function hogPath(c) {
  const P = HOG_OUT, n = P.length, mid = i => [(P[i][0] + P[(i + 1) % n][0]) / 2, (P[i][1] + P[(i + 1) % n][1]) / 2];
  const m0 = mid(n - 1);
  c.moveTo(m0[0], m0[1]);
  for (let i = 0; i < n; i++) { const m = mid(i); c.quadraticCurveTo(P[i][0], P[i][1], m[0], m[1]); }
}
// The side's body: the outline extruded, its edges rounded over (the
// skin), the cut face flat toward -z (as a sawn face is), mapped to the
// art's box so it reads from the front.
function hogGeo() {
  const s = new THREE.Shape(); hogPath(s);
  const { x0, x1, y0, y1 } = HOG_BOX, w = x1 - x0, h = y1 - y0;
  const uv = {
    generateTopUV(g, v, a, b, c) { return [a, b, c].map(i => new THREE.Vector2((x1 - v[i * 3]) / w, (v[i * 3 + 1] - y0) / h)); },
    generateSideWallUV(g, v, a, b, c, d) { return [a, b, c, d].map(i => new THREE.Vector2((v[i * 3] + v[i * 3 + 1]) / 18, v[i * 3 + 2] / 18)); }
  };
  const geo = new THREE.ExtrudeGeometry(s, { depth: 3.0, bevelEnabled: true, bevelThickness: 2.8, bevelSize: 1.4, bevelSegments: 5, curveSegments: 8, UVGenerator: uv });
  geo.translate(0, 0, -1.5);
  return geo;
}
// The foreleg, hanging from the shoulder's foot: skin over a tapered round,
// bent a little at the knee, down to the trotter - two toes of dark horn,
// split, and the dew claws behind. (In the side's own units; its lowest
// point is where the drip lets go: see TIP.)
function buildForeleg(skin, horn) {
  const g = new THREE.Group();
  const pts = [];
  for (let i = 0; i <= 12; i++) { const t = i / 12, r = lerp(2.6, 1.55, t) * (1 + 0.12 * Math.exp(-Math.pow((t - 0.45) / 0.08, 2))); pts.push(new THREE.Vector2(r, -t * 11)); }
  const leg = new THREE.Mesh(new THREE.LatheGeometry(pts, 14), skin);
  leg.position.set(9.9, -86.2, 0); leg.rotation.z = -0.08; leg.castShadow = true; leg.receiveShadow = true; g.add(leg);
  const toe = new THREE.SphereGeometry(1, 12, 8); toe.scale(0.85, 1.9, 1.15);
  [-1, 1].forEach(s => { const m = new THREE.Mesh(toe, horn); m.position.set(9.9 - 0.95 + s * 0.85, -98.6, -0.2); m.rotation.z = s * 0.1; m.castShadow = true; g.add(m); });
  const claw = new THREE.SphereGeometry(0.45, 8, 6); claw.scale(1, 1.6, 1);
  [-1, 1].forEach(s => { const m = new THREE.Mesh(claw, horn); m.position.set(9.0 + s * 1.2, -95.6, 1.3); g.add(m); });
  return g;
}
// The cut face in relief, laid over the slab's flat cap: the ham's and the
// shoulder's muscle standing out, each rib a ridge under the membrane with
// the lean sunk between, the split spine's column and the backfat slumped
// beside it, a little lumpiness all over - nothing at the edge, so it
// meets the slab there, and pressed flat under the tag. (A grid over the art's box, only what is inside
// the outline, mapped as the cap is.)
function hogFace(zCap) {
  const { x0, x1, y0, y1 } = HOG_BOX, w = x1 - x0, h = y1 - y0, step = 0.7;
  const nx = Math.ceil(w / step), ny = Math.ceil(h / step), P = HOG_OUT;
  const insideOf = (x, y) => { let c = false; for (let i = 0, j = P.length - 1; i < P.length; j = i++) { const [xi, yi] = P[i], [xj, yj] = P[j]; if ((yi > y) !== (yj > y) && x < (xj - xi) * (y - yi) / (yj - yi) + xi) c = !c; } return c; };
  const edgeOf = (x, y) => { let d = Infinity; for (let i = 0, j = P.length - 1; i < P.length; j = i++) { const [ax, ay] = P[j], [bx, by] = P[i], vx = bx - ax, vy = by - ay, t = clamp01(((x - ax) * vx + (y - ay) * vy) / (vx * vx + vy * vy)); d = Math.min(d, Math.hypot(x - ax - vx * t, y - ay - vy * t)); } return d; };
  // (the ribs' lines, as the art draws them)
  const ribs = [];
  for (let i = 0; i < 12; i++) {
    const ys = -45 - i * 3.0, yb = ys - 6.5 - i * 0.25, xb = 9.2 + Math.min(4.2, i * 0.45), pts = [];
    for (let s = 0; s <= 16; s++) { const t = s / 16, a = (1 - t) * (1 - t), b = 2 * (1 - t) * t, c = t * t; pts.push([a * -5.6 + b * 2.5 + c * xb, a * ys + b * (ys - 2.4) + c * yb]); }
    ribs.push(pts);
  }
  const ribD = (x, y) => { let d = Infinity; for (const pts of ribs) for (let s = 1; s < pts.length; s++) { const [ax, ay] = pts[s - 1], [bx, by] = pts[s], vx = bx - ax, vy = by - ay, t = clamp01(((x - ax) * vx + (y - ay) * vy) / (vx * vx + vy * vy)); d = Math.min(d, Math.hypot(x - ax - vx * t, y - ay - vy * t)); } return d; };
  const lump = vnoise(613), g2 = (x, y, cx, cy, sx, sy) => Math.exp(-((x - cx) * (x - cx)) / (2 * sx * sx) - ((y - cy) * (y - cy)) / (2 * sy * sy));
  const height = (x, y) => {
    const cage = x > -5.8 && y < -43 && y > -84 ? sstep(-5.8, -4.6, x) : 0;
    let z = 1.9 * g2(x, y, 3, -18, 6, 9) + 1.3 * g2(x, y, 3, -70, 6, 7.5) + 0.8 * g2(x, y, -3.5, -36, 2.4, 9);
    z += cage * (0.42 * Math.exp(-Math.pow(ribD(x, y) / 0.55, 2)) - 0.25);
    z += 0.55 * sstep(-9.6, -8.6, x) * sstep(-4.9, -5.6, x) + 0.6 * sstep(-12, -10.4, x) * sstep(-8.6, -9.4, x);
    z += (fbm(lump, x * 0.35, y * 0.2, 3) - 0.5) * 0.5;
    // (pressed flat under the tag, where it is nailed)
    return z * sstep(0, 2.2, edgeOf(x, y)) * (1 - 0.9 * g2(x, y, HOG.tag[0] - 4, HOG.tag[1], 10, 6));
  };
  const pos = [], uv = [], idx = [], id = new Int32Array((nx + 1) * (ny + 1)).fill(-1);
  for (let j = 0; j <= ny; j++) for (let i = 0; i <= nx; i++) {
    const x = x0 + i * step, y = y0 + j * step;
    if (!insideOf(x, y) && edgeOf(x, y) > step * 1.5) continue;
    id[j * (nx + 1) + i] = pos.length / 3;
    pos.push(x, y, zCap - (insideOf(x, y) ? height(x, y) : 0) - 0.04);
    uv.push((x1 - x) / w, (y - y0) / h);
  }
  for (let j = 0; j < ny; j++) for (let i = 0; i < nx; i++) {
    const a = id[j * (nx + 1) + i], b = id[j * (nx + 1) + i + 1], c = id[(j + 1) * (nx + 1) + i], d = id[(j + 1) * (nx + 1) + i + 1];
    if (a < 0 || b < 0 || c < 0 || d < 0) continue;
    const cx = x0 + (i + 0.5) * step, cy = y0 + (j + 0.5) * step;
    if (!insideOf(cx, cy)) continue;
    idx.push(a, c, b, b, c, d);
  }
  const geo = new THREE.BufferGeometry();
  geo.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3));
  geo.setAttribute('uv', new THREE.Float32BufferAttribute(uv, 2));
  geo.setIndex(idx);
  geo.computeVertexNormals();
  return geo;
}
// The cut face, as the saw left it, hung a day: the backfat and the skin
// round the edge, the split spine down the back (each vertebra's body
// halved, the canal, the cord), the ribs fanning from it to the breastbone
// under their sheen of membrane, the ham's muscle and the cut pelvis, the
// bacon's layers in the belly, the shoulder, the neck's raw cut and the
// foreleg's skin and trotter; blood drained down it to the neck and
// clotted there; the inspector's purple stamp on the fat. (Colour, height
// and roughness, 12 to the cm, drawn in the outline's own coordinates.)
function hogCut(seed) {
  const { x0, x1, y0, y1 } = HOG_BOX, k = 12, W = Math.round((x1 - x0) * k), H = Math.round((y1 - y0) * k);
  const mk = () => { const c = document.createElement('canvas'); c.width = W; c.height = H; return c; };
  const color = mk(), height = mk(), rough = mk(), mask = mk();
  const C = color.getContext('2d'), Hh = height.getContext('2d'), R = rough.getContext('2d'), M = mask.getContext('2d');
  const rnd = seeded(seed), all = [C, Hh, R, M];
  all.forEach(c => c.setTransform(-k, 0, 0, -k, x1 * k, y1 * k));
  const grey = v => `rgb(${v * 255 | 0},${v * 255 | 0},${v * 255 | 0})`;
  const shape = (c, style, path, blur = 0) => { c.filter = blur ? `blur(${blur}px)` : 'none'; c.fillStyle = style; c.beginPath(); path(c); c.fill(); c.filter = 'none'; };
  const line = (c, style, lw, path, blur = 0) => { c.filter = blur ? `blur(${blur}px)` : 'none'; c.strokeStyle = style; c.lineWidth = lw; c.lineCap = 'round'; c.beginPath(); path(c); c.stroke(); c.filter = 'none'; };
  const box = (c, style) => { c.fillStyle = style; c.fillRect(x0 - 1, y0 - 1, x1 - x0 + 2, y1 - y0 + 2); };
  const inside = c => { c.save(); c.beginPath(); hogPath(c); c.clip(); };
  // the outline's mask (what is cut face), and under everything the skin
  box(C, '#c8a090'); box(Hh, grey(0.5)); box(R, grey(0.55));
  shape(M, '#fff', hogPath);
  // the meat: the ham's inner face lighter at the top, darker and bloodier
  // down to the neck; the muscles' lobes laid over it, soft
  const meat = C.createLinearGradient(0, 2, 0, -86); meat.addColorStop(0, '#93322b'); meat.addColorStop(0.4, '#7e2621'); meat.addColorStop(0.75, '#6a1a18'); meat.addColorStop(1, '#4a0c0c');
  shape(C, meat, hogPath); shape(Hh, grey(0.45), hogPath); shape(R, grey(0.34), hogPath);
  inside(C);
  [[2, -14, 6, 7, '#a2423a', 0.35], [-3, -27, 4, 8, '#6c1c1a', 0.4], [7, -24, 5, 6, '#8a2c28', 0.35], [1, -40, 6, 5, '#9a3a32', 0.25], [-2, -60, 6, 9, '#7a2420', 0.3], [5, -78, 7, 5, '#5a1414', 0.45]].forEach(([x, y, rx, ry, col, a]) => {
    C.globalAlpha = a; shape(C, col, c => c.ellipse(x, y, rx, ry, (rnd() - 0.5) * 0.6, 0, Math.PI * 2), 14); C.globalAlpha = 1;
  });
  // (the tenderloin along the spine through the loin, deep and dark)
  C.globalAlpha = 0.75; shape(C, '#561010', c => { c.moveTo(-6, -26); c.bezierCurveTo(-2.2, -31, -2.0, -41, -5.0, -48); c.lineTo(-6.4, -47); c.closePath(); }, 3); C.globalAlpha = 1;
  // the belly flap: pinker, its layers of fat and lean along its edge
  for (let j = 0; j < 6; j++) {
    const off = 1.0 + j * 1.05, fat = j % 2 === 0;
    C.globalAlpha = fat ? 0.55 : 0.35;
    line(C, fat ? '#e4c8b6' : '#7a2220', fat ? 0.55 : 0.7, c => { c.moveTo(10.2 - off, -36); c.bezierCurveTo(11.0 - off, -46, 12.2 - off, -56, 13.6 - off, -68); }, 1.6);
  }
  C.globalAlpha = 1;
  C.restore();
  // the fat: the backfat thick along the spine's edge, a thin rim of it
  // round the rest, the skin a line at the very edge
  inside(C);
  const bf = C.createLinearGradient(-11.8, 0, -8.2, 0); bf.addColorStop(0, 'rgba(234,216,198,1)'); bf.addColorStop(0.7, 'rgba(228,206,188,0.9)'); bf.addColorStop(1, 'rgba(228,206,188,0)');
  C.filter = 'blur(1.5px)'; C.fillStyle = bf; C.fillRect(-12.5, -86, 5, 90); C.filter = 'none';
  C.restore();
  inside(Hh); Hh.fillStyle = grey(0.56); Hh.fillRect(-12.5, -86, 3.6, 90); Hh.restore();
  inside(R); R.fillStyle = grey(0.5); R.fillRect(-12.5, -86, 3.6, 90); R.restore();
  inside(C); line(C, 'rgba(212,186,168,0.72)', 1.3, hogPath, 1.4); line(C, 'rgba(150,104,92,0.9)', 0.35, hogPath, 0.6); C.restore();
  // the ribs: from the spine down and across to the breastbone - pale bars
  // under the membrane, the lean dark between - and the membrane's glaze
  const ribs = [];
  for (let i = 0; i < 12; i++) {
    const ys = -45 - i * 3.0, yb = ys - 6.5 - i * 0.25, xb = 9.2 + Math.min(4.2, i * 0.45), w = 0.85 + rnd() * 0.25;
    ribs.push([ys, yb, xb]);
    const path = c => { c.moveTo(-5.6, ys); c.quadraticCurveTo(2.5, ys - 2.4, xb, yb); };
    line(C, 'rgba(70,12,10,0.4)', w + 1.2, path, 2.6);
    line(C, 'rgba(206,166,152,0.62)', w, path, 2.0);
    line(Hh, grey(0.7), w + 0.4, path, 2);
  }
  for (let i = 0; i < 6; i++) { const y = -58 - i * 3.6; shape(C, 'rgba(222,206,190,0.9)', c => c.ellipse(11.6 + i * 0.25, y, 0.85, 1.4, 0.1, 0, Math.PI * 2), 1.2); shape(Hh, grey(0.8), c => c.ellipse(11.6 + i * 0.25, y, 0.9, 1.5, 0.1, 0, Math.PI * 2), 1); }
  const cage = c => { c.moveTo(-5.6, -44); c.lineTo(10.4, -48); c.lineTo(13.6, -82); c.lineTo(-5.6, -82); c.closePath(); };
  C.save(); C.beginPath(); cage(C); C.clip();
  for (let i = 0; i < 22; i++) { const x = -4 + rnd() * 16, y = -46 - rnd() * 34, r = 2 + rnd() * 4, g = C.createRadialGradient(x, y, 0, x, y, r); g.addColorStop(0, 'rgba(226,218,236,0.2)'); g.addColorStop(1, 'rgba(226,218,236,0)'); C.fillStyle = g; C.fillRect(x - r, y - r, 2 * r, 2 * r); }
  C.restore();
  R.save(); R.beginPath(); cage(R); R.clip(); R.fillStyle = grey(0.16); R.fillRect(-6, -84, 22, 42); R.restore();
  // the cut pelvis in the ham: the aitch bone, white, its sponge red
  const aitch = c => { c.moveTo(-7.4, -15); c.bezierCurveTo(-4.4, -16, -3.2, -21, -4.6, -25); c.bezierCurveTo(-5.4, -28, -7.0, -29, -7.8, -27); c.closePath(); };
  shape(C, '#e2d0bc', aitch, 0.8); shape(Hh, grey(0.88), aitch, 0.8); shape(R, grey(0.42), aitch);
  C.globalAlpha = 0.6; shape(C, '#a04434', c => c.ellipse(-5.8, -21, 0.8, 2.4, 0.3, 0, Math.PI * 2), 1.2); C.globalAlpha = 1;
  // the split spine: each vertebra's body halved (bone round a red sponge),
  // the discs between, the canal behind with the cord in it, the spines'
  // stubs out into the backfat
  for (let y = -5; y > -84;) {
    const vh = 3.1 + rnd() * 0.9, vw = 2.9 + rnd() * 0.4, cx = -6.95 + (rnd() - 0.5) * 0.3;
    const v = c => { c.moveTo(cx - vw / 2 + 0.6, y); c.bezierCurveTo(cx - vw / 2 - 0.1, y - 0.2, cx - vw / 2 - 0.2, y - vh + 0.3, cx - vw / 2 + 0.5, y - vh); c.lineTo(cx + vw / 2 - 0.4, y - vh - 0.1); c.bezierCurveTo(cx + vw / 2 + 0.2, y - vh + 0.4, cx + vw / 2 + 0.1, y - 0.3, cx + vw / 2 - 0.5, y + 0.1); c.closePath(); };
    shape(C, '#c6a28e', v, 1.0); shape(Hh, grey(0.8), v, 0.8); shape(R, grey(0.4), v);
    // (the halved body: its sponge red-brown inside a thin cortex)
    C.save(); C.beginPath(); v(C); C.clip();
    shape(C, 'rgba(150,68,54,0.85)', c => { if (c.roundRect) c.roundRect(cx - vw / 2 + 0.3, y - vh + 0.28, vw - 0.6, vh - 0.56, 0.45); else c.rect(cx - vw / 2 + 0.3, y - vh + 0.28, vw - 0.6, vh - 0.56); }, 1.6);
    for (let s = 0; s < 46; s++) { C.fillStyle = `rgba(${rnd() > 0.45 ? '88,24,18' : '190,136,110'},${(0.3 + rnd() * 0.4).toFixed(2)})`; C.beginPath(); C.arc(cx + (rnd() - 0.5) * vw * 0.8, y - vh / 2 + (rnd() - 0.5) * vh * 0.8, 0.06 + rnd() * 0.14, 0, Math.PI * 2); C.fill(); }
    C.restore();
    // (the disc below it, grey-pink gristle)
    shape(C, 'rgba(158,112,104,0.85)', c => c.ellipse(cx, y - vh - 0.35, vw / 2, 0.4, 0, 0, Math.PI * 2), 0.9);
    const sp = c => { c.moveTo(cx - vw / 2 - 0.1, y - vh * 0.3); c.lineTo(-11.0, y - vh * 0.15); c.lineTo(-11.0, y - vh * 0.42); c.lineTo(cx - vw / 2 - 0.1, y - vh * 0.75); c.closePath(); };
    shape(C, 'rgba(214,194,176,0.8)', sp, 1.0); shape(Hh, grey(0.76), sp, 0.8);
    y -= vh + 0.75;
  }
  line(C, '#3e0808', 0.85, c => { c.moveTo(-9.0, -2); c.lineTo(-9.0, -84); }, 0.6);
  line(C, 'rgba(226,200,176,0.75)', 0.3, c => { c.moveTo(-9.0, -2); c.lineTo(-9.0, -84); }, 0.4);
  // the shoulder blade, cut through, white in the muscle
  const blade = c => { c.moveTo(-3, -66); c.bezierCurveTo(2, -67, 7, -72, 9.6, -77); c.lineTo(9.0, -78.2); c.bezierCurveTo(6, -74, 1, -69.2, -3.2, -67.2); c.closePath(); };
  shape(C, '#dccab8', blade, 0.8); shape(Hh, grey(0.8), blade, 0.8);
  // the foreleg's root: skin round the shoulder's foot, where the leg hangs
  shape(C, 'rgba(196,154,134,0.9)', c => c.ellipse(9.9, -86.6, 2.6, 2.0, 0, 0, Math.PI * 2), 1.6);
  // ---- the meat's own grain, pass by pixel: the fibres run down its length,
  // fine speckle, flecks of fat marbled through the lean, blood-dark
  // patches where it has soaked; the bone and fat get only the speckle
  {
    C.setTransform(1, 0, 0, 1, 0, 0); Hh.setTransform(1, 0, 0, 1, 0, 0);
    const ci = C.getImageData(0, 0, W, H), hi = Hh.getImageData(0, 0, W, H), mi = M.getImageData(0, 0, W, H).data;
    const fib = vnoise(seed + 1), fine = vnoise(seed + 2), marb = vnoise(seed + 3), soak = vnoise(seed + 4);
    const d = ci.data, hd = hi.data;
    for (let j = 0; j < H; j++) for (let i = 0; i < W; i++) {
      const p = (j * W + i) * 4;
      if (mi[p + 3] < 8) continue;
      const x = i / k, y = j / k, r = d[p], g = d[p + 1], b = d[p + 2];
      const lean = clamp01((r - g * 1.9) / 60);
      const f = fbm(fib, x * 2.2, y * 0.3, 3) - 0.5, s = fine(x * 9, y * 9) - 0.5, mb = fbm(marb, x * 3.4, y * 1.1, 3), sk = fbm(soak, x * 0.25, y * 0.09, 3);
      let m = 1 + f * 0.26 * lean + s * 0.1;
      m *= 1 - 0.32 * sstep(0.5, 0.75, sk) * lean;
      let rr = r * m, gg = g * m, bb = b * m;
      const fl = sstep(0.69, 0.75, mb) * 0.4 * lean;
      rr = lerp(rr, 226, fl); gg = lerp(gg, 198, fl); bb = lerp(bb, 182, fl);
      d[p] = rr; d[p + 1] = gg; d[p + 2] = bb;
      hd[p] = hd[p + 1] = hd[p + 2] = Math.max(0, Math.min(255, hd[p] + (f * 40 + s * 18) * (0.4 + lean)));
    }
    C.putImageData(ci, 0, 0); Hh.putImageData(hi, 0, 0);
    C.setTransform(-k, 0, 0, -k, x1 * k, y1 * k); Hh.setTransform(-k, 0, 0, -k, x1 * k, y1 * k);
  }
  // the neck's raw cut: ragged, dark, clotted
  inside(C);
  for (let i = 0; i < 70; i++) { const x = -9 + rnd() * 17, y = -86 + rnd() * 7, r = 0.3 + rnd() * 1.3; shape(C, `rgba(${30 + rnd() * 40 | 0},4,4,${(0.5 + rnd() * 0.4).toFixed(2)})`, c => c.ellipse(x, y, r, r * (0.6 + rnd() * 0.6), rnd() * 3, 0, Math.PI * 2), 0.8); }
  // the blood drained down it: dark old runs from high up, fresh red at
  // their feet, glossy, clots pooled at the neck
  for (let i = 0; i < 16; i++) {
    const x = -6 + rnd() * 18, yt = -6 - rnd() * 54, l = 8 + rnd() * 40, w = 0.18 + Math.pow(rnd(), 2) * 0.8, wob = (rnd() - 0.5) * 1.6;
    const g = C.createLinearGradient(0, yt, 0, yt - l); g.addColorStop(0, 'rgba(40,5,5,0)'); g.addColorStop(0.25, 'rgba(50,5,5,0.65)'); g.addColorStop(1, 'rgba(104,8,8,0.88)');
    C.filter = 'blur(0.5px)'; C.strokeStyle = g; C.lineWidth = w; C.lineCap = 'round';
    C.beginPath(); C.moveTo(x, yt); C.bezierCurveTo(x + wob, yt - l * 0.35, x - wob * 0.6, yt - l * 0.7, x + wob * 0.3, yt - l); C.stroke();
    C.fillStyle = 'rgba(96,8,8,0.9)'; C.beginPath(); C.arc(x + wob * 0.3, yt - l, w * 0.75, 0, Math.PI * 2); C.fill(); C.filter = 'none';
    R.strokeStyle = grey(0.1); R.lineWidth = w; R.beginPath(); R.moveTo(x, yt); R.bezierCurveTo(x + wob, yt - l * 0.35, x - wob * 0.6, yt - l * 0.7, x + wob * 0.3, yt - l); R.stroke();
  }
  C.restore();
  // the inspector's stamps, purple, on the fat of the ham and the shoulder
  // (drawn the right way round for the face's view), struck unevenly
  all.forEach(c => c.setTransform(1, 0, 0, 1, 0, 0));
  const at = (x, y) => [(x1 - x) * k, (y1 - y) * k];
  [[-10.6, -14, 0.25], [-10.8, -70, -0.15], [12.6, -24, 0.4]].forEach(([x, y, a]) => {
    const [px, py] = at(x, y), st = document.createElement('canvas'); st.width = 80; st.height = 50;
    const s = st.getContext('2d');
    s.translate(40, 25); s.strokeStyle = s.fillStyle = '#4a2a7a'; s.lineWidth = 3; s.beginPath(); s.ellipse(0, 0, 34, 20, 0, 0, Math.PI * 2); s.stroke();
    s.font = '600 15px Oswald, Impact, sans-serif'; s.textAlign = 'center'; s.fillText('W.T.G.F.', 0, -2); s.font = '11px "Special Elite", monospace'; s.fillText(`INSP'D ${7 + (seed % 5)}`, 0, 12);
    // (where the ink did not take)
    s.setTransform(1, 0, 0, 1, 0, 0); s.globalCompositeOperation = 'destination-out';
    for (let i = 0; i < 160; i++) { s.globalAlpha = 0.3 + rnd() * 0.7; s.beginPath(); s.arc(rnd() * 80, rnd() * 50, 0.6 + rnd() * 2.2, 0, Math.PI * 2); s.fill(); }
    C.save(); C.translate(px, py); C.rotate(Math.PI / 2 + a); C.globalAlpha = 0.55 + rnd() * 0.2; C.filter = 'blur(0.5px)'; C.drawImage(st, -40, -25); C.restore();
  });
  return { color, height, rough };
}
// the skin of the sides, scalded and scraped: pale, veined, bruised,
// bristle stubble, dirt and blood smeared (tiles)
function hogSkin() {
  const N = 256, rnd = seeded(211), vn = vnoise(13, 6, 6), br = vnoise(17, 4, 4);
  const s = surface(N, N, (x, y, o) => {
    const u = x / N, v = y / N, n = fbm(vn, u * 6, v * 6, 4), b = sstep(0.62, 0.75, fbm(br, u * 4, v * 4, 3));
    mix3(o, [184, 146, 132], [110, 48, 52], b * 0.7);
    o.r *= 0.9 + n * 0.2; o.g *= 0.88 + n * 0.2; o.b *= 0.9 + n * 0.2;
    o.h = 0.5 + (n - 0.5) * 0.2; o.k = 0.55 - b * 0.1;
  });
  const g = s.color.getContext('2d'), hg = s.height.getContext('2d');
  for (let i = 0; i < 40; i++) { g.strokeStyle = `rgba(110,110,150,${(0.1 + rnd() * 0.15).toFixed(2)})`; g.lineWidth = 0.6; g.beginPath(); let x = rnd() * N, y = rnd() * N; g.moveTo(x, y); for (let j = 0; j < 6; j++) { x += (rnd() - 0.5) * 30; y += (rnd() - 0.5) * 30; g.lineTo(x, y); } g.stroke(); }
  for (let i = 0; i < 900; i++) { const x = rnd() * N, y = rnd() * N; g.fillStyle = 'rgba(60,40,30,0.4)'; g.fillRect(x, y, 1, 1); hg.fillStyle = 'rgba(255,255,255,0.6)'; hg.fillRect(x, y, 1, 1); }
  for (let i = 0; i < 22; i++) { const x = rnd() * N, y = rnd() * N, r = 10 + rnd() * 34, gr = g.createRadialGradient(x, y, 0, x, y, r); gr.addColorStop(0, `rgba(${rnd() > 0.4 ? '70,8,8' : '46,36,28'},${(0.4 + rnd() * 0.3).toFixed(2)})`); gr.addColorStop(1, 'rgba(0,0,0,0)'); g.fillStyle = gr; g.fillRect(x - r, y - r, 2 * r, 2 * r); }
  for (let i = 0; i < 18; i++) { const x = rnd() * N, y0 = rnd() * N, l = 20 + rnd() * 90, w = 1 + rnd() * 3, gr = g.createLinearGradient(0, y0, 0, y0 + l); gr.addColorStop(0, 'rgba(66,6,6,0.75)'); gr.addColorStop(1, 'rgba(66,6,6,0)'); g.fillStyle = gr; g.fillRect(x, y0, w, l); }
  return surfaceTex(s, 1.2, 1, true);
}
// A tin tag, as a meat packer's: galvanised sheet gone to rust at its
// edges and round its nail, struck with the house's W.T.G.F., a lot
// number and the platform's initials big; bent where it was nailed into
// the meat. A spent one is rust over, and punched. (10 x 6.6, 26 to the cm;
// hung at s.)
const TIN = { w: 10, h: 6.6, r: 0.7, nail: 0.75, s: 1.45 };
function tinArt(card, spent, n) {
  const U = 26, W = TIN.w * U, H = TIN.h * U;
  const mk = () => { const c = document.createElement('canvas'); c.width = W; c.height = H; return c; };
  const color = mk(), height = mk(), g = color.getContext('2d'), hg = height.getContext('2d');
  const rnd = seeded(K.hash(card.id) + (spent ? 7 : 0));
  g.fillStyle = '#9da19e'; g.fillRect(0, 0, W, H);
  // the spangle of the galvanising
  for (let i = 0; i < 90; i++) { const x = rnd() * W, y = rnd() * H, r = 4 + rnd() * 14, v = 140 + rnd() * 40; g.fillStyle = `rgb(${v},${v + 3},${v + 1})`; g.beginPath(); for (let s = 0; s < 6; s++) { const a = s / 6 * 6.28 + rnd() * 0.4; g.lineTo(x + Math.cos(a) * r, y + Math.sin(a) * r); } g.closePath(); g.fill(); }
  for (let i = 0; i < 60; i++) { const x = rnd() * W, y = rnd() * H, l = 6 + rnd() * 50, a = (rnd() - 0.5) * 2.4; g.strokeStyle = `rgba(${rnd() > 0.5 ? '230,232,228' : '40,40,38'},${(0.15 + rnd() * 0.3).toFixed(2)})`; g.lineWidth = 0.8; g.beginPath(); g.moveTo(x, y); g.lineTo(x + Math.cos(a) * l, y + Math.sin(a) * l); g.stroke(); }
  hg.fillStyle = '#808080'; hg.fillRect(0, 0, W, H);
  // rust: come through where the zinc has gone - in from the edges and
  // round the nail, all over a spent one - granular, dark brown to orange
  {
    const id = g.getImageData(0, 0, W, H), d = id.data, rn = vnoise(K.hash(card.id) % 997 + 3), gn = vnoise(77);
    for (let j = 0; j < H; j++) for (let i = 0; i < W; i++) {
      const p = (j * W + i) * 4, e = Math.min(i, W - i, j, H - j) / U, dn = Math.hypot(i - W / 2, j - TIN.nail * U) / U;
      const f = fbm(rn, i / 14, j / 14, 4), grain = gn(i / 2.2, j / 2.2);
      const reach = spent ? 0.75 : sstep(1.8, 0.2, e) * 0.55 + sstep(1.5, 0.3, dn) * 0.55 + 0.1;
      const a = sstep(0.66 - reach * 0.45, 0.74 - reach * 0.45, f + (grain - 0.5) * 0.16);
      if (a <= 0) continue;
      const tone = clamp01((f - 0.3) * 2.2 + (grain - 0.5) * 0.6);
      d[p] = lerp(d[p], lerp(62, 150, tone), a); d[p + 1] = lerp(d[p + 1], lerp(28, 72, tone), a); d[p + 2] = lerp(d[p + 2], lerp(14, 28, tone), a);
    }
    g.putImageData(id, 0, 0);
  }
  // blood: a smear across it, a thumb's worth
  for (let i = 0; i < 3; i++) { const x = rnd() * W, y = rnd() * H, r = 6 + rnd() * 16; g.fillStyle = `rgba(70,6,6,${(0.35 + rnd() * 0.3).toFixed(2)})`; g.beginPath(); g.ellipse(x, y, r * 1.6, r, rnd() * 3, 0, Math.PI * 2); g.fill(); }
  // the struck lettering, sunk, its floor filled with grime
  const strike = (t, font, x, y, maxW) => {
    g.font = font; const w = g.measureText(t).width, s = w > maxW ? maxW / w : 1;
    [[g, 'rgba(235,236,230,0.6)', 1.2], [g, '#1c1a16', 0], [hg, '#202020', 0]].forEach(([c, st, d]) => { c.save(); c.translate(x + d, y + d); c.scale(s, 1); c.font = font; c.textAlign = 'center'; c.fillStyle = st; c.fillText(t, 0, 0); c.restore(); });
  };
  strike('W.T.G.F.', '600 26px Oswald, Impact, sans-serif', W * 0.25, 52, W * 0.36);
  strike(`LOT ${String(n + 1).padStart(2, '0')}`, '22px "Special Elite", monospace', W * 0.76, 52, W * 0.36);
  strike(card.initials, '700 96px Oswald, Impact, sans-serif', W / 2, H - 22, W * 0.8);
  // the nail's hole
  g.fillStyle = '#100c08'; g.beginPath(); g.arc(W / 2, TIN.nail * U, 6, 0, Math.PI * 2); g.fill();
  if (spent) {
    // (punched: a star struck through it, its burr bright)
    const px = W * 0.82, py = H * 0.7; g.beginPath(); for (let i = 0; i < 10; i++) { const a = -Math.PI / 2 + i * Math.PI / 5, r = i % 2 ? 7 : 16; g[i ? 'lineTo' : 'moveTo'](px + Math.cos(a) * r, py + Math.sin(a) * r); } g.closePath();
    g.strokeStyle = 'rgba(220,210,190,0.8)'; g.lineWidth = 2; g.stroke(); g.fillStyle = '#0a0806'; g.fill();
  }
  return { color, height };
}
// the tag's sheet: a rounded oblong with its nail hole, bent a little
// round the meat it is nailed to; its face to -z, the origin at its middle
function tinGeo() {
  const { w, h, r } = TIN, s = new THREE.Shape();
  s.moveTo(-w / 2 + r, -h / 2); s.lineTo(w / 2 - r, -h / 2); s.quadraticCurveTo(w / 2, -h / 2, w / 2, -h / 2 + r); s.lineTo(w / 2, h / 2 - r); s.quadraticCurveTo(w / 2, h / 2, w / 2 - r, h / 2);
  s.lineTo(-w / 2 + r, h / 2); s.quadraticCurveTo(-w / 2, h / 2, -w / 2, h / 2 - r); s.lineTo(-w / 2, -h / 2 + r); s.quadraticCurveTo(-w / 2, -h / 2, -w / 2 + r, -h / 2);
  const hole = new THREE.Path(); hole.absarc(0, h / 2 - TIN.nail, 0.22, 0, Math.PI * 2, true); s.holes.push(hole);
  const uv = { generateTopUV(g, v, a, b, c) { return [a, b, c].map(i => new THREE.Vector2((v[i * 3] + w / 2) / w, (v[i * 3 + 1] + h / 2) / h)); }, generateSideWallUV() { return [0, 0, 0, 0].map(() => new THREE.Vector2(0.5, 0.5)); } };
  const geo = new THREE.ExtrudeGeometry(s, { depth: 0.12, bevelEnabled: false, curveSegments: 6, UVGenerator: uv });
  geo.translate(0, 0, -0.06); geo.rotateY(Math.PI);
  const p = geo.attributes.position;
  for (let i = 0; i < p.count; i++) { const x = p.getX(i); p.setZ(i, p.getZ(i) + 0.1 * (x / (w / 2)) * (x / (w / 2))); }
  geo.computeVertexNormals();
  return geo;
}

// The flies: bluebottles, green-black with a metal glint, circling the meat
// and the blood, fast, never still for long. (Each about a point it keeps to.)
function buildFlies(n) {
  const geo = new THREE.SphereGeometry(0.2, 6, 4); geo.scale(1, 0.8, 1.6);
  const m = new THREE.MeshStandardMaterial({ color: 0x1c2a22, metalness: 0.85, roughness: 0.28 });
  const inst = new THREE.InstancedMesh(geo, m, n);
  inst.frustumCulled = false;
  return inst;
}
// blood's own materials: a falling drop, a splash, a pool on the block
const bloodMat = () => new THREE.MeshPhysicalMaterial({ color: 0x3a0405, roughness: 0.1, clearcoat: 1, clearcoatRoughness: 0.04 });
function poolTex() {
  return K.canvasTex(256, 256, (g, W) => {
    const rnd = seeded(5), c = W / 2;
    g.clearRect(0, 0, W, W);
    g.fillStyle = 'rgba(52,4,4,0.95)';
    g.beginPath(); for (let i = 0; i <= 40; i++) { const a = i / 40 * 6.28, r = c * (0.62 + rnd() * 0.22); g.lineTo(c + Math.cos(a) * r, c + Math.sin(a) * r); } g.closePath(); g.fill();
    for (let i = 0; i < 12; i++) { const a = rnd() * 6.28, r = c * (0.75 + rnd() * 0.2), s = 4 + rnd() * 10; g.beginPath(); g.arc(c + Math.cos(a) * r, c + Math.sin(a) * r, s, 0, 6.28); g.fill(); }
    const gr = g.createRadialGradient(c * 0.85, c * 0.85, 0, c, c, c * 0.8); gr.addColorStop(0, 'rgba(120,14,12,0.6)'); gr.addColorStop(1, 'rgba(120,14,12,0)'); g.fillStyle = gr; g.globalCompositeOperation = 'source-atop'; g.fillRect(0, 0, W, W);
  });
}
// The butcher's block: end-grain squares of hard maple, years of the
// cleaver in it. Its top (one map, 150 x 70, the whole face): the squares'
// rings under a stain gone near black with blood in the middle where the
// work is done, scored every way by the cleaver, chopped out in divots,
// dried pools with dark rims, fresh smears wet on top.
function blockTop() {
  const W = 768, H = 358, k = W / 150, rnd = seeded(307);
  // the blocks' layout: rows 4 - 6 cm deep, each of blocks 3.5 - 7.5 wide,
  // broken joint to joint; each block its own tone, its pith off its edge
  // somewhere, its rings' spacing
  const rows = [];
  for (let y = 0; y < H;) {
    const h = (4 + rnd() * 2) * k, row = { y, h, blocks: [] };
    for (let x = -rnd() * 4 * k; x < W;) { const w = (3.5 + rnd() * 4) * k; row.blocks.push({ x, w, tone: 0.86 + rnd() * 0.26, warm: rnd(), px: (rnd() - 0.5) * 3, py: rnd() < 0.5 ? -0.4 - rnd() : 1.4 + rnd(), ring: 1.3 + rnd() * 1.6, ph: rnd() * 9 }); x += w; }
    rows.push(row); y += h;
  }
  const warp = vnoise(11), wear = vnoise(23), soakN = vnoise(31), poolN = vnoise(37), fine = vnoise(41, 0, 0);
  const s = surface(W, H, (x, y, o) => {
    let row = rows[0];
    for (let r = 0; r < rows.length; r++) if (y >= rows[r].y) row = rows[r]; else break;
    let bl = row.blocks[0];
    for (let q = 0; q < row.blocks.length; q++) if (x >= row.blocks[q].x) bl = row.blocks[q]; else break;
    const fx = (x - bl.x) / bl.w, fy = (y - row.y) / row.h, u = x / W, v = y / H;
    // the end grain: latewood rings about the pith, warped a little; rays
    const wv = (fbm(warp, x / 18, y / 18, 2) - 0.5) * 3;
    const d = Math.hypot((fx - bl.px) * bl.w, (fy - bl.py) * row.h) / bl.ring + wv + bl.ph;
    const late = Math.pow(0.5 + 0.5 * Math.sin(d * Math.PI * 2), 5);
    const joint = Math.min(fx * bl.w, (1 - fx) * bl.w, fy * row.h, (1 - fy) * row.h) < 1.1 ? 1 : 0;
    const n = fine(x * 0.9, y * 0.9) - 0.5;
    // where the work is: worn, grey with years of it, soaked dark red-brown,
    // the soak drawn along the grain; and the fresh pools on it, wet
    const c = Math.hypot((u - 0.5) * 1.15, (v - 0.4) * 1.6);
    const worn = clamp01(1.15 - c * 1.5 + (fbm(wear, u * 6, v * 3, 3) - 0.5) * 0.8);
    const soak = clamp01(sstep(0.22, 0.72, fbm(soakN, u * 4, v * 2, 4) + worn * 0.6 - 0.12) * (0.78 + late * 0.3));
    const pv = fbm(poolN, u * 9, v * 4.2, 4) + (0.5 - c) * 0.26;
    const pool = sstep(0.67, 0.69, pv), rim = sstep(0.645, 0.67, pv) * (1 - pool);
    const t = bl.tone * (1 - late * 0.18) * (1 + n * 0.12) * (1 - joint * 0.18) * (0.82 + 0.18 * fbm(wear, u * 2, v * 1, 2));
    let r = (118 + bl.warm * 20) * t, g = (84 + bl.warm * 10) * t, b = (58 - bl.warm * 6) * t;
    const gr = (r + g + b) / 3; r = lerp(r, gr * 0.8, worn * 0.55); g = lerp(g, gr * 0.75, worn * 0.55); b = lerp(b, gr * 0.7, worn * 0.55);
    const sk = Math.max(soak * 0.9, 0.35);
    r = lerp(r, 58, sk); g = lerp(g, 17, sk); b = lerp(b, 12, sk);
    r = lerp(r, 34, rim * 0.8); g = lerp(g, 5, rim * 0.8); b = lerp(b, 4, rim * 0.8);
    r = lerp(r, 62 + n * 20, pool); g = lerp(g, 3, pool); b = lerp(b, 5, pool);
    o.r = r; o.g = g; o.b = b;
    o.h = lerp(0.52 + late * 0.06 - joint * 0.2 + n * 0.04 - worn * 0.05, 0.5, pool);
    o.k = lerp(lerp(0.78, 0.6, soak), 0.06, pool) - rim * 0.2;
  });
  const g = s.color.getContext('2d'), hg = s.height.getContext('2d'), rg = s.rough.getContext('2d');
  const gauss = () => (rnd() + rnd() + rnd() - 1.5) / 1.5;
  // the knife's cuts: thousands, fine, every way, thickest where the work is
  for (let i = 0; i < 2600; i++) {
    const x = W * (0.5 + gauss() * 0.42), y = H * (0.4 + gauss() * 0.5), l = 4 + Math.pow(rnd(), 2) * 46, a = rnd() * Math.PI, dx = Math.cos(a) * l / 2, dy = Math.sin(a) * l / 2;
    const fresh = rnd() < 0.12;
    g.strokeStyle = fresh ? `rgba(170,136,104,${(0.08 + rnd() * 0.12).toFixed(2)})` : `rgba(24,10,6,${(0.06 + rnd() * 0.16).toFixed(2)})`; g.lineWidth = 0.4 + rnd() * 0.6;
    hg.strokeStyle = `rgba(0,0,0,${(0.3 + rnd() * 0.4).toFixed(2)})`; hg.lineWidth = 0.8;
    [g, hg].forEach(c => { c.beginPath(); c.moveTo(x - dx, y - dy); c.lineTo(x + dx, y + dy); c.stroke(); });
  }
  // the cleaver's chops: short deep gashes, dark, a splinter lifted at one end
  for (let i = 0; i < 90; i++) {
    const x = W * (0.5 + gauss() * 0.3), y = H * (0.4 + gauss() * 0.35), l = 10 + rnd() * 26, a = rnd() * Math.PI, dx = Math.cos(a) * l / 2, dy = Math.sin(a) * l / 2;
    g.strokeStyle = 'rgba(14,4,2,0.75)'; g.lineWidth = 1.2 + rnd() * 1.2; hg.strokeStyle = 'rgba(0,0,0,0.9)'; hg.lineWidth = 2;
    [g, hg].forEach(c => { c.beginPath(); c.moveTo(x - dx, y - dy); c.lineTo(x + dx, y + dy); c.stroke(); });
    g.strokeStyle = 'rgba(176,140,104,0.35)'; g.lineWidth = 0.8; g.beginPath(); g.moveTo(x + dx, y + dy); g.lineTo(x + dx + Math.cos(a + 0.4) * 4, y + dy + Math.sin(a + 0.4) * 4); g.stroke();
  }
  // wiped smears: a hand or a rag drawn across the wet - many fine streaks
  // in a band, darker where it began
  for (let i = 0; i < 7; i++) {
    const x = W * (0.3 + rnd() * 0.4), y = H * (0.2 + rnd() * 0.45), l = 50 + rnd() * 120, a = (rnd() - 0.5) * 1.6, w = 10 + rnd() * 18, ca = Math.cos(a), sa = Math.sin(a);
    for (let q = 0; q < 26; q++) {
      const off = (rnd() - 0.5) * w, ll = l * (0.5 + rnd() * 0.5), sx = x - sa * off, sy = y + ca * off;
      const lg = g.createLinearGradient(sx, sy, sx + ca * ll, sy + sa * ll); lg.addColorStop(0, `rgba(84,8,8,${(0.25 + rnd() * 0.3).toFixed(2)})`); lg.addColorStop(1, 'rgba(84,8,8,0)');
      g.strokeStyle = lg; g.lineWidth = 0.6 + rnd() * 1.6; g.beginPath(); g.moveTo(sx, sy); g.lineTo(sx + ca * ll, sy + sa * ll); g.stroke();
      rg.strokeStyle = 'rgba(40,40,40,0.5)'; rg.lineWidth = 1.2; rg.beginPath(); rg.moveTo(sx, sy); rg.lineTo(sx + ca * ll * 0.6, sy + sa * ll * 0.6); rg.stroke();
    }
  }
  // spatter round the pools
  for (let i = 0; i < 700; i++) { const x = W * (0.5 + gauss() * 0.4), y = H * (0.4 + gauss() * 0.45), r = 0.4 + Math.pow(rnd(), 3) * 3; g.fillStyle = `rgba(${50 + rnd() * 40 | 0},4,4,${(0.5 + rnd() * 0.45).toFixed(2)})`; g.beginPath(); g.ellipse(x, y, r, r * (0.6 + rnd() * 0.6), rnd() * 3, 0, Math.PI * 2); g.fill(); rg.fillStyle = 'rgba(20,20,20,0.8)'; rg.fillRect(x - r, y - r, 2 * r, 2 * r); }
  // scraps left on it: fat, gristle, a bit of lean, bone chips - small,
  // ragged, raised
  const scrap = (x, y, r, col, edge) => {
    const pts = [], n = 9;
    for (let q = 0; q < n; q++) { const a = q / n * Math.PI * 2, rr = r * (0.55 + rnd() * 0.6); pts.push([x + Math.cos(a) * rr, y + Math.sin(a) * rr * 0.7]); }
    [[g, col], [hg, 'rgba(255,255,255,0.75)'], [rg, 'rgba(70,70,70,1)']].forEach(([c, st]) => { c.fillStyle = st; c.beginPath(); pts.forEach((p, q) => c[q ? 'lineTo' : 'moveTo'](...p)); c.closePath(); c.fill(); });
    g.strokeStyle = edge; g.lineWidth = 0.8; g.beginPath(); pts.forEach((p, q) => g[q ? 'lineTo' : 'moveTo'](...p)); g.closePath(); g.stroke();
  };
  for (let i = 0; i < 46; i++) {
    const x = W * (0.5 + gauss() * 0.28), y = H * (0.4 + gauss() * 0.3), c = rnd();
    if (c < 0.45) scrap(x, y, 1.6 + rnd() * 3.5, 'rgba(224,204,186,0.95)', 'rgba(160,70,60,0.7)');
    else if (c < 0.8) scrap(x, y, 1.4 + rnd() * 3, 'rgba(116,22,20,0.95)', 'rgba(60,8,8,0.8)');
    else scrap(x, y, 0.8 + rnd() * 1.6, 'rgba(232,222,206,0.95)', 'rgba(120,100,80,0.6)');
  }
  return { map: asTex(s.color), normalMap: embossTex(s.height, 2.2, 1), roughnessMap: asTex(s.rough, false) };
}
// the block's sides: the same squares, end on, the stain run down them
// and the grime of the floor splashed up (tiles, 20 cm)
function blockSide() {
  const N = 256, sq = N / 4, vn = vnoise(19, 8, 8), rnd = seeded(31);
  const s = surface(N, N, (x, y, o) => {
    const i = Math.floor(x / sq), j = Math.floor(y / sq), fx = x / sq - i, fy = y / sq - j, h = ((Math.imul(i, 73856093) ^ Math.imul(j, 19349663)) >>> 0) % 1000 / 1000;
    const ring = Math.sin(Math.hypot(fx - h, fy - (1 - h)) * 30) * 0.5 + 0.5, gap = Math.min(fx, 1 - fx, fy, 1 - fy) < 0.04 ? 1 : 0, n = fbm(vn, x / N * 8, y / N * 8, 3);
    const t = 0.55 + n * 0.3;
    o.r = (120 + h * 30) * t * (0.85 + ring * 0.1) * (1 - gap * 0.5); o.g = (78 + h * 20) * t * (0.85 + ring * 0.1) * (1 - gap * 0.5); o.b = (52 + h * 14) * t * (0.85 + ring * 0.1) * (1 - gap * 0.5);
    o.h = 0.55 - gap * 0.3 + ring * 0.04; o.k = 0.8;
  });
  const g = s.color.getContext('2d');
  for (let i = 0; i < 26; i++) { const x = rnd() * N, l = 30 + rnd() * 160, w = 2 + rnd() * 6, gr = g.createLinearGradient(0, 0, 0, l); gr.addColorStop(0, 'rgba(50,6,4,0.85)'); gr.addColorStop(1, 'rgba(50,6,4,0)'); g.fillStyle = gr; g.fillRect(x, 0, w, l); }
  return surfaceTex(s, 1.6, 1, true);
}
// A butcher's block on its legs: the block (thick) on four square posts of
// stained timber, stretchers and a slatted shelf low between them. top:
// the block's top; z0: its near edge.
function buildBlock(mats, b) {
  const g = new THREE.Group();
  const { w, d, z0, top, thick, legs } = b, zc = z0 + d / 2, inset = 2.5;
  const add = (geo, mat, x, y, z) => { const m = new THREE.Mesh(geo, mat); m.position.set(x, y, z); m.castShadow = true; m.receiveShadow = true; g.add(m); return m; };
  add(boxUV(slab(w, thick, d, 0.9, 2), 20, 'y'), mats.side, 0, top - thick / 2 - 0.02, zc);
  const face = new THREE.Mesh(new THREE.PlaneGeometry(w - 1.8, d - 1.8), mats.top);
  face.rotation.x = -Math.PI / 2; face.position.set(0, top + 0.005, zc); face.receiveShadow = true; g.add(face);
  g.userData.top = face;
  const legH = top - thick - BENCH.floor, ly = top - thick - legH / 2;
  [-1, 1].forEach(sx => [-1, 1].forEach(sz => add(boxUV(slab(legs, legH, legs, 0.7, 2), 40, 'y'), mats.leg, sx * (w / 2 - inset - legs / 2), ly, zc + sz * (d / 2 - inset - legs / 2))));
  const sy = BENCH.floor + legH * 0.2, xl = w - 2 * inset - 2 * legs, zl = d - 2 * inset - 2 * legs, th = 3;
  [-1, 1].forEach(sz => add(boxUV(slab(xl, 5, th, 0.5, 2), 40, 'x'), mats.leg, 0, sy, zc + sz * (d / 2 - inset - legs / 2)));
  [-1, 1].forEach(sx => add(boxUV(slab(th, 5, zl, 0.5, 2), 40, 'z'), mats.leg, sx * (w / 2 - inset - legs / 2), sy, zc));
  const n = Math.max(3, Math.round(zl / 9)), sw = zl / n - 1.2;
  for (let i = 0; i < n; i++) add(boxUV(slab(xl + legs, 1.8, sw, 0.4, 2), 40, 'x'), mats.leg, 0, sy + 3.4, zc - zl / 2 + (i + 0.5) * zl / n);
  return g;
}
// The cleaver, hacked into the block and left there: a heavy blade, rust
// on its flats and blood dried on it, its edge bright where it was honed,
// a hole at its heel; a handle of black timber on three rivets.
function cleaverTex() {
  return K.canvasTex(512, 256, (g, W, H) => {
    const rnd = seeded(41);
    const gr = g.createLinearGradient(0, 0, 0, H); gr.addColorStop(0, '#8a8c8a'); gr.addColorStop(0.8, '#6e706e'); gr.addColorStop(1, '#c8ccc8');
    g.fillStyle = gr; g.fillRect(0, 0, W, H);
    for (let y = 0; y < H; y += 2) { g.fillStyle = `rgba(${rnd() > 0.5 ? '220,220,215' : '30,30,28'},${(0.04 + rnd() * 0.06).toFixed(3)})`; g.fillRect(0, y, W, 1); }
    for (let i = 0; i < 18; i++) { const x = rnd() * W, y = rnd() * H * 0.8, r = 10 + rnd() * 40, rr = g.createRadialGradient(x, y, 0, x, y, r); rr.addColorStop(0, 'rgba(120,56,22,0.6)'); rr.addColorStop(1, 'rgba(120,56,22,0)'); g.fillStyle = rr; g.fillRect(x - r, y - r, 2 * r, 2 * r); }
    for (let i = 0; i < 10; i++) { const x = rnd() * W, y = H * (0.4 + rnd() * 0.6), r = 14 + rnd() * 50; g.fillStyle = `rgba(${50 + rnd() * 40 | 0},6,6,${(0.5 + rnd() * 0.4).toFixed(2)})`; g.beginPath(); g.ellipse(x, y, r * 1.6, r * 0.7, rnd() * 0.6, 0, 6.28); g.fill(); }
    g.fillStyle = 'rgba(230,234,230,0.7)'; g.fillRect(0, H - 10, W, 3);
  });
}
function buildCleaver() {
  const g = new THREE.Group();
  const s = new THREE.Shape();
  s.moveTo(0.4, 0); s.quadraticCurveTo(9, -0.5, 17.6, 0.2); s.quadraticCurveTo(18.2, 0.4, 18.2, 1.2); s.lineTo(17.4, 8.6); s.lineTo(0, 8.6); s.lineTo(0, 5.2); s.quadraticCurveTo(0.1, 1.0, 0.4, 0);
  const hole = new THREE.Path(); hole.absarc(15.4, 6.9, 0.85, 0, Math.PI * 2, true); s.holes.push(hole);
  const uv = { generateTopUV(geo, v, a, b, c) { return [a, b, c].map(i => new THREE.Vector2(v[i * 3] / 18.2, (v[i * 3 + 1] + 0.5) / 9.1)); }, generateSideWallUV() { return [0, 0, 0, 0].map(() => new THREE.Vector2(0.5, 0.9)); } };
  const blade = new THREE.Mesh(new THREE.ExtrudeGeometry(s, { depth: 0.3, bevelEnabled: true, bevelThickness: 0.05, bevelSize: 0.05, bevelSegments: 1, curveSegments: 10, UVGenerator: uv }), new THREE.MeshStandardMaterial({ map: cleaverTex(), metalness: 0.55, roughness: 0.5 }));
  blade.geometry.translate(0, 0, -0.15); blade.castShadow = true; g.add(blade);
  const wood = new THREE.MeshStandardMaterial({ color: 0x1a1210, roughness: 0.55 });
  const handle = new THREE.Mesh(slab(11.5, 2.6, 1.7, 0.7, 3), wood); handle.position.set(-5.6, 6.6, 0); handle.castShadow = true; g.add(handle);
  const rivet = new THREE.CylinderGeometry(0.32, 0.32, 1.9, 10); rivet.rotateX(Math.PI / 2);
  [-9.4, -6, -2.6].forEach(x => { const r = new THREE.Mesh(rivet, new THREE.MeshStandardMaterial({ color: 0x8a7a5a, metalness: 0.9, roughness: 0.35 })); r.position.set(x, 6.6, 0); g.add(r); });
  return g;
}
// The tube: a strip light from a plant room, a pressed-steel channel on two
// chains, one tube in it, its ends gone black - dying: it buzzes and
// flutters, and every so often it fails and catches again.
function buildTube() {
  const g = new THREE.Group(), fix = new THREE.Group();
  const x = 0, y = 0, z = 0, L = TUBE.len;
  fix.position.set(...TUBE.at); fix.rotation.y = TUBE.yaw; g.add(fix);
  const steel = new THREE.MeshStandardMaterial({ color: 0x5a5a54, metalness: 0.45, roughness: 0.65 });
  const housing = new THREE.Mesh(new THREE.BoxGeometry(L + 8, 3, 8), steel); housing.position.set(x, y + 2.4, z); housing.castShadow = true; fix.add(housing);
  const refl = new THREE.Mesh(new THREE.PlaneGeometry(L + 6, 7), new THREE.MeshStandardMaterial({ color: 0x9aa098, roughness: 0.6, emissive: 0xd4ffe2, emissiveIntensity: 0 }));
  refl.rotation.x = Math.PI / 2; refl.position.set(x, y + 0.85, z); fix.add(refl);
  [-1, 1].forEach(sx => { const cap = new THREE.Mesh(new THREE.BoxGeometry(3, 3.4, 4), steel); cap.position.set(x + sx * (L / 2 + 1.5), y - 0.2, z); fix.add(cap); });
  const glass = new THREE.CylinderGeometry(1.3, 1.3, 1, 18); glass.rotateZ(Math.PI / 2);
  const tubeMat = new THREE.MeshBasicMaterial({ color: new THREE.Color(0.1, 0.12, 0.11) });
  const dyingMat = new THREE.MeshBasicMaterial({ color: new THREE.Color(0.1, 0.12, 0.11) });
  const endMat = new THREE.MeshStandardMaterial({ color: 0x141412, roughness: 0.4 });
  const seg = (mat, x0, x1) => { const m = new THREE.Mesh(glass, mat); m.scale.x = x1 - x0; m.position.set(x + (x0 + x1) / 2, y - 0.6, z); fix.add(m); return m; };
  seg(endMat, -L / 2, -L / 2 + 5); seg(dyingMat, -L / 2 + 5, -L / 2 + 22); seg(tubeMat, -L / 2 + 22, L / 2 - 6); seg(endMat, L / 2 - 6, L / 2);
  const iron = steelMat(0x1f1d1b, 0.6);
  [-1, 1].forEach(sx => buildChain(iron, 22, 2.7, x + sx * L * 0.35, y + 4 + 22 * 2.7, z, fix));
  const light = new THREE.SpotLight(0xd4ffe2, 0, 0, 1.05, 0.55, BURN.decay);
  light.position.set(...TUBE.light); light.target.position.set(...TUBE.aim);
  light.castShadow = true; light.shadow.mapSize.set(1024, 1024); light.shadow.camera.near = 8; light.shadow.camera.far = 320; light.shadow.bias = -0.0006; light.shadow.normalBias = 0.04; light.shadow.radius = 3;
  const glow = new THREE.PointLight(0xd4ffe2, 0, 80, 1.6); glow.position.set(TUBE.at[0], TUBE.at[1] - 4, TUBE.at[2]);
  const fill = new THREE.SpotLight(0xc4e4cc, 0, 0, 0.62, 0.9, 0);
  fill.position.set(...TUBE.fill); fill.target.position.set(...TUBE.fillAim);
  g.add(light, light.target, glow, fill, fill.target);
  return { group: g, light, glow, fill, tubeMat, dyingMat, refl };
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
  const floor = new THREE.Mesh(new THREE.PlaneGeometry(520, 460), new THREE.MeshStandardMaterial({ map: concreteTex(520, 460, 3, 60, DRAIN, true), roughness: 0.86, metalness: 0 }));
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
// the rail: a rusted I-beam from RAIL.from to RAIL.to at RAIL.y, an end
// stop at the wall, on hangers up into the dark
const railAt = t => [lerp(RAIL.from[0], RAIL.to[0], t), lerp(RAIL.from[1], RAIL.to[1], t)];
const RAIL_YAW = Math.atan2(-(RAIL.to[1] - RAIL.from[1]), RAIL.to[0] - RAIL.from[0]);
function buildRail() {
  const g = new THREE.Group();
  const steel = new THREE.MeshStandardMaterial({ color: 0x4e3a2c, metalness: 0.5, roughness: 0.74 });
  K.finished(steel, 'blast', 2, 2, 0.2);
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

// ------------------------------------------------------------ the hooks
// What every hook shares: the sides' faces (three, from different hogs),
// their skin, the iron, the rust, the tags' sheet.
async function hookKit() {
  const cut = [];
  for (let i = 0; i < 3; i++) {
    const s = hogCut(401 + i * 37);
    cut.push(new THREE.MeshPhysicalMaterial({ map: asTex(s.color), normalMap: embossTex(s.height, 2.4, 1), roughnessMap: asTex(s.rough, false), roughness: 1, metalness: 0, clearcoat: 0.3, clearcoatRoughness: 0.45 }));
    await breathe();
  }
  const skin = new THREE.MeshStandardMaterial(Object.assign(hogSkin(), { roughness: 1, metalness: 0 }));
  await breathe();
  const rust = new THREE.MeshStandardMaterial({ color: 0x4a3024, metalness: 0.5, roughness: 0.72 });
  K.finished(rust, 'blast', 2, 2, 0.2);
  const iron = steelMat(0x1c1a18, 0.62);
  const relief = cut.map(m => { const r = m.clone(); r.polygonOffset = true; r.polygonOffsetFactor = -1; r.polygonOffsetUnits = -2; return r; });
  const horn = new THREE.MeshStandardMaterial({ color: 0x2a221c, roughness: 0.45, metalness: 0 });
  return { cut, relief, skin, rust, iron, ironBright: K.polishedOf(iron, 0.3), nail: new THREE.MeshStandardMaterial({ color: 0x3a2a20, metalness: 0.6, roughness: 0.6 }), geo: hogGeo(), face: hogFace(-4.3), tin: tinGeo(), horn };
}
// A trolley on the rail, a short chain down from it, a meat hook through
// the hock of a hog side, and the side's tin tag nailed into its ham. The
// side is turned to the seat; the whole thing swings from the trolley and
// turns a little on the hook, never quite still.
function buildHook(kit, card, t, i, rnd) {
  const [x, z] = railAt(t);
  const pivot = new THREE.Group();
  pivot.position.set(x, RAIL.y, z);
  // (the trolley: two wheels each side of the web on the lower flange, its
  // cheeks down outside the flange to a yoke under it)
  const trolley = new THREE.Group(); trolley.rotation.y = RAIL_YAW; pivot.add(trolley);
  const cz = RAIL.flange / 2 + 0.45;
  const yoke = new THREE.Mesh(new THREE.BoxGeometry(3.6, 1.3, 2 * cz + 0.4), kit.rust); yoke.position.y = -1.0; trolley.add(yoke);
  const wheel = new THREE.CylinderGeometry(1.15, 1.15, 0.8, 16); wheel.rotateX(Math.PI / 2);
  [-1, 1].forEach(s => [-1, 1].forEach(sz => { const w = new THREE.Mesh(wheel, kit.rust); w.position.set(s * 1.7, 2.35, sz * 1.9); trolley.add(w); }));
  [-1, 1].forEach(sz => { const cheek = new THREE.Mesh(new THREE.BoxGeometry(4.6, 5.2, 0.35), kit.rust); cheek.position.set(0, 1.2, sz * cz); cheek.castShadow = true; trolley.add(cheek); });
  const face = Math.atan2(x, 140 + z) + HOG.turn;
  const spin = new THREE.Group(); spin.rotation.y = face; pivot.add(spin);
  const n = HOG.links[i % HOG.links.length];
  const links = new THREE.Group(); links.rotation.y = Math.PI / 2; spin.add(links);
  buildChain(kit.iron, n, RAIL.link, 0, -2.4, 0, links);
  const y0 = -2.4 - n * RAIL.link, hy = y0 - 8.5;
  // the meat hook: down from the chain, round behind the hock, through it,
  // its point out in front and turned up
  const hook = tube([[0, y0 + 0.6, 0], [0, y0 - 2.6, 0.6], [0, hy + 3.4, 4.4], [0, hy + 0.4, 5.4], [0, hy - 1.6, 2.6], [0, hy - 1.8, -2.4], [0, hy + 0.2, -5.4], [0, hy + 3.2, -6.2]], 0.55, kit.ironBright, 48, 10);
  hook.castShadow = true; spin.add(hook);
  const tip = new THREE.Mesh(new THREE.ConeGeometry(0.55, 1.6, 10), kit.ironBright); tip.position.set(0, hy + 4.0, -6.35); tip.rotation.x = -0.25; spin.add(tip);
  // the side, its hock on the hook
  const side = new THREE.Mesh(kit.geo, [kit.cut[i % kit.cut.length], kit.skin]);
  const ss = HOG.s * (0.94 + rnd() * 0.12), sx = ss * (0.9 + rnd() * 0.18);
  side.scale.set(sx, ss, ss); side.position.set(0, hy + 2 * ss, 0); side.rotation.y = (rnd() - 0.5) * 0.22;
  side.castShadow = true; side.receiveShadow = true; spin.add(side);
  const relief = new THREE.Mesh(kit.face, kit.relief[i % kit.relief.length]);
  relief.castShadow = true; relief.receiveShadow = true; side.add(relief);
  side.add(buildForeleg(kit.skin, kit.horn));
  // the tag, nailed into the ham at its belly edge, standing out past it
  const art = tinArt(card, false, i);
  const faceMap = asTex(art.color), faceMat = new THREE.MeshStandardMaterial({ map: faceMap, normalMap: embossTex(art.height, 2.0, 1), metalness: 0.65, roughness: 0.45, emissive: 0xffffff, emissiveMap: faceMap, emissiveIntensity: 0.3 });
  const plate = new THREE.Mesh(kit.tin, [faceMat, kit.rust]);
  plate.position.set(HOG.tag[0], HOG.tag[1], -5.0); plate.scale.set(TIN.s / sx, TIN.s / ss, TIN.s / ss); plate.rotation.z = (rnd() - 0.5) * 0.3;
  plate.castShadow = true; plate.receiveShadow = true; side.add(plate);
  const nail = new THREE.Mesh(new THREE.CylinderGeometry(0.14, 0.12, 3.4, 8), kit.nail); nail.rotation.x = Math.PI / 2; nail.position.set(0, TIN.h / 2 - TIN.nail, 1.5); plate.add(nail);
  const head = new THREE.Mesh(new THREE.CylinderGeometry(0.42, 0.42, 0.16, 12), kit.nail); head.rotation.x = Math.PI / 2; head.position.set(0, TIN.h / 2 - TIN.nail, -0.24); plate.add(head);
  const tag = { userData: { id: card.id, plate, spentTex: null, liveTex: faceMat.map, card, n: i } };
  pivot.userData = { tag, plate, spin, side, face, phase: rnd() * 6.28, rate: 0.8 + rnd() * 0.3, amp: 0, tilt: (rnd() - 0.5) * 0.06, k0: -1, kamp: 0 };
  return pivot;
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
    for (let i = 0; i < 6; i++) { const x = rnd() * W, y0 = rnd() * H * 0.4, l = 30 + rnd() * 90, w = 3 + rnd() * 8; const gr = g.createLinearGradient(0, y0, 0, y0 + l); gr.addColorStop(0, 'rgba(25,14,6,0.55)'); gr.addColorStop(1, 'rgba(25,14,6,0)'); g.fillStyle = gr; g.fillRect(x, y0, w, l); }
    // scuffs to the grey plastic, and the scratches of the job
    for (let i = 0; i < 26; i++) { const x = rnd() * W, y = rnd() * H, r = 3 + rnd() * 12; g.fillStyle = `rgba(150,140,128,${(0.35 + rnd() * 0.3).toFixed(2)})`; g.beginPath(); g.ellipse(x, y, r, r * (0.3 + rnd() * 0.5), rnd() * 3, 0, Math.PI * 2); g.fill(); }
    g.lineWidth = 1;
    for (let i = 0; i < 90; i++) { const x = rnd() * W, y = rnd() * H, l = 8 + rnd() * 60, a = (rnd() - 0.5) * 1.4; g.strokeStyle = `rgba(${rnd() > 0.5 ? '230,200,170' : '30,12,4'},${(0.15 + rnd() * 0.3).toFixed(2)})`; g.beginPath(); g.moveTo(x, y); g.lineTo(x + Math.cos(a) * l, y + Math.sin(a) * l); g.stroke(); }
    // grime packed into the foot of each face, gone brown with blood
    const dust = g.createLinearGradient(0, H * 0.78, 0, H);
    dust.addColorStop(0, 'rgba(60,14,8,0)'); dust.addColorStop(1, 'rgba(60,14,8,0.7)');
    g.fillStyle = dust; g.fillRect(0, H * 0.78, W, H * 0.22);
    // and blood: flung across it, smeared by a hand, run down from both
    for (let i = 0; i < 420; i++) { const x = rnd() * W, y = rnd() * H, s = 0.6 + Math.pow(rnd(), 3) * 7; g.fillStyle = `rgba(${48 + rnd() * 40 | 0},5,4,${(0.5 + rnd() * 0.45).toFixed(2)})`; g.beginPath(); g.ellipse(x, y, s, s * (0.5 + rnd()), rnd() * 3, 0, Math.PI * 2); g.fill(); }
    for (let i = 0; i < 5; i++) { const x = rnd() * W, y = rnd() * H * 0.7, l = 60 + rnd() * 140, w = 14 + rnd() * 26; g.strokeStyle = `rgba(${56 + rnd() * 20 | 0},6,5,${(0.45 + rnd() * 0.25).toFixed(2)})`; g.lineWidth = w; g.lineCap = 'round'; g.beginPath(); g.moveTo(x, y); g.quadraticCurveTo(x + l * 0.5, y + (rnd() - 0.5) * 40, x + l, y + (rnd() - 0.3) * 50); g.stroke(); }
    for (let i = 0; i < 14; i++) { const x = rnd() * W, y0 = rnd() * H * 0.6, l = 30 + rnd() * 120, w = 2 + rnd() * 4, gr = g.createLinearGradient(0, y0, 0, y0 + l); gr.addColorStop(0, 'rgba(60,5,5,0.85)'); gr.addColorStop(1, 'rgba(60,5,5,0)'); g.fillStyle = gr; g.fillRect(x, y0, w, l); }
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
  const barMat = new THREE.MeshStandardMaterial({ color: 0x4a3c3a, metalness: 0.85, roughness: 0.34 });
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

  // what it has left on the block round it: chips of bone, bits of meat and
  // fat thrown off the chain
  const dust = new THREE.InstancedMesh(new THREE.BoxGeometry(1, 1, 1), new THREE.MeshStandardMaterial({ color: 0xffffff, roughness: 0.55 }), 140);
  const rnd = seeded(77), dq = new THREE.Quaternion(), ds = V(1, 1, 1), dc = new THREE.Color();
  for (let i = 0; i < 140; i++) {
    const x = 18 + rnd() * 60, zz = (rnd() - 0.5) * 18 * (0.4 + rnd()), sz = 0.12 + rnd() * 0.5, c = rnd();
    ds.set(sz * (1 + rnd()), 0.08 + rnd() * 0.16, sz); dq.setFromAxisAngle(V(0, 1, 0), rnd() * 6.28);
    m4.compose(V(x, 0.06, zz), dq, ds); dust.setMatrixAt(i, m4);
    dust.setColorAt(i, c < 0.5 ? dc.setRGB(0.28, 0.03, 0.03) : c < 0.8 ? dc.setRGB(0.5, 0.12, 0.1) : dc.setRGB(0.78, 0.68, 0.58));
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
// cladding, ribs across, cut ragged with snips, its old screw holes rusted
// at the corners; propped against the brick, a little off true.
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
  g.fillStyle = '#40454a'; g.fillRect(0, 0, W, H);
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
  const cream = '#ece4d2', dim = 'rgba(236,228,210,0.8)', red = '#d0393f', blood = '#7a0a0a', bone = '#ebe1cb';
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
  // the hand's box, brushed on in blood red, ragged at its edges
  const bx = P(SL.x), by = P(SL.runY), bw = W - 2 * P(SL.x), bh = P(SL.runH);
  L.fillStyle = blood; L.beginPath();
  const jag = () => (rnd() - 0.5) * P(7);
  L.moveTo(bx + jag(), by + jag());
  for (let x = bx; x <= bx + bw; x += P(40)) L.lineTo(x + jag(), by + jag());
  for (let y = by; y <= by + bh; y += P(30)) L.lineTo(bx + bw + jag(), y + jag());
  for (let x = bx + bw; x >= bx; x -= P(40)) L.lineTo(x + jag(), by + bh + jag());
  for (let y = by + bh; y >= by; y -= P(30)) L.lineTo(bx + jag(), y + jag());
  L.closePath(); L.fill();
  for (let i = 0; i < 26; i++) { const y = by + rnd() * bh; L.fillStyle = `rgba(${rnd() > 0.5 ? '170,24,20' : '30,2,2'},${(0.12 + rnd() * 0.16).toFixed(2)})`; L.fillRect(bx + rnd() * P(60), y, bw - P(120) * rnd(), P(2 + rnd() * 6)); }
  runs(bx, bx + bw, by + bh + P(4), blood, 9, 80);
  paint('DEAL YOUR HAND', bx + bw / 2, by + bh / 2 + P(SL.run * 0.36), `600 ${P(SL.run)}px Oswald, Impact, sans-serif`, bone, 'center');
  // a bloody hand laid on the box's end and dragged off it, down the
  // sheet; flecks flung across the rest
  const hx = bx + bw - P(70), hy = by + P(30);
  for (let s = 0; s < 9; s++) {
    L.save(); L.translate(hx + s * P(3), hy + s * P(16)); L.rotate(0.25); L.scale(P(4.4), P(4.4));
    L.fillStyle = `rgba(${96 - s * 5},8,7,${(s ? 0.3 - s * 0.025 : 0.85).toFixed(3)})`;
    L.beginPath(); L.ellipse(0, 0, 4.4, 5.2, 0, 0, Math.PI * 2); L.fill();
    [[-3.4, -6.6, 0.95, 3.4, -0.25], [-1.2, -8.4, 0.95, 4.1, -0.08], [1.1, -8.5, 0.95, 4.2, 0.06], [3.2, -7.2, 0.85, 3.6, 0.2], [5.0, -1.2, 0.9, 3.2, 1.0]].forEach(([fx, fy, rw, rh, fa]) => { L.beginPath(); L.ellipse(fx, fy, rw, rh, fa, 0, Math.PI * 2); L.fill(); });
    L.restore();
  }
  for (let i = 0; i < 180; i++) { const x = rnd() * W, y = rnd() * H, s = P(1 + Math.pow(rnd(), 3) * 9); L.fillStyle = `rgba(${70 + rnd() * 40 | 0},6,6,${(0.55 + rnd() * 0.4).toFixed(2)})`; L.beginPath(); L.ellipse(x, y, s, s * (0.5 + rnd()), rnd() * 3, 0, Math.PI * 2); L.fill(); }
  // the paint chipped where the sheet has been knocked about
  L.globalCompositeOperation = 'destination-out';
  for (let i = 0; i < 900; i++) { const x = rnd() * W, y = rnd() * H, edge = Math.min(x, W - x, y, H - y) < P(60) ? 3 : 1, s = P(1 + rnd() * 3) * edge; L.fillStyle = `rgba(0,0,0,${(0.5 + rnd() * 0.5).toFixed(2)})`; L.fillRect(x, y, s, s * (0.5 + rnd())); }
  L.globalCompositeOperation = 'source-over';
  g.drawImage(slateLayer, 0, 0);
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

// The room's sound, made here: the tube's ballast hum (a buzz at twice the
// mains, through the housing), the flies (three wings' worth, wavering,
// the swarm swelling and falling away), and a chain's creak on demand (a
// noise cut to a gliding band, chattered as metal sticks and slips). bus:
// { ctx, node } from the music, or nothing (no sound).
function roomSound(bus) {
  if (!bus || !bus.ctx || !bus.node) return null;
  const { ctx, node } = bus, srcs = [];
  const osc = (type, f) => { const o = ctx.createOscillator(); o.type = type; o.frequency.value = f; srcs.push(o); return o; };
  const gain = v => { const g = ctx.createGain(); g.gain.value = v; return g; };
  const filter = (type, f, q) => { const b = ctx.createBiquadFilter(); b.type = type; b.frequency.value = f; b.Q.value = q; return b; };
  try {
    const hum = gain(0), bp = filter('bandpass', 1100, 0.6), sq = gain(0.3), body = gain(0.6);
    osc('sawtooth', 120).connect(bp); osc('square', 240).connect(sq); sq.connect(bp); osc('sine', 120).connect(body);
    bp.connect(hum); body.connect(hum); hum.connect(node);
    const fly = gain(0), lp = filter('lowpass', 1500, 0.7), swell = gain(0);
    [[196, 5.1], [213, 6.7], [229, 7.9]].forEach(([f, w]) => { const o = osc('sawtooth', f), l = osc('sine', w), lg = gain(f * 0.05), og = gain(0.3); l.connect(lg); lg.connect(o.frequency); o.connect(og); og.connect(lp); });
    osc('sine', 0.11).connect(swell); swell.connect(fly.gain);
    lp.connect(fly); fly.connect(node);
    const noise = ctx.createBuffer(1, ctx.sampleRate, ctx.sampleRate), nd = noise.getChannelData(0);
    for (let i = 0; i < nd.length; i++) nd[i] = Math.random() * 2 - 1;
    srcs.forEach(o => o.start());
    let up = false;
    return {
      burn(k) { if (up) hum.gain.setTargetAtTime(SND.hum * (0.12 + 0.88 * k), ctx.currentTime, 0.012); },
      arrive() {
        if (up) return;
        up = true;
        const t = ctx.currentTime;
        fly.gain.setTargetAtTime(SND.flies, t, 1.2); swell.gain.setTargetAtTime(SND.flies * 0.45, t, 1.2);
      },
      creak(level = 1) {
        const t = ctx.currentTime, src = ctx.createBufferSource(), f = filter('bandpass', 400, 14), chat = gain(0.5), env = gain(0), am = ctx.createOscillator(), amg = gain(0.5);
        src.buffer = noise;
        f.frequency.setValueAtTime(360 + Math.random() * 140, t); f.frequency.exponentialRampToValueAtTime(210 + Math.random() * 60, t + 0.75);
        am.type = 'square'; am.frequency.setValueAtTime(26 + Math.random() * 10, t); am.frequency.linearRampToValueAtTime(13, t + 0.8);
        am.connect(amg); amg.connect(chat.gain);
        src.connect(f); f.connect(chat); chat.connect(env); env.connect(node);
        env.gain.setValueAtTime(0, t); env.gain.linearRampToValueAtTime(SND.creak * level, t + 0.06); env.gain.setTargetAtTime(0, t + 0.38, 0.16);
        src.start(t, Math.random() * 0.2); src.stop(t + 1.2); am.start(t); am.stop(t + 1.2);
      },
      dispose() {
        srcs.forEach(o => { try { o.stop(); } catch (e) { /* stopped */ } });
        try { node.disconnect(); } catch (e) { /* gone */ }
      }
    };
  } catch (e) {
    srcs.forEach(o => { try { o.stop(); } catch (er) { /* never started */ } });
    return null;
  }
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

  // (the tags' and the stamps' type: the house's letters - wait for them,
  // with the sign's)
  if (document.fonts && document.fonts.load) await Promise.all(['700 92px Oswald', '600 92px Oswald', '30px "Special Elite"'].map(f => document.fonts.load(f).catch(() => {})));

  seat.add(await buildFloorAndWall());
  await breathe();
  // the blocks: end-grain maple, the top one map; their posts stained pine
  const top = blockTop();
  await breathe();
  const pine = surfaceTex(pineSurface(), 1.6, 1, true);
  await breathe();
  const blockMats = {
    top: new THREE.MeshStandardMaterial(Object.assign(top, { roughness: 1, metalness: 0 })),
    side: new THREE.MeshStandardMaterial(Object.assign(blockSide(), { roughness: 1, metalness: 0 })),
    leg: new THREE.MeshStandardMaterial(Object.assign(pine, { roughness: 1, metalness: 0, color: 0x6e5c50 }))
  };
  const block = buildBlock(blockMats, { w: BENCH.w, d: BENCH.d, z0: BENCH.z0, top: 0, thick: BENCH.thick, legs: BENCH.legs });
  seat.add(block);
  seat.add(buildBlock(blockMats, PEW));
  seat.add(buildRail());
  const tube = buildTube();
  seat.add(tube.group);
  const run = buildRunChain();
  seat.add(run.group);
  const saw = buildSaw();
  seat.add(saw);
  const die = buildDie(DIE.size);
  seat.add(die);
  const cleaver = buildCleaver();
  cleaver.position.set(...CLEAVER.at); cleaver.rotation.set(0, CLEAVER.yaw, CLEAVER.lean);
  seat.add(cleaver);
  const slateBody = buildSlateBody();
  slateBody.position.set(...SLATE.at); slateBody.rotation.set(SLATE.lean, Math.PI, SLATE.tilt);
  seat.add(slateBody);
  const cs1 = K.contactShadow(26, 15, 6, 2.2, [], 0.5); cs1.position.set(SAW.at[0], 0.03, SAW.at[2]); cs1.rotation.z = SAW.yaw;
  const cs2 = K.contactShadow(DIE.size, DIE.size, 1, 1.2, [], 0.5); cs2.position.set(DIE.at[0], 0.03, DIE.at[2]);
  seat.add(cs1, cs2);

  // The sides: the deck's ready platforms (the demonstration hand with
  // nothing ready), best first - the best nearest you, down the rail.
  const hand = ((hooks.deck && hooks.deck()) || []).slice(0, 7);
  const cards = hand.length ? hand : K.demoHand().slice(0, 6);
  cards.forEach(c => { c.initials = K.initials(c.name); c.spent = c.remaining > 0; });
  const rnd = seeded(41);
  const kit = await hookKit();
  const hooksG = new THREE.Group();
  const pivots = [];
  for (let i = 0; i < cards.length; i++) {
    const c = cards[i], t = cards.length > 1 ? lerp(RAIL.t0, RAIL.t1, i / (cards.length - 1)) : (RAIL.t0 + RAIL.t1) / 2;
    const p = buildHook(kit, c, t, i, rnd);
    pivots.push(p); hooksG.add(p);
    await breathe();
  }
  seat.add(hooksG);
  const pivotOf = id => pivots.find(p => p.userData.tag.userData.id === id);
  const setSpent = (id, spent) => {
    const p = pivotOf(id); if (!p) return;
    const t = p.userData.tag.userData;
    if (spent && !t.spentTex) t.spentTex = asTex(tinArt(t.card, true, t.n).color);
    const m = t.plate.material[0];
    m.map = m.emissiveMap = spent ? t.spentTex : t.liveTex; m.roughness = spent ? 0.72 : 0.45; m.metalness = spent ? 0.35 : 0.65; m.emissiveIntensity = spent ? 0.18 : 0.3; m.needsUpdate = true;
  };
  cards.forEach(c => { if (c.spent) setSpent(c.id, true); });

  // The blood: each side's trotter swells a drop, lets it go, and it falls
  // and lands - on the block, into a pool that spreads with each drop, or
  // on whatever is in its way - and splashes. (Where each lands is found
  // once, the sides at rest.) Instances: each side's drop, then its four
  // splashes.
  seat.updateMatrixWorld(true);
  const TIP = V(9.0, -100.6, -0.2);
  const tipOf = (p, out) => seat.worldToLocal(p.userData.side.localToWorld(out.copy(TIP)));
  const drops = new THREE.InstancedMesh(new THREE.SphereGeometry(0.36, 12, 8), bloodMat(), pivots.length * 5);
  drops.frustumCulled = false;
  seat.add(drops);
  const poolMat = new THREE.MeshPhysicalMaterial({ map: poolTex(), transparent: true, roughness: 0.12, clearcoat: 1, clearcoatRoughness: 0.03, depthWrite: false, polygonOffset: true, polygonOffsetFactor: -2, polygonOffsetUnits: -2 });
  const down = new THREE.Raycaster(), landOn = [block.userData.top, saw, die, cleaver, slateBody], wTip = V(0, 0, 0), dn = new THREE.Vector3(0, -1, 0);
  const drip = pivots.map((p, i) => {
    seat.localToWorld(tipOf(p, wTip));
    down.set(wTip, dn);
    const hit = down.intersectObjects(landOn, true)[0];
    const at = hit ? seat.worldToLocal(hit.point.clone()) : seat.worldToLocal(wTip.clone()).setY(BENCH.floor);
    let pool = null;
    if (hit && hit.object === block.userData.top) {
      pool = new THREE.Mesh(new THREE.PlaneGeometry(1, 1), poolMat);
      pool.rotation.set(-Math.PI / 2, 0, rnd() * 6.28); pool.position.set(at.x, 0.04 + i * 0.006, at.z);
      pool.userData.r = 8 + rnd() * 6; pool.scale.setScalar(pool.userData.r); pool.renderOrder = 1;
      seat.add(pool);
    }
    return { at, pool, next: 0.5 + rnd() * 2.4, t0: -1, fall: 0, from: V(0, 0, 0), sT: -9, sAt: V(0, 0, 0), sV: [0, 1, 2, 3].map(() => V((rnd() - 0.5) * 70, 50 + rnd() * 60, (rnd() - 0.5) * 70)) };
  });
  // The flies: about the sides' faces and the pools, each round a point of
  // its own, fast, never the same way twice. (At rest - reduced motion -
  // each is settled on its point.)
  const flies = buildFlies(FLIES);
  seat.add(flies);
  const pools = drip.filter(d => d.pool);
  const swarm = [];
  for (let i = 0; i < FLIES; i++) {
    const meat = i < FLIES * 0.7 || !pools.length;
    let c;
    if (meat) { const p = pivots[i % pivots.length]; c = seat.worldToLocal(p.userData.side.localToWorld(V(-7 + rnd() * 17, -10 - rnd() * 72, -4.6))); }
    else { const d = pools[i % pools.length]; c = V(d.pool.position.x + (rnd() - 0.5) * 6, 0.35, d.pool.position.z + (rnd() - 0.5) * 6); }
    swarm.push({ c, meat, r: meat ? 3 + rnd() * 9 : 1.5 + rnd() * 5, w: (3.5 + rnd() * 5.5) * (rnd() < 0.5 ? -1 : 1), ph: rnd() * 6.28, bob: 0.8 + rnd() * 2.4, tilt: (rnd() - 0.5) * 1.2, out: 2 + rnd() * 7 });
  }

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

    // ---- The tube (see BURN): dark until the shot turns down to the
    // block, then the starter's two tries, and it catches; after that its
    // flutter, and every few seconds a fit of one to three failures, each a
    // dip toward black for a tenth of a second or so, at least BURN.gap
    // apart. Reduced motion: steady from the first.
    const ON = FLY * 0.5, CATCH = 1.25, flick = vnoise(71), flick2 = vnoise(73);
    const FITS = (() => {
      const r = seeded(97), out = [];
      for (let t = 4 + r() * 3; t < 600; t += 4 + r() * 6) {
        const n = 1 + Math.floor(r() * 3);
        for (let i = 0, at = t; i < n; i++, at += BURN.gap + r() * 0.4) out.push([at, 0.06 + r() * 0.1, 0.72 + r() * 0.22]);
      }
      return out;
    })();
    let fit = 0;
    const burnAt = tt => {
      if (fo.reduced) return [1, 0.55];
      const s = tt - ON;
      if (s < 0) return [0, 0];
      if (s < CATCH) { const k = s < 0.12 ? 0.85 : s >= 0.62 && s < 0.74 ? 0.55 : 0.03; return [k, k * 0.5]; }
      const c = (s - CATCH) % 600;
      let k = 1 - BURN.buzz * flick(c * 14, 0.5);
      if (fit >= FITS.length || FITS[fit][0] > c + 1) fit = 0;   // (a seek back, or round again)
      while (fit < FITS.length && FITS[fit][0] + FITS[fit][1] < c) fit++;
      const f = FITS[fit];
      if (f && c >= f[0]) k *= 1 - f[2];
      return [k, (0.3 + 0.35 * flick2(c * 3, 0.2)) * k];
    };
    const LIGHT = BURN.light * Math.pow(BURN.at, BURN.decay);
    const burn = ([k, dk]) => {
      tube.light.intensity = LIGHT * k;
      tube.glow.intensity = BURN.glow * k;
      tube.fill.intensity = BURN.fill * k;
      tube.tubeMat.color.setRGB(0.07 + 2.0 * k, 0.08 + 2.5 * k, 0.075 + 2.15 * k);
      tube.dyingMat.color.setRGB(0.07 + 1.7 * dk, 0.08 + 2.0 * dk, 0.075 + 1.5 * dk);
      tube.refl.material.emissiveIntensity = 0.3 * k;
      if (sound) sound.burn(k);
    };

    // ---- The sound, through the music's bus (so the music's level and mute
    // carry it): the tube's hum, failing with it; the flies; the creaks.
    const sound = roomSound(hooks.ambience ? hooks.ambience() : null);

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
    // (a hair in front of the scrap's face, leaning with it)
    slateObj.position.set(SLATE.at[0], SLATE.at[1] + 1.2 * Math.sin(SLATE.lean), SLATE.at[2] - 1.2 * Math.cos(SLATE.lean));
    slateObj.rotation.set(SLATE.lean, Math.PI, SLATE.tilt);
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

    // ---- The swing: the sides are never still - each sways a little on
    // its trolley and turns on its hook, on its own time; now and then one
    // jerks, as if knocked, and its chain creaks. On arrival the draught of
    // your coming in swings them all; a drag across the block pushes them.
    let swingT0 = -1, push = 0, pushDir = 1, joltAt = FLY + 2.5;
    const swing = (p, tt) => {
      const d = p.userData, w = d.rate * 2.1;
      let a = 0, b = 0, tw = 0;
      if (!fo.reduced) {
        a = 0.016 * Math.sin(tt * w + d.phase) + 0.006 * Math.sin(tt * w * 0.43 + d.phase * 2.3);
        b = 0.008 * Math.sin(tt * w * 0.91 + d.phase * 1.7);
        tw = 0.08 * Math.sin(tt * 0.31 * d.rate + d.phase) + 0.03 * Math.sin(tt * 0.83 + d.phase * 3.1);
        if (swingT0 >= 0) { const u = tt - swingT0; a += Math.sin(u * w + d.phase) * 0.075 * d.amp * Math.exp(-u / 3.4) * (1 - Math.exp(-u / 0.35)); }
        if (d.k0 >= 0 && tt >= d.k0) { const u = tt - d.k0, e = Math.exp(-u / 2.6) * (1 - Math.exp(-u / 0.1)); a += Math.sin(u * w) * 0.06 * d.kamp * e; tw += Math.sin(u * 1.4) * 0.16 * d.kamp * e; }
      }
      p.rotation.z = a + d.tilt * 0.3;
      p.rotation.x = b + a * 0.35;
      d.spin.rotation.y = d.face + tw;
    };
    const kick = (amp, dir) => { swingT0 = tNow; pivots.forEach(p => { p.userData.amp = amp * (0.6 + Math.random() * 0.8); p.userData.phase = dir > 0 ? 0.3 : Math.PI - 0.3; }); if (sound && !fo.reduced) sound.creak(Math.min(1.3, 0.5 + amp * 0.5)); wake(); };
    const jolt = tt => {
      if (fo.reduced || tt < joltAt) return;
      const p = pivots[Math.floor(Math.random() * pivots.length)];
      p.userData.k0 = tt; p.userData.kamp = 0.5 + Math.random() * 0.6;
      if (sound) sound.creak(0.5 + p.userData.kamp * 0.5);
      joltAt = tt + 4 + Math.random() * 7;
    };

    // ---- The drips (see prepare): forming, falling, splashing, pooling.
    const dP = V(0, 0, 0), dS = V(1, 1, 1), dQ = new THREE.Quaternion(), dM = new THREE.Matrix4();
    const placeDrips = tt => {
      drip.forEach((d, i) => {
        const p = pivots[i], base = i * 5;
        if (fo.reduced) { drops.setMatrixAt(base, none); for (let k = 1; k < 5; k++) drops.setMatrixAt(base + k, none); return; }
        if (d.t0 < 0 && tt >= d.next) { tipOf(p, d.from); d.t0 = tt; d.fall = Math.sqrt(2 * Math.max(1, d.from.y - d.at.y) / DRIP.g); }
        if (d.t0 < 0) {
          // (swelling at the trotter's tip)
          const grow = clamp01(1 - (d.next - tt) / 0.8);
          tipOf(p, dP); dP.y -= 0.3 * grow;
          drops.setMatrixAt(base, dM.compose(dP, dQ, dS.set(grow * 0.9, grow * 1.2, grow * 0.9)));
        } else {
          const u = tt - d.t0;
          if (u < d.fall) {
            dP.set(d.from.x, d.from.y - 0.5 * DRIP.g * u * u, d.from.z);
            drops.setMatrixAt(base, dM.compose(dP, dQ, dS.set(0.8, 1 + Math.min(1.8, DRIP.g * u / 240), 0.8)));
          } else {
            // (landed: a splash, and the pool spreads)
            d.sT = d.t0 + d.fall; d.sAt.set(d.from.x, d.at.y + 0.2, d.from.z);
            d.t0 = -1; d.next = tt + lerp(DRIP.every[0], DRIP.every[1], Math.random());
            if (d.pool) { d.pool.userData.r = Math.min(DRIP.pool, d.pool.userData.r + 0.3); d.pool.scale.setScalar(d.pool.userData.r); }
            drops.setMatrixAt(base, none);
          }
        }
        const su = tt - d.sT;
        for (let k = 0; k < 4; k++) {
          if (su >= 0 && su < 0.3) {
            const v = d.sV[k], s = 0.5 * (1 - su / 0.3);
            dP.set(d.sAt.x + v.x * su, Math.max(d.sAt.y, d.sAt.y + v.y * su - 0.5 * DRIP.g * su * su), d.sAt.z + v.z * su);
            drops.setMatrixAt(base + 1 + k, dM.compose(dP, dQ, dS.set(s, s, s)));
          } else drops.setMatrixAt(base + 1 + k, none);
        }
      });
      drops.instanceMatrix.needsUpdate = true;
    };
    // ---- The flies (see prepare): each round its point, heading along its
    // way; at rest, settled on it.
    const fP = V(0, 0, 0), fT = V(0, 0, 0), fS = V(2.1, 2.1, 2.1), fQ = new THREE.Quaternion(), fM = new THREE.Matrix4(), zAxis = V(0, 0, 1);
    const placeFlies = tt => {
      swarm.forEach((f, i) => {
        if (fo.reduced) { fQ.setFromAxisAngle(V(0, 1, 0), f.ph); flies.setMatrixAt(i, fM.compose(f.c, fQ, fS)); return; }
        const a = f.ph + f.w * tt + 0.8 * Math.sin(tt * 1.7 + f.ph * 3), r = f.r * (0.75 + 0.25 * Math.sin(tt * 2.3 + f.ph));
        const x = Math.cos(a) * r, z = Math.sin(a) * r;
        fP.set(f.c.x + x, f.c.y + Math.sin(a * 2.1 + f.ph) * f.bob + Math.sin(tt * 0.7 + f.ph) * f.bob + z * f.tilt, f.c.z + z - (f.meat ? f.out : 0));
        if (!f.meat) fP.y = Math.max(fP.y, f.c.y);
        fT.set(-Math.sin(a), 0, Math.cos(a)).multiplyScalar(Math.sign(f.w));
        fQ.setFromUnitVectors(zAxis, fT);
        flies.setMatrixAt(i, fM.compose(fP, fQ, fS));
      });
      flies.instanceMatrix.needsUpdate = true;
    };

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
      const tagPx = TIN.h * TIN.s / K.CARD.h;
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
      burn(burnAt(tt));
      placeCamera(tt);
      world.stage(introT0 + tt);
      const sat = fo.reduced ? 1 : smoother((tt - FLY * 0.45) / (FLY * 0.55));
      world.scene.environmentIntensity = env0 * lerp(1, ENV, sat);
      world.lights.pendant.intensity = pendant0;
      const kf = fo.reduced ? 1 : clamp01(tt / 0.9);
      world.lights.lensLight.intensity = lens0 * (1 - kf);
      world.lights.rim.intensity *= 1 - 0.6 * kf;
      if (world.bloom) world.bloom.strength = fo.reduced ? 0 : lerp(bloom0, 0.32, kf);
      // the hooks swing as you come in, and when pushed
      if (!fo.reduced && swingT0 < 0 && tt >= FLY - 0.4) { swingT0 = tt; pivots.forEach(p => { p.userData.amp = 0.7 + Math.random() * 0.6; }); }
      if (arrived) jolt(tt);
      pivots.forEach(p => swing(p, tt));
      hooksG.updateMatrixWorld(true);
      placeDrips(tt);
      placeFlies(tt);
      if (sound && (fo.reduced || tt >= ON + CATCH)) sound.arrive();
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
    // (the room is never still - the light, the sides, the blood, the flies -
    // so it runs on, paced, unless motion is reduced)
    const busy = () => !fo.reduced || tNow < FLY + UI_IN + 0.1 || (swingT0 >= 0 && tNow - swingT0 < T.swing) || dragging || (cardId && Math.abs(lift - liftTo) > 1e-3);
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

    // ---- Touch: a side or its tag (its card), the block (a push on the hooks).
    const ray = new THREE.Raycaster(), ndc = new THREE.Vector2();
    const hitAt = e => {
      const r = css.domElement.getBoundingClientRect();
      ndc.set(((e.clientX - r.left) / r.width) * 2 - 1, -((e.clientY - r.top) / r.height) * 2 + 1);
      ray.setFromCamera(ndc, camera);
      // (a side is its card: the side or its tag under the finger, or
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
        if (sound) sound.dispose();
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
