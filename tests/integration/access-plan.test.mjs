import test from 'node:test';
import assert from 'node:assert/strict';
import {normalizeAccessPlan} from '../../tools/access-plan.mjs';
import {createExploration} from '../../src/runtime/navigation.js';
test('artist sourceFloorId openings normalize explicitly without mutating source or discarding permanent passages',()=>{
  const source={version:1,placeId:'new-york',portals:[{id:'archway',position:[3,0,3],stateful:false,defaultOpen:true},{id:'door',position:[8,0,3],defaultOpen:false}],stairs:[],floorOpenings:[{sourceFloorId:'upper',level:4,polygon:[[1,1],[3,1],[3,3],[1,3]]}],hiddenSourceParts:[]},before=structuredClone(source);
  Object.freeze(source);const plan=normalizeAccessPlan(source,'new-york');assert.equal(plan.floorOpenings[0].floorId,'upper');assert.equal(plan.portals[0].stateful,false);assert.equal(plan.portals[0].defaultOpen,true);assert.equal(plan.portals[1].stateful,true);assert.deepEqual(source,before);
  assert.throws(()=>normalizeAccessPlan({...before,floorOpenings:[{...before.floorOpenings[0],floorId:'wrong'}]},'new-york'),/Conflicting/);assert.throws(()=>normalizeAccessPlan({...before,portals:[{...before.portals[0],defaultOpen:false}]},'new-york'),/permanent passage/);
});
test('permanently open passages expose no close interaction or invented leaf collider',()=>{
  const sim=createExploration({definition:{placeId:'fixture',width:10,height:8,spawn:{x:2,y:3,elevation:0},surfaces:[{id:'ground',height:0,level:0,label:'Grounds',polygons:[[[0,0],[10,0],[10,8],[0,8]]],holes:[]}],ceilings:[],blockers:[],portals:[{id:'passage',position:[3,0,3],stateful:false,initiallyOpen:true,bounds:null,reach:2.1}]},config:{input:{cameraRelative:false}}});
  try{assert.equal(sim.snapshot().player.interaction,null);sim.dispatch({type:'interact'});sim.dispatch({type:'move',x:1,y:0});sim.advance(.25);assert.equal(sim.snapshot().navigation.portalStates.passage,true);assert.ok(sim.snapshot().player.x>2.5);}finally{sim.dispose();}
});
