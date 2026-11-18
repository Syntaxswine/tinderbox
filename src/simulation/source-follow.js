import * as T from '../runtime/three.js';
import {bounds,centre,clipTriangle} from '../../workbenches/furnished-house/geometry.js';

// Appearance owns no thermal surface or stock. Its existing query mesh follows
// the closest original local carrier patch, including after native retirement.
// No nearest-survivor search is allowed to move a lost attachment elsewhere.
export function createSourceFollow({model,trial,querySource,activation}){
  const follows=new Map(model.follows.map(f=>[f.partId,f])),triangle=new T.Triangle(),point=new T.Vector3(),nearest=new T.Vector3(),vectors=[new T.Vector3(),new T.Vector3(),new T.Vector3()];
  const distance=(p,triangles)=>{let result=Infinity;point.fromArray(p);for(const t of triangles){for(let i=0;i<3;i++)vectors[i].fromArray(t[i]);triangle.set(...vectors).closestPointToPoint(point,nearest);result=Math.min(result,point.distanceTo(nearest));}return result;};
  function parents(f,loans){return f.parents.flatMap(id=>{
    if(activation.isActive(id))return model.carrierById.get(id).parts.flatMap(n=>activation.sourceIdsForPart(model.parts[n].id)).flatMap(id=>trial.boundariesForSource(id)).map(b=>({id:b.id,parent:id,intact:b.intact,triangles:b.closedSolidTriangles||b.solidTriangles||b.triangles}));
    return model.carrierById.get(id).parts.filter(n=>model.parts[n].physical).map(n=>{const shape=querySource.shape(model.parts[n].id,false);if(shape.release)loans.push(shape);return {id:'cold:'+id,parent:id,intact:true,triangles:shape.triangles};});
  });}
  function partition(part,shape){
    const follow=follows.get(part.id);if(!follow)throw Error('Missing cosmetic local ownership '+part.id);
    const loans=[];try{const candidates=parents(follow,loans),pitch=trial.scene.pitch,origin=trial.scene.origin,out=[];
    for(let sourceTriangle=0;sourceTriangle<shape.triangles.length;sourceTriangle++){const t=shape.triangles[sourceTriangle],box=bounds(t),lo=trial.scene.coords(box.min),hi=trial.scene.coords(box.max);for(let z=lo[2];z<=hi[2];z++)for(let y=lo[1];y<=hi[1];y++)for(let x=lo[0];x<=hi[0];x++){
      const cell=[x,y,z],clipBox={min:cell.map((v,i)=>origin[i]+v*pitch[i]),max:cell.map((v,i)=>origin[i]+(v+1)*pitch[i])},pieces=clipTriangle(t,clipBox);if(!pieces.length)continue;
      const p=centre(pieces.flat()),distances=candidates.map(c=>({...c,distance:distance(p,c.triangles)})),groups=follow.semantics==='any-live-local-parent'?[distances]:follow.parents.map(id=>distances.filter(c=>c.parent===id)),local=groups.map(list=>{const minimum=Math.min(...list.map(c=>c.distance));return list.filter(c=>c.distance<=minimum+.00002);});
      out.push({sourceTriangle,cell,triangles:pieces,parentGroups:local.map(list=>list.map(c=>c.id)),present:local.every(list=>list.some(c=>c.intact))});
    }}return out;}finally{for(const loan of loans)loan.release();}
  }
  function resolve(part,shape){const follow=follows.get(part.id);if(!follow)throw Error('Missing cosmetic local ownership '+part.id);if(!follow.parents.some(id=>activation.isActive(id)))return shape;const chunks=partition(part,shape);return {triangles:chunks.filter(c=>c.present).flatMap(c=>c.triangles),closed:shape.closed&&chunks.every(c=>c.present)};}
  return {resolve,partition};
}
