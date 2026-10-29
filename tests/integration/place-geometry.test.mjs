import test from 'node:test';
import assert from 'node:assert/strict';
import * as T from '../../src/runtime/three.js';
import {geometryData,materialData,floorPrism,subtract} from '../../tools/place-geometry.mjs';
import {verifyRenderedOpening,verifyRenderedSupport,verifyAccessGeometry} from '../../tools/place-geometry-checks.mjs';
import {createSectionStreamer} from '../../src/runtime/sections.js';
const outer=[[0,0],[4,0],[4,4],[0,4]],hole=[[1,1],[3,1],[3,3],[1,3]],surface={id:'main',polygons:[outer],holes:[hole],height:2.12,level:1};
function floorScene(polygons){const root=new T.Group(),resources=[];for(const [index,polygon]of polygons.entries()){
  const geometry=floorPrism(polygon,2.12),material=new T.MeshBasicMaterial({side:T.DoubleSide}),mesh=new T.InstancedMesh(geometry,material,1);mesh.setMatrixAt(0,new T.Matrix4());mesh.userData.parts=[{id:'floor-'+index,role:'floor',floorId:'main',level:1,fromAccess:false}];root.add(mesh);resources.push(geometry,material,mesh);
}return{root,dispose:()=>resources.forEach(r=>r.dispose())};}
test('actual rendered slabs must have empty access holes while the remaining floor still supports the player',()=>{
  const opening={floorId:'main',level:1,polygon:hole},whole=floorScene([outer]),cut=floorScene(subtract(outer,hole));
  try{
    assert.throws(()=>verifyRenderedOpening(whole.root,opening,{floor:surface}),/still fills/);
    assert.equal(verifyRenderedOpening(cut.root,opening,{floor:surface}).samples,2);
    assert.ok(Math.abs(verifyRenderedSupport(cut.root,{x:.5,y:2,elevation:2.12},surface).height-2.12)<1e-6);
    assert.throws(()=>verifyRenderedSupport(cut.root,{x:2,y:2,elevation:2.12},surface),/No rendered support/);
    assert.throws(()=>verifyRenderedSupport(cut.root,{x:.5,y:2,elevation:2.2},surface),/No rendered support/);
  }finally{whole.dispose();cut.dispose();}
});
test('actual streamed native leaf moves clear of its closed aperture and a broken open-pose adapter is rejected',async()=>{
  const geometry=new T.BoxGeometry(1,1.65,.12),material=new T.MeshStandardMaterial(),shape=geometryData(geometry),appearance=materialData(material);geometry.dispose();material.dispose();
  for(const movable of [true,false]){
    const root=new T.Group(),closed=new T.Matrix4().makeTranslation(2,1,2),opened=new T.Matrix4().makeRotationY(Math.PI/2);opened.setPosition(1.5,1,2.5);
    const part={id:'leaf',portalId:'entry',geometry:'g',material:'m',matrix:closed.elements,bounds:{min:[1.5,.175,1.94],max:[2.5,1.825,2.06]},...(movable?{openMatrix:opened.elements}:{})};
    const files=new Map([['section.json',{parts:[part]}],['geometry.json',shape]]),manifest={materials:{m:appearance},geometries:{g:'geometry.json'},chunks:[{id:'entry',url:'section.json',bounds:{min:[1,.175,1.5],max:[3,1.825,3]}}]};
    const stream=createSectionStreamer({THREE:T,root,manifest,baseUrl:'https://fixture.invalid/',loadJSON:async url=>files.get(new URL(url).pathname.slice(1))});
    const check=()=>verifyAccessGeometry({root,stream,navigation:{accessPlan:{floorOpenings:[]},portals:[{id:'entry',position:[2,0,2]}]}});
    try{if(movable)assert.equal((await check()).portals[0].openedPlaneClear,true);else await assert.rejects(check(),/remains in the closed aperture/);}finally{stream.dispose();await stream.settled();}
  }
});
