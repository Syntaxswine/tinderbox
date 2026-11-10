import test from 'node:test';
import assert from 'node:assert/strict';
import {catalogueVisit} from '../../src/main.js';
import {COTTAGE_PAIR_SCENARIO} from '../../src/content/cottage-pair.js';
import {CHICAGO_PATROL} from '../../src/content/exterior-kit.js';
import {SHOP_WITNESS_SCENARIO} from '../../src/content/neighborhood.js';
import {patrolMuzzle} from '../../src/content/patrol-pistol.js';
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
const rules = SHOP_WITNESS_RULES;
const shots = frame => frame.events.filter(event => event.type === 'officer-shot');

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

function wait(sim, seconds) {
  let frame = sim.snapshot();
  const steps = Math.round(seconds / step);
  for (let i = 0; i < steps; i += 15) frame = sim.advance(Math.min(15, steps - i) * step);
  return frame;
}

function lantern(sim, metres) {
  const reach = .12 + .88 * metres / DEFAULT_CONFIG.tools.molotov.range;
  act(sim, {type:'select-tool', tool:'molotov'}, {type:'primary', pressed:true}, {type:'primary', pressed:false});
  const aiming = act(sim, {type:'move', ...worldToStick({x:0,y:reach}, input)}, {type:'move', x:0, y:0});
  assert.ok(aiming.player.lanternAim.canThrow);
  return act(sim, {type:'primary', pressed:true}, {type:'primary', pressed:false});
}

function carryToDoor(sim) {
  assert.equal(act(sim, door('open')).world.shop.door.open, true);
  walkTo(sim, 40, 11.6);
  const taken = act(sim, take);
  assert.equal(taken.world.shop.lantern.state, 'carried');
  assert.equal(taken.witness.memory, null, 'the pickup is beyond the officer’s sight range');
  const nearDoor = walkTo(sim, 40, 15.75);
  assert.deepEqual(nearDoor.witness.memory, {playerId: nearDoor.player.id, x: nearDoor.player.x, y: nearDoor.player.y,
    worldTime: nearDoor.clocks.world});
  return nearDoor;
}

test('a witnessed match or lit torch starts the draw and a clear shot damages the player on world time', () => {
  const sim = visit();
  try {
    for (const tool of ['matches', 'torch']) {
      assert.equal(act(sim, door('open')).world.shop.door.open, true);
      walkTo(sim, 40, 15.75);
      if (tool === 'torch') {
        const lit = press(sim, tool);
        assert.equal(lit.player.torch.phase, 'lit');
        assert.equal(lit.witness.reaction.kind, 'relaxed');
        assert.equal(currentIgnitions(lit, tool).length, 0);
      }
      const aggressive = press(sim, tool);
      assert.ok(currentIgnitions(aggressive, tool).length > 0);
      assert.equal(aggressive.witness.memory, null);
      assert.equal(aggressive.witness.reaction.kind, 'aggressive');
      assert.equal(aggressive.witness.reaction.tool, tool);
      assert.equal(aggressive.witness.reaction.worldTime, aggressive.clocks.world);
      assert.equal(aggressive.witness.aim.progress, 0);
      const officer = aggressive.actors.find(actor => actor.id === aggressive.witness.actorId);
      assert.ok(Math.abs(officer.heading - Math.atan2(aggressive.player.y - officer.y, aggressive.player.x - officer.x)) < 1e-9);
      assert.equal(shots(wait(sim, rules.drawSeconds - step)).length, 0);
      const fired = sim.advance(step), [shot] = shots(fired);
      assert.equal(shots(fired).length, 1);
      assert.equal(fired.witness.aim.progress, 1);
      assert.equal(shot.damage, rules.damage);
      assert.equal(fired.player.hp, aggressive.player.hp - rules.damage);
      assert.equal(fired.witness.shot.id, shot.id);
      assert.deepEqual(shot.muzzle, patrolMuzzle(officer));
      assert.ok(Math.abs(shot.worldTime - aggressive.clocks.world - rules.drawSeconds) < 1e-8);
      const recovered = wait(sim, rules.aggressiveSeconds);
      assert.equal(recovered.witness.reaction.kind, 'relaxed');
      assert.equal(recovered.witness.aim, null);
      assert.equal(recovered.witness.shot, null);
      assert.equal(shots(recovered).length, 2);
      assert.ok(shots(recovered)[1].worldTime - shot.worldTime >= rules.cooldownSeconds - 1e-8);
      const reset = act(sim, {type: 'reset'});
      assert.deepEqual(reset.witness, {actorId: CHICAGO_PATROL.id, memory: null, reaction: {kind:'relaxed', worldTime:0}, aim:null, shot:null});
      assert.equal(shots(reset).length, 0);
      assert.equal(reset.world.shop.door.open, false);
      assert.equal(reset.world.shop.lantern.state, 'placed');
    }
  } finally { sim.dispose(); }
});

