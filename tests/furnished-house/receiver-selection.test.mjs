import test from 'node:test';
import assert from 'node:assert/strict';
import vm from 'node:vm';
import {execFileSync} from 'node:child_process';
import {createTrial,RULES,calmWind} from '../../workbenches/furnished-house/simulation.js';
import {initialRepresentatives,chooseReferenceTargets,createNoLawnReceiverSelection} from '../../workbenches/furnished-house/receiver-selection.js';
import {sub,length} from '../../workbenches/furnished-house/geometry.js';

function referenceGrid(){const cells=new Map(),fuels=new Map();for(let z=0;z<7;z++)for(let x=0;x<7;x++){const c={id:`${x*4},0,${z*4}`,position:[x*2+.25,.25,z*2+.25],capacity:.25,fuels:[]},f={id:'fuel:'+c.id,area:.25,cells:[c]};c.fuels.push(f);cells.set(c.id,c);fuels.set(f.id,f);}return {cells,fuels};}
test('no-lawn selection follows the frozen algorithm/order for original, new and distant source positions',()=>{
  const scene=referenceGrid(),frozen=execFileSync('git',['show','66febf33:workbenches/furnished-house/simulation.js'],{encoding:'utf8'}),start=frozen.indexOf('  const initialCombustibleArea='),end=frozen.indexOf('  function emitRadiation');assert.ok(start>0&&end>start);
  const ctx=vm.createContext({cells:scene.cells,fuels:scene.fuels,r:RULES,sub,length,radCache:new Map(),rayQueue:[],tick:0});vm.runInContext(frozen.slice(start,end),ctx);
  const selection=createNoLawnReceiverSelection(scene,scene),positions=[[.25,.25,.25],[3.25,2.07,4.25],[-.75,.25,4.25],[8.25,-.05,8.25],[100,.25,100]];
  for(const [i,position]of positions.entries()){const expected=Array.from(ctx.radiantLinks({id:'source'+i,position}).entries,e=>e.target.id),actual=selection.select({sourceId:'new'+i,position,range:8,count:24});assert.deepEqual(actual.map(r=>r.id),expected);assert.deepEqual(chooseReferenceTargets(initialRepresentatives(scene),position).chosen.map(e=>e.target.id),expected);}
  assert.equal(selection.snapshot().sourceCount,5);assert.equal(selection.snapshot().newSourceCount,5);assert.equal(selection.snapshot().sources.at(-1).selectedCount,0);
});
test('reference coverage fails closed for missing or displaced targets and reports live area differences',()=>{
  const ref=referenceGrid(),live=referenceGrid(),id=[...ref.cells.keys()][0];live.cells.get(id).fuels.push({id:'extra',area:.4,cells:[live.cells.get(id)]});const s=createNoLawnReceiverSelection(ref,live).snapshot();assert.equal(s.initialTargetResolution.areaDifferences.length,1);assert.equal(s.initialTargetResolution.capacityDifferences.length,0);
  live.cells.delete(id);assert.throws(()=>createNoLawnReceiverSelection(ref,live),/Missing or displaced/);const moved=referenceGrid();moved.cells.get(id).position[0]+=.01;assert.throws(()=>createNoLawnReceiverSelection(ref,moved),/Missing or displaced/);
});
const part=(id,x,finish)=>({id,itemId:id,level:0,bounds:{min:[x,.1,.1],max:[x+.3,.4,.4]},material:'wood',fuelClass:'furniture',fuelAmount:1,...(finish?{finish:{amount:.01,fuelClass:'varnish'}}:{})});
function fixture(){return {version:1,prefabId:'receiver-live-check',gridOrigin:[0,0,0],thermalCell:[.5,.5,.5],groundY:-1,surfaces:[{id:'floor',kind:'floor',level:0,normal:[0,1,0],thickness:.12,material:'stone',triangles:[[[0,0,0],[4,0,0],[4,0,1]],[[0,0,0],[4,0,1],[0,0,1]]]},{id:'pane',kind:'window',normal:[1,0,0],material:'glass',thickness:.01,triangles:[[[2,0,0],[2,1,0],[2,1,1]],[[2,0,0],[2,1,1],[2,0,1]]]}],furnitureParts:[part('source',.1),part('target',3.1,true)],items:[]};}
test('disabled hook leaves ordinary finite physics/replay identical on a short fixture',()=>{
  const a=createTrial(fixture(),{wind:calmWind}),b=createTrial(fixture(),{wind:calmWind,radiationSelection:null});try{for(const t of [a,b]){t.command({tick:1,type:'match',position:[.25,.25,.25]});t.step(4);}assert.deepEqual(a.snapshot(),b.snapshot());assert.deepEqual(a.replay(),b.replay());}finally{a.dispose();b.dispose();}
});
test('selected links use live area/incidence and boundary changes still rebuild/update transmission with closed ledgers',()=>{
  const rays=[],trial=createTrial(fixture(),{wind:calmWind,radiationSelection:{select:()=>[{id:'6,0,0',position:[3.25,.25,.25]}],observeRay:r=>rays.push(r)}});try{
    const f=trial.scene.fuels.get('source');f.lit=true;f.litAt=0;trial.step();assert.ok(rays.length);const first=rays.find(r=>r.sourceId==='0,0,0');assert.ok(first);const target=trial.scene.cells.get('6,0,0'),liveArea=target.fuels.reduce((a,f)=>a+f.area/f.cells.length,0);assert.equal(first.area,liveArea);assert.ok(target.fuels.some(f=>f.physicalFinish));assert.ok(Math.abs(first.weight-first.area*first.incidence/(4*Math.PI*9))<1e-12);assert.ok(first.transmission>0&&first.transmission<1);
    const count=rays.length,reads=[],pass=trial.scene.index.pass;trial.scene.index.pass=b=>{const value=pass(b);reads.push(value);return value;};for(const b of trial.scene.index.surfaces.values())if(b.sourceSurfaceId==='pane')trial.scene.index.change(b.id,{intact:false,openFraction:1});assert.ok(reads.includes(1));assert.ok(trial.stats.invalidations>0);
    for(const b of trial.scene.index.surfaces.values())if(b.sourceSurfaceId==='pane')trial.scene.index.change(b.id,{bounds:b.bounds});trial.step();assert.ok(rays.slice(count).some(r=>r.sourceId==='0,0,0'&&r.transmission===1));assert.ok(Math.abs(trial.metrics().fuel.error)<1e-9);assert.ok(Math.abs(trial.metrics().heat.error)<1e-9);
  }finally{trial.dispose();}
});
test('the live resolver rejects an unresolved callback identity before constructing a diagnostic ray',()=>{
  const t=createTrial(fixture(),{radiationSelection:{select:()=>[{id:'absent',position:[3.25,.25,.25]}]}});try{const f=t.scene.fuels.get('source');f.lit=true;f.litAt=0;assert.throws(()=>t.step(),/Missing or displaced diagnostic/);}finally{t.dispose();}
});
