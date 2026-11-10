import test from 'node:test';
import assert from 'node:assert/strict';
import {createSimulation, DEFAULT_CONFIG, worldToStick} from '../../src/simulation/index.js';
import {NEIGHBORHOOD_SCENARIO, SHOP_WITNESS_SCENARIO} from '../../src/content/neighborhood.js';
import {COTTAGE_PAIR_SCENARIO} from '../../src/content/cottage-pair.js';
import {calmCottageWind} from '../../src/reuse/ashland/wind.js';

const {step, input, player: {speed}, fire} = DEFAULT_CONFIG;
const near = (actual, expected) => assert.ok(Math.abs(actual - expected) < 1e-8, `${actual} != ${expected}`);
const act = (sim, command) => { assert.ok(sim.dispatch(command)); return sim.advance(step); };
const strike = (sim, x, y) => {
  assert.ok(sim.dispatch({type: 'aim', x, y}));
  const snapshot = act(sim, {type: 'primary', pressed: true});
  assert.ok(sim.dispatch({type: 'primary', pressed: false}));
  return snapshot;
};
const houseOf = (snapshot, id) => snapshot.world.buildings.find(house => house.id === id);
const shopDoor = 'bell-and-alder:entry';

function walk(sim, x, y) {
  const {player} = sim.snapshot(), dx = x - player.x, dy = y - player.y;
  let ticks = Math.max(1, Math.ceil(Math.hypot(dx, dy) / (speed * step)));
  const reach = ticks * speed * step;
  assert.ok(sim.dispatch({type: 'move', ...worldToStick({x: dx / reach, y: dy / reach}, input)}));
  while (ticks > 0) {
    const count = Math.min(ticks, 15);
    sim.advance(count * step);
    ticks -= count;
  }
  const result = act(sim, {type: 'move', x: 0, y: 0});
  near(result.player.x, x);
  near(result.player.y, y);
  return result;
}

test('Bell & Alder leaves retain identity and collision after a real Monroe collapse', () => {
  const houseId = 'monroe-row-middle';
  const sim = createSimulation({seed: 1893, characterId: 'goat', scenario: {
    ...SHOP_WITNESS_SCENARIO, player: {x: 38.5, y: 30.35, tool: 'matches'}
  }});
  const leavesOf = snapshot => snapshot.world.obstacles.filter(box => box.portalId === shopDoor);
  const verifyUnrelated = (before, after) => {
    const changed = new Set(after.events.filter(event => event.tick === after.tick && event.type === 'building-section-burnout')
      .map(event => event.buildingId));
    const ids = snapshot => snapshot.world.obstacles.filter(box => box.portalId !== shopDoor && !changed.has(box.buildingId)).map(box => box.id);
    assert.deepEqual(ids(after), ids(before));
  };
  const use = snapshot => {
    const {id, action, enabled} = snapshot.player.interaction;
    assert.equal(id, shopDoor);
    assert.equal(enabled, true);
    return act(sim, {type: 'interact', portalId: id, action});
  };
  function verify(snapshot, open) {
    assert.equal(snapshot.world.shop.door.open, open);
    const leaves = leavesOf(snapshot);
    assert.deepEqual(leaves.map(leaf => leaf.id), [shopDoor + ':left', shopDoor + ':right']);
    assert.deepEqual(snapshot.world.shop.door.leaves, leaves.map(({id, x, y, width, depth, height, heading}) =>
      ({id, x, y, width, depth, height, heading})));
    assert.equal(new Set(snapshot.world.obstacles.map(box => box.id)).size, snapshot.world.obstacles.length);
    for (const leaf of leaves) assert.equal(leaf.depth, open ? 1 : .12);
  }
  try {
    const cold = sim.snapshot();
    verify(cold, false);
    const ignited = strike(sim, 38.5, 31.15);
    assert.ok(ignited.events.some(event => event.type === 'structure-ignition' && event.buildingId === houseId));
    walk(sim, 38.5, 18.35);
    let snapshot = walk(sim, 40, 18.35);
    for (let n = 0; n < 700 && !houseOf(snapshot, houseId).destroyed; n++) snapshot = sim.advance(.25);
    assert.equal(houseOf(snapshot, houseId).destroyed, true);
    assert.ok(!snapshot.world.obstacles.some(box => box.buildingId === houseId));
    assert.equal(snapshot.player.interaction.action, 'open');
    const opened = use(snapshot);
    verify(opened, true);
    verifyUnrelated(snapshot, opened);
    verify(snapshot, false);
    const threshold = walk(sim, 40, 17);
    assert.equal(threshold.player.interaction.enabled, false);
    assert.match(threshold.player.interaction.reason, /clear/i);
    assert.equal(act(sim, {type: 'interact', portalId: shopDoor, action: 'close'}).world.shop.door.open, true);
    const inside = walk(sim, 40, 15.85);
    const closed = use(inside);
    verify(closed, false);
    verifyUnrelated(inside, closed);
    const reset = act(sim, {type: 'reset'});
    verify(reset, false);
    assert.deepEqual(reset.world.shop.door, cold.world.shop.door);
    assert.equal(houseOf(reset, houseId).destroyed, false);
    assert.equal(reset.witness.reaction.kind, 'relaxed');
  } finally { sim.dispose(); }
});

