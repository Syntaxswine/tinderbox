import test from 'node:test';
import assert from 'node:assert/strict';
import {createSimulation, DEFAULT_CONFIG, SCENARIOS} from '../../src/simulation/index.js';

const {step} = DEFAULT_CONFIG;
const press = {type: 'primary', pressed: true}, release = {type: 'primary', pressed: false};
const move = (x, y = 0) => ({type: 'move', x, y});
const eastWindow = {x: 10.68, y: 32.5, heading: Math.PI};
const windowSite = 'hopkins-nine/wall:0:6,2|6,3:0';
const contact = (snapshot, siteId, cause) => snapshot.events.find(event =>
  event.type === 'structure-ignition' && event.siteId === siteId && event.cause === cause);

function street(player, obstacles = [], extra = {}) {
  return createSimulation({scenario: {...SCENARIOS.neighborhood, actors: [], pickups: [],
    patches: [], obstacles, player, ...extra.scenario},
  config: {input: {cameraRelative: false}, fire: {damagePerSecond: 0}, ...extra.config}});
}
function lob(sim, heading, reach) {
  sim.dispatch(press);
  sim.advance(step);
  const magnitude = .12 + .88 * reach / DEFAULT_CONFIG.tools.molotov.range;
  sim.dispatch(release);
  sim.dispatch(move(magnitude * Math.cos(heading), magnitude * Math.sin(heading)));
  sim.dispatch(move(0));
  const {canThrow, impact: preview} = sim.advance(step).player.lanternAim;
  assert.ok(canThrow && preview);
  sim.dispatch(press);
  for (let i = 0; i < 5; i++) {
    const snapshot = sim.advance(.25);
    const impact = snapshot.events.find(event => event.type === 'molotov-impact');
    if (!impact) continue;
    assert.deepEqual(preview, {x: impact.x, y: impact.y, h: impact.h});
    return {snapshot, impact};
  }
  assert.fail('The launched lantern did not land');
}

test('Hopkins 9 retains its rectangular movement plinth and accepts flame above it', () => {
  const sim = street({...eastWindow, tool: 'flamethrower'});
  try {
    const before = sim.snapshot();
    const plinth = before.world.obstacles.find(box => box.id === 'hopkins-nine:foundation');
    assert.equal(plinth.width, 7.18);
    assert.equal(plinth.height, 4.6);
    sim.dispatch(move(-1));
    const blocked = sim.advance(.25);
    assert.ok(blocked.player.x >= plinth.x + plinth.width / 2 + blocked.player.radius - 1e-8);
    assert.equal(blocked.world.obstacles, before.world.obstacles);
    sim.dispatch(move(0));
    sim.dispatch({type: 'aim', x: 9.08, y: 32.5});
    sim.dispatch(press);
    const lit = sim.advance(.25);
    assert.equal(lit.discharge.range, 4.5);
    assert.ok(contact(lit, windowSite, 'flamethrower'));
  } finally { sim.dispose(); }
});

test('Hopkins 9 has a clear high path over its porch and a separate local deck contact', () => {
  const sim = street({x: 3.5, y: 27.87, heading: Math.PI / 2, tool: 'flamethrower'});
  try {
    sim.dispatch(press);
    const lit = sim.advance(.25);
    assert.ok(contact(lit, 'hopkins-nine/wall:0:0,1|1,1:0', 'flamethrower'));
    assert.equal(contact(lit, 'hopkins-nine/deck:porch:0', 'flamethrower')?.height, .48);
  } finally { sim.dispose(); }
});

