import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import * as T from '../../src/runtime/three.js';
import {createCameraRig} from '../../src/runtime/camera.js';
import {createSimulation} from '../../src/simulation/index.js';
import {COTTAGE_PAIR_SCENARIO} from '../../src/content/cottage-pair.js';
import {NEIGHBORHOOD_SCENARIO} from '../../src/content/neighborhood.js';
import {HOUSING_PLANS} from '../../src/content/housing-plans.js';
import {buildingPoint} from '../../src/content/buildings.js';
import {housingSectionAt,housingSectionGrid} from '../../src/content/housing-sections.js';
import {translateCottageWind,PAIR_WIND_URL} from '../../src/reuse/ashland/wind.js';
import {createCottagePairArt} from '../../src/art/cottage-pair.js';
import {createNeighborhood} from '../../src/art/neighborhood.js';
import {freePoint} from '../../src/simulation/geometry.js';

const load = name => JSON.parse(readFileSync(new URL('../../assets/art/'+name+'/houses.json',import.meta.url)));
const gross=load('gross-housing-v1'),hopkins=load('hopkins-housing-v1');
const library={catalogue:{...gross,houses:[...gross.houses,...hopkins.houses]},textures:{}};
const wind=translateCottageWind(JSON.parse(readFileSync(PAIR_WIND_URL)));
const press=(sim,x,y)=>{
  sim.dispatch({type:'aim',x,y});sim.dispatch({type:'primary',pressed:true});
  const snapshot=sim.advance(1/60);
  sim.dispatch({type:'primary',pressed:false});
  return snapshot;
};
const cameraAt=(snapshot,z)=> {
  const rig=createCameraRig({clientWidth:1280,clientHeight:414},{setSize(){}},snapshot.world,{x:10,y:z});
  rig.update(snapshot.player);return rig.camera;
};

test('both Ashland basements vent actual live floor fuel while lower supports remain',()=>{
  const sim=createSimulation({scenario:COTTAGE_PAIR_SCENARIO,cottageWind:wind,seed:1893,config:{cottage:{radiation:false}}});
  const initial=sim.snapshot(),camera=cameraAt(initial,-12);
  const art=createCottagePairArt(T,library,initial.world.buildings,wind);
  try{
    let s=press(sim,51,13.5);
    const visible=new Set(),remainingAtEnd=new Map();
    for(let i=0;i<172;i++){
      s=sim.advance(.25);
      const houses=s.cottageFire.buildings;
      if(houses.some(b=>b.cells.some(c=>c.layer==='lower'&&c.flame>0))){
        art.update(s.cottageFire,{camera,player:s.player});
        for(const rendered of art.diagnostics().houses){
          const house=houses.find(b=>b.id===rendered.id);
          for(const vent of rendered.lowerOpenings??[]){
            assert.ok(house.tiles[vent.tile].lower,'vent uses live lower support');
            assert.ok(house.cells.some(c=>c.layer==='lower'&&c.tile===vent.tile&&c.flame>0),'vent uses burning lower fuel');
            if(vent.visibleFromCamera)visible.add(house.id);
          }
        }
      }
      for(const house of houses)if(!house.gone&&house.deadline&&house.deadline-s.clocks.world<.27){
        remainingAtEnd.set(house.id,house.tiles.reduce((n,t)=>n+Number(t.roof)+Number(t.upper)+Number(t.lower),0));
        assert.ok(house.cells.some(c=>c.layer==='lower'&&c.flame>.025&&c.cause==='falling-fuel'),'a legitimately ignited lower remnant burns until clearance');
      }
    }
    assert.equal(visible.size,2,'both lower storeys are readable from the normal camera');
    assert.equal(remainingAtEnd.size,2);
    assert.ok([...remainingAtEnd.values()].every(count=>count>0&&count<=4));
    for(const b of s.cottageFire.buildings)assert.equal(b.retiredAt,b.firstIgnition.time+30);
    assert.ok(Math.abs(s.cottageFire.buildings[1].firstIgnition.time-s.cottageFire.buildings[0].firstIgnition.time-11.95)<1e-8);
  }finally{art.dispose();sim.dispose();}
});

