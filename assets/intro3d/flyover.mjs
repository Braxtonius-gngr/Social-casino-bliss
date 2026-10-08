// The Flyover: a cold open. The maker throws the dice down the table at
// the lens, which sits on the felt in front of the back wall; the dice sail
// over it, it tips up after them, and a gold gleam crosses the frame. Out
// of it, open sky: a gold-liveried jet comes over low and loud, raining
// money; the lens follows the bills down onto the sea below, which turns
// to gold where they land, and dives into it - and the title comes up out
// of the gold.
//
// The table and its room are the intro's; everything after the gleam is
// built here. The figure is a scan of the maker, a textured mesh in
// rare/likeness.glb (fetched the first time this plays).

const TAU = Math.PI * 2, DEG = Math.PI / 180;
const clamp01 = x => Math.min(Math.max(x, 0), 1);
const smoother = x => { x = clamp01(x); return x * x * x * (x * (6 * x - 15) + 10); };
const lerp = (a, b, k) => a + (b - a) * k;
const mkRng = s => { for (let k = 0; k < 3; k++) { s = Math.imul(s ^ (s >>> 15), 0x2c1b3c6d) >>> 0; s = Math.imul(s ^ (s >>> 12), 0x297a2d39) >>> 0; } return () => { s = (Math.imul(s, 1664525) + 1013904223) >>> 0; s ^= s >>> 16; return (s >>> 0) / 4294967296; }; };

export const TIER_NAMES = { standard: 'The Flyover', hardways: 'The Flyover', vault: 'The Flyover', edge: 'The Flyover' };

// The timetable, world seconds. (The slow motion is centred where the dice
// cross over the lens.)
const T = {
  shake: 0.15, release: 0.95,     // his throw
  over: 1.55,                     // the dice over the lens: the slow
  swap: 1.95,                     // the gleam's peak: the room gives way to the sky
  jet: 3.9,                       // the jet straight overhead
  rain: [3.0, 5.4],               // the bills let go from its tail
  down: 4.9,                      // the lens tips down after them
  gold: [5.7, 7.2],               // the sea turns to gold from where they land
  dive: [7.0, 8.55],              // the dive, through the surface at its end
  call: 8.7, reveal: 10.0, end: 11.0
};
// The sky's world: the sea's surface, the jet's height and its line.
const SEA = -300, JET_Y = 1250, JET_X = 160, JET_Z0 = 2700, JET_Z1 = -2700, JET_W0 = 1.8, JET_W1 = 6.0;
const jetZ = w => lerp(JET_Z0, JET_Z1, (w - JET_W0) / (JET_W1 - JET_W0));
// The dice's arc, from his hand over the lens to the wall.
const HAND = [-9, 26, 78], OVER = [1, 10, -50], WALLHIT = [2, 6, -68];

// A minimal glTF-binary reader: one mesh, positions, uvs, indices and its
// base-colour image - all rare/likeness.glb holds.
async function readGlb(THREE, url, signal) {
  const buf = await (await fetch(url, { signal })).arrayBuffer(), dv = new DataView(buf);
  const jl = dv.getUint32(12, true), J = JSON.parse(new TextDecoder().decode(new Uint8Array(buf, 20, jl))), bin = 20 + jl + 8;
  const view = i => { const bv = J.bufferViews[i]; return [bin + (bv.byteOffset || 0), bv.byteLength]; };
  const acc = i => {
    const a = J.accessors[i], [o] = view(a.bufferView), n = { SCALAR: 1, VEC2: 2, VEC3: 3 }[a.type];
    const Ty = { 5126: Float32Array, 5125: Uint32Array, 5123: Uint16Array }[a.componentType], s = o + (a.byteOffset || 0);
    return new Ty(buf.slice(s, s + a.count * n * Ty.BYTES_PER_ELEMENT));
  };
  const p = J.meshes[0].primitives[0], g = new THREE.BufferGeometry();
  g.setAttribute('position', new THREE.BufferAttribute(acc(p.attributes.POSITION), 3));
  g.setAttribute('uv', new THREE.BufferAttribute(acc(p.attributes.TEXCOORD_0), 2));
  g.setIndex(new THREE.BufferAttribute(acc(p.indices), 1));
  g.computeVertexNormals();
  const [o, l] = view(J.images[0].bufferView);
  const bmp = await createImageBitmap(new Blob([buf.slice(o, o + l)], { type: J.images[0].mimeType }));
  const map = new THREE.Texture(bmp); map.flipY = false; map.colorSpace = THREE.SRGBColorSpace; map.anisotropy = 4; map.needsUpdate = true;
  return { g, map };
}

