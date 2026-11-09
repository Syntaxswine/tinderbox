import test from 'node:test';
import assert from 'node:assert/strict';
import * as T from '../../src/runtime/three.js';
import {createBellAndAlder} from '../../src/art/bell-and-alder.js';
import {BELL_AND_ALDER} from '../../src/content/bell-and-alder-layout.js';
import {COTTAGE_PAIR_SCENARIO} from '../../src/content/cottage-pair.js';
import {NEIGHBORHOOD_BASE, NEIGHBORHOOD_SCENARIO} from '../../src/content/neighborhood.js';
import {calmCottageWind} from '../../src/reuse/ashland/wind.js';
import {scenarioDefinition} from '../../src/simulation/fixtures.js';
import {createSimulation, DEFAULT_CONFIG, worldToStick} from '../../src/simulation/index.js';
import {firstHeatContact, freePoint} from '../../src/simulation/geometry.js';

const {step, input, player: {speed}} = DEFAULT_CONFIG;
const near = (actual, expected) => assert.ok(Math.abs(actual - expected) < 1e-7, `${actual} != ${expected}`);
const shopProp = (world, name) => world.obstacles.find(o => o.id === BELL_AND_ALDER.id + ':' + name);
const portalId = 'bell-and-alder:entry', objectId = 'bell-and-alder:hand-lantern';
const door = action => ({type: 'interact', portalId, action});
const take = {type: 'interact', objectId, action: 'take'};
const act = (sim, command) => { assert.ok(sim.dispatch(command)); return sim.advance(step); };
const shopVisit = (player, extra = {}) => createSimulation({
  scenario: {...NEIGHBORHOOD_SCENARIO, player, actors: [], ...extra},
  characterId: 'bear', config: {fire: {damagePerSecond: 0}}
});

function walkToward(sim, x, y) {
  const {player} = sim.snapshot(), dx = x - player.x, dy = y - player.y;
  let steps = Math.max(1, Math.ceil(Math.hypot(dx, dy) / (speed * step)));
  const reach = steps * speed * step;
  sim.dispatch({type: 'move', ...worldToStick({x: dx / reach, y: dy / reach}, input)});
  while (steps > 0) {
    const count = Math.min(steps, 15);
    sim.advance(count * step);
    steps -= count;
  }
  sim.dispatch({type: 'move', x: 0, y: 0});
  return sim.advance(step);
}

function walkTo(sim, x, y) {
  const snapshot = walkToward(sim, x, y);
  near(snapshot.player.x, x);
  near(snapshot.player.y, y);
  return snapshot;
}

function igniteSupport(sim, lamp) {
  sim.dispatch({type: 'aim', x: lamp.x, y: lamp.y});
  sim.dispatch({type: 'primary', pressed: true});
  return act(sim, {type: 'primary', pressed: false});
}

function waitForSupportBurnout(sim, snapshot) {
  for (let i = 0; i < 240 && shopProp(snapshot.world, 'parlor-lamp'); i++) snapshot = sim.advance(.25);
  assert.equal(shopProp(snapshot.world, 'parlor-lamp'), undefined);
  assert.equal(snapshot.events.filter(event => event.type === 'obstacle-burnout' && event.objectId === 'bell-and-alder:parlor-lamp').length, 1);
  return snapshot;
}

