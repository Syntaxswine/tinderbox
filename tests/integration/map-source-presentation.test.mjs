import test from 'node:test';
import assert from 'node:assert/strict';
import * as T from '../../src/runtime/three.js';
import {mapSectionPresentation,followBoundaryRows,labelNativePatchStoreys} from '../../src/content/map-source-presentation.js';
import {createGroundField} from '../../src/art/ground-field.js';
import {createToolProps} from '../../src/art/tool-props.js';
import {createSourceInertDebris} from '../../src/art/source-inert-debris.js';
import {boxTriangles} from '../../src/runtime/native-query-registry.js';

test('source floor presentation keeps original triangles and UVs instead of rebuilding a replacement slab',()=>{
  const triangles=[[[0,2.12,0],[1,2.12,1],[1,2.12,0]],[[0,2.12,0],[0,2.12,1],[1,2.12,1]]],p={id:'floor',sectionId:'s',physical:true,carrierId:'f::floor',appearance:'paint',material:'timber',bounds:{min:[0,2,0],max:[1,2.12,1]}},s={id:'f::floor/source',nativePartId:'floor',kind:'floor',normal:[0,1,0],triangles,fuelAmount:1,thickness:.12,sourceMeshBindings:['floor'],level:1},raw={id:'floor',triangles:triangles.map(t=>({vertices:t.map(v=>[...v,0,1,0,17,19,23,29,1,1,1]),materialId:'paint'}))};
  const model={placeId:'f',parts:[p],follows:[],partById:new Map([['floor',p]]),library:{materials:{paint:{color:[.3,.4,.5]}}}},compiled={model,data:{version:1,levels:[{index:1,floorY:2.12}],surfaces:[]},sources:{renderGeometry:()=>raw},presentationSourcesForCarrier:()=>({surfaces:[s],openings:[]})};
  const result=mapSectionPresentation(compiled,'s');assert.equal(result.data.presentationOnly,true);assert.equal(result.data.surfaces[0].supportType,'native-source-slab');assert.equal(s.supportType,undefined);assert.deepEqual(result.data.render.geometry[0],raw);assert.deepEqual([...result.nativeSourceIds],[s.id]);assert.deepEqual([...result.ownedParts],['floor']);assert.equal(compiled.data.surfaces.length,0);
});

test('local cosmetic rows follow the original parent patch groups and cannot find a new surviving parent',()=>{
  const binding={id:'cosmetic',triangles:[[[0,0,0],[1,0,0],[0,0,1]]],parentGroups:[['left','tie']]},live=new Map([['left',{intact:false,charFraction:1}],['tie',{intact:true,charFraction:.5}],['distant',{intact:true}]]);
  let row=followBoundaryRows([binding],live)[0];assert.equal(row.intact,true);assert.equal(row.charFraction,.5);live.set('tie',{intact:false});row=followBoundaryRows([binding],live)[0];assert.equal(row.intact,false);binding.parentGroups=[['cold:parent']];assert.equal(followBoundaryRows([binding],live)[0].intact,true);binding.parentGroups=[['left'],['cold:parent']];assert.equal(followBoundaryRows([binding],live)[0].intact,false);
});

test('a long native source uses each existing patch world height for its storey without moving vertices or changing UVs',()=>{
  const root=new T.Group(),geometry=new T.BufferGeometry(),positions=new Float32Array([0,2.12,0,1,2.12,0,0,3.18,0,0,8.48,0,1,8.48,0,0,9.54,0]);geometry.setAttribute('position',new T.BufferAttribute(positions,3));geometry.setAttribute('fhPatch',new T.Float32BufferAttribute([0,0,0,1,1,1],1));geometry.setAttribute('fhStorey',new T.Float32BufferAttribute([1,1,1,1,1,1],1));geometry.setAttribute('uv',new T.Float32BufferAttribute([17,19,17,19,17,19,23,29,23,29,23,29],2));const material=new T.MeshBasicMaterial();root.add(new T.Mesh(geometry,material));
  try{const beforePosition=[...positions],beforeUV=[...geometry.attributes.uv.array],report=labelNativePatchStoreys({root,inspect:()=>({patches:[{triangles:[[[0,2.12,0],[1,2.12,0],[0,3.18,0]]]},{triangles:[[[0,8.48,0],[1,8.48,0],[0,9.54,0]]]}]})});assert.deepEqual([...geometry.attributes.fhStorey.array],[1,1,1,4,4,4]);assert.deepEqual([...positions],beforePosition);assert.deepEqual([...geometry.attributes.uv.array],beforeUV);assert.equal(report.relabeledVertices,3);}finally{geometry.dispose();material.dispose();}
});

