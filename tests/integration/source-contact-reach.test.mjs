import test from 'node:test';
import assert from 'node:assert/strict';
import {createBoundaryIndex,overlaps,bounds} from '../../workbenches/furnished-house/geometry.js';
import {createTrial} from '../../workbenches/furnished-house/simulation.js';
import {supportSurfacesTouch} from '../../workbenches/furnished-house/support.js';
import {boxTriangles} from '../../src/runtime/native-query-registry.js';
import {visitSourceContactCandidates,reachableLiveSourceLinks} from '../../src/simulation/source-support.js';

const TOLERANCE=.00002;
const geometry=b=>structuredClone({bounds:b.bounds,triangles:b.triangles,solidTriangles:b.solidTriangles,closedTriangles:b.closedTriangles,closedSolidTriangles:b.closedSolidTriangles,kind:b.kind,normal:b.normal,closedNormal:b.closedNormal,thickness:b.thickness,sourceCarrierId:b.sourceCarrierId,intact:b.intact,openFraction:b.openFraction});
const record=(id,carrier,box,thickness=.16)=>({id,sourceCarrierId:carrier,kind:'wall',normal:[0,1,0],thickness,bounds:box,triangles:boxTriangles(box),solidTriangles:boxTriangles(box)});
function parity(index,nodes,firsts,seconds){
  const row=(first,candidates)=>({first:{id:first.id,geometry:geometry(first)},seconds:candidates.filter(second=>overlaps(first.bounds,second.bounds,TOLERANCE)).map(second=>({id:second.id,geometry:geometry(second),contact:supportSurfacesTouch(first,second)}))});
  const expected=firsts.map(first=>row(first,seconds)),actual=[],candidateIds=[];
  const originalCandidates=index.candidates,originalWatch=index.watch,revision=index.revision,membership=index.membershipRevision;
  index.candidates=()=>{throw Error('Active contact must not query the global broadphase');};index.watch=()=>{throw Error('Active contact must not add a global subscription');};
  let statistics;try{
    statistics=visitSourceContactCandidates(index,nodes,firsts,seconds,(first,candidates)=>{assert.equal(first,index.surfaces.get(first.id));for(const second of candidates)assert.equal(second,index.surfaces.get(second.id),'The final predicate receives the actual current native object');candidateIds.push(candidates.map(b=>b.id));actual.push(row(first,candidates));});
  }finally{index.candidates=originalCandidates;index.watch=originalWatch;}
  assert.deepEqual(actual,expected,'Every original overlap candidate, complete current geometry and ordered native predicate result agrees');
  assert.equal(index.revision,revision);assert.equal(index.membershipRevision,membership);assert.equal(statistics.records,seconds.length);assert.ok(statistics.memberships>=seconds.length);
  return {statistics,candidateIds,rows:actual};
}

test('active contact candidates restore both registration orders rather than native index ID order',()=>{
  const box={min:[0,0,0],max:[1,2,.16]},far={min:[7,0,0],max:[8,2,.16]},index=createBoundaryIndex([record('a::z','a',box),record('a::a','a',box),record('b::z','b',box),record('b::a','b',box),record('b::far','b',far),record('other','other',box)]),nodes=new Map(index.surfaces);
  const cold=index.put({...record('cold::b','b',box),queryOnly:true});let reads=0;for(const key of ['triangles','solidTriangles'])Object.defineProperty(cold,key,{get(){reads++;throw Error('Cold geometry must not be expanded');}});
  const firsts=['a::z','a::a'].map(id=>nodes.get(id)),seconds=['b::z','b::a','b::far'].map(id=>nodes.get(id)),result=parity(index,nodes,firsts,seconds);
  assert.deepEqual(result.candidateIds,[['b::z','b::a'],['b::z','b::a']]);assert.equal(reads,0);
  for(const patch of [{kind:'floor',thickness:.4},{normal:[0,0,-1]},{intact:false},{bounds:far,triangles:boxTriangles(far),solidTriangles:boxTriangles(far)}]){index.change('b::z',patch);parity(index,nodes,firsts,seconds);}
  assert.equal(reads,0);
});

