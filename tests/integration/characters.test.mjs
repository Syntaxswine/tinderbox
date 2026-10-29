import fs from 'node:fs';
import test from 'node:test';
import assert from 'node:assert/strict';
import {createCharacterRig,CHARACTER_SOURCE_COMMITS} from '../../src/reuse/characters.js';
import {CHARACTERS,CHARACTER_PROFILES} from '../../src/content/characters.js';
import {createSimulation} from '../../src/simulation/index.js';
const file=id=>id==='bear'?'vendor/animal-factory-tactics-3d/4f5f53917990ec03b2f14c65f067e4b99ec8fcaa/dist/tactics/bear-10k-data.json':'vendor/farmyard-commando/30a3b8cae5f36bb0c1df3685b7fba16f701c2083/sites/tactical-animal/dist/aft/tactics/'+id+'-10k-data.json';
test('three native player rigs keep original geometry/scale and finite tool contacts through idle, gait, pause and elevation',()=>{
  for(const {id}of CHARACTERS){const data=JSON.parse(fs.readFileSync(file(id))),original=JSON.stringify(data),rig=createCharacterRig(id,data),profile=CHARACTER_PROFILES[id];
    try{for(const tool of ['matches','jerry-can','molotov','torch','flamethrower'])for(const heading of [0,Math.PI/2,Math.PI,Math.PI*1.5])for(const travelled of [0,.1,.25,.45,.7,1.05,1.6]){
        const player={x:20,y:25,elevation:8.48,tool,heading,travelled,moving:travelled>0};rig.update(player,travelled);const bounds=rig.sampleBodyBounds(),diagnostics=rig.diagnostics();
        assert.ok(bounds.max[1]<=profile.height+1e-6,id+' headroom');assert.ok(bounds.radius<=profile.radius+1e-6,id+' radius');assert.deepEqual(rig.worker.root.scale.toArray(),[1,1,1]);
        assert.equal(rig.root.position.y,8.48);assert.equal(rig.root.userData.role,'player');assert.equal(diagnostics.species,id);assert.equal(diagnostics.sourceCommit,CHARACTER_SOURCE_COMMITS[id]);
        assert.ok(diagnostics.contacts.every(contact=>contact.error<1e-5));assert.ok(diagnostics.finiteAnchors);assert.equal(diagnostics.visibleTool,tool);assert.equal(diagnostics.defaultRifleVisible,false);
        const before=rig.worker.bones.map(b=>b.quaternion.toArray());rig.update(player,travelled,{paused:true});assert.deepEqual(rig.worker.bones.map(b=>b.quaternion.toArray()),before);
      }assert.equal(JSON.stringify(data),original);rig.setHeldVisible(false);assert.equal(rig.diagnostics().visibleTool,null);
    }finally{rig.dispose();rig.dispose();}assert.equal(rig.counts().objects,0);
  }
});
test('Catalogue Street uses selected identity/body while matches, continuous torch, pouring and inversion remain authoritative',()=>{
  for(const {id}of CHARACTERS){const sim=createSimulation({scenario:'neighborhood',characterId:id,config:{fire:{damagePerSecond:0}}});
    try{const initial=sim.snapshot();assert.equal(initial.player.characterId,id);assert.equal(initial.player.species,id);assert.equal(initial.player.radius,CHARACTER_PROFILES[id].radius);
      sim.dispatch({type:'select-tool',tool:'torch'});sim.dispatch({type:'primary',pressed:true});const lit=sim.advance(1/60);assert.equal(lit.player.torch.phase,'lit');assert.equal(lit.player.inventory.matches,12);
      sim.dispatch({type:'primary',pressed:false});sim.dispatch({type:'select-tool',tool:'jerry-can'});sim.dispatch({type:'primary',pressed:true});sim.dispatch({type:'move',x:1,y:0});sim.dispatch({type:'drug',drug:'inversion'});
      for(let i=0;i<30;i++)sim.advance(1/60);const moved=sim.snapshot();assert.ok(moved.player.inventory.gas<initial.player.inventory.gas);assert.ok(moved.player.inventory.torchFuel<lit.player.inventory.torchFuel);assert.ok(moved.effects.inversion.active);assert.equal(moved.player.pouring,true);
    }finally{sim.dispose();}
  }
});
test('exploration uses native neutral locomotion and keeps tool helpers hidden for every selectable animal',()=>{
  for(const {id}of CHARACTERS){const rig=createCharacterRig(id,JSON.parse(fs.readFileSync(file(id))),{unarmed:true});
    try{for(const travelled of [0,.1,.5,.9,1.6]){rig.update({x:3,y:5,elevation:2.12,heading:.75,tool:'matches',travelled,moving:travelled>0},travelled);
      assert.equal(rig.diagnostics().visibleTool,null);const bounds=rig.sampleBodyBounds();assert.ok(bounds.radius<=CHARACTER_PROFILES[id].radius);assert.ok(bounds.max[1]<=CHARACTER_PROFILES[id].height);assert.equal(rig.root.position.y,2.12);
    }}finally{rig.dispose();}
  }
});
