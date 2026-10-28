import test from 'node:test';
import assert from 'node:assert/strict';
import {createSimulation} from '../../src/simulation/index.js';
import {freePoint} from '../../src/simulation/geometry.js';

// Architect-held-out layout: the gate is turned across the original scene's
// direction, and the bear crosses near one side of its usable opening.
function fixture({closed = false, skin = 'inherited-plaster'} = {}) {
  const skinSlots = {facade: skin, trim: 'inherited-cream', door: 'inherited-wood', roof: 'inherited-roof'};
  const sourceRefs = ['game:architect-rotated-gate-review'];
  return {id: 'architect-rotated-gate', width: 12, height: 12,
    player: {x: 2, y: 6.08, tool: 'jerry-can'}, obstacles: [], actors: [],
    modules: [
      {id: 'turned-gate', form: 'doorway', x: 6, y: 6, heading: Math.PI / 2,
        width: 4, depth: 0.3, height: 3.2, physicalMaterial: 'wood', skinSlots: {...skinSlots}, sourceRefs,
        opening: {width: 1.4, height: 2.3, state: closed ? 'closed' : 'open'}},
      {id: 'overhead-roof', form: 'roof-hip', x: 6, y: 6, heading: Math.PI / 2,
        width: 4, depth: 4, height: 1.2, baseHeight: 3.2, supportModuleIds: ['turned-gate'],
        physicalMaterial: 'wood', skinSlots: {...skinSlots}, sourceRefs}
    ]};
}
const near = (actual, expected, message) => assert.ok(Math.abs(actual - expected) < 1e-7, `${message}: ${actual} != ${expected}`);
function run(scenario, schedule) {
  const sim = createSimulation({scenario, seed: 1893, config: {input: {cameraRelative: false}}});
  try {
    sim.dispatch({type: 'primary', pressed: true});
    sim.dispatch({type: 'drug', drug: 'powder'});
    sim.dispatch({type: 'move', x: 1, y: 0});
    for (const delta of schedule) {
      const s = sim.advance(delta);
      assert.ok(freePoint(s.player, s.player.radius, s.world, s.world.obstacles), 'Accepted player position penetrated a solid');
    }
    return sim.snapshot();
  } finally { sim.dispose(); }
}

test('Architect review: powder pouring crosses a turned open gate beneath a roof at every render schedule', () => {
  const schedules = [30, 60, 120].map(hz => Array(hz * 1.5).fill(1 / hz));
  schedules.push([0.2, ...Array(39).fill(1 / 30)]);
  const results = schedules.map(schedule => run(fixture(), schedule));
  for (const s of results) {
    near(s.clocks.active, 1.5, 'Active time'); near(s.clocks.world, 0.525, 'World time');
    near(s.player.x, 8.75, 'Crossed gate'); near(s.player.y, 6.08, 'Near-edge path');
    near(s.player.travelled, 6.75, 'Accepted distance'); near(s.player.inventory.gas, 3.46, 'Distance-accounted stock');
    near(s.cells.reduce((n, c) => n + c.depositedFuel, 0), 0.54, 'Deposited fuel');
    assert.ok(s.player.pouring && s.effects.powder.active);
    const wet = s.cells.filter(c => c.depositedFuel > 0).sort((a, b) => a.x - b.x);
    assert.ok(wet.length >= 14, 'Fuel trail is incomplete');
    for (let i = 1; i < wet.length; i++) near(wet[i].x - wet[i - 1].x, 0.5, 'Fuel trail gap');
    assert.equal(s.diagnostics.droppedRealSeconds, 0);
  }
  for (const s of results.slice(1)) {
    assert.deepEqual(s.player, results[0].player);
    assert.deepEqual(s.cells, results[0].cells);
  }
});

test('Architect review: closed gate stops the same powder path and charges only accepted pouring distance', () => {
  const s = run(fixture({closed: true}), Array(90).fill(1 / 60));
  assert.ok(s.player.x > 5.3 && s.player.x <= 5.38 + 1e-7, 'Bear passed or stopped away from the closed door');
  near(4 - s.player.inventory.gas, s.player.travelled * 0.08, 'Closed-door fuel accounting');
  near(s.diagnostics.fuel.pouredFuel, s.player.travelled * 0.08, 'Closed-door fuel ledger');
});

test('Architect review: changing facade skin leaves movement, fuel and physical cell state identical', () => {
  const schedule = Array(90).fill(1 / 60);
  const plaster = run(fixture(), schedule), brick = run(fixture({skin: 'inherited-brick'}), schedule);
  assert.deepEqual(brick.player, plaster.player);
  assert.deepEqual(brick.cells, plaster.cells);
  assert.deepEqual(brick.clocks, plaster.clocks);
  assert.deepEqual(brick.world.obstacles, plaster.world.obstacles);
});
