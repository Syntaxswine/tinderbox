import {overlaps,pointOnTriangle,segmentTriangle,dot,sub,add,mul,EPS} from './geometry.js';

// Bounded one-house contact graph. This is a connectivity approximation, not
// a beam-stress solver. All links are static metre geometry or explicit artist
// support IDs; rooms, labels and elapsed house time never determine collapse.
function inPrism(p,s) {
  const n=s.normal,d=dot(sub(p,s.triangles[0][0]),n),thickness=s.thickness||0;
  if(s.kind==='floor'?(d>1e-5||d< -thickness-1e-5):Math.abs(d)>thickness/2+1e-5)return false;
  const q=add(p,mul(n,-d));return s.triangles.some(t=>pointOnTriangle(q,t,1e-5));
}
function touching(a,b) {
  if(!overlaps(a.bounds,b.bounds,1e-5))return false;
  const ta=a.solidTriangles||a.triangles,tb=b.solidTriangles||b.triangles;
  for(const t of ta)for(const p of t)if(inPrism(p,b))return true;
  for(const t of tb)for(const p of t)if(inPrism(p,a))return true;
  for(const t of ta)for(let i=0;i<3;i++)for(const other of tb)if(segmentTriangle(t[i],t[(i+1)%3],other)!==null)return true;
  return false;
}
export function createSupportGraph(scene) {
  const {index,fuels}=scene,nodes=new Map([...index.surfaces.values()].filter(s=>s.fuelId&&fuels.get(s.fuelId).cls!=='grass'&&['floor','wall','roof'].includes(s.kind)).map(s=>[s.id,s])),links=new Map([...nodes.keys()].map(id=>[id,new Set()])),anchors=new Set(),bySource=new Map();
  for(const s of nodes.values()){if(!bySource.has(s.sourceSurfaceId))bySource.set(s.sourceSurfaceId,[]);bySource.get(s.sourceSurfaceId).push(s);}
  const connect=(a,b)=>{if(a.id===b.id)return;links.get(a.id).add(b.id);links.get(b.id).add(a.id);};
  const inert=new Map([...index.surfaces.values()].filter(s=>!s.fuelId&&s.transmission===0&&['ground','floor','wall','roof','plinth'].includes(s.kind)).map(s=>[s.id,s])),inertLinks=new Map([...inert.keys()].map(id=>[id,new Set()]));
  for(const a of inert.values())for(const b of index.candidates(a.bounds))if(inert.has(b.id)&&a.id<b.id&&touching(a,b)){inertLinks.get(a.id).add(b.id);inertLinks.get(b.id).add(a.id);}
  const groundedInert=new Set(),inertQueue=[...inert.values()].filter(s=>s.kind==='ground').map(s=>s.id);for(const id of inertQueue)groundedInert.add(id);
  for(let i=0;i<inertQueue.length;i++)for(const id of inertLinks.get(inertQueue[i]))if(!groundedInert.has(id)){groundedInert.add(id);inertQueue.push(id);}
  let contactPairs=0;
  for(const a of nodes.values())for(const b of index.candidates(a.bounds)) {
    if(nodes.has(b.id)){if(a.id<b.id&&touching(a,b)){connect(a,b);contactPairs++;}}
    else if(groundedInert.has(b.id)&&b.supports&&(b.normal?.[1]??0)>.2&&a.bounds.min[1]>=b.bounds.max[1]-1e-4&&touching(a,b))anchors.add(a.id);
  }
  // Source-defined support references represent native framing omitted from
  // the visible single-surface kit. Keep these explicit in diagnostics.
  let declaredPairs=0;
  for(const a of nodes.values())for(const source of a.supportSurfaceIds||[])for(const b of bySource.get(source)||[]){connect(a,b);declaredPairs++;}
  const flight=[...nodes.values()].filter(s=>s.supportType==='stair-tread'),lower=[],upper=[];
  if(flight.length) {
    const lowest=Math.min(...flight.map(s=>s.position[1])),highest=Math.max(...flight.map(s=>s.position[1])),first=flight.filter(s=>Math.abs(s.position[1]-lowest)<.01),last=flight.filter(s=>Math.abs(s.position[1]-highest)<.01);
    for(const a of flight)for(const b of flight)connect(a,b);
    const lowerY=scene.data.levels?.[0]?.floorY??.48,upperY=scene.data.levels?.[1]?.floorY??2.6;
    for(const b of nodes.values())if(b.kind==='floor'&&b.supportType!=='stair-tread') {
      if(Math.abs(b.position[1]-lowerY)<.01&&first.some(s=>overlaps(b.bounds,{min:[s.bounds.min[0],lowerY-.12,s.bounds.min[2]-.51],max:[s.bounds.max[0],lowerY+.01,s.bounds.min[2]+.01]}))){lower.push(b.id);for(const a of first)connect(a,b);}
      if(Math.abs(b.position[1]-upperY)<.01&&last.some(s=>overlaps(b.bounds,{min:[s.bounds.min[0]-.06,upperY-.12,s.bounds.min[2]-.01],max:[s.bounds.max[0]+.06,upperY+.01,s.bounds.max[2]+.06]}))){upper.push(b.id);for(const a of last)connect(a,b);}
    }
  }
  function reachable() {
    const seen=new Set(),queue=[...anchors].filter(id=>nodes.get(id).intact);for(const id of queue)seen.add(id);
    for(let i=0;i<queue.length;i++)for(const id of links.get(queue[i]))if(!seen.has(id)&&nodes.get(id).intact){seen.add(id);queue.push(id);}return seen;
  }
  const initiallySupported=reachable(),unresolved=[...nodes.keys()].filter(id=>!initiallySupported.has(id));let lastRevision=index.revision,checks=0;
  function unsupported({force=false}={}) {
    if(!force&&lastRevision===index.revision)return [];lastRevision=index.revision;checks++;
    const seen=reachable(),result=new Set([...initiallySupported].filter(id=>nodes.get(id).intact&&!seen.has(id)));
    if(flight.length&&lower.length&&upper.length&&(!lower.some(id=>nodes.get(id).intact)||!upper.some(id=>nodes.get(id).intact)))for(const s of flight)if(s.intact)result.add(s.id);
    return [...result].sort().map(id=>nodes.get(id));
  }
  return {nodes,links,unsupported,diagnostics:()=>({nodes:nodes.size,contactPairs,declaredPairs,anchors:anchors.size,groundedInert:groundedInert.size,unrootedInert:inert.size-groundedInert.size,initiallySupported:initiallySupported.size,unresolvedInitial:unresolved.length,unresolvedIds:unresolved,checks,stairFlight:{inferredStringer:true,steps:[...new Set(flight.map(s=>s.sourceSurfaceId))],lower,upper,requiresBothLandings:true}})};
}
