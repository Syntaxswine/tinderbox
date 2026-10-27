import {test} from 'node:test';
import assert from 'node:assert/strict';
import {createSimulation, SCENARIOS} from '../../src/simulation/index.js';
import {freePoint, sweptDiscClear, moveDisc} from '../../src/simulation/geometry.js';
const close = (a, b, eps = 1e-8) => assert.ok(Math.abs(a - b) <= eps, `${a} != ${b}`);
const plain = extra => ({id: 'body-qc', width: 12, height: 10, player: {x: 2, y: 5, tool: 'jerry-can'}, obstacles: [], actors: [], ...extra});
// Independent dense oracle: circle-to-solid clearance at <=1 mm along every accepted segment.
function checkPath(path, radius, world, obstacles) {
  for (let i = 1; i < path.length; i++) {
    const a = path[i - 1], b = path[i], steps = Math.max(1, Math.ceil(Math.hypot(b.x - a.x, b.y - a.y) / 0.001));
    for (let j = 0; j <= steps; j++) {
      const x = a.x + (b.x - a.x) * j / steps, y = a.y + (b.y - a.y) * j / steps;
      assert.ok(x >= radius - 1e-8 && y >= radius - 1e-8 && x <= world.width - radius + 1e-8 && y <= world.height - radius + 1e-8, 'body stays in world');
      for (const o of obstacles) {
        const clearance = o.kind === 'barrel' ? Math.hypot(x - o.x, y - o.y) - o.width / 2 :
          Math.hypot(Math.max(Math.abs(x - o.x) - o.width / 2, 0), Math.max(Math.abs(y - o.y) - o.depth / 2, 0));
        assert.ok(clearance >= radius - 1e-8, `body overlaps ${o.id}: ${clearance} < ${radius}`);
      }
    }
  }
}

test('all published fixtures spawn a 0.56 m body and reject the old narrow clearance', () => {
  for (const scenario of Object.keys(SCENARIOS)) {
    const sim = createSimulation({scenario}), s = sim.snapshot(); close(s.player.radius, 0.56);
    assert.equal(freePoint(s.player, s.player.radius, s.world, s.world.obstacles), true); sim.dispose();
  }
  const wall = {id: 'front', x: 4, y: 5, width: 1, depth: 4, height: 2, material: 'masonry'};
  assert.throws(() => createSimulation({scenario: plain({player: {x: 3.2, y: 5}, obstacles: [wall]})}), /spawn/);
});

test('rounded-corner sweep rejects a chord whose endpoints both clear the body', () => {
  const o = {id: 'corner', x: 3, y: 3, width: 1, depth: 1}, world = {width: 8, height: 8}, radius = 0.56;
  const angle = Math.PI * 1.25, p = t => ({x: 2.5 + (radius + 0.00001) * Math.cos(t), y: 2.5 + (radius + 0.00001) * Math.sin(t)});
  const a = p(angle - 0.02), b = p(angle + 0.02);
  assert.equal(freePoint(a, radius, world, [o]), true); assert.equal(freePoint(b, radius, world, [o]), true);
  assert.equal(sweptDiscClear(a, b, radius, world, [o]), false);
  const path = moveDisc(a, b.x - a.x, b.y - a.y, radius, world, [o], 0.5);
  checkPath(path, radius, world, [o]);
});

test('normal, powdered and fast accepted paths keep the entire body outside masonry, thin fences, drums and edges', () => {
  const obstacles = [
    {id: 'wall', x: 5, y: 4, width: 0.4, depth: 6, height: 3, material: 'masonry'},
    {id: 'fence', x: 8, y: 8, width: 6, depth: 0.08, height: 1, material: 'wood'},
    {id: 'drum', x: 3.5, y: 8, width: 0.656, depth: 0.656, height: 0.8, material: 'steel', kind: 'barrel'}
  ];
  for (const [speed, powder] of [[3, false], [3, true], [180, true]]) {
    const sim = createSimulation({scenario: plain({obstacles}), config: {input: {cameraRelative: false}, player: {speed}, inventory: {gas: 50}}});
    sim.dispatch({type: 'primary', pressed: true}); sim.dispatch({type: 'primary', pressed: false});
    if (powder) sim.dispatch({type: 'drug', drug: 'powder'});
    let walked = 0, s;
    for (const [x, y] of [[1, 0], [1, 1], [1, 0], [0, 1], [-1, -1], [-1, 1], [0, -1]]) {
      sim.dispatch({type: 'move', x, y});
      for (let tick = 0; tick < 80; tick++) {
        s = sim.advance(1 / 60); const path = s.diagnostics.acceptedPath;
        checkPath(path, s.player.radius, s.world, obstacles);
        walked += path.slice(1).reduce((sum, p, i) => sum + Math.hypot(p.x - path[i].x, p.y - path[i].y), 0);
      }
    }
    assert.ok(walked > 4, 'movement was exercised'); close(s.player.travelled, walked);
    close(s.diagnostics.fuel.pouredFuel, walked * 0.08); close(50 - s.player.inventory.gas, walked * 0.08);
    assert.equal(s.player.pouring, true); sim.dispose();
  }
});

test('a gap narrower than the bear cannot be crossed, while a wider gap remains usable', () => {
  for (const gap of [1.1, 1.2]) {
    const obstacles = [-1, 1].map((side, i) => ({id: 'side-' + i, x: 6, y: 5 + side * (gap / 2 + 1), width: 0.2, depth: 2, height: 2, material: 'masonry'}));
    const sim = createSimulation({scenario: plain({obstacles}), config: {input: {cameraRelative: false}}});
    sim.dispatch({type: 'move', x: 1, y: 0}); let s;
    for (let i = 0; i < 150; i++) { s = sim.advance(1 / 60); checkPath(s.diagnostics.acceptedPath, s.player.radius, s.world, obstacles); }
    assert.equal(s.player.x > 6, gap > 1.12); sim.dispose();
  }
});