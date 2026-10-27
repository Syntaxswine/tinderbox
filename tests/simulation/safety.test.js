import {test} from 'node:test';
import assert from 'node:assert/strict';
import {createSimulation} from '../../src/simulation/index.js';
const close = (a, b, eps = 1e-8) => assert.ok(Math.abs(a - b) <= eps, `${a} != ${b}`);
const run = (sim, seconds) => { for (let i = 0; i < Math.round(seconds * 60); i++) sim.advance(1 / 60); return sim.snapshot(); };
const plain = extras => ({width: 12, height: 8, player: {x: 1, y: 1}, obstacles: [], actors: [], ...extras});

test('withheld thin-wall layout shields another drum and actor from the blast', () => {
  const drum = (id, x) => ({id, x, y: 4.25, width: 0.656, depth: 0.656, height: 0.8, material: 'steel', kind: 'barrel'});
  const sim = createSimulation({scenario: plain({
    obstacles: [drum('source', 5.25), drum('protected', 7.25), {id: 'shield', x: 6.25, y: 4, width: 0.1, depth: 8, height: 2, material: 'masonry', kind: 'wall'}],
    actors: [{id: 'exposed', x: 4.25, y: 4.25, hp: 100}, {id: 'shielded', x: 7.25, y: 5, hp: 100}],
    ignitions: [{x: 5.25, y: 4.25, radius: 0.01, heat: 3}]
  }), config: {fire: {damagePerSecond: 0}}});
  const s = run(sim, 1);
  assert.deepEqual(s.events.filter(e => e.type === 'barrel-explosion').map(e => e.objectId), ['source']);
  assert.ok(s.actors.find(a => a.id === 'exposed').hp < 100); close(s.actors.find(a => a.id === 'shielded').hp, 100);
  assert.ok(s.world.obstacles.some(o => o.id === 'protected'));
  assert.ok(s.cells.filter(c => c.x > 6.5).every(c => c.heat === 0));
});

test('thin combustible fence has finite coverage fuel and retires only after burnout', () => {
  const fence = {id: 'thin-fence', x: 8.1, y: 4, width: 0.1, depth: 4, height: 1.2, material: 'wood', kind: 'fence'};
  const sim = createSimulation({scenario: plain({obstacles: [fence], ignitions: [{x: 8.1, y: 4.25, radius: 0.1, heat: 3}]})});
  let s = sim.advance(1 / 60);
  close(s.cells.reduce((n, c) => n + c.surfaceFuel, 0), 0.1 * 4 * 1.2);
  assert.ok(s.cells.some(c => c.material === 'wood' && c.phase === 'burning'));
  assert.ok(s.world.obstacles.some(o => o.id === 'thin-fence'));
  s = run(sim, 8); assert.equal(s.world.obstacles.length, 0);
  assert.equal(s.events.filter(e => e.type === 'obstacle-burnout' && e.objectId === 'thin-fence').length, 1);
});

test('a source that exhausts before its travel deadline cannot ignite the whole trail', () => {
  const sim = createSimulation({scenario: plain({
    fuelLines: [{from: {x: 1.25, y: 3.25}, to: {x: 6.25, y: 3.25}, litresPerMetre: 0.08}],
    ignitions: [{x: 1.25, y: 3.25, heat: 2, radius: 0.01}]
  }), config: {fuel: {gasBurnRate: 1}}});
  const s = run(sim, 2);
  assert.equal(s.diagnostics.burningCells, 0);
  assert.ok(s.cells.some(c => c.depositedFuel > 0));
  assert.equal(s.events.filter(e => e.type === 'ignition').length, 1);
});

test('Molotov follows its visible arc over a low crate and hits a tall building first', () => {
  function thrown(height) {
    const sim = createSimulation({scenario: plain({player: {x: 2, y: 4, tool: 'molotov'},
      obstacles: [{id: 'obstruction', x: 4, y: 4, width: 0.5, depth: 1, height, material: 'masonry', kind: 'wall'}]})});
    sim.dispatch({type: 'aim', x: 7, y: 4}); sim.dispatch({type: 'primary', pressed: true});
    return run(sim, 1).events.find(e => e.type === 'molotov-impact');
  }
  close(thrown(0.5).x, 7); assert.ok(thrown(3).x < 3.75);
});

