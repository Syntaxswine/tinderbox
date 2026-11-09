import test from 'node:test';
import assert from 'node:assert/strict';
import {createSimulation, DEFAULT_CONFIG, movementVector} from '../../src/simulation/index.js';
import {COTTAGE_PAIR_SCENARIO} from '../../src/content/cottage-pair.js';
import {NEIGHBORHOOD_BASE, NEIGHBORHOOD_SCENARIO} from '../../src/content/neighborhood.js';
import {calmCottageWind} from '../../src/reuse/ashland/wind.js';

const step = 1 / 60;
const near = (actual, expected) => assert.ok(Math.abs(actual - expected) < 1e-8, `${actual} != ${expected}`);
const lastUse = snapshot => snapshot.events.findLast(event => event.type === 'tool-use' || event.type === 'tool-rejected');
const ground = {width: 12, height: 12, player: {x: 6.25, y: 6.25, heading: -Math.PI / 2},
  patches: [{x: 0, y: 0, width: 12, depth: 12, material: 'grass'}]};
function press(sim) {
  sim.dispatch({type: 'primary', pressed: false});
  sim.dispatch({type: 'primary', pressed: true});
  return sim.advance(step);
}

test('a match follows spawn facing and then the new world direction after movement, even with a stale exact aim', () => {
  const sim = createSimulation({scenario: ground});
  try {
    const first = press(sim);
    assert.deepEqual(lastUse(first).tile, {x: 6, y: 5, width: 1, depth: 1});
    sim.dispatch({type: 'aim', x: 6.25, y: 6.7});
    const aimed = sim.advance(step);
    near(aimed.player.heading, Math.PI / 2);
    const move = {type: 'move', x: 1, y: 0};
    sim.dispatch({type: 'drug', drug: 'inversion'});
    sim.dispatch(move);
    const turned = press(sim), use = lastUse(turned);
    const direction = movementVector(move, true, DEFAULT_CONFIG.input);
    near(turned.player.heading, Math.atan2(direction.y, direction.x));
    near(use.x, aimed.player.x + direction.x * DEFAULT_CONFIG.tools.matches.range);
    near(use.y, aimed.player.y + direction.y * DEFAULT_CONFIG.tools.matches.range);
    assert.deepEqual(turned.aim, {x: 6.25, y: 6.7});
    assert.equal(turned.player.inventory.matches, 10);
  } finally { sim.dispose(); }
});

test('a blocked step can turn the player to strike or torch the same ordinary Catalogue Street siding', () => {
  for (const tool of ['matches', 'torch']) {
    const scenario = {...NEIGHBORHOOD_BASE, player: {x: 10.65, y: 34.63, tool}, patches: [], actors: []};
    const sim = createSimulation({scenario, config: {input: {cameraRelative: false}}});
    try {
      sim.dispatch({type: 'move', x: -1, y: 0});
      const turned = sim.advance(step);
      near(turned.player.x, scenario.player.x);
      near(Math.cos(turned.player.heading), -1);
      assert.equal(turned.player.moving, false);
      sim.dispatch({type: 'move', x: 0, y: 0});
      if (tool === 'torch') {
        const lit = press(sim);
        assert.equal(lastUse(lit).result, 'lit');
        assert.ok(sim.advance(.2).cells.every(cell => cell.heat === 0));
      }
      const struck = press(sim), use = lastUse(struck);
      assert.equal(use.result, 'ignited');
      assert.deepEqual(use.cellIds, ['hopkins-nine/wall:0:7,4|7,5:0']);
      near(use.x, 10.08);
      assert.equal(struck.structureFire[0].id, use.cellIds[0]);
      assert.ok(struck.cells.every(cell => cell.heat === 0 && cell.surfaceFuel === 0));
      if (tool === 'torch') {
        assert.equal(struck.discharge.active, true);
        near(struck.discharge.lead.to.x, 10.0901);
        near(struck.discharge.lead.to.y, use.y);
        assert.ok(struck.discharge.rays.some(ray => ray.distance > .1));
        assert.ok(struck.discharge.rays.every(ray => ray.x >= 10.09 - 1e-8));
      }
    } finally { sim.dispose(); }
  }
});

