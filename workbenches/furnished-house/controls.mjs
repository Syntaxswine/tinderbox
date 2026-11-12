import fs from 'node:fs';
import path from 'node:path';
import {createTrial,calmWind,ambientWind} from './simulation.js';
import {DEFAULT_CONFIG} from '../../src/simulation/config.js';
import {createClock} from './simulation.js';
const quad=(id,points,options={})=>({id,kind:'wall',normal:[0,1,0],material:'masonry',thickness:.12,fuelAmount:0,triangles:[[points[0],points[1],points[2]],[points[0],points[2],points[3]]],...options});
const base=surfaces=>({version:1,prefabId:'physical-control',gridOrigin:[0,0,0],groundY:-.12,surfaces,items:[],furnitureParts:[],stores:[]});
const output={version:1,parameters:'Current standalone profile and fixed 1/30s step; prototype controls, not physical fire validation.'};
output.grass=[];
for(const angle of Array.from({length:32},(_,i)=>i*Math.PI/16)) {
  const rotate=p=>[p[0]*Math.cos(angle)-p[2]*Math.sin(angle),p[1],p[0]*Math.sin(angle)+p[2]*Math.cos(angle)],s=quad('grass',[[-.25,0,-2],[8.25,0,-2],[8.25,0,2],[-.25,0,2]].map(rotate),{kind:'floor',material:'timber',fuelClass:'grass',fuelAmount:34,normal:[0,1,0]}),trial=createTrial(base([s]),{wind:calmWind});
  trial.command({type:'match',position:rotate([.1,.1,.01])});trial.step(600);
  const ignitions=trial.events.filter(e=>e.type==='ignition').map(e=>({...e,distance:e.position[0]*Math.cos(angle)+e.position[2]*Math.sin(angle),lateral:-e.position[0]*Math.sin(angle)+e.position[2]*Math.cos(angle)})).filter(e=>Math.abs(e.lateral)<.4),a=ignitions.find(e=>e.distance>=1),b=ignitions.find(e=>e.distance>=6),speed=a&&b?(b.distance-a.distance)/(b.time-a.time):null;
  output.grass.push({angleDegrees:angle*180/Math.PI,speed,relativeError:speed===null?null:(speed-1.5)/1.5,first:a,last:b,ignitions:ignitions.length,metrics:trial.metrics()});trial.dispose();
}
const wood=quad('wall',[[0,0,0],[4,0,0],[4,4.24,0],[0,4.24,0]],{normal:[0,0,1],material:'timber',fuelClass:'clapboard',fuelAmount:16.96}),rise=createTrial(base([wood]),{wind:calmWind});rise.command({type:'match',position:[.25,.53,.01]});rise.step(1800);
const wallEvents=rise.events.filter(e=>e.type==='ignition'),up=wallEvents.filter(e=>e.position[0]<.51).sort((a,b)=>a.position[1]-b.position[1]),side=wallEvents.filter(e=>e.position[1]<1.06).sort((a,b)=>a.position[0]-b.position[0]);
const velocity=(list,axis)=>list.length>1?(list.at(-1).position[axis]-list[0].position[axis])/(list.at(-1).time-list[0].time):null;
const upSpeed=velocity(up,1),creepSpeed=velocity(side,0);output.wall={upSpeed,creepSpeed,ratio:upSpeed/creepSpeed,up,side,metrics:rise.metrics()};rise.dispose();
const floor=(id,y,mat='masonry',fuel=0)=>quad(id,[[0,y,0],[2,y,0],[2,y,2],[0,y,2]],{kind:'floor',normal:[0,1,0],material:mat,fuelClass:'frame',fuelAmount:fuel});
const fixture=base([floor('bottom',0),floor('support',2.12,'timber',4),floor('lid',4.24),quad('west',[[0,0,0],[0,4.24,0],[0,4.24,2],[0,0,2]],{normal:[1,0,0]}),quad('east',[[2,0,0],[2,4.24,0],[2,4.24,2],[2,0,2]],{normal:[1,0,0]}),quad('front',[[0,0,0],[2,0,0],[2,4.24,0],[0,4.24,0]],{normal:[0,0,1]}),quad('back',[[0,0,2],[2,0,2],[2,4.24,2],[0,4.24,2]],{normal:[0,0,1]})]);
for(const [id,y]of [['upper',2.12],['lower',0]]){fixture.items.push({id,position:[.75,y,.75],bounds:{min:[.6,y,.6],max:[.9,y+.4,.9]}});fixture.furnitureParts.push({id,itemId:id,material:'timber',fuelClass:'furniture',fuelAmount:1,bounds:fixture.items.at(-1).bounds});}
const sealed=createTrial(fixture,{wind:calmWind});sealed.command({type:'match',position:[.75,2.25,.75]});let maximumBeforeFailure=0;
for(let i=0;i<6000;i++){sealed.step();if(!sealed.events.some(e=>e.type==='support-failure'))maximumBeforeFailure=Math.max(maximumBeforeFailure,...sealed.scene.fuels.get('lower').cells.map(c=>c.heat));}
const failure=sealed.events.find(e=>e.type==='support-failure'),landing=sealed.events.find(e=>e.type==='landing'),lowerIgnition=sealed.events.find(e=>e.type==='ignition'&&e.fuelId==='lower');output.sealedFloor={maximumBeforeFailure,failure,landing,lowerIgnition,secondsAfterLanding:landing&&lowerIgnition?lowerIgnition.time-landing.time:null,metrics:sealed.metrics()};
output.radiation=[];
for(const paneState of ['open','glass','masonry']) {
  const barrier=quad('aperture',[[1,0,-.1],[1,2,-.1],[1,2,.6],[1,0,.6]],{kind:paneState==='masonry'?'wall':'window',material:paneState==='masonry'?'masonry':'glass',normal:[-1,0,0]}),data=base([barrier,quad('ceiling',[[-1,1.06,-1],[10,1.06,-1],[10,1.06,1],[-1,1.06,1]],{kind:'roof',normal:[0,-1,0]})]);
  data.openings=[{id:'aperture',surfaceId:'aperture',initialOpenFraction:paneState==='open'?1:0}];
  for(const [id,x]of [['source',.25],['near',2.25],['far',8.25]]){const b={min:[x-.1,0,.15],max:[x+.1,.4,.35]};data.items.push({id,position:[x,0,.25],bounds:b});data.furnitureParts.push({id,itemId:id,bounds:b,material:'wood',fuelClass:'furniture',fuelAmount:1});}
  const trial=createTrial(data,{wind:calmWind,rules:{loss:0,maxHeat:100,glassBreaks:1e6},profiles:{furniture:{threshold:1e6,delay:100,seconds:60,energy:1200}}});trial.scene.fuels.get('source').lit=true;trial.scene.fuels.get('source').litAt=0;trial.step(30);
  const dose=id=>{const c=trial.scene.fuels.get(id).cells[0];return c.heat*c.capacity;},near=dose('near'),far=dose('far');output.radiation.push({paneState,roofIntact:true,nearMetres:2,farMetres:8,nearDose:near,farDose:far,distanceRatio:near/far,metrics:trial.metrics()});
}
output.clockControls=[];
for(const powder of [false,true]) {const trial=createTrial(base([wood]),{wind:calmWind}),clock=createClock(trial,{worldScale:powder?DEFAULT_CONFIG.drugs.worldScale:1,playerScale:powder?DEFAULT_CONFIG.drugs.playerScale:1});trial.command({tick:1,type:'match',position:[.25,.53,.01]});clock.setPaused(false);for(let i=0;i<600;i++)clock.advance(1/60);clock.drain();output.clockControls.push({powder,activeSeconds:10,worldTime:trial.worldTime,playerTime:clock.playerTime,wind:ambientWind(4,3,2),diagnostics:clock.diagnostics()});}
console.log(JSON.stringify(output,null,2));
if(process.argv[2]){const target=path.resolve(process.argv[2]);if(!target.startsWith(process.cwd()+path.sep))throw Error('Evidence must stay in this checkout');fs.mkdirSync(path.dirname(target),{recursive:true});fs.writeFileSync(target,JSON.stringify(output,null,2)+'\n');}
if(output.grass.some(g=>g.speed<1.45||g.speed>1.6)||!failure||failure.materialAge<120||failure.materialAge>180||lowerIgnition?.time<landing?.time||output.sealedFloor.secondsAfterLanding>5||output.radiation.some(r=>r.paneState!=='masonry'&&Math.abs(r.distanceRatio-16)>1e-6)||output.radiation.find(r=>r.paneState==='masonry').nearDose>1e-10)process.exitCode=1;
