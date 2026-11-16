import {isOwnedPublicationGeometry} from '../../../src/reuse/publication-geometry.js';
import {bounds} from './geometry.js';
// Conservative bounds for the accepted house shroud, before support-anchor/envelope work.
// Uncertain bounds/cameras retain sources. No visibility result is a physics decision.
export function normalizeArtEffects(value) {
 return Object.fromEntries(['flames','smoke','lighting'].map(key=>[key,typeof value?.[key]==='boolean'?value[key]:true]));
}
export function hasBoundedHouseWind(view) {
 if(typeof view.sampleWind!=='function')return true;
 const m=view.windMetadata;
 return ['ambient-control','calm-control'].includes(m?.kind)&&Number.isFinite(m.speed)&&m.speed>=0&&Array.isArray(m.direction)&&m.direction.length===3&&m.direction.every(Number.isFinite);
}
export function validTriangles(triangles) {
 return Array.isArray(triangles)&&triangles.length>0&&triangles.every(t=>Array.isArray(t)&&t.length===3&&t.every(p=>Array.isArray(p)&&p.length===3&&p.every(Number.isFinite)));
}
export function validFootprint(triangles) {
 return validTriangles(triangles)&&triangles.some(t=>Math.abs((t[1][0]-t[0][0])*(t[2][2]-t[0][2])-(t[2][0]-t[0][0])*(t[1][2]-t[0][2]))>1e-12);
}
export function houseEffectBounds(q,channel) {
 const length=Math.hypot(q.nx,q.ny,q.nz);
 if(![q.x,q.y,q.z,length].every(Number.isFinite)||Math.abs(length-1)>.02)return null;
 const b=q.anchorBounds||q.supportBounds,min=[q.x,q.y,q.z],max=[...min];
 if(b){
  if(![...b.min,...b.max].every(Number.isFinite)||b.min.some((v,i)=>v>b.max[i]))return null;
  for(let i=0;i<3;i++){min[i]=Math.min(min[i],b.min[i]);max[i]=Math.max(max[i],b.max[i]);}
 }
 const horizontal=Math.hypot(q.nx,q.nz);
 const slope=q.part==='roof'?horizontal/Math.max(.05,Math.abs(q.ny)):0;
 if(q.part==='roof'&&Math.abs(q.ny)<=.05)return null;
 const anchorRise=slope*Math.hypot(max[0]-min[0],max[2]-min[2]);
 let pad;
 if(channel==='smoke'){
  // Two puffs live <1.8s, horizontal wind clamps to +/-1.25m/s,
  // normal/eddy offsets <=.299m, max scale1.45, sigma<=.4292 and lean<=.525.
  // These margins exceed full 2.6-sigma support, including ceiling projection.
  pad=[6,5+anchorRise,6];
 }else if(channel==='flames'){
  const span=q.part==='walls'&&b?Math.max(.10,b.max[1]-b.min[1]):0;
  const pitch=q.part==='roof'&&horizontal>.05?Math.abs(q.ny/horizontal):0;
  pad=[2+.2*span+3*pitch,2+.35*span+anchorRise,2+.2*span+3*pitch];
 }else return null;
 return {min:min.map((v,i)=>v-pad[i]),max:max.map((v,i)=>v+pad[i])};
}
export function createCameraCuller(T,camera) {
 const retain=()=>false;retain.known=false;
 // Perspective Jacobian billboards need a separate proof; this game uses orthographic views.
 if(!camera?.isOrthographicCamera||!camera?.projectionMatrix||!camera?.matrixWorldInverse)return retain;
 camera.updateWorldMatrix?.(true,false);
 if(![...camera.projectionMatrix.elements,...camera.matrixWorldInverse.elements].every(Number.isFinite))return retain;
 const matrix=new T.Matrix4().multiplyMatrices(camera.projectionMatrix,camera.matrixWorldInverse);
 const frustum=new T.Frustum().setFromProjectionMatrix(matrix,camera.coordinateSystem);
 if(!frustum.planes.every(p=>[...p.normal.toArray(),p.constant].every(Number.isFinite)))return retain;
 const box=new T.Box3();
 const cull=bounds=>{
  if(!bounds)return false;
  box.min.fromArray(bounds.min);box.max.fromArray(bounds.max);
  return !frustum.intersectsBox(box);
 };
 cull.known=true;return cull;
}

