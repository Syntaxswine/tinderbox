import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {COTTAGE_IDS, COTTAGE_PAIR_SCENARIO} from '../../src/content/cottage-pair.js';
import {calmCottageWind, PAIR_WIND_URL, translateCottageWind} from '../../src/reuse/ashland/wind.js';
import {createSimulation, DEFAULT_CONFIG} from '../../src/simulation/index.js';
import {prepareCottageFootprints} from '../../src/simulation/cottage-fire.js';
import {createCottageTopology, makeTiles} from '../../src/simulation/cottage-topology.js';
import {createCottageRadiation, radiantWeight} from '../../src/simulation/cottage-radiation.js';
import {scenarioDefinition} from '../../src/simulation/fixtures.js';
import {stepSurfaceFire} from '../../src/simulation/surface-fire.js';

const {step} = DEFAULT_CONFIG;
const [sourceId, receiverId] = COTTAGE_IDS;
const pair = {...COTTAGE_PAIR_SCENARIO, patches: [], actors: []};
const wind = translateCottageWind(JSON.parse(readFileSync(PAIR_WIND_URL)));
const screen = {id: 'radiant-screen', x: 53.8, y: 18, width: .15, depth: 24, height: 7, material: 'masonry'};
const near = (actual, expected) => assert.ok(Math.abs(actual - expected) < 1e-7, `${actual} != ${expected}`);

function run({cottageWind, radiation, embers, screened, seconds, partition = [.25]}) {
  const scenario = screened ? {...pair, obstacles: [...pair.obstacles, screen]} : pair;
  const sim = createSimulation({scenario, cottageWind, config: {cottage: {radiation, embers}}, seed: 1893});
  const events = new Map(), warm = new Map();
  let peak = 0;
  try {
    assert.ok(sim.dispatch({type: 'aim', x: 51, y: 13.5}));
    assert.ok(sim.dispatch({type: 'primary', pressed: true}));
    let snapshot = sim.advance(step);
    assert.ok(sim.dispatch({type: 'primary', pressed: false}));
    assert.equal(snapshot.cottageFire.buildings[0].firstIgnition.cellId, 'right:3,0');
    const observe = () => {
      assert.equal(snapshot.diagnostics.burningCells, 0);
      for (const event of snapshot.events) if (!events.has(event.id)) events.set(event.id, event);
      for (const sample of snapshot.cottageFire.buildings[1].preheat) {
        peak = Math.max(peak, sample.heatFraction);
        if (!warm.has(sample.id)) warm.set(sample.id, {...sample, time: snapshot.clocks.world});
      }
    };
    observe();
    while (snapshot.clocks.world < seconds) {
      for (const dt of partition) snapshot = sim.advance(dt);
      observe();
    }
    const result = {snapshot, events: [...events.values()], warm, peak};
    assert.ok(sim.dispatch({type: 'reset'}));
    const reset = sim.advance(step);
    assert.deepEqual(reset.structureFire, []);
    assert.ok(reset.cottageFire.buildings.every(b => !b.firstIgnition && !b.retiredAt && !b.preheat.length));
    return result;
  } finally { sim.dispose(); }
}

test('the authored gap admits sustained radiation, while a tall screen and a cold-control run do not', t => {
  const clear = run({cottageWind: wind, radiation: true, embers: false, seconds: 39, partition: [.08, .17]});
  const targetEvents = clear.events.filter(e => e.type === 'cottage-ignition' && e.buildingId === receiverId);
  const first = targetEvents[0], roof = targetEvents.find(e => e.layer === 'roof');
  assert.ok(first && roof);
  assert.equal(first.layer, 'walls');
  assert.equal(first.face, 'front');
  assert.equal(first.cause, 'radiation');
  assert.equal(first.sourceBuildingId, sourceId);
  assert.ok(first.donorCount > 1);
  assert.equal(first.sourceId, sourceId + '/' + first.sourceSiteId);
  const donor = clear.events.find(e => e.type === 'cottage-ignition' && e.buildingId === sourceId && e.cellId === first.sourceSiteId);
  const warming = clear.warm.get(first.cellId);
  assert.ok(donor && warming);
  assert.equal(warming.cause, 'radiation');
  assert.equal(warming.sourceBuildingId, sourceId);
  assert.ok(donor.worldTime < first.worldTime && warming.time < first.worldTime && first.worldTime < roof.worldTime);
  assert.ok(clear.peak > .5 && clear.peak < 1);
  assert.equal(roof.cause, 'surface-spread');
  assert.ok(!clear.events.some(e => e.type === 'cottage-ember-contact'));
  assert.equal(clear.snapshot.cottageFire.diagnostics.launches, 0);
  assert.equal(clear.snapshot.cottageFire.diagnostics.radiantLinks, 2074);
  const [source, receiver] = clear.snapshot.cottageFire.buildings;
  near(source.retiredAt, source.firstIgnition.time + 30);
  near(receiver.retiredAt, first.worldTime + 30);
  assert.ok(source.retiredAt < receiver.retiredAt);
  assert.ok(clear.snapshot.world.obstacles.every(box => !COTTAGE_IDS.includes(box.buildingId)));
  t.diagnostic(JSON.stringify({first, roof: roof.worldTime, retired: [source.retiredAt, receiver.retiredAt]}));

  for (const [radiation, screened] of [[true, true], [false, false]]) {
    const control = run({cottageWind: wind, radiation, embers: false, screened, seconds: 32});
    assert.equal(control.peak, 0);
    assert.equal(control.warm.size, 0);
    assert.equal(control.snapshot.cottageFire.buildings[1].firstIgnition, null);
    assert.equal(control.snapshot.cottageFire.buildings[1].gone, false);
    near(control.snapshot.cottageFire.buildings[0].retiredAt, source.retiredAt);
  }
});

