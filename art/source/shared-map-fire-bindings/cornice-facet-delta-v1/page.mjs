// Remaining former-unproved source regions only. Accepted functions are referenced, not copied.
import fs from 'node:fs';
import path from 'node:path';
import assert from 'node:assert/strict';
import {fileURLToPath} from 'node:url';
import {createHash} from 'node:crypto';
const HERE=path.dirname(fileURLToPath(import.meta.url)),ROOT=path.resolve(HERE,'../../../..'),sha=b=>createHash('sha256').update(b).digest('hex');
const pins=JSON.parse(fs.readFileSync(path.join(HERE,'input-pins.json')));
function local(name){const pin=pins.local.find(p=>p.name===name),b=fs.readFileSync(path.join(HERE,name));assert.equal(sha(b),pin.sha256);return b;}
const delta=JSON.parse(local('plan.json')),provenance=JSON.parse(local('provenance.json'));
function ref(name){const pin=delta.references[name],b=fs.readFileSync(path.join(ROOT,pin.path));assert.equal(sha(b),pin.sha256);return b;}
const mode=process.argv[2],pageId=process.argv[3],pagePlan=delta.pages.find(p=>p.id===pageId);assert.ok(['calculate','verify'].includes(mode)&&pagePlan&&pagePlan.regions>0&&pagePlan.regions<=32);
const started=process.hrtime.bigint(),guard=()=>{if(Number(process.hrtime.bigint()-started)/1e9>55)throw Error('Facet delta page internal 55-second deadline');};
const dictionary=JSON.parse(ref('dictionary')),original=JSON.parse(ref('originalRelationships')).relationships;
const context=JSON.parse(ref('predicateContext'));assert.equal(sha(context.geometry.moduleText),context.geometry.sourceSha256);assert.equal(sha(context.support.closureText),context.support.closureSha256);
const G=await import('data:text/javascript;base64,'+Buffer.from(context.geometry.moduleText).toString('base64'));assert.equal(G.EPS,1e-7);
const touching=Function('G','const {overlaps,pointOnTriangle,segmentTriangle,dot,sub,add,mul,EPS}=G;\n'+context.support.closureText+'\nreturn touching;')(G);
const component=JSON.parse(ref('componentContext'));
for(const [key,hash]of [['declaration','declarationSha256'],['function','functionSha256'],['canonicalNormal','canonicalNormalSha256']])assert.equal(sha(component[key]),component[hash]);
assert.equal(component.sourceCommit,'25c74d2d2b9ae749a721e2ff71e6c116023c2379');
const components=Function('triangleArea',component.declaration+'\n'+component.function.replace(/^export /,'')+'\nreturn originalMaterialComponents;')(G.triangleArea);
const normal=Function('cross','sub',component.canonicalNormal+'\nreturn normal;')(G.cross,G.sub);
const producer=JSON.parse(ref('sourceProducer'));assert.equal(sha(producer.functionText),producer.functionSha256);
const sourceTriangles=Function(producer.functionText+'\nreturn sourceTriangles;')();
const geometryPins=new Map(pins.geometryPins.map(p=>[p.path,p]));
function dependency(name){const pin=geometryPins.get(name),b=fs.readFileSync(path.join(ROOT,name));assert.ok(pin);assert.equal(sha(b),pin.sha256);return JSON.parse(b);}
const plan={instances:dictionary.parts,geometries:dictionary.geometries,relationships:dictionary.relationships};
const harness=ref('acceptedHarness'),helperBytes=harness.subarray(provenance.partHelper.byteStart,provenance.partHelper.byteEnd);assert.equal(sha(helperBytes),provenance.partHelper.excerptSha256);
const helpers=Function('G','normal','plan','guard','dependency','sourceTriangles','sha','assert','components',helperBytes.toString()+'\nreturn {finite,on,key,same,within,shape,binaryHash,part,parts};')(G,normal,plan,guard,dependency,sourceTriangles,sha,assert,components);
const {finite,on,key,same,within,shape,binaryHash,part,parts}=helpers;
const block=ref('facetMethod').toString();assert.equal(sha(block),provenance.facetMethodSha256);
const method=Function('G','touching','assert','plan','part','guard','finite','on','key','normal','same','within','shape',block+'\nreturn {calculate,validate};')(G,touching,assert,plan,part,guard,finite,on,key,normal,same,within,shape);
const oldPages=new Map();
function rowFor(index){
 const target=delta.targets[index],d=dictionary.regions[target.dictionaryRegion],pointer=d.sourcePointer.split('/'),r=original[Number(pointer[2])],g=r.localRegions[Number(pointer[4])];
 assert.equal(g.id,d.id);assert.equal(r.id,dictionary.relationships[d.relationship].id);assert.equal(r.direction,dictionary.relationships[d.relationship].direction);
 assert.deepEqual(g.selector,d.selector);assert.deepEqual([g.parentBounds,g.childBounds],d.endpointBounds);assert.deepEqual(g.parentWitness,d.historicalWitness);assert.deepEqual(g.childWitness,d.historicalWitness);
 if(!oldPages.has(target.priorPage)){
  const pin=delta.priorPages[target.priorPage],b=fs.readFileSync(path.join(ROOT,pin.path));assert.equal(sha(b),pin.sha256);oldPages.set(target.priorPage,JSON.parse(b));
 }
 const old=oldPages.get(target.priorPage).regions[target.priorRecord];assert.equal(old.id,d.id);assert.equal(old.status,'UNPROVED');assert.equal(old.reason,target.priorReason);assert.equal(old.regionIndex,target.dictionaryRegion);
 const proof=g.actualGeometryCertificate.proof;
 return {id:g.id,parent:d.parent,child:d.child,relationship:r.id,selector:g.selector,endpointBounds:[g.parentBounds,g.childBounds],
  historical:{worldWitness:proof.worldWitness??null,sourceFace:proof.sourceFace??null,actualSurfaceWitness:proof.actualSurfaceWitness??null,parentWitness:g.parentWitness,childWitness:g.childWitness},
  targetIndex:index,dictionaryRegion:target.dictionaryRegion,sourcePointer:d.sourcePointer,sourceCanonicalSha256:d.sourceCanonicalSha256,
  certificateCanonicalSha256:d.certificateCanonicalSha256,priorUnprovedReason:target.priorReason,priorResultRef:{page:target.priorPage,record:target.priorRecord}};
}
const rows=pagePlan.targetIndices.map(rowFor),resultPath=path.join(HERE,'pages',pageId+'.json'),results=[];
const saved=mode==='verify'?JSON.parse(fs.readFileSync(resultPath)):null;
if(saved){assert.equal(saved.planSha256,sha(local('plan.json')));assert.deepEqual(saved.regions.map(r=>r.id),rows.map(r=>r.id));}
const partial=path.join(HERE,'partial',pageId+'.jsonl');
for(const [index,row]of rows.entries()){
 guard();let report;
 if(mode==='calculate')report=method.calculate(row);
 else{
  const record=saved.regions[index];report=record.result;assert.equal(record.sourceCanonicalSha256,row.sourceCanonicalSha256);assert.equal(record.priorUnprovedReason,row.priorUnprovedReason);
  const ends=[part(row.parent),part(row.child)];
  if(report.status==='source-contact-proposed'){
   const checks=method.validate(row,report.contact,ends);assert.ok(checks);assert.deepEqual(checks,report.checks);
   assert.deepEqual(report.canonicalNormalFloat64LittleEndianSha256,ends.map((p,i)=>binaryHash([normal(p.world.ts[report.contact.primitives[i]])])));
   assert.deepEqual(report.signedPlaneResidualMetres,ends.map((p,i)=>{const t=p.world.ts[report.contact.primitives[i]];return G.dot(G.sub(report.contact.point,t[0]),normal(t));}));
  }else{assert.equal(report.status,'unproved');assert.ok(typeof report.reason==='string');}
 }
 if(mode==='calculate'&&report.status==='source-contact-proposed'){
  const ends=[part(row.parent),part(row.child)],ts=ends.map((p,i)=>p.world.ts[report.contact.primitives[i]]);
  report.canonicalNormalFloat64LittleEndianSha256=ts.map(t=>binaryHash([normal(t)]));report.signedPlaneResidualMetres=ts.map(t=>G.dot(G.sub(report.contact.point,t[0]),normal(t)));
 }
 const record={id:row.id,targetIndex:row.targetIndex,dictionaryRegion:row.dictionaryRegion,sourcePointer:row.sourcePointer,sourceCanonicalSha256:row.sourceCanonicalSha256,
  certificateCanonicalSha256:row.certificateCanonicalSha256,priorUnprovedReason:row.priorUnprovedReason,priorResultRef:row.priorResultRef,result:report};
 results.push(record);
 if(mode==='calculate'){const fd=fs.openSync(partial,'a');try{fs.writeSync(fd,JSON.stringify(record)+'\n');fs.fsyncSync(fd);}finally{fs.closeSync(fd);}}
}
function instanceProof(p){
 const {rawComponents,emittedWorldComponents,...rest}=p.proof,bytes=Buffer.from(JSON.stringify({rawComponents,emittedWorldComponents})+'\n'),hash=sha(bytes),rel='topologies/'+hash+'.json',file=path.join(HERE,rel);
 if(fs.existsSync(file))assert.ok(fs.readFileSync(file).equals(bytes));else{assert.equal(mode,'calculate','Verification cannot create missing topology');fs.writeFileSync(file,bytes,{flag:'wx'});}
 return {...rest,topology:{path:rel,bytes:bytes.length,sha256:hash}};
}
const instanceProofs=[...parts].sort((a,b)=>a[0]-b[0]).map(([id,p])=>instanceProof(p));
const counts={regions:results.length,proved:0,unproved:0,contactChecks:0,negativeChecks:0,maxPlaneResidualMetres:0,reasons:{},priorReasons:{}};
for(const row of results){const r=row.result,prior=counts.priorReasons[row.priorUnprovedReason]??={regions:0,proved:0,unproved:0};prior.regions++;
 if(r.status==='source-contact-proposed'){counts.proved++;prior.proved++;counts.contactChecks+=r.checks.contact.length;counts.negativeChecks+=r.checks.wrongPrimitiveNegatives+r.checks.outsideSelectorNegatives+r.checks.legacyWitnessNegatives;counts.maxPlaneResidualMetres=Math.max(counts.maxPlaneResidualMetres,...r.checks.planeResidualMetres);}
 else{assert.equal(r.status,'unproved');counts.unproved++;prior.unproved++;counts.reasons[r.reason]=(counts.reasons[r.reason]??0)+1;}
}
const page={version:1,pageId,childOwnerId:pagePlan.childOwnerId,planSha256:sha(local('plan.json')),regions:results,instanceProofs,counts,
 methodSha256:sha(block),partHelperSha256:sha(helperBytes),componentFunctionSha256:component.functionSha256,canonicalNormalSha256:component.canonicalNormalSha256,
 nativeLineage:'UNBOUND',originalDictionaryRef:delta.references.dictionary,originalHistoryRef:delta.references.originalRelationships,
 nativeCompilations:0,geometryPayloadsCopied:0,sourceOnlyNoVolumeGroundingOrSupportInference:true};
if(mode==='calculate'){
 fs.writeFileSync(resultPath,JSON.stringify(page)+'\n',{flag:'wx'});fs.unlinkSync(partial);
}else{
 assert.deepEqual(page,saved);fs.writeFileSync(path.join(process.argv[4],pageId+'.json'),JSON.stringify({pageId,pageSha256:sha(fs.readFileSync(resultPath)),planSha256:sha(local('plan.json')),
  counts,searchesPerformed:0,instanceProofsRechecked:instanceProofs.length,nativeCompilations:0})+'\n',{flag:'wx'});
}
console.log(JSON.stringify({mode,pageId,counts,elapsedMs:Number(process.hrtime.bigint()-started)/1e6,nativeCompilations:0}));
