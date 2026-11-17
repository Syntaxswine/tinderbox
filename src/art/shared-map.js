import {createSectionStreamer} from '../runtime/sections.js';
import {mapSectionPresentation,followBoundaryRows,labelNativePatchStoreys} from '../content/map-source-presentation.js';
import {createCatalogueStructureArt} from '../../art/source/catalogue-modular/thermal-art.js';
import {createSourceTerrain} from './source-terrain.js';
import {createSourceInertDebris} from './source-inert-debris.js';

export async function createMapStructureArt({THREE:T,renderer,signal,gameplayMap:compiled,onLoadPhase}){
  signal?.throwIfAborted();const root=new T.Group(),views=new Map(),live=new Map(),bySource=new Map(),sourceDefinitions=new Map(),terrain=createSourceTerrain(T,compiled.presentation);
  root.name='Shared gameplay source sections';root.add(terrain.root);let stream,loose,latestFrame,latestTiming={},closed=false,generation=-1,registered=0,lastRegistrationGeneration=-1,failure;
  const previousClipping=renderer.localClippingEnabled;renderer.localClippingEnabled=true;
  const inert=createSourceInertDebris(T,{appearanceForSource(id){const s=sourceDefinitions.get(id),p=compiled.model.partById.get(s?.nativePartId);return p?{id:p.appearance,spec:compiled.model.library.materials[p.appearance]}:null;}});root.add(inert.root);
  function view(snapshot,timing){const player=snapshot.player;return {mode:timing.viewMode==='overview'?'exterior':player.interior?'cutaway':'exterior',level:player.level??Math.floor((player.elevation||0)/2.12+1e-5),camera:timing.camera,observer:{x:player.x,y:player.elevation||0,z:player.y,height:player.height},sampleWind:compiled.sampleWind||((_x,_y,_z,out=[0,0,0])=>(out[0]=1.5,out[1]=out[2]=0,out)),windMetadata:snapshot.diagnostics?.thermal?.wind,effects:{flames:true,smoke:true,lighting:false}};}
  function refreshRegistration(){const r=compiled.registration();if(r.generation!==lastRegistrationGeneration){registered=0;sourceDefinitions.clear();lastRegistrationGeneration=r.generation;}for(let i=registered;i<r.surfaces.length;i++)sourceDefinitions.set(r.surfaces[i].id,r.surfaces[i]);registered=r.surfaces.length;return r;}
  function refreshFollow(record){
    const r=compiled.registration(),stamp=r.generation+'/'+r.surfaces.length;if(record.followStamp===stamp)return;record.followStamp=stamp;
    const mappings=new Map();for(const partId of new Set(record.binding.followBindings.map(b=>b.partId)))for(const chunk of compiled.followPartition(partId))mappings.set('follow:'+partId+'/t'+chunk.sourceTriangle+'/'+chunk.cell.join(','),chunk.parentGroups);
    for(const b of record.binding.followBindings)if(mappings.has(b.id))b.parentGroups=mappings.get(b.id);
  }
  function apply(record,full=false){if(!latestFrame)return;refreshFollow(record);const f=latestFrame,boundaries=full?[...record.binding.nativeSourceIds].flatMap(id=>[...(bySource.get(id)?.values()||[])]):(f.boundaries||[]).filter(b=>record.binding.nativeSourceIds.has(b.sourceSurfaceId));
    const frame={...f,full:full||f.full,boundaries:[...boundaries,...followBoundaryRows(record.binding.followBindings,live)],supports:[],items:[],parts:[],falls:[],rubble:[],occupancy:[],tombstones:[],fireSamples:(f.fireSamples||[]).filter(s=>record.binding.nativeSourceIds.has(s.sourceSurfaceId))};record.art.update(frame,latestTiming);record.art.root.visible=true;
  }
  function preparedData(data){return {...data,render:{...data.render,materials:data.render.materials.map(a=>({...a,color:new T.Color().fromArray(a.color)}))}};}
  function restoreAppearance(art){art.root.traverse(o=>{for(const m of Array.isArray(o.material)?o.material:[o.material]){const spec=compiled.model.library.materials[m?.name];if(spec){const {color,emissive,...fields}=spec;Object.assign(m,fields);m.color.fromArray(color);m.emissive.fromArray(emissive);m.needsUpdate=true;}}});}
  async function createView(section,loadSignal){
    loadSignal.throwIfAborted();const binding=mapSectionPresentation(compiled,section.id),art=await createCatalogueStructureArt(T,{renderer,data:preparedData(binding.data),signal:loadSignal});
    if(closed||loadSignal.aborted){art.dispose();throw new DOMException('Visit cancelled','AbortError');}restoreAppearance(art);art.root.visible=false;
    const record={art,binding,storeyLabels:labelNativePatchStoreys(art),followStamp:null};views.set(section.id,record);apply(record,true);
    return {root:art.root,dispose(){if(views.get(section.id)===record)views.delete(section.id);art.dispose();}};
  }
  function dispose(){if(closed)return;closed=true;stream?.dispose();for(const r of views.values())r.art.dispose();views.clear();loose?.dispose();inert.dispose();terrain.dispose();live.clear();bySource.clear();sourceDefinitions.clear();renderer.localClippingEnabled=previousClipping;root.removeFromParent();root.clear();}
  try{
    onLoadPhase?.({phase:'source-section-presentation-begin'});
    const empty={...compiled.data,presentationOnly:true,prefabId:compiled.model.placeId+'/loose',module:[1,2,2.12],surfaces:[],sourceMeshes:[],render:{geometry:[],materials:[]}};
    loose=await createCatalogueStructureArt(T,{renderer,data:empty,signal});signal?.throwIfAborted();root.add(loose.root);
    stream=createSectionStreamer({THREE:T,root,manifest:compiled.presentation.manifest,baseUrl:compiled.presentation.baseUrl,signal,createSectionView:createView,overview:'sections',onError:error=>{failure=error;}});stream.update(compiled.definition.player);await stream.settled();signal?.throwIfAborted();onLoadPhase?.({phase:'source-section-presentation-ready'});
    function update(snapshot,timing={}){
      if(closed)return;if(failure)throw failure;const frame=snapshot.scene;if(frame?.scene?.version!==1)throw Error('Authoritative shared-map physical frame required');
      if(generation!==frame.scene.generation||frame.full){live.clear();bySource.clear();generation=frame.scene.generation;}
      refreshRegistration();for(const b of [...frame.boundaries||[],...frame.supports||[]])if(!b.queryOnly){live.set(b.id,b);if(!bySource.has(b.sourceSurfaceId))bySource.set(b.sourceSurfaceId,new Map());bySource.get(b.sourceSurfaceId).set(b.id,b);}
      latestFrame=frame;latestTiming=view(snapshot,timing);stream.update(snapshot.player,{viewMode:timing.viewMode||'follow',interior:!!snapshot.player.interior&&timing.viewMode!=='overview',portalStates:snapshot.navigation.portalStates});
      for(const record of views.values())apply(record);
      loose.update({...frame,fireSamples:(frame.fireSamples||[]).filter(s=>!s.sourceSurfaceId&&!(s.fuelClass==='oil'&&!s.fallId&&s.y<.05)),falls:(frame.falls||[]).filter(f=>!f.geometry?.nativeInertBody),rubble:(frame.rubble||[]).filter(r=>!r.inert),boundaries:[],supports:[],items:[],parts:[],occupancy:[]},{...latestTiming,mode:'exterior'});inert.update(frame);
    }
    return {root,update,dispose,isReadyAt:p=>stream.isReadyAt(p),settled:()=>stream.settled(),streamingMetrics:()=>stream.metrics(),diagnostics:()=>({disposed:closed,streaming:stream?.metrics(),physicalRegistration:compiled.metrics(),views:[...views].map(([id,r])=>({id,storeyLabels:r.storeyLabels,...r.art.diagnostics()})),persistentBoundaryRows:live.size,terrain:terrain.diagnostics(),inert:inert.diagnostics(),loose:loose?.diagnostics(),actorsCreated:0,fireLightsCreated:0})};
  }catch(error){dispose();throw error;}
}