test('a lantern can hit a setback wall, or land on the open stone plinth before it', () => {
  for (const reachesSiding of [true, false]) {
    const sim = street({...eastWindow, tool: 'molotov'});
    try {
      const {snapshot, impact} = lob(sim, eastWindow.heading, reachesSiding ? 2.05 : 1.23);
      if (reachesSiding) {
        assert.ok(contact(snapshot, windowSite, 'molotov'));
        assert.ok(Math.abs(impact.x - 9.08) < .002 && impact.h > .48);
      } else {
        assert.ok(impact.x > 9.5 && impact.x < 10 && Math.abs(impact.h - .36) < .002);
        assert.ok(!snapshot.events.some(event => event.type === 'structure-ignition'));
      }
    } finally { sim.dispose(); }
  }
});

test('Hopkins 13 deepest siding needs a lantern from the legal standing point', () => {
  const player = {x: 22.5, y: 38.68, heading: -Math.PI / 2};
  const site = 'hopkins-thirteen/wall:0:7,4|8,4:0';
  const flamer = street({...player, tool: 'flamethrower'});
  const lantern = street({...player, tool: 'molotov'});
  try {
    flamer.dispatch(press);
    const snapshot = flamer.advance(.25);
    assert.equal(snapshot.discharge.range, 4.5);
    assert.equal(contact(snapshot, site, 'flamethrower'), undefined);
    const thrown = lob(lantern, player.heading, 4.9);
    assert.ok(contact(thrown.snapshot, site, 'molotov'));
    assert.ok(Math.abs(thrown.impact.y - 34.08) < .011);
  } finally { flamer.dispose(); lantern.dispose(); }
});

test('masonry screen covers the notch even with caller-owned custom metadata', () => {
  const screen = {id: 'notch-screen', x: 9.92, y: 32.5, width: .06, depth: 2, height: 2.5, material: 'masonry',
    vertices: 'a label', planes: ['custom metadata'], owner: {name: 'street'}, bottom: 20, top: 21};
  const flamer = street({...eastWindow, tool: 'flamethrower'}, [screen]);
  const lantern = street({...eastWindow, tool: 'molotov'}, [screen]);
  try {
    flamer.dispatch(press);
    const snapshot = flamer.advance(.25);
    assert.ok(snapshot.discharge.rays.every(ray => ray.obstacleId === screen.id));
    assert.equal(contact(snapshot, windowSite, 'flamethrower'), undefined);
    const thrown = lob(lantern, eastWindow.heading, 2.05);
    assert.ok(thrown.impact.x > 9.92);
    assert.equal(contact(thrown.snapshot, windowSite, 'molotov'), undefined);
  } finally { flamer.dispose(); lantern.dispose(); }
});

test('a retiring Hopkins section removes its elevated blocker as well as its movement box', () => {
  const house = SCENARIOS.neighborhood.buildings.find(building => building.id === 'hopkins-nine');
  const sim = street({...eastWindow, y: 34.5, tool: 'matches'}, [], {
    scenario: {width: 16, height: 44, buildings: [house], modules: [], shopId: undefined}, config: {fuel: {surfaceBurnRate: 1}}
  });
  try {
    sim.dispatch({type: 'aim', x: 10.02, y: 34.5});
    sim.dispatch(press);
    const before = sim.advance(step);
    const siding = 'hopkins-nine/wall:0:7,4|7,5:0';
    assert.ok(contact(before, siding, 'matches'));
    sim.dispatch(release);
    let snapshot;
    for (let i = 0; i < 601; i++) snapshot = sim.advance(.25);
    const retired = snapshot.events.find(event => event.type === 'building-section-burnout');
    assert.equal(retired?.section, 11);
    assert.ok(before.world.obstacles.some(box => box.id === 'hopkins-nine:foundation'));
    assert.ok(!snapshot.world.obstacles.some(box =>
      box.id === 'hopkins-nine:foundation' || box.id === 'hopkins-nine:foundation:11'));
    sim.dispatch({type: 'select-tool', tool: 'flamethrower'});
    sim.dispatch(press);
    const lit = sim.advance(step);
    const center = lit.discharge.rays.find(ray => Math.abs(ray.angle - Math.PI) < 1e-8);
    assert.ok(center?.distance > 2);
  } finally { sim.dispose(); }
});
