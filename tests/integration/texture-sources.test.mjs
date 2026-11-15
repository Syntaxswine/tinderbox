import test from 'node:test';
import assert from 'node:assert/strict';
import * as T from '../../src/runtime/three.js';
import {createTextureSourcePool} from '../../src/reuse/texture-sources.js';
import {loadOwnedBatch} from '../../src/reuse/loading.js';

const deferred=()=>{let resolve,reject;const promise=new Promise((a,b)=>{resolve=a;reject=b;});return {promise,resolve,reject};};

test('immutable image Source is shared while Texture transforms, samplers and materials remain private until the last borrower',async()=>{
  const pool=createTextureSourcePool(),pending=deferred(),base=new T.Texture({width:8,height:4});let loaded=0,retired=0;
  base.addEventListener('dispose',()=>retired++);
  const url=new URL('./paint.png','https://example.test/houses/house.json').href;
  const a=pool.borrow(url,()=>{loaded++;return pending.promise;}),b=pool.borrow(new URL('paint.png','https://example.test/houses/').href,()=>{throw Error('Duplicate load');});
  pending.resolve(base);const [one,two]=await Promise.all([a,b]);assert.equal(loaded,1);
  assert.notEqual(one,two);assert.equal(one.source,two.source);assert.equal(one.image,two.image);
  const m1=new T.MeshStandardMaterial({map:one}),m2=new T.MeshStandardMaterial({map:two});
  one.repeat.set(2,3);one.offset.set(.2,.3);one.wrapS=T.RepeatWrapping;one.colorSpace=T.SRGBColorSpace;m1.opacity=.2;
  assert.deepEqual(two.repeat.toArray(),[1,1]);assert.deepEqual(two.offset.toArray(),[0,0]);assert.equal(two.wrapS,T.ClampToEdgeWrapping);assert.equal(two.colorSpace,T.NoColorSpace);assert.equal(m2.opacity,1);
  one.dispose();one.dispose();assert.equal(retired,0);assert.equal(pool.diagnostics().borrowers,1);
  two.dispose();assert.equal(retired,1);assert.equal(pool.diagnostics().sources,0);pool.dispose();pool.dispose();assert.equal(retired,1);m1.dispose();m2.dispose();
});

test('deterministic trim pixels share one Source with private upload configuration and retire on the last clone',()=>{
  const pool=createTextureSourcePool(),pixels=new Uint8Array([18,24,30,255]);let generated=0,disposed=0;
  const create=()=>{generated++;const base=new T.DataTexture(pixels,1,1);base.generateMipmaps=true;base.addEventListener('dispose',()=>disposed++);return base;};
  const a=pool.borrowNow('trim-v1',create),b=pool.borrowNow('trim-v1',create);
  assert.equal(generated,1);assert.equal(a.source,b.source);assert.equal(a.image.data,pixels);a.generateMipmaps=false;assert.equal(b.generateMipmaps,true);
  a.dispose();assert.equal(disposed,0);pool.dispose();assert.equal(disposed,1);assert.deepEqual(pool.diagnostics(),{disposed:true,sources:0,borrowers:0,created:1,released:1});
});

test('failed and aborted pooled loads reject promptly, dispose late sources once, and permit a fresh failed-key retry',async()=>{
  const pool=createTextureSourcePool(),failed=deferred();
  const first=pool.borrow('failed',()=>failed.promise);failed.reject(Error('Image failed'));await assert.rejects(first,/Image failed/);assert.equal(pool.diagnostics().sources,0);
  const retry=await pool.borrow('failed',()=>new T.Texture());retry.dispose();
  const waiting=deferred(),controller=new AbortController(),cancelled=createTextureSourcePool({signal:controller.signal});let retired=0;
  const load=cancelled.borrow('late',()=>waiting.promise);await Promise.resolve();controller.abort();await assert.rejects(load,{name:'AbortError'});
  const late=new T.Texture();late.addEventListener('dispose',()=>retired++);waiting.resolve(late);await Promise.resolve();await Promise.resolve();assert.equal(retired,1);assert.equal(cancelled.diagnostics().sources,0);
  assert.throws(()=>cancelled.borrowNow('new',()=>new T.Texture()),{name:'AbortError'});pool.dispose();cancelled.dispose();assert.equal(retired,1);
});

test('batch failure releases fulfilled and late ownership exactly once even when a release throws',async()=>{
  const a=deferred(),b=deferred(),c=deferred(),retired=[];
  const batch=loadOwnedBatch([a.promise,b.promise,c.promise],{release(value){retired.push(value);if(value==='first')throw Error('Cleanup failed');}});
  a.resolve('first');await Promise.resolve();b.reject(Error('Load failed'));let failure;
  await assert.rejects(batch,error=>{failure=error;return /Load failed/.test(error.message);});c.resolve('late');await Promise.resolve();
  assert.deepEqual(retired,['first','late']);assert.deepEqual(failure.cleanupErrors,['Cleanup failed']);
});

test('pre-aborted batch still retires late arrivals without retaining the other unresolved request',async()=>{
  const controller=new AbortController(),late=deferred();let disposed=0;controller.abort();
  const batch=loadOwnedBatch([new Promise(()=>{}),late.promise],{signal:controller.signal});await assert.rejects(batch,{name:'AbortError'});
  late.resolve({dispose(){disposed++;}});await Promise.resolve();assert.equal(disposed,1);
});
