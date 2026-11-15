// Source bands retain the approved bear's native metre dimensions.
// Other effects fit actual native clothing bounds; no model is rescaled.
export const REFERENCE_CLOTHING = Object.freeze({
  min: [-.2524004876613617,.14088189601898193,-.48454558849334717],
  max: [.17664490640163422,1.2932660579681396,.48454558849334717]
});
export const REFERENCE_RINGS = Object.freeze([
  [.19,-.023,.170,.337,6], [.43,.018,.184,.337,6],
  [.68,-.041,.274,.390,6], [.95,-.048,.291,.411,8],
  [1.24,-.043,.251,.337,6]
].map(Object.freeze));
const TAU=Math.PI*2;
export function seedOf(id) {
  let h=2166136261;
  for(let i=0;i<id.length;i++)h=Math.imul(h^id.charCodeAt(i),16777619);
  return h>>>0;
}
export function visibleInScene(root) {
  let inScene=false;
  for(let node=root;node;node=node.parent){if(!node.visible)return false;if(node.isScene)inScene=true;}
  return inScene;
}
function visiblePart(mesh,root) {for(let n=mesh;n;n=n.parent){if(!n.visible)return false;if(n===root)return true;}return false;}
export function fitNativeProfile(T,worker,species) {
  const native=worker.parts.filter(m=>/^connected (shirt|overalls)/.test(m.name));
  if(native.length!==2)throw Error('Native shroud needs the original connected shirt and overalls');
  const uniform=worker.root.getObjectByName('chicago-1893-city-beat'),replacement=[];
  // Inspect only this existing tagged outfit. Never fit helmets, badges, metal or weapons.
  if(uniform)for(const piece of ['coat','trousers','footwear'])uniform.getObjectByName(piece)?.traverse(m=>{
    if(m.isSkinnedMesh&&visiblePart(m,worker.root)&&!/button/i.test(m.name)&&!(m.material?.metalness>.1))replacement.push(m);
  });
  const upperCloth=[...native.filter(m=>/shirt/.test(m.name)&&visiblePart(m,worker.root)),...replacement.filter(m=>/frock|forearm wool|cuff|collar/i.test(m.name))];
  const lowerCloth=[...native.filter(m=>/overalls/.test(m.name)&&visiblePart(m,worker.root)),...replacement.filter(m=>/trousers|frock skirt/i.test(m.name))];
  if(!upperCloth.length||!lowerCloth.length)throw Error('Native shroud has no visible upper/lower clothing');
  const cloth=[...new Set([...upperCloth,...lowerCloth])];
  const envelopeParts=cloth.filter(m=>!replacement.includes(m)||/shoulders|frock skirt|trousers|collar/i.test(m.name));
  const anchorParts=[...new Set([...worker.parts.filter(m=>visiblePart(m,worker.root)),...replacement])];
  const box=new T.Box3(),point=new T.Vector3();
  for(const mesh of envelopeParts)for(let i=0;i<mesh.geometry.attributes.position.count;i++)box.expandByPoint(point.fromBufferAttribute(mesh.geometry.attributes.position,i));
  const ref=REFERENCE_CLOTHING,refCenter=(ref.min[0]+ref.max[0])/2,center=(box.min.x+box.max.x)/2;
  const sx=species==='bear'?1:(box.max.x-box.min.x)/(ref.max[0]-ref.min[0]);
  const sy=species==='bear'?1:box.max.y/ref.max[1];
  const sz=species==='bear'?1:(box.max.z-box.min.z)/(ref.max[2]-ref.min[2]);
  const transform=p=>[center+(p[0]-refCenter)*sx,p[1]*sy,p[2]*sz];
  // The original bear ring coordinates remain the exact reference.
  const rings=REFERENCE_RINGS.map(([y,x,rx,rz,count])=>[y*sy,species==='bear'?x:transform([x,0,0])[0],rx*sx,rz*sz,count]);
  if(replacement.length)for(const ring of rings){
    const [y,x,rx,rz]=ring,row=new T.Box3();
    for(const mesh of envelopeParts)for(let i=0;i<mesh.geometry.attributes.position.count;i++){point.fromBufferAttribute(mesh.geometry.attributes.position,i);if(Math.abs(point.y-y)<.10)row.expandByPoint(point);}
    if(!row.isEmpty()){ring[2]=Math.max(rx,Math.max(Math.abs(row.min.x-x),Math.abs(row.max.x-x))+.03);ring[3]=Math.max(rz,Math.max(Math.abs(row.min.z),Math.abs(row.max.z))+.03);}
  }
  return {species,cloth,upperCloth,lowerCloth,envelopeParts,anchorParts,outfit:replacement.length?'chicago-1893-city-beat':'native-normal',transform,rings,sx,sy,sz,patchScale:Math.sqrt(sx*sz),bounds:{min:box.min.toArray(),max:box.max.toArray()}};
}
function skinMatrix(T,mesh,index) {
  const zero=mesh.applyBoneTransform(index,new T.Vector3()),
    x=mesh.applyBoneTransform(index,new T.Vector3(1,0,0)).sub(zero),
    y=mesh.applyBoneTransform(index,new T.Vector3(0,1,0)).sub(zero),
    z=mesh.applyBoneTransform(index,new T.Vector3(0,0,1)).sub(zero);
  return new T.Matrix4().makeBasis(x,y,z).setPosition(zero);
}
function nearestVertices(T,worker) {
  const inverse=worker.root.matrixWorld.clone().invert(),point=new T.Vector3(),vertices=[];
  for(const mesh of worker.parts) {
    const relative=new T.Matrix4().multiplyMatrices(inverse,mesh.matrixWorld);
    for(let index=0;index<mesh.geometry.attributes.position.count;index++){
      mesh.getVertexPosition(index,point).applyMatrix4(relative);
      vertices.push({mesh,index,x:point.x,y:point.y,z:point.z});
    }
  }
  return vertices;
}
function bandAnchor(T,worker,vertices,local) {
  let closest,distance=Infinity;
  for(const v of vertices){const d=(v.x-local.x)**2+(v.y-local.y)**2+(v.z-local.z)**2;if(d<distance){closest=v;distance=d;}}
  if(!closest)throw Error('Native shroud has no posed body vertices');
  const {mesh,index}=closest,skin=skinMatrix(T,mesh,index);
  if(Math.abs(skin.determinant())<1e-10)throw Error('Native shroud has a singular skin binding');
  const bindPoint=local.clone().applyMatrix4(worker.root.matrixWorld).applyMatrix4(mesh.matrixWorld.clone().invert()).applyMatrix4(skin.invert());
  const point=new T.Vector3();
  return {mesh,index,update(out){return out.copy(mesh.applyBoneTransform(index,point.copy(bindPoint))).applyMatrix4(mesh.matrixWorld);}};
}
export function createNativeBands(T,worker,profile,seed) {
  const root=worker.root,vertices=nearestVertices(T,{root,parts:profile.anchorParts}),phase=(seed/4294967296)*TAU,bands=[];
  const point=new T.Vector3(),baseWorld=new T.Vector3(),rippleWorld=new T.Vector3(),tangent=new T.Vector3(),origin=new T.Vector3(),air=new Float64Array(3);
  for(const [row,[y,x,rx,rz,count]]of profile.rings.entries())for(let i=0;i<count;i++) {
    const angle=(i+.37*row)*TAU/count,around=Math.acos(Math.cos(angle-phase))/Math.PI;
    const base=new T.Vector3(x+rx*Math.cos(angle),y,rz*Math.sin(angle));
    bands.push({row,x,y,rx,rz,angle,base,anchor:bandAnchor(T,worker,vertices,base),delay:around*.27+row*.013,
      width:.55*TAU*Math.hypot(rx,rz)/(Math.SQRT2*count),thickness:.045,hot:(i+row)%3===0,
      worldX:0,worldY:0,worldZ:0,height:0,heading:0,alpha:0,leanX:0,leanZ:0});
  }
  return {
    bands,
    update(time,age,flames,sampleWind) {
      const world=root.matrixWorld.elements;air.fill(0);sampleWind?.(world[12],world[13]+.8*profile.sy,world[14],air);
      for(let i=0;i<3;i++)if(!Number.isFinite(air[i]))air[i]=0;
      origin.set(0,0,0).applyMatrix4(root.matrixWorld);
      for(const b of bands){
        const ripple=Math.sin(time*9.7+b.angle*2+b.row*1.2+phase),crest=Math.sin(time*6.3-b.angle*3+b.row*.61+phase),angle=b.angle+.09*ripple;
        point.set(b.x+(b.rx+.016*profile.sx*ripple)*Math.cos(angle),b.y+.058*profile.sy*crest,(b.rz+.017*profile.sz*ripple)*Math.sin(angle));
        baseWorld.copy(b.base).applyMatrix4(root.matrixWorld);rippleWorld.copy(point).applyMatrix4(root.matrixWorld).sub(baseWorld);
        b.anchor.update(point).add(rippleWorld);b.worldX=point.x;b.worldY=point.y;b.worldZ=point.z;
        tangent.set(-b.rx*Math.sin(angle),0,b.rz*Math.cos(angle)).applyMatrix4(root.matrixWorld).sub(origin);b.heading=Math.atan2(tangent.z,tangent.x);
        b.leanX=T.MathUtils.clamp(air[0]*.5,-.24,.24)+.12*ripple;b.leanZ=T.MathUtils.clamp(air[2]*.5,-.24,.24)+.11*crest;
        b.height=(.112+.027*(1+crest))*profile.sy;b.alpha=(.78+.15*ripple)*flames*T.MathUtils.smoothstep(age-b.delay,.02,.26);
      }
      return bands;
    }
  };
}
