// Source-only Administration stair/input regression. No renderer, teleport,
// edited geometry, collider exemption or global-clock change is involved.
import fs from 'node:fs';
import assert from 'node:assert/strict';
import {createHash} from 'node:crypto';
import {createExploration} from '../src/runtime/navigation.js';
import {CHARACTER_PROFILES} from '../src/content/characters.js';
import {DEFAULT_CONFIG} from '../src/simulation/config.js';
import {worldToStick,movementVector} from '../src/simulation/geometry.js';
import {pointerStick,normalizeStick} from '../src/ui/model.js';

const quick=process.argv.includes('--quick');
assert.ok(process.argv.slice(2).every(arg=>arg==='--quick'),'Unknown check argument');
const navigationPath='assets/art/place-scenes/administration/navigation.json';
const bytes=fs.readFileSync(navigationPath),definition=JSON.parse(bytes);
const offset=definition.sourceOffset,input=DEFAULT_CONFIG.input;
const mouseRect={left:100,top:100,width:120,height:120};
const mouseVector=stick=>pointerStick(160+43.2*stick.x,160-43.2*stick.y,mouseRect);
const near=(a,b,t=1e-6)=>assert.ok(Math.abs(a-b)<=t,`${a} != ${b}`);
const world=p=>({x:p[0]+offset[0],y:p[2]+offset[2],elevation:p[1]});
const gap=(a,b)=>Math.hypot(a.x-b.x,a.y-b.y);
const frames=hz=>hz==='hitch'?[1/60,.2,1/144,1/30]:[1/hz];

function flight(stair){
  // Include the first native landing after two storeys of a spiral. Test every
  // source stair rotation, without treating later decorative sectors as rooms.
  const top=Math.min(stair.toLevel*2.12,stair.fromLevel*2.12+4.24);
  const last=stair.path.findIndex(p=>p[1]>=top-1e-6);
  const path=stair.path.slice(0,Math.min(stair.path.length,last+2)).map(world);
  if(stair.fromLevel===0){
    const a=path[0],b=path.at(-1),length=gap(a,b),dx=(b.x-a.x)/length,dy=(b.y-a.y)/length;
    path.unshift({x:a.x-dx,y:a.y-dy,elevation:0});
    path.push({x:b.x+dx,y:b.y+dy,elevation:top});
  }
  return path;
}

function make(stair,characterId,speed){
  const path=flight(stair),sim=createExploration({definition:{...definition,spawn:path[0],characterId,body:CHARACTER_PROFILES[characterId]},config:{player:{speed}}});
  return {sim,path};
}

function walk(stair,characterId,speed,magnitude,hz){
  const {sim,path}=make(stair,characterId,speed),schedule=frames(hz),start=sim.snapshot().player;
  let snapshot=sim.snapshot(),frame=0,idle=0,maxIdle=0,maxRise=0,ascentHeight=0,steps=0;
  const labels=new Set(),treads=new Set(),trace=[];
  try{
    for(const [direction,points] of [['up',path.slice(1)],['down',path.slice(0,-1).reverse()]]){
      for(const target of points){
        let remaining=gap(snapshot.player,target),limit=0;
        while(remaining>.002){
          assert.ok(++limit<12000,'Finite waypoint budget exhausted');
          const delta=schedule[frame++%schedule.length],before=snapshot;
          const scale=Math.min(magnitude,remaining/(speed*Math.max(delta,DEFAULT_CONFIG.step)));
          const stick=worldToStick({x:(target.x-before.player.x)/remaining*scale,y:(target.y-before.player.y)/remaining*scale},input);
          // The published mouse dead zone intentionally emits zero below .12.
          // Endpoint steering uses the public move API once below that zone;
          // travel between endpoints uses actual mouse-derived analog values.
          const emitted=Math.hypot(stick.x,stick.y)>=.12?mouseVector(stick):stick;
          sim.dispatch({type:'move',...emitted});snapshot=sim.advance(delta);
          const activeSteps=snapshot.tick-before.tick,moved=gap(before.player,snapshot.player);
          steps+=activeSteps;idle=activeSteps&&moved<1e-8?idle+activeSteps:moved>1e-8?0:idle;maxIdle=Math.max(maxIdle,idle);
          labels.add(snapshot.player.locationLabel);treads.add(snapshot.player.surfaceId);
          for(let i=1;i<snapshot.diagnostics.acceptedPath.length;i++)maxRise=Math.max(maxRise,Math.abs(snapshot.diagnostics.acceptedPath[i].elevation-snapshot.diagnostics.acceptedPath[i-1].elevation));
          trace.push({direction,command:emitted,player:{x:snapshot.player.x,y:snapshot.player.y,elevation:snapshot.player.elevation,surfaceId:snapshot.player.surfaceId},waiting:snapshot.navigation.waitingForSection});if(trace.length>4)trace.shift();
          if(idle>20){
            const reasons=[],worldDirection=movementVector(emitted,false,input),from=snapshot.player;
            sim.probeStep(from,{x:from.x+worldDirection.x*.035,y:from.y+worldDirection.y*.035},reason=>reasons.push(reason));
            throw Error(JSON.stringify({stair:stair.id,characterId,speed,magnitude,hz,target,trace,reasons}));
          }
          assert.equal(snapshot.navigation.waitingForSection,false);remaining=gap(snapshot.player,target);
        }
      }
      if(direction==='up')ascentHeight=snapshot.player.elevation;
    }
    near(snapshot.player.x,start.x,.003);near(snapshot.player.y,start.y,.003);near(snapshot.player.elevation,start.elevation,.001);
    near(ascentHeight,path.at(-1).elevation,.001);assert.ok(maxRise<=.220001);assert.ok(treads.size>=12);
    return {stair:stair.id,characterId,speed,magnitude,hz,arrived:true,returned:true,steps,maxStationaryTicks:maxIdle,maxRise,ascentHeight,returnedHeight:snapshot.player.elevation,travelled:snapshot.player.travelled,visitedSurfaces:treads.size,labels:[...labels]};
  }finally{sim.dispose();}
}

