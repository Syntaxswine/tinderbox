import {test} from 'node:test';
import assert from 'node:assert/strict';
import {createSimulation} from '../../src/simulation/index.js';
const close = (a, b, eps = 1e-8) => assert.ok(Math.abs(a - b) <= eps, `${a} != ${b}`);
const plain = extra => ({id: 'discharge-qc', width: 12, height: 10, player: {x: 2.25, y: 5.25, tool: 'flamethrower'}, obstacles: [], actors: [], ...extra});
function armed(scenario = plain(), config = {}) {
  const sim = createSimulation({scenario, config: {fire: {cooling: 0, damagePerSecond: 0}, ...config}});
  sim.dispatch({type: 'aim', x: 10, y: scenario.player.y}); sim.dispatch({type: 'primary', pressed: true}); return sim;
}
const forward = d => d.rays.reduce((a, b) => Math.abs(a.angle - d.heading) < Math.abs(b.angle - d.heading) ? a : b);
function inactive(s) {
  const d = s.discharge; assert.equal(d.tick, s.tick); assert.equal(d.active, false); assert.equal(d.tool, null);
  assert.equal(d.origin, null); assert.equal(d.shapeOrigin, null); assert.equal(d.lead, null);
  assert.deepEqual(d.rays, []); assert.equal(d.connectRays, false);
  for (const key of ['heading', 'range', 'radius', 'halfAngle']) assert.equal(d[key], 0);
  assert.equal(s.player.usingTool, false);
}
// Independent convex-polygon SAT: no positive-area fan triangle may intersect a blocker.
function triangleHitsBox(a, b, c, box) {
  if (Math.abs((b.x - a.x) * (c.y - a.y) - (b.y - a.y) * (c.x - a.x)) < 1e-12) return false;
  const tri = [a, b, c], rect = [-1, 1].flatMap(x => [-1, 1].map(y => ({x: box.x + x * box.width / 2, y: box.y + y * box.depth / 2})));
  const axes = [{x: 1, y: 0}, {x: 0, y: 1}, ...tri.map((p, i) => ({x: -(tri[(i + 1) % 3].y - p.y), y: tri[(i + 1) % 3].x - p.x}))];
  return axes.every(axis => {
    const n = Math.hypot(axis.x, axis.y), project = p => (p.x * axis.x + p.y * axis.y) / n;
    const t = tri.map(project), r = rect.map(project);
    return Math.min(Math.max(...t), Math.max(...r)) - Math.max(Math.min(...t), Math.min(...r)) > 1e-8;
  });
}
function checkMask(s, blockers) {
  const d = s.discharge; assert.ok(d.active && d.rays.length <= 256);
  for (const r of d.rays) {
    close(Math.hypot(r.x - d.shapeOrigin.x, r.y - d.shapeOrigin.y), r.distance);
    assert.ok(r.distance <= (d.tool === 'torch' ? d.radius : d.range) + 1e-8);
    assert.ok(r.x >= -1e-8 && r.y >= -1e-8 && r.x <= s.world.width + 1e-8 && r.y <= s.world.height + 1e-8);
  }
  if (d.connectRays) for (let i = 1; i < d.rays.length; i++) for (const o of blockers) {
    assert.equal(triangleHitsBox(d.shapeOrigin, d.rays[i - 1], d.rays[i], o), false, `fan bridges ${o.id}: ${JSON.stringify([d.rays[i - 1], d.rays[i]])}`);
  }
}

test('held flamer exposes its full 4.5 m world-space cone, bounded and detached', () => {
  const sim = armed(), s = sim.advance(1 / 60), d = s.discharge;
  close(s.player.radius, 0.56); assert.equal(d.version, 1); assert.equal(d.tool, 'flamethrower');
  assert.deepEqual(d.origin, {x: 2.25, y: 5.25, h: 1.05}); assert.deepEqual(d.shapeOrigin, d.origin);
  close(d.range, 4.5); close(d.halfAngle, Math.PI / 8); close(forward(d).distance, 4.5);
  assert.equal(d.lead, null); assert.equal(d.connectRays, true); checkMask(s, []);
  const heated = s.cells.filter(c => c.heat > 0); assert.ok(heated.some(c => c.x - s.player.x > 4));
  for (const c of heated) {
    const dx = c.x - d.origin.x, dy = c.y - d.origin.y;
    assert.ok(Math.hypot(dx, dy) <= d.range + 1e-8); assert.ok(Math.abs(Math.atan2(dy, dx) - d.heading) <= d.halfAngle + 1e-8);
  }
  assert.deepEqual(JSON.parse(JSON.stringify(d)), d);
  d.origin.x = 99; d.shapeOrigin.y = 99; d.rays[0].x = 99;
  const next = sim.snapshot().discharge; close(next.origin.x, 2.25); close(next.shapeOrigin.y, 5.25); assert.notEqual(next.rays[0].x, 99);
});