test('only the regular Catalogue Street includes Bell & Alder timber, modules and fixtures', () => {
  const street = scenarioDefinition('neighborhood'), cottages = scenarioDefinition(COTTAGE_PAIR_SCENARIO);
  assert.ok(BELL_AND_ALDER.patches.some(patch => patch.material === 'wood'));
  assert.deepEqual(street.patches.slice(NEIGHBORHOOD_BASE.patches.length), BELL_AND_ALDER.patches);
  assert.deepEqual(street.modules.map(module => module.id), BELL_AND_ALDER.modules.map(module => module.id));
  assert.deepEqual(street.obstacles.filter(obstacle => obstacle.shopId === BELL_AND_ALDER.id), BELL_AND_ALDER.obstacles);
  assert.equal(street.shopId, BELL_AND_ALDER.id);
  assert.deepEqual(cottages.patches.slice(0, -1), NEIGHBORHOOD_BASE.patches);
  assert.deepEqual(cottages.modules, []);
  assert.ok(cottages.obstacles.every(obstacle => obstacle.shopId !== BELL_AND_ALDER.id));
  const replay = createSimulation({scenario: COTTAGE_PAIR_SCENARIO, cottageWind: calmCottageWind});
  try {
    assert.equal(replay.snapshot().world.shop, undefined);
    assert.equal(replay.dispatch(door('open')), false);
    assert.equal(replay.dispatch(take), false);
  } finally { replay.dispose(); }
});

test('the native bear opens the closed shop from Catalogue Street and can close it after clearing the threshold', () => {
  const sim = createSimulation({scenario: 'neighborhood', characterId: 'bear'});
  try {
    const start = sim.snapshot(), {entrance} = BELL_AND_ALDER;
    assert.equal(start.player.radius, .56);
    assert.equal(start.player.interaction, null);
    assert.deepEqual(start.world.shop.lantern, {id: objectId, state: 'placed', position: [41.65, .747, 11.6]});
    const leafIds = [portalId + ':left', portalId + ':right'];
    const closedLeaves = leafIds.map((id, i) => ({id, x: 39.5 + i, y: 17, width: 1, depth: .12, height: 1.65, heading: 0}));
    assert.deepEqual(start.world.shop.door, {id: portalId, open: false, leaves: closedLeaves});
    start.world.shop.door.leaves[0].x = 99;
    start.world.shop.lantern.position[0] = 99;
    assert.deepEqual(sim.snapshot().world.shop.door.leaves, closedLeaves);
    assert.equal(sim.snapshot().world.shop.lantern.position[0], 41.65);
    const window = shopProp(start.world, 'front-glazing-1');
    const lamp = shopProp(start.world, 'parlor-lamp');
    walkTo(sim, start.player.x, 18.5);
    walkTo(sim, window.x, 18.5);
    const glazing = walkToward(sim, window.x, entrance.y - 1);
    const windowGap = glazing.player.y - window.y - window.depth / 2;
    assert.ok(windowGap >= .56 - 1e-8 && windowGap < .60);

    walkTo(sim, window.x, 18.5);
    walkTo(sim, entrance.x, 18.5);
    const atDoor = walkToward(sim, entrance.x, entrance.y - 1);
    assert.ok(atDoor.player.y >= entrance.y + .62 - 1e-8 && atDoor.player.y < entrance.y + .66);
    assert.deepEqual(atDoor.player.interaction, {id: portalId, kind: 'door', action: 'open', label: 'Open shop doors',
      enabled: true, reason: '', anchor: [40, 2.15, 17]});
    assert.ok(sim.dispatch(door('open')));
    const opened = act(sim, door('open'));
    assert.equal(opened.events.filter(event => event.type === 'portal-state').length, 1);
    const openLeaves = leafIds.map((id, i) => ({id, x: 39 + 2 * i, y: 16.5, width: .12, depth: 1, height: 1.65,
      heading: (i === 0 ? -1 : 1) * Math.PI / 2}));
    assert.deepEqual(opened.world.shop.door, {id: portalId, open: true, leaves: openLeaves});
    for (const {world} of [atDoor, opened]) for (const leaf of world.shop.door.leaves) {
      assert.deepEqual(world.obstacles.find(box => box.id === leaf.id), {...leaf, shopId: BELL_AND_ALDER.id,
        portalId, kind: 'door', material: 'glass', solid: true, blocksHeat: true});
    }
    const threshold = walkTo(sim, entrance.x, entrance.y);
    assert.equal(threshold.player.interaction.action, 'close');
    assert.equal(threshold.player.interaction.enabled, false);
    assert.match(threshold.player.interaction.reason, /clear/i);
    assert.equal(act(sim, door('close')).world.shop.door.open, true);

    const inside = walkTo(sim, entrance.x, lamp.y);
    assert.ok(inside.player.y < entrance.y);
    const floor = inside.world.tiles.find(tile => Math.abs(tile.x - inside.player.x) <= tile.size / 2 &&
      Math.abs(tile.y - inside.player.y) < tile.size / 2);
    assert.equal(floor?.material, 'wood');
    const blocked = walkToward(sim, lamp.x, lamp.y);
    const gap = lamp.x - lamp.width / 2 - blocked.player.x;
    assert.ok(gap >= .56 - 1e-8 && gap < .60);
    assert.ok(freePoint(blocked.player, blocked.player.radius, blocked.world, blocked.world.obstacles));
    assert.ok(!freePoint(lamp, blocked.player.radius, blocked.world, blocked.world.obstacles));
    walkTo(sim, entrance.x, lamp.y);
    const outside = walkTo(sim, entrance.x, 18.5);
    assert.ok(outside.player.y > entrance.y);
    assert.deepEqual(act(sim, door('close')).world.shop.door, {id: portalId, open: false, leaves: closedLeaves});
  } finally { sim.dispose(); }
});

