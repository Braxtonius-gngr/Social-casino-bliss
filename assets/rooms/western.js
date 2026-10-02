/* assets/rooms/western.js
   West Texas Gore Fest's room: the skin on fire. Registered with
   showAddRoom() (assets/show.js); everything here is [data-theme="western"]
   in the stylesheet, so it is hidden on any other skin, and with motion
   off it all holds still. The skin's own gore - the torn card edges, the
   splatter, the rip-in, the screen shake and red flash on a collect
   (app.css) - stays as it was built; the room adds the fire.

   Held to real makers, at three distances - across the room (silhouette),
   at arm's length (materials, bevels, seams) and pinched in 3x (engraving,
   grain, wear) - for what each surface does with the one key light (above
   left, in front of the glass), what it touches and how it moves.

   - The fuse (the edge light) - visco safety fuse from a blasting supply:
     a lacquered black cord with a twisted-thread core, laid round the
     inside of the glass. It is lit at the top middle and burns clockwise;
     today's run is how much has burnt. Room: a dark cord round the screen,
     a white-hot spark where it is burning. Arm: the unburnt cord is black
     with a dull sheen along its twist; behind the head the char glows
     blood red and cools to black; what has burnt is a thread of grey ash
     lying where the cord was. 3x: the cord's twist is a fine dash; the ash
     is broken into crumbs; the head is a bead with a short spray of
     sparks that spits now and then, never on a beat. The head flickers
     about every 1.2 s. The burnt length moves with weight (show.js).
   - The branding iron (the ring round the ready count) - a ranch ring
     brand from a Texas blacksmith: forge-black iron, hammer scale on it,
     a short shank off the ring to the handle. Room: a dark ring with a
     glowing arc. Arm: the run is the iron heated from the shank round,
     blood red at the tail to white-hot at the head, its heat blooming on
     the plate; the ready count sits inside, stamped. 3x: the scale is a
     scatter of dark flakes catching the lamp top left; the heated length
     sheds an ember or two from the head. The arc moves with weight.
   - The short fuses (the cards' cooldowns) - the same cord, a hand's
     length under each card that is cooling: it burns from the left, its
     head at the time left, and the card is ready when it has burnt out.
   - The ember burst (a collect) - a card lit from under: a dozen sparks
     lift off it, each on its own line, and go out. Never twice alike. The
     skin's own shake and red flash play with it.
   - The payout - when a Daily Run is finished: the fire out of the phone
     (assets/intro3d/inferno.mjs, loaded on first use).

   Classic script, loaded after show.js and before the inline app script.
   The type (Special Elite, Oswald) is on every page already. */

