import test from 'node:test';
import assert from 'node:assert/strict';
import {createSimulation, DEFAULT_CONFIG} from '../../src/simulation/index.js';
import {COTTAGE_PAIR_SCENARIO} from '../../src/content/cottage-pair.js';
import {NEIGHBORHOOD_SCENARIO} from '../../src/content/neighborhood.js';
import {calmCottageWind} from '../../src/reuse/ashland/wind.js';

const {step, fire, fuel} = DEFAULT_CONFIG;
const {id: hopkinsId, ...hopkins} = NEIGHBORHOOD_SCENARIO.buildings.find(building => building.id === 'hopkins-nine');
const patch = (x, y, material) => ({x, y, width: .5, depth: .5, material});
const gasLine = (x, y, passes) => ({from: {x: x + .01, y: y + .25}, to: {x: x + .49, y: y + .25}, litresPerMetre: passes * fuel.gasPerMetre});
const wall = (x, y) => ({id: 'screen', x, y, width: .04, depth: 2, height: 2, material: 'masonry'});
const findCell = (snapshot, id) => snapshot.cells.find(cell => cell.id === id);
const action = snapshot => snapshot.events.findLast(event => event.type === 'tool-use');
const round = value => value === null ? null : +value.toFixed(4);
function press(sim) {
  sim.dispatch({type: 'primary', pressed: false});
  sim.dispatch({type: 'primary', pressed: true});
  return sim.advance(step);
}

function trace({kind, shielded = false, cottage = false, passes = 4}) {
  const x = cottage ? 52.5 : 10.5, y = cottage ? 13.5 : 34.5;
  const sourceId = cottage ? 'cell:105,27' : 'cell:21,69';
  const receiverId = cottage ? 'right:3,0' : 'cell:20,69';
  const base = cottage ? COTTAGE_PAIR_SCENARIO : {id: 'neighborhood', width: 16, height: 44,
    buildings: [{id: hopkinsId, ...hopkins}]};
  const scenario = {...base, patches: kind === 'gas' ? [] : [patch(x, y, kind)],
    obstacles: shielded ? [wall(x - .01, y + .25)] : [], pickups: [], actors: [],
    player: {x: x + 1.2, y: y + .25, tool: 'torch'}, fuelLines: kind === 'gas' ? [gasLine(x, y, passes)] : []};
  const sim = createSimulation({scenario, cottageWind: calmCottageWind, config: {fire: {damagePerSecond: 0}}});
  const threshold = cottage ? sim.snapshot().cottageFire.diagnostics.sidingIgnitionHeat : fire.ignition.wood;
  let start = null, end = null, arrival = null, ignitionHeat = null, peak = 0, peakTime = null, cooled = null, final = 0;
  try {
    const lit = press(sim);
    assert.equal(action(lit).result, 'lit');
    assert.ok(lit.cells.every(cell => cell.heat === 0));
    sim.dispatch({type: 'aim', x: x + .44, y: y + .25});
    let snapshot = press(sim);
    assert.deepEqual(action(snapshot).cellIds, [sourceId], 'only the real source is lit by the tool');
    const interval = .05;
    for (let i = 0; i <= 15 / interval; i++) {
      const source = findCell(snapshot, sourceId), time = snapshot.clocks.world;
      const sourceStart = snapshot.events.find(event => event.type === 'ignition' && event.cellId === sourceId);
      const sourceEnd = snapshot.events.find(event => event.type === 'burnout' && event.cellId === sourceId);
      if (start === null && sourceStart) start = sourceStart.tick * step;
      if (end === null && sourceEnd) end = sourceEnd.tick * step;
      const first = cottage ? snapshot.events.find(event => event.type === 'cottage-ignition' && event.buildingId === 'ashland-cottage')
        : snapshot.events.find(event => event.type === 'ignition' && event.cellId === receiverId);
      const heating = cottage ? snapshot.cottageFire.diagnostics.warmingSiding?.find(site => site.cellId === receiverId)?.heat : findCell(snapshot, receiverId).heat;
      if (first && arrival === null) {
        assert.equal(first.cellId, receiverId);
        arrival = cottage ? first.worldTime : first.tick * step;
        ignitionHeat = first.heat;
      }
      if (arrival === null && (heating ?? 0) > peak) { peak = heating; peakTime = time; }
      final = heating ?? 0;
      if (arrival === null && peak > 0 && end !== null && final < .001) cooled ??= time;
      assert.ok(source.surfaceFuel >= 0 && source.depositedFuel >= 0);
      if (i < 15 / interval) snapshot = sim.advance(interval);
    }
    assert.ok(start !== null && end !== null && end > start, 'finite source ignited and burnt out');
    return {kind, shielded, sourceId, receiverId, sourceDuration: round(end - start), threshold,
      peakBeforeIgnition: round(peak), peakAfter: round(peakTime === null ? null : peakTime - start),
      receiverIgnition: round(arrival === null ? null : arrival - start), ignitionHeat: round(ignitionHeat),
      cooledAfter: round(cooled === null ? null : cooled - start), finalHeat: arrival === null ? round(final) : null};
  } finally { sim.dispose(); }
}

