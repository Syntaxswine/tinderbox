// Metres, world x/y with upright h. No clock, actor authority or renderer.
// Engine-owned adaptation of the committed Farmyard accepted-distance slide;
// the source comparison and original byte inventory are in source.json.
const EPS=1e-8, SKIN=1e-6;
const dot=(a,b)=>a.x*b.x+a.y*b.y, sub=(a,b)=>({x:a.x-b.x,y:a.y-b.y});
const cross=(a,b,c)=>(b.x-a.x)*(c.y-a.y)-(b.y-a.y)*(c.x-a.x);
const length=a=>Math.hypot(a.x,a.y);
function finite(n){if(!Number.isFinite(n)||Math.abs(n)>1e9)throw Error('CONTACT_NUMBER');return n;}
function point(p){finite(p?.x);finite(p?.y);return {x:p.x||0,y:p.y||0};}
export const CONTACT_PROFILES=Object.freeze({stop:'stop-v1',slide:'slide-v1',slideFactor:.72,maxContacts:4,skinM:SKIN});

/** Canonical convex hull; input order and duplicate points cannot change contact. */
export function contactHull(input){
 if(!Array.isArray(input)||!input.length||input.length>1024)throw Error('CONTACT_POINT_LIMIT');
 const sorted=input.map(point).sort((a,b)=>a.x-b.x||a.y-b.y),p=sorted.filter((v,i)=>!i||v.x!==sorted[i-1].x||v.y!==sorted[i-1].y);
 if(p.length<=2)return p;
 const half=values=>{const out=[];for(const v of values){while(out.length>1&&cross(out.at(-2),out.at(-1),v)<=EPS)out.pop();out.push(v);}return out;};
 return [...half(p).slice(0,-1),...half([...p].reverse()).slice(0,-1)];
}
export function contactShape({id,points,radiusM=0,minH=0,maxH=1}){
 if(!Array.isArray(points)||points.length>32)throw Error('CONTACT_SHAPE_POINT_LIMIT');
 if(typeof id!=='string'||!id||id.length>256)throw Error('CONTACT_ID');
 finite(radiusM);finite(minH);finite(maxH);if(radiusM<0||maxH<minH)throw Error('CONTACT_SHAPE');
 return {id,points:contactHull(points),radiusM:radiusM||0,minH:minH||0,maxH:maxH||0};
}
export function boundsContactShape(id,bounds){
 const {min:a,max:b}=bounds;if(['x','y','h'].some(k=>!Number.isFinite(a?.[k])||!Number.isFinite(b?.[k])||a[k]>b[k]))throw Error('CONTACT_BOUNDS');
 return contactShape({id,points:[{x:a.x,y:a.y},{x:b.x,y:a.y},{x:b.x,y:b.y},{x:a.x,y:b.y}],minH:a.h,maxH:b.h});
}
export function translateContactShape(shape,delta){return {...shape,points:shape.points.map(p=>({x:p.x+delta.x,y:p.y+delta.y}))};}
const vertical=(a,b)=>a.minH<b.maxH-EPS&&a.maxH>b.minH+EPS;
function validateShape(s){if(!s||typeof s.id!=='string'||!s.id||!Array.isArray(s.points)||!s.points.length||s.points.length>32)throw Error('CONTACT_SHAPE');finite(s.radiusM);finite(s.minH);finite(s.maxH);if(s.radiusM<0||s.maxH<s.minH)throw Error('CONTACT_SHAPE');for(const p of s.points)point(p);}
function segmentPoint(p,a,b){const d=sub(b,a),t=Math.max(0,Math.min(1,dot(sub(p,a),d)/(dot(d,d)||1)));return {x:a.x+t*d.x,y:a.y+t*d.y};}
function boundary(p,hull){
 let inside=hull.length>=3,nearest=null,normal=null,distance=Infinity;
 for(let i=0;i<(hull.length===1?1:hull.length);i++){
  const a=hull[i],b=hull[(i+1)%hull.length],d=sub(b,a),len=length(d),q=segmentPoint(p,a,b),v=sub(p,q),dist=length(v);
  if(cross(a,b,p)<-EPS)inside=false;
  if(dist<distance){distance=dist;nearest=q;normal=dist>EPS?{x:v.x/dist,y:v.y/dist}:len?{x:d.y/len,y:-d.x/len}:{x:1,y:0};}
 }
 // For an interior point, the nearest boundary normal points out, not in.
 if(inside&&distance>EPS)normal={x:-normal.x,y:-normal.y};
 normal={x:normal.x||0,y:normal.y||0};return {inside,distance,normal,nearest};
}
function minkowski(a,b){return contactHull(b.points.flatMap(q=>a.points.map(p=>sub(q,p))));}
/** Signed horizontal separation for vertically overlapping upright shapes. */
export function contactSeparation(a,b){
 validateShape(a);validateShape(b);
 if(!vertical(a,b))return null;
 const info=boundary({x:0,y:0},minkowski(a,b)),r=a.radiusM+b.radiusM;
 return {id:b.id,normal:info.normal,separationM:(info.inside?-r-info.distance:info.distance-r)||0};
}
/** Exact upright convex/rounded-convex overlap. A disc is one point + radius. */
export function contactOverlap(a,b){
 const info=contactSeparation(a,b);return info&&info.separationM<-EPS?{id:b.id,normal:info.normal,depthM:-info.separationM}:null;
}
/** Continuous fixed-orientation cast. Minkowski edges AND rounded vertices are
 * tested, so discs do not acquire square corners and thin walls cannot tunnel. */
