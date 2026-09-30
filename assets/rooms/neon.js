/* assets/rooms/neon.js
   Neon Grid's room: synthwave night - real neon round the glass, a red
   moon and a grid that runs out of the screen. Registered with
   showAddRoom() (assets/show.js); everything here is [data-theme="neon"]
   in the stylesheet, so it is hidden on any other skin, and with motion off
   it all holds still.

   Held to a real maker: a neon sign shop - glass tube softened over a
   ribbon burner and bent by hand, pumped, filled and bombarded; electrodes
   sealed into each end, the tube held off its backplate by glass-and-wire
   standoffs - and the arcade the signs hang in. At three distances -
   across the room (silhouette), at arm's length (materials, bevels, seams)
   and pinched in 3x (the glass, the gas, the metal) - for what each
   surface does with the one key light (above left, in front of the glass),
   what it touches and how it moves.

   The pieces:
   - The tube (the edge light) - one length of glass tube bent round the
     glass, its two electrodes sealed in at the top middle, where the run
     starts. Room: a rainbow line round the screen with its glow thrown on
     the page. Arm: today's run is the lit length, the rest bare glass - a
     pale tube with a lamp line along its top and left; the gas colour
     flows along the lit length, once round in 8 s; a standoff every hand's
     width. 3x: the lit tube is a hot, near-white core in a saturated
     sheath; it dims over its last few millimetres into each electrode
     (the dark space a real tube has there), each electrode a dark
     housing with a bright metal band; the standoffs are clear glass
     studs with a wire twist, a spark on each. A collect pulses the glow
     once: a dip as the transformer takes the load, a swell past, a settle.
   - The ring (round the ready count) - a hand-bent neon circle on a
     spun-aluminium backplate. Room: a red ring with a white-hot core and
     its bloom. Arm: the lit arc is the run, the rest bare glass; four
     standoffs clip it to the plate; the plate is spun - fine concentric
     lines, two bright wedges where the lamp catches them (top left and
     bottom right). 3x: the tube's wall (a lamp line along its outer edge,
     a darker inner edge where the glass is thickest), the electrodes at
     twelve o'clock, the clips' screws. The arc moves with weight (show.js).
   - The bubbles (a collect) - glass beads rising in a lit column into the
     ring: each clear, a spark top left, its far rim bright where it bends
     the light (bottom right), cyan from the ring it rises into; no two the
     same size, speed or wobble, and each is gone when it meets the tube.
   - The payout - when a Daily Run is finished: Moonrise
     (assets/intro3d/moonrise.mjs, loaded on first use).

   Classic script, loaded after show.js and before the inline app script. */