test('wall and thin wood fence clip both the jet and its actual heat before the cosmetic muzzle', () => {
  for (const material of ['masonry', 'wood']) {
    const wall = {id: material + '-front', x: 3, y: 5, width: 0.1, depth: 10, height: 1, material, kind: 'fence'};
    const sim = armed(plain({obstacles: [wall]})), s = sim.advance(1 / 60), d = s.discharge;
    // Artist lance begins 1.07 m ahead: it is already beyond this wall. Model remains at root.
    assert.ok(s.player.x + 1.07 > 3.05); close(d.origin.x, s.player.x);
    assert.ok(d.rays.every(r => r.x < 2.95 && r.obstacleId === wall.id));
    assert.ok(s.cells.filter(c => c.x > 3.25).every(c => c.heat === 0)); checkMask(s, [wall]);
  }
});

test('ordered visibility fan cannot bridge off-axis narrow occluders or their corners', () => {
  const blockers = [
    {id: 'narrow', x: 4, y: 5.4, width: 0.06, depth: 0.03, height: 2, material: 'masonry'},
    {id: 'edge', x: 5, y: 4.6, width: 0.3, depth: 0.7, height: 2, material: 'masonry'},
    {id: 'far', x: 6, y: 6.4, width: 0.05, depth: 0.02, height: 2, material: 'masonry'}
  ];
  const sim = armed(plain({obstacles: blockers})), s = sim.advance(1 / 60); checkMask(s, blockers);
  assert.equal(s.discharge.connectRays, true);
  assert.ok(s.discharge.rays.some(r => r.obstacleId === 'narrow'));
  assert.ok(s.discharge.rays.some(r => r.distance === 4.5));
});

test('a deliberate lit-torch press supplies one occluded root-to-tip lead and clipped local heat disk', () => {
  const wall = {id: 'front', x: 3.3, y: 5, width: 0.1, depth: 10, height: 2, material: 'masonry'};
  const sim = armed(plain({player: {x: 2.6, y: 5.25, tool: 'torch'}, obstacles: [wall], patches: [{x:0,y:0,width:12,depth:10,material:'grass'}]}));
  const light = sim.advance(1 / 60); assert.equal(light.player.torch.phase, 'lit'); inactive(light);
  sim.dispatch({type:'primary',pressed:false}); sim.dispatch({type:'primary',pressed:true});
  const s = sim.advance(1 / 60), d = s.discharge;
  assert.equal(d.tool, 'torch'); close(d.range, 1.1); close(d.radius, 0.4); close(d.halfAngle, Math.PI);
  assert.deepEqual(d.lead.from, d.origin); assert.deepEqual(d.lead.to, d.shapeOrigin);
  assert.ok(d.shapeOrigin.x < 3.25 && d.shapeOrigin.x > 3.24);
  assert.ok(d.rays.every(r => r.x < 3.25)); assert.ok(s.cells.filter(c => c.x > 3.3).every(c => c.heat === 0)); checkMask(s, [wall]);
  d.lead.to.x = 99; assert.ok(sim.snapshot().discharge.lead.to.x < 3.25);
});

