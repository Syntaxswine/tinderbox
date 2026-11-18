// Isolated static query pilot. No production registry/factory imports this API.
import {EPS,bounds,cross,sub,segmentTriangle,triangleArea} from '../../workbenches/furnished-house/geometry.js';
import {sweptCylinderClear} from './collision.js';

export const REGIONAL_QUERY_LIMITS=Object.freeze({parts:2,cellsPerPart:4096,records:8192,triangles:65536,views:16,receipts:324});
const BODY_EPS=1e-6,HALO=2*EPS,views=new WeakMap(),receipts=new WeakMap();
const vector=p=>Array.isArray(p)&&p.length===3&&p.every(Number.isFinite),key=c=>c.join(','),same=(a,b)=>a.length===b.length&&a.every((v,i)=>v===b[i]);
const text=value=>typeof value==='string'&&value.length>0&&value.length<=4096;
function staticData(value){let slots=0;const seen=new WeakSet(),limit=REGIONAL_QUERY_LIMITS.triangles*24+REGIONAL_QUERY_LIMITS.records*64+REGIONAL_QUERY_LIMITS.cellsPerPart*16;
  function visit(v,depth){if(++slots>limit||depth>32)throw Error('Static query data graph exceeds pilot bounds');if(typeof v==='function'||typeof v==='symbol'||typeof v==='string'&&v.length>4096)throw Error('Static query data only');if(!v||typeof v!=='object'||seen.has(v))return;seen.add(v);const proto=Object.getPrototypeOf(v);if(proto!==(Array.isArray(v)?Array.prototype:Object.prototype)&&proto!==null)throw Error('Plain static query data required');const properties=Object.getOwnPropertyDescriptors(v);if(Reflect.ownKeys(properties).some(k=>typeof k==='symbol'))throw Error('Plain static query fields required');if(Array.isArray(v)&&Object.keys(v).length!==v.length)throw Error('Dense original query arrays required');for(const [name,d]of Object.entries(properties)){if(d.get||d.set||name==='heatCells'||name==='cells')throw Error('Accessor/thermal-world query data is unavailable');visit(d.value,depth+1);}}
  visit(value,0);
}
function freeze(value,seen=new WeakSet()){if(value&&typeof value==='object'&&!seen.has(value)){seen.add(value);for(const v of Object.values(value))freeze(v,seen);Object.freeze(value);}return value;}
function triangles(value){if(!Array.isArray(value)||!value.length||value.some(t=>!Array.isArray(t)||t.length!==3||!t.every(vector)||!(triangleArea(t)>0)))throw Error('Finite nondegenerate original triangles required');return value;}
function physicalBounds(box,ts){if(!box||!vector(box.min)||!vector(box.max)||box.min.some((v,i)=>v>box.max[i])||ts.some(t=>t.some(p=>p.some((v,i)=>v<box.min[i]-EPS||v>box.max[i]+EPS))))throw Error('Original physical bounds do not cover their geometry');}
function checkedClosed(ts){const edges=new Map();for(const t of ts)for(let i=0;i<3;i++){const id=[key(t[i]),key(t[(i+1)%3])].sort().join('|');edges.set(id,(edges.get(id)||0)+1);}if(!ts.length||[...edges.values()].some(n=>n!==2))throw Error('Closed interior requires an original checked watertight mesh');}
const normal=t=>{const n=cross(sub(t[1],t[0]),sub(t[2],t[0])),length=Math.hypot(...n);return n.map(v=>v/length);};
const pass=r=>r.intact?(r.actualDoorPose?r.transmission:Math.max(0,Math.min(1,r.openFraction+(1-r.openFraction)*r.transmission))):1;
function polygonInBox(triangle,box){
  let poly=triangle;
  for(let axis=0;axis<3&&poly.length;axis++)for(const [edge,above]of [[box.min[axis],true],[box.max[axis],false]]){
    const out=[];for(let i=0;i<poly.length;i++){const a=poly[i],b=poly[(i+1)%poly.length],ia=above?a[axis]>=edge:a[axis]<=edge,ib=above?b[axis]>=edge:b[axis]<=edge;if(ia)out.push(a);if(ia!==ib){const fraction=(edge-a[axis])/(b[axis]-a[axis]),p=a.map((v,j)=>v+(b[j]-v)*fraction);p[axis]=edge;out.push(p);}}poly=out;
  }return poly;
}
const fan=poly=>poly.slice(1,-1).map((_,i)=>[poly[0],poly[i+1],poly[i+2]]);
const overlap=(a,b)=>a.min.every((v,i)=>v<=b.max[i]&&a.max[i]>=b.min[i]);
// Unchanged original boundary-index broad phase; its EPS differs from body EPS.
function segmentBox(from,to,b) {
  let low=0,high=1;
  for(let i=0;i<3;i++){const d=to[i]-from[i];if(Math.abs(d)<EPS){if(from[i]<b.min[i]-EPS||from[i]>b.max[i]+EPS)return false;}else{const a=(b.min[i]-EPS-from[i])/d,c=(b.max[i]+EPS-from[i])/d;low=Math.max(low,Math.min(a,c));high=Math.min(high,Math.max(a,c));if(low>high)return false;}}
  return true;
}
const floatBits=new DataView(new ArrayBuffer(8));
function nextFloat(value,up){if(value===0)return up?Number.MIN_VALUE:-Number.MIN_VALUE;floatBits.setFloat64(0,value);floatBits.setBigUint64(0,floatBits.getBigUint64(0)+((value>0)===up?1n:-1n));return floatBits.getFloat64(0);}

