import test from 'node:test';
import assert from 'node:assert/strict';
import * as T from '../../src/runtime/three.js';
import {createSharedMapPresentation} from '../../src/runtime/shared-map-presentation.js';

function fixture() {
  const calls=[],disposed={owner:0,scene:0,renderer:0,light:0};
  const controller=new AbortController(),metrics=Object.freeze({residentSections:2,pendingSections:0});
  const settled=Promise.resolve('settled'),bounds=Object.freeze({min:[0,0,0],max:[1,1.66,1]});
  const anchors=Object.freeze({muzzle:{name:'native muzzle'},spout:{name:'native spout'}});
  let closed=false;
  const handle=Object.freeze({
    anchors,
    update(snapshot,timing){calls.push({method:'update',receiver:this,snapshot,timing});},
    sampleBearBounds(){calls.push({method:'bounds',receiver:this});return bounds;},
    isReadyAt(point){calls.push({method:'ready',receiver:this,point});return false;},
    settled(){calls.push({method:'settled',receiver:this});return settled;},
    streamingMetrics(){calls.push({method:'metrics',receiver:this});return metrics;},
    diagnostics(){calls.push({method:'diagnostics',receiver:this});return metrics;},
    dispose(){if(closed)return;closed=true;disposed.owner++;}
  });
  const args=Object.freeze({
    THREE:Object.freeze({borrowed:true}),
    scene:Object.freeze({dispose(){disposed.scene++;}}),
    renderer:Object.freeze({dispose(){disposed.renderer++;}}),
    world:Object.freeze({width:112,height:76,fireCellSize:.5,sparse:true,sourceSections:true}),
    pickups:Object.freeze([]),characterId:'horse',signal:controller.signal,
    defaultLights:Object.freeze([Object.freeze({dispose(){disposed.light++;}})]),
    assetBaseUrl:'https://example.invalid/pinned-assets/',
    bearAssetBaseUrl:'https://example.invalid/pinned-native-characters/',
    onLoadPhase(){},onPresentationProfile(){},
    gameplayMap:Object.freeze({representation:'native-map',sparsePublication:true,data:Object.freeze({scene:Object.freeze({version:1})})}),
    createMapStructureArt(){throw Error('Only the common owner may invoke the structural factory.');}
  });
  return {args,handle,calls,disposed,controller,anchors,bounds,settled,metrics};
}

test('the adapter forwards all owner inputs by identity and returns its exact art handle',async()=>{
  const f=fixture(),received=[];
  const artFactory=options=>{received.push(options);return Promise.resolve(f.handle);};
  const handle=await createSharedMapPresentation(Object.freeze({...f.args,artFactory}));
  assert.equal(received.length,1);assert.equal(handle,f.handle);assert.equal(handle.anchors,f.anchors);
  assert.deepEqual(Object.keys(received[0]).sort(),Object.keys(f.args).sort(),'Owner options were lost or test injection leaked');
  for(const [key,value] of Object.entries(f.args))assert.equal(received[0][key],value,key);
  assert.deepEqual(f.calls,[],'Adapter ran an update, readiness check or structural callback on construction');
  handle.dispose();handle.dispose();
  assert.deepEqual(f.disposed,{owner:1,scene:0,renderer:0,light:0});
});

test('native elevation, source frames, clocks and timing reach the owner unchanged',async()=>{
  const f=fixture(),handle=await createSharedMapPresentation({...f.args,artFactory:()=>f.handle});
  const snapshot=Object.freeze({
    version:1,tick:20,paused:true,world:f.args.world,
    player:Object.freeze({id:'player',species:'horse',elevation:4.24,tool:'molotov'}),
    clocks:Object.freeze({player:14.5,world:7.2,playerScale:1.8,worldScale:.35}),
    scene:Object.freeze({version:1,generation:2,worldTime:7.2,fireSamples:Object.freeze([Object.freeze({id:'new-york::upper-wall',x:58,y:4.24,z:30,nx:1,ny:0,nz:0,flame:.3,smoke:.1})])}),
    projectiles:Object.freeze([Object.freeze({id:'lantern',x:57,y:31,h:5.1})]),
    navigation:Object.freeze({view:'follow',waitingForSection:false})
  });
  const timing=Object.freeze({playerTime:14.5,worldTime:7.2,playerDelta:0,worldDelta:0,camera:Object.freeze({borrowed:true}),viewMode:'follow',viewport:Object.freeze({width:390,height:844}),alpha:.5});
  const before=JSON.stringify({snapshot,timing});
  handle.update(snapshot,timing);
  assert.deepEqual(f.calls.map(call=>call.method),['update']);
  assert.equal(f.calls[0].receiver,f.handle);assert.equal(f.calls[0].snapshot,snapshot);assert.equal(f.calls[0].timing,timing);
  assert.equal(JSON.stringify({snapshot,timing}),before);
  handle.dispose();
});

