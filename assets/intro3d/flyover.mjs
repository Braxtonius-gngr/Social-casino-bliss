// The Flyover: a cold open. It starts on the photograph - the maker at a
// craps table, mid-throw - close on the face, pulling back to the throw; a whip, and the lens is low at
// the side of the table, running alongside the dice down the felt to the
// back wall. They strike it, and a gold gleam takes the frame. Out of it,
// open sky: a gold-liveried jet comes over low and loud - the lens snatches
// a crash zoom onto it, the house's badge on its belly - raining money; the
// lens follows the bills down onto the sea, which turns to gold where they
// land, and dives into it, and the title comes up out of the gold.
//
// The table and its room are the intro's; the photograph is rare/thrower.jpg
// (fetched the first time this plays); everything after the gleam is built
// here; the music is tracks.mjs's.

import { wildBeat, wildGroove } from './tracks.mjs';

const TAU = Math.PI * 2, DEG = Math.PI / 180;
const clamp01 = x => Math.min(Math.max(x, 0), 1);
const smoother = x => { x = clamp01(x); return x * x * x * (x * (6 * x - 15) + 10); };
const lerp = (a, b, k) => a + (b - a) * k;
const mkRng = s => { for (let k = 0; k < 3; k++) { s = Math.imul(s ^ (s >>> 15), 0x2c1b3c6d) >>> 0; s = Math.imul(s ^ (s >>> 12), 0x297a2d39) >>> 0; } return () => { s = (Math.imul(s, 1664525) + 1013904223) >>> 0; s ^= s >>> 16; return (s >>> 0) / 4294967296; }; };

export const TIER_NAMES = { standard: 'The Flyover', hardways: 'The Flyover', vault: 'The Flyover', edge: 'The Flyover' };

// The timetable, world seconds. (The slow motion is centred on the dice's
// strike on the wall.)
const T = {
  whip: 1.15,                     // the photograph pushed in, then whipped away
  dice: 1.0,                      // the dice in flight down the table
  over: 2.0,                      // their strike on the back wall: the slow
  swap: 2.4,                      // the gleam's peak: the room gives way to the sky
  zoom: [3.3, 3.42, 3.95, 4.25],  // the crash zoom on the jet: in, held, shaking, out
  jet: 4.35,                      // the jet straight overhead
  rain: [2.7],                    // the bills pour from its belly's open bay (until it shuts, below)
  down: 4.65,                     // the lens tips down with them, at their pace
  gold: [6.35, 7.75],             // the sea turns to gold from where they land
  dive: [7.65, 9.15],             // the dive, through the surface at its end
  call: 9.3, reveal: 10.55, end: 11.55
};
// The sky's world: the sea's surface, the jet's height and its line.
// (in the photograph, as fractions from its top left: the face, and where the lens pulls back to - the hand)
const PHOTO_FACE = [0.445, 0.36], PHOTO_HAND = [0.34, 0.56], PHOTO_DICE = [0.21, 0.77];
// (the throw out of it, world seconds: the dice leave the hand, and are past the lens)
const THROW = [0.8, 1.12];
const BAY_Z = -60, SEA = -300, JET_Y = 950, JET_X = 160, JET_Z0 = 2700, JET_Z1 = -2700, JET_W0 = 2.25, JET_W1 = 6.45;
const jetZ = w => lerp(JET_Z0, JET_Z1, (w - JET_W0) / (JET_W1 - JET_W0));
// The dice's way down the table: in the air from the thrower's end, a
// landing and a hop, a skid into the wall, and back off it.
const DICE_KEYS = [[1.0, [18, 24, 82], 0], [1.42, [6, 0.95, 15], 9], [1.72, [2, 0.95, -35], 5], [2.0, [0, 1.6, -67.6], 0.6], [2.4, [-4, 0.95, -54], 5]];

