// THE SÉANCE ROOM: Dead Channel's home at Showroom (three.js + CSS3D).
//
// After the roll intro floats up, a tap on the landing starts one
// continuous shot, as it does for the other homes: the camera rises out of
// the float, turns away from the gaming floor and comes down, through a
// gap in a ring of velvet drapes, into a chair at a round séance table. On
// the table, among three candles, a portable television is on a dead
// channel. As you sit, it tunes in: the snow gives way to tonight's
// listings - your ready platforms, one to a channel.
//
// Tap a channel: its card comes up out of the screen to you, with its Keen
// Info and its moves (the card table's card and sheet). "Run the deck" runs
// your hand. "Look through": your hands come up and make the fox's window
// - the old way of seeing what is on the other side - and you lean in
// through it until the snow fills your eyes, and come out in the signal: a
// dark where the spirit hangs among your channels. A tap on a channel there
// brings its card down to you; "Back to the room" brings you out the way
// you came.
//
// The way in is true all the way: the lean ends with the tube's snow
// exactly filling the lens, and the signal begins with that same snow
// across the lens, thinning as you move into it - one picture, no cut you
// can see. The signal is built far under the floor at its own scale, out of
// sight of the room.
//
// Each piece held to a real maker, at three distances (across the room:
// silhouette; arm's length: materials, bevels, seams; pinched in 3x:
// print, grain, wear), for what its surfaces do with the light, what it
// touches and how it moves:
//   The set - a mid-'70s 19-inch portable colour television: a cabinet of
//     walnut-grain vinyl over particleboard, rounded at its four long
//     edges; a brushed-chrome trim band round the face; a curved tube
//     under its glass, the picture's corners rounded; at its right a VHF
//     detent dial (2 to 13, printed on a black skirt) and a UHF fine-tune
//     knob, both with knurled chrome caps; a perforated speaker grille
//     under them; a telescopic rabbit-ear antenna on top. Room: a squat box
//     with a glowing face. Arm: the vinyl's grain, the chrome's bright
//     streak along its brushing, the glass's bulge mirroring the candles.
//     3x: the dial's numbers, the knurl, the grille's holes, the antenna's
//     sections. It stands on the cloth (its contact shadow) and lights the
//     table in front of it (the tube's own light).
//   The table - a round table under a black velvet cloth to the floor:
//     velvet soaks the light up and shows its nap only where light grazes
//     it (a sheen at the folds' edges), the folds deep at the hem.
//   The candles - three pillars of tallow-white wax, burned unevenly, with
//     drips down their sides and pooled on the cloth; each flame its own
//     soft teardrop with a blue root, swaying on its own, never two alike;
//     each lights its corner of the table, warm, and flickers as it does.
//   The drapes - heavy oxblood velvet hung in a ring round the table from
//     ceiling to floor, its folds catching the candlelight on their crowns
//     and falling into black between them; they close the room off.
//   The fox's window - the shape the hands make (kitsune no mado): two
//     hands, fingers crossed, a diamond of light between them. Drawn close
//     to the lens, so out of focus; lit by the screen (rim light on the
//     knuckles), the rest in shadow.
//   The signal - a dark with no floor: snow drifting through it toward
//     you, slow bands of scan crossing it, the spirit hung far off (the
//     scratchboard face, spirit.mjs), and your channels around it in the
//     set's own type. Lit by nothing in the room.
//   Motion - the shot's glide in; the set tuning in as you sit; the lean
//     (a sit-back first - the wind-up - then in, settling into the frame);
//     the drift through the signal, easing to a stop; a card's rise and
//     turn; flames and snow moving on their own. With motion off: cuts, a
//     still picture, no flame moving.
//
// Coordinates are the seat's own: centimetres, the origin at the table's
// top under its middle (the near edge of the cloth is at z = -R), +z away
// from you, +y up, +x to your LEFT.

import * as THREE from '../vendor/three/three.module.js';
import { CSS3DRenderer, CSS3DObject } from '../vendor/three/three.addons.js';
import { tableKit as K } from './table.mjs';
import { spiritCanvas, SPIRIT_SIZE } from '../rooms/spirit.mjs';

export const DESTS = ['seance'];

const DEG = Math.PI / 180;
const clamp01 = x => Math.min(Math.max(x, 0), 1);
const smoother = x => { x = clamp01(x); return x * x * x * (x * (6 * x - 15) + 10); };
const lerp = (a, b, k) => a + (b - a) * k;
const easeOut = (x, k = 3) => 1 - Math.pow(1 - clamp01(x), k);
const V = (x, y, z) => new THREE.Vector3(x, y, z);
const HERE = new URL('./', import.meta.url);
const asset = f => new URL(f, HERE).href;
function seeded(seed) { return () => { seed = (Math.imul(seed, 1664525) + 1013904223) >>> 0; return seed / 4294967296; }; }

// Where the room stands: behind the dice table's lens (the shot faces -z,
// so it never sees in) and to the left, clear of the arcade's alcove; the
// chair faces away from the gaming floor.
const SEANCE = { at: [-560, -6, 660], yaw: 0 };
// The table: its top at the origin, a radius of 52; the floor 76 under it.
const TABLE = { r: 52, floor: -76 };
// The set, standing on the far side of the table, facing you.
const TV = { z: 22, w: 54, h: 42, d: 40, r: 5 };
// The picture: 4:3 under the glass, its middle; 30 page pixels to the cm.
const SCREEN = { w: 36, h: 27, y: 21, x: 4, px: 30 };
const SCREEN_Z = TV.z - TV.d / 2 - 0.9;
// The drapes: a ring round the table.
const DRAPE = { r: 190, h: 330, folds: 46 };
// The views from the chair: upright, a lens that holds the set's picture
// nearly across the frame; on its side, the natural one.
const VIEW = [{ eye: [0, 40, -72], aim: [0, 19, 20], fov: 60 }, { eye: [0, 40, -62], aim: [0, 19, 20], fov: 42 }];
// The signal: far under the floor, at its own scale; where you come out
// (the snow across the lens) and where you stop, and the spirit far off.
const SIGNAL = { at: [0, -60000, 0], spiritZ: 2600, spiritY: 300, spiritH: 1500, stopZ: 900 };
// The channels there: a column 800 in front of where you stop, low in the
// frame under the spirit's face.
const CHAN = { w: 300, z: 1700, y0: -100, step: 92 };
// The candles: [x, z, height, radius].
const CANDLES = [[-30, 2, 17, 3.3], [33, 14, 11.5, 3.7], [10, -26, 8.5, 2.7]];
// The shot's timings (seconds): the glide in, the set tuning in, the lean
// and the drift, a card's lift; and where in the dive the lens hands over
// from the room to the signal.
const T = { fly: 4.8, tune: 1.4, uiIn: 0.6, dive: 4.6, lift: 0.55, hands: 1.1 };
const CUT = 0.5;
// The channels the guide shows (and the signal): four, so each line is a
// fingertip tall on an upright phone.
const ROWS = 4;