test('windborne ember ignition is independently reproducible with radiation disabled', () => {
  const runOnlyEmbers = run({cottageWind: wind, radiation: false, embers: true, seconds: 12.25});
  const ignition = runOnlyEmbers.events.find(e => e.type === 'cottage-ignition' && e.buildingId === receiverId);
  const contact = runOnlyEmbers.events.find(e => e.type === 'cottage-ember-contact' && e.sourceId === ignition?.sourceId);
  assert.equal(ignition?.cause, 'ember');
  assert.equal(ignition.layer, 'roof');
  assert.equal(ignition.cellId, 'roof:9');
  assert.equal(contact?.hot, true);
  assert.equal(contact.sourceBuildingId, sourceId);
  assert.ok(contact.worldTime <= ignition.worldTime);
  near(ignition.worldTime, 11.96666666666684);
  assert.equal(runOnlyEmbers.snapshot.cottageFire.diagnostics.radiantLinks, 0);
});

test('short finite exposure warms the real receiving siding, then cools below threshold', t => {
  const definition = scenarioDefinition(pair);
  prepareCottageFootprints(definition);
  const lots = COTTAGE_IDS.map(id => {
    const building = definition.buildings.find(b => b.id === id);
    const topology = createCottageTopology(building, calmCottageWind);
    // A limited exposure fixture isolates the five actual wall panels from
    // their in-house spread links. It retains the authored points and fuel.
    for (const site of topology.sites) site.links = [];
    return {...topology, building, tiles: makeTiles(), colliders: definition.obstacles.filter(box => box.buildingId === id)};
  });
  const [source, receiver] = lots;
  const active = ['right:5,1', 'right:6,1', 'back:5,1', 'right:6,0', 'back:5,0'].map(id => source.byId.get(id));
  for (const site of active) Object.assign(site, {phase: 'burning', ignitedAt: 0, burnSeconds: 1.5});
  const present = (lot, site) => !lot.building.destroyed && lot.tiles[site.tile][site.layer === 'walls' ? 'upper' : site.layer];
  const heat = createCottageRadiation(lots, definition.obstacles, present);
  let peak = 0, previous = 0;
  for (let tick = 1; tick <= 240; tick++) {
    const time = tick * step;
    heat.exchange(step, time);
    for (const lot of lots) stepSurfaceFire(lot.sites, step, time, site => present(lot, site), () => assert.fail('Unexpected new flame'));
    const warm = Math.max(...receiver.walls.map(site => site.heat));
    if (time >= 1.5) assert.ok(warm <= previous);
    previous = warm;
    peak = Math.max(peak, warm);
  }
  assert.ok(peak > .05 && peak < 1);
  assert.ok(active.every(site => site.phase === 'spent'));
  assert.ok(receiver.walls.every(site => site.phase === 'cold' && site.heat === 0 && site.cause === null));
  t.diagnostic(JSON.stringify({peak, burnSeconds: 1.5}));
});

test('doubling distance at the same angles cuts radiant dose to one quarter', () => {
  const from = {x: 0, y: 0, h: 3, nx: 1, ny: 0, nz: 0};
  const receiver = x => ({x, y: 0, h: 3, nx: -1, ny: 0, nz: 0});
  const close = radiantWeight(from, receiver(4)), far = radiantWeight(from, receiver(8));
  assert.ok(close > far && far > 0);
  near(close, far * 4);
  near(radiantWeight(from, receiver(.25)), radiantWeight(from, receiver(.75)));
  assert.equal(radiantWeight(from, {...receiver(4), nx: 1}), 0);
  assert.equal(radiantWeight(from, receiver(17)), 0);
});
