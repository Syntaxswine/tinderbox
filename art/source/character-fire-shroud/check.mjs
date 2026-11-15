import fs from 'node:fs';import path from 'node:path';import {createHash} from 'node:crypto';import assert from 'node:assert/strict';
import * as T from '../../../src/runtime/three.js';
import {createChicago1893BeatUniform} from '../../../src/art/chicago-beat-uniform.js';
import {createCharacterShroud as capturedShroud} from './controls/visual-capture/index.js';
import {createCharacterShroud} from '../../../src/art/character-shroud/index.js';
import {createSplatPatch as adaptedSplats} from '../../../src/art/character-shroud/splats.js';
import {createSplatPatch as referenceSplats} from './upstream/7c60ba4b41f79de9dcca1f10b6e1dfffe9a74b26/workbenches/art/fire-realism/gaussian-patch/splats.js';
import {createBearWorker} from '../../../vendor/animal-factory-tactics-3d/4f5f53917990ec03b2f14c65f067e4b99ec8fcaa/dist/tactics/bear-worker.js';
import {createGoatWorker} from '../../../vendor/farmyard-commando/30a3b8cae5f36bb0c1df3685b7fba16f701c2083/sites/tactical-animal/dist/aft/tactics/goat-worker.js';
import {createLightHorse} from '../../../vendor/farmyard-commando/30a3b8cae5f36bb0c1df3685b7fba16f701c2083/sites/tactical-animal/dist/aft/tactics/horse-light-model.js';
const farm='vendor/farmyard-commando/30a3b8cae5f36bb0c1df3685b7fba16f701c2083/sites/tactical-animal/dist/aft/tactics/';
const specs=[['bear',createBearWorker,'vendor/animal-factory-tactics-3d/4f5f53917990ec03b2f14c65f067e4b99ec8fcaa/dist/tactics/bear-10k-data.json'],['goat',createGoatWorker,farm+'goat-10k-data.json'],['horse',createLightHorse,farm+'horse-10k-data.json']];
const scene=new T.Scene(),camera=new T.OrthographicCamera(-10.08,10.08,6.3,-6.3,.1,300);camera.position.set(10,14,12);camera.lookAt(0,1,0);camera.updateMatrixWorld(true);
const sampleWind=(_x,_y,_z,out)=>{out[0]=1.5;out[1]=out[2]=0;return out;},windMetadata={kind:'ambient-control',speed:1.5,direction:[1,0,0],obstacleResolved:false};
const workers=new Map(),parents=new Map(),checks=[],observations={};
function check(name,fn){fn();checks.push(name);}
const fire=(id,{active=true,startedAt=1,intensity=1}={})=>({id,active,startedAt,intensity});
const sha=b=>createHash('sha256').update(b).digest('hex');
for(const [species,factory,file]of specs){const worker=factory(JSON.parse(fs.readFileSync(file)));worker.pose('neutral',0);const parent=new T.Group();parent.add(worker.root);scene.add(parent);parent.updateMatrixWorld(true);workers.set(species,worker);parents.set(species,parent);}
const shroud=createCharacterShroud(T);scene.add(shroud.root);
for(const [species,worker]of workers)shroud.bind(species,{species,worker});
const update=(characters,time=3,effects)=>shroud.update({characters,worldTime:time,camera,sampleWind,windMetadata,effects});
const geometryState=effect=>{const mesh=effect.root.getObjectByProperty('isMesh',true);if(!mesh||!mesh.geometry.instanceCount)return [];return [...mesh.geometry.getAttribute('splatCenter').data.array.slice(0,mesh.geometry.instanceCount*14)];};
const snapshotWorker=w=>sha(Buffer.concat(w.parts.flatMap(m=>[...Object.values(m.geometry.attributes).map(a=>Buffer.from(a.array.buffer,a.array.byteOffset,a.array.byteLength)),Buffer.from(m.geometry.index.array.buffer)])));
const originalGeometry=Object.fromEntries([...workers].map(([id,w])=>[id,snapshotWorker(w)]));
try{
 check('Inactive and warm-only controls allocate no effect resources',()=>{update([...workers.keys()].map(id=>({...fire(id,{active:false}),heat:100,smoke:true})));assert.equal(shroud.diagnostics().fitBuilds,0);assert.equal(shroud.diagnostics().resources.geometries,0);assert.equal(shroud.diagnostics().flameSplats,0);});
 check('Native bear, goat and horse have 32 fitted bands, four cloth mounts and one shared draw',()=>{
  const input=Object.freeze([...workers.keys()].map(id=>Object.freeze(fire(id))));update(input);const d=shroud.diagnostics();assert.equal(d.activeIds.length,3);assert.equal(d.fits.length,3);for(const f of d.fits){assert.equal(f.bands,32);assert.equal(f.clothMounts,4);assert.deepEqual(f.nativeScale,[1,1,1]);}
  assert.equal(d.drawBatches,1);assert(d.flameSplats>=180);assert(d.flameSplats+d.smokeSplats<=3*88);assert.equal(d.resources.geometries,1);assert.equal(d.resources.materials,1);assert.equal(d.resources.lights,0);observations.threeNativeBodies=d;
 });
 check('Constant world time freezes effect attributes and rebinding retains fitted anchors',()=>{const before=geometryState(shroud),fits=shroud.diagnostics().fitBuilds;for(const [species,worker]of workers)shroud.bind(species,{species,worker});update([...workers.keys()].map(id=>fire(id)));assert.deepEqual(geometryState(shroud),before);assert.equal(shroud.diagnostics().fitBuilds,fits);});
 check('Heading, world movement and upper-floor elevation follow the real native root',()=>{
  update([fire('bear')]);const before=shroud.inspect().bands.filter(b=>b.id==='bear').map(b=>b.position);parents.get('bear').position.set(1.3,2.12,-.6);parents.get('bear').updateMatrixWorld(true);update([fire('bear')]);const moved=shroud.inspect().bands.filter(b=>b.id==='bear').map(b=>b.position);
  for(let i=0;i<before.length;i++)for(let axis=0;axis<3;axis++)assert(Math.abs(moved[i][axis]-before[i][axis]-[1.3,2.12,-.6][axis])<1e-5);
  workers.get('bear').root.rotation.y=-.8;update([fire('bear')]);const turned=shroud.inspect().bands.filter(b=>b.id==='bear');assert(turned.some((b,i)=>Math.hypot(b.position[0]-moved[i][0],b.position[2]-moved[i][2])>.1));observations.elevatedBounds={minY:Math.min(...turned.map(b=>b.position[1])),maxY:Math.max(...turned.map(b=>b.position[1]))};parents.get('bear').position.set(0,0,0);workers.get('bear').root.rotation.set(0,0,0);parents.get('bear').updateMatrixWorld(true);
 });
 check('Skinned motion moves bands and cloth tips with a stationary root',()=>{
  update([fire('goat')]);const before=shroud.inspect(),worker=workers.get('goat'),spine=worker.skeleton.bones.find(b=>b.name==='spine');assert(spine);const q=spine.quaternion.clone();spine.rotation.z+=.22;worker.root.updateMatrixWorld(true);update([fire('goat')]);const after=shroud.inspect();
  const bandTravel=Math.max(...before.bands.filter(b=>b.id==='goat').map((b,i)=>new T.Vector3(...b.position).distanceTo(new T.Vector3(...after.bands.filter(x=>x.id==='goat')[i].position))));
  const patchTravel=Math.max(...before.patches.filter(b=>b.id==='goat').map((b,i)=>{const a=after.patches.filter(x=>x.id==='goat')[i];return Math.hypot(b.x-a.x,b.y-a.y,b.z-a.z);}));assert(bandTravel>.01);assert(patchTravel>.01);observations.nativePoseTracking={bandTravel,patchTravel};spine.quaternion.copy(q);worker.root.updateMatrixWorld(true);
 });
 check('Actual Chicago replacement clothing supplies outer coat anchors and clearance',()=>{
  const worker=createGoatWorker(JSON.parse(fs.readFileSync(farm+'goat-10k-data.json'))),parent=new T.Group();parent.userData.species='goat';parent.add(worker.root);scene.add(parent);worker.pose('neutral',0);parent.updateMatrixWorld(true);
  const uniform=createChicago1893BeatUniform(T,{root:parent});try{
   assert.equal(worker.parts.find(m=>m.name==='connected shirt and sleeves').visible,false);
   shroud.bind('officer',{species:'goat',worker});update([fire('officer')]);const fit=shroud.diagnostics().fits.find(f=>f.id==='officer'),view=shroud.inspect();assert.equal(fit.outfit,'chicago-1893-city-beat');assert(fit.envelopeParts.some(n=>/frock skirt/.test(n)));assert(view.patches.filter(p=>p.id==='officer').every(p=>!/connected shirt|overalls/.test(p.mesh)));
   const coat=[];uniform.pieces.coat.traverse(m=>{if(m.isSkinnedMesh&&m.material.metalness<=.1)coat.push(m);});
   const caster=new T.Raycaster(),centre=new T.Vector3(),direction=new T.Vector3(),point=new T.Vector3(),clearances=[];
   for(const band of view.bands.filter(b=>b.id==='officer'&&[2,3].includes(b.row))){centre.set(0,band.position[1],0);point.fromArray(band.position);direction.copy(point).sub(centre);direction.y=0;direction.normalize();caster.set(point.clone().addScaledVector(direction,.5),direction.clone().negate());caster.far=1.5;const hit=caster.intersectObjects(coat,false)[0];if(hit)clearances.push(hit.distance-.5);}
   assert(clearances.length>=8);assert(Math.min(...clearances)>=0,JSON.stringify(clearances));observations.officerVisibleCloth={fit,actualCoatRayChecks:clearances.length,minBandOutsideCoat:Math.min(...clearances),maxBandOutsideCoat:Math.max(...clearances),patches:view.patches.filter(p=>p.id==='officer').map(p=>p.mesh)};
   const old=capturedShroud(T),current=createCharacterShroud(T),entries=[...workers.entries(),['officer',worker]];scene.add(old.root,current.root);
   try{for(const [id,model]of entries){const species=id==='officer'?'goat':id;old.bind(id,{species,worker:model});current.bind(id,{species,worker:model});}
    for(const time of [.1,.6,1.2,2.4,3.25]){const parameters={worldTime:time,camera,sampleWind,windMetadata,characters:entries.map(([id])=>fire(id,{active:time<2.75,startedAt:.02}))};old.update(parameters);current.update(parameters);assert.deepEqual(geometryState(current),geometryState(old));}
    observations.visualCaptureEquivalence={times:[.1,.6,1.2,2.4,3.25],bodies:4,exactSupportedSplatData:true,scope:'Only unsupported-binding reporting was added after the native preview; shader, fit, cloth and supported draw data match the preserved captured source.'};
   }finally{old.dispose();current.dispose();}

  }finally{shroud.unbind('officer');uniform.dispose();worker.dispose();worker.skeleton.dispose();parent.removeFromParent();}
 });
 check('Low intensity changes opacity without making warm-only state active',()=>{update([fire('horse')]);const strong=geometryState(shroud).filter((_,i)=>i%14===13).reduce((a,b)=>a+b,0);update([fire('horse',{intensity:.2})]);const low=geometryState(shroud).filter((_,i)=>i%14===13).reduce((a,b)=>a+b,0);assert(low<strong*.3);update([fire('horse',{active:false,intensity:1})]);assert.equal(shroud.diagnostics().flameSplats,0);assert.equal(shroud.diagnostics().smokeSplats,0);});
 check('Hidden ancestors, removal and expired/contact-exit state clear immediately',()=>{
  update([fire('horse')]);parents.get('horse').visible=false;update([fire('horse')]);assert.deepEqual(shroud.diagnostics().hiddenIds,['horse']);assert.equal(shroud.diagnostics().flameSplats,0);parents.get('horse').visible=true;parents.get('horse').removeFromParent();update([fire('horse')]);assert.equal(shroud.diagnostics().flameSplats,0);scene.add(parents.get('horse'));update([fire('horse')]);shroud.unbind('horse');assert.equal(shroud.diagnostics().flameSplats,0);shroud.bind('horse',{species:'horse',worker:workers.get('horse')});update([]);assert.equal(shroud.diagnostics().smokeSplats,0);
 });
 check('Invalid/unpublished state, unsupported body and capacity limits are explicit',()=>{
  update([{id:'bear',burn:{ignitedAt:1,expiresAt:5}}]);assert.deepEqual(shroud.diagnostics().unpublishedIds,['bear']);assert.equal(shroud.diagnostics().flameSplats,0);assert.equal(shroud.bind('unsupported',{species:'cat',worker:workers.get('goat')}),false);assert.deepEqual(shroud.diagnostics().unsupportedIds,['unsupported']);
  const limited=createCharacterShroud(T,{maxCharacters:1});scene.add(limited.root);for(const species of ['goat','horse'])limited.bind(species,{species,worker:workers.get(species)});limited.update({worldTime:3,camera,sampleWind,windMetadata,characters:[fire('goat'),fire('horse')]});assert.equal(limited.diagnostics().activeIds.length,1);assert.deepEqual(limited.diagnostics().cappedIds,['horse']);assert(limited.diagnostics().flameSplats+limited.diagnostics().smokeSplats<=88);limited.dispose();
 });
 check('Presentation switches, reset, rewind and repeated lifecycle remain bounded',()=>{
  update([fire('bear')],3,{flames:false,smoke:true});assert.equal(shroud.diagnostics().flameSplats,0);assert(shroud.diagnostics().smokeSplats>0);update([fire('bear')],3,{flames:true,smoke:false});assert.equal(shroud.diagnostics().smokeSplats,0);update([fire('bear')],3,{flames:false,smoke:false});assert.equal(shroud.diagnostics().flameSplats,0);
  for(let i=0;i<6;i++){shroud.reset();assert.equal(shroud.diagnostics().boundIds.length,0);shroud.bind('bear',{species:'bear',worker:workers.get('bear')});update([fire('bear')]);assert.equal(shroud.diagnostics().resources.geometries,1);update([]);assert.equal(shroud.diagnostics().flameSplats,0);}update([fire('bear')],.1);assert.equal(shroud.diagnostics().flameSplats,0);shroud.reset();
 });
 check('Native geometry, paint materials, authored scales and source controls are preserved',()=>{
  for(const [id,w]of workers){assert.equal(snapshotWorker(w),originalGeometry[id]);assert.deepEqual(w.root.scale.toArray(),[1,1,1]);}
  const provenance=JSON.parse(fs.readFileSync('art/source/character-fire-shroud/provenance.json'));for(const row of provenance.files)assert.equal(sha(fs.readFileSync(row.preservedPath)),row.sha256);
 });
 check('Default Gaussian patch data remains identical to the approved source',()=>{
  const original=referenceSplats(T,{maxPatches:1}),adapted=adaptedSplats(T,{maxPatches:1});const patches=[{x:0,y:0,z:0,seed:1893}];try{for(const time of [0,.1,.6,1.2,3.25]){original.update({time,patches,camera,sampleWind});adapted.update({time,patches,camera,sampleWind});assert.deepEqual(adapted.stats(),original.stats());assert.deepEqual(geometryState(adapted),geometryState(original));}}finally{original.dispose();adapted.dispose();}
 });
 shroud.dispose();check('Dispose releases owned resources and is idempotent',()=>{shroud.dispose();assert(Object.values(shroud.diagnostics().resources).every(n=>n===0));assert.equal(shroud.diagnostics().flameSplats,0);});
 const runtimeFiles=['index.js','fit.js','mounts.js','splats.js'].map(p=>'src/art/character-shroud/'+p),receipt={version:1,scope:'CPU native-model/factory/source controls; no gameplay ignition, WebGL image, GPU timing or combined-host acceptance claim.',sourceCommit:'7c60ba4b41f79de9dcca1f10b6e1dfffe9a74b26',checks,observations,sourceHashes:Object.fromEntries(runtimeFiles.map(p=>[p,sha(fs.readFileSync(p))])),passed:true};fs.writeFileSync('docs/art/character-fire-shroud/checks.json',JSON.stringify(receipt,null,2)+'\n');console.log(JSON.stringify({passed:true,checks:checks.length,nativeBodies:observations.threeNativeBodies.fits.map(f=>f.species),counts:{flame:observations.threeNativeBodies.flameSplats,smoke:observations.threeNativeBodies.smokeSplats},poseTracking:observations.nativePoseTracking,disposal:shroud.diagnostics().resources}));
}finally{shroud.dispose();for(const worker of workers.values()){worker.dispose();worker.skeleton.dispose();}}
