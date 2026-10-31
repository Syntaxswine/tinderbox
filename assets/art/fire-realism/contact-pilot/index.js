import {createFireRealism as createFrozenR09,FIRE_REALISM_VERSION} from './frozen-r09/index.js';
import {groundFieldGLSL} from './frozen-r09/ground-field.js';
import {CONTACT_PILOT_VERSION,prepareContactTongues,assembleContactField} from './contact-tongues.js';
// Explicitly wraps exact R09 source. Only contact morphology is experimental.
export function createContactTonguePilot(T,options={}){
  if(FIRE_REALISM_VERSION!=='0.9.0-reference-candidate')throw Error('Contact pilot requires its frozen R09 implementation');
  const effect=createFrozenR09(T,options),mesh=effect.root.children.find(o=>o.isMesh),material=mesh.material;
  const field=assembleContactField(groundFieldGLSL);
  for(const key of ['vertexShader','fragmentShader']){if(material[key].split(groundFieldGLSL).length!==2){effect.dispose();throw Error('Frozen field injection must match exactly once');}material[key]=material[key].replace(groundFieldGLSL,field);}
  material.needsUpdate=true;
  const origins=Array.from({length:3},()=>new T.Vector4()),motions=Array.from({length:3},()=>new T.Vector4());
  material.uniforms.pilotRootCount={value:0};material.uniforms.pilotOrigins={value:origins};material.uniforms.pilotMotions={value:motions};
  let closed=false,prepared={count:0,worldTime:0,sources:[],roots:[],bounds:null};
  function clearLocal(){prepared={count:0,worldTime:0,sources:[],roots:[],bounds:null};material.uniforms.pilotRootCount.value=0;for(const v of [...origins,...motions])v.set(0,0,0,0);}
  function update(frame){
    if(closed)return;
    const previous=effect.diagnostics().updates;effect.update(frame);
    // R09 owns pause/reset/rewind/event-generation semantics. Prepare only if
    // its actual update advanced; paused camera/depth binds still run normally.
    if(effect.diagnostics().updates===previous)return;
    try{prepared=prepareContactTongues(frame);}catch(error){effect.reset();clearLocal();throw error;}
    material.uniforms.pilotRootCount.value=prepared.count;
    prepared.roots.forEach((r,i)=>{origins[i].set(r.origin[0],r.origin[1],r.origin[2],r.radius);motions[i].set(r.height,r.phase,r.lean[0],r.lean[1]);});
    for(let i=prepared.count;i<3;i++){origins[i].set(0,0,0,0);motions[i].set(0,0,0,0);}
  }
  return {root:effect.root,update,reset(){if(!closed){effect.reset();clearLocal();}},
    diagnostics(){return{...effect.diagnostics(),version:CONTACT_PILOT_VERSION,frozenBaseVersion:FIRE_REALISM_VERSION,prototype:true,referenceAccepted:false,optimizedAvailable:false,
      contactPilot:{scope:'Only one complete native2x2 half-metre grass patch, or zero live cells; unsupported emitters refuse explicitly',...structuredClone(prepared),rootUniformVec4s:6,newTextures:0,newHistory:0,densityComposition:'maximum, never sum',strictFuelMask:true,supportAndReaction:'Shared bounded swept-centre/radial taper, conservative eight-step support bracket',qualityAccepted:false}};},
    dispose(){if(closed)return;closed=true;effect.dispose();clearLocal();}};
}
