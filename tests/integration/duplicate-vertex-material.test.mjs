import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import {createHash} from 'node:crypto';
import {createOriginalSupportPorts as create,originalMaterialComponents as components,ORIGINAL_SUPPORT_LIMITS} from '../../src/simulation/original-support-ports.js';
import {sourceGeometryTriangles} from '../../src/content/map-source-shapes.js';
import {triangleArea,EPS} from '../../workbenches/furnished-house/geometry.js';
import {boxTriangles} from '../fixtures/regional-query-data.mjs';

const sha=b=>createHash('sha256').update(b).digest('hex'),evidence='docs/engineering/shared-maps/duplicate-vertex-material-v1/';
const source=JSON.parse(fs.readFileSync(evidence+'ui-result.json')),geometryPath='assets/art/place-scenes/new-york/geometry/'+source.geometryId+'.json',geometryRaw=fs.readFileSync(geometryPath);
assert.equal(sha(geometryRaw),source.geometryRawSha256);
const indexRaw=fs.readFileSync('assets/runtime/map-sources/new-york/index.json');assert.equal(sha(indexRaw),'e9bee63a5a4afb0f8513d083b7e5f1ce83f25c0441ea543e14901b70e4e0cdab');
const index=JSON.parse(indexRaw),slot=index.parts[2352],m=slot[5].length===3?[1,0,0,0,0,1,0,0,0,0,1,0,...slot[5],1]:slot[5];
assert.equal(slot[0],source.partId);assert.equal(index.carriers[slot[2]][0],source.ownerId);assert.equal(index.tables.geometries[slot[3]],source.geometryId);assert.deepEqual(m,source.emittedWorldMatrix);assert.ok(!slot[12]);
const g=JSON.parse(geometryRaw),identity=[1,0,0,0,0,1,0,0,0,0,1,0,0,0,0,1],raw=sourceGeometryTriangles({matrix:identity,triangleCount:200},g),world=sourceGeometryTriangles({matrix:m,triangleCount:200},g);
const packed=ts=>{const values=ts.flat(2),b=Buffer.alloc(values.length*8);values.forEach((v,i)=>b.writeDoubleLE(v,i*8));return sha(b);};
assert.equal(packed(raw),source.rawOrderedFloat64Sha256);assert.equal(packed(world),source.worldOrderedFloat64Sha256);
const excluded=[0,19,20,39,40,59,60,79,80,99,100,119,120,139,140,159,160,179,180,199],duplicate=t=>[[0,1],[1,2],[2,0]].some(([a,b])=>t[a].every((v,i)=>v===t[b][i]));
const part=(id,triangles)=>({id,ownerId:id,triangles}),box=(id,min,max)=>part(id,boxTriangles(min,max)),empty=[[0,0,0],[0,0,0],[1,0,0]];

test('real baluster keeps all 200 raw/world slots and exact original IDs while enumerating 180 material faces',()=>{
  for(const [frame,ts]of [['raw',raw],['world',world]]){
    const before=packed(ts),positive=ts.flatMap((t,i)=>triangleArea(t)>0?[i]:[]),zeros=ts.flatMap((t,i)=>triangleArea(t)===0?[i]:[]);
    assert.equal(ts.length,200);assert.equal(positive.length,180);assert.deepEqual(zeros,excluded);assert.ok(zeros.every(i=>duplicate(ts[i])));assert.ok(ts.every(t=>t.flat().every(Number.isFinite)));assert.equal(ts.filter(t=>triangleArea(t)>0&&triangleArea(t)<=EPS).length,0);
    const result=components(ts),retained=result.flatMap(c=>c.primitives).sort((a,b)=>a-b);assert.deepEqual(retained,positive);assert.equal(new Set(retained).size,180);assert.equal(packed(ts),before);
    const p=part('baluster-'+frame,ts),core=create({parts:[p],bonds:[]});try{assert.equal(core.diagnostics().parts,1);assert.equal(packed(ts),before);assert.equal(p.triangles.length,200);}finally{core.dispose();}
  }
});

test('excluded original faces cannot become ports, fragment material or ground anchors',()=>{
  const baluster=part(source.partId,structuredClone(world)),other=box('other',[0,0,0],[1,1,1]);
  assert.throws(()=>create({parts:[baluster,other],bonds:[{id:'empty-port',kind:'bearing-face',direction:'parent-to-child',parent:{partId:baluster.id,point:world[0][0],primitives:[0]},child:{partId:other.id,point:[0,0,0]}}]}),/Unrepresentable original port/);
  const p=part('above-ground',[empty,...boxTriangles([0,1,0],[1,2,1])]),core=create({parts:[p],bonds:[],anchors:[{partId:p.id,elevation:0}]}),fragment={id:'material',partId:p.id,ownerId:p.ownerId,component:0,mode:'cold',primitives:Array.from({length:12},(_,i)=>i+1),triangles:p.triangles.slice(1)};
  try{assert.deepEqual(core.evaluate({revision:0,fragments:[fragment]}).supportedIds,[]);assert.throws(()=>core.evaluate({revision:1,fragments:[{...fragment,primitives:[0],triangles:[empty]}]}),/Foreign original fragment face/);}finally{core.dispose();}
});

