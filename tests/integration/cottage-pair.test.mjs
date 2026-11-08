import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {createHash} from 'node:crypto';
import * as T from '../../src/runtime/three.js';
import {createCameraRig} from '../../src/runtime/camera.js';
import {createSimulation} from '../../src/simulation/index.js';
import {configuration} from '../../src/simulation/config.js';
import {COTTAGE_IDS,COTTAGE_ORIGIN,COTTAGE_PAIR_SCENARIO,catalogueCottageMode} from '../../src/content/cottage-pair.js';
import {translateCottageWind,calmCottageWind,PAIR_WIND_URL,PAIR_WIND_SHA256} from '../../src/reuse/ashland/wind.js';
import {makeHouseWindSampler} from '../../src/reuse/ashland/wind-sampler.js';
import {createCottagePairArt} from '../../src/art/cottage-pair.js';
import {roofHeight} from '../../src/simulation/cottage-topology.js';

const bake=readFileSync(PAIR_WIND_URL),wind=translateCottageWind(JSON.parse(bake));
const make=(extra={})=>createSimulation({scenario:COTTAGE_PAIR_SCENARIO,seed:1893,cottageWind:wind,...extra});
const first=s=>s.cottageFire.buildings[0];
const point=(sim,x=51,y=13.5)=>sim.dispatch({type:'aim',x,y});
function match(sim,x=51){
  assert.ok(point(sim,x));assert.ok(sim.dispatch({type:'primary',pressed:true}));
  const s=sim.advance(1/60);sim.dispatch({type:'primary',pressed:false});return s;
}
function assertCold(snapshot){
  assert.ok(snapshot.cottageFire.buildings.every(b=>b.firstIgnition===null&&b.cells.length===0&&b.tiles.every(t=>t.roof&&t.upper&&t.lower)));
  assert.equal(snapshot.cottageFire.embers.length,0);
}
function assertMask(snapshot){
  for(const b of snapshot.cottageFire.buildings){
    const colliders=snapshot.world.obstacles.filter(o=>o.buildingId===b.id);
    assert.equal(colliders.filter(o=>o.cottageTile!==undefined).length,b.tiles.filter(t=>t.roof||t.upper||t.lower).length);
    for(const tile of b.tiles)assert.equal(colliders.some(o=>o.cottageTile===tile.index),tile.roof||tile.upper||tile.lower);
    if(b.gone)assert.equal(colliders.length,0);
  }
}

test('opt-in routing preserves the regular street; the exact Nautilus bake follows the native placement',()=>{
  assert.equal(catalogueCottageMode(''),null);
  assert.equal(catalogueCottageMode('?cottages=1'),'wind');
  assert.equal(catalogueCottageMode('?cottages=calm'),'calm');
  assert.equal(catalogueCottageMode('?cottages=other'),null);
  assert.equal(createHash('sha256').update(bake).digest('hex'),PAIR_WIND_SHA256);
  const local=makeHouseWindSampler(JSON.parse(bake));
  for(const [x,y,z] of [[.5,2.5,-.5],[7,4.5,9],[12,5,13.5]])assert.deepEqual(wind(COTTAGE_ORIGIN.x+x,y,COTTAGE_ORIGIN.z+z),local(x,y,z));
  assert.throws(()=>make({cottageWind:null}),/checked wind sampler/);
  const ordinary=createSimulation({scenario:'neighborhood'});
  try{const s=ordinary.snapshot();assert.equal(s.cottageFire,undefined);assert.equal(s.world.buildings.find(b=>b.id===COTTAGE_IDS[0]).quarterTurns,2);}finally{ordinary.dispose();}
});

