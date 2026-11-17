import * as T from '../runtime/three.js';
import {bounds,overlaps,clipTriangle,centre,createBoundaryIndex,EPS} from '../../workbenches/furnished-house/geometry.js';
import {supportSurfacesTouch} from '../../workbenches/furnished-house/support.js';
import {sourceSupportClass} from '../content/map-source-support-data.js';

const TOLERANCE=.00002;
const triangles=b=>b.closedSolidTriangles||b.solidTriangles||b.closedTriangles||b.triangles;
const boxDistance=(a,b)=>Math.hypot(...a.min.map((v,i)=>Math.max(v-b.max[i],b.min[i]-a.max[i],0)));
const expand=b=>({min:b.min.map(v=>v-TOLERANCE),max:b.max.map(v=>v+TOLERANCE)});
const point=new T.Vector3(),closest=new T.Vector3(),triangle=new T.Triangle();
function nearestDistance(position,list){let result=Infinity;point.fromArray(position);for(const t of list){triangle.set(...t.map(p=>new T.Vector3(...p))).closestPointToPoint(point,closest);result=Math.min(result,point.distanceTo(closest));}return result;}
function selectRegion(pieces,region){
  const box=expand(region.bounds),intersecting=pieces.filter(b=>overlaps(b.bounds,box)&&triangles(b).some(t=>clipTriangle(t,box).length));
  if(intersecting.length)return intersecting;
  // An embed witness can lie inside a solid. Project it to the actual original
  // exterior once; do not select a different surviving patch after damage.
  const p=region.point||centre([box.min,box.max]),distances=pieces.map(b=>[b,nearestDistance(p,triangles(b))]),minimum=Math.min(...distances.map(v=>v[1]));
  return distances.filter(v=>v[1]<=minimum+TOLERANCE).map(v=>v[0]);
}

// A temporary native broadphase for one registered carrier. Candidate records
// passed onward are the authoritative world objects, not the index's copies.
// This helper retains no geometry, index or subscription after the visit.
export function visitSourceContinuityCandidates(index,nodes,list,visit){
  const carrier=list[0]?.sourceCarrierId;
  for(const b of list)if(index.surfaces.get(b.id)!==b||nodes.get(b.id)!==b||b.queryOnly||b.sourceCarrierId!==carrier)throw Error('Continuity needs authoritative registered native fragments');
  const local=createBoundaryIndex(list);let memberships=0;
  for(const b of local.surfaces.values())memberships+=b.bounds.min.reduce((n,v,i)=>n*(Math.floor(b.bounds.max[i]+EPS)-Math.floor(v-EPS)+1),1);
  for(const a of list){const candidates=local.candidates(a.bounds);for(let i=0;i<candidates.length;i++)candidates[i]=index.surfaces.get(candidates[i].id);visit(a,candidates);}
  return {records:local.surfaces.size,memberships};
}

// Contact scans retain registration order, including retired original pieces.
// Padding only admits extra candidates; the caller keeps the exact predicates.
export function visitSourceContactCandidates(index,nodes,firsts,seconds,visit){
  for(const list of [firsts,seconds]){const carrier=list[0]?.sourceCarrierId;for(const b of list)if(index.surfaces.get(b.id)!==b||nodes.get(b.id)!==b||b.queryOnly||b.sourceCarrierId!==carrier)throw Error('Contact needs authoritative registered native fragments');}
  const local=createBoundaryIndex(seconds),order=new Map(seconds.map((b,i)=>[b.id,i])),padding=TOLERANCE*2+EPS;let memberships=0;
  for(const b of local.surfaces.values())memberships+=b.bounds.min.reduce((n,v,i)=>n*(Math.floor(b.bounds.max[i]+EPS)-Math.floor(v-EPS)+1),1);
  for(const first of firsts){
    const box={min:first.bounds.min.map(v=>v-padding),max:first.bounds.max.map(v=>v+padding)},candidates=local.candidates(box).sort((a,b)=>order.get(a.id)-order.get(b.id));
    for(let i=0;i<candidates.length;i++)candidates[i]=index.surfaces.get(candidates[i].id);
    visit(first,candidates);
  }
  return {records:local.surfaces.size,memberships};
}

