import fs from 'node:fs';
import path from 'node:path';
import assert from 'node:assert/strict';
import {execFileSync} from 'node:child_process';
import {createHash} from 'node:crypto';
const sourceIndex=process.argv.indexOf('--nautilus-source');if(sourceIndex<0)throw Error('Pass --nautilus-source with a read-only Git checkout containing the pinned Nautilus commit.');
const sourceRoot=process.argv[sourceIndex+1],record=JSON.parse(fs.readFileSync('art/source/gross-housing-v1/nautilus-contract.json','utf8'));
const source=execFileSync('git',['show',record.commit+':'+record.contractPath],{cwd:sourceRoot}),contract=await import('data:text/javascript;base64,'+source.toString('base64'));
assert.equal(contract.WALL_RUN_FEATURE,record.feature);assert.equal(contract.WALL_KIT.panel,1);assert.equal(contract.WALL_KIT.height,2);assert.equal(contract.WALL_KIT.thickness,.16);assert.equal(contract.WALL_KIT.floorSpacing,2.12);
const directory='assets/art/gross-housing-v1/nautilus-traces',results=[];let panels=0,cuts=0;
for(const file of fs.readdirSync(directory).filter(f=>f.endsWith('.json'))){
 const trace=JSON.parse(fs.readFileSync(path.join(directory,file),'utf8'));assert.deepEqual(contract.wallRunErrors(trace,24),[],file);
 assert.throws(()=>contract.assertMapCapabilities(trace,[]));contract.assertMapCapabilities(trace,[record.feature]);
 let length=0;for(const run of trace.wallRuns.segments){
  const parts=contract.wallPanels(run),measure=contract.measureWallRun(run);length+=measure.length;panels+=parts.length;
  assert(Math.abs(parts.reduce((s,p)=>s+p.size[0],0)-measure.length)<1e-7);
  for(const p of parts){assert.equal(p.size[1],2);assert.equal(p.size[2],.16);assert(p.size[0]>0&&p.size[0]<=1+1e-7);assert(Math.abs(p.center[1]-(run.z*2.12+1))<1e-7);if(p.size[0]<1-1e-7)cuts++;}
 }
 assert(trace.wallRuns.artistOpenings.every(o=>o.clearWidth===1&&o.clearHeight<=1.65));
 results.push({asset:trace.sourceAssetId,segments:trace.wallRuns.segments.length,openings:trace.wallRuns.artistOpenings.length,levels:trace.levels,lengthMetres:length});
}
assert.equal(results.length,13);const evidence={passed:true,source:{...record,contractSha256:createHash('sha256').update(source).digest('hex')},traces:results,panels,cuts,originalPanelMaxWidthMetres:1,allAperturesRemainSeparate:true,nautilusImported:false};
fs.writeFileSync('docs/art/gross-housing-v1/nautilus-compatibility.json',JSON.stringify(evidence,null,2)+'\n');console.log(JSON.stringify({passed:true,traces:13,panels,cuts,contractCommit:record.commit},null,2));