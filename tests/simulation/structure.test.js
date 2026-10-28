import test from 'node:test';
import assert from 'node:assert/strict';
import {StructureFire, FIRE_MATERIALS} from '../../src/simulation/structure-fire.js';
import {createSimulation} from '../../src/simulation/index.js';
import {scenarioDefinition, SCENARIOS} from '../../src/simulation/fixtures.js';
import {configuration} from '../../src/simulation/config.js';
import {buildingFireScenario} from '../../src/content/building-fire.js';
const run = (fire, seconds) => { for (let i = 0; i < Math.round(seconds * 10); i++) fire.step(0.1, (i + 1) / 10); return fire.snapshot(); };
function solver(source, config) { const def = scenarioDefinition(source); return new StructureFire(def, configuration(config), def.obstacles.map(o => ({...o, destroyed: false}))); }
function coupon({flux = 50000, moisture = 0, pilot = true, duration = 120, material = 'wood'} = {}) {
  const def = buildingFireScenario({stories: 1, moisture});
  def.modules = [{...def.modules[0], width: 1, physicalMaterial: material}];
  def.structureFire.exposures = [{buildingId: 'source', x: 6, y: 4.12, h: 1, radius: 1.5, flux, duration, pilot}];
  return solver(def);
}
function arrival(fire, seconds = 120) {
  for (let i = 1; i <= seconds * 10; i++) { fire.step(0.1, i / 10); if (fire.patches.some(p => p.phase === 'burning')) return i / 10; }
  return Infinity;
}
const selected = (snapshot, id) => snapshot.surfaces.filter(p => p.buildingId === id);
const highest = (snapshot, id) => Math.max(0, ...selected(snapshot, id).filter(p => p.phase === 'burning').map(p => p.h));
const hottest = (snapshot, id) => Math.max(...selected(snapshot, id).map(p => p.temperatureK));

test('constant-flux wood coupons distinguish intensity, duration, moisture and piloted ignition', () => {
  const low = arrival(coupon({flux: 25000})), high = arrival(coupon({flux: 50000}));
  assert.ok(high > 0 && high < low, 'greater exposure must reduce ignition delay');
  assert.ok(arrival(coupon({flux: 50000, moisture: 0.3})) > high, 'evaporation must delay ignition');
  assert.ok(arrival(coupon({pilot: false})) > high, 'radiation alone cannot use the piloted threshold');
  assert.equal(arrival(coupon({flux: 5000})), Infinity, 'subcritical exposure cannot ignite wood');
  assert.equal(arrival(coupon({flux: 50000, duration: 1})), Infinity, 'a brief pulse cannot bypass thermal inertia');
});

test('surface heat, evaporated water, gasification and escaped energy close the energy balance', () => {
  for (const moisture of [0, 0.3]) {
    const snapshot = run(coupon({moisture}), 60), d = snapshot.diagnostics;
    const input = d.externalJ + d.groundAbsorbedJ + d.releasedJ;
    const accounted = d.storedHeatJ + d.evaporationJ + d.gasificationJ + d.coolingJ + d.escapedJ;
    assert.ok(Math.abs(input - accounted) < input * 1e-9, 'energy must not multiply during transfer');
    assert.ok(d.feedbackJ + d.radiationJ + d.convectionJ <= d.releasedJ + d.groundAbsorbedJ + 0.001);
    assert.ok(snapshot.surfaces.every(p => Number.isFinite(p.temperatureK) && p.temperatureK >= 293.15));
  }
});

test('all playable building fire defaults are dry wood, independent of the inherited skin', () => {
  assert.equal(SCENARIOS.street.structureFire.moisture, 0);
  assert.ok(SCENARIOS.street.obstacles.filter(o => o.kind === 'building').every(o => o.material === 'wood'));
  assert.equal(SCENARIOS.exposition.structureFire.moisture, 0);
  const def = buildingFireScenario(), changed = structuredClone(def);
  for (const m of changed.modules) m.skinSlots.facade = 'inherited-brick';
  assert.deepEqual(run(solver(def), 15), run(solver(changed), 15));
});

