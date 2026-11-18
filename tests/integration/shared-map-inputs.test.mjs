import test,{after} from 'node:test';
import assert from 'node:assert/strict';
import {inputFixture} from '../fixtures/shared-map-input-data.mjs';
import {compileSharedMap} from '../../src/content/shared-map.js';
import {createSharedMapRuntime} from '../../src/runtime/shared-map.js';
import {inspectSharedMapInputs,MapInputNotReadyError} from '../../src/content/shared-map-admission.js';
import {sharedMapInputInventory,createSharedMapInputFactory,loadMapInputJSON} from '../../src/content/shared-map-inputs.js';
import {createTrial,calmWind,trialDiagnostics,limitDiagnosticTrialSteps} from '../../workbenches/furnished-house/simulation.js';
import {sceneCompileDiagnostics} from '../../workbenches/furnished-house/scene.js';
import {createSourceCarrierLedger} from '../../src/simulation/source-carriers.js';
import fs from 'node:fs';
const resources=[];limitDiagnosticTrialSteps(64);
const compile=(f,options={})=>compileSharedMap(f.index,f.library,f.navigation,{inputFactory:f.factory(),...options});
function world(compiled){
  const query=compiled.createQuerySource(),ledger=createSourceCarrierLedger(compiled.sourceCarriers,{modes:compiled.sourceOwnerModes});let trial,activation;
  const definitions=compiled.sourceCarriers.flatMap(c=>compiled.sources.sourcesForCarrier(c.id).surfaces),thermalTriangles=definitions.reduce((n,s)=>n+s.triangles.length,0),logicalCells=definitions.reduce((n,s)=>{const ps=s.triangles.flat(),lo=[0,1,2].map(i=>Math.min(...ps.map(p=>p[i]))),hi=[0,1,2].map(i=>Math.max(...ps.map(p=>p[i])));return n+hi.reduce((cells,v,i)=>{const first=Math.floor(lo[i]/[.5,1.06,.5][i]+1e-7),last=v-lo[i]<1e-7?first:Math.ceil(v/[.5,1.06,.5][i]-1e-7)-1;return cells*(last-first+1);},1);},0);assert.ok(logicalCells<=64&&thermalTriangles<=256);
  try{trial=createTrial(compiled.data,{querySource:query,supportGraphFactory:compiled.supportGraphFactory,wind:calmWind});activation=compiled.createActivation({trial,querySource:query,ledger});return {query,ledger,trial,activation,dispose(){activation.dispose();trial.dispose();query.dispose();ledger.dispose();resources.push({logicalCells,thermalTriangles,query:query.metrics(),inputs:compiled.metrics().inputs,geometry:compiled.metrics().geometry});}};}
  catch(error){activation?.dispose();trial?.dispose();query.dispose();ledger.dispose();throw error;}
}
after(()=>{console.log('INPUT_RESOURCES '+JSON.stringify({compiler:sceneCompileDiagnostics(),trial:trialDiagnostics(),resources,actualNewYorkExpansions:0,actualNewYorkCompilerCalls:0,rendererCalls:0,builds:0}));assert.ok(trialDiagnostics().steps<=64);assert.ok(resources.every(r=>r.query.cachedTriangles===0&&r.query.workingLeases===0&&r.inputs.activeBindings===0&&r.inputs.producer.retainedReceipts===0));});

