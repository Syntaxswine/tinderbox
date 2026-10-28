import fs from 'node:fs';
import assert from 'node:assert/strict';
import {createHash} from 'node:crypto';
import * as T from '../../vendor/farmyard-commando/30a3b8cae5f36bb0c1df3685b7fba16f701c2083/sites/tactical-animal/dist/aft/tactics/vendor/three.module.js';
import {createGrossHouse} from '../../src/art/gross-housing.js';
import {createHopkinsHouse} from '../../src/art/hopkins-housing.js';
const directory='docs/art/housing-siding-review/',capturing=process.argv.includes('--capture-baseline');
const read=p=>JSON.parse(fs.readFileSync(p,'utf8')),digest=bytes=>createHash('sha256').update(bytes).digest('hex');
const baselinePath=directory+'baseline.json';
if(capturing)assert(!fs.existsSync(baselinePath),'Do not overwrite the reviewed baseline');
const textures=Object.fromEntries(['clapboard','cedar','oak','paper','brick','slate'].map(id=>{const t=new T.Texture();t.userData.id=id;return[id,t];}));
const roofTrim=new Set(['Gambrel ridge cap','Gambrel slope-break cap']);
const enclosure=name=>name==='New gable infill'||name==='Dormer front'||name==='New spire drum'||name.startsWith('New Hopkins roof closure')||name.endsWith('gable closure')||name==='Removable gambrel gable siding';
function inspect(collection,create,h,catalogue){
 const model=create(T,{catalogue,textures},h.id);model.root.updateMatrixWorld(true);
 const geometry=createHash('sha256'),roofCovering=createHash('sha256'),wrong=new Map();let meshes=0,verticalCladdingFaces=0,acceptedCapFaces=0;
 model.root.traverse(o=>{
  if(!o.isMesh)return;meshes++;assert.deepEqual(o.scale.toArray(),[1,1,1]);
  const g=o.geometry,p=g.attributes.position,index=g.index,materials=Array.isArray(o.material)?o.material:[o.material];
  geometry.update(JSON.stringify([o.name,o.matrixWorld.elements,g.groups]));
  for(const name of Object.keys(g.attributes).sort())geometry.update(name).update(new Uint8Array(g.attributes[name].array.buffer,g.attributes[name].array.byteOffset,g.attributes[name].array.byteLength));
  if(index)geometry.update(new Uint8Array(index.array.buffer,index.array.byteOffset,index.array.byteLength));
  const ranges=Array.isArray(o.material)?g.groups:[{start:0,count:index?index.count:p.count,materialIndex:0}];
  for(const range of ranges){
   const m=materials[range.materialIndex];if(!m)continue;
   if(m.name==='Roof covering')roofCovering.update(JSON.stringify([o.name,m.map?.userData.id,m.color.toArray(),m.roughness,m.metalness]));
   for(let i=range.start;i<range.start+range.count;i+=3){
    const v=[0,1,2].map(k=>new T.Vector3().fromBufferAttribute(p,index?index.getX(i+k):i+k).applyMatrix4(o.matrixWorld));
    const normal=v[1].clone().sub(v[0]).cross(v[2].clone().sub(v[0])),area=normal.length()/2;if(area<1e-9)continue;normal.normalize();
    if(m.name==='Roof covering')roofCovering.update(JSON.stringify(v.map(p=>p.toArray())));
    if(Math.abs(normal.y)>1e-6)continue;
    if(enclosure(o.name)){
     verticalCladdingFaces++;
     if(!capturing)assert.equal(m.map,textures[h.style.wall],h.id+' / '+o.name+' must match its exterior wall finish');
    }
    if(!['Roof covering','Gable shingles'].includes(m.name))continue;
    if(roofTrim.has(o.name)){assert(o.userData.nativeDimensions[0]<=.055,'Roof trim exception became a wall');acceptedCapFaces++;continue;}
    const key=o.name+' / '+m.name,record=wrong.get(key)||{mesh:o.name,material:m.name,triangles:0,areaSquareMetres:0};record.triangles++;record.areaSquareMetres+=area;wrong.set(key,record);
   }
  }
 });
 const result={collection,id:h.id,label:h.label,wall:h.style.wall,source:h.source,assetSha256:digest(fs.readFileSync('assets/art/'+collection+'-housing-v1/prefabs/'+h.id+'.json')),geometrySha256:geometry.digest('hex'),roofCoveringSha256:roofCovering.digest('hex'),meshes,verticalCladdingFaces,acceptedCapFaces,wrongVerticalFaces:[...wrong.values()].map(r=>({...r,areaSquareMetres:Number(r.areaSquareMetres.toFixed(6))}))};
 for(const level of model.levels){model.setView({view:'cutaway',level:level.index});assert.equal(model.root.getObjectByName('Removable roofs').visible,false);}
 model.dispose();model.dispose();assert.deepEqual(model.diagnostics().resources,{geometries:0,materials:0,textures:0,objects:0});return result;
}
const houses=[];
for(const [collection,create] of [['hopkins',createHopkinsHouse],['gross',createGrossHouse]]){
 const catalogue=read('assets/art/'+collection+'-housing-v1/houses.json');for(const h of catalogue.houses)houses.push(inspect(collection,create,h,catalogue));
}
if(capturing){
 fs.writeFileSync(baselinePath,JSON.stringify({commit:'ec77f460e539d2bf114c806ed520c0a7945edabc',scope:'Twelve Hopkins and thirteen Gross artist prefabs before the collection siding correction',houses},null,2)+'\n');console.log('Captured immutable geometry, roof-material and prefab baseline for '+houses.length+' houses.');
}else{
 const baseline=read(baselinePath);assert.equal(houses.length,25);const fixed=[];
 for(const house of houses){
  const old=baseline.houses.find(h=>h.id===house.id);assert(old,house.id);assert.equal(house.assetSha256,old.assetSha256,house.id+' prefab data changed');assert.equal(house.geometrySha256,old.geometrySha256,house.id+' geometry/transforms/UVs changed');assert.equal(house.roofCoveringSha256,old.roofCoveringSha256,house.id+' roof covering changed');assert.equal(house.wrongVerticalFaces.length,0,house.id+' retains roof texture on a vertical enclosure');
  if(old.wrongVerticalFaces.length)fixed.push({id:house.id,collection:house.collection,wall:house.wall,correctedTriangles:old.wrongVerticalFaces.reduce((n,r)=>n+r.triangles,0),parts:old.wrongVerticalFaces.map(r=>r.mesh)});
 }
 const materialManifest=read('assets/art/hopkins-housing-v1/manifest.json');for(const m of materialManifest.reusedMaterials)assert.equal(digest(fs.readFileSync(m.path)),m.sha256,m.path+' source texture changed');
 const report={passed:true,baselineCommit:baseline.commit,housesReviewed:houses.length,housesCorrected:fixed.length,hopkinsCorrected:fixed.filter(h=>h.collection==='hopkins').length,grossCorrected:fixed.filter(h=>h.collection==='gross').length,unchangedPrefabHashes:houses.length,unchangedGeometryAndUVHashes:houses.length,unchangedRoofCoveringHashes:houses.length,unchangedTextureHashes:materialManifest.reusedMaterials.length,verticalCladdingTrianglesChecked:houses.reduce((n,h)=>n+h.verticalCladdingFaces,0),remainingIncorrectVerticalRoofFaces:0,acceptedSmallRoofCapFaces:houses.reduce((n,h)=>n+h.acceptedCapFaces,0),cutawayAndDisposal:true,fixed,unchangedHouses:houses.filter(h=>!fixed.some(f=>f.id===h.id)).map(h=>h.id),scope:'Facade finish assignments only. No dimensions, openings, roof forms, source scans, maps or gameplay changed.'};
 fs.writeFileSync(directory+'geometry-review.json',JSON.stringify(report,null,2)+'\n');console.log(JSON.stringify(report,null,2));
}
for(const t of Object.values(textures))t.dispose();
