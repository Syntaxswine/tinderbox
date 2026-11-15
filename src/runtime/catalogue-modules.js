import * as THREE from './three.js';
import {scenarioDefinition} from '../simulation/fixtures.js';
import {materialAt} from '../simulation/field.js';
import {compileCatalogueModules} from '../content/catalogue-modules.js';
import {appendCatalogueNativeSources} from '../content/catalogue-native-exteriors.js';

export async function loadCatalogueModules({scenario='neighborhood',signal,fetcher=fetch,representation='structure',executionCache=true,onLoadPhase}={}){
  if(!['structure','facets'].includes(representation))throw Error('Unknown native source representation');
  const base=new URL('../../workbenches/catalogue-modular/',import.meta.url),read=async url=>{onLoadPhase?.({phase:'source-fetch',source:url.pathname.split('/').at(-1)});const response=await fetcher(url,{signal});if(!response.ok)throw Error('Catalogue component data '+response.status);const data=await response.json();onLoadPhase?.({phase:'source-parsed',source:url.pathname.split('/').at(-1)});return data;};
  const manifest=await read(new URL('scene-data.json',base));signal?.throwIfAborted();
  const paths=[...new Set(manifest.instances.map(i=>i.source))],sources=new Map();
  const results=await Promise.all(paths.map(async path=>{const url=new URL(path,base);if(url.origin!==base.origin||!url.pathname.startsWith(new URL('../../workbenches/',import.meta.url).pathname))throw Error('Component source must stay inside Tinderbox workbenches');return [path,await read(url)];}));for(const [path,data]of results)sources.set(path,data);
  const host=scenarioDefinition(scenario);host.tiles=[];for(let y=.5;y<host.height;y++)for(let x=.5;x<host.width;x++)host.tiles.push({x,y,size:1,material:materialAt(host,{x,y})});
  const compiled=appendCatalogueNativeSources(THREE,compileCatalogueModules(manifest,sources,host,{onLoadPhase}),host,{representation,onLoadPhase});compiled.executionCache=executionCache;onLoadPhase?.({phase:'native-registration-ready',instances:compiled.instances.length,surfaces:compiled.data.surfaces.length,meshes:compiled.data.sourceMeshes.length});signal?.throwIfAborted();return compiled;
}
