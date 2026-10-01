/* assets/rooms/glitch.js
   Dead Channel's room: a television left on a dead channel, and what comes
   through it. Registered with showAddRoom() (assets/show.js); everything
   here is [data-theme="glitch"] in the stylesheet, so it is hidden on any
   other skin, and with motion off it all holds still. The signal-corruption
   jolt (app.css, `signal-corruption`) is this skin's own and stays as it
   was built: the red and green bands, the skew, the blown-out peaks.

   Held to real makers, at three distances - across the room (silhouette),
   at arm's length (materials, bevels, seams) and pinched in 3x (engraving,
   grain, wear) - for what each surface does with the one key light (above
   left, in front of the glass), what it touches and how it moves.

   - The glass (the edge light) - the picture tube of a 1970s console set.
     Room: the picture's rounded corners and its dark mask, the lamp caught
     top left on the curved face. Arm: a bone lip where the picture meets
     the mask; today's run is how much of it has tuned in, lit clockwise
     from the top middle, with a brighter head where the signal is
     arriving; the hum bar rolls slowly up the screen, as a set on a
     mains-hum ripple does. 3x: the lip is a hairline on a dark seam; the
     lit length's bloom is soft on the glass; the scanlines are real rows.
     The head flickers now and then, never on a beat.
   - The scope (the ring round the ready count) - the round face of a lab
     oscilloscope. Room: a black bezel with a red ring of trace. Arm: a
     knurled black-anodised bezel with four slotted screws (no two slots
     alike), a bone graticule on the faceplate, the trace a circle whose
     lit arc is the run - white-hot at its head, going red and dim behind
     it as the phosphor lets go. 3x: the knurl's teeth, catching the lamp
     top left and dark bottom right; the graticule's minor ticks; the head
     trembling a hair (the beam is never quite still). The arc moves with
     weight (show.js).
   - The face in the snow (a collect) - the card loses its picture for a
     moment: snow comes up over it, and for a few fields a face is in the
     snow - the spirit's (spirit.mjs), cold, then gone, leaving its trace in
     the phosphor. Never twice in the same place or the same size.
   - The payout - when a Daily Run is finished: the séance
     (assets/rooms/seance.mjs, loaded on first use).

   Classic script, loaded after show.js and before the inline app script. */

