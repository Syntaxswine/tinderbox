import fs from 'node:fs';
import {createSimulation, SCENARIOS} from '../src/simulation/index.js';
if (process.argv.includes('--row-ignition')) {
  const advance = (sim, seconds) => { for (let i=0;i<Math.round(seconds*60);i++)sim.advance(1/60);return sim.snapshot(); };
  const traces = [];
  for (const material of ['gas','grass','wood']) for (const powder of [false,true]) {
    const sim=createSimulation({scenario:{width:12,height:4,player:{x:10.5,y:3.25},obstacles:[],actors:[],
      patches:material==='gas'?[]:[{x:0,y:0,width:12,depth:4,material}],
      fuelLines:material==='gas'?[{from:{x:1.25,y:1.25},to:{x:9.25,y:1.25},litresPerMetre:.08}]:[],
      ignitions:[{x:1.25,y:1.25,radius:.01,heat:4}]},config:{fire:{damagePerSecond:0}}});
    try {
      const initialFuel=sim.snapshot().cells.reduce((sum,c)=>sum+c.surfaceFuel+c.depositedFuel,0);
      if(powder)sim.dispatch({type:'drug',drug:'powder'});
      let sourceIgnitionWorld=null,sourceSpentWorld=null,arrivalWorld=null,arrivalActive=null,snapshot;
      for(let i=0;i<2400;i++){
        snapshot=sim.advance(1/60);const source=snapshot.cells.find(c=>c.x===1.25&&c.y===1.25),target=snapshot.cells.find(c=>c.x===5.25&&c.y===1.25);
        if(source.phase==='burning'&&sourceIgnitionWorld===null)sourceIgnitionWorld=snapshot.clocks.world;
        if(source.phase==='spent'&&sourceSpentWorld===null)sourceSpentWorld=snapshot.clocks.world;
        if(target.phase==='burning'&&arrivalWorld===null){arrivalWorld=snapshot.clocks.world;arrivalActive=snapshot.clocks.active;}
        if(sourceSpentWorld!==null&&arrivalWorld!==null)break;
      }
      if(arrivalWorld===null||sourceSpentWorld===null)throw Error('Material trace did not finish: '+material);
      const remainingFuel=snapshot.cells.reduce((sum,c)=>sum+c.surfaceFuel+c.depositedFuel,0);
      const burnedFuel=snapshot.diagnostics.fuel.burnedSurfaceFuel+snapshot.diagnostics.fuel.burnedDepositedFuel;
      if(Math.abs(initialFuel-remainingFuel-burnedFuel)>1e-7)throw Error('Trace fuel accounting failed');
      traces.push({material,powder,distanceMetres:4,sourceIgnitionWorld,sourceSpentWorld,sourceBurnSeconds:sourceSpentWorld-sourceIgnitionWorld,
        arrivalWorld,arrivalActive,initialFuel,remainingFuel,burnedFuel});
    } finally {sim.dispose();}
  }
  const normal=traces.filter(trace=>!trace.powder);
  if(!(normal[0].arrivalWorld<normal[1].arrivalWorld&&normal[1].arrivalWorld<normal[2].arrivalWorld&&normal[1].sourceBurnSeconds<normal[2].sourceBurnSeconds))throw Error('Material ordering failed');
  const matches=[];
  for(const fireCellSize of [.5,.25]){
    const sim=createSimulation({scenario:{width:8,height:6,fireCellSize,player:{x:2.25,y:2.25,tool:'matches'},obstacles:[],actors:[],patches:[{x:0,y:0,width:8,depth:6,material:'grass'}]},config:{fire:{damagePerSecond:0}}});
    try{sim.dispatch({type:'aim',x:3.05,y:2.25});sim.dispatch({type:'primary',pressed:true});const s=sim.advance(1/60),event=s.events.find(e=>e.type==='tool-use');
      const outside=s.cells.filter(c=>c.heat>0&&(c.x<event.tile.x||c.x>=event.tile.x+1||c.y<event.tile.y||c.y>=event.tile.y+1));
      if(outside.length||event.heatedCells!==1/fireCellSize**2)throw Error('Match tile fixture failed');
      matches.push({fireCellSize,event,stock:s.player.inventory.matches,adjacentDirectHeatCells:outside.length});
    }finally{sim.dispose();}
  }
  const torchSim=createSimulation({scenario:{width:12,height:8,player:{x:2.25,y:2.25,tool:'torch'},obstacles:[],actors:[]},config:{input:{cameraRelative:false}}});
  const torch=[];
  const sample=name=>{const s=torchSim.snapshot();torch.push({name,torch:s.player.torch,tool:s.player.tool,clocks:s.clocks,stock:s.player.inventory.torchFuel,matchStock:s.player.inventory.matches,directHeat:s.cells.some(c=>c.heat>0)});};
  try{
    sample('initial');torchSim.dispatch({type:'primary',pressed:true});torchSim.advance(1/60);sample('lit');
    torchSim.dispatch({type:'move',x:1,y:0});advance(torchSim,.5);sample('moving');
    torchSim.dispatch({type:'move',x:0,y:0});torchSim.dispatch({type:'select-tool',tool:'matches'});advance(torchSim,.5);sample('holstered');
    torchSim.dispatch({type:'drug',drug:'powder'});advance(torchSim,1);sample('powder');
    torchSim.dispatch({type:'pause',paused:true});torchSim.advance(1/60);sample('pause-start');advance(torchSim,.5);sample('pause-end');
  }finally{torchSim.dispose();}
  const row=createSimulation({scenario:'neighborhood'});let world;try{world=row.snapshot().world;}finally{row.dispose();}
  const report={task:'TB-018',kind:'Authoritative simulation fixtures; no art/UI semantic acceptance or WebGL',prototypeRates:true,materialTraces:traces,matches,torch,
    row:{width:world.width,height:world.height,buildings:world.buildings.map(({id,prefabId,x,y,quarterTurns,partyWalls,colliderIds})=>({id,prefabId,x,y,quarterTurns,partyWalls,colliderIds}))},
    artAcceptance:'pending exact TB-019 candidate',uiAcceptance:'pending exact TB-020 candidate',browserAcceptance:'pending known disabled-WebGL gate',passed:true};
  fs.mkdirSync('docs/engineering/row-ignition',{recursive:true});fs.writeFileSync('docs/engineering/row-ignition/fixtures.json',JSON.stringify(report,null,2)+'\n');
  console.log('Wrote six held-out material traces, match tile/torch timelines and authoritative row metadata; no renderer or UI acceptance claimed.');
} else {
const simulation = createSimulation({scenario: {...SCENARIOS.tiny,
  fuelLines: [{from: {x: 0.25, y: 2.25}, to: {x: 2.75, y: 2.25}, litresPerMetre: 0.08}],
  ignitions: [{x: 0.25, y: 2.25, radius: 0.05, heat: 2}]}});
simulation.dispatch({type: 'select-tool', tool: 'jerry-can'}); simulation.dispatch({type: 'primary', pressed: true});
simulation.dispatch({type: 'primary', pressed: false}); simulation.dispatch({type: 'move', x: 1, y: 0});
const snapshot = simulation.advance(0.1);
fs.writeFileSync('workbenches/simulation/example-snapshot.json', JSON.stringify(snapshot, null, 2) + '\n');
fs.writeFileSync('workbenches/simulation/fixtures.json', JSON.stringify(SCENARIOS, null, 2) + '\n');
simulation.dispose(); console.log('Wrote complete v1 sample and scenario definitions.');
}
