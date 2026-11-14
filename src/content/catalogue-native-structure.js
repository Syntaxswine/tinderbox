import {HOUSING_PLANS} from './housing-plans.js';
import {compileFloorSupport} from './housing-floors.js';
import {housingSectionGrid} from './housing-sections.js';
import {bounds,triangleArea,clipTriangle,dot,sub,mul,unit,cross,overlaps,createBoundaryIndex,extrudePlane,pointOnTriangle,segmentTriangle} from '../../workbenches/furnished-house/geometry.js';
import {supportSurfacesTouch} from '../../workbenches/furnished-house/support.js';

const PITCH=[.5,1.06,.5],EPS=1e-7;
const area=triangles=>triangles.reduce((n,t)=>n+triangleArea(t),0);
const sumFuel=surfaces=>surfaces.reduce((n,s)=>n+(s.fuelAmount||0),0);
const distance=(a,b)=>Math.hypot(...[0,1,2].map(i=>Math.max(a.min[i]-b.max[i],b.min[i]-a.max[i],0)));
const primary=name=>/^(?:Native wall unit|Nautilus cut-end wall panel|Nautilus cut window pier|Native (?:window|door) (?:lintel|sill)|New Victorian window sill|Native closed-door leaf|.*sash glass|New attic sash|New Monroe fanlight|New raised plinth|Basement framing|Porch deck|Porch beam|Turned porch post|Porch post base|Porch capital|Stair tread|New entry stair|.*(?:handrail|stair rail|newel|baluster)|New .*roof.*|New gable infill|New Monroe ornamental front gable|New .*chimney|Chimney cap|Nautilus window \/.*)$/i.test(name);
const glazing=name=>/glass|New Monroe fanlight|New attic sash/i.test(name);
const roofRole=name=>/roof/i.test(name)&&!/bargeboard|edge|fascia/i.test(name);

function summary(surfaces){const result={};for(const s of surfaces){const key=s.fuelClass||'inert:'+s.material,r=result[key]??={sources:0,area:0,fuel:0};r.sources++;r.area+=area(s.triangles);r.fuel+=s.fuelAmount||0;}return result;}

