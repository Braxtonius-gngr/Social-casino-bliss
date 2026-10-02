// THE SÉANCE ROOM: Dead Channel's home at Showroom (three.js + CSS3D).
//
// After the roll intro floats up, a tap on the landing starts one
// continuous shot, as it does for the other homes: the camera rises out of
// the float, turns away from the gaming floor and comes down, through a
// gap in a ring of velvet drapes, into a chair at a round séance table. On
// the black cloth, among five ruby vigil lights, a portable television is
// on a dead channel. As you sit, it tunes in: the snow gives way to
// tonight's station card - your ready platforms, one to a channel.
//
// From the chair you see the whole set; a tap on its picture leans you in
// over it, where the channels are a fingertip tall. Tap a channel: its card
// comes up out of the screen to you, with its Keen Info and its moves (the
// card table's card and sheet). "Run the deck" runs your hand. "Tune out"
// (or a tap on the channel dial from the chair) asks the room to let you
// through: the brass snuffer lifts off the cloth by itself and puts the
// lights out one by one, the dial clicks round past 13 to the dead detent,
// the picture rolls into snow, and you lean in until the snow fills your
// eyes, and come out in the signal: a dark where the spirit hangs among
// your channels. A tap on a channel there brings its card down to you;
// "Back to the room" brings you out the way you came, and the lights come
// back up one by one.
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
//   The set - a 1974 Japanese 12-inch solid-state portable, black and
//     white: a case of walnut-grain vinyl wrapped over pressed board, its
//     long edges rounded, round a charcoal front in blasted plastic; the
//     tube's face bowed under its glass in a recessed opening with a
//     brushed-chrome lip; at its right a VHF detent dial (2 to 13 and U,
//     printed white on a black skirt) and a UHF fine-tune, both ribbed
//     knobs with brushed aluminium caps, and a slotted speaker grille under
//     them; a chrome carry bail with a black grip over the top; chrome
//     rabbit ears from the back; four rubber feet. Room: a squat box with a
//     glowing face. Arm: the vinyl's figure, the bail's bright line, the
//     glass's bulge mirroring the vigil lights (small and pulled in toward
//     the middle, as a convex face shows them). 3x: the dial's numbers, the
//     ribs, the grille's slots, the knob's pointer, the antenna's sections.
//     It stands on its feet on the cloth (their shadows and the case's)
//     and lights the cloth in front of it (the tube's own blue light).
//   The table - a round table under a black cotton velvet cloth to the
//     floor: velvet soaks light up and shows its nap only where light
//     grazes it, so under the vigil lights it is a red sheen on black, and
//     the folds at the hem deepen into black.
//   The vigil lights - five ruby pressed-glass vigil cups from a church
//     supply house: a thick foot, diamond-cut sides, a rolled rim; inside
//     each a white paraffin votive in its tin cup. The flame sits down in
//     the glass, so the glass glows ruby from inside, brightest at the
//     flame's height, and throws a red pool on the cloth round its foot
//     (and a dark ring right at the foot, where the glass stands); out of
//     the open top the flame is gold. Each flickers on its own.
//   The snuffer - a brass bell snuffer of the Georgian pattern: a spun bell
//     on a short crook at the end of a turned brass rod, an ebonized grip
//     and a finial; old brass, polished where a hand holds it and dull in
//     the bell. It lies on the cloth until the room is asked to let you
//     through; then it lifts by itself (a dip first, then up, swaying on
//     its crook), goes cup to cup - lowering its bell into each mouth, a
//     beat, the flame gone and a thread of smoke after it - and lies down
//     again where it was, with a small settle.
//   The drapes - heavy oxblood velvet hung in a ring round the table from
//     ceiling to floor, its folds catching the light on their crowns and
//     falling into black between them; they close the room off.
//   The picture - a station card on the tube: a spirit-blue raster with the
//     test ring behind tonight's listings in dark bands, the clock in the
//     set's character generator; scanlines, the corners dark where the face
//     curves away, now and then a red and green tear across it (the room's
//     signal jolt). Tuning: each click of the dial a black frame and a roll,
//     and at the dead detent the snow.
//   The signal - a dark with no floor: snow drifting through it toward
//     you, the spirit hung far off (the scratchboard face, spirit.mjs), and
//     your channels round it in the set's own type. Lit by nothing.
//   Motion - the shot's glide in; the set tuning in as you sit; leaning in
//     over the picture and sitting back (a rise as you come forward, a
//     settle); the snuffer's round; the dial's clicks (each a quick turn, a
//     small overshoot past the detent and back); the lean through (a
//     sit-back first - the wind-up - then in); the drift through the
//     signal; a card's rise and turn; flames, smoke and snow on their own.
//     With motion off: cuts, a still picture, no flame moving.
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
// The set: the case (w x h x d, its long edges rounded r), the hood behind
// it over the tube's neck, and how high its feet hold it off the cloth.
const TV = { z: 14, w: 40, h: 31, d: 21, r: 3.4, hood: 13, feet: 0.9 };
// The picture: 4:3 in the opening, its middle (the case's own x - the
// knobs take the right); the canvas behind it is 40 px to the cm.
const SCREEN = { w: 24, h: 18, y: 17.4, x: 4.6, px: 40 };
// (the picture's face, bowed toward you by `bow` at its middle: its middle
// just behind the case's front, its corners 1.3 further in)
// (the case: its vinyl lip LIP deep round the front, the charcoal front
// set FRONT into it, the opening's walls going in from there to the box)
const LIP = 1.8, FRONT = 0.6;
const BOW = 1.0;
const SCREEN_Z = TV.z - TV.d / 2 + FRONT + 0.15;
// The drapes: a ring round the table.
const DRAPE = { r: 190, h: 330, folds: 46 };
// The views from the chair: upright, a wide lens that holds the whole set,
// the cloth and the lights; on its side, a natural one.
const VIEW = [{ eye: [0, 47, -86], aim: [0, 9.5, 2], fov: 66 }, { eye: [0, 44, -84], aim: [0, 14, 6], fov: 44 }];
// The signal: far under the floor, at its own scale; where you come out
// (the snow across the lens) and where you stop, and the spirit far off.
const SIGNAL = { at: [0, -60000, 0], spiritZ: 2600, spiritY: 300, spiritH: 1500, stopZ: 900 };
// The channels there: a column 800 in front of where you stop, low in the
// frame under the spirit's face.
const CHAN = { w: 300, z: 1700, y0: -40, step: 84, x: 70 };
// The vigil lights: [x, z] on the cloth, and the cup (radius at the foot
// and the rim, height); the votive's top sits `wax` above the cup's floor.
const CUPS = [[14, -11], [18, -25], [4, -33], [-12, -30], [-19, -15]];
const CUP = { r0: 2.45, r1: 2.8, h: 7.2, wax: 3.6, foot: 0.7 };
// The snuffer at rest on the cloth (x, z, its yaw), and its rod's length.
const SNUFF = { at: [11, -43], yaw: 0, rod: 27 };
// The picture's layout, in canvas pixels (960 x 720): the header, four
// listings, the buttons at the foot. The page's own buttons lie over the
// same places (see .r3d-screen in the stylesheet).
const GUIDE = { W: 960, H: 720, head: 100, row0: 108, rowH: 118, foot: 596, footH: 112, padX: 44 };
// The shot's timings (seconds): the glide in, the set tuning in, leaning
// in and sitting back, a card's lift; and the way through, in its own
// seconds - the snuffer's round, the dial, the lean, the drift - and how
// long the way back takes.
const T = { fly: 4.8, tune: 1.4, uiIn: 0.6, focus: 1.1, lift: 0.55, back: 5.2 };
const W = { rise: 0.6, per: 0.84, settle: 0.8, dial: 1.9, lean: 2.0, drift: 2.3 };
// (the beats overlap on purpose, as two hands would: the dial starts as
// the snuffer is being laid back down (W.settle runs on past W.tune0),
// and you lean in while the last clicks are still going - each one would
// read as a stall if it waited for the last to finish)
W.out = W.rise + W.per * CUPS.length;          // the last light out
W.tune0 = W.out + 0.1;                           // the dial starts
W.lean0 = W.tune0 + W.dial * 0.55;               // the lean starts
W.cut = W.lean0 + W.lean;                        // the lens hands over
W.all = W.cut + W.drift;
const CUT = W.cut / W.all;
// The dial: 13 detents (2 to 13, then U - nothing tuned on it: the dead
// one), and the channel each listing is on.
const DETENTS = ['2', '3', '4', '5', '6', '7', '8', '9', '10', '11', '12', '13', 'U'];
const ROWS = 4;
const chOf = i => 2 + i * 3;

// ------------------------------------------------------------ textures
// Walnut-grain vinyl: long figured grain, a satin face.
function vinylTex() {
  // (walnut as the printers of the vinyl drew it: a mid-brown ground,
  // flat-sawn figure - long streaks of dark late-wood, and the cathedral
  // arches where the saw crossed the rings - and fine pores along it)
  return K.canvasTex(1024, 1024, (g, w, h) => {
    g.fillStyle = '#5b3920'; g.fillRect(0, 0, w, h);
    const rnd = seeded(11);
    for (let k = 0; k < 1; k++) {
      const cx = w * (0.45 + rnd() * 0.1), top = rnd() * h * 0.4;
      for (let i = 0; i < 18; i++) {
        const spread = 30 + i * 16, a = 0.06 + rnd() * 0.14;
        g.strokeStyle = `rgba(28,14,6,${a})`; g.lineWidth = 2 + rnd() * 5;
        for (const side of [-1, 1]) {
          g.beginPath();
          for (let y = top + i * 9; y <= h + 20; y += 10) {
            const t = (y - top - i * 9) / h, x = spread * Math.sqrt(t * 6) + Math.sin(y / (side < 0 ? 37 : 41) + i) * 3;
            g.lineTo(cx + side * x, y);
          }
          g.stroke();
        }
      }
    }
    for (let i = 0; i < 520; i++) {
      const x = rnd() * w, a = 0.08 + rnd() * 0.2, wav = 1 + rnd() * 3, ph = rnd() * 6.28;
      g.strokeStyle = rnd() < 0.6 ? `rgba(24,12,5,${a})` : `rgba(150,100,60,${a * 0.7})`;
      g.lineWidth = 0.6 + rnd() * 2.6;
      g.beginPath();
      for (let y = 0; y <= h; y += 12) g.lineTo(x + Math.sin(y / (60 + wav * 9) + ph) * wav, y);
      g.stroke();
    }
    g.fillStyle = 'rgba(16,8,3,0.35)';
    for (let i = 0; i < 9000; i++) g.fillRect(rnd() * w, rnd() * h, 1, 2 + rnd() * 4);
  });
}
// The speaker grille: horizontal slots punched in the charcoal front, each
// with a lit lower lip (the room's light from above catches it).
function grilleTex() {
  return K.canvasTex(256, 320, (g, w, h) => {
    g.fillStyle = '#1b1b1f'; g.fillRect(0, 0, w, h);
    for (let y = 14; y < h - 10; y += 22) {
      g.fillStyle = '#030304'; g.fillRect(18, y, w - 36, 10);
      g.fillStyle = 'rgba(255,255,255,0.08)'; g.fillRect(18, y + 10, w - 36, 2);
    }
  });
}
// The VHF dial's skirt: its detents round it in white on black - 2 to 13,
// then U.
function dialTex() {
  return K.canvasTex(256, 256, (g) => {
    g.fillStyle = '#0b0b0d'; g.beginPath(); g.arc(128, 128, 126, 0, 7); g.fill();
    g.fillStyle = '#e8e2d2'; g.textAlign = 'center'; g.textBaseline = 'middle';
    DETENTS.forEach((c, i) => {
      const a = (i / DETENTS.length) * Math.PI * 2 - Math.PI / 2;
      g.font = `600 ${c.length > 1 ? 19 : 22}px "VT323", "Courier New", monospace`;
      g.fillText(c, 128 + Math.cos(a) * 104, 128 + Math.sin(a) * 104);
      g.fillRect(128 + Math.cos(a) * 84 - 1.5, 128 + Math.sin(a) * 84 - 1.5, 3, 3);
    });
    g.strokeStyle = 'rgba(232,226,210,.35)'; g.lineWidth = 1.5; g.beginPath(); g.arc(128, 128, 78, 0, 7); g.stroke();
  });
}
// Velvet's nap: a fine noise in the normal, the light caught only at grazing.
function napTex() {
  return K.canvasTex(256, 256, (g, w, h) => {
    const img = g.createImageData(w, h), d = img.data, rnd = seeded(23);
    for (let i = 0; i < d.length; i += 4) { d[i] = 118 + (rnd() - 0.5) * 34; d[i + 1] = 128 + (rnd() - 0.5) * 34; d[i + 2] = 255; d[i + 3] = 255; }
    g.putImageData(img, 0, 0);
  });
}
// A flame: a soft teardrop, white-hot at its heart, gold at its skin, a
// blue root at its foot.
function flameTex() {
  return K.canvasTex(64, 128, (g) => {
    g.clearRect(0, 0, 64, 128);
    const body = g.createRadialGradient(32, 82, 2, 32, 70, 46);
    body.addColorStop(0, 'rgba(255,250,235,1)'); body.addColorStop(0.25, 'rgba(255,214,140,0.95)'); body.addColorStop(0.55, 'rgba(255,140,50,0.55)'); body.addColorStop(1, 'rgba(255,90,20,0)');
    g.fillStyle = body;
    g.beginPath(); g.moveTo(32, 6); g.bezierCurveTo(52, 46, 54, 92, 32, 112); g.bezierCurveTo(10, 92, 12, 46, 32, 6); g.fill();
    const root = g.createRadialGradient(32, 104, 1, 32, 104, 12);
    root.addColorStop(0, 'rgba(90,140,255,0.8)'); root.addColorStop(1, 'rgba(90,140,255,0)');
    g.fillStyle = root; g.fillRect(16, 90, 32, 30);
  });
}
function softDot(color = '255,255,255') {
  return K.canvasTex(64, 64, (g) => {
    const gr = g.createRadialGradient(32, 32, 0, 32, 32, 32);
    gr.addColorStop(0, `rgba(${color},0.95)`); gr.addColorStop(0.3, `rgba(${color},0.28)`); gr.addColorStop(1, `rgba(${color},0)`);
    g.fillStyle = gr; g.fillRect(0, 0, 64, 64);
  });
}
// Smoke from a snuffed wick: threads that wander more the higher they go,
// tiling up the texture so it can scroll; and the shape it is seen
// through - a thread at the wick, opening out, gone at the top.
function smokeTex() {
  const t = K.canvasTex(64, 512, (g) => {
    g.clearRect(0, 0, 64, 512);
    const rnd = seeded(91);
    for (let s = 0; s < 3; s++) {
      const ph = rnd() * 6.28, f = 0.018 + rnd() * 0.01;
      g.strokeStyle = `rgba(255,255,255,${0.55 - s * 0.14})`; g.lineWidth = 2.2 + s * 1.6;
      g.shadowColor = 'rgba(255,255,255,0.6)'; g.shadowBlur = 6 + s * 4;
      g.beginPath();
      for (let y = 0; y <= 512; y += 4) g.lineTo(32 + Math.sin(y * f * 6.28 / 512 * 64 + ph) * (7 + s * 4) + Math.sin(y * 0.05 + ph) * 3, y);
      g.stroke();
    }
  });
  t.wrapS = THREE.ClampToEdgeWrapping; t.wrapT = THREE.RepeatWrapping;
  return t;
}
function smokeShape() {
  const t = K.canvasTex(64, 256, (g) => {
    const img = g.createImageData(64, 256), d = img.data;
    for (let y = 0; y < 256; y++) {
      const v = 1 - y / 255;                       // 0 at the top, 1 at the wick
      const width = 0.05 + 0.95 * Math.pow(1 - v, 0.7);
      const fade = smoother(v / 0.12) * (1 - smoother((v - 0.9) / 0.1)) * (0.35 + 0.65 * v);
      for (let x = 0; x < 64; x++) {
        const u = Math.abs(x / 63 - 0.5) * 2;
        const a = fade * (1 - smoother((u - width * 0.7) / (width * 0.3 + 0.02)));
        const k = (y * 64 + x) * 4; d[k] = d[k + 1] = d[k + 2] = Math.round(a * 255); d[k + 3] = 255;
      }
    }
    g.putImageData(img, 0, 0);
  });
  t.colorSpace = THREE.NoColorSpace;
  return t;
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
  // (the set's character generator again, out in the dark: the channel's
  // number in spirit blue, its name in bone, each blooming a little as
  // phosphor does, a red rule under them; a few scanlines across it)
  return K.canvasTex(1024, 256, (g, w) => {
    g.clearRect(0, 0, w, 256);
    g.textBaseline = 'alphabetic';
    g.shadowColor = 'rgba(224,36,47,0.8)'; g.shadowBlur = 12;
    g.fillStyle = 'rgba(224,36,47,0.9)'; g.fillRect(40, 198, w - 80, 5);
    g.shadowColor = 'rgba(125,182,240,0.85)'; g.shadowBlur = 16;
    g.fillStyle = '#8cc0f4';
    g.font = '400 92px VT323, "Courier New", monospace';
    g.fillText(`CH ${String(ch).padStart(2, '0')}`, 40, 104);
    g.shadowColor = 'rgba(233,228,216,0.6)'; g.shadowBlur = 14;
    g.fillStyle = '#E9E4D8';
    g.font = '400 92px "IM Fell English SC", Georgia, serif';
    g.fillText(fitText(g, c.name, w - 80), 40, 184);
    g.shadowBlur = 0;
    g.globalCompositeOperation = 'destination-out';
    g.fillStyle = 'rgba(0,0,0,0.28)';
    for (let y = 0; y < 256; y += 6) g.fillRect(0, y + 3, w, 2);
    g.globalCompositeOperation = 'source-over';
  });
}

