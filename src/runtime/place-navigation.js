// Native place geometry queries and supported motion. This owns no actor,
// gameplay clock, inventory, input queue or thermal state.
import {sweptDiscClear,distance} from '../simulation/geometry.js';
import {CHARACTER_PROFILES} from '../content/characters.js';
import {transformCollisionShape,sweptCylinderClear} from './collision.js';
import {doorName} from './door-labels.js';
const EPS=1e-6,PLAN_EPS=.0001,polygonBounds=new WeakMap();
export function inside(point,polygon){
  const b=polygonBounds.get(polygon);if(b&&(point.x<b.minX-PLAN_EPS||point.x>b.maxX+PLAN_EPS||point.y<b.minY-PLAN_EPS||point.y>b.maxY+PLAN_EPS))return false;
  let result=false;for(let i=0,j=polygon.length-1;i<polygon.length;j=i++){
    const a=polygon[i],b=polygon[j],cross=(point.x-a[0])*(b[1]-a[1])-(point.y-a[1])*(b[0]-a[0]);
    if(Math.abs(cross)<=PLAN_EPS*Math.hypot(b[0]-a[0],b[1]-a[1])&&point.x>=Math.min(a[0],b[0])-PLAN_EPS&&point.x<=Math.max(a[0],b[0])+PLAN_EPS&&point.y>=Math.min(a[1],b[1])-PLAN_EPS&&point.y<=Math.max(a[1],b[1])+PLAN_EPS)return true;
    if((a[1]>point.y)!==(b[1]>point.y)&&point.x<(b[0]-a[0])*(point.y-a[1])/(b[1]-a[1])+a[0])result=!result;
  }return result;
}
const contains=(point,s)=>s.polygons.some(p=>inside(point,p))&&!s.holes?.some(p=>inside(point,p));
function touchesSurface(point,radius,s){
  if(contains(point,s))return true;
  for(const p of [...s.polygons,...s.holes||[]])for(let i=0;i<p.length;i++){
    const a=p[i],b=p[(i+1)%p.length],dx=b[0]-a[0],dy=b[1]-a[1],length=dx*dx+dy*dy,t=length?Math.max(0,Math.min(1,((point.x-a[0])*dx+(point.y-a[1])*dy)/length)):0,x=a[0]+dx*t,y=a[1]+dy*t;
    if(Math.hypot(point.x-x,point.y-y)<radius-EPS)for(let j=0;j<8;j++){
      const q={x:x+PLAN_EPS*3*Math.cos(j*Math.PI/4),y:y+PLAN_EPS*3*Math.sin(j*Math.PI/4)};
      if(Math.hypot(q.x-point.x,q.y-point.y)<radius&&contains(q,s))return true;
    }
  }return false;
}
const footprint=(p,r)=>[p,...Array.from({length:12},(_,i)=>({x:p.x+r*Math.cos(i*Math.PI/6),y:p.y+r*Math.sin(i*Math.PI/6)}))];
const surfaceBounds=s=>{const p=s.polygons.flat();return {min:[Math.min(...p.map(v=>v[0])),s.height-.12,Math.min(...p.map(v=>v[1]))],max:[Math.max(...p.map(v=>v[0])),s.height,Math.max(...p.map(v=>v[1]))]};};
export function spatialIndex(items,getBounds=item=>item.bounds){
  const bins=new Map(),size=8;for(const item of items){const b=getBounds(item);for(let x=Math.floor(b.min[0]/size);x<=Math.floor(b.max[0]/size);x++)for(let z=Math.floor(b.min[2]/size);z<=Math.floor(b.max[2]/size);z++){const k=x+','+z;if(!bins.has(k))bins.set(k,[]);bins.get(k).push(item);}}
  return (p,r=1)=>{const result=new Set();for(let x=Math.floor((p.x-r)/size);x<=Math.floor((p.x+r)/size);x++)for(let z=Math.floor((p.y-r)/size);z<=Math.floor((p.y+r)/size);z++)for(const item of bins.get(x+','+z)||[])result.add(item);return [...result];};
}
export const supportMetadata=s=>({elevation:s.height,level:s.level,locationLabel:s.label,surfaceId:s.id,interior:!!s.interior});
export function createPlaceNavigation({definition,body:requestedBody,isSectionReady=()=>true,portalOpen=()=>false,collisionLimits={},supportPresent=()=>true,boundaryPresent=()=>true,liveShapes=()=>undefined,liveCeilings=false,liveClearance}={}){
  if(!definition?.surfaces?.length||!definition.spawn)throw Error('A visit needs verified support surfaces and spawn');
  const data=structuredClone(definition),body={...CHARACTER_PROFILES.goat,...data.body,...requestedBody},world={width:data.width,height:data.height};
  const surfaces=spatialIndex(data.surfaces,surfaceBounds),ceilings=spatialIndex(data.ceilings||[],surfaceBounds),blockers=spatialIndex(data.blockers||[],b=>b.openBounds?{min:b.bounds.min.map((v,i)=>Math.min(v,b.openBounds.min[i])),max:b.bounds.max.map((v,i)=>Math.max(v,b.openBounds.max[i]))}:b.bounds);
  for(const s of [...data.surfaces,...data.ceilings||[]])for(const p of [...s.polygons,...s.holes||[]])polygonBounds.set(p,{minX:Math.min(...p.map(v=>v[0])),maxX:Math.max(...p.map(v=>v[0])),minY:Math.min(...p.map(v=>v[1])),maxY:Math.max(...p.map(v=>v[1]))});
  const policy={shapes:192,triangles:65536,...collisionLimits},cache=new Map(),precise=new Map(),portalLeaves=new Map();let closed=false,cachedTriangles=0,peakCachedShapes=0,peakCachedTriangles=0;
  if(![policy.shapes,policy.triangles].every(v=>Number.isSafeInteger(v)&&v>0))throw Error('Invalid collision cache policy');
  if(![body.radius,body.height,body.maxStep].every(v=>Number.isFinite(v)&&v>0))throw Error('Invalid measured body envelope');
  for(const b of data.blockers||[]){if(b.portalId){if(!portalLeaves.has(b.portalId))portalLeaves.set(b.portalId,[]);portalLeaves.get(b.portalId).push(b);}if(b.shapeId){const shape=data.collisionShapes?.[b.shapeId];if(!shape||!b.matrix)throw Error('Missing source collision shape: '+b.id);precise.set(b.id,{source:shape,closedMatrix:b.matrix,openMatrix:b.openMatrix});}}
  function sourceShape(item,open){
    const k=item.id+(open?'/open':'/closed'),cached=cache.get(k);if(cached){cache.delete(k);cache.set(k,cached);return cached;}
    const record=precise.get(item.id),matrix=open?record.openMatrix:record.closedMatrix;if(!matrix)return null;
    const shape=transformCollisionShape(record.source,matrix),count=shape.triangles.length;
    if(count<=policy.triangles){while(cache.size&&(cache.size>=policy.shapes||cachedTriangles+count>policy.triangles)){const first=cache.keys().next().value;cachedTriangles-=cache.get(first).triangles.length;cache.delete(first);}cache.set(k,shape);cachedTriangles+=count;peakCachedShapes=Math.max(peakCachedShapes,cache.size);peakCachedTriangles=Math.max(peakCachedTriangles,cachedTriangles);}return shape;
  }
  const metrics=()=>({detailedColliders:precise.size,cachedShapes:cache.size,cachedTriangles,peakCachedShapes,peakCachedTriangles,maxCachedShapes:policy.shapes,maxCachedTriangles:policy.triangles});
  function findSupport(p,height){
    const nearby=surfaces(p).filter(s=>supportPresent(p,s)),treads=nearby.filter(s=>s.stairId&&contains(p,s)),at=nearby.filter(s=>Math.abs(s.height-height)<=body.maxStep+EPS&&contains(p,s));at.sort((a,b)=>b.height-a.height);
    for(const s of at){const span=nearby.some(s=>s.stairId)?Math.max(body.maxStep,.45):body.maxStep;if(treads.some(t=>t.height>s.height+EPS&&(t.bottom??t.height-.12)<s.height+body.height-EPS))continue;
      if(footprint(p,body.radius).every(q=>nearby.some(t=>Math.abs(t.height-s.height)<=span+EPS&&contains(q,t)&&supportPresent(q,t))))return s;
    }return null;
  }
  function obstacles(p,foot,margin=.1,highest=foot,onStairs=false){const padding=body.radius+margin;return blockers(p,padding).filter(boundaryPresent).map(b=>portalOpen(b.portalId)?b.openBounds?{...b,bounds:b.openBounds}:null:b).filter(b=>b&&p.x>=b.bounds.min[0]-padding&&p.x<=b.bounds.max[0]+padding&&p.y>=b.bounds.min[2]-padding&&p.y<=b.bounds.max[2]+padding&&b.bounds.max[1]>foot+((b.stair||onStairs) ? .45 : .025)&&b.bounds.min[1]<highest+body.height-EPS);}
  const box=b=>({x:(b.bounds.min[0]+b.bounds.max[0])/2,y:(b.bounds.min[2]+b.bounds.max[2])/2,width:b.bounds.max[0]-b.bounds.min[0],depth:b.bounds.max[2]-b.bounds.min[2],solid:true});
  function shapes(b,open){const live=liveShapes(b,open);return live===undefined?b.shapeId?[sourceShape(b,open)].filter(Boolean):null:live;}
  function canStand(p,height,previous,report=()=>{}){
    if(closed)return false;const stairs=surfaces(p).some(s=>s.stairId&&Math.abs(s.height-height)<EPS&&contains(p,s)&&supportPresent(p,s));
    const ceiling=!liveCeilings&&ceilings(p).find(s=>{const underside=s.height-.12;if(!supportPresent(p,s)||underside<=height+.025||underside>=height+body.height-EPS)return false;if(stairs&&underside-height<=.45&&!contains(p,s))return false;return touchesSurface(p,body.radius,s);});if(ceiling){report({reason:'headroom',id:ceiling.id,height});return false;}
    const lower=Math.min(height,previous.elevation??height),upper=Math.max(height,previous.elevation??height),nearby=obstacles(p,lower,distance(previous,p)+.05,upper,stairs),resolved=nearby.map(b=>({b,shapes:shapes(b,!!portalOpen(b.portalId))})),plain=resolved.filter(r=>r.shapes===null);
    if(!sweptDiscClear(previous,p,body.radius,world,plain.map(r=>box(r.b)))){report({reason:'solid-bounds',ids:plain.map(r=>r.b.id),height});return false;}
    for(const r of resolved)for(const s of r.shapes||[])if(!sweptCylinderClear(previous,p,body.radius,lower+((r.b.stair||stairs) ? .45 : .025),upper+body.height-EPS,s)){report({reason:'source-triangles',id:r.b.id,height});return false;}return liveClearance?liveClearance(p,height,previous,{onStairs:stairs,body,report}):true;
  }
  function reachable(actor,portal){
    if(!portal||!portal.id||portal.stateful===false||!Array.isArray(portal.position)||portal.position.length!==3||!portal.position.every(Number.isFinite))return false;
    const target={x:portal.position[0],y:portal.position[2],elevation:portal.position[1]},reach=distance(actor,target);if(!Number.isFinite(portal.reach)||reach>portal.reach||Math.abs(target.elevation-actor.elevation)>=1||!isSectionReady(actor)||!isSectionReady(target))return false;
    const h=Math.max(actor.elevation,target.elevation)+body.height/2,centre={x:(actor.x+target.x)/2,y:(actor.y+target.y)/2};
    for(const item of blockers(centre,reach/2+body.radius).filter(boundaryPresent)){if(item.portalId===portal.id)continue;const open=!!portalOpen(item.portalId),b=open?item.openBounds:item.bounds;if(!b||b.max[1]<=h-.01||b.min[1]>=h+.01)continue;const list=shapes(item,open);
      if(list){if(list.some(s=>!sweptCylinderClear(actor,target,body.radius,h-.01,h+.01,s)))return false;}else if(!sweptDiscClear(actor,target,body.radius,world,[box({bounds:b})]))return false;
    }return true;
  }
  function transitionBlocked(actor,portal,open){return (portalLeaves.get(portal.id)||[]).filter(boundaryPresent).some(leaf=>{const b=open?leaf.openBounds:leaf.bounds;if(!b||b.max[1]<=actor.elevation+.025||b.min[1]>=actor.elevation+body.height-EPS)return false;const list=shapes(leaf,open);return list?list.some(s=>!sweptCylinderClear(actor,actor,body.radius,actor.elevation+.025,actor.elevation+body.height-EPS,s)):!sweptDiscClear(actor,actor,body.radius,world,[box({bounds:b})]);});}
  function nearestPortal(actor){return (data.portals||[]).filter(p=>reachable(actor,p)).sort((a,b)=>Math.hypot(a.position[0]-actor.x,a.position[2]-actor.y)-Math.hypot(b.position[0]-actor.x,b.position[2]-actor.y))[0];}
  function interaction(actor,paused=false){const p=nearestPortal(actor);if(!p)return null;const open=!portalOpen(p.id),reason=paused?'Paused.':transitionBlocked(actor,p,open)?'Move clear of the door.':'';return {id:p.id,kind:'door',action:open?'open':'close',label:(open?'Open ':'Close ')+doorName(p),enabled:!reason,reason,anchor:[p.position[0],p.position[1]+2.15,p.position[2]]};}
  function move(actor,dx,dy){
    if(closed)throw Error('Place navigation disposed');if(![actor.x,actor.y,actor.elevation,dx,dy].every(Number.isFinite))throw Error('Finite native movement required');
    let position={x:actor.x,y:actor.y,elevation:actor.elevation},waiting=false,heading=actor.heading;const path=[{...position}],count=Math.max(1,Math.ceil(Math.hypot(dx,dy)/.035));
    for(let i=0;i<count;i++)for(const [sx,sy]of [[dx/count,dy/count],[dx/count,0],[0,dy/count]]){
      if(Math.abs(sx)+Math.abs(sy)<EPS)continue;const next={x:position.x+sx,y:position.y+sy},support=findSupport(next,position.elevation);if(!support||!canStand(next,support.height,position))continue;
      if(!isSectionReady({...next,elevation:support.height})){waiting=true;continue;}position={...next,...supportMetadata(support)};heading=Math.atan2(sy,sx);path.push({...position});break;
    }return {path,waiting,heading};
  }
  function probeStep(from,to,report=()=>{}){
    if(closed||![from.x,from.y,from.elevation,to.x,to.y].every(Number.isFinite))return null;const n=Math.max(1,Math.ceil(distance(from,to)/.01));let previous={...from};
    for(let i=1;i<=n;i++){const p={x:from.x+(to.x-from.x)*i/n,y:from.y+(to.y-from.y)*i/n},s=findSupport(p,previous.elevation);if(!s){report({reason:'support',point:p,fromHeight:previous.elevation});return null;}if(!canStand(p,s.height,previous,report))return null;previous={...p,elevation:s.height,surfaceId:s.id};}return previous;
  }
  return {body,support:findSupport,canStand,move,reachable,nearestPortal,transitionBlocked,interaction,probeStep,metrics,portal:id=>(data.portals||[]).find(p=>p.id===id),
    routeHints:()=>({offset:[...(data.sourceOffset||[0,0,0])],stairs:(data.accessPlan?.stairs||[]).map(s=>s.path.map(p=>[...p])),floors:data.surfaces.filter(s=>!s.stairId).map(s=>({height:s.height,polygons:s.polygons.map(p=>p.map(v=>[...v]))}))}),
    definition:()=>structuredClone(data),dispose(){closed=true;cache.clear();cachedTriangles=0;}};
}
