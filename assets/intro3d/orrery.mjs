// THE ORRERY: Obsidian Ledger's instrument (three.js).
//
// A Georgian table orrery, finished like one off a London instrument
// maker's bench: a gilt sun on a turned brass pillar; from collars stacked
// down the pillar, flat lacquered-brass arms, each ending in a short post
// that holds a planet; round every planet's path a hoop of brass wire; and
// round them all the ecliptic band, a flat brass ring engraved with the
// degree scale and the twelve signs. Each planet is one of your platforms:
// a turned boxwood ball painted in its colour (the same pigment as the
// deck's planets), varnished, its initials painted on, a thin brass ring on
// two pins round it.
//
// Held at three distances: across the room, the silhouette - a bright sun,
// ellipses of fine wire, the beads on them, one broad band; at arm's
// length, the materials - lacquered brass (a hard clear coat over a warm
// metal, so a crisp highlight over a soft one), painted wood (matte under a
// thin varnish), the arms' flat faces and their darker edges; pinched in
// 3x, the engraving on the band (every degree, a longer cut every five and
// ten, the signs' names), the turning rings in the wood, the ring's pins.
// The one key light is the app's (above left, in front of the glass); the
// brass mirrors the same studio as the landing's (studioEnvironment).
//
// buildOrrery() makes the instrument at any size, for anywhere it is used:
// the Lounge's payout here, and the room it will stand in at Showroom.
// createBreakout() is the payout: when a Daily Run is finished, the
// orrery comes out of the phone. The ready count's plate is the top of its
// pillar: the count clears, the sun rises out of the plate and through the
// glass, the arms run out from the pillar with the hoops opening round
// them, and the crank turns the train - the inner planets quick, the outer
// ones slow, as the gearing makes them - then runs down to a stop with the
// gears' backlash. The instrument's plane is tipped toward you, so each
// hoop and the band cross the glass: their near halves are in front of it,
// over the deck, dropping shadows on it; their far halves are behind it,
// under the deck, seen only between the cards (the scene is drawn twice,
// cut at the glass: behind, into a canvas under the app; in front, into
// one over it). It rests there, still, until the next touch, which folds it
// back into the plate.
//
// Units are CSS pixels, the glass is the plane z = 0 and the camera looks
// at it from in front, placed so the glass is drawn at 1:1 - a point on the
// glass lands on the page pixel under it.

import * as THREE from '../vendor/three/three.module.js';
import { studioEnvironment } from './intro.mjs';

const DEG = Math.PI / 180;
const clamp01 = x => Math.min(Math.max(x, 0), 1);
const smooth = x => { x = clamp01(x); return x * x * (3 - 2 * x); };
const smoother = x => { x = clamp01(x); return x * x * x * (x * (6 * x - 15) + 10); };
const lerp = (a, b, k) => a + (b - a) * k;
// out, a touch past and back: a servo's settle (over: how far past, as a share)
const settle = (u, over = 0.06) => {
  u = clamp01(u);
  const c1 = over * 16, c3 = c1 + 1, v = u - 1;
  return 1 + c3 * v * v * v + c1 * v * v;
};

// The key light (the app's): above left, in front of the glass. Screen y
// runs down, the scene's up.
const LIGHT = new THREE.Vector3(-0.30, 0.42, 0.86).normalize();

// The instrument's gearing: each planet's turns for one of the Earth's
// (Mercury, Venus, Earth, Mars, Jupiter, Saturn, Uranus - as a Georgian
// maker cut them, rounded).
const RATIO = [4.15, 1.62, 1, 0.53, 0.084, 0.034, 0.012];
const SIGNS = ['ARIES', 'TAURUS', 'GEMINI', 'CANCER', 'LEO', 'VIRGO', 'LIBRA', 'SCORPIO', 'SAGITTARIUS', 'CAPRICORN', 'AQUARIUS', 'PISCES'];

// ------------------------------------------------------------ materials
// (each instrument its own: the breakout cuts its materials at the glass,
// which must never reach an instrument standing anywhere else)
function materials() {
  // Lacquered brass: the metal warm and a little rough, the lacquer over it
  // hard and clear - two highlights, a soft one and a crisp one.
  const brass = new THREE.MeshPhysicalMaterial({ color: 0xc19a62, metalness: 1, roughness: 0.34, clearcoat: 0.85, clearcoatRoughness: 0.1 });
  // the arms' flats catch the light; their edges and the wire are a
  // shade darker (turned, not polished)
  const brassDark = new THREE.MeshPhysicalMaterial({ color: 0x9b7746, metalness: 1, roughness: 0.42, clearcoat: 0.6, clearcoatRoughness: 0.18 });
  // Gilt: the sun, water-gilded and burnished - brighter and smoother.
  const gilt = new THREE.MeshPhysicalMaterial({ color: 0xf0cc86, metalness: 1, roughness: 0.16, clearcoat: 1, clearcoatRoughness: 0.05 });
  return { brass, brassDark, gilt };
}

