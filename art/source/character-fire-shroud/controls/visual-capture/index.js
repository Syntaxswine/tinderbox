import {createSplatPatch} from './splats.js';
import {fitNativeProfile,createNativeBands,seedOf,visibleInScene} from './fit.js';
import {createNativeClothMounts} from './mounts.js';

export const CHARACTER_SHROUD_SOURCE='7c60ba4b41f79de9dcca1f10b6e1dfffe9a74b26';
const SPECIES=new Set(['bear','goat','horse']);
// One identity-transform world-space batch; the host retains every native model.
export function createCharacterShroud(T,{maxCharacters=16}={}) {
  if(!Number.isInteger(maxCharacters)||maxCharacters<1||maxCharacters>32)throw RangeError('Character shroud capacity must be 1..32');
  const root=new T.Group();root.name='Approved native character fire shroud';
  const bindings=new Map(),states=new Map();let pool=null,disposed=false,lastFrame=null,lastWorld=-Infinity;
  let activeIds=[],missingBindingIds=[],cappedIds=[],unpublishedIds=[],invalidIds=[],hiddenIds=[],fitBuilds=0,updates=0,resets=0,lastUpdateMs=0;
  const now=()=>globalThis.performance?.now?.()??0;
  function refresh(worker){worker.root.updateWorldMatrix(true,false);worker.root.updateMatrixWorld(true);}
  function render() {
    activeIds=[];missingBindingIds=[];cappedIds=[];hiddenIds=[];
    if(disposed||!lastFrame){pool?.reset();return;}
    const {worldTime,camera,sampleWind,effects}=lastFrame,patches=[],bands=[];
    const flames=effects.flames!==false,smoke=effects.smoke!==false;
    for(const state of [...states.values()].sort((a,b)=>a.id.localeCompare(b.id))) {
      const binding=bindings.get(state.id);
      if(!binding){missingBindingIds.push(state.id);continue;}
      if(!visibleInScene(binding.worker.root)){hiddenIds.push(state.id);continue;}
      if(activeIds.length>=maxCharacters){cappedIds.push(state.id);continue;}
      activeIds.push(state.id);
      if(!flames&&!smoke)continue;
      refresh(binding.worker);
      if(!binding.fit){
        const profile=fitNativeProfile(T,binding.worker,binding.species),seed=seedOf(state.id);
        binding.fit={profile,cloth:createNativeClothMounts(T,binding.worker,profile,seed),bands:createNativeBands(T,binding.worker,profile,seed)};fitBuilds++;
      }
      const fit=binding.fit,age=state.fire.age,intensity=state.fire.intensity;
      patches.push(...fit.cloth.update(worldTime,age,flames?intensity:0,smoke?intensity:0));
      bands.push(...fit.bands.update(worldTime,age,flames?intensity:0,sampleWind));
    }
    if(!patches.length){pool?.reset();return;}
    if(!camera?.isCamera)throw TypeError('Active character shroud requires the current shared camera');
    if(!pool){pool=createSplatPatch(T,{maxPatches:maxCharacters*4,flameGain:[2.9,1.95,1.25]});root.add(pool.root);}
    pool.update({time:worldTime,patches,bands,camera,sampleWind});
  }
  function bind(id,{species,worker}={}) {
    if(disposed)throw Error('Character shroud disposed');
    if(typeof id!=='string'||!id||!SPECIES.has(species)||!(worker?.root instanceof T.Object3D)||!Array.isArray(worker.parts)||!worker.parts.length||worker.parts.some(p=>!(p instanceof T.SkinnedMesh)))throw TypeError('Bind a stable ID to an actual supported native worker/root/parts');
    const old=bindings.get(id);if(old?.worker===worker&&old.species===species)return true;
    bindings.set(id,{species,worker,fit:null});if(old&&states.has(id))render();return true;
  }
  function unbind(id) {const removed=bindings.delete(id);states.delete(id);if(removed)render();return removed;}
  function reset() {bindings.clear();states.clear();pool?.reset();lastFrame=null;lastWorld=-Infinity;activeIds=[];missingBindingIds=[];cappedIds=[];unpublishedIds=[];invalidIds=[];hiddenIds=[];resets++;}
  function update({worldTime,camera,characters=[],sampleWind,windMetadata,effects={}}={}) {
    if(disposed)return false;
    if(!Number.isFinite(worldTime)||!Array.isArray(characters))throw TypeError('Character shroud needs finite authoritative worldTime and detached character records');
    const start=now();
    if(worldTime<lastWorld-1e-8)for(const binding of bindings.values())binding.fit=null;
    lastWorld=worldTime;lastFrame={worldTime,camera,sampleWind:typeof sampleWind==='function'?sampleWind:undefined,windMetadata:structuredClone(windMetadata??{kind:'not-supplied'}),effects:{flames:effects.flames!==false,smoke:effects.smoke!==false}};
    states.clear();unpublishedIds=[];invalidIds=[];const seen=new Set();
    for(const character of characters){
      if(typeof character?.id!=='string'||!character.id||seen.has(character.id))throw TypeError('Character shroud needs unique stable character IDs');seen.add(character.id);
      if(typeof character.active!=='boolean'){unpublishedIds.push(character.id);continue;}
      if(!character.active)continue;
      const intensity=character.intensity??1,startedAt=character.startedAt;
      if(!Number.isFinite(startedAt)||!Number.isFinite(intensity)||intensity<0||intensity>1){invalidIds.push(character.id);continue;}
      if(intensity===0)continue;
      states.set(character.id,{id:character.id,fire:{active:true,intensity,age:Math.max(0,worldTime-startedAt)}});
    }
    render();updates++;lastUpdateMs=now()-start;return true;
  }
  function diagnostics() {
    const stats=pool?.stats()??{patches:0,flameSplats:0,smokeSplats:0};
    return {version:1,sourceCommit:CHARACTER_SHROUD_SOURCE,disposed,worldTime:Number.isFinite(lastWorld)?lastWorld:null,maxCharacters,maxSplatsPerCharacter:88,
      boundIds:[...bindings.keys()].sort(),activeIds:[...activeIds],missingBindingIds:[...missingBindingIds],unpublishedIds:[...unpublishedIds],invalidIds:[...invalidIds],hiddenIds:[...hiddenIds],cappedIds:[...cappedIds],
      ...stats,updates,resets,fitBuilds,lastUpdateMs,clock:'authoritative-world',angularOnset:'Deterministic actor-ID visual default; no mesh-impact provenance',wind:structuredClone(lastFrame?.windMetadata??{kind:'not-supplied'}),windSamplerSupplied:!!lastFrame?.sampleWind,
      fits:[...bindings].filter(([,b])=>b.fit).map(([id,b])=>({id,species:b.species,nativeScale:b.worker.root.scale.toArray(),clothingBindBounds:structuredClone(b.fit.profile.bounds),effectFit:[b.fit.profile.sx,b.fit.profile.sy,b.fit.profile.sz],outfit:b.fit.profile.outfit,envelopeParts:b.fit.profile.envelopeParts.map(m=>m.name),bands:b.fit.bands.bands.length,clothMounts:b.fit.cloth.mounts.length,clothParts:b.fit.profile.cloth.map(m=>m.name)})),
      resources:{geometries:pool?1:0,materials:pool?1:0,textures:0,lights:0,renderers:0},drawBatches:stats.flameSplats+stats.smokeSplats>0?1:0};
  }
  function inspect() {return {bands:[...bindings].filter(([,b])=>b.fit).flatMap(([id,b])=>b.fit.bands.bands.map(v=>({id,row:v.row,position:[v.worldX,v.worldY,v.worldZ],alpha:v.alpha,mesh:v.anchor.mesh.name,vertex:v.anchor.index}))),patches:[...bindings].filter(([,b])=>b.fit).flatMap(([id,b])=>b.fit.cloth.mounts.map(m=>({id,...m.patch,mesh:m.meshName})))};}
  function dispose() {if(disposed)return;reset();pool?.dispose();pool=null;root.removeFromParent();root.clear();disposed=true;}
  return {root,bind,unbind,update,reset,diagnostics,inspect,dispose};
}