test('the existing flamer cone ignites exposed moving actors on paving and carries world-time damage', () => {
  const scenario = {id: 'actor-burn', width: 14, height: 11, player: {x: 2.25, y: 5.25, tool: 'flamethrower'},
    actors: [
      {id: 'runner', x: 4.75, y: 5.25, speed: 2.4, route: [{x: 4.75, y: 5.25}, {x: 10.75, y: 5.25}]},
      {id: 'covered', x: 5.5, y: 6.35},
      {id: 'off-axis', x: 5.25, y: 7},
      {id: 'out-of-range', x: 7.4, y: 5.25},
      {id: 'dead', x: 3.1, y: 5.1, hp: 0}
    ], obstacles: [{id: 'screen', x: 4, y: 5.84, width: .14, depth: .36, height: 2, material: 'masonry'}]};
  const sim = createSimulation({scenario});
  const runner = snapshot => snapshot.actors.find(actor => actor.id === 'runner');
  try {
    assert.ok(sim.dispatch({type: 'primary', pressed: true}));
    const initial = sim.advance(.15), initialBurn = {...runner(initial).burn};
    assert.ok(runner(initial).burn);
    const held = sim.advance(.10);
    assert.ok(held.discharge.active);
    assert.equal(held.diagnostics.burningCells, 0);
    assert.deepEqual(held.events.filter(event => event.type === 'actor-ignition').map(event => event.actorId), ['runner']);
    assert.deepEqual(held.actors.slice(1).map(actor => [actor.burn, actor.hp]), [[undefined, 100], [undefined, 100], [undefined, 100], [undefined, 0]]);
    assert.deepEqual(runner(initial).burn, initialBurn);
    assert.ok(runner(held).burn.expiresAt > initialBurn.expiresAt);
    const expiresAt = runner(held).burn.expiresAt;
    runner(held).burn.expiresAt = -100;
    assert.equal(runner(sim.snapshot()).burn.expiresAt, expiresAt);

    assert.ok(sim.dispatch({type: 'primary', pressed: false}));
    let moved = sim.advance(.25);
    for (let i = 0; i < 2; i++) moved = sim.advance(.25);
    assert.equal(moved.discharge.active, false);
    assert.ok(runner(moved).x > moved.player.x + DEFAULT_CONFIG.tools.flamethrower.range);
    assert.equal(runner(moved).burn.expiresAt, expiresAt);
    const paused = act(sim, {type: 'pause', paused: true});
    assert.deepEqual(runner(sim.advance(.25)), runner(paused));
    assert.ok(sim.dispatch({type: 'pause', paused: false}));
    assert.ok(sim.dispatch({type: 'drug', drug: 'powder'}));
    const slowed = sim.advance(.25);
    near(slowed.clocks.world - paused.clocks.world, .25 * DEFAULT_CONFIG.drugs.worldScale);
    near(runner(paused).hp - runner(slowed).hp, fire.damagePerSecond * (slowed.clocks.world - paused.clocks.world));
    assert.equal(runner(slowed).burn.expiresAt, expiresAt);
    const reset = act(sim, {type: 'reset'});
    assert.equal(runner(reset).hp, 100);
    assert.equal(runner(reset).burn, undefined);
    assert.ok(!reset.events.some(event => event.type === 'actor-ignition'));
  } finally { sim.dispose(); }

  const doomed = createSimulation({scenario: {...scenario, actors: [{id: 'doomed', x: 4.75, y: 5.25, hp: 15}]}});
  try {
    assert.ok(doomed.dispatch({type: 'primary', pressed: true}));
    assert.ok(doomed.advance(.25).actors[0].burn);
    assert.ok(doomed.dispatch({type: 'primary', pressed: false}));
    let snapshot = doomed.advance(.25);
    for (let n = 0; n < 6 && snapshot.actors[0].hp; n++) snapshot = doomed.advance(.25);
    assert.equal(snapshot.actors[0].hp, 0);
    assert.equal(snapshot.actors[0].burn, undefined);
    assert.equal(snapshot.events.filter(event => event.type === 'death' && event.actorId === 'doomed').length, 1);
  } finally { doomed.dispose(); }
});

