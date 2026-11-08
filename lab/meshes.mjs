// The lab's turntable: kept meshes (assets/intro3d/rare/meshes/manifest.json,
// loaded through props.mjs as a scene would) and bucket drafts (a wish's
// words resolved to the bucket by the function's own rule, or any GLB url),
// on a table under the Wish Room's lights. Opened from the lab's bar; no
// gate, since both sources are public. window.__meshes is for the lab and
// the browser checks: { current, currentName, show(name), preview(src) }.
import * as THREE from '../assets/vendor/three/three.module.js';
import { GLTFLoader } from '../assets/vendor/three/three.addons.js';
import { loadProp, seatOnBase } from '../assets/intro3d/props.mjs';

const MANIFEST_URL = new URL('../assets/intro3d/rare/meshes/manifest.json', import.meta.url).href;
const DRESSING_URL = new URL('../assets/intro3d/dressing.json', import.meta.url).href;
const BUCKET_BASE = 'https://ewfvyrhlsanzkmozrmhs.supabase.co/storage/v1/object/public/wish-models/';
const DEFAULT_MODEL = 'fal-ai/hyper3d/rodin';
const TABLE_Y = 0.62;
const reducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;

// ---------- the bucket rule (mirrors supabase/functions/wish-3d/fal.ts) ----------
function normaliseKey(prompt) { return String(prompt).toLowerCase().trim().replace(/\s+/g, ' ').replace(/[.!?,;:]+$/, ''); }
async function draftUrl(prompt, model = DEFAULT_MODEL) {
  const key = `${normaliseKey(prompt)}|${model}`;
  const buf = await crypto.subtle.digest('SHA-256', new TextEncoder().encode(key));
  const hex = [...new Uint8Array(buf)].map(b => b.toString(16).padStart(2, '0')).join('');
  return `${BUCKET_BASE}${model.replace(/\//g, '-')}/${hex}.glb`;
}

// ---------- the room ----------
const canvas = document.getElementById('meshCanvas');
const renderer = new THREE.WebGLRenderer({ canvas, antialias: true });
renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 2));
renderer.outputColorSpace = THREE.SRGBColorSpace;
renderer.toneMapping = THREE.ACESFilmicToneMapping;
renderer.toneMappingExposure = 1.05;
renderer.shadowMap.enabled = true;
const scene = new THREE.Scene();
scene.background = new THREE.Color(0x0d0b10);
scene.fog = new THREE.Fog(0x0d0b10, 9, 22);
const camera = new THREE.PerspectiveCamera(42, 1, 0.05, 60);
scene.add(new THREE.HemisphereLight(0xffe9c8, 0x1a1420, 0.55));
const key = new THREE.DirectionalLight(0xfff1dc, 2.2);
key.position.set(3.5, 6, 2.5); key.castShadow = true; key.shadow.mapSize.set(1024, 1024);
key.shadow.camera.left = -4; key.shadow.camera.right = 4; key.shadow.camera.top = 4; key.shadow.camera.bottom = -4; key.shadow.bias = -0.0004;
scene.add(key);
const rim = new THREE.PointLight(0x8f6bff, 6, 12, 2); rim.position.set(-3, 2.2, -2.5); scene.add(rim);

const std = (color, opts = {}) => new THREE.MeshStandardMaterial({ color, roughness: 0.6, metalness: 0, ...opts });
const mesh = (geo, mat, cast = true) => { const m = new THREE.Mesh(geo, mat); m.castShadow = cast; m.receiveShadow = true; return m; };
const floor = mesh(new THREE.CircleGeometry(30, 64), std(0x1a1519, { roughness: 0.9 }), false); floor.rotation.x = -Math.PI / 2; scene.add(floor);
const rug = mesh(new THREE.CircleGeometry(3.4, 64), std(0x3a1f2c, { roughness: 1 }), false); rug.rotation.x = -Math.PI / 2; rug.position.y = 0.005; scene.add(rug);
const table = new THREE.Group();
const top = mesh(new THREE.CylinderGeometry(1.55, 1.55, 0.08, 64), std(0x3b2417, { roughness: 0.45 })); top.position.y = TABLE_Y - 0.04;
const edge = mesh(new THREE.TorusGeometry(1.55, 0.025, 12, 96), std(0xc9a45a, { roughness: 0.3, metalness: 0.9 })); edge.rotation.x = Math.PI / 2; edge.position.y = TABLE_Y - 0.01;
const stem = mesh(new THREE.CylinderGeometry(0.12, 0.18, TABLE_Y - 0.08, 24), std(0x241510)); stem.position.y = (TABLE_Y - 0.08) / 2;
table.add(top, edge, stem); scene.add(table);

// the turntable: whatever is current stands here and turns slowly
const holder = new THREE.Group(); holder.position.y = TABLE_Y; scene.add(holder);
let current = null, currentName = '';

