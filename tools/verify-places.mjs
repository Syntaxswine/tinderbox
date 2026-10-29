import fs from 'node:fs';
import path from 'node:path';
import {pathToFileURL,fileURLToPath} from 'node:url';
import {createHash} from 'node:crypto';
import * as T from '../src/runtime/three.js';
import {createExploration,inside} from '../src/runtime/navigation.js';
import {CHARACTERS,CHARACTER_PROFILES} from '../src/content/characters.js';
import {createSectionStreamer} from '../src/runtime/sections.js';
import {planRoute,walkRoute} from './place-routes.mjs';
import {verifyAccessGeometry,verifyRenderedSupport} from './place-geometry-checks.mjs';
const reports=[],records=[],placeFilter=process.argv.find(arg=>arg.startsWith('--place='))?.slice(8),characterFilter=process.argv.find(arg=>arg.startsWith('--character='))?.slice(12),partial=!!(placeFilter||characterFilter);
if(placeFilter&&!['new-york','administration','horticulture'].includes(placeFilter)||characterFilter&&!CHARACTERS.some(c=>c.id===characterFilter))throw Error('Unknown route filter');
function choosePoint(model,target){
  const xs=target.polygon.map(p=>p[0]),ys=target.polygon.map(p=>p[1]),centre={x:xs.reduce((a,b)=>a+b,0)/xs.length,y:ys.reduce((a,b)=>a+b,0)/ys.length},candidates=[centre];
  for(let x=Math.min(...xs)+.75;x<Math.max(...xs);x+=1)for(let y=Math.min(...ys)+.75;y<Math.max(...ys);y+=1)candidates.push({x,y});
  candidates.sort((a,b)=>Math.hypot(a.x-centre.x,a.y-centre.y)-Math.hypot(b.x-centre.x,b.y-centre.y));
  for(const candidate of candidates){if(!inside(candidate,target.polygon)||target.holes.some(h=>inside(candidate,h)))continue;const point=model.probeStep({...candidate,elevation:target.elevation},candidate);if(point&&Math.abs(point.elevation-target.elevation)<.01)return point;}
  throw Error('No standing clearance in occupied target '+target.id);
}
for(const id of ['new-york','administration','horticulture']){
  if(placeFilter&&placeFilter!==id)continue;
  const directory=path.resolve('assets/art/place-scenes/'+id),manifest=JSON.parse(fs.readFileSync(directory+'/index.json')),original=JSON.parse(fs.readFileSync(directory+'/navigation.json'));
  if(manifest.diagnostic||!manifest.sourceAccess)throw Error('Production verification requires frozen access geometry: '+id);
  for(const character of CHARACTERS){
    if(characterFilter&&characterFilter!==character.id)continue;
    const definition={...original,body:CHARACTER_PROFILES[character.id],characterId:character.id},planner=createExploration({definition:{...definition,body:{...definition.body,radius:definition.body.radius+.005},portals:definition.portals.map(p=>({...p,initiallyOpen:true}))}}),root=new T.Group();
    let streamError=null;const stream=createSectionStreamer({THREE:T,root,manifest,baseUrl:pathToFileURL(directory+'/index.json').href,loadJSON:async url=>JSON.parse(fs.readFileSync(fileURLToPath(url))),onError:error=>streamError=error});
    const sim=createExploration({definition,isSectionReady:stream.isReadyAt,streamMetrics:stream.metrics}),routes=[],legs=[],surfaces=new Map(original.surfaces.map(surface=>[surface.id,surface]));
    let lastSample=null,supportSamples=0,stairEvidence=new Map();
    const afterStep=async snapshot=>{stream.update(snapshot.player,{interior:snapshot.player.interior,portalStates:snapshot.navigation.portalStates});await stream.settled();if(streamError)throw streamError;
      const player=snapshot.player,stairId=surfaces.get(player.surfaceId)?.stairId;if(stairId){if(!stairEvidence.has(stairId))stairEvidence.set(stairId,[]);const heights=stairEvidence.get(stairId);if(heights.at(-1)!==player.elevation)heights.push(player.elevation);}
      if(!lastSample||lastSample.surfaceId!==player.surfaceId||Math.abs(lastSample.elevation-player.elevation)>.01||Math.hypot(lastSample.x-player.x,lastSample.y-player.y)>=1){
        verifyRenderedSupport(root,player,surfaces.get(player.surfaceId));supportSamples++;lastSample={...player};
      }
    };
    try{
      const accessGeometry=await verifyAccessGeometry({root,stream,navigation:original});await afterStep(sim.snapshot());
      for(const target of original.targets){
        const from=sim.snapshot().player,destination=choosePoint(planner,target);console.log('Planning '+id+' / '+character.id+' / '+target.id);
        const planned=planRoute(planner,{x:from.x,y:from.y,elevation:from.elevation},destination);
        stairEvidence=new Map();const result=await walkRoute(sim,planned.route,{afterStep});
        if(target.requiredStair){const expected=target.requiredStair,heights=stairEvidence.get(expected.id)||[];
          if(heights.length<6||Math.min(...heights)>expected.from+.23||Math.max(...heights)<expected.to-.23||(expected.direction==='down'?heights[0]<=heights.at(-1):heights[0]>=heights.at(-1)))throw Error('Route missed the actual '+expected.direction+' treads of '+expected.id);
        }
        routes.push({target:target.id,label:target.label,destination,statesSearched:planned.searched,pathPoints:planned.route.length,ticks:result.ticks,acceptedSegments:result.acceptedSegments,maxRise:result.maxRise,stairEvidence:Object.fromEntries(stairEvidence),arrived:{x:result.player.x,y:result.player.y,elevation:result.player.elevation}});
        legs.push({targetId:target.id,label:target.label,path:planned.route});
        console.log('Walked '+id+' / '+character.id+' / '+target.id+' ('+planned.searched+' states)');
      }
      const from=sim.snapshot().player,home=original.spawn,planned=planRoute(planner,{x:from.x,y:from.y,elevation:from.elevation},home),result=await walkRoute(sim,planned.route,{afterStep});
      if(Math.hypot(result.player.x-home.x,result.player.y-home.y)>.4||Math.abs(result.player.elevation-home.elevation)>.02)throw Error('Could not walk back to spawn');
      legs.push({targetId:'return-to-spawn',label:'Return to the grounds spawn',path:planned.route});
      records.push({placeId:id,characterId:character.id,accessCommit:manifest.sourceAccess.commit,navigationSha256:createHash('sha256').update(JSON.stringify(original)).digest('hex'),manifestSha256:createHash('sha256').update(JSON.stringify(manifest)).digest('hex'),legs});
      const metrics=stream.metrics();sim.setView('overview');stream.update(sim.snapshot().player,{viewMode:'overview'});await stream.settled();if(root.children.length||stream.metrics().geometries||stream.metrics().materials)throw Error('Detailed sections survived overview release');
      reports.push({placeId:id,characterId:character.id,routes,accessGeometry,supportSamples,collision:sim.collisionMetrics(),returnToSpawn:{ticks:result.ticks,acceptedSegments:result.acceptedSegments,maxRise:result.maxRise},metrics,afterOverview:stream.metrics(),passed:true});
    }finally{sim.dispose();planner.dispose();stream.dispose();await stream.settled();}
  }
}
fs.writeFileSync(partial?'artifacts/TB-024/routes-partial.json':'docs/engineering/explorable-places/routes.json',JSON.stringify({task:'TB-024',partial,method:'Read-only support queries plan routes with open-door poses. Every route, contextual door opening and stair ascent/descent is then executed by the public movement/interaction commands with real section readiness. No player relocation or floor teleport. Offline source geometry/resource validation, not WebGL acceptance.',reports,passed:true},null,2)+'\n');
if(!partial)fs.writeFileSync('docs/engineering/explorable-places/verified-routes.json',JSON.stringify({version:1,task:'TB-024',purpose:'Source-only real-runtime QA playback via ordinary movement/interact commands; excluded from the public build',records})+'\n');
console.log(partial?'PASS: filtered diagnostic only; complete route gate still required.':'PASS: all selected native characters physically visited occupied rooms/floors and walked back to spawn with bounded source sections.');
