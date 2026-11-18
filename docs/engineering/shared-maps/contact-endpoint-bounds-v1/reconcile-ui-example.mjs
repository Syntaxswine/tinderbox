// One committed UI representative; two original source owners, no compiler.
import fs from 'node:fs';
import assert from 'node:assert/strict';
import {execFileSync} from 'node:child_process';
import {createHash} from 'node:crypto';
import {createMapSourceGeometry} from '../../../../src/content/map-source-geometry.js';
import {sourceGeometryTriangles} from '../../../../src/content/map-source-shapes.js';
import {prepareOriginalContacts} from '../../../../src/content/original-contact-adapter.js';

const dir='docs/engineering/shared-maps/contact-endpoint-bounds-v1/';
const uiRef='e67235b6e9d87760b1b36d802833de44456b1bd8',uiDir='docs/engineering/shared-maps/other-contact-source-v1/';
const regionId='715ed699e0b9c5185bf38ab4',sha=b=>createHash('sha256').update(b).digest('hex'),pins=[];
if(fs.existsSync(dir+'ui-result.json'))throw Error('One source example already reconciled; do not repeat expansions for packaging');
function git(commit,path,expected){const raw=execFileSync('git',['show',commit+':'+path],{windowsHide:true,maxBuffer:16*1024*1024});if(expected)assert.equal(sha(raw),expected);pins.push({commit,path,bytes:raw.length,sha256:sha(raw)});return JSON.parse(raw);}
const batch=git(uiRef,uiDir+'contacts-proposal.json'),uiPins=git(uiRef,uiDir+'input-pins.json');
assert.equal(pins[1].sha256,batch.inputPinsSha256);assert.equal(batch.runtimeConsumable,false);
assert.equal(batch.representatives[0].regionId,regionId);
const r=batch.regions.find(v=>v.id===regionId),rel=batch.relationships.find(v=>v.id===r.relationship);
assert.equal(r.selector,null);assert.equal(r.status,'source-contact-proposed');assert.equal(rel.direction,'parent-to-child');
const readSource=path=>{const pin=uiPins.sourcePins.find(v=>v.path===path);assert.ok(pin);return git(pin.commit,path,pin.sha256);};
const familyPath='art/source/shared-map-fire-bindings/coverage-family-proposal-v1/relationships.json';
const family=readSource(familyPath),bindings=readSource('art/source/shared-map-fire-bindings/coverage-family-proposal-v1/geometry-bindings.json');
const pointer=r.sourcePointer.split('/'),originalRelation=family.relationships[Number(pointer[2])],original=originalRelation.localRegions[Number(pointer[4])];
assert.equal(originalRelation.id,rel.id);assert.equal(original.id,r.id);assert.equal(original.selector,null);
assert.deepEqual(r.endpointBounds,[original.parentBounds,original.childBounds]);
assert.deepEqual(r.historical,{childWitness:original.childWitness,geometricBearing:original.actualGeometryCertificate.geometricBearing,kind:original.actualGeometryCertificate.proof.kind,parentWitness:original.parentWitness,sourceFace:original.actualGeometryCertificate.proof.sourceFace,worldWitness:original.actualGeometryCertificate.proof.worldWitness});
assert.equal(originalRelation.groundAnchor,false);assert.equal(originalRelation.wholeCarrierRetirement,false);
const runtimePins=JSON.parse(fs.readFileSync('docs/engineering/shared-maps/support-preparation-v1/source-pins.json')).files;
const [index,library]=runtimePins.slice(0,2).map(pin=>{const raw=fs.readFileSync(pin.path);assert.equal(sha(raw),pin.sha256);assert.equal(raw.length,pin.bytes);pins.push({...pin});return JSON.parse(raw);});
assert.equal(runtimePins[0].sha256,uiPins.sourcePins.find(p=>p.path===runtimePins[0].path).sha256);
const f64=values=>{const b=Buffer.alloc(values.length*8);values.forEach((v,i)=>b.writeDoubleLE(v,i*8));return sha(b);};
const box=b=>({min:b.slice(0,3),max:b.slice(3,6)}),matrix=m=>m.length===3?[1,0,0,0,0,1,0,0,0,0,1,0,...m,1]:m;
const slots=[],parts=[],owners=[],selected=[];
for(const side of ['parent','child']){
  const inst=batch.instances[r[side]],gRecord=batch.geometries[inst.geometry],n=inst.globalSourcePartIndex,p=index.parts[n],c=index.carriers[p[2]],m=matrix(p[5]);
  assert.equal(c[0],originalRelation[side+'CarrierId']);assert.equal(c[0],inst.ownerId);assert.equal(p[0],inst.partId);assert.equal(p[0],inst.sourcePartId);assert.equal(p[0],inst.globalSourcePartId);assert.equal(p[2],inst.globalCarrierIndex);assert.deepEqual(c[11],[n]);assert.ok(!p[12]);assert.equal(inst.sourceRange,null);assert.equal(inst.primitiveBase,0);assert.deepEqual(m,inst.emittedWorldMatrix);assert.equal(index.tables.geometries[p[3]],gRecord.id);
  const binding=bindings.carriers[c[0]][0];assert.equal(bindings.carriers[c[0]].length,1);assert.equal(binding.partId,p[0]);assert.equal(binding.sourcePartId,p[0]);assert.equal(binding.sourceRange,null);assert.equal(binding.geometryId,gRecord.id);assert.equal(binding.geometryPath,gRecord.path);assert.deepEqual(binding.matrix,m);assert.equal(binding.sha256,gRecord.rawSha256);
  const g=git(gRecord.commit,gRecord.path,gRecord.rawSha256);assert.deepEqual(g,library.geometries[gRecord.id]);
  assert.deepEqual(inst.canonicalRecipe,{area:c[4],finish:c[17]??null,fuelAmount:c[3],fuelClass:c[2],material:c[1],quantityRule:c[6],thickness:c[5]});assert.equal(inst.role,c[7]);
  const triangles=sourceGeometryTriangles({matrix:m,triangleCount:(g.index?.array.length??g.attributes.position.array.length/3)/3},g),hash=f64(triangles.flat(2));assert.equal(triangles.length,gRecord.originalTriangles);assert.equal(hash,inst.orderedWorldTrianglesFloat64LittleEndianSha256);assert.equal(hash,inst.originalPartWorldTrianglesFloat64LittleEndianSha256);
  const ownerId='new-york::'+c[0];parts.push({id:p[0],ownerId,globalPartIndex:n,role:c[7],triangles});slots[n]={id:p[0],carrierId:ownerId,geometry:gRecord.id,appearance:index.tables.appearances[p[4]],matrix:m,bounds:box(p[6]),physical:!!(p[8]&1),closed:!!(p[8]&2)};
  owners.push({id:ownerId,material:c[1],fuelClass:c[2],fuelAmount:c[3],quantityRule:c[6],role:c[7],level:c[9],bounds:box(c[10]),parts:c[11],...(c[17]?{finish:{fuelClass:c[17][0],amount:c[17][1]}}:{})});
  selected.push({side,instance:inst,geometry:gRecord,originalBinding:binding,verifiedWorldTrianglesSha256:hash});
}
const model={placeId:'new-york',carriers:owners,parts:slots,partById:new Map(slots.filter(Boolean).map(p=>[p.id,p])),carrierById:new Map(owners.map(c=>[c.id,c])),library:{geometries:Object.fromEntries(selected.map(s=>[s.geometry.id,library.geometries[s.geometry.id]]))},metrics:()=>({selectedOwners:2,selectedParts:2})},geometry=createMapSourceGeometry(model);
try{
  const surfaces=owners.flatMap(o=>geometry.sourcesForCarrier(o.id).surfaces),end=(side,i)=>({partId:parts[i].id,ownerId:parts[i].ownerId,globalPartIndex:parts[i].globalPartIndex,role:parts[i].role,component:r.contact.components[i],primitive:r.contact.primitives[i],normal:r.contact.normals[i],selector:original[side+'Bounds']}),contact={id:r.id,relationshipId:rel.id,direction:rel.direction,point:r.contact.point,selector:r.selector,parent:end('parent',0),child:end('child',1),historicalVolume:r.historical};
  const preparation=prepareOriginalContacts({sourceRevision:sha(JSON.stringify(runtimePins)),grid:{origin:[0,0,0],pitch:[.5,1.06,.5]},parts,surfaces,contacts:[contact]});
  try{
    const report=preparation.report(),metrics=geometry.metrics();assert.equal(metrics.nativeSourceExpansions,2);assert.equal(metrics.nativePartTransforms,2);assert.equal(metrics.renderExpansions,0);assert.equal(metrics.transformedQueries,0);
    assert.equal(report.prepared.length+report.rejected.length,1);
    if(report.prepared.length){const proof=preparation.proof(r.id);assert.equal(proof.selector,null);assert.deepEqual(proof.historicalVolume,r.historical);for(const side of ['parent','child'])assert.deepEqual(proof.ends[side].selector,original[side+'Bounds']);}
    else assert.equal(report.rejected[0].reason,'unrepresentable-original-source-face');
    fs.writeFileSync(dir+'ui-example.json',JSON.stringify({uiCommit:uiRef,sourcePins:pins,region:r,relationship:rel,originalRegion:original,selected},null,2)+'\n');
    fs.writeFileSync(dir+'ui-result.json',JSON.stringify({status:report.prepared.length?'source-proof-prepared-native-unbound':'source-definition-unrepresentable',uiCommit:uiRef,regionId:r.id,report,metrics,originalPartTransforms:2,nativeCompilerCalls:0,pairValidationSessions:0,fullNewYorkDiagnostics:0,worldSteps:0,rendererCalls:0,retainedHelpers:[]},null,2)+'\n');
    console.log(JSON.stringify({regionId:r.id,prepared:report.prepared.length,rejected:report.rejected,metrics}));
  }finally{preparation.dispose();}
}finally{geometry.dispose();}
