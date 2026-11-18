import test from 'node:test';
import assert from 'node:assert/strict';
import {createOriginalSupportPorts as create} from '../../src/simulation/original-support-ports.js';
import {boxTriangles} from '../fixtures/regional-query-data.mjs';
const part=(id,min,max)=>({id,ownerId:id,triangles:boxTriangles(min,max)});
const fragment=(p,mode)=>({id:mode+'/'+p.id,partId:p.id,ownerId:p.ownerId,component:0,mode,recordId:'native/'+p.id,primitives:p.triangles.map((_,i)=>i),triangles:p.triangles});
const endpoint=(p,point)=>({partId:p.id,point,nativeRecordId:'native/'+p.id});
const bearing=(id,a,b,point)=>({id,kind:'bearing-face',direction:'parent-to-child',parent:endpoint(a,point),child:endpoint(b,point)});
function twoFittings(){
  const a=part('a-post',[0,0,0],[.4,1,1]),z=part('z-post',[.6,0,0],[1,1,1]),fa=part('fit-a',[0,1,0],[1,1.1,1]),column=part('a-upper-column',[0,1.1,0],[.4,2,1]),post=part('b-post',[.6,0,0],[1,2,1]),fb=part('fit-b',[0,2,0],[1,2.1,1]),upper=part('b-upper',[0,2.1,0],[1,2.2,1]);
  return {parts:[a,z,fa,column,post,fb,upper],bonds:[bearing('a-left',a,fa,[.2,1,.5]),bearing('a-right',z,fa,[.8,1,.5]),bearing('a-top',fa,column,[.2,1.1,.5]),bearing('b-left',column,fb,[.2,2,.5]),bearing('b-right',post,fb,[.8,2,.5]),bearing('b-top',fb,upper,[.2,2.1,.5])],requirements:[{id:'a-all',ownerId:fa.id,portIds:['a-left','a-right'],upperBondId:'a-top'},{id:'b-all',ownerId:fb.id,portIds:['b-left','b-right'],upperBondId:'b-top'}],anchors:[a,z,post].map(p=>({partId:p.id,elevation:0}))};
}

test('UI repro: unrelated valid ALL requirements can independently carry another fitting',()=>{
  for(const mode of ['cold','native'])for(const reverse of [false,true]){const input=twoFittings();if(reverse)input.requirements.reverse();const api=create(input);try{
    const result=api.evaluate({expectedGeneration:0,revision:0,fragments:input.parts.map(p=>fragment(p,mode))});
    assert.ok(result.ports.every(p=>p.live));assert.deepEqual(result.oldEdgeConflicts,[]);assert.deepEqual(result.unrootedIds,[]);
  }finally{api.dispose();}}
});

test('removing independent lower grounding still leaves both dependent ALL fittings unrooted',()=>{
  const input=twoFittings();input.anchors=input.anchors.filter(a=>a.partId!=='a-post');const api=create(input);try{
    const result=api.evaluate({revision:0,fragments:input.parts.map(p=>fragment(p,'cold'))});
    assert.ok(result.ports.every(p=>p.live));for(const id of ['fit-a','a-upper-column','fit-b','b-upper'])assert.ok(result.unrootedIds.includes('cold/'+id));
  }finally{api.dispose();}
});

test('UI repro: caller mutation cannot relocate captured original grounding',()=>{
  const ground=part('ground',[0,0,0],[1,1,1]),floating=part('floating',[0,2,0],[1,3,1]),anchor={partId:ground.id,elevation:0,component:0},anchors=[anchor],parts=[ground,floating],api=create({parts,bonds:[],anchors});try{
    const options={expectedGeneration:0,revision:0,fragments:parts.map(p=>fragment(p,'cold'))},before=api.evaluate(options);
    assert.deepEqual(before.supportedIds,['cold/ground']);assert.deepEqual(before.unrootedIds,['cold/floating']);
    anchor.partId=floating.id;anchor.elevation=2;anchor.component=99;anchors.splice(0,1,{partId:floating.id,elevation:2});
    assert.deepEqual(api.evaluate(options),before);assert.equal(Object.isFrozen(anchor),false);
  }finally{api.dispose();}
});

test('original anchors require a named original part, finite elevation and valid component',()=>{
  const p=part('ground',[0,0,0],[1,1,1]);
  for(const anchor of [{partId:'missing',elevation:0},{partId:p.id,elevation:NaN},{partId:p.id,elevation:Infinity},{partId:p.id,elevation:0,component:99},{partId:p.id,elevation:0,component:-1},{partId:p.id,elevation:0,component:.5}])assert.throws(()=>create({parts:[p],bonds:[],anchors:[anchor]}),/Original anchor/);
  assert.throws(()=>create({parts:[p],bonds:[],anchors:null}),/Original anchor/);
});
