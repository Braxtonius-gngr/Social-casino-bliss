// BLACKJACK: the landing shot's fourth game (see GAMES in intro.mjs).
//
// The house's salon table stands beyond the back rail, left of the wheel,
// under its own low pendant, laid out for blackjack: one seat, the shoe on
// the dealer's left, the chip float in the dealer's bar. Its dealer is the
// card table's machine (table.mjs: the torso, the arms, the hands): the
// shot opens close on its port, the iris turns back, and it rises out of
// the felt. Then the hand, as a shoe game is dealt: your card, the dealer's
// up card, your second, the dealer's hole card. The shoe arm draws each one
// and flicks it across to the other hand; that hand pitches yours to you
// face up, low along the felt (turned palm up to show it, as a dealer
// turns a card up), and lays the dealer's own face down a length short of
// their places, turning the up card over onto its place. You stand; the
// machine turns its hole card - and draws, if it must. Time slows on the
// card that decides it. The hand is called, and the lens floats up and
// away over the pit, from where the homes' fly-ins start (intro.mjs: FLOAT).
//
// The tiers, drawn as the dice's are (TIERS / pickTier):
//   standard  Standard Hand (90%)    your nineteen or twenty: the dealer
//                                    turns its hole card and stands short
//                                    of you, or draws and busts
//   hardways  Blackjack (8%)         an ace and a ten-card, called in
//                                    platinum
//   vault     The Black Jack (2%)    the ace of spades and a black jack,
//                                    the old bonus the game was named for:
//                                    gold runs through the table's print,
//                                    the machine's circuits light, a bell
//   (the draw's fourth tier, edge, is not played here: the natural is the
//   rare hand, so the intro folds it into vault - see intro.mjs)
//
// Everything is worked out before the first frame: the cards each tier
// draws, the machine's moves (a plan of moves per arm, as the card table's
// deal is: each a quintic path with a servo's give at its start and its
// shiver where it places something), every card's flight and slide, the
// camera, the timings and the sounds - one timeline; each frame is a
// lookup at a time.
//
// Each piece, held to a real maker's:
//   The table: the card table's own (table.mjs, buildCardTable), from the
//     cabinetmaker who built it, dressed for this game - its padded rail
//     in oxblood calf, saddle-stitched in gold; the layout hot-foil stamped
//     into the cloth, as a bookbinder tools gold into a binding.
//     Across the room: the dark half-moon, its oxblood rail, the gold arcs
//     of lettering. At arm's length: the foil let into the nap, the rail's
//     two rows of stitching. Pinched in: the weave in the foil, thread by
//     thread; the stitches' twist.
//   The dealer: the card table's machine - a Motoman dual-arm torso
//     finished like a Swiss watch (see table.mjs: buildDealerTorso).
//   The cards: held to a Belgian casino deck - 310 gsm linen-finish stock,
//     two inks, corner indices, the court cards the house's own (an
//     engraver's cartouche, the letter mirrored about its waist, a crown,
//     a coronet or a plume), the backs the shoe's (ivory round oxblood
//     engraving, see backArt).
//     Across the room: white cards with a spark of red or black. At arm's
//     length: the indices and pips, the linen catching the lamp. Pinched
//     in: the linen's tooth, the rounded corners, the court's hatching.
//     Light: matte satin stock, one broad soft sheen across the linen.
//     Contact: a card in the air throws a soft shadow onto the felt that
//     comes up to meet it as it lands; laid, it lies flat with its edge in
//     shadow; the second card lies over the first.
//     Motion: drawn by its end, flicked across with one flat turn, caught;
//     pitched low with a spin that dies as it slides, so it stops square;
//     turned over its near edge, up to fifty-five degrees on the fingers,
//     then over on its own, with a small flap as it lands.
//   The bet: three Paulson clay chips, stacked a hair off true.
//   The lamp: the card table's low bronze pendant, its light a pool on the
//     cloth that falls off into the dark at the rail.

import { dealerKit as K } from './table.mjs';

const DEG = Math.PI / 180;
const TAU = Math.PI * 2;
const clamp01 = x => Math.min(Math.max(x, 0), 1);
const smoother = x => { x = clamp01(x); return x * x * x * (x * (6 * x - 15) + 10); };
const easeOut = (x, k = 3) => 1 - Math.pow(1 - clamp01(x), k);
const lerp = (a, b, k) => a + (b - a) * k;

export const TIER_NAMES = { standard: 'Standard Hand', hardways: 'A Natural', vault: 'The Black Jack' };
const NUM = ['', 'One', 'Two', 'Three', 'Four', 'Five', 'Six', 'Seven', 'Eight', 'Nine', 'Ten', 'Eleven', 'Twelve', 'Thirteen', 'Fourteen', 'Fifteen', 'Sixteen', 'Seventeen', 'Eighteen', 'Nineteen', 'Twenty', 'Twenty-one', 'Twenty-two', 'Twenty-three', 'Twenty-four', 'Twenty-five', 'Twenty-six'];

// Where the table stands, in the room's frame: its seat frame's origin (on
// the felt at the inside edge of the rail in front of the seat - the card
// table's frame, so the machine's measures hold) and which way the dealer
// faces. Beyond the back rail, left of the wheel, the dealer's side away
// from the pit: the seat faces the back of the room.
const BJ = { at: [-215, 0, -95], yaw: 180 };
// The places on the felt (seat frame, cm). Yours: the first card, and the
// second over it, a little up and to the side so both corners show. The
// dealer's, in front of its port: its up card, its hole card and a third -
// each the place a card lies face up, the face-down place a length beyond
// it toward the machine (see turned), clear of the port's bezel. The bet's
// circle, in front of your cards.
const SPOT = { you: [[-2.3, 18.0], [2.3, 20.6]], dealer: [[-3.4, 36.5], [3.4, 36.5], [10.2, 36.5]], bet: [0, 8.5] };
// The shoe (the card table's place) and the discard rack, its mouth turned
// to the middle of the table.
const DISCARD = [28, 52];
// The drop slot (see SWP): one, let into the cloth in front of the machine's
// port, long across the table, its mouth to you. Flush with the felt when
// shut - a hairline of gold and a glint - and open (its two leaves drawn
// back) on a black well while the cards go in. x, z its middle, w across,
// d deep (cm). A bust (a third card) keeps clear of it: the cards lie a
// card's length short of it.
const SLOT = { x: 0, z: 46.4, w: 10.4, d: 4.0 };
// The slot's metal, in the trim the player chose in Settings (see TRIMS in
// intro.mjs): the bezel and the seams `c`/`m`/`r`, their glow `e`, the glint
// `g` (rgb), the leaves a dark shade of the same `l`.
const SLOT_METAL = {
  gold: { c: 0xd9ad4f, m: 0.9, r: 0.26, e: 0xffb23a, g: [255, 196, 86], l: 0x1a1308 },
  onyx: { c: 0x2a2930, m: 0.35, r: 0.1, e: 0x8fa4ff, g: [190, 205, 255], l: 0x08080b },
  silver: { c: 0xe3e6ec, m: 1, r: 0.16, e: 0xcfe0ff, g: [225, 236, 255], l: 0x101216 },
  crimson: { c: 0xc2182f, m: 0.5, r: 0.12, e: 0xff5068, g: [255, 110, 128], l: 0x1c0409 },
  burgundy: { c: 0xb4584c, m: 1, r: 0.3, e: 0xff8a70, g: [255, 150, 120], l: 0x180806 }
};
// The lettering stamped into the cloth: the plane it is drawn on (centre z,
// w x h cm, px a cm) and its two arcs, each round the table's own centre
// (the middle of the dealer's edge) - a and b its half-width and depth.
const LETTERS = { z: 28.5, w: 64, h: 10, px: 34, arcs: [{ a: 46, b: 35.4, text: 'BLACKJACK PAYS 3 TO 2', cap: 1.0, track: 0.22 }, { a: 48.5, b: 37.8, text: 'DEALER MUST STAND ON 17 AND DRAW TO 16', cap: 0.5, track: 0.14 }] };

// The machine's pace and phases (the card table's: see DEAL in table.mjs).
const DEAL = { first: 0.72, grab: 0.24, pull: 0.07, windup: 0.2, beat: 0.05, flick: 0.085, follow: 0.12, give: 0.13, carry: 0.3, settle: 0.07, push: 0.09, fall: 0.22, back: 0.24, rest: 0.6 };
// The fingers, [curl, spread] (see table.mjs, FIN).
const FIN = { rest: [0, 0], reach: [-0.35, 0.85], grip: [0.85, 0.08], flick: [1.15, 0.28], open: [-0.5, 1], relax: [0.32, 0.35], easy: [0.5, 0.1], poise: [0.28, 0.22] };
// The toss across, hand to hand, in front of the machine (the card
// table's, from the same shoe to the same catch).
const TOSS = { T: 0.2, spin: TAU, g: 600, bow: 2.2 };
// The rise out of the port, seconds before the deal begins; the yoke's
// fold as it clears the felt (see table.mjs: RISE, FOLD).
const RISE = { open: 1.5, up: 1.15, swing: 0.5 };
const FOLD = { y: 2.6, out: 0.55 };
// the machine's going down at the end: the yoke folds, then it sinks
const SINK = { fold: 0.5, lag: 0.35, down: 1.05 };
// A turned card: pushed up to PUSH on the fingers, then over on its own.
const PUSH = 55 * DEG;

// ------------------------------------------------------------ the cards
const RANKS = ['A', '2', '3', '4', '5', '6', '7', '8', '9', '10', 'J', 'Q', 'K'];
const SUITS = ['♠', '♥', '♦', '♣'];
const valueOf = r => (r === 'A' ? 11 : r === 'J' || r === 'Q' || r === 'K' ? 10 : +r);
const TENS = ['10', 'J', 'Q', 'K'];
// A hand's total, aces counted low where they must be.
function total(cards) {
  let t = 0, aces = 0;
  cards.forEach(c => { t += valueOf(c.rank); if (c.rank === 'A') aces++; });
  while (t > 21 && aces) { t -= 10; aces--; }
  return t;
}
// The cards a tier deals: yours, the dealer's (up, hole, and a third when
// it draws), the dealer's play, and the call.
function dealFor(tier, rng) {
  const pick = a => a[Math.floor(rng() * a.length)];
  const used = new Set();
  const card = (rank, suit) => {
    let s = suit || pick(SUITS);
    for (let k = 0; k < 8 && used.has(rank + s); k++) s = pick(SUITS);
    used.add(rank + s);
    return { rank, suit: s, red: s === '♥' || s === '♦' };
  };
  // two cards to a total (no ace among them unless named)
  const pair = t => {
    const opts = [];
    for (let a = 2; a <= 10; a++) { const b = t - a; if (b >= 2 && b <= 10 && a <= b) opts.push([a, b]); }
    const [a, b] = pick(opts);
    const r = v => (v === 10 ? pick(TENS) : String(v));
    return rng() < 0.5 ? [r(a), r(b)] : [r(b), r(a)];
  };
  let you, dealer, play, call;
  if (tier === 'hardways' || tier === 'vault') {
    if (tier === 'vault') you = [card('A', '♠'), card('J', rng() < 0.5 ? '♠' : '♣')];
    else {
      // (any blackjack but the black jack itself)
      const ace = card('A', pick(['♥', '♦', '♣', '♠']));
      let ten = pick(TENS), suit = pick(SUITS);
      if (ace.suit === '♠' && ten === 'J' && (suit === '♠' || suit === '♣')) suit = pick(['♥', '♦']);
      you = [ace, card(ten, suit)];
    }
    if (rng() < 0.5) you.reverse();
    // (the dealer showing two to nine: no peek, and the blackjack is paid
    // at once - the hole card stays down)
    dealer = [card(String(2 + Math.floor(rng() * 8))), card(pick(RANKS.slice(1)))];
    play = 'none';
    call = tier === 'vault' ? ['The Black Jack', 'Ten to one'] : ['Blackjack', 'Three to two'];
  } else if (rng() < 0.55) {
    // stands short of you: your nineteen or twenty, its seventeen or
    // eighteen
    const T = rng() < 0.6 ? 20 : 19, D = rng() < 0.5 ? 17 : 18;
    you = pair(T).map(r => card(r));
    const up = 7 + Math.floor(rng() * 4), hole = D - up;
    dealer = [card(up === 10 ? pick(TENS) : String(up)), card(hole === 11 ? 'A' : hole === 10 ? pick(TENS) : String(hole))];
    play = 'stand';
    call = [NUM[T], `Over ${NUM[D].toLowerCase()}`];
  } else {
    // draws and busts: showing four to six, twelve to sixteen under it,
    // and a ten-card on it
    const T = 18 + Math.floor(rng() * 3);
    you = pair(T).map(r => card(r));
    const up = 4 + Math.floor(rng() * 3), lo = Math.max(2, 12 - up), hi = Math.min(10, 16 - up);
    const hole = lo + Math.floor(rng() * (hi - lo + 1));
    dealer = [card(String(up)), card(hole === 10 ? pick(TENS) : String(hole)), card(pick(TENS))];
    play = 'bust';
    call = [NUM[T], 'Dealer busts'];
  }
  return { you, dealer, play, call };
}

