import test from 'node:test';
import assert from 'node:assert/strict';
import * as T from '../../src/runtime/three.js';
import {createGroundField} from '../../src/art/ground-field.js';

const cell=size=>({id:'cell:0,0',x:size/2,y:size/2,size,material:'grass',phase:'burning',initialSurfaceFuel:1,surfaceFuel:.5,consumedDepositedFuel:0,depositedFuel:.0625,heat:1.5,intensity:.8});
const frame=(world={width:1,height:.5,fireCellSize:.5})=>({world,cells:[cell(world.fireCellSize||.5)]});
function preserve(field){
  const texture=field.uniforms.field.value,mesh=field.root.children[0];
  return {texture,mesh,geometry:mesh.geometry,material:mesh.material,data:texture.image.data,bytes:texture.image.data.slice(),version:texture.version,
    grid:field.uniforms.grid.value,gridValues:field.uniforms.grid.value.toArray(),size:field.uniforms.cellSize.value,children:[...field.root.children],counts:field.counts(),diagnostics:field.diagnostics()};
}
function unchanged(field,old){
  assert.equal(field.uniforms.field.value,old.texture);assert.equal(field.uniforms.field.value.image.data,old.data);assert.deepEqual(old.data,old.bytes);assert.equal(old.texture.version,old.version);
  assert.equal(field.uniforms.grid.value,old.grid);assert.deepEqual(old.grid.toArray(),old.gridValues);assert.equal(field.uniforms.cellSize.value,old.size);assert.deepEqual(field.root.children,old.children);
  assert.equal(old.mesh.parent,field.root);assert.equal(old.mesh.geometry,old.geometry);assert.equal(old.mesh.material,old.material);assert.deepEqual(field.counts(),old.counts);assert.deepEqual(field.diagnostics(),old.diagnostics);
}

test('exact huge-finite witness and invalid explicit new grids reject before any allocation or resource mutation',()=>{
  const field=createGroundField(T);field.update(frame());const old=preserve(field);let textureDisposals=0,geometryDisposals=0,allocations=0;
  old.texture.addEventListener('dispose',()=>textureDisposals++);old.geometry.addEventListener('dispose',()=>geometryDisposals++);
  const original=globalThis.Float32Array;
  try{
    globalThis.Float32Array=new Proxy(original,{construct(){allocations++;throw Error('Unexpected allocation before native validation');}});
    for(const world of [{width:1e40,height:.5,fireCellSize:.5},{width:1,height:.5,fireCellSize:0},{width:1,height:.5,fireCellSize:NaN},{width:1,height:.5},
      {width:Infinity,height:.5,fireCellSize:.5},{width:65,height:.5,fireCellSize:.5},{width:1,height:.51,fireCellSize:.5},
      {width:1,height:.5,fireCellSize:.1},{width:1,height:1,fireCellSize:2},{width:64,height:64,fireCellSize:.125}]){
      assert.throws(()=>field.update({world,cells:[cell(.5)]}),/Malformed ground char grid|authoritative native bounds/);unchanged(field,old);
    }
    assert.equal(allocations,0);assert.equal(textureDisposals,0);assert.equal(geometryDisposals,0);
  }finally{globalThis.Float32Array=original;field.dispose();}
});

test('accepted native boundary/arithmetic and decimal aligned grids use exact solver counts without extra ceil-epsilon cells',()=>{
  const field=createGroundField(T);
  try{
    for(const pitch of [.125,.25,.5,1]){
      const world={width:4,height:2,fireCellSize:pitch};field.update(frame(world));const texture=field.uniforms.field.value;
      assert.deepEqual([texture.image.width,texture.image.height],[4/pitch,2/pitch]);assert.equal(texture.image.data.length,(4/pitch)*(2/pitch)*4);assert.equal(texture.image.data.byteLength,texture.image.data.length*4);
      assert.deepEqual(field.root.children[0].position.toArray(),[2,.018,1]);assert.equal(field.root.children[0].renderOrder,-1);assert.equal(texture.minFilter,T.NearestFilter);assert.equal(texture.magFilter,T.NearestFilter);
    }
    const boundary={width:64,height:16,fireCellSize:.125};field.update(frame(boundary));assert.equal(field.uniforms.field.value.image.data.length,65536*4);assert.equal(field.uniforms.field.value.image.data.byteLength,1048576);
    const decimal={width:.15*7,height:.15*4,fireCellSize:.15};assert.ok(decimal.width/.15>7,'This case actually exposes the prior ceil epsilon');field.update(frame(decimal));
    assert.deepEqual(field.uniforms.grid.value.toArray(),[7,4]);assert.equal(field.uniforms.field.value.image.data.length,7*4*4);assert.deepEqual(field.root.children[0].position.toArray(),[7*.15/2,.018,4*.15/2]);
  }finally{field.dispose();}
});

