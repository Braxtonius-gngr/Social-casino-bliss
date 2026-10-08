// Original music for the intro's shots, written as events for the intro's
// Sound (intro.mjs: its kinds are the voices played here). A track is laid
// on a grid - the shot's beat in real seconds - and returns its events,
// every one marked `band` so it plays through the music's own glue.
//
// The grid: at(b), the real second beat b falls on (beat 0 the shot's own
// downbeat; beats before it are negative); BEAT, the beat's length; first,
// the first beat at or before the shot's first frame; drop, the beat the
// track drops on; title, the beat of its biggest hit (the shot's call); end,
// the real second it has rung out by.

const clamp01 = x => Math.min(Math.max(x, 0), 1);
const smoother = x => { x = clamp01(x); return x * x * x * (x * (6 * x - 15) + 10); };
const n = m => 440 * Math.pow(2, (m - 69) / 12);
const glue = evs => { evs.forEach(e => { e.band = true; }); return evs; };

// "Haze": slow, heavy, hazy, in F minor (Fm, Db, Ab, Eb), made for the
// flyover and kept for another shot. A voice far off - a woman singing
// "ahh... ahh... ohh... ahh", muffled as if through a wall - and a pad
// under it, a muted kick coming in on the beat before the drop's. A reverse
// cymbal draws up into the drop: an 808 under everything, the kick, a clap
// and snare on two and four, hats with rolls, the voice clearer now and
// chopped into stabs. The biggest hit on the title; then it rides out.
// (Its tempo wants a beat near 0.65 s.)
export function hazeBeat({ at, BEAT, first, drop: D, title: nb, end }) {
  const evs = [], S16 = BEAT / 4, Rd = at(D), Rc = at(nb);
  const chords = [[53, 56, 60, 63], [49, 53, 56, 60], [51, 56, 60, 63], [51, 55, 58, 62]], roots = [29, 25, 32, 27];
  const lvl = t => t < Rd ? 0.75 : 0.82 + 0.18 * smoother((t - Rd) / (Rc - Rd));
  const push = (t, kind, extra) => { if (t > 0.01 && t < end) evs.push(Object.assign({ t, kind }, extra)); };
  // (the bar's chord, counted from the drop)
  const ci = b => (((Math.floor((b - D) / 4) % 4) + 4) % 4);
  // the voice, over and over, every two bars from the first frame - muffled before the drop, clearer after
  const phrase = [[0, 1.5, 60, 'ah'], [1.5, 1.5, 56, 'ah'], [3, 2.6, 55, 'oh', 53], [6, 1.9, 60, 'ah', 58]];
  for (let p0 = D - 8 * Math.ceil((D - first) / 8); at(p0) < end; p0 += 8) {
    phrase.forEach(([o, d, m, v, m2]) => {
      const t = at(p0 + o), pre = t < Rd - 0.05;
      if (t + d * BEAT < 0.15) return;
      push(Math.max(0.05, t), 'vox', { f: n(m), f2: m2 && n(m2), v, v2: v === 'oh' ? 'oh' : 'ah', dur: d * BEAT - 0.05, cut: pre ? 900 : 2000, lvl: (pre ? 0.8 : 0.55) * lvl(t) });
    });
  }
  // (the pad under it, a bar each)
  for (let b = D - 4 * Math.ceil((D - first) / 4); at(b) < end; b += 4) push(Math.max(0.05, at(b)), 'pad', { f: chords[ci(b)].map(n), dur: BEAT * 3.9, lvl: at(b) < Rd ? 0.55 : 0.6 });
  // (before the drop: a muted kick, one and three from the downbeat; a soft 808 on it)
  for (let b = 0; b < D - 1; b++) if (b % 2 === 0) push(at(b), 'kick', { lvl: 0.4, dust: true });
  push(at(0), 'b808', { f: n(29), dur: BEAT * 1.5, lvl: 0.55 });
  // (the reverse cymbal drawn up into the drop over the beat before it)
  push(at(D - 1), 'revcym', { dur: BEAT, lvl: 1.1 });
  // the beat, from the drop to the end
  for (let b = D; at(b) < end; b++) {
    const t = at(b), beat = (b - D) % 4, L = lvl(t), c = ci(b), hit = b === D || b === nb;
    if (beat === 0) push(t, 'kick', { lvl: L, dust: true });
    if (beat === 2) push(t + 2 * S16, 'kick', { lvl: L * 0.8, dust: true });
    if (beat === 1 || beat === 3) { push(t, 'clap', { lvl: L }); push(t, 'tsnare', { lvl: L * 0.6 }); }
    // (the hats: sixteenths, leaning on the beat; an open hat on the and of four; a triplet roll closing every other bar)
    for (let k = 0; k < 4; k++) {
      if (beat === 3 && k >= 2 && ((b - D) % 8) === 7) { if (k === 2) for (let r = 0; r < 6; r++) push(t + k * S16 + r * S16 / 3, 'hat', { lvl: L * (0.4 + 0.08 * r) }); continue; }
      if (beat === 3 && k === 2) { push(t + k * S16, 'hat', { lvl: L * 0.7, open: true }); continue; }
      push(t + k * S16, 'hat', { lvl: L * [0.75, 0.3, 0.5, 0.35][k] });
    }
    // (the voice chopped: two short stabs a bar, off the beat, a chord tone)
    if (beat === 1 || beat === 3) push(t + (beat === 1 ? 2 : 3) * S16, 'vox', { f: n(chords[c][beat === 1 ? 2 : 3]), v: 'ah', dur: S16 * 1.4, cut: 2600, lvl: L * 0.45 });
    // (the 808: the bar's root, long; a push on the and of three, sliding into the next bar)
    if (beat === 0 && !hit) push(t, 'b808', { f: n(roots[c]), dur: BEAT * 2.4, lvl: L * 1.1 });
    if (beat === 2) push(t + 2 * S16, 'b808', { f: n(roots[c]), f2: n(roots[(c + 1) % 4]), dur: BEAT * 1.5, lvl: L * 0.85 });
  }
  push(Rd, 'crash', { lvl: 0.9 }); push(Rd, 'b808', { f: n(29), dur: BEAT * 2.4, lvl: 1.1 });
  // into the title: the biggest hit, the voice up high over it
  push(at(nb - 2), 'revcym', { dur: BEAT * 2, lvl: 1.1 });
  push(Rc, 'crash', { lvl: 1 }); push(Rc, 'b808', { f: n(29), dur: BEAT * 3.5, lvl: 1.25 });
  push(Rc, 'pad', { f: [41, 53, 60, 63, 68, 72].map(n), dur: BEAT * 4, lvl: 1 });
  push(Rc, 'vox', { f: n(65), f2: n(63), v: 'ah', v2: 'oh', dur: BEAT * 3, cut: 2400, lvl: 0.6 });
  return glue(evs);
}

