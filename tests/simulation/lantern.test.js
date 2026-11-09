import test from 'node:test';
import assert from 'node:assert/strict';
import {createSimulation, DEFAULT_CONFIG, worldToStick} from '../../src/simulation/index.js';

const {step} = DEFAULT_CONFIG;
const press = {type: 'primary', pressed: true}, release = {type: 'primary', pressed: false};
const move = (x, y = 0) => ({type: 'move', x, y});
const neutral = move(0);
const scenario = extra => ({width: 12, height: 12, player: {x: 2, y: 4.25, tool: 'molotov'}, ...extra});
const last = (s, type) => s.events.findLast(event => event.type === type);
const near = (a, b) => assert.ok(Math.abs(a - b) < 1e-8, `${a} != ${b}`);
function tick(sim, ...commands) {
  for (const command of commands) assert.equal(sim.dispatch(command), true);
  return sim.advance(step);
}

test('arming stops motion and a released stick locks one throw on the next distinct press', () => {
  const input = {...DEFAULT_CONFIG.input, cameraY: -12};
  const sim = createSimulation({scenario: scenario({
    player: {x: 4, y: 6, tool: 'molotov'},
    actors: [{id: 'walker', x: 9, y: 2, speed: 1, route: [{x: 9, y: 2}, {x: 9, y: 5}]}]
  }), config: {input}});
  try {
    const walking = tick(sim, move(0, 1));
    assert.equal(walking.player.moving, true);
    const armed = tick(sim, press);
    assert.deepEqual(armed.player.lanternAim, {target: null, impact: null, path: [], adjusting: false, canThrow: false});
    assert.equal(armed.player.inventory.molotovs, 4);
    assert.equal(armed.player.moving, false);
    assert.equal(armed.player.travelled, walking.player.travelled);
    assert.deepEqual(armed.projectiles, []);
    const tapped = tick(sim, {type: 'aim', x: 1, y: 1});
    assert.equal(tapped.player.lanternAim.target, null);
    assert.equal(tapped.player.heading, armed.player.heading);

    const raw = worldToStick({x: .56, y: 0}, input);
    const aiming = tick(sim, {type: 'drug', drug: 'inversion'}, move(raw.x, raw.y), press);
    const {target, path, impact} = aiming.player.lanternAim;
    near(target.x, walking.player.x + 3);
    near(target.y, walking.player.y);
    near(aiming.player.heading, 0);
    assert.equal(aiming.player.lanternAim.adjusting, true);
    assert.equal(aiming.player.lanternAim.canThrow, false);
    assert.ok(aiming.actors[0].travelled > armed.actors[0].travelled);
    assert.deepEqual(path[0], {x: walking.player.x, y: walking.player.y, h: .8});
    assert.deepEqual(path.at(-1), impact);
    assert.ok(path.length > 2 && path.length <= 13);
    assert.deepEqual(aiming.projectiles, []);

    const early = tick(sim, release, press);
    assert.equal(last(early, 'tool-rejected').reason, 'aim');
    assert.equal(early.player.inventory.molotovs, 4);
    const centered = tick(sim, move(.08));
    assert.deepEqual(centered.player.lanternAim.target, target);
    assert.equal(centered.player.lanternAim.canThrow, false);
    const locked = tick(sim, neutral, press);
    assert.equal(locked.player.lanternAim.adjusting, false);
    assert.equal(locked.player.lanternAim.canThrow, true);
    assert.deepEqual(locked.projectiles, []);
    locked.player.lanternAim.target.x = -1;
    locked.player.lanternAim.path[0].h = -1;
    assert.deepEqual(sim.snapshot().player.lanternAim.target, target);
    assert.equal(sim.snapshot().player.lanternAim.path[0].h, .8);

    const thrown = tick(sim, release, {type: 'select-tool', tool: 'molotov'}, press, press);
    assert.equal(thrown.player.lanternAim, null);
    assert.equal(thrown.player.inventory.molotovs, 3);
    assert.equal(thrown.player.travelled, walking.player.travelled);
    assert.equal(thrown.projectiles.length, 1);
    near(thrown.projectiles[0].targetX, target.x);
    near(thrown.projectiles[0].targetY, target.y);
    const held = tick(sim, press);
    assert.equal(held.player.lanternAim, null);
    assert.equal(held.events.filter(event => event.type === 'tool-use' && event.tool === 'molotov').length, 1);
  } finally { sim.dispose(); }
});

test('the aim dead zone and minimum range reject near throws and full displacement stops at the world edge', () => {
  const sim = createSimulation({scenario: scenario({player: {x: 1, y: 4.25, tool: 'molotov'}}),
    config: {input: {cameraRelative: false}}});
  try {
    tick(sim, press);
    assert.equal(tick(sim, move(.12), neutral).player.lanternAim.target, null);
    const nearAim = tick(sim, release, move(.13), neutral, press);
    assert.ok(nearAim.player.lanternAim.target.x > 1);
    assert.equal(nearAim.player.lanternAim.impact, null);
    assert.equal(nearAim.player.lanternAim.canThrow, false);
    assert.equal(last(nearAim, 'tool-rejected').reason, 'range');
    assert.equal(nearAim.player.inventory.molotovs, 4);
    assert.deepEqual(nearAim.projectiles, []);
    const edge = tick(sim, release, move(-10, 10), neutral);
    assert.deepEqual(edge.player.lanternAim.target, {x: 0, y: 5.25});
    assert.equal(edge.player.lanternAim.canThrow, true);
    near(edge.player.lanternAim.impact.x, 0);
    near(edge.player.lanternAim.impact.y, 5.25);
  } finally { sim.dispose(); }
});

