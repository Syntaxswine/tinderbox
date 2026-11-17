import test from 'node:test';
import assert from 'node:assert/strict';
import * as T from '../../src/runtime/three.js';
import {encodeMapSources,decodeMapSources,packMapSourceIndex} from '../../src/content/map-source-data.js';
import {createMapSourceGeometry} from '../../src/content/map-source-geometry.js';
import {createTrial} from '../../workbenches/furnished-house/simulation.js';

function fixture({range=false,hardware=false}={}){
  const geometry=new T.BoxGeometry(1,.12,1),raw={attributes:Object.fromEntries(Object.entries(geometry.attributes).map(([name,a])=>[name,a.toJSON()])),index:geometry.index.toJSON()},frame=new T.Matrix4().makeTranslation(5,2.06,7).toArray(),bounds={min:[4.5,2,6.5],max:[5.5,2.12,7.5]};
  const binding={sourcePartId:'floor',partId:'merged-floor',geometryId:'box',appearanceMaterialId:'paint',matrix:frame,bounds,sectionId:'section-1',physicalContribution:'carrier-solid',...(range?{sourceRange:{start:0,count:6}}:{})};
  const carrier={id:'carrier/floor',physicalMaterial:hardware?'metal':'timber',fuelClass:hardware?null:'frame',fuelAmount:hardware?0:1,area:1,thickness:.12,quantityBasis:{rule:range||hardware?'closed-volume':'top-area',closedSourceSolids:true},role:'building-deck',layer:'structure',physicalBounds:bounds,renderBindings:[binding],supportCarrierIds:[],supportEvidence:[],adjacencyCarrierIds:[],anchors:[]};
  if(hardware){carrier.portalId='entry';binding.openMatrix=new T.Matrix4().makeTranslation(4.5,0,6.5).multiply(new T.Matrix4().makeRotationY(Math.PI/2)).multiply(new T.Matrix4().makeTranslation(-4.5,0,-6.5)).multiply(new T.Matrix4().fromArray(frame)).toArray();binding.openBounds={min:[4.5,2,5.5],max:[5.5,2.12,6.5]};}
  const bindings={version:1,placeId:'fixture',coordinateFrame:{frame:'emitted-world',sourceOffsetAlreadyApplied:true},carriers:[carrier],visualOnlyBindings:[],followOwnership:[],coverage:{},unassignedBindings:[]};
  const navigation={placeId:'fixture',sourceBounds:bounds,blockers:[]};
  return {geometry,raw,binding,bindings,navigation,manifest:{placeId:'fixture',materials:{paint:{name:'Native paint',color:0xabcdef}}}};
}
const trialData=()=>({version:1,runtimeAdapterVersion:1,prefabId:'source-fixture',implicitGround:false,sourceBounds:{min:[0,0,0],max:[20,10,20]},gridOrigin:[0,0,0],thermalCell:[.5,1.06,.5],surfaces:[],openings:[],items:[],furnitureParts:[],stores:[],render:{geometry:[],materials:[]},scene:{version:1,instances:[{id:'fixture'}],doors:[]}});

test('compact sources keep local buffers deduplicated and apply the native placement once on demand',()=>{
  const f=fixture(),encoded=encodeMapSources({...f,geometries:{box:f.raw}}),model=decodeMapSources(encoded.index,encoded.library),source=createMapSourceGeometry(model);
  try{
    assert.deepEqual(encoded.library.geometries.box,f.raw);assert.equal(source.metrics().startupWorldShapesExpanded,0);assert.equal(source.metrics().nativeSourceExpansions,0);assert.equal(source.metrics().decodedAttributeGeometries,0);
    const packed=decodeMapSources(JSON.parse(JSON.stringify(packMapSourceIndex(encoded.index))),encoded.library);assert.deepEqual(packed.carriers,model.carriers);assert.deepEqual(packed.parts,model.parts);
    const shape=source.shapeForPart('floor');assert.equal(shape.triangles.length,12);assert.ok(Math.abs(Math.min(...shape.triangles.flat().map(p=>p[0]))-4.5)<1e-7);
    assert.deepEqual(source.near([5,2.1,7],.1),['fixture::carrier/floor']);assert.deepEqual(source.near([50,2.1,7],.1),[]);
    const blueprint=source.sourcesForCarrier('fixture::carrier/floor');assert.equal(blueprint.surfaces.length,1);assert.equal(blueprint.surfaces[0].kind,'floor');assert.equal(blueprint.surfaces[0].fuelAmount,1);
    const render=source.renderGeometry('floor');assert.equal(render.triangles.length,12);assert.deepEqual(render.triangles[0].vertices[0].slice(6,8),f.raw.attributes.uv.array.slice(f.raw.index.array[0]*2,f.raw.index.array[0]*2+2));
  }finally{source.dispose();f.geometry.dispose();}
});

test('a merged logical source range retains its selected original attributes and owns only those triangles',()=>{
  const f=fixture({range:true});try{
    const encoded=encodeMapSources({...f,geometries:{box:f.raw}}),p=encoded.index.parts[0],slice=encoded.library.geometries[p.geometry];assert.equal(slice.index,null);assert.equal(slice.attributes.position.array.length,18);
    for(const [name,a]of Object.entries(f.raw.attributes))assert.deepEqual(slice.attributes[name].array,f.raw.index.array.slice(0,6).flatMap(i=>a.array.slice(i*a.itemSize,(i+1)*a.itemSize)));
    const source=createMapSourceGeometry(decodeMapSources(encoded.index,encoded.library));assert.equal(source.shapeForPart('floor').triangles.length,2);source.dispose();
    f.binding.sourceRange.count=7;assert.throws(()=>encodeMapSources({...f,geometries:{box:f.raw}}),/source range/);
  }finally{f.geometry.dispose();}
});

test('inert door hardware keeps its real thin facets through cold and registered hinge poses',()=>{
  const f=fixture({hardware:true}),encoded=encodeMapSources({...f,geometries:{box:f.raw}}),source=createMapSourceGeometry(decodeMapSources(encoded.index,encoded.library)),trial=createTrial(trialData());
  try{
    const blueprint=source.sourcesForCarrier('fixture::carrier/floor');assert.equal(blueprint.surfaces.reduce((n,s)=>n+s.fuelAmount,0),0);assert.ok(blueprint.surfaces.every(s=>s.nativeInertBody&&s.sourceRigidPose));
    trial.prepareSources(blueprint).commit();for(const o of blueprint.openings)trial.command({type:'opening',id:o.id,open:true});trial.step();
    const actual=[...trial.scene.index.surfaces.values()].flatMap(b=>b.solidTriangles.flat()),expected=source.shapeForPart('floor',true).triangles.flat();
    for(let i=0;i<3;i++){assert.ok(Math.abs(Math.min(...actual.map(p=>p[i]))-Math.min(...expected.map(p=>p[i])))<1e-5);assert.ok(Math.abs(Math.max(...actual.map(p=>p[i]))-Math.max(...expected.map(p=>p[i])))<1e-5);}
    assert.equal(trial.scene.fuels.size,0);assert.equal(trial.metrics().fuel.added,0);
  }finally{trial.dispose();source.dispose();f.geometry.dispose();}
});
