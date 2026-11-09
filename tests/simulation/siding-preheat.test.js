import test from 'node:test';
import assert from 'node:assert/strict';
import {createSimulation, DEFAULT_CONFIG} from '../../src/simulation/index.js';
import {COTTAGE_PAIR_SCENARIO} from '../../src/content/cottage-pair.js';
import {NEIGHBORHOOD_SCENARIO} from '../../src/content/neighborhood.js';
import {housingSectionAt, housingSectionGrid} from '../../src/content/housing-sections.js';
import {calmCottageWind} from '../../src/reuse/ashland/wind.js';
import {scenarioDefinition} from '../../src/simulation/fixtures.js';
import {createHousingFire} from '../../src/simulation/housing-fire.js';

const {step} = DEFAULT_CONFIG;
const config = {input: {cameraRelative: false}, fire: {damagePerSecond: 0}};
const near = (value, expected) => assert.ok(Math.abs(value - expected) < 1e-8, `${value} != ${expected}`);
const report = value => +value.toFixed(4);
const lastUse = snapshot => snapshot.events.findLast(event => event.type === 'tool-use');

function press(sim) {
  sim.dispatch({type: 'primary', pressed: false});
  sim.dispatch({type: 'primary', pressed: true});
  return sim.advance(step);
}
function move(sim, x, y, ticks) {
  sim.dispatch({type: 'move', x, y});
  sim.advance(ticks * step);
  sim.dispatch({type: 'move', x: 0, y: 0});
}

test('the same Ashland paving strike exposes warming, cooling and a clean handoff at the wall site', t => {
  const sourceId = 'cell:105,27', wallId = 'right:3,0';
  for (const long of [false, true]) {
    const sim = createSimulation({scenario: COTTAGE_PAIR_SCENARIO, cottageWind: calmCottageWind, characterId: 'goat', config});
    try {
      const initial = sim.snapshot();
      assert.ok(initial.cottageFire.buildings.every(house => Array.isArray(house.preheat) && house.preheat.length === 0));
      sim.dispatch({type: 'select-tool', tool: 'jerry-can'});
      press(sim);
      move(sim, -1, 0, 5);
      if (long) move(sim, 0, 1, 2);
      const poured = press(sim);
      assert.equal(poured.player.pouring, false);
      const volume = poured.cells.find(cell => cell.id === sourceId).depositedFuel;
      assert.ok(volume > 0);
      sim.dispatch({type: 'aim', x: 52.92, y: 13.72});
      sim.dispatch({type: 'select-tool', tool: 'matches'});
      let snapshot = press(sim);
      assert.deepEqual(lastUse(snapshot).cellIds, [sourceId]);
      const started = snapshot.clocks.world;
      let rising, peak = 0, burnout, atBurnout, cooling, cleared, caught;
      for (let i = 0; i < 260; i++) {
        const [source, other] = snapshot.cottageFire.buildings;
        const sample = source.preheat.find(site => site.id === wallId);
        const warm = snapshot.cottageFire.diagnostics.warmingSiding.find(site => site.buildingId === source.id && site.cellId === wallId);
        const heat = sample?.heatFraction ?? 0;
        near(heat, (warm?.heat ?? 0) / snapshot.cottageFire.diagnostics.sidingIgnitionHeat);
        assert.deepEqual(other.preheat, []);
        const burning = source.cells.find(site => site.id === wallId && site.flame > 0);
        if (burning) {
          assert.equal(sample, undefined);
          assert.equal(burning.cause, 'ground-heat');
          assert.equal(burning.parentId, sourceId);
          caught = burning.ignitionTime - started;
          break;
        }
        if (sample && rising === undefined) {
          rising = heat;
          assert.deepEqual(Object.keys(sample).sort(), ['heatFraction', 'id', 'nx', 'ny', 'nz', 'x', 'y', 'z']);
          near(sample.x, 6.08);
          near(sample.y, 2.36);
          near(sample.z, 3.5);
          assert.deepEqual([sample.nx, sample.ny, sample.nz], [1, 0, 0]);
          sample.heatFraction = -10;
          near(sim.snapshot().cottageFire.buildings[0].preheat.find(site => site.id === wallId).heatFraction, rising);
        }
        peak = Math.max(peak, heat);
        const event = snapshot.events.find(event => event.type === 'burnout' && event.cellId === sourceId);
        if (event && burnout === undefined) {
          burnout = event.tick * step - started;
          atBurnout = heat;
        }
        const age = snapshot.clocks.world - started;
        if (burnout !== undefined && age >= burnout + 1) cooling ??= heat;
        if (burnout !== undefined && heat === 0 && peak > 0) { cleared = age; break; }
        snapshot = sim.advance(long ? step : .05);
      }
      assert.ok(rising > 0 && peak > rising && peak < 1);
      if (long) {
        assert.ok(caught > 0 && peak > .95);
        t.diagnostic(JSON.stringify({pour: 'long', volume: report(volume), rising: report(rising), peak: report(peak), ignitedAt: report(caught), preheatOnIgnition: 0}));
      } else {
        assert.equal(caught, undefined);
        assert.ok(atBurnout > 0 && cooling > 0 && cooling < atBurnout);
        assert.ok(cleared > burnout + 1);
        t.diagnostic(JSON.stringify({pour: 'short', volume: report(volume), rising: report(rising), peak: report(peak),
          sourceBurnout: report(burnout), atBurnout: report(atBurnout), oneSecondLater: report(cooling), clearedAt: report(cleared)}));
      }
    } finally { sim.dispose(); }
  }
});

