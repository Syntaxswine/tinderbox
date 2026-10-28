import {loadGrossHousing,createGrossHouse,pointInRoom,planEdges} from './gross-housing.js';
export const HOPKINS_HOUSING_URL=new URL('../../assets/art/hopkins-housing-v1/houses.json',import.meta.url).href;
export const loadHopkinsHousing=(T,options={})=>loadGrossHousing(T,{...options,catalogueUrl:HOPKINS_HOUSING_URL});
// Reuses the tested native wall/door/floor/furnishing assembler and its resource owner.
// Only newly declared exterior roof, veranda and trim forms are added here.
export function createHopkinsHouse(T,library,id,options={}){
 return createGrossHouse(T,library,id,{...options,roofBuilder:ctx=>exterior(T,ctx)});
}
function exterior(T,{house:h,roof,box,line,cylinder,project,pool,roofs,ornament,materials:m}){
 const b=(parent,name,w,hh,d,x,y,z,material=m.trim)=>box(parent,name,w,hh,d,x,y,z,material);
 // Roof skins follow the highest occupied footprint. This closes setbacks and bays
 // without inventing rooms or rescaling any native wall. Eave/gable infills are new art.
 function profile(p,x,z){
  if(Math.abs(x-p.x)>p.width/2+.0001||Math.abs(z-p.z)>p.depth/2+.0001)return null;
  const half=(p.axis==='x'?p.depth:p.width)/2,u=Math.abs(p.axis==='x'?z-p.z:x-p.x)/half;
  if(p.form==='hip'){const distance=Math.min(p.width/2-Math.abs(x-p.x),p.depth/2-Math.abs(z-p.z));return p.base+p.rise*Math.max(0,Math.min(1,distance/Math.min(p.width/2,p.depth/2)));}
  if(p.form==='gambrel')return p.base+p.rise*(u<=.7?1-u*.4:.72*(1-u)/.3);
  return p.base+p.rise*Math.max(0,1-u);
 }
 const occupied=(floor,p)=>floor.rooms.some(r=>pointInRoom(p,r.polygon));
 for(let level=0;level<h.floors.length;level++){
  const floor=h.floors[level],higher=h.floors.slice(level+1),base=level*2.12+2,recipes=h.roofPieces.filter(p=>Math.abs(p.base-base)<.2),positions=[],infills=[];
  const height=(x,z)=>{const values=recipes.map(p=>profile(p,x,z)).filter(n=>n!==null);return h.plinth+(values.length?Math.max(...values):base+.12);};
  function triangle(a,b,c){
   const center=[(a[0]+b[0]+c[0])/3,(a[1]+b[1]+c[1])/3];if(higher.some(f=>occupied(f,center)))return;
   for(const p of [a,c,b])positions.push(p[0],height(p[0],p[1]),p[1]);
  }
  for(const r of floor.rooms){const xs=r.polygon.map(p=>p[0]),zs=r.polygon.map(p=>p[1]);
   for(let x=Math.min(...xs);x<Math.max(...xs);x+=.5)for(let z=Math.min(...zs);z<Math.max(...zs);z+=.5){
    const c=[[x,z],[x+.5,z],[x+.5,z+.5],[x,z+.5]],inside=c.filter(p=>pointInRoom(p,r.polygon));
    if(inside.length===4){triangle(c[0],c[1],c[2]);triangle(c[0],c[2],c[3]);}else if(inside.length===3)triangle(...inside);
   }
  }
  function mesh(points,material,name){if(!points.length)return;const g=new T.BufferGeometry();g.setAttribute('position',new T.Float32BufferAttribute(points,3));g.computeVertexNormals();project(g);g.setAttribute('uv',g.attributes.grossUV.clone());const obj=new T.Mesh(pool.geometry(g),material);obj.name=name;obj.castShadow=obj.receiveShadow=true;roofs.add(obj);}
  mesh(positions,m.roof,'New Hopkins footprint roof / level '+level);
  for(const e of planEdges(floor).filter(e=>e.rooms.length===1)){
   const a=e.a,c=e.b,mid=[(a[0]+c[0])/2,(a[1]+c[1])/2];if(higher.some(f=>occupied(f,mid)))continue;
   const y=h.plinth+base,ay=Math.max(y,height(...a)),cy=Math.max(y,height(...c));
   infills.push(a[0],y,a[1],c[0],y,c[1],c[0],cy,c[1],a[0],y,a[1],c[0],cy,c[1],a[0],ay,a[1]);
   line(roofs,'Roof edge bargeboard',[a[0],ay+.015,a[1]],[c[0],cy+.015,c[1]],.1,m.trim);
  }
  mesh(infills,m.shingle,'New Hopkins roof closure / level '+level);
 }
 function porchRoof(p){roof(roofs,p.x+p.width/2,p.z+p.depth/2,p.width+.3,p.depth+.3,h.plinth+2.04,.42,'hip');}
 if(h.porch&&!h.frontBalcony)porchRoof(h.porch);
 for(const p of h.sidePorches||[]){
  const y=h.plinth;b(ornament,'New side veranda deck',p.width,.12,p.depth,p.x+p.width/2,y-.06,p.z+p.depth/2,m.floor);
  const outerX=p.x<0?p.x+.12:p.x+p.width-.12;
  for(let z=p.z+.16;z<p.z+p.depth;z+=2.5){cylinder(ornament,'Veranda turned post',.065,.085,1.85,outerX,y+.92,z,m.trim);b(ornament,'Veranda post capital',.2,.12,.2,outerX,y+1.88,z);}
  b(ornament,'Side veranda beam',.16,.12,p.depth,outerX,y+1.94,p.z+p.depth/2);
  for(let z=p.z+.2;z<p.z+p.depth-.1;z+=.24)b(ornament,'Veranda baluster',.045,.62,.045,outerX,y+.4,z);
  b(ornament,'Veranda rail',.08,.065,p.depth,outerX,y+.75,p.z+p.depth/2,m.accent);porchRoof(p);
 }
 if(h.frontBalcony){
  const p=h.frontBalcony,y=h.plinth+2.12;b(roofs,'New front balcony deck',p.width,.12,p.depth,p.x+p.width/2,y-.06,p.z+p.depth/2,m.floor);
  for(let x=p.x+.1;x<p.x+p.width;x+=.24)b(roofs,'Balcony baluster',.045,.65,.045,x,y+.4,p.z+.1);
  b(roofs,'Balcony handrail',p.width,.065,.08,p.x+p.width/2,y+.76,p.z+.1,m.accent);
 }
 // Chimneys and small trim are interpreted from the visible plate, not new native modules.
 const chimneyTop=h.plinth+Math.max(...h.roofPieces.map(p=>p.base+p.rise));
 for(const x of (h.designNumber===17?[h.width*.28,h.width*.72]:[h.width*.68])){
  b(roofs,'New Hopkins brick chimney',.5,1.35,.6,x,chimneyTop-.1,h.depth*.63,m.stone);
  b(roofs,'Chimney cap',.62,.12,.72,x,chimneyTop+.6,h.depth*.63,m.stone);
 }
 // The source grille is preserved without introducing a replacement door size.
 if(h.designNumber===15){const x=h.width-2,z=6,y=h.plinth;for(let u=-.8;u<=.8;u+=.2)b(ornament,'Dining grille spindle',.035,.24,.035,x+u,y+1.8,z,m.accent);}
}