// camera on an orbit: drag turns, pinch or wheel zooms
const orbit = { yaw: 0.6, pitch: 0.38, dist: 3.2 };
function placeCamera() {
  const h = holderHeight();
  const aimY = TABLE_Y + h * 0.45;
  camera.position.set(Math.sin(orbit.yaw) * Math.cos(orbit.pitch) * orbit.dist, aimY + Math.sin(orbit.pitch) * orbit.dist, Math.cos(orbit.yaw) * Math.cos(orbit.pitch) * orbit.dist);
  camera.lookAt(0, aimY, 0);
}
function holderHeight() {
  if (!current) return 0.4;
  const b = new THREE.Box3().setFromObject(current);
  return Number.isFinite(b.max.y) ? Math.max(0.2, b.max.y - b.min.y) : 0.4;
}
let drag = null, pinch0 = 0;
canvas.addEventListener('pointerdown', e => { drag = { x: e.clientX, y: e.clientY }; canvas.setPointerCapture(e.pointerId); });
canvas.addEventListener('pointermove', e => { if (!drag) return; orbit.yaw -= (e.clientX - drag.x) * 0.008; orbit.pitch = Math.min(1.2, Math.max(0.05, orbit.pitch + (e.clientY - drag.y) * 0.005)); drag = { x: e.clientX, y: e.clientY }; });
canvas.addEventListener('pointerup', () => { drag = null; });
canvas.addEventListener('wheel', e => { orbit.dist = Math.min(9, Math.max(0.6, orbit.dist * (1 + Math.sign(e.deltaY) * 0.1))); e.preventDefault(); }, { passive: false });
canvas.addEventListener('touchstart', e => { if (e.touches.length === 2) pinch0 = Math.hypot(e.touches[0].clientX - e.touches[1].clientX, e.touches[0].clientY - e.touches[1].clientY); }, { passive: true });
canvas.addEventListener('touchmove', e => { if (e.touches.length === 2 && pinch0) { const d = Math.hypot(e.touches[0].clientX - e.touches[1].clientX, e.touches[0].clientY - e.touches[1].clientY); orbit.dist = Math.min(9, Math.max(0.6, orbit.dist * pinch0 / d)); pinch0 = d; } }, { passive: true });

function size() {
  const w = window.innerWidth, h = window.innerHeight;
  renderer.setSize(w, h, false); camera.aspect = w / h; camera.updateProjectionMatrix();
}
window.addEventListener('resize', size); size();
renderer.setAnimationLoop(() => {
  if (current && !reducedMotion && !drag) holder.rotation.y += 0.004;
  placeCamera();
  renderer.render(scene, camera);
});

// ---------- what stands on the table ----------
const status = document.getElementById('meshStatus');
let hideTimer = 0;
function say(text, keep = false) {
  clearTimeout(hideTimer);
  status.textContent = text; status.classList.toggle('on', !!text);
  if (text && !keep) hideTimer = setTimeout(() => status.classList.remove('on'), 4000);
}
function fitForTable(group) {
  // a prop is kept at its real height; the table is 1.5 m across, so anything
  // over 1.2 m is shown scaled down (the lab says so), never scaled up
  const b = new THREE.Box3().setFromObject(group);
  const h = b.max.y - b.min.y, w = Math.max(b.max.x - b.min.x, b.max.z - b.min.z);
  const k = Math.min(1, 1.2 / Math.max(h, 1e-3), 2.4 / Math.max(w, 1e-3));
  if (k < 1) group.scale.setScalar(k);
  return k;
}
// a draft's geometry, materials and textures are the lab's own to free; a
// kept prop's are shared with props.mjs's cache and are left alone
function disposeOwned(group) {
  if (!group.userData.owned) return;
  group.traverse(o => {
    if (!o.isMesh) return;
    o.geometry?.dispose?.();
    for (const m of [].concat(o.material || [])) {
      for (const k of Object.keys(m)) { const v = m[k]; if (v && v.isTexture) v.dispose(); }
      m.dispose?.();
    }
  });
}
function place(group, name) {
  if (current) { holder.remove(current); disposeOwned(current); }
  group.traverse(o => { if (o.isMesh) { o.castShadow = true; o.receiveShadow = true; } });
  const k = fitForTable(group);
  holder.add(group); holder.rotation.y = 0;
  current = group; currentName = name;
  window.__meshes.current = current; window.__meshes.currentName = currentName;
  return k;
}

function fmtBytes(n) { return n >= 1048576 ? `${(n / 1048576).toFixed(1)} MB` : `${Math.round(n / 1024)} KB`; }
function fmtInt(n) { return Number(n).toLocaleString('en-US'); }

