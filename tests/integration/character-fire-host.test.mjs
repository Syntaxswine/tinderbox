import fs from 'node:fs';
import test from 'node:test';
import assert from 'node:assert/strict';
import * as T from '../../src/runtime/three.js';
import {createSimulation} from '../../src/simulation/index.js';
import {createCharacterRig} from '../../src/reuse/characters.js';
import {createCivilianRig,createChicagoPatrolRig} from '../../src/reuse/civilians.js';
import {CIVILIAN_PROFILES,CHICAGO_PATROL} from '../../src/content/exterior-kit.js';
import {NEIGHBORHOOD_SCENARIO} from '../../src/content/neighborhood.js';
import {createGroundField} from '../../src/art/ground-field.js';
import {createFire} from '../../src/art/fire.js';

const goat=JSON.parse(fs.readFileSync('vendor/farmyard-commando/30a3b8cae5f36bb0c1df3685b7fba16f701c2083/sites/tactical-animal/dist/aft/tactics/goat-10k-data.json'));
const near=(a,b)=>assert.ok(Math.abs(a-b)<2e-5,`${a} != ${b}`);
const camera=new T.OrthographicCamera(-8,8,8,-8,.1,100);camera.position.set(12,8,14);camera.lookAt(4,1,4);camera.updateMatrixWorld();
function fixture(sim,model){
 const scene=new T.Scene(),field=createGroundField(T),atlas=new T.Texture(),fire=createFire(T,{flame:atlas,smoke:atlas,burst:atlas},field.uniforms),player=createCharacterRig('goat',goat);
 scene.add(player.root,model.root,fire.root);
 const present=(snapshot,options={})=>{
  player.update(snapshot.player,snapshot.clocks.player);
  const actor=snapshot.actors.find(a=>a.id===options.actorId||a.id==='native-goat');if(actor)model.update(actor,snapshot.clocks.world);
  model.root.updateMatrixWorld(true);field.update(snapshot);
  const bodies=[{id:snapshot.player.id,species:'goat',worker:player.bodyBinding},...(actor?[{id:actor.id,species:'goat',worker:model.bodyBinding}]:[])];
  fire.update(snapshot,snapshot.clocks.world,{camera,characterBodies:bodies,...options});return fire.diagnostics();
 };
 return {scene,field,fire,player,present,dispose(){fire.dispose();field.dispose();atlas.dispose();player.dispose();model.dispose();sim.dispose();}};
}
function centres(fire){
 const values=[];fire.root.traverse(node=>{const p=node.geometry?.getAttribute('splatCenter');if(p)for(let i=0;i<node.geometry.instanceCount;i++)values.push([p.getX(i),p.getY(i),p.getZ(i)]);});return values;
}