test('the existing east drum heats exposed siding, which burns through the normal roof and section progression', t => {
  const houseId = 'hopkins-fifteen', barrelId = 'street-drum-east';
  const screen = {id: 'blast-screen', x: 25, y: 14, width: 3, depth: .1, height: 2, material: 'masonry'};
  for (const blocked of [false, true]) {
    const scenario = {...NEIGHBORHOOD_SCENARIO, actors: [], patches: [], player: {
      x: 25.5, y: 18.6, heading: -Math.PI / 2, tool: 'flamethrower'
    }, obstacles: [...NEIGHBORHOOD_SCENARIO.obstacles, ...(blocked ? [screen] : [])]};
    const sim = createSimulation({scenario, seed: 1893});
    try {
      assert.ok(sim.dispatch({type: 'primary', pressed: true}));
      let snapshot = sim.advance(.25);
      assert.ok(sim.dispatch({type: 'primary', pressed: false}));
      const blast = snapshot.events.find(event => event.type === 'barrel-explosion' && event.objectId === barrelId);
      assert.ok(blast);
      assert.ok(!snapshot.world.obstacles.some(box => box.id === barrelId));
      assert.equal(houseOf(snapshot, houseId).destroyed, false);
      assert.ok(houseOf(snapshot, houseId).sections.every(section => section.present));
      assert.equal(snapshot.diagnostics.burningCells, 0);
      const direct = snapshot.events.filter(event => event.type === 'structure-ignition');
      if (blocked) {
        for (let i = 0; i < 12; i++) snapshot = sim.advance(.25);
        assert.deepEqual(direct, []);
        assert.deepEqual(snapshot.structureFire, []);
        assert.equal(houseOf(snapshot, houseId).burnedFraction, 0);
        continue;
      }
      assert.ok(direct.length > 0);
      assert.ok(direct.every(event => event.buildingId === houseId && event.part === 'walls' &&
        event.cause === 'barrel:' + barrelId && event.tick === blast.tick && event.parentSiteId === null));
      const ignitionBySite = new Map();
      let roof, partial, clear;
      for (let n = 0; n < 700; n++) {
        for (const event of snapshot.events) if (event.buildingId === houseId) {
          if (event.type === 'structure-ignition') {
            ignitionBySite.set(event.siteId, event);
            if (event.part === 'roof') roof ??= event;
          }
          if (event.type === 'building-section-burnout') partial ??= event;
          if (event.type === 'building-burnout') clear ??= event;
        }
        if (clear) break;
        snapshot = sim.advance(.25);
      }
      assert.ok(roof && partial && clear);
      assert.ok(direct[0].worldTime < roof.worldTime && roof.worldTime < partial.worldTime && partial.worldTime < clear.worldTime);
      let ancestor = roof;
      while (ancestor.parentSiteId) ancestor = ignitionBySite.get(ancestor.parentSiteId);
      assert.equal(ancestor.cause, 'barrel:' + barrelId);
      assert.equal(houseOf(snapshot, houseId).destroyed, true);
      assert.ok(!snapshot.world.obstacles.some(box => box.buildingId === houseId));
      t.diagnostic(JSON.stringify({blastTick: blast.tick, roof: roof.worldTime, firstClear: partial.worldTime, collapse: clear.worldTime}));
    } finally { sim.dispose(); }
  }
});

