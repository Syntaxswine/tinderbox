import fs from 'node:fs';
import path from 'node:path';
import {createHash} from 'node:crypto';
import {gzipSync} from 'node:zlib';
import {loadCatalogueModules} from '../../src/runtime/catalogue-modules.js';
import {createSimulation,worldToStick} from '../../src/simulation/index.js';
import {DEFAULT_CONFIG} from '../../src/simulation/config.js';

const out=path.resolve(process.argv.slice(2).find(a=>!a.startsWith('--'))||'artifacts/qa/catalogue-modular/native-preflight'),routes=process.argv.includes('--routes');fs.mkdirSync(out,{recursive:true});
const start=performance.now(),startedAt=Date.now(),phases=[],phase=(name,extra={})=>{const row={name,time:new Date().toISOString(),elapsedMs:performance.now()-start,memory:process.memoryUsage(),...extra};phases.push(row);fs.writeFileSync(path.join(out,'phases.json'),JSON.stringify(phases,null,2)+'\n');console.log(JSON.stringify(row));};
const manifestPath='workbenches/catalogue-modular/scene-data.json',sourceBytes=fs.readFileSync(manifestPath),manifest=JSON.parse(sourceBytes);
const sources=[manifestPath,...manifest.instances.map(i=>path.posix.join(path.posix.dirname(manifestPath),i.source))].map(file=>{const b=fs.readFileSync(file);return {path:file,bytes:b.length,sha256:createHash('sha256').update(b).digest('hex')};});
phase('start',{pid:process.pid,executable:process.execPath,task:'Catalogue Street native provider check',endCondition:routes?'Bounded native house/shop routes or first blocked route; no retained process or ports':'One compiled host snapshot and quiet native tick; no retained process or ports',deadline:new Date(startedAt+600000).toISOString()});
let sim;
try{
 const compiled=await loadCatalogueModules({fetcher:async url=>({ok:true,json:async()=>JSON.parse(fs.readFileSync(url))})});phase('native-registration',{instances:compiled.instances.map(i=>({id:i.id,kind:i.kind,surfaces:i.data.surfaces.length,meshes:i.data.sourceMeshes.length})),sourcePins:sources});
 sim=createSimulation({scenario:'neighborhood',seed:1893,characterId:'goat',catalogueModules:compiled});phase('host-initialized');
 const first=sim.snapshot();phase('initial-publication',{player:first.player,buildings:first.world.buildings.map(b=>({id:b.id,x:b.x,y:b.y,quarterTurns:b.quarterTurns,partyWalls:b.partyWalls})),pickups:first.pickups,actors:first.actors.map(a=>({id:a.id,x:a.x,y:a.y,elevation:a.elevation})),thermal:first.diagnostics.thermal,physical:{boundaries:first.catalogueModules.boundaries.length,items:first.catalogueModules.items.length,parts:first.catalogueModules.parts.length}});
 fs.writeFileSync(path.join(out,'initial-state.json.gz'),gzipSync(JSON.stringify(first)));
 const tickStart=performance.now(),next=sim.advance(1/30);phase('one-quiet-native-tick',{advanceMs:performance.now()-tickStart,hostTick:next.tick,worldTime:next.clocks.world,thermal:next.diagnostics.thermal,events:next.events});
 fs.writeFileSync(path.join(out,'quiet-state.json.gz'),gzipSync(JSON.stringify(next)));
 if(next.world.buildings.length!==8||next.pickups.length!==3||next.diagnostics.thermal.metrics.fuel.error>1e-7||Math.abs(next.diagnostics.thermal.metrics.heat.error)>1e-7)throw Error('Host shape or finite ledger failed');
 if(routes){
   const commands=[],visited=[],costs=[];let current=next;const stock=JSON.stringify(next.player.inventory),id=next.player.id;
   const send=c=>{commands.push({hostTick:current.tick+1,...c});if(!sim.dispatch(c))throw Error('Rejected check input '+JSON.stringify(c));};
   const tick=()=>{const before=performance.now();current=sim.advance(DEFAULT_CONFIG.step);costs.push(performance.now()-before);if(current.player.id!==id||JSON.stringify(current.player.inventory)!==stock)throw Error('Player/inventory continuity changed');return current;};
   const walk=(target,label)=>{let stalled=0;for(let steps=0;steps<2000;steps++){
     if(Date.now()-startedAt>=600000||fs.existsSync(path.join(out,'STOP')))throw Error('Bounded checker stopped at deadline/STOP; trace preserved');
     const p=current.player,dx=target[0]-p.x,dz=target[2]-p.y,d=Math.hypot(dx,dz);if(d<.025&&Math.abs((p.elevation||0)-target[1])<.25){send({type:'move',x:0,y:0});tick();visited.push({label,target,actual:{x:current.player.x,y:current.player.y,elevation:current.player.elevation},hostTick:current.tick,clocks:current.clocks});return;}
     const action=p.interaction;if(action?.kind==='door'&&action.enabled&&action.action==='open'){send({type:'move',x:0,y:0});send({type:'interact',portalId:action.id,action:'open'});tick();tick();}
     const scale=Math.min(1,d/(9*DEFAULT_CONFIG.step)),stick=worldToStick({x:dx/(d||1)*scale,y:dz/(d||1)*scale},DEFAULT_CONFIG.input);send({type:'move',...stick});const before={x:current.player.x,y:current.player.y};tick();if(Math.hypot(current.player.x-before.x,current.player.y-before.y)<1e-7)stalled++;else stalled=0;
     if(stalled>=4)throw Error('Blocked actual host route '+label+' at '+JSON.stringify(current.player)+' toward '+JSON.stringify(target)+'; native '+JSON.stringify(current.diagnostics.thermal.navigation));
   }throw Error('Route step bound '+label);};
   try{
     const house=compiled.instances.find(i=>i.id==='hopkins-fifteen').data.navigation.prototypeRoute;
     for(const [i,p]of house.entries())walk(p,'house-in-'+i);for(const [i,p]of [...house].reverse().entries())walk(p,'house-out-'+i);walk([20,0,18],'old-street-after-house');
     const shop=compiled.instances.find(i=>i.id==='bell-and-alder').data.navigation.prototypeRoute;
     walk([40,0,18.2],'old-street-shop-approach');for(const [i,p]of shop.entries())walk(p,'shop-in-'+i);for(const [i,p]of [...shop].reverse().entries())walk(p,'shop-out-'+i);walk([20,0,18],'old-street-after-shop');
     fs.writeFileSync(path.join(out,'continuity.json'),JSON.stringify({pass:true,playerId:id,inventory:current.player.inventory,visited,finalClocks:current.clocks,costs,events:current.events},null,2)+'\n');phase('same-player-continuity',{visited:visited.length,hostTick:current.tick,clocks:current.clocks});
   }finally{fs.writeFileSync(path.join(out,'route-commands.json'),JSON.stringify(commands)+'\n');fs.writeFileSync(path.join(out,'route-visited.json'),JSON.stringify(visited,null,2)+'\n');fs.writeFileSync(path.join(out,'route-costs.json'),JSON.stringify(costs)+'\n');fs.writeFileSync(path.join(out,'route-last-state.json.gz'),gzipSync(JSON.stringify(current)));}
 }
 fs.writeFileSync(path.join(out,'result.json'),JSON.stringify({pass:true,sources,phases},null,2)+'\n');
}catch(error){fs.writeFileSync(path.join(out,'failure.txt'),error.stack+'\n');throw error;}
finally{sim?.dispose();phase('closed',{remainingTaskPorts:[]});}
