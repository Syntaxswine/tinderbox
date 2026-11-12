import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import vm from 'node:vm';
import {execFileSync,spawnSync} from 'node:child_process';
import path from 'node:path';
import {fileURLToPath} from 'node:url';
import {buildGrassFixture,grassFrame,isGrassId} from '../../workbenches/furnished-house/grass-fixture.js';
import {createGrassMeasurements} from '../../workbenches/furnished-house/grass-measurements.js';
import {createTrial} from '../../workbenches/furnished-house/simulation.js';
import {compileScene} from '../../workbenches/furnished-house/scene.js';
import {intersectFootprint,triangleArea,pointOnTriangle} from '../../workbenches/furnished-house/geometry.js';
import {REPLAYS,replayCommand} from '../../workbenches/furnished-house/replay-data.js';
const floor=(id,x,z,w,d,material='stone',fuelAmount=0)=>({id,kind:'floor',level:0,normal:[0,1,0],material,thickness:.12,fuelClass:'frame',fuelAmount,triangles:[[[x,0,z],[x+w,0,z],[x+w,0,z+d]],[[x,0,z],[x+w,0,z+d],[x,0,z+d]]]});
const fixture=()=>({version:1,prefabId:'grass-fixture-check',gridOrigin:[0,.48,0],thermalCell:[.5,1.06,.5],surfaces:[floor('lower',0,0,2,1),floor('wing',0,1,1,1),floor('porch',-.5,0,.5,1),floor('stone',1.5,1.5,.5,.5)]});

test('grass off is the byte-identical original object; exact clipping leaves an L-shaped courtyard and excludes occupied polygons',()=>{
  const base=fixture(),before=JSON.stringify(base);assert.equal(buildGrassFixture(base).data,base);const g=buildGrassFixture(base,{enabled:true,extent:1});assert.equal(JSON.stringify(base),before);
  const grass=g.data.surfaces.filter(s=>isGrassId(s.id)),all=grass.flatMap(s=>s.triangles);assert.ok(all.some(t=>pointOnTriangle([1.25,0,1.25],t)),'unoccupied courtyard was incorrectly filled by a building rectangle');
  for(const t of all)for(const o of g.metadata.occupiedTriangles)assert.ok(intersectFootprint(t,[o],0).reduce((v,t)=>v+triangleArea(t),0)<1e-6);
  assert.ok(all.flat().every(p=>p[1]===0));assert.ok(all.flat().some(p=>p[0]<0&&p[2]<0));assert.equal(g.metadata.groundCellCentreY,-.050000000000000044);
});

test('native lawn adds199.5888m² in913 stable patches and preserves every original fuel and source surface',()=>{
  const raw=JSON.parse(fs.readFileSync(new URL('../../workbenches/furnished-house/house-data.json',import.meta.url))),g=buildGrassFixture(raw,{enabled:true}),a=compileScene(raw),b=compileScene(g.data);
  assert.equal(g.metadata.grassPatches,913);assert.ok(Math.abs(g.metadata.grassArea-199.5888)<1e-7);assert.equal(new Set(g.data.surfaces.map(s=>s.id)).size,g.data.surfaces.length);
  for(const [id,f]of a.fuels)assert.equal(b.fuels.get(id).initial,f.initial);
  const added=[...b.fuels.values()].filter(f=>isGrassId(f.id));assert.equal(added.length,913);assert.ok(added.every(f=>f.cls==='grass'&&f.position[1]===0));assert.ok(Math.abs(b.initialFuel-a.initialFuel-g.metadata.addedFuel)<1e-7);
  assert.deepEqual(g.data.surfaces.slice(0,raw.surfaces.length),raw.surfaces);assert.equal(g.metadata.groundY,0);
});

