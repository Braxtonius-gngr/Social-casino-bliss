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
//     lettering (Special Elite for the lines, Oswald for the numbers), a
//     chalk ledge. Room: a dark board on the wall. Arm: the chalk's dust
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
const SAW = { at: [-30, 0, 32], yaw: -14 * DEG };
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
function buildSaw() {
  const g = new THREE.Group();
  const cowl = new THREE.MeshStandardMaterial({ color: 0x9a3a14, roughness: 0.55, metalness: 0.1 });
  const black = new THREE.MeshStandardMaterial({ color: 0x151412, roughness: 0.6, metalness: 0.3 });
  const steel = steelMat(0x3a3733, 0.45);
  // the body: the cowl over the engine, the fuel cap, the vents
  const body = new THREE.Mesh(roundedBox(26, 18, 15, 3.2), cowl); body.position.set(0, 9, 0); body.castShadow = true; g.add(body);
  const topC = new THREE.Mesh(roundedBox(20, 8, 13, 2.6), cowl); topC.position.set(-2, 21, 0); g.add(topC);
  // the oil and dust of years on the cowl
  K.finished(cowl, 'blast', 3, 3, 0.25);
  for (let i = 0; i < 5; i++) { const v = new THREE.Mesh(new THREE.BoxGeometry(0.5, 6, 0.6), black); v.position.set(-6 + i * 3, 9, -7.6); g.add(v); }
  const cap = new THREE.Mesh(new THREE.CylinderGeometry(2, 2, 1.2, 16), black); cap.position.set(-9, 16.6, 4); g.add(cap);
  const starter = new THREE.Mesh(new THREE.CylinderGeometry(5.5, 5.5, 1.2, 24), black); starter.rotation.x = Math.PI / 2; starter.position.set(-4, 9, 8); g.add(starter);
  const knob = new THREE.Mesh(new THREE.BoxGeometry(3, 1.6, 2.2), black); knob.position.set(-16, 11, 6); g.add(knob);
  // the rear handle and the trigger; the top handle's bar
  const rear = new THREE.Mesh(new THREE.TorusGeometry(6, 1.3, 10, 24, Math.PI * 1.2), black); rear.position.set(-18, 6, 0); rear.rotation.y = Math.PI / 2; rear.rotation.z = -0.3; g.add(rear);
  const bar = new THREE.Mesh(new THREE.CylinderGeometry(1.2, 1.2, 22, 12), black); bar.rotation.x = Math.PI / 2; bar.position.set(4, 21, 0); g.add(bar);
  const brake = new THREE.Mesh(new THREE.BoxGeometry(2, 9, 12), black); brake.position.set(13, 15, 0); g.add(brake);
  // the guide bar and the chain's cutters
  const gb = new THREE.Mesh(new THREE.BoxGeometry(58, 7.5, 0.9), steel); gb.position.set(42, 7, 0); gb.castShadow = true; g.add(gb);
  const nose = new THREE.Mesh(new THREE.CylinderGeometry(3.75, 3.75, 0.9, 20), steel); nose.rotation.x = Math.PI / 2; nose.position.set(71, 7, 0); g.add(nose);
  const slot = new THREE.Mesh(new THREE.BoxGeometry(30, 0.8, 1.0), black); slot.position.set(40, 7, 0); g.add(slot);
  const cutter = new THREE.InstancedMesh(new THREE.BoxGeometry(1.3, 1.4, 0.8), K.polishedOf(steel, 0.3), 50);
  const m4 = new THREE.Matrix4(), q = new THREE.Quaternion(), p = V(0, 0, 0), s = V(1, 1, 1);
  for (let i = 0; i < 50; i++) {
    const top = i < 25, x = 15 + (i % 25) * 2.3;
    q.setFromAxisAngle(V(0, 0, 1), top ? 0.25 : Math.PI - 0.25);
    p.set(x, top ? 11.3 : 2.7, (i % 2 ? 0.35 : -0.35));
    m4.compose(p, q, s); cutter.setMatrixAt(i, m4);
  }
  g.add(cutter);
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
function drawSlate(g, W, H, v) {
  const k = W / (SLATE.w * SLATE.px), P = n => n * k;
  g.fillStyle = '#1f2220'; g.fillRect(0, 0, W, H);
  const rnd = seeded(11);
  for (let i = 0; i < 2600; i++) { g.fillStyle = `rgba(230,226,214,${(rnd() * 0.08).toFixed(3)})`; g.fillRect(rnd() * W, rnd() * H, 1 + rnd() * 3, 1 + rnd() * 2); }
  const txt = (s, x, y, font, color, align = 'left') => { g.font = font; g.fillStyle = color; g.textAlign = align; g.fillText(s, x, y); };
  const chalk = '#e8e2d4', dim = 'rgba(232,226,212,0.72)', red = '#e0444e', gold = '#ffc107';
  txt('THE FLOOR', P(70), P(104), `${P(42)}px "Special Elite", monospace`, dim);
  txt(v.day.toUpperCase(), P(70), P(164), `${P(40)}px "Special Elite", monospace`, dim);
  txt(v.now, P(70), P(360), `600 ${P(200)}px Oswald, Impact, sans-serif`, chalk);
  g.font = `600 ${P(200)}px Oswald, Impact, sans-serif`;
  txt(v.ampm, P(70) + g.measureText(v.now).width + P(14), P(360), `${P(44)}px "Special Elite", monospace`, dim);
  txt(`NEXT READY  ${v.next}`, P(70), P(470), `${P(44)}px "Special Elite", monospace`, dim);
  txt(`DONE TODAY  ${v.done}`, P(70), P(540), `${P(44)}px "Special Elite", monospace`, dim);
  txt('TAP A TAG FOR ITS CARD · DRAG TO SWING THE HOOKS', P(70), H - P(60), `${P(32)}px "Special Elite", monospace`, 'rgba(232,226,212,0.5)');
  const R = W * 0.6;
  txt('READY', R, P(104), `${P(42)}px "Special Elite", monospace`, red);
  txt(v.ready, R, P(360), `600 ${P(260)}px Oswald, Impact, sans-serif`, chalk);
  txt(v.value, R, P(430), `${P(34)}px "Special Elite", monospace`, dim);
  const bx = R, by = P(470), bw = W - P(70) - R, bh = P(110);
  g.fillStyle = gold; g.fillRect(bx, by, bw, bh); g.fillStyle = '#0b0b0b'; g.fillRect(bx + P(6), by + P(6), bw, bh); g.fillStyle = gold; g.fillRect(bx, by, bw, bh);
  txt('DEAL YOUR HAND', bx + bw / 2, by + bh / 2 + P(16), `600 ${P(46)}px Oswald, Impact, sans-serif`, '#0b0b0b', 'center');
}
function slateHTML() {
  return `<div class="r3w-slate-in">
    <div class="r3w-l">
      <div class="r3w-eyebrow">THE FLOOR</div>
      <div class="r3w-day"></div>
      <div class="r3w-clock"><b class="r3w-now">--:--</b><small class="r3w-ampm"></small></div>
      <div class="r3w-line r3w-l1">NEXT READY&nbsp;&nbsp;<b class="r3w-next">&mdash;</b></div>
      <div class="r3w-line r3w-l2">DONE TODAY&nbsp;&nbsp;<b class="r3w-done">&mdash;</b></div>
      <div class="r3w-foot">TAP A TAG FOR ITS CARD &middot; DRAG TO SWING THE HOOKS</div>
    </div>
    <div class="r3w-r">
      <div class="r3w-eyebrow r3w-red">READY</div>
      <div class="r3w-ready">&mdash;</div>
      <div class="r3w-value"></div>
      <button type="button" class="r3w-run">DEAL YOUR HAND</button>
    </div>
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
      put(q('.r3w-day'), d.toLocaleDateString(undefined, { weekday: 'long', month: 'long', day: 'numeric' }));
      const st = (hand.length && hooks.status && hooks.status()) || sample();
      put(q('.r3w-ready'), String(st.ready));
      put(q('.r3w-value'), st.value > 0 ? `ABOUT $${st.value.toFixed(2)} IN SWEEPS COINS` : '');
      put(q('.r3w-next'), st.next ? K.fmtLeft(st.next).toUpperCase() : 'ALL CAUGHT UP');
      put(q('.r3w-done'), String(st.done));
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
      wake();
    };
    const putBack = () => {
      if (!cardId) return;
      liftFrom = lift; liftTo = 0; liftT0 = tNow;
      hideInfo();
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
      day: q('.r3w-day').textContent, now: q('.r3w-now').textContent, ampm: q('.r3w-ampm').textContent,
      next: q('.r3w-next').textContent, done: q('.r3w-done').textContent, ready: q('.r3w-ready').textContent, value: q('.r3w-value').textContent
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