// A card's face, printed as a casino deck's: cream linen stock, the rank
// and its pip at two corners, the pips laid out as a deck lays them; an
// ace one great pip (the house's mark knocked out of the ace of spades,
// where a maker puts its own); a court card the house's cartouche. Drawn
// on a W x H canvas, the card's own proportions.
function paintFace(c, W, H, card, PIPS) {
  const ink = card.red ? '#9a0f1b' : '#0b0b0b';
  const s = W / 6.35;                      // px a cm
  // the stock, and its linen (fine threads both ways, a hair darker)
  c.fillStyle = '#ebe2cf'; c.fillRect(0, 0, W, H);
  c.globalAlpha = 0.05; c.strokeStyle = '#6b5a3c'; c.lineWidth = 0.6;
  for (let x = 0; x < W; x += s * 0.045) { c.beginPath(); c.moveTo(x, 0); c.lineTo(x, H); c.stroke(); }
  for (let y = 0; y < H; y += s * 0.045) { c.beginPath(); c.moveTo(0, y); c.lineTo(W, y); c.stroke(); }
  c.globalAlpha = 1;
  // (the cut edge: a casino card's is rounded a hair by the die and reads,
  // lying on another, as a fine shade round the card - inside the corners'
  // radius, 0.32 cm)
  {
    const r = 0.32 * s, e = 0.035 * s;
    c.save(); c.lineWidth = 2 * e; c.strokeStyle = 'rgba(70,52,30,0.55)';
    c.beginPath(); c.roundRect(0, 0, W, H, r); c.stroke();
    c.lineWidth = 5 * e; c.strokeStyle = 'rgba(70,52,30,0.14)';
    c.beginPath(); c.roundRect(0, 0, W, H, r); c.stroke();
    c.restore();
  }
  const pip = new Path2D(PIPS[card.suit]);
  // (a pip size cm wide, centred at x, y, upside down if flip)
  const drawPip = (x, y, size, flip = false, fill = ink) => {
    c.save(); c.translate(x, y); if (flip) c.rotate(Math.PI);
    const k = (size * s) / 100; c.scale(k, k); c.translate(-50, -50);
    c.fillStyle = fill; c.fill(pip); c.restore();
  };
  // the indices, at two corners
  const index = flip => {
    c.save(); if (flip) { c.translate(W, H); c.rotate(Math.PI); }
    c.fillStyle = ink; c.textAlign = 'center'; c.textBaseline = 'alphabetic';
    const ten = card.rank === '10';
    c.font = `700 ${(ten ? 0.72 : 0.84) * s}px Georgia, "Times New Roman", serif`;
    if (ten) { c.save(); c.translate(0.56 * s, 0); c.scale(0.82, 1); c.fillText('10', 0, 1.08 * s); c.restore(); } else c.fillText(card.rank, 0.56 * s, 1.1 * s);
    drawPip(0.56 * s, 1.62 * s, 0.56);
    c.restore();
  };
  index(false); index(true);
  const cx = W / 2, cy = H / 2;
  const v = valueOf(card.rank);
  if (card.rank === 'A') {
    const big = card.suit === '♠' ? 3.1 : 2.2;
    drawPip(cx, cy, big);
    // (an open line just inside the great pip's edge, and on the ace of
    // spades the house's mark knocked out of it)
    if (card.suit === '♠') {
      c.save(); c.translate(cx, cy); const k = (big * s) / 100; c.scale(k * 0.86, k * 0.86); c.translate(-50, -50);
      c.strokeStyle = '#ebe2cf'; c.lineWidth = 1.6 / k; c.stroke(pip); c.restore();
      c.fillStyle = '#ebe2cf'; c.textAlign = 'center'; c.textBaseline = 'middle';
      c.font = `700 ${0.42 * s}px Georgia, "Times New Roman", serif`;
      c.fillText('DRO', cx, cy - 0.12 * s);
    }
  } else if (v < 10 || card.rank === '10') {
    // the pips, in the deck's layout (columns 0, .5, 1 across the field;
    // rows 0..1 down it; the lower half upside down)
    const n = +card.rank;
    const L = { 2: [[.5, 0], [.5, 1]], 3: [[.5, 0], [.5, .5], [.5, 1]], 4: [[0, 0], [1, 0], [0, 1], [1, 1]] };
    L[5] = L[4].concat([[.5, .5]]);
    L[6] = [[0, 0], [1, 0], [0, .5], [1, .5], [0, 1], [1, 1]];
    L[7] = L[6].concat([[.5, .25]]);
    L[8] = L[7].concat([[.5, .75]]);
    L[9] = [[0, 0], [1, 0], [0, 1 / 3], [1, 1 / 3], [0, 2 / 3], [1, 2 / 3], [0, 1], [1, 1], [.5, .5]];
    L[10] = [[0, 0], [1, 0], [0, 1 / 3], [1, 1 / 3], [0, 2 / 3], [1, 2 / 3], [0, 1], [1, 1], [.5, 1 / 6], [.5, 5 / 6]];
    const x0 = 1.68 * s, x1 = W - 1.68 * s, y0 = 1.35 * s, y1 = H - 1.35 * s;
    L[n].forEach(([u, w]) => drawPip(lerp(x0, x1, u), lerp(y0, y1, w), 1.22, w > 0.5));
  } else {
    // the court: a cartouche - a fine double rule in the suit's ink, a gold
    // line inside it, the field hatched as an engraver cuts it - the letter
    // mirrored about the waist, a crown (K), a coronet (Q) or a plume (J)
    // over it, the suit's pip beside it
    const fx = 1.18 * s, fy = 1.05 * s, fw = W - 2 * fx, fh = H - 2 * fy;
    c.save(); c.beginPath(); c.rect(fx, fy, fw, fh); c.clip();
    c.globalAlpha = 0.09; c.strokeStyle = ink; c.lineWidth = 0.9;
    for (let d = -fh; d < fw + fh; d += 0.11 * s) { c.beginPath(); c.moveTo(fx + d, fy); c.lineTo(fx + d - fh, fy + fh); c.stroke(); }
    c.globalAlpha = 1; c.restore();
    c.strokeStyle = ink; c.lineWidth = 0.05 * s; c.strokeRect(fx, fy, fw, fh);
    c.lineWidth = 0.02 * s; c.strokeRect(fx + 0.12 * s, fy + 0.12 * s, fw - 0.24 * s, fh - 0.24 * s);
    c.strokeStyle = '#b8914a'; c.lineWidth = 0.03 * s; c.strokeRect(fx + 0.2 * s, fy + 0.2 * s, fw - 0.4 * s, fh - 0.4 * s);
    // (the waist: a gold rule with a diamond at its middle)
    c.beginPath(); c.moveTo(fx + 0.2 * s, cy); c.lineTo(W - fx - 0.2 * s, cy); c.stroke();
    c.fillStyle = '#b8914a'; c.beginPath(); c.moveTo(cx, cy - 0.16 * s); c.lineTo(cx + 0.1 * s, cy); c.lineTo(cx, cy + 0.16 * s); c.lineTo(cx - 0.1 * s, cy); c.closePath(); c.fill();
    const half = () => {
      // (the half above the waist, as the card's top reads it)
      c.fillStyle = ink; c.textAlign = 'center'; c.textBaseline = 'alphabetic';
      c.font = `700 ${1.55 * s}px Georgia, "Times New Roman", serif`;
      c.fillText(card.rank, cx + 0.12 * s, cy - 0.38 * s);
      drawPip(cx - 1.05 * s, cy - 1.42 * s, 0.62);
      // the crown, the coronet or the plume, in gold and ink
      const top = cy - 2.42 * s;
      c.lineJoin = 'round';
      if (card.rank === 'K') {
        const w = 1.3 * s, h = 0.62 * s, x = cx + 0.12 * s;
        c.beginPath(); c.moveTo(x - w / 2, top + h);
        [[-0.5, -0.05], [-0.25, 0.45], [0, -0.15], [0.25, 0.45], [0.5, -0.05]].forEach(([u, v2], i) => c.lineTo(x + u * w, top + v2 * h));
        c.lineTo(x + w / 2, top + h); c.closePath();
        c.fillStyle = '#c9a24c'; c.fill(); c.strokeStyle = ink; c.lineWidth = 0.035 * s; c.stroke();
        c.fillStyle = ink; [-0.5, 0, 0.5].forEach(u => { c.beginPath(); c.arc(x + u * w, top - (u ? 0.12 : 0.22) * h, 0.07 * s, 0, TAU); c.fill(); });
        c.fillRect(x - w / 2, top + h - 0.1 * s, w, 0.1 * s);
      } else if (card.rank === 'Q') {
        const w = 1.05 * s, h = 0.46 * s, x = cx + 0.12 * s;
        c.beginPath(); c.moveTo(x - w / 2, top + h);
        c.quadraticCurveTo(x - w / 2, top, x - w / 4, top + h * 0.45); c.quadraticCurveTo(x, top - h * 0.3, x + w / 4, top + h * 0.45); c.quadraticCurveTo(x + w / 2, top, x + w / 2, top + h);
        c.closePath(); c.fillStyle = '#c9a24c'; c.fill(); c.strokeStyle = ink; c.lineWidth = 0.035 * s; c.stroke();
        c.fillStyle = '#ebe2cf'; c.strokeStyle = ink; c.lineWidth = 0.02 * s;
        [-0.36, 0, 0.36].forEach(u => { c.beginPath(); c.arc(x + u * w, top + (u ? 0.18 : -0.12) * h, 0.075 * s, 0, TAU); c.fill(); c.stroke(); });
      } else {
        // (a plume: a curled feather, its vane in gold, its rachis in ink)
        const x = cx + 0.12 * s;
        c.beginPath(); c.moveTo(x - 0.5 * s, top + 0.62 * s);
        c.bezierCurveTo(x - 0.4 * s, top - 0.1 * s, x + 0.35 * s, top - 0.3 * s, x + 0.62 * s, top - 0.05 * s);
        c.bezierCurveTo(x + 0.3 * s, top + 0.05 * s, x - 0.05 * s, top + 0.25 * s, x - 0.5 * s, top + 0.62 * s);
        c.fillStyle = '#c9a24c'; c.fill(); c.strokeStyle = ink; c.lineWidth = 0.03 * s; c.stroke();
        c.beginPath(); c.moveTo(x - 0.5 * s, top + 0.62 * s); c.quadraticCurveTo(x, top + 0.02 * s, x + 0.62 * s, top - 0.05 * s); c.stroke();
      }
    };
    half();
    c.save(); c.translate(W, H); c.rotate(Math.PI); half(); c.restore();
  }
  // (the press's ink a hair soft at its edges: the print is not a vector)
  return c;
}