test('door commands recheck live actors, pause, reach and line of access at consumption', () => {
  const player = {x: 40, y: 18.2};
  const blocker = {id: 'reach-blocker', x: 40, y: 17.4, width: 2, depth: .08, height: 2, material: 'masonry'};
  for (const [spawn, extra] of [[{x: 40, y: 18.7}, {}], [{...player, hp: 0}, {}],
    [player, {obstacles: [...NEIGHBORHOOD_SCENARIO.obstacles, blocker]}]]) {
    const sim = shopVisit(spawn, extra);
    try {
      assert.equal(sim.snapshot().player.interaction, null);
      assert.equal(act(sim, door('open')).world.shop.door.open, false);
    } finally { sim.dispose(); }
  }
  const inside = shopVisit({x: 39.32, y: 16.33});
  try {
    assert.equal(inside.snapshot().player.interaction.enabled, false);
    assert.equal(act(inside, door('open')).world.shop.door.open, false);
  } finally { inside.dispose(); }

  const walker = {id: 'shop-visitor', x: 40, y: 15.85, speed: 3, radius: .5, route: [{x: 40, y: 15.85}, {x: 40, y: 17.2}]};
  const sim = shopVisit(player, {actors: [walker]});
  try {
    for (const command of [{type: 'interact'}, {...door('open'), objectId}, {...take, portalId},
      {...door('open'), portalId: 'unknown'}, {...take, action: 'open'}]) assert.equal(sim.dispatch(command), false);
    assert.equal(act(sim, door('close')).world.shop.door.open, false);
    sim.dispatch({type: 'pause', paused: true});
    const paused = act(sim, door('open'));
    assert.equal(paused.world.shop.door.open, false);
    assert.equal(paused.player.interaction.reason, 'Paused.');
    sim.dispatch({type: 'pause', paused: false});
    const opened = act(sim, door('open'));
    assert.equal(opened.player.interaction.enabled, true);
    assert.ok(sim.dispatch({...door('close'), atTick: opened.tick + 15}));
    const blocked = sim.advance(.25);
    assert.equal(blocked.world.shop.door.open, true);
    assert.equal(blocked.player.interaction.enabled, false);
    assert.match(blocked.player.interaction.reason, /clear/i);
  } finally { sim.dispose(); }
});

