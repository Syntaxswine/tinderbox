import {bounds,clipTriangle,triangleArea,segmentTriangle,EPS} from '../../workbenches/furnished-house/geometry.js';

export function sourceSurfaceSpan(surface,grid){const b=bounds(surface.triangles.flat()),min=b.min.map((v,i)=>Math.floor((v-grid.origin[i])/grid.pitch[i]+EPS)),max=b.max.map((v,i)=>v-b.min[i]<EPS?min[i]:Math.ceil((v-grid.origin[i])/grid.pitch[i]-EPS)-1);return {min,max};}
const vector=v=>Array.isArray(v)&&v.length===3&&v.every(Number.isFinite),same=(a,b)=>a.every((v,i)=>v===b[i]),lex=(a,b)=>a[0]-b[0]||a[1]-b[1]||a[2]-b[2];

// Source binding only. This function never reads current/live native records.
// The native clipper's unchanged loop, EPS-expanded bounds, clipTriangle and
// area >= EPS criterion define genuine occupied incident cells.
export function selectFixedSourceCell(surface,point,grid){
  const unbound=(reason,extra={})=>({status:'UNBOUND',reason,cell:null,candidates:[],...extra});
  if(!vector(point)||!vector(grid?.origin)||!vector(grid?.pitch)||grid.pitch.some(v=>v<=2*EPS)||!surface?.triangles?.length)return unbound('INVALID_FIXED_CELL_INPUT');
  if(!surface.triangles.some(t=>segmentTriangle(point,point,t)!==null))return unbound('PROJECTED_POINT_OFF_SOURCE');
  const span=sourceSurfaceSpan(surface,grid),floorCell=point.map((v,i)=>Math.floor((v-grid.origin[i])/grid.pitch[i]+EPS)),axes=point.map((v,i)=>{
    const u=v-grid.origin[i],first=Math.max(span.min[i],Math.ceil((u-EPS)/grid.pitch[i]-1)),last=Math.min(span.max[i],Math.floor((u+EPS)/grid.pitch[i]));return {first,last};
  });
  if(axes.some(a=>a.last<a.first))return unbound('NO_INCIDENT_CELL_IN_SOURCE_LOOP',{sourceSpan:span,floorCell});
  const count=axes.reduce((n,a)=>n*(a.last-a.first+1),1);if(count>8)return unbound('INCIDENT_CELL_LIMIT',{sourceSpan:span,floorCell});
  const candidates=[];
  for(let x=axes[0].first;x<=axes[0].last;x++)for(let y=axes[1].first;y<=axes[1].last;y++)for(let z=axes[2].first;z<=axes[2].last;z++){
    const cell=[x,y,z],clipBounds={min:cell.map((v,i)=>grid.origin[i]+v*grid.pitch[i]-EPS),max:cell.map((v,i)=>grid.origin[i]+(v+1)*grid.pitch[i]+EPS)},containsPoint=point.every((v,i)=>v>=clipBounds.min[i]&&v<=clipBounds.max[i]),clipped=containsPoint?surface.triangles.flatMap(t=>clipTriangle(t,clipBounds)):[],area=clipped.reduce((n,t)=>n+triangleArea(t),0);
    candidates.push({cell,clipBounds,containsPoint,clippedTriangleCount:clipped.length,clippedArea:area,valid:containsPoint&&Number.isFinite(area)&&area>=EPS});
  }
  candidates.sort((a,b)=>lex(a.cell,b.cell));const valid=candidates.filter(c=>c.valid),floor=valid.find(c=>same(c.cell,floorCell)),selected=floor||valid[0];
  if(!selected)return unbound('NO_POSITIVE_INCIDENT_SOURCE_PATCH',{sourceSpan:span,floorCell,candidates});
  return {status:'FIXED_SOURCE_CELL_DERIVED',reason:floor?'CURRENT_FLOOR_CELL_VALID':'LEXICOGRAPHIC_OCCUPIED_INCIDENT_CELL',cell:[...selected.cell],sourceSpan:span,floorCell,candidates,selectedPatchArea:selected.clippedArea,tolerance:EPS,positivePatchThreshold:EPS,nativeAuthority:'UNBORN_UNPROVED'};
}