test('a concealed low strike and a fresh lantern sighting raise suspicion, with a stowed pistol throughout', () => {
  const sim = visit();
  try {
    const nearDoor = carryToDoor(sim);
    const closed = act(sim, door('close'));
    assert.equal(closed.world.shop.door.open, false);
    assert.ok(closed.witness.memory.worldTime > nearDoor.witness.memory.worldTime, 'the officer sees the player through the glazing');
    const hidden = press(sim, 'matches');
    assert.equal(currentIgnitions(hidden, 'matches').length, 4);
    assert.equal(hidden.witness.reaction.kind, 'relaxed', 'the apron conceals the low fire start');
    const revealed = act(sim, door('open'));
    assert.equal(revealed.witness.reaction.kind, 'suspicious');
    assert.ok(revealed.witness.reaction.worldTime > hidden.clocks.world);
    const officer = revealed.actors.find(actor => actor.id === revealed.witness.actorId);
    const {x, y} = revealed.witness.reaction;
    assert.equal(officer.heading, Math.atan2(y - officer.y, x - officer.x));
    const waiting = wait(sim, rules.suspiciousSeconds - step);
    assert.equal(waiting.witness.reaction.kind, 'suspicious');
    assert.equal(waiting.witness.aim, null);
    assert.equal(waiting.player.hp, 100);
    assert.equal(shots(waiting).length, 0);
    assert.equal(sim.advance(step).witness.reaction.kind, 'relaxed');
  } finally { sim.dispose(); }
});

test('direct evidence supersedes suspicion, and closing the glazed door during the draw prevents damage', () => {
  const sim = visit();
  try {
    carryToDoor(sim);
    act(sim, door('close'));
    assert.equal(press(sim, 'matches').witness.reaction.kind, 'relaxed');
    assert.equal(act(sim, door('open')).witness.reaction.kind, 'suspicious');
    const direct = press(sim, 'matches', {x:40.2,y:15.2});
    assert.equal(direct.witness.reaction.kind, 'aggressive');
    assert.equal(direct.witness.aim.progress, 0);
    assert.equal(act(sim, door('close')).world.shop.door.open, false);
    const covered = walkTo(sim, 40.12, 15.75);
    const drawn = wait(sim, rules.drawSeconds);
    assert.equal(drawn.witness.aim.progress, 1);
    assert.equal(drawn.witness.aim.x, covered.player.x, 'the player remains visible through glass');
    assert.ok(drawn.witness.memory.worldTime > covered.witness.memory.worldTime);
    assert.equal(shots(drawn).length, 0);
    const recovered = wait(sim, rules.aggressiveSeconds);
    assert.equal(recovered.witness.reaction.kind, 'relaxed');
    assert.equal(shots(recovered).length, 0);
    assert.equal(recovered.player.hp, 100);
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
    assert.equal(hidden.witness.reaction.kind, 'relaxed');
    const sheltered = walkTo(sim, 40, 12.3);
    const seenAt = sheltered.witness.memory.worldTime;
    let expired = sheltered;
    while (expired.clocks.world <= seenAt + SHOP_WITNESS_RULES.memorySeconds) expired = sim.advance(.25);
    assert.equal(expired.witness.memory, null);
    walkTo(sim, 40, 15.75);
    const revealed = act(sim, door('open'));
    assert.ok(revealed.cells.some(cell => cells.includes(cell.id) && cell.phase === 'burning'));
    assert.ok(revealed.witness.memory.worldTime > hidden.clocks.world);
    assert.equal(revealed.witness.reaction.kind, 'relaxed');
  } finally { sim.dispose(); }
});

