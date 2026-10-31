import test from 'node:test';
import assert from 'node:assert/strict';
import {createHash} from 'node:crypto';
import {createFireReviewDeliveryLoader,FIRE_DELIVERY_PATH,verifiedFireDeliveryFingerprint} from '../../tools/fire-realism/delivery.js';
import {summarizeFireMeasurements,validateQualityReceipt} from '../../tools/fire-realism/profiling.js';
import {measurementTrial,measurementQualityFixture} from '../fixtures/fire-profile.mjs';

// Every receipt, GPU value and source below is synthetic test input, never an
// architect approval, actual rendering result or hardware-cost measurement.
const prefix='assets/art/fire-realism/',base='https://fixture.invalid/tinderbox/';
const encode=value=>new TextEncoder().encode(typeof value==='string'?value:JSON.stringify(value));
const hash=value=>createHash('sha256').update(value).digest('hex');
function selectorFixture({factoryExport='createFireRealism',optimized=false}={}){
  const files=new Map(),descriptor={version:1,byMode:{}};
  const raw=encode("export function createFireRealism(){return 'reviewed';} export function alternateFactory(){return 'different';}");
  for(const mode of ['reference',...(optimized?['optimized']:[])]){
    const local=prefix+(mode==='optimized'?'optimized/':''),entry=local+'index.js',manifestPath=local+'manifest.json';
    const manifestRaw=encode({optimizedAvailable:mode==='optimized',runtimeFiles:[{path:entry,sha256:hash(raw),bytes:raw.length}]}),sourceCommit=(mode==='reference'?'a':'b').repeat(40);
    const acceptance={kind:mode==='reference'?'architect-fire-reference-acceptance-v1':'architect-fire-optimized-acceptance-v1',mode,factoryModule:entry,factoryExport:'createFireRealism',status:'accepted',receiptId:'synthetic-selector-test-only-'+mode,sourceCommit,runtimeFiles:{[entry]:hash(raw)},...(mode==='optimized'?{referenceCommit:'a'.repeat(40),referenceFactoryModule:prefix+'index.js',referenceFactoryExport:'createFireRealism'}:{})};
    const receiptRaw=encode(acceptance),acceptanceUrl='docs/reviews/fire-realism/selector-'+mode+'-test-only.json';
    descriptor.byMode[mode]={sourceCommit,factoryModule:entry,factoryExport:mode==='reference'?factoryExport:'createFireRealism',manifestUrl:manifestPath,manifestSha256:hash(manifestRaw),manifestBytes:manifestRaw.length,acceptanceUrl,acceptanceSha256:hash(receiptRaw),acceptanceBytes:receiptRaw.length};
    files.set(entry,raw);files.set(manifestPath,manifestRaw);files.set(acceptanceUrl,receiptRaw);
  }
  const save=()=>files.set(FIRE_DELIVERY_PATH,encode(descriptor));save();let imports=0;
  const options={descriptorUrl:base+FIRE_DELIVERY_PATH,projectUrl:base,fetchImpl:async url=>{
    const local=url.slice(base.length),response=new Response(files.get(local)||null,{status:files.has(local)?200:404});Object.defineProperty(response,'url',{value:url});return response;
  },importModule:async()=>{imports++;return import('data:text/javascript;base64,'+Buffer.from(raw).toString('base64'));}};
  return {options,files,descriptor,save,load:createFireReviewDeliveryLoader(),get imports(){return imports;},rewriteReceipt(mode,edit){
    const record=descriptor.byMode[mode],receipt=JSON.parse(new TextDecoder().decode(files.get(record.acceptanceUrl)));edit(receipt);const bytes=encode(receipt);files.set(record.acceptanceUrl,bytes);record.acceptanceSha256=hash(bytes);record.acceptanceBytes=bytes.length;save();
  }};
}
test('same verified bytes with two own exports cannot reuse the receipt for a different selected factory',async()=>{
  const reviewed=selectorFixture(),loaded=await reviewed.load(reviewed.options);
  assert.equal(loaded.artistDelivery.byMode.reference.createFireRealism(),'reviewed');
  assert.equal(loaded.referenceAcceptance.receiptId,'synthetic-selector-test-only-reference');
  const changed=selectorFixture({factoryExport:'alternateFactory'});
  await assert.rejects(changed.load(changed.options),/receipt.*match/i);assert.equal(changed.imports,0,'Wrong selected policy must fail before artist evaluation');
  const separatelyReviewed=selectorFixture({factoryExport:'alternateFactory'});separatelyReviewed.rewriteReceipt('reference',r=>{r.factoryExport='alternateFactory';});
  const alternate=await separatelyReviewed.load(separatelyReviewed.options);assert.equal(alternate.artistDelivery.byMode.reference.createFireRealism(),'different');
});
test('configured receipts require exact explicit mode/module/export and cannot fall back to old commit/hash-only approval',async()=>{
  for(const [field,wrong]of [['mode','optimized'],['factoryModule',prefix+'alternate.js'],['factoryExport','alternateFactory'],['sourceCommit','c'.repeat(40)]]){
    for(const missing of [true,false]){
      const fixture=selectorFixture();fixture.rewriteReceipt('reference',receipt=>{if(missing)delete receipt[field];else receipt[field]=wrong;});
      await assert.rejects(fixture.load(fixture.options),/receipt.*match/i,field);assert.equal(fixture.imports,0);
    }
  }
  const legacy=selectorFixture();legacy.rewriteReceipt('reference',r=>{delete r.mode;delete r.factoryModule;delete r.factoryExport;});
  await assert.rejects(legacy.load(legacy.options),/receipt.*match/i);assert.equal(legacy.imports,0);
});
test('only the loader-issued record and exact imported function retain detached entry proof after accidental mutation',async()=>{
  const fixture=selectorFixture(),loaded=await fixture.load(fixture.options),record=loaded.artistDelivery.byMode.reference;
  const proof=verifiedFireDeliveryFingerprint(record);assert.equal(proof.mode,'reference');assert.equal(proof.factoryModule,prefix+'index.js');assert.equal(proof.factoryExport,'createFireRealism');
  assert.equal(validateQualityReceipt(loaded.referenceAcceptance,{kind:loaded.referenceAcceptance.kind,...proof}),true);
  proof.runtimeFiles[proof.factoryModule].sha256='0'.repeat(64);assert.notDeepEqual(verifiedFireDeliveryFingerprint(record),proof);
  for(const unknown of [null,{}, {...record},{...record,createFireRealism:()=> 'different'}])assert.equal(verifiedFireDeliveryFingerprint(unknown),null);
  const original=record.createFireRealism;record.createFireRealism=()=> 'different';assert.equal(verifiedFireDeliveryFingerprint(record),null);record.createFireRealism=original;
  for(const [field,wrong]of [['mode','optimized'],['sourceCommit','c'.repeat(40)],['factoryModule',prefix+'alternate.js'],['factoryExport','alternateFactory'],['manifestUrl',base+prefix+'other.json'],['manifestSha256','0'.repeat(64)],['manifestBytes',record.manifestBytes+1]]){
    const before=record[field];record[field]=wrong;assert.equal(verifiedFireDeliveryFingerprint(record),null,field);record[field]=before;assert.ok(verifiedFireDeliveryFingerprint(record));
  }
  assert.equal(validateQualityReceipt(loaded.referenceAcceptance,{kind:loaded.referenceAcceptance.kind,...record,runtimeFiles:verifiedFireDeliveryFingerprint({...record})?.runtimeFiles}),false);
});
test('optimized receipt must link to the exact configured reference entry even when its module bytes and commit are unchanged',async()=>{
  for(const field of ['referenceCommit','referenceFactoryModule','referenceFactoryExport']){
    const missing=selectorFixture({optimized:true});missing.rewriteReceipt('optimized',r=>{delete r[field];});
    await assert.rejects(missing.load(missing.options),/receipt.*match/i);assert.equal(missing.imports,0);
  }
  const fixture=selectorFixture({factoryExport:'alternateFactory',optimized:true});fixture.rewriteReceipt('reference',r=>{r.factoryExport='alternateFactory';});
  await assert.rejects(fixture.load(fixture.options),/receipt.*optimized/i);assert.equal(fixture.imports,0);
  const linked=selectorFixture({factoryExport:'alternateFactory',optimized:true});linked.rewriteReceipt('reference',r=>{r.factoryExport='alternateFactory';});linked.rewriteReceipt('optimized',r=>{r.referenceFactoryExport='alternateFactory';});
  const result=await linked.load(linked.options);assert.equal(result.artistDelivery.byMode.reference.createFireRealism(),'different');assert.equal(result.artistDelivery.byMode.optimized.retainedQualityAcceptance.referenceFactoryExport,'alternateFactory');
});
function profileFixture({trialCount=1}={}){
  const quality=measurementQualityFixture(),trials=[];
  for(let trialIndex=0;trialIndex<trialCount;trialIndex++)for(const [mode,cost,forMode]of [['reference',11,'reference'],['no-fire',1,'reference'],['optimized',3,'optimized'],['no-fire',1,'optimized']])trials.push(measurementTrial(mode,cost,forMode,{trialIndex,trialCount}));
  return {trials,modes:['reference','optimized'],...quality};
}
test('cost/report fingerprints bind each fire and paired no-fire trial to its own mode entry and complete source hashes',()=>{
  const complete=profileFixture(),result=summarizeFireMeasurements(complete);assert.equal(result.comparison.targetMet,true);assert.equal(result.comparison.optimizedReferenceRatio,.2);assert.deepEqual(result.reasons,[]);
  for(const [name,edit]of [
    ['missing fingerprint',t=>{delete t.factoryFingerprint;}],['wrong mode',t=>{t.factoryFingerprint.mode='reference';}],['missing module',t=>{delete t.factoryFingerprint.factoryModule;}],['different module',t=>{t.factoryFingerprint.factoryModule=prefix+'optimized/alternate.js';}],['missing export',t=>{delete t.factoryFingerprint.factoryExport;}],['different export',t=>{t.factoryFingerprint.factoryExport='alternateFactory';}],['changed closure hash',t=>{t.factoryFingerprint.runtimeFiles[t.factoryFingerprint.factoryModule].sha256='c'.repeat(64);}],['missing entry membership',t=>{delete t.factoryFingerprint.runtimeFiles[t.factoryFingerprint.factoryModule];}]
  ])for(const index of [2,3]){
    const args=profileFixture();edit(args.trials[index]);const rejected=summarizeFireMeasurements(args);assert.equal(rejected.evidenceStatus,'inconclusive',name);assert.equal(rejected.comparison.targetMet,null,name);assert.equal(rejected.comparison.optimizedReferenceRatio,null,name);assert.match(rejected.reasons.join(' '),/factory entry\/source/i);
  }
  const paired=profileFixture();paired.trials[3].factoryFingerprint.factoryExport='alternateFactory';delete paired.sourceFingerprints;
  const mismatch=summarizeFireMeasurements(paired);assert.equal(mismatch.comparison.optimizedReferenceRatio,null);assert.match(mismatch.reasons.join(' '),/paired factory entry\/source/i);
  const repeat=profileFixture({trialCount:2});for(const trial of repeat.trials.filter(t=>t.forMode==='optimized'&&t.trialIndex===1))trial.factoryFingerprint.factoryExport='alternateFactory';delete repeat.sourceFingerprints;
  const switched=summarizeFireMeasurements(repeat);assert.equal(switched.comparison.optimizedReferenceRatio,null);assert.match(switched.reasons.join(' '),/Cross-trial.*factory entry\/source/i);
});
test('optimized quality cannot attach to another accepted reference export with the same frozen commit and hashes',()=>{
  const args=profileFixture();args.sourceFingerprints.reference.factoryExport='alternateFactory';args.referenceAcceptance.factoryExport='alternateFactory';
  for(const trial of args.trials.filter(t=>t.forMode==='reference'))trial.factoryFingerprint.factoryExport='alternateFactory';
  const wrong=summarizeFireMeasurements(args);assert.deepEqual(wrong.reasons,[]);assert.equal(wrong.comparison.approvedReference,true);assert.equal(wrong.comparison.optimizedReferenceRatio,.2);assert.equal(wrong.comparison.retainedQualityAccepted,null);assert.equal(wrong.comparison.targetMet,null);
  args.optimizedAcceptance.referenceFactoryExport='alternateFactory';assert.equal(summarizeFireMeasurements(args).comparison.targetMet,true);
  for(const field of ['referenceFactoryModule','referenceFactoryExport']){const changed=structuredClone(args);delete changed.optimizedAcceptance[field];assert.equal(summarizeFireMeasurements(changed).comparison.targetMet,null);}
});
test('unconfigured reference/current diagnostic arithmetic remains separate from exact quality acceptance',()=>{
  const debug=profileFixture();debug.modes=['reference'];debug.trials=debug.trials.slice(0,2);debug.sourceFingerprints.reference.sourceCommit=null;for(const trial of debug.trials)trial.factoryFingerprint.sourceCommit=null;
  const result=summarizeFireMeasurements(debug);assert.deepEqual(result.reasons,[]);assert.equal(result.comparison.approvedReference,false);assert.equal(result.comparison.targetMet,null);
  const module='src/art/fire.js',current={mode:'current',sourceCommit:'d'.repeat(40),factoryModule:module,factoryExport:'createFire',runtimeFiles:{[module]:{sha256:'e'.repeat(64),verified:true,expectedSha256:'e'.repeat(64)}}};
  const trials=[measurementTrial('current',3),measurementTrial('no-fire',1,'current')];for(const trial of trials)trial.factoryFingerprint=structuredClone(current);
  const control=summarizeFireMeasurements({trials,modes:['current']});assert.deepEqual(control.reasons,[]);assert.equal(control.incrementalFireMs.current.median,2);assert.equal(control.comparison.targetMet,null);
});

