// Exactly one of six source representatives. Pure pinned functions only.
import fs from 'node:fs';
import path from 'node:path';
import assert from 'node:assert/strict';
import {fileURLToPath} from 'node:url';
import {createHash} from 'node:crypto';
const HERE=path.dirname(fileURLToPath(import.meta.url)),ROOT=path.resolve(HERE,'../../../..'),sha=b=>createHash('sha256').update(b).digest('hex');
const pins=JSON.parse(fs.readFileSync(path.join(HERE,'input-pins.json')));
function pinned(name){const pin=pins.packet.find(p=>p.name===name),b=fs.readFileSync(path.join(HERE,name));assert.equal(sha(b),pin.sha256);return b;}
const plan=JSON.parse(pinned('plan.json')),selection=JSON.parse(pinned('selection.json')),provenance=JSON.parse(pinned('provenance.json'));
assert.equal(plan.regions.length,6);assert.equal(selection.representatives.length,6);
const mode=process.argv[2],index=Number(process.argv[3]);assert.ok(['calculate','verify'].includes(mode)&&Number.isSafeInteger(index)&&index>=0&&index<6);
const row=plan.regions[index];assert.equal(row.id,selection.representatives[index].regionId);
const started=process.hrtime.bigint(),cpu=process.cpuUsage(),guard=()=>{if(Number(process.hrtime.bigint()-started)/1e9>55)throw Error('Representative source deadline reached');};
function dependency(name){const pin=pins.dependencies.find(p=>p.path===name),b=fs.readFileSync(path.join(ROOT,name));assert.equal(sha(b),pin.sha256);return JSON.parse(b);}
const context=dependency('art/source/shared-map-fire-bindings/cornice-wall-contact-proposal-v1/predicate-context.json');
assert.equal(sha(context.geometry.moduleText),context.geometry.sourceSha256);assert.equal(sha(context.support.closureText),context.support.closureSha256);
const G=await import('data:text/javascript;base64,'+Buffer.from(context.geometry.moduleText).toString('base64'));assert.equal(G.EPS,1e-7);
const touching=Function('G','const {overlaps,pointOnTriangle,segmentTriangle,dot,sub,add,mul,EPS}=G;\n'+context.support.closureText+'\nreturn touching;')(G);
const component=JSON.parse(pinned('component-context.json'));
for(const [key,hash]of [['declaration','declarationSha256'],['function','functionSha256'],['canonicalNormal','canonicalNormalSha256']])assert.equal(sha(component[key]),component[hash]);
assert.equal(component.sourceCommit,'25c74d2d2b9ae749a721e2ff71e6c116023c2379');
const components=Function('triangleArea',component.declaration+'\n'+component.function.replace(/^export /,'')+'\nreturn originalMaterialComponents;')(G.triangleArea);
const normal=Function('cross','sub',component.canonicalNormal+'\nreturn normal;')(G.cross,G.sub);
const producer=dependency('art/source/shared-map-fire-bindings/cornice-family-contact-page-01-v1/source-producer-context.json');assert.equal(sha(producer.functionText),producer.functionSha256);
const sourceTriangles=Function(producer.functionText+'\nreturn sourceTriangles;')();
const finite=p=>Array.isArray(p)&&p.length===3&&p.every(Number.isFinite),on=(p,t)=>G.segmentTriangle(p,p,t)!==null,key=p=>p.join(','),same=(a,b)=>JSON.stringify(a)===JSON.stringify(b);
const within=(p,b)=>p.every((v,i)=>v>=b.min[i]&&v<=b.max[i]),shape=ts=>({triangles:ts,solidTriangles:ts,bounds:G.bounds(ts.flat()),normal:normal(ts[0]),kind:'wall',thickness:0});
const binaryHash=ts=>{const values=ts.flat(2),b=Buffer.alloc(values.length*8);values.forEach((v,i)=>b.writeDoubleLE(v,i*8));return sha(b);};
const rawCache=new Map(),parts=new Map(),instanceById=new Map(plan.instances.map(p=>[p.id,p]));
const partition=topology=>topology.map(c=>({id:c.id,primitives:c.primitives}));
function part(id){
 if(parts.has(id))return parts.get(id);guard();const spec=instanceById.get(id),geom=plan.geometries[spec.geometry];assert.ok(spec&&geom);assert.equal(spec.sourceRange,null);
 if(!rawCache.has(geom.sha256)){
  const raw=dependency(geom.path),pos=raw.attributes.position;assert.equal(pos.itemSize,3);
  const indices=Array.isArray(raw.index)?raw.index:raw.index?.array||Array.from({length:pos.array.length/3},(_,i)=>i),ts=[];
  assert.equal(indices.length%3,0);for(let i=0;i<indices.length;i+=3)ts.push([0,1,2].map(k=>pos.array.slice(3*indices[i+k],3*indices[i+k]+3)));
  rawCache.set(geom.sha256,{raw,ts});
 }
 const raw=rawCache.get(geom.sha256),ts=sourceTriangles(spec,raw.raw);assert.equal(ts.length,raw.ts.length);
 let rawTopology=[],topology=[],failure=null;
 try{rawTopology=components(raw.ts);topology=components(ts);}
 catch(error){if(error.message!=='Finite original physical triangles required')throw error;failure={code:'original-component-unresolved',message:error.message};}
 const partitionsMatch=!failure&&same(partition(rawTopology),partition(topology));
 if(!failure&&!partitionsMatch)failure={code:'raw-world-positive-partition-differs',message:'Positive component IDs or absolute primitive partitions differ'};
 const comp=new Map();for(const c of topology)for(const i of c.primitives)comp.set(i,c.id);
 const nonmaterial=ts.map((_,i)=>i).filter(i=>!comp.has(i));
 if(!failure)for(const i of nonmaterial){for(const t of [raw.ts[i],ts[i]])assert.ok(t.every(finite)&&G.triangleArea(t)===0&&t.some((a,j)=>t.some((b,k)=>j<k&&a.every((v,n)=>v===b[n]))));}
 const result={spec,world:{ts,comp,failure},indices:ts.map((_,i)=>i).filter(i=>comp.has(i)),proof:{
  instance:id,partId:spec.partId,globalSourcePartIndex:spec.globalSourcePartIndex,globalCarrierIndex:spec.globalCarrierIndex,
  rawOriginalTriangles:raw.ts.length,positiveMaterialTriangles:comp.size,rawComponents:rawTopology,emittedWorldComponents:topology,
  positivePartitionsMatch:partitionsMatch,closedFlagsMatch:!failure&&same(rawTopology.map(c=>c.closed),topology.map(c=>c.closed)),
  closedFlagsNotUsedAsSurfaceContactGate:true,absoluteOriginalPrimitiveIdsPreserved:true,nonmaterialPrimitives:nonmaterial,
  rawTrianglesFloat64LittleEndianSha256:binaryHash(raw.ts),worldTrianglesFloat64LittleEndianSha256:binaryHash(ts),
  nonmaterialWorldTrianglesFloat64LittleEndianSha256:binaryHash(nonmaterial.map(i=>ts[i])),failure}};
 parts.set(id,result);return result;
}
const block=pinned('donor-facet-method.mjs.txt').toString();assert.equal(sha(block),provenance.unchangedFunctionBlockSha256);
const method=Function('G','touching','assert','plan','part','guard','finite','on','key','normal','same','within','shape',block+'\nreturn {calculate,validate};')(G,touching,assert,plan,part,guard,finite,on,key,normal,same,within,shape);
const resultPath=path.join(HERE,'results','representative-'+index+'.json');
let report,verification;
if(mode==='calculate')report=method.calculate(row);
else{
 const saved=JSON.parse(fs.readFileSync(resultPath));assert.equal(saved.regionId,row.id);assert.equal(saved.planSha256,sha(pinned('plan.json')));report=saved.result;
 const ends=[part(row.parent),part(row.child)];assert.deepEqual(saved.instanceProofs,ends.map(p=>p.proof));
 if(report.status==='source-contact-proposed'){
  const checks=method.validate(row,report.contact,ends);assert.ok(checks);assert.deepEqual(checks,report.checks);
  assert.deepEqual(report.canonicalNormalFloat64LittleEndianSha256,ends.map((p,i)=>binaryHash([normal(p.world.ts[report.contact.primitives[i]])])));
 }else{assert.equal(report.status,'unproved');assert.ok(typeof report.reason==='string');}
 verification={result:'SAVED_REPRESENTATIVE_VERIFIED',regionId:row.id,priorUnprovedReason:row.selection.priorUnprovedReason,status:report.status,searchesPerformed:0,
  originalSelectorAndBoundsUnchanged:true,historicalCertificatePreserved:true,originalAbsolutePrimitivesPreserved:true,
  resultSha256:sha(fs.readFileSync(resultPath)),planSha256:sha(pinned('plan.json')),nativeCompilations:0};
}
const ends=[part(row.parent),part(row.child)];
if(mode==='calculate'){
 if(report.status==='source-contact-proposed'){
  const ts=ends.map((p,i)=>p.world.ts[report.contact.primitives[i]]);
  report.canonicalNormalFloat64LittleEndianSha256=ts.map(t=>binaryHash([normal(t)]));
  report.signedPlaneResidualMetres=ts.map(t=>G.dot(G.sub(report.contact.point,t[0]),normal(t)));
 }
 const output={version:1,regionId:row.id,selection:row.selection,priorUnprovedReason:row.selection.priorUnprovedReason,
  originalRegionCanonicalSha256:row.sourceCanonicalSha256,originalSelectorsBoundsAndWitnessesPreserved:true,result:report,
  instanceProofs:ends.map(p=>p.proof),methodSha256:sha(block),componentFunctionSha256:component.functionSha256,
  canonicalNormalSha256:component.canonicalNormalSha256,planSha256:sha(pinned('plan.json')),membershipToleranceMetres:G.EPS,
  nativeLineage:'UNBOUND',nativeCompilations:0,sourceOnlyNoVolumeGroundingOrSupportInference:true,
  cost:{workerCpu:process.cpuUsage(cpu),workerElapsedMs:Number(process.hrtime.bigint()-started)/1e6}};
 fs.writeFileSync(resultPath,JSON.stringify(output)+'\n',{flag:'wx'});
}else fs.writeFileSync(path.join(process.argv[4]||path.join(HERE,'verification'),'representative-'+index+'.json'),JSON.stringify({...verification,
 instanceProofs:ends.map(p=>p.proof),cost:{workerCpu:process.cpuUsage(cpu),workerElapsedMs:Number(process.hrtime.bigint()-started)/1e6}})+'\n',{flag:'wx'});
console.log(JSON.stringify({mode,index,region:row.id,status:report.status,reason:report.reason??null,primitives:report.contact?.primitives??null,
 residuals:report.checks?.planeResidualMetres??null,nativeCompilations:0}));