test('shared replay helper captures the exact commands executed by the frozen original UI, including observer/source',()=>{
  const source=execFileSync('git',['show','d1bc6472:workbenches/furnished-house/main.js'],{encoding:'utf8'}),presets=source.match(/^const REPLAYS=.+;$/m)?.[0],run=source.match(/^function runReplay\(.+$/m)?.[0];assert.ok(presets&&run);
  for(const name of Object.keys(REPLAYS)){let captured;const context=vm.createContext({reset(){},nav:{setPosition(){}},level:0,viewMode:'',clock:{setPaused(){}},$:()=>({}),trial:{windMetadata:{kind:'ambient-control'},command:c=>{captured=JSON.parse(JSON.stringify(c));},replay:()=>({})},notify(){},draw(){}});vm.runInContext(presets+'\n'+run+'\nrunReplay('+JSON.stringify(name)+',{play:false});',context);assert.deepEqual(replayCommand(name),captured);}
});

test('original-area tracking follows detached embers without expanding its denominator and closes cohort fuel/heat accounting',()=>{
  const trial=createTrial({version:1,prefabId:'cohort-check',gridOrigin:[0,0,0],surfaces:[floor('wood',0,0,1,1,'timber',1)]},{profiles:{frame:{threshold:1.3,delay:0,seconds:1,energy:10}}}),m=createGrassMeasurements(trial);
  for(const f of trial.scene.fuels.values()){f.lit=true;f.litAt=0;}m.observe();const initial=m.sample();
  for(let i=0;i<60;i++){trial.step();m.observe();}const last=m.sample(),summary=m.finish();assert.equal(last.house.originalArea,initial.house.originalArea);assert.equal(last.house.everIgnitedArea,initial.house.originalArea);assert.ok(trial.scene.fuels.size>m.owners.size);assert.ok(Math.abs(summary.burned.house-trial.metrics().fuel.burned)<1e-9);assert.ok(Math.abs(summary.generated.house-trial.metrics().heat.generated)<1e-9);trial.dispose();
});

test('grass frame IDs/XYZ/phase are authoritative, separate from house light/storeys, and spent ground persists as ash',()=>{
  const g=buildGrassFixture(fixture(),{enabled:true,extent:.5}),t=createTrial(g.data);for(const f of t.scene.fuels.values()){f.lit=true;f.litAt=0;}t.step(1);const live=grassFrame(t.frame(),t);assert.ok(live.grassGround.length);assert.ok(live.fireSamples.filter(s=>isGrassId(s.id)).every(s=>s.grass&&s.part==='ground'&&s.buildingId==='furnished-exterior-grass'));
  t.step(120);const spent=grassFrame(t.frame({full:true}),t);assert.ok(spent.grassGround.every(s=>s.phase==='ash'&&s.flame===0&&s.smoke===0&&s.fuelFraction===0));assert.ok(spent.grassGround.every(s=>t.scene.index.surfaces.get(s.id).intact));assert.equal(grassFrame(spent,t).grassGround.length,spent.grassGround.length);t.dispose();
});

test('finite runner refuses existing evidence and invalid deadlines or diagnostic horizons before starting work',()=>{
  const base=new URL('../../artifacts/qa/',import.meta.url);fs.mkdirSync(base,{recursive:true});const out=fs.mkdtempSync(path.join(fileURLToPath(base),'grass-runner-')),input=path.join(out,'inputs.json');fs.writeFileSync(input,'preserved');
  try{for(const [args,message]of [[[],'Existing evidence is immutable'],[['--matched-start','kitchen','--seconds','181'],'bounded'],[['--deadline-seconds','NaN'],'bounded']]){const r=spawnSync(process.execPath,['workbenches/furnished-house/compare-grass.mjs','--out',out,...args],{encoding:'utf8'});assert.notEqual(r.status,0);assert.ok(r.stderr.includes(message),r.stderr);assert.equal(fs.readFileSync(input,'utf8'),'preserved');assert.equal(fs.existsSync(path.join(out,'owner.json')),false);}}
  finally{fs.unlinkSync(input);fs.rmdirSync(out);}
});
