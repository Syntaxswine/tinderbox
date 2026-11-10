import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {createSimulation, DEFAULT_CONFIG} from '../../src/simulation/index.js';
import {buildingPoint} from '../../src/content/buildings.js';
import {NEIGHBORHOOD_SCENARIO, SHOP_WITNESS_SCENARIO} from '../../src/content/neighborhood.js';
import {COTTAGE_PAIR_SCENARIO} from '../../src/content/cottage-pair.js';
import {PAIR_WIND_URL, translateCottageWind} from '../../src/reuse/ashland/wind.js';
import {lineClear} from '../../src/simulation/geometry.js';

const {step} = DEFAULT_CONFIG;
const middle = 'monroe-row-middle', east = 'monroe-row-east', west = 'monroe-row-house';
const house = (snapshot, id) => snapshot.world.buildings.find(building => building.id === id);
const near = (a, b) => assert.ok(Math.abs(a - b) < 1e-7, `${a} != ${b}`);
const catalogue = scenario => ({...scenario, patches: [], player: {x: 38.5, y: 30.35, tool: 'matches'}});
const publishedAim = {x: 38.5, y: 31.15};

function replay(scenario, aim, donor, receivers, {seconds, frames = [.25], config, cottageWind} = {}) {
  const sim = createSimulation({scenario, seed: 1893, config, cottageWind});
  const receipt = {initial: sim.snapshot(), bySite: new Map(), preheat: new Map(),
    first: new Map(), ownSpread: new Map(), clear: new Map(), collapse: new Map(), peak: new Map()};
  const relevant = new Set([donor, ...receivers]);
  function observe(snapshot) {
    for (const event of snapshot.events) {
      if (!relevant.has(event.buildingId)) continue;
      const id = event.buildingId;
      if (event.type === 'structure-ignition' && !receipt.bySite.has(event.siteId)) {
        receipt.bySite.set(event.siteId, event);
        if (!receipt.first.has(id)) receipt.first.set(id, event);
        if (event.cause === 'surface-spread' && event.parentSiteId?.startsWith(id + '/') && !receipt.ownSpread.has(id)) {
          receipt.ownSpread.set(id, event);
        }
      }
      if (event.type === 'building-section-burnout' && !receipt.clear.has(id)) receipt.clear.set(id, event.worldTime);
      if (event.type === 'building-burnout' && !receipt.collapse.has(id)) receipt.collapse.set(id, event.worldTime);
    }
    for (const site of snapshot.structureFire) {
      if (!receivers.includes(site.buildingId) || site.cause !== 'joined-roof' || site.ignitionTime !== null) continue;
      assert.ok(site.heatFraction > 0 && site.heatFraction < 1);
      if (!receipt.preheat.has(site.id)) receipt.preheat.set(site.id, {...site, worldTime: snapshot.clocks.world});
      receipt.peak.set(site.buildingId, Math.max(receipt.peak.get(site.buildingId) ?? 0, site.heatFraction));
    }
  }
  try {
    assert.ok(sim.dispatch({type: 'aim', ...aim}));
    assert.ok(sim.dispatch({type: 'primary', pressed: true}));
    let snapshot = sim.advance(step);
    assert.ok(sim.dispatch({type: 'primary', pressed: false}));
    const strike = snapshot.events.find(event => event.type === 'tool-use');
    assert.equal(strike.result, 'ignited');
    assert.equal(strike.heatedCells, 1);
    assert.ok(strike.cellIds[0].startsWith(donor + '/wall:'));
    assert.equal(snapshot.structureFire.length, 1);
    assert.ok(receivers.every(id => house(snapshot, id).sections.every(section => section.firstIgnition === null)));
    observe(snapshot);
    while (snapshot.clocks.world < seconds) {
      for (const dt of frames) snapshot = sim.advance(dt);
      observe(snapshot);
    }
    receipt.end = snapshot;
    assert.ok(sim.dispatch({type: 'reset'}));
    const reset = sim.advance(step);
    assert.deepEqual(reset.structureFire, []);
    assert.ok(reset.world.buildings.every(building => !building.destroyed && building.burnedFraction === 0));
    assert.deepEqual(reset.world.buildings.map(b => b.partyWalls), receipt.initial.world.buildings.map(b => b.partyWalls));
    assert.deepEqual(sim.advance(.25).structureFire, []);
    return receipt;
  } finally { sim.dispose(); }
}

function verifyContact(receipt, source, receiver) {
  const event = receipt.first.get(receiver);
  assert.ok(event, receiver);
  assert.equal(event.cause, 'joined-roof');
  assert.equal(event.part, 'roof');
  assert.ok(event.parentSiteId.startsWith(source + '/roof:main:'));
  const donor = receipt.bySite.get(event.parentSiteId), warm = receipt.preheat.get(event.siteId);
  assert.ok(donor && warm, event.siteId);
  assert.equal(warm.parentSiteId, donor.siteId);
  assert.equal(warm.exposed, true);
  assert.equal(warm.flame, 0);
  assert.ok(donor.worldTime < warm.worldTime && warm.worldTime < event.worldTime);
  return {siteId: event.siteId, parentSiteId: donor.siteId, donor: donor.worldTime, warm: warm.worldTime, ignite: event.worldTime};
}

