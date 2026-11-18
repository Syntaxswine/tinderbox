// Exactly two original owners; source transformation only, never compilation.
import fs from 'node:fs';
import assert from 'node:assert/strict';
import {createHash} from 'node:crypto';
import {createMapSourceGeometry} from '../../../../src/content/map-source-geometry.js';
import {sourceGeometryTriangles} from '../../../../src/content/map-source-shapes.js';
import {proveCorniceWallContact,CORNICE_WALL_CONTACT as pair} from '../../../../src/content/cornice-wall-contact-pilot.js';
const dir='docs/engineering/shared-maps/cornice-wall-contact-v1/',sha=b=>createHash('sha256').update(b).digest('hex');
if(fs.existsSync(dir+'input.json')||fs.existsSync(dir+'source-checks.json'))throw Error('Original pair source input already prepared; no repeated expansions');
const pins=JSON.parse(fs.readFileSync('docs/engineering/shared-maps/support-preparation-v1/source-pins.json')).files,parsed=pins.map(pin=>{const raw=fs.readFileSync(pin.path);assert.equal(sha(raw),pin.sha256);assert.equal(raw.length,pin.bytes);return JSON.parse(raw);}),[index,library,navigation]=parsed;
const historical=JSON.parse(fs.readFileSync('docs/engineering/shared-maps/support-port-birth-v1/unresolved-binding.json')),region=historical.originalRelationship.localRegions.find(r=>r.id===pair.regionId),slots=[],owners=[],parts=[];
const box=b=>({min:b.slice(0,3),max:b.slice(3,6)}),matrix=m=>m.length===3?[1,0,0,0,0,1,0,0,0,0,1,0,...m,1]:m;
for(const side of ['parent','child']){const spec=pair[side],p=index.parts[spec.globalPartIndex],c=index.carriers[p[2]];
  assert.equal(p[0],spec.partId);assert.equal('new-york::'+c[0],spec.ownerId);assert.deepEqual(c[11],[spec.globalPartIndex]);
  const part={id:p[0],carrierId:spec.ownerId,geometry:index.tables.geometries[p[3]],appearance:index.tables.appearances[p[4]],matrix:matrix(p[5]),bounds:box(p[6]),physical:!!(p[8]&1),closed:!!(p[8]&2)};slots[spec.globalPartIndex]=part;
  owners.push({id:spec.ownerId,material:c[1],fuelClass:c[2],fuelAmount:c[3],quantityRule:c[6],role:c[7],level:c[9],bounds:box(c[10]),parts:c[11],...(c[17]?{finish:{fuelClass:c[17][0],amount:c[17][1]}}:{})});
  const g=library.geometries[part.geometry],count=(g.index?.array.length??g.attributes.position.array.length/g.attributes.position.itemSize)/3;
  parts.push({id:part.id,ownerId:part.carrierId,role:c[7],globalPartIndex:spec.globalPartIndex,geometryId:part.geometry,matrix:part.matrix,triangles:sourceGeometryTriangles({matrix:part.matrix,triangleCount:count},g)});
}
const model={placeId:'new-york',carriers:owners,parts:slots,partById:new Map(slots.filter(Boolean).map(p=>[p.id,p])),carrierById:new Map(owners.map(c=>[c.id,c])),library:{geometries:Object.fromEntries(slots.filter(Boolean).map(p=>[p.geometry,library.geometries[p.geometry]]))},metrics:()=>({selectedOwners:2,selectedParts:2})},geometry=createMapSourceGeometry(model);
try{
  const surfaces=owners.flatMap(o=>geometry.sourcesForCarrier(o.id).surfaces),grid={origin:[0,0,0],pitch:[.5,1.06,.5]},proof=proveCorniceWallContact({parts,surfaces,region,grid}),metrics=geometry.metrics();assert.equal(metrics.nativeSourceExpansions,2);assert.equal(metrics.nativePartTransforms,2);assert.equal(metrics.transformedQueries,0);assert.equal(metrics.renderExpansions,0);
  const sourceRevision=sha(JSON.stringify(pins)),data={version:1,runtimeAdapterVersion:1,implicitGround:false,gridOrigin:grid.origin,thermalCell:grid.pitch,groundY:0,sourceBounds:navigation.sourceBounds,surfaces,openings:[],items:[],furnitureParts:[],stores:[],render:{geometry:[],materials:[]},scene:{version:1,instances:[{id:'new-york',bounds:navigation.sourceBounds}],doors:[]}},input={version:1,base:'e83ff7af6312fccb6d97b0923b8b46f48bbee871',authority:'d899d73fe4d79cf62e344832f132d911253a52ef',pins,sourceRevision,parts,region,grid,proof,producerInput:{data,owners,sourceRevision}},text=JSON.stringify(input,null,2)+'\n';
  fs.writeFileSync(dir+'input.json',text);fs.writeFileSync(dir+'source-checks.json',JSON.stringify({passed:true,inputSha256:sha(text),proof,metrics,originalPartTransforms:2,nativeCompilerCalls:0,originalRoofCompilations:0,fullNewYorkDiagnostics:0},null,2)+'\n');
  console.log(JSON.stringify({sourceChecksPassed:true,sourceOwnerExpansions:2,originalPartTransforms:2,sourceRevision,parent:proof.ends.parent,child:proof.ends.child,nativeCompilerCalls:0}));
}finally{geometry.dispose();}
