import test from 'node:test';
import assert from 'node:assert/strict';
import * as T from '../../src/runtime/three.js';
import {createExploration} from '../../src/runtime/navigation.js';
import {CHARACTER_PROFILES} from '../../src/content/characters.js';
import {transformCollisionShape,sweptCylinderClear} from '../../src/runtime/collision.js';
import {colliderGeometryData,axisAlignedBox} from '../../tools/place-geometry.mjs';
const ground={id:'ground',polygons:[[[0,0],[12,0],[12,12],[0,12]]],holes:[],height:0,level:0,label:'Grounds'};
function frameGeometry(){
  const positions=[];for(const [w,h,x,y]of [[1.3,3,-1.35,1.5],[1.3,3,1.35,1.5],[1.4,.7,0,2.65]]){const g=new T.BoxGeometry(w,h,.16).toNonIndexed();g.translate(x,y,0);positions.push(...g.attributes.position.array);g.dispose();}
  const geometry=new T.BufferGeometry();geometry.setAttribute('position',new T.Float32BufferAttribute(positions,3));geometry.computeBoundingBox();return geometry;
}
function definition(geometry,matrix,{characterId='bear',spawn={x:5,y:3,elevation:0},precise=true,height}={}){
  geometry.computeBoundingBox();const bounds=geometry.boundingBox.clone().applyMatrix4(matrix),shape=colliderGeometryData(geometry);
  return {placeId:'retained-source',characterId,body:{...CHARACTER_PROFILES[characterId],...(height?{height}:{})},width:12,height:12,spawn,surfaces:[ground],ceilings:[],portals:[],collisionShapes:precise?{source:shape}:{},blockers:[{id:'source-fragment',bounds:{min:bounds.min.toArray(),max:bounds.max.toArray()},...(precise?{shapeId:'source',matrix:matrix.elements}:{})}]};
}
test('one retained U-frame mesh keeps its real aperture traversable while intact jambs and low lintel remain solid',()=>{
  const geometry=frameGeometry(),matrix=new T.Matrix4().makeTranslation(5,0,6),material=new T.MeshBasicMaterial({side:T.DoubleSide}),mesh=new T.Mesh(geometry,material);mesh.matrixAutoUpdate=false;mesh.matrix.copy(matrix);mesh.updateMatrixWorld(true);
  try{
    assert.equal(new T.Raycaster(new T.Vector3(5,1,3),new T.Vector3(0,0,1),0,6).intersectObject(mesh).length,0);assert.equal(axisAlignedBox(colliderGeometryData(geometry),matrix.elements),false);
    for(const characterId of ['goat','horse','bear'])for(const precise of [false,true]){
      const sim=createExploration({definition:definition(geometry,matrix,{characterId,precise}),config:{input:{cameraRelative:false}}});
      try{sim.dispatch({type:'move',x:0,y:1});for(let i=0;i<180;i++)sim.advance(1/60);assert.equal(sim.snapshot().player.y>8,precise);assert.equal(sim.canStand({x:3.5,y:6},0),false);}finally{sim.dispose();}
    }
    const tall=createExploration({definition:definition(geometry,matrix,{height:2.5}),config:{input:{cameraRelative:false}}});try{tall.dispatch({type:'move',x:0,y:1});tall.advance(.25);for(let i=0;i<180;i++)tall.advance(1/60);assert.ok(tall.snapshot().player.y<6);}finally{tall.dispose();}
  }finally{geometry.dispose();material.dispose();}
});
test('an uncapped clipped pane does not acquire a phantom solid volume across its lower opening',()=>{
  const shape=new T.Shape([new T.Vector2(-2,0),new T.Vector2(-.7,0),new T.Vector2(-.7,2.3),new T.Vector2(.7,2.3),new T.Vector2(.7,0),new T.Vector2(2,0),new T.Vector2(2,3),new T.Vector2(-2,3)]),front=new T.ShapeGeometry(shape),back=front.clone();front.translate(0,0,-.04);back.translate(0,0,.04);
  const positions=[];for(const g of [front,back]){const flat=g.toNonIndexed();positions.push(...flat.attributes.position.array);flat.dispose();g.dispose();}
  const geometry=new T.BufferGeometry();geometry.setAttribute('position',new T.Float32BufferAttribute(positions,3));const data=colliderGeometryData(geometry);assert.equal(data.closed,false);
  const shapeWorld=transformCollisionShape(data,new T.Matrix4().elements);
  assert.equal(sweptCylinderClear({x:0,y:-2},{x:0,y:2},.56,.025,1.68,shapeWorld),true);assert.equal(sweptCylinderClear({x:1.3,y:-2},{x:1.3,y:2},.56,.025,1.68,shapeWorld),false);geometry.dispose();
});
test('native diagonal walls use their oriented source shape and closed solid interiors remain occupied',()=>{
  const wall=new T.BoxGeometry(8,3,.16),matrix=new T.Matrix4().makeRotationY(Math.PI/4);matrix.setPosition(5,1.5,5);
  const data=colliderGeometryData(wall);assert.equal(axisAlignedBox(data,matrix.elements),false);const shape=transformCollisionShape(data,matrix.elements);
  assert.equal(sweptCylinderClear({x:7,y:7},{x:7,y:7},.56,.025,1.68,shape),true);assert.equal(sweptCylinderClear({x:3,y:3},{x:7,y:7},.56,.025,1.68,shape),false);wall.dispose();
  const cylinder=new T.CylinderGeometry(2,2,3,16);cylinder.translate(0,1.5,0);const solid=colliderGeometryData(cylinder);assert.equal(solid.closed,true);const transformed=transformCollisionShape(solid,new T.Matrix4().elements);
  assert.equal(sweptCylinderClear({x:0,y:0},{x:0,y:0},.56,.025,1.68,transformed),false);assert.equal(sweptCylinderClear({x:1.9,y:1.9},{x:1.9,y:1.9},.56,.025,1.68,transformed),true);cylinder.dispose();
});

test('source-shape transforms remain bounded on out-and-back queries and retire on disposal',()=>{
  const geometry=new T.BoxGeometry(1,2,.16),shape=colliderGeometryData(geometry),blockers=[];geometry.dispose();
  for(let i=0;i<6;i++){const matrix=new T.Matrix4().makeRotationY(Math.PI/4);matrix.setPosition(2+i*4,1,3);blockers.push({id:'frame-'+i,shapeId:'shared',matrix:matrix.elements,bounds:{min:[1+i*4,0,2],max:[3+i*4,2,4]}});}
  const sim=createExploration({definition:{placeId:'bounded-collision',width:28,height:6,spawn:{x:.7,y:.7,elevation:0},surfaces:[{...ground,polygons:[[[0,0],[28,0],[28,6],[0,6]]]}],ceilings:[],portals:[],collisionShapes:{shared:shape},blockers},collisionLimits:{shapes:2,triangles:24}});
  try{for(const index of [0,1,2,3,4,5,4,3,2,1,0]){assert.equal(sim.canStand({x:2+index*4,y:3},0),false);const metrics=sim.collisionMetrics();assert.ok(metrics.cachedShapes<=2);assert.ok(metrics.cachedTriangles<=24);}assert.equal(sim.collisionMetrics().peakCachedShapes,2);assert.equal(sim.collisionMetrics().peakCachedTriangles,24);}finally{sim.dispose();}assert.equal(sim.collisionMetrics().cachedShapes,0);assert.equal(sim.collisionMetrics().cachedTriangles,0);
});
