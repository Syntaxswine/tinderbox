import fs from 'node:fs';
import path from 'node:path';
import assert from 'node:assert/strict';
import {gzipSync} from 'node:zlib';
import {loadCatalogueModules} from '../../src/runtime/catalogue-modules.js';
import {createSimulation,worldToStick} from '../../src/simulation/index.js';
import {DEFAULT_CONFIG} from '../../src/simulation/config.js';

const out=path.resolve(process.argv[2]||'artifacts/qa/catalogue-modular/native-play');fs.mkdirSync(out,{recursive:true});
const started=Date.now(),deadline=started+600000,commands=[],frames=[],events=new Map();let sim,current;
const save=(name,value)=>fs.writeFileSync(path.join(out,name),JSON.stringify(value,null,2)+'\n');
save('helper.json',{owner:'Coder Tinderbox',purpose:'Bounded actual full-map tools and witness acceptance',pid:process.pid,executable:process.execPath,startedAt:new Date(started).toISOString(),deadline:new Date(deadline).toISOString(),port:null,stop:'Loop deadline or STOP file; finally disposes the one host simulation'});
const record=(label)=>{for(const event of current.events)events.set(current.diagnostics.generation+':'+event.id,event);const row={label,hostTick:current.tick,clocks:current.clocks,player:current.player,actors:current.actors,witness:current.witness,thermal:current.diagnostics.thermal};frames.push(row);save('latest.json',row);return current;};
const send=command=>{commands.push({generation:current.diagnostics.generation,hostTick:current.tick+1,...command});assert.ok(sim.dispatch(command),'Accepted input '+JSON.stringify(command));};
const tick=(label)=>{if(Date.now()>deadline||fs.existsSync(path.join(out,'STOP')))throw Error('Bounded play check stopped; state/inputs preserved');const before=performance.now();current=sim.advance(DEFAULT_CONFIG.step);for(const event of current.events)events.set(current.diagnostics.generation+':'+event.id,event);if(label)record(label);return current;};
function walk(target,label){let stalled=0;for(let i=0;i<2000;i++){
  const p=current.player,dx=target[0]-p.x,dz=target[2]-p.y,d=Math.hypot(dx,dz);
  if(d<.025&&Math.abs((p.elevation||0)-target[1])<.25){send({type:'move',x:0,y:0});tick(label);return;}
  if(p.interaction?.kind==='door'&&p.interaction.enabled&&p.interaction.action==='open'){send({type:'move',x:0,y:0});send({type:'interact',portalId:p.interaction.id,action:'open'});tick();tick();}
  const amount=9*DEFAULT_CONFIG.step*(current.clocks.playerScale||1),scale=Math.min(1,d/amount)*(current.effects.inversion.active?-1:1),stick=worldToStick({x:dx/(d||1)*scale,y:dz/(d||1)*scale},DEFAULT_CONFIG.input);send({type:'move',...stick});const old={x:p.x,y:p.y};tick();stalled=Math.hypot(current.player.x-old.x,current.player.y-old.y)<1e-7?stalled+1:0;
  if(stalled>=4)throw Error('Blocked '+label+' '+JSON.stringify({player:current.player,target,navigation:current.diagnostics.thermal.navigation}));
 }throw Error('Walking bound '+label);}
