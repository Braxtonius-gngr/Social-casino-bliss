// THE WHEEL: the landing shot's second game (see GAMES in intro.mjs).
//
// A Big Six money wheel stands beyond the back rail of the dice table, in
// the same room under its own lamp. The shot opens close on the leather
// clapper at the top of the wheel; the wheel rocks back, is pulled, and
// spins up with the clapper rattling over the brass pegs; the lens backs
// off to take the whole wheel in; the ticks slow, the lens comes back in
// to the clapper, and time slows as it rides over the last peg and falls
// into the pocket. The pocket is called, and the lens floats up and away
// over the pit, from where the homes' fly-ins start (intro.mjs: FLOAT).
//
// The tiers, drawn as the dice's are (TIERS / pickTier):
//   standard  Standard Spin (90%)   a zero, a one, a two, a five or a ten
//   hardways  The Twenty (8%)       the twenty, called in platinum
//   vault     The Joker (1.9%)      the joker or the house: the pocket
//                                   lights, the pegs chase gold round the
//                                   wheel and a bell rings
//   edge      The Peg (0.1%)        the clapper stops dead on top of a peg,
//                                   balanced; the room falls silent as the
//                                   lens closes in
//
// Everything is worked out before the first frame: the spin is integrated
// (makeSpin - the bearing's drag, and the energy each peg costs the wheel as
// it lifts the clapper) and the pull chosen so the wheel comes to rest on
// the pocket the tier drew; the ticks, the camera, the timings and every
// sound are laid out on one timeline; each frame is a lookup at a time.
//
// The wheel, held to a Las Vegas wheel maker's bench (the hand-turned
// hardwood wheels the Strip's Big Six and roulette tables are built on):
//   Across the room: a 150 cm disc on a turned pedestal, its rim lacquered
//     walnut, its face in dark pockets edged with brass; a leather clapper
//     at twelve o'clock on a brass arm; the lamp's halo on the lacquer.
//   At arm's length: the walnut's figure under the rim's satin lacquer; the
//     pockets' lacquered paint - black, oxblood, bottle green, midnight,
//     ivory, gold leaf - divided by gold rules; the numerals gold with a
//     dark keyline, pointing out to the rim as a wheel's do; the brass pegs
//     domed; the hub a brass cap over the house badge under a glass dome.
//   Pinched in 3x: the numerals stand up off the paint (embossed), the
//     pegs' heads catch the lamp each as a point, the walnut's open pores
//     show through the lacquer, the clapper's leather has its grain and a
//     worn, paler tip where the pegs have struck it ten thousand times.
//   Light: the lacquer carries one hard highlight that slides round the rim
//     as it turns; each peg throws a short shadow onto the paint and glints
//     in turn as it passes under the lamp; the leather is matte; the brass
//     mirrors the room.
//   Contact: the clapper bends against each peg and snaps back past
//     straight; the wheel's shadow lies on the carpet and the rear wall; the
//     pedestal stands on the carpet.
//   Motion: a wind-up (the wheel rocked back a few degrees) before the pull;
//     the spin-up over a third of a second; the decay with the ticks slowing
//     through it; the last peg ridden over in slow time; a settle, never a
//     stop dead (bar The Peg). No two spins alike: the seed.

const DEG = Math.PI / 180;
const TAU = Math.PI * 2;

// The pockets round the wheel, clockwise from the top: 54 of them in six
// blocks of nine, each block one ten, one twenty, the joker or the house
// badge among a zero (a loss), ones, twos and a five.
const BLOCK = ['1', '2', '0', '5', '1', '2', '1', 'X', '1'];
const RARES = ['10', '20', 'joker', '10', '20', 'house'];
export const POCKETS = RARES.flatMap(x => BLOCK.map(v => (v === 'X' ? x : v)));
const N = POCKETS.length;
const SEG = TAU / N;
// The pockets' paint and lettering.
const PAINT = {
  0: { fill: '#1b1d22', ink: '#8c929c' },
  1: { fill: '#0c0c10', ink: '#e9c56a' },
  2: { fill: '#5a0d16', ink: '#f0d383' },
  5: { fill: '#0e2a1c', ink: '#efd28a' },
  10: { fill: '#101a36', ink: '#f2d790' },
  20: { fill: '#e8dcc0', ink: '#1a1410' },
  joker: { fill: '#c9a24c', ink: '#120c08' },
  house: { fill: '#0c0c10', ink: '#e9c56a' }
};
const WORDS = { 0: ['Zero', 'Nothing'], 1: ['One', 'Even money'], 2: ['Two', 'Two to one'], 5: ['Five', 'Five to one'], 10: ['Ten', 'Ten to one'], 20: ['Twenty', 'Twenty to one'], joker: ['Joker', 'Forty to one'], house: ['The House', 'Forty to one'] };
export const TIER_NAMES = { standard: 'Standard Spin', hardways: 'The Twenty', vault: 'The Joker', edge: 'The Peg' };

// Where the wheel stands: its hub, in the room's frame (the dice table's
// felt is y = 0; its back wall at z = -70; the floor 82 cm down), facing
// the lens (+z). R: the pegs' circle; RIM: the wood outside it; FACE: the
// painted disc; the wheel's front face is FRONT cm forward of its back.
// The hub stands high enough (95 cm over the felt, the pedestal taking up
// the rest - a Big Six wheel is hung high, over the players' heads) that the
// whole wheel, rim and all, clears the dice table's back rail (its padded
// top 26 cm over the felt) from every whole-wheel shot: at 60 the rail hid
// the bottom quarter of it.
const HUB = [-30, 95, -168];
const R = 63.6, RIM = [60, 75], FACE = 60.6, FRONT = 7, PEG = { r: 0.38, len: 1.6, head: 0.5 };
// The clapper: a leather flapper hung from a brass pin on an arm over the
// top of the wheel, reaching down over the pegs. Its strap is as deep (z)
// as the pegs stand, so a peg is never in front of it or behind it: a peg
// meets its edge, and the strap bends round the peg's crown (the last
// BEND cm of it flexes, the rest swings on the pin) until the crown has
// passed under its tip, then it falls back off the peg's far side.
const CLAP = { pivot: R + 11.5, len: 13.6, w: 1.4, th: 2.3, z: FRONT + 1.15, bend: 6.5 };
// Where a peg meets the strap: the pegs' circle is BAND cm below the pin,
// and a peg's side is GRIP cm from the strap's line when they touch (the
// peg's head and half the strap's width). The peg pushes the strap aside
// as it goes - the strap rides on its side, bending - until the peg is
// LET cm past the line, when the strap slips off it and swings back.
const BAND = CLAP.pivot - R, GRIP = PEG.head + CLAP.w / 2 + 0.45, LET = 1.9;

const clamp01 = x => Math.min(Math.max(x, 0), 1);
const smoother = x => { x = clamp01(x); return x * x * x * (x * (6 * x - 15) + 10); };
const lerp = (a, b, k) => a + (b - a) * k;