test('existing host prepares one projection, shares original transforms and binds genuine births with full Q',async()=>{
  const f=inputFixture();f.index.carriers[0].finish={fuelClass:'lacquer',amount:.025};f.descriptor.owners[0].finish={fuelClass:'lacquer',amount:.025};const c=compile(f);let w;
  try{
    assert.equal(c.inputReport.status,'READY');assert.equal(c.model.carriers.length,3);assert.equal(c.sources.metrics().transformedQueries,0);assert.throws(()=>c.createQuerySource(),/Prepare map inputs/);
    await c.prepareInputs();await c.prepareInputs();assert.equal(f.loads.length,3);assert.equal(c.model.carriers.length,4);assert.equal(c.model.parts[3].id,'upper');assert.equal(c.model.carriers[3].id,'fixture::upper');assert.equal(c.model.carriers[3].fuelAmount,.2);assert.equal(Object.keys(f.library.geometries).length,3,'caller library remains untouched');
    w=world(c);assert.equal(w.ledger.snapshot().find(o=>o.id==='fixture::floor').quantity,.5+.025);assert.ok(Math.abs(w.ledger.metrics().staticInitial-1.725)<2*Number.EPSILON);assert.equal(c.sources.metrics().transformedQueries,4);assert.equal(c.sources.metrics().nativePartTransforms,0);assert.equal(c.sources.metrics().borrowedNativeParts,4);assert.equal(w.trial.tick,0);
    const before=c.sources.metrics().transformedQueries;assert.throws(()=>w.activation.ensure(['fixture::unknown']),/Out-of-cohort/);assert.throws(()=>w.activation.prepare({whole:['fixture::unknown']}),/Out-of-cohort/);assert.equal(c.sources.metrics().transformedQueries,before);
    w.activation.ensurePoint([.375,0,.25]);assert.equal(c.sources.metrics().transformedQueries,4,'no producer/query/support retransform');assert.equal(w.trial.tick,0);assert.ok(w.trial.scene.fuels.size>0);assert.equal(w.ledger.metrics().coldReserve,0);assert.equal(w.trial.supportGraph.snapshot().ports.length,3);assert.ok(w.trial.supportGraph.snapshot().ports.every(p=>p.live));assert.equal(w.trial.supportGraph.diagnostics().fixedNativePorts,6);
    assert.ok(w.query.metrics().cachedTriangles+w.query.metrics().workingTriangles<=65536);assert.equal(c.registration().generation,2); // failed pre-prepare request never made a world
    const fixed=w.trial.supportGraph.snapshot().ports.find(p=>p.id==='roof-port').parent;w.activation.prepare({retireRecords:[fixed]}).publish();assert.equal(w.trial.supportGraph.snapshot().ports.find(p=>p.id==='roof-port').live,false);assert.ok(w.trial.supportGraph.unsupported().some(b=>b.nativePartId==='fit'));assert.ok(w.trial.supportGraph.unsupported().some(b=>b.nativePartId==='upper'));assert.equal(w.ledger.metrics().coldReserve,0);
  }finally{w?.dispose();c.dispose();c.dispose();}
});

test('metadata missing roots, ranges, canonical Q/mode, caps, mapping, cache and unknown paired proof reject before expansion',()=>{
  const changes=[['LOWER_ROOT_NOT_READY',p=>p.support.rootTraces=[]],['SOURCE_RANGE_NOT_READY',p=>p.parts[0].sourceRange={start:0,count:3}],['CANONICAL_QUANTITY',p=>p.owners[0].fuelAmount=.49],['OWNER_MODE_UNBOUND',p=>p.owners[0].mode=null],['OWNER_MODE_POLICY',p=>p.owners[2].mode='whole'],['PROJECTION_NOT_APPROVED',p=>p.projections[0].part.matrix[12]=1],['GENERATED_CAP_ENDPOINT',p=>p.parts[0].lineage.generatedCaps=[6]],['COMBINED_CACHE_LIMIT',p=>p.limits={triangles:30}],['BIRTH_DERIVATION_PLAN_UNBOUND',p=>p.support.bonds[0].parent.bindingPlan=null],['PROOF_KIND_NOT_READY',p=>p.support.bonds[0].proofKind='paired-endpoints-unreviewed'],['TRUNCATED_OWNER',p=>p.owners[0].parts=[]],['MALFORMED_RECORD',p=>p.support.bonds=[null]]];
  for(const [code,change]of changes){const f=inputFixture();change(f.descriptor);let context,report;const factory=f.factory();assert.throws(()=>compileSharedMap(f.index,f.library,f.navigation,{inputFactory:args=>{context=args;return factory(args);},onInputReport:r=>report=r}),MapInputNotReadyError);assert.equal(report.status,'NOT_READY');assert.ok(report.findings.some(v=>v.code===code),JSON.stringify({code,findings:report.findings}));assert.equal(context.sources.metrics().transformedQueries,0);assert.equal(context.sources.metrics().nativeSourceExpansions,0);assert.equal(f.loads.length,0);}
});

