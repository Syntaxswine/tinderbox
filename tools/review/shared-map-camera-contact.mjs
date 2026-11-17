import fs from 'node:fs';
import assert from 'node:assert/strict';
import * as T from '../../src/runtime/three.js';
import {createCameraRig} from '../../src/runtime/camera.js';
import {compileSharedMap} from '../../src/content/shared-map.js';
import {createSceneThermal} from '../../src/simulation/scene-thermal.js';
import {configuration} from '../../src/simulation/config.js';
const read=p=>JSON.parse(fs.readFileSync(p)),compiled=compileSharedMap(read('assets/runtime/map-sources/new-york/index.json'),read('assets/runtime/map-sources/new-york/library.json'),read('assets/art/place-scenes/new-york/navigation.json'));
const settings=configuration(undefined,compiled.configuration),state={player:{id:'source-camera-fixture',x:55.25,y:25.25,elevation:2.12,height:1.66,radius:.5,hp:100},actors:[],tick:0,clocks:{world:0}},provider=createSceneThermal({compiled,state,definition:compiled.definition,config:settings,event:()=>{}}),rect={left:0,top:0,width:844,height:390},renderer={domElement:{getBoundingClientRect:()=>rect},setSize(){}},ui={getBoundingClientRect:()=>rect},rig=createCameraRig({clientWidth:844,clientHeight:390},renderer,compiled.definition,{x:settings.input.cameraX,h:14,y:settings.input.cameraY});
const rows=[],coat='new-york::carrier/main/0/cell-1-22/1';
function pick(p){const screen=rig.projectInteraction(p,ui);return {...screen,...(screen.visible?{picked:rig.screenToWorld(screen.x,screen.y,r=>provider.pickAimSurface(r))}:{})};}
try{
  rig.update(state.player);
  for(let xi=0;xi<10;xi++)for(let yi=0;yi<10;yi++){const requested=[54.05+xi*.1,2.22+yi*.2,25.92000000178814],r=pick(requested),p=r.picked;rows.push({requested,...r,...(p?{matchHorizontalDistance:Math.hypot(p.x-state.player.x,p.y-state.player.y)}:{})});}
  const oldPoint=pick([54.8,3.02,26]);state.player.x=50.5;state.player.y=25.05;rig.update(state.player);const glass=pick([50.5,3.02,26]);
  assert.equal(glass.picked?.sourceSurfaceId,'new-york::carrier/main/0/lower-3/glass');assert.equal(provider.trial.scene.cells.size,0);assert.equal(provider.trial.scene.fuels.size,0);
  const result={scope:'Finite actual-camera/source-ray probe; CPU fixture stances, no renderer or tool command.',input:settings.input,viewport:rect,wallStance:[55.25,2.12,25.25],oldPoint,coatedVisible:rows.filter(r=>r.picked?.sourceSurfaceId===coat),coatedReachable:rows.filter(r=>r.picked?.sourceSurfaceId===coat&&r.matchHorizontalDistance<=settings.tools.matches.range),glass,rows,thermalCells:0};
  const output=process.argv.find(a=>a.startsWith('--output='))?.slice(9);assert.ok(output&&!fs.existsSync(output));fs.writeFileSync(output,JSON.stringify(result,null,2)+'\n');console.log(JSON.stringify({oldPoint,coatedVisible:result.coatedVisible.length,coatedReachable:result.coatedReachable,glass,thermalCells:0}));
}finally{provider.dispose();compiled.dispose();}
