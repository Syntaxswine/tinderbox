import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import {createHash} from 'node:crypto';
import {pathToFileURL} from 'node:url';
const sha = b => createHash('sha256').update(b).digest('hex');
const base = path.resolve('dist'), seen = new Set(), nested = new URL('https://example.invalid/tinderbox/');
function visit(relative) {
  if (seen.has(relative)) return; seen.add(relative);
  assert.ok(!relative.startsWith('../') && !path.isAbsolute(relative));
  const source = fs.readFileSync(path.join(base, relative), 'utf8');
  assert.ok(!/(?:C:[\\/]|file:\/\/)/i.test(source), 'No local absolute runtime references');
  const url = new URL(relative, nested); assert.ok(url.pathname.startsWith('/tinderbox/'));
  for (const m of source.matchAll(/(?:\bfrom\s*|\bimport\s*\(\s*|\bimport\s*)['"](\.[^'"]+)['"]/g)) {
    const resolved = path.posix.normalize(path.posix.join(path.posix.dirname(relative), m[1]));
    assert.equal(new URL(m[1], url).pathname, '/tinderbox/' + resolved);
    assert.ok(fs.existsSync(path.join(base, resolved))); if (/\.m?js$/.test(resolved)) visit(resolved);
  }
}
visit('assets/art/medicine-pickups/index.js');
const manifest = JSON.parse(fs.readFileSync('assets/art/medicine-pickups/manifest.json'));
for (const record of [...manifest.runtimeFiles, ...manifest.dependencies]) {
  assert.equal(sha(fs.readFileSync(record.path, 'utf8').replace(/\r\n/g, '\n')), record.sha256);
  assert.equal(sha(fs.readFileSync(path.join(base, record.path))), record.sha256);
}
const T = await import(pathToFileURL(path.join(base, 'src/runtime/three.js')));
const {createMedicinePickups} = await import(pathToFileURL(path.join(base, 'assets/art/medicine-pickups/index.js')));
const m = createMedicinePickups(T);
try {
  m.update(['powder', 'healing', 'inversion'].map((kind, i) => ({id: kind, kind, x: i, y: 2, radius: .22, consumed: false})));
  assert.equal(m.root.children.length, 3); m.update([]); assert.equal(m.root.children.length, 0);
} finally { m.dispose(); }
const build = JSON.parse(fs.readFileSync('dist/build-manifest.json'));
assert.ok(!build.files.some(f => /^(?:docs|art|workbenches|artifacts)\//.test(f.path)));
const report = {passed: true, method: 'Packaged factory instantiated with packaged host Three; static URL resolution under /tinderbox/; no HTTP server', modules: [...seen], runtimeAndDependencyHashes: 'pass', files: build.files.length, bytes: build.files.reduce((n,f)=>n+f.bytes,0), privateAuthoringAndEvidenceExcluded: true, browserAcceptance: 'pending combined review'};
fs.writeFileSync('artifacts/medicine-pickups/package-check.json', JSON.stringify(report, null, 2) + '\n');
console.log(JSON.stringify(report, null, 2));