test('unborn native IDs are expected; unknown projection or source plans cannot masquerade as proof',()=>{
  const f=inputFixture(),defaultMap=compileSharedMap(f.index,f.library,f.navigation);try{const inv=sharedMapInputInventory(defaultMap.model);assert.equal(inspectSharedMapInputs(f.descriptor,inv,f.policy).status,'READY');f.descriptor.support.bonds[0].parent.bindingPlan.nativeRecordId='invented';assert.ok(inspectSharedMapInputs(f.descriptor,inv,f.policy).findings.some(v=>v.code==='PREMATURE_NATIVE_ID'));f.descriptor.support.bonds[0].parent.bindingPlan.nativeRecordId=null;f.descriptor.parts[0].surfacePlan.proofRef=null;assert.ok(inspectSharedMapInputs(f.descriptor,inv,f.policy).findings.some(v=>v.code==='SURFACE_PLAN_UNBOUND'));assert.equal(defaultMap.data.internalHybrid,undefined);assert.equal(defaultMap.sourceOwnerModes,undefined);assert.equal(defaultMap.sources.metrics().transformedQueries,0);}finally{defaultMap.dispose();}
});

test('reset disposes each binding and reuses the same decoded owner; old disposal cannot release new pins',async()=>{
  const f=inputFixture(),c=compile(f);try{await c.prepareInputs();const a=world(c);a.activation.ensurePoint([.375,0,.25]);a.dispose();const b=world(c);try{a.query.dispose();assert.equal(c.metrics().inputs.activeBindings,1);assert.equal(c.model.parts.length,4);assert.equal(f.loads.length,3);assert.equal(c.metrics().geometry.transformedQueries,8);b.activation.ensurePoint([.375,0,.25]);assert.ok(b.trial.supportGraph.snapshot().ports.every(v=>v.live));assert.equal(c.metrics().inputs.binds,2);}finally{b.dispose();}}finally{c.dispose();}
});

test('late abort, disposal and bad projection mapping prevent installation and the runtime hook',async()=>{
  for(const type of ['abort','dispose','mapping']){
    const f=inputFixture(),controller=new AbortController();let resume;const gate=new Promise(resolve=>resume=resolve),factory=createSharedMapInputFactory({descriptor:f.descriptor,policy:f.policy,loadProjection:async(ref,signal)=>{await gate;const data=await f.loadProjection(ref,type==='abort'?undefined:signal);if(type==='mapping'&&ref.path.includes('mapping'))data.renderToPhysicalVertex[0]=1;return data;}}),c=compileSharedMap(f.index,f.library,f.navigation,{inputFactory:factory,signal:controller.signal});const pending=c.prepareInputs();if(type==='abort')controller.abort();if(type==='dispose')c.dispose();resume();try{await assert.rejects(pending,/abort|disposed|lineage/i);assert.equal(c.model.parts.length,3);assert.equal(c.sources.metrics().transformedQueries,0);}finally{c.dispose();}
  }
});

test('existing runtime hook routes one source decode and preparation, disposes failed setup and keeps rejection visible',async()=>{
  const f=inputFixture();let context,calls=0,loads=0;
  const args={place:{id:'fixture',title:'Fixture'},loadNavigation:async()=>({navigation:f.navigation}),loadSources:async()=>{loads++;return {index:f.index,library:f.library};},inputFactory:input=>{context=input;return f.factory()(input);},runtimeFactory:async({gameplayMap})=>{calls++;assert.equal(gameplayMap.model,context.model);assert.equal(gameplayMap.sources,context.sources);assert.equal(gameplayMap.model.parts.length,4);throw Error('synthetic runtime setup failure');}};
  await assert.rejects(createSharedMapRuntime(args),/synthetic runtime setup/);assert.equal(loads,1);assert.equal(calls,1);assert.equal(context.sources.metrics().staticIndexBins,0);
  f.descriptor.support.rootTraces=[];let report;await assert.rejects(createSharedMapRuntime({...args,onInputReport:r=>report=r}),MapInputNotReadyError);assert.equal(calls,1);assert.equal(report.status,'NOT_READY');assert.equal(context.sources.metrics().transformedQueries,0);
});

test('projection fetch verifies pinned bytes and abort before interpreting geometry',async()=>{
  const originalFetch=globalThis.fetch,bytes=new TextEncoder().encode('{"metadata":true}');let calls=0;globalThis.fetch=async()=>{calls++;return {ok:true,arrayBuffer:async()=>bytes.buffer};};try{await assert.rejects(loadMapInputJSON({path:'synthetic.json',sha256:'0'.repeat(64)}),/pin mismatch/);const controller=new AbortController();controller.abort();await assert.rejects(loadMapInputJSON({path:'synthetic.json',sha256:'0'.repeat(64)},controller.signal),/abort/i);assert.equal(calls,1);}finally{globalThis.fetch=originalFetch;}
});

