// PLINKO: the landing shot's third game (see GAMES in intro.mjs).
//
// A walnut-and-brass Plinko cabinet stands beyond the back rail of the
// dice table, to the right of the wheel, in the same room under its own
// picture light. The shot opens close on the brass chute at the top of the
// board, where the house chip waits on a brass lever; the lever flicks, the
// chip drops into the fan of pins and the lens backs off to take the whole
// board in, riding down with the chip as it clatters through the pins;
// time slows as it comes off the last pin, and it drops into a lacquered
// bucket with the house numeral. The bucket is called, and the lens floats
// up and away over the pit, from where the homes' fly-ins start.
//
// The tiers, drawn as the dice's are (TIERS / pickTier):
//   standard  Standard Drop (90%)  a ten, a five or a two
//   hardways  The Twenty (8%)      an edge bucket, called in platinum
//   vault     The House (1.9%)     the house bucket dead centre: a trap in
//                                  its floor opens and the chip drops into
//                                  light; the pins chase gold up the board
//                                  and a bell rings
//   edge      The Pin (0.1%)       the chip comes down square on a pin and
//                                  stays there, balanced; the room falls
//                                  silent as the lens closes in
//
// Everything is worked out before the first frame: the drop is simulated
// (dropSim - a chip between a board and its glass, the pins, the fanned
// rails and the buckets' walls) and the chip's place on the lever chosen
// so it lands in the bucket the tier drew; the hits, the camera, the
// timings and every sound are laid out on one timeline; each frame is a
// lookup at a time.
//
// The cabinet, held to the Las Vegas wheel maker's bench the wheel came
// off (a show cabinet for a casino floor, not a game-show prop):
//   Across the room: a tall walnut case on a plinth, its board recessed
//     behind glass; a fan of brass pins widening from a brass chute at the
//     top to nine lacquered buckets along the bottom; a brass picture light
//     on the crown throwing its light down the board.
//   At arm's length: the walnut's figure under satin lacquer, brass beads
//     along the frame; the pins domed, each standing out of a black lacquer
//     board; the buckets' panels lacquered black, oxblood, bottle green and
//     gold leaf, their numerals gold with a dark keyline; the house badge in
//     the centre bucket; the chip oxblood clay with an enamel badge and a
//     turned brass rim with ivory edge inlays.
//   Pinched in 3x: the numerals stand up off the paint (embossed), the pins'
//     heads catch the light each as a point, the glass carries the room in
//     a faint reflection, the chip's rim is a ring of brass highlight and
//     its clay has its fine blast.
//   Light: the picture light lays a soft wash down the board, each pin
//     with a short shadow under it and a glint on its dome; the lacquer
//     carries one highlight; the brass mirrors the room; the glass a sliver
//     of the lamp.
//   Contact: the chip rings on each pin and rolls off it, spinning; it
//     clatters between the bucket's walls and comes to rest on the brass
//     floor; the cabinet's shadow lies on the carpet and the rear wall.
//   Motion: the lever's flick before the drop; the chip accelerating
//     through the pins, each hit turning it; the last pin ridden over in
//     slow time; the settle in the bucket, never a stop dead (bar The Pin).
//     No two drops alike: the seed.

const DEG = Math.PI / 180;
const TAU = Math.PI * 2;

// The buckets along the bottom, left to right: the edges pay most, the
// house's own bucket dead centre.
export const BUCKETS = ['20', '10', '5', '2', 'house', '2', '5', '10', '20'];
const NB = BUCKETS.length;
const WORDS = { 2: ['Two', 'Two to one'], 5: ['Five', 'Five to one'], 10: ['Ten', 'Ten to one'], 20: ['Twenty', 'Twenty to one'], house: ['The House', 'Forty to one'] };
export const TIER_NAMES = { standard: 'Standard Drop', hardways: 'The Twenty', vault: 'The House', edge: 'The Pin' };
const PAINT = {
  20: { fill: '#4a0b14', ink: '#f0d383' },
  10: { fill: '#0b0b0f', ink: '#e9c56a' },
  5: { fill: '#0b2a1c', ink: '#efd28a' },
  2: { fill: '#0b0b0f', ink: '#e9c56a' },
  house: { fill: '#b8923e', ink: '#140c08' }
};

// ---- The board, in cm. Its own frame: x across (right positive), y up
// (world y: the cabinet stands on the room's floor), z out toward the
// lens; the board's face at z = 0.
const CAB = [130, -172];                    // x, and the cabinet's centre z
const BOARD_Z = 10;                         // the board's face, from CAB[1]
const ROWS = 8, PITCH = 9, ROW_H = 7.8, Y_APEX = 66;
const PIN = { r: 0.36, len: 3.4, head: 0.5 };
const CHIP = { r: 2.0, th: 0.36, z: 1.5 };
const HALF = 46;                            // the playfield's half width
const BK = { top: 5, floor: -16, w: PITCH, half: (NB * PITCH) / 2, wall: 0.8 };
const CHUTE = { throat: 3.0, y0: 73.5, y1: 80, mouth: 13.5, yMouth: 92, leverY: 73.4 };
const LEVER = { r: 0.45, pivot: 4.8, len: 8.6, swing: 78 * DEG, dur: 0.13 };
const FRAME = 6, GLASS_Z = 4.6, BODY = { back: -20, front: 7, floor: -82 };
const PINS = [];
for (let i = 0; i < ROWS; i++) for (let j = 0; j <= i; j++) PINS.push({ x: (j - i / 2) * PITCH, y: Y_APEX - i * ROW_H, row: i });
const NP = PINS.length;
// (the rails: from beside the chute's throat down to the buckets' outer
// walls, one pitch outside the outermost pins)
const RAIL = [[CHUTE.throat + 1.2, CHUTE.y0 - 2], [BK.half + 1.6, BK.top + 2]];

const clamp01 = x => Math.min(Math.max(x, 0), 1);
const smoother = x => { x = clamp01(x); return x * x * x * (x * (6 * x - 15) + 10); };
const lerp = (a, b, k) => a + (b - a) * k;