// Visit-owned latest geometry per stable source. Detached numeric snapshots detect
// cloned and reused/in-place records alike; no sample, frame or camera is retained.
export function createSupportGeometryCache() {
 const sources=new Map(),immutableGeometry=new Map();let certified=new WeakMap(),epoch=0,boundsEntries=0,boundsComputations=0,boundsCacheHits=0;
 function begin(){epoch++;boundsComputations=boundsCacheHits=0;}
 function source(id){let entry=sources.get(id);if(!entry){entry={};sources.set(id,entry);}entry.epoch=epoch;return entry;}
 function matches(value,triangles){
  if(!value?.coordinates||!Array.isArray(triangles)||triangles.length*9!==value.coordinates.length)return false;
  let at=0;
  for(const t of triangles){if(!Array.isArray(t)||t.length!==3)return false;for(const p of t){if(!Array.isArray(p)||p.length!==3)return false;for(const v of p)if(!Object.is(v,value.coordinates[at++]))return false;}}
  return true;
 }
 // Certification never reads indexed accessors. Dense own data properties,
 // ordinary prototypes and frozen descendants are required. The one-time clone
 // also excludes Proxies, which can otherwise impersonate frozen plain arrays.
 function frozenDataArray(value,length){
  if(!Array.isArray(value)||Object.getPrototypeOf(value)!==Array.prototype||!Object.isFrozen(value)||(length!==undefined&&value.length!==length)||Reflect.ownKeys(value).length!==value.length+1)return null;
  const items=[];for(let i=0;i<value.length;i++){const d=Object.getOwnPropertyDescriptor(value,String(i));if(!d||!Object.hasOwn(d,'value'))return null;items.push(d.value);}return items;
 }
 function certify(triangles){
  if(isOwnedPublicationGeometry(triangles))return triangles;
  if(!Array.isArray(triangles))return null;
  if(certified.has(triangles))return certified.get(triangles)?triangles:null;
  const faces=frozenDataArray(triangles);let valid=!!faces;
  if(valid)for(const face of faces){const points=frozenDataArray(face,3);if(!points){valid=false;break;}for(const point of points){const values=frozenDataArray(point,3);if(!values||!values.every(Number.isFinite)){valid=false;break;}}if(!valid)break;}
  let snapshot=null;if(valid)try{snapshot=structuredClone(triangles);}catch{valid=false;}
  certified.set(triangles,valid);return valid?snapshot:null;
 }
 function geometry(entry,slot,triangles){
  const known=immutableGeometry.get(triangles);
  if(known){known.epoch=epoch;return entry[slot]=known.value;}
  const immutable=certify(triangles),input=immutable||triangles,old=entry[slot];
  if(matches(old,input)){if(immutable)immutableGeometry.set(triangles,{epoch,value:old});return old;}
  const value=prepare(input);entry[slot]=value;
  if(immutable)immutableGeometry.set(triangles,{epoch,value});return value;
 }
 function prepare(triangles){
  const wellFormed=Array.isArray(triangles)&&triangles.every(t=>Array.isArray(t)&&t.length===3&&t.every(p=>Array.isArray(p)&&p.length===3&&p.every(Number.isFinite)));
  if(!wellFormed)return {valid:false,wellFormed:false};
  const coordinates=new Float64Array(triangles.length*9);let at=0;
  for(const t of triangles)for(const p of t)for(const v of p)coordinates[at++]=v;
  return {coordinates,wellFormed:true,valid:triangles.length>0,
   footprint:triangles.some(t=>Math.abs((t[1][0]-t[0][0])*(t[2][2]-t[0][2])-(t[2][0]-t[0][0])*(t[1][2]-t[0][2]))>1e-12),
   bounds:triangles.length?bounds(triangles.flat()):null};
 }
 // Only static helper inputs are retained: never the source sample, camera,
 // wind eligibility, time or an animation result. Visibility still runs live.
 function effectBounds(entry,q,channel){
  if(channel!=='flames'&&channel!=='smoke'){boundsComputations++;return houseEffectBounds(q,channel);}
  const slot=channel==='flames'?'flameEnvelope':'smokeEnvelope',b=q.anchorBounds||q.supportBounds,cached=entry[slot];
  if(cached&&cached.part===q.part&&Object.is(cached.x,q.x)&&Object.is(cached.y,q.y)&&Object.is(cached.z,q.z)&&Object.is(cached.nx,q.nx)&&Object.is(cached.ny,q.ny)&&Object.is(cached.nz,q.nz)&&cached.hasBounds===!!b){
   let equal=true;
   if(b){
    equal=cached.min.length===b.min.length&&cached.max.length===b.max.length;
    if(equal)for(let i=0;i<cached.min.length;i++)if(!Object.is(cached.min[i],b.min[i])){equal=false;break;}
    if(equal)for(let i=0;i<cached.max.length;i++)if(!Object.is(cached.max[i],b.max[i])){equal=false;break;}
   }
   if(equal){boundsCacheHits++;return cached.value;}
  }
  boundsComputations++;const value=houseEffectBounds(q,channel);
  if(value){if(!cached)boundsEntries++;entry[slot]={part:q.part,x:q.x,y:q.y,z:q.z,nx:q.nx,ny:q.ny,nz:q.nz,hasBounds:!!b,min:b?Array.from(b.min):null,max:b?Array.from(b.max):null,value};}
  else if(cached){delete entry[slot];boundsEntries--;}
  return value;
 }
 function anchorKey(value){
  if(value.anchorKey===undefined){const triangles=[];for(let at=0;at<value.coordinates.length;at+=9){const points=[];for(let p=0;p<9;p+=3)points.push([0,1,2].map(i=>Math.round(value.coordinates[at+p+i]*1e6)).join(','));triangles.push(points.join(';'));}value.anchorKey=triangles.join('|');}
  return value.anchorKey;
 }
 function prune(){for(const [id,entry]of sources)if(entry.epoch!==epoch){if(entry.flameEnvelope)boundsEntries--;if(entry.smokeEnvelope)boundsEntries--;sources.delete(id);}for(const [input,entry]of immutableGeometry)if(entry.epoch!==epoch)immutableGeometry.delete(input);}
 function clear(){sources.clear();immutableGeometry.clear();certified=new WeakMap();epoch=boundsEntries=boundsComputations=boundsCacheHits=0;}
 return {begin,source,geometry,effectBounds,anchorKey,prune,clear,get size(){return sources.size;},get immutableSize(){return immutableGeometry.size;},get effectBoundsSize(){return boundsEntries;},get effectBoundsComputations(){return boundsComputations;},get effectBoundsCacheHits(){return boundsCacheHits;}};
}
