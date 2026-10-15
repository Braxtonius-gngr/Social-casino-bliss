// THE SLAUGHTER FLOOR: West Texas Gore Fest's home at Showroom (three.js +
// CSS3D).
//
// After the roll intro has floated up, a tap on the landing starts one
// continuous shot, as it does for the card table (table.mjs): the camera
// rises out of the float and glides across the room, away from the gaming
// floor, down to a stool at a steel bench on the house's killing floor.
// Over the bench runs a hoist rail; from its hooks hang your ready
// platforms, as brass cattle tags, swinging as you come in. A sodium lamp
// hangs over the bench; a saw lies on it; the bone die from the fire rests
// beside it. On the wall behind, a slate in chalk: the clock, what is
// ready, and the hand to deal. Off the rail to the right hangs the hoist's
// chain: today's run is how much of it has gone to ember, from the hook
// up.
//
// Tap a tag: its card comes up off the hook to you, with its Keen Info and
// its moves (the same card and sheet as the card table's). Drag across the
// bench: the hooks swing, and settle. Nothing here is scaled to fake a
// thing: the camera goes where you would sit, and the lens is sized for
// that.
//
// Held to real makers, at three distances (across the room: silhouette;
// at arm's length: materials, bevels, seams; pinched in 3x: engraving,
// grain, wear), for what each surface does with the one key light (the
// sodium lamp over the bench), what it touches and how it moves:
//   The bench - a galvanised steel butcher's table from a packing-house
//     fitter: a spangled zinc top on box-section legs, a rolled front
//     edge, a drain lip. Room: a grey slab on dark legs. Arm: the zinc's
//     spangle (a mottle of crystals), the top's brushing one way, the
//     scratches of years across it. 3x: the rolled edge's seam, the bolt
//     heads at the corners, rust at the welds. The lamp lays a long
//     highlight down its brushing; the saw, the die and the tags' shadows
//     fall on it.
//   The rail and the hooks - a meat rail from the same fitter: a steel
//     I-beam, trolley hooks on short lengths of chain, S-hooks of
//     blacked steel. Room: a dark bar with hooks under it. Arm: the beam's
//     flanges, each link a forged oval turned ninety degrees from the
//     last, the S-hook's taper. 3x: scale and rust in the links' crooks,
//     the hook's worn-bright bend. The lamp catches each link's top. They
//     swing from the trolley as a load does: slow, with a lag down the
//     chain, settling over ten seconds, no two alike.
//   The tags - brass cattle ear tags from a Texas stockman's supply: a
//     stamped plate with a rolled hole, the initials struck with letter
//     punches. Room: gold plates on the hooks. Arm: the brass satin, the
//     struck letters dark in their floors. 3x: the punches' slightly
//     uneven depth and line, scratches from the pliers, a dent. A spent
//     platform's tag is tarnished, dull.
//   The lamp - a sodium high-bay from an industrial supplier: a spun
//     aluminium shade, a wire guard, the lamp's amber. Room: a cone of
//     amber light on the bench. Arm: the shade's spinning marks, the
//     guard's wires. It hangs from the rail on a short chain and barely
//     moves.
//   The saw - a professional chainsaw from a forestry dealer, years into
//     its work: an oil-stained cowl in rust orange, a black guide bar, the
//     chain's cutters along it, a pull cord, the rear handle's trigger.
//     Room: the saw on the bench. Arm: the bar's oiling slot, the cutters'
//     set, the cowl's vents. 3x: the cutters' filed faces, sawdust in the
//     vents, a chip in the paint. It does not run here.
//   The chain - the hoist's own: heavy forged links. Today's run is the
//     chain gone to ember from the hook up, blood red to white-hot at the
//     head, its glow on the wall behind; the rest black iron.
//   The slate - a kill-floor tally board: a slate in a pine frame, chalk
//     lettering (Special Elite for the labels, Oswald for the numbers), a
//     chalk ledge; three things on it - the clock, what is ready, the hand. Room: a dark board on the wall. Arm: the chalk's dust
//     on the slate, the frame's grain. 3x: the chalk's broken edges.
//   The floor and the wall - concrete, stained, a drain in the floor; the
//     wall's blocks painted once, a stencilled bay number. The lamp's cone
//     lights what it reaches; the rest goes to the room's dark.
//
// Coordinates are the seat's own, as the table's: centimetres, the origin
// on the bench's top at the middle of its near edge's line, +z away from
// you, +y up, +x to your LEFT.

