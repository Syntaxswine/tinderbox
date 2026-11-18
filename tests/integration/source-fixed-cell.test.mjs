import test,{after} from 'node:test';
import assert from 'node:assert/strict';
import {selectFixedSourceCell} from '../../src/content/source-fixed-cell.js';
import {deriveSharedSourceEndpoint,prepareSharedMapSourceInputs,restoreSavedSourceFacetSharing} from '../../src/content/shared-map-source-preparation.js';
import {compileSharedMap} from '../../src/content/shared-map.js';
import {inputFixture} from '../fixtures/shared-map-input-data.mjs';
import {originalMaterialComponents} from '../../src/simulation/original-support-ports.js';
import {createSourceCarrierLedger} from '../../src/simulation/source-carriers.js';
import {createTrial,calmWind,trialDiagnostics,limitDiagnosticTrialSteps} from '../../workbenches/furnished-house/simulation.js';
import {sceneCompileDiagnostics} from '../../workbenches/furnished-house/scene.js';
import {segmentTriangle} from '../../workbenches/furnished-house/geometry.js';
const grid={origin:[0,0,0],pitch:[.5,1.06,.5]},quad=(x0,x1,z0,z1,y=z=>0)=>({triangles:[[[x0,y(z0),z0],[x0,y(z1),z1],[x1,y(z1),z1]],[[x0,y(z0),z0],[x1,y(z1),z1],[x1,y(z0),z0]]]}),resources=[];limitDiagnosticTrialSteps(64);
after(()=>console.log('FIXED_CELL_RESOURCES '+JSON.stringify({resources,compiler:sceneCompileDiagnostics(),trial:trialDiagnostics(),actualSavedCompletions:0,actualSourceTransforms:0})));

test('fixed cell keeps valid floor ownership, chooses occupied lexicographic incidents and rejects empty/outside patches',()=>{
  const interior=selectFixedSourceCell(quad(.125,.875,.125,.875),[.375,0,.25],grid);assert.deepEqual(interior.cell,[0,0,0]);assert.equal(interior.reason,'CURRENT_FLOOR_CELL_VALID');
  const corner=selectFixedSourceCell(quad(.125,.875,.125,.875,z=>2.12*z),[.5,1.06,.5],grid);assert.deepEqual(corner.cell,[1,1,1]);assert.equal(corner.candidates.length,8);assert.equal(corner.reason,'CURRENT_FLOOR_CELL_VALID');
  const tie=selectFixedSourceCell(quad(.125,1,.125,1.125),[1,0,.5],grid);assert.deepEqual(tie.floorCell,[2,0,1]);assert.deepEqual(tie.cell,[1,0,0]);assert.equal(tie.reason,'LEXICOGRAPHIC_OCCUPIED_INCIDENT_CELL');assert.ok(tie.selectedPatchArea>=tie.positivePatchThreshold);assert.ok(tie.candidates.length<=8);
  const sourceMaximum=selectFixedSourceCell(quad(.125,1,.125,1),[1,0,1],grid);assert.deepEqual(sourceMaximum.cell,[1,0,1]);assert.ok(sourceMaximum.candidates.every(c=>c.cell.every((v,i)=>v>=sourceMaximum.sourceSpan.min[i]&&v<=sourceMaximum.sourceSpan.max[i])));
  assert.equal(selectFixedSourceCell(quad(.125,.875,.125,.875),[2,0,2],grid).status,'UNBOUND');assert.equal(selectFixedSourceCell({triangles:[]},[0,0,0],grid).status,'UNBOUND');assert.equal(selectFixedSourceCell({triangles:[[[.25,0,.25],[.2501,0,.25],[.25,0,.2501]]]},[.250025,0,.250025],grid).status,'UNBOUND');
});