// "Wild": cool, dark, popping - rap meeting EDM - in E minor with the
// flattened second (Em, Em, F, Dm), near 150 with the drums in half time.
// Under it all, set back, a bed: a dark wide pad and a low choir, a bar
// each. Over the photograph that bed, a light kick and a shaker. From
// `build` (the throw) the build: the snare rolling faster and faster, a
// riser sweeping up, the bed's filter opening, the kick on every beat - through the sky's opening to half a beat of silence
// and a shout, and the drop (or, with `back` given, the music sinking away
// from the drop under the shot's own moment and coming back on that beat
// with the shout): the 808's long boom... a tap, and a second
// boom... the hats' "teh top ti top" - over and over, until it opens into
// the EDM: the kick on every beat, the bed opened wide with the choir's
// upper voices over it, open hats, a crash every other bar. Toms roll down
// the kit under each build; an impact hits on the drop and the title. A shorter build again under the dive, the same silence, and
// the biggest boom on the title; then the EDM rides it out.
const WILD_CHORDS = [[52, 55, 59], [52, 55, 59], [53, 57, 60], [50, 53, 57]], WILD_ROOTS = [28, 28, 29, 26];
// (a bar of the bed: the dark wide pad and, where it is open enough to be
// heard, the low choir on chord c - its root and fifth; opened up, the choir's upper voices over it, an octave
// higher. Kept lean: on a phone, a choir of a voice per note in every bar
// was more than the sound could keep up with, and it stalled.)
const wildBed = (push, t, c, dur, cut, lv, oh) => {
  const ch = WILD_CHORDS[c];
  push(t, 'pad', { f: [n(ch[0] - 12)].concat(ch.map(n)), dur, cut, lvl: lv }, true);
  if (cut >= 1000) [ch[0], ch[2]].forEach(m => push(t, 'vox', { f: n(m - 12), v: oh ? 'oh' : 'ah', v2: 'ah', dur, cut: cut * 0.8, lvl: lv * 0.36 }, true));
  if (cut >= 1500) [ch[1], ch[2]].forEach(m => push(t, 'vox', { f: n(m), v: 'ah', dur, cut: cut * 1.2, lvl: lv * 0.22 }, true));
};
// (a beat of the EDM: four on the floor, a clap on two and four, open hats
// on the offbeat, a crash opening every other bar, the 808 on the bar)
const wildEdm = (push, t, beat, c, L, crash, BEAT) => {
  const S16 = BEAT / 4;
  push(t, 'kick', { lvl: L });
  if (beat === 0 && crash) push(t, 'crash', { lvl: L * 0.7 });
  if (beat === 1 || beat === 3) push(t, 'clap', { lvl: L * 0.9 });
  push(t + 2 * S16, 'hat', { lvl: L * 0.55, open: true });
  push(t + S16, 'hat', { lvl: L * 0.25 }); push(t + 3 * S16, 'hat', { lvl: L * 0.25 });
  // (held right up to the next bar's: shorter, the bar line dropped out on a phone's speaker)
  if (beat === 0) push(t, 'b808', { f: n(WILD_ROOTS[c]), dur: BEAT * 4.05, lvl: L, long: true });
};