// Witness of capsule(XZ) intersect rectangle, not classification of its centre.
// The rectangle point nearest the segment is analytic; a convex interpolation
// towards its centre stays in the capsule with a strictly positive margin.
function bodyCellWitness(from,to,radius,minY,maxY,box){
  const low=Math.max(minY,box.min[1]),high=Math.min(maxY,box.max[1]);if(high<low||low===box.max[1])return null;
  const a=[from.x,from.y],b=[to.x,to.y],lo=[box.min[0],box.min[2]],hi=[box.max[0],box.max[2]],centre=lo.map((v,i)=>(v+hi[i])/2),threshold=radius-BODY_EPS;
  const pointDistance=(p,q)=>Math.hypot(p[0]-q[0],p[1]-q[1]),closest=(p,c,d)=>{const delta=d.map((v,i)=>v-c[i]),length=delta[0]**2+delta[1]**2,t=length?Math.max(0,Math.min(1,((p[0]-c[0])*delta[0]+(p[1]-c[1])*delta[1])/length)):0;return c.map((v,i)=>v+t*delta[i]);};
  if(pointDistance(centre,closest(centre,a,b))<threshold)return [centre[0],(low+high)/2,centre[1]];
  let enter=0,leave=1;for(let i=0;i<2;i++){const d=b[i]-a[i];if(d===0){if(a[i]<lo[i]||a[i]>hi[i]){enter=1;leave=0;break;}}else{const x=(lo[i]-a[i])/d,y=(hi[i]-a[i])/d;enter=Math.max(enter,Math.min(x,y));leave=Math.min(leave,Math.max(x,y));}}
  let nearest=null,distance=Infinity;
  const offer=(p,q)=>{const d=pointDistance(p,q);if(d<distance){distance=d;nearest=p;}};
  if(enter<=leave){const t=(enter+leave)/2;nearest=a.map((v,i)=>v+(b[i]-v)*t);distance=0;}
  else{
    const corners=[[lo[0],lo[1]],[hi[0],lo[1]],[hi[0],hi[1]],[lo[0],hi[1]]];
    for(let i=0;i<4;i++){const c=corners[i],d=corners[(i+1)%4];for(const p of [a,b])offer(closest(p,c,d),p);for(const p of [c,d])offer(p,closest(p,a,b));}
  }
  if(!(distance<threshold))return null;
  const towards=pointDistance(nearest,centre),fraction=towards?Math.min(.5,(threshold-distance)/(2*towards)):0,w=nearest.map((v,i)=>v+fraction*(centre[i]-v));
  if(!w.every((v,i)=>v>lo[i]&&v<hi[i])||!(pointDistance(w,closest(w,a,b))<threshold))throw Error('Unrepresentable strict swept-body/cell intersection witness');
  return [w[0],(low+high)/2,w[1]];
}

