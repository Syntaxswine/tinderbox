import fs from 'node:fs';
import path from 'node:path';
import assert from 'node:assert/strict';
import {createHash} from 'node:crypto';
import {fileURLToPath,pathToFileURL} from 'node:url';

const sha=bytes=>createHash('sha256').update(bytes).digest('hex');
const read=relative=>JSON.parse(fs.readFileSync(relative,'utf8'));
const lf=relative=>fs.readFileSync(relative,'utf8').replace(/\r\n/g,'\n');
export async function checkH15Integrated(output){
  const root=fileURLToPath(new URL('../../',import.meta.url));assert.equal(fs.realpathSync('.'),fs.realpathSync(root),'Run from the repository root');
  const destination=path.resolve(output),artifactRoot=path.resolve('artifacts')+path.sep;
  assert.ok(destination.startsWith(artifactRoot),'Separate integration evidence belongs inside artifacts');assert.ok(!fs.existsSync(destination),'Preserve previous results; choose a fresh output directory');fs.mkdirSync(destination,{recursive:true});
  const declared=read('docs/engineering/house-traversal/runtime-integration.json'),checker=declared.originalChecker,referenceRecord=declared.originalReference;
  assert.equal(sha(lf(checker.path)),checker.lfSha256,'Original artist checker must remain immutable');assert.equal(sha(lf(referenceRecord.path)),referenceRecord.lfSha256,'Original artist reference must remain immutable');
  const reference=read(referenceRecord.path),exceptions=new Map(declared.runtimeExceptions.map(row=>[row.path,row]));
  assert.deepEqual([...exceptions.keys()].sort(),['src/runtime/collision.js','workbenches/furnished-house/navigation.js']);
  for(const row of reference.unchangedFiles){
    const exception=exceptions.get(row.path);if(exception)assert.equal(exception.originalLfSha256,row.lfSha256,'Exception must identify the original assertion');
    assert.equal(sha(lf(row.path)),exception?.integratedLfSha256??row.lfSha256,row.path);
  }
  for(const row of declared.additionalRuntime)assert.equal(sha(lf(row.path)),row.integratedLfSha256,row.path);
  for(const row of declared.sourceExports)assert.equal(sha(fs.readFileSync(row.path)),row.sha256,row.path);
  const provenance=read(declared.vendorManifest.path);assert.equal(sha(lf(declared.vendorManifest.path)),declared.vendorManifest.lfSha256);assert.equal(provenance.commit,declared.kernelCommit);assert.deepEqual(provenance.runtimeDependencyClosure,[]);
  for(const row of provenance.files){const bytes=fs.readFileSync(row.installedPath);assert.equal(bytes.length,row.bytes,row.installedPath);assert.equal(sha(bytes),row.sha256,row.installedPath);}
  const integratedReference=structuredClone(reference);for(const row of integratedReference.unchangedFiles)if(exceptions.has(row.path))row.lfSha256=exceptions.get(row.path).integratedLfSha256;
  const original=lf(checker.path),substitutions=[];
  let derived=original;
  function substitute(before,after,purpose){assert.equal(derived.split(before).length-1,1,'Expected one audited substitution: '+purpose);derived=derived.replace(before,after);substitutions.push({purpose,before,after});}
  substitute("reference=read(controlRoot+'reference.json')",'reference='+JSON.stringify(integratedReference),'Only the two explicitly declared runtime hash exceptions; original reference stays on disk');
  substitute('Immutable original/access125 controls, untouched M27/runtime, and identical Bell&Alder','Immutable art controls and Bell&Alder, unchanged M27 and declared native-runtime integration hashes','Name the changed runtime honestly');
  const portable=path.relative(root,destination).replaceAll(path.sep,'/');
  substitute("fs.mkdirSync('docs/art/h15-circulation'","fs.mkdirSync("+JSON.stringify(portable),'Separate output directory');
  substitute("fs.writeFileSync('docs/art/h15-circulation/checks.json'","fs.writeFileSync("+JSON.stringify(portable+'/checks.json'),'Preserve the historical artist receipt');
  const imports=[];derived=derived.replace(/from (['"])(\.{1,2}\/[^'"]+)\1/g,(_,quote,relative)=>{const resolved=new URL(relative,pathToFileURL(path.resolve(checker.path))).href;imports.push({relative,resolved});return 'from '+JSON.stringify(resolved);});assert.equal(imports.length,7,'Only the original relative imports are resolved for in-memory execution');
  const record={version:1,scope:'Explicit combined-source validation. Original checker/reference stay byte-identical; original geometric, physical stop-only and registration assertions execute with exactly two declared runtime hash exceptions. Sliding/provider acceptance is separately measured by the focused and pinned67 controls.',declared,originalLfSha256:sha(original),derivedLfSha256:sha(derived),substitutions,imports:imports.map(({relative})=>relative),historicalReceiptBefore:sha(fs.readFileSync('docs/art/h15-circulation/checks.json'))};
  fs.writeFileSync(path.join(destination,'audit.json'),JSON.stringify(record,null,2)+'\n');
  try{
    await import('data:text/javascript;base64,'+Buffer.from(derived).toString('base64'));
    assert.equal(sha(fs.readFileSync('docs/art/h15-circulation/checks.json')),record.historicalReceiptBefore,'Historical artist receipt unchanged');
    const result=read(path.join(destination,'checks.json'));assert.equal(result.passed,true);assert.equal(result.checks.length,15);assert.equal(result.paths.length,60);assert.equal(result.registration.compared,819);
    fs.writeFileSync(path.join(destination,'result.json'),JSON.stringify({passed:true,checks:result.checks.length,paths:result.paths.length,registration:result.registration,originalCheckerUnchanged:true,originalReferenceUnchanged:true,historicalReceiptUnchanged:true,runtimeExceptions:declared.runtimeExceptions},null,2)+'\n');return result;
  }catch(error){fs.writeFileSync(path.join(destination,'failure.json'),JSON.stringify({passed:false,error:error.stack},null,2)+'\n');throw error;}
}
if(process.argv[1]&&path.resolve(process.argv[1])===fileURLToPath(import.meta.url)){
  const output=process.argv.slice(2).find(a=>a.startsWith('--output='))?.slice(9);assert.ok(output,'An explicit fresh --output=artifacts/... path is required');await checkH15Integrated(output);
}