function equalKeyboardMouse(stair,characterId,hz,direction){
  const path=flight(stair),index=Math.min(8,path.length-2),spawn=path[index],target=path[index+(direction==='up'?1:-1)];
  const raw=worldToStick({x:target.x-spawn.x,y:target.y-spawn.y},input),angle=Math.round(Math.atan2(raw.y,raw.x)/(Math.PI/4))*Math.PI/4;
  const key=normalizeStick(Math.round(Math.cos(angle)),Math.round(Math.sin(angle))),mouse=mouseVector(key),results=[];
  near(key.x,mouse.x);near(key.y,mouse.y);
  for(const command of [key,mouse]){
    const sim=createExploration({definition:{...definition,spawn,characterId,body:CHARACTER_PROFILES[characterId]}});
    try{
      const trace=[];sim.dispatch({type:'move',...command});
      const schedule=frames(hz);let seconds=0,i=0;
      while(seconds<.25-1e-9){const delta=Math.min(schedule[i++%schedule.length],.25-seconds);seconds+=delta;const s=sim.advance(delta);trace.push({x:s.player.x,y:s.player.y,elevation:s.player.elevation,waiting:s.navigation.waitingForSection,path:s.diagnostics.acceptedPath});}
      results.push(trace);
    }finally{sim.dispose();}
  }
  for(let i=0;i<results[0].length;i++){
    const a=results[0][i],b=results[1][i];near(a.x,b.x);near(a.y,b.y);near(a.elevation,b.elevation);assert.equal(a.waiting,b.waiting);
    assert.equal(a.path.length,b.path.length);for(let j=0;j<a.path.length;j++){near(a.path[j].x,b.path[j].x);near(a.path[j].y,b.path[j].y);near(a.path[j].elevation,b.path[j].elevation);}
  }
  return {stair:stair.id,characterId,hz,direction,keyboard:key,mouse,equivalent:true};
}

const stairs=quick?definition.accessPlan.stairs.filter(s=>s.id==='admin-front-west'):definition.accessPlan.stairs;
const cases=[],comparisons=[];
for(const stair of stairs)for(const characterId of quick?['bear']:Object.keys(CHARACTER_PROFILES))for(const speed of [3,9])for(const magnitude of [.13,.35,1]){
  cases.push(walk(stair,characterId,speed,magnitude,60));
  console.log(`PASS ${stair.id} ${characterId} ${speed}m/s analog ${magnitude} up/down`);
}
if(!quick)for(const stair of definition.accessPlan.stairs.filter(s=>['admin-approach-front','admin-front-west','admin-upper-west'].includes(s.id)))for(const characterId of Object.keys(CHARACTER_PROFILES))for(const hz of [30,144,'hitch']){
  for(const magnitude of [.2,.5,.75])cases.push(walk(stair,characterId,9,magnitude,hz));
  for(const direction of ['up','down'])comparisons.push(equalKeyboardMouse(stair,characterId,hz,direction));
}
const report={task:'TB-028',base:'38f6e803bf43493fdcd641f62f8644d13b99488f',partial:quick,method:'Controlled spawn on actual published Administration support; unchanged native geometry, body/headroom/drop/collision. Ordinary move commands walk the first flight onto its native landing and back. Analog vectors above .12 pass through the real mouse mapping; precise endpoint steering remains ordinary analog input. No whole-map or WebGL claim. All source section readiness is true in this isolated input/support probe; separate streamer regressions enforce unloaded boundaries.',navigation:{path:navigationPath,sha256:createHash('sha256').update(bytes).digest('hex')},body:CHARACTER_PROFILES,cases,comparisons,passed:true};
const destination=quick?'artifacts/TB-024/movement-stairs-quick.json':'docs/engineering/movement-input/stairs.json';
fs.mkdirSync(destination.slice(0,destination.lastIndexOf('/')),{recursive:true});fs.writeFileSync(destination,JSON.stringify(report,null,2)+'\n');
console.log(`PASS ${cases.length} actual stair out/back probes; ${comparisons.length} full keyboard/mouse comparisons${quick?' (partial diagnostic)':''}`);
