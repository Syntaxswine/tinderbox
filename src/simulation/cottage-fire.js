import {COTTAGE_IDS,COTTAGE_ORIGIN,COTTAGE_OFFSET} from '../content/cottage-pair.js';
import {firstHeatContact,distance} from './geometry.js';
import {STRUCTURE_DECAY_SECONDS} from './config.js';
import {exchangeSurfaceGround, heatBlastSiding, heatSurfaceSite, stepSurfaceFire, surfaceFlame as flameAt, surfaceSample, worldSurface, retainedStructureHeat, structureSmolder} from './surface-fire.js';
import {createCottageRadiation} from './cottage-radiation.js';
import {WIDTH,DEPTH,UPPER,EAVE,RIDGE,RIM,PITCH,OVERHANG,roofHeight,roofNormal,tileIndex,makeTiles,createCottageTopology} from './cottage-topology.js';

export const COTTAGE_EMBER_LIMIT=84;
const LAYERS=['roof','upper','lower'];
const EPS=1e-8, IGNITION=1, EMBER_IGNITION=.30, MAX_FLIGHT=9.35;
const cap=(x,lo=0,hi=1)=>Math.max(lo,Math.min(hi,x));
const lerp=(a,b,t)=>a+(b-a)*t;
const point=(lot,site)=>({x:lot.building.x+site.x,y:lot.building.y+site.z});
const layerFor=site=>site.layer==='walls'?'upper':site.layer;
const present=(lot,site)=>!lot.building.destroyed&&lot.tiles[site.tile][layerFor(site)];
const burning=(lot,site)=>site.phase==='burning'&&present(lot,site);

// Keep the ground footprint noncombustible, with collision columns owned by
// the same masks as the cottage art.
export function prepareCottageFootprints(definition){
  const ids=new Set(COTTAGE_IDS);
  definition.obstacles=definition.obstacles.flatMap(box=>{
    if(!ids.has(box.buildingId))return [box];
    const building=definition.buildings.find(b=>b.id===box.buildingId);
    return makeTiles().flatMap(({index,x,z})=>{
      const left=Math.max(box.x-box.width/2,x===0?-Infinity:building.x+x);
      const right=Math.min(box.x+box.width/2,x===WIDTH-1?Infinity:building.x+x+1);
      const top=Math.max(box.y-box.depth/2,z===0?-Infinity:building.y+z);
      const bottom=Math.min(box.y+box.depth/2,z===DEPTH-1?Infinity:building.y+z+1);
      if(right-left<=EPS||bottom-top<=EPS)return [];
      return [{...box,id:box.id+':'+index,x:(left+right)/2,y:(top+bottom)/2,width:right-left,depth:bottom-top,
        material:'masonry',...(box.role==='foundation'?{cottageTile:index}:{supportTile:index})}];
    });
  });
  for(const b of definition.buildings.filter(b=>ids.has(b.id))){
    b.footprints=definition.obstacles.filter(o=>o.buildingId===b.id);
    b.colliderIds=b.footprints.map(o=>o.id);
  }
}

function roofContact(lot,a,b){
  if(lot.building.destroyed)return null;
  const {x,y:z}=lot.building;
  let first=null;
  for(const sign of [-1,1]){
    const height=p=>RIDGE-sign*PITCH*(p.x-x-WIDTH/2);
    const da=a.y-height(a),db=b.y-height(b);
    if(da<=0||db>0)continue;
    const t=da/(da-db),px=lerp(a.x,b.x,t)-x,pz=lerp(a.z,b.z,t)-z;
    if(px< -OVERHANG||px>WIDTH+OVERHANG||pz< -OVERHANG||pz>DEPTH+OVERHANG||sign*(px-WIDTH/2)<-EPS)continue;
    const tile=tileIndex(px,pz);
    if(!lot.tiles[tile].roof)continue;
    if(!first||t<first.t)first={t,lot,kind:'roof',site:lot.byId.get('roof:'+tile)};
  }
  return first;
}

