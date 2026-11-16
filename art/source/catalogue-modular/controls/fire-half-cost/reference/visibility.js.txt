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
