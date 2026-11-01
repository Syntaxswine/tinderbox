/** One fixed coupled material law. No field/geometry/clock or data ownership change. */
import {frozenCornerVectorControl,cornerEmissionVectorFragment} from './corridor-emission-vector-transfer.js';
export const COUPLED_CONTROL=Object.freeze({materials:92,bytes:6843,sha256:'4656d42c25d406761c4d59f1f8ee80427c3af843180d96372d14e92a7546f817'});
const BEFORE='return (F*F)*palette;',AFTER='return F*palette;';
const need=(v,m)=>{if(!v)throw Error(m);};
export function frozenCoupledControl(){
 const original=frozenCornerVectorControl(),fragment=cornerEmissionVectorFragment(original.fragment);need(fragment.length===COUPLED_CONTROL.bytes,'Complete C90 extent changed');return {fragment,vertex:original.vertex};
}
export function coupledCornerFragment(fragment){
 const expected=frozenCoupledControl().fragment;need(fragment===expected&&fragment.split(BEFORE).length===2,'Complete C90 fragment required');return fragment.replace(BEFORE,AFTER);
}
export function recoverCoupledCornerFragment(fragment){
 need(typeof fragment==='string'&&fragment.split(AFTER).length===2,'Exactly one coupled source term required');const original=fragment.replace(AFTER,BEFORE);need(original===frozenCoupledControl().fragment,'Full C90 fragment inverse failed');return original;
}
export function coupledOpticalState(before){
 const c=frozenCoupledControl();need(before?.fragment===c.fragment&&before.vertex===c.vertex&&before.uniform&&before.uniform.value===0,'Exact C90 optical state required');
 return {fragment:coupledCornerFragment(before.fragment),vertex:before.vertex,uniform:Object.freeze({value:6})};
}
export function recoverCoupledOpticalState(after,before){
 coupledOpticalState(before);need(after?.vertex===before.vertex&&after.uniform?.value===6,'Exact fixed6 coupled state required');
 return {fragment:recoverCoupledCornerFragment(after.fragment),vertex:before.vertex,uniform:before.uniform};
}
export function installCoupledCornerEmission(effect){
 need(effect?.root&&typeof effect.root.traverse==='function','Original private effect root required');const changes=[],seen=new Set();
 effect.root.traverse(node=>{if(!node.isMesh)return;const m=node.material;need(m&&!Array.isArray(m)&&m.isShaderMaterial===true&&!seen.has(m),'Distinct owned ShaderMaterials required');seen.add(m);
  const before={fragment:m.fragmentShader,vertex:m.vertexShader,uniform:m.uniforms?.eaFlameExtinctionCoefficient};changes.push({m,before,after:coupledOpticalState(before)});
 });
 need(changes.length===COUPLED_CONTROL.materials,'Exact92 C90 materials required');
 // Every full fragment/vertex/uniform guard passed before the first write.
 for(const {m,after}of changes){m.fragmentShader=after.fragment;m.uniforms.eaFlameExtinctionCoefficient=after.uniform;m.needsUpdate=true;}
 return changes.length;
}
