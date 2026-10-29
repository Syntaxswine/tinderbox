import assert from 'node:assert/strict';
import fs from 'node:fs';
import {createHash} from 'node:crypto';
import * as T from '../../src/runtime/three.js';
import {createMedicinePickups, MEDICINE_KINDS, APPEARANCE_SLOTS} from '../../assets/art/medicine-pickups/index.js';
const records = MEDICINE_KINDS.map((kind, i) => Object.freeze({id: 'test-' + kind, kind, x: i * 2, y: 3, radius: .22, consumed: false}));
const jsonBefore = JSON.stringify(records), a = createMedicinePickups(T), measured = {};
assert.equal(a.root.children.length, 0); assert.equal(a.diagnostics().ownedGeometries, 0);
a.update(records, {worldTime: 0, paused: false});
const counts = a.diagnostics(), originals = [...a.root.children];
assert.equal(counts.visiblePickups, 3);
for (const [i, record] of records.entries()) {
  const g = a.root.children[i]; assert.deepEqual(g.position.toArray(), [record.x, 0, record.y]);
  assert.deepEqual(g.scale.toArray(), [1, 1, 1]);
  const min = [Infinity, Infinity, Infinity], max = [-Infinity, -Infinity, -Infinity]; let radius = 0, triangles = 0, meshes = 0;
  g.traverse(o => { if (!o.isMesh) return; meshes++; const geom = o.geometry, pos = geom.attributes.position;
    triangles += (geom.index?.count || pos.count) / 3;
    assert.ok(o.material.color.toArray().every(Number.isFinite));
    for (let n = 0; n < pos.count; n++) {
      const v = new T.Vector3().fromBufferAttribute(pos, n).applyMatrix4(o.matrixWorld);
      v.sub(new T.Vector3(record.x, 0, record.y));
      radius = Math.max(radius, Math.hypot(v.x, v.z));
      v.toArray().forEach((val, j) => { assert.ok(Number.isFinite(val)); min[j] = Math.min(min[j], val); max[j] = Math.max(max[j], val); });
    }
  });
  assert.ok(min[1] >= -1e-7 && min[1] <= .006, 'Ground contact ' + record.kind);
  assert.ok(radius <= .22, 'Physical footprint fits the default authoritative .22 m radius');
  measured[record.kind] = {bounds: {min, max}, size: max.map((v, j) => v - min[j]), radius, meshes, triangles};
}
a.update([...records].reverse(), {worldTime: 999, paused: true});
assert.deepEqual(a.root.children, originals); assert.deepEqual(a.diagnostics(), counts);
const shifted = records.map(p => ({...p, x: p.x + 2, y: p.y - 1, radius: .1}));
a.update(shifted); shifted.forEach((p, i) => { assert.equal(a.root.children[i], originals[i]); assert.deepEqual(originals[i].position.toArray(), [p.x, 0, p.y]); assert.deepEqual(originals[i].scale.toArray(), [1, 1, 1]); });
assert.equal(JSON.stringify(records), jsonBefore, 'Borrowed records unchanged');
for (const invalid of [null, [...records, records[0]], [{...records[0], x: NaN}], [{...records[0], kind: 'new-effect'}], [{...records[0], radius: 0}], [{...records[0], consumed: 'yes'}]]) {
  assert.throws(() => a.update(invalid)); assert.equal(a.root.children.length, 3); assert.deepEqual(a.diagnostics(), counts);
}
a.update(records.map(p => ({...p, consumed: p.kind === 'healing'})), {worldTime: 9999, paused: true});
assert.equal(a.root.children.length, 2); assert.ok(!a.root.children.some(g => g.userData.kind === 'healing'));
a.update(records); assert.equal(a.root.children.length, 3); assert.deepEqual(a.diagnostics(), counts);
a.update([{...records[0], kind: 'inversion'}]); assert.equal(a.root.children[0].userData.kind, 'inversion');
for (let tick = 0; tick < 80; tick++) {
  a.update(Array.from({length: 64}, (_, i) => ({id: 'churn-' + tick + '-' + i, kind: MEDICINE_KINDS[i % 3], x: i, y: tick, radius: .22, consumed: i % 7 === 0})), {worldTime: tick, paused: !!(tick % 2)});
  assert.equal(a.diagnostics().ownedGeometries, counts.ownedGeometries); assert.equal(a.diagnostics().ownedMaterials, counts.ownedMaterials);
  assert.equal(a.diagnostics().templates, 3); assert.equal(a.diagnostics().visiblePickups, 54);
}
a.update([]); assert.equal(a.root.children.length, 0);
a.dispose(); a.dispose(); assert.deepEqual(a.diagnostics(), {disposed: true, visiblePickups: 0, meshes: 0, templates: 0, ownedGeometries: 0, ownedMaterials: 0, ownedTextures: 0});
assert.throws(() => a.update(records), /disposed/);