function press(tool,aim){send({type:'select-tool',tool});if(aim)send({type:'aim',...aim});send({type:'primary',pressed:true});send({type:'primary',pressed:false});tick();tick();return record('press-'+tool);}
function waitFor(predicate,label,max=1000){for(let i=0;i<max;i++){if(predicate(current))return record(label);tick();}throw Error('Did not reach '+label);}
function entry(){walk([40,0,19],'shop-approach');walk([40,0,18.2],'shop-reach');walk([40,0,16],'shop-inside');}
try{
 const compiled=await loadCatalogueModules({fetcher:async url=>({ok:true,json:async()=>JSON.parse(fs.readFileSync(url))})});
 sim=createSimulation({scenario:'neighborhood',seed:1893,characterId:'goat',catalogueModules:compiled});current=sim.snapshot();record('initial');
 if(process.argv.includes('--tools-only')){
   walk([20,0,22.5],'street-tool-approach');walk([28,0,22.5],'actor-cone-stance');
   send({type:'select-tool',tool:'flamethrower'});send({type:'primary',pressed:true});
   let held=0;for(;held<120;held++){const actor=current.actors.find(a=>a.id==='neighbor-goat');send({type:'aim',x:actor.x,y:actor.y});tick();if(current.actors.find(a=>a.id===actor.id).burn)break;}
   assert.ok(current.actors.find(a=>a.id==='neighbor-goat').burn);record('actual-actor-burning');send({type:'primary',pressed:false});tick();assert.equal(current.discharge.active,false);assert.ok(Math.abs(current.player.inventory.flamethrowerFuel-(6-(held+1)*DEFAULT_CONFIG.step*.3))<1e-7);
   walk([20,0,22.5],'torch-road');walk([20,0,24.5],'torch-grass-stance');press('torch');assert.equal(current.player.torch.phase,'lit');const torchBefore=current.player.inventory.torchFuel;for(let i=0;i<30;i++)tick();assert.ok(current.player.inventory.torchFuel<torchBefore);press('torch',{x:20,y:25.35});assert.ok(current.events.some(e=>e.type==='thermal-ignition'&&e.cls==='grass'));record('finite-carried-torch-native-fire');
   press('molotov');const magnitude=.12+.88*4/6;send({type:'move',...worldToStick({x:magnitude,y:0},DEFAULT_CONFIG.input)});tick();send({type:'move',x:0,y:0});tick();record('actual-lantern-preview');assert.ok(current.player.lanternAim.canThrow);assert.ok(current.player.lanternAim.path.length>0);press('molotov');assert.equal(current.player.inventory.molotovs,3);
   waitFor(s=>s.events.some(e=>e.type==='native-payload-release'),'actual-lantern-impact',120);waitFor(s=>s.diagnostics.thermal.metrics.stats.landings>0,'native-lantern-landing',120);for(let i=0;i<10;i++)tick();record('one-native-lantern-payload');assert.ok(Math.abs(current.diagnostics.thermal.metrics.fuel.added-.5)<1e-7);assert.ok(current.cells.some(c=>c.depositedFuel>0));
   send({type:'reset'});tick();tick();record('tools-reset');walk([12.5,0,18],'barrel-approach');walk([12.5,0,16.1],'barrel-match-stance');assert.ok(current.world.obstacles.some(o=>o.id==='street-drum-west'&&!o.destroyed));press('matches',{x:12.5,y:15.25});waitFor(s=>s.events.some(e=>e.type==='barrel-explosion'&&e.objectId==='street-drum-west'),'native-barrel-explosion',30);waitFor(s=>Math.abs(s.diagnostics.thermal.metrics.heat.input-3.85)<1e-7,'native-finite-barrel-heat',10);assert.ok(!current.world.obstacles.some(o=>o.id==='street-drum-west'&&!o.destroyed));assert.ok(current.player.hp<100);assert.ok(Math.abs(current.diagnostics.thermal.metrics.heat.error)<1e-7);record('native-barrel-and-damage');
   save('result.json',{pass:true,checks:['production held cone','actual actor burning and release','finite carried torch and native grass fire','aimed production lantern arc and one finite native payload','barrel retirement/blast/player damage','reset']});
 }else{
 if(!process.argv.includes('--suspicion-only')){
 entry();walk([40,0,14.85],'case-aisle');walk([38.1,0,14.85],'case-stance');
 waitFor(s=>{const a=s.actors.find(a=>a.id==='chicago-beat-officer');return Math.cos(a.heading)<-.9&&a.x>40.5&&a.x<41.1;},'normal-patrol-west-leg');
 press('matches',{x:37.25,y:14.85});assert.equal(current.witness.reaction.kind,'aggressive','Actual direct contact must cause aggression');assert.ok(current.witness.reaction.nativeProof?.independent);
 walk([40,0,14.85],'leave-case');walk([40,0,16.2],'clear-open-entry-shot');
 waitFor(s=>s.events.some(e=>e.type==='officer-shot'),'actual-pistol-shot',180);const shot=current.events.findLast(e=>e.type==='officer-shot');assert.equal(shot.damage,24);
 walk([40,0,14.5],'cover-aisle');walk([42.8,0,14.5],'around-hanging-pendant');walk([42.8,0,15.8],'behind-glazed-cover');const count=current.events.filter(e=>e.type==='officer-shot').length;
 for(let i=0;i<125;i++)tick();record('cover-after-cooldown');assert.equal(current.events.filter(e=>e.type==='officer-shot').length,count,'Live native glazing must block another shot');
 save('direct-result.json',{pass:true,shot,reaction:current.witness.reaction});
 }
 if(process.argv.includes('--direct-only')){save('result.json',{pass:true,checks:['native direct contact','normal patrol','independent source proof','draw/shot','live cover']});}
 else {
   if(!process.argv.includes('--suspicion-only')){
   walk([42.8,0,14.5],'leave-cover');walk([40,0,14.5],'return-entry-aisle');walk([40,0,19],'exit-shop');walk([40,0,23],'healing-road');walk([21,0,23],'healing-pickup');assert.ok(current.pickups.find(p=>p.kind==='healing').consumed);
   walk([27,0,21],'inversion-pickup');assert.ok(current.effects.inversion.active);walk([17,0,21],'powder-pickup');assert.ok(current.effects.powder.active);
   const stock=current.player.inventory.gas,travel=current.player.travelled,nativeAdded=current.diagnostics.thermal.metrics.fuel.added;press('jerry-can');walk([19,0,21],'powder-pour');press('jerry-can');
   assert.ok(Math.abs(stock-current.player.inventory.gas-(current.player.travelled-travel)*.08)<1e-7);assert.equal(current.clocks.worldScale,.35);assert.equal(current.clocks.playerScale,1.5);record('all-pickups-and-powder-pour');
   send({type:'reset'});tick();tick();record('reset');assert.equal(current.player.inventory.matches,12);assert.ok(current.pickups.every(p=>!p.consumed));
   }
   entry();walk([40,0,14],'lantern-aisle');walk([40,0,11.4],'lantern-back');walk([41,0,12.75],'lantern-reach');
   assert.equal(current.player.interaction?.kind,'lantern');send({type:'interact',objectId:current.player.interaction.id,action:'take'});tick('take-real-lantern');
   walk([40,0,12.75],'lantern-return-aisle');walk([40,0,15.8],'lantern-front-aisle');walk([38.25,0,15.8],'visible-lantern-stance');
   waitFor(s=>{const a=s.actors.find(a=>a.id==='chicago-beat-officer');return Math.cos(a.heading)<-.9&&a.x>40.3&&a.x<40.5&&s.witness.memory;},'visible-carried-lantern');
   walk([38.25,0,14.85],'outside-officer-current-view');walk([38.1,0,14.85],'case-side-strike');press('matches',{x:37.25,y:14.85});waitFor(s=>s.witness.reaction.kind==='suspicious','native-fire-suspicion',120);
   for(let i=0;i<150;i++)tick();record('suspicion-only');assert.ok(!current.events.some(e=>e.type==='officer-shot'));assert.notEqual(current.witness.reaction.kind,'aggressive');
   save('result.json',{pass:true,checks:process.argv.includes('--suspicion-only')?['real carried lantern','unseen strike and visible native fire suspicion without shot']:['native direct proof and live cover','three automatic pickups','powder path/fuel/world clocks','reset','real carried lantern','unseen strike and visible native fire suspicion without shot']});
 }
 }
}catch(error){save('failure.json',{error:error.stack,last:current?{player:current.player,witness:current.witness,thermal:current.diagnostics.thermal}:null});throw error;}
finally{if(current)fs.writeFileSync(path.join(out,'last-state.json.gz'),gzipSync(JSON.stringify(current)));save('commands.json',commands);save('frames.json',frames);save('events.json',[...events.values()]);sim?.dispose();save('closed.json',{at:new Date().toISOString(),ports:[],disposed:true});}
