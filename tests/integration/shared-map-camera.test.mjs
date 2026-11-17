import fs from 'node:fs';
import test from 'node:test';
import assert from 'node:assert/strict';
import {compileSharedMap} from '../../src/content/shared-map.js';
import {createSceneThermal} from '../../src/simulation/scene-thermal.js';
import {createSimulation,worldToStick,movementVector} from '../../src/simulation/index.js';
import {configuration,DEFAULT_CONFIG} from '../../src/simulation/config.js';
import {createCameraRig} from '../../src/runtime/camera.js';
const read=p=>JSON.parse(fs.readFileSync(new URL('../../'+p,import.meta.url))),index=read('assets/runtime/map-sources/new-york/index.json'),library=read('assets/runtime/map-sources/new-york/library.json'),navigation=read('assets/art/place-scenes/new-york/navigation.json');
const make=()=>compileSharedMap(index,library,navigation),near=(a,b)=>assert.ok(Math.abs(a-b)<1e-10,`${a} != ${b}`);

test('New York resolves one front-side camera/input orientation while default Catalogue and partial overrides retain their contracts',()=>{
  const compiled=make(),settings=configuration(undefined,compiled.configuration),sim=createSimulation({gameplayMap:compiled,characterId:'goat'});
  try{
    assert.deepEqual(configuration().input,DEFAULT_CONFIG.input);assert.equal(DEFAULT_CONFIG.input.cameraY,12);assert.equal(settings.input.cameraY,-12);assert.equal(configuration({input:{cameraX:8}},compiled.configuration).input.cameraY,-12);
    for(const v of [{x:1,y:0},{x:0,y:1},{x:-.6,y:.8},{x:.25,y:-.5}]){const world=movementVector(worldToStick(v,settings.input),false,settings.input);near(world.x,v.x);near(world.y,v.y);}
    const before=sim.snapshot();sim.dispatch({type:'move',...worldToStick({x:0,y:1},settings.input)});let s;for(let i=0;i<6;i++)s=sim.advance(1/60);near(s.player.x,before.player.x);near(s.player.y-before.player.y,.9);near(s.clocks.world,.1);assert.equal(s.player.radius,.5);assert.equal(s.player.height,1.66);
  }finally{sim.dispose();compiled.dispose();}
});

function cameraFixture(player,input){
  const compiled=make(),settings=configuration(undefined,compiled.configuration),state={player:{id:'source-camera-fixture',elevation:2.12,height:1.66,radius:.5,hp:100,...player},actors:[],tick:0,clocks:{world:0}},provider=createSceneThermal({compiled,state,definition:compiled.definition,config:settings,event:()=>{}}),rect={left:0,top:0,width:844,height:390},renderer={domElement:{getBoundingClientRect:()=>rect},setSize(){}},ui={getBoundingClientRect:()=>rect},view=input||settings.input,rig=createCameraRig({clientWidth:844,clientHeight:390},renderer,compiled.definition,{x:view.cameraX,h:14,y:view.cameraY});
  rig.update(state.player);return {compiled,provider,rig,pick(point){const screen=rig.projectInteraction(point,ui);assert.equal(screen.visible,true);return rig.screenToWorld(screen.x,screen.y,ray=>provider.pickAimSurface(ray));},dispose(){provider.dispose();compiled.dispose();}};
}

test('the real normal-zoom 844x390 source-camera ray sees the original front pane with no thermal activation',()=>{
  const corrected=cameraFixture({x:50.5,y:25.05}),old=cameraFixture({x:50.5,y:25.05},DEFAULT_CONFIG.input);
  try{
    const point=[50.5,3.02,26],p=corrected.pick(point);assert.equal(p.sourceSurfaceId,'new-york::carrier/main/0/lower-3/glass');assert.notEqual(old.pick(point).sourceSurfaceId,p.sourceSurfaceId);
    assert.ok(corrected.rig.camera.position.z<25.05);assert.ok(Math.abs(p.y-25.98)<1e-6);assert.ok(Math.hypot(p.x-50.5,p.y-25.05)>.85,'The original projecting sill leaves this pane beyond match reach');assert.ok(Math.hypot(p.x-50.5,p.y-25.05)<1.1,'The existing torch can reach it');
    for(const f of [corrected,old]){assert.equal(f.provider.trial.scene.cells.size,0);assert.equal(f.provider.trial.scene.fuels.size,0);assert.equal(f.compiled.metrics().activation.activatedCarriers,0);}
  }finally{corrected.dispose();old.dispose();}
});

test('the real front camera truthfully selects the nearer existing timber jamb within match reach rather than promising the hidden coating',()=>{
  const f=cameraFixture({x:55.25,y:25.25});try{
    const p=f.pick([54.8,3.02,26]);assert.equal(p.sourceSurfaceId,'new-york::carrier/main/0/entry/jamb--1');assert.notEqual(p.sourceSurfaceId,'new-york::carrier/main/0/cell-1-22/1');assert.ok(Math.hypot(p.x-55.25,p.y-25.25)<.85);const roundTrip=f.pick([p.x,p.h,p.y]);assert.equal(roundTrip.sourceSurfaceId,p.sourceSurfaceId);assert.ok(Math.abs(roundTrip.x-p.x)<1e-8&&Math.abs(roundTrip.h-p.h)<1e-8&&Math.abs(roundTrip.y-p.y)<1e-8);assert.equal(f.provider.trial.scene.cells.size,0);
  }finally{f.dispose();}
});