test('both glass leaves affect heat and lantern trajectories and cannot be toggled during active aiming', () => {
  function aimAcrossDoor(sim) {
    sim.dispatch({type: 'primary', pressed: true});
    sim.dispatch({type: 'primary', pressed: false});
    sim.dispatch({type: 'move', ...worldToStick({x: 0, y: -.56}, input)});
    return act(sim, {type: 'move', x: 0, y: 0});
  }
  for (const [x, side] of [[39.7, 'left'], [40.3, 'right']]) {
    const from = {x, y: 18.2}, to = {x, y: 15.2};
    const sim = shopVisit({...from, tool: 'molotov'});
    try {
      const closed = aimAcrossDoor(sim);
      const contact = firstHeatContact(from, to, closed.world.obstacles, 1, 1);
      assert.equal(contact.box.id, portalId + ':' + side);
      assert.equal(closed.player.interaction, null);
      assert.ok(closed.player.lanternAim.impact.y > 17);
      const rejected = act(sim, door('open'));
      assert.deepEqual(rejected.player.lanternAim, closed.player.lanternAim);
      assert.equal(rejected.world.shop.door.open, false);

      sim.dispatch({type: 'cancel-input'});
      const opened = act(sim, door('open'));
      assert.equal(firstHeatContact(from, to, opened.world.obstacles, 1, 1), null);
      const aim = aimAcrossDoor(sim).player.lanternAim;
      near(aim.impact.y, to.y);
      sim.dispatch({type: 'primary', pressed: true});
      // On the left, close the door after release but before the live flight advances.
      if (side === 'left') sim.dispatch(door('close'));
      sim.advance(.25);
      const impact = sim.advance(.25).events.find(event => event.type === 'molotov-impact');
      near(impact.x, x);
      near(impact.y, side === 'left' ? closed.player.lanternAim.impact.y : aim.impact.y);
    } finally { sim.dispose(); }
  }
});

test('taking the placed lantern requires clear current reach and leaves the weapon stock independent', async t => {
  const player = {x: 40.05, y: 11.6, tool: 'molotov'};
  const blocker = {id: 'reach-blocker', x: 40.8, y: 11.6, width: .08, depth: 2, height: 2, material: 'wood'};
  for (const [spawn, extra] of [[{...player, x: 39.95}, {}], [player, {obstacles: [...NEIGHBORHOOD_SCENARIO.obstacles, blocker]}]]) {
    const sim = shopVisit(spawn, extra);
    try {
      assert.equal(sim.snapshot().player.interaction, null);
      assert.equal(act(sim, take).world.shop.lantern.state, 'placed');
    } finally { sim.dispose(); }
  }

  const sim = shopVisit(player);
  t.mock.method(T.TextureLoader.prototype, 'loadAsync', async () => new T.Texture({width: 1, height: 1}));
  let shop;
  try {
    const start = sim.snapshot(), lamp = shopProp(start.world, 'parlor-lamp');
    assert.deepEqual(start.player.interaction, {id: objectId, kind: 'lantern', action: 'take', label: 'Take lantern',
      enabled: true, reason: '', anchor: [41.65, 1.35, 11.6]});
    sim.dispatch({type: 'primary', pressed: true});
    sim.dispatch({type: 'primary', pressed: false});
    const aiming = act(sim, take);
    assert.ok(aiming.player.lanternAim);
    assert.equal(aiming.player.interaction, null);
    assert.equal(aiming.world.shop.lantern.state, 'placed');

    sim.dispatch({type: 'select-tool', tool: 'matches'});
    sim.dispatch(take);
    const carried = act(sim, take);
    assert.deepEqual(carried.world.shop.lantern, {id: objectId, state: 'carried', position: null});
    assert.equal(carried.player.interaction, null);
    assert.deepEqual(carried.player.inventory, start.player.inventory);
    assert.equal(carried.events.filter(event => event.type === 'lantern-taken').length, 1);

    walkToward(sim, lamp.x, lamp.y);
    const afterBurn = waitForSupportBurnout(sim, igniteSupport(sim, lamp));
    assert.deepEqual(afterBurn.world.shop.lantern, carried.world.shop.lantern);
    assert.equal(afterBurn.player.inventory.molotovs, start.player.inventory.molotovs);
    shop = await createBellAndAlder(T);
    shop.update(afterBurn.world, {player: afterBurn.player});
    const {placements, lights, lantern} = shop.diagnostics();
    assert.equal(placements.find(p => p.colliderId === lamp.id).visible, false);
    assert.equal(lantern.state, 'carried');
    assert.equal(lights.find(light => light.objectId === objectId).visible, true);
    const reset = act(sim, {type: 'reset'});
    assert.deepEqual(reset.world.shop, start.world.shop);
    assert.ok(shopProp(reset.world, 'parlor-lamp'));
    assert.equal(act(sim, take).world.shop.lantern.state, 'carried');
  } finally { shop?.dispose(); sim.dispose(); }
});

