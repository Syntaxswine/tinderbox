import test,{after} from 'node:test';
import assert from 'node:assert/strict';
import {selectFixedSourceCell} from '../../src/content/source-fixed-cell.js';
import {deriveSharedSourceEndpoint} from '../../src/content/shared-map-source-preparation.js';
import {compileSharedMap} from '../../src/content/shared-map.js';
import {originalMaterialComponents} from '../../src/simulation/original-support-ports.js';
import {createSourceCarrierLedger} from '../../src/simulation/source-carriers.js';
import {compileScene,sceneCompileDiagnostics} from '../../workbenches/furnished-house/scene.js';
import {createTrial,trialDiagnostics,limitDiagnosticTrialSteps,calmWind} from '../../workbenches/furnished-house/simulation.js';
import {segmentTriangle,EPS} from '../../workbenches/furnished-house/geometry.js';
import {precisionWall,precisionWallFixture,wallGrid as grid} from '../fixtures/source-fixed-cell-wall-data.mjs';
const evidence=[],resources=[],options=[{height:2.12,axis:'x'},{height:2.12,axis:'z'},{height:4.24,axis:'x'},{height:4.24,axis:'z'}];limitDiagnosticTrialSteps(64);
after(()=>console.log('NATIVE_CELL_RESOURCES '+JSON.stringify({evidence,resources,compiler:sceneCompileDiagnostics(),trial:trialDiagnostics(),actualSavedValidations:0,actualSourceTransforms:0})));

test('native Float32 retained patches own fixed points around 2.12 and 4.24 in both wall orientations',()=>{
  const outcomes=[];
  for(const option of options){const wall=precisionWall(option),source={...wall,id:'precision-wall',material:'timber',kind:'wall',fuelAmount:0},scene=compileScene({version:1,runtimeAdapterVersion:1,implicitGround:false,gridOrigin:grid.origin,thermalCell:grid.pitch,internalHybrid:true,hybridSourceRevision:'a'.repeat(64),surfaces:[source],openings:[],items:[],furnitureParts:[],stores:[]}),native=[...scene.index.surfaces.values()].filter(b=>b.sourceCell.every((v,i)=>v===wall.cell[i])),member=native.some(b=>b.triangles.some(t=>segmentTriangle(wall.point,wall.point,t)!==null)),mapped=selectFixedSourceCell(wall,wall.point,grid);assert.equal(native.length,1);assert.equal(member,true);assert.ok(wall.point[1]<(option.height-EPS));evidence.push({...option,point:wall.point,bottom:wall.bottom,nativeCell:native[0].sourceCell,nativeTriangles:native[0].triangles.length,nativePointMember:member,oldSingleExpandedLowerBound:option.height-EPS,mapped});outcomes.push(mapped.status==='FIXED_SOURCE_CELL_DERIVED'&&mapped.cell.every((v,i)=>v===wall.cell[i]));}
  assert.deepEqual(outcomes,[true,true,true,true],'Each genuine upper native patch contains the fixed point and must be available to the mapper');
});

test('a positive nearby native patch cannot bind a point absent from retained triangles',()=>{
  const positive=[[[.125,0,.35],[.125,0,.45],[.375,0,.45]],[[.125,0,.35],[.375,0,.45],[.375,0,.35]]],tiny=[[[.25,0,.25],[.2501,0,.25],[.25,0,.2501]]],point=[.250025,0,.250025],mapped=selectFixedSourceCell({triangles:[...positive,...tiny]},point,grid);assert.equal(mapped.status,'UNBOUND');assert.equal(selectFixedSourceCell({triangles:tiny},point,grid).status,'UNBOUND');assert.equal(selectFixedSourceCell({triangles:positive},[.25,0,.25],grid).status,'UNBOUND');assert.equal(selectFixedSourceCell({triangles:[]},point,grid).status,'UNBOUND');
  const shifted=precisionWall();assert.equal(selectFixedSourceCell(shifted,[.5,shifted.bottom-1e-4,.5],grid).status,'UNBOUND');evidence.push({negative:'positive-nearby-patch-with-missing-retained-point',result:mapped});
});

test('factory and mapper agree at genuine Float32 native birth and fixed retirement never substitutes',async()=>{
  for(const option of options){const f=precisionWallFixture(option),compiled=compileSharedMap(f.index,f.library,f.navigation,{inputFactory:f.factory()});let query,ledger,trial,activation;
    try{await compiled.prepareInputs();query=compiled.createQuerySource();const bond=compiled.inputReport.plan.support.bonds[0],endpoint=bond.parent,pin=query.pinOriginal(endpoint.partId);let mapped;
      try{mapped=deriveSharedSourceEndpoint({endpoint,part:{triangles:pin.shape.triangles},components:originalMaterialComponents(pin.shape.triangles),surfaces:compiled.sources.sourcesForCarrier(compiled.model.partById.get(endpoint.partId).carrierId).surfaces,grid});}finally{pin.release();}
      assert.deepEqual(mapped.bindingPlan.cell,f.wall.cell);ledger=createSourceCarrierLedger(compiled.sourceCarriers,{modes:compiled.sourceOwnerModes});trial=createTrial(compiled.data,{querySource:query,supportGraphFactory:compiled.supportGraphFactory,wind:calmWind});activation=compiled.createActivation({trial,querySource:query,ledger});activation.ensurePoint(f.wall.point);assert.ok(trial.supportGraph.snapshot().ports.every(p=>p.live));
      const port=trial.supportGraph.snapshot().ports.find(p=>p.id==='lower-a'),fixed=trial.scene.index.surfaces.get(port.parent),neighbor=[...trial.scene.index.surfaces.values()].find(b=>!b.queryOnly&&b.nativePartId==='root-a'&&b.id!==fixed.id&&b.intact&&b.triangles.some(t=>segmentTriangle(f.wall.point,f.wall.point,t)!==null));assert.deepEqual(fixed.sourceCell,f.wall.cell);assert.ok(neighbor,'A genuine neighboring record remains an incident point owner');
      activation.prepare({retireRecords:[fixed.id]}).publish();assert.equal(neighbor.intact,true);assert.equal(trial.supportGraph.snapshot().ports.find(p=>p.id==='lower-a').live,false);assert.equal(trial.supportGraph.diagnostics().fixedNativePorts,6);assert.ok(trial.supportGraph.unsupported().some(b=>b.nativePartId==='fit'));assert.ok(trial.supportGraph.unsupported().some(b=>b.nativePartId==='upper'));assert.equal(trial.tick,0);assert.equal(compiled.sources.metrics().transformedQueries,4);evidence.push({...option,genuineBirth:true,fixedCell:fixed.sourceCell,retiredId:fixed.id,neighborId:neighbor.id,fixedPortRemainsBroken:true});
    }finally{activation?.dispose();trial?.dispose();query?.dispose();ledger?.dispose();if(query)resources.push({option,logicalCells:f.logicalCells,thermalTriangles:f.thermalTriangles,query:query.metrics(),geometry:compiled.sources.metrics()});compiled.dispose();}
  }
});
