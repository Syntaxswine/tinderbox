import test from 'node:test';
import assert from 'node:assert/strict';
import {createOriginalSupportPorts as create,originalMaterialComponents} from '../../src/simulation/original-support-ports.js';
import {boxTriangles} from '../fixtures/regional-query-data.mjs';
import {clipTriangle} from '../../workbenches/furnished-house/geometry.js';
import {sweptCylinderClear} from '../../src/runtime/collision.js';
const part=(id,min,max)=>({id,ownerId:id,role:id==='roof'?'roof-covering':'timber-fitting',triangles:boxTriangles(min,max)});
const fragment=(p,mode='cold',recordId='native/'+p.id)=>({id:mode+'/'+p.id,recordId,partId:p.id,ownerId:p.ownerId,component:0,mode,primitives:p.triangles.map((_,i)=>i),triangles:p.triangles});
const endpoint=(p,point,extra={})=>({partId:p.id,point,nativeRecordId:'native/'+p.id,...extra});
function saddle(){
  const cornice=part('cornice',[0,0,0],[.5,1,1]),roof=part('roof',[.75,0,0],[1,1.2,1]),fitting=part('fitting',[0,1,0],[1,1.1,1]),upper=part('upper',[0,1.1,0],[1,1.2,1]),parts=[cornice,roof,fitting,upper];
  const bonds=[{id:'bottom-cornice',kind:'bearing-face',direction:'parent-to-child',parent:endpoint(cornice,[.25,1,.5]),child:endpoint(fitting,[.25,1,.5])},{id:'bottom-roof',kind:'fixed-embed',direction:'parent-to-child',parent:endpoint(roof,[.875,1.05,.5]),child:endpoint(fitting,[.875,1.05,.5])},{id:'top',kind:'bearing-face',direction:'parent-to-child',parent:endpoint(fitting,[.25,1.1,.5]),child:endpoint(upper,[.25,1.1,.5])}];
  return {parts,bonds,requirements:[{id:'saddle',ownerId:'fitting',portIds:['bottom-cornice','bottom-roof'],upperBondId:'top'}],anchors:[{partId:'cornice',elevation:0},{partId:'roof',elevation:0}]};
}

test('both fixed lower ports and directed top give equal cold and native support',()=>{
  const input=saddle(),p=create(input);try{for(const mode of ['cold','native']){const result=p.evaluate({revision:0,fragments:input.parts.map(x=>fragment(x,mode)),bornRecordIds:['native/fitting']});assert.deepEqual(result.unrootedIds,[]);if(mode==='native')assert.equal(result.births[0].state,'supported');else assert.equal(result.births.length,0);assert.ok(result.ports.every(p=>p.live));assert.equal(input.parts[1].role,'roof-covering');}}finally{p.dispose();}
});

test('loss of either original lower port leaves the fitting and its upper unrooted',()=>{
  for(const lost of ['cornice','roof']){const input=saddle(),p=create(input);try{const result=p.evaluate({revision:1,fragments:input.parts.filter(p=>p.id!==lost).map(p=>fragment(p,'native')),bornRecordIds:['native/fitting']});assert.ok(result.unrootedIds.includes('native/fitting'));assert.ok(result.unrootedIds.includes('native/upper'));assert.equal(result.births[0].state,'unrooted');}finally{p.dispose();}}
});

test('upper and descendants cannot manufacture independently rooted roof support',()=>{
  const input=saddle();input.anchors=[{partId:'cornice',elevation:0},{partId:'upper',elevation:1.1}];input.bonds.push({id:'old-upper-roof',kind:'fixed-embed',direction:'parent-to-child',parent:endpoint(input.parts[3],[.875,1.15,.5]),child:endpoint(input.parts[1],[.875,1.15,.5])});const p=create(input);try{const result=p.evaluate({revision:1,fragments:input.parts.map(x=>fragment(x))});assert.ok(result.supportedIds.includes('cold/roof'));assert.ok(result.unrootedIds.includes('cold/fitting'));assert.ok(result.oldEdgeConflicts.length>0);}finally{p.dispose();}
});

test('same-cell sibling cannot replace a retired fixed native owner',()=>{
  const input=saddle(),p=create(input);try{const pieces=input.parts.map(x=>fragment(x,'native'));pieces[0]={...pieces[0],id:'native/survivor',recordId:'different-native-cornice'};const result=p.evaluate({revision:2,fragments:pieces});assert.ok(result.unrootedIds.includes('native/fitting'));assert.equal(result.ports.find(p=>p.id==='bottom-cornice').live,false);}finally{p.dispose();}
});

