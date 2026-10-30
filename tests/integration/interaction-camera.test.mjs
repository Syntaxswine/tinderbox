import test from 'node:test';
import assert from 'node:assert/strict';
import * as T from '../../src/runtime/three.js';
import {createCameraRig} from '../../src/runtime/camera.js';
import {createRuntime} from '../../src/runtime/index.js';
import {createExploration} from '../../src/runtime/navigation.js';
const near=(a,b,t=1e-6)=>assert.ok(Math.abs(a-b)<=t,`${a} != ${b}`);
const world={width:124,height:124,camera:{followPlayer:true,span:13,phoneSpan:11,maxHeight:42,overviewBounds:{min:[16,0,16],max:[108,3,108]}}};
function cameraFixture(width,height){
  const container={clientWidth:width,clientHeight:height},canvas={left:120,top:80,width,height},root={left:60,top:40,width:width+100,height:height+100};
  const uiRoot={getBoundingClientRect:()=>root},renderer={domElement:{getBoundingClientRect:()=>canvas},setSize(w,h){canvas.width=w;canvas.height=h;}},rig=createCameraRig(container,renderer,world);
  return {container,canvas,root,uiRoot,rig};
}

test('real follow/overview orthographic projection uses desktop/phone canvas aspect and UI-root offsets',()=>{
  for(const [width,height] of [[1280,720],[390,844]])for(const mode of ['follow','overview']){
    const f=cameraFixture(width,height),player={x:62,y:62,elevation:2.12},anchor=[62,4.27,62];f.rig.update(player);f.rig.setMode(mode);
    const projected=f.rig.projectInteraction(anchor,f.uiRoot),ndc=new T.Vector3(...anchor).project(f.rig.camera);
    assert.equal(projected.visible,true);near(projected.x,120+(ndc.x+1)*width/2-60);near(projected.y,80+(1-ndc.y)*height/2-40);
    if(mode==='follow'){
      const ground=f.rig.projectInteraction([player.x,player.elevation,player.y],f.uiRoot);near(ground.x,width/2+60);near(ground.y,height/2+40);assert.ok(projected.y<ground.y);
    }
    const original=[...anchor];f.rig.projectInteraction(anchor,f.uiRoot);assert.deepEqual(anchor,original);
  }
});

test('same selected anchor reprojects after movement, zoom and resize, retaining UI content/border offsets',()=>{
  const f=cameraFixture(1280,720),anchor=[63,4.27,62];f.rig.update({x:62,y:62,elevation:2.12});const a=f.rig.projectInteraction(anchor,f.uiRoot);
  f.rig.update({x:63,y:62,elevation:2.12});const b=f.rig.projectInteraction(anchor,f.uiRoot);assert.notEqual(a.x,b.x);
  const centre=f.rig.projectInteraction([63,2.12,62],f.uiRoot);f.rig.magnify(2);const zoomed=f.rig.projectInteraction(anchor,f.uiRoot);near(zoomed.y-centre.y,2*(b.y-centre.y));
  f.container.clientWidth=390;f.container.clientHeight=844;f.root.width=490;f.root.height=944;f.rig.resize();const phone=f.rig.projectInteraction(anchor,f.uiRoot);assert.equal(phone.visible,true);near(phone.x,390/2+60);assert.notEqual(phone.y,zoomed.y);
  f.uiRoot.clientLeft=2;f.uiRoot.clientTop=3;f.uiRoot.scrollLeft=7;f.uiRoot.scrollTop=11;const scrolled=f.rig.projectInteraction(anchor,f.uiRoot);near(scrolled.x,phone.x+5);near(scrolled.y,phone.y+8);
});

test('invalid, clipped, offscreen, behind-camera, beyond-far and unavailable-root anchors have no visible projection',()=>{
  const f=cameraFixture(900,600);f.rig.update({x:62,y:62,elevation:2.12});
  const direction=f.rig.camera.getWorldDirection(new T.Vector3()),behind=f.rig.camera.position.clone().addScaledVector(direction,-1).toArray(),far=f.rig.camera.position.clone().addScaledVector(direction,f.rig.camera.far+1).toArray();
  for(const anchor of [null,[],[1,2],[1,NaN,3],[1,,3],[Infinity,0,1],[1e300,0,0],[-1000,0,-1000],behind,far])assert.deepEqual(f.rig.projectInteraction(anchor,f.uiRoot),{x:0,y:0,visible:false});
  const anchor=[62,4.27,62];f.root.left=5000;assert.equal(f.rig.projectInteraction(anchor,f.uiRoot).visible,false);f.root.left=60;f.canvas.width=0;assert.equal(f.rig.projectInteraction(anchor,f.uiRoot).visible,false);
  f.canvas.width=900;f.root.height=0;assert.equal(f.rig.projectInteraction(anchor,f.uiRoot).visible,false);
});

