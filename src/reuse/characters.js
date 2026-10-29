import * as T from '../runtime/three.js';
import {createBearRig,loadBearKit,paintWithOwnership,BEAR_SOURCE_COMMIT} from './bear.js';
import {CIVILIAN_ASSET_BASE_URL} from './civilians.js';
import {CIVILIAN_PROFILES} from '../content/exterior-kit.js';
import {loadOwnedPair} from './loading.js';
import {createLightHorse} from '../../vendor/farmyard-commando/30a3b8cae5f36bb0c1df3685b7fba16f701c2083/sites/tactical-animal/dist/aft/tactics/horse-light-model.js';
import {createGoatWorker} from '../../vendor/farmyard-commando/30a3b8cae5f36bb0c1df3685b7fba16f701c2083/sites/tactical-animal/dist/aft/tactics/goat-worker.js';
import {createModelPaint,PAINT_FRAME} from '../../vendor/farmyard-commando/30a3b8cae5f36bb0c1df3685b7fba16f701c2083/sites/tactical-animal/dist/aft/tactics/horse-model-paint.js';
import {createWorkerLocomotion} from '../../vendor/farmyard-commando/30a3b8cae5f36bb0c1df3685b7fba16f701c2083/sites/tactical-animal/dist/aft/tactics/worker-locomotion.js';
export const FARMYARD_CHARACTER_COMMIT='30a3b8cae5f36bb0c1df3685b7fba16f701c2083';
export function createCharacterRig(characterId,data,{materials,unarmed=false}={}){
  if(characterId==='bear')return createBearRig(data,{materials,unarmed});
  const nativeFactory={goat:createGoatWorker,horse:createLightHorse}[characterId];if(!nativeFactory)throw Error('Unknown player character');
  const rig=createBearRig(data,{materials,unarmed,nativeFactory,species:characterId,profile:{id:characterId},sourceCommit:FARMYARD_CHARACTER_COMMIT,locomotionFactory:createWorkerLocomotion});
  const diagnostics=rig.diagnostics,release=rig.dispose;let closed=false;
  rig.diagnostics=()=>({...diagnostics(),species:characterId,characterId,sourceCommit:FARMYARD_CHARACTER_COMMIT,paintFrame:PAINT_FRAME,role:'player'});
  rig.dispose=()=>{if(closed)return;closed=true;release();rig.worker.skeleton.dispose();};return rig;
}
export async function loadCharacterKit({characterId='bear',THREE,renderer,materials,signal,...options}){
  if(characterId==='bear')return loadBearKit({THREE,renderer,materials,signal,...options});
  const profile=CIVILIAN_PROFILES[characterId];if(!profile)throw Error('Unknown player character');
  if(THREE?.SkinnedMesh!==T.SkinnedMesh||!(renderer instanceof T.WebGLRenderer))throw Error('Player character requires the borrowed shared renderer');
  if(signal?.aborted)throw new DOMException('Character load cancelled','AbortError');
  const base=new URL(CIVILIAN_ASSET_BASE_URL),loaded=await loadOwnedPair(
    fetch(new URL(profile.model,base),{signal}).then(r=>{if(!r.ok)throw Error('Player model HTTP '+r.status);return r.json();}),
    new T.TextureLoader().loadAsync(new URL(profile.paint,base).href),signal),texture=loaded.texture;
  const instances=new Set();let closed=false;
  return {create(){if(closed)throw Error('Character kit disposed');let rig,copy,paint;
    try{rig=createCharacterRig(characterId,loaded.model,{materials,unarmed:!!options.unarmed});copy=texture.clone();paint=paintWithOwnership(renderer,rig.worker,copy,(r,w,t)=>createModelPaint(r,w,t,{species:characterId,frame:PAINT_FRAME,sceneLighting:true}));rig.setPaint(paint);
      const release=rig.dispose;rig.dispose=()=>{release();instances.delete(rig);};instances.add(rig);return rig;
    }catch(error){if(!paint)copy?.dispose();rig?.dispose();throw error;}
  },diagnostics:()=>({disposed:closed,characterId,species:characterId,sourceCommit:FARMYARD_CHARACTER_COMMIT,instances:instances.size}),
    dispose(){if(closed)return;closed=true;for(const rig of [...instances])rig.dispose();texture.dispose();}};
}
export const CHARACTER_SOURCE_COMMITS=Object.freeze({goat:FARMYARD_CHARACTER_COMMIT,horse:FARMYARD_CHARACTER_COMMIT,bear:BEAR_SOURCE_COMMIT});
