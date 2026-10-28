// New roof art: native wall/door recipes and their scale are never changed.
// Local origin is the ridge centreline at the run start and eave elevation.
export function gambrelProfile({span,kneeRun,kneeRise,upperPitch}){
 if(!(span>0&&kneeRun>0&&kneeRun<span/2&&kneeRise>0&&upperPitch>0))throw Error('Invalid gambrel profile');
 const half=span/2,knee=half-kneeRun,ridge=kneeRise+knee*upperPitch;
 return [[-half,0],[-knee,kneeRise],[0,ridge],[knee,kneeRise],[half,0]];
}
export function gambrelHeight(profile,q){
 if(q<profile[0][0]-1e-8||q>profile.at(-1)[0]+1e-8)return null;
 for(let i=0;i<profile.length-1;i++){
  const a=profile[i],b=profile[i+1];
  if(q<=b[0]+1e-8)return a[1]+(b[1]-a[1])*(q-a[0])/(b[0]-a[0]);
 }
 return profile.at(-1)[1];
}
// Subtract a convex roof volume while interpolating the physical UVs. Gambrel
// profiles are concave height functions, so their hypographs are convex volumes.
function clipPolygon(poly,metric,inside){
 const out=[];
 for(let i=0;i<poly.length;i++){
  const a=poly[i],b=poly[(i+1)%poly.length],av=metric(a)*(inside?1:-1),bv=metric(b)*(inside?1:-1),ain=av>=-1e-9,bin=bv>=-1e-9;
  if(ain)out.push(a);
  if(ain!==bin){const t=av/(av-bv);out.push(a.map((v,k)=>v+t*(b[k]-v)));}
 }
 return out.filter((v,i)=>!i||Math.hypot(...v.slice(0,3).map((n,k)=>n-out[i-1][k]))>1e-8);
}
function outsideRoof(poly,piece,origin,plinth){
 const profile=gambrelProfile(piece),world=v=>[v[0]+origin[0],v[1]+origin[1],v[2]+origin[2]],q=v=>piece.axis==='x'?world(v)[2]-piece.z:world(v)[0]-piece.x,run=v=>world(v)[piece.axis==='x'?0:2],y=v=>world(v)[1]-plinth-piece.base;
 const planes=[v=>run(v)-piece.runStart,v=>piece.runEnd-run(v),v=>q(v)+piece.span/2,v=>piece.span/2-q(v),v=>y(v)];
 for(let i=0;i<4;i++){const a=profile[i],b=profile[i+1],pitch=(b[1]-a[1])/(b[0]-a[0]);planes.push(v=>a[1]+pitch*(q(v)-a[0])-y(v));}
 let remainder=poly;const visible=[];
 for(const plane of planes){
  if(remainder.length<3)break;
  const outside=clipPolygon(remainder,plane,false);if(outside.length>=3)visible.push(outside);
  remainder=clipPolygon(remainder,plane,true);
 }
 return visible;
}
export function addGambrelRoof(T,{parent,pool,line,material,trim,piece,occluders=[],plinth=0}){
 const profile=gambrelProfile(piece),{axis,x,z,base,runStart,runEnd}=piece;
 const point=(run,q,y)=>axis==='x'?[run,plinth+base+y,z+q]:[x+q,plinth+base+y,run];
 const origin=axis==='x'?[runStart,plinth+base,z]:[x,plinth+base,runStart];
 let course=0;
 for(let face=0;face<4;face++){
  const a=profile[face],b=profile[face+1],slopeLength=Math.hypot(b[0]-a[0],b[1]-a[1]);
  for(let run=runStart;run<runEnd-1e-8;run+=1){
   const length=Math.min(1,runEnd-run),p=(along,q,y)=>axis==='x'?[along,y,q]:[q,y,along];
   const corners=[p(0,...a),p(length,...a),p(length,...b),p(0,...b)],uv=[[0,course],[length,course],[length,course+slopeLength],[0,course+slopeLength]];
   let polys=[corners.map((v,i)=>[...v,...uv[i]])];
   const tileOrigin=[...origin];tileOrigin[axis==='x'?0:2]=run;
   for(const other of occluders.filter(p=>p.id!==piece.id))polys=polys.flatMap(poly=>outsideRoof(poly,other,tileOrigin,plinth));
   const valleyCut=polys.length!==1||polys[0].length!==4||polys[0].some(v=>!corners.some(c=>Math.hypot(...c.map((n,k)=>n-v[k]))<1e-7));
   const av=new T.Vector3(...corners[0]),normal=new T.Vector3(...corners[1]).sub(av).cross(new T.Vector3(...corners[2]).sub(av)),vertices=[];
   for(const poly of polys){if(normal.y<0)poly.reverse();for(let i=1;i<poly.length-1;i++){
    const tri=[poly[0],poly[i],poly[i+1]],a=new T.Vector3(...tri[0]),area=new T.Vector3(...tri[1]).sub(a).cross(new T.Vector3(...tri[2]).sub(a)).length();
    if(area>1e-9)vertices.push(...tri);
   }}
   if(!vertices.length)continue;
   const geometry=new T.BufferGeometry();geometry.setAttribute('position',new T.Float32BufferAttribute(vertices.flatMap(v=>v.slice(0,3)),3));geometry.setAttribute('uv',new T.Float32BufferAttribute(vertices.flatMap(v=>v.slice(3)),2));geometry.setAttribute('grossUV',geometry.attributes.uv.clone());geometry.computeVertexNormals();pool.geometry(geometry);
   const tile=new T.Mesh(geometry,material);tile.name='Gambrel '+(face===0||face===3?'steep skirt':'shallow crown')+' panel';tile.position.set(...tileOrigin);
   tile.userData.roofTile={kit:'gambrel-v1',piece:piece.id,face,runLength:length,standardRun:1,cutEnd:length<1-1e-8,slopeLength,pitch:Math.abs((b[1]-a[1])/(b[0]-a[0])),valleyCut};
   tile.castShadow=tile.receiveShadow=true;parent.add(tile);
  }
  course+=slopeLength;
 }
 for(const side of [-1,1]){
  const q=side*piece.span/2;
  line(parent,'Gambrel continuous eave',point(runStart,q,0),point(runEnd,q,0),.095,trim);
 }
 line(parent,'Gambrel ridge cap',point(runStart,0,profile[2][1]+.025),point(runEnd,0,profile[2][1]+.025),.055,material);
 // Break caps are thin cedar strips, not a contrasting line across the roof.
 for(const [q,y] of [profile[1],profile[3]])line(parent,'Gambrel slope-break cap',point(runStart,q,y+.014),point(runEnd,q,y+.014),.035,material);
 return {profile,point};
}
// Close the space above a full-height native gable wall, and the skirt cheeks
// outside that wall. Existing window/door apertures stay entirely unobstructed.
export function addGambrelEnd(T,{parent,pool,line,project,material,trim,roof,run,trimRun=run,wallMin,wallMax,wallTop,name}){
 const {profile,point}=roof,positions=[];
 for(let i=0;i<4;i++){
  const a=profile[i],b=profile[i+1],splits=[a[0],b[0],wallMin,wallMax].filter(q=>q>=a[0]&&q<=b[0]);
  const at=q=>a[1]+(b[1]-a[1])*(q-a[0])/(b[0]-a[0]);
  if(b[1]!==a[1]){const q=a[0]+(wallTop-a[1])*(b[0]-a[0])/(b[1]-a[1]);if(q>a[0]&&q<b[0])splits.push(q);}
  splits.sort((a,b)=>a-b);
  for(let j=0;j<splits.length-1;j++){
   const u=splits[j],v=splits[j+1];if(v-u<1e-8)continue;
   const middle=(u+v)/2,bottom=middle>wallMin&&middle<wallMax?wallTop:0;
   if(at(middle)<=bottom+1e-8)continue;
   const quad=[point(run,u,bottom),point(run,v,bottom),point(run,v,at(v)),point(run,u,at(u))];
   positions.push(...[0,1,2,0,2,3].flatMap(k=>quad[k]));
  }
  line(parent,'Gambrel bent bargeboard',point(trimRun,...a),point(trimRun,...b),.095,trim);
 }
 if(positions.length){
  const g=new T.BufferGeometry();g.setAttribute('position',new T.Float32BufferAttribute(positions,3));g.computeVertexNormals();project(g);g.setAttribute('uv',g.attributes.grossUV.clone());
  const mesh=new T.Mesh(pool.geometry(g),material);mesh.name=name;mesh.castShadow=mesh.receiveShadow=true;parent.add(mesh);
 }
}
