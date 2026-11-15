// Barycentric cloth mounts extracted from the approved native character harness.
// Rays fit visual anchors only, after authoritative fire presentation is active.
const MAX_SMOKE_STRENGTH=4.7;
function attach(T,hit,incoming,scale,seed) {
  const mesh=hit.object,{a,b,c}=hit.face,weights=hit.barycoord.clone();
  const p=new T.Vector3(),q=new T.Vector3(),r=new T.Vector3(),normal=new T.Vector3(),center=new T.Vector3();let sign;
  const patch={x:0,y:0,z:0,seed,scale,flameStrength:0,smokeStrength:0,shroudDetail:true,age:0};
  return {patch,meshName:mesh.name,update(flameStrength,smokeStrength){
    mesh.getVertexPosition(a,p).applyMatrix4(mesh.matrixWorld);mesh.getVertexPosition(b,q).applyMatrix4(mesh.matrixWorld);mesh.getVertexPosition(c,r).applyMatrix4(mesh.matrixWorld);
    center.copy(p).multiplyScalar(weights.x).addScaledVector(q,weights.y).addScaledVector(r,weights.z);normal.subVectors(q,p).cross(r.sub(p)).normalize();
    sign??=normal.dot(incoming)>0?-1:1;center.addScaledVector(normal,sign*.055);
    patch.x=center.x;patch.y=center.y;patch.z=center.z;patch.flameStrength=flameStrength;patch.smokeStrength=smokeStrength;
  }};
}
function closestCloth(T,meshes,target) {
  const a=new T.Vector3(),b=new T.Vector3(),c=new T.Vector3(),p=new T.Vector3(),triangle=new T.Triangle(),weights=new T.Vector3();let result,distance=Infinity;
  for(const mesh of meshes){const index=mesh.geometry.index,count=index?.count??mesh.geometry.attributes.position.count;
    for(let at=0;at<count;at+=3){const ia=index?index.getX(at):at,ib=index?index.getX(at+1):at+1,ic=index?index.getX(at+2):at+2;
      mesh.getVertexPosition(ia,a).applyMatrix4(mesh.matrixWorld);mesh.getVertexPosition(ib,b).applyMatrix4(mesh.matrixWorld);mesh.getVertexPosition(ic,c).applyMatrix4(mesh.matrixWorld);
      triangle.set(a,b,c).closestPointToPoint(target,p);const d=p.distanceToSquared(target);if(d>=distance)continue;
      triangle.getBarycoord(p,weights);distance=d;result={object:mesh,face:{a:ia,b:ib,c:ic},barycoord:weights.clone(),point:p.clone()};
    }
  }
  if(!result)throw Error('Native shroud has no clothing surface');return result;
}
export function createNativeClothMounts(T,worker,profile,seed) {
  const root=worker.root,side=seed&1?-1:1,raycaster=new T.Raycaster(),mounts=[];
  const overalls=profile.lowerCloth,shirt=profile.upperCloth;
  const zones=[
    {cloth:[...shirt,...overalls],from:[.62,.76,side*.68],targetZ:side*.085,scale:.70,delay:0,flame:1,smoke:.33,flameRise:1.12},
    {cloth:overalls,from:[.62,.25,side*.54],targetZ:side*.22,scale:1.12,delay:.08,flame:1,smoke:.16,flameRise:1.60},
    {cloth:overalls,from:[.53,.40,-side*.61],targetZ:-side*.20,scale:1.10,delay:.18,flame:1,smoke:.22,flameRise:1.54},
    {cloth:[...shirt,...overalls],from:[-.63,.99,side*.27],targetZ:side*.085,scale:1.02,delay:.26,flame:.82,smoke:3,flameRise:1,smokeSize:1.63,smokeRise:2}
  ];
  for(const [i,z]of zones.entries()){
    const start=root.localToWorld(new T.Vector3(...profile.transform(z.from))),target=root.localToWorld(new T.Vector3(...profile.transform([0,z.from[1],z.targetZ]))),incoming=target.clone().sub(start);
    raycaster.far=incoming.length();raycaster.set(start,incoming.normalize());const hit=raycaster.intersectObjects(z.cloth,false)[0]??closestCloth(T,z.cloth,target);
    const mount=attach(T,hit,incoming,z.scale*profile.patchScale,(seed+i*9)>>>0);mount.delay=z.delay;mount.flame=z.flame;mount.smoke=z.smoke;
    Object.assign(mount.patch,{flameRise:z.flameRise*profile.sy/profile.patchScale,smokeSize:z.smokeSize??1,smokeRise:z.smokeRise??1});
    mount.update(0,0);mounts.push(mount);
  }
  return {mounts,update(time,age,flames,smoke){
    for(const m of mounts){const rise=T.MathUtils.smoothstep(age-m.delay,.02,.24);m.patch.age=age;m.update(.73*rise*m.flame*flames,Math.min(1.55*rise*m.smoke*smoke,MAX_SMOKE_STRENGTH));}
    return mounts.map(m=>m.patch);
  }};
}
