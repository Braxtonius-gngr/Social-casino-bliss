// THE SLOTS: the landing shot's fifth game (see GAMES in intro.mjs).
//
// An automaton sits at his writing desk on a walnut dais out beyond the
// plinko cabinet, under his own lamp: a child of the 1770s in the way of
// the Neuchatel writers - a bisque face, glass eyes, a full rounded crop of
// soft copper-brown coils, an oxblood silk coat edged in gold braid - and
// in his black waistcoat a window of glass, behind which three reels turn
// in his clockwork; green velvet drapes hang full behind his dais. The
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
//   hardways  Three Sevens (8%)    called in gold, as every line is
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
//     the window in his chest; the lamp on his hair and face.
//   At arm's length: the bisque's satin and its painted face - rosy cheeks,
//     a rosebud mouth, fine brows, the lash line along each lid; the glass
//     eyes in their sockets, brown irises, the lids that close over them as
//     a doll's do; the hair's coils and its soft edge; the silk's small
//     woven pattern and its gold thread, the braid along the coat's edges,
//     the linen jabot with its lace edge; the reels' painted strips behind
//     glass; the drapes' deep folds and the pile of their velvet.
//   Pinched in 3x: the silk's weave in relief, the braid's herringbone,
//     the tokens' milled edges and their stamp, the leather on the desk
//     with its tooled gold border.
//   Light: his lamp from above and in front, a warm key; a cool rim from
//     behind on the hair's halo and his shoulders; the reels lit from
//     inside his chest; a low warm wash raking the drapes' folds.
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