let manifest = [];
const list = document.getElementById('meshList');
function renderList() {
  list.textContent = '';
  if (!manifest.length) { const e = document.createElement('div'); e.className = 'empty'; e.textContent = 'No meshes kept yet - keep one with tools/meshes/keep.mjs'; list.appendChild(e); return; }
  for (const row of manifest) {
    const b = document.createElement('button'); b.type = 'button'; b.dataset.name = row.name;
    b.innerHTML = `${row.name}<small>${fmtInt(row.triangles)} tris &middot; ${fmtBytes(row.bytes)} &middot; ${row.height} m</small>`;
    b.classList.toggle('on', row.name === currentName);
    b.addEventListener('click', () => show(row.name));
    list.appendChild(b);
  }
}

async function show(name) {
  const row = manifest.find(r => r.name === name);
  say(`Loading ${name}…`, true);
  try {
    const group = await loadProp(name);
    const k = place(group, name);
    renderList();
    say(row ? `${name}: ${fmtInt(row.triangles)} triangles, ${row.textures.map(t => `${t.size}px ${t.slot.replace('Texture', '')}`).join(', ') || 'no textures'}, ${fmtBytes(row.bytes)}, ${row.height} m${k < 1 ? ` (shown at ${Math.round(k * 100)}%)` : ''}` : `${name} on the table`, true);
  } catch (err) {
    say(`Could not load ${name}: ${String(err.message || err).slice(0, 80)}`, true);
  }
}

// a draft: fetched whole so its raw size is known, then parsed and seated
async function preview(src) {
  const url = /^https?:\/\//i.test(src) ? src : await draftUrl(src);
  say('Fetching the draft…', true);
  try {
    const r = await fetch(url);
    if (!r.ok) throw new Error(r.status === 400 || r.status === 404 ? 'no draft in the bucket for that' : `fetch ${r.status}`);
    const buf = await r.arrayBuffer();
    const gltf = await new GLTFLoader().parseAsync(buf, url.slice(0, url.lastIndexOf('/') + 1));
    let tris = 0; gltf.scene.traverse(o => { if (o.isMesh && o.geometry) tris += Math.floor((o.geometry.index ? o.geometry.index.count : o.geometry.attributes.position.count) / 3); });
    const draft = seatOnBase(gltf.scene); draft.userData.owned = true;
    const k = place(draft, 'draft');
    renderList();
    say(`Draft: ${fmtInt(tris)} triangles, ${fmtBytes(buf.byteLength)} raw${k < 1 ? ` (shown at ${Math.round(k * 100)}%)` : ''}`, true);
  } catch (err) {
    say(`Draft: ${String(err.message || err).slice(0, 90)}`, true);
  }
}

document.getElementById('draftForm').addEventListener('submit', e => {
  e.preventDefault();
  const v = document.getElementById('draftInput').value.trim();
  if (v) preview(v);
});

// The wanted props (dressing.json rows with no mesh yet): the prompt to wish
// for, and the keep command that files the draft under the row's name.
function renderWanted(homes) {
  const wrap = document.getElementById('wanted'), list = document.getElementById('wantedList');
  list.textContent = '';
  const rows = [];
  for (const [home, hr] of Object.entries(homes || {})) if (Array.isArray(hr)) hr.forEach(r => { if (r && r.mesh === null) rows.push({ home, ...r }); });
  wrap.hidden = !rows.length;
  for (const r of rows) {
    const metres = +(r.height / 100).toFixed(3);
    const card = document.createElement('div'); card.className = 'card'; card.dataset.name = r.name;
    const b = document.createElement('b'); b.textContent = `${r.name} · ${r.home}`;
    const note = document.createElement('div'); note.className = 'note'; note.textContent = `${r.note ? r.note + ' · ' : ''}${r.height} cm tall`;
    const prompt = document.createElement('button'); prompt.type = 'button'; prompt.className = 'prompt'; prompt.textContent = r.prompt; prompt.title = 'Copy the prompt';
    prompt.addEventListener('click', () => { if (navigator.clipboard) navigator.clipboard.writeText(r.prompt).then(() => say('Prompt copied'), () => {}); });
    const cmd = document.createElement('code'); cmd.textContent = `node tools/meshes/keep.mjs '${r.prompt.replace(/'/g, "'\\''")}' --as ${r.name} --height ${metres}`;
    card.append(b, note, prompt, cmd);
    list.appendChild(card);
  }
}

window.__meshes = { current, currentName, show, preview, manifest: () => manifest };

fetch(DRESSING_URL).then(r => r.ok ? r.json() : {}).catch(() => ({})).then(renderWanted);

fetch(MANIFEST_URL).then(r => r.ok ? r.json() : []).catch(() => []).then(rows => {
  manifest = Array.isArray(rows) ? rows : [];
  renderList();
  if (manifest.length) show(manifest[0].name);
});
