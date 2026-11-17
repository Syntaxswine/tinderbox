import * as T from '../runtime/three.js';
import {bounds,overlaps,clipTriangle,centre} from '../../workbenches/furnished-house/geometry.js';
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

// The full metadata graph is cold; only activated sources have local native
// patch nodes. Exact approved links replace cold identities as each source is
// installed. Render section residency never enters this graph.
export function createSourceSupportGraph({scene,model,querySource}){
  const {index}=scene,carriers=model.carrierById,active=new Map(),nodes=new Map(),links=new Map(),anchors=new Set(),relations=[],adjacency=[],metadataLinks=new Map(model.carriers.map(c=>[c.id,new Set()]));
  const exceptions=new Set();let structureDirty=true,graphVersion=0,lastRevision=-1,reachVersion=-1,reachCache,pendingReach,pendingCache=[],checks=0,initiallySupported,missingLocalLinks=0;
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
  function register(records){for(const b of records)if(!b.queryOnly&&carriers.has(b.sourceCarrierId)&&!nodes.has(b.id)){nodes.set(b.id,b);if(!active.has(b.sourceCarrierId))active.set(b.sourceCarrierId,[]);active.get(b.sourceCarrierId).push(b);index.watch([b.id],()=>{graphVersion++;});structureDirty=true;graphVersion++;}}
  function cold(id){return 'cold:'+id;}
  function live(id){return id.startsWith('cold:')?!active.has(id.slice(5)):nodes.get(id)?.intact===true;}
  function add(a,b,both=false){if(a===b)return;links.get(a).add(b);if(both)links.get(b).add(a);}
  function coldPieces(id,near){
    return carriers.get(id).parts.map(n=>model.parts[n]).filter(p=>p.physical&&(!near||overlaps(p.bounds,near,TOLERANCE))).map(p=>{const shape=querySource.shape(p.id,false);return {id:cold(id),bounds:p.bounds,triangles:shape.triangles,solidTriangles:shape.triangles,kind:'wall',thickness:0,normal:[0,1,0]};});
  }
  function pieces(id,near){return active.get(id)||coldPieces(id,near);}
  function connectContact(a,b,directed){
    if(!active.has(a)&&!active.has(b)){add(cold(a),cold(b),!directed);return true;}
    let count=0;for(const first of pieces(a,carriers.get(b).bounds))for(const second of pieces(b,first.bounds))if(overlaps(first.bounds,second.bounds,TOLERANCE)&&supportSurfacesTouch(first,second)){add(first.id,second.id,!directed);count++;}return count>0;
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
    for(const list of active.values())for(const a of list)for(const b of index.candidates(a.bounds))if(a.id<b.id&&b.sourceCarrierId===a.sourceCarrierId&&nodes.has(b.id)&&supportSurfacesTouch(a,b))add(a.id,b.id,true);
    for(const [a,b]of adjacency)connectContact(a,b,false);
    for(const r of relations){
      if(!active.has(r.child)&&!active.has(r.parent)){add(cold(r.parent),cold(r.child),r.symmetric);continue;}
      if(r.kind==='coplanar-horizontal-triangle-contact'){if(!connectContact(r.parent,r.child,!r.symmetric))missingLocalLinks++;continue;}
      const [childRegion,parentRegion]=assemblyRegions(r),children=active.has(r.child)?selectRegion(active.get(r.child),childRegion):[{id:cold(r.child)}],parents=active.has(r.parent)?selectRegion(active.get(r.parent),parentRegion):[{id:cold(r.parent)}];
      for(const a of parents)for(const b of children)add(a.id,b.id,r.symmetric);
      if(!parents.length||!children.length)missingLocalLinks++;
    }
    const originallyReachable=reachable(links,anchors);initiallySupported=new Set([...nodes.values()].filter(b=>metadataSupported.has(b.sourceCarrierId)).map(b=>b.id));
    for(const id of initiallySupported)if(!originallyReachable.has(id)&&nodes.get(id).intact)exceptions.add(id);
    structureDirty=false;lastRevision=-1;
  }
  register(index.surfaces.values());rebuild();
  function state(){rebuild();if(reachCache&&reachVersion===graphVersion)return reachCache;const graph=new Map([...links].map(([id,set])=>[id,live(id)?new Set([...set].filter(live)):new Set()]));reachVersion=graphVersion;return reachCache=reachable(graph,[...anchors].filter(live));}
  function pendingSources(){const seen=state();if(seen!==pendingReach){pendingReach=seen;pendingCache=model.carriers.filter(c=>!active.has(c.id)&&metadataSupported.has(c.id)&&!seen.has(cold(c.id))).map(c=>c.id);}return pendingCache;}
  function unsupported({force=false}={}){if(!force&&!structureDirty&&lastRevision===graphVersion)return [];const seen=state();lastRevision=graphVersion;checks++;return [...initiallySupported].filter(id=>nodes.get(id).intact&&!exceptions.has(id)&&!seen.has(id)).sort().map(id=>nodes.get(id));}
  return {nodes,links,unsupported,pendingSources,sourcesAdded(result){register(result.boundaries);structureDirty=true;},rootingEvidence:()=>({links:metadataLinks,supported:metadataSupported,relations,verifiedContacts:adjacency}),diagnostics:({includeIds=true}={})=>({nodes:nodes.size,coldCarrierNodes:model.carriers.length-active.size,declaredPairs:relations.length,adjacencyPairs:adjacency.length,anchors:anchors.size,initiallySupported:initiallySupported.size,unresolvedInitial:metadataUnrooted.length+exceptions.size,...(includeIds?{unresolvedIds:[...metadataUnrooted,...exceptions]}:{}),missingLocalLinks,checks})};
}
