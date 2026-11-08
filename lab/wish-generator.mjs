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
import { seatOnBase } from '../assets/intro3d/props.mjs';

const POLL_FAST_MS = 3000;
const POLL_SLOW_MS = 5000;
const FAST_FOR_MS = 60_000;
const CEILING_MS = 360_000;
const FAKE_GLB = new URL('../assets/intro3d/rare/bodies/rodin-lean.glb', import.meta.url).href;

const wait = ms => new Promise(res => setTimeout(res, ms));

// (seated by props.mjs's rule, the same one every kept prop gets)
async function loadStanding(url) {
  const gltf = await new GLTFLoader().loadAsync(url);
  return seatOnBase(gltf.scene);
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
      const id = r.id; // only the submit answer carries it
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
        r = await callEdge('wish-3d', { action: 'status', id, prompt: text });
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
