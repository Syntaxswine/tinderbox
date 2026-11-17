import test from 'node:test';
import assert from 'node:assert/strict';
import {createTrial} from '../../workbenches/furnished-house/simulation.js';
import {createSourceQueryRegistry} from '../../src/runtime/source-query-registry.js';
import {boxTriangles} from '../../src/runtime/native-query-registry.js';
import {createSourceCarrierLedger} from '../../src/simulation/source-carriers.js';
import {createSourceActivation} from '../../src/simulation/source-activation.js';
import {createSourceSupportGraph} from '../../src/simulation/source-support.js';

function fixture(){
  const box=(min,max)=>({min,max}),floor=box([0,0,0],[4,.12,1]),left=box([.1,1.12,.1],[.3,1.32,.3]),right=box([3.6,1.12,.1],[3.8,1.32,.3]);
  const carriers=[{id:'f::floor',fuelClass:'frame',fuelAmount:4,bounds:floor,anchors:[{kind:'native-ground-contact',elevation:0}],supports:[],supportEvidence:[],attachments:[],adjacency:[],parts:[0]},...[['left',left],['right',right]].map(([name,bounds],i)=>({id:'f::'+name,fuelClass:null,fuelAmount:0,bounds,anchors:[],supports:['f::floor'],supportEvidence:[],attachments:[{parent:'f::floor',kind:'fixed-assembly-mount',childRegion:{bounds},parentRegion:{bounds:box([bounds.min[0],.119,bounds.min[2]],[bounds.max[0],.121,bounds.max[2]])}}],adjacency:[],parts:[i+1]}))];
  const parts=carriers.map(c=>({id:c.id+'/part',carrierId:c.id,bounds:c.bounds,physical:true,material:c.fuelClass?'timber':'metal'})),model={carriers,parts,carrierById:new Map(carriers.map(c=>[c.id,c]))};
  const navigation={version:1,placeId:'f',surfaces:[{id:'terrain',terrain:true,height:0,polygons:[[[-1,-1],[5,-1],[5,2],[-1,2]]],holes:[]}],ceilings:[],blockers:[],portals:[],collisionShapes:{}};
  const querySource=createSourceQueryRegistry({navigation,parts,shapeForPart:id=>({triangles:boxTriangles(parts.find(p=>p.id===id).bounds),closed:true})}),ledger=createSourceCarrierLedger(carriers);
  const data={version:1,runtimeAdapterVersion:1,prefabId:'support-fixture',sourceBounds:box([-1,0,-1],[5,4,2]),implicitGround:false,gridOrigin:[0,0,0],thermalCell:[.5,1.06,.5],surfaces:[],openings:[],items:[],furnitureParts:[],stores:[],render:{geometry:[],materials:[]},scene:{version:1,instances:[{id:'f'}],doors:[]}};
  const trial=createTrial(data,{executionCache:true,querySource,supportGraphFactory:scene=>createSourceSupportGraph({scene,model,querySource})});
  const sources={order:id=>carriers.findIndex(c=>c.id===id),near:()=>[],sourcesForCarrier(id){const c=model.carrierById.get(id),p=parts[c.parts[0]],b=c.bounds;
    if(c.fuelClass)return {surfaces:[{id:id+'/top',sourceCarrierId:id,sourceMeshBindings:[p.id],kind:'floor',normal:[0,1,0],thickness:.12,material:'timber',fuelClass:'frame',fuelAmount:4,triangles:[[[0,.12,0],[4,.12,1],[4,.12,0]],[[0,.12,0],[0,.12,1],[4,.12,1]]]}]};
    return {surfaces:boxTriangles(b).map((t,i)=>({id:id+'/face/'+i,sourceCarrierId:id,sourceMeshBindings:[p.id],kind:'wall',material:'metal',fuelAmount:0,nativeInertBody:true,supports:true,supportFromMesh:true,triangles:[t],solidTriangles:[t],closedShape:false}))};
  }};
  const activation=createSourceActivation({trial,querySource,ledger,sources});return {trial,activation,ledger,querySource,dispose(){activation.dispose();trial.dispose();querySource.dispose();ledger.dispose();}};
}

test('a declared local mount loses only its damaged parent patch, including a still-cold child, and inert material lands without fuel',()=>{
  const f=fixture();try{
    f.activation.ensure(['f::floor','f::right']);f.trial.step();assert.equal(f.trial.supportGraph.diagnostics().unresolvedInitial,0);
    assert.equal(f.trial.snapshot().falls.length,0);assert.equal(f.ledger.metrics().activeCarriers,2);
    for(const b of f.trial.boundariesForSource('f::floor/top'))if(b.bounds.max[0]<.50001&&b.bounds.max[2]<.50001)f.trial.scene.index.change(b.id,{intact:false});
    assert.deepEqual(f.trial.supportGraph.pendingSources(),['f::left']);f.activation.beforeStep();assert.equal(f.ledger.metrics().activeCarriers,3);f.trial.step();
    assert.ok(f.trial.snapshot().falls.length);assert.ok(f.trial.boundariesForSource('f::right/face/0').every(b=>b.intact));
    for(let i=0;i<35;i++){f.activation.beforeStep();f.trial.step();}
    const s=f.trial.snapshot(),debris=s.rubble.filter(r=>r.inert);assert.ok(debris.length);assert.ok(debris.every(r=>r.kind==='metal'&&r.fuelIds.length===0));assert.equal(s.falls.length,0);
    const body=f.trial.scene.index.surfaces.get(debris[0].bodyBoundaryId);assert.equal(body.intact,true);assert.equal(body.transmission,0);assert.ok(body.bounds.max[1]<.3);
    assert.ok(f.trial.scene.index.trace([0,.1,.2],[.5,.1,.2]).hits.some(h=>h.surface.id===body.id),'Landed metal retains its real opaque geometry');
    assert.equal(f.trial.scene.fuels.size,[...f.trial.scene.fuels.values()].filter(f=>f.sourceSurfaceId==='f::floor/top').length);assert.ok(Math.abs(f.ledger.metrics(s.metrics.fuel).world.added)<1e-7);
    assert.equal(f.activation.ensure(['f::left']),false);assert.ok(f.querySource.isClaimedPart('f::left/part'));
  }finally{f.dispose();}
});
