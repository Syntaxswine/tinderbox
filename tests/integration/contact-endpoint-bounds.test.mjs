import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import {prepareOriginalContacts,bindOriginalContact} from '../../src/content/original-contact-adapter.js';
import {contactSeam} from '../fixtures/original-contact-seam.mjs';
import {bounds,clipTriangle} from '../../workbenches/furnished-house/geometry.js';
const original=JSON.parse(fs.readFileSync('docs/engineering/shared-maps/repeated-contact-adapter-v1/input.json'));
function fixture(shared=null){const contact=structuredClone(original.contacts[0]),ids=new Set([contact.parent.partId,contact.child.partId]);if(shared===undefined)delete contact.selector;else contact.selector=shared;contact.parent.selector.min[0]=33.25;contact.parent.selector.max[0]=33.75;contact.child.selector.min[0]=33.4;contact.child.selector.max[0]=33.6;return structuredClone({...original,parts:original.parts.filter(p=>ids.has(p.id)),surfaces:original.surfaces.filter(s=>ids.has(s.nativePartId)),contacts:[contact]});}
const reject=e=>e.diagnostic?.reason==='selector-unsupported';

test('null and absent shared selectors preserve original endpoint bounds and history',()=>{
  for(const absent of [false,true]){const data=fixture();if(absent)delete data.contacts[0].selector;const prep=prepareOriginalContacts(data);try{assert.deepEqual(prep.report().rejected,[]);const p=prep.proof(data.contacts[0].id);assert.equal(Object.hasOwn(p,'selector'),!absent);if(!absent)assert.equal(p.selector,null);assert.deepEqual(p.ends.parent.selector,data.contacts[0].parent.selector);assert.deepEqual(p.ends.child.selector,data.contacts[0].child.selector);assert.notDeepEqual(p.ends.parent.selector,p.ends.child.selector);assert.deepEqual(p.historicalVolume,data.contacts[0].historicalVolume);}finally{prep.dispose();}}
});

test('both original endpoint bounds remain mandatory, finite, ordered and containing the fixed point',()=>{
  for(const side of ['parent','child'])for(const mode of ['missing','null','nonfinite','inverted','outside']){const data=fixture(),end=data.contacts[0][side];if(mode==='missing')delete end.selector;if(mode==='null')end.selector=null;if(mode==='nonfinite')end.selector.min[0]=NaN;if(mode==='inverted')end.selector.min[0]=end.selector.max[0]+1;if(mode==='outside')end.selector.max[0]=data.contacts[0].point[0]-.01;const prep=prepareOriginalContacts(data);try{assert.equal(prep.report().prepared.length,0);assert.equal(prep.report().rejected.length,1);assert.throws(()=>prep.proof(data.contacts[0].id),reject);}finally{prep.dispose();}}
});

test('native patches clip by each endpoint and additionally by any supplied shared selector',()=>{
  for(const shared of [null,{min:[33.45,8.12,25.9],max:[33.55,8.34,26]}]){const data=fixture(shared),prep=prepareOriginalContacts(data);let binding;try{const proof=prep.proof(data.contacts[0].id),seam=contactSeam(data,[proof]),removed={};
    for(const side of ['parent','child']){const end=proof.ends[side],triangle=data.parts.find(p=>p.id===end.partId).triangles[end.primitive],b=bounds(triangle),limit=shared?shared.min[0]-.01:end.selector.min[0]-.01,box={min:[Math.max(b.min[0],end.selector.min[0]-.1),b.min[1],b.min[2]],max:[limit,b.max[1],b.max[2]]},far=clipTriangle(triangle,box);assert.ok(far.length);const entry=seam.entry(seam.id(proof,side)),ts=end.channel==='solid'?entry.record.solidTriangles:entry.record.triangles;removed[side]=far.map((t,i)=>ts.length+i);ts.push(...far);}
    binding=bindOriginalContact({proof,...seam.args()});assert.equal(binding.evaluate({revision:0}).live,true);for(const side of ['parent','child'])assert.ok(removed[side].every(i=>!binding.binding().ends[side].nativePrimitives.includes(i)));
  }finally{binding?.dispose();prep.dispose();}}
  const data=fixture({min:[33,8.12,25.9],max:[33.49,8.34,26]}),prep=prepareOriginalContacts(data);try{assert.equal(prep.report().prepared.length,0);assert.equal(prep.report().rejected.length,1);}finally{prep.dispose();}
});

test('null shared selector keeps exact retirement/proof guards and still rejects explicit ranges',()=>{
  const data=fixture(),prep=prepareOriginalContacts(data);let b;try{const proof=prep.proof(data.contacts[0].id),seam=contactSeam(data,[proof]);b=bindOriginalContact({proof,...seam.args()});assert.equal(b.evaluate({revision:0}).live,true);assert.equal(b.evaluate({revision:1,retireRecords:[seam.neighborId]}).live,true);assert.equal(b.evaluate({revision:1,retireRecords:[seam.id(proof,'parent')]}).live,false);assert.equal(b.evaluate({revision:1,retireRecords:[seam.id(proof,'child')]}).live,false);assert.deepEqual(b.evaluate({revision:0}).supportedIds,[]);const copy=structuredClone(proof);copy.ends.parent.sourceCell[0]--;assert.throws(()=>bindOriginalContact({proof:copy,...seam.args()}),e=>e.diagnostic?.reason==='validated-original-proof-required');}finally{b?.dispose();prep.dispose();}
  const ranged=fixture();ranged.contacts[0].parent.sourceRange={start:3,count:3};const p=prepareOriginalContacts(ranged);try{assert.equal(p.report().prepared.length,0);assert.equal(p.report().rejected[0].reason,'source-range-not-supported');}finally{p.dispose();}
});
