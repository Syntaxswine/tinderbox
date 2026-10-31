/** One finite canonical source lifetime; never advances from wall/player time. */
const IDS=['cell:10,16','cell:10,17','cell:11,16','cell:11,17'];
const POSITIONS={'cell:10,16':[5.25,8.25],'cell:10,17':[5.25,8.75],'cell:11,16':[5.75,8.25],'cell:11,17':[5.75,8.75]};
const EPS=1e-8;
const smooth=x=>{x=Math.max(0,Math.min(1,x));return x*x*(3-2*x);};
export function createContactSourceClock(){
  let generation=null,lastWorld=null,lastTick=null,highestId=-Infinity,births=new Map(),burnouts=new Map();
  function reset(){generation=null;lastWorld=lastTick=null;highestId=-Infinity;births=new Map();burnouts=new Map();}
  function update(frame){
    const receipts=frame?.eventReceipts,world=frame?.worldTime;
    if(!Number.isFinite(world)||!receipts||!Number.isFinite(receipts.generation)||!Array.isArray(receipts.events)||!Array.isArray(frame.cells))throw Error('Finite contact requires observed world-clock source receipts');
    if(receipts.reset||generation!==receipts.generation||lastWorld!==null&&(world<lastWorld||frame.tick<lastTick))reset();
    generation=receipts.generation;lastWorld=world;lastTick=frame.tick;
    for(const event of [...receipts.events].sort((a,b)=>a.id-b.id)){
      if(!Number.isFinite(event.id)||event.id<=highestId)continue;highestId=event.id;
      if(event.receivedGeneration!==undefined&&event.receivedGeneration!==generation)continue;
      if(!IDS.includes(event.cellId)||!['ignition','burnout'].includes(event.type))continue;
      if(!Number.isFinite(event.receivedWorldTime)||event.receivedWorldTime>world+EPS)throw Error('Invalid contact receipt world time');
      const map=event.type==='ignition'?births:burnouts;
      if(map.has(event.cellId)&&map.get(event.cellId)!==event.receivedWorldTime)throw Error('Repeated finite source lifetime requires reset');
      map.set(event.cellId,event.receivedWorldTime);
    }
    if(Number.isFinite(receipts.highestId))highestId=Math.max(highestId,receipts.highestId);
    const burning=frame.cells.filter(c=>c.phase==='burning'&&c.intensity>0),byId=new Map(frame.cells.map(c=>[c.id,c]));
    if(burning.some(c=>!IDS.includes(c.id))||frame.discharge?.active||frame.torch?.phase==='lit'&&frame.player?.tool==='torch'&&frame.torch.remainingSeconds>0||frame.buildingVisuals?.length)throw Error('Unsupported emitting layout for finite contact prototype');
    for(const id of IDS){const c=byId.get(id),p=POSITIONS[id];if(!c||c.material!=='grass'||c.size!==.5||Math.abs(c.x-p[0])>EPS||Math.abs(c.y-p[1])>EPS||(c.depositedFuel||0)>EPS||(c.elevation||0)!==0)throw Error('Unsupported canonical contact source geometry/fuel');}
    if(!births.size){if(burning.length||burnouts.size||IDS.some(id=>byId.get(id).phase==='spent'))throw Error('Source ignition age unavailable for burning/spent/history state; replay from initial state');return{phase:'empty',age:0,reactionGain:0,densityGain:0,sample0:0,sample1:0,mix:0,birthWorld:null,burnoutWorld:null};}
    if(births.size!==4||new Set(births.values()).size!==1)throw Error('Finite contact requires four simultaneous observed source ignitions');
    const birth=[...births.values()][0],age=world-birth;if(age<-EPS)throw Error('Contact source age rewound without receipts');
    let reactionGain=0,densityGain=1,terminal=null,phase='burning';
    if(burning.length){
      if(burning.length!==4||burnouts.size)throw Error('Partial/restarted finite contact source is unsupported');
      if(age>3.2+EPS)throw Error('Sustained burning exceeds finite asset; active-loop benchmark is unsupported');
      reactionGain=burning.reduce((sum,c)=>sum+c.intensity,0)/4;
    }else{
      if(burnouts.size!==4||new Set(burnouts.values()).size!==1)throw Error('Actual burnout receipt age unavailable');
      terminal=[...burnouts.values()][0];if(Math.abs(terminal-birth-3.2)>EPS)throw Error('Finite source lifetime differs from canonical3.2worldseconds');
      const tailAge=world-terminal;phase=tailAge<3.2?'smoke-tail':'retired';
      // Actual endpoint density is NOT naturally empty. This is explicit finite
      // presentation retirement during the last .4s of the existing allowance.
      densityGain=tailAge>=3.2?0:1-smooth((tailAge-2.8)/.4);
    }
    const position=Math.max(0,Math.min(192,age*30)),sample0=Math.floor(position),sample1=Math.min(192,sample0+1);
    return {phase,age,birthWorld:birth,burnoutWorld:terminal,reactionGain,densityGain,sample0,sample1,mix:position-sample0,sourceIds:[...IDS],highestId,generation,terminalRule:'Reaction0 at actual burnout; density fades only during final.4s of3.2s world-clock tail; no loop'};
  }
  return {update,reset};
}
