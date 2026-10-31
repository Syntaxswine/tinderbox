/** Scientific scalar/transfer guards, not image or GPU acceptance. */
import assert from 'node:assert/strict';
import {CONTROL_SOOT_TRANSFER,TRIAL_SOOT_TRANSFER,replaceSootTransfer} from '../../../../assets/art/fire-realism/fluid-surface-soot-transfer.js';
import {makeFluidShaders} from '../../../../assets/art/fire-realism/fluid-contact-surface/shaders.js';
const original=makeFluidShaders(28),trial=replaceSootTransfer(original.fragmentShader),expected='mix(1.,.18,smoothstep(.05,.35,clamp(value.z,0.,1.)))';
assert.equal(TRIAL_SOOT_TRANSFER,expected);assert.equal(CONTROL_SOOT_TRANSFER,'mix(1.,.18,clamp(value.z*heat,0.,1.))');assert.equal(trial,original.fragmentShader.replace(CONTROL_SOOT_TRANSFER,expected));assert.equal(trial.split(expected).length,2);
for(const text of ['',CONTROL_SOOT_TRANSFER+CONTROL_SOOT_TRANSFER])assert.throws(()=>replaceSootTransfer(text),/exactly one/);assert.throws(()=>replaceSootTransfer(null),/exactly one/);
const clamp=(v,a,b)=>Math.max(a,Math.min(b,v)),mix=(a,b,x)=>a*(1-x)+b*x,smoothstep=(a,b,x)=>{const t=clamp((x-a)/(b-a),0,1);return t*t*(3-2*t);},evaluate=expression=>new Function('value','heat','clamp','mix','smoothstep','return '+expression+';'),all=evaluate(CONTROL_SOOT_TRANSFER),changed=evaluate(TRIAL_SOOT_TRANSFER),run=(fn,F,heat)=>fn({z:F},heat,clamp,mix,smoothstep);
for(const heat of [0,.3,.65,1])for(const density of [0,.1,1,4])for(const gain of [0,.5,1])assert.equal(1.8*density*gain*run(all,0,heat),1.8*density*gain*run(changed,0,heat));
assert(Math.abs(run(all,.3,.65)-.8401)<1e-12);assert(Math.abs(run(changed,.3,.65)-.2407407407407408)<1e-12);assert.equal(run(changed,.05,.9),1);assert(Math.abs(run(changed,.35,.1)-.18)<1e-12);
for(let i=0;i<=100;i++){const F=i/100,value=run(changed,F,.5);assert(value>=.18-1e-15&&value<=1);if(i)assert(value<=run(changed,(i-1)/100,.5));}assert(Math.abs(run(changed,.05+1e-8,.1)-run(changed,.05-1e-8,.1))<1e-12);
console.log('PASS transfer: one exact replacement, zero/duplicate refusal, unchangedF0/cold and zero-gain smoke, declared moderateF attenuation, bounded smooth monotone defaults. CPU scalar checks are not rendered acceptance.');
