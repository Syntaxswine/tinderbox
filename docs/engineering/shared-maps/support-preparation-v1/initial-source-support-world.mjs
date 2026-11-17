// Extends the native fixture in source-support.test.mjs from accepted 55cd.
// Input metadata is separate so offline preparation never needs a trial.
import {createTrial} from '../../workbenches/furnished-house/simulation.js';
import {boxTriangles} from '../../src/runtime/native-query-registry.js';
import {createSourceQueryRegistry} from '../../src/runtime/source-query-registry.js';
import {createSourceCarrierLedger} from '../../src/simulation/source-carriers.js';
import {createSourceActivation} from '../../src/simulation/source-activation.js';
import {createSourceSupportGraph} from '../../src/simulation/source-support.js';

export function sourceSupportFixture({door=false,contact=false}={}){
  const box=(min,max)=>({min,max}),floor=box([0,0,0],[4,.12,1]),left=box([.1,contact ? .12 : 1.12,.1],[.3,contact ? .32 : 1.32,.3]),right=box([3.6,contact ? .12 : 1.12,.1],[3.8,contact ? .32 : 1.32,.3]);
  const carriers=[{id:'f::floor',fuelClass:'frame',fuelAmount:4,bounds:floor,anchors:[{kind:'native-ground-contact',elevation:0}],supports:[],supportEvidence:[],attachments:[],adjacency:[],parts:[0]},...[['left',left],['right',right]].map(([name,bounds],i)=>({id:'f::'+name,fuelClass:null,fuelAmount:0,bounds,anchors:[],supports:['f::floor'],supportEvidence:[],attachments:[{parent:'f::floor',kind:'fixed-assembly-mount',childRegion:{bounds},parentRegion:{bounds:box([bounds.min[0],.119,bounds.min[2]],[bounds.max[0],.121,bounds.max[2]])}}],adjacency:[],parts:[i+1]}))];
  const parts=carriers.map(c=>({id:c.id+'/part',carrierId:c.id,geometry:c.id,closed:true,physical:true,bounds:c.bounds,material:c.fuelClass?'timber':'metal'})),library={geometries:Object.fromEntries(parts.map(p=>[p.geometry,{attributes:{position:{array:boxTriangles(p.bounds).flat(2),itemSize:3,type:'Float64Array'}},index:null}]))},model={carriers,parts,library,carrierById:new Map(carriers.map(c=>[c.id,c])),partById:new Map(parts.map(p=>[p.id,p])),...(contact?{index:{contacts:[[0,1],[1,0]]}}:{})};
  const navigation={version:1,placeId:'f',surfaces:[{id:'terrain',terrain:true,height:0,polygons:[[[-1,-1],[5,-1],[5,2],[-1,2]]],holes:[]}],ceilings:[],blockers:[],portals:[],collisionShapes:{}};
  const data={version:1,runtimeAdapterVersion:1,prefabId:'support-fixture',sourceBounds:box([-1,0,-1],[5,4,2]),implicitGround:false,gridOrigin:[0,0,0],thermalCell:[.5,1.06,.5],surfaces:[],openings:[],items:[],furnitureParts:[],stores:[],render:{geometry:[],materials:[]},scene:{version:1,instances:[{id:'f'}],doors:[]}};
  const shapeForPart=id=>{const values=library.geometries[model.partById.get(id).geometry].attributes.position.array,triangles=[];for(let i=0;i<values.length;i+=9)triangles.push([values.slice(i,i+3),values.slice(i+3,i+6),values.slice(i+6,i+9)]);return {triangles,closed:true};};
  const sources={order:id=>carriers.findIndex(c=>c.id===id),near:()=>[],shapeForPart,sourcesForCarrier(id){
    const c=model.carrierById.get(id),p=parts[c.parts[0]],b=c.bounds;
    if(c.fuelClass)return {surfaces:[{id:id+'/top',sourceCarrierId:id,instanceId:'f',sourceMeshBindings:[p.id],kind:'floor',normal:[-0,1,0],thickness:.12,material:'timber',fuelClass:'frame',fuelAmount:4,triangles:[[[0,.12,0],[4,.12,1],[4,.12,0]],[[0,.12,0],[0,.12,1],[4,.12,1]]]}]};
    if(door&&id==='f::right')return {surfaces:[{id:id+'/leaf',sourceCarrierId:id,instanceId:'f',sourceMeshBindings:[p.id],kind:'wall',normal:[0,0,1],thickness:.12,material:'metal',fuelAmount:0,nativeInertBody:true,supports:true,triangles:[[[3.6,1.12,.2],[3.8,1.12,.2],[3.8,1.32,.2]],[[3.6,1.12,.2],[3.8,1.32,.2],[3.6,1.32,.2]]]}],openings:[{id:'right-opening',surfaceId:id+'/leaf',kind:'door',pivot:[3.6,1.12,.2],maxOpenAngle:Math.PI/2}]};
    return {surfaces:boxTriangles(b).map((t,i)=>({id:id+'/face/'+i,sourceCarrierId:id,instanceId:'f',sourceMeshBindings:[p.id],kind:'wall',material:'metal',fuelAmount:0,nativeInertBody:true,supports:true,supportFromMesh:true,triangles:[t],solidTriangles:[t],closedShape:false}))};
  }};
  return {model,data,navigation,sources,shapeForPart};
}

export function sourceSupportWorld(factory=createSourceSupportGraph,options={}){
  return worldFromSourceFixture(sourceSupportFixture(options),factory);
}
export function worldFromSourceFixture(fixture,factory=createSourceSupportGraph){
  const {model,data,navigation,sources,shapeForPart}=fixture;
  const querySource=createSourceQueryRegistry({navigation,parts:model.parts,shapeForPart}),ledger=createSourceCarrierLedger(model.carriers);
  const trial=createTrial(data,{executionCache:true,querySource,supportGraphFactory:scene=>factory({scene,model,querySource})}),activation=createSourceActivation({trial,querySource,ledger,sources});
  return {...fixture,trial,activation,querySource,ledger,dispose(){activation.dispose();trial.dispose();querySource.dispose();ledger.dispose();fixture.extraDispose?.();}};
}