// ------------------------------------------------------------ textures
function canvasTex(w, h, paint, color = true) {
  const c = document.createElement('canvas');
  c.width = w; c.height = h;
  paint(c.getContext('2d'), w, h);
  const t = new THREE.CanvasTexture(c);
  if (color) t.colorSpace = THREE.SRGBColorSpace;
  t.anisotropy = 8;
  return t;
}
// A planet's paint: its hue greyed to a pigment under a warm varnish (the
// deck's planets, app.css), the rings the lathe left round its axis, and
// its initials painted on the side that faces you (u = 0.25 is the
// sphere's +z).
function planetTex(p) {
  return canvasTex(512, 256, (g, w, h) => {
    const hue = p.hue == null ? 30 : p.hue;
    g.fillStyle = `hsl(${hue} 17% 44%)`;
    g.fillRect(0, 0, w, h);
    g.fillStyle = 'rgba(176,141,87,0.14)';
    g.fillRect(0, 0, w, h);
    // turning rings: fine bands of darker and lighter grain round the axis
    for (let y = 0; y < h; y += 2) {
      const k = Math.sin(y * 0.23) * 0.5 + Math.sin(y * 0.071 + 1.3) * 0.5;
      g.fillStyle = k > 0 ? `rgba(255,240,210,${(k * 0.05).toFixed(3)})` : `rgba(20,12,4,${(-k * 0.08).toFixed(3)})`;
      g.fillRect(0, y, w, 1);
    }
    const txt = (p.initials || '?').slice(0, 2);
    g.font = '600 64px Cinzel, Georgia, serif';
    g.textAlign = 'center'; g.textBaseline = 'middle';
    // (a painted letter: a hair of shadow where the paint stands proud)
    g.fillStyle = 'rgba(0,0,0,0.35)';
    g.fillText(txt, w * 0.25 + 1.5, h * 0.5 + 2);
    g.fillStyle = '#EFE7D6';
    g.fillText(txt, w * 0.25, h * 0.5);
  });
}
// The ecliptic band's engraving, drawn round the annulus it is laid on:
// a cut for every degree, longer every five and ten, the signs' names
// between their boundaries, and two border lines. Returned as a colour map
// (the cuts darkened, the metal between left as it is) and a bump map (the
// cuts sunk).
function bandTex(size, r0, r1) {
  const draw = (g, w, h, bump) => {
    const cx = w / 2, cy = h / 2, s = w / (2 * r1);
    g.fillStyle = bump ? '#fff' : '#c7a26a';
    g.fillRect(0, 0, w, h);
    const cut = bump ? '#000' : 'rgba(40,24,8,0.85)';
    g.strokeStyle = cut; g.fillStyle = cut;
    const ring = r => { g.beginPath(); g.arc(cx, cy, r * s, 0, Math.PI * 2); g.stroke(); };
    g.lineWidth = Math.max(1, 1.1 * s);
    ring(r0 + 1.2); ring(r1 - 1.2);
    g.lineWidth = Math.max(1, 0.7 * s);
    const w0 = r1 - r0;
    ring(r0 + w0 * 0.42);
    for (let d = 0; d < 360; d++) {
      const a = d * DEG;
      const long = d % 10 === 0 ? 0.3 : d % 5 === 0 ? 0.2 : 0.12;
      const ra = r0 + w0 * 0.42, rb = ra - w0 * long * 1.2;
      g.beginPath();
      g.moveTo(cx + Math.cos(a) * ra * s, cy + Math.sin(a) * ra * s);
      g.lineTo(cx + Math.cos(a) * rb * s, cy + Math.sin(a) * rb * s);
      g.stroke();
    }
    // the signs, set round the outer half of the band
    g.font = `600 ${Math.round(w0 * 0.32 * s)}px Cinzel, Georgia, serif`;
    g.textAlign = 'center'; g.textBaseline = 'middle';
    const rt = r0 + w0 * 0.72;
    SIGNS.forEach((name, i) => {
      const mid = (i * 30 + 15) * DEG;
      g.save();
      g.translate(cx + Math.cos(mid) * rt * s, cy + Math.sin(mid) * rt * s);
      g.rotate(mid + Math.PI / 2);
      g.fillText(name, 0, 0);
      g.restore();
      // the boundary between signs, cut across the band
      const b = i * 30 * DEG;
      g.beginPath();
      g.moveTo(cx + Math.cos(b) * (r0 + w0 * 0.44) * s, cy + Math.sin(b) * (r0 + w0 * 0.44) * s);
      g.lineTo(cx + Math.cos(b) * (r1 - 1.4) * s, cy + Math.sin(b) * (r1 - 1.4) * s);
      g.stroke();
    });
  };
  return {
    map: canvasTex(size, size, (g, w, h) => draw(g, w, h, false)),
    bump: canvasTex(size, size, (g, w, h) => draw(g, w, h, true), false)
  };
}

