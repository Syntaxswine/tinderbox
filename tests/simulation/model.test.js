import {test} from 'node:test';
import assert from 'node:assert/strict';
import {createSimulation, movementVector, worldToStick, DEFAULT_CONFIG} from '../../src/simulation/index.js';
import {rasterSegments} from '../../src/simulation/geometry.js';
const close = (a, b, eps = 1e-8) => assert.ok(Math.abs(a - b) <= eps, `${a} != ${b}`);
const plain = (extra = {}) => ({id: 'test', width: 30, height: 10, player: {x: 3.25, y: 5.25, tool: 'jerry-can'}, obstacles: [], actors: [], ...extra});
const model = (scenario = plain(), config = {}) => createSimulation({scenario, config: {input: {cameraRelative: false}, fire: {damagePerSecond: 0}, ...config}});
function run(sim, seconds, hz = 60) { let snapshot; for (let i = 0; i < Math.round(seconds * hz); i++) snapshot = sim.advance(1 / hz); return snapshot; }
function startPour(sim, direction = {x: 1, y: 0}) { sim.dispatch({type: 'primary', pressed: true}); sim.dispatch({type: 'primary', pressed: false}); sim.dispatch({type: 'move', ...direction}); }
function comparable(snapshot) { const copy = structuredClone(snapshot); delete copy.diagnostics.alpha; delete copy.diagnostics.lastSteps; return copy; }
const fuelTotal = s => s.cells.reduce((n, c) => n + c.depositedFuel, 0);

test('same fixed-tick recording is identical at 30/60/120Hz and bounded hitches', () => {
  const replay = [
    {type: 'primary', pressed: true, atTick: 1}, {type: 'primary', pressed: false, atTick: 1},
    {type: 'move', x: 1, y: 0.4, atTick: 1}, {type: 'drug', drug: 'powder', atTick: 31},
    {type: 'drug', drug: 'inversion', atTick: 91}, {type: 'move', x: -0.4, y: 1, atTick: 121},
    {type: 'cancel-input', atTick: 181}
  ];
  const results = [30, 60, 120].map(hz => { const sim = model(); replay.forEach(c => sim.dispatch(c)); return comparable(run(sim, 4, hz)); });
  assert.deepEqual(results[0], results[1]); assert.deepEqual(results[1], results[2]);
  const hitch = model(); replay.forEach(c => hitch.dispatch(c)); for (let i = 0; i < 20; i++) hitch.advance(0.2);
  assert.deepEqual(comparable(hitch.snapshot()), results[0]);
});

test('exact grid path lengths conserve poured fuel for diagonals, reversals and crossing cell edges', () => {
  for (const [a, b] of [[{x: 1, y: 1}, {x: 3, y: 3}], [{x: 3, y: 3}, {x: 0.7, y: 1.25}], [{x: 2, y: 2}, {x: 2, y: 5}]]) {
    close(rasterSegments(a, b, 0.5).reduce((n, p) => n + p.length, 0), Math.hypot(b.x - a.x, b.y - a.y));
  }
  const sim = model(); startPour(sim, {x: 1, y: 1}); const state = run(sim, 1);
  close(state.player.travelled, 3); close(4 - state.player.inventory.gas, 3 * 0.08); close(fuelTotal(state), 0.24);
  assert.ok(state.cells.filter(c => c.depositedFuel > 0).length >= 5);
});

test('stationary, blocked and wall-slide movement consumes only accepted path fuel', () => {
  const sim = model(plain({obstacles: [{id: 'wall', x: 5, y: 5, width: 0.5, depth: 10, height: 2, material: 'masonry', kind: 'wall'}]}));
  startPour(sim); let s = run(sim, 1); assert.ok(s.player.x <= 4.75 - s.player.radius + 1e-8);
  close(s.diagnostics.fuel.pouredFuel, s.player.travelled * 0.08);
  const remaining = s.player.inventory.gas; s = run(sim, 0.5); close(s.player.inventory.gas, remaining);
  sim.dispatch({type: 'move', x: 1, y: 1}); s = run(sim, 0.5); assert.ok(s.player.y > 5.25);
  close(s.diagnostics.fuel.pouredFuel, s.player.travelled * 0.08);
  sim.dispatch({type: 'move', x: 0, y: 0}); const stopped = run(sim, 1); close(stopped.player.inventory.gas, s.player.inventory.gas);
});

test('pour press is an edge, finite gas stops it, and repeated visits cannot invent fuel', () => {
  const sim = model(plain({player: {x: 3.25, y: 5.25, tool: 'jerry-can', inventory: {gas: 0.1}}}));
  sim.dispatch({type: 'primary', pressed: true}); sim.dispatch({type: 'move', x: 1, y: 0}); for (let i = 0; i < 10; i++) sim.dispatch({type: 'primary', pressed: true});
  const s = run(sim, 1); close(s.player.inventory.gas, 0); close(fuelTotal(s), 0.1); assert.equal(s.player.pouring, false);
  const loop = model(); startPour(loop); run(loop, 1); loop.dispatch({type: 'move', x: -1, y: 0}); const twice = run(loop, 1);
  close(fuelTotal(twice), 0.48); close(4 - twice.player.inventory.gas, 0.48);
});