test('conservative contact padding keeps tolerance-width gaps across positive and negative native bin boundaries',()=>{
  const records=[];for(const x of [-2,-1,0,1,2])for(const gap of [0,TOLERANCE/2,TOLERANCE,TOLERANCE*1.5]){
    const n=records.length,first={min:[x+gap,0,n],max:[x+gap+.16,1,n+.16]},second={min:[x-.16,0,n],max:[x,1,n+.16]};
    records.push(record('a::'+n,'a',first,0),record('b::'+n,'b',second,n%4?.4:0));
  }
  const index=createBoundaryIndex(records),nodes=new Map(index.surfaces),firsts=[...nodes.values()].filter(b=>b.sourceCarrierId==='a'),seconds=[...nodes.values()].filter(b=>b.sourceCarrierId==='b');
  const result=parity(index,nodes,firsts,seconds);assert.ok(result.rows.some(r=>r.seconds.length));assert.ok(result.rows.some(r=>!r.seconds.length));
});

test('contact broadphase preserves asymmetric facet argument direction independent of fragment IDs',()=>{
  const a={id:'a::z',sourceCarrierId:'a',kind:'attachment',normal:[0,0,1],thickness:0,triangles:[[[-2,-2,0],[2,-2,0],[0,2,0]]]},b={id:'b::a',sourceCarrierId:'b',kind:'attachment',normal:[1,0,0],thickness:0,triangles:[[[0,-.5,-1],[0,-.5,1],[0,.5,1]]]};
  for(const r of [a,b]){r.bounds=bounds(r.triangles.flat());r.solidTriangles=r.triangles;}
  const index=createBoundaryIndex([a,b]),nodes=new Map(index.surfaces),first=nodes.get(a.id),second=nodes.get(b.id);
  assert.equal(parity(index,nodes,[first],[second]).rows[0].seconds[0].contact,false);
  assert.equal(parity(index,nodes,[second],[first]).rows[0].seconds[0].contact,true);
});

test('real clipped door poses and retired original fragments keep exact active contact geometry and clocks',()=>{
  const floor={id:'f::floor/top',sourceCarrierId:'f::floor',kind:'floor',material:'timber',fuelClass:'frame',fuelAmount:1,normal:[0,1,0],thickness:.12,supports:true,triangles:[[[0,0,0],[2,0,2],[2,0,0]],[[0,0,0],[0,0,2],[2,0,2]]]},leaf={id:'f::door/leaf',sourceCarrierId:'f::door',kind:'wall',material:'metal',fuelAmount:0,nativeInertBody:true,normal:[0,0,1],thickness:.12,supports:true,triangles:[[[.5,0,.5],[1.5,0,.5],[1.5,1.65,.5]],[[.5,0,.5],[1.5,1.65,.5],[.5,1.65,.5]]]};
  const trial=createTrial({version:1,runtimeAdapterVersion:1,prefabId:'contact-pose-control',sourceBounds:{min:[-1,-1,-1],max:[3,3,3]},implicitGround:false,gridOrigin:[0,0,0],thermalCell:[.5,1.06,.5],surfaces:[floor,leaf],openings:[{id:'door',surfaceId:leaf.id,kind:'door',pivot:[.5,0,.5],maxOpenAngle:Math.PI/2}],items:[],furnitureParts:[],stores:[],render:{geometry:[],materials:[]},scene:{version:1,instances:[{id:'f'}],doors:[]}},{executionCache:true});
  try{
    const index=trial.scene.index,nodes=new Map(index.surfaces),firsts=[...nodes.values()].filter(b=>b.sourceCarrierId==='f::floor'),seconds=[...nodes.values()].filter(b=>b.sourceCarrierId==='f::door');
    assert.ok(firsts.length&&seconds.length);
    for(const open of [false,true,false,true]){trial.command({type:'opening',id:'door',open});trial.step();const before=trial.snapshot();parity(index,nodes,firsts,seconds);parity(index,nodes,seconds,firsts);assert.deepEqual(trial.snapshot(),before);}
    index.change(seconds[0].id,{intact:false});parity(index,nodes,firsts,seconds);assert.equal(nodes.get(seconds[0].id),seconds[0]);
  }finally{trial.dispose();}
});

