
import {Resources,removeTree} from './resources.js';
import {createMaterials} from './materials.js';
import {createBear,BEAR_SPEC} from './bear.js';
import {createWorld,createActor} from './world.js';
import {createGroundField} from './ground-field.js';
import {createFire} from './fire.js';
import {createToolProps} from './tool-props.js';
export const ART_ASSET_ROOT=new URL('../../vendor/farmyard-commando/30a3b8cae5f36bb0c1df3685b7fba16f701c2083/sites/tactical-animal/dist/aft/assets/',import.meta.url).href;
export {BEAR_SPEC};
export async function createArtScene({THREE:T,scene,assetBaseUrl=ART_ASSET_ROOT}={}){
  if(!T?.TextureLoader||!scene?.add)throw new TypeError('createArtScene requires the shared THREE module and a scene.');
  const base=new URL(assetBaseUrl,import.meta.url);if(!base.pathname.endsWith('/'))base.pathname+='/';
  const selected={flame:'effects/painted-fire/flame-atlas-v1.png',smoke:'effects/painted-fire/smoke-atlas-v1.png',
    burst:'effects/painted-fire/tank-burst-atlas-v1.png',materials:'environment/painted-study/material-atlas-v2.png',cargo:'environment/painted-study/cargo-materials-v1.png'};
  const pool=new Resources(),loader=new T.TextureLoader(),entries=Object.entries(selected);
  const loaded=await Promise.allSettled(entries.map(([,file])=>loader.loadAsync(new URL(file,base).href)));
  for(const result of loaded)if(result.status==='fulfilled')pool.texture(result.value);
  const failure=loaded.findIndex(result=>result.status==='rejected');
  if(failure!==-1){pool.dispose();throw new Error('Tinderbox art asset failed: '+entries[failure][1],{cause:loaded[failure].reason});}
  const assets=Object.fromEntries(entries.map(([name],i)=>{const texture=loaded[i].value;texture.colorSpace=T.SRGBColorSpace;return [name,texture];}));
  let root,world,bear,field,fire,toolProps,keyLight,disposed=false,updates=0,lastSnapshot;
  const actors=new Map(),muzzlePoint=new T.Vector3();
  try{
    root=new T.Group();root.name='Tinderbox art module';
    const materials=createMaterials(T,pool,assets);
    world=createWorld(T,materials);bear=createBear(T,materials);field=createGroundField(T);fire=createFire(T,assets,field.uniforms);
    toolProps=createToolProps(T,materials);root.add(world.root,field.root,fire.root,bear.root,toolProps.root);
    if(!scene.children.some(object=>object.isLight)){
    root.add(new T.HemisphereLight(0xe2e4c7,0x5c624d,2.0));
    keyLight=new T.DirectionalLight(0xffe6be,2.4);keyLight.position.set(-4,12,5);keyLight.target.position.set(10,0,8);root.add(keyLight,keyLight.target);
    keyLight.castShadow=true;keyLight.shadow.mapSize.set(1024,1024);keyLight.shadow.camera.left=-16;keyLight.shadow.camera.right=16;keyLight.shadow.camera.top=16;keyLight.shadow.camera.bottom=-16;keyLight.shadow.bias=-.00025;keyLight.shadow.normalBias=.025;
    }
    const ringGeo=pool.geometry(new T.RingGeometry(.47,.49,40));ringGeo.rotateX(-Math.PI/2);
    const ringMat=pool.material(new T.MeshBasicMaterial({color:0xf0d28a,transparent:true,opacity:.60,depthWrite:false}));
    const ring=new T.Mesh(ringGeo,ringMat);ring.position.y=.026;root.add(ring);
    const arrowGeo=pool.geometry(new T.BufferGeometry());arrowGeo.setAttribute('position',new T.Float32BufferAttribute([.85,.027,0,.67,.027,-.09,.67,.027,.09],3));arrowGeo.computeVertexNormals();
    const arrow=new T.Mesh(arrowGeo,pool.material(new T.MeshBasicMaterial({color:0xf0d28a,transparent:true,opacity:.7,side:T.DoubleSide,depthWrite:false})));root.add(arrow);
    scene.add(root);
    function update(snapshot,timing={}){
      if(disposed)return;
      if(snapshot?.version!==1||!snapshot.player||!snapshot.world)throw new TypeError('Art requires a v1 authoritative snapshot.');
      const {world:map,player}=snapshot;
      if(![player.x,player.y,map.width,map.height,map.fireCellSize].every(Number.isFinite)||map.fireCellSize<=0||map.width<=0||map.height<=0||Math.ceil(map.width/map.fireCellSize)*Math.ceil(map.height/map.fireCellSize)>65536)throw new RangeError('Art grid must be finite, positive, and at most 65536 cells.');
      const playerTime=Number.isFinite(timing.playerTime)?timing.playerTime:snapshot.clocks?.player||0;
      const worldTime=Number.isFinite(timing.worldTime)?timing.worldTime:snapshot.clocks?.world||0;
      world.update(map);field.update(snapshot);bear.update(player,playerTime);bear.anchors.muzzle.getWorldPosition(muzzlePoint);fire.update(snapshot,worldTime,{muzzle:muzzlePoint});toolProps.update(snapshot,playerTime,bear.anchors);
      ring.position.set(player.x,.026,player.y);arrow.position.set(player.x,0,player.y);arrow.rotation.y=-(player.heading||0);
      const active=new Set();
      for(const actor of snapshot.actors||[]){
        if(actor.id===player.id)continue;active.add(actor.id);
        let model=actors.get(actor.id);if(!model){model=createActor(T,materials);actors.set(actor.id,model);root.add(model.root);}model.update(actor,worldTime);
      }
      for(const [id,model]of actors)if(!active.has(id)){model.dispose();actors.delete(id);}
      lastSnapshot={tick:snapshot.tick,worldTime,playerTime};updates++;
    }
    function dispose(){
      if(disposed)return;disposed=true;
      for(const model of actors.values())model.dispose();actors.clear();
      fire.dispose();toolProps.dispose();field.dispose();bear.dispose();world.dispose();keyLight?.shadow.dispose();removeTree(root);pool.dispose();
    }
    return {update,dispose,anchors:Object.freeze({...bear.anchors}),
      diagnostics:()=>({disposed,updates,lastSnapshot,provisionalBear:true,actors:actors.size,sharedResources:pool.counts(),world:world.counts(),bear:bear.counts(),ground:field.counts(),tools:toolProps.diagnostics(),fire:fire.diagnostics()})};
  }catch(error){
    for(const model of actors.values())model.dispose();fire?.dispose();toolProps?.dispose();field?.dispose();bear?.dispose();world?.dispose();keyLight?.shadow.dispose();removeTree(root);pool.dispose();throw error;
  }
}