test('nonfinite, malformed, unproved collinear and all-empty originals reject; positive EPS-small faces remain',()=>{
  const valid=[[0,0,0],[1,0,0],[0,1,0]];
  for(const bad of [null,[[0,0,0],[1,0,0]],[[0,0,0],[1,0,0],[0,NaN,0]],[[0,0,0],[1,0,0],[0,Infinity,0]],[[0,0,0],[1,0,0],[2,0,0]],[[0,0,0],[1e308,0,0],[0,1e308,0]],[[0,0,0],[1e-200,0,0],[0,1e-200,0]]])assert.throws(()=>components([valid,bad]),/Finite original physical triangles/);
  for(const ts of [[],[empty],[empty,empty]]){assert.throws(()=>components(ts),/Finite original physical triangles/);assert.throws(()=>create({parts:[part('empty',ts)],bonds:[]}),/physical/);}
  const small=[[0,0,0],[1e-4,0,0],[0,1e-4,0]];assert.ok(triangleArea(small)>0&&triangleArea(small)<=EPS);assert.deepEqual(components([empty,small]).flatMap(c=>c.primitives),[1]);
});

test('empty faces sharing a zero-length edge cannot join two actual positive-area components',()=>{
  const a=[0,0,0],b=[1,0,0],c=[0,0,1],left=[a,b,[1,1,0]],right=[a,c,[0,1,1]],p=part('two-components',[left,[a,a,b],right,[a,a,c]]);
  const result=components(p.triangles);assert.deepEqual(result,[{id:0,primitives:[0],closed:false},{id:1,primitives:[2],closed:false}]);
  const core=create({parts:[p],bonds:[],anchors:[{partId:p.id,elevation:0,component:0}]});try{const fragment=(id,component,primitive)=>({id,partId:p.id,ownerId:p.ownerId,component,mode:'cold',primitives:[primitive],triangles:[p.triangles[primitive]]}),state=core.evaluate({revision:0,fragments:[fragment('left',0,0),fragment('right',1,2)]});assert.deepEqual(state.supportedIds,['left']);assert.deepEqual(state.unrootedIds,['right']);}finally{core.dispose();}
});

test('strict original witnesses use positive components while effective closed-solid guards stay unchanged',()=>{
  const witness=[1,.5,.5],duplicateAtWitness=[witness,witness,[1.1,.5,.5]],parent=part('parent',[duplicateAtWitness,...boxTriangles([0,0,0],[2,1,1])]),child=part('child',[duplicateAtWitness,...boxTriangles([.8,.2,.2],[1.2,.8,.8])]);
  const endpoint=p=>({partId:p.id,point:witness,nativeRecordId:'native/'+p.id}),core=create({parts:[parent,child],bonds:[{id:'strict',kind:'fixed-embed',direction:'parent-to-child',parent:endpoint(parent),child:endpoint(child)}],anchors:[{partId:parent.id,elevation:0}]});
  try{for(const end of Object.values(core.bindings()[0]).filter(v=>v&&typeof v==='object'&&'primitive'in v))assert.ok(end.primitive>0);
    const fragment=p=>({id:p.id,recordId:'native/'+p.id,partId:p.id,ownerId:p.ownerId,component:0,mode:'native',primitives:Array.from({length:12},(_,i)=>i+1),triangles:p.triangles.slice(1),solidTriangles:p.triangles.slice(1)}),full=[fragment(parent),fragment(child)],live=core.evaluate({revision:0,fragments:full});assert.equal(live.ports[0].live,true);assert.deepEqual(live.unrootedIds,[]);
    const invalid=core.evaluate({revision:1,fragments:[{...full[0],solidTriangles:parent.triangles},full[1]]});assert.equal(invalid.ports[0].live,false);assert.deepEqual(invalid.unrootedIds,['child']);assert.ok(invalid.unresolvedBindings.some(v=>v.reason==='strict-embed-effective-solid-unproven'));
  }finally{core.dispose();}
});

test('the unchanged original triangle ceiling counts every supplied slot including empty faces',()=>{
  assert.equal(ORIGINAL_SUPPORT_LIMITS.triangles,400000);const ts=Array(ORIGINAL_SUPPORT_LIMITS.triangles+1).fill(empty);assert.throws(()=>create({parts:[part('over-limit',ts)],bonds:[]}),/Original support triangle ceiling/);
});