test('player-selected match contacts drive distinct routes; the receiver requires live contact, with exact separate clearances',()=>{
  function run(cottageWind,left=false){
    const scenario=left?{...COTTAGE_PAIR_SCENARIO,player:{x:45.25,y:13.5,tool:'matches'}}:COTTAGE_PAIR_SCENARIO;
    const sim=make({cottageWind,scenario});
    const receipts=new Map(),frozen=new Map();
    try{
      assertCold(sim.advance(.25));
      let s=match(sim,left?47:51);
      assert.equal(s.player.inventory.matches,11);
      assert.equal(first(s).firstIgnition.cellId,left?'left:3,0':'right:3,0');
      assert.equal(first(s).cells.length,1);assert.equal(s.cottageFire.buildings[1].cells.length,0);
      assert.equal(s.events.find(e=>e.tool==='matches').heatedCells,1);
      for(let i=0;i<180;i++){
        s=sim.advance(.25);assertMask(s);
        for(const b of s.cottageFire.buildings){
          if(!b.firstIgnition)assert.equal(b.cells.length,0);
          else{
            const old=frozen.get(b.id);
            if(old)assert.equal(b.deadline,old);
            else frozen.set(b.id,b.deadline);
            assert.ok(Math.abs(b.deadline-b.firstIgnition.time-30)<1e-9);
          }
        }
        for(const e of s.events)receipts.set(e.id,e);
      }
      assert.equal(s.cottageFire.diagnostics.launches,84);assert.equal(s.cottageFire.embers.length,0);
      const all=[...receipts.values()],source=first(s),receiver=s.cottageFire.buildings[1];
      assert.equal(source.retiredAt,source.deadline);
      if(receiver.firstIgnition){
        const e=all.find(e=>e.type==='cottage-ignition'&&e.buildingId===receiver.id);
        const impact=all.find(c=>c.type==='cottage-ember-contact'&&c.sourceId===e.sourceId&&c.buildingId===receiver.id);
        assert.equal(e.cause,'ember');assert.equal(impact.hot,true);assert.ok(impact.worldTime<=e.worldTime);
        assert.equal(receiver.retiredAt,receiver.deadline);
        const firstRoof=receiver.cells.find(c=>c.id===receiver.firstIgnition.cellId);
        assert.equal(firstRoof.x+receiver.x,impact.x);assert.ok(Math.abs(firstRoof.y-roofHeight(firstRoof.x))<1e-9);
      }
      for(const b of s.cottageFire.buildings.filter(b=>b.firstIgnition)){
        assert.equal(all.filter(e=>e.type==='building-burnout'&&e.buildingId===b.id).length,1);
        for(const layer of ['upper','lower']){
          const event=all.find(e=>e.type==='cottage-ignition'&&e.buildingId===b.id&&e.layer===layer);
          assert.equal(event.cause,'falling-fuel');
          const contact=all.find(e=>e.type==='cottage-debris-contact'&&e.sourceId===event.sourceId);
          assert.equal(contact.layer,layer);assert.ok(contact.worldTime<=event.worldTime+1e-8);
        }
      }
      return {source,receiver,firstSourceRoof:source.cells.filter(c=>c.layer==='roof').sort((a,b)=>a.ignitionTime-b.ignitionTime)[0].id,contacts:all.filter(e=>e.type==='cottage-ember-contact'&&e.buildingId!==e.sourceBuildingId)};
    }finally{sim.dispose();}
  }
  const right=run(wind),left=run(wind,true),calm=run(calmCottageWind);
  assert.notEqual(left.firstSourceRoof,right.firstSourceRoof);
  assert.ok(left.receiver.firstIgnition&&right.receiver.firstIgnition);
  assert.notEqual(left.receiver.firstIgnition.cellId,right.receiver.firstIgnition.cellId);
  assert.equal(calm.receiver.firstIgnition,null);assert.equal(calm.contacts.length,0);
});

test('solid blockers prevent a match reaching siding; the held jet uses real clipped discharge hits',()=>{
  const scenario={...COTTAGE_PAIR_SCENARIO,obstacles:[...COTTAGE_PAIR_SCENARIO.obstacles,
    {id:'short-masonry-shield',x:52.15,y:13.5,width:.04,depth:1.4,height:2,material:'masonry',kind:'wall'}]};
  const blocked=make({scenario}),jet=make();
  try{
    assertCold(match(blocked));
    jet.dispatch({type:'select-tool',tool:'flamethrower'});point(jet);jet.dispatch({type:'primary',pressed:true});
    const s=jet.advance(.25);
    assert.equal(s.discharge.active,true);assert.ok(s.discharge.rays.some(r=>r.obstacleId?.startsWith('ashland-cottage:foundation:')));
    assert.equal(first(s).firstIgnition.kind,'flamethrower');assert.ok(s.player.inventory.flamethrowerFuel<6);
    jet.dispatch({type:'primary',pressed:false});assert.equal(jet.advance(1/60).discharge.active,false);
  }finally{blocked.dispose();jet.dispose();}
});