export async function makeGame(ctx) {
  const { THREE, scene, lights, tier, seed, aspect, room, asset, signal, helpers: H } = ctx;
  const { makeWarp, spline } = H;
  const V = (x = 0, y = 0, z = 0) => new THREE.Vector3(x, y, z);
  const rng = mkRng((seed ^ 0xf17e0) >>> 0);
  const made = { geos: [], mats: [], texs: [] };
  const keep = (g, m, t) => { if (g) made.geos.push(g); if (m) made.mats.push(m); if (t) made.texs.push(t); };
  const canvas = (w, h, paint) => { const c = document.createElement('canvas'); c.width = w; c.height = h; paint(c.getContext('2d'), w, h); return c; };
  const texOf = (c, srgb = true) => { const t = new THREE.CanvasTexture(c); t.colorSpace = srgb ? THREE.SRGBColorSpace : THREE.NoColorSpace; t.anisotropy = 8; keep(null, null, t); return t; };
  // (what the intro built - its room, its table, its lights - so the sky can put it away)
  const theirs = scene.children.slice();
  const fog0 = scene.fog, bg0 = scene.background;

  // ---- The plan.
  const warp = makeWarp(T.over);
  const Rw = w => warp.real(w);
  const plan = { tier, seed, warp, wallW: T.over, values: [], call: ['Daily Roll Over', 'Roll in. Cash out.'], throwOk: true, why: [] };
  plan.restW = T.dive[1]; plan.callW = T.call; plan.revealW = T.reveal; plan.endW = T.end;
  plan.revealReal = Rw(T.reveal); plan.totalReal = Rw(T.end); plan.restReal = Rw(T.dive[1]); plan.wallReal = Rw(T.over);

  // ================================================================ the room
  // ---- The thrower: the maker's scan, leaning over the near rail with the
  // dice in his reaching hand, facing down the table.
  const thrower = new THREE.Group(); scene.add(thrower);
  try {
    const { g, map } = await readGlb(THREE, asset('rare/likeness.glb'), signal);
    const m = new THREE.MeshStandardMaterial({ map, roughness: 0.78, metalness: 0 }); keep(g, m, map);
    const mesh = new THREE.Mesh(g, m); mesh.castShadow = true; mesh.receiveShadow = true;
    // (the scan is a unit bust facing +z; he stands at the table's near end facing -z)
    mesh.scale.setScalar(44); thrower.add(mesh);
    thrower.position.set(6, 22, 116); thrower.rotation.y = Math.PI;
  } catch (e) { if (signal && signal.aborted) throw e; }
  // (a warm key on him from over the table, and the lamp's rim)
  const key = new THREE.SpotLight(0xffe2c0, 9000, 400, 0.5, 0.6, 1.4); key.position.set(-40, 120, 20); key.target = thrower; scene.add(key);

  // ---- The dice: casino red, translucent, white pips.
  const pipTex = (n) => texOf(canvas(128, 128, (c, W) => {
    c.fillStyle = '#c4161c'; c.fillRect(0, 0, W, W);
    const at = { 1: [[0.5, 0.5]], 2: [[0.28, 0.28], [0.72, 0.72]], 3: [[0.26, 0.26], [0.5, 0.5], [0.74, 0.74]], 4: [[0.28, 0.28], [0.72, 0.28], [0.28, 0.72], [0.72, 0.72]], 5: [[0.26, 0.26], [0.74, 0.26], [0.5, 0.5], [0.26, 0.74], [0.74, 0.74]], 6: [[0.28, 0.24], [0.72, 0.24], [0.28, 0.5], [0.72, 0.5], [0.28, 0.76], [0.72, 0.76]] }[n];
    c.fillStyle = '#f6f2ea'; at.forEach(([x, y]) => { c.beginPath(); c.arc(x * W, y * W, W * 0.085, 0, TAU); c.fill(); });
  }));
  const dieMats = [1, 6, 2, 5, 3, 4].map(n => { const m = new THREE.MeshPhysicalMaterial({ map: pipTex(n), roughness: 0.12, clearcoat: 1, clearcoatRoughness: 0.05, sheen: 0 }); keep(null, m); return m; });
  const dieG = new THREE.BoxGeometry(1.9, 1.9, 1.9); keep(dieG);
  const dice = [0, 1].map(() => { const d = new THREE.Mesh(dieG, dieMats); d.castShadow = true; scene.add(d); return d; });
  const spin = [[rng() * TAU, rng() * TAU, 9 + 4 * rng()], [rng() * TAU, rng() * TAU, 11 + 4 * rng()]];
  const dicePose = (i, w) => {
    const off = i ? [2.4, 0.6, 1.2] : [0, 0, 0];
    if (w < T.release) {
      // (shaken in his hand)
      const s = Math.sin(w * 38 + i) * 1.2 * smoother((w - T.shake) / 0.2);
      return { p: [HAND[0] + off[0] + s, HAND[1] + off[1] + 0.5 * s, HAND[2] + off[2]], r: [w * 3, w * 2, 0] };
    }
    // (released: a flat arc down the table, over the lens, into the wall)
    const u = (w - T.release) / (T.over + 0.35 - T.release);
    const a = u < 1 ? [lerp(HAND[0], WALLHIT[0], u), lerp(HAND[1], WALLHIT[1], u) + 22 * Math.sin(Math.PI * u) * (1 - 0.4 * u), lerp(HAND[2], WALLHIT[2], u)] : WALLHIT;
    const k = (w - T.release) * spin[i][2];
    return { p: [a[0] + off[0], a[1] + off[1], a[2] + off[2]], r: [spin[i][0] + k, spin[i][1] + k * 0.7, k * 0.4] };
  };

  // ================================================================ the sky
  const sky = new THREE.Group(); sky.visible = false; scene.add(sky);
  // ---- The dome: golden hour - deep blue overhead down through rose to a
  // hot gold at the horizon, the sun low ahead.
  const SUN = V(0.15, 0.12, -1).normalize();
  {
    const g = new THREE.SphereGeometry(2600, 48, 24), m = new THREE.ShaderMaterial({
      side: THREE.BackSide, depthWrite: false, fog: false,
      uniforms: { uSun: { value: SUN } },
      vertexShader: 'varying vec3 vD; void main(){ vD = normalize(position); gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0); }',
      fragmentShader: `varying vec3 vD; uniform vec3 uSun;
        void main(){
          float h = clamp(vD.y, -0.2, 1.0);
          vec3 top = vec3(0.10, 0.20, 0.52), mid = vec3(0.86, 0.42, 0.46), low = vec3(1.0, 0.72, 0.30);
          vec3 c = mix(low, mid, smoothstep(0.0, 0.22, h)); c = mix(c, top, smoothstep(0.18, 0.8, h));
          float s = max(dot(normalize(vD), uSun), 0.0);
          c += vec3(1.0, 0.78, 0.45) * (pow(s, 600.0) * 4.0 + pow(s, 12.0) * 0.35);
          gl_FragColor = vec4(c, 1.0);
        }`
    });
    keep(g, m); const d = new THREE.Mesh(g, m); d.renderOrder = -1; sky.add(d);
  }
  // (a few soft clouds, lit gold from below)
  {
    const tex = texOf(canvas(256, 128, (c, W, Hh) => {
      for (let k = 0; k < 26; k++) { const x = W * (0.15 + 0.7 * rng()), y = Hh * (0.45 + 0.25 * rng()), r = 18 + 30 * rng(); const g = c.createRadialGradient(x, y, 0, x, y, r); g.addColorStop(0, 'rgba(255,236,220,0.55)'); g.addColorStop(1, 'rgba(255,236,220,0)'); c.fillStyle = g; c.fillRect(0, 0, W, Hh); }
    }));
    const m = new THREE.SpriteMaterial({ map: tex, transparent: true, depthWrite: false, fog: false, color: 0xffd6c0 }); keep(null, m);
    for (let k = 0; k < 14; k++) { const s = new THREE.Sprite(m); const a = rng() * TAU; s.position.set(Math.cos(a) * (1300 + 800 * rng()), 1000 + 700 * rng(), Math.sin(a) * (1300 + 800 * rng())); s.scale.set(700 + 500 * rng(), 260 + 160 * rng(), 1); sky.add(s); }
  }
  // (the sky as the environment, for what it reflects: the gold sea, the lacquer)
  const skyEnv = texOf(canvas(512, 256, (c, W, Hh) => {
    const g = c.createLinearGradient(0, 0, 0, Hh);
    [[0, '#3050a0'], [0.3, '#8090d0'], [0.45, '#ffa080'], [0.5, '#ffd890'], [0.56, '#e0a050'], [1, '#805020']].forEach(([o, col]) => g.addColorStop(o, col));
    c.fillStyle = g; c.fillRect(0, 0, W, Hh);
    const sx = W * 0.52, sy = Hh * 0.46, r = c.createRadialGradient(sx, sy, 0, sx, sy, 60); r.addColorStop(0, 'rgba(255,250,230,1)'); r.addColorStop(1, 'rgba(255,200,120,0)');
    c.fillStyle = r; c.fillRect(0, 0, W, Hh);
  }));
  skyEnv.mapping = THREE.EquirectangularReflectionMapping;
  const env0 = scene.environment;
  const sun = new THREE.DirectionalLight(0xffd8a8, 3.2); sun.position.copy(SUN).multiplyScalar(-1000).setY(800); sky.add(sun, sun.target);
  const skyFill = new THREE.HemisphereLight(0x8fb0ff, 0xffb050, 1.1); sky.add(skyFill);
  // (the sea's glare up under the jet's belly, so its gold reads from below)
  const glare = new THREE.DirectionalLight(0xffc070, 2.4); glare.position.set(0, -1000, 300); sky.add(glare, glare.target);

  // ---- The jet: a long-range private jet in black lacquer, a gold cheat
  // line nose to tail and a gold tail with the house's monogram; T-tail,
  // two engines aft, winglets.
  const jet = new THREE.Group(); sky.add(jet);
  {
    const body = new THREE.MeshPhysicalMaterial({ color: 0x0c0c10, metalness: 0.4, roughness: 0.22, clearcoat: 1, clearcoatRoughness: 0.08 });
    const gold = new THREE.MeshPhysicalMaterial({ color: 0xe0a83a, metalness: 1, roughness: 0.25 });
    const glass = new THREE.MeshPhysicalMaterial({ color: 0x101820, metalness: 0.2, roughness: 0.05, clearcoat: 1 });
    keep(null, body); keep(null, gold); keep(null, glass);
    // (the fuselage: a lathe along its length, nose at -z)
    const prof = [[0, -130], [6, -127], [13, -118], [18, -104], [20, -85], [20, 40], [18, 70], [14, 95], [8, 118], [3, 130], [0, 132]].map(([r, z]) => new THREE.Vector2(r, z));
    const fg = new THREE.LatheGeometry(prof, 40); fg.rotateX(Math.PI / 2); keep(fg);
    jet.add(new THREE.Mesh(fg, body));
    // (the cheat line: a gold band along each side, under the windows)
    const band = new THREE.Mesh(new THREE.CylinderGeometry(20.3, 20.3, 170, 40, 1, true, Math.PI * 0.38, Math.PI * 0.24), gold); band.rotation.x = Math.PI / 2; band.position.z = -20; keep(band.geometry); jet.add(band);
    const band2 = band.clone(); band2.rotation.z = Math.PI; band2.rotation.y = 0; band2.scale.x = -1; jet.add(band2);
    // (the cockpit glass and the cabin windows)
    const ws = new THREE.Mesh(new THREE.SphereGeometry(14, 20, 10, 0, TAU, 0, 0.9), glass); ws.position.set(0, 6, -108); ws.rotation.x = -1.1; keep(ws.geometry); jet.add(ws);
    const winG = new THREE.CircleGeometry(2.6, 16); keep(winG);
    for (let k = 0; k < 9; k++) [-1, 1].forEach(s => { const w = new THREE.Mesh(winG, glass); w.position.set(s * 20.2, 5, -70 + k * 12); w.rotation.y = s * Math.PI / 2; jet.add(w); });
    // (the wings: swept, tapered, a winglet at each tip)
    const wingShape = new THREE.Shape(); wingShape.moveTo(0, -30); wingShape.lineTo(150, 30); wingShape.lineTo(150, 52); wingShape.lineTo(0, 40); wingShape.closePath();
    const wg = new THREE.ExtrudeGeometry(wingShape, { depth: 4, bevelEnabled: true, bevelSize: 1.5, bevelThickness: 1.5, bevelSegments: 2 }); wg.rotateX(Math.PI / 2); keep(wg);
    [-1, 1].forEach(s => {
      const w = new THREE.Mesh(wg, body); w.scale.x = s; w.position.set(0, -8, -5); w.rotation.z = s * 0.06; jet.add(w);
      const tip = new THREE.Mesh(new THREE.BoxGeometry(2, 26, 18), gold); tip.position.set(s * 150, 4, 38); tip.rotation.x = -0.3; keep(tip.geometry); jet.add(tip);
      // (the engines, aft on the fuselage)
      const eg = new THREE.CylinderGeometry(9, 8, 46, 24, 1, false); eg.rotateX(Math.PI / 2); keep(eg);
      const e = new THREE.Mesh(eg, body); e.position.set(s * 31, 9, 70); jet.add(e);
      const lip = new THREE.Mesh(new THREE.TorusGeometry(9, 1.4, 8, 24), gold); lip.position.set(s * 31, 9, 47); keep(lip.geometry); jet.add(lip);
      const py = new THREE.Mesh(new THREE.BoxGeometry(12, 3, 18), body); py.position.set(s * 21, 9, 70); keep(py.geometry); jet.add(py);
    });
    // (the T-tail: the fin in gold with the monogram, the tailplane across its top)
    const finShape = new THREE.Shape(); finShape.moveTo(0, 0); finShape.lineTo(45, 0); finShape.lineTo(70, 62); finShape.lineTo(46, 62); finShape.closePath();
    const fin = new THREE.ExtrudeGeometry(finShape, { depth: 3, bevelEnabled: true, bevelSize: 1, bevelThickness: 1, bevelSegments: 1 }); fin.rotateY(-Math.PI / 2); keep(fin);
    const fm = new THREE.Mesh(fin, gold); fm.position.set(1.5, 16, 60); jet.add(fm);
    const tp = new THREE.Mesh(new THREE.BoxGeometry(110, 3, 22), body); tp.position.set(0, 78, 128); keep(tp.geometry); jet.add(tp);
  }
  jet.scale.setScalar(1.1);
  // (its contrails: two pale ribbons drawn out behind the engines)
  const trail = (() => {
    const N = 60, pos = new Float32Array(N * 2 * 3 * 2), g = new THREE.BufferGeometry(), idx = [];
    for (let s = 0; s < 2; s++) for (let k = 0; k < N - 1; k++) { const a = s * N * 2 + k * 2; idx.push(a, a + 1, a + 2, a + 1, a + 3, a + 2); }
    g.setAttribute('position', new THREE.BufferAttribute(pos, 3)); g.setIndex(idx);
    const al = new Float32Array(N * 2 * 2); for (let s = 0; s < 2; s++) for (let k = 0; k < N; k++) al[s * N * 2 + k * 2] = al[s * N * 2 + k * 2 + 1] = 1 - k / (N - 1);
    g.setAttribute('alpha', new THREE.BufferAttribute(al, 1));
    const m = new THREE.ShaderMaterial({ transparent: true, depthWrite: false, side: THREE.DoubleSide, fog: false,
      vertexShader: 'attribute float alpha; varying float vA; void main(){ vA = alpha; gl_Position = projectionMatrix * modelViewMatrix * vec4(position,1.0); }',
      fragmentShader: 'varying float vA; void main(){ gl_FragColor = vec4(1.0, 0.95, 0.9, 0.55 * vA * vA); }' });
    keep(g, m); const mesh = new THREE.Mesh(g, m); mesh.frustumCulled = false; sky.add(mesh);
    return { N, pos, g };
  })();
  const jetAt = w => V(JET_X, JET_Y + 30 * Math.sin(w * 0.7), jetZ(w));
  const poseJet = w => {
    const p = jetAt(w); jet.position.copy(p); jet.rotation.set(0, 0, 0.08 * Math.sin(w * 0.9));
    for (let s = 0; s < 2; s++) for (let k = 0; k < trail.N; k++) {
      const z = p.z + 75 + k * 28, wide = 2 + k * 0.4, x = p.x + (s ? 34 : -34), y = p.y + 10 + k * 0.6, a = (s * trail.N * 2 + k * 2) * 3;
      trail.pos.set([x - wide, y, z, x + wide, y, z], a);
    }
    trail.g.attributes.position.needsUpdate = true;
  };

  // ---- The money: banknotes of the house - green, the monogram and a
  // hundred - let go from the jet's tail, fluttering down to the sea.
  const NB = 520;
  const billTex = texOf(canvas(256, 108, (c, W, Hh) => {
    c.fillStyle = '#c9dbb8'; c.fillRect(0, 0, W, Hh);
    c.strokeStyle = '#3d6a3a'; c.lineWidth = 6; c.strokeRect(5, 5, W - 10, Hh - 10);
    c.fillStyle = '#5a8a52'; c.beginPath(); c.ellipse(W / 2, Hh / 2, 30, 36, 0, 0, TAU); c.fill();
    c.fillStyle = '#e8f0d8'; c.font = 'bold 28px Georgia, serif'; c.textAlign = 'center'; c.textBaseline = 'middle'; c.fillText('DRO', W / 2, Hh / 2 + 2);
    c.fillStyle = '#2f5a2c'; c.font = 'bold 24px Georgia, serif'; c.fillText('100', 34, 26); c.fillText('100', W - 34, Hh - 24);
  }));
  const billM = new THREE.MeshStandardMaterial({ map: billTex, side: THREE.DoubleSide, roughness: 0.8 }); keep(null, billM);
  const billG = new THREE.PlaneGeometry(46, 19.5); keep(billG);
  const bills = new THREE.InstancedMesh(billG, billM, NB); bills.frustumCulled = false; sky.add(bills);
  const billPlan = Array.from({ length: NB }, () => {
    const ts = lerp(T.rain[0], T.rain[1], Math.pow(rng(), 0.8));
    return { ts, dx: (rng() - 0.5) * 120, dz: (rng() - 0.5) * 80, vx: (rng() - 0.5) * 70, vz: (rng() - 0.5) * 60 - 120, fall: 210 + 120 * rng(), ph: rng() * TAU, fr: 2 + 3 * rng(), ax: V(rng() - 0.5, rng() - 0.5, rng() - 0.5).normalize() };
  });
  const billAt = (b, w) => {
    const x = w - b.ts; if (x < 0) return null;
    const p0 = jetAt(b.ts);
    const y = p0.y - 12 - b.fall * (x - 0.6 * (1 - Math.exp(-x / 0.6)));
    if (y < SEA - 4) return null;
    return { p: V(p0.x + b.dx + b.vx * x + 25 * Math.sin(b.ph + x * b.fr), y, p0.z + 120 + b.dz + b.vz * x), a: b.ph + x * b.fr * 1.3, x };
  };
  const mtx = new THREE.Matrix4(), qq = new THREE.Quaternion(), one = V(1, 1, 1), hide = new THREE.Matrix4().makeScale(0, 0, 0);
  const poseBills = w => {
    for (let i = 0; i < NB; i++) {
      const s = billAt(billPlan[i], w);
      if (!s) { bills.setMatrixAt(i, hide); continue; }
      qq.setFromAxisAngle(billPlan[i].ax, s.a); mtx.compose(s.p, qq, one); bills.setMatrixAt(i, mtx);
    }
    bills.instanceMatrix.needsUpdate = true;
  };
  // (where they come down: the middle of the landing, for the gold to spread from)
  const LAND = (() => { let x = 0, z = 0, n = 0; billPlan.forEach(b => { const p0 = jetAt(b.ts); x += p0.x + b.dx; z += p0.z + 120 + b.dz + b.vz * 4; n++; }); return V(x / n, SEA, z / n); })();

  // ---- The sea: a slow swell, deep blue-green - and from where the money
  // lands, liquid gold spreading out over it.
  const seaU = { uT: { value: 0 }, uGold: { value: 0 }, uC: { value: new THREE.Vector2(LAND.x, LAND.z) } };
  const seaM = new THREE.MeshStandardMaterial({ color: 0xffffff, metalness: 0.5, roughness: 0.35 });
  seaM.onBeforeCompile = sh => {
    Object.assign(sh.uniforms, seaU);
    sh.vertexShader = sh.vertexShader
      .replace('#include <common>', '#include <common>\nuniform float uT; varying vec3 vW;\nfloat wv(vec2 p){ return 6.0*sin(p.x*0.011+uT*1.1)+4.0*sin(p.y*0.017-uT*1.4)+2.5*sin((p.x+p.y)*0.031+uT*2.0); }')
      .replace('#include <beginnormal_vertex>', '#include <beginnormal_vertex>\n{ vec2 q = position.xy; float e = 2.0; float h0 = wv(q); objectNormal = normalize(vec3(-(wv(q+vec2(e,0.0))-h0)/e, -(wv(q+vec2(0.0,e))-h0)/e, 1.0)); }')
      .replace('#include <begin_vertex>', '#include <begin_vertex>\ntransformed.z += wv(position.xy); vW = (modelMatrix * vec4(transformed,1.0)).xyz;');
    // (the gold: the colour, the metal and the polish, after the material's own are read)
    sh.fragmentShader = sh.fragmentShader
      .replace('#include <common>', '#include <common>\nuniform float uGold; uniform vec2 uC; varying vec3 vW;')
      .replace('#include <metalnessmap_fragment>', `#include <metalnessmap_fragment>
      {
        float g = 1.0 - smoothstep(uGold * 3200.0 - 260.0, uGold * 3200.0, length(vW.xz - uC));
        diffuseColor.rgb = mix(vec3(0.03, 0.16, 0.22), vec3(0.95, 0.58, 0.10), g);
        metalnessFactor = mix(0.2, 1.0, g);
        roughnessFactor = mix(0.3, 0.3, g);
      }`)
      .replace('#include <emissivemap_fragment>', `#include <emissivemap_fragment>
      {
        // (molten: the gold lit from within as well as by the sky, brightest on the swell's crests)
        float g = 1.0 - smoothstep(uGold * 3200.0 - 260.0, uGold * 3200.0, length(vW.xz - uC));
        totalEmissiveRadiance += vec3(0.85, 0.40, 0.04) * g * (0.22 + 0.18 * sin(vW.x * 0.02 + vW.z * 0.015));
      }`);
  };
  seaM.customProgramCacheKey = () => 'flyover-sea'; keep(null, seaM);
  const seaG = new THREE.PlaneGeometry(6000, 6000, 220, 220); keep(seaG);
  const sea = new THREE.Mesh(seaG, seaM); sea.rotation.x = -Math.PI / 2; sea.position.y = SEA; sky.add(sea);

  // ---- The gleam: a streak of gold light swept across the lens at the
  // hand-off - a card held in front of the eye, facing it.
  const flare = (() => {
    const tex = texOf(canvas(512, 128, (c, W, Hh) => {
      // (a soft anamorphic streak: hot in the middle, falling off to both ends and edges)
      c.save(); c.translate(W / 2, Hh / 2); c.scale(1, Hh / W);
      const g = c.createRadialGradient(0, 0, 0, 0, 0, W / 2); g.addColorStop(0, 'rgba(255,252,236,1)'); g.addColorStop(0.12, 'rgba(255,224,150,0.8)'); g.addColorStop(0.5, 'rgba(255,190,90,0.25)'); g.addColorStop(1, 'rgba(255,170,60,0)');
      c.fillStyle = g; c.beginPath(); c.arc(0, 0, W / 2, 0, TAU); c.fill(); c.restore();
    }));
    const glow = texOf(canvas(128, 128, (c, W) => { const g = c.createRadialGradient(W / 2, W / 2, 0, W / 2, W / 2, W / 2); g.addColorStop(0, 'rgba(255,255,255,1)'); g.addColorStop(1, 'rgba(255,255,255,0)'); c.fillStyle = g; c.fillRect(0, 0, W, W); }));
    const m = new THREE.MeshBasicMaterial({ map: tex, transparent: true, depthTest: false, depthWrite: false, blending: THREE.AdditiveBlending, fog: false, toneMapped: false }); keep(null, m);
    const wash = new THREE.MeshBasicMaterial({ map: glow, color: 0xffd890, transparent: true, depthTest: false, depthWrite: false, blending: THREE.AdditiveBlending, fog: false, toneMapped: false }); keep(null, wash);
    const g = new THREE.PlaneGeometry(1, 1); keep(g);
    const card = new THREE.Group(), streak = new THREE.Mesh(g, m), full = new THREE.Mesh(g, wash);
    streak.renderOrder = full.renderOrder = 999; card.add(full, streak); scene.add(card);
    return { card, streak, full, m, wash };
  })();
  const flashAt = w => Math.exp(-(((w - T.swap) / 0.16) ** 2));

  // ================================================================ the lens
  // keys [w, eye, aim]: on the felt, up after the dice, through the gleam to
  // the sky; after the jet; down onto the landing; the dive.
  const tall = aspect < 0.62;
  const lensAt = w => {
    const eye = V(), aim = V();
    if (w < T.swap) {
      // (on the felt in front of the wall, looking up the table at him; then
      // after the dice, tipping up as they come over)
      eye.set(2, 3.2, -57);
      const d = dicePose(0, Math.max(w, T.release - 0.05)).p;
      const face = V(4, 50, 110), follow = V(d[0], d[1] + 1, d[2]);
      const k = smoother((w - (T.release + 0.05)) / 0.35);
      aim.copy(face).lerp(follow, k);
      // (as they pass over, on up toward the ceiling - not straight up: the lens keeps its horizon)
      const up = smoother((w - (T.over - 0.05)) / (T.swap - T.over + 0.05));
      aim.lerp(V(2, 260, -90), up);
      eye.y += 0.6 * Math.sin(w * 1.3) * (1 - up);
      return { eye, aim };
    }
    // (the sky: the lens rises off the ground as it follows the jet over,
    // turning with it; then down onto the landing; then the dive)
    const rise = smoother((w - T.swap) / 3.2);
    eye.set(lerp(2, 120, rise), lerp(3.2, 520, rise), lerp(-57, -220, rise));
    const j = jetAt(Math.min(w, 5.2)).add(V(0, 20, -60));
    aim.copy(j);
    const dn = smoother((w - T.down) / 1.1);
    const landLook = LAND.clone().add(V(0, 40, 0));
    aim.lerp(landLook, dn);
    if (w > T.dive[0]) {
      const u = smoother((w - T.dive[0]) / (T.dive[1] - T.dive[0]));
      const through = LAND.clone().add(V(0, -60, 200));
      eye.lerp(through, u * u);
      aim.copy(landLook).lerp(LAND.clone().add(V(0, -400, -200)), u);
    }
    if (w > T.dive[1]) {
      // (under: drifting down through the gold)
      const x = w - T.dive[1];
      eye.y -= 30 * x; aim.y -= 30 * x;
    }
    return { eye, aim };
  };
  const camera = ({ eye, aim, dt, n }) => {
    for (let k = 0; k < n; k++) {
      const w = warp.world(k * dt), c = lensAt(w);
      eye.set([c.eye.x, c.eye.y, c.eye.z], k * 3); aim.set([c.aim.x, c.aim.y, c.aim.z], k * 3);
    }
  };
  const gleamAt = t => { const w = warp.world(t); return 0.3 + 0.7 * flashAt(w); };
  const shakeAt = (t, w) => {
    // (the jet's pass: a rumble through the lens as it goes over)
    const a = 0.9 * Math.exp(-(((w - T.jet) / 0.35) ** 2));
    return [a * Math.sin(t * 61), a * Math.sin(t * 53 + 1), a * Math.sin(t * 47 + 2)];
  };
  const callAt = w => { const c = lensAt(w), d = c.aim.clone().sub(c.eye).normalize(); return c.eye.clone().addScaledVector(d, 120).toArray(); };

  // ================================================================ each frame
  const underCol = new THREE.Color(0xc8861e), skyFog = new THREE.FogExp2(0xffc890, 0.00012), underFog = new THREE.FogExp2(0xb07418, 0.006);
  const stage = (t, { w }) => {
    const out = w >= T.swap;
    // (the room and the sky trade places at the gleam's peak)
    for (const o of theirs) o.visible = !out;
    thrower.visible = !out; key.visible = !out;
    dice.forEach((d, i) => { d.visible = !out; const p = dicePose(i, w); d.position.set(p.p[0], p.p[1], p.p[2]); d.rotation.set(p.r[0], p.r[1], p.r[2]); });
    // (his throw: a lean in and a snap forward at the release)
    const th = smoother((w - (T.release - 0.35)) / 0.3) * (1 - smoother((w - (T.release + 0.1)) / 0.6));
    thrower.position.set(6, 22 - 2 * th, 116 - 6 * th); thrower.rotation.x = -0.08 * th;
    sky.visible = out;
    const lens = lensAt(w), under = lens.eye.y < SEA + 2;
    scene.fog = out ? (under ? underFog : skyFog) : fog0;
    scene.background = out ? (under ? underCol : null) : bg0;
    scene.environment = out ? skyEnv : env0;
    if (out) {
      poseJet(w); poseBills(w);
      seaU.uT.value = w; seaU.uGold.value = smoother((w - T.gold[0]) / (T.gold[1] - T.gold[0]));
    }
    // (the gleam card, held in front of the lens across the hand-off)
    const f = flashAt(w);
    flare.card.visible = f > 0.01;
    if (flare.card.visible) {
      const d = lens.aim.clone().sub(lens.eye).normalize();
      flare.card.position.copy(lens.eye).addScaledVector(d, 4); flare.card.lookAt(lens.eye);
      flare.streak.scale.set(16, 4, 1); flare.streak.position.set(lerp(-8, 8, smoother((w - (T.swap - 0.25)) / 0.5)), 0, 0); flare.streak.rotation.z = 0.5;
      flare.m.opacity = f; flare.full.scale.set(14, 14, 1); flare.wash.opacity = 0.95 * Math.pow(f, 1.4);
    }
    return { burst: -1 };
  };

  // ---- Sounds, real seconds (the jet and the beat are the Sound's own voices).
  const sfx = [];
  sfx.push({ t: 0.0, kind: 'jet', dur: Rw(T.end) + 1, peak: Rw(T.jet) });
  for (let w = T.shake; w < T.release - 0.05; w += 0.11) sfx.push({ t: Rw(w), kind: 'rattle' });
  sfx.push({ t: Rw(T.release), kind: 'whoosh' });
  // The beat: a laid-back, swung hip-hop groove at 88 - warm keys and a
  // whisper of hats from the start, the kick and the 808 dropping in with
  // the sky, the snare on two and four, the whole of it rising under the
  // shot to its loudest on the title. (Real seconds: it keeps its time
  // through the slow motion.)
  {
    const BEAT = 60 / 88, S16 = BEAT / 4, SW = 0.58, bars = Math.ceil((Rw(T.end) + 2.5) / (BEAT * 4));
    const step = (bar, k) => bar * BEAT * 4 + Math.floor(k / 2) * 2 * S16 + (k % 2 ? 2 * S16 * SW : 0);
    const n = m => 440 * Math.pow(2, (m - 69) / 12);
    // (A minor: Am9, Fmaj7, Dm9, E7 - the roots, and each chord's voicing)
    const prog = [[45, [57, 60, 64, 67, 71]], [41, [53, 57, 60, 64]], [38, [53, 57, 60, 62, 65]], [40, [52, 56, 59, 62]]];
    const drop = Rw(T.swap), peak = Rw(T.call + 0.3);
    const lvl = t => 0.38 + 0.62 * smoother(t / peak);
    for (let bar = 0; bar < bars; bar++) {
      const [root, chord] = prog[bar % 4];
      for (let k = 0; k < 16; k++) {
        const t = step(bar, k), L = lvl(t), full = t >= drop - 0.02;
        if (k % 2 === 0) sfx.push({ t, kind: 'hat', lvl: L * (k % 4 ? 0.7 : 1), open: k === 14 });
        else if (full && (k === 7 || k === 15)) sfx.push({ t, kind: 'hat', lvl: L * 0.5 });
        if (full && (k === 0 || k === 7 || k === 10)) sfx.push({ t, kind: 'kick', lvl: L });
        if (full && (k === 4 || k === 12)) sfx.push({ t, kind: 'snare', lvl: L });
        if (full && (k === 0 || k === 10)) sfx.push({ t, kind: 'bass', f: n(root - 12), dur: k ? BEAT * 1.2 : BEAT * 2.2, lvl: L });
        if (k === 0) sfx.push({ t, kind: 'keys', f: chord.map(n), dur: BEAT * 2.6, lvl: L });
        if (k === 11) sfx.push({ t, kind: 'keys', f: chord.slice(1).map(n), dur: BEAT * 0.9, lvl: L * 0.7 });
      }
    }
  }

  const warmAt = [Rw(T.swap) + 0.05, Rw(T.jet), Rw(T.gold[1]), Rw(T.dive[1]) + 0.1];
  const dispose = () => {
    for (const o of theirs) o.visible = true;
    scene.fog = fog0; scene.background = bg0; scene.environment = env0;
    scene.remove(thrower, key, sky, flare.card, ...dice);
    made.geos.forEach(g => g.dispose()); made.mats.forEach(m => m.dispose()); made.texs.forEach(t => t.dispose());
  };
  return {
    plan, camera, gleamAt, shakeAt, stage, callAt, sfx, warmAt, dispose,
    tierNames: TIER_NAMES,
    moments: { toss: Rw(T.release), over: Rw(T.over), swap: Rw(T.swap), jet: Rw(T.jet), rain: Rw(T.rain[0] + 1), down: Rw(T.down), gold: Rw(T.gold[1]), dive: Rw(T.dive[0] + 0.8), under: Rw(T.dive[1] + 0.1), call: Rw(T.call + 0.4), reveal: plan.revealReal, end: plan.totalReal },
    pieces: { thrower, jet, sea, bills }
  };
}
