import {loadGrossHousing, createGrossHouse} from './gross-housing.js';
import {HOPKINS_HOUSING_URL, createHopkinsHouse} from './hopkins-housing.js';
import {createMonroeRowHouse,monroePartyWalls} from './row-house.js';
import {removeTree} from './resources.js';
import {HOUSING_PLANS} from '../content/housing-plans.js';
import {createHousingSectionMask} from './housing-section-mask.js';
import {housingFlameSites} from './housing-flame-sites.js';
import {createWallShroud} from '../reuse/ashland/wall-shroud.js';
import {housingSectionAt,housingSectionGrid} from '../content/housing-sections.js';

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
  const fireRoot = new T.Group(); fireRoot.name = 'Catalogue façade flames';
  const models = new Map(), charColor = new T.Color('#261e16');
  const raycaster = new T.Raycaster(), hit = new T.Vector3(), projected = new T.Vector3();
  let disposed = false, builds = 0, observed = [], occludingBuildingIds = [], projection = null, fire;
  const disposeModel=record=>{record.mask?.dispose();record.model.dispose();};
  function update(world, {camera, player, muzzle, trail = [], viewport, worldTime=0, sampleWind, preheatSites} = {}) {
    if (disposed) return;
    const instances = world.buildings || [], active = new Set(),flames=[];
    const liveNeighbors=new Map(instances.filter(b=>!b.destroyed).map(b=>[b.id,b]));
    let shadowsDirty=false;
    observed = [];
    if(!fire&&instances.some(b=>b.sections)){
      fire=createWallShroud(T,{maxCells:80,profile:'house'});fireRoot.add(fire.root);
    }
    for (const instance of instances) {
      observed.push({id: instance.id, prefabId: instance.prefabId, visible: !instance.destroyed, burnedFraction: instance.burnedFraction});
      if (instance.destroyed) continue;
      active.add(instance.id);
      const partyWalls=monroePartyWalls(instance,instances);
      const key = JSON.stringify([instance.prefabId, instance.x, instance.y, instance.quarterTurns,partyWalls]);
      let record = models.get(instance.id);
      if (record && record.key !== key) { disposeModel(record); models.delete(instance.id); record = null; }
      if (!record) {
        const create = instance.prefabId==='monroe-row'?createMonroeRowHouse:instance.collection === 'hopkins' ? createHopkinsHouse : createGrossHouse;
        const model = create(T, library, instance.prefabId, {furnished: false, partyWalls: instance.prefabId==='monroe-row'?partyWalls:false});
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
        if(instance.sections){
          record.mask=createHousingSectionMask(T,model.root,instance.prefabId);
          record.flameSites=housingFlameSites(model.house,instance);
        }
        models.set(instance.id, record); root.add(model.root); builds++;
        shadowsDirty=true;
      }
      if(record.model.setNeighborsVisible){
        const left=liveNeighbors.get(partyWalls.left);
        const grid=left?.sections&&housingSectionGrid(left.prefabId);
        const exposedOnLeft=grid?z=>left.sections[housingSectionAt(grid,record.model.house.width,z)].present===false:undefined;
        shadowsDirty=record.model.setNeighborsVisible({left:Boolean(left),exposedOnLeft})||shadowsDirty;
      }
      if(record.mask){
        shadowsDirty=record.mask.update(instance.sections)||shadowsDirty;
        record.clearedSections=instance.sections.filter(section=>!section.present).map(section=>section.index);
        const structural=instance.sections.some(section=>section.fire)?record.flameSites(instance,liveNeighbors):[];
        record.structuralFlames=structural.length;flames.push(...structural);
      }
      const amount = Math.min(1, Math.max(0, instance.burnedFraction || 0));
      for (const [material, original] of record.colors) material.color.copy(original.color).lerp(charColor, amount * .85);
    }
    for (const [id, record] of models) if (!active.has(id)) { disposeModel(record); models.delete(id);shadowsDirty=true; }
    if(fire&&camera){
      if(flames.length>80&&player)flames.sort((a,b)=>Math.hypot(a.x-player.x,a.z-player.y)-Math.hypot(b.x-player.x,b.z-player.y));
      fire.update({time:worldTime,cells:flames.slice(0,80),camera,sampleWind});
    }
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
      if(preheatSites&&!faded&&record.flameSites)record.flameSites.appendPreheat(liveNeighbors.get(id),liveNeighbors,preheatSites);
      for (const [material, original] of record.colors) {
        material.opacity = original.opacity * (faded ? .18 : 1);
        material.transparent = faded || original.transparent; material.depthWrite = faded ? false : original.depthWrite;
        if (faded !== record.faded) material.needsUpdate = true;
      }
      if (faded !== record.faded){
        for (const [mesh, castShadow] of record.shadows) mesh.castShadow = faded ? false : castShadow;
        shadowsDirty=true;
      }
      record.faded = faded;
    }
    return shadowsDirty;
  }
  return {root,fireRoot,update,
    diagnostics: () => ({disposed, builds, active: models.size, instances: structuredClone(observed), occludingBuildingIds: [...occludingBuildingIds],
      occlusionMethod: 'Conservative bounds of actual source meshes; presentation-only fade', projection: structuredClone(projection),
      models: [...models.entries()].map(([id, record]) => ({...record.model.diagnostics(), instanceId: id, opacityScale: record.faded ? .18 : 1,
        sourceMeshCount: record.meshCount, sourceTriangleCount: record.triangleCount, sourceBounds: {min: record.bounds.min.toArray(), max: record.bounds.max.toArray()},
        ...(record.mask?{clearedSections:[...record.clearedSections],structuralFlames:record.structuralFlames}:{}),
        nativeScale: record.model.root.scale.toArray(), position: record.model.root.position.toArray(), rotation: record.model.root.rotation.y}))}),
    dispose() { if (disposed) return; disposed = true; for (const record of models.values()) disposeModel(record); models.clear();fire?.dispose();removeTree(fireRoot);removeTree(root); }
  };
}
