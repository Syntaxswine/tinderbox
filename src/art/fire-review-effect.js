import {createFire} from './fire.js';
import {createOpaqueSceneDepth} from './scene-depth.js';
import {createFireFrameAdapter,dischargePresentation,burningBuildingVisuals} from './fire-frame.js';
const inactive=tick=>({version:1,tick,active:false,tool:null,rays:[],connectRays:false});
// Review-only adapter: the public game keeps createFire as its default factory.
export function createFireReviewEffect(T,assets,fieldUniforms,{renderer,scene,artistFactory,artistFactories={},initialMode='current'}={}){
  const root=new T.Group();root.name='Single selected fire comparison mode';
  const current=createFire(T,assets,fieldUniforms),transients=createFire(T,assets,fieldUniforms);
  transients.root.name='Published Molotov/barrel transient presentation only';root.add(current.root,transients.root);
  const frameAdapter=createFireFrameAdapter(),variants=new Map();
  const depth=createOpaqueSceneDepth(T,renderer,scene,[root]);
  let mode=initialMode,frame=null,buildingVisuals=[],closed=false,lastDischarge=dischargePresentation(null,null),updates=0;
  const factoryForMode=()=>artistFactories[mode]||(mode==='reference'?artistFactory:null);
  function variant(){
    if(!['reference','optimized'].includes(mode)||!factoryForMode())return null;
    if(!variants.has(mode))variants.set(mode,factoryForMode()(T,{quality:mode}));
    const effect=variants.get(mode);if(effect.diagnostics?.().quality!==mode){effect.dispose?.();variants.delete(mode);throw Error('Artist factory did not supply the requested '+mode+' mode');}if(effect.root.parent!==root)root.add(effect.root);return effect;
  }
  function select(value){
    if(!['current','reference','optimized','no-fire'].includes(value))throw RangeError('Invalid fire review mode');
    mode=value;buildingVisuals=[];frameAdapter.reset();current.reset();transients.reset();for(const v of variants.values())v.reset();
    current.root.visible=mode==='current';transients.root.visible=['reference','optimized'].includes(mode)&&!!factoryForMode();
    for(const [key,v]of variants)v.root.visible=key===mode;
    const selected=variant();if(selected)selected.root.visible=true;
  }
  try{select(initialMode);}catch(error){current.dispose();transients.dispose();for(const v of variants.values())v.dispose();depth.dispose();root.clear();throw error;}
  return {root,setMode:select,
    update(snapshot,time,anchors={}){
      if(closed)return;updates++;buildingVisuals=burningBuildingVisuals(snapshot,anchors.housing);lastDischarge=dischargePresentation(snapshot.discharge,anchors.muzzle);
      if(mode==='current'){current.update(snapshot,time,anchors);return;}
      if(mode==='no-fire'||!factoryForMode())return;
      frame=frameAdapter.update({...snapshot,clocks:{...snapshot.clocks,world:time,player:Number.isFinite(anchors.firePlayerTime)?anchors.firePlayerTime:snapshot.clocks.player}},{camera:anchors.camera,viewport:anchors.viewport,anchors,fieldUniforms,
        buildingVisuals});
      if(frame.eventReceipts.reset){transients.reset();for(const v of variants.values())v.reset();}
      // A separate, labelled legacy component retains transients without double
      // ground, carried torch or discharge emissions. Its costs are included.
      const acceptedEvents=frame.eventReceipts.events.map(event=>({...event,worldTime:Number.isFinite(event.worldTime)?event.worldTime:event.receivedWorldTime}));
      transients.update({...snapshot,events:acceptedEvents,cells:[],discharge:inactive(snapshot.tick),player:{...snapshot.player,tool:'matches',torch:{phase:'unlit',remainingSeconds:0}}},time,anchors);
    },
    beforeRender(camera){
      if(closed||!frame||!['reference','optimized'].includes(mode))return;
      const selected=variant();if(!selected)return;
      frame.opaqueDepth=depth.prepare(camera);selected.update(frame);
    },
    reset(){frame=null;buildingVisuals=[];frameAdapter.reset();current.reset();transients.reset();for(const v of variants.values())v.reset();},
    captureInputs(){const image=fieldUniforms.field.value?.image;return {field:{width:image?.width||null,height:image?.height||null,cellSize:fieldUniforms.cellSize.value,data:image?.data?Array.from(image.data):null}};},
    diagnostics(){const selected=variants.get(mode);return {mode,updates,discharge:lastDischarge,burningBuildingIds:buildingVisuals.map(group=>group.id),buildingVisuals:structuredClone(buildingVisuals),
      current:mode==='current'?current.diagnostics():null,artist:selected?.diagnostics()||null,
      legacyTransients:mode==='reference'||mode==='optimized'?{source:'Published painted Molotov/barrel bursts only',...transients.diagnostics()}:null,
      opaqueDepth:depth.diagnostics(),disposed:closed};},
    dispose(){if(closed)return;closed=true;current.dispose();transients.dispose();for(const v of variants.values())v.dispose();variants.clear();depth.dispose();root.removeFromParent();root.clear();}
  };
}
