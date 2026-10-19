/* assets/rooms/burin.js
   Burin & Brimstone's room: a white-line engraving of hell. Registered with
   showAddRoom() (assets/show.js); everything here is [data-theme="burin"] in
   the stylesheet, so it is hidden on any other skin, and with motion off it
   all holds still.

   The craft the whole skin is held to is the engraver's - the one the card
   back came from. A burin (a square steel rod ground to a lozenge point,
   set in a mushroom handle that sits in the palm) is pushed through the
   plate; the line it cuts is wider where the hand leans in. This room is a
   WHITE-LINE engraving (Bewick's craft): the ground is the ink, the cuts
   print as the paper's bone, so a form is lit by being cut more. The one
   thing on the page that is not cut is the blood, which is wet.

   Held to real makers, at three distances - across the room (silhouette),
   at arm's length (materials, bevels, seams) and pinched in 3x (engraving,
   grain, wear) - for what each surface does with the one key light (above
   left, in front of the glass), what it touches and how it moves.

   - The plate mark (the edge light) - the impression a printing plate
     leaves round its print, after a banknote engraver's border: two rules
     a hair apart round the inside of the glass and, between them, a band
     of short slanted cuts, the border's hatch. Today's run is how much of
     the band has been cut: from the top middle, clockwise. Room: a pale
     frame, its cut length bright. Arm: the uncut band is the plate's
     burnish, a grey a hair off the ground; a cut line is bone, with a
     darker hairline beside it where the burr was left; the head of the cut
     is the burin's point, a steel lozenge with one lit facet, a curl of
     copper swarf standing off it. 3x: the cuts are each a hair different
     in length and lean; the swarf is a spiral of three turns with a bright
     edge. The point advances with weight (show.js), and shivers a little
     as it cuts.
   - The wheel (the ring round the ready count) - the breaking wheel from
     the valley, cut in bone line: a felloe of eight, eight spokes, a hub
     with its iron pin. Today's run is the wheel catching: from the top
     spoke clockwise its lines go from bone to ember to a dull red char,
     sparks lifting off the burning length, and the burnt length a little
     ragged. Room: a wheel, part of it burning. Arm: the felloe's joints,
     the hub's pin, the heat's gradient. 3x: the cuts of each spoke swell
     toward the hub; the sparks are short lines, never on a beat. It turns,
     very slowly (one turn in ninety seconds), as a wheel on a pole does in
     the wind; the count inside it does not.
   - The drop (a collect) - a drop of blood, wet and real (the only thing
     on the plate that is not cut), falls onto the card and bursts: six to
     nine rivulets run down from where it lands, each its own length and
     wobble, a bead at each one's foot, a sheen across them; then it dries
     to a dull red and sinks into the lines. Never twice alike.
   - The payout - when a Daily Run is finished: the plate bleeds
     (assets/intro3d/bleed.mjs, loaded on first use): blood wells out of
     the plate mark along the top and runs down the glass in rivulets, some
     behind the deck and some over it, pools along the foot of the screen
     and drips through; it rests there, wet, until the next touch.

   Classic script, loaded after show.js and before the inline app script.
   The type (IM Fell English, IM Fell English SC, Pinyon Script) is fetched
   when the room is first built. */

