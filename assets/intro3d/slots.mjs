// THE SLOTS: the landing shot's fifth game (see GAMES in intro.mjs).
//
// An automaton sits at his writing desk on a walnut dais out beyond the
// plinko cabinet, under his own lamp: a child of the 1770s in the way of
// the Neuchatel writers - a bisque face, glass eyes, his own brown curls,
// an oxblood silk coat edged in gold braid - and in his black waistcoat a
// window of glass, behind which three reels turn in his clockwork. The
// shot opens close on his face; he turns his head to the brass lever at
// the desk's side, reaches for it and pulls it, and as it springs back the
// reels in his chest spin up; he bows his head to watch them. They stop one
// at a time, each with the clunk of its detent; time slows on the third.
// The line is called, the desk's drawer slides open and the payout rings
// into it, and the lens floats up and away over the pit, from where the
// homes' fly-ins start (intro.mjs: FLOAT).
//
// The tiers, drawn as the dice's are (TIERS / pickTier):
//   standard  Standard Pull (90%)  three chips, dice, bells or crowns
//   hardways  Three Sevens (8%)    called in platinum
//   vault     The Jackpot (1.9%)   three house badges: gold light floods
//                                  out of his clockwork, a glint catches in
//                                  his eyes, he raises his hand bell and
//                                  rings it, and the drawer runs over
//   edge      On a Tooth (0.1%)    two house badges, and the third reel's
//                                  pawl comes down on the tip of a tooth:
//                                  the reel stands between two stops, and he
//                                  stops with it, mid-gesture, the bell half
//                                  raised; his clockwork falls silent and the
//                                  lens closes in
//
// Everything is worked out before the first frame: the line each tier
// draws, every reel's spin to its stop, the figure's movements (cams, as
// an automaton's are: each motion eased in and out by its cam's profile,
// a beat of stillness between them), the lever, the drawer and its tokens,
// the camera, the timings and the sounds - one timeline; each frame is a
// lookup at a time.
//
// Held to the workshop of an 18th-century Neuchatel automaton maker (the
// writer, the draughtsman: a child seated at a small desk, moved by cams
// and a clockwork in the body):
//   Across the room: a small seated figure at a walnut desk with gilt-bronze
//     mounts, on a dais; the brass lever at the desk's side; the glint of
//     the window in his chest; the lamp on his curls and face.
//   At arm's length: the bisque's satin and its painted face - rosy cheeks,
//     a rosebud mouth, fine brows, the lash line along each lid; the glass
//     eyes in their sockets, brown irises, the lids that close over them as
//     a doll's do; the curls; the silk's small woven pattern and its gold
//     thread, the braid along the coat's edges, the linen jabot with its
//     lace edge; the reels' painted strips behind glass.
//   Pinched in 3x: the silk's weave in relief, the braid's herringbone,
//     the tokens' milled edges and their stamp, the leather on the desk
//     with its tooled gold border.
//   Light: his lamp from above and in front, a warm key; a cool rim from
//     behind on the curls and shoulders; the reels lit from inside his
//     chest.
//   Contact: each hand holds what it holds - the lever's ball under the
//     palm and the fingers round it, the bell's handle in the fist; the
//     resting hand's fingertips above the leather, never through it; the
//     tokens slide out of the desk into the drawer and lie on one another.
//   Motion: cam-driven - smooth, each move eased at both ends, never quite
//     human; the eyes lead the head and converge on what he looks at; a
//     blink now and then; the lever's spring and the reels' inertia; the
//     third reel ridden in slow time.

const DEG = Math.PI / 180;
const TAU = Math.PI * 2;

export const HOLD = { n: [0.3, -0.8, 0.5], hd: [-0.75, -0.35, 0.55], along: 1.8, out: 2.55, curl: 1.05, thumb: 1.2 };
export const TIER_NAMES = { standard: 'Standard Pull', hardways: 'Three Sevens', vault: 'The Jackpot', edge: 'On a Tooth' };

// The reels: twelve stops each, the strips the order of the symbols round
// each reel (each holds one seven and one house badge).
const STRIPS = [
  ['seven', 'chip', 'bell', 'die', 'crown', 'chip', 'badge', 'die', 'bell', 'crown', 'chip', 'die'],
  ['chip', 'die', 'seven', 'crown', 'bell', 'chip', 'die', 'badge', 'crown', 'bell', 'chip', 'die'],
  ['die', 'bell', 'chip', 'seven', 'crown', 'die', 'chip', 'bell', 'badge', 'crown', 'die', 'chip']
];
const NS = 12, STEP = TAU / NS;
const WORDS = { chip: ['Three Chips', 'Five to one'], die: ['Three Dice', 'Five to one'], bell: ['Three Bells', 'Ten to one'], crown: ['Three Crowns', 'Ten to one'], seven: ['Three Sevens', 'Twenty to one'], badge: ['The Jackpot', 'Forty to one'] };
// (the payout, in tokens: the odds on one)
const TOKGAP = { standard: 0.11, hardways: 0.07, vault: 0.04, edge: 0 };
const PAY = { chip: 5, die: 5, bell: 10, crown: 10, seven: 20, badge: 40 };

// Where he sits, in the room's frame (the dice table's felt is y = 0, the
// floor 82 cm down): out beyond the plinko cabinet, turned to face the pit
// (far enough back that the lens, standing off for the whole of him, is
// still clear of the dice table). His frame: x to his left (the lens's
// right as he faces it), y up from the dais's top, z out toward the lens.
const AUT = { x: 330, z: -250, yaw: -52 * DEG };
// The dais (cm), the desk, its drawer, the stool.
const DAIS = { w: 128, d: 100, h: 14, z: -8 };
const DESK = { w: 60, d: 35, top: 50, th: 2.2, over: 1.4, apron: 41.4 };
const DRAWER = { w: 19, h: 4.8, y: 41.9, depth: 14, open: 10.5 };
const STOOL = { y: 31, z: -30, w: 26, d: 22 };
// The figure: his hips (the body's pivot, on the stool); in the body's
// frame his shoulders, the head's pivot and the head; a child's arms.
const HIP = { y: 34.5, z: -28 };
const SH = { x: 10.2, y: 32.5 };
const NECKY = 41.5;
const HEAD = { up: 8.2, fwd: 1.6, rx: 7.4, ry: 8.9, rz: 8.2 };
const ARM = { upper: 16.5, fore: 14.2 };
const PALM = 2.5;                              // the wrist to the palm's centre
// The window in his chest (body frame) and the reels behind it.
const WIN = { y: 27, w: 12.4, h: 7.6 };
const REEL = { r: 3.7, w: 3.5, gap: 0.55 };
// The lever at the desk's right (his right: -x), clear of the top's
// overhang; its ball; its swing (toward the lens is +).
const LEVER = { x: -DESK.w / 2 - DESK.over - 2.4, y: 46, z: -11, len: 21, rest: 8 * DEG, pulled: -46 * DEG, ball: 1.7 };
// The hand bell on the desk at his left.
const BELL = { x: 15, z: -4, h: 5.0, r: 2.8, handle: 4.0 };
const TOKEN = { r: 1.1, th: 0.2 };

const clamp01 = x => Math.min(Math.max(x, 0), 1);
const smoother = x => { x = clamp01(x); return x * x * x * (x * (6 * x - 15) + 10); };
const lerp = (a, b, k) => a + (b - a) * k;
// A cam's rise: a cycloidal profile, as automaton cams are cut - zero speed
// and zero acceleration at both ends.
const cam = x => { x = clamp01(x); return x - Math.sin(TAU * x) / TAU; };