// ------------------------------------------------------------ textures
// Walnut-grain vinyl: long figured grain, a satin face.
function vinylTex() {
  // (walnut as the printers of the vinyl drew it: a mid-brown ground,
  // flat-sawn figure - long streaks of dark late-wood, and the cathedral
  // arches where the saw crossed the rings - and fine pores along it)
  return K.canvasTex(1024, 1024, (g, w, h) => {
    g.fillStyle = '#5b3920'; g.fillRect(0, 0, w, h);
    const rnd = seeded(11);
    // the cathedral arches: nested, wobbling, each a ring's late-wood
    for (let k = 0; k < 3; k++) {
      const cx = w * (0.2 + 0.3 * k + rnd() * 0.1), top = rnd() * h * 0.4;
      for (let i = 0; i < 26; i++) {
        const spread = 18 + i * 13, a = 0.1 + rnd() * 0.22;
        g.strokeStyle = `rgba(28,14,6,${a})`; g.lineWidth = 2 + rnd() * 5;
        g.beginPath();
        for (let y = top + i * 9; y <= h + 20; y += 10) {
          const t = (y - top - i * 9) / h, x = spread * Math.sqrt(t * 6) + Math.sin(y / 37 + i) * 3;
          g.lineTo(cx - x, y);
        }
        g.stroke();
        g.beginPath();
        for (let y = top + i * 9; y <= h + 20; y += 10) {
          const t = (y - top - i * 9) / h, x = spread * Math.sqrt(t * 6) + Math.sin(y / 41 + i) * 3;
          g.lineTo(cx + x, y);
        }
        g.stroke();
      }
    }
    // straight grain between, light and dark
    for (let i = 0; i < 340; i++) {
      const x = rnd() * w, a = 0.06 + rnd() * 0.16, wav = 2 + rnd() * 6, ph = rnd() * 6.28;
      g.strokeStyle = rnd() < 0.6 ? `rgba(24,12,5,${a})` : `rgba(150,100,60,${a * 0.7})`;
      g.lineWidth = 0.6 + rnd() * 2.6;
      g.beginPath();
      for (let y = 0; y <= h; y += 12) g.lineTo(x + Math.sin(y / (60 + wav * 9) + ph) * wav, y);
      g.stroke();
    }
    // pores
    g.fillStyle = 'rgba(16,8,3,0.35)';
    for (let i = 0; i < 9000; i++) g.fillRect(rnd() * w, rnd() * h, 1, 2 + rnd() * 4);
  });
}
// The speaker grille: a perforated black plate.
function grilleTex() {
  return K.canvasTex(256, 256, (g, w, h) => {
    g.fillStyle = '#121214'; g.fillRect(0, 0, w, h);
    g.fillStyle = '#020203';
    for (let y = 6; y < h; y += 10) for (let x = 6 + ((y / 10) % 2) * 5; x < w; x += 10) { g.beginPath(); g.arc(x, y, 2.3, 0, 7); g.fill(); }
  });
}
// The VHF dial's skirt: its channels round it in white on black.
function dialTex() {
  return K.canvasTex(256, 256, (g, w, h) => {
    g.fillStyle = '#0b0b0d'; g.beginPath(); g.arc(128, 128, 126, 0, 7); g.fill();
    g.fillStyle = '#e8e2d2'; g.font = '600 22px "IM Fell English SC", Georgia, serif'; g.textAlign = 'center'; g.textBaseline = 'middle';
    for (let c = 2; c <= 13; c++) {
      const a = ((c - 2) / 12) * Math.PI * 2 - Math.PI / 2;
      g.fillText(String(c), 128 + Math.cos(a) * 100, 128 + Math.sin(a) * 100);
    }
    g.strokeStyle = 'rgba(232,226,210,.35)'; g.lineWidth = 1.5; g.beginPath(); g.arc(128, 128, 80, 0, 7); g.stroke();
  });
}
// Velvet's nap: a fine noise in the normal, the light caught only at grazing.
function napTex() {
  return K.canvasTex(256, 256, (g, w, h) => {
    const img = g.createImageData(w, h), d = img.data, rnd = seeded(23);
    for (let i = 0; i < d.length; i += 4) { const v = 118 + (rnd() - 0.5) * 34; d[i] = v; d[i + 1] = 128 + (rnd() - 0.5) * 34; d[i + 2] = 255; d[i + 3] = 255; }
    g.putImageData(img, 0, 0);
  });
}
// A flame: a soft teardrop, white-hot at its heart, warm at its skin, a
// blue root at its foot.
function flameTex() {
  return K.canvasTex(64, 128, (g, w, h) => {
    g.clearRect(0, 0, w, h);
    const body = g.createRadialGradient(32, 82, 2, 32, 70, 46);
    body.addColorStop(0, 'rgba(255,250,235,1)'); body.addColorStop(0.25, 'rgba(255,214,140,0.95)'); body.addColorStop(0.55, 'rgba(255,140,50,0.55)'); body.addColorStop(1, 'rgba(255,90,20,0)');
    g.fillStyle = body;
    g.beginPath(); g.moveTo(32, 6); g.bezierCurveTo(52, 46, 54, 92, 32, 112); g.bezierCurveTo(10, 92, 12, 46, 32, 6); g.fill();
    const root = g.createRadialGradient(32, 104, 1, 32, 104, 12);
    root.addColorStop(0, 'rgba(90,140,255,0.8)'); root.addColorStop(1, 'rgba(90,140,255,0)');
    g.fillStyle = root; g.fillRect(16, 90, 32, 30);
  });
}
// The snow: a field of grain, redrawn a field at a time while it shows.
function snowCanvas() {
  const c = document.createElement('canvas'); c.width = 240; c.height = 180;
  const g = c.getContext('2d'), img = g.createImageData(c.width, c.height);
  const draw = (k = 1, band = -1) => {
    const d = img.data;
    for (let i = 0; i < d.length; i += 4) {
      const v = Math.random();
      let b = v < 0.6 ? v * 70 : 42 + (v - 0.6) * 520;
      const row = Math.floor(i / 4 / c.width);
      if (band >= 0 && Math.abs(row - band) < 6) b *= 1.35;
      b *= k;
      d[i] = b * 0.93; d[i + 1] = b * 0.97; d[i + 2] = Math.min(255, b * 1.06); d[i + 3] = 255;
    }
    g.putImageData(img, 0, 0);
  };
  draw();
  return { canvas: c, draw };
}
// A channel in the signal: its number and name in the set's type, bone on
// nothing, a red rule under it.
function channelTex(c, ch) {
  return K.canvasTex(1024, 256, (g, w, h) => {
    g.clearRect(0, 0, w, h);
    g.fillStyle = 'rgba(224,36,47,0.9)'; g.fillRect(40, 196, w - 80, 4);
    g.fillStyle = '#E9E4D8';
    g.font = '400 88px VT323, "Courier New", monospace'; g.textBaseline = 'alphabetic';
    g.fillText(`CH ${ch}`, 40, 110);
    g.font = '400 92px "IM Fell English SC", Georgia, serif';
    const name = c.name.length > 16 ? c.name.slice(0, 15) + '…' : c.name;
    g.fillText(name, 40, 184);
  });
}