// ------------------------------------------------------------ the picture
// The station card, drawn as the set's character generator and camera put
// it on the tube: drawGuide() lays it out; the picture canvas is the guide
// (or the snow, or both while it tunes), rolled, torn now and then, with
// the tube's scanlines and dark corners over it.
function fitText(g, s, max) {
  if (g.measureText(s).width <= max) return s;
  while (s.length > 1 && g.measureText(s + '…').width > max) s = s.slice(0, -1);
  return s + '…';
}
function drawGuide(g, d) {
  const { W: w, H: h } = GUIDE;
  g.save();
  g.clearRect(0, 0, w, h);
  // the raster: spirit blue, brightest a little above the middle
  const bg = g.createRadialGradient(w / 2, h * 0.42, 40, w / 2, h * 0.5, w * 0.62);
  bg.addColorStop(0, '#1d3a57'); bg.addColorStop(0.55, '#10233a'); bg.addColorStop(1, '#050b13');
  g.fillStyle = bg; g.fillRect(0, 0, w, h);
  // the station's test ring behind it all: circles, the cross, the wedges
  const cx = w / 2, cy = h * 0.5;
  g.strokeStyle = 'rgba(233,228,216,0.17)'; g.lineWidth = 6;
  g.beginPath(); g.arc(cx, cy, 318, 0, 7); g.stroke();
  g.lineWidth = 3;
  [236, 150, 52].forEach(r => { g.beginPath(); g.arc(cx, cy, r, 0, 7); g.stroke(); });
  g.beginPath(); g.moveTo(cx - 318, cy); g.lineTo(cx + 318, cy); g.moveTo(cx, cy - 318); g.lineTo(cx, cy + 318); g.stroke();
  for (let k = 0; k < 16; k++) {
    const a = k / 16 * Math.PI * 2;
    g.beginPath(); g.moveTo(cx + Math.cos(a) * 160, cy + Math.sin(a) * 160); g.lineTo(cx + Math.cos(a) * 226, cy + Math.sin(a) * 226); g.stroke();
  }
  // the header: the card's name, the clock; the red rule
  const glow = (c, b) => { g.shadowColor = c; g.shadowBlur = b; };
  g.textBaseline = 'alphabetic';
  g.fillStyle = '#E9E4D8'; glow('rgba(233,228,216,0.55)', 14);
  g.font = '400 64px "IM Fell English SC", Georgia, serif';
  g.fillText('Tonight', GUIDE.padX + 10, 74);
  g.font = '400 78px VT323, "Courier New", monospace';
  g.textAlign = 'right';
  const ampmW = (g.font = '400 40px VT323, "Courier New", monospace', g.measureText(d.ampm).width);
  g.fillText(d.ampm, w - GUIDE.padX - 6, 74);
  g.font = '400 78px VT323, "Courier New", monospace';
  g.fillText(d.clock, w - GUIDE.padX - 18 - ampmW, 76);
  g.textAlign = 'left';
  glow('rgba(224,36,47,0.7)', 10); g.fillStyle = '#E0242F';
  g.fillRect(GUIDE.padX, GUIDE.head - 6, w - GUIDE.padX * 2, 6);
  // the listings: each in its dark band over the ring
  d.rows.forEach((r, i) => {
    const y = GUIDE.row0 + GUIDE.rowH * i, bh = GUIDE.rowH - 12;
    g.shadowBlur = 0;
    g.fillStyle = 'rgba(2,7,13,0.74)'; g.fillRect(GUIDE.padX, y, w - GUIDE.padX * 2, bh);
    g.fillStyle = 'rgba(233,228,216,0.13)'; g.fillRect(GUIDE.padX, y, w - GUIDE.padX * 2, 2); g.fillRect(GUIDE.padX, y + bh - 2, w - GUIDE.padX * 2, 2);
    const mid = y + bh / 2 + 22;
    glow('rgba(125,182,240,0.7)', 12); g.fillStyle = '#8cc0f4';
    g.font = '400 80px VT323, "Courier New", monospace';
    g.fillText(String(r.ch).padStart(2, ' '), GUIDE.padX + 22, mid + 4);
    glow(r.ready ? 'rgba(224,36,47,0.75)' : 'rgba(0,0,0,0)', 12);
    g.fillStyle = r.ready ? '#ff3b45' : 'rgba(233,228,216,0.5)';
    g.font = '400 62px VT323, "Courier New", monospace';
    g.textAlign = 'right';
    const stW = g.measureText(r.status).width;
    g.fillText(r.status, w - GUIDE.padX - 22, mid);
    g.textAlign = 'left';
    glow('rgba(233,228,216,0.45)', 10); g.fillStyle = '#E9E4D8';
    g.font = '400 60px "IM Fell English SC", Georgia, serif';
    g.fillText(fitText(g, r.name, w - GUIDE.padX * 2 - 190 - stW - 40), GUIDE.padX + 150, mid);
  });
  // the foot: the two buttons up close; from the chair, how to come close
  const fy = GUIDE.foot, fh = GUIDE.footH - 10;
  if (d.near) {
    const bw = (w - GUIDE.padX * 2 - 28) / 2;
    [[GUIDE.padX, 'Run the deck', '#E9E4D8', 'rgba(233,228,216,0.5)'], [GUIDE.padX + bw + 28, 'Tune out', '#ff3b45', 'rgba(224,36,47,0.8)']].forEach(([x, label, col, gl]) => {
      glow(gl, 16); g.strokeStyle = col; g.lineWidth = 5;
      g.fillStyle = 'rgba(2,7,13,0.6)'; g.fillRect(x, fy, bw, fh); g.strokeRect(x + 2.5, fy + 2.5, bw - 5, fh - 5);
      g.fillStyle = col; g.font = '400 50px "IM Fell English SC", Georgia, serif'; g.textAlign = 'center';
      g.fillText(label, x + bw / 2, fy + fh / 2 + 17);
      g.textAlign = 'left';
    });
  } else {
    glow('rgba(233,228,216,0.45)', 10); g.fillStyle = 'rgba(233,228,216,0.82)';
    g.font = '400 54px VT323, "Courier New", monospace'; g.textAlign = 'center';
    g.fillText('TAP THE SCREEN TO LEAN IN', w / 2, fy + fh / 2 + 16);
    g.textAlign = 'left';
  }
  g.restore();
}
// The tube over whatever it shows: scanlines, and the corners going dark
// where the face curves away. Drawn once.
function tubeOver() {
  const c = document.createElement('canvas'); c.width = GUIDE.W; c.height = GUIDE.H;
  const g = c.getContext('2d');
  g.fillStyle = 'rgba(0,0,0,0.4)';
  for (let y = 0; y < GUIDE.H; y += 4) g.fillRect(0, y + 2, GUIDE.W, 2);
  // (the aperture grille: fine dark wires down the face, seen pinched in)
  g.fillStyle = 'rgba(0,0,0,0.16)';
  for (let x = 0; x < GUIDE.W; x += 3) g.fillRect(x + 2, 0, 1, GUIDE.H);
  const v = g.createRadialGradient(GUIDE.W / 2, GUIDE.H / 2, GUIDE.H * 0.42, GUIDE.W / 2, GUIDE.H / 2, GUIDE.W * 0.66);
  v.addColorStop(0, 'rgba(0,0,0,0)'); v.addColorStop(1, 'rgba(0,0,0,0.8)');
  g.fillStyle = v; g.fillRect(0, 0, GUIDE.W, GUIDE.H);
  return c;
}

