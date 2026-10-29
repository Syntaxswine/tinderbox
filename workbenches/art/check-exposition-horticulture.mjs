import fs from 'node:fs';
import path from 'node:path';
import assert from 'node:assert/strict';
import {execFileSync} from 'node:child_process';
import {createHash} from 'node:crypto';
import {pathToFileURL} from 'node:url';
import * as T from '../../src/runtime/three.js';
import {ASSET_SCALE as S} from '../../src/content/asset-scale.js';
import {createHorticulturalBuilding,PLAN,APPEARANCE_SLOTS} from '../../assets/art/exposition-horticulture/index.js';
import {createHorticultureTerrace,TERRACE_LAYOUT} from '../../assets/art/exposition-horticulture/terrace.js';
import {BODY,inside} from '../../assets/art/exposition-horticulture/plan.js';
import {wallRunErrors,wallPanels} from '../../vendor/nautilus-engine/90054d07134116a5d9661f8318a76fe68f922aad/packages/map-core/wall-runs.js';
const EPS=7e-5,sha=b=>createHash('sha256').update(b).digest('hex'),near=(a,b,id,t=EPS)=>assert.ok(Math.abs(a-b)<t,id+': '+a+' / '+b);
const preserved=JSON.parse(fs.readFileSync('art/source/exposition-horticulture/preserved-and-engine.json'));
for(const f of preserved.files)assert.equal(execFileSync('git',['hash-object','--path='+f.path,'--',f.path],{encoding:'utf8'}).trim(),f.gitBlob,'Changed earlier delivery: '+f.path);
const engineBytes=fs.readFileSync(preserved.engine.installedPath);assert.equal(sha(engineBytes),preserved.engine.sha256);assert.equal(engineBytes.length,preserved.engine.bytes);
const sources=JSON.parse(fs.readFileSync('art/source/exposition-horticulture/sources.json')),measurements=JSON.parse(fs.readFileSync('art/source/exposition-horticulture/measurements.json'));
for(const f of sources.files){const b=fs.readFileSync(f.path);assert.equal(b.length,f.bytes);assert.equal(sha(b),f.sha256);}
const cal=measurements.planCalibration;near(cal.pixels/(cal.writtenFeet*.3048),cal.pixelsPerMetre,'Plan calibration');
for(const m of measurements.printedMeasurements){near(m.sourceFeet*.3048,m.sourceMetres,m.id+' feet');near(m.authoredMetres-m.sourceMetres,m.differenceMetres,m.id+' adaptation');}
for(const m of measurements.rulerReadings)near(m.pixels/cal.pixelsPerMetre,m.sourceMetres,m.id+' plan pixels');
const assembly=JSON.parse(fs.readFileSync('assets/art/exposition-horticulture/nautilus-assembly.json')),panels=new Map(),runs=new Map(PLAN.runs.map(r=>[r.id,r]));
for(const tier of assembly.tiers){assert.deepEqual(wallRunErrors(tier.map),[]);assert.equal(tier.map.levels,6);for(const run of tier.map.wallRuns.segments)for(const p of wallPanels(run)){
 assert.ok(!panels.has(p.id));panels.set(p.id,{...p,runId:run.id.replace(/-tier-\d+$/,''),level:p.z+tier.levelOffset,center:p.center.map((v,i)=>v+tier.translation[i])});
}}
for(const r of PLAN.runs){near(Math.hypot(r.b[0]-r.a[0],r.b[1]-r.a[1]),Math.round(r.length/2)*2,r.id+' even-metre run');assert.ok(r.length<=64);}
function each(view,fn){view.root.updateMatrixWorld(true);const instance=new T.Matrix4();view.root.traverse(o=>{if(!o.isMesh)return;for(let i=0;i<(o.isInstancedMesh?o.count:1);i++){
 const m=o.matrixWorld.clone();if(o.isInstancedMesh){o.getMatrixAt(i,instance);m.multiply(instance);}const d=o.isInstancedMesh?o.userData.parts[i]:o.userData;
 if(d.form==='boundary-slab-assembly')for(const part of d.parts)fn(o,part,m,part.start,part.count);else fn(o,d,m,0,o.geometry.index?.count||o.geometry.attributes.position.count);
}});}
function digest(view){const h=createHash('sha256');view.root.updateMatrixWorld(true);view.root.traverse(o=>{if(!o.isMesh)return;h.update(o.name);h.update(JSON.stringify(o.matrix.elements));if(o.isInstancedMesh)h.update(Buffer.from(o.instanceMatrix.array.buffer));for(const a of Object.values(o.geometry.attributes))h.update(Buffer.from(a.array.buffer));});return h.digest('hex');}
function track(view,disposals){view.root.traverse(o=>{if(!o.isMesh)return;for(const resource of [o.geometry,o.material,...(o.isInstancedMesh?[o]:[])])if(!disposals.has(resource)){disposals.set(resource,0);resource.addEventListener('dispose',()=>disposals.set(resource,disposals.get(resource)+1));}});}
const originals={wall:new T.BoxGeometry(1,2,.16),door:new T.BoxGeometry(1,1.65,.12),slab:new T.BoxGeometry(1,.12,1)};
function nativeGeometry(g,kind,id){for(const a of ['position','normal','uv'])assert.deepEqual(g.attributes[a].array,originals[kind].attributes[a].array,id+' native '+a);assert.deepEqual(g.index.array,originals[kind].index.array);}
const model=createHorticulturalBuilding(T),report=model.diagnostics(),metadata=JSON.stringify(model.metadata),disposals=new Map(),seen=new Set(),floorAreas=new Map(),coverage=new Map(),native={walls:0,doors:0,slabs:0};track(model,disposals);
assert.deepEqual(model.metadata.nativeContract,S);assert.equal(report.enginePanels,panels.size);assert.equal(model.metadata.nautilus.compiler,'Nautilus wallPanels / wallRunErrors');
let vertices=0,wallCount=0,closureCount=0,treads=0;
each(model,(o,d,m,start,count)=>{
 const id=d.componentId||d.id;assert.ok(id&&!seen.has(id),'Duplicate component '+id);seen.add(id);const g=o.geometry,p=g.attributes.position,index=g.index,worldBox=new T.Box3();new T.Vector3().setFromMatrixScale(m).toArray().forEach(v=>near(v,1,id+' scale'));assert.ok(APPEARANCE_SLOTS.includes(d.appearanceSlot),id+' unowned appearance');
 for(let j=start;j<start+count;j++){const v=new T.Vector3().fromBufferAttribute(p,index?index.getX(j):j).applyMatrix4(m);assert.ok(Number.isFinite(v.x)&&Number.isFinite(v.y)&&Number.isFinite(v.z));assert.ok(model.bounds.clone().expandByScalar(EPS).containsPoint(v),id+' bounds');worldBox.expandByPoint(v);vertices++;}
 if(['native-wall','native-door','native-slab'].includes(d.form)){const kind=d.form.slice(7);native[kind==='wall'?'walls':kind==='door'?'doors':'slabs']++;nativeGeometry(g,kind,id);}
 if(['structural-wall','perimeter-closure'].includes(d.role)){
  const panel=panels.get(d.panelId);assert.ok(panel,'Missing actual source panel '+d.panelId);const base=panel.level*S.floorSpacing,size=g.boundingBox.getSize(new T.Vector3()),centre=new T.Vector3().setFromMatrixPosition(m);near(size.x,1,id+' width');near(size.z,.16,id+' thickness');near(centre.x,panel.center[0],id+' native X');near(centre.z,panel.center[2],id+' native Z');assert.equal(d.level,panel.level);assert.equal(d.enginePin,preserved.engine.commit);assert.equal(d.engineSource,'wallPanels');
  if(d.role==='structural-wall'){wallCount++;assert.ok(worldBox.min.y>=base-EPS&&worldBox.max.y<=base+2+EPS);}else{closureCount++;assert.ok(worldBox.min.y>=base+2-EPS&&worldBox.max.y<=base+2.12+EPS);}
  const key=d.panelId+'/'+d.role;coverage.set(key,(coverage.get(key)||0)+size.y);
 }
 if(d.role==='floor'){
  const floor=PLAN.floors.find(f=>f.id===d.floorId);assert.ok(floor);assert.equal(d.level,floor.level);near(worldBox.max.y,floor.level*S.floorSpacing,id+' floor top');near(worldBox.max.y-worldBox.min.y,.12,id+' floor thickness');let area=0;
  for(let j=start;j<start+count;j+=3){const pts=[0,1,2].map(n=>new T.Vector3().fromBufferAttribute(p,index?index.getX(j+n):j+n).applyMatrix4(m)),normal=new T.Vector3().subVectors(pts[1],pts[0]).cross(new T.Vector3().subVectors(pts[2],pts[0]));if(normal.y>EPS)area+=normal.y/2;}
  floorAreas.set(floor.id,(floorAreas.get(floor.id)||0)+area);if(d.form==='native-slab'){near(area,1,id+' full area');[worldBox.min.x,worldBox.max.x,worldBox.min.z,worldBox.max.z].forEach(v=>near(v,Math.round(v),id+' cell edge'));}else near(area,d.area,id+' clipped area',.0006);
 }
 if(d.role==='stair-tread'&&d.step!==undefined){treads++;near(worldBox.max.y,d.top,id+' tread top');}
 if(d.role==='cupola-roof'){const n=g.attributes.normal;for(let j=0;j<p.count;j+=3){const a=new T.Vector3().fromBufferAttribute(p,j),nn=new T.Vector3().fromBufferAttribute(n,j);assert.ok(a.dot(nn)>-.001,'Cupola face points inward');}}
 if(d.appearanceSlot==='glazing'){assert.ok(o.material.transparent);assert.equal(o.material.depthWrite,false);assert.equal(o.castShadow,false);near(o.material.opacity,.34,id+' glass opacity');}
});
assert.equal(native.walls,report.nativeWalls);assert.equal(native.doors,2);assert.equal(treads,72);assert.equal(wallCount,model.metadata.structuralPieces.length);assert.equal(closureCount,model.metadata.seamPieces.length);
// Independently conserve native panel opaque coverage against the union of openings.
for(const p of panels.values()){
 const r=runs.get(p.runId),ux=(r.b[0]-r.a[0])/r.length,uz=(r.b[1]-r.a[1])/r.length,x=(p.center[0]-(r.a[0]+r.b[0])/2)*ux+(p.center[2]-(r.a[1]+r.b[1])/2)*uz;
 for(const seam of [false,true]){const lo=p.level*S.floorSpacing+(seam?2:0),hi=lo+(seam?.12:2),intervals=r.openings.filter(h=>x>h.x-h.width/2+EPS&&x<h.x+h.width/2-EPS).map(h=>[Math.max(lo,h.bottom),Math.min(hi,h.bottom+h.height)]).filter(([a,b])=>b>a).sort((a,b)=>a[0]-b[0]);let end=lo,removed=0;for(const [a,b]of intervals){removed+=Math.max(0,b-Math.max(a,end));end=Math.max(end,b);}near(coverage.get(p.id+'/'+(seam?'perimeter-closure':'structural-wall'))||0,hi-lo-removed,p.id+' complete native coverage');}
}
const polyArea=poly=>Math.abs(poly.reduce((v,p,i)=>{const q=poly[(i+1)%poly.length];return v+p[0]*q[1]-q[0]*p[1];},0)/2);
for(const floor of PLAN.floors){const expected=floor.polygons.reduce((v,p)=>v+polyArea(p),0)-floor.holes.reduce((v,p)=>v+polyArea(p),0);near(floorAreas.get(floor.id),expected,floor.id+' independent area',.012);}
near(floorAreas.get('first-floor'),22032,'First floor');near(floorAreas.get('pavilion-galleries'),4288,'Open end galleries');near(model.bounds.max.y,33.92,'Crown');
const hitData=h=>h.object.isInstancedMesh?h.object.userData.parts[h.instanceId]:h.object.userData,hits=(point,direction,far)=>new T.Raycaster(new T.Vector3(...point),new T.Vector3(...direction),0,far).intersectObject(model.root,true);
assert.equal(hits([.2,2.5,36.2],[0,1,0],40).filter(h=>hitData(h).role==='floor').length,0,'Hidden floor crosses dome centre');
assert.ok(hits([.25,2.9,-.5],[0,0,1],1).some(h=>hitData(h).form==='native-door'),'Closed native entrance missing');
for(const stair of model.metadata.stairs){near(stair.fromY,2.12,'Stair lower landing');near(stair.toY,6.36,'Stair upper landing');near(stair.rise,4.24/24,'Stair rise');const p=[stair.x,6.41,stair.z+8-1/6];assert.ok(hits(p,[0,-1,0],.1).some(h=>hitData(h).role==='stair-tread'),'Missing final tread');assert.ok(hits([stair.x,6.41,stair.z+8+.2],[0,-1,0],.1).some(h=>hitData(h).role==='floor'),'Missing top landing');assert.equal(hits([stair.x,6.41,stair.z+2],[0,-1,0],.1).filter(h=>hitData(h).role==='floor').length,0,'Upper slab covers stair hole');if(Math.abs(stair.x)>100)assert.equal(hits([stair.x,6.41,60],[0,-1,0],.1).filter(h=>hitData(h).role==='floor').length,0,'End gallery well sealed');}
const r=PLAN.runs.find(r=>r.id==='outer-0-piece-0'),h=r.openings[0],ux=(r.b[0]-r.a[0])/r.length,uz=(r.b[1]-r.a[1])/r.length,out=[uz,0,-ux],centre=[(r.a[0]+r.b[0])/2+ux*(h.x+.2),3.1,(r.a[1]+r.b[1])/2+uz*(h.x+.2)],sash=hits(centre.map((v,i)=>v+out[i]),out.map(v=>-v),1.5);
assert.ok(sash.some(h=>hitData(h).role==='window-glass'));assert.ok(!sash.some(h=>hitData(h).role==='structural-wall'),'Opaque backing behind window');
for(const sign of [-1,1]){const angle=Math.PI/24,phi=4.5*Math.PI/24,p=[sign*20+11.3*Math.cos(phi)*Math.cos(angle),10.6+4.24*Math.sin(phi),12+11.3*Math.cos(phi)*Math.sin(angle)],normal=new T.Vector3((p[0]-sign*20)/11.3**2,(p[1]-10.6)/4.24**2,(p[2]-12)/11.3**2).normalize().toArray(),vent=hits(p.map((v,i)=>v+normal[i]*.4),normal.map(v=>-v),.8);assert.ok(vent.some(h=>hitData(h).role==='cupola-vent'),'Cupola vent missing');assert.ok(!vent.some(h=>hitData(h).role==='cupola-roof'),'Opaque roof covers vent');}
// Independent eave samples guard against missing upper gallery enclosure.
for(const sign of [-1,1]){
 assert.ok(hits([sign*135,7.3,89],[0,0,-1],2).some(h=>hitData(h).role==='structural-wall'),'Rear end-pavilion upper band missing');
 assert.ok(hits([sign*116,7.3,60],[sign,0,0],2).some(h=>hitData(h).role==='structural-wall'),'Inner end-pavilion upper band missing');
 assert.ok(hits([sign*135,8.42,89],[0,0,-1],2).some(h=>hitData(h).role==='perimeter-closure'),'Eave seam left open');
}
const map=new T.Texture();map.repeat.set(.5,.5);map.offset.set(.17,.33);const borrowed=new T.MeshStandardMaterial({color:0xbbaa99,map});let borrowedDisposals=0;for(const v of [map,borrowed])v.addEventListener('dispose',()=>borrowedDisposals++);
const before=digest(model);model.setAppearance({materials:{facade:borrowed},textures:{roof:map}});track(model,disposals);assert.equal(digest(model),before);assert.equal(JSON.stringify(model.metadata),metadata);assert.deepEqual(map.repeat.toArray(),[.5,.5]);assert.deepEqual(map.offset.toArray(),[.17,.33]);assert.equal(borrowedDisposals,0);
const shader={vertexShader:'#include <uv_vertex>'};model.root.traverse(o=>{if(o.isMesh&&o.userData.appearanceSlot==='facade')o.material.onBeforeCompile(shader);});assert.match(shader.vertexShader,/attribute vec2 grossUV;\n/);assert.ok(!shader.vertexShader.includes('\\n'));
const priorMat=new Map();model.root.traverse(o=>{if(o.isMesh)priorMat.set(o,o.material);});assert.throws(()=>model.setAppearance({materials:{trim:borrowed},textures:{roof:{}}}),/Expected Three texture/);for(const [o,m]of priorMat)assert.equal(o.material,m,'Partial reskin on invalid input');assert.throws(()=>model.setAppearance({materials:{bad:borrowed}}),/Unknown/);
for(let q=0;q<4;q++){const a=createHorticulturalBuilding(T,{quarterTurns:q,position:[18,4.24,-60]}),actual=new T.Box3().setFromObject(a.root),expected=a.bounds.clone().applyMatrix4(a.root.matrixWorld);for(const k of ['min','max'])for(let j=0;j<3;j++)near(actual[k].getComponent(j),expected[k].getComponent(j),'Building quarter-turn bounds');a.dispose();a.dispose();assert.equal(a.diagnostics().materials,0);assert.equal(a.diagnostics().geometries,0);}
const staticMetadata=JSON.parse(fs.readFileSync('assets/art/exposition-horticulture/metadata.json'));assert.equal(staticMetadata.compiledStructure.sha256,sha(Buffer.from(JSON.stringify({structuralPieces:model.metadata.structuralPieces,seamPieces:model.metadata.seamPieces,floorTiles:model.metadata.floorTiles}))));
model.dispose();model.dispose();for(const n of disposals.values())assert.equal(n,1,'Owned building resource disposed once');
const terrace=createHorticultureTerrace(T),terraceReport=terrace.diagnostics(),terraceDisposals=new Map(),cells=new Set();track(terrace,terraceDisposals);assert.equal(terraceReport.nativeSlabs,10404);assert.ok(terraceReport.drawMeshes<60);assert.equal(TERRACE_LAYOUT.length,10403);
each(terrace,(o,d,m)=>{new T.Vector3().setFromMatrixScale(m).toArray().forEach(v=>near(v,1,'Terrace stretch'));assert.ok(d.componentId.startsWith('terrace/'));if(d.form==='native-wall')nativeGeometry(o.geometry,'wall',d.componentId);if(d.form!=='native-slab')return;nativeGeometry(o.geometry,'slab',d.componentId);const b=o.geometry.boundingBox.clone().applyMatrix4(m),x=Math.round(b.min.x),z=Math.round(b.min.z),key=x+','+z;near(b.max.y,2.12,'Terrace deck level');near(b.min.x,x,'Terrace metre X');near(b.min.z,z,'Terrace metre Z');assert.ok(!cells.has(key),'Overlapping terrace cell '+key);cells.add(key);assert.ok(x>=-153&&x<153&&z>=-18&&z<24);assert.ok(z<0||!inside(x+.5,z+.5,BODY),'Approach overlaps first floor');});
assert.equal(cells.size,10404);for(let x=-153;x<153;x++)for(let z=-18;z<24;z++)assert.equal(cells.has(x+','+z),z<0||!inside(x+.5,z+.5,BODY),'Terrace/apron gap '+x+','+z);
const terraceDigest=digest(terrace);terrace.setAppearance({materials:{facade:borrowed},textures:{paving:map}});track(terrace,terraceDisposals);assert.equal(digest(terrace),terraceDigest);const terraceMats=new Map();terrace.root.traverse(o=>{if(o.isMesh)terraceMats.set(o,o.material);});assert.throws(()=>terrace.setAppearance({materials:{coping:borrowed},textures:{paving:{}}}),/Expected Three texture/);for(const [o,m]of terraceMats)assert.equal(o.material,m);
for(let q=0;q<4;q++){const a=createHorticultureTerrace(T,{quarterTurns:q,position:[18,4.24,-60]}),actual=new T.Box3().setFromObject(a.root),expected=a.bounds.clone().applyMatrix4(a.root.matrixWorld);for(const k of ['min','max'])for(let j=0;j<3;j++)near(actual[k].getComponent(j),expected[k].getComponent(j),'Terrace quarter-turn bounds');a.dispose();a.dispose();assert.equal(a.root.children.length,0);}
terrace.dispose();terrace.dispose();for(const n of terraceDisposals.values())assert.equal(n,1,'Owned terrace resource disposed once');assert.equal(borrowedDisposals,0);borrowed.dispose();map.dispose();for(const g of Object.values(originals))g.dispose();
for(const factory of [createHorticulturalBuilding,createHorticultureTerrace]){for(const position of [[.5,0,0],[0,1,0],[0,0,.25]])assert.throws(()=>factory(T,{position}),/Native tile placement/);assert.throws(()=>factory(T,{quarterTurns:.5}),/quarterTurns/);}
const manifest=JSON.parse(fs.readFileSync('assets/art/exposition-horticulture/manifest.json'));for(const f of [...manifest.runtimeFiles,...manifest.dependencies,...manifest.previewResources]){const b=fs.readFileSync(f.path);assert.equal(b.length,f.bytes);assert.equal(sha(b),f.sha256,f.path+' hash');}
if(process.argv.includes('--package')){
 const {createServer}=await import('node:http'),{connect}=await import('node:net'),dist=path.resolve('dist'),prefix='/nested/review/tinderbox/',timer=setTimeout(()=>process.exit(124),30000);timer.unref();
 const server=createServer((request,response)=>{try{const pathname=new URL(request.url,'http://localhost').pathname;if(!pathname.startsWith(prefix)){response.writeHead(404).end();return;}const target=path.resolve(dist,decodeURIComponent(pathname.slice(prefix.length)));if(!target.startsWith(dist+path.sep)||!fs.existsSync(target)){response.writeHead(404).end();return;}response.setHeader('Content-Type',target.endsWith('.js')?'text/javascript':'application/octet-stream');response.end(fs.readFileSync(target));}catch{response.writeHead(500).end();}});
 await new Promise(resolve=>server.listen(0,'127.0.0.1',resolve));const port=server.address().port,creationFiletime=execFileSync('powershell.exe',['-NoProfile','-Command','(Get-Process -Id '+process.pid+').StartTime.ToUniversalTime().ToFileTimeUtc()'],{encoding:'utf8'}).trim(),helper={owner:'01a17ea0-1362-7d13-a42d-f4a5fcff8902',task:'Horticultural Building art',pid:process.pid,creationFiletime,executable:process.execPath,startedAt:new Date().toISOString(),purpose:'Private nested-path package check',port,intendedExpirySeconds:30,stopMethod:'finally server.close; actual same-process30-second deadline'};
 try{
  assert.ok(!JSON.parse(fs.readFileSync('dist/build-manifest.json')).files.some(f=>/^(?:docs|art\/source)\//.test(f.path)||f.path.endsWith('.pdf')),'Research escaped into runtime');
  for(const f of [...manifest.runtimeFiles,...manifest.dependencies,...manifest.previewResources,{path:'assets/art/exposition-horticulture/manifest.json',sha256:sha(fs.readFileSync('assets/art/exposition-horticulture/manifest.json'))}]){const response=await fetch('http://127.0.0.1:'+port+prefix+f.path);assert.equal(response.status,200);if(f.path.endsWith('.js'))assert.match(response.headers.get('content-type'),/javascript/);assert.equal(sha(Buffer.from(await response.arrayBuffer())),f.sha256);}
  const imported=await import(pathToFileURL(path.join(dist,'assets/art/exposition-horticulture/index.js'))),companion=await import(pathToFileURL(path.join(dist,'assets/art/exposition-horticulture/terrace.js'))),host=await import(pathToFileURL(path.join(dist,'src/runtime/three.js'))),a=imported.createHorticulturalBuilding(host),b=companion.createHorticultureTerrace(host);assert.ok(a.root instanceof host.Group);assert.equal(a.diagnostics().nativeDoors,2);assert.equal(b.diagnostics().nativeSlabs,10404);a.dispose();b.dispose();helper.passed=true;
 }finally{await new Promise(resolve=>server.close(resolve));server.closeAllConnections();clearTimeout(timer);helper.finishedAt=new Date().toISOString();helper.released=await new Promise(resolve=>{const socket=connect(port,'127.0.0.1');socket.once('error',()=>resolve(true));socket.once('connect',()=>{socket.destroy();resolve(false);});});assert.ok(helper.released);fs.mkdirSync('artifacts/exposition-horticulture',{recursive:true});fs.writeFileSync('artifacts/exposition-horticulture/package-helper.json',JSON.stringify(helper,null,2)+'\n');}
}
const result={passed:true,preservedFiles:preserved.files.length,enginePanels:panels.size,native,wallFragments:wallCount,closureFragments:closureCount,boundedVertices:vertices,stairTreads:treads,floorAreas:Object.fromEntries(floorAreas),building:report,terrace:terraceReport,poses:4,packageChecked:process.argv.includes('--package')};
fs.mkdirSync('artifacts/exposition-horticulture',{recursive:true});fs.writeFileSync('artifacts/exposition-horticulture/check-results.json',JSON.stringify(result,null,2)+'\n');console.log('PASS Horticulture: '+JSON.stringify(result));