for(const stage of ['texture-constructor','geometry-settings','mesh-settings','root-add'])test(`failed ${stage} replacement preserves old borrowed state and retires candidates; next valid resize succeeds`,()=>{
  const primary=new Error(stage),state={fail:false},created={textures:[],geometries:[]},released={textures:0,geometries:0};
  class Texture extends T.DataTexture{constructor(...args){if(state.fail&&stage==='texture-constructor')throw primary;super(...args);created.textures.push(this);this.addEventListener('dispose',()=>released.textures++);}}
  class Geometry extends T.PlaneGeometry{constructor(...args){super(...args);created.geometries.push(this);this.addEventListener('dispose',()=>released.geometries++);}rotateX(...args){if(state.fail&&stage==='geometry-settings')throw primary;return super.rotateX(...args);}}
  class Mesh extends T.Mesh{constructor(...args){super(...args);if(state.fail&&stage==='mesh-settings')this.position.set=()=>{throw primary;};}}
  const field=createGroundField({...T,DataTexture:Texture,PlaneGeometry:Geometry,Mesh});field.update(frame());const old=preserve(field),normalAdd=field.root.add;let materialDisposals=0;
  old.material.addEventListener('dispose',()=>materialDisposals++);state.fail=true;if(stage==='root-add')field.root.add=function(...objects){normalAdd.apply(this,objects);throw primary;};
  try{
    assert.throws(()=>field.update(frame({width:2,height:.5,fireCellSize:.5})),error=>error===primary);unchanged(field,old);
    assert.equal(released.textures,created.textures.length-1);assert.equal(released.geometries,created.geometries.length-1);assert.equal(materialDisposals,0);
    state.fail=false;field.root.add=normalAdd;field.update(frame({width:2,height:.5,fireCellSize:.5}));assert.notEqual(field.uniforms.field.value,old.texture);assert.equal(old.mesh.parent,null);
    assert.equal(released.textures,created.textures.length-1);assert.equal(released.geometries,created.geometries.length-1);assert.equal(materialDisposals,0);assert.deepEqual(field.counts(),{geometries:1,materials:1,textures:1,objects:0});
    assert.deepEqual(Array.from(field.uniforms.field.value.image.data.slice(0,4)),Array.from(new Float32Array([.5,.6,.5,1])));
  }finally{field.root.add=normalAdd;field.dispose();field.dispose();assert.equal(materialDisposals,1);assert.equal(released.textures,created.textures.length);assert.equal(released.geometries,created.geometries.length);}
});

test('candidate cleanup errors remain alongside the original preparation error and do not prevent remaining cleanup',()=>{
  const primary=new Error('prepare'),cleanup=new Error('geometry cleanup');let fail=false,textureReleases=0;
  class Texture extends T.DataTexture{constructor(...args){super(...args);this.addEventListener('dispose',()=>textureReleases++);}}
  class Geometry extends T.PlaneGeometry{constructor(...args){super(...args);if(fail)this.addEventListener('dispose',()=>{throw cleanup;});}rotateX(...args){if(fail)throw primary;return super.rotateX(...args);}}
  const field=createGroundField({...T,DataTexture:Texture,PlaneGeometry:Geometry});field.update(frame());const old=preserve(field);fail=true;
  try{assert.throws(()=>field.update(frame({width:2,height:.5,fireCellSize:.5})),error=>error instanceof AggregateError&&error.cause===primary&&error.errors[0]===primary&&error.errors[1]===cleanup);unchanged(field,old);assert.equal(textureReleases,1);}finally{field.dispose();assert.equal(textureReleases,2);}
});

test('legacy and empty masks retain default pitch/ceil geometry and exact original lanes while normal new mapping is unchanged',()=>{
  const field=createGroundField(T),legacy={id:'old',x:.25,y:.25,size:.5,material:'wood',phase:'burning',depositedFuel:.0625,heat:1.5,intensity:.8};
  try{for(const pitch of [undefined,0,NaN]){
    field.update({world:{width:1.1,height:.6,fireCellSize:pitch},cells:[legacy]});assert.deepEqual(field.uniforms.grid.value.toArray(),[3,2]);assert.equal(field.uniforms.cellSize.value,.5);assert.equal(field.uniforms.charVersion.value,0);assert.deepEqual(Array.from(field.uniforms.field.value.image.data.slice(0,4)),Array.from(new Float32Array([.5,.6,.27,1])));
    field.update({world:{width:1.1,height:.6,fireCellSize:pitch},cells:[]});assert.equal(field.uniforms.charVersion.value,1);assert.deepEqual(field.uniforms.grid.value.toArray(),[3,2]);assert.ok(field.uniforms.field.value.image.data.every(x=>x===0));
  }
  field.update(frame());assert.deepEqual(Array.from(field.uniforms.field.value.image.data.slice(0,4)),Array.from(new Float32Array([.5,.6,.5,1])));
  }finally{field.dispose();}
});
