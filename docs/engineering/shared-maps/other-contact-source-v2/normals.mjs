// Fixed selected-face normal metadata only. No contact/support factories or candidate search.
import fs from 'node:fs';
import path from 'node:path';
import assert from 'node:assert/strict';
import {createHash} from 'node:crypto';
const HERE=path.dirname(new URL(import.meta.url).pathname.replace(/^\/([A-Za-z]:)/,'$1')),N=path.join(HERE,'normal-metadata'),sha=b=>createHash('sha256').update(b).digest('hex');
const pins=JSON.parse(fs.readFileSync(path.join(N,'input-pins.json'))),readPin=p=>{const b=fs.readFileSync(path.join(HERE,p.cache));assert.equal(sha(b),p.sha256);return b;};
const proposal=JSON.parse(readPin(pins.sourceProposal)),planBytes=fs.readFileSync(path.join(HERE,'.cache/plan.json'));assert.equal(sha(planBytes),pins.planSha256);const plan=JSON.parse(planBytes);
const core=readPin(pins.canonicalCore).toString(),geometryBytes=readPin(pins.canonicalGeometry),adapter=readPin(pins.canonicalAdapter).toString();assert.ok(core.includes(pins.canonicalCore.normalDeclaration)&&adapter.includes(pins.canonicalCore.normalExpression)&&adapter.includes(pins.canonicalAdapter.comparison));assert.equal(sha(pins.canonicalCore.normalDeclaration),pins.canonicalCore.normalDeclarationSha256);
const G=await import('data:text/javascript;base64,'+geometryBytes.toString('base64'));
const canonicalNormal=Function('cross','sub',pins.canonicalCore.normalDeclaration+'\nreturn normal;')(G.cross,G.sub),historicalNormal=Function('G','return '+pins.historicalConvention.expression+';')(G);
const mode=process.argv[2],page=Number(process.argv[3]),ids=pins.pages[page];assert.ok(['derive','verify'].includes(mode)&&Number.isSafeInteger(page)&&ids?.length&&ids.length<=256);
const deadline=Date.now()+55000,started=Date.now(),cpuStart=process.cpuUsage(),guard=()=>{if(Date.now()>deadline)throw Error('Fixed-face normal metadata deadline reached');};
const geometries=new Map(),faces=new Map(),byId=new Map(proposal.regions.map(r=>[r.id,r])),serialize=v=>JSON.parse(JSON.stringify(v));
const floatHash=values=>{const flat=values.flat(2),b=Buffer.alloc(flat.length*8);flat.forEach((v,i)=>b.writeDoubleLE(v,i*8));return sha(b);};
function selectedFace(instanceId,primitive){
 guard();const key=instanceId+':'+primitive;if(faces.has(key))return faces.get(key);const instance=plan.instances[instanceId],geometry=plan.geometries[instance.geometry];
 assert.ok(Number.isSafeInteger(primitive)&&primitive>=instance.primitiveBase&&(instance.sourceRange===null||primitive<instance.primitiveBase+instance.sourceRange.count/3));
 if(!geometries.has(instance.geometry)){const raw=fs.readFileSync(path.join(HERE,geometry.cache));assert.equal(sha(raw),geometry.rawSha256);geometries.set(instance.geometry,JSON.parse(raw));}
 const raw=geometries.get(instance.geometry),attr=raw.attributes.position,index=Array.isArray(raw.index)?raw.index:raw.index?.array,m=instance.emittedWorldMatrix;assert.equal(attr.itemSize,3);
 const count=index?index.length:attr.array.length/3;assert.ok(primitive*3+2<count);
 const t=[0,1,2].map(k=>{const i=index?index[primitive*3+k]:primitive*3+k,v=attr.array.slice(3*i,3*i+3);return [0,1,2].map(axis=>{let number=0;for(let j=0;j<3;j++)number+=m[j*4+axis]*v[j];return number+m[12+axis];});});
 const record={triangle:t,float64LittleEndianSha256:floatHash(t)};faces.set(key,record);return record;
}
function derive(id){
 const region=byId.get(id);assert.equal(region.status,'source-contact-proposed');const ts=[region.parent,region.child].map((instanceId,side)=>selectedFace(instanceId,region.contact.primitives[side]));
 const historical=ts.map(t=>serialize(historicalNormal(t.triangle))),canonical=ts.map(t=>serialize(canonicalNormal(t.triangle)));
 assert.deepEqual(historical,region.contact.normals,'Historical selected-face normal bits must match the immutable source record');
 for(const [side,t]of ts.entries()){const expected=canonicalNormal(t.triangle);assert.ok(expected.every((v,i)=>v===canonical[side][i]));assert.ok(canonical[side].every(Number.isFinite));}
 const changed=historical.map((v,side)=>v.some((x,i)=>x!==canonical[side][i]));
 return {region:id,origin:region.priorProof?'preserved-v1-reference':'new-v2-source-result',instances:[region.parent,region.child],primitives:region.contact.primitives,historicalConvention:pins.historicalConvention.id,canonicalConvention:pins.canonicalConvention.id,historicalNormals:historical,canonicalNormals:canonical,endpointComponentsDiffer:changed,historicalSerializedFloat64LittleEndianSha256:floatHash(historical),canonicalSerializedFloat64LittleEndianSha256:floatHash(canonical),selectedOriginalFaceFloat64LittleEndianSha256:ts.map(t=>t.float64LittleEndianSha256),sourceReference:region.priorProof||region.proofOrigin,appliedToProposal:!region.priorProof};
}
const file=path.join(N,'pages',`page-${String(page).padStart(3,'0')}.json`),verify=path.join(N,'checks',`page-${String(page).padStart(3,'0')}.json`);let entries;
if(mode==='derive'){assert.ok(!fs.existsSync(file));entries=ids.map(derive);fs.writeFileSync(file,JSON.stringify({page,entries,inputPinsSha256:sha(fs.readFileSync(path.join(N,'input-pins.json'))),workerSha256:sha(fs.readFileSync(new URL(import.meta.url))),contactSearches:0,contactPredicatesReexecuted:0,nativeCompilerCalls:0,sourceBlueprintExpansions:0,workerElapsedMs:Date.now()-started,workerCpuUsage:process.cpuUsage(cpuStart)})+'\n',{flag:'wx'});}else{
 assert.ok(!fs.existsSync(verify));const saved=JSON.parse(fs.readFileSync(file));assert.deepEqual(saved.entries.map(e=>e.region),ids);entries=ids.map(derive);assert.deepEqual(entries,saved.entries);fs.writeFileSync(verify,JSON.stringify({page,entriesRechecked:entries.length,selectedOriginalFacesRechecked:entries.length*2,pageSha256:sha(fs.readFileSync(file)),workerSha256:sha(fs.readFileSync(new URL(import.meta.url))),contactSearches:0,contactPredicatesReexecuted:0,nativeCompilerCalls:0,workerElapsedMs:Date.now()-started,workerCpuUsage:process.cpuUsage(cpuStart)})+'\n',{flag:'wx'});
}
console.log(JSON.stringify({mode,page,regions:entries.length,newV2:entries.filter(e=>e.appliedToProposal).length,priorReferences:entries.filter(e=>!e.appliedToProposal).length,differentEndpoints:entries.reduce((n,e)=>n+e.endpointComponentsDiffer.filter(Boolean).length,0),contactSearches:0,contactPredicatesReexecuted:0}));
