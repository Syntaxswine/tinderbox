import fs from 'node:fs';
import path from 'node:path';
import assert from 'node:assert/strict';
import {execFileSync} from 'node:child_process';
import {createHash} from 'node:crypto';
import {pathToFileURL} from 'node:url';
import * as T from '../../src/runtime/three.js';
import {ASSET_SCALE as S} from '../../src/content/asset-scale.js';
import {createAdministrationBuilding,PLAN,APPEARANCE_SLOTS} from '../../assets/art/exposition-administration/index.js';
import {WALL_KIT,wallRunErrors,wallPanels} from '../../vendor/nautilus-engine/90054d07134116a5d9661f8318a76fe68f922aad/packages/map-core/wall-runs.js';
const EPS=7e-5,sha=b=>createHash('sha256').update(b).digest('hex'),near=(a,b,id,tolerance=EPS)=>assert.ok(Math.abs(a-b)<tolerance,id+': '+a+' / '+b);
const preserved=JSON.parse(fs.readFileSync('art/source/exposition-administration/preserved-and-engine.json'));
for(const f of preserved.files)assert.equal(execFileSync('git',['hash-object','--path='+f.path,'--',f.path],{encoding:'utf8'}).trim(),f.gitBlob,'Preserved file changed: '+f.path);
const nativeBytes=fs.readFileSync(preserved.engine.installedPath);assert.equal(sha(nativeBytes),preserved.engine.sha256);assert.equal(nativeBytes.length,preserved.engine.bytes);
const source=JSON.parse(fs.readFileSync('art/source/exposition-administration/sources.json')),measurements=JSON.parse(fs.readFileSync('art/source/exposition-administration/measurements.json'));
for(const f of source.files){const bytes=fs.readFileSync(f.path);assert.equal(bytes.length,f.bytes);assert.equal(sha(bytes),f.sha256);}
const calibration=measurements.planCalibration;near((calibration.points[1][0]-calibration.points[0][0])/calibration.value,calibration.pixelsPerMetre,'Metre ruler');near(calibration.independentCheck.pixelsPerMetre,calibration.pixelsPerMetre,'Independent ruler span',.04);
for(const m of measurements.printedMeasurements){near(m.sourceFeet*.3048,m.sourceMetres,m.id+' feet');near(m.authoredMetres-m.sourceMetres,m.differenceMetres,m.id+' adaptation');}
for(const m of measurements.rulerReadings)near(m.pixels/calibration.pixelsPerMetre,m.sourceMetres,m.id+' ruler conversion');
const tiers=JSON.parse(fs.readFileSync('assets/art/exposition-administration/nautilus-assembly.json')),panels=new Map(),runs=new Map(PLAN.runs.map(r=>[r.id,r]));
for(const tier of tiers.tiers){
 assert.deepEqual(wallRunErrors(tier.map),[]);assert.equal(tier.map.levels,6);near(tier.translation[1],tier.levelOffset*S.floorSpacing,'Tier elevation');
 for(const run of tier.map.wallRuns.segments){assert.ok(run.stories<=WALL_KIT.maxStories);for(const p of wallPanels(run)){assert.ok(!panels.has(p.id));panels.set(p.id,{...p,level:p.z+tier.levelOffset,center:p.center.map((v,i)=>v+tier.translation[i])});}}
}
for(const r of PLAN.runs){near(Math.hypot(r.b[0]-r.a[0],r.b[1]-r.a[1]),Math.round(r.length/2)*2,r.id+' even-metre run');assert.ok(r.length<=64);}
const mapTexture=new T.Texture();mapTexture.repeat.set(.5,.5);mapTexture.offset.set(.17,.33);let borrowedDisposals=0;mapTexture.addEventListener('dispose',()=>borrowedDisposals++);
const materials=Object.fromEntries(APPEARANCE_SLOTS.map(s=>[s,new T.MeshStandardMaterial({color:0xbbaa99,map:mapTexture})]));for(const m of Object.values(materials))m.addEventListener('dispose',()=>borrowedDisposals++);
const model=createAdministrationBuilding(T,{materials}),report=model.diagnostics(),metadata=JSON.stringify(model.metadata),disposals=new Map(),seen=new Set(),floorAreas=new Map(),coverage=new Map(),native={walls:0,doors:0,slabs:0};
assert.deepEqual(model.metadata.nativeContract,S);assert.equal(report.enginePanels,panels.size);assert.equal(model.metadata.nautilus.compiler,'Nautilus wallPanels / wallRunErrors');
function track(){model.root.traverse(o=>{if(!o.isMesh)return;for(const v of [o.geometry,o.material,...(o.isInstancedMesh?[o]:[])])if(!disposals.has(v)){disposals.set(v,0);v.addEventListener('dispose',()=>disposals.set(v,disposals.get(v)+1));}});}
function each(view,fn){view.root.updateMatrixWorld(true);const instance=new T.Matrix4();view.root.traverse(o=>{if(!o.isMesh)return;for(let i=0;i<(o.isInstancedMesh?o.count:1);i++){const m=o.matrixWorld.clone();if(o.isInstancedMesh){o.getMatrixAt(i,instance);m.multiply(instance);}const data=o.isInstancedMesh?o.userData.parts[i]:o.userData;if(data.form==='boundary-slab-assembly')for(const part of data.parts)fn(o,part,m,part.start,part.count);else fn(o,data,m,0,o.geometry.index?.count||o.geometry.attributes.position.count);}});}
function digest(view){const h=createHash('sha256');view.root.updateMatrixWorld(true);view.root.traverse(o=>{if(!o.isMesh)return;h.update(o.name);h.update(JSON.stringify(o.matrix.elements));if(o.isInstancedMesh)h.update(Buffer.from(o.instanceMatrix.array.buffer));for(const a of Object.values(o.geometry.attributes))h.update(Buffer.from(a.array.buffer));});return h.digest('hex');}
const originals={wall:new T.BoxGeometry(1,2,.16),door:new T.BoxGeometry(1,1.65,.12),slab:new T.BoxGeometry(1,.12,1)};
let vertices=0,closureCount=0,wallCount=0,treads=0;
track();each(model,(o,d,m,start,count)=>{
 const id=d.componentId||d.id;assert.ok(id&&!seen.has(id),'Duplicate source component: '+id);seen.add(id);const g=o.geometry,p=g.attributes.position,index=g.index,worldBox=new T.Box3(),scale=new T.Vector3().setFromMatrixScale(m);scale.toArray().forEach(v=>near(v,1,id+' scaled'));
 for(let j=start;j<start+count;j++){const k=index?index.getX(j):j,v=new T.Vector3().fromBufferAttribute(p,k).applyMatrix4(m);assert.ok(v.toArray().every(Number.isFinite));assert.ok(model.bounds.clone().expandByScalar(EPS).containsPoint(v),id+' outside bounds');worldBox.expandByPoint(v);vertices++;}
 if(['native-wall','native-door','native-slab'].includes(d.form)){
  const type=d.form.slice(7),key=type==='wall'?'walls':type==='door'?'doors':'slabs',expected=originals[type];native[key]++;
  for(const a of ['position','normal','uv'])assert.deepEqual(g.attributes[a].array,expected.attributes[a].array,id+' native '+a);assert.deepEqual(g.index.array,expected.index.array);
 }
 if(d.role==='structural-wall'||d.role==='perimeter-closure'){
  const panel=panels.get(d.panelId);assert.ok(panel,'Missing actual Nautilus panel '+d.panelId);const r=runs.get(d.runId),base=panel.level*S.floorSpacing,size=g.boundingBox.getSize(new T.Vector3());near(size.x,1,id+' width');near(size.z,S.wallThickness,id+' thickness');
  const centre=new T.Vector3().setFromMatrixPosition(m);near(centre.x,panel.center[0],id+' native X');near(centre.z,panel.center[2],id+' native Z');
  assert.equal(d.level,panel.level);assert.equal(d.enginePin,tiers.enginePin);assert.equal(d.engineSource,'wallPanels');
  if(d.role==='structural-wall'){wallCount++;assert.ok(worldBox.min.y>=base-EPS&&worldBox.max.y<=base+2+EPS);}
  else{closureCount++;assert.ok(worldBox.min.y>=base+2-EPS&&worldBox.max.y<=base+2.12+EPS);}
  const key=d.panelId+'/'+d.role;if(!coverage.has(key))coverage.set(key,0);coverage.set(key,coverage.get(key)+size.y);
 }
 if(d.role==='floor'){
  const floor=PLAN.floors.find(f=>f.id===d.floorId);assert.ok(floor);assert.equal(d.level,floor.level);near(worldBox.max.y,floor.level*S.floorSpacing,id+' floor top');near(worldBox.max.y-worldBox.min.y,.12,id+' thickness');
  let area=0;for(let j=start;j<start+count;j+=3){const pts=[0,1,2].map(n=>new T.Vector3().fromBufferAttribute(p,index?index.getX(j+n):j+n).applyMatrix4(m)),normal=new T.Vector3().subVectors(pts[1],pts[0]).cross(new T.Vector3().subVectors(pts[2],pts[0]));if(normal.y>EPS)area+=normal.y/2;}
  if(!floorAreas.has(floor.id))floorAreas.set(floor.id,0);floorAreas.set(floor.id,floorAreas.get(floor.id)+area);
  if(d.form==='native-slab'){near(area,1,id+' native area');[worldBox.min.x,worldBox.max.x,worldBox.min.z,worldBox.max.z].forEach(v=>near(v,Math.round(v),id+' metre edge'));}else near(area,d.area,id+' cut-cell area',.0006);
 }
 if(d.role==='stair-tread'&&d.step!==undefined){treads++;near(worldBox.max.y,d.top,id+' tread elevation');}
});
assert.equal(native.walls,report.nativeWalls);assert.equal(native.doors,8);assert.equal(treads,288);assert.equal(wallCount,model.metadata.structuralPieces.length);assert.equal(closureCount,model.metadata.seamPieces.length);
// Independently conserve opaque height against native source panels and openings.
for(const panel of panels.values()){
 const rid=panel.id.replace(/-tier-\d+:\d+:.*$/,''),r=runs.get(rid);assert.ok(r,rid);const ux=(r.b[0]-r.a[0])/r.length,uz=(r.b[1]-r.a[1])/r.length,x=(panel.center[0]-(r.a[0]+r.b[0])/2)*ux+(panel.center[2]-(r.a[1]+r.b[1])/2)*uz;
 for(const closure of [false,true]){const lo=panel.level*S.floorSpacing+(closure?2:0),hi=lo+(closure?.12:2),intervals=r.openings.filter(h=>x>h.x-h.width/2+EPS&&x<h.x+h.width/2-EPS).map(h=>[Math.max(lo,h.bottom),Math.min(hi,h.bottom+h.height)]).filter(([a,b])=>b>a).sort((a,b)=>a[0]-b[0]);let end=lo,removed=0;for(const [a,b]of intervals){removed+=Math.max(0,b-Math.max(a,end));end=Math.max(end,b);}near(coverage.get(panel.id+'/'+(closure?'perimeter-closure':'structural-wall'))||0,hi-lo-removed,panel.id+' complete coverage');}
}
const polyArea=poly=>Math.abs(poly.reduce((v,p,i)=>{const q=poly[(i+1)%poly.length];return v+p[0]*q[1]-q[0]*p[1];},0)/2);
// Independent scan integration of a convex hole clipped to an axis-aligned room.
function rectIntersection(rect,hole){const xs=rect.map(p=>p[0]),zs=rect.map(p=>p[1]),lo=Math.min(...xs),hi=Math.max(...xs),bottom=Math.min(...zs),top=Math.max(...zs),cuts=[lo,hi,...hole.map(p=>p[0]).filter(x=>x>lo&&x<hi)];
 for(let i=0;i<hole.length;i++){const a=hole[i],b=hole[(i+1)%hole.length];for(const y of [bottom,top])if((a[1]<y&&b[1]>y)||(b[1]<y&&a[1]>y)){const x=a[0]+(y-a[1])*(b[0]-a[0])/(b[1]-a[1]);if(x>lo&&x<hi)cuts.push(x);}}
 const xx=[...new Set(cuts)].sort((a,b)=>a-b),height=x=>{const yy=[];for(let i=0;i<hole.length;i++){const a=hole[i],b=hole[(i+1)%hole.length];if(Math.abs(a[0]-b[0])>1e-10&&x>=Math.min(a[0],b[0])-1e-10&&x<=Math.max(a[0],b[0])+1e-10)yy.push(a[1]+(x-a[0])*(b[1]-a[1])/(b[0]-a[0]));}return yy.length?Math.max(0,Math.min(top,Math.max(...yy))-Math.max(bottom,Math.min(...yy))):0;};let area=0;for(let i=1;i<xx.length;i++)area+=(xx[i]-xx[i-1])*(height(xx[i-1])+height(xx[i]))/2;return area;}
