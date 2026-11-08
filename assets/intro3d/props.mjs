// Kept meshes at runtime: tools/meshes/keep.mjs writes a budgeted GLB under
// ./rare/meshes/ (see tools/meshes/README.md and scripts/check-meshes.js);
// loadProp(name) fetches and parses it once and hands back a fresh group each
// time, seated with its base on y = 0 and centred in x and z, so a scene can
// place the same prop twice and scale it with fitTo-style code without the
// base leaving the table. Nothing here reads the manifest: that is a dev-time
// record. rare/ is not precached, so the first load of a prop is a fetch.
import * as THREE from '../vendor/three/three.module.js';
import { GLTFLoader } from '../vendor/three/three.addons.js';

export function propUrl(name) {
  return new URL(`./rare/meshes/${name}.glb`, import.meta.url).href;
}

// A loaded mesh arrives centred on its own origin; the offset goes on the
// object inside a fresh group, so scaling the group (a position is not
// scaled by its own object's scale) keeps the base on the table.
export function seatOnBase(object) {
  object.updateMatrixWorld(true);
  const b = new THREE.Box3().setFromObject(object);
  const group = new THREE.Group();
  group.add(object);
  if (Number.isFinite(b.min.y)) {
    object.position.x -= (b.min.x + b.max.x) / 2;
    object.position.y -= b.min.y;
    object.position.z -= (b.min.z + b.max.z) / 2;
  }
  return group;
}

const parsed = new Map(); // name -> Promise<THREE.Object3D> (the template)
let loader = null;

export function loadProp(name) {
  if (!parsed.has(name)) {
    loader = loader || new GLTFLoader();
    parsed.set(name, loader.loadAsync(propUrl(name)).then(gltf => gltf.scene));
  }
  return parsed.get(name).then(template => seatOnBase(template.clone(true)));
}
