// Metadata/ordinary-query selection only. Does not call compile().
import fs from 'node:fs';
import assert from 'node:assert/strict';
import {createRegionalSourcePilot} from '../../../../src/simulation/regional-source-pilot.js';
import {sweptCylinderClear} from '../../../../src/runtime/collision.js';
import {loadRoof,roof,out,sha} from './roof-input.mjs';
if(fs.existsSync(out+'roof-launch.json')||fs.existsSync(out+'roof-plan.json'))throw Error('Preserve the original roof plan');
const input=loadRoof(),producer=createRegionalSourcePilot(input.producerInput);try{
  const groupingPath='docs/engineering/shared-maps/bounded-source-regions-v1/grouping.json',groupRaw=fs.readFileSync(groupingPath),grouping=JSON.parse(groupRaw).cases.find(c=>c.sizeMetres===2),nonempty=new Map(grouping.regions.map(r=>[r.cellRange.min.join(','),r]));
  const catalogue=producer.regions(roof),first=grouping.regions[0],last=grouping.regions.at(-1),choices=[first,last].map(r=>({kind:'nonempty',min:r.cellRange.min,expectedFragments:r.nativeFragments,orderedIdsSha256:r.orderedOriginalIdsSha256}));
  let examined=0,empty=null;for(const d of catalogue){if(nonempty.has(d.cellMin.join(',')))continue;examined++;const centre=d.cellMin.map((v,i)=>(v+d.span[i]/2)*d.pitch[i]+d.origin[i]),p={x:centre[0],y:centre[2]};
    if(!sweptCylinderClear(p,p,.02,centre[1]-.02,centre[1]+.02,{triangles:input.query.sources[0].solidTriangles,closed:true})){empty={kind:'empty',min:d.cellMin,expectedFragments:0,centre,probe:{point:p,radius:.02,minY:centre[1]-.02,maxY:centre[1]+.02},ordinaryColdClear:false};break;}}
  if(!empty){const d=catalogue.find(d=>!nonempty.has(d.cellMin.join(',')));if(d)empty={kind:'empty',min:d.cellMin,expectedFragments:0};}
  if(empty)choices.push(empty);
  assert.equal(producer.diagnostics().nativeCalls,0);assert.equal(catalogue.length,320);assert.equal(new Set(choices.map(r=>r.min.join(','))).size,choices.length);
  const plan={version:1,authority:'3713e72b',activation:'f79a79a90298d5cfaff0f079e7272369bc7ca7d1',base:'e84ed22c43d99177848c6226ad25e8eaea9678e4',purpose:'At most three original roof regions for the disabled receipt bridge only',inputs:input.pins,sourceRevision:input.producerInput.sourceRevision,groupingPin:{path:groupingPath,sha256:sha(groupRaw)},catalogue:320,savedNonempty:grouping.regions.length,emptyCandidatesExamined:examined,emptyAvailable:!!empty,choices,limits:{regionalRoofCompilations:3,wholeRoofCompilations:0,deckCompilations:0,timeoutMs:20000,oldSpaceMiB:512},nativeCompilerCalls:0,worldTrials:0,worldSteps:0};
  fs.writeFileSync(out+'roof-plan.json',JSON.stringify(plan,null,2)+'\n');console.log(JSON.stringify({catalogue:320,choices,emptyCandidatesExamined:examined,nativeCompilerCalls:0}));
}finally{producer.dispose();input.geometry.dispose();}