const borrowed = new T.MeshStandardMaterial({color: 0xd4c7a5}), texture = new T.Texture(); texture.repeat.set(3, 5); texture.offset.set(.2, .3);
borrowed.map = texture; const originalJSON = JSON.stringify(borrowed.toJSON()); let borrowedDisposed = 0, textureDisposed = 0;
borrowed.addEventListener('dispose', () => borrowedDisposed++); texture.addEventListener('dispose', () => textureDisposed++);
const hostMaterials = Object.fromEntries(APPEARANCE_SLOTS.map(k => [k, borrowed])); hostMaterials.unrelated = {};
const hostTextures = Object.fromEntries(APPEARANCE_SLOTS.map(k => [k, texture])); hostTextures.cargo = {};
const b = createMedicinePickups(T, {materials: hostMaterials, textures: hostTextures}); b.update(records);
const ownGeometry = new Map(), ownMaterial = new Map();
b.root.traverse(o => { if (!o.isMesh) return;
  assert.notEqual(o.material, borrowed); assert.equal(o.material.map, texture);
  ownGeometry.set(o.geometry, 0); ownMaterial.set(o.material, 0);
});
for (const [g] of ownGeometry) g.addEventListener('dispose', () => ownGeometry.set(g, ownGeometry.get(g) + 1));
for (const [m] of ownMaterial) m.addEventListener('dispose', () => ownMaterial.set(m, ownMaterial.get(m) + 1));
b.dispose(); b.dispose(); assert.ok([...ownGeometry.values(), ...ownMaterial.values()].every(n => n === 1));
assert.equal(borrowedDisposed, 0); assert.equal(textureDisposed, 0); assert.equal(JSON.stringify(borrowed.toJSON()), originalJSON);
assert.deepEqual(texture.repeat.toArray(), [3, 5]); assert.deepEqual(texture.offset.toArray(), [.2, .3]);
borrowed.dispose(); texture.dispose();
const c = createMedicinePickups(T); c.update(records.map(p => ({...p, consumed: true})), {paused: true});
assert.equal(c.diagnostics().ownedGeometries, 0); c.dispose();
assert.throws(() => createMedicinePickups(T, {materials: {ivory: {}}}), /material/);
const source = JSON.parse(fs.readFileSync('art/source/medicine-pickups/mark-source.json'));
const bytes = Buffer.from(fs.readFileSync(source.path, 'utf8').replace(/\r\n/g, '\n')); assert.equal(createHash('sha256').update(bytes).digest('hex'), source.sha256);
const report = {passed: true, nativeUnits: 'metres; static geometry at scale 1', measured,
  construction: counts, transitions: ['snapshot placement', 'stable identity on reorder/move', 'consumed while paused', 'reset/reappearance', 'kind replacement', 'missing ID removal', '80 snapshots of 64 changing IDs without resource growth', 'invalid snapshots leave last valid state intact'],
  resources: {ownedGeometriesDisposedExactlyOnce: ownGeometry.size, clonedMaterialsDisposedExactlyOnce: ownMaterial.size, borrowedMaterialsDisposed: 0, borrowedTexturesDisposed: 0, synchronousNoDOM: true},
  sourceMarksUnchanged: true, limitations: ['Art-only headless geometry/state checks. Actual collection, native paint, phone readability and WebGL performance require combined review.']};
if (process.argv.includes('--write')) { fs.mkdirSync('docs/art/medicine-pickups', {recursive: true}); fs.writeFileSync('docs/art/medicine-pickups/check-results.json', JSON.stringify(report, null, 2) + '\n'); }
console.log(JSON.stringify(report, null, 2));
