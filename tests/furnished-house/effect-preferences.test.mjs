import test from 'node:test';
import assert from 'node:assert/strict';
import {DEFAULT_EFFECTS,normalizeEffects,createEffectPreferences} from '../../workbenches/furnished-house/effect-preferences.js';

const key='tinderbox.furnished-house.effects.v1',on={flames:true,smoke:true,lighting:true};
function memory(initial){const data=new Map(Object.entries(initial||{})),writes=[];return {data,writes,getItem:k=>data.get(k)??null,setItem(k,v){writes.push([k,v]);data.set(k,v);}};}

test('effects default on and normalize only known own booleans into detached snapshots',()=>{
  assert.deepEqual(DEFAULT_EFFECTS,on);assert.ok(Object.isFrozen(DEFAULT_EFFECTS));
  assert.deepEqual(normalizeEffects({flames:false,smoke:0,lighting:'false',speed:0}),{...on,flames:false});
  for(const value of [null,undefined,12,'false',[],Object.create({flames:false})])assert.deepEqual(normalizeEffects(value),on);
  assert.deepEqual(normalizeEffects({get flames(){throw Error('invalid');},smoke:false}),{...on,smoke:false});
  const a=normalizeEffects();a.flames=false;assert.deepEqual(normalizeEffects(),on);
});

test('partial changes preserve current values, notify once per real change and isolate every reader',()=>{
  const storage=memory(),p=createEffectPreferences({storage}),seen=[];
  const stop=p.subscribe(value=>{seen.push({...value});value.flames='mutated';});
  const initial=p.snapshot();initial.smoke=false;assert.deepEqual(p.snapshot(),on);
  const changed=p.set({flames:false,lighting:false});changed.smoke=false;
  p.set({flames:'true',smoke:null,lighting:false,worldScale:0});p.set(null);p.set([]);
  assert.deepEqual(p.snapshot(),{flames:false,smoke:true,lighting:false});
  assert.deepEqual(seen,[on,{flames:false,smoke:true,lighting:false}]);assert.equal(storage.writes.length,1);
  stop();stop();p.set({smoke:false});assert.equal(seen.length,2);
  assert.deepEqual(JSON.parse(storage.data.get(key)),{flames:false,smoke:false,lighting:false});
  p.dispose();
});

test('refresh restores the separate settings namespace and malformed storage keeps usable defaults',()=>{
  const storage=memory({'tinderbox.save.v1':'existing-save','farmyard.settings':'donor-choice'}),p=createEffectPreferences({storage});
  p.set({smoke:false});p.dispose();assert.deepEqual(createEffectPreferences({storage}).snapshot(),{...on,smoke:false});
  assert.equal(storage.data.get('tinderbox.save.v1'),'existing-save');assert.equal(storage.data.get('farmyard.settings'),'donor-choice');
  assert.deepEqual(storage.writes.map(([k])=>k),[key]);
  for(const invalid of ['broken json','null','[]','5','false','"off"'])assert.deepEqual(createEffectPreferences({storage:memory({[key]:invalid})}).snapshot(),on);
  assert.deepEqual(createEffectPreferences({storage:memory({[key]:'{"flames":false,"smoke":"off","unknown":false}'})}).snapshot(),{...on,flames:false});
});

test('blocked default storage, read failures and quota failures do not block in-memory changes',()=>{
  const previous=Object.getOwnPropertyDescriptor(globalThis,'localStorage');let accesses=0;
  try{
    Object.defineProperty(globalThis,'localStorage',{configurable:true,get(){accesses++;throw Error('SecurityError');}});
    const explicit=createEffectPreferences({storage:null});explicit.set({smoke:false});assert.equal(accesses,0);
    const blocked=createEffectPreferences();blocked.set({lighting:false});assert.deepEqual(blocked.snapshot(),{...on,lighting:false});assert.equal(accesses,1);
    const backing=memory({[key]:'{"smoke":false}'});Object.defineProperty(globalThis,'localStorage',{configurable:true,value:backing});
    const defaults=createEffectPreferences();assert.deepEqual(defaults.snapshot(),{...on,smoke:false});defaults.set({lighting:false});
    assert.deepEqual(createEffectPreferences().snapshot(),{flames:true,smoke:false,lighting:false});
    const p=createEffectPreferences({storage:{getItem(){throw Error('read denied');},setItem(){throw Error('QuotaExceededError');}}}),seen=[];
    p.subscribe(value=>seen.push(value));assert.doesNotThrow(()=>p.set({flames:false}));assert.deepEqual(seen,[on,{...on,flames:false}]);
  }finally{if(previous)Object.defineProperty(globalThis,'localStorage',previous);else delete globalThis.localStorage;}
});

test('disposal disconnects subscribers and stale setters cannot write or notify',()=>{
  const storage=memory(),p=createEffectPreferences({storage}),seen=[];p.subscribe(value=>seen.push(value));p.set({lighting:false});p.dispose();p.dispose();
  const writes=storage.writes.length;p.set({flames:false});p.subscribe(()=>{throw Error('disposed callback');});
  assert.equal(storage.writes.length,writes);assert.equal(seen.length,2);assert.deepEqual(p.snapshot(),{...on,lighting:false});
  assert.throws(()=>createEffectPreferences({storage:null}).subscribe(null),TypeError);
});
