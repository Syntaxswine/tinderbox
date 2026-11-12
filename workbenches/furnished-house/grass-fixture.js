import {bounds,triangleArea,clipPolygon,EPS} from './geometry.js';

export const GRASS_FIXTURE_DEFAULTS=Object.freeze({extent:3,fuelPerSquareMetre:1});
export const isGrassId=id=>typeof id==='string'&&(id.startsWith('grass-ground/')||id.startsWith('fuel:grass-ground/'));
const area=polygon=>polygon.slice(1,-1).reduce((sum,p,i)=>sum+triangleArea([polygon[0],p,polygon[i+2]]),0);
const triangles=polygon=>polygon.slice(1,-1).map((p,i)=>[polygon[0],p,polygon[i+2]]).filter(t=>triangleArea(t)>EPS);
function clip(poly,metric,inside){
  const out=[];for(let i=0;i<poly.length;i++){const a=poly[i],b=poly[(i+1)%poly.length],da=metric(a)*(inside?1:-1),db=metric(b)*(inside?1:-1),ia=da>=-1e-10,ib=db>=-1e-10;if(ia)out.push(a);if(ia!==ib){const f=da/(da-db);out.push(a.map((v,k)=>v+f*(b[k]-v)));}}
  return out;
}
// Partition only the outside of a convex triangle. Applying these cuts in
// order subtracts the exact occupied union without overlapping grass fuel.
export function subtractOccupied(poly,t){
  const sign=Math.sign((t[1][0]-t[0][0])*(t[2][2]-t[0][2])-(t[1][2]-t[0][2])*(t[2][0]-t[0][0]));if(!sign)return [poly];
  let rest=poly;const out=[];
  for(let i=0;i<3&&rest.length>=3;i++){const a=t[i],b=t[(i+1)%3],metric=p=>sign*((b[0]-a[0])*(p[2]-a[2])-(b[2]-a[2])*(p[0]-a[0])),outside=clip(rest,metric,false);if(outside.length>=3&&area(outside)>EPS)out.push(outside);rest=clip(rest,metric,true);}
  return out;
}