// The live predicate is pure for this synchronous traversal. Retain the original
// breadth-first insertion order without copying the full graph or its edge Sets.
export function reachableLiveSourceLinks(graph,roots,live){
  const seen=new Set();for(const id of roots)if(live(id))seen.add(id);
  const queue=[...seen];for(let i=0;i<queue.length;i++)for(const id of graph.get(queue[i])||[])if(!seen.has(id)&&live(id)){seen.add(id);queue.push(id);}return seen;
}

// The full metadata graph is cold; only activated sources have local native
// patch nodes. Exact approved links replace cold identities as each source is
// installed. Render section residency never enters this graph.
export function createSourceSupportGraph({scene,model,querySource}){
  const {index}=scene,carriers=model.carrierById,active=new Map(),nodes=new Map(),links=new Map(),anchors=new Set(),relations=[],adjacency=[],metadataLinks=new Map(model.carriers.map(c=>[c.id,new Set()]));
  const exceptions=new Set();let structureDirty=true,graphVersion=0,lastRevision=-1,reachVersion=-1,reachCache,pendingReach,pendingCache=[],checks=0,initiallySupported,missingLocalLinks=0;
  // One current edge block per calculation; never retain transformed cold
  // geometry or a history of pose/activation variants. Rebuild still owns the
  // original graph schedule, anchors, live filtering and exception semantics.
  const calculations=new Map(),dependencies=new Map(),knownCalculations=new Set(),watched=new Map();
  let capture=null,cachedEdges=0,peakCachedEdges=0,cacheHits=0,cacheMisses=0,invalidations=0,closed=false;
  let continuityBuilds=0,peakTemporaryRecords=0,peakTemporaryMemberships=0;
  let contactBuilds=0,peakContactRecords=0,peakContactMemberships=0;
  function invalidate(id){for(const key of dependencies.get(id)||[]){const old=calculations.get(key);if(old){cachedEdges-=old.edges.length;calculations.delete(key);invalidations++;}}}
  function calculate(key,owners,build){
    const old=calculations.get(key);if(old){cacheHits++;for(const [a,b]of old.edges)add(a,b);return old.result;}
    if(!knownCalculations.has(key)){knownCalculations.add(key);for(const id of owners){if(!dependencies.has(id))dependencies.set(id,new Set());dependencies.get(id).add(key);}}
    const previous=capture;capture={edges:[],seen:new Map()};
    try{const result=build(),edges=capture.edges;calculations.set(key,{edges,result});cachedEdges+=edges.length;peakCachedEdges=Math.max(peakCachedEdges,cachedEdges);cacheMisses++;return result;}finally{capture=previous;}
  }
  function relation(child,parent,record){if(record.direction&&!['parent-to-child','symmetric-structural'].includes(record.direction))throw Error('Unknown declared local support direction');const symmetric=record.direction?record.direction==='symmetric-structural':sourceSupportClass(carriers.get(child))==='structural'&&sourceSupportClass(carriers.get(parent))==='structural'&&!/mount|hinge|hardware/.test(record.kind);relations.push({child,parent,...record,symmetric});metadataLinks.get(parent).add(child);if(symmetric)metadataLinks.get(child).add(parent);}
  for(const c of model.carriers){
    for(const parent of c.supports){
      const attachment=c.attachments.find(a=>a.parent===parent),evidence=c.supportEvidence.find(e=>e.parent===parent);
      if(attachment)relation(c.id,parent,attachment);
      else if(evidence&&['coplanar-horizontal-triangle-contact','native-opening-assembly-attachment','native-portal-hinge-attachment','native-leaf-hardware-attachment'].includes(evidence.kind))relation(c.id,parent,evidence);
      else throw Error('Missing approved source support evidence '+c.id+' -> '+parent);
    }
  }
  for(const pair of model.index?.contacts||[]){const [a,b]=pair.map(i=>model.carriers[i].id);adjacency.push([a,b]);metadataLinks.get(a).add(b);metadataLinks.get(b).add(a);}
  function reachable(graph,roots){const seen=new Set(roots),queue=[...seen];for(let i=0;i<queue.length;i++)for(const id of graph.get(queue[i])||[])if(!seen.has(id)){seen.add(id);queue.push(id);}return seen;}
  const metadataSupported=reachable(metadataLinks,model.carriers.filter(c=>c.anchors.length).map(c=>c.id));
  const metadataUnrooted=model.carriers.filter(c=>!metadataSupported.has(c.id)).map(c=>c.id);
  function register(records){
    const changed=new Set();
    for(const b of records)if(carriers.has(b.sourceCarrierId)){
      if(!watched.has(b.id))watched.set(b.id,index.watch([b.id],()=>{if(closed)return;invalidate(b.sourceCarrierId);if(!b.queryOnly)graphVersion++;}));
      if(!b.queryOnly&&!nodes.has(b.id)){nodes.set(b.id,b);if(!active.has(b.sourceCarrierId))active.set(b.sourceCarrierId,[]);active.get(b.sourceCarrierId).push(b);changed.add(b.sourceCarrierId);structureDirty=true;graphVersion++;}
    }
    for(const id of changed)invalidate(id);
  }
  function cold(id){return 'cold:'+id;}
  function live(id){return id.startsWith('cold:')?!active.has(id.slice(5)):nodes.get(id)?.intact===true;}
  function directed(a,b){
    links.get(a).add(b);
    if(capture){if(!capture.seen.has(a))capture.seen.set(a,new Set());const seen=capture.seen.get(a);if(!seen.has(b)){seen.add(b);capture.edges.push([a,b]);}}
  }
  function add(a,b,both=false){if(a===b)return;directed(a,b);if(both)directed(b,a);}
  function coldPieces(id,near){
    return carriers.get(id).parts.map(n=>model.parts[n]).filter(p=>p.physical&&(!near||overlaps(p.bounds,near,TOLERANCE))).map(p=>{const shape=querySource.shape(p.id,false);return {id:cold(id),bounds:p.bounds,triangles:shape.triangles,solidTriangles:shape.triangles,kind:'wall',thickness:0,normal:[0,1,0]};});
  }
  function pieces(id,near){return active.get(id)||coldPieces(id,near);}
  function connectContact(a,b,directed){
    if(!active.has(a)&&!active.has(b)){add(cold(a),cold(b),!directed);return true;}
    let count=0;
    if(active.has(a)&&active.has(b)){
      const temporary=visitSourceContactCandidates(index,nodes,active.get(a),active.get(b),(first,candidates)=>{for(const second of candidates)if(overlaps(first.bounds,second.bounds,TOLERANCE)&&supportSurfacesTouch(first,second)){add(first.id,second.id,!directed);count++;}});
      contactBuilds++;peakContactRecords=Math.max(peakContactRecords,temporary.records);peakContactMemberships=Math.max(peakContactMemberships,temporary.memberships);
    }else for(const first of pieces(a,carriers.get(b).bounds))for(const second of pieces(b,first.bounds))if(overlaps(first.bounds,second.bounds,TOLERANCE)&&supportSurfacesTouch(first,second)){add(first.id,second.id,!directed);count++;}return count>0;
  }
  function assemblyRegions(r){
    if(r.childRegion)return [r.childRegion,r.parentRegion];
    const child=carriers.get(r.child).bounds,parent=carriers.get(r.parent).bounds;
    // Normalize only the named existing assembly. Keep its gap and evidence
    // kind; this selects local original source faces, not an inferred mount.
    const bridge={min:child.min.map((v,i)=>Math.min(child.max[i],Math.max(v,parent.min[i]))),max:child.max.map((v,i)=>Math.max(child.min[i],Math.min(v,parent.max[i])))};
    const p=centre([bridge.min,bridge.max]);return [{bounds:bridge,point:p},{bounds:bridge,point:p}];
  }
  function rebuild(){
    if(!structureDirty)return;links.clear();anchors.clear();missingLocalLinks=0;
    for(const c of model.carriers){if(!active.has(c.id)){links.set(cold(c.id),new Set());if(c.anchors.length)anchors.add(cold(c.id));}else for(const b of active.get(c.id)){links.set(b.id,new Set());if(c.anchors.some(a=>b.bounds.min[1]<=a.elevation+TOLERANCE&&b.bounds.max[1]>=a.elevation-TOLERANCE))anchors.add(b.id);}}
    // Native patches of one solid connect at their real common exterior/edge.
    for(const [id,list]of active)calculate('continuity:'+id,[id],()=>{
      const temporary=visitSourceContinuityCandidates(index,nodes,list,(a,candidates)=>{for(const b of candidates)if(a.id<b.id&&b.sourceCarrierId===a.sourceCarrierId&&nodes.has(b.id)&&supportSurfacesTouch(a,b))add(a.id,b.id,true);});
      continuityBuilds++;peakTemporaryRecords=Math.max(peakTemporaryRecords,temporary.records);peakTemporaryMemberships=Math.max(peakTemporaryMemberships,temporary.memberships);
    });
    for(let i=0;i<adjacency.length;i++){const [a,b]=adjacency[i];if(!active.has(a)&&!active.has(b))connectContact(a,b,false);else calculate('adjacency:'+i,[a,b],()=>connectContact(a,b,false));}
    for(let i=0;i<relations.length;i++){const r=relations[i];
      if(!active.has(r.child)&&!active.has(r.parent)){add(cold(r.parent),cold(r.child),r.symmetric);continue;}
      const found=calculate('relation:'+i,[r.child,r.parent],()=>{
        if(r.kind==='coplanar-horizontal-triangle-contact')return connectContact(r.parent,r.child,!r.symmetric);
        const [childRegion,parentRegion]=assemblyRegions(r),children=active.has(r.child)?selectRegion(active.get(r.child),childRegion):[{id:cold(r.child)}],parents=active.has(r.parent)?selectRegion(active.get(r.parent),parentRegion):[{id:cold(r.parent)}];
        for(const a of parents)for(const b of children)add(a.id,b.id,r.symmetric);
        return parents.length>0&&children.length>0;
      });
      if(!found)missingLocalLinks++;
    }
    const originallyReachable=reachable(links,anchors);initiallySupported=new Set([...nodes.values()].filter(b=>metadataSupported.has(b.sourceCarrierId)).map(b=>b.id));
    for(const id of initiallySupported)if(!originallyReachable.has(id)&&nodes.get(id).intact)exceptions.add(id);
    structureDirty=false;lastRevision=-1;
  }
  register(index.surfaces.values());rebuild();
  function state(){if(closed)throw Error('Source support graph disposed');rebuild();if(reachCache&&reachVersion===graphVersion)return reachCache;reachVersion=graphVersion;return reachCache=reachableLiveSourceLinks(links,anchors,live);}
  function pendingSources(){const seen=state();if(seen!==pendingReach){pendingReach=seen;pendingCache=model.carriers.filter(c=>!active.has(c.id)&&metadataSupported.has(c.id)&&!seen.has(cold(c.id))).map(c=>c.id);}return pendingCache;}
  function unsupported({force=false}={}){if(!force&&!structureDirty&&lastRevision===graphVersion)return [];const seen=state();lastRevision=graphVersion;checks++;return [...initiallySupported].filter(id=>nodes.get(id).intact&&!exceptions.has(id)&&!seen.has(id)).sort().map(id=>nodes.get(id));}
  return {nodes,links,unsupported,pendingSources,sourcesAdded(result){if(closed)throw Error('Source support graph disposed');register(result.boundaries);structureDirty=true;},rootingEvidence:()=>({links:metadataLinks,supported:metadataSupported,relations,verifiedContacts:adjacency}),diagnostics:({includeIds=true}={})=>({nodes:nodes.size,coldCarrierNodes:model.carriers.length-active.size,declaredPairs:relations.length,adjacencyPairs:adjacency.length,anchors:anchors.size,initiallySupported:initiallySupported.size,unresolvedInitial:metadataUnrooted.length+exceptions.size,...(includeIds?{unresolvedIds:[...metadataUnrooted,...exceptions]}:{}),missingLocalLinks,checks,topologyCache:{entries:calculations.size,entryLimit:model.carriers.length+relations.length+adjacency.length,variantsPerCalculation:1,directedEdges:cachedEdges,peakDirectedEdges:peakCachedEdges,hits:cacheHits,misses:cacheMisses,invalidations,watchedBoundaries:watched.size,retainedColdMeshes:0,disposed:closed,continuityBuilds,peakTemporaryRecords,peakTemporaryMemberships,retainedTemporaryIndexes:0,contactBuilds,peakContactRecords,peakContactMemberships,retainedContactIndexes:0}}),
    dispose(){if(closed)return;closed=true;for(const unsubscribe of watched.values())unsubscribe();watched.clear();calculations.clear();dependencies.clear();knownCalculations.clear();cachedEdges=0;capture=null;reachCache=pendingReach=null;pendingCache=[];nodes.clear();links.clear();active.clear();anchors.clear();initiallySupported.clear();exceptions.clear();}
  };
}
