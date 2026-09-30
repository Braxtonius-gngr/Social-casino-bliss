// THE STUDY: Obsidian Ledger's home at Showroom (three.js + CSS3D).
//
// After the roll intro has floated up, a tap on the landing starts one
// continuous shot, as it does for the card table (table.mjs): the camera
// rises out of the float and glides across the room, away from the
// gaming floor, down into the chair at a partners' desk in the house's
// study. On the desk stands a Georgian grand orrery under an engraved glass
// dome (orrery.mjs): each planet is one of your ready platforms. Beside it
// lies the house's ledger, open at today, with the clock, what is ready
// and the hand to deal; a brass student lamp lights the desk, and behind it
// the shelves go up into the dark.
//
// Tap a planet: its card comes up out of it to you, with its Keen Info and
// its moves (the same card and sheet as the card table's). Drag across the
// desk: your hand is on the crank, and the train turns - the inner planets
// quick, the outer ones slow - and coasts to a stop with the gears'
// backlash. Tap the sun, or the ledger's "Step into the orrery": the
// camera goes down to the desk and in under the band, between the legs,
// and you are standing on the leather under the instrument - the arms
// sweeping overhead, the planets going round above them, the engraved sky
// of the dome over it all. It keeps turning while you are in there; a
// planet's card comes down to you there too. "Back to the desk" brings you
// out the way you came.
//
// Nothing here is scaled to fake the shrink: the camera goes where a very
// small you would stand, and its lens and the cards it holds up are sized
// for that - the perspective is true all the way in.
//
// Coordinates are the seat's own, as the table's: centimetres, the origin
// on the desk's top at the middle of its near edge's line, +z away from
// you, +y up, +x to your LEFT.

import * as THREE from '../vendor/three/three.module.js';
import { CSS3DRenderer, CSS3DObject } from '../vendor/three/three.addons.js';
import { tableKit as K } from './table.mjs';
import { buildOrrery } from './orrery.mjs';

export const DESTS = ['study'];

const DEG = Math.PI / 180;
const clamp01 = x => Math.min(Math.max(x, 0), 1);
const smoother = x => { x = clamp01(x); return x * x * x * (x * (6 * x - 15) + 10); };
const lerp = (a, b, k) => a + (b - a) * k;
const easeOut = (x, k = 3) => 1 - Math.pow(1 - clamp01(x), k);
const V = (x, y, z) => new THREE.Vector3(x, y, z);
const HERE = new URL('./', import.meta.url);
const asset = f => new URL(f, HERE).href;

// Where the study stands: across the room from the card table, the chair
// facing away from the gaming floor, so the camera comes in from behind it.
const STUDY = { at: [-236, 0, 12], yaw: -90 };
// The desk: a partners' desk, its top 150 x 78, the near edge a little in
// front of the origin; two pedestals of drawers to the floor.
const DESK = { w: 150, d: 78, z0: -5, top: 0, slab: 3.6, floor: -82 };
// The orrery: built in its own units (0.85 mm each) and scaled to cm: its
// sun 17 cm over the desk, the band 24 cm out, the dome 49 cm across.
const ORR = { at: [0, 0, 40], k: 0.085, height: 200, radius: 240, planets: 1.7 };
const SUN_AT = V(ORR.at[0], ORR.at[1] + ORR.height * ORR.k, ORR.at[2]);
// The ledger: open on the desk in front of you, below the orrery.
// (a folio: 38 x 25 open, so what is written in it reads, and taps, from the chair)
const LEDGER = { at: [0, 0, 6], yaw: 0, w: 38, h: 25, px: 30 };
// The lamp: a brass student lamp at the back on your right.
const LAMP = { at: [-50, 0, 60], shade: [-43, 41, 51], aim: [-2, 0, 32] };
// The views: the chair (portrait, landscape), and where you stand inside
// the orrery (on the leather, under the arms, looking up and in).
// (upright, the lens is wide - the desk from the ledger to the dome's top
// has to fit a narrow screen; on its side, the natural one)
const VIEW = [{ eye: [0, 72, -46], aim: [0, 8, 29], fov: 64 }, { eye: [0, 54, -40], aim: [0, 10, 32], fov: 44 }];
const INSIDE = { eye: [8, 2, 31], aim: [-3, 21, 49], fov: 74, scale: 0.085 };
// The shot's timings (seconds), the dive's, and the crank's.
const T = { fly: 4.8, uiIn: 0.6, wake: 2.9, dive: 3.6, lift: 0.55 };
const CRANK = { perPx: 0.0035, coast: 0.93, inside: 1 / 70, lash: 0.006 };

// ------------------------------------------------------------ textures
// The desk's writing surface: a dark green morocco inset, tooled in gold
// round its edge - a fillet, a roll of small leaves, a fillet - and the
// leather's grain.
function leatherTex(W, D) {
  const k = 12, w = Math.round(W * k), h = Math.round(D * k);
  return K.canvasTex(w, h, (g) => {
    g.fillStyle = '#1d2a22'; g.fillRect(0, 0, w, h);
    // the grain: fine pebbling, and a broader mottle through it
    let seed = 7;
    const rnd = () => { seed = (seed * 1664525 + 1013904223) >>> 0; return seed / 4294967296; };
    for (let i = 0; i < w * h / 26; i++) {
      const x = rnd() * w, y = rnd() * h, v = rnd();
      g.fillStyle = v > 0.5 ? `rgba(120,150,120,${(v - 0.5) * 0.09})` : `rgba(0,0,0,${(0.5 - v) * 0.16})`;
      g.fillRect(x, y, 1.6, 1.6);
    }
    for (let i = 0; i < 90; i++) {
      const x = rnd() * w, y = rnd() * h, r = 20 + rnd() * 90;
      const gr = g.createRadialGradient(x, y, 0, x, y, r);
      gr.addColorStop(0, `rgba(${rnd() > 0.5 ? '70,95,78' : '8,12,10'},0.12)`); gr.addColorStop(1, 'rgba(0,0,0,0)');
      g.fillStyle = gr; g.fillRect(x - r, y - r, 2 * r, 2 * r);
    }
    // the tooling, in gold
    const gold = '#c9a45e', inset = 2.2 * k;
    g.strokeStyle = gold; g.lineWidth = 0.13 * k;
    g.strokeRect(inset, inset, w - 2 * inset, h - 2 * inset);
    g.strokeRect(inset + 1.1 * k, inset + 1.1 * k, w - 2 * inset - 2.2 * k, h - 2 * inset - 2.2 * k);
    // the roll: small leaves along the band between the fillets
    g.fillStyle = gold;
    const leaf = (x, y, a) => { g.save(); g.translate(x, y); g.rotate(a); g.beginPath(); g.ellipse(0, 0, 0.32 * k, 0.12 * k, 0, 0, Math.PI * 2); g.fill(); g.restore(); };
    const m = inset + 0.55 * k;
    for (let x = m + k; x < w - m - k; x += 0.9 * k) { leaf(x, m, 0.5); leaf(x, h - m, -0.5); }
    for (let y = m + k; y < h - m - k; y += 0.9 * k) { leaf(m, y, 1.1); leaf(w - m, y, -1.1); }
    // a corner fleuron
    [[m, m], [w - m, m], [m, h - m], [w - m, h - m]].forEach(([x, y]) => { g.beginPath(); g.arc(x, y, 0.45 * k, 0, Math.PI * 2); g.fill(); });
  });
}
// The ledger's page block seen edge-on: the fine lines of the leaves, a
// little uneven, the book's colour going to shadow at the fore-edge's foot.
function pageEdgeTex() {
  return K.canvasTex(64, 256, (g, w, h) => {
    g.fillStyle = '#e4dac3'; g.fillRect(0, 0, w, h);
    for (let y = 0; y < h; y += 2) { g.fillStyle = `rgba(90,70,40,${(0.05 + (Math.sin(y * 1.7) * 0.5 + 0.5) * 0.08).toFixed(3)})`; g.fillRect(0, y, w, 1); }
  });
}

