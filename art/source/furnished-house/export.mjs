import fs from 'node:fs';
import path from 'node:path';
import {createHash} from 'node:crypto';
import * as T from '../../../src/runtime/three.js';
import {createHopkinsHouse} from '../../../src/art/hopkins-housing.js';
import {housePlanEdges} from '../../../src/art/gross-housing.js';
import {bounds,normal,triangleArea,polygonTriangles,gridPieces,clipBox,intervalParts,subtractGambrel,subtractBox,nearestSurface,round,add,mul,sub,unit,pointInTriangleXZ,boundsVolume,clip,cross,dot} from './geometry.js';
const BASE='c855e627bdee963e930644839a60c027a03935de',args=new Map(process.argv.slice(2).map(a=>a.replace(/^--/,'').split('='))),isProposal=args.has('proposal-kitchen-return'),proposalCut=Number(args.get('proposal-kitchen-return')??.1),OUT=args.get('output')||'workbenches/furnished-house/house-data.json';
if(!Number.isFinite(proposalCut)||proposalCut<0||proposalCut>.5)throw Error('Invalid proposed return cut');
if(isProposal&&!OUT.replaceAll('\\\\','/').startsWith('artifacts/proposals/'))throw Error('Unaccepted return option must export under artifacts/proposals/');
const SUMMARY=isProposal?path.join(path.dirname(OUT),'export-summary.json'):'art/source/furnished-house/export-summary.json';
const catalogue=JSON.parse(fs.readFileSync('assets/art/hopkins-housing-v1/houses.json')),house=catalogue.houses.find(h=>h.id==='hopkins-4-15');
const model=createHopkinsHouse(T,{catalogue,textures:{}},house.id),sourceMeshes=[],surfaces=[],openings=[],items=[],furnitureParts=[],stores=[],levels=[];
const sourceHashes=['src/art/gross-housing.js','src/art/hopkins-housing.js','src/art/gambrel-roof.js','src/art/nautilus-windows.js','assets/art/hopkins-housing-v1/houses.json','assets/art/hopkins-housing-v1/prefabs/hopkins-4-15.json','src/content/housing-floors.js'].map(path=>{const b=fs.readFileSync(path);return {path,commit:BASE,bytes:b.length,sha256:createHash('sha256').update(b).digest('hex')};});
const routeAdaptations=[],extraGeometry=[],entryTranslation=[-.5,0,0];
function cutNativeBox(source,name,size,position){
 const g=new T.BoxGeometry(...size),p=g.attributes.position,n=g.attributes.normal,uv=[];
 for(let i=0;i<p.count;i++)uv.push(Math.abs(n.getY(i))>.55?p.getX(i):Math.abs(n.getX(i))>.55?p.getZ(i):p.getX(i),Math.abs(n.getY(i))>.55?p.getZ(i):p.getY(i));
 g.setAttribute('grossUV',new T.Float32BufferAttribute(uv,2));extraGeometry.push(g);
 const o=new T.Mesh(g,source.material);o.name=name;o.position.fromArray(position);o.castShadow=o.receiveShadow=true;o.userData={nativeDimensions:size,prototypeAdaptation:true,sourceNativeDimensions:source.userData.nativeDimensions};source.parent.add(o);return o;
}
const routeEdges=new Set(['5,0|6,0']);
const removedWallKeys=new Set(),removedWallRecords=[],removedFloorTriangles=new Map();
const sourceId=new Map(),floorGroups=new Map(),wallGroups=new Map(),meshById=new Map(),matIndex=new Map(),materials=[],raw=new Map();
const slug=s=>s.toLowerCase().replace(/[^a-z0-9]+/g,'-').replace(/^-|-$/g,'');
const r3=v=>v.map(round),triArea=triangles=>triangles.reduce((n,t)=>n+triangleArea(t),0);
function levelOf(o){for(let p=o;p;p=p.parent)if(/^Level /.test(p.name))return Number(p.name.slice(6));return null;}
function wallOf(o){for(let p=o;p;p=p.parent)if(p.name.startsWith('wall:'))return p;return null;}
function materialId(m){
 if(matIndex.has(m))return matIndex.get(m);const id='appearance-'+materials.length;
 const texture={'Painted exterior':'gross-housing-v1/clapboard-ivory-v1.png','Botanical wallpaper':'gross-housing-v1/wallpaper-botanical-v1.png','Oak boards':'gross-housing-v1/floorboards-oak-v1.png','Brick basement':'exposition-skins-v1/brick-sienna-v1.png','Roof covering':'gross-housing-v1/cedar-shingles-v1.png','Gable shingles':'gross-housing-v1/cedar-shingles-v1.png'}[m.name];
 materials.push({id,name:m.name,color:m.color?.getHex()??0xffffff,roughness:m.roughness??.9,metalness:m.metalness??0,texture:texture?'../../assets/art/'+texture:null,repeat:m.name==='Brick basement'?.5:1,physicalUV:true});matIndex.set(m,id);return id;
}
function geometryTriangles(o){
 const g=o.geometry,p=g.attributes.position,n=g.attributes.normal,uv=g.attributes.uv,guv=g.attributes.grossUV||uv,indices=g.index?.array||Array.from({length:p.count},(_,i)=>i),normalMatrix=new T.Matrix3().getNormalMatrix(o.matrixWorld),triangles=[];
 for(let i=0;i<indices.length;i+=3){
  const group=g.groups.find(a=>i>=a.start&&i<a.start+a.count),material=Array.isArray(o.material)?o.material[group?.materialIndex||0]:o.material;
  const vertices=[0,1,2].map(k=>{const j=indices[i+k],q=new T.Vector3().fromBufferAttribute(p,j).applyMatrix4(o.matrixWorld),nn=n?new T.Vector3().fromBufferAttribute(n,j).applyMatrix3(normalMatrix).normalize():new T.Vector3(0,1,0);return [...q.toArray(),...nn.toArray(),uv?.getX(j)||0,uv?.getY(j)||0,guv?.getX(j)||0,guv?.getY(j)||0];});
  if(levelOf(o)===1&&o.name.startsWith('Room floor:')){
   const centre=[0,1,2].map(k=>vertices.reduce((n,v)=>n+v[k],0)/3);
   if(centre[0]>5&&centre[0]<6&&centre[2]>3&&centre[2]<4){removedFloorTriangles.set(JSON.stringify(vertices.map(v=>v.slice(0,3))),vertices.map(v=>v.slice(0,3)));continue;}
  }
  if(triangleArea(vertices.map(v=>v.slice(0,3)))>1e-10)triangles.push({vertices,materialId:materialId(material)});
 }return triangles;
}
function surface(spec){
 spec.triangles=spec.triangles.map(t=>t.map(r3));spec.area=round(triArea(spec.triangles));if(spec.area<1e-8)return null;
 spec.normal=r3(spec.normal||normal(spec.triangles[0]));spec.bounds=spec.bounds||bounds(spec.triangles.flat());spec.bounds={min:r3(spec.bounds.min),max:r3(spec.bounds.max)};
 spec.sourceMeshBindings??=[];spec.supportSurfaceIds??=[];spec.fuelClass??=spec.material==='timber'?(spec.kind==='roof'?'roof':'frame'):null;spec.fuelAmount??=spec.fuelClass?round(spec.area):0;spec.finish??=null;
 surfaces.push(spec);return spec;
}
function visibleHip(poly){
 let polys=[poly];for(const p of house.roofAssembly.pieces)polys=polys.flatMap(v=>subtractGambrel(v,p,house.plinth));
 for(const floor of surfaces.filter(s=>s.kind==='floor'&&(s.level===1||s.supportType==='stair-tread'))){
  const next=[];for(const p of polys){const b=bounds(p);if([0,1,2].some(i=>b.max[i]<floor.bounds.min[i]-1e-7||b.min[i]>floor.bounds.max[i]+1e-7))next.push(p);else next.push(...subtractBox(p,floor.bounds));}polys=next;
 }
 return polys;
}
function rectangle(a,b,y0,y1){
 const q=[[a[0],y0,a[1]],[b[0],y0,b[1]],[b[0],y1,b[1]],[a[0],y1,a[1]]];return polygonTriangles(q);
}
function contactsFor(itemId,partId,polygons,floorY,bottomY,level,start=0){
 const contacts=[];
 for(const [faceIndex,polygon]of polygons.entries()){
  const b=bounds(polygon);
  for(const sid of supportFor(b,level)){
   const support=surfaces.find(s=>s.id===sid);
   for(const triangle of support.triangles){
    let q=polygon.map(p=>[p[0],floorY,p[2]]);const a=triangle[0],b=triangle[1],c=triangle[2],sign=Math.sign((b[0]-a[0])*(c[2]-a[2])-(b[2]-a[2])*(c[0]-a[0]))||1;
    for(let i=0;i<3;i++){const a=triangle[i],b=triangle[(i+1)%3];q=clip(q,v=>sign*((b[0]-a[0])*(v[2]-a[2])-(b[2]-a[2])*(v[0]-a[0])));}
    if(q.length<3||triArea(polygonTriangles(q))<1e-9)continue;
    contacts.push({id:itemId+'/contact/'+(start+contacts.length),sourcePartId:partId,sourceBottomFace:faceIndex,polygon:q.map(r3),measuredBottomY:bottomY,contactY:floorY,gap:round(bottomY-floorY),supportSurfaceIds:[sid],measurement:'Actual downward source facet clipped to the actual floor polygon'});
   }
  }
 }
 return contacts;
}
function supportFor(b,level){
 return surfaces.filter(s=>s.kind==='floor'&&(!s.supportType||s.supportType==='porch-deck')&&s.level===level&&s.bounds.max[0]>b.min[0]+1e-7&&s.bounds.min[0]<b.max[0]-1e-7&&s.bounds.max[2]>b.min[2]+1e-7&&s.bounds.min[2]<b.max[2]-1e-7).map(s=>s.id);
}
try{
 // Authorized composed transom adaptation: native leaf retained, source lintel/header transposed.
 model.root.updateMatrixWorld(true);
 // Complete the source's floating chair/bed foot gaps without changing authored dimensions.
 const dining=model.root.getObjectByName('Level 0').children[1].children.find(g=>g.name==='Furnishing: dining'),chairLegs=[];
 for(const z of [-.65,.65])for(const x of [-.15,.15])for(const dz of [-.15,.15]){
  const g=new T.BoxGeometry(.04,.36,.04),m=dining.children.find(o=>o.name==='Dining leg').material,o=new T.Mesh(g,m);extraGeometry.push(g);o.name='Prototype dining chair leg';o.position.set(x,.18,z+dz);o.castShadow=o.receiveShadow=true;o.userData.nativeDimensions=[.04,.36,.04];o.userData.prototypeAdaptation=true;dining.add(o);chairLegs.push(o.position.toArray());
 }
 const bedFeet=[];model.root.traverse(o=>{if(o.name==='Bed post'){bedFeet.push({baseline:o.position.toArray(),translation:[0,-.01,0]});o.position.y-=.01;}});
 routeAdaptations.push({type:'furniture-contact-completion',chairLegs:{count:8,dimensions:[.04,.36,.04],positions:chairLegs,reason:'The baseline chair seats/backs had no leg geometry.'},bedFeet:{parts:bedFeet,reason:'Seat unchanged native posts on their actual floor instead of leaving the source .01m gap.'},noScaling:true});
 // Authorized minimum stair alcove: remove only interfering whole native wall bays.
 for(const level of [0,1])for(const wall of [...model.root.getObjectByName('Level '+level).children[0].children]){
  if(!wall.name.startsWith('wall:'))continue;const e=housePlanEdges(house,house.floors[level]).find(e=>e.id===wall.userData.edge);if(!e)continue;
  const east=e.a[0]===6&&e.b[0]===6&&Math.min(e.a[1],e.b[1])>=(level===0?3:4)&&Math.max(e.a[1],e.b[1])<=7;
  const west=level===0&&e.a[0]===4&&e.b[0]===4&&Math.min(e.a[1],e.b[1])>=3&&Math.max(e.a[1],e.b[1])<=7;
  const rear=level===1&&e.a[1]===7&&e.b[1]===7&&Math.min(e.a[0],e.b[0])>=5&&Math.max(e.a[0],e.b[0])<=7;
  if(!east&&!west&&!rear)continue;
  removedWallKeys.add(level+'/'+e.id);removedWallRecords.push({level,edgeId:e.id,a:e.a,b:e.b,rooms:e.rooms,kind:e.opening,normal:new T.Vector3(0,0,-1).transformDirection(wall.matrixWorld).toArray(),polygon:[[e.a[0],house.plinth+level*2.12,e.a[1]],[e.b[0],house.plinth+level*2.12,e.b[1]],[e.b[0],house.plinth+level*2.12+2,e.b[1]],[e.a[0],house.plinth+level*2.12+2,e.a[1]]],reason:east?'Clear the actual stair-side/approach wall intrusion':west?'Permit the full-diameter kitchen route around the stair mouth':'Clear the top landing turn and rear lip'});wall.removeFromParent();
 }
 routeAdaptations.push({type:'native-stair-alcove',removedWallBays:removedWallRecords,treadsUnchanged:true,animalUnchanged:true,upperFloorBayRemoved:{polygon:[[5,2.6,3],[6,2.6,3],[6,2.6,4],[5,2.6,4]],area:1,baselineUpperArea:69,prototypeUpperArea:68},reason:'Smallest composed source openings for the 1m-diameter/1.66m-height entrance, kitchen and full stair route; retain the native tread run and top exit into bedroom A.'});
 // Approved minimum end-cut: preserve the bay and end-cut only the stair-side return.
 if(proposalCut){
  const wall=model.root.getObjectByName('Level 0').children[0].children.find(w=>w.userData.edge==='3,5|4,5');if(!wall)throw Error('Missing kitchen return');
  const direction=new T.Vector3(1,0,0).transformDirection(wall.matrixWorld).x>0?1:-1,parts=[];
  for(const o of [...wall.children]){
   if(!['Native wall unit','Interior skirting','Picture rail'].includes(o.name))continue;
   const [w,h,d]=o.userData.nativeDimensions,baseline={position:o.position.toArray(),dimensions:o.userData.nativeDimensions},position=[o.position.x-direction*proposalCut/2,o.position.y,o.position.z];
   const q=cutNativeBox(o,o.name==='Native wall unit'?'Nautilus cut-end wall panel':o.name,[w-proposalCut,h,d],position);
   // Crop at constant physical UV scale, preserving the original piece's phase.
   const uv=q.geometry.attributes.grossUV,p=q.geometry.attributes.position,n=q.geometry.attributes.normal;
   for(let i=0;i<p.count;i++)if(Math.abs(n.getY(i))>.55||Math.abs(n.getX(i))<=.55)uv.setX(i,uv.getX(i)-direction*proposalCut/2);
   parts.push({name:o.name,baseline,position,dimensions:[w-proposalCut,h,d],scale:[1,1,1]});o.removeFromParent();
  }
  routeAdaptations.push({type:isProposal?'proposed-kitchen-return-end-cut':'kitchen-return-end-cut',status:isProposal?'Unaccepted diagnostic option':'Architect-approved minimum end-cut',sourceEdge:'3,5|4,5',cut:proposalCut,nativeBayWidth:1,remainingWidth:1-proposalCut,parts,sourcePolygon:[[3,.48,5],[4,.48,5],[4,2.48,5],[3,2.48,5]],adaptedPolygon:[[3,.48,5],[4-proposalCut,.48,5],[4-proposalCut,2.48,5],[3,2.48,5]],removedPolygon:[[4-proposalCut,.48,5],[4,.48,5],[4,2.48,5],[4-proposalCut,2.48,5]],newelInnerX:4.9275,clearWidth:round(4.9275-(4-proposalCut)),routeCentreX:round((4.9275+4-proposalCut)/2),heightUnchanged:2,wallThicknessUnchanged:.16,textureDensityUnchanged:true,reason:'A directly interfering wall return leaves only.9275m beside the translated source newel. Architect approved the measured.10m end-cut after398 continuous standing-body sweeps, preserving the other.90m and shared native dimensions.'});
 }
 // Retain the living/dining arch, crop only its outboard trim at the actual stair lane.
 const arch=model.root.getObjectByName('Level 0').children[0].children.find(w=>w.userData.edge==='6,6|7,6');if(!arch)throw Error('Missing retained living/dining arch');
 const archParts=[],archDirection=new T.Vector3(1,0,0).transformDirection(arch.matrixWorld).x>0?1:-1;
 for(const o of [...arch.children]){
  if(!['Door casing','Door header'].includes(o.name))continue;
  const box=new T.Box3().setFromObject(o);if(box.min.x>=6-1e-7)continue;
  const baseline={position:o.position.toArray(),dimensions:o.userData.nativeDimensions,bounds:{min:box.min.toArray(),max:box.max.toArray()}};
  if(box.max.x<=6+1e-7){archParts.push({name:o.name,baseline,removed:true,reason:'This complete outboard casing is outside its retained bay and inside the stair lane.'});o.removeFromParent();continue;}
  const cut=6-box.min.x,[w,h,d]=o.userData.nativeDimensions,position=[o.position.x+archDirection*cut/2,o.position.y,o.position.z],q=cutNativeBox(o,o.name,[w-cut,h,d],position),uv=q.geometry.attributes.grossUV,n=q.geometry.attributes.normal;
  for(let i=0;i<n.count;i++)if(Math.abs(n.getY(i))>.55||Math.abs(n.getX(i))<=.55)uv.setX(i,uv.getX(i)+archDirection*cut/2);
  archParts.push({name:o.name,baseline,position,dimensions:[w-cut,h,d],cut,scale:[1,1,1],minimumX:6});o.removeFromParent();
 }
 routeAdaptations.push({type:'stair-lane-retained-arch-trim',sourceEdge:'6,6|7,6',retainedOpening:'living/dining arch',clearBoundaryX:6,parts:archParts,openingUnchanged:true,lintelUnchanged:true,heightUnchanged:true,physicalMaterial:'timber',textureDensityAndPhaseUnchanged:true,reason:'Crop only native fittings protruding across the X6 boundary of the unchanged 1m stair flight. The casing belongs to a retained cross-opening, not a retired stair-side bay.'});
 // Approved minimum furniture/rail translations. Every source dimension remains unchanged.
 const hallConsole=model.root.getObjectByName('Level 0').children[1].children.find(g=>g.name==='Furnishing: hall');
 if(!hallConsole)throw Error('Missing source hall console');
 const consoleBaseline={position:hallConsole.position.toArray(),quaternion:hallConsole.quaternion.toArray(),bounds:new T.Box3().setFromObject(hallConsole)};
 hallConsole.userData.sourceRoomId='hall';hallConsole.userData.sourceFurnitureType='hall';hallConsole.position.set(6.30,.48,5.10);hallConsole.rotation.y=Math.PI/2;
 routeAdaptations.push({type:'relocated-hall-console',sourceRoom:'hall',prototypeRoom:'living',baseline:{position:consoleBaseline.position,quaternion:consoleBaseline.quaternion,bounds:{min:consoleBaseline.bounds.min.toArray(),max:consoleBaseline.bounds.max.toArray()}},position:[6.30,.48,5.10],rotationY:Math.PI/2,reason:'Clear the actual entrance hall using existing supported living-room floor; no furniture scaling.'});
 const upperConsole=model.root.getObjectByName('Level 1').children[1].children.find(g=>g.name==='Furnishing: hall');
 const upperBaseline={position:upperConsole.position.toArray(),quaternion:upperConsole.quaternion.toArray(),bounds:new T.Box3().setFromObject(upperConsole)};
 upperConsole.userData.sourceRoomId='hall';upperConsole.userData.sourceFurnitureType='hall';upperConsole.position.set(6.30,2.60,2.90);upperConsole.rotation.y=Math.PI/2;
 routeAdaptations.push({type:'relocated-upper-console',baseline:{position:upperBaseline.position,quaternion:upperBaseline.quaternion,bounds:{min:upperBaseline.bounds.min.toArray(),max:upperBaseline.bounds.max.toArray()}},position:[6.30,2.60,2.90],rotationY:Math.PI/2,prototypeRoom:'bed-a',reason:'The authorized forward stair notch removes support under one original console leg; preserve the complete source console on actual bedroom floor.'});
 // Centre the native doorway in its two-bay hall, retaining the exterior return wall.
 const entryWall=model.root.getObjectByName('Level 0').children[0].children.find(w=>routeEdges.has(w.userData.edge)),frontInfill=model.root.getObjectByName('Level 0').children[0].children.find(w=>w.userData.edge==='4,0|5,0');
 if(!entryWall||!frontInfill)throw Error('Missing two-bay entrance source');
 const entryBaseline={position:entryWall.position.toArray(),polygon:[[5,.48,0],[6,.48,0],[6,2.48,0],[5,2.48,0]]},infillBaseline=[];
 entryWall.position.x+=entryTranslation[0];
 for(const o of [...frontInfill.children]){
  if(!['Native wall unit','Interior skirting','Picture rail'].includes(o.name))continue;
  infillBaseline.push({name:o.name,position:o.position.toArray(),dimensions:o.userData.nativeDimensions});
  const [w,h,d]=o.userData.nativeDimensions,rebate=.0075,width=.5-rebate;
  cutNativeBox(o,o.name==='Native wall unit'?'Nautilus cut-end wall panel':o.name,[width,h,d],[-.5+width/2,o.position.y,o.position.z]);
  cutNativeBox(o,o.name==='Native wall unit'?'Nautilus cut-end wall panel':o.name,[width,h,d],[1.5-width/2,o.position.y,o.position.z]);o.removeFromParent();
 }
 const ornament=model.root.getObjectByName('Exterior ornament'),porch=house.porch,porchChanges=[];
 for(const o of [...ornament.children]){
  if(o.name==='Entry stair rail'){const baseline=o.position.toArray();o.position.x+=entryTranslation[0];porchChanges.push({name:o.name,baseline,position:o.position.toArray(),translation:entryTranslation});}
  if(o.name==='Porch baluster'&&Math.abs(o.position.x-5)<.65){porchChanges.push({name:o.name,baseline:o.position.toArray(),removed:true});o.removeFromParent();}
 }
 const baluster=ornament.children.find(o=>o.name==='Porch baluster');
 for(let x=porch.x+.2;x<porch.x+porch.width-.1;x+=.22)if(Math.abs(x-5)>=.65&&!ornament.children.some(o=>o.name==='Porch baluster'&&Math.abs(o.position.x-x)<1e-6)){
  const o=baluster.clone();o.position.x=x;ornament.add(o);porchChanges.push({name:o.name,position:o.position.toArray(),nativeDuplicate:true});
 }
 const rails=ornament.children.filter(o=>o.name==='Porch handrail');
 for(const [i,ends]of [[porch.x,4.35],[5.65,porch.x+porch.width]].entries()){
  const o=rails[i],[lo,hi]=ends;porchChanges.push({name:o.name,baseline:{position:o.position.toArray(),dimensions:o.userData.nativeDimensions},adapted:{position:[(lo+hi)/2,o.position.y,o.position.z],dimensions:[hi-lo,.06,.075]},method:'Native section, end-cut/extended by composition at constant texture density'});
  cutNativeBox(o,o.name,[hi-lo,.06,.075],[(lo+hi)/2,o.position.y,o.position.z]);o.removeFromParent();
 }
 routeAdaptations.push({type:'centred-native-entry',source:entryBaseline,translation:entryTranslation,adaptedPolygon:[[4.5,.48,0],[5.5,.48,0],[5.5,2.48,0],[4.5,2.48,0]],infillBaseline,infillPolygons:[[[4,.48,0],[4.4925,.48,0],[4.4925,2.48,0],[4,2.48,0]],[[5.5075,.48,0],[6,.48,0],[6,2.48,0],[5.5075,2.48,0]]],jambRebate:.0075,actualClearWidth:1.015,approachCentreX:5,routeCentreX:5.00375,porchChanges,returnWallPreserved:'6,0|6,1',leafDimensions:[1,1.65,.12],noScaling:true,reason:'The original doorway was flush to the right return, which blocked the full 1m-diameter body despite its jamb width. Centre the complete native assembly and compose two end-cut piers.'});
 const entryTreads=model.root.getObjectByName('Exterior ornament').children.filter(o=>o.name==='New entry stair').sort((a,b)=>a.position.y-b.position.y),entryRecord=[];
 for(let i=0;i<entryTreads.length;i++){
  const o=entryTreads[i],baseline=o.position.toArray(),z0=-3.32+(2*i+.5)*.22;o.position.z=z0;o.position.x+=entryTranslation[0];const twin=o.clone();twin.name='Prototype duplicate entry stair';twin.position.z=z0+.22;twin.userData.prototypeDuplicate=true;o.parent.add(twin);
  entryRecord.push({baseline,positions:[o.position.toArray(),twin.position.toArray()],nativeDimensions:o.userData.nativeDimensions});
 }
 // The raw entry rails had no vertical bearing posts. Compose unchanged sections to the real step/deck.
 const entryRail=ornament.children.find(o=>o.name==='Entry stair rail'),entryRailPosts=[];
 for(const x of [4.41,5.59])for(const [z,bottom,top]of [[-2.66,.32,.75],[-2,.48,1.23]]){
  const g=new T.BoxGeometry(.055,top-bottom,.055),o=new T.Mesh(g,entryRail.material);extraGeometry.push(g);o.name='Prototype entry rail post';o.position.set(x,(bottom+top)/2,z);o.castShadow=o.receiveShadow=true;o.userData={nativeDimensions:[.055,top-bottom,.055],prototypeAdaptation:true};ornament.add(o);entryRailPosts.push({position:o.position.toArray(),dimensions:o.userData.nativeDimensions,bottom,top});
 }
 routeAdaptations.push({type:'entry-rail-bearing-completion',posts:entryRailPosts,noScaling:true,reason:'The baseline inclined rails had no modeled bearing posts. These native-section vertical pieces touch the real approach/deck and rail.'});
 routeAdaptations.push({type:'composed-entry-approach',parts:entryRecord,nativeRunPerBlock:.22,blocks:6,runPerRise:.44,totalRun:1.32,totalRise:.48,railGeometry:'Original upper-flight rails retained; no source part stretched',reason:'Keep the conservative torso clear of the third riser before the first centre-supported step.'});
 const railMoves=[];model.root.traverse(o=>{if(levelOf(o)!==0||!['Stair newel','Stair handrail'].includes(o.name))return;const baseline=o.position.toArray(),left=o.position.x<5.5;o.position.x+=left?-.04:.04;railMoves.push({name:o.name,baseline,position:o.position.toArray(),translation:[left?-.04:.04,0,0]});});
 routeAdaptations.push({type:'translated-stair-rails',parts:railMoves,treadsUnchanged:true,baselineNewelClear:.935,adaptedNewelClear:1.015,remainingLimit:'Stair-side partitions and one fore-lip floor bay are explicitly removed in the same physical data; final continuous route proof remains required.'});
 const routeWalls=[];model.root.traverse(o=>{if(o.name.startsWith('wall:')&&levelOf(o)===0&&routeEdges.has(o.userData.edge))routeWalls.push(o);});
 for(const wall of routeWalls){
  const removed=[];for(const o of [...wall.children])if(['Native door lintel','Door header'].includes(o.name)){
   const b=new T.Box3().setFromObject(o);removed.push({name:o.name,bounds:{min:b.min.toArray(),max:b.max.toArray()},dimensions:o.userData.nativeDimensions});wall.remove(o);
  }
  const oldCasing=wall.children.find(o=>o.name==='Door casing'),g=new T.BoxGeometry(1.14,.08,.21),head=new T.Mesh(g,oldCasing.material);extraGeometry.push(g);head.name='Prototype transposed door header';head.position.set(0,2.04,0);head.castShadow=head.receiveShadow=true;head.userData.prototypeAdaptation=true;wall.add(head);
  const leaf=wall.getObjectByName('Native closed-door leaf'),hinge=leaf.parent,leafBaseline=new T.Box3().setFromObject(leaf);hinge.position.z=-.15;
  routeAdaptations.push({wallEdge:wall.userData.edge,level:0,type:'full-height-transom-frame',baselineClearHeight:1.65,prototypeClearHeight:2,removed,headerBottomY:2.48,headerTopY:2.56,nativeLeafRetained:true,transomAlwaysOpen:true,nominalWidth:1,clearBetweenJambs:1.015,standOffHinge:.15,fullyOpenAngle:Math.PI,beforeHingeStandOffLeafBounds:{min:leafBaseline.min.toArray(),max:leafBaseline.max.toArray()},reason:'Move the hinge outward by native-part translation so a 180-degree leaf clears the wall instead of embedding in it.'});
 }
 // Capture closed native leaf geometry. Opening animation is owned by the frame.
 const authoredDoorAngles=new Map();model.root.traverse(o=>{if(o.children.some(c=>c.name==='Native closed-door leaf')){authoredDoorAngles.set(o,o.rotation.y);o.rotation.y=0;}});
 model.root.updateMatrixWorld(true);
 function walk(o,path='house'){
  const id=path+'/'+slug(o.name||o.type);sourceId.set(o,id);
  if(o.isMesh){const record={id,name:o.name,level:levelOf(o),matrix:o.matrixWorld.toArray().map(round),bounds:bounds(geometryTriangles(o).flatMap(t=>t.vertices.map(v=>v.slice(0,3)))),materialIds:[...new Set(geometryTriangles(o).map(t=>t.materialId))],sourceRole:o.userData.assetRole||null};
   sourceMeshes.push(record);meshById.set(id,o);raw.set(id,geometryTriangles(o));if(o.name.startsWith('Room floor:')){if(!floorGroups.has(record.level))floorGroups.set(record.level,[]);floorGroups.get(record.level).push(record);}
  }
  o.children.forEach((c,i)=>walk(c,id+'/'+i));
 }walk(model.root);
 for(let level=0;level<house.floors.length;level++){
  const floorY=house.plinth+level*2.12,groups=new Map(),floorTriangles=[];
  for(const mesh of floorGroups.get(level))for(const t of raw.get(mesh.id)){
   const xyz=t.vertices.map(v=>v.slice(0,3)),cx=xyz.reduce((n,p)=>n+p[0],0)/3,cz=xyz.reduce((n,p)=>n+p[2],0)/3,key=Math.floor(cx*2+1e-7)+','+Math.floor(cz*2+1e-7);
   if(!groups.has(key))groups.set(key,{triangles:[],bindings:new Set()});const group=groups.get(key);group.triangles.push(xyz);group.bindings.add(mesh.id);floorTriangles.push(xyz);
  }
  for(const [key,g]of groups){const b=bounds(g.triangles.flat());b.min[1]=floorY-.12;b.max[1]=floorY;surface({id:'floor/l'+level+'/'+key,kind:'floor',level,triangles:g.triangles,normal:[0,1,0],thickness:.12,material:'timber',bounds:b,sourceMeshBindings:[...g.bindings],derivedClosedSlab:true,floorY,undersideY:round(floorY-.12),undersideTriangles:g.triangles.map(t=>[...t].reverse().map(p=>[p[0],floorY-.12,p[2]]))});}
  levels.push({id:'level-'+level,index:level,label:house.floors[level].label,floorY:round(floorY),wallTop:round(floorY+2),floorTriangles:floorTriangles.map(t=>t.map(r3)),area:round(triArea(floorTriangles)),stairVoid:level?{min:[5,round(floorY-.12),3],max:[6,round(floorY),7],type:'rear-edge-notch'}:null,rooms:house.floors[level].rooms});
 }
 // Actual solid stair boxes are physical supports, not inferred .12m level slabs.
 for(const record of sourceMeshes.filter(m=>['Stair tread','New entry stair','Prototype duplicate entry stair','Porch deck'].includes(m.name))){
  const b=record.bounds,y=b.max[1],triangles=[[[b.min[0],y,b.min[2]],[b.max[0],y,b.max[2]],[b.max[0],y,b.min[2]]],[[b.min[0],y,b.min[2]],[b.min[0],y,b.max[2]],[b.max[0],y,b.max[2]]]];
  const entry=/entry stair/.test(record.name),porch=record.name==='Porch deck';surface({id:(entry?'entry-step/':porch?'porch/':'stair/')+sourceMeshes.indexOf(record),kind:'floor',supportType:entry?'entry-step':porch?'porch-deck':'stair-tread',level:0,triangles,normal:[0,1,0],thickness:round(b.max[1]-b.min[1]),material:entry?'stone':'timber',bounds:b,sourceMeshBindings:[record.id],fuelClass:entry?null:'frame',fuelAmount:entry?0:porch?8:.25,derivedClosedSlab:false});
 }
 // Derive solid wall patches from the actual source panel boxes, not room cells.
 for(const record of sourceMeshes){
  const o=meshById.get(record.id),wall=wallOf(o);if(!wall)continue;
  if(!wallGroups.has(wall))wallGroups.set(wall,[]);
  const isSolid=/^(Native wall unit|Nautilus cut-end wall panel|Native window sill|New Victorian window sill|Native window lintel|Native door lintel|Nautilus cut window pier|Nautilus cut door pier)$/.test(o.name)||o.userData.group==='walls';
  if(!isSolid)continue;
  const level=record.level,faceNormal=new T.Vector3(0,0,-1).transformDirection(wall.matrixWorld).toArray(),axis=Math.abs(faceNormal[0])>.5?2:0,fixed=axis===0?2:0,b=record.bounds,fixedAt=wall.getWorldPosition(new T.Vector3()).toArray()[fixed],n=surfaces.length;
  for(const [u0,u1]of intervalParts(b.min[axis],b.max[axis],.5))for(const [v0,v1]of intervalParts(b.min[1],b.max[1],1.06,levels[level].floorY)){
   const a=axis===0?[u0,fixedAt]:[fixedAt,u0],c=axis===0?[u1,fixedAt]:[fixedAt,u1],triangles=rectangle(a,c,v0,v1),bb=bounds(triangles.flat());bb.min[fixed]=fixedAt-.08;bb.max[fixed]=fixedAt+.08;
   const s=surface({id:'wall/l'+level+'/'+slug(wall.userData.edge)+'/'+sourceMeshes.indexOf(record)+'/'+round(u0)+'/'+round(v0),kind:'wall',level,triangles,normal:faceNormal,thickness:.16,material:'timber',bounds:bb,sourceMeshBindings:[record.id],roomIds:wall.userData.rooms,exterior:wall.userData.rooms.length===1,fuelClass:wall.userData.rooms.length===1?'clapboard':'partition'});s.supportSurfaceIds=supportFor(s.bounds,level);
  }
  if(!wallGroups.has(wall))wallGroups.set(wall,[]);wallGroups.get(wall).push(...surfaces.slice(n));
 }
 for(let level=0;level<house.floors.length;level++)for(const edge of housePlanEdges(house,house.floors[level]).filter(e=>e.opening)){
  const kind=edge.opening==='entry'?'door':edge.opening,wall=[...wallGroups.keys()].find(w=>levelOf(w)===level&&w.userData.edge===edge.id);
  if(!wall){if(removedWallKeys.has(level+'/'+edge.id))continue;throw Error('Opening wall binding missing '+edge.id);}
  const adapted=level===0&&kind==='door'&&routeEdges.has(edge.id);
  const y=levels[level].floorY,n=new T.Vector3(0,0,-1).transformDirection(wall.matrixWorld).toArray(),span=Math.hypot(edge.b[0]-edge.a[0],edge.b[1]-edge.a[1]),cx=(edge.a[0]+edge.b[0])/2+(adapted?entryTranslation[0]:0),cz=(edge.a[1]+edge.b[1])/2;
  const width=kind==='window'?1:span,bottom=kind==='window'?.35:0,top=kind==='window'?1.55:1.65,tangent=[(edge.b[0]-edge.a[0])/span,(edge.b[1]-edge.a[1])/span];
  const a=[cx-tangent[0]*width/2,cz-tangent[1]*width/2],b=[cx+tangent[0]*width/2,cz+tangent[1]*width/2],triangles=rectangle(a,b,y+bottom,y+top).map(t=>t.map(p=>adapted?add(p,mul(n,.15)):p)),id='opening/l'+level+'/'+slug(edge.id);
  const box=bounds(triangles.flat());for(let i=0;i<3;i++){box.min[i]-=Math.abs(n[i])*.08;box.max[i]+=Math.abs(n[i])*.08;}
  const leaf=wall.getObjectByName('Native closed-door leaf'),hinge=leaf?.parent,pivot=hinge?hinge.getWorldPosition(new T.Vector3()).toArray():[cx,y+bottom,cz],closed=hinge?.matrixWorld.toArray()||new T.Matrix4().makeTranslation(...pivot).toArray(),open=hinge?new T.Matrix4().multiplyMatrices(hinge.matrixWorld,new T.Matrix4().makeRotationY(adapted?Math.PI:Math.PI/2)).toArray():closed;
  const bindings=sourceMeshes.filter(m=>{const o=meshById.get(m.id);return wallOf(o)===wall&&(kind==='window'?/glass/i.test(o.name):leaf&&o.parent===hinge);}).map(m=>m.id);
  surface({id,kind:kind==='arch'?'door':kind,level,triangles,normal:n,thickness:kind==='window'?.035:.12,material:kind==='window'?'glass':kind==='arch'?'air':'timber',bounds:box,sourceMeshBindings:bindings,fuelClass:kind==='door'?'door':null,fuelAmount:kind==='door'?round(width*(top-bottom)*.45):0,openingId:id});
  const sourceBounds=JSON.parse(JSON.stringify(box));if(adapted)for(let i=0;i<3;i++){sourceBounds.min[i]-=entryTranslation[i]+n[i]*.15;sourceBounds.max[i]-=entryTranslation[i]+n[i]*.15;}
  let transomSurfaceId=null;
  if(adapted){transomSurfaceId=id+'/transom';const t=rectangle(a,b,y+1.65,y+2).map(t=>t.map(p=>add(p,mul(n,.15))));surface({id:transomSurfaceId,kind:'door',level,triangles:t,normal:n,thickness:.16,material:'air',sourceMeshBindings:[],fuelClass:null,fuelAmount:0,openingId:id,initialOpenFraction:1,alwaysOpen:true});box.max[1]=round(y+2);}
  openings.push({id,surfaceId:id,transomSurfaceId,baselineBounds:sourceBounds,prototypeAdapted:adapted,clearHeightWhenOpen:adapted?2:top-bottom,leafHeight:kind==='door'?1.65:null,level,kind,entry:edge.opening==='entry',roomIds:edge.rooms,bounds:box,polygon:[triangles[0][0],triangles[0][1],triangles[0][2],triangles[1][2]],pivot:r3(pivot),closedTransform:closed.map(round),openTransform:open.map(round),axis:[0,1,0],maxOpenAngle:adapted?Math.PI:Math.PI/2,authoredOpenAngle:hinge?authoredDoorAngles.get(hinge)||0:0,initialOpenFraction:kind==='arch'?1:0,span,openingWidth:width,bottomY:round(y+bottom),topY:round(y+(adapted?2:top)),normal:r3(n),sourceWallBinding:sourceId.get(wall),sourceMeshBindings:bindings,windowProfile:edge.windowProfile||null,navigationStatus:adapted?'Authorized 2m transom frame; actual leaf-open width and route obstacles remain measured separately':'Measured native opening; no silent widening'});
 }
 for(const e of removedWallRecords){
  const id='prototype/stair-opening/l'+e.level+'/'+slug(e.edgeId),triangles=polygonTriangles(e.polygon),b=bounds(e.polygon);
  surface({id,kind:'door',level:e.level,triangles,normal:e.normal,thickness:.16,material:'air',bounds:b,sourceMeshBindings:[],fuelClass:null,fuelAmount:0,initialOpenFraction:1,alwaysOpen:true,prototypeAdaptation:true,sourceRemovedEdge:e.edgeId});
  openings.push({id,surfaceId:id,level:e.level,kind:'arch',roomIds:e.rooms,bounds:b,polygon:e.polygon,pivot:e.polygon[0],closedTransform:new T.Matrix4().toArray(),openTransform:new T.Matrix4().toArray(),axis:[0,1,0],maxOpenAngle:0,initialOpenFraction:1,span:1,openingWidth:1,bottomY:house.plinth+e.level*2.12,topY:house.plinth+e.level*2.12+2,normal:e.normal,sourceMeshBindings:[],prototypeAdapted:true,alwaysOpen:true,clearHeightWhenOpen:2,navigationStatus:'Authorized composed stair alcove; native wall bay removed and represented by one canonical open boundary'});
 }
 if(proposalCut){
  const id=(isProposal?'proposal/':'prototype/')+'kitchen-return-end-cut',polygon=[[4-proposalCut,.48,5],[4,.48,5],[4,2.48,5],[4-proposalCut,2.48,5]],triangles=polygonTriangles(polygon),normal=[0,0,-1],b=bounds(polygon);
  surface({id,kind:'door',level:0,triangles,normal,thickness:.16,material:'air',bounds:b,sourceMeshBindings:[],fuelClass:null,fuelAmount:0,initialOpenFraction:1,alwaysOpen:true,prototypeAdaptation:true,sourceRemovedEdge:'3,5|4,5'});
  openings.push({id,surfaceId:id,level:0,kind:'arch',roomIds:['parlor','kitchen'],bounds:b,polygon,pivot:polygon[0],closedTransform:new T.Matrix4().toArray(),openTransform:new T.Matrix4().toArray(),axis:[0,1,0],maxOpenAngle:0,initialOpenFraction:1,span:proposalCut,openingWidth:proposalCut,bottomY:.48,topY:2.48,normal,sourceMeshBindings:[],prototypeAdapted:true,alwaysOpen:true,clearHeightWhenOpen:2,navigationStatus:isProposal?'Unaccepted diagnostic return option':'Approved.10m source end-cut; no resized actor or skipped collision'});
 }
 // Preserve the exposed gambrel union; remove only hip faces buried inside it.
 for(const record of sourceMeshes){
  const o=meshById.get(record.id),roof=!!o.userData.roofTile||o.parent.name==='Removable roofs'&&o.name==='New roof envelope',gable=/gable closure/.test(o.name);
  if(!roof&&!gable)continue;
  const grouped=new Map();
  for(const t of raw.get(record.id)){
   let polygons=[t.vertices];if(roof&&!o.userData.roofTile)polygons=visibleHip(t.vertices);
   for(const poly of polygons)for(const p of gridPieces(poly)){
    const tris=polygonTriangles(p).filter(t=>triangleArea(t.map(v=>v.slice(0,3)))>1e-9);if(!tris.length)continue;
    const centre=[0,1,2].map(i=>p.reduce((n,v)=>n+v[i],0)/p.length),nn=normal(tris[0].map(v=>v.slice(0,3))),key=[...centre.map((v,i)=>Math.floor((v-(i===1?.48:0))/(i===1?1.06:.5)+1e-6)),...nn.map(v=>Math.round(v*100))].join(',');
    if(!grouped.has(key))grouped.set(key,[]);grouped.get(key).push(...tris.map(t=>t.map(v=>v.slice(0,3))));
   }
  }
  for(const [key,triangles]of grouped){let nn=normal(triangles[0]);if(roof&&nn[1]<0)nn=nn.map(v=>-v);
   surface({id:(roof?'roof/':'gable/')+sourceMeshes.indexOf(record)+'/'+key,kind:roof?'roof':'wall',level:roof&&!o.userData.roofTile?0:1,triangles,normal:nn,thickness:roof?.06:.16,material:'timber',sourceMeshBindings:[record.id],fuelClass:roof?'roof':'clapboard',exterior:true,derivedExposedUnion:roof&&!o.userData.roofTile});
  }
 }
 // Noncombustible source masonry. Texture or paint never decides fuel.
 for(const record of sourceMeshes.filter(m=>/New raised plinth|New Hopkins brick chimney|Chimney cap/.test(m.name))){
  const grouped=new Map();for(const t of raw.get(record.id)){const xyz=t.vertices.map(v=>v.slice(0,3)),n=normal(xyz),key=n.map(v=>Math.round(v)).join(',');if(!grouped.has(key))grouped.set(key,[]);grouped.get(key).push(xyz);}
  for(const [key,triangles]of grouped)surface({id:'masonry/'+sourceMeshes.indexOf(record)+'/'+key,kind:'plinth',level:record.name==='New raised plinth'?0:1,triangles,normal:normal(triangles[0]),thickness:.12,supports:normal(triangles[0])[1]>.5,inertBearing:true,material:record.name==='New raised plinth'?'stone':'brick',sourceMeshBindings:[record.id],fuelClass:null,fuelAmount:0});
 }
 // Separate real pieces inside the nine procedural furnishing groups.
 const itemMap=new Map();
 model.root.traverse(g=>{
  if(!g.name.startsWith('Furnishing:'))return;const level=levelOf(g),floor=house.floors[level],room=floor.rooms.find(r=>{const x=g.position.x,z=g.position.z,xs=r.polygon.map(p=>p[0]),zs=r.polygon.map(p=>p[1]);return x>=Math.min(...xs)&&x<=Math.max(...xs)&&z>=Math.min(...zs)&&z<=Math.max(...zs);});if(!room)throw Error('Unplaced furnishing');const furnitureType=g.userData.sourceFurnitureType||room.type,sourceRoomId=g.userData.sourceRoomId||room.id;
  for(const o of g.children.filter(c=>c.isMesh)){
   let type=furnitureType==='bedroom'?'bed':furnitureType==='hall'?'console':['sitting','parlor'].includes(furnitureType)?(/rug/i.test(o.name)?'rug':'settee'):furnitureType==='kitchen'?(/stove/i.test(o.name)?'stove':'work-table'):furnitureType==='dining'?(/chair/i.test(o.name)?'chair-'+(o.position.z<0?'north':'south'):'table'):'cabinet';
   const itemId='item/l'+level+'/'+sourceRoomId+'/'+type,record=sourceMeshes.find(m=>m.id===sourceId.get(o)),material=(Array.isArray(o.material)?o.material[0]:o.material).name,physical=/iron/i.test(material)?'iron':/linen|upholstery|rug/i.test(material)?'cloth':'timber';
   if(!itemMap.has(itemId))itemMap.set(itemId,{id:itemId,level,roomId:room.id,sourceRoomId,type,position:g.position.toArray().map(round),quaternion:g.quaternion.toArray().map(round),partIds:[],sourceGroupBinding:sourceId.get(g),supportSurfaceIds:[]});
   const item=itemMap.get(itemId),part={id:itemId+'/'+slug(o.name)+'/'+g.children.indexOf(o),itemId,level,sourceMeshBinding:record.id,matrix:record.matrix,bounds:record.bounds,material:physical,fuelClass:physical==='timber'?'furniture':physical==='cloth'?'cloth':null,fuelAmount:0,finish:null,supportSurfaceIds:supportFor(record.bounds,level),volume:boundsVolume(record.bounds)};
   furnitureParts.push(part);item.partIds.push(part.id);
  }
 });
 for(const item of itemMap.values()){
  const parts=furnitureParts.filter(p=>p.itemId===item.id),points=parts.flatMap(p=>[p.bounds.min,p.bounds.max]);item.bounds=bounds(points);item.supportSurfaceIds=[...new Set(parts.flatMap(p=>p.supportSurfaceIds))];item.footprint=[[item.bounds.min[0],item.bounds.min[2]],[item.bounds.max[0],item.bounds.min[2]],[item.bounds.max[0],item.bounds.max[2]],[item.bounds.min[0],item.bounds.max[2]]];
  for(const material of ['timber','cloth']){const subset=parts.filter(p=>p.material===material),total=subset.reduce((n,p)=>n+p.volume,0);for(const p of subset){p.fuelAmount=round((material==='timber'?1:item.type==='bed'?.6:.3)*p.volume/total);if(material==='timber')p.finish={fuelClass:/parlor|bed-c|dining\/table/.test(item.id)?'lacquer':'varnish',amount:round(.10*p.volume/total),appearance:'Existing wood finish; prototype finite coating, separate from core fuel'};}}
  item.supportContacts=[];
  const floorY=levels[item.level].floorY;
  for(const part of parts)if(part.bounds.min[1]<=floorY+.03){
   const facets=(raw.get(part.sourceMeshBinding)||[]).map(t=>t.vertices.map(v=>v.slice(0,3))).filter(t=>normal(t)[1]<-.5&&t.every(p=>p[1]<=floorY+.03));
   item.supportContacts.push(...contactsFor(item.id,part.id,facets,floorY,part.bounds.min[1],item.level,item.supportContacts.length));
  }
  item.supportSurfaceIds=[...new Set(item.supportContacts.flatMap(c=>c.supportSurfaceIds))];
  item.contactBounds=item.supportContacts.length?bounds(item.supportContacts.flatMap(c=>c.polygon)):null;
  item.supportConvention='Render pivot is not a contact. Release/landing uses surviving part contact polygons against actual support.';
  items.push(item);
 }
 // Actual source support under every patch is explicit.
 for(const s of surfaces)if(!s.supportSurfaceIds.length&&s.kind!=='floor'&&s.kind!=='plinth')s.supportSurfaceIds=supportFor(s.bounds,s.level);
 const parameters={amountUnit:'prototype-fuel-unit',wallFuelPerSquareMetre:1,floorFuelPerSquareMetre:1,roofFuelPerSquareMetre:1,furnitureCorePerItem:1,bedClothPerItem:.6,otherClothPerItem:.3,finishPerTimberItem:.10,oilStore:3,coalStore:1,note:'Finite prototype quantities. Coder owns burn rates, energy, ignition thresholds and support failure. No calibrated real-world masses asserted.'};
 const storeDefinitions=[
  {id:'store/kitchen/oil',kind:'oil',position:[.65,.48,6.65],size:[.42,.56,.34],amount:parameters.oilStore,material:'iron'},
  {id:'store/kitchen/coal',kind:'coal',position:[1.10,.48,8.65],size:[.72,.52,.62],amount:parameters.coalStore,material:'timber'}
 ];
 for(const def of storeDefinitions){
  const [x,y,z]=def.position,[w,h,d]=def.size,b={min:[x-w/2,y,z-d/2],max:[x+w/2,y+h,z+d/2]},supportSurfaceIds=supportFor(b,0),itemId=def.id,partId=def.id+'/contents';
  stores.push({...def,itemId,level:0,bounds:b,amountUnit:parameters.amountUnit,supportSurfaceIds,fuelPartId:partId,prototypePlacement:true});
  items.push({id:itemId,level:0,roomId:'kitchen',type:def.kind+'-store',position:def.position,quaternion:[0,0,0,1],partIds:[partId,def.id+'/container'],bounds:b,supportSurfaceIds,supportContacts:contactsFor(itemId,def.id+'/container',[[[x-(def.kind==='oil'?.20:.35),y,z-(def.kind==='oil'?.16:.30)],[x+(def.kind==='oil'?.20:.35),y,z-(def.kind==='oil'?.16:.30)],[x+(def.kind==='oil'?.20:.35),y,z+(def.kind==='oil'?.16:.30)],[x-(def.kind==='oil'?.20:.35),y,z+(def.kind==='oil'?.16:.30)]]],y,y,0),prototypePlacement:true});
  furnitureParts.push({id:partId,itemId,level:0,sourceMeshBinding:null,matrix:new T.Matrix4().makeTranslation(x,y,z).toArray(),bounds:b,material:def.kind,fuelClass:def.kind,fuelAmount:def.amount,finish:null,supportSurfaceIds,proceduralStoreContents:true},
   {id:def.id+'/container',itemId,level:0,sourceMeshBinding:null,matrix:new T.Matrix4().makeTranslation(x,y,z).toArray(),bounds:b,material:def.material,fuelClass:def.material==='timber'?'furniture':null,fuelAmount:def.material==='timber'?.25:0,finish:null,supportSurfaceIds,proceduralStoreContainer:true});
 }
 // Give every remaining visible timber fitting one finite physical identity.
 // These are exact source solids; attachment support relationships are declared separately.
 const appearanceLayerBindings=[];
 for(const record of sourceMeshes.filter(m=>m.name==='Removable gambrel gable siding')){
  const b=record.bounds,size=b.max.map((v,i)=>v-b.min[i]),axis=size.indexOf(Math.min(...size)),others=[0,1,2].filter(i=>i!==axis),fixed=(b.min[axis]+b.max[axis])/2;
  const hosts=surfaces.filter(s=>s.kind==='wall'&&s.level===1&&Math.abs(s.normal[axis])>.9&&Math.abs(s.triangles[0][0][axis]-fixed)<.10&&others.every(i=>s.bounds.max[i]>b.min[i]+1e-7&&s.bounds.min[i]<b.max[i]-1e-7));
  if(!hosts.length)throw Error('No canonical gable siding host '+record.id);
  for(const s of hosts)s.sourceMeshBindings.push(record.id);
  appearanceLayerBindings.push({sourceMeshId:record.id,sourceSurfaceIds:hosts.map(s=>s.id),normalOffset:round(Math.abs(hosts[0].triangles[0][0][axis]-fixed)),reason:'The source clapboard overlay shares its existing upper wall fuel/support, never a second physical panel.'});
 }
 const physicalMeshes=new Set([...surfaces.flatMap(s=>s.sourceMeshBindings),...furnitureParts.map(p=>p.sourceMeshBinding).filter(Boolean)]);
 const omittedSourceMeshes=sourceMeshes.filter(m=>m.name==='Floor slab rim').map(m=>({id:m.id,reason:'Replaced by the derived closed slab side at the same floor pitch; no duplicate fuel or surface.'}));
 const omittedIds=new Set(omittedSourceMeshes.map(m=>m.id)),attachments=[];
 for(const record of sourceMeshes){
  if(physicalMeshes.has(record.id)||omittedIds.has(record.id)||record.name.startsWith('Room floor:'))continue;
  const o=meshById.get(record.id),triangles=raw.get(record.id).map(t=>t.vertices.map(v=>v.slice(0,3)));if(!triangles.length)continue;
  const appearanceNames=record.materialIds.map(id=>materials.find(m=>m.id===id).name),metal=appearanceNames.some(n=>/iron|brass/i.test(n));
  if(appearanceNames.some(n=>/glass|brick|plinth/i.test(n)))throw Error('Unclassified inert source '+record.id);
  const volume=Math.abs(triangles.reduce((n,t)=>n+dot(t[0],cross(t[1],t[2]))/6,0)),roofTrim=/removable-roofs/.test(record.id),level=record.level??(roofTrim?1:0);
  const a=surface({id:'attachment/'+record.id,kind:'attachment',level,triangles,solidTriangles:triangles,bounds:record.bounds,normal:normal(triangles[0]),thickness:0,material:metal?'iron':'timber',sourceMeshBindings:[record.id],fuelClass:metal?null:'frame',fuelAmount:metal?0:round(Math.max(1e-7,volume)/.12),volume:round(volume),physicalShape:'source-closed-mesh',attachmentType:record.name,presentationKind:roofTrim?'roof':/Stair|entry rail post/i.test(record.name)?'fitting':'wall',supportSurfaceIds:[],connectionTolerance:.015,connectionEvidence:'Prototype joinery; raw visible solid retained. Measured hosts and explicit inferred stair flight are separate from fuel decay.'});attachments.push(a);
 }
 const nearBounds=(a,b,t=.015)=>a.min.every((v,i)=>Math.max(v,b.min[i])-Math.min(a.max[i],b.max[i])<=t);
 for(const a of attachments){
  const wall=wallOf(meshById.get(a.sourceMeshBindings[0])),host=wall?sourceId.get(wall):null;
  a.attachmentHostSurfaceIds=surfaces.filter(s=>s.id!==a.id&&s.material==='timber'&&nearBounds(a.bounds,s.bounds)&&(!host||s.kind==='floor'||s.sourceMeshBindings.some(id=>wallOf(meshById.get(id))===wall))).map(s=>s.id);
  a.supportSurfaceIds=surfaces.filter(s=>s.kind==='floor'&&nearBounds(a.bounds,s.bounds)&&a.bounds.min[1]>=s.bounds.max[1]-.03&&a.bounds.min[1]<=s.bounds.max[1]+.03).map(s=>s.id);
  a.supportBinding={kind:wall?'native-wall-joinery':/Stair/.test(a.attachmentType)?'native-stair-flight':/Porch|porch/.test(a.attachmentType)?'native-porch-joinery':'native-source-contact',hostSurfaceIds:a.attachmentHostSurfaceIds,bearingSurfaceIds:a.supportSurfaceIds,tolerance:.015,inferred:true};
 }
 routeAdaptations.push({type:'explicit-source-fittings',count:attachments.length,physicalMaterial:'timber',fuelClass:'frame',fuelPerCubicMetre:round(1/.12),policy:'One finite amount per exact source fitting; actual closed source mesh is shared by render, thermal and support. Lost support can move remaining fuel independently of its 120ÃƒÆ’Ã‚Â¢ÃƒÂ¢Ã¢â‚¬Å¡Ã‚Â¬ÃƒÂ¢Ã¢â€šÂ¬Ã…â€œ180s nominal burn age.',inferredStairFlight:{treadSurfaceIds:surfaces.filter(s=>s.supportType==='stair-tread').map(s=>s.id),attachmentSurfaceIds:attachments.filter(s=>/Stair/.test(s.attachmentType)).map(s=>s.id),note:'Source tread boxes do not model load-carrying stringers. Runtime owns the declared flight/landing support graph; no invisible floor is introduced.'}});
 const geometry=[];
 for(const record of sourceMeshes){
  const o=meshById.get(record.id);if(o.name.startsWith('Room floor:')||omittedIds.has(record.id))continue;
  let triangles=raw.get(record.id);if(o.parent.name==='Removable roofs'&&o.name==='New roof envelope')triangles=triangles.flatMap(t=>{const polys=visibleHip(t.vertices);return polys.flatMap(poly=>polygonTriangles(poly).map(vertices=>({vertices,materialId:t.materialId})));});
  geometry.push({id:record.id,triangles:triangles.map(t=>({materialId:t.materialId,vertices:t.vertices.map(v=>v.map(round))}))});
 }
 const data={version:1,prefabId:house.id,buildingId:'furnished-hopkins15',units:'metres',sourceCommit:BASE,contractCommit:'3596f41cbeb0a85c648c44b789a838ed5a8dc139',sourceHashes,module:[1,1,2.12],thermalCell:[.5,1.06,.5],gridOrigin:[0,.48,0],levels,surfaces,openings,furnitureParts,items,stores,parameters,sourceMeshes,render:{materials,geometry,omittedSourceMeshes,appearanceLayerBindings,vertexLayout:['x','y','z','nx','ny','nz','u','v','physicalU','physicalV']},
 navigation:{status:'Source baseline measured; centred entry and composed stair opening await continuous coder sweep',nativeDoorHeight:1.65,nativeDoorWidth:1,routeAdaptations,measuredGoat:{samples:404,height:1.649517536,radius:.440155741,scale:[1,1,1],source:'Coder gait measurement'},conservativeProfile:{height:1.66,radius:.5},routeLimitations:['Hall console was explicitly moved to supported living-room floor; baseline and adapted transforms are recorded.','Rail clear width1.015m. Exact interfering stair-side and rear wall bays and one fore-lip floor bay were removed under architect authority; use the physical exported geometry for full route acceptance.','The route leaves use a recorded .15m stand-off and180-degree opening; the native leaf dimensions remain1x1.65x.12m.'],stair:{x:5,z:4,width:1,run:3,rise:2.12},removedFloorTriangles:[...removedFloorTriangles.values()],prototypeRoute:[[5.00375,0,-3.8],[5.00375,.16,-3.10],[5.00375,.32,-2.66],[5.00375,.48,-2.22],[5.00375,.48,-1],[5.00375,.48,1.8],[5.3,.48,3.35],[4.6,.48,3.35],[4.35,.48,3.65],[4.35,.48,5.75],[2.5,.48,6.5],[4.35,.48,5.75],[4.35,.48,3.65],[4.6,.48,3.35],[5.5,.48,3.35],...[...Array(12)].map((_,i)=>[5.5,.48+(i+1)*2.12/12,4+(i+.5)*.25]),[6.0,2.6,6.8],[6.5,2.6,6.4]],noCharacterRescaling:true},
 adaptations:['Closed .12 m floor slab faces are inferred from the real oak support; source surfaces stay at .48 and2.60m.','Only buried hip-roof faces inside the gambrel union are removed; visible native roof forms are retained.','Oil and coal stores are explicit prototype placements; finite quantities and finishes are game parameters.','Canonical wall patches include actual partial opening panels and never fill the stair notch.','Approved stair alcove removes13 directly interfering whole wall bays and one1m2 upper fore-lip floor bay; native treads and animal geometry remain unchanged.'],
 sourceGaps:['Centred entry/jamb rebate and full route await the continuous full-body passage result.','The original floor meshes have no closed slab/ceiling volume.','Some baseline rugs overhang the oak edge; fuel support references use actual overlap, not their rectangular reservation.']};
 if(proposalCut)data.navigation.prototypeRoute=data.navigation.prototypeRoute.map(p=>Math.abs(p[0]-4.35)<1e-6?[round((4.9275+4-proposalCut)/2),p[1],p[2]]:p);
 data.replayTargets={};
 for(const [name,level,position]of [['kitchen',0,[0,1.01,6.25]],['bedroom',1,[0,3.13,5.25]]]){
  const s=surfaces.find(s=>s.kind==='wall'&&s.level===level&&s.exterior&&s.fuelClass==='clapboard'&&position.every((v,i)=>v>=s.bounds.min[i]-1e-6&&v<=s.bounds.max[i]+1e-6));
  if(!s)throw Error('No actual timber for '+name+' target');data.replayTargets[name]={kind:'wall',sourceSurfaceId:s.id,position,normal:s.normal,level,fuelClass:s.fuelClass,description:name==='kitchen'?'West kitchen siding below the upper floor, away from the window':'West bedroom B wall, away from the window'};
 }
 fs.mkdirSync(path.dirname(OUT),{recursive:true});fs.writeFileSync(OUT,JSON.stringify(data)+'\n');
 const summary={levels:levels.map(l=>({id:l.id,floorY:l.floorY,area:l.area})),surfaces:surfaces.length,kinds:surfaces.reduce((n,s)=>(n[s.kind]=(n[s.kind]||0)+1,n),{}),openings:openings.length,items:items.length,furnitureParts:furnitureParts.length,stores:stores.map(s=>({id:s.id,position:s.position,amount:s.amount,supports:s.supportSurfaceIds.length})),sourceMeshes:sourceMeshes.length,renderTriangles:geometry.reduce((n,g)=>n+g.triangles.length,0),bytes:fs.statSync(OUT).size};
 fs.writeFileSync(SUMMARY,JSON.stringify(summary,null,2)+'\n');console.log(JSON.stringify(summary));
}finally{model.dispose();for(const g of extraGeometry)g.dispose();}
