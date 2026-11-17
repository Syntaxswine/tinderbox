// One bounded three-region correctness check. Never compiles a whole roof/deck.
import fs from 'node:fs';
import assert from 'node:assert/strict';
import {createRegionalSourcePilot} from '../../../../src/simulation/regional-source-pilot.js';
import {createRegionalReceiptBridge} from '../../../../src/runtime/regional-receipt-bridge.js';
import {triangleArea,EPS} from '../../../../workbenches/furnished-house/geometry.js';
import {loadRoof,roof,out,sha} from './roof-input.mjs';
if(fs.existsSync(out+'roof-result.json'))throw Error('No automatic roof replay');
const result={version:1,authority:'3713e72b',activation:'f79a79a90298d5cfaff0f079e7272369bc7ca7d1',pid:process.pid,startedAt:new Date().toISOString(),complete:false,roofCompilations:0,wholeRoofCompilations:0,deckCompilations:0,worldTrials:0,worldSteps:0,graphRebuilds:0,regions:[],checks:[],firstFailure:null,cleanup:false};
const save=()=>fs.writeFileSync(out+'roof-result.json',JSON.stringify(result,null,2)+'\n'),check=(name,fn)=>{result.current=name;save();fn();result.checks.push({name,passed:true});};
function revive(value){if(!value||typeof value!=='object')return value;if(value.$undefined===true&&Object.keys(value).length===1)return undefined;if(value.$number==='-0'&&Object.keys(value).length===1)return -0;for(const k of Object.keys(value))value[k]=revive(value[k]);return value;}
let input,producer,bridge;const receipts=[];
try{
  save();const plan=JSON.parse(fs.readFileSync(out+'roof-plan.json'));assert.ok(plan.choices.length<=3);input=loadRoof();assert.equal(input.producerInput.sourceRevision,plan.sourceRevision);
  const savedPath='docs/engineering/shared-maps/support-large-proof-v2/reference-blocks.json',raw=fs.readFileSync(savedPath);assert.equal(sha(raw),'bfab707ff646e9dfedfaae3b80d510ac750e4f561335d895c24c4e4cc4d49418');
  const saved=revive(JSON.parse(raw).blocks[3].identity.ownerStates.find(o=>o.id===roof)),original=new Map(saved.native.map(b=>[b.id,b]));
  const iterationPath='docs/engineering/shared-maps/bounded-source-compiler-v1/iterations-forward.jsonl',iterationRaw=fs.readFileSync(iterationPath),iterations=new Map(iterationRaw.toString('utf8').trim().split(/\r?\n/).map(line=>{const r=JSON.parse(line);return [r.min.join(','),r];}));
  result.inputs=[...input.pins,{path:savedPath,sha256:sha(raw)},{path:iterationPath,sha256:sha(iterationRaw)}];
  producer=createRegionalSourcePilot(input.producerInput);bridge=createRegionalReceiptBridge({producer,...input.query});
  check('cold-zero-inventory',()=>{assert.equal(bridge.diagnostics().nativeRecords,0);assert.equal(bridge.state().stockSnapshot.owners[0].state,'cold');assert.equal(producer.diagnostics().nativeCalls,0);});
  let transferred=0,born=0,firstState,firstRefs=[];
  for(const choice of plan.choices){
    assert.ok(result.roofCompilations<3);result.current='compile '+choice.min.join(',');save();
    result.roofCompilations++;const receipt=producer.compile(producer.region(roof,choice.min));receipts.push(receipt);const old=iterations.get(choice.min.join(','));assert.ok(old);
    check('original-records-and-quantity '+choice.min.join(','),()=>{
      assert.equal(receipt.scene.index.surfaces.size,choice.expectedFragments);assert.equal(receipt.nativeQuantity,old.nativeQuantity);assert.deepEqual(receipt.certificate,old.certificate);assert.equal(receipt.trace.visitedCells,old.visitedCells);
      const ids=[...receipt.scene.index.surfaces.keys()];assert.equal(sha(JSON.stringify(ids)),old.orderedOriginalIdsSha256);if(choice.orderedIdsSha256)assert.equal(sha(JSON.stringify(ids)),choice.orderedIdsSha256);
      for(const [id,b]of receipt.scene.index.surfaces){const prior=original.get(id);assert.ok(prior);for(const [key,value]of Object.entries(prior))assert.deepEqual(b[key],value,id+' '+key);
        const f=receipt.scene.fuels.get('fuel:'+id),source=input.producerInput.data.surfaces.find(s=>s.id===b.sourceSurfaceId),area=prior.triangles.reduce((n,t)=>n+triangleArea(t),0),sourceArea=source.triangles.reduce((n,t)=>n+triangleArea(t),0);assert.equal(f.amount,source.fuelAmount*area/sourceArea);assert.equal(f.initial,f.amount);assert.equal(f.boundaryId,id);
      }
    });
    const before=bridge.state(),beforeCount=bridge.diagnostics().nativeRecords,planStage=bridge.prepare({expectedGeneration:before.generation,expectedRevision:before.revision,receipts:[receipt]});
    check('detached-stage '+choice.min.join(','),()=>{assert.equal(bridge.state(),before);assert.equal(bridge.diagnostics().nativeRecords,beforeCount);planStage.validate();});
    const next=planStage.publish();transferred+=receipt.certificate.canonicalQuantity;born+=receipt.nativeQuantity;
    check('borrowed-channels-and-stock '+choice.min.join(','),()=>{
      assert.equal(next.stockSnapshot.owners[0].canonicalMeasured,transferred);assert.equal(next.stockSnapshot.owners[0].nativeBorn,born);assert.equal(next.generation,next.queryView.generation);assert.equal(next.revision,next.queryView.revision);
      const faces=bridge.faces(next,{channel:'solid'});for(const b of receipt.scene.index.surfaces.values()){
        const pieces=faces.filter(p=>p.recordId===b.id);assert.ok(pieces.length);for(const p of pieces){assert.equal(p.record.triangles,b.triangles);assert.equal(p.record.solidTriangles,b.solidTriangles);assert.equal(p.record.bounds,b.bounds);assert.equal(p.record.normal,b.normal);assert.equal(p.record.sourceCarrierId,roof);assert.equal(p.record.transmission,b.transmission);assert.equal(p.record.sheetKey,b.sheetKey);assert.ok(!('heatCells'in p.record));}
      }
      assert.equal(bridge.diagnostics().nativeRecords,beforeCount+choice.expectedFragments);
    });
    if(!firstState){firstState=next;firstRefs=[...receipt.scene.index.surfaces.values()].map(b=>({id:b.id,triangles:b.triangles,solidTriangles:b.solidTriangles}));}
    result.regions.push({kind:choice.kind,min:choice.min,fragments:receipt.scene.index.surfaces.size,fuels:receipt.scene.fuels.size,visitedCells:receipt.trace.visitedCells,canonicalQuantity:receipt.certificate.canonicalQuantity,nativeQuantity:receipt.nativeQuantity,certificateSha256:sha(JSON.stringify(receipt.certificate)),orderedIdsSha256:sha(JSON.stringify([...receipt.scene.index.surfaces.keys()])),publication:{generation:next.generation,revision:next.revision,nativeRecords:bridge.diagnostics().nativeRecords,claimedCells:bridge.diagnostics().claimedCells}});
  }
  check('distant-original-region-stays-cold',()=>{
    const chosen=new Set(plan.choices.map(c=>c.min.join(','))),far=saved.native.find(b=>{const m=b.id.match(/@(-?\d+),(-?\d+),(-?\d+)$/);return m&&!chosen.has(m.slice(1).map((n,i)=>i===1?+n:Math.floor(+n/4)*4).join(','));});assert.ok(far);
    const a=far.position.map((v,i)=>v-far.normal[i]*.1),b=far.position.map((v,i)=>v+far.normal[i]*.1),hits=bridge.segment(bridge.state(),a,b,{includeEndpoints:true});assert.ok(hits.some(h=>h.surface.id===input.query.sources[0].rayRecord.id));result.distant={originalId:far.id,from:a,to:b,hitIds:hits.map(h=>h.surface.id)};
  });
  check('record-local-retirement-and-held-view',()=>{
    const ids=firstRefs.map(b=>b.id);assert.ok(ids.length>=2);const s=bridge.state(),next=bridge.prepare({expectedGeneration:s.generation,expectedRevision:s.revision,retireRecords:[ids[0]]}).publish(),faces=bridge.faces(next,{channel:'solid'});assert.ok(!faces.some(p=>p.recordId===ids[0]));assert.ok(faces.some(p=>p.recordId===ids[1]));assert.ok(bridge.faces(firstState,{channel:'solid'}).some(p=>p.recordId===ids[0]));
    for(const receipt of receipts)receipt.dispose();for(const ref of firstRefs){const piece=bridge.faces(firstState,{channel:'solid'}).find(p=>p.recordId===ref.id);assert.equal(piece.record.triangles,ref.triangles);assert.equal(piece.record.solidTriangles,ref.solidTriangles);}result.retirement={retired:ids[0],sameCellSurvivors:ids.slice(1),nativeBornUnchanged:next.stockSnapshot.owners[0].nativeBorn===born};
  });
  check('unified-reset-releases-generation-inventory',()=>{const old=bridge.state(),fresh=bridge.reset();assert.equal(fresh.generation,1);assert.equal(fresh.revision,0);assert.equal(bridge.diagnostics().nativeRecords,0);assert.equal(bridge.diagnostics().claimedCells,0);assert.equal(producer.diagnostics().retainedReceipts,0);assert.throws(()=>bridge.faces(old,{channel:'solid'}),/stale/);});
  assert.equal(producer.diagnostics().nativeCalls,result.roofCompilations);assert.equal(input.geometry.metrics().nativeSourceExpansions,1);assert.equal(input.geometry.metrics().renderExpansions,0);result.sourceMetrics=input.geometry.metrics();result.complete=true;
}catch(error){result.firstFailure={at:result.current,message:error.message,stack:error.stack};process.exitCode=1;}
finally{bridge?.dispose();producer?.dispose();input?.geometry.dispose();result.cleanup=(!bridge||bridge.diagnostics().closed&&bridge.diagnostics().heldStates===0&&bridge.diagnostics().query.nativeRecords===0)&&(!producer||producer.diagnostics().retainedReceipts===0);result.endedAt=new Date().toISOString();save();console.log(JSON.stringify({complete:result.complete,roofCompilations:result.roofCompilations,checks:result.checks.length,firstFailure:result.firstFailure,cleanup:result.cleanup}));}
