import fs from 'node:fs';
import path from 'node:path';
import {createHash} from 'node:crypto';
const root = path.resolve('dist');
const manifest = JSON.parse(fs.readFileSync(path.join(root,'build-manifest.json'),'utf8'));
const fail = message => { throw Error(message); };
for (const file of manifest.files) {
  const component=(manifest.moduleRuntimeFiles||[]).includes(file.path)&&/^(?:workbenches\/(?:furnished-house|bell-and-alder-sandbox|catalogue-modular)\/|workbenches\/bell-and-alder-closing\/(?:visibility|smoke)\.js$|art\/source\/(?:furnished-house|bell-and-alder-sandbox|bell-and-alder-closing|catalogue-modular)\/)/.test(file.path)&&/\.(?:js|json)$/.test(file.path);
  if (!component&&!/^(?:index\.html|\.nojekyll|\.tinderbox-build|src\/|assets\/|vendor\/)/.test(file.path)) fail('Unexpected public path: '+file.path);
  const target = path.resolve(root,file.path);
  if (!target.startsWith(root+path.sep)) fail('Distribution escaped its root');
  const bytes = fs.readFileSync(target);
  if (bytes.length!==file.bytes || createHash('sha256').update(bytes).digest('hex')!==file.sha256) fail('Build bytes changed: '+file.path);
  if (!/\.(?:html|css|js)$/.test(file.path) || file.path.startsWith('vendor/')) continue;
  const text = bytes.toString('utf8');
  if (/(?:file:\/\/|[A-Z]:\\Users\\|localhost|127\.0\.0\.1)/i.test(text)) fail('Local runtime path in '+file.path);
  const references = [
    ...text.matchAll(/(?:\bfrom\s*|\bimport\s*\(\s*|\bimport\s*)['"](\.[^'"]+)['"]/g),
    // Only import.meta.url establishes a module-relative resource. Asset-base
    // URLs are checked by their feature's packaged HTTP smoke instead.
    ...text.matchAll(/new URL\(\s*['"](\.[^'"]+)['"]\s*,\s*import\.meta\.url\b/g),
    ...text.matchAll(/(?:src|href)="([^"#]+)"/g),
    ...(/\.(?:css|html)$/.test(file.path)?text.matchAll(/url\(['"]?([^'"\)]+)['"]?\)/g):[])
  ];
  for (const [,reference] of references) {
    if (/^(?:data:|#)/.test(reference) || reference.includes("' +")) continue;
    if (/^(?:\/|https?:)/.test(reference)) fail('Nonrelative game resource: '+reference);
    const dependency = path.resolve(path.dirname(target),reference.split(/[?#]/)[0]);
    if (!dependency.startsWith(root+path.sep) || !fs.existsSync(dependency)) fail('Missing packaged resource: '+file.path+' -> '+reference);
  }
}
const catalogueManifest=path.join(root,'workbenches/catalogue-modular/scene-data.json');
if(fs.existsSync(catalogueManifest)){
  const resolveResource=(base,reference)=>{
    if(typeof reference!=='string'||!reference||/^(?:\/|[a-z]+:)/i.test(reference))fail('Nonrelative Catalogue data resource: '+reference);
    const target=path.resolve(path.dirname(base),reference.split(/[?#]/)[0]);if(!target.startsWith(root+path.sep)||!fs.existsSync(target))fail('Missing Catalogue data resource: '+reference);return target;
  };
  for(const instance of JSON.parse(fs.readFileSync(catalogueManifest)).instances){
    const component=resolveResource(catalogueManifest,instance.source),data=JSON.parse(fs.readFileSync(component));
    for(const material of data.render?.materials||[])if(material.texture)resolveResource(component,material.texture);
  }
}
console.log(`PASS: ${manifest.files.length} packaged files match their hashes; production resources resolve at a nested project URL.`);