test('source binding failure is named and releases provider/pins without a native birth',async()=>{
  const f=inputFixture();f.descriptor.support.bonds[0].parent.bindingPlan.cell=[8,0,0];const c=compile(f);try{await c.prepareInputs();const before=sceneCompileDiagnostics().calls;assert.throws(()=>c.createQuerySource(),error=>error.code==='MAP_INPUT_NOT_READY'&&error.report.phase==='SOURCE_VALIDATION');assert.equal(sceneCompileDiagnostics().calls,before);assert.equal(c.sources.metrics().nativeBlueprints,0);assert.equal(c.metrics().inputs.activeBindings,0);}finally{c.dispose();}
});

test('explicit reviewed dual endpoints retain separate points/selectors and cells before genuine birth',async()=>{
  const f=inputFixture(),b=f.descriptor.support.bonds[2];b.proofKind='dual-endpoint-bearing-source-proposal';f.policy.proofKinds=['bearing-face-v1','dual-endpoint-bearing-source-proposal'];
  for(const e of [b.parent,b.child])e.selector={min:[.3,.12,.2],max:[.5,.13,.3]};
  // The two authored source faces coincide in this synthetic control. Select
  // different own interior witnesses inside the unchanged native port limit.
  b.child.point=[.375+.000001,.125,.25];b.child.bindingPlan.surfacePoint=b.child.point;
  const c=compile(f);let w;try{await c.prepareInputs();w=world(c);assert.equal(c.inputReport.plan.support.bonds[2].parent.point[0],.375);assert.equal(c.inputReport.plan.support.bonds[2].child.point[0],.375+.000001);w.activation.ensurePoint([.375,0,.25]);assert.ok(w.trial.supportGraph.snapshot().ports.find(p=>p.id==='upper-port').live);}finally{w?.dispose();c.dispose();}
});

test('actual metadata recognizes the accepted two source roots while refusing unbound native derivation',()=>{
  const root='assets/runtime/map-inputs/new-york/saddle6-01-v1/',read=p=>JSON.parse(fs.readFileSync(p,'utf8')),p=read(root+'pilot-plan.json'),policy=read(root+'admission-policy.json'),inventory=read('docs/engineering/shared-maps/existing-host-inputs-v1/metadata-inventory.json'),before=sceneCompileDiagnostics().calls,report=inspectSharedMapInputs(p,inventory,policy);
  assert.equal(report.status,'NOT_READY');assert.equal(p.context.reviewedSourceRoots.status,'BOTH_ORIGINAL_LOWER_PARENTS_SOURCE_ROOTED');assert.equal(p.context.reviewedSourceRoots.counts.distinctOriginalParts,36);assert.equal(p.support.rootTraces.length,2);assert.ok(p.support.rootTraces.every(t=>t.bondIds.length===16));assert.ok(!report.findings.some(f=>['LOWER_ROOT_NOT_READY','PROOF_KIND_NOT_READY','ROOT_TRACE_INCOMPLETE_OR_DEPENDENT'].includes(f.code)));assert.ok(report.findings.some(f=>f.code==='BIRTH_DERIVATION_PLAN_UNBOUND'));assert.equal(sceneCompileDiagnostics().calls,before);assert.equal(p.pendingAdditions.reduce((n,r)=>n+r.ids.length,0),163);assert.equal(p.projections[0].owner.fuelAmount,.04011965567822286);
});

test('reviewed native-panel solid projections keep original physical endpoint authority',async()=>{
  const f=inputFixture();f.index.carriers[1].quantityRule='wall-area';Object.assign(f.descriptor.parts[1].surfacePlan,{definitions:1,triangles:2});for(const b of f.descriptor.support.bonds)for(const e of [b.parent,b.child])if(e.partId==='fit'){e.bindingPlan.suffix='plane';e.bindingPlan.channel='solid';e.bindingPlan.surfacePoint=[e.point[0],.0625,e.point[2]];}
  const c=compile(f);let w;try{await c.prepareInputs();w=world(c);w.activation.ensurePoint([.375,0,.25]);assert.ok(w.trial.supportGraph.snapshot().ports.every(p=>p.live));assert.equal(c.sources.metrics().transformedQueries,4);assert.equal(c.sources.metrics().nativePartTransforms,0);}finally{w?.dispose();c.dispose();}
});
