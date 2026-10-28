import fs from 'node:fs';
import path from 'node:path';
import {createHash} from 'node:crypto';
const root = path.resolve('dist');
const manifest = JSON.parse(fs.readFileSync(path.join(root,'build-manifest.json'),'utf8'));
const fail = message => { throw Error(message); };
for (const file of manifest.files) {
  if (!/^(?:index\.html|\.nojekyll|\.tinderbox-build|src\/|assets\/|vendor\/)/.test(file.path)) fail('Unexpected public path: '+file.path);
  const target = path.resolve(root,file.path);
  if (!target.startsWith(root+path.sep)) fail('Distribution escaped its root');
  const bytes = fs.readFileSync(target);
  if (bytes.length!==file.bytes || createHash('sha256').update(bytes).digest('hex')!==file.sha256) fail('Build bytes changed: '+file.path);
  if (!/\.(?:html|css|js)$/.test(file.path) || file.path.startsWith('vendor/')) continue;
  const text = bytes.toString('utf8');
  if (/(?:file:\/\/|[A-Z]:\\Users\\|localhost|127\.0\.0\.1)/i.test(text)) fail('Local runtime path in '+file.path);
  const references = [
    ...text.matchAll(/(?:\bfrom\s*|\bimport\s*)['"](\.[^'"]+)['"]/g),
    // Only import.meta.url establishes a module-relative resource. Asset-base
    // URLs are checked by their feature's packaged HTTP smoke instead.
    ...text.matchAll(/new URL\(\s*['"](\.[^'"]+)['"]\s*,\s*import\.meta\.url\b/g),
    ...text.matchAll(/(?:src|href)="([^"#]+)"/g),
    ...text.matchAll(/url\(['"]?([^'"\)]+)['"]?\)/g)
  ];
  for (const [,reference] of references) {
    if (/^(?:data:|#)/.test(reference) || reference.includes("' +")) continue;
    if (/^(?:\/|https?:)/.test(reference)) fail('Nonrelative game resource: '+reference);
    const dependency = path.resolve(path.dirname(target),reference.split(/[?#]/)[0]);
    if (!dependency.startsWith(root+path.sep) || !fs.existsSync(dependency)) fail('Missing packaged resource: '+file.path+' -> '+reference);
  }
}
console.log(`PASS: ${manifest.files.length} packaged files match their hashes; production resources resolve at a nested project URL.`);
