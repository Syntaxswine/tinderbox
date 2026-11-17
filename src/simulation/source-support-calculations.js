import * as T from '../runtime/three.js';
import {bounds,overlaps,clipTriangle,centre,createBoundaryIndex,EPS} from '../../workbenches/furnished-house/geometry.js';
import {supportSurfacesTouch} from '../../workbenches/furnished-house/support.js';
import {sourceSupportClass} from '../content/map-source-support-data.js';

export const SOURCE_SUPPORT_TOLERANCE=.00002;
const TOLERANCE=SOURCE_SUPPORT_TOLERANCE;
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

export function createSourceEdgeCapture(){return {edges:[],seen:new Map()};}
export function recordSourceEdge(capture,a,b){if(capture){if(!capture.seen.has(a))capture.seen.set(a,new Set());const seen=capture.seen.get(a);if(!seen.has(b)){seen.add(b);capture.edges.push([a,b]);}}}
export function captureSourceCalculation(build){const capture=createSourceEdgeCapture(),directed=(a,b)=>recordSourceEdge(capture,a,b),add=(a,b,both=false)=>{if(a===b)return;directed(a,b);if(both)directed(b,a);};return {edges:capture.edges,result:build(add)};}
export function sourceSupportRelation(child,parent,record,carriers){if(record.direction&&!['parent-to-child','symmetric-structural'].includes(record.direction))throw Error('Unknown declared local support direction');const symmetric=record.direction?record.direction==='symmetric-structural':sourceSupportClass(carriers.get(child))==='structural'&&sourceSupportClass(carriers.get(parent))==='structural'&&!/mount|hinge|hardware/.test(record.kind);return {child,parent,...record,symmetric};}

// Exact accepted 55cd calculation math; graph scheduling and live decisions stay outside.
export function createSourceSupportCalculations({index,model,querySource,nodes,active,onContinuityBuild=()=>{}}){
  const carriers=model.carrierById;
  function cold(id){return 'cold:'+id;}
  function coldPieces(id,near){
    return carriers.get(id).parts.map(n=>model.parts[n]).filter(p=>p.physical&&(!near||overlaps(p.bounds,near,TOLERANCE))).map(p=>{const shape=querySource.shape(p.id,false);return {id:cold(id),bounds:p.bounds,triangles:shape.triangles,solidTriangles:shape.triangles,kind:'wall',thickness:0,normal:[0,1,0]};});
  }
  function pieces(id,near){return active.get(id)||coldPieces(id,near);}
  function connectContact(a,b,directed,add){
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
  function continuity(id,add){const list=active.get(id);
      const temporary=visitSourceContinuityCandidates(index,nodes,list,(a,candidates)=>{for(const b of candidates)if(a.id<b.id&&b.sourceCarrierId===a.sourceCarrierId&&nodes.has(b.id)&&supportSurfacesTouch(a,b))add(a.id,b.id,true);});
      onContinuityBuild(temporary);
  }
  function declaredRegion(r,add){
        if(r.kind==='coplanar-horizontal-triangle-contact')return connectContact(r.parent,r.child,!r.symmetric,add);
        const [childRegion,parentRegion]=assemblyRegions(r),children=active.has(r.child)?selectRegion(active.get(r.child),childRegion):[{id:cold(r.child)}],parents=active.has(r.parent)?selectRegion(active.get(r.parent),parentRegion):[{id:cold(r.parent)}];
        for(const a of parents)for(const b of children)add(a.id,b.id,r.symmetric);
        return parents.length>0&&children.length>0;
  }
  function run(calculation,add){if(calculation.kind==='continuity')return continuity(calculation.carrier,add);if(calculation.kind==='contact')return connectContact(calculation.a,calculation.b,calculation.directed,add);if(calculation.kind==='declared-region')return declaredRegion(calculation.relation,add);throw Error('Unknown source calculation kind');}
  return {continuity,contact:connectContact,declaredRegion,run};
}
