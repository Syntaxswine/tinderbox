import fs from 'node:fs';
import assert from 'node:assert/strict';
import {createHash} from 'node:crypto';
import * as T from '../../vendor/farmyard-commando/30a3b8cae5f36bb0c1df3685b7fba16f701c2083/sites/tactical-animal/dist/aft/tactics/vendor/three.module.js';
import {Resources} from '../../src/art/resources.js';
import {WINDOW_KIT,WINDOW_BAYS,compileWindowBay,addCenteredWindow,mergeCenteredWindowEdges,NAUTILUS_WINDOW_COMMIT} from '../../src/art/nautilus-windows.js';
import {createWindowBayModel} from '../../vendor/nautilus-engine/90054d07134116a5d9661f8318a76fe68f922aad/packages/window-kit/three.js';
import {createHopkinsHouse} from '../../src/art/hopkins-housing.js';
const read=p=>JSON.parse(fs.readFileSync(p,'utf8')),sha=b=>createHash('sha256').update(b).digest('hex'),base='art/source/nautilus-windows-v1/';
const imported=read(base+'import.json');for(const record of imported.files)assert.equal(sha(fs.readFileSync(record.installedPath)),record.sha256,record.originalPath+' changed');
assert.equal(NAUTILUS_WINDOW_COMMIT,imported.commit);assert.equal(WINDOW_KIT.span,2);assert.equal(WINDOW_KIT.segmentWidth,.5);assert.equal(WINDOW_KIT.openingWidth,1);
const textures=Object.fromEntries(['clapboard','cedar','oak','paper','brick','slate'].map(id=>[id,new T.Texture()]));
const borrowed=new T.MeshStandardMaterial({map:textures.clapboard,side:T.DoubleSide});let borrowedDisposals=0;borrowed.addEventListener('dispose',()=>borrowedDisposals++);
const palette={wall:borrowed,inside:borrowed,trim:borrowed,sash:borrowed,brass:borrowed,glass:borrowed};let sourceAttributeChecks=0,apertureRays=0;
for(const {id} of WINDOW_BAYS){
 const pool=new Resources(),parent=new T.Group(),adapted=addCenteredWindow(T,parent,pool,id,palette),raw=createWindowBayModel(T,id,{materials:palette}),sculpture=compileWindowBay(id);
 assert.deepEqual(sculpture.wall,{width:2,height:2,thickness:.16,segmentWidth:.5});assert.equal(sculpture.opening.width,1);
 for(const part of sculpture.parts.filter(p=>p.name.endsWith('wall segment')))assert.deepEqual(part.size,[.5,2,.16]);
 assert.equal(adapted.panes.length,id==='window-bay-period'?12:4);
 for(const [key,mesh] of adapted.parts){
  assert.deepEqual(mesh.scale.toArray(),[1,1,1]);const original=raw.parts.get(key);
  for(const attribute of ['position','normal','uv']){assert.deepEqual(mesh.geometry.attributes[attribute].array,original.geometry.attributes[attribute].array);sourceAttributeChecks++;}
  assert.deepEqual(mesh.geometry.attributes.grossUV.array,mesh.geometry.attributes.uv.array);
 }
 adapted.setView({sashes:false});
 for(const rotation of [0,Math.PI/4,Math.PI/2]){
  parent.rotation.y=rotation;parent.updateMatrixWorld(true);
  const test=(x,y,back)=>{const a=new T.Vector3(x,y,back?-.5:.5).applyMatrix4(adapted.root.matrixWorld),b=new T.Vector3(x,y,back?.5:-.5).applyMatrix4(adapted.root.matrixWorld),ray=new T.Raycaster(a,b.sub(a).normalize(),0,1),visible=[];adapted.root.traverseVisible(o=>{if(o.isMesh)visible.push(o);});return ray.intersectObjects(visible,false);};
  for(const back of [false,true]){
   for(const x of [-.35,0,.35]){assert.equal(test(x,sculpture.opening.center[1],back).length,0,'Exposed aperture is blocked');apertureRays++;}
   for(const x of [-.75,.75]){assert(test(x,1,back).length>0,'Half-metre pier is not solid');apertureRays++;}
  }
 }
 pool.dispose();pool.dispose();raw.dispose();assert.deepEqual(pool.counts(),{geometries:0,materials:0,textures:0,objects:0});assert.equal(borrowedDisposals,0,'Window disposed host-owned material');
}
assert.throws(()=>mergeCenteredWindowEdges([],[{a:[0,0],b:[3,0],profile:'window-bay-period'}]),/two metres/);
const catalogue=read('assets/art/hopkins-housing-v1/houses.json'),baseline=read(base+'adoption-baseline.json'),oldSiding=read('docs/art/housing-siding-review/baseline.json'),adoptions=[];let houseHoleRays=0;
function fingerprints(root){
 const geometry=createHash('sha256'),roof=createHash('sha256');root.updateMatrixWorld(true);
 root.traverse(o=>{if(!o.isMesh)return;const g=o.geometry,p=g.attributes.position,index=g.index,mats=Array.isArray(o.material)?o.material:[o.material];
 geometry.update(JSON.stringify([o.name,o.matrixWorld.elements,g.groups]));for(const name of Object.keys(g.attributes).sort())geometry.update(name).update(new Uint8Array(g.attributes[name].array.buffer,g.attributes[name].array.byteOffset,g.attributes[name].array.byteLength));if(index)geometry.update(new Uint8Array(index.array.buffer,index.array.byteOffset,index.array.byteLength));
 for(const range of Array.isArray(o.material)?g.groups:[{start:0,count:index?index.count:p.count,materialIndex:0}]){const m=mats[range.materialIndex];if(m?.name!=='Roof covering')continue;roof.update(JSON.stringify([o.name,m.map?.userData.id,m.color.toArray(),m.roughness,m.metalness]));for(let i=range.start;i<range.start+range.count;i+=3){const v=[0,1,2].map(k=>new T.Vector3().fromBufferAttribute(p,index?index.getX(i+k):i+k).applyMatrix4(o.matrixWorld)),normal=v[1].clone().sub(v[0]).cross(v[2].clone().sub(v[0]));if(normal.length()/2>=1e-9)roof.update(JSON.stringify(v.map(p=>p.toArray())));}}
 });return{geometrySha256:geometry.digest('hex'),roofCoveringSha256:roof.digest('hex')};
}
for(const texture of Object.entries(textures))texture[1].userData.id=texture[0];
for(const id of ['hopkins-4-13','hopkins-4-15']){
 const h=catalogue.houses.find(h=>h.id===id),old=baseline.houses[id];
 for(const name of ['width','depth','plinth','nativeContract','source'])assert.deepEqual(h[name],old[name]);assert.deepEqual(h.floors[0],old.floors[0]);
 const floor=structuredClone(h.floors[1]),bay=floor.windowBays[0],removed=id==='hopkins-4-13'?[1,0,2,0]:[4,-1,5,-1];
 assert.deepEqual(floor.windows,old.floors[1].windows.filter(w=>JSON.stringify(w)!==JSON.stringify(removed)));delete floor.windowBays;floor.windows=old.floors[1].windows;assert.deepEqual(floor,old.floors[1],'Room/door/stair layout changed');assert.equal(bay.profile,'window-bay-period');
 const model=createHopkinsHouse(T,{catalogue,textures},id),window=model.root.getObjectByName('Nautilus centered window bay');assert(window);model.root.updateMatrixWorld(true);const geometry=fingerprints(model.root);assert.equal(geometry.roofCoveringSha256,oldSiding.houses.find(h=>h.id===id).roofCoveringSha256,'Roof covering changed');
 const bounds=new T.Box3().setFromObject(window),center=(bay.a[0]+bay.b[0])/2;assert(Math.abs((bounds.min.x+bounds.max.x)/2-center)<1e-6);assert(Math.abs(bounds.max.x-bounds.min.x-2)<1e-6);
 assert.equal(window.getObjectByName('lower-sash').children.filter(o=>o.userData.material==='glass').length,6);
 for(const key of ['lower-sash','upper-sash'])window.getObjectByName(key).visible=false;
 for(const side of [-1,1])for(const dx of [-.35,0,.35]){
  const z=bay.a[1],origin=new T.Vector3(center+dx,h.plinth+2.12+.95,z+side*.4),ray=new T.Raycaster(origin,new T.Vector3(0,0,-side),0,.8),objects=[];model.root.traverseVisible(o=>{if(o.isMesh)objects.push(o);});assert.equal(ray.intersectObjects(objects,false).length,0,id+' house wall or roof facing blocks the centred aperture');houseHoleRays++;
 }
 for(const key of ['lower-sash','upper-sash'])window.getObjectByName(key).visible=true;
 const roofSurfaces=[];model.root.getObjectByName('Removable roofs').traverse(o=>{if(o.isMesh&&(o.name.startsWith('New Hopkins footprint roof')||o.userData.roofTile))roofSurfaces.push(o);});
 const chimney=model.root.getObjectByName('New Hopkins brick chimney'),cbox=new T.Box3().setFromObject(chimney),ray=new T.Raycaster(new T.Vector3(chimney.position.x,20,chimney.position.z),new T.Vector3(0,-1,0)),hit=ray.intersectObjects(roofSurfaces,false)[0];assert(hit&&cbox.min.y<hit.point.y,'Chimney base floats above roof');
 const geometries=new Set();model.root.traverse(o=>{if(o.isMesh)geometries.add(o.geometry);});const disposed=new Map();for(const g of geometries)g.addEventListener('dispose',()=>disposed.set(g,(disposed.get(g)||0)+1));
 model.setView({view:'cutaway',level:1});assert.equal(model.root.getObjectByName('Removable roofs').visible,false);model.dispose();model.dispose();assert.equal(disposed.size,geometries.size);assert([...disposed.values()].every(n=>n===1));
 adoptions.push({id,assetSha256:sha(fs.readFileSync('assets/art/hopkins-housing-v1/prefabs/'+id+'.json')),...geometry,windowProfile:bay.profile,bay,roomDoorAndStairLayout:'unchanged',roofCovering:'unchanged',chimney:'Seated in roof; No. 13 pre-existing floating base corrected',scale:[1,1,1]});
}
const adoptionFile=base+'adoption.json',adoption={baselineCommit:baseline.commit,sourceCommit:NAUTILUS_WINDOW_COMMIT,houses:adoptions};if(fs.existsSync(adoptionFile))assert.deepEqual(read(adoptionFile),adoption,'Accepted window adoption fingerprints changed');else fs.writeFileSync(adoptionFile,JSON.stringify(adoption,null,2)+'\n');
fs.mkdirSync('docs/art/nautilus-windows-v1',{recursive:true});const report={passed:true,sourceCommit:NAUTILUS_WINDOW_COMMIT,importedFileHashes:imported.files.length,profiles:2,bayWidthMetres:2,openingWidthMetres:1,flankWidthMetres:.5,sourceAttributeChecks,apertureRays,houseHoleRays,houses:adoptions.map(h=>h.id),nativeScale:true,sourceGeometryAndUVsPreserved:true,borrowedMaterialsPreserved:true,cutawayAndDisposal:true,roomDoorStairLayoutsUnchanged:true,roofCoveringsUnchanged:true,chimneysSeated:true,traversal:'deferred'};fs.writeFileSync('docs/art/nautilus-windows-v1/geometry-review.json',JSON.stringify(report,null,2)+'\n');borrowed.dispose();for(const t of Object.values(textures))t.dispose();console.log(JSON.stringify(report,null,2));
