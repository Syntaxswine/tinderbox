import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import {fileURLToPath} from 'node:url';
import * as T from '../../src/runtime/three.js';
import {createExteriorGhost,GHOST_OPACITY} from '../../src/runtime/exterior-ghost.js';
import {loadLandmark} from '../../src/runtime/landmark.js';
import {validateExteriorGhost} from '../../src/runtime/ghost-data.js';
import {createSectionStreamer} from '../../src/runtime/sections.js';
import {exteriorOutline} from '../../tools/ghost-outline.mjs';
import {geometryData,materialData} from '../../tools/place-geometry.mjs';
import {XRAY_DIAMETER_TILES,XRAY_FEATHER_RADIUS} from '../../vendor/animal-factory-tactics-3d/4f5f53917990ec03b2f14c65f067e4b99ec8fcaa/dist/tactics/wall-xray.js';
import {TILE_PLAN} from '../../assets/art/exposition-new-york-tile/index.js';
import {PLAN as ADMIN} from '../../assets/art/exposition-administration/index.js';
import {PLAN as HORT} from '../../assets/art/exposition-horticulture/index.js';
const read=url=>JSON.parse(fs.readFileSync(fileURLToPath(url)));
const simple=()=>({positions:[0,0,0,0,2.12,0],groups:[{kind:'native-wall-run',id:'outside',start:0,count:1}],segments:1});
const player={x:4,y:6,elevation:2.12,height:1.65};
function camera(){const c=new T.OrthographicCamera(-8,8,6,-6,.1,100);c.position.set(14,16,18);c.lookAt(4,2.12,6);c.updateMatrixWorld();return c;}

test('all frozen landmark ghosts load through the production loader and match exact source hashes',async()=>{
  for(const id of ['new-york','administration','horticulture']){
    const reads=[],data=await loadLandmark(id,{loadJSON:async url=>{reads.push(url);return read(url);}});
    assert.equal(reads.length,3);assert.ok(reads[2].endsWith('/exterior-ghost/'+id+'.json'));
    assert.ok(data.ghost.segments>100&&data.ghost.segments<1200);
    assert.ok(data.ghost.positions.length*4<30000);assert.ok(data.ghost.groups.some(g=>g.kind==='native-roof-mesh'));
    assert.equal(new Set(data.ghost.positions.reduce((lines,n,i,a)=>{if(i%6===0)lines.push([a.slice(i,i+3).join(','),a.slice(i+3,i+6).join(',')].sort().join('/'));return lines;},[])).size,data.ghost.segments);
    assert.equal(data.ghost.sourceAccess.commit,data.manifest.sourceAccess.commit);
  }
});

test('stale source manifests, changed geometry, invalid payloads and cancellation never silently display a false outline',async()=>{
  const data=await loadLandmark('new-york',{loadJSON:async url=>read(url)});
  await assert.rejects(validateExteriorGhost({...data.manifest,statistics:{changed:true}},data.ghost),/source\/hash mismatch/);
  const changed=structuredClone(data.ghost);changed.positions[0]+=.001;
  await assert.rejects(validateExteriorGhost(data.manifest,changed),/bounds|source\/hash/);
  await assert.rejects(validateExteriorGhost(data.manifest,{...data.ghost,positions:[Infinity,0,0,0,0,0]}),/invalid/);
  await assert.rejects(validateExteriorGhost(data.manifest,{...data.ghost,groups:[]}),/groups/);
  await assert.rejects(validateExteriorGhost({...data.manifest,exteriorGhost:{...data.manifest.exteriorGhost,url:'../private.json'}},data.ghost),/descriptor/);
  const controller=new AbortController();let reads=0;
  await assert.rejects(loadLandmark('new-york',{signal:controller.signal,loadJSON:async url=>{reads++;if(reads===3)controller.abort();return read(url);}}),error=>error.name==='AbortError');assert.equal(reads,3);
});

test('every committed outline reproduces from the frozen native plan runs and compiled roof vertices',async()=>{
  for(const [id,plan]of [['new-york',TILE_PLAN],['administration',ADMIN],['horticulture',HORT]]){
    const data=await loadLandmark(id,{loadJSON:async url=>read(url)}),url=file=>new URL(file,data.baseUrl).href,parts=data.manifest.chunks.flatMap(chunk=>read(url(chunk.url)).parts),cache=new Map();
    const generated=exteriorOutline({plan,offset:data.navigation.sourceOffset,parts,geometry:id=>{if(!cache.has(id))cache.set(id,read(url(data.manifest.geometries[id])));return cache.get(id);}});
    for(const key of ['positions','groups','bounds','segments'])assert.deepEqual(generated[key],data.ghost[key],id+' '+key);
  }
});

