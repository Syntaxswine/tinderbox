import fs from 'node:fs';
import path from 'node:path';
import * as T from '../../../src/runtime/three.js';
import {createMedicinePickups} from '../../../assets/art/medicine-pickups/index.js';
import {createBearRig, BEAR_SOURCE_COMMIT} from '../../../src/reuse/bear.js';
const out = path.resolve('artifacts/medicine-pickups/renders'); fs.mkdirSync(out, {recursive: true});
const positions = [{id: 'powder', kind: 'powder', x: -.55, y: 0, radius: .22, consumed: false}, {id: 'healing', kind: 'healing', x: 0, y: 0, radius: .22, consumed: false}, {id: 'inversion', kind: 'inversion', x: .55, y: 0, radius: .22, consumed: false}];
const definitions = [
  {name: 'medicine-kit', title: 'Medicine ground props | existing marks and materials', camera: {target: [0, .09, 0], origin: [0, 2, -2.4], halfWidth: 1.02}, caption: 'Left to right: inversion tin, medicine jar, folded powder packet. Maximum physical radius 0.22 m; fixed size, grounded origin.', width: 1600, height: 1000},
  {name: 'native-scale', title: 'Medicine ground props | native bear reference', camera: {target: [0, .9, .45], origin: [3.3, 4.5, -6], halfWidth: 2.0}, bear: true, caption: 'Unscaled native AFT bear; props keep their measured dimensions. CPU base colours only. This is an art scale review, not gameplay.', width: 1600, height: 1000},
  {name: 'consumed-state', title: 'Medicine ground props | consumed snapshot', camera: {target: [0, .09, 0], origin: [0, 2, -2.4], halfWidth: 1.02}, consume: 'healing', caption: 'Same positions and camera: healing is consumed, so its complete group is absent. Powder and inversion remain unchanged.', width: 1600, height: 1000}
];
const records = [];
for (const spec of definitions) {
  const model = createMedicinePickups(T), root = new T.Group(); root.add(model.root); let bear;
  try {
    model.update(positions.map(p => ({...p, consumed: p.kind === spec.consume})), {worldTime: 10, paused: !!spec.consume});
    if (spec.bear) { bear = createBearRig(JSON.parse(fs.readFileSync('vendor/animal-factory-tactics-3d/' + BEAR_SOURCE_COMMIT + '/dist/tactics/bear-10k-data.json'))); bear.update({x: -.55, y: .85, heading: .55, travelled: 0, tool: 'matches', moving: false}, 0); bear.setHeldVisible(false); root.add(bear.root); }
    root.updateMatrixWorld(true); const groups = new Map(); let triangles = 0;
    root.traverseVisible(o => {
      if (!o.isMesh) return; if (o.isSkinnedMesh) o.skeleton.update();
      const g = o.geometry, count = g.index?.count || g.attributes.position.count, m = o.material;
      const color = m.color?.toArray() || [.4, .4, .4], key = JSON.stringify(color);
      if (!groups.has(key)) groups.set(key, {color, vertices: []}); const group = groups.get(key);
      for (let j = 0; j < count; j++) { const index = g.index ? g.index.getX(j) : j, v = o.getVertexPosition(index, new T.Vector3()).applyMatrix4(o.matrixWorld); group.vertices.push(v.toArray()); }
      triangles += count / 3;
    });
    const directory = path.join(out, spec.name); fs.mkdirSync(directory, {recursive: true}); const materials = [];
    for (const [i, group] of [...groups.values()].entries()) {
      const v = group.vertices, file = 'material-' + i + '.ply';
      const header = Buffer.from(`ply\nformat binary_little_endian 1.0\nelement vertex ${v.length}\nproperty float x\nproperty float y\nproperty float z\nelement face ${v.length / 3}\nproperty list uchar uint vertex_indices\nend_header\n`);
      const b = Buffer.alloc(v.length * 12 + v.length / 3 * 13); let at = 0;
      for (const values of v) for (const value of values) { if (!Number.isFinite(value)) throw Error('Invalid vertex'); b.writeFloatLE(value, at); at += 4; }
      for (let j = 0; j < v.length; j += 3) { b.writeUInt8(3, at++); for (let k = 0; k < 3; k++) { b.writeUInt32LE(j + k, at); at += 4; } }
      fs.writeFileSync(path.join(directory, file), Buffer.concat([header, b])); materials.push({file, color: group.color});
    }
    const record = {...spec, directory, triangles, materials, limitations: ['Actual factory meshes, CPU diffuse approximation of source material colours. Borrowed project maps and native bear projection paint omitted.', 'No browser, gameplay, input, collision or collection proof.'], positions};
    fs.writeFileSync(path.join(directory, 'scene.json'), JSON.stringify(record, null, 2) + '\n'); const {materials: omitted, ...entry} = record; records.push(entry);
    console.log('Exported ' + spec.name + ' / ' + triangles + ' actual triangles');
  } finally { model.dispose(); bear?.dispose(); }
}
fs.writeFileSync(path.join(out, 'index.json'), JSON.stringify(records, null, 2) + '\n');