// ------------------------------------------------------------ the pieces
function roundedBox(w, h, d, r) {
  const shape = K.roundRect(w, h, r);
  const g = new THREE.ExtrudeGeometry(shape, { depth: d - 2 * r * 0.4, bevelEnabled: true, bevelSize: r * 0.4, bevelThickness: r * 0.4, bevelSegments: 4, curveSegments: 8 });
  g.translate(0, 0, -(d - 2 * r * 0.4) / 2);
  return g;
}
function buildSet(set) {
  const g = new THREE.Group();
  g.position.set(-SCREEN.x, 0, TV.z);
  const vinylMap = vinylTex(); vinylMap.wrapS = vinylMap.wrapT = THREE.RepeatWrapping; vinylMap.repeat.set(0.022, 0.022); vinylMap.rotation = Math.PI / 2;
  const vinyl = K.finished(new THREE.MeshPhysicalMaterial({ color: 0xffffff, map: vinylMap, roughness: 0.48, clearcoat: 0.35, clearcoatRoughness: 0.4 }), 'pores', 2, 2, 0.15);
  const chrome = K.polishedOf(set.brass, 0.14); chrome.color.setHex(0xd8dbe0);
  const brushed = K.finished(new THREE.MeshStandardMaterial({ color: 0xc9ccd2, metalness: 1, roughness: 0.32 }), 'brushed', 3, 1, 0.12);
  const bezel = new THREE.MeshPhysicalMaterial({ color: 0x141416, roughness: 0.38, clearcoat: 0.6, clearcoatRoughness: 0.25 });
  // the cabinet
  const cab = new THREE.Mesh(roundedBox(TV.w, TV.h, TV.d, TV.r), vinyl);
  cab.position.y = TV.h / 2;
  cab.castShadow = true; cab.receiveShadow = true;
  g.add(cab);
  // the face: a dark plastic bezel, the chrome band round it
  const face = new THREE.Mesh(new THREE.ShapeGeometry(K.roundRect(TV.w - 4.4, TV.h - 4.4, 3.2)), bezel);
  face.position.set(0, TV.h / 2, -TV.d / 2 - 0.02); face.rotation.y = Math.PI;
  g.add(face);
  const trimShape = K.roundRect(TV.w - 3.2, TV.h - 3.2, 3.6);
  trimShape.holes.push(new THREE.Path(K.roundRect(TV.w - 4.6, TV.h - 4.6, 3.0).getPoints(24).reverse()));
  const trim = new THREE.Mesh(new THREE.ShapeGeometry(trimShape, 12), brushed);
  trim.position.set(0, TV.h / 2, -TV.d / 2 - 0.05); trim.rotation.y = Math.PI;
  g.add(trim);
  // the tube's surround: black, recessed; the glass over the picture, bowed
  const surround = new THREE.Mesh(new THREE.ShapeGeometry(K.roundRect(SCREEN.w + 3.4, SCREEN.h + 3.4, 3.4)), new THREE.MeshStandardMaterial({ color: 0x050506, roughness: 0.6 }));
  surround.position.set(SCREEN.x, SCREEN.y, -TV.d / 2 - 0.08); surround.rotation.y = Math.PI;
  g.add(surround);
  const glassGeo = new THREE.PlaneGeometry(SCREEN.w + 1.2, SCREEN.h + 1.2, 16, 12);
  const pos = glassGeo.attributes.position;
  for (let i = 0; i < pos.count; i++) {
    const x = pos.getX(i) / ((SCREEN.w + 1.2) / 2), y = pos.getY(i) / ((SCREEN.h + 1.2) / 2);
    pos.setZ(i, 1.4 * (1 - x * x) * (1 - y * y));
  }
  glassGeo.computeVertexNormals();
  const glassMat = K.glassy(new THREE.MeshStandardMaterial({ color: 0x000000, transparent: true, opacity: 0, roughness: 0.04, metalness: 0, depthWrite: false, envMapIntensity: 0.35 }), 0.5, 0.45);
  const glass = new THREE.Mesh(glassGeo, glassMat);
  glass.position.set(SCREEN.x, SCREEN.y, -TV.d / 2 - 0.6); glass.rotation.y = Math.PI;
  glass.renderOrder = 3;
  g.add(glass);
  // the knobs, at the right of the picture (your left is +x: the right is -x)
  const kx = SCREEN.x - SCREEN.w / 2 - 6.4;
  const dialMat = new THREE.MeshStandardMaterial({ map: dialTex(), roughness: 0.5 });
  const knob = (y, r, withDial) => {
    const k = new THREE.Group();
    k.position.set(kx, y, -TV.d / 2 - 0.1);
    if (withDial) { const skirt = new THREE.Mesh(new THREE.CircleGeometry(r * 1.55, 40), dialMat); skirt.rotation.y = Math.PI; skirt.position.z = -0.05; k.add(skirt); }
    const cap = new THREE.Mesh(new THREE.CylinderGeometry(r * 0.92, r, 2.2, 36), chrome);
    cap.rotation.x = Math.PI / 2; cap.position.z = -1.1; cap.castShadow = true;
    k.add(cap);
    // (the knurl: fine ribs round the cap's edge)
    const ribs = new THREE.Mesh(new THREE.CylinderGeometry(r * 1.01, r * 1.01, 1.4, 48, 1, true), K.finished(new THREE.MeshStandardMaterial({ color: 0xc8ccd4, metalness: 1, roughness: 0.42 }), 'brushed', 8, 1, 0.5));
    ribs.rotation.x = Math.PI / 2; ribs.position.z = -1.0; k.add(ribs);
    const pointer = new THREE.Mesh(new THREE.BoxGeometry(0.35, r * 0.8, 0.2), new THREE.MeshStandardMaterial({ color: 0x111111 }));
    pointer.position.set(0, r * 0.45, -2.25); k.add(pointer);
    return k;
  };
  const vhf = knob(SCREEN.y + 6, 2.2, true);
  vhf.rotation.z = -0.52 * 2; // (on channel 4: the dead one)
  g.add(vhf, knob(SCREEN.y - 5, 1.5, false));
  // the speaker grille under them
  const grille = new THREE.Mesh(new THREE.PlaneGeometry(7.6, 9), new THREE.MeshStandardMaterial({ map: grilleTex(), roughness: 0.7, metalness: 0.4 }));
  grille.position.set(kx, SCREEN.y - 13.5, -TV.d / 2 - 0.06); grille.rotation.y = Math.PI;
  g.add(grille);
  // the rabbit ears: a domed base, two telescopic rods
  const base = new THREE.Mesh(new THREE.SphereGeometry(4.2, 24, 12, 0, Math.PI * 2, 0, Math.PI / 2), new THREE.MeshPhysicalMaterial({ color: 0x18181a, roughness: 0.35, clearcoat: 0.5 }));
  base.position.set(-4, TV.h, 4); base.castShadow = true;
  g.add(base);
  [[-0.38, 0.32, 58], [0.42, -0.26, 52]].forEach(([tx, tz, len]) => {
    const rod = new THREE.Group();
    rod.position.set(-4, TV.h + 3, 4);
    rod.rotation.set(tz, 0, tx);
    for (let s = 0; s < 4; s++) {
      const r0 = 0.32 - s * 0.06;
      const seg = new THREE.Mesh(new THREE.CylinderGeometry(r0, r0, len / 4 + 1, 10), chrome);
      seg.position.y = (s + 0.5) * len / 4; seg.castShadow = true; rod.add(seg);
    }
    const tip = new THREE.Mesh(new THREE.SphereGeometry(0.45, 10, 8), chrome); tip.position.y = len + 0.3; rod.add(tip);
    g.add(rod);
  });
  return { group: g, glassMat };
}
function buildTable(set) {
  const g = new THREE.Group();
  const nap = napTex(); nap.wrapS = nap.wrapT = THREE.RepeatWrapping; nap.repeat.set(6, 6);
  const velvet = new THREE.MeshPhysicalMaterial({ color: 0x050406, roughness: 0.97, sheen: 1, sheenRoughness: 0.45, sheenColor: new THREE.Color(0x2a2026), normalMap: nap, normalScale: new THREE.Vector2(0.45, 0.45) });
  const top = new THREE.Mesh(new THREE.CircleGeometry(TABLE.r, 72), velvet);
  top.rotation.x = -Math.PI / 2; top.receiveShadow = true;
  g.add(top);
  // the cloth's fall: from the top's edge out a little to the floor, in
  // folds that deepen toward the hem
  const N = 160, M = 24, verts = [], idx = [], uvs = [];
  const rnd = seeded(7), ph = Array.from({ length: 9 }, () => rnd() * 6.28);
  for (let j = 0; j <= M; j++) {
    const v = j / M, y = -v * (-TABLE.floor + 0.5);
    for (let i = 0; i <= N; i++) {
      const a = (i / N) * Math.PI * 2;
      let f = 0;
      for (let k = 0; k < 3; k++) f += Math.sin(a * (11 + k * 7) + ph[k]) * (0.5 - k * 0.12);
      const r = TABLE.r + 0.6 + v * v * 7 + f * (0.3 + v * v * 3.2);
      verts.push(Math.sin(a) * r, y, Math.cos(a) * r);
      uvs.push(i / N * 8, v * 3);
    }
  }
  for (let j = 0; j < M; j++) for (let i = 0; i < N; i++) {
    const a = j * (N + 1) + i, b = a + N + 1;
    idx.push(a, a + 1, b, b, a + 1, b + 1);
  }
  const fall = new THREE.BufferGeometry();
  fall.setAttribute('position', new THREE.Float32BufferAttribute(verts, 3));
  fall.setAttribute('uv', new THREE.Float32BufferAttribute(uvs, 2));
  fall.setIndex(idx); fall.computeVertexNormals();
  const skirt = new THREE.Mesh(fall, velvet);
  skirt.castShadow = true; skirt.receiveShadow = true;
  g.add(skirt);
  return { group: g, velvet };
}
function buildCandles() {
  const g = new THREE.Group();
  // tallow: ivory, waxy (a soft sheen, no gloss), and lit from inside near
  // the flame - the top centimetres of a burning pillar glow warm as the
  // light comes through the wax (an emissive map, warm at the top fading
  // down; its strength follows the flame)
  const glowMap = K.canvasTex(4, 128, (g, w, h) => {
    const gr = g.createLinearGradient(0, 0, 0, h);
    gr.addColorStop(0, '#ffb060'); gr.addColorStop(0.16, '#a85a20'); gr.addColorStop(0.42, '#000'); gr.addColorStop(1, '#000');
    g.fillStyle = gr; g.fillRect(0, 0, w, h);
  });
  const wax = new THREE.MeshPhysicalMaterial({ color: 0xc9bb9e, roughness: 0.8, sheen: 0.5, sheenRoughness: 0.6, sheenColor: new THREE.Color(0xfff0d0), emissive: 0xffffff, emissiveMap: glowMap, emissiveIntensity: 0 });
  const dripWax = new THREE.MeshPhysicalMaterial({ color: 0xd2c5aa, roughness: 0.55, sheen: 0.5, sheenColor: new THREE.Color(0xfff0d0) });
  // a drip: thin where it left the rim, swelling to a bead where it set
  const dripGeo = len => {
    const pts = [];
    for (let k = 0; k <= 12; k++) { const t = k / 12; pts.push(new THREE.Vector2(0.06 + 0.26 * Math.pow(t, 1.6) + 0.12 * Math.exp(-Math.pow((t - 0.9) / 0.08, 2)), -t * len)); }
    pts.push(new THREE.Vector2(0.001, -len - 0.25));
    return new THREE.LatheGeometry(pts, 10);
  };
  const fTex = flameTex();
  const haloTex = K.canvasTex(64, 64, (g, w, h) => { const gr = g.createRadialGradient(32, 32, 0, 32, 32, 32); gr.addColorStop(0, 'rgba(255,255,255,0.9)'); gr.addColorStop(0.25, 'rgba(255,255,255,0.25)'); gr.addColorStop(1, 'rgba(255,255,255,0)'); g.fillStyle = gr; g.fillRect(0, 0, w, h); });
  const flames = [], lights = [];
  CANDLES.forEach(([x, z, h, r], i) => {
    const c = new THREE.Group();
    c.position.set(x, 0, z);
    // the pillar, its top burned down unevenly into a cup
    const body = new THREE.Mesh(new THREE.CylinderGeometry(r, r * 1.02, h, 32), wax);
    body.position.y = h / 2; body.castShadow = true; body.receiveShadow = true;
    c.add(body);
    const rim = new THREE.Mesh(new THREE.TorusGeometry(r * 0.86, r * 0.16, 8, 28), wax);
    rim.rotation.x = Math.PI / 2; rim.position.y = h - 0.15; c.add(rim);
    // drips: a few down its side, one pooled on the cloth
    const rnd = seeded(31 + i);
    // (half sunk in the side, each its own length, leaning as it ran)
    for (let d = 0; d < 5; d++) {
      const a = rnd() * 6.28, len = 0.8 + Math.pow(rnd(), 1.5) * h * 0.6;
      const drip = new THREE.Mesh(dripGeo(len), dripWax);
      drip.position.set(Math.sin(a) * (r - 0.08), h - 0.1, Math.cos(a) * (r - 0.08));
      drip.rotation.set(0, a, (rnd() - 0.5) * 0.08);
      drip.castShadow = true;
      c.add(drip);
    }
    const pool = new THREE.Mesh(new THREE.CircleGeometry(r * 0.9, 20), dripWax);
    pool.rotation.x = -Math.PI / 2; pool.position.set(r * 0.8, 0.05, -r * 0.4); c.add(pool);
    // the wick and its flame (a camera-facing card, added to the scene's top)
    const wick = new THREE.Mesh(new THREE.CylinderGeometry(0.08, 0.1, 0.9, 6), new THREE.MeshBasicMaterial({ color: 0x140c08 }));
    wick.position.y = h + 0.1; c.add(wick);
    const flame = new THREE.Sprite(new THREE.SpriteMaterial({ map: fTex, transparent: true, depthWrite: false, blending: THREE.AdditiveBlending, toneMapped: false, opacity: 0 }));
    flame.scale.set(1.5, 3.2, 1); flame.position.y = h + 1.7; flame.renderOrder = 4;
    c.add(flame);
    // (and the glow round it a lens sees in a dark room)
    const halo = new THREE.Sprite(new THREE.SpriteMaterial({ map: haloTex, color: 0xffb070, transparent: true, depthWrite: false, blending: THREE.AdditiveBlending, toneMapped: false, opacity: 0 }));
    halo.scale.set(9, 9, 1); halo.position.y = h + 1.9; halo.renderOrder = 4;
    c.add(halo);
    const light = new THREE.PointLight(0xffa860, 0, 160, 2);
    light.position.y = h + 3.6;
    c.add(light);
    flames.push({ s: flame, halo, h, ph: rnd() * 10, f1: 5.5 + rnd() * 3, f2: 11 + rnd() * 6 });
    lights.push(light);
    g.add(c);
  });
  return { group: g, flames, lights, wax };
}
function buildDrapes(set) {
  const g = new THREE.Group();
  const nap = napTex(); nap.wrapS = nap.wrapT = THREE.RepeatWrapping; nap.repeat.set(24, 6);
  const velvet = new THREE.MeshPhysicalMaterial({ color: 0x2a0508, roughness: 0.92, sheen: 1, sheenRoughness: 0.3, sheenColor: new THREE.Color(0x8a2a30), normalMap: nap, normalScale: new THREE.Vector2(0.3, 0.3), side: THREE.DoubleSide });
  const N = 360, M = 18, verts = [], idx = [];
  // (a ring, open behind you - where you came in - by the gap)
  const gap = 34 * DEG;
  for (let j = 0; j <= M; j++) {
    const v = j / M, y = TABLE.floor + v * DRAPE.h;
    for (let i = 0; i <= N; i++) {
      const a = Math.PI + gap / 2 + (i / N) * (Math.PI * 2 - gap);
      const fold = Math.sin(a * DRAPE.folds) * 6 + Math.sin(a * DRAPE.folds * 0.37 + 1.3) * 3;
      // (the folds gather toward the hem, as a hung drape's do)
      const r = DRAPE.r + fold * (0.7 + 0.3 * (1 - v));
      verts.push(Math.sin(a) * r, y, Math.cos(a) * r + 20);
    }
  }
  for (let j = 0; j < M; j++) for (let i = 0; i < N; i++) {
    const a = j * (N + 1) + i, b = a + N + 1;
    idx.push(a, b, a + 1, b, b + 1, a + 1);
  }
  const geo = new THREE.BufferGeometry();
  geo.setAttribute('position', new THREE.Float32BufferAttribute(verts, 3));
  const uv = []; for (let j = 0; j <= M; j++) for (let i = 0; i <= N; i++) uv.push(i / N * 12, j / M * 4);
  geo.setAttribute('uv', new THREE.Float32BufferAttribute(uv, 2));
  geo.setIndex(idx); geo.computeVertexNormals();
  const drape = new THREE.Mesh(geo, velvet);
  drape.receiveShadow = true;
  g.add(drape);
  // the floor inside the ring: an old rug, near black, its border faint
  const rug = new THREE.Mesh(new THREE.CircleGeometry(DRAPE.r - 6, 72), new THREE.MeshStandardMaterial({ color: 0x120a0a, roughness: 1 }));
  rug.rotation.x = -Math.PI / 2; rug.position.set(0, TABLE.floor + 0.2, 20); rug.receiveShadow = true;
  g.add(rug);
  return { group: g, velvet };
}
// The signal: snow drifting at you, scan bands, the spirit far off, your
// channels round it.
function buildSignal(cards) {
  const g = new THREE.Group();
  // (a dark with no floor: a sphere of near black round it all)
  const dark = new THREE.Mesh(new THREE.SphereGeometry(9000, 24, 16), new THREE.MeshBasicMaterial({ color: 0x020304, side: THREE.BackSide, fog: false }));
  g.add(dark);
  // the spirit
  // (its picture is drawn later - see paintSpirit: it takes a moment, and
  // nothing should stall while the room is being built; a blank canvas of
  // its size holds its place, so the material never changes shape)
  const blank = document.createElement('canvas'); blank.width = 4; blank.height = 4;
  const sTex = new THREE.CanvasTexture(blank); sTex.colorSpace = THREE.SRGBColorSpace;
  const sh = SIGNAL.spiritH, sw = sh * SPIRIT_SIZE.w / SPIRIT_SIZE.h;
  const spiritMesh = new THREE.Mesh(new THREE.PlaneGeometry(sw, sh), new THREE.MeshBasicMaterial({ map: sTex, transparent: true, toneMapped: false, depthWrite: false, fog: false }));
  spiritMesh.position.set(-sw * 0.08, SIGNAL.spiritY, SIGNAL.spiritZ); spiritMesh.rotation.y = Math.PI;
  g.add(spiritMesh);
  // the snow: a long tube of grains, drifting toward you
  const COUNT = 1800, P = new Float32Array(COUNT * 3), rnd = seeded(41);
  for (let i = 0; i < COUNT; i++) { P[i * 3] = (rnd() - 0.5) * 1600; P[i * 3 + 1] = (rnd() - 0.5) * 1200; P[i * 3 + 2] = rnd() * 3200; }
  const snowGeo = new THREE.BufferGeometry(); snowGeo.setAttribute('position', new THREE.BufferAttribute(P, 3));
  const dot = K.canvasTex(32, 32, (c) => { const gr = c.createRadialGradient(16, 16, 0, 16, 16, 16); gr.addColorStop(0, 'rgba(240,244,250,1)'); gr.addColorStop(1, 'rgba(240,244,250,0)'); c.fillStyle = gr; c.fillRect(0, 0, 32, 32); });
  const snow = new THREE.Points(snowGeo, new THREE.PointsMaterial({ map: dot, size: 7, sizeAttenuation: true, transparent: true, opacity: 0.8, depthWrite: false, blending: THREE.AdditiveBlending, toneMapped: false, color: 0xe9e4d8, fog: false }));
  g.add(snow);
  // the channels: a column in the dark under the spirit's face, nearer
  // than it - tonight's listings again, each drifting a little on its own
  const chans = cards.slice(0, ROWS).map((c, i) => {
    const tex = channelTex(c, 2 + i * 3); tex.colorSpace = THREE.SRGBColorSpace;
    const m = new THREE.Mesh(new THREE.PlaneGeometry(CHAN.w, CHAN.w / 4), new THREE.MeshBasicMaterial({ map: tex, transparent: true, toneMapped: false, depthWrite: false, fog: false }));
    m.position.set((i % 2 ? -1 : 1) * 14, CHAN.y0 - i * CHAN.step, CHAN.z);
    m.rotation.y = Math.PI;
    m.userData = { id: c.id, base: m.position.clone(), ph: i * 1.7 };
    g.add(m);
    return m;
  });
  return { group: g, snow, snowP: P, chans, spiritMesh };
}

