import test from 'node:test';
import assert from 'node:assert/strict';
import {catalogueFrameView} from '../../art/source/catalogue-modular/frame-view.js';

const keys=['boundaries','supports','items','parts','falls','rubble','fireSamples','occupancy','events','tombstones'];
const frame=()=>({version:1,revision:3,worldTime:4,full:false,catalogueModules:{version:1,generation:0},...Object.fromEntries(keys.map(key=>[key,[{id:key+'-b',ownerInstanceId:'b'},{id:key+'-a',ownerInstanceId:'a'},{id:key+'-b2',ownerInstanceId:'b'},{id:key+'-terrain',ownerInstanceId:'terrain'}]]))});

test('one-pass owner views preserve every collection order, borrowed row identity and detached selection arrays',()=>{
  const source=frame(),before=JSON.stringify(source),a=catalogueFrameView(source,'a'),b=catalogueFrameView(source,'b');
  for(const key of keys){assert.deepEqual(a[key],source[key].filter(r=>r.ownerInstanceId==='a'));assert.deepEqual(b[key],source[key].filter(r=>r.ownerInstanceId==='b'));assert.notEqual(b[key],source[key]);assert.equal(b[key][0],source[key][0]);}
  assert.equal(a.catalogueModules,source.catalogueModules);assert.equal(catalogueFrameView(source,'b'),b);assert.equal(JSON.stringify(source),before);
  const absent=catalogueFrameView(source,'absent');assert.ok(keys.every(k=>absent[k].length===0));
  b.boundaries.pop();assert.equal(source.boundaries.length,4);assert.equal(a.boundaries.length,1);
});

test('new arrays, revision/time/full changes and reset metadata invalidate every cached owner partition',()=>{
  const source=frame();let previous=catalogueFrameView(source,'b');
  for(const change of [()=>{source.fireSamples=[...source.fireSamples,{id:'new',ownerInstanceId:'b'}];},()=>{source.revision++;},()=>{source.worldTime=.5;},()=>{source.full=true;},()=>{source.catalogueModules={version:1,generation:1};}]){
    change();const current=catalogueFrameView(source,'b');assert.notEqual(current,previous);assert.deepEqual(current.fireSamples,source.fireSamples.filter(r=>r.ownerInstanceId==='b'));previous=current;
  }
  assert.equal(previous.fireSamples.at(-1).id,'new');
});

test('a shared frame scan partitions each input collection once across all owner visits',()=>{
  const source=frame();let reads=0;for(const key of keys)source[key]=source[key].map(row=>{const id=row.ownerInstanceId;return {id:row.id,get ownerInstanceId(){reads++;return id;}};});
  for(const owner of ['a','b','terrain','unmapped'])catalogueFrameView(source,owner);
  assert.equal(reads,keys.length*4);
});