test('release, pause, cancel, selection, reset and death clear held presentation without stale jets', () => {
  for (const command of [{type: 'primary', pressed: false}, {type: 'pause', paused: true}, {type: 'cancel-input'}, {type: 'select-tool', tool: 'torch'}, {type: 'reset'}]) {
    const sim = armed(); assert.equal(sim.advance(1 / 60).discharge.active, true);
    sim.dispatch(command); inactive(sim.advance(1 / 60));
    sim.dispatch({type: 'pause', paused: false}); inactive(sim.advance(1 / 60));
  }
  const dying = armed(plain({player: {x: 2.25, y: 5.25, hp: 0.001, tool: 'flamethrower'},
    fuelLines: [{from: {x: 2, y: 5.25}, to: {x: 2.5, y: 5.25}, litresPerMetre: 1}],
    ignitions: [{x: 2.25, y: 5.25, radius: 0.1, heat: 4}]}), {fire: {damagePerSecond: 18}});
  const s = dying.advance(1 / 60); close(s.player.hp, 0); inactive(s);
});

test('partial and empty stock bound heat and stop the shape exactly when fuel ends', () => {
  for (const [tool, key, rate] of [['flamethrower', 'flamethrowerFuel', 0.3]]) {
    function first(stock) {
      const sim = armed(plain({player: {x: 2.25, y: 5.25, tool, inventory: {[key]: stock}}}));
      return {sim, s: sim.advance(1 / 60)};
    }
    const empty = first(0); inactive(empty.s); assert.ok(empty.s.cells.every(c => c.heat === 0));
    const full = first(1), partial = first(rate / 120);
    assert.equal(full.s.discharge.active, true); inactive(partial.s); close(partial.s.player.inventory[key], 0);
    const heat = s => s.cells.reduce((sum, c) => sum + c.heat, 0);
    close(heat(partial.s) / heat(full.s), 0.5);
    const after = partial.sim.advance(0.25); inactive(after); close(heat(after), heat(partial.s));
    assert.equal(after.events.filter(e => e.type === 'tool-empty').length, 1);
  }
});

test('powder and inversion preserve held aim while resource use follows player time', () => {
  const sim = armed(), before = sim.advance(1 / 60);
  sim.dispatch({type: 'drug', drug: 'powder'}); sim.dispatch({type: 'drug', drug: 'inversion'}); sim.dispatch({type: 'move', x: 1, y: 0});
  const after = sim.advance(1 / 60); assert.equal(after.discharge.active, true);
  close(before.player.inventory.flamethrowerFuel - after.player.inventory.flamethrowerFuel, 0.3 * 1.5 / 60);
  close(after.clocks.world - before.clocks.world, 0.35 / 60);
  close(after.discharge.heading, Math.atan2(after.aim.y - after.player.y, after.aim.x - after.player.x));
  assert.deepEqual(after.discharge.origin, {x: after.player.x, y: after.player.y, h: 1.05});
});

test('discharge honors rotated aim and world edges; complex masks have a bounded safe fallback', () => {
  const sim = armed(plain({player: {x: 11.25, y: 5.25, tool: 'flamethrower'}}));
  sim.dispatch({type: 'aim', x: 11.9, y: 5.25}); const s = sim.advance(1 / 60); checkMask(s, []); close(forward(s.discharge).distance, 0.75);
  sim.dispatch({type: 'aim', x: 11.25, y: 9.5}); const rotated = sim.advance(1 / 60);
  close(rotated.discharge.heading, Math.PI / 2); close(forward(rotated.discharge).distance, 4.5); checkMask(rotated, []);
  const obstacles = Array.from({length: 30}, (_, i) => ({id: 'complex-' + i, x: 4 + i * 0.035, y: 5.25 + (i - 15) * 0.025,
    width: 0.008, depth: 0.008, height: 1, material: 'masonry'}));
  const complex = armed(plain({obstacles})).advance(1 / 60);
  assert.equal(complex.discharge.connectRays, false); assert.ok(complex.discharge.rays.length <= 256);
  checkMask(complex, obstacles);
});

test('active discharge recording is identical at 30/60/120 render Hz', () => {
  const results = [30, 60, 120].map(hz => {
    const sim = armed(); sim.dispatch({type: 'drug', drug: 'powder', atTick: 17});
    for (let i = 0; i < hz; i++) sim.advance(1 / hz);
    const s = sim.snapshot(); delete s.diagnostics.alpha; delete s.diagnostics.lastSteps; return s;
  });
  assert.equal(results[0].discharge.active, true); assert.deepEqual(results[0], results[1]); assert.deepEqual(results[1], results[2]);
});
