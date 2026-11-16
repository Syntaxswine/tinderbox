import {Matrix4,Quaternion,Vector3} from '../../../src/runtime/three.js';
import {bounds,triangleArea,normal,polygonTriangles,subtractBox,clipBox,pointInTriangleXZ} from '../furnished-house/geometry.js';

export const CIRCULATION_ID='catalogue-h15-circulation-150-v1';
export const FRONT_LEFT='opening/l0/5-0-6-0',FRONT_RIGHT=FRONT_LEFT+'/right';
const clone=structuredClone,r=n=>Math.abs(n)<1e-10?0:Math.round(n*1e7)/1e7;
const area=ts=>ts.reduce((n,t)=>n+triangleArea(t.map(v=>v.slice(0,3))),0);
const matrix=(dx=0,dy=0,dz=0)=>new Matrix4().makeTranslation(dx,dy,dz);
const size=b=>b.max.map((v,i)=>v-b.min[i]);
const volume=b=>size(b).reduce((a,b)=>a*b,1);
const pointKeys=new Set(['position','pivot','centre','center','sourcePosition','initialPosition','base','outside']);
function placed(value,m,key=''){
 const p=a=>new Vector3(...a).applyMatrix4(m).toArray().map(r);
 if(Array.isArray(value)){
  if(pointKeys.has(key)&&value.length===3&&value.every(Number.isFinite))return p(value);
  if(['matrix','closedTransform','openTransform'].includes(key)&&value.length===16)return m.clone().multiply(new Matrix4().fromArray(value)).toArray().map(r);
  if(key==='vertices')return value.map(v=>[...p(v.slice(0,3)),...new Vector3(...v.slice(3,6)).transformDirection(m).toArray().map(r),...v.slice(6)]);
  if(['triangles','undersideTriangles','solidTriangles','floorTriangles'].includes(key))return value.map(t=>Array.isArray(t)?t.map(p):placed(t,m));
  if(['polygon','footprint'].includes(key))return value.map(v=>Array.isArray(v)?v.every(Number.isFinite)?v.length===2?(()=>{const q=p([v[0],0,v[1]]);return [q[0],q[2]];})():p(v):placed(v,m,key):placed(v,m));
  if(['normal','outward','direction'].includes(key)&&value.length===3)return new Vector3(...value).transformDirection(m).toArray().map(r);
  return value.map(v=>placed(v,m,key));
 }
 if(!value||typeof value!=='object')return value;
 if(Array.isArray(value.min)&&Array.isArray(value.max)){
  const points=[];for(const x of [value.min[0],value.max[0]])for(const y of [value.min[1],value.max[1]])for(const z of [value.min[2],value.max[2]])points.push(p([x,y,z]));
  return {...clone(value),...bounds(points)};
 }
 return Object.fromEntries(Object.entries(value).map(([k,v])=>[k,placed(v,m,k)]));
}
function capAttributes(vertex,face){
 const [a,b,c]=face,ab=b.slice(0,3).map((v,i)=>v-a[i]),ac=c.slice(0,3).map((v,i)=>v-a[i]),av=vertex.map((v,i)=>v-a[i]),dot=(a,b)=>a.reduce((s,v,i)=>s+v*b[i],0),
  aa=dot(ab,ab),bb=dot(ac,ac),cc=dot(ab,ac),d=aa*bb-cc*cc,u=(bb*dot(av,ab)-cc*dot(av,ac))/d,v=(aa*dot(av,ac)-cc*dot(av,ab))/d;
 return [...vertex,...a.slice(3).map((x,i)=>x+u*(b[i+3]-x)+v*(c[i+3]-x))];
}
function cutBoxGeometry(geo,keep){
 const ts=geo.triangles.flatMap(t=>polygonTriangles(clipBox(t.vertices,keep)).map(vertices=>({...t,vertices}))).filter(t=>area([t.vertices])>1e-10),bb=bounds(geo.triangles.flatMap(t=>t.vertices.map(v=>v.slice(0,3))));
 for(let axis=0;axis<3;axis++)for(const side of [0,1]){
  const coordinate=side?keep.max[axis]:keep.min[axis];if(Math.abs(coordinate-(side?bb.max[axis]:bb.min[axis]))<1e-6)continue;
  const desired=side?1:-1,face=geo.triangles.find(t=>Math.abs(normal(t.vertices.map(v=>v.slice(0,3)))[axis]-desired)<1e-5);if(!face)throw Error('Native stock lacks cap face');
  const other=[0,1,2].filter(i=>i!==axis),corners=[[0,0],[1,0],[1,1],[0,1]].map(([a,b])=>{const v=[];v[axis]=coordinate;v[other[0]]=a?keep.max[other[0]]:keep.min[other[0]];v[other[1]]=b?keep.max[other[1]]:keep.min[other[1]];return v;});
  if(normal(corners.slice(0,3))[axis]*desired<0)corners.reverse();
  for(const t of polygonTriangles(corners))ts.push({materialId:face.materialId,vertices:t.map(v=>capAttributes(v,face.vertices))});
 }
 return {...clone(geo),triangles:ts};
}
export function applyH15CirculationVariant(data,stock){
 if(data.navigation.gameAccessVariant?.id!=='catalogue-h15-access-125-v1')throw Error('Expected immutable access125 source');
 const before=clone(data),removed=new Set(),moved=[],added=[],cuts=[],itemMoves=[],meshMap=new Map(before.sourceMeshes.map(m=>[m.id,m])),geoMap=new Map(before.render.geometry.map(g=>[g.id,g]));
 const meshes=()=>new Map(data.sourceMeshes.map(m=>[m.id,m])),surfaces=()=>new Map(data.surfaces.map(s=>[s.id,s]));
 const totalFuel=d=>d.surfaces.reduce((n,s)=>n+(s.fuelAmount||0),0),floorArea=d=>d.surfaces.filter(s=>s.id.startsWith('floor/l1/')||s.circulationFloor).reduce((n,s)=>n+(s.area||0),0);
 const changeLog={id:CIRCULATION_ID,classification:'Architect-selected 1.50m gameplay circulation adaptation, not historical dimensions',contract:'32576da673524a5bbff39ea556976ab24e0310fd',control:{commit:'5deda67fbe3fe0968f90cdbc3e806e98baab0b86',path:'workbenches/catalogue-modular/house-data.json',sha256:'965abd52ee8c06d77a96187c61568ba5325ff44cbab6515eca5f1422c359611b'},nativeModule:[1,1,2.12],targets:{clearWidth:1.5,frontHeadroom:2},removed:[],moved,added,cuts,itemMoves};
 function drop(ids){
  const set=new Set(ids);for(const id of ids)removed.add(id);
  const removedSurfaces=new Set(data.surfaces.filter(s=>set.has(s.id)||s.sourceMeshBindings?.some(id=>set.has(id))).map(s=>s.id));for(const id of removedSurfaces)removed.add(id);
  data.surfaces=data.surfaces.filter(s=>!removedSurfaces.has(s.id));data.sourceMeshes=data.sourceMeshes.filter(m=>!set.has(m.id));data.render.geometry=data.render.geometry.filter(g=>!set.has(g.id));
 }
 function moveMesh(id,offset){
  const m=matrix(...offset),source=data.sourceMeshes.find(v=>v.id===id),geometry=data.render.geometry.find(v=>v.id===id);if(!source||!geometry)throw Error('Missing movable native mesh '+id);
  const previous=clone(source.bounds),at=data.sourceMeshes.indexOf(source);data.sourceMeshes[at]=placed(source,m);
  data.render.geometry[data.render.geometry.indexOf(geometry)]=placed(geometry,m);
  const ids=[];data.surfaces=data.surfaces.map(s=>s.sourceMeshBindings?.includes(id)?(ids.push(s.id),placed(s,m)):s);
  moved.push({id,offset,physicalSurfaceIds:ids,before:previous,after:clone(data.sourceMeshes[at].bounds),nativeSizeAndPaint:true});return data.sourceMeshes[at];
 }
 function bind(surface,hosts,reason){surface.supportSurfaceIds=[...new Set(hosts)];surface.attachmentHostSurfaceIds=[...surface.supportSurfaceIds];surface.connectionTolerance=.00001;surface.supportBinding={kind:reason,hostSurfaceIds:[...surface.supportSurfaceIds],bearingSurfaceIds:[...surface.supportSurfaceIds],inferred:false,tolerance:.00001};}
 function nativeCut(stockId,id,keep,transform,{kind='attachment',level=0,supportType,material='timber',fuelClass='frame',fuelAmount,hosts=[]}={}){
  const original=meshMap.get(stockId),source=geoMap.get(stockId);if(!original||!source)throw Error('Missing stock '+stockId);
  const cut=cutBoxGeometry(source,keep),geo=placed({...cut,id},transform),points=geo.triangles.flatMap(t=>t.vertices.map(v=>v.slice(0,3))),bb=bounds(points),sized=size(bb),sourceSurfaces=before.surfaces.filter(s=>s.sourceMeshBindings?.includes(stockId)),sourceFuel=sourceSurfaces.reduce((n,s)=>n+(s.fuelAmount||0),0);
  const m=placed({...clone(original),id,bounds:bounds(cut.triangles.flatMap(t=>t.vertices.map(v=>v.slice(0,3))))},transform);m.level=level;m.sourceRole='Versioned native stock end cut / rigid placement';m.sourceStock={id:stockId,bounds:clone(original.bounds),keep:clone(keep),noScale:true};data.sourceMeshes.push(m);data.render.geometry.push(geo);
  const top=geo.triangles.filter(t=>normal(t.vertices.map(v=>v.slice(0,3)))[1]>.999).map(t=>t.vertices.map(v=>v.slice(0,3))),solid=geo.triangles.map(t=>t.vertices.map(v=>v.slice(0,3))),quantity=fuelAmount??sourceFuel*volume(keep)/volume(original.bounds),surface={id,kind,level,supportType,triangles:kind==='floor'?top:solid,normal:kind==='floor'?[0,1,0]:normal(solid[0]),thickness:kind==='floor'?r(sized[1]):0,material,bounds:bb,sourceMeshBindings:[id],area:area(kind==='floor'?top:solid),fuelClass:quantity>0?fuelClass:null,fuelAmount:r(quantity),supports:kind==='floor',derivedClosedSlab:false};
  if(kind!=='floor')surface.solidTriangles=clone(solid);bind(surface,hosts,'Actual native cut solid bearing');data.surfaces.push(surface);added.push({id,stockId,keep:clone(keep),bounds:clone(bb),kind,supportType,volume:volume(bb),fuelAmount:surface.fuelAmount,hosts:[...hosts]});return surface;
 }
 const beam=before.sourceMeshes.find(m=>m.name==='Porch beam'),beamId=beam.id,beamBB=beam.bounds;
 function beamPiece(id,length,centre,{vertical=false,alongZ=false,...options}={}){
  const keep={min:clone(beamBB.min),max:clone(beamBB.max)};keep.max[0]=keep.min[0]+length;
  const origin=keep.min.map((v,i)=>(v+keep.max[i])/2),m=matrix(...centre).multiply(vertical?new Matrix4().makeRotationZ(Math.PI/2):alongZ?new Matrix4().makeRotationY(-Math.PI/2):new Matrix4()).multiply(matrix(...origin.map(v=>-v)));
  return nativeCut(beamId,id,keep,m,options);
 }
 // Remove both real infill piers and their low trim, including the exact captured exit blocker.
 drop(data.sourceMeshes.filter(m=>m.id.includes('/wall-4-0-5-0/')).map(m=>m.id));
 const casingIds=before.sourceMeshes.filter(m=>m.id.includes('/wall-5-0-6-0/')&&m.name==='Door casing').map(m=>m.id);
 moveMesh(casingIds[0],[-.5,0,0]);moveMesh(casingIds[1],[.5,0,0]);
 const oldHeader=before.sourceMeshes.find(m=>m.id.includes('/wall-5-0-6-0/')&&m.name==='Prototype transposed door header');drop([oldHeader.id]);
 const jambExtensions=casingIds.map((id,i)=>{const original=meshMap.get(id),keep=clone(original.bounds);keep.max[1]=keep.min[1]+.26;return nativeCut(id,'circulation150/entry/jamb-extension-'+i,keep,matrix(i?.5:-.5,2.22-keep.min[1],0),{hosts:['porch/724']});});
 // The native 0.12m beam sits in the floor band, keeping a true 2m opening.
 for(let i=0;i<jambExtensions.length;i++)bind(jambExtensions[i],data.surfaces.filter(q=>q.sourceMeshBindings?.includes(casingIds[i])).map(q=>q.id),'Actual moved native casing top');
 const header=beamPiece('circulation150/entry/header',2.16,[5,2.54,0],{kind:'floor',level:1,supportType:'entry-header',hosts:jambExtensions.map(s=>s.id)});header.circulationFloor=true;
 const entry=before.openings.find(o=>o.id===FRONT_LEFT),leafIds=entry.sourceMeshBindings.filter(id=>geoMap.has(id)),leftIds=new Set(leafIds),rightMap=new Map(leafIds.map(id=>[id,id+'/right']));
 const originalLeafSurfaces=before.surfaces.filter(s=>s.id===FRONT_LEFT||s.id===entry.transomSurfaceId||s.sourceMeshBindings?.some(id=>leftIds.has(id)));
 for(const id of leafIds)moveMesh(id,[-.5,0,0]);
 // The door boundary/transom are independent of static panel fitting records.
 for(const original of originalLeafSurfaces){const at=data.surfaces.findIndex(s=>s.id===original.id);if(at>=0)data.surfaces[at]=placed(original,matrix(-.5,0,0));}
 for(const id of leafIds){const offset=[.5,0,0];if(meshMap.get(id).name==='Door knob')offset[0]-=.76;const m=matrix(...offset);data.sourceMeshes.push(placed({...clone(meshMap.get(id)),id:rightMap.get(id)},m));data.render.geometry.push(placed({...clone(geoMap.get(id)),id:rightMap.get(id)},m));}
 const replaceIds=v=>{if(typeof v==='string')return v===FRONT_LEFT?FRONT_RIGHT:v===entry.transomSurfaceId?FRONT_RIGHT+'/transom':rightMap.get(v)||v;if(Array.isArray(v))return v.map(replaceIds);if(v&&typeof v==='object')return Object.fromEntries(Object.entries(v).map(([k,x])=>[k,replaceIds(x)]));return v;};
 for(const original of originalLeafSurfaces){const knob=original.sourceMeshBindings?.length===1&&meshMap.get(original.sourceMeshBindings[0])?.name==='Door knob',q=replaceIds(placed(original,matrix(knob?-.26:.5,0,0)));if(q.id===original.id)q.id=original.id+'/right';data.surfaces.push(q);}
 const left=placed(entry,matrix(-.5,0,0)),right=replaceIds(placed(entry,matrix(.5,0,0)));
 for(const [o,pivot,angle]of [[left,[4,.48,-.15],Math.PI/2],[right,[6,.48,-.15],-Math.PI/2]]){o.pivot=pivot;o.axis=[0,1,0];o.maxOpenAngle=angle;o.closedTransform=matrix(...pivot).toArray();o.openTransform=matrix(...pivot).multiply(new Matrix4().makeRotationY(angle)).toArray();o.navigationStatus='Versioned paired native leaf, outer hinge, outward90deg';o.sourceWallBinding='circulation150/entry/paired-frame';}
 data.openings=data.openings.filter(o=>o.id!==FRONT_LEFT);data.openings.push(left,right);
 data.navigation.entryDoorGroup={id:FRONT_LEFT,openingIds:[FRONT_LEFT,FRONT_RIGHT],position:[5,1.35,-.15],label:'House door'};
 // Two columns of unchanged native stone blocks; there is no stretched or invisible approach.
 const approach=before.sourceMeshes.filter(m=>m.bounds.min[2]>-3.5&&m.bounds.max[2]<-1.99&&m.bounds.max[1]<=.481&&m.bounds.min[0]>4&&m.bounds.max[0]<6);
 for(const m of approach){moveMesh(m.id,[-.58,0,0]);const s=before.surfaces.find(s=>s.sourceMeshBindings?.includes(m.id));nativeCut(m.id,'circulation150/entry/step-right-'+s.id.split('/').at(-1),clone(m.bounds),matrix(.58,0,0),{kind:'floor',supportType:'entry-step',material:'stone',fuelClass:null,fuelAmount:0,hosts:[]});}
 for(const m of before.sourceMeshes.filter(m=>(m.name==='Entry stair rail'||m.name==='Prototype entry rail post'))){const left=m.bounds.max[0]<5;moveMesh(m.id,[left?-.5:.5,0,0]);}
 drop(data.sourceMeshes.filter(m=>m.name==='Porch baluster'&&m.bounds.max[0]>4&&m.bounds.min[0]<6).map(m=>m.id));
 for(const m of before.sourceMeshes.filter(m=>m.name==='Porch handrail')){
  const keep=clone(m.bounds);if(m.bounds.max[0]<5)keep.max[0]=4;else keep.min[0]=6;
  drop([m.id]);nativeCut(m.id,m.id,keep,new Matrix4(),{hosts:['porch/724']});removed.delete(m.id);
 }
 // Open the circulation core using whole native bays. The outer shell stays untouched.
 const removedEdges=['wall-3-5-4-5','wall-6-0-6-1','wall-6-1-6-2','wall-6-2-6-3','wall-4-0-4-1','wall-4-1-4-2','wall-4-2-4-3'];
 const holeRects=[{min:[4.75,2.47,1.25],max:[6.25,4.7,5.38]},{min:[6.25,2.47,3.5],max:[8.5,4.7,5]}];
 const xzOverlap=(a,b)=>[0,2].every(i=>Math.min(a.max[i],b.max[i])-Math.max(a.min[i],b.min[i])>1e-6);
 drop(data.sourceMeshes.filter(m=>m.level===0&&removedEdges.some(edge=>m.id.includes('/'+edge+'/'))||m.level===1&&m.id.includes('/level-1/0/group/')&&holeRects.some(b=>xzOverlap(m.bounds,b))).map(m=>m.id));
 // A native beam and two real full-height stock posts carry the newly open parlor side.
 const parlorPosts=[.06,2.94].map((z,i)=>beamPiece('circulation150/parlor/post-'+i,2,[4,1.48,z],{vertical:true,hosts:[]}));
 const parlorHeader=beamPiece('circulation150/parlor/header',3,[4,2.54,1.5],{alongZ:true,kind:'floor',level:1,supportType:'opening-header',hosts:parlorPosts.map(s=>s.id)});parlorHeader.circulationFloor=true;
 // Native risers are retained. Each regular0.375m going is0.25m native plus0.125m native end cut.
 const going=.375,treadSurfaces=before.surfaces.filter(s=>s.supportType==='stair-tread'),treads=[],lowerTreads=[],upperTreads=[];
 for(const [i,s]of treadSurfaces.entries()){
  const upperFlight=i>=6,j=upperFlight?i-6:i,id=s.sourceMeshBindings[0],original=meshMap.get(id),targetStart=upperFlight?6.25+j*going:1.5+j*going,members=upperFlight?upperTreads:lowerTreads;
  const transform=(minX,maxZ,dz=0)=>upperFlight?matrix(targetStart+dz,0,maxZ).multiply(new Matrix4().makeRotationY(Math.PI/2)).multiply(matrix(-original.bounds.min[0],0,-original.bounds.min[2])):matrix(minX-original.bounds.min[0],0,targetStart-original.bounds.min[2]+dz);
  if(upperFlight){const mt=transform(0,4.75),m=data.sourceMeshes.find(m=>m.id===id),g=data.render.geometry.find(g=>g.id===id);data.sourceMeshes[data.sourceMeshes.indexOf(m)]=placed(m,mt);data.render.geometry[data.render.geometry.indexOf(g)]=placed(g,mt);data.surfaces=data.surfaces.map(q=>q.sourceMeshBindings?.includes(id)?placed(q,mt):q);moved.push({id,rigidMatrix:mt.toArray(),nativeSizeAndPaint:true});}
  else moveMesh(id,[0,0,targetStart-original.bounds.min[2]]);
  treads.push(s.id);members.push(s.id);
  const rear=clone(original.bounds);rear.max[2]=rear.min[2]+.125;
  const rearId=nativeCut(id,'circulation150/stair/'+s.id.split('/').at(-1)+'/going',rear,transform(5,4.75,.25),{kind:'floor',supportType:'stair-tread',fuelAmount:s.fuelAmount*.5,hosts:s.supportSurfaceIds||[]}).id;treads.push(rearId);members.push(rearId);
  for(const side of [-1,1])for(const [suffix,depth,dz]of [['',.25,0],['-going',.125,.25]]){
   const keep=clone(original.bounds);keep.max[0]=keep.min[0]+.25;keep.max[2]=keep.min[2]+depth;
   const ext=nativeCut(id,'circulation150/stair/'+s.id.split('/').at(-1)+(side<0?'/left':'/right')+suffix,keep,transform(side<0?4.75:6,side<0?3.75:5,dz),{kind:'floor',supportType:'stair-tread',fuelAmount:s.fuelAmount*.25*depth/.25,hosts:s.supportSurfaceIds||[]});treads.push(ext.id);members.push(ext.id);
  }
 }
 drop(data.sourceMeshes.filter(m=>m.id.startsWith('access125/')||['Stair newel','Stair handrail'].includes(m.name)&&m.id.includes('/level-0/1/')).map(m=>m.id));
 const railStock=before.sourceMeshes.find(m=>m.id.endsWith('/21/stair-handrail')),railGeometry=geoMap.get(railStock.id),inverse=new Matrix4().fromArray(railStock.matrix).invert(),localGeometry=placed(railGeometry,inverse),localBounds=bounds(localGeometry.triangles.flatMap(t=>t.vertices.map(v=>v.slice(0,3)))),localId='native-stock/local-stair-handrail';
 meshMap.set(localId,{...clone(railStock),id:localId,bounds:localBounds,matrix:new Matrix4().toArray()});geoMap.set(localId,{...localGeometry,id:localId});
 const railFuel=before.surfaces.filter(s=>s.sourceMeshBindings?.includes(railStock.id)).reduce((n,s)=>n+(s.fuelAmount||0),0),railLength=size(localBounds)[1];
 function nativeRail(id,a,b){
  a=new Vector3(...a);b=new Vector3(...b);const direction=b.clone().sub(a),length=direction.length(),keep=clone(localBounds);keep.max[1]=keep.min[1]+length;
  const centre=keep.min.map((v,i)=>(v+keep.max[i])/2),rotation=new Matrix4().makeRotationFromQuaternion(new Quaternion().setFromUnitVectors(new Vector3(0,1,0),direction.normalize())),mt=matrix(...a.clone().add(b).multiplyScalar(.5).toArray()).multiply(rotation).multiply(matrix(...centre.map(v=>-v)));
  const result=nativeCut(localId,id,keep,mt,{fuelAmount:railFuel*length/railLength,hosts:[]});data.sourceMeshes.find(m=>m.id===id).sourceStock.id=railStock.id;return result;
 }
 const clipFloors=[...holeRects.map(b=>({min:[b.min[0],2.47,b.min[2]],max:[b.max[0],2.61,b.max[2]]})),{min:[3.92,2.47,0],max:[6.08,2.61,.09]},{min:[3.91,2.47,0],max:[4.09,2.61,3]}];
 function cutTriangles(ts){return ts.flatMap(t=>{let ps=[t];for(const box of clipFloors)ps=ps.flatMap(p=>subtractBox(p,box));return ps.flatMap(polygonTriangles).filter(t=>area([t])>1e-10);});}
 for(const s of data.surfaces.filter(s=>s.id.startsWith('floor/l1/'))){const oldArea=s.area,triangles=cutTriangles(s.triangles);if(Math.abs(area(triangles)-oldArea)<1e-8)continue;s.triangles=triangles;if(s.undersideTriangles)s.undersideTriangles=cutTriangles(s.undersideTriangles);s.area=area(triangles);s.fuelAmount=r(s.fuelAmount*s.area/oldArea);s.bounds=triangles.length?bounds([...triangles.flat(),...(s.undersideTriangles||[]).flat()]):s.bounds;cuts.push({id:s.id,beforeArea:oldArea,afterArea:s.area});}
 const empty=new Set(data.surfaces.filter(s=>s.id.startsWith('floor/l1/')&&!s.triangles.length).map(s=>s.id));data.surfaces=data.surfaces.filter(s=>!empty.has(s.id));for(const id of empty)removed.add(id);
 const upper=data.levels.find(l=>l.index===1);upper.floorTriangles=cutTriangles(upper.floorTriangles);
 for(const g of data.render.geometry){const m=data.sourceMeshes.find(m=>m.id===g.id);if(m.level!==1||!/^Room floor/.test(m.name))continue;const ts=g.triangles.flatMap(t=>cutTriangles([t.vertices]).map(vertices=>({...t,vertices})));if(ts.length){g.triangles=ts;m.bounds=bounds(ts.flatMap(t=>t.vertices.map(v=>v.slice(0,3))));}}
 // Fill the retired upper opening with actual native slab solids, restoring a full supported top landing.
 const oak=data.render.materials.find(m=>m.name==='Oak boards');if(!oak)throw Error('Missing native oak paint');
 const floorStock=meshMap.get(before.surfaces.find(s=>s.id==='porch/724').sourceMeshBindings[0]),fb=floorStock.bounds;
 function slab(id,x0,x1,z0,z1,hosts,y=2.6,level=1,supportType='stair-landing'){
  const keep=clone(fb);keep.max[0]=keep.min[0]+x1-x0;keep.max[2]=keep.min[2]+z1-z0;
  const result=nativeCut(floorStock.id,id,keep,matrix(x0-keep.min[0],y-keep.max[1],z0-keep.min[2]),{kind:'floor',level,supportType,fuelAmount:(x1-x0)*(z1-z0),hosts});result.circulationFloor=level===1;if(level===1)upper.floorTriangles.push(...result.triangles);return result;
 }
 const topAt=y=>data.surfaces.filter(s=>treads.includes(s.id)&&Math.abs(s.bounds.max[1]-y)<1e-5).map(s=>s.id),midSupports=[...topAt(1.54),...topAt(1.7166667)];
 const frontLedger=beamPiece('circulation150/mid/front-ledger',1.71,[5.525,1.36,3.75],{hosts:midSupports}),rearPosts=[4.73,6.32].map((x,i)=>beamPiece('circulation150/mid/support-post-'+i,.82,[x,.89,5.29],{vertical:true,hosts:[]})),rearLedger=beamPiece('circulation150/mid/rear-ledger',1.71,[5.525,1.36,5.29],{hosts:rearPosts.map(s=>s.id)});
 const midPad=slab('circulation150/mid/landing',4.67,6.38,3.75,5.38,[frontLedger.id,rearLedger.id],1.54,0);
 const backHeader=data.surfaces.filter(s=>s.kind==='wall'&&s.bounds.min[0]>=4.99&&s.bounds.max[0]<=6.01&&s.bounds.min[2]>6.9&&s.bounds.max[2]<7.1&&Math.abs(s.bounds.max[1]-2.48)<1e-5).map(s=>s.id);
 const landing=[];for(const [x0,x1]of [[4.875,5.875],[5.875,6.125]])for(const [z0,z1]of [[5.38,6.38],[6.38,7]])landing.push(slab('circulation150/restored-floor/'+x0+'/'+z0,x0,x1,z0,z1,backHeader));
 upper.floorTriangles.push(...header.triangles,...parlorHeader.triangles);
 const postStock=before.sourceMeshes.find(m=>m.name==='Stair newel'&&m.id.endsWith('/17/stair-newel')),postRows=[],railRows=[];
 function newel(id,x,y,z,level=0){const keep=clone(postStock.bounds),centre=keep.min.map((v,i)=>(v+keep.max[i])/2),result=nativeCut(postStock.id,id,keep,matrix(x-centre[0],y-keep.min[1],z-centre[2]),{level,hosts:[]});postRows.push(result);return result;}
 const lowLeft=[],lowRight=[],upFront=[],upBack=[];
 for(let j=0;j<3;j++)lowLeft.push(newel('circulation150/stair/post/lower/left/'+j,4.7175,r(.48+j*.53),r(1.5+j*1.125)));
 lowRight.push(newel('circulation150/stair/post/lower/right/0',6.2825,.48,1.5),newel('circulation150/stair/post/lower/right/1',6.2825,1.01,2.625));
 const corner=newel('circulation150/stair/post/shared-turn',6.2825,1.54,3.4675);lowRight.push(corner);upFront.push(corner);
 for(let j=1;j<3;j++)upFront.push(newel('circulation150/stair/post/upper/front/'+j,r(6.25+j*1.125),r(1.54+j*.53),3.4675,j===2?1:0));
 for(let j=0;j<3;j++)upBack.push(newel('circulation150/stair/post/upper/back/'+j,r(6.25+j*1.125),r(1.54+j*.53),5.0325,j===2?1:0));
 const railBetween=(id,a,b)=>{const centre=p=>[(p.bounds.min[0]+p.bounds.max[0])/2,p.bounds.min[1]+.772,(p.bounds.min[2]+p.bounds.max[2])/2];const q=nativeRail(id,centre(a),centre(b));railRows.push(q);};
 railBetween('circulation150/stair/rail/lower-left',lowLeft[0],lowLeft[2]);railBetween('circulation150/stair/rail/lower-right-a',lowRight[0],lowRight[1]);railBetween('circulation150/stair/rail/lower-right-b',lowRight[1],lowRight[2]);
 railBetween('circulation150/stair/rail/upper-front',upFront[0],upFront[2]);railBetween('circulation150/stair/rail/upper-back',upBack[0],upBack[2]);
 const rearGuards=[4.7175,5.5325,6.3475].map((x,i)=>newel('circulation150/mid/rear-guard-post-'+i,x,1.54,5.3475));railBetween('circulation150/mid/rear-guard-rail',rearGuards[0],rearGuards[2]);
 const newBearers=[];
 function bearing(id,original,mt,hosts){const ss=before.surfaces.find(s=>s.id===original.id),q=nativeCut(original.id,id,clone(original.bounds),mt,{kind:'floor',supportType:'stair-bearing',fuelAmount:ss.fuelAmount,hosts});newBearers.push(q);return q;}
 for(const [side,x]of [['left',4.7175],['right',6.2825]]){const original=before.sourceMeshes.find(m=>m.id==='access125/bearing-'+side+'-z5'),targetMin=side==='left'?x-.0425:x-.1725;const hosts=data.surfaces.filter(s=>lowerTreads.includes(s.id)&&s.bounds.min[2]<2.6575&&s.bounds.max[2]>2.5925&&s.bounds.max[1]>=.89&&s.bounds.min[1]<1.01).map(s=>s.id);bearing('circulation150/bearing/lower/'+side,original,matrix(targetMin-original.bounds.min[0],1.01-original.bounds.max[1],2.625-(original.bounds.min[2]+original.bounds.max[2])/2),hosts);}
 for(const [side,z]of [['front',3.4675],['back',5.0325]]){const original=before.sourceMeshes.find(m=>m.id==='access125/bearing-left-z5'),centre=original.bounds.min.map((v,i)=>(v+original.bounds.max[i])/2),targetZ=side==='front'?z+.065:z-.065,mt=matrix(7.375,2.01,targetZ).multiply(new Matrix4().makeRotationY(Math.PI/2)).multiply(matrix(...centre.map(v=>-v))),hosts=data.surfaces.filter(s=>upperTreads.includes(s.id)&&s.bounds.min[0]<7.4075&&s.bounds.max[0]>7.3425&&s.bounds.max[1]>=1.95&&s.bounds.min[1]<2.07).map(s=>s.id);bearing('circulation150/bearing/upper/'+side,original,mt,hosts);}
 const original=before.sourceMeshes.find(m=>m.id==='access125/bearing-left-z5');bearing('circulation150/bearing/shared-turn',original,matrix(6.2075-original.bounds.min[0],1.54-original.bounds.max[1],3.435-original.bounds.min[2]),lowerTreads.filter(id=>/345/.test(id)));
 const current=meshes();
 function actualFloorHosts(box,y){return data.surfaces.filter(s=>s.kind==='floor'&&Math.abs(s.bounds.max[1]-y)<1e-5&&[0,2].every(k=>Math.min(s.bounds.max[k],box.max[k])-Math.max(s.bounds.min[k],box.min[k])>1e-8)).map(s=>s.id);}
 for(const surface of [...postRows,...parlorPosts,...rearPosts])bind(surface,actualFloorHosts(surface.bounds,surface.bounds.min[1]),'Native closed foot on actual exported floor/bearer');
 for(const rail of railRows){const hosts=postRows.filter(p=>[0,1,2].every(k=>Math.min(p.bounds.max[k],rail.bounds.max[k])-Math.max(p.bounds.min[k],rail.bounds.min[k])>=-1e-4)).map(p=>p.id);bind(rail,hosts,'Native-section rail touching actual native posts');}
 // Rebind the shortened porch rail to its real turned columns and retained balusters.
 for(const s of data.surfaces.filter(s=>s.sourceMeshBindings?.some(id=>current.get(id)?.name==='Porch handrail'))){const hosts=data.surfaces.filter(p=>p.sourceMeshBindings?.some(id=>current.get(id)?.name==='Turned porch post')&&[0,1,2].every(k=>Math.min(p.bounds.max[k],s.bounds.max[k])-Math.max(p.bounds.min[k],s.bounds.min[k])>0)).map(p=>p.id);bind(s,hosts,'Shortened native porch rail bears on unchanged turned column');}
 const porchRails=data.surfaces.filter(s=>s.sourceMeshBindings?.some(id=>current.get(id)?.name==='Porch handrail'));
 for(let i=0;i<data.surfaces.length;i++){
  const s=data.surfaces[i];if(!s.sourceMeshBindings?.some(id=>current.get(id)?.name==='Porch baluster'))continue;
  const original=before.surfaces.find(p=>p.id===s.id);if(!original)continue;const restored=clone(original),remap=id=>porchRails.find(p=>'attachment/'+p.id===id)?.id||id;
  for(const key of ['supportSurfaceIds','attachmentHostSurfaceIds'])if(restored[key])restored[key]=restored[key].map(remap);
  if(restored.supportBinding)for(const key of ['hostSurfaceIds','bearingSurfaceIds'])if(restored.supportBinding[key])restored.supportBinding[key]=restored.supportBinding[key].map(remap);
  data.surfaces[i]=restored;
 }
 function moveItem(id,target,room){
  const item=data.items.find(i=>i.id===id),offset=target.map((v,k)=>v-item.position[k]),mt=matrix(...offset),partIds=new Set(item.partIds),parts=data.furnitureParts.filter(p=>partIds.has(p.id)),ids=new Set(parts.map(p=>p.sourceMeshBinding).filter(Boolean));
  data.items[data.items.indexOf(item)]=placed(item,mt);data.items.find(i=>i.id===id).roomId=room;data.furnitureParts=data.furnitureParts.map(p=>partIds.has(p.id)?placed(p,mt):p);
  for(const meshId of ids)moveMesh(meshId,offset);itemMoves.push({id,from:item.position,to:target,room,nativePaintAndRig:true});
 }
 moveItem('item/l0/hall/console',[9.6,.48,3],'living');moveItem('item/l1/hall/console',[9.6,2.6,1.5],'bed-a');moveItem('item/l0/parlor/settee',[2.85,.48,.6],'parlor');moveItem('item/l0/parlor/rug',[2.85,.48,.6],'parlor');
 data.openings=data.openings.filter(o=>!removed.has(o.surfaceId)&&!o.sourceMeshBindings?.some(id=>removed.has(id)));
 const available=new Set(data.surfaces.map(s=>s.id));
 for(const s of data.surfaces){for(const key of ['supportSurfaceIds','attachmentHostSurfaceIds'])if(s[key])s[key]=s[key].filter(id=>available.has(id));if(s.supportBinding)for(const key of ['hostSurfaceIds','bearingSurfaceIds'])if(s.supportBinding[key])s.supportBinding[key]=s.supportBinding[key].filter(id=>available.has(id));}
 function floorHosts(contact,level){const bb=contact.bounds||contact.contactBounds||contact;return data.surfaces.filter(s=>s.kind==='floor'&&s.level===level&&Math.abs(s.bounds.max[1]-(level?2.6:.48))<1e-5&&bb.min&&bb.max&&[0,2].every(k=>Math.min(s.bounds.max[k],bb.max[k])-Math.max(s.bounds.min[k],bb.min[k])>1e-9)).map(s=>s.id);}
 for(const id of itemMoves.map(m=>m.id)){const i=data.items.find(i=>i.id===id);for(const c of i.supportContacts||[])c.supportSurfaceIds=floorHosts(c,i.level);i.supportSurfaceIds=[...new Set((i.supportContacts||[]).flatMap(c=>c.supportSurfaceIds))];for(const p of data.furnitureParts.filter(p=>p.itemId===id)){p.supportSurfaceIds=[...i.supportSurfaceIds];for(const c of p.supportContacts||[])c.supportSurfaceIds=floorHosts(c,i.level);}}
 data.navigation.prototypeRoute=[[5,0,-3.8],[5,.16,-3.1],[5,.32,-2.66],[5,.48,-2.22],[5,.48,-1],[5,.48,.125],[5.5,.48,1.45],...Array.from({length:6},(_,i)=>[5.5,r(.48+(i+1)*2.12/12),r(1.5+(i+.5)*going)]),[5.5,1.54,4.25],[6.2,1.54,4.25],...Array.from({length:6},(_,i)=>[r(6.25+(i+.5)*going),r(1.54+(i+1)*2.12/12),4.25]),[9.1225,2.6,4.25]];
 data.navigation.circulationRoutes={kitchen:[[5,.48,-1],[5,.48,.5],[4.75,.48,1.25],[3,.48,2],[3,.48,3.5],[3.87125,.48,4.5],[3.87125,.48,5.75]],outsideFront:[5,0,-3.8],insideFront:[5,.48,.125],stairFoot:[5.5,.48,1.45],midLanding:[5.5,1.54,4.25],upperLanding:[9.1225,2.6,4.25]};
 data.navigation.stair={x:4.75,z:1.5,width:1.5,run:2.25,rise:1.06,type:'Two six-rise native-composed flights with real quarter-turn landing',flights:2,midY:1.54,topLanding:{min:[8.3725,2.6,3.5],max:[9.8725,2.6,5]}};
 changeLog.removed=[...removed];changeLog.front={nominalWidth:2,openLeafClear:1.88,headroom:2,openingIds:[FRONT_LEFT,FRONT_RIGHT],hinges:[left.pivot,right.pivot],nativeLeaves:[1,1.65,.12],threshold:'Existing continuous porch/724 and native hall slab atY0.48'};
 changeLog.stair={clearWidth:1.5,apertures:holeRects,nativeTreadPlacement:'Same twelve rises;0.25m treads plus0.125m end-cut native going pieces',originalTreads:treadSurfaces.map(s=>s.id),allTreadIds:treads,midLandingIds:[midPad.id],restoredFloorIds:landing.map(s=>s.id),lowerY:.48,midY:1.54,upperY:2.6,rise:2.12,totalRun:4.5,rises:12,going:.375,flights:[{id:'interior-stair/lower',axis:'z',treadSourceIds:lowerTreads,lowerY:.48,upperY:1.54},{id:'interior-stair/upper',axis:'x',treadSourceIds:upperTreads,lowerY:1.54,upperY:2.6}],midClear:{min:[4.75,1.54,3.7825],max:[6.25,1.54,5.315]},topLanding:{min:[8.3725,2.6,3.5],max:[9.8725,2.6,5]}};
 changeLog.quantities={surfaceFuelBefore:totalFuel(before),surfaceFuelAfter:totalFuel(data),surfaceFuelDelta:totalFuel(data)-totalFuel(before),upperFloorBefore:floorArea(before),upperFloorAfter:floorArea(data),addedStepStoneVolume:approach.reduce((n,m)=>n+volume(m.bounds),0),addedMainTreadFuel:3.75,restoredLandingArea:2.025,midLandingArea:2.7873,coefficientPolicy:'Existing source finite quantities; added quarter treads use one quarter of source tread amount. Duplicated stone approach stays inert. Cut stock preserves source quantity per volume.'};
 data.navigation.gameAccessVariant=changeLog;data.navigation.status='Versioned1.50m circulation source; focused and real-input acceptance pending';data.navigation.routeLimitations=['Full posed/equipment and actual input acceptance remain coder/architect checks.','Entry porch beam retains native1.87m overhead clearance; the front portal remains2.00m.'];
 data.componentRegistration.accessVariant={id:CIRCULATION_ID,control:changeLog.control,apertures:changeLog.stair.apertures};data.componentRegistration.accessAdaptation={entryCentre:[5,.48,0],clearWidth:1.88,paired:true};data.componentRegistration.recomposedSourceIds=moved.map(m=>m.id);data.componentRegistration.addedSourceIds=added.map(s=>s.id);data.componentRegistration.omittedSourceIds=[...removed];
 data.adaptations.push(CIRCULATION_ID+': paired native front leaves, true widened approach/treads, two native-composed six-rise flights with a real turn landing and restored native upper landing; geometry, support and finite source fuel change together.');return changeLog;
}
