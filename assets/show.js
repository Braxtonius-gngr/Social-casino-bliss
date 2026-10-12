/* assets/show.js
   How much show: a skin's levels - one skin to the person using it, listed
   once in the Theme picker - and the pieces that only its lively levels
   carry. Every skin with a room has them:

   - Showroom is the visualized skin, with a table for its home (for
     Refinement x Realization, `refinement` and the card table). A skin
     whose room has no Showroom yet has only the other two.
   - Lounge is its muted pairing (for R x R, `executive`), with motion on.
   - Quiet is the same pairing with Motion set to Off - the pairing the app
     already defines (see "Theme Work" in AGENTS.md). Nothing here stores a
     level of its own: the level is read back from the skin and the motion
     setting, and choosing one sets both.

   A room is the look (data-theme) a family of skins wears, and what it
   brings: its levels' copy and art, its pieces (built once, then kept in
   step with today's run), what a collect does, and its payout. Rooms are
   registered with showAddRoom(look, room) (see ROOM below for the shape).
   Refinement x Realization's room, `executive`, is here; each other room
   is its own file in assets/rooms/, loaded after this one. Off a room's
   skins (a skin that has not been given one), Settings offers the
   default's levels, the way back to it.

   The rest of this header is the `executive` room's.

   The room's pieces (all [data-theme="executive"], so the visualized skin's
   pages wear them too, and with motion off both hold still):
   - the gold edge light: a hairline round the screen, lit for today's run
     (done / tracked), with one slow highlight circling every 12 s;
   - the watch-bezel ring round the ready count: 60 minute ticks, the run as
     a gold arc in a groove, a polished bead at its head;
   - one gold glint across a card when it is collected;
   - the payout: when a Daily Run is finished, the dial's iris opens into a
     port and the house pays out - clay chips and DRO sweeps notes rise
     through it, cross the glass and settle round the screen, and hold still
     until the next touch sends them past you (a touch mid-flight does too).
     Settings can play it again any time.

   Each piece is held to a real maker, at three distances (across the room:
   silhouette; arm's length: materials, bevels, seams; pinched in 3x:
   engraving, grain, wear), for what its surfaces do with the one key light
   (above left, in front of the glass), what it touches and how it moves.

   Edge light - a gold inlay line set into a watch case, lit by a jeweller's
     lamp. Room: a thin gold frame, fuller as the run fills. Arm: a hairline
     with a soft bloom, brighter on the lit length. 3x: the highlight is a
     comet of short segments that follows the corners rather than cutting
     them. It runs round the glass: rounded like the screen's corners only
     when installed; in a browser tab the page's corners are square, so it
     is a frame with a small inner radius. Moves at constant speed, like
     light travelling along a groove; 12 s a lap.
   Bezel ring - a Patek Philippe minute track on a circular-brushed bezel.
     Room: a dark ring with a gold arc. Arm: 60 gold-filled ticks, the arc
     in a sunk groove, a polished bead at its head. 3x: radial brushing, two
     bright wedges where the lamp mirrors in the brushing (top left), a fine
     chamfer line inside and out. The arc winds back a hair, overshoots and
     settles when the run moves.
   Iris port - the six blackened-steel blades of a Zeiss lens iris over a
     machined bore. Room: the count's dial, then a hole. Arm: the blades
     turn and slide back together, the aperture a hexagon growing to a
     circle. 3x: each blade has a satin sheen that turns with it, a lit
     bevel on its leading edge and a shadow on the blade under it; the bore
     wall is dark where the lip shades it (top left) and lit on the far side
     (bottom right). It takes up the slack (a hair shut) before it opens,
     overshoots a touch and settles; it closes with a lag once the last
     piece is out.
   Glint - a jeweller's lamp passing over a lacquered black placard: a warm
     band across the clear coat, a spark along the top hairline.
   Chips - Paulson clay chips from a Macau private salon: edge spots through
     body and rim, a gold-stamped inlay with a microtext ring. Clay is matte;
     the inlay flashes as it turns through the light.
   Notes - an intaglio note from a banknote printer: guilloche borders, a
     rosette, a foil strip with microtext, a serial. Paper is shaded panel by
     panel as it bows at its folds, and sheens only where it faces the lamp.
   Contact - every piece in front of the glass drops a shadow on it along
     the key light, softer the higher it is; the nearest fall out of focus.

   Classic script, loaded before the inline app script; everything that
   needs the app's own globals (THEMES, selectTheme, trackedGames, ...) runs
   at call time or after DOMContentLoaded. The app calls in through the
   window.show* hooks, each guarded where it is called. */