export function createRegionalQueryKernel(input){return createKernel(input);}
// Trusted bridge participant: its reader authenticates private producer slices.
// Detached views have no publication authority; only the coordinator owns that.
export function createRegionalQueryParticipant(input,{authenticate,generation=0}){
  if(typeof authenticate!=='function'||!Number.isSafeInteger(generation)||generation<0||input.nativeInventory?.length)throw Error('Cold authenticated query participant required');
  return createKernel(input,{authenticate,generation});
}
function createKernel({grid,sources,nativeInventory=[],sourceRevision},participant=null){
  if(!Array.isArray(sources)||!sources.length||sources.length>REGIONAL_QUERY_LIMITS.parts||!Array.isArray(nativeInventory)||nativeInventory.length>REGIONAL_QUERY_LIMITS.records)throw Error('Isolated static query pilot limit exceeded');
  let borrowed={grid,sources,nativeInventory};staticData(borrowed);
  if(!grid||!vector(grid.origin)||!vector(grid.pitch)||grid.pitch.some(v=>v<=0)||!text(sourceRevision))throw Error('Pinned original grid/revision required');
  const parts=new Map(),native=new Map(),coverageReceipts=new Set(),heldViews=new Set();let generation=participant?.generation??0,revision=0,closed=false,totalTriangles=0;
  const coords=p=>p.map((v,i)=>Math.floor((v-grid.origin[i])/grid.pitch[i]+EPS));
  const edges=[new Map(),new Map(),new Map()];
  function edge(axis,c){if(edges[axis].has(c))return edges[axis].get(c);let value=grid.origin[axis]+(c-EPS)*grid.pitch[axis],steps=0;const classify=v=>Math.floor((v-grid.origin[axis])/grid.pitch[axis]+EPS);while(classify(value)<c&&steps++<8)value=nextFloat(value,true);while(classify(nextFloat(value,false))>=c&&steps++<8)value=nextFloat(value,false);if(steps>=8||classify(value)!==c||classify(nextFloat(value,false))!==c-1)throw Error('Unrepresentable original floating cell boundary');edges[axis].set(c,value);return value;}
  const cellBox=c=>({min:c.map((v,i)=>edge(i,v)),max:c.map((v,i)=>edge(i,v+1))});
  function validCell(p,c){if(!Array.isArray(c)||c.length!==3||!c.every(Number.isSafeInteger)||!c.every((v,i)=>v>=p.min[i]&&v<=p.max[i]))throw Error('Unknown/off-grid original query cell');return key(c);}
  for(const spec of sources){
    if(!text(spec.partRef?.id)||!text(spec.partRef.carrierId)||parts.has(spec.partRef.id)||typeof spec.closed!=='boolean'||spec.closed!==spec.partRef.closed||!text(spec.rayRecord?.id)||spec.rayRecord.sourceCarrierId!==spec.partRef.carrierId||spec.rayRecord.nativePartId!==spec.partRef.id||!text(spec.rayRecord.sourceSurfaceId)||typeof spec.rayRecord.intact!=='boolean'||![spec.rayRecord.transmission,spec.rayRecord.openFraction].every(Number.isFinite))throw Error('Original static part/query ownership required');
    totalTriangles+=(spec.surfaceTriangles?.length||0)+(spec.solidTriangles?.length||0);if(totalTriangles>REGIONAL_QUERY_LIMITS.triangles)throw Error('Original query triangle ceiling exceeded');
    const surface=triangles(spec.surfaceTriangles),solid=triangles(spec.solidTriangles),box=bounds(solid.flat());if(spec.closed)checkedClosed(solid);
    if(spec.rayRecord.triangles!==surface||spec.rayRecord.solidTriangles&&spec.rayRecord.solidTriangles!==solid)throw Error('Original ray channel must reference its admitted surface/solid geometry');
    physicalBounds(spec.rayRecord.bounds,[...surface,...solid]);if(spec.partRef.bounds)physicalBounds(spec.partRef.bounds,solid);
    const min=coords(box.min),max=box.max.map((v,i)=>box.max[i]-box.min[i]<EPS?min[i]:Math.ceil((v-grid.origin[i])/grid.pitch[i]-EPS)-1);let count=1;
    if(![...min,...max,...max.map(v=>v+1)].every(Number.isSafeInteger))throw Error('Unsafe original query span');for(let i=0;i<3;i++){const n=max[i]-min[i]+1;if(!Number.isSafeInteger(n)||n<1||n>REGIONAL_QUERY_LIMITS.cellsPerPart||count>Math.floor(REGIONAL_QUERY_LIMITS.cellsPerPart/n))throw Error('Original query cell catalogue exceeds static pilot limit');count*=n;}
    const catalogue={min:min.map((v,i)=>grid.origin[i]+v*grid.pitch[i]-HALO),max:max.map((v,i)=>grid.origin[i]+(v+1)*grid.pitch[i]+HALO)};
    if(surface.some(t=>t.some(p=>p.some((v,i)=>v<catalogue.min[i]||v>catalogue.max[i]))))throw Error('Source surface geometry extends beyond its original cell catalogue halo');
    for(let i=0;i<3;i++)for(let c=min[i];c<=max[i]+1;c++)edge(i,c);
    parts.set(spec.partRef.id,{spec,surface,solid,ray:spec.rayRecord.solidTriangles||surface,rayChannel:spec.rayRecord.solidTriangles?'solid':'surface',box,min,max,count,records:new Map(),cells:new Map()});
  }
  function admit(entry,inventory){
    const r=entry.record,p=parts.get(r?.nativePartId);if(!p||r.sourceCarrierId!==p.spec.partRef.carrierId||!text(r.sourceSurfaceId)||!text(r.id)||native.has(r.id)||typeof r.intact!=='boolean'||![r.transmission,r.openFraction].every(Number.isFinite))throw Error('Static original native physical ownership required');
    if(inventory.has(r.id))throw Error('Duplicate original native query ID');
    validCell(p,entry.cell);const surface=triangles(r.triangles),solid=triangles(r.solidTriangles||r.triangles);if(r.closedShape!==false)checkedClosed(solid);
    physicalBounds(r.bounds,[...surface,...solid]);
    const canonical={min:entry.cell.map((v,i)=>grid.origin[i]+v*grid.pitch[i]-HALO),max:entry.cell.map((v,i)=>grid.origin[i]+(v+1)*grid.pitch[i]+HALO)};
    if([...surface,...solid].some(t=>t.some(v=>v.some((n,i)=>n<canonical.min[i]||n>canonical.max[i]))))throw Error('Native surface/solid geometry extends beyond representable original cell halo');
    return {entry,p,surface,solid,box:bounds(solid.flat())};
  }
  for(const entry of nativeInventory){
    const value=admit(entry,native),{p,surface,solid}=value;totalTriangles+=surface.length+solid.length;if(totalTriangles>REGIONAL_QUERY_LIMITS.triangles)throw Error('Original query triangle ceiling exceeded');native.set(entry.record.id,value);p.records.set(entry.record.id,value);const id=key(entry.cell);if(!p.cells.has(id))p.cells.set(id,[]);p.cells.get(id).push(entry.record.id);
  }
  if(totalTriangles>REGIONAL_QUERY_LIMITS.triangles)throw Error('Original query triangle ceiling exceeded');
  freeze(borrowed);borrowed=null;
  function live(){if(closed)throw Error('Regional query kernel disposed');}
  const baseRecords=new Map([...parts].map(([id,p])=>[id,p.records]));
  function makeView(domains=new Map(),retired=new Set(),inventory=native,byPart=baseRecords,triangleCount=totalTriangles,viewRevision=revision){if(heldViews.size>=REGIONAL_QUERY_LIMITS.views)throw Error('Release old isolated query views before publishing more');const token=Object.freeze({kind:'isolated-regional-effective-view',sourceRevision,generation,revision:viewRevision});const state={domains,retired,inventory,byPart,triangleCount,generation,released:false};views.set(token,{kernel,state});heldViews.add(state);return token;}
  function read(view){live();const value=views.get(view);if(!value||value.kernel!==kernel||value.state.generation!==generation||value.state.released)throw Error('Unknown/stale regional query view');return value.state;}
  let current;
  const domainKey=(partId,c)=>partId+'@'+key(c),status=(state,p,c)=>state.domains.get(domainKey(p.spec.partRef.id,c))||'cold';
  function pointOwnership(p,point){const hitCell=coords(point),cell=hitCell.map((v,i)=>Math.max(p.min[i],Math.min(p.max[i],v))),outerHalo=!same(hitCell,cell);if(outerHalo){const b=cellBox(cell);if(point.some((v,i)=>v<b.min[i]-HALO||v>b.max[i]+HALO))return null;}return {cell,hitCell,outerHalo};}
  function pointDomain(state,p,point){const owner=pointOwnership(p,point);return owner?status(state,p,owner.cell):'outside';}
  // The original full-span upper edge is assigned to its last source cell.
  // Keep its original faces/query halo without adding an outside domain claim.
  function faceBox(p,c){const b=cellBox(c);return {min:b.min.map((v,i)=>v-(c[i]===p.min[i]?HALO:0)),max:b.max.map((v,i)=>v+(c[i]===p.max[i]?HALO:0))};}
  // Containment has the ORIGINAL body's metric EPS and barycentric EPS, not
  // the smaller geometric halo. This is a broad phase/probe envelope only:
  // unchanged original closed-mesh predicates still decide occupancy.
  const bodyProbeBounds=box=>({min:box.min.map((v,i)=>v-BODY_EPS*(1+2*(box.max[i]-v))),max:box.max.map((v,i)=>v+BODY_EPS*(1+2*(v-box.min[i])))});
  function bodyWitnessBox(p,c,shapeBox){const b=cellBox(c),probe=bodyProbeBounds(shapeBox);return {min:b.min.map((v,i)=>c[i]===p.min[i]?Math.min(v,probe.min[i]):v),max:b.max.map((v,i)=>c[i]===p.max[i]?Math.max(v,probe.max[i]):v)};}
  function cellsIn(p,box){const lo=coords(box.min).map((v,i)=>Math.max(p.min[i],v-1)),hi=coords(box.max).map((v,i)=>Math.min(p.max[i],v+1)),out=[];for(let z=lo[2];z<=hi[2];z++)for(let y=lo[1];y<=hi[1];y++)for(let x=lo[0];x<=hi[0];x++)out.push([x,y,z]);return out;}
  function facePieces(state,{channel,box,includeInactive=false,partId,domain,visit}={}){
    if(!['surface','solid'].includes(channel))throw Error('Explicit original surface/solid channel required');const out=[];
    for(const p of parts.values())if(!partId||p.spec.partRef.id===partId){
      const offer=(record,ts,kind,sourceCell=null)=>{
        if(domain&&kind!==domain)return;
        if(!includeInactive&&record.intact===false)return;
        for(let i=0;i<ts.length;i++){
          const t=ts[i],b=bounds(t);if(box&&!overlap(b,box))continue;
          const scope=box?{min:b.min.map((v,i)=>Math.max(v,box.min[i])),max:b.max.map((v,i)=>Math.min(v,box.max[i]))}:b;
          for(const c of cellsIn(p,scope))if(status(state,p,c)===kind){const cb=faceBox(p,c),poly=polygonInBox(t,cb);if(!poly.length||poly.some(v=>!v.every(Number.isFinite)))continue;
            // A polygon lying entirely in an upper ownership plane belongs to
            // the neighbouring cell. Shared edges have zero surface measure.
            if([0,1,2].some(axis=>poly.every(v=>v[axis]===cb.max[axis])))continue;
            const outerHalo=poly.some(v=>coords(v).some((n,i)=>n<p.min[i]||n>p.max[i])),piece={partId:p.spec.partRef.id,ownerId:p.spec.partRef.carrierId,record,recordId:record.id,sourceSurfaceId:record.sourceSurfaceId,cell:c,sourceCell,channel,primitive:i,polygon:poly,normal:normal(t),halo:outerHalo||!!sourceCell&&!same(c,sourceCell),outerHalo};if(visit)visit(piece);else out.push(piece);
          }
        }
      };
      offer(p.spec.rayRecord,channel==='surface'?p.surface:p.solid,'cold');
      for(const [id,n]of state.byPart.get(p.spec.partRef.id))if(status(state,p,n.entry.cell)==='native'&&!state.retired.has(id))offer(n.entry.record,channel==='surface'?n.surface:n.solid,'native',n.entry.cell);
    }return out;
  }
  function segment(view,from,to,{includeEndpoints=false,ignore=[],includeInactive=true}={}){
    const state=read(view);if(!vector(from)||!vector(to)||to.some((v,i)=>!Number.isFinite(v-from[i])))throw Error('Finite representable segment required');const hits=[],skip=new Set(ignore),stationCache=new Map();
    const stationsFor=p=>{if(stationCache.has(p))return stationCache.get(p);const stations=[0,1];for(let axis=0;axis<3;axis++)if(to[axis]!==from[axis])for(let c=p.min[axis];c<=p.max[axis]+1;c++){const t=(edge(axis,c)-from[axis])/(to[axis]-from[axis]);if(t>0&&t<1){stations.push(t);let before=t,after=t;for(let i=0;i<4;i++){before=nextFloat(before,false);after=nextFloat(after,true);stations.push(before,after);}}}stationCache.set(p,stations);return stations;};
    const offer=(p,record,ts,kind,sourceCell,channel)=>{
      if(skip.has(record.id)||!includeInactive&&record.intact===false||!segmentBox(from,to,record.bounds||p.box))return;let first=null;
      // Grid stations expose a later authoritative coplanar interval even when
      // the original triangle's first hit is in another ownership domain.
      const take=(t,primitive)=>{if(t===null||!Number.isFinite(t)||!includeEndpoints&&(t<=EPS||t>=1-EPS))return;const point=from.map((v,i)=>v+(to[i]-v)*t);if(pointDomain(state,p,point)!==kind)return;if(!first||t<first.t)first={t,primitive,point};};
      for(const [i,t]of ts.entries()){
        const hit=segmentTriangle(from,to,t,record.thickness||0);take(hit,i);const n=normal(t),den=to.reduce((v,x,j)=>v+(x-from[j])*n[j],0);
        if(hit!==null&&Math.abs(den)<EPS&&pointDomain(state,p,from.map((v,j)=>v+(to[j]-v)*hit))!==kind)for(const station of stationsFor(p)){const point=from.map((v,j)=>v+(to[j]-v)*station);if(segmentTriangle(point,point,t,record.thickness||0)===0)take(station,i);}
      }
      if(first){const owner=pointOwnership(p,first.point);hits.push({surface:record,t:first.t,normal:normal(ts[first.primitive]),provenance:{partRef:p.spec.partRef,ownerId:p.spec.partRef.carrierId,sourceSurfaceId:record.sourceSurfaceId,recordId:record.id,cell:sourceCell||owner.cell,hitCell:owner.hitCell,primitive:first.primitive,channel,halo:owner.outerHalo||!!sourceCell&&!same(owner.hitCell,sourceCell),outerHalo:owner.outerHalo}});}
    };
    for(const p of parts.values()){offer(p,p.spec.rayRecord,p.ray,'cold',null,p.rayChannel);for(const [id,n]of state.byPart.get(p.spec.partRef.id))if(status(state,p,n.entry.cell)==='native'&&!state.retired.has(id))offer(p,n.entry.record,n.solid,'native',n.entry.cell,n.entry.record.solidTriangles?'solid':'surface');}
    hits.sort((a,b)=>a.t-b.t||a.surface.id.localeCompare(b.surface.id));const unique=[];
    for(const hit of hits){const sheet=hit.surface.sheetKey||hit.surface.sourceSurfaceId||hit.surface.id,old=unique.findIndex(other=>(other.surface.sheetKey||other.surface.sourceSurfaceId||other.surface.id)===sheet&&Math.abs(other.t-hit.t)<EPS*10);if(old<0)unique.push(hit);else if(pass(hit.surface)<pass(unique[old].surface))unique[old]=hit;}
    return unique.sort((a,b)=>a.t-b.t||a.surface.id.localeCompare(b.surface.id));
  }
  function swept(view,from,to,radius,minY,maxY){
    const state=read(view);if(![from?.x,from?.y,to?.x,to?.y,radius,minY,maxY].every(Number.isFinite)||radius<=BODY_EPS||minY>=maxY)throw Error('Representable positive swept cylinder required');
    const box={min:[Math.min(from.x,to.x)-radius,minY,Math.min(from.y,to.y)-radius],max:[Math.max(from.x,to.x)+radius,maxY,Math.max(from.y,to.y)+radius]};
    if(!vector(box.min)||!vector(box.max))throw Error('Unrepresentable swept cylinder bounds');
    for(const piece of facePieces(state,{channel:'solid',box})){
      const ts=piece.polygon.length<3?[[piece.polygon[0],piece.polygon[1]||piece.polygon[0],piece.polygon[1]||piece.polygon[0]]]:fan(piece.polygon);if(!sweptCylinderClear(from,to,radius,minY,maxY,{triangles:ts,closed:false}))return false;
    }
    const inside=(point,ts)=>!sweptCylinderClear({x:point[0],y:point[2]},{x:point[0],y:point[2]},0,point[1],point[1],{triangles:ts,closed:true});
    function closedBodyIntersects(p,c,shapeBox,ts){
      const domain=bodyWitnessBox(p,c,shapeBox),physical={min:domain.min.map((v,i)=>Math.max(v,shapeBox.min[i])),max:domain.max.map((v,i)=>Math.min(v,shapeBox.max[i]))};
      // Bounds only constrain the witness search; the original mesh predicate
      // still decides containment, including full radius/height/sweep overlap.
      if(physical.min.every((v,i)=>v<physical.max[i])){const point=bodyCellWitness(from,to,radius,minY,maxY,physical);if(point&&inside(point,ts))return true;}
      // Outside the actual bounds, parity's tolerance belongs to the original
      // endpoint/height samples. An arbitrary off-centre capsule witness must
      // not create another tolerance sample. Keep each endpoint domain scoped.
      const height=(minY+maxY)/2;
      return [from,to].some(end=>{const point=[end.x,height,end.y];return point.some((v,i)=>v<shapeBox.min[i]||v>shapeBox.max[i])&&point.every((v,i)=>v>=domain.min[i]&&v<domain.max[i])&&inside(point,ts);});
    }
    for(const p of parts.values()){
      if(p.spec.closed&&p.spec.rayRecord.intact!==false)for(const c of cellsIn(p,box))if(status(state,p,c)==='cold'&&closedBodyIntersects(p,c,p.box,p.solid))return false;
      for(const [id,n]of state.byPart.get(p.spec.partRef.id))if(n.entry.record.closedShape!==false&&n.entry.record.intact!==false&&status(state,p,n.entry.cell)==='native'&&!state.retired.has(id)&&overlap(bodyProbeBounds(n.box),box))for(const c of cellsIn(p,bodyProbeBounds(n.box)))if(status(state,p,c)==='native'&&closedBodyIntersects(p,c,n.box,n.solid))return false;
    }return true;
  }
  function coverage({partId,cells,records:ids,complete}){
    live();const p=parts.get(partId);if(!p||complete!==true||!Array.isArray(cells)||!cells.length||cells.length>p.count||!Array.isArray(ids)||ids.length>p.records.size||coverageReceipts.size>=REGIONAL_QUERY_LIMITS.receipts)throw Error('Explicit bounded complete original native coverage required');const keys=new Set(cells.map(c=>validCell(p,c)));if(keys.size!==cells.length)throw Error('Overlapping coverage cells');const expected=cells.flatMap(c=>p.cells.get(key(c))||[]);if(new Set(ids).size!==ids.length||!same([...ids].sort(),expected.sort()))throw Error('Missing/unrelated original native query record');
    const token=Object.freeze({kind:'isolated-complete-native-query-coverage',generation,sourceRevision});const value={p,cells:cells.map(c=>[...c]),ids:[...ids],generation};receipts.set(token,{kernel,value});coverageReceipts.add(value);return token;
  }
  function prepare({expectedGeneration,expectedRevision,native:claims=[],retireRecords=[],retireCells=[]}){
    if(!Array.isArray(claims)||claims.length>REGIONAL_QUERY_LIMITS.receipts||!Array.isArray(retireRecords)||retireRecords.length>native.size||!Array.isArray(retireCells)||retireCells.length>REGIONAL_QUERY_LIMITS.cellsPerPart*REGIONAL_QUERY_LIMITS.parts)throw Error('Bounded original domain transaction required');claims=[...claims];retireRecords=[...retireRecords];retireCells=retireCells.map(r=>({partId:r.partId,cell:[...r.cell]}));
    live();const original=current,state=read(original);let committed=false;
    function validate(){live();if(committed||expectedGeneration!==generation||expectedRevision!==revision||current!==original)throw Error('Stale regional query transaction');const touched=new Set();for(const token of claims){const r=receipts.get(token);if(!r||r.kernel!==kernel||r.value.generation!==generation)throw Error('Stale/unknown native query coverage');for(const c of r.value.cells){const id=domainKey(r.value.p.spec.partRef.id,c);if(touched.has(id)||state.domains.has(id))throw Error('Overlapping native query domain');touched.add(id);}}
      const retired=new Set();for(const id of retireRecords){const n=native.get(id);if(!n||status(state,n.p,n.entry.cell)!=='native'||state.retired.has(id)||retired.has(id))throw Error('Unknown/duplicate native retirement');retired.add(id);}
      for(const {partId,cell}of retireCells){const p=parts.get(partId);if(!p)throw Error('Unknown original part');validCell(p,cell);const id=domainKey(partId,cell);if(touched.has(id)||status(state,p,cell)!=='native'||(p.cells.get(key(cell))||[]).some(r=>retired.has(r)))throw Error('Overlapping/unknown retired query domain');touched.add(id);}
      if(heldViews.size>=REGIONAL_QUERY_LIMITS.views)throw Error('Release old isolated query views');
    }
    validate();return Object.freeze({validate,commit(){validate();const domains=new Map(state.domains),retired=new Set(state.retired);for(const token of claims){const r=receipts.get(token).value;for(const c of r.cells)domains.set(domainKey(r.p.spec.partRef.id,c),'native');}for(const id of retireRecords)retired.add(id);for(const r of retireCells)domains.set(domainKey(r.partId,r.cell),'retired');revision++;current=makeView(domains,retired);committed=true;return current;}});
  }
  function discard(state){state.released=true;state.domains.clear();state.retired.clear();if(state.inventory!==native)state.inventory.clear();if(state.byPart!==baseRecords){for(const records of state.byPart.values())records.clear();state.byPart.clear();}heldViews.delete(state);}
  function clearViews(){for(const state of heldViews)discard(state);for(const r of coverageReceipts){r.cells.length=0;r.ids.length=0;r.p=null;r.generation=-1;}coverageReceipts.clear();}
  const kernel=Object.freeze({view:()=>{live();return current;},coverage,prepare,segment,trace(view,a,b,options){const hits=segment(view,a,b,options);return {hits,transmission:hits.reduce((v,h)=>v*pass(h.surface),1)};},sweptCylinderClear:swept,faces(view,options){return facePieces(read(view),options);},
    release(view){const state=read(view);if(view===current)throw Error('Cannot release current query view');discard(state);},
    reset(){live();clearViews();generation++;revision=0;current=makeView();return current;},dispose(){if(closed)return;clearViews();for(const records of baseRecords.values())records.clear();baseRecords.clear();parts.clear();native.clear();for(const map of edges)map.clear();grid=null;closed=true;generation++;current=null;},diagnostics:()=>({productionEnabled:false,generation,revision,parts:parts.size,nativeRecords:native.size,retainedViews:heldViews.size,retainedCoverageReceipts:coverageReceipts.size,closed})});
  sources=null;nativeInventory=null;
  current=makeView();if(!participant)return kernel;
  return Object.freeze({query:kernel,prepare(view,slices,retireRecords=[]){
    const state=read(view);if(!Array.isArray(slices)||slices.length>REGIONAL_QUERY_LIMITS.receipts||!Array.isArray(retireRecords)||retireRecords.length>state.inventory.size)throw Error('Bounded authenticated query batch required');
    const captured=[...slices],inventory=new Map(state.inventory),byPart=new Map([...state.byPart].map(([id,records])=>[id,new Map(records)])),domains=new Map(state.domains),retired=new Set(state.retired);let count=state.triangleCount;
    for(const slice of captured){
      const data=participant.authenticate(slice);if(data.sourceRevision!==sourceRevision||data.epoch!==generation||!same(data.origin,grid.origin)||!same(data.pitch,grid.pitch))throw Error('Foreign query slice revision/grid/epoch');
      const claims=new Set();for(const claim of data.parts){const p=parts.get(claim.partId);if(!p||p.spec.partRef.carrierId!==data.ownerId)throw Error('Foreign query slice original part/owner');
        for(const c of claim.cells){validCell(p,c);const id=domainKey(claim.partId,c);if(claims.has(id)||domains.has(id))throw Error('Duplicate/overlapping query slice domain');claims.add(id);domains.set(id,'native');}
      }
      for(const entry of data.entries){staticData(entry);if(!claims.has(domainKey(entry.record.nativePartId,entry.cell)))throw Error('Query record outside authenticated part-cell coverage');const value=admit(entry,inventory);count+=value.surface.length+value.solid.length;
        if(inventory.size>=REGIONAL_QUERY_LIMITS.records||count>REGIONAL_QUERY_LIMITS.triangles)throw Error('Original query inventory/triangle ceiling exceeded');inventory.set(entry.record.id,value);byPart.get(entry.record.nativePartId).set(entry.record.id,value);
      }
    }
    for(const id of retireRecords){const n=state.inventory.get(id);if(!n||status(state,n.p,n.entry.cell)!=='native'||retired.has(id))throw Error('Unknown/duplicate native retirement');retired.add(id);}
    const next=makeView(domains,retired,inventory,byPart,count,view.revision+1);let discarded=false;
    return Object.freeze({view:next,validate(){read(view);read(next);if(discarded)throw Error('Discarded query stage');for(const slice of captured)participant.authenticate(slice);},dispose(){if(discarded)return;discarded=true;captured.length=0;const value=views.get(next);if(value&&!value.state.released)discard(value.state);}});
  },release(view){discard(read(view));},count(view){const state=read(view);return {nativeRecords:state.inventory.size,claimedCells:state.domains.size};}});
}
