// INFERNO: West Texas Gore Fest's payout (three.js).
//
// When a Daily Run is finished, fire tears out of the phone: flame comes up
// from under the glass and over its bottom edge, embers lift through it, a
// burning bone die tumbles up out of the fire and through the glass, and
// hangs there in front of it, its pips glowing - the face toward you is
// today's take - while the branding-iron ring round the ready count lifts
// off its plate and floats free at the side. It rests there, still, until
// the next touch, which folds it all back into the fire and the fire back
// under the glass.
//
// Each piece held to a real maker, at three distances (across the room: the
// silhouette; at arm's length: materials, bevels, seams; pinched in 3x: the
// grain, the wear), for what its surfaces do with the light, what it
// touches and how it moves:
//   The fire - a stage pyrotechnician's gas flame bar: a row of tongues fed
//     from below, each a sheet of flame that licks up, thins and lets go.
//     Room: a wall of fire up the bottom half of the glass. Arm: blood red
//     at the edges, orange through the body, yellow to white at the core
//     of each tongue, soft at the top. 3x: the tongues' edges are torn by
//     the draught (noise), never the same frame twice. Sheets of it stand
//     at several depths: the far ones behind the glass, the near ones in
//     front of it, over the bezel. It throws orange light up onto the die
//     and its glow onto the page. It comes up from under the glass with a
//     breath (a wind-up), overshoots and settles to a burn.
//   The embers - what a bonfire sheds: sparks that lift on the draught,
//     drift, cool from white to red and go out. Points, each its own size
//     and life; those in front of the glass cross the bezel.
//   The die - a bone die from a scrimshaw carver's bench: cow bone, sawn
//     and squared, its edges rounded by hand, the pips drilled and inked
//     arterial red. Room: a pale cube against the fire. Arm: the bone's
//     cream going to amber at the corners where it has been handled, the
//     pips sunk and dark at their rims. 3x: the bone's fine grain lines,
//     the drill's rings in each pip, a chip off one corner. Opposite faces
//     sum to seven and one-two-three run counter-clockwise round their
//     corner, as a Western die's do; the face toward you is today's take
//     (one to six), its pips lit from inside like eyes. The key light gives
//     it a hard highlight on the near edges; the fire warms its underside.
//     It tumbles up out of the fire (two turns and a bit, slowing), through
//     the glass, overshoots its rest and settles with a last rock; its
//     shadow lands on the glass under it.
//   The ring - the room's branding iron (assets/rooms/western.js): forge-
//     black iron heated along the run, white-hot at the head. It lifts off
//     its plate, tips toward you and settles at the side, shedding a few
//     embers as it goes.
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
// a move with weight: past its mark, then back (a small overshoot)
const settle = (u, over = 0.06) => {
  u = clamp01(u);
  const s = smoother(u);
  return s + over * Math.sin(Math.PI * clamp01((u - 0.55) / 0.45)) * (1 - u);
};
const windup = (u, w = 0.12, back = 0.04) => (u < w ? -back * Math.sin(Math.PI * u / w) : settle((u - w) / (1 - w)));
function seeded(seed) { return () => { seed = (Math.imul(seed, 1664525) + 1013904223) >>> 0; return seed / 4294967296; }; }

// the key light: above left, in front of the glass (as the room's)
const LIGHT = new THREE.Vector3(-0.30, 0.42, 0.86).normalize();
const EMBER = new THREE.Color(0xff6a13), MOLTEN = new THREE.Color(0xffb21a), ARTERIAL = new THREE.Color(0xc41e2e);

function canvasTex(w, h, paint) {
  const c = document.createElement('canvas'); c.width = w; c.height = h;
  paint(c.getContext('2d'), w, h);
  const t = new THREE.CanvasTexture(c);
  t.colorSpace = THREE.SRGBColorSpace;
  return t;
}
function glowTex() {
  return canvasTex(128, 128, (x, w) => {
    const g = x.createRadialGradient(w / 2, w / 2, 0, w / 2, w / 2, w / 2);
    g.addColorStop(0, 'rgba(255,255,255,1)'); g.addColorStop(0.25, 'rgba(255,255,255,0.55)'); g.addColorStop(0.6, 'rgba(255,255,255,0.1)'); g.addColorStop(1, 'rgba(255,255,255,0)');
    x.fillStyle = g; x.fillRect(0, 0, w, w);
  });
}

