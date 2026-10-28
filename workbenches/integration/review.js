import {startGame} from '../../src/main.js';
import {worldToStick} from '../../src/simulation/geometry.js';
import {DEFAULT_CONFIG} from '../../src/simulation/config.js';
const output=document.querySelector('#results'), root=document.querySelector('#game');
let game, results=[];
const find=selector=>root.querySelector(selector);
const ok=(value,message)=>{if(!value)throw Error(message);};
const near=(a,b,tolerance=1e-6)=>ok(Math.abs(a-b)<tolerance,`${a} differs from ${b}`);
const step=(ticks=1)=>{let snapshot;for(let i=0;i<ticks;i++)snapshot=game.advance(1/60);return snapshot;};
async function open(options={}){game?.dispose();game=await startGame({root,autoStart:false,...options});return game;}
const pointer=(target,type,id,x=0,y=0)=>target.dispatchEvent(new PointerEvent(type,{pointerId:id,pointerType:'touch',button:0,clientX:x,clientY:y,bubbles:true,cancelable:true}));
function move(vector,id=71){const stick=find('[data-stick]'),rect=stick.getBoundingClientRect(),radius=Math.min(rect.width,rect.height)*.36;pointer(stick,'pointerdown',id,rect.x+rect.width/2+vector.x*radius,rect.y+rect.height/2-vector.y*radius);}
const select=tool=>{find(`[data-tool="${tool}"]`).click();step();};
const dischargeArt=()=>game.artDiagnostics().fire.discharge;
async function check(name,run){try{await run();results.push({name,status:'pass'});}catch(error){results.push({name,status:'fail',message:error.message});}output.textContent=JSON.stringify({results},null,2);}
async function suite(){
  results=[];document.querySelectorAll('#qa button').forEach(button=>button.disabled=true);
  try{
    await open();
    await check('Production factories load together with exactly five tools and three drugs',()=>{ok(root.querySelectorAll('[data-tool]').length===5,'Tool count');ok(root.querySelectorAll('[data-drug]').length===3,'Drug count');ok(find('canvas').width>0,'Canvas did not size');ok(game.artDiagnostics().updates>0,'Art is not consuming snapshots');});
    await check('Real UI pour, raw joystick and powder preserve a continuous distance-accounted trail',()=>{
      select('jerry-can');find('[data-primary]').click();step();ok(game.snapshot().player.pouring,'Pour edge failed');
      move(worldToStick({x:1,y:0},DEFAULT_CONFIG.input));find('[data-drug="powder"]').click();
      const before=game.snapshot();const after=step(30),distance=after.player.travelled-before.player.travelled;
      near(distance,2.25);near(before.player.inventory.gas-after.player.inventory.gas,distance*.08);
      ok(after.player.pouring&&after.effects.powder.active,'Powder cancelled pouring');near(after.clocks.world-before.clocks.world,.175);
      const wet=after.cells.filter(cell=>cell.depositedFuel>0).sort((a,b)=>a.x-b.x);ok(wet.length>=5,'Trail gaps');for(let i=1;i<wet.length;i++)ok(wet[i].x-wet[i-1].x<=.500001,'Dry hole in trail');
      ok(find('[data-primary-label]').textContent==='STOP','HUD does not show Stop');ok(!find('[data-effect="powder"]').hidden,'Powder feedback hidden');
    });
    await check('Inversion reverses the same held stick once and leaves aim and pour intact',()=>{
      const before=game.snapshot();find('[data-drug="inversion"]').click();const after=step(10);ok(after.player.x<before.player.x,'Did not reverse');near(after.aim.x,before.aim.x);near(after.aim.y,before.aim.y);ok(after.player.pouring,'Drug cancelled pour');
      pointer(window,'pointerup',71);step();const gas=game.snapshot().player.inventory.gas;step(10);near(game.snapshot().player.inventory.gas,gas);
    });
    await check('Pause freezes all clocks, stops pour and resumes without stale movement',()=>{
      find('[data-pause]').click();step();const before=game.snapshot();step(20);const after=game.snapshot();near(after.clocks.world,before.clocks.world);near(after.clocks.player,before.clocks.player);ok(!after.player.pouring&&after.paused,'Pause failed');find('[data-resume]').click();step();ok(!game.snapshot().paused&&!game.snapshot().player.moving,'Stale input resumed');
    });
    await check('Healing reads and changes the authoritative HP and pill stock',async()=>{
      await open({scenario:{id:'heal-review',width:20,height:16,player:{x:4,y:9,hp:60},obstacles:[],actors:[]}});
      find('[data-drug="healing"]').click();step();near(game.snapshot().player.hp,95);near(game.snapshot().player.inventory.healing,2);ok(find('[data-health-text]').textContent==='95 / 100','Health display stale');
    });
    await check('Held flamethrower consumes finite fuel, emits resolved fire and releases',async()=>{
      await open();select('flamethrower');game.dispatch({type:'aim',x:7,y:9});step();
      pointer(find('[data-primary]'),'pointerdown',72);const after=step(45);ok(after.player.usingTool,'Held trigger lost');ok(after.player.inventory.flamethrowerFuel<6,'No fuel consumed');ok(after.cells.some(cell=>cell.phase==='burning')||after.structureFire.surfaces.some(surface=>surface.temperatureK>293.15),'No authoritative heat supplied');ok(dischargeArt()?.active,'Resolved discharge art is missing');pointer(window,'pointerup',72);step();ok(!game.snapshot().player.usingTool&&!dischargeArt().active,'Release left a stale jet');
    });
    await check('A nearby wall clips resolved flame before the protruding cosmetic nozzle',async()=>{
      await open({scenario:{id:'combined-wall',width:20,height:16,player:{x:4,y:9,tool:'flamethrower'},obstacles:[{id:'front',x:5.1,y:8,width:.1,depth:16,height:3,material:'masonry',kind:'building'}],actors:[]}});
      game.dispatch({type:'aim',x:8,y:9});step();pointer(find('[data-primary]'),'pointerdown',72);step(2);
      const snapshot=game.snapshot(),art=dischargeArt();
      ok(snapshot.discharge.active&&snapshot.discharge.rays.every(ray=>ray.x<5.05),'Authoritative wall clipping failed');
      ok(art.active&&art.muzzleInsideShape===false&&art.longestRay<1.2,'Art moved discharge to far-side nozzle');
      find('[data-pause]').click();step();ok(!dischargeArt().active,'Pause left a stale jet');
    });
    await check('Powder separates bear from a finite front on the same freshly poured line',async()=>{
      await showChase();const snapshot=game.snapshot();ok(snapshot.player.x-snapshot.diagnostics.frontX>7,'No escape separation');ok(snapshot.player.pouring,'Chase lost pour');ok(snapshot.diagnostics.burningCells>0,'No chasing fire');ok(game.artDiagnostics().fire.flameCards>0,'Authoritative fire has no art');
    });
    results.push({name:'Combined resource/performance sample',status:'observed',metrics:game.metrics(),art:game.artDiagnostics()});
    const cycles=[];
    await check('Four complete runtime rebuilds dispose views and keep live resource counts stable',async()=>{for(let i=0;i<4;i++){const previous=game;previous.dispose();ok(previous.artDiagnostics().disposed,'Art did not dispose');await open();cycles.push(game.metrics());}ok(cycles.every(value=>value.geometries===cycles[0].geometries&&value.textures===cycles[0].textures),'Resources grew across rebuilds');ok(root.querySelectorAll('canvas').length===1&&root.querySelectorAll('.tb-ui').length===1,'Duplicate composition');});
    output.textContent=JSON.stringify({passed:results.filter(item=>item.status==='pass').length,failed:results.filter(item=>item.status==='fail').length,viewport:{width:innerWidth,height:innerHeight},results},null,2);
  }finally{document.querySelectorAll('#qa button').forEach(button=>button.disabled=false);}
}
async function showChase(){await open({scenario:'chase'});find('[data-primary]').click();step();move(worldToStick({x:1,y:0},DEFAULT_CONFIG.input));find('[data-drug="powder"]').click();step(120);pointer(window,'pointerup',71);game.advance(0);return game;}
async function showJet(){await open();select('flamethrower');game.dispatch({type:'aim',x:8,y:9});step();pointer(find('[data-primary]'),'pointerdown',72);step(35);return game;}
document.querySelector('#run').addEventListener('click',()=>suite().catch(error=>output.textContent=error.stack));
document.querySelector('#chase').addEventListener('click',()=>showChase().then(()=>output.textContent=JSON.stringify({snapshot:game.snapshot().clocks,metrics:game.metrics(),art:game.artDiagnostics()},null,2)));
document.querySelector('#jet').addEventListener('click',()=>showJet().then(()=>output.textContent=JSON.stringify({metrics:game.metrics(),art:game.artDiagnostics()},null,2)));
document.querySelector('#sample').addEventListener('click',async()=>{
  let complete=false;output.textContent='Sampling 260 actual animation frames…';
  await open({autoStart:true,onSnapshot:(_snapshot,metrics)=>{
    if(metrics.frames<260||complete)return;complete=true;
    output.textContent=JSON.stringify({mode:'real RAF, warm final 240-frame window',metrics,art:game.artDiagnostics()},null,2);
    game.dispatch({type:'pause',paused:true});
  }});
  game.dispatch({type:'select-tool',tool:'flamethrower'});game.dispatch({type:'aim',x:8,y:9});game.dispatch({type:'primary',pressed:true});
});
document.querySelector('#export').addEventListener('click',()=>{
  const url=URL.createObjectURL(new Blob([output.textContent],{type:'application/json'})),anchor=document.createElement('a');
  anchor.href=url;anchor.download=`tinderbox-integration-${innerWidth}x${innerHeight}.json`;anchor.click();setTimeout(()=>URL.revokeObjectURL(url),1000);
});
document.querySelector('#hide').addEventListener('click',()=>document.querySelector('#qa').hidden=true);
window.addEventListener('keydown',event=>{if(event.code==='F2'){event.preventDefault();document.querySelector('#qa').hidden=false;}});
await open();
document.querySelectorAll('#qa button').forEach(button=>button.disabled=false);output.textContent='Ready';