test('a thin masonry screen stops close heat before ordinary siding', () => {
  const barrier = {id: 'masonry-screen', x: 10.17, y: 34.63, width: .05, depth: 2, height: 2, material: 'masonry'};
  for (const tool of ['matches', 'torch']) {
    const scenario = {...NEIGHBORHOOD_SCENARIO, player: {x: 10.9, y: 34.63, heading: Math.PI, tool},
      patches: [], actors: [], obstacles: [barrier]};
    const sim = createSimulation({scenario});
    try {
      if (tool === 'torch') press(sim);
      const snapshot = press(sim);
      assert.equal(lastUse(snapshot).reason, 'blocked');
      assert.equal(snapshot.discharge.active, false);
      assert.deepEqual(snapshot.structureFire, []);
      assert.ok(snapshot.cells.every(cell => cell.heat === 0));
    } finally { sim.dispose(); }
  }
});

test('only real clipped flamethrower rays heat ordinary wood siding', () => {
  const hopkins = NEIGHBORHOOD_SCENARIO.buildings.find(building => building.id === 'hopkins-nine');
  const barrier = {id: 'masonry-screen', x: 10.49, y: 34.63, width: .05, depth: 2.5, height: 2, material: 'masonry'};
  for (const blocked of [false, true]) {
    const scenario = {id: 'neighborhood', width: 16, height: 44, buildings: [hopkins], obstacles: blocked ? [barrier] : [],
      player: {x: 12, y: 34.63, tool: 'flamethrower'}};
    const sim = createSimulation({scenario});
    try {
      sim.dispatch({type: 'aim', x: 9.9, y: 34.63});
      sim.dispatch({type: 'primary', pressed: true});
      sim.advance(.25);
      const snapshot = sim.advance(.1);
      const first = snapshot.events.find(event => event.type === 'structure-ignition');
      assert.ok(snapshot.discharge.rays.some(ray => ray.obstacleId === (blocked ? barrier.id : hopkins.id + ':foundation')));
      if (blocked) {
        assert.equal(first, undefined);
        assert.deepEqual(snapshot.structureFire, []);
      } else {
        assert.equal(first?.cause, 'flamethrower');
        assert.ok(snapshot.structureFire.some(site => site.x === 10.08 && site.flame > 0));
      }
      assert.ok(snapshot.cells.every(cell => cell.surfaceFuel === 0));
    } finally { sim.dispose(); }
  }
});

test('a match at bare Monroe brick does not heat a structural or ground site', () => {
  const monroe = NEIGHBORHOOD_SCENARIO.buildings.find(building => building.id === 'monroe-row-middle');
  const scenario = {id: 'neighborhood', width: 43, height: 47, buildings: [monroe],
    player: {x: 37.3, y: 30.35, tool: 'matches'}};
  const sim = createSimulation({scenario});
  try {
    sim.dispatch({type: 'aim', x: 37.3, y: 31.15});
    const snapshot = press(sim);
    assert.equal(lastUse(snapshot).reason, 'blocked');
    assert.deepEqual(snapshot.structureFire, []);
    assert.ok(snapshot.cells.every(cell => cell.heat === 0));
  } finally { sim.dispose(); }
});

test('a spent siding target reports no fuel and reset restores its stable site ID', () => {
  const hopkins = NEIGHBORHOOD_SCENARIO.buildings.find(building => building.id === 'hopkins-nine');
  const scenario = {id: 'neighborhood', width: 16, height: 44, buildings: [hopkins],
    player: {x: 10.82, y: 34.63, tool: 'matches', heading: Math.PI}};
  const sim = createSimulation({scenario, config: {fuel: {surfaceBurnRate: 1.5}}});
  try {
    const initial = press(sim);
    const [first] = initial.structureFire;
    sim.dispatch({type: 'drug', drug: 'powder'});
    const slowed = sim.advance(.25);
    near(slowed.clocks.world - initial.clocks.world, .25 * DEFAULT_CONFIG.drugs.worldScale);
    assert.equal(slowed.structureFire[0].id, first.id);
    sim.advance(.25);
    const spent = press(sim);
    assert.equal(lastUse(spent).reason, 'no-fuel');
    assert.deepEqual(spent.structureFire, []);
    assert.ok(spent.world.buildings[0].sections.every(section => section.present));
    sim.dispatch({type: 'reset'});
    const reset = sim.advance(step);
    assert.deepEqual(reset.structureFire, []);
    assert.equal(reset.effects.powder.active, false);
    assert.equal(press(sim).structureFire[0].id, first.id);
  } finally { sim.dispose(); }
});

