// THE ARCADE: Neon Grid's home at Showroom (three.js + CSS3D).
//
// After the roll intro has floated up, a tap on the landing starts one
// continuous shot, as it does for the card table (table.mjs) and the study
// (study.mjs): the camera rises out of the float, turns round - away from
// the gaming floor - and comes down into the seat at a cocktail-table
// arcade cabinet in the house's rooftop bar. The cabinet's CRT lies face up
// under its glass, running the game's attract mode as you come in, then
// the day's high-score table: each row one of your ready platforms. Behind
// the cabinet, the bar's steel window wall looks out over the roof - the
// terrace's festoon lights, the parapet, the street's roofs and water tower
// - to the red moon coming up over the city.
//
// Tap a row: its card comes up out of the screen to you, with its Keen
// Info and its moves (the card table's card and sheet). "Press start" runs
// your hand. "Enter the grid": you lean in over the glass until the
// picture fills your view, and the game's own camera takes you from there
// out along its grid, toward the same moon - your platforms the neon signs
// down the road, a tap on one bringing its card down to you. "Back to the
// cabinet" brings you out the way you came.
//
// The screen is a screen, not a window: what it shows is the game's camera,
// drawn into a picture, whatever angle you look at it from. The way in is
// a lean until that picture exactly fills the lens, then the game's camera
// seen through without the tube - the same frame - and on out along the
// grid; nothing is scaled to fake it, and the perspective is true all the
// way in (the game world is built to its own real scale, far under the
// floor, where the room can't see it and it can't see the room).
//
// Each piece held to a real maker, at three distances (across the room: the
// silhouette; at arm's length: materials, bevels, seams; pinched in 3x:
// print, grain, wear), for what its surfaces do with the light, what it
// touches, and how it moves:
//   The cabinet - an early-'80s cocktail-table cabinet from a Chicago
//     arcade builder: a box of black laminate over particleboard, a magenta
//     T-molding round the top, a smoked tempered-glass top with polished,
//     eased edges, a printed bezel card under the glass round a 25" tube,
//     and at your end a steel control panel with a screened overlay, a
//     ball-top stick in a dust washer and two concave buttons; a chrome
//     coin door on its side. Room: a low black box under a glowing sheet of
//     glass. Arm: the laminate's faint grain, the T-molding's rounded lip,
//     the glass's bright eased edge, the bezel card's pinstripes. 3x: the
//     screen print's dot, the stick's scuffed ball, the coin door's rivets.
//     Light: the laminate a soft satin sheen, the glass a mirror at a
//     grazing angle (Fresnel) and clear seen square on, the chrome a mirror,
//     the buttons' plastic a hard gloss. It stands on the floor (a contact
//     shadow); the key light drops the stick's shadow on the panel.
//   The screen - a raster CRT: black when off, its picture drawn in glowing
//     phosphor lines (scanlines), brightest at the middle and falling off
//     to the curved corners. It lights the glass over it, the panel and
//     your side of the room (the tube's own light).
//   The window wall - a steel-framed factory window in a painted brick
//     wall: black steel mullions and transoms, divided lights of clear
//     glass (Fresnel), a brick knee wall under it. Beyond it, lit by the
//     night alone: the terrace's roofing, a string of festoon bulbs, the
//     parapet's coping, the roofs across the street and a riveted water
//     tank on its stand, the skyline, and the sliced red moon low over it.
//     A neon sign hangs in the glass facing the street (so you read it from
//     behind: a moon over a grid, the same either way round).
//   The grid - the game: a black floor ruled in lines of light a stride
//     apart, sharp near and hazing to pink at the horizon; the moon on it;
//     your platforms' names in neon on signboards down both sides of the
//     road. Nothing in it is lit by the room, so nothing in the room lights
//     it.
//   Motion - the shot's glide in; the lean over the glass, with a small
//     sit-back first (the wind-up) and a steady settle into the frame; the
//     ride out along the road, easing to a stop; a card's rise and turn;
//     a pulse that runs down the grid now and then, as a scan does. None of
//     it happens with motion off: cuts, and nothing moving on its own.
//
// Coordinates are the seat's own, as the table's: centimetres, the origin
// on the glass top at the middle of its near edge's line, +z away from
// you, +y up, +x to your LEFT.

import * as THREE from '../vendor/three/three.module.js';
import { CSS3DRenderer, CSS3DObject } from '../vendor/three/three.addons.js';
import { tableKit as K } from './table.mjs';
import { moonTex, glowTex } from './moonrise.mjs';

export const DESTS = ['arcade'];

const DEG = Math.PI / 180;
const clamp01 = x => Math.min(Math.max(x, 0), 1);
const smoother = x => { x = clamp01(x); return x * x * x * (x * (6 * x - 15) + 10); };
const lerp = (a, b, k) => a + (b - a) * k;
const easeOut = (x, k = 3) => 1 - Math.pow(1 - clamp01(x), k);
const V = (x, y, z) => new THREE.Vector3(x, y, z);
const HERE = new URL('./', import.meta.url);
const asset = f => new URL(f, HERE).href;
function seeded(seed) { return () => { seed = (Math.imul(seed, 1664525) + 1013904223) >>> 0; return seed / 4294967296; }; }

// Where the arcade stands: behind the dice table's lens (the shot faces
// -z), so nothing out of its window is ever in the shot; the chair faces
// away from the gaming floor, and the camera comes in from behind it.
const ARCADE = { at: [180, 0, 700], yaw: 0 };
// The cabinet: its glass top 70 x 100, the near edge on the origin's line;
// the body inset under it to the floor; the control panel out at your end.
const TOP = { w: 70, d: 100, glass: 0.8, frame: 2, floor: -82 };
const BODY = { w: 58, d: 88 };
// The tube: a 25-inch raster monitor lying face up, its picture upright to
// you (the long side away from you), a little under the glass.
const SCREEN_Y = -2.2;
const SCREEN = { w: 37, d: 49, z: 50, y: SCREEN_Y, px: 30 };
// The window wall, behind the cabinet; the brick knee wall under it.
// (where the moon rises over the city: a little to your right)
const MOON_X = -900;
// (the neon sign hung in the glass: to your left of the moon)
const SIGN_X = 50;
const WALL = { z: 150, half: 270, sill: -30, head: 196, top: 900, side: -230 };
// The views from the seat: upright, a wide lens, the screen across the
// foot of the frame and the window over it; on its side, the natural one.
const VIEW = [{ eye: [0, 50, -12], aim: [0, 7.6, 88], fov: 66 }, { eye: [0, 44, -40], aim: [0, 17.2, 60], fov: 46 }];
// Leaning in over the tube to read it (a tap on the screen): over the
// near edge, looking down at the picture nearly square on, so each line of
// the table is a fingertip tall; the same lens as the seat's.
const FOCUS = [{ eye: [0, 52, 20], aim: [0, SCREEN_Y, 45], fov: 66 }, { eye: [0, 40, 30], aim: [0, SCREEN_Y, 51], fov: 46 }];
// The game: its world far under the floor at its own scale (centimetres);
// its camera - the one the screen shows - and where you stand inside.
// (six hundred metres down: out of each other's sight, the room's night
// and the game's, whichever way either camera looks)
const GRID = { at: [0, -60000, 0], cell: 500, near: -600, far: 46000, moonZ: 47000, moonR: 5200 };
const GAME = { eye: [0, 260, 0], aim: [0, 200, 6000], fov: 56 };
const INSIDE = { eye: [0, 170, 900], aim: [0, 330, 12000], fov: [66, 50] };
// The signs: one per platform down the road, left and right in turn.
const SIGN = { w: 560, h: 260, y: 460, x: 760, z0: 1500, dz: 950 };
// The shot's timings (seconds): the glide in, the table coming up on the
// screen, the dive (the lean, and the ride), a card's lift; and where in
// the dive the lens hands over from the room to the game.
const T = { fly: 4.8, uiIn: 0.7, dive: 4.2, lift: 0.55, pulse: 7, focus: 1.1 };
const CUT = 0.56;
// The cabinet glass's reflection (it goes as the lens comes down to the picture).
const GLASS_ENV = 0.16;

