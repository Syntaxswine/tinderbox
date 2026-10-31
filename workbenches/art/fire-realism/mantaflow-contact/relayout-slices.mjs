/** Layout-only regeneration from the existing exact numeric slice dossier. */
import fs from 'node:fs';
import path from 'node:path';
import vm from 'node:vm';
import {fileURLToPath} from 'node:url';
import {execFileSync} from 'node:child_process';
import {createHash} from 'node:crypto';
import assert from 'node:assert/strict';
const here=path.dirname(fileURLToPath(import.meta.url)),folder=path.join(here,'diagnostic-slices'),baseline='bdc8c18bee986bc6a846d996bea3a74a45466be7',relative='workbenches/art/fire-realism/mantaflow-contact/diagnostic-slices/slices.json',sha=b=>createHash('sha256').update(b).digest('hex');
const old=JSON.parse(execFileSync('git',['show',baseline+':'+relative],{maxBuffer:1024*1024})),report=JSON.parse(fs.readFileSync(path.join(folder,'slices.json'))),withoutPin=data=>{const copy=structuredClone(data);delete copy.plotScriptSha256;return copy;};assert.deepEqual(withoutPin(report),withoutPin(old));
const source=fs.readFileSync(path.join(here,'plot-raw-slices.mjs'),'utf8'),start=source.indexOf('const color='),end=source.indexOf('\nfs.mkdirSync(output);');assert(start>0&&end>start);
// Reuse only the trusted scientific layout/color functions; do not rerun the
// canonical simulation, import any asset factory or read/change raw cache data.
const figure=vm.runInNewContext(source.slice(start,end)+';figure',{source:{manifestSha256:report.rawManifestSha256},nx:report.grid.resolution[0],ny:report.grid.resolution[1]});
for(const phase of report.phases)fs.writeFileSync(path.join(folder,'phase-'+String(phase.nativeFrame).padStart(3,'0')+'.svg'),figure(phase));
report.plotScriptSha256=sha(Buffer.from(source));assert.deepEqual(withoutPin(report),withoutPin(old));fs.writeFileSync(path.join(folder,'slices.json'),JSON.stringify(report)+'\n');
const files=fs.readdirSync(folder).filter(p=>p!=='inventory.json').sort().map(name=>{const b=fs.readFileSync(path.join(folder,name));return{path:name,bytes:b.length,sha256:sha(b)};});fs.writeFileSync(path.join(folder,'inventory.json'),JSON.stringify({version:1,scope:report.status,files},null,2)+'\n');
const rows=[0,1,2].map(row=>({row,top:146+row*374,titleBaseline:146+row*374-13,xAxisBaseline:146+row*374+288+37})),gaps=rows.slice(1).map((row,i)=>(row.titleBaseline-16)-(rows[i].xAxisBaseline+3));assert(gaps.every(gap=>gap>=16));assert(1262-12-(rows[2].xAxisBaseline+3)>=16);assert(1282+4<1300);
const evidence={version:1,status:'layout-only-numerical-dossier-unchanged',baselineCommit:baseline,oldCanvas:[1100,1220],newCanvas:[1100,1300],oldRowPitch:344,newRowPitch:374,oldFirstAxisAndNextTitleBaselines:[471,477],newFirstAxisAndNextTitleBaselines:[471,507],fontBoxEstimatedGaps:gaps,renderedLayoutApproval:'Pending root browser review; source font-box estimates are not a pixel pass',rows,numericalAndClockDossierSha256:sha(JSON.stringify(withoutPin(report))),all41472NumericalValuesAndClocksUnchanged:true,rawManifestSha256:report.rawManifestSha256,newScriptSha256:report.plotScriptSha256,originalQACohortUntouched:true,runtimeOrBakeChanges:false};fs.writeFileSync(path.join(here,'evidence/slice-layout-correction.json'),JSON.stringify(evidence,null,2)+'\n');console.log(JSON.stringify(evidence));