import * as THREE from '../vendor/three/three.module.js';
import { CSS3DRenderer, CSS3DObject } from '../vendor/three/three.addons.js';
import { tableKit as K } from './table.mjs';

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
// card table, the stool facing away from the gaming floor, so the camera
// comes in from behind it.
const SEAT = { at: [440, 0, 60], yaw: 90 };
// The bench: 150 x 70, its near edge a little in front of the origin.
const BENCH = { w: 150, d: 70, z0: -4, slab: 4, floor: -82, legs: 5 };
// The rail over it, the hooks' pitch along it, how far down the tags hang.
const RAIL = { y: 142, z: 30, w: 250, pitch: 26, tagY: 62, link: 2.7 };
// The lamp, hung from the rail in the middle, a little toward you.
const LAMP = { at: [0, 128, 8], aim: [0, 0, 26] };
// The wall, and the slate on it; the drain in the floor.
const WALL = { z: 88, w: 320, h: 300 };
const SLATE = { at: [0, 104, 64], w: 66, h: 40, px: 30 };
const DRAIN = [10, 36];
// The run's chain: off the rail at the right, down to a hook.
const CHAIN = { x: -86, z: RAIL.z - 2, links: 32, link: 3.0 };
// The saw on the bench, right of the middle; the die left of it.
const SAW = { at: [-12, 0, 16], yaw: -35 * DEG };
const DIE = { at: [34, 0, 16], size: 5.2 };
// The views: the stool, portrait and landscape.
const VIEW = [{ eye: [0, 80, -140], aim: [0, 62, 40], fov: 60 }, { eye: [0, 76, -150], aim: [0, 62, 40], fov: 48 }];
const T = { fly: 4.8, uiIn: 0.6, swing: 11, lift: 0.55 };