(function () {
  'use strict';
  if (!window.showAddRoom || !window.showKit) return;
  var K = window.showKit;
  var NS = K.NS;
  var root = document.documentElement;
  var here = function () { return root.getAttribute('data-theme') === 'burin'; };
  var lively = function () { return here() && K.motionOn(); };
  var f2 = function (v) { return (+v).toFixed(2); };
  var HERE = (document.currentScript && document.currentScript.src) || location.href;

  // ---------- The type ----------
  var fontsIn = false;
  function loadFonts() {
    if (fontsIn) return;
    fontsIn = true;
    var l = document.createElement('link');
    l.rel = 'stylesheet';
    l.href = 'https://fonts.googleapis.com/css2?family=IM+Fell+English:ital@0;1&family=IM+Fell+English+SC&family=IM+Fell+DW+Pica:ital@0;1&family=Pinyon+Script&display=swap';
    document.head.appendChild(l);
  }

  // ---------- The plate mark: the edge light ----------
  var edge = null, cutP = null, burrP = null, point = null, swarf = null, probe = null, runNow = 0, shiverT = 0;
  var R1 = 2.2, R2 = 9.8;                       // the two rules, px in from the edge
  function framePath(w, h, r, i) {
    var rr = Math.max(0.01, r - i);
    return 'M' + f2(w / 2) + ' ' + f2(i) + 'H' + f2(w - i - rr) + 'A' + f2(rr) + ' ' + f2(rr) + ' 0 0 1 ' + f2(w - i) + ' ' + f2(i + rr) +
      'V' + f2(h - i - rr) + 'A' + f2(rr) + ' ' + f2(rr) + ' 0 0 1 ' + f2(w - i - rr) + ' ' + f2(h - i) +
      'H' + f2(i + rr) + 'A' + f2(rr) + ' ' + f2(rr) + ' 0 0 1 ' + f2(i) + ' ' + f2(h - i - rr) +
      'V' + f2(i + rr) + 'A' + f2(rr) + ' ' + f2(rr) + ' 0 0 1 ' + f2(i + rr) + ' ' + f2(i) + 'Z';
  }
  function buildEdge() {
    if (edge) return;
    edge = document.createElementNS(NS, 'svg');
    edge.setAttribute('class', 'bb-edge');
    edge.setAttribute('aria-hidden', 'true');
    document.body.appendChild(edge);
    layoutEdge();
  }
  // the band's hatch: short cuts slanting across between the rules, laid
  // along the frame's own line so they turn with the corners
  function layoutEdge() {
    if (!edge) return;
    var w = window.innerWidth, h = window.innerHeight, r = K.edgeRadius() + 2;
    var mid = (R1 + R2) / 2, path = framePath(w, h, r, mid);
    edge.setAttribute('viewBox', '0 0 ' + w + ' ' + h);
    edge.innerHTML =
      '<defs><filter id="bbSoft" x="-50%" y="-50%" width="200%" height="200%"><feGaussianBlur stdDeviation="1.4"/></filter></defs>' +
      '<path class="bb-rule" d="' + framePath(w, h, r, R1) + '"/><path class="bb-rule" d="' + framePath(w, h, r - (R2 - R1), R2) + '"/>' +
      '<path class="bb-probe" d="' + path + '" pathLength="1000"/>' +
      '<g class="bb-band-uncut"></g><g class="bb-band-cut"></g><g class="bb-band-burr"></g>' +
      '<g class="bb-point"><path class="bb-swarf" d="M0 -3 c3 -4 7 -2 5 2 c-1.5 3 -5 3 -5.5 0.5 c-0.3 -1.6 1.6 -2.2 2.2 -0.8"/>' +
      '<path class="bb-burin" d="M0 0 L-2.2 -1.3 L-6 -0.4 L-6 0.4 L-2.2 1.3 Z"/><path class="bb-burin-lit" d="M0 0 L-2.2 -1.3 L-6 -0.4 Z"/></g>';
    probe = edge.querySelector('.bb-probe');
    point = edge.querySelector('.bb-point');
    swarf = edge.querySelector('.bb-swarf');
    // the cuts along the band, each a hair different
    var L = probe.getTotalLength(), n = Math.round(L / 5.2), un = '', cut = '', burr = '';
    var seed = 17;
    var rnd = function () { seed = (Math.imul(seed, 1664525) + 1013904223) >>> 0; return seed / 4294967296; };
    for (var k = 0; k < n; k++) {
      var s = (k + 0.5) / n * L, p = probe.getPointAtLength(s), q = probe.getPointAtLength(Math.min(L, s + 0.5));
      var tx = q.x - p.x, ty = q.y - p.y, tm = Math.hypot(tx, ty) || 1; tx /= tm; ty /= tm;
      var nx = -ty, ny = tx;                       // across the band
      var lean = 0.62 + (rnd() - 0.5) * 0.18, half = (R2 - R1) / 2 * (0.78 + rnd() * 0.2);
      var dx = (nx * Math.cos(lean) + tx * Math.sin(lean)) * half, dy = (ny * Math.cos(lean) + ty * Math.sin(lean)) * half;
      var d = 'M' + f2(p.x - dx) + ' ' + f2(p.y - dy) + 'L' + f2(p.x + dx) + ' ' + f2(p.y + dy);
      un += '<path d="' + d + '"/>';
      cut += '<path d="' + d + '" data-s="' + f2(s / L) + '"/>';
      burr += '<path d="' + d + '" transform="translate(' + f2(ny * 0.7) + ' ' + f2(-nx * 0.7) + ')" data-s="' + f2(s / L) + '"/>';
    }
    edge.querySelector('.bb-band-uncut').innerHTML = un;
    edge.querySelector('.bb-band-cut').innerHTML = cut;
    edge.querySelector('.bb-band-burr').innerHTML = burr;
    cutP = edge.querySelectorAll('.bb-band-cut path');
    burrP = edge.querySelectorAll('.bb-band-burr path');
    drawEdge(runNow);
  }
  function drawEdge(f) {
    if (!cutP) return;
    var fc = Math.max(0, Math.min(f, 1));
    for (var k = 0; k < cutP.length; k++) {
      var on = +cutP[k].getAttribute('data-s') <= fc;
      cutP[k].style.opacity = on ? '' : '0';
      burrP[k].style.opacity = on ? '' : '0';
    }
    if (probe && probe.getTotalLength) {
      var L = probe.getTotalLength(), pt = probe.getPointAtLength(L * fc), q = probe.getPointAtLength(Math.min(L, L * fc + 1));
      var a = Math.atan2(q.y - pt.y, q.x - pt.x) * 180 / Math.PI;
      point.setAttribute('transform', 'translate(' + f2(pt.x) + ' ' + f2(pt.y) + ') rotate(' + f2(a) + ')');
      point.style.opacity = fc > 0.002 && fc < 0.998 ? '' : '0';
    }
  }
  // the point shivers as it cuts (a burin in copper is never quite steady)
  function shiverLater() {
    clearTimeout(shiverT);
    shiverT = setTimeout(function () {
      if (point && lively() && point.animate && runNow > 0.002 && runNow < 0.998) {
        var g = point.querySelector('.bb-burin');
        g.animate([{ transform: 'translate(0,0)' }, { transform: 'translate(-0.5px,0.3px)' }, { transform: 'translate(0.3px,-0.2px)' }, { transform: 'translate(0,0)' }], { duration: 140 + Math.random() * 120, easing: 'steps(3,end)' });
        if (Math.random() < 0.4) swarf.animate([{ transform: 'rotate(0deg)' }, { transform: 'rotate(' + (Math.random() * 40 - 20) + 'deg)' }], { duration: 400, easing: 'ease-out', fill: 'forwards' });
      }
      shiverLater();
    }, 700 + Math.random() * 900);
  }

  // ---------- The wheel: the ring round the ready count ----------
  var wheel = null, heat = null, sparks = null, sparkT = 0, spin = 0, spinRaf = 0, spinLast = 0;
  var WR = 46, HUB = 7;
  function buildWheel() {
    var wrap = document.querySelector('.hero-ring-wrapper');
    if (!wrap || wheel) return;
    wheel = document.createElement('div');
    wheel.className = 'bb-wheel';
    wheel.setAttribute('aria-hidden', 'true');
    // the felloe in eight, its joints; eight spokes swelling to the hub
    var fell = '', spokes = '', joints = '', heatArcs = '';
    for (var k = 0; k < 8; k++) {
      var a0 = k / 8 * Math.PI * 2 - Math.PI / 2, a1 = (k + 1) / 8 * Math.PI * 2 - Math.PI / 2;
      var x0 = 60 + Math.cos(a0) * WR, y0 = 60 + Math.sin(a0) * WR, x1 = 60 + Math.cos(a1) * WR, y1 = 60 + Math.sin(a1) * WR;
      fell += 'M' + f2(x0) + ' ' + f2(y0) + 'A' + WR + ' ' + WR + ' 0 0 1 ' + f2(x1) + ' ' + f2(y1);
      joints += 'M' + f2(60 + Math.cos(a0) * (WR - 4)) + ' ' + f2(60 + Math.sin(a0) * (WR - 4)) + 'L' + f2(60 + Math.cos(a0) * (WR + 4)) + ' ' + f2(60 + Math.sin(a0) * (WR + 4));
      var am = a0 + Math.PI / 8, sx0 = 60 + Math.cos(am) * (HUB + 1), sy0 = 60 + Math.sin(am) * (HUB + 1), sx1 = 60 + Math.cos(am) * (WR - 2), sy1 = 60 + Math.sin(am) * (WR - 2);
      // (a spoke is three cuts: a heavy one and two hairlines beside it that
      // converge at the rim - the swell toward the hub)
      var px = -Math.sin(am), py = Math.cos(am);
      spokes += '<path class="bb-spoke" d="M' + f2(sx0) + ' ' + f2(sy0) + 'L' + f2(sx1) + ' ' + f2(sy1) + '"/>' +
        '<path class="bb-spoke-fine" d="M' + f2(sx0 + px * 1.9) + ' ' + f2(sy0 + py * 1.9) + 'L' + f2(sx1 + px * 0.5) + ' ' + f2(sy1 + py * 0.5) + 'M' + f2(sx0 - px * 1.9) + ' ' + f2(sy0 - py * 1.9) + 'L' + f2(sx1 - px * 0.5) + ' ' + f2(sy1 - py * 0.5) + '"/>';
      heatArcs += '<path class="bb-heat-spoke" data-k="' + k + '" d="M' + f2(sx0) + ' ' + f2(sy0) + 'L' + f2(sx1) + ' ' + f2(sy1) + '"/>';
    }
    wheel.innerHTML = '<svg viewBox="0 0 120 120"><defs>' +
      '<linearGradient id="bbHeat" x1="0" y1="0" x2="1" y2="0"><stop offset="0" stop-color="#5a1008"/><stop offset=".45" stop-color="#8E0E0E"/><stop offset=".8" stop-color="#D2451E"/><stop offset="1" stop-color="#F2B46A"/></linearGradient>' +
      '<filter id="bbHeatBloom" x="-30%" y="-30%" width="160%" height="160%"><feGaussianBlur stdDeviation="2.4"/></filter></defs>' +
      '<g class="bb-wheel-turn">' +
      '<path class="bb-fell-under" d="' + fell + '"/><path class="bb-fell" d="' + fell + '"/><path class="bb-fell-fine" d="' + fell + '" transform="translate(0.9 0.9)"/>' +
      '<path class="bb-joint" d="' + joints + '"/>' + spokes +
      '<circle class="bb-hub" cx="60" cy="60" r="' + HUB + '"/><circle class="bb-pin" cx="60" cy="60" r="2.1"/>' +
      '<g class="bb-heat-g" transform="rotate(-90 60 60)"><circle class="bb-heat bb-heat-bloom" cx="60" cy="60" r="' + WR + '" pathLength="100" filter="url(#bbHeatBloom)"/>' +
      '<circle class="bb-heat bb-heat-body" cx="60" cy="60" r="' + WR + '" pathLength="100"/></g><g class="bb-heat-spokes">' + heatArcs + '</g>' +
      '<g class="bb-sparks">' + [0, 1, 2, 3, 4, 5].map(function () { return '<line class="bb-spark"/>'; }).join('') + '</g>' +
      '</g></svg>';
    wrap.insertBefore(wheel, wrap.firstChild);
    heat = wheel.querySelectorAll('.bb-heat');
    sparks = wheel.querySelectorAll('.bb-spark');
    wheel._spokes = wheel.querySelectorAll('.bb-heat-spoke');
    wheel._turn = wheel.querySelector('.bb-wheel-turn');
  }
  function drawWheel(f) {
    if (!heat) return;
    var fc = Math.max(0, Math.min(f, 1.03)), len = fc * 100;
    heat.forEach(function (c) { c.setAttribute('stroke-dasharray', f2(len) + ' 100'); c.setAttribute('stroke-dashoffset', '0'); c.style.opacity = fc > 0.004 ? '' : '0'; });
    // a spoke catches once the fire has passed its foot on the felloe
    wheel._spokes.forEach(function (s) { var k = +s.getAttribute('data-k'); s.style.opacity = fc * 8 > k + 0.5 ? '' : '0'; });
    var a = (fc * 360 - 90) * Math.PI / 180;
    wheel._head = [60 + WR * Math.cos(a), 60 + WR * Math.sin(a)];
    sparks.forEach(function (s) {
      var ang = a + (Math.random() - 0.5) * 1.6, l = 3 + Math.random() * 6;
      s.setAttribute('x1', f2(wheel._head[0])); s.setAttribute('y1', f2(wheel._head[1]));
      s.setAttribute('x2', f2(wheel._head[0] + Math.cos(ang) * l)); s.setAttribute('y2', f2(wheel._head[1] + Math.sin(ang) * l));
      s.style.opacity = fc > 0.004 && fc < 0.998 ? '' : '0';
    });
  }
  // sparks off the burning head now and then; the wheel turns on its pole
  function sparkLater() {
    clearTimeout(sparkT);
    sparkT = setTimeout(function () {
      if (wheel && lively() && runNow > 0.004 && runNow < 0.998) {
        drawWheel(runNow);
        sparks.forEach(function (s, k) { if (Math.random() < 0.6) s.animate([{ opacity: 0.95, strokeDashoffset: 0 }, { opacity: 0, strokeDashoffset: -12 }], { duration: 300 + Math.random() * 300, delay: k * 30, easing: 'ease-out', fill: 'forwards' }); });
      }
      sparkLater();
    }, 500 + Math.random() * 900);
  }
  function turn(now) {
    spinRaf = 0;
    if (!wheel || !lively()) return;
    if (spinLast) spin += (now - spinLast) / 90000 * 360;
    spinLast = now;
    wheel._turn.setAttribute('transform', 'rotate(' + f2(spin % 360) + ' 60 60)');
    // (slow: a frame every 120 ms is plenty for 4 degrees a second)
    setTimeout(function () { if (!spinRaf) spinRaf = requestAnimationFrame(turn); }, 120);
  }

  // ---------- A collect: the drop ----------
  function collect(card) {
    if (!lively() || !card) return;
    var box = card.getBoundingClientRect();
    if (!box.width || box.bottom < 0 || box.top > window.innerHeight) return;
    var W = box.width, H = box.height;
    var x = W * (0.3 + Math.random() * 0.4), y = H * (0.14 + Math.random() * 0.2);
    // the splat: an irregular blot (a drop that struck and spread), a few
    // satellite spots flung from it, a sheen on its crown
    var pts = '', n0 = 14, r0 = 5 + Math.random() * 3;
    for (var q = 0; q < n0; q++) { var a = q / n0 * Math.PI * 2, rr = r0 * (0.7 + Math.random() * 0.6) * (q % 4 === 0 ? 1.5 : 1); pts += (q ? 'L' : 'M') + f2(x + Math.cos(a) * rr) + ' ' + f2(y + Math.sin(a) * rr * 0.85); }
    var sats = '';
    for (var s = 0; s < 4; s++) { var sa = Math.random() * Math.PI * 2, sd = r0 * (1.6 + Math.random() * 2.2); sats += '<circle cx="' + f2(x + Math.cos(sa) * sd) + '" cy="' + f2(y + Math.sin(sa) * sd * 0.8) + '" r="' + f2(0.5 + Math.random() * 1.1) + '"/>'; }
    // the runs: six to nine, each its own length, width and wobble, a bead
    // at the foot of each, the long ones thinning as they go
    var n = 6 + Math.floor(Math.random() * 4), paths = '', beads = '';
    for (var k = 0; k < n; k++) {
      var l = 14 + Math.pow(Math.random(), 1.6) * (H - y - 22), dx = (Math.random() - 0.5) * 16, wob = (Math.random() - 0.5) * 9, w = 0.7 + Math.random() * 1.5;
      var d = 'M' + f2(x + dx * 0.3) + ' ' + f2(y) + 'C' + f2(x + dx * 0.3 + wob) + ' ' + f2(y + l * 0.35) + ' ' + f2(x + dx - wob) + ' ' + f2(y + l * 0.7) + ' ' + f2(x + dx) + ' ' + f2(y + l);
      paths += '<path class="bb-run" d="' + d + '" stroke-width="' + f2(w) + '" pathLength="100"/><path class="bb-run-lit" d="' + d + '" stroke-width="' + f2(Math.max(0.3, w * 0.35)) + '" pathLength="100" transform="translate(-0.35 0)"/>';
      beads += '<circle class="bb-bead" cx="' + f2(x + dx) + '" cy="' + f2(y + l) + '" r="' + f2(w * 0.95 + 0.7) + '"/><circle class="bb-bead-lit" cx="' + f2(x + dx - w * 0.35) + '" cy="' + f2(y + l - w * 0.4) + '" r="' + f2(w * 0.3 + 0.15) + '"/>';
    }
    var svg = document.createElementNS(NS, 'svg');
    svg.setAttribute('class', 'bb-drop');
    svg.setAttribute('viewBox', '0 0 ' + f2(W) + ' ' + f2(H));
    svg.setAttribute('aria-hidden', 'true');
    svg.innerHTML = '<g class="bb-runs">' + paths + '</g><g class="bb-beads">' + beads + '</g><path class="bb-splat" d="' + pts + 'Z"/><g class="bb-sats">' + sats + '</g><ellipse class="bb-sheen" cx="' + f2(x - r0 * 0.35) + '" cy="' + f2(y - r0 * 0.3) + '" rx="' + f2(r0 * 0.34) + '" ry="' + f2(r0 * 0.2) + '" transform="rotate(-25 ' + f2(x) + ' ' + f2(y) + ')"/>';
    card.appendChild(svg);
    // the drop lands (the splat grows in a snap), the runs grow down over
    // their own time, the beads arrive with them; then it dries darker and
    // sinks into the lines
    var dur = 900 + Math.random() * 500;
    svg.querySelector('.bb-splat').animate([{ transform: 'scale(0.2)', transformOrigin: f2(x) + 'px ' + f2(y) + 'px' }, { transform: 'scale(1.12)', transformOrigin: f2(x) + 'px ' + f2(y) + 'px', offset: 0.6 }, { transform: 'scale(1)', transformOrigin: f2(x) + 'px ' + f2(y) + 'px' }], { duration: 220, easing: 'cubic-bezier(.2,.8,.3,1)', fill: 'forwards' });
    svg.querySelectorAll('.bb-runs path').forEach(function (p, k) { p.animate([{ strokeDasharray: '0 100' }, { strokeDasharray: '100 100' }], { duration: dur * (0.6 + Math.random() * 0.4), delay: 120 + (k >> 1) * 45, easing: 'cubic-bezier(.3,.6,.5,1)', fill: 'forwards' }); });
    svg.querySelectorAll('.bb-beads circle').forEach(function (b, k) { b.animate([{ opacity: 0 }, { opacity: 0, offset: 0.7 }, { opacity: 1 }], { duration: dur, delay: 120 + (k >> 1) * 45, fill: 'forwards' }); });
    svg.animate([{ opacity: 1, filter: 'saturate(1.2) brightness(1.08)' }, { opacity: 1, filter: 'saturate(1.2) brightness(1.08)', offset: 0.45 }, { opacity: 0.6, filter: 'saturate(0.7) brightness(0.65)', offset: 0.88 }, { opacity: 0, filter: 'saturate(0.6) brightness(0.55)' }], { duration: 4600, easing: 'ease-in', fill: 'forwards' }).onfinish = function () { svg.remove(); };
  }

  // ---------- The levels' art ----------
  // (Showroom's: the valley - the wheel on its pole, the gibbet, the river)
  var MINI_VALLEY = '<svg class="show-mini" viewBox="0 0 56 56" aria-hidden="true"><rect width="56" height="56" rx="12" fill="#140B08"/>' +
    '<g fill="none" stroke="#E8DCC0" stroke-width="0.8"><path d="M4 40c8-6 14-2 22-6s12-8 26-6"/><path d="M4 44c8-6 14-2 22-6s12-8 26-6" opacity=".5"/><path d="M4 48c8-6 14-2 22-6s12-8 26-6" opacity=".3"/>' +
    '<path d="M10 36V18M10 18h7M17 18v5"/><circle cx="40" cy="22" r="6"/><path d="M40 16v12M34 22h12M36 18l8 8M44 18l-8 8M40 28v10"/></g>' +
    '<path d="M4 52c10-4 20 0 30-3s12-2 18-4" fill="none" stroke="#8E0E0E" stroke-width="1.6"/></svg>';
  function mini(level) {
    if (level === 'showroom') return MINI_VALLEY;
    var lounge = level === 'lounge';
    return '<svg class="show-mini" viewBox="0 0 56 56" aria-hidden="true"><defs>' +
      '<linearGradient id="bbMiniHeat" x1="0" y1="1" x2="1" y2="0"><stop offset="0" stop-color="#8E0E0E"/><stop offset=".7" stop-color="#D2451E"/><stop offset="1" stop-color="#F2B46A"/></linearGradient></defs>' +
      '<rect width="56" height="56" rx="12" fill="#140B08"/>' +
      '<rect x="3.5" y="3.5" width="49" height="49" rx="11" fill="none" stroke="rgba(232,220,192,0.25)" stroke-width="1"/>' +
      '<rect x="6" y="6" width="44" height="44" rx="9" fill="none" stroke="rgba(232,220,192,0.25)" stroke-width="0.7"/>' +
      '<rect x="4.7" y="4.7" width="46.6" height="46.6" rx="10" fill="none" stroke="#E8DCC0" stroke-width="2.2" pathLength="100" stroke-dasharray="4 2" stroke-dashoffset="0" opacity=".9"/>' +
      '<circle cx="28" cy="28" r="14" fill="none" stroke="#E8DCC0" stroke-width="1.1"/>' +
      '<path d="M28 14v28M14 28h28M18 18l20 20M38 18L18 38" stroke="#E8DCC0" stroke-width=".8"/>' +
      '<circle cx="28" cy="28" r="14" fill="none" stroke="' + (lounge ? 'url(#bbMiniHeat)' : '#8E0E0E') + '" stroke-width="2.6" pathLength="100" stroke-dasharray="57 100" transform="rotate(-90 28 28)"' + (lounge ? ' style="filter:drop-shadow(0 0 2px #D2451E)"' : '') + '/>' +
      '<circle cx="28" cy="28" r="4.5" fill="#140B08" stroke="#E8DCC0" stroke-width="1"/>' +
      '<text x="28" y="31.5" text-anchor="middle" fill="#E8DCC0" style="font:600 10px \'IM Fell English\', Georgia, serif">3</text></svg>';
  }

  // ---------- The payout: the plate bleeds ----------
  var breakout = null, loading = null;
  function bleedModule() {
    if (!loading) loading = import(new URL('../intro3d/bleed.mjs', HERE).href).catch(function (e) { loading = null; throw e; });
    return loading;
  }
  function payoutPlay(info) {
    if (!lively() || document.body.classList.contains('r3-table-mode')) return false;
    var wrap = document.querySelector('.hero-ring-wrapper');
    if (!wrap) return false;
    var count = info && info.collected > 0 ? info.collected : parseInt((document.getElementById('heroCount') || {}).textContent, 10) || 1;
    bleedModule().then(function (m) {
      if (!lively()) return;
      if (!breakout) breakout = m.createBreakout();
      var go = function () { breakout.play({ ring: wrap, run: K.run() || 0, count: count }); };
      if (breakout.busy()) breakout.fold(go); else go();
    }).catch(function (e) { console.warn('bleed', e); });
    return true;
  }

  window.showAddRoom('burin', {
    name: 'Burin & Brimstone',
    lede: 'Hell, cut in copper, at three levels of show: the same deck on each, more or less of it alive. Showroom is all of it — the dice, then the valley, your platforms the souls on its road.',
    showroom: 'brimstone',
    muted: 'burin',
    copy: {
      showroom: 'The valley is your home: a gaming table on a rock over the river of blood, the dance of death on the ridge behind the dealer, your platforms the souls it leads, each with a lantern. Uses the most battery.',
      lounge: 'Your deck as a white-line engraving: the plate mark cut round it with the day’s run, the breaking wheel catching fire round the ready count, a drop of blood on every collect, and the plate bleeding when a run is done.',
      quiet: 'Your deck, held still. The same plate mark and wheel, nothing burning or bleeding, easiest on battery.'
    },
    mini: mini,
    build: function () { loadFonts(); buildEdge(); buildWheel(); drawWheel(runNow); drawEdge(runNow); if (!shiverT) shiverLater(); if (!sparkT) sparkLater(); if (!spinRaf && lively()) { spinLast = 0; spinRaf = requestAnimationFrame(turn); } },
    layout: function () { layoutEdge(); },
    run: function (f) { runNow = f; drawWheel(f); drawEdge(f); },
    collect: collect,
    payout: {
      label: 'BLEED THE PLATE',
      play: payoutPlay,
      clear: function () { if (breakout) breakout.clear(); },
      busy: function () { return !!(breakout && breakout.busy()); }
    }
  });
  window.burinRoom = { breakout: function () { return breakout; }, load: bleedModule, collect: collect, drawEdge: drawEdge, drawWheel: drawWheel };
})();
