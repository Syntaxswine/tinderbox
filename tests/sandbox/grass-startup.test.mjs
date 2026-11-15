import test from 'node:test';
import assert from 'node:assert/strict';
import {createCatalogueThermal,CATALOGUE_GRASS_PROFILE} from '../../src/simulation/catalogue-thermal.js';
import {DEFAULT_CONFIG} from '../../src/simulation/config.js';
import {DEFAULT_PROFILES} from '../../workbenches/furnished-house/scene.js';
import {preparePhysicalInstance} from '../../workbenches/bell-and-alder-sandbox/compose.js';

const floor=(id,material,fuelClass,x=0)=>({id,kind:'floor',level:0,normal:[0,1,0],material,fuelClass,fuelAmount:.08,thickness:.12,triangles:[[[x,0,0],[x+.5,0,.5],[x+.5,0,0]],[[x,0,0],[x,0,.5],[x+.5,0,.5]]]});
function data(){return {version:1,runtimeAdapterVersion:1,prefabId:'small-grass-control',groundY:0,gridOrigin:[0,0,0],levels:[{id:'level-0',index:0,floorY:0}],surfaces:[{...floor('terrain::grass','grass','grass'),kind:'ground',thickness:0,supports:true}],items:[],furnitureParts:[],stores:[],openings:[],sourceMeshes:[],render:{materials:[],geometry:[]},catalogueModules:{doors:[],resident:null,lantern:null}};}
function fixture(extra=[]){
  const source=data();source.surfaces.push(...extra);
  const provider=createCatalogueThermal({compiled:{data:source,instances:[]},state:{player:{id:'hero',x:1,y:1,elevation:0},actors:[],tick:0,generation:0,clocks:{world:0}},definition:{fireCellSize:.5,width:2,height:1},config:DEFAULT_CONFIG,event(){}});
  let tick=0;return {provider,step(){provider.step(1/30,++tick/30,()=>{});return provider.trial.worldTime;}};
}
function closeLedgers(provider){const m=provider.trial.metrics();assert.ok(Math.abs(m.fuel.error)<1e-8,JSON.stringify(m.fuel));assert.ok(Math.abs(m.heat.error)<1e-7,JSON.stringify(m.heat));return m;}

test('production grass finishes in one world second without raising peak power or changing historical, oil and house clocks',()=>{
  assert.equal(DEFAULT_PROFILES.grass.seconds,3);assert.equal(DEFAULT_PROFILES.grass.energy,110);assert.equal(DEFAULT_PROFILES.oil.seconds,14);assert.equal(DEFAULT_PROFILES.clapboard.seconds,180);assert.equal(DEFAULT_PROFILES.frame.seconds,180);
  assert.equal(CATALOGUE_GRASS_PROFILE.energy/CATALOGUE_GRASS_PROFILE.seconds,DEFAULT_PROFILES.grass.energy/DEFAULT_PROFILES.grass.seconds);
  const {provider,step}=fixture();try{
    provider.trial.command({type:'match',position:[.25,.01,.25],energy:1.05});const grass=[...provider.trial.scene.fuels.values()].find(f=>f.cls==='grass');let first=null,last=null,peak=0,generated=0;
    for(let i=0;i<150;i++){step();if(grass.lit&&grass.amount>1e-8){first??=provider.trial.worldTime;last=provider.trial.worldTime;}const next=provider.trial.metrics().heat.generated;peak=Math.max(peak,(next-generated)*30);generated=next;}
    assert.ok(first!==null);assert.ok(last-first>=.93&&last-first<=1.001,JSON.stringify({first,last}));assert.ok(grass.amount<1e-8);assert.ok(peak<=grass.initial*110/3+1e-7);
    const cell=provider.snapshot()[0];assert.equal(cell.phase,'spent');assert.equal(cell.grassSpent,true);assert.equal(cell.flameFuel,null);assert.equal(cell.intensity,0);
    assert.ok(!provider.physicalFrame().fireSamples.some(s=>s.fuelClass==='grass'&&s.flame>0));
    provider.trial.command({type:'match',position:[.25,.01,.25],energy:1.05});for(let i=0;i<60;i++)step();assert.ok(grass.amount<1e-8);assert.equal(provider.snapshot()[0].intensity,0);
    closeLedgers(provider);
  }finally{provider.dispose();}
});

test('spent grass remains scorched while independently finite oil continues with oil ownership and no grass flame tail',()=>{
  const {provider,step}=fixture();try{
    provider.trial.command({type:'deposit',position:[.25,.001,.25],amount:.04});provider.trial.command({type:'match',position:[.25,.01,.25],energy:1.05});
    let oilStart=null,oilEnd=null;
    for(let i=0;i<480;i++){
      step();const oil=[...provider.trial.scene.fuels.values()].find(f=>f.cls==='oil');if(oil?.lit&&oil.amount>1e-8)oilStart??=provider.trial.worldTime;else if(oilStart!==null)oilEnd??=provider.trial.worldTime;
      if(i===90){const cell=provider.snapshot()[0];assert.equal(cell.grassSpent,true);assert.equal(cell.phase,'burning');assert.equal(cell.flameFuel,'oil');assert.ok(cell.surfaceFuel<1e-8);assert.ok(cell.depositedFuel>0);assert.ok(!provider.physicalFrame().fireSamples.some(s=>s.fuelClass==='grass'&&s.flame>0));}
    }
    assert.ok(oilStart!==null&&oilEnd!==null);assert.ok(Math.abs(oilEnd-oilStart-14)<.07,{oilStart,oilEnd});assert.equal(provider.snapshot()[0].phase,'spent');closeLedgers(provider);
  }finally{provider.dispose();}
});

test('owned placement can consume a frozen source without aliasing transforms, nested bounds metadata or another placement',()=>{
  const source=data();source.surfaces[0].id='grass';source.sourceMeshes.push({id:'mesh',bounds:{min:[0,0,0],max:[.5,.12,.5],audit:{source:['native']}}});source.render.geometry.push({id:'mesh-geometry',triangles:[{vertices:[[0,0,0,0,1,0,0,0],[.5,0,.5,0,1,0,1,1],[.5,0,0,0,1,0,1,0]]}]});
  function freeze(value){if(value&&typeof value==='object'){Object.values(value).forEach(freeze);Object.freeze(value);}return value;}const original=JSON.stringify(source);freeze(source);
  const spec={id:'one',translation:[2,0,3],quarterTurns:1},a=preparePhysicalInstance(source,spec).data,b=preparePhysicalInstance(source,{...spec,id:'two'}).data;
  a.sourceMeshes[0].bounds.audit.source.push('changed');a.surfaces[0].triangles[0][0][0]=99;a.render.geometry[0].triangles[0].vertices[0][6]=99;
  assert.equal(JSON.stringify(source),original);assert.deepEqual(b.sourceMeshes[0].bounds.audit.source,['native']);assert.notEqual(b.surfaces[0].triangles[0][0][0],99);assert.notEqual(b.render.geometry[0].triangles[0].vertices[0][6],99);
});
