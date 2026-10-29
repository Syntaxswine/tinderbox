import * as T from '../src/runtime/three.js';
import {inside} from '../src/runtime/navigation.js';
export function sourceHit(hit){
  const part=hit.object.userData.parts?.[hit.instanceId??0];if(!part)return null;
  const range=part.sourceRanges?.find(range=>hit.faceIndex*3>=range.start&&hit.faceIndex*3<range.start+range.count);
  return {...part,id:range?.id||part.id};
}
function downHits(root,point,above=.035,below=.17){
  root.updateMatrixWorld(true);
  return new T.Raycaster(new T.Vector3(point.x,point.elevation+above,point.y),new T.Vector3(0,-1,0),0,above+below).intersectObject(root,true);
}
export function verifyRenderedSupport(root,point,surface){
  if(!surface)throw Error('Navigation names an absent support surface: '+point.surfaceId);
  if(surface.terrain)return {terrain:true};
  // Navigation treats source polygon boundaries inclusively. A ray exactly
  // on a Float32 triangle edge can miss at 1e-14; sample only a 0.2 mm seam
  // tolerance, retaining the actual rendered-height requirement.
  const offsets=[[0,0],[.0002,0],[-.0002,0],[0,.0002],[0,-.0002]],hits=[];
  for(const [x,y]of offsets){hits.push(...downHits(root,{...point,x:point.x+x,y:point.y+y}).filter(hit=>Math.abs(hit.point.y-point.elevation)<.006&&sourceHit(hit)));if(hits.length)break;}
  if(!hits.length)throw Error('No rendered support at '+JSON.stringify({...point,surfaceId:surface.id}));
  return {surfaceId:surface.id,sourcePartId:sourceHit(hits[0]).id,height:hits[0].point.y};
}
function samples(polygon){
  const points=polygon.map(p=>new T.Vector2(...p));
  return T.ShapeUtils.triangulateShape(points,[]).map(indices=>({x:indices.reduce((n,i)=>n+polygon[i][0],0)/3,y:indices.reduce((n,i)=>n+polygon[i][1],0)/3}));
}
export function verifyRenderedOpening(root,opening,{offset=[0,0,0],floor}={}){
  const candidates=samples(opening.polygon).map(p=>({x:p.x+offset[0],y:p.y+offset[2],elevation:opening.level*2.12})).filter(p=>!floor||floor.polygons.some(poly=>inside(p,poly)));
  if(!candidates.length)throw Error('Access opening misses its source floor: '+opening.floorId);
  for(const point of candidates){
    const obstruction=downHits(root,point).find(hit=>{const part=sourceHit(hit);return part?.role==='floor'&&part.floorId===opening.floorId&&Math.abs(hit.point.y-point.elevation)<.006;});
    if(obstruction)throw Error('Visible source slab still fills access opening '+opening.floorId+' at '+JSON.stringify(point));
  }
  return {floorId:opening.floorId,level:opening.level,samples:candidates.length};
}
export async function verifyAccessGeometry({root,stream,navigation}){
  const openings=[],portals=[],visitCaps=[];
  for(const cap of navigation.visitCaps||[]){
    let count=0;
    for(const p of samples(cap.polygon)){
      const point={x:p.x+navigation.sourceOffset[0],y:p.y+navigation.sourceOffset[2],elevation:cap.level*2.12};stream.update(point);await stream.settled();
      if(!downHits(root,point).some(hit=>sourceHit(hit)?.id===cap.id&&Math.abs(hit.point.y-point.elevation)<.006))throw Error('Derived join cap lacks its actual rendered support: '+cap.id);count++;
    }
    visitCaps.push({id:cap.id,stairId:cap.stairId,area:cap.area,samples:count});
  }
  for(const opening of navigation.accessPlan.floorOpenings){
    const floor=navigation.ceilings.find(floor=>floor.id===opening.floorId&&floor.level===opening.level);
    if(!floor)throw Error('Access opening names an absent source floor: '+opening.floorId);
    const point=samples(opening.polygon)[0],offset=navigation.sourceOffset,player={x:point.x+offset[0],y:point.y+offset[2],elevation:opening.level*2.12};
    stream.update(player);await stream.settled();openings.push(verifyRenderedOpening(root,opening,{offset,floor}));
  }
  for(const portal of navigation.portals){
    if(portal.stateful===false){portals.push({portalId:portal.id,stateful:false,permanentPassage:true});continue;}
    const player={x:portal.position[0],y:portal.position[2],elevation:portal.position[1]};stream.update(player,{portalStates:{}});await stream.settled();root.updateMatrixWorld(true);
    const leaves=[];root.traverse(mesh=>{if(mesh.isInstancedMesh)for(const part of mesh.userData.parts||[])if(part.portalId===portal.id)leaves.push(part);});
    if(!leaves.length)throw Error('No streamed geometry for portal '+portal.id);
    const tests=leaves.map(part=>{
      const centre=new T.Vector3(...part.bounds.min.map((v,i)=>(v+part.bounds.max[i])/2)),normal=new T.Vector3(0,0,1).transformDirection(new T.Matrix4().fromArray(part.matrix));
      return {part,origin:centre.clone().addScaledVector(normal,.4),direction:normal.negate()};
    });
    const cast=record=>new T.Raycaster(record.origin,record.direction,0,.8).intersectObject(root,true).some(hit=>sourceHit(hit)?.id===record.part.id);
    for(const record of tests)if(!cast(record))throw Error('Closed rendered leaf misses its actual source plane: '+record.part.id);
    stream.update(player,{portalStates:{[portal.id]:true}});await stream.settled();root.updateMatrixWorld(true);
    for(const record of tests)if(cast(record))throw Error('Open rendered leaf remains in the closed aperture: '+record.part.id);
    portals.push({portalId:portal.id,leaves:tests.length,closedPlaneSolid:true,openedPlaneClear:true});
  }
  return {openings,portals,visitCaps};
}