test('real Hopkins siding warms and cools beside one grass flame, then catches from stronger gas or timber', t => {
  const grass = trace({kind: 'grass'}), gas = trace({kind: 'gas'}), timber = trace({kind: 'wood'}), blocked = trace({kind: 'gas', shielded: true});
  t.diagnostic(JSON.stringify({grass, gas, timber, blocked}));
  assert.equal(grass.receiverIgnition, null);
  assert.ok(grass.peakBeforeIgnition > .05 && grass.peakBeforeIgnition < grass.threshold);
  assert.equal(grass.finalHeat, 0);
  assert.ok(grass.cooledAfter > grass.sourceDuration);
  for (const hotter of [gas, timber]) {
    assert.ok(hotter.receiverIgnition > 0 && hotter.receiverIgnition < hotter.sourceDuration);
    assert.ok(hotter.ignitionHeat >= hotter.threshold);
  }
  assert.ok(timber.sourceDuration > gas.sourceDuration && gas.sourceDuration > grass.sourceDuration);
  assert.equal(blocked.receiverIgnition, null);
  assert.equal(blocked.peakBeforeIgnition, 0);
});

test('the native Ashland siding uses finite grass and gas exposure through the same outward contact', t => {
  const grass = trace({kind: 'grass', cottage: true}), shortGas = trace({kind: 'gas', cottage: true, passes: .5});
  const gas = trace({kind: 'gas', cottage: true}), blocked = trace({kind: 'gas', shielded: true, cottage: true});
  t.diagnostic(JSON.stringify({grass, shortGas, gas, blocked}));
  assert.equal(grass.receiverIgnition, null);
  assert.ok(grass.peakBeforeIgnition > .015 && grass.peakBeforeIgnition < grass.threshold);
  assert.equal(grass.finalHeat, 0);
  assert.ok(grass.cooledAfter > grass.sourceDuration);
  assert.equal(shortGas.receiverIgnition, null);
  assert.ok(shortGas.peakBeforeIgnition > grass.peakBeforeIgnition && shortGas.peakBeforeIgnition < shortGas.threshold);
  assert.equal(shortGas.finalHeat, 0);
  assert.ok(shortGas.cooledAfter > shortGas.sourceDuration);
  assert.ok(gas.receiverIgnition > 0 && gas.receiverIgnition < gas.sourceDuration);
  assert.ok(gas.ignitionHeat >= gas.threshold);
  assert.equal(blocked.receiverIgnition, null);
  assert.equal(blocked.peakBeforeIgnition, 0);
});

test('lit Ashland siding transfers heat into existing exterior grass, with no new fuel in the paved gap', () => {
  const scenario = {...COTTAGE_PAIR_SCENARIO, patches: [...COTTAGE_PAIR_SCENARIO.patches, patch(52.5, 13.5, 'grass')]};
  const sim = createSimulation({scenario, cottageWind: calmCottageWind});
  try {
    const struck = press(sim);
    assert.deepEqual(action(struck).cellIds, ['right:3,0']);
    assert.equal(findCell(struck, 'cell:105,27').heat, 0);
    let snapshot = struck;
    for (let i = 0; i < 20; i++) {
      snapshot = sim.advance(.25);
      if (snapshot.events.some(event => event.type === 'ignition' && event.cellId === 'cell:105,27')) break;
    }
    const ignition = snapshot.events.find(event => event.type === 'ignition' && event.cellId === 'cell:105,27');
    assert.equal(ignition?.cause, 'cottage-siding');
    assert.equal(snapshot.diagnostics.fuel.burnedDepositedFuel, 0);
    assert.equal(snapshot.cottageFire.buildings[1].firstIgnition, null);
    assert.ok(snapshot.cells.filter(cell => cell.material === 'paving').every(cell => cell.surfaceFuel === 0 && cell.depositedFuel === 0));
  } finally { sim.dispose(); }
});
