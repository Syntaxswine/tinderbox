import test from 'node:test';
import assert from 'node:assert/strict';
import {catalogueVisit} from '../../src/main.js';
import {COTTAGE_PAIR_SCENARIO} from '../../src/content/cottage-pair.js';
import {SHOP_WITNESS_SCENARIO} from '../../src/content/neighborhood.js';
import {calmCottageWind} from '../../src/reuse/ashland/wind.js';
import {createSimulation, DEFAULT_CONFIG, worldToStick} from '../../src/simulation/index.js';
import {SHOP_WITNESS_RULES} from '../../src/simulation/shop-witness.js';

const {step, input, player: {speed}} = DEFAULT_CONFIG;
const visit = extra => createSimulation({scenario: {...SHOP_WITNESS_SCENARIO, ...extra}, seed: 1893,
  config: {fire: {damagePerSecond: 0}}});
const portalId = 'bell-and-alder:entry';
const take = {type: 'interact', objectId: 'bell-and-alder:hand-lantern', action: 'take'};
const door = action => ({type: 'interact', portalId, action});
const apronTile = {x: 40.2, y: 16.48};

function act(sim, ...commands) {
  for (const command of commands) assert.ok(sim.dispatch(command));
  return sim.advance(step);
}

function press(sim, tool, point = apronTile) {
  return act(sim, {type: 'select-tool', tool}, {type: 'aim', ...point}, {type: 'primary', pressed: true},
    {type: 'primary', pressed: false});
}

function walkTo(sim, x, y) {
  const player = sim.snapshot().player, dx = x - player.x, dy = y - player.y;
  let ticks = Math.max(1, Math.ceil(Math.hypot(dx, dy) / (speed * step)));
  const reach = ticks * speed * step;
  sim.dispatch({type: 'move', ...worldToStick({x: dx / reach, y: dy / reach}, input)});
  while (ticks) {
    const count = Math.min(15, ticks);
    sim.advance(count * step);
    ticks -= count;
  }
  const frame = act(sim, {type: 'move', x: 0, y: 0});
  assert.ok(Math.hypot(frame.player.x - x, frame.player.y - y) < 1e-6);
  return frame;
}

function currentIgnitions(frame, cause) {
  return frame.events.filter(event => event.tick === frame.tick && event.type === 'ignition' && event.cause === cause);
}

function carryToDoor(sim) {
  assert.equal(act(sim, door('open')).world.shop.door.open, true);
  walkTo(sim, 40, 11.6);
  const taken = act(sim, take);
  assert.equal(taken.world.shop.lantern.state, 'carried');
  assert.equal(taken.witness.memory, null, 'the pickup is beyond the clerk’s sight range');
  const nearDoor = walkTo(sim, 40, 15.75);
  assert.deepEqual(nearDoor.witness.memory, {playerId: nearDoor.player.id, x: nearDoor.player.x, y: nearDoor.player.y,
    worldTime: nearDoor.clocks.world});
  return nearDoor;
}

test('the clerk alarms on a visible match or lit-torch ignition without a lantern sighting, and reset clears it', () => {
  const sim = visit();
  try {
    for (const tool of ['matches', 'torch']) {
      assert.equal(act(sim, door('open')).world.shop.door.open, true);
      walkTo(sim, 40, 15.75);
      if (tool === 'torch') {
        const lit = press(sim, tool);
        assert.equal(lit.player.torch.phase, 'lit');
        assert.equal(lit.witness.reaction, null);
        assert.equal(currentIgnitions(lit, tool).length, 0);
      }
      const alarm = press(sim, tool);
      assert.ok(currentIgnitions(alarm, tool).length > 0);
      assert.equal(alarm.witness.memory, null);
      assert.equal(alarm.witness.reaction.kind, 'alarmed');
      assert.equal(alarm.witness.reaction.worldTime, alarm.clocks.world);
      const clerk = alarm.actors.find(actor => actor.id === alarm.witness.actorId);
      assert.ok(Math.abs(clerk.heading - Math.atan2(alarm.player.y - clerk.y, alarm.player.x - clerk.x)) < 1e-9);
      const reset = act(sim, {type: 'reset'});
      assert.deepEqual(reset.witness, {actorId: 'neighbor-goat', memory: null, reaction: null});
      assert.equal(reset.world.shop.door.open, false);
      assert.equal(reset.world.shop.lantern.state, 'placed');
    }
  } finally { sim.dispose(); }
});

test('a concealed low strike and a fresh lantern sighting raise suspicion on reveal, then direct evidence raises alarm', () => {
  const sim = visit();
  try {
    const nearDoor = carryToDoor(sim);
    const closed = act(sim, door('close'));
    assert.equal(closed.world.shop.door.open, false);
    assert.ok(closed.witness.memory.worldTime > nearDoor.witness.memory.worldTime, 'the clerk sees the player through the glazing');
    const hidden = press(sim, 'matches');
    assert.equal(currentIgnitions(hidden, 'matches').length, 4);
    assert.equal(hidden.witness.reaction, null, 'the apron conceals the low fire start');
    const revealed = act(sim, door('open'));
    assert.equal(revealed.witness.reaction.kind, 'suspicious');
    assert.ok(revealed.witness.reaction.worldTime > hidden.clocks.world);
    const alarm = press(sim, 'matches', {x: 40.2, y: 15.2});
    assert.ok(currentIgnitions(alarm, 'matches').length > 0);
    assert.equal(alarm.witness.reaction.kind, 'alarmed');
  } finally { sim.dispose(); }
});