// ------------------------------------------------------------ the fire
// A sheet of flame: noise licked upward, shaped into tongues, coloured
// from blood red through orange to white at the core. `reveal` is how far
// up the sheet the fire has come (0 under the glass, 1 full height).
function flameMaterial(seed, tongues) {
  const m = new THREE.ShaderMaterial({
    uniforms: { time: { value: 0 }, seed: { value: seed }, reveal: { value: 0 }, gain: { value: 1 }, tongues: { value: tongues } },
    vertexShader: `
      #include <clipping_planes_pars_vertex>
      varying vec2 vUv;
      void main() {
        vUv = uv;
        vec4 mvPosition = modelViewMatrix * vec4(position, 1.0);
        gl_Position = projectionMatrix * mvPosition;
        #include <clipping_planes_vertex>
      }`,
    fragmentShader: `
      #include <clipping_planes_pars_fragment>
      uniform float time, seed, reveal, gain, tongues;
      varying vec2 vUv;
      float hash(vec2 p) { return fract(sin(dot(p, vec2(127.1, 311.7))) * 43758.5453); }
      float noise(vec2 p) { vec2 i = floor(p), f = fract(p); f = f * f * (3.0 - 2.0 * f);
        return mix(mix(hash(i), hash(i + vec2(1, 0)), f.x), mix(hash(i + vec2(0, 1)), hash(i + vec2(1, 1)), f.x), f.y); }
      float fbm(vec2 p) { float v = 0.0, a = 0.5; for (int k = 0; k < 5; k++) { v += a * noise(p); p = p * 2.03 + vec2(1.7, 9.2); a *= 0.5; } return v; }
      void main() {
        #include <clipping_planes_fragment>
        vec2 uv = vUv;
        float t = time * 0.85 + seed * 7.0;
        // the tongues: the sheet is tallest at each tongue's middle
        float tx = uv.x * tongues + seed;
        float tongue = 0.55 + 0.45 * sin(tx * 6.2831853);
        // (the noise stretched tall and licked upward; a second pass warps
        // it, so the tongues tear and lean as a draught takes them)
        vec2 q = vec2(uv.x * 2.6 + seed * 3.0, uv.y * 1.3 - t * 1.4);
        float n = fbm(q + 0.6 * fbm(q * 1.7 + vec2(0.0, -t * 0.8)) - 0.3);
        float h = uv.y / max(0.04, reveal);
        float d = n * 1.9 - pow(h, 1.25) * (1.35 + 0.6 * (1.0 - tongue)) + 0.08;
        float v = clamp(d * gain, 0.0, 1.0);
        vec3 col = mix(vec3(0.5, 0.02, 0.01), vec3(1.0, 0.3, 0.04), smoothstep(0.1, 0.42, v));
        col = mix(col, vec3(1.0, 0.72, 0.16), smoothstep(0.42, 0.72, v));
        col = mix(col, vec3(1.0, 0.96, 0.8), smoothstep(0.72, 0.95, v));
        float a = smoothstep(0.04, 0.2, v);
        a *= smoothstep(0.0, 0.06, uv.x) * smoothstep(1.0, 0.94, uv.x);
        a *= smoothstep(0.0, 0.03, uv.y);
        gl_FragColor = vec4(col * a, a);
        #include <colorspace_fragment>
      }`,
    transparent: true, depthWrite: false, side: THREE.DoubleSide, clipping: true
  });
  return m;
}

