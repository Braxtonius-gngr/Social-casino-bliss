// The homes' dressing: kept meshes (props.mjs) put into a home from the
// list in dressing.json, after the fly-in has landed, so the shot never
// waits on a fetch. A row names a kept mesh, where it stands in the home's
// own centimetre frame, its yaw and how tall it is; the prop is scaled to
// that height (which also turns the kept metres into the scene's
// centimetres). A row with no mesh yet is a wanted prop: the lab lists it
// with its prompt and the runtime skips it. A row's `hides` tag hides a
// procedural stand-in (any object under the seat with userData.dressTag
// equal to it) once every row with that tag has loaded.
//
// dispose() removes the props and forgets them, before the home frees its
// set with freeTree(): the props are clones sharing geometry, materials
// and textures with props.mjs's cache, and nothing here is ever disposed.
// Off under the browser's data saver and with ?dress=off.
import * as THREE from '../vendor/three/three.module.js';
import { loadProp } from './props.mjs';

const LIST_URL = new URL('./dressing.json', import.meta.url).href;
let listPromise = null;

export function loadDressing(fetchImpl = fetch) {
  if (!listPromise) {
    // (a failed fetch answers {} this time and is asked again next time)
    listPromise = fetchImpl(LIST_URL)
      .then(r => { if (!r.ok) throw new Error(`dressing.json ${r.status}`); return r.json(); })
      .catch(() => { listPromise = null; return {}; });
  }
  return listPromise;
}

// Scale a seated group so its box is `heightCm` tall; the base stays on y = 0.
export function fitHeight(group, heightCm) {
  group.updateMatrixWorld(true);
  const b = new THREE.Box3().setFromObject(group);
  const h = b.max.y - b.min.y;
  if (!(h > 0) || !(heightCm > 0)) return 1;
  const k = heightCm / h;
  group.scale.multiplyScalar(k);
  return k;
}

function switchedOff() {
  try {
    if (navigator.connection && navigator.connection.saveData) return true;
    if (new URLSearchParams(location.search).get('dress') === 'off') return true;
  } catch (_) { /* no window to ask */ }
  return false;
}

// opts.onChange is called after each prop lands and after a stand-in is
// hidden: a home whose render loop rests between inputs repaints on it, or
// a prop that arrives late would not show until the next touch.
export function dress(seat, home, opts = {}) {
  let dead = false;
  const placed = [];
  const hidden = [];
  const changed = () => { if (!dead && typeof opts.onChange === 'function') opts.onChange(); };
  if (switchedOff()) return { ready: Promise.resolve(), dispose() {} };

  const ready = loadDressing(opts.fetchImpl).then(list => {
    if (dead) return;
    const all = (list && Array.isArray(list[home])) ? list[home].filter(r => r && r.name) : [];
    const rows = all.filter(r => r.mesh);
    if (!rows.length) return;
    // A tag's stand-in goes only when every row carrying the tag - wanted
    // rows included - has landed; a wanted or failed row keeps it. (Half a
    // bookcase of kept runs must not empty the other half.)
    const total = new Map(), landed = new Map();
    all.forEach(r => { if (r.hides) total.set(r.hides, (total.get(r.hides) || 0) + 1); });
    const tagLanded = (tag) => {
      if (!tag || dead) return;
      landed.set(tag, (landed.get(tag) || 0) + 1);
      if (landed.get(tag) < total.get(tag)) return;
      seat.traverse(o => { if (o.userData && o.userData.dressTag === tag && o.visible) { o.visible = false; hidden.push(o); } });
      changed();
    };
    return Promise.allSettled(rows.map(row => loadProp(row.mesh).then(group => {
      if (dead) return;
      fitHeight(group, row.height);
      group.rotation.y = (row.yaw || 0) * Math.PI / 180;
      group.position.set(row.at[0], row.at[1], row.at[2]);
      const shadow = row.shadow !== false;
      group.traverse(o => { if (o.isMesh) { o.castShadow = shadow; o.receiveShadow = true; } });
      group.userData.dressing = row.name;
      seat.add(group);
      placed.push(group);
      changed();
      tagLanded(row.hides);
    }).catch(err => {
      console.warn(`dressing: ${home} ${row.name} did not load: ${err && err.message ? err.message : err}`);
    }))).then(() => {});
  });

  return {
    ready,
    dispose() {
      dead = true;
      placed.splice(0).forEach(g => { if (g.parent) g.parent.remove(g); });
      hidden.splice(0).forEach(o => { o.visible = true; });
    },
  };
}
