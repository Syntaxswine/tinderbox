import test from 'node:test';
import assert from 'node:assert/strict';
import {createSimulation, DEFAULT_CONFIG, movementVector} from '../../src/simulation/index.js';
import {COTTAGE_PAIR_SCENARIO} from '../../src/content/cottage-pair.js';
import {NEIGHBORHOOD_SCENARIO} from '../../src/content/neighborhood.js';
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
    const scenario = {...NEIGHBORHOOD_SCENARIO, player: {x: 10.65, y: 34.63, tool}, patches: [], actors: []};
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
      assert.deepEqual(use.cellIds, ['cell:20,69']);
      near(use.x, 10.09);
      if (tool === 'torch') {
        assert.equal(struck.discharge.active, true);
        near(struck.discharge.lead.to.x, use.x);
        near(struck.discharge.lead.to.y, use.y);
        assert.ok(struck.discharge.rays.every(ray => ray.x >= use.x - 1e-8));
      }
    } finally { sim.dispose(); }
  }
});

test('a thin masonry screen stops close heat before the shared ground cell of ordinary siding', () => {
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
      assert.ok(snapshot.cells.every(cell => cell.heat === 0));
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
