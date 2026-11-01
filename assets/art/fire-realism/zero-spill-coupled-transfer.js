/** Fixed local-light ablation only. No material, field or environment mutation. */
import {frozenCoupledControl,coupledCornerFragment} from './coupled-corner-emission-transfer.js';
export const ZERO_SPILL_CONTROL=Object.freeze({materials:92,fragmentBytes:6839,fragmentSha256:'c7b63613e9499a4d5570f9e9c3cec96ba069a68e1b2732e4bd89b01e4346d75a',color:0xff8d35,distance:4.5,decay:2});
const need=(v,m)=>{if(!v)throw Error(m);};
export function guardZeroSpillCoupled(effect){
 need(effect?.root&&typeof effect.root.traverse==='function'&&['update','reset','dispose','diagnostics'].every(k=>typeof effect[k]==='function'),'Private coupled effect required');
 const control=frozenCoupledControl(),fragment=coupledCornerFragment(control.fragment),materials=new Set(),lights=[];
 need(fragment.length===ZERO_SPILL_CONTROL.fragmentBytes,'Frozen complete coupled fragment extent changed');
 effect.root.traverse(node=>{
  if(node.isMesh){const m=node.material;need(m&&!Array.isArray(m)&&m.isShaderMaterial===true&&!materials.has(m),'Distinct owned coupled materials required');materials.add(m);need(m.fragmentShader===fragment&&m.vertexShader===control.vertex&&m.uniforms?.eaFlameExtinctionCoefficient?.value===6,'Exact complete R40 fragment/vertex/uniform6 required');}
  if(node.isLight||node.isPointLight){need(node.isLight===true&&node.isPointLight===true,'Only the owned PointLight is permitted');lights.push(node);}
 });
 need(materials.size===92&&lights.length===1,'Exact92 materials and sole owned PointLight required');
 const light=lights[0];need(light.parent===effect.root&&effect.root.children.includes(light),'Directly owned source light required');
 need(typeof light.color?.getHex==='function'&&light.color.getHex()===ZERO_SPILL_CONTROL.color&&light.position?.x===5.5&&light.position.y===.3&&light.position.z===8.5&&light.distance===4.5&&light.decay===2&&light.intensity===0,'Exact initial source PointLight parameters required');
 return light;
}
export function forceZeroSpill(light,requested){
 need(Number.isFinite(requested)&&requested>=0,'Finite nonnegative delegated intensity required');light.intensity=0;need(light.intensity===0,'Owned light did not retain applied zero');
}
