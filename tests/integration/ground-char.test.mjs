import test from 'node:test';
import assert from 'node:assert/strict';
import * as T from '../../src/runtime/three.js';
import {HeatField} from '../../src/simulation/field.js';
import {configuration} from '../../src/simulation/config.js';
import {createSimulation} from '../../src/simulation/index.js';
import {createGroundField,classifyCharEvidence,consumedFuelChar} from '../../src/art/ground-field.js';

const close=(a,b,tolerance=1e-12)=>assert.ok(Math.abs(a-b)<=tolerance,`${a} differs from ${b} by ${Math.abs(a-b)}`);
const definition=(extra={})=>({width:2,height:2,fireCellSize:.5,obstacles:[],patches:[],...extra});
const config=override=>configuration({fire:{damagePerSecond:0},...override});
const field=(def=definition(),cfg=config())=>new HeatField(def,cfg,def.obstacles);
const cell=extra=>({id:'test',x:.25,y:.25,size:.5,material:'paving',initialSurfaceFuel:0,surfaceFuel:0,consumedDepositedFuel:0,depositedFuel:0,heat:0,intensity:0,phase:'cold',...extra});
const frame=cells=>({world:{width:1,height:.5,fireCellSize:.5},cells});

test('initial evidence uses configured density and exact native/partial timber intersection at several cell sizes',()=>{
  for(const size of [.25,.5,1]){
    const wall={id:'native-wall',x:.5,y:.5,width:1,depth:.16,height:2,material:'wood'};
    const cfg=config({fuel:{surfaceDensity:{grass:.17,wood:1.7}}});
    const def=definition({fireCellSize:size,patches:[{x:0,y:0,width:2,depth:2,material:'grass'}],obstacles:[wall]});
    const heat=field(def,cfg),timber=heat.cells.filter(c=>c.material==='wood');
    close(timber.reduce((sum,c)=>sum+c.initialSurfaceFuel,0),1*.16*1.7);
    for(const c of heat.cells){assert.equal(c.initialSurfaceFuel,c.surfaceFuel);assert.equal(c.consumedDepositedFuel,0);if(c.material==='grass')close(c.initialSurfaceFuel,.17*size*size);}
    if(size===.5)close(heat.at({x:.25,y:.25}).initialSurfaceFuel,1.7*.5*.08);
  }
  const empty=field();assert.ok(empty.cells.every(c=>c.initialSurfaceFuel===0&&c.consumedDepositedFuel===0));
  const overlapping=definition({obstacles:[{x:.25,y:.25,width:.5,depth:.5,material:'wood'},{x:.25,y:.25,width:.5,depth:.5,material:'wood'}]});
  assert.equal(field(overlapping).cells[0].initialSurfaceFuel,1.2*.25,'Existing summed-area cap is preserved, not replaced with a new union calculation');
});

test('evidence records only actual subtraction, conserves global totals and survives fresh gas/pools/re-ignition',()=>{
  const cfg=config({fuel:{gasBurnRate:.027,surfaceBurnRate:.031,surfaceDensity:{grass:.19}}});
  const def=definition({patches:[{x:0,y:0,width:1,depth:1,material:'grass'}]}),heat=field(def,cfg);
  const point={x:.25,y:.25},target=heat.at(point);let time=0;const seen=[];
  heat.emit(point,.001,.1,'warming');heat.step(.01,time+=.01,(...args)=>seen.push(args));
  assert.equal(target.phase,'heating');assert.equal(target.initialSurfaceFuel,target.surfaceFuel);assert.equal(target.consumedDepositedFuel,0);
  heat.addLine({x:.1,y:.25},{x:.4,y:.25},.08,Infinity);heat.emit(point,.001,3,'test');
  function step(){
    const before=heat.cells.map(c=>({deposited:c.depositedFuel,burning:c.phase==='burning',consumed:c.consumedDepositedFuel}));
    heat.step(.037,time+=.037,(...args)=>seen.push(args));
    for(let i=0;i<heat.cells.length;i++)assert.equal(heat.cells[i].consumedDepositedFuel,before[i].consumed+(before[i].burning?Math.min(before[i].deposited,cfg.fuel.gasBurnRate*.037):0));
    close(heat.cells.reduce((sum,c)=>sum+c.consumedDepositedFuel,0),heat.stats.burnedDepositedFuel,2e-12);
    // Existing terminal clearing can remove at most EPS=1e-10 per cell without
    // adding it to the old global ledger; no new correction is made to physics.
    close(heat.cells.reduce((sum,c)=>sum+c.initialSurfaceFuel-c.surfaceFuel,0),heat.stats.burnedSurfaceFuel,heat.cells.length*1e-10+2e-12);
  }
  for(let i=0;i<900;i++)step();assert.equal(target.phase,'spent');assert.ok(seen.some(e=>e[0]==='burnout'));
  const consumed=target.consumedDepositedFuel,scar=consumedFuelChar(target);assert.ok(consumed>0);
  heat.addLine({x:.1,y:.25},{x:.4,y:.25},.04,Infinity);assert.equal(target.consumedDepositedFuel,consumed);assert.equal(consumedFuelChar(target),scar);
  heat.addPool(point,.001,.013);assert.equal(target.consumedDepositedFuel,consumed);heat.emit(point,.001,3,'re-ignite');
  for(let i=0;i<200;i++)step();assert.equal(target.phase,'spent');assert.ok(target.consumedDepositedFuel>consumed);
  close(heat.stats.pouredFuel+heat.stats.molotovFuel,heat.stats.burnedDepositedFuel+heat.cells.reduce((sum,c)=>sum+c.depositedFuel,0),heat.cells.length*1e-10+2e-12);
});

