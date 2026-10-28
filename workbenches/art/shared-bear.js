import * as T from '../../src/runtime/three.js';
import {createSimulation} from '../../src/simulation/index.js';
import {createArtScene} from '../../src/art/index.js';
const $=id=>document.getElementById(id),stage=$('stage'),output=$('review-output');
let renderer,scene,camera,art,sim,observer,closed=false,held=false,ready=false,failure;
const results=[],status=text=>$('status').textContent=text;
function show(value){output.textContent=JSON.stringify(value,null,2);return value;}
function draw(){const snapshot=sim.snapshot(),p=snapshot.player,width=stage.clientWidth,height=stage.clientHeight,span=5.8;renderer.setSize(width,height,false);camera.left=-span*width/height/2;camera.right=span*width/height/2;camera.top=span/2;camera.bottom=-span/2;camera.position.set(p.x+7,5.8,p.y+7);camera.lookAt(p.x,.85,p.y);camera.updateProjectionMatrix();art.update(snapshot,{playerTime:snapshot.clocks.player,worldTime:snapshot.clocks.world});renderer.render(scene,camera);return snapshot;}
function advance(seconds){for(let i=0;i<Math.round(seconds*60);i++)sim.advance(1/60);return draw();}
function record(){art.sampleBearBounds();return {snapshot:sim.snapshot(),art:art.diagnostics(),renderer:{revision:T.REVISION,geometries:renderer.info.memory.geometries,textures:renderer.info.memory.textures,drawCalls:renderer.info.render.calls}};}
function reset(){sim?.dispose();sim=createSimulation({scenario:'exposition',config:{input:{cameraRelative:false}}});held=false;$('tool').value='matches';draw();status('Native bear loaded. Review checks are explicit; this page does not approve promotion.');}
async function review(){if(!ready)return show({passed:false,rendered:false,phase:'startup',error:failure||'Assets still loading',visualAcceptance:'pending'});$('run-review').disabled=true;results.length=0;
  try{reset();for(const tool of ['matches','jerry-can','molotov','torch','flamethrower']){sim.dispatch({type:'select-tool',tool});advance(1/60);const before=JSON.stringify(sim.snapshot());draw();const idle=record();if(JSON.stringify(sim.snapshot())!==before)throw Error('View mutated simulation');if(!idle.art.bearProtagonist.finiteAnchors||idle.art.bearProtagonist.defaultRifleVisible)throw Error('Invalid native gear or anchors');
      sim.dispatch({type:'move',x:1,y:0});for(let i=0;i<12;i++){advance(1/60);const b=art.sampleBearBounds();if(b.radius>.56+1e-6||b.min[1]<-1e-5)throw Error('Body exceeds unchanged clearance');}sim.dispatch({type:'move',x:0,y:0});advance(1/60);results.push({tool,identity:art.diagnostics().bearProtagonist,rendered:true});await new Promise(resolve=>requestAnimationFrame(resolve));}
    sim.dispatch({type:'pause',paused:true});advance(1/60);const a=JSON.stringify(art.diagnostics().bearProtagonist.worldAnchors);draw();if(JSON.stringify(art.diagnostics().bearProtagonist.worldAnchors)!==a)throw Error('Paused anchors changed');
    return show({passed:true,rendered:true,sourceCommit:art.diagnostics().bearProtagonist.sourceCommit,checks:results,pausedAnchorsStable:true,renderer:record().renderer,visualAcceptance:'Requires independent desktop/phone inspection and all-five-tool firing/pouring review.'});
  }catch(error){return show({passed:false,rendered:true,error:error.message,checks:results});}finally{$('run-review').disabled=false;}
}
$('run-review').onclick=review;
function action(fn){return()=>{if(!ready)return show({passed:false,rendered:false,error:failure||'Still loading'});try{fn();show(record());}catch(error){show({passed:false,error:error.message});}};}
$('tool').onchange=action(()=>{sim.dispatch({type:'select-tool',tool:$('tool').value});held=false;advance(1/60);});
$('walk').onclick=action(()=>{sim.dispatch({type:'move',x:1,y:0});advance(1);sim.dispatch({type:'move',x:0,y:0});advance(1/60);});
$('turn').onclick=action(()=>{const p=sim.snapshot().player,angle=p.heading+Math.PI/2;sim.dispatch({type:'aim',x:p.x+Math.cos(angle),y:p.y+Math.sin(angle)});advance(1/60);});
$('primary').onclick=action(()=>{held=!held;sim.dispatch({type:'primary',pressed:held});advance(.2);});
$('powder').onclick=action(()=>{sim.dispatch({type:'drug',drug:'powder'});advance(1/60);});
$('pause').onclick=action(()=>{sim.dispatch({type:'pause',paused:!sim.snapshot().paused});advance(1/60);});$('reset').onclick=action(reset);
try{renderer=new T.WebGLRenderer({antialias:true,preserveDrawingBuffer:true});renderer.setPixelRatio(Math.min(devicePixelRatio||1,1.5));renderer.outputColorSpace=T.SRGBColorSpace;stage.prepend(renderer.domElement);scene=new T.Scene();scene.background=new T.Color(0x9fae91);camera=new T.OrthographicCamera(-4,4,4,-4,.1,100);art=await createArtScene({THREE:T,scene,renderer});ready=true;reset();observer=new ResizeObserver(()=>{if(ready&&!closed)draw();});observer.observe(stage);window.bearReview={ready:true,run:review,sample:record};}
catch(error){failure=error.message;status('Native bear review could not start. No successful game render has been recorded.');show({passed:false,rendered:false,error:failure,visualAcceptance:'pending'});window.bearReview={ready:false,error:failure,run:review};art?.dispose();renderer?.dispose();renderer?.domElement.remove();}
window.addEventListener('pagehide',()=>{if(closed)return;closed=true;observer?.disconnect();art?.dispose();sim?.dispose();scene?.clear();renderer?.dispose();renderer?.domElement.remove();},{once:true});
