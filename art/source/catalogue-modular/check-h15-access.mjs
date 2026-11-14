// Focused geometry, support and body-clearance gate for the live H15 variant.
// The frozen full-map fire/phone/cache evidence is deliberately not regenerated.
import fs from 'node:fs';
import path from 'node:path';
import {execFileSync} from 'node:child_process';
import {createHash} from 'node:crypto';
import {pathToFileURL} from 'node:url';
import assert from 'node:assert/strict';
import * as T from '../../../src/runtime/three.js';
import {createCatalogueStructureArt} from './thermal-art.js';
import {H15_ACCESS_CONTROL} from './h15-access-variant.mjs';
import {triangleArea} from '../furnished-house/geometry.js';
import {pointOnTriangle,segmentTriangle} from '../../../workbenches/furnished-house/geometry.js';
const coder=process.argv[2];if(!coder)throw Error('Supply the matching read-only coder checkout');
const control=H15_ACCESS_CONTROL.commit,housePath=H15_ACCESS_CONTROL.path;
const git=(...args)=>execFileSync('git',args,{encoding:'utf8',maxBuffer:32*1024*1024});
const bytesAt=file=>execFileSync('git',['show',control+':'+file],{maxBuffer:32*1024*1024});
const sha=bytes=>createHash('sha256').update(bytes).digest('hex');
const before=JSON.parse(bytesAt(housePath)),after=JSON.parse(fs.readFileSync(housePath)),variant=after.navigation.gameAccessVariant;
assert.equal(sha(bytesAt(housePath)),H15_ACCESS_CONTROL.sha256);
const {preparePhysicalInstance}=await import(pathToFileURL(path.join(coder,'workbenches/bell-and-alder-sandbox/compose.js')));
const {createTrial}=await import(pathToFileURL(path.join(coder,'workbenches/furnished-house/simulation.js')));
const {createNavigation}=await import(pathToFileURL(path.join(coder,'workbenches/furnished-house/navigation.js')));
const spec=JSON.parse(fs.readFileSync('workbenches/catalogue-modular/scene-data.json')).instances.find(i=>i.id==='hopkins-fifteen');
assert.deepEqual(spec.translation,[24,0,13]);assert.equal(spec.quarterTurns,2);
const instance=preparePhysicalInstance(after,spec),baseline=preparePhysicalInstance(before,spec);
function explicitHostFlight(instance){const q=id=>instance.id+'::'+id;instance.data.sandbox={version:1};instance.data.stairFlights=spec.stairFlights.map(f=>({id:q(f.id),instanceId:instance.id,treadSourceIds:f.treadSourceIds.map(q),lower:{elevation:f.lower.elevation,surfaceIds:f.lower.surfaceIds.map(q)},upper:{elevation:f.upper.elevation,surfaceIds:f.upper.surfaceIds.map(q)}}));for(const f of instance.data.stairFlights)for(const s of instance.data.surfaces)if(f.treadSourceIds.includes(s.id))s.stairFlightId=f.id;return instance;}
explicitHostFlight(instance);explicitHostFlight(baseline);
const world=p=>[24-p[0],p[1],13-p[2]],local=p=>[24-p[0],p[1],13-p[2]];
const close=(a,b,tolerance=1e-6)=>Math.abs(a-b)<=tolerance;
const checks=[];function check(name,fn){fn();checks.push(name);}
const map=(rows)=>new Map(rows.map(r=>[r.id,r]));
const oldSurfaces=map(before.surfaces),surfaces=map(after.surfaces),oldMeshes=map(before.sourceMeshes),meshes=map(after.sourceMeshes),oldGeometry=map(before.render.geometry),geometry=map(after.render.geometry);
const clipIds=new Set(variant.clipped.map(r=>r.id)),moveMeshIds=new Set(variant.moved.map(r=>r.id)),moveSurfaceIds=new Set(variant.moved.flatMap(r=>r.physicalSurfaceIds)),addIds=new Set(variant.added.map(r=>r.id)),floorMeshIds=new Set(variant.floorMeshes.map(r=>r.id));
const area=triangles=>triangles.reduce((s,t)=>s+triangleArea(t.map(v=>v.slice(0,3))),0);
const size=b=>b.max.map((v,i)=>v-b.min[i]);
check('Exact bounded change set and retained native pieces',()=>{
 assert.equal(clipIds.size,16);assert.equal(moveMeshIds.size,9);assert.equal(addIds.size,6);
 for(const s of before.surfaces)if(!clipIds.has(s.id)&&!moveSurfaceIds.has(s.id))assert.deepEqual(surfaces.get(s.id),s,s.id);
 for(const m of before.sourceMeshes)if(!moveMeshIds.has(m.id)&&!floorMeshIds.has(m.id))assert.deepEqual(meshes.get(m.id),m,m.id);
 for(const g of before.render.geometry)if(!moveMeshIds.has(g.id)&&!floorMeshIds.has(g.id))assert.deepEqual(geometry.get(g.id),g,g.id);
 for(const key of ['items','furnitureParts','openings','stores'])assert.deepEqual(after[key],before[key],key);
 assert.deepEqual(after.render.materials,before.render.materials);
 assert.equal(after.surfaces.length,before.surfaces.length+6);assert.equal(after.sourceMeshes.length,before.sourceMeshes.length+6);assert.equal(after.render.geometry.length,before.render.geometry.length+6);
 assert.deepEqual(after.levels.map(l=>[l.index,l.floorY]),before.levels.map(l=>[l.index,l.floorY]));
 for(const s of before.surfaces.filter(s=>s.supportType==='stair-tread'||['wall','roof'].includes(s.kind)))assert.deepEqual(surfaces.get(s.id),s,s.id);
});
check('Native guard dimensions and all painting attributes retained',()=>{
 for(const row of variant.moved){const original=oldGeometry.get(row.id),current=geometry.get(row.id);assert.equal(current.triangles.length,original.triangles.length);for(let i=0;i<3;i++)assert(close(size(row.beforeBounds)[i],size(row.afterBounds)[i]));assert(close(Math.abs(row.translation[0]),.1175));
  for(let t=0;t<original.triangles.length;t++){assert.equal(current.triangles[t].materialId,original.triangles[t].materialId);for(let v=0;v<3;v++){const a=original.triangles[t].vertices[v],b=current.triangles[t].vertices[v];assert.deepEqual(b.slice(3),a.slice(3));for(let i=0;i<3;i++)assert(close(b[i],a[i]+row.translation[i],1e-7));}}
 }
});
function interpolated(old,point){const [a,b,c]=old,e0=b.slice(0,3).map((v,i)=>v-a[i]),e1=c.slice(0,3).map((v,i)=>v-a[i]),v=point.slice(0,3).map((q,i)=>q-a[i]);const dot=(x,y)=>x.reduce((s,q,i)=>s+q*y[i],0),d00=dot(e0,e0),d01=dot(e0,e1),d11=dot(e1,e1),d20=dot(v,e0),d21=dot(v,e1),den=d00*d11-d01*d01,u=(d11*d20-d01*d21)/den,w=(d00*d21-d01*d20)/den;return a.map((q,i)=>q*(1-u-w)+b[i]*u+c[i]*w);}
let maxClipAttributeError=0;
check('Aperture matches floor records, level geometry, painted source and fuel',()=>{
 assert.equal(variant.aperture.width,1.25);
 for(const row of variant.clipped){const s=surfaces.get(row.id),old=oldSurfaces.get(row.id);assert(close(s.area,.1875));assert(close(area(s.triangles),s.area));assert(close(s.fuelAmount/old.fuelAmount,s.area/old.area));assert.equal(s.thickness,.12);assert(close(s.bounds.max[0]<=5?s.bounds.max[0]:s.bounds.min[0],s.bounds.max[0]<=5?4.875:6.125));}
 const upper=after.levels.find(l=>l.index===1);assert(close(area(upper.floorTriangles),67));
 for(const x of [4.876,5.5,6.124])for(const z of [3.01,4.1,5.1,6.1,6.99])assert(!upper.floorTriangles.some(t=>pointOnTriangle([x,2.6,z],t)));
 for(const row of variant.floorMeshes){for(const t of geometry.get(row.id).triangles)for(const v of t.vertices){const candidates=oldGeometry.get(row.id).triangles.filter(o=>o.materialId===t.materialId&&pointOnTriangle(v.slice(0,3),o.vertices.map(p=>p.slice(0,3)),1e-5));const error=Math.min(...candidates.map(o=>Math.max(...interpolated(o.vertices,v).map((q,i)=>Math.abs(q-v[i])))));assert(Number.isFinite(error));maxClipAttributeError=Math.max(maxClipAttributeError,error);assert(error<2e-6);}}
 assert(close(variant.quantities.mainUpperFloorAreaRemoved,1));assert(close(variant.quantities.addedTopArea,.0892625));assert(close(variant.quantities.addedVolume,.0107115));assert(close(variant.quantities.netSurfaceFuel,-.9107375));
});
const bearings=[],posts=[],rails=[];
const xyz=g=>g.triangles.map(t=>t.vertices.map(v=>v.slice(0,3)));
function intersectTriangles(a,b){for(const t of a)for(let i=0;i<3;i++)for(const o of b)if(segmentTriangle(t[i],t[(i+1)%3],o)!==null)return true;return false;}
check('Real native bearing solids, seated post bases and rail contacts',()=>{
 for(const row of variant.added){const s=surfaces.get(row.id),dimensions=size(s.bounds);assert(close(dimensions[1],.12));assert(dimensions[0]<=1&&dimensions[2]<=1);assert.equal(geometry.get(row.id).triangles.length,12);assert(close(area(s.triangles),s.area));assert(close(s.fuelAmount,s.area));
  const contacts=s.supportSurfaceIds.map(id=>{const host=surfaces.get(id),overlap=s.bounds.min.map((v,i)=>Math.min(s.bounds.max[i],host.bounds.max[i])-Math.max(v,host.bounds.min[i]));return {id,overlap,volume:overlap.reduce((v,n)=>v*Math.max(0,n),1)};});
  if(s.supportType==='stair-bearing')assert(contacts.every(c=>c.volume>0));else assert(contacts.every(c=>c.overlap[1]>.119&&((close(c.overlap[0],0)&&c.overlap[2]>.03)||(close(c.overlap[2],0)&&c.overlap[0]>.03))));
  bearings.push({id:s.id,dimensions,contacts});
 }
 for(const row of variant.moved.filter(r=>meshes.get(r.id).name==='Stair newel')){const m=meshes.get(row.id),s=surfaces.get(row.physicalSurfaceIds[0]),points=[m.bounds.min[0],m.bounds.max[0]].flatMap(x=>[m.bounds.min[2],m.bounds.max[2]].map(z=>[x,m.bounds.min[1],z]));const contacts=points.map(p=>s.supportSurfaceIds.filter(id=>surfaces.get(id).triangles.some(t=>Math.abs(t[0][1]-p[1])<1e-5&&pointOnTriangle(p,t,1e-5))));assert(contacts.every(list=>list.length),JSON.stringify({id:m.id,contacts}));posts.push({id:m.id,baseY:m.bounds.min[1],hosts:s.supportSurfaceIds,baseCornersCovered:contacts.length});}
 for(const row of variant.moved.filter(r=>meshes.get(r.id).name==='Stair handrail')){const s=surfaces.get(row.physicalSurfaceIds[0]),contacts=s.supportSurfaceIds.filter(id=>intersectTriangles(xyz(geometry.get(row.id)),surfaces.get(id).triangles)||intersectTriangles(surfaces.get(id).triangles,xyz(geometry.get(row.id))));assert(contacts.length>=2);rails.push({id:row.id,actualPostContacts:contacts});}
});
function trialFor(data){return createTrial(structuredClone(data));}
const live=trialFor(instance.data),original=trialFor(baseline.data);
const route=after.navigation.prototypeRoute.slice(7),offsets=[-.05,-.025,0,.025,.05];
function traverse(trial,points){const start=world(points[0]),nav=createNavigation(trial,{radius:.5,height:1.66,start,slide:false}),observations=[];for(const targetLocal of points.slice(1)){const target=world(targetLocal),p=nav.snapshot().position,dx=target[0]-p[0],dz=target[2]-p[2],d=Math.hypot(dx,dz),s=nav.move(dx/(d||1),dz/(d||1),d/9);observations.push({target:targetLocal,accepted:local(s.position),support:nav.support(s.position,s.position[1])?.id,lastBlock:s.lastBlock});if(Math.hypot(s.position[0]-target[0],s.position[2]-target[2])>1e-5||Math.abs(s.position[1]-target[1])>1e-5)return {passed:false,observations,lastBlock:s.lastBlock};}return {passed:true,observations};}
const paths=[];check('Native 1m diameter / 1.66m body ascends and descends at five lateral offsets',()=>{
 for(const offset of offsets)for(const direction of ['up','down']){let points=route.map(p=>[p[0]+offset,p[1],p[2]]);if(direction==='down')points=points.reverse();const result=traverse(live,points);paths.push({offset,direction,...result});assert(result.passed,JSON.stringify(paths.at(-1)));}
});
let exactControl,offsetControl;
check('Original floor-lip failure remains a failing control with unchanged body',()=>{
 exactControl=traverse(original,before.navigation.prototypeRoute.slice(8,10));const p=[5.4895433,.6566667,4.2489554],to=[5.5,.8333333,4.375],nav=createNavigation(original,{radius:.5,height:1.66,start:world(p),slide:false});offsetControl={from:p,to,clear:nav.clear(world(p),world(to)),lastBlock:nav.snapshot().lastBlock};assert(!offsetControl.clear);assert(offsetControl.lastBlock.id.includes('floor/l1/9,8'));assert(exactControl.passed);
});
const graph=live.supportGraph.diagnostics();let supportLoss;
check('All changed pieces rooted; physical bearer retirement removes post support',()=>{
 assert.equal(graph.unresolvedInitial,0);
 const bearer='hopkins-fifteen::access125/bearing-left-z5',post='hopkins-fifteen::'+variant.moved.find(r=>r.id.includes('/18/stair-newel')).physicalSurfaceIds[0],retired=[];
 for(const s of live.scene.index.surfaces.values())if(s.sourceSurfaceId===bearer){live.scene.index.change(s.id,{intact:false});retired.push(s.id);}
 const unsupported=live.supportGraph.unsupported({force:true}).filter(s=>s.sourceSurfaceId===post).map(s=>s.id);supportLoss={bearer,retired,dependentPost:post,unsupported};assert(retired.length>0&&unsupported.length>0);
});
let missingEdge;
check('Removing actual edge geometry and its physical source blocks the landing crossing',()=>{
 const raw=structuredClone(after),id='access125/upper-tread-edge';raw.surfaces=raw.surfaces.filter(s=>s.id!==id);raw.sourceMeshes=raw.sourceMeshes.filter(m=>m.id!==id);raw.render.geometry=raw.render.geometry.filter(g=>g.id!==id);
 const inst=explicitHostFlight(preparePhysicalInstance(raw,spec)),trial=trialFor(inst.data);try{missingEdge=traverse(trial,[[5.56,2.6,6.875],[6.2,2.6,6.875]]);assert(!missingEdge.passed);assert.equal(missingEdge.lastBlock.reason,'No reachable support');}finally{trial.dispose();}
});
let registration;const registrationArt=await createCatalogueStructureArt(T,{data:instance.data,placement:instance});
check('New export matches actual renderer geometry and disposes completely',()=>{
 const art=registrationArt;try{const coverage=art.inspect().coverage,compared=coverage.filter(r=>r.ratio!==null),unrepresented=instance.data.sourceMeshes.filter(m=>instance.data.render.geometry.some(g=>g.id===m.id)&&!coverage.some(r=>r.id===m.id));registration={meshes:coverage.length,comparedMeshes:compared.length,canonicalFloorMeshes:coverage.filter(r=>r.mode==='canonical-floor').length,maxRelativeAreaError:Math.max(0,...compared.map(r=>Math.abs(r.ratio-1))),unrepresented:unrepresented.map(m=>m.id),changedMeshes:coverage.filter(r=>[...moveMeshIds,...floorMeshIds,...addIds].some(id=>r.id==='hopkins-fifteen::'+id))};assert(registration.maxRelativeAreaError<1e-5);assert.equal(unrepresented.length,0);}finally{art.dispose();registration.disposal=art.diagnostics().resources;assert(Object.values(registration.disposal).every(n=>n===0));}
});
check('Shop geometry, contents and native stair remain the original control',()=>{const p='workbenches/catalogue-modular/shop-data.json',old=JSON.parse(bytesAt(p)),current=JSON.parse(fs.readFileSync(p));assert.deepEqual({...current,sourceHashes:undefined},{...old,sourceHashes:undefined});});
const fixedPaths=['art/source/catalogue-modular/thermal-art.js','art/source/catalogue-modular/frame-view.js','workbenches/catalogue-modular/art.js','workbenches/furnished-house/house-data.json','workbenches/bell-and-alder-sandbox/house-route-data.json','docs/art/catalogue-modular/webgl.json','docs/art/catalogue-modular/desktop-actions.json','docs/art/catalogue-modular/phone-actions.json','docs/art/catalogue-modular/cache-check.json'];
const preservedControls=fixedPaths.map(p=>{const current=fs.readFileSync(p),frozen=bytesAt(p),normalize=b=>b.toString('utf8').replace(/\r\n/g,'\n');return {path:p,workingSha256:sha(current),gitBlobSha256:sha(frozen),byteEqual:sha(current)===sha(frozen),normalizedTextEqual:normalize(current)===normalize(frozen)};});
check('Original fixtures and evidence preserved; authored JS retains matching normalized source',()=>{for(const p of preservedControls)assert(p.byteEqual||(/\.js$/.test(p.path)&&p.normalizedTextEqual),p.path);});
const inputPaths=['workbenches/bell-and-alder-sandbox/compose.js','workbenches/furnished-house/navigation.js','workbenches/furnished-house/simulation.js','workbenches/furnished-house/scene.js','workbenches/furnished-house/support.js','src/runtime/collision.js'];
const receipt={version:1,scope:'Focused source geometry, native collision/navigation (no slide), actual bearing/support-loss and renderer registration for the live H15 access variant. No fire replay, full action library, live-game frame-rate or final combined release acceptance.',control:H15_ACCESS_CONTROL,variant:variant.id,exportHashes:Object.fromEntries(['scene-data.json','shop-data.json','house-data.json'].map(f=>[f,sha(fs.readFileSync('workbenches/catalogue-modular/'+f))])),sourceHashes:Object.fromEntries(['art/source/catalogue-modular/h15-access-variant.mjs','art/source/catalogue-modular/export.mjs',...fixedPaths].map(f=>[f,sha(fs.readFileSync(f))])),runtimeInputs:{commit:git('-C',coder,'rev-parse','HEAD').trim(),workingSourceHashes:Object.fromEntries(inputPaths.map(p=>[p,sha(fs.readFileSync(path.join(coder,p)))]))},profile:{radius:.5,height:1.66,maxStep:.22,stepSampling:.025,slide:false},quantities:variant.quantities,moved:variant.moved,clipped:variant.clipped,added:variant.added,maxClipAttributeError,preservedControls,bearings,posts,rails,navigation:paths,originalControls:{exactControl,offsetControl},support:{scope:'Isolated H15 with the actual manifest-qualified explicit host flight and both named landings; retained native inferred stringer model',unresolvedInitial:graph.unresolvedInitial,stairFlights:graph.stairFlights,supportLoss},missingEdge,registration,checks,passed:true,limitations:['The existing flight uses the inherited inferred stringer; these added posts and bearers have measured contacts.','Body-cylinder fitting does not prove every posed species/equipment envelope.','Original 2db phone/fire/cache captures keep their original input pin. The architect/coder own the new combined keyboard/input/build gate.']};
fs.writeFileSync('docs/art/catalogue-modular/h15-access-125-checks.json',JSON.stringify(receipt,null,2)+'\n');live.dispose();original.dispose();
console.log(JSON.stringify({passed:true,checks:checks.length,paths:paths.map(p=>({offset:p.offset,direction:p.direction,passed:p.passed})),unresolvedInitial:graph.unresolvedInitial,registration:{meshes:registration.meshes,maxRelativeAreaError:registration.maxRelativeAreaError},quantities:variant.quantities}));
