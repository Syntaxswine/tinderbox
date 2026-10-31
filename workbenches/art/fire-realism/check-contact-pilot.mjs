import assert from 'node:assert/strict';
import fs from 'node:fs';
import {execFileSync} from 'node:child_process';
import {createHash} from 'node:crypto';
import * as T from '../../../src/runtime/three.js';
import {createContactTonguePilot} from '../../../assets/art/fire-realism/contact-pilot/index.js';
import {prepareContactTongues,contactCentre,contactSupportHeight,contactRootReaction,sampleContactReaction,assembleContactField} from '../../../assets/art/fire-realism/contact-pilot/contact-tongues.js';
import {prepareGroundSources,sampleGroundSources,GROUND_SOURCE_SIDE,groundFieldGLSL} from '../../../assets/art/fire-realism/contact-pilot/frozen-r09/ground-field.js';
import {createFireRealism as createFrozenR09} from '../../../assets/art/fire-realism/contact-pilot/frozen-r09/index.js';
import {diagnosticSnapshot,cameraRecord} from './diagnostic-data.js';
const base='a876ba6d5e998baa5be5b0ee7c029a1f3a85090d',root='assets/art/fire-realism/',pilotRoot=root+'contact-pilot/',hash=b=>createHash('sha256').update(b).digest('hex');
const activeManifest=JSON.parse(fs.readFileSync(root+'manifest.json'));
for(const path of [root+'manifest.json',...activeManifest.runtimeFiles.map(f=>f.path)])assert.deepEqual(fs.readFileSync(path),execFileSync('git',['show',`${base}:${path}`]),'Active R09 is untouched:'+path);
const provenance=JSON.parse(fs.readFileSync(pilotRoot+'provenance.json'));assert.equal(provenance.frozenBaseCommit,base);
for(const f of provenance.files){const bytes=fs.readFileSync(f.localPath);assert.deepEqual(bytes,execFileSync('git',['show',`${base}:${f.sourcePath}`]));assert.equal(bytes.length,f.bytes);assert.equal(hash(bytes),f.sha256);assert.ok(!bytes.includes(13));}
const fixture=JSON.parse(fs.readFileSync(new URL('./fixtures/frozen-match-diagnostic.json',import.meta.url))),snapshot=diagnosticSnapshot(fixture,60),cells=snapshot.cells.filter(c=>c.phase==='burning');
const camera=new T.OrthographicCamera(-6,6,4,-4,.05,100);camera.position.set(12,12,15);camera.lookAt(6,0,6);camera.updateMatrixWorld(true);
const bytes=new Uint8Array(40*32*4),borrowed=new T.DataTexture(bytes,40,32),fieldUniforms={field:{value:borrowed},grid:{value:new T.Vector2(40,32)},cellSize:{value:.5}};for(const c of cells)bytes[(Math.floor(c.y/.5)*40+Math.floor(c.x/.5))*4+3]=255;
let borrowedDisposed=0;borrowed.addEventListener('dispose',()=>borrowedDisposed++);
const frame=(time,source=cells,extra={})=>({version:1,tick:Math.round(time*60),worldTime:time,playerTime:time,paused:false,player:snapshot.player,cells:source,fieldUniforms,camera:cameraRecord(camera),viewport:{width:1280,height:800,pixelRatio:1},discharge:{active:false},events:[],buildingVisuals:[],...extra});
const e=createContactTonguePilot(T,{maxCells:64}),old=createFrozenR09(T,{maxCells:64}),mesh=x=>x.root.children.find(o=>o.isMesh),m=mesh(e).material;
const ownedResources=[mesh(e).geometry,m,m.uniforms.groundSources.value,m.uniforms.rayTable.value,m.uniforms.opaqueDepth.value],disposalCounts=new Map(ownedResources.map(r=>[r,0]));for(const r of ownedResources)r.addEventListener('dispose',()=>disposalCounts.set(r,disposalCounts.get(r)+1));
const packed=x=>{const g=mesh(x).geometry;return{ids:x.diagnostics().sortedSemanticIds,count:g.instanceCount,attributes:Object.fromEntries(Object.entries(g.attributes).filter(([,a])=>a.isInstancedBufferAttribute).map(([n,a])=>[n,[...a.array.slice(0,g.instanceCount*a.itemSize)]])),lights:x.root.children.filter(o=>o.isPointLight).map(l=>[l.position.toArray(),l.intensity])};};
try{
 const originalCells=JSON.stringify(cells);
 e.update(frame(0,[],{paused:true}));old.update(frame(0,[],{paused:true}));assert.equal(mesh(e).geometry.instanceCount,0);assert.equal(m.uniforms.pilotRootCount.value,0);
 assert.equal(m.premultipliedAlpha,true);assert.equal(m.blending,T.NormalBlending);assert.equal(m.fragmentShader.split('gl_FragColor.rgb*=gl_FragColor.a;').length,2);
 const newField=assembleContactField(groundFieldGLSL);assert.equal(m.vertexShader.replace(newField,groundFieldGLSL),mesh(old).material.vertexShader);assert.equal(m.fragmentShader.replace(newField,groundFieldGLSL),mesh(old).material.fragmentShader);assert.ok(m.vertexShader.includes(newField));assert.ok(m.fragmentShader.includes(newField));assert.ok(!newField.includes('abs(wrinkle-.51)'));assert.match(newField,/if\(f.x>result.x\)result=f/);
 assert.throws(()=>assembleContactField('unknown'),/Unknown/);
 for(const phase of [15,30,60,120]){
   const s=diagnosticSnapshot(fixture,phase),f=frame(s.clocks.world,s.cells,{tick:s.tick,playerTime:s.clocks.player,player:s.player});e.update(f);old.update(f);assert.deepEqual(packed(e),packed(old),'Existing cell domains, smoke source/history/support, masks and lights remain exact');
   const d=e.diagnostics(),p=d.contactPilot;assert.equal(p.count,3);assert.equal(p.sources.length,4);assert.equal(d.settings.groundDomainDensitySteps,32);assert.equal(d.resources.textures,3);assert.equal(d.settings.smokeTailSeconds,3.2);
   assert.equal(m.uniforms.pilotRootCount.value,3);assert.ok(p.roots.some(r=>r.height>.6));
   assert.equal(new Set(p.roots.map(r=>r.height.toFixed(4))).size,3,'Unequal source-rooted heights');
   for(const r of p.roots){assert.equal(r.sourceIds.length,4);assert.ok(r.origin[0]-r.radius>=p.bounds.min[0]);assert.ok(r.origin[2]+r.radius<=p.bounds.max[2]);}
   const storage=new Float32Array(GROUND_SOURCE_SIDE**2*4),sf=prepareGroundSources(s.cells.filter(c=>c.phase==='burning').map(c=>({...c,elevation:c.elevation??0,gas:false})),storage);
   for(const cell of s.cells.filter(c=>c.phase==='burning')){let samples=0;for(let ix=0;ix<16;ix++)for(let iz=0;iz<16;iz++){const x=cell.x-.25+(ix+.5)/32,z=cell.y-.25+(iz+.5)/32,coverage=sampleGroundSources(sf,storage,x,z)[3];if(sampleContactReaction(p,[x,.058,z],coverage)[0]>.005)samples++;}assert.ok(samples>0,'Each of the four authoritative source cells has attached reaction, not only an accounted ID');}
   const swapped=prepareContactTongues({...f,cells:[...f.cells].reverse()});assert.deepEqual(swapped,pickPrepared(p),'Source-array order cannot move roots');
 }
 assert.equal(JSON.stringify(cells),originalCells);
 // Property probes test geometry/density inequalities only, NOT GPU images.
 const p=prepareContactTongues(frame(1)),dup={...structuredClone(p),count:2,roots:[structuredClone(p.roots[0]),structuredClone(p.roots[0])]};let positive=0;
 for(let ri=0;ri<3;ri++)for(const u of [.05,.2,.4,.65,.85])for(let a=0;a<48;a++){
   const r=p.roots[ri],angle=a/48*Math.PI*2,c=contactCentre(r,u,p.worldTime),rho=r.radius*(1-u)*.91,point=[r.origin[0]+c[0]+Math.cos(angle)*rho,r.origin[1]+u*r.height,r.origin[2]+c[1]+Math.sin(angle)*rho],f=sampleContactReaction(p,point);
   const raw=contactRootReaction(p,ri,point);if(raw[0]>0)assert.ok(point[1]-r.origin[1]<=contactSupportHeight(p,point[0],point[2])+1e-9,'Unclipped per-root density fits the shared conservative support');
   if(f[0]>0){positive++;assert.ok(point[1]-r.origin[1]<=contactSupportHeight(p,point[0],point[2])+1e-9,'Density enclosed by shared cap support');}
   const both=sampleContactReaction(dup,point),one=sampleContactReaction({...dup,count:1,roots:[dup.roots[0]]},point);assert.deepEqual(both,one,'Overlapping identical tongues use MAX; no optical double paint');
 }
 assert.ok(positive>100,'Persistent attached and upper surface samples exist structurally');
 for(const x of [4.8,4.99999,6,6.2])for(const z of [8,8.5,9])for(const y of [.02,.3,.7,1.2]){assert.equal(sampleContactReaction(p,[x,y,z])[0],0,'No density outside actual eligible A');for(let i=0;i<3;i++)assert.equal(contactRootReaction(p,i,[x,y,z])[0],0,'Raw rooted morphology also stays within A');}
 for(const z of [7.99,9,9.01])for(const x of [5.1,5.5,5.9])assert.equal(sampleContactReaction(p,[x,.2,z])[0],0);
 assert.equal(sampleContactReaction(p,[5.24,.2,8.28],.5)[0],0,'Zero outer occupancy is retained');
 // Canonical all-spent transition removes roots/flames only; original smoke tail stays.
 e.reset();old.reset();e.update(frame(3.2));old.update(frame(3.2));e.update(frame(3.2+1/60,[]));old.update(frame(3.2+1/60,[]));assert.deepEqual(packed(e),packed(old));assert.equal(e.diagnostics().contactPilot.count,0);assert.equal(e.diagnostics().burningCells,0);assert.equal(e.diagnostics().smokeSourceCount,4);assert.equal(e.diagnostics().smokeColumns,1);
 e.update(frame(6.401,[]));assert.equal(mesh(e).geometry.instanceCount,0);
 // Pause keeps roots, clock and billows; camera/depth may still rebind in R09.
 e.reset();e.update(frame(1));const frozen=e.diagnostics().contactPilot,uniformObjects=[...m.uniforms.pilotOrigins.value,...m.uniforms.pilotMotions.value];e.update(frame(2,[],{paused:true,playerTime:100}));assert.deepEqual(e.diagnostics().contactPilot,frozen);assert.equal(e.diagnostics().worldTime,1);
 e.reset();e.update(frame(.35,cells,{playerTime:1.5}));const powder=e.diagnostics().contactPilot;e.reset();e.update(frame(.35,cells,{playerTime:999}));assert.deepEqual(e.diagnostics().contactPilot,powder,'Player clock cannot advance world-driven morphology');e.reset();e.update(frame(1));
 e.update(frame(1.2));assert.notDeepEqual(e.diagnostics().contactPilot.roots,frozen.roots);e.update(frame(.5));const rewound=e.diagnostics().contactPilot;e.reset();e.update(frame(.5));assert.deepEqual(e.diagnostics().contactPilot,rewound);
 e.update(frame(.6,cells,{eventReceipts:{generation:2,reset:true}}));assert.equal(e.diagnostics().contactPilot.count,3);e.update(frame(.7,[],{eventReceipts:{generation:3,reset:true}}));assert.equal(e.diagnostics().smokeColumns,0);assert.equal(e.diagnostics().contactPilot.count,0);
 for(let i=0;i<10;i++){e.reset();e.update(frame(1));assert.ok([...m.uniforms.pilotOrigins.value,...m.uniforms.pilotMotions.value].every((v,j)=>v===uniformObjects[j]),'Uniform Vector4 allocations are reused');assert.deepEqual(e.diagnostics().resources,{geometries:1,materials:1,textures:3});}
 for(const source of [cells.slice(0,3),cells.map((c,i)=>i?c:{...c,material:'wood'}),cells.map((c,i)=>i?c:{...c,depositedFuel:1}),cells.map((c,i)=>i?c:{...c,size:1}),cells.map((c,i)=>i?c:{...c,x:c.x+3})]){assert.throws(()=>e.update(frame(1,source)),/Contact pilot/);assert.equal(mesh(e).geometry.instanceCount,0);assert.equal(m.uniforms.pilotRootCount.value,0);}
 for(const extra of [{discharge:{active:true}},{player:{tool:'torch'},torch:{phase:'lit',remainingSeconds:1}},{buildingVisuals:[{id:'not-contact'}]}])assert.throws(()=>e.update(frame(1,[],extra)),/Contact pilot/);
 e.update(frame(1,[]));assert.equal(m.uniforms.pilotRootCount.value,0);
}finally{e.dispose();e.dispose();old.dispose();for(const count of disposalCounts.values())assert.equal(count,1,'Original owned GPU resources dispose once');assert.equal(borrowedDisposed,0);borrowed.dispose();assert.equal(borrowedDisposed,1);}
function pickPrepared(p){const{count,worldTime,sources,roots,bounds}=p;return{count,worldTime,sources,roots,bounds};}
console.log('PASS: active/frozen R09 byte preservation; exact4-cell/zero-source scope;3 unequal interior roots; shared support encloses reaction; no density outside A; max overlap; immutable source order; native domain/smoke/light preservation; pause/world/reset/rewind, finite original smoke tail, bounded allocations and borrowed ownership. NO actual WebGL/quality/motion/cost approval.');
