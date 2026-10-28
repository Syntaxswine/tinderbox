import {test} from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import {compileModules, CIVILIAN_PROFILES, DEFAULT_STORY_HEIGHT, WALL_STORY_OPTIONS, ASSET_SCALE} from '../../src/content/exterior-kit.js';
import {createSimulation} from '../../src/simulation/index.js';
import {createCivilianRig, loadCivilianKit} from '../../src/reuse/civilians.js';
import {roomBoxes} from '../../vendor/farmyard-commando/30a3b8cae5f36bb0c1df3685b7fba16f701c2083/sites/tactical-animal/dist/aft/tactics/hybrid-geometry.js';
const close = (a, b) => assert.ok(Math.abs(a - b) < 1e-8, `${a} != ${b}`);
const skins = {facade: 'inherited-plaster', trim: 'inherited-cream', door: 'inherited-wood', roof: 'inherited-roof'};
const gate = (state = 'open', heading = 0) => ({id: 'gate', form: 'doorway', x: 6, y: 5, heading, width: 3, depth: 0.16, height: 2,
  opening: {width: 1, height: 1.65, state}, physicalMaterial: 'wood', skinSlots: {...skins}, sourceRefs: ['game:test', 'farmyard:hybrid-wall-opening']});
const scenario = m => ({id: 'gate-test', width: 12, height: 10, player: {x: 6, y: 7.5, tool: 'jerry-can'}, modules: [m], obstacles: [], actors: []});
function passGate(m, powder = false, radius = 0.56) {
  const sim = createSimulation({scenario: scenario(m), config: {input: {cameraRelative: false}, player: {radius}}});
  sim.dispatch({type: 'move', x: 0, y: -1}); sim.dispatch({type: 'primary', pressed: true}); sim.dispatch({type: 'primary', pressed: false});
  if (powder) sim.dispatch({type: 'drug', drug: 'powder'});
  let s; for (let i = 0; i < 90; i++) s = sim.advance(1 / 60); return s;
}
test('native door stays unchanged: small probe passes, full-sized bear cannot fit, closed leaf blocks both', () => {
  for (const powder of [false, true]) {
    const open = passGate(gate(), powder, 0.3), closed = passGate(gate('closed'), powder, 0.3);
    const bear = passGate(gate(), powder); assert.ok(bear.player.y > 5); close(bear.player.radius, 0.56);
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
  const m = compiled.modules[0]; close(m.parts.find(p => p.role === 'lintel').h - m.parts.find(p => p.role === 'lintel').height / 2, 1.65);
  assert.equal(m.parts.find(p => p.role === 'lintel').blocksHeat, false);
  const turn = compileModules([gate('open', Math.PI / 2)], {width: 12, height: 10});
  close(turn.obstacles[0].x, 6); assert.ok(turn.obstacles[0].y < 5); close(turn.obstacles[0].width, 0.16);
  const turnedScenario = scenario(gate('open', Math.PI / 2)); turnedScenario.player = {x: 8.5, y: 5};
  const sim = createSimulation({scenario: turnedScenario, config: {input: {cameraRelative: false}, player: {radius: 0.3}}});
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
  for (const change of [{form: 'palace'}, {heading: 0.1}, {opening: {width: 1.4, height: 2.3, state: 'open'}},
    {opening: {width: 1.4, height: 1.65, state: 'open'}}, {opening: {width: 1, height: 1.65, state: 'ajar'}}, {sourceRefs: []}, {skinSlots: {facade: 'unregistered'}}]) {
    assert.throws(() => createSimulation({scenario: scenario({...gate(), ...change})}));
  }
  assert.throws(() => compileModules([gate(), gate()], {width: 12, height: 10}));
});
test('exposition is additive, civilian metadata is explicit, detached, and uses slowed world time', () => {
  const normal = createSimulation({scenario: 'exposition'}), slow = createSimulation({scenario: 'exposition'});
  slow.dispatch({type: 'drug', drug: 'powder'});
  for (let i = 0; i < 60; i++) { normal.advance(1 / 60); slow.advance(1 / 60); }
  const a = normal.snapshot(), b = slow.snapshot(); assert.equal(a.world.modules.length, 11);
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
  for (const [offset, clears] of [[0.1, true], [0.25, false]]) {
    const def = scenario(gate()); def.player.x += offset;
    const sim = createSimulation({scenario: def, config: {input: {cameraRelative: false}, player: {radius: 0.3}}}); sim.dispatch({type: 'move', x: 0, y: -1});
    for (let i = 0; i < 90; i++) sim.advance(1 / 60);
    assert.equal(sim.snapshot().player.y < 4, clears);
  }
  for (const form of ['roof-gable', 'roof-hip']) {
    const roof = {...gate(), form, depth: 4, height: 1.6, baseHeight: 2}; delete roof.opening;
    roof.supportModuleIds = ['support'];
    const def = scenario(roof); def.modules.push({...gate(), id: 'support', form: 'pilaster', x: 1, y: 1, width: 1, depth: 0.16});
    const sim = createSimulation({scenario: def, config: {input: {cameraRelative: false}}});
    assert.equal(sim.snapshot().world.obstacles.length, 1); sim.dispatch({type: 'move', x: 0, y: -1});
    for (let i = 0; i < 60; i++) sim.advance(1 / 60);
    assert.ok(sim.snapshot().player.y < 5); assert.equal(sim.snapshot().world.modules[0].parts[0].solid, false);
  }
});
test('exterior passage replay including powder is identical at 30/60/120 Hz and bounded hitches', () => {
  const replay = [{type: 'move', x: 0, y: -1, atTick: 1}, {type: 'drug', drug: 'powder', atTick: 31}, {type: 'move', x: 0, y: 0, atTick: 91}];
  const run = hz => {
    const sim = createSimulation({scenario: scenario(gate()), config: {input: {cameraRelative: false}, player: {radius: 0.3}}}); replay.forEach(c => sim.dispatch(c));
    for (let i = 0; i < 2 * hz; i++) sim.advance(1 / hz);
    const s = sim.snapshot(); delete s.diagnostics.alpha; delete s.diagnostics.lastSteps; return s;
  };
  const expected = run(60); for (const hz of [30, 120, 5]) assert.deepEqual(run(hz), expected);
  assert.ok(expected.player.y < 4);
});
test('wood burnout marks individual parts dead and hides unsupported lintel/roof presentation', () => {
  const def = scenario(gate());
  def.modules.push({...gate(), id: 'roof', form: 'roof-gable', width: 6, depth: 3, height: 1.6, baseHeight: 2, supportModuleIds: ['gate']});
  def.ignitions = [{x: 5, y: 5, radius: 0.6, heat: 4}];
  const sim = createSimulation({scenario: def, config: {fuel: {surfaceBurnRate: 1000}, fire: {damagePerSecond: 0}}});
  sim.advance(1 / 60); const s = sim.advance(1 / 60), m = s.world.modules[0];
  assert.equal(s.world.obstacles.some(p => p.id === 'gate:pier-left'), false);
  assert.equal(m.parts.find(p => p.role === 'pier-left').destroyed, true);
  assert.equal(m.parts.find(p => p.role === 'pier-right').destroyed, false);
  assert.equal(m.parts.find(p => p.role === 'lintel').destroyed, true);
  assert.equal(s.world.modules[1].destroyed, true); assert.equal(s.world.modules[1].parts[0].destroyed, true);
  const bad = scenario(gate()); bad.modules.push({...def.modules[1], supportModuleIds: ['missing']}); assert.throws(() => createSimulation({scenario: bad}), /supportModuleIds/);
});

test('shared scale derives native wall, leaf, slab and floor-spacing dimensions from pinned templates', () => {
  assert.deepEqual(ASSET_SCALE, {worldUnitsPerMetre: 1, tile: 1, wallHeight: 2, wallThickness: 0.16, slab: 0.12, floorSpacing: 2.12, doorWidth: 1, doorHeight: 1.65, doorThickness: 0.12});
  assert.equal(DEFAULT_STORY_HEIGHT, 2); assert.ok(Object.isFrozen(ASSET_SCALE));
  assert.deepEqual(WALL_STORY_OPTIONS.map(p => p.stories), [1, 2, 3, 4, 5]);
  for (const [i, height] of [2, 4.12, 6.24, 8.36, 10.48].entries()) close(WALL_STORY_OPTIONS[i].height, height);
  assert.ok(Object.isFrozen(WALL_STORY_OPTIONS) && WALL_STORY_OPTIONS.every(Object.isFrozen));
});

test('five heights compose unchanged native wall templates at every heading, with native slab intervals', () => {
  const native = roomBoxes({doorClosed: true});
  const wall = native.find(p => p.name === 'Left pier'), lintel = native.find(p => p.name === 'Door lintel'), leaf = native.find(p => p.name === 'Closed door');
  for (const option of WALL_STORY_OPTIONS) for (const heading of [0, Math.PI / 2, Math.PI, 3 * Math.PI / 2]) {
    for (const form of ['wall', 'doorway', 'pilaster', 'corner']) {
      const module = {...gate('closed', heading), form, width: form === 'doorway' ? 5 : 2, depth: form === 'corner' ? 2 : 0.16, stories: option.stories, thickness: 0.16}; delete module.height;
      if (form !== 'doorway') delete module.opening;
      const {modules, obstacles} = compileModules([module], {width: 12, height: 10}), m = modules[0];
      close(m.height, option.height); close(m.storyHeight, 2); close(m.floorSpacing, 2.12);
      close(Math.max(...m.parts.map(p => p.h + p.height / 2)), option.height);
      close(Math.min(...m.parts.map(p => p.h - p.height / 2)), 0);
      for (const p of m.parts) {
        if (p.sourceAssetId === 'tinderbox:facade-slab-band-1m') {
          close(p.height, 0.12); assert.equal(p.solid, false); assert.ok(p.supportPartIds.length);
        } else {
          const template = p.sourceAssetId === 'aft:door-leaf-1m' ? leaf : p.sourceAssetId === 'aft:door-lintel-1m' ? lintel : wall;
          assert.deepEqual([p.width, p.height, p.depth].sort((a,b) => a-b), [...template.size].sort((a,b) => a-b));
          const bottom = p.h - p.height / 2;
          if (p.role.startsWith('story-')) { assert.equal(p.solid, false); assert.ok(p.supportPartIds.length); close(bottom / 2.12, Math.round(bottom / 2.12)); }
          else if (p.solid) close(bottom, 0);
        }
      }
      assert.ok(obstacles.every(p => p.baseHeight === 0));
      if (form === 'doorway') { close(m.parts.find(p => p.role === 'closed-door').height, 1.65); }
    }
  }
});

test('one through five stories preserve native ground passage, physical footprint and roof support', () => {
  for (const option of WALL_STORY_OPTIONS) for (const state of ['open', 'closed']) {
    const door = {...gate(state), stories: option.stories}; delete door.height;
    const roof = {...gate(), id: 'roof', form: 'roof-hip', depth: 3, height: 1.6, baseHeight: option.height, supportModuleIds: ['gate']}; delete roof.opening;
    const def = scenario(door); def.modules.push(roof);
    const sim = createSimulation({scenario: def});
    const before = sim.snapshot(), frame = before.world.modules[0];
    close(frame.parts.find(p => p.role === 'lintel').h - frame.parts.find(p => p.role === 'lintel').height / 2, 1.65);
    const envelope = before.world.modules[1].parts[0]; close(envelope.h - envelope.height / 2, option.height); assert.equal(envelope.solid, false);
    assert.equal(before.world.obstacles.length, state === 'open' ? 2 : 3);
    assert.ok(passGate(door).player.y > 5, 'full-size bear must not squeeze through native opening');
    assert.equal(passGate(door, false, 0.3).player.y < 4, state === 'open');
    const ground = compileModules([gate(state)], {width:12,height:10}); assert.deepEqual(before.world.obstacles, ground.obstacles);
    sim.dispose();
  }
});

test('native composition rejects asset rescaling and invalid dimensions before creating a scenario', () => {
  for (const stories of [0, 6, -1, 1.5, null, '3', Infinity]) assert.throws(() => compileModules([{...gate(), stories}], {width: 12, height: 10}), /stories/);
  for (const change of [{height:3.2}, {stories:2, height:4}, {storyHeight:3.2}, {floorSpacing:2}, {depth:0.3}, {width:3.5}, {width:4},
    {opening:{width:1.4,height:2.3,state:'open'}}, {opening:{width:1,height:2.3,state:'open'}}]) assert.throws(() => compileModules([{...gate(), ...change}], {width:12,height:10}));
  assert.throws(() => compileModules([{...gate(), form:'roof-gable', stories:2}], {width:12,height:10}), /Story/);
});

test('destroyed native ground structure hides supported upper walls and floor bands without ground blockers', () => {
  const module = {...gate(), stories:5}; delete module.height;
  const def=scenario(module); def.ignitions=[{x:5,y:5,radius:0.6,heat:4}];
  const sim=createSimulation({scenario:def,config:{fuel:{surfaceBurnRate:1000},fire:{damagePerSecond:0}}});
  sim.advance(1/60);const snapshot=sim.advance(1/60), m=snapshot.world.modules[0];
  assert.equal(m.parts.find(p=>p.role==='pier-left').destroyed,true);
  assert.ok(m.parts.filter(p=>p.role.startsWith('story-')||p.role.startsWith('floor-')||p.role==='lintel').every(p=>p.destroyed));
  assert.ok(snapshot.world.obstacles.every(p=>p.baseHeight===0));
});

test('composed story part IDs cannot alias another module or its collision', () => {
  const tall={...gate(),id:'facade',form:'wall',stories:2};delete tall.height;delete tall.opening;
  const other={...gate(),id:'facade:story-1',form:'wall'};delete other.opening;
  assert.throws(()=>compileModules([tall,other],{width:12,height:10}),/Duplicate resolved part ID/);
});