test('a new nearby fire without a witnessed strike supports suspicion only', () => {
  const sim = visit();
  try {
    carryToDoor(sim);
    const hidden = walkTo(sim, 40, 13.25);
    assert.ok(hidden.clocks.world > hidden.witness.memory.worldTime);
    let frame = lantern(sim, 2.75);
    assert.equal(frame.witness.reaction.kind, 'relaxed', 'the throw alone is no evidence');
    for (let i = 0; i < 8 && !frame.events.some(event => event.type === 'molotov-impact'); i++) frame = sim.advance(.1);
    const impact = frame.events.find(event => event.type === 'molotov-impact');
    assert.ok(impact && frame.events.some(event => event.type === 'ignition' && event.tick === impact.tick && event.cause === 'molotov'));
    assert.equal(frame.witness.reaction.kind, 'suspicious');
    assert.equal(frame.witness.memory.worldTime, hidden.witness.memory.worldTime);
    assert.equal(frame.world.shop.lantern.state, 'carried');
  } finally { sim.dispose(); }
});

test('a thrown lantern needs a visible release and impact that ignites fresh fuel', () => {
  const sim = visit();
  try {
    for (const cover of [false, true]) {
      act(sim, door('open'));
      walkTo(sim, 40, 15.45);
      const released = lantern(sim, .85);
      const launch = released.events.find(event => event.tool === 'molotov' && event.projectileId);
      assert.ok(launch);
      assert.equal(released.witness.reaction.kind, 'relaxed');
      if (cover) assert.equal(act(sim, door('close')).world.shop.door.open, false);
      const landed = wait(sim, .18);
      const impact = landed.events.find(event => event.type === 'molotov-impact');
      assert.ok(impact && landed.events.some(event => event.type === 'ignition' && event.tick === impact.tick && event.cause === 'molotov'));
      assert.equal(landed.witness.reaction.kind, cover ? 'relaxed' : 'aggressive');
      if (!cover) assert.equal(landed.witness.reaction.projectileId, launch.projectileId);
      else assert.equal(act(sim, door('open')).witness.reaction.kind, 'relaxed');
      act(sim, {type:'reset'});
    }
  } finally { sim.dispose(); }
});

test('the flamethrower needs the visible emission that crosses the ignition threshold', () => {
  const sim = visit();
  try {
    act(sim, door('open'));
    walkTo(sim, 40, 15.75);
    const emit = () => act(sim, {type:'select-tool',tool:'flamethrower'}, {type:'aim', ...apronTile}, {type:'primary', pressed:true});
    const warm = emit();
    assert.equal(warm.discharge.active, true);
    assert.equal(warm.witness.reaction.kind, 'relaxed');
    assert.equal(currentIgnitions(warm, 'flamethrower').length, 0);
    let lit = warm;
    for (let i = 0; i < 15 && lit.witness.reaction.kind === 'relaxed'; i++) lit = sim.advance(step);
    assert.ok(currentIgnitions(lit, 'flamethrower').length > 0);
    assert.equal(lit.witness.reaction.kind, 'aggressive');
    assert.equal(lit.witness.reaction.tool, 'flamethrower');
    act(sim, {type:'primary', pressed:false});
  } finally { sim.dispose(); }
});

test('later spread through a cell warmed by a past jet never supplies direct evidence', () => {
  const sim = visit({ignitions:[{x:39.75,y:16.25,radius:.02,heat:2.1}]});
  try {
    act(sim, door('open'));
    walkTo(sim, 40, 15.75);
    const warm = act(sim, {type:'select-tool',tool:'flamethrower'}, {type:'aim', x:40.3,y:16.25}, {type:'primary',pressed:true});
    assert.equal(warm.witness.reaction.kind, 'relaxed');
    assert.equal(currentIgnitions(warm, 'flamethrower').length, 0);
    act(sim, {type:'primary',pressed:false});
    const spread = wait(sim, 2);
    assert.ok(spread.events.some(event => event.tick > warm.tick && event.type === 'ignition' && event.cause === 'flamethrower'));
    assert.equal(spread.witness.reaction.kind, 'relaxed');
    assert.equal(shots(spread).length, 0);
  } finally { sim.dispose(); }
});

