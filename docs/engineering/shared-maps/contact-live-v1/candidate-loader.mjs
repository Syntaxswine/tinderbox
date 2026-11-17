// Archive-only loader. Never imported by the game, browser harness or build.
// Node v24.15.0 API: https://nodejs.org/download/release/v24.15.0/docs/api/module.html#moduleregisterhooksoptions
import fs from 'node:fs';
import path from 'node:path';
import assert from 'node:assert/strict';
import {createHash} from 'node:crypto';
import {execFileSync} from 'node:child_process';
import {fileURLToPath,pathToFileURL} from 'node:url';
import {registerHooks} from 'node:module';

const archive=path.dirname(fileURLToPath(import.meta.url)),project=fs.realpathSync(path.resolve(archive,'../../../..'));
const pins=JSON.parse(fs.readFileSync(path.join(archive,'candidate-loader-pins.json'))),hash=b=>createHash('sha256').update(b).digest('hex'),lf=p=>fs.readFileSync(p,'utf8').replace(/\r\n/g,'\n');
assert.equal(typeof registerHooks,'function','The archived test loader needs Node 24.13.1 or newer');
assert.equal(hash(fs.readFileSync(path.join(archive,'experimental-checkpoint-manifest.json'))),pins.experimentalManifestSha256);
for(const p of pins.payload){const bytes=fs.readFileSync(path.join(archive,p.path));assert.equal(bytes.length,p.bytes,p.path);assert.equal(hash(bytes),p.sha256,p.path);}
assert.equal(hash(lf(path.join(project,'src/simulation/source-support.js'))),pins.baselineSupportLfSha256,'Active runtime remains accepted 55cd/822');
assert.equal(hash(lf(path.join(archive,'candidate-payload/src/simulation/source-support.js'))),pins.candidateSupportLfSha256);
for(const p of pins.nativeFiles)assert.equal(hash(lf(path.join(project,p.path))),p.lfSha256,p.path);
for(const p of pins.packages){const bytes=fs.readFileSync(path.join(project,p.path));assert.equal(bytes.length,p.bytes,p.path);assert.equal(hash(bytes),p.sha256,p.path);}
assert.equal(execFileSync('git',['diff','--name-only',pins.wholeTreeReference,'--','src','assets','art','vendor','workbenches'],{cwd:project,encoding:'utf8',windowsHide:true}).trim(),'','Every other accepted production/source byte stays frozen');

const graph='src/simulation/source-support.js',tests=['tests/integration/source-contact-reach.test.mjs','tests/integration/source-support.test.mjs'];
const canonical=p=>pathToFileURL(path.join(project,p)).href,payload=p=>pathToFileURL(path.join(archive,'candidate-payload',p)).href;
const parents=new Map([graph,...tests].map(p=>[payload(p),canonical(p)])),testParents=new Map(tests.map(p=>[payload(p),canonical(p)]));
if(process.argv.includes('--check')){
 console.log(JSON.stringify({archiveOnly:true,acceptedRuntime:pins.acceptedRuntime,candidateSupportLfSha256:pins.candidateSupportLfSha256,payloadPins:pins.payload.length,nativePins:pins.nativeFiles.length,packagePins:pins.packages.length,passed:true}));
}else{
 const hooks=registerHooks({
  resolve(specifier,context,nextResolve){
   const original=parents.get(context.parentURL),target=original&&/^\.{1,2}\//.test(specifier)?new URL(specifier,original).href:specifier,result=nextResolve(target,context);
   return result.url===canonical(graph)?{...result,url:payload(graph)}:result;
  },
  load(url,context,nextLoad){
   const loaded=nextLoad(url,context),original=testParents.get(url);
   return original?{...loaded,source:fs.readFileSync(fileURLToPath(url),'utf8').replaceAll('import.meta.url',JSON.stringify(original))}:loaded;
  }
 });
 process.once('exit',()=>hooks.deregister());
}