test('powder is taken while pouring and creates separation from fire pursuing the same trail', () => {
  const normal = model('chase'), powder = model('chase');
  startPour(normal); startPour(powder); powder.dispatch({type: 'drug', drug: 'powder'});
  const a = run(normal, 2), b = run(powder, 2);
  assert.equal(b.player.tool, 'jerry-can'); assert.equal(b.player.pouring, true);
  close(b.player.travelled / a.player.travelled, 1.5); close(b.clocks.world / a.clocks.world, 0.35);
  close(b.actors[0].travelled / a.actors[0].travelled, 0.35);
  assert.ok(a.diagnostics.frontX > 1.25 && b.diagnostics.frontX > 1.25);
  assert.ok(b.player.x - b.diagnostics.frontX > a.player.x - a.diagnostics.frontX + 3);
  close(b.diagnostics.fuel.pouredFuel, b.player.travelled * 0.08);
});

test('inversion is exactly 180 degrees once, before camera projection; aim is independent', () => {
  for (const input of [{cameraRelative: false}, DEFAULT_CONFIG.input]) {
    for (const raw of [{x: 1, y: 1}, {x: 0, y: 1}, {x: -0.2, y: 0.7}]) {
      const normal = movementVector(raw, false, input), inverted = movementVector(raw, true, input);
      close(inverted.x, -normal.x); close(inverted.y, -normal.y);
    }
  }
  const sim = model(); sim.dispatch({type: 'drug', drug: 'inversion'}); sim.dispatch({type: 'move', x: 1, y: 1}); sim.dispatch({type: 'aim', x: 9, y: 2});
  const s = sim.advance(1 / 60); close(s.player.x - 3.25, -3 / 60 / Math.sqrt(2)); close(s.player.y - 5.25, -3 / 60 / Math.sqrt(2));
  assert.deepEqual(s.aim, {x: 9, y: 2});
  const world = {x: 0.6, y: 0.8}; const roundtrip = movementVector(worldToStick(world, DEFAULT_CONFIG.input), false, DEFAULT_CONFIG.input);
  close(roundtrip.x, world.x); close(roundtrip.y, world.y);
});

test('drug timers use unscaled active time, refresh instead of stacking, and pause freezes them', () => {
  const sim = model(); sim.dispatch({type: 'drug', drug: 'powder'}); sim.dispatch({type: 'drug', drug: 'inversion'});
  let s = run(sim, 1); close(s.effects.powder.remaining, 7); close(s.effects.inversion.remaining, 7);
  sim.dispatch({type: 'pause', paused: true}); s = run(sim, 2); close(s.clocks.active, 1); close(s.effects.powder.remaining, 7);
  sim.dispatch({type: 'pause', paused: false}); sim.dispatch({type: 'drug', drug: 'powder'}); s = run(sim, 1);
  close(s.clocks.playerScale, 1.5); close(s.effects.powder.remaining, 7); assert.equal(s.player.inventory.powder, 2);
  s = run(sim, 7); assert.equal(s.effects.powder.active, false); assert.equal(s.effects.inversion.active, false);
  close(s.clocks.playerScale, 1); close(s.clocks.worldScale, 1);
});

test('healing clamps at 100, consumes one pill, and neither selects a tool nor cancels pouring', () => {
  const sim = model(plain({player: {x: 3.25, y: 5.25, hp: 90, tool: 'jerry-can'}})); startPour(sim);
  sim.dispatch({type: 'drug', drug: 'healing'}); let s = sim.advance(1 / 60);
  close(s.player.hp, 100); assert.equal(s.player.inventory.healing, 2); assert.equal(s.player.pouring, true);
  sim.dispatch({type: 'drug', drug: 'healing'}); s = sim.advance(1 / 60); assert.equal(s.player.inventory.healing, 2);
});

test('pause, cancellation and death stop pouring without resuming held input', () => {
  for (const command of [{type: 'pause', paused: true}, {type: 'cancel-input'}]) {
    const sim = model(); startPour(sim); run(sim, 0.1); sim.dispatch(command); let s = sim.advance(1 / 60);
    assert.equal(s.player.pouring, false); assert.equal(s.player.moving, false);
    sim.dispatch({type: 'pause', paused: false}); const x = s.player.x; s = sim.advance(1 / 60); close(s.player.x, x);
  }
  const dying = createSimulation({scenario: plain({player: {x: 3.25, y: 5.25, hp: 0.001, tool: 'jerry-can'},
    fuelLines: [{from: {x: 2, y: 5.25}, to: {x: 5, y: 5.25}, litresPerMetre: 0.08}],
    ignitions: [{x: 3.25, y: 5.25, heat: 3, radius: 0.1}]}), config: {input: {cameraRelative: false}}});
  startPour(dying); const dead = dying.advance(1 / 60); close(dead.player.hp, 0); assert.equal(dead.player.pouring, false);
});

