// The likeness: the house's own figure, after its maker - a man's head in
// painted bisque with glass eyes, copper ringlets to the collar, a close red
// beard, over a velvet coat and an open shirt. The same craft as the Writer
// (built from code, nothing loaded), and posable, so any scene that needs a
// person at the table - a dealer, the dice thrower - can seat him.
//
// makeLikeness(THREE, { seed }) -> { group, body, neck, head, eyes, dispose }
// Units: the head is about 15 wide and 19 tall; the group's origin is the
// base of the neck, the head's pivot is `neck`, and he faces +z.

const TAU = Math.PI * 2;
const clamp01 = x => Math.min(Math.max(x, 0), 1);
const smoother = x => { x = clamp01(x); return x * x * x * (x * (6 * x - 15) + 10); };
const lerp = (a, b, k) => a + (b - a) * k;
const gauss = (x, y, cx, cy, sx, sy) => Math.exp(-(((x - cx) / sx) ** 2) - (((y - cy) / sy) ** 2));
const mkRng = s => { for (let k = 0; k < 3; k++) { s = Math.imul(s ^ (s >>> 15), 0x2c1b3c6d) >>> 0; s = Math.imul(s ^ (s >>> 12), 0x297a2d39) >>> 0; } return () => { s = (Math.imul(s, 1664525) + 1013904223) >>> 0; s ^= s >>> 16; return (s >>> 0) / 4294967296; }; };

// The head's half-sizes; the neck's pivot under it; the eyes' openings in
// the face's own plane (x, y on the unit sphere, seen from the front).
export const HEAD = { rx: 7.9, ry: 9.4, rz: 8.6, up: 8.2, fwd: 0.6 };
const EYE = { x: 0.3, y: 0.0, w: 0.15, h: 0.054, r: 1.25 };

// The face's relief, on the unit sphere, in front: a man's - a full round
// face, a straight nose with a soft round tip, the brow's ridge, the cheeks
// lifted by a smile, a closed mouth turned up at its corners.
const relief = (x, y) => {
  let dz = 0;
  // the brow and its ridge over each eye; the orbits
  dz += 0.05 * gauss(x, y, 0, 0.24, 0.55, 0.12);
  dz += 0.065 * (gauss(x, y, 0.27, 0.11, 0.18, 0.05) + gauss(x, y, -0.27, 0.11, 0.18, 0.05));
  dz -= 0.13 * (gauss(x, y, EYE.x, EYE.y, 0.15, 0.1) + gauss(x, y, -EYE.x, EYE.y, 0.15, 0.1));
  // the nose: a straight bridge from between the eyes, a round tip, its wings
  dz += 0.16 * gauss(x, 0, 0, 0, 0.07, 1) * clamp01((0.08 - y) / 0.2) * clamp01((y + 0.33) / 0.06);
  dz += 0.11 * gauss(x, y, 0, -0.28, 0.09, 0.065);
  dz += 0.07 * (gauss(x, y, 0.09, -0.31, 0.055, 0.045) + gauss(x, y, -0.09, -0.31, 0.055, 0.045));
  dz -= 0.06 * (gauss(x, y, 0.055, -0.338, 0.025, 0.017) + gauss(x, y, -0.055, -0.338, 0.025, 0.017));
  // the cheeks: full, and lifted - the smile's apples, and the fold beside the mouth
  dz += 0.24 * (gauss(x, y, 0.4, -0.22, 0.32, 0.27) + gauss(x, y, -0.4, -0.22, 0.32, 0.27));
  const side = 1 - smoother((Math.abs(x) - 0.55) / 0.2);
  dz += 0.1 * side * (gauss(x, y, 0.5, -0.06, 0.17, 0.12) + gauss(x, y, -0.5, -0.06, 0.17, 0.12));
  dz -= 0.04 * side * (gauss(x, y, 0.62, 0.22, 0.12, 0.12) + gauss(x, y, -0.62, 0.22, 0.12, 0.12));
  dz += 0.07 * (gauss(x, y, 0.26, -0.3, 0.11, 0.09) + gauss(x, y, -0.26, -0.3, 0.11, 0.09));
  for (let k = 0; k < 4; k++) { const t = k / 3, fx = lerp(0.15, 0.25, t), fy = lerp(-0.33, -0.52, t); dz -= 0.022 * (gauss(x, y, fx, fy, 0.025, 0.04) + gauss(x, y, -fx, fy, 0.025, 0.04)); }
  // the philtrum; the lips; the line between them, its corners turned up
  dz -= 0.018 * gauss(x, y, 0, -0.4, 0.02, 0.035);
  dz += 0.05 * gauss(x, y, 0, -0.45, 0.19, 0.03);
  dz += 0.055 * gauss(x, y, 0, -0.56, 0.16, 0.035);
  // (the open smile: the mouth's opening set back, the teeth inside it)
  dz -= 0.035 * Math.exp(-((x / 0.17) ** 4)) * Math.exp(-(((y - (-0.505 + 0.06 * (x / 0.17) ** 2)) / 0.03) ** 2));
  // the chin, and the turn under it to the neck
  dz += 0.08 * gauss(x, y, 0, -0.72, 0.2, 0.1);
  dz -= 0.05 * gauss(x, y, 0, -0.9, 0.3, 0.07);
  return dz;
};
const unitZ = (x, y) => Math.sqrt(Math.max(0, 1 - x * x - y * y));
// (the head's shape from the unit sphere: the jaw a little narrower than the
// cheeks, the face's relief laid on in front)
const shape = (x, y, z) => {
  const jaw = clamp01((-y - 0.15) / 0.85), fr = clamp01(z * 1.6);
  const X = x * (1 - 0.11 * Math.pow(jaw, 1.6)), Z = z * (1 - 0.07 * jaw) + relief(x, y) * fr;
  return [X * HEAD.rx, y * HEAD.ry, Z * HEAD.rz];
};
// (the beard: where it grows on the face's plane - the jaw and chin, up the
// cheeks to the sideburns, the moustache over the lip, the lips kept bare)
const beardAt = (x, y) => {
  const ax = Math.abs(x);
  const cheek = lerp(-0.37, -0.04, smoother((ax - 0.26) / 0.5));
  let m = smoother((cheek - y) / 0.08);
  const mous = smoother((0.29 - ax) / 0.05) * smoother((y + 0.44) / 0.02) * smoother((-0.355 - y) / 0.03);
  m = Math.max(m, mous * 0.9);
  const lips = Math.exp(-((x / 0.21) ** 4)) * smoother((0.07 - Math.abs(y + 0.505)) / 0.02);
  return clamp01(m * (1 - lips));
};

