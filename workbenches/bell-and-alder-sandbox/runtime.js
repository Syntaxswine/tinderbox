import {createClosingRuntime} from '../bell-and-alder-closing/runtime.js';
const collections=['boundaries','supports','items','parts','falls','rubble','fireSamples','occupancy','events','tombstones'];
export function partitionSandboxFrame(frame,instanceId){
  if(frame.sandbox?.version!==1)throw Error('Sandbox ownership frame required');
  const out={...frame};for(const key of collections)out[key]=(frame[key]||[]).filter(r=>r.ownerInstanceId===instanceId);return out;
}
export function createSandboxRuntime(data,options={}){
  if(data.sandbox?.version!==1)throw Error('Compiled sandbox data required');
  const base=createClosingRuntime(data,options),instances=data.sandbox.instances.map(i=>i.id),yard=instances.find(id=>data.sandbox.instances.find(i=>i.id===id).kind==='yard'),owners=new Map();
  let generation=0,fuelCount=-1,accumulator=0;
  const named=id=>typeof id==='string'?instances.find(instance=>id.includes(instance+'::')):undefined;
  function at(position){
    if(!position)return yard;const hit=base.trial.scene.index.supportAt(position[0],position[2],position[1]+.05,data.groundY-1);
    return named(hit?.surface.sourceSurfaceId)||yard;
  }
  function refs(record){
    return [record.sourceSurfaceId,record.originalSourceSurfaceId,record.itemId,record.partId,record.fuelId,record.fallId,record.id,...(record.sourceSurfaceIds||[]),...(record.geometry?.sourceSurfaceIds||[]),...(record.fuelIds||[])];
  }
  function owner(record){
    for(const id of refs(record)){const found=owners.get(id)||named(id);if(found)return found;}
    return named(record.supportBoundaryId)||at(record.position||Number.isFinite(record.x)&&[record.x,record.y,record.z]);
  }
  function refresh(){
    if(generation!==base.generation){generation=base.generation;owners.clear();fuelCount=-1;accumulator=0;}
    const fuels=base.trial.scene.fuels;if(fuels.size===fuelCount)return;fuelCount=fuels.size;
    let commands;
    for(const f of fuels.values())if(!owners.has(f.id)){
      let instance=named(f.sourceSurfaceId)||named(f.itemId)||named(f.id);
      if(!instance&&f.id.startsWith('lantern:')){commands??=base.trial.replay().commands;const sequence=Number(f.id.split(':')[1]),command=commands.find(c=>c.sequence===sequence);instance=at(command?.from||f.position);}
      owners.set(f.id,instance||named(f.supportBoundaryId)||at(f.position));
    }
  }
  function interaction(value){if(!value)return value;const d=data.closingTime.doors.find(d=>d.id===value.id);return d?.label?{...value,label:(value.action==='close'?'Close ':'Open ')+d.label}:value;}
  function snapshot(options){const s=base.snapshot(options);s.player.interaction=interaction(s.player.interaction);s.sandbox={...structuredClone(data.sandbox),generation:base.generation};return s;}
  function frame(options){
    refresh();const f=base.frame(options);
    // Bind upserts before removals. Retain owner receipts until reset so a
    // vanished dynamic ID's tombstone always reaches its sole prior renderer.
    for(const key of ['boundaries','supports','items','parts','falls','rubble','fireSamples','occupancy','events'])f[key]=(f[key]||[]).map(record=>{const ownerInstanceId=owner(record);owners.set(record.id,ownerInstanceId);return {...record,ownerInstanceId,...(key==='fireSamples'?{buildingId:ownerInstanceId}:{})};});
    f.tombstones=(f.tombstones||[]).map(record=>({...record,ownerInstanceId:owners.get(record.id)||named(record.id)||yard}));
    f.sandbox={...structuredClone(data.sandbox),generation:base.generation,pickups:data.closingTime.pickups?.length?base.snapshot().pickups:[]};return f;
  }
  refresh();return {
    ...base,
    get trial(){return base.trial;},get actors(){return base.actors;},get player(){return base.player;},get resident(){return base.resident;},get officer(){return base.officer;},get paused(){return base.paused;},get tick(){return base.tick;},get generation(){return base.generation;},get worldTime(){return base.worldTime;},
    command(input){base.command(input);refresh();},
    step(count=1){if(!Number.isInteger(count)||count<0)throw Error('Whole nonnegative steps required');for(let i=0;i<count;i++){base.step();refresh();}return base.tick;},
    advance(seconds){if(!Number.isFinite(seconds)||seconds<0)throw Error('Finite elapsed time required');if(base.paused)return snapshot();accumulator+=seconds;let count=0;while(accumulator+1e-10>=1/30/base.clockScales().world&&count<240){const delta=1/30/base.clockScales().world;base.step();refresh();accumulator-=delta;count++;}return snapshot();},
    frame,snapshot,interaction:()=>interaction(base.interaction()),
    ownership:()=>({fuels:fuelCount,knownIds:owners.size,generation,instances:[...instances]}),
    replay:()=>({...base.replay(),sandbox:data.sandbox})
  };
}