// ------------------------------------------------------------ textures
// The laminate: black, with the faint long grain of a woodgrain print
// under its satin face.
function laminateTex() {
  return K.canvasTex(512, 512, (g, w, h) => {
    g.fillStyle = '#0d0c10'; g.fillRect(0, 0, w, h);
    const rnd = seeded(5);
    for (let i = 0; i < 260; i++) {
      const y = rnd() * h, a = 0.02 + rnd() * 0.035;
      g.strokeStyle = `rgba(${rnd() > 0.5 ? '60,52,70' : '0,0,0'},${a.toFixed(3)})`;
      g.lineWidth = 0.6 + rnd() * 1.6;
      g.beginPath(); g.moveTo(0, y);
      for (let x = 0; x <= w; x += 32) g.lineTo(x, y + Math.sin(x * 0.01 + i) * 3);
      g.stroke();
    }
  });
}
// The bezel card under the glass: black stock, screen-printed - two
// pinstripes (magenta, cyan) round the tube's window, a grid running away
// under a small sliced moon at the far end, the maker's plate lettering
// and the coin legend at your end, in the dot of a screen print.
function bezelTex() {
  const k = 12, W = TOP.w * k, D = TOP.d * k;
  return K.canvasTex(W, D, (g) => {
    g.fillStyle = '#07060b'; g.fillRect(0, 0, W, D);
    // (canvas y runs from the far end (top) to your end (bottom); x from
    // your left to your right)
    const sx = (TOP.w - SCREEN.w) / 2 * k, sy = (TOP.d - SCREEN.z - SCREEN.d / 2) * k;
    const sw = SCREEN.w * k, sh = SCREEN.d * k;
    const rr = (x, y, w, h, r) => { g.beginPath(); g.moveTo(x + r, y); g.arcTo(x + w, y, x + w, y + h, r); g.arcTo(x + w, y + h, x, y + h, r); g.arcTo(x, y + h, x, y, r); g.arcTo(x, y, x + w, y, r); g.closePath(); };
    // the pinstripes
    [[1.4, '#ff2d95'], [2.4, '#00e5ff']].forEach(([o, c]) => { g.strokeStyle = c; g.lineWidth = 0.22 * k; rr(sx - o * k, sy - o * k, sw + 2 * o * k, sh + 2 * o * k, (2.2 + o) * k); g.stroke(); });
    // the far end: a grid in perspective under a small sliced moon
    const cx = W / 2, hy = sy - 6.2 * k;
    g.save();
    g.beginPath(); g.rect(4 * k, 3 * k, W - 8 * k, hy - 3 * k + 3.4 * k); g.clip();
    g.fillStyle = '#ff2d55';
    g.beginPath(); g.arc(cx, hy, 3.2 * k, Math.PI, 0); g.fill();
    g.fillStyle = '#07060b';
    [0.7, 1.4, 2.0].forEach((y, i) => g.fillRect(cx - 4 * k, hy - y * k, 8 * k, (0.16 + i * 0.06) * k));
    g.strokeStyle = 'rgba(255,45,149,0.8)'; g.lineWidth = 0.1 * k;
    for (let i = -8; i <= 8; i++) { g.beginPath(); g.moveTo(cx + i * 0.6 * k, hy); g.lineTo(cx + i * 4.2 * k, hy + 3.4 * k); g.stroke(); }
    for (let j = 1; j <= 5; j++) { const y = hy + 3.4 * k * Math.pow(j / 5, 1.8); g.beginPath(); g.moveTo(0, y); g.lineTo(W, y); g.stroke(); }
    g.restore();
    // your end: the coin legend and the maker's line
    g.textAlign = 'center';
    g.fillStyle = '#ffcc00'; g.font = `700 ${1.5 * k}px Orbitron, Rajdhani, sans-serif`;
    g.fillText('1 COIN  ·  1 RUN', cx, sy + sh + 4.6 * k);
    g.fillStyle = 'rgba(226,241,236,0.55)'; g.font = `600 ${0.9 * k}px Rajdhani, sans-serif`;
    g.fillText('DAILY ROLL OVER  ·  COCKTAIL TABLE  ·  MADE IN CHICAGO', cx, sy + sh + 6.6 * k);
    // the screen print's dot: a faint halftone over the ink
    g.fillStyle = 'rgba(0,0,0,0.18)';
    for (let y = 0; y < D; y += 5) for (let x = (y / 5) % 2 ? 2.5 : 0; x < W; x += 5) g.fillRect(x, y, 1.2, 1.2);
    // the tube's window, cut out of the card
    g.globalCompositeOperation = 'destination-out';
    g.fillStyle = '#000';
    rr(sx, sy, sw, sh, 2.2 * k); g.fill();
    g.globalCompositeOperation = 'source-over';
  });
}
// The control panel's overlay: a screened steel plate - black, the grid
// again, the stick's gate marked, the buttons ringed and lettered.
function panelTex() {
  const W = 1024, H = 320;
  return K.canvasTex(W, H, (g) => {
    g.fillStyle = '#0b0a10'; g.fillRect(0, 0, W, H);
    g.strokeStyle = 'rgba(255,45,149,0.28)'; g.lineWidth = 2;
    for (let x = -W; x < 2 * W; x += 64) { g.beginPath(); g.moveTo(W / 2 + (x - W / 2) * 0.35, 0); g.lineTo(x, H); g.stroke(); }
    for (let y = 40; y < H; y += 60) { g.beginPath(); g.moveTo(0, y); g.lineTo(W, y); g.stroke(); }
    g.fillStyle = 'rgba(226,241,236,0.72)'; g.font = '700 26px Rajdhani, sans-serif'; g.textAlign = 'center';
    // (the canvas's x runs from your left to your right, as the panel does)
    g.fillText('START', W * 0.5, H - 34);
    g.fillText('FIRE', W * 0.69, H - 34); g.fillText('BOOST', W * 0.84, H - 34);
    g.strokeStyle = 'rgba(0,229,255,0.7)'; g.lineWidth = 3;
    g.beginPath(); g.arc(W * 0.24, H * 0.46, 70, 0, Math.PI * 2); g.stroke();
  });
}
// Brick, painted a dark aubergine and worn back to the red at the arrises.
function brickTex() {
  return K.canvasTex(512, 512, (g, w, h) => {
    g.fillStyle = '#141018'; g.fillRect(0, 0, w, h);
    const rnd = seeded(17), bh = 32, bw = 96;
    for (let r = 0; r < h / bh; r++) for (let c = -1; c < w / bw + 1; c++) {
      const x = c * bw + (r % 2 ? bw / 2 : 0), y = r * bh, v = 20 + rnd() * 10;
      g.fillStyle = `rgb(${v + 6},${v - 4},${v + 10})`;
      g.fillRect(x + 3, y + 3, bw - 6, bh - 6);
      if (rnd() < 0.25) { g.fillStyle = 'rgba(120,40,40,0.18)'; g.fillRect(x + 3 + rnd() * (bw - 30), y + 3, 12 + rnd() * 20, 3); }
    }
  });
}
// The roofs across the street and the skyline beyond: blocks of dark with
// their windows, most dark, some lit warm or blue-white by televisions.
function windowsTex(seed, lit = 0.22) {
  return K.canvasTex(256, 512, (g, w, h) => {
    g.fillStyle = '#0a0910'; g.fillRect(0, 0, w, h);
    const rnd = seeded(seed);
    for (let y = 12; y < h - 8; y += 22) for (let x = 10; x < w - 10; x += 20) {
      if (rnd() > lit) { g.fillStyle = 'rgba(40,36,60,0.5)'; g.fillRect(x, y, 10, 12); continue; }
      g.fillStyle = rnd() < 0.7 ? `rgba(255,${190 + rnd() * 50 | 0},${120 + rnd() * 60 | 0},0.9)` : 'rgba(170,200,255,0.85)';
      g.fillRect(x, y, 10, 12);
    }
  });
}
// The night: black overhead, going through violet to the city's magenta
// glow along the horizon (row y0 of the canvas is the horizon's line).
function skyTex() {
  return K.canvasTex(64, 1024, (g, w, h) => {
    const gr = g.createLinearGradient(0, 0, 0, h);
    gr.addColorStop(0, '#020107'); gr.addColorStop(0.45, '#0b0520'); gr.addColorStop(0.72, '#2a0b3c');
    gr.addColorStop(0.86, '#6a1450'); gr.addColorStop(0.93, '#b0266a'); gr.addColorStop(1, '#ff4a78');
    g.fillStyle = gr; g.fillRect(0, 0, w, h);
  });
}
// A neon sign on its backer, drawn as it glows: the tubes' white-hot cores
// in their coloured sheaths, the bloom round them; the backer black.
function neonTex(w, h, draw) {
  return K.canvasTex(w, h, (g) => {
    g.fillStyle = '#050409'; g.fillRect(0, 0, w, h);
    const tube = (path, color, width) => {
      g.lineCap = 'round'; g.lineJoin = 'round';
      [[width * 5, 0.16], [width * 2.6, 0.35], [width * 1.3, 0.9]].forEach(([lw, a]) => { g.globalAlpha = a; g.strokeStyle = color; g.lineWidth = lw; path(); g.stroke(); });
      g.globalAlpha = 1; g.strokeStyle = 'rgba(255,255,255,0.92)'; g.lineWidth = width * 0.42; path(); g.stroke();
    };
    draw(g, tube);
  });
}

