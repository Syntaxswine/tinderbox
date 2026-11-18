import {decodeMapSources} from './map-source-data.js';
import {createMapSourceGeometry} from './map-source-geometry.js';
import {gameplayMapDefinition} from './shared-map-pilot.js';
import {createSourceQueryRegistry} from '../runtime/source-query-registry.js';
import {createSourceActivation} from '../simulation/source-activation.js';
import {createSourceSupportGraph} from '../simulation/source-support.js';
import {createSourceFollow} from '../simulation/source-follow.js';
import {createMapNavigation} from '../simulation/map-navigation.js';
import {MapInputNotReadyError} from './shared-map-admission.js';

// The existing front approach is south of this source building. Camera and
// screen-stick movement consume this one map-authored orientation together.
export const NEW_YORK_GAMEPLAY_CONFIGURATION=Object.freeze({input:Object.freeze({cameraRelative:true,cameraX:10,cameraY:-12})});

export function compileSharedMap(index,library,navigation,{isSectionReady=()=>true,streamMetrics=()=>({}),sampleWind,windMetadata,internalHybrid=null,inputFactory=null,signal,onInputReport=()=>{}}={}){
  if(inputFactory&&internalHybrid)throw Error('Choose one internal input owner');
  if(internalHybrid&&internalHybrid.mode!=='hybrid-world-v1')throw Error('Unknown disabled internal publication mode');
  const model=decodeMapSources(index,library);if(model.placeId!==navigation.placeId)throw Error('Shared map source/navigation identity differs');
  const sources=createMapSourceGeometry(model),definition=gameplayMapDefinition(navigation),id=model.placeId;
  let inputs,binding,disposed=false;
  try{if(inputFactory){inputs=inputFactory({model,sources,signal});onInputReport(inputs.report);if(inputs.report.status!=='READY')throw new MapInputNotReadyError(inputs.report);}}catch(error){inputs?.dispose();sources.dispose();throw error;}
  const data={version:1,prefabId:id+'-shared-gameplay',runtimeAdapterVersion:1,thermalCell:[.5,1.06,.5],gridOrigin:[0,0,0],implicitGround:false,groundY:0,sourceBounds:navigation.sourceBounds,
    levels:navigation.occupiedLevels.map(index=>({index,floorY:index*2.12})),surfaces:[],openings:[],items:[],furnitureParts:[],stores:[],sourceMeshes:[],sourceHashes:[],render:{geometry:[],materials:[]},stairFlights:[],
    scene:{version:1,instances:[{id,bounds:navigation.sourceBounds}],doors:[]},...(internalHybrid||inputs?{internalHybrid:true,hybridSourceRevision:internalHybrid?.sourceRevision||inputs.report.sourceRevision}:{})};
  let querySource,activation,follow,registered=[],registeredOpenings=[],generation=0;const registeredIds=new Set(),registeredOpeningIds=new Set();
  return {data,definition,configuration:id==='new-york'?NEW_YORK_GAMEPLAY_CONFIGURATION:undefined,instances:[{id,data:{}}],representation:'native-map-sparse-sources',sparsePublication:true,sourceCarriers:model.carriers,get sourceOwnerModes(){return inputs?.ownerModes||internalHybrid?.ownerModes;},activeCarrierIds:[],limitations:model.index.limitations,model,sources,sampleWind,windMetadata,
    inputReport:inputs?.report,prepareInputs:()=>inputs?.prepare(),
    createQuerySource(){if(disposed)throw Error('Compiled map disposed');generation++;registered=[];registeredOpenings=[];registeredIds.clear();registeredOpeningIds.clear();const registry=createSourceQueryRegistry({navigation,parts:model.parts,shapeForPart:sources.shapeForPart});try{if(inputs){const owned=inputs.bindRegistry(registry);binding=owned;const dispose=registry.dispose;registry.dispose=()=>{owned.dispose();if(binding===owned)binding=null;if(querySource===registry){querySource=null;activation=null;follow=null;}dispose();};}querySource=registry;return registry;}catch(error){registry.dispose();throw error;}},
    supportGraphFactory:scene=>createSourceSupportGraph({scene,model,querySource,internalHybrid:(binding?.mode||internalHybrid)?.support}),
    createActivation(options){activation=createSourceActivation({...options,sources,internalHybrid:binding?.mode||internalHybrid,onActivated({carrierIds}){for(const id of carrierIds){const b=activation.sourceForCarrier(id);for(const s of b.surfaces)if(!registeredIds.has(s.id)){registeredIds.add(s.id);registered.push(s);}for(const o of b.openings)if(!registeredOpeningIds.has(o.id)){registeredOpeningIds.add(o.id);registeredOpenings.push(o);}}}});follow=createSourceFollow({model,trial:options.trial,querySource,activation});querySource.setFollowResolver(follow.resolve);return activation;},
    createNavigation:options=>createMapNavigation({...options,definition:navigation,isSectionReady,streamMetrics}),
    registration:()=>({generation,surfaces:registered,openings:registeredOpenings}),queryShape:id=>querySource.shape(id),
    followPartition:id=>follow.partition(model.partById.get(id),sources.shapeForPart(id)),isActive:id=>activation.isActive(id),
    presentationSourcesForCarrier:id=>activation.sourceForCarrier(id)||sources.presentationSourcesForCarrier(id,querySource.portalStates()),
    metrics:()=>({geometry:sources.metrics(),query:querySource?.metrics(),activation:activation?.metrics(),...(inputs?{inputs:inputs.metrics()}:{})}),dispose(){if(disposed)return;disposed=true;inputs?.dispose();sources.dispose();registered=[];registeredOpenings=[];querySource=null;activation=null;follow=null;}};
}