// ------------------------------------------------------------ the game
export async function makeGame(ctx) {
  const { THREE, scene, set, lights, tier, seed, aspect, room, helpers: H } = ctx;
  const trim = ctx.trim || 'gold';
  const { makeWarp, spline } = H;
  const V = (x, y, z) => new THREE.Vector3(x, y, z);
  const up = V(0, 1, 0);
  const { CARD, PORT, ARM, WRIST, SIDES, LAYOUT, lying, handPose, elbowWay, segDist } = K;
  // (the seed mixed first: neighbouring seeds would otherwise open alike)
  const rng = (s => { for (let k = 0; k < 3; k++) { s = Math.imul(s ^ (s >>> 15), 0x2c1b3c6d) >>> 0; s = Math.imul(s ^ (s >>> 12), 0x297a2d39) >>> 0; } return () => { s = (Math.imul(s, 1664525) + 1013904223) >>> 0; s ^= s >>> 16; return (s >>> 0) / 4294967296; }; })((seed ^ 0x2545f491) >>> 0);
  const hand = dealFor(tier, rng);

  // ---- The table, its props and its lamp, in the seat's frame.
  const seat = new THREE.Group();
  seat.position.set(...BJ.at);
  seat.rotation.y = BJ.yaw * DEG;
  scene.add(seat);
  const toWorld = v => seat.localToWorld(v.clone());
  // the lettering, stamped into the cloth with the house's foil: two arcs
  // round the dealer, the betting circle in front of you
  const paintLetters = kl => (c, W, Hc) => {
    const s = W / LETTERS.w;
    // (the canvas as you see it from the seat: its left is your left, +x;
    // its top the dealer's side)
    const px = x => (LETTERS.w / 2 - x) * s, pz = z => (LETTERS.z + LETTERS.h / 2 - z) * s;
    c.fillStyle = '#000'; c.fillRect(0, 0, W, Hc);
    c.fillStyle = '#fff'; c.strokeStyle = '#fff'; c.lineJoin = 'round';
    LETTERS.arcs.forEach(arc => {
      c.font = `700 ${arc.cap * 1.38 * s}px Georgia, "Times New Roman", serif`;
      c.textAlign = 'center'; c.textBaseline = 'middle';
      // (the arc round the middle of the dealer's edge, its middle nearest
      // you; walked by length, the letters spaced by their own widths)
      const at = th => [arc.a * Math.sin(th), K.FELT.b - arc.b * Math.cos(th)];
      const widths = [...arc.text].map(ch => c.measureText(ch).width / s + arc.track);
      const len = widths.reduce((a, b) => a + b, 0) - arc.track;
      // (a table of length along the arc against its angle)
      const N = 720, lens = [0];
      for (let i = 1; i <= N; i++) { const t0 = -1.2 + 2.4 * (i - 1) / N, t1 = -1.2 + 2.4 * i / N; const [x0, z0] = at(t0), [x1, z1] = at(t1); lens.push(lens[i - 1] + Math.hypot(x1 - x0, z1 - z0)); }
      const mid = lens[N / 2];
      const thAt = L => { let i = 0; while (i < N && lens[i + 1] < L) i++; return -1.2 + 2.4 * (i + (L - lens[i]) / (lens[i + 1] - lens[i])) / N; };
      // (read left to right from the seat: from your left, +x, to -x)
      let L = mid + len / 2;
      [...arc.text].forEach((ch, i) => {
        const w = widths[i] - arc.track, centre = L - w / 2;
        const th = thAt(centre), [x, z] = at(th), [xa, za] = at(th - 0.002);
        c.save(); c.translate(px(x), pz(z));
        c.rotate(Math.atan2(pz(za) - pz(z), px(xa) - px(x)));
        c.lineWidth = 2 * kl * s;
        c.fillText(ch, 0, 0); if (kl) c.strokeText(ch, 0, 0);
        c.restore();
        L -= widths[i];
      });
    });
    return c;
  };
  const table = K.buildCardTable(set, { rail: 0x3a0b12, mark: { w: LETTERS.w, h: LETTERS.h, z: LETTERS.z, cw: LETTERS.w * LETTERS.px, ch: LETTERS.h * LETTERS.px, paint: paintLetters } });
  seat.add(table.group);
  // (the lens comes lower over this cloth than the seat's ever does: its
  // nap pressed flatter, or at a low angle it reads as water)
  table.felt.normalScale.multiplyScalar(0.55);
  // (black baize lifted a step, so the cloth holds a tone the light can find)
  table.felt.color.setHex(tier === 'vault' ? 0x2a1c12 : 0x1d1d26);
  // (and its nap: baize is brushed one way, so it shades in long soft
  // strokes - lighter where the pile lies toward the lamp, darker where it
  // lies away, a few worn paths where hands have swept it - which the
  // lamp's sheen then reads across the whole cloth. A tiling shade map,
  // multiplied over the cloth's colour (it only darkens, so a light cloth
  // stays itself), set now so nothing compiles mid-shot.)
  {
    const S = 512, cv = document.createElement('canvas'); cv.width = cv.height = S;
    const c = cv.getContext('2d'); c.fillStyle = '#fff'; c.fillRect(0, 0, S, S);
    let st = 90210; const r = () => (st = (st * 1664525 + 1013904223) >>> 0) / 4294967296;
    // (fibres: short, every way, crossing - a pile, not a grain - drawn
    // over the edges too so the tile wraps)
    for (let k = 0; k < 16000; k++) {
      const x = r() * S, y = r() * S, l = 2 + r() * 6, th = r() * Math.PI, a = 0.015 + r() * 0.04;
      c.strokeStyle = `rgba(0,0,0,${a})`; c.lineWidth = 0.7 + r() * 0.8;
      for (let wx = -S; wx <= S; wx += S) for (let wy = -S; wy <= S; wy += S) { if (Math.abs(wx) + Math.abs(wy) && (x + wx < -30 || x + wx > S + 30 || y + wy < -30 || y + wy > S + 30)) continue; c.beginPath(); c.moveTo(x + wx, y + wy); c.lineTo(x + wx + Math.cos(th) * l, y + wy + Math.sin(th) * l); c.stroke(); }
    }
    // (the worn paths: broad, faint, a little off the nap's line. Drawn
    // sharp onto a layer of their own, the layer tiled three by three, and
    // blurred in ONE draw - so the blur runs across the tile's seams - not a
    // filtered stroke apiece: a canvas filter per stroke freezes a software-GL
    // page)
    const worn = document.createElement('canvas'); worn.width = worn.height = S;
    const wc = worn.getContext('2d'); wc.fillStyle = 'rgba(0,0,0,0.05)';
    for (let k = 0; k < 9; k++) {
      const x = r() * S, y = r() * S, w = 18 + r() * 40, l = 120 + r() * 200, rot = (r() - 0.5) * 0.5;
      for (let wx = -S; wx <= S; wx += S) for (let wy = -S; wy <= S; wy += S) { wc.save(); wc.translate(x + wx, y + wy); wc.rotate(rot); wc.fillRect(-w / 2, 0, w, l); wc.restore(); }
    }
    const big = document.createElement('canvas'); big.width = big.height = S * 3;
    const bc = big.getContext('2d');
    for (let wx = 0; wx < 3; wx++) for (let wy = 0; wy < 3; wy++) bc.drawImage(worn, wx * S, wy * S);
    c.filter = 'blur(10px)'; c.drawImage(big, -S, -S); c.filter = 'none';
    const t = new THREE.CanvasTexture(cv); t.colorSpace = THREE.SRGBColorSpace; t.anisotropy = 8;
    t.wrapS = t.wrapT = THREE.RepeatWrapping; t.repeat.set(0.3, 0.3);
    table.felt.map = t;
    // (a tighter, brighter sheen over it: the nap catches the lamp as a
    // satin, not a haze)
    table.felt.sheen = 1; table.felt.sheenRoughness = 0.38;
    table.felt.needsUpdate = true;
  }
  // the betting circle: its own small stamp, a double ring and four
  // diamonds round it (the same foil: a clone of the lettering's material)
  {
    const S = 512, R = 4.6, sc = S / (2 * R + 1.2);
    const paint = kl => {
      const cv = document.createElement('canvas'); cv.width = cv.height = S;
      const c = cv.getContext('2d'); c.fillStyle = '#000'; c.fillRect(0, 0, S, S);
      c.strokeStyle = '#fff'; c.fillStyle = '#fff';
      [[R, 0.09], [R - 0.32, 0.04]].forEach(([r, w]) => { c.lineWidth = (w + 2 * kl) * sc; c.beginPath(); c.arc(S / 2, S / 2, r * sc, 0, TAU); c.stroke(); });
      for (let k = 0; k < 4; k++) { const a = k * Math.PI / 2 + Math.PI / 4, x = S / 2 + Math.cos(a) * (R + 0.42) * sc, y = S / 2 + Math.sin(a) * (R + 0.42) * sc, d = (0.2 + kl) * sc; c.beginPath(); c.moveTo(x, y - d); c.lineTo(x + d * 0.62, y); c.lineTo(x, y + d); c.lineTo(x - d * 0.62, y); c.closePath(); c.fill(); }
      const t = new THREE.CanvasTexture(cv); t.colorSpace = THREE.NoColorSpace; t.anisotropy = 8;
      return t;
    };
    const mark = table.group.userData.mark;
    const ring = new THREE.Mesh(new THREE.PlaneGeometry(2 * R + 1.2, 2 * R + 1.2), mark.material.clone());
    ring.material.alphaMap = paint(0); ring.material.normalMap = null;
    ring.rotation.x = -Math.PI / 2; ring.position.set(SPOT.bet[0], 0.008, SPOT.bet[1]); ring.renderOrder = 0.5; ring.receiveShadow = true;
    seat.add(ring);
    const keyM = mark.children[0] && mark.children[0].material.clone();
    if (keyM) { keyM.alphaMap = paint(0.11); const k = new THREE.Mesh(ring.geometry, keyM); k.position.z = -0.001; k.visible = mark.children[0].visible; k.renderOrder = 0.25; ring.add(k); }
  }
  // the shoe, where the card table keeps it; the discard rack on the
  // dealer's right
  const faceToward = (obj, x, z, tx, tz) => { obj.position.set(x, 0, z); obj.rotation.y = Math.atan2(-(tx - x), -(tz - z)); };
  const L = LAYOUT.card;
  const shoe = K.buildShoe(set);
  faceToward(shoe, L.shoe[0], L.shoe[1], L.shoe[0] + 3, L.shoe[1] + 15);
  shoe.position.sub(V(0, 0, -11.6).applyAxisAngle(up, shoe.rotation.y));
  const discard = K.buildDiscard(set);
  faceToward(discard, DISCARD[0], DISCARD[1], 0, 20);
  seat.add(shoe, discard);
  // the drop slot the machine clears its cards into (see SWP): let into the
  // cloth, black leaves over a black well and a hairline of brass round it
  let slotG = null, slotAnim = null;
  if (tier !== 'vault') {
    const { x: sx, z: sz, w: sw, d: sd } = SLOT;
    const goldM = new THREE.MeshStandardMaterial({ color: 0xd9ad4f, metalness: 0.9, roughness: 0.28, emissive: 0xffb23a, emissiveIntensity: 0.3, transparent: true, opacity: 0 });
    const leafM = new THREE.MeshStandardMaterial({ color: 0x0a0908, roughness: 0.8, metalness: 0.1, transparent: true, opacity: 0 });
    const wellM = new THREE.MeshBasicMaterial({ color: 0x010101 });
    slotG = new THREE.Group();
    slotG.position.set(sx, 0, sz);
    // (the bezel: a raised, bevelled frame of metal on the far side and the
    // two ends, with a low ramp for the near lip, which the cards tip over;
    // inside it the walls drop to the well)
    const bev = (bx, bh, bz, r) => {
      const hx = bx / 2 - r, hz = bz / 2 - r, sh = new THREE.Shape();
      sh.moveTo(-hx, -bz / 2); sh.lineTo(hx, -bz / 2); sh.absarc(hx, -hz, r, -Math.PI / 2, 0); sh.lineTo(bx / 2, hz); sh.absarc(hx, hz, r, 0, Math.PI / 2);
      sh.lineTo(-hx, bz / 2); sh.absarc(-hx, hz, r, Math.PI / 2, Math.PI); sh.lineTo(-bx / 2, -hz); sh.absarc(-hx, -hz, r, Math.PI, 1.5 * Math.PI);
      const g = new THREE.ExtrudeGeometry(sh, { depth: Math.max(0.01, bh - 0.16), bevelEnabled: true, bevelThickness: 0.08, bevelSize: 0.08, bevelSegments: 2, curveSegments: 6 });
      g.rotateX(-Math.PI / 2);
      return g;
    };
    const bw = 0.85, bh = 0.5;
    [[0, sd / 2 + bw / 2, sw + 2 * bw, bw, bh], [-(sw / 2 + bw / 2), 0, bw, sd, bh], [sw / 2 + bw / 2, 0, bw, sd, bh], [0, -(sd / 2 + 0.3), sw + 2 * bw, 0.6, 0.14]].forEach(([px, pz, bx, bz, hh]) => {
      const m = new THREE.Mesh(bev(bx, hh, bz, Math.min(0.3, bz / 2 - 0.01)), goldM);
      m.position.set(px, 0, pz);
      slotG.add(m);
    });
    // (the well: where the cards go)
    const well = new THREE.Mesh(new THREE.PlaneGeometry(sw, sd), wellM);
    well.rotation.x = -Math.PI / 2; well.position.y = 0.035; well.visible = false;
    slotG.add(well);
    // (the two leaves, each hinged on its own outer edge: they draw back
    // under the frame by shrinking toward it; a gold seam along the inner
    // edge of each)
    const leaves = [-1, 1].map(side => {
      const g = new THREE.Group();
      g.position.set(0, 0, side * sd / 2);
      const body = new THREE.Mesh(new THREE.BoxGeometry(sw, 0.05, sd / 2 + 0.02), leafM);
      body.position.set(0, 0.045, -side * sd / 4);
      const seam = new THREE.Mesh(new THREE.BoxGeometry(sw, 0.055, 0.12), goldM);
      seam.position.set(0, 0.0475, -side * sd / 2);
      g.add(body, seam);
      slotG.add(g);
      return g;
    });
    // (the glint: a small light that wanders the seam when it is shut)
    const gc = document.createElement('canvas'); gc.width = gc.height = 64;
    const gtex = new THREE.CanvasTexture(gc);
    const paintGlint = ([r, g2, b2]) => { const c = gc.getContext('2d'), g = c.createRadialGradient(32, 32, 0, 32, 32, 32); c.clearRect(0, 0, 64, 64); g.addColorStop(0, `rgba(${Math.min(255, r + 40)},${Math.min(255, g2 + 44)},${Math.min(255, b2 + 104)},1)`); g.addColorStop(0.25, `rgba(${r},${g2},${b2},0.7)`); g.addColorStop(1, `rgba(${r},${g2},${b2},0)`); c.fillStyle = g; c.fillRect(0, 0, 64, 64); gtex.needsUpdate = true; };
    const glintM = new THREE.MeshBasicMaterial({ map: gtex, transparent: true, opacity: 0, depthWrite: false, blending: THREE.AdditiveBlending });
    const glint = new THREE.Mesh(new THREE.PlaneGeometry(2.6, 1.1), glintM);
    glint.rotation.x = -Math.PI / 2; glint.position.y = 0.1;
    slotG.add(glint);
    slotG.visible = false;
    seat.add(slotG);
    // (dressed as the trim chosen, now and when it is changed while the shot is up)
    const dress = id => {
      const t = SLOT_METAL[id] || SLOT_METAL.gold;
      goldM.color.setHex(t.c); goldM.metalness = t.m; goldM.roughness = t.r; goldM.emissive.setHex(t.e);
      leafM.color.setHex(t.l);
      paintGlint(t.g);
    };
    dress(trim);
    slotAnim = { goldM, leafM, wellM, well, leaves, glint, glintM, dress };
    // (the table's lettering fades as the end card arrives: transparent from
    // the build, so warm() compiles its final state and nothing flips mid-shot)
    const pm = table.group.userData.mark;
    pm.material.transparent = true;
    if (pm.children[0] && pm.children[0].material) pm.children[0].material.transparent = true;
  }
  const shoeMouth = V(0, 0.9, -11.6).applyAxisAngle(up, shoe.rotation.y).add(shoe.position);
  const mouthDir = V(0, 0, -1).applyAxisAngle(up, shoe.rotation.y);
  const yawShoe = Math.atan2(-mouthDir.x, -mouthDir.z);
  // the port the machine rises through
  const port = K.buildPort(set);
  port.group.position.set(PORT.x, 0, PORT.z);
  seat.add(port.group);
  port.set(0);
  // the bet: three chips, stacked a hair off true, in their shadow
  // (kept: The Black Jack's lamp would blow their gold out to cream, so it
  // takes their exposure down as it comes up - see the burst)
  const betChips = [];
  {
    const names = ['ivory', 'oxblood', 'gold'];
    const geo = new THREE.CylinderGeometry(1.95, 1.95, 0.33, 48, 1);
    names.forEach((n, i) => {
      const m = new THREE.Mesh(geo, K.chipMats(n));
      betChips.push(m);
      m.position.set(SPOT.bet[0] + Math.sin(i * 2.1) * 0.05, 0.165 + i * 0.335, SPOT.bet[1] + Math.cos(i * 1.7) * 0.05);
      m.rotation.y = i * 1.3 + 0.4;
      m.castShadow = true; m.receiveShadow = true;
      seat.add(m);
    });
    const sh = K.contactShadow(3.9, 3.9, 1.95, 0.9);
    sh.position.set(SPOT.bet[0], 0.02, SPOT.bet[1]); seat.add(sh);
    // (the coin's gold face is already pale: under the pendant it clips to
    // cream, so the stake sits a little under full exposure and a touch
    // satin, in every tier)
    betChips.forEach(m => m.material.forEach(mm => { mm.color.setRGB(0.8, 0.72, 0.6); mm.roughness = Math.max(mm.roughness, 0.62); }));
  }
  // the lamp: a low bronze pendant over the cloth, its light a pool
  const bronze = new THREE.MeshStandardMaterial({ color: 0x2a1c12, metalness: 0.85, roughness: 0.35 });
  const lamp = new THREE.Group();
  {
    const body = new THREE.Mesh(new THREE.BoxGeometry(70, 6, 26), bronze);
    const lip = new THREE.Mesh(new THREE.BoxGeometry(71, 0.8, 27), set.brass); lip.position.y = -3.2;
    const glow = new THREE.Mesh(new THREE.PlaneGeometry(66, 22), new THREE.MeshBasicMaterial({ color: new THREE.Color(2.2, 1.75, 1.3), fog: false }));
    glow.rotation.x = Math.PI / 2; glow.position.y = -3.7;
    lamp.add(body, lip, glow);
    [-26, 26].forEach(x => { const rod = new THREE.Mesh(new THREE.CylinderGeometry(0.4, 0.4, 200, 8), bronze); rod.position.set(x, 103, 0); lamp.add(rod); });
    lamp.position.set(0, 118, 34);
    seat.add(lamp);
  }
  const key = new THREE.SpotLight(0xffeedd, 8.5, 0, 0.36, 1, 0);
  key.position.set(0, 112, 34);
  key.target.position.set(0, 0, 32);
  key.castShadow = true;
  key.shadow.mapSize.set(1024, 1024);
  key.shadow.camera.near = 50; key.shadow.camera.far = 200;
  key.shadow.bias = -0.0004; key.shadow.normalBias = 0.03; key.shadow.radius = 7;
  // (the room's even light gets in under a card held up: its shadow is a
  // shade, not a hole)
  key.shadow.intensity = 0.55;
  seat.add(key, key.target);
  // (a wider, softer pool from the same pendant with no shadow: the cloth
  // and the rail take a middle tone between the key's bright pool and the
  // black round it, so the table reads as a lit felt, not a void with a spot)
  const pool = new THREE.SpotLight(0xffeedd, 1.6, 0, 0.78, 1, 0);
  pool.position.set(0, 112, 34);
  pool.target.position.set(0, 0, 24);
  seat.add(pool, pool.target);

  // ---- The machine: the card table's (table.mjs), stowed under its port.
  const dm = K.dealerMaterials();
  const torso = K.buildDealerTorso(dm);
  seat.add(torso.group);
  const arms = SIDES.map(side => {
    const h = K.buildDealerHand(dm, side < 0);
    const arm = K.buildDealerArm(dm, side);
    seat.add(h, arm.group);
    return { side, hand: h, arm, now: { p: V(0, 0, 0), q: new THREE.Quaternion() }, wrist: V(0, 0, 0), pref: V(0, 0, 0), prevPalm: null };
  });
  // (what casts: its body, not its glass, lights or gold, nor anything
  // thinner than a few millimetres - see the card table)
  {
    const ext = new THREE.Vector3();
    [torso.group, ...arms.flatMap(a => [a.hand, a.arm.group])].forEach(g => g.traverse(m => {
      if (!m.isMesh || m.userData.noShadow || m.material.isMeshBasicMaterial || [dm.clear, dm.gold, dm.bright, dm.blued, dm.circuit].includes(m.material)) return;
      const geo = m.geometry;
      if (!geo.boundingBox) geo.computeBoundingBox();
      if (geo.boundingBox.isEmpty()) { m.castShadow = true; return; }
      geo.boundingBox.getSize(ext).multiply(m.scale);
      m.castShadow = Math.min(Math.abs(ext.x), Math.abs(ext.y), Math.abs(ext.z)) >= 0.35;
    }));
  }

  // ---- The cards: each a sheet of stock, its face and the shoe's back.
  const backTex = await new Promise(res => {
    const cv = document.createElement('canvas'); cv.width = 384; cv.height = 538;
    const c = cv.getContext('2d'); K.paintCardBack(c, cv.width, cv.height);
    const t = new THREE.CanvasTexture(cv); t.colorSpace = THREE.SRGBColorSpace; t.anisotropy = 8;
    const img = new Image();
    const done = () => { t.needsUpdate = true; res(t); };
    img.onload = () => { const W = cv.width, Hh = cv.height, mx = W * 15 / 318, my = Hh * 15 / 445; c.drawImage(img, mx, my, W - 2 * mx, Hh - 2 * my); done(); };
    img.onerror = done;
    img.src = K.backArt('D', false).slice(5, -2);
  });
  const linen = K.weaveTex().clone();
  linen.repeat.set(CARD.w / 0.36, CARD.h / 0.36); linen.needsUpdate = true;
  const cardGeo = (() => {
    const w = CARD.w, h = CARD.h, r = 0.32, s = new THREE.Shape();
    s.moveTo(-w / 2 + r, -h / 2); s.lineTo(w / 2 - r, -h / 2); s.quadraticCurveTo(w / 2, -h / 2, w / 2, -h / 2 + r);
    s.lineTo(w / 2, h / 2 - r); s.quadraticCurveTo(w / 2, h / 2, w / 2 - r, h / 2); s.lineTo(-w / 2 + r, h / 2);
    s.quadraticCurveTo(-w / 2, h / 2, -w / 2, h / 2 - r); s.lineTo(-w / 2, -h / 2 + r); s.quadraticCurveTo(-w / 2, -h / 2, -w / 2 + r, -h / 2);
    const g = new THREE.ShapeGeometry(s, 6);
    const p = g.attributes.position, uv = g.attributes.uv;
    for (let i = 0; i < p.count; i++) uv.setXY(i, (p.getX(i) + w / 2) / w, (p.getY(i) + h / 2) / h);
    return g;
  })();
  // (satin stock: one broad soft sheen, its specular held down so the ink
  // stays ink under the lamp rather than greying over)
  const stock = map => new THREE.MeshPhysicalMaterial({ map, roughness: 0.6, specularIntensity: 0.35, sheen: 0.08, sheenRoughness: 0.6, sheenColor: new THREE.Color(0xfff6e6), normalMap: linen, normalScale: new THREE.Vector2(0.12, 0.12), envMapIntensity: 0.3, transparent: tier === 'vault' });
  const backMat = stock(backTex);
  const dealt = [];
  const makeCard = c => {
    const cv = document.createElement('canvas'); cv.width = 512; cv.height = Math.round(512 * CARD.h / CARD.w);
    paintFace(cv.getContext('2d'), cv.width, cv.height, c, K.PIPS);
    const t = new THREE.CanvasTexture(cv); t.colorSpace = THREE.SRGBColorSpace; t.anisotropy = 8;
    const g = new THREE.Group();
    const front = new THREE.Mesh(cardGeo, stock(t)); front.position.z = 0.012;
    const back = new THREE.Mesh(cardGeo, backMat); back.rotation.y = Math.PI; back.position.z = -0.012;
    [front, back].forEach(m => { m.castShadow = true; m.receiveShadow = true; g.add(m); });
    g.visible = false;
    seat.add(g);
    // (the dark line where it meets the cloth, and the soft spread round it:
    // the shadow map alone leaves a card floating; laid on the felt under
    // it, turned with it and fading as it lifts)
    const sh = K.contactShadow(CARD.w, CARD.h, 0.3, 0.7, [], 0.75);
    sh.position.y = 0.012; sh.material.polygonOffset = false;
    const wrap = new THREE.Group(); wrap.add(sh); wrap.visible = false; seat.add(wrap);
    g.userData.contact = wrap;
    return g;
  };

  // ---- Poses: a hand's (fingertips at p, fingers along z, the back of the
  // hand up y - see handPose) and a card's, in the seat's frame.
  const pose = (p, q) => ({ p: p.clone(), q: q.clone() });
  const _q1 = new THREE.Quaternion(), _q2 = new THREE.Quaternion(), _q3 = new THREE.Quaternion();
  // A card in the hand, pinched at the fingertips by one end and lying on
  // from them along the fingers; k, 0 to 1, turns the grip round to the
  // corner of its long edge, the hand across the card (see table.mjs).
  const inHand = (k = 0) => {
    const th = clamp01(k) * Math.PI / 2;
    const q = new THREE.Quaternion().setFromAxisAngle(V(1, 0, 0), Math.PI / 2).multiply(_q3.setFromAxisAngle(V(0, 0, 1), th));
    const p = V(-Math.sin(th) * (CARD.w / 2 - 1.6), -CARD.h / 2 + 1.6 + 0.6 * Math.sin(th), 0).applyQuaternion(q).negate();
    p.y += -0.95;
    return { p, q };
  };
  const handFor = (c, k = 0) => { const s0 = inHand(k); const q = c.q.clone().multiply(s0.q.clone().invert()); return { p: c.p.clone().sub(s0.p.clone().applyQuaternion(q)), q }; };
  const cardIn = (h, out, k = 0) => { const s0 = inHand(k); out.q.copy(h.q).multiply(s0.q); out.p.copy(s0.p).applyQuaternion(h.q).add(h.p); return out; };
  // (the shoe arm draws a card by its top end, the other takes it by its
  // bottom end: in the shoe arm's hand it rides turned end for end)
  const ENDWISE = new THREE.Quaternion().setFromAxisAngle(V(0, 0, 1), Math.PI);
  const cardInShoeHand = (h, out) => { cardIn(h, out); out.q.multiply(ENDWISE); return out; };
  const inShoe = shoeMouth.clone().addScaledVector(mouthDir, -4);
  const pulled = shoeMouth.clone().addScaledVector(mouthDir, 1.6);
  const shoePose = at => ({ p: at.clone(), q: lying(new THREE.Quaternion(), { yaw: yawShoe, flip: Math.PI }) });
  // A dealer's card turned over its near edge onto its place (a, 0 face
  // down a length beyond it, toward the machine, to pi face up on it).
  const TOP = V(0, 0, 1), AXIS = V(-1, 0, 0);
  const turned = (slot, a, out, y = 0.02) => {
    const pt = slot.clone().addScaledVector(TOP, CARD.h / 2);
    const R = _q1.setFromAxisAngle(AXIS, a);
    out.p.copy(pt).add(V(0, 0, 0).copy(TOP).multiplyScalar(CARD.h / 2).applyQuaternion(R));
    out.p.y += y;
    lying(out.q, { yaw: Math.PI, flip: Math.PI }).premultiply(R);
    return out;
  };
  const faceDown = slot => turned(slot, 0, { p: V(0, 0, 0), q: new THREE.Quaternion() });
  // The toss across, hand to hand (the card table's: see TOSS there).
  const tossQ = cardInShoeHand(handPose(V(0, 0, 0), V(1, 0, 0), up), pose(V(0, 0, 0), new THREE.Quaternion())).q;
  const TOSS_FROM = V(-6.4, 7.9, 45.0), TOSS_TO = V(5.8, 8.8, 44.2);
  const FLIGHT = (() => {
    const T = TOSS.T, acc = V(0, -TOSS.g, 8 * TOSS.bow / (T * T));
    const v0 = TOSS_TO.clone().sub(TOSS_FROM).addScaledVector(acc, -0.5 * T * T).multiplyScalar(1 / T);
    return { p0: TOSS_FROM.clone(), q0: tossQ.clone(), v0, acc, T, spin: TOSS.spin, v1: v0.clone().addScaledVector(acc, T) };
  })();
  const RELEASE = handFor(pose(TOSS_FROM, tossQ.clone().multiply(ENDWISE)));
  const along3 = (p, v, d) => p.clone().addScaledVector(v.clone().normalize(), d);
  const WINDUP = pose(along3(RELEASE.p, FLIGHT.v0, -0.5 * FLIGHT.v0.length() * DEAL.flick), RELEASE.q);
  const FOLLOW = pose(along3(RELEASE.p, FLIGHT.v0, 0.5 * FLIGHT.v0.length() * DEAL.follow), RELEASE.q);
  const CATCH = handFor(pose(TOSS_TO, tossQ));
  const GIVEN = pose(along3(CATCH.p, FLIGHT.v1, 1.0), CATCH.q);
  const flightAt = (F, tt, out) => {
    const s = tt - F.t0, u = clamp01(s / F.T);
    out.p.copy(F.p0).addScaledVector(F.v0, s).addScaledVector(F.acc, 0.5 * s * s);
    out.q.setFromAxisAngle(up, F.spin * u).multiply(F.q0);
    out.q.premultiply(_q2.setFromAxisAngle(V(1, 0, 0), -0.08 * Math.sin(Math.PI * u)));
    return out;
  };
  // A pitch: a card flicked low along the felt from a hand to its place.
  // It flies, the spin holding it up a little, touches down short of its
  // place and slides the rest, the felt taking its speed, the spin dying
  // with it; it stops square on its place (one turn more than it needs).
  // Let go no lower than y0: a hand turned palm up has the card above its
  // fingers, and its back must clear the cloth - so it is flicked a little
  // downward onto the felt rather than held lower.
  const pitchOf = (from, to, y0min) => {
    const dirH = V(to.p.x - from.p.x, 0, to.p.z - from.p.z), D = dirH.length();
    dirH.multiplyScalar(1 / D);
    const Ds = THREE.MathUtils.clamp(D * 0.32, 3, 8), vh = 90 + 2.6 * D, Tf = (D - Ds) / vh, g = 820, lift = 14;
    const pT = to.p.clone().addScaledVector(dirH, -Ds);
    let y0 = pT.y + 0.5 * g * Tf * Tf - lift * Tf, vy0 = lift;
    if (y0 < y0min) { y0 = y0min; vy0 = (pT.y - y0 + 0.5 * g * Tf * Tf) / Tf; }
    const p0 = V(from.p.x, y0, from.p.z);
    const vs0 = vh * 0.62, dec = vs0 * vs0 / (2 * Ds), Ts = vs0 / dec;
    const qRel = to.q.clone().multiply(from.q.clone().invert());
    const psi = ((2 * Math.atan2(qRel.y, qRel.w)) % TAU + TAU) % TAU;
    const theta = psi + TAU;
    const qEnd = new THREE.Quaternion().setFromAxisAngle(up, theta).multiply(from.q);
    const fix = to.q.clone().multiply(qEnd.invert());
    return { p0, q0: from.q.clone(), y0, dirH, vh, vy0, g, Tf, pT, vs0, dec, Ts, theta, fix, v0: V(dirH.x * vh, vy0, dirH.z * vh), T: Tf + Ts };
  };
  const _pq = new THREE.Quaternion(), _pid = new THREE.Quaternion();
  const pitchAt = (P, tt, out) => {
    const s = tt - P.t0;
    if (s < P.Tf) { out.p.copy(P.p0).addScaledVector(P.dirH, P.vh * s); out.p.y = P.p0.y + P.vy0 * s - 0.5 * P.g * s * s; }
    else { const k = Math.min(s - P.Tf, P.Ts); out.p.copy(P.pT).addScaledVector(P.dirH, P.vs0 * k - 0.5 * P.dec * k * k); }
    const u = clamp01(s / P.T);
    out.q.setFromAxisAngle(up, P.theta * (1 - Math.pow(1 - u, 1.7))).multiply(P.q0);
    out.q.premultiply(_pq.copy(_pid).slerp(P.fix, smoother(u)));
    return out;
  };
  // Where the hands wait: the shoe arm's laid on the shoe's lid, fingers
  // down the slope to the mouth; the other poised on its fingertips on the
  // felt beside the dealer's cards, the wrist up, like a pianist's over the
  // keys, clear of everything it will lay.
  const toSeat = (obj, p) => p.clone().applyEuler(obj.rotation).add(obj.position);
  const REST = [(() => {
    const [la, lb] = shoe.userData.lid.map(p => toSeat(shoe, p));
    const d = lb.clone().sub(la).normalize(), side = d.clone().cross(up).normalize(), n = side.clone().cross(d).normalize();
    return handPose(la.clone().addScaledVector(d, 1.6).addScaledVector(n, 0.55), d.clone().negate(), n);
  })(), handPose(V(16, 0.62, 49), V(-0.42, -0.74, -0.52), up)];

  // ---- The deal: the cards, in the order a shoe game deals them.
  const slot = xz => V(xz[0], 0, xz[1]);
  const cards = [];
  const addCard = (c, who, i) => {
    const o = Object.assign({}, c, { who, i, obj: makeCard(c), pull: Infinity, toss: null, hand: Infinity, lay: Infinity, carry: null, pitch: null, turn: Infinity });
    if (who === 'you') { o.slot = slot(SPOT.you[i]); o.grip = 0; o.restY = 0.02 + 0.03 * i; }
    else { o.slot = slot(SPOT.dealer[i]); o.grip = 1; o.restY = 0.02; }
    cards.push(o);
    return o;
  };
  const order = [addCard(hand.you[0], 'you', 0), addCard(hand.dealer[0], 'dealer', 0), addCard(hand.you[1], 'you', 1), addCard(hand.dealer[1], 'dealer', 1)];
  const third = hand.dealer[2] ? addCard(hand.dealer[2], 'dealer', 2) : null;
  const holeCard = order[3];

  // The machine's moves: each arm's plan, as the card table's deal makes
  // its own (see table.mjs, makeDeal) - moves on quintic paths, stopping
  // dead where they place something, flowing on through a via point.
  const dealAt = 2.15;
  const shouldersUp = [V(0, 0, 0), V(0, 0, 0)];
  const reachUp = ARM.upper + ARM.fore - 0.1;
  const upright = (k, y, fold = 0) => {
    const sd = SIDES[k], S = torso.shouldersAt(y, 0, fold, shouldersUp)[k];
    const wx = PORT.x + sd * 1.5, dx = wx - S.x;
    const wy = S.y + ARM.crank + Math.sqrt(Math.max(0, reachUp * reachUp - dx * dx));
    return Object.assign(handPose(V(PORT.x + sd * 0.9, wy - WRIST.z, PORT.z), V(0, 1, 0), V(sd, 0, 0)), { upright: k });
  };
  const addMove = (P, b, dur, { lift = 0, settle = false, via = false, to = P.fin, lean = P.att, dip = [0, 0], elbow = P.el, wrist = false, stiff = false, v0 = null, v1 = null } = {}) => { P.segs.push({ kind: 'move', t0: P.t, t1: P.t + dur, a: P.at, b, lift, settle, via, f0: P.fin, f1: to, att0: P.att, att1: lean, dip, el0: P.el, el1: elbow, pivot: wrist, stiff, v0: v0 ? v0.clone() : V(0, 0, 0), v1: v1 ? v1.clone() : V(0, 0, 0), s0: 0, s1: 0 }); P.t += dur; P.at = b; P.fin = to; P.att = lean; P.el = elbow; };
  const hold = (P, dur) => addMove(P, P.at, dur);
  const until = (P, t) => { if (t > P.t + 1e-4) hold(P, t - P.t); };
  const bank = (a, b, k = 0.012) => { const d = b.p.clone().sub(a.p).applyQuaternion(a.q.clone().invert()); return THREE.MathUtils.clamp(-d.x * k, -0.3, 0.3); };
  const arm = k => ({ segs: [], t: dealAt - RISE.swing, at: upright(k, ARM.up), fin: FIN.rest, att: [0, 0], el: 0 });
  const A = arm(0), B = arm(1);
  // The drop slot: the machine gathers every card in to itself at the end -
  // its own lifted by their long edges, carried to the slot's near lip and
  // let go, and yours drawn across the cloth to it by the table - each goes
  // in short edge first, tipping over the lip (m: the card's middle along
  // its way from the lip, th: how far its leading end has gone down).
  const SWP = { x: SLOT.x, z0: SLOT.z - SLOT.d / 2, slide: 0.8, y: 0.12, m0: -CARD.h / 2 + 0.9, th0: 0.15, th1: 1.35, drop: 0.34, gap: 0.46 };
  const swPose = (m, th, qr) => {
    const lead = V(0, -Math.sin(th), Math.cos(th));
    return pose(V(SWP.x, SWP.y, SWP.z0).addScaledVector(lead, m), _q2.setFromAxisAngle(V(1, 0, 0), th).multiply(qr));
  };
  const restOf = c => turned(c.slot, c.turn < Infinity ? Math.PI : 0, { p: V(0, 0, 0), q: new THREE.Quaternion() }, c.restY);
  // The wash: the machine lays its hand flat across its own cards and works
  // them together in a slow circle, as dominoes are washed on a table, till
  // they lie in one pile; then it pushes the pile to the slot's lip and
  // lifts away, and the cards go in one after another, a beat apart. (r: the
  // circle's radius, cm; the cards follow a part of it.)
  const WASH = { r: 1.5, turns: 1.25, steps: 9, step: 0.1, push: 0.38, follow: 0.7, stack: 0.045, between: 0.09, press: -1.1, mid: 5.6, dz: 1.8, lag: 0.16 };
  const washOff = (u, out) => {
    const a = u * TAU * WASH.turns - 1.2, r = WASH.r * Math.sqrt(Math.sin(Math.PI * clamp01(u)));
    return out.set(r * Math.cos(a), 0, r * Math.sin(a));
  };
  const _wo = V(0, 0, 0);
  const washPlan = mine => {
    const cx = mine.reduce((t, c) => t + c.slot.x, 0) / mine.length, cz = SPOT.dealer[0][1];
    const rq = restOf(mine[0]).q;
    // (the hand centred on x, z: handFor puts a card's end at the fingertips,
    // so the hand is slid back along itself to lie over the cards)
    const mid = handFor(pose(V(0, 0.3, 0), rq), 1), back = V(0, 0, -WASH.mid).applyQuaternion(mid.q);
    const hov = (x, z, y = 0) => { const h = handFor(pose(V(x, 0.3 + y, z), rq), 1); h.p.x -= back.x; h.p.z -= back.z - WASH.dz; h.p.y -= WASH.press; return h; };
    const E = swPose(SWP.m0, SWP.th0, rq);
    addMove(B, hov(cx, cz, 3.2), 0.5, { lift: 2, to: FIN.reach, lean: [0, 0], dip: [-0.1, 0] });
    addMove(B, hov(cx, cz), 0.16, { settle: true, to: FIN.easy, lean: [0, 0] });
    const tg = B.t;
    for (let i = 1; i <= WASH.steps; i++) {
      const o = washOff(i / WASH.steps, _wo);
      addMove(B, hov(cx + o.x, cz + o.z), WASH.step, { via: i < WASH.steps, settle: i === WASH.steps, to: FIN.easy, lean: [0, 0] });
    }
    const tw = B.t;
    addMove(B, hov(E.p.x, E.p.z), WASH.push, { settle: true, to: FIN.easy, lean: [0, 0] });
    const tp = B.t;
    mine.forEach((c, j) => {
      const rest = restOf(c);
      c.sw = { pile: true, grab: tg, wash: tw, push: tp, rel: tp + WASH.lag + WASH.between * j, qr: rest.q.clone(), p0: rest.p.clone(), cx, cz, ox: (j - (mine.length - 1) / 2) * 0.35, oz: 0.25 * Math.sin(j * 2.3), py: 0.02 + WASH.stack * j, dy: WASH.stack * j, wob: (j % 2 ? -1 : 1) * (0.3 + 0.08 * j), fin: 0.05 * Math.sin(j * 3.1 + 1) };
    });
    // (and the hand lifts clear, open, as the first card tips over the lip)
    addMove(B, pose(hov(E.p.x, E.p.z).p.clone().add(V(2.6, 4.6, 0.6)), hov(0, 0).q), 0.24, { to: FIN.open, lean: [0, 0] });
  };
  const grabAt =() => handFor(shoePose(inShoe)), outAt = () => handFor(shoePose(pulled));
  // (the shoe arm draws: down into the shoe, level at the grab; out by its
  // end, lifting it a little, on through)
  const drawOut = (c, first) => {
    const g0 = grabAt();
    addMove(A, g0, first ? DEAL.first : DEAL.grab, { lift: first ? 3 : 4.5, to: FIN.reach, lean: [0, 0], dip: [0.3, bank(A.at, g0)] });
    c.pull = A.t;
    addMove(A, outAt(), DEAL.pull, { via: true, to: FIN.grip, lean: [-0.06, 0] });
  };
  // ... flicks it across; the other hand, open where it arrives, closes on
  // it and gives with it
  const flick = (c, first) => {
    // (a long wait for the other hand is spent ready over the shoe's mouth,
    // not holding a card wound back: the draw is timed to end in the flick)
    const lead = (first ? DEAL.first : DEAL.grab) + DEAL.pull + DEAL.windup + DEAL.beat + DEAL.flick;
    const early = B.t + 0.06 - TOSS.T - lead - A.t;
    if (!first && early > 0.45) {
      const g0 = grabAt(), ready = pose(g0.p.clone().add(V(0, 3.2, 1.2)), g0.q);
      addMove(A, ready, 0.42, { lift: 2, to: FIN.relax, lean: [0, 0] });
      until(A, B.t + 0.06 - TOSS.T - lead);
    }
    drawOut(c, first);
    addMove(A, WINDUP, DEAL.windup, { lift: 1.2, to: FIN.grip, lean: [0, 0], dip: [-0.1, bank(A.at, WINDUP)] });
    const tr = Math.max(A.t + DEAL.beat + DEAL.flick, B.t + 0.06 - TOSS.T);
    until(A, tr - DEAL.flick);
    addMove(A, RELEASE, DEAL.flick, { to: FIN.grip, stiff: true, v1: FLIGHT.v0 });
    addMove(A, FOLLOW, DEAL.follow, { to: FIN.open, stiff: true, v0: FLIGHT.v0, dip: [0.14, 0] });
    const tc = tr + TOSS.T;
    c.toss = Object.assign({}, FLIGHT, { t0: tr, t1: tc });
    until(B, tc);
    addMove(B, GIVEN, DEAL.give, { settle: true, to: FIN.grip, stiff: true, v0: FLIGHT.v1.clone().multiplyScalar(0.3) });
    c.hand = tc;
    return tc;
  };
  const toCatch = (dur = DEAL.back) => addMove(B, CATCH, dur, { lift: 2.4, to: FIN.reach, lean: [0, 0], dip: [0.1, 0] });
  // (lays a dealer's card face down a length beyond its place, held by its
  // long edge by the time it is down - the grip turning over the carry)
  const lay = (c, dur = DEAL.carry) => {
    const b = handFor(faceDown(c.slot), c.grip);
    const t0 = B.t;
    addMove(B, b, dur, { lift: 3.4, settle: true, to: FIN.grip, lean: [0, 0], dip: [-0.16, bank(B.at, b, 0.018)] });
    c.carry = [t0, B.t]; c.lay = B.t;
  };
  const letGo = (dur = 0.1) => addMove(B, B.at, dur, { to: FIN.open });
  // (and turns it over: the fingertips up under its far end, pushing it to
  // PUSH; on over by itself)
  const pushOver = c => {
    c.turn = B.t;
    B.segs.push({ kind: 'push', t0: B.t, t1: B.t + DEAL.push, card: c, f0: B.fin, f1: FIN.flick, el0: B.el, el1: B.el });
    B.t += DEAL.push; B.fin = FIN.flick; B.att = [0, 0];
    B.at = handFor(turned(c.slot, PUSH, { p: V(0, 0, 0), q: new THREE.Quaternion() }), c.grip);
  };
  // (pitches your card to you face up: carried from the catch, turned palm
  // up as it goes, wound back against the throw, flicked; the follow-
  // through a servo's hard stop)
  const toYou = c => {
    const to = { p: c.slot.clone().setY(c.restY), q: lying(new THREE.Quaternion(), {}) };
    // (let go from beside the machine, in front of its body, the wrist
    // clear of the lift - aimed at the place)
    const from = V(c.i ? 5.6 : 3.4, 0, c.i ? 38.6 : 37.4);
    const dirH = V(to.p.x - from.x, 0, to.p.z - from.z).normalize();
    // (the hand palm up, fingers along the throw: the card above them, its
    // middle a card's half-length on from the fingertips)
    const hq = handPose(V(0, 0, 0), dirH, up.clone().negate()).q;
    const held = cardIn({ p: V(0, 0, 0), q: hq }, { p: V(0, 0, 0), q: new THREE.Quaternion() });
    const tip = from.clone().sub(held.p.clone().setY(0));
    const P = pitchOf({ p: from.clone(), q: held.q }, to, 3.4);
    const rel = { p: V(tip.x, P.y0 - held.p.y, tip.z), q: hq };
    const sp = P.v0.length(), dir = P.v0.clone().normalize();
    const wind = Math.min(3.6, 0.5 * sp * DEAL.flick), fol = Math.min(3, 0.5 * sp * DEAL.follow);
    addMove(B, pose(rel.p.clone().addScaledVector(dir, -wind), rel.q), DEAL.carry + 0.06, { lift: 1.8, to: FIN.grip, lean: [0, 0], wrist: true, dip: [-0.1, 0] });
    hold(B, DEAL.beat * 0.6);
    addMove(B, rel, 2 * wind / sp, { to: FIN.grip, stiff: true, v1: P.v0 });
    c.pitch = Object.assign(P, { t0: B.t });
    c.lay = B.t + P.T; c.landAt = B.t + P.Tf;
    addMove(B, pose(rel.p.clone().addScaledVector(dir, fol), rel.q), Math.max(0.05, 2 * fol / sp), { to: FIN.open, stiff: true, v0: P.v0, settle: true });
  };
  // the deal: the catching hand swings out open to where the first will
  // arrive; then each card
  addMove(B, CATCH, DEAL.first + 0.15, { lift: 2, to: FIN.reach, lean: [0, 0], dip: [-0.1, 0] });
  order.forEach((c, k) => {
    flick(c, k === 0);
    if (c.who === 'you') toYou(c);
    else {
      lay(c);
      if (c !== holeCard) { hold(B, DEAL.settle); pushOver(c); }
      else letGo(0.08);
    }
    if (k < order.length - 1) toCatch();
  });
  // (the shoe arm to rest on the lid once its last card is away)
  addMove(A, REST[0], DEAL.rest, { lift: 3, to: FIN.easy, lean: [0, 0], dip: [-0.15, 0], elbow: 1, wrist: true });
  // You stand. The machine's play: the hole card turned, and a card drawn
  // if it must; or nothing (your blackjack is paid at once).
  let decide = null;                       // the card that decides it
  if (hand.play === 'none') {
    decide = order[2];
    addMove(B, REST[1], DEAL.rest, { lift: 2.4, to: FIN.poise, lean: [0, 0], dip: [-0.15, 0], elbow: 1 });
  } else {
    // (a beat over the cards, poised, as a dealer waits on the player)
    addMove(B, REST[1], 0.42, { lift: 2.4, to: FIN.poise, lean: [0, 0], dip: [-0.12, 0], elbow: 0.6 });
    hold(B, 0.22);
    const g0 = handFor(faceDown(holeCard.slot), holeCard.grip);
    addMove(B, g0, 0.34, { lift: 3, settle: true, to: FIN.grip, lean: [0, 0], dip: [-0.12, bank(B.at, g0, 0.015)], elbow: 0 });
    hold(B, DEAL.settle);
    pushOver(holeCard);
    decide = holeCard;
    addMove(B, pose(B.at.p.clone().add(V(1.5, 2.6, 2.4)), B.at.q), 0.24, { to: FIN.open, lean: [0, 0] });
    if (hand.play === 'bust') {
      toCatch(DEAL.back + 0.08);
      flick(third, false);
      lay(third);
      hold(B, DEAL.settle);
      pushOver(third);
      decide = third;
      addMove(B, pose(B.at.p.clone().add(V(1.5, 2.6, 2.4)), B.at.q), 0.24, { to: FIN.open, lean: [0, 0] });
    }
    addMove(B, REST[1], DEAL.rest, { lift: 2, to: FIN.poise, lean: [0, 0], dip: [-0.15, 0], elbow: 1 });
  }
  // (through each via point at the mean of the speeds either side of it,
  // still along an axis where the way turns back - see table.mjs)
  [A, B].forEach(P => {
    const segs = P.segs;
    for (let i = 0; i + 1 < segs.length; i++) {
      const S0 = segs[i], S1 = segs[i + 1];
      if (!S0.via || S0.kind !== 'move' || S1.kind !== 'move') continue;
      const dA = S0.t1 - S0.t0, dB = S1.t1 - S1.t0;
      const vA = S0.b.p.clone().sub(S0.a.p).multiplyScalar(1 / dA), vB = S1.b.p.clone().sub(S1.a.p).multiplyScalar(1 / dB);
      S0.v1 = V(0, 0, 0);
      ['x', 'y', 'z'].forEach(ax => { S0.v1[ax] = vA[ax] * vB[ax] > 0 ? (vA[ax] * dB + vB[ax] * dA) / (dA + dB) : 0; });
      S1.v0 = S0.v1.clone();
      S0.s1 = S1.s0 = 1;
    }
  });

  // A turning card's angle: pushed up to PUSH, then over on its own, a
  // little faster as it falls.
  const angleAt = (c, tt) => {
    if (tt < c.turn) return 0;
    if (tt < c.turn + DEAL.push) return PUSH * smoother((tt - c.turn) / DEAL.push);
    const u = tt - c.turn - DEAL.push;
    return PUSH + (Math.PI - PUSH) * Math.pow(clamp01(u / DEAL.fall), 1.7);
  };
  const turnEnd = c => c.turn + DEAL.push + DEAL.fall;

  // ---- The plan's moments.
  const decided = decide.pitch ? decide.landAt : turnEnd(decide);
  // the slow moment: the card that decides it - its flight and slide, or
  // its turn
  // (a card turned over is slowed as it comes down face up - the face is
  // away from the lens until it is two-thirds over)
  const slowW = decide.pitch ? decide.pitch.t0 + 0.04 : decide.turn + 0.17;
  const warp = makeWarp(slowW);
  const youT = total(hand.you), dealerT = total(hand.dealer);
  const plan = { tier, seed, warp, wallW: slowW, values: [youT, dealerT], cards: { you: hand.you.map(c => c.rank + c.suit), dealer: hand.dealer.map(c => c.rank + c.suit) }, call: hand.call, throwOk: true, why: [] };
  const restW = decide.pitch ? decide.lay + 0.05 : decided + 0.25;
  plan.restW = restW;
  plan.callW = restW + 0.15;
  if (tier === 'vault') {
    plan.boom = restW + 0.55;
    plan.revealW = plan.boom + 2.4;
    plan.endW = plan.boom + 3.8;
  } else {
    plan.revealW = restW + 1.6;
    plan.endW = plan.revealW + 1.1;
  }
  // (the deal goes on under a blackjack's call - the hole card is laid -
  // so the shot runs on until the machine is at rest)
  // (the cards are gathered into the drop slot after a beat to read the
  // call: the machine's own by its hand, one after another, and yours,
  // which it cannot reach, drawn across the cloth to it by the table, each
  // as the slot is clear of the one before)
  plan.sweep = null;
  plan.slot = null;
  if (tier !== 'vault') {
    until(B, restW + 1.1);
    plan.sweep = [B.t, 0];
    const mine = cards.filter(c => c.who === 'dealer').sort((a, b) => b.slot.x - a.slot.x);
    washPlan(mine);
    addMove(B, REST[1], DEAL.rest, { lift: 2.4, to: FIN.poise, lean: [0, 0], dip: [-0.15, 0], elbow: 1 });
    const tp = mine[0].sw.push;
    let prev = Math.max(...mine.map(c => c.sw.rel)), k = 0;
    cards.filter(c => c.who === 'you').sort((a, b) => b.i - a.i).forEach(c => {
      // (yours, which it cannot reach, are drawn across the cloth by the
      // table as it lifts clear, to follow the others in)
      const rel = Math.max(prev + 0.12, tp + SWP.slide);
      c.sw = { auto: true, grab: rel - SWP.slide, rel, qr: lying(new THREE.Quaternion(), {}), p0: c.slot.clone().setY(c.restY), dy: WASH.stack * (mine.length + k) };
      prev = rel; k++;
    });
    const rels = cards.filter(c => c.sw).map(c => c.sw.rel);
    plan.slot = { wake: plan.sweep[0] - 0.7, open: Math.min(...rels) - 0.55, close: Math.max(...rels) + SWP.drop + 0.08 };
    until(B, plan.slot.close + 0.7);
    plan.sweep[1] = B.t;
  }
  const lastMove = Math.max(A.t, B.t);
  plan.endW = Math.max(plan.endW, lastMove + 0.6);
  // (then the machine folds in and sinks back through its port, the lid
  // shut over it, so the page's title and button stand over felt and the
  // two hands of cards and nothing else)
  // (the page's end card comes in with the reveal, so the reveal waits for
  // the machine to be gone)
  const dEnd = plan.endW - plan.revealW;
  plan.sinkW = Math.max(lastMove, plan.revealW - 0.5);
  plan.revealW = plan.sinkW + SINK.lag + SINK.down + 0.1;
  plan.endW = plan.revealW + Math.max(dEnd, 1.1);
  plan.revealReal = warp.real(plan.revealW);
  plan.totalReal = warp.real(plan.endW);
  plan.restReal = warp.real(restW);
  plan.wallReal = warp.real(slowW);
  const Rw = w => warp.real(w);

  // ---- The machine, evaluated at a world time from the plan (the card
  // table's evaluation: see table.mjs, poseHand).
  const segAt = (S, tt) => {
    if (!S.length || tt < S[0].t0) return null;
    let lo = 0, hi = S.length - 1;
    while (lo < hi) { const m = (lo + hi + 1) >> 1; if (S[m].t0 <= tt) lo = m; else hi = m - 1; }
    return S[lo];
  };
  const jitter = (t, ch) => { const v = Math.sin(t * 127.1 + ch * 311.7) * 43758.5453; return v - Math.floor(v); };
  const _attQ = new THREE.Quaternion(), _attE = new THREE.Euler();
  const along = (sg, k) => {
    const k3 = k * k * k, k4 = k3 * k, k5 = k4 * k, dt = sg.t1 - sg.t0;
    const h0 = 1 - 10 * k3 + 15 * k4 - 6 * k5, h1 = k - 6 * k3 + 8 * k4 - 3 * k5, h2 = -4 * k3 + 7 * k4 - 3 * k5, h3 = 10 * k3 - 15 * k4 + 6 * k5;
    const p = sg.a.p.clone().multiplyScalar(h0).addScaledVector(sg.v0, h1 * dt).addScaledVector(sg.v1, h2 * dt).addScaledVector(sg.b.p, h3);
    p.y += sg.lift * Math.pow(Math.sin(Math.PI * k), 2);
    // (a servo's give leaving a stop on a long move: a few millimetres back
    // the other way, level, a little more or less each time)
    if (!sg.s0 && !sg.pivot && !sg.stiff && sg.v0.lengthSq() < 1e-6 && k < 0.22) {
      const dx = sg.b.p.x - sg.a.p.x, dz = sg.b.p.z - sg.a.p.z, Lh = Math.hypot(dx, dz);
      if (Lh > 5) { const w = Math.pow(Math.sin(Math.PI * k / 0.22), 4) * Math.min(0.26, 0.018 * Lh) * (0.7 + 0.6 * jitter(sg.t0, 1)); p.x -= dx / Lh * w; p.z -= dz / Lh * w; }
    }
    const q = sg.a.q.clone().slerp(sg.b.q, clamp01(h1 * sg.s0 + h2 * sg.s1 + h3));
    const e = smoother(k), bump = Math.pow(Math.sin(Math.PI * k), 2);
    const pitch = lerp(sg.att0[0], sg.att1[0], e) + sg.dip[0] * bump, roll = lerp(sg.att0[1], sg.att1[1], e) + sg.dip[1] * bump;
    if (pitch || roll) q.multiply(_attQ.setFromEuler(_attE.set(pitch, 0, roll)));
    if (sg.pivot) {
      const at = (pp, qq, att) => { const qt = qq.clone(); if (att[0] || att[1]) qt.multiply(_attQ.setFromEuler(_attE.set(att[0], 0, att[1]))); return WRIST.clone().applyQuaternion(qt).add(pp); };
      const w = at(sg.a.p, sg.a.q, sg.att0).multiplyScalar(h0).addScaledVector(at(sg.b.p, sg.b.q, sg.att1), h3);
      w.y += sg.lift * bump;
      p.copy(w).sub(WRIST.clone().applyQuaternion(q));
    }
    return { p, q };
  };
  const fingersAt = (sg, k) => { const e = smoother(clamp01(k * 2.4)); return [lerp(sg.f0[0], sg.f1[0], e), lerp(sg.f0[1], sg.f1[1], e)]; };
  const plans = [A.segs, B.segs];
  const fingersNow = (k, tt) => {
    const S = plans[k];
    if (!S.length || tt < S[0].t0) return FIN.rest;
    const sg = segAt(S, tt);
    return fingersAt(sg, clamp01((tt - sg.t0) / Math.max(1e-4, sg.t1 - sg.t0)));
  };
  // the rise: the port opens; the machine comes up through it, the yoke
  // folded, and drops it open once clear of the felt - past level and
  // back, a servo settling under the weight
  const foldOut = k => { k = clamp01(k); const c1 = 0.9, c3 = c1 + 1; return k < 1 ? 1 + c3 * Math.pow(k - 1, 3) + c1 * Math.pow(k - 1, 2) : 1; };
  const riseEase = k => easeOut(k, 3);
  const riseT0 = dealAt - RISE.up, riseT = RISE.up - RISE.swing;
  const riseClear = (() => { let lo = 0, hi = 1; for (let i = 0; i < 24; i++) { const m = (lo + hi) / 2; if (lerp(ARM.down, ARM.up, riseEase(m)) < FOLD.y) lo = m; else hi = m; } return hi; })();
  const rising = tt => {
    if (tt >= plan.sinkW) {
      const u = tt - plan.sinkW;
      const k = clamp01((u - SINK.lag) / SINK.down);
      return { y: lerp(ARM.up, ARM.down, smoother(k)), open: 1 - clamp01((u - SINK.lag - SINK.down) / 0.32), fold: 1 - smoother(clamp01(u / SINK.fold)) };
    }
    if (tt < dealAt - RISE.open) return { y: ARM.down, open: 0, fold: 0 };
    const open = clamp01((tt - (dealAt - RISE.open)) / 0.32);
    const fold = foldOut((tt - (riseT0 + riseClear * riseT)) / FOLD.out);
    return { y: lerp(ARM.down, ARM.up, riseEase((tt - riseT0) / riseT)), open, fold };
  };
  const scratch = { p: V(0, 0, 0), q: new THREE.Quaternion() };
  const planned = (k, tt, y, fold = 1) => {
    const S = plans[k];
    if (!S.length || tt < S[0].t0) return { hp: upright(k, y, fold), f: FIN.rest, free: false, el: 0, fade: 0 };
    const sg = segAt(S, tt);
    const kk = clamp01((tt - sg.t0) / Math.max(1e-4, sg.t1 - sg.t0));
    let hp, free = false;
    if (sg.kind === 'push') {
      const c = sg.card;
      hp = handFor(turned(c.slot, Math.min(angleAt(c, tt), PUSH), { p: V(0, 0, 0), q: new THREE.Quaternion() }), c.grip);
      hp.q.multiply(_attQ.setFromEuler(_attE.set(-0.62 * Math.min(angleAt(c, tt), PUSH) / PUSH * (1 - c.grip), 0, 0)));
    } else { hp = along(sg.a.upright != null ? Object.assign({}, sg, { a: upright(k, y, fold) }) : sg, kk); free = true; }
    const prev = segAt(S, tt - 0.13);
    if (prev && prev !== sg && prev.settle && tt - prev.t1 < 0.13 && tt >= prev.t1) {
      const dir = prev.b.p.clone().sub(prev.a.p); const L0 = dir.length();
      if (L0 > 0.5) { const b = tt - prev.t1, j = jitter(prev.t1, 2), j2 = jitter(prev.t1, 3); hp.p.addScaledVector(dir.multiplyScalar(1 / L0), (0.11 + 0.09 * j) * Math.sin(b * (60 + 20 * j2)) * Math.exp(-b * (28 + 8 * j))); }
    }
    let fade = free && !sg.stiff ? (sg.s0 ? 1 : smoother(kk / 0.15)) * (sg.s1 ? 1 : smoother((1 - kk) / 0.15)) : 0;
    let f = fingersAt(sg, kk), el = lerp(sg.el0, sg.el1, smoother(kk));
    if (tt > plan.sinkW) {
      // (the hand comes back up to the yoke's own pose as it folds, and goes
      // down with it)
      const b = smoother(clamp01((tt - plan.sinkW - 0.4 * k) / 0.5)), up = upright(k, y, fold);
      hp = { p: hp.p.clone().lerp(up.p, b), q: hp.q.clone().slerp(up.q, b) };
      f = [lerp(f[0], FIN.rest[0], b), lerp(f[1], FIN.rest[1], b)];
      el = lerp(el, 0, b); fade = 0; free = false;
    }
    return { hp, f, free, el, fade };
  };
  // what the arms are steered clear of: the lift, the saddle, each half of
  // the yoke and its J1 drum, and (for the second arm) the first one
  const house0 = [3.05, 2.0, 2.0, 2.0, 2.2, 2.2].map(r => ({ a: V(0, 0, 0), b: V(0, 0, 0), r }));
  const houseFor = [house0.filter((c, i) => i !== 4), house0.filter((c, i) => i !== 5)];
  const houseOf = (y, tp) => {
    const { shoulders, side, fwd, pins } = tp;
    house0[0].a.set(PORT.x, ARM.down, PORT.z); house0[0].b.set(PORT.x, y - 1.6, PORT.z);
    house0[1].a.set(PORT.x, y, PORT.z).addScaledVector(side, -ARM.pin); house0[1].b.set(PORT.x, y, PORT.z).addScaledVector(side, ARM.pin);
    [0, 1].forEach(k => {
      house0[2 + k].a.copy(pins[k]); house0[2 + k].b.copy(shoulders[k]);
      house0[4 + k].a.copy(shoulders[k]).addScaledVector(fwd, -2.1); house0[4 + k].b.copy(shoulders[k]).addScaledVector(fwd, 2.1);
    });
    return houseFor;
  };
  const wobble = new THREE.Quaternion(), wobE = new THREE.Euler(), mid = V(0, 0, 0);
  let glow = 0, prevT = -1, reach = 0, reachAt = null;
  const poseRig = tt => {
    const { y, open, fold } = rising(tt);
    const shown = y > ARM.down + 1;
    const hs = arms.map((a, k) => planned(k, tt, y, fold));
    mid.copy(hs[0].hp.p).add(hs[1].hp.p).multiplyScalar(0.5);
    const yaw0 = y < ARM.up - 0.5 && tt < plan.sinkW ? 0 : THREE.MathUtils.clamp(0.3 * Math.atan2(-(mid.x - PORT.x), -(mid.z - PORT.z)), -0.22, 0.22);
    // (going down, the yoke turns a little as it folds)
    const yaw = tt >= plan.sinkW ? lerp(yaw0, -0.2, smoother(clamp01((tt - plan.sinkW) / 0.7))) : yaw0;
    const tp = torso.pose(y, yaw, tt, shown ? 1 : 0, fold);
    const { shoulders, side, fwd } = tp;
    const house = houseOf(y, tp);
    let speed = 0;
    arms.forEach((a, k) => {
      const { hp, f, free, fade } = hs[k];
      // (hung from the wrist, the fingers trail behind a change of speed and
      // bank into a swing - none of it at a stop)
      if (free && fade > 0) {
        const h = 1 / 60, pa = planned(k, tt - h, y, fold).hp.p, pb = planned(k, tt + h, y, fold).hp.p;
        const acc = pa.add(pb).addScaledVector(hp.p, -2).multiplyScalar(1 / (h * h)).applyQuaternion(hp.q.clone().invert());
        wobE.set(THREE.MathUtils.clamp(acc.y * 4e-5, -0.2, 0.2) * fade, THREE.MathUtils.clamp(-acc.x * 4e-5, -0.2, 0.2) * fade, THREE.MathUtils.clamp(-acc.x * 7e-5, -0.24, 0.24) * fade);
        wobble.setFromEuler(wobE);
        const wr = WRIST.clone().applyQuaternion(hp.q).add(hp.p), y0 = hp.p.y;
        hp.q.multiply(wobble);
        hp.p.copy(wr).sub(WRIST.clone().applyQuaternion(hp.q));
        if (y0 < 3 && hp.p.y < y0) hp.p.y = y0;
      }
      a.now.p.copy(hp.p); a.now.q.copy(hp.q);
      a.hand.position.copy(hp.p); a.hand.quaternion.copy(hp.q);
      a.wrist.copy(WRIST).applyQuaternion(hp.q).add(hp.p);
      const r = a.arm.pose(shoulders[k], a.wrist, hp.q, side, fwd, tt, shown ? 1 : 0, elbowWay(hs[k].el, a.side, a.pref, fold), k ? house[1].concat(arms[0].arm.bulk) : house[0]);
      if (k && arms[0].arm.bulk.some(c => a.arm.bulk.some(o => segDist(c.a, c.b, o.a, o.b) < c.r + o.r))) {
        const a0 = arms[0];
        a0.arm.pose(shoulders[0], a0.wrist, a0.now.q, side, fwd, tt, shown ? 1 : 0, elbowWay(hs[0].el, a0.side, a0.pref, fold), house[0].concat(a.arm.bulk));
      }
      if (shown && y >= ARM.up - 0.01 && r > reach) { reach = r; reachAt = { t: +tt.toFixed(3), arm: k, tips: hp.p.toArray().map(v => +v.toFixed(1)) }; }
      a.hand.visible = a.arm.group.visible = shown;
      const per = [0, 1, 2, 3].map(i => {
        const fi = i ? fingersNow(k, tt - i * 0.028) : f;
        const live = shown ? 0.03 * Math.sin(tt * 2.6 + i * 1.3 + k) + 0.015 * Math.sin(tt * 7.1 + i * 2.1 + k * 2) : 0;
        return [fi[0] * (1 + 0.08 * i) + live, fi[1]];
      });
      const ft = fingersNow(k, tt + 0.02);
      a.hand.userData.fingers(per, ft[0], ft[1]);
      a.hand.userData.leds(shown ? 1 : 0, tt + k * 0.4);
      const palm = V(0, 1.2, -9.8).applyQuaternion(hp.q).add(hp.p);
      const dt = tt - prevT;
      if (a.prevPalm && dt > 0 && dt < 0.2) speed = Math.max(speed, a.prevPalm.distanceTo(palm) / dt);
      a.prevPalm = palm;
    });
    port.set(open);
    torso.group.visible = shown;
    glow = lerp(glow, shown ? 0.3 + Math.min(0.6, speed / 140) : 0, 0.35);
    prevT = tt;
    return glow;
  };

  // ---- Every card, where it is at a world time: in the shoe (unseen), in
  // a hand, in the air, sliding, lying, turning.
  const cardPose = { p: V(0, 0, 0), q: new THREE.Quaternion() };
  const _cy = V(0, 0, 0);
  const inAir = (c, tt) => (c.toss && tt >= c.toss.t0 && tt < c.toss.t1) || (c.pitch && tt >= c.pitch.t0 && tt < c.lay);
  // A card in the wash: drawn in under the hand's circle to the pile, the
  // pile pushed on to the slot's lip.
  const _py = new THREE.Quaternion(), _po = V(0, 0, 0);
  const pileAt = (c, tt, out) => {
    const S = c.sw, uw = clamp01((tt - S.grab) / (S.wash - S.grab)), g = smoother(uw), u2 = smoother(clamp01((tt - S.wash) / (S.push - S.wash)));
    const o = washOff(uw, _po);
    const x = lerp(S.p0.x, S.cx + S.ox + o.x * WASH.follow, g), y = lerp(S.p0.y, S.py, g), z = lerp(S.p0.z, S.cz + S.oz + o.z * WASH.follow, g);
    const E = swPose(SWP.m0, SWP.th0, S.qr);
    out.p.set(lerp(x, E.p.x, u2), lerp(y, E.p.y + S.dy, u2), lerp(z, E.p.z, u2));
    out.q.copy(_py.setFromAxisAngle(up, (S.wob * Math.sin(Math.PI * uw) + S.fin * g) * (1 - u2))).multiply(S.qr).slerp(E.q, u2 * u2 * u2);
    return out;
  };
  const poseCards = tt => {
    cards.forEach(c => {
      const g = c.obj;
      if (tt < c.pull) { g.visible = false; g.userData.contact.visible = false; return; }
      g.visible = true;
      const air = inAir(c, tt);
      if (c.sw && tt >= c.sw.grab) {
        if (tt < c.sw.rel && c.sw.auto) {
          const e = smoother(clamp01((tt - c.sw.grab) / SWP.slide)), E = swPose(SWP.m0, SWP.th0, c.sw.qr);
          cardPose.p.copy(c.sw.p0).lerp(E.p, e); cardPose.p.y += c.sw.dy * e; cardPose.q.copy(c.sw.qr).slerp(E.q, e * e * e);
        } else if (tt < c.sw.rel) pileAt(c, tt, cardPose);
        else {
          const u = clamp01((tt - c.sw.rel) / SWP.drop), P = swPose(lerp(SWP.m0, CARD.h / 2 + 0.5, Math.pow(u, 1.7)), lerp(SWP.th0, SWP.th1, Math.pow(u, 1.2)), c.sw.qr);
          cardPose.p.copy(P.p); cardPose.p.y += c.sw.dy * (1 - u); cardPose.q.copy(P.q);
          if (u >= 1) { g.visible = false; g.userData.contact.visible = false; return; }
        }
      } else if (!air && tt < c.lay) {
        // (in the shoe arm's hand until it is flicked away; then in the
        // other's, its grip turning round to the side over the carry)
        if (!c.toss || tt < c.toss.t0) cardInShoeHand(arms[0].now, cardPose);
        else cardIn(arms[1].now, cardPose, c.carry ? c.grip * smoother((tt - c.carry[0]) / Math.max(1e-4, c.carry[1] - c.carry[0])) : 0);
      } else if (air) {
        if (c.pitch && tt >= c.pitch.t0) pitchAt(c.pitch, tt, cardPose); else flightAt(c.toss, tt, cardPose);
      } else if (c.who === 'you') {
        cardPose.p.copy(c.slot).setY(c.restY); lying(cardPose.q, {});
      } else {
        turned(c.slot, angleAt(c, tt), cardPose, c.restY);
        // (a card that falls over flaps once as it lands)
        const te = turnEnd(c);
        if (c.turn < Infinity && tt >= te) { const b = tt - te; cardPose.p.y += Math.max(0, 0.9 * Math.sin(b * 22) * Math.exp(-b * 9)); }
      }
      g.position.copy(cardPose.p); g.quaternion.copy(cardPose.q);
      // (its contact shadow: flat cards only - a card on its edge has its own)
      const cs = g.userData.contact, dirY = _cy.set(0, 1, 0).applyQuaternion(cardPose.q);
      const k = Math.abs(dirY.y) > 0.6 ? 0 : Math.exp(-Math.max(0, cardPose.p.y - 0.05) / 1.4);
      cs.visible = k > 0.02;
      if (cs.visible) { cs.position.set(cardPose.p.x, 0, cardPose.p.z); cs.rotation.y = Math.atan2(dirY.x, dirY.z); cs.children[0].material.opacity = 0.75 * k; }
    });
  };

  // ---- The Black Jack: gold through the table's print (a sweep along the
  // lettering), the machine's circuits lit, the flash in the room.
  let printGlow = null, flash = null, goldLamp = null, goldFill = null, payout = null;
  if (tier === 'vault') {
    const mark = table.group.userData.mark;
    const gm = new THREE.MeshBasicMaterial({ color: new THREE.Color(1.2, 0.74, 0.2), alphaMap: mark.material.alphaMap, transparent: true, opacity: 0, depthWrite: false, blending: THREE.AdditiveBlending, toneMapped: false });
    const sweep = { value: -1 };
    gm.onBeforeCompile = sh => {
      sh.uniforms.uSweep = sweep;
      sh.fragmentShader = 'uniform float uSweep;\n' + sh.fragmentShader.replace('#include <alphamap_fragment>', `#include <alphamap_fragment>
        diffuseColor.a *= 0.35 + 1.7 * exp(-pow((vAlphaMapUv.x - uSweep) * 4.0, 2.0));`);
    };
    gm.customProgramCacheKey = () => 'bj-print-sweep';
    printGlow = new THREE.Mesh(mark.geometry, gm);
    printGlow.position.copy(mark.position).add(V(0, 0.01, 0)); printGlow.rotation.copy(mark.rotation); printGlow.renderOrder = 2;
    printGlow.userData.sweep = sweep;
    table.group.add(printGlow);
    // (and the gold bleeding out of the letters into the felt round them: the
    // same lettering, blurred)
    const src = mark.material.alphaMap.image;
    const bc = document.createElement('canvas'); bc.width = src.width; bc.height = src.height;
    const bx = bc.getContext('2d'); bx.filter = `blur(${Math.round(LETTERS.px * 0.45)}px)`;
    bx.drawImage(src, 0, 0); bx.drawImage(src, 0, 0);
    const haloTex = new THREE.CanvasTexture(bc); haloTex.colorSpace = THREE.NoColorSpace;
    const halo = new THREE.Mesh(mark.geometry, new THREE.MeshBasicMaterial({ color: new THREE.Color(1.15, 0.66, 0.16), alphaMap: haloTex, transparent: true, opacity: 0, depthWrite: false, blending: THREE.AdditiveBlending, toneMapped: false }));
    halo.position.copy(mark.position).add(V(0, 0.006, 0)); halo.rotation.copy(mark.rotation); halo.renderOrder = 1.5;
    printGlow.userData.halo = halo;
    table.group.add(halo);
    flash = new THREE.PointLight(0xffd9a8, 0, 0, 0);
    flash.position.copy(toWorld(V(4, 40, 30)));
    scene.add(flash);
    // (the jackpot's light, a real one: a warm gold lamp over your two cards
    // that lights the cloth, the cards and the hands round them, and stays
    // up after the burst has gone)
    // (a pool, not a tint: a cone with a soft edge, so the cloth is gold
    // under your cards and falls back to black round them)
    goldLamp = new THREE.SpotLight(0xffb347, 0, 130, 0.5, 1, 2);
    goldLamp.position.copy(toWorld(V(0, 40, 22)));
    goldLamp.target.position.copy(toWorld(V(0, 0, 19)));
    scene.add(goldLamp, goldLamp.target);
    // (a broad warm fill from the same side: the pool is for the cards, and
    // this one spreads over the felt and the rail, so the table itself is
    // gold in the payout and not a black field with a bright spot on it)
    goldFill = new THREE.SpotLight(0xffb347, 0, 0, 1.05, 1, 0);
    goldFill.position.copy(toWorld(V(0, 60, 20)));
    goldFill.target.position.copy(toWorld(V(0, 0, 4)));
    scene.add(goldFill, goldFill.target);
    // (the winnings: seven chips poured on the cloth beside the bet, one
    // after another, each dropping, bouncing short and settling with a
    // little rock - drawn only once the lettering is lit)
    // (gold, black and oxblood - the gold stays gold under the lamp; ivory
    // under it was only ever cream)
    const names = ['gold', 'onyx', 'oxblood', 'gold', 'onyx', 'oxblood', 'gold'];
    const geoP = new THREE.CylinderGeometry(1.95, 1.95, 0.33, 48, 1);
    const pg = new THREE.Group(); pg.visible = false; seat.add(pg);
    const chips = names.map((n, i) => {
      const m = new THREE.Mesh(geoP, K.chipMats(n));
      m.castShadow = true; m.receiveShadow = true; m.visible = false;
      const j = Math.sin(i * 2.7 + 1) * 0.06, j2 = Math.cos(i * 1.9) * 0.06;
      m.userData = { rest: V(SPOT.bet[0] + 5.6 + j, 0.165 + i * 0.335, SPOT.bet[1] + j2), t0: 0.35 + 0.13 * i, spin: 1.3 * i + 0.2 };
      pg.add(m);
      return m;
    });
    const sh = K.contactShadow(3.9, 3.9, 1.95, 0.9);
    sh.position.set(SPOT.bet[0] + 5.6, 0.02, SPOT.bet[1]); sh.visible = false; pg.add(sh);
    const G = 760, DROP = 26;
    // (the lamp over them is 9000 candela; at full the coin's gold clips to
    // cream. Held down as it rises - the colour pulled toward a deeper gold
    // as it dims, so it reads as metal in strong light, not paper - and the
    // faces given a metal's sharper highlight and the edges their spots)
    const chipMs = [...betChips, ...chips].flatMap(m => m.material);
    // (the lamp's glint off a clay chip is the other half of the cream: a
    // hundred times the room's light on a glossy face. It is taken off the
    // chip while the lamp is up - the face matte, the colour carrying it -
    // and handed back after)
    chipMs.forEach(mm => { mm.userData.r0 = mm.roughness; mm.userData.m0 = mm.metalness; mm.userData.c0 = mm.color.clone(); });
    const expose = k => chipMs.forEach(mm => {
      mm.color.setRGB(lerp(mm.userData.c0.r, 0.3, k), lerp(mm.userData.c0.g, 0.22, k), lerp(mm.userData.c0.b, 0.1, k));
      mm.roughness = lerp(mm.userData.r0, 1, k); mm.metalness = lerp(mm.userData.m0, 0, k);
    });
    payout = {
      geo: geoP,
      expose,
      set(b) {
        pg.visible = b > 0;
        sh.visible = b > 0.35;
        sh.material.opacity = Math.min(1, Math.max(0, (b - 0.35) / 0.3));
        chips.forEach(m => {
          const u = b - m.userData.t0, r = m.userData.rest;
          if (u < 0) { m.visible = false; return; }
          m.visible = true;
          // the fall, then three shrinking bounces (a clay chip on cloth
          // gives back little)
          const fall = Math.sqrt(2 * (DROP) / G);
          let y = r.y, tilt = 0;
          if (u < fall) y = r.y + DROP - 0.5 * G * u * u;
          else {
            let v = G * fall * 0.26, tt = u - fall;
            for (let n = 0; n < 4 && tt > 0; n++) { const air = 2 * v / G; if (tt < air) { y = r.y + v * tt - 0.5 * G * tt * tt; break; } tt -= air; v *= 0.3; }
            tilt = 0.13 * Math.exp(-(u - fall) * 7) * Math.sin((u - fall) * 38 + i0(m));
          }
          m.position.set(r.x, y, r.z);
          m.rotation.set(tilt, m.userData.spin + (u < fall ? u * 9 : 0), tilt * 0.6);
        });
      },
    };
    const i0 = m => m.userData.spin;
  }

  // ---- The camera: keys in the seat's frame [t, eye xyz, aim xyz], real
  // seconds. Close on the port as it opens; up with the machine as it
  // rises; over the felt for the deal, turned to each card where it goes;
  // in on the card that decides it; the hand, called; then the float up
  // and away over the pit.
  const tall = aspect < 0.62;
  // (a phone stands back further: the rule line, the cards and the plates
  // all sit inside its narrow frame, where a closer lens cut the print off)
  const W2 = tall ? 1.3 : 0.8;             // (a wide screen stands closer)
  const keys = [];
  const push = k => { if (keys.length) { const p = keys[keys.length - 1]; k[0] = Math.max(k[0], p[0] + 0.3); } keys.push(k); };
  // (the seat's view of the whole table: your cards, the dealer's, the
  // machine; a phone stands it further back)
  // (a phone's aim: the action sits left and high of its frame, so it looks
  // a little left and up - the arms and hands come into it from the edges)
  const SEATV = tall ? [0, 58 * W2, -22, -7, 9, 34] : [0, 58 * W2, -22, 0, 6, 34];
  // (the lens drawn back and over toward the drop slot while it clears the cards)
  const SWEEPV = tall ? [0, 76 * W2, -34, -7, 8, 34] : [0, 76 * W2, -34, 0, 5, 34];
  push([0, 6, 26, 20, 0, 0, 57.6]);
  push([Rw(dealAt - RISE.open) + 0.25, 5, 24, 23, 0, 0.5, 57.6]);
  push([Rw(dealAt - RISE.swing) - 0.05, 2, 34, -6, 0, 22, 57]);
  push([Rw(dealAt) + 0.35, -1, 56 * W2, -12, -0.5, 9, 42]);
  // (a blackjack is called on your second card: the lens stays on it while
  // the hole card is laid behind the call)
  order.slice(0, decide.pitch ? order.indexOf(decide) : order.length).forEach(c => {
    if (c.who === 'you') push([Rw(c.pitch.t0) - 0.1, 0, 62 * W2, -22, 0, 5, 32]);
    else push([Rw(c.lay) - 0.05, 1, 64 * W2, -22, c.slot.x * 0.3, 6, 34]);
  });
  if (decide.pitch) {
    // (low over your cards as the deciding one comes skidding in)
    const s = decide.slot;
    // (the whole table stays in frame, the lens leaning a little toward the
    // card)
    push([Rw(decide.pitch.t0) - 0.25, 0, 62 * W2, -22, s.x * 0.4, 4, 31]);
    push([Rw(decide.pitch.t0) + 0.1, s.x * 0.3, 60 * W2, -26, s.x * 0.5, 3, 30]);
    push([Rw(restW) + 0.5, s.x * 0.3, 62 * W2, -24, s.x * 0.4, 3, 30]);
    if (tier === 'vault') {
      // (up over the felt as it lights: the whole lettered arc, your hand,
      // the machine)
      push([Rw(plan.boom) + 0.35, 0, 84 * W2, 2, 0, 0, 33]);
      push([Rw(plan.boom) + 2.2, 0, 66 * W2, -6, 0, 0, 30]);
    } else {
      if (plan.sweep) push([Rw(plan.sweep[0]) + 0.2, ...SWEEPV]);
      push([Rw(plan.revealW), ...SEATV]);
    }
  } else {
    // (the wait, the table in frame; then in on the hole card; called with
    // both hands in frame)
    const CALLV = [Rw(plan.callW) + 0.35, 1.5, 50 * W2, -6, 2.5, 0, 28];
    push([Rw(holeCard.turn) - 0.9, ...SEATV]);
    const s = holeCard.slot;
    if (decide === third) {
      push([Rw(holeCard.turn) - 0.1, s.x * 0.3, 60 * W2, -26, s.x * 0.5, 3, 30]);
      push([Rw(holeCard.turn) + 0.6, s.x * 0.3, 58 * W2, -26, s.x * 0.5, 3, 31]);
      // (the card that busts it comes down with the whole table still in
      // frame)
      const t = third.slot;
      push([Rw(third.turn) - 0.1, t.x * 0.4, 58 * W2, -26, t.x * 0.55, 3, 31]);
      push([Rw(restW) + 0.15, t.x * 0.3, 62 * W2, -26, t.x * 0.4, 3, 30]);
      push(CALLV);
      if (plan.sweep) push([Rw(plan.sweep[0]) + 0.2, ...SWEEPV]);
      push([Rw(plan.revealW) + 0.4, ...SEATV]);
    } else {
      push([Rw(holeCard.turn) - 0.1, s.x * 0.3, 60 * W2, -26, s.x * 0.5, 3, 30]);
      push([Rw(restW) + 0.1, s.x * 0.3, 62 * W2, -26, s.x * 0.4, 3, 30]);
      push(CALLV);
      if (plan.sweep) push([Rw(plan.sweep[0]) + 0.2, ...SWEEPV]);
      push([Rw(plan.revealW) + 0.4, ...SEATV]);
    }
  }
  // (the end: the page's own title, tagline, button and small print take
  // the middle of the screen from here on and all through the float, so the
  // cards stand clear of them. A phone, tall: the table sits low and the
  // two hands lie below the print; wide: the whole table slides off to one
  // side, the hands left of the text)
  // (the table settles here as the end card comes in, and holds)
  {
    // (a table cleared of its cards is seen from high and steep: the rail and
    // its chips take the top of the screen, above the page's card, and
    // the felt's bet and its rim the bottom. One that still has its cards
    // - the vault's - keeps them below the card's print, as before)
    const END = tall ? (plan.sweep ? [0, 100, -26, 0, 0, 40] : [0, 70, -48, 0, 10, 73]) : [-45, 54 * W2, -18, -45, 2, 32];
    push([Rw(plan.revealW) + 0.15, ...END]);
    push([Rw(plan.endW) + 0.3, ...END]);
  }
  // the float: up and away over the pit (the seat's -x and -z: the room's
  // +x, +z), into the ceiling
  {
    const Lk = keys[keys.length - 1];
    [[6, -40, 60, -110, Lk[4], Lk[5], Lk[6]], [16, -90, 110, -220, Lk[4] - 10, Lk[5], Lk[6] - 10], [room.FLOAT - 2, -120, 140, -300, Lk[4] - 30, Lk[5], Lk[6] - 30]].forEach(([dt, dx, dy, dz, ax, ay, az]) => push([Lk[0] + dt, Lk[1] + dx * 0.4, Lk[2] + dy, Lk[3] + dz, ax, ay, az]));
  }
  const camera = ({ eye, aim, dt, n }) => {
    let last = null;
    const e = V(0, 0, 0), a = V(0, 0, 0);
    for (let k = 0; k < n; k++) {
      const t = k * dt;
      const v = spline(keys, t);
      last = last ? last.map((x, j) => lerp(x, v[j], 1 - Math.exp(-dt / 0.09))) : v;
      e.set(last[0], Math.max(4, last[1]), last[2]); a.set(last[3], last[4], last[5]);
      const we = toWorld(e), wa = toWorld(a);
      // the ceiling: the float rises into it and rests there
      if (we.y > room.CEIL - 20) we.y = room.CEIL - 20 * Math.exp(-(we.y - (room.CEIL - 20)) / 20);
      eye.set([we.x, we.y, we.z], k * 3); aim.set([wa.x, wa.y, wa.z], k * 3);
    }
  };
  const Rslow = Rw(slowW);
  const gleamAt = t => smoother((t - (Rslow - 0.2)) / 0.35) * (1 - smoother((t - warp.slowHold[1]) / 0.7));

  // ---- Sounds, real seconds.
  const sfx = [];
  const at = (w, kind, extra = {}) => sfx.push(Object.assign({ t: Rw(w), kind, rate: warp.rateAt(Rw(w)) }, extra));
  at(dealAt - RISE.open, 'latch');
  at(riseT0, 'servo', { f0: 70, f1: 140, dur: riseT });
  at(riseT0 + riseClear * riseT + 0.18, 'knock', { soft: true });
  cards.forEach(c => {
    if (c.pull === Infinity) return;
    at(c.pull, 'slide', { dur: 0.09 });
    if (c.toss) { at(c.toss.t0, 'snap'); at(c.toss.t1, 'pat', { speed: 60 }); }
    if (c.pitch) { at(c.pitch.t0, 'snap'); at(c.landAt, 'pat', { speed: 140 }); at(c.landAt + 0.01, 'slide', { dur: c.pitch.Ts }); }
    else if (c.lay < Infinity) at(c.lay, 'pat', { speed: 50 });
    if (c.turn < Infinity) { at(c.turn, 'snap', { soft: true }); at(turnEnd(c), 'pat', { speed: 90 }); }
  });
  cards.forEach(c => { if (c.sw) { if (c.sw.auto) at(c.sw.grab, 'slide', { dur: SWP.slide }); else { at(c.sw.grab, 'pat', { speed: 30 }); at(c.sw.grab + 0.06, 'slide', { dur: c.sw.wash - c.sw.grab }); at(c.sw.wash, 'slide', { dur: c.sw.push - c.sw.wash }); } at(c.sw.rel, 'slide', { dur: SWP.drop }); } });
  if (plan.slot) { at(plan.slot.open, 'servo', { f0: 220, f1: 340, dur: 0.32 }); at(plan.slot.close, 'servo', { f0: 340, f1: 200, dur: 0.36 }); at(plan.slot.close + 0.34, 'knock', { soft: true }); }
  at(plan.sinkW + SINK.lag, 'servo', { f0: 150, f1: 60, dur: SINK.down });
  if (tier === 'hardways') at(plan.callW + 0.1, 'chime');
  if (tier === 'vault') { at(plan.boom, 'bell'); at(plan.boom + 0.02, 'boom', { soft: true }); }

  // ---- Each frame.
  // (the call: over the dark cloth between the dealer's cards and the
  // port, clear of the white column)
  // (The Black Jack's, seen from high over the table, nearer the port: clear
  // of the hole card)
  const callPt = toWorld(V(0, 1, tier === 'vault' ? 49 : 44));
  const stage = (t, { w }) => {
    poseRig(w);
    poseCards(w);
    // (the port melts away as the page's card takes the screen, so it is not
    // behind its title; before that it wakes in the cloth a little before the
    // machine uses it: its
    // seam lit and a glint on it; the leaves draw back while the cards go
    // in, and close on a seam that glimmers)
    if (slotAnim) {
      const S = plan.slot, k = smoother(clamp01((w - S.wake) / 0.5)) * (1 - smoother(clamp01((w - (plan.revealW - 0.45)) / 0.75))), o = smoother(clamp01((w - S.open) / 0.32)) * (1 - smoother(clamp01((w - S.close) / 0.36)));
      slotG.visible = k > 0.001;
      // (lit while it works, then it sinks to a hairline: shut, only a gold
      // seam and a glint wandering it say it is there)
      const act = smoother(clamp01((w - (S.open - 0.3)) / 0.3)) * (1 - smoother(clamp01((w - (S.close + 0.5)) / 0.9)));
      slotAnim.goldM.opacity = k * (0.82 + 0.18 * act); slotAnim.leafM.opacity = k;
      slotAnim.well.visible = o > 0.01;
      slotAnim.leaves.forEach(g => { g.scale.z = Math.max(0.001, 1 - o); });
      // (lit while it works, a low glow when it is done)
      slotAnim.goldM.emissiveIntensity = 0.3 + 0.9 * o + 0.3 * act * Math.max(0, Math.sin(w * 2.4));
      const shut = k * (1 - o);
      slotAnim.glintM.opacity = shut * (0.45 + 0.45 * Math.sin(w * 3.1));
      slotAnim.glint.position.x = Math.sin(w * 1.1) * (SLOT.w / 2 - 0.6);
    }
    // (the table is cleared: its lettering is let go quiet as the page's
    // own card takes the screen, so it does not run behind the button)
    if (plan.sweep || tier === 'vault') {
      const mk = table.group.userData.mark, q = 1 - (tier === 'vault' ? 0.9 : 0.72) * smoother(clamp01((w - (plan.revealW - 0.5)) / 0.8));
      mk.material.opacity = q;
      if (mk.children[0] && mk.children[0].material) mk.children[0].material.opacity = q;
    }
    // (The Black Jack keeps its cards on the cloth, so under the page's card
    // they are let go dark with the lettering - the hand is told, the text
    // has the screen. Their colour only: nothing compiles.)
    if (tier === 'vault') {
      const dk = 1 - 0.93 * smoother(clamp01((w - (plan.revealW - 0.5)) / 0.8));
      cards.forEach(o => o.obj.children.forEach(m => { if (m.material && m.material.color) { m.material.color.setScalar(dk); m.material.opacity = 0.04 + 0.96 * dk; } }));
    }
    // (the room's rim light stands at the shot's own each frame - see
    // wheel.mjs)
    lights.rim.intensity = room.RIM;
    let burst = -1, dust = 1, lit = 0;
    if (tier === 'vault') {
      burst = w - plan.boom;
      const on = burst > 0;
      if (printGlow) {
        printGlow.material.opacity = on ? Math.min(1, 1.1 * Math.max(0, 1 - burst / 3.4)) * (0.8 + 0.2 * Math.sin(burst * 7)) : 0;
        // (the light runs along the lettering, left to right as you read it,
        // twice)
        printGlow.userData.sweep.value = on ? -0.2 + ((burst * 0.7) % 1.4) : -1;
        printGlow.userData.halo.material.opacity = on ? Math.min(1, burst / 0.12) * Math.max(0, 1 - burst / 3.8) ** 1.5 : 0;
      }
      // (a flash, gone in a blink - the felt stays black; the gold is in
      // the letters and the machine)
      if (flash) flash.intensity = on ? 9 * Math.exp(-burst / 0.09) : 0;
      if (goldLamp) {
        goldLamp.intensity = on ? 9000 * smoother(burst / 0.5) * (0.5 + 0.5 * Math.exp(-burst / 3)) * (1 - 0.7 * smoother(clamp01((w - (plan.revealW - 0.5)) / 0.8))) : 0;
        // (the pool of light travels the lettering once, left to right as
        // you read it, then comes to rest on your cards)
        const sx = burst < 0.2 ? -34 : burst < 2.6 ? lerp(-34, 34, smoother((burst - 0.2) / 2.4)) : lerp(34, 0, smoother((burst - 2.6) / 1.1));
        goldLamp.position.copy(toWorld(V(-sx * 0.55, 40, 22)));
        goldLamp.target.position.copy(toWorld(V(-sx, 0, burst < 2.6 ? 26 : 19)));
      }
      if (goldFill) goldFill.intensity = on ? 5.5 * smoother(burst / 0.5) * (0.5 + 0.5 * Math.exp(-burst / 3)) * (1 - 0.7 * smoother(clamp01((w - (plan.revealW - 0.5)) / 0.8))) : 0;
      if (payout) { payout.set(on ? burst : -1); payout.expose(on ? smoother(burst / 0.5) : 0); }
      lit = on ? 3.2 * smoother(burst / 0.25) * Math.max(0, 1 - burst / 3.8) : 0;
    }
    // the light in the machine's circuits: up while it works, brighter as
    // it moves, and all through it for The Black Jack
    dm.ceramic.emissiveIntensity = glow + lit;
    dm.circuit.emissiveIntensity = Math.max(0, glow - 0.3) * 2.5 + lit * 1.5;
    dm.pulse.value = w * (1 + 2 * Math.min(1, lit));
    return { burst, dust };
  };
  const callAt = () => [callPt.x, callPt.y, callPt.z];

  // (the shot's turns, drawn once unseen before it plays: see warm())
  const warmAt = [Rw(riseT0) + 0.3, Rw(order[0].toss.t0) + 0.05, Rw(order[0].pitch.t0) + 0.1, Rw(order[1].turn) + 0.1, Rslow + 0.05, warp.slowHold[1], Rw(restW) + 0.3];
  if (tier === 'vault') warmAt.push(Rw(plan.boom) + 0.05, Rw(plan.boom) + 0.8);
  // (the slot, drawn once while it is up and its leaves are open: its metal and glint compile before it is seen)
  if (plan.slot) warmAt.push(Rw(plan.slot.open) + 0.3);
  // (the chips' faces are loaded before the first frame)
  await K.chipsReady();

  const dispose = () => {
    scene.remove(seat);
    if (flash) scene.remove(flash);
    if (goldLamp) scene.remove(goldLamp, goldLamp.target);
    if (goldFill) scene.remove(goldFill, goldFill.target);
    K.freeTree(seat, set);
    linen.dispose();
  };

  return {
    plan, camera, gleamAt, stage, callAt, sfx, warmAt, dispose,
    // (a trim picked in Settings while the shot is up)
    setTrim(id) { if (slotAnim) slotAnim.dress(id); },
    tierNames: TIER_NAMES,
    // (the draw's 1.9% and its edge's 0.1%, folded into one)
    tierOdds: { vault: '4.8%' },
    // (its call is set on a plate at the top of the screen: the white machine and the cards are never behind it)
    callScrim: true, callPlate: true, badgeFades: true,
    silence: null,
    // (for the lab: the moments, in real seconds, and the hand)
    moments: { rise: Rw(riseT0), deal: Rw(dealAt), slow: Rslow, rest: Rw(restW), call: Rw(plan.callW), reveal: plan.revealReal, end: plan.totalReal, boom: tier === 'vault' ? Rw(plan.boom) : null, sweepStart: plan.sweep ? Rw(plan.sweep[0]) : null, sweepEnd: plan.sweep ? Rw(plan.sweep[1]) : null, slotOpen: plan.slot ? Rw(plan.slot.open) : null, slotClose: plan.slot ? Rw(plan.slot.close) : null, sink: Rw(plan.sinkW), play: hand.play, you: plan.cards.you, dealer: plan.cards.dealer, totals: plan.values, cards: cards.map(c => ({ who: c.who, card: c.rank + c.suit, pull: Rw(c.pull), lay: c.lay < Infinity ? Rw(c.lay) : null, turn: c.turn < Infinity ? Rw(c.turn) : null })), get reach() { return +reach.toFixed(2); }, get reachAt() { return reachAt; },
      // (lab: the machine swept through the whole shot at 120 Hz - its
      // farthest reach from J2 to the wrist, which must stay under
      // ARM.upper + ARM.fore, where it was, and the deepest the steering
      // left an arm in anything)
      scan() { reach = 0; reachAt = null; let sunk = { d: 0, at: null }; for (let t = 0; t <= plan.endW; t += 1 / 120) { poseRig(t); if (rising(t).y < ARM.up - 0.01) continue; arms.forEach((a, k) => { if (a.arm.sunk > sunk.d) sunk = { d: +a.arm.sunk.toFixed(2), at: { t: +t.toFixed(3), arm: k } }; }); } return { reach: +reach.toFixed(2), reachAt, sunk, max: ARM.upper + ARM.fore }; } },
    pieces: { seat, torso, arms, cards, table: table.group }
  };
}