(function () {
  'use strict';
  if (!window.showAddRoom || !window.showKit) return;
  var K = window.showKit;
  var NS = K.NS;
  var root = document.documentElement;
  var here = function () { return root.getAttribute('data-theme') === 'glitch'; };
  var lively = function () { return here() && K.motionOn(); };
  var f2 = function (v) { return (+v).toFixed(2); };
  var HERE = (document.currentScript && document.currentScript.src) || location.href;

  // ---------- The type ----------
  // IM Fell English SC for the wordmark (the Fell types: cut by hand in the
  // 1670s, an engraver's letter), VT323 (already loaded) for the set's own
  // on-screen numbers. Fetched the first time the room is built.
  var fontsIn = false;
  function loadFonts() {
    if (fontsIn) return;
    fontsIn = true;
    var l = document.createElement('link');
    l.rel = 'stylesheet';
    l.href = 'https://fonts.googleapis.com/css2?family=IM+Fell+English+SC&display=swap';
    document.head.appendChild(l);
  }

  // ---------- The glass: the edge light ----------
  var glass = null, lip = null, head = null, runNow = 0;
  var INSET = 5;
  // the picture's edge: a rounded rectangle whose sides bow out a hair, as
  // a tube's face does (the corners pulled in, the middles full)
  function tubePath(w, h, r, i) {
    var b = Math.min(w, h) * 0.012;   // the bow
    var x0 = i, y0 = i, x1 = w - i, y1 = h - i, rr = Math.max(4, r);
    return 'M' + f2(w / 2) + ' ' + f2(y0 - b) +
      'Q' + f2((w / 2 + x1 - rr) / 2) + ' ' + f2(y0 - b * 0.9) + ' ' + f2(x1 - rr) + ' ' + f2(y0) +
      'Q' + f2(x1) + ' ' + f2(y0) + ' ' + f2(x1) + ' ' + f2(y0 + rr) +
      'Q' + f2(x1 + b) + ' ' + f2(h / 2) + ' ' + f2(x1) + ' ' + f2(y1 - rr) +
      'Q' + f2(x1) + ' ' + f2(y1) + ' ' + f2(x1 - rr) + ' ' + f2(y1) +
      'Q' + f2(w / 2) + ' ' + f2(y1 + b) + ' ' + f2(x0 + rr) + ' ' + f2(y1) +
      'Q' + f2(x0) + ' ' + f2(y1) + ' ' + f2(x0) + ' ' + f2(y1 - rr) +
      'Q' + f2(x0 - b) + ' ' + f2(h / 2) + ' ' + f2(x0) + ' ' + f2(y0 + rr) +
      'Q' + f2(x0) + ' ' + f2(y0) + ' ' + f2(x0 + rr) + ' ' + f2(y0) +
      'Q' + f2((x0 + rr + w / 2) / 2) + ' ' + f2(y0 - b * 0.9) + ' ' + f2(w / 2) + ' ' + f2(y0 - b);
  }
  function buildGlass() {
    if (glass) return;
    glass = document.createElementNS(NS, 'svg');
    glass.setAttribute('class', 'dc-glass');
    glass.setAttribute('aria-hidden', 'true');
    document.body.appendChild(glass);
    // the hum bar and the tube's mask are plain elements (CSS)
    var hum = document.createElement('div');
    hum.className = 'dc-hum';
    hum.setAttribute('aria-hidden', 'true');
    document.body.appendChild(hum);
    layoutGlass();
  }
  function layoutGlass() {
    if (!glass) return;
    var w = window.innerWidth, h = window.innerHeight, r = K.edgeRadius() + 10;
    var d = tubePath(w, h, r, INSET);
    glass.setAttribute('viewBox', '0 0 ' + w + ' ' + h);
    glass.innerHTML =
      '<defs><filter id="dcBloom" x="-5%" y="-5%" width="110%" height="110%"><feGaussianBlur stdDeviation="4"/></filter>' +
      '<radialGradient id="dcSheen" cx="0.16" cy="0.08" r="0.55"><stop offset="0" stop-color="#E6ECF5" stop-opacity=".09"/><stop offset=".45" stop-color="#E6ECF5" stop-opacity=".025"/><stop offset="1" stop-color="#E6ECF5" stop-opacity="0"/></radialGradient></defs>' +
      // the lamp caught on the curved face, top left
      '<rect class="dc-sheen" width="' + w + '" height="' + h + '" fill="url(#dcSheen)"/>' +
      // the seam and the bare lip
      '<path class="dc-seam" d="' + d + '"/><path class="dc-lip" d="' + d + '"/>' +
      // the tuned-in length: its bloom on the glass, then the line
      '<path class="dc-run dc-run-bloom" d="' + d + '" pathLength="1000" filter="url(#dcBloom)"/>' +
      '<path class="dc-run dc-run-line" d="' + d + '" pathLength="1000"/>' +
      '<circle class="dc-head" r="2.2"/>';
    lip = glass.querySelectorAll('.dc-run');
    head = glass.querySelector('.dc-head');
    glass._probe = glass.querySelector('.dc-lip');
    drawGlass(runNow);
  }
  function drawGlass(f) {
    if (!lip) return;
    var fc = Math.max(0, Math.min(f, 1.02));
    lip.forEach(function (p) { p.setAttribute('stroke-dasharray', f2(fc * 1000) + ' 1000'); p.style.opacity = fc > 0.004 ? '' : '0'; });
    // the head: where the signal is arriving
    var probe = glass._probe;
    if (probe && probe.getTotalLength) {
      var L = probe.getTotalLength(), pt = probe.getPointAtLength(L * Math.min(1, fc));
      head.setAttribute('cx', f2(pt.x)); head.setAttribute('cy', f2(pt.y));
      head.style.opacity = fc > 0.004 && fc < 0.998 ? '' : '0';
    }
  }
  // now and then the head of the signal stutters (never on a beat)
  var flickT = 0;
  function flickerLater() {
    clearTimeout(flickT);
    flickT = setTimeout(function () {
      if (head && lively() && head.animate) {
        head.animate([{ opacity: 1 }, { opacity: 0.2, offset: 0.2 }, { opacity: 1, offset: 0.35 }, { opacity: 0.5, offset: 0.55 }, { opacity: 1 }], { duration: 260 + Math.random() * 180, easing: 'steps(6, end)' });
      }
      flickerLater();
    }, 3500 + Math.random() * 9000);
  }

  // ---------- The scope: the ring round the ready count ----------
  var scope = null, trace = null, dot = null;
  var TR = 40;                                  // the trace's radius, in the scope's 120-unit box
  function buildScope() {
    var wrap = document.querySelector('.hero-ring-wrapper');
    if (!wrap || scope) return;
    scope = document.createElement('div');
    scope.className = 'dc-scope';
    scope.setAttribute('aria-hidden', 'true');
    // the knurl: fine teeth round the bezel's rim, lit top left
    var knurl = '';
    for (var k = 0; k < 96; k++) {
      var a = k / 96 * Math.PI * 2, c = Math.cos(a), s = Math.sin(a);
      var lit = Math.max(0, -(c * 0.6 + s * 0.8));
      knurl += '<line x1="' + f2(60 + c * 55.2) + '" y1="' + f2(60 + s * 55.2) + '" x2="' + f2(60 + c * 58.4) + '" y2="' + f2(60 + s * 58.4) + '" stroke="rgba(' + (lit > 0.3 ? '230,230,236' : '0,0,0') + ',' + f2(lit > 0.3 ? 0.14 + lit * 0.3 : 0.55) + ')" stroke-width=".9"/>';
    }
    // the graticule: a cross with minor ticks, and a circle of majors
    var grat = '<path d="M60 16V104M16 60H104" stroke="rgba(233,228,216,.16)" stroke-width=".35"/>';
    for (var m = -4; m <= 4; m++) {
      if (!m) continue;
      var p = 60 + m * 10;
      grat += '<path d="M' + p + ' 58.6V61.4M58.6 ' + p + 'H61.4" stroke="rgba(233,228,216,.26)" stroke-width=".35"/>';
      for (var n = 1; n < 5; n++) { var q = p - (m > 0 ? 10 : -10) + (m > 0 ? n * 2 : -n * 2); grat += '<path d="M' + f2(q) + ' 59.4V60.6M59.4 ' + f2(q) + 'H60.6" stroke="rgba(233,228,216,.16)" stroke-width=".25"/>'; }
    }
    // four slotted screws, no two slots alike
    var screws = [45, 135, 225, 315].map(function (deg, i) {
      var a = deg * Math.PI / 180, x = 60 + 51 * Math.cos(a), y = 60 + 51 * Math.sin(a);
      var slot = [12, 71, 148, 33][i];
      return '<g transform="translate(' + f2(x) + ' ' + f2(y) + ')"><circle r="2.3" fill="url(#dcScrew)" stroke="rgba(0,0,0,.8)" stroke-width=".3"/>' +
        '<path d="M-1.6 0H1.6" stroke="rgba(0,0,0,.85)" stroke-width=".55" transform="rotate(' + slot + ')"/></g>';
    }).join('');
    scope.innerHTML = '<svg viewBox="0 0 120 120"><defs>' +
      '<radialGradient id="dcBezel" cx=".38" cy=".32" r=".8"><stop offset="0" stop-color="#2a2c31"/><stop offset=".55" stop-color="#141519"/><stop offset="1" stop-color="#08090b"/></radialGradient>' +
      '<radialGradient id="dcFace" cx=".45" cy=".4" r=".7"><stop offset="0" stop-color="#101418"/><stop offset="1" stop-color="#050608"/></radialGradient>' +
      '<radialGradient id="dcScrew" cx=".35" cy=".3" r=".8"><stop offset="0" stop-color="#9aa0a8"/><stop offset=".6" stop-color="#4a4e55"/><stop offset="1" stop-color="#1b1d21"/></radialGradient>' +
      '<linearGradient id="dcFaceSheen" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stop-color="#E6ECF5" stop-opacity=".14"/><stop offset=".35" stop-color="#E6ECF5" stop-opacity="0"/></linearGradient>' +
      '<filter id="dcTraceGlow" x="-40%" y="-40%" width="180%" height="180%"><feGaussianBlur stdDeviation="2.6"/></filter></defs>' +
      // the bezel, its knurled rim, the chamfer into the face
      '<circle cx="60" cy="60" r="58.6" fill="url(#dcBezel)"/>' + knurl +
      '<circle cx="60" cy="60" r="48.6" fill="none" stroke="rgba(0,0,0,.85)" stroke-width="1.4"/>' +
      '<circle cx="60" cy="60" r="49.6" fill="none" stroke="rgba(230,232,238,.18)" stroke-width=".4" stroke-dasharray="40 200" stroke-dashoffset="-148"/>' +
      '<circle cx="60" cy="60" r="47.8" fill="url(#dcFace)"/>' + grat + screws +
      // the trace: its bloom, the phosphor, the dimming tail, the head
      '<g class="dc-trace-g" transform="rotate(-90 60 60)">' +
      '<circle class="dc-trace dc-trace-glow" cx="60" cy="60" r="' + TR + '" pathLength="100" filter="url(#dcTraceGlow)"/>' +
      '<circle class="dc-trace dc-trace-tail" cx="60" cy="60" r="' + TR + '" pathLength="100"/>' +
      '<circle class="dc-trace dc-trace-body" cx="60" cy="60" r="' + TR + '" pathLength="100"/>' +
      '<circle class="dc-trace dc-trace-core" cx="60" cy="60" r="' + TR + '" pathLength="100"/></g>' +
      '<circle class="dc-dot" r="1.9"/>' +
      // the face's glass: the lamp caught top left
      '<circle cx="60" cy="60" r="47.8" fill="url(#dcFaceSheen)"/>' +
      '</svg>';
    wrap.insertBefore(scope, wrap.firstChild);
    trace = scope.querySelectorAll('.dc-trace');
    dot = scope.querySelector('.dc-dot');
  }
  function drawScope(f) {
    if (!trace) return;
    var fc = Math.max(0, Math.min(f, 1.03));
    var len = fc * 100;
    trace.forEach(function (c) {
      // (the tail, the body and the core are shorter and shorter lengths
      // ending at the head: the phosphor brightest where the beam just was)
      var part = c.classList.contains('dc-trace-core') ? Math.min(len, 16) : c.classList.contains('dc-trace-body') ? Math.min(len, 55) : len;
      c.setAttribute('stroke-dasharray', f2(part) + ' 100');
      c.setAttribute('stroke-dashoffset', f2(-(len - part)));
      c.style.opacity = fc > 0.004 ? '' : '0';
    });
    // the head: at the end of the trace; with nothing done, the beam parked
    // at twelve o'clock, defocused
    var a = (fc * 360 - 90) * Math.PI / 180;
    dot.setAttribute('cx', f2(60 + TR * Math.cos(a)));
    dot.setAttribute('cy', f2(60 + TR * Math.sin(a)));
    dot.classList.toggle('dc-parked', fc <= 0.004);
  }

  // ---------- A collect: the face in the snow ----------
  var spiritMod = null, faceMask = null, faceMaskW = 0, faceMaskH = 0;
  function loadSpirit() {
    if (!spiritMod) spiritMod = import(new URL('./spirit.mjs', HERE).href).then(function (m) {
      // the face's mask, small (the snow's grain is coarse): made once,
      // cropped to the head (the plate round it is the locks' room)
      var c = document.createElement('canvas');
      var s = 0.3;
      c.width = Math.round(m.SPIRIT_SIZE.w * s); c.height = Math.round(m.SPIRIT_SIZE.h * s);
      m.drawFaceMask(c.getContext('2d'), { seed: 3, scale: s });
      var hb = m.HEAD_BOX;
      var cx0 = Math.round(hb.x * s), cy0 = Math.round(hb.y * s), cw0 = Math.round(hb.w * s), ch0 = Math.round(hb.h * s);
      faceMaskW = cw0; faceMaskH = ch0;
      faceMask = c.getContext('2d').getImageData(cx0, cy0, cw0, ch0).data;
      return m;
    }).catch(function (e) { spiritMod = null; throw e; });
    return spiritMod;
  }
  function faceInSnow(card) {
    if (!lively() || !card) return;
    var box = card.getBoundingClientRect();
    if (!box.width || box.bottom < 0 || box.top > window.innerHeight) return;
    var G = 2;                                   // a grain: 2 css px
    var cw = Math.ceil(box.width / G), ch = Math.ceil(box.height / G);
    var cv = document.createElement('canvas');
    cv.className = 'dc-snow';
    cv.setAttribute('aria-hidden', 'true');
    cv.width = cw; cv.height = ch;
    card.appendChild(cv);
    var x = cv.getContext('2d'), img = x.createImageData(cw, ch), d = img.data;
    // where the face is: a little taller than the card, off to one side,
    // never twice the same
    var fh = ch * (1.15 + Math.random() * 0.3), fw = fh * faceMaskW / Math.max(1, faceMaskH);
    var fx = cw * (0.3 + Math.random() * 0.4) - fw / 2, fy = -fh * (0.08 + Math.random() * 0.1);
    var mirror = Math.random() < 0.5;
    var FIELDS = 22, field = 0, tear = Math.floor(Math.random() * ch);
    var band = 4 + Math.floor(Math.random() * 10);   // (the frame the jolt's bands cross it)
    var tick = function () {
      if (!cv.isConnected) return;
      var u = field / (FIELDS - 1);
      // the snow: up quickly, holds, goes; the face in it for the middle
      // fields, and its trace in the phosphor after
      var snowA = u < 0.12 ? u / 0.12 : u > 0.7 ? Math.max(0, 1 - (u - 0.7) / 0.3) : 1;
      var faceA = u < 0.2 ? 0 : u < 0.35 ? (u - 0.2) / 0.15 : u < 0.62 ? 1 : Math.max(0, 1 - (u - 0.62) / 0.38) * 0.7;
      var shift = u < 0.5 ? Math.round((Math.random() - 0.5) * 6) : 0;
      for (var j = 0; j < ch; j++) {
        // (the hold slips: rows shift, one tear line pulls further)
        var rowShift = shift + (Math.abs(j - tear) < 2 ? 5 : 0);
        var isBand = field === band && (j % 3 === 0);
        for (var i = 0; i < cw; i++) {
          var k = (j * cw + i) * 4;
          var n = Math.random();
          var m = 0;
          if (faceMask && faceA > 0) {
            var ux = (i + rowShift - fx) / fw, uy = (j - fy) / fh;
            if (ux >= 0 && ux < 1 && uy >= 0 && uy < 1) {
              var mx = Math.floor((mirror ? 1 - ux : ux) * faceMaskW), my = Math.floor(uy * faceMaskH);
              m = faceMask[(my * faceMaskW + mx) * 4 + 3] / 255;
            }
          }
          var v = n * (0.5 + m * 1.6 * faceA) + m * faceA * 0.25;
          var b = v < 0.45 ? v * 60 : Math.min(255, 30 + (v - 0.45) * 380);
          var al = snowA * (0.62 + m * faceA * 0.3);
          // (the face is cold; the snow round it bone)
          d[k] = b * (0.92 - m * faceA * 0.28); d[k + 1] = b * (0.95 - m * faceA * 0.08); d[k + 2] = Math.min(255, b * (1 + m * faceA * 0.3));
          d[k + 3] = Math.round(255 * Math.min(1, al));
          if (isBand) { d[k] = 224; d[k + 1] = 36; d[k + 2] = 47; d[k + 3] = 120; }
        }
      }
      x.putImageData(img, 0, 0);
      field++;
      if (field < FIELDS) setTimeout(tick, 33); else cv.remove();
    };
    tick();
    setTimeout(function () { cv.remove(); }, FIELDS * 33 + 600);
  }
  function collect(card) {
    if (!lively()) return;
    if (faceMask) faceInSnow(card);
    else loadSpirit().then(function () { faceInSnow(card); }).catch(function () { faceInSnow(card); });
    // and the glass's head stutters once
    if (head && head.animate) head.animate([{ opacity: 1 }, { opacity: 0.1, offset: 0.3 }, { opacity: 1 }], { duration: 300, easing: 'steps(4, end)' });
  }

  // ---------- The levels' art ----------
  function mini(level) {
    var lounge = level === 'lounge';
    return '<svg class="show-mini" viewBox="0 0 56 56" aria-hidden="true"><defs>' +
      '<radialGradient id="dcMiniFace" cx=".4" cy=".35" r=".75"><stop offset="0" stop-color="#11151a"/><stop offset="1" stop-color="#050608"/></radialGradient></defs>' +
      '<rect width="56" height="56" rx="12" fill="#050608"/>' +
      '<rect x="3.5" y="3.5" width="49" height="49" rx="11" fill="none" stroke="' + (lounge ? 'rgba(233,228,216,.55)' : 'rgba(233,228,216,.16)') + '" stroke-width="1"/>' +
      '<circle cx="28" cy="28" r="18" fill="#141519"/><circle cx="28" cy="28" r="15" fill="url(#dcMiniFace)"/>' +
      '<path d="M28 15V41M15 28H41" stroke="rgba(233,228,216,.14)" stroke-width=".4"/>' +
      '<circle cx="28" cy="28" r="12.5" fill="none" stroke="' + (lounge ? '#E0242F' : '#8c2a30') + '" stroke-width="1.4" stroke-linecap="round" pathLength="100" stroke-dasharray="64 100" transform="rotate(-90 28 28)"' + (lounge ? ' style="filter:drop-shadow(0 0 2px #E0242F)"' : '') + '/>' +
      (lounge ? '<circle cx="' + f2(28 + 12.5 * Math.cos(1.44 * Math.PI - Math.PI / 2 + 0.0)) + '" cy="' + f2(28 + 12.5 * Math.sin(1.44 * Math.PI - Math.PI / 2)) + '" r="1.3" fill="#fff"/>' : '') +
      '<text x="28" y="32" text-anchor="middle" fill="#E9E4D8" style="font:400 13px VT323, monospace">3</text></svg>';
  }

  // ---------- The payout: the séance ----------
  var breakout = null, loading = null;
  function seanceModule() {
    if (!loading) loading = import(new URL('./seance.mjs', HERE).href).catch(function (e) { loading = null; throw e; });
    return loading;
  }
  function payoutPlay() {
    if (!lively() || document.body.classList.contains('r3-table-mode')) return false;
    seanceModule().then(function (m) {
      if (!lively()) return;
      if (!breakout) breakout = m.createBreakout();
      if (breakout.busy()) breakout.off(function () { breakout.play(); });
      else breakout.play();
    }).catch(function (e) { console.warn('seance', e); });
    return true;
  }

  window.showAddRoom('glitch', {
    name: 'Dead Channel',
    lede: 'A television left on a dead channel, at two levels of show: the same set on each, with more or less of it moving.',
    showroom: null,
    muted: 'glitch',
    copy: {
      lounge: 'Your deck on the glass of an old set: a picture that tunes in with the day’s run, a scope tracing it, a face in the snow on every collect, and the séance when a run is done.',
      quiet: 'Your deck, held still. The same set, nothing moving, easiest on battery.'
    },
    mini: mini,
    build: function () { loadFonts(); buildGlass(); buildScope(); drawScope(runNow); drawGlass(runNow); if (!flickT) flickerLater(); if (K.motionOn()) setTimeout(function () { loadSpirit().catch(function () {}); }, 1500); },
    layout: function () { layoutGlass(); },
    run: function (f) { runNow = f; drawScope(f); drawGlass(f); },
    collect: collect,
    payout: {
      label: 'HOLD THE SÉANCE',
      play: payoutPlay,
      clear: function () { if (breakout) breakout.clear(); },
      busy: function () { return !!(breakout && breakout.busy()); }
    }
  });
  // (the lab's: the room's pieces, to step and inspect)
  window.deadRoom = { faceInSnow: faceInSnow, breakout: function () { return breakout; }, load: seanceModule, spirit: loadSpirit };
})();
