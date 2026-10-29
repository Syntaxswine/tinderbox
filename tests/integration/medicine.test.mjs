import test from 'node:test';
import assert from 'node:assert/strict';
import * as T from '../../src/runtime/three.js';
import {createMedicinePickups} from '../../assets/art/medicine-pickups/index.js';
import {createSimulation} from '../../src/simulation/index.js';
import {viewOf} from '../../src/ui/model.js';

test('one street snapshot drives actual medicine meshes, automatic use events and HUD effects through consumption, pause and reset',()=>{
  const sim=createSimulation({scenario:{width:12,height:8,player:{x:2,y:3,hp:40,tool:'jerry-can'},obstacles:[],actors:[],pickups:[{id:'heal',kind:'healing',x:3,y:3},{id:'powder',kind:'powder',x:4,y:3},{id:'invert',kind:'inversion',x:5,y:3}]},config:{input:{cameraRelative:false},fire:{damagePerSecond:0}}}),art=createMedicinePickups(T);
  const update=s=>{const before=JSON.stringify(s);art.update(s.pickups,{worldTime:s.clocks.world,paused:s.paused});assert.deepEqual(art.root.children.map(c=>c.userData.pickupId).sort(),s.pickups.filter(p=>!p.consumed).map(p=>p.id).sort());assert.equal(JSON.stringify(s),before);return viewOf(s);};
  try{update(sim.snapshot());sim.dispatch({type:'primary',pressed:true});sim.dispatch({type:'aim',x:9,y:3});sim.dispatch({type:'move',x:1,y:0});let s;
    for(let i=0;i<240;i++){s=sim.advance(1/60);const hud=update(s);assert.equal(hud.hp,s.player.hp);assert.equal(hud.effects.powder.active,s.effects.powder.active);assert.equal(hud.effects.inversion.active,s.effects.inversion.active);if(s.pickups.every(p=>p.consumed))break;}
    assert.ok(s.pickups.every(p=>p.consumed));assert.equal(s.events.filter(e=>e.type==='pickup-used').length,3);assert.equal(s.player.hp,75);assert.equal(s.player.pouring,true);assert.equal(s.player.tool,'jerry-can');assert.deepEqual(s.aim,{x:9,y:3});assert.ok(s.player.inventory.gas<4);assert.equal(art.diagnostics().visiblePickups,0);
    sim.dispatch({type:'pause',paused:true});update(sim.advance(1/60));sim.dispatch({type:'reset'});sim.dispatch({type:'pause',paused:true});s=sim.advance(1/60);update(s);assert.equal(art.diagnostics().visiblePickups,3);assert.equal(s.events.filter(e=>e.type==='pickup-used').length,0);
  }finally{sim.dispose();art.dispose();}assert.equal(art.diagnostics().ownedGeometries,0);
});