test('the same blast input reaches the Ashland wall graph and starts local support clocks', () => {
  const barrel = {id: 'cottage-drum-probe', x: 53.5, y: 13.5, width: .656, depth: .656, height: .8, material: 'steel', kind: 'barrel'};
  const scenario = {...COTTAGE_PAIR_SCENARIO, obstacles: [...COTTAGE_PAIR_SCENARIO.obstacles, barrel],
    player: {x: 57.1, y: 13.5, heading: Math.PI, tool: 'flamethrower'}};
  const sim = createSimulation({scenario, cottageWind: calmCottageWind, seed: 1893});
  try {
    assert.ok(sim.dispatch({type: 'primary', pressed: true}));
    let snapshot = sim.advance(.25);
    assert.ok(sim.dispatch({type: 'primary', pressed: false}));
    const initial = snapshot.cottageFire.buildings[0], blast = snapshot.events.find(event => event.type === 'barrel-explosion');
    assert.equal(blast.objectId, barrel.id);
    assert.equal(initial.firstIgnition.kind, 'barrel:' + barrel.id);
    assert.equal(initial.firstIgnition.layer, 'walls');
    assert.equal(initial.gone, false);
    const struck=initial.tiles.find(tile=>tile.ignitedAt.upper===initial.firstIgnition.time);
    assert.ok(struck);
    for (let n = 0; n < 24 && !snapshot.cottageFire.buildings[0].cells.some(cell => cell.layer === 'roof'); n++) snapshot = sim.advance(.25);
    const active = snapshot.cottageFire.buildings[0];
    assert.ok(active.cells.some(cell => cell.layer === 'roof' && cell.cause === 'surface-spread'));
    assert.equal(active.tiles[struck.index].ignitedAt.upper,struck.ignitedAt.upper);
    assert.ok(active.tiles.some(tile=>tile.ignitedAt.roof>struck.ignitedAt.upper));
    assert.equal(snapshot.cottageFire.buildings[1].firstIgnition, null);
  } finally { sim.dispose(); }
});

test('a sustained grass front catches siding and a weaker grass strike cools, invariant across frame splits and reset', t => {
  const houseId = 'hopkins-fifteen';
  for (const long of [true, false]) {
    const scenario = {...NEIGHBORHOOD_SCENARIO, actors: [], player: {x: 25.48, y: 8.5, tool: 'matches'},
      ...(long ? {} : {patches: [{x: 24.5, y: 8, width: .5, depth: 1, material: 'grass'}]})};
    const sim = createSimulation({scenario, seed: 1893});
    function replay(partition) {
      let snapshot = strike(sim, 24.85, 8.5);
      const started = snapshot.clocks.world;
      const ignition = snapshot.events.find(event => event.type === 'tool-use');
      assert.equal(ignition.heatedCells, long ? 4 : 2);
      assert.ok(!snapshot.events.some(event => event.type === 'structure-ignition'));
      let peak = 0, first, sourceBurnout;
      for (let n = 0; n < (long ? 11 : 56); n++) {
        for (const dt of partition) snapshot = sim.advance(dt);
        const sites = snapshot.structureFire.filter(site => site.buildingId === houseId);
        peak = Math.max(peak, ...sites.filter(site => site.ignitionTime === null).map(site => site.heatFraction));
        first ??= snapshot.events.find(event => event.type === 'structure-ignition' && event.buildingId === houseId);
        sourceBurnout ??= snapshot.events.find(event => event.type === 'burnout' && ignition.cellIds.includes(event.cellId));
      }
      const warm = snapshot.structureFire.filter(site => site.ignitionTime === null && site.buildingId === houseId);
      if (long) {
        assert.ok(first);
        assert.equal(first.cause, 'ground-heat');
        assert.ok(ignition.cellIds.includes(first.parentSiteId));
        assert.ok(first.worldTime - started > 1);
      } else {
        assert.ok(sourceBurnout && peak > 0 && peak < 1);
        assert.equal(first, undefined);
        assert.deepEqual(warm, []);
        assert.equal(houseOf(snapshot, houseId).burnedFraction, 0);
      }
      return {peak, first: first && [first.siteId, first.worldTime, first.parentSiteId], spent: Boolean(sourceBurnout)};
    }
    try {
      const first = replay([.25]);
      assert.ok(sim.dispatch({type: 'reset'}));
      const reset = sim.advance(step);
      assert.deepEqual(reset.structureFire, []);
      // Reset advances one cold tick before the next command. Compare equivalent
      // source ages with a fresh run starting on that same cold tick.
      const replayAfterReset = replay([.025, .10, .125]);
      near(replayAfterReset.peak, first.peak);
      assert.equal(replayAfterReset.spent, first.spent);
      if (first.first) {
        assert.equal(replayAfterReset.first[0], first.first[0]);
        assert.equal(replayAfterReset.first[2], first.first[2]);
        near(replayAfterReset.first[1] - first.first[1], step);
      }
      t.diagnostic(JSON.stringify({long, ...first}));
    } finally { sim.dispose(); }
  }
});
