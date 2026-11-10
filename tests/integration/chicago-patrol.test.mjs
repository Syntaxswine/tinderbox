import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import * as T from '../../src/runtime/three.js';
import {CHICAGO_1893_BEAT} from '../../src/art/chicago-beat-uniform.js';
import {CHICAGO_PATROL} from '../../src/content/exterior-kit.js';
import {COTTAGE_PAIR_SCENARIO} from '../../src/content/cottage-pair.js';
import {NEIGHBORHOOD_BASE, NEIGHBORHOOD_SCENARIO} from '../../src/content/neighborhood.js';
import {calmCottageWind} from '../../src/reuse/ashland/wind.js';
import {CIVILIAN_ASSET_BASE_URL, createChicagoPatrolRig, createCivilianRig} from '../../src/reuse/civilians.js';
import {scenarioDefinition} from '../../src/simulation/fixtures.js';
import {freePoint} from '../../src/simulation/geometry.js';
import {createSimulation, DEFAULT_CONFIG} from '../../src/simulation/index.js';

const isOfficer = actor => actor.id === CHICAGO_PATROL.id;
const officer = NEIGHBORHOOD_SCENARIO.actors.find(isOfficer);
const goat = NEIGHBORHOOD_BASE.actors.find(actor => actor.species === 'goat');

test('only the exact dressed goat patrol is allowed on the regular street', () => {
  const valid = scenarioDefinition('neighborhood');
  assert.deepEqual(valid.actors.filter(actor => actor.team === 'civilian'), NEIGHBORHOOD_BASE.actors);
  assert.deepEqual(valid.actors.filter(isOfficer), [officer]);
  assert.equal(officer.uniform, CHICAGO_1893_BEAT.id);
  for (const override of [{id: 'arbitrary-officer'}, {team: 'civilian'}, {species: undefined}, {species: 'horse'},
    {uniform: undefined}, {headgear: 'none'}, {equipment: 'rifle'}, {equipment: 'none'}, {height: 1.5}, {radius: .5}]) {
    assert.throws(() => scenarioDefinition({...NEIGHBORHOOD_SCENARIO, actors: [{...officer, ...override}]}), /Chicago patrol identity/);
  }
  for (const override of [{equipment: 'pistol'}, {uniform: officer.uniform}, {headgear: officer.headgear}, {species:'constructor'}]) {
    assert.throws(() => scenarioDefinition({...NEIGHBORHOOD_SCENARIO, actors: [{...goat, ...override}]}), /Civilian identity/);
  }
  assert.throws(() => scenarioDefinition({...NEIGHBORHOOD_SCENARIO, actors: [{id:'walker', x:2, y:2, equipment:'pistol'}]}), /Civilian identity/);
  assert.throws(() => scenarioDefinition({...COTTAGE_PAIR_SCENARIO, actors: [officer]}), /regular Catalogue Street/);
  const replay = createSimulation({scenario:COTTAGE_PAIR_SCENARIO, cottageWind:calmCottageWind});
  try {
    const {actors, cottageFire} = replay.snapshot();
    assert.deepEqual(actors.map(actor => actor.id), NEIGHBORHOOD_BASE.actors.map(actor => actor.id));
    assert.ok(actors.every(actor => actor.equipment === 'none'));
    assert.equal(cottageFire.buildings.length, 2);
  } finally { replay.dispose(); }
});

test('the officer walks and turns on the existing world clock with a single sidearm after reset', () => {
  const sim = createSimulation({scenario:'neighborhood', characterId:'bear'});
  try {
    const initial = sim.snapshot(), idle = initial.actors.find(isOfficer);
    assert.equal(idle.moving, false);
    assert.equal(idle.equipment, 'pistol');
    assert.equal(sim.dispatch({type:'select-tool', tool:'pistol'}), false);
    const firstStep = sim.advance(DEFAULT_CONFIG.step);
    const headings = new Set();
    let frame = initial;
    for (let i = 0; i < 49; i++) {
      frame = sim.advance(.25);
      const actor = frame.actors.find(isOfficer);
      assert.ok(actor.x >= officer.x - 1e-6 && actor.x <= officer.route[1].x + 1e-6);
      assert.equal(actor.y, officer.y);
      assert.equal(actor.equipment, idle.equipment);
      assert.ok(freePoint(actor, actor.radius, frame.world, frame.world.obstacles));
      assert.ok(Math.abs(actor.travelled - officer.speed * frame.clocks.world) < 1e-6);
      headings.add(actor.heading);
    }
    assert.deepEqual(headings, new Set([0, Math.PI]));
    assert.equal(frame.player.tool, initial.player.tool);
    assert.deepEqual(frame.player.inventory, initial.player.inventory);
    assert.equal(frame.player.hp, initial.player.hp);
    assert.ok(sim.dispatch({type:'reset'}));
    assert.deepEqual(sim.advance(DEFAULT_CONFIG.step).actors, firstStep.actors);
  } finally { sim.dispose(); }
});

