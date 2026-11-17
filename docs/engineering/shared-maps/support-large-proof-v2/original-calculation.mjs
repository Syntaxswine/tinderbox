import * as T from "../../../../src/runtime/three.js";
import {bounds,overlaps,clipTriangle,centre,createBoundaryIndex,EPS} from "../../../../workbenches/furnished-house/geometry.js";
import {supportSurfacesTouch} from "../../../../workbenches/furnished-house/support.js";
import {sourceSupportClass} from "../../../../src/content/map-source-support-data.js";

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

// The following original function bodies are verbatim 55cd fragments.
// Only the surrounding local-call/capture context replaces graph scheduling.
export function originalCalculation(context,calculation){
  const {index,model,querySource,nodes,active}=context,carriers=model.carrierById;
  const links=new Map([...nodes.keys(),...context.owners.map(id=>'cold:'+id)].map(id=>[id,new Set()]));
  const capture={edges:[],seen:new Map()};let continuityBuilds=0,peakTemporaryRecords=0,peakTemporaryMemberships=0;
  function cold(id){return 'cold:'+id;}
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
  function continuity(id){const list=active.get(id);
      const temporary=visitSourceContinuityCandidates(index,nodes,list,(a,candidates)=>{for(const b of candidates)if(a.id<b.id&&b.sourceCarrierId===a.sourceCarrierId&&nodes.has(b.id)&&supportSurfacesTouch(a,b))add(a.id,b.id,true);});
      continuityBuilds++;peakTemporaryRecords=Math.max(peakTemporaryRecords,temporary.records);peakTemporaryMemberships=Math.max(peakTemporaryMemberships,temporary.memberships);
  }
  function declaredRegion(r){
        if(r.kind==='coplanar-horizontal-triangle-contact')return connectContact(r.parent,r.child,!r.symmetric);
        const [childRegion,parentRegion]=assemblyRegions(r),children=active.has(r.child)?selectRegion(active.get(r.child),childRegion):[{id:cold(r.child)}],parents=active.has(r.parent)?selectRegion(active.get(r.parent),parentRegion):[{id:cold(r.parent)}];
        for(const a of parents)for(const b of children)add(a.id,b.id,r.symmetric);
        return parents.length>0&&children.length>0;
  }
  let result;
  if(calculation.kind==='continuity')result=continuity(calculation.carrier);
  else if(calculation.kind==='contact')result=connectContact(calculation.a,calculation.b,calculation.directed);
  else if(calculation.kind==='declared-region')result=declaredRegion(calculation.relation);
  else throw Error('Unknown pinned calculation');
  return {edges:capture.edges,result};
}
