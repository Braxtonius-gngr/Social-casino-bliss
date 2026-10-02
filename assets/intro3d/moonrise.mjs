// MOONRISE: Neon Grid's payout (three.js).
//
// When a Daily Run is finished, the night behind the phone opens: a floor
// grid strikes from the horizon toward you and runs out of the bottom of
// the screen, a sliced red moon rises behind it, a bare steel tree comes up
// in front of the moon and breaks past both edges of the glass, and the
// ready count's neon ring lifts off its plate and floats free at the
// corner. It rests there, still, until the next touch, which folds it all
// back.
//
// Each piece held to a real maker, at three distances (across the room: the
// silhouette; at arm's length: materials, bevels, seams; pinched in 3x: the
// cut, the weld, the gas), for what its surfaces do with the light, what
// it touches and how it moves:
//   The moon - an edge-lit acrylic sign from a sign shop: a disc of red
//     cast acrylic, its lower half cut into slices that thicken toward the
//     bottom, lit from its rim. Room: a big red disc, the synthwave sun.
//     Arm: the colour runs warm at the top to hot pink at the foot; every
//     cut edge is brighter than the face, as edge-lit acrylic is. 3x: the
//     faint banding of the cast sheet, the polished cut. It throws a red
//     halo on the night. It rises with a lift's weight: slow off the
//     bottom, a small overshoot, a settle.
//   The floor - a lighting grid laid on black: lines of light a cell apart
//     running out of the screen. Room: the vanishing grid. Arm: the lines
//     sharp and bright up close, softening into a pink haze at the horizon.
//     3x: each line a hot core in a soft sheath. It strikes from the
//     horizon toward you, as a tube lights from its electrode, drifts
//     toward you and slows to a stop.
//   The tree - a welded steel-rod sculpture from a metal fabricator: rods
//     tapered and blackened, welded at every fork. Room: a bare black tree
//     against the moon. Arm: the moon's red along its edges (a rim light),
//     the ring's cyan on the near branches. 3x: the weld beads at the
//     forks, the taper. It comes up from below the glass like a flat on a
//     stage lift - a wind-up, a small overshoot, a settle, a last sway in
//     the branches - and its shadow falls on the deck where it crosses in
//     front of the glass.
//   The ring - the same neon circle as the plate's (assets/rooms/neon.js):
//     a white-hot core in a red sheath, bare glass where it is not lit,
//     its bloom on whatever is behind it. It lifts off the plate, tips
//     toward you and settles at the corner, its arc striking once as it
//     goes.
//
// Units are CSS pixels, the glass is the plane z = 0 and the camera looks
// at it from in front, placed so the glass is drawn at 1:1 - a point on the
// glass lands on the page pixel under it. The scene is drawn twice, cut at
// the glass: behind it into a canvas under the app, in front of it (with
// the shadows it drops on the glass) into one over it.

import * as THREE from '../vendor/three/three.module.js';

const DEG = Math.PI / 180;
const clamp01 = x => Math.min(Math.max(x, 0), 1);
const smooth = x => { x = clamp01(x); return x * x * (3 - 2 * x); };
const smoother = x => { x = clamp01(x); return x * x * x * (x * (6 * x - 15) + 10); };
const lerp = (a, b, k) => a + (b - a) * k;
// out, a touch past and back: a lift's settle (over: how far past, as a share)
const settle = (u, over = 0.06) => {
  u = clamp01(u);
  const c1 = over * 16, c3 = c1 + 1, v = u - 1;
  return 1 + c3 * v * v * v + c1 * v * v;
};
// a wind-up before the move: a hair back first (share w of the time)
const windup = (u, w = 0.12, back = 0.04) => (u < w ? -back * Math.sin(Math.PI * u / w) : settle((u - w) / (1 - w)));
function seeded(seed) { return () => { seed = (Math.imul(seed, 1664525) + 1013904223) >>> 0; return seed / 4294967296; }; }

// The key light (the app's): above left, in front of the glass.
const LIGHT = new THREE.Vector3(-0.30, 0.42, 0.86).normalize();
const RED = new THREE.Color(0xff2d55), HOT = new THREE.Color(0xff2d95), CYAN = new THREE.Color(0x00e5ff);

