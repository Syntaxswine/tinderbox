import {bounds,normal,triangleArea,polygonTriangles,add,mul,sub} from './geometry.js';
const clamp=n=>Math.max(0,Math.min(1,Number.isFinite(n)?n:0)),centre=t=>[0,1,2].map(i=>t.reduce((n,p)=>n+p[i],0)/t.length),key=p=>p.map(v=>Math.round(v*1e6)).join(',');
function edgeList(triangles){const edges=new Map();for(const t of triangles)for(let i=0;i<3;i++){const a=t[i],b=t[(i+1)%3],k=[key(a),key(b)].sort().join('|');if(edges.has(k))edges.delete(k);else edges.set(k,[a,b]);}return [...edges.values()];}
function prism(triangles,offset){const back=triangles.map(t=>[...t].reverse().map(p=>add(p,offset))),sides=edgeList(triangles).flatMap(([a,b])=>{const c=add(b,offset),d=add(a,offset);return [[a,b,c],[a,c,d]];});return [...triangles,...back,...sides];}
function asTriangles(value,y=0){
 if(!Array.isArray(value)||!value.length)return [];
 if(typeof value[0]?.[0]==='number'){const poly=value.map(p=>p.length===2?[p[0],y,p[1]]:p.slice(0,3));return polygonTriangles(poly);}
 return value.map(t=>t.map(p=>p.length===2?[p[0],y,p[1]]:p.slice(0,3)));
}
function tint(T,r){
 const spent=r.phase==='ash'||r.spent||r.remainingFraction===0||r.remainingAmount===0;
 const color=new T.Color(spent?0x514b45:r.kind==='oil'?0x252422:r.kind==='coal'?0x25241f:0x352d29),heat=spent?0:clamp(r.heatFraction);
 // Palette comes from the existing burned-house-rubble.js char/ash forms; no autonomous burn clock.
 return {color,heat};
}
export function createDebrisView(T,{surfaces,getBoundary}={}){
 const root=new T.Group();root.name='Authoritative fragments and persistent shallow residue';
 const flights=new Map(),residue=new Map(),fuelToResidue=new Map(),flightRoot=new T.Group();root.add(flightRoot);
 const viewMode={value:0},viewLevel={value:0};
 let disposed=false,topologyDirty=false,shadeDirty=false,missingGeometry=0;
 const material=new T.MeshStandardMaterial({name:'Finite char, coal and spent ash',vertexColors:true,color:0xffffff,roughness:1,side:T.DoubleSide});
 material.onBeforeCompile=shader=>{
  Object.assign(shader.uniforms,{residueView:viewMode,residueSelected:viewLevel});
  shader.vertexShader='attribute float residueHeat; attribute float residueStorey; varying float vResidueHeat; varying float vResidueStorey;\n'+shader.vertexShader;
  shader.vertexShader=shader.vertexShader.replace('#include <begin_vertex>','#include <begin_vertex>\nvResidueHeat=residueHeat;vResidueStorey=residueStorey;');
  shader.fragmentShader='varying float vResidueHeat; varying float vResidueStorey; uniform float residueView; uniform float residueSelected;\n'+shader.fragmentShader;
  shader.fragmentShader=shader.fragmentShader.replace('void main() {','void main() { if(residueView>.5&&abs(vResidueStorey-residueSelected)>.1)discard;');
  shader.fragmentShader=shader.fragmentShader.replace('#include <emissivemap_fragment>','#include <emissivemap_fragment>\ntotalEmissiveRadiance+=vec3(.52,.048,.002)*vResidueHeat;');
 };material.customProgramCacheKey=()=> 'furnished-residue-heat-v1';
 const mesh=new T.Mesh(new T.BufferGeometry(),material);mesh.name='Batched actual one-centimetre landed footprints';mesh.castShadow=mesh.receiveShadow=true;mesh.visible=false;root.add(mesh);
 function removeFlight(id){const r=flights.get(id);if(!r)return;r.mesh.removeFromParent();r.mesh.geometry.dispose();r.mesh.material.dispose();flights.delete(id);}
 function flightGeometry(f,frame){
  let g=f.geometry,derived=false;if(!g&&f.rubbleFootprint)g={triangles:f.rubbleFootprint,thickness:.01,normal:[0,1,0],kind:'floor'};
  if(!g){const sample=frame.fireSamples?.find(s=>f.fuelIds?.includes(s.id)),fuelId=f.fuelIds?.[0],runtimeId=fuelId?.replace(/^fuel:/,'').replace(/:embers$/,''),b=getBoundary?.(runtimeId),s=surfaces?.get(sample?.sourceSurfaceId);g=b||s;if(g)derived=true;}
  if(!g?.triangles?.length)return null;
  let triangles=g.solidTriangles||g.triangles;
  if(!g.solidTriangles&&g.thickness>0&&g.kind!=='attachment'){
   const n=g.normal||[0,1,0],offset=g.kind==='floor'?[0,-g.thickness,0]:mul(n,-g.thickness);triangles=prism(g.triangles,offset);
  }
  const origin=f.origin||g.origin||g.position||(derived?centre(g.triangles.flat()):centre(triangles.flat()));
  return {triangles,origin,sourceSurfaceIds:g.sourceSurfaceIds||[g.sourceSurfaceId||g.id].filter(Boolean)};
 }
 function makeFlight(f,frame){
  const g=flightGeometry(f,frame);if(!g){missingGeometry++;return null;}
  const geometry=new T.BufferGeometry(),positions=[],normals=[];
  for(const t of g.triangles){if(triangleArea(t)<1e-10)continue;const n=normal(t);for(const p of t){positions.push(...sub(p,g.origin));normals.push(...n);}}
  geometry.setAttribute('position',new T.Float32BufferAttribute(positions,3));geometry.setAttribute('normal',new T.Float32BufferAttribute(normals,3));geometry.computeBoundingSphere();
  const m=new T.MeshStandardMaterial({color:0x413733,roughness:1,side:T.DoubleSide}),object=new T.Mesh(geometry,m);object.name='Exact tracked fragment '+f.id;object.castShadow=object.receiveShadow=true;flightRoot.add(object);
  const r={mesh:object,sourceSurfaceIds:g.sourceSurfaceIds,fuelIds:f.fuelIds||[]};flights.set(f.id,r);return r;
 }
 function updateResidue(record){
  const old=residue.get(record.id),value={...old?.value,...record},footprint=asTriangles(value.floorFootprint||value.footprint||value.triangles,value.position?.[1]||0);
  if(!footprint.length)return;
  const thickness=value.thickness??.01,oldValue=old?.value,shapeChanged=!old||oldValue.floorFootprint!==value.floorFootprint||oldValue.triangles!==value.triangles||oldValue.footprint!==value.footprint||oldValue.thickness!==thickness;
  let triangles=old?.triangles;
  if(shapeChanged){const top=footprint.map(t=>t.map(p=>[p[0],p[1]+thickness,p[2]]));triangles=prism(top,[0,-thickness,0]);topologyDirty=true;}
  residue.set(record.id,{value:{...value,thickness},triangles,start:old?.start,count:old?.count});
  if(!old||['phase','kind','remainingFraction','remainingAmount','heatFraction','spent'].some(k=>oldValue[k]!==value[k]))shadeDirty=true;
 }
 function rebuild(){
  if(topologyDirty){const positions=[],normals=[],colors=[],heats=[],storeys=[];
   for(const r of residue.values()){r.start=positions.length/3;const {color,heat}=tint(T,r.value);for(const t of r.triangles){const n=normal(t);for(const p of t){positions.push(...p);normals.push(...n);colors.push(color.r,color.g,color.b);heats.push(heat);storeys.push(Math.max(0,Math.floor((p[1]-.40)/2.12)));}}r.count=positions.length/3-r.start;}
   const g=new T.BufferGeometry();g.setAttribute('position',new T.Float32BufferAttribute(positions,3));g.setAttribute('normal',new T.Float32BufferAttribute(normals,3));g.setAttribute('color',new T.Float32BufferAttribute(colors,3));g.setAttribute('residueHeat',new T.Float32BufferAttribute(heats,1));g.setAttribute('residueStorey',new T.Float32BufferAttribute(storeys,1));g.computeBoundingSphere();mesh.geometry.dispose();mesh.geometry=g;topologyDirty=false;shadeDirty=false;
  }else if(shadeDirty){const c=mesh.geometry.attributes.color,h=mesh.geometry.attributes.residueHeat;if(c&&h){for(const r of residue.values()){const {color,heat}=tint(T,r.value);for(let i=r.start;i<r.start+r.count;i++){c.setXYZ(i,color.r,color.g,color.b);h.setX(i,heat);}}c.needsUpdate=h.needsUpdate=true;}shadeDirty=false;}
  mesh.visible=residue.size>0;
 }
 function reset(){for(const id of [...flights.keys()])removeFlight(id);residue.clear();fuelToResidue.clear();topologyDirty=true;shadeDirty=false;missingGeometry=0;rebuild();}
 function update(frame){
  if(disposed)return;
  const records=frame.rubble??frame.landedRubble,deadFlights=new Set();
  // Upserts/tombstones form one atomic delta; empty camera draws preserve live state.
  if(frame.full||frame.completeCollections?.includes('rubble')){
   const currentIds=new Set((records||[]).map(r=>r.id));
   for(const id of residue.keys())if(!currentIds.has(id)){residue.delete(id);topologyDirty=true;}
  }
  for(const t of frame.tombstones||[]){const id=typeof t==='string'?t:t.id;
   if(t.collection==='rubble'){if(residue.delete(id))topologyDirty=true;}
   else if(t.collection==='falls'||flights.has(id))deadFlights.add(id);
  }
  // Upserts are the final current state; rebuild associations after all removals.
  for(const r of records||[])updateResidue(r);
  fuelToResidue.clear();for(const [id,r]of residue)for(const fuelId of r.value.fuelIds||[])fuelToResidue.set(fuelId,id);
  if(frame.full||frame.completeCollections?.includes('falls')){
   const currentIds=new Set((frame.falls||[]).filter(f=>!f.itemId).map(f=>f.id));
   for(const id of flights.keys())if(!currentIds.has(id))removeFlight(id);
  }
  for(const f of frame.falls||[]){if(f.itemId||deadFlights.has(f.id))continue;const r=flights.get(f.id)||makeFlight(f,frame);if(r){r.mesh.position.fromArray(f.position);r.mesh.quaternion.fromArray(f.quaternion||[0,0,0,1]);}}
  for(const id of deadFlights)removeFlight(id);
  rebuild();
 }
 function diagnostics(){return {flights:flights.size,residue:residue.size,pendingLanding:0,missingGeometry,draws:(mesh.visible?1:0)+flights.size,resources:{geometries:1+flights.size,materials:1+flights.size}};}
 function inspect(){return {flights:[...flights].map(([id,r])=>({id,position:r.mesh.position.toArray(),bounds:(r.mesh.geometry.computeBoundingBox(),{min:r.mesh.geometry.boundingBox.min.toArray(),max:r.mesh.geometry.boundingBox.max.toArray()}),pendingLanding:false,sourceSurfaceIds:r.sourceSurfaceIds})),rubble:[...residue].map(([id,r])=>({id,fuelIds:r.value.fuelIds,phase:r.value.phase,thickness:r.value.thickness,heat:tint(T,r.value).heat,bounds:bounds(r.triangles.flat())}))};}
 function dispose(){if(disposed)return;disposed=true;for(const id of [...flights.keys()])removeFlight(id);residue.clear();fuelToResidue.clear();mesh.geometry.dispose();material.dispose();root.removeFromParent();root.clear();}
 return {root,update,reset,diagnostics,inspect,dispose,findFuel(id,rubbleId){return residue.get(rubbleId)?.value||residue.get(fuelToResidue.get(id))?.value;},setView(mode,level){viewMode.value=mode==='cutaway'?1:0;viewLevel.value=level;for(const r of flights.values())r.mesh.visible=mode!=='cutaway'||Math.max(0,Math.floor((r.mesh.position.y-.40)/2.12))===level;}};
}