export async function makeGame(ctx) {
  const { THREE, scene, set, lights, tier, seed, aspect, room, asset, signal, helpers: H } = ctx;
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
  // (the room's ceiling pieces - its lamp panels over the table - are put
  // away for this shot: the lens looks straight up past them, and the gleam
  // is the only light it should find there)
  const overhead = [];
  scene.updateMatrixWorld(true);
  theirs.forEach(o => o.traverse(m => { if (m.isMesh && m.visible) { const b = new THREE.Box3().setFromObject(m); if (b.min.y > 110 && b.max.y < 1000) overhead.push(m); } }));

  // ---- The plan.
  const warp = makeWarp(T.over);
  const Rw = w => warp.real(w);
  // (the music's grid, real seconds: beat 0 on the sky's opening, the tempo
  // near 150; the drop and the crash zoom on one beat - in, held two beats
  // while the belly's bay slides shut, out - and the title two bars, or a
  // whole number of them, after it)
  const Rs = Rw(T.swap), Rc = Rw(T.call), HOLD = 2;
  const grid = nb => { const BEAT = (Rc - Rs) / nb, bz = Math.max(1, Math.round((Rw(T.zoom[0]) - Rs) / BEAT)); return { nb, BEAT, bz }; };
  const fits = [];
  for (let k = 8; k <= 24; k++) fits.push(grid(k));
  const near = gs => gs.sort((a, b) => Math.abs(a.BEAT - 0.4) - Math.abs(b.BEAT - 0.4))[0];
  const { nb, BEAT, bz } = near(fits.filter(g => (g.nb - g.bz) % 8 === 0)) || near(fits.filter(g => (g.nb - g.bz) % 4 === 0)) || grid(16);
  const at = beat => Rs + beat * BEAT;
  const ZOOM = [warp.world(at(bz)), warp.world(at(bz)) + 0.12, warp.world(at(bz + HOLD)), warp.world(at(bz + HOLD)) + 0.3];
  const BAY = [Math.max(ZOOM[1] + 0.02, ZOOM[2] - 0.45), ZOOM[2] - 0.03];
  const bayAt = w => 0.85 * (1 - smoother((w - BAY[0]) / (BAY[1] - BAY[0])));
  const plan = { tier, seed, warp, wallW: T.over, values: [], call: ['Daily Roll Over', 'Roll in. Cash out.'], throwOk: true, why: [] };
  plan.restW = T.dive[1]; plan.callW = T.call; plan.revealW = T.reveal; plan.endW = T.end;
  plan.revealReal = Rw(T.reveal); plan.totalReal = Rw(T.end); plan.restReal = Rw(T.dive[1]); plan.wallReal = Rw(T.over);

  // ================================================================ the room
  // ---- The photograph: the maker mid-throw, as the shot's first frame - a
  // card held square in front of the lens, filling it, close on the face and
  // pulling back to the throw; at the whip it slides away and the table is
  // behind it.
  const FOV = (aspect < 0.62 ? 42 : 34) * DEG;
  const photo = await (async () => {
    const res = await fetch(asset('rare/thrower.jpg'), { signal });
    const bmp = await createImageBitmap(await res.blob(), { imageOrientation: 'flipY' });
    const map = new THREE.Texture(bmp); map.colorSpace = THREE.SRGBColorSpace; map.needsUpdate = true;
    const m = new THREE.MeshBasicMaterial({ map, depthTest: false, depthWrite: false, fog: false, toneMapped: false, transparent: true });
    const g = new THREE.PlaneGeometry(1, 1); keep(g, m, map);
    const card = new THREE.Mesh(g, m); card.renderOrder = 998; card.frustumCulled = false; scene.add(card);
    return { card, m, ar: bmp.width / bmp.height };
  })();
  const placePhoto = (w, lens) => {
    const out = smoother((w - (T.whip - 0.04)) / 0.2);
    photo.card.visible = out < 1;
    if (!photo.card.visible) { flung.forEach(m => { m.visible = false; }); return; }
    const d = lens.aim.clone().sub(lens.eye).normalize(), D = 10, h = 2 * D * Math.tan(FOV / 2), wv = h * aspect;
    // (cover the screen: tight on the face at first, pulling back - gathering
    // pace, as a throw does - to the outstretched hand as the dice leave it)
    const e = smoother((w - 0.12) / (T.whip - 0.2)), k = lerp(2.5, 1.02, e * e * (2 - e));
    const s = (aspect < photo.ar ? h : wv / photo.ar) * k, cw = s * photo.ar;
    photo.card.scale.set(cw, s, 1);
    // (the point of the photograph at the screen's middle: the face, then toward the hand - kept inside the picture)
    const hu = Math.min(0.5, wv / (2 * cw)), hv = Math.min(0.5, h / (2 * s));
    const fu = Math.max(hu, Math.min(1 - hu, lerp(PHOTO_FACE[0], PHOTO_HAND[0], e))), fv = Math.max(hv, Math.min(1 - hv, lerp(PHOTO_FACE[1], PHOTO_HAND[1], e)));
    const right = V().crossVectors(d, V(0, 1, 0)).normalize(), up = V().crossVectors(right, d);
    photo.card.position.copy(lens.eye).addScaledVector(d, D).addScaledVector(right, -(fu - 0.5) * cw - out * wv * 1.25).addScaledVector(up, -(0.5 - fv) * s + 0.06 * out * h);
    photo.card.quaternion.setFromRotationMatrix(new THREE.Matrix4().makeBasis(right, up, d.clone().negate()));
    photo.m.opacity = 1 - 0.3 * out;
    // (the throw: two dice leave the hand in the photograph and come out of
    // it at the lens, tumbling, growing as they come, off past its corner)
    const u = (w - THROW[0]) / (THROW[1] - THROW[0]);
    flung.forEach((m, i) => {
      const ui = u - i * 0.07; m.visible = ui > 0 && ui < 1 && out < 0.5;
      if (!m.visible) return;
      flungMats.forEach(fm => { fm.opacity = smoother(Math.max(0, u) / 0.12); });
      const hand = photo.card.position.clone().addScaledVector(right, (PHOTO_DICE[0] - 0.5) * cw).addScaledVector(up, (0.5 - PHOTO_DICE[1]) * s).addScaledVector(d, -0.2);
      const away = lens.eye.clone().addScaledVector(d, 1.7).addScaledVector(right, -1.3 + 0.35 * i).addScaledVector(up, -0.5 + 0.2 * i);
      const k = Math.pow(ui, 1.7);
      m.position.copy(hand).lerp(away, k).addScaledVector(up, 0.8 * Math.sin(Math.PI * ui) * (1 - k)).addScaledVector(right, 0.55 * i * (1 - k)).addScaledVector(up, -0.25 * i * (1 - k));
      m.rotation.set(spin[i][0] + ui * 9, spin[i][1] + ui * 7, ui * 4);
    });
  };

  // ---- The dice: casino red, translucent, white pips. (A second pair, the
  // ones flung out of the photograph: drawn over the card, the way it is.)
  const pipTex = (n) => texOf(canvas(128, 128, (c, W) => {
    c.fillStyle = '#c4161c'; c.fillRect(0, 0, W, W);
    const at = { 1: [[0.5, 0.5]], 2: [[0.28, 0.28], [0.72, 0.72]], 3: [[0.26, 0.26], [0.5, 0.5], [0.74, 0.74]], 4: [[0.28, 0.28], [0.72, 0.28], [0.28, 0.72], [0.72, 0.72]], 5: [[0.26, 0.26], [0.74, 0.26], [0.5, 0.5], [0.26, 0.74], [0.74, 0.74]], 6: [[0.28, 0.24], [0.72, 0.24], [0.28, 0.5], [0.72, 0.5], [0.28, 0.76], [0.72, 0.76]] }[n];
    c.fillStyle = '#f6f2ea'; at.forEach(([x, y]) => { c.beginPath(); c.arc(x * W, y * W, W * 0.085, 0, TAU); c.fill(); });
  }));
  const dieMats = [1, 6, 2, 5, 3, 4].map(n => { const m = new THREE.MeshPhysicalMaterial({ map: pipTex(n), roughness: 0.12, clearcoat: 1, clearcoatRoughness: 0.05, sheen: 0 }); keep(null, m); return m; });
  const dieG = new THREE.BoxGeometry(1.9, 1.9, 1.9); keep(dieG);
  const dice = [0, 1].map(() => { const d = new THREE.Mesh(dieG, dieMats); d.castShadow = true; scene.add(d); return d; });
  const spin = [[rng() * TAU, rng() * TAU, 9 + 4 * rng()], [rng() * TAU, rng() * TAU, 11 + 4 * rng()]];
  const flungMats = dieMats.map(m => { const c = m.clone(); c.transparent = true; keep(null, c); return c; });
  const flung = [0, 1].map(() => { const d = new THREE.Mesh(dieG, flungMats); d.scale.setScalar(0.2); d.renderOrder = 999; d.visible = false; d.frustumCulled = false; scene.add(d); return d; });
  const dicePose = (i, w) => {
    const off = i ? [3.1, 0, 2.2] : [0, 0, 0];
    const K = DICE_KEYS, wi = w - (i ? 0.03 : 0);
    let k = 0; while (k < K.length - 2 && wi > K[k + 1][0]) k++;
    const [w0, a] = K[k], [w1, b, hop] = K[k + 1], u = clamp01((wi - w0) / (w1 - w0));
    const p = [lerp(a[0], b[0], u) + off[0] * (1 - 0.5 * u), lerp(a[1], b[1], u) + (k === 0 ? 10 * Math.sin(Math.PI * u) : hop * Math.sin(Math.PI * u)), lerp(a[2], b[2], u) + off[2]];
    const air = k === 0 || hop > 1, kk = (wi - T.dice) * spin[i][2] * (air ? 1 : 0.6);
    return { p, r: [spin[i][0] + kk, spin[i][1] + kk * 0.7, kk * 0.4], on: wi >= T.dice - 0.02 };
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
    [[0, '#3050a0'], [0.3, '#8090d0'], [0.45, '#ffa080'], [0.5, '#ffd890'], [0.56, '#e8b060'], [1, '#c08a40']].forEach(([o, col]) => g.addColorStop(o, col));
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
    const body = new THREE.MeshPhysicalMaterial({ color: 0x0c0c10, metalness: 0.4, roughness: 0.22, clearcoat: 1, clearcoatRoughness: 0.08, fog: false });
    const gold = new THREE.MeshPhysicalMaterial({ color: 0xe0a83a, metalness: 1, roughness: 0.25, fog: false });
    const glass = new THREE.MeshPhysicalMaterial({ color: 0x101820, metalness: 0.2, roughness: 0.05, clearcoat: 1, fog: false });
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
  // (its livery: the house's badge long down the belly, split across the
  // bay's two doors - it reads whole only once they've shut - and on the
  // fin; the name along the cabin in gold)
  const doors = [];
  {
    const badge = set && set.tex && set.tex.badge;
    const decal = (map, w, h, pos, rot) => {
      const m = new THREE.MeshBasicMaterial({ map, transparent: true, alphaTest: 0.2, fog: false, side: THREE.DoubleSide, polygonOffset: true, polygonOffsetFactor: -2 });
      const g = new THREE.PlaneGeometry(w, h); keep(g, m);
      const d = new THREE.Mesh(g, m); d.position.set(...pos); d.rotation.set(...rot); jet.add(d); return d;
    };
    const lettering = (text, W, Hh, font, fill, stroke) => texOf(canvas(W, Hh, (c) => {
      c.font = font; c.textAlign = 'center'; c.textBaseline = 'middle';
      const g = c.createLinearGradient(0, 0, 0, Hh); g.addColorStop(0, '#fff2b8'); g.addColorStop(0.45, fill); g.addColorStop(1, '#8a5a12');
      if (stroke) { c.lineWidth = Hh * 0.08; c.strokeStyle = stroke; c.strokeText(text, W / 2, Hh / 2 + 2); }
      c.fillStyle = g; c.fillText(text, W / 2, Hh / 2 + 2);
    }));
    // (the bay: under the belly ahead of the wing, two doors split down the
    // keel that slide apart up the hull's curve toward the wings and back
    // to meet in the middle; the badge painted across both, turned to run
    // nose to tail; inside, the house's money stacked in a warm light)
    {
      const BW = 30, BL = 48, BZ = BAY_Z, R = 20.7, img = badge && badge.image;
      const yAt = x => -Math.sqrt(R * R - x * x);
      const paint = texOf(canvas(512, 820, (c, W, H) => {
        c.fillStyle = '#0c0c10'; c.fillRect(0, 0, W, H);
        c.strokeStyle = '#e0a83a'; c.lineWidth = 10; c.strokeRect(12, 12, W - 24, H - 24);
        if (img) { c.save(); c.translate(W / 2, H / 2); c.rotate(-Math.PI / 2); const w = H * 0.9, h = Math.min(w * img.height / img.width, W * 0.94); c.drawImage(img, -w / 2, -h / 2, w, h); c.restore(); }
      }));
      const doorM = new THREE.MeshPhysicalMaterial({ map: paint, metalness: 0.35, roughness: 0.3, clearcoat: 1, clearcoatRoughness: 0.08, fog: false });
      const backM = new THREE.MeshStandardMaterial({ color: 0x16161a, metalness: 0.5, roughness: 0.5, side: THREE.BackSide, fog: false });
      keep(null, doorM); keep(null, backM);
      [-1, 1].forEach(s => {
        // (the door: curved to the hull from its outer edge, x = s*BW/2, in
        // to the keel; uv across the whole badge. It turns about the
        // fuselage's axis, so it slides along the hull's curve.)
        const g = new THREE.BufferGeometry(), hx = s * BW / 2, N = 8, pos = [], uv = [], idx = [];
        for (let i = 0; i <= N; i++) {
          const x = hx * (1 - i / N);
          [BZ - BL / 2, BZ + BL / 2].forEach(z => { pos.push(x, yAt(x) - 0.25, z); uv.push(x / BW + 0.5, (z - BZ) / BL + 0.5); });
          if (i < N) { const a = 2 * i; idx.push(...(s > 0 ? [a, a + 1, a + 2, a + 1, a + 3, a + 2] : [a, a + 2, a + 1, a + 1, a + 2, a + 3])); }
        }
        g.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3)); g.setAttribute('uv', new THREE.Float32BufferAttribute(uv, 2));
        g.setIndex(idx); g.computeVertexNormals(); keep(g);
        const hinge = new THREE.Group(); jet.add(hinge);
        hinge.add(new THREE.Mesh(g, doorM), new THREE.Mesh(g, backM));
        doors.push({ hinge, s });
      });
      // (the hold: a recess lit gold, bundles of notes in rows)
      const hold = texOf(canvas(256, 400, (c, W, H) => {
        const g = c.createRadialGradient(W / 2, H / 2, 10, W / 2, H / 2, H * 0.6); g.addColorStop(0, '#5a3a12'); g.addColorStop(1, '#0a0806'); c.fillStyle = g; c.fillRect(0, 0, W, H);
        for (let r = 0; r < 6; r++) for (let k = 0; k < 3; k++) { const x = 30 + k * 70, y = 40 + r * 58; c.fillStyle = (r + k) % 2 ? '#3f6b3a' : '#4f7d44'; c.fillRect(x, y, 56, 40); c.fillStyle = '#e0c060'; c.fillRect(x + 24, y, 8, 40); }
      }));
      const holdM = new THREE.MeshBasicMaterial({ map: hold, fog: false }); const al = Math.asin((BW / 2 - 1) / R);
      const hg = new THREE.CylinderGeometry(R - 0.1, R - 0.1, BL - 2, 12, 1, true, -al, 2 * al); hg.rotateX(Math.PI / 2); keep(hg, holdM);
      const hm = new THREE.Mesh(hg, holdM); hm.position.set(0, 0, BZ); jet.add(hm);
    }
    if (badge) {
      // (the fin, both faces)
      decal(badge, 30, 19.7, [3.2, 50, 104], [0, Math.PI / 2, 0]);
      decal(badge, 30, 19.7, [-0.2, 50, 104], [0, -Math.PI / 2, 0]);
    }
    const name = lettering('DAILY ROLL OVER', 1024, 128, 'bold 92px Georgia, "Times New Roman", serif', '#e6b04a', null);
    decal(name, 120, 15, [20.4, 9, -18], [0, Math.PI / 2, 0]);
    decal(name, 120, 15, [-20.4, 9, -18], [0, -Math.PI / 2, 0]);
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
    const a = bayAt(w); doors.forEach(({ hinge, s }) => { hinge.rotation.z = s * a; });
    for (let s = 0; s < 2; s++) for (let k = 0; k < trail.N; k++) {
      const z = p.z + 75 + k * 28, wide = 2 + k * 0.4, x = p.x + (s ? 34 : -34), y = p.y + 10 + k * 0.6, a = (s * trail.N * 2 + k * 2) * 3;
      trail.pos.set([x - wide, y, z, x + wide, y, z], a);
    }
    trail.g.attributes.position.needsUpdate = true;
  };

  // ---- The money: banknotes of the house - green, the monogram and a
  // hundred - poured from the jet's belly while its bay is open, fluttering
  // down to the sea.
  const NB = 520;
  // (the note: engraved - a fine guilloche ground, a border of rosettes, the
  // house's dice in an oval, seals, the denomination in each corner, a
  // serial; printed on both faces)
  const billTex = texOf(canvas(512, 216, (c, W, Hh) => {
    c.fillStyle = '#d9e4c8'; c.fillRect(0, 0, W, Hh);
    c.strokeStyle = 'rgba(70,110,70,0.35)'; c.lineWidth = 1;
    for (let k = 0; k < 60; k++) { c.beginPath(); for (let x = 0; x <= W; x += 6) { const y = Hh / 2 + Math.sin(x * 0.045 + k * 0.35) * (Hh * 0.42) * Math.cos(k * 0.11); x ? c.lineTo(x, y) : c.moveTo(x, y); } c.stroke(); }
    c.strokeStyle = '#2f5a30'; c.lineWidth = 8; c.strokeRect(8, 8, W - 16, Hh - 16);
    c.lineWidth = 2; c.strokeRect(18, 18, W - 36, Hh - 36);
    c.fillStyle = '#3c6e3a'; for (let x = 30; x < W - 20; x += 22) [24, Hh - 24].forEach(y => { c.beginPath(); c.arc(x, y, 4, 0, TAU); c.fill(); });
    // (the oval: two dice, engraved)
    c.fillStyle = '#c7d6b4'; c.strokeStyle = '#2f5a30'; c.lineWidth = 4; c.beginPath(); c.ellipse(W / 2, Hh / 2, 64, 74, 0, 0, TAU); c.fill(); c.stroke();
    [[-20, -8, -0.3], [18, 12, 0.25]].forEach(([dx, dy, r]) => { c.save(); c.translate(W / 2 + dx, Hh / 2 + dy); c.rotate(r); c.fillStyle = '#e8eedc'; c.fillRect(-18, -18, 36, 36); c.strokeRect(-18, -18, 36, 36); c.fillStyle = '#2f5a30'; [[-9, -9], [9, 9], [0, 0]].forEach(([x, y]) => { c.beginPath(); c.arc(x, y, 3.6, 0, TAU); c.fill(); }); c.restore(); });
    // (seals, the denomination, the bank's name, a serial)
    c.fillStyle = '#7a2b22'; c.beginPath(); c.arc(W * 0.78, Hh * 0.62, 22, 0, TAU); c.fill();
    c.fillStyle = '#1f4a22'; c.beginPath(); c.arc(W * 0.22, Hh * 0.62, 22, 0, TAU); c.fill();
    c.fillStyle = '#244a24'; c.textAlign = 'center'; c.textBaseline = 'middle';
    c.font = 'bold 44px Georgia, serif'; c.fillText('100', 64, 50); c.fillText('100', W - 64, Hh - 48);
    c.font = 'bold 18px Georgia, serif'; c.fillText('THE BANK OF DAILY ROLL OVER', W / 2, 34);
    c.font = 'bold 15px Georgia, serif'; c.fillText('ONE HUNDRED · ROLL IN · CASH OUT', W / 2, Hh - 30);
    c.font = '14px Courier New, monospace'; c.fillStyle = '#7a2b22'; c.fillText('DR 07 777 007 D', W * 0.78, Hh * 0.3);
  }));
  const billM = new THREE.MeshStandardMaterial({ map: billTex, side: THREE.DoubleSide, roughness: 0.72, fog: false }); keep(null, billM);
  // (the paper bowed along its length, as a falling note is, not a flat card)
  const billG = new THREE.PlaneGeometry(46, 19.5, 8, 2); keep(billG);
  { const p = billG.attributes.position; for (let i = 0; i < p.count; i++) { const x = p.getX(i) / 23; p.setZ(i, 4.2 * (1 - x * x) + 0.8 * Math.sin(p.getY(i) * 0.3) * x); } billG.computeVertexNormals(); }
  const bills = new THREE.InstancedMesh(billG, billM, NB); bills.frustumCulled = false; sky.add(bills);
  const billPlan = Array.from({ length: NB }, () => {
    const ts = lerp(T.rain[0], BAY[0] + 0.1, rng());
    return { ts, dx: (rng() - 0.5) * 26, dz: (rng() - 0.5) * 46, vx: (rng() - 0.5) * 110, vz: (rng() - 0.5) * 60 - 120, fall: 470 + 140 * rng(), ph: rng() * TAU, fr: 2 + 3 * rng(), ax: V(rng() - 0.5, rng() - 0.5, rng() - 0.5).normalize() };
  });
  // (the moment each comes down on the water: its height's root, by Newton)
  const dropY = (b, x) => jetAt(b.ts).y - 26 - b.fall * (x - 0.6 * (1 - Math.exp(-x / 0.6)));
  billPlan.forEach(b => { let x = 2.5; for (let k = 0; k < 8; k++) x -= (dropY(b, x) - SEA) / -(b.fall * (1 - Math.exp(-x / 0.6))); b.land = b.ts + x; });
  const billAt = (b, w) => {
    const x = w - b.ts; if (x < 0) return null;
    const p0 = jetAt(b.ts);
    const y = p0.y - 26 - b.fall * (x - 0.6 * (1 - Math.exp(-x / 0.6)));
    if (y < SEA - 4) return null;
    return { p: V(p0.x + b.dx + b.vx * x + 25 * Math.sin(b.ph + x * b.fr) * Math.min(1, x * 2), y, p0.z + 1.1 * BAY_Z + b.dz + b.vz * x), a: b.ph + x * b.fr * 1.3, x };
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
  const LAND = (() => { let x = 0, z = 0; billPlan.forEach(b => { const p = billAt(b, b.land - 0.01).p; x += p.x; z += p.z; }); return V(x / NB, SEA, z / NB); })();
  // (and the cloud of them, falling: its middle at a moment - for the lens to go down with)
  const cloudAt = w => {
    let x = 0, y = 0, z = 0, n = 0;
    for (let i = 0; i < NB; i += 4) { const s = billAt(billPlan[i], w); if (s) { x += s.p.x; y += s.p.y; z += s.p.z; n++; } }
    return n > 6 ? V(x / n, y / n, z / n) : null;
  };
  // ---- The splashes: where each bill hits the water, a white ring opening
  // and a burst of spray - gold, once the sea has turned.
  const splashTex = texOf(canvas(128, 128, (c, W) => {
    c.strokeStyle = 'rgba(255,255,255,0.9)'; c.lineWidth = 7; c.beginPath(); c.arc(W / 2, W / 2, W * 0.4, 0, TAU); c.stroke();
    const g = c.createRadialGradient(W / 2, W / 2, 0, W / 2, W / 2, W * 0.4); g.addColorStop(0, 'rgba(255,255,255,0.55)'); g.addColorStop(1, 'rgba(255,255,255,0)'); c.fillStyle = g; c.fillRect(0, 0, W, W);
  }));
  const splashM = new THREE.MeshBasicMaterial({ map: splashTex, transparent: true, depthWrite: false, opacity: 1 }); keep(null, splashM);
  const splashG = new THREE.PlaneGeometry(1, 1); splashG.rotateX(-Math.PI / 2); keep(splashG);
  const splashes = new THREE.InstancedMesh(splashG, splashM, NB); splashes.frustumCulled = false;
  splashes.instanceColor = new THREE.InstancedBufferAttribute(new Float32Array(NB * 3), 3);
  const poseSplashes = (w, gold) => {
    const c = new THREE.Color();
    for (let i = 0; i < NB; i++) {
      const b = billPlan[i], x = w - b.land;
      if (i % 3 || x < 0 || x > 0.9) { splashes.setMatrixAt(i, hide); continue; }
      const p = billAt(b, b.land - 0.01).p, r = 8 + 34 * Math.sqrt(x / 0.9);
      mtx.makeScale(r, 1, r).setPosition(p.x, SEA + 7, p.z); splashes.setMatrixAt(i, mtx);
      const k = gold(p), fade = 0.55 * (1 - x / 0.9);
      c.setRGB(lerp(1, 1, k) * fade, lerp(1, 0.78, k) * fade, lerp(1, 0.35, k) * fade); splashes.setColorAt(i, c);
    }
    splashes.instanceMatrix.needsUpdate = true; splashes.instanceColor.needsUpdate = true;
  };
  splashM.blending = THREE.AdditiveBlending; sky.add(splashes);
  // (and the spray: a few drops thrown up from each, falling back)
  const SPR = 8, sprayN = Math.ceil(NB / 3) * SPR, sprayPos = new Float32Array(sprayN * 3), sprayDir = Array.from({ length: SPR }, (_, k) => [Math.cos(k / SPR * TAU) * (18 + 14 * rng()), 70 + 60 * rng(), Math.sin(k / SPR * TAU) * (18 + 14 * rng())]);
  const sprayG = new THREE.BufferGeometry(); sprayG.setAttribute('position', new THREE.BufferAttribute(sprayPos, 3));
  const sprayTex = texOf(canvas(32, 32, (c, W) => { const g = c.createRadialGradient(W / 2, W / 2, 0, W / 2, W / 2, W / 2); g.addColorStop(0, 'rgba(255,255,255,1)'); g.addColorStop(1, 'rgba(255,255,255,0)'); c.fillStyle = g; c.fillRect(0, 0, W, W); }));
  const sprayM = new THREE.PointsMaterial({ map: sprayTex, size: 7, transparent: true, depthWrite: false, color: 0xf4f8ff, blending: THREE.AdditiveBlending }); keep(sprayG, sprayM);
  const spray = new THREE.Points(sprayG, sprayM); spray.frustumCulled = false; sky.add(spray);
  const poseSpray = (w, gold) => {
    let j = 0, gsum = 0, n = 0;
    for (let i = 0; i < NB; i += 3) {
      const b = billPlan[i], x = w - b.land, p = x > 0 && x < 0.7 ? billAt(b, b.land - 0.01).p : null;
      for (let k = 0; k < SPR; k++, j++) {
        if (!p) { sprayPos.set([0, -1e5, 0], j * 3); continue; }
        const d = sprayDir[k];
        sprayPos.set([p.x + d[0] * x, SEA + 6 + d[1] * x - 300 * x * x, p.z + d[2] * x], j * 3);
      }
      if (p) { gsum += gold(p); n++; }
    }
    sprayG.attributes.position.needsUpdate = true;
    sprayM.color.setRGB(1, lerp(0.97, 0.8, n ? gsum / n : 0), lerp(1, 0.45, n ? gsum / n : 0));
  };

  // ---- The sea: open ocean at golden hour - long swells rolling in under
  // a finer chop, deep blue-green in the troughs and clearer on the crests,
  // foam where they break, the low sun laid across it in a path of glitter,
  // and the far water lost in the haze at the horizon. Nothing changes until
  // the money touches it: then liquid gold spreads out in rings from each
  // point of contact, the first bills' and more as they keep coming, the
  // rings running together until the sea is gold.
  const byLand = billPlan.slice().sort((a, b) => a.land - b.land);
  const seeds = [0, 2, 5, 9, 14, 20, 28, 38, 50, 65, 85, 110, 140, 180, 230, 300].map(k => {
    const b = byLand[Math.min(k, NB - 1)], p = billAt(b, b.land - 0.01).p; return { x: p.x, y: p.z, z: b.land };
  });
  // (a ring's radius, its soft edge, a moment after contact: slow at first, then racing out)
  const ringR = x => 40 * x + 950 * x * x;
  const ringSoft = R => 40 + 0.1 * R;
  const goldAt = p => {
    let g = 0;
    seeds.forEach(sd => { const x = seaU.uT.value - sd.z; if (x <= 0) return; const R = ringR(x), soft = ringSoft(R), d = Math.hypot(p.x - sd.x, p.z - sd.y); g = Math.max(g, 1 - smoother((d - (R - soft)) / soft)); });
    return g;
  };
  // (the field is painted here, each frame while it spreads, into a small
  // map laid over the water about the landing - the gold in red, its bright
  // seam in green, 128 texels a side - and the sea's shaders only look it up: the rings worked
  // out in the shaders themselves, from an array of seeds, drew on a
  // desktop and not on a phone's GPU. Beyond the map, a disc about the
  // landing that the rings are known to have covered.)
  const GT = 128, GH = 2400, gtData = new Uint8Array(GT * GT * 4), gtG = new Float32Array(GT * GT), gtE = new Float32Array(GT * GT);
  const goldMap = new THREE.DataTexture(gtData, GT, GT, THREE.RGBAFormat, THREE.UnsignedByteType);
  goldMap.magFilter = goldMap.minFilter = THREE.LinearFilter; goldMap.needsUpdate = true; keep(null, null, goldMap);
  const seaU = { uT: { value: 0 }, uGT: { value: goldMap }, uGA: { value: new THREE.Vector4(LAND.x, LAND.z, 1 / (2 * GH), 0) }, uGF: { value: new THREE.Vector2(0, 1) } };
  let goldFull = Infinity;
  const paintGold = w => {
    if (w >= goldFull) return;
    gtG.fill(0); gtE.fill(0);
    let far = 0, farSoft = 1;
    const cell = 2 * GH / GT;
    seeds.forEach(sd => {
      const x = w - sd.z; if (x <= 0) return;
      const R = ringR(x), soft = ringSoft(R), reach = R - Math.hypot(sd.x - LAND.x, sd.y - LAND.z);
      if (reach > far) { far = reach; farSoft = soft; }
      const i0 = Math.max(0, Math.floor((sd.x - R - soft - LAND.x + GH) / cell)), i1 = Math.min(GT - 1, Math.ceil((sd.x + R + soft - LAND.x + GH) / cell));
      const j0 = Math.max(0, Math.floor((sd.y - R - soft - LAND.z + GH) / cell)), j1 = Math.min(GT - 1, Math.ceil((sd.y + R + soft - LAND.z + GH) / cell));
      for (let j = j0; j <= j1; j++) for (let i = i0; i <= i1; i++) {
        const px = LAND.x - GH + (i + 0.5) * cell, pz = LAND.z - GH + (j + 0.5) * cell, d = Math.hypot(px - sd.x, pz - sd.y), k = j * GT + i;
        const g = 1 - smoother((d - (R - soft)) / soft), e = (d - R + soft * 0.5) / (soft * 0.5);
        if (g > gtG[k]) gtG[k] = g;
        const ee = Math.exp(-Math.min(e * e, 30)); if (ee > gtE[k]) gtE[k] = ee;
      }
    });
    for (let k = 0; k < GT * GT; k++) { gtData[k * 4] = Math.round(255 * gtG[k]); gtData[k * 4 + 1] = Math.round(255 * gtE[k] * Math.min(1, 2 * (1 - gtG[k]))); }
    goldMap.needsUpdate = true;
    seaU.uGF.value.set(far, farSoft);
    // (the map wholly inside the disc: nothing left to paint)
    if (far - farSoft > GH * 1.5) goldFull = w;
  };
  const FIELD = `
    uniform sampler2D uGT; uniform vec4 uGA; uniform vec2 uGF;
    // (x: the gold, y: its bright spreading seam)
    vec2 gfield(vec2 q){
      vec2 uv = (q - uGA.xy) * uGA.z + 0.5;
      float inside = step(0.0, uv.x) * step(uv.x, 1.0) * step(0.0, uv.y) * step(uv.y, 1.0);
      vec2 s = texture2D(uGT, clamp(uv, 0.0, 1.0)).rg * inside;
      float far = step(0.0001, uGF.x) * (1.0 - smoothstep(uGF.x - uGF.y, uGF.x, length(q - uGA.xy)));
      return vec2(max(s.x, far), s.y);
    }`;
  const seaM = new THREE.MeshPhysicalMaterial({ color: 0xffffff, metalness: 0, roughness: 0.08, clearcoat: 0, envMapIntensity: 1.2 });
  const WAVES = `
    // (Gerstner swells: each a direction, a length, a height and a speed)
    vec3 gw(vec2 p, vec2 d, float L, float A, float sp){ float k = 6.2832 / L, f = k * (dot(d, p) - sp * uT); return vec3(d.x * A * 0.6 * cos(f), A * sin(f), d.y * A * 0.6 * cos(f)); }
    vec3 sw(vec2 p){
      return gw(p, normalize(vec2(1.0, 0.35)), 620.0, 13.0, 90.0) + gw(p, normalize(vec2(0.6, -1.0)), 380.0, 7.0, 70.0)
           + gw(p, normalize(vec2(-0.8, 0.5)), 210.0, 4.0, 52.0) + gw(p, normalize(vec2(0.2, 1.0)), 120.0, 2.0, 40.0);
    }`;
  seaM.onBeforeCompile = sh => {
    Object.assign(sh.uniforms, seaU);
    sh.vertexShader = sh.vertexShader
      .replace('#include <common>', '#include <common>\nuniform float uT; varying vec3 vW; varying float vH; varying float vG; varying float vE;' + WAVES + FIELD + `
    float calm(vec2 q){ return 1.0 - 0.35 * gfield(q).x; }`)
      .replace('#include <beginnormal_vertex>', `#include <beginnormal_vertex>
        { vec2 q = vec2(position.x, -position.y); float e = 3.0;
          vec3 a = vec3(q.x, 0.0, q.y) + sw(q), bx = vec3(q.x + e, 0.0, q.y) + sw(q + vec2(e, 0.0)), bz = vec3(q.x, 0.0, q.y + e) + sw(q + vec2(0.0, e));
          vec3 n = normalize(cross(bz - a, bx - a)); n.xz *= calm(q); n = normalize(n); objectNormal = vec3(n.x, -n.z, n.y); }`)
      .replace('#include <begin_vertex>', `#include <begin_vertex>
        { vec2 q = vec2(position.x, -position.y); vec3 d = sw(q) * calm(q); transformed += vec3(d.x, -d.z, d.y); vH = d.y; }
        vW = (modelMatrix * vec4(transformed, 1.0)).xyz;
        { vec2 gf = gfield(vec2(position.x, -position.y)); vG = gf.x; vE = gf.y; }`);
    sh.fragmentShader = sh.fragmentShader
      .replace('#include <common>', `#include <common>
        uniform float uT; varying vec3 vW; varying float vH; varying float vG; varying float vE;
        float gmask(){ return vG; }
        // (the chop: fine ripples on the normal, never in the geometry)
        vec3 chop(vec2 p){
          vec2 g = vec2(0.0);
          g += vec2(cos(p.x * 0.09 + uT * 2.1), 0.0) * 0.35;
          g += vec2(0.0, cos(p.y * 0.12 - uT * 2.6)) * 0.3;
          g += vec2(cos((p.x + p.y) * 0.21 + uT * 3.3)) * 0.16;
          g += vec2(cos((p.x - p.y) * 0.33 - uT * 3.9), -cos((p.x * 0.7 + p.y) * 0.29 + uT * 3.1)) * 0.1;
          return vec3(g.x, 0.0, g.y);
        }`)
      .replace('#include <normal_fragment_maps>', `#include <normal_fragment_maps>
        { float far = smoothstep(2600.0, 600.0, length(vW - cameraPosition));
          vec3 cw = chop(vW.xz) * 0.22 * far * (1.0 - 0.6 * gmask()); vec3 nw = normalize(vec3(cw.x, 1.0, cw.z));
          normal = normalize(normal + (viewMatrix * vec4(nw - vec3(0.0, 1.0, 0.0), 0.0)).xyz); }`)
      .replace('#include <metalnessmap_fragment>', `#include <metalnessmap_fragment>
        { float g = gmask();
          // (water: dark in the troughs, a clear blue-green lit through the crests, foam where they peak)
          vec3 deep = vec3(0.012, 0.07, 0.11), crest = vec3(0.05, 0.30, 0.34);
          vec3 w = mix(deep, crest, smoothstep(-8.0, 14.0, vH));
          float foam = smoothstep(12.0, 18.0, vH + 3.0 * sin(vW.x * 0.07 + uT) * sin(vW.z * 0.05 - uT));
          w = mix(w, vec3(0.85, 0.88, 0.86), foam * 0.6);
          diffuseColor.rgb = mix(w, vec3(0.86, 0.47, 0.05), g);
          metalnessFactor = mix(0.0, 0.92, g);
          roughnessFactor = mix(0.06 + 0.3 * foam, 0.2, g); }`)
      .replace('#include <emissivemap_fragment>', `#include <emissivemap_fragment>
        { float g = gmask();
          // (molten: lit from within, brightest at the swell's crests, a bright seam at the spreading edge)
          float edge = vE;
          totalEmissiveRadiance += vec3(0.8, 0.36, 0.03) * (g * (0.1 + 0.02 * max(vH, 0.0)) + edge * 0.9); }`);
  };
  seaM.customProgramCacheKey = () => 'flyover-sea'; keep(null, seaM);
  const seaG = new THREE.PlaneGeometry(9000, 9000, 300, 300); keep(seaG);
  const sea = new THREE.Mesh(seaG, seaM); sea.rotation.x = -Math.PI / 2; sea.position.y = SEA; sea.frustumCulled = false; sky.add(sea);
  // (under the surface: the light from above through the gold, and bubbles
  // rising past the lens, each with a little $ in it - when one bursts, its
  // $ comes free and drifts, turning gold as it fades into the gold around it)
  const under = (() => {
    const g = new THREE.SphereGeometry(400, 32, 16), m = new THREE.ShaderMaterial({ side: THREE.BackSide, depthWrite: false, fog: false, uniforms: { uT: seaU.uT },
      vertexShader: 'varying vec3 vD; void main(){ vD = normalize(position); gl_Position = projectionMatrix * modelViewMatrix * vec4(position,1.0); }',
      fragmentShader: `varying vec3 vD; uniform float uT;
        void main(){
          float h = vD.y;
          vec3 c = mix(vec3(0.62, 0.34, 0.05), vec3(1.0, 0.80, 0.36), smoothstep(-0.8, 0.8, h));
          float rays = pow(max(0.0, sin(atan(vD.x, vD.z) * 9.0 + uT * 0.6) * sin(atan(vD.x, vD.z) * 5.0 - uT * 0.4)), 3.0) * smoothstep(0.1, 0.9, h);
          float caus = pow(abs(sin(vD.x * 23.0 + uT * 1.7) * sin(vD.z * 19.0 - uT * 1.3)), 6.0) * smoothstep(0.5, 1.0, h);
          gl_FragColor = vec4(c + vec3(1.0, 0.85, 0.5) * (rays * 0.35 + caus * 0.5), 1.0);
        }` });
    keep(g, m); const dome = new THREE.Mesh(g, m); dome.visible = false; dome.renderOrder = -1; sky.add(dome);
    // (each: where it rises, its speed, where in its life it starts, how big)
    const N = 160, pos = new Float32Array(N * 3), st = new Float32Array(N), sz = new Float32Array(N);
    const seeds = Array.from({ length: N }, () => [(rng() - 0.5) * 240, (rng() - 0.5) * 240, 0.45 + 0.5 * rng(), rng(), 0.7 + 0.6 * rng(), rng() * TAU]);
    const pg = new THREE.BufferGeometry(); pg.setAttribute('position', new THREE.BufferAttribute(pos, 3));
    pg.setAttribute('aS', new THREE.BufferAttribute(st, 1)); pg.setAttribute('aZ', new THREE.BufferAttribute(sz, 1));
    // (the sheet: the bubble with its $ on the left, the $ alone on the right)
    const dollar = (c, x, W, fill) => { c.font = `bold ${W * 0.5}px Georgia, serif`; c.textAlign = 'center'; c.textBaseline = 'middle'; c.lineWidth = W * 0.06; c.strokeStyle = 'rgba(40,24,4,0.85)'; c.strokeText('$', x, W / 2 + W * 0.03); c.fillStyle = fill; c.fillText('$', x, W / 2 + W * 0.03); };
    const bt = texOf(canvas(256, 128, (c, W2, W) => {
      const g = c.createRadialGradient(W / 2, W / 2, W * 0.2, W / 2, W / 2, W * 0.44); g.addColorStop(0, 'rgba(255,250,230,0.05)'); g.addColorStop(0.85, 'rgba(255,245,215,0.35)'); g.addColorStop(1, 'rgba(255,240,200,0)');
      c.fillStyle = g; c.beginPath(); c.arc(W / 2, W / 2, W * 0.44, 0, TAU); c.fill();
      c.strokeStyle = 'rgba(255,244,214,0.9)'; c.lineWidth = W * 0.04; c.beginPath(); c.arc(W / 2, W / 2, W * 0.4, 0, TAU); c.stroke();
      c.fillStyle = 'rgba(255,255,255,0.9)'; c.beginPath(); c.ellipse(W * 0.36, W * 0.33, W * 0.09, W * 0.05, -0.7, 0, TAU); c.fill();
      dollar(c, W / 2, W, '#dfffd6'); dollar(c, W * 1.5, W, '#f2fff0');
    }));
    const pm = new THREE.PointsMaterial({ map: bt, size: 15, transparent: true, depthWrite: false, fog: false });
    pm.onBeforeCompile = sh => {
      sh.vertexShader = sh.vertexShader.replace('#include <common>', '#include <common>\nattribute float aS; attribute float aZ; varying float vS;')
        .replace('gl_PointSize = size;', 'gl_PointSize = size * aZ; vS = aS;');
      sh.fragmentShader = sh.fragmentShader.replace('#include <common>', '#include <common>\nvarying float vS;')
        .replace('#include <map_particle_fragment>', `
          { float freed = step(0.5, vS), u = clamp(vS - 1.0, 0.0, 1.0);
            vec4 tx = texture2D(map, vec2(gl_PointCoord.x * 0.5 + 0.5 * freed, 1.0 - gl_PointCoord.y));
            tx.rgb = mix(tx.rgb, vec3(1.0, 0.74, 0.22), freed * smoothstep(0.0, 0.8, u));
            tx.a *= 1.0 - freed * smoothstep(0.25, 1.0, u);
            diffuseColor *= tx; }`);
    };
    pm.customProgramCacheKey = () => 'flyover-bubbles'; keep(pg, pm, null);
    const bubbles = new THREE.Points(pg, pm); bubbles.visible = false; bubbles.frustumCulled = false; sky.add(bubbles);
    // (a life: risen from below the lens for 70% of it, then burst - a
    // swell and gone - the $ left drifting up slowly, turning and fading)
    const poseAt = w => {
      seeds.forEach(([x, z, sp, ph, k, wob], i) => {
        const c = (w * sp * 0.6 + ph) % 1;
        if (c < 0.7) {
          const u = c / 0.7, pop = smoother((u - 0.93) / 0.07);
          pos.set([x + 4 * Math.sin(wob + w * 3), -150 + 260 * u, z], i * 3); st[i] = 0; sz[i] = k * (1 + 0.5 * pop);
        } else {
          const u = (c - 0.7) / 0.3;
          pos.set([x + 4 * Math.sin(wob + w * 3) + 6 * Math.sin(wob + u * 4), 110 + 22 * u, z], i * 3); st[i] = 1 + u; sz[i] = k * 0.8;
        }
      });
      pg.attributes.position.needsUpdate = true; pg.attributes.aS.needsUpdate = true; pg.attributes.aZ.needsUpdate = true;
    };
    return { dome, bubbles, poseAt };
  })();

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
  const flashAt = w => Math.exp(-(((w - T.swap) / 0.22) ** 2));

  // ================================================================ the lens
  // keys [w, eye, aim]: on the felt, up after the dice, through the gleam to
  // the sky; after the jet; down onto the landing; the dive.
  const tall = aspect < 0.62;
  const lensAt = w => {
    const eye = V(), aim = V();
    if (w < T.swap) {
      // (the photograph first - the lens behind it already low at the side of
      // the table; then alongside the dice down the felt, a little behind
      // them, onto the wall as they strike it)
      const a = dicePose(0, Math.max(w, T.dice)).p, b = dicePose(1, Math.max(w, T.dice)).p;
      const mid = V((a[0] + b[0]) / 2, (a[1] + b[1]) / 2 + 1, (a[2] + b[2]) / 2);
      const wall = smoother((w - (T.over - 0.25)) / 0.5);
      eye.set(-46, lerp(20, 13, smoother((w - T.dice) / 0.8)), Math.max(-34, mid.z + 34));
      aim.copy(mid).lerp(V(0, 6, -70), 0.5 * wall);
      eye.y += 0.4 * Math.sin(w * 2.3);
      return { eye, aim };
    }
    // (the sky: the lens rises off the ground as it follows the jet over,
    // turning with it; then down onto the landing; then the dive)
    const rise = smoother((w - T.swap) / 3.2);
    eye.set(lerp(-46, -260, rise), lerp(13, 560, rise), lerp(-34, -160, rise));
    const j = jetAt(Math.min(w, 5.65)).add(V(0, 20, -60));
    aim.copy(j);
    // (the crash zoom: snatched in on the jet, overshooting, held unsteadily, let back out)
    const zm = zoomAt(w);
    if (zm > 0) eye.lerp(jetAt(w), 0.74 * zm);
    // (down with the money: not after any one bill, but at the pace of the
    // cloud of them, to the water as the first come down on it)
    const landLook = LAND.clone().add(V(0, 40, 0));
    const cl = cloudAt(w), dn = smoother((w - T.down) / 0.9);
    if (cl) aim.lerp(cl.lerp(landLook, smoother((w - (T.gold[0] - 0.6)) / 1.0)), dn);
    else if (w > T.down) aim.copy(landLook);
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
  const zoomAt = w => {
    const [a, b, c, d] = ZOOM;
    if (w < a || w > d) return 0;
    if (w < b) { const u = (w - a) / (b - a); return Math.min(1.08, 1.08 * smoother(u * 1.15)); }
    if (w < c) return 1 + 0.08 * Math.exp(-(w - b) / 0.05);
    return 1 - smoother((w - c) / (d - c));
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
    // (and the zoom held by hand: a sway and a tremor, the lens not quite able to keep it)
    const z = zoomAt(w) > 0.05 ? Math.min(1, zoomAt(w)) : 0, h = 5 * z;
    return [a * Math.sin(t * 61) + h * (0.6 * Math.sin(t * 9.1) + 0.4 * Math.sin(t * 23.7 + 1)), a * Math.sin(t * 53 + 1) + h * (0.7 * Math.sin(t * 7.3 + 2) + 0.3 * Math.sin(t * 19.1)), a * Math.sin(t * 47 + 2) + h * 0.3 * Math.sin(t * 11.3)];
  };
  const callAt = w => { const c = lensAt(w), d = c.aim.clone().sub(c.eye).normalize(); return c.eye.clone().addScaledVector(d, 120).toArray(); };

  // ================================================================ each frame
  const underCol = new THREE.Color(0xc8861e), skyFog = new THREE.FogExp2(0xf6b47a, 0.00034), underFog = new THREE.FogExp2(0xb07418, 0.004);
  const stage = (t, { w }) => {
    const out = w >= T.swap;
    // (the room and the sky trade places at the gleam's peak)
    for (const o of theirs) o.visible = !out;
    overhead.forEach(m => { m.visible = false; });
    dice.forEach((d, i) => { const p = dicePose(i, w); d.visible = !out && p.on; d.position.set(p.p[0], p.p[1], p.p[2]); d.rotation.set(p.r[0], p.r[1], p.r[2]); });
    sky.visible = out;
    const lens = lensAt(w), below = lens.eye.y < SEA + 2;
    placePhoto(w, lens);
    scene.fog = out ? (below ? underFog : skyFog) : fog0;
    scene.background = out ? (below ? underCol : null) : bg0;
    scene.environment = out ? skyEnv : env0;
    if (out) {
      poseJet(w); poseBills(w);
      seaU.uT.value = w; if (w >= byLand[0].land - 0.02) paintGold(w);
      poseSplashes(w, goldAt); poseSpray(w, goldAt);
    }
    // (under the gold: its own light and the bubbles, about the lens)
    under.dome.visible = under.bubbles.visible = out && below;
    if (out && below) {
      under.dome.position.copy(lens.eye); under.bubbles.position.copy(lens.eye);
      under.poseAt(w);
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
  sfx.push({ t: Rw(T.whip - 0.05), kind: 'whoosh' });
  // (the dice clicking together as they leave the hand)
  [0, 0.03, 0.07].forEach(k => sfx.push({ t: Rw(THROW[0]) + k, kind: 'rattle' }));
  [[1.42, 150], [1.72, 110], [2.0, 200]].forEach(([w, sp]) => sfx.push({ t: Rw(w), kind: w === 2.0 ? 'wall' : 'felt', speed: sp, rate: warp.rateAt(Rw(w)) }));
  // The music: "Wild" (tracks.mjs) - the bed over the photograph, the build
  // from the throw into the crash zoom, the music sinking under the jet's
  // pass and back on the beat after it, the biggest hit on the title.
  // (Real seconds, on the grid set with the plan: the music keeps its time
  // through the slow motion.)
  // (the shot's own music runs to the first bar after its end; from there
  // the intro loops the groove on - see groove, below)
  const G = bz + 4 * Math.ceil((Rw(T.end) - at(bz)) / (4 * BEAT));
  // (the jet is the drop: the music sinks away under its pass and comes back
  // on the beat - every other one - just after it has gone over)
  const back = Math.min(nb - 6, bz + 2 * Math.ceil((Rw(T.jet) + 0.45 - at(bz)) / (2 * BEAT)));
  sfx.push(...wildBeat({ at, BEAT, first: -Math.ceil(Rs / BEAT), drop: bz, back, title: nb, end: at(G), build: Rw(T.whip) }));
  sfx.sort((a, b) => a.t - b.t);

  const warmAt = [Rw(T.swap) + 0.05, Rw(T.jet), Rw(T.gold[1]), Rw(T.dive[1]) + 0.1];
  const dispose = () => {
    for (const o of theirs) o.visible = true;
    overhead.forEach(m => { m.visible = true; });
    scene.fog = fog0; scene.background = bg0; scene.environment = env0;
    scene.remove(photo.card, sky, flare.card, ...dice, ...flung);
    made.geos.forEach(g => g.dispose()); made.mats.forEach(m => m.dispose()); made.texs.forEach(t => t.dispose());
  };
  return {
    plan, camera, gleamAt, shakeAt, stage, callAt, sfx, warmAt, dispose,
    // (the music carried on past the shot: from the bar its own ends on)
    groove: Object.assign(wildGroove({ BEAT, bar0: (G - bz) / 4 }), { from: at(G) }),
    tierNames: TIER_NAMES,
    moments: { whip: Rw(T.whip), zoom: Rw(T.zoom[0] + 0.3), over: Rw(T.over), swap: Rw(T.swap), jet: Rw(T.jet), rain: Rw(T.rain[0] + 0.5), down: Rw(T.down), gold: Rw(T.gold[1]), dive: Rw(T.dive[0] + 0.8), under: Rw(T.dive[1] + 0.1), call: Rw(T.call + 0.4), reveal: plan.revealReal, end: plan.totalReal },
    pieces: { photo: photo.card, jet, sea, bills }
  };
}
