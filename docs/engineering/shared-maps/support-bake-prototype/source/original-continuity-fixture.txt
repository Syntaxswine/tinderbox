import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import {createBoundaryIndex,bounds} from '../../workbenches/furnished-house/geometry.js';
import {createTrial} from '../../workbenches/furnished-house/simulation.js';
import {supportSurfacesTouch} from '../../workbenches/furnished-house/support.js';
import {boxTriangles} from '../../src/runtime/native-query-registry.js';
import {visitSourceContinuityCandidates} from '../../src/simulation/source-support.js';
import {compileSharedMap} from '../../src/content/shared-map.js';
import {FIRST_SUPPORT_CONTROLS} from '../../src/content/map-source-support-overrides.js';
import {createSceneThermal} from '../../src/simulation/scene-thermal.js';
import {DEFAULT_CONFIG} from '../../src/simulation/index.js';

const geometry=b=>structuredClone({bounds:b.bounds,triangles:b.triangles,solidTriangles:b.solidTriangles,closedTriangles:b.closedTriangles,closedSolidTriangles:b.closedSolidTriangles,kind:b.kind,normal:b.normal,closedNormal:b.closedNormal,thickness:b.thickness,sourceCarrierId:b.sourceCarrierId,intact:b.intact,openFraction:b.openFraction});
function parity(index,nodes,list){
  const expected=list.map(a=>({id:a.id,geometry:geometry(a),candidates:index.candidates(a.bounds).filter(b=>b.sourceCarrierId===a.sourceCarrierId&&nodes.has(b.id)).map(b=>({id:b.id,geometry:geometry(b)}))}));
  const originalCandidates=index.candidates,originalWatch=index.watch,revision=index.revision,membership=index.membershipRevision,actual=[];
  index.candidates=()=>{throw Error('The local visit must not query the global broadphase');};index.watch=()=>{throw Error('The local visit must not create global subscriptions');};
  let statistics;try{
    statistics=visitSourceContinuityCandidates(index,nodes,list,(a,candidates)=>{assert.equal(a,index.surfaces.get(a.id));for(const b of candidates)assert.equal(b,index.surfaces.get(b.id),'The actual predicate receives the current global object');actual.push({id:a.id,geometry:geometry(a),candidates:candidates.map(b=>({id:b.id,geometry:geometry(b)}))});});
  }finally{index.candidates=originalCandidates;index.watch=originalWatch;}
  assert.deepEqual(actual,expected,'Exact candidate order and every current geometry/pose field agree');assert.equal(index.revision,revision);assert.equal(index.membershipRevision,membership);assert.equal(statistics.records,list.length);assert.ok(statistics.memberships>=list.length);
  return statistics;
}
const record=(id,carrier,box)=>({id,sourceCarrierId:carrier,kind:'wall',normal:[0,1,0],thickness:.16,bounds:box,triangles:boxTriangles(box),solidTriangles:boxTriangles(box)});

test('local native candidates preserve order/current geometry with unrelated overlapping active and cold records',()=>{
  const box={min:[0,0,0],max:[1,2,.16]},index=createBoundaryIndex([record('c::z','c',box),record('c::a','c',box),record('other::a','other',box)]),nodes=new Map(index.surfaces),list=[nodes.get('c::z'),nodes.get('c::a')];
  const cold=index.put({...record('cold::same-carrier','c',box),queryOnly:true});let coldReads=0;for(const key of ['triangles','solidTriangles'])Object.defineProperty(cold,key,{get(){coldReads++;throw Error('Cold geometry must stay unexpanded');}});
  parity(index,nodes,list);assert.equal(coldReads,0);
  for(const patch of [{kind:'floor',thickness:.4},{normal:[0,0,-1]},{intact:false},{bounds:{min:[3.1,0,0],max:[4.1,2,.16]},triangles:boxTriangles({min:[3.1,0,0],max:[4.1,2,.16]}),solidTriangles:boxTriangles({min:[3.1,0,0],max:[4.1,2,.16]})}]){index.change('c::a',patch);parity(index,nodes,list);}
  assert.equal(coldReads,0);
});

