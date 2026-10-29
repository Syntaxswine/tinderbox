import test from 'node:test';
import assert from 'node:assert/strict';
import {createInterfacePreferences} from '../../src/ui/preferences.js';

test('interface preferences accept only known booleans and expose immutable snapshots',()=>{
  const preferences=createInterfacePreferences({reduceMotion:true,highContrast:'yes',audio:1});
  assert.deepEqual(preferences.get(),{reduceMotion:true,highContrast:false});
  assert.throws(()=>{preferences.get().reduceMotion=false;},TypeError);
  assert.deepEqual(preferences.update({reduceMotion:'false',unknown:true}),{reduceMotion:true,highContrast:false});
});
test('preference changes notify once and preserve other choices across partial updates',()=>{
  const preferences=createInterfacePreferences(),seen=[];
  preferences.subscribe(value=>seen.push(value));
  preferences.update({highContrast:true});preferences.update({highContrast:true});
  preferences.update({reduceMotion:true});
  assert.deepEqual(seen,[{reduceMotion:false,highContrast:true},{reduceMotion:true,highContrast:true}]);
});
test('unsubscribed interface views stop receiving changes without resetting the session',()=>{
  const preferences=createInterfacePreferences(),seen=[];
  const stop=preferences.subscribe(value=>seen.push(value));
  preferences.update({highContrast:true});stop();stop();preferences.update({reduceMotion:true});
  assert.equal(seen.length,1);
  assert.deepEqual(preferences.get(),{reduceMotion:true,highContrast:true});
});
