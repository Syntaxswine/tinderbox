import test from 'node:test';
import assert from 'node:assert/strict';
import * as T from '../../src/runtime/three.js';
import {HeatField} from '../../src/simulation/field.js';
import {configuration} from '../../src/simulation/config.js';
import {createSimulation} from '../../src/simulation/index.js';
import {createFireReviewSimulation} from '../../tools/fire-realism/scenarios.js';
import {createGroundField,groundWarmth,consumedFuelChar,NATIVE_WARMTH_MAPPING} from '../../src/art/ground-field.js';
import {groundCharReviewEvidence} from '../../tools/fire-realism/ground-char-evidence.js';

const definition={width:2,height:1,fireCellSize:.5,obstacles:[],patches:[]};
const makeHeat=(fire={},extra={})=>new HeatField({...definition,...extra},configuration({fire:{damagePerSecond:0,...fire}}),definition.obstacles);
const snapshot=(heat,tick=0)=>({tick,clocks:{world:tick/60,player:tick/60},world:definition,cells:heat.snapshot()});
const meta=(art,s)=>({groundChar:art.diagnostics(),lastSnapshot:{tick:s.tick,worldTime:s.clocks.world,playerTime:s.clocks.player}});
function actualGreen(art,c){const at=(Math.floor(c.y/.5)*art.uniforms.grid.value.x+Math.floor(c.x/.5))*4;return art.uniforms.field.value.image.data[at+1];}
function checkReadOnlyMapping(art,s,heat){
  const before=structuredClone(s),stats=heat&&structuredClone(heat.stats),source=heat?.snapshot();art.update(s);
  assert.deepEqual(s,before);if(heat){assert.deepEqual(heat.stats,stats);assert.deepEqual(heat.snapshot(),source);}
  for(const c of s.cells){const at=(Math.floor(c.y/.5)*art.uniforms.grid.value.x+Math.floor(c.x/.5))*4,data=art.uniforms.field.value.image.data;
    assert.equal(data[at],Math.fround(Math.min(1,Math.sqrt(Math.max(0,c.depositedFuel||0))*2)));assert.equal(data[at+2],Math.fround(consumedFuelChar(c)));assert.equal(data[at+3],c.phase==='burning'?1:0);
  }
  const evidence=groundCharReviewEvidence(s,meta(art,s));assert.equal(evidence.status,'available');assert.equal(evidence.warmthMapping,NATIVE_WARMTH_MAPPING);
  for(const c of evidence.cells)assert.equal(c.expectedFloat32RGBA[1],actualGreen(art,c));return evidence;
}

test('actual canonical192/193/194 retains heat warmth through burnout, exact other lanes and rewind without touching source state',()=>{
  const sim=createFireReviewSimulation({scenario:'match-contact'}),art=createGroundField(T),saved=[];
  try{
    for(let frame=1;frame<=194;frame++){
      const s=sim.advance();if(frame<192)continue;assert.equal(s.tick,frame);saved.push(structuredClone(s));
      const before=sim.snapshot(),evidence=checkReadOnlyMapping(art,s);assert.deepEqual(sim.snapshot(),before);assert.equal(evidence.cells.length,4);
      const expected={192:.75,193:Math.fround(.7475),194:Math.fround(.745)}[frame];assert.ok(evidence.cells.every(c=>c.expectedFloat32RGBA[1]===expected));
      assert.ok(evidence.cells.every(c=>c.expectedFloat32RGBA[3]===(frame===192?1:0)));assert.equal(art.diagnostics().charVersion,1);
    }
    const current=sim.snapshot();for(const s of [saved[0],saved[2],saved[1],saved[1]]){const evidence=checkReadOnlyMapping(art,s);assert.equal(evidence.cells[0].expectedFloat32RGBA[1],Math.fround(groundWarmth(s.cells.find(c=>c.id===evidence.cells[0].id),'consumed-fuel-v1')));}
    assert.deepEqual(sim.snapshot(),current);assert.deepEqual(art.counts(),{geometries:1,materials:1,textures:1,objects:0});
  }finally{sim.dispose();art.dispose();}
});

test('actual HeatField phase-only changes do not change G; positive-heat unconsumed records remain B0/A0 observations',()=>{
  const heat=makeHeat(),art=createGroundField(T),c=heat.cells[0];c.heat=1.2;
  try{for(const phase of ['cold','heating','burning','spent'])for(const intensity of [0,.5,1]){
    c.phase=phase;c.intensity=intensity;const s=snapshot(heat),evidence=checkReadOnlyMapping(art,s,heat);
    assert.equal(actualGreen(art,c),Math.fround(.6));assert.equal(evidence.cells.length,1);assert.equal(evidence.cells[0].expectedFloat32RGBA[2],0);assert.equal(evidence.cells[0].expectedFloat32RGBA[3],phase==='burning'?1:0);
  }}finally{art.dispose();}
});

