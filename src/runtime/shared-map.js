import {createRuntime} from './index.js';
import {loadLandmark} from './landmark.js';
import {compileSharedMap} from '../content/shared-map.js';
import {createMapStructureArt} from '../art/shared-map.js';
import {createSharedMapPresentation} from './shared-map-presentation.js';

export const MAP_SOURCE_PINS=Object.freeze({'new-york':Object.freeze({index:'e9bee63a5a4afb0f8513d083b7e5f1ce83f25c0441ea543e14901b70e4e0cdab',library:'1e93eb730de7a978b01069df5401ea80d4ddebcff7d101010714e8b4643fc296'})});
async function pinnedJSON(url,expected,signal){
  const response=await fetch(url,{signal});if(!response.ok)throw Error('Shared map HTTP '+response.status);const raw=await response.text(),bytes=new TextEncoder().encode(raw),digest=await crypto.subtle.digest('SHA-256',bytes),actual=Array.from(new Uint8Array(digest),b=>b.toString(16).padStart(2,'0')).join('');
  if(actual!==expected)throw Error('Unexpected shared map source package');signal?.throwIfAborted();return JSON.parse(raw);
}
export async function loadSharedMapSources(placeId,{signal,loadPinned=pinnedJSON}={}){
  const pins=MAP_SOURCE_PINS[placeId];if(!pins)throw Error('Shared gameplay source is not accepted for this place');signal?.throwIfAborted();
  const root=new URL('../../assets/runtime/map-sources/'+placeId+'/',import.meta.url),loaded=await Promise.all(['index','library'].map(key=>loadPinned(new URL(key+'.json',root).href,pins[key],signal)));signal?.throwIfAborted();
  return {index:loaded[0],library:loaded[1]};
}
export async function createSharedMapRuntime({place,root,uiRoot,mountUI,signal,onExitToMenu,onError,onLoadPhase,...options}){
  const [data,source]=await Promise.all([loadLandmark(place.id,{signal}),loadSharedMapSources(place.id,{signal})]);signal?.throwIfAborted();let art;
  const compiled=compileSharedMap(source.index,source.library,data.navigation,{isSectionReady:p=>art?.isReadyAt(p)===true,streamMetrics:()=>art?.streamingMetrics()||{}});compiled.presentation=data;
  return createRuntime({root,uiRoot,mountUI,signal,onError,onLoadPhase,...options,gameplayMap:compiled,uiOptions:{placeTitle:place.title,onExitToMenu},createArtScene:async args=>(art=await createSharedMapPresentation({...args,gameplayMap:compiled,createMapStructureArt}))});
}
