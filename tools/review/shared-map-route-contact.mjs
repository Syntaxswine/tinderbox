import fs from 'node:fs';
import path from 'node:path';
import assert from 'node:assert/strict';
import {createHash} from 'node:crypto';
import {createCameraRig} from '../../src/runtime/camera.js';
import {compileSharedMap} from '../../src/content/shared-map.js';
import {createSimulation,worldToStick,DEFAULT_CONFIG} from '../../src/simulation/index.js';

// One bounded CPU route using the normal caller/command path, including the
// discrete-tool horizontal clamp. No pawn placement or direct heat command.
const output=process.argv.find(a=>a.startsWith('--output='))?.slice(9);
assert.ok(output&&path.resolve(output).startsWith(path.resolve('artifacts')+path.sep)&&!fs.existsSync(output),'Choose a fresh artifacts JSON');
const read=p=>JSON.parse(fs.readFileSync(p,'utf8')),hash=p=>createHash('sha256').update(/\.(?:m?js)$/.test(p)?fs.readFileSync(p,'utf8').replace(/\r\n/g,'\n'):fs.readFileSync(p)).digest('hex');
const sourceFiles=['assets/runtime/map-sources/new-york/index.json','assets/runtime/map-sources/new-york/library.json','src/content/shared-map.js','src/runtime/index.js','src/runtime/camera.js','src/simulation/config.js','src/simulation/index.js','src/simulation/scene-thermal.js','src/simulation/tools.js','tools/review/shared-map-route-contact.mjs'];
const compiled=compileSharedMap(read(sourceFiles[0]),read(sourceFiles[1]),read('assets/art/place-scenes/new-york/navigation.json')),createNavigation=compiled.createNavigation;
let trial;compiled.createNavigation=args=>{trial=args.trial;return createNavigation(args);};
const sim=createSimulation({gameplayMap:compiled,characterId:'goat'}),started=performance.now(),result={scope:'CPU normal-command route/contact only; no browser, renderer or visual acceptance.',baselineRuntimeCommit:'2b350309d9116812a1d3988af090614bdaefbc25',codeHashLineEndings:'LF',inputConfiguration:compiled.configuration.input,deadlineMs:60000,sourceHashes:Object.fromEntries(sourceFiles.map(p=>[p,hash(p)])),checkpoints:[],contacts:[]};let stage='spawn';
const rect={left:0,top:0,width:844,height:390},rig=createCameraRig({clientWidth:844,clientHeight:390},{domElement:{getBoundingClientRect:()=>rect},setSize(){}},compiled.definition,{x:compiled.configuration.input.cameraX,h:14,y:compiled.configuration.input.cameraY}),ui={getBoundingClientRect:()=>rect};
const step=()=>{assert.ok(performance.now()-started<60000,'Finite CPU deadline');return sim.advance(1/60);};
const command=c=>{assert.equal(sim.dispatch(c),true);return step();};
const checkpoint=label=>{const s=sim.snapshot();result.checkpoints.push({label,player:s.player,world:s.clocks.world,portal:s.navigation.portalStates['ny-front'],cells:s.diagnostics.thermal.gridCells,navigation:s.navigation.navigation});return s;};
function walk(x,y,label){
  stage=label;let unchanged=0,previous;
  for(let i=0;i<300;i++){
    const s=sim.snapshot(),p=s.player,dx=x-p.x,dy=y-p.y,d=Math.hypot(dx,dy);
    if(d<.025){command({type:'move',x:0,y:0});return checkpoint(label);}
    assert.notEqual(p.falling,true);assert.equal(p.hp,100);
    if(previous&&Math.hypot(p.x-previous.x,p.y-previous.y)<.0001)unchanged++;else unchanged=0;
    assert.ok(unchanged<45,'Normal movement stalled at '+label);previous={x:p.x,y:p.y};
    const magnitude=Math.min(.65,d/(9/60));command({type:'move',...worldToStick({x:dx/d*magnitude,y:dy/d*magnitude},compiled.configuration.input)});
  }throw Error('Finite route tick limit at '+label);
}
function door(action){stage=action+'-door';const p=sim.snapshot().player;assert.equal(p.interaction?.id,'ny-front');assert.equal(p.interaction.action,action);assert.equal(p.interaction.enabled,true);command({type:'interact',portalId:'ny-front',action});step();assert.equal(sim.snapshot().navigation.portalStates['ny-front'],action==='open');checkpoint(stage);}
function useTool(kind,target,carrier,tool){
  stage=kind+'-'+tool;const before=sim.snapshot(),p=before.player,from=[p.x,p.elevation+.9,p.y],to=[target.x,target.h,target.y];
  rig.update(p);const screen=rig.projectInteraction(to,ui);assert.equal(screen.visible,true);const picked=rig.screenToWorld(screen.x,screen.y,r=>sim.pickAimSurface(r));assert.ok(picked.sourceSurfaceId===carrier||picked.sourceSurfaceId.startsWith(carrier+'/part/'));target={x:picked.x,y:picked.y,h:picked.h};
  assert.ok(Math.hypot(target.x-p.x,target.y-p.y)<=DEFAULT_CONFIG.tools[tool].range,'The actual supported stance must satisfy its unchanged caller range');
  const hit=trial.scene.index.crossings(from,[target.x,target.h,target.y],{includeEndpoints:true}).find(h=>h.t>1e-7&&trial.scene.index.pass(h.surface)<.99);assert.ok(hit);const contacted=hit.surface.sourceCarrierId||hit.surface.sourceSurfaceId;assert.equal(contacted,carrier);
  const heatBefore=trial.metrics().heat.input;command({type:'select-tool',tool});command({type:'aim',...target});
  if(tool==='torch'){command({type:'primary',pressed:false});command({type:'primary',pressed:true});command({type:'primary',pressed:false});assert.equal(sim.snapshot().player.torch.phase,'lit');}
  command({type:'primary',pressed:false});command({type:'primary',pressed:true});command({type:'primary',pressed:false});step();
  const s=sim.snapshot(),event=s.events.filter(e=>e.tool===tool&&e.result!=='lit').at(-1),entry={kind,tool,stance:{x:p.x,y:p.y,h:p.elevation},distance:Math.hypot(target.x-p.x,target.y-p.y),picked,hit:{id:hit.surface.id,sourceSurfaceId:hit.surface.sourceSurfaceId,sourceCarrierId:contacted,material:hit.surface.material,position:[target.x,target.h,target.y]},event,heatInputDelta:trial.metrics().heat.input-heatBefore};result.contacts.push(entry);
  if(tool==='matches')assert.equal(s.player.inventory.matches,before.player.inventory.matches-1);assert.ok(Math.abs(event.x-target.x)<.025);assert.ok(Math.abs(event.y-entry.hit.position[2])<.06);
  if(kind==='glass')assert.equal(event.result,'no-fuel');else{assert.ok(['heated','ignited'].includes(event.result));assert.ok(entry.heatInputDelta>0);assert.ok(event.cellIds.length);entry.heatedSourceIds=[...new Set(event.cellIds.flatMap(id=>(trial.scene.cells.get(id)?.fuels||[]).map(f=>f.sourceSurfaceId)))];assert.ok(entry.heatedSourceIds.some(id=>id.startsWith(carrier+'/')));}
  return checkpoint(stage);
}
try{
  checkpoint('spawn');walk(56,24.8,'front-stair');door('open');let s=walk(56,28,'interior-entry');assert.equal(s.player.interior,true);assert.ok(Math.abs(s.player.elevation-2.12)<1e-5);
  walk(56,24.8,'front-return');door('close');walk(56,24.5,'clear-column-row');walk(50.5,24.5,'glass-approach');walk(50.5,25.05,'glass-stance');useTool('glass',{x:50.5,y:26,h:3.02},'new-york::carrier/main/0/lower-3/glass','torch');
  walk(50.5,24.5,'glass-backoff');walk(55.25,24.5,'timber-approach');walk(55.25,25.25,'timber-stance');useTool('timber',{x:54.8,y:26,h:3.02},'new-york::carrier/main/0/entry/jamb--1','matches');result.passed=true;
}catch(error){result.passed=false;result.failure={stage,message:error.message,stack:error.stack,state:checkpoint('failure')};process.exitCode=1;}
finally{sim.dispose();compiled.dispose();result.elapsedMs=performance.now()-started;fs.mkdirSync(path.dirname(output),{recursive:true});fs.writeFileSync(output,JSON.stringify(result,null,2)+'\n');}
console.log(JSON.stringify({passed:result.passed,stage,checkpoints:result.checkpoints.map(c=>({label:c.label,x:c.player.x,y:c.player.y,h:c.player.elevation})),contacts:result.contacts,failure:result.failure?.message,elapsedMs:result.elapsedMs}));
