import {makeExpositionMaterials} from './skins.js';
export const BUILDING_FACADES=Object.freeze({
  generic:Object.freeze({id:'generic',label:'Exposition v1 · generic',defaultStories:2}),
  'new-york-state':Object.freeze({id:'new-york-state',label:'New York State Building',defaultStories:2,portalStories:2,bayWidth:2.5,portalWidth:3,
    bay:'nyBay',portal:'nyPortal',openingUV:[.368,.633,0,.432],field:0xf2e5cb,trim:0xe9d8b6,sourceRefs:['TB009-R02:plate44','EXPO-P02:plate64']}),
  fisheries:Object.freeze({id:'fisheries',label:'Fisheries Building',defaultStories:1,portalStories:1,bayWidth:2.5,portalWidth:3,
    bay:'fisheriesBay',portal:'fisheriesPortal',openingUV:[.384,.617,0,.547],field:0xe4c9a4,trim:0xcda279,sourceRefs:['EXPO-P01:Fisheries-description','EXPO-P02:plate53']}),
  transportation:Object.freeze({id:'transportation',label:'Transportation · Golden Door',defaultStories:2,portalStories:2,bayWidth:2.5,portalWidth:3,
    bay:'transportationBay',portal:'transportationPortal',openingUV:[.370,.631,.024,.330],field:0xa24928,trim:0xb99a53,sourceRefs:['EXPO-P02:plate39','EXPO-P02:plate41']}),
  manufactures:Object.freeze({id:'manufactures',label:'Manufactures and Liberal Arts',defaultStories:2,portalStories:1,bayWidth:5,portalWidth:3,baysPerRepeat:5,
    bay:'manufacturesBay',portal:'manufacturesPortal',openingUV:[0.30859375,0.69140625,0,0.7021484375],field:0xf1e3c7,trim:0xe3d1ae,sourceRefs:['EXPO-P02:plate3']}),
  agriculture:Object.freeze({id:'agriculture',label:'Agricultural Building',defaultStories:2,portalStories:1,bayWidth:5,portalWidth:3,baysPerRepeat:5,
    bay:'agricultureBay',portal:'agriculturePortal',openingUV:[0.3424479166666667,0.6575520833333334,0.02734375,0.783203125],field:0xebd6b1,trim:0xd6bd92,sourceRefs:['EXPO-P02:plate18']}),
  'fine-arts':Object.freeze({id:'fine-arts',label:'Palace of Fine Arts',defaultStories:2,portalStories:1,bayWidth:5,portalWidth:3,baysPerRepeat:5,
    bay:'fineArtsBay',portal:'fineArtsPortal',openingUV:[0.328125,0.671875,0.0146484375,0.75],field:0xe5e0d0,trim:0xd3cbb5,sourceRefs:['EXPO-P02:plate60']})
});
const assets=(version,files)=>Object.entries(files).map(([key,file])=>[key,new URL('../../assets/art/exposition-buildings-'+version+'/'+file,import.meta.url).href]);
export const BUILDING_FACADE_ASSETS=Object.freeze(Object.fromEntries([
  ...assets('v1',{nyBay:'new-york-state-bay-v1.png',nyPortal:'new-york-state-portal-v1.png',
    fisheriesBay:'fisheries-bay-v1.png',fisheriesPortal:'fisheries-portal-v1.png',
    transportationBay:'transportation-bay-v1.png',transportationPortal:'transportation-portal-v1.png'}),
  ...assets('v3',{manufacturesBay:'manufactures-bay-v3.png',manufacturesPortal:'manufactures-portal-v3.png',
    agricultureBay:'agriculture-bay-v3.png',agriculturePortal:'agriculture-portal-v3.png',
    fineArtsBay:'fine-arts-bay-v3.png',fineArtsPortal:'fine-arts-portal-v3.png'})
]));
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
