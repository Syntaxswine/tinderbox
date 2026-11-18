// The one authorized pair session. Never call this directly or replay it.
import fs from 'node:fs';
import assert from 'node:assert/strict';
import {createHash} from 'node:crypto';
import {createRegionalSourcePilot,createRegionalStockParticipant} from '../../../../src/simulation/regional-source-pilot.js';
import {bindCorniceWallContact,originalContactPatches} from '../../../../src/content/cornice-wall-contact-pilot.js';
const dir='docs/engineering/shared-maps/cornice-wall-contact-v1/',sha=b=>createHash('sha256').update(b).digest('hex'),raw=fs.readFileSync(dir+'input.json'),input=JSON.parse(raw),source=JSON.parse(fs.readFileSync(dir+'source-checks.json')),launch=JSON.parse(fs.readFileSync(dir+'native-launch.json'));
assert.equal(source.passed,true);assert.equal(sha(raw),source.inputSha256);assert.equal(launch.inputSha256,source.inputSha256);assert.ok(Date.now()<=Date.parse(launch.deadline));assert.equal(JSON.parse(fs.readFileSync(dir+'focused-passed.json')).exitCode,0);
const result={version:1,authority:input.authority,inputSha256:sha(raw),startedAt:new Date().toISOString(),status:'running',phase:'before-producer',pairValidationSessions:1,nativeCompilerCalls:0,originalNonRoofRegionalCompilations:0,originalRoofCompilations:0,fullNewYorkDiagnostics:0,worldTrials:0,worldSteps:0,stockPublications:0,rendererRuns:0,builds:0,sourceExpansionsThisSession:0,regions:[],controls:{},cleanup:null};
const save=()=>fs.writeFileSync(dir+'native-result.json',JSON.stringify(result,null,2)+'\n');save();
let producer,reader,pilot;const receipts=[];
try{
  producer=createRegionalSourcePilot(input.producerInput);reader=createRegionalStockParticipant(producer);
  for(const side of ['parent','child']){assert.ok(Date.now()<=Date.parse(launch.deadline));assert.ok(result.nativeCompilerCalls<2);const end=input.proof.ends[side],descriptor=producer.region(end.ownerId,end.regionMin);result.phase='compile-'+side;result.nativeCompilerCalls++;result.originalNonRoofRegionalCompilations++;save();
    const receipt=producer.compile(descriptor);receipts.push(receipt);result.regions.push({side,descriptor,trace:receipt.trace,nativeQuantity:receipt.nativeQuantity,certificate:receipt.certificate,boundaryIds:[...receipt.scene.index.surfaces.keys()]});
  }
  assert.equal(producer.diagnostics().nativeCalls,2);result.phase='authenticated-contact-controls';save();
  const slices=receipts.map(r=>reader.slice(r)),payloads=slices.map(s=>reader.inspect(s));
  pilot=bindCorniceWallContact({parts:input.parts,proof:input.proof,reader,slices});const binding=pilot.binding(),entries=payloads.flatMap(p=>p.entries),fixedIds=[binding.parent.nativeRecordId,binding.child.nativeRecordId];
  const unrelated=entries.find(e=>e.record.sourceSurfaceId===binding.parent.sourceSurfaceId&&!fixedIds.includes(e.record.id));assert.ok(unrelated,'A real neighboring wall record must remain available');
  result.binding=binding;result.receiptEntries=payloads.map(p=>({ownerId:p.ownerId,parts:p.parts,entries:p.entries.map(e=>({cell:e.cell,id:e.record.id,sourceSurfaceId:e.record.sourceSurfaceId,nativePartId:e.record.nativePartId,closedShape:e.record.closedShape??null,trianglesSha256:sha(JSON.stringify(e.record.triangles)),solidTrianglesSha256:sha(JSON.stringify(e.record.solidTriangles??null))}))}));
  const intact=pilot.evaluate({revision:0}),parentRetired=pilot.evaluate({revision:1,retireRecords:[binding.parent.nativeRecordId]}),childRetired=pilot.evaluate({revision:1,retireRecords:[binding.child.nativeRecordId]}),unrelatedRetired=pilot.evaluate({revision:1,retireRecords:[unrelated.record.id]});
  assert.equal(intact.live,true);assert.equal(parentRetired.live,false);assert.equal(childRetired.live,false);assert.equal(unrelatedRetired.live,true);for(const r of [intact,parentRetired,childRetired,unrelatedRetired])assert.deepEqual(r.core.supportedIds,[]);assert.equal(pilot.binding(),binding);
  assert.throws(()=>bindCorniceWallContact({parts:input.parts,proof:input.proof,reader,slices:[{...slices[0]},slices[1]]}),/Unknown\/foreign\/stale/);assert.throws(()=>pilot.evaluate({revision:2,retireRecords:['invented-native-id']}),/authenticated local retirement/);
  const w=entries.find(e=>e.record.id===binding.parent.nativeRecordId),original=input.parts.find(p=>p.id===binding.parent.partId).triangles[10],patches=originalContactPatches(w.record.solidTriangles,original),mapped=new Set(patches.map(p=>p.nativePrimitive)),originalX=new Set(input.parts[0].triangles.flat().map(v=>v[0])),cutCaps=w.record.solidTriangles.flatMap((t,i)=>t.every(v=>v[0]===t[0][0])&&!originalX.has(t[0][0])?[i]:[]);
  assert.ok(cutCaps.length);assert.ok(cutCaps.every(i=>!mapped.has(i)));result.controls={intact,parentRetired,childRetired,unrelatedRetired,unrelatedRecordId:unrelated.record.id,nearbySurvivorExistsAfterBoundRetirement:true,frozenBindingUnchanged:true,forgedSliceRejected:true,unknownRetirementRejected:true,generatedCutCapNativePrimitives:cutCaps,selectedOriginalFaceNativePrimitives:[...mapped],generatedCutCapsRejected:true,noGroundingClaim:true};
  assert.equal(reader.diagnostics().retainedStockStates,0);result.status='passed';
}catch(error){result.status='failed';result.error={name:error.name,message:error.message,stack:error.stack};process.exitCode=1;
}finally{
  pilot?.dispose();reader?.dispose({advance:false});for(const receipt of receipts)receipt.dispose();producer?.dispose();result.nativeCompilerCalls=producer?.diagnostics().nativeCalls??result.nativeCompilerCalls;result.cleanup={producer:producer?.diagnostics()??null,reader:reader?.diagnostics()??null,receiptsDisposed:receipts.length,helpers:[],ports:[]};result.endedAt=new Date().toISOString();save();console.log(JSON.stringify({status:result.status,pairValidationSessions:1,nativeCompilerCalls:result.nativeCompilerCalls,fullNewYorkDiagnostics:0,error:result.error?.message,binding:result.binding}));
}