test('the host binds actual posed native bodies, maps real burn state, freezes time, and clears removal/reset/disposal',()=>{
 const sim=createSimulation({characterId:'goat',scenario:{id:'native-shroud-host',width:12,height:10,player:{x:2.25,y:4.25,tool:'flamethrower'},actors:[{...CIVILIAN_PROFILES.goat,id:'native-goat',team:'civilian',headgear:'none',equipment:'none',x:4.75,y:4.25,speed:1,route:[{x:4.75,y:4.25},{x:10.75,y:4.25}]}]}}),model=createCivilianRig('goat',goat),f=fixture(sim,model);
 try{
  assert.ok(Object.isFrozen(model.bodyBinding)&&Object.isFrozen(model.bodyBinding.parts));assert.deepEqual(Object.keys(model.bodyBinding).sort(),['parts','root']);assert.equal(model.bodyBinding.root,model.worker.root);assert.deepEqual(model.bodyBinding.parts,model.worker.parts);
  const initial=f.present(sim.snapshot());assert.equal(initial.characterShroud.resources.geometries,0);
  sim.dispatch({type:'primary',pressed:true});const s=sim.advance(.25),before=JSON.stringify(s),stats=f.present(s);
  assert.deepEqual(stats.characterShroud.activeIds,['native-goat']);assert.ok(stats.characterShroud.flameSplats>0);assert.equal(stats.actorFlameCards,0);assert.deepEqual(stats.unsupportedCharacterIds,[]);assert.equal(JSON.stringify(s),before);
  assert.deepEqual(stats.characterShroud.resources,{geometries:1,materials:1,textures:0,lights:0,renderers:0});assert.equal(stats.characterShroud.drawBatches,1);
  const fitBuilds=stats.characterShroud.fitBuilds,a=centres(f.fire);assert.ok(a.length>0);
  f.present(s);assert.deepEqual(centres(f.fire),a);assert.equal(f.fire.diagnostics().characterShroud.fitBuilds,fitBuilds);
  // Matrix-only elevated/translated pose control: authoritative marker and world
  // time stay fixed. The host must not add a second heading/elevation transform.
  model.root.position.add(new T.Vector3(.7,2.12,-.3));model.root.updateMatrixWorld(true);
  f.fire.update(s,s.clocks.world,{camera,characterBodies:[{id:'native-goat',species:'goat',worker:model.bodyBinding}]});const b=centres(f.fire);assert.equal(b.length,a.length);
  for(let i=0;i<a.length;i++){near(b[i][0]-a[i][0],.7);near(b[i][1]-a[i][1],2.12);near(b[i][2]-a[i][2],-.3);}
  model.root.visible=false;f.fire.update(s,s.clocks.world,{camera,characterBodies:[{id:'native-goat',species:'goat',worker:model.bodyBinding}]});assert.deepEqual(f.fire.diagnostics().characterShroud.activeIds,[]);assert.equal(centres(f.fire).length,0);
  const removed={...s,actors:[]};f.present(removed);assert.deepEqual(f.fire.diagnostics().characterShroud.boundIds,[s.player.id]);assert.deepEqual(f.fire.diagnostics().characterShroud.activeIds,[]);
  sim.dispatch({type:'reset'});const reset=sim.advance(1/60);f.present(reset);assert.equal(f.fire.diagnostics().characterShroud.fits.length,0);assert.deepEqual(f.fire.diagnostics().characterShroud.activeIds,[]);
  f.fire.dispose();f.fire.dispose();assert.deepEqual(f.fire.diagnostics().characterShroud.resources,{geometries:0,materials:0,textures:0,lights:0,renderers:0});assert.deepEqual(f.fire.diagnostics().characterShroud.boundIds,[]);
 }finally{f.dispose();}
});

test('a real Catalogue officer burn uses visible replacement wool, not the hidden original clothes',()=>{
 const sim=createSimulation({characterId:'goat',scenario:{...NEIGHBORHOOD_SCENARIO,player:{x:40,y:20,heading:Math.atan2(-1.6,-2.4),tool:'flamethrower'}}}),model=createChicagoPatrolRig(goat),f=fixture(sim,model);
 try{
  sim.dispatch({type:'primary',pressed:true});sim.advance(.25);sim.dispatch({type:'primary',pressed:false});const s=sim.advance(.25),officer=s.actors.find(a=>a.id===CHICAGO_PATROL.id);assert.ok(officer.burn);assert.equal(officer.characterFire.active,true);
  const officerCamera=camera.clone();officerCamera.position.set(48,8,28);officerCamera.lookAt(officer.x,1,officer.y);officerCamera.updateMatrixWorld();
  const stats=f.present(s,{actorId:officer.id,camera:officerCamera}),fit=stats.characterShroud.fits.find(v=>v.id===officer.id);assert.ok(fit);assert.equal(stats.actorFlameCards,0);assert.ok(stats.characterShroud.flameSplats>0);
  assert.ok(fit.clothParts.some(name=>/frock|wool|trousers/i.test(name)),JSON.stringify(fit));assert.ok(fit.envelopeParts.some(name=>/frock|wool/i.test(name)),JSON.stringify(fit));
  assert.ok(fit.clothParts.every(name=>!/(helmet|pistol|star|button|buckle)/i.test(name)));assert.deepEqual(fit.nativeScale,[1,1,1]);
 }finally{f.dispose();}
});