for(const fixture of [
  {id:'hopkins-nine',player:{x:10.82,y:34.63},aim:{x:9.9,y:34.63}},
  {id:'monroe-row-middle',player:{x:38.5,y:30.35},aim:{x:38.5,y:31.15}},
  {id:'hopkins-fifteen',player:{x:24.82,y:8.5},aim:{x:23.9,y:8.5}}
])test(fixture.id+' climbs to the main roof and locally retires before the whole house clears',t=>{
  const scenario={...NEIGHBORHOOD_SCENARIO,patches:[],actors:[],player:{...fixture.player,tool:'matches'}};
  const sim=createSimulation({scenario,config:{fire:{damagePerSecond:0}}});
  const art=createNeighborhood(T,library);
  try{
    let s=press(sim,fixture.aim.x,fixture.aim.y);
    const camera=cameraAt(s,12),initial=s.world.buildings.find(b=>b.id===fixture.id);
    const match=s.events.find(e=>e.type==='tool-use'&&e.tool==='matches');
    assert.equal(match?.result,'ignited');
    assert.equal(match.heatedCells,1);
    assert.equal(s.structureFire.length,1);
    assert.equal(s.structureFire[0].id,match.cellIds[0]);
    const ignitions=new Map();
    const first=prefix=>[...ignitions.values()].find(e=>e.siteId.startsWith(fixture.id+'/'+prefix));
    let surface=false,partial=false,roofFlameFrames=0,firstClear,finalClear;
    for(let i=0;i<152;i++){
      s=sim.advance(.25);
      const building=s.world.buildings.find(b=>b.id===fixture.id);
      for(const e of s.events)if(e.buildingId===fixture.id){
        if(e.type==='structure-ignition')ignitions.set(e.siteId,e);
        if(e.type==='building-section-burnout')firstClear??=e.worldTime;
        if(e.type==='building-burnout')finalClear??=e.worldTime;
      }
      const samples=s.structureFire.filter(site=>site.buildingId===fixture.id);
      const roofs=samples.filter(site=>site.id.startsWith(fixture.id+'/roof:main:1:')&&site.flame>.2);
      if(roofs.length>=2)roofFlameFrames++;
      for(const site of roofs){
        assert.equal(site.part,'roof');
        assert.equal(site.exposed,true);
        assert.ok(site.area>0&&site.y>=HOUSING_PLANS[building.prefabId].plinth+2&&site.ny>0);
        assert.ok(Math.abs(Math.hypot(site.nx,site.ny,site.nz)-1)<1e-8);
        assert.ok([site.flame,site.smoke,site.heatFraction].every(value=>value>=0&&value<=1));
      }
      if(!surface||!partial){
        art.update(s.world,{camera,player:s.player,worldTime:s.clocks.world});
        const rendered=art.diagnostics().models.find(b=>b.instanceId===fixture.id);
        surface||=(rendered?.structuralFlames??0)>0;
        const cleared=building.sections?.filter(section=>!section.present)??[];
        if(!building.destroyed&&cleared.length&&cleared.length<building.sections.length){
          partial=true;
          assert.deepEqual(rendered.clearedSections,cleared.map(section=>section.index));
          const boxes=s.world.obstacles.filter(o=>o.buildingId===fixture.id);
          assert.ok(cleared.every(section=>boxes.every(box=>box.catalogueSection!==section.index)));
          const grid=housingSectionGrid(building.prefabId);
          for(const sample of samples){
            const local=buildingPoint({x:0,y:0,quarterTurns:(4-building.quarterTurns)%4},
              {x:sample.x-building.x,y:sample.z-building.y});
            assert.ok(building.sections[housingSectionAt(grid,local.x,local.y)].present);
          }
          assert.ok(boxes.some(box=>!freePoint(box,.08,s.world,s.world.obstacles)));
          const {width,depth}=HOUSING_PLANS[building.prefabId],cols=Math.ceil(width/2);
          assert.ok(cleared.some(({index})=>freePoint(buildingPoint(building,{
            x:Math.min(width-.4,(index%cols+.5)*2),
            y:Math.min(depth-.4,(Math.floor(index/cols)+.5)*2)
          }),.08,s.world,s.world.obstacles)),'cleared source geometry releases its matching footprint');
        }
      }
      if(building.destroyed)break;
    }
    assert.ok(surface,'burning fuel is drawn on the building');
    assert.ok(partial,'one or more sections clear while others remain solid');
    assert.ok(roofFlameFrames>=4,'the main roof sustains multiple burning sites for at least one second');
    const path=['wall:0:','wall:1:','eave:1:','roof:main:1:'].map(prefix=>first(prefix)?.worldTime);
    assert.ok(path.every((time,i)=>Number.isFinite(time)&&(!i||time>path[i-1])),JSON.stringify(path));
    let ancestor=first('roof:main:1:');
    const parents=[];
    while(ancestor&&parents.length<ignitions.size){
      parents.push(ancestor);
      ancestor=ignitions.get(ancestor.parentSiteId);
    }
    assert.ok(parents.some(e=>e.siteId.startsWith(fixture.id+'/eave:1:')));
    assert.equal(parents.at(-1).siteId,match.cellIds[0]);
    assert.ok(firstClear>path.at(-1)&&finalClear>firstClear);
    const neighbors = new Set(Object.values(initial.partyWalls).filter(Boolean));
    assert.ok(s.structureFire.every(site => neighbors.has(site.buildingId)));
    assert.ok(s.world.buildings.find(b=>b.id===initial.id).destroyed);
    assert.ok(s.world.buildings.filter(b=>b.id!==initial.id&&!neighbors.has(b.id)).every(b=>!b.destroyed&&b.burnedFraction===0));
    const ms=time=>+time?.toFixed(3);
    t.diagnostic(JSON.stringify({path:path.map(ms),firstRoof:ms(first('roof:')?.worldTime),firstClear:ms(firstClear),finalClear:ms(finalClear),parents:parents.map(e=>e.siteId)}));
  }finally{art.dispose();sim.dispose();}
});