test('buoyant exposure climbs native wall stories while wet wood lags behind', () => {
  const dry = run(solver(buildingFireScenario()), 60);
  const wet = run(solver(buildingFireScenario({moisture: 0.3})), 60);
  assert.ok(highest(dry, 'source') > 4, 'fire must reach the third native story');
  assert.ok(highest(wet, 'source') < highest(dry, 'source'));
  assert.ok(dry.diagnostics.convectionJ > 0);
  // Only the first metre receives the fixture burner; upper stories must be heated by the fire.
  assert.ok(selected(dry, 'source').some(p => p.h > 4 && p.phase === 'burning'));
});

test('wind carries real flame exposure to a neighboring building; it does not teleport ignition', () => {
  const fire = solver(buildingFireScenario({wind: {x: 0, y: 6}}));
  const before = run(fire, 10);
  assert.equal(highest(before, 'receiver'), 0); assert.ok(hottest(before, 'receiver') > 293.15);
  let ignition;
  for (let i = 101; i <= 600; i++) { fire.step(0.1, i / 10); if (fire.patches.some(p => p.buildingId === 'receiver' && p.phase === 'burning')) { ignition = i / 10; break; } }
  assert.ok(ignition > 10 && ignition < 60);
  const away = solver(buildingFireScenario({wind: {x: 0, y: -6}})); let awayIgnition = Infinity;
  for (let i = 1; i <= 600; i++) { away.step(0.1, i / 10); if (away.patches.some(p => p.buildingId === 'receiver' && p.phase === 'burning')) { awayIgnition = i / 10; break; } }
  assert.ok(awayIgnition > ignition, 'wind direction changes flame contact; radiation can still ignite upwind');
});

test('distance weakens radiant preheating and an opaque noncombustible screen shields it', () => {
  const close = run(solver(buildingFireScenario()), 60), far = run(solver(buildingFireScenario({gap: 3})), 60);
  const shield = run(solver(buildingFireScenario({barrier: true})), 60);
  assert.ok(hottest(close, 'receiver') > hottest(far, 'receiver') + 100);
  assert.equal(hottest(shield, 'receiver'), 293.15);
  assert.ok(selected(shield, 'firebreak').some(p => p.temperatureK > 293.15));
  assert.ok(selected(shield, 'firebreak').every(p => p.fuelKg === 0 && p.phase !== 'burning'));
  const steel = run(coupon({material: 'steel'}), 30);
  assert.ok(steel.surfaces.every(p => Number.isFinite(p.temperatureK) && p.phase !== 'burning'));
});

test('fully ignited small timber exhausts a finite mass and emits at most its chemical energy', () => {
  const def = {width: 4, height: 4, player: {x: 1, y: 1}, modules: [], actors: [], structureFire: {moisture: 0},
    obstacles: [{id: 'lab-coupon', x: 2, y: 2, width: 0.02, depth: 0.02, height: 0.02, material: 'wood'}]};
  const fire = solver(def);
  for (const p of fire.patches) { p.phase = 'burning'; for (const l of p.layers) l.temperature = 700; }
  const snapshot = run(fire, 400), d = snapshot.diagnostics;
  assert.equal(d.remainingFuelKg, 0); assert.equal(d.powerW, 0); assert.equal(snapshot.surfaces.length, 0);
  assert.ok(Math.abs(d.burnedFuelKg - d.initialFuelKg) < 1e-10);
  assert.ok(Math.abs(d.releasedJ - d.initialFuelKg * FIRE_MATERIALS.wood.heatOfCombustion) < 1e-5);
  const after = run(fire, 10); assert.equal(after.diagnostics.releasedJ, d.releasedJ);
});

test('ground-to-wall coupling spends the actual consumed fuel energy and never duplicates wall fuel', () => {
  const def = buildingFireScenario({stories: 1}); def.structureFire.exposures = [];
  def.fuelLines = [{from: {x: 5.5, y: 4.5}, to: {x: 6.5, y: 4.5}, litresPerMetre: 0.2}];
  def.ignitions = [{x: 5.75, y: 4.5, radius: 0.2, heat: 2}];
  const sim = createSimulation({scenario: def});
  assert.equal(sim.snapshot().cells.reduce((n, c) => n + c.surfaceFuel, 0), 0);
  for (let i = 0; i < 80; i++) sim.advance(0.25);
  const s = sim.snapshot();
  assert.ok(s.structureFire.diagnostics.groundAbsorbedJ > 0);
  assert.ok(s.structureFire.diagnostics.groundAbsorbedJ <= s.diagnostics.fuel.burnedDepositedFuel * 32000000 + 1e-6);
});

