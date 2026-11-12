// Adapted from the frozen second fire-travel trial; see upstream/ and intake.
// Deterministic fixed-step experiment. All coefficients are prototype tuning.
import {compileScene,STEP} from './scene.js';
import {add,sub,mul,dot,length,unit,centre,bounds,EPS} from './geometry.js';

export const RULES=Object.freeze({step:STEP,maxHeat:5,loss:.18,up:3,upDiagonal:2,down:.04,downDiagonal:.06,falloff:1.5,glassBreaks:1.6,burstAt:1.4,emberShare:.15,matchEnergy:1.05,localShare:.72,radiantShare:.16,retainShare:.12,radiantRange:8,radiantCells:24,raysPerTick:48,radiantMaxAge:1,maxStepsPerAdvance:240});
const clamp=(v,a=0,b=1)=>Math.max(a,Math.min(b,v));
export const ambientWind=(_x,_y,_z,out=[0,0,0])=>(out[0]=1.5,out[1]=0,out[2]=0,out);
export const calmWind=(_x,_y,_z,out=[0,0,0])=>(out[0]=out[1]=out[2]=0,out);
export function createTrial(data,{rules:overrides={},profiles={},wind=ambientWind,windMetadata={kind:'ambient-control',speed:1.5,direction:[1,0,0],obstacleResolved:false}}={}) {
  const scene=compileScene(data,{profiles}),r={...RULES,...overrides},dt=r.step,{cells,fuels,items,index,cellAt}=scene;
  let tick=0,revision=0,fullNext=true,eventSequence=0,commandSequence=0,closed=false;const coolingFactor=1-Math.exp(-r.loss*dt);
  const commands=[],commandLog=[],events=[],dirty=new Set(index.surfaces.keys()),itemDirty=new Set(items.keys()),falls=new Map(),active=new Set(),radCache=new Map(),rayQueue=[],pendingHeat=new Map();
  const ledger={initial:scene.initialFuel,added:0,burned:0,escaped:0},heat={generated:0,input:0,ambient:0,blocked:0,cap:0,escaped:0};
  const stats={ticks:0,cellVisits:0,burnVisits:0,linkBuilds:0,rayBuilds:0,rayTests:0,invalidations:0,ignitions:0,failures:0,landings:0,peakActive:0,maxBurnsPerFuelPerTick:0};
  const itemFuels=new Map([...items.keys()].map(id=>[id,[...fuels.values()].filter(f=>f.itemId===id)]));
  const emit=(type,fields={})=>{const event={id:++eventSequence,tick,time:tick*dt,type,...fields};events.push(event);return event;};
  function deposit(c,energy) {if(energy<=0)return;pendingHeat.set(c,(pendingHeat.get(c)||0)+energy);active.add(c);}
  function takeStored(c,energy) {const take=Math.min(c.heat*c.capacity,energy);c.heat-=take/c.capacity;return take;}
  function settle() {for(const [c,e]of pendingHeat){const old=c.heat*c.capacity,next=Math.min(r.maxHeat*c.capacity,old+e);heat.cap+=old+e-next;c.heat=next/c.capacity;active.add(c);}pendingHeat.clear();}
  const centreCell=p=>scene.cells.get(scene.key(scene.coords(p)))||cellAt(p);
  function localLinks(c) {
    if(c.links)return c.links;
    stats.linkBuilds++;const links=[];
    for(let z=-1;z<=1;z++)for(let y=-1;y<=1;y++)for(let x=-1;x<=1;x++) {
      if(!x&&!y&&!z)continue;
      const target=cells.get(scene.key(c.c.map((v,i)=>v+[x,y,z][i])));if(!target)continue;
      // Distance is physical metres relative to .5m, not anisotropic indices.
      const delta=sub(target.position,c.position),distance=length(delta),direction=y>0?(x||z?r.upDiagonal:r.up):y<0?(x||z?r.downDiagonal:r.down):1;
      const trace=index.trace(c.position,target.position),link={target,delta,distance,weight:direction/(distance/.5)**r.falloff,hits:trace.hits,transmission:trace.transmission,ux:delta[0]/distance,uy:delta[1]/distance,uz:delta[2]/distance};index.watchPath(c.position,target.position,()=>{if(c.links){c.links=null;stats.invalidations++;}});index.watch(trace.hits.map(h=>h.surface.id),()=>{link.transmission=trace.hits.reduce((v,h)=>v*index.pass(h.surface),1);stats.invalidations++;});links.push(link);
    }
    links.level=links.filter(l=>Math.abs(l.delta[1])<EPS);links.levelTotal=links.level.reduce((n,l)=>n+l.weight,0);return c.links=links;
  }
  // Fixed-size spatially distributed target set per source cell. Each receiver
  // represents its actual exposed fuel area. Geometry links are lazy/cached;
  // there is no half-second whole-world source x receiver sweep.
  const initialCombustibleArea=[...fuels.values()].reduce((v,f)=>v+(f.area||0),0),targetBins=new Map();
  for(const c of cells.values())if(c.fuels.length){const b=c.position.map(v=>Math.floor(v/2)).join(',');if(!targetBins.has(b))targetBins.set(b,[]);targetBins.get(b).push(c);}
  const targetRepresentatives=[...targetBins.values()].map(list=>list.sort((a,b)=>a.id.localeCompare(b.id))[0]);
  function radiantLinks(c) {
    const cached=radCache.get(c.id);if(cached)return cached;
    const list=targetRepresentatives.map(target=>({target,d:sub(target.position,c.position)})).map(v=>({...v,distance:length(v.d)})).filter(v=>v.distance>.85&&v.distance<=r.radiantRange).sort((a,b)=>a.distance-b.distance||a.target.id.localeCompare(b.target.id));
    // Spread work across near/far geometry, with a hard, declared link count.
    const chosen=list.length<=r.radiantCells?list:Array.from({length:r.radiantCells},(_,i)=>list[Math.floor(i*list.length/r.radiantCells)]);
    const record={cell:c,entries:chosen,cursor:0,links:[],energy:0,firstEnergyTick:tick,enqueuedTick:tick,complete:!chosen.length,scale:1};radCache.set(c.id,record);if(!record.complete)rayQueue.push(record);return record;
  }
  function emitRadiation(record) {
    const energy=record.energy;record.energy=0;let assigned=0;
    for(const l of record.links){const share=energy*l.weight*record.scale,pass=l.transmission;assigned+=share;deposit(l.target,share*pass);heat.blocked+=share*(1-pass);}heat.escaped+=energy-assigned;
  }
  function buildRays() {
    for(const record of rayQueue)if(record.energy>0){const lost=record.energy*coolingFactor;record.energy-=lost;heat.ambient+=lost;if((tick-record.firstEnergyTick)*dt>r.radiantMaxAge){heat.escaped+=record.energy;record.energy=0;record.firstEnergyTick=tick;}}
    let allowance=r.raysPerTick;
    while(allowance>0&&rayQueue.length) {
      const record=rayQueue[0],{target,d,distance}=record.entries[record.cursor++],normal=unit(d),area=target.fuels.reduce((v,f)=>v+f.area/Math.max(1,f.cells.length),0),incidence=Math.max(.1,...target.fuels.map(f=>Math.abs(dot(f.normal||[0,1,0],normal))));
      const trace=index.trace(record.cell.position,target.position);stats.rayBuilds++;stats.rayTests+=trace.hits.length;
      const link={target,weight:area*incidence/(4*Math.PI*Math.max(.25,distance*distance)),hits:trace.hits,transmission:trace.transmission};record.links.push(link);index.watch(trace.hits.map(h=>h.surface.id),()=>{link.transmission=trace.hits.reduce((v,h)=>v*index.pass(h.surface),1);stats.invalidations++;});allowance--;
      index.watchPath(record.cell.position,target.position,()=>{if(record.complete){record.complete=false;record.cursor=0;record.links=[];record.enqueuedTick=tick;rayQueue.push(record);stats.invalidations++;}});
      if(record.cursor===record.entries.length){record.complete=true;record.scale=1/Math.max(1,record.links.reduce((n,l)=>n+l.weight,0));rayQueue.shift();emitRadiation(record);}
    }
  }
  function transport(c,energy) {
    const w=wind(...c.position,[0,0,0]);
    const links=localLinks(c);if(links.wx!==w[0]||links.wy!==w[1]||links.wz!==w[2]){links.wx=w[0];links.wy=w[1];links.wz=w[2];links.total=0;for(const l of links){l.windWeight=l.weight*Math.max(.1,1+.38*(l.ux*w[0]+l.uy*w[1]+l.uz*w[2]));links.total+=l.windWeight;}}const total=links.total;
    let blockedUp=0;
    for(let i=0;i<links.length;i++) {
      const l=links[i],share=total?energy*r.localShare*l.windWeight/total:0,accepted=share*l.transmission;
      deposit(l.target,accepted);const blocked=share-accepted;
      if(l.delta[1]>0)blockedUp+=blocked;else heat.blocked+=blocked;
    }
    if(!total)heat.escaped+=energy*r.localShare;
    // Redirect blocked buoyant flow at the ceiling exactly once. It remains
    // part of the same fuel-derived budget and is attenuated at side walls.
    const level=links.level,sum=links.levelTotal;
    for(const l of level){const share=sum?blockedUp*l.weight/sum:0,pass=l.transmission;deposit(l.target,share*pass);heat.blocked+=share*(1-pass);}if(!sum)heat.blocked+=blockedUp;
    const rays=radiantLinks(c);if(!rays.energy)rays.firstEnergyTick=tick;rays.energy+=energy*r.radiantShare;if(rays.complete)emitRadiation(rays);
    deposit(c,energy*r.retainShare);
  }
  function consume(f,amount) {const value=Math.min(f.amount,amount);f.amount-=value;ledger.burned+=value;const energy=value*scene.profile[f.cls].energy;heat.generated+=energy;return energy;}
  function changeBoundary(b,patch) {index.change(b.id,patch);dirty.add(b.id);}
  function supportedPoint(position) {
    const hit=index.supportAt(position[0],position[2],position[1]+.05,scene.groundY-.1);
    if(!hit)return null;return {surface:hit.surface,position:add([position[0],position[1]+.05,position[2]],mul([0,scene.groundY-.1-position[1]-.05,0],hit.t))};
  }
  function attachFuel(f,c) {for(const old of f.cells||[])old.fuels=old.fuels.filter(value=>value!==f);f.cells=[c];if(!c.fuels.includes(f))c.fuels.push(f);}
  function beginFall(id,list,position,{itemId=null,cause='support-failure',velocity=[0,0,0]}={}) {
    if(falls.has(id))return;
    const fall={id,itemId,fuelIds:list.map(f=>f.id),position:[...position],previous:[...position],velocity:[...velocity],offsets:list.map(f=>sub(f.position,position)),quaternion:[0,0,0,1],heldHeat:0};
    for(const f of list){f.falling=true;fall.heldHeat+=takeStored(f.cells[0],Math.min(.2,f.cells[0].heat*f.cells[0].capacity));}
    falls.set(id,fall);if(itemId){const item=items.get(itemId);item.falling=true;itemDirty.add(itemId);}emit('fall',{fallId:id,itemId,position:[...position],fuelIds:fall.fuelIds,cause});
  }
  function detachRemainder(f,b) {
    const amount=f.amount;f.amount=0;f.spentAt=tick*dt;
    if(amount>EPS) {
      const id=`${f.id}:embers`,ember={...f,id,cls:'embers',amount,initial:amount,area:f.area,lit:true,litAt:tick*dt,spentAt:null,boundaryId:null,sourceSurfaceId:f.sourceSurfaceId,cells:[],falling:true,lastBurnTick:-1};
      fuels.set(id,ember);attachFuel(ember,centreCell(f.position));beginFall(id,[ember],f.position,{cause:b.id});
    }
  }
  function fail(b,f) {
    if(!b.intact)return;
    changeBoundary(b,{intact:false,openFraction:1});stats.failures++;emit(['floor','roof','wall'].includes(b.kind)?'support-failure':'boundary-retirement',{boundaryId:b.id,sourceSurfaceId:b.sourceSurfaceId,kind:b.kind,position:b.position,ignitionTime:f.litAt,materialAge:tick*dt-f.litAt,nominalBurnSeconds:scene.profile[f.cls].seconds,remainingShare:r.emberShare});detachRemainder(f,b);
  }
  function burst(f) {
    f.store.reacted=true;const amount=f.amount,from=f.position,candidates=[];
    for(const [dx,dz]of [[0,0],[.5,0],[-.5,0],[0,.5],[0,-.5],[.5,.5],[-.5,.5],[.5,-.5],[-.5,-.5]]) {
      const p=[from[0]+dx,from[1],from[2]+dz],support=supportedPoint(p);
      if(!support||Math.abs(support.position[1]-from[1])>.8)continue;
      const start=[from[0],support.position[1]+.08,from[2]],end=[p[0],support.position[1]+.08,p[2]];
      if(index.trace(start,end,{ignore:[support.surface.id]}).transmission<.99)continue;candidates.push({...support,position:end});
    }
    if(!candidates.length){f.store.blocked=true;emit('spill-blocked',{fuelId:f.id,position:from});return;}
    // The pulse burns a declared fraction of the same finite oil. No extra
    // energy and no rewrite of the immutable introduction ledger.
    const pulse=consume(f,amount*.04),rest=f.amount;f.amount=0;f.spentAt=tick*dt;
    for(let i=0;i<candidates.length;i++) {
      const p=candidates[i].position,c=cellAt(p),id=`${f.id}:spill:${i}`,split={...f,id,store:null,itemId:null,cls:'oil',initial:rest/candidates.length,amount:rest/candidates.length,position:p,area:.25,normal:[0,1,0],cells:[],lit:false,char:0,spentAt:null,falling:false,lastBurnTick:-1};
      fuels.set(id,split);attachFuel(split,c);deposit(c,pulse/candidates.length);
    }
    emit('oil-release',{fuelId:f.id,position:from,threshold:r.burstAt,amount,spentForPulse:amount*.04,redistributed:rest,targets:candidates.length});
  }
  function applyCommand(command) {
    if(command.type==='opening') {
      const matches=[...index.surfaces.values()].filter(b=>b.openingId===command.id||b.id===command.id||b.sourceSurfaceId===command.id);
      if(!matches.length)return emit('blocked',{reason:'Unknown opening',command});
      for(const b of matches){if(b.actualDoorPose){scene.poseDoor(b,command.open?1:0);dirty.add(b.id);}else changeBoundary(b,{openFraction:command.open?1:0});}emit('opening',{openingId:command.id,open:command.open});return;
    }
    if(['match','flame','heat'].includes(command.type)) {
      const target=command.position;if(!Array.isArray(target)||!target.every(Number.isFinite))throw Error('Finite target required');
      let position=target;
      if(command.from) {
        const hit=index.crossings(command.from,target).find(h=>index.pass(h.surface)<.99);
        if(hit){position=add(command.from,mul(sub(target,command.from),Math.max(0,hit.t-.001)));emit('impact',{tool:command.type,boundaryId:hit.surface.id,position});}
        if(command.type==='match'&&length(sub(position,command.from))>1.5)return emit('blocked',{reason:'Match is out of reach',position});
      }
      const c=centreCell(position),energy=command.energy??r.matchEnergy;if(!Number.isFinite(energy)||energy<0)throw Error('Heat input must be finite and nonnegative');heat.input+=energy;deposit(c,energy);emit('heat-input',{tool:command.type,cellId:c.id,position,energy});return;
    }
    if(command.type==='lantern') {
      const amount=.5,id=`lantern:${command.sequence}`,p=command.from,c=cellAt(p),f={id,cls:'oil',initial:amount,amount,area:.2,position:[...p],cells:[c],lit:true,litAt:tick*dt,char:0,falling:true,lastBurnTick:-1,normal:[0,1,0],store:{kind:'lantern',reacted:false}};
      fuels.set(id,f);c.fuels.push(f);ledger.added+=amount;beginFall(id,[f],p,{cause:'throw',velocity:command.velocity||[3,3,0]});return;
    }
    throw Error(`Unknown trial command ${command.type}`);
  }
  function moveFalls() {
    for(const fall of [...falls.values()]) {
      fall.previous=[...fall.position];fall.velocity[1]-=9.81*dt;const next=add(fall.position,mul(fall.velocity,dt));
      const hit=index.crossings(fall.position,next,{includeEndpoints:true}).find(h=>h.surface.intact&&index.pass(h.surface)<.99&&h.t>EPS);
      let landing=false;
      if(hit) {
        const p=add(fall.position,mul(sub(next,fall.position),hit.t));
        if(hit.surface.kind==='window'||hit.surface.material==='glass') {changeBoundary(hit.surface,{intact:false,openFraction:1});emit('window-break',{boundaryId:hit.surface.id,position:p,cause:fall.id});}
        else if(hit.surface.supports&&fall.velocity[1]<0){next.splice(0,3,...p);landing=true;}
        else {next.splice(0,3,...add(p,mul(unit(sub(fall.position,next)),.005)));fall.velocity[0]=fall.velocity[2]=0;emit('impact',{boundaryId:hit.surface.id,position:p,cause:fall.id});}
      }
      fall.position=next;
      for(let i=0;i<fall.fuelIds.length;i++){const f=fuels.get(fall.fuelIds[i]);f.position=add(next,fall.offsets[i]);attachFuel(f,cellAt(f.position));}
      if(fall.itemId){const item=items.get(fall.itemId);item.position=[...next];itemDirty.add(item.id);}
      if(landing) {
        deposit(cellAt(add(next,[0,.02,0])),fall.heldHeat);fall.heldHeat=0;
        for(const id of fall.fuelIds){const f=fuels.get(id);f.falling=false;if(f.store?.kind==='lantern')burst(f);}
        if(fall.itemId)items.get(fall.itemId).falling=false;falls.delete(fall.id);stats.landings++;emit('landing',{fallId:fall.id,itemId:fall.itemId,position:next,fuelIds:fall.fuelIds});
      } else if(next[1]<scene.groundY-2) {
        for(const id of fall.fuelIds){const f=fuels.get(id);ledger.escaped+=f.amount;f.amount=0;f.falling=false;}heat.escaped+=fall.heldHeat;falls.delete(fall.id);emit('escaped',{fallId:fall.id});
      }
    }
  }
  function stepOnce() {
    tick++;stats.ticks++;
    for(const command of commands.filter(c=>c.tick===tick))applyCommand(command);
    settle();moveFalls();settle();
    const burning=[];
    // Global unique fuel registry plus staged structural changes means one
    // object cannot burn again when it moves into a later-visited cell.
    for(const f of fuels.values())if(f.amount>EPS) {
      stats.burnVisits++;
      if(f.lit){if(f.lastBurnTick===tick)throw Error(`Double burn ${f.id}`);f.lastBurnTick=tick;stats.maxBurnsPerFuelPerTick=1;burning.push(f);}
    }
    const outputs=new Map();
    for(const f of burning) {
      const energy=consume(f,f.initial*dt/scene.profile[f.cls].seconds),share=energy/f.cells.length;
      for(const c of f.cells)outputs.set(c,(outputs.get(c)||0)+share);
      if(f.boundaryId)dirty.add(f.boundaryId);if(f.itemId)itemDirty.add(f.itemId);
    }
    for(const [c,e]of outputs)transport(c,e);buildRays();
    settle();
    for(const f of [...fuels.values()])if(f.amount>EPS&&!f.lit) {
      const p=scene.profile[f.cls],exposure=Math.max(...f.cells.map(c=>c.heat));
      if(f.store?.kind==='oil'||f.store?.kind==='oil-store') {if(!f.store.reacted&&exposure>=r.burstAt)burst(f);continue;}
      if(exposure>=p.threshold){f.char+=dt*exposure/p.threshold;if(f.char+EPS>=p.delay){f.lit=true;f.litAt=tick*dt;stats.ignitions++;emit('ignition',{fuelId:f.id,sourceSurfaceId:f.sourceSurfaceId,itemId:f.itemId,position:f.position,cls:f.cls});}}else f.char=Math.max(0,f.char-dt*.2);
    }
    settle();
    for(const c of active) {
      stats.cellVisits++;const lost=c.heat*c.capacity*coolingFactor;c.heat-=lost/c.capacity;heat.ambient+=lost;
      if(c.heat<1e-8&&!c.fuels.some(f=>f.lit&&f.amount>EPS)){heat.ambient+=c.heat*c.capacity;c.heat=0;active.delete(c);}
    }
    // Heat settles before opening, support, spill and ignition changes are
    // exposed to the next step. No house/floor timers choose failure.
    for(const b of index.surfaces.values())if(b.intact) {
      const f=fuels.get(b.fuelId);
      if(b.kind==='window'&&Math.max(0,...(b.heatCells||[]).map(c=>c.heat))>=r.glassBreaks){changeBoundary(b,{intact:false,openFraction:1});emit('window-break',{boundaryId:b.id,position:b.position,cause:'heat'});}
      if(f&&f.amount<=f.initial*r.emberShare+EPS&&f.lit)fail(b,f);
    }
    for(const item of items.values())if(!item.falling&&item.intact) {
      const list=(itemFuels.get(item.id)||[]).filter(f=>f.amount>EPS&&!f.falling);if(!list.length)continue;
      const baseY=item.position[1]; // exported item origin is its support anchor
      const p=[item.position[0],baseY+.03,item.position[2]],support=index.supportAt(p[0],p[2],p[1],p[1]-.15);
      if(!support)beginFall(item.id,list,item.position,{itemId:item.id});
    }
    stats.peakActive=Math.max(stats.peakActive,active.size);revision++;
  }
  function metrics() {
    let remaining=0,airborne=0,area=0,burningArea=0,burningCount=0;
    for(const f of fuels.values()){if(f.falling)airborne+=f.amount;else remaining+=f.amount;area+=f.area||0;if(f.lit&&f.amount>EPS){burningCount++;burningArea+=f.area||0;}}
    const radiationInTransit=[...radCache.values()].reduce((v,c)=>v+c.energy,0),stored=[...cells.values()].reduce((v,c)=>v+c.heat*c.capacity,0)+[...falls.values()].reduce((v,f)=>v+f.heldHeat,0)+radiationInTransit,fuelError=ledger.initial+ledger.added-ledger.burned-ledger.escaped-airborne-remaining,heatError=heat.generated+heat.input-heat.ambient-heat.blocked-heat.cap-heat.escaped-stored;
    return {tick,worldTime:tick*dt,fuel:{...ledger,remaining,airborne,error:fuelError},heat:{...heat,stored,radiationInTransit,error:heatError,relativeError:heatError/(heat.generated+heat.input||1)},burningCount,burningArea,combustibleArea:initialCombustibleArea,burningAreaFraction:initialCombustibleArea?burningArea/initialCombustibleArea:0,burnedFraction:ledger.burned/(ledger.initial+ledger.added||1),activeCells:active.size,fallingCount:falls.size,queuedRadiationSources:rayQueue.length,queuedRays:rayQueue.reduce((v,q)=>v+q.entries.length-q.cursor,0),oldestRadiationQueryDelay:rayQueue.length?(tick-rayQueue[0].enqueuedTick)*dt:0,oldestRadiationEnergyAge:Math.max(0,...rayQueue.filter(q=>q.energy>0).map(q=>(tick-q.firstEnergyTick)*dt)),stats:{...stats}};
  }
  function boundaryFrame(b) {const f=fuels.get(b.fuelId);return {id:b.id,sourceSurfaceId:b.sourceSurfaceId,kind:b.kind,triangles:b.triangles,intact:b.intact,openFraction:b.openFraction,charFraction:f?clamp(f.char/scene.profile[f.cls].delay):0,heatFraction:f?clamp(Math.max(...f.cells.map(c=>c.heat))/r.maxHeat):0,fuelFraction:f?f.amount/f.initial:1};}
  function fireSamples() {return [...fuels.values()].filter(f=>f.lit&&f.amount>EPS).map(f=>({id:f.id,buildingId:data.buildingId||data.prefabId,part:f.boundaryId?index.surfaces.get(f.boundaryId).kind:'contents',x:f.position[0],y:f.position[1],z:f.position[2],nx:f.normal?.[0]||0,ny:f.normal?.[1]||0,nz:f.normal?.[2]||0,area:f.area,flame:clamp(f.amount/f.initial*2),smoke:.5,ignitionTime:f.litAt,sourceSurfaceId:f.sourceSurfaceId,itemId:f.itemId,...(f.boundaryId&&index.surfaces.get(f.boundaryId).kind==='floor'?{floorFootprint:index.surfaces.get(f.boundaryId).triangles,floorRadius:.36}:{})}));}
  let eventCursor=0;
  function frame({full=false}={}) {
    full||=fullNext;fullNext=false;
    const records=full?[...index.surfaces.values()]:[...dirty].map(id=>index.surfaces.get(id)),b=records.map(boundaryFrame),itemRecords=(full?[...items.values()]:[...itemDirty].map(id=>items.get(id))).map(item=>{const list=[...fuels.values()].filter(f=>f.itemId===item.id);return {...item,remainingFraction:list.reduce((v,f)=>v+f.amount,0)/(list.reduce((v,f)=>v+f.initial,0)||1),charFraction:Math.max(0,...list.map(f=>clamp(f.char/(scene.profile[f.cls].delay||1))))};});
    const result={version:1,revision,tick,worldTime:tick*dt,full,boundaries:b,supports:b.filter(v=>index.surfaces.get(v.id).supports),items:itemRecords,falls:[...falls.values()].map(f=>({...f,flame:f.fuelIds.some(id=>fuels.get(id).lit)?1:0,smoke:.4,ignitionTime:Math.min(...f.fuelIds.map(id=>fuels.get(id).litAt??tick*dt))})),events:events.slice(full?0:eventCursor),metrics:metrics(),fireSamples:fireSamples(),tombstones:[],occupancy:[...active].map(c=>({id:c.id,bounds:{min:c.c.map((v,i)=>scene.origin[i]+v*scene.pitch[i]),max:c.c.map((v,i)=>scene.origin[i]+(v+1)*scene.pitch[i])},heatFraction:c.heat/r.maxHeat,occupied:c.fuels.length>0}))};
    dirty.clear();itemDirty.clear();eventCursor=events.length;return result;
  }
  function command(input) {if(closed)throw Error('Trial disposed');const value={...structuredClone(input),sequence:++commandSequence,tick:input.tick??tick+1};if(!Number.isInteger(value.tick)||value.tick<=tick)throw Error('Commands must target a future integer tick');commands.push(value);commands.sort((a,b)=>a.tick-b.tick||a.sequence-b.sequence);commandLog.push(value);return value;}
  return {scene,rules:r,events,stats,wind,windMetadata,command,step(count=1){if(closed)throw Error('Trial disposed');if(!Number.isInteger(count)||count<0)throw Error('Whole nonnegative steps required');for(let i=0;i<count;i++)stepOnce();return tick;},frame,metrics,
    snapshot(){return {version:1,tick,worldTime:tick*dt,cells:[...cells.values()].filter(c=>c.heat).map(c=>({id:c.id,heat:c.heat})),fuels:[...fuels.values()].map(({cells,...f})=>({...f,cellIds:cells.map(c=>c.id)})),boundaries:[...index.surfaces.values()].map(boundaryFrame),falls:[...falls.values()],events:[...events],metrics:metrics()};},
    replay(){return {version:1,prefabId:data.prefabId,sourceHashes:data.sourceHashes,rules:r,profiles:scene.profile,wind:windMetadata,commands:structuredClone(commandLog),endTick:tick};},
    dispose(){closed=true;commands.length=0;radCache.clear();pendingHeat.clear();},get tick(){return tick;},get worldTime(){return tick*dt;}};
}

export function createClock(trial,{speed=1,maxSteps=RULES.maxStepsPerAdvance}={}) {
  let accumulator=0,paused=true,lastSteps=0;
  return {advance(realSeconds){if(!Number.isFinite(realSeconds)||realSeconds<0)throw Error('Invalid elapsed seconds');if(paused)return 0;accumulator+=realSeconds*speed;const steps=Math.min(maxSteps,Math.floor((accumulator+1e-10)/trial.rules.step));trial.step(steps);accumulator-=steps*trial.rules.step;lastSteps=steps;return steps;},
    drain(){let count=0;while(accumulator+1e-10>=trial.rules.step){const n=Math.min(maxSteps,Math.floor((accumulator+1e-10)/trial.rules.step));trial.step(n);accumulator-=n*trial.rules.step;count+=n;}return count;},
    setSpeed(value){if(!Number.isFinite(value)||value<=0||value>32)throw Error('Speed must be 0–32');speed=value;},setPaused(value){paused=!!value;},get paused(){return paused;},get accumulator(){return accumulator;},get speed(){return speed;},diagnostics:()=>({accumulator,lastSteps,speed,paused,droppedSeconds:0})};
}