// ------------------------------------------------------------ the set
// The desk, held to a partners' desk from a London cabinetmaker: figured
// walnut under a hard French polish (a clear coat that mirrors the lamp),
// a green morocco inset tooled in gold, two pedestals of drawers with
// polished brass handles, a moulded edge on the top.
function buildDesk(set) {
  const g = new THREE.Group();
  const wood = set.wood.clone();
  wood.color = new THREE.Color(0x6a4a3a);
  const W = DESK.w, D = DESK.d, zc = DESK.z0 + D / 2;
  // the top: a slab, its edge moulded (a thumbnail round)
  const top = new THREE.Mesh(new THREE.BoxGeometry(W, DESK.slab, D), wood);
  top.position.set(0, -DESK.slab / 2, zc); top.receiveShadow = true; top.castShadow = true;
  g.add(top);
  const edge = new THREE.Mesh(new THREE.CylinderGeometry(DESK.slab / 2, DESK.slab / 2, W, 16), wood);
  edge.rotation.z = Math.PI / 2; edge.position.set(0, -DESK.slab / 2, DESK.z0);
  g.add(edge);
  // the inset: the leather let into the top, flush
  const leather = new THREE.Mesh(new THREE.PlaneGeometry(W - 22, D - 18), new THREE.MeshStandardMaterial({ map: leatherTex(W - 22, D - 18), roughness: 0.62, metalness: 0 }));
  leather.rotation.x = -Math.PI / 2; leather.position.set(0, 0.02, zc); leather.receiveShadow = true;
  g.add(leather);
  // the pedestals, and their drawers' fronts and handles, toward you
  const brass = K.polishedOf(set.brass, 0.18);
  const pedH = DESK.slab - DESK.floor - DESK.slab, pedW = 44, pedD = D - 8;
  [-1, 1].forEach(sx => {
    const x = sx * (W / 2 - pedW / 2 - 3);
    const ped = new THREE.Mesh(new THREE.BoxGeometry(pedW, pedH, pedD), wood);
    ped.position.set(x, DESK.floor + pedH / 2, zc); ped.castShadow = true; ped.receiveShadow = true;
    g.add(ped);
    [0, 1, 2].forEach(r => {
      const h = [16, 20, 30][r], y = -DESK.slab - 2 - [0, 17, 38][r] - h / 2;
      const front = new THREE.Mesh(new THREE.BoxGeometry(pedW - 5, h - 1.2, 0.8), wood);
      front.position.set(x, y, DESK.z0 + 4 - 0.4);
      g.add(front);
      const handle = new THREE.Mesh(new THREE.TorusGeometry(2.2, 0.28, 8, 24, Math.PI), brass);
      handle.position.set(x, y, DESK.z0 + 4 - 1.2); handle.rotation.z = Math.PI;
      const plate = new THREE.Mesh(new THREE.CylinderGeometry(3.2, 3.2, 0.2, 24, 1, false, 0, Math.PI), brass);
      plate.rotation.set(Math.PI / 2, 0, Math.PI / 2); plate.position.set(x, y + 0.4, DESK.z0 + 4 - 0.85);
      g.add(handle, plate);
    });
  });
  return g;
}
// The lamp, held to a brass student lamp: a weighted round foot, a column
// with a sliding arm, a cased-glass shade - green outside, white inside -
// its light a warm pool on the desk. The light is the lamp's own spot; the
// shade's lining glows.
function buildLamp(set) {
  const g = new THREE.Group();
  const brass = K.polishedOf(set.brass, 0.2);
  const [bx, , bz] = LAMP.at, [sx, sy, sz] = LAMP.shade;
  const foot = new THREE.Mesh(new THREE.LatheGeometry([[0, 0], [7, 0], [7, 0.8], [6, 1.6], [2.2, 2.4], [1.2, 4], [0, 4]].map(([x, y]) => new THREE.Vector2(x, y)), 48), brass);
  foot.position.set(bx, 0, bz); foot.castShadow = true;
  const colH = sy + 6;
  const col = new THREE.Mesh(new THREE.CylinderGeometry(0.6, 0.7, colH, 16), brass);
  col.position.set(bx, colH / 2, bz); col.castShadow = true;
  const finial = new THREE.Mesh(new THREE.SphereGeometry(1.1, 16, 12), brass);
  finial.position.set(bx, colH + 0.6, bz);
  // the arm, out from the column to the shade's gallery
  const from = V(bx, sy + 2.5, bz), to = V(sx, sy + 2.5, sz);
  const arm = new THREE.Mesh(new THREE.CylinderGeometry(0.4, 0.4, from.distanceTo(to), 12), brass);
  arm.position.copy(from).lerp(to, 0.5); arm.quaternion.setFromUnitVectors(V(0, 1, 0), to.clone().sub(from).normalize());
  // the shade: an open cone of cased glass, tipped toward the desk's middle
  const shade = new THREE.Group();
  const prof = [[3.2, 3.6], [5.5, 1.5], [9.5, -3.2], [10, -3.8]].map(([x, y]) => new THREE.Vector2(x, y));
  const outer = new THREE.Mesh(new THREE.LatheGeometry(prof, 48), new THREE.MeshPhysicalMaterial({ color: 0x1f4a33, roughness: 0.18, clearcoat: 1, clearcoatRoughness: 0.05, side: THREE.FrontSide }));
  const lining = new THREE.Mesh(new THREE.LatheGeometry(prof.map(v => new THREE.Vector2(v.x - 0.2, v.y)), 48), new THREE.MeshBasicMaterial({ color: new THREE.Color(1.5, 1.35, 1.1), side: THREE.BackSide }));
  const gallery = new THREE.Mesh(new THREE.TorusGeometry(3.3, 0.25, 8, 32), brass);
  gallery.rotation.x = Math.PI / 2; gallery.position.y = 3.6;
  const rim = new THREE.Mesh(new THREE.TorusGeometry(10, 0.18, 8, 64), brass);
  rim.rotation.x = Math.PI / 2; rim.position.y = -3.8;
  shade.add(outer, lining, gallery, rim);
  shade.position.set(sx, sy, sz);
  const tip = V(...LAMP.aim).sub(V(sx, sy, sz)).normalize();
  shade.quaternion.setFromUnitVectors(V(0, -1, 0), tip);
  outer.castShadow = true;
  g.add(foot, col, finial, arm, shade);
  // the light: a warm spot from inside the shade
  const light = new THREE.SpotLight(0xffe6c4, 0, 0, 0.92, 0.7, 0);
  light.position.set(sx, sy - 1, sz);
  light.target.position.set(...LAMP.aim);
  light.castShadow = true;
  light.shadow.mapSize.set(1024, 1024);
  light.shadow.camera.near = 8; light.shadow.camera.far = 160;
  light.shadow.bias = -0.0005; light.shadow.normalBias = 0.02; light.shadow.radius = 4;
  g.add(light, light.target);
  return { group: g, light, lining };
}
// The shelves behind the desk, going up into the dark: a walnut case of
// six shelves, the books on them leather-bound in the old library colours,
// a gilt band at the head and foot of each spine.
function buildShelves(set) {
  const g = new THREE.Group();
  const wood = set.wood.clone(); wood.color = new THREE.Color(0x3c2a20);
  const W = 230, H = 232, D = 34, z = 112, y0 = DESK.floor;
  const back = new THREE.Mesh(new THREE.BoxGeometry(W, H, 2), wood); back.position.set(0, y0 + H / 2, z + D / 2);
  g.add(back);
  [-1, 1].forEach(s => { const side = new THREE.Mesh(new THREE.BoxGeometry(3, H, D), wood); side.position.set(s * (W / 2 - 1.5), y0 + H / 2, z); g.add(side); });
  const rows = 6, gap = H / rows;
  const colors = [0x4a1a18, 0x23352a, 0x5a3b22, 0x1c1c22, 0x6b4a2a, 0x38201c, 0x2c3b35];
  const books = [];
  let seed = 31;
  const rnd = () => { seed = (seed * 1664525 + 1013904223) >>> 0; return seed / 4294967296; };
  for (let r = 0; r < rows; r++) {
    const sy = y0 + r * gap;
    const shelf = new THREE.Mesh(new THREE.BoxGeometry(W - 6, 2.4, D), wood); shelf.position.set(0, sy + 1.2, z); g.add(shelf);
    let x = -W / 2 + 5;
    while (x < W / 2 - 8) {
      const bw = 2.4 + rnd() * 3.4, bh = gap * (0.62 + rnd() * 0.3), bd = 19 + rnd() * 7;
      if (rnd() < 0.06) { x += bw * 2; continue; }
      books.push({ x: x + bw / 2, y: sy + 2.4 + bh / 2, z: z - D / 2 + bd / 2 + 3, w: bw, h: bh, d: bd, c: colors[Math.floor(rnd() * colors.length)] });
      x += bw + 0.15;
    }
  }
  const mat = new THREE.MeshStandardMaterial({ roughness: 0.7, metalness: 0 });
  const inst = new THREE.InstancedMesh(new THREE.BoxGeometry(1, 1, 1), mat, books.length);
  const m4 = new THREE.Matrix4(), col = new THREE.Color();
  books.forEach((b, i) => {
    m4.makeScale(b.w, b.h, b.d).setPosition(b.x, b.y, b.z);
    inst.setMatrixAt(i, m4);
    inst.setColorAt(i, col.set(b.c));
  });
  g.add(inst);
  // the gilt bands on the spines, toward the room
  const bandMat = new THREE.MeshStandardMaterial({ color: 0xb8924f, metalness: 1, roughness: 0.4 });
  const bands = new THREE.InstancedMesh(new THREE.BoxGeometry(1, 1, 0.2), bandMat, books.length * 2);
  books.forEach((b, i) => {
    [0.36, -0.36].forEach((f, j) => {
      m4.makeScale(b.w * 0.94, 0.5, 1).setPosition(b.x, b.y + f * b.h, b.z - b.d / 2 - 0.08);
      bands.setMatrixAt(i * 2 + j, m4);
    });
  });
  g.add(bands);
  return g;
}
// The ledger's body, under its pages (which are the page's own, laid on
// top): the covers in black calf with a gilt fillet, the two blocks of
// leaves, the ribbon.
function buildLedgerBody() {
  const g = new THREE.Group();
  const W = LEDGER.w, H = LEDGER.h;
  const calf = new THREE.MeshStandardMaterial({ color: 0x191512, roughness: 0.55 });
  const cover = new THREE.Mesh(new THREE.BoxGeometry(W + 1.4, 0.35, H + 1.2), calf);
  cover.position.y = 0.175; cover.castShadow = true; cover.receiveShadow = true;
  g.add(cover);
  const edge = pageEdgeTex();
  const pageMat = new THREE.MeshStandardMaterial({ color: 0xe8dfca, roughness: 0.9 });
  const edgeMat = new THREE.MeshStandardMaterial({ map: edge, roughness: 0.95 });
  [-1, 1].forEach(s => {
    const block = new THREE.Mesh(new THREE.BoxGeometry(W / 2 - 0.3, 1.3, H - 0.2), [edgeMat, edgeMat, pageMat, pageMat, edgeMat, edgeMat]);
    block.position.set(s * (W / 4 + 0.05), 0.35 + 0.65, 0); block.castShadow = true; block.receiveShadow = true;
    g.add(block);
  });
  const ribbon = new THREE.Mesh(new THREE.BoxGeometry(0.9, 0.05, 5.5), new THREE.MeshStandardMaterial({ color: 0x6b1c1f, roughness: 0.6 }));
  ribbon.position.set(0.9, 0.36, -H / 2 - 2.3); ribbon.rotation.y = 0.18;
  g.add(ribbon);
  // the spread as print (see drawPages), a hair over the leaves
  const c = document.createElement('canvas');
  c.width = 2048; c.height = Math.round(2048 * H / W);
  const tex = new THREE.CanvasTexture(c);
  tex.colorSpace = THREE.SRGBColorSpace; tex.anisotropy = 8;
  // (shaded as the page's own elements are - by what is printed, not by
  // the room's light - so the one hands over to the other unseen)
  const pages = new THREE.Mesh(new THREE.PlaneGeometry(W - 0.4, H - 0.2), new THREE.MeshBasicMaterial({ map: tex, toneMapped: false }));
  // (laid face up, its head away from you: turned in its own plane, then laid down)
  pages.rotation.set(-Math.PI / 2, 0, Math.PI); pages.position.y = 1.66;
  // (shown on the way in, so compiled with the rest before the shot)
  g.add(pages);
  g.userData.pages = { mesh: pages, tex, draw: v => { drawPages(c.getContext('2d'), c.width, c.height, v); tex.needsUpdate = true; } };
  return g;
}

