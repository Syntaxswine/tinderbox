import {createClosingTimeArt} from '../bell-and-alder-closing/art.js';
import {createSandboxStructureArt} from '../../art/source/bell-and-alder-sandbox/thermal-art.js';
import {partitionSandboxFrame} from './runtime.js';

// World-space prepared source views only. Runtime owns every physical outcome.
export async function createSandboxArt(T,{renderer,data,instances,signal}={}){
 if(data?.prefabId!=='bell-and-alder-sandbox-v1'||!(renderer instanceof T.WebGLRenderer))throw Error('Sandbox art requires its composed physical data and shared WebGL renderer');
 if(instances?.length!==3||new Set(instances.map(i=>i.id)).size!==3)throw Error('Three unique first-slice source instances required');
 const root=new T.Group();root.name='Bell and Alder / first two-address sandbox';
 const views=new Map();let disposed=false,lastTime=0,lastRevision=-1,updates=0;
 function dispose(){if(disposed)return;disposed=true;root.removeFromParent();for(const {art}of views.values())art.dispose();root.clear();}
 try{
  for(const instance of instances){
   signal?.throwIfAborted();const art=instance.kind==='closing'?await createClosingTimeArt(T,{renderer,data:instance.data,signal}):await createSandboxStructureArt(T,{renderer,data:instance.data,placement:instance});
   views.set(instance.id,{instance,art});root.add(art.root);
   // The frozen legacy factory tests an unqualified literal lamp ID. Restore
   // its existing front-pendant shadow by native identity after qualification.
   if(instance.kind==='closing')for(const spec of instance.data.closingTime.lamps||[]){
    if((spec.nativeId??(spec.id.startsWith(instance.id+'::')?spec.id.slice(instance.id.length+2):spec.id))!=='closing/front-pendant:light')continue;
    const light=art.root.getObjectByName(spec.id);if(!light?.isPointLight)throw Error('Missing native front pendant light');
    light.castShadow=true;light.shadow.mapSize.set(512,512);light.shadow.bias=-.00012;light.shadow.normalBias=.018;light.shadow.camera.near=.05;light.shadow.camera.far=spec.reach;
   }
  }
  signal?.throwIfAborted();
  function update(frame,view={}){
   if(disposed)throw Error('Sandbox art disposed');if(frame.sandbox?.version!==1)throw Error('Authoritative sandbox frame metadata required');
   for(const [id,{art,instance}]of views){const options=instance.kind==='yard'&&view.mode==='cutaway'?{...view,level:0}:view;art.update(partitionSandboxFrame(frame,id),options);}
   lastTime=frame.worldTime;lastRevision=frame.revision;updates++;
  }
  function diagnostics(){
   const geometries=new Set(),materials=new Set(),textures=new Set(),lights=[];let meshes=0,sourceTriangles=0;
   root.traverse(o=>{if(o.isLight)lights.push({name:o.name,type:o.type,intensity:o.intensity,reach:o.distance??null,castShadow:o.castShadow});if(o.isMesh){meshes++;geometries.add(o.geometry);sourceTriangles+=(o.geometry.index?.count||o.geometry.attributes.position.count)/3*(o.isInstancedMesh?o.count:1);}for(const m of Array.isArray(o.material)?o.material:[o.material])if(m){materials.add(m);for(const k of ['map','normalMap','roughnessMap','metalnessMap'])if(m[k])textures.add(m[k]);}});
   const rows=[...views.values()].map(({instance,art})=>({id:instance.id,kind:instance.kind,prefabId:instance.data.prefabId,walkingElevations:instance.data.levels.map(l=>l.floorY),...art.diagnostics()}));
   return {version:1,prefabId:data.prefabId,disposed,worldTime:lastTime,revision:lastRevision,updates,rootScale:root.scale.toArray(),instances:rows,actors:rows.find(r=>r.kind==='closing')?.actors||[],lantern:rows.find(r=>r.kind==='closing')?.lantern,resources:{meshes,uniqueGeometries:geometries.size,materials:materials.size,textures:textures.size,sourceTriangles},lights,lightingPolicy:{firePools:3,maxFireLights:18,sumPotentialPowerCap:645,installedLamps:4,portableLanterns:1,policy:'Three reused six-light/power215 source pools. Measured additive presentation approximation; not a shared block power cap.'},frameOwnership:'Runtime partitionSandboxFrame once per stable instance. Generated fragments retain birth ownership across buildings.',missingSamples:rows.reduce((n,r)=>n+(r.structure?.missingSamples??r.missingSamples??0),0)};
  }
  return {root,update,diagnostics,dispose,inspect(){return Object.fromEntries([...views].map(([id,{art}])=>[id,art.inspect?.()]));}};
 }catch(error){dispose();throw error;}
}
