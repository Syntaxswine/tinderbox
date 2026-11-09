import test from 'node:test';
import assert from 'node:assert/strict';
import * as T from '../../src/runtime/three.js';
import {createStreetFirelight} from '../../src/art/street-firelight.js';
import {groupStructureFire} from '../../src/art/structure-fire.js';
import {NEIGHBORHOOD_SCENARIO} from '../../src/content/neighborhood.js';
import {createSimulation} from '../../src/simulation/index.js';

function checkBudget(pool) {
  const {lights, spill} = pool.diagnostics();
  const points = pool.root.children.filter(light => light.isPointLight);
  const spots = pool.root.children.filter(light => light.isSpotLight);
  assert.equal(points.length, 6);
  assert.equal(spots.length, 1);
  assert.ok([...points, ...spots].every(light => !light.castShadow));
  assert.ok(points.reduce((sum, light) => sum + light.intensity, 0) <= 215 + 1e-8);
  assert.ok(spots[0].intensity <= 229 && spots[0].distance === 13);
  const roofs = lights.filter(light => light.kind === 'roof');
  assert.ok(roofs.length <= 4 && roofs.every(light => light.reach === 3.7 && light.intensity <= 28));
  return {roofs, spill, lights};
}

test('the Hopkins window match lights the wall, the live roof, and then fades within the shared budget', () => {
  const id = 'hopkins-nine';
  const scenario = {...NEIGHBORHOOD_SCENARIO, patches: [], actors: [], player: {x: 10.82, y: 34.63, tool: 'matches'}};
  const sim = createSimulation({scenario, seed: 1893, config: {fire: {damagePerSecond: 0}}});
  const pool = createStreetFirelight(T, {catalogue: true});
  function render(frame) {
    pool.update(frame, groupStructureFire(frame.structureFire), frame.clocks.world);
    const result = checkBudget(pool);
    assert.ok(result.lights.every(light => light.buildingId === id));
    if (!frame.structureFire.some(site => site.exposed && site.flame > 0 && site.part === 'roof')) {
      assert.equal(result.roofs.length, 0);
    }
    if (!frame.structureFire.some(site => site.exposed && site.flame > 0 && site.part === 'walls')) {
      assert.equal(result.spill, null);
    }
    return result;
  }
  const roofPower = ({roofs}) => roofs.reduce((sum, light) => sum + light.intensity, 0);
  try {
    assert.equal(render(sim.snapshot()).lights.length, 0);
    sim.dispatch({type: 'aim', x: 9.9, y: 34.63});
    sim.dispatch({type: 'primary', pressed: true});
    assert.equal(render(sim.advance(1 / 60)).roofs.length, 0);
    sim.dispatch({type: 'primary', pressed: false});
    const frames = Array.from({length: 88}, () => render(sim.advance(.25)));
    const wall = frames[7], roof = frames[23], fading = frames[59], spent = frames.at(-1);
    assert.equal(wall.roofs.length, 0);
    assert.ok(wall.spill.intensity > 100 && wall.spill.target[0] > wall.spill.position[0]);
    assert.equal(wall.spill.target[1], 0);
    assert.equal(roof.roofs.length, 4);
    assert.ok(roof.roofs.every(light => light.position[1] > light.reach));
    assert.ok(roof.lights.filter(light => light.kind === 'walls').length >= 1);
    assert.ok(roofPower(roof) > 60 && roofPower(fading) > 0 && roofPower(fading) < roofPower(roof));
    assert.equal(spent.lights.length, 0);
    assert.equal(spent.spill, null);
  } finally { pool.dispose(); sim.dispose(); }
});

test('a full pool fades its outgoing roof cluster before relocating and ignores smoke and enclosed flames', () => {
  const pool = createStreetFirelight(T, {catalogue: true});
  const roof = (id, x, z, area = 2) => ({id, x, y: 5, z, area, buildingId: 'lot', part: 'roof',
    nx: 0, ny: 1, nz: 0, exposed: true, flame: 1});
  const initial = [roof('a', 4, 4), roof('b', 4, 8), roof('c', 4, 12), roof('d', 8, 4)];
  const entrant = roof('new', 12, 12, 6);
  const hidden = {...roof('hidden', 11, 11, 10), exposed: false};
  const smoke = {...roof('smoke', 11, 12, 10), flame: 0, smoke: 1};
  const ground = [{x: 10, y: 10}, {x: 7, y: 10}].map(cell => ({...cell, size: .5, intensity: 1,
    surfaceFuel: .3, depositedFuel: 0, phase: 'burning'}));
  const frame = {player: {x: 11, y: 11}, cells: ground};
  const points = pool.root.children.filter(light => light.isPointLight);
  try {
    pool.update(frame, groupStructureFire(initial), 0);
    assert.equal(checkBudget(pool).roofs.length, 4);
    const all = groupStructureFire([...initial, entrant, hidden, smoke]);
    let relocated = false;
    for (let step = 1; step <= 36; step++) {
      const before = points.map(light => ({position: light.position.clone(), intensity: light.intensity}));
      pool.update(frame, all, step / 60);
      const {lights} = checkBudget(pool);
      assert.equal(lights.filter(light => light.kind === 'terrain').length, 2);
      assert.equal(pool.diagnostics().surfaceSites, 5);
      points.forEach((light, i) => {
        if (light.position.distanceTo(before[i].position) < 2) return;
        assert.ok(before[i].intensity < .5, 'a slot can only relocate after dimming');
        relocated = true;
      });
    }
    assert.ok(relocated && checkBudget(pool).roofs.some(({position}) => position[0] === entrant.x && position[2] === entrant.z));
    pool.update({...frame, cells: []}, groupStructureFire([hidden, smoke]), 0);
    assert.deepEqual(checkBudget(pool).lights, []);
  } finally { pool.dispose(); }
  assert.equal(pool.root.children.length, 0);
});

test('the shared replay pool keeps its original long-range roof and adds no spotlight', () => {
  const pool = createStreetFirelight(T);
  try {
    const sites = groupStructureFire([{id: 'ashland/roof', buildingId: 'ashland', part: 'roof', exposed: true,
      x: 5, y: 5, z: 5, nx: 0, ny: 1, nz: 0, area: 2, flame: .9}]);
    pool.update({player: {x: 6, y: 6}}, sites, 1);
    const {lights, spill} = pool.diagnostics();
    assert.equal(pool.root.children.length, 6);
    assert.ok(pool.root.children.every(light => light.isPointLight));
    assert.equal(spill, undefined);
    assert.equal(lights.length, 1);
    assert.ok(lights[0].kind === 'roof' && lights[0].reach > 3.7);
  } finally { pool.dispose(); }
});
