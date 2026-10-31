/** Unaccepted fixed6r emission witness over the preserved smoke-only pilot. */
import {createFluidSurfaceEmissionPilot} from './fluid-surface-emission-pilot.js';
import {normalizedEmissionFragment} from './fluid-surface-emission-normalization-transfer.js';
export {prepareFluidSurfaceContactData,fluidSurfaceContactPayloadEvidence,auditFluidSurfaceContactRGBA} from './fluid-surface-emission-pilot.js';
export function createFluidSurfaceEmissionNormalizationWitness(T,options={}){
 const effect=createFluidSurfaceEmissionPilot(T,options);
 try{
  const materials=[];effect.root.traverse(node=>{if(!node.isMesh)return;if(!node.material?.isShaderMaterial||Array.isArray(node.material))throw Error('Normalization encountered unexpected material');materials.push(node.material);});
  const expected=effect.diagnostics().geometry?.maxPrisms;
  if(!Number.isInteger(expected)||expected<1||materials.length!==expected||new Set(materials).size!==expected)throw Error('Normalization owned material count/uniqueness mismatch');
  const fragments=materials.map(material=>{
   if(!Object.isFrozen(material.uniforms.eaFlameExtinctionCoefficient)||material.uniforms.eaFlameExtinctionCoefficient.value!==0)throw Error('Normalization requires fixed smoke-only absorption');
   return normalizedEmissionFragment(material.fragmentShader,material.uniforms.planes.value.length);
  });
  materials.forEach((material,i)=>{material.fragmentShader=fragments[i];});
  return {...effect,diagnostics(){const base=effect.diagnostics();return {...base,diagnostic:{...base.diagnostic,variant:'derived-emission-normalization-six',proposalCommit:'178647e4ee017b3a29b259f0a9ccfb438a86cfd7',fixedFlameEmissivity:6,normalization:'Derived from original All flameSigma=6r at the same metre convention; author normalization, not radiometric/photo calibration',emission:'6*r*cFireEncoded +ks*cSootEncoded',absorption:'ks unchanged; fixed extinction uniform0',preservedPilot:'da4a7aa2f5603dd05e494859675844dc37a2bd84',onlyOpticalDelta:'Flame j coefficient1 to6. Palette/heat/OETF/integrator/output/smoke/alpha/readability and all other inputs unchanged.',nativeF0:'Pending actual evidence; prior193 differences preserved',limits:'Encoded target UNORM saturation/order approximation remains; no quality/R/O/cost acceptance'}};}};
 }catch(error){try{effect.dispose();}catch(cleanupError){throw new AggregateError([error,cleanupError],'Normalization rejected and owned cleanup failed');}throw error;}
}