// ------------------------------------------------------------ the ledger's pages
// The pages as print, for when the camera goes past them on the way into the
// orrery: the page's own elements (sharp, and the real buttons) show the
// ledger in the chair; this is the same spread drawn onto the pages
// themselves, so it is still written in, and stays on the desk where it is,
// as the lens comes down past it. (Drawn when the dive starts; values as
// the ledger shows them.)
function drawPages(g, W, H, v) {
  const k = W / (LEDGER.w * LEDGER.px);        // canvas pixels to page pixels
  const P = n => n * k;
  const paper = g.createRadialGradient(W / 2, H * 0.4, 0, W / 2, H * 0.4, W * 0.62);
  paper.addColorStop(0, '#efe7d3'); paper.addColorStop(0.7, '#e6dcc3'); paper.addColorStop(1, '#d9ccae');
  g.fillStyle = paper; g.fillRect(0, 0, W, H);
  g.fillStyle = 'rgba(70,95,140,0.16)';
  for (let y = P(54); y < H; y += P(54)) g.fillRect(0, y, W, Math.max(1, P(1)));
  // the gutter's shadow, the red double margins
  const gut = g.createLinearGradient(W / 2 - P(46), 0, W / 2 + P(46), 0);
  gut.addColorStop(0, 'rgba(60,40,15,0)'); gut.addColorStop(0.5, 'rgba(60,40,15,0.42)'); gut.addColorStop(1, 'rgba(60,40,15,0)');
  g.fillStyle = gut; g.fillRect(W / 2 - P(46), 0, P(92), H);
  g.fillStyle = 'rgba(165,45,40,0.45)';
  [P(62), P(68), W / 2 + P(32), W / 2 + P(38)].forEach(x => g.fillRect(x, 0, Math.max(1, P(1.8)), H));
  const txt = (s, x, y, font, color, align = 'left') => { g.font = font; g.fillStyle = color; g.textAlign = align; g.fillText(s, x, y); };
  const L = P(88), R = W / 2 + P(60), right = W - P(60), mid = W / 2 - P(60);
  txt('The House Ledger', L, P(96), `600 ${P(25)}px Cinzel, Georgia, serif`, '#6d5530');
  txt(v.day, L, P(150), `italic 500 ${P(38)}px "Cormorant Garamond", Georgia, serif`, '#3b3122');
  txt(v.now, L, P(300), `600 ${P(146)}px "Cormorant Garamond", Georgia, serif`, '#221c13');
  g.font = `600 ${P(146)}px "Cormorant Garamond", Georgia, serif`;
  txt(v.ampm, L + g.measureText(v.now).width + P(14), P(300), `500 ${P(28)}px Cinzel, Georgia, serif`, '#6d5530');
  const line = (y, a, b) => {
    txt(a, L, y, `italic 500 ${P(36)}px "Cormorant Garamond", Georgia, serif`, '#5d4f3a');
    txt(b, mid, y, `500 ${P(30)}px "IBM Plex Mono", ui-monospace, monospace`, '#2b241a', 'right');
    g.fillStyle = 'rgba(90,70,40,0.35)'; for (let x = L; x < mid; x += P(6)) g.fillRect(x, y + P(10), P(2), P(1.4));
  };
  line(P(420), 'Next ready', v.next);
  line(P(490), 'Done today', v.done);
  txt('Step into the orrery \u203a', L, H - P(70), `italic 600 ${P(42)}px "Cormorant Garamond", Georgia, serif`, '#7a4a22');
  txt('Today\u2019s hand', R, P(96), `600 ${P(25)}px Cinzel, Georgia, serif`, '#6d5530');
  txt(v.ready, R, P(300), `600 ${P(164)}px "Cormorant Garamond", Georgia, serif`, '#221c13');
  g.font = `600 ${P(164)}px "Cormorant Garamond", Georgia, serif`;
  txt('ready', R + g.measureText(v.ready).width + P(16), P(300), `italic 500 ${P(50)}px "Cormorant Garamond", Georgia, serif`, '#5d4f3a');
  txt(v.value, R, P(360), `italic 500 ${P(34)}px "Cormorant Garamond", Georgia, serif`, '#5d4f3a');
  // the hand's brass plate
  const bx = R, by = P(420), bw = right - R, bh = P(92);
  const brass = g.createLinearGradient(0, by, 0, by + bh);
  brass.addColorStop(0, '#dcbf8a'); brass.addColorStop(0.52, '#bd9a66'); brass.addColorStop(1, '#a2814f');
  g.fillStyle = brass; g.fillRect(bx, by, bw, bh);
  g.strokeStyle = '#8c6a3a'; g.lineWidth = P(2); g.strokeRect(bx, by, bw, bh);
  txt('Deal your hand', bx + P(30), by + bh / 2 + P(12), `700 ${P(32)}px Cinzel, Georgia, serif`, '#1c1812');
  txt('\u203a', bx + bw - P(30), by + bh / 2 + P(16), `700 ${P(50)}px Cinzel, Georgia, serif`, '#1c1812', 'right');
  txt('Tap a planet for its card \u00b7 drag to turn the orrery', R, H - P(70), `italic 500 ${P(28)}px "Cormorant Garamond", Georgia, serif`, '#7d6d55');
}
function ledgerHTML() {
  return `<div class="r3s-ledger-in">
    <div class="r3s-page r3s-left">
      <div class="r3s-eyebrow">The House Ledger</div>
      <div class="r3s-day"></div>
      <div class="r3s-clock"><b class="r3s-now">--:--</b><small class="r3s-ampm"></small></div>
      <div class="r3s-line r3s-l1"><span>Next ready</span><b class="r3s-next">&mdash;</b></div>
      <div class="r3s-line r3s-l2"><span>Done today</span><b class="r3s-done">&mdash;</b></div>
      <button type="button" class="r3s-dive">Step into the orrery &rsaquo;</button>
    </div>
    <div class="r3s-page r3s-right">
      <div class="r3s-eyebrow">Today&rsquo;s hand</div>
      <div class="r3s-hand"><b class="r3s-ready">&mdash;</b><span class="r3s-ready-k">ready</span></div>
      <div class="r3s-value"></div>
      <button type="button" class="r3s-run"><span>Deal your hand</span><i aria-hidden="true">&rsaquo;</i></button>
      <div class="r3s-foot">Tap a planet for its card &middot; drag to turn the orrery</div>
    </div>
  </div>`;
}