export function castContact(a,delta,b){
 validateShape(a);validateShape(b);point(delta);if(!vertical(a,b))return null;
 const hull=minkowski(a,b),r=a.radiusM+b.radiusM,origin={x:0,y:0},info=boundary(origin,hull);
 const initialDepth=info.inside?r+info.distance:r-info.distance;
 if(initialDepth>=-EPS&&dot(delta,info.normal)<-EPS)return {id:b.id,time:0,normal:info.normal,initialOverlap:initialDepth>SKIN};
 let best=null;
 const offer=(time,normal)=>{if(time>=-EPS&&time<=1+EPS&&dot(delta,normal)<-EPS&&(!best||time<best.time-EPS))best={id:b.id,time:Math.max(0,Math.min(1,time)),normal:{x:normal.x||0,y:normal.y||0},initialOverlap:false};};
 for(let i=0;i<hull.length;i++){
  const a=hull[i],b=hull[(i+1)%hull.length],edge=sub(b,a),len=length(edge);
  if(len>EPS){const n={x:edge.y/len,y:-edge.x/len},dn=dot(delta,n),g=-dot(a,n)-r;
   if(dn<-EPS){const t=-g/dn,p={x:delta.x*t-r*n.x,y:delta.y*t-r*n.y},along=dot(sub(p,a),edge)/(len*len);if(along>=-EPS&&along<=1+EPS)offer(t,n);}}
  if(r>EPS){const v={x:-a.x,y:-a.y},aa=dot(delta,delta),bb=2*dot(v,delta),cc=dot(v,v)-r*r,disc=bb*bb-4*aa*cc;
   if(aa>EPS*EPS&&disc>=0){const t=(-bb-Math.sqrt(disc))/(2*aa),n={x:(t*delta.x-a.x)/r,y:(t*delta.y-a.y)/r};offer(t,n);}}
 }
 return best;
}
export function firstContact(shape,delta,obstacles){
 if(!Array.isArray(obstacles)||obstacles.length>8192)throw Error('CONTACT_OBSTACLE_LIMIT');
 let first=null;for(const obstacle of obstacles){const hit=castContact(shape,delta,obstacle);if(hit&&(!first||hit.time<first.time-EPS||Math.abs(hit.time-first.time)<=EPS&&hit.id<first.id))first=hit;}return first;
}
/** Bounded slide. Only the requested tangent is retained; no invented shoulder,
 * push-out or acceleration. Every resulting segment is swept again. */
export function moveWithContacts(shape,delta,obstacles,{profile='slide-v1',slideFactor=CONTACT_PROFILES.slideFactor}={}){
 point(delta);if(!['stop-v1','slide-v1'].includes(profile))throw Error('CONTACT_PROFILE_UNSUPPORTED');
 if(!Number.isFinite(slideFactor)||slideFactor<0||slideFactor>1)throw Error('CONTACT_SLIDE_FACTOR');
 let current=shape,remaining={...delta},offset={x:0,y:0},distanceM=0;const contacts=[],segments=[],normals=[];
 for(let i=0;i<CONTACT_PROFILES.maxContacts&&length(remaining)>EPS;i++){
  const hit=firstContact(current,remaining,obstacles),fraction=hit?Math.max(0,hit.time-SKIN/length(remaining)):1,step={x:remaining.x*fraction,y:remaining.y*fraction};
  if(length(step)>EPS){segments.push({from:{...offset},to:{x:offset.x+step.x,y:offset.y+step.y}});offset={x:offset.x+step.x,y:offset.y+step.y};distanceM+=length(step);current=translateContactShape(current,step);}
  if(!hit)break;contacts.push(hit);normals.push(hit.normal);if(profile==='stop-v1')break;
  remaining={x:remaining.x*(1-fraction)*slideFactor,y:remaining.y*(1-fraction)*slideFactor};
  for(const n of normals){const inward=dot(remaining,n);if(inward<0){remaining.x-=inward*n.x;remaining.y-=inward*n.y;}}
  // Rechecking all prior planes keeps closed corners stopped and prevents jitter.
  if(normals.some(n=>dot(remaining,n)<-EPS))break;
 }
 return {delta:offset,distanceM,contacts,segments,blocked:contacts.length>0,shape:current};
}