test('actual clipped door fragments and retired original patches keep authoritative geometry after native poses',()=>{
  const floor={id:'f::floor/top',sourceCarrierId:'f::floor',kind:'floor',material:'timber',fuelClass:'frame',fuelAmount:1,normal:[0,1,0],thickness:.12,supports:true,triangles:[[[0,0,0],[2,0,2],[2,0,0]],[[0,0,0],[0,0,2],[2,0,2]]]},leaf={id:'f::door/leaf',sourceCarrierId:'f::door',kind:'wall',material:'metal',fuelAmount:0,nativeInertBody:true,normal:[0,0,1],thickness:.12,supports:true,triangles:[[[.5,0,.5],[1.5,0,.5],[1.5,1.65,.5]],[[.5,0,.5],[1.5,1.65,.5],[.5,1.65,.5]]]};
  const trial=createTrial({version:1,runtimeAdapterVersion:1,prefabId:'continuity-pose-control',sourceBounds:{min:[-1,-1,-1],max:[3,3,3]},implicitGround:false,gridOrigin:[0,0,0],thermalCell:[.5,1.06,.5],surfaces:[floor,leaf],openings:[{id:'door',surfaceId:leaf.id,kind:'door',pivot:[.5,0,.5],maxOpenAngle:Math.PI/2}],items:[],furnitureParts:[],stores:[],render:{geometry:[],materials:[]},scene:{version:1,instances:[{id:'f'}],doors:[]}},{executionCache:true});
  try{
    const index=trial.scene.index,nodes=new Map(index.surfaces),lists=new Map();for(const b of nodes.values()){if(!lists.has(b.sourceCarrierId))lists.set(b.sourceCarrierId,[]);lists.get(b.sourceCarrierId).push(b);}
    for(const list of lists.values())parity(index,nodes,list);
    for(const open of [true,false,true]){trial.command({type:'opening',id:'door',open});trial.step();for(const list of lists.values())parity(index,nodes,list);}
    const original=lists.get('f::door')[0];index.change(original.id,{intact:false});parity(index,nodes,lists.get('f::door'));assert.equal(nodes.get(original.id),original);
  }finally{trial.dispose();}
});

test('asymmetric open-facet predicate arguments retain the exact original ID-directed order',()=>{
  for(const reverse of [false,true]){
    const a={id:reverse?'c::b':'c::a',sourceCarrierId:'c',kind:'attachment',normal:[0,0,1],thickness:0,triangles:[[[-2,-2,0],[2,-2,0],[0,2,0]]]},b={id:reverse?'c::a':'c::b',sourceCarrierId:'c',kind:'attachment',normal:[1,0,0],thickness:0,triangles:[[[0,-.5,-1],[0,-.5,1],[0,.5,1]]]};
    for(const r of [a,b]){r.bounds=bounds(r.triangles.flat());r.solidTriangles=r.triangles;}
    const index=createBoundaryIndex([a,b]),nodes=new Map(index.surfaces),list=[...nodes.values()];parity(index,nodes,list);
    const expected=[],actual=[];for(const first of list)for(const second of index.candidates(first.bounds))if(first.id<second.id&&second.sourceCarrierId===first.sourceCarrierId&&nodes.has(second.id))expected.push([first.id,second.id,supportSurfacesTouch(first,second)]);
    visitSourceContinuityCandidates(index,nodes,list,(first,candidates)=>{for(const second of candidates)if(first.id<second.id&&second.sourceCarrierId===first.sourceCarrierId&&nodes.has(second.id))actual.push([first.id,second.id,supportSurfacesTouch(first,second)]);});
    assert.deepEqual(actual,expected);assert.equal(actual[0][2],reverse);
  }
});

test('the native one-metre membership count is bounded and no stale owner copy can enter the visit',()=>{
  const index=createBoundaryIndex([{id:'c::plane',sourceCarrierId:'c',kind:'wall',normal:[0,1,0],thickness:0,triangles:[[[0,0,0],[0,0,1],[1,0,0]]]}]),nodes=new Map(index.surfaces),list=[nodes.get('c::plane')];
  assert.deepEqual(parity(index,nodes,list),{records:1,memberships:18});let called=false;
  assert.throws(()=>visitSourceContinuityCandidates(index,nodes,[{...list[0]}],()=>{called=true;}),/authoritative registered/);assert.equal(called,false);
});

test('the accepted ten New York support controls retain every ordered native candidate without another source transform or fuel birth',()=>{
  const read=p=>JSON.parse(fs.readFileSync(new URL('../../'+p,import.meta.url))),compiled=compileSharedMap(read('assets/runtime/map-sources/new-york/index.json'),read('assets/runtime/map-sources/new-york/library.json'),read('assets/art/place-scenes/new-york/navigation.json')),create=compiled.createActivation;let activation;
  compiled.createActivation=options=>(activation=create(options));
  const state={player:{id:'continuity-control',x:56,y:14,elevation:0,height:1.66,radius:.5,hp:100},actors:[],tick:0,clocks:{world:0}},provider=createSceneThermal({compiled,state,definition:compiled.definition,config:DEFAULT_CONFIG,event:()=>{}});
  try{
    activation.ensure([...new Set(FIRST_SUPPORT_CONTROLS.flatMap(r=>r.slice(0,2)).map(id=>'new-york::'+id))]);provider.trial.step();
    const nodes=provider.trial.supportGraph.nodes,lists=new Map();for(const b of nodes.values()){if(!lists.has(b.sourceCarrierId))lists.set(b.sourceCarrierId,[]);lists.get(b.sourceCarrierId).push(b);}
    const before=compiled.metrics(),fuel=provider.trial.metrics().fuel,tick=provider.trial.tick;
    for(const list of lists.values())parity(provider.trial.scene.index,nodes,list);
    assert.deepEqual(compiled.metrics(),before);assert.deepEqual(provider.trial.metrics().fuel,fuel);assert.equal(provider.trial.tick,tick);assert.equal(compiled.model.carriers.length,12446);
  }finally{provider.dispose();compiled.dispose();}
});
