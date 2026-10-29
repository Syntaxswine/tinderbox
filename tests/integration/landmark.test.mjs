import test from 'node:test';
import assert from 'node:assert/strict';
import * as T from '../../src/runtime/three.js';
import {loadLandmark,createLandmarkScene} from '../../src/runtime/landmark.js';
const rect=[[0,0],[10,0],[10,10],[0,10]],commit='a'.repeat(40);
const fixture=()=>({baseUrl:'https://fixture.invalid/place/index.json',manifest:{version:1,placeId:'new-york',sourceAccess:{commit},materials:{},geometries:{},chunks:[]},navigation:{version:1,placeId:'new-york',width:10,height:10,spawn:{x:2,y:2,elevation:0},occupiedLevels:[1,4],surfaces:[{id:'ground',polygons:[rect],holes:[],height:0,level:0,terrain:true},{id:'main',polygons:[rect],holes:[],height:2.12,level:1}]}});
function ownership(){
  const resources=[];const track=Base=>class extends Base{constructor(...args){super(...args);let count=0;this.addEventListener('dispose',()=>count++);resources.push({kind:Base.name,released:()=>count});}};
  return {THREE:{...T,RingGeometry:track(T.RingGeometry),ShapeGeometry:track(T.ShapeGeometry),PlaneGeometry:track(T.PlaneGeometry),MeshBasicMaterial:track(T.MeshBasicMaterial),MeshStandardMaterial:track(T.MeshStandardMaterial)},resources};
}
function hero(){let disposed=0;const updates=[],rig={root:new T.Group(),setHeldVisible(){},update(...args){updates.push(args);},diagnostics:()=>({nativeScale:[1,1,1]})};return{kit:{create:()=>rig,dispose(){disposed++;}},rig,updates,released:()=>disposed};}
const snapshot=(level=1)=>({player:{x:2,y:2,elevation:level*2.12,level,radius:.5,interior:true},clocks:{player:1},paused:false,navigation:{portalStates:{}}});

test('landmark loader rejects private or mismatched data before loading navigation, and cancellation stops further reads',async()=>{
  let reads=0;const data=fixture(),loader=async()=>{reads++;return {...data.manifest,diagnostic:true};};
  await assert.rejects(loadLandmark('new-york',{loadJSON:loader}),/unaccepted/);assert.equal(reads,1);
  await assert.rejects(loadLandmark('new-york',{loadJSON:async()=>({...data.manifest,sourceAccess:null})}),/unaccepted/);
  const controller=new AbortController();controller.abort();await assert.rejects(loadLandmark('new-york',{signal:controller.signal,loadJSON:loader}),error=>error.name==='AbortError');assert.equal(reads,1);
  const loaded=await loadLandmark('new-york',{loadJSON:async url=>url.endsWith('index.json')?{...data.manifest,navigation:'navigation.json'}:data.navigation});assert.equal(loaded.navigation.placeId,'new-york');
});

test('landmark scene uses the selected native hero and elevation, changes plan levels, and releases all resources exactly once',async()=>{
  const owned=ownership(),scene=new T.Scene(),renderer={localClippingEnabled:false},h=hero();let selected;
  const view=await createLandmarkScene({...owned,scene,renderer,data:fixture(),characterId:'horse',bearLoader:async options=>{selected=options;return h.kit;}});
  assert.equal(selected.characterId,'horse');assert.equal(selected.unarmed,true);view.update(snapshot(),{viewMode:'follow'});assert.equal(h.rig.root.position.y,2.12);assert.deepEqual(h.rig.root.scale.toArray(),[1,1,1]);
  view.update(snapshot(4),{viewMode:'overview'});view.update(snapshot(1),{viewMode:'overview'});assert.equal(view.streamingMetrics().activeSections,0);assert.equal(renderer.localClippingEnabled,true);
  view.dispose();view.dispose();assert.equal(h.released(),1);assert.equal(scene.children.length,0);assert.equal(renderer.localClippingEnabled,false);assert.ok(owned.resources.length>4);for(const r of owned.resources)assert.equal(r.released(),1,r.kind);
});

test('aborting a landmark load retires terrain immediately and releases a late character kit once',async()=>{
  const owned=ownership(),scene=new T.Scene(),renderer={localClippingEnabled:false},controller=new AbortController(),h=hero();let resolve;
  const pending=createLandmarkScene({...owned,scene,renderer,data:fixture(),signal:controller.signal,bearLoader:()=>new Promise(r=>resolve=r)});
  controller.abort();assert.equal(scene.children.length,0);for(const r of owned.resources)assert.equal(r.released(),1,r.kind);
  resolve(h.kit);await assert.rejects(pending,error=>error.name==='AbortError');assert.equal(h.released(),1);
});

test('early terrain construction failure releases earlier geometry/materials before starting character or section jobs',async()=>{
  const owned=ownership(),scene=new T.Scene(),data=fixture();data.manifest.water={width:10,depth:2,x:5,y:1,height:-1};let loads=0;
  const THREE={...owned.THREE,PlaneGeometry:class {constructor(){throw Error('water geometry allocation failed');}}};
  await assert.rejects(createLandmarkScene({THREE,scene,renderer:{localClippingEnabled:false},data,bearLoader:async()=>{loads++;return hero().kit;}}),/allocation failed/);
  assert.equal(loads,0);assert.equal(scene.children.length,0);for(const r of owned.resources)assert.equal(r.released(),1,r.kind);
});
