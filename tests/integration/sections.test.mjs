import test from 'node:test';
import assert from 'node:assert/strict';
import * as T from '../../src/runtime/three.js';
import {createSectionStreamer} from '../../src/runtime/sections.js';
import {geometryData,materialData,subtract,area,floorPrism,batchFloorFragments} from '../../tools/place-geometry.mjs';
const box=new T.BoxGeometry(1,2,.16),material=new T.MeshStandardMaterial({color:0xe0d0a0}),shape=geometryData(box),appearance=materialData(material);box.dispose();material.dispose();
function fixture(count=8){
  const files=new Map([['shape.json',shape]]),chunks=Array.from({length:count},(_,i)=>({id:''+i,url:i+'.json',bounds:{min:[i*16,0,2],max:[i*16+1,2,3]}}));
  for(const chunk of chunks)files.set(chunk.url,{parts:[{id:'wall-'+chunk.id,geometry:'g',material:'m',matrix:new T.Matrix4().makeTranslation(+chunk.id*16,1,2.5).elements}]});
  return {manifest:{materials:{m:appearance},geometries:{g:'shape.json'},chunks},files,loadJSON:async url=>{const data=files.get(new URL(url).pathname.split('/').at(-1));if(!data)throw Error('Missing fixture');return data;}};
}
test('nearby sections load bounded source instances, retire distant geometry, retain seams and reload on return',async()=>{
  const f=fixture(),root=new T.Group(),stream=createSectionStreamer({...f,THREE:T,root,baseUrl:'https://fixture.test/place/',limits:{loadRadius:6,retainRadius:10,maxSections:3}});
  try{for(const x of [1,17,33,49,65,81,97,113,97,81,65,49,33,17,1]){
      const player={x,y:2.5,elevation:0};stream.update(player);await stream.settled();assert.equal(stream.isReadyAt(player),true);assert.ok(stream.metrics().activeSections<=3);assert.ok(stream.metrics().geometries<=1);
      root.traverse(node=>{if(node.isInstancedMesh){const matrix=new T.Matrix4();node.getMatrixAt(0,matrix);assert.deepEqual(new T.Vector3().setFromMatrixScale(matrix).toArray(),[1,1,1]);}});
    }
    assert.ok(stream.metrics().sectionReleases>8);assert.ok(stream.metrics().sectionLoads>8);
    stream.update({x:1,y:2.5,elevation:0},{viewMode:'overview'});await stream.settled();assert.equal(stream.metrics().activeSections,0);assert.equal(stream.metrics().geometries,0);
  }finally{stream.dispose();}assert.equal(root.children.length,0);assert.equal(stream.metrics().materials,0);
});
test('rapid exit releases stale async section completion and every created geometry/material/instance once (no WebGL)',async()=>{
  const f=fixture(1),root=new T.Group(),gate={};gate.promise=new Promise(resolve=>gate.resolve=resolve);let waiting=true;
  const resources=new Map(),track=resource=>{resources.set(resource,0);resource.addEventListener('dispose',()=>resources.set(resource,resources.get(resource)+1));};
  const Host={...T,BufferGeometry:class extends T.BufferGeometry{constructor(){super();track(this);}},MeshStandardMaterial:class extends T.MeshStandardMaterial{constructor(...args){super(...args);track(this);}},InstancedMesh:class extends T.InstancedMesh{constructor(...args){super(...args);track(this);}}};
  const stream=createSectionStreamer({...f,THREE:Host,root,baseUrl:'https://fixture.test/',loadJSON:async(url,signal)=>{if(waiting){waiting=false;await gate.promise;}return f.loadJSON(url,signal);}});
  stream.update({x:.5,y:2.5,elevation:0});stream.dispose();gate.resolve();await stream.settled();assert.equal(root.children.length,0);for(const count of resources.values())assert.equal(count,1);
  assert.equal(stream.metrics().materials,0);assert.equal(stream.metrics().geometries,0);
});
test('section load failure is explicit and recoverable by a new visit without leaked material/geometry ownership',async()=>{
  const f=fixture(1),root=new T.Group(),errors=[];const stream=createSectionStreamer({...f,THREE:T,root,baseUrl:'https://fixture.test/',loadJSON:async()=>{throw Error('missing section');},onError:e=>errors.push(e)});
  stream.update({x:.5,y:2.5,elevation:0});await assert.rejects(stream.settled(),/missing section/);assert.equal(stream.isReadyAt({x:.5,y:2.5,elevation:0}),false);assert.equal(errors.length,1);stream.dispose();assert.equal(root.children.length,0);
});
test('derived slab openings preserve physical floor area and have actual empty holes and correct top height',()=>{
  const outer=[[0,0],[4,0],[4,4],[0,4]],hole=[[1,1],[3,1],[3,3],[1,3]],pieces=subtract(outer,hole);assert.equal(pieces.reduce((n,p)=>n+area(p),0),12);
  const group=new T.Group(),resources=[];for(const polygon of pieces){const geometry=floorPrism(polygon,6.36),material=new T.MeshBasicMaterial({side:T.DoubleSide});resources.push(geometry,material);group.add(new T.Mesh(geometry,material));}
  group.updateMatrixWorld(true);const ray=x=>new T.Raycaster(new T.Vector3(x,7,2),new T.Vector3(0,-1,0),0,2).intersectObject(group,true);
  assert.equal(ray(2).length,0);assert.ok(Math.abs(ray(.5)[0].point.y-6.36)<1e-5);for(const resource of resources)resource.dispose();
});
test('section floor batching copies exact source triangles/physical UVs without rescaling or changing the original arrays',()=>{
  const source=new Map(),parts=[];for(let i=0;i<2;i++){
    const geometry=new T.BoxGeometry(1,.12,1);geometry.translate(i*2,.06,0);const p=geometry.attributes.position,uv=[];for(let v=0;v<p.count;v++)uv.push(p.getX(v),p.getZ(v));geometry.setAttribute('grossUV',new T.Float32BufferAttribute(uv,2));geometry.computeBoundingBox();source.set('g'+i,geometryData(geometry));
    parts.push({id:'floor-'+i,role:'floor',floorId:'main',level:1,geometry:'g'+i,material:'floor',matrix:new T.Matrix4().elements,bounds:{min:geometry.boundingBox.min.toArray(),max:geometry.boundingBox.max.toArray()}});geometry.dispose();
  }
  const before=JSON.stringify([...source]),usage=new Map([['g0',1],['g1',1]]);let merged;
  const result=batchFloorFragments(parts,usage,id=>source.get(id),data=>{merged=data;return 'merged';});assert.equal(result.parts.length,1);assert.equal(result.merged,1);assert.equal(result.parts[0].sourceRanges.length,2);
  for(const name of ['position','normal','uv','grossUV']){
    const expected=[];for(const geometry of source.values()){const a=geometry.attributes[name];for(const index of geometry.index.array)for(let n=0;n<a.itemSize;n++)expected.push(a.array[index*a.itemSize+n]);}
    assert.deepEqual(merged.attributes[name].array,expected);
  }
  assert.equal(JSON.stringify([...source]),before);assert.equal(merged.index,null);assert.deepEqual(result.parts[0].matrix,new T.Matrix4().elements);
});