// ------------------------------------------------------------ the cabinet
// A slab with rounded corners, h thick, standing on y = 0 (a rounded
// opening through it, if a hole [w, d, r, dz] is given).
function roundRectPath(p, w, d, r, dz = 0) {
  const x = w / 2, z = d / 2;
  p.moveTo(-x + r, -z + dz); p.lineTo(x - r, -z + dz); p.quadraticCurveTo(x, -z + dz, x, -z + r + dz); p.lineTo(x, z - r + dz); p.quadraticCurveTo(x, z + dz, x - r, z + dz);
  p.lineTo(-x + r, z + dz); p.quadraticCurveTo(-x, z + dz, -x, z - r + dz); p.lineTo(-x, -z + r + dz); p.quadraticCurveTo(-x, -z + dz, -x + r, -z + dz);
  return p;
}
function roundedBox(w, h, d, r, hole) {
  const s = roundRectPath(new THREE.Shape(), w, d, r);
  if (hole) s.holes.push(roundRectPath(new THREE.Path(), hole[0], hole[1], hole[2], hole[3] || 0));
  const geo = new THREE.ExtrudeGeometry(s, { depth: h, bevelEnabled: false, curveSegments: 8 });
  geo.rotateX(Math.PI / 2); geo.translate(0, h, 0);
  return geo;
}
function buildCabinet(set) {
  const g = new THREE.Group();
  const lam = new THREE.MeshStandardMaterial({ map: laminateTex(), color: 0xffffff, roughness: 0.48, metalness: 0 });
  lam.map.wrapS = lam.map.wrapT = THREE.RepeatWrapping; lam.map.repeat.set(2, 1);
  const zc = TOP.d / 2;
  // the body, to the floor, and its recessed kick
  const bodyH = -TOP.frame - TOP.glass - TOP.floor - 6;
  const body = new THREE.Mesh(roundedBox(BODY.w, bodyH, BODY.d, 2.5), lam);
  body.position.set(0, TOP.floor + 6, zc); body.castShadow = true; body.receiveShadow = true;
  const kick = new THREE.Mesh(roundedBox(BODY.w - 4, 6, BODY.d - 4, 2), new THREE.MeshStandardMaterial({ color: 0x050407, roughness: 0.8 }));
  kick.position.set(0, TOP.floor, zc);
  // the top frame the glass sits in, and its T-molding: magenta vinyl with
  // a rounded lip, round the frame's edge
  // (open over the tube: the picture is seen through it)
  const frame = new THREE.Mesh(roundedBox(TOP.w, TOP.frame, TOP.d, 4, [SCREEN.w + 1.2, SCREEN.d + 1.2, 2.4, SCREEN.z - TOP.d / 2]), lam);
  frame.position.set(0, -TOP.glass - TOP.frame, zc); frame.castShadow = true; frame.receiveShadow = true;
  const tm = new THREE.MeshPhysicalMaterial({ color: 0xff1f8e, roughness: 0.32, clearcoat: 0.6, clearcoatRoughness: 0.3 });
  const moldPath = new THREE.CurvePath();
  {
    const x = TOP.w / 2 + 0.35, z = TOP.d / 2 + 0.35, r = 4.35, pts = [];
    const corner = (cx, cz, a0) => { for (let i = 0; i <= 8; i++) { const a = a0 + (i / 8) * Math.PI / 2; pts.push(V(cx + Math.cos(a) * r, 0, cz + Math.sin(a) * r)); } };
    corner(x - r, z - r, 0); corner(-x + r, z - r, Math.PI / 2); corner(-x + r, -z + r, Math.PI); corner(x - r, -z + r, Math.PI * 1.5);
    moldPath.add(new THREE.CatmullRomCurve3(pts, true));
  }
  const mold = new THREE.Mesh(new THREE.TubeGeometry(moldPath.curves[0], 160, TOP.frame / 2 + 0.05, 8, true), tm);
  mold.scale.set(1, 1.0, 1); mold.position.set(0, -TOP.glass - TOP.frame / 2, zc);
  // the bezel card, under the glass
  const bezel = new THREE.Mesh(new THREE.PlaneGeometry(TOP.w - 2, TOP.d - 2), new THREE.MeshStandardMaterial({ map: bezelTex(), transparent: true, roughness: 0.55 }));
  // (turned in its own plane, then laid down: its far end away from you,
  // its lettering reading to you)
  // (lying on the frame, under the glass)
  bezel.rotation.set(-Math.PI / 2, 0, Math.PI); bezel.position.set(0, -TOP.glass + 0.02, zc); bezel.receiveShadow = true;
  // the tube's well: black, the picture tube's face below the card
  const well = new THREE.Mesh(new THREE.BoxGeometry(SCREEN.w + 1.2, 1.6, SCREEN.d + 1.2), new THREE.MeshStandardMaterial({ color: 0x020203, roughness: 0.9, side: THREE.BackSide }));
  well.position.set(0, SCREEN.y + 0.6, SCREEN.z);
  // the glass: tempered, smoked a little, its edges eased and polished;
  // colourless - what shows on it is what it reflects (Fresnel)
  // (black: glass has no colour of its own to light - only what it reflects)
  const glassMat = K.glassy(new THREE.MeshStandardMaterial({ color: 0x000000, transparent: true, opacity: 0, roughness: 0.03, metalness: 0, depthWrite: false, envMapIntensity: GLASS_ENV }), 0.55, 0.5);
  const glass = new THREE.Mesh(roundedBox(TOP.w - 2, TOP.glass, TOP.d - 2, 3.4), glassMat);
  glass.position.set(0, -TOP.glass, zc); glass.renderOrder = 3;
  g.add(body, kick, frame, mold, bezel, well, glass);
  // the control panel, out at your end: a sloped steel box, its overlay,
  // the stick and the buttons
  const steel = new THREE.MeshStandardMaterial({ color: 0x17161c, metalness: 0.7, roughness: 0.36 });
  const pan = new THREE.Group();
  const pw = 50, pd = 14;
  const box = new THREE.Mesh(new THREE.BoxGeometry(pw, 16, pd), lam);
  box.position.set(0, -15, -pd / 2 + 4); box.castShadow = true; box.receiveShadow = true;
  const overlay = new THREE.Mesh(new THREE.PlaneGeometry(pw - 1, pd - 0.5), new THREE.MeshStandardMaterial({ map: panelTex(), roughness: 0.4, metalness: 0.3 }));
  // (laid on the box's sloped top, its lettering reading to you)
  overlay.rotation.set(-Math.PI / 2 + 0.12, 0, Math.PI);
  overlay.position.set(0, -7 + 0.02, -pd / 2 + 4);
  overlay.receiveShadow = true;
  const lip = new THREE.Mesh(new THREE.BoxGeometry(pw + 0.6, 0.6, 1.2), steel);
  lip.position.set(0, -7.4, -pd + 4.2);
  pan.add(box, overlay, lip);
  // the stick: a black shaft in a dust washer, a red ball top, scuffed
  const stickX = pw * 0.26, stickZ = -pd / 2 + 4.2;
  const washer = new THREE.Mesh(new THREE.CylinderGeometry(2.2, 2.2, 0.15, 32), new THREE.MeshStandardMaterial({ color: 0x0a0a0c, roughness: 0.5 }));
  washer.position.set(stickX, -6.3, stickZ);
  const shaft = new THREE.Mesh(new THREE.CylinderGeometry(0.42, 0.45, 6.2, 16), new THREE.MeshStandardMaterial({ color: 0x0c0c0f, metalness: 0.6, roughness: 0.3 }));
  shaft.position.set(stickX, -3.2, stickZ);
  const ball = new THREE.Mesh(new THREE.SphereGeometry(1.75, 32, 24), new THREE.MeshPhysicalMaterial({ color: 0xd8102e, roughness: 0.22, clearcoat: 0.7, clearcoatRoughness: 0.18 }));
  ball.position.set(stickX, 0.2, stickZ);
  [washer, shaft, ball].forEach(m => { m.castShadow = true; });
  pan.add(washer, shaft, ball);
  // the buttons: concave plastic caps in chrome-less black housings
  const cap = c => new THREE.MeshPhysicalMaterial({ color: c, roughness: 0.2, clearcoat: 0.8, clearcoatRoughness: 0.12 });
  [[-pw * 0.19, 0x00d8f0, 1.45], [-pw * 0.34, 0xff1f8e, 1.45], [0, 0xf2f2f5, 0.95]].forEach(([x, c, r], i) => {
    const ring = new THREE.Mesh(new THREE.CylinderGeometry(r + 0.4, r + 0.5, 0.5, 32), new THREE.MeshStandardMaterial({ color: 0x0b0b0e, roughness: 0.35 }));
    const top = new THREE.Mesh(new THREE.CylinderGeometry(r, r, 0.55, 32), cap(c));
    const zz = stickZ + (i === 2 ? 1.2 : 0), y = -6.9 + 0.12 * ((zz - stickZ) / pd) + 0.35;
    ring.position.set(x, y - 0.1, zz); top.position.set(x, y + 0.25, zz);
    ring.rotation.x = top.rotation.x = 0.12;
    top.castShadow = true;
    pan.add(ring, top);
  });
  g.add(pan);
  // the coin door, on its right side: a chrome plate, two coin entries,
  // their reject buttons lit red
  const chrome = new THREE.MeshStandardMaterial({ color: 0xd9dbe2, metalness: 1, roughness: 0.12 });
  const door = new THREE.Mesh(new THREE.BoxGeometry(0.5, 26, 18), chrome);
  door.position.set(-BODY.w / 2 - 0.25, -30, 32);
  const redLamp = new THREE.MeshBasicMaterial({ color: new THREE.Color(2.2, 0.25, 0.3) });
  [26, 38].forEach(z => {
    const entry = new THREE.Mesh(new THREE.BoxGeometry(0.3, 3.2, 2.2), redLamp);
    entry.position.set(-BODY.w / 2 - 0.55, -24, z - 5.5 + 0.9 + (z === 38 ? 0 : 0));
    const slot = new THREE.Mesh(new THREE.BoxGeometry(0.3, 2.2, 0.3), new THREE.MeshBasicMaterial({ color: 0x000000 }));
    slot.position.set(-BODY.w / 2 - 0.62, -24, z - 5.5 + 0.9);
    g.add(entry, slot);
  });
  g.add(door);
  return { group: g, glassMat, glass };
}

// ------------------------------------------------------------ the screen
// The tube's face: its picture is the game's camera (a render target), or
// black - drawn as phosphor lines, brightest at the middle, dimming into
// the curved corners. crt: how much of the tube shows (1: the lines, the
// falloff and the corners; 0: the picture alone, as the lens hands over).
function screenMaterial(tex) {
  return new THREE.ShaderMaterial({
    uniforms: { tGame: { value: tex }, mixGame: { value: 1 }, crt: { value: 1 }, lines: { value: SCREEN.d * 11 }, gain: { value: 1 } },
    vertexShader: `
      varying vec2 vUv;
      void main() { vUv = uv; gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0); }`,
    fragmentShader: `
      uniform sampler2D tGame; uniform float mixGame, crt, lines, gain;
      varying vec2 vUv;
      void main() {
        vec3 pic = texture2D(tGame, vUv).rgb * mixGame * gain;
        // the scanlines, the falloff to the corners, the shadow mask's faint rgb
        float scan = 0.62 + 0.38 * pow(abs(sin(vUv.y * lines * 3.14159)), 1.4);
        vec2 c = vUv - 0.5;
        float fall = 1.0 - smoothstep(0.18, 0.62, length(c * vec2(1.0, 0.78)));
        float corner = smoothstep(0.5, 0.47, max(abs(c.x), abs(c.y) * 0.98) + 0.06 * dot(c, c));
        vec3 mask = vec3(1.0 + 0.08 * sin(vUv.x * 2600.0), 1.0 + 0.08 * sin(vUv.x * 2600.0 + 2.1), 1.0 + 0.08 * sin(vUv.x * 2600.0 + 4.2));
        vec3 tube = pic * scan * mix(0.72, 1.12, fall) * mask * corner + vec3(0.006, 0.007, 0.01) * corner;
        gl_FragColor = vec4(mix(pic, tube, crt), 1.0);
        #include <tonemapping_fragment>
        #include <colorspace_fragment>
      }`
  });
}

// ------------------------------------------------------------ the room
function buildRoom(set) {
  const g = new THREE.Group();
  const brick = new THREE.MeshStandardMaterial({ map: brickTex(), roughness: 0.92 });
  brick.map.wrapS = brick.map.wrapT = THREE.RepeatWrapping;
  const wallMesh = (w, h, rx, ry) => { const m = brick.clone(); m.map = brick.map.clone(); m.map.repeat.set(w / 150, h / 150); m.map.needsUpdate = true; return new THREE.Mesh(new THREE.PlaneGeometry(w, h), m); };
  const W2 = WALL.half, fl = TOP.floor;
  // the knee wall under the window, and the wall over it (to the dark)
  const knee = wallMesh(2 * W2, WALL.sill - fl);
  knee.rotation.y = Math.PI; knee.position.set(0, (WALL.sill + fl) / 2, WALL.z); knee.receiveShadow = true;
  const over = wallMesh(2 * W2, WALL.top - WALL.head);
  over.rotation.y = Math.PI; over.position.set(0, (WALL.top + WALL.head) / 2, WALL.z);
  // the side walls, back to behind the chair (the alcove's mouth open)
  [-1, 1].forEach(s => {
    const side = wallMesh(WALL.z - WALL.side, WALL.top - fl);
    side.rotation.y = s * Math.PI / 2 * -1;
    side.position.set(s * W2, (WALL.top + fl) / 2, (WALL.z + WALL.side) / 2);
    side.material.side = THREE.DoubleSide;
    g.add(side);
  });
  // the bar's floor: polished concrete, a little of the night in it
  const floor = new THREE.Mesh(new THREE.PlaneGeometry(2 * W2, WALL.z - WALL.side), new THREE.MeshStandardMaterial({ color: 0x0c0b10, roughness: 0.34, metalness: 0.1 }));
  floor.rotation.x = -Math.PI / 2; floor.position.set(0, fl + 0.2, (WALL.z + WALL.side) / 2); floor.receiveShadow = true;
  g.add(knee, over, floor);
  // the window: black steel sections - mullions every 60, transoms at a
  // third and two thirds - and clear glass in each light
  const steel = new THREE.MeshStandardMaterial({ color: 0x0b0b0d, metalness: 0.5, roughness: 0.5 });
  const H = WALL.head - WALL.sill;
  const bars = [];
  for (let x = -W2; x <= W2 + 0.1; x += 60) bars.push([x, (WALL.sill + WALL.head) / 2, 4.2, H + 4]);
  [WALL.sill, WALL.sill + H * 0.36, WALL.sill + H * 0.72, WALL.head].forEach(y => bars.push([0, y, 2 * W2, 4.2]));
  bars.forEach(([x, y, w, h]) => {
    const b = new THREE.Mesh(new THREE.BoxGeometry(w, h, 6), steel);
    b.position.set(x, y, WALL.z); b.castShadow = true;
    g.add(b);
  });
  const pane = K.glassy(new THREE.MeshStandardMaterial({ color: 0x000000, transparent: true, opacity: 0, roughness: 0.04, metalness: 0, depthWrite: false, envMapIntensity: 0.25 }), 0.35, 0.35);
  const glassPane = new THREE.Mesh(new THREE.PlaneGeometry(2 * W2, H), pane);
  glassPane.rotation.y = Math.PI; glassPane.position.set(0, (WALL.sill + WALL.head) / 2, WALL.z + 1.5); glassPane.renderOrder = 2;
  g.add(glassPane);
  // the sign in the glass, facing the street: a moon over a grid, in
  // tubes - you see it from behind, the same either way round
  const signTex = neonTex(512, 512, (c, tube) => {
    const cx = 256, cy = 230, r = 150;
    tube(() => { c.beginPath(); c.arc(cx, cy, r, Math.PI * 0.94, Math.PI * 2.06); c.stroke(); }, '#ff2d55', 14);
    [0, 1, 2].forEach(i => tube(() => { c.beginPath(); const y = cy + 18 + i * 34, dx = Math.sqrt(Math.max(0, r * r - (y - cy) * (y - cy))); c.moveTo(cx - dx + 12, y); c.lineTo(cx + dx - 12, y); c.stroke(); }, '#ff2d95', 10));
    tube(() => { c.beginPath(); c.moveTo(56, 440); c.lineTo(456, 440); c.moveTo(cx, cy + r + 20); c.lineTo(cx, 440); c.moveTo(cx - 60, cy + r + 20); c.lineTo(cx - 170, 440); c.moveTo(cx + 60, cy + r + 20); c.lineTo(cx + 170, 440); c.stroke(); }, '#00e5ff', 9);
  });
  const signMat = new THREE.MeshBasicMaterial({ map: signTex, color: new THREE.Color(2.2, 2.2, 2.2), transparent: true, blending: THREE.AdditiveBlending, depthWrite: false });
  const sign = new THREE.Mesh(new THREE.PlaneGeometry(30, 30), signMat);
  sign.rotation.y = Math.PI; sign.position.set(SIGN_X, 4, WALL.z - 3);
  // (its backer's chains up to the transom)
  const chainMat = new THREE.MeshStandardMaterial({ color: 0x8a8a90, metalness: 1, roughness: 0.35 });
  [-10.5, 10.5].forEach(dx => { const top = WALL.sill + H * 0.36, bot = 4 + 15; const ch = new THREE.Mesh(new THREE.CylinderGeometry(0.15, 0.15, top - bot), chainMat); ch.position.set(SIGN_X + dx, (top + bot) / 2, WALL.z - 3); g.add(ch); });
  g.add(sign);
  return { group: g, signMat };
}

