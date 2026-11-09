import {Resources} from './resources.js';
import {boxInterval} from '../simulation/geometry.js';

const LIGHT_REACH=3.8,LIGHT_INTENSITY=4.6,WALL_CLEARANCE=.16;

// The painted torch may intersect siding at very close range. Keep its light on
// the holder's side using the existing solid bounds, without moving the flame.
function routeSource(out,anchor,player,obstacles){
  out.copy(anchor);out.y+=.12;
  if(![player.x,player.y].every(Number.isFinite)||!Array.isArray(obstacles))return 0;
  const from={x:player.x,y:player.y},to={x:out.x,y:out.z};
  const length=Math.hypot(to.x-from.x,to.y-from.y);
  if(length<1e-6)return 0;
  let fraction=1;
  for(const obstacle of obstacles){
    if(obstacle.solid===false||obstacle.destroyed||!(obstacle.height>=out.y))continue;
    const span=boxInterval(from,to,obstacle);
    if(span&&span[1]>0)fraction=Math.min(fraction,Math.max(0,span[0]-WALL_CLEARANCE/length));
  }
  out.x=from.x+(to.x-from.x)*fraction;out.z=from.y+(to.y-from.y)*fraction;
  return (1-fraction)*length;
}
// A presentation-only, native-anchor flame. Inventory, ignition and time remain authoritative.
export function createCarriedTorch(T,flameTexture){
  const pool=new Resources(),root=new T.Group();root.name='Carried torch flame';root.visible=false;
  const map=pool.texture(flameTexture.clone());map.repeat.set(.5,.5);
  const material=pool.material(new T.MeshBasicMaterial({name:'Existing painted carried flame',map,transparent:true,alphaTest:.02,depthWrite:false,side:T.DoubleSide,toneMapped:false}));
  const geometry=pool.geometry(new T.PlaneGeometry(.28,.54));geometry.translate(0,.27,0);
  const flame=new T.Mesh(geometry,material);flame.name='Native torch tip flame';flame.renderOrder=4;root.add(flame);
  // A broad downward spill uses one shadow view and the night's existing wall depth materials.
  const light=pool.object(new T.SpotLight(0xffb978,0,LIGHT_REACH,1.44,.88,2));
  light.name='Carried torch route light';light.castShadow=true;
  light.shadow.mapSize.set(256,256);light.shadow.camera.near=.04;
  light.shadow.bias=-.0003;light.shadow.normalBias=.025;
  root.add(light,light.target);
  const world=new T.Vector3(),source=new T.Vector3(),q=new T.Quaternion(),inverse=new T.Quaternion();
  let disposed=false,state={active:false,phase:'unlit',worldTime:0,frame:0};
  function face(camera){if(!camera)return;root.updateWorldMatrix(true,false);root.getWorldQuaternion(inverse).invert();camera.getWorldQuaternion(q);flame.quaternion.copy(inverse.multiply(q));}
  flame.onBeforeRender=(_renderer,_scene,camera)=>{face(camera);flame.updateWorldMatrix(false,false);};
  return {root,update(snapshot,time,anchors={}){
    if(disposed)return;
    const p=snapshot.player,torch=p?.torch,clock=Number.isFinite(snapshot.clocks?.world)?snapshot.clocks.world:Number.isFinite(time)?time:0;
    const phase=torch?.phase||'unlit',active=p?.tool==='torch'&&phase==='lit'&&Number.isFinite(torch.remainingSeconds)&&torch.remainingSeconds>0;
    state={active,phase,worldTime:clock,frame:Math.floor(clock*4.2)%4,remainingSeconds:torch?.remainingSeconds??0};root.visible=active;
    light.intensity=0;
    if(!active)return;
    const muzzle=anchors.muzzle;if(muzzle?.isObject3D)muzzle.getWorldPosition(world);else if(muzzle)world.copy(muzzle);else world.set(NaN,NaN,NaN);
    if(![world.x,world.y,world.z].every(Number.isFinite)){root.visible=false;state.active=false;state.reason='Missing original torch muzzle';return;}
    root.position.copy(world);if(root.parent)root.parent.worldToLocal(root.position);
    state.lightPullback=routeSource(source,world,p,snapshot.world?.obstacles);
    state.lightSource=source.toArray();light.position.copy(root.worldToLocal(source));
    map.offset.set((state.frame%2)*.5,(1-Math.floor(state.frame/2))*.5);map.updateMatrix();
    const flutter=1+.045*Math.sin(clock*9.1);flame.scale.set(flutter,1+.055*Math.sin(clock*7.7),1);
    const heading=Number.isFinite(p.heading)?p.heading:0;
    light.target.position.set(light.position.x+.30*Math.cos(heading),light.position.y-1.04,light.position.z+.30*Math.sin(heading));
    light.intensity=LIGHT_INTENSITY*flutter;
    face(anchors.camera);root.updateMatrixWorld(true);
    state.anchor=world.toArray();state.size=[.28*flame.scale.x,.54*flame.scale.y];
  },reset(){root.visible=false;light.intensity=0;state={active:false,phase:'unlit',worldTime:0,frame:0};},diagnostics:()=>({...state,anchor:state.anchor?[...state.anchor]:null,light:{intensity:light.intensity,reach:light.distance,castsShadow:light.castShadow,source:state.lightSource?[...state.lightSource]:null,pullback:state.lightPullback??0},resources:pool.counts(),presentationOnly:true}),dispose(){if(disposed)return;disposed=true;root.visible=false;light.intensity=0;root.removeFromParent();root.clear();pool.dispose();state.active=false;}};
}
