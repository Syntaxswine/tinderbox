import test from 'node:test';import assert from 'node:assert/strict';import fs from 'node:fs';import os from 'node:os';import path from 'node:path';import {execFileSync} from 'node:child_process';import {createHash} from 'node:crypto';
import {FIRE_DELIVERY_PATH,createFireReviewDeliveryLoader,fireModuleImports,verifyFireRuntimeManifest,validateFireDeliveryDescriptor,parseFireJson} from '../../tools/fire-realism/delivery.js';
import {validateFireDeliveryRepository} from '../../tools/fire-realism/check-delivery.mjs';
const base='https://fixture.invalid/tinderbox/',R='assets/art/fire-realism/',O=R+'optimized/',REVIEW='docs/reviews/fire-realism/',bytes=value=>new TextEncoder().encode(typeof value==='string'?value:JSON.stringify(value)),sha=value=>createHash('sha256').update(value).digest('hex'),copy=value=>structuredClone(value);
// Encode quote tokens in synthetic module text so the repository's simple
// static import inventory does not mistake fixture strings for test imports.
const moduleText=text=>text.replaceAll('@q@',String.fromCharCode(39));
function deliveryFixture({optimized=true,receipt=false}={}){
 const files=new Map(),byMode={};
 for(const [mode,prefix,commit]of [['reference',R,'a'.repeat(40)],...(optimized?[['optimized',O,'b'.repeat(40)]]:[])]){
  const entry=prefix+'index.js',geometry=prefix+'geometry.js';files.set(entry,bytes(moduleText("import {geometry} from @q@./geometry.js@q@; export function createFireRealism(){return geometry;}")));files.set(geometry,bytes('export const geometry=1;'));
  const manifest={version:1,optimizedAvailable:mode==='optimized',runtimeFiles:[entry,geometry].map(path=>({path,sha256:sha(files.get(path)),bytes:files.get(path).length}))},manifestUrl=prefix+'manifest.json',raw=bytes(manifest);files.set(manifestUrl,raw);
  byMode[mode]={sourceCommit:commit,factoryModule:entry,factoryExport:'createFireRealism',manifestUrl,manifestSha256:sha(raw),manifestBytes:raw.length};
  if(receipt){const acceptanceUrl=REVIEW+mode+'-test-only.json',acceptance={kind:mode==='reference'?'architect-fire-reference-acceptance-v1':'architect-fire-optimized-acceptance-v1',status:'accepted',receiptId:'synthetic-test-only-'+mode,sourceCommit:commit,...(mode==='optimized'?{referenceCommit:'a'.repeat(40)}:{}),runtimeFiles:Object.fromEntries(manifest.runtimeFiles.map(file=>[file.path,file.sha256]))},raw=bytes(acceptance);files.set(acceptanceUrl,raw);Object.assign(byMode[mode],{acceptanceUrl,acceptanceSha256:sha(raw),acceptanceBytes:raw.length});}
 }
 const descriptor={version:1,byMode};files.set(FIRE_DELIVERY_PATH,bytes(descriptor));return {files,descriptor};
}
function rewrite(fixture,edit){edit(fixture.descriptor,fixture.files);fixture.files.set(FIRE_DELIVERY_PATH,bytes(fixture.descriptor));return fixture;}
function manifestEdit(fixture,mode,edit){const record=fixture.descriptor.byMode[mode],manifest=JSON.parse(new TextDecoder().decode(fixture.files.get(record.manifestUrl)));edit(manifest,fixture.files);const raw=bytes(manifest);fixture.files.set(record.manifestUrl,raw);record.manifestSha256=sha(raw);record.manifestBytes=raw.length;fixture.files.set(FIRE_DELIVERY_PATH,bytes(fixture.descriptor));}
function harness(fixture,{transform,importModule,cryptoImpl=globalThis.crypto,signal}={}){
 const calls=[],imports=[];
 const options={projectUrl:base,descriptorUrl:base+FIRE_DELIVERY_PATH,cryptoImpl,signal,fetchImpl:async(url,request)=>{const local=url.slice(base.length);calls.push({path:local,request});if(transform){const changed=await transform(local,fixture.files,request);if(changed)return changed;}const raw=fixture.files.get(local),response=new Response(raw||null,{status:raw?200:404});Object.defineProperty(response,'url',{value:url});return response;},importModule:async url=>{imports.push(url);return importModule?importModule(url,calls):{createFireRealism:function testOnlyFactory(){}};}};
 const load=createFireReviewDeliveryLoader();return {calls,imports,options,run:()=>load(options)};
}
test('delivery404 is explicitly unconfigured; configured R/O verify every raw closure/receipt before any import',async()=>{
 const absent=deliveryFixture();absent.files.delete(FIRE_DELIVERY_PATH);const a=harness(absent);assert.deepEqual(await a.run(),{status:'unconfigured',artistDelivery:null,referenceAcceptance:null,descriptor:null});assert.deepEqual(a.imports,[]);
 const f=deliveryFixture({receipt:true}),h=harness(f,{importModule(_url,calls){assert.equal(calls.length,f.files.size);assert.ok(calls.every(call=>call.request.redirect==='error'&&call.request.cache==='no-store'));return {createFireRealism:()=>{}};}}),loaded=await h.run();
 assert.equal(loaded.status,'configured');assert.equal(loaded.artistDelivery.byMode.reference.sourceCommit,'a'.repeat(40));assert.equal(loaded.artistDelivery.byMode.reference.manifestUrl,base+R+'manifest.json');assert.equal(loaded.artistDelivery.byMode.optimized.manifestUrl,base+O+'manifest.json');assert.equal(loaded.referenceAcceptance.receiptId,'synthetic-test-only-reference');assert.equal(loaded.artistDelivery.byMode.optimized.retainedQualityAcceptance.receiptId,'synthetic-test-only-optimized');assert.equal(loaded.descriptor.sha256,sha(f.files.get(FIRE_DELIVERY_PATH)));assert.equal(h.imports.length,2);await assert.rejects(h.run(),/cold new document/);assert.equal(h.imports.length,2);
 const debug=harness(deliveryFixture({optimized:false}));const result=await debug.run();assert.equal(result.referenceAcceptance,null);assert.equal(result.artistDelivery.byMode.optimized,undefined);
});
test('configured malformed paths/commits/receipt triplets and duplicate JSON keys reject before imports',async()=>{
 const mutations=[
  d=>{d.version=2;},d=>{d.byMode.reference=null;},d=>{d.byMode.current={};},d=>{d.byMode.reference.sourceCommit='abcdef';},d=>{d.byMode.reference.factoryExport='x.y';},d=>{d.byMode.reference.factoryModule=O+'index.js';},d=>{d.byMode.optimized.manifestUrl=R+'manifest.json';},d=>{d.byMode.reference.manifestBytes=0;},d=>{d.byMode.reference.acceptanceUrl=REVIEW+'r.json';},d=>{d.byMode.reference.acceptanceUrl='assets/receipt.json';d.byMode.reference.acceptanceSha256='c'.repeat(64);d.byMode.reference.acceptanceBytes=1;},
  ...['/assets/index.js','assets//art/fire-realism/index.js',R+'../index.js',R+'%2e%2e/index.js',R+'index.js?raw',R+'index.js#x',R+'x\\index.js','https://fixture.invalid/index.js',R+'./index.js',R+'.hidden.js'].map(value=>d=>{d.byMode.reference.factoryModule=value;})
 ];
 for(const mutate of mutations){const f=rewrite(deliveryFixture(),mutate),h=harness(f);await assert.rejects(h.run());assert.equal(h.imports.length,0);}
 const duplicate=deliveryFixture();duplicate.files.set(FIRE_DELIVERY_PATH,bytes('{"version":1,"version":1,"byMode":{}}'));await assert.rejects(harness(duplicate).run(),/Duplicate/);assert.throws(()=>parseFireJson(bytes('{"a":1,"\\u0061":2}')),/Duplicate/);
 for(const tail of ['?raw','#x','%2fother']){const h=harness(deliveryFixture());h.options.descriptorUrl+=tail;await assert.rejects(h.run());assert.equal(h.calls.length,0);}
});
test('manifest/closure/receipt missing bytes, wrong bytes, duplicate/unlisted/extra modules and remote code imports never fall back',async()=>{
 const cases=[
  f=>{f.files.delete(R+'manifest.json');},f=>{f.files.set(R+'manifest.json',bytes('{}'));},f=>{f.files.set(R+'geometry.js',bytes('export const geometry=99;'));},
  f=>manifestEdit(f,'reference',m=>{m.runtimeFiles.push(copy(m.runtimeFiles[0]));}),
  f=>manifestEdit(f,'reference',m=>{m.runtimeFiles=m.runtimeFiles.filter(r=>r.path!==R+'geometry.js');}),
  f=>manifestEdit(f,'reference',(m,files)=>{const file=R+'extra.js',raw=bytes('export const unused=1;');files.set(file,raw);m.runtimeFiles.push({path:file,bytes:raw.length,sha256:sha(raw)});}),
  f=>rewrite(f,d=>{d.byMode.reference.factoryModule=R+'missing.js';}),
  f=>manifestEdit(f,'reference',(m,files)=>{const record=m.runtimeFiles[0],raw=bytes(moduleText("import x from @q@https://remote.invalid/x.js@q@; export const createFireRealism=()=>x;"));files.set(record.path,raw);record.bytes=raw.length;record.sha256=sha(raw);}),
  f=>manifestEdit(f,'reference',(m,files)=>{const record=m.runtimeFiles[0],raw=bytes(moduleText("import x from @q@./%67eometry.js@q@; export const createFireRealism=()=>x;"));files.set(record.path,raw);record.bytes=raw.length;record.sha256=sha(raw);}),
  f=>manifestEdit(f,'optimized',m=>{m.optimizedAvailable=false;}),
  f=>{f.files.delete(f.descriptor.byMode.optimized.acceptanceUrl);},
  f=>{const r=f.descriptor.byMode.reference;f.files.set(r.acceptanceUrl,bytes('{}'));},
  f=>rewrite(f,(d,files)=>{const r=d.byMode.optimized,receipt=JSON.parse(new TextDecoder().decode(files.get(r.acceptanceUrl)));receipt.referenceCommit='c'.repeat(40);const raw=bytes(receipt);files.set(r.acceptanceUrl,raw);r.acceptanceSha256=sha(raw);r.acceptanceBytes=raw.length;})
 ];
 for(const mutate of cases){const f=deliveryFixture({receipt:true});mutate(f);const h=harness(f);await assert.rejects(h.run());assert.equal(h.imports.length,0);}
 const noCrypto=harness(deliveryFixture(),{cryptoImpl:null});await assert.rejects(noCrypto.run(),/Web Crypto/);assert.equal(noCrypto.imports.length,0);
 for(const namespace of [{},{createFireRealism:1},Object.create({createFireRealism:()=>{}})]){const h=harness(deliveryFixture({optimized:false}),{importModule:()=>namespace});await assert.rejects(h.run(),/factory export/);assert.equal(h.imports.length,1);}
});
test('static closure lexer accounts for reexports and template expressions, ignoring literal/comments/regex text',()=>{
 const source=moduleText("// import(@q@./ignored.js@q@)\nconst s=\"import(@q@./ignored.js@q@)\"; const regex=/import\\(@q@ignored@q@\\)/; const t=`import(@q@./ignored.js@q@) ${1+2}`; export {x} from @q@./geometry.js@q@; export * from @q@./shader.js@q@;");
 assert.deepEqual(fireModuleImports(source,R+'index.js'),[R+'geometry.js',R+'shader.js']);
 for(const source of ["import(@q@./bad.js@q@)","const s=`${import(@q@./bad.js@q@)}`;","const v=`x` / import(@q@./bad.js@q@) / 2;","import.meta.url","import x from @q@./\\u0067eometry.js@q@;","export * from @q@../outside.js@q@;"]){assert.throws(()=>fireModuleImports(moduleText(source),R+'index.js'));}
});
test('redirects/status failures and aborts cannot return a configured factory',async()=>{
 for(const redirect of [{redirected:true},{url:'https://elsewhere.invalid/file'}]){const h=harness(deliveryFixture(),{transform(){const response=new Response('{}');for(const [key,value]of Object.entries(redirect))Object.defineProperty(response,key,{value});return response;}});await assert.rejects(h.run(),/Redirect/);assert.equal(h.imports.length,0);}
 const bad=harness(deliveryFixture(),{transform(){return new Response(null,{status:500});}});await assert.rejects(bad.run(),/500/);
 const early=new AbortController();early.abort();const pre=harness(deliveryFixture(),{signal:early.signal});await assert.rejects(pre.run(),{name:'AbortError'});assert.equal(pre.calls.length,0);
 const controller=new AbortController(),mid=harness(deliveryFixture(),{signal:controller.signal,transform(path){if(path===R+'geometry.js')controller.abort();}});await assert.rejects(mid.run(),{name:'AbortError'});assert.equal(mid.imports.length,0);
 const importing=new AbortController(),late=harness(deliveryFixture(),{signal:importing.signal,importModule(){importing.abort();return {createFireRealism:()=>{}};}});await assert.rejects(late.run(),{name:'AbortError'});assert.equal(late.imports.length,1,'Native import already begun cannot be undone; no later factory is imported or returned');
});
test('actual committed artist closure verifies raw Git bytes without importing or claiming acceptance',async()=>{
 const readBytes=async file=>new Uint8Array(execFileSync('git',['show','HEAD:'+file],{windowsHide:true}));
 const verified=await verifyFireRuntimeManifest({manifestPath:R+'manifest.json',entryPath:R+'index.js',readBytes});assert.ok(Object.keys(verified.hashes).length>=3);assert.ok(Object.values(verified.hashes).every(record=>record.verified));
 const driver=fs.readFileSync('workbenches/fire-realism/driver.js','utf8');assert.doesNotMatch(driver,/^import .*from ['"].*assets\/art\/fire-realism\/index\.js/m);assert.match(driver,/if\(configuredDelivery\)throw cause/);
});
test('configured repository check proves actual named commit blobs and rejects stale working bytes or unknown commits',async()=>{
 const directory=fs.mkdtempSync(path.join(os.tmpdir(),'tinderbox-fire-delivery-'));
 const git=(...args)=>execFileSync('git',['-C',directory,...args],{windowsHide:true,stdio:['ignore','pipe','pipe']});
 try{git('init','-q');git('config','core.autocrlf','false');const f=deliveryFixture({optimized:false});f.files.delete(FIRE_DELIVERY_PATH);
  for(const [file,raw]of f.files){const dest=path.join(directory,file);fs.mkdirSync(path.dirname(dest),{recursive:true});fs.writeFileSync(dest,raw);}
  git('add','.');git('-c','user.name=Delivery Test Fixture','-c','user.email=fixture@example.invalid','-c','commit.gpgSign=false','commit','-qm','Synthetic loader test closure');f.descriptor.byMode.reference.sourceCommit=git('rev-parse','HEAD').toString().trim();
  const config=path.join(directory,FIRE_DELIVERY_PATH);fs.mkdirSync(path.dirname(config),{recursive:true});fs.writeFileSync(config,bytes(f.descriptor));const result=await validateFireDeliveryRepository({root:directory});assert.equal(result.status,'configured-verified-git-blobs');assert.equal(result.modes.length,1);
  const record=f.descriptor.byMode.reference,geometry=path.join(directory,R+'geometry.js');fs.appendFileSync(geometry,'\n// changed');await assert.rejects(validateFireDeliveryRepository({root:directory}),/byte\/hash mismatch/i);fs.writeFileSync(geometry,f.files.get(R+'geometry.js'));
  record.sourceCommit='c'.repeat(40);fs.writeFileSync(config,bytes(f.descriptor));await assert.rejects(validateFireDeliveryRepository({root:directory}));
  record.sourceCommit=git('rev-parse','HEAD').toString().trim();fs.writeFileSync(config,bytes(f.descriptor));const manifestPath=path.join(directory,record.manifestUrl),manifest=JSON.parse(fs.readFileSync(manifestPath));manifest.note='valid hashes but not this Git blob';const raw=bytes(manifest);fs.writeFileSync(manifestPath,raw);record.manifestSha256=sha(raw);record.manifestBytes=raw.length;fs.writeFileSync(config,bytes(f.descriptor));await assert.rejects(validateFireDeliveryRepository({root:directory}),/differ from named commit/);
  fs.rmSync(config);assert.equal((await validateFireDeliveryRepository({root:directory})).status,'unconfigured');
 }finally{assert.equal(path.dirname(directory),fs.realpathSync(os.tmpdir()));assert.ok(path.basename(directory).startsWith('tinderbox-fire-delivery-'));fs.rmSync(directory,{recursive:true,force:true});}
});
