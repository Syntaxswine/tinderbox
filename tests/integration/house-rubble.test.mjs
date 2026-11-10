import test from 'node:test';
import assert from 'node:assert/strict';
import * as T from '../../src/runtime/three.js';
import {createSimulation, DEFAULT_CONFIG} from '../../src/simulation/index.js';
import {NEIGHBORHOOD_SCENARIO} from '../../src/content/neighborhood.js';
import {HOUSING_PLANS} from '../../src/content/housing-plans.js';
import {RUBBLE_BURN_SECONDS, createBurnedHouseRubble} from '../../src/art/burned-house-rubble.js';
import {createGroundField} from '../../src/art/ground-field.js';
import {createFire} from '../../src/art/fire.js';
import {createStreetFirelight} from '../../src/art/street-firelight.js';

test('an ordinary house collapse starts hot rubble, shares the fire batches and cools on world time', () => {
  const house = NEIGHBORHOOD_SCENARIO.buildings.find(b => b.id === 'hopkins-fifteen');
  const sim = createSimulation({scenario: {id: 'neighborhood', width: 31, height: 21,
    player: {x: 24.82, y: 8.5, tool: 'matches'}, buildings: [house]}, seed: 1893});
  const layer = createBurnedHouseRubble(T), field = createGroundField(T);
  const lights = createStreetFirelight(T), atlas = new T.Texture();
  const fire = createFire(T, {flame: atlas, smoke: atlas, burst: atlas}, field.uniforms);
  const actor = {id: 'burning-mover', x: 24, y: 8, hp: 80, height: 1.7, radius: .5, heading: .6, burn: {ignitedAt: 0, expiresAt: 100}};
  function present(snapshot, withActor = false) {
    const time = snapshot.clocks.world, pockets = layer.update(snapshot, time);
    field.update(snapshot);
    fire.update(withActor ? {...snapshot, actors: [actor]} : snapshot, time, {rubble: pockets});
    lights.update(snapshot, new Map(), time, pockets);
    return pockets;
  }
  try {
    assert.deepEqual(present(sim.snapshot()), []);
    assert.equal(layer.root.children.length, 0);
    sim.dispatch({type: 'aim', x: 23.9, y: 8.5});
    sim.dispatch({type: 'primary', pressed: true});
    let snapshot = sim.advance(DEFAULT_CONFIG.step);
    assert.equal(snapshot.events.find(e => e.type === 'structure-ignition')?.buildingId, house.id);
    sim.dispatch({type: 'primary', pressed: false});
    for (let n = 0; n < 108 && !snapshot.world.buildings[0].destroyed; n++) snapshot = sim.advance(.25);
    const retirement = snapshot.events.find(e => e.type === 'building-burnout' && e.buildingId === house.id);
    assert.ok(retirement && snapshot.world.buildings[0].destroyed);
    assert.ok(snapshot.world.obstacles.every(box => box.buildingId !== house.id));
    const hot = present(snapshot, true), ruin = layer.root.children[0];
    assert.equal(hot.length, 5);
    assert.ok(hot.every(pocket => pocket.flame > 0 && pocket.glow > 0 && pocket.smoke > 0));
    assert.equal(layer.diagnostics()[0].retiredAt, retirement.worldTime);
    assert.equal(ruin.rotation.y, -Math.PI);
    assert.deepEqual(ruin.position.toArray(), [house.x, 0, house.y]);
    assert.equal(fire.diagnostics().rubbleFlameCards, 5);
    assert.equal(fire.diagnostics().rubbleSmokeCards, 5);
    assert.equal(fire.diagnostics().actorFlameCards, 2);
    assert.ok(lights.diagnostics().lights.length > 0 && lights.diagnostics().lights.length <= 6);
    assert.ok(lights.diagnostics().lights.every(light => light.kind === 'rubble' && light.intensity <= 4 && light.reach === 3));

    sim.dispatch({type: 'pause', paused: true});
    snapshot = sim.advance(.25);
    assert.deepEqual(present(snapshot), hot);
    sim.dispatch({type: 'pause', paused: false});
    while (snapshot.clocks.world < retirement.worldTime + 21) snapshot = sim.advance(.25);
    const smolder = present(snapshot);
    assert.equal(smolder.length, 5);
    assert.ok(smolder.every((pocket, i) => pocket.flame === 0 && pocket.glow < hot[i].glow && pocket.smoke < hot[i].smoke));
    assert.equal(fire.diagnostics().rubbleFlameCards, 0);
    assert.equal(fire.diagnostics().rubbleSmokeCards, 5);
    while (snapshot.clocks.world < retirement.worldTime + RUBBLE_BURN_SECONDS) snapshot = sim.advance(.25);
    assert.deepEqual(present(snapshot), []);
    assert.equal(layer.root.children[0], ruin);
    assert.equal(layer.diagnostics()[0].glowing, false);
    assert.equal(fire.diagnostics().rubbleFlameCards, 0);
    assert.equal(fire.diagnostics().rubbleSmokeCards, 0);
    assert.deepEqual(lights.diagnostics().lights, []);

    let disposed = 0;
    for (const mesh of ruin.children) mesh.geometry.addEventListener('dispose', () => disposed++);
    ruin.children[1].material.addEventListener('dispose', () => disposed++);
    sim.dispatch({type: 'reset'});
    assert.deepEqual(present(sim.advance(DEFAULT_CONFIG.step)), []);
    assert.equal(layer.root.children.length, 0);
    assert.equal(disposed, 3);
  } finally {
    layer.dispose();layer.dispose();
    lights.dispose();fire.dispose();field.dispose();atlas.dispose();sim.dispose();
  }
});

test('the artist ruin stays inside every native footprint and a late mount is cold without a burnout time', () => {
  const layer = createBurnedHouseRubble(T);
  const buildings = Object.keys(HOUSING_PLANS).flatMap(prefabId => [0, 1, 2, 3].map(quarterTurns => ({
    id: prefabId + '/' + quarterTurns, prefabId, x: 10, y: 10, quarterTurns, destroyed: true
  })));
  try {
    assert.deepEqual(layer.update({world: {buildings}, tick: 0}, 0), []);
    assert.equal(layer.root.children.length, 24);
    for (const [index, ruin] of layer.root.children.entries()) {
      const {prefabId, quarterTurns} = buildings[index], {width, depth} = HOUSING_PLANS[prefabId];
      assert.equal(ruin.rotation.y, -quarterTurns * Math.PI / 2);
      for (const mesh of ruin.children) {
        const positions = mesh.geometry.attributes.position;
        for (let i = 0; i < positions.count; i++) {
          const x = positions.getX(i), y = positions.getY(i), z = positions.getZ(i);
          assert.ok(x >= 0 && x <= width && z >= 0 && z <= depth && y >= 0 && y < .85);
        }
      }
    }
  } finally { layer.dispose(); }
  assert.equal(layer.root.children.length, 0);
});