// ------------------------------------------------------------ outside
// The night beyond the glass, at its real distances, lit by nothing in
// the room: the terrace, its bulbs, the parapet; the roofs across the
// street and the water tank; the skyline; the moon; the sky.
function buildOutside() {
  const g = new THREE.Group();
  const night = c => new THREE.MeshBasicMaterial({ color: c, fog: false });
  const fl = TOP.floor + 0.6;
  // the terrace: roofing membrane, wet in places - a dark sheen of the sky
  const deck = new THREE.Mesh(new THREE.PlaneGeometry(1400, 620), new THREE.MeshBasicMaterial({ fog: false, map: K.canvasTex(256, 128, (c, w, h) => {
    c.fillStyle = '#0c0a12'; c.fillRect(0, 0, w, h);
    const rnd = seeded(23);
    for (let i = 0; i < 26; i++) { const x = rnd() * w, y = rnd() * h, rx = 10 + rnd() * 40, ry = 3 + rnd() * 8; const gr = c.createRadialGradient(x, y, 0, x, y, rx); gr.addColorStop(0, 'rgba(120,40,90,0.35)'); gr.addColorStop(1, 'rgba(0,0,0,0)'); c.fillStyle = gr; c.beginPath(); c.ellipse(x, y, rx, ry, 0, 0, Math.PI * 2); c.fill(); }
  }) }));
  deck.rotation.x = -Math.PI / 2; deck.position.set(0, fl, WALL.z + 310);
  // the parapet and its coping
  const parapet = new THREE.Mesh(new THREE.BoxGeometry(1400, 95, 30), night(0x0d0b12));
  parapet.position.set(0, fl + 47.5, WALL.z + 620);
  const coping = new THREE.Mesh(new THREE.BoxGeometry(1400, 6, 40), night(0x241c26));
  coping.position.set(0, fl + 98, WALL.z + 620);
  g.add(deck, parapet, coping);
  // festoon bulbs: two strings from the wall's head to posts at the
  // parapet, sagging between; warm filaments
  const bulbs = [];
  [[-150, 150], [170, 380]].forEach(([x0, x1], s) => {
    const a = V(x0, WALL.head + 20, WALL.z + 10), b = V(x1, fl + 210, WALL.z + 610);
    for (let i = 1; i < 26; i++) {
      const u = i / 26, p = a.clone().lerp(b, u);
      p.y -= Math.sin(Math.PI * u) * 38;
      bulbs.push(p);
    }
    const post = new THREE.Mesh(new THREE.CylinderGeometry(3, 3, 215, 8), night(0x0a090c));
    post.position.set(x1, fl + 107, WALL.z + 612); g.add(post);
  });
  const bulbMesh = new THREE.InstancedMesh(new THREE.SphereGeometry(1.9, 10, 8), new THREE.MeshBasicMaterial({ color: new THREE.Color(2.6, 1.35, 0.42), fog: false }), bulbs.length);
  const m4 = new THREE.Matrix4();
  bulbs.forEach((p, i) => { m4.makeTranslation(p.x, p.y, p.z); bulbMesh.setMatrixAt(i, m4); });
  g.add(bulbMesh);
  // the roofs across the street, and the skyline
  const rnd = seeded(41);
  const block = (x, z, w, h, d, seed, lit) => {
    const tex = windowsTex(seed, lit);
    tex.wrapS = tex.wrapT = THREE.RepeatWrapping; tex.repeat.set(Math.max(1, w / 900), Math.max(1, h / 1400));
    const face = new THREE.MeshBasicMaterial({ map: tex, fog: false });
    // (the lit face is the box's +z, turned round to face the bar)
    const b = new THREE.Mesh(new THREE.BoxGeometry(w, h, d), [night(0x07060b), night(0x07060b), night(0x07060b), night(0x07060b), face, night(0x07060b)]);
    b.rotation.y = Math.PI;
    b.position.set(x, fl - 1200 + h / 2, z);
    return b;
  };
  // (across the street, their roofs about ours: from -40 to +140 over it)
  let x = -2600;
  while (x < 2600) { const w = 500 + rnd() * 700, h = 1200 + (-40 + rnd() * 180); g.add(block(x + w / 2, WALL.z + 2600 + rnd() * 300, w, h, 900, 100 + (x | 0), 0.16)); x += w; }
  // the water tank, on the roof across the street, to your left of the moon
  {
    const tx = 520, tz = WALL.z + 2700, base = fl + 120;
    const staves = new THREE.MeshBasicMaterial({ fog: false, map: K.canvasTex(256, 64, (c, w, h) => { c.fillStyle = '#100c10'; c.fillRect(0, 0, w, h); for (let i = 0; i < w; i += 8) { c.fillStyle = `rgba(60,30,40,${0.2 + (i % 16 ? 0 : 0.1)})`; c.fillRect(i, 0, 1, h); } }) });
    const tank = new THREE.Mesh(new THREE.CylinderGeometry(160, 170, 330, 24, 1, true), staves);
    tank.position.set(tx, base + 360 + 165, tz);
    const roof = new THREE.Mesh(new THREE.ConeGeometry(180, 120, 24), night(0x0b090d));
    roof.position.set(tx, base + 360 + 330 + 60, tz);
    const hoopMat = night(0x2a1a24);
    [60, 150, 240, 310].forEach(y => { const hoop = new THREE.Mesh(new THREE.TorusGeometry(168, 3, 6, 32), hoopMat); hoop.rotation.x = Math.PI / 2; hoop.position.set(tx, base + 360 + y, tz); g.add(hoop); });
    [[-1, -1], [1, -1], [-1, 1], [1, 1]].forEach(([a, b]) => { const leg = new THREE.Mesh(new THREE.CylinderGeometry(6, 6, 360, 6), night(0x09080b)); leg.position.set(tx + a * 110, base + 180, tz + b * 110); g.add(leg); });
    g.add(tank, roof);
  }
  // (the skyline, farther: taller, most of them dark)
  x = -14000;
  while (x < 14000) {
    const w = 1400 + rnd() * 2600, mid = x + w / 2;
    // (low roofs under the moon - its slices go down behind them - and the
    // towers either side)
    const near = Math.abs(mid - MOON_X) < 3200, h = near ? 1200 + 80 + rnd() * 160 : 1200 + 300 + rnd() * 1500;
    g.add(block(mid, WALL.z + 9000 + rnd() * 3000, w, h, 1500, 900 + (x | 0), 0.08)); x += w;
  }
  // the moon: low over the city, the lower half's slices under the
  // skyline; its halo on the sky
  const moonR = 1500, moonZ = WALL.z + 21000, moonY = 50 + moonZ * Math.tan(3.2 * DEG);
  const moon = new THREE.Mesh(new THREE.PlaneGeometry(2 * moonR, 2 * moonR), new THREE.MeshBasicMaterial({ map: moonTex(), transparent: true, fog: false, depthWrite: false }));
  moon.rotation.y = Math.PI; moon.position.set(MOON_X, moonY, moonZ); moon.renderOrder = -2;
  const halo = new THREE.Mesh(new THREE.PlaneGeometry(moonR * 5, moonR * 5), new THREE.MeshBasicMaterial({ map: glowTex(), color: new THREE.Color(0.9, 0.12, 0.3), transparent: true, opacity: 0.55, blending: THREE.AdditiveBlending, depthWrite: false, fog: false }));
  halo.rotation.y = Math.PI; halo.position.set(MOON_X, moonY, moonZ + 50); halo.renderOrder = -3;
  // the sky: the horizon's line at the eye's level
  const skyZ = WALL.z + 26000, skyH = 30000;
  const sky = new THREE.Mesh(new THREE.PlaneGeometry(80000, skyH), new THREE.MeshBasicMaterial({ map: skyTex(), fog: false, depthWrite: false }));
  // (its foot at the street, under the skyline; its glow just over the roofs)
  sky.rotation.y = Math.PI; sky.position.set(0, fl - 1200 + skyH / 2, skyZ); sky.renderOrder = -4;
  g.add(sky, halo, moon);
  return { group: g, moonAt: V(MOON_X, moonY, moonZ) };
}