// ------------------------------------------------------------ the dome's chart
// The glass dome over the instrument on a desk is engraved as a celestial
// chart: a planisphere, the north pole at its crown and the rim at
// declination -45, so the sky is seen as it is from inside (and mirrored,
// as a celestial globe's is, from outside). Stars cut as frosted dots, the
// brighter ones larger; the figures of the constellations every almanac
// printed; the equator, the ecliptic, the hour circles and a few parallels.
// Drawn once, as an alpha map: white where the glass is cut.
// ([RA hours, Dec degrees, size 1-3] - a few of the brightest named)
const STARS = {
  UMa: [[11.06, 61.75, 2], [11.03, 56.38, 2], [11.9, 53.7, 2], [12.26, 57.03, 1], [12.9, 55.96, 2], [13.4, 54.93, 2], [13.79, 49.31, 2]],
  Cas: [[0.15, 59.15, 2], [0.68, 56.54, 2], [0.95, 60.72, 2], [1.43, 60.24, 2], [1.91, 63.67, 1]],
  Ori: [[5.92, 7.41, 3], [5.42, 6.35, 2], [5.53, -0.3, 2], [5.6, -1.2, 2], [5.68, -1.94, 2], [5.8, -9.67, 2], [5.24, -8.2, 3], [5.59, 9.93, 1]],
  Cyg: [[20.69, 45.28, 3], [20.37, 40.26, 2], [20.77, 33.97, 2], [19.75, 45.13, 1], [19.51, 27.96, 2]],
  Lyr: [[18.62, 38.78, 3], [18.75, 37.6, 1], [18.83, 33.36, 1], [18.98, 32.69, 1], [18.9, 36.9, 1]],
  Leo: [[10.14, 11.97, 3], [10.12, 16.76, 1], [10.33, 19.84, 2], [10.28, 23.42, 1], [9.88, 26.0, 1], [11.24, 20.52, 2], [11.82, 14.57, 2], [11.24, 15.43, 1]],
  Sco: [[16.09, -19.8, 2], [16.0, -22.62, 2], [15.98, -26.1, 1], [16.49, -26.43, 3], [16.6, -28.2, 1], [16.84, -34.29, 2], [16.86, -38.05, 1], [16.9, -42.36, 1], [17.2, -43.24, 1], [17.62, -43.0, 2], [17.79, -40.13, 1], [17.71, -39.03, 1], [17.56, -37.1, 2]],
  Gem: [[7.58, 31.89, 3], [7.76, 28.03, 3], [6.63, 16.4, 2], [7.34, 21.98, 1], [6.38, 22.51, 1], [7.07, 20.57, 1]],
  Tau: [[4.6, 16.5, 3], [4.33, 15.63, 1], [4.48, 15.87, 1], [4.38, 17.54, 1], [5.44, 28.61, 2], [5.63, 21.14, 1]],
  Aql: [[19.85, 8.87, 3], [19.77, 10.61, 1], [19.92, 6.41, 1], [19.09, 13.86, 1], [19.1, -4.88, 1]],
  Boo: [[14.26, 19.18, 3], [14.75, 27.07, 2], [15.03, 40.39, 1], [14.53, 38.31, 1], [14.53, 30.37, 1]],
  Per: [[3.41, 49.86, 3], [3.14, 40.96, 2], [3.72, 47.79, 1], [3.96, 40.01, 1], [3.08, 53.51, 1]],
  UMi: [[2.53, 89.26, 3], [17.54, 86.59, 1], [16.77, 82.04, 1], [15.73, 77.79, 1], [16.29, 75.76, 1], [14.85, 74.16, 2], [15.35, 71.83, 1]],
  CMa: [[6.75, -16.72, 3], [6.38, -17.96, 2], [7.14, -26.39, 2], [6.98, -28.97, 2], [7.4, -29.3, 1]],
  Vir: [[13.42, -11.16, 3], [12.69, -1.45, 1], [13.04, 10.96, 1], [12.33, -0.67, 1], [11.84, 1.76, 1]]
};
const FIGURES = {
  UMa: [[0, 1, 2, 3, 0], [3, 4, 5, 6]], Cas: [[0, 1, 2, 3, 4]], Ori: [[7, 0], [7, 1], [0, 4], [1, 2], [2, 3, 4], [4, 5], [2, 6]],
  Cyg: [[0, 1, 4], [3, 1, 2]], Lyr: [[0, 1, 2, 3, 4, 1]], Leo: [[0, 1, 2, 3, 4], [2, 5, 6, 7, 0], [5, 7]],
  Sco: [[0, 1, 2], [1, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12]], Gem: [[0, 3, 2], [1, 5, 2], [0, 1]], Tau: [[0, 1, 2, 3, 0], [0, 5], [3, 4]],
  Aql: [[3, 1, 0, 2, 4]], Boo: [[0, 4, 3, 2, 1, 0]], Per: [[4, 0, 2, 3], [0, 1]], UMi: [[0, 1, 2, 3, 4, 5, 6, 3]],
  CMa: [[0, 1], [0, 2, 3, 4]], Vir: [[0, 3, 4], [3, 1, 2]]
};
function domeChart(S = 2048) {
  const c = document.createElement('canvas');
  c.width = c.height = S;
  const g = c.getContext('2d');
  g.fillStyle = '#000'; g.fillRect(0, 0, S, S);
  // (RA hours and Dec degrees to the planisphere: the pole in the middle,
  // Dec -45 at the rim)
  const at = (ra, dec) => {
    const rho = (90 - dec) / 135, phi = ra * 15 * DEG;
    return [S * (0.5 + 0.5 * rho * Math.cos(phi)), S * (0.5 - 0.5 * rho * Math.sin(phi))];
  };
  const line = (pts, w, a) => {
    g.strokeStyle = `rgba(255,255,255,${a})`; g.lineWidth = w; g.lineCap = 'round'; g.lineJoin = 'round';
    g.beginPath(); pts.forEach(([x, y], i) => (i ? g.lineTo(x, y) : g.moveTo(x, y))); g.stroke();
  };
  // the parallels and the equator (bolder), the hour circles
  [60, 30, -30].forEach(d => line(Array.from({ length: 241 }, (_, k) => at(k / 10, d)), 1.4, 0.32));
  line(Array.from({ length: 241 }, (_, k) => at(k / 10, 0)), 2.6, 0.55);
  for (let h = 0; h < 24; h++) line([at(h, 80), at(h, -45)], h % 6 ? 1 : 1.8, h % 6 ? 0.2 : 0.34);
  // the ecliptic, cut as a double line
  const eps = 23.44 * DEG;
  const ecl = off => Array.from({ length: 361 }, (_, k) => {
    const lam = k * DEG, ra = Math.atan2(Math.cos(eps) * Math.sin(lam), Math.cos(lam)) / (15 * DEG);
    return at((ra + 24) % 24, Math.asin(Math.sin(eps) * Math.sin(lam)) / DEG + off);
  });
  line(ecl(0.5), 1.6, 0.5); line(ecl(-0.5), 1.6, 0.5);
  // a field of fainter stars, the same every time
  let seed = 20260930;
  const rnd = () => { seed = (seed * 1664525 + 1013904223) >>> 0; return seed / 4294967296; };
  for (let k = 0; k < 900; k++) {
    const [x, y] = at(rnd() * 24, Math.asin(rnd() * 1.707 - 0.707) / DEG);
    g.fillStyle = `rgba(255,255,255,${(0.35 + rnd() * 0.45).toFixed(2)})`;
    g.beginPath(); g.arc(x, y, 0.9 + rnd() * 1.4, 0, Math.PI * 2); g.fill();
  }
  // the figures, then their stars over them
  Object.keys(STARS).forEach(k => (FIGURES[k] || []).forEach(run => line(run.map(i => at(STARS[k][i][0], STARS[k][i][1])), 2.2, 0.62)));
  Object.values(STARS).forEach(list => list.forEach(([ra, dec, m]) => {
    const [x, y] = at(ra, dec), r = 2.4 + m * 2.2;
    g.fillStyle = 'rgba(255,255,255,0.28)'; g.beginPath(); g.arc(x, y, r * 2.1, 0, Math.PI * 2); g.fill();
    g.fillStyle = '#fff'; g.beginPath(); g.arc(x, y, r, 0, Math.PI * 2); g.fill();
    // (the brightest cut as a four-point star)
    if (m >= 3) { g.lineWidth = 1.6; g.strokeStyle = '#fff'; g.beginPath(); g.moveTo(x - r * 3.2, y); g.lineTo(x + r * 3.2, y); g.moveTo(x, y - r * 3.2); g.lineTo(x, y + r * 3.2); g.stroke(); }
  }));
  const t = new THREE.CanvasTexture(c);
  t.colorSpace = THREE.NoColorSpace; t.anisotropy = 8;
  return t;
}

