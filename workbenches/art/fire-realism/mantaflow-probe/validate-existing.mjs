/** Finite Node replay only: no Blender, subprocess, new bake or input writes. */
import fs from 'node:fs';
import path from 'node:path';
import crypto from 'node:crypto';
import assert from 'node:assert/strict';
import {verifyProbe} from './reader.mjs';
import {adapterProof} from './blender-mesh-adapter.mjs';
const original=JSON.parse(fs.readFileSync(new URL('./original-inputs.json',import.meta.url),'utf8'));
const manifestPath=path.resolve(process.argv[2]??'');if(!process.argv[2])throw Error('Usage: node validate-existing.mjs ORIGINAL/export-manifest.json [--report NEW-REPORT.json]');
const root=path.dirname(manifestPath),sha=b=>crypto.createHash('sha256').update(b).digest('hex');
function checkOriginals(){
  for(const [name,expected]of Object.entries(original)){
    const resolved=path.resolve(root,name);if(!resolved.startsWith(root+path.sep))throw Error('Original input path escaped');
    const bytes=fs.readFileSync(resolved);assert.equal(bytes.length,expected.bytes,name+' size changed');assert.equal(sha(bytes),expected.sha256,name+' hash changed');
  }
}
const startedAt=new Date().toISOString();checkOriginals();
assert.throws(()=>verifyProbe(manifestPath),/Actual mesh\/scalar coordinate alignment failed/,'The initial raw-coordinate failure must remain reproducible');
const result=verifyProbe(manifestPath,{meshAdapter:adapterProof.id});checkOriginals();
const report={version:1,status:'source-backed-existing-data-adapter-checks-pass',scope:'Stage1 authoring/review data checks only; architect decides acceptance. Not production integration, a new bake, fluid quality acceptance or cost evidence.',startedAt,completedAt:new Date().toISOString(),newBlenderInvocations:0,newHelpers:0,initialFailureReproduced:true,originalInputFilesVerifiedBeforeAndAfter:Object.keys(original).length,originalInputBytes:Object.values(original).reduce((s,x)=>s+x.bytes,0),allOriginalInputsUnchanged:true,sourceProof:adapterProof.sourceProof,result,remainingApproximation:'The exact modifier offset is removed algebraically. OpenVDB contour vertices are approximate and still have nonzero trilinear residuals; values/percentiles/maxima are reported without fitting a shift or moving scalars.'};
if(process.argv[3]){
  if(process.argv[3]!=='--report'||!process.argv[4])throw Error('Only --report NEW-REPORT.json is supported');
  const dest=path.resolve(process.argv[4]);if(fs.existsSync(dest))throw Error('Refuse to overwrite existing evidence report');fs.writeFileSync(dest,JSON.stringify(report,null,2)+'\n');
}
console.log(JSON.stringify(report,null,2));
