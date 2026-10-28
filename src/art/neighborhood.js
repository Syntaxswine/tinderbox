import {loadGrossHousing, createGrossHouse} from './gross-housing.js';
import {HOPKINS_HOUSING_URL, createHopkinsHouse} from './hopkins-housing.js';
import {removeTree} from './resources.js';
import {HOUSING_PLANS} from '../content/housing-plans.js';

// One six-texture owner serves both immutable source catalogues.
export async function loadNeighborhoodKit(T, {renderer} = {}) {
  const library = await loadGrossHousing(T, {renderer});
  try {
    const response = await fetch(HOPKINS_HOUSING_URL);
    if (!response.ok) throw Error('Hopkins housing catalogue ' + response.status);
    const hopkins = await response.json();
    library.catalogue = {...library.catalogue, houses: [...library.catalogue.houses, ...hopkins.houses]};
    for (const id of Object.keys(HOUSING_PLANS)) {
      if (library.catalogue.houses.filter(house => house.id === id).length !== 1) throw Error('Missing or duplicate selected house: ' + id);
      if (JSON.stringify(library.catalogue.houses.find(house => house.id === id)) !== JSON.stringify(HOUSING_PLANS[id])) throw Error('Catalogue/physics source identity mismatch: ' + id);
    }
    return library;
  } catch (error) { library.dispose(); throw error; }
}

export function createNeighborhood(T, library) {
  const root = new T.Group(); root.name = 'Catalogue neighborhood';
  const models = new Map(), charColor = new T.Color('#261e16');
  const raycaster = new T.Raycaster(), hit = new T.Vector3(), projected = new T.Vector3();
  let disposed = false, builds = 0, observed = [], occludingBuildingIds = [], projection = null;
  function update(world, {camera, player, muzzle, trail = [], viewport} = {}) {
    if (disposed) return;
    const instances = world.buildings || [], active = new Set(); observed = [];
    for (const instance of instances) {
      observed.push({id: instance.id, prefabId: instance.prefabId, visible: !instance.destroyed, burnedFraction: instance.burnedFraction});
      if (instance.destroyed) continue;
      active.add(instance.id);
      const key = JSON.stringify([instance.prefabId, instance.x, instance.y, instance.quarterTurns]);
      let record = models.get(instance.id);
      if (record && record.key !== key) { record.model.dispose(); models.delete(instance.id); record = null; }
      if (!record) {
        const create = instance.collection === 'hopkins' ? createHopkinsHouse : createGrossHouse;
        const model = create(T, library, instance.prefabId, {furnished: false, partyWalls: false});
        model.setView({view: 'exterior', showFurniture: false});
        model.root.name = 'Catalogue house: ' + instance.id;
        model.root.userData.buildingId = instance.id;
        model.root.position.set(instance.x, 0, instance.y); model.root.rotation.y = -instance.quarterTurns * Math.PI / 2;
        const colors = new Map(), shadows = new Map(); let meshCount = 0, triangleCount = 0;
        model.root.traverse(object => {
          if (object.isMesh) { shadows.set(object, object.castShadow); meshCount++; triangleCount += (object.geometry.index?.count || object.geometry.attributes.position.count) / 3; }
          for (const material of [object.material].flat().filter(Boolean)) if (material.color && !colors.has(material)) colors.set(material,
            {color: material.color.clone(), opacity: material.opacity, transparent: material.transparent, depthWrite: material.depthWrite});
        });
        model.root.updateMatrixWorld(true);
        record = {key, model, colors, shadows, meshCount, triangleCount, bounds: new T.Box3().setFromObject(model.root), faded: false};
        models.set(instance.id, record); root.add(model.root); builds++;
      }
      const amount = Math.min(1, Math.max(0, instance.burnedFraction || 0));
      for (const [material, original] of record.colors) material.color.copy(original.color).lerp(charColor, amount * .85);
    }
    for (const [id, record] of models) if (!active.has(id)) { record.model.dispose(); models.delete(id); }
    const samples = [], occluding = new Set(); projection = null;
    if (camera && player) {
      camera.updateMatrixWorld();
      for (const height of [.05, .85, 1.67]) samples.push(new T.Vector3(player.x, height, player.y));
      if (muzzle) samples.push(new T.Vector3(muzzle.x, muzzle.y, muzzle.z));
      for (const point of trail.slice(0, 20)) samples.push(new T.Vector3(point.x, .04, point.y));
      for (const sample of samples) {
        projected.copy(sample).project(camera); raycaster.setFromCamera(projected, camera);
        const distance = sample.clone().sub(raycaster.ray.origin).dot(raycaster.ray.direction);
        for (const [id, record] of models) if (raycaster.ray.intersectBox(record.bounds, hit) &&
          hit.clone().sub(raycaster.ray.origin).dot(raycaster.ray.direction) < distance - .05) occluding.add(id);
      }
      const foot = new T.Vector3(player.x, 0, player.y).project(camera), head = new T.Vector3(player.x, 1.67, player.y).project(camera);
      projection = {playerNdc: foot.toArray(), bearHeightPixels: viewport ? Math.abs(head.y - foot.y) * viewport.height / 2 : null, samples: samples.length};
    }
    occludingBuildingIds = [...occluding];
    for (const [id, record] of models) {
      const faded = occluding.has(id);
      for (const [material, original] of record.colors) {
        material.opacity = original.opacity * (faded ? .18 : 1);
        material.transparent = faded || original.transparent; material.depthWrite = faded ? false : original.depthWrite;
        if (faded !== record.faded) material.needsUpdate = true;
      }
      if (faded !== record.faded) for (const [mesh, castShadow] of record.shadows) mesh.castShadow = faded ? false : castShadow;
      record.faded = faded;
    }
  }
  return {root, update,
    diagnostics: () => ({disposed, builds, active: models.size, instances: structuredClone(observed), occludingBuildingIds: [...occludingBuildingIds],
      occlusionMethod: 'Conservative bounds of actual source meshes; presentation-only fade', projection: structuredClone(projection),
      models: [...models.entries()].map(([id, record]) => ({...record.model.diagnostics(), instanceId: id, opacityScale: record.faded ? .18 : 1,
        sourceMeshCount: record.meshCount, sourceTriangleCount: record.triangleCount, sourceBounds: {min: record.bounds.min.toArray(), max: record.bounds.max.toArray()},
        nativeScale: record.model.root.scale.toArray(), position: record.model.root.position.toArray(), rotation: record.model.root.rotation.y}))}),
    dispose() { if (disposed) return; disposed = true; for (const record of models.values()) record.model.dispose(); models.clear(); removeTree(root); }
  };
}