test('powder slows environmental damage and burnout, not its own active-duration clock', () => {
  function burning(powder) {
    const sim = createSimulation({scenario: plain({player: {x: 3.25, y: 5.25},
      fuelLines: [{from: {x: 3, y: 5.25}, to: {x: 3.5, y: 5.25}, litresPerMetre: 1}],
      ignitions: [{x: 3.25, y: 5.25, heat: 4, radius: 0.01}]})});
    if (powder) sim.dispatch({type: 'drug', drug: 'powder'});
    return run(sim, 2);
  }
  const normal = burning(false), powder = burning(true);
  close((100 - powder.player.hp) / (100 - normal.player.hp), 0.35);
  close(powder.diagnostics.fuel.burnedDepositedFuel / normal.diagnostics.fuel.burnedDepositedFuel, 0.35);
  close(powder.effects.powder.remaining, 6);
});

test('empty held tools and invalid throws consume no invented fuel or items', () => {
  const sim = createSimulation({scenario: plain({player: {x: 2, y: 4, tool: 'torch', inventory: {torchFuel: 0.001}}})});
  sim.dispatch({type: 'primary', pressed: true}); let s = run(sim, 1);
  close(s.player.inventory.torchFuel, 0); assert.equal(s.player.usingTool, false);
  assert.equal(s.events.filter(e => e.type === 'tool-empty').length, 1);
  sim.dispatch({type: 'select-tool', tool: 'molotov'}); sim.dispatch({type: 'aim', x: 10, y: 4}); sim.dispatch({type: 'primary', pressed: true});
  s = sim.advance(1 / 60); assert.equal(s.player.inventory.molotovs, 4); assert.equal(s.projectiles.length, 0);
});

test('repeated inversion refreshes without toggling off or changing aim and selected tool', () => {
  const sim = createSimulation({scenario: plain({player: {x: 6, y: 4, tool: 'jerry-can'}}), config: {input: {cameraRelative: false}}});
  sim.dispatch({type: 'drug', drug: 'inversion'}); run(sim, 1);
  sim.dispatch({type: 'drug', drug: 'inversion'}); sim.dispatch({type: 'move', x: 1, y: 1}); sim.dispatch({type: 'aim', x: 9, y: 2});
  const s = sim.advance(1 / 60);
  assert.ok(s.player.x < 6 && s.player.y < 4); close(s.effects.inversion.remaining, 8 - 1 / 60);
  assert.equal(s.player.tool, 'jerry-can'); assert.deepEqual(s.aim, {x: 9, y: 2}); assert.equal(s.player.inventory.inversion, 1);
});

test('malformed dimensions, health and config fail before any nonfinite snapshot is produced', () => {
  for (const config of [{player: {speed: '3'}}, {input: {cameraRelative: 'yes'}}, {step: 0}, {events: {capacity: 0}}]) {
    assert.throws(() => createSimulation({config}));
  }
  for (const scenario of [plain({tileSize: 0}), plain({fireCellSize: '0.5'}), plain({player: {x: NaN, y: 2}}),
    plain({actors: [{id: 'bad', x: 2, y: 2, hp: NaN}]}), plain({obstacles: [{id: 'bad', x: 2, y: 2, width: 0, depth: 1, height: 1}]})]) {
    assert.throws(() => createSimulation({scenario}));
  }
});

test('tool selection stops pouring and the old trigger while preserving an active raw stick', () => {
  const sim = createSimulation({scenario: plain({player: {x: 3, y: 4, tool: 'jerry-can'}}), config: {input: {cameraRelative: false}}});
  sim.dispatch({type: 'primary', pressed: true}); sim.dispatch({type: 'move', x: 1, y: 0});
  const before = run(sim, 0.25);
  sim.dispatch({type: 'select-tool', tool: 'flamethrower'}); const after = sim.advance(1 / 60);
  assert.equal(after.player.pouring, false); assert.equal(after.player.usingTool, false);
  close(after.player.inventory.gas, before.player.inventory.gas); close(after.player.inventory.flamethrowerFuel, 6);
  assert.ok(after.player.x > before.player.x);
});