test('surface fire uses world time: pause freezes heat, powder slows it, render schedules agree', () => {
  const replay = [{type: 'drug', drug: 'powder', atTick: 120}, {type: 'pause', paused: true, atTick: 300}, {type: 'pause', paused: false, atTick: 360}];
  const result = [];
  for (const schedule of [[1 / 30], [1 / 60], [1 / 120], [0.01, 0.24]]) {
    const sim = createSimulation({scenario: buildingFireScenario({stories: 2})}); replay.forEach(c => sim.dispatch(c));
    let elapsed = 0, i = 0; while (elapsed < 12 - 1e-9) { const dt = Math.min(schedule[i++ % schedule.length], 12 - elapsed); sim.advance(dt); elapsed += dt; }
    result.push(sim.snapshot().structureFire);
  }
  for (const s of result.slice(1)) assert.deepEqual(s, result[0]);
  const sim = createSimulation({scenario: buildingFireScenario({stories: 1})}); sim.advance(0.25);
  sim.dispatch({type: 'pause', paused: true}); sim.advance(1 / 60); const frozen = sim.snapshot().structureFire;
  for (let i = 0; i < 20; i++) sim.advance(0.25); assert.deepEqual(sim.snapshot().structureFire, frozen);
  const snap = sim.snapshot(); snap.structureFire.surfaces[0].temperatureK = -123; assert.notEqual(sim.snapshot().structureFire.surfaces[0].temperatureK, -123);
});

test('surface tool energy is bounded by consumed stock and empty tools cannot heat walls', () => {
  for (const stock of [0, 0.05]) {
    const def = buildingFireScenario({stories: 1}); def.structureFire.exposures = []; def.player = {x: 6, y: 7, tool: 'flamethrower', inventory: {flamethrowerFuel: stock}};
    const sim = createSimulation({scenario: def}); sim.dispatch({type: 'aim', x: 6, y: 4}); sim.dispatch({type: 'primary', pressed: true});
    for (let i = 0; i < 4; i++) sim.advance(0.25); const s = sim.snapshot();
    assert.equal(s.player.inventory.flamethrowerFuel, 0);
    assert.ok(s.structureFire.diagnostics.externalJ <= stock / 0.3 * 12 * 40000 + 1e-6);
    assert.equal(s.structureFire.diagnostics.burningSurfaces, 0);
    if (stock) assert.ok(s.structureFire.diagnostics.externalJ > 0); else assert.equal(s.structureFire.diagnostics.externalJ, 0);
  }
});

test('thermal definitions and allocation limits fail before unbounded or nonfinite simulation', () => {
  for (const change of [{moisture: -1}, {wind: {x: Infinity, y: 0}}, {wind: {x: 13, y: 0}}, {exposures: [{x: 0}]}]) {
    const def = buildingFireScenario(); Object.assign(def.structureFire, change); assert.throws(() => solver(def));
  }
  assert.throws(() => solver(buildingFireScenario(), {structure: {maxPatches: 1}}), /patch budget/);
  assert.throws(() => solver(buildingFireScenario(), {structure: {maxLinks: 1}}), /link budget/);
  assert.throws(() => solver(buildingFireScenario(), {structure: {radiativeFraction: 0.9}}), /thermal configuration/);
});

test('halving surface size and thermal timestep preserves the wall-climb result within 20 percent', () => {
  const arrivals = [];
  for (const settings of [{patchSize: 0.5, step: 0.1}, {patchSize: 0.25, step: 0.1}, {patchSize: 0.5, step: 0.05}]) {
    const fire = solver(buildingFireScenario(), {structure: settings}); let arrival;
    for (let i = 1; i <= 900; i++) { fire.step(0.1, i / 10); if (fire.patches.some(p => p.buildingId === 'source' && p.h > 4 && p.phase === 'burning')) { arrival = i / 10; break; } }
    assert.ok(arrival, 'each resolution must reach the third story'); arrivals.push(arrival);
  }
  for (const value of arrivals.slice(1)) assert.ok(Math.abs(value - arrivals[0]) / arrivals[0] < 0.2);
});