test('both lower ports cannot root a fitting after its own material path separates',()=>{
  const input=saddle();input.bonds[0].child.nativeRecordId='fitting-left';input.bonds[1].child.nativeRecordId='fitting-right';input.bonds[2].parent.nativeRecordId='fitting-left';const p=create(input);try{
    const f=input.parts[2],cut=(id,min,max)=>({...fragment(f,'native',id),id,triangles:f.triangles.flatMap(t=>clipTriangle(t,{min,max}))}),left=cut('fitting-left',[0,1,0],[.5,1.1,1]),right=cut('fitting-right',[.75,1,0],[1,1.1,1]),fragments=[fragment(input.parts[0],'native'),fragment(input.parts[1],'native'),left,right,fragment(input.parts[3],'native')],result=p.evaluate({revision:2,fragments,bornRecordIds:['fitting-left','fitting-right']});
    assert.ok(result.ports.find(p=>p.id==='bottom-cornice').live&&result.ports.find(p=>p.id==='bottom-roof').live);assert.ok(result.births.every(b=>b.state==='unrooted'));assert.ok(result.unrootedIds.includes('native/upper'));
  }finally{p.dispose();}
});

test('actual surviving material connects cold and native fragments and cannot bridge a retired gap',()=>{
  const original=part('bar',[0,1,0],[3,2,1]),post=part('post',[0,0,0],[1,1,1]),p=create({parts:[original,post],bonds:[{id:'left-bearing',kind:'bearing-face',direction:'parent-to-child',parent:endpoint(post,[.5,1,.5]),child:endpoint(original,[.5,1,.5])}],anchors:[{partId:'post',elevation:0}]});try{
    const pieces=[0,1,2].map((x)=>{const triangles=[],primitives=[];for(const [i,t]of original.triangles.entries()){const clipped=clipTriangle(t,{min:[x,1,0],max:[x+1,2,1]});if(clipped.length){triangles.push(...clipped);primitives.push(i);}}return {...fragment(original,x===2?'native':'cold'),id:'piece/'+x,recordId:'record/'+x,triangles,primitives};});
    // Only original exterior facets are clipped. No cell-plane cap is added.
    const [a,mid,z]=pieces;assert.deepEqual(p.evaluate({revision:0,fragments:[fragment(post),a,mid,z]}).unrootedIds,[]);const lost=p.evaluate({revision:1,fragments:[fragment(post),a,z],bornRecordIds:[z.recordId]});assert.ok(lost.unrootedIds.includes(z.id));assert.equal(lost.births[0].state,'unrooted');
  }finally{p.dispose();}
});

test('disconnected original material, real gaps and mismatched strict witnesses reject false bonds',()=>{
  const a=part('a',[0,0,0],[1,1,1]),b=part('b',[2,0,0],[3,1,1]);assert.equal(originalMaterialComponents([...a.triangles,...b.triangles]).length,2);
  assert.throws(()=>create({parts:[a,b],bonds:[{id:'gap',kind:'bearing-face',direction:'parent-to-child',parent:endpoint(a,[1,.5,.5]),child:endpoint(b,[2,.5,.5])}]}),/Separated/);
  assert.throws(()=>create({parts:[a,b],bonds:[{id:'fake-embed',kind:'fixed-embed',direction:'parent-to-child',parent:endpoint(a,[.5,.5,.5]),child:endpoint(b,[2.5,.5,.5])}]}),/common/);
  const hollow={...part('hollow',[0,0,0],[3,3,3]),triangles:[...boxTriangles([0,0,0],[3,3,3]),...boxTriangles([1,1,1],[2,2,2]).map(t=>[...t].reverse())]},peg=part('peg',[1.2,1.2,1.2],[1.8,1.8,1.8]),point=[1.5,1.5,1.5];assert.equal(sweptCylinderClear({x:1.5,y:1.5},{x:1.5,y:1.5},0,1.5,1.5,{triangles:hollow.triangles,closed:true}),true);
  assert.throws(()=>create({parts:[hollow,peg],bonds:[{id:'void',kind:'fixed-embed',direction:'parent-to-child',parent:endpoint(hollow,point),child:endpoint(peg,point)}]}),/void/);
});

test('fixed jambs support headers, moving leaves do not brace them, and reset invalidates generations',()=>{
  const jamb=part('jamb',[0,0,0],[.1,2,1]),header=part('header',[0,2,0],[1,2.1,1]),leaf=part('leaf',[.1,0,0],[1,2,.1]),input={parts:[jamb,header,leaf],bonds:[{id:'fixed-header',kind:'bearing-face',direction:'parent-to-child',parent:endpoint(jamb,[.05,2,.5]),child:endpoint(header,[.05,2,.5])}],anchors:[{partId:'jamb',elevation:0}]},p=create(input);try{
    assert.ok(p.evaluate({revision:0,fragments:input.parts.map(x=>fragment(x))}).supportedIds.includes('cold/header'));assert.ok(p.evaluate({revision:1,fragments:[fragment(header),fragment(leaf)]}).unrootedIds.includes('cold/header'));p.reset();assert.throws(()=>p.evaluate({expectedGeneration:0,revision:0,fragments:[]}),/Stale/);p.dispose();assert.equal(p.diagnostics().bindings,0);assert.throws(()=>p.bindings(),/disposed/);
  }finally{p.dispose();}
});