// ------------------------------------------------------------ the grid (the game)
// The floor: lines of light a stride apart on black, drawn in the grid's
// own frame; anti-aliased by their own derivatives, so they stay lines to
// the horizon, where they haze into the city's pink. pulse: where the scan
// running toward you is (0: none).
function gridFloorMaterial() {
  return new THREE.ShaderMaterial({
    fog: false,
    uniforms: { cell: { value: GRID.cell }, far: { value: GRID.far }, pulse: { value: -1 }, gain: { value: 1 } },
    vertexShader: `
      varying vec2 vG;
      void main() { vG = vec2(position.x, -position.y); gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0); }`,
    fragmentShader: `
      uniform float cell, far, pulse, gain;
      varying vec2 vG;
      float lineAt(float c, float w) {
        float d = abs(fract(c / cell + 0.5) - 0.5) * cell;
        float fw = fwidth(c) + 1e-3;
        float core = 1.0 - smoothstep(w * 0.5 - fw, w * 0.5 + fw, d);
        float sheath = exp(-d * d / (w * w * 4.0 + fw * fw * 3.0));
        return core + 0.28 * sheath;
      }
      void main() {
        float k = clamp(vG.y / far, 0.0, 1.0);
        float g = max(lineAt(vG.x, 7.0), lineAt(vG.y, 7.0));
        // (a tube's colour: hot magenta, a paler core only where it is
        // brightest, going to the city's pink in the haze)
        vec3 near = vec3(1.0, 0.18, 0.62), haze = vec3(0.9, 0.2, 0.52);
        vec3 col = mix(near, haze, smoothstep(0.3, 1.0, k));
        float fade = 1.0 - 0.7 * smoothstep(0.35, 1.0, k);
        float scan = pulse < 0.0 ? 0.0 : exp(-pow((vG.y - pulse) / 900.0, 2.0)) * 1.4;
        vec3 c = col * g * fade * (1.25 + scan) * gain;
        // the haze over the far floor: the lines too fine to tell apart
        // there, their light spread into a glow that meets the sky's
        c += vec3(0.75, 0.1, 0.4) * pow(smoothstep(0.15, 1.0, k), 2.2) * 0.55 * gain;
        c += vec3(1.0, 0.2, 0.52) * exp(-pow((1.0 - k) * 7.0, 2.0)) * 0.8 * gain;
        gl_FragColor = vec4(c + vec3(0.006, 0.004, 0.014), 1.0);
        #include <tonemapping_fragment>
        #include <colorspace_fragment>
      }`
  });
}
function signTex(card, color) {
  const W = 1024, H = 476;
  return neonTex(W, H, (c, tube) => {
    const r = 40, x = 28, y = 28, w = W - 56, h = H - 56;
    tube(() => { c.beginPath(); c.moveTo(x + r, y); c.arcTo(x + w, y, x + w, y + h, r); c.arcTo(x + w, y + h, x, y + h, r); c.arcTo(x, y + h, x, y, r); c.arcTo(x, y, x + w, y, r); c.closePath(); c.stroke(); }, color, 10);
    // the name, in tubes: sized to its board
    const name = String(card.name || '?').toUpperCase();
    let size = 120;
    c.font = `700 ${size}px Orbitron, Rajdhani, sans-serif`;
    while (c.measureText(name).width > w - 120 && size > 44) { size -= 4; c.font = `700 ${size}px Orbitron, Rajdhani, sans-serif`; }
    c.textAlign = 'center'; c.textBaseline = 'middle';
    [[size * 0.22, 0.18], [size * 0.11, 0.38]].forEach(([lw, a]) => { c.globalAlpha = a; c.strokeStyle = color; c.lineWidth = lw; c.strokeText(name, W / 2, H * 0.42); });
    c.globalAlpha = 1; c.fillStyle = color; c.fillText(name, W / 2, H * 0.42);
    c.globalAlpha = 0.9; c.fillStyle = '#fff'; c.font = `700 ${size}px Orbitron, Rajdhani, sans-serif`;
    c.save(); c.globalCompositeOperation = 'lighter'; c.globalAlpha = 0.35; c.fillText(name, W / 2, H * 0.42); c.restore();
    c.globalAlpha = 1;
    c.font = '600 60px Rajdhani, sans-serif'; c.fillStyle = card.spent ? 'rgba(226,241,236,0.55)' : '#00ff66';
    c.fillText(card.spent ? 'COLLECTED' : 'READY', W / 2, H * 0.76);
  });
}
const TIER_NEON = { S: '#ff2d95', A: '#ff8a1f', B: '#00e5ff', C: '#8b5cf6', U: '#e2f1ec' };
function buildGrid(cards) {
  const g = new THREE.Group();
  const floorMat = gridFloorMaterial();
  const floor = new THREE.Mesh(new THREE.PlaneGeometry(90000, GRID.far - GRID.near), floorMat);
  // (the shader works in the grid's own frame: laid flat, the plane's y is
  // the grid's -z, so it is moved along its y to run from near to far)
  floor.geometry.translate(0, -(GRID.far + GRID.near) / 2, 0);
  floor.rotation.x = -Math.PI / 2;
  // the sky behind the moon, and the moon on the horizon, half risen
  const sky = new THREE.Mesh(new THREE.PlaneGeometry(200000, 60000), new THREE.MeshBasicMaterial({ map: skyTex(), fog: false, depthWrite: false }));
  // (its foot under the floor's far edge, its glow just over it)
  // (turned to face down the road, toward you: a plane's face is its +z)
  sky.rotation.y = Math.PI; sky.position.set(0, -1000 + 30000, GRID.moonZ + 3000); sky.renderOrder = -4;
  const moon = new THREE.Mesh(new THREE.PlaneGeometry(2 * GRID.moonR, 2 * GRID.moonR), new THREE.MeshBasicMaterial({ map: moonTex(), color: new THREE.Color(1.35, 1.35, 1.35), transparent: true, fog: false, depthWrite: false }));
  moon.rotation.y = Math.PI; moon.position.set(0, GRID.moonR * 0.28, GRID.moonZ); moon.renderOrder = -2;
  const halo = new THREE.Mesh(new THREE.PlaneGeometry(GRID.moonR * 5.2, GRID.moonR * 5.2), new THREE.MeshBasicMaterial({ map: glowTex(), color: new THREE.Color(0.9, 0.12, 0.3), transparent: true, opacity: 0.6, blending: THREE.AdditiveBlending, depthWrite: false, fog: false }));
  halo.rotation.y = Math.PI; halo.position.set(0, GRID.moonR * 0.28, GRID.moonZ + 100); halo.renderOrder = -3;
  g.add(sky, halo, moon, floor);
  // the signs: a board on a pole each side of the road in turn, turned to
  // face the road's middle a little ahead
  const signs = [];
  const poleMat = new THREE.MeshBasicMaterial({ color: 0x0c0a12, fog: false });
  cards.forEach((c, i) => {
    const side = i % 2 ? -1 : 1, z = SIGN.z0 + i * SIGN.dz, x = side * SIGN.x;
    const color = TIER_NEON[K.tierOf(c.tier)] || TIER_NEON.U;
    const mat = new THREE.MeshBasicMaterial({ map: signTex({ name: c.name, spent: c.remaining > 0 }, color), color: new THREE.Color(2.4, 2.4, 2.4), fog: false });
    const board = new THREE.Mesh(new THREE.PlaneGeometry(SIGN.w, SIGN.h), mat);
    const at = V(x, SIGN.y, z);
    board.position.copy(at);
    board.lookAt(V(0, SIGN.y, z - 2600));
    board.userData = { id: c.id };
    const pole = new THREE.Mesh(new THREE.CylinderGeometry(10, 12, SIGN.y - SIGN.h / 2, 10), poleMat);
    pole.position.set(x, (SIGN.y - SIGN.h / 2) / 2, z);
    const glow = new THREE.Mesh(new THREE.PlaneGeometry(SIGN.w * 1.9, SIGN.h * 2.6), new THREE.MeshBasicMaterial({ map: glowTex(), color: new THREE.Color(color).multiplyScalar(0.55), transparent: true, blending: THREE.AdditiveBlending, depthWrite: false, fog: false }));
    glow.position.copy(at); glow.quaternion.copy(board.quaternion); glow.translateZ(-8);
    // (and its light on the grid under it: a pool on the floor)
    const pool = new THREE.Mesh(new THREE.PlaneGeometry(900, 900), new THREE.MeshBasicMaterial({ map: glowTex(), color: new THREE.Color(color).multiplyScalar(0.35), transparent: true, blending: THREE.AdditiveBlending, depthWrite: false, fog: false }));
    pool.rotation.x = -Math.PI / 2; pool.position.set(x * 0.8, 2, z);
    g.add(pole, glow, pool, board);
    signs.push({ id: c.id, board, mat, color, card: c });
  });
  return { group: g, floorMat, signs, moon, floor, sky };
}

// ------------------------------------------------------------ the screen's table
function screenHTML(cards) {
  const rows = [];
  for (let i = 0; i < 6; i++) {
    const c = cards[i];
    const rank = ['1ST', '2ND', '3RD', '4TH', '5TH', '6TH'][i];
    if (!c) { rows.push(`<div class="r3a-row r3a-empty"><span class="r3a-rank">${rank}</span><b class="r3a-name">- - -</b><span class="r3a-st">&nbsp;</span></div>`); continue; }
    const tier = K.tierOf(c.tier);
    rows.push(`<button type="button" class="r3a-row t-${tier}" data-id="${K.esc(c.id)}"><span class="r3a-rank">${rank}</span><b class="r3a-name">${K.esc(String(c.name).toUpperCase())}</b><span class="r3a-st" data-st="${K.esc(c.id)}">READY</span></button>`);
  }
  return `<div class="r3a-screen-in">
    <div class="r3a-top"><span class="r3a-title">TODAY&rsquo;S RUN</span><span class="r3a-clock"><b class="r3a-now">--:--</b><small class="r3a-ampm"></small></span></div>
    <div class="r3a-sub"><span class="r3a-ready"><b class="r3a-n">&mdash;</b> READY</span><span class="r3a-value"></span></div>
    <div class="r3a-rows">${rows.join('')}</div>
    <button type="button" class="r3a-run">&#9654; PRESS START</button>
    <button type="button" class="r3a-dive">ENTER GRID &rsaquo;</button>
    <div class="r3a-foot">TAP A NAME FOR ITS CARD</div>
  </div>`;
}