test('actual heating-to-cold and spent cooling reach exact zero with no phase floor or presentation clock',()=>{
  const heat=makeHeat(),art=createGroundField(T),c=heat.cells[0],events=[];c.phase='heating';c.heat=.04;
  try{
    heat.step(.1,.1,(...e)=>events.push(e));assert.equal(c.phase,'cold');checkReadOnlyMapping(art,snapshot(heat,6),heat);assert.equal(actualGreen(art,c),Math.fround(.005));
    heat.step(.1,.2,(...e)=>events.push(e));assert.equal(c.heat,0);checkReadOnlyMapping(art,snapshot(heat,12),heat);assert.equal(actualGreen(art,c),0);
    c.phase='spent';c.heat=1.495;let previous=1;
    for(let i=0;i<350;i++){heat.step(1/60,(i+1)/60,(...e)=>events.push(e));const before=structuredClone(events);checkReadOnlyMapping(art,snapshot(heat,i+1),heat);assert.deepEqual(events,before);const g=actualGreen(art,c);assert.ok(g>=0&&g<=previous);previous=g;}
    assert.equal(c.phase,'spent');assert.equal(c.heat,0);assert.equal(actualGreen(art,c),0);
  }finally{art.dispose();}
});

test('actual incoming heat, refill and re-ignition keep heat-only G while preserving fuel ledgers and phase-caused A',()=>{
  const heat=makeHeat(),art=createGroundField(T),c=heat.cells[0],point={x:c.x,y:c.y},events=[];
  try{
    heat.emit(point,.001,10,'test');assert.equal(c.heat,4);let evidence=checkReadOnlyMapping(art,snapshot(heat),heat);assert.deepEqual(evidence.cells[0].expectedFloat32RGBA,[0,.75,0,0]);
    c.phase='spent';c.heat=.7;heat.addLine({x:.1,y:.25},{x:.4,y:.25},.08,1);assert.equal(c.phase,'heating');assert.equal(c.heat,.7);checkReadOnlyMapping(art,snapshot(heat),heat);assert.equal(actualGreen(art,c),Math.fround(.35));
    c.phase='spent';heat.addPool(point,.001,.02);assert.equal(c.phase,'cold');assert.equal(c.heat,.7);checkReadOnlyMapping(art,snapshot(heat),heat);assert.equal(actualGreen(art,c),Math.fround(.35));
    heat.step(1/60,1/60,(...e)=>events.push(e));assert.equal(c.phase,'burning');checkReadOnlyMapping(art,snapshot(heat,1),heat);assert.equal(actualGreen(art,c),Math.fround(.3475));assert.ok(events.some(e=>e[0]==='ignition'));
    heat.step(1/60,2/60,(...e)=>events.push(e));assert.equal(c.heat,1.5,'This jump is the existing authoritative burnHeat floor');checkReadOnlyMapping(art,snapshot(heat,2),heat);assert.equal(actualGreen(art,c),.75);
  }finally{art.dispose();}
});

test('actual simulation pause and powder retain source clocks and let world-time cooling own the mapping',()=>{
  const scenario={id:'warmth-clocks',width:4,height:4,player:{x:3,y:3},obstacles:[],actors:[],patches:[],ignitions:[{x:1.25,y:1.25,radius:.001,heat:1.5}]};
  const ordinary=createSimulation({scenario,config:{fire:{damagePerSecond:0}}}),powder=createSimulation({scenario,config:{fire:{damagePerSecond:0}}}),art=createGroundField(T);
  try{
    assert.ok(powder.snapshot().player.inventory.powder>0);assert.equal(powder.dispatch({type:'drug',drug:'powder'}),true);
    const a=ordinary.advance(1/60),b=powder.advance(1/60),ca=a.cells.find(c=>c.heat>0),cb=b.cells.find(c=>c.heat>0);
    assert.equal(a.clocks.worldScale,1);assert.equal(b.clocks.worldScale,.35);assert.equal(b.clocks.playerScale,1.5);
    assert.ok(Math.abs(ca.heat-1.495)<1e-12);assert.ok(Math.abs(cb.heat-1.49825)<1e-12);
    const before=powder.snapshot();art.update(b);groundCharReviewEvidence(b,meta(art,b));assert.deepEqual(powder.snapshot(),before);
    assert.equal(actualGreen(art,cb),Math.fround(.749125));ordinary.dispatch({type:'pause',paused:true});const paused=ordinary.advance(1/60),world=paused.clocks.world,heat=paused.cells.find(c=>c.id===ca.id).heat;
    for(let i=0;i<10;i++){const s=ordinary.advance(1/60),state=ordinary.snapshot();art.update(s);groundCharReviewEvidence(s,meta(art,s));assert.equal(s.clocks.world,world);assert.equal(s.cells.find(c=>c.id===ca.id).heat,heat);assert.deepEqual(ordinary.snapshot(),state);}
  }finally{ordinary.dispose();powder.dispose();art.dispose();}
});

