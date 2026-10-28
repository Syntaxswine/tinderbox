// New native-scale roof art: exact planar unions in one-metre strips.
// The hypograph of each concave height profile is a convex clipping volume.
const EPS=1e-8;
function clip(poly,metric,positive=true){
 const out=[];for(let i=0;i<poly.length;i++){const a=poly[i],b=poly[(i+1)%poly.length],av=metric(a)*(positive?1:-1),bv=metric(b)*(positive?1:-1),ai=av>=-EPS,bi=bv>=-EPS;if(ai)out.push(a);if(ai!==bi){const t=av/(av-bv);out.push(a.map((v,k)=>v+t*(b[k]-v)));}}
 return out.filter((v,i)=>!i||Math.hypot(...v.slice(0,3).map((n,k)=>n-out[i-1][k]))>EPS);
}
export function roofRecipe(piece,plinth=0){
 const {x,z,width:w,depth:d,base,rise,axis='z',form='gable'}=piece;
 if(!(w>0&&d>0&&rise>0&&base>=2))throw Error('Invalid pattern roof piece');
 const x0=x-w/2,x1=x+w/2,z0=z-d/2,z1=z+d/2,b=base+plinth,planes=[];
 const add=(a,c,k)=>planes.push({a,c,k,height:(xx,zz)=>a*xx+c*zz+k});
 if(form==='pyramid'){
  const sides=piece.sides||8,r=piece.radius||Math.min(w,d)/2;
  for(let i=0;i<sides;i++){const angle=(i+.5)*2*Math.PI/sides,ux=Math.cos(angle),uz=Math.sin(angle),slope=rise/(r*Math.cos(Math.PI/sides));add(-slope*ux,-slope*uz,b+rise+slope*(ux*x+uz*z));}
 }else{
  const cross=axis==='x'?'z':'x',half=(cross==='x'?w:d)/2,center=cross==='x'?x:z;
  const profile=form==='gambrel'?[[-half,0],[-half*.62,rise*.72],[0,rise],[half*.62,rise*.72],[half,0]]:[[-half,0],[0,rise],[half,0]];
  for(let i=0;i<profile.length-1;i++){const a=profile[i],c=profile[i+1],slope=(c[1]-a[1])/(c[0]-a[0]);add(cross==='x'?slope:0,cross==='z'?slope:0,b+a[1]-slope*(center+a[0]));}
  if(form==='hip'){const slope=rise/Math.min(w,d)*2;if(axis==='z'){add(0,slope,b-slope*z0);add(0,-slope,b+slope*z1);}else{add(slope,0,b-slope*x0);add(-slope,0,b+slope*x1);}}
 }
 const footprint=form==='pyramid'?Array.from({length:piece.sides||8},(_,i)=>{const a=i*2*Math.PI/(piece.sides||8),r=piece.radius||Math.min(w,d)/2;return[x+r*Math.cos(a),z+r*Math.sin(a)];}):[[x0,z0],[x1,z0],[x1,z1],[x0,z1]];
 const bounds=[];for(let i=0;i<footprint.length;i++){const a=footprint[i],c=footprint[(i+1)%footprint.length];bounds.push(v=>(c[0]-a[0])*(v[2]-a[1])-(c[1]-a[1])*(v[0]-a[0]));}
 const inside=(xx,zz)=>bounds.every(p=>p([xx,0,zz])>=-EPS),height=(xx,zz)=>inside(xx,zz)?Math.min(...planes.map(p=>p.height(xx,zz))):null;
 return{piece,footprint,planes,bounds,height,volume:[...bounds,v=>v[1]-b,...planes.map(p=>v=>p.height(v[0],v[2])-v[1])]};
}
export function patternRoofHeight(pieces,x,z,plinth=0){const ys=pieces.map(p=>roofRecipe(p,plinth).height(x,z)).filter(y=>y!==null);return ys.length?Math.max(...ys):null;}
function outside(poly,volume){const result=[];let remaining=poly;for(const plane of volume){if(remaining.length<3)break;const part=clip(remaining,plane,false);if(part.length>=3)result.push(part);remaining=clip(remaining,plane,true);}return result;}
export function addPatternRoofs(T,{parent,pool,material,trim,line,pieces,plinth=0,wallMaterial=null,bodyVolumes=[]}){
 const recipes=pieces.map(p=>roofRecipe(p,plinth));
 for(const recipe of recipes){const {piece,footprint,planes}=recipe;for(let face=0;face<planes.length;face++){
  const plane=planes[face];let poly=footprint.map(([x,z])=>[x,plane.height(x,z),z]);for(let i=0;i<planes.length;i++)if(i!==face)poly=clip(poly,v=>planes[i].height(v[0],v[2])-v[1]);if(poly.length<3)continue;
  const along=piece.axis==='x'?0:2,lo=Math.min(...poly.map(v=>v[along])),hi=Math.max(...poly.map(v=>v[along]));
  const normal=new T.Vector3(-plane.a,1,-plane.c).normalize(),u=new T.Vector3(0,0,1).cross(normal).normalize();if(u.x<0)u.negate();const v=new T.Vector3().crossVectors(normal,u).normalize();
  for(let start=lo;start<hi-EPS;start+=1){const end=Math.min(start+1,hi);let tile=clip(clip(poly,q=>q[along]-start),q=>end-q[along]),polys=tile.length>=3?[tile]:[];
   for(const other of recipes)if(other!==recipe){const volume=other.volume.map((p,i)=>i<=other.bounds.length||recipes.indexOf(other)<recipes.indexOf(recipe)?p:v=>p(v)-1e-6);polys=polys.flatMap(q=>outside(q,volume));}
   for(const volume of bodyVolumes)polys=polys.flatMap(q=>outside(q,volume));
   const positions=[],uv=[];for(const q of polys){for(let i=1;i<q.length-1;i++){const tri=[q[0],q[i],q[i+1]],a=new T.Vector3(...tri[0]),n=new T.Vector3(...tri[1]).sub(a).cross(new T.Vector3(...tri[2]).sub(a));if(n.length()<EPS)continue;if(n.y<0)tri.reverse();for(const p of tri){positions.push(...p);const at=new T.Vector3(...p);uv.push(at.dot(u),at.dot(v));}}}
   if(!positions.length)continue;const g=new T.BufferGeometry();g.setAttribute('position',new T.Float32BufferAttribute(positions,3));g.setAttribute('uv',new T.Float32BufferAttribute(uv,2));g.setAttribute('grossUV',g.attributes.uv.clone());g.computeVertexNormals();pool.geometry(g);const mesh=new T.Mesh(g,material);mesh.name='Pattern roof panel';mesh.userData.roofTile={kit:'pattern-roof-v1',piece:piece.id,face,runLength:end-start,standardRun:1,cutEnd:end-start<1-EPS};mesh.castShadow=mesh.receiveShadow=true;parent.add(mesh);
  }
 }
 // Close exposed gable ends above their eave plane. Lower roofs can continue
 // below a higher eave; native room solids remove only genuinely buried faces.
 if(wallMaterial){const positions=[],uv=[];for(let i=0;i<footprint.length;i++){const a=footprint[i],b=footprint[(i+1)%footprint.length],bottom=plinth+piece.base,n=Math.ceil(Math.hypot(b[0]-a[0],b[1]-a[1])*4);for(let j=0;j<n;j++){const point=t=>{const x=a[0]+(b[0]-a[0])*t,z=a[1]+(b[1]-a[1])*t;return[x,recipe.height(x,z),z];},p=point(j/n),q=point((j+1)/n);if(Math.max(p[1],q[1])<bottom+EPS)continue;let polys=[[[p[0],bottom,p[2]],[q[0],bottom,q[2]],q,p]];for(const other of recipes)if(other!==recipe)polys=polys.flatMap(poly=>outside(poly,other.volume));for(const volume of bodyVolumes)polys=polys.flatMap(poly=>outside(poly,volume));for(const poly of polys)for(let k=1;k<poly.length-1;k++){const tri=[poly[0],poly[k],poly[k+1]],v=new T.Vector3(...tri[0]);if(new T.Vector3(...tri[1]).sub(v).cross(new T.Vector3(...tri[2]).sub(v)).length()<EPS)continue;for(const v of tri){positions.push(...v);uv.push(Math.abs(b[0]-a[0])>.001?v[0]:v[2],v[1]);}}}}if(positions.length){const g=new T.BufferGeometry();g.setAttribute('position',new T.Float32BufferAttribute(positions,3));g.setAttribute('uv',new T.Float32BufferAttribute(uv,2));g.setAttribute('grossUV',g.attributes.uv.clone());g.computeVertexNormals();const mesh=new T.Mesh(pool.geometry(g),wallMaterial);mesh.name='Pattern exposed gable siding';mesh.castShadow=mesh.receiveShadow=true;parent.add(mesh);}}
 // Fascia follows the actual exposed footprint; buried portions are clipped.
 for(let i=0;i<recipe.footprint.length;i++){if(piece.fasciaOmitEdges?.includes(i))continue;const a=recipe.footprint[i],b=recipe.footprint[(i+1)%recipe.footprint.length],length=Math.hypot(b[0]-a[0],b[1]-a[1]),n=Math.ceil(length/.25);for(let j=0;j<n;j++){const point=t=>{const x=a[0]+(b[0]-a[0])*t,z=a[1]+(b[1]-a[1])*t;return[x,recipe.height(x,z),z];},p=point(j/n),q=point((j+1)/n),mid=p.map((v,k)=>(v+q[k])/2);const outward=[(b[1]-a[1])/length,-(b[0]-a[0])/length];if(recipes.some(r=>{if(r===recipe)return false;const h=r.height(mid[0],mid[2]);return h!==null&&(h>mid[1]+1e-5||(h>=mid[1]-1e-5&&r.bounds.every(plane=>plane([mid[0]+outward[0]*.04,mid[1],mid[2]+outward[1]*.04])>EPS)));}))continue;line(parent,'Pattern roof fascia',p,q,.085,trim);}}
 }
 return recipes;
}
