import fs from 'node:fs';
import {createHash} from 'node:crypto';
const sha = b => createHash('sha256').update(b).digest('hex');
const record = path => { const b = Buffer.from(fs.readFileSync(path, 'utf8').replace(/\r\n/g, '\n')); return {path, bytes: b.length, sha256: sha(b)}; };
const check = JSON.parse(fs.readFileSync('docs/art/medicine-pickups/check-results.json'));
const source = {
  hashEncoding: 'UTF-8 project text normalized to LF, matching committed Git bytes',
  project: 'Tinderbox', repository: 'https://github.com/Syntaxswine/tinderbox.git',
  branch: 'codex/medicine-pickup-art', baseCommit: '26e1b1301ce577ab8ed26afa32fdafa93d7d44e4',
  contract: {commit: '1447206df7a2e156c637e92aa3610577f8b39a1e', path: 'docs/milestones/08-explorable-places.md', section: 'Shared catalogue and UI API: world pickups and artist adapter'},
  acceptedUserRequirement: {date: '2026-10-28', threadId: '01a17edb-5cf4-7af0-a52e-d28547bb7ede', threadTitle: 'Set up Tinderbox UI worktree', messages: [
    {id: '01a1812c-00e1-7ce2-810e-57ebb120f62b', text: 'the drugs or medicine should be used automatically when they are picked up'},
    {id: '01a1812c-3d40-7d33-9ae9-ceba39ea9851', text: 'walk over them to use them'}]},
  vectors: {...record('assets/art/ui/control-symbols.svg'), sourceCommit: '26e1b1301ce577ab8ed26afa32fdafa93d7d44e4', lastChangeCommit: '2b33b528de724adec3ddf3b7227dfed0ec2210d5', details: 'art/source/medicine-pickups/mark-source.json'},
  palette: {...record('src/art/materials.js'), sourceCommit: '26e1b1301ce577ab8ed26afa32fdafa93d7d44e4', lastChangeCommit: 'b3c7c009706dc48a10cd97951df36f79a4d5fb21', reuse: 'Existing shirt, leather, brass, steel, ivory, dark and glass material recipes; supplied project materials/maps are cloned or borrowed without mutation.'},
  imports: 'No additional donor import. Existing Farmyard/AFT source licenses and provenance remain authoritative; this record grants no new blanket rights.',
  reviewOnly: {bearSourceCommit: '4f5f53917990ec03b2f14c65f067e4b99ec8fcaa', bearData: 'vendor/animal-factory-tactics-3d/4f5f53917990ec03b2f14c65f067e4b99ec8fcaa/dist/tactics/bear-10k-data.json', scale: [1,1,1], appearance: 'CPU base colours; native projection-paint shader omitted'},
  adaptations: ['Existing polygon contours become shallow upward-facing 3D marks.', 'Physical packet, jar and tin use the existing shared material slots.', 'New art is a source-local metre-scale ground presentation, not use/collision logic.']
};
fs.writeFileSync('art/source/medicine-pickups/provenance.json', JSON.stringify(source, null, 2) + '\n');
const value = {
  assetId: 'medicine-pickups-v1', version: 1, hashEncoding: 'UTF-8 project text normalized to LF, matching committed Git bytes', units: 'metres', up: '+Y', recordAxes: 'x -> X, y -> Z; ground foot Y=0',
  entryPoint: 'assets/art/medicine-pickups/index.js', factory: 'createMedicinePickups(THREE,{materials,textures})',
  result: ['root','update','dispose','diagnostics'], update: 'update(pickups,{worldTime,paused})',
  runtimeFiles: ['assets/art/medicine-pickups/index.js','assets/art/medicine-pickups/marks.js'].map(record),
  dependencies: ['src/art/materials.js','src/art/resources.js'].map(record),
  appearanceSlots: ['shirt','leather','brass','steel','ivory','dark','glass'],
  kinds: check.measured, maximumCount: 64, construction: check.construction,
  geometry: 'Fixed physical dimensions and unit scale; all three fit the current default 0.22 m pickup radius. No bobbing, timeouts, billboards or independent use rules. Record radius is retained as authoritative metadata and never rescales a prop.',
  state: 'Each call is a complete snapshot. Consumed and absent IDs have no visible group, even while paused. False consumed state on reset restores the item. Stable IDs reuse their group; templates share owned geometry/materials.',
  ownership: 'Host Three is injected. Input material values are cloned; input textures/maps are borrowed unchanged. Only generated geometry and cloned/default materials are disposed, exactly once. Unknown host slots are ignored.',
  rights: source.imports, provenance: 'art/source/medicine-pickups/provenance.json',
  integration: 'Artist candidate only. Coder owns Catalogue Street composition, accepted movement, effect application and consumption. Landmark exploration does not use pickups. Combined WebGL acceptance and architect promotion remain pending.'
};
fs.writeFileSync('assets/art/medicine-pickups/manifest.json', JSON.stringify(value, null, 2) + '\n');
console.log(JSON.stringify({runtimeFiles: value.runtimeFiles.length, runtimeBytes: value.runtimeFiles.reduce((n,f)=>n+f.bytes,0), totalPrototypeTriangles: Object.values(check.measured).reduce((n,s)=>n+s.triangles,0)}));