// ---- The drop, simulated: a disc (the chip, between the board and its
// glass) under gravity, meeting the pins, the fanned rails, the chute's
// walls, the buckets' walls and their floor, in steps of 1/1600 s; the
// chip's place recorded every step for the frame lookups, its hits for
// the sounds. Deterministic in its inputs: the chip's place on the lever (x0)
// and the sideways nudge the lever's flick gives it (vx0).
const DT = 1 / 1600, G = 981;
const REST = { pin: 0.42, rail: 0.36, floor: 0.22 }, FRIC = 0.22, AIR = 0.25;
// the segments the chip can meet (x1, y1, x2, y2, radius): the chute's
// throat and funnel, the two rails, the buckets' walls
const SEGS = [];
[-1, 1].forEach(s => {
  SEGS.push([s * CHUTE.throat, CHUTE.y0 - 3, s * CHUTE.throat, CHUTE.y1, 0.3]);
  SEGS.push([s * CHUTE.throat, CHUTE.y1, s * CHUTE.mouth, CHUTE.yMouth, 0.3]);
  SEGS.push([s * RAIL[0][0], RAIL[0][1], s * RAIL[1][0], RAIL[1][1], 0.6]);
  SEGS.push([s * (BK.half + 1.6), BK.top + 2, s * (BK.half + 1.6), BK.floor, 0.6]);
});
for (let k = 1; k < NB; k++) { const x = (k - NB / 2) * PITCH; SEGS.push([x, BK.floor, x, BK.top, BK.wall / 2]); }
export function dropSim(x0, vx0, opts = {}) {
  const rec = opts.record ? { x: [], y: [], a: [] } : null;
  const hits = [];
  let x = x0, y = CHUTE.leverY + LEVER.r + CHIP.r, vx = vx0, vy = 0, ang = 0, om = 0, t = 0;
  let grounded = false, lastHit = 0, onPin = null, slow = 0, stuck = false;
  const rp = CHIP.r + PIN.r;
  const push = (nx, ny, pen, e, what, idx) => {
    x += nx * pen; y += ny * pen;
    const vn = vx * nx + vy * ny;
    if (vn >= 0) return;
    // (the chip pushed off: the normal part sprung back, the tangential
    // part scrubbed - and the scrub is what sets it spinning)
    // (a graze - the chip resting or rolling on the thing - is held off it
    // without a bounce and without the scrub, so it rolls off under
    // gravity as a chip on a pin does)
    const tx = -ny, ty = nx, vt = vx * tx + vy * ty, hard = -vn > 15;
    const vn2 = hard ? -vn * e : 0, vt2 = hard ? vt * (1 - FRIC) : vt * (1 - 0.6 * DT);
    vx = nx * vn2 + tx * vt2; vy = ny * vn2 + ty * vt2;
    om = vt2 / CHIP.r;
    if (-vn > 6) { hits.push({ t, kind: what, idx, speed: -vn, nx, ny, vx: vx - nx * vn2, vy: vy - ny * vn2, x, y }); lastHit = t; }
  };
  for (let step = 0; step < 1600 * 4; step++) {
    if (rec) { rec.x.push(x); rec.y.push(y); rec.a.push(ang); }
    // the pins: those of the two rows about the chip
    const rowAt = (Y_APEX - y) / ROW_H;
    if (rowAt > -1.2 && rowAt < ROWS + 0.2) {
      const r0 = Math.max(0, Math.floor(rowAt) - 1), r1 = Math.min(ROWS - 1, Math.floor(rowAt) + 1);
      for (let i = 0; i < NP; i++) {
        const p = PINS[i];
        if (p.row < r0 || p.row > r1) continue;
        const dx = x - p.x, dy = y - p.y, d = Math.hypot(dx, dy);
        if (d < rp) {
          const vIn = vx * (dx / d) + vy * (dy / d);
          push(dx / d, dy / d, rp - d, REST.pin, 'pin', i);
          // (The Pin: a hit square on top, coming down near straight)
          if (opts.pin && vIn < 0 && dy / d > 0.994 && Math.abs(vx) < 0.1 * Math.abs(vy) && -vIn > 50 && -vIn < 300 && p.row >= 2) {
            onPin = { i, t, x: p.x, y: p.y + rp, speed: -vIn };
            break;
          }
        }
      }
      if (onPin) break;
    }
    // the segments
    for (let s = 0; s < SEGS.length; s++) {
      const [ax, ay, bx, by, r] = SEGS[s];
      if (y < Math.min(ay, by) - 4 || y > Math.max(ay, by) + 4) continue;
      const ex = bx - ax, ey = by - ay, L2 = ex * ex + ey * ey;
      let u = ((x - ax) * ex + (y - ay) * ey) / L2; u = u < 0 ? 0 : u > 1 ? 1 : u;
      const cx = ax + ex * u, cy = ay + ey * u, dx = x - cx, dy = y - cy, d = Math.hypot(dx, dy), rs = CHIP.r + r;
      if (d < rs && d > 1e-6) push(dx / d, dy / d, rs - d, REST.rail, 'rail', s);
    }
    // the floor of the buckets
    if (y - CHIP.r < BK.floor && Math.abs(x) < BK.half + 1) {
      y = BK.floor + CHIP.r;
      if (vy < 0) {
        if (-vy > 6) { hits.push({ t, kind: 'floor', speed: -vy, x, y }); lastHit = t; }
        vy = -vy * REST.floor;
        if (vy < 14) { vy = 0; grounded = true; }
      }
    } else grounded = false;
    // the step
    vy -= G * DT;
    const air = 1 - AIR * DT;
    vx *= air; vy *= air;
    if (grounded) { vx *= 1 - 8 * DT; om = vx / CHIP.r; } else om *= 1 - 0.4 * DT;
    x += vx * DT; y += vy * DT; ang += om * DT;
    t += DT;
    if (grounded && Math.abs(vx) < 2 && t - lastHit > 0.12) break;
    // (a chip that has come to rest off the floor - caught on a pin or a
    // wall's cap by chance - is no drop: the search passes it over)
    slow = !grounded && Math.hypot(vx, vy) < 4 ? slow + DT : 0;
    if (slow > 0.25) { stuck = true; break; }
  }
  if (t >= 4 - DT) stuck = true;
  const bucket = Math.min(NB - 1, Math.max(0, Math.floor((x + BK.half) / PITCH)));
  return { x, y, ang, t, bucket, hits, rec, onPin, stuck };
}