test('the thrown lantern uses actual timber contact or the ground field that heats an explosive barrel', () => {
  const hopkins = NEIGHBORHOOD_SCENARIO.buildings.find(building => building.id === 'hopkins-nine');
  const barrel = {id: 'drum', x: 10.82, y: 34.63, width: .656, depth: .656, height: .8, material: 'steel', kind: 'barrel'};
  for (const onBarrel of [false, true]) {
    const scenario = {id: 'neighborhood', width: 16, height: 44, buildings: [hopkins], obstacles: onBarrel ? [barrel] : [],
      player: {x: 13.25, y: 34.63, tool: 'molotov'}};
    const sim = createSimulation({scenario, config: {input: {cameraRelative: false}, fire: {damagePerSecond: 0}}});
    try {
      press(sim);
      const reach = scenario.player.x - (onBarrel ? barrel.x : 8.5);
      sim.dispatch({type: 'move', x: -(.12 + .88 * reach / 6), y: 0});
      sim.dispatch({type: 'move', x: 0, y: 0});
      const preview = sim.advance(step).player.lanternAim.impact;
      let snapshot = press(sim);
      for (let i = 0; i < 40 && !snapshot.events.some(event => event.type === 'molotov-impact'); i++) snapshot = sim.advance(step);
      assert.equal(snapshot.events.filter(event => event.type === 'molotov-impact').length, 1);
      const impact = snapshot.events.find(event => event.type === 'molotov-impact');
      for (const key of ['x', 'y', 'h']) near(impact[key], preview[key]);
      const ignition = snapshot.events.find(event => event.type === 'structure-ignition');
      if (onBarrel) {
        assert.equal(ignition, undefined);
        assert.equal(snapshot.events.filter(event => event.type === 'barrel-explosion').length, 1);
        assert.ok(snapshot.events.some(event => event.type === 'ignition' && event.cause === 'molotov'));
      } else {
        assert.equal(ignition?.cause, 'molotov');
        assert.equal(snapshot.structureFire.length, 1);
        assert.ok(snapshot.cells.every(cell => cell.phase !== 'burning'));
      }
    } finally { sim.dispose(); }
  }
});

test('both tools reach the native Ashland siding from spawn, with a real barrier stopping either press', () => {
  const barrier = {id: 'masonry-shield', x: 52.15, y: 13.5, width: .04, depth: 1.4, height: 2, material: 'masonry'};
  for (const tool of ['matches', 'torch']) for (const shielded of [false, true]) {
    const scenario = {...COTTAGE_PAIR_SCENARIO, player: {...COTTAGE_PAIR_SCENARIO.player, tool}};
    if (shielded) scenario.obstacles = [...scenario.obstacles, barrier];
    const sim = createSimulation({scenario, cottageWind: calmCottageWind});
    try {
      if (tool === 'torch') {
        const lit = press(sim);
        assert.equal(lit.player.torch.phase, 'lit');
        assert.equal(lit.discharge.active, false);
        assert.equal(sim.advance(.2).cottageFire.buildings[0].firstIgnition, null);
      }
      const snapshot = press(sim), use = lastUse(snapshot), ignition = snapshot.cottageFire.buildings[0].firstIgnition;
      if (shielded) {
        assert.equal(use.type, 'tool-rejected');
        assert.equal(use.heatedCells, 0);
        assert.equal(ignition, null);
        assert.equal(snapshot.discharge.active, false);
      } else {
        assert.equal(ignition.kind, tool);
        assert.equal(ignition.cellId, 'right:3,0');
        assert.deepEqual(use.cellIds, ['right:3,0']);
        near(use.x, 52.09);
        if (tool === 'torch') {
          near(snapshot.discharge.lead.to.x, use.x);
          near(snapshot.discharge.lead.to.y, use.y);
          near(snapshot.discharge.lead.to.h, snapshot.cottageFire.buildings[0].cells[0].y);
        }
      }
    } finally { sim.dispose(); }
  }
});