test('the ordinary Hopkins siding reports local wood preheat at the configured threshold and clears it on ignition', t => {
  const hopkins = NEIGHBORHOOD_SCENARIO.buildings.find(building => building.id === 'hopkins-nine');
  const scenario = {id: 'neighborhood', width: 16, height: 44, player: {x: 11.7, y: 34.75, tool: 'torch'}, buildings: [hopkins],
    patches: [{x: 10.5, y: 34.5, width: .5, depth: .5, material: 'grass'}]};
  const woodThreshold = 1.6;
  const sim = createSimulation({scenario, config: {...config, fire: {...config.fire, ignition: {wood: woodThreshold}}}});
  const x = 10.25 - hopkins.x, z = 34.75 - hopkins.y;
  const sectionId = housingSectionAt(housingSectionGrid(hopkins.prefabId), x, z);
  const section = snapshot => snapshot.world.buildings[0].sections[sectionId];
  try {
    assert.equal(section(press(sim)).preheat, null);
    sim.dispatch({type: 'aim', x: 10.94, y: 34.75});
    assert.deepEqual(lastUse(press(sim)).cellIds, ['cell:21,69']);
    let snapshot;
    for (let i = 0; i < 8; i++) snapshot = sim.advance(.25);
    const wood = snapshot.cells.find(cell => cell.id === 'cell:20,69');
    const sample = section(snapshot).preheat;
    assert.equal(section(snapshot).fire, null);
    assert.deepEqual(sample, {x, z, heatFraction: wood.heat / woodThreshold});
    assert.ok(sample.heatFraction > .05 && sample.heatFraction < 1);
    sample.z = -10;
    assert.equal(section(sim.snapshot()).preheat.z, z);
    move(sim, -1, 0, 5);
    sim.dispatch({type: 'aim', x: 9.9, y: 34.75});
    const struck = press(sim);
    assert.deepEqual(lastUse(struck).cellIds, ['cell:20,69']);
    assert.ok(section(struck).fire);
    assert.equal(section(struck).preheat, null);
    t.diagnostic(JSON.stringify({house: hopkins.id, section: sectionId, x, z, woodHeat: report(wood.heat), woodThreshold,
      heatFraction: report(sample.heatFraction), preheatOnIgnition: null}));
  } finally { sim.dispose(); }
});

test('section preheat selects the hottest live wood and clears when that section loses support', () => {
  const hopkins = NEIGHBORHOOD_SCENARIO.buildings.find(building => building.id === 'hopkins-nine');
  const {buildings: [building], obstacles} = scenarioDefinition({width: 16, height: 44, buildings: [hopkins]});
  const cells = [
    {x: 9.25, y: 34.25, material: 'wood', heat: .24, surfaceFuel: .05, depositedFuel: 0, phase: 'heating', ignitedAt: null},
    {x: 9.75, y: 34.25, material: 'wood', heat: .50, surfaceFuel: .05, depositedFuel: 0, phase: 'heating', ignitedAt: null},
    {x: 10.25, y: 34.25, material: 'paving', heat: .58, surfaceFuel: 0, depositedFuel: .01, phase: 'heating', ignitedAt: null},
    {x: 10.25, y: 34.75, material: 'wood', heat: 1.2, surfaceFuel: 0, depositedFuel: 0, phase: 'spent', ignitedAt: .1}
  ];
  const structure = createHousingFire({building, colliders: obstacles, cells, initialSurfaceFuel: .1}, [...obstacles], 2);
  const section = building.sections[housingSectionAt(housingSectionGrid(hopkins.prefabId), 6.75, 4.25)];
  structure.step(1, () => {});
  assert.deepEqual(section.preheat, {x: 6.75, z: 4.25, heatFraction: .25});
  Object.assign(cells[0], {phase: 'burning', ignitedAt: 2, intensity: .5});
  structure.step(2, () => {});
  assert.equal(section.preheat, null);
  for (const cell of cells) Object.assign(cell, {phase: 'spent', surfaceFuel: 0, depositedFuel: 0});
  structure.step(3, () => {});
  assert.equal(section.present, false);
  assert.equal(section.preheat, null);
});
