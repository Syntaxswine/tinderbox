import {Resources} from './resources.js';
// A presentation-only, native-anchor flame. Inventory, ignition and time remain authoritative.
export function createCarriedTorch(T,flameTexture){
  const pool=new Resources(),root=new T.Group();root.name='Carried torch flame';root.visible=false;
  const map=pool.texture(flameTexture.clone());map.repeat.set(.5,.5);
  const material=pool.material(new T.MeshBasicMaterial({name:'Existing painted carried flame',map,transparent:true,alphaTest:.02,depthWrite:false,side:T.DoubleSide,toneMapped:false}));
  const geometry=pool.geometry(new T.PlaneGeometry(.28,.54));geometry.translate(0,.27,0);
  const flame=new T.Mesh(geometry,material);flame.name='Native torch tip flame';flame.renderOrder=4;root.add(flame);
  const world=new T.Vector3(),q=new T.Quaternion(),inverse=new T.Quaternion();
  let disposed=false,state={active:false,phase:'unlit',worldTime:0,frame:0};
  function face(camera){if(!camera)return;root.updateWorldMatrix(true,false);root.getWorldQuaternion(inverse).invert();camera.getWorldQuaternion(q);flame.quaternion.copy(inverse.multiply(q));}
  flame.onBeforeRender=(_renderer,_scene,camera)=>{face(camera);flame.updateWorldMatrix(false,false);};
  return {root,update(snapshot,time,anchors={}){
    if(disposed)return;
    const p=snapshot.player,torch=p?.torch,clock=Number.isFinite(snapshot.clocks?.world)?snapshot.clocks.world:Number.isFinite(time)?time:0;
    const phase=torch?.phase||'unlit',active=p?.tool==='torch'&&phase==='lit'&&torch.remainingSeconds>0;
    state={active,phase,worldTime:clock,frame:Math.floor(clock*4.2)%4,remainingSeconds:torch?.remainingSeconds??0};root.visible=active;
    if(!active)return;
    const muzzle=anchors.muzzle;if(muzzle?.isObject3D)muzzle.getWorldPosition(world);else if(muzzle&&[muzzle.x,muzzle.y,muzzle.z].every(Number.isFinite))world.copy(muzzle);else{root.visible=false;state.active=false;state.reason='Missing original torch muzzle';return;}
    root.parent?.updateWorldMatrix(true,false);root.position.copy(root.parent?root.parent.worldToLocal(world.clone()):world);
    map.offset.set((state.frame%2)*.5,(1-Math.floor(state.frame/2))*.5);map.updateMatrix();
    const flutter=1+.045*Math.sin(clock*9.1);flame.scale.set(flutter,1+.055*Math.sin(clock*7.7),1);face(anchors.camera);root.updateMatrixWorld(true);
    state.anchor=world.toArray();state.size=[.28*flame.scale.x,.54*flame.scale.y];
  },reset(){root.visible=false;state={active:false,phase:'unlit',worldTime:0,frame:0};},diagnostics:()=>({...state,anchor:state.anchor?[...state.anchor]:null,resources:pool.counts(),presentationOnly:true}),dispose(){if(disposed)return;disposed=true;root.removeFromParent();root.clear();pool.dispose();state.active=false;}};
}