export function buildGrassFixture(base,{enabled=false,extent=3}={}){
  if(!enabled)return {data:base,metadata:{version:1,kind:'control',enabled:false}};
  if(!Number.isFinite(extent)||extent<=0||extent>3)throw Error('This bounded trial supports a positive extent of at most 3m.');
  if(base.surfaces.some(s=>isGrassId(s.id)))throw Error('Grass fixture already applied');
  const groundY=base.groundY??0,origin=base.gridOrigin||[0,.48,0],pitch=base.thermalCell||[.5,1.06,.5],occupied=[],keys=new Set(),sources=[];
  function project(id,kind,sourceTriangles){let count=0;for(const source of sourceTriangles){const t=source.map(p=>[p[0],groundY,p[2]]);if(triangleArea(t)<=EPS)continue;const key=t.map(p=>p.map(v=>Math.round(v*1e7)).join(',')).sort().join('|');if(keys.has(key))continue;keys.add(key);occupied.push({sourceId:id,kind,triangle:t,bounds:bounds(t)});count++;}if(count)sources.push({id,kind,projectedTriangles:count});}
  for(const s of base.surfaces){const box=s.bounds||bounds(s.triangles.flat());if(s.kind==='floor'&&s.level===0||s.kind==='plinth'&&box.min[1]<=groundY+1e-6)project(s.id,s.supportType||s.kind,s.triangles);}
  const meshInfo=new Map((base.sourceMeshes||[]).map(m=>[m.id,m]));
  for(const g of base.render?.geometry||[]){const m=meshInfo.get(g.id);if(m?.bounds?.min[1]<=groundY+1e-6)project(g.id,'ground-contact-mesh',g.triangles.map(t=>t.vertices.map(v=>v.slice(0,3))));}
  if(!occupied.length)throw Error('No measured occupied footprint');
  const box=bounds(occupied.flatMap(p=>p.triangle)),outer={min:[box.min[0]-extent,groundY,box.min[2]-extent],max:[box.max[0]+extent,groundY,box.max[2]+extent]},added=[];
  const lo=[Math.floor((outer.min[0]-origin[0])/pitch[0]),Math.floor((outer.min[2]-origin[2])/pitch[2])],hi=[Math.ceil((outer.max[0]-origin[0])/pitch[0]),Math.ceil((outer.max[2]-origin[2])/pitch[2])];
  for(let z=lo[1];z<hi[1];z++)for(let x=lo[0];x<hi[0];x++){
    const left=origin[0]+x*pitch[0],front=origin[2]+z*pitch[2];let poly=[[left,groundY,front],[left+pitch[0],groundY,front],[left+pitch[0],groundY,front+pitch[2]],[left,groundY,front+pitch[2]]];
    for(const axis of [0,2])poly=clipPolygon(clipPolygon(poly,axis,outer.min[axis],true),axis,outer.max[axis],false);
    if(poly.length<3)continue;const cellBox=bounds(poly);let pieces=[poly];
    for(const o of occupied){if(o.bounds.min[0]>cellBox.max[0]+EPS||o.bounds.max[0]<cellBox.min[0]-EPS||o.bounds.min[2]>cellBox.max[2]+EPS||o.bounds.max[2]<cellBox.min[2]-EPS)continue;pieces=pieces.flatMap(p=>subtractOccupied(p,o.triangle));if(!pieces.length)break;}
    for(const [i,p]of pieces.entries()){const a=area(p);if(a<=EPS)continue;const ts=triangles(p);added.push({id:`grass-ground/${x},${z}/${i}`,kind:'ground',presentationKind:'grass-ground',level:0,normal:[0,1,0],thickness:0,material:'timber',fuelClass:'grass',fuelAmount:a*GRASS_FIXTURE_DEFAULTS.fuelPerSquareMetre,area:a,triangles:ts,bounds:bounds(ts.flat()),sourceMeshBindings:[]});}
  }
  const grassArea=added.reduce((sum,s)=>sum+s.area,0),metadata={version:1,kind:'grass',enabled:true,extent,extentDefinition:`Axis-aligned ${extent}m padding of measured occupied extents, clipped to the thermal grid and subtracting exact occupied polygons; not a circular buffer.`,groundY,gridOrigin:origin,thermalCell:pitch,occupiedBounds:box,lawnBounds:outer,houseBounds:bounds(base.surfaces.flatMap(s=>s.triangles.flat())),occupiedSources:sources,occupiedTriangles:occupied.map(o=>o.triangle),grassArea,addedFuel:grassArea,grassPatches:added.length,grassFuelPerSquareMetre:1,groundCellCentreY:origin[1]+(Math.floor((groundY+.01-origin[1])/pitch[1])+.5)*pitch[1],notes:['Native raised floor, plinth, porch, steps and overhang geometry remain immutable.','Roof/window projections above ground do not erase otherwise unoccupied turf.','Grass has no new slab thickness, and spent patches persist as ash; the original terrain still supplies soil support.']};
  return {data:{...base,surfaces:[...base.surfaces,...added],comparisonFixture:metadata},metadata};
}

// Additive presentation contract; never feeds back into the physical trial.
export function grassFrame(frame,trial){
  if(!trial.scene.data.comparisonFixture?.enabled)return frame;
  const samples=new Map(frame.fireSamples.map(s=>[s.id,s])),ground=frame.boundaries.filter(b=>isGrassId(b.sourceSurfaceId)).map(b=>{const raw=trial.scene.index.surfaces.get(b.id),f=trial.scene.fuels.get(raw.fuelId),fire=samples.get(f.id);return {id:b.id,boundaryId:b.id,sourceSurfaceId:b.sourceSurfaceId,fuelId:f.id,triangles:b.triangles,position:f.position,phase:f.amount<=EPS?'ash':f.lit?'burning':f.char>0?'char':'fresh',fuelFraction:f.amount<=EPS?0:b.fuelFraction,charFraction:b.charFraction,heatFraction:b.heatFraction,flame:fire?.flame||0,smoke:fire?.smoke||0,ignitionTime:f.litAt};});
  return {...frame,grassGround:ground,fireSamples:frame.fireSamples.map(s=>isGrassId(s.id)?{...s,buildingId:'furnished-exterior-grass',part:'ground',grass:true}:s)};
}