test('finite fire advances locally from prior state, conserves fuel and burns out', () => {
  const scenario = plain({fuelLines: [{from: {x: 1.25, y: 2.25}, to: {x: 6.25, y: 2.25}, litresPerMetre: 0.08}], ignitions: [{x: 1.25, y: 2.25, radius: 0.05, heat: 2}]});
  const sim = model(scenario, {fuel: {gasBurnRate: 0.08}}); let s = sim.advance(1 / 60);
  assert.equal(s.cells.filter(c => c.phase === 'burning').length, 1);
  s = run(sim, 0.5); assert.ok(s.diagnostics.frontX < 1.25 + 4 * s.clocks.world + 0.5);
  s = run(sim, 5); assert.equal(s.diagnostics.burningCells, 0); close(fuelTotal(s), 0);
  close(s.diagnostics.fuel.fixtureFuel, s.diagnostics.fuel.burnedDepositedFuel);
  assert.ok(s.cells.some(c => c.phase === 'spent'));
});

test('solid wall prevents spread and protects explosions; barrel chains are exactly once', () => {
  const wall = {id: 'wall', x: 6, y: 4, width: 0.5, depth: 8, height: 2, material: 'masonry', kind: 'wall'};
  const barrier = model({id: 'barrier', width: 12, height: 8, player: {x: 1, y: 1}, obstacles: [wall], actors: [],
    fuelLines: [{from: {x: 1.25, y: 4.25}, to: {x: 11.25, y: 4.25}, litresPerMetre: 0.08}], ignitions: [{x: 1.25, y: 4.25, radius: 0.1, heat: 2}]});
  let s = run(barrier, 5); assert.ok(s.cells.filter(c => c.x > 6.5).every(c => c.phase !== 'burning' && c.heat === 0));
  const chain = model('chain'); chain.dispatch({type: 'aim', x: 6, y: 4}); chain.dispatch({type: 'primary', pressed: true}); s = run(chain, 0.5);
  const explosions = s.events.filter(e => e.type === 'barrel-explosion'); assert.deepEqual(explosions.map(e => e.objectId), ['drum-a', 'drum-b']);
  assert.deepEqual(s.world.obstacles.map(o => o.id), ['drum-safe']); run(chain, 1);
  assert.equal(chain.snapshot().events.filter(e => e.type === 'barrel-explosion').length, 2);
});

test('all tools have finite stock and common field outcomes; Molotov flight follows world time', () => {
  for (const tool of ['matches', 'torch', 'flamethrower', 'molotov']) {
    const sim = model(plain({player: {x: 3.25, y: 5.25, tool}, patches: [{x: 0, y: 0, width: 30, depth: 10, material: 'grass'}]}));
    sim.dispatch({type: 'aim', x: 4.1, y: 5.25}); sim.dispatch({type: 'primary', pressed: true}); const s = run(sim, 0.8);
    assert.ok(s.cells.some(c => c.phase === 'burning'), tool);
    const key = {matches: 'matches', torch: 'torchFuel', flamethrower: 'flamethrowerFuel', molotov: 'molotovs'}[tool];
    assert.ok(s.player.inventory[key] < DEFAULT_CONFIG.inventory[key], tool);
  }
  const make = powder => { const sim = model(plain({player: {x: 3.25, y: 5.25, tool: 'molotov'}}));
    if (powder) sim.dispatch({type: 'drug', drug: 'powder'}); sim.dispatch({type: 'aim', x: 8.25, y: 5.25}); sim.dispatch({type: 'primary', pressed: true}); return sim; };
  assert.equal(run(make(false), 0.8).projectiles.length, 0); assert.equal(run(make(true), 0.8).projectiles.length, 1);
});

test('invalid input/resources never create NaN or stock; snapshots are detached; reset is repeatable', () => {
  const sim = model(); assert.equal(sim.dispatch({type: 'move', x: NaN, y: 0}), false); assert.equal(sim.dispatch({type: 'aim', x: 500, y: 0}), false);
  assert.equal(sim.dispatch({type: 'drug', drug: 'unknown'}), false); assert.equal(sim.dispatch({type: 'move', x: 1, y: 0, atTick: 0}), false);
  const s = sim.snapshot(); s.player.inventory.gas = 500; s.cells[0].heat = 99; close(sim.snapshot().player.inventory.gas, 4); close(sim.snapshot().cells[0].heat, 0);
  startPour(sim); run(sim, 0.2); sim.dispatch({type: 'reset'}); const reset = sim.advance(1 / 60); close(reset.player.inventory.gas, 4); close(reset.player.x, 3.25); assert.equal(reset.player.pouring, false);
  assert.ok(reset.events.every(e => e.id > 0));
  const hitch = sim.advance(60); assert.ok(hitch.diagnostics.lastSteps <= 15); close(hitch.diagnostics.droppedRealSeconds, 59.75);
  sim.dispose(); assert.equal(sim.dispatch({type: 'reset'}), false); assert.throws(() => sim.snapshot(), /disposed/);
});