// ------------------------------------------------------------ textures
function concreteTex(w, h, seed, stains, drain) {
  const k = 4, W = Math.round(w * k), H = Math.round(h * k);
  return K.canvasTex(W, H, (g) => {
    const rnd = seeded(seed);
    g.fillStyle = '#4a4640'; g.fillRect(0, 0, W, H);
    for (let i = 0; i < W * H / 14; i++) {
      const v = rnd();
      g.fillStyle = v > 0.5 ? `rgba(120,116,108,${((v - 0.5) * 0.14).toFixed(3)})` : `rgba(0,0,0,${((0.5 - v) * 0.22).toFixed(3)})`;
      g.fillRect(rnd() * W, rnd() * H, 1.5 + rnd() * 2, 1.5 + rnd() * 2);
    }
    // the slab's pour lines and a crack or two
    g.strokeStyle = 'rgba(0,0,0,0.35)'; g.lineWidth = 1.2;
    for (let i = 0; i < 3; i++) { g.beginPath(); let x = rnd() * W, y = rnd() * H; g.moveTo(x, y); for (let s = 0; s < 14; s++) { x += (rnd() - 0.5) * 60; y += (rnd() - 0.3) * 50; g.lineTo(x, y); } g.stroke(); }
    // the stains: dark, rust and old blood, pooled toward the drain
    for (let i = 0; i < stains; i++) {
      const x = rnd() * W, y = rnd() * H, r = 20 + rnd() * 110, c = rnd();
      const gr = g.createRadialGradient(x, y, 0, x, y, r);
      const col = c < 0.4 ? '70,18,14' : c < 0.7 ? '90,50,25' : '10,10,10';
      gr.addColorStop(0, `rgba(${col},${(0.25 + rnd() * 0.3).toFixed(2)})`); gr.addColorStop(1, `rgba(${col},0)`);
      g.fillStyle = gr; g.fillRect(x - r, y - r, 2 * r, 2 * r);
    }
    if (drain) {
      const [dx, dz] = drain, x = (w / 2 - dx) * k, y = (h / 2 + dz - 30) * k, r = 11 * k;
      const gr = g.createRadialGradient(x, y, r * 0.6, x, y, r * 2.4);
      gr.addColorStop(0, 'rgba(40,18,14,0.55)'); gr.addColorStop(1, 'rgba(40,18,14,0)');
      g.fillStyle = gr; g.fillRect(x - 3 * r, y - 3 * r, 6 * r, 6 * r);
    }
  });
}
function wallTex() {
  const k = 3, W = Math.round(WALL.w * k), H = Math.round(WALL.h * k);
  return K.canvasTex(W, H, (g) => {
    const rnd = seeded(19);
    g.fillStyle = '#3a3733'; g.fillRect(0, 0, W, H);
    // the blocks, painted once and worn
    const bw = 40 * k, bh = 20 * k;
    for (let r = 0; r * bh < H; r++) for (let c = -1; c * bw < W + bw; c++) {
      const x = c * bw + (r % 2 ? bw / 2 : 0), y = H - (r + 1) * bh;
      g.fillStyle = `rgba(${60 + rnd() * 20},${56 + rnd() * 18},${50 + rnd() * 16},1)`; g.fillRect(x + 1.5, y + 1.5, bw - 3, bh - 3);
    }
    for (let i = 0; i < W * H / 22; i++) { const v = rnd(); g.fillStyle = v > 0.5 ? `rgba(130,124,112,${((v - 0.5) * 0.12).toFixed(3)})` : `rgba(0,0,0,${((0.5 - v) * 0.2).toFixed(3)})`; g.fillRect(rnd() * W, rnd() * H, 1.5 + rnd() * 2, 1.5 + rnd() * 2); }
    // the grime: darker toward the floor, run marks from the rail
    const gr = g.createLinearGradient(0, 0, 0, H); gr.addColorStop(0, 'rgba(0,0,0,0.1)'); gr.addColorStop(0.55, 'rgba(0,0,0,0)'); gr.addColorStop(1, 'rgba(10,6,4,0.55)');
    g.fillStyle = gr; g.fillRect(0, 0, W, H);
    for (let i = 0; i < 26; i++) { const x = rnd() * W, y0 = (0.3 + rnd() * 0.3) * H, l = 30 + rnd() * 160; const rg = g.createLinearGradient(0, y0, 0, y0 + l * k); rg.addColorStop(0, 'rgba(60,20,14,0.35)'); rg.addColorStop(1, 'rgba(60,20,14,0)'); g.fillStyle = rg; g.fillRect(x, y0, 2 + rnd() * 4, l * k); }
    // the bay's stencil, in the house's own red, worn
    g.save(); g.translate(W * 0.27, H * 0.43); g.font = `600 ${44 * k}px Oswald, Impact, sans-serif`; g.textAlign = 'center';
    g.fillStyle = 'rgba(150,30,34,0.5)'; g.fillText('BAY 7', 0, 0); g.restore();
    g.save(); g.translate(W * 0.27, H * 0.49); g.font = `${14 * k}px "Special Elite", monospace`; g.textAlign = 'center'; g.fillStyle = 'rgba(200,190,170,0.35)'; g.fillText('HOLDING · NO ENTRY', 0, 0); g.restore();
  });
}
function zincTex() {
  return K.canvasTex(1024, 512, (g, W, H) => {
    const rnd = seeded(5);
    g.fillStyle = '#8c8f8c'; g.fillRect(0, 0, W, H);
    // the spangle: crystals of zinc, each its own shade, with a bright edge
    for (let i = 0; i < 700; i++) {
      const x = rnd() * W, y = rnd() * H, r = 6 + rnd() * 22, n = 5 + Math.floor(rnd() * 3), v = 128 + rnd() * 34;
      g.beginPath(); for (let s = 0; s < n; s++) { const a = s / n * Math.PI * 2 + rnd() * 0.5, rr = r * (0.7 + rnd() * 0.5); g.lineTo(x + Math.cos(a) * rr, y + Math.sin(a) * rr); } g.closePath();
      g.fillStyle = `rgb(${v},${v + 2},${v - 2})`; g.fill(); g.strokeStyle = 'rgba(230,232,230,0.18)'; g.lineWidth = 0.7; g.stroke();
    }
    // the brushing, one way, and the scratches of years across it
    for (let y = 0; y < H; y += 2) { g.fillStyle = `rgba(0,0,0,${(0.03 + rnd() * 0.06).toFixed(3)})`; g.fillRect(0, y, W, 1); }
    g.strokeStyle = 'rgba(40,40,40,0.5)'; g.lineWidth = 1;
    for (let i = 0; i < 40; i++) { const x = rnd() * W, y = rnd() * H, l = 20 + rnd() * 120, a = (rnd() - 0.5) * 0.8; g.beginPath(); g.moveTo(x, y); g.lineTo(x + Math.cos(a) * l, y + Math.sin(a) * l); g.stroke(); }
    for (let i = 0; i < 14; i++) { const x = rnd() * W, y = rnd() * H, r = 10 + rnd() * 40; const gr = g.createRadialGradient(x, y, 0, x, y, r); gr.addColorStop(0, 'rgba(70,20,14,0.3)'); gr.addColorStop(1, 'rgba(70,20,14,0)'); g.fillStyle = gr; g.fillRect(x - r, y - r, 2 * r, 2 * r); }
  });
}
// a tag's plate: brass struck with the initials, scratched
function tagTex(initials, spent) {
  return K.canvasTex(256, 200, (g, W, H) => {
    const rnd = seeded(initials.charCodeAt(0) * 7 + (initials.charCodeAt(1) || 3));
    const gr = g.createLinearGradient(0, 0, W, H);
    if (spent) { gr.addColorStop(0, '#6a5a38'); gr.addColorStop(0.5, '#4e4028'); gr.addColorStop(1, '#5c4c30'); }
    else { gr.addColorStop(0, '#f1d47a'); gr.addColorStop(0.45, '#c9a24c'); gr.addColorStop(1, '#e3c060'); }
    g.fillStyle = gr; g.fillRect(0, 0, W, H);
    for (let i = 0; i < 60; i++) { const x = rnd() * W, y = rnd() * H, l = 10 + rnd() * 60, a = (rnd() - 0.5) * 1.2; g.strokeStyle = `rgba(${rnd() > 0.5 ? '255,245,210' : '60,40,10'},${(0.1 + rnd() * 0.25).toFixed(2)})`; g.lineWidth = 0.8; g.beginPath(); g.moveTo(x, y); g.lineTo(x + Math.cos(a) * l, y + Math.sin(a) * l); g.stroke(); }
    // the rolled hole's rim
    g.beginPath(); g.arc(W / 2, 30, 13, 0, Math.PI * 2); g.fillStyle = '#1a1512'; g.fill();
    g.beginPath(); g.arc(W / 2, 30, 15, 0, Math.PI * 2); g.strokeStyle = 'rgba(60,40,10,0.6)'; g.lineWidth = 3; g.stroke();
    // the struck initials: each letter a hair off, its floor dark
    g.font = `700 92px Oswald, Impact, sans-serif`; g.textAlign = 'center'; g.textBaseline = 'middle';
    [...initials].forEach((ch, i) => {
      const x = W / 2 + (i - (initials.length - 1) / 2) * 62 + (rnd() - 0.5) * 3, y = 122 + (rnd() - 0.5) * 3;
      g.save(); g.translate(x, y); g.rotate((rnd() - 0.5) * 0.06);
      g.fillStyle = 'rgba(255,245,210,0.5)'; g.fillText(ch, 1.2, 1.2);
      g.fillStyle = spent ? '#1c160e' : '#2a1d0a'; g.fillText(ch, 0, 0);
      g.restore();
    });
  });
}

