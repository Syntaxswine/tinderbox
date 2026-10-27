
export const FIXTURES=Object.freeze([
  {id:'trail',label:'01 / UNLIT FUEL',title:'A line worth following',copy:'Cold deposited gas on paving. Continuous cells, a bend, and an intentional dry gap. Fixture only.'},
  {id:'front',label:'02 / ADVANCING FRONT',title:'Keep a way out',copy:'Spent ground → sustained flame → heating → fresh gas. Bear ahead of the front. Fixture only.'},
  {id:'burn',label:'03 / SUSTAINED BURN',title:'Heat has a footprint',copy:'A mixed grass/fuel patch, painted flame and soot. The ground mask stays inside supplied cells. Fixture only.'},
  {id:'spent',label:'04 / SPENT GROUND',title:'What the fire leaves',copy:'Authoritative spent cells: darkened ground without an endlessly burning effect. Fixture only.'},
  {id:'powder',label:'05 / TWO CLOCKS',title:'Gain a little distance',copy:'Player clock ×1.5, world clock ×0.35. Authored motion compares animation domains; this is not a gameplay test.'},
  {id:'bear',label:'06 / BEAR & GRIPS',title:'A provisional troublemaker',copy:'Original procedural bear, five equipped tools, and grip/muzzle/spout anchors. Prototype appearance.'},
  {id:'burst',label:'07 / RESOLVED EVENT',title:'One event, one burst',copy:'A labelled explosion fixture. Repeated event IDs do not restart the presentation. Damage is outside this workbench.'}
]);
function world(){
  const tiles=[];
  for(let y=0;y<16;y++)for(let x=0;x<20;x++)tiles.push({x:x+.5,y:y+.5,size:1,material:y>=12?'asphalt':y>=10?'paving':(x>7&&x<13&&y>5)?'paving':'grass'});
  return {width:20,height:16,tileSize:1,fireCellSize:.5,tiles,obstacles:[
    {id:'house-a',x:4,y:3.3,width:5,depth:3,height:2.8,material:'plaster',kind:'building'},
    {id:'house-b',x:15.4,y:3.3,width:4.2,depth:3,height:3.1,material:'plaster',kind:'building'},
    {id:'fence',x:10,y:4.4,width:4.1,depth:.18,height:1.15,material:'wood',kind:'fence'},
    {id:'crate',x:6.8,y:7.1,width:.85,depth:.85,height:.8,material:'wood',kind:'crate'},
    {id:'drum-a',x:8.0,y:7.1,width:.656,depth:.656,height:.8,material:'fuel',kind:'explosive-barrel'},
    {id:'drum-b',x:8.85,y:7.1,width:.656,depth:.656,height:.8,material:'fuel',kind:'explosive-barrel'}
  ]};
}
const WORLD=world();
const cell=(ix,iy,phase='cold',gas=.3,intensity=.7)=>({id:ix+':'+iy,x:ix*.5+.25,y:iy*.5+.25,size:.5,material:'paving',surfaceFuel:0,depositedFuel:gas,heat:phase==='heating'?.7:phase==='burning'?1:0,phase,intensity:phase==='burning'?intensity:0});
export function fixtureSnapshot(id='front',time=4,tool='jerry-can'){
  const powder=id==='powder',worldTime=time*(powder?.35:1),playerTime=time*(powder?1.5:1),cells=[];
  const path=[];
  for(let x=11;x<=22;x++)path.push([x,17]);
  for(let y=18;y<=19;y++)path.push([22,y]);
  for(let x=23;x<=26;x++)path.push([x,19]);
  path.forEach(([x,y],i)=>{
    const phase=id==='trail'||id==='bear'?'cold':id==='spent'?'spent':i<4?'spent':i<9?'burning':i===9?'heating':'cold';
    if(id==='trail'&&i===5)return;
    const gas=phase==='spent'?0:phase==='burning'?.15:.3;cells.push(cell(x,y,phase,gas,.55+(i%3)*.12));
  });
  if(id==='burn')for(let y=14;y<=18;y++)for(let x=16;x<=21;x++){
    if(cells.some(c=>c.id===x+':'+y))continue;
    const c=cell(x,y,(x+y)%7===0?'heating':'burning',0,.50+((x+y)%4)*.12);c.material='grass';c.surfaceFuel=.5;cells.push(c);
  }
  const position=powder?{x:10.0+Math.min(playerTime*.38,3.35),y:9.75}:id==='bear'?{x:11.5,y:9.4}:id==='burn'?{x:11.10,y:9.30}:{x:13.35,y:9.75};
  if(id==='burst')WORLD.obstacles=WORLD.obstacles.map(o=>o.id==='drum-a'?{...o,destroyed:true}:o);
  else WORLD.obstacles=WORLD.obstacles.map(o=>o.id==='drum-a'?{...o,destroyed:false}:o);
  return {version:1,tick:Math.floor(time*60),paused:false,clocks:{active:time,player:playerTime,world:worldTime,playerScale:powder?1.5:1,worldScale:powder?.35:1},
    player:{id:'bear',...position,heading:.08,moving:powder,hp:100,maxHp:100,tool,pouring:id==='trail'||powder,usingTool:id==='bear'&&['torch','flamethrower'].includes(tool),
      inventory:{matches:6,gas:20,molotovs:3,torchFuel:30,flamethrowerFuel:30,powder:2,healing:2,inversion:2}},
    effects:{powder:{active:powder,remaining:powder?Math.max(0,8-time):0},inversion:{active:false,remaining:0}},
    world:structuredClone(WORLD),cells,actors:[{id:'neighbor',x:5.5+Math.sin(worldTime*.6)*.65,y:11.1,heading:0,moving:true,hp:100}],
    events:id==='burst'?[{id:1,tick:0,type:'explosion',x:8,y:7.1,radius:1.7,worldTime:Math.floor(time/4)*4}]:[]};
}
export function timingFor(snapshot,delta=0){return {alpha:0,playerDelta:delta*snapshot.clocks.playerScale,worldDelta:delta*snapshot.clocks.worldScale,playerTime:snapshot.clocks.player,worldTime:snapshot.clocks.world};}
