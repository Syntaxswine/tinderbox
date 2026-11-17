import fs from 'node:fs';import path from 'node:path';import assert from 'node:assert/strict';import {pathToFileURL} from 'node:url';import {createHash} from 'node:crypto';
const {compareSharedMapHosts}=await import(pathToFileURL(path.resolve('tools/review/shared-map-host-diff.mjs')));
const root='artifacts/qa/shared-map-runtime/support-cache-attribution-v1/',run=root+'run/',read=p=>JSON.parse(fs.readFileSync(p,'utf8')),r=read(run+'receipt.json'),raw=read(run+'raw.cpuprofile'),helper=read(run+'helper.json');
const reference='docs/engineering/shared-maps/support-cache-experiment/',old=read(reference+'correctness-reference-receipt.json'),candidate=read(reference+'correctness-candidate-receipt.json');
const sha=b=>createHash('sha256').update(b).digest('hex');assert.equal(sha(fs.readFileSync(run+'raw.cpuprofile')),r.profile.sha256);
assert.equal(r.source.frozenRuntime,'0e1ab9ddc42a0f7e301858044c82a221f73d8805');assert.equal(r.source.derivedLfSha256,candidate.source.derivedLfSha256);assert.equal(r.commandsSha256,candidate.commandsSha256);assert.deepEqual(read(run+'commands.json'),read(reference+'commands.json'));
const model={};
for(const stage of ['cold','before','after']){
  for(const key of ['nativeSha256','supportLinksSha256','replaySha256','counts','fuel','heat'])assert.deepEqual(r.states[stage][key],old.states[stage][key],stage+':'+key);
  const host=read(run+stage+'-host.json'),ref=read(reference+'correctness-reference/'+stage+'-host.json'),previousCandidate=read(reference+'correctness-candidate/'+stage+'-host.json');
  const againstReference=compareSharedMapHosts(ref,host),againstCandidate=compareSharedMapHosts(previousCandidate,host);assert.equal(againstReference.semanticEqual,true);assert.equal(againstCandidate.semanticEqual,true);
  model[stage]={againstReference,againstCandidate,rawHostSha256:sha(fs.readFileSync(run+stage+'-host.json')),digests:r.states[stage]};
}
assert.equal(r.hostTimings.length,366);assert.equal(r.held.hostSteps,32);assert.ok(r.wallMs<60000&&r.hostSteps<=1000);assert.equal(Date.parse(helper.expiresAt)-Date.parse(helper.startedAt),60000);assert.ok(Date.parse(r.cleanup.closedAt)<Date.parse(helper.expiresAt));
assert.equal(r.cleanup.profilerDisconnected,true);assert.equal(r.cleanup.simulationDisposed,true);assert.equal(r.topologyAfterDispose.entries,0);assert.equal(r.topologyAfterDispose.watchedBoundaries,0);
assert.ok(r.hostTimings[0].startUs>=raw.startTime);assert.ok(r.hostTimings.at(-1).endUs<=raw.endTime,'Inspector and host intervals use the same monotonic clock');
const nodes=new Map(raw.nodes.map(n=>[n.id,n])),parents=new Map(),keys=new Map();
for(const n of raw.nodes){keys.set(n.id,JSON.stringify([n.callFrame.functionName,n.callFrame.url,n.callFrame.lineNumber,n.callFrame.columnNumber]));for(const child of n.children||[])parents.set(child,n.id);}
function summarize(startUs,endUs){
  const self=new Map(),inclusive=new Map();let at=raw.startTime,sampledUs=0;
  for(let i=0;i<raw.samples.length;i++){
    const before=at;at+=raw.timeDeltas[i];const overlap=Math.max(0,Math.min(at,endUs)-Math.max(before,startUs));if(!overlap)continue;sampledUs+=overlap;
    const id=raw.samples[i],key=keys.get(id);self.set(key,(self.get(key)||0)+overlap);let current=id;const seen=new Set();
    while(current){const k=keys.get(current);if(!seen.has(k)){inclusive.set(k,(inclusive.get(k)||0)+overlap);seen.add(k);}current=parents.get(current);}
  }
  const rows=map=>[...map].sort((a,b)=>b[1]-a[1]).map(([key,us])=>{const [name,url,line,column]=JSON.parse(key);return {name:name||'(anonymous)',path:url.startsWith('file:')?path.relative(process.cwd(),new URL(url).pathname.replace(/^\/([A-Z]:)/,'$1')).split(path.sep).join('/'):url,line:line+1,column:column+1,ms:us/1000};});
  return {startUs,endUs,wallIntervalMs:(endUs-startUs)/1000,sampledMs:sampledUs/1000,self:rows(self).slice(0,35),inclusive:rows(inclusive).slice(0,45)};
}
const beforeHeld=r.held.before.tick,heldRows=r.hostTimings.filter(s=>s.tick>beforeHeld&&s.tick<=r.held.after.tick),firstUse=r.hostTimings.find(s=>s.tick===260);assert.equal(heldRows.length,32);assert.ok(firstUse);
const slow=[...r.hostTimings].sort((a,b)=>b.elapsedMs-a.elapsedMs).slice(0,8);
const result={version:1,scope:'One attribution-only profile, no control or improvement comparison. Existing model references are used only for correctness.',source:r.source,helper,bounds:{wallMs:60000,hostSteps:1000,withinBounds:true},model,commandTapeEqual:true,derivedFixtureEqual:true,rawHostPreimagesPreserved:true,profile:r.profile,diagnosticReads:'Identical three digest reads and ordinary fixture reads; host recorder uses only the existing sim.advance return value.',profileClockAligned:true,sampleAttribution:'Each recorded sample interval is clipped to the actual host/held monotonic interval; inclusive call paths overlap and cannot be added.',whole:summarize(raw.startTime,raw.endTime),firstUse:{host:firstUse,profile:summarize(firstUse.startUs,firstUse.endUs)},held:{firstTick:heldRows[0].tick,lastTick:heldRows.at(-1).tick,profile:summarize(heldRows[0].startUs,heldRows.at(-1).endUs)},slowHostSteps:slow,topologyAfterDispose:r.topologyAfterDispose,limitations:['One profiled run; no performance-improvement or production/phone/FPS acceptance','Timing wrappers, host interval records, input driver and diagnostic copies contribute overhead','CPU profiler samples main-thread stacks; process CPU includes other process threads','No allocation timeline; stage memory and bounded diagnostic counts only','Asynchronous GC observer delivered zero entries; this is not zero-GC proof'],runtimeChanged:false,newControl:false,performanceImprovementClaim:false};
fs.writeFileSync(root+'attribution.json',JSON.stringify(result,null,2)+'\n');
console.log(JSON.stringify({modelPassed:true,strictlyMatchesPreviousCandidate:Object.values(model).every(m=>m.againstCandidate.strictEqual),identity:helper.identity,profile:r.profile,clockAligned:true,firstUse:{tick:firstUse.tick,elapsedMs:firstUse.elapsedMs,workDelta:firstUse.workDelta,activationDelta:firstUse.activationDelta,topInclusive:result.firstUse.profile.inclusive.filter(x=>x.path.startsWith('src/')||x.path.startsWith('workbenches/')).slice(0,10),topSelf:result.firstUse.profile.self.slice(0,7)},held:{topInclusive:result.held.profile.inclusive.filter(x=>x.path.startsWith('src/')||x.path.startsWith('workbenches/')).slice(0,13),topSelf:result.held.profile.self.slice(0,8)},slowHostSteps:slow.map(s=>({tick:s.tick,ms:s.elapsedMs,nativeMs:s.nativeSimulationMs,activation:s.activationDelta}))}));