test('a large sparse map uses a bounded source-aligned ground mask without projecting upper-floor oil onto the ground',()=>{
  const field=createGroundField(T,undefined,{windowSize:32,groundOnly:true}),cells=Object.freeze([Object.freeze({x:100.25,y:100.25,h:.01,phase:'cold',depositedFuel:.1}),Object.freeze({x:100.25,y:100.25,h:8.49,phase:'cold',depositedFuel:4})]),snapshot={world:{width:2048,height:2048,fireCellSize:.5},player:{x:100,y:100},cells};
  try{field.update(snapshot);const texture=field.uniforms.field.value,data=texture.image.data,index=(40+40*64)*4;assert.equal(field.counts().texels,4096);assert.deepEqual(field.counts().fieldOrigin,[80,80]);assert.equal(data[index],Math.fround(Math.sqrt(.1)*2));
    field.update({...snapshot,player:{x:200,y:100}});assert.equal(field.uniforms.field.value,texture);assert.ok(data.every(v=>v===0));field.update(snapshot);assert.equal(data[index],Math.fround(Math.sqrt(.1)*2));assert.equal(cells[0].depositedFuel,.1);
  }finally{field.dispose();}
});

test('pour detail lands at the native occupied floor and hides during an unsupported fall',()=>{
  const material=new T.MeshBasicMaterial(),art=createToolProps(T,{brass:material,glass:material,shirt:material}),spout=new T.Object3D();spout.position.set(2,10,3);spout.updateMatrixWorld(true);
  try{const player={x:2,y:3,elevation:8.48,hp:100,pouring:true,moving:true,inventory:{gas:1}},snapshot={player,projectiles:[]};art.update(snapshot,.125,{spout});assert.ok(Math.abs(art.root.children[0].position.y-9.27)<1e-8);player.falling=true;art.update(snapshot,.125,{spout});assert.ok(art.root.children.slice(0,2).every(m=>!m.visible));}finally{art.dispose();material.dispose();}
});

test('inert falling and landed bodies retain actual depth and original material without lights or char flattening',()=>{
  const art=createSourceInertDebris(T,{appearanceForSource:()=>({id:'metal',spec:{color:[.2,.3,.4],emissive:[0,0,0],roughness:.8,metalness:.5}})}),triangles=boxTriangles({min:[0,1,0],max:[.2,1.2,.2]}),geometry={nativeInertBody:true,solidTriangles:triangles,sourceSurfaceIds:['source']};
  try{const fall={id:'fall',bodyBoundaryId:'body',origin:[.1,1.1,.1],position:[.1,.6,.1],geometry};art.update({falls:[fall],rubble:[]});const mesh=art.root.children[0],first=mesh.geometry;assert.deepEqual(mesh.material.color.toArray(),[.2,.3,.4]);art.update({falls:[{...fall,position:[.1,.4,.1]}],rubble:[]});assert.equal(mesh.geometry,first);
    const landed=triangles.map(t=>t.map(p=>[p[0],p[1]-1,p[2]]));art.update({falls:[],rubble:[{id:'landed',bodyBoundaryId:'body',position:[.1,.1,.1],inert:true,geometry:{...geometry,solidTriangles:landed}}]});const box=new T.Box3().setFromObject(art.root);assert.ok(Math.abs(box.max.y-box.min.y-.2)<1e-6);assert.equal(art.diagnostics().bodies,1);assert.equal(art.root.children.some(o=>o.isLight),false);
  }finally{art.dispose();}assert.equal(art.diagnostics().geometries,0);
});
