import fs from 'node:fs';
import path from 'node:path';
import assert from 'node:assert/strict';
import {createHash} from 'node:crypto';
import {pathToFileURL} from 'node:url';
import * as T from '../../src/runtime/three.js';
import {ASSET_SCALE as S} from '../../src/content/asset-scale.js';
import {createNewYorkStateBuilding,APPEARANCE_SLOTS} from '../../assets/art/exposition-new-york/index.js';
const EPS=4e-5,sha=bytes=>createHash('sha256').update(bytes).digest('hex'),near=(a,b,label)=>assert.ok(Math.abs(a-b)<EPS,label+': '+a+' / '+b);
import {NATIVE_CONTRACT} from '../../assets/art/exposition-new-york/native-contract.js';
assert.deepEqual(NATIVE_CONTRACT,S,'Standalone physical profile must match the pinned source');
const source=JSON.parse(fs.readFileSync('art/source/exposition-new-york/measurements.json')),provenance=JSON.parse(fs.readFileSync('art/source/exposition-new-york/sources.json'));
for(const f of provenance.files){const b=fs.readFileSync(f.path);assert.equal(b.length,f.bytes);assert.equal(sha(b),f.sha256);}
if(fs.existsSync(provenance.pdf.cachePath))assert.equal(sha(fs.readFileSync(provenance.pdf.cachePath)),provenance.pdf.sha256);
for(const kind of ['plan','elevation']){const r=source[kind].ruler;near((r.points[1][0]-r.points[0][0])/(r.feet[1]-r.feet[0]),r.pixelsPerFoot,kind+' calibration');near((r.crossCheckPoints[1][0]-r.crossCheckPoints[0][0])/(r.crossCheckFeet[1]-r.crossCheckFeet[0]),r.pixelsPerFoot,kind+' second span');}
for(const m of source.measurements){near(m.sourceFeet*.3048,m.sourceMetres,m.id+' conversion');assert.ok(Math.abs(m.authoredMetres-m.sourceMetres)<=m.readingUncertaintyMetres+.061,m.id+' unexplained deviation');}
assert.equal(source.measurements.find(m=>m.id==='main-facade').sourceFeet,154);
for(const [key,value] of Object.entries({tile:1,wallHeight:2,wallThickness:.16,slab:.12,floorSpacing:2.12,doorWidth:1,doorHeight:1.65,doorThickness:.12}))near(S[key],value,'native '+key);
function digest(model){const h=createHash('sha256');model.root.traverse(o=>{if(!o.isMesh)return;h.update(o.name);h.update(JSON.stringify(o.matrix.elements));if(o.isInstancedMesh)h.update(Buffer.from(o.instanceMatrix.array.buffer));for(const a of Object.values(o.geometry.attributes))h.update(Buffer.from(a.array.buffer));if(o.geometry.index)h.update(Buffer.from(o.geometry.index.array.buffer));});return h.digest('hex');}
function eachPart(model,callback){model.root.updateMatrixWorld(true);const instance=new T.Matrix4();model.root.traverse(o=>{if(!o.isMesh)return;for(let i=0;i<(o.isInstancedMesh?o.count:1);i++){const m=o.matrixWorld.clone();if(o.isInstancedMesh){o.getMatrixAt(i,instance);m.multiply(instance);}callback(o,o.isInstancedMesh?o.userData.parts[i]:o.userData,m);}});}
function inPolygon(x,z,polygon){let inside=false;for(let i=0,j=polygon.length-1;i<polygon.length;j=i++){const a=polygon[i],b=polygon[j],cross=(x-a[0])*(b[1]-a[1])-(z-a[1])*(b[0]-a[0]);if(Math.abs(cross)<EPS&&x>=Math.min(a[0],b[0])-EPS&&x<=Math.max(a[0],b[0])+EPS&&z>=Math.min(a[1],b[1])-EPS&&z<=Math.max(a[1],b[1])+EPS)return true;if((a[1]>z)!==(b[1]>z)&&x<(b[0]-a[0])*(z-a[1])/(b[1]-a[1])+a[0])inside=!inside;}return inside;}
let vertices=0,groundVertices=0,native=0,roofEdges=0,surfaceEdges=0,resources=0;
const hostTexture=new T.Texture();hostTexture.repeat.set(.5,.5);hostTexture.offset.set(.17,.33);const hostMaterials=Object.fromEntries(APPEARANCE_SLOTS.map(s=>[s,new T.MeshStandardMaterial({color:0xbbaa99,map:hostTexture})]));
let borrowedDisposals=0;hostTexture.addEventListener('dispose',()=>borrowedDisposals++);for(const m of Object.values(hostMaterials))m.addEventListener('dispose',()=>borrowedDisposals++);
const model=createNewYorkStateBuilding(T,{materials:hostMaterials}),report=model.diagnostics(),metadata=JSON.stringify(model.metadata),geometryDigest=digest(model),ids=new Set(),disposalCounts=new Map();
model.root.traverse(o=>{if(!o.isMesh)return;for(const resource of [o.geometry,...[o.material].flat(),...(o.isInstancedMesh?[o]:[])])if(!disposalCounts.has(resource)){disposalCounts.set(resource,0);resource.addEventListener('dispose',()=>disposalCounts.set(resource,disposalCounts.get(resource)+1));}});
eachPart(model,(o,data,matrix)=>{
  const id=data.componentId||data.id;assert.ok(id&&!ids.has(id),'Duplicate component '+id);ids.add(id);const g=o.geometry,p=g.attributes.position,n=g.attributes.normal,index=g.index,uv=g.attributes.grossUV;
  for(let i=0;i<p.count;i++){const v=new T.Vector3().fromBufferAttribute(p,i).applyMatrix4(matrix);assert.ok(v.toArray().every(Number.isFinite));assert.ok(model.bounds.clone().expandByScalar(EPS).containsPoint(v),'Local bounds miss '+id);vertices++;
    if(Math.abs(v.y)<EPS){groundVertices++;assert.ok(model.metadata.groundContact.some(f=>inPolygon(v.x,v.z,f.polygon)),'Ground footprint misses '+id+' '+v.toArray());}
    if(v.y>=2.12-EPS){const b=model.metadata.overhangBounds;assert.ok(new T.Box3(new T.Vector3(...b.min),new T.Vector3(...b.max)).expandByScalar(EPS).containsPoint(v),'Overhang metadata misses '+id);}
  }
  if(data.form==='native-wall'||data.form==='native-door'){
    native++;const expected=data.form==='native-wall'?new T.BoxGeometry(1,2,.16):new T.BoxGeometry(1,1.65,.12);
    for(const name of ['position','normal','uv'])assert.deepEqual(g.attributes[name].array,expected.attributes[name].array,id+' changed source '+name);assert.deepEqual(index.array,expected.index.array);expected.dispose();
    const scale=new T.Vector3().setFromMatrixScale(matrix);scale.toArray().forEach(v=>near(v,1,id+' instance scale'));
    assert.equal(o.scale.x,1);assert.equal(o.scale.y,1);assert.equal(o.scale.z,1);
  }
  if(['native-wall','native-door','hip','box','prism','profile','mitered-cornice','infill-assembly'].includes(data.form))for(let i=0;i<(index?.count||p.count);i+=3){
    const at=j=>index?index.getX(i+j):i+j;
    for(const [a,b] of [[0,1],[1,2],[2,0]]){const va=new T.Vector3().fromBufferAttribute(p,at(a)),vb=new T.Vector3().fromBufferAttribute(p,at(b));const d=va.distanceTo(vb),du=Math.hypot(uv.getX(at(a))-uv.getX(at(b)),uv.getY(at(a))-uv.getY(at(b)));near(d,du,id+' physical UV');surfaceEdges++;if(data.form==='hip')roofEdges++;}
  }
});
assert.equal(native,report.nativeWalls+report.nativeDoors);assert.ok(report.nativeWalls>0&&report.nativeDoors===6);assert.ok(report.meshes<400&&report.triangles<200000);assert.equal(report.ownedTextures,0);assert.ok(Object.isFrozen(model.metadata.physicalMaterial));
// Test real face openings and open colonnades, rather than only their declarations.
model.root.updateMatrixWorld(true);
const hits=(origin,direction,far)=>new T.Raycaster(new T.Vector3(...origin),new T.Vector3(...direction),0,far).intersectObject(model.root,true);
assert.ok(hits([20,3,12],[0,-1,0],2).some(h=>h.object.name==='foundation'),'Foundation top must face up');
assert.ok(hits([29.3,10.5,15.5],[0,-1,0],4).some(h=>h.object.userData.appearanceSlot==='roof'),'Porch deck must face up');
assert.ok(hits([1.08,2.7,-.5],[0,0,1],1).some(h=>h.object.userData.appearanceSlot==='trim'),'Entry jamb gap');
for(const [i,bay] of source.bayComparison.entries()){const expected=(bay.sourcePixel-source.elevation.origin[0])/source.elevation.ruler.pixelsPerFoot*.3048;near(expected,bay.sourceMetres,'bay source conversion');near(model.metadata.sourceBays[i].x,bay.authoredMetres,'authored bay');assert.ok(Math.abs(expected-bay.authoredMetres)<.125,'Front bay drift exceeds recorded 0.125 m adjustment');const windowHits=hits([bay.authoredMetres+.3,4,-.5],[0,0,1],1);assert.ok(windowHits.some(h=>h.object.userData.appearanceSlot==='glazing'));assert.ok(!windowHits.some(h=>h.object.userData.appearanceSlot==='facade'));}
assert.ok(hits([.5,2.7,-1],[0,0,1],2).some(h=>h.object.userData.appearanceSlot==='door'),'Closed front leaves missing');
assert.ok(hits([-20.45,4.0,-.5],[0,0,1],1).some(h=>h.object.userData.appearanceSlot==='glazing'),'Window hole misses glass');
assert.ok(!hits([-20.45,4.0,-.5],[0,0,1],1).some(h=>h.object.userData.appearanceSlot==='facade'),'Opaque wall behind opening');
const a=Math.PI/16;assert.equal(hits([23.5+10.5*Math.cos(a),5,13.5+10.5*Math.sin(a)],[-Math.cos(a),0,-Math.sin(a)],2.2).length,0,'Porch void blocked');assert.ok(hits([34,5,13.5],[-1,0,0],2.2).length>0,'Porch column missing');
// Appearance adapters preserve all geometry, metadata and borrowed resources.
const alternate=new T.MeshStandardMaterial({color:0x669977});alternate.addEventListener('dispose',()=>borrowedDisposals++);
model.setAppearance({materials:{facade:alternate},textures:{roof:hostTexture}});
model.root.traverse(o=>{if(!o.isMesh)return;for(const resource of [o.material].flat())if(!disposalCounts.has(resource)){disposalCounts.set(resource,0);resource.addEventListener('dispose',()=>disposalCounts.set(resource,disposalCounts.get(resource)+1));}});
assert.equal(digest(model),geometryDigest);assert.equal(JSON.stringify(model.metadata),metadata);assert.deepEqual(hostTexture.repeat.toArray(),[.5,.5]);assert.deepEqual(hostTexture.offset.toArray(),[.17,.33]);assert.equal(borrowedDisposals,0);
const sample=[];model.root.traverse(o=>{if(o.isMesh&&sample.length<1)sample.push(o.material);});const shader={vertexShader:'#include <uv_vertex>',fragmentShader:'#include <map_fragment>'};sample[0].onBeforeCompile(shader);assert.ok(shader.vertexShader.includes('grossUV'));
const beforeFailure=digest(model);assert.throws(()=>model.setAppearance({materials:{bad:hostMaterials.trim}}),/Unknown/);assert.equal(digest(model),beforeFailure);
for(const n of [0,1,2,3]){
  const placed=createNewYorkStateBuilding(T,{quarterTurns:n,position:[17,3,-29]});assert.deepEqual(placed.bounds.min.toArray(),model.bounds.min.toArray());assert.deepEqual(placed.bounds.max.toArray(),model.bounds.max.toArray());
  const expected=placed.bounds.clone().applyMatrix4(placed.root.matrixWorld),actual=new T.Box3().setFromObject(placed.root);for(const edge of ['min','max'])for(let i=0;i<3;i++)near(actual[edge].getComponent(i),expected[edge].getComponent(i),'quarter '+n+' '+edge);
  eachPart(placed,(o,data,m)=>{const p=o.geometry.attributes.position;for(let i=0;i<p.count;i++)assert.ok(expected.clone().expandByScalar(EPS).containsPoint(new T.Vector3().fromBufferAttribute(p,i).applyMatrix4(m)));});placed.dispose();placed.dispose();assert.deepEqual(placed.root.children,[]);assert.equal(placed.diagnostics().materials,0);assert.equal(placed.diagnostics().geometries,0);
}
model.dispose();model.dispose();assert.equal(borrowedDisposals,0);for(const count of disposalCounts.values())assert.equal(count,1,'Owned resource disposal count');resources=disposalCounts.size;
alternate.dispose();for(const m of Object.values(hostMaterials))m.dispose();hostTexture.dispose();
const defaults=createNewYorkStateBuilding(T,{textures:{facade:new T.Texture(),roof:new T.Texture()}}),defaultAdapters={};defaults.root.traverse(o=>{if(o.isMesh)defaultAdapters[o.userData.appearanceSlot]=o.material;});assert.notEqual(defaultAdapters.facade.customProgramCacheKey(),defaultAdapters.roof.customProgramCacheKey(),'Distinct map transfers need distinct shader cache keys');const defaultShader={vertexShader:'#include <uv_vertex>',fragmentShader:'#include <map_fragment>'};defaultAdapters.facade.onBeforeCompile(defaultShader);assert.ok(defaultShader.fragmentShader.includes('mix(diffuse, diffuseColor.rgb, 0.120000)'));const borrowedMaps=[defaultAdapters.facade.map,defaultAdapters.roof.map];defaults.dispose();for(const t of borrowedMaps)t.dispose();
assert.throws(()=>createNewYorkStateBuilding(T,{quarterTurns:.5}),/quarterTurns/);assert.throws(()=>createNewYorkStateBuilding(T,{position:[0,NaN,0]}),/position/);
if(fs.existsSync('assets/art/exposition-new-york/manifest.json')){
 const manifest=JSON.parse(fs.readFileSync('assets/art/exposition-new-york/manifest.json'));
 for(const file of [...manifest.runtimeFiles,...manifest.dependencies,...manifest.nativeReferenceFiles,...manifest.previewResources]){const bytes=fs.readFileSync(file.path);assert.equal(bytes.length,file.bytes,file.path+' length');assert.equal(sha(bytes),file.sha256,file.path+' hash');}
}
if(process.argv.includes('--package')){
 const {createServer}=await import('node:http'),{connect}=await import('node:net');const dist=path.resolve('dist'),prefix='/nested/review/tinderbox/',timer=setTimeout(()=>process.exit(124),30000);timer.unref();
 const server=createServer((request,response)=>{try{const pathname=new URL(request.url,'http://localhost').pathname;if(!pathname.startsWith(prefix)){response.writeHead(404).end();return;}const target=path.resolve(dist,decodeURIComponent(pathname.slice(prefix.length)));if(!target.startsWith(dist+path.sep)||!fs.existsSync(target)){response.writeHead(404).end();return;}response.setHeader('Content-Type',target.endsWith('.js')?'text/javascript':'application/octet-stream');response.end(fs.readFileSync(target));}catch{response.writeHead(500).end();}});
 await new Promise(resolve=>server.listen(0,'127.0.0.1',resolve));const port=server.address().port;const helper={owner:'01a17ea0-1362-7d13-a42d-f4a5fcff8902',task:'TB-022',pid:process.pid,executable:process.execPath,creationTimeApprox:new Date(Date.now()-process.uptime()*1000).toISOString(),startedAt:new Date().toISOString(),purpose:'Private nested-path package check',port,intendedExpirySeconds:30,stopMethod:'finally server.close; same-process 30-second deadline'};
 try{
   const manifest=JSON.parse(fs.readFileSync('assets/art/exposition-new-york/manifest.json'));
   assert.ok(!JSON.parse(fs.readFileSync('dist/build-manifest.json')).files.some(f=>/^(?:docs|art\/source)\//.test(f.path)||f.path.endsWith('.jp2')),'Research escaped into public package');
   for(const file of [...manifest.runtimeFiles,...manifest.dependencies,...manifest.previewResources,{path:'assets/art/exposition-new-york/manifest.json',sha256:sha(fs.readFileSync('assets/art/exposition-new-york/manifest.json'))}]){const response=await fetch('http://127.0.0.1:'+port+prefix+file.path);assert.equal(response.status,200);if(file.path.endsWith('.js'))assert.match(response.headers.get('content-type'),/javascript/);assert.equal(sha(Buffer.from(await response.arrayBuffer())),file.sha256);}
   const packaged=await import(pathToFileURL(path.join(dist,'assets/art/exposition-new-york/index.js'))),host=await import(pathToFileURL(path.join(dist,'src/runtime/three.js'))),view=packaged.createNewYorkStateBuilding(host);assert.ok(view.root instanceof host.Group);assert.equal(view.diagnostics().nativeDoors,6);view.dispose();helper.passed=true;
 }finally{await new Promise(resolve=>server.close(resolve));server.closeAllConnections();clearTimeout(timer);helper.finishedAt=new Date().toISOString();helper.released=await new Promise(resolve=>{const socket=connect(port,'127.0.0.1');socket.once('error',()=>resolve(true));socket.once('connect',()=>{socket.destroy();resolve(false);});});assert.ok(helper.released);fs.mkdirSync('artifacts/exposition-new-york',{recursive:true});fs.writeFileSync('artifacts/exposition-new-york/package-helper.json',JSON.stringify(helper,null,2)+'\n');}
}
console.log('PASS TB-022: '+source.measurements.length+' calibrated measurements; '+native+' unscaled native parts; '+vertices+' finite bounded vertices; '+groundVertices+' ground-contact vertices; '+roofEdges+' metric roof edges / '+surfaceEdges+' flat-surface edges; four placements; appearance/borrowed ownership; '+resources+' owned disposal checks. '+JSON.stringify(report));
