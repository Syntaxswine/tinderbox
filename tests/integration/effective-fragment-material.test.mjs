import test from 'node:test';
import assert from 'node:assert/strict';
import {createOriginalSupportPorts,originalMaterialComponents} from '../../src/simulation/original-support-ports.js';
import {boxTriangles} from '../fixtures/regional-query-data.mjs';
import {clipTriangle,triangleArea,EPS} from '../../workbenches/furnished-house/geometry.js';

const empty=[[0,0,0],[0,0,0],[1,0,0]];
function fixture(){
  const part={id:'post',ownerId:'post',triangles:[empty,...boxTriangles([0,0,0],[1,2,1])]},component=originalMaterialComponents(part.triangles)[0],primitives=[],upper=[];
  for(const i of component.primitives){const ts=clipTriangle(part.triangles[i],{min:[-1,1,-1],max:[2,3,2]}).filter(t=>triangleArea(t)>0);if(ts.length){primitives.push(i);upper.push(...ts);}}
  const core=createOriginalSupportPorts({parts:[part],bonds:[],anchors:[{partId:part.id,elevation:0}]}),fragment={id:'surviving-upper',partId:part.id,ownerId:part.ownerId,component:0,mode:'cold',primitives,triangles:upper};
  return {part,component,core,fragment,upper};
}
const materialError=e=>e.message==='Finite positive-area effective fragment triangles required';

test('architect repro: an original empty face cannot reground the upper fragment after actual foundation loss',()=>{
  const {part,component,core,fragment,upper}=fixture();try{
    assert.equal(Math.min(...upper.flat().map(p=>p[1])),1);assert.equal(fragment.primitives.includes(0),false);
    const original={...fragment,primitives:component.primitives,triangles:component.primitives.map(i=>part.triangles[i])};assert.deepEqual(core.evaluate({revision:0,fragments:[original]}).supportedIds,['surviving-upper']);
    const clean=core.evaluate({revision:1,fragments:[fragment]});assert.deepEqual(clean.supportedIds,[]);assert.deepEqual(clean.unrootedIds,['surviving-upper']);
    assert.throws(()=>core.evaluate({revision:1,fragments:[{...fragment,triangles:[...upper,empty]}]}),materialError);
    assert.deepEqual(core.evaluate({revision:2,fragments:[fragment]}).supportedIds,[]);
  }finally{core.dispose();}
});

test('effective admission rejects malformed/nonfinite/zero-area geometry before support, but retains positive EPS-small patches',()=>{
  const {core,fragment}=fixture();try{
    for(const bad of [empty,[[0,0,0],[1,0,0],[2,0,0]],[[0,0,0],[1,0,0],[0,NaN,0]],[[0,0,0],[1,0,0],[0,Infinity,0]],[[0,0,0],[1e308,0,0],[0,1e308,0]],[[0,0,0],[1e-200,0,0],[0,1e-200,0]],[[0,0,0],[1,0,0]],null])assert.throws(()=>core.evaluate({revision:1,fragments:[{...fragment,triangles:[...fragment.triangles,bad]}]}),materialError);
    assert.throws(()=>core.evaluate({revision:1,fragments:[{...fragment,triangles:'not triangles'}]}),materialError);
    const small=[[0,1,0],[1e-4,1,0],[0,1,1e-4]];assert.ok(triangleArea(small)>0&&triangleArea(small)<=EPS);assert.deepEqual(core.evaluate({revision:1,fragments:[{...fragment,triangles:[small]}]}).supportedIds,[]);
  }finally{core.dispose();}
});

test('positive-area internal caps remain admissible without inventing missing foundation material',()=>{
  const {core,fragment}=fixture();try{
    // Explicit supplied current-solid test fixture; the support core generates no caps.
    const solidTriangles=boxTriangles([0,1,0],[1,2,1]),caps=solidTriangles.filter(t=>t.every(p=>p[1]===1));assert.equal(caps.length,2);assert.ok(caps.every(t=>triangleArea(t)>0));
    for(const mode of ['cold','native']){const result=core.evaluate({revision:1,fragments:[{...fragment,mode,recordId:'native/post',triangles:[...fragment.triangles,...caps],solidTriangles}]});assert.deepEqual(result.supportedIds,[]);assert.deepEqual(result.unrootedIds,['surviving-upper']);}
  }finally{core.dispose();}
});