function canvasTex(w, h, paint) {
  const c = document.createElement('canvas');
  c.width = w; c.height = h;
  paint(c.getContext('2d'), w, h);
  const t = new THREE.CanvasTexture(c);
  t.colorSpace = THREE.SRGBColorSpace;
  t.anisotropy = 8;
  return t;
}
// a soft round glow, white at its middle, for additive halos
function glowTex() {
  return canvasTex(256, 256, (g, w) => {
    const r = g.createRadialGradient(w / 2, w / 2, 0, w / 2, w / 2, w / 2);
    r.addColorStop(0, 'rgba(255,255,255,1)'); r.addColorStop(0.18, 'rgba(255,255,255,0.55)');
    r.addColorStop(0.45, 'rgba(255,255,255,0.16)'); r.addColorStop(1, 'rgba(255,255,255,0)');
    g.fillStyle = r; g.fillRect(0, 0, w, w);
  });
}

// ------------------------------------------------------------ the moon
// The sign's face: a disc, its lower half cut into slices; drawn at 1024
// so pinched in the cuts stay sharp. (Cut edges and the rim lit brighter,
// as edge-lit acrylic is.)
function moonTex() {
  return canvasTex(1024, 1024, (g, S) => {
    const c = S / 2, R = S * 0.48;
    g.clearRect(0, 0, S, S);
    g.save();
    g.beginPath(); g.arc(c, c, R, 0, Math.PI * 2); g.clip();
    const grad = g.createLinearGradient(0, c - R, 0, c + R);
    grad.addColorStop(0, '#FF8A6A'); grad.addColorStop(0.28, '#FF4A5A'); grad.addColorStop(0.55, '#FF2D55'); grad.addColorStop(1, '#FF007F');
    g.fillStyle = grad; g.fillRect(0, 0, S, S);
    // the cast sheet's faint banding
    for (let y = 0; y < S; y += 3) { const k = Math.sin(y * 0.071) * 0.5 + Math.sin(y * 0.0113 + 2) * 0.5; g.fillStyle = `rgba(255,255,255,${(0.025 + k * 0.02).toFixed(3)})`; g.fillRect(0, y, S, 1); }
    // the slices: gaps from a little below the middle, thicker toward the foot
    const gaps = [];
    let y = c - R * 0.12, gap = R * 0.02;
    while (y < c + R) { gaps.push([y, gap]); y += gap + R * 0.1 * (1 - (y - c) / R * 0.55); gap *= 1.42; }
    g.globalCompositeOperation = 'destination-out';
    gaps.forEach(([y0, gh]) => { g.fillStyle = '#000'; g.fillRect(0, y0, S, gh); });
    g.globalCompositeOperation = 'source-over';
    // each cut's two edges lit: a bright hairline along each
    gaps.forEach(([y0, gh]) => {
      g.fillStyle = 'rgba(255,236,242,0.75)'; g.fillRect(0, y0 - 2.5, S, 2.5); g.fillRect(0, y0 + gh, S, 2.5);
    });
    g.restore();
    // the polished rim
    g.lineWidth = 5; g.strokeStyle = 'rgba(255,238,220,0.8)';
    g.beginPath(); g.arc(c, c, R - 2, Math.PI * 1.02, Math.PI * 1.98); g.stroke();
    g.lineWidth = 4; g.strokeStyle = 'rgba(255,200,230,0.55)';
    g.beginPath(); g.arc(c, c, R - 2, 0.02 * Math.PI, 0.98 * Math.PI); g.stroke();
    // (the gaps again through the lower rim)
    g.globalCompositeOperation = 'destination-out';
    gaps.forEach(([y0, gh]) => { g.fillStyle = '#000'; g.fillRect(0, y0, S, gh); });
    g.globalCompositeOperation = 'source-over';
  });
}