for(const floor of PLAN.floors){let expected=floor.polygons.reduce((v,p)=>v+polyArea(p),0);if([3,5,7].includes(floor.level))for(const p of floor.polygons)for(const hole of floor.holes)expected-=rectIntersection(p,hole);else expected-=floor.holes.reduce((v,p)=>v+polyArea(p),0);near(floorAreas.get(floor.id),expected,floor.id+' independent floor coverage',.012);}
assert.equal(model.metadata.plan.rooms.length,13);assert.equal(model.metadata.stairs.length,4);assert.deepEqual(model.metadata.floors.map(f=>f.level),[1,3,5,7,9,19,23]);near(model.bounds.max.y,76.32,'Crown');
const hitData=h=>h.object.isInstancedMesh?h.object.userData.parts[h.instanceId]:h.object.userData,hits=(p,d,far)=>new T.Raycaster(new T.Vector3(...p),new T.Vector3(...d),0,far).intersectObject(model.root,true);
assert.ok(hits([.25,3,5.25],[0,-1,0],2).some(h=>hitData(h).role==='floor'&&Math.abs(h.point.y-2.12)<EPS),'Recess landing disconnected');
assert.equal(hits([.2,2.5,40.2],[0,1,0],70).filter(h=>hitData(h).role==='floor').length,0,'A hidden floor seals the rotunda');
assert.ok(hits([.5,2.7,9],[0,0,1],2).some(h=>hitData(h).form==='native-door'),'Closed entry missing');
const sashHits=hits([-32.7,9,-.5],[0,0,1],1);assert.ok(sashHits.some(h=>hitData(h).appearanceSlot==='glazing'),'Sash sample misses glass');assert.ok(!sashHits.some(h=>hitData(h).role==='structural-wall'),'Opaque wall behind facade sash');
for(const stair of model.metadata.stairs){assert.deepEqual(stair.landingLevels,[1,3,5,7]);near(stair.rise,S.floorSpacing/12,'Native stair rise');for(const level of [3,5,7]){
 const spec=PLAN.stairs.find(p=>p.id===stair.id),angle=spec.heading-Math.PI/24,point=[spec.x+3.2*Math.cos(angle),level*S.floorSpacing+.05,spec.z+3.2*Math.sin(angle)];assert.ok(hits(point,[0,-1,0],.1).some(h=>hitData(h).role==='stair-tread'),'Stair endpoint is not on level '+level);
 const landing=[spec.x+3.65*Math.cos(angle),level*S.floorSpacing+.05,spec.z+3.65*Math.sin(angle)];assert.ok(hits(landing,[0,-1,0],.1).some(h=>hitData(h).role==='floor'),'Missing pavilion landing '+stair.id+'/'+level);
 }}