// ------------------------------------------------------------ the instrument
// opts: planets [{ id, initials, hue, tier, spent }], radius (the outermost
//       hoop's, in the instrument's own units), bandWidth, wire (a factor on
//       the hoops' gauge), planetScale (a factor on the planets' size), stand (standing on a desk: { height } - the sun's
//       height over the desk - a turned walnut plinth under the pillar and
//       four legs up to the band), dome (the engraved glass dome resting on
//       the band). Returns the group and a pose(state) that sets it:
//       state.open (0 folded to 1 run out: the arms' reach), state.crank
//       (the train's turn, in Earth turns), state.face (a point the planets
//       turn their painted side toward) - and, for a hand on it: hits (the
//       meshes a tap can find: each planet's ball with its id, the sun) and
//       setSpent(id, on) (a platform collected: its planet in shadow).
export function buildOrrery(opts = {}) {
  const M = materials();
  const planets = (opts.planets && opts.planets.length ? opts.planets : [{ initials: '', hue: 36 }, { initials: '', hue: 150 }, { initials: '', hue: 12 }]).slice(0, 7);
  const n = planets.length;
  const R = opts.radius || 240;
  const made = [M.brass, M.brassDark, M.gilt];     // geometries, materials and textures, for dispose()
  const keep = x => { made.push(x); return x; };
  const group = new THREE.Group();                // the instrument: its axis is +y, its plane xz
  const SUN = Math.max(10, R * 0.066);
  // the planets' paths: spaced out from the sun, a little wider apart outward
  const radii = planets.map((p, i) => lerp(SUN * 3.2, R, n === 1 ? 1 : Math.pow(i / (n - 1), 0.85)));
  const hits = [];

  // The pillar: a turned brass column down the axis, collars for the arms;
  // on a desk, down to its plinth.
  const stand = opts.stand || null;
  const pillarH = stand ? stand.height : SUN * 1.6 + n * SUN * 0.34 + SUN * 2;
  const pillar = new THREE.Mesh(keep(new THREE.CylinderGeometry(SUN * 0.2, SUN * 0.24, pillarH, 20)), M.brass);
  pillar.position.y = -pillarH / 2;
  group.add(pillar);
  // The sun: a gilt ball with twelve short rays in the plane.
  const sun = new THREE.Mesh(keep(new THREE.SphereGeometry(SUN, 48, 32)), M.gilt);
  sun.userData.sun = true;
  hits.push(sun);
  group.add(sun);
  const rayGeo = keep(new THREE.ConeGeometry(SUN * 0.16, SUN * 0.62, 10));
  for (let k = 0; k < 12; k++) {
    const ray = new THREE.Mesh(rayGeo, M.gilt);
    const a = k * 30 * DEG;
    ray.position.set(Math.cos(a) * SUN * 1.22, 0, Math.sin(a) * SUN * 1.22);
    ray.rotation.set(0, -a, -Math.PI / 2);
    group.add(ray);
  }

  // The arms: each on its own collar down the pillar, a flat bar out to
  // its planet's path and a post up to the plane. An arm reaches out as
  // the instrument opens (it is a folding instrument: the bar is drawn out
  // of its collar), and its hoop opens with it.
  const arms = [];
  const wireK = opts.wire || 1;
  planets.forEach((p, i) => {
    const collarY = -SUN * 1.6 - i * SUN * 0.34;
    const arm = new THREE.Group();
    group.add(arm);
    const collar = new THREE.Mesh(keep(new THREE.CylinderGeometry(SUN * 0.34, SUN * 0.34, SUN * 0.22, 24)), M.brassDark);
    collar.position.y = collarY;
    arm.add(collar);
    // the bar (unit length, scaled to its reach): flat, a hair thick
    const barW = Math.max(1.6, SUN * 0.2), barT = Math.max(0.9, SUN * 0.07);
    const bar = new THREE.Mesh(keep(new THREE.BoxGeometry(1, barT, barW)), M.brass);
    bar.position.y = collarY;
    arm.add(bar);
    const post = new THREE.Mesh(keep(new THREE.CylinderGeometry(barW * 0.32, barW * 0.32, 1, 10)), M.brassDark);
    arm.add(post);
    // the planet: its ball, and its ring on two pins (turned to face you
    // with the ball, so the paint and the ring are seen as the deck shows them)
    const size = p.tier === 'S' ? 1.25 : p.tier === 'A' ? 1.12 : p.tier === 'B' ? 1.0 : 0.92;
    const pr = Math.max(6, R * 0.043) * size * (opts.planetScale || 1);
    const tex = keep(planetTex(p));
    const ballMat = keep(new THREE.MeshPhysicalMaterial({ map: tex, roughness: 0.55, metalness: 0, clearcoat: 0.55, clearcoatRoughness: 0.28 }));
    const ball = new THREE.Mesh(keep(new THREE.SphereGeometry(pr, 40, 24)), ballMat);
    ball.userData.id = p.id;
    hits.push(ball);
    const planet = new THREE.Group();
    planet.add(ball);
    const ringHolder = new THREE.Group();
    const ringMat = keep(new THREE.MeshPhysicalMaterial({ color: 0xc19a62, metalness: 1, roughness: 0.3, clearcoat: 0.8, clearcoatRoughness: 0.1, side: THREE.DoubleSide }));
    const ringMesh = new THREE.Mesh(keep(new THREE.RingGeometry(pr * 1.34, pr * 1.52, 64)), ringMat);
    ringMesh.rotation.x = Math.PI / 2;        // flat in the holder's xz
    ringHolder.add(ringMesh);
    [-1, 1].forEach(sd => {
      const pin = new THREE.Mesh(keep(new THREE.CylinderGeometry(pr * 0.05, pr * 0.05, pr * 0.42, 6)), M.brassDark);
      pin.rotation.z = Math.PI / 2;
      pin.position.x = sd * pr * 1.12;
      ringHolder.add(pin);
    });
    // (tipped as the deck's rings are: toward you, and turned -17 degrees)
    ringHolder.rotation.set(72 * DEG, 0, -17 * DEG);
    planet.add(ringHolder);
    arm.add(planet);
    // its hoop: brass wire round the path (drawn full size, scaled with
    // the arm's reach as it opens)
    const wire = Math.max(0.55, R * 0.0026) * wireK;
    const hoop = new THREE.Mesh(keep(new THREE.TorusGeometry(radii[i], wire, 6, 220)), M.brassDark);
    hoop.rotation.x = Math.PI / 2;
    group.add(hoop);
    arms.push({ id: p.id, arm, bar, post, planet, ball, ballMat, ringMat, ringHolder, hoop, collarY, r: radii[i], pr, wire, ratio: RATIO[i] || 0.01, a0: (i * 137.508) * DEG, spent: 0 });
  });
  // The ecliptic band, outside the last path: engraved brass, laid flat.
  const b0 = R * 1.1, b1 = R * 1.1 + (opts.bandWidth || Math.max(12, R * 0.085));
  const bt = bandTex(2048, b0, b1);
  keep(bt.map); keep(bt.bump);
  const bandMat = keep(new THREE.MeshPhysicalMaterial({ map: bt.map, bumpMap: bt.bump, bumpScale: 1.4, color: 0xffffff, metalness: 1, roughness: 0.32, clearcoat: 0.85, clearcoatRoughness: 0.1, side: THREE.DoubleSide }));
  const band = new THREE.Mesh(keep(new THREE.RingGeometry(b0, b1, 256, 1)), bandMat);
  // (RingGeometry's uv is planar over its square, which is how the texture is drawn)
  const uv = band.geometry.attributes.position;
  const uvs = band.geometry.attributes.uv;
  for (let k = 0; k < uv.count; k++) uvs.setXY(k, uv.getX(k) / (2 * b1) + 0.5, uv.getY(k) / (2 * b1) + 0.5);
  band.rotation.x = -Math.PI / 2;
  const bandHolder = new THREE.Group();
  bandHolder.add(band);
  group.add(bandHolder);

  // On a desk: a turned walnut plinth under the pillar, a brass collar
  // where the pillar enters it, and four turned brass legs from the desk up
  // under the band, each on a small foot.
  if (stand) {
    const wood = stand.wood || new THREE.MeshPhysicalMaterial({ color: 0x3a2418, roughness: 0.45, clearcoat: 0.7, clearcoatRoughness: 0.2 });
    const pr0 = SUN * 2.6, ph = SUN * 1.1;
    // (the profile of a lathe-turned base: a foot, a cove, a bead, a dome)
    const prof = [[0, 0], [pr0, 0], [pr0, ph * 0.18], [pr0 * 0.93, ph * 0.26], [pr0 * 0.95, ph * 0.36], [pr0 * 0.8, ph * 0.46],
      [pr0 * 0.62, ph * 0.62], [pr0 * 0.46, ph * 0.84], [pr0 * 0.3, ph], [0, ph]].map(([x, y]) => new THREE.Vector2(x, y));
    const plinth = new THREE.Mesh(keep(new THREE.LatheGeometry(prof, 64)), wood);
    plinth.position.y = -pillarH;
    group.add(plinth);
    const collar = new THREE.Mesh(keep(new THREE.TorusGeometry(SUN * 0.34, SUN * 0.08, 10, 40)), M.brass);
    collar.rotation.x = Math.PI / 2; collar.position.y = -pillarH + ph;
    group.add(collar);
    const legR = (b0 + b1) / 2, legGeo = keep(new THREE.CylinderGeometry(SUN * 0.1, SUN * 0.14, pillarH, 16));
    const footGeo = keep(new THREE.CylinderGeometry(SUN * 0.34, SUN * 0.4, SUN * 0.12, 24));
    const knopGeo = keep(new THREE.SphereGeometry(SUN * 0.2, 20, 14));
    [45, 135, 225, 315].forEach(d => {
      const x = Math.cos(d * DEG) * legR, z = Math.sin(d * DEG) * legR;
      const leg = new THREE.Mesh(legGeo, M.brass); leg.position.set(x, -pillarH / 2, z);
      const foot = new THREE.Mesh(footGeo, M.brassDark); foot.position.set(x, -pillarH + SUN * 0.06, z);
      const knop = new THREE.Mesh(knopGeo, M.brass); knop.position.set(x, -pillarH * 0.42, z);
      group.add(leg, foot, knop);
    });
  }
  // The dome: a glass hemisphere resting on the band, its crown engraved
  // as the sky (see domeChart). The glass itself is almost nothing - what
  // shows is what it reflects, more of it at a grazing angle - and the
  // engraving is frosted: it takes the lamp's light where the lamp reaches
  // it and is dark where it doesn't.
  let dome = null;
  if (opts.dome) {
    const DR = b1 * 1.02;
    const geo = keep(new THREE.SphereGeometry(DR, 128, 48, 0, Math.PI * 2, 0, Math.PI / 2));
    // (a planisphere's UVs: the crown in the middle, the rim at the edge)
    const P = geo.attributes.position, U = geo.attributes.uv;
    for (let k = 0; k < P.count; k++) {
      const x = P.getX(k), y = P.getY(k), z = P.getZ(k);
      const rho = Math.acos(clamp01(y / DR)) / (Math.PI / 2), phi = Math.atan2(z, x);
      U.setXY(k, 0.5 + 0.5 * rho * Math.cos(phi), 0.5 + 0.5 * rho * Math.sin(phi));
    }
    // (black: glass has no colour of its own to light - only what it reflects)
    const glass = keep(new THREE.MeshStandardMaterial({ color: 0x000000, metalness: 0, roughness: 0.03, transparent: true, opacity: 0.0, depthWrite: false, side: THREE.DoubleSide, envMapIntensity: 0.55 }));
    glass.onBeforeCompile = sh => {
      sh.fragmentShader = sh.fragmentShader.replace('#include <opaque_fragment>', `
        float gFres = pow(1.0 - saturate(abs(dot(normal, normalize(vViewPosition)))), 4.0);
        diffuseColor.a = clamp(max(mix(diffuseColor.a, 0.32, gFres), dot(outgoingLight, vec3(0.2126, 0.7152, 0.0722)) * 0.55), 0.0, 1.0);
        #include <opaque_fragment>`);
    };
    glass.customProgramCacheKey = () => 'orrery-dome-glass';
    const chart = keep(domeChart());
    const cut = keep(new THREE.MeshStandardMaterial({ color: 0xf1e6cf, emissive: 0x2a2418, alphaMap: chart, transparent: true, opacity: 0.62, roughness: 0.9, metalness: 0, depthWrite: false, side: THREE.DoubleSide }));
    dome = new THREE.Group();
    const shell = new THREE.Mesh(geo, glass);
    const engraved = new THREE.Mesh(geo, cut);
    shell.renderOrder = 2; engraved.renderOrder = 3;
    dome.add(shell, engraved);
    // (its foot: a brass rim on the band where the glass sits)
    const rim = new THREE.Mesh(keep(new THREE.TorusGeometry(DR, SUN * 0.07, 8, 256)), M.brass);
    rim.rotation.x = Math.PI / 2;
    dome.add(rim);
    group.add(dome);
  }

  const tmp = new THREE.Vector3(), pq = new THREE.Quaternion(), fq = new THREE.Quaternion(), Z = new THREE.Vector3(0, 0, 1);
  function pose(s = {}) {
    const open = s.open == null ? 1 : s.open, crank = s.crank || 0;
    arms.forEach((A, i) => {
      // each arm runs out on its own lag, the inner ones first
      const reach = Math.max(SUN * 1.25, A.r * clamp01(s.reach ? s.reach(i) : open));
      const ang = A.a0 + crank * A.ratio * Math.PI * 2;
      A.arm.rotation.y = -ang;
      A.bar.scale.x = reach; A.bar.position.x = reach / 2;
      const postH = -A.collarY;
      A.post.scale.y = postH; A.post.position.set(reach, A.collarY / 2, 0);
      A.planet.position.set(reach, 0, 0);
      A.planet.quaternion.identity();
      // the hoop opens with its arm
      A.hoop.scale.setScalar(Math.max(0.001, reach / A.r));
    });
    // the painted side and the ring turn to the viewer
    if (s.face) {
      group.updateMatrixWorld(true);
      arms.forEach(A => {
        A.planet.getWorldPosition(tmp);
        A.planet.parent.getWorldQuaternion(pq);
        fq.setFromUnitVectors(Z, tmp.sub(s.face).negate().normalize());
        A.planet.quaternion.copy(pq.invert()).multiply(fq);
      });
    }
    // the band opens last, from the plane's edge
    const bo = s.band == null ? open : s.band;
    bandHolder.scale.setScalar(Math.max(0.001, bo));
    bandHolder.visible = bo > 0.002;
    sun.scale.setScalar(s.sun == null ? 1 : Math.max(0.001, s.sun));
  }
  pose({ open: 1 });
  // A planet whose platform has been collected: its paint in shadow, its
  // varnish and ring gone dull - there, but spent until it comes round.
  function setSpent(id, on) {
    const A = arms.find(x => x.id === id);
    if (!A || A.spent === (on ? 1 : 0)) return;
    A.spent = on ? 1 : 0;
    A.ballMat.color.setScalar(on ? 0.42 : 1);
    A.ballMat.clearcoat = on ? 0.15 : 0.55;
    A.ringMat.color.set(on ? 0x6f5a3c : 0xc19a62);
    A.ringMat.roughness = on ? 0.55 : 0.3;
  }
  planets.forEach(p => { if (p.spent) setSpent(p.id, true); });

  function dispose() {
    group.removeFromParent();
    made.forEach(x => x.dispose && x.dispose());
  }
  return { group, pose, dispose, radii, sun: SUN, arms, hits, setSpent, dome, band: [b0, b1], pillarH };
}