// ------------------------------------------------------------ the die
// Opposite faces sum to seven; one-two-three counter-clockwise round their
// corner. Box faces in order: +x, -x, +y, -y, +z, -z.
const FACE_PIPS = [3, 4, 1, 6, 2, 5];
const FACE_NORMAL = [[1, 0, 0], [-1, 0, 0], [0, 1, 0], [0, -1, 0], [0, 0, 1], [0, 0, -1]];
const PIP_AT = {
  1: [[0, 0]], 2: [[-1, 1], [1, -1]], 3: [[-1, 1], [0, 0], [1, -1]], 4: [[-1, 1], [1, 1], [-1, -1], [1, -1]],
  5: [[-1, 1], [1, 1], [0, 0], [-1, -1], [1, -1]], 6: [[-1, 1], [1, 1], [-1, 0], [1, 0], [-1, -1], [1, -1]]
};
// a box with its edges rounded: each vertex pushed out from the box inside
// it by the radius, along the way it already stands from it
function roundedBox(s, r, seg = 10) {
  const g = new THREE.BoxGeometry(s, s, s, seg, seg, seg);
  const p = g.attributes.position, n = g.attributes.normal, h = s / 2 - r;
  const v = new THREE.Vector3(), q = new THREE.Vector3();
  for (let i = 0; i < p.count; i++) {
    v.fromBufferAttribute(p, i);
    q.set(Math.min(h, Math.max(-h, v.x)), Math.min(h, Math.max(-h, v.y)), Math.min(h, Math.max(-h, v.z)));
    v.sub(q);
    if (v.lengthSq() < 1e-8) v.fromBufferAttribute(n, i);
    v.normalize();
    n.setXYZ(i, v.x, v.y, v.z);
    v.multiplyScalar(r).add(q);
    p.setXYZ(i, v.x, v.y, v.z);
  }
  p.needsUpdate = true; n.needsUpdate = true;
  return g;
}
function boneFace(pips, rnd) {
  const S = 256;
  const paint = (x, w, lit) => {
    if (lit) { x.fillStyle = '#000'; x.fillRect(0, 0, w, w); }
    else {
      // the bone: cream, amber at the corners where it has been handled
      const g = x.createRadialGradient(w * 0.42, w * 0.4, w * 0.1, w / 2, w / 2, w * 0.75);
      g.addColorStop(0, '#f4ecd8'); g.addColorStop(0.6, '#e6d9bf'); g.addColorStop(1, '#c9ac7c');
      x.fillStyle = g; x.fillRect(0, 0, w, w);
      // the grain: fine lines along one way, a few darker veins
      x.strokeStyle = 'rgba(120, 90, 50, 0.12)'; x.lineWidth = 1;
      for (let k = 0; k < 46; k++) { const y = rnd() * w; x.beginPath(); x.moveTo(0, y); x.bezierCurveTo(w * 0.3, y + rnd() * 8 - 4, w * 0.7, y + rnd() * 8 - 4, w, y + rnd() * 6 - 3); x.stroke(); }
      x.strokeStyle = 'rgba(100, 70, 40, 0.22)'; x.lineWidth = 1.5;
      for (let k = 0; k < 5; k++) { const y = rnd() * w; x.beginPath(); x.moveTo(0, y); x.bezierCurveTo(w * 0.3, y + rnd() * 20 - 10, w * 0.7, y + rnd() * 20 - 10, w, y + rnd() * 12 - 6); x.stroke(); }
      // the pores
      for (let k = 0; k < 400; k++) { x.fillStyle = `rgba(90, 60, 30, ${(0.05 + rnd() * 0.12).toFixed(3)})`; x.fillRect(rnd() * w, rnd() * w, 1 + rnd() * 1.5, 1 + rnd() * 1.5); }
    }
    // the pips: drilled, the drill's rings in the wall, inked arterial red
    PIP_AT[pips].forEach(([px, py]) => {
      const cx = w / 2 + px * w * 0.26, cy = w / 2 - py * w * 0.26, r = w * 0.085;
      if (lit) {
        const g = x.createRadialGradient(cx, cy, 0, cx, cy, r);
        g.addColorStop(0, '#fff'); g.addColorStop(0.55, '#fff'); g.addColorStop(1, 'rgba(255,255,255,0)');
        x.fillStyle = g; x.beginPath(); x.arc(cx, cy, r, 0, Math.PI * 2); x.fill();
        return;
      }
      x.fillStyle = 'rgba(60, 30, 20, 0.5)'; x.beginPath(); x.arc(cx + 1.5, cy + 2, r + 1.5, 0, Math.PI * 2); x.fill();
      const g = x.createRadialGradient(cx - r * 0.3, cy - r * 0.3, r * 0.1, cx, cy, r);
      g.addColorStop(0, '#d9304a'); g.addColorStop(0.55, '#a8172a'); g.addColorStop(0.85, '#5a0a14'); g.addColorStop(1, '#3a0a10');
      x.fillStyle = g; x.beginPath(); x.arc(cx, cy, r, 0, Math.PI * 2); x.fill();
      x.strokeStyle = 'rgba(0,0,0,0.35)'; x.lineWidth = 0.8;
      for (let k = 1; k < 4; k++) { x.beginPath(); x.arc(cx, cy, r * (0.35 + k * 0.17), 0, Math.PI * 2); x.stroke(); }
    });
  };
  return { map: canvasTex(S, S, (x, w) => paint(x, w, false)), lit: canvasTex(S, S, (x, w) => paint(x, w, true)) };
}
function buildDie(size) {
  const rnd = seeded(7);
  const mats = [], lits = [];
  for (let f = 0; f < 6; f++) {
    const t = boneFace(FACE_PIPS[f], rnd);
    const m = new THREE.MeshPhysicalMaterial({ map: t.map, emissiveMap: t.lit, emissive: new THREE.Color(0xffb21a), emissiveIntensity: 0, roughness: 0.42, clearcoat: 0.35, clearcoatRoughness: 0.3, sheen: 0.25, sheenColor: new THREE.Color(0xfff4dc) });
    mats.push(m); lits.push(m);
  }
  const mesh = new THREE.Mesh(roundedBox(size, size * 0.13), mats);
  mesh.castShadow = true;
  return { mesh, mats };
}
// the rest attitude: face N toward the lens, high and a little left, the
// die turned a touch so two more faces show
function restQuat(pips) {
  const f = FACE_PIPS.indexOf(Math.max(1, Math.min(6, pips | 0)));
  const n = new THREE.Vector3(...FACE_NORMAL[f]);
  const toward = new THREE.Vector3(-0.3, 0.42, 0.86).normalize();
  const q = new THREE.Quaternion().setFromUnitVectors(n, toward);
  const roll = new THREE.Quaternion().setFromAxisAngle(toward, -22 * DEG);
  return roll.multiply(q);
}

