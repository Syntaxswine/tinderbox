// r02: do the fire floor patches cover exactly the drawn oak floor? Independent of the repository's own test:
// instead of comparing triangle lists, drop a vertical ray every 0.1 m (offsets 0.0371/0.0613 m, so never on an axis or 45-degree edge) over the
// whole plan plus a 1 m margin, against the real assembled "Room floor" meshes, and ask the fire graph the same
// question (is this point inside a patch of that storey?). Any disagreement is a mismatch of 0.01 m2.
// Also: every floor site's world anchor must sit on drawn oak at the oak's height, in every quarter turn.
// Run: node r02-floor-vs-art.mjs
import {readFileSync} from 'node:fs';
import {HEAD, r} from './lib.mjs';
const T = await import(HEAD + 'runtime/three.js');
const {createNeighborhood} = await import(HEAD + 'art/neighborhood.js');
const {HOUSING_PLANS} = await import(HEAD + 'content/housing-plans.js');
const {compileBuildings, buildingPoint, localHousingFootprints} = await import(HEAD + 'content/buildings.js');
const {compileFloorSupport, floorPatchContains} = await import(HEAD + 'content/housing-floors.js');
const {housingSectionGrid} = await import(HEAD + 'content/housing-sections.js');
const {createHousingTopology} = await import(HEAD + 'simulation/housing-topology.js');
const {DEFAULT_CONFIG} = await import(HEAD + 'simulation/config.js');

const library = {catalogue: {houses: ['gross', 'hopkins'].flatMap(name => JSON.parse(readFileSync(
  new URL('assets/art/' + name + '-housing-v1/houses.json', new URL('../', HEAD)))).houses)}, textures: {}};
const down = new T.Vector3(0, -1, 0);
let variants = 0, rays = 0, mismatches = 0, anchorsOff = 0, anchors = 0;
for (const prefabId of Object.keys(HOUSING_PLANS)) for (let quarterTurns = 0; quarterTurns < 4; quarterTurns++) {
  const plan = HOUSING_PLANS[prefabId], first = {id: 'a', prefabId, x: 24, y: 24, quarterTurns};
  const row = prefabId === 'monroe-row' ? [first, {id: 'b', prefabId, ...buildingPoint(first, {x: plan.width, y: 0}), quarterTurns},
    {id: 'c', prefabId, ...buildingPoint(first, {x: 2 * plan.width, y: 0}), quarterTurns}] : [first];
  const sets = prefabId === 'monroe-row' ? [compileBuildings([first]).buildings, compileBuildings(row).buildings] : [compileBuildings(row).buildings];
  for (const buildings of sets) {
    const view = createNeighborhood(T, library);
    view.update({buildings}); view.root.updateMatrixWorld(true);
    for (const building of buildings) {
      variants++;
      const house = view.root.children.find(child => child.userData.buildingId === building.id);
      const grid = housingSectionGrid(prefabId);
      const {sites} = createHousingTopology(building, plan, localHousingFootprints(prefabId, building.partyWalls), DEFAULT_CONFIG);
      const tag = `${prefabId} q${quarterTurns} ${building.partyWalls.left ? 'L' : '-'}${building.partyWalls.right ? 'R' : '-'}`;
      for (const group of house.children.filter(child => child.name.startsWith('Level '))) {
        const level = Number(group.name.slice(6));
        const meshes = group.children.filter(mesh => mesh.name.startsWith('Room floor: '));
        if (!meshes.length) continue;
        const {patches} = compileFloorSupport(plan, level, grid);
        const y = patches[0]?.y ?? 0;
        let bad = 0, oak = 0, fuel = 0;
        for (let x = -1 + .0371; x < plan.width + 1; x += .1) for (let z = -1 + .0613; z < plan.depth + 1; z += .1) {
          const world = buildingPoint(building, {x, y: z});
          const hit = new T.Raycaster(new T.Vector3(world.x, y + .1, world.y), down, 0, .2).intersectObjects(meshes).length > 0;
          const inPatches = patches.filter(patch => floorPatchContains(patch, [x, z])).length;
          rays++; if (hit) oak++; if (inPatches) fuel++;
          if (hit !== (inPatches > 0) || inPatches > 1) { bad++; mismatches++; if (bad <= 3) console.log(`  MISMATCH ${tag} L${level} local(${r(x)},${r(z)}) drawn=${hit} patches=${inPatches}`); }
        }
        const area = patches.reduce((sum, patch) => sum + patch.area, 0);
        if (Math.abs(area - fuel / 100) > .26 || bad) console.log(`  AREA ${tag} L${level} patchArea=${r(area)} sampledFuel=${fuel / 100} sampledOak=${oak / 100}`);
        if (level < 0) continue;
        for (const site of sites.filter(site => site.id.startsWith(`floor:${level}:`))) {
          anchors++;
          // An anchor may sit exactly on a shared triangle vertex; a ray there is a floating-point tie. Nudge by 3 mm.
          const hit = [[.003, .0017], [-.003, .0017], [.0017, -.003], [-.0017, -.003]].map(([dx, dz]) =>
            new T.Raycaster(new T.Vector3(site.world.x + dx, site.world.y + .1, site.world.z + dz), down, 0, .2).intersectObjects(meshes)[0]).find(Boolean);
          if (!hit || Math.abs(hit.point.y - site.world.y) > 1e-6) { anchorsOff++; console.log(`  ANCHOR OFF OAK ${tag} ${site.id} at ${r(site.world.x)},${r(site.world.y)},${r(site.world.z)} hit=${hit ? r(hit.point.y) : 'none'}`); }
        }
      }
    }
    view.dispose();
  }
}
console.log(`${variants} house variants, ${rays} vertical rays at 0.1 m pitch: ${mismatches} disagreements between drawn oak and fire patches; ${anchorsOff}/${anchors} floor anchors off the drawn oak`);