test('outline generator composes native runs at 2.12m floor pitch and deduplicates shared corners without exposing interior detail',()=>{
  const plan={runs:[{id:'outside',a:[0,0],b:[1,0],startLevel:1,endLevel:3,role:'exterior'},{id:'adjoining',a:[1,0],b:[1,1],startLevel:1,endLevel:3,role:'exterior'},{id:'inside',a:[.2,.2],b:[.8,.8],startLevel:0,endLevel:1,role:'interior'}],floors:[]};
  const data=exteriorOutline({plan,offset:[10,0,20],parts:[],geometry(){throw Error('Unexpected detailed geometry');}});
  assert.equal(data.segments,7);assert.deepEqual(data.bounds,{min:[10,2.12,20],max:[11,6.36,21]});assert.deepEqual(data.positions.slice(0,6),[10,2.12,20,11,2.12,20]);
  assert.ok(data.groups.every(g=>g.kind==='native-wall-run'&&g.id!=='inside'));
});

test('AFT clear centre and feather follow the animal, elevation, actual camera zoom and drawing-buffer ratio',()=>{
  const root=new T.Group(),ghost=createExteriorGhost({THREE:T,root,data:simple(),renderer:{getPixelRatio:()=>1.75}}),c=camera(),viewport={width:800,height:600};
  try{
    ghost.update(player,{camera:c,viewport});let d=ghost.diagnostics();
    const p=new T.Vector3(player.x,player.elevation+player.height*.55,player.y).project(c);
    assert.equal(XRAY_DIAMETER_TILES,5);assert.equal(XRAY_FEATHER_RADIUS,2/3);
    assert.equal(d.centre.x,(p.x+1)*400);assert.equal(d.centre.y,(1-p.y)*300);assert.equal(d.radiusPixels,2.5*600/12*1.75);
    assert.ok(Math.abs(d.outerRadiusPixels-d.radiusPixels*5/3)<1e-10);assert.equal(d.haloActive,true);assert.equal(d.lineDraws,1);
    const material=root.children[0].material,u=material.uniforms;assert.equal(u.xrayCenter.value.x,d.centre.x*1.75);assert.equal(u.xrayCenter.value.y,(600-d.centre.y)*1.75);assert.equal(u.xraySelectedLevel.value,2.12);
    c.top=3;c.bottom=-3;c.updateProjectionMatrix();ghost.update({...player,elevation:4.24},{camera:c,viewport});d=ghost.diagnostics();assert.equal(d.radiusPixels,2.5*600/6*1.75);assert.equal(u.xraySelectedLevel.value,4.24);
    assert.match(material.fragmentShader,/smoothstep\(xrayRadius,xrayOuterRadius/);assert.match(material.fragmentShader,/xrayActive\?xraySurfaceOpacity\(\):1\./);assert.ok(material.fragmentShader.includes(GHOST_OPACITY+'*reveal'));
    ghost.update(player,{camera:c,viewport,viewMode:'overview'});assert.equal(ghost.diagnostics().haloActive,false);assert.equal(ghost.diagnostics().lineDraws,0);
    ghost.update(player,{camera:c,viewport:{width:0,height:0}});assert.equal(ghost.diagnostics().haloActive,false);
  }finally{ghost.dispose();ghost.dispose();}assert.equal(root.children.length,0);
});

test('halo variants preserve original UV hooks and live clipping planes, keep supporting floors solid and leave props alone',()=>{
  const root=new T.Group(),ghost=createExteriorGhost({THREE:T,root,data:simple(),renderer:{}}),source=new T.MeshStandardMaterial(),plane=new T.Plane();let compiled=0;
  source.clippingPlanes=[plane];source.customProgramCacheKey=()=> 'physical-uv';source.onBeforeCompile=shader=>{compiled++;shader.vertexShader='// source UV retained\n'+shader.vertexShader;};
  try{
    for(const role of ['structural-wall','floor','door-leaf','window-glass','roof-glass'])assert.equal(ghost.isHaloSurface({id:'part',role}),true,role);
    assert.equal(ghost.isHaloSurface({id:'outside/panel',role:'ornament'}),true);assert.equal(ghost.isHaloSurface({id:'plant/leaf',role:'foliage'}),false);
    const variant=ghost.material(source);assert.equal(ghost.material(source),variant);assert.equal(variant.clippingPlanes,source.clippingPlanes);plane.constant=9;assert.equal(variant.clippingPlanes[0].constant,9);
    const shader={uniforms:{},vertexShader:T.ShaderLib.standard.vertexShader,fragmentShader:T.ShaderLib.standard.fragmentShader};variant.onBeforeCompile(shader,{});
    assert.equal(compiled,1);assert.match(shader.vertexShader,/source UV retained/);assert.match(shader.vertexShader,/ghostVertex=instanceMatrix\*ghostVertex/);assert.match(shader.fragmentShader,/ghostWorldY>xraySelectedLevel\+\.03/);assert.match(shader.fragmentShader,/if\(cursorXrayOpacity<=0\.\)discard/);
    assert.match(variant.customProgramCacheKey(),/^physical-uv-cursor-level-xray-v3-tinderbox/);assert.equal(source.transparent,false);assert.equal(variant.transparent,true);assert.equal(variant.depthWrite,true);
    let retired=0;variant.addEventListener('dispose',()=>retired++);ghost.releaseMaterial(source);ghost.releaseMaterial(source);assert.equal(retired,1);assert.equal(ghost.diagnostics().materialVariants,0);
  }finally{ghost.dispose();source.dispose();}
});

test('walking between sections and exiting retires every halo variant with its source material; global outline stays independent',async()=>{
  const root=new T.Group(),details=new T.Group();root.add(details);const ghost=createExteriorGhost({THREE:T,root,data:simple(),renderer:{}}),resources=[];
  class Material extends T.MeshStandardMaterial{constructor(...args){super(...args);const record={releases:0};resources.push(record);this.addEventListener('dispose',()=>record.releases++);}}
  const geometry=new T.BoxGeometry(1,2,.16),material=new T.MeshStandardMaterial(),shape=geometryData(geometry),appearance=materialData(material);geometry.dispose();material.dispose();
  const chunks=Array.from({length:10},(_,i)=>({id:''+i,url:i+'.json',bounds:{min:[i*50,0,0],max:[i*50+1,2,1]}}));
  const stream=createSectionStreamer({THREE:{...T,MeshStandardMaterial:Material},root:details,presentation:ghost,manifest:{chunks,materials:{m:appearance},geometries:{g:'shape.json'}},baseUrl:'https://fixture.invalid/',limits:{loadRadius:5,retainRadius:8,maxSections:2},loadJSON:async url=>url.endsWith('shape.json')?shape:{parts:['structural-wall','foliage'].map(role=>({id:role,role,geometry:'g',material:'m',matrix:new T.Matrix4().elements}))}});
  try{
    for(let i=0;i<10;i++){stream.update({x:i*50,y:.5,elevation:0});await stream.settled();assert.equal(stream.metrics().materials,2);assert.equal(stream.metrics().haloMaterials,1);assert.equal(ghost.diagnostics().materialVariants,1);assert.equal(details.children[0].children.length,2);assert.equal(root.children.length,2);}
    stream.update({x:450,y:.5,elevation:0},{viewMode:'overview'});await stream.settled();assert.equal(stream.metrics().materials,0);assert.equal(ghost.diagnostics().materialVariants,0);assert.equal(details.children.length,0);assert.equal(root.children.length,2);
  }finally{stream.dispose();await stream.settled();ghost.dispose();}
  assert.equal(resources.length,20);assert.ok(resources.every(r=>r.releases===1));assert.equal(root.children.length,1);
});

test('late geometry completion after exit cannot recreate disposed halo variants',async()=>{
  const root=new T.Group(),details=new T.Group();root.add(details);const ghost=createExteriorGhost({THREE:T,root,data:simple(),renderer:{}}),geometry=new T.BoxGeometry(1,2,.16),material=new T.MeshStandardMaterial(),shape=geometryData(geometry),appearance=materialData(material);geometry.dispose();material.dispose();
  let resume,started;const gate=new Promise(resolve=>resume=resolve),loading=new Promise(resolve=>started=resolve);
  const stream=createSectionStreamer({THREE:T,root:details,presentation:ghost,manifest:{chunks:[{id:'one',url:'section.json',bounds:{min:[0,0,0],max:[1,2,1]}}],materials:{m:appearance},geometries:{g:'shape.json'}},baseUrl:'https://fixture.invalid/',loadJSON:async url=>{if(url.endsWith('shape.json')){started();await gate;return shape;}return{parts:[{id:'wall',role:'structural-wall',geometry:'g',material:'m',matrix:new T.Matrix4().elements}]};}});
  stream.update({x:.5,y:.5,elevation:0});await loading;stream.dispose();ghost.dispose();resume();await stream.settled();
  assert.equal(stream.metrics().geometries,0);assert.equal(stream.metrics().materials,0);assert.equal(ghost.diagnostics().materialVariants,0);assert.equal(details.children.length,0);assert.equal(root.children.length,1);
  const source=new T.MeshStandardMaterial();try{assert.throws(()=>ghost.material(source),error=>error.name==='AbortError');}finally{source.dispose();}
});

test('partial ghost construction failure disposes its allocated geometry and original/derived wire materials once',()=>{
  const resources=new Map(),original=T.ShaderMaterial.prototype.dispose,root=new T.Group();
  T.ShaderMaterial.prototype.dispose=function(){resources.set(this,(resources.get(this)||0)+1);original.call(this);};
  let count=0;
  try{
    const THREE={...T,InstancedBufferGeometry:class extends T.InstancedBufferGeometry{constructor(){super();this.addEventListener('dispose',()=>count++);}},LineSegments:class{constructor(){throw Error('Line allocation failed');}}};
    assert.throws(()=>createExteriorGhost({THREE,root,data:simple(),renderer:{}}),/allocation failed/);
    assert.equal(count,1);assert.equal(resources.size,2);assert.ok([...resources.values()].every(n=>n===1));assert.equal(root.children.length,0);
  }finally{T.ShaderMaterial.prototype.dispose=original;}
});