export function wildBeat({ at, BEAT, first, drop: D, back: P = D, title: nb, end, build }) {
  const evs = [], S16 = BEAT / 4, Rd = at(D), Rc = at(nb), Rp = at(P);
  const chords = WILD_CHORDS, roots = WILD_ROOTS;
  const ci = b => (((Math.floor((b - D) / 4) % 4) + 4) % 4);
  const gaps = [[Rp - BEAT * 0.5, Rp - 0.005], [Rc - BEAT * 0.5, Rc - 0.005]];
  // (from the drop to `back`, the music sinks away under what the shot
  // plays there - the flyover's jet - and comes back on the beat after it)
  const duck = t => t < Rd || t >= Rp - BEAT * 0.5 ? 1 : Math.max(0.12, 1 - (t - Rd) / (BEAT * 1.5));
  const push = (t, kind, extra, loud) => {
    if (t > 0.01 && t < end && (loud || !gaps.some(([a, b]) => t > a && t < b))) {
      const e = Object.assign({ t, kind }, extra), k = loud ? 1 : duck(t);
      if (k < 1) e.lvl = (e.lvl == null ? 1 : e.lvl) * k;
      evs.push(e);
    }
  };
  const B0 = Math.max(first + 1, Math.ceil((build - at(0)) / BEAT));
  // the bed, set back under it all: a dark wide pad and a low choir under
  // it, a bar each, its filter opening from cut0 to cut1 across [b0, b1)
  const bed = (b0, b1, cut0, cut1, lvl0, lvl1) => {
    for (let b = D + 4 * Math.floor((b0 - D) / 4); b < b1; b += 4) {
      const s0 = Math.max(b, b0), u = (s0 - b0) / Math.max(1, b1 - b0), c = ci(b), len = Math.min(b + 4, b1) - s0;
      if (len <= 0 || at(s0) + 0.05 > end) continue;
      const t = Math.max(0.05, at(s0)), cut = cut0 + (cut1 - cut0) * u * u, lv = lvl0 + (lvl1 - lvl0) * u, dur = len * BEAT - 0.02;
      wildBed(push, t, c, dur, cut, lv, (b - D) % 8 !== 0);
    }
  };
  // (the trap's bars after the drop, before the EDM opens up)
  const TRAP = 8;
  // the intro: the skank - the chord on each offbeat - over a kick on one and three and a shaker
  for (let b = first; b < B0; b++) {
    const t = at(b), beat = (((b - D) % 4) + 4) % 4;
    if (beat === 0 || beat === 2) push(t, 'kick', { lvl: 0.55 });
    for (let k = 0; k < 4; k++) push(t + k * S16, 'hat', { lvl: [0.25, 0.12, 0.2, 0.12][k] });
  }
  // the build: from the throw to the drop
  const roll = (b0, b1, top) => {
    for (let b = b0; b < b1; b++) {
      const u = (b - b0) / Math.max(1, b1 - b0), per = u < 0.34 ? 1 : u < 0.6 ? 2 : u < 0.84 ? 4 : 8;
      for (let k = 0; k < per; k++) { const v = (b - b0 + k / per) / (b1 - b0); push(at(b) + k * BEAT / per, 'tsnare', { lvl: top * (0.3 + 0.7 * v * v), dry: true }); }
      if (u > 0.45) push(at(b), 'kick', { lvl: 0.5 + 0.4 * u });
      // (the toms rolling under it in its second half, falling down the kit each beat)
      if (u >= 0.5) [0, 1, 2].forEach(k => push(at(b) + k * BEAT / 3, 'tom', { f: [150, 115, 85][k], lvl: top * (0.5 + 0.5 * u) }));
    }
  };
  roll(B0, D, 0.9);
  push(at(B0), 'riser', { dur: Rd - at(B0) - (P === D ? BEAT * 0.5 : 0), lvl: 1 });
  // (the bed: dark over the photograph, opening through the build; low and
  // cool under the trap; wide under the EDM and the dive's build; huge on the title)
  bed(first, B0, 650, 800, 0.6, 0.6);
  bed(B0, D, 800, 2400, 0.6, 0.9);
  bed(D, P + TRAP, 700, 700, 0.55, 0.55);
  bed(P + TRAP, nb - 4, 1600, 1600, 0.8, 0.8);
  bed(nb - 4, nb, 1200, 3000, 0.8, 1);
  bed(nb + 1, Math.ceil((end - at(0)) / BEAT), 1800, 1800, 0.85, 0.85);
  push(at(0), 'crash', { lvl: 0.45 });
  // the drop's shout, alone in the gap
  push(Rp - BEAT * 0.5, 'vox', { f: n(52), f2: n(55), v: 'ah', dur: BEAT * 0.4, cut: 2600, lvl: 1 }, true);
  // the drop, to the end
  for (let b = D; at(b) < end; b++) {
    const t = at(b), beat = (b - D) % 4, bar = Math.floor((b - D) / 4), c = ci(b), L = 0.85 + 0.15 * smoother((t - Rd) / (Rc - Rd));
    const edm = b - P >= TRAP && b >= nb - 2 || b > nb;
    // (the title's beat is its own hit, below; under the dive's build the
    // beat runs on - thinned to the roll alone, it read as the music dropping out)
    if (b === nb) continue;
    if (!edm) {
      // (the trap: DOOOM on one... the tap on three, a second boom on its and... "teh top ti top" on four -
      // its bars counted from where it comes back)
      const beat = (((b - P) % 4) + 4) % 4;
      if (beat === 0) { push(t, 'kick', { lvl: L }); push(t, 'b808', { f: n(roots[c]), f2: n(roots[c]) * 0.94, dur: BEAT * 1.9, lvl: L * 1.15, long: true }); }
      if (beat === 2) { push(t, 'clap', { lvl: L * 0.85 }); push(t + 2 * S16, 'b808', { f: n(roots[c]), dur: BEAT * 1.3, lvl: L, long: true }); push(t + 2 * S16, 'kick', { lvl: L * 0.75 }); }
      if (beat === 3) [0, 1, 2, 3].forEach(k => push(t + k * S16, 'hat', { lvl: L * [0.7, 0.4, 0.6, 0.45][k] }));
      if (beat === 1) push(t + 2 * S16, 'hat', { lvl: L * 0.35 });
    } else {
      wildEdm(push, t, beat, c, L, (b - D) % 8 === 0, BEAT);
    }
  }
  push(Rp, 'crash', { lvl: 1 }, true); push(Rp, 'impact', { lvl: 1 }, true);
  // into the title: the build again, shorter, the gap and the shout, and the biggest boom
  roll(nb - 4, nb, 1.25);
  push(at(nb - 4), 'riser', { dur: BEAT * 3.5, lvl: 1.4 });
  push(Rc - BEAT * 0.5, 'vox', { f: n(52), f2: n(55), v: 'ah', dur: BEAT * 0.4, cut: 2600, lvl: 1 }, true);
  push(Rc, 'crash', { lvl: 1.1 }, true); push(Rc, 'kick', { lvl: 1.1 }, true); push(Rc, 'impact', { lvl: 1.2 }, true);
  push(Rc, 'b808', { f: n(28), f2: n(28) * 0.9, dur: BEAT * 4, lvl: 1.3, long: true }, true);
  push(Rc, 'pad', { f: [40, 52, 55, 59, 64].map(n), dur: BEAT * 4, cut: 2200, lvl: 1.1 }, true);
  [40, 52].forEach(m => push(Rc, 'vox', { f: n(m), v: 'ah', v2: 'oh', dur: BEAT * 4, cut: 1800, lvl: 0.45 }, true));
  return glue(evs);
}

// Wild's ride-out: its EDM bar, bed and all, as a groove to loop past the
// shot - through the fly-in and onto the table. bar0: the bar it starts on,
// counted from the drop, so the chords carry on in turn. Each bar's events
// are in seconds from the bar's start.
export function wildGroove({ BEAT, bar0 }) {
  return {
    barLen: 4 * BEAT,
    bar(k) {
      const evs = [], c = (bar0 + k) % 4, push = (t, kind, extra) => evs.push(Object.assign({ t, kind }, extra));
      wildBed(push, 0, c, 4 * BEAT - 0.02, 1800, 0.85, (bar0 + k) % 2 === 1);
      for (let beat = 0; beat < 4; beat++) wildEdm(push, beat * BEAT, beat, c, 1, (bar0 + k) % 2 === 0, BEAT);
      return glue(evs);
    }
  };
}