test('contact indexes are temporary native one-metre bins and reject stale owner copies before visiting',()=>{
  const index=createBoundaryIndex([{id:'a',sourceCarrierId:'a',kind:'wall',normal:[0,1,0],thickness:0,triangles:[[[0,0,0],[0,0,1],[1,0,0]]]},{id:'b',sourceCarrierId:'b',kind:'wall',normal:[0,1,0],thickness:0,triangles:[[[0,0,0],[0,0,1],[1,0,0]]]}]),nodes=new Map(index.surfaces),a=nodes.get('a'),b=nodes.get('b');
  assert.deepEqual(parity(index,nodes,[a],[b]).statistics,{records:1,memberships:18});let visited=false;
  for(const [firsts,seconds]of [[[{...a}],[b]],[[a],[{...b}]]])assert.throws(()=>visitSourceContactCandidates(index,nodes,firsts,seconds,()=>{visited=true;}),/authoritative registered/);
  assert.equal(visited,false);
});

// Exact former state() algorithm is the comparison oracle, including BFS order.
const oldReachable=(graph,roots)=>{const seen=new Set(roots),queue=[...seen];for(let i=0;i<queue.length;i++)for(const id of graph.get(queue[i])||[])if(!seen.has(id)){seen.add(id);queue.push(id);}return seen;};
const oldLive=(links,roots,live)=>oldReachable(new Map([...links].map(([id,set])=>[id,live(id)?new Set([...set].filter(live)):new Set()])),[...roots].filter(live));
const rows=links=>[...links].map(([id,set])=>[id,[...set]]);
function liveParity(links,roots,dead){const before=rows(links),live=id=>!dead.has(id),expected=oldLive(links,roots,live),actual=reachableLiveSourceLinks(links,roots,live);assert.deepEqual([...actual],[...expected],'Reachable membership AND insertion/queue order match');assert.deepEqual(rows(links),before);return actual;}

test('direct live traversal preserves dead-root and dead-middle behavior, directed edges and cycles',()=>{
  const links=new Map([['dead-root',new Set(['a'])],['a',new Set(['middle','b'])],['middle',new Set(['c'])],['b',new Set(['a','d'])],['c',new Set(['e'])],['d',new Set(['b'])],['e',new Set()],['unrooted',new Set(['a'])]]);
  for(const dead of [new Set(),new Set(['dead-root']),new Set(['middle']),new Set(['dead-root','middle','d']),new Set(links.keys())])liveParity(links,['dead-root','a'],dead);
  assert.deepEqual([...liveParity(links,['a'],new Set(['middle']))],['a','b','d']);
});

test('live BFS preserves multiple-root order, duplicate roots, missing adjacency and asymmetric reach',()=>{
  const links=new Map([['z',new Set(['x','b'])],['a',new Set(['b','c'])],['x',new Set(['a'])],['b',new Set(['c'])],['c',new Set()]]);
  assert.deepEqual([...liveParity(links,['z','a','z','missing'],new Set(['x']))],['z','a','missing','b','c']);
  assert.deepEqual([...liveParity(links,['c'],new Set())],['c']);
  assert.deepEqual([...liveParity(new Map(),[],new Set())],[]);
});

test('direct live traversal needs only existing reachable adjacency and never enumerates a full graph copy',()=>{
  const links=new Map([['root',new Set(['dead','next'])],['dead',new Set(['hidden'])],['next',new Set(['root'])],['hidden',new Set()],['unreachable',new Set(['hidden'])]]),dead=new Set(['dead']),expected=oldLive(links,['root'],id=>!dead.has(id)),reads=[];
  const graph={get(id){reads.push(id);assert.ok(!['dead','hidden','unreachable'].includes(id));return links.get(id);},[Symbol.iterator](){throw Error('No full graph allocation or iteration');}};
  assert.deepEqual([...reachableLiveSourceLinks(graph,['root'],id=>!dead.has(id))],[...expected]);assert.deepEqual(reads,['root','next']);
});

test('live traversal re-evaluates local retirement and restoration without remapping to a remote node',()=>{
  const links=new Map([['root',new Set(['original'])],['original',new Set(['child'])],['child',new Set()],['remote',new Set(['child'])]]),roots=['root'],dead=new Set();
  assert.ok(liveParity(links,roots,dead).has('child'));dead.add('original');assert.deepEqual([...liveParity(links,roots,dead)],['root']);
  dead.delete('original');assert.deepEqual([...liveParity(links,roots,dead)],['root','original','child']);assert.equal(liveParity(links,roots,dead).has('remote'),false);
});
