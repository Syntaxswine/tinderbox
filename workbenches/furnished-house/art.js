import {bounds,normal,triangleArea,polygonTriangles,gridPieces,clipBox,nearestSurface,distanceToBounds,pointInTriangleXZ,unit,sub} from '../../art/source/furnished-house/geometry.mjs';
import {createWallShroud} from '../../art/source/furnished-house/shroud.js';
import {createStreetFirelight} from '../../src/art/street-firelight.js';
const clamp=n=>Math.max(0,Math.min(1,Number.isFinite(n)?n:0)),EPS=1e-6;
const KIND={floor:0,wall:1,roof:2,door:3,window:3,plinth:5};
export async function createFurnishedHouseArt(T,{renderer,data}={}){
 if(!T?.DataTexture||data?.version!==1||data.prefabId!=='hopkins-4-15')throw Error('Expected shared Three and version-1 Hopkins geometry');
 const root=new T.Group();root.name='Authoritative furnished Hopkins15';
 const geometries=new Set(),materials=new Set(),textures=new Set(),effects=[],batches=[],itemGroups=new Map(),doorGroups=new Map(),patches=[],bySource=new Map(),patchByRuntimeId=new Map(),itemStates=new Map(),fallStates=new Map(),boundaryStates=new Map(),openingState=new Map(),mappedMeshes=new Map();
 const surfaces=new Map(data.surfaces.map(s=>[s.id,s])),sourceMeshes=new Map(data.sourceMeshes.map(s=>[s.id,s])),sourceGeometry=new Map(data.render.geometry.map(g=>[g.id,g])),partByMesh=new Map(data.furnitureParts.filter(p=>p.sourceMeshBinding).map(p=>[p.sourceMeshBinding,p])),openingByMesh=new Map(data.openings.flatMap(o=>o.sourceMeshBindings.map(id=>[id,o]))),openingByWall=new Map(data.openings.map(o=>[o.sourceWallBinding,o]));
 let disposed=false,lastRevision=-1,lastTime=-Infinity,mode='exterior',selectedLevel=0,lastFrame=null,missingSamples=0,representedSamples=0,fireSamples=[],retiredPatches=0,resetCount=0,revisionCount=0;
 const viewMode={value:0},viewLevel={value:0},cutY={value:1.3},stateUniform={value:null},stateWidth={value:1},ownedItemRows=new Map(),ownedPartRows=new Map(),storeGlows=[];
 const ownG=g=>(geometries.add(g),g),ownM=m=>(materials.add(m),m);
 const centre=t=>[0,1,2].map(i=>t.reduce((n,p)=>n+p[i],0)/t.length);
 function patch(spec){
  const clipBounds=bounds(spec.triangles.flat()),axis=normal(spec.triangles[0]).map(Math.abs).indexOf(Math.max(...normal(spec.triangles[0]).map(Math.abs)));clipBounds.min[axis]-=.12;clipBounds.max[axis]+=.12;
  const p={...spec,clipBounds,index:patches.length,centre:centre(spec.triangles.flat()),bounds:spec.bounds||bounds(spec.triangles.flat())};patches.push(p);
  if(!bySource.has(p.sourceSurfaceId))bySource.set(p.sourceSurfaceId,[]);bySource.get(p.sourceSurfaceId).push(p);return p;
 }
 // Partition only within each actual physical surface. No column mask spans levels.
 for(const s of data.surfaces){
  const axis=s.normal.map(Math.abs).indexOf(Math.max(...s.normal.map(Math.abs))),axes=s.kind==='floor'?[0,2]:s.kind==='roof'?[0,1,2]:[0,1,2].filter(i=>i!==axis),groups=new Map();
  for(const t of s.triangles)for(const poly of gridPieces(t,axes)){
   const tris=polygonTriangles(poly).filter(t=>triangleArea(t)>1e-9);if(!tris.length)continue;
   const p=centre(poly),key=axes.map(i=>Math.floor((p[i]-(i===1?.48:0))/(i===1?1.06:.5)+EPS)).join(',');
   if(!groups.has(key))groups.set(key,[]);groups.get(key).push(...tris);
  }
  for(const [key,triangles]of groups){const b=bounds(triangles.flat());if(s.kind==='floor')b.min[1]-=s.thickness;else for(let i=0;i<3;i++){b.min[i]-=Math.abs(s.normal[i])*(s.thickness/2+.012);b.max[i]+=Math.abs(s.normal[i])*(s.thickness/2+.012);}
   patch({id:s.id+'#'+key,sourceSurfaceId:s.id,kind:s.kind,level:s.level,material:s.material,triangles,bounds:b});
  }
 }
 for(const item of data.items){const p=patch({id:item.id,sourceSurfaceId:item.id,kind:'item',level:item.level,material:'timber',triangles:[[item.bounds.min,[item.bounds.max[0],item.bounds.min[1],item.bounds.min[2]],item.bounds.max]],bounds:item.bounds});ownedItemRows.set(item.id,p);}
 for(const part of data.furnitureParts){const p=patch({id:part.id,sourceSurfaceId:part.id,kind:'item-part',level:part.level,material:part.material,triangles:[[part.bounds.min,[part.bounds.max[0],part.bounds.min[1],part.bounds.min[2]],part.bounds.max]],bounds:part.bounds});ownedPartRows.set(part.id,{row:p,definition:part});}
 const width=Math.pow(2,Math.ceil(Math.log2(patches.length))),stateArray=new Float32Array(width*4),stateTexture=new T.DataTexture(stateArray,width,1,T.RGBAFormat,T.FloatType);
 stateTexture.minFilter=stateTexture.magFilter=T.NearestFilter;stateTexture.generateMipmaps=false;stateTexture.needsUpdate=true;textures.add(stateTexture);stateUniform.value=stateTexture;stateWidth.value=width;
 function resetState(){for(const p of patches){const o=openingState.get(p.sourceSurfaceId),s=surfaces.get(p.sourceSurfaceId);stateArray.set([1,0,o?.initialOpenFraction??s?.initialOpenFraction??0,0],p.index*4);}stateTexture.needsUpdate=true;boundaryStates.clear();itemStates.clear();fallStates.clear();patchByRuntimeId.clear();resetCount++;}
 for(const o of data.openings)openingState.set(o.surfaceId,o);resetState();
 function decorate(m,depth=false){
  const old=m.onBeforeCompile;m.onBeforeCompile=(shader,r)=>{
   old?.call(m,shader,r);Object.assign(shader.uniforms,{fhState:stateUniform,fhWidth:stateWidth,fhView:viewMode,fhLevel:viewLevel,fhCut:cutY});
   shader.vertexShader='attribute float fhPatch; attribute float fhKind; attribute float fhStorey; attribute float fhGlass; varying vec4 fhStatus; varying vec4 fhInfo; uniform sampler2D fhState; uniform float fhWidth;\n'+shader.vertexShader;
   shader.vertexShader=shader.vertexShader.replace('#include <begin_vertex>','#include <begin_vertex>\nfhStatus=texture2D(fhState,vec2((fhPatch+.5)/fhWidth,.5)); fhInfo=vec4(fhKind,(fhKind>3.5&&fhKind<4.5)?max(0.,floor((modelMatrix[3].y-.40)/2.12)):fhStorey,fhGlass,(modelMatrix*vec4(position,1.0)).y);');
   shader.fragmentShader='varying vec4 fhStatus; varying vec4 fhInfo; uniform float fhView; uniform float fhLevel; uniform float fhCut;\n'+shader.fragmentShader;
   const mask='if(fhStatus.r<.5)discard; if(fhInfo.z>.5&&fhStatus.b>.5)discard; if(fhView>.5&&fhView<1.5){if(fhInfo.x>1.5&&fhInfo.x<2.5)discard;if(abs(fhInfo.y-fhLevel)>.1&&fhInfo.x<4.5)discard;if((fhInfo.x>.5&&fhInfo.x<1.5||fhInfo.x>2.5&&fhInfo.x<3.5)&&fhInfo.w>fhCut)discard;}';
   shader.fragmentShader=shader.fragmentShader.replace('void main() {','void main() {\n'+mask);
   if(!depth)shader.fragmentShader=shader.fragmentShader.replace('#include <color_fragment>','#include <color_fragment>\n diffuseColor.rgb=mix(diffuseColor.rgb,vec3(.055,.044,.035),fhStatus.g*.88); if(fhView>1.5&&fhInfo.x>.5&&fhInfo.x<3.5)diffuseColor.a*=.20;');
  };m.customProgramCacheKey=()=>depth?'furnished-depth-mask-v1':'furnished-physical-mask-v1';return m;
 }
 const appearance=new Map(),loader=new T.TextureLoader();
 try{
  const textureCache=new Map();
  for(const a of data.render.materials){
   let map=null;if(a.texture&&renderer){if(!textureCache.has(a.texture)){const t=await loader.loadAsync(new URL(a.texture,import.meta.url).href);t.colorSpace=T.SRGBColorSpace;t.wrapS=t.wrapT=T.RepeatWrapping;t.repeat.setScalar(a.repeat||1);textures.add(t);textureCache.set(a.texture,t);}map=textureCache.get(a.texture);}
   const m=decorate(ownM(new T.MeshStandardMaterial({name:a.name,color:a.color,map,roughness:a.roughness,metalness:a.metalness,side:T.DoubleSide,transparent:false})));
   // Original grossUV is captured as uv; metric scale and native window UVs survive.
   appearance.set(a.id,m);
  }
  const floorAppearance=[...appearance.values()].find(m=>m.name==='Oak boards');
  function append(bucket,triangles,patchIndex,kind,level,glass=0,inv=null){
   for(const t of triangles){if(triangleArea(t.map(v=>v.slice(0,3)))<1e-10)continue;for(const v of t){const p=inv?new T.Vector3(v[0],v[1],v[2]).applyMatrix4(inv):new T.Vector3(v[0],v[1],v[2]),n=new T.Vector3(v[3]??0,v[4]??1,v[5]??0);if(inv)n.transformDirection(inv);
    bucket.position.push(p.x,p.y,p.z);bucket.normal.push(n.x,n.y,n.z);bucket.uv.push(v[8]??v[6]??v[0],v[9]??v[7]??v[2]);bucket.patch.push(patchIndex);bucket.kind.push(kind);bucket.level.push(level);bucket.glass.push(glass);
   }}
  }
  const pools=new Map();
  function bucket(parent,material,key=''){
   const id=parent.uuid+'/'+material.uuid+'/'+key;if(!pools.has(id))pools.set(id,{parent,material,position:[],normal:[],uv:[],patch:[],kind:[],level:[],glass:[]});return pools.get(id);
  }
  // Native furniture moves as complete authored items with separate physical parts.
  for(const item of data.items){
   const group=new T.Group();group.name=item.id;group.position.fromArray(item.position);group.quaternion.fromArray(item.quaternion||[0,0,0,1]);group.updateMatrixWorld(true);root.add(group);itemGroups.set(item.id,{group,definition:item,inverse:new T.Matrix4().copy(group.matrixWorld).invert()});
  }
  for(const o of data.openings.filter(o=>o.kind==='door')){
   const group=new T.Group();group.name=o.id;group.position.fromArray(o.pivot);root.add(group);doorGroups.set(o.id,{group,definition:o,inverse:new T.Matrix4().makeTranslation(-o.pivot[0],-o.pivot[1],-o.pivot[2])});
  }
  const staticRoot=new T.Group();staticRoot.name='Physical surfaces and local retirement';root.add(staticRoot);
  // Each real floor patch becomes one closed solid. Its top, underside and sides share one row.
  for(const s of data.surfaces.filter(s=>s.kind==='floor'&&!s.supportType))for(const p of bySource.get(s.id)){
   const edges=new Map();for(const t of p.triangles)for(let i=0;i<3;i++){const a=t[i],b=t[(i+1)%3],key=[a.join(','),b.join(',')].sort().join('|');if(edges.has(key))edges.delete(key);else edges.set(key,[a,b]);}
   const tris=p.triangles.map(t=>t.map(v=>[...v,0,1,0,v[0],v[2],v[0],v[2]]));
   for(const t of p.triangles)tris.push([...t].reverse().map(v=>[v[0],v[1]-s.thickness,v[2],0,-1,0,v[0],v[2],v[0],v[2]]));
   for(const [a,b]of edges.values()){const c=[b[0],b[1]-s.thickness,b[2]],d=[a[0],a[1]-s.thickness,a[2]],n=normal([a,b,c]);for(const t of [[a,b,c],[a,c,d]])tris.push(t.map(v=>[...v,...n,v[0]+v[2],v[1],v[0]+v[2],v[1]]));}
   append(bucket(staticRoot,floorAppearance),tris,p.index,0,s.level);
  }
  const physicalByMesh=new Map();for(const s of data.surfaces)for(const id of s.sourceMeshBindings){if(!physicalByMesh.has(id))physicalByMesh.set(id,[]);physicalByMesh.get(id).push(...bySource.get(s.id));}
  for(const mesh of data.sourceMeshes){
   const geo=sourceGeometry.get(mesh.id);if(!geo)continue;const part=partByMesh.get(mesh.id),opening=openingByMesh.get(mesh.id);
   if(part){const item=itemGroups.get(part.itemId),row=ownedPartRows.get(part.id).row;for(const t of geo.triangles)append(bucket(item.group,appearance.get(t.materialId)),[t.vertices],row.index,4,part.level,0,item.inverse);continue;}
   if(opening?.kind==='door'){const door=doorGroups.get(opening.id);for(const p of bySource.get(opening.surfaceId))for(const t of geo.triangles)append(bucket(door.group,appearance.get(t.materialId)),polygonTriangles(clipBox(t.vertices,p.clipBounds)),p.index,3,opening.level,0,door.inverse);continue;}
   let candidates=physicalByMesh.get(mesh.id);
   const glass=/glass/i.test(mesh.name);
   if(glass&&opening)candidates=bySource.get(opening.surfaceId);
   for(const t of geo.triangles){
    if(candidates?.length){for(const p of candidates){const poly=clipBox(t.vertices,p.clipBounds);append(bucket(staticRoot,appearance.get(t.materialId)),polygonTriangles(poly),p.index,KIND[p.kind]??1,p.level,glass?1:0);}}
    else for(const poly of gridPieces(t.vertices)){
     const c=centre(poly),roof=/removable-roofs/.test(mesh.id),near=nearestSurface(c,data.surfaces,roof?'roof':null,mesh.level),selected=near&&(bySource.get(near.id)||[]).reduce((a,p)=>!a||distanceToBounds(c,p.bounds)<distanceToBounds(c,a.bounds)?p:a,null);
     if(selected)append(bucket(staticRoot,appearance.get(t.materialId)),polygonTriangles(poly),selected.index,KIND[selected.kind]??1,selected.level,glass?1:0);
    }
   }
   mappedMeshes.set(mesh.id,true);
  }
  // Two recorded stores fill a documented source gap; their contents use one fuel identity each.
  const customAppearance=(name,color,roughness=.9,metalness=0)=>decorate(ownM(new T.MeshStandardMaterial({name,color,roughness,metalness,side:T.DoubleSide})));
  const tin=customAppearance('Period oil tin',0x786443,.72,.45),label=customAppearance('Oil-can painted band',0x8b4f36),binWood=customAppearance('Coal-bin timber',0x66513b),coal=customAppearance('Coal contents',0x25241f,.95);
  coal.emissive.setHex(0xa02705);coal.emissiveIntensity=0;
  function storePrimitive(store,g,material,position,quaternion=null){
   const p=g.attributes.position,n=g.attributes.normal,u=g.attributes.uv,ix=g.index?.array||Array.from({length:p.count},(_,i)=>i),matrix=new T.Matrix4().compose(new T.Vector3(...position),quaternion||new T.Quaternion(),new T.Vector3(1,1,1)),nm=new T.Matrix3().getNormalMatrix(matrix),tris=[];
   for(let i=0;i<ix.length;i+=3)tris.push([0,1,2].map(k=>{const j=ix[i+k],v=new T.Vector3().fromBufferAttribute(p,j).applyMatrix4(matrix),nn=new T.Vector3().fromBufferAttribute(n,j).applyMatrix3(nm).normalize();return [...v.toArray(),...nn.toArray(),u?.getX(j)||0,u?.getY(j)||0];}));
   append(bucket(itemGroups.get(store.itemId).group,material),tris,ownedPartRows.get(store.kind==='coal'&&material===coal?store.fuelPartId:store.id+'/container').row.index,4,0);g.dispose();
  }
  for(const store of data.stores){
   if(store.kind==='oil'){
    storePrimitive(store,new T.BoxGeometry(.40,.43,.32),tin,[0,.235,0]);storePrimitive(store,new T.BoxGeometry(.40,.02,.32),tin,[0,.01,0]);storePrimitive(store,new T.CylinderGeometry(.055,.055,.06,12),tin,[.10,.48,0]);
    storePrimitive(store,new T.BoxGeometry(.24,.10,.015),label,[0,.25,-.168]);
    for(const x of [-.11,.11])storePrimitive(store,new T.BoxGeometry(.025,.09,.035),tin,[x,.49,0]);
    storePrimitive(store,new T.BoxGeometry(.245,.025,.035),tin,[0,.535,0]);
   }else{
    for(const x of [-.34,.34])storePrimitive(store,new T.BoxGeometry(.04,.50,.62),binWood,[x,.27,0]);
    for(const z of [-.29,.29])storePrimitive(store,new T.BoxGeometry(.64,.50,.04),binWood,[0,.27,z]);
    storePrimitive(store,new T.BoxGeometry(.70,.04,.60),binWood,[0,.02,0]);
    for(let x=-2;x<=2;x++)for(let z=-1;z<=1;z++)storePrimitive(store,new T.IcosahedronGeometry(.083+(x+z+4)%3*.008,0),coal,[x*.11,.27+((x*z+5)%3)*.035,z*.15]);
    storeGlows.push({itemId:store.itemId,material:coal});
   }
  }
  for(const b of pools.values()){
   if(!b.position.length)continue;
   const g=ownG(new T.BufferGeometry());for(const [name,arr,size]of [['position',b.position,3],['normal',b.normal,3],['uv',b.uv,2],['fhPatch',b.patch,1],['fhKind',b.kind,1],['fhStorey',b.level,1],['fhGlass',b.glass,1]])g.setAttribute(name,new T.Float32BufferAttribute(arr,size));
   g.computeBoundingBox();g.computeBoundingSphere();const mesh=new T.Mesh(g,b.material);mesh.name='Furnished native batch / '+b.material.name;mesh.castShadow=mesh.receiveShadow=true;
   const depth=decorate(ownM(new T.MeshDepthMaterial({depthPacking:T.RGBADepthPacking,side:T.DoubleSide})),true);mesh.customDepthMaterial=depth;b.parent.add(mesh);batches.push(mesh);
  }
  // Actual live occupancy uses one instanced debug draw, never an inferred fire state.
  const occGeometry=ownG(new T.BoxGeometry(1,1,1)),occMaterial=ownM(new T.MeshBasicMaterial({color:0x6fbaa8,wireframe:true,transparent:true,opacity:.40,depthWrite:false})),occupancy=new T.InstancedMesh(occGeometry,occMaterial,8192);
  occupancy.count=0;occupancy.frustumCulled=false;occupancy.name='Authoritative thermal occupancy';root.add(occupancy);
  const firelight=createStreetFirelight(T);root.add(firelight.root);
  const loose=new T.Group();loose.name='Authoritative falling structural pieces';root.add(loose);const looseRecords=new Map(),effectMapping=new Map(),radiusCache=new Map();
  function inProjectedTriangle(point,t,axis){
   const axes=[0,1,2].filter(i=>i!==axis),p=[point[axes[0]],point[axes[1]]],q=t.map(v=>[v[axes[0]],0,v[axes[1]]]);return pointInTriangleXZ(p,q);
  }
  function matchPatches(record){
   if(patchByRuntimeId.has(record.id))return patchByRuntimeId.get(record.id);
   const sourceId=record.sourceSurfaceId||record.id,list=bySource.get(sourceId)||[],s=surfaces.get(sourceId);
   if(!record.triangles?.length||!s){patchByRuntimeId.set(record.id,list);return list;}
   const axis=s.normal.map(Math.abs).indexOf(Math.max(...s.normal.map(Math.abs))),bb=bounds(record.triangles.flat()),axes=[0,1,2].filter(i=>i!==axis);
   const matched=list.filter(p=>axes.every(i=>Math.min(p.bounds.max[i],bb.max[i])-Math.max(p.bounds.min[i],bb.min[i])>EPS)&&p.triangles.some(t=>inProjectedTriangle(centre(t),record.triangles.find(q=>inProjectedTriangle(centre(t),q,axis))||record.triangles[0],axis)));
   patchByRuntimeId.set(record.id,matched);return matched;
  }
  function applyBoundary(record){
   const sourceId=record.sourceSurfaceId||record.id;boundaryStates.set(record.id,record);if(!bySource.has(sourceId))return;for(const p of matchPatches(record)){const k=p.index*4;stateArray[k]=record.intact===false?0:1;stateArray[k+1]=clamp(record.charFraction);stateArray[k+2]=clamp(record.openFraction);stateArray[k+3]=clamp(record.heatFraction);}
  }
  function applyItem(record){
   const id=record.itemId||record.id,entry=itemGroups.get(id),row=ownedItemRows.get(id);if(!entry||!row)return;itemStates.set(id,{...itemStates.get(id),...record});const value=itemStates.get(id),g=entry.group;
   if(value.matrix){g.matrix.fromArray(value.matrix);g.matrix.decompose(g.position,g.quaternion,g.scale);}else{if(value.position)g.position.fromArray(value.position);if(value.quaternion)g.quaternion.fromArray(value.quaternion);}
   if(g.scale.distanceTo(new T.Vector3(1,1,1))>1e-6)throw Error('Authoritative furniture pose must preserve source scale');
   stateArray[row.index*4]=value.intact===false?0:1;stateArray[row.index*4+1]=clamp(value.charFraction);stateArray[row.index*4+3]=clamp(value.heatFraction);
   for(const partId of entry.definition.partIds){const p=ownedPartRows.get(partId);if(!p)continue;stateArray[p.row.index*4]=value.intact===false?0:1;stateArray[p.row.index*4+1]=clamp(value.charFraction);stateArray[p.row.index*4+3]=clamp(value.heatFraction);}
   for(const part of record.parts||[])applyPart(part);
  }
  function applyPart(record){
   const id=record.partId||record.id,entry=ownedPartRows.get(id);if(!entry)return;const k=entry.row.index*4;
   const consumed=entry.definition.fuelClass&&record.remainingFraction===0;
   stateArray[k]=record.intact===false||consumed?0:1;stateArray[k+1]=clamp(record.charFraction);stateArray[k+3]=clamp(record.heatFraction);
  }
  const pointKey=p=>p.map(v=>Math.round(v*1e6)).join(',');
  function supportRadius(sample,triangles){
   if(!triangles?.length)return null;
   const key=sample.id+'/'+sample.x.toFixed(5)+'/'+sample.z.toFixed(5)+'/'+triangles.length;
   if(radiusCache.has(key))return radiusCache.get(key);
   const edges=new Map();for(const t of triangles)for(let i=0;i<3;i++){const a=t[i],b=t[(i+1)%3],k=[pointKey(a),pointKey(b)].sort().join('|');if(edges.has(k))edges.delete(k);else edges.set(k,[a,b]);}
   const candidates=[[sample.x,sample.z],...triangles.map(t=>[t.reduce((n,p)=>n+p[0],0)/3,t.reduce((n,p)=>n+p[2],0)/3])];
   let best=null;
   for(const p of candidates){if(!triangles.some(t=>pointInTriangleXZ(p,t)))continue;let radius=Infinity;
    for(const [a,b]of edges.values()){const dx=b[0]-a[0],dz=b[2]-a[2],den=dx*dx+dz*dz;if(den<1e-12)continue;const t=clamp(((p[0]-a[0])*dx+(p[1]-a[2])*dz)/den);radius=Math.min(radius,Math.hypot(p[0]-a[0]-t*dx,p[1]-a[2]-t*dz));}
    if(radius>0&&(!best||radius>best.radius))best={x:p[0],z:p[1],radius:Math.max(.001,radius-.001)};
   }
   radiusCache.set(key,best);return best;
  }
  function prepareSample(sample){
   if(![sample.x,sample.y,sample.z,sample.flame,sample.smoke,sample.ignitionTime].every(Number.isFinite))return null;
   let s=surfaces.get(sample.sourceSurfaceId);const item=itemGroups.get(sample.itemId),activeFall=[...fallStates.values()].find(f=>sample.itemId&&f.itemId===sample.itemId||f.fuelIds?.includes(sample.id));
   if(!s&&sample.sourceSurfaceId)s=boundaryStates.get(sample.sourceSurfaceId);
   if(!s&&!item&&!activeFall){
    s=data.surfaces.filter(s=>s.kind==='floor'&&s.bounds.max[1]<=sample.y+.06&&s.bounds.max[1]>=sample.y-.12&&sample.x>=s.bounds.min[0]-EPS&&sample.x<=s.bounds.max[0]+EPS&&sample.z>=s.bounds.min[2]-EPS&&sample.z<=s.bounds.max[2]+EPS&&s.triangles.some(t=>pointInTriangleXZ([sample.x,sample.z],t))).sort((a,b)=>b.bounds.max[1]-a.bounds.max[1])[0];
    if(!s&&sample.floorFootprint)s={id:sample.sourceSurfaceId||'authoritative-loose-support',kind:'floor',level:Math.max(0,Math.floor((sample.y-.40)/2.12)),triangles:sample.floorFootprint};
   }
   if(!s&&!item&&!activeFall&&!sample.openingId)return null;
   const q={...sample,flame:clamp(sample.flame),smoke:clamp(sample.smoke),exposed:sample.exposed!==false};
   if(sample.part==='contents'&&sample.id.endsWith(':embers')){q.part='ground';q.nx=0;q.ny=1;q.nz=0;q.floorRadius=q.supportRadius=.10;return q;}
   if(activeFall){q.part='ground';q.nx=0;q.ny=1;q.nz=0;q.floorRadius=q.supportRadius=.12;return q;}
   if(s){const rows=bySource.get(s.id)||[],live=!rows.length||rows.some(p=>stateArray[p.index*4]>.5);if(!live&&s.kind!=='window')return null;
    if(s.kind==='floor'||s.kind==='roof'){
     q.sourceSurfaceId=q.sourceSurfaceId||s.id;
     const footprint=sample.floorFootprint||sample.footprint||s.triangles,r=supportRadius(sample,footprint);if(!r)return null;
     const dx=r.x-q.x,dz=r.z-q.z;q.x=r.x;q.z=r.z;
     if(s.kind==='roof'&&Math.abs(q.ny)>.05)q.y+=(-q.nx/q.ny)*dx+(-q.nz/q.ny)*dz;
     q.supportRadius=Math.min(r.radius,Math.sqrt(Math.max(.001,sample.area))*.5);q.floorRadius=q.supportRadius;q.part=s.kind==='floor'?'ground':'roof';
    }else{
     q.part='walls';const horizontal=Math.hypot(q.nx,q.nz)||1,tx=q.nz/horizontal,tz=-q.nx/horizontal,coords=s.triangles.flat().map(p=>p[0]*tx+p[2]*tz),at=q.x*tx+q.z*tz;
     q.tangentRadius=Math.max(.01,Math.min(at-Math.min(...coords),Math.max(...coords)-at)-.002);
    }
   }else{q.part='ground';const b=item.definition.bounds;q.supportRadius=q.floorRadius=Math.max(.025,Math.min(b.max[0]-b.min[0],b.max[2]-b.min[2])*.36);q.nx=0;q.ny=1;q.nz=0;}
   return q;
  }
  function setView(view){
   let next=view.mode||'exterior',level=Number.isInteger(view.level)?view.level:0;
   if(next==='auto'){const o=view.observer;let inside=false;if(o){const l=data.levels.find(l=>o.y>=l.floorY-.25&&o.y<l.floorY+2);if(l&&l.floorTriangles.some(t=>pointInTriangleXZ([o.x,o.z],t))){inside=true;level=l.index;}}next=inside?'cutaway':'exterior';}
   if(!['exterior','cutaway','xray'].includes(next))throw Error('Unknown furnished-house view');
   const changed=mode!==next;mode=next;selectedLevel=level;viewMode.value=next==='cutaway'?1:next==='xray'?2:0;viewLevel.value=level;cutY.value=(data.levels.find(l=>l.index===level)?.floorY||.48)+.82;
   if(changed)for(const m of appearance.values()){m.transparent=next==='xray';m.depthWrite=next!=='xray';m.needsUpdate=true;}
   occupancy.visible=next==='xray';
  }
  function makeLoose(fall,frame){
   if(fall.itemId)return;const sample=frame.fireSamples?.find(s=>fall.fuelIds?.includes(s.id)),source=sample&&surfaces.get(sample.sourceSurfaceId);
   if(!source)return;const b=bounds(source.triangles.flat()),size=b.max.map((v,i)=>Math.max(.045,v-b.min[i])),g=ownG(new T.BoxGeometry(...size)),m=ownM(new T.MeshStandardMaterial({color:0x3d3026,roughness:.98}));
   const mesh=new T.Mesh(g,m);mesh.castShadow=mesh.receiveShadow=true;mesh.name='Tracked burning fragment '+fall.id;loose.add(mesh);looseRecords.set(fall.id,{mesh,geometry:g,material:m,sourceSurfaceId:source.id});
  }
  function removeLoose(id){const record=looseRecords.get(id);if(!record)return;record.mesh.removeFromParent();record.geometry.dispose();record.material.dispose();geometries.delete(record.geometry);materials.delete(record.material);looseRecords.delete(id);}
  function update(frame,view={}){
   if(disposed)throw Error('Furnished-house art disposed');
   if(frame?.version!==1||!Number.isFinite(frame.worldTime)||!Number.isFinite(frame.revision))throw Error('Expected authoritative version-1 frame');
   const reset=frame.full||frame.revision<lastRevision||frame.worldTime<lastTime;
   if(reset){
    resetState();for(const id of [...looseRecords.keys()])removeLoose(id);
    for(const [id,entry]of itemGroups){entry.group.position.fromArray(entry.definition.position);entry.group.quaternion.fromArray(entry.definition.quaternion||[0,0,0,1]);entry.group.scale.set(1,1,1);}
   }
   const updatedBoundaryIds=new Set();for(const b of frame.boundaries||[]){applyBoundary(b);updatedBoundaryIds.add(b.id);}for(const b of frame.supports||[])if(!updatedBoundaryIds.has(b.id))applyBoundary(b);
   for(const i of frame.items||[])applyItem(i);for(const p of frame.furnitureParts||frame.parts||[])applyPart(p);
   for(const f of frame.falls||[]){
    fallStates.set(f.id,f);if(f.itemId)applyItem({...f,id:f.itemId,itemId:f.itemId,intact:true});
    else{if(!looseRecords.has(f.id))makeLoose(f,frame);const r=looseRecords.get(f.id);if(r){r.mesh.position.fromArray(f.position);r.mesh.quaternion.fromArray(f.quaternion||[0,0,0,1]);}}
   }
   for(const t of frame.tombstones||[]){const id=typeof t==='string'?t:t.id;if(t.collection==='falls'||fallStates.has(id)){fallStates.delete(id);removeLoose(id);}else if(itemGroups.has(id))applyItem({id,intact:false});else if(boundaryStates.has(id))applyBoundary({...boundaryStates.get(id),intact:false,openFraction:1});}
   for(const [id,entry]of doorGroups){const states=[...boundaryStates.values()].filter(b=>b.sourceSurfaceId===id),fraction=states.length?states.reduce((n,b)=>n+clamp(b.openFraction),0)/states.length:entry.definition.initialOpenFraction;entry.group.quaternion.setFromAxisAngle(new T.Vector3(0,1,0),fraction*entry.definition.maxOpenAngle);}
   setView(view);root.updateMatrixWorld(true);
   missingSamples=0;representedSamples=0;fireSamples=[];effectMapping.clear();
   for(const sample of frame.fireSamples||[]){if(!(sample.flame>0||sample.smoke>0))continue;const q=prepareSample(sample);if(q){fireSamples.push(q);effectMapping.set(sample.id,{sourceSurfaceId:sample.sourceSurfaceId||null,itemId:sample.itemId||null,anchor:[q.x,q.y,q.z],supportRadius:q.supportRadius||null,tangentRadius:q.tangentRadius||null});representedSamples++;}else missingSamples++;}
   const camera=view.camera;
   if(camera){
    const visibleSamples=fireSamples.filter(q=>{if(mode!=='cutaway')return true;const dynamic=q.part==='ground'&&(q.itemId||q.id.endsWith(':embers')||[...fallStates.values()].some(f=>f.fuelIds?.includes(q.id))),s=surfaces.get(q.sourceSurfaceId),item=itemGroups.get(q.itemId);if(s?.kind==='roof'&&!dynamic)return false;const level=dynamic?Math.max(0,Math.floor((q.y-.40)/2.12)):s?.level??item?.definition.level??0;return level===selectedLevel;});
    const count=Math.ceil(visibleSamples.length/80);while(effects.length<count){const fx=createWallShroud(T,{maxCells:80,profile:'house'});effects.push(fx);root.add(fx.root);}
    for(let i=0;i<effects.length;i++){effects[i].root.visible=i<count;effects[i].update({time:frame.worldTime,cells:visibleSamples.slice(i*80,(i+1)*80),camera,sampleWind:view.sampleWind});}
   }
   const observer=view.observer||{x:5,y:.48,z:-3},lightSamples=fireSamples.filter(s=>s.flame>0).map(s=>({...s,part:s.part==='ground'?'floor':s.part,exposed:s.exposed!==false}));
   firelight.update({cells:[],world:{fireCellSize:.5},player:{x:observer.x,y:observer.z}},new Map([[data.buildingId,lightSamples]]),frame.worldTime,[]);
   // Keep the existing bounded pool, with practicals inside their native vertical storey.
   for(const light of firelight.root.children)if(light.isPointLight&&light.intensity>0){let nearest=null,distance=Infinity;for(const s of lightSamples){const d=(s.x-light.position.x)**2+(s.z-light.position.z)**2;if(d<distance){distance=d;nearest=s;}}
    const source=nearest&&(surfaces.get(nearest.sourceSurfaceId)||itemGroups.get(nearest.itemId)?.definition),floorY=data.levels.find(l=>l.index===source?.level)?.floorY;if(floorY!==undefined)light.position.y=Math.max(floorY+.25,Math.min(floorY+1.8,light.position.y));
   }
   for(const entry of storeGlows){const sample=fireSamples.filter(s=>s.itemId===entry.itemId).reduce((n,s)=>Math.max(n,s.glow||0,s.heatFraction||0,s.flame||0),0),state=itemStates.get(entry.itemId);entry.material.emissiveIntensity=Math.max(sample,clamp(state?.heatFraction))*1.75;}
   const occ=mode==='xray'?(frame.occupancy||[]):[],matrix=new T.Matrix4(),color=new T.Color();occupancy.count=Math.min(8192,occ.length);
   for(let i=0;i<occupancy.count;i++){const c=occ[i],b=c.bounds;if(!b)continue;const size=b.max.map((v,k)=>Math.max(.005,v-b.min[k]-.015)),pos=b.min.map((v,k)=>(v+b.max[k])/2);matrix.compose(new T.Vector3(...pos),new T.Quaternion(),new T.Vector3(...size));occupancy.setMatrixAt(i,matrix);color.setRGB(.12+.88*clamp(c.heatFraction),.28+.4*(1-clamp(c.heatFraction)),.22);occupancy.setColorAt(i,color);}
   occupancy.instanceMatrix.needsUpdate=true;if(occupancy.instanceColor)occupancy.instanceColor.needsUpdate=true;
   stateTexture.needsUpdate=true;retiredPatches=patches.reduce((n,p)=>n+Number(stateArray[p.index*4]<.5),0);lastRevision=frame.revision;lastTime=frame.worldTime;lastFrame=frame;revisionCount++;
  }
  function diagnostics(){return {disposed,version:1,prefabId:data.prefabId,worldTime:lastTime,revision:lastRevision,view:mode,level:selectedLevel,sourceSurfaces:data.surfaces.length,physicalPatches:patches.length,retiredPatches,sourceMeshes:data.sourceMeshes.length,batches:batches.length,items:itemGroups.size,falls:fallStates.size,fallVisuals:looseRecords.size,occupancy:occupancy.count,fireSamples:fireSamples.length,representedSamples,missingSamples,emitterBatches:effects.length,fire:effects.map(f=>f.stats()),lightBudget:firelight.diagnostics(),actualLights:firelight.root.children.filter(l=>l.isPointLight&&l.intensity>0).map(l=>({position:l.position.toArray(),intensity:l.intensity,reach:l.distance})),resources:{geometries:geometries.size,materials:materials.size,textures:textures.size},resetCount,revisionCount,rootScale:root.scale.toArray(),stateBindings:bySource.size};}
  function dispose(){
   if(disposed)return;disposed=true;root.removeFromParent();for(const fx of effects)fx.dispose();firelight.dispose();occupancy.dispose();for(const r of looseRecords.values())r.mesh.removeFromParent();for(const g of geometries)g.dispose();for(const m of materials)m.dispose();for(const t of textures)t.dispose();geometries.clear();materials.clear();textures.clear();root.clear();itemGroups.clear();doorGroups.clear();bySource.clear();ownedPartRows.clear();openingState.clear();mappedMeshes.clear();boundaryStates.clear();fallStates.clear();patchByRuntimeId.clear();effectMapping.clear();radiusCache.clear();patches.length=0;
  }
  return {root,update,diagnostics,dispose,inspect(){return {patches:patches.map(p=>({id:p.id,sourceSurfaceId:p.sourceSurfaceId,kind:p.kind,level:p.level,present:stateArray[p.index*4]>.5,char:stateArray[p.index*4+1],triangles:p.triangles})),emitters:[...effectMapping].map(([id,v])=>({id,...v}))};}};
 }catch(error){for(const fx of effects)fx.dispose();for(const g of geometries)g.dispose();for(const m of materials)m.dispose();for(const t of textures)t.dispose();root.clear();throw error;}
}