// ------------------------------------------------------------ the spin
// The wheel's angle, clockwise seen from the front, as the pegs pass the
// clapper: integrated at 480 steps a second. The bearing costs a little
// (viscous, B) and the clapper's drag a little more (A); each peg costs the
// wheel the energy of lifting the clapper (E), so the ticks slow, and come
// one by one at the end. A wheel that reaches a peg without the energy to
// lift the clapper over it stops there (that is The Peg); otherwise it
// comes to rest somewhere in a pocket. `pull` is the hand's push: the
// wheel is brought up to omega0 over PUSH seconds from the pull.
const DT = 1 / 480;
const DRAG = { A: 0.55, B: 0.09, E: 0.085 };
const PUSH = 0.32, WIND = { from: 0.25, to: 0.78, back: 4.2 * DEG };
// A wheel that reaches a peg short of the energy to lift the clapper over
// it is pushed back by the clapper into the pocket it was leaving (ROCK of
// a pocket, more the harder it came, over ROCK_T seconds); for The Peg it
// stops dead there instead, the clapper's tip on the peg's crown, STUCK
// short of the peg's line.
const ROCK = [0.35, 0.1], ROCK_T = 0.22, STUCK = 0.12 * DEG;
function integrate(omega0, pullAt, stopOnPeg) {
  // (theta: clockwise from where it stood, in the pegs' spacing from the
  // peg that first stood at the clapper - so theta modulo SEG says where
  // the clapper is in its pocket; see pocketOf)
  let th = 0, om = 0, t = pullAt;
  const ticks = [];
  let nextPeg = SEG;
  let stuck = null, rock = null;
  for (let step = 0; step < 480 * 12; step++) {
    const dtp = t - pullAt;
    if (dtp < PUSH) om = omega0 * smoother(dtp / PUSH);
    else om = Math.max(0, om - (DRAG.A + DRAG.B * om) * DT);
    const th1 = th + om * DT;
    if (th1 >= nextPeg) {
      // (the peg: the clapper lifted over it, at the wheel's cost)
      const e2 = om * om - 2 * DRAG.E;
      if (dtp >= PUSH && e2 <= 0) {
        const tf = t + (nextPeg - th) / Math.max(om, 1e-6);
        if (stopOnPeg) { stuck = { t: tf, th: nextPeg - STUCK }; th = nextPeg - STUCK; om = 0; t = tf; break; }
        const back = (ROCK[0] + ROCK[1] * (om * om) / (2 * DRAG.E)) * SEG;
        rock = { t: tf, from: nextPeg - STUCK, to: nextPeg - back };
        th = nextPeg - back; om = 0; t = tf + ROCK_T * 4; break;
      }
      ticks.push({ t: t + (nextPeg - th) / Math.max(om, 1e-6), speed: om });
      if (dtp >= PUSH) om = Math.sqrt(e2);
      nextPeg += SEG;
    }
    th = th1;
    t += DT;
    if (dtp >= PUSH && om <= 0) break;
  }
  return { theta: th, ticks, end: t, stuck, rock };
}
// The spin that lands the wheel where the tier wants it: the pocket under
// the clapper at rest is `pocket`, at `u` of the way across it (for The
// Peg: peg `pocket` under the clapper's tip). Found by bisection on the
// pull's strength over the spins that last SPIN seconds or so.
const SPIN = [3.9, 5.2];
export function makeSpin(target, pullAt, onPeg, rng = null) {
  // (the travel wanted, modulo a turn: the pegs move clockwise past the
  // clapper, so pocket p is under it once the wheel has turned N - p - u
  // spacings, u of the way across the pocket; peg p once N - p, less the
  // bit short of it the clapper stops it)
  const want = onPeg ? (N - target.peg) * SEG - STUCK : (N - target.pocket - target.u) * SEG;
  // the pulls that give the spin its length
  const dur = om => integrate(om, pullAt, onPeg).end - pullAt;
  let lo = 2, hi = 40;
  for (let i = 0; i < 40; i++) { const m = (lo + hi) / 2; if (dur(m) < SPIN[0]) lo = m; else hi = m; }
  const omLo = hi; lo = omLo; hi = 60;
  for (let i = 0; i < 40; i++) { const m = (lo + hi) / 2; if (dur(m) < SPIN[1]) lo = m; else hi = m; }
  const omHi = lo;
  const travel = om => integrate(om, pullAt, onPeg).theta;
  const tLo = travel(omLo), tHi = travel(omHi);
  // (a whole number of turns on, inside that range: the longest spin that
  // reaches the pocket)
  let turns = Math.floor((tHi - want) / TAU);
  while (turns > 0 && want + turns * TAU < tLo) turns--;
  const goal = want + turns * TAU;
  lo = omLo; hi = omHi;
  for (let i = 0; i < 60; i++) { const m = (lo + hi) / 2; if (travel(m) < goal) lo = m; else hi = m; }
  let best = null;
  for (const om of [lo, hi, (lo + hi) / 2]) { const r = integrate(om, pullAt, onPeg); if (!best || Math.abs(r.theta - goal) < Math.abs(best.theta - goal)) best = Object.assign(r, { omega0: om }); }
  // (The Peg: of the pulls that stop on that peg, the hardest - the wheel
  // comes to it with all but the energy to clear it, so the clapper rides
  // right up onto the crown)
  if (onPeg) {
    for (let k = 0; k < 60; k++) {
      const om = best.omega0 + 0.004 * (k + 1);
      const r = integrate(om, pullAt, true);
      if (Math.abs(r.theta - goal) > SEG * 0.01) break;
      best = Object.assign(r, { omega0: om });
    }
  } else {
    // The rest must read: a wheel that coasts to a stop with a peg within
    // the clapper's reach of its line (GRIP behind it, LET past it) leaves
    // the leather lying over that peg, pointing into the pocket beyond -
    // the call names the pocket at the line, the eye reads the one the
    // tip is in. So a rest is only taken clear of both pegs (CLEAR of a
    // pocket in from each: 2 cm, past the clapper's reach).
    const pocketOf = th => ((Math.floor(-th / SEG) % N) + N) % N;
    const CLEAR = 0.28;
    const clear = th => { const a = ((th % SEG) + SEG) % SEG; return a > CLEAR * SEG && a < (1 - CLEAR) * SEG; };
    const ok = r => pocketOf(r.theta) === target.pocket && clear(r.theta);
    if (rng) {
      // (many pulls end in the same pocket - the clapper pushes the wheel
      // back the same way from a range of them - so the pull is varied
      // within those, and no two spins are alike)
      for (let k = 0; k < 8; k++) {
        const om = best.omega0 + (rng() - 0.5) * 0.5;
        const r = integrate(om, pullAt, false);
        if (ok(r)) { best = Object.assign(r, { omega0: om }); break; }
      }
    }
    if (!ok(best)) {
      // (the pull nudged, either way, until the wheel rests clear in its
      // pocket; a wheel that will not is left where the bisection put it)
      for (let k = 1; k <= 40 && !ok(best); k++) {
        for (const om of [best.omega0 + 0.012 * k, best.omega0 - 0.012 * k]) {
          const r = integrate(om, pullAt, false);
          if (ok(r)) { best = Object.assign(r, { omega0: om }); break; }
        }
      }
    }
  }
  return best;
}
// The wheel's angle at world time w (clockwise, radians): the wind-up
// before the pull, then the spin's record.
export function makeThetaAt(spin, pullAt) {
  // (the spin again, written down at every step)
  const n = Math.ceil((spin.end - pullAt) / DT) + 2;
  const rec = new Float32Array(n);
  let th = 0, om = 0, t = pullAt, nextPeg = SEG, k = 0;
  for (let step = 0; step < n; step++) {
    rec[k++] = th;
    const dtp = t - pullAt;
    if (dtp < PUSH) om = spin.omega0 * smoother(dtp / PUSH);
    else om = Math.max(0, om - (DRAG.A + DRAG.B * om) * DT);
    const th1 = th + om * DT;
    if (th1 >= nextPeg) {
      const e2 = om * om - 2 * DRAG.E;
      if (dtp >= PUSH && e2 <= 0) {
        // (stopped on the peg, or pushed back by the clapper: a settle
        // past the pocket's middle and back, the spring of the leather)
        const rk = spin.rock, tf = spin.stuck ? spin.stuck.t : rk.t;
        for (; k < n; k++) {
          const tt = pullAt + k * DT;
          if (spin.stuck) rec[k] = tt < tf ? Math.min(th1, spin.stuck.th) : spin.stuck.th;
          else { const x = Math.max(0, tt - tf) / ROCK_T; rec[k] = tt < tf ? Math.min(th1, rk.from) : rk.from - (rk.from - rk.to) * (1 - (1 + 4 * x) * Math.exp(-4 * x)); }
        }
        break;
      }
      if (dtp >= PUSH) om = Math.sqrt(e2);
      nextPeg += SEG;
    }
    th = th1;
    t += DT;
  }
  const thetaEnd = spin.theta;
  return w => {
    if (w < pullAt) {
      // the wind-up: rocked back, held, let go into the pull
      const k = smoother((w - WIND.from) / (WIND.to - WIND.from)) * (1 - smoother((w - (pullAt - 0.06)) / 0.08));
      return -WIND.back * k;
    }
    const f = (w - pullAt) / DT, i = Math.floor(f), u = f - i;
    if (i >= n - 1) return thetaEnd;
    return lerp(rec[i], rec[i + 1], u);
  };
}

