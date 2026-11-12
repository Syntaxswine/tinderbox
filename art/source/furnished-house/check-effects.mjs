import fs from 'node:fs';
import path from 'node:path';
import {execFileSync} from 'node:child_process';
import {pathToFileURL} from 'node:url';
import {createHash} from 'node:crypto';
import assert from 'node:assert/strict';
import * as T from '../../../src/runtime/three.js';
import {createFurnishedHouseArt} from '../../../workbenches/furnished-house/art.js';
import {createWallShroud} from './shroud.js';
import {houseEffectBounds,createCameraCuller,hasBoundedHouseWind} from './visibility.js';
const pin='25095656',data=JSON.parse(fs.readFileSync('workbenches/furnished-house/house-data.json'));
const groups=[],combinations=[],pass=name=>groups.push(name),hash=s=>createHash('sha256').update(s).digest('hex');
const frame=(changes={})=>({version:1,revision:300,tick:9000,worldTime:10,full:false,boundaries:[],supports:[],items:[],parts:[],falls:[],rubble:[],tombstones:[],events:[],fireSamples:[],...changes});
const camera=new T.OrthographicCamera(-10,10,8,-8,.1,100);camera.position.set(18,14,-20);camera.lookAt(5,2,4);camera.updateMatrixWorld(true);
const wind=(x,y,z,out)=>{out.set([1.5,0,0]);return out;};
const view={mode:'exterior',camera,sampleWind:wind,windMetadata:{kind:'ambient-control',speed:1.5,direction:[1,0,0],obstacleResolved:false}};
const position=s=>s.triangles.flat().reduce((a,p)=>(p.forEach((v,i)=>a[i]+=v),a),[0,0,0]).map(v=>v/s.triangles.flat().length);
const sample=(id,s,extra={})=>{const p=position(s);return {id,sourceSurfaceId:s.id,part:s.kind,x:p[0],y:p[1],z:p[2],nx:s.normal[0],ny:s.normal[1],nz:s.normal[2],area:.25,flame:.9,smoke:.6,ignitionTime:0,...extra};};
const floor=data.surfaces.find(s=>s.id==='floor/l0/4,8'),adjacent=data.surfaces.find(s=>s.id==='floor/l0/5,8'),upper=data.surfaces.find(s=>s.id==='floor/l1/4,8');
const wall=data.surfaces.find(s=>s.kind==='wall'&&s.level===0&&s.normal[0]===-1),roof=data.surfaces.find(s=>s.kind==='roof'),window=data.surfaces.find(s=>s.kind==='window');
assert.ok(floor&&adjacent&&upper&&wall&&roof&&window);
const samples=[sample('floor-a',floor,{floorFootprint:floor.triangles}),sample('floor-b',adjacent,{floorFootprint:adjacent.triangles}),sample('face',wall),sample('roof',roof),sample('ceiling',upper,{y:upper.bounds.max[1]-.12,ny:-1,floorFootprint:upper.triangles}),sample('preheat',wall,{flame:0,preheat:true}),sample('vent',window,{vent:true})];
const publication=frame({fireSamples:samples}),before=JSON.stringify(publication),beforeData=JSON.stringify(data);
const baselineDir='artifacts/helpers/fire-effect-visibility/controls';fs.mkdirSync(baselineDir,{recursive:true});
const sourceHashes={};
for(const [name,file]of [['shroud','art/source/furnished-house/shroud.js'],['presentation','art/source/furnished-house/presentation.js'],['art','workbenches/furnished-house/art.js']]){
 let source=execFileSync('git',['show',pin+':'+file]).toString('utf8');sourceHashes[file]=hash(source);
 const sourceUrl=pathToFileURL(path.resolve(file));
 source=source.replace(/from '([^']+)'/g,(match,spec)=>{let target=new URL(spec,sourceUrl).href;if(spec.endsWith('/shroud.js'))target=pathToFileURL(path.resolve(baselineDir,'shroud.js')).href;if(spec.endsWith('/presentation.js'))target=pathToFileURL(path.resolve(baselineDir,'presentation.js')).href;return "from '"+target+"'";});
 fs.writeFileSync(path.join(baselineDir,name+'.js'),source);
}
const baseline=await import(pathToFileURL(path.resolve(baselineDir,'art.js')).href);
const a=await createFurnishedHouseArt(T,{data}),b=await baseline.createFurnishedHouseArt(T,{data});
const bare=s=>({sourceId:s.sourceId,part:s.part,smoke:s.smoke,position:s.position,sigma:s.sigma,lean:s.lean,alpha:s.alpha,supportY:s.supportY});
try{
 a.update(publication,view);b.update(publication,view);
 const reference=a.inspect().splats.map(bare),oldReference=b.inspect().splats.map(bare);
 assert.deepEqual(reference,oldReference);
 assert.deepEqual(a.diagnostics().actualLights,b.diagnostics().actualLights);
 assert.deepEqual(a.inspect().emitters.map(e=>[e.id,e.anchor,...(samples.find(q=>q.id===e.id).flame>0?[e.supportRadius,e.tangentRadius,e.overlapGroup,e.overlapSources]:[])]),b.inspect().emitters.map(e=>[e.id,e.anchor,...(samples.find(q=>q.id===e.id).flame>0?[e.supportRadius,e.tangentRadius,e.overlapGroup,e.overlapSources]:[])]));
 pass('All-on reference splats, connected envelopes, anchors and actual local lights exactly match immutable25095656');
 const referenceLights=a.diagnostics().actualLights,patches=a.inspect().patches;
 for(let mask=0;mask<8;mask++){
  const effects={flames:!!(mask&1),smoke:!!(mask&2),lighting:!!(mask&4)};
  a.update(publication,{...view,effects});
  const d=a.diagnostics(),work=d.effectWork,current=a.inspect().splats.map(bare);
  assert.equal(d.missingSamples,0);assert.equal(d.representedSamples,samples.length);
  assert.deepEqual(current.filter(s=>!s.smoke),effects.flames?reference.filter(s=>!s.smoke):[]);
  assert.deepEqual(current.filter(s=>s.smoke),effects.smoke?reference.filter(s=>s.smoke):[]);
  assert.deepEqual(d.actualLights,effects.lighting?referenceLights:[]);
  if(!effects.flames){assert.equal(work.work.flameEnvelopeSources,0);assert.equal(work.work.flameCalls,0);assert.equal(work.generatedFlameSplats,0);}
  if(!effects.smoke){assert.equal(work.work.smokeCalls,0);assert.equal(work.generatedSmokeSplats,0);}
  assert.equal(work.work.lightClusterCalls,effects.lighting?1:0);
  if(mask===0){assert.equal(work.preparedSources,0);assert.equal(work.work.supportAnchorSources,0);}
  assert.deepEqual(a.inspect().patches,patches);assert.equal(JSON.stringify(publication),before);
  combinations.push({mask,effects,counts:work});
 }
 pass('All eight masks preserve each enabled channel exactly; disabled generation/envelopes/clustering are zero; char state and authoritative input stay unchanged');
 a.update(publication,{...view,effects:{flames:'no',smoke:null,lighting:0,unknown:false}});
 assert.deepEqual(a.diagnostics().effects,{flames:true,smoke:true,lighting:true});
 assert.deepEqual(a.inspect().splats.map(bare),reference);
 pass('Omitted and malformed preference values preserve all-on compatibility and snapshots are detached');
 const away=new T.OrthographicCamera(-2,2,2,-2,.1,100);away.position.set(1000,20,-20);away.lookAt(1000,2,4);away.updateMatrixWorld(true);
 a.update(publication,{...view,camera:away});
 let d=a.diagnostics();assert.ok(d.effectWork.cameraCulledSources>0);assert.equal(d.effectWork.work.flameEnvelopeSources,0);assert.equal(d.effectWork.work.flameCalls,0);assert.equal(d.effectWork.work.smokeCalls,0);assert.deepEqual(d.actualLights,referenceLights);
 a.update(publication,{...view,camera:away,effects:{lighting:false}});d=a.diagnostics();assert.equal(d.effectWork.preparedSources,0);assert.equal(d.effectWork.work.supportAnchorSources,0);assert.equal(d.missingSamples,0);
 a.update(publication,view);assert.deepEqual(a.inspect().splats.map(bare),reference);assert.deepEqual(a.diagnostics().actualLights,referenceLights);
 pass('Entire off-camera groups skip support and generation when lighting is off; off-camera local illumination survives; return at the same world time has no cold start');
 const row=data.surfaces.filter(s=>s.kind==='floor'&&s.level===0&&s.id.endsWith(',8')).map((s,i)=>sample('row-'+i,s,{flame:1,smoke:0,floorFootprint:s.triangles}));
 const nearCamera=new T.OrthographicCamera(-.4,.4,2,-2,.1,100);nearCamera.position.set(1.25,.7,-20);nearCamera.lookAt(1.25,.7,4.25);nearCamera.updateMatrixWorld(true);
 const rowFrame=frame({fireSamples:row});a.update(rowFrame,{...view,camera:nearCamera,effects:{smoke:false,lighting:false}});b.update(rowFrame,{...view,camera:nearCamera});
 assert.ok(a.diagnostics().effectWork.work.flameContextSources>0);
 const visibleIds=new Set(a.inspect().emitters.filter(e=>e.flames).map(e=>e.id));
 assert.deepEqual(a.inspect().splats.map(bare),b.inspect().splats.filter(s=>visibleIds.has(s.sourceId)).map(bare));
 for(const e of a.inspect().emitters)assert.equal(e.overlapSources,row.length);
 pass('A partially off-camera connected floor group keeps all context and exactly preserves visible baseline flame shapes');

 const flameHidden=frame({fireSamples:[sample('upper-top',upper,{floorFootprint:upper.triangles})]});
 a.update(flameHidden,{...view,mode:'cutaway',level:0,effects:{smoke:false,lighting:false}});
 d=a.diagnostics();assert.equal(d.effectWork.channels.flames.viewCulled,1);assert.equal(d.effectWork.preparedSources,0);assert.equal(d.effectWork.work.supportAnchorSources,0);
 a.update(frame({fireSamples:[samples[4]]}),{...view,mode:'cutaway',level:0});
 assert.equal(a.inspect().emitters[0].part,'ceiling');assert.equal(a.inspect().emitters[0].presentationLevel,0);assert.ok(a.inspect().splats.length>0);
 for(const s of a.inspect().splats)assert.ok(s.position[1]+2.6*Math.hypot(...s.sigma)<upper.bounds.max[1]-.12);
 pass('Cutaway rejects known hidden levels before support work and retains actual underside fire/smoke below the intact slab');
 const smokePuff=reference.find(s=>s.smoke&&Math.abs(s.position[1]-samples.find(q=>q.id===s.sourceId).y)>.6);assert.ok(smokePuff);
 const plumeCamera=new T.OrthographicCamera(-.12,.12,.12,-.12,.1,100);plumeCamera.position.set(smokePuff.position[0],smokePuff.position[1],smokePuff.position[2]-10);plumeCamera.lookAt(...smokePuff.position);plumeCamera.updateMatrixWorld(true);
 a.update(frame({fireSamples:[samples.find(q=>q.id===smokePuff.sourceId)]}),{...view,camera:plumeCamera,effects:{flames:false,lighting:false}});
 assert.ok(a.diagnostics().effectWork.smokeSplats>0);assert.equal(a.inspect().emitters[0].smoke,true);
 pass('A smoke plume stays submitted when its base is outside a narrow camera view');
 a.update(publication,{...view,camera:away,windMetadata:undefined,effects:{lighting:false}});
 assert.equal(a.diagnostics().effectWork.cameraCulledSources,0);assert.equal(a.diagnostics().effectWork.uncertainCameraSources,samples.length);assert.ok(a.diagnostics().effectWork.work.smokeCalls>0);
 assert.equal(createCameraCuller(T,away)(null),false);assert.equal(hasBoundedHouseWind({sampleWind:wind}),false);assert.equal(houseEffectBounds({...samples[0],nx:2},'smoke'),null);
 pass('Arbitrary samplers, ambiguous normals and unknown bounds retain effects rather than becoming successful culls');
 const invalid=[{...samples[0],id:'nan-source',flame:NaN},{...samples[0],id:'unknown-source',sourceSurfaceId:'unknown',x:10000,z:10000,floorFootprint:undefined},{...samples[0],id:'invalid-footprint',floorFootprint:[]}];
 a.update(frame({fireSamples:invalid}),{...view,camera:away,effects:{flames:false,smoke:false,lighting:false}});
 assert.equal(a.diagnostics().missingSamples,3);assert.equal(a.diagnostics().representedSamples,0);assert.equal(a.diagnostics().effectWork.cameraCulledSources,0);
 pass('Malformed/unknown ownership and invalid footprints remain missing even with all channels off and camera away');
 const real=JSON.parse(fs.readFileSync('art/source/furnished-house/fixture-real-refall.json'));
 const dynamic=frame({falls:[real.fall],tombstones:real.tombstones,fireSamples:[real.fireSample]});
 a.update(dynamic,{...view,mode:'cutaway',level:0,effects:{flames:false,smoke:false,lighting:false}});
 assert.equal(a.diagnostics().missingSamples,0);assert.equal(a.inspect().emitters[0].supportOrigin,'airborne');
 a.update(frame({fireSamples:[real.fireSample]}),{...view,mode:'exterior'});
 assert.equal(a.diagnostics().missingSamples,0);assert.equal(a.inspect().emitters[0].fallId,real.fall.id);
 pass('Exact real88s refall ownership survives an all-off paused draw and re-enable with empty retained collection deltas');
 assert.equal(JSON.stringify(data),beforeData);assert.equal(JSON.stringify(publication),before);
 pass('Borrowed native1x1x2.12 source and every supplied simulation field remain byte-equivalent');
 // Check full oriented-support containment over representative part/time/wind extremes.
 const fx=createWallShroud(T,{profile:'house'});let envelopes=0;
 try{
  for(const part of ['ground','walls','roof','ceiling'])for(const age of [.01,.2,1,1.79,2,6,19])for(const speed of [-1e6,0,1e6]){
   const q={id:'bounds-'+part,x:0,y:2,z:0,nx:part==='walls'?1:part==='roof'?.6:0,ny:part==='walls'?0:part==='ceiling'?-1:part==='roof'?.8:1,nz:0,part,flame:1,smoke:1,area:.25,ignitionTime:0,supportRadius:.24,floorRadius:.24,supportBounds:{min:[-.25,1.5,-.25],max:[.25,2.5,.25]},tangentRadius:.24};
   const sampler=(x,y,z,out)=>{out.set([speed,speed,-speed]);return out;};
   fx.root.visible=true;fx.update({time:age,cells:[q],camera,sampleWind:sampler});
   for(const splat of fx.inspect()){
    const b=houseEffectBounds(q,splat.smoke?'smoke':'flames'),extent=2.6*Math.max(...splat.sigma);
    for(let axis=0;axis<3;axis++)assert.ok(splat.position[axis]-extent>=b.min[axis]-1e-9&&splat.position[axis]+extent<=b.max[axis]+1e-9,JSON.stringify({part,age,speed,splat,b,axis}));
   }
   envelopes++;
  }
 }finally{fx.dispose();}
 pass('Full Gaussian support stays inside conservative bounds across84 part/age/extreme-wind cases');
 fs.mkdirSync('docs/art/fire-effect-settings',{recursive:true});
 fs.writeFileSync('docs/art/fire-effect-settings/checks.json',JSON.stringify({passed:groups.length,failed:0,baseline:pin,sourceHashes,groups,combinations,envelopeCases:envelopes,limits:['Finite Node/Three checks. No WebGL/pixel or hardware timing claim; architect owns the single combined browser session.','Shared anchor selection remains for smoke/local light to preserve exact independent output. Connected groups retain off-camera context.']},null,2)+String.fromCharCode(10));
 console.log(JSON.stringify({passed:groups.length,failed:0,masks:combinations.length,envelopeCases:envelopes}));
}finally{a.dispose();b.dispose();}
