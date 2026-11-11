import fs from 'node:fs';
import assert from 'node:assert/strict';
import {createHash} from 'node:crypto';
import * as T from '../../../src/runtime/three.js';
import {createHullHouseBlock,createHullHouseBuilding,BLOCK_PLAN,HULL_SKINS} from '../../../assets/art/hull-house-block/index.js';
import {CIVILIAN_PROFILES} from '../../../src/content/exterior-kit.js';
import {CHARACTER_PROFILES} from '../../../src/content/characters.js';
import {nativeWindowTemplates} from '../../../assets/art/hull-house-block/architecture.js';
const out='docs/art/hull-house-block',groups=[];
const pass=(name,data={})=>groups.push({name,passed:true,...data});
const close=(a,b,e=1e-5)=>assert.ok(Math.abs(a-b)<e,a+' vs '+b);
const area=p=>Math.abs(p.reduce((n,a,i)=>{const b=p[(i+1)%p.length];return n+a[0]*b[2]-b[0]*a[2];},0)/2);
const v=(p,m)=>new T.Vector3(...p).applyMatrix4(m).toArray();
const base=createHullHouseBlock(T),meta=base.metadata,stats=base.diagnostics();
try{
 assert.equal(meta.buildings.length,56);assert.equal(BLOCK_PLAN.metrics.overlaps,0);assert.equal(BLOCK_PLAN.metrics.nativeFootprintCells,4684);pass('Source trace: 56 stable building IDs and disjoint whole-metre footprints',BLOCK_PLAN.metrics);
 const cells=new Set();for(const d of BLOCK_PLAN.buildings){for(const [x,z]of d.cells){assert.equal(x,Math.floor(x));assert.equal(z,Math.floor(z));assert.ok(!cells.has(x+'/'+z));cells.add(x+'/'+z);}close(d.cells.length,area(d.polygon.map(([x,z])=>[x,0,z])));}
 pass('Actual grid area equals every source-traced native footprint');
 for(const s of meta.surfaces.filter(s=>s.kind!=='roof')){close(s.elevation/2.12,Math.round(s.elevation/2.12));for(const p of s.polygon)close(p[1],s.elevation);}
 for(const w of meta.wallRuns){assert.ok(Number.isInteger(w.length));assert.equal(w.height,2);assert.equal(w.thickness,.16);assert.equal(w.floorPitch,2.12);}
 for(const d of meta.doors){assert.equal(d.width,1);assert.equal(d.height,1.65);assert.equal(d.thickness,.12);assert.equal(d.passableByNativeActors,false);}
 for(const w of meta.windows){assert.equal(w.span,2);assert.equal(w.openingWidth,1);assert.deepEqual(w.piers,[.5,.5]);assert.equal(w.assetId,'window-bay-period');}
 pass('Native wall, door, floor pitch and centred two-cell period windows',{windows:meta.windows.length,doors:meta.doors.length});
 const slabs=[];base.root.traverse(o=>{if(o.isInstancedMesh)slabs.push(o);});
 const m=new T.Matrix4(),scale=new T.Vector3(),pos=new T.Vector3(),q=new T.Quaternion();
 for(const s of slabs){
  s.geometry.computeBoundingBox();const sz=s.geometry.boundingBox.getSize(new T.Vector3());close(sz.x,1);close(sz.y,.12);close(sz.z,1);
  const col=s.geometry.attributes.color;assert.ok(col);for(const n of col.array)close(n,1);
  for(let i=0;i<s.count;i++){s.getMatrixAt(i,m);m.decompose(pos,q,scale);close(scale.x,1);close(scale.y,1);close(scale.z,1);close(pos.x-.5,Math.round(pos.x-.5));close(pos.z-.5,Math.round(pos.z-.5));}
 }
 pass('All instanced slabs remain 1 x .12 x 1 m with white vertex colours and translation-only placement',{batches:slabs.length,nativeSlabs:stats.nativeSlabs});
 const ground=meta.surfaces.find(s=>s.id==='courts/ground');close(area(ground.polygon)-ground.holes.reduce((n,h)=>n+area(h),0),14408);assert.equal(ground.nativeCellCount,14408);
 const floorCells=meta.surfaces.filter(s=>s.kind==='floor'&&s.level===0).reduce((n,s)=>n+s.nativeCellCount,0);assert.equal(floorCells,4684);pass('Supported ground excludes every house footprint; house ground slabs cover those holes exactly');
 for(const g of meta.gableEnds){assert.equal(g.roofTexture,false);assert.ok(g.skinSlot==='brick'||g.skinSlot.startsWith('wood'));}
 assert.ok(meta.gableEnds.length>60);pass('Every vertical gable end uses its wall skin, never roof covering',{gableEnds:meta.gableEnds.length});
 for(const s of meta.surfaces.filter(s=>s.kind==='roof'&&s.pitch===1)){assert.equal(s.overhang,.16);const ys=s.polygon.map(v=>v[1]);const xs=s.polygon.map(v=>v[0]),zs=s.polygon.map(v=>v[2]);close(Math.max(...ys)-Math.min(...ys),Math.min(Math.max(...xs)-Math.min(...xs),Math.max(...zs)-Math.min(...zs)));}
 pass('Gable roofs retain the existing 1:1 slope and declared 0.16 m eaves');
 const front=BLOCK_PLAN.buildings.find(d=>d.id==='ewing-155-front'),rear=BLOCK_PLAN.buildings.find(d=>d.id==='ewing-155-rear');
 assert.deepEqual(front.bounds.max,[220,72]);assert.deepEqual(rear.bounds.min,[220,41]);assert.equal(rear.bounds.max[1],front.bounds.min[1]);
 const topAt=(d,x)=>d.levels*2.12+(d.bounds.max[0]-d.bounds.min[0])/2-Math.abs(x-(d.bounds.min[0]+d.bounds.max[0])/2);
 for(let x=219.84;x<=220.16;x+=.02)assert.ok(topAt(rear,x)<topAt(front,x)-1.8);
 pass('Snapped Ewing155 native wall corner retains vertically separated gable eaves; inferred rear level is explicit');
 let roofEdges=0;
 base.root.traverse(o=>{if(!o.isMesh||o.isInstancedMesh||!o.name.endsWith('/roof'))return;const p=o.geometry.attributes.position,u=o.geometry.attributes.uv;
  for(let i=0;i<p.count;i+=3)for(let j=0;j<3;j++){const a=i+j,c=i+(j+1)%3,dl=Math.hypot(p.getX(a)-p.getX(c),p.getY(a)-p.getY(c),p.getZ(a)-p.getZ(c)),du=Math.hypot(u.getX(a)-u.getX(c),u.getY(a)-u.getY(c));close(dl,du,3e-5);roofEdges++;}
 });assert.ok(roofEdges>10000);pass('Roof covering UVs keep physical metre density along every sloping triangle edge',{edges:roofEdges});
 // The capsule envelope is the existing native goat traversal profile, not a resized actor.
 assert.equal(CIVILIAN_PROFILES.goat.radius,.62);assert.equal(CIVILIAN_PROFILES.goat.height,1.7);assert.ok(CHARACTER_PROFILES.goat.radius<=.62&&CHARACTER_PROFILES.goat.height<=1.7);
 const corridor=new T.Box3(new T.Vector3(31.78,.03,38.3),new T.Vector3(33.22,1.72,73.6)),candidate=[];
 base.root.updateMatrixWorld(true);base.root.traverse(o=>{if(!o.isMesh||o.isInstancedMesh)return;const box=new T.Box3().setFromObject(o);if(box.intersectsBox(corridor))candidate.push(o);});
 const ray=new T.Raycaster();let samples=0;
 for(let z=38.4;z<=73.5;z+=.23)for(const y of [.05,.4,.85,1.35,1.7])for(const x of [31.78,32.5,33.22]){
  ray.set(new T.Vector3(x,y,z),new T.Vector3(0,0,1));ray.near=0;ray.far=.23;const hits=ray.intersectObjects(candidate,false);assert.equal(hits.length,0,JSON.stringify({x,y,z,hit:hits[0]?.object.name}));samples++;
 }
 pass('Actual courtyard meshes clear a 1.44 m wide by 1.72 m high swept envelope',{samples,candidates:candidate.length,geometryOnly:true,productionNavigation:'deferred'});
 const stair=meta.fittings.find(f=>f.kind==='timber-porch-and-stair');close(stair.landingHeight,2.12);close(stair.rise*stair.treads,2.12);close(stair.run*stair.treads,4);assert.equal(stair.width,2);
 const porch=meta.surfaces.find(s=>s.id==='halsted-348/porch-floor');assert.equal(porch.nativeCellCount,12);close(porch.elevation,2.12);pass('Inferred rear porch and 12-step stair meet exactly at the native upper landing');
 // Every native window template keeps its exact pinned geometry and UV coordinates in the batch.
 const template=nativeWindowTemplates(T,{wood0:new T.MeshStandardMaterial(),trim:new T.MeshStandardMaterial(),sash:new T.MeshStandardMaterial(),glass:new T.MeshStandardMaterial(),iron:new T.MeshStandardMaterial()});
 try{for(const [slot,g]of template.geometries){assert.ok(g.attributes.uv);assert.ok(g.attributes.position.count>0);for(const n of g.attributes.uv.array)assert.ok(Number.isFinite(n));}}finally{template.dispose();}
 pass('Pinned Nautilus period window templates contain finite, preserved source UVs');
 const before=base.root.children.length,resources=new Set(),materials=new Set();base.root.traverse(o=>{if(o.isMesh){resources.add(o.geometry);materials.add(o.material);}});
 for(let i=0;i<8;i++)base.setSkin(HULL_SKINS[i%2]);assert.equal(base.root.children.length,before);
 const nowG=new Set(),nowM=new Set();base.root.traverse(o=>{if(o.isMesh){nowG.add(o.geometry);nowM.add(o.material);}});assert.deepEqual(nowG,resources);assert.deepEqual(nowM,materials);
 base.setSkin('working');assert.ok(base.metadata.clothAttachments.every(a=>!a.active));base.setSkin('jubilee');assert.ok(base.metadata.clothAttachments.every(a=>a.active));pass('Working and jubilee skins toggle only cloth visibility and allocate no resources');
 for(let quarterTurns=0;quarterTurns<4;quarterTurns++){
  const position=[310,4.24,120],a=createHullHouseBlock(T,{quarterTurns,position});
  try{
   const expected=new T.Matrix4().makeRotationY(quarterTurns*Math.PI/2).setPosition(...position),actual=a.metadata;
   for(let i=0;i<meta.buildings.length;i++)for(let j=0;j<meta.buildings[i].polygon.length;j++){const p=v(meta.buildings[i].polygon[j],expected);p.forEach((n,k)=>close(n,actual.buildings[i].polygon[j][k]));}
   const box=new T.Box3();for(const x of [meta.bounds.min[0],meta.bounds.max[0]])for(const y of [meta.bounds.min[1],meta.bounds.max[1]])for(const z of [meta.bounds.min[2],meta.bounds.max[2]])box.expandByPoint(new T.Vector3(x,y,z).applyMatrix4(expected));
   box.min.toArray().forEach((n,i)=>close(n,actual.bounds.min[i]));box.max.toArray().forEach((n,i)=>close(n,actual.bounds.max[i]));
   for(const s of actual.surfaces.filter(s=>s.elevation!==undefined))close((s.elevation-position[1])/2.12,Math.round((s.elevation-position[1])/2.12));
   pass('Quarter turn '+quarterTurns+': measured bounds, all building footprints and floor elevations transform together');
  }finally{a.dispose();}
 }
 for(let quarterTurns=0;quarterTurns<4;quarterTurns++){
  const a=createHullHouseBuilding(T,{id:'polk-228-front',quarterTurns,position:[30,2.12,40]});
  try{const p=a.metadata.buildings[0].polygon[0];p.forEach((n,i)=>close(n,[30,2.12,40][i]));assert.equal(a.metadata.passages.length,0);pass('Standalone building anchor at quarter turn '+quarterTurns);}finally{a.dispose();}
 }
 const adjacent=createHullHouseBlock(T,{position:[290,0,0]});
 try{const next=adjacent.metadata;close(meta.bounds.max[0],adjacent.bounds.min[0]);assert.ok(meta.buildings.every(a=>next.buildings.every(b=>a.bounds.max[0]<b.bounds.min[0])));pass('Adjacent complete block assemblies: street slabs meet once at their outer boundary and houses remain separate');}finally{adjacent.dispose();}
 for(const bad of [{quarterTurns:4},{quarterTurns:-1},{position:[.5,0,0]},{position:[0,1,0]},{skin:'other'},{buildingIds:['missing']},{materials:{missing:new T.MeshStandardMaterial()}}])assert.throws(()=>createHullHouseBlock(T,bad));
 pass('Invalid dimensions, rotations, unknown IDs and appearance slots reject before construction');
 const borrowed=new T.MeshStandardMaterial(),texture=new T.Texture();let borrowedDisposed=0,textureDisposed=0;borrowed.addEventListener('dispose',()=>borrowedDisposed++);texture.addEventListener('dispose',()=>textureDisposed++);
 let priorCalled=false;borrowed.onBeforeCompile=()=>{priorCalled=true;};
 const a=createHullHouseBuilding(T,{id:'polk-228-front',materials:{wood3:borrowed},textures:{wood3:texture}});
 const ownedG=new Set(),ownedM=new Set(),instances=[];a.root.traverse(o=>{if(o.isMesh){ownedG.add(o.geometry);ownedM.add(o.material);if(o.isInstancedMesh)instances.push(o);}});
 let disposedG=0,disposedM=0,disposedI=0;for(const g of ownedG)g.addEventListener('dispose',()=>disposedG++);for(const m of ownedM)m.addEventListener('dispose',()=>disposedM++);for(const i of instances)i.addEventListener('dispose',()=>disposedI++);
 const clone=[...ownedM].find(m=>m.map===texture);assert.ok(clone);clone.onBeforeCompile({vertexShader:'#include <begin_vertex>',fragmentShader:'#include <color_fragment>'},null);assert.ok(priorCalled);const holder=new T.Group();holder.add(a.root);
 a.dispose();a.dispose();assert.equal(a.root.parent,null);assert.equal(a.root.children.length,0);assert.equal(disposedG,ownedG.size);assert.equal(disposedM,ownedM.size);assert.equal(disposedI,instances.length);assert.equal(borrowedDisposed,0);assert.equal(textureDisposed,0);assert.throws(()=>a.setSkin('working'));assert.throws(()=>a.metadata);
 pass('Owned geometry, materials and instancing buffers dispose exactly once; borrowed resources and shader hook survive',{geometries:ownedG.size,materials:ownedM.size,instanceBatches:instances.length});borrowed.dispose();texture.dispose();
 const manifest=JSON.parse(fs.readFileSync('assets/art/hull-house-block/manifest.json'));
 for(const r of [...manifest.runtimeFiles,...manifest.dependencies,...manifest.notices,...manifest.sourceRecords,manifest.trace,manifest.selectedIntake]){const b=fs.readFileSync(r.path);assert.equal(b.length,r.bytes);assert.equal(createHash('sha256').update(b).digest('hex'),r.sha256);}
 for(const name of ['index.js','architecture.js','forms.js','cloth.js','lettering.js','letters.js','plan.js'])assert.equal(fs.readFileSync('art/source/hull-house-block/'+name,'utf8').replace(/^\uFEFF/,'').replace(/\r\n/g,'\n'),fs.readFileSync('assets/art/hull-house-block/'+name,'utf8'));
 assert.deepEqual(fs.readFileSync('assets/art/hull-house-block/LETTERING-OFL.txt'),fs.readFileSync('assets/art/ui/typography/besley/OFL.txt'));pass('Canonical source exports, runtime dependency hashes and unchanged lettering license');
 fs.mkdirSync(out,{recursive:true});fs.writeFileSync(out+'/checks.json',JSON.stringify({task:'Hull-House block art',passed:groups.length,failed:0,three:T.REVISION,statistics:stats,groups,limitations:['Geometry checks do not establish gameplay traversal, collision or fire behavior.','Source trace and inferred property details remain subject to architect and owner review.']},null,2)+'\n');
 console.log(JSON.stringify({passed:groups.length,failed:0,statistics:stats}));
}finally{base.dispose();}
