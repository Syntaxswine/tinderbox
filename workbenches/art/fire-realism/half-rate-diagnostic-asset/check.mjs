// Tiny synthetic fixtures/source checks only. No generate(), field input,
// factory construction, bpy/Job, renderer, GPU, server or scientific helper.
import fs from 'node:fs';
import path from 'node:path';
import assert from 'node:assert/strict';
import {createHash} from 'node:crypto';
import {fileURLToPath} from 'node:url';
import {SourceTextModule} from 'node:vm';
import {gzipSync,gunzipSync} from 'node:zlib';
import {validateEligibility,verifyPinnedBytes,verifyPayloadSizing,STUDY} from './eligibility.mjs';
import {pairSupport} from './support.mjs';
import {diagnosticFactorySource,localNormalizationSource} from './factory-source.mjs';
import {terminalReport} from '../half-rate-assessment/metrics.mjs';
import {createContactSourceClock} from '../../../../assets/art/fire-realism/fluid-contact/source-clock.js';
import {makeFluidShaders} from '../../../../assets/art/fire-realism/fluid-contact/shaders.js';
import {emissionAbsorptionFragment,emissionVariantUniform,configureEmissionBlend} from '../../../../assets/art/fire-realism/fluid-surface-emission-transfer.js';
import {normalizedEmissionFragment} from '../../../../assets/art/fire-realism/fluid-surface-emission-normalization-transfer.js';
import {encodeZeroLiteral,decodeZeroLiteral} from '../../../../assets/art/fire-realism/fluid-contact-surface/payload/codec.js';
const here=path.dirname(fileURLToPath(import.meta.url)),root=path.resolve(here,'../../../..'),plan=JSON.parse(fs.readFileSync(path.join(here,'plan.json'))),sha=b=>createHash('sha256').update(b).digest('hex'),passed=[],test=(n,f)=>{f();passed.push(n);};
const raw=path=>fs.readFileSync(root+'/'+path),clone=x=>structuredClone(x);
test('all reused code pins exact; no source data opened',()=>{for(const p of[...Object.values(plan.runtimeCopies),...Object.values(plan.reuseSources)]){const b=raw(p.path);assert.equal(b.length,p.bytes);assert.equal(sha(b),p.sha256);}});
const rows=Array.from({length:193},(_,i)=>({frame:i+1,age:i/30,min:0,max:i>0&&i<96?.5:0,nonzero:i>0&&i<96?1:0,positive:i>0&&i<96?1:0,integral:i>0&&i<96?.01:0,belowGroundPositive:0,boundaryPositive:0}));
Object.assign(rows[96],{max:.3547821044921875,nonzero:55,positive:55,integral:.0002870405151671375});
function fixture(){
 const validation=terminalReport(rows,true),settings={counterfactual:{property:'burning_rate',baseline:.75,target:.375},source:{contactBandHeight:plan.contactBandHeight},controlV5:{}};
 const samples=rows.map(r=>({frame:r.frame,ageSeconds:r.age,resolution:plan.grid.resolution,voxelSize:plan.grid.spacing,scalarCentreOriginBlender:plan.grid.origin,domainBoundsBlender:plan.domainBounds,contactBandHeight:plan.contactBandHeight,channels:Object.fromEntries(['density','temperature','flame'].map(channel=>[channel,{path:'fields/'+channel+'-'+String(r.frame).padStart(3,'0')+'.f32',bytes:884736,sha256:'a'.repeat(64),min:0,max:channel==='flame'?r.max:0,nonzero:channel==='flame'?r.nonzero:0,positive:channel==='flame'?r.positive:0}])),support:{density:{},flame:{}}}));
 const manifest={version:1,id:'tinderbox-mantaflow-half-rate-source',status:'raw-export-failed-preserved',sampleCount:193,samples,terminalValidation:validation,initialConditionObservedZero:true,boundaryReactionFailed:false,belowGroundReactionFailed:false,upperOverhangApproved:false,burningRateCounterfactual:settings.counterfactual,ageRange:[0,6.4],burnAgeRange:[0,3.2],tailMaximum:3.2,cachePrecision:{requested:'32',observed:'32'},scalarFormat:'Original observed f32LE Xfastest,YthenZ; no quantization/crop/terminal overwrite',sourcePins:plan.authoringPins,sourceBlendSha256:plan.sourcePins.sourceBlendSha256,canonicalSource:settings.source,controlV5:{}};
 const assessment={status:'complete-bytes-reconciled-raw-gates-still-failed',rawGatesPassed:false,admitted:false,terminal:clone(validation),frames:samples.map(s=>({frame:s.frame,age:s.ageSeconds,channels:clone(s.channels)}))};
 const ledger={all579RawHashesVerified:true,candidateFields:samples.flatMap(s=>Object.entries(s.channels).map(([channel,r])=>({frame:s.frame,channel,...r}))),baselineSelectedFields:[{},{}]};
 return{manifest,validation,assessment,ledger,proof:{rawGatesPassed:false,admitted:false,all579CandidateFieldHashesVerified:true,baselineFieldHashesVerified:2},prepared:{sourcePins:plan.authoringPins,preparedBlendSha256:plan.sourcePins.sourceBlendSha256,observedValid:true},settings};
}
test('exact failed-study eligibility retains false status',()=>{const e=validateEligibility(fixture(),plan);assert.equal(e.expected.size,579);assert.equal(e.study.rawGatesPassed,false);assert.equal(e.study.admitted,false);});
for(const [name,mutate]of[
 ['additional failure',x=>x.validation.failures.push('another failure')],
 ['relabelled pass',x=>x.validation.rawGatesPassed=true],
 ['repaired97',x=>x.validation.requiredSamples.find(r=>r.frame===97).positive=0],
 ['nonzero98',x=>x.validation.requiredSamples.find(r=>r.frame===98).nonzero=1],
 ['changed shape',x=>x.manifest.samples[0].resolution=[96,48,48]],
 ['changed age',x=>x.manifest.samples[96].ageSeconds=3.21],
 ['truncated ledger',x=>x.ledger.candidateFields.pop()],
 ['repeated/wrong key',x=>x.ledger.candidateFields[1].channel='density'],
 ['changed raw hash',x=>x.ledger.candidateFields[2].sha256='b'.repeat(64)],
 ['source pin',x=>x.prepared.sourcePins={...x.prepared.sourcePins,'grid.py':'b'.repeat(64)}],
 ['assessment admission',x=>x.assessment.admitted=true],
 ['uncompleted proof',x=>x.proof.all579CandidateFieldHashesVerified=false]
])test('eligibility refuses '+name,()=>{const x=fixture();mutate(x);assert.throws(()=>validateEligibility(x,plan));});
test('no generic failure extension/changed study pin',()=>{const p=clone(plan);p.study.allowFailure=true;assert.throws(()=>validateEligibility(fixture(),p));delete p.study.allowFailure;p.study.manifestSha256='0'.repeat(64);assert.throws(()=>validateEligibility(fixture(),p));});
test('exact bytes/size/hash must agree before parsing',()=>{const b=Buffer.from('{"a":1}'),p={bytes:b.length,sha256:sha(b)};assert.equal(verifyPinnedBytes(b,p),b);assert.throws(()=>verifyPinnedBytes(b,{...p,bytes:b.length+1}));assert.throws(()=>verifyPinnedBytes(b,{...p,sha256:'0'.repeat(64)}));});
test('every payload ceiling is exact, immutable and refuses plus1',()=>{const limit=plan.limits,v={sourceBytes:limit.sourceBytes,sparseBytes:limit.sparseBytes,compressedBytes:limit.compressedBytes,chunks:limit.chunks,frameSparseBytes:limit.chunkSparseBytes,frameCompressedBytes:limit.chunkCompressedBytes},saved=JSON.stringify(v);assert.equal(verifyPayloadSizing(v,limit),v);for(const key of Object.keys(v)){const bad={...v,[key]:v[key]+1};assert.throws(()=>verifyPayloadSizing(bad,limit));}assert.equal(JSON.stringify(v),saved);});
const grid={resolution:[3,3,3],origin:[-.25,-.25,.125],spacing:[.25,.25,.25]},frame=()=>({density:new Float32Array(27),flame:new Float32Array(27)}),a=frame(),b=frame();a.flame[0]=1;b.density[2+3*(2+3*2)]=.125;
const bytesA=sha(new Uint8Array(a.flame.buffer)),bytesB=sha(new Uint8Array(b.density.buffer));
test('full current/next positive halo, floor0 and half-open ownership',()=>{const p=pairSupport(a,b,grid);assert.equal(p.metrics.coverage.bothCurrentNextContained,true);assert(p.metrics.coverage.oneVoxelHaloCornerWitnesses>0);assert(p.raw[0].lower<0);assert.equal(p.render[0].lower,0);assert(p.metrics.floor.movedVertices>0);assert.equal(p.metrics.upperOverhangApproved,false);assert.equal(sha(new Uint8Array(a.flame.buffer)),bytesA);assert.equal(sha(new Uint8Array(b.density.buffer)),bytesB);});
test('empty support and unequal sparse next source remain valid',()=>{assert.equal(pairSupport(frame(),frame(),grid).raw.length,0);const p=pairSupport(a,b,grid);assert(p.metrics.vertices>0&&p.metrics.triangles>0);assert.notEqual(p.metrics.rawPrisms,92);});
test('nonfinite source and belowfloor centre refuse without edits',()=>{const c=frame();c.flame[0]=NaN;assert.throws(()=>pairSupport(c,b,grid));const low={...grid,origin:[-.25,-.25,-.125]};assert.throws(()=>pairSupport(a,b,low),/floor/);assert.equal(sha(new Uint8Array(a.flame.buffer)),bytesA);});
test('lossless FZP2/gzip signedzero/subnormal words',()=>{const b=Buffer.alloc(24);[0,0x80000000,1,0x3f800000,0,0x3e800000].forEach((v,i)=>b.writeUInt32LE(v,i*4));const p=encodeZeroLiteral(b),gz=gzipSync(p),decoded=gunzipSync(gz),out=new Uint8Array(b.length);decodeZeroLiteral(decoded,out);assert.deepEqual(Buffer.from(out),b);});
const factoryBase=raw(plan.reuseSources.factoryTemplate.path).toString('utf8'),factory=diagnosticFactorySource(factoryBase);
test('factory source compiles without evaluation or old-store import',()=>{new SourceTextModule(factory);const refs=[...factory.matchAll(/from\s+['"]([^'"]+)['"]/g)].map(x=>x[1]);assert(refs.every(x=>x.startsWith('./')&&!x.includes('..')));assert(!factory.includes('fluid-contact-surface/index'));assert.equal((factory.match(/createBinaryFieldStore\(FIELD_METADATA\)/g)||[]).length,1);for(const name of ['prepareHalfRateDiagnosticData','halfRateDiagnosticPayloadEvidence','auditHalfRateDiagnosticRGBA','createHalfRateContactDiagnostic'])assert(factory.includes('function '+name+'('));});
test('factory preserves all clock/depth/sampling/light/disposal source after labels/optics insertion',()=>{const originalMethods=factoryBase.slice(factoryBase.indexOf('  function bindPresentation('),factoryBase.indexOf('  return{root,update,reset,diagnostics()'));const next=factory.slice(factory.indexOf('  function bindPresentation('),factory.indexOf('  return{root,update,reset,diagnostics()'));assert.equal(next,originalMethods);assert.equal(factory.slice(factory.indexOf('dispose(){')),factoryBase.slice(factoryBase.indexOf('dispose(){')));assert(factory.includes('quality:\'reference\''));assert(factory.includes('rawGatesPassed:false'));});
test('normalization helper changes import specifiers only',()=>{const old=raw(plan.runtimeCopies['normalization-transfer.js'].path).toString('utf8'),local=localNormalizationSource(old);new SourceTextModule(local);const restore=local.replace("'./shaders.js'","'./fluid-contact-surface/shaders.js'").replace("'./emission-transfer.js'","'./fluid-surface-emission-transfer.js'");assert.equal(restore,old);});
test('fixed6r generator/zero extinction/blend is the R30 control',()=>{for(const n of[4,8,28,128]){const all=makeFluidShaders(n),f=normalizedEmissionFragment(emissionAbsorptionFragment(all.fragmentShader,'smoke-only'),n);assert(f.includes('(6.*r/1.)*eaDisplaySource(fire)'));assert(!f.includes('float finalAlpha=alpha*legibility'));assert.equal(emissionVariantUniform('smoke-only').value,0);assert(Object.isFrozen(emissionVariantUniform('smoke-only')));}const T={CustomBlending:5,OneFactor:1,OneMinusSrcAlphaFactor:205,AddEquation:100},m={};configureEmissionBlend(T,m);assert.equal(m.blendSrc,1);assert.equal(m.blendDst,205);assert.equal(m.premultipliedAlpha,true);});
const cells=['cell:10,16','cell:10,17','cell:11,16','cell:11,17'].map((id,i)=>({id,x:i<2?5.25:5.75,y:i%2?8.75:8.25,material:'grass',size:.5,elevation:0,intensity:1,phase:'burning'}));
const clock=createContactSourceClock(),f=(t,spent=false,events=[])=>({worldTime:t,tick:Math.round(t*60),cells:cells.map(c=>({...c,phase:spent?'spent':'burning',intensity:spent?0:1})),player:{tool:'match'},eventReceipts:{generation:1,events,highestId:spent?8:4}});
test('original world clock, actual burnout reaction0 and finite tail are unchanged',()=>{const ign=cells.map((c,i)=>({id:i+1,type:'ignition',cellId:c.id,receivedWorldTime:0}));clock.update(f(0,false,ign));assert.equal(clock.update({...f(1),playerTime:10}).age,1);const out=cells.map((c,i)=>({id:i+5,type:'burnout',cellId:c.id,receivedWorldTime:3.2})),s=clock.update(f(3.2,true,out));assert.equal(s.reactionGain,0);assert.equal(s.sample0,96);assert.equal(s.densityGain,1);assert(clock.update(f(6.2,true)).densityGain>0);assert.equal(clock.update(f(6.4,true)).phase,'retired');});
test('future generator has no old success/deadline/geometry witness or auto audit',()=>{const s=fs.readFileSync(path.join(here,'assemble.mjs'),'utf8');assert(!s.includes('run.rawExportComplete'));assert(!s.includes('run.deadlineEpoch'));assert(!s.includes('floorMovedVertices!==1769'));assert(s.includes('index<192'));assert(s.includes('rawGatesPassed:false'));assert(s.includes('qaBytes-65536')||s.includes('qaBytes-'));assert(!s.includes('auditHalfRateDiagnosticRGBA('));assert(s.includes('FAILED.json'));});
test('budgets/underlay fixed; measured payload/support totals not invented',()=>{assert.equal(plan.limits.sourceBytes,67108864);assert.equal(plan.limits.sparseBytes,100663296);assert.equal(plan.limits.compressedBytes,100663296);assert.equal(plan.limits.chunkCompressedBytes,2097152);assert.equal(plan.limits.chunkSparseBytes,4194304);assert.equal(plan.limits.chunks,256);assert.equal(plan.nativeComparisonUnderlay.heat,'native-heat-v1');assert.equal(plan.nativeComparisonUnderlay.char,'char-v1');assert(!fs.existsSync(path.join(root,plan.assetRoot)));});
console.log(JSON.stringify({status:'source-and-tiny-fixtures-pass',checks:passed.length,passed,rawDataRead:false,actualGeneration:false,factoryInstantiated:false,renderer:false,retainedHelpers:[]},null,2));