export async function makeGame(ctx) {
  const { THREE, scene, set, lights, tier, seed, aspect, room, helpers: H } = ctx;
  const { makeWarp, spline, finished, embossTex } = H;
  const V = (x = 0, y = 0, z = 0) => new THREE.Vector3(x, y, z);
  const rng = (s => { for (let k = 0; k < 3; k++) { s = Math.imul(s ^ (s >>> 15), 0x2c1b3c6d) >>> 0; s = Math.imul(s ^ (s >>> 12), 0x297a2d39) >>> 0; } return () => { s = (Math.imul(s, 1664525) + 1013904223) >>> 0; s ^= s >>> 16; return (s >>> 0) / 4294967296; }; })((seed ^ 0x51a7c0de) >>> 0);
  const pick = a => a[Math.floor(rng() * a.length)];

  // ---- The line each tier draws.
  let line;
  if (tier === 'hardways') line = ['seven', 'seven', 'seven'];
  else if (tier === 'vault' || tier === 'edge') line = ['badge', 'badge', 'badge'];
  else { const s = pick(['chip', 'die', 'bell', 'crown']); line = [s, s, s]; }
  const call = tier === 'edge' ? null : WORDS[line[0]];
  // (each reel's stop for its symbol, from a drawn place)
  const stops = line.map((s, i) => { const at = STRIPS[i].map((x, k) => (x === s ? k : -1)).filter(k => k >= 0); return pick(at); });

  // ---- His frame, and the room's.
  const aut = new THREE.Group();
  aut.position.set(AUT.x, room.floor, AUT.z);
  aut.rotation.y = AUT.yaw;
  scene.add(aut);
  const stage = new THREE.Group(); stage.position.y = DAIS.h; aut.add(stage);
  aut.updateMatrixWorld(true);
  const toWorld = v => v.clone().applyMatrix4(stage.matrixWorld);
  const made = { geos: [], mats: [], texs: [] };
  const keep = (g, m, t) => { if (g) made.geos.push(g); if (m) made.mats.push(m); if (t) made.texs.push(t); };
  const mesh = (g, m, parent, cast = true) => { const x = new THREE.Mesh(g, m); x.castShadow = cast; x.receiveShadow = true; keep(g); (parent || stage).add(x); return x; };
  const canvas = (w, h, paint) => { const c = document.createElement('canvas'); c.width = w; c.height = h; paint(c.getContext('2d'), w, h); return c; };
  const texOf = (c, srgb = true, rep) => { const t = new THREE.CanvasTexture(c); t.colorSpace = srgb ? THREE.SRGBColorSpace : THREE.NoColorSpace; t.anisotropy = 8; if (rep) { t.wrapS = t.wrapT = THREE.RepeatWrapping; t.repeat.set(rep[0], rep[1]); } keep(null, null, t); return t; };
  const Y = V(0, 1, 0);
  // (a mesh laid from a to b along its own y)
  const laid = (m, a, b) => { const d = b.clone().sub(a); m.position.copy(a); m.quaternion.setFromUnitVectors(Y, d.normalize()); return m; };

  // ---- Materials.
  const brass = set.brass;
  // (gilt bronze: mercury gilding, warmer and softer than the brass)
  const gilt = new THREE.MeshStandardMaterial({ color: 0xe2b860, metalness: 1, roughness: 0.3, envMapIntensity: 1.1 });
  finished(gilt, 'brushed', 3, 3, 0.18); keep(null, gilt);
  const walnut = set.wood.clone(); walnut.color.setHex(0x8c6a52); walnut.normalScale = new THREE.Vector2(0.3, 0.3); keep(null, walnut);
  // (bisque: unglazed porcelain, a soft satin, warm)
  const bisque = new THREE.MeshPhysicalMaterial({ color: 0xecc6ab, roughness: 0.46, clearcoat: 0.15, clearcoatRoughness: 0.4, sheen: 0.18, sheenRoughness: 0.5, sheenColor: new THREE.Color(0xffe0d0) });
  keep(null, bisque);
  // a small woven silk: a pomegranate damask about two centimetres a
  // repeat, the ground a ribbed silk, the pattern in the thread's colour,
  // woven in relief
  const damask = (ground, thread, shade) => {
    const S = 256;
    const mask = canvas(S, S, (g) => {
      g.fillStyle = '#fff'; g.strokeStyle = '#fff';
      const cell = (cx, cy) => {
        g.save(); g.translate(cx, cy); g.scale(0.5, 0.5);
        g.lineWidth = 9;
        g.beginPath(); g.moveTo(0, -120); g.bezierCurveTo(70, -70, 70, 70, 0, 120); g.bezierCurveTo(-70, 70, -70, -70, 0, -120); g.stroke();
        for (let k = 0; k < 6; k++) { const a = (k / 6) * TAU; g.beginPath(); g.ellipse(Math.cos(a) * 22, Math.sin(a) * 30, 15, 8, a, 0, TAU); g.fill(); }
        g.beginPath(); g.arc(0, 0, 14, 0, TAU); g.fill();
        g.restore();
      };
      [[0, 0], [S, 0], [0, S], [S, S], [S / 2, S / 2]].forEach(([x, y]) => cell(x, y));
    });
    const art = canvas(S, S, (g) => { g.fillStyle = '#000'; g.fillRect(0, 0, S, S); g.drawImage(mask, 0, 0); });
    const map = canvas(S, S, (g) => {
      g.fillStyle = ground; g.fillRect(0, 0, S, S);
      g.globalAlpha = 0.1; g.fillStyle = shade; for (let y = 0; y < S; y += 2) g.fillRect(0, y, S, 1); g.globalAlpha = 1;
      const a = canvas(S, S, (h) => { h.drawImage(mask, 0, 0); h.globalCompositeOperation = 'source-in'; h.fillStyle = thread; h.fillRect(0, 0, S, S); });
      g.globalAlpha = 0.85; g.drawImage(a, 0, 0); g.globalAlpha = 1;
    });
    return { map, bump: art };
  };
  const silk = (art, rep, rough, sheenColor) => {
    const map = texOf(art.map, true, rep);
    const nrm = embossTex(art.bump, 1.6, 1); nrm.wrapS = nrm.wrapT = THREE.RepeatWrapping; nrm.repeat.set(rep[0], rep[1]); keep(null, null, nrm);
    const m = new THREE.MeshPhysicalMaterial({ map, normalMap: nrm, normalScale: new THREE.Vector2(0.5, 0.5), roughness: rough, sheen: 0.7, sheenRoughness: 0.4, sheenColor: new THREE.Color(sheenColor) });
    keep(null, m);
    return m;
  };
  // (tone on tone, as a damask is: the pattern woven in the ground's own
  // colour and read by its sheen; the gold is in the braid alone)
  const coatArt = damask('#4a0d17', '#661826', '#000');
  const vestArt = damask('#121011', '#262022', '#000');
  // (one motif a little over two centimetres: round his chest (78 cm) and
  // down it (45); round a sleeve (22) and along it (32))
  const coat = silk(coatArt, [34, 20], 0.55, 0x7a3a34);
  const sleeveMat = silk(coatArt, [10, 15], 0.55, 0x7a3a34);
  sleeveMat.side = THREE.DoubleSide;
  const vest = silk(vestArt, [30, 20], 0.5, 0x4a3c30);
  // the braid: gold thread woven flat in a herringbone, along every edge
  const braidTex = (() => {
    const c = canvas(32, 128, (g, W, Hh) => {
      g.fillStyle = '#000'; g.fillRect(0, 0, W, Hh); g.strokeStyle = '#fff'; g.lineWidth = 3;
      for (let y = -W; y < Hh + W; y += 8) { g.beginPath(); g.moveTo(0, y); g.lineTo(W / 2, y + 6); g.lineTo(W, y); g.stroke(); }
      g.fillStyle = '#fff'; g.fillRect(0, 0, 3, Hh); g.fillRect(W - 3, 0, 3, Hh);
    });
    const n = embossTex(c, 2.2, 1); n.wrapS = n.wrapT = THREE.RepeatWrapping; keep(null, null, n);
    return n;
  })();
  const braid = new THREE.MeshStandardMaterial({ color: 0xd8ae58, metalness: 0.9, roughness: 0.35, normalMap: braidTex, normalScale: new THREE.Vector2(0.8, 0.8), side: THREE.DoubleSide });
  keep(null, braid);
  // linen, and its lace edge: the cloth opaque, the edge scalloped, a fine
  // pattern woven into it as a shade of white rather than as holes
  const linen = new THREE.MeshStandardMaterial({ color: 0xf3efe6, roughness: 0.85, side: THREE.DoubleSide });
  keep(null, linen);
  const laceTex = (() => {
    const W = 512, Hh = 128;
    const col = canvas(W, Hh, (g) => {
      g.fillStyle = '#f4f0e7'; g.fillRect(0, 0, W, Hh);
      g.strokeStyle = 'rgba(160,150,135,0.55)'; g.lineWidth = 1.5;
      for (let x = 8; x < W; x += 16) { g.beginPath(); g.arc(x, Hh * 0.62, 5, 0, TAU); g.stroke(); g.beginPath(); g.moveTo(x, Hh * 0.62 - 5); g.lineTo(x, Hh * 0.35); g.stroke(); }
      g.beginPath(); g.moveTo(0, Hh * 0.32); g.lineTo(W, Hh * 0.32); g.stroke();
    });
    const alpha = canvas(W, Hh, (g) => {
      g.fillStyle = '#fff'; g.fillRect(0, 0, W, Hh);
      g.fillStyle = '#000';
      // (the scalloped edge: round lobes of cloth, the cut between them -
      // arcs cut out of the edge would leave points, a paper cup's zigzag)
      g.fillRect(0, Hh * 0.72, W, Hh * 0.28 + 1);
      g.fillStyle = '#fff';
      for (let x = 0; x < W; x += 128) { g.beginPath(); g.ellipse(x + 64, Hh * 0.72, 62, Hh * 0.24, 0, 0, Math.PI); g.fill(); }
    });
    const m = texOf(col, true), a = texOf(alpha, false); m.wrapS = a.wrapS = THREE.RepeatWrapping;
    return { map: m, alpha: a };
  })();
  const lace = new THREE.MeshStandardMaterial({ map: laceTex.map, alphaMap: laceTex.alpha, alphaTest: 0.5, side: THREE.DoubleSide, roughness: 0.85 });
  keep(null, lace);

  // ---- The dais: walnut, a gilt bead round its top, the house badge on its
  // front.
  const box = (w, h, d, x, y, z, mat = walnut, parent) => { const g = new THREE.BoxGeometry(w, h, d); H.boxUV(g, w, h, d, ...set.WOOD_TILE); const m = mesh(g, mat, parent); m.position.set(x, y, z); return m; };
  {
    // (its top waxed, not lacquered: the lamp a soft sheen on it, not a
    // glare under the drawer)
    const daisTop = walnut.clone(); daisTop.clearcoat = 0.2; daisTop.clearcoatRoughness = 0.4; daisTop.roughness = 0.62; keep(null, daisTop);
    box(DAIS.w, DAIS.h - 2, DAIS.d, 0, -DAIS.h / 2 - 1, DAIS.z, daisTop);
    const plinthM = new THREE.MeshStandardMaterial({ color: 0x0c0a09, roughness: 0.6 }); keep(null, plinthM);
    box(DAIS.w + 3, 2, DAIS.d + 3, 0, -DAIS.h + 1, DAIS.z, plinthM);
    box(DAIS.w + 1.2, 1.4, DAIS.d + 1.2, 0, -0.7, DAIS.z, daisTop);
    const beadX = new THREE.CylinderGeometry(0.45, 0.45, DAIS.w + 1.2, 10); beadX.rotateZ(Math.PI / 2); keep(beadX);
    const beadZ = new THREE.CylinderGeometry(0.45, 0.45, DAIS.d + 1.2, 10); beadZ.rotateX(Math.PI / 2); keep(beadZ);
    [-1, 1].forEach(s => { mesh(beadX, gilt, stage, false).position.set(0, -1.4, DAIS.z + s * (DAIS.d / 2 + 0.6)); mesh(beadZ, gilt, stage, false).position.set(s * (DAIS.w / 2 + 0.6), -1.4, DAIS.z); });
    if (set.tex.badge) {
      const bm = new THREE.MeshPhysicalMaterial({ map: set.tex.badge, transparent: true, alphaTest: 0.4, metalness: 0.6, roughness: 0.3, clearcoat: 0.6 }); keep(null, bm);
      const ar = set.tex.badge.image ? set.tex.badge.image.height / set.tex.badge.image.width : 1;
      const m = mesh(new THREE.PlaneGeometry(11, 11 * ar), bm, stage, false); m.position.set(0, -DAIS.h / 2 - 0.5, DAIS.z + DAIS.d / 2 + 0.05);
    }
  }

  // ---- The desk: a bureau plat at a child's height - a walnut carcass on
  // cabriole legs with gilt sabots, a gilt bead round its top, the top inset
  // with oxblood leather tooled in gold; a drawer in its front.
  const drawer = new THREE.Group();
  const DZ = DESK.d / 2;                       // the carcass's front face
  {
    const { w, d, top, th, over, apron } = DESK;
    const ty = top - th;
    // (its top's walnut quieter than the carcass's: a smooth polish, the
    // grain barely raised, so its edge reads as wood and not beaten metal)
    const topWood = walnut.clone(); topWood.normalScale = new THREE.Vector2(0.08, 0.08); topWood.roughness = 0.5; topWood.clearcoat = 0.35; topWood.clearcoatRoughness = 0.3; keep(null, topWood);
    box(w + 2 * over, th, d + 2 * over, 0, ty + th / 2, 0, topWood);
    // (its leather, tooled: a gold rule and a running border)
    const leather = new THREE.MeshPhysicalMaterial({
      map: texOf(canvas(512, 300, (g, W, Hh) => {
        g.fillStyle = '#3a0c12'; g.fillRect(0, 0, W, Hh);
        g.strokeStyle = '#c9a04e'; g.lineWidth = 3; g.strokeRect(10, 10, W - 20, Hh - 20);
        g.lineWidth = 1.5; g.strokeRect(20, 20, W - 40, Hh - 40);
        g.fillStyle = '#c9a04e'; for (let x = 30; x < W - 24; x += 14) { g.beginPath(); g.arc(x, 15, 1.8, 0, TAU); g.fill(); g.beginPath(); g.arc(x, Hh - 15, 1.8, 0, TAU); g.fill(); }
      }), true),
      roughness: 0.85, clearcoat: 0.05, clearcoatRoughness: 0.7, envMapIntensity: 0.3
    });
    finished(leather, 'pebble', 40, 26, 0.04); keep(null, leather);
    const lt = mesh(new THREE.PlaneGeometry(w - 6, d - 6), leather, stage, false); lt.rotation.x = -Math.PI / 2; lt.position.set(0, top + 0.02, 0);
    // the gilt bead round the top's edge
    const bx = new THREE.CylinderGeometry(0.4, 0.4, w + 2 * over, 10); bx.rotateZ(Math.PI / 2); keep(bx);
    const bz = new THREE.CylinderGeometry(0.4, 0.4, d + 2 * over, 10); bz.rotateX(Math.PI / 2); keep(bz);
    [-1, 1].forEach(s => { mesh(bx, gilt, stage, false).position.set(0, ty + th - 0.3, s * (d / 2 + over)); mesh(bz, gilt, stage, false).position.set(s * (w / 2 + over), ty + th - 0.3, 0); });
    // the carcass: the apron at the sides and the back, the front framed
    // round the drawer's opening
    const ah = ty - apron;
    box(1.6, ah, d, -w / 2 + 0.8, apron + ah / 2, 0);
    box(1.6, ah, d, w / 2 - 0.8, apron + ah / 2, 0);
    box(w, ah, 1.6, 0, apron + ah / 2, -d / 2 + 0.8);
    const ow = DRAWER.w + 0.6, oy0 = DRAWER.y - 0.3, oy1 = DRAWER.y + DRAWER.h + 0.3;
    const side = (w - ow) / 2;
    [-1, 1].forEach(s => box(side, ah, 1.6, s * (ow / 2 + side / 2), apron + ah / 2, DZ - 0.8));
    box(ow, ty - oy1, 1.6, 0, (ty + oy1) / 2, DZ - 0.8);
    box(ow, oy0 - apron, 1.6, 0, (apron + oy0) / 2, DZ - 0.8);
    // (a gilt rule along the apron's foot, and a cartouche either side of
    // the drawer)
    box(w + 0.4, 0.6, 0.6, 0, apron + 0.3, DZ + 0.1, gilt).castShadow = false;
    [-1, 1].forEach(s => {
      const sh = new THREE.Shape(); sh.absellipse(0, 0, 3.4, 1.6, 0, TAU);
      const hole = new THREE.Path(); hole.absellipse(0, 0, 2.6, 1.0, 0, TAU, true); sh.holes.push(hole);
      const g = new THREE.ExtrudeGeometry(sh, { depth: 0.3, bevelEnabled: true, bevelThickness: 0.15, bevelSize: 0.15, bevelSegments: 2, curveSegments: 24 });
      mesh(g, gilt, stage, false).position.set(s * (ow / 2 + side / 2), apron + ah / 2, DZ + 0.05);
    });
    // the legs: cabriole - out at the knee, in at the ankle - each a tube
    // swept down an S, thickest at the knee; a gilt sabot at the foot, a
    // gilt leaf on the knee
    [[-1, -1], [-1, 1], [1, -1], [1, 1]].forEach(([sx, sz]) => {
      const c = new THREE.CatmullRomCurve3([V(0, 0, 0), V(0.9 * sx, -6, 0.9 * sz), V(0.2 * sx, -22, 0.2 * sz), V(-0.6 * sx, -34, -0.6 * sz), V(0.4 * sx, -apron + 2.4, 0.4 * sz)]);
      const g = new THREE.TubeGeometry(c, 40, 1, 10, false);
      const p = g.attributes.position;
      for (let i = 0; i <= 40; i++) {
        const u = i / 40, r = u < 0.2 ? lerp(2.2, 2.5, u / 0.2) : u < 0.75 ? lerp(2.5, 1.25, (u - 0.2) / 0.55) : lerp(1.25, 1.5, (u - 0.75) / 0.25);
        const cp = c.getPointAt(u);
        for (let j = 0; j <= 10; j++) { const k = i * 11 + j; p.setXYZ(k, cp.x + (p.getX(k) - cp.x) * r, cp.y + (p.getY(k) - cp.y) * r, cp.z + (p.getZ(k) - cp.z) * r); }
      }
      g.computeVertexNormals();
      const lx = sx * (w / 2 - 1.8), lz = sz * (d / 2 - 1.8);
      mesh(g, walnut).position.set(lx, apron + 0.2, lz);
      mesh(new THREE.CylinderGeometry(1.7, 1.9, 2.4, 16), gilt).position.set(lx + 0.4 * sx, 1.2, lz + 0.4 * sz);
      const leaf = mesh(new THREE.SphereGeometry(1.4, 14, 10), gilt, stage, false); leaf.scale.set(1, 1.6, 0.5); leaf.position.set(sx * (w / 2 - 1.0), apron - 3.5, sz * (d / 2 - 1.0)); leaf.rotation.y = Math.atan2(sx, sz);
    });
    // the drawer: a walnut front with a gilt pull, a box lined in oxblood
    // velvet; it slides out for the payout
    stage.add(drawer);
    box(DRAWER.w, DRAWER.h, 1.0, 0, DRAWER.y + DRAWER.h / 2, DZ - 0.5, walnut, drawer);
    const pull = mesh(new THREE.TorusGeometry(1.4, 0.22, 8, 24, Math.PI), gilt, drawer); pull.position.set(0, DRAWER.y + DRAWER.h / 2 - 0.3, DZ + 0.3); pull.rotation.z = Math.PI;
    const roseG = new THREE.CylinderGeometry(0.55, 0.55, 0.3, 16); roseG.rotateX(Math.PI / 2);
    [-1.4, 1.4].forEach(x => mesh(roseG, gilt, drawer, false).position.set(x, DRAWER.y + DRAWER.h / 2 - 0.3, DZ + 0.12));
    const velvet = new THREE.MeshPhysicalMaterial({ color: 0x3a0a10, roughness: 0.95, sheen: 1, sheenColor: new THREE.Color(0x8a3040), sheenRoughness: 0.5 }); keep(null, velvet);
    const iw = DRAWER.w - 1.2, idp = DRAWER.depth;
    box(iw, 0.4, idp, 0, DRAWER.y + 0.2, DZ - 1 - idp / 2, walnut, drawer);
    const lin = mesh(new THREE.PlaneGeometry(iw - 1.0, idp - 0.6), velvet, drawer, false); lin.rotation.x = -Math.PI / 2; lin.position.set(0, DRAWER.y + 0.42, DZ - 1 - idp / 2);
    [-1, 1].forEach(s => box(0.5, DRAWER.h - 0.6, idp, s * (iw / 2 - 0.25), DRAWER.y + DRAWER.h / 2 - 0.3, DZ - 1 - idp / 2, walnut, drawer));
    box(iw, DRAWER.h - 0.6, 0.5, 0, DRAWER.y + DRAWER.h / 2 - 0.3, DZ - 1 - idp + 0.25, walnut, drawer);
  }
  // the stool: a gilt frame, an oxblood velvet cushion
  {
    const cm = new THREE.MeshPhysicalMaterial({ color: 0x4a0d16, roughness: 0.9, sheen: 1, sheenColor: new THREE.Color(0x9a3a48) }); keep(null, cm);
    mesh(new THREE.BoxGeometry(STOOL.w, 2.6, STOOL.d), cm).position.set(0, STOOL.y - 1.3, STOOL.z);
    box(STOOL.w + 1, 2, STOOL.d + 1, 0, STOOL.y - 3.6, STOOL.z, gilt);
    const lg = new THREE.CylinderGeometry(0.9, 0.6, STOOL.y - 4.6, 12); keep(lg);
    [-1, 1].forEach(sx => [-1, 1].forEach(sz => mesh(lg, gilt).position.set(sx * (STOOL.w / 2 - 1.5), (STOOL.y - 4.6) / 2, STOOL.z + sz * (STOOL.d / 2 - 1.5))));
  }

  // ---- The lever: a brass arm on a gilt boss at the desk's side, an ivory
  // ball.
  const lever = new THREE.Group();
  lever.position.set(LEVER.x, LEVER.y, LEVER.z);
  stage.add(lever);
  {
    const reach = -DESK.w / 2 - LEVER.x;          // (from the apron's side out)
    const boss = mesh(new THREE.CylinderGeometry(2.0, 2.4, reach, 24), gilt, lever);
    boss.rotation.z = Math.PI / 2; boss.position.x = reach / 2;
    mesh(new THREE.CylinderGeometry(0.5, 0.7, LEVER.len, 14), brass, lever).position.y = LEVER.len / 2;
    const ivory = new THREE.MeshPhysicalMaterial({ color: 0xf1e6c8, roughness: 0.3, clearcoat: 0.8, clearcoatRoughness: 0.1 }); keep(null, ivory);
    mesh(new THREE.SphereGeometry(LEVER.ball, 28, 20), ivory, lever).position.y = LEVER.len + LEVER.ball * 0.8;
    mesh(new THREE.CylinderGeometry(0.85, 0.85, 0.8, 16), gilt, lever).position.y = LEVER.len;
  }
  const ballR = LEVER.len + LEVER.ball * 0.8;
  const ballAt = ang => V(LEVER.x, LEVER.y + Math.cos(ang) * ballR, LEVER.z + Math.sin(ang) * ballR);

  // ---- The bell: brass with an ebony handle, on the desk by his left hand
  // (its origin where it is held, so it swings from the hand).
  const bell = new THREE.Group();
  stage.add(bell);
  const GRIP = BELL.h + BELL.handle * 0.5;
  const bellBody = new THREE.Group(); bellBody.position.y = -GRIP; bell.add(bellBody);
  {
    const prof = [[0.2, 0], [BELL.r, 0.15], [BELL.r - 0.15, 0.9], [BELL.r * 0.72, 2.6], [BELL.r * 0.56, 4.4], [BELL.r * 0.5, 4.7], [0.8, BELL.h], [0.01, BELL.h]].map(([r, y]) => new THREE.Vector2(r, y));
    const shellM = new THREE.MeshStandardMaterial({ color: 0xd8ae58, metalness: 1, roughness: 0.22, side: THREE.DoubleSide }); keep(null, shellM);
    mesh(new THREE.LatheGeometry(prof, 40), shellM, bellBody);
    const ebony = new THREE.MeshPhysicalMaterial({ color: 0x120c0a, roughness: 0.3, clearcoat: 0.8 }); keep(null, ebony);
    mesh(new THREE.CylinderGeometry(0.6, 0.75, BELL.handle, 16), ebony, bellBody).position.y = BELL.h + BELL.handle / 2;
    mesh(new THREE.SphereGeometry(0.9, 16, 12), ebony, bellBody).position.y = BELL.h + BELL.handle + 0.4;
    mesh(new THREE.SphereGeometry(0.5, 12, 10), brass, bellBody).position.y = 0.8;
  }
  const bellRest = V(BELL.x, DESK.top + GRIP + 0.02, BELL.z);

  // =================================================================
  // ---- The figure. The body turns on his hips (seated: the torso, the
  // head, the arms); his legs and the stool stay put.
  const body = new THREE.Group(); body.position.set(0, HIP.y, HIP.z); stage.add(body);
  // His profile (radius, height above the hips), and the coat's section: a
  // superellipse in front (flat across the chest, where the window is), an
  // ellipse behind, 0.64 as deep as wide.
  const PROF = [[13.0, -2], [12.6, 1], [11.6, 5], [11.2, 8], [11.6, 13], [12.2, 19], [12.5, 25], [12.3, 30], [11.6, 33.5], [9.6, 36.2], [6.8, 38.4], [4.4, 39.6], [3.6, 40.2]];
  const DEP = 0.64;
  // (the coat over it: a shell of its own, standing off the waistcoat, its
  // skirts flaring over the stool's cushion, open down the front)
  const PROFC = [[14.6, -3.2], [13.9, -1], [12.9, 2], [12.1, 5], [11.8, 8], [12.2, 13], [12.8, 19], [13.1, 25], [12.9, 30], [12.2, 33.5], [10.2, 36.2], [7.4, 38.4], [5.6, 39.2], [4.5, 39.8]];
  const radAt = (P, y) => {
    if (y <= P[0][1]) return P[0][0];
    for (let i = 0; i + 1 < P.length; i++) if (y <= P[i + 1][1]) return lerp(P[i][0], P[i + 1][0], clamp01((y - P[i][1]) / (P[i + 1][1] - P[i][1])));
    return P[P.length - 1][0];
  };
  function profR(y) { return radAt(PROF, y); }
  function coatR(y) { return radAt(PROFC, y); }
  function sup(a, r) {
    const s = Math.sin(a), c = Math.cos(a), n = c > 0 ? 3 : 2;
    return [r * Math.sign(s) * Math.abs(s) ** (2 / n), r * DEP * Math.sign(c) * Math.abs(c) ** (2 / n)];
  }
  function angOf(x, z, r) { return z > 0 ? Math.atan2(Math.sign(x) * Math.min(1, Math.abs(x / r)) ** 1.5, Math.min(1, z / (DEP * r)) ** 1.5) : Math.atan2(x, z / DEP); }
  function frontZ(y, x) { const r = profR(y); return DEP * r * Math.max(0, 1 - Math.abs(x / r) ** 3) ** (1 / 3); }
  // the coat's opening, each side of the front: wide over the chest and the
  // waistcoat, closing toward the collar
  function openAt(y) { return y < 5 ? lerp(1.55, 0.95, (y + 3.2) / 8.2) : y < 30 ? 0.95 : y < 37 ? lerp(0.95, 0.45, (y - 30) / 7) : 0.45; }
  const lathe = (P, cut) => {
    const g = new THREE.LatheGeometry(P.map(([r, y]) => new THREE.Vector2(r, y)), 128);
    const p = g.attributes.position;
    for (let i = 0; i < p.count; i++) { const x = p.getX(i), z = p.getZ(i), r = Math.hypot(x, z), [sx, sz] = sup(Math.atan2(x, z), r); p.setX(i, sx); p.setZ(i, sz); }
    if (cut) {
      const idx = g.index, keepIdx = [];
      for (let i = 0; i < idx.count; i += 3) {
        const a = idx.getX(i), b = idx.getX(i + 1), c = idx.getX(i + 2);
        const cx = (p.getX(a) + p.getX(b) + p.getX(c)) / 3, cz = (p.getZ(a) + p.getZ(b) + p.getZ(c)) / 3, cy = (p.getY(a) + p.getY(b) + p.getY(c)) / 3;
        if (!(Math.abs(angOf(cx, cz, radAt(P, cy))) < openAt(cy))) keepIdx.push(a, b, c);
      }
      g.setIndex(keepIdx);
    }
    g.computeVertexNormals();
    return g;
  };
  const torso = (() => {
    const g = lathe(PROF, false), p = g.attributes.position;
    // (a second set of UVs, flat on the front, for the window's hole)
    const uv1 = new Float32Array(p.count * 2);
    for (let i = 0; i < p.count; i++) { uv1[i * 2] = (p.getX(i) + 20) / 40; uv1[i * 2 + 1] = (p.getY(i) + 2) / 44; }
    g.setAttribute('uv1', new THREE.BufferAttribute(uv1, 2));
    return g;
  })();
  keep(torso);
  const holeTex = texOf(canvas(256, 256, (g, W, Hh) => {
    g.fillStyle = '#fff'; g.fillRect(0, 0, W, Hh);
    const x0 = ((-WIN.w / 2 - 0.5 + 20) / 40) * W, x1 = ((WIN.w / 2 + 0.5 + 20) / 40) * W;
    const y0 = Hh - ((WIN.y + WIN.h / 2 + 0.5 + 2) / 44) * Hh, y1 = Hh - ((WIN.y - WIN.h / 2 - 0.5 + 2) / 44) * Hh;
    g.fillStyle = '#000'; g.beginPath(); g.roundRect(x0, y0, x1 - x0, y1 - y0, 4); g.fill();
  }), false);
  holeTex.channel = 1;
  const vestCut = vest.clone(); vestCut.alphaMap = holeTex; vestCut.alphaTest = 0.5; vestCut.side = THREE.DoubleSide; keep(null, vestCut);
  const coatSide = coat.clone(); coatSide.side = THREE.DoubleSide; keep(null, coatSide);
  { const m = new THREE.Mesh(torso, vestCut); m.castShadow = true; m.receiveShadow = true; body.add(m); }
  { const g = lathe(PROFC, true); keep(g); const m = new THREE.Mesh(g, coatSide); m.castShadow = true; m.receiveShadow = true; body.add(m); }
  // (a point on the coat at angle a round, height y, off it by lift; and
  // the way out of it there)
  const onCoat = (a, y, lift) => { const r = coatR(y), [x, z] = sup(a, r), n = V(x / (r * r), 0, z / (r * DEP) ** 2).normalize(); return { p: V(x, y, z).addScaledVector(n, lift), n }; };
  // A ribbon laid on a surface: the points, the surface's normal at each,
  // the width.
  const ribbon = (pts, nrm, width, mat, parent) => {
    const n = pts.length, pos = new Float32Array(n * 6), uv = new Float32Array(n * 4), idx = [];
    let along = 0;
    for (let i = 0; i < n; i++) {
      const t = (i + 1 < n ? pts[i + 1].clone().sub(pts[i]) : pts[i].clone().sub(pts[i - 1])).normalize();
      const sd = nrm[i].clone().cross(t).normalize().multiplyScalar(width / 2);
      const a = pts[i].clone().add(sd), b = pts[i].clone().sub(sd);
      pos.set([a.x, a.y, a.z, b.x, b.y, b.z], i * 6);
      if (i) along += pts[i].distanceTo(pts[i - 1]);
      uv.set([0, along / width / 4, 1, along / width / 4], i * 4);
      if (i + 1 < n) { const k = i * 2; idx.push(k, k + 1, k + 2, k + 1, k + 3, k + 2); }
    }
    const g = new THREE.BufferGeometry(); g.setAttribute('position', new THREE.BufferAttribute(pos, 3)); g.setAttribute('uv', new THREE.BufferAttribute(uv, 2)); g.setIndex(idx); g.computeVertexNormals();
    return mesh(g, mat, parent || body);
  };
  // the braid down the coat's fronts, and its buttons
  {
    const bg = new THREE.SphereGeometry(0.55, 14, 10); bg.scale(1, 1, 0.55); keep(bg);
    [-1, 1].forEach(s => {
      const pts = [], nrm = [];
      for (let k = 0; k <= 64; k++) { const y = -3.2 + (k / 64) * 42.2, c = onCoat(s * (openAt(y) + 0.035), y, 0.08); pts.push(c.p); nrm.push(c.n); }
      ribbon(pts, nrm, 1.0, braid);
      for (let k = 0; k < 6; k++) {
        const y = 8 + k * 4.4, c = onCoat(s * (openAt(y) + 0.11), y, 0.25);
        const b = new THREE.Mesh(bg, gilt); b.position.copy(c.p); b.quaternion.setFromUnitVectors(V(0, 0, 1), c.n); body.add(b);
      }
    });
  }
  // (the braid round the skirts' hem)
  {
    const pts = [], nrm = [], a0 = openAt(-3.2) + 0.035;
    for (let k = 0; k <= 96; k++) { const a = lerp(a0, TAU - a0, k / 96), c = onCoat(a, -2.7, 0.06); pts.push(c.p); nrm.push(c.n); }
    ribbon(pts, nrm, 1.0, braid);
  }
  // the window: a gilt bezel, the glass, and the cavity behind it - black
  // velvet, the reels
  const winZ = frontZ(WIN.y, 0);
  const bend = (g, y0) => { const p = g.attributes.position; for (let i = 0; i < p.count; i++) p.setZ(i, p.getZ(i) + frontZ(y0 + p.getY(i), p.getX(i)) - winZ); g.computeVertexNormals(); return g; };
  const reels = [], reelMats = [];
  let windowGlow = null, lineShade = null;
  {
    const rr = (w, h, r) => { const s = new THREE.Shape(); s.moveTo(-w + r, -h); s.lineTo(w - r, -h); s.quadraticCurveTo(w, -h, w, -h + r); s.lineTo(w, h - r); s.quadraticCurveTo(w, h, w - r, h); s.lineTo(-w + r, h); s.quadraticCurveTo(-w, h, -w, h - r); s.lineTo(-w, -h + r); s.quadraticCurveTo(-w, -h, -w + r, -h); return s; };
    // (the bezel: a flat gilt plate round the glass, a bead moulding at its
    // inner edge and a finer one at its outer, all laid on the waistcoat's
    // curve)
    const plate = rr(WIN.w / 2 + 1.3, WIN.h / 2 + 1.3, 1.3);
    plate.holes.push(new THREE.Path(rr(WIN.w / 2 + 0.2, WIN.h / 2 + 0.2, 0.7).getPoints(16).reverse()));
    const pg = new THREE.ShapeGeometry(plate, 24); keep(pg);
    { const q = pg.attributes.position; for (let i = 0; i < q.count; i++) q.setZ(i, frontZ(WIN.y + q.getY(i), q.getX(i)) + 0.18); pg.computeVertexNormals(); }
    mesh(pg, gilt, body, false).position.set(0, WIN.y, 0);
    const bead = (w, h, r, rad, lift) => {
      const pts = rr(w, h, r).getSpacedPoints(160).slice(0, -1).map(q => V(q.x, WIN.y + q.y, frontZ(WIN.y + q.y, q.x) + lift));
      return mesh(new THREE.TubeGeometry(new THREE.CatmullRomCurve3(pts, true), 240, rad, 10, true), gilt, body);
    };
    bead(WIN.w / 2 + 0.25, WIN.h / 2 + 0.25, 0.75, 0.42, 0.3);
    bead(WIN.w / 2 + 1.3, WIN.h / 2 + 1.3, 1.3, 0.22, 0.2);
    const gm = new THREE.MeshPhysicalMaterial({ color: 0x000000, roughness: 0.04, transparent: true, opacity: 0.1, clearcoat: 1, clearcoatRoughness: 0.03, envMapIntensity: 1.4, depthWrite: false }); keep(null, gm);
    mesh(bend(new THREE.PlaneGeometry(WIN.w, WIN.h, 24, 1), WIN.y), gm, body, false).position.set(0, WIN.y, winZ + 0.2);
    const vel = new THREE.MeshBasicMaterial({ color: 0x040303, side: THREE.BackSide }); keep(null, vel);
    mesh(new THREE.BoxGeometry(WIN.w + 1.2, 2 * REEL.r + 1.6, 2 * REEL.r + 3), vel, body, false).position.set(0, WIN.y, winZ - 1.2 - REEL.r - 1.2);
    // the reels: drums with their strips (painted upside down: read off the
    // drum's front as it comes down), brass ends, on one arbor
    const strip = i => canvas(256, 2048, (g, W, Hh) => {
      g.fillStyle = '#efe6d2'; g.fillRect(0, 0, W, Hh);
      for (let k = 0; k < NS; k++) {
        const y0 = (k / NS) * Hh, h = Hh / NS, cy = y0 + h / 2;
        g.strokeStyle = '#b8913f'; g.lineWidth = 3; g.beginPath(); g.moveTo(0, y0 + 1.5); g.lineTo(W, y0 + 1.5); g.stroke();
        g.save(); g.translate(W / 2, cy); g.scale(1, -1); drawSymbol(g, STRIPS[i][k], 0, 0, h * 0.74); g.restore();
      }
      g.fillStyle = '#b8913f'; g.fillRect(6, 0, 4, Hh); g.fillRect(W - 10, 0, 4, Hh);
    });
    for (let i = 0; i < 3; i++) {
      const sharp = strip(i);
      const blur = canvas(sharp.width, sharp.height, (g) => { for (let k = -6; k <= 6; k++) { g.globalAlpha = 1 / 13; g.drawImage(sharp, 0, k * 14); } g.globalAlpha = 1; });
      const mapS = texOf(sharp, true), mapB = texOf(blur, true);
      mapS.wrapT = mapB.wrapT = THREE.RepeatWrapping;
      const uBlur = { value: 0 };
      const m = new THREE.MeshPhysicalMaterial({ map: mapS, roughness: 0.3, clearcoat: 0.8, clearcoatRoughness: 0.1, emissive: 0xffb84a, emissiveIntensity: 0, emissiveMap: mapS });
      m.onBeforeCompile = sh => {
        sh.uniforms.uBlur = uBlur; sh.uniforms.mapB = { value: mapB };
        sh.fragmentShader = 'uniform float uBlur;\nuniform sampler2D mapB;\n' + sh.fragmentShader.replace('#include <map_fragment>', `#ifdef USE_MAP
          vec4 sampledDiffuseColor = mix(texture2D(map, vMapUv), texture2D(mapB, vMapUv), uBlur);
          diffuseColor *= sampledDiffuseColor;
        #endif`);
      };
      m.customProgramCacheKey = () => 'slot-reel';
      keep(null, m);
      const drum = new THREE.Group();
      drum.position.set((i - 1) * (REEL.w + REEL.gap), WIN.y, winZ - 1.0 - REEL.r);
      body.add(drum);
      const cg = new THREE.CylinderGeometry(REEL.r, REEL.r, REEL.w, 96, 1, true);
      { const uv = cg.attributes.uv; for (let k = 0; k < uv.count; k++) uv.setXY(k, 1 - uv.getY(k), 1 - uv.getX(k)); }
      cg.rotateZ(Math.PI / 2);
      const face = new THREE.Mesh(cg, m); face.receiveShadow = true; drum.add(face); keep(cg);
      const eg = new THREE.CylinderGeometry(REEL.r + 0.18, REEL.r + 0.18, 0.22, 48); eg.rotateZ(Math.PI / 2); keep(eg);
      [-1, 1].forEach(s => { const e = new THREE.Mesh(eg, brass); e.position.x = s * (REEL.w / 2 + 0.11); drum.add(e); });
      reels.push({ drum, uBlur });
      reelMats.push(m);
    }
    // the payline: a fine gilt wire across the window
    const wire = mesh(new THREE.CylinderGeometry(0.08, 0.08, WIN.w, 6), gilt, body, false); wire.rotation.z = Math.PI / 2; wire.position.set(0, WIN.y, winZ - 0.1);
    {
      const shade = texOf(canvas(8, 128, (g, W, Hh) => { const gr = g.createLinearGradient(0, 0, 0, Hh); gr.addColorStop(0, 'rgba(0,0,0,1)'); gr.addColorStop(0.36, 'rgba(0,0,0,0.85)'); gr.addColorStop(0.43, 'rgba(0,0,0,0)'); gr.addColorStop(0.57, 'rgba(0,0,0,0)'); gr.addColorStop(0.64, 'rgba(0,0,0,0.85)'); gr.addColorStop(1, 'rgba(0,0,0,1)'); g.fillStyle = gr; g.fillRect(0, 0, W, Hh); }), false);
      lineShade = mesh(bend(new THREE.PlaneGeometry(WIN.w, WIN.h, 24, 1), WIN.y), new THREE.MeshBasicMaterial({ color: 0x000000, alphaMap: shade, transparent: true, opacity: 0, depthWrite: false }), body, false);
      lineShade.position.set(0, WIN.y, winZ - 0.05); keep(null, lineShade.material);
    }
    // The Jackpot's light out of the window: a glow on the glass (its pool
    // on the desk is a lamp, below)
    if (tier === 'vault') {
      const gt = texOf(canvas(256, 256, (g, W, Hh) => {
        // (a ring round the bezel - the window itself left clear - and a
        // soft halo out from it)
        const r = g.createRadialGradient(W / 2, Hh / 2, 0, W / 2, Hh / 2, W / 2); r.addColorStop(0, 'rgba(255,180,80,0)'); r.addColorStop(0.3, 'rgba(255,180,80,0)'); r.addColorStop(0.42, 'rgba(255,190,90,0.45)'); r.addColorStop(1, 'rgba(255,160,60,0)');
        g.fillStyle = r; g.fillRect(0, 0, W, Hh);
        g.filter = 'blur(9px)'; g.strokeStyle = 'rgba(255,214,140,0.9)'; g.lineWidth = 14;
        const w2 = W / 2.6 / 2 + 14, h2 = Hh / 3.2 / 2 + 14; g.beginPath(); g.roundRect(W / 2 - w2, Hh / 2 - h2, 2 * w2, 2 * h2, 18); g.stroke();
      }), true);
      const gmat = new THREE.MeshBasicMaterial({ map: gt, transparent: true, opacity: 0, depthWrite: false, blending: THREE.AdditiveBlending, toneMapped: false }); keep(null, gmat);
      windowGlow = mesh(new THREE.PlaneGeometry(WIN.w * 2.6, WIN.h * 3.2), gmat, body, false); windowGlow.position.set(0, WIN.y, winZ + 0.6);
    }
  }
  function drawSymbol(g, s, cx, cy, h) {
    g.save(); g.translate(cx, cy);
    const gold = '#c9a04e', ox = '#7a1220', ink = '#1a1210';
    if (s === 'seven') {
      g.font = `700 ${h * 1.05}px Georgia, "Times New Roman", serif`; g.textAlign = 'center'; g.textBaseline = 'middle';
      g.lineWidth = h * 0.08; g.strokeStyle = gold; g.strokeText('7', 0, h * 0.04); g.fillStyle = ox; g.fillText('7', 0, h * 0.04);
    } else if (s === 'badge') {
      const img = set.tex.badge && set.tex.badge.image;
      if (img) { const w = h * 0.95, hh = (w * img.height) / img.width; g.drawImage(img, -w / 2, -hh / 2, w, hh); }
      else { g.fillStyle = gold; g.beginPath(); g.arc(0, 0, h * 0.42, 0, TAU); g.fill(); }
    } else if (s === 'crown') {
      g.fillStyle = gold; g.strokeStyle = '#7a5a20'; g.lineWidth = h * 0.03;
      const w = h * 0.8;
      g.beginPath(); g.moveTo(-w / 2, h * 0.25); g.lineTo(-w / 2, -h * 0.12); g.lineTo(-w / 4, h * 0.05); g.lineTo(0, -h * 0.3); g.lineTo(w / 4, h * 0.05); g.lineTo(w / 2, -h * 0.12); g.lineTo(w / 2, h * 0.25); g.closePath(); g.fill(); g.stroke();
      [-w / 2, 0, w / 2].forEach((x, k) => { g.beginPath(); g.arc(x, k === 1 ? -h * 0.33 : -h * 0.15, h * 0.06, 0, TAU); g.fill(); });
      g.fillStyle = ox; g.fillRect(-w / 2, h * 0.17, w, h * 0.08);
    } else if (s === 'bell') {
      g.fillStyle = gold; g.strokeStyle = '#7a5a20'; g.lineWidth = h * 0.03;
      g.beginPath(); g.moveTo(-h * 0.36, h * 0.24); g.quadraticCurveTo(-h * 0.3, -h * 0.3, 0, -h * 0.32); g.quadraticCurveTo(h * 0.3, -h * 0.3, h * 0.36, h * 0.24); g.closePath(); g.fill(); g.stroke();
      g.fillRect(-h * 0.42, h * 0.22, h * 0.84, h * 0.07);
      g.beginPath(); g.arc(0, h * 0.34, h * 0.07, 0, TAU); g.fill();
      g.fillStyle = ink; g.fillRect(-h * 0.035, -h * 0.45, h * 0.07, h * 0.14);
    } else if (s === 'chip') {
      g.fillStyle = ox; g.beginPath(); g.arc(0, 0, h * 0.4, 0, TAU); g.fill();
      g.fillStyle = '#f1e7d0'; for (let k = 0; k < 8; k++) { g.save(); g.rotate((k / 8) * TAU); g.fillRect(-h * 0.05, -h * 0.4, h * 0.1, h * 0.1); g.restore(); }
      g.strokeStyle = gold; g.lineWidth = h * 0.03; g.beginPath(); g.arc(0, 0, h * 0.26, 0, TAU); g.stroke();
      g.fillStyle = gold; g.font = `700 ${h * 0.2}px Georgia, serif`; g.textAlign = 'center'; g.textBaseline = 'middle'; g.fillText('DRO', 0, h * 0.01);
    } else if (s === 'die') {
      const w = h * 0.66;
      g.fillStyle = '#a3192b'; g.strokeStyle = '#4e0a14'; g.lineWidth = h * 0.03;
      g.beginPath(); g.roundRect(-w / 2, -w / 2, w, w, w * 0.18); g.fill(); g.stroke();
      g.fillStyle = 'rgba(255,255,255,0.18)'; g.beginPath(); g.roundRect(-w / 2 + w * 0.08, -w / 2 + w * 0.06, w * 0.84, w * 0.3, w * 0.12); g.fill();
      g.fillStyle = '#fbf6ee';
      [[-1, -1], [1, -1], [0, 0], [-1, 1], [1, 1]].forEach(([a, b]) => { g.beginPath(); g.arc(a * w * 0.26, b * w * 0.26, w * 0.1, 0, TAU); g.fill(); });
    }
    g.restore();
  }

  // the neck and the collar (a band of white linen), the lace ruff over it
  // and the lace jabot falling from it
  {
    mesh(new THREE.CylinderGeometry(2.9, 3.2, 6.5, 24), bisque, body).position.set(0, NECKY + 0.6, 0.8);
    const collar = mesh(new THREE.CylinderGeometry(3.7, 4.1, 2.6, 28, 1, true), linen, body); collar.scale.set(1, 1, 0.9); collar.position.set(0, 39.0, 0.6);
    // (the ruff: lace gathered round the throat, standing open under the
    // chin, its scalloped edge up)
    {
      const g = new THREE.CylinderGeometry(4.5, 3.6, 1.6, 144, 3, true), p = g.attributes.position, uv = g.attributes.uv;
      for (let i = 0; i < p.count; i++) { const x = p.getX(i), y = p.getY(i), z = p.getZ(i), f = clamp01((y + 0.8) / 1.6), k = 1 + 0.1 * f * Math.sin(Math.atan2(x, z) * 22); p.setX(i, x * k); p.setZ(i, z * k); uv.setXY(i, uv.getX(i) * 6, 1 - uv.getY(i)); }
      g.computeVertexNormals();
      const ruff = mesh(g, lace, body); ruff.scale.set(1, 1, 0.9); ruff.position.set(0, 40.5, 0.7);
    }
    // (two tiers of lace, gathered at the throat and falling in pleats
    // down the waistcoat, widening, to just over the window; the hem
    // scalloped)
    for (let k = 0; k < 2; k++) {
      const top = 38.3 - k * 1.2, len = k ? 3.4 : 5.3, W0 = 2.4 - k * 0.2, W1 = 4.4 - k * 0.5;
      const g = new THREE.PlaneGeometry(1, 1, 56, 10), p = g.attributes.position, uv = g.attributes.uv;
      for (let i = 0; i < p.count; i++) {
        const u = p.getX(i) + 0.5, v = p.getY(i) + 0.5, f = 1 - v, wd = lerp(W0, W1, f), x = (u - 0.5) * wd, y = top - f * len;
        const pleat = 0.32 * (0.5 - 0.5 * Math.cos(u * TAU * 3.5)) * (0.35 + 0.65 * f);
        p.setXYZ(i, x, y, frontZ(y, x) + 0.3 + k * 0.35 + pleat + 0.35 * f * f);
        uv.setXY(i, u * wd / 4.4, (v * len) / 2.2);
      }
      g.computeVertexNormals();
      mesh(g, lace, body);
    }
  }

  // ---- The head: bisque, sculpted round (a child's - a high forehead,
  // full cheeks, a small nose and chin), the face painted; the eyes glass,
  // set behind almond openings with lids that close over them as a doll's
  // do; his own brown curls.
  const neckPivot = new THREE.Group(); neckPivot.position.set(0, NECKY, 0.8); body.add(neckPivot);
  const headG = new THREE.Group(); headG.position.set(0, HEAD.up, HEAD.fwd); headG.rotation.order = 'YXZ'; neckPivot.add(headG);
  const EYE = { x: 0.3, y: -0.07, w: 0.16, h: 0.088, r: 1.5 };
  const gauss = (x, y, cx, cy, sx, sy) => Math.exp(-(((x - cx) / sx) ** 2) - (((y - cy) / sy) ** 2));
  // (the face's relief, on the unit sphere, in front)
  const relief = (x, y) => {
    let dz = 0;
    // the brow, rounded, and its soft ridge over each eye; the orbits
    dz += 0.03 * gauss(x, y, 0, 0.3, 0.6, 0.12);
    dz += 0.02 * (gauss(x, y, 0.28, 0.1, 0.16, 0.05) + gauss(x, y, -0.28, 0.1, 0.16, 0.05));
    dz -= 0.07 * (gauss(x, y, EYE.x, EYE.y, 0.17, 0.12) + gauss(x, y, -EYE.x, EYE.y, 0.17, 0.12));
    // the nose: a small bridge, a round tip turned up, its wings
    dz += 0.07 * gauss(x, 0, 0, 0, 0.075, 1) * clamp01((0.02 - y) / 0.22) * clamp01((y + 0.27) / 0.08);
    dz += 0.05 * gauss(x, y, 0, -0.215, 0.07, 0.055);
    dz += 0.022 * (gauss(x, y, 0.065, -0.245, 0.04, 0.035) + gauss(x, y, -0.065, -0.245, 0.04, 0.035));
    // the cheeks: full, low
    dz += 0.075 * (gauss(x, y, 0.38, -0.2, 0.19, 0.16) + gauss(x, y, -0.38, -0.2, 0.19, 0.16));
    // the philtrum; the lips, the lower the fuller, parted by a line; the
    // groove under them; the chin, a small round
    dz -= 0.012 * gauss(x, y, 0, -0.33, 0.028, 0.035);
    dz += 0.028 * gauss(x, y, 0, -0.405, 0.11, 0.028);
    dz += 0.034 * gauss(x, y, 0, -0.47, 0.095, 0.03);
    dz -= 0.02 * gauss(x, y, 0, -0.435, 0.1, 0.009);
    dz -= 0.022 * gauss(x, y, 0, -0.56, 0.12, 0.03);
    dz += 0.05 * gauss(x, y, 0, -0.69, 0.13, 0.08);
    return dz;
  };
  const unitZ = (x, y) => Math.sqrt(Math.max(0, 1 - x * x - y * y));
  const FS = 1024;
  const P = (x, y) => [(0.5 + x * 0.5) * FS, (0.5 - y * 0.5) * FS];
  // (an eye's opening: an almond, the upper lid's arch higher than the
  // lower's)
  const almondPts = s => {
    const [cx, cy] = P(s * EYE.x, EYE.y), rx = EYE.w * FS / 2, ry = EYE.h * FS / 2;
    return { cx, cy, rx, ry, upper: [cx - rx, cy + ry * 0.1, cx - rx * 0.6, cy - ry * 1.35, cx + rx * 0.5, cy - ry * 1.4, cx + rx, cy - ry * 0.05], lower: [cx + rx, cy - ry * 0.05, cx + rx * 0.55, cy + ry * 1.1, cx - rx * 0.55, cy + ry * 1.15, cx - rx, cy + ry * 0.1] };
  };
  const almond = (c, s) => { const a = almondPts(s); c.beginPath(); c.moveTo(a.upper[0], a.upper[1]); c.bezierCurveTo(...a.upper.slice(2)); c.bezierCurveTo(...a.lower.slice(2)); c.closePath(); };
  {
    const g = new THREE.SphereGeometry(1, 160, 120);
    const p = g.attributes.position, uv = g.attributes.uv;
    for (let i = 0; i < p.count; i++) {
      let x = p.getX(i), z = p.getZ(i);
      const y = p.getY(i), fr = clamp01(z * 1.6);
      // the jaw: a child's - only a little narrower below the cheeks
      const jaw = clamp01((-y - 0.12) / 0.8);
      x *= 1 - 0.3 * jaw * jaw; z *= 1 - 0.08 * jaw;
      z += relief(x, y) * fr;
      p.setXYZ(i, x * HEAD.rx, y * HEAD.ry, z * HEAD.rz);
      uv.setXY(i, 0.5 + x * 0.5, 0.5 + y * 0.5);
    }
    g.computeVertexNormals();
    // the face, painted
    const face = canvas(FS, FS, (c) => {
      c.fillStyle = '#ecc6ab'; c.fillRect(0, 0, FS, FS);
      const blob = (x, y, rx, ry, col) => { const [px, py] = P(x, y); const gr = c.createRadialGradient(px, py, 0, px, py, rx * FS / 2); gr.addColorStop(0, col); gr.addColorStop(1, 'rgba(0,0,0,0)'); c.save(); c.translate(px, py); c.scale(1, ry / rx); c.translate(-px, -py); c.fillStyle = gr; c.beginPath(); c.arc(px, py, rx * FS / 2, 0, TAU); c.fill(); c.restore(); };
      // (rosy: the cheeks high and strong, the tip of the nose, the chin,
      // the lids)
      [-1, 1].forEach(s => { blob(s * 0.39, -0.21, 0.44, 0.3, 'rgba(226,112,108,0.3)'); blob(s * 0.38, -0.2, 0.22, 0.15, 'rgba(226,104,104,0.18)'); });
      blob(0, -0.22, 0.08, 0.06, 'rgba(226,118,108,0.3)');
      blob(0, -0.7, 0.15, 0.09, 'rgba(226,118,108,0.22)');
      [-1, 1].forEach(s => blob(s * EYE.x, EYE.y + 0.07, 0.2, 0.08, 'rgba(214,132,124,0.22)'));
      // (each lid's crease, a soft shade over the opening; the opening's
      // edge a deeper rose, under its rims)
      c.save(); c.filter = 'blur(5px)';
      [-1, 1].forEach(s => {
        const a = almondPts(s);
        c.strokeStyle = 'rgba(150,92,84,0.4)'; c.lineWidth = 9;
        c.beginPath(); c.moveTo(a.upper[0], a.upper[1] - a.ry * 0.5); c.bezierCurveTo(a.upper[2], a.upper[3] - a.ry * 0.75, a.upper[4], a.upper[5] - a.ry * 0.75, a.upper[6], a.upper[7] - a.ry * 0.5); c.stroke();
      });
      c.restore();
      [-1, 1].forEach(s => { c.strokeStyle = 'rgba(176,110,100,0.7)'; c.lineWidth = 8; almond(c, s); c.stroke(); });
      // (the nostrils)
      [-1, 1].forEach(s => blob(s * 0.045, -0.255, 0.024, 0.016, 'rgba(116,48,48,0.6)'));
      // the mouth: small, the upper lip a bow, the lower full
      const M = (x, y) => P(x, -0.435 + y), mw = 0.1;
      c.fillStyle = '#b3505a';
      c.beginPath(); c.moveTo(...M(-mw, 0));
      c.quadraticCurveTo(...M(-0.055, 0.02), ...M(-0.024, 0.027)); c.quadraticCurveTo(...M(0, 0.017), ...M(0.024, 0.027));
      c.quadraticCurveTo(...M(0.055, 0.02), ...M(mw, 0)); c.quadraticCurveTo(...M(0, -0.006), ...M(-mw, 0));
      c.fill();
      c.fillStyle = '#c4646c';
      c.beginPath(); c.moveTo(...M(-mw * 0.85, -0.002)); c.quadraticCurveTo(...M(-0.05, -0.044), ...M(0, -0.046)); c.quadraticCurveTo(...M(0.05, -0.044), ...M(mw * 0.85, -0.002)); c.quadraticCurveTo(...M(0, -0.008), ...M(-mw * 0.88, -0.002));
      c.fill();
      blob(0.01, -0.435 - 0.024, 0.04, 0.012, 'rgba(255,214,214,0.35)');
      c.strokeStyle = 'rgba(92,26,36,0.75)'; c.lineWidth = 2.5; c.beginPath(); c.moveTo(...M(-mw, 0)); c.quadraticCurveTo(...M(0, -0.008), ...M(mw, 0)); c.stroke();
      // the brows: fine strokes of light brown, arched
      c.strokeStyle = 'rgba(120,84,60,0.7)'; c.lineCap = 'round';
      [-1, 1].forEach(s => {
        for (let k = 0; k < 20; k++) {
          const t = k / 19, x = s * (0.15 + 0.3 * t), y = 0.19 + 0.04 * Math.sin(t * Math.PI * 0.9) - 0.045 * t;
          const [px, py] = P(x, y);
          c.lineWidth = 3.2 - 1.8 * t; c.beginPath(); c.moveTo(px - s * 3, py + 5); c.lineTo(px + s * 8, py - 4); c.stroke();
        }
      });
    });
    // (the openings: cut out of the bisque, the eyes behind them)
    const cut = canvas(FS, FS, (c) => { c.fillStyle = '#fff'; c.fillRect(0, 0, FS, FS); c.fillStyle = '#000'; [-1, 1].forEach(s => { almond(c, s); c.fill(); }); });
    const skin = bisque.clone(); skin.color.setHex(0xffffff); skin.map = texOf(face, true); skin.alphaMap = texOf(cut, false); skin.alphaTest = 0.5; keep(null, skin);
    mesh(g, skin, headG);
  }
  // the eyes: glass over a painted iris (brown, the fibres drawn in), each
  // in a socket lined dark; the upper lid a shell of bisque inside the
  // opening that closes down over the eye
  const eyes = [], lids = [], glints = [];
  {
    const TS = 512;
    const iris = texOf(canvas(TS, TS, (c) => {
      c.fillStyle = '#f4f1ec'; c.fillRect(0, 0, TS, TS);
      const cx = TS * 0.25, cy = TS / 2, R = TS * 0.062;
      c.save(); c.translate(cx, cy); c.scale(1, 2); c.translate(-cx, -cy);
      const gr = c.createRadialGradient(cx, cy, 0, cx, cy, R);
      gr.addColorStop(0, '#0a0706'); gr.addColorStop(0.36, '#0a0706'); gr.addColorStop(0.4, '#4a2a14'); gr.addColorStop(0.75, '#7a4a22'); gr.addColorStop(0.92, '#3a2210'); gr.addColorStop(1, '#f4f1ec');
      c.fillStyle = gr; c.beginPath(); c.arc(cx, cy, R, 0, TAU); c.fill();
      c.strokeStyle = 'rgba(200,150,90,0.35)'; c.lineWidth = 1;
      for (let k = 0; k < 48; k++) { const a = (k / 48) * TAU; c.beginPath(); c.moveTo(cx + Math.cos(a) * R * 0.42, cy + Math.sin(a) * R * 0.42); c.lineTo(cx + Math.cos(a) * R * 0.9, cy + Math.sin(a) * R * 0.9); c.stroke(); }
      c.restore();
    }), true);
    // (the iris alone, to warm it from within on the jackpot)
    const irisGlow = texOf(canvas(TS, TS, (c) => {
      c.fillStyle = '#000'; c.fillRect(0, 0, TS, TS);
      const cx = TS * 0.25, cy = TS / 2, R = TS * 0.062;
      c.save(); c.translate(cx, cy); c.scale(1, 2); c.translate(-cx, -cy);
      const gr = c.createRadialGradient(cx, cy, 0, cx, cy, R);
      gr.addColorStop(0, '#000'); gr.addColorStop(0.38, '#000'); gr.addColorStop(0.45, '#ffb040'); gr.addColorStop(0.85, '#ffd890'); gr.addColorStop(1, '#000');
      c.fillStyle = gr; c.beginPath(); c.arc(cx, cy, R, 0, TAU); c.fill();
      c.restore();
    }), true);
    const eyeMat = new THREE.MeshPhysicalMaterial({ map: iris, roughness: 0.04, clearcoat: 1, clearcoatRoughness: 0.02, emissiveMap: irisGlow, emissive: 0xffc070, emissiveIntensity: 0 });
    keep(null, eyeMat);
    const eg = new THREE.SphereGeometry(EYE.r, 48, 32); keep(eg);
    const lidG = new THREE.SphereGeometry(EYE.r + 0.07, 48, 16, 0, TAU, 0, Math.PI / 2); keep(lidG);
    {
      // (the lid's edge painted umber: the lash line, as a doll's lid has)
      const p = lidG.attributes.position, col = new Float32Array(p.count * 3), R0 = EYE.r + 0.07;
      for (let i = 0; i < p.count; i++) { const th = Math.acos(Math.max(-1, Math.min(1, p.getY(i) / R0))), k = clamp01((th - 1.47) / 0.08); col[i * 3] = lerp(1, 0.2, k); col[i * 3 + 1] = lerp(1, 0.13, k); col[i * 3 + 2] = lerp(1, 0.11, k); }
      lidG.setAttribute('color', new THREE.BufferAttribute(col, 3));
    }
    const lidMat = bisque.clone(); lidMat.color.setHex(0xf2d4c6); lidMat.vertexColors = true; lidMat.side = THREE.DoubleSide; keep(null, lidMat);
    // (the lid's margin: a dark rounded edge, and the lashes out of it -
    // long, dark, a doll's - which go with the lid as it closes)
    const R0 = EYE.r + 0.07, LA = 0.55;
    const arc = k => { const a = lerp(-LA, LA, k); return V(Math.sin(a) * R0, 0, Math.cos(a) * R0); };
    const marginG = new THREE.TubeGeometry(new THREE.CatmullRomCurve3(Array.from({ length: 25 }, (_, k) => arc(k / 24))), 48, 0.07, 6, false); keep(marginG);
    const marginM = new THREE.MeshStandardMaterial({ color: 0x2a1812, roughness: 0.6 }); keep(null, marginM);
    const lashG = (() => {
      const g = new THREE.BufferGeometry(), pos = [], uv = [], idx = [], NA = 32, NS = 4;
      for (let i = 0; i <= NA; i++) {
        const a = lerp(-LA, LA, i / NA), sa = Math.sin(a), ca = Math.cos(a), len = 0.4 * (0.35 + 0.65 * Math.cos((a / LA) * Math.PI * 0.45));
        for (let j = 0; j <= NS; j++) { const t = j / NS, r = R0 + 0.03 + len * t; pos.push(sa * r, -0.1 * t + 0.13 * t * t, ca * r); uv.push(i / NA, t); }
      }
      for (let i = 0; i < NA; i++) for (let j = 0; j < NS; j++) { const q = i * (NS + 1) + j; idx.push(q, q + NS + 1, q + 1, q + 1, q + NS + 1, q + NS + 2); }
      g.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3)); g.setAttribute('uv', new THREE.Float32BufferAttribute(uv, 2)); g.setIndex(idx); g.computeVertexNormals();
      return g;
    })(); keep(lashG);
    const lashA = texOf(canvas(256, 64, (c, W, Hh) => {
      c.fillStyle = '#000'; c.fillRect(0, 0, W, Hh); c.strokeStyle = '#fff'; c.lineCap = 'round';
      for (let k = 0; k < 70; k++) { const x = (k + 0.5) / 70 * W + (rng() - 0.5) * 2; c.lineWidth = 2.2; c.beginPath(); c.moveTo(x, 0); c.quadraticCurveTo(x + 2, Hh * 0.5, x + 4 * (rng() - 0.3), Hh * (0.65 + 0.35 * rng())); c.stroke(); }
      c.fillStyle = '#fff'; c.fillRect(0, 0, W, 6);
    }), false);
    const lashM = new THREE.MeshBasicMaterial({ color: 0x1e120e, alphaMap: lashA, alphaTest: 0.4, side: THREE.DoubleSide }); keep(null, lashM);
    const sockG = new THREE.SphereGeometry(EYE.r + 0.3, 24, 16); keep(sockG);
    // (the socket behind each opening: the bisque carved hollow, in its
    // own shade - never a hole into the dark)
    const sockM = new THREE.MeshStandardMaterial({ color: 0x9a7a70, roughness: 0.7, side: THREE.BackSide, polygonOffset: true, polygonOffsetFactor: 4, polygonOffsetUnits: 8 }); keep(null, sockM);
    // (The Jackpot: a glint in each eye, a catchlight of gold)
    const glintTex = texOf(canvas(64, 64, (c, W) => { const r = c.createRadialGradient(W / 2, W / 2, 0, W / 2, W / 2, W / 2); r.addColorStop(0, 'rgba(255,250,230,1)'); r.addColorStop(0.25, 'rgba(255,215,120,0.8)'); r.addColorStop(1, 'rgba(255,190,80,0)'); c.fillStyle = r; c.fillRect(0, 0, W, W); }), true);
    [-1, 1].forEach(s => {
      // (each eye's centre: behind the surface at the opening, so its front
      // sits just proud of the lids)
      const ux = s * EYE.x, uy = EYE.y, zs = unitZ(ux, uy) + relief(ux, uy);
      const socket = new THREE.Group();
      socket.position.set(ux * HEAD.rx, uy * HEAD.ry, zs * HEAD.rz - EYE.r + 0.42);
      headG.add(socket);
      socket.add(new THREE.Mesh(sockG, sockM));
      const eye = new THREE.Mesh(eg, eyeMat); eye.rotation.order = 'YXZ'; socket.add(eye); eyes.push(eye);
      const lid = new THREE.Mesh(lidG, lidMat); socket.add(lid); lids.push(lid);
      lid.add(new THREE.Mesh(marginG, marginM), new THREE.Mesh(lashG, lashM));
      if (tier === 'vault') {
        const sm = new THREE.SpriteMaterial({ map: glintTex, transparent: true, opacity: 0, depthWrite: false, blending: THREE.AdditiveBlending, toneMapped: false }); keep(null, sm);
        const gl = new THREE.Sprite(sm); gl.scale.set(0.26, 0.26, 1); gl.position.set(-0.3, 0.3, EYE.r + 0.04); socket.add(gl); glints.push(gl);
      }
    });
  }
  // (the opening's own edges, rolled: above, the fold of the lid in bisque;
  // below, the lower lid's rim, rosier - over the cut, so its edge is never
  // seen)
  {
    const onFace = (px, py, out) => {
      const x = (px / FS - 0.5) * 2, y = (0.5 - py / FS) * 2, z0 = unitZ(x, y), z = z0 + relief(x, y) * clamp01(z0 * 1.6);
      const n = V(x / HEAD.rx, y / HEAD.ry, z / HEAD.rz).normalize();
      return V(x * HEAD.rx, y * HEAD.ry, z * HEAD.rz).addScaledVector(n, out);
    };
    const bez = (q, t) => { const u = 1 - t; return [u * u * u * q[0] + 3 * u * u * t * q[2] + 3 * u * t * t * q[4] + t * t * t * q[6], u * u * u * q[1] + 3 * u * u * t * q[3] + 3 * u * t * t * q[5] + t * t * t * q[7]]; };
    const lowRim = bisque.clone(); lowRim.color.setHex(0xeccab6); keep(null, lowRim);
    [-1, 1].forEach(s => {
      const a = almondPts(s);
      const up = Array.from({ length: 21 }, (_, k) => onFace(...bez(a.upper, k / 20), 0.02));
      const lo = Array.from({ length: 21 }, (_, k) => onFace(...bez(a.lower, k / 20), 0.0));
      mesh(new THREE.TubeGeometry(new THREE.CatmullRomCurve3(up), 40, 0.13, 8, false), bisque, headG);
      mesh(new THREE.TubeGeometry(new THREE.CatmullRomCurve3(lo), 40, 0.08, 8, false), lowRim, headG);
    });
  }
  // the curls: his own brown hair, short, in soft curls lying close to the
  // skull (the Writer's) - locks swept out from the crown, each turning
  // into a curl at its end; a few falling onto the brow; curls over the
  // ears and at the nape. Under them the scalp, dark, so a gap between
  // locks reads as depth.
  {
    // (the strands run along each lock: a chestnut ground, lighter strands
    // where it crests, the same strokes raised for the relief)
    const TS = 256, strands = [];
    for (let k = 0; k < 420; k++) strands.push({ y: rng() * TS, ph: rng() * TAU, amp: 1 + rng() * 2.5, w: 0.6 + rng() * 1.0, l: 0.25 + 0.6 * rng() });
    const combed = (c, relief) => {
      strands.forEach(st => {
        c.strokeStyle = relief ? '#fff' : `rgb(${Math.round(54 + 50 * st.l)},${Math.round(31 + 29 * st.l)},${Math.round(17 + 15 * st.l)})`;
        c.globalAlpha = relief ? 0.35 : 0.7; c.lineWidth = st.w;
        c.beginPath();
        for (let x = -8; x <= TS + 8; x += 8) { const y = st.y + Math.sin((x / TS) * TAU * 2 + st.ph) * st.amp; if (x < 0) c.moveTo(x, y); else c.lineTo(x, y); }
        c.stroke();
      });
      c.globalAlpha = 1;
    };
    const hn = embossTex(canvas(TS, TS, (c) => { c.fillStyle = '#000'; c.fillRect(0, 0, TS, TS); combed(c, true); }), 1.4, 1); hn.wrapS = hn.wrapT = THREE.RepeatWrapping; keep(null, null, hn);
    const hc = texOf(canvas(TS, TS, (c) => { c.fillStyle = '#2e1a0e'; c.fillRect(0, 0, TS, TS); combed(c, false); }), true); hc.wrapS = hc.wrapT = THREE.RepeatWrapping;
    const hair = new THREE.MeshPhysicalMaterial({ map: hc, normalMap: hn, normalScale: new THREE.Vector2(0.4, 0.4), roughness: 0.45, sheen: 0.6, sheenColor: new THREE.Color(0x6e4c34), sheenRoughness: 0.4 });
    keep(null, hair);
    // the scalp: the skull's shell to a child's hairline
    const RX = HEAD.rx * 1.03, RY = HEAD.ry * 1.02, RZ = HEAD.rz * 1.03, C0 = V(0, 0.2, -0.3);
    const line = (x, z) => lerp(-0.85, 0.5 - 0.42 * x * x, clamp01((z + 0.1) / 0.7));
    {
      const g = new THREE.SphereGeometry(1, 72, 48), p = g.attributes.position, src = g.index, idx = [];
      for (let i = 0; i < src.count; i += 3) {
        const a = src.getX(i), b = src.getX(i + 1), c = src.getX(i + 2);
        const cx = (p.getX(a) + p.getX(b) + p.getX(c)) / 3, cy = (p.getY(a) + p.getY(b) + p.getY(c)) / 3, cz = (p.getZ(a) + p.getZ(b) + p.getZ(c)) / 3;
        if (cy > line(cx, cz)) idx.push(a, b, c);
      }
      g.setIndex(idx); g.scale(RX, RY, RZ);
      const scalp = hair.clone(); scalp.color.setHex(0x6a5a50); scalp.sheen = 0.2; keep(null, scalp);
      mesh(g, scalp, headG).position.copy(C0);
    }
    // (a point on the skull, at an angle round from the front and a height
    // up it, lifted off it by a fraction; and the skull's normal there)
    const S = (az, la, lift) => { const r = Math.sqrt(Math.max(0, 1 - la * la)), f = 1 + lift; return V(Math.sin(az) * r * RX * f, la * RY * f, Math.cos(az) * r * RZ * f).add(C0); };
    const Nr = (az, la) => { const r = Math.sqrt(Math.max(0, 1 - la * la)); return V((Math.sin(az) * r) / RX, la / RY, (Math.cos(az) * r) / RZ).normalize(); };
    // a lock: from its root over the skull to its end, lifted off it most
    // at its middle, then on round into a curl - out from the head and
    // back, tightening; flat in section, wide at the root, thinning into the
    // curl. All of them one mesh.
    const pos = [], uvs = [], ids = [];
    const SEG = 10;
    const lock = (az0, la0, az1, la1, o) => {
      const P = [], Hn = [], Wn = [];
      const N = 22;
      for (let i = 0; i <= N; i++) {
        const t = i / N, e = t * t * (3 - 2 * t);
        const az = lerp(az0, az1, t), la = lerp(la0, la1, e);
        P.push(S(az, la, o.base + o.lift * Math.sin(Math.PI * Math.min(1, t * 1.15)) ** 0.8)); Hn.push(Nr(az, la));
      }
      const E = P[N], T = E.clone().sub(P[N - 1]).normalize();
      const Nn = Hn[N].clone().addScaledVector(T, -Hn[N].dot(T)).normalize().applyAxisAngle(T, o.tilt);
      const B = T.clone().cross(Nn).normalize(), Cc = E.clone().addScaledVector(Nn, o.curl);
      const M = 16;
      for (let i = 1; i <= M; i++) {
        const t = i / M, a = t * TAU * o.turns, R = o.curl * (1 - 0.5 * t);
        const rad = Nn.clone().multiplyScalar(-Math.cos(a)).addScaledVector(T, Math.sin(a));
        P.push(Cc.clone().addScaledVector(rad, R).addScaledVector(B, o.drift * t)); Hn.push(rad.clone().negate());
      }
      // (the frames: across the lock, and through it)
      const L = P.length;
      for (let i = 0; i < L; i++) {
        const Tg = P[Math.min(L - 1, i + 1)].clone().sub(P[Math.max(0, i - 1)]).normalize();
        const h = Hn[i].clone().addScaledVector(Tg, -Hn[i].dot(Tg)).normalize();
        Wn.push(Tg.clone().cross(h).normalize()); Hn[i] = h;
      }
      const base = pos.length / 3;
      let len = 0;
      for (let i = 0; i < L; i++) {
        if (i) len += P[i].distanceTo(P[i - 1]);
        const t = i / (L - 1), root = 0.55 + 0.45 * smoother(t / 0.12);
        const tip = 1 - smoother((t - 0.82) / 0.18);
        const w = (o.w * root * (1 - 0.62 * smoother(t / 0.7)) + 0.1) * tip + 0.03, hh = (o.h * root * (1 - 0.45 * t) + 0.08) * tip + 0.03;
        for (let j = 0; j <= SEG; j++) {
          const a = (j / SEG) * TAU, q = P[i].clone().addScaledVector(Wn[i], Math.cos(a) * w).addScaledVector(Hn[i], Math.sin(a) * hh);
          pos.push(q.x, q.y, q.z); uvs.push(len / 6, (j / SEG) * 1.5 + o.v);
        }
      }
      for (let i = 0; i < L - 1; i++) for (let j = 0; j < SEG; j++) { const q = base + i * (SEG + 1) + j; ids.push(q, q + SEG + 1, q + 1, q + 1, q + SEG + 1, q + SEG + 2); }
    };
    // (where a lock round the head ends: at the hairline in front, over the
    // ears at the sides, at the nape behind)
    const endAt = az => {
      const f = Math.abs(Math.atan2(Math.sin(az), Math.cos(az)));
      const front = line(Math.sin(az), Math.cos(az)) - 0.03;
      return f < 0.75 ? front : f < 1.35 ? lerp(front, -0.2, smoother((f - 0.75) / 0.6)) : lerp(-0.2, -0.46, smoother((f - 1.35) / 1.4));
    };
    const jit = k => (rng() - 0.5) * k;
    // the under layer: sixteen broad locks all round, from the crown
    for (let k = 0; k < 16; k++) {
      const az1 = (k / 16) * TAU + jit(0.12), la1 = endAt(az1);
      lock(az1 + 0.45 + jit(0.2), 0.85 + jit(0.04), az1, la1, { w: 2.5 + jit(0.4), h: 0.85, base: 0.03, lift: 0.08, curl: 1.15 * (0.6 + 0.8 * rng()), turns: 1.0 + jit(0.4), tilt: jit(2.6), drift: jit(2.4), v: rng() });
    }
    // (the whorl at the crown, where they start: a low dome of hair over it)
    {
      const g = new THREE.SphereGeometry(1, 48, 14, 0, TAU, 0, 0.72); g.scale(RX * 1.085, RY * 1.085, RZ * 1.085);
      const uv = g.attributes.uv; for (let i = 0; i < uv.count; i++) uv.setXY(i, uv.getX(i) * 3, uv.getY(i) * 0.6);
      mesh(g, hair, headG).position.copy(C0);
    }
    // over them: fourteen shorter, their curls in the body of the hair
    for (let k = 0; k < 14; k++) {
      const az1 = ((k + 0.5) / 14) * TAU + jit(0.15), la1 = Math.min(0.75, endAt(az1) + 0.2 + jit(0.08));
      lock(az1 + 0.4 + jit(0.2), 0.88, az1, la1, { w: 2.1 + jit(0.4), h: 0.75, base: 0.07, lift: 0.08, curl: 1.05 * (0.6 + 0.8 * rng()), turns: 1.15 + jit(0.4), tilt: jit(1.3), drift: jit(2.4), v: rng() });
    }
    // onto the brow: a few small curls, from the front of the crown
    [-0.5, -0.22, 0.08, 0.36].forEach(az => {
      lock(az + 0.15, 0.7, az + jit(0.1), 0.4 + jit(0.05), { w: 1.5, h: 0.6, base: 0.05, lift: 0.07, curl: 0.72 * (0.7 + 0.6 * rng()), turns: 1.2 + jit(0.3), tilt: jit(1.4), drift: jit(1.2), v: rng() });
    });
    // over the ears and at the nape: short curls, close
    for (let k = 0; k < 12; k++) {
      const side = k < 6 ? 1 : -1, az = side * lerp(1.15, 2.9, (k % 6) / 5) + jit(0.1);
      lock(az + side * 0.1, 0.25 + jit(0.1), az, endAt(az) - 0.05 + jit(0.06), { w: 1.8, h: 0.65, base: 0.04, lift: 0.06, curl: 0.8 * (0.6 + 0.8 * rng()), turns: 1.15 + jit(0.4), tilt: jit(2.4), drift: jit(2.0), v: rng() });
    }
    const g = new THREE.BufferGeometry();
    g.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3)); g.setAttribute('uv', new THREE.Float32BufferAttribute(uvs, 2)); g.setIndex(ids); g.computeVertexNormals();
    mesh(g, hair, headG);
  }

  // ---- The legs: black satin breeches, white silk stockings, black shoes
  // with silver buckles - seated, dangling short of the dais.
  {
    const satin = new THREE.MeshPhysicalMaterial({ color: 0x141012, roughness: 0.4, sheen: 1, sheenColor: new THREE.Color(0x5a5060), sheenRoughness: 0.35 }); keep(null, satin);
    const stocking = new THREE.MeshPhysicalMaterial({ color: 0xf2eee6, roughness: 0.6, sheen: 0.8, sheenColor: new THREE.Color(0xffffff) }); keep(null, stocking);
    const shoe = new THREE.MeshPhysicalMaterial({ color: 0x0c0a0a, roughness: 0.25, clearcoat: 1, clearcoatRoughness: 0.08 }); keep(null, shoe);
    const silver = new THREE.MeshStandardMaterial({ color: 0xdfe2e6, metalness: 1, roughness: 0.2 }); keep(null, silver);
    const limb = (r0, r1, L) => { const g = new THREE.CylinderGeometry(r1, r0, L, 20); g.translate(0, L / 2, 0); return g; };
    [-1, 1].forEach(s => {
      const hip = V(s * 5.2, HIP.y + 0.5, HIP.z + 2), knee = V(s * 5.6, HIP.y + 0.7, -12.5), ankle = V(s * 5.8, 12.5, -10.5);
      const lathe = (L, r) => { const pts = []; for (let k = 0; k <= 24; k++) { const t = k / 24; pts.push(new THREE.Vector2(r(t), t * L)); } return new THREE.LatheGeometry(pts, 28); };
      const Lt = hip.distanceTo(knee), Lc = knee.distanceTo(ankle);
      laid(mesh(lathe(Lt, t => 4.4 - 0.7 * t + 0.25 * Math.sin(Math.PI * t)), satin), hip, knee);
      mesh(new THREE.SphereGeometry(3.6, 24, 16), satin).position.copy(knee);
      laid(mesh(lathe(Lc, t => 2.45 + 0.75 * Math.exp(-(((t - 0.3) / 0.2) ** 2)) - 0.65 * smoother((t - 0.4) / 0.6)), stocking), knee, ankle);
      laid(mesh(new THREE.CylinderGeometry(3.0, 3.0, 1.2, 20), satin), knee.clone().add(V(0, -2.6, 0.2)), knee.clone().add(V(0, -3.8, 0.25)));
      mesh(new THREE.BoxGeometry(1.2, 0.8, 0.3), silver, stage, false).position.copy(knee).add(V(s * 2.6, -3.0, 0.6));
      const sh = mesh(new THREE.CapsuleGeometry(1.9, 5.4, 6, 16), shoe); sh.rotation.x = Math.PI / 2; sh.scale.set(1, 1, 0.75); sh.position.copy(ankle).add(V(0, -1.4, 2.4));
      const buckle = mesh(new THREE.BoxGeometry(1.8, 1.3, 0.3), silver, stage, false); buckle.position.copy(ankle).add(V(0, -0.2, 4.2)); buckle.rotation.x = -0.6;
    });
  }

  // ---- The arms: each sleeve a tube drawn through the shoulder, elbow and
  // wrist every frame (so the shoulder grows out of the coat and the elbow
  // bends), a turned-back cuff edged in braid, a lace ruffle, the bisque
  // hand.
  const SLV = { rings: 40, seg: 20 };
  const makeSleeve = () => {
    const g = new THREE.BufferGeometry(), n = (SLV.rings + 1) * (SLV.seg + 1);
    g.setAttribute('position', new THREE.BufferAttribute(new Float32Array(n * 3), 3));
    const uv = new Float32Array(n * 2), idx = [];
    for (let i = 0; i <= SLV.rings; i++) for (let j = 0; j <= SLV.seg; j++) { const k = i * (SLV.seg + 1) + j; uv[k * 2] = j / SLV.seg; uv[k * 2 + 1] = i / SLV.rings; }
    for (let i = 0; i < SLV.rings; i++) for (let j = 0; j < SLV.seg; j++) { const a = i * (SLV.seg + 1) + j, b = a + SLV.seg + 1; idx.push(a, a + 1, b, b, a + 1, b + 1); }
    g.setAttribute('uv', new THREE.BufferAttribute(uv, 2)); g.setIndex(idx); keep(g);
    return g;
  };
  const shapeSleeve = (g, A0, S0, E, W) => {
    const u1 = E.clone().sub(S0).normalize(), u2 = W.clone().sub(E).normalize();
    const curve = new THREE.CatmullRomCurve3([A0, S0, E.clone().addScaledVector(u1, -1.8), E.clone().addScaledVector(u2, 1.8), W], false, 'centripetal');
    const pts = curve.getSpacedPoints(SLV.rings);
    const L0 = A0.distanceTo(S0), L1 = S0.distanceTo(E), L2 = E.distanceTo(W), Lt = L0 + L1 + L2;
    const radAt = f => { const d = f * Lt; return d < L0 ? 3.9 : d < L0 + L1 ? lerp(3.9, 3.0, (d - L0) / L1) : lerp(3.0, 2.4, (d - L0 - L1) / L2) * (1 - 0.3 * smoother((f - 0.9) / 0.1)); };
    const pos = g.attributes.position;
    let N = null;
    for (let i = 0; i <= SLV.rings; i++) {
      const Tg = (i < SLV.rings ? pts[i + 1].clone().sub(pts[i]) : pts[i].clone().sub(pts[i - 1])).normalize();
      if (!N) N = Math.abs(Tg.y) < 0.9 ? V(0, 1, 0) : V(1, 0, 0);
      N = N.clone().addScaledVector(Tg, -N.dot(Tg)).normalize();
      const Bn = Tg.clone().cross(N), r = radAt(i / SLV.rings);
      for (let j = 0; j <= SLV.seg; j++) {
        const a = (j / SLV.seg) * TAU, k = i * (SLV.seg + 1) + j, ca = Math.cos(a), sa = Math.sin(a);
        pos.setXYZ(k, pts[i].x + (N.x * ca + Bn.x * sa) * r, pts[i].y + (N.y * ca + Bn.y * sa) * r, pts[i].z + (N.z * ca + Bn.z * sa) * r);
      }
    }
    pos.needsUpdate = true; g.computeVertexNormals(); g.computeBoundingSphere();
  };
  // A bisque hand: the palm, four fingers of three joints and the thumb,
  // each joint bent by a curl (0 open, 1 closed round a grip). Its frame:
  // the wrist at the origin, the fingers along y, the palm facing z.
  const FING = [[1.55, 1.0, 0.8], [1.7, 1.1, 0.85], [1.6, 1.05, 0.8], [1.25, 0.85, 0.7]];
  const nailM = new THREE.MeshPhysicalMaterial({ color: 0xf0cfc0, roughness: 0.25, clearcoat: 0.8 }); keep(null, nailM);
  function makeHand(side) {
    const root = new THREE.Group();
    const palmG = new THREE.SphereGeometry(1, 28, 18); palmG.scale(2.25, 2.55, 0.95); palmG.translate(0, PALM, 0); keep(palmG);
    const palm = new THREE.Mesh(palmG, bisque); palm.castShadow = true; root.add(palm);
    // (the ball of the thumb and the heel of the hand, on the palm's side)
    const padG = new THREE.SphereGeometry(1, 20, 14); keep(padG);
    const thenar = new THREE.Mesh(padG, bisque); thenar.position.set(-side * 1.1, 1.75, 0.42); thenar.scale.set(1.15, 1.6, 0.8); thenar.rotation.z = side * 0.35; root.add(thenar);
    const heel = new THREE.Mesh(padG, bisque); heel.position.set(side * 0.85, 1.1, 0.3); heel.scale.set(1.05, 1.1, 0.7); root.add(heel);
    const knuckG = new THREE.SphereGeometry(1, 14, 10); keep(knuckG);
    const nailG = new THREE.SphereGeometry(1, 12, 8); keep(nailG);
    const wristG = new THREE.CylinderGeometry(1.5, 1.6, 2.4, 16); wristG.scale(1, 1, 0.7); keep(wristG);
    const wr = new THREE.Mesh(wristG, bisque); wr.position.y = -0.6; root.add(wr);
    const fingers = [], tips = [], segs = [], bases = [];
    for (let f = 0; f < 4; f++) {
      const chain = [], sg = [];
      const base = new THREE.Group(); bases.push(base); base.position.set((f - 1.5) * 1.12 * side, 4.55 - Math.abs(f - 1.2) * 0.32, 0.05); root.add(base);
      let parent = base;
      for (let j = 0; j < 3; j++) {
        const L = FING[f][j], r = 0.47 - j * 0.05 - (f === 3 ? 0.05 : 0);
        const joint = new THREE.Group();
        if (j) joint.position.y = FING[f][j - 1] + 0.5;
        parent.add(joint);
        const g = new THREE.CapsuleGeometry(r, L, 4, 10); g.translate(0, L / 2 + r * 0.3, 0); keep(g);
        { const q = g.attributes.position; for (let i = 0; i < q.count; i++) { const k = lerp(1, 0.84, clamp01(q.getY(i) / (L + r))); q.setX(i, q.getX(i) * k); q.setZ(i, q.getZ(i) * k * 0.92); } g.computeVertexNormals(); }
        const m = new THREE.Mesh(g, bisque); m.castShadow = true; joint.add(m);
        // (the knuckle at the joint, proud on the back of the hand)
        const kn = new THREE.Mesh(knuckG, bisque); kn.scale.setScalar(r * (j ? 1.08 : 1.18)); kn.position.set(0, r * 0.15, -r * (j ? 0.05 : 0.18)); joint.add(kn);
        chain.push(joint); sg.push({ L, r }); parent = joint;
        if (j === 2) {
          tips.push({ joint, at: V(0, L + r * 1.3, 0), r });
          const nl = new THREE.Mesh(nailG, nailM); nl.position.set(0, L * 0.8 + r * 0.3, -r * 0.8); nl.scale.set(r * 0.74, L * 0.34, 0.09); joint.add(nl);
        }
      }
      fingers.push(chain); segs.push(sg);
    }
    const tBase = new THREE.Group(); tBase.position.set(-side * 1.95, 1.4, 0.45); tBase.rotation.z = -side * 0.75; tBase.rotation.y = -side * 0.4; root.add(tBase);
    const thumb = [], tsegs = [];
    let tp = tBase;
    [1.5, 1.15].forEach((L, j) => {
      const joint = new THREE.Group(); if (j) joint.position.y = 1.5 + 0.5; tp.add(joint);
      const r = 0.62 - j * 0.07, g = new THREE.CapsuleGeometry(r, L, 4, 10); g.translate(0, L / 2 + r * 0.3, 0);
      { const q = g.attributes.position; for (let i = 0; i < q.count; i++) { const k = lerp(1, 0.86, clamp01(q.getY(i) / (L + r))); q.setX(i, q.getX(i) * k); q.setZ(i, q.getZ(i) * k * 0.9); } g.computeVertexNormals(); }
      keep(g);
      const m = new THREE.Mesh(g, bisque); m.castShadow = true; joint.add(m); thumb.push(joint); tsegs.push({ L, r }); tp = joint;
      const kn = new THREE.Mesh(knuckG, bisque); kn.scale.setScalar(r * 1.1); kn.position.set(0, r * 0.15, -r * 0.08); joint.add(kn);
      if (j === 1) {
        tips.push({ joint, at: V(0, L + r * 1.3, 0), r });
        const nl = new THREE.Mesh(nailG, nailM); nl.position.set(0, L * 0.78 + r * 0.3, -r * 0.8); nl.scale.set(r * 0.78, L * 0.36, 0.1); joint.add(nl);
      }
    });
    // (a grasp: each finger closes on its cam until it meets what the hand
    // holds - a ball, or a handle's round - and no further: points along
    // each joint, in the hand's frame, kept off the thing by their radius)
    const M = new THREE.Matrix4(), pt = V();
    // (is joint k's own segment clear of the thing, the joints before it as
    // they are set)
    const segClear = (base, chain, sg, k, obj) => {
      base.updateMatrix(); M.copy(base.matrix);
      for (let i = 0; i <= k; i++) { chain[i].updateMatrix(); M.multiply(chain[i].matrix); }
      const { L, r } = sg[k];
      for (const y of [0.3 * r, 0.3 * r + L / 2, L + 0.3 * r, L + 0.9 * r]) {
        pt.set(0, y, 0).applyMatrix4(M);
        let d;
        if (obj.axis) { const v = pt.clone().sub(obj.c); d = v.addScaledVector(obj.axis, -v.dot(obj.axis)).length(); } else d = pt.distanceTo(obj.c);
        if (d < obj.r + r * (y > L ? 0.75 : 1)) return false;
      }
      return true;
    };
    // (a finger wraps as a real one does: the first joint closes until its
    // segment meets the thing, then the next, then the last - each as far
    // as its cam asks, or as far as the thing lets it; a joint whose segment
    // is in the thing's way even straight opens back out of it)
    const wrap = (base, chain, sg, targets, obj, open = [-0.4, -0.7, -0.7]) => {
      chain.forEach(j => { j.rotation.x = 0; });
      for (let k = 0; k < chain.length; k++) {
        chain[k].rotation.x = targets[k];
        if (!obj || segClear(base, chain, sg, k, obj)) continue;
        let lo = open[k], hi = targets[k];
        chain[k].rotation.x = lo;
        if (!segClear(base, chain, sg, k, obj)) continue;
        for (let it = 0; it < 9; it++) { const m = (lo + hi) / 2; chain[k].rotation.x = m; if (segClear(base, chain, sg, k, obj)) lo = m; else hi = m; }
        chain[k].rotation.x = lo;
      }
    };
    const pose = (curl, spread = 0, thumbCurl = curl, obj = null) => {
      fingers.forEach((ch, f) => { ch[0].rotation.z = (f - 1.5) * (spread + 0.3 * clamp01(1 - curl)) * 0.12 * side; wrap(bases[f], ch, segs[f], [1.0, 1.35, 1.0].map(m => curl * m * (1 + 0.04 * f)), obj); });
      wrap(tBase, thumb, tsegs, [thumbCurl * 0.5, thumbCurl * 0.9], obj, [-1.1, -1.1]);
    };
    pose(0.2);
    return { root, pose, tips };
  }
  // the cuff: turned back, flaring, a band of braid round its top; the
  // lace ruffle out of it
  const cuffG = new THREE.CylinderGeometry(2.85, 2.6, 3.4, 28, 1, true); cuffG.translate(0, -2.0, 0); keep(cuffG);
  const cuffBandG = new THREE.CylinderGeometry(2.9, 2.88, 0.8, 28, 1, true); cuffBandG.translate(0, -0.6, 0); keep(cuffBandG);
  // (gathered close: many small folds, the scalloped edge fine)
  // (a soft cone of lace out of the cuff, its mouth to the fingers: in the
  // cuff's frame +y runs down the arm and +z is the back of the hand, where
  // it is longest and lies down onto the hand)
  const ruffG = new THREE.CylinderGeometry(2.3, 1.8, 1.5, 96, 8, true); ruffG.translate(0, 1.0, 0);
  const shirtG = new THREE.CylinderGeometry(1.75, 2.45, 1.0, 56, 3, true); shirtG.translate(0, -0.15, 0);
  { const p = shirtG.attributes.position; for (let i = 0; i < p.count; i++) { const x = p.getX(i), y = p.getY(i), z = p.getZ(i), f = clamp01((0.35 - y) / 1.0), k = 1 + 0.1 * f * Math.sin(Math.atan2(z, x) * 16); p.setX(i, x * k); p.setZ(i, z * k); } shirtG.computeVertexNormals(); }
  keep(shirtG);
  { const p = ruffG.attributes.position, uv = ruffG.attributes.uv; for (let i = 0; i < p.count; i++) { const x = p.getX(i), y = p.getY(i), z = p.getZ(i), f = clamp01((y - 0.25) / 1.5), a = Math.atan2(x, z), hang = Math.max(0, Math.cos(a)) ** 1.5, k = 1 + 0.08 * f * Math.sin(a * 9); p.setXYZ(i, x * k, y + 0.8 * f * hang, z * k - 0.9 * f * f * hang); uv.setXY(i, uv.getX(i) * 3, 1 - uv.getY(i)); } ruffG.computeVertexNormals(); }
  keep(ruffG);
  const arms = [-1, 1].map(side => {
    const a = { side };
    a.shoulder = V(side * SH.x, SH.y, 0);
    a.root = V(side * (SH.x - 3.6), SH.y + 0.6, 0);
    a.sleeveG = makeSleeve();
    a.sleeve = new THREE.Mesh(a.sleeveG, sleeveMat); a.sleeve.castShadow = true; a.sleeve.receiveShadow = true; a.sleeve.frustumCulled = false; body.add(a.sleeve);
    a.cuff = new THREE.Group(); body.add(a.cuff);
    const cm = new THREE.Mesh(cuffG, sleeveMat); cm.castShadow = true; a.cuff.add(cm);
    a.cuff.add(new THREE.Mesh(cuffBandG, braid));
    a.cuff.add(new THREE.Mesh(ruffG, lace), new THREE.Mesh(shirtG, linen));
    a.hand = makeHand(side);
    body.add(a.hand.root);
    return a;
  });

  // ---- Contact: a soft shade under everything that rests on something (the
  // lamp's shadow map is too soft to plant a foot): the desk's sabots, the
  // stool's feet, under his dangling shoes, and under each hand as it comes
  // down on the leather.
  const blobTex = texOf(canvas(64, 64, (g, W) => { const r = g.createRadialGradient(W / 2, W / 2, 0, W / 2, W / 2, W / 2); r.addColorStop(0, 'rgba(255,255,255,1)'); r.addColorStop(0.45, 'rgba(255,255,255,0.55)'); r.addColorStop(1, 'rgba(255,255,255,0)'); g.fillStyle = r; g.fillRect(0, 0, W, W); }), false);
  const blobG = new THREE.PlaneGeometry(1, 1); blobG.rotateX(-Math.PI / 2); keep(blobG);
  const blob = (x, y, z, sx, sz, op, parent = stage) => {
    const m = new THREE.MeshBasicMaterial({ color: 0x000000, alphaMap: blobTex, transparent: true, opacity: op, depthWrite: false, polygonOffset: true, polygonOffsetFactor: -2, polygonOffsetUnits: -2 }); keep(null, m);
    const b = new THREE.Mesh(blobG, m); b.position.set(x, y, z); b.scale.set(sx, 1, sz); b.renderOrder = 1; parent.add(b); return b;
  };
  {
    const { w, d } = DESK;
    [[-1, -1], [-1, 1], [1, -1], [1, 1]].forEach(([sx, sz]) => blob(sx * (w / 2 - 1.8) + 0.4 * sx, 0.04, sz * (d / 2 - 1.8) + 0.4 * sz, 7.5, 7.5, 0.7));
    [-1, 1].forEach(sx => [-1, 1].forEach(sz => blob(sx * (STOOL.w / 2 - 1.5), 0.04, STOOL.z + sz * (STOOL.d / 2 - 1.5), 4.5, 4.5, 0.6)));
    [-1, 1].forEach(s => blob(s * 5.8, 0.04, -7.5, 9, 12, 0.32));
    blob(0, 0.04, -12, DESK.w + 14, DESK.d + 18, 0.28);
  }
  const handBlobs = [-1, 1].map(() => blob(0, DESK.top + 0.06, 0, 6, 7.5, 0));

  // ---- The lamp over him, and a rim from behind.
  const key = new THREE.SpotLight(0xffeedd, room.PENDANT * 1.2, 0, 0.5, 0.65, 0);
  key.position.copy(toWorld(V(42, 190, 150)));
  key.target.position.copy(toWorld(V(0, 60, -14)));
  key.castShadow = true;
  key.shadow.mapSize.set(1024, 1024);
  key.shadow.camera.near = 80; key.shadow.camera.far = 320;
  key.shadow.bias = -0.0008; key.shadow.normalBias = 0.09; key.shadow.radius = 4;
  scene.add(key, key.target);
  const rimL = new THREE.SpotLight(0xcfdcff, room.PENDANT * 0.7, 0, 0.6, 0.8, 0);
  rimL.position.copy(toWorld(V(-70, 170, -150)));
  rimL.target.position.copy(toWorld(V(0, 80, -28)));
  scene.add(rimL, rimL.target);
  // (a soft fill from the front, low, so his face reads when he bows it
  // out of the lamp)
  const fill = new THREE.SpotLight(0xffe6d0, room.PENDANT * 0.35, 0, 0.35, 1, 0);
  fill.position.copy(toWorld(V(10, 70, 110)));
  fill.target.position.copy(toWorld(V(0, 80, -24)));
  scene.add(fill, fill.target);
  // (a lamp inside his chest, on the reels)
  const inner = new THREE.PointLight(0xffd59a, 1.6, 22, 1.4);
  inner.position.set(0, WIN.y + 3, winZ - 1.5);
  body.add(inner);
  // (The Jackpot: the gold out of the window, a lamp thrown forward and down
  // onto the desk and into the drawer)
  // (the payout's own lamp: down into the drawer as it runs out, held, so the
  // tokens are still seen in the last frame)
  let trayL = null;
  if (tier !== 'edge') {
    trayL = new THREE.SpotLight(0xfff0dc, 0, 0, 0.32, 0.8, 0);
    trayL.position.set(0, DESK.top + 34, DESK.d / 2 + DRAWER.open + 26);
    trayL.target.position.set(0, DRAWER.y, DESK.d / 2 + DRAWER.open * 0.6);
    stage.add(trayL, trayL.target);
  }
  let pour = null, flood = null;
  if (tier === 'vault') {
    flood = new THREE.PointLight(0xffc068, 0, 46, 1.2);
    flood.position.set(0, WIN.y + 0.5, winZ + 2.6);
    body.add(flood);
    pour = new THREE.SpotLight(0xffc070, 0, 0, 0.75, 0.85, 0);
    pour.position.set(0, WIN.y, winZ + 1.2);
    pour.target.position.set(0, WIN.y - 15, winZ + 24);
    body.add(pour, pour.target);
  }

  // =================================================================
  // ---- The plan: the cams' timetable (world seconds).
  const T = {};
  T.look = 0.6;                     // turns his head to the lever
  T.reach = 0.85;                   // reaches for it
  T.grip = T.reach + 0.8;
  T.pull = T.grip + 0.12;
  T.pulled = T.pull + 0.5;
  T.release = T.pulled + 0.12;
  T.spin = T.release + 0.06;        // the reels let go
  T.bow = T.release + 0.25;         // bows his head to watch them
  T.stop = [T.spin + 1.35, T.spin + 2.0, T.spin + 2.95];
  const BRAKE = 0.14;
  const decided = T.stop[2] + BRAKE;
  const slowW = T.stop[2] - 0.08;
  const warp = makeWarp(slowW);
  const plan = { tier, seed, warp, wallW: slowW, values: line, call, throwOk: true, why: [] };
  const restW = decided + 0.35;
  plan.restW = restW;
  plan.callW = restW + 0.25;
  if (tier === 'vault') {
    plan.boom = restW + 0.6;
    plan.revealW = plan.boom + 3.6;
    plan.endW = plan.boom + 4.8;
  } else if (tier === 'edge') {
    plan.silence = [decided + 0.05, decided + 0.8];
    plan.callW = plan.silence[1];
    plan.revealW = plan.silence[1] + 0.2;
    plan.endW = plan.revealW + 2.4;
  } else {
    // (held until the payout is in and the lens is out again)
    plan.revealW = Math.max(restW + 3.5, restW + 1.7 + PAY[line[0]] * TOKGAP[tier] + 1.9);
    plan.endW = plan.revealW + 1.1;
  }
  plan.revealReal = warp.real(plan.revealW);
  plan.totalReal = warp.real(plan.endW);
  plan.restReal = warp.real(restW);
  plan.wallReal = warp.real(slowW);
  const Rw = w => warp.real(w);
  // the drawer's cam, and the payout
  const drawerAt = tier === 'edge' ? Infinity : tier === 'vault' ? plan.boom + 0.35 : restW + 1.25;
  const payAt = drawerAt + 0.45;

  // the reels: each from where it stands, spun up as the lever lets go,
  // braked onto its stop with a kick back off the detent (On a Tooth: the
  // third onto the tip of a tooth, half a stop on, rocking)
  const OMEGA = 27, RAMP = 0.3;
  const reelPlan = [0, 1, 2].map(i => {
    const a0 = (Math.floor(rng() * NS) + 0.5) * STEP;
    const edge = tier === 'edge' && i === 2;
    const t0 = T.spin + i * 0.05, tb = T.stop[i];
    const travel = OMEGA * (RAMP / 2 + (tb - t0 - RAMP) + BRAKE / 2);
    const target = (stops[i] + 0.5) * STEP + (edge ? STEP / 2 : 0);
    let end = target; while (end - a0 < travel - STEP * 6) end += TAU;
    const w = (end - a0) / (RAMP / 2 + (tb - t0 - RAMP) + BRAKE / 2);
    return { a0, t0, tb, w, end, edge };
  });
  const reelAt = (r, w) => {
    if (w <= r.t0) return { a: r.a0, v: 0 };
    const u = w - r.t0;
    if (u < RAMP) return { a: r.a0 + r.w * u * u / (2 * RAMP), v: r.w * u / RAMP };
    if (w < r.tb) return { a: r.a0 + r.w * (RAMP / 2 + u - RAMP), v: r.w };
    const v = w - r.tb;
    if (v < BRAKE) return { a: r.a0 + r.w * (RAMP / 2 + (r.tb - r.t0 - RAMP) + v - v * v / (2 * BRAKE)), v: r.w * (1 - v / BRAKE) };
    const x = v - BRAKE;
    const k = r.edge ? 1.2 * DEG * Math.sin(x * 30) * Math.exp(-x * 5) : -4.5 * DEG * Math.sin(Math.min(x, 0.5) * 34) * Math.exp(-x * 14);
    return { a: r.end + k, v: 0 };
  };

  // the lever's swing: drawn back by his hand, held at the bottom of its
  // ratchet, sprung back past rest and settling
  const leverAt = w => {
    if (w < T.pull) return LEVER.rest;
    if (w < T.pulled) return LEVER.rest + (LEVER.pulled - LEVER.rest) * cam((w - T.pull) / (T.pulled - T.pull));
    if (w < T.release) return LEVER.pulled;
    const x = w - T.release;
    return LEVER.rest + (LEVER.pulled - LEVER.rest) * Math.exp(-x * 9) * Math.cos(x * 14);
  };

  // =================================================================
  // ---- The cams: the figure's pose at a world time.
  const FREEZE = tier === 'edge' ? plan.silence[0] : Infinity;
  const ease = (w, a, b) => cam((w - a) / (b - a));
  // where he looks (the stage's frame), each held from its time, the head
  // and eyes carried from one to the next over its cam
  const LENS = V(0, 84, 140);
  const looks = [
    { t: 0, p: LENS },
    { t: T.look, p: ballAt(LEVER.rest), d: 0.5 },
    { t: T.bow, p: V(0, 30, 8), d: 0.55 },
    { t: restW - 0.15, p: LENS, d: 0.6 }
  ];
  if (tier === 'vault') looks.push({ t: plan.boom - 0.2, p: V(BELL.x + 4, 76, 4), d: 0.45 }, { t: plan.boom + 1.6, p: LENS, d: 0.6 });
  if (tier === 'edge') looks.push({ t: T.stop[1] + 0.3, p: LENS, d: 1.0 });
  looks.sort((a, b) => a.t - b.t);
  const lookAt = w => {
    const p = looks[0].p.clone();
    for (let i = 1; i < looks.length; i++) { const L = looks[i]; if (w > L.t) p.lerp(L.p, ease(w, L.t, L.t + L.d)); }
    return p;
  };
  // (each hand's target: its palm and the way the palm faces (n) and the
  // hand lies (h); or a grip - the thing held (g), the palm off it by out,
  // the fingers' base along past it, round a handle's axis)
  const restH = V(0.12, -0.05, 1).normalize();
  const restR = { p: V(-14.5, DESK.top + 1.8, -6.5), h: restH, n: restH.clone().cross(V(1, 0, 0)).normalize().negate() };
  const poseAt = w0 => {
    const w = Math.min(w0, FREEZE);
    const P = { look: lookAt(w) };
    // (wide-eyed at the jackpot)
    P.wide = tier === 'vault' ? ease(w, plan.boom - 0.15, plan.boom + 0.15) * (1 - ease(w, plan.boom + 2.8, plan.boom + 3.5)) : 0;
    P.blink = [0.3, T.stop[0] + 0.45, restW + 1.7].reduce((m, b) => Math.max(m, Math.max(0, 1 - Math.abs(w - b) / 0.09)), 0);
    // the body leans into the pull
    const lean = ease(w, T.reach + 0.3, T.pulled) - ease(w, T.release, T.release + 0.6);
    P.lean = 5 * DEG * lean; P.twist = -7 * DEG * lean;
    // the right hand: from its rest by the leather to the lever's ball,
    // over it and the fingers round it; with it down and up; and back
    const ball = ballAt(leverAt(w));
    const toBall = ease(w, T.reach, T.grip), off = ease(w, T.release + 0.05, T.release + 0.75);
    const grip = toBall * (1 - off);
    // (the grip, as the lens sees it: the palm over the ball's top and back,
    // the fingers down round its outer side, the thumb across its front)
    const gN = V(...HOLD.n).normalize(), gH = V(...HOLD.hd); gH.addScaledVector(gN, -gH.dot(gN)).normalize();
    const onTop = b => b.clone().addScaledVector(gN, -HOLD.out).addScaledVector(gH, -HOLD.along);
    if (grip <= 0) P.rh = restR;
    else if (w < T.release + 0.05) {
      const p = restR.p.clone().lerp(onTop(ball), toBall); p.y += 3 * Math.sin(Math.PI * toBall);
      P.rh = { p, n: restR.n.clone().lerp(gN, toBall).normalize(), h: restR.h.clone().lerp(gH, toBall).normalize() };
    } else {
      const p = onTop(ballAt(leverAt(T.release))).lerp(restR.p, off); p.y += 3 * Math.sin(Math.PI * off);
      P.rh = { p, n: gN.clone().lerp(restR.n, off).normalize(), h: gH.clone().lerp(restR.h, off).normalize() };
    }
    P.rcurl = lerp(0.12, HOLD.curl, smoother((grip - 0.75) / 0.25));
    // the left hand: round the bell's handle; The Jackpot lifts and rings
    // it, On a Tooth half-lifts it as the second badge stops
    P.bell = bellRest.clone(); P.bellTilt = 0;
    if (tier === 'vault') {
      const up = ease(w, plan.boom - 0.35, plan.boom + 0.1) * (1 - ease(w, plan.boom + 2.6, plan.boom + 3.3));
      P.bell.add(V(3, 18 * up, 7 * up));
      const x = w - plan.boom;
      if (x > 0) {
        P.bellTilt = 30 * DEG * Math.sin(x * TAU / 0.42) * Math.min(1, x / 0.15) * Math.exp(-x / 2.2) * up;
        P.bell.y += 1.4 * Math.sin(x * TAU / 0.21) * Math.exp(-x / 2.2) * up;
      }
    } else if (tier === 'edge') {
      const up = ease(w, T.stop[1] + 0.25, T.stop[1] + 1.6);
      P.bell.add(V(2, 14 * up, 5 * up));
      P.bellTilt = -8 * DEG * up;
    }
    const tq = new THREE.Quaternion().setFromAxisAngle(V(0, 0, 1), P.bellTilt);
    P.lh = { g: P.bell.clone(), n: V(-1, 0, 0).applyQuaternion(tq), out: 0.6 + 0.85, along: 2.0, axis: V(0, 1, 0).applyQuaternion(tq) };
    P.lcurl = 1.05;
    return P;
  };

  // A two-bone solve: shoulder S, wrist W, the elbow carried out along the
  // pole. Returns the elbow.
  const solve = (S0, Wp, pole) => {
    const d = Wp.clone().sub(S0); let L = d.length();
    const a = ARM.upper, b = ARM.fore;
    L = Math.min(L, a + b - 0.01);
    const dir = d.normalize();
    const x = (a * a - b * b + L * L) / (2 * L), h = Math.sqrt(Math.max(0, a * a - x * x));
    const n = pole.clone().sub(dir.clone().multiplyScalar(pole.dot(dir))).normalize();
    return S0.clone().addScaledVector(dir, x).addScaledVector(n, h);
  };
  const bodyInv = new THREE.Matrix4(), headInv = new THREE.Matrix4(), basis = new THREE.Matrix4(), stageInv = new THREE.Matrix4();
  const toBody = p => p.clone().applyMatrix4(bodyInv);
  const dirBody = d => d.clone().transformDirection(bodyInv);

  // ---- Posing a frame.
  const poseFigure = w => {
    const P = poseAt(w);
    body.rotation.set(0, P.twist, P.lean, 'YXZ');
    body.updateMatrix();
    bodyInv.copy(body.matrix).invert();
    // the head and the eyes: the head turns most of the way to what he
    // looks at (his neck a third of that), the eyes the rest
    const lp = toBody(P.look), hc = V(0, NECKY + HEAD.up, 0.8 + HEAD.fwd), d = lp.clone().sub(hc);
    const yaw = Math.max(-50 * DEG, Math.min(50 * DEG, Math.atan2(d.x, d.z) * 0.82)), pitch = Math.max(-18 * DEG, Math.min(26 * DEG, Math.atan2(-d.y, Math.hypot(d.x, d.z)) * 0.85));
    neckPivot.rotation.set(pitch * 0.35, yaw * 0.3, 0, 'YXZ');
    headG.rotation.set(pitch * 0.65, yaw * 0.7, 0, 'YXZ');
    stage.updateMatrixWorld(true);
    stageInv.copy(stage.matrixWorld).invert();
    headInv.copy(headG.matrixWorld).invert();
    const lw = toWorld(P.look);
    eyes.forEach(e => {
      const t = lw.clone().applyMatrix4(headInv).sub(e.parent.position);
      e.rotation.set(Math.max(-14 * DEG, Math.min(3 * DEG, Math.atan2(-t.y, Math.hypot(t.x, t.z)))), Math.max(-24 * DEG, Math.min(24 * DEG, Math.atan2(t.x, t.z))), 0);
    });
    // (the lids: just over the top of the iris, lower as he looks down, shut
    // in a blink)
    const ep0 = eyes[0].rotation.x;
    lids.forEach(l => { l.rotation.x = lerp(-0.3 - 0.17 * P.wide + 0.5 * Math.max(0, ep0), 1.25, P.blink); });
    // the lever and the bell
    lever.rotation.x = leverAt(Math.min(w, FREEZE));
    bell.position.copy(P.bell); bell.rotation.set(0, 0, P.bellTilt);
    // the arms: for each hand, where its palm must be and which way it
    // faces; the wrist back from there along the hand; the elbow carried out
    arms.forEach(a => {
      const right = a.side < 0, tg = right ? P.rh : P.lh;
      const S0 = a.shoulder, pole = right ? V(-0.75, -0.55, -0.4) : V(0.75, -0.55, -0.35);
      let n = dirBody(tg.n), h = tg.h ? dirBody(tg.h).normalize() : null;
      let F = (tg.g ? toBody(tg.g) : toBody(tg.p)).sub(S0).normalize(), wrist = null, E = null;
      for (let it = 0; it < 5; it++) {
        let palm, hd;
        if (tg.g) {
          // (a grip: the hand across the handle, the palm on it, the handle
          // under the base of the fingers)
          const gb = toBody(tg.g), ax = dirBody(tg.axis);
          hd = F.clone().addScaledVector(ax, -ax.dot(F)).addScaledVector(n, -n.dot(F)).normalize();
          palm = gb.clone().addScaledVector(hd, -tg.along).addScaledVector(n, -tg.out);
        } else { hd = h; palm = toBody(tg.p); }
        wrist = palm.clone().addScaledVector(hd, -PALM);
        E = solve(S0, wrist, pole);
        F = wrist.clone().sub(E).normalize();
        if (tg.g) h = hd;
      }
      const hd = h.clone().normalize();
      n = n.clone().addScaledVector(hd, -n.dot(hd)).normalize();
      // the sleeve, from inside the shoulder to the wrist
      shapeSleeve(a.sleeveG, a.root, S0.clone().add(V(0, 0.5, 0)), E, wrist.clone().addScaledVector(F, -0.6));
      a.cuff.position.copy(wrist).addScaledVector(F, -0.6);
      a.cuff.quaternion.setFromUnitVectors(Y, F);
      // (turned about the arm so its long side lies over the back of the hand)
      {
        const zl = V(0, 0, 1).applyQuaternion(a.cuff.quaternion), dn = n.clone().negate().addScaledVector(F, n.dot(F));
        if (dn.lengthSq() > 1e-4) { dn.normalize(); a.cuff.quaternion.premultiply(new THREE.Quaternion().setFromAxisAngle(F, Math.atan2(F.dot(zl.clone().cross(dn)), zl.dot(dn)))); }
      }
      a.hand.root.position.copy(wrist);
      a.hand.root.quaternion.setFromRotationMatrix(basis.makeBasis(hd.clone().cross(n), hd, n));
      // (what the hand holds, in its own frame)
      const inv = a.hand.root.quaternion.clone().invert();
      const local = p => toBody(p).sub(wrist).applyQuaternion(inv);
      const obj = right ? { c: local(ballAt(leverAt(Math.min(w, FREEZE)))), r: LEVER.ball } : { c: local(P.bell), r: 0.68, axis: dirBody(tg.axis).applyQuaternion(inv) };
      a.hand.pose(right ? P.rcurl : P.lcurl, 0.06, right ? P.rcurl * HOLD.thumb : 0.7, obj);
      // (its shade on the leather, darker as it comes down)
      {
        a.hand.root.updateMatrixWorld(true);
        const hb = handBlobs[right ? 0 : 1], pc = a.hand.root.localToWorld(V(0, PALM + 1, 0)).applyMatrix4(stageInv);
        const over = Math.abs(pc.x) < DESK.w / 2 - 2 && Math.abs(pc.z) < DESK.d / 2 - 2, hgt = pc.y - DESK.top;
        hb.position.set(pc.x, DESK.top + 0.06, pc.z);
        hb.material.opacity = over ? 0.55 * clamp01(1 - (hgt - 1) / 7) : 0;
      }
    });
  };

  // ---- The drawer, and the tokens: struck brass, a milled edge, the
  // house's stamp; out of the desk into the drawer, heaping where they fall
  // (The Jackpot: a few over the drawer's front, onto the dais).
  const nTok = tier === 'edge' ? 0 : PAY[line[0]];
  const tokens = [];
  let tokMesh = null;
  if (nTok) {
    const stamp = ink => canvas(128, 128, (g, W) => {
      g.fillStyle = ink ? '#000' : '#b48a34'; g.fillRect(0, 0, W, W);
      g.strokeStyle = ink ? '#fff' : '#6e4c16'; g.lineWidth = 6; g.beginPath(); g.arc(W / 2, W / 2, W / 2 - 8, 0, TAU); g.stroke();
      g.fillStyle = ink ? '#fff' : '#6e4c16'; g.font = `700 ${W * 0.3}px Georgia, serif`; g.textAlign = 'center'; g.textBaseline = 'middle'; g.fillText('DRO', W / 2, W / 2 + 2);
    });
    const fn = embossTex(stamp(true), 2, 1); keep(null, null, fn);
    const en = embossTex(canvas(256, 8, (g, W, Hh) => { g.fillStyle = '#000'; g.fillRect(0, 0, W, Hh); g.fillStyle = '#fff'; for (let x = 0; x < W; x += 4) g.fillRect(x, 0, 2, Hh); }), 3, 0); keep(null, null, en);
    const faceM = new THREE.MeshStandardMaterial({ map: texOf(stamp(false), true), normalMap: fn, normalScale: new THREE.Vector2(1.6, 1.6), metalness: 1, roughness: 0.22, envMapIntensity: 1.8 });
    const edgeM = new THREE.MeshStandardMaterial({ color: 0xb48a34, normalMap: en, metalness: 1, roughness: 0.24, envMapIntensity: 1.8 });
    keep(null, faceM); keep(null, edgeM);
    const tg = new THREE.CylinderGeometry(TOKEN.r, TOKEN.r, TOKEN.th, 40); keep(tg);
    tokMesh = new THREE.InstancedMesh(tg, [edgeM, faceM, faceM], nTok); tokMesh.castShadow = true; tokMesh.receiveShadow = true; tokMesh.frustumCulled = false;
    stage.add(tokMesh);
    // the cells of the drawer's floor where a token can lie (a close
    // hexagonal pack, open part of the drawer only), and how high each is
    // stacked
    const floorY = DRAWER.y + 0.42 + TOKEN.th / 2;
    const zFront = DZ + DRAWER.open - 1.0 - 0.3;
    const cells = [];
    const pitch = 2 * TOKEN.r + 0.08;
    for (let r = 0, z = zFront - TOKEN.r; z > DZ - 1.5; r++, z -= pitch * 0.87) {
      for (let x = -(DRAWER.w - 2.4) / 2 + TOKEN.r + (r % 2 ? pitch / 2 : 0); x <= (DRAWER.w - 2.4) / 2 - TOKEN.r; x += pitch) cells.push({ x, z, n: 0 });
    }
    // (they come out of the desk at the drawer's back and heap nearest
    // where they land)
    const landX = (rng() - 0.5) * 4;
    const order = cells.map(c => ({ c, d: Math.hypot(c.x - landX, (c.z - DZ - 4) * 0.8) + rng() * 2.2 })).sort((a, b) => a.d - b.d).map(o => o.c);
    const spill = tier === 'vault' ? 9 : 0;
    // (a heap: only the cells nearest where they land, so they stack)
    const heap = order.slice(0, Math.max(3, Math.ceil(nTok / 2.6)));
    const gap = TOKGAP[tier];
    for (let k = 0; k < nTok; k++) {
      const t = payAt + k * gap + rng() * 0.02;
      const start = V(landX + (rng() - 0.5) * 2.4, DRAWER.y + DRAWER.h - 0.6, DZ - 2.5);
      let rest, spillTo = null, lean = 0;
      if (k >= nTok - spill) rest = spillTo = V((rng() - 0.5) * 18, 0.1, DZ + DRAWER.open + 6 + rng() * 10);
      else {
        // (the next cell out from where they land, one deep at first, then
        // stacked on the lowest near it)
        const cell = heap.reduce((m, c) => (c.n + rng() * 0.9 < m.n ? c : m), heap[0]);
        // (each one a little off the one under it, and leaning on it)
        const off = cell.n ? 0.55 : 0.06;
        rest = V(cell.x + (rng() - 0.5) * off, floorY + cell.n * (TOKEN.th + 0.03) + (cell.n ? 0.05 : 0), cell.z + (rng() - 0.5) * off);
        lean = cell.n ? (rng() * 2 - 1) * 0.22 : (rng() * 2 - 1) * 0.04;
        cell.n++;
      }
      tokens.push({ t, start, rest, spill: spillTo, spin: (rng() * 2 - 1) * 24, yaw: rng() * TAU, tilt: spillTo ? 0 : lean });
    }
  }
  const tokM = new THREE.Matrix4(), tokQ = new THREE.Quaternion(), tokE = new THREE.Euler(), ONE = V(1, 1, 1);
  const poseTokens = w => {
    // the drawer: out on its cam
    drawer.position.z = DRAWER.open * cam((w - drawerAt) / 0.45);
    if (trayL) trayL.intensity = room.PENDANT * 0.6 * smoother((w - drawerAt) / 0.6);
    if (!tokMesh) return;
    tokens.forEach((c, k) => {
      let p;
      const u = w - c.t;
      if (u < 0) { p = V(0, -1000, 0); tokE.set(0, 0, 0); }
      else if (c.spill) {
        // over the drawer's front and down onto the dais: a fall, a bounce,
        // a roll to rest
        const lip = V(c.start.x * 0.6, DRAWER.y + DRAWER.h + 0.3, DZ + DRAWER.open + 0.2);
        const t1 = 0.22, fall = Math.sqrt(2 * lip.y / 981);
        if (u < t1) { const k2 = u / t1; p = c.start.clone().lerp(lip, k2); p.y += 1.2 * Math.sin(Math.PI * k2); tokE.set(u * c.spin, c.yaw, 0.4); }
        else if (u < t1 + fall) { const x = u - t1; p = lip.clone().lerp(c.spill, x / fall); p.y = lip.y - 0.5 * 981 * x * x; tokE.set(Math.PI / 2 + x * c.spin, c.yaw, 0); }
        else { const x = u - t1 - fall; p = c.spill.clone(); p.y = TOKEN.th / 2 + 2.2 * Math.abs(Math.sin(x * 18)) * Math.exp(-x * 7); tokE.set(0.25 * Math.exp(-x * 5) * Math.sin(x * 30), c.yaw, 0); }
      } else {
        // out of the desk and down into the drawer, a slide and a settle
        const fl = 0.24;
        if (u < fl) { const k2 = u / fl; p = c.start.clone().lerp(c.rest, k2); p.y = lerp(c.start.y, c.rest.y, k2 * k2); tokE.set(0.6 * (1 - k2) + u * c.spin * 0.2, c.yaw, 0); }
        else { const x = u - fl; p = c.rest.clone(); p.y += 0.35 * Math.abs(Math.sin(x * 26)) * Math.exp(-x * 10); tokE.set(c.tilt * (1 + 1.5 * Math.exp(-x * 6)), c.yaw, 0.6 * c.tilt * (1 + 1.5 * Math.exp(-x * 6))); }
      }
      tokQ.setFromEuler(tokE);
      tokM.compose(p, tokQ, ONE); tokMesh.setMatrixAt(k, tokM);
    });
    tokMesh.instanceMatrix.needsUpdate = true;
  };

  // =================================================================
  // ---- The camera: keys in his frame [t, eye xyz, aim xyz], real seconds.
  // Each shot framed for this screen: what must be in it (its height and
  // its width), the lens stood off along a direction by what that needs.
  const tall = aspect < 0.62;
  const vfov = (tall ? 42 : 34) * DEG, hfov = 2 * Math.atan(Math.tan(vfov / 2) * aspect);
  const Bp = p => V(p[0], p[1], p[2]).add(V(0, HIP.y, HIP.z));     // (the body's frame, unturned, to the stage's)
  const fit = (c, dir, h, w) => { const d = Math.max(h / 2 / Math.tan(vfov / 2), w / 2 / Math.tan(hfov / 2)); const n = dir.clone().normalize(); return [c.x + n.x * d, c.y + n.y * d, c.z + n.z * d, c.x, c.y, c.z]; };
  const FACE = Bp([0, NECKY + HEAD.up, 0.8 + HEAD.fwd + 4]);
  const WINC = Bp([0, WIN.y, winZ]);
  const keys = [];
  const push = (t, k) => { if (keys.length) t = Math.max(t, keys[keys.length - 1][0] + 0.3); keys.push([t, ...k]); };
  push(0, fit(FACE.clone().add(V(0, -1.5, 0)), V(0.22, 0.1, 1), 27, 21));
  push(Rw(T.look) + 0.35, fit(FACE.clone().add(V(-1.5, -2.5, 0)), V(0.3, 0.08, 1), 31, 24));
  // (out to take in his head, the reaching arm and the lever's ball)
  push(Rw(T.reach) + 0.45, fit(V(-15, 66, -14), V(-0.5, 0.14, 1), 46, 44));
  push(Rw(T.pulled) + 0.1, fit(V(-15, 63, -16), V(-0.58, 0.16, 1), 48, 46));
  // (round to his front: his face and the window as the reels spin; in on
  // the window as they stop; all three reels across the frame for the last)
  push(Rw(T.spin) + 0.7, fit(Bp([0, 37, 4]), V(0.1, 0.12, 1), 40, 30));
  const WINV = (d, h, w, k) => (tall ? fit(Bp([0, 38 + k, winZ]), d, 46 + 2 * k, 21 + k) : fit(WINC, d, h, w));
  push(Rw(T.stop[1]), WINV(V(0.06, 0.08, 1), 20, 22, 1.5));
  push(Rw(slowW) + 0.1, WINV(V(0.1, 0.06, 1), 15.5, 17.5, 0));
  // the call: his face and the line, the dark over his head for the title
  const CALLV = tall ? fit(Bp([0, 40, 3]), V(0.12, 0.08, 1), 54, 34) : fit(Bp([0, 44, 3]), V(0.12, 0.08, 1), 70, 60);
  // (looking down into the open drawer: its floor, where the tokens lie)
  const TRAYV = tall ? fit(V(0, 48, 8), V(0.08, 1.25, 1), 40, 24) : fit(V(0, 48, 7), V(0.08, 1.2, 1), 52, 64);
  const WIDE = tall ? fit(V(0, 58, -6), V(0.24, 0.27, 1), 116, 92) : fit(V(0, 72, -6), V(0.24, 0.27, 1), 140, 92);
  let iTray = -1;
  if (tier === 'edge') {
    // (in on the third reel standing on its tooth; then back to him, still,
    // the bell half raised)
    push(Rw(plan.silence[0]) + 0.5, WINV(V(0.08, 0.06, 1), 16, 18, 0));
    push(Rw(plan.silence[1]) + 0.9, fit(Bp([6, 33, 2]), V(0.1, 0.1, 1), 50, 50));
    push(Rw(plan.endW) + 2, fit(Bp([6, 33, 2]), V(0.11, 0.1, 1), 54, 52));
  } else if (tier === 'vault') {
    push(Rw(restW) + 0.3, CALLV);
    // (out to take in the bell rung high and the gold out of his chest;
    // held; then down to the drawer as it runs over)
    push(Rw(plan.boom) + 0.4, fit(Bp([6, 38, 3]), V(0.14, 0.1, 1), 60, 46));
    push(Rw(plan.boom) + 1.1, fit(Bp([6, 38, 3]), V(0.16, 0.1, 1), 60, 46));
    iTray = keys.length;
    push(Rw(plan.boom) + 1.85, TRAYV);
    push(Rw(payAt) + 1.6, TRAYV.map((v, i) => v + [1.5, 0.6, 2, 0, 0, 0][i]));
    push(Rw(payAt) + 2.0, TRAYV.map((v, i) => lerp(v, WIDE[i], 0.3)));
    // (out, and settled before the title goes, his head clear under it)
    push(Rw(plan.revealW) - 0.4, WIDE);
  } else {
    push(Rw(restW) + 0.3, CALLV);
    push(Rw(restW) + 1.0, CALLV.map((v, i) => v + [0.4, 0, -1.2, 0, 0, 0][i]));
    iTray = keys.length;
    push(Rw(drawerAt) + 0.4, TRAYV);
    push(Rw(payAt + nTok * TOKGAP[tier]) + 0.4, TRAYV.map((v, i) => v + [1.5, 0.6, 2, 0, 0, 0][i]));
    push(Rw(payAt + nTok * TOKGAP[tier]) + 0.8, TRAYV.map((v, i) => lerp(v, WIDE[i], 0.3)));
    push(Rw(plan.revealW) - 0.5, WIDE);
  }
  if (tier !== 'edge') push(Rw(plan.endW) + 1.5, WIDE.map((v, i) => v * (i < 3 ? 1.06 : 1)));
  // the float: up and away toward the pit (his front and his right), into
  // the ceiling
  {
    const L = keys[keys.length - 1];
    [[6, -60, 70, 120], [16, -160, 150, 260], [room.FLOAT - 2, -240, 200, 360]].forEach(([dt, dx, dy, dz]) => push(L[0] + dt, [L[1] + dx, L[2] + dy, L[3] + dz, L[4] - dx * 0.2, L[5], L[6] + dz * 0.2]));
  }
  const camera = ({ eye, aim, dt, n }) => {
    let last = null;
    for (let k = 0; k < n; k++) {
      const t = k * dt;
      const v = spline(keys, t);
      last = last ? last.map((x, j) => lerp(x, v[j], 1 - Math.exp(-dt / 0.09))) : v;
      const e = toWorld(V(last[0], last[1], last[2])), a = toWorld(V(last[3], last[4], last[5]));
      if (e.y > room.CEIL - 20) e.y = room.CEIL - 20 * Math.exp(-(e.y - (room.CEIL - 20)) / 20);
      eye.set([e.x, e.y, e.z], k * 3); aim.set([a.x, a.y, a.z], k * 3);
    }
  };
  const Rslow = Rw(slowW);
  const gleamAt = t => smoother((t - (Rslow - 0.2)) / 0.35) * (1 - smoother((t - warp.slowHold[1]) / 0.7));

  // ---- Sounds, real seconds.
  const sfx = [];
  const at = (w, kind, extra = {}) => sfx.push(Object.assign({ t: Rw(w), kind, rate: warp.rateAt(Rw(w)) }, extra));
  // (the clockwork's escapement under every move, until it stops)
  for (let w = 0.05; w < Math.min(FREEZE, plan.endW); w += 0.25) at(w, 'tick', { speed: 1 });
  at(T.pull, 'creak'); at(T.pulled, 'latch'); at(T.release, 'pull');
  // (the reels' whirr, from the spin to the last stop)
  at(T.spin, 'scrape', { dur: Rw(T.stop[2] + BRAKE) - Rw(T.spin) });
  reelPlan.forEach((r, i) => at(r.tb + BRAKE, 'knock', { speed: 200 - i * 20 }));
  if (nTok) { at(drawerAt, 'scrape', { dur: 0.4 }); tokens.forEach(c => at(c.t + (c.spill ? 0.6 : 0.24), c.spill ? 'cup' : 'pin', { speed: 70 + 60 * rng() })); }
  if (tier === 'hardways') at(plan.callW + 0.1, 'chime');
  if (tier === 'vault') { for (let k = 0; k < 6; k++) at(plan.boom + 0.105 + k * 0.42, 'bell'); at(plan.boom + 0.02, 'boom', { soft: true }); }
  if (tier === 'edge') at(plan.silence[1], 'drop');

  // ---- Each frame.
  const key0 = key.intensity, fill0 = fill.intensity, pendant0 = lights.pendant.intensity, inner0 = inner.intensity;
  const callPt = toWorld(Bp([0, NECKY + HEAD.up + HEAD.ry + 3, 1]));
  const spot0 = lights.edgeSpot.angle, spotC0 = lights.edgeSpot.color.getHex();
  const stageFn = (t, { w }) => {
    poseFigure(w);
    reels.forEach((r, i) => {
      const s = reelAt(reelPlan[i], w);
      r.drum.rotation.x = s.a;
      r.uBlur.value = clamp01((s.v - 6) / 14);
    });
    poseTokens(w);
    if (lineShade) lineShade.material.opacity = 0.5 * smoother((w - decided) / 0.4);
    lights.rim.intensity = room.RIM;
    let burst = -1, dust = 1;
    if (tier === 'vault') {
      burst = w - plan.boom;
      const k = burst > 0 ? smoother(burst / 0.25) * Math.max(0.35, 1 - burst / 4.4) : 0;
      // (gold through his clockwork: the strips lit warm from inside, the
      // light out of the window into the room, a glint in his eyes)
      reelMats.forEach(m => { m.emissiveIntensity = 0.42 * k; m.color.setRGB(1, 1 - 0.08 * k, 1 - 0.25 * k); });
      inner.intensity = inner0 * (1 + 3.5 * k);
      if (windowGlow) windowGlow.material.opacity = k * (0.85 + 0.15 * Math.sin(burst * 9));
      if (pour) pour.intensity = room.PENDANT * 0.7 * k * (0.9 + 0.1 * Math.sin(burst * 9));
      if (flood) flood.intensity = 30 * k * (0.9 + 0.1 * Math.sin(burst * 9));
      glints.forEach(g => { g.material.opacity = 0.8 * k; });
    }
    if (tier === 'edge') {
      const k = smoother((w - plan.silence[0]) / 0.6);
      const es = lights.edgeSpot;
      es.angle = 0.18; es.color.setHex(0xe4eaff);
      es.position.copy(toWorld(Bp([10, 70, 60])));
      es.target.position.copy(toWorld(Bp([4, 30, 4])));
      es.intensity = 3.0 * k;
      key.intensity = key0 * (1 - 0.88 * k);
      fill.intensity = fill0 * (1 - 0.8 * k);
      lights.pendant.intensity = pendant0 * (1 - 0.88 * k);
      scene.environmentIntensity = room.ENV_LEVEL * (1 - 0.75 * k);
      dust = 1 - 0.85 * k;
    }
    return { burst, dust };
  };
  const deskPt = toWorld(V(0, DESK.top, tall ? 6.5 : 14));
  const trayK = iTray > 0 ? [keys[iTray][0] - 0.35, keys[iTray][0] + 0.05, keys[iTray + 2][0], keys[iTray + 3][0]] : null;
  const panIn = trayK ? [keys[iTray - 1][0], keys[iTray][0]] : null;
  const callAt = w => {
    if (!trayK) return [callPt.x, callPt.y, callPt.z];
    const t = Rw(w), mid = (panIn[0] + panIn[1]) / 2;
    const k = (t > mid ? 1 : 0) * (1 - smoother((t - trayK[2]) / (trayK[3] - trayK[2])));
    const p = callPt.clone().lerp(deskPt, k);
    return [p.x, p.y, p.z];
  };
  const callAlphaAt = w => {
    if (!panIn) return 1;
    const t = Rw(w), d = panIn[1] - panIn[0];
    return 1 - smoother((t - panIn[0]) / (d * 0.33)) * (1 - smoother((t - (panIn[1] - d * 0.2)) / (d * 0.35)));
  };
  // (the shade behind the title: wanted over his face and the window, not
  // over the plain leather of the payout shot, where it reads as a stain)
  const callScrimAt = w => (nTok ? 1 - 0.4 * smoother((w - drawerAt) / 0.5) * (1 - smoother((w - (plan.revealW - 0.9)) / 0.5)) : 1);

  const warmAt = [0.2, Rw(T.reach) + 0.3, Rw(T.spin) + 0.5, Rslow + 0.05, warp.slowHold[1], Rw(restW) + 0.3];
  if (nTok) warmAt.push(Rw(payAt) + 0.4);
  if (tier === 'vault') warmAt.push(Rw(plan.boom) + 0.05, Rw(plan.boom) + 0.8);
  if (tier === 'edge') warmAt.push(Rw(plan.silence[1]) + 0.3);

  const dispose = () => {
    scene.remove(aut, key, key.target, rimL, rimL.target, fill, fill.target);
    lights.edgeSpot.angle = spot0; lights.edgeSpot.color.setHex(spotC0);
    if (tokMesh) tokMesh.dispose();
    key.shadow.dispose();
    made.geos.forEach(g => g.dispose());
    made.mats.forEach(m => m.dispose());
    made.texs.forEach(t => t.dispose());
  };

  // (for the lab: the hands' contacts over the whole shot - how far any
  // fingertip goes under the desk's top or into the lever's ball)
  const scan = () => {
    const out = { desk: { d: 0, t: null }, ball: { d: 0, t: null } };
    const tip = V(), sInv = new THREE.Matrix4();
    for (let w = 0; w <= plan.endW; w += 1 / 60) {
      stageFn(Rw(w), { w });
      stage.updateMatrixWorld(true);
      sInv.copy(stage.matrixWorld).invert();
      const ball = ballAt(leverAt(Math.min(w, FREEZE)));
      arms.forEach(a => a.hand.tips.forEach(tp => {
        tip.copy(tp.at); tp.joint.localToWorld(tip); tip.applyMatrix4(sInv);
        if (Math.abs(tip.x) < DESK.w / 2 + DESK.over && Math.abs(tip.z) < DESK.d / 2 + DESK.over) { const d = DESK.top - (tip.y - tp.r); if (d > out.desk.d) out.desk = { d: +d.toFixed(2), t: +w.toFixed(2) }; }
        const db = LEVER.ball + tp.r - tip.distanceTo(ball); if (db > out.ball.d) out.ball = { d: +db.toFixed(2), t: +w.toFixed(2), arm: a.side, tip: a.hand.tips.indexOf(tp) };
        if (db > 0.3) out.into = (out.into || 0) + 1 / 60 / 5;
        if (w > T.grip && w < T.release && db > (out.held ? out.held.d : 0)) out.held = { d: +db.toFixed(2), t: +w.toFixed(2), tip: a.hand.tips.indexOf(tp) };
      }));
    }
    return out;
  };

  return {
    plan, camera, gleamAt, stage: stageFn, callAt, sfx, warmAt, dispose,
    tierNames: TIER_NAMES,
    callScrim: true, callScrimAt, callAlphaAt,
    silence: tier === 'edge' ? Rw(plan.silence[0]) : null,
    moments: { look: Rw(T.look), reach: Rw(T.reach), pull: Rw(T.pull), spin: Rw(T.spin), stop0: Rw(T.stop[0]), stop1: Rw(T.stop[1]), slow: Rslow, rest: Rw(restW), call: Rw(plan.callW), drawer: nTok ? Rw(drawerAt) : null, pay: nTok ? Rw(payAt) : null, reveal: plan.revealReal, end: plan.totalReal, boom: tier === 'vault' ? Rw(plan.boom) : null, line, stops, tokens: nTok, scan },
    pieces: { aut, body, headG, lever, bell, reels, drawer }
  };
}