test('pause freezes the draw and a lethal shot uses the existing death and reset path', () => {
  const sim = visit({player:{...SHOP_WITNESS_SCENARIO.player, hp:20}});
  try {
    act(sim, door('open'));
    walkTo(sim, 40, 15.75);
    const queued = act(sim, {type:'select-tool',tool:'matches'}, {type:'aim',...apronTile}, {type:'primary',pressed:true},
      {type:'primary',pressed:false}, {type:'pause',paused:true});
    assert.equal(queued.witness.reaction.kind, 'relaxed');
    const direct = act(sim, {type:'pause',paused:false});
    assert.equal(direct.witness.reaction.kind, 'aggressive');
    const paused = act(sim, {type:'pause', paused:true});
    const held = wait(sim, 2);
    assert.equal(held.clocks.world, paused.clocks.world);
    assert.deepEqual(held.witness.aim, paused.witness.aim);
    assert.equal(shots(held).length, 0);
    act(sim, {type:'pause', paused:false});
    const dead = wait(sim, rules.drawSeconds);
    assert.equal(dead.player.hp, 0);
    assert.equal(shots(dead).length, 1);
    assert.ok(dead.events.some(event => event.type === 'death' && event.cause === 'officer:' + CHICAGO_PATROL.id));
    const after = wait(sim, rules.cooldownSeconds);
    assert.equal(shots(after).length, 1);
    assert.equal(after.witness.reaction.kind, 'relaxed');
    assert.equal(after.witness.shot, null);
    const reset = act(sim, {type:'reset'});
    assert.equal(reset.player.hp, 20);
    assert.equal(shots(reset).length, 0);
    assert.equal(reset.witness.reaction.kind, 'relaxed');
  } finally { sim.dispose(); }
});

test('a paving dud, an already-burning tile, and ordinary spread never create witness evidence', () => {
  const sim = visit({ignitions: [{x: 40.5, y: 16.5, radius: .02, heat: 2.1}]});
  try {
    const dud = press(sim, 'matches', {x: 40.2, y: 18.8});
    assert.ok(dud.events.some(event => event.type === 'tool-rejected' && event.result === 'no-fuel'));
    assert.equal(dud.witness.reaction.kind, 'relaxed');
    const seen = carryToDoor(sim);
    const relit = press(sim, 'matches');
    assert.equal(currentIgnitions(relit, 'matches').length, 0);
    assert.equal(relit.witness.reaction.kind, 'relaxed');
    let spread = relit;
    for (let i = 0; i < 14; i++) spread = sim.advance(.25);
    assert.ok(spread.events.some(event => event.tick > seen.tick && event.type === 'ignition' && event.cause?.startsWith('cell:')));
    assert.ok(spread.witness.memory);
    assert.equal(spread.witness.reaction.kind, 'relaxed');
    assert.equal(shots(spread).length, 0);
  } finally { sim.dispose(); }
});

test('only the opted-in visit posts the officer outside Bell & Alder and publishes witness state', () => {
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
    const officer = opted.actors.find(actor => actor.id === original.id);
    assert.deepEqual([officer.species, officer.radius, officer.height, officer.uniform, officer.equipment],
      [original.species, original.radius, original.height, original.uniform, original.equipment]);
    assert.deepEqual([officer.x, officer.y, officer.heading], [40.8, 19.8, -Math.PI / 2]);
    assert.equal(officer.equipment, 'pistol');
    assert.deepEqual(opted.actors.filter(actor => actor.team === 'civilian'), base.actors.filter(actor => actor.team === 'civilian'));
    assert.equal(opted.player.tool, base.player.tool);
    assert.deepEqual(opted.player.inventory, base.player.inventory);
    assert.deepEqual(opted.world.obstacles, base.world.obstacles);
  } finally { normal.dispose(); trial.dispose(); replay.dispose(); }
});
