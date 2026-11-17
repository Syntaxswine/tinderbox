// Saved outputs and source hashes only. Never reruns the native comparison.
import fs from 'node:fs';
import path from 'node:path';
import assert from 'node:assert/strict';
import {execFileSync} from 'node:child_process';
import {createHash} from 'node:crypto';
import {fileURLToPath} from 'node:url';
const here=path.dirname(fileURLToPath(import.meta.url)),root=path.resolve(here,'../../../..'),relative=path.relative(root,here).replaceAll('\\','/');
const read=p=>fs.readFileSync(path.join(root,p)),json=p=>JSON.parse(read(p)),local=n=>json(relative+'/'+n),sha=b=>createHash('sha256').update(b).digest('hex'),lf=p=>read(p).toString('utf8').replace(/\r\n/g,'\n');
const git=(...args)=>execFileSync('git',args,{encoding:'utf8',windowsHide:true,maxBuffer:2*1024*1024}).trim().split(/\r?\n/).filter(Boolean);
const plan=local('plan.json'),result=local('final.json'),receipt=local('receipt.json'),preflight=local('preflight.json'),cleanup=local('cleanup.json');
assert.equal(result.complete,true);assert.equal(result.firstFailure,null);assert.deepEqual(result.unrun,[]);assert.deepEqual(local('partial.json'),result);
assert.equal(receipt.exitCode,0);assert.equal(receipt.forced,false);assert.equal(receipt.stopFileWritten,false);assert.equal(receipt.childExitConfirmed,true);assert.equal(receipt.withinAbsolute60s,true);assert.ok(receipt.parentElapsedMs<60000);assert.equal(receipt.pid,result.pid);assert.equal(receipt.planSha256,sha(read(relative+'/plan.json')));
assert.ok(cleanup.identities.every(p=>p.exactOwnedProcessAlive===false));assert.deepEqual(cleanup.retainedHelpers,[]);assert.deepEqual(cleanup.portsAllocated,[]);
assert.ok(Object.values(result.cleanup).every(Boolean));assert.equal(result.pilot.retainedReceipts,0);assert.equal(result.pilotAfterDispose.closed,true);assert.deepEqual(result.pilotAfterDispose.owners,[]);
for(const pin of plan.sourcePins)assert.equal(sha(pin.mode==='LF'?lf(pin.path):read(pin.path)),pin.sha256,pin.path);
for(const pin of plan.harnessPins)assert.equal(sha(read(relative+'/'+pin.file)),pin.sha256,pin.file);
for(const pin of plan.inputPins){assert.equal(read(pin.path).length,pin.bytes);assert.equal(sha(read(pin.path)),pin.sha256);}
for(const row of preflight.priorArchives){assert.equal(sha(read(row.manifest)),row.manifestRawSha256);const manifest=json(row.manifest);for(const pin of manifest.files){const archivePrefix=path.posix.dirname(row.manifest)+'/';assert.equal(sha(pin.path.startsWith(archivePrefix)?read(pin.path):lf(pin.path)),pin.path.startsWith(archivePrefix)?pin.sha256||pin.rawSha256:pin.lfSha256,pin.path);}}
assert.deepEqual(result.scope,{productionEnabled:false,originalNativeCalls:1,regionalNativeCalls:960,regionalCallsLimit:960,worldTrials:0,worldSteps:0,supportRebuilds:0,liveQueries:0,productionFactories:0,renderers:0});
assert.equal(result.reference.fragments,4136);assert.equal(result.reference.roofFragments,4132);assert.equal(result.reference.cells,9520);assert.equal(result.reference.originalRoofCandidateCells,8228);
const inputs=new Map(result.inputs.sourceSurfaces.map(s=>[s.id,s])),roundoff=(q,n)=>64*Number.EPSILON*Math.max(1,q)*Math.max(1,n),sum=a=>a.reduce((n,v)=>n+v,0),boxCount=b=>b.min.reduce((n,v,i)=>n*Math.max(0,b.max[i]-v+1),1);
let baseline,regionalRows=0;
for(const order of result.orders){
  assert.equal(order.status,'passed');assert.equal(order.compiledRegions,320);assert.equal(order.boundaries,4132);assert.equal(order.fuels,4132);assert.equal(order.cells,9520);assert.equal(order.visitedCells,8228);
  const rows=lf(relative+'/iterations-'+order.order+'.jsonl').trim().split('\n').map(s=>JSON.parse(s)),byKey=new Map(rows.map(r=>[r.key,r]));assert.equal(rows.length,320);assert.equal(byKey.size,320);regionalRows+=rows.length;
  assert.equal(rows.filter(r=>r.fragments).length,232);assert.equal(rows.filter(r=>!r.fragments).length,88);assert.equal(Math.max(...rows.map(r=>r.fragments)),36);
  if(baseline)for(const row of rows)assert.deepEqual(row,baseline.get(row.key),'Same original receipt/certificate/trace in every order '+row.key);else baseline=byKey;
  for(const row of rows){
    assert.equal(row.key,[row.min[0]/4,row.min[1],row.min[2]/4].join(','));assert.equal(row.min[0]%4,0);assert.equal(row.min[2]%4,0);assert.equal(row.fuels,row.fragments);assert.ok(row.fragments<=36);assert.equal(row.certificate.epsilon,1e-7);
    assert.equal(row.visitedCells,sum(row.sources.map(s=>s.cells)));assert.equal(row.sources.length,5);
    for(const [i,s]of row.sources.entries()){
      const original=result.reference.sourceRanges[i],end=row.min.map((v,j)=>v+[3,0,3][j]),restricted={min:original.min.map((v,j)=>Math.max(v,row.min[j])),max:original.max.map((v,j)=>Math.min(v,end[j]))};
      assert.equal(s.sourceId,original.sourceId);assert.deepEqual(s.restricted,restricted);assert.equal(s.cells,boxCount(restricted));
      const proof=row.certificate.rows[i],input=inputs.get(s.sourceId),q=input.quantity+(input.finish?.amount||0);assert.equal(proof.sourceId,s.sourceId);assert.equal(proof.candidateTriangleCells,s.cells*input.triangles);assert.equal(proof.canonicalQuantity,q*proof.canonicalArea/proof.sourceArea);
      const areaError=64*(Number.EPSILON/2)*input.triangles*3*proof.coordinateScale**2,denominator=proof.sourceArea-areaError;assert.ok(denominator>0);
      assert.ok([proof.canonicalQuantity,proof.canonicalRoundoff,proof.positive,proof.negative,proof.roundoffBound].every(n=>Number.isFinite(n)&&n>=0));
    }
    for(const field of ['canonicalQuantity','canonicalRoundoff','positive','negative','roundoffBound'])assert.equal(row.certificate[field],sum(row.certificate.rows.map(r=>r[field])));
    const delta=row.nativeQuantity-row.certificate.canonicalQuantity;assert.ok(delta<=row.certificate.positive&&delta>=-row.certificate.negative);
  }
  const quantity=490.002072,measured=sum(rows.map(r=>r.certificate.canonicalQuantity)),native=sum(rows.map(r=>r.nativeQuantity)),proved=roundoff(quantity,5)+sum(rows.map(r=>r.certificate.canonicalRoundoff))+roundoff(quantity,320);
  assert.equal(measured,order.stock.canonicalMeasured);assert.equal(native,order.stock.nativeBorn);assert.equal(quantity-measured,order.stock.canonicalRemainder);assert.equal(quantity-measured,order.stock.parentArithmeticCarry);assert.equal(proved,order.stock.provedRemainderBound);assert.ok(Math.abs(quantity-measured)<=proved);assert.equal(order.stock.canonicalTransferred,quantity);assert.equal(order.stock.coldReserve,0);assert.equal(order.stock.state,'full');
  // Recount every saved prefix without invoking any compiler or live ledger.
  for(let n=1;n<=rows.length;n++){const prefix=rows.slice(0,n),q=sum(prefix.map(r=>r.certificate.canonicalQuantity)),bound=roundoff(quantity,5)+sum(prefix.map(r=>r.certificate.canonicalRoundoff))+roundoff(quantity,n);assert.ok(q>=0&&q<=quantity+bound);}
}
assert.equal(regionalRows,960);assert.equal(result.pilot.nativeCalls,960);assert.equal(result.pilot.visitedCells,24684);assert.equal(result.pilot.certificateBuilds,320);
const witness=result.witness,selected=new Set(witness.requestedDomainKeys),outside=new Set(witness.unrequestedDomainKeys);assert.equal(selected.size,162);assert.equal(outside.size,158);assert.ok([...selected].every(k=>baseline.has(k)&&!outside.has(k)));assert.ok([...outside].every(k=>baseline.has(k)));assert.equal(selected.size+outside.size,320);
assert.equal(sum([...selected].map(k=>baseline.get(k).fragments)),2486);assert.equal(sum([...outside].map(k=>baseline.get(k).fragments)),1646);assert.equal(sum([...selected].map(k=>baseline.get(k).visitedCells)),4372);assert.equal(witness.additionalNativeCalls,0);
const taskFiles=['src/simulation/regional-source-pilot.js','workbenches/furnished-house/regional-domain.js','workbenches/furnished-house/scene.js','workbenches/furnished-house/partition-error.js','tests/fixtures/regional-source-data.mjs','tests/integration/regional-source-compiler.test.mjs','tools/record-shared-map-runtime.mjs','docs/engineering/shared-maps/runtime-integration.json'];
const wip='docs/engineering/shared-maps/support-regions-proposal.md',changed=[...new Set([...git('diff','--name-only','HEAD'),...git('ls-files','--others','--exclude-standard')])].sort();
assert.ok(changed.every(p=>p===wip||taskFiles.includes(p)||p.startsWith(relative+'/')),'Only scoped task paths plus the preserved WIP');assert.equal(sha(read(wip)),preflight.unrelatedWipRawSha256);
const staged=git('diff','--cached','--name-only');assert.ok(!staged.includes(wip));
const declared=json('docs/engineering/shared-maps/runtime-integration.json');assert.equal(declared.runtimeFiles.length,22);assert.equal(declared.addedFiles.length,47);
for(const p of ['src/simulation/regional-source-pilot.js','workbenches/furnished-house/regional-domain.js'])assert.ok(declared.addedFiles.some(f=>f.path===p&&f.lfSha256===sha(lf(p))));
const testLog=lf(relative+'/synthetic.log');assert.ok(testLog.includes('tests 8')&&testLog.includes('pass 8')&&testLog.includes('fail 0'));assert.ok(testLog.includes('"total":22')&&testLog.includes('"retainedReceipts":0'));assert.equal(local('synthetic-checks.json').exitCode,0);
const audit={version:1,authority:plan.authority,scope:'Saved-output/source/declaration/scope/cleanup verification only',passed:true,actualComparisonComplete:true,actualNativeReruns:0,focusedFixtures:{runs:3,testsPerRun:8,nativeCallsPerRun:22,totalNativeCalls:66,rejectedBeforeNativePerRun:1,secondAttemptCounterCorrection:true},actual:{originalReferenceCalls:1,regionalCalls:960,fullRoofEquivalentPasses:4,rows:regionalRows,originalFragments:4136,roofFragments:4132,cells:9520,candidateCellsPerRoofOrder:8228},witness:{potentialDescriptors:162,nonempty:138,empty:24,requested:2486,unrequested:1646,selectedIterationCells:4372,additionalNativeCalls:0},sourceClosurePins:plan.sourcePins.length,harnessPins:plan.harnessPins.length,priorArchiveRawFiles:61,priorParentLfTextFiles:1,runtimeDeclaration:{modified:22,added:47},taskFiles,changedPaths:changed,unrelatedWipPreserved:true,noHelpers:true,deadlineReceiptValid:true,deadlineEnforcementExercised:false,productionEnabled:false};
const output=JSON.stringify(audit,null,2)+'\n';if(process.argv.includes('--check')){const saved=local('verification.json');for(const key of ['changedPaths'])delete saved[key];const comparison={...audit};delete comparison.changedPaths;assert.deepEqual(saved,comparison);}else fs.writeFileSync(path.join(here,'verification.json'),output);
console.log(JSON.stringify({passed:true,savedRegionalRows:960,actualNativeReruns:0,sourcePins:plan.sourcePins.length,scopedTaskFiles:taskFiles.length,unrelatedWipPreserved:true,noHelpers:true}));