test('readiness, streaming, native bounds and diagnostics retain the owner methods and receiver',async()=>{
  const f=fixture(),handle=await createSharedMapPresentation({...f.args,artFactory:()=>f.handle});
  const point=Object.freeze({x:58,y:30,elevation:4.24,surfaceId:'new-york::upper-floor'});
  assert.equal(handle.isReadyAt(point),false);assert.equal(f.calls[0].point,point);
  assert.equal(handle.settled(),f.settled);assert.equal(handle.streamingMetrics(),f.metrics);
  assert.equal(handle.sampleBearBounds(),f.bounds);assert.equal(handle.diagnostics(),f.metrics);
  for(const call of f.calls)assert.equal(call.receiver,f.handle);
  handle.dispose();
});

test('missing map or structural factory fails before starting the common owner',async()=>{
  const f=fixture();let starts=0;
  const args={...f.args,artFactory:()=>{starts++;return f.handle;}};
  for(const patch of [{gameplayMap:undefined},{gameplayMap:null},{createMapStructureArt:undefined},{createMapStructureArt:{}}])
    await assert.rejects(createSharedMapPresentation({...args,...patch}),TypeError);
  await assert.rejects(createSharedMapPresentation({...args,artFactory:null}),TypeError);
  await assert.rejects(createSharedMapPresentation(null),TypeError);
  assert.equal(starts,0);assert.deepEqual(f.disposed,{owner:0,scene:0,renderer:0,light:0});
});

test('owner failure propagates unchanged without retrying initialization or disposing borrowed resources',async()=>{
  const f=fixture(),failure=new Error('Structural source load failed');let starts=0,ownedDisposals=0;
  const artFactory=async options=>{
    starts++;assert.equal(options.signal,f.args.signal);
    try{throw failure;}finally{ownedDisposals++;}
  };
  await assert.rejects(createSharedMapPresentation({...f.args,artFactory}),error=>error===failure);
  assert.equal(starts,1);assert.equal(ownedDisposals,1);
  assert.deepEqual(f.disposed,{owner:0,scene:0,renderer:0,light:0});
});

test('late-load abort cleanup stays with the common owner and executes once',async()=>{
  const f=fixture();let finish,ownedDisposals=0;
  const loaded=new Promise(resolve=>{finish=resolve;});
  const artFactory=async options=>{
    const owned=await loaded;
    if(options.signal.aborted){owned.dispose();throw options.signal.reason;}
    return f.handle;
  };
  const pending=createSharedMapPresentation({...f.args,artFactory});
  const reason=new DOMException('Visit cancelled','AbortError');f.controller.abort(reason);
  finish({dispose(){ownedDisposals++;}});
  await assert.rejects(pending,error=>error===reason);
  assert.equal(ownedDisposals,1);assert.deepEqual(f.disposed,{owner:0,scene:0,renderer:0,light:0});
});

test('the default factory honors an already-aborted visit without a renderer, kit or source load',async()=>{
  const f=fixture(),reason=new DOMException('Visit cancelled before load','AbortError');
  f.controller.abort(reason);
  const scene=new T.Scene();
  await assert.rejects(createSharedMapPresentation({...f.args,THREE:T,scene}),error=>error===reason);
  assert.equal(scene.children.length,0);assert.deepEqual(f.disposed,{owner:0,scene:0,renderer:0,light:0});
});
