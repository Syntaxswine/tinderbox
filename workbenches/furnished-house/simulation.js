// Adapted from the frozen second fire-travel trial; see upstream/ and intake.
// Deterministic fixed-step experiment. All coefficients are prototype tuning.
import {compileScene,STEP} from './scene.js';
import {add,sub,mul,dot,cross,length,unit,centre,bounds,projectedHull,intersectFootprint,triangleArea,EPS} from './geometry.js';
import {createSupportGraph} from './support.js';

export const RULES=Object.freeze({step:STEP,maxHeat:5,loss:.18,up:3,upDiagonal:2,down:.04,downDiagonal:.06,falloff:1.5,glassBreaks:1.6,burstAt:1.4,emberShare:.15,matchEnergy:1.05,localShare:.72,radiantShare:.16,retainShare:.12,radiantRange:8,radiantCells:24,raysPerTick:48,radiantMaxAge:1,maxStepsPerAdvance:240});
const clamp=(v,a=0,b=1)=>Math.max(a,Math.min(b,v));
export const ambientWind=(_x,_y,_z,out=[0,0,0])=>(out[0]=1.5,out[1]=0,out[2]=0,out);
export const calmWind=(_x,_y,_z,out=[0,0,0])=>(out[0]=out[1]=out[2]=0,out);
export function createTrial(data,{rules:overrides={},profiles={},wind=ambientWind,windMetadata={kind:'ambient-control',speed:1.5,direction:[1,0,0],obstacleResolved:false},radiationSelection=null}={}) {
  const scene=compileScene(data,{profiles}),r={...RULES,...overrides},dt=r.step,{cells,fuels,items,parts,index,cellAt}=scene;
  data=scene.data;
  let tick=0,revision=0,fullNext=true,eventSequence=0,commandSequence=0,closed=false;const coolingFactor=1-Math.exp(-r.loss*dt);
  const commands=[],commandLog=[],events=[],dirty=new Set(index.surfaces.keys()),itemDirty=new Set(items.keys()),partDirty=new Set(parts.keys()),falls=new Map(),rubble=new Map(),tombstones=[],active=new Set(),radCache=new Map(),rayQueue=[],pendingHeat=new Map(),ventFlux=new Map();
  const ledger={initial:scene.initialFuel,added:0,burned:0,escaped:0},heat={generated:0,input:0,ambient:0,blocked:0,cap:0,escaped:0};
  const stats={ticks:0,cellVisits:0,burnVisits:0,linkBuilds:0,rayBuilds:0,rayTests:0,invalidations:0,ignitions:0,failures:0,landings:0,peakActive:0,maxBurnsPerFuelPerTick:0};
  const itemFuels=new Map([...items.keys()].map(id=>[id,[...fuels.values()].filter(f=>f.itemId===id)]));
  const supportBySource=new Map(),itemParts=new Map([...items.keys()].map(id=>[id,[...parts.values()].filter(p=>p.itemId===id)]));
  for(const b of index.surfaces.values()){if(!supportBySource.has(b.sourceSurfaceId))supportBySource.set(b.sourceSurfaceId,[]);supportBySource.get(b.sourceSurfaceId).push(b);}
  for(const item of items.values()) {
    const b=item.bounds||bounds((itemParts.get(item.id)||[]).flatMap(p=>[p.bounds.min,p.bounds.max])),declared=(item.supportSurfaceIds||[]).flatMap(id=>supportBySource.get(id)||[]),floorY=declared.length?Math.max(...declared.map(s=>s.position?.[1]??s.floorY)):data.levels?.find(l=>l.index===item.level&&(!item.instanceId||l.instanceId===item.instanceId))?.floorY??b.min[1];
    item.contactOffset=[(b.min[0]+b.max[0])/2-item.position[0],floorY-item.position[1],(b.min[2]+b.max[2])/2-item.position[2]];
    item.supportContactOffsets=item.supportContacts?.length?item.supportContacts.flatMap(c=>[centre(c.polygon),...c.polygon].map(p=>sub(p,item.position))):[[item.contactOffset[0],item.contactOffset[1],item.contactOffset[2]],...[b.min[0]+.01,b.max[0]-.01].flatMap(x=>[b.min[2]+.01,b.max[2]-.01].map(z=>[x-item.position[0],floorY-item.position[1],z-item.position[2]]))];
  }
  const supportGraph=createSupportGraph(scene);
  const emit=(type,fields={})=>{const event={id:++eventSequence,tick,time:tick*dt,type,...fields};events.push(event);return event;};
  function deposit(c,energy) {if(energy<=0)return;pendingHeat.set(c,(pendingHeat.get(c)||0)+energy);active.add(c);}
  function takeStored(c,energy) {const take=Math.min(c.heat*c.capacity,energy);c.heat-=take/c.capacity;return take;}
  function markThermal(c) {for(const f of c.fuels){if(f.boundaryId)dirty.add(f.boundaryId);if(f.itemId)itemDirty.add(f.itemId);}}
  function settle() {for(const [c,e]of pendingHeat){const old=c.heat*c.capacity,next=Math.min(r.maxHeat*c.capacity,old+e);heat.cap+=old+e-next;c.heat=next/c.capacity;active.add(c);if(Math.abs(next-old)>1e-8)markThermal(c);}pendingHeat.clear();}
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
    // Opt-in research hook replaces identities/order only. Live cells still
    // supply geometry, area, incidence and every traced/invalidation path.
    const entries=radiationSelection?radiationSelection.select({sourceId:c.id,position:[...c.position],range:r.radiantRange,count:r.radiantCells}).map(reference=>{const target=cells.get(reference.id);if(!target||target.position.some((v,i)=>v!==reference.position[i]))throw Error('Missing or displaced diagnostic radiation target '+reference.id);const d=sub(target.position,c.position);return {target,d,distance:length(d)};}):chosen;
    const record={cell:c,entries,cursor:0,links:[],energy:0,firstEnergyTick:tick,enqueuedTick:tick,complete:!entries.length,scale:1};radCache.set(c.id,record);if(!record.complete)rayQueue.push(record);return record;
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
      radiationSelection?.observeRay?.({tick,sourceId:record.cell.id,targetId:target.id,position:[...target.position],area,capacity:target.capacity,incidence,weight:link.weight,transmission:trace.transmission});
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
      deposit(l.target,accepted);if(accepted>0)for(const {surface:b}of l.hits)if(b.kind==='window'&&index.pass(b)>.99&&dot(l.delta,b.normal)>0){const old=ventFlux.get(b.id)||0;ventFlux.set(b.id,old+accepted);}const blocked=share-accepted;
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
  function consume(f,amount) {const value=Math.min(f.amount,amount);f.amount-=value;if(f.amount<=EPS&&f.spentAt===null)f.spentAt=tick*dt;ledger.burned+=value;const energy=value*scene.profile[f.cls].energy;heat.generated+=energy;return energy;}
  function changeBoundary(b,patch) {index.change(b.id,patch);dirty.add(b.id);}
  function breakWindow(b,position,cause) {for(const pane of index.surfaces.values())if(pane.sourceSurfaceId===b.sourceSurfaceId)changeBoundary(pane,{intact:false,openFraction:1});emit('window-break',{boundaryId:b.id,sourceSurfaceId:b.sourceSurfaceId,position,cause});}
  function supportedPoint(position) {
    const hit=index.supportAt(position[0],position[2],position[1]+.05,scene.groundY-.1);
    if(!hit)return null;return {surface:hit.surface,position:add([position[0],position[1]+.05,position[2]],mul([0,scene.groundY-.1-position[1]-.05,0],hit.t))};
  }
  function attachFuel(f,c) {for(const old of f.cells||[])old.fuels=old.fuels.filter(value=>value!==f);f.cells=[c];if(!c.fuels.includes(f))c.fuels.push(f);}
  function beginFall(id,list,position,{itemId=null,cause='support-failure',velocity=[0,0,0],geometry=null,footprint=null,rubbleKind=null}={}) {
    if(falls.has(id))return;
    let contacts=itemId?items.get(itemId).supportContactOffsets:[[0,0,0]];
    if(geometry){const points=geometry.solidTriangles.flat(),bottom=Math.min(...points.map(p=>p[1]));contacts=[...new Map(points.filter(p=>p[1]<bottom+1e-5).map(p=>[p.join(','),sub(p,position)])).values()];}
    const fall={id,itemId,fuelIds:list.map(f=>f.id),position:[...position],origin:[...position],previous:[...position],velocity:[...velocity],offsets:list.map(f=>sub(f.position,position)),contactOffsets:contacts,geometry,rubbleFootprint:footprint,rubbleKind,quaternion:[0,0,0,1],heldHeat:0};
    for(const f of list){if(f.rubbleId){const old=rubble.get(f.rubbleId);if(old){old.fuelIds=old.fuelIds.filter(value=>value!==f.id);if(!old.fuelIds.length){rubble.delete(old.id);tombstones.push({collection:'rubble',id:old.id});}}f.rubbleId=null;f.floorFootprint=null;}f.falling=true;f.loose=true;f.fallId=id;f.supportBoundaryId=null;fall.heldHeat+=takeStored(f.cells[0],Math.min(.2,f.cells[0].heat*f.cells[0].capacity));}
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
  function mechanicalFalls() {
    let unsupported=supportGraph.unsupported(),passes=0;
    while(unsupported.length&&passes++<=supportGraph.nodes.size) {
      const groups=new Map();
      for(const b of unsupported) {
        const f=fuels.get(b.fuelId);if(!f||f.amount<=EPS)continue;
        const p=b.position,key=[b.kind,Math.floor(p[0]+EPS),Math.floor((p[1]-.48)/2.12+EPS),Math.floor(p[2]+EPS)].join(':');
        if(!groups.has(key))groups.set(key,[]);groups.get(key).push({b,f});
      }
      for(const [key,members]of groups) {
        const triangles=members.flatMap(({b})=>b.triangles),solidTriangles=members.flatMap(({b})=>b.solidTriangles||b.triangles),position=centre(solidTriangles.flat()),id=`mechanical:${tick}:${key}`;
        for(const {b,f}of members){changeBoundary(b,{intact:false,openFraction:1});dirty.add(b.id);f.boundaryId=null;f.loose=true;f.burningCell=null;emit('mechanical-support-loss',{boundaryId:b.id,sourceSurfaceId:b.sourceSurfaceId,fuelId:f.id,remaining:f.amount,ignitionTime:f.litAt,materialAge:f.litAt===null?null:tick*dt-f.litAt,fallId:id});}
        beginFall(id,members.map(v=>v.f),position,{cause:'mechanical-support-loss',geometry:{triangles,solidTriangles,thickness:Math.max(...members.map(({b})=>b.thickness||0)),normal:members[0].b.normal,sourceSurfaceIds:members.map(({b})=>b.sourceSurfaceId),boundaryIds:members.map(({b})=>b.id)}});
      }
      unsupported=supportGraph.unsupported();
    }
  }
  function burst(f) {
    const amount=f.amount,from=f.position,releaseY=f.itemId?(items.get(f.itemId)?.position[1]??from[1]):from[1],candidates=[];
    for(const [dx,dz]of [[0,0],[.5,0],[-.5,0],[0,.5],[0,-.5],[.5,.5],[-.5,.5],[.5,-.5],[-.5,-.5]]) {
      const p=[from[0]+dx,releaseY+.08,from[2]+dz],support=supportedPoint(p);
      if(!support)continue;
      const start=[from[0],releaseY+.08,from[2]],end=[p[0],releaseY+.08,p[2]];
      if(index.trace(start,end,{ignore:[support.surface.id]}).transmission<.99)continue;candidates.push({...support,position:Math.abs(support.position[1]-releaseY)<.12?[p[0],support.position[1]+.02,p[2]]:end,fall:releaseY-support.position[1]>.12});
    }
    if(!candidates.length){if(!f.store.blocked)emit('spill-blocked',{fuelId:f.id,position:from});f.store.blocked=true;f.store.nextAttemptTick=tick+30;return;}
    f.store.reacted=true;f.store.blocked=false;
    // The pulse burns a declared fraction of the same finite oil. No extra
    // energy and no rewrite of the immutable introduction ledger.
    const pulse=consume(f,amount*.04),rest=f.amount;f.amount=0;f.spentAt=tick*dt;
    for(let i=0;i<candidates.length;i++) {
      const p=candidates[i].position,c=cellAt(p),id=`${f.id}:spill:${i}`,split={...f,id,store:null,itemId:null,cls:'oil',initial:rest/candidates.length,amount:rest/candidates.length,position:p,area:.25,normal:[0,1,0],cells:[],lit:false,char:0,spentAt:null,falling:false,spill:true,supportBoundaryId:candidates[i].fall?null:candidates[i].surface.id,lastBurnTick:-1};
      fuels.set(id,split);attachFuel(split,c);deposit(c,pulse/candidates.length);if(candidates[i].fall)beginFall(id,[split],p,{cause:'oil-through-opening'});
    }
    emit('oil-release',{fuelId:f.id,position:from,threshold:r.burstAt,amount,spentForPulse:amount*.04,redistributed:rest,targets:candidates.map((p,i)=>({fuelId:`${f.id}:spill:${i}`,position:p.position,supportBoundaryId:p.surface.id,fall:p.fall}))});
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
    if(command.type==='deposit') {
      const amount=command.amount,p=command.position;if(!Number.isFinite(amount)||amount<=0||!Array.isArray(p)||!p.every(Number.isFinite))throw Error('Finite positive deposited fuel required');const support=index.supportAt(p[0],p[2],p[1]+.02,p[1]-.25);if(!support)return emit('blocked',{reason:'No real support for deposited fuel',command});const y=p[1]+.006,id=`deposit:${command.sequence}`,position=[p[0],y,p[2]],c=cellAt(position),r=.12,triangles=[[[p[0]-r,y,p[2]-r],[p[0]+r,y,p[2]-r],[p[0]+r,y,p[2]+r]],[[p[0]-r,y,p[2]-r],[p[0]+r,y,p[2]+r],[p[0]-r,y,p[2]+r]]],rubbleId='rubble:'+id,f={id,cls:'oil',initial:amount,amount,area:r*r*4,position,cells:[c],lit:false,litAt:null,spentAt:null,char:0,falling:false,lastBurnTick:-1,normal:[0,1,0],loose:true,rubbleId,supportBoundaryId:support.surface.id,floorFootprint:triangles};fuels.set(id,f);c.fuels.push(f);ledger.added+=amount;rubble.set(rubbleId,{id:rubbleId,fallId:null,fuelIds:[id],position,triangles,floorFootprint:triangles,supportBoundaryId:support.surface.id,sourceSurfaceIds:[],thickness:.01,nonBearing:true,kind:'oil'});emit('fuel-deposit',{fuelId:id,position,amount,supportBoundaryId:support.surface.id});return;
    }
    throw Error(`Unknown trial command ${command.type}`);
  }
  function resolveLanding(fall,position,contact,surface,normal) {
    const offset=sub(position,fall.origin),geometry=fall.geometry?.solidTriangles||fall.geometry?.triangles,points=geometry?geometry.flat().map(p=>add(p,offset)):fall.rubbleFootprint?fall.rubbleFootprint.flat().map(p=>add(p,offset)):fall.itemId?fall.contactOffsets.map(p=>add(position,p)):[[-.1,0,-.1],[.1,0,-.1],[.1,0,.1],[-.1,0,.1]].map(p=>add(p,contact)),y=contact[1]+.006,hull=projectedHull(points,y);
    if(hull.length<3)return null;
    // Use the actual contacted solid face, including slab undersides and a
    // fitting's top, rather than its source plane or support-graph role.
    const faces=s=>(s.solidTriangles||s.triangles).filter(t=>{const n=unit(cross(sub(t[1],t[0]),sub(t[2],t[0])));return Math.abs(dot(n,normal))>.9999&&Math.abs(dot(sub(t[0],contact),normal))<1e-5;});
    let selected=surface,triangles=intersectFootprint(hull,faces(surface),y);
    if(!triangles.length){const box=bounds(hull);box.min[1]-=.02;box.max[1]+=.02;let best=0;
      for(const candidate of index.candidates(box)){if(!candidate.intact||index.pass(candidate)>=.99)continue;const clipped=intersectFootprint(hull,faces(candidate),y),area=clipped.reduce((v,t)=>v+triangleArea(t),0);if(area>best+EPS){best=area;selected=candidate;triangles=clipped;}}
    }
    // A line/corner touch with no supported area is a graze. Keep falling to
    // the next real bearing face; never manufacture a landed orphan fuel.
    return triangles.length?{surface:selected,triangles}:null;
  }
  function moveFalls() {
    for(const fall of [...falls.values()]) {
      const grazing=new Set();
      fall.previous=[...fall.position];fall.velocity[1]-=9.81*dt;let start=fall.position,next=add(start,mul(fall.velocity,dt)),landing=false,landingSurface=null,landingContact=null,landingFootprint=null;
      for(let crossing=0;crossing<32;crossing++) {
        const movement=sub(next,start),hit=fall.contactOffsets.flatMap(offset=>index.crossings(add(start,offset),add(next,offset),{includeEndpoints:true}).map(h=>({...h,contactOffset:offset}))).filter(h=>!grazing.has(h.surface.id)&&h.surface.intact&&index.pass(h.surface)<.99&&Math.abs(dot(h.normal||h.surface.normal,movement))>EPS&&(h.t>EPS||fall.velocity[1]<0&&Math.abs(h.normal?.[1]||0)>.2)).sort((a,b)=>a.t-b.t||a.surface.id.localeCompare(b.surface.id))[0];
        if(!hit)break;const p=add(start,mul(sub(next,start),hit.t));
        if(hit.surface.kind==='window'||hit.surface.material==='glass'){breakWindow(hit.surface,p,fall.id);continue;} // retrace the complete remainder, including corner ties
        if(fall.velocity[1]<0&&Math.abs(hit.normal?.[1]||0)>.2){const contact=add(p,hit.contactOffset),footprint=resolveLanding(fall,p,contact,hit.surface,hit.normal);
          if(!footprint){grazing.add(hit.surface.id);continue;}
          next=p;landing=true;landingSurface=footprint.surface;landingContact=contact;landingFootprint=footprint.triangles;break;
        }
        const normal=hit.normal||hit.surface.normal,into=dot(movement,normal),stopped=add(p,mul(normal,-Math.sign(into)*.001)),remaining=sub(next,p),slide=sub(remaining,mul(normal,dot(remaining,normal)));
        const velocityInto=dot(fall.velocity,normal);fall.velocity=sub(fall.velocity,mul(normal,velocityInto));if(fall.lastImpactId!==hit.surface.id)emit('impact',{boundaryId:hit.surface.id,sourceSurfaceId:hit.surface.sourceSurfaceId,position:add(p,hit.contactOffset),cause:fall.id});fall.lastImpactId=hit.surface.id;start=stopped;next=add(stopped,slide);
        if(length(sub(start,next))<EPS){next=start;break;}
        if(crossing===31){next=start;emit('blocked',{reason:'Conservative crossing limit',fallId:fall.id});}
      }
      fall.position=next;
      for(let i=0;i<fall.fuelIds.length;i++){const f=fuels.get(fall.fuelIds[i]);f.position=add(next,fall.offsets[i]);attachFuel(f,cellAt(f.position));}
      if(fall.itemId){const item=items.get(fall.itemId);item.position=[...next];itemDirty.add(item.id);}
      if(landing) {
        deposit(cellAt(add(landingContact,[0,.02,0])),fall.heldHeat);fall.heldHeat=0;
        if(!fall.itemId&&fall.fuelIds.length) {
          const triangles=landingFootprint;
          if(triangles.length) {
            const id=`rubble:${fall.id}`,position=centre(triangles.flat()),record={id,fallId:fall.id,fuelIds:[...fall.fuelIds],position,triangles,floorFootprint:triangles,supportBoundaryId:landingSurface.id,sourceSurfaceIds:fall.geometry?.sourceSurfaceIds||[],thickness:.01,nonBearing:true,kind:fall.rubbleKind||(fall.geometry?'wood':fall.fuelIds.some(id=>fuels.get(id).cls==='oil')?'oil':'ember')};rubble.set(id,record);
            for(const id of fall.fuelIds){const f=fuels.get(id);f.rubbleId=record.id;f.loose=true;f.position=[...position];f.floorFootprint=triangles;f.normal=[0,1,0];attachFuel(f,cellAt(f.position));}
          }
        }
        for(const id of fall.fuelIds){const f=fuels.get(id);f.falling=false;f.fallId=null;f.supportBoundaryId=f.rubbleId?rubble.get(f.rubbleId).supportBoundaryId:landingSurface.id;if(f.store?.kind==='lantern')burst(f);}
        if(fall.itemId){items.get(fall.itemId).falling=false;items.get(fall.itemId).currentSupportIds=[landingSurface.id];}falls.delete(fall.id);tombstones.push({collection:'falls',id:fall.id});stats.landings++;emit('landing',{fallId:fall.id,itemId:fall.itemId,position:next,contactPosition:landingContact,supportBoundaryId:landingSurface.id,fuelIds:fall.fuelIds});
      } else if(next[1]<scene.groundY-2) {
        for(const id of fall.fuelIds){const f=fuels.get(id);ledger.escaped+=f.amount;f.amount=0;f.falling=false;f.fallId=null;}heat.escaped+=fall.heldHeat;falls.delete(fall.id);tombstones.push({collection:'falls',id:fall.id});emit('escaped',{fallId:fall.id});
      }
    }
  }
  function stepOnce() {
    tick++;stats.ticks++;ventFlux.clear();
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
      // A sound sheet burns on its exposed side. It does not manufacture an
      // equal flame on the far side of an intact floor or wall. Conductance
      // still comes through the canonical boundary; detached fuel is free.
      const emitCells=f.boundaryId?[f.burningCell||f.cells.reduce((a,b)=>a.heat>=b.heat?a:b)]:f.cells,energy=consume(f,f.initial*dt/scene.profile[f.cls].seconds),share=energy/emitCells.length;
      for(const c of emitCells)outputs.set(c,(outputs.get(c)||0)+share);
      if(f.boundaryId)dirty.add(f.boundaryId);if(f.itemId)itemDirty.add(f.itemId);
    }
    for(const [c,e]of outputs)transport(c,e);buildRays();
    settle();
    for(const f of [...fuels.values()])if(f.amount>EPS&&!f.lit) {
      const p=scene.profile[f.cls],exposure=Math.max(...f.cells.map(c=>c.heat));
      if(f.store?.kind==='oil'||f.store?.kind==='oil-store') {if(!f.store.reacted&&tick>=(f.store.nextAttemptTick||0)&&exposure>=r.burstAt)burst(f);continue;}
      const before=f.char;
      if(exposure>=p.threshold){f.preheatAt??=tick*dt;f.char+=dt*exposure/p.threshold;if(f.char+EPS>=p.delay){f.lit=true;f.litAt=tick*dt;f.burningCell=f.cells.reduce((a,b)=>a.heat>=b.heat?a:b);stats.ignitions++;emit('ignition',{fuelId:f.id,sourceSurfaceId:f.sourceSurfaceId,itemId:f.itemId,position:f.position,cls:f.cls});}}else f.char=Math.max(0,f.char-dt*.2);
      if(f.char!==before){if(f.boundaryId)dirty.add(f.boundaryId);if(f.itemId)itemDirty.add(f.itemId);}
    }
    settle();
    for(const c of active) {
      stats.cellVisits++;const lost=c.heat*c.capacity*coolingFactor;c.heat-=lost/c.capacity;heat.ambient+=lost;if(lost>1e-8)markThermal(c);
      if(c.heat<1e-8&&!c.fuels.some(f=>f.lit&&f.amount>EPS)){heat.ambient+=c.heat*c.capacity;c.heat=0;active.delete(c);}
    }
    // Heat settles before opening, support, spill and ignition changes are
    // exposed to the next step. No house/floor timers choose failure.
    for(const b of index.surfaces.values())if(b.intact) {
      const f=fuels.get(b.fuelId);
      if(b.kind==='window'&&Math.max(0,...(b.heatCells||[]).map(c=>c.heat))>=r.glassBreaks)breakWindow(b,b.position,'heat');
      if(f&&f.cls!=='grass'&&f.amount<=f.initial*r.emberShare+EPS&&f.lit)fail(b,f);
    }
    mechanicalFalls();
    for(const part of parts.values())if(part.intact&&part.fuelId&&fuels.get(part.fuelId).amount<=EPS){part.intact=false;partDirty.add(part.id);itemDirty.add(part.itemId);emit('part-retirement',{partId:part.id,itemId:part.itemId,material:part.material});}
    for(const item of items.values())if(item.intact){const live=(itemParts.get(item.id)||[]).some(p=>p.intact);if(!live){item.intact=false;itemDirty.add(item.id);emit('item-retirement',{itemId:item.id});}}
    for(const item of items.values())if(!item.falling&&item.intact) {
      const list=(itemFuels.get(item.id)||[]).filter(f=>f.amount>EPS&&!f.falling);
      let supported=false;
      if(item.currentSupportIds)supported=item.currentSupportIds.some(id=>index.surfaces.get(id)?.intact);
      else if(item.supportSurfaceIds?.length)supported=item.supportSurfaceIds.some(id=>(supportBySource.get(id)||[]).some(b=>b.intact&&b.supports));
      else {for(const offset of item.supportContactOffsets){const p=add(item.position,offset);if(index.supportAt(p[0],p[2],p[1]+.03,p[1]-.15)){supported=true;break;}}}
      if(!supported)beginFall(item.id,list,item.position,{itemId:item.id});
    }
    for(const record of [...rubble.values()])if(!index.surfaces.get(record.supportBoundaryId)?.intact)beginFall(record.id,record.fuelIds.map(id=>fuels.get(id)),record.position,{cause:'rubble-support-loss',footprint:record.triangles,rubbleKind:record.kind});
    for(const f of fuels.values())if((f.spill||f.loose)&&f.amount>EPS&&!f.itemId&&!f.falling&&!f.rubbleId&&f.supportBoundaryId&&!index.surfaces.get(f.supportBoundaryId)?.intact)beginFall(f.id,[f],f.position,{cause:f.spill?'liquid-support-failure':'loose-support-failure'});
    stats.peakActive=Math.max(stats.peakActive,active.size);revision++;
  }
  function metrics() {
    let remaining=0,airborne=0,area=0,burningArea=0,burningCount=0;
    for(const f of fuels.values()){if(f.falling)airborne+=f.amount;else remaining+=f.amount;area+=f.area||0;if(f.lit&&f.amount>EPS){burningCount++;burningArea+=f.area||0;}}
    const radiationInTransit=[...radCache.values()].reduce((v,c)=>v+c.energy,0),stored=[...cells.values()].reduce((v,c)=>v+c.heat*c.capacity,0)+[...falls.values()].reduce((v,f)=>v+f.heldHeat,0)+radiationInTransit,fuelError=ledger.initial+ledger.added-ledger.burned-ledger.escaped-airborne-remaining,heatError=heat.generated+heat.input-heat.ambient-heat.blocked-heat.cap-heat.escaped-stored;
    return {tick,worldTime:tick*dt,fuel:{...ledger,remaining,airborne,error:fuelError},heat:{...heat,stored,radiationInTransit,error:heatError,relativeError:heatError/(heat.generated+heat.input||1)},burningCount,burningArea,combustibleArea:initialCombustibleArea,burningAreaFraction:initialCombustibleArea?burningArea/initialCombustibleArea:0,burnedFraction:ledger.burned/(ledger.initial+ledger.added||1),activeCells:active.size,fallingCount:falls.size,queuedRadiationSources:rayQueue.length,queuedRays:rayQueue.reduce((v,q)=>v+q.entries.length-q.cursor,0),oldestRadiationQueryDelay:rayQueue.length?(tick-rayQueue[0].enqueuedTick)*dt:0,oldestRadiationEnergyAge:Math.max(0,...rayQueue.filter(q=>q.energy>0).map(q=>(tick-q.firstEnergyTick)*dt)),stats:{...stats}};
  }
  function boundaryFrame(b) {const f=fuels.get(b.fuelId);return {id:b.id,sourceSurfaceId:b.sourceSurfaceId,kind:b.kind,triangles:b.triangles,intact:b.intact,openFraction:b.openFraction,charFraction:f?clamp(f.char/(scene.profile[f.cls].delay||1)):0,heatFraction:f?clamp(Math.max(...f.cells.map(c=>c.heat))/r.maxHeat):0,fuelFraction:f?f.amount/f.initial:1};}
  function fireSamples() {
    const samples=[];
    for(const f of fuels.values())if(f.amount>EPS) {
      const exposure=Math.max(...f.cells.map(c=>c.heat)),profile=scene.profile[f.cls];if(!f.lit&&(!(f.char>0)||exposure<profile.threshold*.6)||(f.store?.kind==='oil'||f.store?.kind==='oil-store')&&!f.store.reacted)continue;
      const b=f.boundaryId?index.surfaces.get(f.boundaryId):null,c=f.burningCell||f.cells.reduce((a,b)=>a.heat>=b.heat?a:b),side=b&&dot(sub(c.position,f.position),f.normal)<0?-1:1,normal=b?mul(f.normal,side):f.normal||[0,1,0];let p=[...f.position];
      if(b){const offset=b.kind==='floor'?(side<0?-(b.thickness||.12):0):side*(b.thickness||0)/2;p=add(p,mul(b.normal,offset));}
      samples.push({id:f.id,buildingId:data.buildingId||data.prefabId,part:f.rubbleId?'ground':b?.kind==='wall'?'walls':b?.kind||'contents',x:p[0],y:p[1],z:p[2],nx:normal[0],ny:normal[1],nz:normal[2],area:f.area,flame:f.lit?clamp(f.amount/f.initial*2):0,smoke:f.lit?.5:clamp((exposure/profile.threshold-.6)*.35),ignitionTime:f.litAt??f.preheatAt??tick*dt,ignited:f.lit,heatFraction:clamp(exposure/r.maxHeat),sourceSurfaceId:f.loose||f.falling?undefined:f.sourceSurfaceId,originalSourceSurfaceId:f.sourceSurfaceId,itemId:f.itemId,boundaryId:b?.id,fallId:f.fallId||undefined,rubbleId:f.rubbleId||undefined,supportBoundaryId:f.supportBoundaryId||undefined,...(f.floorFootprint?{floorFootprint:f.floorFootprint,floorRadius:.36}:b?.kind==='floor'?{floorFootprint:b.triangles,floorRadius:.36}:{})});
    }
    for(const [id,energy]of ventFlux){const b=index.surfaces.get(id),flow=energy/dt;samples.push({id:`vent:${id}`,buildingId:data.buildingId||data.prefabId,part:'walls',...Object.fromEntries(['x','y','z'].map((axis,i)=>[axis,b.position[i]])),nx:b.normal[0],ny:b.normal[1],nz:b.normal[2],area:b.area,flame:clamp(flow/(4*b.area)),smoke:clamp(flow/(2*b.area)),ignitionTime:tick*dt,sourceSurfaceId:b.sourceSurfaceId,openingId:b.openingId,vent:true,heatFlux:flow});}
    return samples;
  }
  let eventCursor=0;
  function frame({full=false}={}) {
    full||=fullNext;fullNext=false;
    const records=full?[...index.surfaces.values()]:[...dirty].map(id=>index.surfaces.get(id)),b=records.map(boundaryFrame),itemRecords=(full?[...items.values()]:[...itemDirty].map(id=>items.get(id))).map(item=>{const list=[...fuels.values()].filter(f=>f.itemId===item.id);return {...item,remainingFraction:list.reduce((v,f)=>v+f.amount,0)/(list.reduce((v,f)=>v+f.initial,0)||1),charFraction:Math.max(0,...list.map(f=>clamp(f.char/(scene.profile[f.cls].delay||1))))};});
    const result={version:1,revision,tick,worldTime:tick*dt,full,boundaries:b,supports:b.filter(v=>index.surfaces.get(v.id).supports),items:itemRecords,falls:[...falls.values()].map(f=>({...f,flame:f.fuelIds.some(id=>fuels.get(id).lit&&fuels.get(id).amount>EPS)?1:0,smoke:f.fuelIds.some(id=>fuels.get(id).lit&&fuels.get(id).amount>EPS)?.4:0,ignitionTime:f.fuelIds.some(id=>Number.isFinite(fuels.get(id).litAt))?Math.min(...f.fuelIds.map(id=>fuels.get(id).litAt).filter(Number.isFinite)):null})),events:events.slice(full?0:eventCursor),metrics:metrics(),fireSamples:fireSamples(),tombstones:tombstones.splice(0),occupancy:[...active].map(c=>({id:c.id,bounds:{min:c.c.map((v,i)=>scene.origin[i]+v*scene.pitch[i]),max:c.c.map((v,i)=>scene.origin[i]+(v+1)*scene.pitch[i])},heatFraction:c.heat/r.maxHeat,occupied:c.fuels.length>0}))};
    result.parts=(full?[...parts.values()]:[...partDirty].map(id=>parts.get(id))).map(p=>({id:p.id,itemId:p.itemId,intact:p.intact,material:p.material,remainingFraction:p.fuelId?fuels.get(p.fuelId).amount/fuels.get(p.fuelId).initial:1}));
    result.rubble=[...rubble.values()].map(record=>{const list=record.fuelIds.map(id=>fuels.get(id)),remainingAmount=list.reduce((v,f)=>v+f.amount,0),initial=list.reduce((v,f)=>v+f.initial,0),lit=list.some(f=>f.lit&&f.amount>EPS);return {...record,phase:lit?'burning':remainingAmount>EPS?'char':'ash',remainingAmount,remainingFraction:remainingAmount/(initial||1),heatFraction:Math.max(0,...list.flatMap(f=>f.cells.map(c=>clamp(c.heat/r.maxHeat)))),flame:lit?clamp(remainingAmount/(initial||1)*2):0,smoke:lit?.4:0,ignitionTime:list.some(f=>Number.isFinite(f.litAt))?Math.min(...list.map(f=>f.litAt).filter(Number.isFinite)):null};});
    // An item may land and start another fall with its stable ID before the
    // next presentation call. Its current upsert supersedes the old removal.
    result.tombstones=result.tombstones.filter(t=>!(t.collection==='falls'&&falls.has(t.id)||t.collection==='rubble'&&rubble.has(t.id)));
    dirty.clear();itemDirty.clear();partDirty.clear();eventCursor=events.length;return result;
  }
  function command(input) {if(closed)throw Error('Trial disposed');const value={...structuredClone(input),sequence:++commandSequence,tick:input.tick??tick+1};if(!Number.isInteger(value.tick)||value.tick<=tick)throw Error('Commands must target a future integer tick');commands.push(value);commands.sort((a,b)=>a.tick-b.tick||a.sequence-b.sequence);commandLog.push(value);return value;}
  return {scene,supportGraph,rules:r,events,stats,wind,windMetadata,command,step(count=1){if(closed)throw Error('Trial disposed');if(!Number.isInteger(count)||count<0)throw Error('Whole nonnegative steps required');for(let i=0;i<count;i++)stepOnce();return tick;},frame,fireSamples,metrics,
    snapshot(){return {version:1,tick,worldTime:tick*dt,cells:[...cells.values()].filter(c=>c.heat).map(c=>({id:c.id,heat:c.heat})),fuels:[...fuels.values()].map(f=>({id:f.id,cls:f.cls,amount:f.amount,initial:f.initial,area:f.area,char:f.char,lit:f.lit,litAt:f.litAt,spentAt:f.spentAt,falling:f.falling,position:f.position,boundaryId:f.boundaryId,sourceSurfaceId:f.sourceSurfaceId,itemId:f.itemId,supportBoundaryId:f.supportBoundaryId,store:f.store?{id:f.store.id,kind:f.store.kind,reacted:f.store.reacted,blocked:f.store.blocked}:null,cellIds:f.cells.map(c=>c.id),burningCellId:f.burningCell?.id})),boundaries:[...index.surfaces.values()].map(boundaryFrame),falls:[...falls.values()],events:events.slice(-1024),eventCount:events.length,items:[...items.values()].map(i=>({id:i.id,position:i.position,intact:i.intact,falling:i.falling,currentSupportIds:i.currentSupportIds})),parts:[...parts.values()].map(p=>({id:p.id,intact:p.intact})),rubble:[...rubble.values()],metrics:metrics()};},
    replay(){return {version:1,prefabId:data.prefabId,sourceHashes:data.sourceHashes,runtimeAdapterVersion:data.runtimeAdapterVersion||0,runtimeAdaptations:data.runtimeAdaptations||[],rules:r,profiles:scene.profile,wind:windMetadata,commands:structuredClone(commandLog),endTick:tick};},
    dispose(){closed=true;commands.length=0;radCache.clear();pendingHeat.clear();},get tick(){return tick;},get worldTime(){return tick*dt;}};
}