export function createCottageFire({buildings,obstacles,sampleWind,seed,radiation=true,embers:embersEnabled=true,retireGround}){
  if(typeof sampleWind!=='function')throw Error('The Ashland pair requires its checked wind sampler');
  const lots=COTTAGE_IDS.map((id,i)=>{
    const building=buildings.find(b=>b.id===id);
    const x=COTTAGE_ORIGIN.x+i*COTTAGE_OFFSET.x,z=COTTAGE_ORIGIN.z+i*COTTAGE_OFFSET.z;
    if(!building||building.prefabId!=='ashland-worker'||building.quarterTurns!==0||building.x!==x||building.y!==z)throw Error('Cottage placement must match the pinned pair bake');
    const topology=createCottageTopology(building,sampleWind);
    const tiles=makeTiles().map(tile=>({...tile,ignitedAt:{},retiredAt:{}}));
    const colliders=obstacles.filter(o=>o.buildingId===id);
    const vents=tiles.map(()=>({}));
    const lot={...topology,building,tiles,colliders,vents,firstIgnition:null,nextWave:Infinity,waves:0,fallen:new Set(),drops:[],retiredAt:null};
    applyMasks(lot);
    return lot;
  });
  const byBuilding=new Map(lots.map(l=>[l.building.id,l]));
  const byObstacle=new Map(obstacles.map(o=>[o.id,o]));
  const embers=[], radiant=radiation?createCottageRadiation(lots,obstacles,present):null;
  let rng=(20261107+seed-1893)>>>0,launches=0,hotRoofContacts=0,coolRoofContacts=0,misses=0;
  function random(){rng=(Math.imul(rng,1664525)+1013904223)>>>0;return rng/0x100000000;}
  function heat(lot,site,amount,cause,anchor){
    return site&&present(lot,site)?heatSurfaceSite(site,amount,cause,anchor):null;
  }
  function wallSite(lot,x,z,origin,height=UPPER){
    let best=null,score=Infinity;
    for(const s of lot.walls){
      if(s.band!==(height>UPPER+1?1:0)||!present(lot,s))continue;
      const w=point(lot,s),normalDistance=Math.abs((x-w.x)*s.nx+(z-w.y)*s.nz);
      if(normalDistance>.045||origin&&(origin.x-w.x)*s.nx+(origin.y-w.y)*s.nz<=EPS)continue;
      const d=Math.hypot(x-w.x,z-w.y);
      if(d<.62&&d<score){best=s;score=d;}
    }
    return best;
  }
  function sidingContact(from,to,startHeight=0,endHeight=startHeight){
    const hit=firstHeatContact(from,to,obstacles,startHeight,endHeight);
    if(!hit||hit.box.cottageTile===undefined)return null;
    const lot=byBuilding.get(hit.box.buildingId),x=lerp(from.x,to.x,hit.t),z=lerp(from.y,to.y,hit.t);
    // Aimed tools heat the lowest exposed siding above the brick plinth.
    const site=wallSite(lot,x,z,from,lerp(startHeight,endHeight,hit.t));
    return site&&site.phase!=='spent'?{lot,site,t:hit.t,point:{x,y:z,h:site.y}}:null;
  }
  function heatSurface(from,to,amount,kind,startHeight=0,endHeight=startHeight){
    const contact=sidingContact(from,to,startHeight,endHeight);
    return contact?heat(contact.lot,contact.site,amount,{kind}):null;
  }
  function igniteSiding(from,aim,range,amount,kind){
    const contact=sidingContact(from,aim);
    if(!contact)return null;
    const {lot,site,t,point}=contact;
    if(t*distance(from,aim)>range+EPS){
      // Siding picks land just inside the cottage. Ordinary ground aims beyond
      // the footprint still use the existing range-clamped ground tile.
      const x=aim.x-lot.building.x,z=aim.y-lot.building.y;
      return kind==='matches'&&x>=-RIM&&x<=WIDTH+RIM&&z>=-RIM&&z<=DEPTH+RIM?{cells:[],result:'range'}:null;
    }
    const heated=heat(lot,site,amount,{kind});
    return heated?{point,cells:[heated],result:'heated'}:null;
  }
  function heatDischarge(discharge,amount){
    const touched=new Set();
    for(const ray of discharge.rays){
      const hit=byObstacle.get(ray.obstacleId);
      if(hit?.cottageTile===undefined||hit.destroyed)continue;
      const lot=byBuilding.get(hit.buildingId),site=wallSite(lot,ray.x,ray.y,discharge.origin,ray.h);
      if(!site||touched.has(site))continue;
      touched.add(site);heat(lot,site,amount*.42,{kind:'flamethrower'});
    }
  }
  function radiantSource(site){
    if(site.cause?.kind!=='radiation')return {};
    const {sourceId,sourceBuildingId,sourceSiteId,donorCount}=site.cause;
    return {cause:'radiation',sourceId,sourceBuildingId,sourceSiteId,donorCount};
  }
  function ignite(lot,site,time,event){
    const p=point(lot,site);
    const layer=layerFor(site),tile=lot.tiles[site.tile];
    tile.ignitedAt[layer]??=site.ignitedAt;
    const vent=lot.vents[site.tile][layer];
    if((site.layer==='walls'||layer==='roof')&&site.y>(vent?.y??-Infinity))lot.vents[site.tile][layer]=site;
    if(lot.firstIgnition===null){
      lot.firstIgnition={cellId:site.id,face:site.face,layer:site.layer,time,kind:site.ignitionKind};
      lot.nextWave=time+4.4;
    }
    event('cottage-ignition',p,{buildingId:lot.building.id,cellId:site.id,layer:site.layer,face:site.face,
      worldTime:time,cause:site.ignitionKind,parentCellId:site.parentId,sourceId:site.cause?.sourceId??null,heat:site.heat,...radiantSource(site)});
  }
  function heatBlast(origin,blast,cause){
    for(const lot of lots)for(const site of lot.walls)if(!site.band&&present(lot,site)){
      heatBlastSiding(site,worldSurface(lot.building,site),1,origin,blast,obstacles,cause);
    }
  }
  function exchangeGround(field,dt,time){
    for(const lot of lots){
      if(lot.building.destroyed)continue;
      for(const s of lot.walls){
        if(!s.band&&present(lot,s))exchangeSurfaceGround(s,worldSurface(lot.building,s),field,obstacles,dt,time,'cottage-siding');
      }
    }
  }
  function retire(lot,tile,layer,time,event,supportLayer){
    tile[layer]=false;
    tile.retiredAt[layer]=time;
    if(layer==='lower'){
      tile.ash=1;
      retireGround?.(lot.building,1,tile.index,time,retainedStructureHeat(tile.ignitedAt.lower,time));
    }
    event('building-section-burnout',{x:lot.building.x+tile.x+.5,y:lot.building.y+tile.z+.5},{
      buildingId:lot.building.id,section:tile.index,layer,worldTime:time,ignitionTime:tile.ignitedAt[layer]??null,
      cause:supportLayer?'support':'decay',...(supportLayer?{supportLayer}:{})
    });
  }
  function applyMasks(lot){
    for(const box of lot.colliders){
      if(box.cottageTile===undefined){
        box.destroyed=!lot.tiles[box.supportTile].upper;
        continue;
      }
      const tile=lot.tiles[box.cottageTile];
      box.destroyed=!tile.lower;
      box.height=tile.upper?EAVE:UPPER;
    }
    lot.building.colliderIds=lot.colliders.filter(box=>!box.destroyed).map(box=>box.id);
  }
  function ageStructure(lot,time,event){
    if(lot.firstIgnition===null||lot.building.destroyed)return;
    let changed=false,char=0,live=0;
    for(const tile of lot.tiles){
      // Give every layer its own deadline, including a roof whose support
      // also happens to expire this tick. Then apply strictly local support.
      for(const layer of LAYERS){
        if(!tile[layer]||tile.ignitedAt[layer]===undefined||
          time+EPS<tile.ignitedAt[layer]+STRUCTURE_DECAY_SECONDS)continue;
        retire(lot,tile,layer,time,event);
        changed=true;
      }
      if(tile.upper&&!tile.lower){
        retire(lot,tile,'upper',time,event,'lower');
        changed=true;
      }
      if(tile.roof&&!tile.upper){
        retire(lot,tile,'roof',time,event,'upper');
        changed=true;
      }
      for(const layer of LAYERS){
        if(tile[layer]){
          live++;
          if(tile.ignitedAt[layer]!==undefined)char+=Math.sqrt(cap((time-tile.ignitedAt[layer])/STRUCTURE_DECAY_SECONDS));
        }else char++;
      }
    }
    lot.building.burnedFraction=char/(lot.tiles.length*LAYERS.length);
    if(!changed)return;
    applyMasks(lot);
    if(live===0){
      lot.building.destroyed=true;
      lot.retiredAt=time;
      event('building-burnout',lot.building,{buildingId:lot.building.id,worldTime:time});
    }
  }
  function releaseDebris(lot,time,event){
    for(const layer of ['roof','upper']){
      if(lot.fallen.has(layer))continue;
      const s=lot.sites.find(s=>s.layer===layer&&burning(lot,s)&&time-s.ignitedAt>=(layer==='roof'?3.15:2.15));
      if(!s)continue;
      const kind=layer==='roof'?'board':'crate',half=kind==='board'?.045:.17;
      lot.fallen.add(layer);
      lot.drops.push({id:lot.building.id+':'+kind,kind,tile:s.tile,x:s.x,z:s.z,y:s.y+half,
        half,releaseTime:time,fromY:s.y,ignitionTime:time-.32,landedAt:null,layer,heat:.86});
      // The lit piece becomes the moving source; its load-bearing tile stays.
      s.phase='spent';
      event('cottage-debris-release',point(lot,s),{buildingId:lot.building.id,tile:s.tile,layer,worldTime:time});
    }
  }
  function moveDebris(lot,time,event){
    for(const drop of lot.drops){
      if(drop.landedAt!==null)continue;
      const age=time-drop.releaseTime, y=drop.fromY-.5*9.81*age*age, tile=lot.tiles[drop.tile];
      const layer=drop.layer==='roof'&&tile.upper?'upper':tile.lower?'lower':null;
      const floor=layer==='upper'?UPPER:0;
      if(y>floor){drop.y=y+drop.half;continue;}
      const hitTime=drop.releaseTime+Math.sqrt(2*(drop.fromY-floor)/9.81);
      drop.y=floor+drop.half;drop.landedAt=hitTime;
      event('cottage-debris-contact',{x:lot.building.x+drop.x,y:lot.building.y+drop.z},
        {buildingId:lot.building.id,tile:drop.tile,layer,worldTime:hitTime,sourceId:drop.id});
      if(layer)heat(lot,lot.byId.get(layer+':'+drop.tile),1.24,{kind:'falling-fuel',sourceId:drop.id});
    }
    lot.drops=lot.drops.filter(d=>time-d.releaseTime<4);
  }
  function spawn(lot,time){
    if(time+EPS<lot.nextWave||lot.waves>=14||launches>=COTTAGE_EMBER_LIMIT)return;
    const active=lot.sites.filter(s=>s.layer==='roof'&&burning(lot,s)&&flameAt(s,time)>=.16);
    if(!active.length)return;
    lot.waves++;lot.nextWave=time+.69;
    for(let n=0;n<6&&launches<COTTAGE_EMBER_LIMIT;n++){
      const s=active[Math.floor(random()*active.length)],x=s.x+.42*(random()-.5),z=s.z+.55*(random()-.5);
      const angle=2*Math.PI*random(),kick=.20+.95*random(),lift=2.9+2.5*random();
      const h=(.71+.28*random())*(.91+.09*flameAt(s,time));
      embers.push({id:'cottage-ember-'+(++launches),sourceBuildingId:lot.building.id,sourceCellId:s.id,
        time,x:lot.building.x+x,y:roofHeight(x)+.075,z:lot.building.y+z,vx:kick*Math.cos(angle),vy:.8*lift,vz:kick*Math.sin(angle),
        initialHeat:h,heat:h,lift,liftTime:.82+.58*random(),settling:.47+.68*random(),coolingTime:3.4+4.2*random(),responseTime:.23+.22*random()});
    }
  }
  function transport(dt,time,event){
    for(let i=embers.length-1;i>=0;i--){
      const a=embers[i],age=time-a.time,air=sampleWind(a.x,a.y,a.z,[0,0,0]);
      const drag=1-Math.exp(-dt/a.responseTime),loft=a.lift*Math.exp(-Math.max(0,age-dt)/a.liftTime);
      const vx=lerp(a.vx,air[0],drag),vy=lerp(a.vy,air[1]+loft-a.settling,drag),vz=lerp(a.vz,air[2],drag);
      const b={x:a.x+(a.vx+vx)*dt/2,y:a.y+(a.vy+vy)*dt/2,z:a.z+(a.vz+vz)*dt/2};
      let hit=b.y<=0?{kind:'ground',t:cap(a.y/(a.y-b.y))}:null;
      for(const lot of lots){
        const candidate=roofContact(lot,a,b);
        if(candidate&&(!hit||candidate.t<hit.t))hit=candidate;
      }
      const solid=firstHeatContact({x:a.x,y:a.z},{x:b.x,y:b.z},obstacles,a.y,b.y);
      if(solid&&(!hit||solid.t<hit.t))hit={...solid,kind:'solid'};
      const currentHeat=a.initialHeat*Math.exp(-age/a.coolingTime);
      if(hit){
        const contactTime=time-dt*(1-hit.t),h=a.initialHeat*Math.exp(-(contactTime-a.time)/a.coolingTime);
        if(hit.kind==='roof'){
          const {lot,site}=hit,hot=h>=EMBER_IGNITION,x=lerp(a.x,b.x,hit.t),z=lerp(a.z,b.z,hit.t);
          const localX=x-lot.building.x,localZ=z-lot.building.y;
          if(hot)hotRoofContacts++;else coolRoofContacts++;
          event('cottage-ember-contact',{x,y:z},{buildingId:lot.building.id,sourceBuildingId:a.sourceBuildingId,
            cellId:site.id,sourceId:a.id,heat:h,hot,worldTime:contactTime});
          heat(lot,site,hot?1.12:Math.min(.35,h),{kind:'ember',sourceId:a.id},
            {x:localX,y:roofHeight(localX),z:localZ,...roofNormal(localX)});
        }else misses++;
        embers.splice(i,1);
      }else if(age>=MAX_FLIGHT||currentHeat<.065){misses++;embers.splice(i,1);}
      else Object.assign(a,b,{vx,vy,vz,heat:currentHeat});
    }
  }
  function step(dt,time,event){
    for(const lot of lots)ageStructure(lot,time,event);
    if(embersEnabled)transport(dt,time,event);
    radiant?.exchange(dt,time);
    for(const lot of lots){
      moveDebris(lot,time,event);
      if(lot.building.destroyed)continue;
      stepSurfaceFire(lot.sites,dt,time,s=>present(lot,s),s=>ignite(lot,s,time,event));
      releaseDebris(lot,time,event);if(embersEnabled)spawn(lot,time);
    }
  }
  function snapshot(time){
    return {version:1,worldTime:time,buildings:lots.map(lot=>({
      id:lot.building.id,x:lot.building.x,z:lot.building.y,firstIgnition:lot.firstIgnition&&{...lot.firstIgnition},
      retiredAt:lot.retiredAt,gone:lot.building.destroyed,char:lot.building.burnedFraction,
      tiles:lot.tiles.map(t=>({...t,ignitedAt:{...t.ignitedAt},retiredAt:{...t.retiredAt}})),
      preheat:lot.walls.filter(s=>s.phase==='cold'&&Number.isFinite(s.heat)&&s.heat>0&&present(lot,s))
        .map(site=>{
          const {id,x,y,z,nx,ny,nz,heat}=site;
          return {id,x,y,z,nx,ny,nz,heatFraction:cap(heat/IGNITION),...radiantSource(site)};
        }),
      cells:lot.sites.filter(s=>s.ignitedAt!==null).map(s=>{
        const flame=burning(lot,s)?flameAt(s,time):0,age=time-s.ignitedAt;
        return {id:s.id,face:s.face,layer:s.layer,part:s.layer==='upper'||s.layer==='lower'?'ground':s.layer,tile:s.tile,
          x:s.x,y:s.y,z:s.z,nx:s.nx,ny:s.ny,nz:s.nz,...s.anchor,ignitionTime:s.ignitedAt,parentId:s.parentId,
          cause:s.ignitionKind,...radiantSource(s),flame,smoke:flame*cap((age-.12)/.55)*.56};
      }),
      drops:lot.drops.map(d=>({id:d.id,kind:d.kind,x:d.x,y:d.y,z:d.z,rx:0,ry:.16,rz:d.landedAt===null?.23:0,
        state:d.landedAt===null?'falling':'landed',ignitionTime:d.ignitionTime,flame:d.heat*(1-cap((time-d.releaseTime-1.3)/2.7)),
        smoke:.4*d.heat*(1-cap((time-d.releaseTime-1.7)/2.3))}))
    })),embers:embers.map(({id,x,y,z,vx,vy,vz,heat,sourceBuildingId})=>({id,x,y,z,vx,vy,vz,heat,sourceBuildingId})),
    diagnostics:{launches,hotRoofContacts,coolRoofContacts,misses,maxEmbers:COTTAGE_EMBER_LIMIT,sidingIgnitionHeat:IGNITION,radiantLinks:radiant?.links??0,
      warmingSiding:lots.flatMap(lot=>lot.walls.filter(s=>!s.band&&s.phase==='cold'&&s.heat>EPS&&present(lot,s))
        .map(s=>({buildingId:lot.building.id,cellId:s.id,heat:s.heat})))}};
  }
  function samples(time){
    return lots.flatMap(lot=>{
      const current=lot.sites.filter(s=>present(lot,s)).map(s=>{
        const tile=lot.tiles[s.tile];
        return surfaceSample(lot.building,s,time,s.layer==='walls'||s.layer==='roof'||!tile.roof&&(s.layer==='upper'||!tile.upper));
      }).filter(Boolean);
      const burningTiles=new Set(lot.sites.filter(s=>burning(lot,s)).map(s=>s.tile));
      for(const tile of lot.tiles){
        if(burningTiles.has(tile.index))continue;
        const vents=lot.vents[tile.index];
        const vent=tile.roof&&vents.roof||tile.upper&&vents.upper;
        if(vent)current.push(structureSmolder(lot.building,vent,time,tile.ignitedAt[layerFor(vent)]));
      }
      return current;
    });
  }
  return {igniteSiding,heatSurface,heatDischarge,heatBlast,exchangeGround,step,snapshot,samples};
}
