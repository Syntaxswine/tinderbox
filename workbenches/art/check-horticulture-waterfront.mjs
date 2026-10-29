import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import {execFileSync} from 'node:child_process';
import {createHash} from 'node:crypto';
import {pathToFileURL} from 'node:url';
import * as T from '../../src/runtime/three.js';
import {createWaterfrontTile,WATERFRONT_TILES,WATERFRONT_PROFILE as P,APPEARANCE_SLOTS} from '../../assets/art/horticulture-waterfront/index.js';
import {WALL_KIT,wallPanels,wallRunErrors} from '../../vendor/nautilus-engine/90054d07134116a5d9661f8318a76fe68f922aad/packages/map-core/wall-runs.js';
const EPS=3e-5,near=(a,b,n)=>assert.ok(Math.abs(a-b)<EPS,n+': '+a+' / '+b),sha=b=>createHash('sha256').update(b).digest('hex');
const preserved=JSON.parse(fs.readFileSync('art/source/horticulture-waterfront/preserved.json')),sources=JSON.parse(fs.readFileSync('art/source/horticulture-waterfront/sources.json'));
for(const f of preserved.files)assert.equal(execFileSync('git',['hash-object','--path='+f.path,'--',f.path],{encoding:'utf8'}).trim(),f.gitBlob,'Preserved asset changed: '+f.path);
for(const f of [preserved.engine,...sources.evidence]){const b=fs.readFileSync(f.path);assert.equal(sha(b),f.sha256);assert.equal(b.length,f.bytes);}
near(P.tile,WALL_KIT.panel,'Native panel');near(P.wallHeight,2,'Native height');near(P.floorSpacing,2.12,'Pitch');near(P.slab,.12,'Slab');
const originals={wall:new T.BoxGeometry(1,2,.16),slab:new T.BoxGeometry(1,.12,1)},texture=new T.Texture();texture.repeat.set(.5,.5);texture.offset.set(.13,.37);let borrowedDisposals=0;texture.addEventListener('dispose',()=>borrowedDisposals++);
const materials=Object.fromEntries(APPEARANCE_SLOTS.map(s=>[s,new T.MeshStandardMaterial({color:0xb8ad98,map:texture})]));for(const m of Object.values(materials))m.addEventListener('dispose',()=>borrowedDisposals++);
function each(tile,fn){tile.root.updateMatrixWorld(true);const instance=new T.Matrix4();tile.root.traverse(o=>{if(!o.isMesh)return;for(let i=0;i<(o.isInstancedMesh?o.count:1);i++){const m=o.matrixWorld.clone();if(o.isInstancedMesh){o.getMatrixAt(i,instance);m.multiply(instance);}fn(o,o.isInstancedMesh?o.userData.parts[i]:o.userData,m);}});}
const dataOf=h=>h.object.isInstancedMesh?h.object.userData.parts[h.instanceId]:h.object.userData;
function down(tile,x,z,y=6,far=10){return new T.Raycaster(new T.Vector3(x,y,z),new T.Vector3(0,-1,0),0,far).intersectObject(tile.root,true);}
function topRole(tile,x,z,role){const hit=down(tile,x,z).find(h=>dataOf(h).role===role);assert.ok(hit,role+' ray '+x+','+z);return hit.point.y;}
function digest(tile){const h=createHash('sha256');tile.root.traverse(o=>{if(!o.isMesh)return;h.update(o.name);h.update(JSON.stringify(o.matrix.elements));if(o.isInstancedMesh)h.update(Buffer.from(o.instanceMatrix.array.buffer));for(const a of Object.values(o.geometry.attributes))h.update(Buffer.from(a.array.buffer));});return h.digest('hex');}
let nativeWalls=0,nativeSlabs=0,triangles=0,ownedDisposals=0,vertices=0;const summaries=[];
for(const type of WATERFRONT_TILES){
 const tile=createWaterfrontTile(T,{type,materials}),metadata=JSON.stringify(tile.metadata),report=tile.diagnostics(),counts={wall:0,slab:0},ids=new Set(),resources=new Map();
 function track(){tile.root.traverse(o=>{if(!o.isMesh)return;for(const r of [o.geometry,o.material,...(o.isInstancedMesh?[o]:[])])if(!resources.has(r)){resources.set(r,0);r.addEventListener('dispose',()=>resources.set(r,resources.get(r)+1));}});}
 track();assert.deepEqual(wallRunErrors(tile.metadata.nativeMap),[]);assert.equal(tile.metadata.nativeMap.levels,3);assert.equal(tile.metadata.physicalMaterial.structure,'unassigned');
 const expected=tile.metadata.nativeMap.wallRuns.segments.flatMap(wallPanels).map(p=>({...p,center:[p.center[0]-8,p.center[1],p.center[2]-8]}));assert.equal(expected.length,report.nativeWalls);
 each(tile,(o,d,m)=>{
  assert.ok(!ids.has(d.componentId),'Duplicate component '+d.componentId);ids.add(d.componentId);const g=o.geometry,p=g.attributes.position,sc=new T.Vector3().setFromMatrixScale(m);sc.toArray().forEach(v=>near(v,1,'Unscaled module'));
  for(let i=0;i<p.count;i++){const v=new T.Vector3().fromBufferAttribute(p,i).applyMatrix4(m);assert.ok(v.toArray().every(Number.isFinite));assert.ok(tile.bounds.clone().expandByScalar(EPS).containsPoint(v),'Bounds '+d.componentId);vertices++;}
  if(d.form==='native-wall'||d.form==='native-slab'){
   const name=d.form.slice(7),native=originals[name];counts[name]++;
   for(const a of ['position','normal','uv'])assert.deepEqual(g.attributes[a].array,native.attributes[a].array,'Native '+name+' '+a);assert.deepEqual(g.index.array,native.index.array);
   if(name==='wall'){const panel=expected.find(p=>p.id===d.panelId);assert.ok(panel);const centre=new T.Vector3().setFromMatrixPosition(m);centre.toArray().forEach((v,i)=>near(v,panel.center[i],'Nautilus centre'));const direction=new T.Vector3(1,0,0).transformDirection(m);near(direction.x,Math.cos(panel.yaw),'Native yaw X');near(direction.z,-Math.sin(panel.yaw),'Native yaw Z');}
   else{const b=new T.Box3().setFromBufferAttribute(p).applyMatrix4(m);near(b.max.y,P.floorSpacing,'Slab top');near(b.max.y-b.min.y,P.slab,'Slab thickness');[b.min.x,b.min.z,b.max.x,b.max.z].forEach(v=>near(v,Math.round(v),'Tile metre edge'));}
  }
  const shader={vertexShader:'#include <uv_vertex>',fragmentShader:''};o.material.onBeforeCompile(shader,{});assert.ok(shader.vertexShader.startsWith('attribute vec2 grossUV;\n'));assert.ok(!shader.vertexShader.includes('\\n'),'Literal backslash newline in shader');assert.match(shader.vertexShader,/mapTransform \* vec3\(grossUV, 1\.0\)/);
 });
 assert.equal(counts.wall,report.nativeWalls);assert.equal(counts.slab,report.nativeSlabs);
 for(const [x,z]of tile.metadata.gridCells)near(topRole(tile,x+.5,z+.5,'floor'),P.floorSpacing,'Grid floor ray');
 if(type==='quay-inner-corner')assert.equal(down(tile,1.5,1.5).filter(h=>dataOf(h).role==='floor').length,0,'Water notch filled');
 if(type==='quay-stairs'){
  assert.equal(tile.metadata.treads.length,12);for(const t of tile.metadata.treads){near(topRole(tile,1,(t.zStart+t.zEnd)/2,'stair-tread'),(t.step+1)*P.floorSpacing/12,'Stair rise');}
  near(topRole(tile,1,-.0001,'stair-tread'),P.floorSpacing,'Upper stair');near(topRole(tile,1,.0001,'floor'),P.floorSpacing,'Landing seam');assert.equal(Math.min(...tile.metadata.footprint[0].map(p=>p[1])),-4);
 }
 const before=digest(tile);tile.setAppearance({materials:{facade:materials.coping},textures:{rail:texture}});track();assert.equal(digest(tile),before);assert.equal(JSON.stringify(tile.metadata),metadata);assert.deepEqual(texture.repeat.toArray(),[.5,.5]);assert.deepEqual(texture.offset.toArray(),[.13,.37]);
 const badBefore=digest(tile);assert.throws(()=>tile.setAppearance({materials:{paving:{isMaterial:false}}}),/Expected/);assert.equal(digest(tile),badBefore);track();
 tile.dispose();tile.dispose();for(const n of resources.values())assert.equal(n,1,'Owned resource disposal');assert.equal(borrowedDisposals,0);ownedDisposals+=resources.size;nativeWalls+=counts.wall;nativeSlabs+=counts.slab;triangles+=report.triangles;
 for(let q=0;q<4;q++){const pose=createWaterfrontTile(T,{type,quarterTurns:q,position:[6,4.24,-10]}),actual=new T.Box3().setFromObject(pose.root),b=pose.bounds.clone().applyMatrix4(pose.root.matrixWorld);for(const a of ['min','max'])for(let i=0;i<3;i++)near(actual[a].getComponent(i),b[a].getComponent(i),'Posed bounds');pose.dispose();}
 summaries.push({type,...report});
}
// Native floors, coping and rails really meet across adjacent pieces, including a rotated corner.
const join=new T.Group(),joined=[];
for(const spec of [{type:'quay-outer-corner',position:[0,0,0]},{type:'quay-rail',position:[1,0,0]},{type:'quay-rail',position:[0,0,2],quarterTurns:1}]){const a=createWaterfrontTile(T,spec);join.add(a.root);joined.push(a);}
join.updateMatrixWorld(true);const fixture={root:join};
for(const d of [-.0001,.0001]){
 near(topRole(fixture,1+d,.5,'floor'),2.12,'East floor seam');near(topRole(fixture,1+d,.15,'coping'),2.24,'East cap seam');near(topRole(fixture,1+d,.08,'rail-bar'),3.2,'East rail seam');
 near(topRole(fixture,.5,1+d,'floor'),2.12,'Rotated floor seam');near(topRole(fixture,.15,1+d,'coping'),2.24,'Rotated cap seam');near(topRole(fixture,.08,1+d,'rail-bar'),3.2,'Rotated rail seam');
}
for(const a of joined)a.dispose();
for(const bad of [{position:[.5,0,0]},{position:[0,1,0]},{quarterTurns:.5},{type:'unknown'},{materials:{unknown:materials.facade}}])assert.throws(()=>createWaterfrontTile(T,bad));
for(const m of Object.values(materials))m.dispose();texture.dispose();for(const g of Object.values(originals))g.dispose();
const manifest=JSON.parse(fs.readFileSync('assets/art/horticulture-waterfront/manifest.json')),kit=JSON.parse(fs.readFileSync('assets/art/horticulture-waterfront/kit.json'));
for(const f of [...manifest.runtimeFiles,...manifest.dependencies]){const b=fs.readFileSync(f.path);assert.equal(b.length,f.bytes);assert.equal(sha(b),f.sha256);}
assert.deepEqual(kit.tiles.map(t=>t.type),WATERFRONT_TILES);for(const item of kit.tiles){const a=createWaterfrontTile(T,{type:item.type});assert.deepEqual(item.metadata,JSON.parse(JSON.stringify(a.metadata)));a.dispose();}
if(process.argv.includes('--package')){
 const {createServer}=await import('node:http'),{connect}=await import('node:net'),dist=path.resolve('dist'),prefix='/nested/shoreline/',timer=setTimeout(()=>process.exit(124),30000);timer.unref();
 const server=createServer((request,response)=>{try{const u=new URL(request.url,'http://localhost');if(!u.pathname.startsWith(prefix)){response.writeHead(404).end();return;}const p=path.resolve(dist,decodeURIComponent(u.pathname.slice(prefix.length)));if(!p.startsWith(dist+path.sep)||!fs.existsSync(p)||!fs.statSync(p).isFile()){response.writeHead(404).end();return;}response.setHeader('Content-Type',p.endsWith('.js')?'text/javascript':'application/octet-stream');response.end(fs.readFileSync(p));}catch{response.writeHead(500).end();}});
 await new Promise(r=>server.listen(0,'127.0.0.1',r));const port=server.address().port,creationFiletime=execFileSync('powershell.exe',['-NoProfile','-Command','(Get-Process -Id '+process.pid+').StartTime.ToUniversalTime().ToFileTimeUtc().ToString()'],{encoding:'utf8'}).trim();
 const helper={owner:'01a17ea0-1362-7d13-a42d-f4a5fcff8902',task:'Horticulture waterfront art',pid:process.pid,creationFiletime,executable:process.execPath,port,startedAt:new Date().toISOString(),purpose:'Finite nested-path package verification',intendedExpirySeconds:30,stopMethod:'finally server.close plus same-process30-second deadline'};
 try{
  const packaged=JSON.parse(fs.readFileSync('dist/build-manifest.json'));assert.ok(!packaged.files.some(f=>/^(?:docs|art\/source)\//.test(f.path)));
  for(const f of [...manifest.runtimeFiles,...manifest.dependencies]){const response=await fetch('http://127.0.0.1:'+port+prefix+f.path);assert.equal(response.status,200);assert.equal(sha(Buffer.from(await response.arrayBuffer())),f.sha256);if(f.path.endsWith('.js'))assert.match(response.headers.get('content-type'),/javascript/);}
  const actual=await import(pathToFileURL(path.join(dist,'assets/art/horticulture-waterfront/index.js'))),host=await import(pathToFileURL(path.join(dist,'src/runtime/three.js')));for(const type of WATERFRONT_TILES){const a=actual.createWaterfrontTile(host,{type});assert.ok(a.root instanceof host.Group);a.dispose();}helper.passed=true;
 }finally{await new Promise(r=>server.close(r));server.closeAllConnections();clearTimeout(timer);helper.finishedAt=new Date().toISOString();helper.portReleased=await new Promise(r=>{const s=connect(port,'127.0.0.1');s.once('error',()=>r(true));s.once('connect',()=>{s.destroy();r(false);});});assert.ok(helper.portReleased);fs.mkdirSync('artifacts/horticulture-waterfront',{recursive:true});fs.writeFileSync('artifacts/horticulture-waterfront/package-helper.json',JSON.stringify(helper,null,2)+'\n');}
}
console.log(JSON.stringify({passed:true,preservedFiles:preserved.files.length,tileTypes:WATERFRONT_TILES.length,poses:WATERFRONT_TILES.length*4,nativeWalls,nativeSlabs,vertices,triangles,ownedDisposals,checks:['native arrays / UVs','actual engine panels','floor heights and bounds','real straight / corner joins','empty water notch','12 tread tops and landing','physical metre shader','appearance rollback','borrowed resources unchanged','source and manifest hashes'],tiles:summaries}));
