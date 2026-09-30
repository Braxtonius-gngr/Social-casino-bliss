/* assets/rooms/obsidian.js
   Obsidian Ledger's room: a celestial almanac - quiet, matte and print-like,
   brass instruments and parchment on warm black. Registered with
   showAddRoom() (assets/show.js); everything here is [data-theme="obsidian"]
   in the stylesheet, so it is hidden on any other skin, and with motion off
   it all holds still.

   Held to a real maker: a Georgian table orrery from a London instrument
   maker's bench (lacquered brass, turned boxwood planets, an engraved
   ecliptic plate), and the almanac printed to go with it (letterpress on
   laid paper, a double rule round the page). At three distances - across
   the room (silhouette), at arm's length (materials, bevels, seams) and
   pinched in 3x (engraving, grain, wear) - for what each surface does with
   the one key light (above left, in front of the glass), what it touches
   and how it moves.

   The pieces:
   - Orbit (the edge light) - an almanac's double rule round the glass,
     with a polished brass ball riding in the groove between the rules: a
     clock, one lap a day, where a ray from the middle of the screen at the
     hour hand's angle meets the frame (midnight at the top, six in the
     morning on the right, noon at the bottom). Room: a hairline frame with
     a bright bead on it. Arm: the two rules, the lit length of the outer
     one (today's run, from the top centre clockwise), hour ticks down both
     long edges, closer together where the hours are. 3x: each tick is
     engraved - a dark cut with the lamp catching its lower wall; the ball
     has a pinpoint highlight top left and drops a soft shadow on the glass
     down and right. It moves as a clock does: a minute at a time, too
     little to see.
   - The orrery (the ring round the ready count) - the ecliptic plate of the
     orrery: a warm black plate with an engraved degree scale (every 5
     degrees, the twelve houses cut longer), the planet's path pricked in
     dots, today's run as a lacquered brass arc laid in that path and a
     planet - a sage-painted boxwood ball - at its head. Room: a dark disc,
     a brass arc, a bead. Arm: the scale, the dots, the arc's rounded ends.
     3x: the engraving (a dark cut and a lit wall), the lacquer's warm band
     where it faces the lamp, the planet's terminator and its shadow on the
     plate. The arc winds back a hair, overshoots and settles when the run
     moves (show.js).
   - The planets (the deck's avatars) - each platform a turned boxwood ball,
     painted in a flat earth colour and varnished, its initials cut in and
     filled, with a thin brass ring on two pins: the near half of the ring
     crosses in front of the ball, the far half passes behind it (CSS).
   - A collect - the card's planet takes a moon once round its ring:
     slowly away, quicker through the near side, passing behind the ball on
     the far side, easing to a stop where it began; the run's arc moves on.
   - The payout - when a Daily Run is finished: the orrery breaks out of the
     phone (assets/intro3d/orrery.mjs, loaded on first use).

   Classic script, loaded after show.js and before the inline app script. */

