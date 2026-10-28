import {createRuntime} from '../../src/runtime/index.js';
import {createArtScene} from '../../src/art/index.js';
import {mountUI} from '../../src/ui/index.js';
const results=[],root=document.querySelector('#viewport'),hud=document.querySelector('#hud');
const ok=(condition,message)=>{if(!condition)throw Error(message);};
const near=(a,b)=>ok(Math.abs(a-b)<1e-7,a+' differs from '+b);
let runtime,renderer,scene,hook;
const nextFrame=()=>new Promise(resolve=>requestAnimationFrame(resolve));
function sceneSignature(){const values=[];scene.traverse(o=>values.push([o.uuid,o.position.toArray(),o.quaternion.toArray(),o.scale.toArray()]));return JSON.stringify(values);}
const check=async(name,run)=>{try{await run();results.push({name,status:'pass'});}catch(error){results.push({name,status:'fail',message:error.stack||error.message});}};
try{
  runtime=await createRuntime({root,uiRoot:hud,autoStart:false,scenario:'exposition',seed:1893,
    mountUI:args=>{hook=args.onZoom;return mountUI(args);},
    createArtScene:async args=>{renderer=args.renderer;scene=args.scene;return createArtScene(args);}
  });
  await nextFrame();await nextFrame();
  const rect=root.getBoundingClientRect(),cx=rect.x+rect.width/2,cy=rect.y+rect.height/2;
  const distance=()=>{const a=runtime.screenToWorld(cx,cy),b=runtime.screenToWorld(cx+8,cy);ok(a&&b,'Aim sample left the world');return Math.hypot(a.x-b.x,a.y-b.y);};
  const initial=distance(),initialSnapshot=JSON.stringify(runtime.snapshot()),initialScene=sceneSignature();
  await check('Runtime supplies zoom callback and UI zoom repaints a manual renderer without advancing simulation',()=>{
    ok(typeof hook==='function','Runtime zoom callback is not connected; apply proposed adapter for combined review');
    const frame=renderer.info.render.frame;
    hud.querySelector('[data-zoom="in"]').click();
    ok(renderer.info.render.frame===frame+1,'Manual renderer did not repaint');
    near(distance(),initial/1.15);
    ok(JSON.stringify(runtime.snapshot())===initialSnapshot,'Zoom changed gameplay/clocks/resources');
    ok(sceneSignature()===initialScene,'Zoom changed native scene geometry/scale/pose');
    hud.querySelector('[data-zoom="out"]').click();near(distance(),initial);
  });
  await check('Zoom clamps at 0.65 and 3 with updated aim projection and unchanged gameplay dimensions',()=>{
    for(let i=0;i<50;i++)runtime.zoom(1/1.15);near(distance(),initial/.65);
    runtime.zoom(1/1.15);near(distance(),initial/.65);
    for(let i=0;i<50;i++)runtime.zoom(1.15);near(distance(),initial/3);
    runtime.zoom(1.15);near(distance(),initial/3);
    ok(JSON.stringify(runtime.snapshot())===initialSnapshot,'Clamp changed game state');
    ok(sceneSignature()===initialScene,'Clamp scaled native art');
  });
  await check('Paused zoom repaints immediately and leaves the full authoritative snapshot unchanged',()=>{
    runtime.dispatch({type:'pause',paused:true});runtime.advance(0);
    const snapshot=JSON.stringify(runtime.snapshot()),frame=renderer.info.render.frame,geometry=sceneSignature(),before=distance();
    runtime.zoom(1/1.15);
    ok(renderer.info.render.frame===frame+1,'Paused renderer did not repaint');ok(distance()>before,'Paused aim projection unchanged');
    ok(JSON.stringify(runtime.snapshot())===snapshot,'Paused zoom advanced time or resources');
    ok(sceneSignature()===geometry,'Paused zoom touched model dimensions');
  });
  await check('Invalid zoom factors are inert and disposal releases canvas, UI, scene and GPU resources',async()=>{
    const before=distance(),frame=renderer.info.render.frame;
    for(const factor of [0,-1,NaN,Infinity])runtime.zoom(factor);
    near(distance(),before);ok(frame===renderer.info.render.frame,'Invalid zoom repainted');
    runtime.dispose();runtime.dispose();runtime.zoom(1.15);await nextFrame();
    ok(!root.querySelector('canvas')&&!hud.querySelector('.tb-ui'),'Disposed DOM retained');
    ok(scene.children.length===0,'Disposed scene retained objects');
    ok(renderer.info.memory.geometries===0&&renderer.info.memory.textures===0,'Disposed GPU resources retained');
  });
}catch(error){results.push({name:'Combined runtime setup',status:'fail',message:error.stack||error.message});}
finally{runtime?.dispose();}
document.querySelector('#results').textContent=JSON.stringify(results,null,2);
document.body.dataset.testStatus=results.length===4&&results.every(r=>r.status==='pass')?'passed':'failed';
document.body.dataset.testResults=JSON.stringify(results);