export async function makeGame(ctx) {
  const { THREE, scene, set, lights, tier, seed, aspect, room, helpers: H } = ctx;
  const { makeWarp, spline, finished, embossTex, scaleUV, boxUV } = H;
  // (the seed mixed first: neighbouring seeds would otherwise open alike)
  const rng = (s => { for (let k = 0; k < 3; k++) { s = Math.imul(s ^ (s >>> 15), 0x2c1b3c6d) >>> 0; s = Math.imul(s ^ (s >>> 12), 0x297a2d39) >>> 0; } return () => { s = (Math.imul(s, 1664525) + 1013904223) >>> 0; s ^= s >>> 16; return (s >>> 0) / 4294967296; }; })((seed ^ 0x7f4a7c15) >>> 0);

  // ---- The plan.
  const gateAt = 0.82 + 0.14 * rng();
  const dropAt = gateAt + 0.07;
  const onPin = tier === 'edge';
  let want;
  if (tier === 'hardways') want = [0, NB - 1];
  else if (tier === 'vault') want = [Math.floor(NB / 2)];
  else want = BUCKETS.map((v, i) => (v === '10' || v === '5' || v === '2' ? i : -1)).filter(i => i >= 0);
  const target = want[Math.floor(rng() * want.length)];
  // the search: the chip's place on the lever and the flick's nudge, drawn
  // until the drop lands where the tier wants it (The Pin: until it comes
  // down square on a pin); the nearest miss kept against a long run
  let drop = null, best = null, bestScore = Infinity;
  for (let k = 0; k < 900; k++) {
    const x0 = (rng() * 2 - 1) * 0.95, vx0 = (rng() * 2 - 1) * 20;
    const d = dropSim(x0, vx0, { pin: onPin });
    if (d.stuck) continue;
    const score = onPin ? 1 : Math.abs(d.bucket - target);
    if ((onPin && d.onPin) || (!onPin && d.bucket === target)) { drop = { x0, vx0 }; break; }
    if (score < bestScore) { bestScore = score; best = { x0, vx0 }; }
  }
  // (never without a drop: a run that found nothing - every sample caught
  // by chance - takes the lever's centre, and the shot plays what falls)
  if (!drop) drop = best || { x0: 0, vx0: 0 };
  const sim = dropSim(drop.x0, drop.vx0, { pin: onPin, record: true });
  const pinned = onPin && sim.onPin ? sim.onPin : null;
  const bucket = pinned ? null : sim.bucket;
  const value = bucket == null ? null : BUCKETS[bucket];
  // the chip's place at a world time (the lever's wait, the drop, the
  // scripted balance for The Pin)
  const N = sim.rec.x.length;
  const settle = pinned ? { t: sim.t, x: pinned.x, y: pinned.y } : null;
  const posAt = w => {
    const s = (w - dropAt) / DT;
    if (s <= 0) return [sim.rec.x[0], sim.rec.y[0], 0];
    if (s >= N - 1) {
      if (!pinned) return [sim.rec.x[N - 1], sim.rec.y[N - 1], sim.rec.a[N - 1]];
      // The Pin: three small hops on the pin's head, then the rock, then
      // stillness
      const u = w - dropAt - sim.t;
      const h = u < 0.16 ? 0.9 * Math.sin((u / 0.16) * Math.PI) : u < 0.28 ? 0.32 * Math.sin(((u - 0.16) / 0.12) * Math.PI) : u < 0.36 ? 0.1 * Math.sin(((u - 0.28) / 0.08) * Math.PI) : 0;
      const rock = u > 0.3 ? 4 * DEG * Math.sin((u - 0.3) * 11) * Math.exp(-(u - 0.3) / 0.55) : 0;
      return [settle.x + Math.sin(rock) * CHIP.r * 0.5, settle.y + h, sim.rec.a[N - 1] + rock];
    }
    const i = Math.floor(s), f = s - i;
    return [lerp(sim.rec.x[i], sim.rec.x[i + 1], f), lerp(sim.rec.y[i], sim.rec.y[i + 1], f), lerp(sim.rec.a[i], sim.rec.a[i + 1], f)];
  };
  const restW = dropAt + sim.t + (pinned ? 0.4 : 0.05);
  // the slow moment: the last pin ridden over (the chip comes off it and
  // drops the last of the way into its bucket) - or, for The Pin, the
  // coming down onto it
  const pinHits = sim.hits.filter(h => h.kind === 'pin');
  const lastPin = pinHits.length ? pinHits[pinHits.length - 1].t : sim.t - 0.3;
  const slowW = dropAt + (pinned ? sim.t - 0.22 : lastPin - 0.08);
  const warp = makeWarp(slowW);
  const plan = { tier, seed, warp, wallW: slowW, restW, values: [value], call: value == null ? null : WORDS[value], throwOk: true, why: [] };
  plan.callW = restW + 0.2;
  if (tier === 'vault') {
    plan.boom = restW + 0.9;
    plan.revealW = plan.boom + 2.2;
    plan.endW = plan.boom + 3.6;
  } else if (pinned) {
    plan.silence = [dropAt + sim.t + 0.36, dropAt + sim.t + 1.1];
    plan.callW = plan.silence[1];
    plan.revealW = plan.silence[1] + 0.2;
    plan.endW = plan.revealW + 2.4;
  } else {
    plan.revealW = restW + 1.5;
    plan.endW = plan.revealW + 1.1;
  }
  plan.revealReal = warp.real(plan.revealW);
  plan.totalReal = warp.real(plan.endW);
  plan.restReal = warp.real(restW);
  plan.wallReal = warp.real(slowW);
  const Rw = w => warp.real(w);

  // ---- The cabinet.
  const wood = set.wood, brass = set.brass;
  const group = new THREE.Group();
  group.position.set(CAB[0], 0, CAB[1] + BOARD_Z);
  scene.add(group);
  const made = { geos: [], mats: [], texs: [] };
  const keep = (g, m) => { if (g) made.geos.push(g); if (m) made.mats.push(m); };
  const walnut = (() => { const m = wood.clone(); m.color.setHex(0x9c7a62); m.normalScale = new THREE.Vector2(0.25, 0.25); finished(m, 'pores', set.WOOD_TILE[0] / 2, set.WOOD_TILE[1] / 2, 0.4); keep(null, m); return m; })();
  const box = (w, h, d, x, y, z, mat = walnut) => {
    const g = boxUV(new THREE.BoxGeometry(w, h, d), w, h, d, ...set.WOOD_TILE);
    const m = new THREE.Mesh(g, mat); m.position.set(x, y, z); m.castShadow = true; m.receiveShadow = true; group.add(m); keep(g, null); return m;
  };
  const innerTop = CHUTE.yMouth + 6, innerBot = BK.floor - 2;
  const outerW = 2 * (HALF + FRAME), depth = BODY.front - BODY.back, zMid = (BODY.front + BODY.back) / 2;
  // the frame round the playfield, the body below it, the plinth and crown
  {
    [-1, 1].forEach(s => box(FRAME, innerTop - innerBot + 2 * FRAME, depth, s * (HALF + FRAME / 2), (innerTop + innerBot) / 2, zMid));
    box(outerW, FRAME, depth, 0, innerTop + FRAME / 2, zMid);
    box(outerW, FRAME, depth, 0, innerBot - FRAME / 2, zMid);
    const bodyH = innerBot - FRAME - BODY.floor;
    box(outerW, bodyH, depth, 0, BODY.floor + bodyH / 2, zMid);
    box(outerW + 6, 4, depth + 6, 0, BODY.floor + 2, zMid);
    box(outerW + 4, 5, depth + 4, 0, innerTop + FRAME + 2.5, zMid);
    // (the back: the board itself, and the sides of the recess)
    const backMat = new THREE.MeshPhysicalMaterial({ color: 0x0a0a0d, roughness: 0.32, clearcoat: 0.7, clearcoatRoughness: 0.12, envMapIntensity: 0.5 });
    finished(backMat, 'peel', 40, 40, 0.25); keep(null, backMat);
    const bg = new THREE.PlaneGeometry(2 * HALF, innerTop - innerBot);
    const back = new THREE.Mesh(bg, backMat); back.position.set(0, (innerTop + innerBot) / 2, 0); back.receiveShadow = true; group.add(back); keep(bg, null);
    [-1, 1].forEach(s => box(1.2, innerTop - innerBot, BODY.front, s * (HALF - 0.6), (innerTop + innerBot) / 2, BODY.front / 2));
    // the brass beads along the frame's inner edge, and a plate of brass
    // across the bottom of the buckets
    const bead = new THREE.CylinderGeometry(0.45, 0.45, innerTop - innerBot, 10); keep(bead, null);
    [-1, 1].forEach(s => { const m = new THREE.Mesh(bead, brass); m.position.set(s * (HALF + 0.3), (innerTop + innerBot) / 2, BODY.front - 0.6); group.add(m); });
    const beadX = new THREE.CylinderGeometry(0.45, 0.45, 2 * HALF, 10); beadX.rotateZ(Math.PI / 2); keep(beadX, null);
    [innerTop + 0.3, innerBot - 0.3].forEach(y => { const m = new THREE.Mesh(beadX, brass); m.position.set(0, y, BODY.front - 0.6); group.add(m); });
    // (The House: the plate stops either side of the centre bucket, whose
    // floor is the trap)
    const gap = tier === 'vault' ? PITCH - BK.wall : 0, half = HALF - gap / 2;
    [-1, 1].forEach(s => { if (s > 0 && !gap) return; const w = gap ? half : 2 * HALF; const plate = new THREE.Mesh(new THREE.BoxGeometry(w, 2, BODY.front), brass); plate.position.set(gap ? s * (gap / 2 + w / 2) : 0, BK.floor - 1, BODY.front / 2); plate.receiveShadow = true; group.add(plate); keep(plate.geometry, null); });
    // a brass escutcheon and two drawer lines on the body
    const esc = new THREE.Mesh(new THREE.CylinderGeometry(2.4, 2.4, 0.5, 24), brass); esc.rotation.x = Math.PI / 2; esc.position.set(0, (innerBot - FRAME + BODY.floor) / 2 + 6, BODY.front + 0.25); group.add(esc); keep(esc.geometry, null);
  }
  // the chute: a brass funnel into a throat, and the lever across it
  const lever = new THREE.Group();
  {
    const plate = (x1, y1, x2, y2, th) => {
      const L = Math.hypot(x2 - x1, y2 - y1), g = new THREE.BoxGeometry(L, th, PIN.len + 1.6);
      const m = new THREE.Mesh(g, brass); m.position.set((x1 + x2) / 2, (y1 + y2) / 2, (PIN.len + 1.6) / 2); m.rotation.z = Math.atan2(y2 - y1, x2 - x1); m.castShadow = true; group.add(m); keep(g, null); return m;
    };
    [-1, 1].forEach(s => { plate(s * CHUTE.throat, CHUTE.y0 - 3, s * CHUTE.throat, CHUTE.y1, 0.6); plate(s * CHUTE.throat, CHUTE.y1, s * CHUTE.mouth, CHUTE.yMouth, 0.6); });
    lever.position.set(LEVER.pivot, CHUTE.leverY, CHIP.z);
    const pin = new THREE.Mesh(new THREE.CylinderGeometry(0.9, 0.9, 2.2, 16), brass); pin.rotation.x = Math.PI / 2; lever.add(pin); keep(pin.geometry, null);
    const bar = new THREE.Mesh(new THREE.CapsuleGeometry(LEVER.r, LEVER.len, 4, 12), brass); bar.rotation.z = Math.PI / 2; bar.position.x = -LEVER.len / 2; bar.castShadow = true; lever.add(bar); keep(bar.geometry, null);
    const knob = new THREE.Mesh(new THREE.SphereGeometry(0.9, 14, 10), brass); knob.position.x = 2.6; lever.add(knob); keep(knob.geometry, null);
    group.add(lever);
  }
  // the rails: walnut strips with a brass edge, fanning from the chute to
  // the buckets' corners
  [-1, 1].forEach(s => {
    const [a, b] = RAIL, L = Math.hypot(b[0] - a[0], b[1] - a[1]), an = Math.atan2(b[1] - a[1], s * (b[0] - a[0]));
    const g = boxUV(new THREE.BoxGeometry(L, 1.4, PIN.len + 1.2), L, 1.4, PIN.len + 1.2, ...set.WOOD_TILE);
    const m = new THREE.Mesh(g, walnut); m.position.set(s * (a[0] + b[0]) / 2, (a[1] + b[1]) / 2, (PIN.len + 1.2) / 2); m.rotation.z = an; m.castShadow = true; group.add(m); keep(g, null);
    // (the brass edge on the rail's inner face, toward the pins)
    const e = new THREE.Mesh(new THREE.BoxGeometry(L, 0.5, PIN.len + 1.2), brass); e.position.copy(m.position); e.position.x += s * Math.sin(an) * 0.95; e.position.y -= s * Math.cos(an) * 0.95; e.rotation.z = an; group.add(e); keep(e.geometry, null);
  });
  // the pins: brass, domed, standing out of the board
  let pins;
  {
    const pp = [[PIN.r + 0.22, 0], [PIN.r + 0.18, 0.12], [PIN.r, 0.3], [PIN.r, PIN.len - 0.35], [PIN.head * 0.92, PIN.len - 0.1], [PIN.head, PIN.len + PIN.head * 0.3], [PIN.head * 0.55, PIN.len + PIN.head * 0.85], [0, PIN.len + PIN.head]].map(([r, y]) => new THREE.Vector2(r, y));
    const geo = new THREE.LatheGeometry(pp, 20); geo.rotateX(Math.PI / 2);
    pins = new THREE.InstancedMesh(geo, brass, NP);
    const m = new THREE.Matrix4();
    PINS.forEach((p, i) => { m.makeTranslation(p.x, p.y, 0); pins.setMatrixAt(i, m); });
    pins.instanceMatrix.needsUpdate = true; pins.castShadow = true; group.add(pins); keep(geo, null);
  }
  // the buckets: walnut walls capped in brass, lacquered panels behind
  // with the numerals (one painting, embossed), the house badge in the
  // centre one
  let door = null, doorGlow = null;
  {
    const wallH = BK.top - BK.floor;
    for (let k = 0; k <= NB; k++) {
      const x = (k - NB / 2) * PITCH, outer = k === 0 || k === NB;
      if (!outer) {
        box(BK.wall, wallH, PIN.len + 1.6, x, (BK.top + BK.floor) / 2, (PIN.len + 1.6) / 2);
        const cap = new THREE.Mesh(new THREE.CapsuleGeometry(BK.wall / 2 + 0.1, PIN.len + 1.2, 4, 10), brass); cap.rotation.x = Math.PI / 2; cap.position.set(x, BK.top, (PIN.len + 1.6) / 2); group.add(cap); keep(cap.geometry, null);
      } else {
        box(1.6, wallH + 2, PIN.len + 1.6, x + (k ? 0.8 : -0.8), (BK.top + BK.floor) / 2 + 1, (PIN.len + 1.6) / 2);
      }
    }
    const S = 2048, Hh = 512, c = document.createElement('canvas'); c.width = S; c.height = Hh;
    const hc = document.createElement('canvas'); hc.width = S; hc.height = Hh;
    const g = c.getContext('2d'), hg = hc.getContext('2d');
    const px = v => (v / (2 * BK.half)) * S;
    g.fillStyle = '#0b0b0f'; g.fillRect(0, 0, S, Hh); hg.fillStyle = '#000'; hg.fillRect(0, 0, S, Hh);
    const badge = set.tex.badge && set.tex.badge.image;
    BUCKETS.forEach((v, k) => {
      const p = PAINT[v], x0 = px(k * PITCH), w = px(PITCH), cx = x0 + w / 2, cy = Hh * 0.5;
      g.fillStyle = p.fill; g.fillRect(x0, 0, w, Hh);
      const gr = g.createLinearGradient(0, 0, 0, Hh); gr.addColorStop(0, 'rgba(255,255,255,0.07)'); gr.addColorStop(1, 'rgba(0,0,0,0.25)'); g.fillStyle = gr; g.fillRect(x0, 0, w, Hh);
      if (v === 'house' && badge) {
        const bw = w * 0.62, bh = (bw * badge.height) / badge.width;
        g.drawImage(badge, cx - bw / 2, cy - bh / 2, bw, bh); hg.drawImage(badge, cx - bw / 2, cy - bh / 2, bw, bh);
      } else {
        [g, hg].forEach((x, i) => { x.font = `700 ${px(5.6)}px Georgia, "Times New Roman", serif`; x.textAlign = 'center'; x.textBaseline = 'middle'; if (!i) { x.lineWidth = px(0.4); x.strokeStyle = v === '20' ? 'rgba(255,240,200,0.45)' : 'rgba(0,0,0,0.75)'; x.strokeText(v, cx, cy); } x.fillStyle = i ? '#fff' : p.ink; x.fillText(v, cx, cy); });
      }
      // (a gold rule round each panel)
      [g, hg].forEach((x, i) => { x.strokeStyle = i ? '#fff' : '#d8b25c'; x.lineWidth = px(i ? 0.4 : 0.3); x.strokeRect(x0 + px(0.9), px(0.9), w - px(1.8), Hh - px(1.8)); });
    });
    const map = new THREE.CanvasTexture(c); map.colorSpace = THREE.SRGBColorSpace; map.anisotropy = 8;
    const nrm = embossTex(hc, 2.2, 3);
    const mat = new THREE.MeshPhysicalMaterial({ map, normalMap: nrm, normalScale: new THREE.Vector2(0.7, 0.7), roughness: 0.36, clearcoat: 0.8, clearcoatRoughness: 0.14, envMapIntensity: 0.7 });
    finished(mat, 'peel', 30, 8, 0.3);
    const pg = new THREE.PlaneGeometry(2 * BK.half, wallH);
    const panel = new THREE.Mesh(pg, mat); panel.position.set(0, (BK.top + BK.floor) / 2, 0.05); panel.receiveShadow = true; group.add(panel);
    keep(pg, mat); made.texs.push(map, nrm);
    // The House's trap: the centre bucket's floor a brass plate hinged at
    // the back, and the light under it, dark until the moment
    if (tier === 'vault' && bucket != null) {
      const bx = (bucket - NB / 2 + 0.5) * PITCH;
      door = new THREE.Group(); door.position.set(bx, BK.floor - 0.05, 0.2); group.add(door);
      const dg = new THREE.BoxGeometry(PITCH - BK.wall - 0.3, 0.5, PIN.len + 1.2);
      const dm = new THREE.Mesh(dg, brass); dm.position.set(0, 0, (PIN.len + 1.2) / 2); door.add(dm); keep(dg, null);
      const gg = new THREE.PlaneGeometry(PITCH - BK.wall - 0.3, wallH);
      const gm = new THREE.MeshBasicMaterial({ color: new THREE.Color(2.2, 1.7, 0.9), transparent: true, opacity: 0, depthWrite: false, blending: THREE.AdditiveBlending, toneMapped: false });
      doorGlow = new THREE.Mesh(gg, gm); doorGlow.position.set(bx, (BK.top + BK.floor) / 2, 0.12); group.add(doorGlow); keep(gg, gm);
    }
  }
  // the glass over the playfield: black glass, seen by its edge and the
  // lamp's sliver alone
  {
    const gg = new THREE.PlaneGeometry(2 * HALF, innerTop - innerBot);
    const gm = new THREE.MeshPhysicalMaterial({ color: 0x000000, roughness: 0.03, metalness: 0, transparent: true, opacity: 0.1, clearcoat: 1, clearcoatRoughness: 0.03, envMapIntensity: 1.3, depthWrite: false });
    const glass = new THREE.Mesh(gg, gm); glass.position.set(0, (innerTop + innerBot) / 2, GLASS_Z); group.add(glass); keep(gg, gm);
  }
  // the chip: a brass-bound house chip - oxblood clay, its enamel badge
  // each side, a turned brass rim with ivory edge inlays
  const chip = new THREE.Group();
  {
    const clayMat = new THREE.MeshPhysicalMaterial({ color: 0x5a0e18, roughness: 0.5, clearcoat: 0.45, clearcoatRoughness: 0.25, envMapIntensity: 0.6 });
    finished(clayMat, 'blast', 3, 3, 0.35); keep(null, clayMat);
    const cg = new THREE.CylinderGeometry(CHIP.r - 0.3, CHIP.r - 0.3, CHIP.th, 48); cg.rotateX(Math.PI / 2);
    const clay = new THREE.Mesh(cg, clayMat); clay.castShadow = true; chip.add(clay); keep(cg, null);
    const rp = [[CHIP.r - 0.32, -CHIP.th / 2 - 0.02], [CHIP.r - 0.1, -CHIP.th / 2 - 0.06], [CHIP.r, -CHIP.th / 4], [CHIP.r, CHIP.th / 4], [CHIP.r - 0.1, CHIP.th / 2 + 0.06], [CHIP.r - 0.32, CHIP.th / 2 + 0.02]].map(([r, y]) => new THREE.Vector2(r, y));
    const rg = new THREE.LatheGeometry(rp, 64); rg.rotateX(Math.PI / 2);
    const rim = new THREE.Mesh(rg, brass); rim.castShadow = true; chip.add(rim); keep(rg, null);
    const ivory = new THREE.MeshPhysicalMaterial({ color: 0xf1e6c8, roughness: 0.35, clearcoat: 0.6 }); keep(null, ivory);
    const ig = new THREE.BoxGeometry(0.42, 0.5, CHIP.th + 0.03); keep(ig, null);
    for (let k = 0; k < 6; k++) { const a = (k / 6) * TAU, m = new THREE.Mesh(ig, ivory); m.position.set(Math.cos(a) * (CHIP.r - 0.5), Math.sin(a) * (CHIP.r - 0.5), 0); m.rotation.z = a; chip.add(m); }
    if (set.tex.badge) {
      const bm = new THREE.MeshPhysicalMaterial({ map: set.tex.badge, transparent: true, alphaTest: 0.4, metalness: 0.5, roughness: 0.3, clearcoat: 1, clearcoatRoughness: 0.06 }); keep(null, bm);
      const ar = set.tex.badge.image ? set.tex.badge.image.height / set.tex.badge.image.width : 1;
      const bg = new THREE.PlaneGeometry(2.2, 2.2 * ar); keep(bg, null);
      [1, -1].forEach(s => { const m = new THREE.Mesh(bg, bm); m.position.z = s * (CHIP.th / 2 + 0.01); if (s < 0) m.rotation.y = Math.PI; chip.add(m); });
    }
    chip.position.set(sim.rec.x[0], sim.rec.y[0], CHIP.z);
    group.add(chip);
  }
  // The pins' glow for The House: a bead of light on each pin, dark until
  // the moment, chasing up the board; the light in the bucket; and the
  // flash in the room.
  let beads = null, flash = null, inner = null;
  if (tier === 'vault') {
    const bg = new THREE.SphereGeometry(0.75, 10, 8);
    const bm = new THREE.MeshBasicMaterial({ color: new THREE.Color(1, 1, 1), transparent: true, opacity: 0.95, depthWrite: false, blending: THREE.AdditiveBlending, toneMapped: false });
    beads = new THREE.InstancedMesh(bg, bm, NP);
    const m = new THREE.Matrix4();
    PINS.forEach((p, i) => { m.makeTranslation(p.x, p.y, PIN.len + 0.3); beads.setMatrixAt(i, m); beads.setColorAt(i, new THREE.Color(0, 0, 0)); });
    beads.instanceMatrix.needsUpdate = true; beads.visible = false; group.add(beads); keep(bg, bm);
    flash = new THREE.PointLight(0xffd9a8, 0, 0, 0);
    flash.position.set(CAB[0], 30, CAB[1] + BOARD_Z + 40); scene.add(flash);
    inner = new THREE.PointLight(0xffc070, 0, 60, 1.5);
    inner.position.set(CAB[0] + (bucket - NB / 2 + 0.5) * PITCH, BK.floor + 4, CAB[1] + BOARD_Z + 3); scene.add(inner);
  }
  // The cabinet's picture light: a brass hood on the crown, and the light
  // it throws down the board (the pins' shadows on the lacquer).
  const key = new THREE.SpotLight(0xfff0e2, room.PENDANT * 1.3, 0, 0.62, 0.6, 0);
  key.position.set(CAB[0] + 6, innerTop + FRAME + 30, CAB[1] + BOARD_Z + 44);
  key.target.position.set(CAB[0], 30, CAB[1] + BOARD_Z);
  key.castShadow = true;
  key.shadow.mapSize.set(1024, 1024);
  key.shadow.camera.near = 20; key.shadow.camera.far = 220;
  key.shadow.bias = -0.0004; key.shadow.normalBias = 0.04; key.shadow.radius = 4;
  scene.add(key, key.target);
  {
    const hood = new THREE.Mesh(new THREE.CylinderGeometry(3.2, 3.2, outerW * 0.7, 24, 1, true, Math.PI * 0.95, Math.PI * 1.1), brass);
    hood.rotation.z = Math.PI / 2; hood.position.set(0, innerTop + FRAME + 11, BODY.front + 9); group.add(hood); keep(hood.geometry, null);
    const glow = new THREE.Mesh(new THREE.PlaneGeometry(outerW * 0.68, 3.6), new THREE.MeshBasicMaterial({ color: new THREE.Color(2.4, 1.9, 1.4), fog: false, side: THREE.DoubleSide }));
    glow.rotation.x = -Math.PI / 2 + 0.5; glow.position.set(0, innerTop + FRAME + 10, BODY.front + 9); group.add(glow); keep(glow.geometry, glow.material);
    const arm = new THREE.CylinderGeometry(0.5, 0.5, 12, 8); keep(arm, null);
    [-1, 1].forEach(s => { const m = new THREE.Mesh(arm, brass); m.rotation.x = Math.PI / 2 - 0.5; m.position.set(s * outerW * 0.3, innerTop + FRAME + 7.5, BODY.front + 4); group.add(m); });
  }

  // ---- The camera: world keys [t, eye xyz, aim xyz], real seconds. Close
  // on the chute for the wait and the flick; back to the whole board for
  // the drop, riding down with the chip; in again to the last pin; the
  // bucket; then the float up and away over the pit.
  const X = CAB[0], BZ = CAB[1] + BOARD_Z;
  const chuteY = CHUTE.leverY + 2;
  // (the whole-board shots stand off by what this screen's lens needs:
  // the board fitted top to bottom, and side to side too where that costs
  // no more than half as much again)
  const vfov = (aspect < 0.62 ? 42 : 34) * DEG, hfov = 2 * Math.atan(Math.tan(vfov / 2) * aspect);
  const topY = innerTop + FRAME + 14, botY = innerBot - FRAME - 4, midY = (topY + botY) / 2;
  const dV = (((topY - botY) / 2) * 1.06) / Math.tan(vfov / 2), dH = ((outerW / 2 + 4) * 1.06) / Math.tan(hfov / 2);
  const wide = Math.min(Math.max(dV, dH), dV * 1.5);
  const Rgate = Rw(gateAt), Rdrop = Rw(dropAt), Rslow = Rw(slowW), Rrest = Rw(restW), Rend = Rw(plan.endW);
  const pSlow = posAt(slowW + 0.1), pRest = posAt(restW);
  const wp = p => [X + p[0], p[1], BZ + CHIP.z];
  const [sx, sy] = wp(pSlow), [rx, ry] = wp(pRest);
  // (the fall is short - a second and a bit - so the lens backs off to a
  // medium shot as the chip meets the first pins and rides down with it,
  // the whole board waiting for the call)
  // (every key after the gate's keeps 0.3 s behind the one before it,
  // whatever the drop's length: The Pin can come down on the third row)
  const keys = [
    [0, X + 16, chuteY + 8, BZ + 42, X - 1, chuteY - 1, BZ],
    [Rgate - 0.1, X + 12, chuteY + 6, BZ + 40, X, chuteY - 3, BZ]
  ];
  const push = k => { const p = keys[keys.length - 1]; k[0] = Math.max(k[0], p[0] + 0.3); keys.push(k); };
  push([Math.min(Rdrop + 0.45, Rslow - 0.5), X + 10, midY + 16, BZ + wide * 0.72, X, midY + 8, BZ]);
  push([Rslow - 0.05, sx + 14, sy + 9, BZ + 50, sx, sy - 2, BZ]);
  push([Rslow + 0.9, sx + 10, sy + 6, BZ + 44, sx, sy - 3, BZ]);
  if (pinned) {
    push([Rw(plan.silence[0]) + 0.4, sx + 9, sy + 5, BZ + 34, sx, sy - 1, BZ]);
    push([Rw(plan.silence[1]) + 0.5, sx + 5, sy + 2.5, BZ + 22, sx, sy - 1, BZ]);
    push([Rend + 2, sx + 12, sy + 2, BZ + 32, sx, sy - 2, BZ]);
  } else if (tier === 'vault') {
    const Bm = Rw(plan.boom);
    push([Rrest + 0.4, rx + 10, ry + 8, BZ + 56, rx, ry + 2, BZ]);
    push([Bm - 0.2, rx + 8, ry + 10, BZ + 60, rx, ry + 1, BZ]);
    push([Bm + 0.6, rx + 6, ry + 12, BZ + 64, rx, ry - 2, BZ]);
    push([Bm + 2.2, X + 8, midY + 2, BZ + wide * 0.9, X, midY - 2, BZ]);
    push([Rend + 2, X + 14, midY + 4, BZ + wide * 1.1, X, midY - 6, BZ]);
  } else {
    push([Rrest + 0.5, rx + 10, ry + 8, BZ + 56, rx, ry + 2, BZ]);
    push([Rw(plan.revealW) + 0.2, X + 8, midY + 2, BZ + wide * 0.95, X, midY - 2, BZ]);
    push([Rend + 2, X + 14, midY + 4, BZ + wide * 1.1, X, midY - 6, BZ]);
  }
  // the float: up and away over the pit (to the left, where it lies), into
  // the ceiling
  {
    const L = keys[keys.length - 1];
    [[6, -60, 60, 130], [16, -90, 110, 240], [room.FLOAT - 2, -110, 140, 330]].forEach(([dt, dx, dy, dz]) => push([L[0] + dt, L[1] + dx * 0.4, Math.min(room.CEIL - 20, L[2] + dy), L[3] + dz, X - 30, midY, BZ]));
  }
  // (the ride: through the drop the aim leans toward the chip, a little
  // behind it, and the eye drops with it)
  const ride = t => smoother((t - Rdrop - 0.1) / 0.45) * (1 - smoother((t - (Rslow - 0.45)) / 0.4));
  const camera = ({ eye, aim, dt, n }) => {
    let last = null;
    for (let k = 0; k < n; k++) {
      const t = k * dt;
      const v = spline(keys, t);
      const f = ride(t);
      if (f > 0) {
        const p = wp(posAt(warp.world(Math.max(0, t - 0.06))));
        v[4] = lerp(v[4], p[1] + 2, f); v[3] = lerp(v[3], X + (p[0] - X) * 0.5, 0.6 * f);
        v[1] = lerp(v[1], p[1] + 12, 0.8 * f);
      }
      last = last ? last.map((x, j) => lerp(x, v[j], 1 - Math.exp(-dt / 0.09))) : v;
      const e = last.slice(0, 3), a = last.slice(3, 6);
      // (never into the cabinet: the eye keeps 18 cm off the glass)
      if (e[2] < BZ + 18 && Math.abs(e[0] - X) < outerW / 2 + 10 && e[1] > BODY.floor && e[1] < topY + 10) e[2] = BZ + 18;
      if (e[1] > room.CEIL - 20) e[1] = room.CEIL - 20 * Math.exp(-(e[1] - (room.CEIL - 20)) / 20);
      eye.set(e, k * 3); aim.set(a, k * 3);
    }
  };
  // the light behind the lens: brightest through the slow motion
  const gleamAt = t => smoother((t - (Rslow - 0.2)) / 0.35) * (1 - smoother((t - warp.slowHold[1]) / 0.7));

  // ---- Sounds, real seconds.
  const sfx = [];
  sfx.push({ t: Rgate, kind: 'latch' });
  sim.hits.forEach(h => {
    const t = Rw(dropAt + h.t), rate = warp.rateAt(t);
    if (h.kind === 'pin') sfx.push({ t, kind: 'pin', speed: h.speed, rate });
    else if (h.kind === 'rail') sfx.push({ t, kind: 'clay', speed: h.speed, rate });
    else sfx.push({ t, kind: 'cup', speed: h.speed, rate });
  });
  // (The Pin's own hit is among the sim's hits already)
  if (pinned) sfx.push({ t: Rw(plan.silence[1]), kind: 'drop' });
  if (tier === 'hardways') sfx.push({ t: Rw(plan.callW) + 0.1, kind: 'chime' });
  if (tier === 'vault') sfx.push({ t: Rw(plan.boom), kind: 'knock' }, { t: Rw(plan.boom) + 0.08, kind: 'bell' }, { t: Rw(plan.boom) + 0.1, kind: 'boom', soft: true });

  // ---- Each frame.
  const key0 = key.intensity, pendant0 = lights.pendant.intensity;
  const callPt = pinned ? [sx, sy - 7, BZ] : [rx, ry + 9, BZ];
  const stage = (t, { w }) => {
    // the lever: flicked down at the gate, a little overshoot, held
    const lk = clamp01((w - gateAt) / LEVER.dur);
    lever.rotation.z = LEVER.swing * (lk < 1 ? 1 - Math.pow(1 - lk, 3) : 1 + 0.06 * Math.sin((w - gateAt - LEVER.dur) * 40) * Math.exp(-(w - gateAt - LEVER.dur) / 0.12));
    // the chip
    const p = posAt(w);
    chip.position.set(p[0], p[1], CHIP.z); chip.rotation.z = p[2];
    chip.visible = true;
    // the house: the room's rim light stands at the shot's own each frame
    lights.rim.intensity = room.RIM;
    let burst = -1, dust = 1;
    if (tier === 'vault') {
      burst = w - plan.boom;
      const on = burst > 0;
      if (door) door.rotation.x = -smoother(burst / 0.3) * 82 * DEG;
      if (on) {
        // the chip through the trap, and gone into the cabinet
        const u = Math.max(0, burst - 0.12);
        chip.position.y = p[1] - 0.5 * G * u * u; chip.rotation.x = -u * 6;
        if (chip.position.y < BK.floor - 26) chip.visible = false;
        if (beads) {
          beads.visible = true;
          PINS.forEach((pn, i) => {
            // (two gold pulses climbing the board, fading over the run)
            const ph = ((Y_APEX - pn.y) / (ROWS * ROW_H)) + burst * 0.9;
            const pk = Math.max(Math.pow(1 - Math.min(1, Math.abs(((ph % 1) + 1) % 1 - 0.5) * 4), 2), Math.pow(1 - Math.min(1, Math.abs((((ph + 0.5) % 1) + 1) % 1 - 0.5) * 4), 2));
            const b = pk * Math.max(0, 1 - burst / 3.2) * 2.2;
            beads.setColorAt(i, new THREE.Color(b, b * 0.8, b * 0.45));
          });
          beads.instanceColor.needsUpdate = true;
        }
      } else if (beads) beads.visible = false;
      if (doorGlow) doorGlow.material.opacity = on ? 0.6 * (0.75 + 0.25 * Math.sin(burst * 9)) * Math.max(0, 1 - burst / 4) : 0;
      if (inner) inner.intensity = on ? 40 * smoother(burst / 0.3) * Math.max(0.25, 1 - burst / 4) : 0;
      if (flash) flash.intensity = on ? 22 * Math.exp(-burst / 0.18) : 0;
    }
    if (pinned) {
      const k = smoother((w - plan.silence[0]) / 0.6);
      const es = lights.edgeSpot;
      es.position.set(sx - 6, sy + 50, BZ + 14);
      es.target.position.set(sx, sy - 1, BZ);
      es.intensity = 2.6 * k;
      key.intensity = key0 * (1 - 0.8 * k);
      lights.pendant.intensity = pendant0 * (1 - 0.7 * k);
      scene.environmentIntensity = room.ENV_LEVEL * (1 - 0.6 * k);
      dust = 1 - 0.8 * k;
    }
    return { burst, dust };
  };
  const callAt = () => callPt;

  // (the shot's turns, drawn once unseen before it plays: see warm())
  const warmAt = [Rgate + 0.05, Rdrop + 0.5, Rslow + 0.05, warp.slowHold[1], Rrest + 0.4];
  if (tier === 'vault') warmAt.push(Rw(plan.boom) + 0.05, Rw(plan.boom) + 0.8);
  if (pinned) warmAt.push(Rw(plan.silence[1]) + 0.3);

  const dispose = () => {
    scene.remove(group, key, key.target);
    if (flash) scene.remove(flash);
    if (inner) scene.remove(inner);
    made.geos.forEach(g => g.dispose());
    made.mats.forEach(m => m.dispose());
    made.texs.forEach(t => t.dispose());
  };

  return {
    plan, camera, gleamAt, stage, callAt, sfx, warmAt, dispose,
    tierNames: TIER_NAMES,
    silence: pinned ? Rw(plan.silence[0]) : null,
    // (for the lab: the moments, in real seconds, and the drop)
    moments: { gate: Rgate, drop: Rdrop, slow: Rslow, rest: Rrest, call: Rw(plan.callW), reveal: plan.revealReal, end: plan.totalReal, boom: tier === 'vault' ? Rw(plan.boom) : null, bucket, value, hits: sim.hits.length, pinHits: pinHits.length, x0: drop.x0, vx0: drop.vx0, fall: sim.t, pinned: !!pinned, missed: !onPin && bucket !== target },
    pieces: { group, chip, pins, lever, door }
  };
}