// The clapper at the wheel's angle: how far its tip is bent round the peg
// nearest it (the peg's distance to the side of the strap's line, at the
// pegs' circle, sets it: most with the peg right under the tip, none once
// the peg is CLAP_REACH cm off), how far the whole strap swings on its pin
// with it, and, once a peg has let go of it, the ring of the strap on the
// pin: a small swing back and forth, dying away.
// Returns how far the strap is pushed aside where the pegs meet it, in cm
// (positive the way the wheel turns).
export function clapperAt(theta, w, ticks, omega) {
  // (the pegs either side of the strap's line, in cm along the pegs'
  // circle: the one coming up to it, to the left, and the one just gone)
  const a = ((theta % SEG) + SEG) % SEG;
  const xs = [-R * Math.sin(SEG - a), R * Math.sin(a)];
  let d = 0;
  for (const x of xs) if (x > -GRIP && x < LET) d = Math.max(d, x + GRIP);
  // the swing back once the last peg let go: the strap springs past
  // straight and rings on its pin, dying away
  let i = ticks.length - 1;
  while (i >= 0 && ticks[i].t > w) i--;
  if (i >= 0) {
    const tk = ticks[i];
    const free = w - tk.t - (tk.speed > 0.05 ? LET / (R * tk.speed) : 0.3);
    if (free > 0 && free < 0.45) {
      const ring = (LET + GRIP) * Math.exp(-free / 0.05) * Math.cos(free * TAU * 9) * (omega > 25 ? 0.5 : 1);
      // (a peg on it holds it: the swing only ever adds)
      d = d > 0 ? Math.max(d, ring) : ring;
    }
  }
  return d;
}
// The strap's shape for that push: the whole strap swung on its pin for
// some of it, the last CLAP.bend cm bent for the rest (the arc found so
// the strap is pushed `d` where the pegs meet it).
function strapShape(d) {
  // (most of it the strap swinging on its pin, a third the leather bending)
  const lean = Math.asin(Math.max(-0.99, Math.min(0.99, (0.68 * d) / BAND)));
  const want = Math.abs(0.32 * d), u = BAND - (CLAP.len - CLAP.bend);
  if (want < 1e-4) return { lean, bend: 0 };
  let lo = 0, hi = 2.4;
  for (let k = 0; k < 14; k++) { const b = (lo + hi) / 2, rad = CLAP.bend / b; if (rad * (1 - Math.cos((b * u) / CLAP.bend)) < want) lo = b; else hi = b; }
  return { lean, bend: Math.sign(d) * (lo + hi) / 2 };
}
// The strap's leather bent: the rigid part swung by `lean` on the pin, the
// last CLAP.bend cm curled by `bend` (a circular arc), the geometry's
// vertices moved to suit. (`geo` is a box with its height segments along
// the strap, hung from y = 0 down.)
function bendStrap(geo, rest, lean, bend) {
  const pos = geo.attributes.position;
  const Lr = CLAP.len - CLAP.bend;
  const cl = Math.cos(lean), sl = Math.sin(lean);
  for (let i = 0; i < pos.count; i++) {
    const x0 = rest[i * 3], y0 = rest[i * 3 + 1], z0 = rest[i * 3 + 2];
    // (s: down the strap from the pin; the vertex's offset across it)
    const s = -y0, off = x0;
    let cx, cy, tx, ty;
    if (s <= Lr || Math.abs(bend) < 1e-4) {
      // on the rigid part, or no bend: swung on the pin
      cx = sl * s; cy = -cl * s; tx = cl; ty = sl;
      if (s > Lr) { /* no bend: straight on */ }
    } else {
      const u = s - Lr, rad = CLAP.bend / bend, ph = (u / CLAP.bend) * bend;
      // the arc, in the rigid part's frame, then swung on the pin
      const ax = rad * (1 - Math.cos(ph)), ay = -(Lr + rad * Math.sin(ph));
      const ttx = Math.cos(ph), tty = Math.sin(ph);
      cx = cl * ax - sl * ay; cy = sl * ax + cl * ay;
      // (the across direction turns with the arc)
      const ux = cl * ttx - sl * tty, uy = sl * ttx + cl * tty;
      tx = ux; ty = uy;
    }
    pos.setXYZ(i, cx + tx * off, cy + ty * off, z0);
  }
  pos.needsUpdate = true;
  geo.computeVertexNormals();
}