test('powder slows the cottage world clock; pause, reset and re-entry do not replay fire',()=>{
  const sim=make();
  try{
    match(sim);sim.advance(.25);
    sim.dispatch({type:'drug',drug:'powder'});
    const before=sim.snapshot(),powder=sim.advance(.25);
    assert.ok(Math.abs(powder.cottageFire.worldTime-before.cottageFire.worldTime-.0875)<1e-9);
    assert.equal(first(powder).deadline,first(before).deadline);
    sim.dispatch({type:'pause',paused:true});
    assert.deepEqual(sim.advance(.25).cottageFire,powder.cottageFire);
    sim.dispatch({type:'reset'});const reset=sim.advance(1/60);
    assertCold(reset);assertMask(reset);
    assert.deepEqual(match(sim).cottageFire.buildings.map(b=>b.firstIgnition?.cellId??null),['right:3,0',null]);
  }finally{sim.dispose();}
  const fresh=make();try{assertCold(fresh.snapshot());}finally{fresh.dispose();}
});

test('the phone camera can target visible siding and native Three presentation follows live support masks',()=>{
  const catalogue=JSON.parse(readFileSync(new URL('../../assets/art/gross-housing-v1/houses.json',import.meta.url)));
  const config={input:{cameraY:-12}},input=configuration(config).input;
  const sim=make({config}),viewport={clientWidth:390,clientHeight:420};
  const renderer={setClearColor(){},setSize(){},shadowMap:{enabled:false,type:T.BasicShadowMap},
    domElement:{getBoundingClientRect:()=>({left:0,top:0,width:viewport.clientWidth,height:viewport.clientHeight})}};
  let art;
  try{
    let s=sim.snapshot();
    const rig=createCameraRig(viewport,renderer,s.world,{x:input.cameraX,y:input.cameraY});
    rig.update(s.player);
    const {camera}=rig;
    art=createCottagePairArt(T,{catalogue,textures:{}},s.world.buildings,wind,renderer);
    const update=()=>art.update(s.cottageFire,{camera,player:s.player});
    update();
    const cold=art.diagnostics();
    assert.ok(cold.houses.every(h=>h.art.visibleTriangles>0&&h.fire.walls.activeCells===0));
    const projected=new T.Vector3(52.08,2.60,13.5).project(camera);
    const px=(projected.x+1)*viewport.clientWidth/2,py=(1-projected.y)*viewport.clientHeight/2;
    assert.ok(px>=0&&px<=viewport.clientWidth&&py>=0&&py<=viewport.clientHeight);
    const aim=rig.screenToWorld(px,py,art.pickAimSurface);
    assert.ok(Math.abs(aim.x-52.08)<.01&&Math.abs(aim.y-13.5)<1e-8);
    point(sim,aim.x,aim.y);sim.dispatch({type:'primary',pressed:true});s=sim.advance(1/60);sim.dispatch({type:'primary',pressed:false});
    update();
    assert.equal(first(s).firstIgnition.cellId,'right:3,0');
    assert.equal(art.diagnostics().houses[0].fire.walls.activeCells,1);
    assert.equal(art.diagnostics().houses[1].fire.walls.activeCells,0);
    for(let i=0;i<172;i++)s=sim.advance(.25);
    update();
    assert.ok(art.diagnostics().houses.every(h=>h.art.visibleTriangles===0&&h.art.ashTiles===42));
    assertMask(s);
  }finally{art?.dispose();art?.dispose();sim.dispose();}
  assert.equal(renderer.shadowMap.enabled,false);assert.equal(art.root.children.length,0);
});