test('actual configurable burnHeat and cooling0 expose the fixed prototype display scale without fake minimum or fade',()=>{
  const art=createGroundField(T);
  try{
    for(const [burnHeat,g]of [[0,0],[.5,.25],[3,.75]]){
      const heat=makeHeat({burnHeat,cooling:0},{patches:[{x:0,y:0,width:.5,depth:.5,material:'grass'}]}),c=heat.cells[0];c.phase='burning';c.ignitedAt=0;c.intensity=.5;heat.step(.01,.01,()=>{});assert.equal(c.heat,burnHeat);checkReadOnlyMapping(art,snapshot(heat),heat);assert.equal(actualGreen(art,c),g);
    }
    const heat=makeHeat({cooling:0}),c=heat.cells[0];c.phase='spent';c.heat=1.5;
    for(let i=0;i<10;i++)heat.step(.1,(i+1)*.1,()=>{});checkReadOnlyMapping(art,snapshot(heat,60),heat);assert.equal(c.heat,1.5);assert.equal(actualGreen(art,c),.75);
  }finally{art.dispose();}
});

test('malformed heat anywhere rejects before resize/allocation/fill and retains legacy/empty compatibility and resource ownership',()=>{
  let allocations=0;class Texture extends T.DataTexture{constructor(...args){super(...args);allocations++;}}
  const art=createGroundField({...T,DataTexture:Texture}),heat=makeHeat(),valid=snapshot(heat);heat.cells[0].heat=.8;valid.cells=heat.snapshot();
  let disposals=0;
  try{
    art.update(valid);const texture=art.uniforms.field.value,mesh=art.root.children[0],bytes=texture.image.data.slice(),data=texture.image.data,version=texture.version,diagnostics=art.diagnostics(),grid=art.uniforms.grid.value.toArray();texture.addEventListener('dispose',()=>disposals++);
    for(const value of [NaN,Infinity,-Infinity,-.001,undefined,null,'1',true]){
      const bad=structuredClone(valid);bad.world={...definition,width:3};bad.cells.at(-1).heat=value;
      assert.throws(()=>art.update(bad),/Malformed ground char evidence/);assert.equal(allocations,1);assert.equal(disposals,0);assert.equal(art.uniforms.field.value,texture);assert.equal(texture.image.data,data);assert.deepEqual(data,bytes);assert.equal(texture.version,version);assert.equal(art.root.children[0],mesh);assert.deepEqual(art.uniforms.grid.value.toArray(),grid);assert.deepEqual(art.diagnostics(),diagnostics);assert.deepEqual(art.counts(),{geometries:1,materials:1,textures:1,objects:0});
      assert.equal(groundCharReviewEvidence(bad,meta(art,bad)).status,'unavailable');
    }
    const missing=structuredClone(valid);delete missing.cells.at(-1).heat;assert.throws(()=>art.update(missing),/Malformed/);assert.equal(texture.version,version);
    const legacy={...valid,cells:valid.cells.map(({initialSurfaceFuel,consumedDepositedFuel,heat,...c})=>({...c,phase:'cold'}))};legacy.cells[0].phase='burning';legacy.cells[0].intensity=.8;art.update(legacy);assert.equal(actualGreen(art,legacy.cells[0]),Math.fround(.6));assert.equal(art.diagnostics().warmthMapping,'legacy-phase-v1');assert.equal(groundWarmth({phase:'heating',heat:.8},'legacy-phase'),.24+.8*.55);
    art.update({...valid,cells:[]});assert.ok(texture.image.data.every(v=>v===0));assert.equal(art.diagnostics().warmthMapping,NATIVE_WARMTH_MAPPING);assert.equal(allocations,1);
  }finally{art.dispose();art.dispose();}
  assert.equal(disposals,1);assert.deepEqual(art.counts(),{geometries:0,materials:0,textures:0,objects:0});
});
