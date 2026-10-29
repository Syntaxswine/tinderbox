import fs from 'node:fs';
import path from 'node:path';
import {pathToFileURL} from 'node:url';
import {createHash} from 'node:crypto';
import * as T from '../src/runtime/three.js';
import {createNewYorkStateBuildingTile,TILE_PLAN} from '../assets/art/exposition-new-york-tile/index.js';
import {createAdministrationBuilding,PLAN as ADMIN_PLAN} from '../assets/art/exposition-administration/index.js';
import {createHorticulturalBuilding,PLAN as HORT_PLAN} from '../assets/art/exposition-horticulture/index.js';
import {createHorticultureTerrace} from '../assets/art/exposition-horticulture/terrace.js';
import {sourceParts,geometryData,materialData,colliderGeometryData,axisAlignedBox,portalBounds,topPolygon,subtract,area,floorPrism,batchFloorFragments} from './place-geometry.mjs';
import {normalizeAccessPlan} from './access-plan.mjs';
import {inside} from '../src/runtime/navigation.js';
const accessPath=path.resolve('assets/art/exploration-access/index.js');
const diagnostic=process.argv.includes('--source-only');
if(!diagnostic&&!fs.existsSync(accessPath))throw Error('The frozen artist exploration-access candidate is required before compiling playable places');
const {getAccessPlan,createAccessGeometry}=diagnostic?{
  getAccessPlan:placeId=>({version:1,placeId,portals:[],stairs:[],floorOpenings:[],hiddenSourceParts:[],notes:['Raw source extraction diagnostic; access and traversal are not accepted.']}),
  createAccessGeometry:()=>({root:new T.Group(),setPortalState(){},dispose(){}})
}:await import(pathToFileURL(accessPath));
const intake=JSON.parse(fs.readFileSync('assets/art/places-intake.json'));
if(!diagnostic&&!intake.accessSource?.commit)throw Error('Freeze the exact artist access intake before compiling production scenes');
const output=path.resolve(diagnostic?'artifacts/TB-024/source-sections':'assets/art/place-scenes'),marker='.tinderbox-place-scenes';
if(path.dirname(output)!==path.resolve(diagnostic?'artifacts/TB-024':'assets/art'))throw Error('Unsafe section output');
if(fs.existsSync(output)){
  if(fs.lstatSync(output).isSymbolicLink()||fs.realpathSync(output)!==output||!fs.existsSync(path.join(output,marker)))throw Error('Refusing to replace unowned section output');
  fs.rmSync(output,{recursive:true});
}
fs.mkdirSync(output,{recursive:true});fs.writeFileSync(path.join(output,marker),'Owned generated source sections\n');
fs.writeFileSync(path.join(output,'.gitattributes'),'* -text\n');
const hash=value=>createHash('sha256').update(typeof value==='string'?value:JSON.stringify(value)).digest('hex');
const rect=(x,z,w,d)=>[[x,z],[x+w,z],[x+w,z+d],[x,z+d]];
const reports=[];
for(const spec of [
  {id:'new-york',factory:createNewYorkStateBuildingTile,plan:TILE_PLAN,levels:[1,4],labels:{1:'Main hall',4:'Upper hall'},spawn:[0,0,-12]},
  {id:'administration',factory:createAdministrationBuilding,plan:ADMIN_PLAN,levels:[1,3,5,7,9,19],labels:{1:'Rotunda and ground rooms',3:'Pavilion second floor',5:'Pavilion third floor',7:'Pavilion fourth floor',9:'Lower gallery',19:'Upper gallery'},spawn:[0,0,-10]},
  {id:'horticulture',factory:createHorticulturalBuilding,plan:HORT_PLAN,levels:[1,3],labels:{1:'Garden halls',3:'Gallery'},spawn:[5,2.12,-8]}
]){
  const directory=path.join(output,spec.id);fs.mkdirSync(path.join(directory,'geometry'),{recursive:true});fs.mkdirSync(path.join(directory,'sections'));
  const accessPlan=normalizeAccessPlan(getAccessPlan(spec.id),spec.id),building=spec.factory(T),terrace=spec.id==='horticulture'?createHorticultureTerrace(T):null;
  const access=createAccessGeometry(T,{placeId:spec.id}),roots=[building.root,...(terrace?[terrace.root]:[]),access.root];
  for(const portal of accessPlan.portals)if(portal.stateful)access.setPortalState(portal.id,false);
  const sourceBounds=new T.Box3();for(const root of roots)sourceBounds.union(new T.Box3().setFromObject(root));
  const offset=[Math.ceil(16-sourceBounds.min.x),0,Math.ceil(16-sourceBounds.min.z)],translation=new T.Matrix4().makeTranslation(...offset);
  const width=Math.ceil(sourceBounds.max.x+offset[0]+16),height=Math.ceil(sourceBounds.max.z+offset[2]+16),maxHeight=sourceBounds.max.y;
  const shifted=polygon=>polygon.map(([x,z])=>[x+offset[0],z+offset[2]]);
  const shiftedBox=box=>({min:[box.min.x+offset[0],box.min.y,box.min.z+offset[2]],max:[box.max.x+offset[0],box.max.y,box.max.z+offset[2]]});
  const palette={},geometryFiles={},geometryCache=new WeakMap(),materialCache=new WeakMap(),colliderCache=new WeakMap(),collisionShapes={},chunks=new Map(),blockers=[],treads=[],allParts=[],doorPoses=new Map();
  // Capture actual artist-posed open matrices, rather than inventing a second hinge.
  const closedAccess=new Map();for(const part of sourceParts(access.root)){closedAccess.set(part.id,part.matrix.elements.slice());if(part.temporary)part.geometry.dispose();}
  for(const portal of accessPlan.portals){
    if(!portal.stateful)continue;
    access.setPortalState(portal.id,true);
    for(const part of sourceParts(access.root)){const prior=closedAccess.get(part.id);if(prior&&part.matrix.elements.some((v,i)=>Math.abs(v-prior[i])>1e-8))doorPoses.set(part.id,{portalId:portal.id,matrix:part.matrix.clone()});if(part.temporary)part.geometry.dispose();}
    access.setPortalState(portal.id,false);
  }
  const hidden=new Map(),matchedHidden=new Set();
  for(const record of accessPlan.hiddenSourceParts){
    if(typeof record.source!=='string'||typeof record.id!=='string'||!record.id||record.id.includes('*'))throw Error('Access hiding needs exact source and part IDs: '+spec.id);
    if(!hidden.has(record.source))hidden.set(record.source,new Set());hidden.get(record.source).add(record.id);
  }
  const hide=(source,id)=>{if(!hidden.get(source)?.has(id))return false;matchedHidden.add(source+'/'+id);return true;};
  const openings=accessPlan.floorOpenings||[];
  let sourceCount=0,emittedCount=0,sourceTriangles=0,emittedTriangles=0,cutParts=0;const sourceFloorMaterials=new Map();
  function writeGeometry(data){const text=JSON.stringify(data),id=hash(text);if(!geometryFiles[id]){const file='geometry/'+id+'.json';fs.writeFileSync(path.join(directory,file),text+'\n');geometryFiles[id]=file;}return id;}
  function geometryId(geometry){let id=geometryCache.get(geometry);if(id)return id;id=writeGeometry(geometryData(geometry));geometryCache.set(geometry,id);return id;}
  function materialId(material){let id=materialCache.get(material);if(id)return id;const data=materialData(material);id=hash(data);palette[id]=data;materialCache.set(material,id);return id;}
  function emit(part,fromAccess=false){
    part.geometry.computeBoundingBox();const sourceBox=part.geometry.boundingBox.clone().applyMatrix4(part.matrix),matrix=translation.clone().multiply(part.matrix),box=shiftedBox(sourceBox);
    const pose=doorPoses.get(part.id),openMatrix=pose?translation.clone().multiply(pose.matrix):null;
    const record={id:part.id,geometry:geometryId(part.geometry),material:materialId(part.material),matrix:matrix.elements,role:part.data.role||null,fromAccess,bounds:box,
      ...(pose?{portalId:pose.portalId,openMatrix:openMatrix.elements}:{}),...(part.data.floorId?{floorId:part.data.floorId,level:part.data.level}:{})};
    if(openMatrix){const openBox=part.geometry.boundingBox.clone().applyMatrix4(openMatrix);record.openBounds={min:openBox.min.toArray(),max:openBox.max.toArray()};}
    const centre=[(box.min[0]+box.max[0])/2,(box.min[1]+box.max[1])/2,(box.min[2]+box.max[2])/2],id=[Math.floor(centre[0]/16),Math.floor(centre[2]/16),Math.floor(box.min[1]/2.12+.00001)].join('_');
    if(!chunks.has(id))chunks.set(id,{id,parts:[],bounds:{min:[Infinity,Infinity,Infinity],max:[-Infinity,-Infinity,-Infinity]},triangles:0});
    const chunk=chunks.get(id),triangles=(part.geometry.index?.count||part.geometry.attributes.position.count)/3;chunk.parts.push(record);chunk.triangles+=triangles;
    for(let axis=0;axis<3;axis++){chunk.bounds.min[axis]=Math.min(chunk.bounds.min[axis],box.min[axis],record.openBounds?.min[axis]??Infinity);chunk.bounds.max[axis]=Math.max(chunk.bounds.max[axis],box.max[axis],record.openBounds?.max[axis]??-Infinity);}
    emittedCount++;emittedTriangles+=triangles;allParts.push(record);
    let collision,shape;
    if(part.data.role!=='floor'){
      shape=colliderCache.get(part.geometry);if(!shape){shape=colliderGeometryData(part.geometry);colliderCache.set(part.geometry,shape);}
      if(!axisAlignedBox(shape,matrix.elements)||openMatrix&&!axisAlignedBox(shape,openMatrix.elements)){
        const shapeId=hash(shape);collisionShapes[shapeId]=shape;collision={shapeId,matrix:matrix.elements,...(openMatrix?{openMatrix:openMatrix.elements}:{})};
      }
    }
    const replacesFloor=part.data.role==='floor'&&spec.plan.floors.some(floor=>floor.id===part.data.floorId&&floor.level===part.data.level);
    // Low, unchanged native stone sills are physical step supports, not tall
    // walls. Restrict this to actual closed rectangular source tops within the
    // accepted step height of an occupied floor; no invisible bridge is added.
    if(shape&&!pose&&part.id.endsWith('/sill')&&axisAlignedBox(shape,new T.Matrix4().elements)&&Math.abs(part.matrix.elements[1])+Math.abs(part.matrix.elements[9])+Math.abs(part.matrix.elements[5]-1)<1e-7){
      const centre={x:(sourceBox.min.x+sourceBox.max.x)/2,y:(sourceBox.min.z+sourceBox.max.z)/2},floor=spec.plan.floors.find(floor=>spec.levels.includes(floor.level)&&sourceBox.max.y-floor.level*2.12>.025&&sourceBox.max.y-floor.level*2.12<=.22&&(floor.polygons||[floor.polygon]).some(polygon=>inside(centre,polygon)));
      if(floor){const top=topPolygon(part);treads.push({id:'threshold/'+part.id,polygons:[shifted(top.polygon)],holes:[],height:top.height,bottom:sourceBox.min.y,level:floor.level,label:spec.labels[floor.level]||'Threshold',stairId:'threshold/'+part.id,interior:true});blockers.push({id:part.id,bounds:box,stair:true,...collision});return;}
    }
    if(part.data.role==='stair-tread'||fromAccess&&(['landing','stair-landing','access-landing'].includes(part.data.role)||part.data.role==='floor'&&!replacesFloor)){
      const stair=accessPlan.stairs.find(stair=>stair.id===part.data.stairId||stair.sourcePrefix&&part.id.startsWith(stair.sourcePrefix));
      const exterior=stair?.fromLevel===0||stair?.id.startsWith('admin-upper-')||part.id.startsWith('admin-upper-')||part.id.startsWith('terrace/');
      const top=topPolygon(part);if(top.polygon.length>=3)treads.push({id:'tread/'+part.id,polygons:[shifted(top.polygon)],holes:[],height:top.height,bottom:sourceBox.min.y,level:Math.round(top.height/2.12),label:part.data.role==='stair-tread'?(exterior?'Approach stairs':'Stairs'):'Landing',stairId:stair?.id||part.data.stairId||part.data.accessFloorId||part.id.split('/').slice(0,-1).join('/'),interior:!exterior});
      blockers.push({id:part.id,bounds:box,stair:true,...collision});
    }else if(part.data.role!=='floor'){
      blockers.push({id:part.id,bounds:box,...(part.data.role==='access-support'?{stair:true}:{}),...collision,...(pose?{portalId:pose.portalId,openBounds:record.openBounds}:{})});
    }
  }
  try{
    for(const [source,root]of [[spec.id,building.root],...(terrace?[['horticulture-terrace',terrace.root]]:[]),['exploration-access',access.root]])for(const part of sourceParts(root)){
      sourceCount++;sourceTriangles+=(part.geometry.index?.count||part.geometry.attributes.position.count)/3;
      try{
        if(root===building.root&&part.data.role==='floor')sourceFloorMaterials.set(part.data.floorId,part.material);
        if(root!==access.root&&hide(source,part.id))continue;
        const holes=part.data.role==='floor'?openings.filter(opening=>opening.floorId===part.data.floorId&&opening.level===part.data.level).map(opening=>opening.polygon):[];
        if(holes.length){
          const top=topPolygon(part);let pieces=[top.polygon];for(const hole of holes)pieces=pieces.flatMap(polygon=>subtract(polygon,hole));
          if(Math.abs(pieces.reduce((n,p)=>n+area(p),0)-area(top.polygon))>1e-6){cutParts++;
            for(const [index,polygon]of pieces.entries()){const geometry=floorPrism(polygon,top.height);emit({...part,id:part.id+'/access-cut-'+index,geometry,matrix:new T.Matrix4()},root===access.root);geometry.dispose();}continue;
          }
        }
        emit(part,root===access.root);
      }finally{if(part.temporary)part.geometry.dispose();}
    }
    for(const [source,ids]of hidden)for(const id of ids)if(!matchedHidden.has(source+'/'+id))throw Error('Access hides an absent source part: '+source+'/'+id);
    // The straight side stair touches the curved porch tangentially. Fill only
    // the small boundary wedges between its last tread and the source arc;
    // clipping removes coplanar overlap with the unchanged native porch.
    const visitCaps=[];
    if(spec.id==='new-york')for(const stair of accessPlan.stairs.filter(stair=>stair.id.startsWith('ny-side-approach-'))){
      const a=stair.path[0],b=stair.path.at(-1),dx=Math.sign(b[0]-a[0]),half=stair.width/2;
      let pieces=[[[b[0],b[2]-half],[b[0]+dx,b[2]-half],[b[0]+dx,b[2]+half],[b[0],b[2]+half]]];
      for(const floor of spec.plan.floors.filter(floor=>floor.level===stair.toLevel))for(const polygon of floor.polygons||[floor.polygon])pieces=pieces.flatMap(piece=>subtract(piece,polygon));
      for(const [i,polygon]of pieces.entries())if(area(polygon)>1e-7){
        const floor=spec.plan.floors.find(f=>f.level===stair.toLevel&&f.zone===(dx>0?'porch-west':'porch-east')),material=sourceFloorMaterials.get(floor?.id);
        if(!material)throw Error('Missing source porch material for derived join cap: '+stair.id);
        const id='visit-cap/'+stair.id+'/'+i,geometry=floorPrism(polygon,stair.toY);
        emit({id,geometry,material,matrix:new T.Matrix4(),data:{role:'floor',accessFloorId:id,stairId:stair.id,level:stair.toLevel}},true);geometry.dispose();visitCaps.push({id,stairId:stair.id,level:stair.toLevel,polygon,area:area(polygon),materialSourceFloorId:floor.id});
      }
    }
    const floors=spec.plan.floors.map(floor=>({id:floor.id,polygons:(floor.polygons||[floor.polygon]).map(shifted),holes:[...(floor.holes||[]),...openings.filter(o=>o.floorId===floor.id&&o.level===floor.level).map(o=>o.polygon)].map(shifted),height:floor.level*2.12,level:floor.level,label:spec.labels[floor.level]||floor.id,interior:!['exterior','porch-west','porch-east'].includes(floor.zone)}));
    const terraceSurfaces=terrace?[{id:'waterfront-terrace',polygons:[shifted(terrace.metadata.footprint)],holes:[],height:2.12,level:1,label:'Waterfront terrace',interior:false},...terrace.metadata.approachAprons.map((polygon,i)=>({id:'terrace-apron-'+i,polygons:[shifted(polygon)],holes:[],height:2.12,level:1,label:'Terrace approach',interior:false}))]:[];
    let grounds,water;
    if(terrace){
      const left=offset[0]-153,right=offset[0]+153,front=offset[2]-18,rear=offset[2]+88;
      grounds=[{id:'grounds',polygons:[rect(0,front,left,height-front),rect(right,front,width-right,height-front),rect(left,rear,right-left,height-rear)],holes:[],height:0,level:0,label:'Dry grounds',terrain:true,interior:false}];
      water={x:width/2,y:front/2,width,depth:front,height:0};
    }else grounds=[{id:'grounds',polygons:[rect(0,0,width,height)],holes:[shifted(spec.plan.bodyOutline||spec.plan.body)],height:0,level:0,label:'Grounds',terrain:true,interior:false}];
    const portals=accessPlan.portals.map(portal=>{
      const position=portal.position||portal.anchor;if(!Array.isArray(position)||position.length!==3)throw Error('Portal needs its source-local position: '+portal.id);
      return {id:portal.id,label:portal.label||portal.id,position:[position[0]+offset[0],position[1],position[2]+offset[2]],stateful:portal.stateful,bounds:portal.stateful?portalBounds(allParts,portal.id):null,reach:2.1,initiallyOpen:portal.defaultOpen};
    });
    const worldCamera={followPlayer:true,span:13,phoneSpan:11,maxHeight,overviewBounds:{min:[16,0,16],max:[width-16,3,height-16]}};
    const mapObstacles=spec.plan.runs.map(run=>({id:'plan/'+run.id,x:(run.a[0]+run.b[0])/2+offset[0],y:(run.a[1]+run.b[1])/2+offset[2],
      width:Math.abs(run.b[0]-run.a[0])+.16,depth:Math.abs(run.b[1]-run.a[1])+.16,fromLevel:run.startLevel,toLevel:run.endLevel,navigationOnly:true}));
    const targets=floors.filter(floor=>spec.levels.includes(floor.level)&&(spec.id!=='new-york'||['main-floor','upper-floor','attic-floor'].includes(floor.id))).flatMap(floor=>floor.polygons.map((polygon,i)=>({id:floor.id+'/'+i,label:floor.label,polygon,holes:floor.holes,elevation:floor.height})));
    for(const level of spec.levels)if(!targets.some(target=>Math.abs(target.elevation-level*2.12)<1e-6))throw Error('Required occupied level has no route target: '+spec.id+' L'+level);
    for(const room of spec.plan.rooms||[])targets.push({id:room.id,label:room.label,polygon:shifted(room.polygon),holes:[],elevation:room.level*2.12});
    // Visit both ends of each dry approach through ordinary input. The extra
    // ground point lies beyond the first riser so its feet really reach L0.
    for(const stair of accessPlan.stairs.filter(stair=>stair.fromLevel===0)){
      const a=stair.path[0],b=stair.path.at(-1),length=Math.hypot(b[0]-a[0],b[2]-a[2]),dx=(b[0]-a[0])/length,dz=(b[2]-a[2])/length;
      for(const [suffix,p,h]of [['before-descent',[b[0]+dx,b[2]+dz],stair.toY],['dry-ground',[a[0]-dx,a[2]-dz],stair.fromY],['after-ascent',[b[0]+dx,b[2]+dz],stair.toY]])targets.push({id:stair.id+'/'+suffix,label:stair.id+' '+suffix,polygon:shifted(rect(p[0]-.1,p[1]-.1,.2,.2)),holes:[],elevation:h,...(suffix==='before-descent'?{}:{requiredStair:{id:stair.id,direction:suffix==='dry-ground'?'down':'up',from:stair.fromY,to:stair.toY}})});
    }
    const navigation={version:1,placeId:spec.id,width,height,camera:worldCamera,sourceOffset:offset,spawn:{x:spec.spawn[0]+offset[0],y:spec.spawn[2]+offset[2],elevation:spec.spawn[1]},
      surfaces:[...grounds,...floors.filter(floor=>spec.levels.includes(floor.level)),...terraceSurfaces,...treads],ceilings:floors,blockers,collisionShapes,portals,mapObstacles,targets,accessPlan,visitCaps,occupiedLevels:spec.levels,
      sourceBounds:{min:sourceBounds.min.toArray(),max:sourceBounds.max.toArray()},notes:['Collision and floor-opening adapters preserve raw factories. Dry exterior ground is L0; the native waterfront terrace and its original aprons remain L1.', 'Stair support comes from actual exported tread top polygons, with no floor teleport.',...(spec.id==='new-york'?['New York attic L7 remains closed/unoccupied in this pass. Original attic geometry is preserved; this delivery requires connected L1/L4 only.']:[])]};
    fs.writeFileSync(path.join(directory,'navigation.json'),JSON.stringify(navigation)+'\n');
    const usage=new Map();for(const chunk of chunks.values())for(const part of chunk.parts)usage.set(part.geometry,(usage.get(part.geometry)||0)+1);
    let mergedFloorFragments=0;const used=new Set();
    for(const chunk of chunks.values()){
      const result=batchFloorFragments(chunk.parts,usage,id=>JSON.parse(fs.readFileSync(path.join(directory,geometryFiles[id]))),writeGeometry);chunk.parts=result.parts;mergedFloorFragments+=result.merged;
      for(const part of chunk.parts)used.add(part.geometry);
    }
    for(const id of Object.keys(geometryFiles))if(!used.has(id)){if(!/^[a-f0-9]{64}$/.test(id))throw Error('Unexpected generated geometry key');fs.rmSync(path.join(directory,geometryFiles[id]));delete geometryFiles[id];}
    const sections=[];for(const chunk of [...chunks.values()].sort((a,b)=>a.id.localeCompare(b.id))){const file='sections/'+chunk.id+'.json';fs.writeFileSync(path.join(directory,file),JSON.stringify({parts:chunk.parts})+'\n');sections.push({id:chunk.id,url:file,bounds:chunk.bounds,parts:chunk.parts.length,triangles:chunk.triangles});}
    const manifest={version:1,placeId:spec.id,diagnostic,navigation:'navigation.json',geometryPolicy:'Exact source arrays and native matrices; derived clipped slab boundaries only at access openings. Whole source factories run only offline.',
      sectionSize:16,sourcePins:intake.sources,sourceAccess:intake.accessSource||null,materials:palette,geometries:geometryFiles,chunks:sections,water,
      statistics:{sourceParts:sourceCount,sourceTriangles,emittedParts:emittedCount,renderParts:emittedCount-mergedFloorFragments,mergedFloorFragments,emittedTriangles,sections:sections.length,geometries:Object.keys(geometryFiles).length,cutFloorParts:cutParts,collisionShapes:Object.keys(collisionShapes).length,detailedColliders:blockers.filter(b=>b.shapeId).length,navigationBytes:fs.statSync(path.join(directory,'navigation.json')).size}};
    fs.writeFileSync(path.join(directory,'index.json'),JSON.stringify(manifest)+'\n');reports.push({placeId:spec.id,...manifest.statistics,width,height,occupiedLevels:spec.levels,sourceOffset:offset});
  }finally{access.dispose();terrace?.dispose();building.dispose();}
}
fs.writeFileSync('docs/engineering/explorable-places/'+(diagnostic?'source-section-build.json':'section-build.json'),JSON.stringify({task:'TB-024',diagnostic,sources:intake.sources,accessSource:intake.accessSource||null,reports},null,2)+'\n');
console.log(JSON.stringify({passed:true,reports}));
