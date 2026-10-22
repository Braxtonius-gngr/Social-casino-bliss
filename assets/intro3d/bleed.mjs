// THE BLEED: Burin & Brimstone's payout (three.js).
//
// When a Daily Run is finished, the plate bleeds. Everything else on the
// page is cut in bone line; this is the one thing that is wet and real.
// Blood wells out of the plate mark along the top of the glass - a bead
// swells at each cut, hangs, and lets go - and runs down the glass in
// rivulets, each its own path and pace: a run narrows as it goes, hangs
// where it slows and bulges there, and leaves a thinner trace behind its
// head. Some run down BEHIND the deck (under the cards, seen between them)
// and some over it, dropping shadows on the glass. They pool along the
// foot of the screen into one slick with a lipped edge, and from the pool
// drops fall through the glass toward you. It rests there, wet, catching
// the light, until the next touch, when it dries to a dull brown and sinks
// back into the plate.
//
// Held to the real thing: fresh arterial blood is a deep red with a hard
// clear sheen (a clearcoat over a dark, barely rough body) and goes dark
// and matte as it dries; a run on glass is a bead with a tail, the bead a
// little wider than the tail, the tail a thin film.
//
// Drawn as the orrery is (orrery.mjs createBreakout): the scene cut at
// the glass (z = 0, 1:1 with the page), the part behind into a canvas
// under the app, the part in front into one over it. Units are CSS px.

import * as THREE from '../vendor/three/three.module.js';
import { studioEnvironment } from './intro.mjs';

const clamp01 = x => Math.min(Math.max(x, 0), 1);
const smooth = x => { x = clamp01(x); return x * x * (3 - 2 * x); };
const smoother = x => { x = clamp01(x); return x * x * x * (x * (6 * x - 15) + 10); };
const lerp = (a, b, k) => a + (b - a) * k;
const LIGHT = new THREE.Vector3(-0.30, 0.42, 0.86).normalize();
const seeded = s => () => { s = (Math.imul(s, 1664525) + 1013904223) >>> 0; return s / 4294967296; };

function bloodMat() {
  return new THREE.MeshPhysicalMaterial({ color: 0x6a0c0c, roughness: 0.32, metalness: 0, clearcoat: 1, clearcoatRoughness: 0.18, envMapIntensity: 1.2, emissive: 0x180101, emissiveIntensity: 0.5, ior: 1.42, specularIntensity: 1 });
}

// One rivulet: its path down the glass (screen x,y in world units: x right,
// y up), its depth z, its pace, and the meshes that draw it.
function makeRun(rnd, x0, yTop, yBot, z, mat) {
  const pts = [];
  let x = x0, y = yTop;
  const n = 14, step = (yTop - yBot) / n;
  for (let i = 0; i <= n; i++) {
    pts.push(new THREE.Vector3(x, y, z));
    // it wanders, and now and then jogs where it met a dry spot
    x += (rnd() - 0.5) * 14 + (rnd() < 0.15 ? (rnd() - 0.5) * 30 : 0);
    y -= step * (0.7 + rnd() * 0.6);
  }
  pts[pts.length - 1].y = yBot;
  const curve = new THREE.CatmullRomCurve3(pts);
  const L = curve.getLength();
  // the tail: a tube that narrows down its length (scaled by hand below)
  const geo = new THREE.TubeGeometry(curve, 64, 1, 10, false);
  // taper: the radius falls from the head's width to a film
  const pos = geo.attributes.position, nrm = geo.attributes.normal, p = new THREE.Vector3();
  const cp = new THREE.Vector3();
  for (let i = 0; i < pos.count; i++) {
    const seg = Math.floor(i / 11) / 64;            // (tube rings of 11 points)
    curve.getPointAt(Math.min(1, seg), cp);
    p.fromBufferAttribute(pos, i).sub(cp);
    const r = lerp(3.6, 1.5, seg) * (0.85 + 0.3 * Math.sin(seg * 40 + x0));
    p.multiplyScalar(r).add(cp);
    pos.setXYZ(i, p.x, p.y, p.z);
  }
  geo.computeVertexNormals();
  const tube = new THREE.Mesh(geo, mat);
  tube.castShadow = z > 0;
  // the head: a bead
  const bead = new THREE.Mesh(new THREE.SphereGeometry(1, 18, 12), mat);
  bead.castShadow = z > 0;
  // its own clip: the tail only exists above the head
  const plane = new THREE.Plane(new THREE.Vector3(0, 1, 0), 0);
  return { curve, L, tube, bead, plane, z, pace: 0.7 + rnd() * 0.6, delay: rnd() * 900, swell: 0.6 + rnd() * 0.5, u: 0 };
}