(function () {
  'use strict';
  if (!window.showAddRoom || !window.showKit) return;
  var K = window.showKit;
  var NS = K.NS;
  var root = document.documentElement;
  var here = function () { return root.getAttribute('data-theme') === 'neon'; };
  var lively = function () { return here() && K.motionOn(); };
  var f2 = function (v) { return (+v).toFixed(2); };

  // ---------- The type ----------
  // Tilt Neon for the wordmark (a sign-writer's single-stroke neon hand),
  // Rajdhani for the UI, names and buttons, Orbitron for numbers and timers.
  // Fetched the first time the room is built, not for every skin.
  var fontsIn = false;
  function loadFonts() {
    if (fontsIn) return;
    fontsIn = true;
    var l = document.createElement('link');
    l.rel = 'stylesheet';
    l.href = 'https://fonts.googleapis.com/css2?family=Orbitron:wght@500;700&family=Rajdhani:wght@500;600;700&family=Tilt+Neon&display=swap';
    document.head.appendChild(l);
  }

  // ---------- The tube: the edge light ----------
  var edge = null, runMask = null, runNow = 0, glowG = null;
  var INSET = 3.4;                              // the tube's centre line, px in from the glass's edge
  var GAP = 7;                                  // half the gap at the top middle, where the electrodes are
  // the frame from the top middle clockwise round to the top middle again,
  // leaving the electrodes' gap at the start and the end
  function framePath(w, h, r, i, gap) {
    var rr = Math.max(0.01, r - i);
    return 'M' + f2(w / 2 + gap) + ' ' + f2(i) + 'H' + f2(w - i - rr) + 'A' + f2(rr) + ' ' + f2(rr) + ' 0 0 1 ' + f2(w - i) + ' ' + f2(i + rr) +
      'V' + f2(h - i - rr) + 'A' + f2(rr) + ' ' + f2(rr) + ' 0 0 1 ' + f2(w - i - rr) + ' ' + f2(h - i) +
      'H' + f2(i + rr) + 'A' + f2(rr) + ' ' + f2(rr) + ' 0 0 1 ' + f2(i) + ' ' + f2(h - i - rr) +
      'V' + f2(i + rr) + 'A' + f2(rr) + ' ' + f2(rr) + ' 0 0 1 ' + f2(i + rr) + ' ' + f2(i) + 'H' + f2(w / 2 - gap);
  }
  function buildEdge() {
    if (edge) return;
    edge = document.createElementNS(NS, 'svg');
    edge.setAttribute('class', 'nn-edge');
    edge.setAttribute('aria-hidden', 'true');
    document.body.appendChild(edge);
    layoutEdge();
  }
  // The gas colour along the tube: short runs of path, each its own hue, so
  // the colour follows the tube round its corners (a gradient on a stroke
  // only runs in a straight line). The whole svg's hue turns in CSS, so the
  // colours flow along it; greys (the bare glass, the metal) don't turn.
  function layoutEdge() {
    if (!edge) return;
    var w = window.innerWidth, h = window.innerHeight, r = K.edgeRadius() + 2;
    var d = framePath(w, h, r, INSET, GAP);
    // a hidden path to measure along
    var probe = document.createElementNS(NS, 'path');
    probe.setAttribute('d', d);
    edge.setAttribute('viewBox', '0 0 ' + w + ' ' + h);
    edge.innerHTML = '';
    edge.appendChild(probe);
    var L = probe.getTotalLength();
    var N = Math.max(90, Math.round(L / 14));
    var segs = [];
    for (var k = 0; k < N; k++) {
      var a = probe.getPointAtLength(L * k / N), b = probe.getPointAtLength(L * (k + 1) / N), m = probe.getPointAtLength(L * (k + 0.5) / N);
      // (overlapping a hair, so the joins don't show)
      var hue = Math.round((330 + 360 * (k + 0.5) / N) % 360);
      // the last few millimetres into each electrode: the dark space
      var u = (k + 0.5) / N, endDim = Math.min(1, Math.min(u, 1 - u) * L / 26);
      segs.push({ d: 'M' + f2(a.x) + ' ' + f2(a.y) + 'Q' + f2(m.x) + ' ' + f2(m.y) + ' ' + f2(b.x) + ' ' + f2(b.y), hue: hue, dim: endDim });
    }
    var paint = function (cls, light, sat) {
      return segs.map(function (s) {
        var o = (0.35 + 0.65 * s.dim).toFixed(3);
        return '<path class="' + cls + '" d="' + s.d + '" stroke="hsl(' + s.hue + ' ' + sat + '% ' + light + '%)" stroke-opacity="' + o + '"/>';
      }).join('');
    };
    // standoffs: a clear glass stud every hand's width along the straight
    // runs (none in the bends), holding the tube off the glass - a lit
    // spark top left on each
    var studs = '';
    for (var at = 64; at < L - 64; at += 118) {
      var p0 = probe.getPointAtLength(at - 1), p1 = probe.getPointAtLength(at + 1), pc = probe.getPointAtLength(at);
      var ang = Math.atan2(p1.y - p0.y, p1.x - p0.x) * 180 / Math.PI;
      if (Math.abs(((ang % 90) + 90) % 90) > 1 && Math.abs(((ang % 90) + 90) % 90) < 89) continue;
      studs += '<g class="nn-stud" transform="translate(' + f2(pc.x) + ' ' + f2(pc.y) + ') rotate(' + f2(ang) + ')">' +
        '<rect x="-1.6" y="-3.2" width="3.2" height="6.4" rx="1.1"/><path d="M-1.6 -0.6h3.2M-1.6 0.7h3.2"/></g>' +
        '<circle class="nn-stud-hi" cx="' + f2(pc.x - 0.7) + '" cy="' + f2(pc.y - 0.9) + '" r="0.45"/>';
    }
    edge.removeChild(probe);
    // the electrodes: a dark housing each side of the gap, a bright band
    // where the tube is sealed into it, the lead going back into the plate
    var ex = [w / 2 - GAP, w / 2 + GAP];
    var elec = ex.map(function (x, i) {
      var dir = i ? 1 : -1;
      return '<g class="nn-elec" transform="translate(' + f2(x) + ' ' + f2(INSET) + ') scale(' + (-dir) + ' 1)">' +
        '<rect class="nn-elec-case" x="-0.2" y="-2.3" width="5.4" height="4.6" rx="1.3"/>' +
        '<rect class="nn-elec-band" x="3.9" y="-2.5" width="1.1" height="5"/>' +
        '<path class="nn-elec-hi" d="M0.8 -1.6h3"/></g>';
    }).join('');
    edge.innerHTML =
      '<defs><filter id="nnGlow" x="-10%" y="-10%" width="120%" height="120%" filterUnits="userSpaceOnUse"><feGaussianBlur stdDeviation="5.5"/></filter>' +
      '<linearGradient id="nnLamp" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stop-color="#fff" stop-opacity=".5"/><stop offset=".5" stop-color="#fff" stop-opacity=".12"/><stop offset="1" stop-color="#fff" stop-opacity=".04"/></linearGradient>' +
      '<mask id="nnRun" maskUnits="userSpaceOnUse" x="0" y="0" width="' + w + '" height="' + h + '"><path class="nn-run" d="' + d + '" pathLength="1000" stroke="#fff" stroke-width="44" fill="none" stroke-linecap="butt"/></mask></defs>' +
      // bare glass: the tube's body, and the lamp's line along its top and left
      '<path class="nn-bare" d="' + d + '"/><path class="nn-bare-hi" d="' + d + '" transform="translate(-0.7 -0.7)"/>' +
      '<g mask="url(#nnRun)"><g class="nn-glow" filter="url(#nnGlow)">' + paint('', 58, 100) + '</g>' +
      '<g class="nn-sheath">' + paint('', 60, 100) + '</g><g class="nn-core">' + paint('', 90, 100) + '</g></g>' +
      studs + elec;
    runMask = edge.querySelector('.nn-run');
    glowG = edge.querySelector('.nn-glow');
    // (the sign is lit all round, whatever the run: the ring keeps the count)
    drawEdgeRun(1);
  }
  function drawEdgeRun(f) {
    if (runMask) runMask.setAttribute('stroke-dasharray', f2(Math.max(0, Math.min(f, 1.02)) * 1000) + ' 1000');
  }
  // A collect: the glow dips as the transformer takes the load, swells past
  // and settles - each a little different.
  function pulseEdge() {
    if (!glowG || !glowG.animate || !lively()) return;
    var peak = 1.55 + Math.random() * 0.25, d = 900 + Math.random() * 180;
    glowG.animate([
      { opacity: 1, offset: 0 }, { opacity: 0.72, offset: 0.1 }, { opacity: peak, offset: 0.36 },
      { opacity: 0.94, offset: 0.66 }, { opacity: 1.02, offset: 0.84 }, { opacity: 1, offset: 1 }
    ], { duration: d, easing: 'linear' });
    // (and the bloom widens by about 6 px at its peak)
    glowG.animate([
      { strokeWidth: '7px' }, { strokeWidth: '6.2px', offset: 0.1 }, { strokeWidth: '13px', offset: 0.36 },
      { strokeWidth: '6.8px', offset: 0.66 }, { strokeWidth: '7.3px', offset: 0.84 }, { strokeWidth: '7px' }
    ], { duration: d, easing: 'linear', composite: 'replace' });
  }

  // ---------- The ring round the ready count ----------
  var ring = null, arc = null, arcG = null, arcC = null;
  var RR = 44;                                  // the tube's radius, in the plate's 120-unit box
  function buildRing() {
    var wrap = document.querySelector('.hero-ring-wrapper');
    if (!wrap || ring) return;
    ring = document.createElement('div');
    ring.className = 'nn-ring';
    ring.setAttribute('aria-hidden', 'true');
    // the spun plate: concentric lathe lines, two bright wedges where the
    // lamp lies across them
    var lines = '';
    for (var k = 0; k < 26; k++) {
      var rr = 12 + k * 1.72;
      lines += '<circle cx="60" cy="60" r="' + f2(rr) + '" stroke="rgba(255,255,255,' + (k % 3 ? 0.035 : 0.06) + ')"/>';
    }
    var wedge = function (a0, a1, op) {
      var p = function (a, r) { return f2(60 + r * Math.cos(a)) + ' ' + f2(60 + r * Math.sin(a)); };
      return '<path d="M' + p(a0, 10) + 'L' + p(a0, 56) + 'A56 56 0 0 1 ' + p(a1, 56) + 'L' + p(a1, 10) + 'A10 10 0 0 0 ' + p(a0, 10) + 'Z" fill="url(#nnWedge)" opacity="' + op + '"/>';
    };
    var studs = [45, 135, 225, 315].map(function (deg) {
      var a = deg * Math.PI / 180, x = 60 + RR * Math.cos(a), y = 60 + RR * Math.sin(a);
      return '<g transform="translate(' + f2(x) + ' ' + f2(y) + ') rotate(' + (deg + 90) + ')"><rect class="nn-clip" x="-2.4" y="-3.6" width="4.8" height="7.2" rx="1"/><circle class="nn-clip-screw" cx="0" cy="-2.1" r=".8"/><path class="nn-clip-slot" d="M-.55 -2.1h1.1"/></g>';
    }).join('');
    ring.innerHTML = '<svg viewBox="0 0 120 120"><defs>' +
      '<radialGradient id="nnPlate" cx=".42" cy=".36" r=".75"><stop offset="0" stop-color="#2a2d35"/><stop offset=".65" stop-color="#17181e"/><stop offset="1" stop-color="#0c0c11"/></radialGradient>' +
      '<radialGradient id="nnWedge" cx=".5" cy=".5" r=".5"><stop offset="0" stop-color="#fff" stop-opacity="0"/><stop offset=".6" stop-color="#fff" stop-opacity=".09"/><stop offset="1" stop-color="#fff" stop-opacity=".02"/></radialGradient>' +
      '<filter id="nnRingGlow" x="-40%" y="-40%" width="180%" height="180%"><feGaussianBlur stdDeviation="3.2"/></filter></defs>' +
      '<circle cx="60" cy="60" r="56.5" fill="url(#nnPlate)"/>' +
      '<g fill="none">' + lines + '</g>' + wedge(-2.6, -1.9, 1) + wedge(0.55, 1.25, 0.6) +
      '<circle cx="60" cy="60" r="56.5" fill="none" stroke="rgba(255,255,255,.1)" stroke-width=".5"/>' +
      '<circle cx="60" cy="60" r="57.1" fill="none" stroke="rgba(0,0,0,.7)" stroke-width=".8"/>' +
      // the bare tube: glass, its thick inner wall darker, the lamp along its outer top-left edge
      '<circle class="nn-rtube" cx="60" cy="60" r="' + RR + '"/>' +
      '<circle class="nn-rtube-in" cx="60" cy="60" r="' + (RR - 1.5) + '"/>' +
      '<circle class="nn-rtube-hi" cx="59.3" cy="59.3" r="' + (RR + 1.2) + '" pathLength="100"/>' +
      // the lit arc: its bloom, the sheath, the white-hot core
      '<g class="nn-rarc-g" filter="url(#nnRingGlow)"><circle class="nn-rarc nn-rarc-glow" cx="60" cy="60" r="' + RR + '" pathLength="100" transform="rotate(-90 60 60)"/></g>' +
      '<circle class="nn-rarc nn-rarc-sheath" cx="60" cy="60" r="' + RR + '" pathLength="100" transform="rotate(-90 60 60)"/>' +
      '<circle class="nn-rarc nn-rarc-core" cx="60" cy="60" r="' + RR + '" pathLength="100" transform="rotate(-90 60 60)"/>' +
      studs +
      // the electrodes at twelve o'clock, either side of the break
      '<g class="nn-relec"><rect x="54.2" y="' + (60 - RR - 2.1) + '" width="4.4" height="4.2" rx="1.1"/><rect x="61.4" y="' + (60 - RR - 2.1) + '" width="4.4" height="4.2" rx="1.1"/>' +
      '<rect class="nn-relec-band" x="57.6" y="' + (60 - RR - 2.3) + '" width=".9" height="4.6"/><rect class="nn-relec-band" x="61.5" y="' + (60 - RR - 2.3) + '" width=".9" height="4.6"/></g>' +
      '</svg>';
    wrap.insertBefore(ring, wrap.firstChild);
    arc = ring.querySelectorAll('.nn-rarc');
  }
  function drawRing(f) {
    if (!arc) return;
    // (the break at twelve o'clock: the lit arc starts just past the
    // electrode and never quite closes into the other one)
    var fc = Math.max(0, Math.min(f, 1.03));
    var dash = f2(1.6 + fc * 96.8) + ' 100';
    arc.forEach(function (c) { c.setAttribute('stroke-dasharray', dash); c.setAttribute('stroke-dashoffset', '-1.6'); c.style.opacity = fc > 0.004 ? '' : '0'; });
    // (and with nothing lit, no glow is drawn at all)
    arc[0].parentNode.style.display = fc > 0.004 ? '' : 'none';
  }

  // ---------- A collect: glass beads rising into the ring ----------
  function bubbles() {
    var wrap = document.querySelector('.hero-ring-wrapper');
    if (!wrap || !lively()) return;
    var box = wrap.getBoundingClientRect();
    if (!box.width || box.bottom < 0 || box.top > window.innerHeight) return;
    var n = 5 + Math.floor(Math.random() * 4);
    for (var k = 0; k < n; k++) {
      var b = document.createElement('span');
      b.className = 'nn-bead';
      b.setAttribute('aria-hidden', 'true');
      var size = 3.6 + Math.random() * 4.6;
      b.style.width = b.style.height = f2(size) + 'px';
      // (from under the plate, a little either side of the middle)
      var x0 = (Math.random() - 0.5) * box.width * 0.5;
      b.style.left = f2(box.width / 2 - size / 2 + x0) + 'px';
      b.style.top = f2(box.height * 0.5 - size / 2) + 'px';
      wrap.appendChild(b);
      var rise = box.height * (0.82 + Math.random() * 0.22), wob = 2 + Math.random() * 3.5, ph = Math.random() * 6.28;
      var dur = 1300 + Math.random() * 700 + size * 40, delay = Math.random() * 480;
      var frames = [];
      for (var s = 0; s <= 10; s++) {
        var u = s / 10;
        // (slow off the bottom, quicker as it rises; a wobble that grows)
        var y = box.height * 0.42 - rise * (u * u * 0.35 + u * 0.65) - box.height * 0.08;
        var x = Math.sin(ph + u * 7.5) * wob * u;
        frames.push({ transform: 'translate(' + f2(x) + 'px,' + f2(y) + 'px) scale(' + f2(0.7 + 0.3 * u) + ')', opacity: u < 0.1 ? u * 10 : u > 0.88 ? (1 - u) / 0.12 : 1, offset: u });
      }
      var a = b.animate(frames, { duration: dur, delay: delay, easing: 'linear', fill: 'both' });
      a.onfinish = (function (el) { return function () { el.remove(); }; })(b);
      setTimeout((function (el) { return function () { el.remove(); }; })(b), dur + delay + 400);
    }
  }
  // ---------- The sign's stutter ----------
  // Now and then one tube of the wordmark stutters, as a real sign's does
  // when its transformer ages: never on a beat, never twice alike.
  var stutterT = 0;
  function stutterLater() {
    clearTimeout(stutterT);
    stutterT = setTimeout(function () {
      var t = document.querySelector('.app-title');
      if (t && lively()) {
        t.classList.remove('nn-stutter');
        void t.offsetWidth;
        t.classList.add('nn-stutter');
        setTimeout(function () { t.classList.remove('nn-stutter'); }, 420);
      }
      stutterLater();
    }, 9000 + Math.random() * 16000);
  }

  function collect() {
    bubbles();
    pulseEdge();
  }

  // ---------- The levels' art ----------
  // Showroom: the cabinet seen from the seat - the glowing table under the
  // glass, the stick at your end, the window's mullions over it and the red
  // moon low over the roofs.
  var MINI_ARCADE = '<svg class="show-mini" viewBox="0 0 56 56" aria-hidden="true"><defs><linearGradient id="nnSky" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#07060F"/><stop offset=".7" stop-color="#3a0f45"/><stop offset="1" stop-color="#b0266a"/></linearGradient></defs><rect width="56" height="56" rx="12" fill="#07060F"/>' +
    '<rect x="4" y="5" width="48" height="24" fill="url(#nnSky)"/><circle cx="23" cy="24" r="6.5" fill="#FF2D55"/><path d="M16 24.6h14M16.4 26.4h13.2M17.2 28h11.6" stroke="#3a0f45" stroke-width=".7"/>' +
    '<path d="M4 23h9v6H4zM31 21h7v8h-7zM41 19h11v10H41z" fill="#0a0910"/><path d="M36 16.5h5v4h-5zM36.8 20.5v2M40.2 20.5v2" fill="#120c14" stroke="#120c14" stroke-width=".6"/>' +
    '<path d="M4 5v24M16 5v24M28 5v24M40 5v24M52 5v24M4 13h48M4 21h48" stroke="#0b0b0d" stroke-width="1.1"/>' +
    '<path d="M10 33 L46 33 L53 55 L3 55 Z" fill="#0d0c10"/><path d="M11.5 34.2 L44.5 34.2 L50.6 53.8 L5.4 53.8 Z" fill="none" stroke="#ff1f8e" stroke-width=".7"/>' +
    '<path d="M18 36 L38 36 L41 50 L15 50 Z" fill="#05030a" stroke="#00e5ff" stroke-width=".5"/>' +
    '<path d="M20 39.5h8M20 42.5h11M20 45.5h6" stroke="#ff2d95" stroke-width="1"/><path d="M30 39.5h4M33 42.5h3M28 45.5h5" stroke="#00ff66" stroke-width="1"/>' +
    '<circle cx="14" cy="53" r="1.8" fill="#d8102e"/></svg>';
  function mini(level) {
    if (level === 'showroom') return MINI_ARCADE;
    var lounge = level === 'lounge';
    var rainbow = '<linearGradient id="nnMini" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stop-color="#ff007f"/><stop offset=".3" stop-color="#ffcc00"/><stop offset=".55" stop-color="#00ff66"/><stop offset=".8" stop-color="#00e5ff"/><stop offset="1" stop-color="#8b5cf6"/></linearGradient>';
    return '<svg class="show-mini" viewBox="0 0 56 56" aria-hidden="true"><defs>' + rainbow + '</defs><rect width="56" height="56" rx="12" fill="#07060F"/>' +
      (lounge ? '<rect x="2.6" y="2.6" width="50.8" height="50.8" rx="10" fill="none" stroke="url(#nnMini)" stroke-width="1.4"/>' : '<rect x="2.6" y="2.6" width="50.8" height="50.8" rx="10" fill="none" stroke="rgba(255,255,255,.14)" stroke-width="1"/>') +
      '<circle cx="28" cy="28" r="17" fill="#15161c"/>' +
      '<circle cx="28" cy="28" r="13.5" fill="none" stroke="rgba(255,255,255,.14)" stroke-width="1.6"/>' +
      '<circle cx="28" cy="28" r="13.5" fill="none" stroke="' + (lounge ? '#FF2D55' : '#b8324c') + '" stroke-width="1.8" stroke-linecap="round" pathLength="100" stroke-dasharray="62 100" transform="rotate(-90 28 28)"' + (lounge ? ' style="filter:drop-shadow(0 0 2px #FF2D55)"' : '') + '/>' +
      '<text x="28" y="32.4" text-anchor="middle" fill="#fff" style="font:700 12px Orbitron, Rajdhani, sans-serif">3</text></svg>';
  }

  // ---------- The payout: Moonrise ----------
  // WebGL (three.js, like the landing): its module is only fetched the
  // first time it plays. While it loads, nothing shows.
  var breakout = null, loading = null;
  var HERE = (document.currentScript && document.currentScript.src) || location.href;
  function moonModule() {
    if (!loading) loading = import(new URL('../intro3d/moonrise.mjs', HERE).href).catch(function (e) { loading = null; throw e; });
    return loading;
  }
  function payoutPlay() {
    if (!lively()) return false;
    var wrap = document.querySelector('.hero-ring-wrapper');
    if (!wrap || document.body.classList.contains('r3-table-mode')) return false;
    var r = wrap.getBoundingClientRect();
    if (!r.width) return false;
    var go = function () {
      moonModule().then(function (m) {
        if (!lively()) return;
        if (!breakout) breakout = m.createBreakout();
        breakout.play({ ring: wrap, run: K.run() || 0 });
      }).catch(function (e) { console.warn('moonrise', e); });
    };
    if (r.top < 0 || r.bottom > window.innerHeight) {
      wrap.scrollIntoView({ block: 'center', behavior: 'smooth' });
      setTimeout(go, 520);
    } else go();
    return true;
  }

  window.showAddRoom('neon', {
    name: 'Neon Grid',
    lede: 'Synthwave night at three levels of show: the same neon and the same grid on each, with more or less of it moving. Showroom is all of it — the dice, then the arcade, its cabinet and a way into the game.',
    showroom: 'arcade',
    muted: 'neon',
    copy: {
      showroom: 'The arcade stays your home: a cocktail cabinet by a rooftop window, your platforms its high scores, and a way into the game. Uses the most battery.',
      lounge: 'Your deck inside a neon tube, a ring that lights with the day’s run, beads rising on every collect and the moon that rises when a run is done.',
      quiet: 'Your deck, held still. The same neon, nothing moving, easiest on battery.'
    },
    mini: mini,
    build: function () { loadFonts(); buildEdge(); buildRing(); drawRing(runNow); if (!stutterT) stutterLater(); },
    layout: function () { layoutEdge(); },
    run: function (f) { runNow = f; drawRing(f); },
    collect: collect,
    payout: {
      label: 'PLAY THE MOONRISE',
      play: payoutPlay,
      clear: function () { if (breakout) breakout.clear(); },
      busy: function () { return !!(breakout && breakout.busy()); }
    }
  });
  // (the lab's: the room's pieces, to step and inspect)
  window.neonRoom = { bubbles: bubbles, pulse: pulseEdge, breakout: function () { return breakout; }, load: moonModule };
})();