// ------------------------------------------------------------ the ring
// the branding iron: forge-black iron with its hammer scale, the run heated
// along it from blood red to white-hot at the head
function buildRing(R, run) {
  const g = new THREE.Group();
  const iron = new THREE.MeshPhysicalMaterial({ color: 0x1c1816, metalness: 0.75, roughness: 0.55, clearcoat: 0.15, clearcoatRoughness: 0.5 });
  const bare = new THREE.Mesh(new THREE.TorusGeometry(R, 3.2, 14, 96), iron);
  bare.castShadow = true;
  const arc = Math.max(0.02, Math.min(1, run || 0)) * Math.PI * 2;
  // the heat: vertex colours along the arc, red at the tail to white at
  // the head
  const hg = new THREE.TorusGeometry(R, 3.4, 12, 96, arc);
  const col = new Float32Array(hg.attributes.position.count * 3), pos = hg.attributes.position;
  const c = new THREE.Color();
  for (let i = 0; i < pos.count; i++) {
    const a = Math.atan2(pos.getY(i), pos.getX(i)), u = ((a < 0 ? a + Math.PI * 2 : a) / arc);
    c.copy(ARTERIAL).lerp(EMBER, smooth(u / 0.6)).lerp(new THREE.Color(1, 0.97, 0.88), smooth((u - 0.7) / 0.3));
    col[i * 3] = c.r; col[i * 3 + 1] = c.g; col[i * 3 + 2] = c.b;
  }
  hg.setAttribute('color', new THREE.BufferAttribute(col, 3));
  const heat = new THREE.Mesh(hg, new THREE.MeshBasicMaterial({ vertexColors: true, toneMapped: false, transparent: true, opacity: 0.95 }));
  heat.rotation.z = Math.PI / 2; heat.scale.x = -1;
  const bloom = new THREE.Mesh(new THREE.PlaneGeometry(R * 3.4, R * 3.4), new THREE.MeshBasicMaterial({ map: glowTex(), color: EMBER, transparent: true, opacity: 0.4, blending: THREE.AdditiveBlending, depthWrite: false, toneMapped: false }));
  bloom.position.z = -2;
  g.add(bloom, bare, heat);
  return { group: g, heat, bloom };
}

