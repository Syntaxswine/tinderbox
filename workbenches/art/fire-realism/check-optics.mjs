// Scope, source and lifecycle guards. No WebGL shader/pixel acceptance.
import assert from 'node:assert/strict';
import fs from 'node:fs';
import * as T from '../../../src/runtime/three.js';
import {createFireRealism} from '../../../assets/art/fire-realism/index.js';
import {createFireRealism as control08} from './control-08/index.js';
import {diagnosticSnapshot} from './diagnostic-data.js';
import {associatedFieldShader} from './diagnostic-stream.js';
import {resolveDischarge} from '../../../src/simulation/discharge.js';
const current = name => fs.readFileSync(new URL('../../../assets/art/fire-realism/'+name,import.meta.url),'utf8');
const original = name => fs.readFileSync(new URL('./control-08/'+name,import.meta.url),'utf8');
for(const name of ['geometry.js','smoke-billows.js'])assert.equal(current(name),original(name),name+' remains byte-identical');
const expectedGround=original('ground-field.js').replace('    float contact=exp(-h*14.)*(.020+.12*sheet);','    // Short source-attached reaction: shared sheet/pocket variation, smooth\n    // falloff and exact zero at0.24m; no flat lid or upper-column fog floor.\n    float contact=(1.-smoothstep(.025,.24,h))*(.035+.36*sheet)*(.35+.65*pocket);');
assert.equal(current('ground-field.js'),expectedGround,'No source texture, height, sheet, pocket, edge, fuel or catchment changes');
assert.equal(current('shaders.js'),original('shaders.js').replace('den*stepSize*7.4','den*stepSize*22.2').replace('    #include <colorspace_fragment>\n','    #include <colorspace_fragment>\n    // Associate encoded RGB by FINAL alpha, including player legibility.\n    gl_FragColor.rgb*=gl_FragColor.a;\n'),'Only regional extinction and final common association change; jet/torch/smoke/facade branch source unchanged');
assert.equal(current('index.js'),original('index.js').replace("'0.8.0-reference-candidate'","'0.9.0-reference-candidate'").replace('toneMapped: false, forceSinglePass: true});','toneMapped: false, premultipliedAlpha: true, forceSinglePass: true});'),'Only artist version and matching material association state change');
const e=createFireRealism(T,{maxCells:64}),c=control08(T,{maxCells:64}),mesh=x=>x.root.children.find(o=>o.isMesh);
const material=mesh(e).material,oldMaterial=mesh(c).material;
assert.equal(material.premultipliedAlpha,true);assert.equal(material.blending,T.NormalBlending);assert.equal(oldMaterial.premultipliedAlpha,false);
assert.equal(material.fragmentShader.split('gl_FragColor.rgb*=gl_FragColor.a;').length,2);
assert.ok(material.fragmentShader.indexOf('gl_FragColor.rgb*=gl_FragColor.a;')>material.fragmentShader.lastIndexOf('#include <colorspace_fragment>'));
assert.match(material.fragmentShader,/gl_FragColor=vec4\(emission\/max\(\.0001,alpha\),alpha\*legibility\);/);
assert.throws(()=>associatedFieldShader(material.fragmentShader),/Unknown final/,'R09 cannot accidentally enter the original control association wrapper');
for(const key of ['depthTest','depthWrite','side','toneMapped','forceSinglePass','transparent'])assert.equal(material[key],oldMaterial[key]);
const fixtureData=JSON.parse(fs.readFileSync(new URL('./fixtures/frozen-match-diagnostic.json',import.meta.url))),edges=JSON.parse(fs.readFileSync(new URL('./fixtures/edge-source-snapshots.json',import.meta.url))),maskData=new Uint8Array(40*32*4),borrowed=new T.DataTexture(maskData,40,32);
let borrowedDisposed=0;borrowed.addEventListener('dispose',()=>borrowedDisposed++);
const fieldUniforms={field:{value:borrowed},grid:{value:new T.Vector2(40,32)},cellSize:{value:.5}};
const camera=new T.OrthographicCamera(-6,6,4,-4,.05,100);camera.position.set(12,12,15);camera.lookAt(6,0,6);camera.updateMatrixWorld(true);
const cam={kind:'orthographic',matrixWorld:camera.matrixWorld.toArray(),matrixWorldInverse:camera.matrixWorldInverse.toArray(),projectionMatrix:camera.projectionMatrix.toArray()};
const frame=(worldTime,cells,extra={})=>({version:1,tick:Math.round(worldTime*60),worldTime,playerTime:worldTime,paused:false,player:{x:-5,y:-5,radius:.56,tool:'matches'},cells,fieldUniforms,camera:cam,viewport:{width:1280,height:800,pixelRatio:1},anchors:{muzzle:{x:2,y:.85,z:5},torchTip:{x:1,y:1,z:1}},events:[],buildingVisuals:[],...extra});
const packed=x=>{const g=mesh(x).geometry;return {count:g.instanceCount,ids:x.diagnostics().sortedSemanticIds,arrays:Object.fromEntries(Object.entries(g.attributes).filter(([,a])=>a.isInstancedBufferAttribute).map(([name,a])=>[name,[...a.array.slice(0,g.instanceCount*a.itemSize)]])),lights:x.root.children.filter(o=>o.isPointLight).map(o=>[o.position.toArray(),o.intensity]),sourceTexture:[...mesh(x).material.uniforms.groundSources.value.image.data]};};
const compare=f=>{maskData.fill(0);for(const q of f.cells)if(q.phase==='burning')maskData[(Math.floor(q.y/.5)*40+Math.floor(q.x/.5))*4+3]=255;const before=JSON.stringify(f.cells);e.reset();c.reset();e.update(f);c.update(f);assert.deepEqual(packed(e),packed(c));assert.equal(JSON.stringify(f.cells),before);assert.equal(mesh(e).material.uniforms.field.value,borrowed);assert.equal(mesh(c).material.uniforms.field.value,borrowed);};
try{
  for(const phase of[15,30,60,120]){const s=diagnosticSnapshot(fixtureData,phase);for(const q of s.cells.filter(q=>q.phase==='burning'))assert.equal(q.intensity,1);compare(frame(s.clocks.world,s.cells,{tick:s.tick,playerTime:s.clocks.player,player:s.player}));}
  for(const s of edges.fixtures)compare(frame(s.worldTime,s.cells,{tick:s.tick,playerTime:s.playerTime}));
  compare(frame(1,[],{player:{x:-5,y:-5,radius:.56,tool:'torch'},torch:{phase:'lit',remainingSeconds:4}}));
  const complex={tick:1,player:{x:2,y:5,tool:'flamethrower',heading:0},obstacles:Array.from({length:80},(_,i)=>({id:`obstacle-${i}`,kind:'wall',x:5+i%10*.11,y:4.6+Math.floor(i/10)*.105,width:.032,depth:.028}))};
  const discharge=resolveDischarge(complex,{tools:{presentationHeight:.85,flamethrower:{range:5,halfAngle:.5},torch:{radius:1}}},{width:12,height:12});assert.equal(discharge.rays.length,25);assert.equal(discharge.connectRays,false);compare(frame(1,[],{discharge,player:complex.player}));
  assert.equal(e.diagnostics().settings.groundDomainDensitySteps,32);assert.equal(e.diagnostics().settings.smokeTailSeconds,3.2);
}finally{e.dispose();c.dispose();assert.equal(borrowedDisposed,0);borrowed.dispose();assert.equal(borrowedDisposed,1);}
console.log('PASS: exact bounded R09 source delta; proper single final-alpha association +NormalBlending/premult state; unchanged geometry/smoke/jet/torch/facade branches; actual4-phase full-intensity match/normal+powder masks and real25-ray source records/lights/storage unchanged; borrowed ownership intact. Actual WebGL/motion/quality/cost remain unaccepted.');
