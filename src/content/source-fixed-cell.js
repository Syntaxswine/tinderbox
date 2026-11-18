import {bounds,clipTriangle,triangleArea,segmentTriangle,EPS} from '../../workbenches/furnished-house/geometry.js';

export function sourceSurfaceSpan(surface,grid){const b=bounds(surface.triangles.flat()),min=b.min.map((v,i)=>Math.floor((v-grid.origin[i])/grid.pitch[i]+EPS)),max=b.max.map((v,i)=>v-b.min[i]<EPS?min[i]:Math.ceil((v-grid.origin[i])/grid.pitch[i]-EPS)-1);return {min,max};}
const vector=v=>Array.isArray(v)&&v.length===3&&v.every(Number.isFinite),same=(a,b)=>a.every((v,i)=>v===b[i]),lex=(a,b)=>a[0]-b[0]||a[1]-b[1]||a[2]-b[2];

// Source binding only. This function never reads current/live native records.
// Consider the floor cell and its nearer neighbor on each axis, within the
// unchanged source loop (at most eight candidates). This is a broad phase,
// not point ownership: the native clipper has its own EPS comparisons after
// expanding bounds. Only its positive retained patch AND unchanged point
// membership can accept a candidate; no AABB tolerance replaces that test.
export function selectFixedSourceCell(surface,point,grid){
  const unbound=(reason,extra={})=>({status:'UNBOUND',reason,cell:null,candidates:[],...extra});
  if(!vector(point)||!vector(grid?.origin)||!vector(grid?.pitch)||grid.pitch.some(v=>v<=2*EPS)||!surface?.triangles?.length)return unbound('INVALID_FIXED_CELL_INPUT');
  if(!surface.triangles.some(t=>segmentTriangle(point,point,t)!==null))return unbound('PROJECTED_POINT_OFF_SOURCE');
  const span=sourceSurfaceSpan(surface,grid),floorCell=point.map((v,i)=>Math.floor((v-grid.origin[i])/grid.pitch[i]+EPS)),axes=point.map((v,i)=>{
    const coordinate=(v-grid.origin[i])/grid.pitch[i],floor=floorCell[i],neighbor=coordinate<floor+.5?floor-1:floor+1;return [floor,neighbor].filter(c=>c>=span.min[i]&&c<=span.max[i]).sort((a,b)=>a-b);
  });
  if(axes.some(a=>!a.length))return unbound('NO_INCIDENT_CELL_IN_SOURCE_LOOP',{sourceSpan:span,floorCell});
  const count=axes.reduce((n,a)=>n*a.length,1);if(count>8)return unbound('INCIDENT_CELL_LIMIT',{sourceSpan:span,floorCell});
  const candidates=[];
  for(const x of axes[0])for(const y of axes[1])for(const z of axes[2]){
    const cell=[x,y,z],clipBounds={min:cell.map((v,i)=>grid.origin[i]+v*grid.pitch[i]-EPS),max:cell.map((v,i)=>grid.origin[i]+(v+1)*grid.pitch[i]+EPS)},clipped=surface.triangles.flatMap(t=>clipTriangle(t,clipBounds)),area=clipped.reduce((n,t)=>n+triangleArea(t),0),positivePatch=Number.isFinite(area)&&area>=EPS,retainedPointMember=clipped.some(t=>segmentTriangle(point,point,t)!==null);
    candidates.push({cell,clipBounds,clippedTriangleCount:clipped.length,clippedArea:area,positivePatch,retainedPointMember,valid:positivePatch&&retainedPointMember});
  }
  candidates.sort((a,b)=>lex(a.cell,b.cell));const valid=candidates.filter(c=>c.valid),floor=valid.find(c=>same(c.cell,floorCell)),selected=floor||valid[0];
  if(!selected)return unbound(candidates.some(c=>c.positivePatch)?'FIXED_POINT_NOT_IN_RETAINED_NATIVE_PATCH':'NO_POSITIVE_INCIDENT_SOURCE_PATCH',{sourceSpan:span,floorCell,candidates});
  return {status:'FIXED_SOURCE_CELL_DERIVED',reason:floor?'CURRENT_FLOOR_CELL_VALID':'LEXICOGRAPHIC_OCCUPIED_INCIDENT_CELL',cell:[...selected.cell],sourceSpan:span,floorCell,candidates,selectedPatchArea:selected.clippedArea,tolerance:EPS,positivePatchThreshold:EPS,nativeAuthority:'UNBORN_UNPROVED'};
}
