import test from 'node:test';
import assert from 'node:assert/strict';
import * as T from '../../src/runtime/three.js';
import {createBellAndAlder} from '../../src/art/bell-and-alder.js';
import {BELL_AND_ALDER} from '../../src/content/bell-and-alder-layout.js';
import {COTTAGE_PAIR_SCENARIO} from '../../src/content/cottage-pair.js';
import {NEIGHBORHOOD_BASE, NEIGHBORHOOD_SCENARIO} from '../../src/content/neighborhood.js';
import {scenarioDefinition} from '../../src/simulation/fixtures.js';
import {createSimulation, DEFAULT_CONFIG, worldToStick} from '../../src/simulation/index.js';
import {freePoint} from '../../src/simulation/geometry.js';

const {step, input, player: {speed}} = DEFAULT_CONFIG;
const near = (actual, expected) => assert.ok(Math.abs(actual - expected) < 1e-7, `${actual} != ${expected}`);
const shopProp = (world, name) => world.obstacles.find(o => o.id === BELL_AND_ALDER.id + ':' + name);

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

test('only the regular Catalogue Street includes Bell & Alder timber, modules and fixtures', () => {
  const street = scenarioDefinition('neighborhood'), cottages = scenarioDefinition(COTTAGE_PAIR_SCENARIO);
  assert.ok(BELL_AND_ALDER.patches.some(patch => patch.material === 'wood'));
  assert.deepEqual(street.patches.slice(NEIGHBORHOOD_BASE.patches.length), BELL_AND_ALDER.patches);
  assert.deepEqual(street.modules.map(module => module.id), BELL_AND_ALDER.modules.map(module => module.id));
  assert.deepEqual(street.obstacles.filter(obstacle => obstacle.shopId === BELL_AND_ALDER.id), BELL_AND_ALDER.obstacles);
  assert.deepEqual(cottages.patches.slice(0, -1), NEIGHBORHOOD_BASE.patches);
  assert.deepEqual(cottages.modules, []);
  assert.ok(cottages.obstacles.every(obstacle => obstacle.shopId !== BELL_AND_ALDER.id));
});

test('the native bear reaches the shop from Catalogue Street, passes the open bays and collides with a fixture', () => {
  const sim = createSimulation({scenario: 'neighborhood', characterId: 'bear'});
  try {
    const start = sim.snapshot(), {entrance} = BELL_AND_ALDER;
    assert.equal(start.player.radius, .56);
    const window = shopProp(start.world, 'front-glazing-1');
    const lamp = shopProp(start.world, 'parlor-lamp');
    walkTo(sim, start.player.x, 18.5);
    walkTo(sim, window.x, 18.5);
    const glazing = walkToward(sim, window.x, entrance.y - 1);
    const windowGap = glazing.player.y - window.y - window.depth / 2;
    assert.ok(windowGap >= .56 - 1e-8 && windowGap < .60);

    walkTo(sim, window.x, 18.5);
    walkTo(sim, entrance.x, 18.5);
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
  } finally { sim.dispose(); }
});

test('a reachable match burns a real timber fixture and retires its model, light and collider together', async t => {
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
      const {placements, lights} = shop.diagnostics();
      return {model: placements.find(p => p.colliderId === lamp.id).visible,
        light: lights.find(light => light.id === lamp.id).visible};
    };
    const nearLamp = walkToward(sim, lamp.x, lamp.y);
    assert.deepEqual(show(nearLamp), {model: true, light: true});
    // Compare the assembled meshes to their world boxes, including rotated stock and chairs.
    for (const model of shop.root.children.filter(child => child.userData.colliderId)) {
      const box = nearLamp.world.obstacles.find(o => o.id === model.userData.colliderId);
      assert.ok(box);
      const bounds = new T.Box3().setFromObject(model, true);
      const expected = [box.x - box.width / 2, box.x + box.width / 2, box.y - box.depth / 2, box.y + box.depth / 2, box.height];
      const measured = [bounds.min.x, bounds.max.x, bounds.min.z, bounds.max.z, bounds.max.y];
      assert.ok(measured.every((value, index) => Math.abs(value - expected[index]) < .002), box.id);
    }

    sim.dispatch({type: 'aim', x: lamp.x, y: lamp.y});
    sim.dispatch({type: 'primary', pressed: true});
    let snapshot = sim.advance(step);
    const ignition = snapshot.events.find(event => event.type === 'tool-use' && event.tool === 'matches');
    assert.equal(ignition?.result, 'ignited');
    assert.equal(ignition.heatedCells, 1);
    near(ignition.x, lamp.x - lamp.width / 2);
    assert.ok(snapshot.cells.some(cell => cell.id === ignition.cellIds[0] && cell.material === 'wood' && cell.phase === 'burning'));
    assert.deepEqual(show(snapshot), {model: true, light: true});
    sim.dispatch({type: 'primary', pressed: false});
    for (let i = 0; i < 240 && shopProp(snapshot.world, 'parlor-lamp'); i++) snapshot = sim.advance(.25);
    assert.equal(shopProp(snapshot.world, 'parlor-lamp'), undefined);
    const burnout = snapshot.events.filter(event => event.type === 'obstacle-burnout' && event.objectId === lamp.id);
    assert.equal(burnout.length, 1);
    assert.deepEqual(show(snapshot), {model: false, light: false});
    walkTo(sim, lamp.x, lamp.y);
    t.diagnostic(`Lamp retirement ${((burnout[0].tick - ignition.tick) * step).toFixed(2)} world seconds after the match`);

    sim.dispatch({type: 'reset'});
    const reset = sim.advance(step);
    assert.ok(shopProp(reset.world, 'parlor-lamp'));
    assert.deepEqual(show(reset), {model: true, light: true});
  } finally { shop?.dispose(); sim.dispose(); }
});
