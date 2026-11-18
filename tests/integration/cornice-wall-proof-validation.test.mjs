import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import {proveCorniceWallContact,bindCorniceWallContact} from '../../src/content/cornice-wall-contact-pilot.js';
const historical=JSON.parse(fs.readFileSync('docs/engineering/shared-maps/cornice-wall-contact-v1/input.json')),fixture=JSON.parse(fs.readFileSync('docs/engineering/shared-maps/cornice-wall-proof-validation-v1/ui-fixture.json'));
const sourceInput=()=>structuredClone({parts:historical.parts,surfaces:historical.producerInput.data.surfaces,region:historical.region,grid:historical.grid});
function seam(){
  const tokens=[Object.freeze({fixture:0}),Object.freeze({fixture:1})],payloads=new WeakMap();let originalId,neighborId;
  for(const [i,side]of ['parent','child'].entries()){const end=fixture.proof.ends[side],part=fixture.parts.find(p=>p.id===end.partId),face=[part.triangles[end.primitive]],record={id:end.sourceId+'@'+end.sourceCell.join(','),sourceSurfaceId:end.sourceId,nativePartId:end.partId,sourceCarrierId:end.ownerId,triangles:face,solidTriangles:face},entries=[{cell:end.sourceCell,record}];
    if(side==='parent'){originalId=record.id;const cell=[66,7,52];neighborId=end.sourceId+'@'+cell.join(',');entries.push({cell,record:{...record,id:neighborId}});}
    payloads.set(tokens[i],{epoch:0,sourceRevision:fixture.sourceRevision,ownerId:end.ownerId,entries});
  }
  return {parts:structuredClone(fixture.parts),slices:tokens,reader:Object.freeze({context:()=>({generation:0,sourceRevision:fixture.sourceRevision,grid:fixture.grid}),inspect(token){if(!payloads.has(token))throw Error('Foreign synthetic token');return payloads.get(token);}}),originalId,neighborId};
}

test('UI regression: altered parent sourceCell cannot retarget the immutable original binding',()=>{
  const f=seam(),proof=structuredClone(fixture.proof);proof.ends.parent.sourceCell=[66,7,52];let pilot,error;
  try{pilot=bindCorniceWallContact({...f,proof});}catch(e){error=e;}
  try{if(pilot)console.log(JSON.stringify({syntheticCellRetarget:{boundParent:pilot.binding().parent,liveAfterOriginalRetirement:pilot.evaluate({revision:1,retireRecords:[f.originalId]}).live,privateProducerAuthenticationExercised:false,nativeCompilerCalls:0}}));assert.ok(error&&/validated original contact proof/.test(error.message),'Altered proof must reject before neighboring record selection');}finally{pilot?.dispose();}
});

test('validated original source proof keeps the valid local contact and exact retirement controls',()=>{
  const f=seam(),proof=proveCorniceWallContact(sourceInput()),pilot=bindCorniceWallContact({...f,proof});try{
    assert.equal(pilot.binding().parent.nativeRecordId,f.originalId);assert.deepEqual(pilot.binding().parent.cell,[67,7,52]);assert.equal(pilot.evaluate({revision:0}).live,true);assert.equal(pilot.evaluate({revision:1,retireRecords:[f.originalId]}).live,false);assert.equal(pilot.evaluate({revision:1,retireRecords:[f.neighborId]}).live,true);assert.deepEqual(pilot.binding().anchors,[]);
    assert.deepEqual(JSON.parse(JSON.stringify(proof)),historical.proof,'Current source-derived proof values equal the saved correct native-run input');
  }finally{pilot.dispose();}
});

test('issued endpoint tuple is immutable and caller-frozen copied metadata has no issuance authority',()=>{
  const proof=proveCorniceWallContact(sourceInput());assert.ok(Object.isFrozen(proof)&&Object.isFrozen(proof.ends.parent)&&Object.isFrozen(proof.ends.parent.sourceCell));assert.throws(()=>{proof.ends.parent.sourceCell[0]=66;},TypeError);
  const changes=[p=>{p.ends.parent.ownerId='different-owner';},p=>{p.ends.parent.partId='different-part';},p=>{p.ends.parent.globalPartIndex=0;},p=>{p.ends.parent.component=1;},p=>{p.ends.parent.primitive=11;},p=>{p.ends.parent.channel='surface';},p=>{p.direction='symmetric-structural';},p=>{p.ends.parent.sourceCell=[66,7,52];},p=>{p.ends.parent.projection[0]=33.25;}];
  for(const change of changes){const p=structuredClone(proof);change(p);Object.freeze(p);let pilot;try{assert.throws(()=>{pilot=bindCorniceWallContact({...seam(),proof:p});},/validated original contact proof/);}finally{pilot?.dispose();}}
});

test('source validation captures owned original input and rejects changed parts at binding',()=>{
  const params=sourceInput(),proof=proveCorniceWallContact(params);params.parts[0].globalPartIndex=0;params.surfaces[0].normal[0]=1;params.grid.origin[0]=10;
  let wrong;try{assert.throws(()=>{wrong=bindCorniceWallContact({...seam(),parts:params.parts,proof});},/validated original contact proof/);}finally{wrong?.dispose();}
  const valid=bindCorniceWallContact({...seam(),proof});try{assert.equal(valid.evaluate({revision:0}).live,true);assert.deepEqual(valid.binding().parent.cell,[67,7,52]);}finally{valid.dispose();}
});

test('serialized proof metadata must be revalidated from original source definitions before binding',()=>{
  const serialized=JSON.parse(JSON.stringify(proveCorniceWallContact(sourceInput())));let invalid;try{assert.throws(()=>{invalid=bindCorniceWallContact({...seam(),proof:serialized});},/validated original contact proof/);}finally{invalid?.dispose();}
  const restored=proveCorniceWallContact(sourceInput()),valid=bindCorniceWallContact({...seam(),proof:restored});try{assert.equal(valid.evaluate({revision:0}).live,true);}finally{valid.dispose();}
});