// Representation-only adapter. The full visual/facet source is the immutable
// control: no profile, transport, grid, clock or native visual geometry changes.
export function nativeStructuralSource(full,building){
  if(full.surfaces.some(s=>!s.appearanceId)||full.sourceMeshes.some(m=>!m.nativeTransform))throw Error('Native structural adapter requires measured source metadata');
  const plan=HOUSING_PLANS[building.prefabId],data={...full,surfaces:[],items:[],furnitureParts:[],stores:[],openings:[],runtimeAdaptations:[...full.runtimeAdaptations]},meshes=new Map(full.sourceMeshes.map(m=>[m.id,m])),byMesh=new Map(),bindings=new Map(),structural=[];
  for(const s of full.surfaces)for(const id of s.sourceMeshBindings||[]){if(!byMesh.has(id))byMesh.set(id,[]);byMesh.get(id).push(s);}
  function add(spec){const triangles=spec.triangles.filter(t=>triangleArea(t)>1e-10);if(!triangles.length)return null;const s={level:0,thickness:0,sourceMeshBindings:[],supportSurfaceIds:[],...spec,triangles,bounds:bounds(triangles.flat()),area:area(triangles)};data.surfaces.push(s);return s;}
  function bind(meshId,s){if(!s)return;if(!bindings.has(meshId))bindings.set(meshId,[]);bindings.get(meshId).push(s);s.sourceMeshBindings.push(meshId);}
  const floors=new Set();
  for(const level of [...new Set(full.sourceMeshes.filter(m=>/^Room floor:/.test(m.name)).map(m=>m.level))]){
    const ids=full.sourceMeshes.filter(m=>m.level===level&&/^Room floor:/.test(m.name)).map(m=>m.id),original=ids.flatMap(id=>byMesh.get(id)||[]),total=sumFuel(original),support=compileFloorSupport(plan,level,housingSectionGrid(building.prefabId)),totalArea=support.patches.reduce((n,p)=>n+p.area,0);
    for(const [i,p]of support.patches.entries()){
      const triangles=p.triangles.map(t=>{const q=t.map(([x,z])=>[x,p.y,z]);return cross(sub(q[1],q[0]),sub(q[2],q[0]))[1]<0?[q[0],q[2],q[1]]:q;});
      const s=add({id:`structural-floor/${level}/${i}`,kind:'floor',level,normal:[0,1,0],triangles,material:'timber',fuelClass:'frame',fuelAmount:total*p.area/totalArea,thickness:.12,supports:true,renderAppearanceIds:[...new Set(original.map(s=>s.appearanceId))],nativeRole:'Existing native floor polygon union; actual stair void retained'});structural.push(s);
      for(const id of ids)bind(id,s);
    }
    for(const id of ids)floors.add(id);
  }
  const deferred=[];
  for(const mesh of full.sourceMeshes){
    if(floors.has(mesh.id))continue;const original=byMesh.get(mesh.id)||[];if(!primary(mesh.name)||/bargeboard|edge bargeboard/i.test(mesh.name)){deferred.push({mesh,original});continue;}
    const dimensions=mesh.nativeDimensions,thin=mesh.geometryType==='BoxGeometry'&&dimensions?.length===3?dimensions.map((v,i)=>({v,i})).sort((a,b)=>a.v-b.v):null;
    const panel=thin&&thin[0].v<thin[1].v*.36&&!/plinth|chimney|newel|baluster|post|stair rail|handrail|stair tread|New entry stair/i.test(mesh.name);
    if(panel){
      const axis=thin[0].i,m=mesh.nativeTransform,n=unit([m[axis*4],m[axis*4+1],m[axis*4+2]]),points=original.flatMap(s=>s.triangles.flat()),projections=points.map(p=>dot(p,n)),lo=Math.min(...projections),hi=Math.max(...projections),faces=original.filter(s=>Math.abs(dot(s.normal,n))>.999),face=faces.reduce((a,b)=>!a||b.area>a.area?b:a,null);
      if(!face)throw Error('Native thin panel has no actual face '+mesh.id);
      const inert=original.find(s=>s.material==='masonry')?'masonry':original.every(s=>!s.fuelClass)?face.material:null,classes=new Map();for(const s of original)if(s.fuelClass)classes.set(s.fuelClass,(classes.get(s.fuelClass)||0)+s.fuelAmount);
      const cls=inert?null:[...classes].sort((a,b)=>b[1]-a[1])[0]?.[0],deck=Math.abs(n[1])>.9&&/Porch deck/i.test(mesh.name),plane=deck?Math.max(...points.map(p=>p[1])):(lo+hi)/2;
      const normal=deck?[0,1,0]:n,triangles=face.triangles.map(t=>t.map(p=>deck?[p[0],plane,p[2]]:sub(p,mul(n,dot(p,n)-plane)))),covered=original.filter(s=>s.fuelClass===cls||!s.fuelClass&&s.material===inert),s=add({id:'structural/'+mesh.id,kind:deck?'floor':glazing(mesh.name)?'window':'wall',level:mesh.level??0,normal,triangles,material:inert||'timber',fuelClass:cls||null,fuelAmount:cls?classes.get(cls):0,thickness:hi-lo,supports:deck,renderAppearanceIds:[...new Set(covered.map(s=>s.appearanceId))],nativeRole:mesh.name,nativeWallGroup:mesh.wallGroup});
      bind(mesh.id,s);structural.push(s);
      if(inert==='masonry'){
        const top=original.filter(f=>f.normal[1]>.999);if(top.length)structural.push(add({id:'bearing/'+mesh.id,kind:'plinth',level:mesh.level??0,normal:[0,1,0],triangles:top.flatMap(f=>f.triangles),material:'masonry',fuelClass:null,fuelAmount:0,supports:true,nativeRole:'Actual native masonry top bearing'}));
      }
      const surplus=original.filter(f=>!covered.includes(f));if(surplus.length)deferred.push({mesh,original:surplus,carrier:s});
    }else{
      for(const [i,facet]of original.entries()){
        const kind=glazing(mesh.name)?'window':roofRole(mesh.name)?facet.normal[1]>.2?'roof':'wall':/plinth|chimney|Basement framing/i.test(mesh.name)?'plinth':/Stair tread|New entry stair|Porch deck/i.test(mesh.name)&&facet.normal[1]>.9?'floor':'wall';
        const s=add({...facet,id:'structural/'+mesh.id+'/'+i,kind,level:mesh.level??0,thickness:0,supports:kind==='floor'||kind==='roof'||kind==='plinth'&&facet.normal[1]>.2,sourceMeshBindings:[],renderAppearanceIds:[facet.appearanceId],renderNormal:[...facet.normal],nativeWallGroup:mesh.wallGroup});bind(mesh.id,s);structural.push(s);
      }
    }
  }
  const attachments=new Map(),unresolved=[];
  for(const {mesh,original,carrier:fixed}of deferred){
    let candidates=structural.filter(s=>s&&s.kind!=='window'&&(mesh.wallGroup?s.nativeWallGroup===mesh.wallGroup:true));if(!candidates.length)candidates=structural.filter(s=>s&&s.kind!=='window');
    const carrier=fixed||candidates.reduce((a,b)=>!a||distance(mesh.bounds,b.bounds)<distance(mesh.bounds,a.bounds)?b:a,null);if(!carrier)throw Error('No local structural carrier '+mesh.id);
    const gap=distance(mesh.bounds,carrier.bounds);if(gap>.25)unresolved.push({sourceMeshId:mesh.id,carrierId:carrier.id,gap});
    for(const source of original){const sourceArea=area(source.triangles);for(const triangle of source.triangles){
      const b=bounds(triangle),lo=b.min.map((v,i)=>Math.floor(v/PITCH[i]+EPS)),hi=b.max.map((v,i)=>Math.ceil(v/PITCH[i]-EPS)-1),boundaryPlanes=[];for(let i=0;i<3;i++)if(b.max[i]-b.min[i]<EPS){hi[i]=lo[i];const q=b.min[i]/PITCH[i];if(Math.abs(q-Math.round(q))<EPS)boundaryPlanes.push(i+':'+Math.round(q));}
      for(let z=lo[2];z<=hi[2];z++)for(let y=lo[1];y<=hi[1];y++)for(let x=lo[0];x<=hi[0];x++){
        const cell=[x,y,z],pieces=clipTriangle(triangle,{min:cell.map((v,i)=>v*PITCH[i]),max:cell.map((v,i)=>(v+1)*PITCH[i])}),a=area(pieces);if(a<1e-10)continue;
        // Keep a facet lying exactly on a grid plane separate from a volumetric
        // aggregate. Otherwise a later tolerance clip could count its whole
        // positive area in both adjoining boxes instead of just one.
        const key=[carrier.id,...cell,source.material,source.fuelClass||'',boundaryPlanes.join('/')].join('|');let s=attachments.get(key);
        if(!s){s={id:'detail/'+attachments.size,kind:'attachment',level:mesh.level??carrier.level??0,normal:[...carrier.normal],material:source.material,fuelClass:source.fuelClass,fuelAmount:0,triangles:[],sourceMeshBindings:[],supportSurfaceIds:[carrier.id],attachmentHostSurfaceIds:[carrier.id],connectionTolerance:.015,renderAppearanceIds:[],nativeRole:'Actual native decorative facets coalesced in one physical grid cell',nativeCell:cell,carrierId:carrier.id};attachments.set(key,s);}
        s.triangles.push(...pieces);s.fuelAmount+=(source.fuelAmount||0)*a/sourceArea;if(!s.sourceMeshBindings.includes(mesh.id))s.sourceMeshBindings.push(mesh.id);if(!s.renderAppearanceIds.includes(source.appearanceId))s.renderAppearanceIds.push(source.appearanceId);
      }
    }}
  }
  // Preserve real support paths between detail cells and the actual native
  // carriers. An attachment is supported by the pieces it touches, rather than
  // by an arbitrary scene-wide floor or a non-touching nearest box.
  const primaryShapes=structural.filter(Boolean).map(s=>{const solidTriangles=s.thickness>0?extrudePlane(s.triangles,s.normal,s.kind==='floor'?-s.thickness:-s.thickness/2,s.kind==='floor'?0:s.thickness/2):undefined;return {...s,solidTriangles,bounds:solidTriangles?bounds(solidTriangles.flat()):s.bounds};}),primaryIndex=createBoundaryIndex(primaryShapes),detailCells=new Map();
  for(const s of attachments.values()){s.bounds=bounds(s.triangles.flat());const key=s.nativeCell.join(',');if(!detailCells.has(key))detailCells.set(key,[]);detailCells.get(key).push(s);
    for(const b of primaryIndex.candidates(s.bounds))if(supportSurfacesTouch(s,b)&&!s.attachmentHostSurfaceIds.includes(b.id))s.attachmentHostSurfaceIds.push(b.id);
  }
  const triangleInfo=new WeakMap(),info=t=>{let value=triangleInfo.get(t);if(!value){value={bounds:bounds(t),normal:unit(cross(sub(t[1],t[0]),sub(t[2],t[0])))};triangleInfo.set(t,value);}return value;};
  const actualContact=(a,b)=>{
    if(a.sourceMeshBindings.some(id=>b.sourceMeshBindings.includes(id)))return true;
    for(const t of a.triangles)for(const u of b.triangles){const ti=info(t),ui=info(u);if(!overlaps(ti.bounds,ui.bounds,1e-5))continue;
      if(t.some(p=>Math.abs(dot(sub(p,u[0]),ui.normal))<1e-5&&pointOnTriangle(p,u,1e-5))||u.some(p=>Math.abs(dot(sub(p,t[0]),ti.normal))<1e-5&&pointOnTriangle(p,t,1e-5)))return true;
      for(let i=0;i<3;i++)if(segmentTriangle(t[i],t[(i+1)%3],u)!==null||segmentTriangle(u[i],u[(i+1)%3],t)!==null)return true;
    }return false;
  };
  let detailContactPairs=0;
  for(const a of attachments.values())for(let z=-1;z<=1;z++)for(let y=-1;y<=1;y++)for(let x=-1;x<=1;x++)for(const b of detailCells.get(a.nativeCell.map((v,i)=>v+[x,y,z][i]).join(','))||[]){
    if(a.id>=b.id||!overlaps(a.bounds||bounds(a.triangles.flat()),b.bounds||bounds(b.triangles.flat()),1e-5)||!actualContact(a,b))continue;
    a.attachmentHostSurfaceIds.push(b.id);b.attachmentHostSurfaceIds.push(a.id);detailContactPairs++;
  }
  for(const s of attachments.values())add(s);
  const after=summary(data.surfaces),before=summary(full.surfaces),classes=new Set([...Object.keys(before),...Object.keys(after)]);for(const cls of classes)if(Math.abs((before[cls]?.fuel||0)-(after[cls]?.fuel||0))>1e-5)throw Error('Native finite input changed '+building.id+' '+cls+' '+JSON.stringify({before:before[cls],after:after[cls]}));
  data.runtimeAdaptations.push({id:'native-structural-carriers-v1',description:'Native floor union and thin wall/window carrier planes preserve actual thickness/apertures. Decorative real triangles coalesce only within the same native grid cell/carrier/physical profile; paint appearance is a render binding. Finite prototype fuel by class is conserved. No thermal coefficients imported or changed.'});
  data.sourceRepresentation={version:1,kind:'native-structure',grid:[...PITCH],before,after,detailContactPairs,unresolvedAttachments:unresolved,diagnoses:['Projected carrier area replaces counting both box faces and narrow edges separately; finite prototype quantities are retained.','Source roof/porch/glass roles are explicit; raw facet fallback had classified some as walls.','Actual decorative geometry remains in contact/heat queries; aggregate normals and receiver layout can change transport. No identical fire trajectory is implied.']};
  for(const mesh of data.sourceMeshes)if(!data.surfaces.some(s=>s.sourceMeshBindings.includes(mesh.id)))throw Error('Unowned native render geometry '+mesh.id);
  return data;
}
