import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import * as T from '../../src/runtime/three.js';
import {createGroundField} from '../../src/art/ground-field.js';
import {createFire} from '../../src/art/fire.js';
import {createWindowBayModel} from '../../vendor/nautilus-engine/90054d07134116a5d9661f8318a76fe68f922aad/packages/window-kit/three.js';

// Execute the pinned library's actual render-list implementation, not a copied
// approximation of its comparator. This is expected sorting, NOT a WebGL
// submission/onBeforeRender trace or evidence of pixel causation.
const threePath=new URL('../../vendor/farmyard-commando/30a3b8cae5f36bb0c1df3685b7fba16f701c2083/sites/tactical-animal/dist/aft/tactics/vendor/three.module.js',import.meta.url);
const threeSource=fs.readFileSync(threePath,'utf8'),begin=threeSource.indexOf('function painterSortStable('),end=threeSource.indexOf('function WebGLRenderLists(',begin);
assert.ok(begin>=0&&end>begin);
const renderList=Function(threeSource.slice(begin,end)+'; return WebGLRenderList;')();
function zeroAncestorGroups(object){for(let parent=object.parent;parent;parent=parent.parent)if(parent.isGroup)assert.equal(parent.renderOrder,0,parent.name);}
function expectedList(objects,z){const list=renderList();list.init();objects.forEach((object,index)=>{zeroAncestorGroups(object);list.push(object,object.geometry,object.material,0,z(index),null);});list.sort();return list.transparent.map(item=>item.object);}
function snapshot(){return {world:{width:4,height:.5,fireCellSize:.5},paused:false,cells:[
 {id:'cold-gas',x:.25,y:.25,phase:'cold',material:'paving',depositedFuel:.0625},
 {id:'warming',x:.75,y:.25,phase:'heating',material:'grass',heat:.8},
 {id:'burning-wood',x:1.25,y:.25,phase:'burning',material:'wood',intensity:.8},
 {id:'spent-wood',x:1.75,y:.25,phase:'spent',material:'wood'},
 {id:'spent-paving',x:2.25,y:.25,phase:'spent',material:'paving'},
 {id:'cold-hole',x:2.75,y:.25,phase:'cold',material:'wood'},
 {id:'burning-gas',x:3.25,y:.25,phase:'burning',material:'paving',intensity:1,depositedFuel:.0625},
 {id:'outside-right',x:4.25,y:.25,phase:'burning',material:'wood',intensity:1},
 {id:'outside-left',x:-.25,y:.25,phase:'burning',material:'wood',intensity:1}
]};}
test('expected pinned Three ordering puts underlay before default R09 contract/glass/markers and unchanged published 3/4 stages',()=>{
 const field=createGroundField(T),assets={flame:new T.Texture(),smoke:new T.Texture(),burst:new T.Texture()};field.update(snapshot());
 const scene=new T.Scene(),art=new T.Group();art.name='Default art parent';scene.add(art);art.add(field.root);
 // R09 e42533a7 index.js:54-56 was independently source-verified to use this
 // default-0 transparent combined-stream stage. The local 0.1 artist factory
 // explicitly uses 5/6 and is NOT imported, changed or relabelled as R09 here.
 const stream=new T.Mesh(new T.BoxGeometry(1,1,1),new T.ShaderMaterial({transparent:true,depthWrite:false,depthTest:true,premultipliedAlpha:true,forceSinglePass:true}));stream.name='R09 default-stage contract (not artist factory/GPU fixture)';
 const effectGroup=new T.Group(),streamGroup=new T.Group();effectGroup.add(streamGroup);streamGroup.add(stream);art.add(effectGroup);
 const glass=createWindowBayModel(T,'window-bay-period');art.add(glass.root);
 const ring=new T.Mesh(new T.RingGeometry(.96,1,12),new T.MeshBasicMaterial({transparent:true,opacity:.6,depthWrite:false}));ring.name='Default native footprint marker';
 const arrow=new T.Mesh(new T.PlaneGeometry(1,1),new T.MeshBasicMaterial({transparent:true,opacity:.7,depthWrite:false}));arrow.name='Default native direction marker';art.add(ring,arrow);
 const published=createFire(T,assets,field.uniforms);art.add(published.root);
 try{
  const underlay=field.root.children[0],stages=published.root.children.filter(child=>child.isMesh);assert.ok(stages.some(mesh=>mesh.renderOrder===3));assert.ok(stages.some(mesh=>mesh.renderOrder===4));
  assert.equal(stream.renderOrder,0);assert.equal(ring.renderOrder,0);assert.equal(arrow.renderOrder,0);assert.ok(glass.panes.length>0);
  for(const pane of glass.panes){assert.equal(pane.renderOrder,0);assert.equal(pane.material.transparent,true);assert.equal(pane.material.depthWrite,false);}
  assert.equal(underlay.material.transparent,true);assert.equal(underlay.material.depthTest,true);assert.equal(underlay.material.depthWrite,false);
  const objects=[stream,...glass.panes,ring,arrow,...stages,underlay];
  for(const order of [objects,[...objects].reverse()])for(const z of [i=>i*.1,i=>-i*.1]){
   const sorted=expectedList(order,z);assert.equal(sorted[0]===underlay,true,'Ground overlay must sort before every default-0 transparent item, independently of insertion/depth');
   for(const object of objects.filter(object=>object!==underlay))assert.ok(sorted.indexOf(underlay)<sorted.indexOf(object));
   for(const flame of stages.filter(mesh=>mesh.renderOrder===3))for(const smoke of stages.filter(mesh=>mesh.renderOrder===4))assert.ok(sorted.indexOf(flame)<sorted.indexOf(smoke),'Published 3/4 stage relationship remains unchanged');
  }
  // Exact old-order counterfactual: a floor at order 1 necessarily follows default-0 R,
  // glass and markers in this same unchanged comparator, irrespective of z.
  const old=underlay.clone();old.renderOrder=1;const sorted=expectedList([old,stream,ring,arrow,...glass.panes],i=>i*.1);
  for(const object of [stream,ring,arrow,...glass.panes])assert.ok(sorted.indexOf(object)<sorted.indexOf(old));
 }finally{published.dispose();glass.dispose();field.dispose();for(const object of [stream,ring,arrow]){object.geometry.dispose();object.material.dispose();}for(const texture of Object.values(assets))texture.dispose();scene.clear();}
});
test('legacy underlay preserves exact RGBA encoding/borrowed nearest mask, resize/reset and resource lifecycle',()=>{
 const field=createGroundField(T),source=snapshot(),before=structuredClone(source);
 try{
  field.update(source);const texture=field.uniforms.field.value,expected=new Float32Array([.5,0,0,0, 0,.68,0,0, 0,.6,.27,1, 0,0,1,0, 0,0,.85,0, 0,0,0,0, .5,.75,.27,1, 0,0,0,0]);
  assert.deepEqual(texture.image.data,expected);assert.deepEqual(source,before);assert.equal(texture.minFilter,T.NearestFilter);assert.equal(texture.magFilter,T.NearestFilter);assert.equal(texture.generateMipmaps,false);assert.equal(texture.type,T.FloatType);assert.equal(texture.format,T.RGBAFormat);assert.deepEqual([texture.image.width,texture.image.height],[8,1]);
  const borrowed={field:{value:texture},grid:{value:{x:8,y:1}},cellSize:{value:.5}};const bytes=Buffer.from(texture.image.data.buffer).toString('hex');
  field.update({...source,paused:true});assert.equal(field.uniforms.field.value,borrowed.field.value);assert.equal(Buffer.from(borrowed.field.value.image.data.buffer).toString('hex'),bytes);assert.equal(borrowed.field.value.image.data[5*4+3],0,'Cold hole stays exactly nonburning');assert.equal(borrowed.field.value.image.data[6*4+3],1,'Adjacent burning mask stays exactly binary');
  field.update({...source,cells:[]});assert.ok(texture.image.data.every(value=>value===0));
  field.update({world:{width:2,height:.5,fireCellSize:.5},cells:[]});assert.notEqual(field.uniforms.field.value,texture);assert.deepEqual(field.counts(),{geometries:1,materials:1,textures:1,objects:0});
  assert.deepEqual(field.diagnostics(),{charMode:'empty',charVersion:1,cells:0});
 }finally{field.dispose();field.dispose();assert.deepEqual(field.counts(),{geometries:0,materials:0,textures:0,objects:0});}
});
