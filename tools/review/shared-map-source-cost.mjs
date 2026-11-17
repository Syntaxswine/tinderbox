import fs from 'node:fs';
import {compileSharedMap} from '../../src/content/shared-map.js';
import {createSceneThermal} from '../../src/simulation/scene-thermal.js';
import {DEFAULT_CONFIG} from '../../src/simulation/index.js';
import {createHash} from 'node:crypto';
const read=p=>JSON.parse(fs.readFileSync(new URL('../../'+p,import.meta.url))),started=performance.now();
const caseId=process.argv.find(a=>a.startsWith('--case='))?.slice(7)||'wall',specs={wall:{player:[54.8,2.12,25.2],target:{x:54.8,y:26,h:3.02},contact:'new-york::carrier/main/0/cell-1-22/1'},upper:{player:[57.25,8.48,42.25],target:{x:57.25,y:42.25,h:8.495}},inert:{player:[50.5,2.12,25.2],target:{x:50.5,y:26,h:3.02},contact:'new-york::carrier/main/0/lower-3/glass'}};if(!specs[caseId])throw Error('Unknown finite source case');const spec=specs[caseId],ticks=Number(process.argv.find(a=>a.startsWith('--ticks='))?.slice(8)||1);if(!Number.isInteger(ticks)||ticks<1||ticks>120)throw Error('Finite source probe permits 1–120 native ticks');
const compiled=compileSharedMap(read('assets/runtime/map-sources/new-york/index.json'),read('assets/runtime/map-sources/new-york/library.json'),read('assets/art/place-scenes/new-york/navigation.json'));
const state={player:{id:'cpu-control',x:spec.player[0],y:spec.player[2],elevation:spec.player[1],height:1.66,radius:.5,hp:100},actors:[],tick:0,clocks:{world:0}};
const p=createSceneThermal({compiled,state,definition:compiled.definition,config:DEFAULT_CONFIG,event:()=>{}}),support=()=>{const {unresolvedIds,...r}=p.trial.supportGraph.diagnostics();return {...r,unresolvedExamples:unresolvedIds.slice(0,8)};};
const hash=p=>createHash('sha256').update(fs.readFileSync(new URL('../../'+p,import.meta.url))).digest('hex');
const result={scope:'Finite CPU source/contact fixture. No renderer, normal-input traversal or visual acceptance.',caseId,sourceIndexSha256:hash('assets/runtime/map-sources/new-york/index.json'),partitionProducerSha256:hash('workbenches/furnished-house/partition-error.js'),producerHashes:Object.fromEntries(['tools/review/shared-map-source-cost.mjs','src/simulation/scene-thermal.js','src/content/map-source-geometry.js','src/simulation/source-support.js'].map(p=>[p,hash(p)])),cold:{elapsedMs:performance.now()-started,metrics:compiled.metrics(),support:support()}};
try{
  if(process.argv.includes('--quantities')){
    const ids=compiled.sources.near([54.75,3.71,25.75],8+Math.hypot(.5,1.06,.5)/2),bundles=ids.map(id=>compiled.sources.sourcesForCarrier(id)),plan=p.trial.prepareSources({surfaces:bundles.flatMap(b=>b.surfaces),openings:bundles.flatMap(b=>b.openings)});
    const differences=plan.quantities.map(r=>{const c=compiled.model.carrierById.get(r.id),canonical=c.fuelAmount+(c.finish?.amount||0),difference=r.nativeQuantity-canonical;return {id:r.id,nativeQuantity:r.nativeQuantity,sourceQuantity:r.sourceQuantity,sourceCount:r.sourceCount,partitionError:r.partitionError,canonical,difference,tolerance:1e-6*Math.max(1,canonical)};});result.quantityProbe={carriers:ids.length,stagedBoundaries:plan.boundaries,stagedFuels:plan.fuels,differences:differences.filter(r=>Math.abs(r.difference)>r.tolerance),maxAbsolute:Math.max(...differences.map(r=>Math.abs(r.difference)))};
  }else{
    const from=[state.player.x,state.player.elevation+.9,state.player.y],to=[spec.target.x,spec.target.h,spec.target.y],hit=p.trace(from,to);result.coldContact=hit?{position:hit.position,id:hit.surface.id,sourceSurfaceId:hit.surface.sourceSurfaceId,material:hit.surface.material}:null;
    if(spec.contact&&hit?.surface.sourceSurfaceId!==spec.contact)throw Error('Probe did not hit its intended original carrier');
    const t=performance.now();result.tool=p.heatTool('matches',state.player,spec.target,DEFAULT_CONFIG.tools.matches);result.activated={elapsedMs:performance.now()-t,metrics:compiled.metrics(),cells:p.trial.scene.cells.size,fuels:p.trial.scene.fuels.size,support:support()};
    const stepping=performance.now();for(let i=0;i<ticks;i++){state.tick++;state.clocks.world=(i+1)/30;p.step(1/30,state.clocks.world);}result.tick={elapsedMs:performance.now()-stepping,ticks,metrics:p.trial.metrics(),carriers:p.diagnostics().carriers,geometry:compiled.metrics(),support:support()};
    if(caseId==='inert'&&result.tick.metrics.burningCount!==0)throw Error('An inert-only match contact ignited fuel');
  }
}catch(error){result.failed={message:error.message,stack:error.stack?.split('\n').slice(0,7),metrics:compiled.metrics()};process.exitCode=1;}
finally{p.dispose();compiled.dispose();}
const target=process.argv.find(a=>a.startsWith('--output='))?.slice(9);if(target)fs.writeFileSync(new URL('../../'+target,import.meta.url),JSON.stringify(result,null,2)+'\n');
console.log(JSON.stringify(result));