export function makeLikeness(THREE, opts = {}) {
  const rng = mkRng(((opts.seed || 1) ^ 0x6c1fe5) >>> 0);
  const V = (x = 0, y = 0, z = 0) => new THREE.Vector3(x, y, z);
  const made = { geos: [], mats: [], texs: [] };
  const keep = (g, m, t) => { if (g) made.geos.push(g); if (m) made.mats.push(m); if (t) made.texs.push(t); };
  const mesh = (g, m, parent, cast = true) => { const x = new THREE.Mesh(g, m); x.castShadow = cast; x.receiveShadow = true; keep(g, m); parent.add(x); return x; };
  const canvas = (w, h, paint) => { const c = document.createElement('canvas'); c.width = w; c.height = h; paint(c.getContext('2d'), w, h); return c; };
  const texOf = (c, srgb = true) => { const t = new THREE.CanvasTexture(c); t.colorSpace = srgb ? THREE.SRGBColorSpace : THREE.NoColorSpace; t.anisotropy = 8; keep(null, null, t); return t; };

  const group = new THREE.Group();
  const body = new THREE.Group(); group.add(body);
  const neck = new THREE.Group(); body.add(neck);
  const head = new THREE.Group(); head.position.set(0, HEAD.up, HEAD.fwd); head.rotation.order = 'YXZ'; neck.add(head);

  // (a point on the face and its normal, from the face's plane)
  const surf = (x, y, lift = 0) => {
    const p = V(...shape(x, y, unitZ(x, y))), e = 0.004;
    const a = V(...shape(x + e, y, unitZ(x + e, y))).sub(V(...shape(x - e, y, unitZ(x - e, y))));
    const b = V(...shape(x, y + e, unitZ(x, y + e))).sub(V(...shape(x, y - e, unitZ(x, y - e))));
    const n = V().crossVectors(a, b).normalize();
    return { p: p.addScaledVector(n, lift), n };
  };
  // (inside the skull: for keeping hair out of it)
  const inSkull = (p, k) => (p.x / (HEAD.rx * k)) ** 2 + ((p.y - 0.4) / (HEAD.ry * k)) ** 2 + (p.z / (HEAD.rz * k)) ** 2;

  // ---- The face, painted.
  const FS = 1024, P = (x, y) => [(0.5 + x * 0.5) * FS, (0.5 - y * 0.5) * FS];
  const almondPts = s => {
    const [cx, cy] = P(s * EYE.x, EYE.y), rx = EYE.w * FS / 2, ry = EYE.h * FS / 2;
    // (a smiling eye: the lower lid lifted and straighter, the upper a long arch)
    return { cx, cy, rx, ry, upper: [cx - rx, cy + ry * 0.15, cx - rx * 0.55, cy - ry * 1.3, cx + rx * 0.5, cy - ry * 1.3, cx + rx, cy + ry * 0.05], lower: [cx + rx, cy + ry * 0.05, cx + rx * 0.5, cy + ry * 0.75, cx - rx * 0.5, cy + ry * 0.8, cx - rx, cy + ry * 0.15] };
  };
  const almond = (c, s) => { const a = almondPts(s); c.beginPath(); c.moveTo(a.upper[0], a.upper[1]); c.bezierCurveTo(...a.upper.slice(2)); c.bezierCurveTo(...a.lower.slice(2)); c.closePath(); };
  const rf = mkRng(0x2ed5a1);
  const face = canvas(FS, FS, c => {
    c.fillStyle = '#e0a086'; c.fillRect(0, 0, FS, FS);
    const blob = (x, y, rx, ry, col) => { const [px, py] = P(x, y); const gr = c.createRadialGradient(px, py, 0, px, py, rx * FS / 2); gr.addColorStop(0, col); gr.addColorStop(1, 'rgba(0,0,0,0)'); c.save(); c.translate(px, py); c.scale(1, ry / rx); c.translate(-px, -py); c.fillStyle = gr; c.beginPath(); c.arc(px, py, rx * FS / 2, 0, TAU); c.fill(); c.restore(); };
    // (fair skin, warm and uneven: a fine speckle, a few faint freckles, the
    // slow patches of living skin)
    for (let k = 0; k < 8000; k++) { const px = rf() * FS, py = rf() * FS; c.fillStyle = rf() < 0.5 ? 'rgba(196,112,96,0.08)' : rf() < 0.5 ? 'rgba(150,96,70,0.06)' : 'rgba(250,214,196,0.08)'; c.beginPath(); c.arc(px, py, 0.8 + rf() * 1.6, 0, TAU); c.fill(); }
    for (let k = 0; k < 120; k++) { const x = (rf() * 2 - 1) * 0.6, y = 0.1 - rf() * 0.4; blob(x, y, 0.012 + rf() * 0.01, 0.012 + rf() * 0.01, 'rgba(186,104,70,0.22)'); }
    for (let k = 0; k < 100; k++) { const x = (rf() * 2 - 1) * 0.9, y = (rf() * 2 - 1) * 0.9; blob(x, y, 0.07 + rf() * 0.2, 0.06 + rf() * 0.16, rf() < 0.5 ? 'rgba(220,116,100,0.1)' : 'rgba(240,206,186,0.1)'); }
    // (the hollows in shade, the high places in light; the cheeks, the nose's
    // tip and the lids rosy, as a fair face is)
    [-1, 1].forEach(s => {
      blob(s * 0.3, 0.0, 0.34, 0.16, 'rgba(150,92,82,0.26)');
      blob(s * 0.68, 0.1, 0.3, 0.3, 'rgba(150,98,86,0.2)');
      blob(s * 0.42, -0.2, 0.32, 0.2, 'rgba(226,112,100,0.3)');
      blob(s * 0.36, -0.16, 0.16, 0.1, 'rgba(255,232,214,0.16)');
      blob(s * EYE.x, EYE.y - 0.1, 0.2, 0.05, 'rgba(130,104,140,0.18)');
      blob(s * EYE.x, EYE.y + 0.07, 0.2, 0.07, 'rgba(212,128,118,0.22)');
      blob(s * 0.1, -0.15, 0.05, 0.2, 'rgba(160,98,86,0.2)');
      blob(s * 0.12, -0.31, 0.04, 0.06, 'rgba(130,70,64,0.32)');
    });
    blob(0, 0.45, 0.6, 0.18, 'rgba(255,236,222,0.12)');
    // (the face turning away: the temples, the sides of the forehead and the
    // jaw's edge warmer and darker, so the form reads round and not as a plate)
    { const [cx, cy] = P(0, -0.05), gr = c.createRadialGradient(cx, cy, FS * 0.22, cx, cy, FS * 0.5); gr.addColorStop(0, 'rgba(150,70,50,0)'); gr.addColorStop(0.6, 'rgba(150,70,50,0.22)'); gr.addColorStop(1, 'rgba(120,52,38,0.55)'); c.fillStyle = gr; c.fillRect(0, 0, FS, FS); }
    [-1, 1].forEach(s => blob(s * 0.66, 0.3, 0.22, 0.3, 'rgba(130,70,58,0.28)'));
    blob(0, -0.14, 0.04, 0.18, 'rgba(255,240,226,0.2)');
    blob(0, -0.27, 0.07, 0.05, 'rgba(230,120,110,0.34)');
    blob(0, -0.26, 0.04, 0.03, 'rgba(255,240,230,0.26)');
    [-1, 1].forEach(s => { blob(s * 0.055, -0.338, 0.04, 0.024, 'rgba(80,32,34,0.85)'); });
    // (each lid's crease, a soft shade over the opening; the opening's edge)
    c.save(); c.filter = 'blur(5px)';
    [-1, 1].forEach(s => { const a = almondPts(s); c.strokeStyle = 'rgba(156,96,86,0.42)'; c.lineWidth = 9; c.beginPath(); c.moveTo(a.upper[0], a.upper[1] - a.ry * 0.7); c.bezierCurveTo(a.upper[2], a.upper[3] - a.ry * 0.8, a.upper[4], a.upper[5] - a.ry * 0.8, a.upper[6], a.upper[7] - a.ry * 0.7); c.stroke(); });
    c.restore();
    [-1, 1].forEach(s => { c.strokeStyle = 'rgba(146,88,80,0.45)'; c.lineWidth = 5; almond(c, s); c.stroke(); });
    // (the smile's lines at the eyes' corners, faint)
    c.lineCap = 'round';
    [-1, 1].forEach(s => { for (let k = 0; k < 3; k++) { const [x0, y0] = P(s * (EYE.x + EYE.w + 0.02), EYE.y - 0.01 - k * 0.025); c.strokeStyle = 'rgba(160,96,86,0.18)'; c.lineWidth = 2.5; c.beginPath(); c.moveTo(x0, y0); c.lineTo(x0 + s * 22, y0 - 4 + k * 6); c.stroke(); } });
    // the mouth: open in a broad smile - the upper teeth showing under a thin
    // upper lip, the lower lip full, the corners lifted into the cheeks
    const mw = 0.18, up = x => -0.505 + 0.06 * (x / mw) ** 2, cw = x => Math.cos(Math.min(1, Math.abs(x) / mw) * Math.PI / 2);
    const band = (top, bot, fill, n = 24) => { c.fillStyle = fill; c.beginPath(); for (let k = 0; k <= n; k++) { const x = -mw + 2 * mw * k / n; c.lineTo(...P(x, top(x))); } for (let k = n; k >= 0; k--) { const x = -mw + 2 * mw * k / n; c.lineTo(...P(x, bot(x))); } c.closePath(); c.fill(); };
    band(x => up(x) + 0.024 * cw(x), x => up(x) - 0.036 * cw(x), '#3a1214');
    band(x => up(x) + 0.024 * cw(x), x => up(x) - 0.012 * cw(x) ** 0.5, '#efe6d4');
    c.strokeStyle = 'rgba(150,120,100,0.5)'; c.lineWidth = 1.5;
    for (let k = -3; k <= 3; k++) { const x = k * 0.032 + (k ? Math.sign(k) * 0.006 : 0); if (Math.abs(x) > mw * 0.8) continue; c.beginPath(); c.moveTo(...P(x, up(x) + 0.022 * cw(x))); c.lineTo(...P(x, up(x) - 0.01 * cw(x))); c.stroke(); }
    blob(0, -0.51, 0.16, 0.02, 'rgba(90,40,40,0.25)');
    band(x => up(x) + (0.024 + 0.026 * cw(x)) * cw(x) ** 0.3, x => up(x) + 0.024 * cw(x), '#b96c6a');
    band(x => up(x) - 0.036 * cw(x), x => up(x) - (0.036 + 0.042 * cw(x)) * cw(x) ** 0.3, '#c98282');
    blob(0.01, -0.565, 0.06, 0.014, 'rgba(255,226,222,0.3)');
    [-1, 1].forEach(s => blob(s * mw, up(mw), 0.03, 0.022, 'rgba(110,52,52,0.45)'));
    // the brows: light, red-gold, the hairs laid up and out then along
    const bx = t => 0.12 + 0.36 * t, by = t => 0.135 + 0.035 * Math.sin(t * Math.PI * 0.9) - 0.04 * t;
    c.save(); c.filter = 'blur(4px)'; c.strokeStyle = 'rgba(140,76,44,0.34)'; c.lineWidth = 11;
    [-1, 1].forEach(s => { c.beginPath(); for (let k = 0; k <= 12; k++) { const t = k / 12, [px, py] = P(s * bx(t), by(t)); if (k) c.lineTo(px, py); else c.moveTo(px, py); } c.stroke(); });
    c.restore();
    [-1, 1].forEach(s => {
      for (let k = 0; k < 300; k++) {
        const t = Math.min(0.995, Math.max(0.005, k / 299 + (rf() - 0.5) * 0.01)), thick = 0.012 + 0.026 * Math.sin(Math.min(1, t * 1.15) * Math.PI) ** 0.7;
        const [px, py] = P(s * bx(t) + (rf() - 0.5) * 0.006, by(t) + (rf() - 0.5) * thick), [qx, qy] = P(s * bx(Math.min(1, t + 0.01)), by(Math.min(1, t + 0.01)));
        let dx = (qx - px) * s, dy = qy - py; const dl = Math.hypot(dx, dy) || 1; dx /= dl; dy /= dl;
        const turn = (1 - t) * -0.6 + t * t * 0.5 + (rf() - 0.5) * 0.3, cs = Math.cos(turn), sn = Math.sin(turn), ex = dx * cs - dy * sn, ey = dx * sn + dy * cs, len = 12 + rf() * 8;
        c.strokeStyle = `rgba(${124 + Math.round(rf() * 36)},${62 + Math.round(rf() * 24)},${34 + Math.round(rf() * 14)},${0.4 + 0.4 * rf()})`; c.lineWidth = 1.1 + 0.8 * rf();
        c.beginPath(); c.moveTo(px, py); c.quadraticCurveTo(px + s * ex * len * 0.5, py + ey * len * 0.5 - 1.5, px + s * ex * len, py + ey * len); c.stroke();
      }
    });
    // the beard's ground: the skin under it red-brown, so the gaps between the
    // curls read as more beard and never as bare skin
    const img = c.getImageData(0, 0, FS, FS), d = img.data;
    for (let py = 0; py < FS; py++) for (let px = 0; px < FS; px++) {
      const x = (px / FS - 0.5) * 2, y = (0.5 - py / FS) * 2, m = beardAt(x, y);
      if (m <= 0.01) continue;
      const i = (py * FS + px) * 4, n = 0.85 + 0.3 * (((px * 7919 + py * 104729) % 97) / 97);
      d[i] = lerp(d[i], 128 * n, m * 0.85); d[i + 1] = lerp(d[i + 1], 58 * n, m * 0.85); d[i + 2] = lerp(d[i + 2], 30 * n, m * 0.85);
    }
    c.putImageData(img, 0, 0);
  });
  const cut = canvas(FS, FS, c => { c.fillStyle = '#fff'; c.fillRect(0, 0, FS, FS); c.fillStyle = '#000'; [-1, 1].forEach(s => { almond(c, s); c.fill(); }); });
  const skinBase = { roughness: 0.6, specularIntensity: 0.3, sheen: 0.2, sheenColor: new THREE.Color(0xffd0c0), sheenRoughness: 0.5 };
  const skin = new THREE.MeshPhysicalMaterial(Object.assign({ map: texOf(face), alphaMap: texOf(cut, false), alphaTest: 0.5, emissive: 0xffffff, emissiveIntensity: 0.16 }, skinBase));
  skin.emissiveMap = skin.map;
  // (fair skin is lit through at its thin edges - a warm red at the grazing rim)
  skin.customProgramCacheKey = () => 'likeness-skin';
  skin.onBeforeCompile = sh => {
    sh.fragmentShader = sh.fragmentShader.replace('#include <opaque_fragment>', `
      {
        float ndv = clamp(dot(normal, normalize(vViewPosition)), 0.0, 1.0);
        outgoingLight += diffuseColor.rgb * vec3(1.0, 0.3, 0.18) * pow(1.0 - ndv, 2.2) * 0.5;
        outgoingLight = max(outgoingLight, diffuseColor.rgb * (0.7 + 0.3 * ndv) * 0.5);
      }
      #include <opaque_fragment>`);
  };
  {
    const g = new THREE.SphereGeometry(1, 240, 180), p = g.attributes.position, uv = g.attributes.uv;
    for (let i = 0; i < p.count; i++) {
      const x = p.getX(i), y = p.getY(i), z = p.getZ(i);
      p.setXYZ(i, ...shape(x, y, z));
      uv.setXY(i, 0.5 + x * 0.5, 0.5 + y * 0.5);
    }
    g.computeVertexNormals();
    mesh(g, skin, head);
  }

  // ---- The eyes: glass over a painted iris, a light grey-blue; lids of
  // bisque over them, the lash line painted.
  const eyes = [];
  {
    const TS = 512;
    const iris = texOf(canvas(TS, TS, c => {
      c.fillStyle = '#ece2d6'; c.fillRect(0, 0, TS, TS);
      const cx = TS * 0.25, cy = TS / 2, R = TS * 0.076;
      c.save(); c.translate(cx, cy); c.scale(1, 2); c.translate(-cx, -cy);
      const gr = c.createRadialGradient(cx, cy, 0, cx, cy, R);
      gr.addColorStop(0, '#060606'); gr.addColorStop(0.3, '#060606'); gr.addColorStop(0.36, '#5a5a3c'); gr.addColorStop(0.5, '#7c8f8a'); gr.addColorStop(0.8, '#8fa3ae'); gr.addColorStop(0.93, '#4a5866'); gr.addColorStop(1, 'rgba(236,226,214,0)');
      c.fillStyle = gr; c.beginPath(); c.arc(cx, cy, R, 0, TAU); c.fill();
      c.strokeStyle = 'rgba(220,230,226,0.25)'; c.lineWidth = 1;
      for (let k = 0; k < 60; k++) { const a = (k / 60) * TAU; c.beginPath(); c.moveTo(cx + Math.cos(a) * R * 0.38, cy + Math.sin(a) * R * 0.38); c.lineTo(cx + Math.cos(a) * R * 0.9, cy + Math.sin(a) * R * 0.9); c.stroke(); }
      const wg = c.createRadialGradient(cx, cy, R * 1.05, cx, cy, R * 3.6);
      wg.addColorStop(0, 'rgba(150,90,80,0)'); wg.addColorStop(0.5, 'rgba(150,90,80,0.14)'); wg.addColorStop(1, 'rgba(150,90,80,0.55)');
      c.fillStyle = wg; c.beginPath(); c.arc(cx, cy, R * 3.6, 0, TAU); c.fill();
      c.restore();
      const sg = c.createLinearGradient(0, TS * 0.41, 0, TS * 0.59);
      sg.addColorStop(0, 'rgba(96,60,52,0.6)'); sg.addColorStop(0.35, 'rgba(96,60,52,0.16)'); sg.addColorStop(0.5, 'rgba(96,60,52,0)'); sg.addColorStop(1, 'rgba(96,60,52,0.25)');
      c.fillStyle = sg; c.fillRect(0, 0, TS, TS);
    }));
    const eyeM = new THREE.MeshPhysicalMaterial({ map: iris, roughness: 0.05, clearcoat: 1, clearcoatRoughness: 0.02 });
    const eg = new THREE.SphereGeometry(EYE.r, 48, 32);
    const sockM = new THREE.MeshStandardMaterial({ color: 0x9a7068, roughness: 0.7, side: THREE.BackSide, polygonOffset: true, polygonOffsetFactor: 4, polygonOffsetUnits: 8 });
    const sockG = new THREE.SphereGeometry(EYE.r + 0.3, 24, 16);
    keep(eg, eyeM); keep(sockG, sockM);
    const lidG = new THREE.SphereGeometry(EYE.r + 0.06, 40, 16, 0, TAU, 0, 1.2), lidM = new THREE.MeshPhysicalMaterial(Object.assign({ color: 0xdca088, side: THREE.DoubleSide }, skinBase)); keep(lidG, lidM);
    [-1, 1].forEach(s => {
      const ux = s * EYE.x, uy = EYE.y, zs = unitZ(ux, uy) + relief(ux, uy);
      const socket = new THREE.Group(); socket.position.set(ux * HEAD.rx, uy * HEAD.ry, zs * HEAD.rz - EYE.r + 0.4); head.add(socket);
      socket.add(new THREE.Mesh(sockG, sockM));
      const eye = new THREE.Mesh(eg, eyeM); eye.rotation.order = 'YXZ'; socket.add(eye); eyes.push(eye);
      // (the upper lid: a shell of skin over the ball's top, so the eye looks out from under it)
      const lid = new THREE.Mesh(lidG, lidM); lid.rotation.x = 0.12; socket.add(lid);
    });
    // (the opening's edges: the upper lid's fold and lash line, the lower lid's rim)
    const bez = (q, t) => { const u = 1 - t; return [u * u * u * q[0] + 3 * u * u * t * q[2] + 3 * u * t * t * q[4] + t * t * t * q[6], u * u * u * q[1] + 3 * u * u * t * q[3] + 3 * u * t * t * q[5] + t * t * t * q[7]]; };
    const onFace = (px, py, out) => surf((px / FS - 0.5) * 2, (0.5 - py / FS) * 2, out).p;
    const upM = new THREE.MeshStandardMaterial({ color: 0xd9a088, roughness: 0.55 });
    const lashM = new THREE.MeshStandardMaterial({ color: 0x6a3a22, roughness: 0.7 });
    const loM = new THREE.MeshPhysicalMaterial({ color: 0xd99c8c, roughness: 0.3, clearcoat: 0.8, clearcoatRoughness: 0.15 });
    keep(null, upM); keep(null, lashM); keep(null, loM);
    [-1, 1].forEach(s => {
      const a = almondPts(s);
      const up = Array.from({ length: 21 }, (_, k) => onFace(...bez(a.upper, k / 20), 0.03));
      const lash = Array.from({ length: 21 }, (_, k) => onFace(...bez(a.upper, k / 20), 0.1));
      const lo = Array.from({ length: 21 }, (_, k) => onFace(...bez(a.lower, k / 20), 0.0));
      mesh(new THREE.TubeGeometry(new THREE.CatmullRomCurve3(up), 40, 0.13, 8, false), upM, head);
      mesh(new THREE.TubeGeometry(new THREE.CatmullRomCurve3(lash), 40, 0.06, 6, false), lashM, head);
      mesh(new THREE.TubeGeometry(new THREE.CatmullRomCurve3(lo), 40, 0.07, 8, false), loM, head);
    });
  }

  // ---- Hair: one builder for every lock - a spine that leaves the scalp,
  // falls under its weight and keeps off the head and the shoulders, a helix
  // wound round it, and two or three tapered strands along the helix, each
  // section lobed and twisting so a lock reads as hair and not as a tube.
  const HP = [], HN = [], HC = [], HI = [], HU = [];
  const cc = new THREE.Color(), SD = V(), Nn = V(), T = V();
  const lock = (root, n, dir, o) => {
    const { len, rad, turns, tube, strands, root: cR, tip: cT, M, KR, fall, keepOff } = o;
    const spine = [root.clone()], p = root.clone(), d = dir.clone().normalize(), step = len / M, DOWN = V(0, -1, 0);
    for (let j = 1; j <= M; j++) {
      d.lerp(DOWN, fall * (j / M)).normalize();
      p.addScaledVector(d, step);
      if (keepOff) keepOff(p);
      spine.push(p.clone());
    }
    const ref = Math.abs(dir.y) < 0.9 ? V(0, 1, 0) : V(1, 0, 0);
    const dirSign = rng() < 0.5 ? -1 : 1, ang0 = rng() * TAU;
    for (let si = 0; si < strands; si++) {
      const ph = ang0 + si * (TAU / strands) * 0.4 + (rng() - 0.5) * 0.3, Rs = rad * (0.8 + 0.35 * rng()), rt = tube * (0.75 + 0.45 * rng()), tu = turns * (0.94 + 0.12 * rng()), sh = 0.85 + 0.3 * rng();
      const pts = spine.map((q, j) => {
        const s = j / M, t2 = spine[Math.min(M, j + 1)].clone().sub(spine[Math.max(0, j - 1)]).normalize();
        const u = V().crossVectors(t2, ref).normalize(), w = V().crossVectors(t2, u), ang = ph + dirSign * s * tu * TAU, amp = Rs * smoother(s / 0.15) * (1 - 0.25 * s);
        return q.clone().addScaledVector(u, Math.cos(ang) * amp).addScaledVector(w, Math.sin(ang) * amp);
      });
      const base = HP.length / 3, tw0 = rng() * TAU, lobe = 0.06 + 0.06 * rng();
      for (let j = 0; j <= M; j++) {
        T.copy(pts[Math.min(M, j + 1)]).sub(pts[Math.max(0, j - 1)]).normalize();
        SD.crossVectors(T, n); if (SD.lengthSq() < 1e-4) SD.crossVectors(T, Math.abs(T.y) < 0.9 ? V(0, 1, 0) : V(1, 0, 0)); SD.normalize();
        Nn.crossVectors(SD, T).normalize();
        const s = j / M, rr0 = rt * (0.6 + 0.4 * smoother(s / 0.1)) * (1 - 0.9 * s ** 3) + 0.012, tw = tw0 + s * tu * TAU * 0.6;
        cc.copy(cR).lerp(cT, smoother(s / 0.6)).multiplyScalar(sh);
        for (let k = 0; k < KR; k++) {
          const th = (k / KR) * TAU, rr = rr0 * (1 + lobe * Math.cos(3 * th + tw)), cx = Math.cos(th), sx = Math.sin(th);
          HP.push(pts[j].x + (SD.x * cx + Nn.x * sx) * rr, pts[j].y + (SD.y * cx + Nn.y * sx) * rr, pts[j].z + (SD.z * cx + Nn.z * sx) * rr);
          HN.push(SD.x * cx + Nn.x * sx, SD.y * cx + Nn.y * sx, SD.z * cx + Nn.z * sx);
          const sv = 0.86 + 0.28 * Math.abs(Math.cos(1.5 * th + tw * 0.5));
          HC.push(cc.r * sv, cc.g * sv, cc.b * sv); HU.push(k / KR * 3, s * len * 1.4);
        }
      }
      for (let j = 0; j < M; j++) for (let k = 0; k < KR; k++) { const a = base + j * KR + k, b = base + j * KR + (k + 1) % KR, c = a + KR, e = b + KR; HI.push(a, c, b, b, c, e); }
    }
  };

  // (the hairline round the skull, as a height on the unit sphere for each
  // way round: high at the brow, down past the temples to the sideburns
  // where the beard meets it, low at the nape)
  const lineAt = az => {
    const a = Math.abs(((az + Math.PI) % TAU + TAU) % TAU - Math.PI);
    const front = 0.38 - 0.1 * (a / 0.6) ** 2, side = lerp(0.28, -0.25, smoother((a - 0.6) / 0.7)), back = lerp(-0.25, -0.62, smoother((a - 1.5) / 0.8));
    return a < 0.6 ? front : a < 1.5 ? side : back;
  };
  const RX = HEAD.rx * 1.03, RY = HEAD.ry * 1.02, RZ = HEAD.rz * 1.03;
  const scalp = (az, y) => { const r = Math.sqrt(Math.max(0, 1 - y * y)), x = Math.sin(az) * r, z = Math.cos(az) * r; return { x, y, z, p: V(x * RX, y * RY, z * RZ), n: V(x / RX, y / RY, z / RZ).normalize() }; };
  // the cap: the hair seen into, dark copper, over the skull from the hairline up
  {
    const AZN = 90, LAN = 30, pos = [], ids = [];
    for (let i = 0; i <= AZN; i++) {
      const az = (i / AZN) * TAU - Math.PI, la0 = lineAt(az), ph0 = Math.asin(la0);
      for (let j = 0; j <= LAN; j++) {
        const ph = lerp(ph0, Math.PI / 2, j / LAN), q = scalp(az, Math.sin(ph));
        // (where the face stands out past the hair's own sphere, the cap stands off with it)
        q.p.addScaledVector(q.n, (0.35 + Math.max(0, relief(q.x, q.y) * clamp01(q.z * 1.6) * HEAD.rz - 0.25)) * smoother(j / 3) - 0.15 * (1 - smoother(j / 3)));
        pos.push(q.p.x, q.p.y, q.p.z);
      }
    }
    for (let i = 0; i < AZN; i++) for (let j = 0; j < LAN; j++) { const a = i * (LAN + 1) + j, b = a + LAN + 1; ids.push(a, b, a + 1, a + 1, b, b + 1); }
    const uvs = []; for (let i = 0; i <= AZN; i++) for (let j = 0; j <= LAN; j++) uvs.push(i / AZN, j / LAN);
    const g = new THREE.BufferGeometry(); g.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3)); g.setAttribute('uv', new THREE.Float32BufferAttribute(uvs, 2)); g.setIndex(ids); g.computeVertexNormals();
    // (the cap carved in curls like the beard, so where it shows between the
    // locks it reads as more hair, never as a skull cap)
    const rc = mkRng(0xca9), CWc = 1024, CHc = 256;
    const col = canvas(CWc, CHc, c => { c.fillStyle = '#4a1c0a'; c.fillRect(0, 0, CWc, CHc); }), bmp = canvas(CWc, CHc, c => { c.fillStyle = '#606060'; c.fillRect(0, 0, CWc, CHc); });
    const c1 = col.getContext('2d'), c2 = bmp.getContext('2d');
    for (let k = 0; k < 7000; k++) {
      const px = rc() * CWc, py = rc() * CHc, r = 5 + 6 * rc(), a0 = rc() * TAU, sw = Math.PI * (1 + 0.6 * rc()), lt = 0.5 + 0.5 * rc();
      c2.lineWidth = r * 0.5; c2.strokeStyle = '#202020'; c2.beginPath(); c2.arc(px + 1.5, py + 1.5, r, a0, a0 + sw); c2.stroke();
      c2.lineWidth = r * 0.4; c2.strokeStyle = '#e0e0e0'; c2.beginPath(); c2.arc(px, py, r, a0, a0 + sw); c2.stroke();
      c1.lineWidth = r * 0.42; c1.strokeStyle = `rgb(${Math.round(150 * lt)},${Math.round(64 * lt)},${Math.round(28 * lt)})`; c1.beginPath(); c1.arc(px, py, r, a0, a0 + sw); c1.stroke();
    }
    const capM = new THREE.MeshPhysicalMaterial({ map: texOf(col), bumpMap: texOf(bmp, false), bumpScale: 2, roughness: 0.75, sheen: 0.4, sheenColor: new THREE.Color(0xa0502a), sheenRoughness: 0.6 });
    mesh(g, capM, head);
  }
  // the ringlets: long, loose, copper, from a part a little left of centre -
  // short and lifted at the crown, falling past the jaw at the sides and to
  // the collar behind; the brow kept clear, swept off to each side
  {
    const cRoot = new THREE.Color(0x260d05), cMid = new THREE.Color(0x5a2610), cTip = new THREE.Color(0x84421e), cLight = new THREE.Color(0xa06236), tmp = new THREE.Color();
    const PART = -0.12;
    const keepOff = p => {
      const k = inSkull(p, 1.04);
      if (k < 1) { const c = V(0, 0.4, 0), r = p.clone().sub(c); r.multiplyScalar(1 / Math.sqrt(Math.max(k, 0.05))); p.copy(c.add(r)); }
      // (off the face: nothing falls in front of the cheeks)
      if (p.z > HEAD.rz * 0.35 && p.y < HEAD.ry * 0.3) { const lim = HEAD.rx * 0.92, ax = Math.abs(p.x); if (ax < lim) p.x = Math.sign(p.x || 1) * lerp(ax, lim, 0.5); }
      // (off the shoulders: the hair lies on the coat)
      const sw = -HEAD.up - 0.6 - Math.max(0, Math.abs(p.x) - 5) * 0.34;
      if (p.y < sw && Math.abs(p.z) < 9 && Math.abs(p.x) < 18) p.y = sw;
    };
    const NL = opts.locks || 300;
    let madeL = 0, guard = 0;
    while (madeL < NL && guard++ < 30000) {
      const az = (rng() * 2 - 1) * Math.PI, la = lineAt(az), y = lerp(la + 0.02, 0.99, Math.pow(rng(), 0.8));
      const q = scalp(az, y);
      if (q.z > 0.55 && q.y < la + 0.06 && Math.abs(q.x) < 0.5) continue;
      const crown = smoother((q.y - 0.6) / 0.3), front = smoother((q.z - 0.3) / 0.5), sideS = Math.sign(q.x - PART) || 1;
      // (the way it leaves the scalp: away from the part, then down; at the
      // brow swept back and out to the side)
      const upT = V(0, 1, 0).addScaledVector(q.n, -q.n.y).normalize();
      const dir = V(sideS * lerp(0.12, 0.3, front), 0.1 * crown, 0).addScaledVector(upT, 0.9 * front).add(q.n.clone().multiplyScalar(0.15)).add(V(rng() - 0.5, rng() - 0.5, rng() - 0.5).multiplyScalar(0.3));
      const back = smoother((-q.z + 0.1) / 0.6);
      const len = lerp(lerp(8, 12, back), 5, crown * 0.6) * (0.75 + 0.5 * rng());
      const root = q.p.clone().addScaledVector(q.n, 0.05 + Math.max(0, relief(q.x, q.y) * clamp01(q.z * 1.6) * HEAD.rz - 0.25));
      tmp.copy(cMid).lerp(cLight, rng() * rng());
      lock(root, q.n, dir, { len, rad: 0.6 + 0.35 * rng(), turns: len * (0.2 + 0.06 * rng()), tube: 0.26 + 0.08 * rng(), strands: 3, root: cRoot, tip: rng() < 0.4 ? cTip : tmp, M: Math.max(14, Math.round(len * 2.6)), KR: 7, fall: 0.6 + 0.15 * rng(), keepOff });
      madeL++;
    }
  }
  // the beard: carved, as a figure-maker would cut it - a mass laid over
  // the jaw and chin and up to the sideburns, thickest at the chin, its
  // edge thinning into the skin; its face cut into small tight curls, and
  // a scatter of loose curls standing off it. The moustache combed down and
  // out over the lip's edge. Red-brown, lighter - nearly gold - at the chin.
  const beardTh = (x, y) => { const m = beardAt(x, y); if (m <= 0) return 0; const mouth = Math.exp(-((x / 0.22) ** 4)) * smoother((0.085 - Math.abs(y + 0.505)) / 0.03); return Math.pow(m, 0.6) * lerp(0.28, 0.75, smoother((-y - 0.6) / 0.35)) * (y > -0.44 && Math.abs(x) < 0.3 ? 0.85 : 1) * (1 - mouth); };
  {
    const GX = 150, GY = 120, X0 = -1, X1 = 1, Y0 = -1, Y1 = 0.12, pos = [], uv = [], ids = [], at = [];
    for (let j = 0; j <= GY; j++) for (let i = 0; i <= GX; i++) {
      let x = lerp(X0, X1, i / GX), y = lerp(Y0, Y1, j / GY);
      const r2 = x * x + y * y; if (r2 > 0.995) { const k = Math.sqrt(0.995 / r2); x *= k; y *= k; }
      const th = beardTh(x, y), { p } = surf(x, y, th - 0.06);
      at.push(th > 0.02 ? pos.length / 3 : -1); pos.push(p.x, p.y, p.z); uv.push(0.5 + x * 0.5, 0.5 + y * 0.5);
    }
    for (let j = 0; j < GY; j++) for (let i = 0; i < GX; i++) {
      const a = j * (GX + 1) + i, b = a + GX + 1;
      if (at[a] < 0 && at[a + 1] < 0 && at[b] < 0 && at[b + 1] < 0) continue;
      ids.push(a, a + 1, b, a + 1, b + 1, b);
    }
    const g = new THREE.BufferGeometry(); g.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3)); g.setAttribute('uv', new THREE.Float32BufferAttribute(uv, 2)); g.setIndex(ids); g.computeVertexNormals();
    // (the carving: small C-curls cut close, each a ridge lit on one side and
    // a groove dark on the other, laid the way the beard grows - down the
    // cheeks, down and out at the chin; the colour and the relief from the
    // same strokes, with the skin's edge let through where it thins)
    const BS = 1024, rb = mkRng(0xbea7d), Pb = (x, y) => [(0.5 + x * 0.5) * BS, (0.5 - y * 0.5) * BS];
    const col = canvas(BS, BS, c => { c.fillStyle = '#6a2e12'; c.fillRect(0, 0, BS, BS); });
    const bump = canvas(BS, BS, c => { c.fillStyle = '#606060'; c.fillRect(0, 0, BS, BS); });
    const cc2 = col.getContext('2d'), cb = bump.getContext('2d');
    cc2.lineCap = cb.lineCap = 'round';
    for (let k = 0; k < 16000; k++) {
      const x = rb() * 2 - 1, y = 0.12 - rb() * 1.12; if (beardAt(x, y) < 0.05) continue;
      const mous = y > -0.44 && Math.abs(x) < 0.3, [px, py] = Pb(x, y), r = (mous ? 4 : 4 + 4 * rb()) * (1 + 0.4 * smoother((-y - 0.6) / 0.3));
      const down = Math.atan2(-1, mous ? x * 3 : x * 0.5) , a0 = down + Math.PI * (0.3 + 0.5 * rb()) * (rb() < 0.5 ? 1 : -1), sweep = Math.PI * (mous ? 0.5 : 1.1 + 0.6 * rb());
      const gold = smoother((-y - 0.6) / 0.3) * rb(), lt = 0.55 + 0.45 * rb();
      const R = Math.round(lerp(lerp(110, 196, gold), 150, 0) * lt), G = Math.round(lerp(lerp(48, 120, gold), 60, 0) * lt), Bc = Math.round(lerp(lerp(22, 64, gold), 30, 0) * lt);
      if (mous) {
        const len = 18 + 10 * rb(), ex = px + Math.cos(down) * len, ey = py - Math.sin(down) * len;
        cc2.strokeStyle = `rgb(${Math.round(R * 1.25)},${Math.round(G * 1.25)},${Math.round(Bc * 1.2)})`; cc2.lineWidth = 3 + 2 * rb(); cc2.beginPath(); cc2.moveTo(px, py); cc2.lineTo(ex, ey); cc2.stroke();
        cb.strokeStyle = '#d0d0d0'; cb.lineWidth = 3; cb.beginPath(); cb.moveTo(px, py); cb.lineTo(ex, ey); cb.stroke();
        continue;
      }
      cb.strokeStyle = '#202020'; cb.lineWidth = r * 0.55; cb.beginPath(); cb.arc(px + 1.5, py + 1.5, r, -a0, -a0 + sweep); cb.stroke();
      cb.strokeStyle = '#e8e8e8'; cb.lineWidth = r * 0.42; cb.beginPath(); cb.arc(px, py, r, -a0, -a0 + sweep); cb.stroke();
      cc2.strokeStyle = 'rgba(30,10,4,0.55)'; cc2.lineWidth = r * 0.6; cc2.beginPath(); cc2.arc(px + 1.5, py + 1.5, r, -a0, -a0 + sweep); cc2.stroke();
      cc2.strokeStyle = `rgb(${R},${G},${Bc})`; cc2.lineWidth = r * 0.42; cc2.beginPath(); cc2.arc(px, py, r, -a0, -a0 + sweep); cc2.stroke();
    }
    const beardM = new THREE.MeshPhysicalMaterial({ map: texOf(col), bumpMap: texOf(bump, false), bumpScale: 2.2, roughness: 0.72, sheen: 0.5, sheenColor: new THREE.Color(0xc07040), sheenRoughness: 0.5 });
    mesh(g, beardM, head);
  }
  {
    const bRoot = new THREE.Color(0x3a1408), bTip = new THREE.Color(0x8a4020), bGold = new THREE.Color(0xb47a44), tip = new THREE.Color();
    const NB = opts.beard || 140;
    let mb = 0, guard = 0;
    while (mb < NB && guard++ < 60000) {
      const x = (rng() * 2 - 1) * 0.98, y = -0.05 - rng() * 0.93;
      if (x * x + y * y > 0.97 || (y > -0.62 && Math.abs(x) < 0.3)) continue;
      const m = beardAt(x, y); if (rng() > m * m) continue;
      const { p, n } = surf(x, y, beardTh(x, y) - 0.2);
      const dir = V(x * 0.4, -1, 0).addScaledVector(n, 0.9).add(V(rng() - 0.5, rng() - 0.5, rng() - 0.5).multiplyScalar(0.5));
      tip.copy(bTip).lerp(bGold, smoother((-y - 0.6) / 0.3) * rng());
      lock(p, n, dir, { len: 0.35 + 0.25 * rng(), rad: 0.16 + 0.06 * rng(), turns: 1.1 + 0.4 * rng(), tube: 0.09 + 0.03 * rng(), strands: 1, root: bRoot, tip, M: 7, KR: 6, fall: 0.1, keepOff: null });
      mb++;
    }
  }
  {
    const g = new THREE.BufferGeometry();
    g.setAttribute('position', new THREE.Float32BufferAttribute(HP, 3)); g.setAttribute('normal', new THREE.Float32BufferAttribute(HN, 3));
    g.setAttribute('color', new THREE.Float32BufferAttribute(HC, 3)); g.setAttribute('uv', new THREE.Float32BufferAttribute(HU, 2)); g.setIndex(HI); g.computeBoundingSphere();
    const grooveN = texOf(canvas(64, 64, (c, W, Hh) => { c.fillStyle = '#8080ff'; c.fillRect(0, 0, W, Hh); for (let k = 0; k < 10; k++) { const x0 = (k + 0.5) / 10 * W; c.fillStyle = '#a080ff'; c.fillRect(x0 - 2, 0, 2, Hh); c.fillStyle = '#6080ff'; c.fillRect(x0 + 0.5, 0, 2, Hh); } }), false);
    grooveN.wrapS = grooveN.wrapT = THREE.RepeatWrapping;
    const hairM = new THREE.MeshPhysicalMaterial({ vertexColors: true, roughness: 0.5, specularIntensity: 0.4, sheen: 0.45, sheenRoughness: 0.4, sheenColor: new THREE.Color(0xc0703c), normalMap: grooveN, normalScale: new THREE.Vector2(0.6, 0.6), side: THREE.DoubleSide });
    mesh(g, hairM, head);
  }

  // ---- The neck, and the body to the chest: a brown silk-velvet coat with
  // peaked lapels over a cream shirt open at the throat, its collar rolled
  // out over the lapels, a fine gold chain at the throat.
  {
    const g = new THREE.CylinderGeometry(3.5, 3.9, 9, 40, 6, true);
    const neckM = new THREE.MeshPhysicalMaterial(Object.assign({ color: 0xe0ac94 }, skinBase));
    keep(null, neckM);
    const m = mesh(g, neckM, neck); m.position.set(0, 3.2, -0.6); m.rotation.x = -0.12;
  }
  // (the torso's surface: a = the way round from the front, t = 0 at the
  // neck's base to 1 at the hem; its section a soft rounded rectangle)
  const TY = 0.6, TH = 30;
  const tW = t => lerp(4.4, 14.6, smoother(t / 0.3)) - 0.8 * smoother((t - 0.45) / 0.55), tD = t => lerp(4.2, 8.6, smoother(t / 0.3));
  const tTop = t => -lerp(0, 6.2, Math.pow(Math.min(t, 0.3) / 0.3, 1.6));
  const tS = (a, t, lift = 0) => {
    const ca = Math.cos(a), sa = Math.sin(a), pe = 0.85;
    const x = tW(t) * Math.sign(sa) * Math.abs(sa) ** pe, z = tD(t) * Math.sign(ca) * Math.abs(ca) ** pe + (ca > 0 ? 0.8 * ca * smoother((t - 0.3) / 0.3) : 0);
    const y = TY + (t < 0.3 ? tTop(t) : tTop(0.3) - (t - 0.3) / 0.7 * TH);
    const n = V(x / (tW(t) ** 2), t < 0.3 ? 0.6 * (1 - t / 0.3) : 0, z / (tD(t) ** 2)).normalize();
    return V(x, y, z).addScaledVector(n, lift);
  };
  const vee = v => 0.008 + 0.022 * smoother(v / 0.8);                                      // the shirt's half-width, as a turn, down the front
  const lap = v => vee(v) + 0.012 + 0.05 * Math.sin(Math.PI * clamp01(v / 0.86)) ** 0.7 * (1 - 0.35 * smoother((v - 0.08) / 0.1) * (1 - smoother((v - 0.2) / 0.06)));
  const coatMat = (map) => { const m = new THREE.MeshPhysicalMaterial({ map, color: map ? 0xffffff : 0x4e2616, roughness: 0.85, sheen: 1, sheenColor: new THREE.Color(0xb0703c), sheenRoughness: 0.45, side: THREE.DoubleSide }); keep(null, m); return m; };
  // (a patch laid on the torso: a grid over (a, t), lifted off it)
  const patch = (fa0, fa1, t0, t1, lift, mat, NA = 10, NT = 40, wall = 0) => {
    const pos = [], ids = [];
    for (let j = 0; j <= NT; j++) for (let i = 0; i <= NA; i++) { const t = lerp(t0, t1, j / NT), q = tS(lerp(fa0(t), fa1(t), i / NA) * TAU, t, typeof lift === 'function' ? lift(t, i / NA) : lift); pos.push(q.x, q.y, q.z); }
    for (let j = 0; j < NT; j++) for (let i = 0; i < NA; i++) { const a = j * (NA + 1) + i, b = a + NA + 1; ids.push(a, b, a + 1, a + 1, b, b + 1); }
    if (wall) {
      // (the outer edge's thickness, down to the coat)
      const o = pos.length / 3;
      for (let j = 0; j <= NT; j++) { const t = lerp(t0, t1, j / NT), q = tS(fa1(t) * TAU, t, 0); pos.push(q.x, q.y, q.z); }
      for (let j = 0; j < NT; j++) { const a = j * (NA + 1) + NA, b = a + NA + 1, c = o + j, d = c + 1; ids.push(a, c, b, b, c, d); }
    }
    const g = new THREE.BufferGeometry(); g.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3)); g.setIndex(ids); g.computeVertexNormals();
    return mesh(g, mat, body);
  };
  {
    const AN = 96, YN = 40, pos = [], uv = [], ids = [];
    for (let j = 0; j <= YN; j++) for (let i = 0; i <= AN; i++) { const q = tS((i / AN) * TAU, j / YN); pos.push(q.x, q.y, q.z); uv.push(i / AN + 0.5, j / YN); }
    for (let j = 0; j < YN; j++) for (let i = 0; i < AN; i++) { const a = j * (AN + 1) + i, b = a + AN + 1; ids.push(a, b, a + 1, a + 1, b, b + 1); }
    const g = new THREE.BufferGeometry(); g.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3)); g.setAttribute('uv', new THREE.Float32BufferAttribute(uv, 2)); g.setIndex(ids); g.computeVertexNormals();
    // (the coat painted: the pile's grain; the shirt's V, its placket and
    // two buttons; the throat's skin at its top)
    const CW = 1024, CH = 512, U = u => (0.5 + u) * CW;
    const coatTex = canvas(CW, CH, c => {
      c.fillStyle = '#4a2416'; c.fillRect(0, 0, CW, CH);
      for (let k = 0; k < 9000; k++) { c.fillStyle = rng() < 0.5 ? 'rgba(20,8,4,0.12)' : 'rgba(110,60,36,0.1)'; c.fillRect(rng() * CW, rng() * CH, 1 + rng() * 3, 1 + rng() * 6); }
      c.fillStyle = '#e8dcc2'; c.beginPath();
      for (let k = 0; k <= 40; k++) { const v = k / 40 * 0.9; c.lineTo(U(vee(v) + 0.004), v * CH); }
      for (let k = 40; k >= 0; k--) { const v = k / 40 * 0.9; c.lineTo(U(-vee(v) - 0.004), v * CH); }
      c.closePath(); c.fill();
      // (fine stripes in the shirting, and its folds in shade)
      c.strokeStyle = 'rgba(190,170,140,0.35)'; c.lineWidth = 1;
      for (let k = -14; k <= 14; k++) { c.beginPath(); c.moveTo(U(k * 0.0022), 0); c.lineTo(U(k * 0.0024), CH * 0.9); c.stroke(); }
      const sg = c.createLinearGradient(0, 0, 0, CH * 0.2); sg.addColorStop(0, 'rgba(226,166,142,1)'); sg.addColorStop(0.6, 'rgba(226,166,142,0.7)'); sg.addColorStop(1, 'rgba(226,166,142,0)');
      c.fillStyle = sg; c.beginPath(); c.moveTo(U(-0.03), 0); c.lineTo(U(0.03), 0); c.lineTo(U(0), CH * 0.22); c.closePath(); c.fill();
      c.strokeStyle = 'rgba(150,120,90,0.5)'; c.lineWidth = 2; c.beginPath(); c.moveTo(U(0.003), CH * 0.24); c.lineTo(U(0.003), CH * 0.9); c.stroke();
      [0.36, 0.56, 0.76].forEach(v => { c.fillStyle = '#d6c6a6'; c.beginPath(); c.arc(U(-0.002), v * CH, 4, 0, TAU); c.fill(); c.strokeStyle = 'rgba(120,96,70,0.6)'; c.stroke(); });
    });
    const coatM = coatMat(texOf(coatTex)); coatM.map.wrapS = THREE.RepeatWrapping; coatM.side = THREE.FrontSide;
    mesh(g, coatM, body);
  }
  // the lapels: cut cloth with thickness, peaked, rolled back from the shirt
  {
    const lapM = coatMat(null);
    [1, -1].forEach(s => patch(t => s > 0 ? vee(t) + 0.002 : -lap(t), t => s > 0 ? lap(t) : -vee(t) - 0.002, 0.02, 0.86, (t, k) => 0.35 + 0.25 * Math.sin(Math.PI * k), lapM, 10, 40, 0));
    // (the lapels' outer edges, standing proud: a rolled bead the eye can follow)
    const edgeM = coatMat(null); edgeM.color.setHex(0x3a1a0e);
    [1, -1].forEach(s => {
      const pts = Array.from({ length: 41 }, (_, k) => { const t = 0.02 + 0.84 * k / 40; return tS(s * lap(t) * TAU, t, 0.32); });
      mesh(new THREE.TubeGeometry(new THREE.CatmullRomCurve3(pts), 80, 0.22, 6, false), edgeM, body);
    });
  }
  // the shirt's collar: a band round the neck, open at the front, its points
  // rolled out and laid over the lapels
  {
    const colM = new THREE.MeshPhysicalMaterial({ color: 0xece0c6, roughness: 0.75, sheen: 0.3, sheenColor: new THREE.Color(0xffffff), side: THREE.DoubleSide }); keep(null, colM);
    const band = mesh(new THREE.CylinderGeometry(4.2, 4.7, 2.0, 48, 1, true, 0.5, TAU - 1.0), colM, body); band.position.set(0, TY + 0.4, -0.5);
    [1, -1].forEach(s => patch(t => s > 0 ? 0.03 + 0.012 * t / 0.17 : -(0.05 + 0.045 * t / 0.17), t => s > 0 ? 0.05 + 0.045 * t / 0.17 : -(0.03 + 0.012 * t / 0.17), 0.0, 0.17, (t, k) => 0.75 + 0.15 * Math.sin(Math.PI * k), colM, 8, 12, 0));
  }
  // the chain: fine gold links, lying round the throat on the shirt
  {
    const chainM = new THREE.MeshStandardMaterial({ color: 0xd8a848, metalness: 1, roughness: 0.25 }); keep(null, chainM);
    const pts = Array.from({ length: 31 }, (_, k) => { const f = k / 30 * 2 - 1; return tS(f * 0.07 * TAU, 0.06 + 0.1 * (1 - f * f), 0.15); });
    mesh(new THREE.TubeGeometry(new THREE.CatmullRomCurve3(pts), 90, 0.11, 6, false), chainM, body);
  }
  // the arms: the coat's sleeves hung from the shoulders, a round head to
  // each, so the shoulder line reads
  {
    const slM = coatMat(null); slM.side = THREE.FrontSide;
    [-1, 1].forEach(s => {
      const g = new THREE.CylinderGeometry(4.3, 4.7, 26, 32, 4, true);
      const m = mesh(g, slM, body); m.position.set(s * 15.4, TY - 19.5, -0.4); m.rotation.z = s * 0.05;
      const cap = mesh(new THREE.SphereGeometry(4.4, 32, 16, 0, TAU, 0, Math.PI / 2), slM, body); cap.position.set(s * 15.0, TY - 6.6, -0.4); cap.scale.set(1.05, 0.55, 1);
    });
  }

  const dispose = () => { made.geos.forEach(g => g.dispose()); made.mats.forEach(m => m.dispose()); made.texs.forEach(t => t.dispose()); };
  return { group, body, neck, head, eyes, dispose, HEAD };
}