// ------------------------------------------------------------ the floor
// One plane under the scene, drawn by a shader: the grid's lines in world
// units (so a line keeps its width however far off it is, and blurs into
// the haze by itself as it gets finer than a pixel), black under them
// behind the glass, clear in front of it (only the lines cross over the
// deck). `side` keeps one half or the other; `reveal` is how far toward
// you the grid has struck; `scroll` moves it toward you.
function floorMaterial() {
  return new THREE.ShaderMaterial({
    transparent: true, depthWrite: false, toneMapped: false,
    uniforms: { side: { value: -1 }, ground: { value: 0 }, reveal: { value: 0 }, scroll: { value: 0 }, cell: { value: 96 }, bright: { value: 0 }, far: { value: 5200 }, near: { value: 700 } },
    vertexShader: `
      varying vec3 vW;
      void main() { vec4 w = modelMatrix * vec4(position, 1.0); vW = w.xyz; gl_Position = projectionMatrix * viewMatrix * w; }`,
    fragmentShader: `
      uniform float side, ground, reveal, scroll, cell, bright, far, near;
      varying vec3 vW;
      float lineAt(float c, float w) {
        float d = abs(fract(c / cell + 0.5) - 0.5) * cell;
        float fw = fwidth(c) + 1e-4;
        float core = 1.0 - smoothstep(w * 0.5 - fw, w * 0.5 + fw, d);
        float sheath = exp(-d * d / (w * w * 6.0 + fw * fw * 2.0));
        return core + 0.45 * sheath;
      }
      void main() {
        if (vW.z * side < 0.0) discard;
        float dist = near - vW.z;                 // how far off (0 at the near end)
        float k = clamp(dist / far, 0.0, 1.0);    // 0 near, 1 at the horizon
        // struck from the horizon toward you
        float lit = smoothstep(reveal - 0.06, reveal, 1.0 - k);
        lit = 1.0 - lit;
        // in front of the glass the lines thin, go pinker and fade out
        // toward you (a floor lit from the horizon, not from under you)
        float fr = clamp(vW.z / near, 0.0, 1.0);
        float lw = 3.0 * mix(1.0, 0.5, fr);
        float gx = lineAt(vW.x, lw);
        float gz = lineAt(vW.z + scroll, lw);
        float g = max(gx, gz) * lit * bright * (1.0 - 0.45 * step(0.0, vW.z)) * (1.0 - 0.6 * smoothstep(0.35, 1.0, fr));
        // the haze: lines fade into pink toward the horizon
        vec3 line = mix(vec3(1.0, 0.36, 0.72), vec3(1.0, 0.18, 0.5), k);
        vec3 core = mix(vec3(1.0, 0.86, 0.94), line, max(smoothstep(0.0, 0.5, k), 0.7 * fr));
        float haze = smoothstep(0.55, 1.0, k);
        vec3 col = mix(core, vec3(0.9, 0.2, 0.55), haze) * g * (1.0 - 0.75 * haze);
        float glowBand = exp(-pow((1.0 - k) * 7.0, 2.0)) * 0.55 * bright;   // the horizon's own glow
        col += vec3(1.0, 0.18, 0.5) * glowBand;
        float base = vW.z < 0.0 ? 0.94 * ground : 0.0;   // black under the lines, behind the glass only
        float a = clamp(base + max(g, glowBand) * 0.9, 0.0, 1.0);
        gl_FragColor = vec4(col + vec3(0.027, 0.024, 0.06) * base, a);
      }`
  });
}