const before=digest(model);model.setAppearance({materials:{facade:materials.trim},textures:{dome:mapTexture}});track();assert.equal(digest(model),before);assert.equal(JSON.stringify(model.metadata),metadata);assert.deepEqual(mapTexture.repeat.toArray(),[.5,.5]);assert.deepEqual(mapTexture.offset.toArray(),[.17,.33]);assert.equal(borrowedDisposals,0);assert.throws(()=>model.setAppearance({materials:{bad:materials.trim}}),/Unknown/);
for(let quarterTurns=0;quarterTurns<4;quarterTurns++){const view=createAdministrationBuilding(T,{quarterTurns,position:[18,4.24,-60]}),actual=new T.Box3().setFromObject(view.root),expected=view.bounds.clone().applyMatrix4(view.root.matrixWorld);for(const key of ['min','max'])for(let i=0;i<3;i++)near(actual[key].getComponent(i),expected[key].getComponent(i),'Quarter-turn bounds');view.dispose();view.dispose();assert.equal(view.root.children.length,0);assert.equal(view.diagnostics().materials,0);assert.equal(view.diagnostics().geometries,0);}
const staticMetadata=JSON.parse(fs.readFileSync('assets/art/exposition-administration/metadata.json'));assert.equal(staticMetadata.compiledStructure.sha256,sha(Buffer.from(JSON.stringify({structuralPieces:model.metadata.structuralPieces,seamPieces:model.metadata.seamPieces,floorTiles:model.metadata.floorTiles}))));
model.dispose();model.dispose();for(const count of disposals.values())assert.equal(count,1,'Owned resource disposal');assert.equal(borrowedDisposals,0);for(const m of Object.values(materials))m.dispose();mapTexture.dispose();for(const g of Object.values(originals))g.dispose();
for(const position of [[.5,0,0],[0,1,0],[0,0,.25]])assert.throws(()=>createAdministrationBuilding(T,{position}),/Tile placement/);assert.throws(()=>createAdministrationBuilding(T,{quarterTurns:.5}),/quarterTurns/);
const manifest=JSON.parse(fs.readFileSync('assets/art/exposition-administration/manifest.json'));for(const f of [...manifest.runtimeFiles,...manifest.dependencies,...manifest.previewResources]){const b=fs.readFileSync(f.path);assert.equal(b.length,f.bytes);assert.equal(sha(b),f.sha256,f.path+' hash');}
if(process.argv.includes('--package')){
 const {createServer}=await import('node:http'),{connect}=await import('node:net');const dist=path.resolve('dist'),prefix='/nested/review/tinderbox/',timer=setTimeout(()=>process.exit(124),30000);timer.unref();
 const server=createServer((request,response)=>{try{const pathname=new URL(request.url,'http://localhost').pathname;if(!pathname.startsWith(prefix)){response.writeHead(404).end();return;}const target=path.resolve(dist,decodeURIComponent(pathname.slice(prefix.length)));if(!target.startsWith(dist+path.sep)||!fs.existsSync(target)){response.writeHead(404).end();return;}response.setHeader('Content-Type',target.endsWith('.js')?'text/javascript':'application/octet-stream');response.end(fs.readFileSync(target));}catch{response.writeHead(500).end();}});
 await new Promise(resolve=>server.listen(0,'127.0.0.1',resolve));const port=server.address().port;const helper={owner:'01a17ea0-1362-7d13-a42d-f4a5fcff8902',task:'Administration building art',pid:process.pid,executable:process.execPath,creationTimeApprox:new Date(Date.now()-process.uptime()*1000).toISOString(),startedAt:new Date().toISOString(),purpose:'Private nested-path package check',port,intendedExpirySeconds:30,stopMethod:'finally server.close; same-process 30-second deadline'};
 try{
   const manifest=JSON.parse(fs.readFileSync('assets/art/exposition-administration/manifest.json'));
   assert.ok(!JSON.parse(fs.readFileSync('dist/build-manifest.json')).files.some(f=>/^(?:docs|art\/source)\//.test(f.path)||f.path.endsWith('.jp2')),'Research escaped into public package');
   for(const file of [...manifest.runtimeFiles,...manifest.dependencies,...manifest.previewResources,{path:'assets/art/exposition-administration/manifest.json',sha256:sha(fs.readFileSync('assets/art/exposition-administration/manifest.json'))}]){const response=await fetch('http://127.0.0.1:'+port+prefix+file.path);assert.equal(response.status,200);if(file.path.endsWith('.js'))assert.match(response.headers.get('content-type'),/javascript/);assert.equal(sha(Buffer.from(await response.arrayBuffer())),file.sha256);}
   const packaged=await import(pathToFileURL(path.join(dist,'assets/art/exposition-administration/index.js'))),host=await import(pathToFileURL(path.join(dist,'src/runtime/three.js'))),view=packaged.createAdministrationBuilding(host);assert.ok(view.root instanceof host.Group);assert.equal(view.diagnostics().nativeDoors,8);view.dispose();helper.passed=true;
 }finally{await new Promise(resolve=>server.close(resolve));server.closeAllConnections();clearTimeout(timer);helper.finishedAt=new Date().toISOString();helper.released=await new Promise(resolve=>{const socket=connect(port,'127.0.0.1');socket.once('error',()=>resolve(true));socket.once('connect',()=>{socket.destroy();resolve(false);});});assert.ok(helper.released);fs.mkdirSync('artifacts/exposition-administration',{recursive:true});fs.writeFileSync('artifacts/exposition-administration/package-helper.json',JSON.stringify(helper,null,2)+'\n');}
}


console.log('PASS Administration: '+preserved.files.length+' preserved files; '+panels.size+' actual Nautilus panels in '+tiers.tiers.length+' validated tiers; '+native.walls+' native walls, '+native.doors+' native leaves; '+wallCount+' wall fragments / '+closureCount+' closures; '+vertices+' bounded vertices; independent floor areas, open-rotunda/landing rays, '+treads+' stair treads; four poses; skins and '+disposals.size+' owned disposals. '+JSON.stringify(report));
