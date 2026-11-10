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

test('a retiring native Hopkins section warms paving and ignites a previously green grass strip', t => {
  const house = NEIGHBORHOOD_SCENARIO.buildings.find(b => b.id === 'hopkins-fifteen');
  const strip = x => ({x, y: 7, width: .5, depth: 3, material: 'grass'});
  const sim = createSimulation({scenario: {id: 'neighborhood', width: 31, height: 21,
    player: {x: 24.82, y: 8.5, tool: 'matches'}, buildings: [house], patches: [strip(25), strip(26)]},
    config: {fire: {damagePerSecond: 0}}, seed: 1893});
  const layer = createBurnedHouseRubble(T), field = createGroundField(T);
  const lights = createStreetFirelight(T), atlas = new T.Texture();
  const fire = createFire(T, {flame: atlas, smoke: atlas, burst: atlas}, field.uniforms);
  const paving = {x: 24.75, y: 8.75};
  function present(snapshot, withActor = false) {
    const time = snapshot.clocks.world, pockets = layer.update(snapshot, time);
    const actor = {id: 'burning-mover', x: 24, y: 8, hp: 80, height: 1.7, radius: .5, heading: .6,
      burn: {ignitedAt: time, expiresAt: time+4}};
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
    const grass = s => s.cells.filter(cell => cell.material === 'grass');
    while (!snapshot.world.rubble.length && snapshot.clocks.world < 151) {
      assert.ok(grass(snapshot).every(cell => cell.phase === 'cold' && cell.heat === 0));
      snapshot = sim.advance(.25);
    }
    const [first] = snapshot.world.rubble[0].sections;
    assert.ok(first.retainedHeat > 0);
    assert.equal(snapshot.world.buildings[0].destroyed, false);
    assert.ok(snapshot.world.buildings[0].sections.some(section => section.present));
    assert.ok(snapshot.structureFire.some(site => site.flame === 0 && site.smoke > 0));
    const hot = present(snapshot, true), ruin = layer.root.children[0];
    assert.ok(hot.length && hot.every(pocket => pocket.section === first.index && pocket.flame > 0 && pocket.glow > 0));
    assert.equal(layer.diagnostics()[0].retiredAt, first.retiredAt);
    assert.equal(ruin.rotation.y, -Math.PI);
    assert.deepEqual(ruin.position.toArray(), [house.x, 0, house.y]);
    assert.equal(ruin.children.length, 2);
    assert.equal(fire.diagnostics().rubbleFlameCards, hot.length);
    assert.equal(fire.diagnostics().rubbleSmokeCards, hot.length);
    assert.equal(fire.diagnostics().actorFlameCards, 2);
    assert.ok(lights.diagnostics().lights.length > 0 && lights.diagnostics().lights.length <= 6);
    assert.ok(lights.diagnostics().lights.every(light => light.kind === 'rubble' && light.intensity <= 4 && light.reach === 3));

    snapshot = sim.advance(.25);
    const warming = sim.heatIndex(paving, 0);
    assert.ok(warming > 0);
    const pockets = present(snapshot);
    assert.equal(snapshot.diagnostics.localHeatIndex, sim.heatIndex(snapshot.player, 1));
    sim.dispatch({type: 'pause', paused: true});
    snapshot = sim.advance(.25);
    assert.equal(sim.heatIndex(paving, 0), warming);
    assert.deepEqual(present(snapshot), pockets);
    sim.dispatch({type: 'pause', paused: false});
    sim.dispatch({type: 'drug', drug: 'powder'});
    const before = snapshot.clocks.world;
    snapshot = sim.advance(.25);
    assert.ok(Math.abs(snapshot.clocks.world - before - .0875) < 1e-8);
    assert.deepEqual(snapshot.world.rubble[0].sections[0], first);

    let ignition, peak = 0;
    while (snapshot.clocks.world < 192) {
      snapshot = sim.advance(.25);
      ignition ??= snapshot.events.find(event => event.type === 'ignition' && event.x === 25.25);
      peak = Math.max(peak, sim.heatIndex(paving, 0));
      assert.ok(grass(snapshot).filter(cell => cell.x === 26.25).every(cell => cell.phase === 'cold'));
    }
    assert.equal(ignition?.cause, 'rubble');
    assert.ok(ignition.sourceId.startsWith(house.id+'/section:'));
    assert.ok(ignition.worldTime > first.retiredAt);
    assert.ok(peak > warming && peak <= 1);
    assert.equal(sim.heatIndex(paving, 0), 0);
    assert.ok(snapshot.world.buildings[0].destroyed);
    assert.ok(snapshot.world.obstacles.every(box => box.buildingId !== house.id));
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
    snapshot = sim.advance(DEFAULT_CONFIG.step);
    assert.deepEqual(snapshot.world.rubble, []);
    assert.equal(sim.heatIndex(paving), 0);
    assert.deepEqual(present(snapshot), []);
    assert.equal(layer.root.children.length, 0);
    assert.equal(disposed, 3);
    t.diagnostic(JSON.stringify({first, ignition, paving: {warming, peak, cooled: 0}}));
  } finally {
    layer.dispose();layer.dispose();
    lights.dispose();fire.dispose();field.dispose();atlas.dispose();sim.dispose();
  }
});