// ------------------------------------------------------------ the tree
// Welded steel rod: a trunk, forks that part in x (wide, past both edges of
// the glass) and toward you, each rod tapering and ending in a twig; a weld
// bead at every fork. One mesh for the rods, one for the welds.
function buildTree(scale, seed = 11) {
  const rnd = seeded(seed);
  const rods = [], welds = [];
  const up = new THREE.Vector3(0, 1, 0);
  const grow = (p, dir, len, r, depth) => {
    const end = p.clone().addScaledVector(dir, len);
    rods.push([p.clone(), end.clone(), r, r * 0.72]);
    if (depth <= 0 || r < 0.45) return;
    welds.push([end.clone(), r * 0.95]);
    const n = depth > 3 ? 2 : (rnd() < 0.2 ? 3 : 2);
    for (let i = 0; i < n; i++) {
      // (spread wide in x, a little toward you, always up)
      const side = (i / (n - 1 || 1)) * 2 - 1 + (rnd() - 0.5) * 0.5;
      const d = new THREE.Vector3(dir.x * 0.55 + side * (0.75 + rnd() * 0.35), dir.y * 0.7 + 0.32 + rnd() * 0.25, dir.z * 0.5 + (rnd() - 0.25) * 0.6).normalize();
      grow(end, d, len * (0.66 + rnd() * 0.16), r * 0.68, depth - 1);
    }
  };
  grow(new THREE.Vector3(0, 0, 0), up, 0.36 * scale, 0.021 * scale, 6);
  const tmp = new THREE.Object3D(), parts = [];
  rods.forEach(([a, b, r0, r1]) => {
    const len = a.distanceTo(b);
    const geo = new THREE.CylinderGeometry(r1, r0, len, 6, 1, true);
    tmp.position.copy(a).lerp(b, 0.5);
    tmp.quaternion.setFromUnitVectors(up, b.clone().sub(a).normalize());
    tmp.updateMatrix();
    parts.push(geo.applyMatrix4(tmp.matrix));
  });
  const weldParts = welds.map(([p, r]) => new THREE.SphereGeometry(r, 8, 6).translate(p.x, p.y, p.z));
  const merge = list => {
    const pos = [], nor = [];
    list.forEach(g => { const n = g.index ? g.toNonIndexed() : g; pos.push(...n.attributes.position.array); nor.push(...n.attributes.normal.array); g.dispose(); });
    const out = new THREE.BufferGeometry();
    out.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3));
    out.setAttribute('normal', new THREE.Float32BufferAttribute(nor, 3));
    return out;
  };
  // blackened steel: dark, a little metal, a soft sheen that takes the
  // moon's red and the ring's cyan along its edges
  const steel = new THREE.MeshStandardMaterial({ color: 0x141318, metalness: 0.65, roughness: 0.42 });
  const weldM = new THREE.MeshStandardMaterial({ color: 0x1d1b20, metalness: 0.55, roughness: 0.6 });
  const g = new THREE.Group();
  const trunk = new THREE.Mesh(merge(parts), steel), beads = new THREE.Mesh(merge(weldParts), weldM);
  trunk.castShadow = beads.castShadow = true;
  g.add(trunk, beads);
  return g;
}

// ------------------------------------------------------------ the ring
// The plate's neon circle: bare glass all round, the lit arc (the run) a
// white-hot core in a red sheath, its bloom a flat additive ring.
function buildRing(R, run) {
  const g = new THREE.Group();
  const arc = Math.max(0.02, Math.min(1, run || 0.62)) * Math.PI * 2;
  const glass = new THREE.MeshPhysicalMaterial({ color: 0xdfe8f4, metalness: 0, roughness: 0.08, transparent: true, opacity: 0.22, clearcoat: 1, clearcoatRoughness: 0.05 });
  const bare = new THREE.Mesh(new THREE.TorusGeometry(R, 2.1, 12, 96), glass);
  const sheath = new THREE.MeshBasicMaterial({ color: RED.clone().multiplyScalar(1.4), transparent: true, opacity: 0.95, toneMapped: false });
  const core = new THREE.MeshBasicMaterial({ color: 0xffe6ec, toneMapped: false });
  // (the arc runs clockwise from twelve o'clock, as on the plate)
  const lit = new THREE.Group();
  const s = new THREE.Mesh(new THREE.TorusGeometry(R, 1.75, 10, 96, arc), sheath);
  const c = new THREE.Mesh(new THREE.TorusGeometry(R, 0.95, 8, 96, arc), core);
  lit.add(s, c);
  lit.rotation.z = Math.PI / 2; lit.scale.x = -1;
  const bloomTex = canvasTex(256, 256, (x, w) => {
    const rr = x.createRadialGradient(w / 2, w / 2, w * 0.3, w / 2, w / 2, w / 2);
    rr.addColorStop(0, 'rgba(255,255,255,0)'); rr.addColorStop(0.28, 'rgba(255,255,255,0.9)'); rr.addColorStop(0.5, 'rgba(255,255,255,0.25)'); rr.addColorStop(1, 'rgba(255,255,255,0)');
    x.fillStyle = rr; x.fillRect(0, 0, w, w);
  });
  const bloom = new THREE.Mesh(new THREE.PlaneGeometry(R * 3.2, R * 3.2), new THREE.MeshBasicMaterial({ map: bloomTex, color: RED, transparent: true, opacity: 0.55, blending: THREE.AdditiveBlending, depthWrite: false, toneMapped: false }));
  g.add(bloom, bare, lit);
  return { group: g, lit, sheath, core, bloom };
}