test('a reachable match burns the live pedestal and retires its collider, model and placed light together', async t => {
  const lamp = shopProp(BELL_AND_ALDER, 'parlor-lamp');
  const scenario = {...NEIGHBORHOOD_SCENARIO, player: {x: BELL_AND_ALDER.entrance.x, y: lamp.y, tool: 'matches'}};
  const sim = createSimulation({scenario, characterId: 'bear', config: {fire: {damagePerSecond: 0}}});
  const texture = new T.Texture({width: 1, height: 1});
  t.mock.method(T.TextureLoader.prototype, 'loadAsync', async () => texture);
  let shop;
  try {
    shop = await createBellAndAlder(T);
    const show = s => {
      shop.update(s.world, {player: s.player});
      const {placements, lights, lantern} = shop.diagnostics();
      return {model: placements.find(p => p.colliderId === lamp.id).visible,
        light: lights.find(light => light.objectId === objectId).visible, lantern: lantern.state};
    };
    const nearLamp = walkToward(sim, lamp.x, lamp.y);
    assert.deepEqual(show(nearLamp), {model: true, light: true, lantern: 'placed'});
    // Compare the assembled meshes to their world boxes, including rotated stock and chairs.
    shop.root.traverse(model => {
      if (!model.userData.colliderId) return;
      const box = nearLamp.world.obstacles.find(o => o.id === model.userData.colliderId);
      assert.ok(box);
      const bounds = new T.Box3().setFromObject(model, true);
      const expected = [box.x - box.width / 2, box.x + box.width / 2, box.y - box.depth / 2, box.y + box.depth / 2, box.height];
      const measured = [bounds.min.x, bounds.max.x, bounds.min.z, bounds.max.z, bounds.max.y];
      assert.ok(measured.every((value, index) => Math.abs(value - expected[index]) < .002), box.id);
    });

    let snapshot = igniteSupport(sim, lamp);
    const ignition = snapshot.events.find(event => event.type === 'tool-use' && event.tool === 'matches');
    assert.equal(ignition?.result, 'ignited');
    assert.equal(ignition.heatedCells, 1);
    near(ignition.x, lamp.x - lamp.width / 2);
    assert.ok(snapshot.cells.some(cell => cell.id === ignition.cellIds[0] && cell.material === 'wood' && cell.phase === 'burning'));
    assert.deepEqual(show(snapshot), {model: true, light: true, lantern: 'placed'});
    snapshot = waitForSupportBurnout(sim, snapshot);
    const burnout = snapshot.events.filter(event => event.type === 'obstacle-burnout' && event.objectId === lamp.id);
    assert.deepEqual(snapshot.world.shop.lantern, {id: objectId, state: 'spent', position: null});
    assert.equal(act(sim, take).world.shop.lantern.state, 'spent');
    assert.deepEqual(show(snapshot), {model: false, light: false, lantern: 'spent'});
    walkTo(sim, lamp.x, lamp.y);
    t.diagnostic(`Pedestal retirement ${((burnout[0].tick - ignition.tick) * step).toFixed(2)} world seconds after the match`);

    sim.dispatch({type: 'reset'});
    const reset = sim.advance(step);
    assert.ok(shopProp(reset.world, 'parlor-lamp'));
    assert.deepEqual(show(reset), {model: true, light: true, lantern: 'placed'});
  } finally { shop?.dispose(); sim.dispose(); }
});