export function createClock(trial,{speed=1,maxSteps=RULES.maxStepsPerAdvance,worldScale=1,playerScale=1}={}) {
  let accumulator=0,paused=true,lastSteps=0,playerTime=0,activeTime=0;
  return {advance(realSeconds){if(!Number.isFinite(realSeconds)||realSeconds<0)throw Error('Invalid elapsed seconds');if(paused)return 0;activeTime+=realSeconds*speed;playerTime+=realSeconds*speed*playerScale;accumulator+=realSeconds*speed*worldScale;const steps=Math.min(maxSteps,Math.floor((accumulator+1e-10)/trial.rules.step));trial.step(steps);accumulator-=steps*trial.rules.step;lastSteps=steps;return steps;},
    drain(){let count=0;while(accumulator+1e-10>=trial.rules.step){const n=Math.min(maxSteps,Math.floor((accumulator+1e-10)/trial.rules.step));trial.step(n);accumulator-=n*trial.rules.step;count+=n;}return count;},
    setSpeed(value){if(!Number.isFinite(value)||value<=0||value>32)throw Error('Speed must be 0–32');speed=value;},setPaused(value){paused=!!value;},get paused(){return paused;},get accumulator(){return accumulator;},get speed(){return speed;},get playerScale(){return playerScale;},get playerTime(){return playerTime;},diagnostics:()=>({accumulator,lastSteps,speed,paused,activeTime,playerTime,worldTime:trial.worldTime,worldScale,playerScale,droppedSeconds:0})};
}
