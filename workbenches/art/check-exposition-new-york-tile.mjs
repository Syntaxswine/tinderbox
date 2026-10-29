import fs from 'node:fs';
import path from 'node:path';
import assert from 'node:assert/strict';
import {execFileSync} from 'node:child_process';
import {createHash} from 'node:crypto';
import {pathToFileURL} from 'node:url';
import * as T from '../../src/runtime/three.js';
import {ASSET_SCALE as S} from '../../src/content/asset-scale.js';
import {createNewYorkStateBuildingTile,APPEARANCE_SLOTS,TILE_PLAN} from '../../assets/art/exposition-new-york-tile/index.js';
const EPS=5e-5,sha=b=>createHash('sha256').update(b).digest('hex'),near=(a,b,id)=>assert.ok(Math.abs(a-b)<EPS,id+': '+a+' vs '+b);
const preserved=JSON.parse(fs.readFileSync('art/source/exposition-new-york-tile/preserved-original.json'));
for(const f of preserved.files)assert.equal(execFileSync('git',['hash-object','--path='+f.path,'--',f.path],{encoding:'utf8'}).trim(),f.gitBlob,'Original changed: '+f.path);
assert.equal(preserved.commit,'5e8d64b8b41637637d57ed762eb5157e5d521b4f');
assert.deepEqual(TILE_PLAN.grid,{tile:S.tile,wallHeight:S.wallHeight,wallThickness:S.wallThickness,slab:S.slab,floorPitch:S.floorSpacing,origin:[0,0,0]});
const R=new Map(TILE_PLAN.runs.map(r=>[r.id,r]));
for(const r of R.values()){
  assert.ok([...r.a,...r.b].every(Number.isInteger));assert.ok(r.a[0]===r.b[0]||r.a[1]===r.b[1]);
  near(r.length,Math.hypot(r.a[0]-r.b[0],r.a[1]-r.b[1]),r.id+' endpoints');assert.ok(Number.isInteger(r.length)&&r.length%2===0,'Run is not even metres: '+r.id);
  assert.ok(Number.isInteger(r.startLevel)&&Number.isInteger(r.endLevel));
  for(const h of r.openings){assert.ok(Number.isInteger(h.x-h.width/2)&&Number.isInteger(h.x+h.width/2));assert.ok(h.x-h.width/2>=-r.length/2&&h.x+h.width/2<=r.length/2);}
}
const hostTexture=new T.Texture();hostTexture.repeat.set(.5,.5);hostTexture.offset.set(.17,.33);let borrowedDisposals=0;hostTexture.addEventListener('dispose',()=>borrowedDisposals++);
const materials=Object.fromEntries(APPEARANCE_SLOTS.map(s=>[s,new T.MeshStandardMaterial({color:0xbbaa99,map:hostTexture})]));for(const m of Object.values(materials))m.addEventListener('dispose',()=>borrowedDisposals++);
const model=createNewYorkStateBuildingTile(T,{materials}),report=model.diagnostics(),metadata=JSON.stringify(model.metadata),disposals=new Map(),parts=new Map(),floors=new Map();
assert.deepEqual(model.metadata.nativeContract,S);assert.deepEqual(model.metadata.tilePlan,TILE_PLAN);
const pieces=new Map([...model.metadata.structuralPieces,...model.metadata.seamPieces].map(p=>[p.id,p]));
function eachPart(view,fn){view.root.updateMatrixWorld(true);const instance=new T.Matrix4();view.root.traverse(o=>{if(!o.isMesh)return;for(let i=0;i<(o.isInstancedMesh?o.count:1);i++){const matrix=o.matrixWorld.clone();if(o.isInstancedMesh){o.getMatrixAt(i,instance);matrix.multiply(instance);}fn(o,o.isInstancedMesh?o.userData.parts[i]:o.userData,matrix);}});}
function digest(view){const hash=createHash('sha256');eachPart(view,(o,data,m)=>{hash.update(data.componentId);hash.update(JSON.stringify(m.elements));for(const a of Object.values(o.geometry.attributes))hash.update(Buffer.from(a.array.buffer));});return hash.digest('hex');}
function track(){model.root.traverse(o=>{if(!o.isMesh)return;for(const v of [o.geometry,o.material,...(o.isInstancedMesh?[o]:[])])if(!disposals.has(v)){disposals.set(v,0);v.addEventListener('dispose',()=>disposals.set(v,disposals.get(v)+1));}});}
let vertices=0,nativeWalls=0,nativeDoors=0,floorTiles=0,closures=0,wallPieces=0;
track();
eachPart(model,(o,data,m)=>{
  const id=data.componentId;assert.ok(id&&!parts.has(id),'Duplicate/missing component ID');parts.set(id,{o,data,m});
  const g=o.geometry,p=g.attributes.position,scale=new T.Vector3().setFromMatrixScale(m);scale.toArray().forEach(v=>near(v,1,id+' resized'));
  for(let i=0;i<p.count;i++){const v=new T.Vector3().fromBufferAttribute(p,i).applyMatrix4(m);assert.ok(v.toArray().every(Number.isFinite));assert.ok(model.bounds.clone().expandByScalar(EPS).containsPoint(v),id+' outside bounds');vertices++;}
  if(data.form==='native-wall'||data.form==='native-door'){
    const expected=new T.BoxGeometry(...(data.form==='native-wall'?[1,2,.16]:[1,1.65,.12]));
    for(const name of ['position','normal','uv'])assert.deepEqual(g.attributes[name].array,expected.attributes[name].array,id+' source '+name);assert.deepEqual(g.index.array,expected.index.array);expected.dispose();
    if(data.form==='native-wall')nativeWalls++;else nativeDoors++;
  }
  if(data.role==='structural-wall'||data.role==='perimeter-closure'){
    const piece=pieces.get(id);assert.ok(piece,id+' missing recipe');const r=R.get(piece.runId),b=g.boundingBox,size=b.getSize(new T.Vector3());
    near(size.x,1,id+' cell width');near(size.z,.16,id+' native thickness');near(size.y,piece.height,id+' cut height');
    assert.ok(piece.cell>=0&&piece.cell<r.length&&Number.isInteger(piece.cell));
    const face=new T.Matrix4().makeRotationY(r.heading);face.setPosition((r.a[0]+r.b[0])/2,0,(r.a[1]+r.b[1])/2);
    const actual=new T.Vector3().setFromMatrixPosition(m).applyMatrix4(face.clone().invert());
    near(actual.x,-r.length/2+piece.cell+.5,id+' cell centre');near(actual.y,piece.bottom+piece.height/2,id+' elevation');near(actual.z,0,id+' centreline');
    const base=piece.level*S.floorSpacing;
    if(data.role==='structural-wall'){wallPieces++;assert.ok(piece.bottom>=base-EPS&&piece.bottom+piece.height<=base+2+EPS,'Wall exceeds native course');}
    else{closures++;near(piece.bottom>=base+2-EPS?piece.bottom:NaN,piece.bottom,'Closure outside slab band');assert.ok(piece.bottom+piece.height<=base+2.12+EPS);}
    // Every actual fragment must avoid all declared opening interiors.
    for(const h of r.openings)if(actual.x>h.x-h.width/2+EPS&&actual.x<h.x+h.width/2-EPS)assert.ok(piece.bottom+piece.height<=h.bottom+EPS||piece.bottom>=h.bottom+h.height-EPS,'Opaque wall seals '+h.id);
  }
  if(data.role==='floor'){
    const floor=TILE_PLAN.floors.find(f=>f.id===data.floorId);assert.ok(floor);assert.equal(data.level,floor.level);
    const box=g.boundingBox.clone().applyMatrix4(m);near(box.max.y,floor.level*S.floorSpacing,id+' floor top');near(box.max.y-box.min.y,.12,id+' slab thickness');
    if(!floors.has(floor.id))floors.set(floor.id,[]);floors.get(floor.id).push(box);
    if(data.form==='native-slab'){
      floorTiles++;near(box.max.x-box.min.x,1,id+' tile width');near(box.max.z-box.min.z,1,id+' tile depth');
      [box.min.x,box.max.x,box.min.z,box.max.z].forEach(v=>near(v,Math.round(v),id+' integer floor edge'));
    }
  }
});
// Independently conserve opaque height in every cell; missing cells cannot pass.
for(const run of R.values())for(let level=run.startLevel;level<run.endLevel;level++)for(let cell=0;cell<run.length;cell++)for(const closure of [false,true]){
  const lo=level*S.floorSpacing+(closure?2:0),hi=lo+(closure?.12:2),x=-run.length/2+cell+.5;
  const intervals=run.openings.filter(h=>x>h.x-h.width/2&&x<h.x+h.width/2).map(h=>[Math.max(lo,h.bottom),Math.min(hi,h.bottom+h.height)]).filter(([a,b])=>b>a).sort((a,b)=>a[0]-b[0]);
  let removed=0,end=lo;for(const [a,b] of intervals){removed+=Math.max(0,b-Math.max(a,end));end=Math.max(end,b);}
  const actual=[...(closure?model.metadata.seamPieces:model.metadata.structuralPieces)].filter(p=>p.runId===run.id&&p.level===level&&p.cell===cell).reduce((v,p)=>v+parts.get(p.id).o.geometry.boundingBox.getSize(new T.Vector3()).y,0);
  near(actual,hi-lo-removed,run.id+' complete cell '+level+'/'+cell+'/'+closure);
}
assert.equal(nativeWalls,report.nativeWalls);assert.equal(nativeDoors,6);assert.equal(floorTiles,6744);assert.equal(wallPieces,model.metadata.structuralPieces.length);assert.equal(closures,model.metadata.seamPieces.length);assert.equal(pieces.size,wallPieces+closures);
for(const f of TILE_PLAN.floors){
  assert.ok(floors.has(f.id));if(f.form!=='tiles')continue;
  for(const b of floors.get(f.id)){
    const z=(b.min.z+b.max.z)/2,xs=[];
    for(let i=0;i<f.polygon.length;i++){const a=f.polygon[i],c=f.polygon[(i+1)%f.polygon.length];if((a[1]>z)!==(c[1]>z))xs.push(a[0]+(z-a[1])*(c[0]-a[0])/(c[1]-a[1]));}
    xs.sort((a,b)=>a-b);assert.ok(xs.some((x,i)=>i%2===0&&b.min.x>=x-EPS&&b.max.x<=xs[i+1]+EPS),'Floor tile outside recipe polygon');
  }
  const area=Math.abs(f.polygon.reduce((v,p,i)=>{const q=f.polygon[(i+1)%f.polygon.length];return v+p[0]*q[1]-q[0]*p[1];},0)/2);
  const boxes=floors.get(f.id),keys=new Set(boxes.map(b=>b.min.x.toFixed(4)+'/'+b.min.z.toFixed(4)));
  near(boxes.length,area,f.id+' tile coverage');assert.equal(keys.size,boxes.length,'Duplicate floor tile');
}
for(const tall of TILE_PLAN.tallRooms){
  for(const level of tall.emptyLevels)assert.ok(!TILE_PLAN.floors.some(f=>f.level===level&&(tall.zone==='towers'?f.zone.startsWith('tower'):f.zone===tall.zone)),'Void level is sealed');
  near((tall.toLevel-tall.fromLevel)*S.floorSpacing,tall.floorToFloor,tall.zone+' height');
}
const hits=(origin,direction,far)=>new T.Raycaster(new T.Vector3(...origin),new T.Vector3(...direction),0,far).intersectObject(model.root,true);
// Ray tests inspect the actual built slabs, including the empty intervening levels.
for(const [base,next] of [[1,4],[4,7]]){
  const ys=hits([.3,base*S.floorSpacing+.3,4.3],[0,1,0],7).filter(h=>Math.abs(h.point.y-(next*S.floorSpacing-.12))<EPS);assert.ok(ys.length,'Tall main room ceiling missing');
  const all=hits([.3,base*S.floorSpacing+.3,4.3],[0,1,0],(next-base)*S.floorSpacing-.5);assert.equal(all.length,0,'Unexpected geometry across void level');
}
assert.equal(hits([10.3,11*S.floorSpacing+.3,16.3],[0,1,0],8).length,0,'Tower void has a slab');
assert.ok(hits([10.3,11*S.floorSpacing+.3,16.3],[0,1,0],9).some(h=>Math.abs(h.point.y-(15*S.floorSpacing-.12))<EPS));
for(const [x,y] of [[-21,4.1],[-15,10.4]]){
  const found=hits([x+.3,y,-.6],[0,0,1],1);assert.ok(found.some(h=>h.object.userData.appearanceSlot==='glazing'));assert.ok(!found.some(h=>h.object.userData.appearanceSlot==='facade'),'Facade behind glazing');
}
assert.ok(hits([.5,2.7,-.6],[0,0,1],1).some(h=>h.object.userData.appearanceSlot==='door'));
assert.equal(hits([34,5,14],[-1,0,0],9).length,0,'Porch approach blocked');
// Skin and pose changes preserve the structural recipe, dimensions and ownership.
const originalDigest=digest(model);model.setAppearance({textures:{roof:hostTexture},materials:{facade:materials.trim}});track();assert.equal(digest(model),originalDigest);assert.equal(JSON.stringify(model.metadata),metadata);
assert.deepEqual(hostTexture.repeat.toArray(),[.5,.5]);assert.deepEqual(hostTexture.offset.toArray(),[.17,.33]);assert.equal(borrowedDisposals,0);assert.throws(()=>model.setAppearance({textures:{bad:hostTexture}}),/Unknown/);
for(let quarterTurns=0;quarterTurns<4;quarterTurns++){
 const view=createNewYorkStateBuildingTile(T,{quarterTurns,position:[18,4.24,-30]}),actual=new T.Box3().setFromObject(view.root),expected=view.bounds.clone().applyMatrix4(view.root.matrixWorld);
 for(const key of ['min','max'])for(let i=0;i<3;i++)near(actual[key].getComponent(i),expected[key].getComponent(i),'Placed bounds');assert.deepEqual(view.metadata.tilePlan,TILE_PLAN);view.dispose();view.dispose();assert.equal(view.root.children.length,0);assert.equal(view.diagnostics().materials,0);
}
model.dispose();model.dispose();for(const count of disposals.values())assert.equal(count,1,'Owned resource disposed exactly once');assert.equal(borrowedDisposals,0);for(const m of Object.values(materials))m.dispose();hostTexture.dispose();
const stored=JSON.parse(fs.readFileSync('assets/art/exposition-new-york-tile/metadata.json'));
assert.equal(stored.compiledStructure.sha256,sha(Buffer.from(JSON.stringify({structuralPieces:model.metadata.structuralPieces,seamPieces:model.metadata.seamPieces,floorTiles:model.metadata.floorTiles}))),'Static compilation digest');
const manifest=JSON.parse(fs.readFileSync('assets/art/exposition-new-york-tile/manifest.json'));
for(const f of [...manifest.runtimeFiles,...manifest.dependencies,...manifest.nativeReferenceFiles,...manifest.previewResources]){const b=fs.readFileSync(f.path);assert.equal(b.length,f.bytes);assert.equal(sha(b),f.sha256,f.path+' hash');}
for(const position of [[.5,0,0],[0,0,.25],[0,1,0]])assert.throws(()=>createNewYorkStateBuildingTile(T,{position}),/Tile placement/);
assert.throws(()=>createNewYorkStateBuildingTile(T,{quarterTurns:.5}),/quarterTurns/);assert.throws(()=>createNewYorkStateBuildingTile(T,{position:[0,NaN,0]}),/position/);
if(process.argv.includes('--package')){
 const {createServer}=await import('node:http'),{connect}=await import('node:net');const dist=path.resolve('dist'),prefix='/nested/review/tinderbox/',timer=setTimeout(()=>process.exit(124),30000);timer.unref();
 const server=createServer((request,response)=>{try{const pathname=new URL(request.url,'http://localhost').pathname;if(!pathname.startsWith(prefix)){response.writeHead(404).end();return;}const target=path.resolve(dist,decodeURIComponent(pathname.slice(prefix.length)));if(!target.startsWith(dist+path.sep)||!fs.existsSync(target)){response.writeHead(404).end();return;}response.setHeader('Content-Type',target.endsWith('.js')?'text/javascript':'application/octet-stream');response.end(fs.readFileSync(target));}catch{response.writeHead(500).end();}});
 await new Promise(resolve=>server.listen(0,'127.0.0.1',resolve));const port=server.address().port;const helper={owner:'01a17ea0-1362-7d13-a42d-f4a5fcff8902',task:'TB-022 tile adaptation',pid:process.pid,executable:process.execPath,creationTimeApprox:new Date(Date.now()-process.uptime()*1000).toISOString(),startedAt:new Date().toISOString(),purpose:'Private nested-path package check',port,intendedExpirySeconds:30,stopMethod:'finally server.close; same-process 30-second deadline'};
 try{
   const manifest=JSON.parse(fs.readFileSync('assets/art/exposition-new-york-tile/manifest.json'));
   assert.ok(!JSON.parse(fs.readFileSync('dist/build-manifest.json')).files.some(f=>/^(?:docs|art\/source)\//.test(f.path)||f.path.endsWith('.jp2')),'Research escaped into public package');
   for(const file of [...manifest.runtimeFiles,...manifest.dependencies,...manifest.previewResources,{path:'assets/art/exposition-new-york-tile/manifest.json',sha256:sha(fs.readFileSync('assets/art/exposition-new-york-tile/manifest.json'))}]){const response=await fetch('http://127.0.0.1:'+port+prefix+file.path);assert.equal(response.status,200);if(file.path.endsWith('.js'))assert.match(response.headers.get('content-type'),/javascript/);assert.equal(sha(Buffer.from(await response.arrayBuffer())),file.sha256);}
   const packaged=await import(pathToFileURL(path.join(dist,'assets/art/exposition-new-york-tile/index.js'))),host=await import(pathToFileURL(path.join(dist,'src/runtime/three.js'))),view=packaged.createNewYorkStateBuildingTile(host);assert.ok(view.root instanceof host.Group);assert.equal(view.diagnostics().nativeDoors,6);view.dispose();helper.passed=true;
 }finally{await new Promise(resolve=>server.close(resolve));server.closeAllConnections();clearTimeout(timer);helper.finishedAt=new Date().toISOString();helper.released=await new Promise(resolve=>{const socket=connect(port,'127.0.0.1');socket.once('error',()=>resolve(true));socket.once('connect',()=>{socket.destroy();resolve(false);});});assert.ok(helper.released);fs.mkdirSync('artifacts/exposition-new-york-tile',{recursive:true});fs.writeFileSync('artifacts/exposition-new-york-tile/package-helper.json',JSON.stringify(helper,null,2)+'\n');}
}

console.log('PASS tile adaptation: '+preserved.files.length+' original files unchanged; '+R.size+' even-metre wall runs; '+wallPieces+' actual wall fragments; '+floorTiles+' 1m floor tiles; '+closures+' perimeter closures; '+vertices+' bounded vertices; tall-room/door/window rays; four placements; skin invariance and '+disposals.size+' disposal checks. '+JSON.stringify(report));