test('the flight meets its preview on a descending hit, including when powder expires mid-flight', () => {
  for (const powder of [false, true]) {
    const obstacle = {id: 'obstacle', x: 6.25, y: 4.25, width: .7, depth: 1, height: 1.8, material: 'masonry'};
    const sim = createSimulation({scenario: scenario({obstacles: [obstacle]}),
      config: {input: {cameraRelative: false}, drugs: {duration: .25}, fire: {damagePerSecond: 0}}});
    try {
      if (powder) tick(sim, {type: 'drug', drug: 'powder'}, press);
      else tick(sim, press);
      const locked = tick(sim, release, move(1), neutral);
      const {impact} = locked.player.lanternAim;
      assert.ok(impact.x > obstacle.x - obstacle.width / 2 && impact.x < obstacle.x + obstacle.width / 2);
      const launched = tick(sim, press);
      assert.equal(launched.effects.powder.active, powder);
      let landed = launched;
      for (let i = 0; i < 6 && !last(landed, 'molotov-impact'); i++) landed = sim.advance(.25);
      assert.equal(landed.effects.powder.active, false);
      const landing = last(landed, 'molotov-impact');
      assert.ok(landing);
      for (const key of ['x', 'y', 'h']) near(landing[key], impact[key]);
      assert.deepEqual(landed.projectiles, []);
      assert.equal(landed.player.inventory.molotovs, 3);
    } finally { sim.dispose(); }
  }
});

test('a locked preview updates when a burning obstruction clears', () => {
  const blocker = {id: 'timber', x: 4.25, y: 4.25, width: .5, depth: .5, height: 3, material: 'wood'};
  const sim = createSimulation({scenario: scenario({obstacles: [blocker],
    ignitions: [{x: blocker.x, y: blocker.y, heat: 4}]}),
    config: {input: {cameraRelative: false}, fuel: {surfaceBurnRate: 1}, fire: {damagePerSecond: 0}}});
  try {
    tick(sim, press);
    const blocked = tick(sim, release, move(1), neutral);
    assert.ok(blocked.player.lanternAim.impact.x < 4);
    sim.advance(.25);
    const cleared = sim.advance(.25);
    assert.ok(last(cleared, 'obstacle-burnout'));
    assert.deepEqual(cleared.player.lanternAim.target, blocked.player.lanternAim.target);
    assert.equal(cleared.player.lanternAim.canThrow, true);
    near(cleared.player.lanternAim.impact.x, 8);
  } finally { sim.dispose(); }
});

test('pause, cancel, tool change and reset discard the aim and wait for a held stick to center', () => {
  for (const command of [{type: 'pause', paused: true}, {type: 'cancel-input'}, {type: 'select-tool', tool: 'torch'}, {type: 'reset'}]) {
    const sim = createSimulation({scenario: scenario(), config: {input: {cameraRelative: false}}});
    try {
      tick(sim, press, move(1));
      const cancelled = tick(sim, command);
      assert.equal(cancelled.player.lanternAim, null);
      assert.equal(cancelled.player.inventory.molotovs, 4);
      if (cancelled.paused) tick(sim, {type: 'pause', paused: false});
      const stale = tick(sim, move(1), press);
      assert.equal(stale.player.x, cancelled.player.x);
      assert.equal(stale.player.lanternAim, null);
      assert.deepEqual(stale.projectiles, []);
      assert.ok(tick(sim, release, neutral, move(1)).player.x > stale.player.x);
    } finally { sim.dispose(); }
  }
});

test('empty stock and death leave no active lantern aim or spend', () => {
  const empty = createSimulation({scenario: scenario({player: {x: 2, y: 4.25, tool: 'molotov', inventory: {molotovs: 0}}})});
  const dying = createSimulation({scenario: scenario({player: {x: 2.25, y: 4.25, tool: 'molotov', hp: .45},
    patches: [{x: 0, y: 0, width: 12, depth: 12, material: 'grass'}],
    ignitions: [{x: 2.25, y: 4.25, heat: 4}]})});
  try {
    const rejected = tick(empty, press, move(1), neutral);
    assert.equal(rejected.player.lanternAim, null);
    assert.equal(last(rejected, 'tool-rejected').reason, 'empty');
    assert.deepEqual(rejected.projectiles, []);
    assert.ok(tick(dying, press, move(1)).player.lanternAim);
    const dead = dying.advance(.25);
    assert.equal(dead.player.hp, 0);
    assert.equal(dead.player.lanternAim, null);
    assert.equal(dead.player.inventory.molotovs, 4);
    assert.deepEqual(dead.projectiles, []);
  } finally { empty.dispose(); dying.dispose(); }
});