// ------------------------------------------------------------ the breakout
// (the moon's face and the soft glow are also the arcade's - its rooftop
// moon and the game's, assets/intro3d/arcade.mjs - so the three are one moon)
export { moonTex, glowTex };

export function createBreakout() {
  let renderer = null, back = null, back2d = null, front = null, front2d = null, scene = null, camera = null;
  let key = null, moonLight = null, ringLight = null, catcher = null, glass = null, raf = 0;
  let state = 'idle', t0 = 0, foldT0 = 0, W = 0, H = 0, D = 1100, dpr = 1, lastFrame = 0;
  let ringEl = null, countEl = null, ringAnim = null, afterFold = null;
  const NEAR_Z = 420, FAR_Z = 5600;
  let moon = null, halo = null, floor = null, floorM = null, tree = null, ring = null, from = null, to = null, F = 200, Rm = 150, MZ = -900;

  function canWebGL() {
    try { const c = document.createElement('canvas'); return !!c.getContext('webgl2'); } catch (e) { return false; }
  }
  function setup() {
    if (renderer) return true;
    if (!canWebGL()) return false;
    renderer = new THREE.WebGLRenderer({ alpha: true, antialias: true, powerPreference: 'low-power' });
    renderer.setClearColor(0x000000, 0);
    renderer.toneMapping = THREE.ACESFilmicToneMapping;
    renderer.outputColorSpace = THREE.SRGBColorSpace;
    renderer.localClippingEnabled = true;
    renderer.shadowMap.enabled = true;
    renderer.shadowMap.type = THREE.PCFShadowMap;
    renderer.shadowMap.autoUpdate = false;
    const layer = cls => { const c = document.createElement('canvas'); c.className = 'nn-moon ' + cls; c.setAttribute('aria-hidden', 'true'); return c; };
    back = layer('nn-moon-back'); back2d = back.getContext('2d');
    front = layer('nn-moon-front'); front2d = front.getContext('2d');
    scene = new THREE.Scene();
    camera = new THREE.PerspectiveCamera(40, 1, 10, 12000);
    // every light the scene will use, from the start (a light added later
    // recompiles every material): the key, the moon's red on the tree, the
    // ring's cyan on the near branches
    key = new THREE.DirectionalLight(0xffeef4, 1.1);
    key.castShadow = true;
    key.shadow.mapSize.set(1024, 1024);
    key.shadow.bias = -0.0008; key.shadow.normalBias = 0.6; key.shadow.radius = 5;
    scene.add(key, key.target);
    moonLight = new THREE.PointLight(0xff2d55, 0, 0, 0);
    ringLight = new THREE.PointLight(0x00e5ff, 0, 0, 0);
    scene.add(moonLight, ringLight, new THREE.HemisphereLight(0x3a2250, 0x05040a, 0.35));
    catcher = new THREE.Mesh(new THREE.PlaneGeometry(1, 1), new THREE.ShadowMaterial({ opacity: 0.3 }));
    catcher.receiveShadow = true;
    scene.add(catcher);
    glass = new THREE.Plane(new THREE.Vector3(0, 0, 1), 0);
    renderer.domElement.addEventListener('webglcontextlost', e => { e.preventDefault(); clear(); });
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
    camera.fov = 2 * Math.atan((H / 2) / D) / DEG;
    camera.near = 10; camera.far = D * 12;
    camera.position.set(0, 0, D);
    camera.lookAt(0, 0, 0);
    camera.updateProjectionMatrix();
    catcher.scale.set(W * 1.5, H * 1.5, 1);
    key.position.copy(LIGHT).multiplyScalar(D * 1.2);
    const sc = key.shadow.camera;
    sc.left = -W; sc.right = W; sc.top = H; sc.bottom = -H; sc.near = 1; sc.far = D * 3;
    sc.updateProjectionMatrix();
  }
  const toWorld = (sx, sy) => new THREE.Vector2(sx - W / 2, H / 2 - sy);

  function build(run) {
    // the floor a fifth of the page under the eye; the moon behind it
    F = H * 0.2;
    // the moon stands just past the grid's far end, so the floor hides its
    // foot as a horizon does; its size set by what it looks from here
    MZ = -(FAR_Z + 120);
    Rm = Math.min(W, H) * 0.44 * (D - MZ) / D;
    const mt = moonTex();
    moon = new THREE.Mesh(new THREE.PlaneGeometry(Rm * 2, Rm * 2), new THREE.MeshBasicMaterial({ map: mt, transparent: true, toneMapped: false, depthWrite: false }));
    halo = new THREE.Mesh(new THREE.PlaneGeometry(Rm * 4.4, Rm * 4.4), new THREE.MeshBasicMaterial({ map: glowTex(), color: new THREE.Color(0xff2d6a), transparent: true, opacity: 0, blending: THREE.AdditiveBlending, depthWrite: false, toneMapped: false }));
    moon.renderOrder = 1; halo.renderOrder = 0;
    floorM = floorMaterial();
    floor = new THREE.Mesh(new THREE.PlaneGeometry(16000, NEAR_Z + FAR_Z), floorM);
    floor.rotation.x = -Math.PI / 2;
    floor.position.set(0, -F, (NEAR_Z - FAR_Z) / 2);
    floor.renderOrder = 2;
    floorM.uniforms.near.value = NEAR_Z; floorM.uniforms.far.value = NEAR_Z + FAR_Z;
    tree = buildTree(H * 0.5);
    ring = buildRing(Math.round(112 * 44 / 120), run);
    ring.group.traverse(o => { if (o.isMesh) o.renderOrder = 5; });
    scene.add(halo, moon, floor, tree, ring.group);
    tree.traverse(o => { if (o.isMesh) o.castShadow = true; });
    ring.group.traverse(o => { if (o.isMesh && o.material.isMeshPhysicalMaterial) o.castShadow = true; });
    // (every material cut at the glass; the floor cuts itself)
    scene.traverse(o => {
      if (!o.material || o === catcher || o === floor) return;
      [].concat(o.material).forEach(m => { m.clippingPlanes = [glass]; m.clipShadows = true; m.needsUpdate = true; });
    });
  }
  function dispose() {
    [halo, moon, floor, tree, ring && ring.group].forEach(o => {
      if (!o) return;
      scene.remove(o);
      o.traverse(x => { if (x.geometry) x.geometry.dispose(); if (x.material) [].concat(x.material).forEach(m => { if (m.map) m.map.dispose(); m.dispose(); }); });
    });
    halo = moon = floor = tree = ring = null;
  }

  // the two halves: in front of the glass (with the shadows it drops on
  // it) into the canvas over the page, behind it into the one under it
  function draw() {
    catcher.visible = true;
    glass.normal.set(0, 0, 1); floorM.uniforms.side.value = 1;
    renderer.shadowMap.needsUpdate = true;
    renderer.render(scene, camera);
    front2d.clearRect(0, 0, front.width, front.height);
    front2d.drawImage(renderer.domElement, 0, 0);
    catcher.visible = false;
    glass.normal.set(0, 0, -1); floorM.uniforms.side.value = -1;
    renderer.render(scene, camera);
    back2d.clearRect(0, 0, back.width, back.height);
    back2d.drawImage(renderer.domElement, 0, 0);
  }

  // The timeline, in ms from the start (the hold after it is still):
  //   0-260      the wind-up: the plate dips, the ring comes off it
  //   150-1500   the grid strikes from the horizon toward you
  //   150-3700   it drifts toward you, slowing to a stop
  //   320-2400   the moon rises: slow off the bottom, past and back
  //   900-2200   the tree comes up in front of it, a last sway after
  //   200-1800   the ring lifts to the corner, its arc striking at 700
  const T = { grid: [150, 1500], drift: [150, 3700], moon: [320, 2400], tree: [900, 2200], sway: [2200, 3500], ring: [200, 1800], strike: [700, 900], end: 3700 };
  const DRIFT = 260;          // how far the grid drifts toward you, all told
  function strike(ms) {
    // a tube lighting: a stutter, then on
    const [a, b] = T.strike;
    if (ms < a) return 0;
    if (ms > b) return 1;
    const u = (ms - a) / (b - a);
    return u < 0.2 ? 0.85 : u < 0.32 ? 0.2 : u < 0.5 ? 1 : u < 0.58 ? 0.55 : 1;
  }
  function poseAt(ms) {
    const gridU = clamp01((ms - T.grid[0]) / (T.grid[1] - T.grid[0]));
    floorM.uniforms.reveal.value = smoother(gridU) * 1.06;
    floorM.uniforms.bright.value = smooth(gridU * 3);
    floorM.uniforms.ground.value = smooth(ms / 280);
    // (drifts toward you, slowing: the distance an easing-out covers)
    const du = clamp01((ms - T.drift[0]) / (T.drift[1] - T.drift[0]));
    floorM.uniforms.scroll.value = DRIFT * (1 - Math.pow(1 - du, 3));
    // the moon: from under the floor's edge up to its rest, half above it
    const mu = windup(clamp01((ms - T.moon[0]) / (T.moon[1] - T.moon[0])), 0.1, 0.03);
    const floorAtMoon = -F;                                    // the floor's height where the moon stands
    const my = lerp(floorAtMoon - Rm * 1.05, floorAtMoon + Rm * 0.42, mu);
    moon.position.set(0, my, MZ);
    halo.position.set(0, my, MZ - 5);
    // (it waits under the ground: shown only once the ground is down)
    moon.material.opacity = smooth((ms - 220) / 120);
    halo.material.opacity = 0.5 * smooth((ms - T.moon[0] - 200) / 1400);
    moonLight.position.set(0, -F + H * 0.3, -D * 1.4);
    moonLight.intensity = 2.6 * smooth((ms - T.moon[0]) / 1200);
    // the tree: up from below the glass on its lift, then a last sway
    const tu = windup(clamp01((ms - T.tree[0]) / (T.tree[1] - T.tree[0])), 0.12, 0.05);
    tree.position.set(-W * 0.2, lerp(-F - H * 0.6, -F, tu), -D * 0.25);
    const su = clamp01((ms - T.sway[0]) / (T.sway[1] - T.sway[0]));
    tree.rotation.set(0, 0.35, Math.sin(su * Math.PI * 2.5) * 0.012 * (1 - su));
    // the ring: off the plate, tipped toward you, to the corner
    const ru = windup(clamp01((ms - T.ring[0]) / (T.ring[1] - T.ring[0])), 0.14, 0.03);
    ring.group.position.set(lerp(from.x, to.x, ru), lerp(from.y, to.y, ru), lerp(0, to.z, ru));
    ring.group.rotation.set(lerp(0, 22, ru) * DEG, lerp(0, -28, ru) * DEG, lerp(0, 6, ru) * DEG);
    const s = strike(ms);
    ring.lit.visible = s > 0.02;
    ring.sheath.opacity = 0.95 * s; ring.bloom.material.opacity = 0.55 * s;
    ring.core.color.setRGB(1, lerp(0.35, 0.9, s), lerp(0.4, 0.93, s));
    ringLight.position.copy(ring.group.position).add(new THREE.Vector3(0, 0, 60));
    ringLight.intensity = 1.4 * s;
    return ms >= T.end;
  }
  function fold(ms) {
    // back the way it came, quicker: the ring home first, the tree down,
    // the moon sets, the grid goes out from the near end
    const u = clamp01(ms / 1100);
    const ru = smoother(u / 0.55);
    ring.group.position.set(lerp(to.x, from.x, ru), lerp(to.y, from.y, ru), lerp(to.z, 0, ru));
    ring.group.rotation.set(lerp(22, 0, ru) * DEG, lerp(-28, 0, ru) * DEG, lerp(6, 0, ru) * DEG);
    const tu = smoother((u - 0.05) / 0.6);
    tree.position.y = lerp(-F, -F - H * 0.6, tu);
    const mu = smoother((u - 0.15) / 0.75);
    const my = lerp(-F + Rm * 0.42, -F - Rm * 1.05, mu);
    moon.position.y = my; halo.position.y = my;
    moon.material.opacity = 1 - smooth((u - 0.86) / 0.04);
    halo.material.opacity = 0.5 * (1 - mu);
    moonLight.intensity = 2.6 * (1 - mu);
    floorM.uniforms.bright.value = 1 - smooth((u - 0.3) / 0.7);
    floorM.uniforms.ground.value = 1 - smooth((u - 0.86) / 0.14);
    return u >= 1;
  }

  function loop(t) {
    if (state === 'idle') return;
    raf = requestAnimationFrame(loop);
    if (t - lastFrame < 14) return;
    lastFrame = t;
    if (state === 'folding') {
      const done = fold(t - foldT0);
      draw();
      if (done) teardown();
      return;
    }
    const done = poseAt(Math.max(0, t - t0));
    draw();
    if (done) { state = 'resting'; cancelAnimationFrame(raf); raf = 0; }
  }

  function play(o = {}) {
    if (state !== 'idle') { foldAway(() => play(o)); return true; }
    if (!setup()) return false;
    ringEl = o.ring || document.querySelector('.hero-ring-wrapper');
    if (!ringEl) return false;
    const rr = ringEl.getBoundingClientRect();
    if (!rr.width) return false;
    frame();
    build(o.run);
    const a = toWorld(rr.left + rr.width / 2, rr.top + rr.height / 2);
    from = { x: a.x, y: a.y };
    // (the corner: top right, clear of the header's buttons)
    // (placed so that, lifted 150 toward you, it lands on that spot)
    const b = toWorld(W - 64, 152), k = (D - 150) / D;
    to = { x: b.x * k, y: b.y * k, z: 150 };
    document.body.appendChild(back);
    document.body.appendChild(front);
    // the plate dips as the ring comes off it, then gives it up
    ringAnim = ringEl.animate([
      { transform: 'scale(1)', easing: 'cubic-bezier(.45,0,.55,1)' }, { transform: 'scale(0.95)', offset: 0.34, easing: 'cubic-bezier(.2,.9,.3,1)' },
      { transform: 'scale(1.03)', offset: 0.58, easing: 'ease-in-out' }, { transform: 'scale(0.995)', offset: 0.8 }, { transform: 'scale(1)' }
    ], { duration: 760 });
    ringEl.classList.add('nn-out');
    poseAt(0);
    // Nothing may compile or upload once it moves: shaders built and
    // textures sent before the clock starts, the first frame drawn then.
    state = 'starting';
    const go = () => {
      if (state !== 'starting') return;
      draw();
      state = 'playing';
      t0 = performance.now();
      lastFrame = 0;
      raf = requestAnimationFrame(loop);
    };
    scene.traverse(obj => { if (obj.material) [].concat(obj.material).forEach(m => { if (m.map) renderer.initTexture(m.map); }); });
    (renderer.compileAsync ? renderer.compileAsync(scene, camera) : Promise.resolve(renderer.compile(scene, camera))).then(go, go);
    return true;
  }
  function foldAway(then) {
    if (state === 'idle') { if (then) then(); return; }
    if (state === 'folding') return;
    if (state === 'starting') { afterFold = then || null; teardown(); return; }
    state = 'folding';
    foldT0 = performance.now();
    afterFold = then || null;
    if (!raf) raf = requestAnimationFrame(loop);
  }
  function teardown() {
    cancelAnimationFrame(raf); raf = 0;
    state = 'idle';
    if (ringEl) ringEl.classList.remove('nn-out');
    dispose();
    if (front) front.remove();
    if (back) back.remove();
    const then = afterFold; afterFold = null;
    if (then) then();
  }
  function clear() {
    if (ringAnim) { try { ringAnim.cancel(); } catch (e) {} ringAnim = null; }
    afterFold = null;
    if (state !== 'idle') teardown();
  }
  // the next touch folds it away (the touch still reaches what it lands on)
  document.addEventListener('pointerdown', () => { if (state === 'playing' || state === 'resting' || state === 'starting') foldAway(); }, true);
  // (the lab's: stop the clock and show the payout at ms from its start,
  // or folding at ms from the touch with fold)
  const seek = (ms, folding) => {
    if (!moon) return null;
    cancelAnimationFrame(raf); raf = 0;
    state = 'resting';
    const t = performance.now();
    if (folding) fold(ms); else poseAt(ms);
    draw();
    return performance.now() - t;
  };
  const probe = () => {
    if (!moon) return null;
    const pr = v => { const w = v.clone().project(camera); return [Math.round((w.x + 1) / 2 * W), Math.round((1 - w.y) / 2 * H), Math.round(v.z)]; };
    return { W, H, D: Math.round(D), moon: pr(moon.position), ring: pr(ring.group.position), tree: pr(tree.position), programs: renderer.info.programs.length };
  };
  return { play, clear, busy: () => state !== 'idle', fold: foldAway, seek, probe };
}
