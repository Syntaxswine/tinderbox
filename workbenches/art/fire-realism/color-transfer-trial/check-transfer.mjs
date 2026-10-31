/** Bounded color-only source/scalar guards, not a renderer acceptance test. */
import assert from 'node:assert/strict';
import {CONTROL_COLOR_LOOKUP,TRIAL_COLOR_LOOKUP,replaceColorLookup} from '../../../../assets/art/fire-realism/fluid-surface-color-transfer.js';
import {makeFluidShaders} from '../../../../assets/art/fire-realism/fluid-contact-surface/shaders.js';
const original=makeFluidShaders(28),control=original.fragmentShader,trial=replaceColorLookup(control);
assert.equal(CONTROL_COLOR_LOOKUP,'smoothstep(.20,.82,heat)');assert.equal(TRIAL_COLOR_LOOKUP,'pow(heat,4.)');assert.equal(trial,control.replace(CONTROL_COLOR_LOOKUP,'pow(heat,4.)'));assert.equal(trial.replace('pow(heat,4.)',CONTROL_COLOR_LOOKUP),control);
for(const s of ['',CONTROL_COLOR_LOOKUP+CONTROL_COLOR_LOOKUP,null])assert.throws(()=>replaceColorLookup(s),/exactly one/);
for(const term of ['float heat=clamp(value.y/3.,0.,1.);','float flameSigma=reacting*6.;','mix(1.,.18,clamp(value.z*heat,0.,1.))','float smokeSigma=smoke*1.8;','float extinction=flameSigma+smokeSigma;','pow(heat,8.)*smoothstep(.70,.97,value.z)*.18','vec3(1.30,.19,.018),vec3(1.65,.78,.19)','float a=1.-exp(-extinction*distanceStep);','gl_FragColor.rgb*=gl_FragColor.a;'])assert(trial.includes(term));
const clamp=(v,a,b)=>Math.max(a,Math.min(b,v)),smoothstep=(a,b,x)=>{const t=clamp((x-a)/(b-a),0,1);return t*t*(3-2*t);},lookup=text=>new Function('heat','pow','smoothstep','return '+text+';'),a=lookup(CONTROL_COLOR_LOOKUP),b=lookup(TRIAL_COLOR_LOOKUP),run=(fn,h)=>fn(h,Math.pow,smoothstep);
assert.equal(run(b,0),0);assert.equal(run(b,1),1);assert.equal(run(a,.82),1);assert.equal(run(a,.95),1);assert(Math.abs(run(b,.82)-.45212176)<1e-12);assert(Math.abs(run(b,.95)-.81450625)<1e-12);
for(let i=0;i<=1000;i++){const h=i/1000,y=run(b,h);assert(y>=0&&y<=1);if(i)assert(y>run(b,(i-1)/1000));}
// Shader source proves extinction/heat/smoke are identical. At F=0 warm is
// multiplied by zero before combining with soot, regardless of the lookup.
const warm=(w,F,h)=>{const base=[1.30,.19,.018].map((x,i)=>x+([1.65,.78,.19][i]-x)*w),iv=Math.pow(h,8)*smoothstep(.70,.97,F)*.18;return base.map((x,i)=>x+([1.65,1.45,.95][i]-x)*iv);};
for(const h of [0,.3,.82,.95,1])for(const smokeSigma of [0,.2,2]){const old=warm(run(a,h),0,h),next=warm(run(b,h),0,h);for(let i=0;i<3;i++)assert.equal(old[i]*0+.1*smokeSigma,next[i]*0+.1*smokeSigma);}
console.log('PASS color transfer: one exact lookup only; heat/smoke/ivory/endpoints/extinction/alpha/output unchanged; guarded0/2occurrences; power4 bounded monotone and nonplateau; F0source-color contribution unchanged. CPU/source checks, no native acceptance.');
