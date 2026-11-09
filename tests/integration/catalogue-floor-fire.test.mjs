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
  const sim=createSimulation({scenario:COTTAGE_PAIR_SCENARIO,cottageWind:wind,seed:1893});
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
  {id:'hopkins-nine',player:{x:5.6,y:29.35},aim:{x:5.6,y:30.15}},
  {id:'monroe-row-middle',player:{x:37.3,y:30.35},aim:{x:37.3,y:31.15}}
])test(fixture.id+' has structural flame and locally retires before the whole house clears',()=>{
  const scenario={...NEIGHBORHOOD_SCENARIO,patches:[],actors:[],player:{...fixture.player,tool:'matches'}};
  const sim=createSimulation({scenario,config:{fire:{damagePerSecond:0}}});
  const art=createNeighborhood(T,library);
  try{
    let s=press(sim,fixture.aim.x,fixture.aim.y);
    const camera=cameraAt(s,12),initial=s.world.buildings.find(b=>b.id===fixture.id);
    assert.ok(s.events.some(e=>e.type==='tool-use'&&e.tool==='matches'&&e.result==='ignited'));
    let surface=false,partial=false;
    for(let i=0;i<152;i++){
      s=sim.advance(.25);
      const building=s.world.buildings.find(b=>b.id===fixture.id);
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
    assert.ok(s.world.buildings.find(b=>b.id===initial.id).destroyed);
    assert.ok(s.world.buildings.filter(b=>b.id!==initial.id).every(b=>!b.destroyed&&b.burnedFraction===0));
  }finally{art.dispose();sim.dispose();}
});

test('quarter-turned Monroe neighbors keep separate starts, supports and clearances',()=>{
  const scenario={id:'neighborhood',width:40,height:40,player:{x:20.66,y:11.3,tool:'matches'},
    buildings:[0,1,2].map(i=>({id:'unit-'+i,prefabId:'monroe-row',x:20,y:8+7*i,quarterTurns:1}))};
  const sim=createSimulation({scenario,config:{input:{cameraRelative:false},fire:{damagePerSecond:0}}});
  try{
    press(sim,19.84,11.3);
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
    for(let i=0;i<155&&!s.world.buildings[0].destroyed;i++)s=sim.advance(.25);
    assert.equal(s.world.buildings[0].destroyed,true);
    assert.equal(s.world.buildings[1].destroyed,false);
    assert.ok(s.world.obstacles.some(o=>o.buildingId==='unit-1'&&o.heatBarriers?.length));
    assert.ok(s.world.buildings[2].sections.every(section=>section.present&&section.firstIgnition===null));
  }finally{sim.dispose();}
});