test('prototype coverage has known surface/gas/combined values and remains continuous across phase and old blue thresholds',()=>{
  for(const size of [.25,.5,1]){
    assert.equal(consumedFuelChar(cell({size})),0);
    assert.equal(consumedFuelChar(cell({size,initialSurfaceFuel:2,surfaceFuel:1})),.5);
    const sootHalf=Math.LN2*.16*size*size;
    close(consumedFuelChar(cell({size,consumedDepositedFuel:sootHalf})),.5);
    close(consumedFuelChar(cell({size,initialSurfaceFuel:2,surfaceFuel:1,consumedDepositedFuel:sootHalf})),.75);
    assert.equal(consumedFuelChar(cell({size,initialSurfaceFuel:2,surfaceFuel:0})),1);
    assert.equal(consumedFuelChar(cell({size,depositedFuel:100,phase:'heating',heat:3})),0,'Unburned wet fuel is not char');
  }
  const art=createGroundField(T);try{
    let previous=-1;
    for(const c of [0,.009999,.01,.010001,.269999,.27,.270001,.899999,.9,.900001,.999999,1]){
      const source=cell({initialSurfaceFuel:1,surfaceFuel:1-c,phase:'burning'});art.update(frame([source]));const actual=art.uniforms.field.value.image.data[2];close(actual,c,3e-8);assert.ok(actual>=previous);previous=actual;
      const before=actual;art.update(frame([{...source,phase:'spent'}]));assert.equal(art.uniforms.field.value.image.data[2],before,'Phase alone cannot jump char');
    }
    const shader=art.root.children[0].material.fragmentShader,newBranch=shader.split('}else{')[1].split('\n        }')[0];
    assert.match(newBranch,/charWidth=mix\(\.29,\.50,state\.b\)/);
    assert.equal((newBranch.match(/mix\(length\(p\),segment\(p,/g)||[]).length,4,'All cardinal char connections interpolate with neighbor blue');
    assert.doesNotMatch(newBranch,/[<>]|\bstep\s*\(|\bif\s*\(/,'The new width/connection branch has no binary neighbor/coverage threshold');
    // The source-checked GLSL mix continuously interpolates the existing center
    // and segment distances. These independent limits are not a GPU trace.
    for(const threshold of [.01,.9]){const distance=n=>.4*(1-n)+.1*n;assert.ok(Math.abs(distance(threshold+1e-6)-distance(threshold-1e-6))<1e-6);}
  }finally{art.dispose();}
});

test('new texture maps current heat while legacy lanes stay explicit, detached and replayable without history',()=>{
  const art=createGroundField(T);try{
    const source=[cell({depositedFuel:.0625,heat:.8,phase:'heating'}),cell({id:'wood',x:.75,material:'wood',initialSurfaceFuel:.3,surfaceFuel:.15,phase:'burning',intensity:.8})];
    const original=structuredClone(source);art.update(frame(source));const texture=art.uniforms.field.value;
    assert.deepEqual(texture.image.data,new Float32Array([.5,.4,0,0,0,0,.5,1]));assert.deepEqual(source,original);
    assert.deepEqual(art.diagnostics(),{charMode:'consumed-fuel-v1',charVersion:1,warmthMapping:'native-heat-v1',cells:2});
    const bytes=texture.image.data.slice();art.update({...frame(source.map(c=>({...c,consumedDepositedFuel:.05}))),paused:true});art.update({...frame(original),paused:true});assert.deepEqual(texture.image.data,bytes,'Rewinding to the same authoritative frame restores the same mask');
    const legacy=source.map(({initialSurfaceFuel,consumedDepositedFuel,...c})=>c);art.update(frame(legacy));
    assert.deepEqual(texture.image.data,new Float32Array([.5,.68,0,0,0,.6,.27,1]));assert.deepEqual(art.diagnostics(),{charMode:'legacy-phase',charVersion:0,warmthMapping:'legacy-phase-v1',cells:2});
    const shader=art.root.children[0].material.fragmentShader,legacyBranch=shader.split('if(charVersion<.5){')[1].split('}else{')[0];
    assert.equal((legacyBranch.match(/\.b>\.01/g)||[]).length,4);assert.match(legacyBranch,/charWidth=state\.b>\.9\?\.50:\.29/);
    art.update(frame([]));assert.equal(art.uniforms.charVersion.value,1);assert.ok(texture.image.data.every(value=>value===0));assert.equal(classifyCharEvidence([]),'empty');
  }finally{art.dispose();}
});

test('partial, mixed or malformed new records fail before any borrowed texture/resource mutation',()=>{
  const art=createGroundField(T);try{
    art.update(frame([cell({initialSurfaceFuel:1,surfaceFuel:.5})]));const texture=art.uniforms.field.value,before=texture.image.data.slice(),version=texture.version,counts=art.counts(),diagnostic=art.diagnostics();
    const legacy={x:.75,y:.25,size:.5,phase:'cold'},partial={...cell()};delete partial.consumedDepositedFuel;
    const bad=[null,{},'0',NaN,Infinity,-1,undefined];
    const records=[null,{},[partial],[cell(),legacy],[null],[cell({surfaceFuel:1})],[cell({size:0})],[cell({size:1})],[cell({x:-.25})],[cell({x:4.25})],[cell(),cell()],...bad.flatMap(value=>[[cell({initialSurfaceFuel:value})],[cell({consumedDepositedFuel:value})]])];
    for(const cells of records){assert.throws(()=>art.update({...frame(cells),world:{width:3,height:3,fireCellSize:.5}}),/Ground char|ground char|Malformed|Partial|Mixed/);assert.equal(art.uniforms.field.value,texture);assert.equal(texture.version,version);assert.deepEqual(texture.image.data,before);assert.deepEqual(art.counts(),counts);assert.deepEqual(art.diagnostics(),diagnostic);}
  }finally{art.dispose();}
});

test('actual simulation evidence is detached, pause-frozen and reset; native mask keeps one owned texture/material/geometry',()=>{
  const sim=createSimulation({scenario:{id:'char-reset',width:4,height:4,player:{x:.75,y:.75},obstacles:[],actors:[],patches:[{x:0,y:0,width:4,depth:4,material:'grass'}],ignitions:[{x:2.25,y:2.25,heat:3,radius:.001}]},config:{fire:{damagePerSecond:0}}});
  const art=createGroundField(T);let textureDisposals=0,geometryDisposals=0,materialDisposals=0;
  try{
    let snapshot;for(let i=0;i<50;i++)snapshot=sim.advance(1/60);art.update(snapshot);
    const texture=art.uniforms.field.value,mesh=art.root.children[0];texture.addEventListener('dispose',()=>textureDisposals++);mesh.geometry.addEventListener('dispose',()=>geometryDisposals++);mesh.material.addEventListener('dispose',()=>materialDisposals++);
    assert.deepEqual(art.counts(),{geometries:1,materials:1,textures:1,objects:0});assert.equal(texture.minFilter,T.NearestFilter);assert.equal(texture.magFilter,T.NearestFilter);assert.equal(texture.generateMipmaps,false);assert.equal(texture.image.data.length,8*8*4);
    const changed=snapshot.cells.find(c=>c.surfaceFuel<c.initialSurfaceFuel);assert.ok(changed);changed.initialSurfaceFuel=999;changed.consumedDepositedFuel=999;
    const fresh=sim.snapshot();assert.ok(fresh.cells.every(c=>c.initialSurfaceFuel!==999&&c.consumedDepositedFuel!==999));
    sim.dispatch({type:'pause',paused:true});const paused=sim.advance(1/60);for(let i=0;i<10;i++)sim.advance(1/60);assert.deepEqual(sim.snapshot().cells,paused.cells);art.update(paused);const saved=texture.image.data.slice();art.update(paused);assert.equal(art.uniforms.field.value,texture);assert.deepEqual(texture.image.data,saved);
    sim.dispatch({type:'reset'});const reset=sim.advance(1/60);assert.ok(reset.cells.every(c=>c.consumedDepositedFuel===0&&c.initialSurfaceFuel===c.surfaceFuel));art.update(reset);assert.ok(texture.image.data.filter((_,i)=>i%4===2).every(value=>value===0));
    art.update(frame([]));assert.equal(textureDisposals,1);assert.equal(geometryDisposals,1);assert.equal(materialDisposals,0);assert.deepEqual(art.counts(),{geometries:1,materials:1,textures:1,objects:0});
  }finally{sim.dispose();art.dispose();art.dispose();assert.equal(materialDisposals,1);assert.deepEqual(art.counts(),{geometries:0,materials:0,textures:0,objects:0});}
});
