import {makeExpositionMaterials} from './skins.js';
export const BUILDING_FACADES=Object.freeze({
  generic:Object.freeze({id:'generic',label:'Exposition v1 · generic',defaultStories:2}),
  'new-york-state':Object.freeze({id:'new-york-state',label:'New York State Building',defaultStories:2,portalStories:2,
    bay:'nyBay',portal:'nyPortal',openingUV:[.368,.633,0,.432],field:0xf2e5cb,trim:0xe9d8b6,sourceRefs:['TB009-R02:plate44','EXPO-P02:plate64']}),
  fisheries:Object.freeze({id:'fisheries',label:'Fisheries Building',defaultStories:1,portalStories:1,
    bay:'fisheriesBay',portal:'fisheriesPortal',openingUV:[.384,.617,0,.547],field:0xe4c9a4,trim:0xcda279,sourceRefs:['EXPO-P01:Fisheries-description','EXPO-P02:plate53']}),
  transportation:Object.freeze({id:'transportation',label:'Transportation · Golden Door',defaultStories:2,portalStories:2,
    bay:'transportationBay',portal:'transportationPortal',openingUV:[.370,.631,.024,.330],field:0xa24928,trim:0xb99a53,sourceRefs:['EXPO-P02:plate39','EXPO-P02:plate41']})
});
export const BUILDING_FACADE_ASSETS=Object.freeze(Object.fromEntries(Object.entries({
  nyBay:'new-york-state-bay-v1.png',nyPortal:'new-york-state-portal-v1.png',
  fisheriesBay:'fisheries-bay-v1.png',fisheriesPortal:'fisheries-portal-v1.png',
  transportationBay:'transportation-bay-v1.png',transportationPortal:'transportation-portal-v1.png'
}).map(([key,file])=>[key,new URL('../../assets/art/exposition-buildings-v1/'+file,import.meta.url).href])));
export function validateFacadeStyle(id){if(!Object.hasOwn(BUILDING_FACADES,id))throw new Error('Unknown building facade '+id);return id;}
export function makeBuildingMaterials(T,pool,base,assets,renderer){
  const result={};
  for(const profile of Object.values(BUILDING_FACADES).filter(p=>p.id!=='generic')){
    if(!assets[profile.bay]||!assets[profile.portal])continue;
    const entrance=assets[profile.portal];entrance.wrapS=entrance.wrapT=T.ClampToEdgeWrapping;
    entrance.colorSpace=T.SRGBColorSpace;entrance.anisotropy=Math.min(8,renderer?.capabilities.getMaxAnisotropy()||2);
    result[profile.id]=makeExpositionMaterials(T,pool,{...base,bay:assets[profile.bay]},renderer,{...profile,entrance});
  }
  return result;
}