test('a later hot section does not reopen an old coal bed or remove unignited support', () => {
  const house = NEIGHBORHOOD_SCENARIO.buildings.find(b => b.id === 'hopkins-fifteen');
  const sim = createSimulation({scenario: {id:'neighborhood',width:31,height:21,buildings:[house],
    player:{x:24.82,y:8.5,tool:'matches'}},config:{input:{cameraRelative:false},
    fuel:{surfaceBurnRate:4},fire:{damagePerSecond:0}}});
  const art = createBurnedHouseRubble(T);
  const strike = y => {
    sim.dispatch({type:'aim',x:23.9,y});
    sim.dispatch({type:'primary',pressed:true});
    const s=sim.advance(DEFAULT_CONFIG.step);
    sim.dispatch({type:'primary',pressed:false});
    return s;
  };
  const advanceTo = time => {
    let s=sim.snapshot();
    while(s.clocks.world<time)s=sim.advance(.25);
    return s;
  };
  try {
    const start = strike(8.5);
    const first = start.world.buildings[0].sections.find(section=>section.firstIgnition!==null);
    advanceTo(29);
    sim.dispatch({type:'move',x:0,y:1});
    const moved=sim.advance(.25);
    sim.dispatch({type:'move',x:0,y:0});
    const later = strike(moved.player.y);
    const second = later.world.buildings[0].sections.find(section=>section.index!==first.index&&section.firstIgnition!==null);
    assert.ok(second.firstIgnition>first.firstIgnition+RUBBLE_BURN_SECONDS);
    let snapshot=advanceTo(first.firstIgnition+151);
    assert.ok(art.update(snapshot,snapshot.clocks.world).every(site=>site.section===first.index));
    const ruin=art.root.children[0];
    assert.ok(ruin);
    snapshot=advanceTo(second.firstIgnition+151);
    const retired=snapshot.world.rubble[0].sections;
    assert.deepEqual(retired.map(s=>s.index),[first.index,second.index]);
    assert.ok(retired[0].retiredAt+RUBBLE_BURN_SECONDS<retired[1].retiredAt);
    assert.ok(snapshot.world.buildings[0].sections.filter(section=>section.firstIgnition===null).every(section=>section.present));
    assert.equal(snapshot.world.buildings[0].destroyed,false);
    assert.ok(!snapshot.events.some(event=>event.type==='building-burnout'));
    const hot=art.update(snapshot,snapshot.clocks.world);
    assert.ok(hot.length&&hot.every(site=>site.section===second.index));
    assert.equal(art.root.children[0],ruin);
    assert.equal(art.diagnostics()[0].sections.find(section=>section.index===first.index).glow,0);
    assert.ok(snapshot.world.obstacles.every(box=>box.catalogueSection!==first.index&&box.catalogueSection!==second.index));
  } finally { art.dispose();sim.dispose(); }
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