test('published touching Monroe roofs warm and catch without grass in normal, witness and actual-wind Ashland visits', t => {
  const wind = translateCottageWind(JSON.parse(readFileSync(PAIR_WIND_URL)));
  for (const [mode, definition, cottageWind, seconds] of [
    ['regular', NEIGHBORHOOD_SCENARIO, undefined, 33],
    ['witness', SHOP_WITNESS_SCENARIO, undefined, 11],
    ['cottages', COTTAGE_PAIR_SCENARIO, wind, 11]
  ]) {
    const receipt = replay(catalogue(definition), publishedAim, middle, [west, east], {seconds, cottageWind});
    assert.equal(Boolean(receipt.initial.witness), mode === 'witness');
    assert.equal(Boolean(receipt.initial.cottageFire), mode === 'cottages');
    assert.equal(receipt.end.diagnostics.burningCells, 0);
    assert.deepEqual([west, middle, east].map(id => house(receipt.initial, id)).map(b => [b.x, b.y, b.quarterTurns]),
      [[27, 31, 0], [34, 31, 0], [41, 31, 0]]);
    assert.deepEqual(house(receipt.initial, middle).partyWalls, {left: west, right: east});
    const contacts = [west, east].map(id => verifyContact(receipt, middle, id));
    if (mode === 'regular') {
      for (const id of [west, east]) {
        assert.ok(receipt.first.get(id).worldTime < receipt.ownSpread.get(id).worldTime);
        assert.ok(receipt.ownSpread.get(id).worldTime < receipt.clear.get(id));
        assert.ok(receipt.clear.get(id) < receipt.collapse.get(id));
        assert.ok(receipt.collapse.get(middle) < receipt.collapse.get(id));
      }
      assert.ok([west, middle, east].every(id => house(receipt.end, id).destroyed &&
        !receipt.end.world.obstacles.some(box => box.buildingId === id)));
      assert.ok(receipt.end.world.buildings.filter(b => b.prefabId !== 'monroe-row').every(b => b.burnedFraction === 0));
    }
    t.diagnostic(JSON.stringify({mode, contacts, collapse: Object.fromEntries(receipt.collapse)}));
  }
});

function rotatedRow(quarterTurns, gap = 0) {
  const origin = {x: 25, y: 25, quarterTurns};
  const local = (x, y) => buildingPoint(origin, {x, y});
  const buildings = [0, 1, 2].map(index => ({id: 'unit-' + index, prefabId: 'monroe-row',
    ...local(index * (7 + gap), 0), quarterTurns}));
  const scenario = {id: 'neighborhood', width: 54, height: 54,
    player: {...local(4.5, -.65), tool: 'matches'}, buildings};
  return {scenario, aim: local(4.5, .15)};
}

test('the three-unit seam chain uses transformed roof edges and has the same timing in any lot order or frame split', () => {
  let reference;
  for (const quarterTurns of [0, 1, 2, 3]) {
    const {scenario, aim} = rotatedRow(quarterTurns);
    if (quarterTurns === 1 || quarterTurns === 3) scenario.buildings.reverse();
    const receipt = replay(scenario, aim, 'unit-0', ['unit-1', 'unit-2'],
      {seconds: 23, frames: quarterTurns % 2 ? [.073, .177] : [.25]});
    const contacts = [verifyContact(receipt, 'unit-0', 'unit-1'), verifyContact(receipt, 'unit-1', 'unit-2')];
    assert.ok(contacts[0].ignite < contacts[1].donor);
    const seam = house(receipt.initial, 'unit-0');
    const from = buildingPoint(seam, {x: 6.75, y: 5.25});
    const to = buildingPoint(seam, {x: 7.25, y: 5.25});
    assert.equal(lineClear({...from, size: .5}, {...to, size: .5}, receipt.initial.world.obstacles), false);
    if (!reference) reference = contacts;
    for (const [index, contact] of contacts.entries()) {
      assert.equal(contact.siteId, reference[index].siteId);
      assert.equal(contact.parentSiteId, reference[index].parentSiteId);
      for (const clock of ['donor', 'warm', 'ignite']) near(contact[clock], reference[index][clock]);
    }
  }
});

test('unjoined lots stay cold and shorter roof burns leave only temporary seam preheat', t => {
  const {scenario, aim} = rotatedRow(0, .3);
  assert.ok(scenario.buildings.pop());
  const separated = replay(scenario, aim, 'unit-0', ['unit-1'], {seconds: 25});
  assert.equal(house(separated.initial, 'unit-0').partyWalls.right, null);
  assert.ok(house(separated.end, 'unit-0').destroyed);
  assert.equal(separated.preheat.size, 0);
  assert.equal(separated.first.has('unit-1'), false);
  assert.ok(house(separated.end, 'unit-1').sections.every(section => section.present && section.firstIgnition === null));

  // The same row and match are used. Faster fuel consumption gives each hot
  // roof panel less than three seconds of output before it is spent.
  const weak = replay(catalogue(NEIGHBORHOOD_SCENARIO), publishedAim, middle, [west, east],
    {seconds: 32, config: {fuel: {surfaceBurnRate: .085}}});
  assert.ok([...weak.preheat.values()].every(sample => sample.parentSiteId.startsWith(middle + '/roof:main:')));
  for (const id of [west, east]) {
    assert.ok(weak.peak.get(id) > .5 && weak.peak.get(id) < 1);
    assert.equal(weak.first.has(id), false);
    assert.ok(house(weak.end, id).sections.every(section => section.present && section.firstIgnition === null));
  }
  assert.deepEqual(weak.end.structureFire, []);
  t.diagnostic(JSON.stringify({weakPeak: Object.fromEntries(weak.peak)}));
});
