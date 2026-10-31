// Review-only camera motion. No renderer, simulation, timers or browser controls.
export const CAMERA_SWEEP_PRESET='contact-street-yaw-v1';
const DURATION=8,ANGLE=8*Math.PI/180,LIMIT=.999,MAX_POINTS=100000,MAX_DRAWS=4096;
const clone=value=>structuredClone(value),finite=Number.isFinite;
const vector=(value,size)=>Array.isArray(value)&&value.length===size&&value.every(finite);
export function reviewCameraRecord(camera){
 return {kind:'orthographic',position:camera.position.toArray(),quaternion:camera.quaternion.toArray(),up:camera.up.toArray(),scale:camera.scale.toArray(),matrix:camera.matrix.toArray(),matrixWorld:camera.matrixWorld.toArray(),matrixWorldInverse:camera.matrixWorldInverse.toArray(),projectionMatrix:camera.projectionMatrix.toArray(),projectionMatrixInverse:camera.projectionMatrixInverse.toArray(),frustum:{left:camera.left,right:camera.right,top:camera.top,bottom:camera.bottom,near:camera.near,far:camera.far,zoom:camera.zoom}};
}
function restore(camera,base){
 camera.position.fromArray(base.position);camera.quaternion.fromArray(base.quaternion);camera.up.fromArray(base.up);camera.scale.fromArray(base.scale);Object.assign(camera,base.frustum);
 for(const name of ['matrix','matrixWorld','matrixWorldInverse','projectionMatrix','projectionMatrixInverse'])camera[name].fromArray(base[name]);camera.matrixWorldNeedsUpdate=false;
}
function orbit(T,camera,base,focus,yaw){
 if(yaw===0){restore(camera,base);return;}
 const offset=new T.Vector3(...base.position).sub(new T.Vector3(...focus)).applyAxisAngle(new T.Vector3(0,1,0),yaw);
 camera.position.copy(offset).add(new T.Vector3(...focus));camera.lookAt(new T.Vector3(...focus));camera.updateMatrixWorld(true);
}
export function cameraSweepYaw(progress){
 const p=Math.max(0,Math.min(1,progress)),knots=[0,.25,.75,1],angles=[0,8,-8,0];
 if(p===0||p===1)return 0;let index=0;while(index<2&&p>knots[index+1])index++;
 const t=(p-knots[index])/(knots[index+1]-knots[index]),ease=t*t*(3-2*t);return angles[index]+(angles[index+1]-angles[index])*ease;
}
export function validateCameraSweep(T,camera,focus,points){
 if(!camera?.isOrthographicCamera||camera.parent||!vector(focus,3)||!Array.isArray(points)||!points.length||points.length>MAX_POINTS||points.some(p=>!vector(p,3))||!camera.up.equals(new T.Vector3(0,1,0))||!camera.scale.equals(new T.Vector3(1,1,1)))return {supported:false,reason:'Finite native/source support and an unparented Y-up orthographic camera are required'};
 const base=reviewCameraRecord(camera),probe=camera.clone(),views=[];
 for(const angle of [0,Math.PI/2,Math.PI]){orbit(T,probe,base,focus,angle);views.push(new T.Matrix4().multiplyMatrices(probe.projectionMatrix,probe.matrixWorldInverse));}
 const offset=new T.Vector3(...base.position).sub(new T.Vector3(...focus));if(Math.hypot(offset.x,offset.z)<1e-6)return {supported:false,reason:'Camera yaw requires a nonzero horizontal offset'};
 const maxAbsNdc=[0,0,0];let worst=null;
 // Every orthographic projected coordinate is a*cos(yaw)+b*sin(yaw)+c.
 // Check its exact stationary points plus interval endpoints: this covers the
 // entire eased path, not only a finite collection of sampled orientations.
 for(let index=0;index<points.length;index++){
  const samples=views.map(matrix=>new T.Vector3(...points[index]).applyMatrix4(matrix).toArray());
  for(let axis=0;axis<3;axis++){
   const a=(samples[0][axis]-samples[2][axis])/2,c=(samples[0][axis]+samples[2][axis])/2,b=samples[1][axis]-c,angles=[-ANGLE,0,ANGLE],phase=Math.atan2(b,a);
   for(let turn=-2;turn<=2;turn++){const at=phase+turn*Math.PI;if(at>=-ANGLE&&at<=ANGLE)angles.push(at);}
   for(const yaw of angles){const value=Math.abs(a*Math.cos(yaw)+b*Math.sin(yaw)+c);if(!finite(value))return {supported:false,reason:'Nonfinite camera/source projection'};if(value>maxAbsNdc[axis])maxAbsNdc[axis]=value;if(!worst||value>worst.absNdc)worst={pointIndex:index,axis,yawDegrees:yaw*180/Math.PI,absNdc:value};}
  }
 }
 const supported=maxAbsNdc.every(value=>value<LIMIT);
 return {supported,reason:supported?null:'The complete native/source envelope does not fit the fixed +/-8 degree sweep; no zoom or framing adaptation was applied',method:'Analytic affine-sinusoid orthographic extrema over [-8,+8] degrees',pointCount:points.length,yawIntervalDegrees:[-8,8],ndcLimit:LIMIT,maxAbsNdc,worst};
}
// These reviewed source-derived bounds belong to one reviewed source closure,
// not to an artist-reported billow count or a visual-acceptance flag.
const R09_SOURCE={sourceCommit:'a876ba6d5e998baa5be5b0ee7c029a1f3a85090d',factoryModule:'assets/art/fire-realism/index.js',factoryExport:'createFireRealism',runtimeFiles:{
 'assets/art/fire-realism/geometry.js':{sha256:'10fcdfc7319686c7ed5a7c2b31dd00304146def42f081d1e25be05751384c036',bytes:1078},
 'assets/art/fire-realism/shaders.js':{sha256:'5f3c65731e3d2b9964a971d390acb5423ad022499afe36d2180e866bba5f620d',bytes:15008},
 'assets/art/fire-realism/index.js':{sha256:'248be51abc7fdabca209a3e2ac7a34f978267b21e4a7c1987fff6e24ba7bf07b',bytes:32097},
 'assets/art/fire-realism/smoke-billows.js':{sha256:'ea8eb36a6399ebdf10201d1ef1685a0ea64a5677e8321f4671c28edb7c24bb6d',bytes:3421},
 'assets/art/fire-realism/ground-field.js':{sha256:'e43e050d26813a907e56e59535bc47f770c374db05032724ae6b9ee35a2f79c8',bytes:11809},
}};
function sourceSupport(mode,fingerprint){
 if(mode==='no-fire')return {kind:'no-fire',mode};
 if(mode==='current'&&fingerprint?.mode==='current'&&fingerprint.sourceCommit==='dc7f537a83a7e832a0dfa0757d0b2700b909c053'&&fingerprint.factoryModule==='src/art/fire.js'&&fingerprint.factoryExport==='createFire')return {kind:'pinned-published-control',mode,sourceCommit:fingerprint.sourceCommit,factoryModule:fingerprint.factoryModule,factoryExport:fingerprint.factoryExport};
 const files=fingerprint?.runtimeFiles,known=R09_SOURCE.runtimeFiles;
 if(mode!=='reference'||fingerprint?.mode!=='reference'||fingerprint.sourceCommit!==R09_SOURCE.sourceCommit||fingerprint.factoryModule!==R09_SOURCE.factoryModule||fingerprint.factoryExport!==R09_SOURCE.factoryExport||!files||Array.isArray(files)||Object.keys(files).length!==Object.keys(known).length||Object.entries(known).some(([path,expected])=>{const actual=files[path];return !actual||actual.verified!==true||actual.sha256!==expected.sha256||actual.expectedSha256!==expected.sha256||actual.bytes!==expected.bytes;}))throw Error('Camera source bounds are unreviewed for this factory entry/runtime closure; the preset requires the exact R09 reference or pinned published control');
 return {kind:'reviewed-r09-source-bounds',mode,sourceCommit:R09_SOURCE.sourceCommit,factoryModule:R09_SOURCE.factoryModule,factoryExport:R09_SOURCE.factoryExport};
}
function addBox(points,min,max){for(const x of [min[0],max[0]])for(const y of [min[1],max[1]])for(const z of [min[2],max[2]])points.push([x,y,z]);}
function contains(root,node){for(let at=node;at;at=at.parent)if(at===root)return true;return false;}
function nativePoints(T,root){
 const points=[];for(let parent=root;parent;parent=parent.parent)if(parent.visible===false||parent.userData?.destroyed===true)throw Error('Native source has a hidden/destroyed ancestor');root.updateWorldMatrix(true,true);root.traverseVisible(mesh=>{
  if(!mesh.isMesh||!mesh.geometry?.attributes.position||[mesh.material].flat().every(m=>!m||m.visible===false))return;
  if(mesh.isInstancedMesh)throw Error('Instanced native source support needs a reviewed transform provider');if(mesh.isSkinnedMesh)mesh.skeleton.update();
  for(let i=0;i<mesh.geometry.attributes.position.count;i++){points.push(mesh.getVertexPosition(i,new T.Vector3()).applyMatrix4(mesh.matrixWorld).toArray());if(points.length>MAX_POINTS)throw Error('Native support exceeds the bounded point capacity');}
 });return points;
}
export function cameraSweepSceneSignature(snapshot){
 const p=snapshot?.player;if(!p||!['matches'].includes(p.tool)||p.hp<=0||p.moving||snapshot.discharge?.active||p.pouring)throw Error('Camera sweep requires the canonical stationary matches scene');
 if((snapshot.projectiles||[]).length)throw Error('Flying projectile support is outside this camera preset');
 if((snapshot.events||[]).some(e=>['explosion','barrel-explosion','barrel-exploded','molotov-impact'].includes(e.type)))throw Error('Transient explosion support is outside this camera preset');
 return JSON.stringify({x:p.x,y:p.y,elevation:p.elevation||0,tool:p.tool,characterId:p.characterId,ashlandDestroyed:(snapshot.world?.buildings||[]).find(b=>b.id==='ashland-cottage')?.destroyed??false});
}
export function captureCameraSweepSupport(T,{scene,snapshot,anchors,configuration,factoryFingerprint}={}){
 if(!['match-contact','street-fire'].includes(configuration?.scenario))throw Error('This preset supports match-contact and street-fire only');
 const source=sourceSupport(configuration.mode,factoryFingerprint),guard=cameraSweepSceneSignature(snapshot),nodes=Object.values(anchors||{}).filter(node=>node?.isObject3D);if(!nodes.length)throw Error('Actual native attachment hierarchy is unavailable');
 let actor=null;for(let at=nodes[0];at&&at!==scene;at=at.parent)if(at.isGroup&&nodes.every(node=>contains(at,node))){actor=at;break;}
 if(!actor||!actor.parent)throw Error('Complete native actor/tool hierarchy is unavailable');
 const points=nativePoints(T,actor);if(!points.length)throw Error('No actual native actor/tool geometry is available');const actorCount=points.length;
 // The canonical script changes aim at its first tick. A radial envelope of
 // actual native vertices covers that rotation without resizing the animal.
 const p=snapshot.player;let radius=0,minY=Infinity,maxY=-Infinity;for(const v of points){radius=Math.max(radius,Math.hypot(v[0]-p.x,v[2]-p.y));minY=Math.min(minY,v[1]);maxY=Math.max(maxY,v[1]);}
 addBox(points,[p.x-radius-.02,minY-.02,p.y-radius-.02],[p.x+radius+.02,maxY+.02,p.y+radius+.02]);
 const groups=[{kind:'actual-native-actor-and-held-tool',points:actorCount,yawInvariantRadiusMetres:radius+.02,verticalPaddingMetres:.02}],references=[];
 if(configuration.scenario==='match-contact'){
  const fuel=snapshot.cells.filter(c=>c.material==='grass');if(fuel.length!==4||fuel.some(c=>!([5.25,5.75].includes(c.x)&&[8.25,8.75].includes(c.y)&&c.size===.5))||snapshot.cells.some(c=>c.depositedFuel>0||c.phase==='burning'&&c.material!=='grass'))throw Error('Contact support is proved only for the canonical four grass cells with no added fuel');
  // R09 index ground(): area1, mean<=1, spread<=sqrt(.125), wood=gas=0.
  // radius<=.40+.30+.43*sqrt(.125)=.852027958; shape height<=2.28.
  // smoke-billows.js: local radius<=.23+1.22*(.24+.64)*1.14=1.453904;
  // normalized axis lateral=.22/sqrt(1+.22**2); origin Y<=.18+3.2*.36.
  // The conservative joint world box includes the full active/spent sequence,
  // all supported billow phases/noise, and the smaller published smoke cards.
  addBox(points,[5.5-1.73,-.087,8.5-1.73],[5.5+1.73,3.826,8.5+1.73]);
  groups.push({kind:'canonical-four-grass-contact-fire-and-smoke',sourceCellIds:fuel.map(c=>c.id).sort(),centroid:[5.5,0,8.5],horizontalRadiusMetres:1.73,minY:-.087,maxY:3.826,tailSeconds:3.2,limits:'Canonical four-cell grass contact only; no arbitrary added fuel/jet/explosion'});
  references.push('R09 assets/art/fire-realism/index.js ground regional radius/height/axis and 3.2-second tail','R09 assets/art/fire-realism/smoke-billows.js billow support1.22, drift.23 and radius(.24+.64)*1.14','Published src/art/fire.js smoke card width/height/drift is contained by this same envelope');
 }else{
  let house=null;scene.traverse(node=>{if(node.userData?.buildingId==='ashland-cottage'){if(house)throw Error('Duplicate native Ashland root');house=node;}});if(!house||!house.visible)throw Error('Actual native Ashland structure is unavailable');
  const structure=nativePoints(T,house);if(!structure.length)throw Error('No native Ashland mesh support');for(const point of structure)points.push(point);groups.push({kind:'actual-native-ashland-structure',buildingId:'ashland-cottage',points:structure.length});
  const boxes=(snapshot.world.obstacles||[]).filter(b=>b.buildingId==='ashland-cottage'),cells=snapshot.cells.filter(c=>c.material==='wood'&&boxes.some(b=>Math.abs(c.x-b.x)<b.width/2+c.size/2-1e-9&&Math.abs(c.y-b.y)<b.depth/2+c.size/2-1e-9));
  if(cells.length!==253)throw Error('The declared Ashland source support requires its complete 253-cell footprint');
  for(const cell of cells)for(const x of [cell.x-cell.size/2,cell.x+cell.size/2])for(const z of [cell.y-cell.size/2,cell.y+cell.size/2])for(const dx of [-2,2])for(const dz of [-2,2])for(const y of [0,6.5])points.push([x+dx,y,z+dz]);
  groups.push({kind:'existing-declared-ashland-source-smoke-envelope',sourceCells:253,lateralMetres:2,ceilingMetres:6.5,limits:'Intended Ashland action view; not the entire 51x47 map'});references.push('Unchanged tools/fire-realism/camera.js measured Ashland/source-smoke fit policy');
 }
 if(points.length>MAX_POINTS||points.some(point=>!vector(point,3)))throw Error('Invalid or excessive actual source support');return {points,descriptor:{kind:'native-source-containment-v1',sourceSupport:source,groups,references,guard,pointCount:points.length}};
}
export function createCameraSweep(T){
 let camera=null,base=null,focus=null,configuration=null,validation={supported:false,reason:'Native/source support has not been prepared'},run=null,lastRecord=null,pendingEnd=false,viewStatus='unavailable',disposed=false,startGeneration=0;
 const restored=()=>!!base&&JSON.stringify(reviewCameraRecord(camera))===JSON.stringify(base);
 function state(){return {supported:validation.supported===true,active:!!run&&run.status==='running',status:viewStatus,progress:run?.progress??0,preset:CAMERA_SWEEP_PRESET,reason:validation.supported?run?.reason??null:validation.reason,restored:base?restored():true,elapsedSeconds:run?.elapsedSeconds??0,durationSeconds:DURATION,sampledDraws:run?.sampledDraws??0};}
 function stop({restoreStatic=true,reason='manual-stop',cancelled=false,monotonicMs=performance.now(),world=null}={}){
  if(typeof restoreStatic!=='boolean')throw TypeError('restoreStatic must be boolean');startGeneration++;
  if(run?.status==='running'){run.status=cancelled?'cancelled':'interrupted';run.reason=reason;run.end={monotonicMs,world:clone(run.lastDrawWorld||world),camera:clone(run.lastDrawCamera||run.start.camera)};pendingEnd=false;viewStatus=run.status;lastRecord=run;}
  if(restoreStatic&&base&&!restored()){restore(camera,base);if(run)run.restoration={kind:'static-restoration',monotonicMs,camera:reviewCameraRecord(camera),drawn:false};}
  return state();
 }
 return {state,
  bind(nextCamera,policy,nextConfiguration){if(disposed)throw Error('Camera sweep disposed');if(run?.status==='running')throw Error('Cancel camera sweep before replacing its base');startGeneration++;camera=nextCamera;base=reviewCameraRecord(camera);focus=clone(policy.focus);configuration=clone(nextConfiguration);run=null;pendingEnd=false;viewStatus='unavailable';validation={supported:false,reason:'Native/source support has not been prepared'};},
  support(value){if(!base)return state();validation=value?.points?{...validateCameraSweep(T,camera,focus,value.points),descriptor:clone(value.descriptor),points:clone(value.points)}: {supported:false,reason:value?.reason||'Native/source support is unavailable'};if(!run)viewStatus=validation.supported?'idle':'unavailable';return state();},
  async start({preset=CAMERA_SWEEP_PRESET,now=()=>performance.now(),getWorld,guard,sourceFingerprints}={}){
   if(disposed)throw Error('Camera sweep disposed');if(preset!==CAMERA_SWEEP_PRESET)throw RangeError('Unknown camera sweep preset');if(run?.status==='running')throw Error('A camera sweep is already active');if(!restored())throw Error('Restore the static camera before starting another sweep');if(!validation.supported)throw Error(validation.reason);if(typeof now!=='function'||typeof getWorld!=='function')throw TypeError('Camera sweep requires time/world readers');const generation=++startGeneration;
   if(!globalThis.crypto?.subtle)throw Error('Web Crypto is required for camera source support evidence');lastRecord=null;const digest=await crypto.subtle.digest('SHA-256',new TextEncoder().encode(JSON.stringify(validation.points))),sha256=Array.from(new Uint8Array(digest)).map(n=>n.toString(16).padStart(2,'0')).join('');if(disposed||generation!==startGeneration)throw new DOMException('Camera sweep preparation cancelled','AbortError');if(guard&&guard()!==validation.descriptor.guard)throw Error('Scene support changed during camera preparation');const monotonicMs=now(),world=getWorld();if(!finite(monotonicMs))throw TypeError('Invalid camera sweep start time');
   const {points,descriptor,...proof}=validation;run={version:1,kind:'review-camera-sweep-evidence',preset,status:'running',reason:null,path:{durationSeconds:DURATION,yawKnotsDegrees:[0,8,-8,0],knotProgress:[0,.25,.75,1],easing:'smoothstep',axis:'world-y',baseCamera:clone(base),focus:clone(focus)},configuration:clone(configuration),sourceFingerprints:clone(sourceFingerprints),support:{...clone(descriptor),sha256,validation:clone(proof)},start:{monotonicMs,world:clone(world),camera:reviewCameraRecord(camera)},end:null,samples:[],sampledDraws:0,lastDrawCamera:null,lastDrawWorld:null,restoration:null,limits:['Review camera motion, not gameplay or GPU-cost evidence.','Per-draw timestamps/poses are not encoded-video PTS or a per-encoded-frame simulation ledger.'],elapsedSeconds:0,progress:0,yawDegrees:0};lastRecord=run;viewStatus='running';pendingEnd=false;return state();
  },
  advance(monotonicMs){if(!run||run.status!=='running')return false;if(!finite(monotonicMs)||monotonicMs<0)throw RangeError('Camera time must be finite and monotonic');const elapsed=Math.max(0,Math.min(DURATION,(monotonicMs-run.start.monotonicMs)/1000));if(elapsed<run.elapsedSeconds)throw RangeError('Camera time cannot rewind');const previous=run.yawDegrees;run.elapsedSeconds=elapsed;run.progress=elapsed/DURATION;run.yawDegrees=cameraSweepYaw(run.progress);orbit(T,camera,base,focus,run.yawDegrees*Math.PI/180);pendingEnd=run.progress===1;return previous!==run.yawDegrees||pendingEnd;},
  recordDraw({callbackTimeMs=null,drawTimeMs=performance.now(),world}={}){
   if(!run)return;if(run.status!=='running'){if(run.restoration&&!run.restoration.drawn&&restored())Object.assign(run.restoration,{drawn:true,drawTimeMs,world:clone(world)});return;}if(run.sampledDraws>=MAX_DRAWS){stop({cancelled:true,reason:'Camera evidence draw capacity exceeded',monotonicMs:drawTimeMs,world});throw RangeError('Camera evidence draw capacity exceeded; stop instead of silently dropping samples');}
   run.samples.push({renderIndex:run.sampledDraws++,callbackTimeMs,drawTimeMs,elapsedSeconds:run.elapsedSeconds,progress:run.progress,yawDegrees:run.yawDegrees,...clone(world),position:camera.position.toArray(),quaternion:camera.quaternion.toArray()});run.lastDrawCamera=reviewCameraRecord(camera);run.lastDrawWorld=clone(world);
   if(pendingEnd){run.status='complete';run.end={monotonicMs:drawTimeMs,world:clone(world),camera:reviewCameraRecord(camera)};run.restoration={kind:'natural-endpoint',monotonicMs:drawTimeMs,camera:reviewCameraRecord(camera),drawn:true,drawTimeMs,world:clone(world)};viewStatus='complete';pendingEnd=false;}
  },stop,
  needsRestorationDraw:()=>!!run?.restoration&&!run.restoration.drawn,
  evidence(){if(run?.status==='running')throw Error('Retire camera motion before exporting its evidence');if(!lastRecord)return null;const {lastDrawCamera,lastDrawWorld,...retained}=lastRecord;const value=clone(retained);lastRecord=null;if(run){run.samples=[];}return value;},
  guard(snapshot){return !run||run.status!=='running'||cameraSweepSceneSignature(snapshot)===run.support.guard;},
  dispose(){if(disposed)return;stop({cancelled:true,reason:'disposed'});disposed=true;validation={supported:false,reason:'Camera sweep disposed'};run=lastRecord=null;camera=base=null;}
 };
}