// ------------------------------------------------------------ the breakout
export function createBreakout() {
  let renderer = null, back = null, back2d = null, front = null, front2d = null, scene = null, camera = null, env = null;
  let orrery = null, catcher = null, key = null, glass = null, raf = 0;
  let state = 'idle', t0 = 0, foldT0 = 0, W = 0, H = 0, D = 1100, dpr = 1;
  let ringEl = null, countEl = null, from = null, to = null, ringAnim = null;
  let crankEnd = 0, lastFrame = 0, crankAt = 0, drift = 0;

  function canWebGL() {
    try { const c = document.createElement('canvas'); return !!c.getContext('webgl2'); } catch (e) { return false; }
  }
  function setup() {
    if (renderer) return true;
    if (!canWebGL()) return false;
    renderer = new THREE.WebGLRenderer({ alpha: true, antialias: true, powerPreference: 'low-power' });
    renderer.setClearColor(0x000000, 0);
    renderer.toneMapping = THREE.ACESFilmicToneMapping;
    renderer.toneMappingExposure = 1.15;
    renderer.outputColorSpace = THREE.SRGBColorSpace;
    renderer.localClippingEnabled = true;
    renderer.shadowMap.enabled = true;
    renderer.shadowMap.type = THREE.PCFShadowMap;
    renderer.shadowMap.autoUpdate = false;
    // (the WebGL canvas is never shown: each half is copied out of it into
    // a canvas of its own, one under the app and one over it)
    const layer = cls => { const c = document.createElement('canvas'); c.className = 'ob-orrery ' + cls; c.setAttribute('aria-hidden', 'true'); return c; };
    back = layer('ob-orrery-back'); back2d = back.getContext('2d');
    front = layer('ob-orrery-front'); front2d = front.getContext('2d');
    scene = new THREE.Scene();
    env = studioEnvironment(renderer);
    scene.environment = env;
    scene.environmentIntensity = 0.85;
    camera = new THREE.PerspectiveCamera(40, 1, 10, 6000);
    // the key light, and a low warm fill from the page
    key = new THREE.DirectionalLight(0xfff1dc, 2.4);
    key.castShadow = true;
    key.shadow.mapSize.set(1024, 1024);
    key.shadow.bias = -0.0006; key.shadow.normalBias = 0.4; key.shadow.radius = 4;
    scene.add(key, key.target);
    scene.add(new THREE.HemisphereLight(0xfff4e2, 0x2a2016, 0.35));
    // the glass: shadows of what is in front of it fall on it
    catcher = new THREE.Mesh(new THREE.PlaneGeometry(1, 1), new THREE.ShadowMaterial({ opacity: 0.26 }));
    catcher.receiveShadow = true;
    scene.add(catcher);
    glass = new THREE.Plane(new THREE.Vector3(0, 0, 1), 0);
    // A lost context (a phone short of GPU memory drops it): the payout is
    // put away; once it is back, the studio the brass mirrors is made again
    // (a render target, which the loss empties - without it every metal
    // here would draw near black).
    renderer.domElement.addEventListener('webglcontextlost', e => { e.preventDefault(); clear(); });
    renderer.domElement.addEventListener('webglcontextrestored', () => {
      const old = env;
      env = studioEnvironment(renderer);
      scene.environment = env;
      if (old) old.dispose();
    });
    return true;
  }
  // the page's box: the glass at 1:1 from the camera
  function frame() {
    W = window.innerWidth; H = window.innerHeight;
    dpr = Math.min(window.devicePixelRatio || 1, 2);
    renderer.setPixelRatio(dpr);
    renderer.setSize(W, H, false);
    back.width = front.width = Math.round(W * dpr); back.height = front.height = Math.round(H * dpr);
    D = Math.max(W, H) * 1.3;
    camera.aspect = W / H;
    camera.fov = 2 * Math.atan((H / 2) / D) / DEG;
    camera.near = 10; camera.far = D * 4;
    camera.position.set(0, 0, D);
    camera.lookAt(0, 0, 0);
    camera.updateProjectionMatrix();
    catcher.scale.set(W * 1.5, H * 1.5, 1);
    key.position.copy(LIGHT).multiplyScalar(D * 1.2);
    const sc = key.shadow.camera;
    sc.left = -W; sc.right = W; sc.top = H; sc.bottom = -H; sc.near = 1; sc.far = D * 3;
    sc.updateProjectionMatrix();
  }
  const toWorld = (sx, sy) => new THREE.Vector2(sx - W / 2, H / 2 - sy);

  function every(fn) { scene.traverse(o => { if (o.material) [].concat(o.material).forEach(fn); }); }
  function clipAll() {
    every(m => { if (m !== catcher.material) { m.clippingPlanes = [glass]; m.clipShadows = true; m.needsUpdate = true; } });
  }
  // the two halves: in front of the glass (with the shadows it drops on
  // it) into the canvas over the page, behind it into the one under it
  function draw() {
    catcher.visible = true;
    glass.normal.set(0, 0, 1);
    renderer.shadowMap.needsUpdate = true;
    renderer.render(scene, camera);
    front2d.clearRect(0, 0, front.width, front.height);
    front2d.drawImage(renderer.domElement, 0, 0);
    catcher.visible = false;
    glass.normal.set(0, 0, -1);
    renderer.render(scene, camera);
    back2d.clearRect(0, 0, back.width, back.height);
    back2d.drawImage(renderer.domElement, 0, 0);
  }

  // The timeline, in ms from the start (the hold after it is still):
  //   0-240     the wind-up: the plate dips, the count clears (it comes
  //             back once the instrument has moved off the plate, 1100-1400)
  //   160-760   the sun rises out of the plate and through the glass
  //   420-1600  the arms run out, each on its own lag, the hoops open
  //   1300-1900 the band opens round them
  //   380-3400  the crank: a hair back, then the train turns, and runs
  //             down to a stop with the gears' backlash
  const T = { sunUp: [160, 760], arms: [420, 1150], lag: 70, band: [1300, 1900], crank: [380, 3400], end: 3500 };
  // (at rest the plane is seen from this far above it: its hoops ellipses
  // about half as tall as they are wide)
  const TIP = 27;
  const place = new THREE.Vector3();
  function crankAtT(ms) {
    const [a, b] = T.crank;
    if (ms < a) return 0;
    const u = clamp01((ms - a) / (b - a));
    // a hair back as the slack is taken up, then the turn, easing out; at
    // the stop the train rocks back through its backlash and settles
    const back = -0.012 * Math.sin(Math.PI * clamp01(u / 0.08));
    const run = u < 0.08 ? 0 : 1 - Math.pow(1 - (u - 0.08) / 0.92, 3);
    const lash = u > 0.9 ? -0.006 * Math.sin(Math.PI * (u - 0.9) / 0.1) : 0;
    return (back + run * crankEnd + lash);
  }
  function poseAt(ms, folding) {
    // where the instrument stands: from the plate (behind the glass) to the
    // middle of the page, a little in front of it
    const up = smoother((ms - T.sunUp[0]) / (T.sunUp[1] - T.sunUp[0]));
    const rise = settle((ms - T.sunUp[0]) / (T.sunUp[1] - T.sunUp[0]), 0.08);
    const mv = smoother((ms - 260) / 1300);
    const cx = lerp(from.x, to.x, mv), cy = lerp(from.y, to.y, mv);
    const z = lerp(-orrery.sun * 3.4, to.z, rise);
    orrery.group.position.set(cx, cy, z);
    const armU = i => settle((ms - T.arms[0] - i * T.lag) / (T.arms[1] - T.arms[0]), 0.05);
    const bandU = settle((ms - T.band[0]) / (T.band[1] - T.band[0]), 0.03);
    // tipped as it opens: at first its plane faces you, the pillar pointing
    // straight back into the phone; then the plane leans back until you
    // see it from a little above
    const tip = lerp(88, TIP, smoother((ms - 240) / 1200));
    orrery.group.rotation.set(tip * DEG, 0, lerp(0, -10, smoother((ms - 240) / 1200)) * DEG, 'ZXY');
    orrery.pose({ reach: armU, band: bandU, crank: crankAtT(ms), sun: lerp(0.6, 1, up), face: camera.position });
    return ms >= T.end;
  }
  function fold(ms) {
    // back the way it came, quicker: the band closes, the arms fold in, the
    // plane stands up edge-on, the sun sinks back through the glass
    const u = clamp01(ms / 1000);
    const k = 1 - smoother(u / 0.75);
    const g = orrery.group;
    orrery.pose({ reach: i => k * (1 - 0.04 * Math.sin(Math.PI * clamp01(u / 0.4))), band: 1 - smoother(u / 0.45), crank: crankEnd + 0.02 * u, sun: lerp(1, 0.6, smoother((u - 0.6) / 0.4)), face: camera.position });
    const tip = lerp(TIP, 88, smoother(u / 0.7));
    g.rotation.set(tip * DEG, 0, lerp(-10, 0, smoother(u / 0.7)) * DEG, 'ZXY');
    const mv = smoother((u - 0.1) / 0.75);
    g.position.set(lerp(to.x, from.x, mv), lerp(to.y, from.y, mv), lerp(to.z, -orrery.sun * 3.4, smoother((u - 0.55) / 0.45)));
    return u >= 1;
  }

  function loop(t) {
    if (state === 'idle') return;
    raf = requestAnimationFrame(loop);
    // (about 60 a second on any screen)
    if (t - lastFrame < 14) return;
    lastFrame = t;
    let done;
    if (state === 'folding') {
      const ms = t - foldT0;
      done = fold(ms);
      // (the count clears as the sun comes back down through the plate)
      if (countEl) {
        const co = ms < 450 ? 1 : ms < 850 ? 1 - smooth((ms - 450) / 150) : smooth((ms - 850) / 150);
        countEl.style.opacity = co >= 1 ? '' : co.toFixed(3);
      }
      draw();
      if (done) teardown();
      return;
    }
    done = poseAt(Math.max(0, t - t0));
    // the count clears as the sun comes up through it, and is back on the
    // plate once the instrument has moved off it
    if (countEl) {
      const ms = t - t0, co = ms < 1100 ? 1 - smooth((ms - 40) / 140) : smooth((ms - 1100) / 300);
      countEl.style.opacity = co >= 1 ? '' : co.toFixed(3);
    }
    draw();
    if (done) { state = 'resting'; cancelAnimationFrame(raf); raf = 0; }
  }

  function play(o = {}) {
    if (state !== 'idle') { foldAway(() => play(o)); return true; }
    if (!setup()) return false;
    ringEl = o.ring || document.querySelector('.hero-ring-wrapper');
    if (!ringEl) return false;
    const rr = ringEl.getBoundingClientRect();
    if (!rr.width) return false;
    frame();
    countEl = document.getElementById('heroCount');
    // the instrument, sized to the page: its band a little inside the
    // shorter of the page's width and height
    const R = Math.min(W * 0.7, H * 0.42);
    orrery = buildOrrery({ planets: o.platforms || [], radius: R });
    scene.add(orrery.group);
    orrery.group.traverse(obj => { if (obj.isMesh) obj.castShadow = true; });
    clipAll();
    const a = toWorld(rr.left + rr.width / 2, rr.top + rr.height / 2);
    from = { x: a.x, y: a.y };
    const b = toWorld(W / 2, Math.max(rr.top + rr.height / 2, H * 0.47));
    to = { x: b.x, y: b.y, z: orrery.sun * 2.2 };
    // one to one and a half turns of the Earth, so the inner planets go
    // round several times and the outer ones barely move
    crankEnd = 0.9 + Math.random() * 0.55;
    document.body.appendChild(back);
    document.body.appendChild(front);
    // the plate dips as it takes the weight, then gives it up
    ringAnim = ringEl.animate([
      { transform: 'scale(1)', easing: 'cubic-bezier(.45,0,.55,1)' }, { transform: 'scale(0.95)', offset: 0.34, easing: 'cubic-bezier(.2,.9,.3,1)' },
      { transform: 'scale(1.03)', offset: 0.58, easing: 'ease-in-out' }, { transform: 'scale(0.995)', offset: 0.8 }, { transform: 'scale(1)' }
    ], { duration: 760 });
    poseAt(0);
    // Nothing may compile or upload once it moves: the shaders are built and
    // the textures sent before the clock starts (in parallel where the
    // browser can), and the first frame is drawn then.
    state = 'starting';
    const go = () => {
      if (state !== 'starting') return;
      draw();
      state = 'playing';
      t0 = performance.now();
      lastFrame = 0;
      raf = requestAnimationFrame(loop);
    };
    scene.traverse(obj => { if (obj.material) [].concat(obj.material).forEach(m => { ['map', 'bumpMap'].forEach(k => { if (m[k]) renderer.initTexture(m[k]); }); }); });
    (renderer.compileAsync ? renderer.compileAsync(scene, camera) : Promise.resolve(renderer.compile(scene, camera))).then(go, go);
    return true;
  }
  function foldAway(then) {
    if (state === 'idle') { if (then) then(); return; }
    if (state === 'folding') return;
    if (state === 'starting') { afterFold = then || null; teardown(); return; }
    // (from wherever it is: mid-flight, the crank stops where it stands)
    if (state === 'playing') crankEnd = crankAtT(performance.now() - t0);
    state = 'folding';
    foldT0 = performance.now();
    afterFold = then || null;
    if (!raf) raf = requestAnimationFrame(loop);
  }
  let afterFold = null;
  function teardown() {
    cancelAnimationFrame(raf); raf = 0;
    state = 'idle';
    if (countEl) countEl.style.opacity = '';
    if (orrery) { orrery.dispose(); orrery = null; }
    if (front) front.remove();
    if (back) back.remove();
    const then = afterFold; afterFold = null;
    if (then) then();
  }
  function clear() {
    if (ringAnim) { try { ringAnim.cancel(); } catch (e) {} ringAnim = null; }
    afterFold = null;
    if (state !== 'idle') teardown();
  }
  // the next touch folds it away (the touch still reaches what it lands on)
  document.addEventListener('pointerdown', () => { if (state === 'playing' || state === 'resting' || state === 'starting') foldAway(); }, true);
  // (the lab's: stop the clock and show the payout at ms from its start,
  // or folding at ms from the touch with fold)
  const seek = (ms, folding) => {
    if (!orrery) return null;
    cancelAnimationFrame(raf); raf = 0;
    state = 'resting';
    const t = performance.now();
    if (folding) fold(ms); else poseAt(ms);
    draw();
    return performance.now() - t;
  };
  // (the lab's: where things are)
  const probe = () => {
    if (!orrery) return null;
    orrery.group.updateMatrixWorld(true);
    const pr = v => { const w = v.clone().project(camera); return [Math.round((w.x + 1) / 2 * W), Math.round((1 - w.y) / 2 * H), Math.round(v.z)]; };
    const sunW = orrery.group.getWorldPosition(new THREE.Vector3());
    return { W, H, D: Math.round(D), sun: pr(sunW), planets: orrery.arms.map(A => pr(A.planet.getWorldPosition(new THREE.Vector3()))), cam: camera.position.toArray().map(Math.round), fov: camera.fov };
  };
  return { play, clear, busy: () => state !== 'idle', fold: foldAway, seek, probe, lab: () => ({ THREE, scene, renderer, camera, draw, glass, orrery }) };
}