test('the native pistol follows the hips and clears the posed coat and hands', () => {
  const data = JSON.parse(readFileSync(new URL(officer.model, CIVILIAN_ASSET_BASE_URL)));
  const rig = createChicagoPatrolRig(data), civilian = createCivilianRig('goat', data);
  try {
    const pistol = rig.root.getObjectByName('TT-33 belt sidearm');
    const uniform = rig.root.getObjectByName(officer.uniform);
    const hips = rig.worker.skeleton.getBoneByName('hips');
    assert.equal(pistol.parent, hips);
    assert.deepEqual(pistol.scale.toArray(), [1, 1, 1]);
    const coat = uniform.getObjectByName('coat');
    const clothes = [...coat.children.filter(mesh => /Fitted|Parted/.test(mesh.name)),
      ...uniform.getObjectByName('trousers').children];
    const belt = uniform.getObjectByName('Black waist belt');
    const sleevesAndHands = [...coat.children.filter(mesh => /forearm wool|cuff/i.test(mesh.name)),
      ...rig.worker.parts.filter(mesh => mesh.name.startsWith('forearm and hand'))];
    const point = new T.Vector3(), outside = new T.Vector3(), rotation = new T.Quaternion();
    const ray = new T.Raycaster(), normal = new T.Vector3(), inward = new T.Vector3(), hits = [];
    const vertices = new Map(), grip = pistol.getObjectByName('grip'), muzzle = pistol.getObjectByName('muzzle');
    for (const mesh of pistol.children.filter(child => child.isMesh)) {
      mesh.updateMatrix();
      const positions = mesh.geometry.getAttribute('position');
      for (let i = 0; i < positions.count; i++) {
        point.fromBufferAttribute(positions, i).applyMatrix4(mesh.matrix);
        vertices.set(point.toArray().map(value => value.toFixed(6)).join(','), point.clone());
      }
    }
    let beltGap = Infinity, clothingGap = Infinity;
    function gap(meshes) {
      ray.set(outside.copy(point).addScaledVector(normal, .5), inward);
      hits.length = 0;
      return (ray.intersectObjects(meshes, false, hits)[0]?.distance ?? Infinity) - .5;
    }
    const gait = [0, .11, .23, .36, .50, .61, .72, .85];
    for (const [travelled, heading] of [...gait.map(distance => [distance, 0]), [.36, Math.PI]]) {
      const pose = {x:38, y:18.4, hp:100, heading, travelled, moving:travelled > 0};
      rig.update({...officer, ...pose}, travelled);
      civilian.update({...goat, ...pose}, travelled);
      assert.deepEqual(rig.worker.bones.map(bone => bone.matrixWorld.toArray()), civilian.worker.bones.map(bone => bone.matrixWorld.toArray()));
      assert.equal(rig.worker.weapon.root.visible, false);
      assert.equal(rig.diagnostics().sidearm.visible, true);
      pistol.getWorldQuaternion(rotation);
      assert.ok(new T.Vector3(1, 0, 0).applyQuaternion(rotation).y < -.9);
      assert.ok(grip.getWorldPosition(point).y - muzzle.getWorldPosition(outside).y > .15);
      normal.set(0, 0, 1).applyQuaternion(rotation); normal.y = 0; normal.normalize(); inward.copy(normal).negate();
      const pistolBounds = new T.Box3().setFromObject(pistol, true);
      for (const hand of sleevesAndHands) assert.ok(!pistolBounds.intersectsBox(new T.Box3().setFromObject(hand, true)), hand.name);
      for (const mesh of [...clothes, belt]) mesh.computeBoundingSphere();
      for (const vertex of vertices.values()) {
        point.copy(vertex).applyMatrix4(pistol.matrixWorld);
        clothingGap = Math.min(clothingGap, gap(clothes));
        beltGap = Math.min(beltGap, gap([belt]));
        assert.ok(Math.hypot(point.x - pose.x, point.z - pose.y) < officer.radius);
        assert.ok(point.y < officer.height);
      }
    }
    assert.ok(clothingGap > .003, `Clothing clearance ${clothingGap} m`);
    assert.ok(beltGap >= 0 && beltGap < .005, `Belt clearance ${beltGap} m`);
  } finally { rig.dispose(); civilian.dispose(); }
});