test('genuine boundary-cell birth agrees with mapper and retirement never substitutes another incident record',async()=>{
  const f=inputFixture({boundaryRoofPort:true}),c=compileSharedMap(f.index,f.library,f.navigation,{inputFactory:f.factory()});let q,ledger,trial,activation;
  try{await c.prepareInputs();q=c.createQuerySource();const bond=c.inputReport.plan.support.bonds.find(b=>b.id==='roof-port'),mappings={};for(const side of ['parent','child']){const e=bond[side],pin=q.pinOriginal(e.partId);try{mappings[side]=deriveSharedSourceEndpoint({endpoint:e,part:{triangles:pin.shape.triangles},components:originalMaterialComponents(pin.shape.triangles),surfaces:c.sources.sourcesForCarrier(c.model.partById.get(e.partId).carrierId).surfaces,grid});}finally{pin.release();}}
    assert.deepEqual(mappings.parent.bindingPlan.cell,[3,0,0]);assert.deepEqual(mappings.child.bindingPlan.cell,[2,0,0]);assert.equal(mappings.child.cellOwnership.reason,'LEXICOGRAPHIC_OCCUPIED_INCIDENT_CELL');assert.deepEqual(bond.child.point,[1.5,0,.25]);
    ledger=createSourceCarrierLedger(c.sourceCarriers,{modes:c.sourceOwnerModes});trial=createTrial(c.data,{querySource:q,supportGraphFactory:c.supportGraphFactory,wind:calmWind});activation=c.createActivation({trial,querySource:q,ledger});activation.ensurePoint([.375,0,.25]);assert.ok(trial.supportGraph.snapshot().ports.every(p=>p.live));
    const port=trial.supportGraph.snapshot().ports.find(p=>p.id==='roof-port'),fixed=trial.scene.index.surfaces.get(port.parent),child=trial.scene.index.surfaces.get(port.child);assert.deepEqual(fixed.sourceCell,mappings.parent.bindingPlan.cell);assert.deepEqual(child.sourceCell,mappings.child.bindingPlan.cell);
    const replacement=[...trial.scene.index.surfaces.values()].find(b=>!b.queryOnly&&b.nativePartId==='roof'&&b.id!==fixed.id&&b.intact&&b.triangles.some(t=>segmentTriangle(bond.parent.point,bond.parent.point,t)!==null));assert.ok(replacement,'A different genuine incident record still contains the same fixed point');
    activation.prepare({retireRecords:[fixed.id]}).publish();assert.equal(trial.supportGraph.snapshot().ports.find(p=>p.id==='roof-port').live,false);assert.equal(replacement.intact,true);assert.ok(trial.supportGraph.unsupported().some(b=>b.nativePartId==='fit'));assert.ok(trial.supportGraph.unsupported().some(b=>b.nativePartId==='upper'));assert.equal(trial.supportGraph.diagnostics().fixedNativePorts,6);assert.equal(trial.tick,0);assert.equal(c.sources.metrics().transformedQueries,4);
  }finally{activation?.dispose();trial?.dispose();q?.dispose();ledger?.dispose();if(q)resources.push({query:q.metrics(),geometry:c.sources.metrics(),logicalCells:32,thermalTriangles:28});c.dispose();}
});

test('factory refuses a floor cell outside the canonical loop even when the fixed source witness is valid',async()=>{
  const f=inputFixture({boundaryRoofPort:true});f.descriptor.support.bonds[1].child.bindingPlan.cell=[3,0,0];const c=compileSharedMap(f.index,f.library,f.navigation,{inputFactory:f.factory()});try{await c.prepareInputs();const before=sceneCompileDiagnostics().calls;assert.throws(()=>c.createQuerySource(),error=>error.code==='MAP_INPUT_NOT_READY'&&error.report.phase==='SOURCE_VALIDATION');assert.equal(sceneCompileDiagnostics().calls,before);assert.equal(c.sources.metrics().nativeBlueprints,0);}finally{c.dispose();}
});

test('saved JSON restores exact facet sharing while native-panel planes remain derived and mapper results agree',async()=>{
  const f=inputFixture({boundaryRoofPort:true});f.index.carriers[0].quantityRule='top-area';const c=compileSharedMap(f.index,f.library,f.navigation);let world,blueprints;
  try{const r=await prepareSharedMapSourceInputs({compiled:c,descriptor:f.descriptor,policy:f.policy,budget:{owners:4,parts:4,physicalTriangles:28},loadProjection:f.loadProjection,onWorldTable:v=>world=v,onBlueprints:v=>blueprints=v}),saved=JSON.parse(JSON.stringify({world,blueprints})),e=f.descriptor.support.bonds[1].child,part=saved.world.parts.find(p=>p.id===e.partId);assert.throws(()=>deriveSharedSourceEndpoint({endpoint:e,part,components:part.components,surfaces:saved.blueprints.surfaces,grid}),/SOURCE_PROJECTION_NOT_UNIQUE/);
    const restoration=restoreSavedSourceFacetSharing(saved);assert.equal(restoration.derivedPlanes,1);assert.equal(restoration.restoredDerivedPlaneReferences,0);const floorPart=saved.world.parts.find(p=>p.id==='floor'),plane=saved.blueprints.surfaces.find(s=>s.nativePartId==='floor');assert.ok(plane.id.endsWith('/plane'));assert.ok(plane.triangles.every(t=>!floorPart.triangles.includes(t)));assert.deepEqual(plane.triangles[0],floorPart.triangles[6]);
    for(const b of f.descriptor.support.bonds)for(const side of ['parent','child']){const endpoint=b[side],p=saved.world.parts.find(p=>p.id===endpoint.partId),mapped=deriveSharedSourceEndpoint({endpoint,part:p,components:p.components,surfaces:saved.blueprints.surfaces,grid}),before=r.endpoints.find(e=>e.bondId===b.id&&e.side===side);assert.deepEqual(mapped.bindingPlan,before.bindingPlan);if(endpoint.partId==='floor')assert.equal(mapped.bindingPlan.channel,'solid');}
  }finally{c.dispose();}
});