// ------------------------------------------------------------ the pieces
export async function makeGame(ctx) {
  const { THREE, scene, set, lights, tier, seed, aspect, room, helpers: H } = ctx;
  const { makeWarp, spline, glide, canvasTexture, finished, embossTex, scaleUV } = H;
  // (the seed mixed first: neighbouring seeds would otherwise open alike)
  const rng = (s => { for (let k = 0; k < 3; k++) { s = Math.imul(s ^ (s >>> 15), 0x2c1b3c6d) >>> 0; s = Math.imul(s ^ (s >>> 12), 0x297a2d39) >>> 0; } return () => { s = (Math.imul(s, 1664525) + 1013904223) >>> 0; s ^= s >>> 16; return (s >>> 0) / 4294967296; }; })((seed ^ 0x5bd1e995) >>> 0);

  // ---- The plan.
  const pullAt = 0.86 + 0.12 * rng();
  let target, onPeg = false;
  if (tier === 'edge') {
    onPeg = true;
    target = { peg: Math.floor(rng() * N) };
  } else {
    const want = tier === 'hardways' ? ['20'] : tier === 'vault' ? [rng() < 0.5 ? 'joker' : 'house'] : ['0', '1', '2', '5', '10'];
    const choices = POCKETS.map((v, i) => (want.includes(v) ? i : -1)).filter(i => i >= 0);
    target = { pocket: choices[Math.floor(rng() * choices.length)], u: 0.3 + 0.4 * rng() };
  }
  const spin = makeSpin(target, pullAt, onPeg, rng);
  const thetaAt = makeThetaAt(spin, pullAt);
  // the pocket under the clapper at rest, read off the wheel
  const thetaEnd = spin.theta;
  // (the pocket under the clapper: the pegs have moved clockwise by theta,
  // so the one at the top is peg -theta/SEG, and the pocket is the one
  // that peg opens)
  const pocketAt = th => ((Math.floor(-th / SEG) % N) + N) % N;
  const pocket = onPeg ? null : pocketAt(thetaEnd);
  const value = pocket == null ? null : POCKETS[pocket];
  const restW = spin.end + 0.05;
  const lastTick = spin.ticks.length ? spin.ticks[spin.ticks.length - 1].t : restW;
  // the slow moment: the last peg ridden over (the clapper lifts over it
  // in the slowing, snaps back and the wheel glides on in the hold) - or,
  // for The Peg, the ride up onto it and the stop
  const slowW = onPeg ? (spin.stuck ? spin.stuck.t : restW) - 0.2 : lastTick - 0.1;
  // (no slow motion but for The Peg: the wheel slows of itself, the ticks
  // coming one by one, and time slowing on top of that - with the lens
  // closing in - read as the spin stopping short)
  const warp = makeWarp(slowW, onPeg ? 0.12 : 1);
  const plan = { tier, seed, warp, wallW: slowW, restW, values: [value], call: value == null ? null : WORDS[value], throwOk: true, why: [] };
  plan.callW = restW + 0.15;
  if (tier === 'vault') {
    plan.boom = restW + 0.9;
    plan.revealW = plan.boom + 2.2;
    // (the slow-down: the Joker's glow and the lens's drift run 1.4 s
    // longer than the other tiers' hold, so the win sinks in)
    plan.endW = plan.boom + 5;
  } else if (onPeg) {
    plan.silence = [spin.stuck ? spin.stuck.t : restW, (spin.stuck ? spin.stuck.t : restW) + 0.7];
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

  // ---- The wheel.
  const wood = set.wood, brass = set.brass;
  const group = new THREE.Group();
  group.position.set(HUB[0], HUB[1], HUB[2]);
  scene.add(group);
  const wheel = new THREE.Group();
  group.add(wheel);
  const made = { geos: [], mats: [], texs: [] };
  const keep = (g, m) => { if (g) made.geos.push(g); if (m) made.mats.push(m); };
  // the rim and the back: one turning, walnut (UVs in cm along the grain,
  // which runs round the rim), its lacquer with the house's peel
  {
    const pr = [[8, 0], [RIM[1] - 2.5, 0], [RIM[1] - 0.6, 0.6], [RIM[1], 2.2], [RIM[1], FRONT - 2.4], [RIM[1] - 0.7, FRONT - 0.5], [RIM[1] - 2.4, FRONT], [RIM[0] + 1.2, FRONT], [RIM[0], FRONT - 0.8], [RIM[0], FRONT - 1.4]].map(([r, z]) => new THREE.Vector2(r, z));
    const geo = new THREE.LatheGeometry(pr, 180);
    // (a lathe turns about y: stood up to face +z)
    geo.rotateX(Math.PI / 2);
    scaleUV(geo, (TAU * RIM[1]) / set.WOOD_TILE[0], 28 / set.WOOD_TILE[1]);
    const rimWood = wood.clone();
    rimWood.normalScale = new THREE.Vector2(0.2, 0.2);
    rimWood.color.setHex(0xa0806c);
    finished(rimWood, 'pores', set.WOOD_TILE[0] / 2, set.WOOD_TILE[1] / 2, 0.4);
    const rim = new THREE.Mesh(geo, rimWood);
    rim.castShadow = true; rim.receiveShadow = true;
    wheel.add(rim);
    keep(geo, rimWood);
  }
  // the face: the pockets painted on a disc under a hard lacquer, the
  // numerals and rules standing up out of the paint
  let faceMat, jokerGlow = null;
  {
    const S = 2048, c = document.createElement('canvas'); c.width = c.height = S;
    const hc = document.createElement('canvas'); hc.width = hc.height = S;
    const g = c.getContext('2d'), hg = hc.getContext('2d');
    const cx = S / 2, cy = S / 2, px = r => (r / FACE) * (S / 2);
    g.fillStyle = '#0a0a0c'; g.fillRect(0, 0, S, S);
    hg.fillStyle = '#000'; hg.fillRect(0, 0, S, S);
    const badge = set.tex.badge && set.tex.badge.image;
    POCKETS.forEach((v, i) => {
      // (pocket i is clockwise from the top: canvas y runs down, so a
      // clockwise angle from the top is -90 deg + i * SEG)
      const a0 = -Math.PI / 2 + i * SEG, a1 = a0 + SEG;
      const p = PAINT[v];
      g.beginPath(); g.moveTo(cx, cy); g.arc(cx, cy, px(FACE), a0, a1); g.closePath();
      g.fillStyle = p.fill; g.fill();
      // (the lacquered paint's own soft sheen toward the rim)
      const gr = g.createRadialGradient(cx, cy, px(14), cx, cy, px(FACE));
      gr.addColorStop(0, 'rgba(255,255,255,0.06)'); gr.addColorStop(0.7, 'rgba(255,255,255,0)'); gr.addColorStop(1, 'rgba(0,0,0,0.18)');
      g.fillStyle = gr; g.fill();
      const am = (a0 + a1) / 2;
      // the numeral, pointing out to the rim
      g.save(); hg.save();
      [g, hg].forEach(x => { x.translate(cx + Math.cos(am) * px(44), cy + Math.sin(am) * px(44)); x.rotate(am + Math.PI / 2); x.textAlign = 'center'; x.textBaseline = 'middle'; });
      if (v === 'house' && badge) {
        // (the house badge, the pocket's width, with a diamond above and
        // below it)
        const w = px(4.6), h = (w * badge.height) / badge.width;
        g.drawImage(badge, -w / 2, -h / 2, w, h);
        hg.drawImage(badge, -w / 2, -h / 2, w, h);
        [-1, 1].forEach(s => { [g, hg].forEach((x, k) => { x.save(); x.translate(0, s * px(9)); x.rotate(Math.PI / 4); x.fillStyle = k ? '#fff' : p.ink; x.fillRect(-px(0.8), -px(0.8), px(1.6), px(1.6)); x.restore(); }); });
      } else if (v === 'joker') {
        // (JOKER reads up the pocket, hub to rim, as a wheel's does; a
        // harlequin diamond at each end)
        [g, hg].forEach((x, k) => {
          x.save(); x.rotate(-Math.PI / 2);
          x.font = `700 ${px(3.3)}px Georgia, "Times New Roman", serif`;
          x.fillStyle = k ? '#fff' : p.ink;
          const word = 'JOKER', sp = px(0.5);
          let wsum = 0; for (const ch of word) wsum += x.measureText(ch).width + sp; wsum -= sp;
          let xx = -wsum / 2;
          for (const ch of word) { const cw = x.measureText(ch).width; x.fillText(ch, xx + cw / 2, 0); xx += cw + sp; }
          x.restore();
        });
        [-1, 1].forEach(s => { [g, hg].forEach((x, k) => { x.save(); x.translate(0, s * px(13)); x.rotate(Math.PI / 4); x.fillStyle = k ? '#fff' : 'rgba(18,12,8,0.8)'; x.fillRect(-px(0.9), -px(0.9), px(1.8), px(1.8)); x.restore(); }); });
      } else {
        const big = v === '1' || v === '2' || v === '5';
        g.font = `700 ${px(big ? 9.4 : 7.8)}px Georgia, "Times New Roman", serif`;
        hg.font = g.font;
        g.lineWidth = px(0.55); g.strokeStyle = v === '20' ? 'rgba(255,240,200,0.5)' : 'rgba(0,0,0,0.75)';
        g.strokeText(v, 0, 0);
        g.fillStyle = p.ink; g.fillText(v, 0, 0);
        hg.fillStyle = '#fff'; hg.fillText(v, 0, 0);
      }
      g.restore(); hg.restore();
    });
    // the gold rules between the pockets, and the rings at hub and rim
    [g, hg].forEach((x, k) => {
      x.strokeStyle = k ? '#fff' : '#d8b25c'; x.lineWidth = px(k ? 0.42 : 0.32);
      for (let i = 0; i < N; i++) { const a = -Math.PI / 2 + i * SEG; x.beginPath(); x.moveTo(cx + Math.cos(a) * px(12), cy + Math.sin(a) * px(12)); x.lineTo(cx + Math.cos(a) * px(FACE), cy + Math.sin(a) * px(FACE)); x.stroke(); }
      x.lineWidth = px(k ? 0.8 : 0.6);
      [12.2, FACE - 0.6].forEach(r => { x.beginPath(); x.arc(cx, cy, px(r), 0, TAU); x.stroke(); });
    });
    // (the lacquer's dust and wear: a faint grain over the paint)
    for (let k = 0; k < 2600; k++) { const a = rng() * TAU, r = px(12 + rng() * (FACE - 12)); g.fillStyle = `rgba(255,255,255,${(0.02 + rng() * 0.05).toFixed(3)})`; g.fillRect(cx + Math.cos(a) * r, cy + Math.sin(a) * r, 1 + rng() * 2, 1 + rng() * 2); }
    const map = new THREE.CanvasTexture(c); map.colorSpace = THREE.SRGBColorSpace; map.anisotropy = 8;
    const nrm = embossTex(hc, 2.4, 3);
    faceMat = new THREE.MeshPhysicalMaterial({ map, normalMap: nrm, normalScale: new THREE.Vector2(0.7, 0.7), roughness: 0.38, clearcoat: 0.8, clearcoatRoughness: 0.14, envMapIntensity: 0.7 });
    finished(faceMat, 'peel', 40, 40, 0.3);
    const geo = new THREE.CircleGeometry(FACE, 180);
    const face = new THREE.Mesh(geo, faceMat);
    face.position.z = FRONT + 0.02; face.receiveShadow = true; face.castShadow = true;
    wheel.add(face);
    keep(geo, faceMat); made.texs.push(map, nrm);
    // The Joker's pocket lit from within (vault): a wedge of light over
    // the pocket, dark until the moment
    if (tier === 'vault' && pocket != null) {
      // (the pocket's wedge in the wheel's frame, y up: clockwise from the
      // top is a falling angle from pi/2)
      const f0 = Math.PI / 2 - pocket * SEG, f1 = f0 - SEG;
      const shape = new THREE.Shape();
      shape.moveTo(Math.cos(f0) * 12.5, Math.sin(f0) * 12.5);
      shape.lineTo(Math.cos(f0) * (FACE - 0.8), Math.sin(f0) * (FACE - 0.8));
      shape.absarc(0, 0, FACE - 0.8, f0, f1, true);
      shape.lineTo(Math.cos(f1) * 12.5, Math.sin(f1) * 12.5);
      shape.absarc(0, 0, 12.5, f1, f0, false);
      const gg = new THREE.ShapeGeometry(shape, 24);
      const gm = new THREE.MeshBasicMaterial({ color: new THREE.Color(2.2, 1.7, 0.9), transparent: true, opacity: 0, depthWrite: false, blending: THREE.AdditiveBlending, toneMapped: false });
      jokerGlow = new THREE.Mesh(gg, gm);
      jokerGlow.position.z = FRONT + 0.06; wheel.add(jokerGlow);
      keep(gg, gm);
    }
  }
  // the pegs: brass pins with domed heads, one at each rule, standing out
  // of the face
  let pegs;
  {
    // (a lathe's faces look outward when its points climb: base to tip)
    const pp = [[PEG.r + 0.22, 0], [PEG.r + 0.18, 0.12], [PEG.r, 0.3], [PEG.r, PEG.len - 0.35], [PEG.head * 0.92, PEG.len - 0.1], [PEG.head, PEG.len + PEG.head * 0.3], [PEG.head * 0.55, PEG.len + PEG.head * 0.85], [0, PEG.len + PEG.head]].map(([r, y]) => new THREE.Vector2(r, y));
    const geo = new THREE.LatheGeometry(pp, 20);
    geo.rotateX(Math.PI / 2);
    pegs = new THREE.InstancedMesh(geo, brass, N);
    const m = new THREE.Matrix4();
    for (let i = 0; i < N; i++) {
      const a = i * SEG;
      m.makeTranslation(Math.sin(a) * R, Math.cos(a) * R, FRONT);
      pegs.setMatrixAt(i, m);
    }
    pegs.instanceMatrix.needsUpdate = true;
    pegs.castShadow = true;
    wheel.add(pegs);
    keep(geo, null);
  }
  // the hub: a turned brass cap, the house badge under a glass dome
  {
    const hp = [[9.2, 0], [9.0, 0.3], [8.3, 0.9], [7.4, 1.3], [4.5, 1.6], [0, 1.6]].map(([r, y]) => new THREE.Vector2(r, y));
    const geo = new THREE.LatheGeometry(hp, 72); geo.rotateX(Math.PI / 2);
    const cap = new THREE.Mesh(geo, brass); cap.position.z = FRONT; cap.castShadow = true; wheel.add(cap);
    keep(geo, null);
    const badgeMat = new THREE.MeshPhysicalMaterial({ map: set.tex.badge, transparent: true, alphaTest: 0.4, metalness: 0.55, roughness: 0.3, clearcoat: 1, clearcoatRoughness: 0.06 });
    const bg = new THREE.PlaneGeometry(9.2, 9.2 * (set.tex.badge.image ? set.tex.badge.image.height / set.tex.badge.image.width : 1));
    const plate = new THREE.Mesh(bg, badgeMat); plate.position.z = FRONT + 1.62; wheel.add(plate);
    keep(bg, badgeMat);
    // (the dome: black glass, seen by its Fresnel edge alone)
    const dg = new THREE.SphereGeometry(6.4, 48, 24, 0, TAU, 0, Math.PI / 2);
    const dm = new THREE.MeshPhysicalMaterial({ color: 0x000000, roughness: 0.04, metalness: 0, transmission: 0, transparent: true, opacity: 0.22, clearcoat: 1, clearcoatRoughness: 0.03, envMapIntensity: 1.6, depthWrite: false });
    // (the +y hemisphere turned to stand out toward +z, over the badge)
    const dome = new THREE.Mesh(dg, dm); dome.rotation.x = Math.PI / 2; dome.position.z = FRONT + 1.6; dome.scale.z = 0.7; wheel.add(dome);
    keep(dg, dm);
  }
  // the stand: a turned walnut pedestal on a round plinth, a brass collar,
  // and the arm that carries the clapper over the top
  const stand = new THREE.Group();
  group.add(stand);
  {
    const floorY = room.floor - HUB[1];
    const col = [[0, floorY], [22, floorY], [22, floorY + 3], [16, floorY + 4.5], [9, floorY + 10], [7.2, floorY + 30], [8.4, -20], [7.2, -12], [10.5, -8], [10.5, -6.5], [6, -5], [6, 0]].map(([r, y]) => new THREE.Vector2(r, y));
    const geo = new THREE.LatheGeometry(col, 64);
    scaleUV(geo, (TAU * 9) / set.WOOD_TILE[1], 150 / set.WOOD_TILE[0]);
    const standWood = wood.clone();
    finished(standWood, 'pores', set.WOOD_TILE[0] / 2, set.WOOD_TILE[1] / 2, 0.45);
    const ped = new THREE.Mesh(geo, standWood); ped.position.z = -3; ped.castShadow = true; ped.receiveShadow = true; stand.add(ped);
    keep(geo, standWood);
    const cg = new THREE.CylinderGeometry(8.8, 8.8, 2.2, 48);
    const collar = new THREE.Mesh(cg, brass); collar.position.set(0, -9, -3); stand.add(collar);
    keep(cg, null);
    // the axle through the wheel, behind it
    const ag = new THREE.CylinderGeometry(3.2, 3.2, 14, 32); ag.rotateX(Math.PI / 2);
    const axle = new THREE.Mesh(ag, brass); axle.position.z = -4; stand.add(axle);
    keep(ag, null);
    // the arm: up behind the wheel and over its top to the clapper's pin
    // (turned brass tube, its corners and ends rounded)
    const armMat = brass;
    const tube = (r, len) => { const g = new THREE.CapsuleGeometry(r, len, 6, 20); keep(g, null); return g; };
    const up = new THREE.Mesh(tube(1.0, CLAP.pivot + 4), armMat);
    up.position.set(0, (CLAP.pivot + 4) / 2 - 2, -6); up.castShadow = true; stand.add(up);
    const over = new THREE.Mesh(tube(0.9, CLAP.z + 6), armMat);
    over.rotation.x = Math.PI / 2; over.position.set(0, CLAP.pivot + 2.4, (CLAP.z + 6) / 2 - 6); over.castShadow = true; stand.add(over);
    const drop = new THREE.Mesh(tube(0.8, 3.2), armMat);
    drop.position.set(0, CLAP.pivot + 1.2, CLAP.z); stand.add(drop);
  }
  // the clapper: pebble-grain leather on a brass pin, its tip paler where
  // the pegs have worn it
  const clapper = new THREE.Group();
  clapper.position.set(0, CLAP.pivot, CLAP.z);
  stand.add(clapper);
  let strapRest = null, strapGeo = null;
  {
    const pin = new THREE.Mesh(new THREE.CapsuleGeometry(0.55, CLAP.w + 0.8, 4, 16), brass);
    pin.rotation.x = Math.PI / 2; clapper.add(pin);
    keep(pin.geometry, null);
    // (the wear: a map down the strap, pale at the tip)
    const wear = (() => {
      const c = document.createElement('canvas'); c.width = 4; c.height = 256;
      const g = c.getContext('2d'), gr = g.createLinearGradient(0, 0, 0, 256);
      [[0, '#8a8a8a'], [0.5, '#ffffff'], [0.82, '#f4f4f4'], [0.93, '#bdbdbd'], [1, '#9a9a9a']].forEach(([o, col]) => gr.addColorStop(o, col));
      g.fillStyle = gr; g.fillRect(0, 0, 4, 256);
      const t = new THREE.CanvasTexture(c); t.colorSpace = THREE.SRGBColorSpace; t.flipY = false;
      return t;
    })();
    const leather = new THREE.MeshPhysicalMaterial({ color: 0x4a2a1c, map: wear, roughness: 0.68, sheen: 0.3, sheenRoughness: 0.5, sheenColor: new THREE.Color(0x6a4030), envMapIntensity: 0.6 });
    finished(leather, 'pebble', 2, 7, 0.8);
    const sg = new THREE.BoxGeometry(CLAP.w, CLAP.len, CLAP.th, 1, 24, 1);
    // (hung from the pin: the strap's top at the pivot, its length down;
    // the rest shape kept, to bend from each frame)
    sg.translate(0, -CLAP.len / 2, 0);
    strapRest = sg.attributes.position.array.slice();
    strapGeo = sg;
    const strap = new THREE.Mesh(sg, leather); strap.castShadow = true; strap.frustumCulled = false; clapper.add(strap);
    keep(sg, leather); made.texs.push(wear);
  }
  // The pegs' glow for The Joker: a bead of light on each peg, dark until
  // the moment, chasing round the wheel; and the flash in the room.
  let beads = null, flash = null;
  if (tier === 'vault') {
    const bg = new THREE.SphereGeometry(0.75, 10, 8);
    const bm = new THREE.MeshBasicMaterial({ color: new THREE.Color(1, 1, 1), transparent: true, opacity: 0.95, depthWrite: false, blending: THREE.AdditiveBlending, toneMapped: false });
    beads = new THREE.InstancedMesh(bg, bm, N);
    const m = new THREE.Matrix4();
    for (let i = 0; i < N; i++) { const a = i * SEG; m.makeTranslation(Math.sin(a) * R, Math.cos(a) * R, FRONT + PEG.len + 0.3); beads.setMatrixAt(i, m); beads.setColorAt(i, new THREE.Color(0, 0, 0)); }
    beads.instanceMatrix.needsUpdate = true;
    beads.visible = false; wheel.add(beads);
    keep(bg, bm);
    flash = new THREE.PointLight(0xffd9a8, 0, 0, 0);
    flash.position.set(HUB[0], HUB[1] + 10, HUB[2] + 40); scene.add(flash);
  }
  // The wheel's lamp: a round bronze shade hung over it, and the light it
  // throws (the shadows of the pegs and the clapper onto the paint).
  const key = new THREE.SpotLight(0xfff0e2, room.PENDANT * 1.2, 0, 0.5, 0.7, 0);
  // (hung 108 cm over the hub - the dice table's lamp height when the hub
  // stood at 60 - so it lights the wheel as it always did, risen with it)
  key.position.set(HUB[0] + 14, HUB[1] + 108, HUB[2] + 78);
  key.target.position.set(HUB[0], HUB[1] + 4, HUB[2] + FRONT);
  key.castShadow = true;
  key.shadow.mapSize.set(1024, 1024);
  key.shadow.camera.near = 50; key.shadow.camera.far = 260;
  key.shadow.bias = -0.0004; key.shadow.normalBias = 0.04; key.shadow.radius = 4;
  scene.add(key, key.target);
  {
    const bronze = new THREE.MeshStandardMaterial({ color: 0x2a1c12, metalness: 0.85, roughness: 0.35 });
    const shade = new THREE.Mesh(new THREE.CylinderGeometry(14, 22, 9, 40, 1, true), bronze);
    shade.position.copy(key.position).add(new THREE.Vector3(0, 6, 0)); scene.add(shade);
    const glow = new THREE.Mesh(new THREE.CircleGeometry(21.5, 40), new THREE.MeshBasicMaterial({ color: new THREE.Color(2.4, 1.9, 1.4), fog: false }));
    glow.rotation.x = Math.PI / 2; glow.position.copy(shade.position).add(new THREE.Vector3(0, -4.4, 0)); scene.add(glow);
    const rod = new THREE.Mesh(new THREE.CylinderGeometry(0.4, 0.4, 200, 8), bronze);
    rod.position.copy(shade.position).add(new THREE.Vector3(0, 104, 0)); scene.add(rod);
    made.lamp = [shade, glow, rod];
    keep(shade.geometry, bronze); keep(glow.geometry, glow.material); keep(rod.geometry, null);
  }

  // ---- The camera: world keys [t, eye xyz, aim xyz], real seconds. Close
  // on the clapper for the wind-up and the pull; back to the whole wheel
  // for the spin; in again to the clapper for the last pegs; the pocket;
  // then the float up and away over the pit.
  const X = HUB[0], Y = HUB[1], Z = HUB[2];
  const tipY = Y + CLAP.pivot - CLAP.len + 1, tipZ = Z + CLAP.z;
  // The whole-wheel shots stand off by what this screen's lens needs
  // (the same lens as the shot's: 42 degrees tall on a narrow screen, 34
  // otherwise): the wheel and its clapper arm fitted top to bottom, and
  // fitted side to side too where that costs no more than half as much
  // again - on a tall phone a full fit would put the lens four metres back
  // in the room's haze, so there the rim runs a little off both edges.
  const vfov = (aspect < 0.62 ? 42 : 34) * DEG, hfov = 2 * Math.atan(Math.tan(vfov / 2) * aspect);
  const dV = ((RIM[1] + 14) * 1.05) / Math.tan(vfov / 2), dH = (RIM[1] * 1.05) / Math.tan(hfov / 2);
  const wide = Math.min(Math.max(dV, dH), dV * 1.5);
  // (the keys below were laid out at 200 cm; `wd` scales a stand-off)
  const wd = k => Z + (wide / 200) * k, wx = k => X + (wide / 200) * k;
  // From that far back the lens looks under the dice table's lamp (its
  // far end 77 cm in front of the wheel, its diffuser at the lamp's height
  // less 4): the eye stays low - a standing player's eye, 70 cm over the
  // felt, the wheel hung above it - and each whole-wheel shot aims so the
  // top of its frame passes midway between the clapper's arm and the lamp,
  // seen from where that shot's eye stands - the wheel high in the frame,
  // the pit's rail and felt below it, and the lamp's bright diffuser never
  // in the top of it.
  const ey = 70, topY = Y + CLAP.pivot + 6, lampY = room.lamp - 4;
  const faceZ = Z + FRONT, lampZ = faceZ + 77, tanV = Math.tan(vfov / 2);
  const frame = (eY, eZ) => {
    const dW = eZ - faceZ, s = ((topY - eY) / dW + (lampY - eY) / (eZ - lampZ)) / 2;
    return eY + (s - tanV) * dW;
  };
  const Rslow = Rw(slowW), Rrest = Rw(restW), Rend = Rw(plan.endW);
  // (the two whole-wheel keys sit between the pull and the slow moment,
  // in order whatever the spin's length: a short spin brings them in,
  // the slow moment's own key stays where it is)
  // (and the lens has 1.2 s at least to come back in to the clapper)
  const wide1 = Math.min(Rw(pullAt) + 1.9, Rslow - 1.9);
  const wide2 = Math.max(wide1 + 0.4, Math.min(Rw(pullAt) + 3.2, Rslow - 1.3));
  const keys = [
    [0, X + 26, tipY + 10, tipZ + 52, X - 2, tipY + 2, tipZ],
    [0.9, X + 20, tipY + 8, tipZ + 46, X, tipY + 1, tipZ],
    [Rw(pullAt) + 0.5, X + 40, Y + 36, Z + 120, X, Y + 26, Z + FRONT],
    [wide1, wx(72), ey + 4, wd(200), X, frame(ey + 4, wd(200)) - 8, Z + FRONT],
    [wide2, wx(34), ey, wd(212), X, frame(ey, wd(212)), Z + FRONT],
  ];
  // The lens comes in to the clapper at the slow moment only for The Peg,
  // which closes on the balanced tip. The other tiers hold the whole wheel
  // through the slow moment and come in once the pocket is at rest (the
  // pocket-under-the-clapper keys below), so nobody watches the lens close
  // on a pocket before it is set.
  // (The Peg's lens arrives in the slow moment rather than ahead of it: a
  // glide in of a second and a half or more, not a lunge at the clapper)
  if (onPeg) keys.push([Rslow + 0.3, X + 22, tipY + 12, tipZ + 62, X, tipY - 1, tipZ], [Rslow + 1.2, X + 16, tipY + 9, tipZ + 50, X, tipY - 2, tipZ]);
  else keys.push([Rslow + 0.9, wx(34), ey, wd(212), X, frame(ey, wd(212)), Z + FRONT]);
  const push = k => { const p = keys[keys.length - 1]; k[0] = Math.max(k[0], p[0] + 0.3); keys.push(k); };
  if (onPeg) {
    // the lens closes in on the tip balanced on its peg
    push([Rw(plan.silence[0]) + 0.4, X + 10, tipY + 6, tipZ + 36, X, tipY - 1.5, tipZ]);
    push([Rw(plan.silence[1]) + 0.5, X + 6, tipY + 3, tipZ + 24, X, tipY - 1.5, tipZ]);
    push([Rend + 2, X + 14, tipY + 2, tipZ + 34, X, tipY - 2, tipZ]);
  } else if (tier === 'vault') {
    // the Joker's pocket under the clapper as it lights, held while the bell
    // rings, then a long glide back for the pegs chasing gold round the
    // whole wheel
    const Bm = Rw(plan.boom);
    push([Bm + 0.2, X + 10, tipY - 8, tipZ + 96, X, tipY - 14, tipZ]);
    push([Bm + 0.8, X + 9, tipY - 8, tipZ + 90, X, tipY - 13, tipZ]);
    push([Bm + 2.6, wx(34), ey + 6, wd(176), X, frame(ey + 6, wd(176)), Z + FRONT]);
    push([Bm + 4.0, wx(44), ey + 4, wd(200), X, frame(ey + 4, wd(200)), Z + FRONT]);
    push([Rend + 2.5, wx(50), ey + 2, wd(240), X, frame(ey + 2, wd(240)) - 6, Z + FRONT]);
  } else {
    // The pocket under the clapper: the lens comes in once it is set (to a
    // close shot, not right up on the paint), drifts on it a moment rather
    // than stopping dead, and glides back to the whole wheel with its call -
    // the way back as long again as the way in, so it never snaps in and
    // out. (It was in to 66 cm and out again inside two seconds.)
    push([Rrest + 0.8, X + 10, tipY - 8, tipZ + 96, X, tipY - 14, tipZ]);
    // The Twenty, the good win: the lens keeps closing on its pocket and
    // holds there longer
    if (tier === 'hardways') push([Rrest + 1.9, X + 8, tipY - 8, tipZ + 82, X, tipY - 14, tipZ]);
    else push([Rrest + 1.3, X + 9, tipY - 8, tipZ + 90, X, tipY - 14, tipZ]);
    // (two seconds back out, whatever the hold)
    push([Math.max(Rw(plan.revealW) + 1.8, keys[keys.length - 1][0] + 2), wx(30), ey + 4, wd(200), X, frame(ey + 4, wd(200)), Z + FRONT]);
    push([Rend + 2.5, wx(44), ey + 2, wd(240), X, frame(ey + 2, wd(240)) - 6, Z + FRONT]);
  }
  // the float: up and away over the pit, into the ceiling
  {
    const L = keys[keys.length - 1];
    [[6, 60, 60, 130], [16, 80, 110, 240], [room.FLOAT - 2, 90, 140, 330]].forEach(([dt, dx, dy, dz]) => push([L[0] + dt, L[1] + dx * 0.4, Math.min(room.CEIL - 20, L[2] + dy), L[3] + dz, X + 10, Y + 20, Z + FRONT]));
  }
  const camera = ({ eye, aim, dt, n }) => {
    // (eased a little behind the keys - twice over, so each turn of the
    // lens starts and ends softly and its speed never jumps: see glide)
    const lens = glide(0.08);
    for (let k = 0; k < n; k++) {
      const t = k * dt;
      const last = lens(spline(keys, t), dt);
      const e = last.slice(0, 3), a = last.slice(3, 6);
      // (never through the wheel: the eye keeps 30 cm off its face)
      const dz = e[2] - (Z + FRONT);
      if (dz < 30 && Math.hypot(e[0] - X, e[1] - Y) < RIM[1] + 10) e[2] = Z + FRONT + 30;
      // the ceiling: the float rises into it and rests there
      if (e[1] > room.CEIL - 20) e[1] = room.CEIL - 20 * Math.exp(-(e[1] - (room.CEIL - 20)) / 20);
      eye.set(e, k * 3); aim.set(a, k * 3);
    }
  };
  // the light behind the lens: brightest through the slow motion
  const gleamAt = t => smoother((t - (Rslow - 0.2)) / 0.35) * (1 - smoother((t - warp.slowHold[1]) / 0.7));

  // ---- Sounds, real seconds.
  const sfx = [];
  sfx.push({ t: Rw(WIND.from) + 0.1, kind: 'creak' });
  sfx.push({ t: Rw(pullAt), kind: 'pull' });
  spin.ticks.forEach(tk => sfx.push({ t: Rw(tk.t), kind: 'tick', speed: tk.speed, rate: warp.rateAt(Rw(tk.t)) }));
  if (!onPeg) sfx.push({ t: Rrest, kind: 'knock' });
  if (tier === 'hardways') sfx.push({ t: Rw(plan.callW) + 0.1, kind: 'chime' });
  if (tier === 'vault') sfx.push({ t: Rw(plan.boom), kind: 'bell' }, { t: Rw(plan.boom) + 0.02, kind: 'boom', soft: true });
  if (onPeg) sfx.push({ t: Rw(plan.silence[1]), kind: 'drop' });

  // ---- Each frame.
  const key0 = key.intensity, pendant0 = lights.pendant.intensity;
  // (the call sits on the pocket under the clapper, so the close-up on
  // the result holds it too; the shot keeps it on screen either way)
  const callPt = [X, tipY - 18, tipZ];
  const stage = (t, { w, gleam }) => {
    const th = thetaAt(w);
    wheel.rotation.z = -th;
    // the clapper
    let om = 0;
    if (w > pullAt) { const dth = thetaAt(w) - thetaAt(w - 0.004); om = dth / 0.004; }
    // (the pegs come up to the clapper from the left - the wheel turns
    // clockwise - and push it to the right: a swing on its pin counter-
    // clockwise, three.js's positive; The Peg leaves it pushed hard
    // against the peg the wheel stopped on)
    const cl = strapShape(clapperAt(th, w, spin.ticks, om));
    bendStrap(strapGeo, strapRest, cl.lean, cl.bend);
    // the house: the room's rim light stands at the shot's own each frame
    // (a home fades it from there after each frame of the fly, so a frame
    // that left it as it found it would dim it again and again)
    lights.rim.intensity = room.RIM;
    let burst = -1, dust = 1;
    if (tier === 'vault') {
      burst = w - plan.boom;
      const on = burst > 0;
      if (beads) {
        beads.visible = on;
        if (on) {
          for (let i = 0; i < N; i++) {
            // (two gold pulses chasing round, fading over the run)
            const ph = ((i / N) - burst * 0.9) % 1, ph2 = ((i / N) + 0.5 - burst * 0.9) % 1;
            const pk = Math.max(Math.pow(1 - Math.min(1, Math.abs(((ph % 1) + 1) % 1) * 6), 2), Math.pow(1 - Math.min(1, Math.abs(((ph2 % 1) + 1) % 1) * 6), 2));
            const b = pk * Math.max(0, 1 - burst / 3.2) * 2.2;
            beads.setColorAt(i, new THREE.Color(b, b * 0.8, b * 0.45));
          }
          beads.instanceColor.needsUpdate = true;
        }
      }
      if (jokerGlow) jokerGlow.material.opacity = on ? 0.55 * (0.7 + 0.3 * Math.sin(burst * 9)) * Math.max(0, 1 - burst / 4) : 0;
      if (flash) flash.intensity = on ? 22 * Math.exp(-burst / 0.18) : 0;
    }
    if (onPeg) {
      const k = smoother((w - plan.silence[0]) / 0.6);
      const es = lights.edgeSpot;
      es.position.set(X - 8, tipY + 50, tipZ + 12);
      es.target.position.set(X, tipY - 1, tipZ);
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
  const warmAt = [Rw(pullAt) + 0.1, Rw(pullAt) + 1.2, Rslow + 0.05, warp.slowHold[1], Rrest + 0.4];
  if (tier === 'vault') warmAt.push(Rw(plan.boom) + 0.05, Rw(plan.boom) + 0.8);
  if (onPeg) warmAt.push(Rw(plan.silence[1]) + 0.3);

  const dispose = () => {
    scene.remove(group, key, key.target);
    if (flash) scene.remove(flash);
    if (made.lamp) made.lamp.forEach(m => scene.remove(m));
    made.geos.forEach(g => g.dispose());
    made.mats.forEach(m => m.dispose());
    made.texs.forEach(t => t.dispose());
  };

  return {
    plan, camera, gleamAt, stage, callAt, sfx, warmAt, dispose,
    // (the light behind the lens, held low: the lacquered face, square to
    // the lens through the whole-wheel shots, gives it straight back as a
    // wash across a band of pockets, and brightest in the slow moment -
    // the frame everyone watches. The dice's glass wants it; the wheel's
    // numbers want to be read.)
    lens: { base: 0.12, peak: 0.4 },
    tierNames: TIER_NAMES,
    silence: onPeg ? Rw(plan.silence[0]) : null,
    // (for the lab: the moments, in real seconds, and the spin)
    moments: { pull: Rw(pullAt), slow: Rslow, rest: Rrest, call: Rw(plan.callW), reveal: plan.revealReal, end: plan.totalReal, boom: tier === 'vault' ? Rw(plan.boom) : null, pocket, value, ticks: spin.ticks.length, omega0: spin.omega0, turns: spin.theta / TAU },
    pieces: { group, wheel, clapper, stand, pegs }
  };
}