test('binary/bootstrap source identity binds every paired workload while authoritative R/O pose data remains identical',()=>{
 const args=profileFixture();for(const mode of ['reference','optimized']){const fp=args.sourceFingerprints[mode],path=prefix+(mode==='optimized'?'optimized/':'')+'data/test.fzp.gz';fp.prepareExport='prepareFluid';fp.runtimeResources={[path]:{sha256:'c'.repeat(64),expectedSha256:'c'.repeat(64),bytes:32,uncompressedBytes:64,kind:'fzp1-gzip',verified:true}};const receipt=mode==='reference'?args.referenceAcceptance:args.optimizedAcceptance;receipt.prepareExport=fp.prepareExport;receipt.runtimeResources={[path]:{sha256:'c'.repeat(64),bytes:32,uncompressedBytes:64,kind:'fzp1-gzip'}};for(const trial of args.trials.filter(t=>t.forMode===mode))trial.factoryFingerprint=structuredClone(fp);}args.optimizedAcceptance.referencePrepareExport=args.sourceFingerprints.reference.prepareExport;args.optimizedAcceptance.referenceRuntimeResources=structuredClone(args.referenceAcceptance.runtimeResources);assert.equal(summarizeFireMeasurements(args).comparison.targetMet,true);
 for(const edit of [fp=>{fp.prepareExport='otherPrepare';},fp=>{delete fp.prepareExport;},fp=>{delete fp.runtimeResources;},fp=>{Object.values(fp.runtimeResources)[0].sha256='d'.repeat(64);},fp=>{Object.values(fp.runtimeResources)[0].uncompressedBytes++;}])for(const index of [0,1]){const bad=structuredClone(args);edit(bad.trials[index].factoryFingerprint);const result=summarizeFireMeasurements(bad);assert.equal(result.comparison.targetMet,null);assert.equal(result.comparison.optimizedReferenceRatio,null);assert.match(result.reasons.join(' '),/factory entry\/source/);}
 const wrong=structuredClone(args);wrong.optimizedAcceptance.referencePrepareExport='otherPrepare';assert.equal(summarizeFireMeasurements(wrong).comparison.targetMet,null);wrong.optimizedAcceptance.referencePrepareExport='prepareFluid';delete wrong.optimizedAcceptance.referenceRuntimeResources;assert.equal(summarizeFireMeasurements(wrong).comparison.targetMet,null);
});
