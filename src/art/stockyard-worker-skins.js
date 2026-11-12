import {Resources} from './resources.js';

export const STOCKYARD_WORKER_SKINS=Object.freeze(['yard-hand','packing-worker','yard-foreman']);
export const STOCKYARD_WORKER_SPECIES=Object.freeze(['goat','horse','bear']);
const SHIRT='connected shirt and sleeves',TROUSERS='connected overalls seat and legs';
const COLORS={
 'yard-hand':{shirt:0xd3c6a6,pants:0x535647,strap:0x594334,cap:0x68523d,vest:0x6a5040},
 'packing-worker':{shirt:0x6f8290,pants:0x4f4b42,strap:0xbbaa87,cap:0x66604f,apron:0xd4c6a5},
 'yard-foreman':{shirt:0xd8cbb0,pants:0x4a4a42,strap:0x44372c,cap:0x43453c,vest:0x71533c}
};
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
function clothGrain(T,g,wear){
 const p=g.getAttribute('position'),c=new Float32Array(p.count*3);
 for(let i=0;i<p.count;i++){
  const x=p.getX(i),y=p.getY(i),z=p.getZ(i),grain=Math.sin(x*713+y*173)*Math.sin(z*467-y*291);
  const hem=wear*Math.exp(-(((y-.55)/.13)**2)),tone=.97+.035*grain-hem;
  c.set([tone,tone*.995,tone*.97],i*3);
 }
 g.setAttribute('color',new T.BufferAttribute(c,3));
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
export function createStockyardWorkerSkin(T,character,{skin='yard-hand',variant=0}={}){
 const actor=character?.root,species=actor?.userData.species;
 if(!STOCKYARD_WORKER_SPECIES.includes(species)||!STOCKYARD_WORKER_SKINS.includes(skin)||!Number.isInteger(variant)||variant<0||variant>3)throw Error('Unknown native stockyard worker species, skin or variant');
 if(actor.getObjectByName('chicago-1893-city-beat'))throw Error('Stockyard workwear cannot replace the protected police uniform');
 const shirt=actor.getObjectByName(SHIRT),pants=actor.getObjectByName(TROUSERS),skeleton=shirt?.skeleton;
 if(!skeleton||!pants?.isSkinnedMesh||pants.skeleton!==skeleton)throw Error('Stockyard clothing requires the pinned native garment meshes and skeleton');
 const nativeRoot=shirt.parent;
 const id='stockyard-worker/'+species+'/'+skin;
 if(actor.getObjectByName(id))throw Error('Stockyard worker skin is already fitted');
 const pool=new Resources(),root=new T.Group();root.name=id;
 const pieces=Object.fromEntries(['shirt','trousers','braces','waistcoat','apron','cap','details'].map(name=>{const group=new T.Group();group.name=name;root.add(group);return[name,group];}));
 const original=new Map([[shirt,shirt.visible],[pants,pants.visible]]),bone=name=>skeleton.bones.findIndex(b=>b.name===name),hips=bone('hips'),spine=bone('spine'),head=bone('head'),legs=[bone('thigh-1'),bone('thigh1')];
 let disposed=false;
 const colors=COLORS[skin],tone=[1,.91,1.055,.97][variant],materials={};
 const fabric=(name,color)=>materials[name]=pool.material(new T.MeshStandardMaterial({name:'Stockyard '+skin+' / '+name,color:new T.Color(color).multiplyScalar(tone),roughness:.95,side:T.DoubleSide,vertexColors:true}));
 const shirtMat=fabric('shirt',colors.shirt),pantsMat=fabric('trousers',colors.pants),strapMat=fabric('braces',colors.strap),capMat=fabric('cap',colors.cap),edgeMat=fabric('seams',0x51473b);
 const apronMat=skin==='packing-worker'?fabric('apron',colors.apron):null,vestMat=skin==='yard-foreman'?fabric('waistcoat',colors.vest):null;
 const brass=pool.material(new T.MeshStandardMaterial({name:'Dull work-clothes buttons',color:0x9c8455,roughness:.64,metalness:.18}));
 const torso=y=>{const t=clamp((y-.91)/.24);return[[hips,1-t],[spine,t]];},rigid=i=>()=>[[i,1]];
 function add(piece,g,mat,name,at){
  pool.geometry(g);if(at)weight(T,g,at);if(mat.vertexColors)clothGrain(T,g,skin==='packing-worker'?.08:.025);
  const mesh=new T.SkinnedMesh(g,mat);mesh.name=name;mesh.frustumCulled=false;mesh.castShadow=mesh.receiveShadow=true;pieces[piece].add(mesh);mesh.bind(skeleton,shirt.bindMatrix);return mesh;
 }
 const vertices=shirt.geometry.getAttribute('position');
 function surface(y,z,front=true){
  let best=front?-Infinity:Infinity;
  for(let i=0;i<vertices.count;i++)if(Math.abs(vertices.getY(i)-y)<.065&&Math.abs(vertices.getZ(i)-z)<.045)best=front?Math.max(best,vertices.getX(i)):Math.min(best,vertices.getX(i));
  return Number.isFinite(best)?best:front?(species==='bear'?.155:.115):species==='bear'?-.21:-.16;
 }
 function strip(piece,z,front,mat){
  const rows=[.927,1.00,1.08,1.16,1.235,1.275].map(y=>[y,surface(y,z,front)+(front?.006:-.006)]);
  return add(piece,loft(T,rows,1,(r,u)=>[r[1],r[0],z+(u-.5)*.031]),mat,'Woven braces '+front+' '+z,torso);
 }
 function button(y,z=0){add('details',new T.SphereGeometry(.009,8,5).scale(.35,1,1).translate(surface(y,z)+.009,y,z),brass,'Small workwear button',torso);}
 try{
  if([hips,spine,head,...legs].some(i=>i<0))throw Error('Missing native fitting bones');
  add('shirt',subset(T,shirt.geometry,()=>true),shirtMat,'Native shirt and sleeves in period cloth');
  add('trousers',clippedNative(T,pants.geometry,[[p=>.968-p[1]]]),pantsMat,'Native trouser legs without modern overall bib');
  // Small pointed collar tabs follow the existing chest, leaving the native neck/fur visible.
  for(const side of [-1,1]){
   const points=[[surface(1.264,side*.052)+.007,1.264,side*.052],[surface(1.242,side*.083)+.009,1.242,side*.083],[surface(1.192,side*.035)+.009,1.192,side*.035]];
   const g=new T.BufferGeometry();g.setAttribute('position',new T.Float32BufferAttribute(points.flat(),3));g.setIndex([0,1,2]);g.computeVertexNormals();add('details',g,shirtMat,'Pointed shirt collar '+side,torso);
  }
  if(skin==='yard-hand'){
   for(const side of [-1,1]){const z=side*.105;strip('braces',z,true,strapMat);strip('braces',z,false,strapMat);
    add('braces',loft(T,[[.11,1.275],[-.14,1.275]],1,(r,u)=>[r[0],r[1]+.007*Math.sin(u*Math.PI),z+(u-.5)*.031]),strapMat,'Braces over native shoulder '+side,rigid(spine));
   }
   for(const y of [1.17,1.09,1.01])button(y);
  }
  if(skin==='yard-foreman'){
   const width=species==='bear'?.262:.216,body=[p=>p[1]-.925,p=>width-p[2],p=>width+p[2]];
   const back=[...body,p=>-p[0]],front=side=>[...body,p=>p[0],p=>p[2]*side,p=>p[2]*side-(p[1]-1.09)*.53];
   add('waistcoat',clippedNative(T,shirt.geometry,[back,front(-1),front(1)],.0045),vestMat,'Sleeveless waistcoat fitted from native torso');
   for(const y of [1.075,1.025,.975])button(y);
   for(const side of [-1,1]){
    const z=side*.105;add('details',new T.BoxGeometry(.006,.012,.067).translate(surface(1.025,z)+.009,1.025,z),vestMat,'Waistcoat welt pocket '+side,torso);
   }
  }
  if(skin==='packing-worker'){
   const apronRows=[[1.205,.105],[1.10,.125],[.99,.15],[.925,.17]];
   add('apron',loft(T,apronRows,8,(r,u)=>{const z=(u*2-1)*r[1];return[surface(r[0],z)+.012,r[0],z];}),apronMat,'Cloth apron bib',torso);
   const apronWeight=(y,z)=>{const t=clamp((.91-y)/.43)*.76;return[[hips,1-t],[legs[z<0?0:1],t]];};
   for(const side of [-1,1]){
    add('apron',loft(T,[[.927,.17],[.78,.18],[.61,.185],[.47,.18]],4,(r,u)=>[Math.max(species==='bear'?.205:.177,surface(.94,side*.09)+.016),r[0],side*(.004+u*(r[1]-.004))]),apronMat,'Split apron skirt '+side,apronWeight);
    const z=side*.075;strip('apron',z,false,apronMat);
   }
   const band=loft(T,[[.902,1],[.930,1]],28,(r,u)=>{const a=u*Math.PI*2;return[-.025+(species==='bear'?.225:.19)*Math.cos(a),r[0],.235*Math.sin(a)];});add('apron',band,apronMat,'Apron waist ties',torso);
  }
  const c=CAPS[species];
  add('cap',loft(T,[[c.y,1],[c.y+.018,1.04],[c.y+c.height*.78,.86],[c.y+c.height,.001]],28,(r,u)=>{const a=u*Math.PI*2;return[c.x+c.front*r[1]*Math.cos(a),r[0],c.side*r[1]*Math.sin(a)];}),capMat,'Species-fitted soft work cap',rigid(head));
  add('cap',loft(T,[[c.y-.012,1],[c.y+.005,1.01]],28,(r,u)=>{const a=u*Math.PI*2;return[c.x+c.front*r[1]*Math.cos(a),r[0],c.side*r[1]*Math.sin(a)];}),edgeMat,'Work-cap band',rigid(head));
  add('cap',loft(T,[[c.y-.009,1],[c.y-.023,1.58]],18,(r,u)=>{const a=(u-.5)*2.32;return[c.x+c.front*r[1]*Math.cos(a),r[0],c.side*(1+(r[1]-1)*.35)*Math.sin(a)];}),capMat,'Short cloth visor',rigid(head));
  shirt.parent.add(root);shirt.visible=false;pants.visible=false;
 }catch(error){dispose();throw error;}
 function dispose(){if(disposed)return;disposed=true;for(const [mesh,visible]of original)mesh.visible=visible;root.removeFromParent();root.clear();pool.dispose();}
 return{root,pieces,dispose,diagnostics:()=>({id,skin,species,variant,disposed,nativeScale:nativeRoot.scale.toArray(),skeletonBorrowed:true,triangles:Object.values(pieces).flatMap(p=>p.children).reduce((n,m)=>n+(m.geometry.index?.count||m.geometry.attributes.position.count)/3,0),resources:pool.counts()})};
}
export function dressStockyardWorker(T,character,options){
 const clothing=createStockyardWorkerSkin(T,character,options),release=character.dispose,inspect=character.diagnostics;
 let disposed=false;
 character.dispose=()=>{if(disposed)return;disposed=true;clothing.dispose();release();};
 character.diagnostics=()=>({...inspect(),stockyardWorker:clothing.diagnostics()});
 return character;
}