// ------------------------------------------------------------ prepare
// Built into the running scene while the intro floats on (its lamp comes up
// out of the dark), made ready - shaders compiled, textures sent - and only
// then shown. Returns the controller: fly() takes over from the intro.
export async function prepareTable(opts) {
  const o = Object.assign({ scene: null, dest: 'study', hooks: {} }, opts);
  const scene = o.scene;
  if (!scene.userData.set) throw new Error('study: the intro set is missing');
  const set = K.fineSet(scene.userData.set);
  const hooks = o.hooks || {};
  const seat = new THREE.Group();
  seat.position.set(...STUDY.at);
  seat.rotation.y = STUDY.yaw * DEG;
  seat.visible = false;
  scene.add(seat);

  seat.add(buildDesk(set));
  const lamp = buildLamp(set);
  seat.add(lamp.group);
  seat.add(buildShelves(set));
  // the ledger's body, where its pages will lie
  const ledgerBody = buildLedgerBody();
  ledgerBody.position.set(...LEDGER.at); ledgerBody.rotation.y = LEDGER.yaw * DEG;
  seat.add(ledgerBody);
  // contact shadows: under the ledger, the lamp's foot and the orrery's plinth
  const cs1 = K.contactShadow(LEDGER.w + 1.4, LEDGER.h + 1.2, 0.6, 1.4, [], 0.5);
  cs1.position.set(LEDGER.at[0], 0.03, LEDGER.at[2]); cs1.rotation.z = LEDGER.yaw * DEG;
  const cs2 = K.contactShadow(14, 14, 7, 2.2, [], 0.55); cs2.position.set(LAMP.at[0], 0.03, LAMP.at[2]);
  seat.add(cs1, cs2);

  // The orrery: its planets are the deck's ready platforms (the demonstration
  // hand with nothing ready), best first - the best nearest the sun.
  const hand = ((hooks.deck && hooks.deck()) || []).slice(0, 7);
  const cards = hand.length ? hand : K.demoHand().slice(0, 6);
  const planets = cards.map(c => ({ id: c.id, initials: K.initials(c.name), hue: typeof c.hue === 'number' ? c.hue : hueOf(c.name), tier: c.tier, spent: c.remaining > 0 }));
  // (the planets' initials and the ledger's print are painted in the room's type: wait for it)
  if (document.fonts && document.fonts.load) await Promise.all(['600 64px Cinzel', 'italic 500 40px "Cormorant Garamond"', '600 40px "Cormorant Garamond"', '500 30px "IBM Plex Mono"'].map(f => document.fonts.load(f).catch(() => {})));
  const orr = buildOrrery({ planets, radius: ORR.radius, wire: 1.6, planetScale: ORR.planets, stand: { height: ORR.height, wood: set.wood }, dome: true });
  orr.group.scale.setScalar(ORR.k);
  orr.group.position.set(ORR.at[0], ORR.at[1] + ORR.height * ORR.k, ORR.at[2]);
  orr.group.traverse(m => { if (m.isMesh) { m.castShadow = true; m.receiveShadow = true; } });
  if (orr.dome) orr.dome.traverse(m => { if (m.isMesh) { m.castShadow = false; m.receiveShadow = false; } });
  seat.add(orr.group);
  // The sun's lamp: as a tellurion's, an Argand lamp in the gilt sun, lit as
  // the house lights go down, so the planets show their day sides and their
  // phases from inside. (There from the start, dark: a light added later
  // would compile every material in the room again.)
  const sunLamp = new THREE.PointLight(0xffd9a0, 0, 60, 0);
  sunLamp.position.copy(SUN_AT);
  seat.add(sunLamp);
  const sunMat = orr.hits.find(m => m.userData.sun).material;
  sunMat.emissive = new THREE.Color(0xffc978);
  sunMat.emissiveIntensity = 0;
  const cs3 = K.contactShadow(8.5, 8.5, 4.2, 1.6, [], 0.6); cs3.position.set(ORR.at[0], 0.03, ORR.at[2]);
  seat.add(cs3);

  // The lamp comes up while the intro floats, so the desk is there, lit,
  // before the camera turns toward it.
  let lampT0 = performance.now();
  const lampUp = () => {
    const k = smoother((performance.now() - lampT0) / 2200);
    lamp.light.intensity = 5.2 * k;
    lamp.lining.material.color.setRGB(1.5 * k + 0.05, 1.35 * k + 0.04, 1.1 * k + 0.03);
    return k;
  };
  lampUp();

  async function fly(world, flyOpts = {}) {
    const fo = Object.assign({ manual: false, reduced: false, duration: 0, onArrive: null, host: null, seatView: null }, flyOpts);
    const { camera } = world;
    if (fo.reduced) lampT0 = -Infinity;
    const stageEl = fo.host || document.body;
    world.overlays.forEach(el => { el.style.visibility = 'hidden'; });
    const css = new CSS3DRenderer();
    css.domElement.className = 'r3t-css r3s-css';
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
      if (fo.seatView) { const [ey, ez, az, fv] = fo.seatView; return { eye: V(0, ey, ez), aim: V(0, 15, az), fov: fv }; }
      const v = VIEW[aspect < 0.62 ? 0 : 1];
      return { eye: V(...v.eye), aim: V(...v.aim), fov: v.fov };
    };
    let sv = seatView();
    let E1 = toWorld(sv.eye), A1 = toWorld(sv.aim);
    const inside = { eye: toWorld(V(...INSIDE.eye)), aim: toWorld(V(...INSIDE.aim)) };

    // The path in: one unbroken glide from the float to the chair, as the
    // card table's - up to a cruise over the gaming floor, the desk held in
    // the middle of the view, then down from behind the chair.
    const E0 = camera.position.clone(), q0 = camera.quaternion.clone();
    const seatBack = toWorld(V(0, 0, -1)).sub(toWorld(V(0, 0, 0))).normalize();
    const F = toWorld(V(0, 15, 34));
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
    // (the house lights: the room's fill and its mirror, which go down as
    // you go in - a planetarium's dimming - so the dome's engraved sky is
    // what you see beyond the instrument; the desk lamp stays on)
    const house = [];
    world.scene.traverse(o => { if (o.isHemisphereLight || o.isAmbientLight) house.push([o, o.intensity]); });
    const env0 = world.scene.environmentIntensity == null ? 1 : world.scene.environmentIntensity;

    // The dive: from the chair down past the ledger's right-hand side to the
    // leather, in under the band between its front legs, to where you stand
    // under the arms. dive runs 0 (in the chair) to 1 (inside); diveTo is
    // where it is going.
    const seatL = () => sv.eye, D1 = V(-20, 22, -10), D2 = V(-24, 3.4, 13), D3 = V(...INSIDE.eye);
    const diveEye = (k, out) => {
      const u = smoother(k), a = seatL();
      // (a cubic through the four: down to the desk's edge, low under the
      // band, and on in)
      const v = 1 - u;
      out.set(
        v * v * v * a.x + 3 * v * v * u * D1.x + 3 * v * u * u * D2.x + u * u * u * D3.x,
        v * v * v * a.y + 3 * v * v * u * D1.y + 3 * v * u * u * D2.y + u * u * u * D3.y,
        v * v * v * a.z + 3 * v * v * u * D1.z + 3 * v * u * u * D2.z + u * u * u * D3.z);
      return seat.localToWorld(out);
    };
    const qA = new THREE.Quaternion(), qB = new THREE.Quaternion(), qC = new THREE.Quaternion();
    let dive = 0, diveFrom = 0, diveTo = 0, diveT0 = 0;

    // ---- The UI, built now, shown on arrival.
    const ui = document.createElement('div');
    ui.className = 'r3t-ui';
    css.domElement.appendChild(ui);
    const ledgerEl = document.createElement('div');
    ledgerEl.className = 'r3s-ledger';
    ledgerEl.style.width = `${Math.round(LEDGER.w * LEDGER.px)}px`;
    ledgerEl.style.height = `${Math.round(LEDGER.h * LEDGER.px)}px`;
    ledgerEl.innerHTML = ledgerHTML();
    const ledgerObj = new CSS3DObject(ledgerEl);
    ledgerObj.position.set(LEDGER.at[0], 1.72, LEDGER.at[2]);
    K.lying(ledgerObj.quaternion, { yaw: LEDGER.yaw * DEG });
    ledgerObj.scale.setScalar(1 / LEDGER.px);
    cssSeat.add(ledgerObj);
    // the card a planet gives up: one, dressed for whichever planet it is
    const cardEl = document.createElement('div');
    cardEl.className = 'r3t-card r3s-card';
    cardEl.setAttribute('role', 'button');
    cardEl.tabIndex = -1;
    cardEl.style.visibility = 'hidden';
    const cardObj = new CSS3DObject(cardEl);
    cssSeat.add(cardObj);
    K.inkBacks(css.domElement, cards);
    // the info sheet (the card table's)
    const infoEl = document.createElement('div');
    infoEl.className = 'r3t-info';
    infoEl.setAttribute('role', 'region');
    infoEl.style.visibility = 'hidden';
    css.domElement.appendChild(infoEl);
    // your phone, in the corner (the card table's)
    const phoneEl = document.createElement('div');
    phoneEl.className = 'r3t-phone';
    phoneEl.setAttribute('role', 'group');
    phoneEl.setAttribute('aria-label', 'Phone');
    phoneEl.innerHTML = K.phoneHTML(asset);
    css.domElement.appendChild(phoneEl);
    let phoneHeld = false;
    const holdPhone = on => { phoneHeld = !!on; phoneEl.classList.toggle('r3t-held', phoneHeld); };
    // the way out, inside
    const outEl = document.createElement('button');
    outEl.type = 'button';
    outEl.className = 'r3s-out';
    outEl.innerHTML = '<span aria-hidden="true">&#8593;</span> Back to the desk';
    css.domElement.appendChild(outEl);
    // (the screen-reader's list of the planets: what the orrery holds)
    const srList = document.createElement('div');
    srList.className = 'r3t-sr';
    srList.innerHTML = `<ul>${cards.map(c => `<li><button type="button" data-id="${K.esc(c.id)}">${K.esc(c.name)}, ${K.esc(K.cardShown(c))}</button></li>`).join('')}</ul>`;
    css.domElement.appendChild(srList);
    css.domElement.classList.add('r3t-hide');

    // ---- Time and the ledger's readouts.
    const q = s => ledgerEl.querySelector(s);
    const put = (el, v) => { if (el && el.textContent !== v) el.textContent = v; };
    const sample = () => ({ ready: cards.length, value: cards.reduce((t, c) => t + (c.ev || 0), 0), next: null, done: 0 });
    let spentChanged = false;
    const tick = () => {
      const d = new Date();
      const hh = d.getHours(), mm = d.getMinutes();
      const hm = `${((hh + 11) % 12) + 1}:${String(mm).padStart(2, '0')}`;
      put(q('.r3s-now'), hm);
      put(q('.r3s-ampm'), hh < 12 ? 'AM' : 'PM');
      put(q('.r3s-day'), d.toLocaleDateString(undefined, { weekday: 'long', month: 'long', day: 'numeric' }));
      const st = (hand.length && hooks.status && hooks.status()) || sample();
      put(q('.r3s-ready'), String(st.ready));
      put(q('.r3s-value'), st.value > 0 ? `about $${st.value.toFixed(2)} in sweeps coins` : '');
      put(q('.r3s-next'), st.next ? K.fmtLeft(st.next) : 'All caught up');
      put(q('.r3s-done'), String(st.done));
      phoneEl.querySelectorAll('.r3t-ph-clock, .r3t-ph-big').forEach(n => put(n, hm));
      put(phoneEl.querySelector('.r3t-ph-day'), d.toLocaleDateString(undefined, { weekday: 'long', month: 'long', day: 'numeric' }));
      put(phoneEl.querySelector('.r3t-ph-ready'), `${st.ready} ready${st.value > 0 ? ` · ~$${st.value.toFixed(2)}` : ''}`);
      put(phoneEl.querySelector('.r3t-ph-next'), st.next ? `Next comes ready in ${K.fmtLeft(st.next)}` : `All caught up · ${st.done} done today`);
      // each planet as its platform stands: collected (anywhere), it is in
      // shadow until it comes round again
      if (hooks.cardState) cards.forEach(c => {
        const now = hooks.cardState(c.id);
        if (!now) return;
        const spent = now.remaining > 0;
        if (spent !== !!c.spentNow) { c.spentNow = spent; c.remaining = now.remaining; orr.setSpent(c.id, spent); spentChanged = true; }
      });
      if (spentChanged) { spentChanged = false; show(); }
    };

    // ---- The crank: the train's turn, in Earth turns. On arrival it runs
    // once (a hair back as the slack is taken up, round, and down to a stop
    // through the gears' backlash); a drag across the desk turns it by
    // hand and lets it coast; inside, it turns on its own, slowly.
    let crank = 0, crankV = 0, lashT = -1, lashDir = 0, wakeAt = FLY + UI_IN;
    const WAKE_TURNS = fo.reduced ? 0 : 0.42;
    const crankAt = tt => {
      if (fo.reduced || tt < wakeAt) return 0;
      const u = clamp01((tt - wakeAt) / T.wake);
      const back = -0.01 * Math.sin(Math.PI * clamp01(u / 0.1));
      const run = u < 0.1 ? 0 : 1 - Math.pow(1 - (u - 0.1) / 0.9, 3);
      const lash = u > 0.88 ? -0.005 * Math.sin(Math.PI * (u - 0.88) / 0.12) : 0;
      return back + run * WAKE_TURNS + lash;
    };
    let handTurn = 0;      // what the hand (and the drive inside) has added

    // ---- A planet's card: out of the planet and up to you (or down to you,
    // inside), turning from its back to its face as it comes; back into the
    // planet, shrinking to it, when it goes.
    let cardId = null, lift = 0, liftTo = 0, liftFrom = 0, liftT0 = 0;
    const pw = V(0, 0, 0), qw = new THREE.Quaternion(), seatQi = new THREE.Quaternion();
    const camScale = () => lerp(1, INSIDE.scale, smoother(dive));
    const focusPose = (outP, outQ) => {
      // held in front of you, a little above the middle of the view, at the
      // distance that makes it about four tenths of its height - scaled to
      // you, as the lens is
      const s = camScale(), fov = camera.fov * DEG;
      const d = (K.CARD.h * s) / (0.42 * 2 * Math.tan(fov / 2));
      outP.set(0, 0.1 * d, -d).applyQuaternion(camera.quaternion).add(camera.position);
      outQ.copy(camera.quaternion);
      return s;
    };
    const planetOf = id => orr.arms.find(A => A.id === id);
    const _p0 = V(0, 0, 0), _p1 = V(0, 0, 0), _q0 = new THREE.Quaternion(), _q1 = new THREE.Quaternion(), flipQ = new THREE.Quaternion();
    const poseCard = tt => {
      if (!cardId) { if (cardEl.style.visibility !== 'hidden') cardEl.style.visibility = 'hidden'; return; }
      lift = fo.reduced ? liftTo : lerp(liftFrom, liftTo, smoother((tt - liftT0) / T.lift));
      if (lift <= 0.001 && liftTo === 0) { cardId = null; cardEl.style.visibility = 'hidden'; hideInfo(); return; }
      const A = planetOf(cardId);
      if (!A) return;
      A.ball.getWorldPosition(_p0);
      const s = focusPose(_p1, _q1);
      // from the planet (the card as small as the ball) to your hand
      const k = lift;
      pw.copy(_p0).lerp(_p1, k);
      const arc = Math.sin(Math.PI * k) * 3 * s;
      pw.addScaledVector(V(0, 1, 0).applyQuaternion(camera.quaternion), arc);
      _q0.copy(_q1);
      flipQ.setFromAxisAngle(V(0, 1, 0), Math.PI * (1 - smoother(clamp01((k - 0.15) / 0.7))));
      qw.copy(_q0).multiply(flipQ);
      const ballPx = (A.pr * ORR.k * 2.2) / K.CARD.h;
      const sc = lerp(ballPx, s, smoother(k)) / K.CARD.px;
      // into the seat's frame, for the CSS scene
      seatQi.copy(seat.quaternion).invert();
      cardObj.position.copy(pw); seat.worldToLocal(cardObj.position);
      cardObj.quaternion.copy(seatQi).multiply(qw);
      cardObj.scale.setScalar(sc);
      cardEl.style.visibility = 'visible';
      // the face toward you is the face that shows
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
        camera.near = near0;
      } else {
        // in the chair, or on the way in or out, or inside
        const k = dive;
        if (k <= 0) { camera.position.copy(E1); camera.lookAt(A1); camera.fov = sv.fov; camera.near = near0; }
        else {
          diveEye(k, camera.position);
          // the look: down onto the orrery's front as it goes to the desk,
          // then along the leather under the band, then up and in
          lookQ(E1, A1, qA);
          lookQ(camera.position, toWorld(V(0, 7, 40)), qB);
          lookQ(inside.eye, inside.aim, qC);
          camQ.copy(qA).slerp(qB, smoother(k / 0.45)).slerp(qC, smoother((k - 0.55) / 0.45));
          camera.quaternion.copy(camQ);
          camera.fov = lerp(sv.fov, INSIDE.fov, smoother((k - 0.35) / 0.65));
          // (the lens's near plane comes in as the camera does: a tenth of
          // a millimetre from the lens, inside)
          camera.near = lerp(near0, 0.08, smoother(k / 0.7));
        }
      }
      camera.updateProjectionMatrix();
      camera.updateMatrixWorld();
    };
    const update = tt => {
      tNow = tt;
      lampUp();
      // the dive toward where it is going
      if (dive !== diveTo) {
        const u = fo.reduced ? 1 : clamp01((tt - diveT0) / T.dive);
        dive = lerp(diveFrom, diveTo, u);
        if (u >= 1) dive = diveTo;
      }
      placeCamera(tt);
      world.stage(introT0 + tt);
      const dim = 1 - 0.85 * smoother((dive - 0.45) / 0.5);
      house.forEach(([L, i0]) => { L.intensity = i0 * dim; });
      world.scene.environmentIntensity = env0 * lerp(1, 0.55, 1 - dim);
      world.lights.pendant.intensity = pendant0 * dim;
      const lit = 1 - dim;
      sunLamp.intensity = 3.4 * lit;
      sunMat.emissiveIntensity = 0.9 * lit;
      const kf = fo.reduced ? 1 : clamp01(tt / 0.9);
      world.lights.lensLight.intensity = lens0 * (1 - kf);
      world.lights.rim.intensity *= 1 - 0.6 * kf;
      if (world.bloom) world.bloom.strength = fo.reduced ? 0 : lerp(bloom0, 0.3, kf);
      // the crank: its run on arrival, the hand's turns, the drive inside
      const c = crankAt(tt) + handTurn;
      let lashK = 0;
      if (lashT >= 0) { const u = clamp01((tt - lashT) / 0.32); lashK = -CRANK.lash * lashDir * Math.sin(Math.PI * u) * (1 - u * 0.4); if (u >= 1) lashT = -1; }
      crank = c + lashK;
      orr.pose({ crank, face: camera.position });
      poseCard(tt);
      // (on the way in, the pages are print on the book - it stays written
      // in as the lens goes past it; in the chair they are the page's own)
      // (and on the way in to the chair, too: the page's own take over once
      // you are in it, as the rest of what you touch does)
      const inK = smoother(dive / 0.06);
      ledgerBody.userData.pages.mesh.visible = dive > 0 || tt < FLY;
      ledgerEl.style.opacity = (1 - inK).toFixed(3);
      ledgerEl.style.visibility = inK >= 1 || tt < FLY ? 'hidden' : '';
      outEl.classList.toggle('r3s-on', dive >= 0.999 && diveTo === 1);
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
    const busy = () => tNow < FLY + UI_IN + T.wake + 0.1 || dive !== diveTo || (diveTo === 1 && !fo.reduced) || dragging || Math.abs(crankV) > 1e-4 || lashT >= 0 || (cardId && Math.abs(lift - liftTo) > 1e-3);
    const loop = now => {
      if (!running) return;
      if (pacer && !pacer.due(now)) { raf = requestAnimationFrame(loop); return; }
      const dt = last ? Math.min(0.1, (now - last) / 1000) : 1 / 60;
      if (last && ++woke > 6 && !document.hidden && now - last < 250) world.pace((now - last) / 1000);
      last = now;
      // the hand's coast, and the drive inside
      if (!dragging && Math.abs(crankV) > 1e-4) {
        handTurn += crankV * dt * 60;
        crankV *= Math.pow(CRANK.coast, dt * 60);
        if (Math.abs(crankV) <= 1e-4) { lashDir = Math.sign(crankV) || 1; crankV = 0; lashT = tNow + dt; }
      }
      if (diveTo === 1 && !fo.reduced) handTurn += CRANK.inside * dt * smoother(dive);
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

    // ---- In and out of the orrery.
    const goInside = on => {
      const to = on ? 1 : 0;
      if (diveTo === to) return;
      putBack();
      // (the pages as print, drawn now, before anything moves)
      printPages();
      diveFrom = dive; diveTo = to; diveT0 = tNow;
      if (on) outEl.focus({ preventScroll: true });
      wake();
    };

    // ---- Touch: a planet (its card), the sun (in), the desk (the crank).
    const ray = new THREE.Raycaster(), ndc = new THREE.Vector2();
    const hitAt = e => {
      const r = css.domElement.getBoundingClientRect();
      ndc.set(((e.clientX - r.left) / r.width) * 2 - 1, -((e.clientY - r.top) / r.height) * 2 + 1);
      ray.setFromCamera(ndc, camera);
      // (a planet is easy to hit: its ring counts, and a little round it)
      const hits = ray.intersectObjects(orr.hits, false);
      if (hits.length) return hits[0].object.userData;
      let best = null, bestD = Infinity;
      orr.arms.forEach(A => {
        A.ball.getWorldPosition(pw);
        const d = ray.ray.distanceToPoint(pw), tol = A.pr * ORR.k * 1.9;
        if (d < tol && d < bestD) { bestD = d; best = { id: A.id }; }
      });
      return best;
    };
    let press = null;
    // (a touch on the study itself - not on a sheet, a modal or the page
    // over it)
    const onStage = e => { const st = world.canvas.parentElement; return !!(st && e.target && st.contains(e.target)); };
    const onDown = e => {
      if (tNow < FLY || e.button > 0 || !onStage(e)) return;
      if (e.target.closest && e.target.closest('.r3s-ledger, .r3t-info, .r3t-phone, .r3s-out, .r3t-card')) return;
      press = { id: e.pointerId, x: e.clientX, y: e.clientY, moved: 0, t: performance.now() };
      crankV = 0;
    };
    const onMove = e => {
      if (!press || e.pointerId !== press.id) return;
      const dx = e.clientX - press.x, dy = e.clientY - press.y;
      const now = performance.now(), dtm = Math.max(1, now - press.t);
      press.x = e.clientX; press.y = e.clientY; press.t = now;
      press.moved += Math.abs(dx) + Math.abs(dy);
      if (press.moved > 8) {
        if (!dragging) { dragging = true; putBack(); wake(); }
        // (the crank: sideways across the desk, the far side's way)
        const turn = -dx * CRANK.perPx;
        handTurn += turn;
        crankV = fo.reduced ? 0 : lerp(crankV, turn / dtm * 16, 0.5);
      }
    };
    const onUp = e => {
      if (!press || e.pointerId !== press.id) return;
      const wasDrag = dragging;
      dragging = false;
      press = null;
      if (wasDrag) { if (fo.reduced || Math.abs(crankV) <= 1e-4) { lashDir = Math.sign(crankV) || 1; crankV = 0; if (!fo.reduced) lashT = tNow; } wake(); return; }
      // a tap
      if (cardId && liftTo) { putBack(); return; }
      const h = hitAt(e);
      if (h && h.id) takeCard(h.id);
      else if (h && h.sun && diveTo === 0) goInside(true);
    };
    window.addEventListener('pointerdown', onDown, true);
    window.addEventListener('pointermove', onMove, true);
    window.addEventListener('pointerup', onUp, true);
    const onCancel = () => { dragging = false; press = null; };
    window.addEventListener('pointercancel', onCancel, true);
    css.domElement.addEventListener('click', e => {
      const act = e.target.closest('.r3t-info [data-act]');
      if (act) { const id = cardId; putBack(); if (hooks.cardAction && id) hooks.cardAction(id, act.dataset.act); tick(); return; }
      if (e.target.closest('.r3t-info-x')) { putBack(); return; }
      if (e.target.closest('.r3t-card')) { putBack(); return; }
      if (e.target.closest('.r3s-run')) { if (hooks.run) hooks.run(); return; }
      if (e.target.closest('.r3s-dive')) { goInside(true); return; }
      if (e.target.closest('.r3s-out')) { goInside(false); return; }
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
    // the pages as print, as the ledger reads now (see drawPages)
    const printPages = () => ledgerBody.userData.pages.draw({
      day: q('.r3s-day').textContent, now: q('.r3s-now').textContent, ampm: q('.r3s-ampm').textContent,
      next: q('.r3s-next').textContent, done: q('.r3s-done').textContent, ready: q('.r3s-ready').textContent, value: q('.r3s-value').textContent
    });
    printPages();
    update(0);
    if (fo.manual) world.rest(draw);
    else { draw(); running = true; raf = requestAnimationFrame(loop); }

    return {
      dest: 'study',
      duration: FLY,
      get t() { return tNow; },
      seek(t) { tNow = t; if (dive !== diveTo) { dive = diveTo; } update(t); show(); },
      // (lab and tests: into the orrery or out; a planet's card up or down;
      // the crank turned by hand; the dive shown at k)
      inside(on = true) { goInside(on); },
      diveAt(k) { dive = diveTo = diveFrom = k; update(tNow); show(); },
      takeCard(id) { takeCard(id || cards[0].id); },
      putBack,
      turn(turns) { handTurn += turns; update(tNow); show(); },
      pickUpPhone(on = true) { holdPhone(on); },
      planets: cards.map(c => c.id),
      // (lab and tests: where a planet, or the sun, is on the screen now)
      screenOf(id) {
        const r = css.domElement.getBoundingClientRect();
        const m = id === 'sun' ? orr.hits.find(h => h.userData.sun) : (planetOf(id) || {}).ball;
        if (!m) return null;
        const p = m.getWorldPosition(V(0, 0, 0)).project(camera);
        return { x: r.left + (p.x + 1) / 2 * r.width, y: r.top + (1 - p.y) / 2 * r.height };
      },
      get state() { return { dive: +dive.toFixed(3), diveTo, card: cardId, lift: +lift.toFixed(3), crank: +crank.toFixed(4), running }; },
      // (lab and tests: how many shaders the renderer has compiled - a count
      // that grows mid-move is a frame that waits on the GPU)
      get programs() { return world.renderer.info.programs.length; },
      // (the felt and trim are the card table's: the shot's own table keeps
      // the house's black under this skin)
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
    dest: 'study',
    fly,
    dispose() { scene.remove(seat); orr.dispose(); }
  };
}

// (the deck's hue for a name: the same as the app's nameHue)
function hueOf(name) {
  let h = 0;
  const s = String(name || '');
  for (let i = 0; i < s.length; i++) h = (h * 31 + s.charCodeAt(i)) >>> 0;
  return h % 360;
}