// ------------------------------------------------------------ the pieces
function roundedBox(w, h, d, r) {
  const shape = K.roundRect(w, h, r);
  const g = new THREE.ExtrudeGeometry(shape, { depth: d - 2 * r * 0.4, bevelEnabled: true, bevelSize: r * 0.4, bevelThickness: r * 0.4, bevelSegments: 4, curveSegments: 8 });
  g.translate(0, 0, -(d - 2 * r * 0.4) / 2);
  return g;
}
// A box narrowing from its front (wf x hf) to its back (wb x hb), d deep,
// its front at z = 0 and its back at +d.
function frustum(wf, hf, wb, hb, d) {
  const g = new THREE.BoxGeometry(1, 1, 1, 1, 1, 1);
  const p = g.attributes.position;
  for (let i = 0; i < p.count; i++) {
    const back = p.getZ(i) > 0;
    p.setXYZ(i, p.getX(i) * (back ? wb : wf), p.getY(i) * (back ? hb : hf), back ? d : 0);
  }
  g.computeVertexNormals();
  return g;
}
// The bowed face of the tube (and its glass): a plane pushed toward you at
// its middle, its uvs flat across it.
function bowedPlane(w, h, bow, barrel = 0) {
  const g = new THREE.PlaneGeometry(w, h, 24, 18);
  const p = g.attributes.position, uv = g.attributes.uv;
  for (let i = 0; i < p.count; i++) {
    const x = p.getX(i) / (w / 2), y = p.getY(i) / (h / 2);
    p.setZ(i, bow * (1 - 0.5 * x * x - 0.5 * y * y));
    // (a tube's picture is barrelled: its straight lines bow out toward
    // the middle of each edge, as the beam's sweep does on the curved face)
    if (barrel) {
      const du = uv.getX(i) - 0.5, dv = uv.getY(i) - 0.5, k = 1 + barrel * (du * du + dv * dv);
      uv.setXY(i, 0.5 + du * k, 0.5 + dv * k);
    }
  }
  g.computeVertexNormals();
  return g;
}
function buildSet(set) {
  const g = new THREE.Group();
  // (the group is the case's middle; the picture's middle is the seat's x = 0)
  g.position.set(-SCREEN.x, TV.feet, TV.z);
  const vinylMap = vinylTex(); vinylMap.wrapS = vinylMap.wrapT = THREE.RepeatWrapping; vinylMap.repeat.set(0.045, 0.045); vinylMap.rotation = Math.PI / 2;
  // (the room is dark: what the case's finishes mirror is mostly black,
  // so the studio the intro lights them with is turned well down here)
  const vinyl = K.finished(new THREE.MeshPhysicalMaterial({ color: 0xffffff, map: vinylMap, roughness: 0.62, clearcoat: 0.12, clearcoatRoughness: 0.5 }), 'pores', 2, 2, 0.15);
  // (the wrap's grain runs front to back, over the top and down the sides,
  // as one printed sheet; the front lip's is cut across)
  const lipVinyl = vinyl.clone(); lipVinyl.map = vinylMap.clone(); lipVinyl.map.rotation = Math.PI / 2;
  vinylMap.rotation = 0;
  const chrome = K.polishedOf(set.brass, 0.12); chrome.color.setHex(0xd8dbe0);
  const brushed = K.finished(new THREE.MeshStandardMaterial({ color: 0x66686e, metalness: 1, roughness: 0.66 }), 'brushed', 3, 1, 0.12);
  const charcoal = K.finished(new THREE.MeshPhysicalMaterial({ color: 0x1c1c20, roughness: 0.62, clearcoat: 0.12, clearcoatRoughness: 0.45, envMapIntensity: 0.12 }), 'blast', 2, 2, 0.35);
  const black = new THREE.MeshStandardMaterial({ color: 0x08080a, roughness: 0.7, envMapIntensity: 0.1 });
  const faceZ = -TV.d / 2;
  // the case: the vinyl box behind, and its lip round the front
  const cab = new THREE.Mesh(roundedBox(TV.w, TV.h, TV.d - LIP, TV.r), vinyl);
  cab.position.set(0, TV.h / 2, LIP / 2);
  cab.castShadow = true; cab.receiveShadow = true;
  g.add(cab);
  const bev = TV.r * 0.4;
  const lipShape = K.roundRect(TV.w - 2 * bev, TV.h - 2 * bev, TV.r - bev);
  lipShape.holes.push(new THREE.Path(K.roundRect(TV.w - 4.2, TV.h - 4.2, 2.2).getPoints(24).reverse()));
  const lipG = new THREE.ExtrudeGeometry(lipShape, { depth: LIP - 2 * bev + 0.2, bevelEnabled: true, bevelSize: bev, bevelThickness: bev, bevelSegments: 4, curveSegments: 8 });
  const lipM = new THREE.Mesh(lipG, lipVinyl);
  lipM.position.set(0, TV.h / 2, faceZ + LIP + 0.2 - bev); lipM.rotation.y = Math.PI;
  lipM.castShadow = true; lipM.receiveShadow = true;
  g.add(lipM);
  // the hood over the tube's neck: charcoal, narrowing back
  const hood = new THREE.Mesh(frustum(TV.w - 7, TV.h - 6, TV.w - 20, TV.h - 14, TV.hood), charcoal);
  hood.position.set(0, TV.h / 2 + 0.6, TV.d / 2 - 0.2);
  hood.castShadow = true; hood.receiveShadow = true;
  g.add(hood);
  // the front: charcoal, set in the vinyl's lip, the picture's opening in
  // it (rounded, as the tube's face is) and the knobs' panel beside it
  const front = K.roundRect(TV.w - 4.2, TV.h - 4.2, 2.2);
  const hole = K.roundRect(SCREEN.w + 0.6, SCREEN.h + 0.6, 2.6);
  // (a shape turned to face you is mirrored: the opening, on your left of
  // the case's middle, is at -x in the shape)
  const holePath = new THREE.Path(hole.getPoints(32).map(p => new THREE.Vector2(p.x - SCREEN.x, p.y + SCREEN.y - TV.h / 2)).reverse());
  front.holes.push(holePath);
  const face = new THREE.Mesh(new THREE.ShapeGeometry(front, 16), charcoal);
  face.position.set(0, TV.h / 2, faceZ + FRONT); face.rotation.y = Math.PI;
  face.receiveShadow = true;
  g.add(face);
  // (the opening's walls: black, going in to the tube)
  const wallShape = K.roundRect(SCREEN.w + 0.6, SCREEN.h + 0.6, 2.6);
  wallShape.holes.push(new THREE.Path(K.roundRect(SCREEN.w - 0.2, SCREEN.h - 0.2, 2.2).getPoints(32).reverse()));
  const walls = new THREE.Mesh(new THREE.ExtrudeGeometry(wallShape, { depth: LIP - FRONT + 0.1, bevelEnabled: false, curveSegments: 10 }), black);
  walls.position.set(SCREEN.x, SCREEN.y, faceZ + LIP + 0.1); walls.rotation.y = Math.PI;
  g.add(walls);
  // the brushed chrome lip round the opening
  const lip = K.roundRect(SCREEN.w + 2.0, SCREEN.h + 2.0, 3.2);
  lip.holes.push(new THREE.Path(K.roundRect(SCREEN.w + 0.6, SCREEN.h + 0.6, 2.6).getPoints(32).reverse()));
  const trim = new THREE.Mesh(new THREE.ShapeGeometry(lip, 12), brushed);
  trim.position.set(SCREEN.x, SCREEN.y, faceZ + FRONT - 0.05); trim.rotation.y = Math.PI;
  g.add(trim);
  // the knobs' panel, at the picture's right (your left is +x: right is -x)
  const kx = -(TV.w / 2 - 6.2);
  const dialMat = new THREE.MeshStandardMaterial({ map: dialTex(), roughness: 0.5 });
  const knob = (y, r, withDial) => {
    const k = new THREE.Group();
    k.position.set(kx, y, faceZ + FRONT - 0.04);
    if (withDial) { const skirt = new THREE.Mesh(new THREE.CircleGeometry(r * 1.7, 48), dialMat); skirt.rotation.y = Math.PI; skirt.position.z = -0.02; k.add(skirt); }
    const turn = new THREE.Group(); k.add(turn);
    // (the knob: black ribbed bakelite, its brushed aluminium cap, the
    // pointer line cut across the cap)
    const ribs = new THREE.Mesh(new THREE.CylinderGeometry(r, r * 1.04, 1.8, 40, 1), new THREE.MeshPhysicalMaterial({ color: 0x0d0d0f, roughness: 0.4, clearcoat: 0.4 }));
    ribs.rotation.x = Math.PI / 2; ribs.position.z = -0.9; ribs.castShadow = true;
    const rp = ribs.geometry.attributes.position;
    for (let i = 0; i < rp.count; i++) { const a = Math.atan2(rp.getZ(i), rp.getX(i)); const s = 1 + 0.035 * Math.abs(Math.cos(a * 20)); rp.setX(i, rp.getX(i) * s); rp.setZ(i, rp.getZ(i) * s); }
    ribs.geometry.computeVertexNormals();
    turn.add(ribs);
    const cap = new THREE.Mesh(new THREE.CircleGeometry(r * 0.78, 36), brushed);
    cap.rotation.y = Math.PI; cap.position.z = -1.82; turn.add(cap);
    const pointer = new THREE.Mesh(new THREE.PlaneGeometry(0.28, r * 0.72), new THREE.MeshBasicMaterial({ color: 0x0a0a0a }));
    pointer.rotation.y = Math.PI; pointer.position.set(0, r * 0.4, -1.84); turn.add(pointer);
    return { k, turn };
  };
  const vhf = knob(SCREEN.y + 4.6, 2.3, true);
  const uhf = knob(SCREEN.y - 3.2, 1.5, false);
  uhf.turn.rotation.z = 0.7;
  g.add(vhf.k, uhf.k);
  // the pilot lamp: a faceted red jewel in a chrome bezel, beside the
  // lower knob, lit while the set is on
  const jewelMat = new THREE.MeshStandardMaterial({ color: 0x3a0404, roughness: 0.18, flatShading: true, emissive: 0xff2a10, emissiveIntensity: 0.55 });
  const jewel = new THREE.Mesh(new THREE.IcosahedronGeometry(0.3, 0), jewelMat);
  jewel.scale.z = 0.55; jewel.position.set(kx + 3.2, SCREEN.y - 3.2, faceZ + FRONT - 0.12); g.add(jewel);
  const bezel = new THREE.Mesh(new THREE.TorusGeometry(0.36, 0.08, 8, 24), chrome);
  bezel.position.set(kx + 3.2, SCREEN.y - 3.2, faceZ + FRONT - 0.05); g.add(bezel);
  // the maker's plate under the picture: brushed aluminium, its lettering
  // cut through to the black under it (an invented house - no real name)
  const badgeTex = K.canvasTex(512, 96, (c, w, h) => {
    const gr = c.createLinearGradient(0, 0, 0, h); gr.addColorStop(0, '#d4d6da'); gr.addColorStop(0.5, '#9a9da4'); gr.addColorStop(1, '#c4c6cc');
    c.fillStyle = gr; c.fillRect(0, 0, w, h);
    c.fillStyle = 'rgba(255,255,255,0.18)'; for (let x = 0; x < w; x += 2) c.fillRect(x, 0, 1, h);
    c.fillStyle = '#0c0c0e'; c.textBaseline = 'middle';
    c.font = 'italic 700 54px Georgia, "Times New Roman", serif'; c.fillText('Nocturne', 22, h / 2 + 2);
    c.font = '700 26px "Helvetica Neue", Arial, sans-serif'; c.textAlign = 'right'; c.fillText('SOLID STATE · 12', w - 20, h / 2 + 2);
  });
  const badge = new THREE.Mesh(new THREE.PlaneGeometry(6.2, 1.15), new THREE.MeshStandardMaterial({ map: badgeTex, color: 0x9a9ca2, metalness: 0.85, roughness: 0.5 }));
  badge.position.set(SCREEN.x, SCREEN.y - SCREEN.h / 2 - 1.9, faceZ + FRONT - 0.04); badge.rotation.y = Math.PI;
  g.add(badge);
  // (two rivets hold it)
  [-1, 1].forEach(sx => { const rv = new THREE.Mesh(new THREE.SphereGeometry(0.13, 8, 6), chrome); rv.scale.z = 0.5; rv.position.set(SCREEN.x + sx * 2.85, SCREEN.y - SCREEN.h / 2 - 1.9, faceZ + FRONT - 0.07); g.add(rv); });
  // the speaker grille under them
  const grille = new THREE.Mesh(new THREE.PlaneGeometry(7.2, 8.6), new THREE.MeshStandardMaterial({ map: grilleTex(), roughness: 0.75 }));
  grille.position.set(kx, SCREEN.y - 10.6, faceZ + FRONT - 0.03); grille.rotation.y = Math.PI;
  g.add(grille);
  // the carry bail: chrome rod from pivots on the case's sides, tipped back
  // over the top, a black grip across
  const side = TV.w / 2 + TV.r * 0.4;          // the case's side, its bevel out
  const bw = side + 0.75, py = TV.h - 5, pz = 1.5;
  const bail = new THREE.CatmullRomCurve3([
    V(bw, py, pz), V(bw + 0.2, py + 4, pz + 3), V(bw - 1.5, TV.h + 3.2, pz + 7.5),
    V(-bw + 1.5, TV.h + 3.2, pz + 7.5), V(-bw - 0.2, py + 4, pz + 3), V(-bw, py, pz)
  ], false, 'centripetal', 0.2);
  const rod = new THREE.Mesh(new THREE.TubeGeometry(bail, 64, 0.42, 10, false), chrome);
  rod.castShadow = true; g.add(rod);
  const grip = new THREE.Mesh(new THREE.CylinderGeometry(0.8, 0.8, TV.w - 9, 16), new THREE.MeshPhysicalMaterial({ color: 0x0c0c0e, roughness: 0.5, clearcoat: 0.3 }));
  grip.rotation.z = Math.PI / 2; grip.position.set(0, TV.h + 3.2, pz + 7.5); grip.castShadow = true; g.add(grip);
  // (each end turns on a chrome boss, on a brushed plate screwed to the
  // case's side)
  const plateShape = K.roundRect(4.4, 3.2, 1.5);
  [1, -1].forEach(sx => {
    const plate = new THREE.Mesh(new THREE.ExtrudeGeometry(plateShape, { depth: 0.12, bevelEnabled: true, bevelSize: 0.08, bevelThickness: 0.06, bevelSegments: 2, curveSegments: 10 }), brushed);
    plate.rotation.y = sx * Math.PI / 2; plate.position.set(sx * (side + 0.02), py, pz);
    plate.castShadow = true; g.add(plate);
    const piv = new THREE.Mesh(new THREE.CylinderGeometry(0.95, 1.1, 0.7, 24), chrome);
    piv.rotation.z = -sx * Math.PI / 2; piv.position.set(sx * (side + 0.5), py, pz); piv.castShadow = true; g.add(piv);
    const nut = new THREE.Mesh(new THREE.CylinderGeometry(0.42, 0.42, 0.3, 6), chrome);
    nut.rotation.z = -sx * Math.PI / 2; nut.position.set(sx * (bw + 0.5), py, pz); g.add(nut);
    [-1.4, 1.4].forEach(dz => { const sc = new THREE.Mesh(new THREE.SphereGeometry(0.2, 10, 6), chrome); sc.scale.x = 0.45; sc.position.set(sx * (side + 0.22), py, pz + dz); g.add(sc); });
  });
  // (where the front shell meets the back, a parting line round the top
  // and sides)
  const outer = (o) => K.roundRect(TV.w + 2 * bev + o, TV.h + 2 * bev + o, TV.r + bev + o / 2);
  const partShape = outer(0.05); partShape.holes.push(new THREE.Path(outer(-0.8).getPoints(16).reverse()));
  const part = new THREE.Mesh(new THREE.ExtrudeGeometry(partShape, { depth: 0.16, bevelEnabled: false, curveSegments: 16 }), black);
  part.position.set(0, TV.h / 2, 4.6);
  g.add(part);
  // (and the vents across the top's back: two fields of slots punched
  // through the vinyl, either side of the aerial's base)
  const ventTex = K.canvasTex(512, 84, (c, w, h) => {
    c.clearRect(0, 0, w, h);
    for (let i = 2; i < 24; i++) {
      if (i >= 9 && i < 15) continue;
      const x = 10 + i * 19;
      c.fillStyle = 'rgba(4,3,3,0.96)'; c.beginPath(); c.roundRect(x, 6, 9, h - 12, 4.5); c.fill();
      c.fillStyle = 'rgba(150,110,80,0.28)'; c.fillRect(x + 1, h - 9, 7, 2);
    }
  });
  // (the gap in the slots sits under the aerial's base, at x = -6)
  const vents = new THREE.Mesh(new THREE.PlaneGeometry(26, 26 * 84 / 512), new THREE.MeshStandardMaterial({ map: ventTex, transparent: true, roughness: 0.8, depthWrite: false, polygonOffset: true, polygonOffsetFactor: -2 }));
  vents.rotation.x = -Math.PI / 2; vents.position.set(-6 + 13 - 26 * 242.5 / 512, TV.h + bev + 0.02, 7.3);
  g.add(vents);
  // the rabbit ears: a domed base at the back, two telescopic rods
  const base = new THREE.Mesh(new THREE.SphereGeometry(3.2, 24, 12, 0, Math.PI * 2, 0, Math.PI / 2), new THREE.MeshPhysicalMaterial({ color: 0x18181a, roughness: 0.35, clearcoat: 0.5 }));
  base.position.set(-6, TV.h, TV.d / 2 - 3.5); base.castShadow = true;
  g.add(base);
  [[-0.42, -0.3, 48], [0.46, -0.22, 44]].forEach(([tx, tz, len]) => {
    const r = new THREE.Group();
    r.position.set(-6, TV.h + 2.4, TV.d / 2 - 3.5);
    r.rotation.set(tz, 0, tx);
    // (four drawn-tube sections, each a little thinner, a crimped collar
    // where each slides out of the last; a ball on the tip)
    for (let s = 0; s < 4; s++) {
      const r0 = 0.42 - s * 0.075;
      const seg = new THREE.Mesh(new THREE.CylinderGeometry(r0, r0, len / 4 + 0.6, 12), chrome);
      seg.position.y = (s + 0.5) * len / 4; seg.castShadow = true; r.add(seg);
      if (s > 0) { const col = new THREE.Mesh(new THREE.CylinderGeometry(r0 + 0.16, r0 + 0.16, 0.7, 12), chrome); col.position.y = s * len / 4 + 0.2; r.add(col); }
    }
    const tip = new THREE.Mesh(new THREE.SphereGeometry(0.62, 14, 10), chrome); tip.position.y = len + 0.3; r.add(tip);
    g.add(r);
  });
  // the feet: four rubber buttons under the case
  const feet = [];
  [[1, 1], [1, -1], [-1, 1], [-1, -1]].forEach(([sx, sz]) => {
    const f = new THREE.Mesh(new THREE.CylinderGeometry(1.2, 1.3, TV.feet + 0.2, 16), black);
    f.position.set(sx * (TV.w / 2 - 4), -TV.feet / 2 + 0.1, sz * (TV.d / 2 - 3.5)); g.add(f);
    feet.push([f.position.x, f.position.z]);
  });
  // the glass over the picture: what it mirrors in this dark room is the
  // key light's soft bloom high on the left and a darker band below it
  // (drawn: a lit material would shrink every light it saw to a hard white
  // point on the bowed face) - and the vigil lights, added as glints (see
  // glints in the home)
  const sheen = K.canvasTex(256, 192, (c, w, h) => {
    c.clearRect(0, 0, w, h);
    const gr = c.createRadialGradient(w * 0.2, h * 0.1, 4, w * 0.2, h * 0.1, w * 0.78);
    gr.addColorStop(0, 'rgba(210,222,240,0.62)'); gr.addColorStop(0.3, 'rgba(210,222,240,0.22)'); gr.addColorStop(0.7, 'rgba(210,222,240,0.05)'); gr.addColorStop(1, 'rgba(210,222,240,0)');
    c.fillStyle = gr; c.fillRect(0, 0, w, h);
    const edge = c.createLinearGradient(0, 0, 0, h);
    edge.addColorStop(0, 'rgba(210,222,240,0.08)'); edge.addColorStop(0.08, 'rgba(210,222,240,0)'); edge.addColorStop(0.92, 'rgba(210,222,240,0)'); edge.addColorStop(1, 'rgba(210,222,240,0.06)');
    c.fillStyle = edge; c.fillRect(0, 0, w, h);
  });
  const glassMat = new THREE.MeshBasicMaterial({ map: sheen, transparent: true, opacity: 0.35, depthWrite: false, blending: THREE.AdditiveBlending, toneMapped: false });
  const glass = new THREE.Mesh(bowedPlane(SCREEN.w, SCREEN.h, BOW), glassMat);
  glass.position.set(SCREEN.x, SCREEN.y, faceZ + FRONT + 0.1 + BOW); glass.rotation.y = Math.PI;
  glass.renderOrder = 3;
  g.add(glass);
  return { group: g, glassMat, jewelMat, vhf: vhf.turn, vhfHit: vhf.k, feet };
}
function buildTable() {
  const g = new THREE.Group();
  const nap = napTex(); nap.wrapS = nap.wrapT = THREE.RepeatWrapping; nap.repeat.set(16, 16);
  // (black cotton velvet: almost no light comes back square on; at grazing
  // the nap catches it, in the light's own colour)
  const velvet = new THREE.MeshPhysicalMaterial({ color: 0x1c1416, roughness: 1, sheen: 1, sheenRoughness: 0.42, sheenColor: new THREE.Color(0x5a3a40), normalMap: nap, normalScale: new THREE.Vector2(0.9, 0.9) });
  const top = new THREE.Mesh(new THREE.CircleGeometry(TABLE.r, 72), velvet);
  top.rotation.x = -Math.PI / 2; top.receiveShadow = true;
  g.add(top);
  // the cloth's fall: from the top's edge out a little to the floor, in
  // folds that deepen toward the hem
  // (the cloth rolls over the table's edge in a soft round, then falls
  // straight, gathering into a few deep folds that open toward the hem)
  const N = 200, M = 30, verts = [], idx = [], uvs = [];
  const rnd = seeded(7), ph = Array.from({ length: 9 }, () => rnd() * 6.28);
  const drop = -TABLE.floor + 0.5, ROLL = 1.6;
  for (let j = 0; j <= M; j++) {
    const v = Math.pow(j / M, 1.5), d = v * drop, y = -d;
    const round = ROLL * Math.sqrt(Math.min(d, ROLL) / ROLL * (2 - Math.min(d, ROLL) / ROLL));
    for (let i = 0; i <= N; i++) {
      const a = (i / N) * Math.PI * 2;
      let f = 0;
      for (let k = 0; k < 3; k++) f += Math.sin(a * [7, 12, 19][k] + ph[k]) * [0.6, 0.3, 0.12][k];
      const r = TABLE.r + round + v * v * 6 + f * (0.15 + v * v * 5.5) * smoother(d / 6);
      verts.push(Math.sin(a) * r, y, Math.cos(a) * r);
      uvs.push(i / N * 8, v * 3);
    }
  }
  // (wound to face out: it's seen from outside)
  for (let j = 0; j < M; j++) for (let i = 0; i < N; i++) {
    const a = j * (N + 1) + i, b = a + N + 1;
    idx.push(a, b, a + 1, b, b + 1, a + 1);
  }
  const fall = new THREE.BufferGeometry();
  fall.setAttribute('position', new THREE.Float32BufferAttribute(verts, 3));
  fall.setAttribute('uv', new THREE.Float32BufferAttribute(uvs, 2));
  fall.setIndex(idx); fall.computeVertexNormals();
  // (the fall's own velvet: the same cloth, its crests catching a little
  // more of the lights' red as they turn toward them, the troughs black)
  const fallVelvet = velvet.clone();
  fallVelvet.color.setHex(0x3a2228); fallVelvet.sheenColor.setHex(0x8a4048); fallVelvet.sheenRoughness = 0.36;
  const skirt = new THREE.Mesh(fall, fallVelvet);
  skirt.castShadow = true; skirt.receiveShadow = true;
  g.add(skirt);
  // (where the hem meets the floor, the dark it keeps: a soft ring, darkest
  // tight under the cloth)
  const hemTex = K.canvasTex(256, 4, (c, w, h) => {
    const gr = c.createLinearGradient(0, 0, w, 0);
    gr.addColorStop(0, 'rgba(0,0,0,0.95)'); gr.addColorStop(0.18, 'rgba(0,0,0,0.9)');
    gr.addColorStop(0.45, 'rgba(0,0,0,0.45)'); gr.addColorStop(1, 'rgba(0,0,0,0)');
    c.fillStyle = gr; c.fillRect(0, 0, w, h);
  });
  const hemR0 = TABLE.r + 4, hemR1 = TABLE.r + 30;
  const hemGeo = new THREE.RingGeometry(hemR0, hemR1, 96, 1);
  { // (u across the ring, from the hem out)
    const pos = hemGeo.attributes.position, uv = hemGeo.attributes.uv;
    for (let i = 0; i < pos.count; i++) uv.setXY(i, (Math.hypot(pos.getX(i), pos.getY(i)) - hemR0) / (hemR1 - hemR0), 0.5);
  }
  const hem = new THREE.Mesh(hemGeo, new THREE.MeshBasicMaterial({ map: hemTex, transparent: true, depthWrite: false, toneMapped: false }));
  hem.rotation.x = -Math.PI / 2; hem.position.y = TABLE.floor + 0.45; hem.renderOrder = 1;
  g.add(hem);
  return { group: g, velvet };
}
// A surface of revolution whose radius can vary round it too: profile
// [[r, y], ...] from the inside floor up, over the rim and down the
// outside; facets(theta, y) scales the radius (the cut glass).
function turned(profile, segs, facets) {
  const verts = [], uvs = [], idx = [];
  const n = profile.length;
  for (let j = 0; j < n; j++) {
    const [r, y] = profile[j];
    for (let i = 0; i <= segs; i++) {
      const a = (i / segs) * Math.PI * 2, s = facets ? facets(a, y, j) : 1;
      verts.push(Math.sin(a) * r * s, y, Math.cos(a) * r * s);
      uvs.push(i / segs, j / (n - 1));
    }
  }
  for (let j = 0; j < n - 1; j++) for (let i = 0; i < segs; i++) {
    const a = j * (segs + 1) + i, b = a + segs + 1;
    idx.push(a, b, a + 1, b, b + 1, a + 1);
  }
  const g = new THREE.BufferGeometry();
  g.setAttribute('position', new THREE.Float32BufferAttribute(verts, 3));
  g.setAttribute('uv', new THREE.Float32BufferAttribute(uvs, 2));
  g.setIndex(idx); g.computeVertexNormals();
  return g;
}
function buildCups() {
  const g = new THREE.Group();
  // the ruby glass: its colour comes through it (a deep red, clear where
  // you see through it square on), it glows from inside where the flame
  // is (an emissive band at the flame's height), and its diamond cuts
  // catch the light as hard little planes
  const glowMap = K.canvasTex(4, 128, (c, w, h) => {
    const gr = c.createLinearGradient(0, h, 0, 0);
    // (v runs down the profile: the inside from its floor up to the rim,
    // then the outside from the rim down - the glow at the flame's height
    // on each, dark at the foot)
    gr.addColorStop(0, '#000'); gr.addColorStop(0.18, '#3a0402'); gr.addColorStop(0.3, '#ff5a30'); gr.addColorStop(0.4, '#702010');
    gr.addColorStop(0.52, '#401008'); gr.addColorStop(0.6, '#ff4a26'); gr.addColorStop(0.68, '#5a0a04'); gr.addColorStop(0.82, '#100'); gr.addColorStop(1, '#000');
    c.fillStyle = gr; c.fillRect(0, 0, w, h);
  });
  // (the cuts: two rows of diamonds round the sides, each diamond four
  // flat facets - a normal map, flat everywhere else on the cup; the
  // sides are rows 6 to 7 of the profile, v 6/11 - 7/11)
  const cuts = K.canvasTex(512, 256, (c, w, h) => {
    c.fillStyle = 'rgb(128,128,255)'; c.fillRect(0, 0, w, h);
    const y0 = (1 - 7 / 11) * h, y1 = (1 - 6 / 11) * h, rowsN = 2, n = 16, dw = w / n, dh = (y1 - y0) / rowsN;
    const col = (nx, ny) => { const l = Math.hypot(nx, ny, 1); return `rgb(${Math.round((nx / l * 0.5 + 0.5) * 255)},${Math.round((ny / l * 0.5 + 0.5) * 255)},${Math.round((1 / l * 0.5 + 0.5) * 255)})`; };
    for (let r = 0; r < rowsN; r++) for (let i = 0; i <= n; i++) {
      const cx = (i + (r % 2) * 0.5) * dw, cy = y0 + (r + 0.5) * dh;
      const L = [cx - dw / 2, cy], R = [cx + dw / 2, cy], T = [cx, cy - dh / 2], B = [cx, cy + dh / 2], C = [cx, cy];
      [[L, T, -0.55, 0.55], [T, R, 0.55, 0.55], [R, B, 0.55, -0.55], [B, L, -0.55, -0.55]].forEach(([p1, p2, nx, ny]) => {
        c.fillStyle = col(nx, ny); c.beginPath(); c.moveTo(...C); c.lineTo(...p1); c.lineTo(...p2); c.closePath(); c.fill();
      });
    }
  });
  cuts.colorSpace = THREE.NoColorSpace;
  const ruby = new THREE.MeshPhysicalMaterial({ side: THREE.DoubleSide, color: 0x6a0410, roughness: 0.04, metalness: 0, clearcoat: 1, clearcoatRoughness: 0.03, normalMap: cuts, normalScale: new THREE.Vector2(0.9, 0.9), transparent: true, opacity: 0.5, depthWrite: false, emissive: 0xd0140c, emissiveMap: glowMap, emissiveIntensity: 0, envMapIntensity: 0.35 });
  const tin = new THREE.MeshStandardMaterial({ color: 0xb8bcc4, metalness: 1, roughness: 0.38 });
  const wax = new THREE.MeshPhysicalMaterial({ color: 0xd6cdbd, roughness: 0.55, sheen: 0.4, sheenColor: new THREE.Color(0xfff0d0), emissive: 0xff8a40, emissiveIntensity: 0, envMapIntensity: 0.2 });
  // (the cup, inside floor first: up the inside, over the rolled rim, down
  // the cut sides, and in under the thick foot)
  const R0 = CUP.r0, R1 = CUP.r1, H = CUP.h, th = 0.38;
  const prof = [[0.01, CUP.foot], [R0 - th - 0.3, CUP.foot], [R0 - th, CUP.foot + 0.4], [R1 - th, H - 0.25], [R1 - th * 0.4, H], [R1 + 0.05, H - 0.25], [R1, H - 0.9], [R0 + 0.15, 1.6], [R0 + 0.25, 0.9], [R0 + 0.1, 0.05], [R0 - 0.6, 0], [0.01, 0]];
  const cupGeo = turned(prof, 72);
  // (the votive: paraffin, its top melted to a shallow pool round the wick
  // and its rim standing a little proud; turned from the pool's middle out
  // over the rim and down the side, so it faces out)
  const rt = R0 - th - 0.35, rb = R0 - th - 0.45, Hw = CUP.wax;
  const waxProf = [[0.01, Hw - 0.34], [rt * 0.6, Hw - 0.28], [rt - 0.28, Hw - 0.06], [rt - 0.08, Hw], [rt, Hw - 0.14], [rt - 0.02, Hw - 0.7], [rt - 0.04, Hw - 1.5], [rt - 0.07, Hw - 2.5], [rb, 0], [0.01, 0]];
  const waxGeo = turned(waxProf, 40);
  // (the light through it: the pool and the thin rim bright, the side
  // glowing for a centimetre or so below the rim and dark at the foot -
  // stops at each profile point, v running down the profile)
  const waxGlow = K.canvasTex(4, 256, (c, w, h) => {
    const gr = c.createLinearGradient(0, h, 0, 0), n = waxProf.length - 1;
    [[0, '#7a5a40'], [1, '#8a6448'], [2, '#d0a080'], [3, '#ffffff'], [4, '#e8c0a0'], [5, '#6a4430'], [6, '#24140c'], [7, '#0a0604'], [8, '#000'], [9, '#000']]
      .forEach(([i, col]) => gr.addColorStop(i / n, col));
    c.fillStyle = gr; c.fillRect(0, 0, w, h);
  });
  wax.emissiveMap = waxGlow;
  // (the pool itself: liquid wax, glossy, clear enough to glow)
  const poolMat = new THREE.MeshPhysicalMaterial({ color: 0xc8a888, roughness: 0.1, clearcoat: 1, clearcoatRoughness: 0.04, transparent: true, opacity: 0.86, depthWrite: false, emissive: 0xff9a50, emissiveIntensity: 0, envMapIntensity: 0.4 });
  const poolGeo = new THREE.CircleGeometry(1.15, 28).rotateX(-Math.PI / 2);
  // (and the soot the flame has laid inside the glass's rim)
  const sootTex = K.canvasTex(4, 64, (c, w, h) => {
    const gr = c.createLinearGradient(0, 0, 0, h);
    gr.addColorStop(0, '#fff'); gr.addColorStop(0.3, '#888'); gr.addColorStop(1, '#000');
    c.fillStyle = gr; c.fillRect(0, 0, w, h);
  });
  sootTex.colorSpace = THREE.NoColorSpace;
  const sootMat = new THREE.MeshBasicMaterial({ color: 0x0a0806, alphaMap: sootTex, transparent: true, opacity: 0.4, depthWrite: false, side: THREE.DoubleSide });
  const sootGeo = new THREE.CylinderGeometry(R1 - th - 0.04, R1 - th - 0.1, 1.5, 48, 1, true);
  const tinGeo = new THREE.CylinderGeometry(R0 - th - 0.25, R0 - th - 0.4, 1.4, 28, 1, true);
  const fTex = flameTex(), halo = softDot('255,180,110'), ember = softDot('255,120,50');
  const sTex = smokeTex(), sShape = smokeShape();
  const cups = CUPS.map(([x, z], i) => {
    const c = new THREE.Group();
    c.position.set(x, 0, z);
    const rnd = seeded(31 + i);
    // (each cup its own glass and wax, so each goes dark on its own when
    // its light is out - the same program for all of them)
    const glass = ruby.clone(), myWax = wax.clone();
    const cup = new THREE.Mesh(cupGeo, glass);
    cup.rotation.y = rnd() * 6.28; cup.castShadow = false; cup.receiveShadow = false; cup.renderOrder = 2;
    c.add(cup);
    const votive = new THREE.Mesh(waxGeo, myWax); votive.position.y = CUP.foot; c.add(votive);
    const myPool = poolMat.clone();
    const pool = new THREE.Mesh(poolGeo, myPool); pool.position.y = CUP.foot + Hw - 0.22; pool.renderOrder = 1; c.add(pool);
    const soot = new THREE.Mesh(sootGeo, sootMat); soot.position.y = H - 0.25 - 0.75; soot.renderOrder = 1; c.add(soot);
    const cupTin = new THREE.Mesh(tinGeo, tin); cupTin.position.y = CUP.foot + 0.7; c.add(cupTin);
    const top = CUP.foot + CUP.wax;
    // (the wick: braided cotton, charred black at its tip and curling)
    const wick = new THREE.Mesh(new THREE.CylinderGeometry(0.06, 0.08, 0.7, 6), new THREE.MeshBasicMaterial({ color: 0x2a2018 }));
    wick.position.y = top + 0.3; wick.rotation.z = 0.12; c.add(wick);
    const char = new THREE.Mesh(new THREE.SphereGeometry(0.085, 8, 6), new THREE.MeshBasicMaterial({ color: 0x030202 }));
    char.position.set(-0.05, top + 0.64, 0); char.scale.y = 1.6; c.add(char);
    const flame = new THREE.Sprite(new THREE.SpriteMaterial({ map: fTex, transparent: true, depthWrite: false, blending: THREE.AdditiveBlending, toneMapped: false, opacity: 0 }));
    flame.scale.set(1.0, 2.3, 1); flame.position.y = top + 1.4; flame.renderOrder = 4;
    c.add(flame);
    const glow = new THREE.Sprite(new THREE.SpriteMaterial({ map: halo, color: 0xffb080, transparent: true, depthWrite: false, blending: THREE.AdditiveBlending, toneMapped: false, opacity: 0 }));
    glow.scale.set(7, 7, 1); glow.position.y = top + 1.6; glow.renderOrder = 4;
    c.add(glow);
    const emb = new THREE.Sprite(new THREE.SpriteMaterial({ map: ember, transparent: true, depthWrite: false, blending: THREE.AdditiveBlending, toneMapped: false, opacity: 0 }));
    emb.scale.set(0.7, 0.7, 1); emb.position.y = top + 0.62; emb.renderOrder = 4;
    c.add(emb);
    // the smoke after it is snuffed: a thread up from the wick, turned to
    // face you
    const smokeMat = new THREE.MeshBasicMaterial({ map: sTex.clone(), alphaMap: sShape, color: 0x9aa6b8, transparent: true, opacity: 0, depthWrite: false, toneMapped: false });
    smokeMat.map.needsUpdate = true;
    const smoke = new THREE.Mesh(new THREE.PlaneGeometry(3.2, 22).translate(0, 11, 0), smokeMat);
    smoke.position.y = top + 0.6; smoke.visible = false; smoke.renderOrder = 5;
    c.add(smoke);
    // its light: red where it comes through the glass
    const light = new THREE.PointLight(0xff2a14, 0, 130, 2);
    light.position.y = top + 1.4;
    c.add(light);
    const cs = K.contactShadow(R0 * 2 + 0.6, R0 * 2 + 0.6, R0 + 0.3, 1.8, [], 0.95); c.add(cs);
    g.add(c);
    return { g: c, flame, glow, emb, smoke, smokeMat, light, votive, glass, wax: myWax, pool: myPool, top, ph: rnd() * 10, f1: 5.5 + rnd() * 3, f2: 11 + rnd() * 6, world: V(0, 0, 0) };
  });
  return { group: g, cups, ruby, wax };
}
// The snuffer, built about the bell's crook (its pivot): the bell hanging
// from it, the rod running back up from it to the grip.
function buildSnuffer(set) {
  const g = new THREE.Group();
  const brass = K.finished(set.brass.clone(), 'brushed', 1, 1, 0.12); brass.roughness = 0.42; brass.color.multiplyScalar(0.82);
  const bright = K.polishedOf(set.brass, 0.16);
  const ebony = new THREE.MeshPhysicalMaterial({ color: 0x0b0806, roughness: 0.38, clearcoat: 0.5 });
  // the bell: spun, a rolled lip, a little knop on its crown
  const bell = new THREE.Group(); g.add(bell);
  const bp = [[0.01, -0.2], [0.6, -0.25], [1.05, -0.9], [1.35, -2.0], [1.55, -3.0], [1.6, -3.15], [1.5, -3.2], [1.42, -3.05], [1.25, -2.0], [0.95, -0.95], [0.5, -0.4], [0.01, -0.35]];
  const bellM = new THREE.Mesh(new THREE.LatheGeometry(bp.map(([r, y]) => new THREE.Vector2(r, y)), 32), brass);
  bellM.castShadow = true; bell.add(bellM);
  const knop = new THREE.Mesh(new THREE.SphereGeometry(0.32, 12, 8), bright); knop.position.y = -0.05; bell.add(knop);
  // the crook and the rod, back and up from the pivot, the grip and finial
  const rodG = new THREE.Group(); g.add(rodG);
  const crook = new THREE.CatmullRomCurve3([V(0, 0, 0), V(0, 0.9, 0.4), V(0, 1.4, 1.6), V(0, 1.6, 3.2)]);
  const crookM = new THREE.Mesh(new THREE.TubeGeometry(crook, 16, 0.2, 8, false), brass); crookM.castShadow = true; rodG.add(crookM);
  const rod = new THREE.Mesh(new THREE.CylinderGeometry(0.22, 0.26, SNUFF.rod - 9, 12), bright);
  rod.rotation.x = Math.PI / 2; rod.position.set(0, 1.6, 3.2 + (SNUFF.rod - 9) / 2); rod.castShadow = true; rodG.add(rod);
  const gz = 3.2 + SNUFF.rod - 9;
  const collar = new THREE.Mesh(new THREE.CylinderGeometry(0.42, 0.42, 0.6, 16), bright); collar.rotation.x = Math.PI / 2; collar.position.set(0, 1.6, gz + 0.3); rodG.add(collar);
  const grip = new THREE.Mesh(new THREE.CylinderGeometry(0.62, 0.5, 7.5, 18), ebony); grip.rotation.x = Math.PI / 2; grip.position.set(0, 1.6, gz + 4.35); grip.castShadow = true; rodG.add(grip);
  const fin = new THREE.Mesh(new THREE.SphereGeometry(0.55, 14, 10), bright); fin.position.set(0, 1.6, gz + 8.3); rodG.add(fin);
  return { group: g, bell, rodG };
}
function buildDrapes() {
  const g = new THREE.Group();
  const nap = napTex(); nap.wrapS = nap.wrapT = THREE.RepeatWrapping; nap.repeat.set(24, 6);
  const velvet = new THREE.MeshPhysicalMaterial({ color: 0x3a0610, roughness: 0.94, sheen: 1, sheenRoughness: 0.3, sheenColor: new THREE.Color(0xb03848), normalMap: nap, normalScale: new THREE.Vector2(0.3, 0.3), side: THREE.DoubleSide, envMapIntensity: 0 });
  const N = 360, M = 18, verts = [], idx = [];
  // (a ring, open behind you - where you came in - by the gap)
  const gap = 34 * DEG;
  for (let j = 0; j <= M; j++) {
    const v = j / M, y = TABLE.floor + v * DRAPE.h;
    for (let i = 0; i <= N; i++) {
      const a = Math.PI + gap / 2 + (i / N) * (Math.PI * 2 - gap);
      const fold = Math.sin(a * DRAPE.folds) * 6 + Math.sin(a * DRAPE.folds * 0.37 + 1.3) * 3;
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
  // the floor inside the ring: an old rug, near black
  // (wider than the ring, so the drapes' hems fall on it all round; a
  // worn oxblood border at its edge, seen where you come in through the
  // gap; Lambert, so the studio's light isn't in it)
  const rugMap = K.canvasTex(1024, 1024, (c, w, h) => {
    c.fillStyle = '#100a0a'; c.fillRect(0, 0, w, h);
    const ring = (r0, r1, col) => { c.beginPath(); c.arc(w / 2, h / 2, r1 * w / 2, 0, Math.PI * 2); c.arc(w / 2, h / 2, r0 * w / 2, 0, Math.PI * 2, true); c.fillStyle = col; c.fill(); };
    ring(0.9, 0.975, '#2a0c0e'); ring(0.915, 0.92, '#4a2a1c'); ring(0.955, 0.96, '#4a2a1c');
    const rnd = seeded(5);
    for (let i = 0; i < 26000; i++) { c.fillStyle = `rgba(0,0,0,${0.15 + rnd() * 0.25})`; c.fillRect(rnd() * w, rnd() * h, 1 + rnd() * 2, 1 + rnd() * 2); }
  });
  const rug = new THREE.Mesh(new THREE.CircleGeometry(DRAPE.r + 16, 96), new THREE.MeshLambertMaterial({ color: 0xffffff, map: rugMap, polygonOffset: true, polygonOffsetFactor: -1, polygonOffsetUnits: -1 }));
  rug.rotation.x = -Math.PI / 2; rug.position.set(0, TABLE.floor + 0.2, 20); rug.receiveShadow = true;
  g.add(rug);
  return { group: g, velvet };
}
// The signal: snow drifting at you, the spirit far off, your channels
// round it.
function buildSignal(cards) {
  const g = new THREE.Group();
  const dark = new THREE.Mesh(new THREE.SphereGeometry(9000, 24, 16), new THREE.MeshBasicMaterial({ color: 0x020304, side: THREE.BackSide, fog: false }));
  g.add(dark);
  // (the spirit's picture is drawn later - see paintSpirit: it takes a
  // moment, and nothing should stall while the room is being built; a
  // blank canvas holds its place, so the material never changes shape)
  const blank = document.createElement('canvas'); blank.width = 4; blank.height = 4;
  const sTex = new THREE.CanvasTexture(blank); sTex.colorSpace = THREE.SRGBColorSpace;
  const sh = SIGNAL.spiritH, sw = sh * SPIRIT_SIZE.w / SPIRIT_SIZE.h;
  const spiritMesh = new THREE.Mesh(new THREE.PlaneGeometry(sw, sh), new THREE.MeshBasicMaterial({ map: sTex, transparent: true, toneMapped: false, depthWrite: false, fog: false }));
  spiritMesh.position.set(-sw * 0.08, SIGNAL.spiritY, SIGNAL.spiritZ); spiritMesh.rotation.y = Math.PI;
  g.add(spiritMesh);
  const COUNT = 1800, P = new Float32Array(COUNT * 3), rnd = seeded(41);
  for (let i = 0; i < COUNT; i++) { P[i * 3] = (rnd() - 0.5) * 1600; P[i * 3 + 1] = (rnd() - 0.5) * 1200; P[i * 3 + 2] = rnd() * 3200; }
  const snowGeo = new THREE.BufferGeometry(); snowGeo.setAttribute('position', new THREE.BufferAttribute(P, 3));
  const snow = new THREE.Points(snowGeo, new THREE.PointsMaterial({ map: softDot('240,244,250'), size: 7, sizeAttenuation: true, transparent: true, opacity: 0.8, depthWrite: false, blending: THREE.AdditiveBlending, toneMapped: false, color: 0xe9e4d8, fog: false }));
  g.add(snow);
  const chans = cards.slice(0, ROWS).map((c, i) => {
    const tex = channelTex(c, chOf(i)); tex.colorSpace = THREE.SRGBColorSpace;
    const m = new THREE.Mesh(new THREE.PlaneGeometry(CHAN.w, CHAN.w / 4), new THREE.MeshBasicMaterial({ map: tex, transparent: true, toneMapped: false, depthWrite: false, fog: false }));
    m.position.set(CHAN.x + (i % 2 ? -1 : 1) * 14, CHAN.y0 - i * CHAN.step, CHAN.z);
    m.rotation.y = Math.PI;
    m.userData = { id: c.id, base: m.position.clone(), ph: i * 1.7 };
    g.add(m);
    return m;
  });
  return { group: g, snow, snowP: P, chans, spiritMesh };
}

// The page's own buttons over the picture: where the guide draws each
// listing and button, a real button the same size, clear (the picture is
// what you see), so taps and the keyboard reach them.
function screenHTML(cards) {
  const rows = cards.slice(0, ROWS).map((c, i) => `<button type="button" class="r3d-row" data-id="${K.esc(c.id)}" style="top:${GUIDE.row0 + GUIDE.rowH * i}px;height:${GUIDE.rowH - 12}px">Channel ${chOf(i)}: ${K.esc(c.name)}<span class="r3d-st" data-st="${K.esc(c.id)}"></span></button>`).join('');
  const bw = (GUIDE.W - GUIDE.padX * 2 - 28) / 2;
  return `<div class="r3d-screen-in">${rows}
    <button type="button" class="r3d-run" style="top:${GUIDE.foot}px;left:${GUIDE.padX}px;width:${bw}px;height:${GUIDE.footH - 10}px">Run the deck</button>
    <button type="button" class="r3d-look" style="top:${GUIDE.foot}px;left:${GUIDE.padX + bw + 28}px;width:${bw}px;height:${GUIDE.footH - 10}px">Tune out, into the signal</button>
  </div>`;
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

  // (the dial's numbers, the guide and the channels are in the room's type
  // - the same sheet Dead Channel's room asks for: ask for it too, and
  // wait for it)
  const FELL = 'https://fonts.googleapis.com/css2?family=IM+Fell+English+SC&family=VT323&display=swap';
  if (![...document.querySelectorAll('link[rel="stylesheet"]')].some(l => l.href === FELL)) {
    const l = document.createElement('link'); l.rel = 'stylesheet'; l.href = FELL; document.head.appendChild(l);
  }
  if (document.fonts && document.fonts.load) await Promise.all(['400 40px VT323', '400 40px "IM Fell English SC"'].map(f => document.fonts.load(f).catch(() => {})));

  const tv = buildSet(set);
  seat.add(tv.group);
  const table = buildTable();
  seat.add(table.group);
  const cups = buildCups();
  seat.add(cups.group);
  const snuffer = buildSnuffer(set);
  seat.add(snuffer.group);
  const drapes = buildDrapes();
  seat.add(drapes.group);
  // (the set's shadow on the cloth: the case, and darker at its feet)
  const csTv = K.contactShadow(TV.w + 1, TV.d + TV.hood * 0.6, 4, 4.5, tv.feet.map(([x, z]) => [x, z]), 0.95); csTv.position.set(-SCREEN.x, 0.04, TV.z); seat.add(csTv);
  const csTable = K.contactShadow(TABLE.r * 2 + 14, TABLE.r * 2 + 14, TABLE.r + 7, 10, [], 0.65); csTable.position.set(0, TABLE.floor + 0.3, 0); seat.add(csTable);
  const csSnuff = K.contactShadow(3.0, SNUFF.rod + 8, 1.5, 1.4, [], 0.95); seat.add(csSnuff);
  // (and while it's carried, the key's soft shadow of the bell and rod on
  // the cloth, cast down and away from the light, softer the higher it is)
  const csAloft = K.contactShadow(2.4, 12, 1.2, 3.0, [], 0.6); csAloft.visible = false; seat.add(csAloft);

  // The hand: the deck's ready platforms (the demonstration hand with
  // nothing ready), best first - four channels.
  const hand = ((hooks.deck && hooks.deck()) || []).slice(0, ROWS);
  const cards = hand.length ? hand : K.demoHand().slice(0, ROWS);

  // The picture: the tube's bowed face, showing the picture canvas.
  const snow = snowCanvas();
  const guideC = document.createElement('canvas'); guideC.width = GUIDE.W; guideC.height = GUIDE.H;
  const guideG = guideC.getContext('2d');
  const picC = document.createElement('canvas'); picC.width = GUIDE.W; picC.height = GUIDE.H;
  const picG = picC.getContext('2d');
  const over = tubeOver();
  const picTex = new THREE.CanvasTexture(picC); picTex.colorSpace = THREE.SRGBColorSpace; picTex.anisotropy = 8; picTex.wrapS = picTex.wrapT = THREE.ClampToEdgeWrapping;
  const snowTex = new THREE.CanvasTexture(snow.canvas); snowTex.colorSpace = THREE.SRGBColorSpace; snowTex.magFilter = THREE.NearestFilter;
  const pictureMat = new THREE.MeshBasicMaterial({ map: picTex, toneMapped: false, color: 0xffffff });
  const picture = new THREE.Mesh(bowedPlane(SCREEN.w, SCREEN.h, BOW, 0.24), pictureMat);
  picture.position.set(0, SCREEN.y + TV.feet, SCREEN_Z + BOW); picture.rotation.y = Math.PI;
  seat.add(picture);
  // (the glints: each vigil light's flame where the bowed glass mirrors it)
  const glintTex = softDot('255,200,170');
  // (and the screen in each cup's glass: a thin streak of its blue down
  // the cup's side, where the curve turns it to you)
  const streakTex = K.canvasTex(16, 128, (g) => {
    const gr = g.createLinearGradient(0, 0, 0, 128);
    gr.addColorStop(0, 'rgba(200,225,255,0)'); gr.addColorStop(0.25, 'rgba(200,225,255,0.9)'); gr.addColorStop(0.75, 'rgba(200,225,255,0.9)'); gr.addColorStop(1, 'rgba(200,225,255,0)');
    g.fillStyle = gr; g.fillRect(5, 0, 6, 128);
    g.fillStyle = 'rgba(200,225,255,0.25)'; g.fillRect(3, 16, 10, 96);
  });
  const streaks = cups.cups.map(c => {
    const m = new THREE.Mesh(new THREE.PlaneGeometry(0.42, CUP.h * 0.62), new THREE.MeshBasicMaterial({ map: streakTex, color: 0x9cc4ff, transparent: true, opacity: 0, depthWrite: false, blending: THREE.AdditiveBlending, toneMapped: false }));
    m.renderOrder = 3; c.g.add(m);
    return m;
  });
  const glints = cups.cups.map(() => {
    const s = new THREE.Sprite(new THREE.SpriteMaterial({ map: glintTex, color: 0xff5a30, transparent: true, depthWrite: false, depthTest: false, blending: THREE.AdditiveBlending, toneMapped: false, opacity: 0 }));
    s.scale.set(2.0, 2.8, 1); s.renderOrder = 6; seat.add(s);
    return s;
  });

  // The signal, far under the floor.
  const signal = buildSignal(cards);
  let spiritDrawn = false;
  const paintSpirit = () => {
    if (spiritDrawn) return;
    spiritDrawn = true;
    const mat = signal.spiritMesh.material, old = mat.map;
    const tex = new THREE.CanvasTexture(spiritCanvas({ seed: 17, scale: 1.2 })); tex.colorSpace = THREE.SRGBColorSpace;
    mat.map = tex;
    old.dispose();
  };
  signal.group.position.set(...SIGNAL.at);
  seat.add(signal.group);
  // (the snow across the lens as you come out: the tube's own snow, on a
  // card held in front of the camera, thinning as you move)
  const veilMat = new THREE.MeshBasicMaterial({ map: snowTex, toneMapped: false, transparent: true, opacity: 0, depthTest: false, depthWrite: false, fog: false });
  const veil = new THREE.Mesh(new THREE.PlaneGeometry(1, 1), veilMat);
  veil.renderOrder = 10; veil.visible = false; veil.frustumCulled = false;

  // The lights: every one in from the start and dark. The key: a dim cool
  // spill from above left, in front of the glass (the room beyond the
  // drapes); the vigil lights; the tube's own glow on the cloth.
  const key = new THREE.SpotLight(0xa8b8d8, 0, 0, 0.5, 0.85, 0);
  key.position.set(70, 180, -70); key.target.position.set(0, 0, 10);
  key.castShadow = true;
  key.shadow.mapSize.set(1024, 1024); key.shadow.camera.near = 80; key.shadow.camera.far = 420;
  key.shadow.bias = -0.0004; key.shadow.normalBias = 0.03; key.shadow.radius = 4;
  const tubeLight = new THREE.PointLight(0x8fb8ff, 0, 110, 2);
  tubeLight.position.set(0, SCREEN.y - 2, SCREEN_Z - 9);
  // (and the lights' glow carried out to the drapes: the vigil lights
  // together, as one faint red source at the table)
  const roomGlow = new THREE.PointLight(0xff3020, 0, 0, 1);
  roomGlow.position.set(0, 16, -10);
  // (and behind the set, out of sight, the same glow where it falls on
  // the far drapes: their folds' crowns catch it, and the set stands dark
  // against them)
  const drapeGlow = new THREE.PointLight(0xb02418, 0, 260, 2);
  drapeGlow.position.set(0, 30, 160);
  // (and low in front, the same red come back off the floor: it finds the
  // crowns of the cloth's folds where it falls, and leaves the troughs and
  // the hem black)
  const hemGlow = new THREE.PointLight(0xc0301a, 0, 170, 2);
  hemGlow.position.set(-10, -36, -124);
  seat.add(key, key.target, tubeLight, roomGlow, drapeGlow, hemGlow);
  let litT0 = performance.now();
  let tube = 0;              // how bright the picture is (0 dark - 1 full)
  const lit = cups.cups.map(() => 1);   // each vigil light: 1 burning, 0 out
  const lightsUp = (tt, reduced) => {
    const k = smoother((performance.now() - litT0) / 2200);
    key.intensity = 0.34 * k;
    tubeLight.intensity = 520 * k * (0.45 + 0.55 * tube);
    roomGlow.intensity = 14 * k * lit.reduce((t, v) => t + v, 0) / lit.length;
    drapeGlow.intensity = 2600 * k * (0.25 + 0.75 * lit.reduce((t, v) => t + v, 0) / lit.length);
    hemGlow.intensity = 11700 * k * (0.2 + 0.8 * lit.reduce((t, v) => t + v, 0) / lit.length);
    cups.cups.forEach((c, i) => {
      const fl = reduced ? 1 : 0.84 + 0.1 * Math.sin(tt * c.f1 + c.ph) + 0.06 * Math.sin(tt * c.f2 + c.ph * 2);
      const on = lit[i];
      c.light.intensity = 260 * k * fl * on;
      c.flame.material.opacity = k * smoother(on * 1.4);
      c.flame.scale.set(1.0 * (0.92 + 0.08 * fl), 2.3 * fl * (0.25 + 0.75 * on), 1);
      c.glow.material.opacity = 0.2 * k * fl * on;
      c.flame.position.x = reduced ? 0 : Math.sin(tt * 1.3 + c.ph) * 0.07;
      c.glass.emissiveIntensity = 1.1 * k * fl * on;
      c.wax.emissiveIntensity = 0.9 * k * fl * on;
      c.pool.emissiveIntensity = 0.32 * k * fl * on;
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
    const PIC = V(0, SCREEN.y + TV.feet, SCREEN_Z);
    const seatView = () => {
      if (fo.seatView) { const [ey, ez, az, fv] = fo.seatView; return { eye: V(0, ey, ez), aim: V(0, 14, az), fov: fv }; }
      const v = VIEW[aspect < 0.62 ? 0 : 1];
      return { eye: V(...v.eye), aim: V(...v.aim), fov: v.fov };
    };
    let sv = seatView();
    let E1 = toWorld(sv.eye), A1 = toWorld(sv.aim);

    // The path in: up out of the float, round over the floor, and down
    // through the drapes' gap from behind the chair.
    const E0 = camera.position.clone(), q0 = camera.quaternion.clone();
    const F = toWorld(V(0, 20, 30));
    const cruise = THREE.MathUtils.clamp(Math.max(E0.y, E1.y) + 70, 120, 160);
    const bez = (u, a, b, c, d) => { const v = 1 - u; return v * v * v * a + 3 * v * v * u * b + 3 * v * u * u * c + u * u * u * d; };
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
    // (and the studio the surfaces mirror goes down with them: what the
    // set's chrome and the velvet see in here is a dark room)
    const env0 = scene.environmentIntensity;

    // Leaning in over the picture (the channels a fingertip tall), and
    // where the lean through ends: the picture exactly filling the lens.
    const fv = { eye: V(0, 0, 0), aim: V(0, 0, 0), fov: 0 };
    const hover = { eye: V(0, 0, 0), q: new THREE.Quaternion(), fov: 0 };
    const setHover = () => {
      const f = sv.fov * DEG, t = Math.tan(f / 2);
      const fill = (m) => Math.max((SCREEN.h / 2 * m) / t, (SCREEN.w / 2 * m) / (aspect * t));
      const d = Math.min((SCREEN.h / 2) / t, (SCREEN.w / 2) / (aspect * t));
      hover.eye.set(0, PIC.y, SCREEN_Z - d);
      hover.fov = sv.fov;
      lookQ(toWorld(hover.eye), toWorld(PIC), hover.q);
      // (leaning in: the picture's width across the lens upright, with a
      // little of the case round it; its height on a wide one)
      const df = aspect < 1 ? (SCREEN.w / 2 / 0.93) / (aspect * t) : fill(1.12);
      fv.eye.set(0, PIC.y + 1.5, SCREEN_Z - df); fv.aim.copy(PIC); fv.fov = sv.fov;
    };
    setHover();
    const bezV = (u, a, b, c, d, out) => { const v = 1 - u; return out.set(
      v * v * v * a.x + 3 * v * v * u * b.x + 3 * v * u * u * c.x + u * u * u * d.x,
      v * v * v * a.y + 3 * v * v * u * b.y + 3 * v * u * u * c.y + u * u * u * d.y,
      v * v * v * a.z + 3 * v * v * u * b.z + 3 * v * u * u * c.z + u * u * u * d.z); };
    // Where you are before any dive: in the chair, leaning in over the
    // picture, or on the way between (a little rise as you come forward).
    let focus = 0, focusFrom = 0, focusTo = 0, focusT0 = 0;
    const base = { eye: V(0, 0, 0), q: new THREE.Quaternion(), fov: 66 };
    const _qs = new THREE.Quaternion(), _qf = new THREE.Quaternion();
    const basePose = () => {
      const k = smoother(focus);
      base.eye.copy(sv.eye).lerp(fv.eye, k);
      base.eye.y += Math.sin(Math.PI * k) * 3;
      lookQ(toWorld(sv.eye), toWorld(sv.aim), _qs);
      lookQ(toWorld(fv.eye), toWorld(fv.aim), _qf);
      base.q.copy(_qs).slerp(_qf, k);
      base.fov = lerp(sv.fov, fv.fov, k);
      return base;
    };
    // The lean through: from the chair (or from over the picture) in to
    // where the snow fills the lens - a sit-back first, then in.
    const L1 = V(0, 0, 0), L2 = V(0, 0, 0), leanP = V(0, 0, 0);
    const leanAt = s0 => {
      const u = clamp01(s0);
      const back = u < 0.18 ? Math.sin(Math.PI * u / 0.18) : 0;
      const s = smoother((u - 0.12) / 0.88);
      const b0 = basePose();
      L1.copy(b0.eye).add(V(0, -3, 16)); L2.copy(hover.eye).add(V(0, 2, -14));
      bezV(s, b0.eye, L1, L2, hover.eye, leanP);
      leanP.y += back * 1.6; leanP.z -= back * 4;
      return { p: toWorld(leanP), s };
    };
    const insEye0 = sigW(V(0, 0, 0)), insEye1 = sigW(V(0, 40, SIGNAL.stopZ));
    const insAim = sigW(V(0, 60, SIGNAL.spiritZ));
    const qIn0 = new THREE.Quaternion(), qIn1 = new THREE.Quaternion();
    lookQ(insEye0, sigW(V(0, 0, 100)), qIn0); lookQ(insEye1, insAim, qIn1);
    // The way through, in its own seconds (0 - W.all): `way`. Going in it
    // runs at its own pace; coming back, faster, and the lights come back
    // up by themselves (the snuffer lies still).
    let way = 0, wayFrom = 0, wayTo = 0, wayT0 = 0, wayDelay = 0;
    const dive = () => way / W.all;

    // ---- The snuffer's round: where it is at second s of the way in.
    const sn = { p: V(0, 0, 0), q: new THREE.Quaternion(), hang: 0, rest: true };
    const restP = V(SNUFF.at[0], 1.6, SNUFF.at[1]);
    const restQ = new THREE.Quaternion().setFromEuler(new THREE.Euler(0.035, SNUFF.yaw * DEG, Math.PI / 2, 'YXZ'));
    const cupTop = i => V(CUPS[i][0], CUP.h, CUPS[i][1]);
    const _e = new THREE.Euler(), _q = new THREE.Quaternion(), _p = V(0, 0, 0), _p2 = V(0, 0, 0);
    const jitter = seeded(77);
    const swayOf = CUPS.map(() => [(jitter() - 0.5) * 0.3, (jitter() - 0.5) * 0.3, 0.9 + jitter() * 0.3]);
    // (aloft: the rod held back and up, as a hand would hold it, the bell
    // hanging plumb from its crook, swaying a little after each move)
    const aloftQ = yaw => _q.setFromEuler(_e.set(-0.42, yaw, 0, 'YXZ'));
    // (between lying on the cloth and aloft: turned through the angles
    // themselves, the long way round - toward you and to your right - so
    // the rod never sweeps across the picture)
    const REST_YAW = SNUFF.yaw * DEG + Math.PI * 2;
    const between = (k, yawUp) => _q.setFromEuler(_e.set(lerp(0.035, -0.42, k), lerp(REST_YAW, yawUp, k), lerp(Math.PI / 2, 0, smoother((k - 0.1) / 0.6)), 'YXZ'));
    const snufferAt = s => {
      if (wayTo === 0 || s <= 0) {
        sn.p.copy(restP); sn.q.copy(restQ); sn.hang = 0; sn.rest = true;
        return sn;
      }
      sn.rest = false;
      const yaw = Math.PI * 0.75;
      // up off the cloth: a small dip, then up and righting itself
      if (s < W.rise) {
        const u = s / W.rise, dip = u < 0.2 ? -Math.sin(Math.PI * u / 0.2) * 0.35 : 0;
        const k = smoother((u - 0.15) / 0.85);
        _p.copy(restP); _p2.copy(cupTop(0)).add(V(0, 7, 0));
        sn.p.copy(_p).lerp(_p2, k); sn.p.y += dip + Math.sin(Math.PI * k) * 4;
        sn.q.copy(between(smoother(u * 1.3), yaw));
        sn.hang = Math.sin(Math.PI * k) * 0.25;
        return sn;
      }
      const per = W.per, n = CUPS.length;
      const j = Math.min(n - 1, Math.floor((s - W.rise) / per));
      const v = (s - W.rise - j * per) / per;
      const top = cupTop(j), above = top.clone().add(V(0, 7, 0)), into = top.clone().add(V(0, 0.3, 0));
      if (s >= W.rise + n * per) {
        // the round done: back down to the cloth where it lay, a settle
        const u = clamp01((s - W.rise - n * per) / W.settle);
        const k = smoother(u);
        _p.copy(cupTop(n - 1)).add(V(0, 7, 0));
        sn.p.copy(_p).lerp(restP, k); sn.p.y += Math.sin(Math.PI * k) * 5 - (u > 0.86 ? Math.sin(Math.PI * (u - 0.86) / 0.14) * 0.25 : 0);
        sn.q.copy(between(1 - smoother((u - 0.2) / 0.8), yaw));
        sn.hang = Math.sin(Math.PI * k) * 0.2;
        return sn;
      }
      const [sx, sz, sp] = swayOf[j];
      if (v < 0.42) {
        // from above the last cup (or where it rose to) over to this one
        const from = j === 0 ? cupTop(0).add(V(0, 7, 0)) : cupTop(j - 1).add(V(0, 7, 0));
        const k = smoother(v / 0.42);
        sn.p.copy(from).lerp(above, k); sn.p.y += Math.sin(Math.PI * k) * 3.5;
        sn.hang = Math.sin(Math.PI * k) * 0.3 * sp;
      } else if (v < 0.62) {
        // down into the mouth - a touch past, and back
        const u = (v - 0.42) / 0.2, k = smoother(u);
        sn.p.copy(above).lerp(into, k); sn.p.y -= Math.sin(Math.PI * clamp01((u - 0.7) / 0.3)) * 0.25;
        sn.hang = -0.08 * (1 - k) * sp;
      } else if (v < 0.8) {
        // the beat: held in the mouth
        sn.p.copy(into); sn.hang = 0;
      } else {
        const k = smoother((v - 0.8) / 0.2);
        sn.p.copy(into).lerp(above, k);
        sn.hang = 0.06 * k * sp;
      }
      sn.q.copy(aloftQ(yaw + sx * 0.4));
      sn.hang += sz * 0.1 * Math.sin(v * Math.PI * 2);
      return sn;
    };
    // When each light goes out, in seconds of the way in (the beat after
    // the bell comes down over it).
    const outAt = i => W.rise + W.per * i + W.per * 0.66;
    const placeSnuffer = s => {
      const r = snufferAt(s);
      snuffer.group.position.copy(r.p);
      snuffer.group.quaternion.copy(r.q);
      // (the bell stays plumb under its crook while aloft; on the cloth it
      // lies with everything else)
      if (r.rest) snuffer.bell.rotation.set(0, 0, 0);
      else {
        _q.copy(r.q).invert();
        const plumb = new THREE.Quaternion().setFromEuler(new THREE.Euler(r.hang, 0, r.hang * 0.4));
        snuffer.bell.quaternion.copy(_q).multiply(plumb);
      }
      // (its shadow where it lay, fading as it lifts off)
      const lie = r.rest ? 1 : 1 - smoother((r.p.y - 1.6) / 1.4);
      csSnuff.visible = lie > 0.01;
      csSnuff.material.opacity = 0.95 * lie;
      if (lie > 0.01) {
        // (along the rod, from the bell to the grip)
        const yw = SNUFF.yaw * DEG;
        csSnuff.rotation.set(-Math.PI / 2, yw, 0, 'YXZ');
        // (the rod lies 1.6 to the side of the bell's crook once it is on
        // its side: the shadow under the rod, not the crook)
        csSnuff.position.set(restP.x + Math.sin(yw) * (SNUFF.rod / 2 - 3) - 1.6 * Math.cos(yw), 0.04, restP.z + Math.cos(yw) * (SNUFF.rod / 2 - 3) + 1.6 * Math.sin(yw));
      }
      const h = Math.max(0, r.p.y), air = (1 - lie) * (1 - smoother((h - 4) / 22));
      csAloft.visible = air > 0.01;
      if (csAloft.visible) {
        // (the rod runs back from the crook along the group's +z)
        _p.set(0, 0, 1).applyQuaternion(r.q); const ry = Math.atan2(_p.x, _p.z);
        const off = 0.39 * h, mid = 6;
        csAloft.position.set(r.p.x + Math.sin(ry) * mid - off, 0.05, r.p.z + Math.cos(ry) * mid + off);
        csAloft.rotation.set(-Math.PI / 2, ry, 0, 'YXZ');
        csAloft.scale.setScalar(1 + h / 14);
        csAloft.material.opacity = 0.6 * air;
      }
    };
    placeSnuffer(0);

    // ---- The UI, built now, shown when the set has tuned in.
    const ui = document.createElement('div');
    ui.className = 'r3t-ui';
    css.domElement.appendChild(ui);
    const screenEl = document.createElement('div');
    screenEl.className = 'r3d-screen r3d-far';
    screenEl.style.width = `${GUIDE.W}px`;
    screenEl.style.height = `${GUIDE.H}px`;
    screenEl.innerHTML = screenHTML(cards);
    screenEl.setAttribute('role', 'group');
    screenEl.setAttribute('aria-label', 'Tonight on the set');
    const screenObj = new CSS3DObject(screenEl);
    screenObj.position.set(0, PIC.y, SCREEN_Z - 0.1);
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
    const outEl = document.createElement('button');
    outEl.type = 'button';
    outEl.className = 'r3d-out';
    outEl.innerHTML = '<span aria-hidden="true">&#8593;</span> Back to the room';
    css.domElement.appendChild(outEl);
    const backEl = document.createElement('button');
    backEl.type = 'button';
    backEl.className = 'r3d-out r3d-back';
    backEl.innerHTML = '<span aria-hidden="true">&#8592;</span> Sit back';
    css.domElement.appendChild(backEl);
    const srList = document.createElement('div');
    srList.className = 'r3t-sr';
    srList.innerHTML = `<ul>${cards.map(c => `<li><button type="button" data-id="${K.esc(c.id)}">${K.esc(c.name)}, ${K.esc(K.cardShown(c))}</button></li>`).join('')}</ul>`;
    css.domElement.appendChild(srList);
    css.domElement.classList.add('r3t-hide');

    // ---- The picture: the guide redrawn when what it says changes; the
    // picture redrawn from it, the snow, the roll and the tear.
    const put = (el, v) => { if (el && el.textContent !== v) el.textContent = v; };
    const sample = () => ({ ready: cards.length, value: cards.reduce((t, c) => t + (c.ev || 0), 0), next: null, done: 0 });
    let guideKey = '', picDirty = true;
    const guideState = () => {
      const d = new Date();
      const hh = d.getHours(), mm = d.getMinutes();
      const rows = cards.map((c, i) => {
        const now = hooks.cardState ? hooks.cardState(c.id) : null;
        const rem = now ? now.remaining : (c.remaining || 0);
        return { ch: chOf(i), name: c.name, ready: rem <= 0, status: rem > 0 ? K.fmtLeft(rem).toUpperCase() : 'READY' };
      });
      return { clock: `${((hh + 11) % 12) + 1}:${String(mm).padStart(2, '0')}`, ampm: hh < 12 ? 'AM' : 'PM', rows, near: focusTo === 1 && wayTo === 0 };
    };
    const redrawGuide = () => {
      const d = guideState(), k = JSON.stringify(d);
      if (k === guideKey) return false;
      guideKey = k; drawGuide(guideG, d); picDirty = true;
      return true;
    };
    // (the tear: the room's jolt in miniature - a band of the picture
    // pushed sideways, its red and green split apart, for a few fields)
    let tearUntil = -1, tearNext = 6, tearY = 0, tearH = 0, tearX = 0;
    const paintPicture = (tt, mix, roll, black) => {
      picG.save();
      picG.fillStyle = '#000'; picG.fillRect(0, 0, GUIDE.W, GUIDE.H);
      if (black < 1) {
        picG.globalAlpha = 1 - black;
        if (mix < 1) {
          const oy = ((roll % 1) + 1) % 1 * GUIDE.H;
          picG.drawImage(guideC, 0, oy - GUIDE.H); picG.drawImage(guideC, 0, oy);
          if (roll) { picG.fillStyle = 'rgba(0,0,0,0.85)'; picG.fillRect(0, oy - 22, GUIDE.W, 40); }
        }
        if (mix > 0) {
          picG.globalAlpha = (1 - black) * mix;
          picG.imageSmoothingEnabled = false;
          picG.drawImage(snow.canvas, 0, 0, GUIDE.W, GUIDE.H);
          picG.imageSmoothingEnabled = true;
        }
        picG.globalAlpha = 1;
        if (tt < tearUntil && mix < 0.5) {
          const sl = picG.getImageData(0, tearY, GUIDE.W, tearH);
          picG.putImageData(sl, tearX, tearY);
          picG.globalCompositeOperation = 'lighter';
          picG.fillStyle = 'rgba(224,36,47,0.35)'; picG.fillRect(0, tearY, GUIDE.W, 4);
          picG.fillStyle = 'rgba(40,220,90,0.28)'; picG.fillRect(0, tearY + tearH - 4, GUIDE.W, 4);
          picG.globalCompositeOperation = 'source-over';
        }
      }
      picG.drawImage(over, 0, 0);
      picG.restore();
      picTex.needsUpdate = true;
      picDirty = false;
    };

    const tick = () => {
      const st = (hand.length && hooks.status && hooks.status()) || sample();
      const d = new Date(), hh = d.getHours(), mm = d.getMinutes();
      const hm = `${((hh + 11) % 12) + 1}:${String(mm).padStart(2, '0')}`;
      phoneEl.querySelectorAll('.r3t-ph-clock, .r3t-ph-big').forEach(n => put(n, hm));
      put(phoneEl.querySelector('.r3t-ph-day'), d.toLocaleDateString(undefined, { weekday: 'long', month: 'long', day: 'numeric' }));
      put(phoneEl.querySelector('.r3t-ph-ready'), `${st.ready} ready${st.value > 0 ? ` · ~$${st.value.toFixed(2)}` : ''}`);
      put(phoneEl.querySelector('.r3t-ph-next'), st.next ? `Next comes ready in ${K.fmtLeft(st.next)}` : `All caught up · ${st.done} done today`);
      cards.forEach((c, i) => {
        const now = hooks.cardState ? hooks.cardState(c.id) : null;
        const rem = now ? now.remaining : (c.remaining || 0);
        const el = screenEl.querySelector(`[data-st="${CSS.escape(c.id)}"]`);
        put(el, rem > 0 ? `, comes ready in ${K.fmtLeft(rem)}` : ', ready');
        void i;
      });
      if (redrawGuide() && !running) { update(tNow); show(); }
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
    // (a listing's middle on the picture: GUIDE.row0 down, GUIDE.rowH each)
    const rowAt = (id, out) => {
      const i = cards.findIndex(c => c.id === id);
      const y = PIC.y + SCREEN.h / 2 - (GUIDE.row0 + GUIDE.rowH * i + (GUIDE.rowH - 12) / 2) / SCREEN.px;
      return out.copy(toWorld(V(0, y, SCREEN_Z - 0.2)));
    };
    const chanOf = id => signal.chans.find(m => m.userData.id === id);
    const _p0 = V(0, 0, 0), _p1 = V(0, 0, 0), _q1 = new THREE.Quaternion(), flipQ = new THREE.Quaternion();
    const poseCard = tt => {
      if (!cardId) { if (cardEl.style.visibility !== 'hidden') cardEl.style.visibility = 'hidden'; return; }
      lift = fo.reduced ? liftTo : lerp(liftFrom, liftTo, smoother((tt - liftT0) / T.lift));
      if (lift <= 0.001 && liftTo === 0) { cardId = null; cardEl.style.visibility = 'hidden'; hideInfo(); return; }
      const inside = dive() >= CUT;
      const C = inside ? chanOf(cardId) : null;
      if (C) C.getWorldPosition(_p0); else rowAt(cardId, _p0);
      const d = focusPose(_p1, _q1);
      const k = lift;
      pw.copy(_p0).lerp(_p1, k);
      pw.addScaledVector(V(0, 1, 0).applyQuaternion(camera.quaternion), Math.sin(Math.PI * k) * 0.06 * d);
      flipQ.setFromAxisAngle(V(0, 1, 0), Math.PI * (1 - smoother(clamp01((k - 0.15) / 0.7))));
      qw.copy(_q1).multiply(flipQ);
      const from = inside ? (CHAN.w / 4) / K.CARD.h : ((GUIDE.rowH - 12) / SCREEN.px) / K.CARD.h;
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
    let tNow = 0, arrived = false, snowT = 0, focusOut = false, focusBack = false, spiritT = 0, picT = 0, wasMoving = false, picKey = '';
    const flyEye = V(0, 0, 0), qTable = new THREE.Quaternion(), qSeat = new THREE.Quaternion(), camQ = new THREE.Quaternion();
    const placeCamera = tt => {
      camera.up.copy(up);
      camera.far = 30000;
      const s = way;
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
      } else if (s < W.lean0) {
        const b = basePose();
        camera.position.copy(toWorld(b.eye)); camera.quaternion.copy(b.q); camera.fov = b.fov; camera.near = near0;
      } else if (s < W.cut) {
        const L = leanAt((s - W.lean0) / W.lean);
        const b = basePose();
        camera.position.copy(L.p);
        camera.quaternion.copy(b.q).slerp(hover.q, L.s);
        camera.fov = lerp(b.fov, hover.fov, L.s);
        camera.near = lerp(near0, 0.5, L.s);
      } else {
        // the signal: from the snow across the lens out to where you stop,
        // turning to the spirit as you come
        const u = smoother((s - W.cut) / W.drift);
        camera.position.copy(insEye0).lerp(insEye1, u);
        camera.quaternion.copy(qIn0).slerp(qIn1, smoother((s - W.cut) / W.drift * 1.2));
        camera.fov = lerp(sv.fov, sv.fov + 6, u);
        camera.near = 2; camera.far = 30000;
      }
      camera.updateProjectionMatrix();
      camera.updateMatrixWorld();
    };
    // (the dial: where it points at second s of the way - on channel 2, then
    // a click at a time round to U, each click a quick turn, a small
    // overshoot past the detent and back)
    const STEP = Math.PI * 2 / DETENTS.length;
    const dialAt = s => {
      const u = clamp01((s - W.tune0) / W.dial);
      if (u <= 0) return { a: 0, click: -1, f: 0 };
      // (quicker in the middle of the run of clicks, slower at each end)
      const n = DETENTS.length - 1, x = n * (u < 0.5 ? 2 * u * u : 1 - Math.pow(-2 * u + 2, 2) / 2);
      const c = Math.min(n, Math.floor(x)), f = c >= n ? 1 : x - c;
      const snap = f < 0.45 ? smoother(f / 0.45) * 1.12 : 1.12 - 0.12 * smoother((f - 0.45) / 0.55);
      return { a: (c + (c >= n ? 1 : snap)) * STEP - (c >= n ? STEP : 0), click: c, f };
    };
    const _w = V(0, 0, 0), _m = V(0, 0, 0), _c = V(0, 0, 0), _seatInv = new THREE.Matrix4();
    const update = tt => {
      tNow = tt;
      // the way through: its clock
      if (way !== wayTo && tt >= wayDelay) {
        if (fo.reduced) way = wayTo;
        else {
          const dur = wayTo > wayFrom ? (wayTo - wayFrom) : (wayFrom - wayTo) * T.back / W.all;
          const u = clamp01((tt - wayT0) / Math.max(dur, 1e-3));
          way = lerp(wayFrom, wayTo, u);
          if (u >= 1) way = wayTo;
        }
      }
      const s = way;
      // the lights: each out at its beat on the way in; back up one by one
      // on the way back (in the same order, as the clock runs back past it)
      cups.cups.forEach((c, i) => {
        const t0 = outAt(i), on = s <= t0 ? 1 : 0;
        const target = fo.reduced ? on : (wayTo > 0 ? clamp01(1 - (s - t0) / 0.14) : clamp01(1 - (s - t0) / 0.3));
        lit[i] = target;
        // the smoke: a thread climbing and opening out, then gone; the
        // wick's ember dimming (on the way in only, timed from the snuff)
        const age = fo.reduced || wayTo === 0 || s < t0 ? -1 : s - t0;
        const sm = age < 0 || age > 4 ? 0 : smoother(age / 0.25) * (1 - smoother((age - 1.2) / 2.8));
        c.smoke.visible = sm > 0.002;
        if (c.smoke.visible) {
          c.smokeMat.opacity = 0.5 * sm;
          c.smoke.scale.set(0.8 + age * 0.15, smoother(age / 1.6) * 0.9 + 0.1, 1);
          c.smokeMat.map.offset.y = -age * 0.22;
          c.smokeMat.map.offset.x = Math.sin(age * 1.7 + c.ph) * 0.03;
        }
        c.emb.material.opacity = age < 0 ? 0 : 0.9 * (1 - smoother(age / 1.8));
      });
      lightsUp(tt, fo.reduced);
      // leaning in over the picture, and sitting back
      if (focus !== focusTo) {
        const u = fo.reduced ? 1 : clamp01((tt - focusT0) / T.focus);
        focus = lerp(focusFrom, focusTo, u);
        if (u >= 1) focus = focusTo;
      }
      placeCamera(tt);
      placeSnuffer(s);
      // the dial
      const dial = dialAt(s);
      tv.vhf.rotation.z = dial.a;
      world.stage(introT0 + tt);
      const kf = fo.reduced ? 1 : clamp01(tt / 0.9);
      world.lights.lensLight.intensity = lens0 * (1 - kf);
      world.lights.rim.intensity *= 1 - 0.6 * kf;
      const kh = fo.reduced ? 1 : smoother((tt - FLY * 0.3) / (FLY * 0.45));
      house.forEach(([l, i0]) => { l.intensity = i0 * (1 - 0.85 * kh); });
      scene.environmentIntensity = env0 * (1 - 0.9 * kh);
      if (world.bloom) world.bloom.strength = fo.reduced ? 0 : lerp(bloom0, 0.38, kf);
      // the picture: snow as you come in; tuned in as you sit; on the way
      // through, black between clicks and rolling, then snow at the dead
      // detent, and snow as you lean through it
      const tuned = tt < FLY ? 0 : smoother((tt - FLY) / TUNE);
      const tuning = s > W.tune0 && s < W.tune0 + W.dial;
      const atDead = s >= W.tune0 + W.dial * 0.98;
      let mix = Math.max(1 - tuned, atDead ? 1 : 0), roll = 0, black = 0;
      if (tuning && !atDead) {
        mix = Math.max(mix, smoother(dial.click / (DETENTS.length - 2)) * 0.85);
        black = dial.f < 0.3 ? 0.55 * (1 - dial.f / 0.3) : 0;
        roll = dial.click >= 0 ? (dial.click * 0.37 + dial.f * 0.6) : 0;
      }
      tube = 0.45 + 0.55 * Math.max(mix, 0.2) * (1 - black);
      pictureMat.color.setScalar(lerp(0.15, 1, Math.max(tuned, mix)) * (1 - 0.7 * black));
      picture.visible = s < W.cut;
      tv.glassMat.opacity = 0.35 * (1 - smoother(((s - W.lean0) / W.lean - 0.5) / 0.4));
      const inside = s >= W.cut;
      // (the picture is redrawn a field at a time while it moves; the tear
      // comes every so often while the guide is up)
      const moving = !fo.reduced && (mix > 0.02 || roll || black || tt < tearUntil);
      if (!fo.reduced && !fo.manual && mix < 0.02 && tt > tearNext && arrived) { tearUntil = tt + 0.16; tearNext = tt + 5 + Math.random() * 6; tearY = 120 + Math.random() * 440; tearH = 26 + Math.random() * 40; tearX = (Math.random() < 0.5 ? -1 : 1) * (14 + Math.random() * 26); }
      const pk = `${mix > 0.02 ? 1 : 0}|${roll.toFixed(2)}|${black.toFixed(2)}|${tt < tearUntil ? 1 : 0}`;
      if ((moving && (tt - picT > 1 / 24 || fo.manual)) || picDirty || (wasMoving && !moving) || pk !== picKey) {
        picKey = pk;
        if (mix > 0.02 && !fo.reduced) { snow.draw(1, Math.floor((tt * 40) % 180)); snowTex.needsUpdate = true; }
        picT = tt;
        paintPicture(tt, fo.reduced && mix < 0.5 ? 0 : mix, roll, black);
      }
      wasMoving = moving;
      if (inside && !fo.reduced && tt - snowT > 1 / 24) { snowT = tt; snow.draw(1, Math.floor((tt * 40) % 180)); snowTex.needsUpdate = true; }
      // the glints: each flame where the bowed glass mirrors it to you
      // (a plane's mirror, pulled in toward the middle as a convex face
      // shows it)
      _seatInv.copy(seat.matrixWorld).invert();
      _c.copy(camera.position).applyMatrix4(_seatInv);
      cups.cups.forEach((c, i) => {
        const g = glints[i];
        if (inside || lit[i] < 0.05) { g.material.opacity = 0; return; }
        _w.set(CUPS[i][0], c.top + 1.4, CUPS[i][1]);
        _m.set(_w.x, _w.y, 2 * SCREEN_Z - _w.z);
        const k = (SCREEN_Z - _c.z) / (_m.z - _c.z);
        if (!(k > 0 && k < 1)) { g.material.opacity = 0; return; }
        const rx = _c.x + (_m.x - _c.x) * k, ry = _c.y + (_m.y - _c.y) * k;
        const gx = rx * 0.45, gy = PIC.y + (ry - PIC.y) * 0.45;
        if (Math.abs(gx) > SCREEN.w / 2 - 2.2 || Math.abs(gy - PIC.y) > SCREEN.h / 2 - 2.2) { g.material.opacity = 0; return; }
        g.position.set(gx, gy, SCREEN_Z - 0.25);
        g.material.opacity = 0.3 * lit[i] * (c.light.intensity / 260 || 0);
      });
      // the streaks: on each cup, where the half-way between the screen and
      // you meets the glass (on the side toward both)
      cups.cups.forEach((c, i) => {
        const m = streaks[i];
        if (inside) { m.material.opacity = 0; return; }
        const cx = CUPS[i][0], cz = CUPS[i][1];
        const vx = _c.x - cx, vz = _c.z - cz, lx = 0 - cx, lz = SCREEN_Z - cz;
        const vl = Math.hypot(vx, vz), ll = Math.hypot(lx, lz);
        let hx = vx / vl + lx / ll, hz = vz / vl + lz / ll; const hl = Math.hypot(hx, hz) || 1; hx /= hl; hz /= hl;
        const r = CUP.r1 - 0.12;
        m.position.set(hx * r, CUP.h * 0.52, hz * r);
        m.rotation.y = Math.atan2(vx, vz);
        m.material.opacity = 0.32 * tube * clamp01(hx * vx / vl + hz * vz / vl);
      });
      // the signal: the snow across the lens thinning as you move
      veil.visible = inside && s < W.cut + W.drift * 0.25;
      if (veil.visible) {
        const d = camera.near * 2, t = Math.tan(camera.fov * DEG / 2);
        veil.position.set(0, 0, -d); veil.scale.set(2 * d * t * aspect * 1.02, 2 * d * t * 1.02, 1);
        veilMat.opacity = 1 - smoother((s - W.cut) / (W.drift * 0.25));
      }
      if (inside && !fo.reduced) {
        const P = signal.snowP, sp = 140 * (1 / 60);
        for (let i = 2; i < P.length; i += 3) { P[i] -= sp; if (P[i] < 0) P[i] += 3200; }
        signal.snow.geometry.attributes.position.needsUpdate = true;
        signal.chans.forEach(m => { const b = m.userData.base; m.position.set(b.x + Math.sin(tt * 0.3 + m.userData.ph) * 18, b.y + Math.sin(tt * 0.45 + m.userData.ph * 2) * 14, b.z); });
        signal.spiritMesh.position.y = SIGNAL.spiritY + Math.sin(tt * 0.35) * 10;
      }
      // the smoke faces you
      cups.cups.forEach(c => { if (c.smoke.visible) { c.g.getWorldPosition(_w); c.smoke.rotation.y = Math.atan2(camera.position.x - _w.x, camera.position.z - _w.z) - seat.rotation.y; } });
      poseCard(tt);
      // the page's buttons over the picture: there while the set is tuned
      // in and you are not on the way through
      const uiK = tuned * (s > 0 ? 0 : 1);
      screenEl.style.visibility = uiK <= 0.001 ? 'hidden' : '';
      screenEl.classList.toggle('r3d-far', focusTo !== 1);
      const outOn = s >= W.all - 1e-3 && wayTo === W.all;
      const backOn = focus >= 0.999 && focusTo === 1 && s <= 0 && wayTo === 0;
      outEl.classList.toggle('r3d-on', outOn);
      backEl.classList.toggle('r3d-on', backOn);
      if (outOn && focusOut) { focusOut = false; outEl.focus({ preventScroll: true }); }
      if (backOn && focusBack) { focusBack = false; backEl.focus({ preventScroll: true }); }
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

    // ---- The loop: runs while anything moves (the flames, the snow and
    // the smoke always do, unless motion is off), then holds the frame.
    let running = false, raf = 0, last = 0, woke = 0, disposed = false;
    const pacer = world.pacer ? world.pacer() : null;
    const busy = () => !fo.reduced || tNow < FLY + TUNE + UI_IN + 0.1 || way !== wayTo || focus !== focusTo || (cardId && Math.abs(lift - liftTo) > 1e-3);
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

    // ---- Leaning in over the picture, and sitting back.
    const setFocus = on => {
      const to = on ? 1 : 0;
      if (focusTo === to || wayTo !== 0 || way > 0) return;
      if (!on) putBack();
      focusBack = on;
      focusFrom = focus; focusTo = to; focusT0 = tNow;
      redrawGuide();
      wake();
    };
    // ---- Through the glass, and back. (From over the picture you sit back
    // first, so you see the round.)
    const goInside = on => {
      const to = on ? W.all : 0;
      if (wayTo === to) return;
      if (on) paintSpirit();
      putBack();
      let delay = 0;
      if (on && focus > 0) { focusFrom = focus; focusTo = 0; focusT0 = tNow; delay = fo.reduced ? 0 : T.focus * focus; }
      wayFrom = way; wayTo = to; wayT0 = tNow + delay; wayDelay = tNow + delay;
      focusOut = on; focusBack = false;
      redrawGuide();
      wake();
    };

    // ---- Touch: a channel in the signal (its card); the dial from the
    // chair (the way through); a tap off the picture while leaning in sits
    // you back. On the picture, the page's own buttons take their taps.
    const ray = new THREE.Raycaster(), ndc = new THREE.Vector2();
    const rayAt = e => {
      const r = css.domElement.getBoundingClientRect();
      ndc.set(((e.clientX - r.left) / r.width) * 2 - 1, -((e.clientY - r.top) / r.height) * 2 + 1);
      ray.setFromCamera(ndc, camera);
    };
    const hitChan = e => {
      rayAt(e);
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
    const hitDial = e => {
      rayAt(e);
      tv.vhfHit.getWorldPosition(pw);
      return ray.ray.distanceToPoint(pw) < 5.5;
    };
    // (a tap that brings a card up out of the signal leaves the card under
    // the finger: the click that follows it is that tap's, not a tap on
    // the card)
    let press = null, swallowClick = false;
    const onStage = e => { const st = world.canvas.parentElement; return !!(st && e.target && st.contains(e.target)); };
    const onDown = e => {
      if (tNow < FLY || e.button > 0 || !onStage(e)) return;
      if (e.target.closest && e.target.closest('.r3d-screen, .r3t-info, .r3t-phone, .r3d-out, .r3t-card')) return;
      press = { id: e.pointerId, x: e.clientX, y: e.clientY, moved: 0 };
      swallowClick = false;
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
      if (way >= W.all - 1e-3 && wayTo === W.all) { const h = hitChan(e); if (h && h.id) { swallowClick = true; takeCard(h.id); } return; }
      if (way > 0 || wayTo !== 0) return;
      if (hitDial(e)) { goInside(true); return; }
      if (focusTo === 1) setFocus(false);
    };
    window.addEventListener('pointerdown', onDown, true);
    window.addEventListener('pointermove', onMove, true);
    window.addEventListener('pointerup', onUp, true);
    const onCancel = () => { press = null; };
    window.addEventListener('pointercancel', onCancel, true);
    css.domElement.addEventListener('click', e => {
      if (swallowClick) { swallowClick = false; if (e.target.closest('.r3t-card')) return; }
      const act = e.target.closest('.r3t-info [data-act]');
      if (act) { const id = cardId; putBack(); if (hooks.cardAction && id) hooks.cardAction(id, act.dataset.act); tick(); return; }
      if (e.target.closest('.r3t-info-x')) { putBack(); return; }
      if (e.target.closest('.r3t-card')) { putBack(); return; }
      if (e.target.closest('.r3d-back')) { setFocus(false); return; }
      if (e.target.closest('.r3d-out')) { goInside(false); return; }
      // (from the chair, a tap anywhere on the picture leans you in; a
      // keyboard's Enter on a button there does what the button says)
      const onScreen = e.target.closest('.r3d-screen');
      if (onScreen && focusTo !== 1 && e.detail !== 0) { setFocus(true); return; }
      const row = e.target.closest('.r3d-row[data-id]');
      if (row) { if (cardId === row.dataset.id && liftTo) putBack(); else takeCard(row.dataset.id); return; }
      if (e.target.closest('.r3d-run')) { if (hooks.run) hooks.run(); return; }
      if (e.target.closest('.r3d-look')) { goInside(true); return; }
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
      else if (wayTo === W.all) goInside(false);
      else if (focusTo === 1) setFocus(false);
    };
    css.domElement.addEventListener('keydown', onKey);
    const onResize = () => {
      aspect = size();
      sv = seatView(); E1 = toWorld(sv.eye); A1 = toWorld(sv.aim);
      setHover();
      update(tNow); show();
    };
    window.addEventListener('resize', onResize);

    redrawGuide();
    tick();
    const clock = setInterval(tick, 1000);
    update(0);
    if (fo.manual) world.rest(draw);
    else { draw(); running = true; raf = requestAnimationFrame(loop); }

    return {
      dest: 'seance',
      duration: FLY,
      get t() { return tNow; },
      seek(t) { tNow = t; if (way !== wayTo) way = wayTo; if (focus !== focusTo) focus = focusTo; update(t); show(); },
      lean(on = true) { setFocus(on); },
      focusAt(k) { focus = focusTo = focusFrom = k; redrawGuide(); update(tNow); show(); },
      inside(on = true) { goInside(on); },
      // (the way through at a point: k of it (0 - 1), or s seconds in)
      diveAt(k) { if (k > 0) paintSpirit(); way = wayTo = wayFrom = k * W.all; wayDelay = 0; update(tNow); show(); },
      wayAt(s, back = false) { if (s > 0) paintSpirit(); wayFrom = way = s; wayTo = back ? 0 : W.all; wayT0 = Infinity; wayDelay = Infinity; update(tNow); show(); },
      timing: Object.assign({}, W, { outAt: CUPS.map((_, i) => outAt(i)) }),
      takeCard(id) { takeCard(id || cards[0].id); },
      putBack,
      pickUpPhone(on = true) { holdPhone(on); },
      tear(on = true) { tearUntil = on ? tNow + 10 : -1; tearY = 260; tearH = 48; tearX = 26; picDirty = true; update(tNow); show(); },
      rows: cards.map(c => c.id),
      look(eye, aim, fov) {
        if (!eye) { update(tNow); show(); return; }
        camera.position.copy(toWorld(V(...eye))); lookQ(camera.position, toWorld(V(...aim)), camera.quaternion);
        camera.fov = fov || camera.fov; camera.near = 0.5; camera.updateProjectionMatrix(); camera.updateMatrixWorld();
        world.rest(draw);
      },
      screenOf(id) {
        const r = css.domElement.getBoundingClientRect();
        if (id === 'run' || id === 'look' || id === 'back' || id === 'out') {
          const el = id === 'back' ? backEl : id === 'out' ? outEl : screenEl.querySelector(id === 'run' ? '.r3d-run' : '.r3d-look');
          if (!el) return null; const b = el.getBoundingClientRect(); return { x: b.left + b.width / 2, y: b.top + b.height / 2 };
        }
        if (id === 'dial') { const p = tv.vhfHit.getWorldPosition(V(0, 0, 0)).project(camera); return { x: r.left + (p.x + 1) / 2 * r.width, y: r.top + (1 - p.y) / 2 * r.height }; }
        if (id === 'screen') { const p = toWorld(PIC).project(camera); return { x: r.left + (p.x + 1) / 2 * r.width, y: r.top + (1 - p.y) / 2 * r.height }; }
        if (way >= W.cut) { const m = chanOf(id); if (!m) return null; const p = m.getWorldPosition(V(0, 0, 0)).project(camera); return { x: r.left + (p.x + 1) / 2 * r.width, y: r.top + (1 - p.y) / 2 * r.height }; }
        const el = screenEl.querySelector(`.r3d-row[data-id="${CSS.escape(id)}"]`); if (!el) return null;
        const b = el.getBoundingClientRect(); return { x: b.left + b.width / 2, y: b.top + b.height / 2 };
      },
      get state() { return { focus: +focus.toFixed(3), focusTo, way: +way.toFixed(3), wayTo, dive: +dive().toFixed(3), lit: lit.map(v => +v.toFixed(2)), card: cardId, lift: +lift.toFixed(3), running }; },
      get programs() { return world.renderer.info.programs.length; },
      // (the lab: turn one light off - 'key', 'tube', 'cups', 'house', 'env'
      // - to see what each one does; the next frame puts it back)
      without(name) {
        update(tNow);
        if (name === 'key') key.intensity = 0;
        if (name === 'tube') tubeLight.intensity = 0;
        if (name === 'cups') cups.cups.forEach(c => { c.light.intensity = 0; });
        if (name === 'house') { house.forEach(([l]) => { l.intensity = 0; }); scene.traverse(x => { if (x.isSpotLight && !seat.getObjectById(x.id)) x.intensity = 0; }); }
        if (name === 'env') scene.environmentIntensity = 0;   // (the next frame puts it back)
        world.rest(draw);
      },
      layer(name, on) { const m = { set: tv.group, table: table.group, cups: cups.group, snuffer: snuffer.group, drapes: drapes.group, signal: signal.group, picture }[name]; if (m) { m.visible = !!on; show(); } },
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
        scene.environmentIntensity = env0;
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
      snowTex.dispose(); picTex.dispose();
    }
  };
}
