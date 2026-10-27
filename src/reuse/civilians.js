import * as SharedThree from '../runtime/three.js';
import {CIVILIAN_PROFILES, validateCivilian} from '../content/exterior-kit.js';
import {createLightHorse} from '../../vendor/farmyard-commando/30a3b8cae5f36bb0c1df3685b7fba16f701c2083/sites/tactical-animal/dist/aft/tactics/horse-light-model.js';
import {createGoatWorker} from '../../vendor/farmyard-commando/30a3b8cae5f36bb0c1df3685b7fba16f701c2083/sites/tactical-animal/dist/aft/tactics/goat-worker.js';
import {createModelPaint, PAINT_FRAME} from '../../vendor/farmyard-commando/30a3b8cae5f36bb0c1df3685b7fba16f701c2083/sites/tactical-animal/dist/aft/tactics/horse-model-paint.js';
import {createWorkerLocomotion} from '../../vendor/farmyard-commando/30a3b8cae5f36bb0c1df3685b7fba16f701c2083/sites/tactical-animal/dist/aft/tactics/worker-locomotion.js';
export const CIVILIAN_ASSET_BASE_URL = new URL('../../vendor/farmyard-commando/30a3b8cae5f36bb0c1df3685b7fba16f701c2083/sites/tactical-animal/dist/aft/assets/', import.meta.url).href;
const factories = {horse: createLightHorse, goat: createGoatWorker};
// Shared by the real browser loader and headless bounds/identity verification.
// Raw donor pose('carry') is deliberately mapped to neutral for civilian gait.
export function createCivilianRig(species, data) {
  if (!factories[species] || (data.species ?? 'horse') !== species || !Array.isArray(data.parts) || data.parts.some(p => /cap|hat|helmet|uniform/i.test(p.name))) throw Error('Civilian model identity/headgear mismatch');
  const worker = factories[species](structuredClone(data)), pose = worker.pose;
  worker.pose = (mode, heading) => pose(mode === 'carry' ? 'neutral' : mode, heading);
  const motion = createWorkerLocomotion(worker, {id: species}), root = new SharedThree.Group();
  root.name = 'Civilian ' + species; root.userData.species = species; root.userData.appearance = 'normal'; root.add(worker.root);
  let disposed = false;
  function update(actor, worldTime) {
    if (disposed) throw Error('Civilian disposed');
    validateCivilian(actor);
    if (actor.species !== species || ![actor.x, actor.y, actor.heading, actor.travelled, worldTime].every(Number.isFinite)) throw Error('Invalid civilian state');
    // Donor IK stores bind-space world positions. Solve detached from the translated
    // scene parent, then put the evaluated local pose back under its world root.
    worker.root.removeFromParent();
    try { motion.apply({distance: actor.travelled, blend: actor.moving ? 1 : 0, heading: actor.heading * 180 / Math.PI}); }
    finally { root.add(worker.root); }
    // Explicit after-update guard: no weapon, mount, hose or HMG grip can reappear.
    worker.weapon.root.visible = false; if (worker.weapon.mount) worker.weapon.mount.visible = false;
    if (worker.weapon.hose) worker.weapon.hose.visible = false; for (const hand of worker.gripHands) hand.visible = false;
    root.position.set(actor.x, 0, actor.y); root.visible = actor.hp > 0; root.updateMatrixWorld(true);
  }
  const bounds = Object.freeze({radius: CIVILIAN_PROFILES[species].radius, height: CIVILIAN_PROFILES[species].height});
  return {root, worker, bounds, update, diagnostics: () => ({...worker.diagnostics(), species, appearance: 'normal', armed: false}),
    dispose() { if (disposed) return; disposed = true; root.removeFromParent(); motion.dispose(); worker.dispose(); worker.skeleton.dispose(); root.clear(); }};
}
export async function loadCivilianKit({THREE, renderer, assetBaseUrl = CIVILIAN_ASSET_BASE_URL} = {}) {
  if (!THREE || THREE.SkinnedMesh !== SharedThree.SkinnedMesh || !(renderer instanceof SharedThree.WebGLRenderer)) throw Error('Civilian kit requires the shared THREE namespace and its borrowed WebGLRenderer; no substitute animals');
  const base = new URL(assetBaseUrl, import.meta.url); if (!base.pathname.endsWith('/')) base.pathname += '/';
  const textures = new Map(), models = new Map(), instances = new Set(); let disposed = false;
  const loader = new THREE.TextureLoader();
  const loads = await Promise.allSettled(Object.values(CIVILIAN_PROFILES).map(async profile => {
    const [model, texture] = await Promise.allSettled([
      fetch(new URL(profile.model, base)).then(r => { if (!r.ok) throw Error('Civilian model HTTP ' + r.status); return r.json(); }),
      loader.loadAsync(new URL(profile.paint, base).href)
    ]);
    if (texture.status === 'fulfilled') textures.set(profile.species, texture.value);
    if (model.status === 'fulfilled') models.set(profile.species, model.value);
    if (model.status === 'rejected' || texture.status === 'rejected') throw Error('Civilian source load failed: ' + profile.species, {cause: model.reason || texture.reason});
  }));
  const failure = loads.find(r => r.status === 'rejected');
  if (failure) { for (const t of textures.values()) t.dispose(); throw failure.reason; }
  function create(actor) {
    if (disposed) throw Error('Civilian kit disposed');
    validateCivilian(actor); let rig, paint, texture;
    try {
      rig = createCivilianRig(actor.species, models.get(actor.species)); texture = textures.get(actor.species).clone();
      paint = createModelPaint(renderer, rig.worker, texture, {species: actor.species, frame: PAINT_FRAME, sceneLighting: true});
      for (const part of rig.worker.parts) { part.material = paint.material; part.castShadow = part.receiveShadow = true; }
      rig.update(actor, 0); let released = false;
      const instance = {root: rig.root, bounds: rig.bounds, update: rig.update, diagnostics: rig.diagnostics,
        dispose() { if (released) return; released = true; paint.dispose(); rig.dispose(); instances.delete(instance); }};
      instances.add(instance); return instance;
    } catch (error) { if (paint) paint.dispose(); else texture?.dispose(); rig?.dispose(); throw error; }
  }
  return {create, diagnostics: () => ({disposed, species: [...models.keys()].sort(), instances: instances.size, sourceTextures: textures.size, baseUrl: base.href}),
    dispose() { if (disposed) return; disposed = true; for (const i of [...instances]) i.dispose(); for (const t of textures.values()) t.dispose(); textures.clear(); models.clear(); }};
}