// ------------------------------------------------------------ prepare
// Built into the running scene while the intro floats on (its lights come
// up out of the dark), made ready - shaders compiled, textures sent, the
// game's picture drawn once - and only then shown. Returns the controller:
// fly() takes over from the intro.
export async function prepareTable(opts) {
  const o = Object.assign({ scene: null, dest: 'arcade', hooks: {} }, opts);
  const scene = o.scene;
  if (!scene.userData.set) throw new Error('arcade: the intro set is missing');
  const set = K.fineSet(scene.userData.set);
  const hooks = o.hooks || {};
  const seat = new THREE.Group();
  seat.position.set(...ARCADE.at);
  seat.rotation.y = ARCADE.yaw * DEG;
  seat.visible = false;
  scene.add(seat);

  // (the signs' names and the bezel's print are in the room's type: wait for it)
  if (document.fonts && document.fonts.load) await Promise.all(['700 64px Orbitron', '600 40px Rajdhani', '700 40px Rajdhani', '400 40px "Tilt Neon"'].map(f => document.fonts.load(f).catch(() => {})));

  const cab = buildCabinet(set);
  seat.add(cab.group);
  const room = buildRoom(set);
  seat.add(room.group);
  const outside = buildOutside();
  seat.add(outside.group);
  const cs = K.contactShadow(BODY.w, BODY.d, 2.5, 5, [], 0.6);
  cs.position.set(0, TOP.floor + 0.25, TOP.d / 2);
  seat.add(cs);

  // The hand: the deck's ready platforms (the demonstration hand with
  // nothing ready), best first - six rows on the table, six signs.
  const hand = ((hooks.deck && hooks.deck()) || []).slice(0, 6);
  const cards = hand.length ? hand : K.demoHand().slice(0, 6);

  // The game: its world far under the floor, its camera, the picture.
  const grid = buildGrid(cards);
  grid.group.position.set(...GRID.at);
  seat.add(grid.group);
  const gameCam = new THREE.PerspectiveCamera(GAME.fov, SCREEN.w / SCREEN.d, 20, 120000);
  seat.add(gameCam);
  const gridW = v => grid.group.localToWorld(v.clone());
  const rtH = Math.min(1400, Math.max(512, Math.round(Math.max(window.innerWidth, window.innerHeight) * Math.min(2, window.devicePixelRatio || 1))));
  const rt = new THREE.WebGLRenderTarget(Math.round(rtH * SCREEN.w / SCREEN.d), rtH, { type: THREE.HalfFloatType, samples: 0 });
  rt.texture.colorSpace = THREE.LinearSRGBColorSpace;
  const screenMat = screenMaterial(rt.texture);
  const screen = new THREE.Mesh(new THREE.PlaneGeometry(SCREEN.w, SCREEN.d), screenMat);
  // (lying face up, the picture's up away from you, its right to your right)
  screen.quaternion.setFromRotationMatrix(new THREE.Matrix4().makeBasis(V(-1, 0, 0), V(0, 0, 1), V(0, 1, 0)));
  screen.position.set(0, SCREEN.y, SCREEN.z);
  seat.add(screen);

  // The lights: every one the home will use, in from the start and dark (a
  // light added later would compile every material in the room again). The
  // key: a track spot above you to the left; the tube's own light; the
  // sign's; and the moon's through the glass, low and red.
  const key = new THREE.SpotLight(0xffe2ee, 0, 0, 0.5, 0.75, 0);
  key.position.set(70, 150, -70); key.target.position.set(0, -4, 40);
  key.castShadow = true;
  key.shadow.mapSize.set(1024, 1024); key.shadow.camera.near = 60; key.shadow.camera.far = 400;
  key.shadow.bias = -0.0004; key.shadow.normalBias = 0.03; key.shadow.radius = 4;
  const tubeLight = new THREE.PointLight(0x9fd8ff, 0, 140, 2);
  // (at the picture, under the glass: it lights what is over the tube and
  // never glints in the glass it shines up through)
  tubeLight.position.set(0, SCREEN.y - 0.2, SCREEN.z);
  const signLight = new THREE.PointLight(0xff2d6a, 0, 260, 2);
  signLight.position.set(SIGN_X, 4, WALL.z - 12);
  const moonLight = new THREE.DirectionalLight(0xff5a7a, 0);
  moonLight.position.set(-40, 60, WALL.z + 200); moonLight.target.position.set(0, -20, 40);
  seat.add(key, key.target, tubeLight, signLight, moonLight, moonLight.target);
  let litT0 = performance.now();
  const lightsUp = () => {
    const k = smoother((performance.now() - litT0) / 2200);
    key.intensity = 1.9 * k; tubeLight.intensity = 900 * k; signLight.intensity = 1800 * k; moonLight.intensity = 0.5 * k;
    return k;
  };
  lightsUp();

  // The game's camera: where the attract picture is drawn from.
  // (lookAt works in world terms; the camera is the seat's child)
  const lookAtWorld = (cam, eyeW, aimW) => { const m = new THREE.Matrix4().lookAt(eyeW, aimW, V(0, 1, 0)); const q = new THREE.Quaternion().setFromRotationMatrix(m); const sq = new THREE.Quaternion(); seat.getWorldQuaternion(sq); cam.quaternion.copy(sq.invert().multiply(q)); };
  const placeGame = () => {
    seat.updateMatrixWorld(true);
    gameCam.fov = GAME.fov; gameCam.aspect = SCREEN.w / SCREEN.d;
    const e = gridW(V(...GAME.eye)), a = gridW(V(...GAME.aim));
    gameCam.position.copy(seat.worldToLocal(e.clone()));
    lookAtWorld(gameCam, e, a);
    gameCam.updateProjectionMatrix(); gameCam.updateMatrixWorld(true);
  };
  let renderer = null;
  const drawGame = r => {
    if (!r) return;
    const was = r.getRenderTarget(), auto = r.shadowMap.autoUpdate, shown = screen.visible;
    screen.visible = false;
    r.shadowMap.autoUpdate = false;
    r.setRenderTarget(rt);
    r.render(scene, gameCam);
    r.setRenderTarget(was);
    r.shadowMap.autoUpdate = auto;
    screen.visible = shown;
  };

  async function fly(world, flyOpts = {}) {
    const fo = Object.assign({ manual: false, reduced: false, duration: 0, onArrive: null, host: null, seatView: null }, flyOpts);
    const { camera } = world;
    renderer = world.renderer;
    if (fo.reduced) litT0 = -Infinity;
    outside.group.visible = true;
    const stageEl = fo.host || document.body;
    world.overlays.forEach(el => { el.style.visibility = 'hidden'; });
    const css = new CSS3DRenderer();
    css.domElement.className = 'r3t-css r3a-css';
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
    placeGame();
    const seatView = () => {
      if (fo.seatView) { const [ey, ez, az, fv] = fo.seatView; return { eye: V(0, ey, ez), aim: V(0, 10, az), fov: fv }; }
      const v = VIEW[aspect < 0.62 ? 0 : 1];
      return { eye: V(...v.eye), aim: V(...v.aim), fov: v.fov };
    };
    let sv = seatView();
    let E1 = toWorld(sv.eye), A1 = toWorld(sv.aim);
    const focusView = () => { const v = FOCUS[aspect < 0.62 ? 0 : 1]; return { eye: V(...v.eye), aim: V(...v.aim), fov: v.fov }; };
    let fv = focusView();

    // The path in: one unbroken glide from the float to the chair, as the
    // card table's - up to a cruise over the gaming floor (it turns round
    // on the way: the arcade is behind the shot), then down from behind
    // the chair, under the alcove's mouth.
    const E0 = camera.position.clone(), q0 = camera.quaternion.clone();
    const seatBack = toWorld(V(0, 0, -1)).sub(toWorld(V(0, 0, 0))).normalize();
    const F = toWorld(V(0, 20, 90));
    const cruise = THREE.MathUtils.clamp(Math.max(E0.y, E1.y) + 55, 110, 150);
    const bez = (u, a, b, c, d) => { const v = 1 - u; return v * v * v * a + 3 * v * v * u * b + 3 * v * u * u * c + u * u * u * d; };
    const P1 = V(0, 0, 0), P2 = V(0, 0, 0);
    const eyeAt = (k, out) => {
      const u = smoother(k);
      P1.copy(E0).lerp(E1, 0.2);
      P2.copy(E1).addScaledVector(seatBack, 170);
      const y = E0.y + (cruise - E0.y) * easeOut(k / 0.34, 2) - (cruise - E1.y) * smoother((k - 0.46) / 0.54);
      return out.set(bez(u, E0.x, P1.x, P2.x, E1.x), y, bez(u, E0.z, P1.z, P2.z, E1.z));
    };
    const m4 = new THREE.Matrix4(), up = V(0, 1, 0);
    const lookQ = (eye, at, out) => out.setFromRotationMatrix(m4.lookAt(eye, at, up));
    const FLY = fo.reduced ? 0.01 : fo.duration > 0 ? fo.duration : T.fly;
    const UI_IN = fo.reduced ? 0.01 : T.uiIn;
    const fov0 = camera.fov, near0 = camera.near, far0 = camera.far;
    const lens0 = world.lights.lensLight.intensity;
    const bloom0 = world.bloom ? world.bloom.strength : 0;
    const introT0 = world.t;

    // The dive: 0 in the chair, CUT leaning over the glass with the picture
    // filling the lens, 1 standing on the grid. dive runs toward diveTo.
    // The lean: from the chair up and over the glass to above the tube's
    // middle, looking straight down, the picture's up at the top of the
    // frame - high enough that the picture just fills the lens.
    const hover = { eye: V(0, 0, 0), q: new THREE.Quaternion(), fov: 0 };
    const cutGame = { fov: 0 };
    const setHover = () => {
      const f = sv.fov * DEG, t = Math.tan(f / 2);
      // (the picture fills the frame: its height, or on a wide screen its width)
      const h = Math.min((SCREEN.d / 2) / t, (SCREEN.w / 2) / (aspect * t));
      hover.eye.set(0, SCREEN.y + h, SCREEN.z);
      hover.fov = sv.fov;
      const bw = new THREE.Matrix4().makeBasis(V(-1, 0, 0), V(0, 0, 1), V(0, 1, 0));
      const sq = new THREE.Quaternion(); seat.getWorldQuaternion(sq);
      hover.q.copy(sq).multiply(new THREE.Quaternion().setFromRotationMatrix(bw));
      // (what of the picture shows then: its full height upright, a band of
      // it on a wide screen - the game's lens is that part of its own)
      const shown = Math.min(1, (SCREEN.w / aspect) / SCREEN.d);
      cutGame.fov = 2 * Math.atan(Math.tan(GAME.fov * DEG / 2) * shown) / DEG;
    };
    setHover();
    const bezV = (u, a, b, c, d, out) => { const v = 1 - u; return out.set(
      v * v * v * a.x + 3 * v * v * u * b.x + 3 * v * u * u * c.x + u * u * u * d.x,
      v * v * v * a.y + 3 * v * v * u * b.y + 3 * v * u * u * c.y + u * u * u * d.y,
      v * v * v * a.z + 3 * v * v * u * b.z + 3 * v * u * u * c.z + u * u * u * d.z); };
    // Where you are before any dive: in the seat, leaning in over the tube,
    // or on the way between (a little rise as you come forward, a settle).
    let focus = 0, focusFrom = 0, focusTo = 0, focusT0 = 0;
    const base = { eye: V(0, 0, 0), q: new THREE.Quaternion(), fov: 66 };
    const _qs = new THREE.Quaternion(), _qf = new THREE.Quaternion();
    const basePose = () => {
      const k = smoother(focus);
      base.eye.copy(sv.eye).lerp(fv.eye, k);
      base.eye.y += Math.sin(Math.PI * k) * 2.5;
      lookQ(toWorld(sv.eye), toWorld(sv.aim), _qs);
      lookQ(toWorld(fv.eye), toWorld(fv.aim), _qf);
      base.q.copy(_qs).slerp(_qf, k);
      base.fov = lerp(sv.fov, fv.fov, k);
      return base;
    };
    const L1 = V(0, 0, 0), L2 = V(0, 0, 0), leanP = V(0, 0, 0);
    // (the lean: a small sit-back first - the wind-up - then in, settling
    // into the frame without passing it)
    const leanAt = k => {
      const u = clamp01(k / CUT);
      const back = u < 0.16 ? Math.sin(Math.PI * u / 0.16) : 0;
      const s = smoother((u - 0.1) / 0.9);
      const b0 = basePose();
      L1.copy(b0.eye).add(V(0, 6, 4)); L2.copy(hover.eye).add(V(0, 14, -12));
      bezV(s, b0.eye, L1, L2, hover.eye, leanP);
      leanP.y += back * 2.2; leanP.z -= back * 3.2;
      return { p: toWorld(leanP), s };
    };
    const ins = { eye: gridW(V(...INSIDE.eye)), aim: gridW(V(...INSIDE.aim)) };
    const gEye0 = gridW(V(...GAME.eye)), gAim0 = gridW(V(...GAME.aim));
    const qG0 = new THREE.Quaternion(), qG1 = new THREE.Quaternion();
    lookQ(gEye0, gAim0, qG0); lookQ(ins.eye, ins.aim, qG1);
    const qA = new THREE.Quaternion(), camQ = new THREE.Quaternion();
    let dive = 0, diveFrom = 0, diveTo = 0, diveT0 = 0;

    // ---- The UI, built now, shown on arrival: the screen's table, laid on
    // the tube under the glass.
    const ui = document.createElement('div');
    ui.className = 'r3t-ui';
    css.domElement.appendChild(ui);
    const screenEl = document.createElement('div');
    screenEl.className = 'r3a-screen';
    screenEl.style.width = `${Math.round(SCREEN.w * SCREEN.px)}px`;
    screenEl.style.height = `${Math.round(SCREEN.d * SCREEN.px)}px`;
    screenEl.innerHTML = screenHTML(cards);
    const screenObj = new CSS3DObject(screenEl);
    screenObj.position.set(0, SCREEN.y + 0.02, SCREEN.z);
    K.lying(screenObj.quaternion, { yaw: 0 });
    screenObj.scale.setScalar(1 / SCREEN.px);
    cssSeat.add(screenObj);
    // the card a row (or a sign) gives up: one, dressed for whichever it is
    const cardEl = document.createElement('div');
    cardEl.className = 'r3t-card r3a-card';
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
    const backEl = document.createElement('button');
    backEl.type = 'button';
    backEl.className = 'r3a-out r3a-back';
    backEl.innerHTML = '<span aria-hidden="true">&#8595;</span> Sit back';
    css.domElement.appendChild(backEl);
    const outEl = document.createElement('button');
    outEl.type = 'button';
    outEl.className = 'r3a-out';
    outEl.innerHTML = '<span aria-hidden="true">&#8593;</span> Back to the cabinet';
    css.domElement.appendChild(outEl);
    const srList = document.createElement('div');
    srList.className = 'r3t-sr';
    srList.innerHTML = `<ul>${cards.map(c => `<li><button type="button" data-id="${K.esc(c.id)}">${K.esc(c.name)}, ${K.esc(K.cardShown(c))}</button></li>`).join('')}</ul>`;
    css.domElement.appendChild(srList);
    css.domElement.classList.add('r3t-hide');

    // ---- Time and the table's readouts.
    const q = s => screenEl.querySelector(s);
    const put = (el, v) => { if (el && el.textContent !== v) el.textContent = v; };
    const sample = () => ({ ready: cards.length, value: cards.reduce((t, c) => t + (c.ev || 0), 0), next: null, done: 0 });
    const tick = () => {
      const d = new Date();
      const hh = d.getHours(), mm = d.getMinutes();
      const hm = `${((hh + 11) % 12) + 1}:${String(mm).padStart(2, '0')}`;
      put(q('.r3a-now'), hm);
      put(q('.r3a-ampm'), hh < 12 ? 'AM' : 'PM');
      const st = (hand.length && hooks.status && hooks.status()) || sample();
      put(q('.r3a-n'), String(st.ready));
      put(q('.r3a-value'), st.value > 0 ? `~$${st.value.toFixed(2)} SC` : (st.next ? `NEXT IN ${K.fmtLeft(st.next).toUpperCase()}` : `${st.done} DONE TODAY`));
      phoneEl.querySelectorAll('.r3t-ph-clock, .r3t-ph-big').forEach(n => put(n, hm));
      put(phoneEl.querySelector('.r3t-ph-day'), d.toLocaleDateString(undefined, { weekday: 'long', month: 'long', day: 'numeric' }));
      put(phoneEl.querySelector('.r3t-ph-ready'), `${st.ready} ready${st.value > 0 ? ` · ~$${st.value.toFixed(2)}` : ''}`);
      put(phoneEl.querySelector('.r3t-ph-next'), st.next ? `Next comes ready in ${K.fmtLeft(st.next)}` : `All caught up · ${st.done} done today`);
      // each row as its platform stands: collected (anywhere), its time
      cards.forEach(c => {
        const now = hooks.cardState ? hooks.cardState(c.id) : null;
        const rem = now ? now.remaining : (c.remaining || 0);
        const el = screenEl.querySelector(`[data-st="${CSS.escape(c.id)}"]`);
        if (el) { put(el, rem > 0 ? K.fmtLeft(rem).toUpperCase() : 'READY'); el.classList.toggle('r3a-wait', rem > 0); }
      });
    };

    // ---- A card: out of its row (or its sign) and up to you, turning from
    // its back to its face as it comes; back down into it when it goes.
    let cardId = null, lift = 0, liftTo = 0, liftFrom = 0, liftT0 = 0;
    const pw = V(0, 0, 0), qw = new THREE.Quaternion(), seatQi = new THREE.Quaternion();
    const focusPose = (outP, outQ) => {
      const fov = camera.fov * DEG;
      const d = K.CARD.h / (0.42 * 2 * Math.tan(fov / 2));
      outP.set(0, 0.1 * d, -d).applyQuaternion(camera.quaternion).add(camera.position);
      outQ.copy(camera.quaternion);
      return d;
    };
    const rowAt = (id, out) => {
      const i = cards.findIndex(c => c.id === id);
      // (the row's middle on the tube: the rows run down its middle band)
      const zRow = SCREEN.z + SCREEN.d / 2 - (420 + 145 * i + 72.5) / SCREEN.px;
      return out.copy(toWorld(V(0, SCREEN.y + 0.1, zRow)));
    };
    const signOf = id => grid.signs.find(s => s.id === id);
    const _p0 = V(0, 0, 0), _p1 = V(0, 0, 0), _q1 = new THREE.Quaternion(), flipQ = new THREE.Quaternion();
    const poseCard = tt => {
      if (!cardId) { if (cardEl.style.visibility !== 'hidden') cardEl.style.visibility = 'hidden'; return; }
      lift = fo.reduced ? liftTo : lerp(liftFrom, liftTo, smoother((tt - liftT0) / T.lift));
      if (lift <= 0.001 && liftTo === 0) { cardId = null; cardEl.style.visibility = 'hidden'; hideInfo(); return; }
      const inside = dive >= CUT;
      const S = inside ? signOf(cardId) : null;
      if (S) S.board.getWorldPosition(_p0); else rowAt(cardId, _p0);
      const d = focusPose(_p1, _q1);
      const k = lift;
      pw.copy(_p0).lerp(_p1, k);
      pw.addScaledVector(V(0, 1, 0).applyQuaternion(camera.quaternion), Math.sin(Math.PI * k) * 0.06 * d);
      flipQ.setFromAxisAngle(V(0, 1, 0), Math.PI * (1 - smoother(clamp01((k - 0.15) / 0.7))));
      qw.copy(_q1).multiply(flipQ);
      // (from the row's height on the tube - or the board's - to your hand)
      const from = inside ? SIGN.h / K.CARD.h : (145 / SCREEN.px) / K.CARD.h;
      const sc = lerp(from, 1, smoother(k)) / K.CARD.px;
      seatQi.copy(seat.quaternion).invert();
      cardObj.position.copy(pw); seat.worldToLocal(cardObj.position);
      cardObj.quaternion.copy(seatQi).multiply(qw);
      cardObj.scale.setScalar(sc);
      cardEl.style.visibility = 'visible';
      const n = V(0, 0, 1).applyQuaternion(qw), toCam = camera.position.clone().sub(pw);
      cardEl.classList.toggle('r3t-up', n.dot(toCam) > 0);
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
      if (cardId && cardId !== id) { cardId = null; lift = 0; }
      cardId = id;
      const now = hooks.cardState ? hooks.cardState(id) : null;
      cardEl.innerHTML = K.cardHTML(Object.assign({}, c, { remaining: now ? now.remaining : 0 }));
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
    let tNow = 0, arrived = false, pulseT0 = 0;
    // (a plate takes the keyboard's focus on the frame it shows: a hidden
    // one can't hold it)
    let focusOut = false, focusBack = false;
    const flyEye = V(0, 0, 0), qTable = new THREE.Quaternion(), qSeat = new THREE.Quaternion();
    const placeCamera = tt => {
      camera.up.copy(up);
      // (far enough for the moon over the city)
      camera.far = 60000;
      if (tt < FLY) {
        const u = smoother(tt / FLY);
        const e = eyeAt(tt / FLY, flyEye);
        lookQ(e, F, qTable);
        lookQ(E1, A1, qSeat);
        camQ.copy(q0).slerp(qTable, smoother(tt / (FLY * 0.3))).slerp(qSeat, smoother((u - 0.62) / 0.38));
        camera.position.copy(e);
        camera.quaternion.copy(camQ);
        camera.fov = lerp(fov0, sv.fov, smoother(u));
        camera.near = near0;
      } else if (dive <= 0) {
        const b0 = basePose();
        camera.position.copy(toWorld(b0.eye)); camera.quaternion.copy(b0.q); camera.fov = b0.fov; camera.near = near0;
      } else if (dive < CUT) {
        // the lean over the glass
        const L = leanAt(dive);
        camera.position.copy(L.p);
        qA.copy(base.q);
        camera.quaternion.copy(qA).slerp(hover.q, L.s);
        camera.fov = lerp(base.fov, sv.fov, L.s);
        camera.near = lerp(near0, 1, L.s);
      } else {
        // the game's camera: from where the picture is drawn, out along the
        // road to where you stand, its lens opening from the part of the
        // picture the screen showed to your own
        const u = smoother((dive - CUT) / (1 - CUT));
        camera.position.copy(gEye0).lerp(ins.eye, u);
        camera.quaternion.copy(qG0).slerp(qG1, u);
        camera.fov = lerp(cutGame.fov, INSIDE.fov[aspect < 0.62 ? 0 : 1], smoother((dive - CUT) / (1 - CUT) * 1.25));
        camera.near = 20; camera.far = 120000;
      }
      camera.updateProjectionMatrix();
      camera.updateMatrixWorld();
    };
    const update = tt => {
      tNow = tt;
      lightsUp();
      if (focus !== focusTo) {
        const u = fo.reduced ? 1 : clamp01((tt - focusT0) / T.focus);
        focus = lerp(focusFrom, focusTo, u);
        if (u >= 1) focus = focusTo;
      }
      if (dive !== diveTo) {
        const u = fo.reduced ? 1 : clamp01((tt - diveT0) / T.dive);
        dive = lerp(diveFrom, diveTo, u);
        if (u >= 1) dive = diveTo;
      }
      placeCamera(tt);
      world.stage(introT0 + tt);
      const kf = fo.reduced ? 1 : clamp01(tt / 0.9);
      world.lights.lensLight.intensity = lens0 * (1 - kf);
      world.lights.rim.intensity *= 1 - 0.6 * kf;
      if (world.bloom) world.bloom.strength = fo.reduced ? 0 : lerp(bloom0, dive >= CUT ? 0.55 : 0.35, kf);
      // the tube: the attract picture as you come in and as you lean in;
      // the table over it in the chair; the tube's lines going as the lens
      // comes down to the picture (none at the hand-over)
      const leaning = dive > 0 && dive < CUT;
      const uiK = tt < FLY ? 0 : clamp01((tt - FLY + 0.1) / UI_IN) * (1 - smoother(dive / 0.1));
      screenMat.uniforms.crt.value = 1 - smoother((dive - CUT * 0.55) / (CUT * 0.4));
      cab.glassMat.envMapIntensity = GLASS_ENV * (1 - smoother((dive - CUT * 0.5) / (CUT * 0.4)));
      screen.visible = dive < CUT;
      // (the scan down the grid: now and then, while you are in there)
      const inside = dive >= CUT;
      if (inside && !fo.reduced) {
        const p = ((tt - pulseT0) % T.pulse) / T.pulse;
        grid.floorMat.uniforms.pulse.value = p < 0.55 ? GRID.far * 0.5 * (1 - p / 0.55) + INSIDE.eye[2] : -1;
      } else grid.floorMat.uniforms.pulse.value = -1;
      poseCard(tt);
      screenEl.style.opacity = uiK.toFixed(3);
      screenEl.style.visibility = uiK <= 0.001 ? 'hidden' : '';
      const outOn = dive >= 0.999 && diveTo === 1, backOn = focus >= 0.999 && focusTo === 1 && dive <= 0 && diveTo === 0;
      outEl.classList.toggle('r3a-on', outOn);
      backEl.classList.toggle('r3a-on', backOn);
      if (outOn && focusOut) { focusOut = false; outEl.focus({ preventScroll: true }); }
      if (backOn && focusBack) { focusBack = false; backEl.focus({ preventScroll: true }); }
      put(q('.r3a-foot'), focusTo === 1 ? 'TAP A NAME FOR ITS CARD' : 'TAP THE SCREEN TO LEAN IN');
      screenEl.classList.toggle('r3a-far', focusTo !== 1);
      const stg = world.canvas.parentElement;
      if (stg && stg.classList.contains('r3t-focus') !== !!(cardId && liftTo)) stg.classList.toggle('r3t-focus', !!(cardId && liftTo));
      const uiIn = clamp01((tt - FLY + 0.1) / UI_IN);
      css.domElement.style.setProperty('--r3t-in', uiIn.toFixed(3));
      css.domElement.classList.toggle('r3t-hide', uiIn <= 0);
      // (the picture drawn while the tube shows it: in the glide, as the
      // table comes up over it, and in the lean)
      needGame = screen.visible && (tt < FLY + UI_IN + 0.1 || leaning || diveTo > 0);
      if (!arrived && tt >= FLY) { arrived = true; if (fo.onArrive) fo.onArrive(css.domElement); }
    };
    let needGame = true;
    const draw = () => { if (needGame) drawGame(world.renderer); world.paint(); css.render(cssScene, camera); };
    const show = () => { if (running) draw(); else world.rest(draw); };

    // ---- The loop: runs while anything moves, then holds the frame.
    let running = false, raf = 0, last = 0, woke = 0, disposed = false;
    const pacer = world.pacer ? world.pacer() : null;
    const busy = () => tNow < FLY + UI_IN + 0.1 || dive !== diveTo || focus !== focusTo || (diveTo === 1 && !fo.reduced) || (cardId && Math.abs(lift - liftTo) > 1e-3);
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

    // ---- Leaning in over the tube, and sitting back.
    const setFocus = on => {
      const to = on ? 1 : 0;
      if (focusTo === to || diveTo !== 0 || dive > 0) return;
      if (!on) putBack();
      focusBack = on;
      focusFrom = focus; focusTo = to; focusT0 = tNow;
      wake();
    };

    // ---- Into the grid, and back.
    const goInside = on => {
      const to = on ? 1 : 0;
      if (diveTo === to) return;
      putBack();
      diveFrom = dive; diveTo = to; diveT0 = tNow;
      focusOut = on; focusBack = false;
      if (on) pulseT0 = tNow + T.dive;
      wake();
    };

    // ---- Touch: a sign (its card), inside; on the table, the page's own
    // buttons (the rows, start, the grid) take their own taps.
    const ray = new THREE.Raycaster(), ndc = new THREE.Vector2();
    const boards = grid.signs.map(s => s.board);
    const hitAt = e => {
      const r = css.domElement.getBoundingClientRect();
      ndc.set(((e.clientX - r.left) / r.width) * 2 - 1, -((e.clientY - r.top) / r.height) * 2 + 1);
      ray.setFromCamera(ndc, camera);
      const hits = ray.intersectObjects(boards, false);
      if (hits.length) return hits[0].object.userData;
      // (a sign is easy to hit: a little round it counts)
      let best = null, bestD = Infinity;
      grid.signs.forEach(S => {
        S.board.getWorldPosition(pw);
        const d = ray.ray.distanceToPoint(pw), tol = SIGN.w * 0.62;
        if (d < tol && d < bestD) { bestD = d; best = { id: S.id }; }
      });
      return best;
    };
    let press = null;
    const onStage = e => { const st = world.canvas.parentElement; return !!(st && e.target && st.contains(e.target)); };
    const onDown = e => {
      if (tNow < FLY || e.button > 0 || !onStage(e)) return;
      if (e.target.closest && e.target.closest('.r3a-screen, .r3t-info, .r3t-phone, .r3a-out, .r3t-card')) return;
      press = { id: e.pointerId, x: e.clientX, y: e.clientY, moved: 0 };
    };
    const onMove = e => {
      if (!press || e.pointerId !== press.id) return;
      press.moved += Math.abs(e.clientX - press.x) + Math.abs(e.clientY - press.y);
      press.x = e.clientX; press.y = e.clientY;
    };
    const onUp = e => {
      if (!press || e.pointerId !== press.id) return;
      const moved = press.moved;
      press = null;
      if (moved > 12) return;
      if (cardId && liftTo) { putBack(); return; }
      if (dive >= 0.999 && diveTo === 1) { const h = hitAt(e); if (h && h.id) takeCard(h.id); return; }
      // (off the tube, leaning in: you sit back)
      if (dive <= 0 && focusTo === 1) setFocus(false);
    };
    window.addEventListener('pointerdown', onDown, true);
    window.addEventListener('pointermove', onMove, true);
    window.addEventListener('pointerup', onUp, true);
    const onCancel = () => { press = null; };
    window.addEventListener('pointercancel', onCancel, true);
    css.domElement.addEventListener('click', e => {
      const act = e.target.closest('.r3t-info [data-act]');
      if (act) { const id = cardId; putBack(); if (hooks.cardAction && id) hooks.cardAction(id, act.dataset.act); tick(); return; }
      if (e.target.closest('.r3t-info-x')) { putBack(); return; }
      if (e.target.closest('.r3t-card')) { putBack(); return; }
      // (from the seat, the tube is too far to read: a tap on it leans you in)
      if (e.target.closest('.r3a-screen') && focusTo !== 1) { setFocus(true); return; }
      if (e.target.closest('.r3a-back')) { setFocus(false); return; }
      const row = e.target.closest('.r3a-row[data-id]');
      if (row) { if (cardId === row.dataset.id && liftTo) putBack(); else takeCard(row.dataset.id); return; }
      if (e.target.closest('.r3a-run')) { if (hooks.run) hooks.run(); return; }
      if (e.target.closest('.r3a-dive')) { goInside(true); return; }
      if (e.target.closest('.r3a-out')) { goInside(false); return; }
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
      else if (diveTo === 1) goInside(false);
      else if (focusTo === 1) setFocus(false);
    };
    css.domElement.addEventListener('keydown', onKey);
    const onResize = () => {
      aspect = size();
      sv = seatView(); E1 = toWorld(sv.eye); A1 = toWorld(sv.aim); fv = focusView();
      setHover();
      update(tNow); show();
    };
    window.addEventListener('resize', onResize);

    tick();
    const clock = setInterval(tick, 1000);
    update(0);
    if (fo.manual) world.rest(draw);
    else { draw(); running = true; raf = requestAnimationFrame(loop); }

    return {
      dest: 'arcade',
      duration: FLY,
      get t() { return tNow; },
      seek(t) { tNow = t; if (dive !== diveTo) { dive = diveTo; } update(t); show(); },
      // (lab and tests: into the grid or out; a card up or down; the dive
      // shown at k)
      inside(on = true) { goInside(on); },
      diveAt(k) { dive = diveTo = diveFrom = k; update(tNow); show(); },
      takeCard(id) { takeCard(id || cards[0].id); },
      putBack,
      pickUpPhone(on = true) { holdPhone(on); },
      rows: cards.map(c => c.id),
      // (lab and tests: where a row, a sign, or the start and grid buttons
      // are on the screen now)
      screenOf(id) {
        const r = css.domElement.getBoundingClientRect();
        let w = null;
        if (id === 'run' || id === 'dive') { const el = q(id === 'run' ? '.r3a-run' : '.r3a-dive'); if (!el) return null; const b = el.getBoundingClientRect(); return { x: b.left + b.width / 2, y: b.top + b.height / 2 }; }
        if (dive >= CUT) { const S = signOf(id); if (!S) return null; w = S.board.getWorldPosition(V(0, 0, 0)); }
        else { const el = screenEl.querySelector(`.r3a-row[data-id="${CSS.escape(id)}"]`); if (!el) return null; const b = el.getBoundingClientRect(); return { x: b.left + b.width / 2, y: b.top + b.height / 2 }; }
        const p = w.project(camera);
        return { x: r.left + (p.x + 1) / 2 * r.width, y: r.top + (1 - p.y) / 2 * r.height };
      },
      get state() { return { focus: +focus.toFixed(3), focusTo, dive: +dive.toFixed(3), diveTo, card: cardId, lift: +lift.toFixed(3), running }; },
      lean(on = true) { setFocus(on); },
      focusAt(k) { focus = focusTo = focusFrom = k; update(tNow); show(); },
      get programs() { return world.renderer.info.programs.length; },
      // (lab: hide one of the cabinet's layers, to see what is over what)
      layer(name, on) { const m = { glass: cab.glass, screen, outside: outside.group, room: room.group, cabinet: cab.group, grid: grid.group }[name]; if (m) { m.visible = !!on; show(); } },
      // (lab: the game's picture as the tube has it - a few pixels of the
      // buffer, averaged - and whether it is being drawn)
      picture() {
        const r = world.renderer, w = rt.width, h = rt.height, px = new Uint16Array(4 * 16);
        let sum = [0, 0, 0];
        [[0.5, 0.5], [0.5, 0.75], [0.3, 0.3], [0.7, 0.9]].forEach(([u, v]) => {
          r.readRenderTargetPixels(rt, Math.floor(u * w), Math.floor(v * h), 2, 2, px);
          for (let i = 0; i < 16; i += 4) for (let c = 0; c < 3; c++) sum[c] += THREE.DataUtils.fromHalfFloat(px[i + c]);
        });
        return { size: [w, h], mean: sum.map(x => +(x / 16).toFixed(4)), needGame, screen: screen.visible, crt: screenMat.uniforms.crt.value };
      },
      // (the felt and trim are the card table's)
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
        camera.near = near0; camera.far = far0; camera.updateProjectionMatrix();
        css.domElement.remove();
      }
    };
  }

  // Ready before it shows: compiled and uploaded (the outside and the game
  // with the rest), then the game's picture drawn once into its buffer, so
  // the first frame the tube shows it waits on nothing.
  if (o.warm) {
    try { await o.warm({ show: [seat], spread: true }); } catch (e) { /* compiled on first draw */ }
  }
  outside.group.visible = false;
  seat.visible = true;

  return {
    dest: 'arcade',
    fly,
    dispose() {
      scene.remove(seat);
      rt.dispose();
      // (the house's own materials stay: the room still draws with them)
      K.freeTree(seat, scene.userData.set);
    }
  };
}
