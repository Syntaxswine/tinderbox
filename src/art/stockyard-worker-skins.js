import {Resources} from './resources.js';
import {createStockyardClothMaterial} from './stockyard-worker-paint.js';

export const STOCKYARD_WORKER_SKINS=Object.freeze(['yard-hand','packing-worker','yard-foreman']);
export const STOCKYARD_WORKER_SPECIES=Object.freeze(['goat','horse','bear']);
const SHIRT='connected shirt and sleeves',TROUSERS='connected overalls seat and legs';
const CAPS={
 goat:{x:.043,y:1.526,front:.088,side:.091,height:.055},
 horse:{x:.030,y:1.518,front:.099,side:.086,height:.049},
 bear:{x:.018,y:1.565,front:.108,side:.103,height:.050}
};
const clamp=(n,a=0,b=1)=>Math.max(a,Math.min(b,n));
function loft(T,rows,steps,locate){
 const positions=[],indices=[];
 for(let i=0;i<rows.length;i++)for(let j=0;j<=steps;j++){
  positions.push(...locate(rows[i],j/steps));
  if(i&&j<steps){const a=(i-1)*(steps+1)+j,b=a+steps+1;indices.push(a,b,a+1,a+1,b,b+1);}
 }
 const g=new T.BufferGeometry();g.setAttribute('position',new T.Float32BufferAttribute(positions,3));g.setIndex(indices);g.computeVertexNormals();return g;
}
function subset(T,source,keep,offset=0){
 const positions=source.getAttribute('position'),normal=source.getAttribute('normal'),sourceIndex=source.index?.array||Array.from({length:positions.count},(_,i)=>i),indices=[],used=new Map();
 for(let i=0;i<sourceIndex.length;i+=3){const tri=[sourceIndex[i],sourceIndex[i+1],sourceIndex[i+2]];if(!tri.every(v=>keep(positions.getX(v),positions.getY(v),positions.getZ(v))))continue;for(const v of tri){if(!used.has(v))used.set(v,used.size);indices.push(used.get(v));}}
 if(!indices.length)throw Error('Native garment subset is empty');
 const g=new T.BufferGeometry();
 for(const [name,attribute]of Object.entries(source.attributes)){
  const a=new attribute.array.constructor(used.size*attribute.itemSize);
  for(const [old,next]of used)for(let k=0;k<attribute.itemSize;k++)a[next*attribute.itemSize+k]=attribute.array[old*attribute.itemSize+k];
  g.setAttribute(name,new T.BufferAttribute(a,attribute.itemSize,attribute.normalized));
 }
 g.setIndex(indices);
 if(offset){const p=g.getAttribute('position'),n=g.getAttribute('normal');for(let i=0;i<p.count;i++)p.setXYZ(i,p.getX(i)+n.getX(i)*offset,p.getY(i)+n.getY(i)*offset,p.getZ(i)+n.getZ(i)*offset);}
 g.computeBoundingBox();g.computeBoundingSphere();return g;
}
// Clip copied native triangles at garment seams, interpolating their original
// attributes and bone influences. Source meshes and bind data remain borrowed.
function clippedNative(T,source,regions,offset=0){
 const attributes=Object.entries(source.attributes).filter(([name])=>!['skinIndex','skinWeight'].includes(name));
 const weights=source.getAttribute('skinWeight'),bones=source.getAttribute('skinIndex');
 const vertex=i=>{const a=Object.fromEntries(attributes.map(([name,v])=>[name,Array.from(v.array.slice(i*v.itemSize,(i+1)*v.itemSize))]));a.influences=new Map();for(let k=0;k<4;k++){const w=weights.array[i*4+k],b=bones.array[i*4+k];if(w)a.influences.set(b,(a.influences.get(b)||0)+w);}return a;};
 const mix=(a,b,t)=>{
  const out=Object.fromEntries(attributes.map(([name])=>[name,a[name].map((v,k)=>v+(b[name][k]-v)*t)]));out.influences=new Map();
  for(const [id,w]of a.influences)out.influences.set(id,w*(1-t));
  for(const [id,w]of b.influences)out.influences.set(id,(out.influences.get(id)||0)+w*t);
  return out;
 };
 const out=Object.fromEntries(attributes.map(([name])=>[name,[]])),skinIndices=[],skinWeights=[],index=source.index?.array||Array.from({length:source.attributes.position.count},(_,i)=>i);
 function append(v){
  const n=v.normal,l=Math.hypot(...n)||1,position=v.position.map((p,k)=>p+offset*n[k]/l);
  for(const [name]of attributes)out[name].push(...(name==='position'?position:name==='normal'?n.map(a=>a/l):v[name]));
  const blend=[...v.influences].sort((a,b)=>b[1]-a[1]).slice(0,4),total=blend.reduce((n,p)=>n+p[1],0);
  for(let k=0;k<4;k++){skinIndices.push(blend[k]?.[0]||0);skinWeights.push((blend[k]?.[1]||0)/total);}
 }
 for(let i=0;i<index.length;i+=3){
  const tri=[vertex(index[i]),vertex(index[i+1]),vertex(index[i+2])];
  for(const planes of regions){
   let polygon=tri;
   for(const distance of planes){
    const next=[];
    for(let j=0;j<polygon.length;j++){
     const a=polygon[j],b=polygon[(j+1)%polygon.length],da=distance(a.position),db=distance(b.position),insideA=da>=0,insideB=db>=0;
     if(insideA)next.push(a);
     if(insideA!==insideB)next.push(mix(a,b,da/(da-db)));
    }
    polygon=next;if(polygon.length<3)break;
   }
   for(let j=1;j+1<polygon.length;j++)for(const v of [polygon[0],polygon[j],polygon[j+1]])append(v);
  }
 }
 if(!out.position.length)throw Error('Clipped native garment is empty');
 const g=new T.BufferGeometry();for(const [name,a]of attributes)g.setAttribute(name,new T.Float32BufferAttribute(out[name],a.itemSize));
 g.setAttribute('skinIndex',new T.Uint16BufferAttribute(skinIndices,4));g.setAttribute('skinWeight',new T.Float32BufferAttribute(skinWeights,4));g.computeBoundingBox();g.computeBoundingSphere();return g;
}
function weight(T,g,weightsAt){
 const p=g.getAttribute('position'),indices=new Uint16Array(p.count*4),weights=new Float32Array(p.count*4);
 for(let i=0;i<p.count;i++){const entries=weightsAt(p.getY(i),p.getZ(i));for(let k=0;k<entries.length;k++){indices[i*4+k]=entries[k][0];weights[i*4+k]=entries[k][1];}}
 g.setAttribute('skinIndex',new T.BufferAttribute(indices,4));g.setAttribute('skinWeight',new T.BufferAttribute(weights,4));
}
function mergeShells(T,geometries){
 const positions=[],normals=[];
 for(const g of geometries){const p=g.attributes.position,n=g.attributes.normal,index=g.index?.array||Array.from({length:p.count},(_,i)=>i);
  for(const i of index){positions.push(p.getX(i),p.getY(i),p.getZ(i));normals.push(n.getX(i),n.getY(i),n.getZ(i));}g.dispose();
 }
 const g=new T.BufferGeometry();g.setAttribute('position',new T.Float32BufferAttribute(positions,3));g.setAttribute('normal',new T.Float32BufferAttribute(normals,3));return g;
}
export function stockyardWorkerReviewEnabled(search=globalThis.location?.search||''){
 return new URLSearchParams(search).get('stockyardWorkers')==='1';
}
export function stockyardWorkerSkinFor(id){
 if(id==='neighbor-horse')return 'packing-worker';
 if(id==='neighbor-goat')return 'yard-hand';
 let h=2166136261;for(const c of String(id))h=Math.imul(h^c.charCodeAt(0),16777619);
 return STOCKYARD_WORKER_SKINS[(h>>>0)%STOCKYARD_WORKER_SKINS.length];
}
export function createStockyardWorkerSkin(T,character,{skin='yard-hand',variant=0,texture}={}){
 const actor=character?.root,species=actor?.userData.species;
 if(!STOCKYARD_WORKER_SPECIES.includes(species)||!STOCKYARD_WORKER_SKINS.includes(skin)||!Number.isInteger(variant)||variant<0||variant>3)throw Error('Unknown native stockyard worker species, skin or variant');
 if(actor.getObjectByName('chicago-1893-city-beat'))throw Error('Stockyard workwear cannot replace the protected police uniform');
 const shirt=actor.getObjectByName(SHIRT),pants=actor.getObjectByName(TROUSERS),skeleton=shirt?.skeleton;
 if(!skeleton||!pants?.isSkinnedMesh||pants.skeleton!==skeleton)throw Error('Stockyard clothing requires the pinned native garment meshes and skeleton');
 const nativeRoot=shirt.parent;
 const id='stockyard-worker/'+species+'/'+skin;
 let alreadyFitted=false;actor.traverse(n=>{if(n.name.startsWith('stockyard-worker/'))alreadyFitted=true;});if(alreadyFitted)throw Error('Stockyard worker skin is already fitted');
 const pool=new Resources(),root=new T.Group();root.name=id;
 const pieces=Object.fromEntries(['shirt','trousers','braces','waistcoat','apron','cap','details'].map(name=>{const group=new T.Group();group.name=name;root.add(group);return[name,group];}));
 const original=new Map([[shirt,shirt.visible],[pants,pants.visible]]),bone=name=>skeleton.bones.findIndex(b=>b.name===name),hips=bone('hips'),spine=bone('spine'),head=bone('head'),legs=[bone('thigh-1'),bone('thigh1')];
 let disposed=false;
 const cap=CAPS[species],materials={};
 const fabric=part=>materials[part]||=(createStockyardClothMaterial(T,pool,{skin,texture,part,variant,species,cap}));
 const torso=y=>{const t=clamp((y-.91)/.24);return[[hips,1-t],[spine,t]];},rigid=i=>()=>[[i,1]];
 function add(piece,g,name,at){
  pool.geometry(g);if(at)weight(T,g,at);
  g.setAttribute('uv',new T.Float32BufferAttribute(new Float32Array(g.attributes.position.count*2),2));
  const mesh=new T.SkinnedMesh(g,fabric(piece));mesh.name=name;mesh.frustumCulled=false;mesh.castShadow=mesh.receiveShadow=true;pieces[piece].add(mesh);mesh.bind(skeleton,shirt.bindMatrix);return mesh;
 }
 const vertices=shirt.geometry.getAttribute('position');
 function surface(y,z,front=true){
  let best=front?-Infinity:Infinity;
  for(let i=0;i<vertices.count;i++)if(Math.abs(vertices.getY(i)-y)<.065&&Math.abs(vertices.getZ(i)-z)<.045)best=front?Math.max(best,vertices.getX(i)):Math.min(best,vertices.getX(i));
  return Number.isFinite(best)?best:front?(species==='bear'?.155:.115):species==='bear'?-.21:-.16;
 }
 try{
  if([hips,spine,head,...legs].some(i=>i<0))throw Error('Missing native fitting bones');
  add('shirt',subset(T,shirt.geometry,()=>true),'Native shirt with painted braces or waistcoat');
  add('trousers',clippedNative(T,pants.geometry,[[p=>.968-p[1]]]),'Native trousers with painted pockets and folds');
  if(skin==='packing-worker'){
   const apronRows=[[1.205,.105],[1.10,.125],[.99,.15],[.925,.17]],shells=[];
   shells.push(loft(T,apronRows,4,(r,u)=>{const z=(u*2-1)*r[1];return[surface(r[0],z)+.012,r[0],z];}));
   for(const side of [-1,1])shells.push(loft(T,[[.925,.17],[.78,.18],[.61,.185],[.47,.18]],2,(r,u)=>{const z=side*(.004+u*(r[1]-.004));return[r[0]===.925?surface(.925,z)+.012:Math.max(species==='bear'?.205:.177,surface(.94,side*.09)+.016),r[0],z];}));
   const apronWeight=(y,z)=>{if(y>=.925)return torso(y);const t=clamp((.91-y)/.43)*.76;return[[hips,1-t],[legs[z<0?0:1],t]];};
   add('apron',mergeShells(T,shells),'Simple moving apron with painted seams and folds',apronWeight);
  }
  const c=cap,shells=[
   loft(T,[[c.y,1],[c.y+.018,1.04],[c.y+c.height*.78,.86],[c.y+c.height,.001]],10,(r,u)=>{const a=u*Math.PI*2;return[c.x+c.front*r[1]*Math.cos(a),r[0],c.side*r[1]*Math.sin(a)];}),
   loft(T,[[c.y-.012,1],[c.y+.005,1.01]],10,(r,u)=>{const a=u*Math.PI*2;return[c.x+c.front*r[1]*Math.cos(a),r[0],c.side*r[1]*Math.sin(a)];}),
   loft(T,[[c.y-.009,1],[c.y-.023,1.58]],8,(r,u)=>{const a=(u-.5)*2.32;return[c.x+c.front*r[1]*Math.cos(a),r[0],c.side*(1+(r[1]-1)*.35)*Math.sin(a)];})
  ];
  add('cap',mergeShells(T,shells),'Simple soft cap with painted wool and seams',rigid(head));
  shirt.parent.add(root);shirt.visible=false;pants.visible=false;
 }catch(error){dispose();throw error;}
 function dispose(){if(disposed)return;disposed=true;for(const [mesh,visible]of original)mesh.visible=visible;root.removeFromParent();root.clear();pool.dispose();}
 return{root,pieces,dispose,diagnostics:()=>({id,skin,species,variant,disposed,nativeScale:nativeRoot.scale.toArray(),skeletonBorrowed:true,paintVersion:2,painted:true,paintedDetails:['braces','waistcoat','collar','buttons','pockets','folds','stitching','wear'],triangles:Object.values(pieces).flatMap(p=>p.children).reduce((n,m)=>n+(m.geometry.index?.count||m.geometry.attributes.position.count)/3,0),resources:pool.counts()})};
}
export function dressStockyardWorker(T,character,options){
 const clothing=createStockyardWorkerSkin(T,character,options),release=character.dispose,inspect=character.diagnostics;
 let disposed=false;
 character.dispose=()=>{if(disposed)return;disposed=true;clothing.dispose();release();};
 character.diagnostics=()=>({...inspect(),stockyardWorker:clothing.diagnostics()});
 return character;
}
