// Offline mesh inspection/composition. No production source intake or gameplay adapter.
import * as T from '../../../src/runtime/three.js';
import {createNewYorkStateBuildingTile} from '../../../assets/art/exposition-new-york-tile/index.js';
import {createAdministrationBuilding} from '../../../assets/art/exposition-administration/index.js';
import {createHorticulturalBuilding} from '../../../assets/art/exposition-horticulture/index.js';
import {createAccessGeometry,getAccessPlan} from '../../../assets/art/exploration-access/index.js';
import {getInteriorPlan} from '../../../assets/art/landmark-interiors/index.js';
import {applyCuts} from '../exploration-access/source-geometry.mjs';
const intersects=(a,b)=>a.min.every((v,i)=>v<=b.max[i]+1e-6&&a.max[i]>=b.min[i]-1e-6);
export function clipBounds(vertices,bounds){
 const planes=[];for(let j=0;j<3;j++){planes.push({axis:j,n:1,c:bounds.min[j]},{axis:j,n:-1,c:-bounds.max[j]});}
 const out=[];for(let k=0;k<vertices.length;k+=3){let poly=vertices.slice(k,k+3);for(const p of planes){if(poly.length<3)break;const next=[];for(let i=0;i<poly.length;i++){const a=poly[i],b=poly[(i+1)%poly.length],s=p.n*a[p.axis]-p.c,t=p.n*b[p.axis]-p.c,A=s>=-1e-7,B=t>=-1e-7;if(A)next.push(a);if(A!==B){const u=s/(s-t);next.push(a.map((v,j)=>v+u*(b[j]-v)));}}poly=next;}for(let i=1;i<poly.length-1;i++)out.push(poly[0],poly[i],poly[i+1]);}return out;
}
export function collectParts(root,source,{bounds,hidden=new Set(),plan}={}){
 const out=[],instance=new T.Matrix4(),v=new T.Vector3(),normal=new T.Vector3();root.updateMatrixWorld(true);
 root.traverseVisible(o=>{if(!o.isMesh)return;const geo=o.geometry,index=geo.index,p=geo.attributes.position;geo.computeBoundingBox();for(let i=0;i<(o.isInstancedMesh?o.count:1);i++){
  const matrix=o.matrixWorld.clone();if(o.isInstancedMesh){o.getMatrixAt(i,instance);matrix.multiply(instance);}const bb=geo.boundingBox.clone().applyMatrix4(matrix),b={min:bb.min.toArray(),max:bb.max.toArray()};if(bounds&&!intersects(b,bounds))continue;
  const data=o.isInstancedMesh?o.userData.parts[i]:o.userData,pieces=data.form==='boundary-slab-assembly'?data.parts:[data],nmat=new T.Matrix3().getNormalMatrix(matrix);
  for(const piece of pieces){const d={...data,...piece};delete d.parts;const id=piece.componentId||piece.id||o.name;if(hidden.has(id))continue;const vertices=[],partBounds={min:[Infinity,Infinity,Infinity],max:[-Infinity,-Infinity,-Infinity]},start=piece.start||0,count=piece.count||(index?.count||p.count);
   for(let j=start;j<start+count;j++){const n=index?index.getX(j):j;v.fromBufferAttribute(p,n).applyMatrix4(matrix);normal.fromBufferAttribute(geo.attributes.normal,n).applyMatrix3(nmat).normalize();const uv=geo.attributes.uv,metric=geo.attributes.grossUV||uv,a=[...v.toArray(),...normal.toArray(),uv?uv.getX(n):0,uv?uv.getY(n):0,metric?metric.getX(n):0,metric?metric.getY(n):0];vertices.push(a);for(let q=0;q<3;q++){partBounds.min[q]=Math.min(partBounds.min[q],a[q]);partBounds.max[q]=Math.max(partBounds.max[q],a[q]);}}
   if(bounds&&!intersects(partBounds,bounds))continue;const m=o.material,part={id,source,data:d,bounds:partBounds,vertices,material:{color:m.color.toArray(),opacity:m.transparent?m.opacity:1},slot:d.appearanceSlot||'trim'};
   if(plan&&d.role==='floor')part.vertices=applyCuts(part,plan.floorOpenings.filter(h=>h.sourceFloorId===d.floorId).map(h=>({...h,minY:h.minY-.001,maxY:h.maxY+.001}))).vertices;
   if(part.vertices.length)out.push(part);
  }
 }});return out;
}
export async function sourceParts(venueId,{bounds}={}){
 const interior=getInteriorPlan(venueId),plan=venueId==='fisheries'?null:getAccessPlan(venueId),hidden=new Set([...(plan?.hiddenSourceParts.map(p=>p.id)||[]),...interior.replacements.hiddenSourceParts.map(p=>typeof p==='string'?p:p.id)]),owners=[];
 try{let raw;if(venueId==='fisheries'){const {createFisheriesBuilding}=await import('../../../artifacts/landmark-interiors/fisheries-source/assets/art/exposition-fisheries/index.js');raw=createFisheriesBuilding(T,{includeExhibits:false,sectionIds:bounds&&bounds.max[0]<-80?['angling']:bounds&&bounds.min[0]>80?['aquarium']:undefined});}else raw=venueId==='new-york'?createNewYorkStateBuildingTile(T):venueId==='administration'?createAdministrationBuilding(T):createHorticulturalBuilding(T);owners.push(raw);
  const parts=collectParts(raw.root,venueId,{bounds,hidden,plan});if(plan){const access=createAccessGeometry(T,{placeId:venueId});owners.push(access);for(const p of plan.portals)if(p.stateful)access.setPortalState(p.id,true);parts.push(...collectParts(access.root,'access',{bounds}));}return parts;
 }finally{owners.forEach(m=>m.dispose());}
}
