// The Wish Room's real generator: a wish goes to the wish-3d edge function
// (a thin proxy over fal.ai's queue for a text-to-3D model, see
// supabase/functions/wish-3d/), the room polls while its clay stage plays,
// and the finished GLB lands on the table in place of the procedural model.
// Installed only when the lab gate's token is present (dev-overlay.mjs holds
// it and makes the call); anyone else, and any failure, gets the room as it
// is. ?fake3d skips the network and loads the bundled Rodin body instead,
// so the load, fit and crossfade can be looked at for free.
import { GLTFLoader } from '../assets/vendor/three/three.addons.js';
import { callEdge, signedIn } from '../assets/intro3d/dev-overlay.mjs';

const POLL_FAST_MS = 3000;
const POLL_SLOW_MS = 5000;
const FAST_FOR_MS = 60_000;
const CEILING_MS = 360_000;
const FAKE_GLB = new URL('../assets/intro3d/rare/bodies/rodin-lean.glb', import.meta.url).href;

const wait = ms => new Promise(res => setTimeout(res, ms));

// A generated mesh arrives centred on its own origin; the room's models
// stand on the table at y = 0, centred in x and z. fitTo() then scales it.
async function loadStanding(url) {
  const gltf = await new GLTFLoader().loadAsync(url);
  const object = gltf.scene;
  object.updateMatrixWorld(true);
  const b = { min: [Infinity, Infinity, Infinity], max: [-Infinity, -Infinity, -Infinity] };
  object.traverse(o => {
    if (!o.isMesh || !o.geometry) return;
    o.geometry.computeBoundingBox();
    const bb = o.geometry.boundingBox;
    const corners = [[bb.min.x, bb.min.y, bb.min.z], [bb.max.x, bb.min.y, bb.min.z], [bb.min.x, bb.max.y, bb.min.z], [bb.max.x, bb.max.y, bb.min.z],
      [bb.min.x, bb.min.y, bb.max.z], [bb.max.x, bb.min.y, bb.max.z], [bb.min.x, bb.max.y, bb.max.z], [bb.max.x, bb.max.y, bb.max.z]];
    for (const [x, y, z] of corners) {
      const e = o.matrixWorld.elements;
      const wx = e[0] * x + e[4] * y + e[8] * z + e[12], wy = e[1] * x + e[5] * y + e[9] * z + e[13], wz = e[2] * x + e[6] * y + e[10] * z + e[14];
      b.min[0] = Math.min(b.min[0], wx); b.min[1] = Math.min(b.min[1], wy); b.min[2] = Math.min(b.min[2], wz);
      b.max[0] = Math.max(b.max[0], wx); b.max[1] = Math.max(b.max[1], wy); b.max[2] = Math.max(b.max[2], wz);
    }
  });
  if (Number.isFinite(b.min[1])) {
    object.position.x -= (b.min[0] + b.max[0]) / 2;
    object.position.y -= b.min[1];
    object.position.z -= (b.min[2] + b.max[2]) / 2;
  }
  return object;
}

export function installWishGenerator({ onStatus = () => {} } = {}) {
  const fake = new URLSearchParams(location.search).has('fake3d');
  if (!fake && !signedIn()) {
    onStatus('Pass the lab gate to wish for real');
    return false;
  }
  let busy = false;

  window.WISH_GENERATOR = async (text) => {
    if (busy) return null;
    busy = true;
    try {
      if (fake) {
        onStatus('Sculpting… (fake)');
        await wait(2000);
        const object = await loadStanding(FAKE_GLB);
        onStatus('Ready (bundled body)');
        return { object, url: FAKE_GLB, cached: true };
      }

      onStatus('Asking for it…');
      let r;
      try {
        r = await callEdge('wish-3d', { action: 'submit', prompt: text });
      } catch (err) {
        onStatus(String(err.message || err).slice(0, 160));
        throw err;
      }
      const started = Date.now();
      while (r.state !== 'done') {
        if (r.state === 'failed') {
          onStatus(r.message || 'The model could not make it');
          throw new Error(r.message || 'wish-3d failed');
        }
        const elapsed = Date.now() - started;
        if (elapsed > CEILING_MS) {
          onStatus('Gave up after six minutes');
          throw new Error('Gave up after six minutes');
        }
        onStatus(r.state === 'queued'
          ? `Queued${typeof r.position === 'number' ? `, ${r.position} ahead` : ''}…`
          : `Sculpting… ${Math.round(elapsed / 1000)}s`);
        await wait(elapsed < FAST_FOR_MS ? POLL_FAST_MS : POLL_SLOW_MS);
        r = await callEdge('wish-3d', { action: 'status', id: r.id, prompt: text });
      }
      onStatus(r.cached ? 'Ready (remembered)' : 'Ready (fresh)');
      const object = await loadStanding(r.url);
      return { object, url: r.url, cached: !!r.cached };
    } finally {
      busy = false;
    }
  };
  return true;
}