export const HOLD = { n: [0, -1, 0.1], hd: [-0.8, -0.2, 0.55], along: 0.8, out: 3.15, curl: 1.1, thumb: 1.3 };
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
// The Jackpot's gold: the point light on the cloth, the glow plane's opacity and the reels' own light (the plane's ring and rays are drawn in its texture).
const GLOW = { flood: 300, opacity: 1, reels: 0.42 };
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
const HEAD = { up: 6.3, fwd: 1.6, rx: 7.9, ry: 8.2, rz: 8.4 };
const ARM = { upper: 16.5, fore: 14.2 };
const PALM = 2.5;                              // the wrist to the palm's centre
// The window in his chest (body frame) and the reels behind it.
const WIN = { y: 27, w: 12.4, h: 7.6 };
const REEL = { r: 3.7, w: 3.5, gap: 0.55 };
// The lever at the desk's right (his right: -x), clear of the top's
// overhang; its ball; its swing (toward the lens is +).
const LEVER = { x: -DESK.w / 2 - DESK.over - 2.4, y: 46, z: -11, len: 21, rest: 8 * DEG, pulled: -46 * DEG, ball: 2.2 };
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
  const mkRng = s => { for (let k = 0; k < 3; k++) { s = Math.imul(s ^ (s >>> 15), 0x2c1b3c6d) >>> 0; s = Math.imul(s ^ (s >>> 12), 0x297a2d39) >>> 0; } return () => { s = (Math.imul(s, 1664525) + 1013904223) >>> 0; s ^= s >>> 16; return (s >>> 0) / 4294967296; }; };
  const rng = mkRng((seed ^ 0x51a7c0de) >>> 0);
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
  // (skin: a child's, as the owner's references have him - warm, soft,
  // the light under it showing as a redder warmth where it turns from the
  // lamp (a sheen, standing for the light the skin carries under it), a
  // faint dewy specular, no glaze)
  const bisque = new THREE.MeshPhysicalMaterial({ color: 0xe9ba9c, roughness: 0.56, specularIntensity: 0.45, clearcoat: 0.04, clearcoatRoughness: 0.6, sheen: 0.5, sheenRoughness: 0.6, sheenColor: new THREE.Color(0xd2685a) });
  keep(null, bisque);
  // (skin is not smooth: a fine pitting of pores, so the lamp breaks up on
  // it as it does on a child's cheek and not as on glaze)
  const poreTex = (rep) => {
    const c = canvas(256, 256, (g, W) => {
      g.fillStyle = 'rgb(128,128,128)'; g.fillRect(0, 0, W, W);
      for (let k = 0; k < 1100; k++) { const v = 96 + rng() * 40; g.fillStyle = `rgba(${v},${v},${v},0.9)`; g.beginPath(); g.arc(rng() * W, rng() * W, 0.7 + rng() * 1.3, 0, TAU); g.fill(); }
      g.filter = 'blur(0.8px)'; g.drawImage(g.canvas, 0, 0);
    });
    const n = embossTex(c, 0.9, 1); n.wrapS = n.wrapT = THREE.RepeatWrapping; n.repeat.set(rep, rep); keep(null, null, n);
    return n;
  };
  bisque.sheen = 0.38;
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
  const vestArt = damask('#0a2812', '#2c6e3e', '#000');
  // the coat: a fine silk velvet in the owner's money green - dark where
  // it faces the lamp, its pile catching light where the cloth turns away;
  // the waistcoat (a damask, its motif a little over two centimetres) and
  // the cuffs a darker green
  const pileTex = (() => {
    const c = canvas(128, 128, (g, W) => { const im = g.createImageData(W, W); for (let i = 0; i < W * W; i++) { const v = 118 + rng() * 20; im.data[i * 4] = im.data[i * 4 + 1] = im.data[i * 4 + 2] = v; im.data[i * 4 + 3] = 255; } g.putImageData(im, 0, 0); });
    const n = embossTex(c, 0.6, 1); n.wrapS = n.wrapT = THREE.RepeatWrapping; n.repeat.set(24, 24); keep(null, null, n);
    return n;
  })();
  // (a velvet's pile scatters the light broadly and soft, lit most where
  // the cloth turns from the lamp - not a satin's bright, tight sheen)
  const velvet = (color, sheenColor) => {
    const m = new THREE.MeshPhysicalMaterial({ color, roughness: 0.94, specularIntensity: 0.1, sheen: 1, sheenRoughness: 0.5, sheenColor: new THREE.Color(sheenColor), normalMap: pileTex, normalScale: new THREE.Vector2(0.45, 0.45) });
    keep(null, m);
    return m;
  };
  const coat = velvet(0x0b2c18, 0x3f8058);
  const sleeveMat = velvet(0x0b2c18, 0x3f8058);
  sleeveMat.side = THREE.DoubleSide;
  const cuffMat = velvet(0x072012, 0x2f6a46);
  cuffMat.side = THREE.DoubleSide;
  // (the waistcoat: a darker green than the coat, but green - a silk
  // damask whose sheen reads where it turns)
  const vest = silk(vestArt, [30, 20], 0.64, 0x2f7a49); vest.sheen = 0.42; vest.normalScale.set(0.32, 0.32);
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
  // (one builder, two weaves: the bold six-lobe lace for the jabot and the
  // ruff, where it is seen large, and a fine picot edge for the cuffs, where
  // six lobes read as a crown and black eyelets as polka dots)
  const laceOf = (NL, EY, EX, ringR, holeR, lobeH, fine) => {
    const W = 512, Hh = 128, LW = W / NL, edge = fine ? 0.9 : 0.74;
    // (a real lace is mostly air: a net of small eyelets worked through a
    // body of fine cloth, a scalloped edge with its own row of holes and a
    // thread drawn round each lobe - so what shows through is the dark
    // coat beneath, and it reads as lace, not as a paper tongue)
    const col = canvas(W, Hh, (g) => {
      g.fillStyle = '#f2ece0'; g.fillRect(0, 0, W, Hh);
      // (a faint weave)
      g.globalAlpha = 0.07; g.fillStyle = '#8c7e68'; for (let y = 0; y < Hh; y += 3) g.fillRect(0, y, W, 1); g.globalAlpha = 1;
      g.strokeStyle = 'rgba(150,138,118,0.7)'; g.lineWidth = fine ? 1.2 : 1.6;
      EY.forEach((ey, r) => { for (let i = 0; i < EX; i++) { const x = (i + (r % 2 ? 0.5 : 0)) * (W / EX) + W / EX / 2; g.beginPath(); g.arc(x, Hh * ey, ringR, 0, TAU); g.stroke(); } });
      // (the thread round each scallop, and the line the lobes hang from)
      g.lineWidth = fine ? 1.6 : 2.2;
      if (lobeH > 0) for (let i = 0; i < NL; i++) { g.beginPath(); g.ellipse((i + 0.5) * LW, Hh * edge, LW * 0.5 - 2, Hh * (lobeH - 0.01), 0, 0, Math.PI); g.stroke(); }
      g.beginPath(); g.moveTo(0, Hh * edge); g.lineTo(W, Hh * edge); g.stroke();
    });
    const alpha = canvas(W, Hh, (g) => {
      g.fillStyle = '#fff'; g.fillRect(0, 0, W, Hh);
      g.fillStyle = '#000';
      // (the scalloped edge: round lobes of cloth, the cut between them -
      // arcs cut out of the edge would leave points, a paper cup's zigzag)
      if (lobeH > 0) { g.fillRect(0, Hh * edge, W, Hh * (1 - edge) + 1);
      g.fillStyle = '#fff';
      for (let i = 0; i < NL; i++) { g.beginPath(); g.ellipse((i + 0.5) * LW, Hh * edge, LW * 0.5 - 0.5, Hh * lobeH, 0, 0, Math.PI); g.fill(); } }
      // (the eyelets - none on the fine weave: at that size a hole is a
      // black dot, and the pattern is carried by shade alone)
      if (holeR > 0) {
        g.fillStyle = '#000';
        EY.forEach((ey, r) => { for (let i = 0; i < EX; i++) { const x = (i + (r % 2 ? 0.5 : 0)) * (W / EX) + W / EX / 2; g.beginPath(); g.arc(x, Hh * ey, holeR, 0, TAU); g.fill(); } });
        for (let i = 0; i < NL; i++) { g.beginPath(); g.arc((i + 0.5) * LW, Hh * 0.78, 5, 0, TAU); g.fill(); }
      }
    });
    const m = texOf(col, true), a = texOf(alpha, false); m.wrapS = a.wrapS = THREE.RepeatWrapping;
    return new THREE.MeshStandardMaterial({ map: m, alphaMap: a, alphaTest: 0.5, side: THREE.DoubleSide, roughness: 0.85 });
  };
  const lace = laceOf(6, [0.16, 0.38, 0.6], 16, 8.2, 6, 0.13, false);
  const laceFine = laceOf(9, [0.2, 0.46, 0.7], 18, 3.4, 0, 0, true);
  keep(null, lace); keep(null, laceFine);

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

  // ---- The drapes: oxblood silk velvet hung full behind the dais from a gilt
  // pole on rings, to break on the floor - a backdrop for him, as a
  // portrait painter hangs one (a Georgian upholsterer's: the heading
  // pleated on its rings, the folds running down from them and opening
  // into softer waves below, none quite like the next). Velvet: dark where
  // it faces the lamp, its pile catching light where the folds turn away.
  // The room's own back wall cuts across the line he sits on, so the drape
  // does not run on into it (a hard edge beside a grey void): it turns the
  // corner there and hangs along the wall, pole and all.
  {
    const DR = { z: -100, top: 222, floor: -DAIS.h, R: 410, Lw: 330 };
    const th = AUT.yaw, cth = Math.cos(th), sth = Math.sin(th);
    const wallZ = (room.backdropZ === undefined ? -420 : room.backdropZ) + 16;
    // (the corner: where his drape line meets the wall, in his frame)
    const xL = (wallZ - AUT.z - DR.z * cth) / -sth;
    const dL = [-cth, -sth], nL = [-sth, cth];
    const L1 = DR.R - xL, Ltot = DR.Lw + L1, pleats = Math.round(Ltot / 15.6);
    const BL = 30;
    // (the path from the wall's far end to the right end: its point and the
    // side the cloth hangs toward, turned smoothly through the corner)
    const at = s => {
      let x, z, a;
      if (s < DR.Lw) { x = xL + dL[0] * (DR.Lw - s); z = DR.z + dL[1] * (DR.Lw - s); a = 0; } else { x = xL + (s - DR.Lw); z = DR.z; a = 1; }
      const k = smoother((s - (DR.Lw - BL)) / (2 * BL)), nx = lerp(nL[0], 0, k), nz = lerp(nL[1], 1, k), nl = Math.hypot(nx, nz);
      return { x, z, nx: nx / nl, nz: nz / nl };
    };
    const drapeM = new THREE.MeshPhysicalMaterial({ color: 0x2a0a10, roughness: 0.94, sheen: 1, sheenColor: new THREE.Color(0x8a3442), sheenRoughness: 0.42, side: THREE.DoubleSide });
    keep(null, drapeM);
    const p1 = rng() * TAU, p2 = rng() * TAU, p3 = rng() * TAU;
    // (a pleat's phase along the cloth: a little uneven, as hung cloth is)
    const phase = u => u * pleats * TAU + 0.9 * Math.sin(u * 3.1 * TAU * (Ltot / 500) + p1) + 0.5 * Math.sin(u * 7.3 * TAU * (Ltot / 500) + p2);
    const UN = 600, VN = 48, pos = [], ids = [];
    for (let j = 0; j <= VN; j++) {
      const y = lerp(DR.top, DR.floor, j / VN), down = (DR.top - y) / (DR.top - DR.floor);
      const amp = 4.6 + 1.6 * down, brk = Math.max(0, DR.floor + 9 - y);
      for (let i = 0; i <= UN; i++) {
        const u = i / UN, sw = Math.sin(phase(u)), fold = Math.sign(sw) * Math.pow(Math.abs(sw), 0.75);
        // (the folds widen a touch as they fall, the cloth bows gently,
        // and the hem kicks forward where it breaks on the floor)
        const q = at(Math.min(Ltot, Math.max(0, u * Ltot + 1.5 * down * Math.sin(phase(u) * 0.5))));
        const off = amp * fold + 3 * Math.sin(u * 1.7 * TAU * (Ltot / 500) + p3) * down + brk * 0.8 * (0.6 + 0.4 * fold);
        pos.push(q.x + q.nx * off, y, q.z + q.nz * off);
      }
    }
    for (let j = 0; j < VN; j++) for (let i = 0; i < UN; i++) { const a = j * (UN + 1) + i, b = a + UN + 1; ids.push(a, b, a + 1, a + 1, b, b + 1); }
    const g = new THREE.BufferGeometry(); g.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3)); g.setIndex(ids); g.computeVertexNormals();
    mesh(g, drapeM, stage, false);
    // (the pole - along the line, then along the wall - its finials, and a
    // ring at each pleat of the heading)
    const py = DR.top + 7;
    const pole = (len, x, z, rotY) => { const gg = new THREE.CylinderGeometry(2.2, 2.2, len, 16); gg.rotateZ(Math.PI / 2); keep(gg); const m = mesh(gg, gilt, stage, false); m.position.set(x, py, z); m.rotation.y = rotY; };
    pole(L1 + 15, xL + (L1 + 15) / 2 - 0, DR.z + 1, 0);
    { const e = at(0), mx = (e.x + xL) / 2, mz = (e.z + DR.z) / 2; pole(DR.Lw + 1, mx + nL[0], mz + nL[1], Math.PI - th); }
    const fin = new THREE.SphereGeometry(4.2, 20, 14); keep(fin);
    [[xL + L1 + 15, DR.z + 1], [at(0).x, at(0).z + 1], [xL, DR.z + 1]].forEach(([x, z]) => mesh(fin, gilt, stage, false).position.set(x, py, z));
    const ring = new THREE.TorusGeometry(3.0, 0.45, 8, 20); keep(ring);
    for (let k = 0; k <= pleats; k++) {
      // (each ring on a crest of the heading: where the pleat's phase is a quarter turn)
      let u = (k + 0.25) / pleats; for (let it = 0; it < 6; it++) u -= (phase(u) - (k + 0.25) * TAU) / (pleats * TAU);
      if (u < 0 || u > 1) continue;
      const q = at(u * Ltot), r = mesh(ring, gilt, stage, false);
      r.position.set(q.x + q.nx, py, q.z + q.nz);
      // (its hoop opens along the pole: the main run's pole is the stage's x axis, the wall's is the leg's)
      r.rotation.y = (u * Ltot < DR.Lw ? Math.PI - th : 0) + Math.PI / 2;
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
    mesh(new THREE.CylinderGeometry(0.65, 0.9, LEVER.len, 16), brass, lever).position.y = LEVER.len / 2;
    // (its mount: a gilt flange where the boss meets the apron, a hub at the pivot with its cap, so the arm is seen to hang from something)
    const flange = mesh(new THREE.CylinderGeometry(3.5, 3.5, 0.8, 32), gilt, lever); flange.rotation.z = Math.PI / 2; flange.position.x = reach - 0.2;
    mesh(new THREE.SphereGeometry(2.7, 24, 16), gilt, lever);
    const cap = mesh(new THREE.CylinderGeometry(0.9, 0.9, 0.5, 16), brass, lever); cap.rotation.z = Math.PI / 2; cap.position.x = -2.6;
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
  const PROF = [[13.0, -2], [12.0, 1], [10.0, 5], [8.5, 10], [9.2, 15], [10.3, 21], [11.2, 27], [11.7, 31], [11.3, 33.5], [9.4, 36.2], [6.8, 38.4], [4.4, 39.6], [3.6, 40.2]];
  const DEP = 0.6;
  // (the coat over it: a shell of its own, standing off the waistcoat, its
  // skirts flaring over the stool's cushion, open down the front)
  const PROFC = [[15.4, -3.2], [14.0, -1], [11.8, 2], [10.2, 6], [9.4, 10], [10.2, 15], [11.5, 21], [12.3, 27], [12.7, 31], [12.3, 33.5], [10.0, 36.2], [7.4, 38.4], [5.6, 39.2], [4.5, 39.8]];
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
  // (the coat's skirts do not hang as a cone: they fall in soft folds, deeper
  // toward the hem, a coat's side pleats and the cloth's own weight)
  const skirtFold = (a, y) => 1 + 0.05 * smoother((7 - y) / 11) * (Math.sin(a * 7 + 0.6) * 0.7 + Math.sin(a * 11 + 2.1) * 0.3);
  function angOf(x, z, r) { return z > 0 ? Math.atan2(Math.sign(x) * Math.min(1, Math.abs(x / r)) ** 1.5, Math.min(1, z / (DEP * r)) ** 1.5) : Math.atan2(x, z / DEP); }
  function frontZ(y, x) { const r = profR(y); return DEP * r * Math.max(0, 1 - Math.abs(x / r) ** 3) ** (1 / 3); }
  // the coat's opening, each side of the front: wide over the chest and the
  // waistcoat, closing toward the collar
  function openAt(y) { return y < 5 ? lerp(1.55, 0.95, (y + 3.2) / 8.2) : y < 30 ? 0.95 : y < 37 ? lerp(0.95, 0.45, (y - 30) / 7) : 0.45; }
  const lathe = (P, cut) => {
    const g = new THREE.LatheGeometry(P.map(([r, y]) => new THREE.Vector2(r, y)), 128);
    const p = g.attributes.position;
    for (let i = 0; i < p.count; i++) { const x = p.getX(i), z = p.getZ(i), a = Math.atan2(x, z), f = cut ? skirtFold(a, p.getY(i)) : 1, [sx, sz] = sup(a, Math.hypot(x, z) * f); p.setX(i, sx); p.setZ(i, sz); }
    if (cut) {
      const idx = g.index, keepIdx = [];
      for (let i = 0; i < idx.count; i += 3) {
        const a = idx.getX(i), b = idx.getX(i + 1), c = idx.getX(i + 2);
        const cx = (p.getX(a) + p.getX(b) + p.getX(c)) / 3, cz = (p.getZ(a) + p.getZ(b) + p.getZ(c)) / 3, cy = (p.getY(a) + p.getY(b) + p.getY(c)) / 3;
        if (!(Math.abs(angOf(cx, cz, radAt(P, cy))) < openAt(cy))) keepIdx.push(a, b, c);
      }
      g.setIndex(keepIdx);
      // (the cloth's own value: lit at the shoulders, deeper toward the hem, and a crease dark at the waist where it is gathered)
      const col = new Float32Array(p.count * 3);
      for (let i = 0; i < p.count; i++) { const y = p.getY(i), v = lerp(0.55, 1.0, smoother((y - 1) / 30)) * (1 - 0.22 * Math.exp(-(((y - 10.5) / 3.2) ** 2))); col[i * 3] = col[i * 3 + 1] = col[i * 3 + 2] = v; }
      g.setAttribute('color', new THREE.BufferAttribute(col, 3));
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
  const coatSide = coat.clone(); coatSide.side = THREE.DoubleSide; coatSide.vertexColors = true; keep(null, coatSide);
  { const m = new THREE.Mesh(torso, vestCut); m.castShadow = true; m.receiveShadow = true; body.add(m); }
  { const g = lathe(PROFC, true); keep(g); const m = new THREE.Mesh(g, coatSide); m.castShadow = true; m.receiveShadow = true; body.add(m); }
  // (a point on the coat at angle a round, height y, off it by lift; and
  // the way out of it there)
  const onCoat = (a, y, lift) => { const r = coatR(y), [x, z] = sup(a, r * skirtFold(a, y)), n = V(x / (r * r), 0, z / (r * DEP) ** 2).normalize(); return { p: V(x, y, z).addScaledVector(n, lift), n }; };
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
      const gt = texOf(canvas(512, 512, (g, W, Hh) => {
        // (a ring round the bezel - the window itself left clear - a soft
        // halo out from it, and rays: the light of a lamp behind a pane)
        const r = g.createRadialGradient(W / 2, Hh / 2, 0, W / 2, Hh / 2, W / 2); r.addColorStop(0, 'rgba(255,180,80,0)'); r.addColorStop(0.2, 'rgba(255,180,80,0)'); r.addColorStop(0.3, 'rgba(255,190,90,0.5)'); r.addColorStop(0.62, 'rgba(255,170,70,0.2)'); r.addColorStop(1, 'rgba(255,160,60,0)');
        g.fillStyle = r; g.fillRect(0, 0, W, Hh);
        g.save(); g.translate(W / 2, Hh / 2); g.globalCompositeOperation = 'lighter';
        for (let k = 0; k < 22; k++) {
          const a = (k / 22) * TAU + 0.07 * Math.sin(k * 2.7), len = W * (0.34 + 0.12 * Math.sin(k * 1.9)), w0 = 0.032 + 0.018 * Math.abs(Math.sin(k * 3.3));
          const rg = g.createLinearGradient(0, 0, Math.cos(a) * len, Math.sin(a) * len); rg.addColorStop(0, 'rgba(255,214,140,0)'); rg.addColorStop(0.18, 'rgba(255,214,140,0.5)'); rg.addColorStop(1, 'rgba(255,190,100,0)');
          g.fillStyle = rg; g.beginPath(); g.moveTo(Math.cos(a - w0) * W * 0.1, Math.sin(a - w0) * W * 0.1); g.lineTo(Math.cos(a) * len, Math.sin(a) * len); g.lineTo(Math.cos(a + w0) * W * 0.1, Math.sin(a + w0) * W * 0.1); g.closePath(); g.fill();
        }
        g.restore();
        g.filter = 'blur(14px)'; g.strokeStyle = 'rgba(255,214,140,0.9)'; g.lineWidth = 26;
        const w2 = W / 2.6 / 2 + 24, h2 = Hh / 3.2 / 2 + 24; g.beginPath(); g.roundRect(W / 2 - w2, Hh / 2 - h2, 2 * w2, 2 * h2, 30); g.stroke();
      }), true);
      const gmat = new THREE.MeshBasicMaterial({ map: gt, transparent: true, opacity: 0, depthWrite: false, blending: THREE.AdditiveBlending, toneMapped: false }); keep(null, gmat);
      windowGlow = mesh(new THREE.PlaneGeometry(WIN.w * 4.4, WIN.h * 6.2), gmat, body, false); windowGlow.position.set(0, WIN.y, winZ + 0.6);
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
    // (the neck: in the shade of the jaw above, lighter toward the collar, so it
    // never shows as a pale tube under the chin)
    const neckG = new THREE.CylinderGeometry(3.25, 3.3, 6.5, 28), neckP = neckG.attributes.position, neckC = new Float32Array(neckP.count * 3);
    for (let i = 0; i < neckP.count; i++) { const k = smoother(clamp01((0.7 - neckP.getY(i)) / 3)); neckC[i * 3] = lerp(0.6, 1, k); neckC[i * 3 + 1] = lerp(0.44, 1, k); neckC[i * 3 + 2] = lerp(0.4, 1, k); }
    neckG.setAttribute('color', new THREE.BufferAttribute(neckC, 3));
    const neckM = bisque.clone(); neckM.vertexColors = true; keep(null, neckM);
    mesh(neckG, neckM, body).position.set(0, NECKY + 0.6, 0.8);
    const collar = mesh(new THREE.CylinderGeometry(3.7, 4.1, 2.6, 28, 1, true), linen, body); collar.scale.set(1, 1, 0.9); collar.position.set(0, 39.0, 0.6);
    // (the ruff: lace gathered round the throat, standing open under the
    // chin, its scalloped edge up)
    {
      const g = new THREE.CylinderGeometry(4.5, 3.6, 1.6, 144, 3, true), p = g.attributes.position, uv = g.attributes.uv;
      for (let i = 0; i < p.count; i++) { const x = p.getX(i), y = p.getY(i), z = p.getZ(i), f = clamp01((y + 0.8) / 1.6), k = 1 + 0.1 * f * Math.sin(Math.atan2(x, z) * 22); p.setX(i, x * k); p.setZ(i, z * k); uv.setXY(i, uv.getX(i) * 6, 1 - uv.getY(i)); }
      g.computeVertexNormals();
      const ruff = mesh(g, lace, body); ruff.scale.set(1, 1, 0.9); ruff.position.set(0, 40.5, 0.7);
    }
    // (three tiers of lace, gathered at the throat and falling in deep
    // pleats down the waistcoat, widening, to just over the window; each
    // hem scalloped and rippling, each tier a little proud of the one
    // behind it so the folds throw their shade on it)
    for (let k = 0; k < 3; k++) {
      const top = 38.6 - k * 1.1, len = [5.6, 4.4, 3.2][k], W0 = 2.5 - k * 0.2, W1 = 4.9 - k * 0.6, ph = k * 1.3, nP = [4.5, 3.6, 5.3][k];
      const g = new THREE.PlaneGeometry(1, 1, 96, 14), p = g.attributes.position, uv = g.attributes.uv;
      for (let i = 0; i < p.count; i++) {
        const u = p.getX(i) + 0.5, v = p.getY(i) + 0.5, f = 1 - v, wd = lerp(W0, W1, f), x = (u - 0.5) * wd;
        // (the hem rides up and down on its pleats, and the pleats deepen toward it)
        // (no two pleats alike: the count drifts across the width, a finer ripple rides on it, and the middle sags)
        const warp = 0.9 * Math.sin(u * TAU * 1.3 + k * 2.1), wave = Math.sin(u * TAU * nP + ph + warp) + 0.35 * Math.sin(u * TAU * 8.3 + k), sag = 0.5 * f * f * (0.5 + 0.5 * Math.cos((u - 0.5) * TAU * 0.9));
        const y = top - f * len + 0.22 * f * f * wave - sag;
        const pleat = (0.2 + 0.34 * f) * (0.5 - 0.5 * Math.cos(u * TAU * nP + ph + warp)) * (0.4 + 0.6 * f) + 0.07 * f * Math.sin(u * TAU * 9.5 + ph * 2);
        p.setXYZ(i, x, y, frontZ(y, x) + 0.28 + k * 0.42 + pleat + 0.3 * f * f);
        uv.setXY(i, u * wd / 3.2, (v * len) / 2.4);
      }
      g.computeVertexNormals();
      mesh(g, lace, body);
    }
  }

  // ---- The head: bisque, sculpted round (a child's - a high forehead,
  // full cheeks, a small nose and chin), the face painted; the eyes glass,
  // set behind almond openings with lids that close over them as a doll's
  // do; his own hair, a soft rounded crop of coils.
  const neckPivot = new THREE.Group(); neckPivot.position.set(0, NECKY, 0.8); body.add(neckPivot);
  const headG = new THREE.Group(); headG.position.set(0, HEAD.up, HEAD.fwd); headG.rotation.order = 'YXZ'; neckPivot.add(headG);
  const EYE = { x: 0.3, y: -0.07, w: 0.148, h: 0.08, r: 1.5 };
  const gauss = (x, y, cx, cy, sx, sy) => Math.exp(-(((x - cx) / sx) ** 2) - (((y - cy) / sy) ** 2));
  // (the face's relief, on the unit sphere, in front)
  const relief = (x, y) => {
    let dz = 0;
    // the brow, rounded, and its soft ridge over each eye; the orbits
    dz += 0.04 * gauss(x, y, 0, 0.3, 0.6, 0.12);
    dz += 0.02 * (gauss(x, y, 0.28, 0.1, 0.16, 0.05) + gauss(x, y, -0.28, 0.1, 0.16, 0.05));
    dz -= 0.09 * (gauss(x, y, EYE.x, EYE.y, 0.17, 0.12) + gauss(x, y, -EYE.x, EYE.y, 0.17, 0.12));
    // the nose: a small bridge, a round tip turned up, its wings
    dz += 0.12 * gauss(x, 0, 0, 0, 0.05, 1) * clamp01((0.02 - y) / 0.22) * clamp01((y + 0.27) / 0.08);
    dz += 0.1 * gauss(x, y, 0, -0.208, 0.055, 0.05);
    dz += 0.07 * (gauss(x, y, 0.078, -0.243, 0.05, 0.04) + gauss(x, y, -0.078, -0.243, 0.05, 0.04));
    // (the nostrils: two real pits under the tip, and the crease that parts each wing from the cheek)
    dz -= 0.075 * (gauss(x, y, 0.052, -0.268, 0.024, 0.017) + gauss(x, y, -0.052, -0.268, 0.024, 0.017));
    // (the philtrum: a groove between two soft ridges, from the nose to the lip)
    dz -= 0.03 * gauss(x, y, 0, -0.34, 0.016, 0.04);
    dz += 0.02 * (gauss(x, y, 0.045, -0.345, 0.018, 0.04) + gauss(x, y, -0.045, -0.345, 0.018, 0.04));
    dz -= 0.035 * (gauss(x, y, 0.15, -0.265, 0.026, 0.06) + gauss(x, y, -0.15, -0.265, 0.026, 0.06));
    // the cheeks: full, low
    dz += 0.22 * (gauss(x, y, 0.4, -0.2, 0.29, 0.26) + gauss(x, y, -0.4, -0.2, 0.29, 0.26));
    // the philtrum; the lips, the lower the fuller, parted by a line; the
    // groove under them; the chin, a small round
    dz -= 0.02 * gauss(x, y, 0, -0.33, 0.028, 0.035);
    dz += 0.09 * gauss(x, y, 0, -0.405, 0.17, 0.038);
    dz += 0.1 * gauss(x, y, 0, -0.478, 0.16, 0.046);
    dz -= 0.032 * gauss(x, y, 0, -0.435, 0.105, 0.009);
    dz -= 0.014 * gauss(x, y, 0, -0.56, 0.09, 0.03);
    dz += 0.09 * gauss(x, y, 0, -0.68, 0.2, 0.11);
    return dz;
  };
  const unitZ = (x, y) => Math.sqrt(Math.max(0, 1 - x * x - y * y));
  const FS = 1024;
  const P = (x, y) => [(0.5 + x * 0.5) * FS, (0.5 - y * 0.5) * FS];
  // (an eye's opening: an almond, the upper lid's arch higher than the
  // lower's)
  const almondPts = s => {
    const [cx, cy] = P(s * EYE.x, EYE.y), rx = EYE.w * FS / 2, ry = EYE.h * FS / 2;
    return { cx, cy, rx, ry, upper: [cx - rx, cy + ry * 0.1, cx - rx * 0.6, cy - ry * 1.25, cx + rx * 0.5, cy - ry * 1.3, cx + rx, cy - ry * 0.05], lower: [cx + rx, cy - ry * 0.05, cx + rx * 0.55, cy + ry * 1.0, cx - rx * 0.55, cy + ry * 1.05, cx - rx, cy + ry * 0.1] };
  };
  const almond = (c, s) => { const a = almondPts(s); c.beginPath(); c.moveTo(a.upper[0], a.upper[1]); c.bezierCurveTo(...a.upper.slice(2)); c.bezierCurveTo(...a.lower.slice(2)); c.closePath(); };
  {
    const g = new THREE.SphereGeometry(1, 280, 200);
    const p = g.attributes.position, uv = g.attributes.uv;
    // (the lower face runs shorter than the upper, eased in with no crease: the
    // slope falls from 1 at the cheek to 0.62 at the chin)
    const lowerFace = t => { const k = Math.min(1, t / 0.3); return t - 0.38 * (0.3 * (k * k * k - k * k * k * k / 2) + Math.max(0, t - 0.3) * 1); };
    for (let i = 0; i < p.count; i++) {
      let x = p.getX(i), z = p.getZ(i);
      const y = p.getY(i), fr = clamp01(z * 1.6);
      // the jaw: a child's - wide and round, barely narrower below the cheeks
      const jaw = clamp01((-y - 0.12) / 0.8);
      x *= 1 - 0.26 * Math.pow(jaw, 1.8); z *= 1 - 0.06 * jaw;
      z += relief(x, y) * fr;
      p.setXYZ(i, x * HEAD.rx, (y > -0.3 ? y : -0.3 - lowerFace(-0.3 - y)) * HEAD.ry, z * HEAD.rz);
      uv.setXY(i, 0.5 + x * 0.5, 0.5 + y * 0.5);
    }
    g.computeVertexNormals();
    // the face, painted
    // (the skin paints from its own stream, so changing it never reshuffles the hair)
    const rf = mkRng(0x5c1a0f);
    const face = canvas(FS, FS, (c) => {
      c.fillStyle = '#e0b090'; c.fillRect(0, 0, FS, FS);
      const blob = (x, y, rx, ry, col) => { const [px, py] = P(x, y); const gr = c.createRadialGradient(px, py, 0, px, py, rx * FS / 2); gr.addColorStop(0, col); gr.addColorStop(1, 'rgba(0,0,0,0)'); c.save(); c.translate(px, py); c.scale(1, ry / rx); c.translate(-px, -py); c.fillStyle = gr; c.beginPath(); c.arc(px, py, rx * FS / 2, 0, TAU); c.fill(); c.restore(); };
      // (a child's skin is not one flat tone: warm and a little uneven, a
      // fine speckle of pores and capillaries, shade in the hollows - the
      // eye sockets, beside the nose, under the lip and the chin, the
      // temples and the jaw's edge)
      for (let k = 0; k < 7000; k++) { const px = rf() * FS, py = rf() * FS; c.fillStyle = rf() < 0.5 ? 'rgba(190,110,96,0.08)' : rf() < 0.5 ? 'rgba(120,80,60,0.06)' : 'rgba(236,196,170,0.07)'; c.beginPath(); c.arc(px, py, 0.8 + rf() * 1.6, 0, TAU); c.fill(); }
      // (and the large, slow unevenness of living skin: a warmer patch, a
      // cooler one, none of them anything a viewer could point at)
      for (let k = 0; k < 110; k++) { const x = (rf() * 2 - 1) * 0.9, y = (rf() * 2 - 1) * 0.9; blob(x, y, 0.07 + rf() * 0.2, 0.06 + rf() * 0.16, rf() < 0.5 ? 'rgba(214,112,98,0.11)' : rf() < 0.5 ? 'rgba(176,150,150,0.1)' : 'rgba(236,196,166,0.1)'); }
      [-1, 1].forEach(s => {
        blob(s * 0.3, -0.01, 0.36, 0.18, 'rgba(140,84,74,0.32)');
        blob(s * 0.68, 0.1, 0.3, 0.3, 'rgba(140,92,80,0.26)');
        blob(s * 0.2, -0.34, 0.07, 0.14, 'rgba(140,80,76,0.14)');
        blob(s * 0.095, -0.245, 0.05, 0.05, 'rgba(150,84,80,0.36)');
        blob(s * 0.62, -0.5, 0.2, 0.3, 'rgba(140,88,78,0.14)');
      });
      blob(0, -0.28, 0.13, 0.045, 'rgba(130,72,68,0.26)');
      blob(0, -0.8, 0.24, 0.08, 'rgba(130,84,74,0.2)');
      blob(0, 0.45, 0.5, 0.12, 'rgba(150,100,88,0.1)');
      [-1, 1].forEach(s => { blob(s * 0.78, 0.35, 0.22, 0.26, 'rgba(150,140,150,0.16)'); blob(s * 0.9, -0.15, 0.14, 0.2, 'rgba(226,120,106,0.22)'); });
      blob(0, -0.19, 0.14, 0.1, 'rgba(226,116,106,0.2)');
      // (rosy: the cheeks high and strong, the tip of the nose, the chin,
      // the lids)
      [-1, 1].forEach(s => { blob(s * 0.5, -0.12, 0.9, 0.5, 'rgba(222,118,108,0.2)'); blob(s * 0.8, -0.05, 0.3, 0.34, 'rgba(206,114,102,0.12)'); blob(s * EYE.x, EYE.y, 0.34, 0.2, 'rgba(112,66,62,0.2)'); blob(s * 0.13, EYE.y + 0.02, 0.07, 0.11, 'rgba(120,70,66,0.3)'); });
      // (the nose: its sides in shade, the bridge and the tip catching the
      // light, the wings creased, the nostrils dark, a shade under the tip)
      [-1, 1].forEach(s => {
        blob(s * 0.1, -0.1, 0.055, 0.2, 'rgba(150,92,80,0.2)');
        blob(s * 0.115, -0.24, 0.035, 0.07, 'rgba(120,64,58,0.36)');
        blob(s * 0.2, -0.3, 0.07, 0.06, 'rgba(150,90,80,0.08)');
        blob(s * EYE.x, EYE.y - 0.115, 0.2, 0.05, 'rgba(150,100,114,0.28)');
      });
      blob(0, -0.12, 0.04, 0.18, 'rgba(255,238,222,0.2)');
      blob(0, -0.205, 0.05, 0.035, 'rgba(255,240,228,0.24)');
      blob(0, -0.305, 0.09, 0.026, 'rgba(116,64,60,0.14)');
      // (the face's warm and cool: the apple of each cheek catching light, the
      // lips ringed rosy, the under-eye cooler and bluer, the nose-fold shaded)
      [-1, 1].forEach(s => {
        blob(s * 0.36, -0.14, 0.2, 0.13, 'rgba(255,226,206,0.16)');
        blob(s * EYE.x, EYE.y - 0.14, 0.24, 0.06, 'rgba(110,100,150,0.17)');
        blob(s * 0.1, -0.44, 0.07, 0.09, 'rgba(196,100,100,0.16)');
      });
      blob(0, -0.435, 0.26, 0.09, 'rgba(200,104,102,0.16)');
      // (the brim's shade on the forehead, painted in: the hat is always the
      // same height over it, and the lamp comes from above it)
      blob(0, 0.74, 1.0, 0.24, 'rgba(84,44,34,0.46)');
      blob(0, 0.9, 1.0, 0.22, 'rgba(70,36,28,0.56)');
      blob(0, 0.58, 1.0, 0.14, 'rgba(96,52,42,0.24)');
      blob(0, -0.21, 0.09, 0.07, 'rgba(228,112,104,0.32)');
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
      [-1, 1].forEach(s => { c.strokeStyle = 'rgba(140,86,80,0.45)'; c.lineWidth = 5; almond(c, s); c.stroke(); });
      // (the nostrils)
      [-1, 1].forEach(s => { blob(s * 0.054, -0.268, 0.04, 0.026, 'rgba(70,28,32,0.9)'); blob(s * 0.058, -0.285, 0.05, 0.02, 'rgba(120,60,58,0.3)'); });
      // the mouth: small, the upper lip a bow, the lower full
      const M = (x, y) => P(x, -0.435 + y * 1.6), mw = 0.19;
      { const g1 = c.createLinearGradient(0, M(0, 0.03)[1], 0, M(0, 0)[1]); g1.addColorStop(0, '#8c4a50'); g1.addColorStop(1, '#a45c60'); c.fillStyle = g1; }
      c.beginPath(); c.moveTo(...M(-mw, 0));
      c.quadraticCurveTo(...M(-0.058, 0.024), ...M(-0.026, 0.033)); c.quadraticCurveTo(...M(0, 0.02), ...M(0.026, 0.033));
      c.quadraticCurveTo(...M(0.058, 0.024), ...M(mw, 0)); c.quadraticCurveTo(...M(0, -0.006), ...M(-mw, 0));
      c.fill();
      { const g2 = c.createLinearGradient(0, M(0, 0)[1], 0, M(0, -0.058)[1]); g2.addColorStop(0, '#a85e62'); g2.addColorStop(0.55, '#bc7070'); g2.addColorStop(1, '#c88282'); c.fillStyle = g2; }
      c.beginPath(); c.moveTo(...M(-mw * 0.88, -0.002)); c.quadraticCurveTo(...M(-0.056, -0.054), ...M(0, -0.058)); c.quadraticCurveTo(...M(0.056, -0.054), ...M(mw * 0.88, -0.002)); c.quadraticCurveTo(...M(0, -0.008), ...M(-mw * 0.88, -0.002));
      c.fill();
      blob(0.01, -0.435 - 0.034, 0.06, 0.016, 'rgba(255,222,222,0.24)');
      [-1, 1].forEach(s => blob(s * mw * 0.96, -0.435, 0.028, 0.02, 'rgba(110,58,58,0.4)'));
      c.strokeStyle = 'rgba(92,26,36,0.75)'; c.lineWidth = 2.5; c.beginPath(); c.moveTo(...M(-mw, 0)); c.quadraticCurveTo(...M(0, -0.008), ...M(mw, 0)); c.stroke();
      // the brows: a soft body of brown, and over it single hairs laid the way
      // a brow grows - up and out from the nose, then along the arch, then
      // down at the tail - thick at the middle, fine at the ends
      c.lineCap = 'round';
      const bx = t => 0.13 + 0.34 * t, by = t => 0.105 + 0.04 * Math.sin(t * Math.PI * 0.9) - 0.045 * t;
      c.save(); c.filter = 'blur(4px)'; c.strokeStyle = 'rgba(58,36,24,0.42)'; c.lineWidth = 11;
      [-1, 1].forEach(s => { c.beginPath(); for (let k = 0; k <= 12; k++) { const t = k / 12, [px, py] = P(s * bx(t), by(t)); if (k) c.lineTo(px, py); else c.moveTo(px, py); } c.stroke(); });
      c.restore();
      c.save();
      [-1, 1].forEach(s => {
        for (let k = 0; k < 340; k++) {
          const t = Math.min(0.995, Math.max(0.005, k / 339 + (rf() - 0.5) * 0.01));
          const thick = 0.012 + 0.03 * Math.sin(Math.min(1, t * 1.15) * Math.PI) ** 0.7;
          const [px, py] = P(s * bx(t) + (rf() - 0.5) * 0.006, by(t) + (rf() - 0.5) * thick);
          const [qx, qy] = P(s * bx(Math.min(1, t + 0.01)), by(Math.min(1, t + 0.01)));
          let dx = (qx - px) * s, dy = qy - py; const dl = Math.hypot(dx, dy) || 1; dx /= dl; dy /= dl;
          // (the hair's lie: up and out near the nose, level mid-brow, a little down at the tail)
          const turn = (1 - t) * -0.6 + t * t * 0.5 + (rf() - 0.5) * 0.3, cs = Math.cos(turn), sn = Math.sin(turn);
          const ex = dx * cs - dy * sn, ey = dx * sn + dy * cs, len = 13 + rf() * 9 - 6 * Math.abs(t - 0.45);
          c.strokeStyle = `rgba(${34 + Math.round(rf() * 20)},${20 + Math.round(rf() * 12)},${12 + Math.round(rf() * 6)},${0.45 + 0.45 * rf()})`;
          c.lineWidth = 1.1 + 0.9 * rf();
          c.beginPath(); c.moveTo(px, py); c.quadraticCurveTo(px + s * ex * len * 0.5, py + ey * len * 0.5 - 1.5, px + s * ex * len, py + ey * len); c.stroke();
        }
      });
      c.restore();
    });
    for (let k = 0; k < 17430; k++) rng();
    // (the openings: cut out of the bisque, the eyes behind them)
    const cut = canvas(FS, FS, (c) => { c.fillStyle = '#fff'; c.fillRect(0, 0, FS, FS); c.fillStyle = '#000'; [-1, 1].forEach(s => { almond(c, s); c.fill(); }); });
    const skin = bisque.clone(); skin.color.setHex(0xffffff); skin.map = texOf(face, true); skin.alphaMap = texOf(cut, false); skin.alphaTest = 0.5; skin.normalMap = poreTex(9); skin.normalScale = new THREE.Vector2(0.45, 0.45); skin.specularIntensity = 0.3; skin.roughness = 0.62; skin.emissive = new THREE.Color(0xffffff); skin.emissiveMap = skin.map; skin.emissiveIntensity = 0.22;
    // (a child's skin is lit through, not only from its face: where it is thin
    // - the nose's edge, the rim of the cheek, the ears - the blood shows, a warm
    // red bleeding in at the grazing edge; and its value holds when the room
    // dims or warms, since a mood grades the light, never the skin itself)
    const SSS = 0.6, LOCK = 0.1, FLOOR = 0.82;
    skin.customProgramCacheKey = () => 'slots-skin-sss';
    skin.onBeforeCompile = (sh) => {
      sh.fragmentShader = sh.fragmentShader.replace('#include <opaque_fragment>', `
        {
          vec3 vv = normalize(vViewPosition);
          float ndv = clamp(dot(normal, vv), 0.0, 1.0);
          float rim = pow(1.0 - ndv, 2.2);
          vec3 base = diffuseColor.rgb;
          outgoingLight += base * vec3(1.0, 0.30, 0.18) * rim * ${SSS.toFixed(2)};
          vec3 held = base * (0.70 + 0.30 * ndv) * 0.98;
          outgoingLight = max(mix(outgoingLight, held, ${LOCK.toFixed(2)}), held * ${FLOOR.toFixed(2)});
          float lit = dot(outgoingLight, vec3(0.3, 0.59, 0.11)) / max(dot(held, vec3(0.3, 0.59, 0.11)), 0.001);
          float shade = 1.0 - smoothstep(0.55, 1.0, lit);
          outgoingLight *= mix(vec3(1.0), vec3(1.1, 0.88, 0.8), shade * 0.6);
        }
        #include <opaque_fragment>`);
    };
    keep(null, skin);
    mesh(g, skin, headG);
  }
  // the eyes: glass over a painted iris (brown, the fibres drawn in), each
  // in a socket lined dark; the upper lid a shell of bisque inside the
  // opening that closes down over the eye
  const eyes = [], lids = [], glints = [];
  let eyeMatRef = null;
  {
    const TS = 512;
    const iris = texOf(canvas(TS, TS, (c) => {
      c.fillStyle = '#e8dccb'; c.fillRect(0, 0, TS, TS);
      const cx = TS * 0.25, cy = TS / 2, R = TS * 0.064;
      c.save(); c.translate(cx, cy); c.scale(1, 2); c.translate(-cx, -cy);
      const gr = c.createRadialGradient(cx, cy, 0, cx, cy, R);
      gr.addColorStop(0, '#080504'); gr.addColorStop(0.36, '#080504'); gr.addColorStop(0.4, '#1c0f07'); gr.addColorStop(0.72, '#3e2410'); gr.addColorStop(0.88, '#1a0e07'); gr.addColorStop(0.97, '#2a1a10'); gr.addColorStop(1, 'rgba(232,220,203,0)');
      c.fillStyle = gr; c.beginPath(); c.arc(cx, cy, R, 0, TAU); c.fill();
      c.strokeStyle = 'rgba(190,140,86,0.28)'; c.lineWidth = 1;
      for (let k = 0; k < 48; k++) { const a = (k / 48) * TAU; c.beginPath(); c.moveTo(cx + Math.cos(a) * R * 0.42, cy + Math.sin(a) * R * 0.42); c.lineTo(cx + Math.cos(a) * R * 0.9, cy + Math.sin(a) * R * 0.9); c.stroke(); }
      c.restore();
      // (the white is not white: it darkens toward the corners of the eye,
      // where the lids close round the ball, and takes a little of the
      // skin's warmth there)
      { c.save(); c.translate(cx, cy); c.scale(1, 2); c.translate(-cx, -cy);
        const wg = c.createRadialGradient(cx, cy, R * 1.05, cx, cy, R * 3.6);
        wg.addColorStop(0, 'rgba(120,80,68,0)'); wg.addColorStop(0.45, 'rgba(120,80,68,0.16)'); wg.addColorStop(1, 'rgba(120,80,68,0.62)');
        c.fillStyle = wg; c.beginPath(); c.arc(cx, cy, R * 3.6, 0, TAU); c.fill(); c.restore(); }
      // (the lids shade the eye: the white and the iris darker under the
      // upper lid, a little under the lower, not one flat white)
      const sg = c.createLinearGradient(0, TS * 0.41, 0, TS * 0.59);
      sg.addColorStop(0, 'rgba(96,60,52,0.6)'); sg.addColorStop(0.35, 'rgba(96,60,52,0.18)'); sg.addColorStop(0.5, 'rgba(96,60,52,0)'); sg.addColorStop(1, 'rgba(96,60,52,0.3)');
      c.fillStyle = sg; c.fillRect(0, 0, TS, TS);
    }), true);
    // (the iris alone, to warm it from within on the jackpot)
    const irisGlow = texOf(canvas(TS, TS, (c) => {
      c.fillStyle = '#000'; c.fillRect(0, 0, TS, TS);
      const cx = TS * 0.25, cy = TS / 2, R = TS * 0.06;
      c.save(); c.translate(cx, cy); c.scale(1, 2); c.translate(-cx, -cy);
      const gr = c.createRadialGradient(cx, cy, 0, cx, cy, R);
      gr.addColorStop(0, '#000'); gr.addColorStop(0.38, '#000'); gr.addColorStop(0.45, '#ffb040'); gr.addColorStop(0.85, '#ffd890'); gr.addColorStop(1, '#000');
      c.fillStyle = gr; c.beginPath(); c.arc(cx, cy, R, 0, TAU); c.fill();
      c.restore();
    }), true);
    const eyeMat = new THREE.MeshPhysicalMaterial({ map: iris, roughness: 0.04, clearcoat: 1, clearcoatRoughness: 0.02, emissiveMap: irisGlow, emissive: 0xffc070, emissiveIntensity: 0 });
    keep(null, eyeMat); eyeMatRef = eyeMat;
    const eg = new THREE.SphereGeometry(EYE.r, 48, 32); keep(eg);
    const lidG = new THREE.SphereGeometry(EYE.r + 0.07, 48, 16, 0, TAU, 0, Math.PI / 2); keep(lidG);
    {
      // (the lid's edge painted umber: the lash line, as a doll's lid has)
      const p = lidG.attributes.position, col = new Float32Array(p.count * 3), R0 = EYE.r + 0.07;
      for (let i = 0; i < p.count; i++) { const th = Math.acos(Math.max(-1, Math.min(1, p.getY(i) / R0))), k = clamp01((th - 1.47) / 0.08), fold = lerp(0.8, 1, smoother((th - 0.85) / 0.6)); col[i * 3] = lerp(fold, 0.36, k); col[i * 3 + 1] = lerp(fold * 0.9, 0.22, k); col[i * 3 + 2] = lerp(fold * 0.88, 0.17, k); }
      lidG.setAttribute('color', new THREE.BufferAttribute(col, 3));
    }
    const lidMat = bisque.clone(); lidMat.color.setHex(0xe0ae94); lidMat.vertexColors = true; lidMat.side = THREE.DoubleSide; keep(null, lidMat);
    // (the lid's margin: a dark rounded edge, and the lashes out of it -
    // long, dark, a doll's - which go with the lid as it closes)
    const R0 = EYE.r + 0.07, LA = 0.47;
    const arc = k => { const a = lerp(-LA, LA, k); return V(Math.sin(a) * R0, 0, Math.cos(a) * R0); };
    const marginG = new THREE.TubeGeometry(new THREE.CatmullRomCurve3(Array.from({ length: 25 }, (_, k) => arc(k / 24))), 48, 0.046, 6, false); keep(marginG);
    const marginM = new THREE.MeshStandardMaterial({ color: 0x5a3626, roughness: 0.7 }); keep(null, marginM);
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
      for (let k = 0; k < 150; k++) { const x = (k + 0.5) / 150 * W + (rng() - 0.5) * 1.6; c.lineWidth = 1.3; c.beginPath(); c.moveTo(x, 0); c.quadraticCurveTo(x + 2, Hh * 0.5, x + 4 * (rng() - 0.3), Hh * (0.65 + 0.35 * rng())); c.stroke(); }
      c.fillStyle = '#fff'; c.fillRect(0, 0, W, 6);
    }), false);
    const lashM = new THREE.MeshBasicMaterial({ color: 0x2c1a12, alphaMap: lashA, alphaTest: 0.32, side: THREE.DoubleSide }); keep(null, lashM);
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
        const gl = new THREE.Sprite(sm); gl.scale.set(0.62, 0.62, 1); gl.position.set(0.12, -0.42, EYE.r + 0.06); socket.add(gl); glints.push(gl);
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
    const lowRim = bisque.clone(); lowRim.color.setHex(0xd9a48e); keep(null, lowRim);
    const upRim = bisque.clone(); upRim.color.setHex(0xdba68f); keep(null, upRim);
    [-1, 1].forEach(s => {
      const a = almondPts(s);
      const up = Array.from({ length: 21 }, (_, k) => onFace(...bez(a.upper, k / 20), 0.02));
      const lo = Array.from({ length: 21 }, (_, k) => onFace(...bez(a.lower, k / 20), 0.0));
      mesh(new THREE.TubeGeometry(new THREE.CatmullRomCurve3(up), 40, 0.1, 8, false), upRim, headG);
      mesh(new THREE.TubeGeometry(new THREE.CatmullRomCurve3(lo), 40, 0.065, 8, false), lowRim, headG);
    });
  }
  const HAT = true;
  // the hair: his own, a mop of loose brown ringlets after the Writer's - a
  // dark cap close over the skull (the hair seen into, and its shadow),
  // and over it a few hundred curls, each a tapered tube wound as a spiral,
  // rooted over the scalp and let fall the way the head slopes: lowest and
  // shortest at the brow, where they hang over the forehead as a fringe,
  // longest at the sides and crown, shortest at the nape. Dark at the root,
  // lighter toward the tip, each curl its own shade of brown.
  {
    const RX = HEAD.rx * 1.03, RY = HEAD.ry * 1.02, RZ = HEAD.rz * 1.03, C0 = V(0, 0.2, -0.3), H0 = 0.55;
    // (the hairline: above this height, for a point round the skull - low
    // at the nape, down the sides in front of the ears, so nothing shows
    // through behind the jaw, then up round the brow)
    const line = (x, z) => lerp(-0.92, 0.33 - 0.6 * x * x, smoother((z - 0.5) / 0.4));
    const edgeLa = az => { let lo = -0.95, hi = 0.99; for (let k = 0; k < 30; k++) { const m = (lo + hi) / 2, r = Math.sqrt(1 - m * m); if (m > line(Math.sin(az) * r, Math.cos(az) * r)) hi = m; else lo = m; } return hi; };
    // (the cap's depth: a thin skin of hair rising from the hairline)
    const deep = (y, z, dl) => {
      const T = lerp(1.5, 2.1, smoother((y + 0.2) / 1.1)), front = clamp01((z + 0.1) / 0.7), reach = lerp(0.6, 0.3, front);
      return Math.max(0.3, T * Math.pow(smoother(dl / reach), 0.8));
    };
    {
      const AZN = 80, LAN = 30, pos = [], nrm = [], th = [], den = [], ids = [];
      for (let i = 0; i <= AZN; i++) {
        const az = (i / AZN) * TAU, la0 = edgeLa(az), ph0 = Math.asin(la0);
        for (let j = 0; j <= LAN; j++) {
          const ph = lerp(ph0, Math.PI / 2, j / LAN), y = Math.sin(ph), r = Math.cos(ph), x = Math.sin(az) * r, z = Math.cos(az) * r;
          const p = V(x * RX, y * RY, z * RZ).add(C0), n = V(x / RX, y / RY, z / RZ).normalize(), dl = y - la0;
          pos.push(p.x, p.y, p.z); nrm.push(n.x, n.y, n.z); th.push(deep(y, z, dl)); den.push(lerp(1, 0.5 + 0.5 * smoother(dl / 0.12), clamp01((z - 0.5) / 0.3) * smoother(y / 0.25)));
        }
      }
      for (let i = 0; i < AZN; i++) for (let j = 0; j < LAN; j++) { const a = i * (LAN + 1) + j, b = a + LAN + 1; ids.push(a, b, a + 1, a + 1, b, b + 1); }
      const g = new THREE.BufferGeometry();
      g.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3)); g.setAttribute('normal', new THREE.Float32BufferAttribute(nrm, 3));
      g.setAttribute('aTh', new THREE.Float32BufferAttribute(th, 1)); g.setAttribute('aDen', new THREE.Float32BufferAttribute(den, 1)); g.setIndex(ids);
      g.boundingSphere = new THREE.Sphere(C0.clone(), 22); keep(g);
      const capM = new THREE.MeshPhysicalMaterial({ color: 0x1b0f08, roughness: 0.9, specularIntensity: 0.1, sheen: 0.25, sheenColor: new THREE.Color(0x6a4a34), sheenRoughness: 0.7 });
      capM.onBeforeCompile = sh => {
        sh.vertexShader = sh.vertexShader
          .replace('#include <common>', '#include <common>\nattribute float aTh;\nattribute float aDen;\nvarying float vDen;\nvarying vec3 vHp;')
          .replace('#include <begin_vertex>', `#include <begin_vertex>\ntransformed += normal * aTh * ${H0.toFixed(3)};\nvDen = aDen; vHp = position;`);
        sh.fragmentShader = sh.fragmentShader
          .replace('#include <common>', '#include <common>\nvarying float vDen;\nvarying vec3 vHp;')
          .replace('#include <map_fragment>', '#include <map_fragment>\n{ float hz = fract(sin(dot(floor(vHp * 7.0), vec3(12.9898, 78.233, 37.719))) * 43758.5453); if (vDen < 0.98 && hz > vDen) discard; }');
      };
      capM.customProgramCacheKey = () => 'ringlet-cap'; keep(null, capM);
      const cap = mesh(g, capM, headG); cap.receiveShadow = false;
      // (the cap's own shadow, from its depth and not the bare skull's)
      const depthM = new THREE.MeshDepthMaterial({ depthPacking: THREE.RGBADepthPacking });
      depthM.onBeforeCompile = sh => { sh.vertexShader = sh.vertexShader.replace('#include <common>', '#include <common>\nattribute float aTh;').replace('#include <begin_vertex>', `#include <begin_vertex>\ntransformed += normal * aTh * ${H0.toFixed(3)};`); };
      depthM.customProgramCacheKey = () => 'ringlet-depth'; keep(null, depthM);
      cap.customDepthMaterial = depthM;
      // (the curls)
      const cRoot = new THREE.Color(0x070302), cA = new THREE.Color(0x170c06), cB = new THREE.Color(0x34200f), cc = new THREE.Color();
      // (locks: each ringlet is two or three fine strands wound together, so it reads as one
      // curl made of hair, not one smooth tube; every strand tapers to a closed point)
      const NL = HAT ? 300 : 460, M = 12, DOWN = V(0, -1, 0);
      const PP = [], NN = [], CC = [], II = [];
      const P = V(0, 0, 0), T = V(0, 0, 0), Nn = V(0, 0, 0), Bb = V(0, 0, 0);
      let made = 0, guard = 0, K = 5;
      while (made < NL && guard++ < 40000) {
        const fringe = made > NL * 0.78, temple = !fringe && made > NL * 0.62, crown = !HAT && !fringe && !temple && made > NL * 0.5, inner = !fringe && !temple && !crown && made > NL * 0.36;
        let az, y;
        if (crown) { az = rng() * TAU; y = lerp(0.55, 1, Math.sqrt(rng())); } else if (temple) { az = (rng() < 0.5 ? -1 : 1) * (0.95 + 0.6 * rng()); y = edgeLa(az) + 0.02 + rng() * 0.38; } else if (fringe) { az = (rng() - 0.5) * 2.3; const la = edgeLa(az); y = la + 0.04 + rng() * 0.1; } else { az = rng() * TAU; y = lerp(-0.8, 1, rng()); }
        const r = Math.sqrt(1 - y * y), x = Math.sin(az) * r, z = Math.cos(az) * r, la0 = edgeLa(az);
        if (y <= la0 + 0.02 || (HAT && y > 0.38)) continue;
        const n = V(x / RX, y / RY, z / RZ).normalize();
        const root = V(x * RX, y * RY, z * RZ).add(C0).addScaledVector(n, deep(y, z, y - la0) * H0 * 0.8);
        // (the way down the surface, or any way round at the crown)
        let t = DOWN.clone().addScaledVector(n, -DOWN.dot(n));
        if (t.length() < 0.25) { t.set(rng() - 0.5, 0, rng() - 0.5); t.addScaledVector(n, -t.dot(n)); }
        t.normalize();
        // (a fringe lock sweeps a little to the side it grows on, so the brow is not a row of the same hook)
        const sweep = fringe ? Math.sin(az) * (0.5 + 0.5 * rng()) : 0;
        const d = n.clone().multiplyScalar(lerp((fringe ? 0.6 : 0.28) + 0.2 * rng(), 0.1 + 0.08 * rng(), smoother((n.y - 0.55) / 0.4))).addScaledVector(t, 0.9).add(V(rng() - 0.5, rng() - 0.5, rng() - 0.5).multiplyScalar(0.7)).add(V(sweep, 0, 0)).normalize();
        const brow = smoother((z - 0.35) / 0.4) * smoother((y - 0.1) / 0.25) * (1 - smoother((y - 0.6) / 0.3));
        const low = smoother((y + 0.85) / 0.7);
        const L = lerp(lerp(1.2, 2.7, low) * (0.7 + 0.6 * rng()), 1.3 + 0.5 * rng(), brow) * (inner ? 0.65 : rng() < 0.35 ? 0.72 : 1.1);
        const sm = fringe || temple ? 0.66 : inner ? 0.7 : rng() < 0.4 ? 0.75 : 1, Rh = (0.44 + 0.2 * rng()) * sm, turns = 1.8 + 0.9 * rng(), dir = rng() < 0.5 ? -1 : 1, ang0 = rng() * TAU, rt0 = (0.3 + 0.08 * rng()) * sm;
        const ref = Math.abs(d.y) < 0.9 ? V(0, 1, 0) : V(1, 0, 0);
        const u = V().crossVectors(d, ref).normalize(), w = V().crossVectors(d, u);
        const tone = rng(), shade = 0.8 + 0.35 * rng();
        const S = fringe || temple ? 3 : 3; K = fringe || temple ? 7 : 5;
        for (let si = 0; si < S; si++) {
          // (each strand: its own length, width, shade and a little phase and radius of its own)
          const Ls = L * (0.86 + 0.28 * rng()), Rs = Rh * (0.8 + 0.3 * rng()), rt = rt0 * (0.8 + 0.4 * rng()), ph = ang0 + si * 0.8 + (rng() - 0.5) * 0.3, tn = Math.min(1, Math.max(0, tone + (rng() - 0.5) * 0.35)), sh = shade * (0.92 + 0.16 * rng()), tu = turns * (0.94 + 0.12 * rng());
          // (a spine with a droop, a helix wound round it)
          const pts = [];
          for (let j = 0; j <= M; j++) {
            const s = j / M, ang = ph + dir * s * tu * TAU, amp = Rs * (1 - 0.3 * s) * smoother(s / 0.2);
            pts.push(root.clone().addScaledVector(d, Ls * s).addScaledVector(DOWN, 0.35 * Ls * s * s).addScaledVector(u, Math.cos(ang) * amp).addScaledVector(w, Math.sin(ang) * amp));
          }
          // (a tube about the points, carried along them, thinning to a closed point)
          const base = PP.length / 3;
          for (let j = 0; j <= M; j++) {
            P.copy(pts[j]); T.copy(pts[Math.min(M, j + 1)]).sub(pts[Math.max(0, j - 1)]).normalize();
            if (j === 0) Nn.copy(Math.abs(T.y) < 0.9 ? V(0, 1, 0) : V(1, 0, 0)); Nn.addScaledVector(T, -Nn.dot(T)).normalize();
            Bb.crossVectors(T, Nn);
            const s = j / M, rad = rt * (0.75 + 0.25 * smoother(s / 0.15)) * Math.pow(Math.max(0, 1 - Math.pow(s, 2.2)), 0.75);
            cc.copy(fringe ? cA : cRoot).lerp(cc.copy(cA).lerp(cB, tn), smoother(s / (fringe ? 0.3 : 0.5))).lerp(cB, 0.18 * s * s).multiplyScalar(sh);
            for (let k = 0; k < K; k++) {
              const a = (k / K) * TAU, ca = Math.cos(a), sa = Math.sin(a), dx = Nn.x * ca + Bb.x * sa, dy = Nn.y * ca + Bb.y * sa, dz = Nn.z * ca + Bb.z * sa;
              PP.push(P.x + dx * rad, P.y + dy * rad, P.z + dz * rad); NN.push(dx, dy, dz); CC.push(cc.r, cc.g, cc.b);
            }
          }
          for (let j = 0; j < M; j++) for (let k = 0; k < K; k++) {
            const a = base + j * K + k, b = base + j * K + (k + 1) % K, c = base + (j + 1) * K + k, e = base + (j + 1) * K + (k + 1) % K;
            II.push(a, b, c, b, e, c);
          }
        }
        made++;
      }
      const gc = new THREE.BufferGeometry();
      gc.setAttribute('position', new THREE.Float32BufferAttribute(PP, 3)); gc.setAttribute('normal', new THREE.Float32BufferAttribute(NN, 3));
      gc.setAttribute('color', new THREE.Float32BufferAttribute(CC, 3)); gc.setIndex(II); gc.computeBoundingSphere(); keep(gc);
      const curlM = new THREE.MeshPhysicalMaterial({ vertexColors: true, roughness: 0.7, specularIntensity: 0.16, sheen: 0.1, sheenRoughness: 0.55, sheenColor: new THREE.Color(0x4a3322) }); keep(null, curlM);
      const curls = mesh(gc, curlM, headG); curls.castShadow = true; curls.receiveShadow = true;
    }
  }

  // ---- The hat: a black felt tricorn, cocked the way the 1770s wore one -
  // a corner at the back and one to each front side, the front folded up
  // against the crown so the brow shows - edged in gold braid, a gilt band
  // and button, and a cream plume pinned at the right-front corner that
  // arcs up and back over the crown and falls behind. It sits on the hair.
  if (HAT) {
    const hat = new THREE.Group(); hat.position.set(0, 2.8, -0.5); hat.rotation.set(0.04, 0, -0.07); headG.add(hat);
    const felt = new THREE.MeshPhysicalMaterial({ color: 0x17120f, roughness: 0.96, sheen: 0.6, sheenRoughness: 0.55, sheenColor: new THREE.Color(0x4a3f38), side: THREE.DoubleSide }); keep(null, felt);
    // (felt has a nap: a fine fuzz the lamp breaks up on - bumped, never a flat plastic)
    const nap = texOf(canvas(256, 256, (c) => {
      c.fillStyle = '#808080'; c.fillRect(0, 0, 256, 256);
      for (let k = 0; k < 14000; k++) { const v = Math.round(rng() * 255); c.fillStyle = `rgba(${v},${v},${v},0.35)`; c.beginPath(); c.arc(rng() * 256, rng() * 256, 0.6 + rng() * 1.1, 0, TAU); c.fill(); }
    }), false, [18, 4]);
    const nap2 = nap.clone(); nap2.needsUpdate = true; nap2.repeat.set(1, 1); keep(null, null, nap2);
    const feltCrown = felt.clone(); feltCrown.bumpMap = nap; feltCrown.bumpScale = 0.12; keep(null, feltCrown);
    const feltBrim = felt.clone(); feltBrim.bumpMap = nap2; feltBrim.bumpScale = 0.12; keep(null, feltBrim);
    // (the crown: a low rounded dome, a little wider front to back as the head is)
    const lathe = new THREE.LatheGeometry([[8.7, 0], [8.5, 3.2], [7.9, 6.2], [7.0, 7.7], [4.9, 8.2], [0, 8.35]].map(([r, y]) => new THREE.Vector2(r, y)), 48);
    const crown = mesh(lathe, feltCrown, hat); crown.scale.set(1, 1, 1.1);
    // (the brim: out from the crown to a rounded triangle, its sides turned
    // up the more the further out and the further from a corner)
    const AN = 120, RN = 8, rIn = 8.6, th0 = Math.PI;
    const corner = a => Math.pow(0.5 + 0.5 * Math.cos(3 * (a - th0)), 1.4);
    const rOut = a => 10.4 + 3.9 * corner(a);
    const lift = (a, s) => Math.pow(s, 2.2) * (0.9 + 5.2 * (1 - corner(a)));
    const bp = [], bi = [], bu = [];
    for (let i = 0; i < AN; i++) {
      const a = (i / AN) * TAU;
      for (let j = 0; j <= RN; j++) { const s = j / RN, r = lerp(rIn, rOut(a), s); bp.push(Math.sin(a) * r, lift(a, s), Math.cos(a) * r * 1.08); bu.push(Math.sin(a) * r * 0.5, Math.cos(a) * r * 0.5); }
    }
    for (let i = 0; i < AN; i++) for (let j = 0; j < RN; j++) {
      const a = i * (RN + 1) + j, b = ((i + 1) % AN) * (RN + 1) + j;
      bi.push(a, a + 1, b, a + 1, b + 1, b);
    }
    const bg = new THREE.BufferGeometry(); bg.setAttribute('position', new THREE.Float32BufferAttribute(bp, 3)); bg.setAttribute('uv', new THREE.Float32BufferAttribute(bu, 2)); bg.setIndex(bi); bg.computeVertexNormals();
    mesh(bg, feltBrim, hat);
    // (the braid along the brim's edge, and the band round the crown)
    const edge = new THREE.CatmullRomCurve3(Array.from({ length: 96 }, (_, i) => { const a = (i / 96) * TAU; return V(Math.sin(a) * rOut(a), lift(a, 1), Math.cos(a) * rOut(a) * 1.08); }), true);
    mesh(new THREE.TubeGeometry(edge, 288, 0.26, 6, true), gilt, hat, false);
    const band = mesh(new THREE.TorusGeometry(8.6, 0.3, 6, 72), gilt, hat, false); band.rotation.x = Math.PI / 2; band.position.y = 1.0; band.scale.set(1, 1.1, 1);
    // (a button, and the plume's base, at the right-front corner)
    const ca = Math.PI / 3, cr = 11.4, B = V(Math.sin(ca) * cr, lift(ca, (cr - rIn) / (rOut(ca) - rIn)) + 0.4, Math.cos(ca) * cr * 1.08);
    mesh(new THREE.SphereGeometry(0.6, 12, 8), gilt, hat, false).position.copy(B);
    // (the plume: a spine, and a vane that swells and tapers to a point,
    // its barbs drawn on a card with a ragged edge)
    const offs = [[0, 0, 0], [1, 3.5, -1.9], [0, 7.5, -4.9], [-3, 10.5, -9.4], [-7.5, 11, -14.4], [-12, 9, -17.9], [-14.5, 5.5, -19.4]];
    const spine = new THREE.CatmullRomCurve3(offs.map(([x, y, z]) => V(B.x + x * 0.58, B.y + y * 0.58, B.z + z * 0.58)));
    const NS = 28, fp = [], fu = [], fi = [], ref = V(0.5, 0, 1);
    for (let k = 0; k <= NS; k++) {
      const s = k / NS, c = spine.getPoint(s), tg = spine.getTangent(s), side = V().crossVectors(tg, ref).normalize();
      const w = 1.55 * Math.pow(Math.sin(Math.PI * Math.pow(s, 0.8)), 0.9) + 0.12 * (1 - s);
      fp.push(c.x - side.x * w, c.y - side.y * w, c.z - side.z * w, c.x + side.x * w, c.y + side.y * w, c.z + side.z * w); fu.push(0, s, 1, s);
    }
    for (let k = 0; k < NS; k++) { const a = k * 2; fi.push(a, a + 1, a + 2, a + 1, a + 3, a + 2); }
    const fg = new THREE.BufferGeometry(); fg.setAttribute('position', new THREE.Float32BufferAttribute(fp, 3)); fg.setAttribute('uv', new THREE.Float32BufferAttribute(fu, 2)); fg.setIndex(fi); fg.computeVertexNormals();
    const FW = 192, FH = 768;
    const fmap = texOf(canvas(FW, FH, (c) => {
      c.fillStyle = '#f3ede1'; c.fillRect(0, 0, FW, FH);
      for (let y = 0; y < FH; y += 3) for (const sd of [-1, 1]) { c.strokeStyle = `rgba(${150 + Math.round(rng() * 60)},${140 + Math.round(rng() * 55)},${120 + Math.round(rng() * 50)},0.3)`; c.lineWidth = 1; c.beginPath(); c.moveTo(FW / 2, y); c.lineTo(FW / 2 + sd * FW * 0.5, y + 14); c.stroke(); }
      c.fillStyle = '#d8cfbd'; c.fillRect(FW / 2 - 1.5, 0, 3, FH);
    }), true);
    // (the vane: single barbs, each fading from the spine to a soft tip - no hard edge to saw on)
    const fa = texOf(canvas(FW, FH, (c) => {
      c.fillStyle = '#000'; c.fillRect(0, 0, FW, FH); c.lineCap = 'round';
      for (let y = 0; y < FH; y += 1.7) for (const sd of [-1, 1]) {
        const len = FW * (0.36 + 0.14 * rng()), x1 = FW / 2 + sd * len, y1 = y + 12 + rng() * 6;
        const gr = c.createLinearGradient(FW / 2, 0, x1, 0); gr.addColorStop(0, 'rgba(255,255,255,0.95)'); gr.addColorStop(0.55, 'rgba(255,255,255,0.7)'); gr.addColorStop(1, 'rgba(255,255,255,0)');
        c.strokeStyle = gr; c.lineWidth = 1.1 + rng() * 0.6;
        c.beginPath(); c.moveTo(FW / 2, y); c.quadraticCurveTo(FW / 2 + sd * len * 0.55, y + 2 + rng() * 3, x1, y1); c.stroke();
      }
      c.fillStyle = '#fff'; c.fillRect(FW / 2 - 2, 0, 4, FH);
    }), false);
    const fm = new THREE.MeshStandardMaterial({ map: fmap, alphaMap: fa, transparent: true, alphaTest: 0.03, depthWrite: false, side: THREE.DoubleSide, roughness: 0.92 }); keep(null, fm);
    const plume = new THREE.Mesh(fg, fm); plume.castShadow = false; plume.receiveShadow = true; plume.renderOrder = 2; keep(fg); hat.add(plume);
    const quill = new THREE.MeshStandardMaterial({ color: 0xd9d0bd, roughness: 0.7 }); keep(null, quill);
    mesh(new THREE.TubeGeometry(spine, 48, 0.085, 5, false), quill, hat, false);
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
    const radAt = f => { const d = f * Lt; return d < L0 ? 3.85 : d < L0 + L1 ? lerp(3.85, 2.8, (d - L0) / L1) : lerp(2.8, 2.35, (d - L0 - L1) / L2) * (1 - 0.3 * smoother((f - 0.9) / 0.1)); };
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
  const FING = [[1.35, 0.88, 0.7], [1.5, 0.95, 0.74], [1.4, 0.9, 0.7], [1.1, 0.74, 0.62]];
  const nailM = new THREE.MeshPhysicalMaterial({ color: 0xe6b9a6, roughness: 0.42, clearcoat: 0.45, clearcoatRoughness: 0.35 }); keep(null, nailM);
  const skinH = bisque.clone(); skinH.color.setHex(0xdba98c); skinH.roughness = 0.6; skinH.sheen = 0.34; skinH.normalMap = poreTex(3); skinH.normalScale = new THREE.Vector2(0.35, 0.35); keep(null, skinH);
  function makeHand(side) {
    const root = new THREE.Group();
    const palmG = new THREE.SphereGeometry(1, 28, 18); palmG.scale(2.5, 2.5, 1.0); palmG.translate(0, PALM, 0); keep(palmG);
    const palm = new THREE.Mesh(palmG, skinH); palm.castShadow = true; root.add(palm);
    // (the ball of the thumb and the heel of the hand, on the palm's side)
    const padG = new THREE.SphereGeometry(1, 20, 14); keep(padG);
    const thenar = new THREE.Mesh(padG, skinH); thenar.position.set(-side * 1.1, 1.75, 0.42); thenar.scale.set(1.15, 1.6, 0.8); thenar.rotation.z = side * 0.35; root.add(thenar);
    const heel = new THREE.Mesh(padG, skinH); heel.position.set(side * 0.85, 1.1, 0.3); heel.scale.set(1.05, 1.1, 0.7); root.add(heel);
    const knuckG = new THREE.SphereGeometry(1, 14, 10); keep(knuckG);
    const nailG = new THREE.SphereGeometry(1, 12, 8); keep(nailG);
    const wristG = new THREE.CylinderGeometry(1.65, 1.75, 2.4, 16); wristG.scale(1, 1, 0.7); keep(wristG);
    const wr = new THREE.Mesh(wristG, skinH); wr.position.y = -0.6; root.add(wr);
    const fingers = [], tips = [], segs = [], bases = [];
    for (let f = 0; f < 4; f++) {
      const chain = [], sg = [];
      const base = new THREE.Group(); bases.push(base); base.position.set((f - 1.5) * 1.27 * side, 4.5 - Math.abs(f - 1.2) * 0.3, 0.05); root.add(base);
      let parent = base;
      for (let j = 0; j < 3; j++) {
        const L = FING[f][j], r = 0.62 - j * 0.06 - (f === 3 ? 0.07 : 0);
        const joint = new THREE.Group();
        if (j) joint.position.y = FING[f][j - 1] + 0.62;
        parent.add(joint);
        const g = new THREE.CapsuleGeometry(r, L, 4, 10); g.translate(0, L / 2 + r * 0.3, 0); keep(g);
        { const q = g.attributes.position; for (let i = 0; i < q.count; i++) { const k = lerp(1.04, 0.78, clamp01(q.getY(i) / (L + r))); q.setX(i, q.getX(i) * k); q.setZ(i, q.getZ(i) * k * 0.92); } g.computeVertexNormals(); }
        const m = new THREE.Mesh(g, skinH); m.castShadow = true; joint.add(m);
        // (the knuckle at the joint, proud on the back of the hand)
        if (!j) { const kn = new THREE.Mesh(knuckG, skinH); kn.scale.setScalar(r * 1.06); kn.position.set(0, r * 0.1, -r * 0.14); joint.add(kn); }
        chain.push(joint); sg.push({ L, r, gap: 0.62 }); parent = joint;
        if (j === 2) {
          tips.push({ joint, at: V(0, L + r * 1.3, 0), r });
          const nl = new THREE.Mesh(nailG, nailM); nl.position.set(0, L * 0.8 + r * 0.3, -r * 0.8); nl.scale.set(r * 0.74, L * 0.34, 0.09); joint.add(nl);
        }
      }
      fingers.push(chain); segs.push(sg);
    }
    const tBase = new THREE.Group(); tBase.position.set(-side * 2.3, 1.5, 0.5); tBase.rotation.z = -side * 0.75; tBase.rotation.y = -side * 0.4; root.add(tBase);
    const thumb = [], tsegs = [];
    let tp = tBase;
    [1.5, 1.15].forEach((L, j) => {
      const joint = new THREE.Group(); if (j) joint.position.y = 1.5 + 0.5; tp.add(joint);
      const r = 0.74 - j * 0.07, g = new THREE.CapsuleGeometry(r, L, 4, 10); g.translate(0, L / 2 + r * 0.3, 0);
      { const q = g.attributes.position; for (let i = 0; i < q.count; i++) { const k = lerp(1, 0.86, clamp01(q.getY(i) / (L + r))); q.setX(i, q.getX(i) * k); q.setZ(i, q.getZ(i) * k * 0.9); } g.computeVertexNormals(); }
      keep(g);
      const m = new THREE.Mesh(g, skinH); m.castShadow = true; joint.add(m); thumb.push(joint); tsegs.push({ L, r, gap: 0.5 }); tp = joint;
      if (!j) { const kn = new THREE.Mesh(knuckG, skinH); kn.scale.setScalar(r * 1.04); kn.position.set(0, r * 0.1, -r * 0.08); joint.add(kn); }
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
      const { L, r, gap } = sg[k];
      // (along the segment, and on to where the next joint sits - or the
      // tip, on the last - so a segment can't set its successor down
      // inside the thing)
      for (const y of [0.3 * r, 0.3 * r + L / 2, L + 0.3 * r, L + 0.9 * r, k < sg.length - 1 ? L + gap : L + 1.3 * r]) {
        pt.set(0, y, 0).applyMatrix4(M);
        let d;
        if (obj.pn) { if (obj.pn.dot(pt) - obj.pd < r * (y > L ? 0.75 : 0.95)) return false; continue; }
        if (obj.axis) { const v = pt.clone().sub(obj.c); d = v.addScaledVector(obj.axis, -v.dot(obj.axis)).length(); } else d = pt.distanceTo(obj.c);
        if (d < obj.r + r * (y > L ? 0.75 : 1)) return false;
      }
      return true;
    };
    // (a finger wraps as a real one does: the first joint closes until its
    // segment meets the thing, then the next, then the last - each as far
    // as its cam asks, or as far as the thing lets it; a joint whose segment
    // is in the thing's way even straight opens back out of it)
    const wrap = (base, chain, sg, targets, obj, open = [-0.22, -0.18, -0.12]) => {
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
      // (a joint set early can leave no room for the ones after it - a
      // finger bent straight down onto a table: then the whole finger closes
      // only as far as all of it stays clear)
      if (!obj) return;
      const allClear = () => chain.every((_, i) => segClear(base, chain, sg, i, obj));
      if (allClear()) return;
      const kept = chain.map(j => j.rotation.x), set = f => chain.forEach((j, i) => { j.rotation.x = targets[i] * f; });
      set(0);
      if (!allClear()) { chain.forEach((j, i) => { j.rotation.x = kept[i]; }); return; }
      let lo = 0, hi = 1;
      for (let it = 0; it < 10; it++) { const m = (lo + hi) / 2; set(m); if (allClear()) lo = m; else hi = m; }
      set(lo);
    };
    const pose = (curl, spread = 0, thumbCurl = curl, obj = null) => {
      fingers.forEach((ch, f) => { ch[0].rotation.z = (f - 1.5) * (spread + 0.3 * clamp01(1 - 2.5 * curl)) * 0.12 * side; wrap(bases[f], ch, segs[f], [1.0, 1.35, 1.0].map(m => curl * m * (1 + (obj && obj.pn ? 0.22 : 0.04) * f)), obj); });
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
  const ruffG = new THREE.CylinderGeometry(2.0, 1.85, 2.0, 144, 14, true); ruffG.translate(0, 1.25, 0);
  const shirtG = new THREE.CylinderGeometry(1.75, 2.45, 1.0, 56, 3, true); shirtG.translate(0, -0.15, 0);
  { const p = shirtG.attributes.position; for (let i = 0; i < p.count; i++) { const x = p.getX(i), y = p.getY(i), z = p.getZ(i), f = clamp01((0.35 - y) / 1.0), k = 1 + 0.1 * f * Math.sin(Math.atan2(z, x) * 16); p.setX(i, x * k); p.setZ(i, z * k); } shirtG.computeVertexNormals(); }
  keep(shirtG);
  // (the frill: gathered at the cuff, flaring out of it in soft rounded
  // folds - nine to the round, no two the same - its hem rippling on them,
  // and laid down over the back of the hand)
  { const p = ruffG.attributes.position, uv = ruffG.attributes.uv;
    for (let i = 0; i < p.count; i++) {
      const x = p.getX(i), y = p.getY(i), z = p.getZ(i), f = clamp01((y - 0.25) / 2.0), a = Math.atan2(x, z), hang = Math.max(0, Math.cos(a)) ** 1.4;
      const ph = 11 * a + 0.8 * Math.sin(3 * a + 1.1) + 0.4 * Math.sin(5 * a + 0.3), fold = Math.sin(ph), flare = lerp(1, 1.13, f * f);
      const k = flare * (1 + (0.015 + 0.07 * f) * fold);
      p.setXYZ(i, x * k, y + 0.95 * f * hang + 0.05 * f * f * fold, z * k - 1.15 * f * f * hang);
      uv.setXY(i, uv.getX(i) * 2, 1 - uv.getY(i));
    }
    ruffG.computeVertexNormals(); }
  keep(ruffG);
  const shoulderCapG = new THREE.SphereGeometry(3.85, 28, 18); shoulderCapG.scale(1, 1.1, 1.02); keep(shoulderCapG);
  const arms = [-1, 1].map(side => {
    const a = { side };
    a.shoulder = V(side * SH.x, SH.y, 0);
    { const cap = new THREE.Mesh(shoulderCapG, sleeveMat); cap.position.set(side * (SH.x + 0.5), SH.y + 0.3, 0); cap.castShadow = true; cap.receiveShadow = true; body.add(cap); }
    a.root = V(side * (SH.x - 3.6), SH.y + 0.6, 0);
    a.sleeveG = makeSleeve();
    a.sleeve = new THREE.Mesh(a.sleeveG, sleeveMat); a.sleeve.castShadow = true; a.sleeve.receiveShadow = true; a.sleeve.frustumCulled = false; body.add(a.sleeve);
    a.cuff = new THREE.Group(); body.add(a.cuff);
    const cm = new THREE.Mesh(cuffG, cuffMat); cm.castShadow = true; a.cuff.add(cm);
    a.cuff.add(new THREE.Mesh(cuffBandG, braid));
    a.cuff.add(new THREE.Mesh(ruffG, laceFine), new THREE.Mesh(shirtG, linen));
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
    [[-1, -1], [-1, 1], [1, -1], [1, 1]].forEach(([sx, sz]) => blob(sx * (w / 2 - 1.8) + 0.4 * sx, 0.04, sz * (d / 2 - 1.8) + 0.4 * sz, 5.2, 5.2, 0.5));
    [-1, 1].forEach(sx => [-1, 1].forEach(sz => blob(sx * (STOOL.w / 2 - 1.5), 0.04, STOOL.z + sz * (STOOL.d / 2 - 1.5), 4.5, 4.5, 0.6)));
    blob(0, 0.04, -12, DESK.w + 14, DESK.d + 18, 0.28);
  }
  const handBlobs = [-1, 1].map(() => blob(0, DESK.top + 0.06, 0, 4.6, 8.5, 0));

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
  // (and a small warm light riding with his head, low and in front, so the
  // face keeps its warmth under the brim when he bows it from the lamp)
  const faceFill = new THREE.PointLight(0xffdcc0, 34, 70, 1.0);
  faceFill.position.set(0, -3.5, 22);
  headG.add(faceFill);
  // (a low warm wash down the drapes from above, raking their folds)
  const wash = new THREE.SpotLight(0xffd9a8, room.PENDANT * 0.26, 0, 0.9, 1, 0);
  wash.position.copy(toWorld(V(0, 238, -40)));
  wash.target.position.copy(toWorld(V(0, 90, -100)));
  scene.add(wash, wash.target);
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
  let pour = null, flood = null, goldWash = null;
  if (tier === 'vault') {
    // (the light of the window, stood off the chest so it falls on the
    // chin, the lace, the hat's underside and the desk - from a point on
    // the waistcoat it would only graze them)
    flood = new THREE.PointLight(0xffc068, 0, 150, 1.0);
    flood.position.set(0, WIN.y - 2, winZ + 13);
    body.add(flood);
    goldWash = new THREE.SpotLight(0xffbf5c, 0, 0, 0.85, 1, 0);
    goldWash.position.set(0, WIN.y - 6, winZ + 70);
    goldWash.target.position.set(0, WIN.y + 22, winZ - 70);
    body.add(goldWash, goldWash.target);
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
    plan.callW = plan.silence[0] + 0.25;
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
  const restH = V(0.12, 0.1, 1).normalize();
  const restR = { p: V(-14.5, DESK.top + 1.75, -6.5), h: restH, n: restH.clone().cross(V(1, 0, 0)).normalize().negate() };
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
    P.rcurl = lerp(0.45, HOLD.curl, smoother((grip - 0.35) / 0.6)); P.rgrip = grip;
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
    lids.forEach(l => { l.rotation.x = lerp(-0.27 - 0.17 * P.wide + 0.5 * Math.max(0, ep0), 1.25, P.blink); });
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
      // (the right hand closes on the lever's ball, or at rest on the leather;
      // the left round the bell's handle)
      const onBall = right && P.rgrip > 0.5;
      const obj = !right ? { c: local(P.bell), r: 0.68, axis: dirBody(tg.axis).applyQuaternion(inv) }
        : onBall ? { c: local(ballAt(leverAt(Math.min(w, FREEZE)))), r: LEVER.ball }
          : (() => { const pn = dirBody(V(0, 1, 0)).applyQuaternion(inv); return { pn, pd: pn.dot(local(V(0, DESK.top, 0))) }; })();
      a.hand.pose(right ? P.rcurl : P.lcurl, 0.06, right ? lerp(0.15, P.rcurl * HOLD.thumb, smoother((P.rgrip - 0.3) / 0.5)) : 0.7, obj);
      // (its shade on the leather, darker as it comes down)
      {
        a.hand.root.updateMatrixWorld(true);
        const hb = handBlobs[right ? 0 : 1], pc = a.hand.root.localToWorld(V(0, PALM + 1.6, 0)).applyMatrix4(stageInv);
        const pw = a.hand.root.localToWorld(V(0, 0, 0)).applyMatrix4(stageInv);
        const over = Math.abs(pc.x) < DESK.w / 2 - 2 && Math.abs(pc.z) < DESK.d / 2 - 2, hgt = pc.y - DESK.top;
        hb.position.set(pc.x, DESK.top + 0.06, pc.z);
        hb.rotation.y = Math.atan2(pc.x - pw.x, pc.z - pw.z);
        hb.material.opacity = over ? 0.42 * clamp01(1 - (hgt - 1) / 6) : 0;
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
  push(0, fit(FACE.clone().add(V(0, -1.5, 0)), V(0.22, 0.1, 1), 36, 28));
  push(Rw(T.look) + 0.35, fit(FACE.clone().add(V(-1.5, -2.5, 0)), V(0.3, 0.08, 1), 38, 28));
  // (out to take in his head, the reaching arm and the lever's ball)
  push(Rw(T.reach) + 0.45, fit(V(-15, 69, -14), V(-0.5, 0.14, 1), 62, 50));
  push(Rw(T.pulled) + 0.1, fit(V(-15, 66, -16), V(-0.58, 0.16, 1), 60, 50));
  // (round to his front: his face and the window as the reels spin; in on
  // the window as they stop; all three reels across the frame for the last)
  push(Rw(T.spin) + 0.7, fit(Bp([0, 37, 4]), V(0.1, 0.12, 1), 40, 30));
  const WINV = (d, h, w, k) => (tall ? fit(Bp([0, 40 + k, winZ]), d, 50 + 2 * k, 28 + k) : fit(WINC, d, h, w));
  push(Rw(T.stop[1]), WINV(V(0.06, 0.08, 1), 20, 22, 1.5));
  push(Rw(slowW) + 0.1, WINV(V(0.1, 0.06, 1), 15.5, 17.5, 0));
  // the call: his face and the line, the dark over his head for the title
  const CALLV = tall ? fit(Bp([0, 40, 3]), V(0.12, 0.08, 1), 54, 34) : fit(Bp([0, 50, 3]), V(0.12, 0.08, 1), 78, 60);
  // (looking down into the open drawer: its floor, where the tokens lie)
  const TRAYV = tall ? fit(V(0, 48, 8), V(0.08, 1.25, 1), 40, 24) : fit(V(0, 48, 7), V(0.08, 1.2, 1), 52, 64);
  const WIDE = tall ? fit(V(0, 58, -6), V(0.24, 0.27, 1), 116, 92) : fit(V(0, 72, -6), V(0.24, 0.27, 1), 140, 92);
  let iTray = -1;
  if (tier === 'edge') {
    // (the held beat: out to him whole - his face, the window with its
    // third reel standing on its tooth, the shut drawer under it - and
    // still; then in a little, as the bell is half raised)
    const HELD = tall ? fit(Bp([0, 34.5, 3]), V(0.1, 0.08, 1), 74, 30) : fit(Bp([0, 37, 3]), V(0.1, 0.08, 1), 72, 56);
    push(Rw(plan.silence[0]) + 0.4, HELD);
    push(Rw(plan.silence[1]) + 1.0, HELD.map((v, i) => (i < 3 ? lerp(v, HELD[i + 3], 0.06) : v)));
    push(Rw(plan.endW) + 2, HELD.map((v, i) => (i < 3 ? lerp(v, HELD[i + 3], 0.1) : v)));
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
  const key0 = key.intensity, fill0 = fill.intensity, faceFill0 = faceFill.intensity, wash0 = wash.intensity, pendant0 = lights.pendant.intensity, inner0 = inner.intensity;
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
      reelMats.forEach(m => { m.emissiveIntensity = GLOW.reels * k; m.color.setRGB(1, 1 - 0.08 * k, 1 - 0.25 * k); });
      inner.intensity = inner0 * (1 + 3.5 * k);
      if (windowGlow) windowGlow.material.opacity = k * GLOW.opacity * (0.85 + 0.15 * Math.sin(burst * 9));
      if (pour) pour.intensity = room.PENDANT * 0.7 * k * (0.9 + 0.1 * Math.sin(burst * 9));
      if (flood) flood.intensity = GLOW.flood * k * (0.9 + 0.1 * Math.sin(burst * 9));
      if (goldWash) goldWash.intensity = room.PENDANT * 0.7 * k * (0.92 + 0.08 * Math.sin(burst * 9));
      if (eyeMatRef) eyeMatRef.emissiveIntensity = 1.5 * k;
      glints.forEach(g => { g.material.opacity = 0.8 * k; });
    }
    if (tier === 'edge') {
      const k = smoother((w - plan.silence[0]) / 0.6);
      const es = lights.edgeSpot;
      es.angle = 0.18; es.color.setHex(0xe4eaff);
      es.position.copy(toWorld(Bp([10, 70, 60])));
      es.target.position.copy(toWorld(Bp([4, 30, 4])));
      es.intensity = 3.0 * k;
      key.intensity = key0 * (1 - 0.45 * k); key.color.setRGB(1, lerp(0.933, 0.96, k), lerp(0.867, 1, k));
      fill.intensity = fill0 * (1 - 0.9 * k);
      faceFill.intensity = faceFill0 * (1 - 0.85 * k);
      wash.intensity = wash0 * (1 - 0.85 * k);
      lights.pendant.intensity = pendant0 * (1 - 0.88 * k);
      scene.environmentIntensity = room.ENV_LEVEL * (1 - 0.6 * k);
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
    return 1 - smoother((t - panIn[0]) / (d * 0.33)) * (1 - smoother((t - trayK[2]) / (trayK[3] - trayK[2])));
  };
  // (the shade behind the title: wanted over his face and the window, not
  // over the plain leather of the payout shot, where it reads as a stain)
  const callScrimAt = w => (nTok ? 1 - 0.4 * smoother((w - drawerAt) / 0.5) * (1 - smoother((w - (plan.revealW - 0.9)) / 0.5)) : 1);

  const warmAt = [0.2, Rw(T.reach) + 0.3, Rw(T.spin) + 0.5, Rslow + 0.05, warp.slowHold[1], Rw(restW) + 0.3];
  if (nTok) warmAt.push(Rw(payAt) + 0.4);
  if (tier === 'vault') warmAt.push(Rw(plan.boom) + 0.05, Rw(plan.boom) + 0.8);
  if (tier === 'edge') warmAt.push(Rw(plan.silence[1]) + 0.3);

  const dispose = () => {
    scene.remove(aut, key, key.target, rimL, rimL.target, fill, fill.target, wash, wash.target);
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
        if (Math.abs(tip.x) < DESK.w / 2 + DESK.over && Math.abs(tip.z) < DESK.d / 2 + DESK.over) { const d = DESK.top - (tip.y - tp.r); if (d > out.desk.d) out.desk = { d: +d.toFixed(2), t: +w.toFixed(2), arm: a.side, tip: a.hand.tips.indexOf(tp), at: tip.toArray().map(v => +v.toFixed(1)), root: a.hand.root.getWorldPosition(V()).applyMatrix4(sInv).toArray().map(v => +v.toFixed(1)) }; }
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
    callScrim: true, callScrimAt, callAlphaAt, goldCall: true,
    silence: tier === 'edge' ? Rw(plan.silence[0]) : null,
    moments: { look: Rw(T.look), reach: Rw(T.reach), pull: Rw(T.pull), spin: Rw(T.spin), stop0: Rw(T.stop[0]), stop1: Rw(T.stop[1]), slow: Rslow, rest: Rw(restW), call: Rw(plan.callW), drawer: nTok ? Rw(drawerAt) : null, pay: nTok ? Rw(payAt) : null, reveal: plan.revealReal, end: plan.totalReal, boom: tier === 'vault' ? Rw(plan.boom) : null, line, stops, tokens: nTok, scan },
    pieces: { aut, body, headG, lever, bell, reels, drawer }
  };
}