test('quarter-turned Monroe neighbors keep separate starts, supports and clearances',()=>{
  const scenario={id:'neighborhood',width:40,height:40,player:{x:20.66,y:12.5,tool:'matches'},
    buildings:[0,1,2].map(i=>({id:'unit-'+i,prefabId:'monroe-row',x:20,y:8+7*i,quarterTurns:1}))};
  const sim=createSimulation({scenario,config:{input:{cameraRelative:false},fire:{damagePerSecond:0}}});
  try{
    const started=press(sim,19.84,12.5);
    assert.equal(started.structureFire[0].buildingId,'unit-0');
    assert.deepEqual([started.structureFire[0].nx,started.structureFire[0].nz],[1,0]);
    for(let i=0;i<12;i++)sim.advance(.25);
    for(const [x,y,ticks] of [[1,0,30],[0,1,47],[-1,0,30]]){
      sim.dispatch({type:'move',x,y});
      for(let i=0;i<ticks;i++)sim.advance(1/60);
    }
    sim.dispatch({type:'move',x:0,y:0});
    let s=press(sim,19.84,sim.snapshot().player.y);
    const first=b=>Math.min(...(b.sections??[]).map(section=>section.firstIgnition??Infinity));
    const [a,b,c]=s.world.buildings;
    assert.ok(first(b)>first(a)+3&&first(b)<Infinity);
    assert.equal(first(c),Infinity);
    let third;
    for(let i=0;i<155&&!s.world.buildings[0].destroyed;i++){
      s=sim.advance(.25);
      third??=s.events.find(e=>e.type==='structure-ignition'&&e.buildingId==='unit-2');
    }
    assert.equal(s.world.buildings[0].destroyed,true);
    assert.equal(s.world.buildings[1].destroyed,false);
    assert.ok(s.world.obstacles.some(o=>o.buildingId==='unit-1'&&o.heatBarriers?.length));
    assert.ok(third?.parentSiteId.startsWith('unit-1/roof:main:'));
    assert.equal(third.cause,'joined-roof');
    assert.equal(s.world.buildings[2].destroyed,false);
    assert.ok(s.structureFire.every(site=>site.buildingId==='unit-1'||site.buildingId==='unit-2'));
  }finally{sim.dispose();}
});
