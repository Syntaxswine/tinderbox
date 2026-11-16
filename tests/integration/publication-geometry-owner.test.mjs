import test from 'node:test';
import assert from 'node:assert/strict';
import {createOwnedPublicationGeometry,isOwnedPublicationGeometry} from '../../src/reuse/publication-geometry.js';

const geometry=()=>[[[0,-0,1],[2,3,4],[5,6,7]]];
const freeze=value=>{if(value&&typeof value==='object'){for(const child of Object.values(value))freeze(child);Object.freeze(value);}return value;};

test('only the factory-owned deep immutable copy carries proof; inputs and equivalent frozen arrays cannot forge it',()=>{
  const input=geometry(),before=structuredClone(input),copy=createOwnedPublicationGeometry(input);
  assert.deepEqual(copy,before);assert.notEqual(copy,input);assert.notEqual(copy[0][0],input[0][0]);assert.equal(isOwnedPublicationGeometry(copy),true);
  for(const value of [input,copy[0],copy[0][0],freeze(geometry()),{ownedPublicationGeometry:true},new Proxy(copy,{}),null,undefined,1])assert.equal(isOwnedPublicationGeometry(value),false);
  assert.deepEqual(Reflect.ownKeys(copy),Reflect.ownKeys(input));assert.ok(Object.is(copy[0][0][1],-0));
  assert.ok(Object.isFrozen(copy)&&Object.isFrozen(copy[0])&&Object.isFrozen(copy[0][0]));assert.throws(()=>{copy[0][0][0]=9;},{name:'TypeError'});
  input[0][0][0]=99;assert.deepEqual(copy,before);assert.ok(!Object.isFrozen(input)&&!Object.isFrozen(input[0][0]));
});

test('the single structured clone detaches accessor values and rejects Proxy inputs instead of granting unchecked proof',()=>{
  const input=geometry();let coordinate=12,reads=0;Object.defineProperty(input[0][0],'0',{enumerable:true,configurable:true,get(){reads++;return coordinate;}});
  const copy=createOwnedPublicationGeometry(input);assert.equal(reads,1);assert.equal(copy[0][0][0],12);coordinate=42;assert.equal(copy[0][0][0],12);assert.equal(isOwnedPublicationGeometry(input),false);assert.equal(isOwnedPublicationGeometry(copy),true);
  const descriptor=Object.getOwnPropertyDescriptor(copy[0][0],'0');assert.equal(descriptor.get,undefined);assert.equal(descriptor.writable,false);
  assert.throws(()=>createOwnedPublicationGeometry(new Proxy(input,{})),{name:'DataCloneError'});
});

test('sparse or internally mutable nonnumeric copies retain generic validation rather than receiving geometry proof',()=>{
  const sparse=geometry();delete sparse[0][0][1];const copy=createOwnedPublicationGeometry(sparse);assert.deepEqual(copy,sparse);assert.equal(isOwnedPublicationGeometry(copy),false);assert.ok(Object.isFrozen(copy[0][0]));
  for(const value of [new Map([[0,1]]),new Date(0),[new Map()],null,3])assert.equal(isOwnedPublicationGeometry(createOwnedPublicationGeometry(value)),false);
});