(function () {
  'use strict';
  if (!window.showAddRoom || !window.showKit) return;
  var K = window.showKit;
  var NS = K.NS;
  var root = document.documentElement;
  var here = function () { return root.getAttribute('data-theme') === 'obsidian'; };
  var lively = function () { return here() && K.motionOn(); };
  var f2 = function (v) { return (+v).toFixed(2); };

  // ---------- The type ----------
  // Cormorant Garamond for the wordmark, the names and the status line;
  // Cinzel for labels, tabs and buttons; IBM Plex Mono for numbers and
  // timers. Fetched the first time the room is built, not for every skin.
  var fontsIn = false;
  function loadFonts() {
    if (fontsIn) return;
    fontsIn = true;
    var l = document.createElement('link');
    l.rel = 'stylesheet';
    l.href = 'https://fonts.googleapis.com/css2?family=Cinzel:wght@500;600;700&family=Cormorant+Garamond:ital,wght@0,500;0,600;0,700;1,500;1,600&family=IBM+Plex+Mono:wght@400;500&display=swap';
    document.head.appendChild(l);
  }

  // ---------- Orbit: the edge light ----------
  var edge = null, edgeLit = null, body = null, clockTimer = 0, runNow = 0;
  var RULE = 1.3, RULE2 = 4.6;                    // the outer rule, the inner rule (px in from the edge)
  function framePath(w, h, r, i) {
    var rr = Math.max(0.01, r - i);
    return 'M' + f2(w / 2) + ' ' + f2(i) + 'H' + f2(w - i - rr) + 'A' + f2(rr) + ' ' + f2(rr) + ' 0 0 1 ' + f2(w - i) + ' ' + f2(i + rr) +
      'V' + f2(h - i - rr) + 'A' + f2(rr) + ' ' + f2(rr) + ' 0 0 1 ' + f2(w - i - rr) + ' ' + f2(h - i) +
      'H' + f2(i + rr) + 'A' + f2(rr) + ' ' + f2(rr) + ' 0 0 1 ' + f2(i) + ' ' + f2(h - i - rr) +
      'V' + f2(i + rr) + 'A' + f2(rr) + ' ' + f2(rr) + ' 0 0 1 ' + f2(i + rr) + ' ' + f2(i) + 'Z';
  }
  // Where the hour hand's ray (theta: 0 at the top, clockwise) meets the
  // frame inset i with corner radius r, and which edge it is on.
  function clockPoint(theta, w, h, i, r) {
    var cx = w / 2, cy = h / 2, dx = Math.sin(theta), dy = -Math.cos(theta);
    var tx = dx > 1e-9 ? (w - i - cx) / dx : dx < -1e-9 ? (i - cx) / dx : Infinity;
    var ty = dy > 1e-9 ? (h - i - cy) / dy : dy < -1e-9 ? (i - cy) / dy : Infinity;
    var t = Math.min(tx, ty);
    var x = cx + dx * t, y = cy + dy * t;
    var rr = Math.max(0, r - i);
    var ccx = x < i + rr ? i + rr : x > w - i - rr ? w - i - rr : null;
    var ccy = y < i + rr ? i + rr : y > h - i - rr ? h - i - rr : null;
    if (ccx !== null && ccy !== null && rr > 0) {
      // in a corner: onto the corner's arc along the same ray
      var ox = cx - ccx, oy = cy - ccy;
      var b = ox * dx + oy * dy, c = ox * ox + oy * oy - rr * rr;
      var disc = b * b - c;
      if (disc >= 0) { var tt = -b + Math.sqrt(disc); x = cx + dx * tt; y = cy + dy * tt; }
      return { x: x, y: y, side: 'corner' };
    }
    return { x: x, y: y, side: t === tx ? (dx > 0 ? 'right' : 'left') : (dy > 0 ? 'bottom' : 'top') };
  }
  function dayShare() {
    var d = new Date();
    return (d.getHours() * 3600 + d.getMinutes() * 60 + d.getSeconds()) / 86400;
  }
  function buildEdge() {
    if (edge) return;
    edge = document.createElementNS(NS, 'svg');
    edge.setAttribute('class', 'ob-edge');
    edge.setAttribute('aria-hidden', 'true');
    document.body.appendChild(edge);
    body = document.createElement('div');
    body.className = 'ob-body';
    body.setAttribute('aria-hidden', 'true');
    document.body.appendChild(body);
    layoutEdge();
  }
  function layoutEdge() {
    if (!edge) return;
    var w = window.innerWidth, h = window.innerHeight, r = K.edgeRadius();
    var outer = framePath(w, h, r, RULE), inner = framePath(w, h, Math.max(2, r - (RULE2 - RULE)), RULE2);
    // hour ticks down both long edges: a quarter-hour's hairline, the hour
    // longer, every sixth hour longer still; each an engraved cut - the dark
    // groove and, a hair below it, the wall the lamp lights
    var ticks = '', lits = '';
    for (var k = 0; k < 96; k++) {
      var p = clockPoint(k / 96 * Math.PI * 2, w, h, RULE2, Math.max(2, r - (RULE2 - RULE)));
      if (p.side !== 'left' && p.side !== 'right') continue;
      var len = k % 24 === 0 ? 7 : k % 4 === 0 ? 4.2 : 1.8;
      var dir = p.side === 'right' ? -1 : 1;
      var x0 = p.x + dir * 1.1, x1 = p.x + dir * (1.1 + len);
      ticks += 'M' + f2(x0) + ' ' + f2(p.y) + 'H' + f2(x1);
      lits += 'M' + f2(x0) + ' ' + f2(p.y + 0.55) + 'H' + f2(x1);
    }
    edge.setAttribute('viewBox', '0 0 ' + w + ' ' + h);
    edge.innerHTML = '<path class="ob-rule" d="' + outer + '"/><path class="ob-rule ob-rule-2" d="' + inner + '"/>' +
      '<path class="ob-tick-lit" d="' + lits + '"/><path class="ob-tick" d="' + ticks + '"/>' +
      '<path class="ob-edge-lit" pathLength="1000" d="' + outer + '"/>';
    edgeLit = edge.querySelector('.ob-edge-lit');
    drawEdgeRun(runNow);
    placeBody();
  }
  // the ball: at the hour hand's angle, in the groove between the rules
  function placeBody() {
    if (!body) return;
    var w = window.innerWidth, h = window.innerHeight, r = K.edgeRadius();
    var mid = (RULE + RULE2) / 2;
    var p = clockPoint(dayShare() * Math.PI * 2, w, h, mid, Math.max(2, r - (mid - RULE)));
    body.style.transform = 'translate(' + f2(p.x - 3.6) + 'px,' + f2(p.y - 3.6) + 'px)';
  }
  function drawEdgeRun(f) {
    if (edgeLit) edgeLit.setAttribute('stroke-dasharray', f2(Math.max(0, Math.min(f, 1.02)) * 1000) + ' 1000');
  }
  // a clock: a minute at a time while things move, set once when they hold
  function tickClock() {
    clearInterval(clockTimer);
    placeBody();
    if (lively()) clockTimer = setInterval(function () { if (here()) placeBody(); }, 60000);
  }

  // ---------- The orrery: the ring round the ready count ----------
  var plate = null, arc = null, head = null, headShade = null;
  var ORB = 45.6;                                 // the planet's path, in the plate's 120-unit box
  function buildPlate() {
    var wrap = document.querySelector('.hero-ring-wrapper');
    if (!wrap || plate) return;
    plate = document.createElement('div');
    plate.className = 'ob-plate';
    plate.setAttribute('aria-hidden', 'true');
    // the degree scale: every 5 degrees, the twelve houses cut longer - a
    // dark cut, and the lit wall a hair below-right of it
    var cut = '', wall = '';
    for (var k = 0; k < 72; k++) {
      var a = (k / 72) * Math.PI * 2 - Math.PI / 2, house = k % 6 === 0;
      var r0 = house ? 50.2 : 52.4, r1 = 55.6;
      var c = Math.cos(a), s = Math.sin(a);
      cut += 'M' + f2(60 + r0 * c) + ' ' + f2(60 + r0 * s) + 'L' + f2(60 + r1 * c) + ' ' + f2(60 + r1 * s);
      wall += 'M' + f2(60.35 + r0 * c) + ' ' + f2(60.45 + r0 * s) + 'L' + f2(60.35 + r1 * c) + ' ' + f2(60.45 + r1 * s);
    }
    plate.innerHTML = '<svg viewBox="0 0 120 120"><defs>' +
      '<radialGradient id="obPlate" cx=".42" cy=".38" r=".7"><stop offset="0" stop-color="#1f1c19"/><stop offset=".7" stop-color="#141210"/><stop offset="1" stop-color="#0d0c0b"/></radialGradient>' +
      '<linearGradient id="obArc" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stop-color="#E6CC96"/><stop offset=".45" stop-color="#C29E63"/><stop offset="1" stop-color="#8C6A3A"/></linearGradient>' +
      '<radialGradient id="obHead" cx=".36" cy=".32" r=".75"><stop offset="0" stop-color="#C9D8C3"/><stop offset=".38" stop-color="#8FA98B"/><stop offset=".8" stop-color="#4E6450"/><stop offset="1" stop-color="#2A362C"/></radialGradient>' +
      '<filter id="obSoft" x="-1" y="-1" width="3" height="3"><feGaussianBlur stdDeviation="0.9"/></filter></defs>' +
      // the plate, its turned rim (lit top left, shaded bottom right) and the engraved border
      '<circle cx="60" cy="60" r="57.4" fill="url(#obPlate)"/>' +
      '<circle cx="60" cy="60" r="57.2" fill="none" stroke="rgba(236,229,217,0.08)" stroke-width="0.5"/>' +
      '<circle cx="60" cy="60" r="57.9" fill="none" stroke="rgba(0,0,0,0.6)" stroke-width="0.8"/>' +
      '<circle cx="60" cy="60" r="49.2" fill="none" stroke="rgba(0,0,0,0.55)" stroke-width="0.5"/>' +
      '<circle cx="60.3" cy="60.4" r="49.2" fill="none" stroke="rgba(214,190,140,0.14)" stroke-width="0.35"/>' +
      '<path class="ob-wall" d="' + wall + '"/><path class="ob-cut" d="' + cut + '"/>' +
      // the planet's path, pricked in dots, and the run laid in it
      '<circle class="ob-path" cx="60" cy="60" r="' + ORB + '" pathLength="120"/>' +
      '<circle class="ob-arc" cx="60" cy="60" r="' + ORB + '" pathLength="100" transform="rotate(-90 60 60)" stroke-dasharray="0 100"/>' +
      // where the run begins: a small star cut at the top of the scale
      '<path class="ob-star" d="M60 7.2l.9 2.3 2.3.9-2.3.9-.9 2.3-.9-2.3-2.3-.9 2.3-.9z"/>' +
      '<circle class="ob-head-shade" cx="61" cy="' + (60 - ORB + 1.3) + '" r="3.6" fill="#000" opacity=".55" filter="url(#obSoft)"/>' +
      '<circle class="ob-head" cx="60" cy="' + (60 - ORB) + '" r="3.5" fill="url(#obHead)"/></svg>';
    wrap.insertBefore(plate, wrap.firstChild);
    arc = plate.querySelector('.ob-arc');
    head = plate.querySelector('.ob-head');
    headShade = plate.querySelector('.ob-head-shade');
  }
  function drawPlate(f) {
    if (!arc) return;
    var fc = Math.max(0, f);
    arc.setAttribute('stroke-dasharray', f2(Math.min(fc, 1.04) * 100) + ' 100');
    var a = fc * Math.PI * 2 - Math.PI / 2;
    var x = 60 + ORB * Math.cos(a), y = 60 + ORB * Math.sin(a);
    head.setAttribute('cx', f2(x)); head.setAttribute('cy', f2(y));
    headShade.setAttribute('cx', f2(x + 1)); headShade.setAttribute('cy', f2(y + 1.3));
    var on = fc > 0.005 ? '1' : '0';
    head.style.opacity = on; headShade.style.opacity = fc > 0.005 ? '.55' : '0';
  }

  // ---------- A collect: a moon once round the planet's ring ----------
  function moonRound(card) {
    var wrap = card.querySelector('.avatar-wrap');
    if (!wrap) return;
    var orbit = document.createElement('span');
    orbit.className = 'ob-orbit';
    orbit.setAttribute('aria-hidden', 'true');
    orbit.innerHTML = '<span class="ob-moon"></span>';
    // (no two the same: each moon a little quicker or slower round)
    var d = Math.round(1150 + Math.random() * 220) + 'ms';
    orbit.style.animationDuration = d;
    orbit.firstChild.style.animationDuration = d;
    wrap.appendChild(orbit);
    // (gone when the moon is home; the timer only in case it never ran)
    var done = function () { orbit.remove(); };
    orbit.firstChild.addEventListener('animationend', done);
    setTimeout(done, 6000);
  }

  // ---------- The levels' art ----------
  function mini(level) {
    var dots = '', arcLen = 0.62;
    for (var k = 0; k < 72; k++) {
      var a = (k / 72) * Math.PI * 2 - Math.PI / 2, house = k % 6 === 0;
      var r0 = house ? 17.4 : 18.6;
      dots += 'M' + f2(28 + r0 * Math.cos(a)) + ' ' + f2(28 + r0 * Math.sin(a)) + 'L' + f2(28 + 20.2 * Math.cos(a)) + ' ' + f2(28 + 20.2 * Math.sin(a));
    }
    var ha = arcLen * Math.PI * 2 - Math.PI / 2;
    var hx = 28 + 15.6 * Math.cos(ha), hy = 28 + 15.6 * Math.sin(ha);
    return '<svg class="show-mini" viewBox="0 0 56 56" aria-hidden="true"><rect width="56" height="56" rx="12" fill="#121110"/>' +
      (level === 'lounge' ? '<rect x="2.5" y="2.5" width="51" height="51" rx="10" fill="none" stroke="rgba(176,141,87,0.35)" stroke-width="0.5"/><circle cx="53.4" cy="21" r="1.5" fill="#E6CC96"/>' : '') +
      '<circle cx="28" cy="28" r="21" fill="#191715"/>' +
      '<path d="' + dots + '" stroke="#6d5a3b" stroke-width="0.4"/>' +
      '<circle cx="28" cy="28" r="15.6" fill="none" stroke="#8C6A3A" stroke-width="0.7" stroke-dasharray="0.1 1.6" stroke-linecap="round"/>' +
      '<circle cx="28" cy="28" r="15.6" fill="none" stroke="#C29E63" stroke-width="1.2" stroke-linecap="round" pathLength="100" stroke-dasharray="' + (arcLen * 100) + ' 100" transform="rotate(-90 28 28)"/>' +
      '<circle cx="' + f2(hx) + '" cy="' + f2(hy) + '" r="2.1" fill="' + (level === 'quiet' ? '#6f836c' : '#8FA98B') + '"/>' +
      '<text x="28" y="32.5" text-anchor="middle" fill="#ECE5D9" style="font:600 12.5px Georgia, serif">3</text></svg>';
  }

  // ---------- The payout ----------
  // The breakout is WebGL (three.js, like the landing): its module is only
  // fetched the first time it plays. While it loads, nothing shows.
  var breakout = null, loading = null;
  var HERE = (document.currentScript && document.currentScript.src) || location.href;
  function orreryModule() {
    if (!loading) loading = import(new URL('../intro3d/orrery.mjs', HERE).href).catch(function (e) { loading = null; throw e; });
    return loading;
  }
  function payoutPlay() {
    if (!lively()) return false;
    var wrap = document.querySelector('.hero-ring-wrapper');
    if (!wrap || document.body.classList.contains('r3-table-mode')) return false;
    var r = wrap.getBoundingClientRect();
    if (!r.width) return false;
    var go = function () {
      // (the planets' initials are painted in Cinzel: wait for it)
      var font = document.fonts && document.fonts.load ? document.fonts.load('600 64px Cinzel').catch(function () {}) : null;
      Promise.all([orreryModule(), font]).then(function (all) {
        var m = all[0];
        if (!lively()) return;
        if (!breakout) breakout = m.createBreakout();
        breakout.play({ ring: wrap, platforms: planetsForPayout() });
      }).catch(function (e) { console.warn('orrery', e); });
    };
    if (r.top < 0 || r.bottom > window.innerHeight) {
      wrap.scrollIntoView({ block: 'center', behavior: 'smooth' });
      setTimeout(go, 520);
    } else go();
    return true;
  }
  // today's collected platforms first (the ones the run went through),
  // then the rest of the deck, so the instrument always has five to seven
  function planetsForPayout() {
    var list = typeof trackedGames !== 'undefined' && Array.isArray(trackedGames) ? trackedGames.slice() : [];
    var today = new Date(); today.setHours(0, 0, 0, 0);
    var isDone = function (g) { return g.lastCollected && g.lastCollected >= today.getTime(); };
    var pick = list.filter(isDone).concat(list.filter(function (g) { return !isDone(g); })).slice(0, 7);
    return pick.map(function (g) {
      return { name: g.name, initials: typeof getInitials === 'function' ? getInitials(g.name) : String(g.name || '?').slice(0, 2).toUpperCase(), hue: typeof nameHue === 'function' ? nameHue(g.name) : 30, tier: g.tier };
    });
  }

  window.showAddRoom('obsidian', {
    name: 'Obsidian Ledger',
    lede: 'A celestial almanac at two levels of show: the same brass and parchment on each, with more or less of it moving.',
    showroom: null,
    muted: 'obsidian',
    copy: {
      lounge: 'Your deck with the brass orbit round the glass, a moon on every collect and the orrery that breaks out when a run is done.',
      quiet: 'Your deck, held still. The same brass and parchment, nothing moving, easiest on battery.'
    },
    mini: mini,
    build: function () { loadFonts(); buildEdge(); buildPlate(); drawPlate(runNow); tickClock(); },
    layout: function () { layoutEdge(); },
    run: function (f) { runNow = f; drawEdgeRun(f); drawPlate(f); },
    collect: moonRound,
    payout: {
      label: 'PLAY THE ORRERY',
      play: payoutPlay,
      clear: function () { if (breakout) breakout.clear(); },
      busy: function () { return !!(breakout && breakout.busy()); }
    }
  });
  // (the clock stops when things hold still, and starts again)
  window.addEventListener('focus', function () { if (here()) tickClock(); });
})();
