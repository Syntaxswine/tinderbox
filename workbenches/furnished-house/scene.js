import {bounds,centre,triangleArea,clipTriangle,unit,cross,sub,createBoundaryIndex,extrudePlane,EPS} from './geometry.js';
import {prepareFurnishedData} from './prepare-data.js';

export const CELL=[.5,1.06,.5], STEP=1/30;
export const DEFAULT_PROFILES=Object.freeze({
  grass:{threshold:.85,delay:.18,seconds:3,energy:110},
  oil:{threshold:.6,delay:0,seconds:14,energy:800},
  clapboard:{threshold:1.1,delay:5,seconds:180,energy:3420},
  partition:{threshold:1.1,delay:5,seconds:180,energy:2200},
  door:{threshold:1.1,delay:5,seconds:60,energy:1000},
  roof:{threshold:1.1,delay:3,seconds:180,energy:1980},
  frame:{threshold:1.3,delay:3,seconds:180,energy:2250},
  furniture:{threshold:1.1,delay:3,seconds:60,energy:1200},
  cloth:{threshold:.8,delay:.5,seconds:20,energy:600},
  lacquer:{threshold:.5,delay:0,seconds:4,energy:120},
  coal:{threshold:1.6,delay:15,seconds:300,energy:1800},
  embers:{threshold:.7,delay:0,seconds:8,energy:500}
});
const PASS={air:1,glass:.05,timber:.02,wood:.02,masonry:0,stone:0,brick:0,iron:0,metal:0};
const combustible=m=>/wood|oak|timber|cloth|linen|wool|oil|coal|lacquer|shingle|clapboard/i.test(typeof m==='string'?m:JSON.stringify(m));
export function compileScene(data,{profiles={}}={}) {
  data=prepareFurnishedData(data);
  if(data.version!==1||!Array.isArray(data.surfaces))throw Error('Expected version-1 artist house data');
  const origin=data.gridOrigin||[0,.48,0],pitch=data.thermalCell||CELL,cells=new Map(),fuels=new Map(),items=new Map(),parts=new Map(),boundaries=[];
  const profile={...DEFAULT_PROFILES,...profiles};let fuelTotal=0;
  const key=c=>c.join(',');
  const coords=p=>p.map((v,i)=>Math.floor((v-origin[i])/pitch[i]+EPS));
  const position=c=>c.map((v,i)=>origin[i]+(v+.5)*pitch[i]);
  function cell(c) {const id=key(c);if(!cells.has(id))cells.set(id,{id,c:[...c],position:position(c),heat:0,incoming:0,capacity:.25,fuels:[],links:null,lit:false});return cells.get(id);}
  const cellAt=p=>cell(coords(p));
  function addFuel(input) {
    if(fuels.has(input.id))throw Error(`Duplicate fuel ${input.id}`);
    if(!profile[input.cls])throw Error(`Unknown physical fuel class ${input.cls}`);
    const f={amount:0,char:0,lit:false,litAt:null,spentAt:null,falling:false,lastBurnTick:-1,...input};f.initial=f.amount;
    if(!Number.isFinite(f.amount)||f.amount<0)throw Error(`Invalid finite fuel ${f.id}`);
    fuelTotal+=f.amount;fuels.set(f.id,f);
    f.cells??=[cellAt(f.position)];for(const c of f.cells)c.fuels.push(f);
    return f;
  }
  // Clip physical planes to thermal boxes. Boundaries retain exact triangles;
  // no stretched room boxes or one-metre lookup replaces the source shape.
  for(const s of data.surfaces) {
    const triangles=s.triangles;if(!triangles?.length)continue;
    const box=bounds(triangles.flat()),normal=s.normal||unit(cross(sub(triangles[0][1],triangles[0][0]),sub(triangles[0][2],triangles[0][0])));
    const axis=normal.map(Math.abs).indexOf(Math.max(...normal.map(Math.abs))),lo=coords(box.min),hi=coords(box.max);
    // A plane exactly on a cell edge belongs to one canonical patch, not two.
    for(let i=0;i<3;i++)if(box.max[i]-box.min[i]<EPS)hi[i]=lo[i];else hi[i]=Math.ceil((box.max[i]-origin[i])/pitch[i]-EPS)-1;
    for(let z=lo[2];z<=hi[2];z++)for(let y=lo[1];y<=hi[1];y++)for(let x=lo[0];x<=hi[0];x++) {
      const c=[x,y,z],clipBox={min:c.map((v,i)=>origin[i]+v*pitch[i]-EPS),max:c.map((v,i)=>origin[i]+(v+1)*pitch[i]+EPS)},clipped=triangles.flatMap(t=>clipTriangle(t,clipBox)),area=clipped.reduce((a,t)=>a+triangleArea(t),0);
      if(area<EPS)continue;
      const p=centre(clipped.flat()),single=[0,1,2].every(i=>lo[i]===hi[i]),id=single?s.id:`${s.id}@${key(c)}`,mat=typeof s.material==='string'?s.material:s.material?.physical||s.material?.id||'timber';
      const b={...s,id,sourceSurfaceId:s.id,triangles:clipped,normal,area,position:p,bounds:bounds(clipped.flat()),intact:true,openFraction:0,transmission:PASS[mat]??(combustible(mat)?.02:0),supports:s.kind==='floor'||s.kind==='roof'||s.kind==='ground'||s.kind==='plinth'&&normal[1]>.2||s.supports===true};
      if(s.kind==='floor') {
        const offset=[0,-(s.thickness||.12),0],edges=new Map();
        for(const triangle of clipped)for(let i=0;i<3;i++){const a=triangle[i],end=triangle[(i+1)%3],key=[a.join(','),end.join(',')].sort().join('|');if(edges.has(key))edges.delete(key);else edges.set(key,[a,end]);}
        const underside=clipped.map(t=>[...t].reverse().map(p=>p.map((v,i)=>v+offset[i]))),sides=[...edges.values()].flatMap(([a,end])=>{const c=end.map((v,i)=>v+offset[i]),d=a.map((v,i)=>v+offset[i]);return [[a,end,c],[a,c,d]];});
        b.solidTriangles=[...clipped,...underside,...sides];b.bounds=bounds(b.solidTriangles.flat());
      } else if(['wall','roof','window'].includes(s.kind)&&mat!=='air'&&s.thickness>0) {
        b.solidTriangles=extrudePlane(clipped,normal,-s.thickness/2,s.thickness/2);b.bounds=bounds(b.solidTriangles.flat());
      } else if(s.physicalShape==='source-closed-mesh') {
        // Thermal fragments share the actual source exterior. Do not leave a
        // complete uncut collider in every fragment after local retirement.
        b.solidTriangles=clipped;b.closedShape=single;b.bounds=bounds(clipped.flat());
      }
      const sign=normal.find(v=>Math.abs(v)>1e-6)<0?-1:1,oriented=normal.map(v=>Math.round(v*sign*1e6)/1e6);b.sheetKey=[...(data.sandbox?.version===1||data.catalogueModules?.version===1?[s.instanceId]:[]),s.kind,s.level??'',...oriented,Math.round(dotPlane(normal,clipped[0][0])*sign*1e6)/1e6].join(':');
      boundaries.push(b);
      const amount=Number(s.fuelAmount??(combustible(mat)?triangles.reduce((a,t)=>a+triangleArea(t),0):0))*area/triangles.reduce((a,t)=>a+triangleArea(t),0);
      const cls=s.fuelClass||({floor:'frame',wall:'partition',roof:'roof',door:'door'}[s.kind]);
      if(amount>EPS&&cls) {
        const exposed=(cls==='grass'?[1]:[-1,1]).map(sign=>cellAt(p.map((v,i)=>v+normal[i]*sign*.01))),unique=[...new Set(exposed)];
        const f=addFuel({id:`fuel:${id}`,cls,amount,area,position:p,boundaryId:id,sourceSurfaceId:s.id,normal,cells:unique,level:s.level,supports:b.supports});b.fuelId=f.id;
      }
      b.heatCells=[...new Set([-1,1].map(sign=>cellAt(p.map((v,i)=>v+normal[i]*sign*.01))))];cell(c);
    }
  }
  const index=createBoundaryIndex(boundaries);
  // An explicitly declared ground plane provides support. It is not the
  // source kernel's special k=0 rule and does not seal an upper floor void.
  const groundY=data.groundY??0,houseBox=bounds(data.surfaces.flatMap(s=>s.triangles?.flat()||[]));
  const ground={id:'terrain:ground',sourceSurfaceId:'terrain:ground',kind:'ground',normal:[0,1,0],supports:true,transmission:0,thickness:.12,triangles:[[[houseBox.min[0]-10,groundY,houseBox.min[2]-10],[houseBox.max[0]+10,groundY,houseBox.min[2]-10],[houseBox.max[0]+10,groundY,houseBox.max[2]+10]],[[houseBox.min[0]-10,groundY,houseBox.min[2]-10],[houseBox.max[0]+10,groundY,houseBox.max[2]+10],[houseBox.min[0]-10,groundY,houseBox.max[2]+10]]]};index.put(ground);
  for(const item of data.items||[])items.set(item.id,{...item,position:[...(item.position||[0,0,0])],initialPosition:[...(item.position||[0,0,0])],intact:true,falling:false});
  const storeByPart=new Map((data.stores||[]).map(s=>[s.fuelPartId,s]));
  for(const part of data.furnitureParts||[]) {
    const store=storeByPart.get(part.id),amount=Number(store?.amount??part.fuelAmount??0),box=part.bounds,p=centre([box.min,box.max]);
    parts.set(part.id,{...part,intact:true,fuelId:amount>0&&part.fuelClass?part.id:null,solid:!part.proceduralStoreContents});
    if(!items.has(part.itemId))items.set(part.itemId,{id:part.itemId,position:[...p],initialPosition:[...p],intact:true,falling:false,level:part.level,bounds:part.bounds});
    if(amount<=0||!part.fuelClass)continue;
    const size=box.max.map((v,i)=>v-box.min[i]);
    const f=addFuel({id:part.id,itemId:part.itemId,cls:part.fuelClass,amount,area:Math.max(.01,2*(size[0]*size[1]+size[0]*size[2]+size[1]*size[2])),position:p,normal:[0,1,0],bounds:box,store:store?{...store,reacted:false}:null,supportSurfaceIds:part.supportSurfaceIds||[],level:part.level,finish:part.finish});
    if(part.finish?.amount>0)addFuel({...f,id:`${part.id}:finish`,cls:part.finish.fuelClass==='varnish'?'lacquer':part.finish.fuelClass,amount:part.finish.amount,physicalFinish:true,coreFuelId:f.id,store:null,cells:[...f.cells],finish:part.finish});
  }
  // Allocate neighbouring air once. The heat rule reads cells/fuels/boundaries;
  // room and building labels never select a spread path.
  for(const c of [...cells.values()])for(let z=-1;z<=1;z++)for(let y=-1;y<=1;y++)for(let x=-1;x<=1;x++)cell(c.c.map((v,i)=>v+[x,y,z][i]));
  for(const opening of data.openings||[]) {
    for(const b of index.surfaces.values())if(b.sourceSurfaceId===opening.surfaceId) {b.openingId=opening.id;b.openFraction=opening.openFraction??opening.initialOpenFraction??0;b.opening=opening;if(opening.kind==='door'){b.closedTriangles=b.triangles;b.closedNormal=b.normal;b.actualDoorPose=true;poseDoor(b,b.openFraction);}}
  }
  function poseDoor(b,fraction) {
    const angle=(b.opening.maxOpenAngle||Math.PI/2)*fraction,cos=Math.cos(angle),sin=Math.sin(angle),pivot=b.opening.pivot;
    const rotate=p=>{const x=p[0]-pivot[0],z=p[2]-pivot[2];return [pivot[0]+cos*x+sin*z,p[1],pivot[2]-sin*x+cos*z];},n=b.closedNormal,normal=[n[0]*cos+n[2]*sin,n[1],-n[0]*sin+n[2]*cos],plane=b.closedTriangles.map(t=>t.map(rotate)),solidTriangles=extrudePlane(plane,normal,-(b.thickness||.12)/2,(b.thickness||.12)/2);
    index.change(b.id,{openFraction:fraction,solidTriangles,bounds:bounds(solidTriangles.flat()),position:centre(plane.flat()),normal});
    const f=fuels.get(b.fuelId);if(f){for(const c of f.cells)c.fuels=c.fuels.filter(value=>value!==f);f.position=b.position;f.normal=normal;f.cells=[...new Set([-1,1].map(sign=>cellAt(b.position.map((v,i)=>v+normal[i]*sign*.08))))];if(f.lit)f.burningCell=f.cells.reduce((a,b)=>a.heat>=b.heat?a:b);for(const c of f.cells)c.fuels.push(f);}
  }
  return {data,origin,pitch,profile,cells,fuels,items,parts,index,coords,position,cell,cellAt,key,initialFuel:fuelTotal,groundY,houseBox,addFuel,poseDoor};
}
const dotPlane=(a,b)=>a[0]*b[0]+a[1]*b[1]+a[2]*b[2];
