import test,{after} from 'node:test';
import assert from 'node:assert/strict';
import {inputFixture} from '../fixtures/shared-map-input-data.mjs';
import {compileSharedMap} from '../../src/content/shared-map.js';
import {preflightSharedMapSourcePreparation,prepareSharedMapSourceInputs} from '../../src/content/shared-map-source-preparation.js';
import {sharedMapInputInventory} from '../../src/content/shared-map-inputs.js';
import {sceneCompileDiagnostics} from '../../workbenches/furnished-house/scene.js';
import {trialDiagnostics,limitDiagnosticTrialSteps} from '../../workbenches/furnished-house/simulation.js';
limitDiagnosticTrialSteps(64);const evidence=[];
const compile=f=>compileSharedMap(f.index,f.library,f.navigation),budget={owners:4,parts:4,physicalTriangles:28};
const prepare=(f,c,options={})=>prepareSharedMapSourceInputs({compiled:c,descriptor:f.descriptor,policy:f.policy,budget,loadProjection:f.loadProjection,...options});
after(()=>console.log('SOURCE_PREPARATION_SYNTHETIC '+JSON.stringify({evidence,compiler:sceneCompileDiagnostics(),trial:trialDiagnostics(),actualNewYorkSourcePreparations:0})));

test('source-only preparation borrows originals once, derives unchanged own witnesses and preserves full finish allocation',async()=>{
  const f=inputFixture({dualUpper:true});f.index.carriers[0].finish={fuelClass:'lacquer',amount:.025};f.descriptor.owners[0].finish={fuelClass:'lacquer',amount:.025};const c=compile(f),before=sceneCompileDiagnostics().calls,original=structuredClone(f.descriptor);let table,blueprints;
  try{const r=await prepare(f,c,{onWorldTable:v=>table=v,onBlueprints:v=>blueprints=v});assert.equal(sceneCompileDiagnostics().calls,before);assert.equal(r.status,'NOT_READY');assert.equal(r.findings.length,0);assert.equal(table.parts.length,4);assert.equal(table.parts.reduce((n,p)=>n+p.triangles.length,0),28);assert.equal(r.endpoints.length,6);assert.ok(r.endpoints.every(e=>e.status==='DERIVED_SOURCE_PLAN_UNREVIEWED'));assert.equal(r.resources.geometry.transformedQueries,4);assert.equal(r.resources.geometry.nativePartTransforms,0);assert.equal(r.resources.geometry.borrowedNativeParts,4);assert.equal(r.resources.query.shapeBuilds,4);assert.ok(blueprints.surfaces.length>0);assert.ok(Math.abs(r.owners[0].finishAssigned-.025)<1e-15);assert.equal(r.proposedDescriptor.support.bonds[2].child.point[0],.375+.000001);assert.deepEqual(f.descriptor,original);assert.ok(r.endpoints.every(e=>e.bindingPlan.proofRef===null&&e.bindingPlan.nativeRecordId===null));assert.equal(c.metrics().query.cachedTriangles,0);assert.equal(c.sources.metrics().nativeBlueprints,0);await assert.rejects(prepare(f,c),/SOURCE_OWNER_ALREADY_USED/);assert.equal(c.sources.metrics().transformedQueries,4);evidence.push(r.resources);}finally{c.dispose();}
});

test('source preflight refuses changed witnesses, modes, incomplete owners and budget overruns before any transform or load',async()=>{
  for(const change of [f=>f.descriptor.support.bonds[0].parent.point=[.6,0,.25],f=>f.descriptor.owners[2].mode='whole',f=>f.descriptor.owners[0].parts=[],f=>f.descriptor.parts[0].sourceRange={start:0,count:3}]){const f=inputFixture();change(f);const c=compile(f);try{const p=preflightSharedMapSourcePreparation({descriptor:f.descriptor,policy:f.policy,inventory:sharedMapInputInventory(c.model),budget});assert.equal(p.status,'NOT_READY');await assert.rejects(prepare(f,c),/SOURCE_PREFLIGHT_NOT_READY/);assert.equal(c.sources.metrics().transformedQueries,0);assert.equal(f.loads.length,0);}finally{c.dispose();}}
  const f=inputFixture(),c=compile(f);try{await assert.rejects(prepare(f,c,{budget:{...budget,physicalTriangles:27}}),/SOURCE_PREFLIGHT_NOT_READY/);assert.equal(c.sources.metrics().transformedQueries,0);}finally{c.dispose();}
});

test('known pending source contacts and every outside ordinary parent remain explicit without an expansion',async()=>{
  const f=inputFixture(),c=compile(f);f.descriptor.support.bonds[2].proofRef=null;f.descriptor.support.bonds[2].parent.point=null;f.descriptor.support.ordinaryAlternatives=[{ownerId:'fixture::roof',semantics:'ordinary alternatives',parentIds:['fixture::floor','fixture::outside'],proofRef:null,bondIds:null}];
  try{const r=await prepare(f,c,{pendingBondIds:['upper-port']});assert.deepEqual(r.findings,[{code:'PENDING_INDEPENDENT_SOURCE_PROOF',id:'upper-port'}]);assert.equal(r.endpoints.length,4);assert.equal(r.ordinaryAlternatives[0].parents[1].status,'OUTSIDE_SELECTED_COHORT_UNRESOLVED');assert.equal(c.sources.metrics().transformedQueries,4);assert.equal(c.model.parts.length,4);evidence.push(r.resources);}finally{c.dispose();}
});

test('source mapping uses the original native-panel projection without common-point or cell clamping',async()=>{
  const f=inputFixture();f.index.carriers[1].quantityRule='wall-area';const c=compile(f);try{const r=await prepare(f,c);const fit=r.endpoints.filter(e=>e.originalWitness.partId==='fit');assert.ok(fit.every(e=>e.bindingPlan.channel==='solid'&&e.bindingPlan.suffix==='plane'&&e.bindingPlan.surfacePoint[1]===.0625));assert.ok(fit.some(e=>e.originalWitness.point[1]===0));assert.ok(fit.some(e=>e.originalWitness.point[1]===.125));assert.equal(r.resources.geometry.transformedQueries,4);evidence.push(r.resources);}finally{c.dispose();}
});

test('source boundary preserves produced world evidence and disposes its registry without a retry',async()=>{
  const f=inputFixture(),c=compile(f);let table;try{await assert.rejects(prepare(f,c,{onWorldTable:v=>{table=v;throw Error('synthetic output boundary');}}),/synthetic output boundary/);assert.equal(table.parts.length,4);assert.equal(c.sources.metrics().transformedQueries,4);assert.equal(c.metrics().query.cachedShapes,0);await assert.rejects(prepare(f,c),/SOURCE_OWNER_ALREADY_USED/);}finally{c.dispose();}
});

test('source cancellation during projection loading appends nothing and transforms no source',async()=>{
  const f=inputFixture(),c=compile(f),controller=new AbortController();let resume;const gate=new Promise(resolve=>resume=resolve);try{const p=prepare(f,c,{signal:controller.signal,loadProjection:async ref=>{await gate;return f.loadProjection(ref);}});controller.abort();resume();await assert.rejects(p,/abort/i);assert.equal(c.model.parts.length,3);assert.equal(c.sources.metrics().transformedQueries,0);}finally{c.dispose();}
});
