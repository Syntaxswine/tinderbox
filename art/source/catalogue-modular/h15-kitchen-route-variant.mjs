// Additive source-only successor to the immutable 4ce circulation fixture.
import {bounds,triangleArea,intersectFootprint} from '../../../workbenches/furnished-house/geometry.js';
export const KITCHEN_VARIANT_ID='catalogue-h15-circulation-150-kitchen-v2';
export const SETTEE_ID='item/l0/parlor/settee';
export const KITCHEN_ROUTE=[[5,.48,-1],[5,.48,.5],[5,.48,.75],[4,.48,.75],[4,.48,1.8],[3,.48,2],[3,.48,3.5],[3.87125,.48,4.5],[3.87125,.48,5.75]];
const r=n=>Math.round(n*1e7)/1e7,coordKeys=new Set(['min','max','position','initialPosition','centre','center','pivot','base','sourcePosition','outside']);
function translate(value,key=''){
 if(Array.isArray(value)){
  if(coordKeys.has(key)&&value.length===3&&value.every(Number.isFinite))return [r(value[0]-.35),...value.slice(1)];
  if(key==='matrix'&&value.length===16){const result=[...value];result[12]=r(result[12]-.35);return result;}
  if(['polygon','footprint','vertices'].includes(key)&&value.every(p=>Array.isArray(p)&&p.every(Number.isFinite)))return value.map(p=>[r(p[0]-.35),...p.slice(1)]);
  if(key==='triangles'&&value.every(t=>Array.isArray(t)))return value.map(t=>t.map(p=>[r(p[0]-.35),...p.slice(1)]));
  return value.map(v=>translate(v));
 }
 if(value&&typeof value==='object')return Object.fromEntries(Object.entries(value).map(([k,v])=>[k,translate(v,k)]));return value;
}
export function applyH15KitchenRouteVariant(data){
 if(data.navigation.gameAccessVariant.id!=='catalogue-h15-circulation-150-v1')throw Error('Expected immutable 4ce circulation source');
 const before=data.items.find(i=>i.id===SETTEE_ID);if(JSON.stringify(before?.position)!=='[2.85,0.48,0.6]')throw Error('Unexpected native settee control');
 const partIds=new Set(before.partIds),meshIds=new Set(data.furnitureParts.filter(p=>partIds.has(p.id)).map(p=>p.sourceMeshBinding));if(partIds.size!==8||meshIds.size!==8)throw Error('Expected complete eight-part native settee');
 data.items=data.items.map(i=>i.id===SETTEE_ID?translate(i):i);data.furnitureParts=data.furnitureParts.map(p=>partIds.has(p.id)?translate(p):p);data.sourceMeshes=data.sourceMeshes.map(m=>meshIds.has(m.id)?translate(m):m);data.render.geometry=data.render.geometry.map(g=>meshIds.has(g.id)?translate(g):g);
 if(data.surfaces.some(s=>s.sourceMeshBindings.some(id=>meshIds.has(id))))throw Error('Unexpected separate settee structural surface; requires deliberate binding review');
 const item=data.items.find(i=>i.id===SETTEE_ID),floors=data.surfaces.filter(s=>s.kind==='floor'&&s.level===0&&Math.abs(s.bounds.max[1]-.48)<1e-6);
 for(const contact of item.supportContacts){
  let covered=0;contact.supportSurfaceIds=[];
  for(const floor of floors){const clipped=intersectFootprint(contact.polygon,floor.triangles,.48),area=clipped.reduce((sum,t)=>sum+triangleArea(t),0);if(area>1e-9){covered+=area;contact.supportSurfaceIds.push(floor.id);}}
  const expected=contact.polygon.slice(1,-1).reduce((sum,p,i)=>sum+triangleArea([contact.polygon[0],p,contact.polygon[i+2]]),0);
  if(Math.abs(covered-expected)>1e-8||!contact.supportSurfaceIds.length)throw Error('Native settee foot lacks full actual floor bearing: '+contact.id);
 }
 item.supportSurfaceIds=[...new Set(item.supportContacts.flatMap(c=>c.supportSurfaceIds))];for(const p of data.furnitureParts)if(partIds.has(p.id))p.supportSurfaceIds=[...item.supportSurfaceIds];
 const change={id:KITCHEN_VARIANT_ID,previousVariant:'catalogue-h15-circulation-150-v1',control:{commit:'4cecd10d09eff85543996d4362c63b2297001436',path:'workbenches/catalogue-modular/house-data.json',sha256:'c45fc8a1a2aaa1beeacfcb430d259130d34c410ad7ffa34bb5ba703223b9b77c'},runtimeCheckpoint:'8e50a4c0e39a48241001a02f7a29c4193fdd343d',itemId:SETTEE_ID,offset:[-.35,0,0],from:[...before.position],to:[...item.position],movedMeshIds:[...meshIds],supportContactCount:item.supportContacts.length,supportSurfaceIds:[...item.supportSurfaceIds],kitchenRoute:structuredClone(KITCHEN_ROUTE),movableFurniturePassage:{clearWidth:1.395,setteeArmMaxX:3.29,stairPostMinX:4.685,classification:'Movable-furniture passage; not a 1.50 m structural opening',worstBearMargins:{frontParlorPost:.04,setteeArm:.05,lowerLeftStairPost:.025}},structuralClearWidth:1.5,sourceSurfaceFuelDelta:0,furnitureFuelDelta:0,scope:'One rigid native settee placement and kitchen route; all structure, main stair route, paint, UV density, body scale and finite fuel unchanged.'};
 const variant=data.navigation.gameAccessVariant;variant.id=KITCHEN_VARIANT_ID;variant.kitchenCorrection=structuredClone(change);variant.targets.movableFurniturePassage=1.395;
 for(const m of variant.moved)if(meshIds.has(m.id)){m.offset[0]=r(m.offset[0]-.35);m.after=structuredClone(data.sourceMeshes.find(s=>s.id===m.id).bounds);}
 variant.itemMoves.find(m=>m.id===SETTEE_ID).to=[...item.position];
 data.navigation.circulationRoutes.kitchen=structuredClone(KITCHEN_ROUTE);data.navigation.status='Native kitchen-route successor; corrected-world combined acceptance pending';data.navigation.routeLimitations.push('Movable settee passage is 1.395 m; structural 1.50 m rules remain. Prior JPGs show the pre-shift settee.');
 data.componentRegistration.accessVariant.id=KITCHEN_VARIANT_ID;data.componentRegistration.accessVariant.kitchenCorrection=structuredClone(change);
 data.adaptations.push(KITCHEN_VARIANT_ID+': accepted whole-settee rigid shift -0.35 m X and nine-point kitchen route with early square turn; all nine contacts bind to actual native floor. Movable furniture passage 1.395 m; structure and native dimensions unchanged.');
 return change;
}