export function createBreakout() {
  let renderer = null, back = null, back2d = null, front = null, front2d = null, scene = null, camera = null, env = null;
  let catcher = null, key = null, glass = null, raf = 0;
  let state = 'idle', t0 = 0, foldT0 = 0, W = 0, H = 0, D = 1100, dpr = 1, lastFrame = 0;
  let group = null, runs = [], pool = null, drops = [], mats = [], wells = [], afterFold = null, ringEl = null, ringAnim = null;

  function canWebGL() { try { return !!document.createElement('canvas').getContext('webgl2'); } catch (e) { return false; } }
  function setup() {
    if (renderer) return true;
    if (!canWebGL()) return false;
    renderer = new THREE.WebGLRenderer({ alpha: true, antialias: true, powerPreference: 'low-power' });
    renderer.setClearColor(0x000000, 0);
    renderer.toneMapping = THREE.ACESFilmicToneMapping;
    renderer.toneMappingExposure = 1.1;
    renderer.outputColorSpace = THREE.SRGBColorSpace;
    renderer.localClippingEnabled = true;
    renderer.shadowMap.enabled = true;
    renderer.shadowMap.type = THREE.PCFShadowMap;
    renderer.shadowMap.autoUpdate = false;
    const layer = cls => { const c = document.createElement('canvas'); c.className = 'bb-bleed ' + cls; c.setAttribute('aria-hidden', 'true'); return c; };
    back = layer('bb-bleed-back'); back2d = back.getContext('2d');
    front = layer('bb-bleed-front'); front2d = front.getContext('2d');
    scene = new THREE.Scene();
    env = studioEnvironment(renderer);
    scene.environment = env;
    scene.environmentIntensity = 0.7;
    camera = new THREE.PerspectiveCamera(40, 1, 10, 6000);
    key = new THREE.DirectionalLight(0xfff1dc, 5.5);
    key.castShadow = true;
    key.shadow.mapSize.set(1024, 1024);
    key.shadow.bias = -0.0006; key.shadow.normalBias = 0.5; key.shadow.radius = 4;
    scene.add(key, key.target);
    scene.add(new THREE.HemisphereLight(0xffe8d8, 0x1a0a06, 0.3));
    // a cooler glint from the lower right, so the far side of a run has an edge
    const rim = new THREE.DirectionalLight(0xdfe8ff, 1.6); rim.position.set(1, -0.6, 0.8); scene.add(rim);
    catcher = new THREE.Mesh(new THREE.PlaneGeometry(1, 1), new THREE.ShadowMaterial({ opacity: 0.3 }));
    catcher.receiveShadow = true;
    scene.add(catcher);
    glass = new THREE.Plane(new THREE.Vector3(0, 0, 1), 0);
    renderer.domElement.addEventListener('webglcontextlost', e => { e.preventDefault(); clear(); });
    renderer.domElement.addEventListener('webglcontextrestored', () => { const old = env; env = studioEnvironment(renderer); scene.environment = env; if (old) old.dispose(); });
    return true;
  }
  function frame() {
    W = window.innerWidth; H = window.innerHeight;
    dpr = Math.min(window.devicePixelRatio || 1, 2);
    renderer.setPixelRatio(dpr);
    renderer.setSize(W, H, false);
    back.width = front.width = Math.round(W * dpr); back.height = front.height = Math.round(H * dpr);
    D = Math.max(W, H) * 1.3;
    camera.aspect = W / H;
    camera.fov = 2 * Math.atan((H / 2) / D) * 180 / Math.PI;
    camera.near = 10; camera.far = D * 4;
    camera.position.set(0, 0, D); camera.lookAt(0, 0, 0); camera.updateProjectionMatrix();
    catcher.scale.set(W * 1.5, H * 1.5, 1);
    key.position.copy(LIGHT).multiplyScalar(D * 1.2);
    const sc = key.shadow.camera; sc.left = -W; sc.right = W; sc.top = H; sc.bottom = -H; sc.near = 1; sc.far = D * 3; sc.updateProjectionMatrix();
  }
  function draw() {
    catcher.visible = true; glass.normal.set(0, 0, 1);
    renderer.shadowMap.needsUpdate = true;
    renderer.render(scene, camera);
    front2d.clearRect(0, 0, front.width, front.height); front2d.drawImage(renderer.domElement, 0, 0);
    catcher.visible = false; glass.normal.set(0, 0, -1);
    renderer.render(scene, camera);
    back2d.clearRect(0, 0, back.width, back.height); back2d.drawImage(renderer.domElement, 0, 0);
  }

  // the build: wells along the top, runs from them, the pool, the drops
  function build(count) {
    const rnd = seeded(97 + count * 13 + (Date.now() % 1000));
    group = new THREE.Group();
    const n = Math.min(12, 6 + count);
    const yTop = H / 2 + 4, yBot = -H / 2 + 26;
    for (let i = 0; i < n; i++) {
      const x = -W / 2 + W * (i + 0.5 + (rnd() - 0.5) * 0.6) / n;
      const z = i % 2 === 1 ? 7 + rnd() * 6 : -(14 + rnd() * 30);     // half of them in front of the deck
      const mat = bloodMat(); mats.push(mat);
      const r = makeRun(rnd, x, yTop, yBot, z, mat);
      mat.clippingPlanes = [glass, r.plane]; mat.clipShadows = true;
      group.add(r.tube, r.bead);
      // the well: a bead that swells at the top edge before the run lets go
      const w = new THREE.Mesh(new THREE.SphereGeometry(1, 16, 10), mat);
      w.position.set(x, yTop - 2, z); w.scale.setScalar(0.01); w.castShadow = z > 0;
      group.add(w); wells.push(w);
      runs.push(r);
    }
    // the pool: a slick lying against the glass - a flattened dome, its
    // lip lumpy, so the light grades across it and sits on its crown
    const pm = bloodMat(); mats.push(pm); pm.clippingPlanes = [glass]; pm.clipShadows = true;
    const R = Math.min(W * 0.38, 150);
    const pg = new THREE.SphereGeometry(1, 56, 20);
    const pp = pg.attributes.position, pv = new THREE.Vector3();
    for (let i = 0; i < pp.count; i++) {
      pv.fromBufferAttribute(pp, i);
      const a = Math.atan2(pv.y, pv.x), lump = 1 + 0.16 * Math.sin(a * 3 + 1) * rnd() + 0.08 * Math.sin(a * 7 + 2);
      pp.setXYZ(i, pv.x * R * lump, pv.y * R * 0.2 * lump, pv.z * 7);
    }
    pg.computeVertexNormals();
    pool = new THREE.Mesh(pg, pm);
    pool.position.set(0, yBot - 10, 2); pool.scale.setScalar(0.01); pool.castShadow = true;
    group.add(pool);
    // the drops: from the pool's lip, through the glass toward you
    for (let i = 0; i < 5; i++) {
      const d = new THREE.Mesh(new THREE.SphereGeometry(3.2 + rnd() * 1.6, 16, 12), pm);
      d.visible = false; d.castShadow = true;
      d.userData = { x: (rnd() - 0.5) * R * 1.4, t0: 2600 + i * 420 + rnd() * 300, dur: 900 + rnd() * 300 };
      group.add(d); drops.push(d);
    }
    scene.add(group);
  }
  const T = { well: [0, 520], run: [420, 3400], pool: [1700, 3800], end: 4600 };
  const _p = new THREE.Vector3(), _q = new THREE.Vector3();
  function poseAt(ms) {
    runs.forEach((r, i) => {
      const wu = smoother((ms - r.delay * 0.4) / 520);
      wells[i].scale.setScalar(lerp(0.01, 5.4 * r.swell, wu) * (1 + 0.06 * Math.sin(ms / 90 + i)));
      // the run: lets go once the well is full, then down at its own pace,
      // slowing as it thins
      const u0 = clamp01((ms - T.run[0] - r.delay) / ((T.run[1] - T.run[0]) * r.pace));
      const u = 1 - Math.pow(1 - u0, 1.6);
      r.u = u;
      r.curve.getPointAt(Math.max(0.0001, u), _p);
      r.plane.constant = -_p.y - 0.5;                // (keeps what is above the head)
      r.bead.position.copy(_p);
      const bw = lerp(5.2, 3.2, u) * (u0 > 0 && u0 < 1 ? 1 + 0.25 * Math.max(0, Math.sin(ms / 140 + i)) : 1);
      r.bead.scale.set(bw, bw * 1.35, bw);
      r.bead.visible = u0 > 0;
      r.tube.visible = u0 > 0;
    });
    const pu = settle((ms - T.pool[0]) / (T.pool[1] - T.pool[0]));
    pool.scale.set(lerp(0.01, 1, pu), lerp(0.01, 1, pu), 1);
    drops.forEach(d => {
      const k = clamp01((ms - d.userData.t0) / d.userData.dur);
      d.visible = k > 0 && k < 1;
      // out of the glass and down, under gravity
      d.position.set(d.userData.x, pool.position.y - 6 - 900 * k * k, 4 + 60 * k);
    });
    return ms >= T.end;
  }
  const settle = (u, over = 0.05) => { u = clamp01(u); const c1 = over * 16, c3 = c1 + 1, v = u - 1; return 1 + c3 * v * v * v + c1 * v * v; };
  // drying: the sheen goes, the red goes brown, it all sinks back behind the glass
  const WET = new THREE.Color(0x6a0c0c), DRY = new THREE.Color(0x2a120c);
  function fold(ms) {
    const u = clamp01(ms / 1100), k = smoother(u);
    mats.forEach(m => { m.color.copy(WET).lerp(DRY, k); m.clearcoat = 1 - k; m.roughness = lerp(0.32, 0.9, k); m.emissiveIntensity = 0.5 * (1 - k); });
    group.position.z = -60 * smoother((u - 0.3) / 0.7);
    return u >= 1;
  }
  function loop(t) {
    if (state === 'idle') return;
    raf = requestAnimationFrame(loop);
    if (t - lastFrame < 14) return;
    lastFrame = t;
    if (state === 'folding') { const done = fold(t - foldT0); draw(); if (done) teardown(); return; }
    const done = poseAt(Math.max(0, t - t0));
    draw();
    if (done) { state = 'resting'; cancelAnimationFrame(raf); raf = 0; }
  }
  function play(o = {}) {
    if (state !== 'idle') { foldAway(() => play(o)); return true; }
    if (!setup()) return false;
    ringEl = o.ring || document.querySelector('.hero-ring-wrapper');
    frame();
    build(o.count || 1);
    document.body.appendChild(back); document.body.appendChild(front);
    // the wheel shudders as the plate gives
    if (ringEl && ringEl.animate) ringAnim = ringEl.animate([{ transform: 'translate(0,0)' }, { transform: 'translate(-1.5px,1px)' }, { transform: 'translate(1.5px,-0.5px)' }, { transform: 'translate(-0.5px,0.5px)' }, { transform: 'translate(0,0)' }], { duration: 420, easing: 'steps(6,end)' });
    poseAt(0);
    state = 'starting';
    const go = () => { if (state !== 'starting') return; draw(); state = 'playing'; t0 = performance.now(); lastFrame = 0; raf = requestAnimationFrame(loop); };
    (renderer.compileAsync ? renderer.compileAsync(scene, camera) : Promise.resolve(renderer.compile(scene, camera))).then(go, go);
    return true;
  }
  function foldAway(then) {
    if (state === 'idle') { if (then) then(); return; }
    if (state === 'folding') return;
    if (state === 'starting') { afterFold = then || null; teardown(); return; }
    state = 'folding'; foldT0 = performance.now(); afterFold = then || null;
    if (!raf) raf = requestAnimationFrame(loop);
  }
  function teardown() {
    cancelAnimationFrame(raf); raf = 0; state = 'idle';
    if (group) { scene.remove(group); group.traverse(o => { if (o.geometry) o.geometry.dispose(); }); group = null; }
    mats.forEach(m => m.dispose()); mats = []; runs = []; wells = []; drops = []; pool = null;
    if (front) front.remove(); if (back) back.remove();
    const then = afterFold; afterFold = null; if (then) then();
  }
  function clear() { if (ringAnim) { try { ringAnim.cancel(); } catch (e) {} ringAnim = null; } afterFold = null; if (state !== 'idle') teardown(); }
  document.addEventListener('pointerdown', () => { if (state === 'playing' || state === 'resting' || state === 'starting') foldAway(); }, true);
  const seek = (ms, folding) => { if (!group) return null; cancelAnimationFrame(raf); raf = 0; state = 'resting'; if (folding) fold(ms); else poseAt(ms); draw(); return true; };
  return { play, clear, busy: () => state !== 'idle', fold: foldAway, seek, lab: () => ({ THREE, scene, renderer, camera, draw, runs, pool }) };
}
