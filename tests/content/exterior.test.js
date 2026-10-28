import {test} from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import {compileModules, CIVILIAN_PROFILES} from '../../src/content/exterior-kit.js';
import {createSimulation} from '../../src/simulation/index.js';
import {createCivilianRig, loadCivilianKit} from '../../src/reuse/civilians.js';
const close = (a, b) => assert.ok(Math.abs(a - b) < 1e-8, `${a} != ${b}`);
const skins = {facade: 'inherited-plaster', trim: 'inherited-cream', door: 'inherited-wood', roof: 'inherited-roof'};
const gate = (state = 'open', heading = 0) => ({id: 'gate', form: 'doorway', x: 6, y: 5, heading, width: 6, depth: 0.3, height: 3.2,
  opening: {width: 1.4, height: 2.3, state}, physicalMaterial: 'wood', skinSlots: {...skins}, sourceRefs: ['game:test', 'farmyard:hybrid-wall-opening']});
const scenario = m => ({id: 'gate-test', width: 12, height: 10, player: {x: 6, y: 7.5, tool: 'jerry-can'}, modules: [m], obstacles: [], actors: []});
function passGate(m, powder = false) {
  const sim = createSimulation({scenario: scenario(m), config: {input: {cameraRelative: false}}});
  sim.dispatch({type: 'move', x: 0, y: -1}); sim.dispatch({type: 'primary', pressed: true}); sim.dispatch({type: 'primary', pressed: false});
  if (powder) sim.dispatch({type: 'drug', drug: 'powder'});
  let s; for (let i = 0; i < 90; i++) s = sim.advance(1 / 60); return s;
}
test('open passage passes the bear and closed leaf blocks its swept path, with normal/powder fuel accounting', () => {
  for (const powder of [false, true]) {
    const open = passGate(gate(), powder), closed = passGate(gate('closed'), powder);
    assert.ok(open.player.y < 4); assert.ok(closed.player.y >= 5 + 0.06 + closed.player.radius - 1e-8);
    for (const s of [open, closed]) {
      close(s.diagnostics.fuel.pouredFuel, s.player.travelled * 0.08); assert.equal(s.player.pouring, true);
      assert.equal(s.world.modules[0].opening.state, s === open ? 'open' : 'closed');
    }
  }
});
test('module compiler retains split piers, non-solid overhead lintel, IDs, and quarter-turn geometry', () => {
  const compiled = compileModules([gate()], {width: 12, height: 10});
  assert.deepEqual(compiled.obstacles.map(p => p.id), ['gate:pier-left', 'gate:pier-right']);
  const m = compiled.modules[0]; close(m.parts.find(p => p.role === 'lintel').h - m.parts.find(p => p.role === 'lintel').height / 2, 2.3);
  assert.equal(m.parts.find(p => p.role === 'lintel').blocksHeat, false);
  const turn = compileModules([gate('open', Math.PI / 2)], {width: 12, height: 10});
  close(turn.obstacles[0].x, 6); assert.ok(turn.obstacles[0].y < 5); close(turn.obstacles[0].width, 0.3);
  const turnedScenario = scenario(gate('open', Math.PI / 2)); turnedScenario.player = {x: 8.5, y: 5};
  const sim = createSimulation({scenario: turnedScenario, config: {input: {cameraRelative: false}}});
  sim.dispatch({type: 'move', x: -1, y: 0}); for (let i = 0; i < 90; i++) sim.advance(1 / 60);
  assert.ok(sim.snapshot().player.x < 5);
});
test('skin swaps leave collision, thermal state, clocks, inventory and movement identical', () => {
  const a = gate(), b = gate(); b.skinSlots = {facade: 'inherited-brick', trim: 'inherited-wood', door: 'inherited-cream', roof: 'inherited-plaster'};
  const sa = passGate(a), sb = passGate(b); assert.deepEqual(sa.world.obstacles, sb.world.obstacles);
  for (const key of ['player', 'cells', 'clocks', 'effects', 'events', 'diagnostics']) assert.deepEqual(sa[key], sb[key]);
  assert.notDeepEqual(sa.world.modules[0].skinSlots, sb.world.modules[0].skinSlots);
});
test('bad form, diagonal rotation, unsafe opening, source IDs and skins fail before simulation starts', () => {
  for (const change of [{form: 'palace'}, {heading: 0.1}, {opening: {width: 1, height: 2.3, state: 'open'}},
    {opening: {width: 1.4, height: 1.65, state: 'open'}}, {opening: {width: 1.4, height: 2.3, state: 'ajar'}}, {sourceRefs: []}, {skinSlots: {facade: 'unregistered'}}]) {
    assert.throws(() => createSimulation({scenario: scenario({...gate(), ...change})}));
  }
  assert.throws(() => compileModules([gate(), gate()], {width: 12, height: 10}));
});
test('exposition is additive, civilian metadata is explicit, detached, and uses slowed world time', () => {
  const normal = createSimulation({scenario: 'exposition'}), slow = createSimulation({scenario: 'exposition'});
  slow.dispatch({type: 'drug', drug: 'powder'});
  for (let i = 0; i < 60; i++) { normal.advance(1 / 60); slow.advance(1 / 60); }
  const a = normal.snapshot(), b = slow.snapshot(); assert.equal(a.world.modules.length, 15);
  assert.deepEqual(a.actors.map(p => p.species), ['horse', 'goat']);
  for (let i = 0; i < a.actors.length; i++) { close(b.actors[i].travelled / a.actors[i].travelled, 0.35); close(b.actors[i].radius, 0.62); assert.equal(a.actors[i].appearance, 'normal'); }
  a.world.modules[0].parts[0].x = -999; assert.notEqual(normal.snapshot().world.modules[0].parts[0].x, -999);
  const street = createSimulation({scenario: 'street'}).snapshot(), chase = createSimulation({scenario: 'chase'}).snapshot();
  assert.equal(street.world.modules.length, 0); assert.equal(chase.world.modules.length, 0); close(street.player.x, 4); close(chase.player.x, 4.25);
});
test('both pinned civilian rigs preserve species, neutral gear and conservative walking bounds', () => {
  for (const species of ['horse', 'goat']) {
    const data = JSON.parse(fs.readFileSync(`vendor/farmyard-commando/30a3b8cae5f36bb0c1df3685b7fba16f701c2083/sites/tactical-animal/dist/aft/tactics/${species}-10k-data.json`));
    const rig = createCivilianRig(species, data), actor = {...CIVILIAN_PROFILES[species], team: 'civilian', headgear: 'none', equipment: 'none', x: 0, y: 0, heading: 0, moving: true, hp: 100};
    for (let i = 0; i < 48; i++) {
      rig.update({...actor, travelled: i / 48}, i / 48); const b = rig.diagnostics();
      const conservative = Math.hypot(Math.max(Math.abs(b.min[0]), Math.abs(b.max[0])), Math.max(Math.abs(b.min[2]), Math.abs(b.max[2])));
      assert.ok(conservative < rig.bounds.radius); assert.ok(b.max[1] < rig.bounds.height);
      assert.equal(rig.worker.weapon.root.visible, false); assert.equal(b.species, species);
      assert.ok(rig.worker.parts.every(p => !/cap|hat|helmet/i.test(p.name)));
    }
    for (let i = 0; i < 90; i++) {
      rig.update({...actor, x: 7 + i / 100, y: 6.3, heading: Math.PI / 3, travelled: 2 + i / 60}, i / 60);
      close(rig.root.position.x, 7 + i / 100); close(rig.root.position.z, 6.3); assert.equal(rig.worker.weapon.root.visible, false);
    }
    assert.equal(rig.root.userData.appearance, 'normal'); rig.dispose(); rig.dispose();
    assert.throws(() => rig.update({...actor, travelled: 0}, 0), /disposed/);
    assert.throws(() => createCivilianRig(species === 'horse' ? 'goat' : 'horse', data), /identity/);
  }
});
test('civilian kit fails meaningfully without a shared borrowed renderer; forbidden identities fail', async () => {
  await assert.rejects(loadCivilianKit(), /shared THREE.*borrowed WebGLRenderer/);
  const s = scenario(gate()); s.actors = [{id: 'bad', ...CIVILIAN_PROFILES.horse, x: 2, y: 2, team: 'guard', headgear: 'none', equipment: 'none'}];
  assert.throws(() => createSimulation({scenario: s}), /Civilian identity/);
});
test('opening edge clearance and roof envelopes preserve swept ground passage', () => {
  for (const [offset, clears] of [[0.1, true], [0.2, false]]) {
    const def = scenario(gate()); def.player.x += offset;
    const sim = createSimulation({scenario: def, config: {input: {cameraRelative: false}}}); sim.dispatch({type: 'move', x: 0, y: -1});
    for (let i = 0; i < 90; i++) sim.advance(1 / 60);
    assert.equal(sim.snapshot().player.y < 4, clears);
  }
  for (const form of ['roof-gable', 'roof-hip']) {
    const roof = {...gate(), form, depth: 4, height: 1.6, baseHeight: 3.2}; delete roof.opening;
    roof.supportModuleIds = ['support'];
    const def = scenario(roof); def.modules.push({...gate(), id: 'support', form: 'pilaster', x: 1, y: 1, width: 0.3, depth: 0.3});
    const sim = createSimulation({scenario: def, config: {input: {cameraRelative: false}}});
    assert.equal(sim.snapshot().world.obstacles.length, 1); sim.dispatch({type: 'move', x: 0, y: -1});
    for (let i = 0; i < 60; i++) sim.advance(1 / 60);
    assert.ok(sim.snapshot().player.y < 5); assert.equal(sim.snapshot().world.modules[0].parts[0].solid, false);
  }
});
test('exterior passage replay including powder is identical at 30/60/120 Hz and bounded hitches', () => {
  const replay = [{type: 'move', x: 0, y: -1, atTick: 1}, {type: 'drug', drug: 'powder', atTick: 31}, {type: 'move', x: 0, y: 0, atTick: 91}];
  const run = hz => {
    const sim = createSimulation({scenario: scenario(gate()), config: {input: {cameraRelative: false}}}); replay.forEach(c => sim.dispatch(c));
    for (let i = 0; i < 2 * hz; i++) sim.advance(1 / hz);
    const s = sim.snapshot(); delete s.diagnostics.alpha; delete s.diagnostics.lastSteps; return s;
  };
  const expected = run(60); for (const hz of [30, 120, 5]) assert.deepEqual(run(hz), expected);
  assert.ok(expected.player.y < 4);
});
test('wood burnout marks individual parts dead and hides unsupported lintel/roof presentation', () => {
  const def = scenario(gate());
  def.modules.push({...gate(), id: 'roof', form: 'roof-gable', width: 6, depth: 3, height: 1.6, baseHeight: 3.2, supportModuleIds: ['gate']});
  def.ignitions = [{x: 4.15, y: 5, radius: 1.5, heat: 4}];
  const sim = createSimulation({scenario: def, config: {fuel: {surfaceBurnRate: 1000}, fire: {damagePerSecond: 0}}});
  sim.advance(1 / 60); const s = sim.advance(1 / 60), m = s.world.modules[0];
  assert.equal(s.world.obstacles.some(p => p.id === 'gate:pier-left'), false);
  assert.equal(m.parts.find(p => p.role === 'pier-left').destroyed, true);
  assert.equal(m.parts.find(p => p.role === 'pier-right').destroyed, false);
  assert.equal(m.parts.find(p => p.role === 'lintel').destroyed, true);
  assert.equal(s.world.modules[1].destroyed, true); assert.equal(s.world.modules[1].parts[0].destroyed, true);
  const bad = scenario(gate()); bad.modules.push({...def.modules[1], supportModuleIds: ['missing']}); assert.throws(() => createSimulation({scenario: bad}), /supportModuleIds/);
});
