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
  if(b.kind!=='attachment')for(const t of ta)for(const p of t)if(inPrism(p,b))return true;
  if(a.kind!=='attachment')for(const t of tb)for(const p of t)if(inPrism(p,a))return true;
  for(const t of ta)for(let i=0;i<3;i++)for(const other of tb)if(segmentTriangle(t[i],t[(i+1)%3],other)!==null)return true;
  return false;
}
export function createSupportGraph(scene) {
  const {index,fuels}=scene,nodes=new Map([...index.surfaces.values()].filter(s=>s.fuelId&&fuels.get(s.fuelId).cls!=='grass'&&['floor','wall','roof','attachment'].includes(s.kind)).map(s=>[s.id,s])),links=new Map([...nodes.keys()].map(id=>[id,new Set()])),anchors=new Set(),bySource=new Map();
  for(const s of nodes.values()){if(!bySource.has(s.sourceSurfaceId))bySource.set(s.sourceSurfaceId,[]);bySource.get(s.sourceSurfaceId).push(s);}
  const connect=(a,b)=>{if(a.id===b.id)return;links.get(a.id).add(b.id);links.get(b.id).add(a.id);};
  const inert=new Map([...index.surfaces.values()].filter(s=>!s.fuelId&&s.transmission===0&&['ground','floor','wall','roof','plinth'].includes(s.kind)).map(s=>[s.id,s])),inertLinks=new Map([...inert.keys()].map(id=>[id,new Set()]));
  for(const a of inert.values())for(const b of index.candidates(a.bounds))if(inert.has(b.id)&&a.id<b.id&&touching(a,b)){inertLinks.get(a.id).add(b.id);inertLinks.get(b.id).add(a.id);}
  const groundedInert=new Set(),inertQueue=[...inert.values()].filter(s=>s.kind==='ground').map(s=>s.id);for(const id of inertQueue)groundedInert.add(id);
  for(let i=0;i<inertQueue.length;i++)for(const id of inertLinks.get(inertQueue[i]))if(!groundedInert.has(id)){groundedInert.add(id);inertQueue.push(id);}
  let contactPairs=0;
  for(const a of nodes.values())for(const b of index.candidates(a.bounds)) {
    if(nodes.has(b.id)){if(a.id<b.id&&a.kind!=='attachment'&&b.kind!=='attachment'&&touching(a,b)){connect(a,b);contactPairs++;}}
    else if(groundedInert.has(b.id)&&b.supports&&(b.normal?.[1]??0)>.2&&a.bounds.min[1]>=b.bounds.max[1]-1e-4&&touching(a,b))anchors.add(a.id);
  }
  // Source-defined support references represent native framing omitted from
  // the visible single-surface kit. Keep these explicit in diagnostics.
  let declaredPairs=0;
  for(const a of nodes.values())for(const source of new Set([...(a.supportSurfaceIds||[]),...(a.attachmentHostSurfaceIds||[]),...(a.supportBinding?.hostSurfaceIds||[])]))for(const b of bySource.get(source)||[]){if(a.kind==='attachment'){if(!overlaps(a.bounds,b.bounds,a.connectionTolerance||.015))continue;links.get(b.id).add(a.id);}else if(b.kind!=='attachment')connect(a,b);declaredPairs++;}
  for(const list of bySource.values())if(list[0].kind==='attachment')for(let i=0;i<list.length;i++)for(let j=i+1;j<list.length;j++)if(touching(list[i],list[j]))connect(list[i],list[j]);
  const explicit=scene.data.sandbox?.version===1;
  const allTreads=[...nodes.values()].filter(s=>s.supportType==='stair-tread');
  if(explicit&&allTreads.some(s=>!s.stairFlightId))throw Error('Sandbox stair needs its own flight ID');
  const definitions=explicit?scene.data.stairFlights||[]:[{id:'legacy',lower:{elevation:scene.data.levels?.[0]?.floorY??.48},upper:{elevation:scene.data.levels?.[1]?.floorY??2.6}}];
  const flights=definitions.map(definition=>({definition,flight:allTreads.filter(s=>!explicit||s.stairFlightId===definition.id),lower:[],upper:[]}));
  if(explicit&&allTreads.some(s=>!flights.some(f=>f.definition.id===s.stairFlightId)))throw Error('Unknown sandbox stair flight');
  for(const {definition,flight,lower,upper}of flights)if(flight.length) {
    const lowest=Math.min(...flight.map(s=>s.position[1])),highest=Math.max(...flight.map(s=>s.position[1])),first=flight.filter(s=>Math.abs(s.position[1]-lowest)<.01),last=flight.filter(s=>Math.abs(s.position[1]-highest)<.01);
    for(const a of flight)for(const b of flight)connect(a,b);
    const lowerY=definition.lower.elevation,upperY=definition.upper.elevation;
    if(explicit){
      for(const [end,treads,y,ids]of [[definition.lower,first,lowerY,lower],[definition.upper,last,upperY,upper]])for(const b of index.surfaces.values()){
        if(!end.surfaceIds.includes(b.sourceSurfaceId)||!b.supports||Math.abs((b.bounds.max[1]??b.position[1])-y)>.02)continue;
        const near=treads.some(s=>overlaps(b.bounds,{min:[s.bounds.min[0]-.51,y-.12,s.bounds.min[2]-.51],max:[s.bounds.max[0]+.51,y+.01,s.bounds.max[2]+.51]}));if(!near)continue;
        ids.push(b.id);for(const a of treads)if(nodes.has(b.id))connect(a,b);else if(groundedInert.has(b.id))anchors.add(a.id);
      }
    }else for(const b of nodes.values())if(b.kind==='floor'&&b.supportType!=='stair-tread') {
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
    for(const {flight,lower,upper}of flights)if(flight.length&&lower.length&&upper.length&&(!lower.some(id=>index.surfaces.get(id).intact)||!upper.some(id=>index.surfaces.get(id).intact)))for(const s of flight)if(s.intact)result.add(s.id);
    return [...result].sort().map(id=>nodes.get(id));
  }
  const flightInfo=({definition,flight,lower,upper})=>({...(explicit?{id:definition.id,instanceId:definition.instanceId}:{}),inferredStringer:true,steps:[...new Set(flight.map(s=>s.sourceSurfaceId))],lower,upper,requiresBothLandings:true});
  return {nodes,links,unsupported,diagnostics:()=>({nodes:nodes.size,contactPairs,declaredPairs,anchors:anchors.size,groundedInert:groundedInert.size,unrootedInert:inert.size-groundedInert.size,initiallySupported:initiallySupported.size,unresolvedInitial:unresolved.length,unresolvedIds:unresolved,checks,...(explicit?{stairFlights:flights.map(flightInfo)}:{stairFlight:flightInfo(flights[0])})})};
}