function screenHTML(cards) {
  const rows = cards.slice(0, ROWS).map((c, i) => `<button type="button" class="r3d-row" data-id="${K.esc(c.id)}">
    <span class="r3d-ch">${2 + i * 3}</span><span class="r3d-name">${K.esc(c.name)}</span><span class="r3d-st" data-st="${K.esc(c.id)}">READY</span></button>`).join('');
  return `<div class="r3d-screen-in">
    <div class="r3d-top"><span class="r3d-title">Tonight</span><span class="r3d-clock"><b class="r3d-now">--:--</b><i class="r3d-ampm"></i></span></div>
    <div class="r3d-sub"><span><b class="r3d-n">0</b> ready</span><span class="r3d-value"></span></div>
    <div class="r3d-rows">${rows}</div>
    <div class="r3d-acts"><button type="button" class="r3d-run">Run the deck</button><button type="button" class="r3d-look">Look through</button></div>
  </div>`;
}
// The fox's window: two hands, fingers crossed, a diamond of light between
// them - the frame, as close to the lens as hands can be, out of focus.
function foxHTML() {
  // (in a 1000 x 1000 box, the window - a diamond - in the middle: each
  // hand an L, its index finger along one upper edge and its thumb along
  // the lower, the two hands' fingers crossing at the diamond's top and
  // bottom; the palms and wrists out to the sides and down, off the frame.
  // Backlit by the screen: a rim of its light along every edge that faces
  // the window, the rest in shadow.)
  const finger = (x1, y1, x2, y2, w) => `<path d="M${x1} ${y1}L${x2} ${y2}" stroke-width="${w}"/>`;
  const hand = (m) => {
    const X = x => (m ? 1000 - x : x);
    const f = (x1, y1, x2, y2, w) => finger(X(x1), y1, X(x2), y2, w);
    const parts =
      // palm and wrist, out to the side and down
      `<path d="M${X(-160)} 1120 C${X(-80)} 760 ${X(90)} 560 ${X(240)} 470 C${X(310)} 430 ${X(350)} 480 ${X(340)} 540 C${X(320)} 700 ${X(210)} 900 ${X(150)} 1120 Z" stroke="none"/>` +
      // the index finger: from the knuckle up and across to the top
      f(300, 480, 548, 222, 64) +
      // the thumb: from the heel of the hand down and across to the bottom
      f(306, 522, 548, 782, 70) +
      // the other fingers, curled into the palm
      f(250, 540, 318, 640, 68) + f(214, 600, 284, 700, 64) + f(180, 660, 246, 760, 58);
    return `<g class="r3d-hand" stroke="#07080a" fill="#07080a" stroke-linecap="round">${parts}</g>`;
  };
  const rim = (m) => {
    const X = x => (m ? 1000 - x : x);
    // (the screen's light along the inner edges: the index's underside, the
    // thumb's top)
    return `<path d="M${X(322)} 510L${X(552)} 270M${X(330)} 498L${X(540)} 724" stroke="#bcd3ee" stroke-opacity=".5" stroke-width="10" stroke-linecap="round" fill="none"/>`;
  };
  return `<svg class="r3d-fox-svg" viewBox="0 0 1000 1000" preserveAspectRatio="xMidYMid slice" aria-hidden="true">
    ${rim(false)}${rim(true)}${hand(false)}${hand(true)}
  </svg>`;
}

