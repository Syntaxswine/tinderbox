// Read only saved JSON. No native imports, geometry, provider or proof execution.
import fs from 'node:fs';
import path from 'node:path';
import assert from 'node:assert/strict';
import {fileURLToPath} from 'node:url';
import {createHash} from 'node:crypto';
const here=path.dirname(fileURLToPath(import.meta.url)),read=n=>JSON.parse(fs.readFileSync(path.join(here,n))),hash=b=>createHash('sha256').update(b).digest('hex');
const final=read('final.json'),receipt=read('receipt.json'),plan=read('plan.json'),raw=fs.readFileSync(path.join(here,'reference-blocks.json')),payload=JSON.parse(raw);
const observation=name=>final.observations.find(v=>v.name===name).value;
assert.equal(final.firstFailure.stage,'admission');assert.equal(final.stages.at(-1).name,'admission');assert.equal(final.stages.at(-1).status,'failed');assert.equal(final.complete,false);
assert.equal(final.scope.nativeCompilations,1);assert.equal(final.scope.nativeCompilationAttempts,1);assert.equal(receipt.exitCode,1);assert.equal(receipt.childExitConfirmed,true);assert.equal(receipt.withinAbsolute60s,true);
assert.equal(final.scope.trials,0);assert.equal(final.scope.worldSteps,0);
assert.equal(payload.blocks.length,4);assert.equal(raw.length,observation('reference-json-size').bytes+1);assert.equal(raw.at(-1),10);
const names=['large-continuity','deck-active-contact','roof-active-contact','both-active-contact'];
// This follows the encoded clone's counting/depth/tag convention but does not
// clone, admit or replay a block. It measures no new execution cost.
function structuralStats(value,depth=0,stats={values:0,maxDepth:0,maxStringLength:0}){
  stats.values++;stats.maxDepth=Math.max(stats.maxDepth,depth);
  if(typeof value==='string')stats.maxStringLength=Math.max(stats.maxStringLength,value.length);
  if(value!==null&&typeof value==='object'){
    const keys=Object.keys(value);
    if(!Array.isArray(value)&&keys.length===1&&(value.$undefined===true||value.$number==='-0'))return stats;
    for(const child of Object.values(value))structuralStats(child,depth+1,stats);
  }
  return stats;
}
const comparisons=[];
for(const name of ['large-continuity','both-cold-bypass','deck-active-contact','roof-active-contact','both-active-contact']){
  const saved=read('calculations/'+name+'.json'),digest=hash(JSON.stringify(saved.reference));assert.equal(digest,saved.referenceDigest);assert.equal(digest,saved.candidateDigest);assert.equal(saved.exactOrderedEquality,true);
  comparisons.push({name,edges:saved.reference.edges.length,result:saved.reference.result,digest,exactRecordedOriginalAndSharedEquality:true,bypass:saved.bypass});
}
const blocks=payload.blocks.map((block,i)=>{
  const digest=hash(JSON.stringify({version:block.version,identity:block.identity,edges:block.edges,result:block.result}));assert.equal(digest,block.digest);
  const saved=read('calculations/'+names[i]+'.json');assert.deepEqual({edges:block.edges,result:block.result},saved.reference);
  const identity=structuralStats(block.identity),whole=structuralStats(block);assert.equal(identity.values,observation(names[i]+':identity-count').canonicalIdentityValues);
  return {name:names[i],key:block.identity.key,edges:block.edges.length,result:block.result,identity,wholeBlockClone:whole,digest,perBlockCloneValueCap:plan.fixedProviderLimits.identityValues,exceedsWholeBlockCloneValueCap:whole.values>plan.fixedProviderLimits.identityValues};
});
const rejected=blocks.filter(b=>b.exceedsWholeBlockCloneValueCap),within=blocks.filter(b=>!b.exceedsWholeBlockCloneValueCap),admission=observation('provider-admission');
assert.equal(rejected.length,1);assert.equal(rejected[0].name,'large-continuity');assert.equal(rejected[0].wholeBlockClone.values,512131);
assert.ok(blocks.every(b=>b.wholeBlockClone.maxDepth<=plan.fixedProviderLimits.depth&&b.wholeBlockClone.maxStringLength<=plan.fixedProviderLimits.stringLength&&b.edges<=plan.fixedProviderLimits.edgesPerBlock));
assert.equal(within.reduce((n,b)=>n+b.wholeBlockClone.values,0),admission.identityValues);assert.equal(within.reduce((n,b)=>n+b.edges,0),admission.edges);assert.equal(within.length,admission.admitted);assert.equal(admission.rejected,1);
assert.equal(observation('provider-cleanup').disposed,true);assert.equal(observation('provider-cleanup').identityValues,0);assert.equal(observation('provider-cleanup').edges,0);
assert.deepEqual(final.unrun,['large-continuity:current-identity-equality','both-active-contact:current-identity-equality','large-continuity:active-replay','both-active-contact:active-replay','deck-active-contact:original-fallback','roof-active-contact:original-fallback']);
const result={version:1,kind:'Derived inspection of the one saved recording; no new observation/admission/calculation',authority:plan.authority,complete:false,
  observedFirstFailure:final.firstFailure,derivedRejection:{block:rejected[0].name,guard:'PREPARED_SUPPORT_LIMITS.identityValues applies to the entire admission clone, not just block.identity',wholeBlockValues:512131,limit:500000,excess:12131,identityValues:rejected[0].identity.values,evidence:'The one overflowing block is continuity; the other three full clone counts and edge counts sum exactly to observed admitted diagnostics. No provider was reinvoked.'},
  comparisons,blocks,providerAdmission:admission,resources:observation('native-resources'),nativeCounts:observation('native-counts'),referenceJSON:{serializedBytesExcludingFinalNewline:raw.length-1,fileBytes:raw.length,sha256:hash(raw),blocks:payload.blocks.length},
  timing:{source:'Original final.json stage records only',unit:'ms',spans:final.stages.map(s=>({name:s.name,status:s.status,ms:s.elapsedFunctionMs})),admissionDomain:'Provider construction, ownership claim, diagnostics, one internal observe/checkpoint and failing assertion; not a pure clone/hash span.',processElapsedMs:final.elapsedProcessMs,parentElapsedMs:receipt.parentElapsedMs},
  observedMemory:{bytes:final.observedMaxMemory,MiB:Object.fromEntries(Object.entries(final.observedMaxMemory).map(([k,v])=>[k,v/1048576])),limitation:'Stage-boundary maxima only, not true allocation peaks; no new sampling.'},unrun:final.unrun,cleanup:final.cleanup,retry:false,productionEnabled:false};
fs.writeFileSync(path.join(here,'recording-analysis.json'),JSON.stringify(result,null,2)+'\n');
console.log(JSON.stringify({recordingChecks:'pass',nativeCompilations:1,comparisons:comparisons.length,continuityEdges:blocks[0].edges,firstFailure:'admission',derivedWholeBlockValues:512131,limit:500000,admitted:admission.admitted,referenceJSONBytes:raw.length-1,unrun:final.unrun.length,noReAdmissionOrNativeRerun:true}));