// ------------------------------------------------------------ the set
function steelMat(color = 0x2a2724, rough = 0.5) {
  const m = new THREE.MeshStandardMaterial({ color, metalness: 0.85, roughness: rough });
  return K.finished(m, 'brushed', 2, 2, 0.12);
}
function buildFloorAndWall() {
  const g = new THREE.Group();
  const floor = new THREE.Mesh(new THREE.PlaneGeometry(520, 460), new THREE.MeshStandardMaterial({ map: concreteTex(520, 460, 3, 40, DRAIN), roughness: 0.92, metalness: 0 }));
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
  const wall = new THREE.Mesh(new THREE.PlaneGeometry(WALL.w, WALL.h), new THREE.MeshStandardMaterial({ map: wallTex(), roughness: 0.9, metalness: 0 }));
  wall.position.set(0, BENCH.floor + WALL.h / 2, WALL.z); wall.rotation.y = Math.PI; wall.receiveShadow = true;
  g.add(wall);
  return g;
}
function buildBench() {
  const g = new THREE.Group();
  const zinc = new THREE.MeshStandardMaterial({ map: zincTex(), metalness: 0.75, roughness: 0.42 });
  K.finished(zinc, 'brushed', 1.5, 3, 0.1);
  const W = BENCH.w, D = BENCH.d, zc = BENCH.z0 + D / 2;
  const top = new THREE.Mesh(new THREE.BoxGeometry(W, BENCH.slab, D), zinc);
  top.position.set(0, -BENCH.slab / 2, zc); top.castShadow = true; top.receiveShadow = true;
  g.add(top);
  // the rolled front edge, its seam, the bolts at the corners
  const roll = new THREE.Mesh(new THREE.CylinderGeometry(BENCH.slab / 2 + 0.3, BENCH.slab / 2 + 0.3, W, 20), zinc);
  roll.rotation.z = Math.PI / 2; roll.position.set(0, -BENCH.slab / 2, BENCH.z0);
  g.add(roll);
  const dark = steelMat(0x1e1c1a, 0.55);
  const bolt = new THREE.CylinderGeometry(0.9, 0.9, 0.5, 6);
  [[-1, -1], [1, -1], [-1, 1], [1, 1]].forEach(([sx, sz]) => { const b = new THREE.Mesh(bolt, dark); b.position.set(sx * (W / 2 - 4), 0.25, zc + sz * (D / 2 - 4)); g.add(b); });
  // box-section legs and a shelf rail
  const legH = -BENCH.floor - BENCH.slab;
  [[-1, -1], [1, -1], [-1, 1], [1, 1]].forEach(([sx, sz]) => {
    const leg = new THREE.Mesh(new THREE.BoxGeometry(BENCH.legs, legH, BENCH.legs), dark);
    leg.position.set(sx * (W / 2 - 6), -BENCH.slab - legH / 2, zc + sz * (D / 2 - 6)); leg.castShadow = true;
    g.add(leg);
  });
  [-1, 1].forEach(sz => { const r = new THREE.Mesh(new THREE.BoxGeometry(W - 12, 3, 3), dark); r.position.set(0, BENCH.floor + 22, zc + sz * (D / 2 - 6)); g.add(r); });
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
function buildRail() {
  const g = new THREE.Group();
  const steel = steelMat(0x26231f, 0.5);
  // the I-beam: two flanges and a web
  const web = new THREE.Mesh(new THREE.BoxGeometry(RAIL.w, 10, 1.2), steel); web.position.set(0, RAIL.y + 6, RAIL.z);
  const fl1 = new THREE.Mesh(new THREE.BoxGeometry(RAIL.w, 1.4, 8), steel); fl1.position.set(0, RAIL.y + 11.3, RAIL.z);
  const fl2 = new THREE.Mesh(new THREE.BoxGeometry(RAIL.w, 1.4, 8), steel); fl2.position.set(0, RAIL.y + 0.7, RAIL.z);
  [web, fl1, fl2].forEach(m => { m.castShadow = true; g.add(m); });
  // the hangers up into the dark
  [-1, 1].forEach(s => { const h = new THREE.Mesh(new THREE.BoxGeometry(4, 120, 4), steel); h.position.set(s * 90, RAIL.y + 72, RAIL.z); g.add(h); });
  return g;
}
// a trolley on the rail, a chain down from it, an S-hook at the end, and
// the tag on the hook; the whole thing swings from the trolley
function buildHook(set, card, x, rnd) {
  const pivot = new THREE.Group();
  pivot.position.set(x, RAIL.y, RAIL.z);
  const steel = steelMat(0x1f1d1b, 0.5);
  const trolley = new THREE.Mesh(new THREE.BoxGeometry(6, 3, 4), steel); trolley.position.y = -1.5; pivot.add(trolley);
  const wheel = new THREE.CylinderGeometry(1.6, 1.6, 1, 16); wheel.rotateX(Math.PI / 2);
  [-1, 1].forEach(s => { const w = new THREE.Mesh(wheel, steel); w.position.set(s * 2.2, 1.2, 0); pivot.add(w); });
  const hang = RAIL.y - RAIL.tagY - 9 + (rnd() - 0.5) * 8;
  const n = Math.max(6, Math.round(hang / RAIL.link));
  buildChain(steel, n, RAIL.link, 0, -3, 0, pivot);
  // the S-hook: a tube along an S
  const y0 = -3 - n * RAIL.link;
  const pts = [V(0, y0 + 1, 0), V(0, y0 - 1.5, 0), V(1.6, y0 - 3.2, 0), V(2.6, y0 - 1.6, 0), V(1.4, y0 - 0.4, 0), V(0.2, y0 - 2.2, 0), V(-1.2, y0 - 4.6, 0), V(-2.4, y0 - 6.2, 0), V(-1.2, y0 - 7.6, 0), V(0.6, y0 - 6.6, 0)];
  const hook = new THREE.Mesh(new THREE.TubeGeometry(new THREE.CatmullRomCurve3(pts), 48, 0.42, 8, false), K.polishedOf(steel, 0.35));
  hook.castShadow = true; pivot.add(hook);
  // the tag, on the hook's lower bend by its hole
  const tag = new THREE.Group();
  const plate = new THREE.Mesh(new THREE.BoxGeometry(15, 11.5, 0.32), [
    set.brass, set.brass, set.brass, set.brass,
    new THREE.MeshStandardMaterial({ map: tagTex(card.initials, false), metalness: 0.85, roughness: 0.38 }),
    new THREE.MeshStandardMaterial({ map: tagTex(card.initials, false), metalness: 0.85, roughness: 0.38 })
  ]);
  plate.castShadow = true; plate.receiveShadow = true;
  // (hung by its hole: the plate's top 1 cm under the hook's bend)
  plate.position.set(-1.4, y0 - 7.4 - 5.75 + 1.3, 0.3);
  tag.add(plate);
  tag.userData = { id: card.id, plate, spentTex: null, liveTex: plate.material[4].map, initials: card.initials };
  pivot.add(tag);
  pivot.userData = { tag, plate, phase: rnd() * 6.28, rate: 0.9 + rnd() * 0.35, amp: 0, tilt: (rnd() - 0.5) * 0.08 };
  return pivot;
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
  buildChain(steelMat(0x1f1d1b, 0.5), Math.round((RAIL.y + 90 - y - 14) / 2.7), 2.7, x, RAIL.y + 90, z, g);
  const light = new THREE.SpotLight(0xffb45a, 0, 0, 0.98, 0.65, 0);
  light.position.set(x, y - 2, z);
  light.target.position.set(...LAMP.aim);
  light.castShadow = true;
  light.shadow.mapSize.set(1024, 1024);
  light.shadow.camera.near = 10; light.shadow.camera.far = 220;
  light.shadow.bias = -0.0005; light.shadow.normalBias = 0.03; light.shadow.radius = 4;
  g.add(light, light.target);
  return { group: g, light, lining };
}
// the run's chain: heavy links, the lit ones a second set over the first
function buildRunChain() {
  const g = new THREE.Group();
  const iron = steelMat(0x1a1816, 0.6);
  const cold = buildChain(iron, CHAIN.links, CHAIN.link, CHAIN.x, RAIL.y, CHAIN.z, g);
  const hot = new THREE.InstancedMesh(chainGeo(), new THREE.MeshBasicMaterial({ toneMapped: false }), CHAIN.links);
  const m4 = new THREE.Matrix4(), col = new THREE.Color();
  for (let i = 0; i < CHAIN.links; i++) { cold.getMatrixAt(i, m4); hot.setMatrixAt(i, m4); hot.setColorAt(i, col.set(0xffffff)); }
  g.add(hot);
  // the big hook at the end
  const y0 = RAIL.y - CHAIN.links * CHAIN.link;
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
    base.addColorStop(0, '#b4501e'); base.addColorStop(0.55, '#9a3a14'); base.addColorStop(1, '#6e2a10');
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
// the slate's body and its print (the chalk as the page's own elements
// show it, drawn on the slate itself for the fly in)
function buildSlateBody() {
  const g = new THREE.Group();
  const pine = new THREE.MeshStandardMaterial({ color: 0x6b4a2c, roughness: 0.8 });
  const frame = new THREE.Mesh(new THREE.BoxGeometry(SLATE.w + 5, SLATE.h + 5, 2.2), pine);
  frame.castShadow = true; g.add(frame);
  const c = document.createElement('canvas');
  c.width = 2160; c.height = Math.round(2160 * SLATE.h / SLATE.w);
  const tex = new THREE.CanvasTexture(c); tex.colorSpace = THREE.SRGBColorSpace; tex.anisotropy = 8;
  const face = new THREE.Mesh(new THREE.PlaneGeometry(SLATE.w, SLATE.h), new THREE.MeshBasicMaterial({ map: tex, toneMapped: false }));
  face.position.z = 1.15; g.add(face);
  const ledge = new THREE.Mesh(new THREE.BoxGeometry(SLATE.w + 5, 1.6, 4), pine); ledge.position.set(0, -SLATE.h / 2 - 1.7, 2); g.add(ledge);
  const chalk = new THREE.Mesh(new THREE.CylinderGeometry(0.5, 0.5, 5, 10), new THREE.MeshStandardMaterial({ color: 0xe8e2d4, roughness: 0.95 }));
  chalk.rotation.z = Math.PI / 2; chalk.position.set(-14, -SLATE.h / 2 - 0.4, 3); g.add(chalk);
  // hung from the dark on two chains, by eye bolts in the frame's top
  const steel = steelMat(0x1f1d1b, 0.5);
  [-1, 1].forEach(sx => { const n = Math.round(120 / 2.7); buildChain(steel, n, 2.7, sx * (SLATE.w / 2 - 4), SLATE.h / 2 + 2.5 + n * 2.7, 0, g); const eye = new THREE.Mesh(new THREE.TorusGeometry(1.1, 0.3, 8, 16), steel); eye.position.set(sx * (SLATE.w / 2 - 4), SLATE.h / 2 + 2.8, 0); g.add(eye); });
  g.userData.print = { mesh: face, draw: v => { drawSlate(c.getContext('2d'), c.width, c.height, v); tex.needsUpdate = true; } };
  return g;
}
// The slate carries three things, big enough to read from the stool on a
// phone: the clock, what is ready, and the hand to deal. (Laid out to the
// pixel as the page's own slate is - app.css, .r3w-* - each line placed by
// its baseline: top = baseline - 0.8 of its size.)
const SL = { x: 70, rx: 1250, eyebrowY: 110, eyebrow: 48, numY: 600, now: 380, ampm: 60, ready: 460, runY: 790, runH: 240, run: 112 };
function drawSlate(g, W, H, v) {
  const k = W / (SLATE.w * SLATE.px), P = n => n * k;
  g.fillStyle = '#1f2220'; g.fillRect(0, 0, W, H);
  const rnd = seeded(11);
  for (let i = 0; i < 2600; i++) { g.fillStyle = `rgba(230,226,214,${(rnd() * 0.08).toFixed(3)})`; g.fillRect(rnd() * W, rnd() * H, 1 + rnd() * 3, 1 + rnd() * 2); }
  const txt = (s, x, y, font, color, align = 'left') => { g.font = font; g.fillStyle = color; g.textAlign = align; g.fillText(s, x, y); };
  const chalk = '#e8e2d4', dim = 'rgba(232,226,212,0.72)', red = '#e0444e', gold = '#ffc107';
  txt('THE FLOOR', P(SL.x), P(SL.eyebrowY), `${P(SL.eyebrow)}px "Special Elite", monospace`, dim);
  txt(v.now, P(SL.x), P(SL.numY), `600 ${P(SL.now)}px Oswald, Impact, sans-serif`, chalk);
  g.font = `600 ${P(SL.now)}px Oswald, Impact, sans-serif`;
  txt(v.ampm, P(SL.x) + g.measureText(v.now).width + P(14), P(SL.numY), `${P(SL.ampm)}px "Special Elite", monospace`, dim);
  txt('READY', P(SL.rx), P(SL.eyebrowY), `${P(SL.eyebrow)}px "Special Elite", monospace`, red);
  txt(v.ready, P(SL.rx), P(SL.numY), `600 ${P(SL.ready)}px Oswald, Impact, sans-serif`, chalk);
  // the hand's plate, across the foot of the board, in the skin's action gold
  const bx = P(SL.x), by = P(SL.runY), bw = W - 2 * P(SL.x), bh = P(SL.runH);
  g.fillStyle = '#0b0b0b'; g.fillRect(bx + P(8), by + P(8), bw, bh);
  g.fillStyle = gold; g.fillRect(bx, by, bw, bh);
  txt('DEAL YOUR HAND', bx + bw / 2, by + bh / 2 + P(SL.run * 0.36), `600 ${P(SL.run)}px Oswald, Impact, sans-serif`, '#0b0b0b', 'center');
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

  seat.add(buildFloorAndWall());
  seat.add(buildBench());
  seat.add(buildRail());
  const lamp = buildLamp();
  seat.add(lamp.group);
  const run = buildRunChain();
  seat.add(run.group);
  seat.add(buildSaw());
  seat.add(buildDie(DIE.size));
  const slateBody = buildSlateBody();
  slateBody.position.set(...SLATE.at); slateBody.rotation.y = Math.PI;
  seat.add(slateBody);
  const cs1 = K.contactShadow(26, 15, 6, 2.2, [], 0.5); cs1.position.set(SAW.at[0], 0.03, SAW.at[2]); cs1.rotation.z = SAW.yaw;
  const cs2 = K.contactShadow(DIE.size, DIE.size, 1, 1.2, [], 0.5); cs2.position.set(DIE.at[0], 0.03, DIE.at[2]);
  seat.add(cs1, cs2);

  // The tags: the deck's ready platforms (the demonstration hand with
  // nothing ready), best first - the best nearest the middle.
  const hand = ((hooks.deck && hooks.deck()) || []).slice(0, 7);
  const cards = hand.length ? hand : K.demoHand().slice(0, 6);
  cards.forEach(c => { c.initials = K.initials(c.name); c.spent = c.remaining > 0; });
  if (document.fonts && document.fonts.load) await Promise.all(['700 92px Oswald', '30px "Special Elite"'].map(f => document.fonts.load(f).catch(() => {})));
  const rnd = seeded(41);
  const hooksG = new THREE.Group();
  const pivots = [];
  cards.forEach((c, i) => {
    const slot = i - (cards.length - 1) / 2;
    const p = buildHook(set, c, -slot * RAIL.pitch, rnd);
    pivots.push(p); hooksG.add(p);
  });
  seat.add(hooksG);
  const pivotOf = id => pivots.find(p => p.userData.tag.userData.id === id);
  const setSpent = (id, spent) => {
    const p = pivotOf(id); if (!p) return;
    const t = p.userData.tag.userData;
    if (spent && !t.spentTex) t.spentTex = tagTex(t.initials, true);
    const m = t.plate.material;
    [4, 5].forEach(f => { m[f].map = spent ? t.spentTex : t.liveTex; m[f].roughness = spent ? 0.7 : 0.38; m[f].needsUpdate = true; });
  };
  cards.forEach(c => { if (c.spent) setSpent(c.id, true); });

  // The lamp comes up while the intro floats, so the bench is there, lit,
  // before the camera turns toward it.
  let lampT0 = performance.now();
  const lampUp = () => {
    const k = smoother((performance.now() - lampT0) / 2200);
    lamp.light.intensity = 6.5 * k;
    lamp.lining.material.color.setRGB(1.9 * k + 0.05, 1.3 * k + 0.04, 0.5 * k + 0.02);
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
    slateObj.rotation.y = Math.PI;
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
    const tick = () => {
      const d = new Date();
      const hh = d.getHours(), mm = d.getMinutes();
      const hm = `${((hh + 11) % 12) + 1}:${String(mm).padStart(2, '0')}`;
      put(q('.r3w-now'), hm);
      put(q('.r3w-ampm'), hh < 12 ? 'AM' : 'PM');
      const st = (hand.length && hooks.status && hooks.status()) || sample();
      put(q('.r3w-ready'), String(st.ready));
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
        a = Math.sin(u * d.rate * 2.1 + d.phase) * 0.11 * d.amp * env;
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
      const tagPx = 11.5 / K.CARD.h;
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
      // (on the way in, the slate is print on the board; on the stool it is
      // the page's own)
      slateBody.userData.print.mesh.visible = tt < FLY;
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
      // (a tag is easy to hit: its plate, and a little round it)
      let best = null, bestD = Infinity;
      pivots.forEach(p => {
        p.userData.plate.getWorldPosition(pw);
        const d = ray.ray.distanceToPoint(pw), tol = 10;
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
    const printSlate = () => slateBody.userData.print.draw({
      now: q('.r3w-now').textContent, ampm: q('.r3w-ampm').textContent, ready: q('.r3w-ready').textContent
    });
    printSlate();
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