// ------------------------------------------------------------ the home
export async function prepareTable(opts) {
  const o = Object.assign({ scene: null, dest: 'seance', hooks: {} }, opts);
  const scene = o.scene;
  if (!scene.userData.set) throw new Error('seance: the intro set is missing');
  const set = K.fineSet(scene.userData.set);
  const hooks = o.hooks || {};
  const seat = new THREE.Group();
  seat.position.set(...SEANCE.at);
  seat.rotation.y = SEANCE.yaw * DEG;
  seat.visible = false;
  scene.add(seat);

  // (the dial's numbers and the channels are in the room's type - the same
  // sheet Dead Channel's room asks for: ask for it too, and wait for it)
  const FELL = 'https://fonts.googleapis.com/css2?family=IM+Fell+English+SC&display=swap';
  if (![...document.querySelectorAll('link[rel="stylesheet"]')].some(l => l.href === FELL)) {
    const l = document.createElement('link'); l.rel = 'stylesheet'; l.href = FELL; document.head.appendChild(l);
  }
  if (document.fonts && document.fonts.load) await Promise.all(['400 40px VT323', '400 40px "IM Fell English SC"'].map(f => document.fonts.load(f).catch(() => {})));

  const tv = buildSet(set);
  seat.add(tv.group);
  const table = buildTable(set);
  seat.add(table.group);
  const candles = buildCandles();
  seat.add(candles.group);
  const drapes = buildDrapes(set);
  seat.add(drapes.group);
  const csTv = K.contactShadow(TV.w, TV.d, 4, 4, [], 0.7); csTv.position.set(-SCREEN.x, 0.04, TV.z); seat.add(csTv);
  const csTable = K.contactShadow(TABLE.r * 2 + 14, TABLE.r * 2 + 14, TABLE.r + 7, 10, [], 0.65); csTable.position.set(0, TABLE.floor + 0.3, 0); seat.add(csTable);

  // The hand: the deck's ready platforms (the demonstration hand with
  // nothing ready), best first - four channels.
  const hand = ((hooks.deck && hooks.deck()) || []).slice(0, ROWS);
  const cards = hand.length ? hand : K.demoHand().slice(0, ROWS);

  // The picture: a mesh under the glass that shows the snow (as you come
  // in, and as you lean through) - the guide, when it is up, is the page's
  // own elements laid over it.
  const snow = snowCanvas();
  const snowTex = new THREE.CanvasTexture(snow.canvas); snowTex.colorSpace = THREE.SRGBColorSpace; snowTex.magFilter = THREE.NearestFilter;
  const pictureMat = new THREE.MeshBasicMaterial({ map: snowTex, toneMapped: false, color: 0xffffff });
  // (the picture's corners rounded, as the tube's are - and as the guide's
  // are, laid over it)
  const picGeo = new THREE.ShapeGeometry(K.roundRect(SCREEN.w, SCREEN.h, 40 / SCREEN.px), 10);
  const puv = picGeo.attributes.uv;
  for (let i = 0; i < puv.count; i++) puv.setXY(i, puv.getX(i) / SCREEN.w + 0.5, puv.getY(i) / SCREEN.h + 0.5);
  const picture = new THREE.Mesh(picGeo, pictureMat);
  picture.position.set(0, SCREEN.y, SCREEN_Z); picture.rotation.y = Math.PI;
  seat.add(picture);

  // The signal, far under the floor.
  const signal = buildSignal(cards);
  // The spirit's picture: drawn once, when the room is quiet after you
  // sit (or at once, should you look through before then).
  let spiritDrawn = false;
  const paintSpirit = () => {
    if (spiritDrawn) return;
    spiritDrawn = true;
    // (a new texture, not a new image in the old one: its storage is
    // already the blank's size)
    const mat = signal.spiritMesh.material, old = mat.map;
    const tex = new THREE.CanvasTexture(spiritCanvas({ seed: 17, scale: 1.2 })); tex.colorSpace = THREE.SRGBColorSpace;
    mat.map = tex;
    old.dispose();
  };
  signal.group.position.set(...SIGNAL.at);
  seat.add(signal.group);
  // (the snow across the lens as you come out: the tube's own picture, on
  // a card held in front of the camera, thinning as you move)
  const veilMat = new THREE.MeshBasicMaterial({ map: snowTex, toneMapped: false, transparent: true, opacity: 0, depthTest: false, depthWrite: false, fog: false });
  const veil = new THREE.Mesh(new THREE.PlaneGeometry(1, 1), veilMat);
  veil.renderOrder = 10; veil.visible = false; veil.frustumCulled = false;

  // The lights: every one in from the start and dark. The key: a dim cool
  // spill from above left (the room beyond the drapes); the candles; the
  // tube's own glow on the table.
  const key = new THREE.SpotLight(0xb8c8e8, 0, 0, 0.55, 0.8, 0);
  key.position.set(90, 190, -60); key.target.position.set(0, 0, 20);
  key.castShadow = true;
  key.shadow.mapSize.set(1024, 1024); key.shadow.camera.near = 80; key.shadow.camera.far = 420;
  key.shadow.bias = -0.0004; key.shadow.normalBias = 0.03; key.shadow.radius = 5;
  const tubeLight = new THREE.PointLight(0xbfd8ff, 0, 120, 2);
  tubeLight.position.set(0, SCREEN.y, SCREEN_Z - 6);
  seat.add(key, key.target, tubeLight);
  let litT0 = performance.now();
  let tube = 0;              // how bright the picture is (0 dark - 1 full)
  const lightsUp = (tt, reduced) => {
    const k = smoother((performance.now() - litT0) / 2200);
    key.intensity = 1.5 * k;
    tubeLight.intensity = 260 * k * (0.35 + 0.65 * tube);
    candles.flames.forEach((f, i) => {
      const fl = reduced ? 1 : 0.86 + 0.1 * Math.sin(tt * f.f1 + f.ph) + 0.05 * Math.sin(tt * f.f2 + f.ph * 2);
      candles.lights[i].intensity = 650 * k * fl;
      if (i === 0) candles.wax.emissiveIntensity = 0.55 * k * fl;
      f.s.material.opacity = k;
      f.halo.material.opacity = 0.22 * k * fl;
      f.s.scale.set(1.5 * (0.95 + 0.05 * fl), 3.2 * fl, 1);
      // (the flame sways, its tip most)
      f.s.position.x = reduced ? 0 : Math.sin(tt * 1.3 + f.ph) * 0.12;
    });
    return k;
  };
  lightsUp(0, false);

  async function fly(world, flyOpts = {}) {
    const fo = Object.assign({ manual: false, reduced: false, duration: 0, onArrive: null, host: null, seatView: null }, flyOpts);
    const { camera } = world;
    if (fo.reduced) litT0 = -Infinity;
    const stageEl = fo.host || document.body;
    world.overlays.forEach(el => { el.style.visibility = 'hidden'; });
    const css = new CSS3DRenderer();
    css.domElement.className = 'r3t-css r3d-css';
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
    camera.add(veil);
    if (!camera.parent) scene.add(camera);

    const toWorld = v => seat.localToWorld(v.clone());
    const sigW = v => signal.group.localToWorld(v.clone());
    seat.updateMatrixWorld(true);
    const seatView = () => {
      if (fo.seatView) { const [ey, ez, az, fv] = fo.seatView; return { eye: V(0, ey, ez), aim: V(0, 17, az), fov: fv }; }
      const v = VIEW[aspect < 0.62 ? 0 : 1];
      return { eye: V(...v.eye), aim: V(...v.aim), fov: v.fov };
    };
    let sv = seatView();
    let E1 = toWorld(sv.eye), A1 = toWorld(sv.aim);

    // The path in: up out of the float, round over the floor, and down
    // through the drapes' gap from behind the chair.
    const E0 = camera.position.clone(), q0 = camera.quaternion.clone();
    const seatBack = toWorld(V(0, 0, -1)).sub(toWorld(V(0, 0, 0))).normalize();
    const F = toWorld(V(0, 20, 30));
    const cruise = THREE.MathUtils.clamp(Math.max(E0.y, E1.y) + 70, 120, 160);
    const bez = (u, a, b, c, d) => { const v = 1 - u; return v * v * v * a + 3 * v * v * u * b + 3 * v * u * u * c + u * u * u * d; };
    // (worked in the seat's terms: round to the axis behind the chair well
    // out from the drapes, then straight in along it through the gap -
    // the curve's last two handles on the axis, so it comes through the
    // gap square, never grazing the velvet)
    const E0L = seat.worldToLocal(E0.clone());
    const P1 = V(0, 0, 0), P2 = V(0, 0, 0), eL = V(0, 0, 0);
    const eyeAt = (k, out) => {
      const u = smoother(k);
      P1.set(0, cruise - SEANCE.at[1], -620);
      P2.set(0, sv.eye.y + 15, -330);
      eL.set(bez(u, E0L.x, P1.x, P2.x, sv.eye.x), bez(u, E0L.y, P1.y, P2.y, sv.eye.y), bez(u, E0L.z, P1.z, P2.z, sv.eye.z));
      return out.copy(seat.localToWorld(eL));
    };
    const m4 = new THREE.Matrix4(), up = V(0, 1, 0);
    const lookQ = (eye, at, out) => out.setFromRotationMatrix(m4.lookAt(eye, at, up));
    const FLY = fo.reduced ? 0.01 : fo.duration > 0 ? fo.duration : T.fly;
    const UI_IN = fo.reduced ? 0.01 : T.uiIn;
    const TUNE = fo.reduced ? 0.01 : T.tune;
    const fov0 = camera.fov, near0 = camera.near, far0 = camera.far;
    const lens0 = world.lights.lensLight.intensity;
    const bloom0 = world.bloom ? world.bloom.strength : 0;
    const introT0 = world.t;
    // (the house lights go down as you come through the drapes: the room
    // beyond them is not lit in here)
    const house = [];
    scene.traverse(x => { if (x.isHemisphereLight || x.isAmbientLight) house.push([x, x.intensity]); });

    // The lean: from the chair, through the fox's window, to where the
    // picture exactly fills the lens (its height on an upright phone, its
    // width on a wide one), square on.
    const hover = { eye: V(0, 0, 0), q: new THREE.Quaternion(), fov: 0 };
    const setHover = () => {
      const f = sv.fov * DEG, t = Math.tan(f / 2);
      const d = Math.min((SCREEN.h / 2) / t, (SCREEN.w / 2) / (aspect * t));
      hover.eye.set(0, SCREEN.y, SCREEN_Z - d);
      hover.fov = sv.fov;
      lookQ(toWorld(hover.eye), toWorld(V(0, SCREEN.y, SCREEN_Z)), hover.q);
    };
    setHover();
    const bezV = (u, a, b, c, d, out) => { const v = 1 - u; return out.set(
      v * v * v * a.x + 3 * v * v * u * b.x + 3 * v * u * u * c.x + u * u * u * d.x,
      v * v * v * a.y + 3 * v * v * u * b.y + 3 * v * u * u * c.y + u * u * u * d.y,
      v * v * v * a.z + 3 * v * v * u * b.z + 3 * v * u * u * c.z + u * u * u * d.z); };
    const qSeat0 = new THREE.Quaternion();
    const L1 = V(0, 0, 0), L2 = V(0, 0, 0), leanP = V(0, 0, 0);
    const leanAt = k => {
      const u = clamp01(k / CUT);
      // (a sit-back first - the wind-up - then in, settling into the frame)
      const back = u < 0.18 ? Math.sin(Math.PI * u / 0.18) : 0;
      const s = smoother((u - 0.12) / 0.88);
      L1.copy(sv.eye).add(V(0, -2, 14)); L2.copy(hover.eye).add(V(0, 2, -18));
      bezV(s, sv.eye, L1, L2, hover.eye, leanP);
      leanP.y += back * 1.6; leanP.z -= back * 4;
      return { p: toWorld(leanP), s };
    };
    const insEye0 = sigW(V(0, 0, 0)), insEye1 = sigW(V(0, 40, SIGNAL.stopZ));
    const insAim = sigW(V(0, 60, SIGNAL.spiritZ));
    const qIn0 = new THREE.Quaternion(), qIn1 = new THREE.Quaternion();
    lookQ(insEye0, sigW(V(0, 0, 100)), qIn0); lookQ(insEye1, insAim, qIn1);
    let dive = 0, diveFrom = 0, diveTo = 0, diveT0 = 0;

    // ---- The UI, built now, shown when the set has tuned in.
    const ui = document.createElement('div');
    ui.className = 'r3t-ui';
    css.domElement.appendChild(ui);
    const screenEl = document.createElement('div');
    screenEl.className = 'r3d-screen';
    screenEl.style.width = `${Math.round(SCREEN.w * SCREEN.px)}px`;
    screenEl.style.height = `${Math.round(SCREEN.h * SCREEN.px)}px`;
    screenEl.innerHTML = screenHTML(cards);
    const screenObj = new CSS3DObject(screenEl);
    screenObj.position.set(0, SCREEN.y, SCREEN_Z - 0.05);
    screenObj.rotation.y = Math.PI;
    screenObj.scale.setScalar(1 / SCREEN.px);
    cssSeat.add(screenObj);
    const cardEl = document.createElement('div');
    cardEl.className = 'r3t-card r3d-card';
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
    const foxEl = document.createElement('div');
    foxEl.className = 'r3d-fox';
    foxEl.setAttribute('aria-hidden', 'true');
    foxEl.innerHTML = foxHTML();
    css.domElement.appendChild(foxEl);
    const outEl = document.createElement('button');
    outEl.type = 'button';
    outEl.className = 'r3d-out';
    outEl.innerHTML = '<span aria-hidden="true">&#8593;</span> Back to the room';
    css.domElement.appendChild(outEl);
    const srList = document.createElement('div');
    srList.className = 'r3t-sr';
    srList.innerHTML = `<ul>${cards.map(c => `<li><button type="button" data-id="${K.esc(c.id)}">${K.esc(c.name)}, ${K.esc(K.cardShown(c))}</button></li>`).join('')}</ul>`;
    css.domElement.appendChild(srList);
    css.domElement.classList.add('r3t-hide');

    // ---- Time and the guide's readouts.
    const q = s => screenEl.querySelector(s);
    const put = (el, v) => { if (el && el.textContent !== v) el.textContent = v; };
    const sample = () => ({ ready: cards.length, value: cards.reduce((t, c) => t + (c.ev || 0), 0), next: null, done: 0 });
    const tick = () => {
      const d = new Date();
      const hh = d.getHours(), mm = d.getMinutes();
      const hm = `${((hh + 11) % 12) + 1}:${String(mm).padStart(2, '0')}`;
      put(q('.r3d-now'), hm);
      put(q('.r3d-ampm'), hh < 12 ? 'AM' : 'PM');
      const st = (hand.length && hooks.status && hooks.status()) || sample();
      put(q('.r3d-n'), String(st.ready));
      put(q('.r3d-value'), st.value > 0 ? `about $${st.value.toFixed(2)} SC` : (st.next ? `next in ${K.fmtLeft(st.next)}` : `${st.done} done today`));
      phoneEl.querySelectorAll('.r3t-ph-clock, .r3t-ph-big').forEach(n => put(n, hm));
      put(phoneEl.querySelector('.r3t-ph-day'), d.toLocaleDateString(undefined, { weekday: 'long', month: 'long', day: 'numeric' }));
      put(phoneEl.querySelector('.r3t-ph-ready'), `${st.ready} ready${st.value > 0 ? ` · ~$${st.value.toFixed(2)}` : ''}`);
      put(phoneEl.querySelector('.r3t-ph-next'), st.next ? `Next comes ready in ${K.fmtLeft(st.next)}` : `All caught up · ${st.done} done today`);
      cards.forEach(c => {
        const now = hooks.cardState ? hooks.cardState(c.id) : null;
        const rem = now ? now.remaining : (c.remaining || 0);
        const el = screenEl.querySelector(`[data-st="${CSS.escape(c.id)}"]`);
        if (el) { put(el, rem > 0 ? K.fmtLeft(rem).toUpperCase() : 'READY'); el.classList.toggle('r3d-wait', rem > 0); }
      });
    };

    // ---- A card: out of its channel (on the screen, or in the signal) and
    // up to you, turning from its back to its face as it comes.
    let cardId = null, lift = 0, liftTo = 0, liftFrom = 0, liftT0 = 0;
    const pw = V(0, 0, 0), qw = new THREE.Quaternion(), seatQi = new THREE.Quaternion();
    const focusPose = (outP, outQ) => {
      const fov = camera.fov * DEG;
      const d = K.CARD.h / (0.42 * 2 * Math.tan(fov / 2));
      outP.set(0, 0.1 * d, -d).applyQuaternion(camera.quaternion).add(camera.position);
      outQ.copy(camera.quaternion);
      return d;
    };
    // (a row's middle on the picture: see .r3d-rows in the stylesheet -
    // 290 px down, 120 px each)
    const rowAt = (id, out) => {
      const i = cards.findIndex(c => c.id === id);
      const y = SCREEN.y + SCREEN.h / 2 - (290 + 120 * i + 60) / SCREEN.px;
      return out.copy(toWorld(V(0, y, SCREEN_Z - 0.2)));
    };
    const chanOf = id => signal.chans.find(m => m.userData.id === id);
    const _p0 = V(0, 0, 0), _p1 = V(0, 0, 0), _q1 = new THREE.Quaternion(), flipQ = new THREE.Quaternion();
    const poseCard = tt => {
      if (!cardId) { if (cardEl.style.visibility !== 'hidden') cardEl.style.visibility = 'hidden'; return; }
      lift = fo.reduced ? liftTo : lerp(liftFrom, liftTo, smoother((tt - liftT0) / T.lift));
      if (lift <= 0.001 && liftTo === 0) { cardId = null; cardEl.style.visibility = 'hidden'; hideInfo(); return; }
      const inside = dive >= CUT;
      const C = inside ? chanOf(cardId) : null;
      if (C) C.getWorldPosition(_p0); else rowAt(cardId, _p0);
      const d = focusPose(_p1, _q1);
      const k = lift;
      pw.copy(_p0).lerp(_p1, k);
      pw.addScaledVector(V(0, 1, 0).applyQuaternion(camera.quaternion), Math.sin(Math.PI * k) * 0.06 * d);
      flipQ.setFromAxisAngle(V(0, 1, 0), Math.PI * (1 - smoother(clamp01((k - 0.15) / 0.7))));
      qw.copy(_q1).multiply(flipQ);
      const from = inside ? (CHAN.w / 4) / K.CARD.h : (120 / SCREEN.px) / K.CARD.h;
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
    let tNow = 0, arrived = false, snowT = 0, focusOut = false, spiritT = 0;
    const flyEye = V(0, 0, 0), qTable = new THREE.Quaternion(), qSeat = new THREE.Quaternion(), camQ = new THREE.Quaternion();
    const placeCamera = tt => {
      camera.up.copy(up);
      camera.far = 30000;
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
        lookQ(E1, A1, qSeat0);
        camera.position.copy(E1); camera.quaternion.copy(qSeat0); camera.fov = sv.fov; camera.near = near0;
      } else if (dive < CUT) {
        const L = leanAt(dive);
        lookQ(E1, A1, qSeat0);
        camera.position.copy(L.p);
        camera.quaternion.copy(qSeat0).slerp(hover.q, L.s);
        camera.fov = sv.fov;
        camera.near = lerp(near0, 0.5, L.s);
      } else {
        // the signal: from the snow across the lens out to where you stop,
        // turning to the spirit as you come
        const u = smoother((dive - CUT) / (1 - CUT));
        camera.position.copy(insEye0).lerp(insEye1, u);
        camera.quaternion.copy(qIn0).slerp(qIn1, smoother((dive - CUT) / (1 - CUT) * 1.2));
        camera.fov = lerp(sv.fov, sv.fov + 6, u);
        camera.near = 2; camera.far = 30000;
      }
      camera.updateProjectionMatrix();
      camera.updateMatrixWorld();
    };
    const update = tt => {
      tNow = tt;
      lightsUp(tt, fo.reduced);
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
      const kh = fo.reduced ? 1 : smoother((tt - FLY * 0.55) / (FLY * 0.45));
      house.forEach(([l, i0]) => { l.intensity = i0 * (1 - 0.8 * kh); });
      if (world.bloom) world.bloom.strength = fo.reduced ? 0 : lerp(bloom0, 0.42, kf);
      // the set: snow as you come in; tuned in as you sit (the guide over
      // a dim raster); snow again as you lean through
      const tuned = tt < FLY ? 0 : smoother((tt - FLY) / TUNE);
      const leanK = dive <= 0 ? 0 : clamp01(dive / CUT);
      const snowK = Math.max(1 - tuned, smoother((leanK - 0.25) / 0.6));
      tube = 0.4 + 0.6 * snowK;
      pictureMat.color.setScalar(lerp(0.12, 1, snowK));
      picture.visible = dive < CUT;
      tv.glassMat.envMapIntensity = 0.35 * (1 - smoother((leanK - 0.5) / 0.4));
      // (the snow is drawn a field at a time, while it shows)
      if ((snowK > 0.02 || dive >= CUT) && !fo.reduced && tt - snowT > 1 / 24) { snowT = tt; snow.draw(1, Math.floor((tt * 40) % 180)); snowTex.needsUpdate = true; }
      // the signal: the snow across the lens thinning as you move
      const inside = dive >= CUT;
      veil.visible = inside && dive < CUT + 0.25;
      if (veil.visible) {
        const d = camera.near * 2, t = Math.tan(camera.fov * DEG / 2);
        veil.position.set(0, 0, -d); veil.scale.set(2 * d * t * aspect * 1.02, 2 * d * t * 1.02, 1);
        veilMat.opacity = 1 - smoother((dive - CUT) / 0.25);
      }
      if (inside && !fo.reduced) {
        const P = signal.snowP, sp = 140 * (1 / 60);
        for (let i = 2; i < P.length; i += 3) { P[i] -= sp; if (P[i] < 0) P[i] += 3200; }
        signal.snow.geometry.attributes.position.needsUpdate = true;
        signal.chans.forEach(m => { const b = m.userData.base; m.position.set(b.x + Math.sin(tt * 0.3 + m.userData.ph) * 18, b.y + Math.sin(tt * 0.45 + m.userData.ph * 2) * 14, b.z); });
        signal.spiritMesh.position.y = SIGNAL.spiritY + Math.sin(tt * 0.35) * 10;
      }
      // the fox's window: the hands come up as you lean, then pass the lens
      const hands = dive <= 0 || inside ? 0 : smoother(leanK / 0.32);
      foxEl.style.setProperty('--fox', hands.toFixed(3));
      foxEl.style.setProperty('--fox-through', smoother((leanK - 0.5) / 0.42).toFixed(3));
      foxEl.style.visibility = hands > 0.001 && leanK < 0.95 ? 'visible' : 'hidden';
      poseCard(tt);
      const uiK = tuned * (1 - smoother(leanK / 0.25));
      screenEl.style.opacity = uiK.toFixed(3);
      screenEl.style.visibility = uiK <= 0.001 ? 'hidden' : '';
      const outOn = dive >= 0.999 && diveTo === 1;
      outEl.classList.toggle('r3d-on', outOn);
      if (outOn && focusOut) { focusOut = false; outEl.focus({ preventScroll: true }); }
      const stg = world.canvas.parentElement;
      if (stg && stg.classList.contains('r3t-focus') !== !!(cardId && liftTo)) stg.classList.toggle('r3t-focus', !!(cardId && liftTo));
      const uiIn = clamp01((tt - FLY + 0.1) / UI_IN);
      css.domElement.style.setProperty('--r3t-in', uiIn.toFixed(3));
      css.domElement.classList.toggle('r3t-hide', uiIn <= 0);
      if (!arrived && tt >= FLY) {
        arrived = true;
        if (fo.onArrive) fo.onArrive(css.domElement);
        spiritT = setTimeout(() => { spiritT = 0; const go = () => { if (!disposed) paintSpirit(); }; if (window.requestIdleCallback) requestIdleCallback(go, { timeout: 4000 }); else go(); }, 1500);
      }
    };
    const draw = () => { world.paint(); css.render(cssScene, camera); };
    const show = () => { if (running) draw(); else world.rest(draw); };

    // ---- The loop: runs while anything moves (the flames and the snow
    // always do, unless motion is off), then holds the frame.
    let running = false, raf = 0, last = 0, woke = 0, disposed = false;
    const pacer = world.pacer ? world.pacer() : null;
    const busy = () => !fo.reduced || tNow < FLY + TUNE + UI_IN + 0.1 || dive !== diveTo || (cardId && Math.abs(lift - liftTo) > 1e-3);
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

    // ---- Through the window, and back.
    const goInside = on => {
      const to = on ? 1 : 0;
      if (diveTo === to) return;
      if (on) paintSpirit();
      putBack();
      diveFrom = dive; diveTo = to; diveT0 = tNow;
      focusOut = on;
      wake();
    };

    // ---- Touch: a channel in the signal (its card); on the screen, the
    // page's own buttons take their own taps.
    const ray = new THREE.Raycaster(), ndc = new THREE.Vector2();
    const hitAt = e => {
      const r = css.domElement.getBoundingClientRect();
      ndc.set(((e.clientX - r.left) / r.width) * 2 - 1, -((e.clientY - r.top) / r.height) * 2 + 1);
      ray.setFromCamera(ndc, camera);
      const hits = ray.intersectObjects(signal.chans, false);
      if (hits.length) return hits[0].object.userData;
      let best = null, bestD = Infinity;
      signal.chans.forEach(m => {
        m.getWorldPosition(pw);
        const d = ray.ray.distanceToPoint(pw);
        if (d < CHAN.step * 0.5 && d < bestD) { bestD = d; best = { id: m.userData.id }; }
      });
      return best;
    };
    let press = null;
    const onStage = e => { const st = world.canvas.parentElement; return !!(st && e.target && st.contains(e.target)); };
    const onDown = e => {
      if (tNow < FLY || e.button > 0 || !onStage(e)) return;
      if (e.target.closest && e.target.closest('.r3d-screen, .r3t-info, .r3t-phone, .r3d-out, .r3t-card')) return;
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
      if (dive >= 0.999 && diveTo === 1) { const h = hitAt(e); if (h && h.id) takeCard(h.id); }
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
      const row = e.target.closest('.r3d-row[data-id]');
      if (row) { if (cardId === row.dataset.id && liftTo) putBack(); else takeCard(row.dataset.id); return; }
      if (e.target.closest('.r3d-run')) { if (hooks.run) hooks.run(); return; }
      if (e.target.closest('.r3d-look')) { goInside(true); return; }
      if (e.target.closest('.r3d-out')) { goInside(false); return; }
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
      dest: 'seance',
      duration: FLY,
      get t() { return tNow; },
      seek(t) { tNow = t; if (dive !== diveTo) dive = diveTo; update(t); show(); },
      inside(on = true) { goInside(on); },
      diveAt(k) { if (k > 0) paintSpirit(); dive = diveTo = diveFrom = k; update(tNow); show(); },
      takeCard(id) { takeCard(id || cards[0].id); },
      putBack,
      pickUpPhone(on = true) { holdPhone(on); },
      rows: cards.map(c => c.id),
      screenOf(id) {
        const r = css.domElement.getBoundingClientRect();
        if (id === 'run' || id === 'look') { const el = q(id === 'run' ? '.r3d-run' : '.r3d-look'); if (!el) return null; const b = el.getBoundingClientRect(); return { x: b.left + b.width / 2, y: b.top + b.height / 2 }; }
        if (dive >= CUT) { const m = chanOf(id); if (!m) return null; const p = m.getWorldPosition(V(0, 0, 0)).project(camera); return { x: r.left + (p.x + 1) / 2 * r.width, y: r.top + (1 - p.y) / 2 * r.height }; }
        const el = screenEl.querySelector(`.r3d-row[data-id="${CSS.escape(id)}"]`); if (!el) return null;
        const b = el.getBoundingClientRect(); return { x: b.left + b.width / 2, y: b.top + b.height / 2 };
      },
      get state() { return { dive: +dive.toFixed(3), diveTo, card: cardId, lift: +lift.toFixed(3), running }; },
      get programs() { return world.renderer.info.programs.length; },
      layer(name, on) { const m = { set: tv.group, table: table.group, candles: candles.group, drapes: drapes.group, signal: signal.group, picture }[name]; if (m) { m.visible = !!on; show(); } },
      setFelt() {},
      setTrim() {},
      dispose() {
        disposed = true; running = false; cancelAnimationFrame(raf);
        clearInterval(clock);
        clearTimeout(spiritT);
        window.removeEventListener('resize', onResize);
        window.removeEventListener('pointerdown', onDown, true);
        window.removeEventListener('pointermove', onMove, true);
        window.removeEventListener('pointerup', onUp, true);
        window.removeEventListener('pointercancel', onCancel, true);
        camera.remove(veil);
        house.forEach(([l, i0]) => { l.intensity = i0; });
        camera.near = near0; camera.far = far0; camera.updateProjectionMatrix();
        css.domElement.remove();
      }
    };
  }

  if (o.warm) {
    try { await o.warm({ show: [seat], spread: true }); } catch (e) { /* compiled on first draw */ }
  }
  seat.visible = true;

  return {
    dest: 'seance',
    fly,
    dispose() {
      scene.remove(seat);
      K.freeTree(seat, scene.userData.set);
      veil.geometry.dispose(); veilMat.dispose();
    }
  };
}
