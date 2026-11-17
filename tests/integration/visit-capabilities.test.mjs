import test from 'node:test';
import assert from 'node:assert/strict';
import {visitCapabilities,restrictedCapabilities,GAMEPLAY_CAPABILITIES,SHARED_MAP_CAPABILITIES,EXPLORATION_CAPABILITIES} from '../../src/content/visit-capabilities.js';
test('factory capabilities preserve identity and only factory-enabled flags can restrict and restore',()=>{
  assert.equal(visitCapabilities(SHARED_MAP_CAPABILITIES),SHARED_MAP_CAPABILITIES);
  const input={...SHARED_MAP_CAPABILITIES},owned=visitCapabilities(input);assert.notEqual(owned,input);assert.ok(Object.isFrozen(owned));
  assert.equal(restrictedCapabilities(owned,{...owned,tools:false,health:false}).tools,false);
  assert.equal(restrictedCapabilities(owned,owned),owned);
  assert.throws(()=>restrictedCapabilities(GAMEPLAY_CAPABILITIES,SHARED_MAP_CAPABILITIES),/ceiling/);
  assert.throws(()=>restrictedCapabilities(SHARED_MAP_CAPABILITIES,EXPLORATION_CAPABILITIES),/ceiling/);
  assert.throws(()=>visitCapabilities({...EXPLORATION_CAPABILITIES,tools:true}),/Exploration/);
  assert.throws(()=>visitCapabilities({...GAMEPLAY_CAPABILITIES,unexpected:true}),/Invalid/);
});