test('a hidden ignition revealed after its sighting expires never becomes evidence', () => {
  const sim = visit();
  try {
    carryToDoor(sim);
    act(sim, door('close'));
    const hidden = press(sim, 'matches');
    const cells = currentIgnitions(hidden, 'matches').map(event => event.cellId);
    assert.equal(cells.length, 4);
    assert.equal(hidden.witness.reaction, null);
    const sheltered = walkTo(sim, 40, 12.3);
    const seenAt = sheltered.witness.memory.worldTime;
    let expired = sheltered;
    while (expired.clocks.world <= seenAt + SHOP_WITNESS_RULES.memorySeconds) expired = sim.advance(.25);
    assert.equal(expired.witness.memory, null);
    walkTo(sim, 40, 15.75);
    const revealed = act(sim, door('open'));
    assert.ok(revealed.cells.some(cell => cells.includes(cell.id) && cell.phase === 'burning'));
    assert.ok(revealed.witness.memory.worldTime > hidden.clocks.world);
    assert.equal(revealed.witness.reaction, null);
  } finally { sim.dispose(); }
});

test('a new nearby fire without a witnessed strike supports suspicion only', () => {
  const sim = visit();
  try {
    carryToDoor(sim);
    const hidden = walkTo(sim, 40, 13.25);
    assert.ok(hidden.clocks.world > hidden.witness.memory.worldTime);
    const reach = .12 + .88 * 2.75 / DEFAULT_CONFIG.tools.molotov.range;
    act(sim, {type: 'select-tool', tool: 'molotov'}, {type: 'primary', pressed: true}, {type: 'primary', pressed: false});
    const aiming = act(sim, {type: 'move', ...worldToStick({x: 0, y: reach}, input)}, {type: 'move', x: 0, y: 0});
    assert.ok(aiming.player.lanternAim.canThrow);
    let frame = act(sim, {type: 'primary', pressed: true}, {type: 'primary', pressed: false});
    assert.equal(frame.witness.reaction, null, 'the throw alone is no evidence');
    for (let i = 0; i < 8 && !frame.events.some(event => event.type === 'molotov-impact'); i++) frame = sim.advance(.1);
    const impact = frame.events.find(event => event.type === 'molotov-impact');
    assert.ok(impact && frame.events.some(event => event.type === 'ignition' && event.tick === impact.tick && event.cause === 'molotov'));
    assert.equal(frame.witness.reaction.kind, 'suspicious');
    assert.equal(frame.witness.memory.worldTime, hidden.witness.memory.worldTime);
    assert.equal(frame.world.shop.lantern.state, 'carried');
  } finally { sim.dispose(); }
});

test('a paving dud, an already-burning tile, and ordinary spread never create witness evidence', () => {
  const sim = visit({ignitions: [{x: 40.5, y: 16.5, radius: .02, heat: 2.1}]});
  try {
    const dud = press(sim, 'matches', {x: 40.2, y: 18.8});
    assert.ok(dud.events.some(event => event.type === 'tool-rejected' && event.result === 'no-fuel'));
    assert.equal(dud.witness.reaction, null);
    const seen = carryToDoor(sim);
    const relit = press(sim, 'matches');
    assert.equal(currentIgnitions(relit, 'matches').length, 0);
    assert.equal(relit.witness.reaction, null);
    let spread = relit;
    for (let i = 0; i < 14; i++) spread = sim.advance(.25);
    assert.ok(spread.events.some(event => event.tick > seen.tick && event.type === 'ignition' && event.cause?.startsWith('cell:')));
    assert.ok(spread.witness.memory);
    assert.equal(spread.witness.reaction, null);
  } finally { sim.dispose(); }
});

test('only an opted-in Catalogue Street visit moves the one existing native goat and publishes witness state', () => {
  assert.deepEqual(catalogueVisit(), {cottageMode: null, scenario: 'neighborhood'});
  assert.equal(catalogueVisit('?witness=0').scenario, 'neighborhood');
  assert.equal(catalogueVisit('?witness=1').scenario, SHOP_WITNESS_SCENARIO);
  assert.deepEqual(catalogueVisit('?witness=1&cottages=calm'), {cottageMode: 'calm', scenario: COTTAGE_PAIR_SCENARIO});
  const normal = createSimulation({scenario: 'neighborhood'}), trial = visit();
  const replay = createSimulation({scenario: COTTAGE_PAIR_SCENARIO, cottageWind: calmCottageWind});
  try {
    const base = normal.snapshot(), opted = trial.snapshot();
    assert.equal(base.witness, undefined);
    assert.equal(replay.snapshot().witness, undefined);
    assert.deepEqual(opted.actors.map(actor => actor.id), base.actors.map(actor => actor.id));
    const original = base.actors.find(actor => actor.id === opted.witness.actorId);
    const clerk = opted.actors.find(actor => actor.id === original.id);
    assert.deepEqual([clerk.species, clerk.radius, clerk.height], [original.species, original.radius, original.height]);
    assert.equal(clerk.species, 'goat');
    assert.equal(opted.player.tool, base.player.tool);
    assert.deepEqual(opted.player.inventory, base.player.inventory);
    assert.deepEqual(opted.world.obstacles, base.world.obstacles);
  } finally { normal.dispose(); trial.dispose(); replay.dispose(); }
});