(function () {
  'use strict';

  var LEVELS = ['showroom', 'lounge', 'quiet'];
  var SHEET_KEY = 'almanac_show_sheet_v1';   // the end-of-tour picker, shown once
  var NS = 'http://www.w3.org/2000/svg';
  var root = document.documentElement;

  var theme = function () { return root.getAttribute('data-theme'); };
  var motionOn = function () { return root.getAttribute('data-motion') !== 'off'; };
  // ROOM - the shape of a registered room (all but the first four optional):
  //   name       the family's name, heading its levels in Settings
  //   lede       one line on what the levels are
  //   showroom   the visualized skin's id (its table is its home), or null
  //   muted      the skin that is the room at Lounge and Quiet
  //   copy       { showroom, lounge, quiet }: each level's line
  //   mini       function (level): the level's 56x56 art, an SVG string
  //   build      makes the room's pieces (called whenever it may be needed:
  //              keep it idempotent); they hide themselves off the room,
  //              keyed in CSS on [data-theme="<look>"]
  //   layout     the window changed size
  //   run        function (f): draw today's run, done / tracked (f can be a
  //              little under 0 or over 1 mid-move: the wind-up, the overshoot)
  //   collect    function (card, id): a card just collected, re-rendered
  //   payout     { label, play() -> true if it played, clear(), busy() }
  var ROOMS = {};
  function showAddRoom(look, r) {
    ROOMS[look] = r;
    if (theme() === look && document.readyState !== 'loading') showRefresh();
  }
  var room = function () { return ROOMS[theme()] || null; };
  var inRoom = function () { return !!room(); };
  var lively = function () { return inRoom() && motionOn(); };
  // (the executive room's own pieces below check for it by name)
  var inExec = function () { return theme() === 'executive'; };
  var livelyExec = function () { return inExec() && motionOn(); };

  // ---------- Levels ----------
  var skinNow = function () { return typeof getActiveThemeId === 'function' ? getActiveThemeId() : root.getAttribute('data-skin'); };
  // the room a skin belongs to (as its visualized skin or its muted one)
  function familyOf(skin) {
    for (var look in ROOMS) {
      var r = ROOMS[look];
      if (r.showroom === skin || r.muted === skin) return r;
    }
    return null;
  }
  // the family Settings' block is about: the skin's own, or off a room's
  // skins the default's (the way back to it)
  function settingsFamily() { return familyOf(skinNow()) || ROOMS.executive || null; }
  function levelsOf(r) { return r && r.showroom ? LEVELS : LEVELS.slice(1); }
  function showLevel() {
    var skin = skinNow(), r = familyOf(skin);
    if (!r) return null;
    if (skin === r.showroom) return 'showroom';
    var pref = typeof getMotionPref === 'function' ? getMotionPref() : 'system';
    return pref === 'off' ? 'quiet' : 'lounge';
  }
  function setShowLevel(level) {
    var r = settingsFamily();
    if (!r || levelsOf(r).indexOf(level) === -1 || typeof selectTheme !== 'function') return;
    if (level === 'quiet') setMotionPref('off');
    else if (getMotionPref() === 'off') setMotionPref('system');
    selectTheme(level === 'showroom' ? r.showroom : r.muted);
    showRefresh();
  }

  var COPY = {
    showroom: { name: 'Showroom', bars: 3 },
    lounge: { name: 'Lounge', bars: 2 },
    quiet: { name: 'Quiet', bars: 1 }
  };
  var MINI_TABLE = '<svg class="show-mini" viewBox="0 0 56 56" aria-hidden="true">' +
    '<rect width="56" height="56" rx="12" fill="#0B0C10"/>' +
    '<path d="M3 47 A25 33 0 0 1 53 47 Z" fill="#1b1410"/><path d="M6 47 A22 29 0 0 1 50 47 Z" fill="#070709"/>' +
    '<path d="M11 47 A17 22 0 0 1 45 47" fill="none" stroke="#C9A441" stroke-width="0.6" opacity="0.85"/>' +
    '<g transform="rotate(-14 19 35)"><rect x="15" y="29" width="8" height="11" rx="1.2" fill="#121318" stroke="#D4AF37" stroke-width="0.5"/><rect x="16.6" y="30.6" width="4.8" height="7.8" rx="0.6" fill="none" stroke="#8a7336" stroke-width="0.35"/></g>' +
    '<g><rect x="24" y="27" width="8" height="11" rx="1.2" fill="#121318" stroke="#D4AF37" stroke-width="0.5"/><rect x="25.6" y="28.6" width="4.8" height="7.8" rx="0.6" fill="none" stroke="#8a7336" stroke-width="0.35"/></g>' +
    '<g transform="rotate(13 37 34)"><rect x="33" y="29" width="8" height="11" rx="1.2" fill="#EDE6D3"/><rect x="34.8" y="31" width="4.4" height="1.2" rx="0.4" fill="#2a2418"/><rect x="34.8" y="33.2" width="3" height="0.8" rx="0.3" fill="#8a7336"/></g>' +
    '<circle cx="28" cy="46" r="2.6" fill="#101116" stroke="#D4AF37" stroke-width="0.5"/></svg>';
  function miniRing(glint) {
    var ticks = '';
    for (var i = 0; i < 60; i++) {
      var a = (i / 60) * Math.PI * 2 - Math.PI / 2, five = i % 5 === 0;
      var r0 = five ? 18.6 : 19.2, r1 = five ? 21.2 : 21;
      ticks += '<line x1="' + (28 + r0 * Math.cos(a)).toFixed(2) + '" y1="' + (28 + r0 * Math.sin(a)).toFixed(2) +
        '" x2="' + (28 + r1 * Math.cos(a)).toFixed(2) + '" y2="' + (28 + r1 * Math.sin(a)).toFixed(2) +
        '" stroke="' + (i < 34 ? '#E6C65E' : '#5b4a22') + '" stroke-width="' + (five ? 0.7 : 0.4) + '"/>';
    }
    return '<svg class="show-mini" viewBox="0 0 56 56" aria-hidden="true"><rect width="56" height="56" rx="12" fill="#0B0C10"/>' +
      '<circle cx="28" cy="28" r="21" fill="#1a1918"/><circle cx="28" cy="28" r="15.6" fill="#0c0d10"/>' +
      '<circle cx="28" cy="28" r="17.3" fill="none" stroke="#040405" stroke-width="1.8"/>' +
      '<circle cx="28" cy="28" r="17.3" fill="none" stroke="#D4AF37" stroke-width="1.3" stroke-linecap="round" pathLength="100" stroke-dasharray="57 100" transform="rotate(-90 28 28)"/>' +
      ticks + '<text x="28" y="' + (glint ? 31.5 : 32.5) + '" text-anchor="middle" fill="#F8F9FA" style="font:600 ' + (glint ? 10.5 : 12.5) + 'px ui-monospace, Menlo, monospace">3</text>' +
      (glint ? '<circle cx="45.5" cy="12" r="1.6" fill="#FFF1CC"/><circle cx="45.5" cy="12" r="4" fill="#FFF1CC" opacity=".18"/>' : '') + '</svg>';
  }
  function levelRowsHtml() {
    var r = settingsFamily();
    if (!r) return '';
    var current = showLevel();
    return levelsOf(r).map(function (id) {
      var c = COPY[id], on = current === id;
      var art = r.mini ? r.mini(id) : '';
      var bars = [1, 2, 3].map(function (n) { return '<i' + (n <= c.bars ? ' class="on"' : '') + '></i>'; }).join('');
      return '<button type="button" class="show-level" role="radio" aria-checked="' + on + '" data-level="' + id + '">' + art +
        '<span class="show-level-copy"><span class="show-level-name">' + c.name + '</span><span class="show-level-desc">' + ((r.copy && r.copy[id]) || '') + '</span></span>' +
        '<span class="show-level-meter"><span class="show-bars" aria-label="Motion: ' + ['', 'none', 'some', 'full'][c.bars] + '">' + bars + '</span>' +
        '<span class="show-meter-cap" aria-hidden="true">motion</span></span></button>';
    }).join('');
  }
  function bindRows(list) {
    list.querySelectorAll('.show-level').forEach(function (b) {
      b.addEventListener('click', function () { setShowLevel(b.getAttribute('data-level')); });
    });
  }
  function levelNote() {
    var level = showLevel();
    if (level === 'lounge' && !motionOn()) {
      return 'This device is asking for reduced motion, so Lounge holds still like Quiet. Set Animations to "Always on" below to see it move.';
    }
    var r = settingsFamily();
    if (level === null && r) return 'You are on another skin. Pick a level to come back to ' + r.name + '.';
    return '';
  }
  function renderShowLevelUI() {
    var r = settingsFamily();
    var title = document.getElementById('showLevelTitle');
    if (title && r) title.textContent = r.name;
    var lede = document.getElementById('showLevelLede');
    if (lede && r) lede.textContent = r.lede || '';
    var list = document.getElementById('showLevelList');
    if (list) {
      if (r) list.setAttribute('aria-label', r.name + ': how much show');
      list.innerHTML = levelRowsHtml(); bindRows(list);
    }
    var note = document.getElementById('showLevelNote');
    if (note) note.textContent = levelNote();
    var btn = document.getElementById('btnPlayPayout');
    if (btn) {
      // (the payout plays over the deck: at Showroom, the home is a table)
      var p = room() && room().payout;
      btn.hidden = !p || showLevel() === 'showroom';
      btn.disabled = !(p && lively());
      btn.textContent = p && lively() ? (p.label || 'PLAY THE PAYOUT') : 'THE PAYOUT IS OFF WHILE THINGS HOLD STILL';
    }
    // The same payout, beside Run today: on the Lounge (the middle level) only.
    var heroBtn = document.getElementById('btnHeroPayout');
    if (heroBtn) {
      var hp = room() && room().payout;
      heroBtn.hidden = !hp || showLevel() !== 'lounge';
      heroBtn.disabled = !(hp && lively());
    }
    var sheetList = document.getElementById('showSheetList');
    if (sheetList) { sheetList.innerHTML = levelRowsHtml(); bindRows(sheetList); }
    var done = document.getElementById('showSheetDone');
    if (done) {
      var lv = showLevel();
      done.textContent = lv ? 'KEEP ' + COPY[lv].name.toUpperCase() : 'DONE';
    }
  }

  // The last step of the tour: shown once, after the tour's own last tip.
  function openShowSheet(force) {
    var modal = document.getElementById('showLevelModal');
    if (!modal) return;
    if (!force) {
      try { if (localStorage.getItem(SHEET_KEY) === 'seen') return; localStorage.setItem(SHEET_KEY, 'seen'); } catch (e) {}
    }
    renderShowLevelUI();
    modal.classList.add('open');
    setTimeout(function () {
      var on = modal.querySelector('.show-level[aria-checked="true"]') || modal.querySelector('.show-level');
      if (on) on.focus({ preventScroll: true });
    }, 60);
  }
  function closeShowSheet() {
    var modal = document.getElementById('showLevelModal');
    if (modal) modal.classList.remove('open');
  }

  // ---------- Edge light ----------
  var edge = null, edgeHi = [], edgeD = '';
  var hasOffsetPath = !!(window.CSS && CSS.supports && CSS.supports('offset-path', "path('M0 0H1')"));
  var COMET = 6;   // the highlight: a head and five trailing segments, each short enough to follow a corner
  function buildEdge() {
    if (edge) return;
    edge = document.createElementNS(NS, 'svg');
    edge.setAttribute('class', 'show-edge');
    edge.setAttribute('aria-hidden', 'true');
    edge.innerHTML = '<defs><filter id="showEdgeBloom" x="-5%" y="-5%" width="110%" height="110%"><feGaussianBlur stdDeviation="2.4"/></filter></defs>' +
      '<path class="show-edge-base" pathLength="1000"/><path class="show-edge-glow" pathLength="1000" filter="url(#showEdgeBloom)"/>' +
      '<path class="show-edge-lit" pathLength="1000"/>';
    document.body.appendChild(edge);
    if (hasOffsetPath) {
      for (var k = 0; k < COMET; k++) {
        var seg = document.createElement('div');
        seg.className = 'show-edge-hi' + (k === 0 ? ' head' : '');
        seg.style.setProperty('--k', k);
        seg.setAttribute('aria-hidden', 'true');
        document.body.appendChild(seg);
        edgeHi.push(seg);
      }
    }
    layoutEdge();
  }
  // The glass the light runs round: an installed app fills the screen, so
  // the frame follows the screen's own corners; a browser tab's page has
  // square corners, so there it is a frame with a small inner radius.
  function edgeRadius() {
    var standalone = (window.matchMedia && matchMedia('(display-mode: standalone)').matches) || navigator.standalone === true;
    if (!standalone) return 12;
    var ios = /iPhone|iPad|iPod/.test(navigator.userAgent) || (navigator.platform === 'MacIntel' && navigator.maxTouchPoints > 1);
    return ios ? 47 : 24;
  }
  function layoutEdge() {
    if (!edge) return;
    var w = window.innerWidth, h = window.innerHeight;
    var r = edgeRadius();
    var i = 1.3, rr = Math.max(0.01, r - i);
    edgeD = 'M' + (w / 2) + ' ' + i + 'H' + (w - i - rr) + 'A' + rr + ' ' + rr + ' 0 0 1 ' + (w - i) + ' ' + (i + rr) +
      'V' + (h - i - rr) + 'A' + rr + ' ' + rr + ' 0 0 1 ' + (w - i - rr) + ' ' + (h - i) +
      'H' + (i + rr) + 'A' + rr + ' ' + rr + ' 0 0 1 ' + i + ' ' + (h - i - rr) +
      'V' + (i + rr) + 'A' + rr + ' ' + rr + ' 0 0 1 ' + (i + rr) + ' ' + i + 'Z';
    edge.setAttribute('viewBox', '0 0 ' + w + ' ' + h);
    edge.querySelectorAll('path').forEach(function (p) { p.setAttribute('d', edgeD); });
    edgeHi.forEach(function (seg) { seg.style.offsetPath = "path('" + edgeD + "')"; });
  }

  // ---------- The iris ----------
  // Six blades over the bore (the dial's own radius, 35.4 in the ring's
  // 120-unit box). Opening, each turns about a pivot on the rim and slides
  // back along its own axis, so the aperture grows from a hexagon to the
  // full bore. Blade 0 is drawn a second time over blade 5, clipped to its
  // leading wedge, so the overlap goes round the circle the way a real
  // iris's does.
  var IRIS = { R: 35.4, N: 6, out: 1.6, span: 78, pivotR: 1.0, pivotA: 40, bow: 6, rot: 50, slide: 22 };
  function irisBlade(i) {
    var rad = function (a) { return a * Math.PI / 180; };
    var pt = function (r, a) { return [60 + r * Math.cos(rad(a)), 60 + r * Math.sin(rad(a))]; };
    var f2 = function (p) { return p[0].toFixed(2) + ' ' + p[1].toFixed(2); };
    var th = -90 + i * 60;
    var c = pt(3, th + 36 + 180);                     // just past the centre, so the blades overlap there
    var a = pt(IRIS.R * IRIS.out, th), b = pt(IRIS.R * IRIS.out, th + IRIS.span);
    var k = pt(1, th + 90), m = [(c[0] + a[0]) / 2, (c[1] + a[1]) / 2];
    var q = [m[0] + (k[0] - 60) * IRIS.bow, m[1] + (k[1] - 60) * IRIS.bow];   // leading edge bowed, so the aperture rounds
    var edgeD = 'M' + f2(c) + ' Q' + f2(q) + ' ' + f2(a);
    var bis = rad(th + IRIS.span / 2);
    return {
      d: edgeD + ' L' + f2(b) + ' Z', edge: edgeD,
      pivot: pt(IRIS.R * IRIS.pivotR, th + IRIS.pivotA),
      dir: [Math.cos(bis), Math.sin(bis)]
    };
  }
  function irisBladeSvg(b) {
    return '<path d="' + b.d + '" fill="url(#showBlade)"/>' +
      '<path d="' + b.edge + '" fill="none" stroke="rgba(0,0,0,0.55)" stroke-width="1.4" transform="translate(-0.5 0.6)"/>' +
      '<path d="' + b.edge + '" fill="none" stroke="rgba(255,238,205,0.34)" stroke-width="0.45"/>';
  }
  function irisSvg() {
    var s = '<clipPath id="showAperture"><circle cx="60" cy="60" r="' + IRIS.R + '"/></clipPath>' +
      '<clipPath id="showWedge0"><path d="M' + (60 + 3 * Math.cos(Math.PI * 126 / 180)).toFixed(2) + ' ' + (60 + 3 * Math.sin(Math.PI * 126 / 180)).toFixed(2) +
      ' L' + (60 + 60 * Math.cos(-Math.PI * 96 / 180)).toFixed(2) + ' ' + (60 + 60 * Math.sin(-Math.PI * 96 / 180)).toFixed(2) +
      ' L' + (60 + 60 * Math.cos(-Math.PI * 66 / 180)).toFixed(2) + ' ' + (60 + 60 * Math.sin(-Math.PI * 66 / 180)).toFixed(2) + ' Z"/></clipPath>' +
      '<g class="show-iris" clip-path="url(#showAperture)">';
    for (var i = 0; i < IRIS.N; i++) s += '<g class="show-blade">' + irisBladeSvg(irisBlade(i)) + '</g>';
    s += '<g class="show-blade"><g clip-path="url(#showWedge0)">' + irisBladeSvg(irisBlade(0)) + '</g></g></g>';
    return s;
  }
  var irisBlades = [], irisGeo = [];
  // open: 0 shut, 1 fully open (a little past either end is the overshoot)
  function setIris(open) {
    irisBlades.forEach(function (g, i) {
      var b = irisGeo[i % IRIS.N], sl = IRIS.slide * open;
      g.setAttribute('transform', 'translate(' + (b.dir[0] * sl).toFixed(2) + ' ' + (b.dir[1] * sl).toFixed(2) + ') rotate(' +
        (IRIS.rot * open).toFixed(2) + ' ' + b.pivot[0].toFixed(2) + ' ' + b.pivot[1].toFixed(2) + ')');
    });
  }

  // ---------- The ring ----------
  var bezel = null, arc = null, bead = null, ticks = [], boreGlow = null, litCount = -1;
  function buildBezel() {
    var wrap = document.querySelector('.hero-ring-wrapper');
    if (!wrap || bezel) return;
    bezel = document.createElement('div');
    bezel.className = 'show-bezel';
    bezel.setAttribute('aria-hidden', 'true');
    var t = '';
    for (var k = 0; k < 60; k++) {
      var a = (k / 60) * Math.PI * 2 - Math.PI / 2, five = k % 5 === 0;
      var r0 = five ? 42.4 : 43.6, r1 = five ? 49.8 : 48.6;
      t += '<line class="show-tick" x1="' + (60 + r0 * Math.cos(a)).toFixed(2) + '" y1="' + (60 + r0 * Math.sin(a)).toFixed(2) +
        '" x2="' + (60 + r1 * Math.cos(a)).toFixed(2) + '" y2="' + (60 + r1 * Math.sin(a)).toFixed(2) + '" stroke-width="' + (five ? 1.15 : 0.55) + '"/>';
    }
    bezel.innerHTML = '<div class="show-bezel-metal"></div>' +
      '<svg viewBox="0 0 120 120"><defs>' +
      '<linearGradient id="showArc" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stop-color="#F3DA92"/><stop offset=".5" stop-color="#D4AF37"/><stop offset="1" stop-color="#A87A22"/></linearGradient>' +
      '<radialGradient id="showPort" cx=".5" cy=".5" r=".5"><stop offset="0" stop-color="#000"/><stop offset=".78" stop-color="#030304"/><stop offset="1" stop-color="#15130e"/></radialGradient>' +
      '<radialGradient id="showBead" cx=".34" cy=".3" r=".8"><stop offset="0" stop-color="#FFF6DA"/><stop offset=".35" stop-color="#E8C860"/><stop offset="1" stop-color="#8A6519"/></radialGradient>' +
      '<linearGradient id="showBlade" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stop-color="#3a3b40"/><stop offset=".5" stop-color="#1b1c20"/><stop offset="1" stop-color="#0c0d10"/></linearGradient>' +
      '<linearGradient id="showWall" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stop-color="#030304"/><stop offset=".55" stop-color="#0b0b0c"/><stop offset="1" stop-color="#6a5f44"/></linearGradient>' +
      '<radialGradient id="showGlow" cx=".5" cy=".5" r=".5"><stop offset="0" stop-color="#FFE9B0" stop-opacity=".9"/><stop offset=".45" stop-color="#E8C860" stop-opacity=".35"/><stop offset="1" stop-color="#E8C860" stop-opacity="0"/></radialGradient></defs>' +
      '<circle cx="60" cy="60" r="52.2" fill="none" stroke="rgba(0,0,0,0.65)" stroke-width="1"/>' +
      '<circle cx="60" cy="60" r="51.6" fill="none" stroke="rgba(255,240,210,0.13)" stroke-width="0.6"/>' +
      // the bore under the iris: dark where the lip shades it, its far wall lit
      '<circle cx="60" cy="60" r="35.4" fill="url(#showPort)"/>' +
      '<circle cx="60" cy="60" r="33.4" fill="none" stroke="url(#showWall)" stroke-width="4"/>' +
      '<circle class="show-bore-glow" cx="60" cy="60" r="29" fill="url(#showGlow)" opacity="0"/>' +
      irisSvg() +
      '<circle cx="60" cy="60" r="35.4" fill="none" stroke="rgba(0,0,0,0.9)" stroke-width="1.6"/>' +
      '<circle cx="60" cy="60" r="36.2" fill="none" stroke="rgba(255,236,190,0.12)" stroke-width="0.5"/>' +
      '<circle cx="60" cy="60" r="38.7" fill="none" stroke="#040405" stroke-width="3.8"/>' +
      '<circle cx="60" cy="60" r="40.7" fill="none" stroke="rgba(255,236,190,0.09)" stroke-width="0.5"/>' +
      '<circle class="show-arc" cx="60" cy="60" r="38.7" fill="none" stroke="url(#showArc)" stroke-width="2.4" stroke-linecap="round" pathLength="100" transform="rotate(-90 60 60)" stroke-dasharray="0 100"/>' +
      t + '<circle class="show-bead" cx="60" cy="21.3" r="2.3" fill="url(#showBead)"/></svg>';
    wrap.insertBefore(bezel, wrap.firstChild);
    arc = bezel.querySelector('.show-arc');
    bead = bezel.querySelector('.show-bead');
    boreGlow = bezel.querySelector('.show-bore-glow');
    ticks = Array.prototype.slice.call(bezel.querySelectorAll('.show-tick'));
    irisBlades = Array.prototype.slice.call(bezel.querySelectorAll('.show-blade'));
    irisGeo = [];
    for (var i = 0; i < IRIS.N; i++) irisGeo.push(irisBlade(i));
    setIris(0);
  }

  var runVis = null, runRAF = 0;
  function drawRun(f) {
    var fc = Math.max(0, f);
    if (arc) {
      arc.setAttribute('stroke-dasharray', (Math.min(fc, 1.04) * 100).toFixed(2) + ' 100');
      var lit = Math.min(60, Math.floor(fc * 60 + 1e-6));
      if (lit !== litCount) { ticks.forEach(function (t, i) { t.classList.toggle('lit', i < lit); }); litCount = lit; }
      var a = fc * Math.PI * 2 - Math.PI / 2;
      bead.setAttribute('cx', (60 + 38.7 * Math.cos(a)).toFixed(2));
      bead.setAttribute('cy', (60 + 38.7 * Math.sin(a)).toFixed(2));
      bead.style.opacity = fc > 0.005 ? 1 : 0;
    }
    if (edge) {
      var dash = (Math.min(fc, 1.02) * 1000).toFixed(1) + ' 1000';
      edge.querySelectorAll('.show-edge-glow, .show-edge-lit').forEach(function (p) { p.setAttribute('stroke-dasharray', dash); });
    }
  }
  // wind-up, a small overshoot, then the settle
  function weighted(u) {
    var a = 0.14;
    if (u < a) return -0.05 * Math.sin(Math.PI * u / a);
    var v = (u - a) / (1 - a) - 1, c1 = 1.2, c3 = c1 + 1;
    return 1 + c3 * v * v * v + c1 * v * v;
  }
  // today's run, drawn by the room it is in
  function drawRunHere(f) {
    var r = room();
    if (r && r.run) r.run(f);
  }
  // f: today's run as a share, done / tracked (updateHeroStats() passes it in)
  function showRunProgress(f) {
    if (!isFinite(f)) f = 0;
    if (runVis === null || !lively() || Math.abs(f - runVis) < 1e-4) {
      cancelAnimationFrame(runRAF);
      runVis = f; drawRunHere(f);
      return;
    }
    var from = runVis, t0 = performance.now(), dur = 950;
    cancelAnimationFrame(runRAF);
    var step = function (t) {
      var u = Math.min(1, (t - t0) / dur);
      runVis = from + (f - from) * weighted(u);
      drawRunHere(runVis);
      if (u < 1) runRAF = requestAnimationFrame(step); else { runVis = f; drawRunHere(f); }
    };
    runRAF = requestAnimationFrame(step);
  }

  // ---------- A collect ----------
  // (logCollection() marks the card; the deck re-renders after a collect,
  // so the room's collect plays on the new card)
  var collectedId = null;
  function showCollected(id) { collectedId = lively() ? id : null; }
  function showAfterRender() {
    if (!collectedId) return;
    var id = collectedId;
    collectedId = null;
    var card = document.querySelector('.ledger-card[data-gid="' + id + '"]');
    var r = room();
    if (!card || !lively() || !r || !r.collect) return;
    r.collect(card, id);
  }
  // The executive room's: one gold glint across the card.
  function glintCard(card) {
    var g = document.createElement('div');
    g.className = 'show-glint';
    card.style.setProperty('--show-w', (card.offsetWidth + 8) + 'px');
    card.appendChild(g);
    setTimeout(function () { g.remove(); }, 1150);
  }

  // ---------- Art: chips and notes ----------
  var svgURI = function (s) { return 'url("data:image/svg+xml,' + encodeURIComponent(s) + '")'; };
  var GOLD = '<linearGradient id="g" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#F3DA92"/><stop offset=".48" stop-color="#D4AF37"/><stop offset="1" stop-color="#A87A22"/></linearGradient>';
  var CHIPS = {
    onyx: { body: '#15161a', dark: '#0b0b0d', spotA: '#E8E0CC', spotB: '#C9A441', inlay: '#0d0e11', grain: '1', denom: '1 SC' },
    ivory: { body: '#E4DBC5', dark: '#bdb39c', spotA: '#15161a', spotB: '#C9A441', inlay: '#101115', grain: '0', denom: '5 SC' }
  };
  function sector(r0, r1, a0, a1) {
    var p = function (r, a) { var t = (a - 90) * Math.PI / 180; return (50 + r * Math.cos(t)).toFixed(2) + ' ' + (50 + r * Math.sin(t)).toFixed(2); };
    return 'M' + p(r1, a0) + ' A' + r1 + ' ' + r1 + ' 0 0 1 ' + p(r1, a1) + ' L' + p(r0, a1) + ' A' + r0 + ' ' + r0 + ' 0 0 0 ' + p(r0, a0) + ' Z';
  }
  function chipArt(kind, rim) {
    var K = CHIPS[kind], spots = '';
    for (var i = 0; i < 8; i++) spots += '<path d="' + sector(37, 50, i * 45 - 7, i * 45 + 7) + '" fill="' + (i % 2 ? K.spotB : K.spotA) + '"/>';
    var g = K.grain;
    var grain = '<filter id="n" x="0" y="0" width="100%" height="100%"><feTurbulence type="fractalNoise" baseFrequency="1.3" numOctaves="2" seed="' + (kind === 'onyx' ? 5 : 9) + '"/>' +
      '<feColorMatrix type="matrix" values="0 0 0 0 ' + g + '  0 0 0 0 ' + g + '  0 0 0 0 ' + g + '  1.1 0 0 0 -0.52"/></filter>';
    var s = '<svg xmlns="http://www.w3.org/2000/svg" xmlns:xlink="http://www.w3.org/1999/xlink" viewBox="0 0 100 100"><defs>' + GOLD + grain +
      '<clipPath id="c"><circle cx="50" cy="50" r="50"/></clipPath><path id="tp" d="M50 50 m-26.8 0 a26.8 26.8 0 1 1 53.6 0 a26.8 26.8 0 1 1 -53.6 0"/></defs>' +
      '<circle cx="50" cy="50" r="50" fill="' + (rim ? K.dark : K.body) + '"/>' + spots +
      '<rect width="100" height="100" filter="url(#n)" clip-path="url(#c)" opacity="' + (rim ? 0.25 : 0.55) + '"/>';
    if (rim) return svgURI(s + '<circle cx="50" cy="50" r="50" fill="rgba(0,0,0,0.28)"/></svg>');
    s += '<circle cx="50" cy="50" r="36.5" fill="none" stroke="rgba(0,0,0,0.38)" stroke-width="0.9"/>' +
      '<circle cx="50" cy="50" r="35.6" fill="none" stroke="rgba(255,255,255,0.09)" stroke-width="0.5"/>' +
      '<circle cx="50" cy="50" r="31.2" fill="' + K.inlay + '"/>' +
      '<circle cx="50" cy="50" r="30.5" fill="none" stroke="url(#g)" stroke-width="1.15"/>' +
      '<circle cx="50" cy="50" r="23.6" fill="none" stroke="url(#g)" stroke-width="0.35"/>' +
      '<text font-family="Georgia, serif" font-size="3.05" letter-spacing="0.42" fill="#D9B85A"><textPath href="#tp" xlink:href="#tp">DAILY ROLL OVER · SWEEPS COIN · DAILY ROLL OVER · SWEEPS COIN ·</textPath></text>' +
      '<text x="50" y="53.6" text-anchor="middle" font-family="Georgia, Times New Roman, serif" font-weight="700" font-size="13.5" letter-spacing="0.6" fill="url(#g)">DRO</text>' +
      '<path d="M41 57.2h18" stroke="url(#g)" stroke-width="0.35"/>' +
      '<text x="50" y="63.4" text-anchor="middle" font-family="Menlo, Consolas, monospace" font-size="5.2" fill="url(#g)">' + K.denom + '</text>' +
      '<circle cx="50" cy="50" r="49.3" fill="none" stroke="rgba(255,255,255,0.16)" stroke-width="0.7"/>' +
      '<circle cx="50" cy="50" r="49.8" fill="none" stroke="rgba(0,0,0,0.5)" stroke-width="0.5"/></svg>';
    return svgURI(s);
  }
  function guillocheBand(x0, x1, y, amp, k, n, horizontal) {
    var d = '';
    for (var j = 0; j < n; j++) {
      var ph = (j / n) * Math.PI * 2;
      d += 'M';
      for (var x = x0; x <= x1; x += 0.8) {
        var o = amp * Math.sin(x * k + ph) * Math.cos(x * k * 0.23 + ph * 0.5);
        d += horizontal ? (x.toFixed(1) + ' ' + (y + o).toFixed(2) + ' ') : ((y + o).toFixed(2) + ' ' + x.toFixed(1) + ' ');
      }
    }
    return d;
  }
  function rosette(cx, cy, R) {
    var d = '';
    for (var k = 0; k < 5; k++) {
      var big = 20, small = 20 / 8, dd = small * (2.1 + k * 0.42), m = big + small + dd;
      d += 'M';
      for (var i = 0; i <= 480; i++) {
        var t = (i / 480) * Math.PI * 2;
        var x = (big + small) * Math.cos(t) - dd * Math.cos(((big + small) / small) * t);
        var y = (big + small) * Math.sin(t) - dd * Math.sin(((big + small) / small) * t);
        d += (cx + x / m * R).toFixed(2) + ' ' + (cy + y / m * R).toFixed(2) + ' ';
      }
    }
    return d;
  }
  var INK = '#2E271B';
  function noteArt(back) {
    var bands = guillocheBand(8, 228, 10, 2.4, 0.42, 6, true) + guillocheBand(8, 228, 90, 2.4, 0.42, 6, true) +
      guillocheBand(14, 86, 10, 2.2, 0.46, 5, false) + guillocheBand(14, 86, 226, 2.2, 0.46, 5, false);
    var s = '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 236 100"><defs>' + GOLD +
      '<radialGradient id="p" cx=".5" cy=".5" r=".75"><stop offset="0" stop-color="#EBE3CD"/><stop offset="1" stop-color="#D6CAAA"/></radialGradient>' +
      '<filter id="f" x="0" y="0" width="100%" height="100%"><feTurbulence type="fractalNoise" baseFrequency="0.9 0.35" numOctaves="2" seed="4"/><feColorMatrix type="matrix" values="0 0 0 0 0.45  0 0 0 0 0.38  0 0 0 0 0.25  0.9 0 0 0 -0.42"/></filter></defs>' +
      '<rect width="236" height="100" fill="url(#p)"/><rect width="236" height="100" filter="url(#f)" opacity="0.5"/>' +
      '<rect x="3.5" y="3.5" width="229" height="93" fill="none" stroke="' + INK + '" stroke-width="0.5"/>' +
      '<path d="' + bands + '" fill="none" stroke="' + INK + '" stroke-width="0.26" opacity="0.8"/>' +
      '<rect x="15" y="15" width="206" height="70" fill="none" stroke="' + INK + '" stroke-width="0.35"/>';
    if (!back) {
      s += '<path d="' + rosette(50, 50, 25) + '" fill="none" stroke="#3a3122" stroke-width="0.22" opacity="0.85"/>' +
        '<circle cx="50" cy="50" r="27.5" fill="none" stroke="url(#g)" stroke-width="1.1"/>' +
        '<circle cx="50" cy="50" r="10.5" fill="#E9E0C8"/>' +
        '<text x="50" y="53.6" text-anchor="middle" font-family="Georgia, serif" font-weight="700" font-size="10" fill="' + INK + '">DRO</text>' +
        '<text x="130" y="36" text-anchor="middle" font-family="Georgia, Times New Roman, serif" font-size="10.5" letter-spacing="1.5" fill="' + INK + '">DAILY ROLL OVER</text>' +
        '<text x="130" y="45.5" text-anchor="middle" font-family="Georgia, serif" font-size="5" letter-spacing="2.2" fill="' + INK + '">SWEEPS NOTE</text>' +
        '<path d="M100 50.5h60" stroke="' + INK + '" stroke-width="0.3"/>' +
        '<text x="130" y="60" text-anchor="middle" font-family="Georgia, serif" font-style="italic" font-size="5.2" fill="' + INK + '">Five Sweeps Coins</text>' +
        '<text x="130" y="77" text-anchor="middle" font-family="Menlo, Consolas, monospace" font-size="4.6" letter-spacing="0.6" fill="#6B2A1F">DRO 0928 061400</text>' +
        '<rect x="177" y="3.5" width="6.5" height="93" fill="url(#g)"/>' +
        '<text transform="translate(181.6 8) rotate(90)" font-family="Georgia, serif" font-size="2.3" letter-spacing="0.6" fill="#7a5a18">DRO · DRO · DRO · DRO · DRO · DRO · DRO · DRO · DRO · DRO · DRO · DRO · DRO</text>' +
        '<text x="206" y="62" text-anchor="middle" font-family="Georgia, Times New Roman, serif" font-weight="700" font-size="34" fill="url(#g)" stroke="' + INK + '" stroke-width="0.45">5</text>' +
        '<text x="222" y="24" text-anchor="middle" font-family="Georgia, serif" font-weight="700" font-size="8" fill="' + INK + '">5</text>' +
        '<text x="22" y="87" text-anchor="middle" font-family="Georgia, serif" font-weight="700" font-size="8" fill="' + INK + '">5</text>' +
        '<text x="118" y="17.2" text-anchor="middle" font-family="Arial, sans-serif" font-size="1.55" letter-spacing="0.25" fill="' + INK + '">DAILYROLLOVER·DAILYROLLOVER·DAILYROLLOVER·DAILYROLLOVER·DAILYROLLOVER·DAILYROLLOVER·DAILYROLLOVER·DAILYROLLOVER·DAILYROLLOVER</text>';
    } else {
      var waves = '';
      for (var y = 22; y <= 78; y += 3.2) {
        waves += 'M18 ' + y + ' ';
        for (var x = 18; x <= 218; x += 1.2) waves += x.toFixed(1) + ' ' + (y + 1.6 * Math.sin(x * 0.19 + y * 0.8)).toFixed(2) + ' ';
      }
      s += '<path d="' + waves + '" fill="none" stroke="#3b3a27" stroke-width="0.22" opacity="0.55"/>' +
        '<ellipse cx="118" cy="50" rx="30" ry="24" fill="#E6DDC6"/>' +
        '<text x="118" y="63" text-anchor="middle" font-family="Georgia, serif" font-weight="700" font-size="36" fill="none" stroke="' + INK + '" stroke-width="0.6">5</text>' +
        '<text x="118" y="31.5" text-anchor="middle" font-family="Georgia, serif" font-size="4.4" letter-spacing="1.6" fill="' + INK + '">DAILY ROLL OVER</text>' +
        '<text x="118" y="71.8" text-anchor="middle" font-family="Georgia, serif" font-size="3.4" letter-spacing="1.2" fill="' + INK + '">SWEEPS NOTE · NOT LEGAL TENDER</text>' +
        '<rect x="52.5" y="3.5" width="6.5" height="93" fill="url(#g)"/>';
    }
    return svgURI(s + '</svg>');
  }
  var ART = null;
  function art() {
    if (!ART) {
      ART = {
        chip: { onyx: chipArt('onyx', false), ivory: chipArt('ivory', false) },
        rim: { onyx: chipArt('onyx', true), ivory: chipArt('ivory', true) },
        noteF: noteArt(false), noteB: noteArt(true)
      };
    }
    return ART;
  }

  // ---------- The payout ----------
  var PERSP = 1000;
  var LIGHT = (function () { var v = [-0.30, -0.42, 0.86], m = Math.hypot(v[0], v[1], v[2]); return v.map(function (x) { return x / m; }); })();
  var HALF = (function () { var v = [LIGHT[0], LIGHT[1], LIGHT[2] + 1], m = Math.hypot(v[0], v[1], v[2]); return v.map(function (x) { return x / m; }); })();
  var dot3 = function (n, v) { return n.x * v[0] + n.y * v[1] + n.z * v[2]; };
  var CHIP = 46, CH = 4, NW = 118, NH = 50;
  // Where each piece comes to rest: its projected place as a share of the
  // stage, its depth in px and the attitude it settles at - round the edges,
  // so the deck behind stays readable.
  var TABLEAU = [
    { t: 'chip', k: 'onyx', x: 0.08, y: 0.06, z: 210, r: [52, -18, 0] },
    { t: 'chip', k: 'onyx', x: 1.02, y: 0.22, z: 360, r: [-28, 62, 0] },
    { t: 'chip', k: 'ivory', x: 0.84, y: 0.035, z: 130, r: [24, 32, 0] },
    { t: 'chip', k: 'onyx', x: 0.1, y: 0.95, z: 190, r: [-48, 12, 0] },
    { t: 'chip', k: 'ivory', x: 0.97, y: 0.74, z: 230, r: [66, -14, 0] },
    { t: 'chip', k: 'onyx', x: -0.02, y: 0.6, z: 430, r: [12, 72, 0] },
    { t: 'chip', k: 'ivory', x: 0.62, y: 0.985, z: 290, r: [-72, 6, 0] },
    { t: 'chip', k: 'onyx', x: 0.5, y: 0.02, z: 95, r: [38, -46, 0] },
    { t: 'note', x: 0.27, y: 0.025, z: 150, r: [34, -10, -12] },
    { t: 'note', x: 0.99, y: 0.5, z: 170, r: [-12, -34, 76] },
    { t: 'note', x: 0.0, y: 0.4, z: 290, r: [22, 30, -66] },
    { t: 'note', x: 0.83, y: 0.97, z: 240, r: [-40, 8, 14] },
    { t: 'note', x: 0.3, y: 1.0, z: 130, r: [-30, -12, -6] }
  ];
  var fxFront = null, fxBack = null, shadowsEl = null, flash = null;
  var pieces = [], resting = false, playing = false, fxRAF = 0, launchAnims = [];
  var seed = (Date.now() >>> 0) || 20260928;
  var rnd = function () { seed = (seed * 1664525 + 1013904223) >>> 0; return seed / 4294967296; };

  function buildFx() {
    if (fxFront) return;
    fxBack = document.createElement('div'); fxBack.className = 'show-fx show-fx-back';
    shadowsEl = document.createElement('div'); shadowsEl.className = 'show-fx show-fx-shadows';
    fxFront = document.createElement('div'); fxFront.className = 'show-fx show-fx-front';
    flash = document.createElement('div'); flash.className = 'show-flash';
    [fxBack, shadowsEl, fxFront, flash].forEach(function (el) { el.setAttribute('aria-hidden', 'true'); document.body.appendChild(el); });
  }
  // the stage: the column the app sits in, a little wider, full height
  function geometry() {
    var vw = window.innerWidth, vh = window.innerHeight;
    var main = document.getElementById('main-content');
    var mr = main ? main.getBoundingClientRect() : null;
    var W = Math.min(vw, mr && mr.width ? mr.width + 80 : vw);
    var x0 = (vw - W) / 2;
    return { x0: x0, W: W, H: vh, ox: vw / 2, oy: vh / 2 };
  }
  function chipPiece(kind) {
    var A = art();
    var el = document.createElement('div');
    el.className = 'show-piece';
    el.style.width = el.style.height = CHIP + 'px';
    var faces = [], layers = [], n = 6;
    for (var i = 0; i < n; i++) {
      var L = document.createElement('div');
      L.className = 'show-cl';
      var z = -CH / 2 + (CH * i) / (n - 1);
      if (i === n - 1 || i === 0) {
        L.classList.add('face');
        L.style.backgroundImage = A.chip[kind];
        L.style.transform = 'translateZ(' + z + 'px)' + (i === 0 ? ' rotateY(180deg)' : '');
        var sh = document.createElement('div'); sh.className = 'shade';
        var sp = document.createElement('div'); sp.className = 'spec';
        L.appendChild(sh); L.appendChild(sp);
        faces.push({ shade: sh, spec: sp, sign: i === 0 ? -1 : 1 });
      } else {
        L.style.backgroundImage = A.rim[kind];
        L.style.transform = 'translateZ(' + z + 'px)';
      }
      el.appendChild(L); layers.push(L);
    }
    return { el: el, faces: faces, blurLayers: layers, w: CHIP, h: CHIP, kind: 'chip' };
  }
  function notePiece() {
    var A = art();
    var el = document.createElement('div');
    el.className = 'show-piece';
    el.style.width = NW + 'px'; el.style.height = NH + 'px';
    var pw = NW / 3;
    var mk = function (cls, fx, bx) {
      var P = document.createElement('div');
      P.className = 'show-np' + (cls ? ' ' + cls : '');
      P.style.width = pw + 'px';
      var f = document.createElement('div'); f.className = 'show-np-f';
      f.style.backgroundImage = A.noteF; f.style.backgroundSize = NW + 'px ' + NH + 'px'; f.style.backgroundPosition = (-fx) + 'px 0';
      var b = document.createElement('div'); b.className = 'show-np-f b';
      b.style.backgroundImage = A.noteB; b.style.backgroundSize = NW + 'px ' + NH + 'px'; b.style.backgroundPosition = (-bx) + 'px 0';
      var fs = document.createElement('div'); fs.className = 'shade';
      var fsh = document.createElement('div'); fsh.className = 'sheen';
      var bs = document.createElement('div'); bs.className = 'shade';
      f.appendChild(fs); f.appendChild(fsh); b.appendChild(bs);
      P.appendChild(f); P.appendChild(b);
      return { P: P, f: f, b: b, fs: fs, fsh: fsh, bs: bs };
    };
    var C = mk('', pw, pw);
    C.P.style.left = pw + 'px';
    var Lp = mk('l', 0, 2 * pw), Rp = mk('r', 2 * pw, 0);
    C.P.appendChild(Lp.P); C.P.appendChild(Rp.P);
    el.appendChild(C.P);
    return { el: el, C: C, Lp: Lp, Rp: Rp, w: NW, h: NH, kind: 'note', blurLayers: [C.f, C.b, Lp.f, Lp.b, Rp.f, Rp.b] };
  }

  function pose(p, x, y, z, m, bow, alpha, shAlpha) {
    var f = p.fl;
    f.cur = { x: x, y: y, z: z, m: m, bow: bow, a: alpha };
    p.el.style.opacity = alpha.toFixed(3);
    // through the glass: once it is in front of it, it belongs to the room
    if (!f.inFront && z >= 0) { f.inFront = true; fxFront.appendChild(p.el); }
    p.el.style.transform = 'translate3d(' + (x - p.w / 2).toFixed(2) + 'px,' + (y - p.h / 2).toFixed(2) + 'px,' + z.toFixed(2) + 'px) ' + m.toString();
    var n = m.transformPoint(new DOMPoint(0, 0, 1, 0));
    if (p.kind === 'chip') {
      p.faces.forEach(function (fc) {
        var nn = { x: n.x * fc.sign, y: n.y * fc.sign, z: n.z * fc.sign };
        var d = dot3(nn, LIGHT);
        fc.shade.style.opacity = (0.66 * (1 - (0.36 + 0.64 * Math.max(0, d)))).toFixed(3);
        fc.spec.style.opacity = Math.pow(Math.max(0, dot3(nn, HALF)), 26).toFixed(3);
      });
    } else {
      p.Lp.P.style.transform = 'rotateY(' + bow.toFixed(2) + 'deg)';
      p.Rp.P.style.transform = 'rotateY(' + (-bow).toFixed(2) + 'deg)';
      var light = function (pan, mm) {
        var nn = mm.transformPoint(new DOMPoint(0, 0, 1, 0));
        var df = dot3(nn, LIGHT);
        pan.fs.style.opacity = (0.62 * (1 - (0.42 + 0.58 * Math.max(0, df)))).toFixed(3);
        pan.bs.style.opacity = (0.62 * (1 - (0.42 + 0.58 * Math.max(0, -df)))).toFixed(3);
        pan.fsh.style.opacity = (0.35 * Math.pow(Math.max(0, dot3(nn, HALF)), 14)).toFixed(3);
      };
      light(p.C, m);
      light(p.Lp, m.rotate(0, bow, 0));
      light(p.Rp, m.rotate(0, -bow, 0));
    }
    // the nearest pieces fall out of focus
    var br = Math.round(Math.min(14, Math.max(0, (z - 250) / 60)) * 4) / 4;
    if (br !== f.blur) {
      f.blur = br;
      var fl = br > 0 ? 'blur(' + br + 'px)' : '';
      p.blurLayers.forEach(function (L) { L.style.filter = fl; });
    }
    // contact: a shadow on the glass along the key light
    var sh = p.shd;
    if (z > 1) {
      var sx = x + z * (-LIGHT[0] / LIGHT[2]), sy = y + z * (-LIGHT[1] / LIGHT[2]);
      var ax = m.transformPoint(new DOMPoint(1, 0, 0, 0)), ay = m.transformPoint(new DOMPoint(0, 1, 0, 0));
      var w = p.w * Math.max(0.12, Math.hypot(ax.x, ax.y)), h = p.h * Math.max(0.12, Math.hypot(ay.x, ay.y));
      var ang = Math.atan2(ax.y, ax.x) * 180 / Math.PI;
      var pen = 1.5 + z * 0.05;
      sh.style.width = w + 'px'; sh.style.height = h + 'px';
      sh.style.transform = 'translate(' + (sx - w / 2).toFixed(1) + 'px,' + (sy - h / 2).toFixed(1) + 'px) rotate(' + ang.toFixed(1) + 'deg)';
      sh.style.filter = 'blur(' + (Math.round(pen * 2) / 2) + 'px)';
      sh.style.opacity = (0.5 * Math.max(0, 1 - z / 760) * shAlpha).toFixed(3);
    } else sh.style.opacity = '0';
  }
  function stepPiece(p, el) {
    var f = p.fl;
    if (el < f.delay) return true;
    var te = el - f.delay, A = f.rise, T = A + f.dur;
    var x, y, z, u;
    if (te < A) {                                   // up through the port, toward you
      var ua = te / A;
      x = f.p0.x + f.spread.x * ua; y = f.p0.y + f.spread.y * ua;
      z = f.p0.z + (f.pA.z - f.p0.z) * ua;
      u = 0;
    } else {                                        // then out, and drag brings it to rest
      u = Math.min(1, (te - A) / f.dur);
      var e = 1 - Math.pow(1 - u, 3.4), q = 1 - e;
      x = q * q * f.pA.x + 2 * q * e * f.c.x + e * e * f.p1.x;
      y = q * q * f.pA.y + 2 * q * e * f.c.y + e * e * f.p1.y;
      z = q * q * f.pA.z + 2 * q * e * f.c.z + e * e * f.p1.z;
    }
    var w = Math.min(1, te / T);
    var spin = f.turns * 360 * Math.pow(1 - w, 2.5);
    var kr = Math.max(0, Math.min(1, (te - A * 0.7) / (f.dur * 0.32)));
    var k = kr * kr * (3 - 2 * kr);                 // opens out of its edge-first attitude
    var m = new DOMMatrix().rotateAxisAngleSelf(f.axis[0], f.axis[1], f.axis[2], spin)
      .rotateSelf(f.r[0] * k, f.r[1] * k, f.r[2] * k)
      .rotateSelf(f.pre[0] * (1 - k), f.pre[1] * (1 - k), f.pre[2] * (1 - k));
    var bow = f.bowRest * k + f.bowAmp * Math.sin(f.bowPh + u * 6.283 * f.bowFreq) * Math.pow(1 - u, 1.6) * k;
    pose(p, x, y, z, m, bow, Math.min(1, te / 60), Math.min(1, u / 0.12));
    return te < T;
  }
  // Leaving: each piece carries on toward you and past, faster as it comes,
  // from wherever it is - settled, or still in flight.
  function stepExit(p, el) {
    var f = p.fl, c = f.cur;
    if (el < f.xDelay) return true;
    var u = Math.max(0, Math.min(1, (el - f.xDelay) / f.xDur));
    var e = Math.pow(u, 2.3);
    var x = c.x + f.xDir.x * 70 * e, y = c.y + f.xDir.y * 70 * e - 26 * e;
    var z = c.z + (f.xZ - c.z) * e;
    var m = new DOMMatrix().rotateAxisAngleSelf(f.axis[0], f.axis[1], f.axis[2], -f.xSpin * e).multiply(c.m);
    var bow = c.bow + 9 * Math.sin(f.bowPh + u * 9) * u;
    var a = c.a * (1 - Math.max(0, (u - 0.5) / 0.5));
    pose(p, x, y, z, m, bow, a, a);
    f.cur = c;                                      // (pose() overwrote it; the exit runs from where it began)
    return u < 1;
  }

  function clearPayout() {
    cancelAnimationFrame(fxRAF);
    cancelAnimationFrame(mechRAF);
    playing = false; resting = false;
    launchAnims.forEach(function (a) { try { a.cancel(); } catch (e) {} });
    launchAnims = [];
    mechPose(1e9);
    pieces.forEach(function (p) { p.el.remove(); p.shd.remove(); });
    pieces = [];
    if (fxBack) fxBack.style.clipPath = '';
  }
  function exitPayout(then) {
    if (!pieces.length || !(resting || playing)) { if (then) then(); return; }
    cancelAnimationFrame(fxRAF);
    resting = false; playing = false;
    var g = geometry(), leaving = [];
    pieces.forEach(function (p) {
      if (!p.fl.cur || p.fl.cur.a <= 0.01) { p.el.remove(); p.shd.remove(); return; }   // not out of the port yet
      leaving.push(p);
    });
    pieces = [];
    leaving.forEach(function (p, i) {
      var f = p.fl, dx = f.cur.x - g.ox, dy = f.cur.y - g.oy, l = Math.hypot(dx, dy) || 1;
      f.xDir = { x: dx / l, y: dy / l };
      f.xDelay = i * 22 + rnd() * 60; f.xDur = 560 + rnd() * 220;
      f.xZ = Math.max(f.cur.z + 300, 860 + rnd() * 60); f.xSpin = 60 + rnd() * 140;
      p.el.style.willChange = 'transform';
    });
    var t0 = performance.now();
    var frame = function (t) {
      var running = false;
      leaving.forEach(function (p) { if (stepExit(p, t - t0)) running = true; });
      if (running) requestAnimationFrame(frame);
      else { leaving.forEach(function (p) { p.el.remove(); p.shd.remove(); }); if (then) then(); }
    };
    requestAnimationFrame(frame);
  }

  // The mechanism, on its own clock from the launch: the count clears, the
  // iris takes up its slack, opens with a small overshoot and settles, the
  // bore lights from below; once the last piece is out it closes, with a
  // lag, and the count comes back. It runs to the end whatever the pieces
  // do, so the port is never left open.
  var mechRAF = 0, mechT0 = 0;
  var smooth = function (u) { u = Math.max(0, Math.min(1, u)); return u * u * (3 - 2 * u); };
  function irisOpenAt(ms) {
    if (ms < 110) return 0;
    if (ms < 150) return -0.03 * Math.sin(Math.PI / 2 * (ms - 110) / 40);              // slack taken up
    if (ms < 310) { var u = (ms - 150) / 160; return -0.03 + 1.07 * (1 - Math.pow(1 - u, 3)); } // out, a touch past
    if (ms < 400) return 1.04 - 0.04 * smooth((ms - 310) / 90);                        // settle
    if (ms < 1000) return 1;
    if (ms < 1320) return 1 - 1.018 * smooth((ms - 1000) / 320);                       // closing, just past shut
    if (ms < 1400) return -0.018 * (1 - smooth((ms - 1320) / 80));                     // seat
    return 0;
  }
  function mechPose(ms) {
    var open = irisOpenAt(ms);
    setIris(open);
    if (boreGlow) {
      var gl = ms < 180 ? 0 : ms < 330 ? 0.85 * smooth((ms - 180) / 150) : ms < 1000 ? 0.85 * (1 - smooth((ms - 330) / 670)) : 0;
      boreGlow.setAttribute('opacity', gl.toFixed(3));
    }
    var count = document.getElementById('heroCount');
    if (count) {
      var co = ms < 50 ? 1 : ms < 150 ? 1 - smooth((ms - 50) / 100) : ms < 1260 ? 0 : ms < 1480 ? smooth((ms - 1260) / 220) : 1;
      count.style.opacity = co >= 1 ? '' : co.toFixed(3);
    }
    // nothing rises through blade: the port's window is the aperture
    if (fxBack) {
      var rr = ringVisible();
      if (rr && ms < 1400) {
        var portR = rr.width * IRIS.R / 120 * Math.max(0, Math.min(1, open * 1.12));
        fxBack.style.clipPath = 'circle(' + portR.toFixed(1) + 'px at ' + (rr.left + rr.width / 2).toFixed(1) + 'px ' + (rr.top + rr.height / 2).toFixed(1) + 'px)';
      } else fxBack.style.clipPath = 'circle(0px at 0px 0px)';
    }
    return ms < 1500;                               // (the count is back by 1480)
  }
  function runMech() {
    cancelAnimationFrame(mechRAF);
    mechT0 = performance.now();
    var frame = function (t) {
      if (mechPose(t - mechT0)) mechRAF = requestAnimationFrame(frame);
    };
    mechPose(0);
    mechRAF = requestAnimationFrame(frame);
  }

  function ringVisible() {
    var wrap = document.querySelector('.hero-ring-wrapper');
    if (!wrap || !bezel || document.body.classList.contains('r3-table-mode')) return null;
    var r = wrap.getBoundingClientRect();
    if (!r.width) return null;
    return r;
  }
  function launch() {
    var rr = ringVisible();
    if (!rr || !livelyExec()) return;
    buildFx();
    var g = geometry();
    fxFront.style.perspectiveOrigin = fxBack.style.perspectiveOrigin = g.ox + 'px ' + g.oy + 'px';
    var O = { x: rr.left + rr.width / 2, y: rr.top + rr.height / 2 };
    var wrap = document.querySelector('.hero-ring-wrapper');
    launchAnims = [];
    // wind-up in the ring, then the pop; the dial opens during the wind-up
    launchAnims.push(wrap.animate([
      { transform: 'scale(1)', easing: 'cubic-bezier(.45,0,.55,1)' }, { transform: 'scale(0.952)', offset: 0.4, easing: 'cubic-bezier(.2,.9,.3,1)' },
      { transform: 'scale(1.036)', offset: 0.6, easing: 'ease-in-out' }, { transform: 'scale(0.994)', offset: 0.8, easing: 'ease-in-out' }, { transform: 'scale(1)' }
    ], { duration: 720 }));
    runMech();
    flash.style.left = O.x + 'px'; flash.style.top = O.y + 'px';
    launchAnims.push(flash.animate([{ opacity: 0, transform: 'scale(.6)' }, { opacity: 0, transform: 'scale(.6)', offset: 0.3, easing: 'ease-out' },
      { opacity: 0.8, transform: 'scale(1)', offset: 0.46, easing: 'ease-out' }, { opacity: 0, transform: 'scale(1.35)' }], { duration: 820 }));
    var glow = edge && edge.querySelector('.show-edge-glow');
    if (glow) launchAnims.push(glow.animate([{ opacity: 0.32 }, { opacity: 0.32, offset: 0.3 }, { opacity: 0.95, offset: 0.5 }, { opacity: 0.32 }], { duration: 1300, easing: 'ease-out' }));

    var LAUNCH = 290;
    pieces = TABLEAU.map(function (d, i) {
      var p = d.t === 'chip' ? chipPiece(d.k) : notePiece();
      var s = PERSP / (PERSP - d.z);
      var tx = g.x0 + d.x * g.W, ty = d.y * g.H;
      var p1 = { x: g.ox + (tx - g.ox) / s, y: g.oy + (ty - g.oy) / s, z: d.z };
      var p0 = { x: O.x + (rnd() - 0.5) * 10, y: O.y + (rnd() - 0.5) * 10, z: -320 };
      var mx = (p0.x + p1.x) / 2, my = (p0.y + p1.y) / 2;
      var dx = p1.x - p0.x, dy = p1.y - p0.y, len = Math.hypot(dx, dy) || 1;
      var bend = (rnd() < 0.5 ? -1 : 1) * (22 + rnd() * 46);
      var c = { x: mx - (dy / len) * bend, y: my + (dx / len) * bend - 18 - rnd() * 22, z: (24 + p1.z) / 2 + 70 + rnd() * 70 };
      var ax = rnd() - 0.5, ay = rnd() - 0.5, az = (rnd() - 0.5) * 0.4;
      if (d.t === 'chip') { ax *= 1.6; ay *= 1.6; }
      var am = Math.hypot(ax, ay, az) || 1;
      var ang = rnd() * 6.283, sp = 3 + rnd() * 7;
      var spread = { x: Math.cos(ang) * sp, y: Math.sin(ang) * sp };
      p.fl = {
        p0: p0, p1: p1, c: c, r: d.r, delay: LAUNCH + i * 18 + rnd() * 80, dur: (d.t === 'chip' ? 1500 : 1850) + rnd() * 420,
        rise: 170 + rnd() * 70, spread: spread, pA: { x: p0.x + spread.x, y: p0.y + spread.y, z: 24 },
        pre: d.t === 'chip' ? [78 + rnd() * 8, 0, rnd() * 40] : [rnd() * 20 - 10, 90, rnd() * 30 - 15],
        axis: [ax / am, ay / am, az / am],
        turns: d.t === 'chip' ? 2 + Math.floor(rnd() * 3) : 1,
        bowRest: 7 + rnd() * 5, bowAmp: 20 + rnd() * 10, bowFreq: 1.6 + rnd() * 0.8, bowPh: rnd() * 6.28,
        blur: -1, inFront: false
      };
      p.el.style.opacity = '0';
      p.el.style.willChange = 'transform';
      fxBack.appendChild(p.el);
      var shd = document.createElement('div');
      shd.className = 'show-shd';
      shd.style.opacity = '0';
      shd.style.borderRadius = d.t === 'chip' ? '50%' : '3px';
      shadowsEl.appendChild(shd);
      p.shd = shd;
      return p;
    });
    var t0 = performance.now();
    playing = true;
    var frame = function (t) {
      if (!playing) return;
      var running = false;
      pieces.forEach(function (p) { if (stepPiece(p, t - t0)) running = true; });
      if (running) fxRAF = requestAnimationFrame(frame);
      else {
        playing = false; resting = true;
        pieces.forEach(function (p) { p.el.style.willChange = 'auto'; });
      }
    };
    fxRAF = requestAnimationFrame(frame);
  }
  // Plays the payout from the ready ring, if this is the room and it moves
  // and the ring is on the page; scrolls it into view first when it is not.
  function playPayoutExec() {
    if (!livelyExec()) return false;
    var wrap = document.querySelector('.hero-ring-wrapper');
    if (!wrap || !ringVisible()) return false;
    var go = function () { if (resting || playing) exitPayout(launch); else { clearPayout(); launch(); } };
    var r = wrap.getBoundingClientRect();
    if (r.top < 0 || r.bottom > window.innerHeight) {
      wrap.scrollIntoView({ block: 'center', behavior: 'smooth' });
      setTimeout(go, 520);
    } else go();
    return true;
  }
  // The payout of the room the page is in, if it moves.
  // (info: what the run paid out - { collected } - for a room that shows it)
  function playPayout(info) {
    var r = room();
    if (!r || !r.payout || !lively()) return false;
    return r.payout.play(info || {});
  }
  function playPayoutFromSettings() {
    if (typeof closeModals === 'function') closeModals();
    setTimeout(playPayout, 380);
  }
  // exitDailyRun() calls this with the run's stats; a finished run with
  // something collected is what the house pays out on.
  // (the Lounge only: the Showroom and Quiet hold it back - it is there on
  // the Lounge's button, beside Run today, any time)
  function showOnRunExit(finished, collected) {
    if (!finished || !(collected > 0)) return;
    if (showLevel() !== 'lounge') return;
    setTimeout(function () { playPayout({ collected: collected }); }, 450);
  }
  // The first touch after it settles sends the tableau past you (the touch
  // still reaches whatever it lands on).
  document.addEventListener('pointerdown', function () { if (resting || playing) exitPayout(); }, true);

  // ---------- The executive room ----------
  showAddRoom('executive', {
    name: 'Refinement × Realization',
    lede: 'One skin at three levels of show: the same deck and the same gold on each, with more or less of it moving. Showroom is all of it — the dice, the dealer, the card table as your home.',
    showroom: 'refinement',
    muted: 'executive',
    copy: {
      showroom: 'The card table stays your home. Dice, the dealer, every effect. Uses the most battery.',
      lounge: 'Your deck with the gold edge light, the payout and a glint on every collect.',
      quiet: 'Your deck, held still. Larger numbers, stronger contrast, easiest on battery.'
    },
    mini: function (level) { return level === 'showroom' ? MINI_TABLE : miniRing(level === 'lounge'); },
    build: function () { buildEdge(); buildBezel(); },
    layout: layoutEdge,
    run: drawRun,
    collect: glintCard,
    payout: { label: 'PLAY THE PAYOUT', play: playPayoutExec, clear: clearPayout, busy: function () { return resting || playing; } }
  });

  // ---------- Keeping it all in step ----------
  // (a room left, or one that holds still now, clears its payout)
  function showRefresh() {
    var here = room();
    for (var look in ROOMS) {
      var r = ROOMS[look];
      if (r.payout && (r !== here || !motionOn())) r.payout.clear();
    }
    if (here && here.build) here.build();
    if (runVis !== null) drawRunHere(runVis);
    renderShowLevelUI();
  }
  var resizeRAF = 0;
  window.addEventListener('resize', function () {
    cancelAnimationFrame(resizeRAF);
    resizeRAF = requestAnimationFrame(function () {
      for (var look in ROOMS) {
        var r = ROOMS[look];
        if (r.layout) r.layout();
        if (r.payout && r.payout.busy && r.payout.busy()) r.payout.clear();
      }
    });
  });

  document.addEventListener('DOMContentLoaded', function () {
    var here = room();
    if (here && here.build) here.build();
    if (runVis !== null) drawRunHere(runVis);
    renderShowLevelUI();
  });

  window.showAddRoom = showAddRoom;
  // (what a room in its own file may use: the key light, the motion curve,
  // the glass's corner radius, whether the page moves)
  window.showKit = { NS: NS, LIGHT: LIGHT, HALF: HALF, weighted: weighted, edgeRadius: edgeRadius, motionOn: motionOn, run: function () { return runVis; } };
  window.showLevel = showLevel;
  window.setShowLevel = setShowLevel;
  // (a skin's levels by name, in order - the Theme picker's line under the
  // skin - or null for a skin without a room)
  window.showLevelNames = function (skin) {
    var r = familyOf(skin || skinNow());
    return r ? levelsOf(r).map(function (id) { return [id, COPY[id].name]; }) : null;
  };
  window.renderShowLevelUI = renderShowLevelUI;
  window.openShowSheet = openShowSheet;
  window.closeShowSheet = closeShowSheet;
  window.showRunProgress = showRunProgress;
  window.showCollected = showCollected;
  window.showAfterRender = showAfterRender;
  window.showOnRunExit = showOnRunExit;
  window.playPayout = playPayout;
  window.playPayoutFromSettings = playPayoutFromSettings;
  // (once the page is in: the room's pieces and the payout buttons match the
  // skin this page opened in - showAddRoom only does it when the page is ready)
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', showRefresh);
  else showRefresh();
  window.showRefresh = showRefresh;
})();
