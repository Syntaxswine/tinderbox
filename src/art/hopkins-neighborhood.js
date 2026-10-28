import {loadGrossHousing,createGrossHouse,planEdges,pointInRoom} from './gross-housing.js';
import {addPatternRoofs,roofRecipe} from './pattern-roofs.js';
export const HOPKINS_NEIGHBORHOOD_URL=new URL('../../assets/art/hopkins-housing-v2/houses.json',import.meta.url).href;
export const loadHopkinsNeighborhood=(T,options={})=>loadGrossHousing(T,{...options,catalogueUrl:HOPKINS_NEIGHBORHOOD_URL});
export function createHopkinsNeighborhoodHouse(T,library,id,options={}){return createGrossHouse(T,library,id,{...options,roofBuilder:ctx=>exterior(T,ctx)});}
function exterior(T,{house:h,pool,box,line,cylinder,project,roofs,ornament,materials:m}){
 const pieces=[...h.roofKit.pieces],porches=[...(h.porch?[h.porch]:[]),...(h.sidePorches||[])];
 for(let i=0;i<porches.length;i++){const p=porches[i];if(i===0&&h.frontBalcony){for(const [x,w] of [[p.x,h.frontBalcony.x-p.x],[h.frontBalcony.x+h.frontBalcony.width,p.x+p.width-h.frontBalcony.x-h.frontBalcony.width]])if(w>.2)pieces.push({id:'veranda-'+i+'-'+x,x:x+w/2,z:p.z+p.depth/2,width:w+.3,depth:p.depth+.3,axis:'x',base:2.04,rise:.35,form:'hip'});}else pieces.push({id:'veranda-'+i,x:p.x+p.width/2,z:p.z+p.depth/2,width:p.width+.3,depth:p.depth+.3,axis:p.width>p.depth?'x':'z',base:2.04,rise:h.porchGable&&i===0?.6:.4,form:h.porchGable&&i===0?'gable':'hip'});}
 const bodyVolumes=[];
 for(let level=0;level<h.floors.length;level++)for(const room of h.floors[level].rooms){const points=room.polygon.map(p=>new T.Vector2(...p));for(const face of T.ShapeUtils.triangulateShape(points,[])){let tri=face.map(i=>room.polygon[i]);if((tri[1][0]-tri[0][0])*(tri[2][1]-tri[0][1])-(tri[1][1]-tri[0][1])*(tri[2][0]-tri[0][0])<0)tri.reverse();const planes=tri.map((a,i)=>{const b=tri[(i+1)%3];return v=>(b[0]-a[0])*(v[2]-a[1])-(b[1]-a[1])*(v[0]-a[0]);});planes.push(v=>h.plinth+level*2.12+2-v[1]);bodyVolumes.push(planes);}}
 const recipes=addPatternRoofs(T,{parent:roofs,pool,material:m.roof,trim:m.trim,line,pieces,plinth:h.plinth,wallMaterial:m.exterior,bodyVolumes});
 // Follow the actual occupied footprint, keeping T-plan courtyards and setbacks clear.
 roofs.parent.getObjectByName('New raised plinth').visible=false;
 if(h.foundation!=='piers')for(const room of h.floors[0].rooms){const shape=new T.Shape();room.polygon.forEach(([x,z],i)=>i?shape.lineTo(x,z):shape.moveTo(x,z));shape.closePath();const g=project(new T.ExtrudeGeometry(shape,{depth:h.plinth-.12,bevelEnabled:false,steps:1}));const mesh=new T.Mesh(pool.geometry(g),m.earth);mesh.name='Footprint foundation';mesh.rotation.x=Math.PI/2;mesh.position.y=h.plinth-.12;mesh.receiveShadow=true;ornament.add(mesh);}

 const height=(x,z)=>{const values=recipes.map(r=>r.height(x,z)).filter(v=>v!==null);return values.length?Math.max(...values):null;};
 // Close only the exposed edges above each occupied native course. These are
 // wall facings with metre UVs; they never repaint a sloped roof as siding.
 for(let level=0;level<h.floors.length;level++){
  const f=h.floors[level],higher=h.floors.slice(level+1),bottom=h.plinth+level*2.12+2,positions=[];
  for(const e of planEdges(f).filter(e=>e.rooms.length===1)){
   const mid=e.a.map((v,k)=>(v+e.b[k])/2);if(higher.some(f=>f.rooms.some(r=>pointInRoom(mid,r.polygon))))continue;
   const n=4,at=t=>[e.a[0]+(e.b[0]-e.a[0])*t,e.a[1]+(e.b[1]-e.a[1])*t];
   for(let i=0;i<n;i++){const a=at(i/n),b=at((i+1)/n),ya=Math.max(bottom,height(...a)??bottom),yb=Math.max(bottom,height(...b)??bottom);if(Math.max(ya,yb)<=bottom+1e-7)continue;positions.push(a[0],bottom,a[1],b[0],bottom,b[1],b[0],yb,b[1],a[0],bottom,a[1],b[0],yb,b[1],a[0],ya,a[1]);}
  }
  if(positions.length){const g=new T.BufferGeometry();g.setAttribute('position',new T.Float32BufferAttribute(positions,3));g.computeVertexNormals();project(g);g.setAttribute('uv',g.attributes.grossUV.clone());const mesh=new T.Mesh(pool.geometry(g),m.exterior);mesh.name='Pattern vertical clapboard closure';mesh.castShadow=mesh.receiveShadow=true;roofs.add(mesh);}
 }
 // Decorative front gable fans are simplified separate timber members.
 for(const g of h.gableFans||[]){const y=h.plinth+g.base,z=g.z-.105;line(roofs,'Gable tie beam',[g.x-g.width/2,y+.1,z],[g.x+g.width/2,y+.1,z],.065,m.trim);for(let i=0;i<=8;i++){const x=g.x-g.width/2+i*g.width/8,top=y+g.rise*(1-Math.abs(x-g.x)/(g.width/2));line(roofs,'Gable fan timber',[g.x,y+.12,z],[x,Math.max(y+.14,top-.15),z],.04,m.accent);}}
 for(const p of pieces.filter(p=>p.form==='pyramid')){const y=h.plinth+p.base+p.rise;cylinder(roofs,'Pointed bay finial',.025,.045,.5,p.x,y+.23,p.z,m.iron);cylinder(roofs,'Finial collar',.07,.07,.06,p.x,y+.1,p.z,m.trim);}
 for(const c of h.chimneys||[]){const samples=[-.26,0,.26].flatMap(x=>[-.31,0,.31].map(z=>height(c.x+x,c.z+z)));if(samples.some(y=>y===null))throw Error(h.id+' chimney is outside roof');const bottom=Math.min(...samples)-.14,top=Math.max(...samples)+c.height;box(roofs,'Pattern seated brick chimney',.5,top-bottom,.6,c.x,(top+bottom)/2,c.z,m.stone);box(roofs,'Pattern chimney cap',.65,.12,.75,c.x,top+.025,c.z,m.stone);}
 // Rear/side verandas share the inherited native post and balustrade vocabulary.
 for(const p of h.sidePorches||[]){const y=h.plinth,points=[[p.x,p.z],[p.x+p.width,p.z],[p.x+p.width,p.z+p.depth],[p.x,p.z+p.depth]],free=[];box(ornament,'Side veranda deck',p.width,.12,p.depth,p.x+p.width/2,y-.06,p.z+p.depth/2,m.floor);
  for(let i=0;i<4;i++){const a=points[i],b=points[(i+1)%4],length=Math.hypot(b[0]-a[0],b[1]-a[1]),out=[(b[1]-a[1])/length,-(b[0]-a[0])/length],sample=[(a[0]+b[0])/2+out[0]*.15,(a[1]+b[1])/2+out[1]*.15];if(h.floors[0].rooms.some(r=>pointInRoom(sample,r.polygon))||porches.some(q=>q!==p&&sample[0]>q.x-.01&&sample[0]<q.x+q.width+.01&&sample[1]>q.z-.01&&sample[1]<q.z+q.depth+.01))continue;free.push({a,b,out,length});}
  const entry=free.find(e=>e.out[1]<-.5)||free.find(e=>e.out[1]>.5)||free[0];
  for(const e of free){const {a,b,out,length}=e,at=t=>[a[0]+(b[0]-a[0])*t-out[0]*.12,a[1]+(b[1]-a[1])*t-out[1]*.12],posts=Math.max(1,Math.ceil(length/3));for(let i=0;i<=posts;i++){const [x,z]=at(.12/length+i/posts*(1-.24/length));cylinder(ornament,'Side veranda post',.06,.085,1.9,x,y+.95,z,m.trim);box(ornament,'Side veranda capital',.2,.1,.2,x,y+1.9,z,m.trim);}const start=at(0),end=at(1);line(ornament,'Side veranda beam',[start[0],y+1.93,start[1]],[end[0],y+1.93,end[1]],.12,m.trim);
   for(let along=.22;along<length-.12;along+=.24){if(e===entry&&Math.abs(along-length/2)<.65)continue;const [x,z]=at(along/length);box(ornament,'Side veranda baluster',.045,.62,.045,x,y+.4,z,m.trim);}
   for(const [lo,hi] of e===entry?[[0,length/2-.65],[length/2+.65,length]]:[[0,length]])if(hi>lo){const u=at(lo/length),v=at(hi/length);line(ornament,'Side veranda handrail',[u[0],y+.75,u[1]],[v[0],y+.75,v[1]],.065,m.accent);}
  }
  if(entry){const {a,b,out}=entry,center=[(a[0]+b[0])/2,(a[1]+b[1])/2],steps=Math.max(3,Math.ceil(y/.18)),axisX=Math.abs(out[0])>.5;for(let i=0;i<steps;i++){const hh=y*(i+1)/steps,distance=(steps-i-.5)*.22;box(ornament,'Side veranda entry step',axisX?.22:1.16,hh,axisX?1.16:.22,center[0]+out[0]*distance,hh/2,center[1]+out[1]*distance,m.earth);}}
 }
 if(h.frontBalcony){const p=h.frontBalcony,y=h.plinth+2.12;box(roofs,'Balcony deck',p.width,.12,p.depth,p.x+p.width/2,y-.06,p.z+p.depth/2,m.floor);for(let x=p.x+.1;x<p.x+p.width;x+=.24)box(roofs,'Balcony baluster',.045,.65,.045,x,y+.4,p.z+.1,m.trim);box(roofs,'Balcony handrail',p.width,.065,.08,p.x+p.width/2,y+.76,p.z+.1,m.accent);for(const x of [p.x+.1,p.x+p.width-.1])box(roofs,'Balcony side rail',.065,.065,p.depth,x,y+.76,p.z+p.depth/2,m.accent);}
 if(h.foundation==='piers'){roofs.parent.getObjectByName('New raised plinth').visible=false;const seen=new Set();for(const room of h.floors[0].rooms)for(const [x,z] of room.polygon){const key=x+','+z;if(seen.has(key))continue;seen.add(key);box(ornament,'Foundation pier',.28,h.plinth-.1,.28,x,(h.plinth-.1)/2,z,m.stone);}for(const p of porches)for(const x of [p.x+.15,p.x+p.width-.15])for(const z of [p.z+.15,p.z+p.depth-.15])box(ornament,'Porch foundation pier',.26,h.plinth-.1,.26,x,(h.plinth-.1)/2,z,m.stone);}
}
