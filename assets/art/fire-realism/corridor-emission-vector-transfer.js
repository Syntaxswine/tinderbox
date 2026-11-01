/** Fixed uncalibrated corner-vector response; no data/texture/store mutation. */
import {makeFluidShaders} from './fluid-contact-corridor-source-diagnostic-01/shaders.js';
import {emissionAbsorptionFragment} from './fluid-contact-corridor-source-diagnostic-01/emission-transfer.js';
import {normalizedEmissionFragment} from './fluid-contact-corridor-source-diagnostic-01/normalization-transfer.js';
import {linearHdrEmissionFragment} from './fluid-contact-corridor-source-diagnostic-01/linear-hdr-transfer.js';
export const FROZEN_FRAGMENT=Object.freeze({maxPlanes:29,materials:92,bytes:5898,sha256:'ea335a90333b3e45eec404a1eb3d2859ad586e3210b06a864ec3e3529c446d24'});
const need=(v,m)=>{if(!v)throw Error(m);};
const once=(s,before,after)=>{need(before.length>0&&s.split(before).length===2,'Exactly one corner-vector substitution required');return s.replace(before,after);};
export function frozenCornerVectorControl(){
 const original=makeFluidShaders(29),fragment=linearHdrEmissionFragment(normalizedEmissionFragment(emissionAbsorptionFragment(original.fragmentShader,'smoke-only'),29),29);
 need(fragment.length===FROZEN_FRAGMENT.bytes,'Frozen complete fragment extent changed');return {vertex:original.vertexShader,fragment};
}
export function cornerVectorEdits(){
 const base=frozenCornerVectorControl().fragment,start=base.indexOf('    vec3 tri(sampler3D data,vec3 p){'),end=base.indexOf('\n    float nativeA',start);need(start>=0&&end>start,'Frozen tri block required');
 const tri=base.slice(start,end),terms=['voxel(data,i).rgb','voxel(data,i+ivec3(1,0,0)).rgb','voxel(data,i+ivec3(0,1,0)).rgb','voxel(data,i+ivec3(1,1,0)).rgb','voxel(data,i+ivec3(0,0,1)).rgb','voxel(data,i+ivec3(1,0,1)).rgb','voxel(data,i+ivec3(0,1,1)).rgb','voxel(data,i+ivec3(1,1,1)).rgb'],names=['c000','c100','c010','c110','c001','c101','c011','c111'];
 const at=tri.indexOf('return '),raw=tri.slice(at,tri.indexOf(';',at)+1);need(at>=0,'Original raw mix required');let rawAliased=raw;terms.forEach((v,i)=>{rawAliased=once(rawAliased,v,names[i]);});
 const vector=rawAliased.replace('return ','vector=').replace(/\bc[01]{3}\b/g,v=>'cornerEmission('+v+')');
 const local=`    vec3 cornerEmission(vec3 rawCorner){
      float F=rawCorner.z,colorHeat=clamp((rawCorner.y-1.5)/1.5,0.,1.);
      vec3 palette=mix(vec3(1.30,.19,.018),vec3(1.65,.78,.19),smoothstep(.20,.82,colorHeat));
      palette=mix(palette,vec3(1.65,1.45,.95),pow(colorHeat,8.)*smoothstep(.70,.97,F)*.18);
      return (F*F)*palette;
    }
    vec3 tri(sampler3D data,vec3 p,out vec3 vector){
      vec3 q=(p-scalarOrigin)/voxelSize;ivec3 i=ivec3(floor(q));vec3 f=fract(q);
      ${terms.map((v,i)=>'vec3 '+names[i]+'='+v+';').join('\n      ')}
      ${vector}
      ${rawAliased}
    }`;
 const warm=`vec3 warm=mix(vec3(1.30,.19,.018),vec3(1.65,.78,.19),smoothstep(.20,.82,heat));
        warm=mix(warm,vec3(1.65,1.45,.95),pow(heat,8.)*smoothstep(.70,.97,value.z)*.18);`;
 return [
  [tri,local],
  ['vec3 value=max(vec3(0.),mix(tri(field0,p),tri(field1,p),temporalMix));','vec3 vector0,vector1;\n        vec3 raw0=tri(field0,p,vector0),raw1=tri(field1,p,vector1);\n        vec3 value=max(vec3(0.),mix(raw0,raw1,temporalMix));\n        vec3 localEmissionVector=mix(vector0,vector1,temporalMix);'],
  ['float reacting=value.z*reactionGain*sourceA;','float reacting=value.z*reactionGain*sourceA;\n        float emissionGate=reactionGain*sourceA;'],
  ['reacting*=mix(baseAllowed,1.,contactRelease);','reacting*=mix(baseAllowed,1.,contactRelease);\n        emissionGate*=mix(baseAllowed,1.,contactRelease);'],
  [warm,'// Full corner emission vector was filtered before the existing masks.'],
  ['eaEmission(reacting,smokeSigma,warm,soot)','eaEmission(emissionGate,smokeSigma,localEmissionVector,soot)']
 ];
}
export function cornerEmissionVectorFragment(fragment){
 const base=frozenCornerVectorControl().fragment;need(fragment===base,'Complete frozen f938 fragment required');let out=fragment;for(const [before,after]of cornerVectorEdits())out=once(out,before,after);return out;
}
export function recoverCornerEmissionVector(fragment){
 let out=fragment;for(const [before,after]of cornerVectorEdits().reverse())out=once(out,after,before);need(out===frozenCornerVectorControl().fragment,'Complete f938 inverse failed');return out;
}
export function installCornerEmissionVector(effect){
 need(effect?.root&&typeof effect.root.traverse==='function','Original owned effect root required');const original=frozenCornerVectorControl(),adapted=cornerEmissionVectorFragment(original.fragment),materials=[];
 effect.root.traverse(node=>{if(!node.isMesh)return;const m=node.material;need(m&&!Array.isArray(m)&&m.isShaderMaterial===true&&m.fragmentShader===original.fragment&&m.vertexShader===original.vertex&&m.uniforms?.eaFlameExtinctionCoefficient?.value===0,'Every owned material must match the complete frozen control');need(!materials.includes(m),'Distinct original owned materials required');materials.push(m);});
 need(materials.length===FROZEN_FRAGMENT.materials,'Exact92 owned materials required');
 // ALL materials passed before the first mutation. Wrapper disposes on any failure.
 for(const m of materials){m.fragmentShader=adapted;m.needsUpdate=true;}
 return materials.length;
}
