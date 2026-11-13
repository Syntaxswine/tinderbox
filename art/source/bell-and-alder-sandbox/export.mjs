import fs from 'node:fs';
import {createHash} from 'node:crypto';
import * as T from '../../../src/runtime/three.js';
import {bounds,normal,triangleArea,round} from '../furnished-house/geometry.js';

// Reuses native painted cargo skin and post/two-rail proportions. New placement,
// paving and physical records; no new bitmap, donor write or coarse fuel volume.
const atlas='../../vendor/farmyard-commando/30a3b8cae5f36bb0c1df3685b7fba16f701c2083/sites/tactical-animal/dist/aft/assets/environment/painted-study/cargo-materials-v1.png';
const concrete='../../vendor/farmyard-commando/30a3b8cae5f36bb0c1df3685b7fba16f701c2083/sites/tactical-animal/dist/aft/assets/environment/ground-concrete.png';
const surfaces=[],sourceMeshes=[],geometry=[],items=[],furnitureParts=[];
const materials=[{id:'paved-stone',name:'Paved service stone',color:0x82745e,texture:concrete,roughness:.98,metalness:0,repeat:1},{id:'cargo-wood',name:'Native painted cargo timber',color:0xd0b58c,texture:atlas,roughness:.94,metalness:0,repeat:1}];
const round3=p=>p.map(round),top=(x,z,w,d,y)=>[[[x,y,z],[x,y,z+d],[x+w,y,z+d]],[[x,y,z],[x+w,y,z+d],[x+w,y,z]]];
function box(id,position,size,materialId,role,uvMode='metric'){
 const g=new T.BoxGeometry(...size),p=g.attributes.position,n=g.attributes.normal,u=g.attributes.uv,ix=g.index.array,ts=[];
 for(let i=0;i<ix.length;i+=3){const vertices=[0,1,2].map(k=>{const j=ix[i+k],nn=[n.getX(j),n.getY(j),n.getZ(j)],q=[p.getX(j)+position[0],p.getY(j)+position[1],p.getZ(j)+position[2]];
  const uv=uvMode==='cargo'?[((Math.abs(nn[0])>.5?p.getZ(j)+size[2]/2:p.getX(j)+size[0]/2)*(1/3-6/1536)+3/1536),(.5+3/1024+(Math.abs(nn[1])>.5?p.getZ(j)+size[2]/2:p.getY(j)+size[1]/2)*(.5-6/1024))]:[Math.abs(nn[1])>.5?q[0]:Math.abs(nn[0])>.5?q[2]:q[0],Math.abs(nn[1])>.5?q[2]:q[1]];
  return round3([...q,...nn,...uv,...uv,1,1,1]);});ts.push({materialId,vertices});}
 const triangles=ts.map(t=>t.vertices.map(v=>v.slice(0,3))),b=bounds(triangles.flat());
 sourceMeshes.push({id,name:id,level:0,matrix:new T.Matrix4().makeTranslation(...position).toArray(),bounds:b,materialIds:[materialId],sourceRole:role});geometry.push({id,triangles:ts});g.dispose();return {id,triangles,bounds:b};
}
function surface(id,kind,material,triangles,thickness,extra={}){
 const area=triangles.reduce((n,t)=>n+triangleArea(t),0);const s={id,kind,level:0,material,triangles,normal:round3(normal(triangles[0])),thickness,bounds:bounds(triangles.flat()),area:round(area),sourceMeshBindings:[id],supportSurfaceIds:[],fuelClass:null,fuelAmount:0,finish:null,...extra};surfaces.push(s);return s;
}
for(const [x0,x1,z0,z1]of [[-5,-4,-2,8],[-17,-4,8,16]])for(let x=x0;x<x1;x++)for(let z=z0;z<z1;z++){
 const id='paving/'+x+','+z;box(id,[x+.5,-.06,z+.5],[1,.12,1],'paved-stone','ground');surface(id,'ground','stone',top(x,z,1,1,0),.12);
}
const panelHosts=[];
for(const [i,x]of [-4.94,-4.06].entries()){
 const id='fence/post-'+i,b=box(id,[x,.5,-1],[.12,1,.12],'cargo-wood','attachment','cargo');panelHosts.push(id);
 surface(id,'attachment','timber',b.triangles,0,{physicalShape:'source-closed-mesh',fuelClass:'frame',fuelAmount:.1152,supportSurfaceIds:['paving/-5,-2','paving/-5,-1'],attachmentHostSurfaceIds:['paving/-5,-2','paving/-5,-1'],connectionTolerance:.01});
}
for(const [i,y]of [.24,.76].entries()){
 const id='fence/rail-'+i,b=box(id,[-4.5,y,-1],[.88,.08,.06],'cargo-wood','attachment','cargo');
 surface(id,'attachment','timber',b.triangles,0,{physicalShape:'source-closed-mesh',fuelClass:'frame',fuelAmount:round(.88*.08*.06*8),supportSurfaceIds:panelHosts,attachmentHostSurfaceIds:panelHosts,connectionTolerance:.01});
}
const crate=box('crate/skin',[-4.5,.5,9.5],[1,1,1],'cargo-wood','item-part','cargo'),itemId='crate',partId='crate/timber';
const contacts=crate.triangles.flatMap((triangle,index)=>normal(triangle)[1]<-.99?[{id:'crate/contact/'+index,sourcePartId:partId,sourceBottomFace:index,polygon:triangle,measuredBottomY:0,contactY:0,gap:0,supportSurfaceIds:['paving/-5,9'],measurement:'Actual downward cube source triangle on its declared paving slab'}]:[]);
furnitureParts.push({id:partId,itemId,level:0,material:'timber',triangles:crate.triangles,bounds:crate.bounds,sourceMeshBinding:crate.id,sourceMeshBindings:[crate.id],fuelClass:'furniture',fuelAmount:1,finish:{fuelClass:'varnish',amount:.1,appearance:'Prototype finite wood finish, separate from core'},supportSurfaceIds:['paving/-5,9'],volume:1});
items.push({id:itemId,type:'painted-cargo-crate',level:0,position:[-4.5,.5,9.5],quaternion:[0,0,0,1],bounds:crate.bounds,partIds:[partId],sourceMeshBindings:[crate.id],supportSurfaceIds:['paving/-5,9'],supportContacts:contacts,supportConvention:'Native simple box skin; bottom face is the contact, centre pivot is not.'});
const sourcePaths=['art/source/bell-and-alder-sandbox/export.mjs','src/art/world.js','src/art/materials.js','vendor/farmyard-commando/30a3b8cae5f36bb0c1df3685b7fba16f701c2083/provenance/art.json',atlas.slice(6),concrete.slice(6)];
const sourceHashes=sourcePaths.map(p=>{const b=fs.readFileSync(p);return {path:p,sha256:createHash('sha256').update(b).digest('hex'),bytes:b.length,commit:p.startsWith('art/source/bell-and-alder-sandbox/')?null:'93239f1e202f05064c033038f6f343f79b905b8e'};});
const data={version:1,prefabId:'bell-and-alder-yard-v1',buildingId:'bell-and-alder-yard',units:'metres',module:[1,1,2.12],thermalCell:[.5,1.06,.5],gridOrigin:[0,0,0],groundY:-.12,levels:[{id:'yard-level-0',index:0,label:'Paved yard and street',floorY:0,wallTop:2,floorTriangles:surfaces.filter(s=>s.kind==='ground').flatMap(s=>s.triangles),area:114,rooms:[]}],surfaces,openings:[],furnitureParts,items,stores:[],sourceMeshes,render:{materials,geometry,omittedSourceMeshes:[],appearanceLayerBindings:[],vertexLayout:['x','y','z','nx','ny','nz','u','v','physicalU','physicalV','r','g','b']},sourceHashes,parameters:{amountUnit:'inherited prototype-fuel-unit, not kilograms'},adaptations:['New non-overlapping1m paving modules and one1m timber fence panel.','Existing cargo paint sampled with native inset atlas rectangle; no new bitmap.','One1m crate is12 triangles with detail carried by paint; finite timber/finish and measured support.'],navigation:{clearRoute:{min:[-4,0,-1],max:[-2,2,10]},physicalMeaning:{movement:'Actual paving, closed timber post/rail solids and crate',sight:'Opaque timber only where its solids exist',projectileCover:'Actual intact timber; open fence gaps remain open',fuel:'Only declared finite timber and finish; paving is noncombustible'}},sourceGaps:['This is a fictional yard arrangement, not a reconstruction.','Combined native traversal, shared fire and art review pending.']};
const out='workbenches/bell-and-alder-sandbox/yard-data.json';fs.mkdirSync('workbenches/bell-and-alder-sandbox',{recursive:true});fs.writeFileSync(out,JSON.stringify(data)+'\n');
const summary={surfaces:surfaces.length,pavingSlabs:surfaces.filter(s=>s.kind==='ground').length,items:items.length,parts:furnitureParts.length,renderTriangles:geometry.reduce((n,g)=>n+g.triangles.length,0),finiteFuel:round(surfaces.reduce((n,s)=>n+s.fuelAmount,0)+1.1),sha256:createHash('sha256').update(fs.readFileSync(out)).digest('hex')};fs.writeFileSync('art/source/bell-and-alder-sandbox/export-summary.json',JSON.stringify(summary,null,2)+'\n');console.log(JSON.stringify(summary));

// Sandbox-only navigation variant. Physical/render/source arrays are unchanged.
const houseSource='workbenches/furnished-house/house-data.json',houseBytes=fs.readFileSync(houseSource),house=JSON.parse(houseBytes),route=house.navigation.prototypeRoute;
house.navigation.prototypeRoute=[...route.slice(0,7),...route.slice(14)];
house.adaptations.push('Sandbox navigation-only variant: approach the existing stair through the clear hall, preserving the original dining-room detour as a source control. No physical/render array changed.');
house.sourceHashes.push({path:houseSource,commit:'93239f1e202f05064c033038f6f343f79b905b8e',sha256:createHash('sha256').update(houseBytes).digest('hex'),bytes:houseBytes.length});
fs.writeFileSync('workbenches/bell-and-alder-sandbox/house-route-data.json',JSON.stringify(house)+'\n');