(function () {
  'use strict';
  if (!window.showAddRoom || !window.showKit) return;
  var K = window.showKit;
  var NS = K.NS;
  var root = document.documentElement;
  var here = function () { return root.getAttribute('data-theme') === 'western'; };
  var lively = function () { return here() && K.motionOn(); };
  var f2 = function (v) { return (+v).toFixed(2); };
  var HERE = (document.currentScript && document.currentScript.src) || location.href;

  // ---------- The fuse: the edge light ----------
  var fuse = null, burnt = null, charP = null, hot = null, head = null, sparks = null, probe = null, runNow = 0;
  var INSET = 4.5;
  // the cord's line: round the inside of the glass from the top middle,
  // clockwise, following the screen's corners
  function cordPath(w, h, r, i) {
    var rr = Math.max(0.01, r - i);
    return 'M' + f2(w / 2) + ' ' + f2(i) + 'H' + f2(w - i - rr) + 'A' + f2(rr) + ' ' + f2(rr) + ' 0 0 1 ' + f2(w - i) + ' ' + f2(i + rr) +
      'V' + f2(h - i - rr) + 'A' + f2(rr) + ' ' + f2(rr) + ' 0 0 1 ' + f2(w - i - rr) + ' ' + f2(h - i) +
      'H' + f2(i + rr) + 'A' + f2(rr) + ' ' + f2(rr) + ' 0 0 1 ' + f2(i) + ' ' + f2(h - i - rr) +
      'V' + f2(i + rr) + 'A' + f2(rr) + ' ' + f2(rr) + ' 0 0 1 ' + f2(i + rr) + ' ' + f2(i) + 'Z';
  }
  function buildFuse() {
    if (fuse) return;
    fuse = document.createElementNS(NS, 'svg');
    fuse.setAttribute('class', 'wt-fuse');
    fuse.setAttribute('aria-hidden', 'true');
    document.body.appendChild(fuse);
    layoutFuse();
  }
  function layoutFuse() {
    if (!fuse) return;
    var w = window.innerWidth, h = window.innerHeight, r = K.edgeRadius() + 3;
    var d = cordPath(w, h, r, INSET);
    fuse.setAttribute('viewBox', '0 0 ' + w + ' ' + h);
    fuse.innerHTML =
      '<defs><filter id="wtBloom" x="-5%" y="-5%" width="110%" height="110%"><feGaussianBlur stdDeviation="3.5"/></filter>' +
      '<filter id="wtHeadBloom" x="-200%" y="-200%" width="500%" height="500%"><feGaussianBlur stdDeviation="2.2"/></filter></defs>' +
      // the cord: its body, the sheen along its twist, the twist itself
      '<path class="wt-cord" d="' + d + '"/><path class="wt-cord-sheen" d="' + d + '"/><path class="wt-cord-twist" d="' + d + '"/>' +
      // what has burnt: a thread of ash, broken into crumbs
      '<path class="wt-ash wt-ash-under" d="' + d + '" pathLength="1000"/><path class="wt-ash" d="' + d + '" pathLength="1000"/>' +
      // the char behind the head: blood red cooling to black, its bloom
      '<path class="wt-char wt-char-bloom" d="' + d + '" pathLength="1000" filter="url(#wtBloom)"/>' +
      '<path class="wt-char" d="' + d + '" pathLength="1000"/>' +
      '<path class="wt-hot" d="' + d + '" pathLength="1000"/>' +
      // the head: its bloom, the bead, its sparks
      '<circle class="wt-head-bloom" r="7" filter="url(#wtHeadBloom)"/><circle class="wt-head" r="2.1"/>' +
      '<g class="wt-sparks">' + [0, 1, 2, 3, 4].map(function () { return '<line class="wt-spark"/>'; }).join('') + '</g>';
    burnt = fuse.querySelectorAll('.wt-ash');
    charP = fuse.querySelectorAll('.wt-char');
    hot = fuse.querySelector('.wt-hot');
    head = fuse.querySelector('.wt-head');
    sparks = fuse.querySelectorAll('.wt-spark');
    fuse._bloom = fuse.querySelector('.wt-head-bloom');
    probe = fuse.querySelector('.wt-cord');
    drawFuse(runNow);
  }
  var CHAR = 110, HOT = 28;                      // the glowing lengths behind the head, in thousandths
  function drawFuse(f) {
    if (!burnt) return;
    var fc = Math.max(0, Math.min(f, 1.0));
    var len = fc * 1000;
    burnt.forEach(function (p) { p.setAttribute('stroke-dasharray', f2(len) + ' 1000'); p.style.opacity = fc > 0.004 ? '' : '0'; });
    // (the char and the white-hot length end at the head)
    var cl = Math.min(len, CHAR), hl = Math.min(len, HOT);
    charP.forEach(function (p) { p.setAttribute('stroke-dasharray', f2(cl) + ' 1000'); p.setAttribute('stroke-dashoffset', f2(-(len - cl))); p.style.opacity = fc > 0.004 && fc < 0.998 ? '' : '0'; });
    hot.setAttribute('stroke-dasharray', f2(hl) + ' 1000'); hot.setAttribute('stroke-dashoffset', f2(-(len - hl)));
    hot.style.opacity = fc > 0.004 && fc < 0.998 ? '' : '0';
    if (probe && probe.getTotalLength) {
      var L = probe.getTotalLength(), pt = probe.getPointAtLength(L * fc);
      // (the head: at the lit end; on a fuse not yet lit it is the match
      // at the top middle, unlit; burnt out, nothing)
      head.setAttribute('cx', f2(pt.x)); head.setAttribute('cy', f2(pt.y));
      fuse._bloom.setAttribute('cx', f2(pt.x)); fuse._bloom.setAttribute('cy', f2(pt.y));
      var on = fc > 0.004 && fc < 0.998;
      head.style.opacity = on ? '' : '0'; fuse._bloom.style.opacity = on ? '' : '0';
      // the sparks: a short spray off the head, each its own line
      var tan = probe.getPointAtLength(Math.min(L, L * fc + 2)), ax = tan.x - pt.x, ay = tan.y - pt.y, am = Math.hypot(ax, ay) || 1;
      ax /= am; ay /= am;
      sparks.forEach(function (s, k) {
        var a = (k - 2) * 0.55 + (Math.random() - 0.5) * 0.3, len2 = 4 + Math.random() * 7;
        var dx = ax * Math.cos(a) - ay * Math.sin(a), dy = ax * Math.sin(a) + ay * Math.cos(a);
        s.setAttribute('x1', f2(pt.x + dx * 2)); s.setAttribute('y1', f2(pt.y + dy * 2));
        s.setAttribute('x2', f2(pt.x + dx * (2 + len2))); s.setAttribute('y2', f2(pt.y + dy * (2 + len2)));
        s.style.opacity = on ? '' : '0';
      });
    }
  }
  // the head flickers about every 1.2 s, and spits sparks now and then
  var flickT = 0;
  function flickerLater() {
    clearTimeout(flickT);
    flickT = setTimeout(function () {
      if (head && lively() && head.animate) {
        head.animate([{ opacity: 1, r: 2.1 }, { opacity: 0.45, r: 1.6, offset: 0.3 }, { opacity: 1, r: 2.5, offset: 0.5 }, { opacity: 0.7, offset: 0.75 }, { opacity: 1, r: 2.1 }], { duration: 180 + Math.random() * 160, easing: 'steps(5, end)' });
        if (Math.random() < 0.55) {
          drawFuse(runNow);
          sparks.forEach(function (s) { s.animate([{ opacity: 0.95, strokeDashoffset: 0 }, { opacity: 0, strokeDashoffset: -14 }], { duration: 260 + Math.random() * 240, easing: 'ease-out', fill: 'forwards' }); });
        }
      }
      flickerLater();
    }, 900 + Math.random() * 700);
  }

  // ---------- The branding iron: the ring round the ready count ----------
  var iron = null, heat = null, heatBloom = null, headDot = null, emberT = 0;
  var IR = 44;                                  // the ring's radius in its 120-unit box
  function buildIron() {
    var wrap = document.querySelector('.hero-ring-wrapper');
    if (!wrap || iron) return;
    iron = document.createElement('div');
    iron.className = 'wt-iron';
    iron.setAttribute('aria-hidden', 'true');
    // the hammer scale: flakes round the iron, lit top left
    var scale = '';
    for (var k = 0; k < 70; k++) {
      var a = k / 70 * Math.PI * 2 + (k % 3) * 0.04, rr = IR + (k % 2 ? 1.6 : -1.4), c = Math.cos(a), s = Math.sin(a);
      var lit = Math.max(0, -(c * 0.6 + s * 0.8));
      scale += '<circle cx="' + f2(60 + c * rr) + '" cy="' + f2(60 + s * rr) + '" r="' + f2(0.5 + (k % 4) * 0.2) + '" fill="rgba(' + (lit > 0.35 ? '200,190,170' : '0,0,0') + ',' + f2(lit > 0.35 ? 0.1 + lit * 0.25 : 0.5) + ')"/>';
    }
    iron.innerHTML = '<svg viewBox="0 0 120 120"><defs>' +
      '<radialGradient id="wtIron" cx=".38" cy=".3" r=".8"><stop offset="0" stop-color="#3a332d"/><stop offset=".55" stop-color="#1a1512"/><stop offset="1" stop-color="#0b0b0b"/></radialGradient>' +
      '<linearGradient id="wtHeat" x1="0" y1="0" x2="1" y2="0"><stop offset="0" stop-color="#C41E2E"/><stop offset=".5" stop-color="#FF6A13"/><stop offset=".85" stop-color="#FFB21A"/><stop offset="1" stop-color="#FFF4DC"/></linearGradient>' +
      '<filter id="wtHeatBloom" x="-30%" y="-30%" width="160%" height="160%"><feGaussianBlur stdDeviation="2.8"/></filter></defs>' +
      // the shank off the ring, down to the right, to the handle
      '<path d="M91 94 L113 116" stroke="url(#wtIron)" stroke-width="5.5" stroke-linecap="round"/>' +
      '<path d="M91 94 L113 116" stroke="rgba(255,235,210,0.18)" stroke-width="1.2" stroke-linecap="round" transform="translate(-1.2 -1.2)"/>' +
      // the iron ring: its body, the lamp on its top-left, the scale
      '<circle cx="60" cy="60" r="' + IR + '" fill="none" stroke="url(#wtIron)" stroke-width="7"/>' +
      '<circle cx="60" cy="60" r="' + IR + '" fill="none" stroke="rgba(255,235,210,0.14)" stroke-width="1.1" stroke-dasharray="46 400" stroke-dashoffset="-150" transform="translate(-1.5 -1.5)"/>' +
      scale +
      // the heat: from the shank round, clockwise
      '<g class="wt-heat-g" transform="rotate(45 60 60)">' +
      '<circle class="wt-heat wt-heat-bloom" cx="60" cy="60" r="' + IR + '" pathLength="100" filter="url(#wtHeatBloom)"/>' +
      '<circle class="wt-heat wt-heat-body" cx="60" cy="60" r="' + IR + '" pathLength="100"/>' +
      '<circle class="wt-heat wt-heat-core" cx="60" cy="60" r="' + IR + '" pathLength="100"/></g>' +
      '<circle class="wt-iron-head" r="2.6"/>' +
      '</svg>';
    wrap.insertBefore(iron, wrap.firstChild);
    heat = iron.querySelectorAll('.wt-heat');
    headDot = iron.querySelector('.wt-iron-head');
  }
  function drawIron(f) {
    if (!heat) return;
    var fc = Math.max(0, Math.min(f, 1.03));
    var len = fc * 100;
    heat.forEach(function (c) {
      // (the core is the last stretch to the head: white-hot there)
      var part = c.classList.contains('wt-heat-core') ? Math.min(len, 14) : len;
      c.setAttribute('stroke-dasharray', f2(part) + ' 100');
      c.setAttribute('stroke-dashoffset', f2(-(len - part)));
      c.style.opacity = fc > 0.004 ? '' : '0';
    });
    // the head: 45 degrees past the shank, round from there
    var a = (fc * 360 + 45) * Math.PI / 180;
    headDot.setAttribute('cx', f2(60 + IR * Math.cos(a)));
    headDot.setAttribute('cy', f2(60 + IR * Math.sin(a)));
    headDot.style.opacity = fc > 0.004 && fc < 0.998 ? '' : '0';
    iron._head = [60 + IR * Math.cos(a), 60 + IR * Math.sin(a)];
  }
  // an ember off the head now and then
  function emberLater() {
    clearTimeout(emberT);
    emberT = setTimeout(function () {
      if (iron && lively() && runNow > 0.004 && runNow < 0.998 && iron._head) {
        var box = iron.getBoundingClientRect(), k = box.width / 120;
        var e = document.createElement('span');
        e.className = 'wt-ember';
        e.style.left = (iron._head[0] * k) + 'px'; e.style.top = (iron._head[1] * k) + 'px';
        iron.appendChild(e);
        var dx = (Math.random() - 0.5) * 26, dy = -14 - Math.random() * 22;
        e.animate([{ transform: 'translate(0,0) scale(1)', opacity: 1 }, { transform: 'translate(' + dx + 'px,' + dy + 'px) scale(0.4)', opacity: 0 }], { duration: 700 + Math.random() * 500, easing: 'cubic-bezier(.2,.7,.4,1)' }).onfinish = function () { e.remove(); };
      }
      emberLater();
    }, 1400 + Math.random() * 2200);
  }

  // ---------- A collect: the ember burst ----------
  function collect(card) {
    if (!lively() || !card) return;
    var box = card.getBoundingClientRect();
    if (!box.width || box.bottom < 0 || box.top > window.innerHeight) return;
    var n = 10 + Math.floor(Math.random() * 6);
    for (var k = 0; k < n; k++) {
      var e = document.createElement('span');
      e.className = 'wt-burst';
      e.setAttribute('aria-hidden', 'true');
      var x = 8 + Math.random() * (box.width - 16), y = box.height - 4 - Math.random() * 8;
      e.style.left = x + 'px'; e.style.top = y + 'px';
      var big = Math.random() < 0.3;
      if (big) e.classList.add('big');
      card.appendChild(e);
      var dx = (Math.random() - 0.5) * 70, dy = -(30 + Math.random() * 90), dur = 550 + Math.random() * 500;
      e.animate([
        { transform: 'translate(0,0) scale(1)', opacity: 1, offset: 0 },
        { transform: 'translate(' + (dx * 0.6) + 'px,' + (dy * 0.55) + 'px) scale(1.1)', opacity: 1, offset: 0.35 },
        { transform: 'translate(' + dx + 'px,' + dy + 'px) scale(0.3)', opacity: 0, offset: 1 }
      ], { duration: dur, delay: Math.random() * 120, easing: 'cubic-bezier(.15,.6,.4,1)', fill: 'forwards' }).onfinish = (function (el) { return function () { el.remove(); }; })(e);
    }
    // and the fuse's head spits
    if (head && head.animate) head.animate([{ opacity: 1, r: 2.1 }, { opacity: 1, r: 3.4, offset: 0.3 }, { opacity: 1, r: 2.1 }], { duration: 320, easing: 'ease-out' });
  }

  // ---------- The levels' art ----------
  function mini(level) {
    var lounge = level === 'lounge';
    return '<svg class="show-mini" viewBox="0 0 56 56" aria-hidden="true"><defs>' +
      '<linearGradient id="wtMiniHeat" x1="0" y1="1" x2="1" y2="0"><stop offset="0" stop-color="#C41E2E"/><stop offset=".6" stop-color="#FF6A13"/><stop offset="1" stop-color="#FFF4DC"/></linearGradient></defs>' +
      '<rect width="56" height="56" rx="12" fill="#0B0B0B"/>' +
      '<rect x="3.5" y="3.5" width="49" height="49" rx="11" fill="none" stroke="#1A1512" stroke-width="2"/>' +
      '<rect x="3.5" y="3.5" width="49" height="49" rx="11" fill="none" stroke="' + (lounge ? 'url(#wtMiniHeat)' : '#6b2a12') + '" stroke-width="2" pathLength="100" stroke-dasharray="57 100" stroke-linecap="round"' + (lounge ? ' style="filter:drop-shadow(0 0 2px #FF6A13)"' : '') + '/>' +
      '<circle cx="28" cy="28" r="15" fill="none" stroke="#1A1512" stroke-width="4"/>' +
      '<circle cx="28" cy="28" r="15" fill="none" stroke="' + (lounge ? 'url(#wtMiniHeat)' : '#8a3b12') + '" stroke-width="3.2" pathLength="100" stroke-dasharray="57 100" transform="rotate(45 28 28)"/>' +
      '<text x="28" y="33" text-anchor="middle" fill="#E3DAC9" style="font:600 14px Oswald, sans-serif">3</text></svg>';
  }

  // ---------- The payout: the fire ----------
  var breakout = null, loading = null;
  function infernoModule() {
    if (!loading) loading = import(new URL('../intro3d/inferno.mjs', HERE).href).catch(function (e) { loading = null; throw e; });
    return loading;
  }
  function payoutPlay(info) {
    if (!lively() || document.body.classList.contains('r3-table-mode')) return false;
    var wrap = document.querySelector('.hero-ring-wrapper');
    if (!wrap) return false;
    // the die's face: today's take, else what is ready, one to six
    var count = info && info.collected > 0 ? info.collected : parseInt((document.getElementById('heroCount') || {}).textContent, 10) || 1;
    infernoModule().then(function (m) {
      if (!lively()) return;
      if (!breakout) breakout = m.createBreakout();
      var go = function () { breakout.play({ ring: wrap, run: K.run() || 0, pips: Math.max(1, Math.min(6, count)) }); };
      if (breakout.busy()) breakout.fold(go); else go();
    }).catch(function (e) { console.warn('inferno', e); });
    return true;
  }

  window.showAddRoom('western', {
    name: 'West Texas Gore Fest',
    lede: 'The gore fest on fire, at two levels of show: the same deck on each, with more or less of it burning.',
    showroom: null,
    muted: 'western',
    copy: {
      lounge: 'Your deck with a fuse lit round it that burns down with the day’s run, a branding iron heating round the ready count, embers off every collect, and fire out of the phone when a run is done.',
      quiet: 'Your deck, held still. The same fuse and iron, nothing burning, easiest on battery.'
    },
    mini: mini,
    build: function () { buildFuse(); buildIron(); drawIron(runNow); drawFuse(runNow); if (!flickT) flickerLater(); if (!emberT) emberLater(); },
    layout: function () { layoutFuse(); },
    run: function (f) { runNow = f; drawIron(f); drawFuse(f); },
    collect: collect,
    payout: {
      label: 'BURN IT DOWN',
      play: payoutPlay,
      clear: function () { if (breakout) breakout.clear(); },
      busy: function () { return !!(breakout && breakout.busy()); }
    }
  });
  // (the lab's: the room's pieces, to step and inspect)
  window.westernRoom = { breakout: function () { return breakout; }, load: infernoModule, collect: collect, drawFuse: drawFuse, drawIron: drawIron };
})();
