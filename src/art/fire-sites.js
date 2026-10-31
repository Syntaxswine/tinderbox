import {housePlanEdges,pointInRoom} from './gross-housing.js';
const EPS=1e-5,MAX_SITES=32;
const finite=Number.isFinite,round=n=>Math.round(n*1e6)/1e6;
const compare=(a,b)=>a.id<b.id?-1:a.id>b.id?1:0;
const visible=(node,root)=>{for(let p=node;p;p=p.parent){if(p.visible===false||p.userData?.destroyed===true)return false;if(p===root)return true;}return false;};
function distributed(items,limit=MAX_SITES){
  const sorted=[...items].sort(compare);if(sorted.length<=limit)return sorted;
  const groups=new Map();for(const item of sorted){const key=item.normal.map(round).join('/');if(!groups.has(key))groups.set(key,[]);groups.get(key).push(item);}
  const selected=[];
  for(const key of [...groups.keys()].sort()){
    const group=groups.get(key),centre=group.reduce((a,item)=>a.map((n,i)=>n+item.position[i]/group.length),[0,0,0]);
    group.sort((a,b)=>a.position.reduce((s,n,i)=>s+(n-centre[i])**2,0)-b.position.reduce((s,n,i)=>s+(n-centre[i])**2,0)||compare(a,b));selected.push(group[0]);
  }
  if(selected.length>limit)return selected.sort(compare).slice(0,limit);
  const chosen=new Set(selected.map(item=>item.id));
  while(selected.length<limit){let best=null,score=-1;
    for(const item of sorted){if(chosen.has(item.id))continue;
      const distance=Math.min(...selected.map(other=>(item.position[0]-other.position[0])**2+(item.position[2]-other.position[2])**2+4*(1-item.normal.reduce((s,n,i)=>s+n*other.normal[i],0))));
      if(distance>score+1e-9){best=item;score=distance;}
    }
    if(!best)break;selected.push(best);chosen.add(best.id);
  }
  return selected.sort(compare);
}
/** A read-only source probe: no geometry/material edits, renderer or gameplay. */
export function createNativeFacadeSource(T,{model,instance}){
  const started=performance.now(),root=model.root,house=model.house,records=[],setupReasons={};
  const reject=reason=>{setupReasons[reason]=(setupReasons[reason]||0)+1;};
  const levels=(model.levels||[]).filter(level=>finite(level.y)&&level.y>=-EPS).sort((a,b)=>a.y-b.y||a.index-b.index),ground=levels[0];
  if(!ground||!house){reject('missing-native-level-or-plan');return {snapshot:()=>({candidates:[],audit:[],diagnostics:{available:false,reason:'Missing native above-grade level/plan',setupMs:performance.now()-started,reasons:{...setupReasons}}})};}
  const floor=ground.index===-1?house.basementFloor:house.floors?.[ground.index];
  const edges=new Map((floor?housePlanEdges(house,floor,{partyWalls:false}):[]).map(edge=>[edge.id,edge]));
  root.updateMatrixWorld(true);
  root.traverse(mesh=>{
    if(!mesh.isMesh)return;
    const role=mesh.userData?.assetRole;
    if(!['Native wall unit','Nautilus cut-end wall panel'].includes(role)||mesh.name!==role){reject('ineligible-source-role');return;}
    let wall=mesh.parent;while(wall&&wall!==root&&!wall.name.startsWith('wall:'))wall=wall.parent;
    let level=wall?.parent;while(level&&level!==root&&!/^Level -?\d+$/.test(level.name))level=level.parent;
    const edge=edges.get(wall?.userData?.edge);
    if(!wall||wall===root||!level||level===root||level.name!=='Level '+ground.index||!edge||wall.name!=='wall:'+edge.id){reject('missing-ground-level-edge-proof');return;}
    if(edge.rooms.length!==1||wall.userData.rooms?.length!==1||wall.userData.rooms[0]!==edge.rooms[0]){reject('interior-or-unproved-room-ownership');return;}
    const dims=mesh.userData.nativeDimensions;
    if(!Array.isArray(dims)||dims.length!==3||!dims.every(finite)||dims[0]<=0||Math.abs(dims[1]-2)>EPS||Math.abs(dims[2]-.16)>EPS){reject('unsupported-native-dimensions');return;}
    const geometry=mesh.geometry,positions=geometry?.getAttribute('position'),index=geometry?.index;
    if(!positions||!geometry.groups?.length){reject('missing-source-face-groups');return;}
    const materials=[mesh.material].flat(),partId=instance.id+'/level:'+ground.index+'/edge:'+encodeURIComponent(edge.id)+'/part:'+encodeURIComponent(role)+'/'+mesh.matrix.toArray().map(round).join(',')+'/'+dims.map(round).join(',');
    for(let groupIndex=0;groupIndex<geometry.groups.length;groupIndex++){
      const group=geometry.groups[groupIndex],material=materials[group.materialIndex];
      if(!material||!['Painted exterior','Brick basement'].includes(material.name))continue;
      const triangles=[];let normal=null,valid=true;
      for(let at=group.start;at+2<group.start+group.count;at+=3){
        const points=[0,1,2].map(j=>new T.Vector3().fromBufferAttribute(positions,index?index.getX(at+j):at+j));
        const n=new T.Vector3().subVectors(points[1],points[0]).cross(new T.Vector3().subVectors(points[2],points[0]));
        if(n.length()<1e-9)continue;n.normalize();
        if(Math.abs(n.y)>.001||normal&&normal.dot(n)<.999){valid=false;break;}normal??=n;
        triangles.push({faceIndex:Math.floor(at/3),points});
      }
      if(!valid||!triangles.length||!normal){reject('nonplanar-or-nonvertical-source-face');continue;}
      const vertices=triangles.flatMap(triangle=>triangle.points),base=Math.min(...vertices.map(p=>p.y)),top=Math.max(...vertices.map(p=>p.y));
      const lower=vertices.filter(p=>Math.abs(p.y-base)<EPS),tangent=new T.Vector3().crossVectors(new T.Vector3(0,1,0),normal).normalize();
      const low=lower.reduce((best,p)=>p.dot(tangent)<best.dot(tangent)?p:best,lower[0]),high=lower.reduce((best,p)=>p.dot(tangent)>best.dot(tangent)?p:best,lower[0]);
      const point=low.clone().add(high).multiplyScalar(.5),triangle=triangles.find(t=>new T.Triangle(...t.points).containsPoint(point));
      const width=Math.max(...vertices.map(p=>p.dot(tangent)))-Math.min(...vertices.map(p=>p.dot(tangent)));
      if(!triangle||width<=EPS||top-base<=EPS){reject('no-proven-lower-face-patch');continue;}
      records.push({mesh,wall,level,geometry,materialIndex:group.materialIndex,point,normal,triangle,width,height:top-base,partId,groupIndex,edge,ground,
        side:Math.abs(edge.a[0]-edge.b[0])<EPS?(Math.abs(edge.a[0])<EPS?'left':Math.abs(edge.a[0]-house.width)<EPS?'right':null):null});
    }
  });
  const setupMs=performance.now()-started;let snapshots=0,totalSnapshotMs=0;
  return {snapshot({joinedSides={}}={}){
    const began=performance.now(),reasons={...setupReasons},candidates=[],audits=new Map(),seen=new Set();snapshots++;
    const count=reason=>{reasons[reason]=(reasons[reason]||0)+1;};root.updateMatrixWorld(true);
    const rootInverse=root.matrixWorld.clone().invert();
    for(const record of records){
      const {mesh,wall,level,geometry,point,normal,triangle,partId}=record;
      if(!visible(mesh,root)){count('hidden-or-destroyed-source-part');continue;}
      if(wall.userData?.edge!==record.edge.id||wall.userData.rooms?.length!==1||wall.userData.rooms[0]!==record.edge.rooms[0]||level.name!=='Level '+ground.index){count('changed-source-ownership');continue;}
      if(record.side&&joinedSides[record.side]){count('joined-party-face');continue;}
      if(mesh.geometry!==geometry){count('changed-source-geometry');continue;}
      const material=[mesh.material].flat()[record.materialIndex];
      if(!material||material.visible===false||!(material.opacity>0)||material.clippingPlanes?.length||!['Painted exterior','Brick basement'].includes(material.name)){count('hidden-or-unproved-source-material');continue;}
      const worldPoint=point.clone().applyMatrix4(mesh.matrixWorld),worldNormal=normal.clone().applyMatrix3(new T.Matrix3().getNormalMatrix(mesh.matrixWorld)).normalize();
      const localPoint=worldPoint.clone().applyMatrix4(rootInverse),outward=worldPoint.clone().addScaledVector(worldNormal,.25).applyMatrix4(rootInverse),inward=worldPoint.clone().addScaledVector(worldNormal,-.25).applyMatrix4(rootInverse);
      if(Math.abs(worldNormal.y)>.001||Math.abs(worldPoint.y-record.ground.y)>EPS||floor.rooms.some(room=>pointInRoom([outward.x,outward.z],room.polygon))||!floor.rooms.some(room=>pointInRoom([inward.x,inward.z],room.polygon))){count('not-proven-ground-exterior-face');continue;}
      const id=partId+'/face:'+triangle.faceIndex;if(seen.has(id)){count('duplicate-source-part-id');continue;}seen.add(id);
      const worldVertices=triangle.points.map(p=>p.clone().applyMatrix4(mesh.matrixWorld));
      const localTangent=new T.Vector3().crossVectors(new T.Vector3(0,1,0),normal).normalize();
      const worldWidth=point.clone().addScaledVector(localTangent,record.width).applyMatrix4(mesh.matrixWorld).distanceTo(worldPoint),worldHeight=point.clone().add(new T.Vector3(0,record.height,0)).applyMatrix4(mesh.matrixWorld).distanceTo(worldPoint);
      const site={id,kind:'facade',position:worldPoint.toArray(),normal:worldNormal.toArray(),baseElevation:worldPoint.y,span:{width:worldWidth,height:worldHeight},sourcePartId:partId,sourceFaceIndex:triangle.faceIndex};
      candidates.push(site);audits.set(id,{id,sourcePartId:partId,sourceFaceIndex:triangle.faceIndex,sourceLevelIndex:ground.index,sourceLevelY:ground.y,sourceEdgeId:record.edge.id,sourceRoomIds:[...record.edge.rooms],sourceRole:mesh.userData.assetRole,sourceLocalMatrix:mesh.matrix.toArray(),sourceNativeDimensions:[...mesh.userData.nativeDimensions],sourceMaterialName:material.name,sourceMaterialIndex:record.materialIndex,sourceFaceVertices:worldVertices.map(p=>p.toArray()),sourceLocalPoint:localPoint.toArray(),sourcePlaneNormal:worldNormal.toArray()});
    }
    const selected=distributed(candidates),elapsed=performance.now()-began;totalSnapshotMs+=elapsed;
    return {candidates:selected,audit:selected.map(site=>audits.get(site.id)),diagnostics:{available:selected.length>0,reason:selected.length?null:'No eligible visible ground-floor exterior native wall face',sourceLevelIndex:ground.index,sourceLevelY:ground.y,rawCandidates:candidates.length,selectedCandidates:selected.length,cap:MAX_SITES,reasons,setupMs,lastSnapshotMs:elapsed,totalSnapshotMs,snapshots,method:'Source wall ownership + actual exterior material/triangle + ground level + plan inside/outside proof; camera independent'}};
  }};
}
