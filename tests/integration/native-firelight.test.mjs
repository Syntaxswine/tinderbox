import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import * as T from '../../src/runtime/three.js';
import {groupStructureFire} from '../../src/art/structure-fire.js';
import {createStreetFirelight} from '../../src/art/street-firelight.js';
import {createCameraCuller,houseEffectBounds} from '../../art/source/furnished-house/visibility.js';

const fixture=JSON.parse(fs.readFileSync(new URL('../fixtures/native-firelight-samples.json',import.meta.url)));
const frame=(samples,key='catalogueModules')=>({[key]:fixture.metadata,fireSamples:samples});
const snapshot={player:{x:42.81,y:15.8},world:{fireCellSize:.5},cells:Object.freeze([])};
const freeze=value=>{if(value&&typeof value==='object'){for(const child of Object.values(value))freeze(child);Object.freeze(value);}return value;};
function withPool(run){const pool=createStreetFirelight(T);try{run(pool);}finally{pool.dispose();}}

test('actual native wall/roof samples light the shared pool through their recognized canonical frame without mutating physical DTOs',()=>{
  for(const key of ['catalogueModules','scene']){
    const samples=freeze(structuredClone(fixture.samples)),before=JSON.stringify(samples),nativeFrame=frame(samples,key);
    assert.ok(samples.every(s=>!Object.hasOwn(s,'exposed')));
    const grouped=groupStructureFire(samples,{nativeFrame}),output=[...grouped.values()].flat();assert.equal(output.length,2);
    for(let i=0;i<output.length;i++){assert.equal(output[i].exposed,true);const {exposed,...unchanged}=output[i];assert.deepEqual(unchanged,samples[i]);}
    withPool(pool=>{pool.update(snapshot,grouped,26);const d=pool.diagnostics();assert.equal(d.surfaceSites,2);assert.ok(d.lights.length>0);assert.ok(pool.root.children.some(l=>l.intensity>0));});
    assert.equal(JSON.stringify(samples),before);
  }
});

test('explicit false or undefined exposure and smoke-only native sources do not acquire fire lights',()=>{
  for(const change of [{exposed:false},{exposed:undefined},{flame:0,smoke:.5}]){
    const samples=[{...fixture.samples[0],...change}],grouped=groupStructureFire(samples,{nativeFrame:frame(samples)});
    assert.notEqual([...grouped.values()][0][0].exposed,true);
    withPool(pool=>{pool.update(snapshot,grouped,26);assert.equal(pool.diagnostics().surfaceSites,0);assert.deepEqual(pool.diagnostics().lights,[]);});
  }
});

test('legacy and unknown producers retain explicit exposure semantics; matching IDs or copied arrays do not establish native ownership',()=>{
  const samples=structuredClone(fixture.samples),nativeFrame=frame(samples);
  const cases=[{samples,options:{}},{samples:[...samples],options:{nativeFrame}},{samples,options:{nativeFrame:{...nativeFrame,catalogueModules:{...fixture.metadata,version:2}}}},
    {samples:[{...samples[0],ownerInstanceId:'unknown',buildingId:'unknown'}],unknown:true},
    {samples:[Object.fromEntries(Object.entries(samples[0]).filter(([k])=>k!=='fuelClass'))],unknown:true}];
  for(const entry of cases){const options=entry.unknown?{nativeFrame:frame(entry.samples)}:entry.options;withPool(pool=>{const grouped=groupStructureFire(entry.samples,options);assert.ok([...grouped.values()].flat().every(s=>!Object.hasOwn(s,'exposed')));pool.update(snapshot,grouped,26);assert.deepEqual(pool.diagnostics().lights,[]);});}
  const explicit=[{...samples[0],exposed:true}];withPool(pool=>{pool.update(snapshot,groupStructureFire(explicit),26);assert.equal(pool.diagnostics().surfaceSites,1);});
});

test('native illumination remains independent of the flame camera culler',()=>{
  const samples=structuredClone(fixture.samples),camera=new T.OrthographicCamera(-1,1,1,-1,.1,50);camera.position.set(0,0,10);camera.lookAt(0,0,0);camera.updateMatrixWorld();
  assert.equal(createCameraCuller(T,camera)(houseEffectBounds(samples[0],'flames')),true);
  withPool(pool=>{pool.update(snapshot,groupStructureFire(samples,{nativeFrame:frame(samples)}),26);assert.equal(pool.diagnostics().surfaceSites,2);assert.ok(pool.diagnostics().lights.length>0);});
});

test('corrected native input preserves six-light/power215 limits, fixed allocations, ordinary lamps and idempotent lifecycle',()=>{
  const scene=new T.Scene(),lamp=new T.PointLight(0xffffff,4.8),pool=createStreetFirelight(T);scene.add(lamp,pool.root);const allocated=[...pool.root.children];let disposed=0;for(const light of allocated){const dispose=light.dispose;light.dispose=function(...args){disposed++;return dispose.apply(this,args);};}
  try{
    const samples=Array.from({length:30},(_,i)=>({...fixture.samples[i%2],id:fixture.samples[i%2].id+':control-'+i,x:30+i*3,area:100}));
    for(const time of [0,1,26]){pool.update(snapshot,groupStructureFire(samples,{nativeFrame:frame(samples)}),time);assert.equal(pool.diagnostics().lights.length,6);assert.ok(allocated.reduce((sum,l)=>sum+l.intensity,0)<=215+1e-10);assert.deepEqual(pool.root.children,allocated);assert.equal(lamp.intensity,4.8);}
    const empty=[];pool.update(snapshot,groupStructureFire(empty,{nativeFrame:frame(empty)}),27);assert.ok(allocated.every(l=>l.intensity===0));
    pool.dispose();pool.dispose();pool.update(snapshot,new Map(),28);assert.equal(disposed,6);assert.equal(pool.root.children.length,0);assert.equal(pool.root.parent,null);assert.ok(allocated.every(l=>l.intensity===0));assert.equal(lamp.parent,scene);assert.equal(lamp.intensity,4.8);
  }finally{pool.dispose();lamp.dispose();}
});