test('runtime supplies current-camera projection after update, zoom, view change and resize; disposal invalidates saved callbacks',async()=>{
  // Real simulation/Three camera with an injected renderer API. This checks
  // ordering/projection/lifecycle, not WebGL rendering or actual UI styling.
  class Node extends EventTarget{
    constructor(box){super();this.box=box;this.children=[];this.clientWidth=box.width;this.clientHeight=box.height;}
    getBoundingClientRect(){return this.box;}append(child){this.children.push(child);child.parent=this;}setAttribute(){}remove(){if(this.parent)this.parent.children=this.parent.children.filter(child=>child!==this);}
  }
  const root=new Node({left:120,top:80,width:900,height:600}),uiRoot=new Node({left:60,top:40,width:1000,height:700}),canvas=new Node({...root.box});
  const win=new EventTarget();win.cancelAnimationFrame=()=>{};const doc=new EventTarget();doc.defaultView=win;root.ownerDocument=doc;
  const renderer={domElement:canvas,info:{render:{calls:0},memory:{geometries:0,textures:0}},setPixelRatio(){},setClearColor(){},setSize(w,h){canvas.box.width=w;canvas.box.height=h;},render(){},getContext:()=>({getExtension:()=>null,getParameter:()=> 'Renderer API fixture; not WebGL'}),forceContextLoss(){},dispose(){}};
  const sim=createExploration({definition:{placeId:'door',width:20,height:20,camera:{followPlayer:true,span:13,phoneSpan:11},spawn:{x:5,y:5,elevation:0},surfaces:[{id:'ground',height:0,level:0,label:'Ground',polygons:[[[0,0],[20,0],[20,20],[0,20]]],holes:[]}],ceilings:[],blockers:[],portals:[{id:'door',label:'door',position:[6.5,0,5],reach:2.1}]}});
  let options,resize;const projections=[];
  const runtime=await createRuntime({root,uiRoot,simulation:sim,autoStart:false,rendererFactory:()=>renderer,observerFactory:callback=>{resize=callback;return{observe(){},disconnect(){}};},createArtScene:async()=>({update(){},dispose(){}}),mountUI:value=>{options=value;return{update(snapshot){projections.push(options.onProjectInteraction(snapshot.player.interaction.anchor));},dispose(){}};}});
  try{
    assert.equal(options.root,uiRoot);assert.equal(typeof options.onProjectInteraction,'function');assert.equal(projections[0].visible,true);
    runtime.dispatch({type:'move',x:1,y:0});runtime.advance(1/60);const anchor=runtime.snapshot().player.interaction.anchor;
    assert.deepEqual(projections.at(-1),runtime.projectInteraction(anchor));assert.notEqual(projections[0].x,projections.at(-1).x);
    const clocks=runtime.snapshot().clocks,before=projections.length;options.onZoom(1.5);assert.equal(projections.length,before+1);assert.deepEqual(runtime.snapshot().clocks,clocks);assert.deepEqual(projections.at(-1),runtime.projectInteraction(anchor));
    const count=projections.length;runtime.dispatch({type:'view-overview'});assert.equal(projections.length,count+1);assert.equal(runtime.snapshot().navigation.view,'overview');assert.deepEqual(projections.at(-1),runtime.projectInteraction(anchor));
    root.clientWidth=390;root.clientHeight=844;root.box.width=390;root.box.height=844;uiRoot.box.width=490;uiRoot.box.height=944;resize();assert.deepEqual(projections.at(-1),runtime.projectInteraction(anchor));assert.equal(runtime.metrics().viewport.width,390);
  }finally{runtime.dispose();}
  assert.deepEqual(options.onProjectInteraction([6.5,2.15,5]),{x:0,y:0,visible:false});assert.equal(root.children.length,0);
});