// ------------------------------------------------------------ the breakout
export function createBreakout() {
  let renderer = null, back = null, back2d = null, front = null, front2d = null, scene = null, camera = null;
  let key = null, fireLight = null, catcher = null, glass = null, raf = 0;
  let state = 'idle', t0 = 0, foldT0 = 0, W = 0, H = 0, D = 1100, dpr = 1, lastFrame = 0;
  let ringEl = null, ringAnim = null, afterFold = null;
  let sheets = [], embers = null, emberData = null, die = null, dieQ = null, ring = null, from = null, to = null, glowPlane = null;
  let restP = null, startP = null, pipsN = 3;
  const rnd = seeded(23);

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
    const layer = cls => { const c = document.createElement('canvas'); c.className = 'wt-fire ' + cls; c.setAttribute('aria-hidden', 'true'); return c; };
    back = layer('wt-fire-back'); back2d = back.getContext('2d');
    front = layer('wt-fire-front'); front2d = front.getContext('2d');
    scene = new THREE.Scene();
    camera = new THREE.PerspectiveCamera(40, 1, 10, 12000);
    // every light the scene will use, from the start (a light added later
    // recompiles every material): the key, the fire's glow from below
    key = new THREE.DirectionalLight(0xfff0e0, 1.2);
    key.castShadow = true;
    key.shadow.mapSize.set(1024, 1024);
    key.shadow.bias = -0.0008; key.shadow.normalBias = 0.6; key.shadow.radius = 5;
    scene.add(key, key.target);
    fireLight = new THREE.PointLight(0xff6a13, 0, 0, 0);
    scene.add(fireLight, new THREE.HemisphereLight(0x4a1a10, 0x05030a, 0.4));
    catcher = new THREE.Mesh(new THREE.PlaneGeometry(1, 1), new THREE.ShadowMaterial({ opacity: 0.32 }));
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

  function build(run, pips) {
    pipsN = Math.max(1, Math.min(6, pips | 0 || 1));
    // the fire: sheets at several depths, the far ones taller and wider
    // (sized to what they look from here), the near ones over the bezel
    sheets = [];
    [[-560, 0.7, 4, 1.0], [-320, 0.64, 5, 1.0], [-140, 0.56, 6, 0.95], [110, 0.4, 5, 0.9], [240, 0.3, 4, 0.85]].forEach(([z, hk, tongues, gain], i) => {
      const k = (D - z) / D;
      const w = W * 1.25 * k, h = H * hk * k;
      const m = flameMaterial(i * 1.37 + 0.2, tongues);
      m.uniforms.gain.value = gain;
      const s = new THREE.Mesh(new THREE.PlaneGeometry(w, h), m);
      s.position.set((rnd() - 0.5) * W * 0.1 * k, (-H / 2 - 10) * k + h / 2, z);
      s.renderOrder = z < 0 ? 1 : 4;
      s.userData.z = z;
      scene.add(s); sheets.push(s);
    });
    // the fire's glow on the page: a warm wash behind the glass at the foot
    glowPlane = new THREE.Mesh(new THREE.PlaneGeometry(W * 2.2, H * 1.1), new THREE.MeshBasicMaterial({ map: glowTex(), color: EMBER, transparent: true, opacity: 0, blending: THREE.AdditiveBlending, depthWrite: false, toneMapped: false }));
    glowPlane.position.set(0, -H * 0.45, -600); glowPlane.renderOrder = 0;
    scene.add(glowPlane);
    // the embers: each with its own lift, drift, size and life
    const N = 180;
    const pos = new Float32Array(N * 3), sz = new Float32Array(N), col = new Float32Array(N * 3);
    emberData = [];
    for (let i = 0; i < N; i++) {
      emberData.push({ x: (rnd() - 0.5) * W * 1.1, y0: -H / 2 - 40 - rnd() * 80, z: lerp(-520, 260, rnd()), lift: 90 + rnd() * 160, drift: (rnd() - 0.5) * 60, phase: rnd() * 6.28, life: 2.2 + rnd() * 2.6, start: rnd() * 1.8, s: 2 + rnd() * 3.5 });
      sz[i] = emberData[i].s;
    }
    const geo = new THREE.BufferGeometry();
    geo.setAttribute('position', new THREE.BufferAttribute(pos, 3));
    geo.setAttribute('size', new THREE.BufferAttribute(sz, 1));
    geo.setAttribute('color', new THREE.BufferAttribute(col, 3));
    const em = new THREE.PointsMaterial({ size: 4, map: glowTex(), vertexColors: true, transparent: true, depthWrite: false, blending: THREE.AdditiveBlending, sizeAttenuation: true, toneMapped: false });
    embers = new THREE.Points(geo, em);
    embers.renderOrder = 6; embers.frustumCulled = false;
    scene.add(embers);
    // the die: a hand's width across on a phone, more on a wide screen
    const size = Math.min(W, H) * 0.26;
    die = buildDie(size);
    dieQ = restQuat(pipsN);
    // from deep in the fire, below the glass's foot, to its rest in front
    // of the glass, high and to the left, over the deck
    startP = new THREE.Vector3(-W * 0.1, -H * 0.6, -380);
    restP = new THREE.Vector3(-W * 0.22, H * 0.08, 190);
    die.mesh.position.copy(startP);
    scene.add(die.mesh);
    // the ring, off the plate, the run on it
    ring = buildRing(Math.round(112 * 46 / 120), run);
    ring.group.traverse(o => { if (o.isMesh) o.renderOrder = 5; });
    scene.add(ring.group);
    // (every material cut at the glass)
    scene.traverse(o => {
      if (!o.material || o === catcher) return;
      [].concat(o.material).forEach(m => { m.clippingPlanes = [glass]; m.clipShadows = true; m.needsUpdate = true; });
    });
  }
  function dispose() {
    [...sheets, glowPlane, embers, die && die.mesh, ring && ring.group].forEach(o => {
      if (!o) return;
      scene.remove(o);
      o.traverse(x => { if (x.geometry) x.geometry.dispose(); if (x.material) [].concat(x.material).forEach(m => { if (m.map) m.map.dispose(); if (m.emissiveMap) m.emissiveMap.dispose(); m.dispose(); }); });
    });
    sheets = []; glowPlane = embers = die = ring = null;
  }

  function draw() {
    catcher.visible = true;
    glass.normal.set(0, 0, 1);
    renderer.shadowMap.needsUpdate = true;
    renderer.render(scene, camera);
    front2d.clearRect(0, 0, front.width, front.height);
    front2d.drawImage(renderer.domElement, 0, 0);
    catcher.visible = false;
    glass.normal.set(0, 0, -1);
    renderer.render(scene, camera);
    back2d.clearRect(0, 0, back.width, back.height);
    back2d.drawImage(renderer.domElement, 0, 0);
  }

  // The timeline, in ms from the start (the hold after it is still):
  //   0-1700     the fire comes up from under the glass: a breath, past its
  //              height, and settles to a burn (the near sheets a beat later)
  //   250-       the embers lift, each on its own time
  //   600-2300   the die tumbles up out of the fire, through the glass, to
  //              its rest; a last rock to 2900; its pips light from 2000
  //   300-1900   the ring lifts to the side
  const T = { fire: [0, 1700], near: [350, 1900], die: [600, 2300], rock: [2300, 2900], pips: [2000, 2500], ring: [300, 1900], end: 3200 };
  function fireAt(ms) {
    const far = windup(clamp01((ms - T.fire[0]) / (T.fire[1] - T.fire[0])), 0.1, 0.03);
    const near = windup(clamp01((ms - T.near[0]) / (T.near[1] - T.near[0])), 0.1, 0.03);
    sheets.forEach(s => { s.material.uniforms.time.value = ms / 1000; s.material.uniforms.reveal.value = Math.max(0, s.userData.z < 0 ? far : near) * 1.0; });
    glowPlane.material.opacity = 0.55 * smooth(far);
    fireLight.position.set(0, -H * 0.35, 120);
    fireLight.intensity = (2.2 + 0.5 * Math.sin(ms / 90) + 0.3 * Math.sin(ms / 37)) * smooth(far);
  }
  function embersAt(ms) {
    const pos = embers.geometry.attributes.position, col = embers.geometry.attributes.color;
    const t = ms / 1000;
    emberData.forEach((e, i) => {
      const u = ((t - 0.25 - e.start) % e.life + e.life) % e.life / e.life;
      const on = t > 0.25 + e.start;
      const y = e.y0 + u * e.lift * 4.2 + Math.sin(u * 9 + e.phase) * 12;
      const x = e.x + u * e.drift * 2 + Math.sin(u * 5 + e.phase) * 14;
      pos.setXYZ(i, x, on ? y : -H, e.z);
      // white-hot, cooling to red, then out
      const heat = on ? (1 - u) * (u < 0.1 ? u / 0.1 : 1) : 0;
      col.setXYZ(i, heat, heat * (0.45 + 0.5 * (1 - u)), heat * 0.15 * (1 - u));
    });
    pos.needsUpdate = true; col.needsUpdate = true;
  }
  const tmpQ = new THREE.Quaternion(), tumbleAxis = new THREE.Vector3(0.7, 0.25, 0.65).normalize();
  function dieAt(ms) {
    const du = clamp01((ms - T.die[0]) / (T.die[1] - T.die[0]));
    const e = windup(du, 0.1, 0.02);
    // the arc: up and toward you, over the top of a parabola
    die.mesh.position.lerpVectors(startP, restP, e);
    die.mesh.position.y += Math.sin(Math.PI * clamp01(e)) * H * 0.22;
    // two turns and a bit, slowing into the rest attitude; then the rock
    const turns = (1 - smoother(du)) * 2.3 * Math.PI * 2;
    tmpQ.setFromAxisAngle(tumbleAxis, turns);
    die.mesh.quaternion.copy(dieQ).premultiply(tmpQ);
    const ru = clamp01((ms - T.rock[0]) / (T.rock[1] - T.rock[0]));
    if (ru > 0 && ru < 1) {
      tmpQ.setFromAxisAngle(new THREE.Vector3(1, 0, 0), Math.sin(ru * Math.PI * 3) * 0.05 * (1 - ru));
      die.mesh.quaternion.premultiply(tmpQ);
    }
    const lit = smooth((ms - T.pips[0]) / (T.pips[1] - T.pips[0]));
    die.mats.forEach((m, f) => { m.emissiveIntensity = FACE_PIPS[f] === pipsN ? lit * 2.4 : 0; });
    die.mesh.visible = ms >= T.die[0] - 50;
  }
  function ringAt(ms) {
    const ru = windup(clamp01((ms - T.ring[0]) / (T.ring[1] - T.ring[0])), 0.14, 0.03);
    ring.group.position.set(lerp(from.x, to.x, ru), lerp(from.y, to.y, ru), lerp(0, to.z, ru));
    ring.group.rotation.set(lerp(0, 20, ru) * DEG, lerp(0, 30, ru) * DEG, lerp(0, -8, ru) * DEG);
  }
  function poseAt(ms) {
    fireAt(ms); embersAt(ms); dieAt(ms); ringAt(ms);
    return ms >= T.end;
  }
  function fold(ms) {
    // back into the fire, quicker: the die drops, the ring home, the fire
    // sinks under the glass, the embers go out
    const u = clamp01(ms / 1000);
    const du = smoother(u / 0.6);
    die.mesh.position.lerpVectors(restP, startP, du);
    die.mesh.position.y += Math.sin(Math.PI * du) * H * 0.1;
    tmpQ.setFromAxisAngle(tumbleAxis, du * Math.PI * 1.2);
    die.mesh.quaternion.copy(dieQ).premultiply(tmpQ);
    die.mats.forEach((m, f) => { m.emissiveIntensity = FACE_PIPS[f] === pipsN ? 2.4 * (1 - du) : 0; });
    const ru = smoother(u / 0.55);
    ring.group.position.set(lerp(to.x, from.x, ru), lerp(to.y, from.y, ru), lerp(to.z, 0, ru));
    ring.group.rotation.set(lerp(20, 0, ru) * DEG, lerp(30, 0, ru) * DEG, lerp(-8, 0, ru) * DEG);
    const fu = smoother((u - 0.2) / 0.8);
    sheets.forEach(s => { s.material.uniforms.time.value = (T.end + ms) / 1000; s.material.uniforms.reveal.value = 1 - fu; });
    glowPlane.material.opacity = 0.55 * (1 - fu);
    fireLight.intensity = 2.2 * (1 - fu);
    embersAt(T.end + ms);
    embers.material.opacity = 1 - fu;
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
    build(o.run, o.pips);
    const a = toWorld(rr.left + rr.width / 2, rr.top + rr.height / 2);
    from = { x: a.x, y: a.y };
    // (the side: right of centre, under the header, in front of the glass)
    const b = toWorld(W - 70, H * 0.42), k = (D - 140) / D;
    to = { x: b.x * k, y: b.y * k, z: 140 };
    document.body.appendChild(back);
    document.body.appendChild(front);
    // the plate dips as the ring comes off it, then gives it up
    ringAnim = ringEl.animate([
      { transform: 'scale(1)', easing: 'cubic-bezier(.45,0,.55,1)' }, { transform: 'scale(0.95)', offset: 0.34, easing: 'cubic-bezier(.2,.9,.3,1)' },
      { transform: 'scale(1.03)', offset: 0.58, easing: 'ease-in-out' }, { transform: 'scale(0.995)', offset: 0.8 }, { transform: 'scale(1)' }
    ], { duration: 760 });
    ringEl.classList.add('wt-out');
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
    scene.traverse(obj => { if (obj.material) [].concat(obj.material).forEach(m => { if (m.map) renderer.initTexture(m.map); if (m.emissiveMap) renderer.initTexture(m.emissiveMap); }); });
    (renderer.compileAsync ? renderer.compileAsync(scene, camera) : Promise.resolve(renderer.compile(scene, camera))).then(go, go);
    return true;
  }
  function foldAway(then) {
    if (state === 'idle') { if (then) then(); return; }
    // (a play asked for mid-fold waits for the fold to finish)
    if (state === 'folding') { if (then) afterFold = then; return; }
    if (state === 'starting') { afterFold = then || null; teardown(); return; }
    state = 'folding';
    foldT0 = performance.now();
    afterFold = then || null;
    if (!raf) raf = requestAnimationFrame(loop);
  }
  function teardown() {
    cancelAnimationFrame(raf); raf = 0;
    state = 'idle';
    if (ringEl) ringEl.classList.remove('wt-out');
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
    if (!die) return null;
    cancelAnimationFrame(raf); raf = 0;
    state = 'resting';
    const t = performance.now();
    if (folding) fold(ms); else poseAt(ms);
    draw();
    return performance.now() - t;
  };
  const probe = () => {
    if (!die) return null;
    const pr = v => { const w = v.clone().project(camera); return [Math.round((w.x + 1) / 2 * W), Math.round((1 - w.y) / 2 * H), Math.round(v.z)]; };
    return { W, H, D: Math.round(D), die: pr(die.mesh.position), ring: pr(ring.group.position), pips: pipsN, programs: renderer.info.programs.length };
  };
  return { play, clear, busy: () => state !== 'idle', fold: foldAway, seek, probe };
}
