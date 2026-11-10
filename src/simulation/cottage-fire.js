import {COTTAGE_IDS,COTTAGE_ORIGIN,COTTAGE_OFFSET} from '../content/cottage-pair.js';
import {firstHeatContact,distance} from './geometry.js';
import {exchangeSurfaceGround, heatBlastSiding, heatSurfaceSite, stepSurfaceFire, surfaceFlame as flameAt, surfaceSample, worldSurface} from './surface-fire.js';
import {WIDTH,DEPTH,UPPER,EAVE,RIDGE,RIM,PITCH,OVERHANG,roofHeight,roofNormal,tileIndex,makeTiles,createCottageTopology} from './cottage-topology.js';

export const COTTAGE_BURN_SECONDS=30, COTTAGE_EMBER_LIMIT=84;
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
    if(box.role!=='foundation')return [{...box,material:'masonry'}];
    const building=definition.buildings.find(b=>b.id===box.buildingId);
    return makeTiles().map(({index,x,z})=>{
      const left=x===0?box.x-box.width/2:building.x+x;
      const right=x===WIDTH-1?box.x+box.width/2:building.x+x+1;
      const top=z===0?box.y-box.depth/2:building.y+z;
      const bottom=z===DEPTH-1?box.y+box.depth/2:building.y+z+1;
      return {...box,id:box.id+':'+index,x:(left+right)/2,y:(top+bottom)/2,width:right-left,depth:bottom-top,
        material:'masonry',height:box.height,cottageTile:index};
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

export function createCottageFire({buildings,obstacles,sampleWind,seed}){
  if(typeof sampleWind!=='function')throw Error('The Ashland pair requires its checked wind sampler');
  const lots=COTTAGE_IDS.map((id,i)=>{
    const building=buildings.find(b=>b.id===id);
    const x=COTTAGE_ORIGIN.x+i*COTTAGE_OFFSET.x,z=COTTAGE_ORIGIN.z+i*COTTAGE_OFFSET.z;
    if(!building||building.prefabId!=='ashland-worker'||building.quarterTurns!==0||building.x!==x||building.y!==z)throw Error('Cottage placement must match the pinned pair bake');
    const topology=createCottageTopology(building,sampleWind);
    return {...topology,building,tiles:makeTiles(),colliders:obstacles.filter(o=>o.buildingId===id),firstIgnition:null,
      deadline:null,nextWave:Infinity,waves:0,fallen:new Set(),drops:[],retiredAt:null,lastJoist:null};
  });
  const byBuilding=new Map(lots.map(l=>[l.building.id,l]));
  const byObstacle=new Map(obstacles.map(o=>[o.id,o]));
  const embers=[];
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
  function ignite(lot,site,time,event){
    const p=point(lot,site);
    if(lot.firstIgnition===null){
      lot.firstIgnition={cellId:site.id,face:site.face,layer:site.layer,time,kind:site.ignitionKind};
      lot.deadline=time+COTTAGE_BURN_SECONDS;lot.nextWave=time+4.4;
    }
    if(site.layer==='lower'&&site.ignitionKind==='falling-fuel'&&lot.lastJoist===null){
      // A heavier lower member catches from the actual falling fuel and
      // outlasts the boards around it. It remains a single live support.
      lot.lastJoist=site.tile;
      site.burnSeconds=Math.max(site.fuel.seconds,lot.deadline-time);
    }
    event('cottage-ignition',p,{buildingId:lot.building.id,cellId:site.id,layer:site.layer,face:site.face,
      worldTime:time,cause:site.ignitionKind,parentCellId:site.parentId,sourceId:site.cause?.sourceId??null,heat:site.heat});
  }
  function heatBlast(origin,blast,cause){
    for(const lot of lots)for(const site of lot.walls)if(!site.band&&present(lot,site)){
      heatBlastSiding(site,worldSurface(lot.building,site),1,origin,blast,obstacles,cause);
    }
  }
  function exchangeGround(field,dt,time){
    for(const lot of lots){
      if(lot.building.destroyed||lot.deadline!==null&&time+EPS>=lot.deadline)continue;
      for(const s of lot.walls){
        if(!s.band&&present(lot,s))exchangeSurfaceGround(s,worldSurface(lot.building,s),field,obstacles,dt,time,'cottage-siding');
      }
    }
  }
  function retire(lot,tile,layer){
    lot.tiles[tile][layer]=false;
    if(layer==='lower')lot.tiles[tile].ash=1;
    for(const s of lot.sites)if(s.tile===tile&&layerFor(s)===layer)s.phase='spent';
  }
  function applyMasks(lot){
    let live=0;
    for(const tile of lot.tiles)live+=Number(tile.roof)+Number(tile.upper)+Number(tile.lower);
    lot.building.burnedFraction=1-live/(lot.tiles.length*3);
    for(const o of lot.colliders){
      const tile=lot.tiles[o.cottageTile];
      o.destroyed=lot.building.destroyed||(tile&&!tile.roof&&!tile.upper&&!tile.lower)||false;
      if(tile&&!o.destroyed)o.height=tile.roof?EAVE:tile.upper?EAVE:UPPER;
    }
  }
  function settleLooseSupports(lot,time){
    if(lot.deadline===null||lot.deadline-time>2)return;
    const limit=4+Math.floor((lot.tiles.length*3-4)*cap((lot.deadline-time-.25)/1.75));
    let live=0;
    for(const tile of lot.tiles)live+=Number(tile.roof)+Number(tile.upper)+Number(tile.lower);
    for(const layer of ['roof','upper','lower'])for(const tile of lot.tiles){
      if(live<=limit)return;
      if(!tile[layer]||layer==='lower'&&tile.index===lot.lastJoist)continue;
      retire(lot,tile.index,layer);live--;
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
      retire(lot,s.tile,layer);
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
    for(const lot of lots){
      if(lot.building.destroyed)continue;
      if(lot.deadline!==null&&time+EPS>=lot.deadline){
        for(const tile of lot.tiles)for(const layer of ['roof','upper','lower'])if(tile[layer])retire(lot,tile.index,layer);
        lot.building.destroyed=true;lot.retiredAt=lot.deadline;lot.drops=[];
        applyMasks(lot);
        event('building-burnout',lot.building,{buildingId:lot.building.id,worldTime:lot.deadline});
      }
    }
    transport(dt,time,event);
    for(const lot of lots){
      if(lot.building.destroyed)continue;
      moveDebris(lot,time,event);
      stepSurfaceFire(lot.sites,dt,time,s=>present(lot,s),s=>ignite(lot,s,time,event),s=>{
        if(s.layer!=='walls')retire(lot,s.tile,s.layer);
      });
      releaseDebris(lot,time,event);settleLooseSupports(lot,time);applyMasks(lot);spawn(lot,time);
    }
  }
  function snapshot(time){
    return {version:1,worldTime:time,buildings:lots.map(lot=>({
      id:lot.building.id,x:lot.building.x,z:lot.building.y,firstIgnition:lot.firstIgnition&&{...lot.firstIgnition},
      deadline:lot.deadline,retiredAt:lot.retiredAt,gone:lot.building.destroyed,char:lot.building.burnedFraction,
      tiles:lot.tiles.map(t=>({...t})),
      preheat:lot.walls.filter(s=>s.phase==='cold'&&Number.isFinite(s.heat)&&s.heat>0&&present(lot,s))
        .map(({id,x,y,z,nx,ny,nz,heat})=>({id,x,y,z,nx,ny,nz,heatFraction:cap(heat/IGNITION)})),
      cells:lot.sites.filter(s=>s.ignitedAt!==null).map(s=>{
        const flame=burning(lot,s)?flameAt(s,time):0,age=time-s.ignitedAt;
        return {id:s.id,face:s.face,layer:s.layer,part:s.layer==='upper'||s.layer==='lower'?'ground':s.layer,tile:s.tile,
          x:s.x,y:s.y,z:s.z,nx:s.nx,ny:s.ny,nz:s.nz,...s.anchor,ignitionTime:s.ignitedAt,parentId:s.parentId,
          cause:s.ignitionKind,flame,smoke:flame*cap((age-.12)/.55)*.56};
      }),
      drops:lot.drops.map(d=>({id:d.id,kind:d.kind,x:d.x,y:d.y,z:d.z,rx:0,ry:.16,rz:d.landedAt===null?.23:0,
        state:d.landedAt===null?'falling':'landed',ignitionTime:d.ignitionTime,flame:d.heat*(1-cap((time-d.releaseTime-1.3)/2.7)),
        smoke:.4*d.heat*(1-cap((time-d.releaseTime-1.7)/2.3))}))
    })),embers:embers.map(({id,x,y,z,vx,vy,vz,heat,sourceBuildingId})=>({id,x,y,z,vx,vy,vz,heat,sourceBuildingId})),
    diagnostics:{launches,hotRoofContacts,coolRoofContacts,misses,maxEmbers:COTTAGE_EMBER_LIMIT,sidingIgnitionHeat:IGNITION,
      warmingSiding:lots.flatMap(lot=>lot.walls.filter(s=>!s.band&&s.phase==='cold'&&s.heat>EPS&&present(lot,s))
        .map(s=>({buildingId:lot.building.id,cellId:s.id,heat:s.heat})))}};
  }
  function samples(time){
    return lots.flatMap(lot=>lot.sites.filter(s=>present(lot,s)).map(s=>{
      const tile=lot.tiles[s.tile];
      return surfaceSample(lot.building,s,time,s.layer==='walls'||s.layer==='roof'||!tile.roof&&(s.layer==='upper'||!tile.upper));
    }).filter(Boolean));
  }
  return {igniteSiding,heatSurface,heatDischarge,heatBlast,exchangeGround,step,snapshot,samples};
}
