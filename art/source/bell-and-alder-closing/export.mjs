import fs from 'node:fs';
import path from 'node:path';
import {createHash} from 'node:crypto';
import * as T from '../../../src/runtime/three.js';
import {createClosingAssembly} from './assembly.js';
import {bounds,normal,triangleArea,polygonTriangles,clip,round,boundsVolume} from '../furnished-house/geometry.js';
const OUT='workbenches/bell-and-alder-closing/scene-data.json';
const layout=JSON.parse(fs.readFileSync('art/source/bell-and-alder-closing/layout.json'));
const model=createClosingAssembly(T,{layout});
const surfaces=[],sourceMeshes=[],geometry=[],furnitureParts=[],items=[],raw=new Map(),materials=[...model.materials.values()].map(m=>({...m.userData.export,physicalUV:true}));
const r3=p=>p.map(round),area=ts=>ts.reduce((n,t)=>n+triangleArea(t),0),xyz=ts=>ts.map(t=>t.vertices.map(v=>v.slice(0,3)));
function capture(o){
 const g=o.geometry,p=g.attributes.position,n=g.attributes.normal,u=g.attributes.uv,v=g.attributes.grossUV||u,c=g.attributes.color,ix=g.index?.array||Array.from({length:p.count},(_,i)=>i),nm=new T.Matrix3().getNormalMatrix(o.matrixWorld),ts=[];
 for(let i=0;i<ix.length;i+=3){const vertices=[0,1,2].map(k=>{const j=ix[i+k],q=new T.Vector3().fromBufferAttribute(p,j).applyMatrix4(o.matrixWorld),nn=new T.Vector3().fromBufferAttribute(n,j).applyMatrix3(nm).normalize();const metric=o.material.userData.export.texture&&!o.material.name.startsWith('Nautilus'),physical=metric?(Math.abs(nn.y)>.55?[q.x,q.z]:Math.abs(nn.x)>.55?[q.z,q.y]:[q.x,q.y]):[v?.getX(j)||0,v?.getY(j)||0];return [...q.toArray(),...nn.toArray(),u?.getX(j)||0,u?.getY(j)||0,...physical,c?.getX(j)??1,c?.getY(j)??1,c?.getZ(j)??1].map(round);});if(triangleArea(vertices.map(v=>v.slice(0,3)))>1e-9)ts.push({materialId:o.material.name,vertices});}
 return ts;
}
function supportFor(b,level){return surfaces.filter(s=>s.kind==='floor'&&s.level===level&&s.bounds.max[0]>b.min[0]+1e-7&&s.bounds.min[0]<b.max[0]-1e-7&&s.bounds.max[2]>b.min[2]+1e-7&&s.bounds.min[2]<b.max[2]-1e-7).map(s=>s.id);}
function surface(spec){
 spec.triangles=spec.triangles.map(t=>t.map(r3));spec.area=round(area(spec.triangles));if(spec.area<1e-8)throw Error('Empty physical surface '+spec.id);
 spec.normal=r3(spec.normal||normal(spec.triangles[0]));spec.bounds=bounds(spec.triangles.flat());spec.supportSurfaceIds??=[];spec.sourceMeshBindings??=[];spec.fuelClass??=null;spec.fuelAmount??=0;spec.finish??=null;surfaces.push(spec);return spec;
}
try{
 for(const o of model.objects){const m=o.userData.export,ts=capture(o);raw.set(m.id,ts);if(!m.physicalOnly){sourceMeshes.push({id:m.id,name:o.name,level:m.level,matrix:o.matrixWorld.toArray().map(round),bounds:bounds(xyz(ts).flat()),materialIds:[o.material.name],sourceRole:m.kind,sourceAssetId:m.sourceAssetId||null});if(m.kind!=='floor'||m.supportType)geometry.push({id:m.id,triangles:ts});}
  if(m.appearanceOnly||m.kind==='item-part')continue;
  surface({...m,triangles:m.triangles||xyz(ts),sourceMeshBindings:m.physicalOnly?(model.openings.find(q=>q.surfaceId===m.id)?.sourceMeshBindings||[]):[m.id],exterior:m.kind==='wall'&&!m.id.includes('partition'),fuelAmount:round(m.fuelAmount||0)});
 }
 // Mounted source fittings become exact structural attachments, never gravity-free furniture.
 const mounted=new Set(model.items.filter(i=>/cornice|hanging-sign|pendant|entry-lantern/.test(i.assetId)).map(i=>i.id));
 for(const o of model.objects.filter(o=>o.userData.export.kind==='item-part')){
  const m=o.userData.export,ts=raw.get(m.id),b=bounds(xyz(ts).flat());
  if(mounted.has(m.itemId)){
   surface({...m,kind:'attachment',triangles:xyz(ts),normal:normal(xyz(ts)[0]),thickness:0,sourceMeshBindings:[m.id],fuelClass:m.material==='timber'?'frame':m.material==='cloth'?'cloth':null,fuelAmount:m.material==='timber'?round(boundsVolume(b)/.12):m.material==='cloth'?.025:0,attachmentType:'Installed Nautilus mounted '+m.sourceAssetId});
  }else furnitureParts.push({id:m.id,itemId:m.itemId,level:m.level,sourceMeshBinding:m.id,matrix:o.matrixWorld.toArray().map(round),bounds:b,material:m.material,fuelClass:m.fuelClass,fuelAmount:0,finish:null,supportSurfaceIds:supportFor(b,m.level),volume:boundsVolume(b)});
 }
 for(const item of model.items.filter(i=>!mounted.has(i.id))){
  const parts=furnitureParts.filter(p=>p.itemId===item.id);if(!parts.length)continue;
  for(const cls of ['timber','cloth']){const subset=parts.filter(p=>p.material===cls),total=subset.reduce((n,p)=>n+p.volume,0);for(const p of subset){p.fuelAmount=round((cls==='timber'?1:item.assetId.includes('bedstead')?.6:.3)*p.volume/total);if(cls==='timber')p.finish={fuelClass:'lacquer',amount:round(.10*p.volume/total),appearance:'Finite prototype coating on the installed painted timber; not calibrated mass'};}}
  const b=bounds(parts.flatMap(p=>[p.bounds.min,p.bounds.max])),record={id:item.id,type:item.assetId,assetId:item.assetId,level:item.level,position:item.position,quaternion:item.quaternion,bounds:b,partIds:parts.map(p=>p.id),sourceMeshBindings:parts.map(p=>p.sourceMeshBinding),supportSurfaceIds:[...new Set(parts.flatMap(p=>p.supportSurfaceIds))],supportContacts:[]};
  const floorY=item.level*2.12;
  for(const part of parts.filter(p=>p.bounds.min[1]<=floorY+.035))for(const [faceIndex,t]of xyz(raw.get(part.id)).entries()){
   if(normal(t)[1]>-.9||Math.max(...t.map(v=>v[1]))>floorY+.035)continue;
   for(const sid of part.supportSurfaceIds){const s=surfaces.find(s=>s.id===sid);for(const tri of s.triangles){let q=t.map(p=>[p[0],floorY,p[2]]);const sign=Math.sign((tri[1][0]-tri[0][0])*(tri[2][2]-tri[0][2])-(tri[1][2]-tri[0][2])*(tri[2][0]-tri[0][0]))||1;for(let i=0;i<3;i++){const a=tri[i],b=tri[(i+1)%3];q=clip(q,v=>sign*((b[0]-a[0])*(v[2]-a[2])-(b[2]-a[2])*(v[0]-a[0])));}if(q.length>=3&&area(polygonTriangles(q))>1e-9)record.supportContacts.push({id:item.id+'/contact/'+record.supportContacts.length,sourcePartId:part.id,sourceBottomFace:faceIndex,polygon:q.map(r3),measuredBottomY:round(t[0][1]),contactY:floorY,gap:round(t[0][1]-floorY),supportSurfaceIds:[sid],measurement:'Actual downward native source facet clipped to actual support'});}}
  }
  record.supportConvention='Native source facets at the declared floor; item pivot is not a contact';items.push(record);
 }
 for(const s of surfaces){
  if(s.kind==='floor'){if(s.supportType==='stair-tread')s.supportSurfaceIds=['stair/base/9,7','stair/base/10,7','landing/9,3','landing/10,3'];continue;}
  s.supportSurfaceIds=supportFor(s.bounds,s.level);
  if(s.kind==='attachment'){
   const hosts=surfaces.filter(h=>h.id!==s.id&&['floor','wall','roof'].includes(h.kind)&&h.level===s.level&&[0,1,2].every(i=>h.bounds.min[i]<=s.bounds.max[i]+.18&&h.bounds.max[i]>=s.bounds.min[i]-.18)).map(h=>h.id);
   s.attachmentHostSurfaceIds=hosts;s.connectionTolerance=.18;s.supportBinding={kind:'Native source joinery',hostSurfaceIds:hosts,bearingSurfaceIds:s.supportSurfaceIds,inferred:true,tolerance:.18};
  }
 }
 const openings=model.openings.map(o=>{const s=surfaces.find(s=>s.id===o.surfaceId);if(!s)throw Error('No canonical opening surface '+o.id);s.sourceMeshBindings=[...o.sourceMeshBindings];return {...o,bounds:s.bounds,normal:s.normal,axis:[0,1,0],closedTransform:new T.Matrix4().makeTranslation(...o.pivot).toArray(),span:s.bounds.max[0]-s.bounds.min[0]||s.bounds.max[2]-s.bounds.min[2],bottomY:s.bounds.min[1],topY:s.bounds.max[1]};});
 const doorIds=prefix=>openings.filter(o=>o.kind==='door'&&o.id.startsWith(prefix)).map(o=>o.id);
 const levels=[0,1].map(index=>{const fs=surfaces.filter(s=>s.kind==='floor'&&!s.supportType&&s.level===index);return {id:'level-'+index,index,label:index?'New lodging':'Published shop',floorY:index*2.12,wallTop:index*2.12+2,floorTriangles:fs.flatMap(s=>s.triangles),area:fs.reduce((n,s)=>n+s.area,0),stairVoid:null,rooms:[{id:index?'lodging':'shop',type:index?'lodging':'shop',polygon:[[0,0],[8,0],[8,8],[0,8]]}]};});
 const sourcePaths=['src/content/bell-and-alder-layout.js','src/art/bell-and-alder.js','src/art/nautilus-windows.js','vendor/nautilus-engine/2fa0befbfbdc6b0e44f5a14a6f785f44e7a95d74/provenance.json','art/source/bell-and-alder-closing/layout.json','art/source/bell-and-alder-closing/assembly.js','art/source/bell-and-alder-closing/thermal-art.js','art/source/bell-and-alder-closing/vent-smoke.js','workbenches/bell-and-alder-closing/art.js',...new Set(materials.filter(m=>m.texture).map(m=>path.relative('.',path.resolve('workbenches/bell-and-alder-closing',m.texture)).replaceAll('\\','/')))];
 const sourceHashes=sourcePaths.map(p=>{const b=fs.readFileSync(p);return {path:p,commit:p.startsWith('art/source/')||p==='workbenches/bell-and-alder-closing/art.js'?null:layout.baseCommit,sha256:createHash('sha256').update(b).digest('hex'),bytes:b.length,authored:p.startsWith('art/source/')||p==='workbenches/bell-and-alder-closing/art.js'};});
 const closingTime={version:1,origin:layout.origin,bounds:{min:[-4,-.24,-2],max:[13,4.6,18]},anchors:layout.anchors,actors:layout.actors,replays:layout.replays,doors:[{id:layout.shop.entry.id,openingIds:doorIds('entry-'),anchor:'entryReach'},{id:layout.lodging.serviceDoor.id,openingIds:doorIds('service-'),anchor:'serviceReach'}],lantern:{...layout.lantern,supportSourceId:layout.lantern.supportItemId},smokeVents:layout.smokeVents.map(v=>({...v,openingIds:doorIds('entry-').filter(id=>id.endsWith('/glass'))})),lamps:model.lights.map(l=>({...l,sourceSurfaceIds:surfaces.filter(s=>s.itemId===l.itemId).map(s=>s.id)})),soundPalette:layout.soundPalette,limitations:['Fictional new lodging/stair and shallow opposite frontage; original shop remains single storey in its source.','Ambient deterministic wind 1.5 m/s east, no obstacle-resolved shop bake.','Finite quantities are inherited prototype fuel units, not real-world mass.','Static oil lamps retain their installed lighting; oil consumption is outside this scene.','Native 1.65m door leaves have separate fixed transom glazing. Measured combined traversal remains required.']};
 const data={version:1,prefabId:'bell-and-alder-closing-v1',buildingId:'bell-and-alder-closing',units:'metres',sourceCommit:layout.baseCommit,contractCommit:layout.briefCommit,sourceHashes,module:[1,1,2.12],thermalCell:[.5,1.06,.5],gridOrigin:[0,0,0],groundY:-.12,levels,surfaces,openings,furnitureParts,items,stores:[],parameters:{amountUnit:'prototype-fuel-unit',wallFuelPerSquareMetre:1,floorFuelPerSquareMetre:1,roofFuelPerSquareMetre:1,furnitureCorePerItem:1,bedClothPerItem:.6,otherClothPerItem:.3,finishPerTimberItem:.10},sourceMeshes,render:{materials,geometry,omittedSourceMeshes:sourceMeshes.filter(s=>!geometry.some(g=>g.id===s.id)).map(s=>({id:s.id,reason:'Closed floor solids are generated once from canonical support'})),appearanceLayerBindings:[],vertexLayout:['x','y','z','nx','ny','nz','u','v','physicalU','physicalV','r','g','b']},navigation:{status:'Measured authored source; continuous combined actor checks required',nativeDoorHeight:1.65,nativeDoorWidth:1,doorAssemblyWidth:2,levelIndexBase:0,stair:layout.stair,noCharacterRescaling:true,prototypeRoute:layout.actors.find(a=>a.role==='resident').routine.map(r=>layout.anchors[r.anchor].position),physicalMeaning:{movement:'Actual closed slabs, walls, mounted fittings and item parts',sight:'Opaque masonry/timber, transparent glazing',projectileCover:'Intact wood/masonry/glass; live geometry query',fuel:'Finite surfaces and item core/finish, portable lantern excluded from static fuel'}},closingTime,adaptations:['One source translation [-36,0,-9] applied once.','New native-grid upper level, flat roof and exterior service stair; source lower fittings are unchanged.','Native leaf dimensions and painted finish retained; separate fixed transom glazing.','One canonical opening per actual glazing identity; no duplicate invisible thermal lantern.'],sourceGaps:['Combined traversal/perception/replay acceptance pending','Shallow opposite frontage has no interior or hidden timber mass']};
 fs.mkdirSync(path.dirname(OUT),{recursive:true});fs.writeFileSync(OUT,JSON.stringify(data)+'\n');
 const summary={prefabId:data.prefabId,levels:levels.map(l=>({index:l.index,floorY:l.floorY,wallTop:l.wallTop,area:l.area})),surfaces:surfaces.length,kinds:surfaces.reduce((n,s)=>(n[s.kind]=(n[s.kind]||0)+1,n),{}),items:items.length,parts:furnitureParts.length,openings:openings.length,sourceMeshes:sourceMeshes.length,renderTriangles:geometry.reduce((n,g)=>n+g.triangles.length,0),finiteFuel:round(surfaces.reduce((n,s)=>n+s.fuelAmount,0)+furnitureParts.reduce((n,p)=>n+p.fuelAmount+(p.finish?.amount||0),0)),bytes:fs.statSync(OUT).size,sha256:createHash('sha256').update(fs.readFileSync(OUT)).digest('hex')};
 fs.writeFileSync('art/source/bell-and-alder-closing/export-summary.json',JSON.stringify(summary,null,2)+'\n');console.log(JSON.stringify(summary));
}finally{model.dispose();}
