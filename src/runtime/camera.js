import * as THREE from './three.js';
export function createCameraRig(container, renderer, world, {x = 10, h = 14, y = 12} = {}) {
  const camera = new THREE.OrthographicCamera(-10, 10, 10, -10, 0.1, Math.max(150,(world.width+world.height+(world.camera?.maxHeight||0)+100)*3));
  const target = new THREE.Vector3(world.width / 2, 0, world.height / 2);
  let zoom = 1, mode = world.camera?.followPlayer ? 'follow' : 'overview', player;
  function place() {
    const scale=world.camera?.overviewBounds?Math.max(1,Math.hypot(world.width,world.height,world.camera.maxHeight||0)*1.5/Math.hypot(x,h,y)):1;
    camera.position.copy(target).add(new THREE.Vector3(x, h, y).multiplyScalar(scale)); camera.lookAt(target); camera.updateMatrixWorld();
  }
  const ray = new THREE.Raycaster(), plane = new THREE.Plane(new THREE.Vector3(0, 1, 0), 0), point = new THREE.Vector3();
  function resize() {
    const w = Math.max(1, container.clientWidth), height = Math.max(1, container.clientHeight), aspect = w / height;
    const width = (world.width * Math.abs(y) + world.height * Math.abs(x)) / Math.hypot(x, y);
    let overviewSpan=Math.max(18,width/aspect);
    if(world.camera?.overviewBounds){
      const source=world.camera.overviewBounds,elevation=player?.elevation||0,b={min:[source.min[0],source.min[1]+elevation,source.min[2]],max:[source.max[0],source.max[1]+elevation,source.max[2]]},centre=new THREE.Vector3(...b.min).add(new THREE.Vector3(...b.max)).multiplyScalar(.5);
      target.copy(centre);place();let horizontal=0,vertical=0;
      for(const px of [b.min[0],b.max[0]])for(const py of [b.min[1],b.max[1]])for(const pz of [b.min[2],b.max[2]]){
        const point=new THREE.Vector3(px,py,pz).applyMatrix4(camera.matrixWorldInverse);horizontal=Math.max(horizontal,Math.abs(point.x));vertical=Math.max(vertical,Math.abs(point.y));
      }
      overviewSpan=Math.max(18,vertical*2,horizontal*2/aspect)*1.08;
    }
    const span = (mode==='follow' ? (w <= 650 ? world.camera?.phoneSpan||10 : world.camera?.span||12) : overviewSpan) * 1.05 / zoom;
    camera.left = -span * aspect / 2; camera.right = span * aspect / 2;
    camera.top = span / 2; camera.bottom = -span / 2;
    if(mode==='follow'&&player)target.set(player.x,player.elevation||0,player.y);
    else if(!world.camera?.overviewBounds)target.set(world.width/2,0,world.height/2);
    place();
    camera.updateProjectionMatrix(); renderer.setSize(w, height, false);
  }
  function screenToWorld(clientX, clientY) {
    const box = renderer.domElement.getBoundingClientRect();
    plane.constant=-(player?.elevation||0);
    ray.setFromCamera(new THREE.Vector2((clientX - box.left) / box.width * 2 - 1, -(clientY - box.top) / box.height * 2 + 1), camera);
    if (!ray.ray.intersectPlane(plane, point) || point.x < 0 || point.z < 0 || point.x >= world.width || point.z >= world.height) return null;
    return {x: point.x, y: point.z};
  }
  function projectInteraction(anchor,uiRoot=container){
    const hidden={x:0,y:0,visible:false};
    if(!Array.isArray(anchor)||anchor.length!==3||![0,1,2].every(i=>Number.isFinite(anchor[i])))return hidden;
    const canvas=renderer.domElement.getBoundingClientRect(),root=uiRoot?.getBoundingClientRect?.();
    if(!root||![canvas.left,canvas.top,canvas.width,canvas.height,root.left,root.top,root.width,root.height].every(Number.isFinite)||canvas.width<=0||canvas.height<=0||root.width<=0||root.height<=0)return hidden;
    camera.updateMatrixWorld();
    const point=new THREE.Vector3(...anchor),depth=point.clone().applyMatrix4(camera.matrixWorldInverse).z;
    point.project(camera);
    if(![point.x,point.y,point.z,depth].every(Number.isFinite)||depth> -camera.near||depth< -camera.far||Math.abs(point.x)>1||Math.abs(point.y)>1||Math.abs(point.z)>1)return hidden;
    const clientX=canvas.left+(point.x+1)*canvas.width/2,clientY=canvas.top+(1-point.y)*canvas.height/2;
    if(clientX<root.left||clientY<root.top||clientX>root.left+root.width||clientY>root.top+root.height)return hidden;
    const x=clientX-root.left-(uiRoot.clientLeft||0)+(uiRoot.scrollLeft||0),y=clientY-root.top-(uiRoot.clientTop||0)+(uiRoot.scrollTop||0);
    return Number.isFinite(x)&&Number.isFinite(y)?{x,y,visible:true}:hidden;
  }
  function magnify(factor) { zoom = THREE.MathUtils.clamp(zoom * factor, 0.65, 3); resize(); }
  function update(next) {
    player=next;
    if (mode==='follow' && player) { target.set(player.x, player.elevation||0, player.y); place(); }
    else if(mode==='overview'&&player&&world.camera?.overviewBounds){target.y=(world.camera.overviewBounds.min[1]+world.camera.overviewBounds.max[1])/2+(player.elevation||0);place();}
  }
  function setMode(value){if(!['overview','follow'].includes(value))return false;mode=value;zoom=1;resize();return true;}
  resize();
  return {camera, resize, screenToWorld,projectInteraction, magnify, update,setMode,
    diagnostics: () => ({target: target.toArray(), span: camera.top - camera.bottom, zoom,mode,followPlayer:mode==='follow'})};
}
