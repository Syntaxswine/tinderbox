import {bounds} from '../../workbenches/furnished-house/geometry.js';
import {sourceSurfaceSpan} from '../../src/content/source-fixed-cell.js';
import {createSharedMapInputFactory} from '../../src/content/shared-map-inputs.js';
import {proof} from './shared-map-input-data.mjs';
export const wallGrid={origin:[0,0,0],pitch:[.5,1.06,.5]};
export function precisionWall({height=2.12,axis='z'}={}){
  const bottom=Math.fround(height),top=Math.fround(height+2),at=(u,y)=>axis==='z'?[u,y,.5]:[.5,y,u],triangles=[[at(.125,bottom),at(.125,top),at(.875,top)],[at(.125,bottom),at(.875,top),at(.875,bottom)]],point=at(.5,height===2.12?bottom:4.239999808371067);
  return {triangles,point,bottom,top,normal:axis==='z'?[0,0,-1]:[1,0,0],cell:axis==='z'?[0,height===2.12?2:4,1]:[1,height===2.12?2:4,0]};
}

// Four independent coplanar source sheets, two original roots and a fitting's
// fixed ALL/upper ports. Literal source tuples are authored independently of
// the mapper; the corrected native-clipped cell is a separate synthetic plan.
export function precisionWallFixture(options){
  const wall=precisionWall(options),ids=['root-a','root-b','fit','upper'],matrix=[1,0,0,0,0,1,0,0,0,0,1,0,0,0,0,1],partBounds=bounds(wall.triangles.flat()),raw=()=>({attributes:{position:{type:'Float32Array',itemSize:3,normalized:false,array:wall.triangles.flat(2)}},index:null});
  const index={version:1,placeId:'precision',sourceOffsetApplied:true,limitations:{},follows:[],carriers:ids.map((id,i)=>({id,material:'timber',role:'synthetic',fuelClass:'frame',fuelAmount:.25,quantityRule:'solid-volume',bounds:partBounds,parts:[i],supports:[],adjacency:[],supportEvidence:[],attachments:[],anchors:[]})),parts:ids.map((id,i)=>({id,carrier:i,geometry:id,appearance:'paint',physical:true,closed:false,matrix:[...matrix],bounds:partBounds}))},library={version:1,placeId:'precision',geometries:Object.fromEntries(ids.map(id=>[id,raw()])),materials:{paint:{}}};
  const navigation={version:1,placeId:'precision',width:2,height:2,sourceBounds:{min:[0,0,0],max:[2,8,2]},occupiedLevels:[0],spawn:{x:0,y:0,elevation:0},surfaces:[{id:'terrain',terrain:true,height:0,polygons:[[[0,0],[2,0],[2,2],[0,2]]]}],ceilings:[],blockers:[],portals:[]};
  const own=partId=>({partId,component:0,primitive:1,point:[...wall.point]}),bond=(id,parent,child)=>({id,kind:'bearing-face',direction:'parent-to-child',proofKind:'bearing-face-v1',proofRef:structuredClone(proof),parent:own(parent),child:own(child)}),approvedBonds=[bond('lower-a','root-a','fit'),bond('lower-b','root-b','fit'),bond('upper-port','fit','upper')],anchors=['root-a','root-b'].map(partId=>({id:partId+'-anchor',partId,component:0,elevation:wall.bottom,proofRef:structuredClone(proof)}));
  const descriptor={version:1,placeId:'precision',sourceRevision:'a'.repeat(64),grid:wallGrid,projections:[],owners:ids.map(id=>({id:'precision::'+id,mode:id==='root-b'?'regional':'whole',fuelAmount:.25,fuelClass:'frame',finish:null,parts:[id]})),parts:ids.map((id,i)=>({id,ownerId:'precision::'+id,globalIndex:i,geometry:id,physicalTriangles:2,bounds:partBounds,static:true,sourceRange:null,lineage:{kind:'original-v1',originalPrimitiveMap:'identity',generatedCaps:[]},surfacePlan:{kind:'existing-blueprint-v1',allocation:'full-canonical-owner',definitions:1,triangles:2,proofRef:structuredClone(proof)}})),support:{bonds:structuredClone(approvedBonds),anchors,requirements:[{id:'all',ownerId:'fit',portIds:['lower-a','lower-b'],upperBondId:'upper-port',excludedDescendantOwners:[]}],rootTraces:['root-a','root-b'].map(id=>({lowerOwnerId:id,status:'reviewed-source-root-trace-v1',proofRef:structuredClone(proof),complete:true,anchorId:id+'-anchor',bondIds:[]}))},pendingAdditions:[]};
  for(const bond of descriptor.support.bonds)for(const side of ['parent','child'])bond[side].bindingPlan={kind:'source-blueprint-original-face-v1',channel:'surface',suffix:'face/0',surfacePoint:[...wall.point],cell:[...wall.cell],nativeRecordId:null,nativeCellId:null,proofRef:structuredClone(proof)};
  const policy={sourceRevision:descriptor.sourceRevision,reviewedRefs:[proof],approvedBonds,approvedAnchors:structuredClone(anchors),approvedProjections:[],requiredModes:Object.fromEntries(descriptor.owners.map(o=>[o.id,o.mode]))},span=sourceSurfaceSpan(wall,wallGrid),logicalCells=4*span.min.reduce((n,v,i)=>n*(span.max[i]-v+1),1);
  if(logicalCells>64)throw Error('Synthetic precision wall cell budget');
  return {index,library,navigation,descriptor,policy,wall,logicalCells,thermalTriangles:8,factory:()=>createSharedMapInputFactory({descriptor,policy})};
}
