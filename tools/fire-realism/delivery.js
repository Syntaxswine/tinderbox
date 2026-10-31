import {FIRE_BINARY_LIMITS,resourceRecords,reserveFireBudget,readBoundedFireResponse,fireLoadScope,prepareFireResources} from './resources.js';
import {validateQualityReceipt} from './profiling.js';
export const FIRE_DELIVERY_PATH='workbenches/fire-realism/delivery.json';
const verifiedEntries=new WeakMap();
const ROOT='assets/art/fire-realism/',OPTIMIZED=ROOT+'optimized/',RECEIPTS='docs/reviews/fire-realism/';
const plain=value=>!!value&&typeof value==='object'&&!Array.isArray(value),hex=(value,size)=>typeof value==='string'&&new RegExp('^[a-f0-9]{'+size+'}$').test(value);
const abort=signal=>{if(signal?.aborted)throw signal.reason instanceof Error?signal.reason:new DOMException('Fire delivery aborted','AbortError');};
function keys(value,required,optional=[],label='record'){
 if(!plain(value)||required.some(key=>!Object.hasOwn(value,key))||Object.keys(value).some(key=>![...required,...optional].includes(key)))throw TypeError('Invalid '+label+' fields');
}
export function canonicalFirePath(value){
 if(typeof value!=='string'||!value||value.split('/').some(part=>!part||part==='.'||part==='..'||part.startsWith('.')||!/^[A-Za-z0-9_-][A-Za-z0-9._-]*$/.test(part)))throw TypeError('Expected canonical project-local path: '+String(value));
 return value;
}
function withinMode(path,mode){canonicalFirePath(path);if(!path.startsWith(mode==='optimized'?OPTIMIZED:ROOT)||mode==='reference'&&path.startsWith(OPTIMIZED))throw TypeError('Source outside '+mode+' closure: '+path);return path;}
function rawRecord(sha256,bytes,label){if(!hex(sha256,64)||!Number.isSafeInteger(bytes)||bytes<1)throw TypeError('Invalid raw SHA-256/bytes for '+label);}
export function parseFireJson(bytes,label='JSON'){
 const text=new TextDecoder('utf-8',{fatal:true}).decode(bytes),value=JSON.parse(text),stack=[];
 // JSON.parse alone silently overwrites duplicate keys, including escaped aliases.
 for(let i=0;i<text.length;i++){
  const c=text[i];if(c==='{')stack.push(new Set());else if(c==='[')stack.push(null);else if(c==='}'||c===']')stack.pop();
  else if(c==='"'){const start=i;for(i++;i<text.length;i++){if(text[i]==='\\')i++;else if(text[i]==='"')break;}let next=i+1;while(/\s/.test(text[next]||'')&&next<text.length)next++;
   if(text[next]===':'){const key=JSON.parse(text.slice(start,i+1)),set=stack.at(-1);if(set?.has(key))throw TypeError('Duplicate '+label+' key: '+key);set?.add(key);}
  }
 }
 return value;
}
export function validateFireDeliveryDescriptor(descriptor){
 keys(descriptor,['version','byMode'],[],'delivery descriptor');if(descriptor.version!==1)throw TypeError('Unsupported fire delivery descriptor version');
 keys(descriptor.byMode,['reference'],['optimized'],'delivery modes');
 for(const mode of ['reference','optimized']){
  const record=descriptor.byMode[mode];if(mode==='optimized'&&(record===null||record===undefined))continue;
  keys(record,['sourceCommit','factoryModule','factoryExport','manifestUrl','manifestSha256','manifestBytes'],['acceptanceUrl','acceptanceSha256','acceptanceBytes','prepareExport'],mode+' delivery');
  if(!hex(record.sourceCommit,40)||typeof record.factoryExport!=='string'||!/^[A-Za-z_$][A-Za-z0-9_$]*$/.test(record.factoryExport))throw TypeError('Invalid '+mode+' commit/export');
  if(Object.hasOwn(record,'prepareExport')&&(typeof record.prepareExport!=='string'||!/^[A-Za-z_$][A-Za-z0-9_$]*$/.test(record.prepareExport)||record.prepareExport===record.factoryExport))throw TypeError('Invalid preparation export');
  if(!withinMode(record.factoryModule,mode).endsWith('.js')||!withinMode(record.manifestUrl,mode).endsWith('.json'))throw TypeError('Factory/manifest extension mismatch');
  rawRecord(record.manifestSha256,record.manifestBytes,mode+' manifest');
  const receiptKeys=['acceptanceUrl','acceptanceSha256','acceptanceBytes'],present=receiptKeys.filter(key=>Object.hasOwn(record,key));
  if(present.length&&present.length!==3)throw TypeError('Receipt URL/hash/bytes must be all-or-none');
  if(present.length){if(!canonicalFirePath(record.acceptanceUrl).startsWith(RECEIPTS)||!record.acceptanceUrl.endsWith('.json'))throw TypeError('Receipt outside architect reviews');rawRecord(record.acceptanceSha256,record.acceptanceBytes,mode+' receipt');}
 }
 return descriptor;
}
export async function fireRawHash(bytes,cryptoImpl=globalThis.crypto,signal){
 abort(signal);if(typeof cryptoImpl?.subtle?.digest!=='function')throw Error('Web Crypto SHA-256 is required for fire delivery verification');
 const hash=Array.from(new Uint8Array(await cryptoImpl.subtle.digest('SHA-256',bytes))).map(n=>n.toString(16).padStart(2,'0')).join('');abort(signal);return hash;
}
async function verifiedRaw(readBytes,path,expected,cryptoImpl,signal,options={}){
 abort(signal);const bytes=await readBytes(path,{...options,...(expected?{expectedBytes:expected.bytes}:{})});abort(signal);if(!(bytes instanceof Uint8Array))throw TypeError('Missing raw bytes: '+path);
 if(bytes.byteLength>(options.maxBytes??FIRE_BINARY_LIMITS.sourceBytes))throw Error('Raw byte ceiling exceeded: '+path);const sha256=await fireRawHash(bytes,cryptoImpl,signal);if(expected&&(bytes.byteLength!==expected.bytes||sha256!==expected.sha256))throw Error('Raw byte/hash mismatch: '+path);
 return {bytes,sha256,length:bytes.byteLength};
}
// A small conservative ESM lexer, not a JavaScript evaluator. Literal text,
// comments and regex bodies are ignored; template expressions remain code.
function tokens(source){
 const result=[];let i=0;
 const put=(type,value,escaped=false)=>result.push({type,value,escaped});
 function quote(q){const start=++i;let escaped=false;for(;i<source.length;i++){if(source[i]==='\\'){escaped=true;i++;}else if(source[i]===q){put('string',source.slice(start,i),escaped);i++;return;}}throw SyntaxError('Unterminated runtime string');}
 function template(){i++;while(i<source.length){if(source[i]==='\\'){i+=2;continue;}if(source[i]==='`'){i++;put('template','template');return;}if(source[i]==='$'&&source[i+1]==='{'){i+=2;code(true);continue;}i++;}throw SyntaxError('Unterminated runtime template');}
 function code(expression=false){let depth=0;
  while(i<source.length){const c=source[i],n=source[i+1];if(/\s/.test(c)){i++;continue;}
   if(c==='/'&&n==='/'){while(i<source.length&&source[i]!=='\n')i++;continue;}
   if(c==='/'&&n==='*'){const end=source.indexOf('*/',i+2);if(end<0)throw SyntaxError('Unterminated runtime comment');i=end+2;continue;}
   if(c==='"'||c==="'"){quote(c);continue;}if(c==='`'){template();continue;}
   if(c==='/'&&(!result.length||['=','(','[',',',':','!','?',';','return','=>'].includes(result.at(-1)?.value))){let bracket=false;i++;for(;i<source.length;i++){if(source[i]==='\\')i++;else if(source[i]==='[')bracket=true;else if(source[i]===']')bracket=false;else if(source[i]==='/'&&!bracket){i++;while(/[A-Za-z]/.test(source[i]||'')&&i<source.length)i++;break;}}put('regex','regex');continue;}
   if(c==='}'){if(expression&&depth===0){i++;return;}depth--;}
   if(c==='{')depth++;
   if(/[A-Za-z_$]/.test(c)){const start=i++;while(/[A-Za-z0-9_$]/.test(source[i]||'')&&i<source.length)i++;put('word',source.slice(start,i));continue;}
   put('punct',c);i++;
  }
  if(expression)throw SyntaxError('Unterminated runtime template expression');
 }
 code();return result;
}
export function fireModuleImports(source,path){
 const list=tokens(source),dependencies=[];
 function specifier(token){if(token?.type!=='string'||token.escaped||!token.value.startsWith('./'))throw TypeError('Runtime import must be an unescaped relative literal: '+path);
  const relative=canonicalFirePath(token.value.slice(2));if(!relative.endsWith('.js'))throw TypeError('Runtime imports must be JavaScript modules');
  return path.slice(0,path.lastIndexOf('/')+1)+relative;
 }
 for(let i=0;i<list.length;i++){
  const token=list[i];if(token.type!=='word')continue;
  if(token.value==='import'&&list[i-1]?.value!=='.'){
   const next=list[i+1];if(next?.type==='string'){dependencies.push(specifier(next));if(['with','assert'].includes(list[i+2]?.value))throw TypeError('Runtime import attributes are unsupported');continue;}
   if(['(','.'].includes(next?.value))throw TypeError('Dynamic import/import.meta is outside the verified static closure: '+path);
   let j=i+1,depth=0;for(;j<list.length&&list[j].value!==';';j++){if(list[j].value==='{')depth++;if(list[j].value==='}')depth--;if(depth===0&&list[j].value==='from'&&list[j+1]?.type==='string')break;}
   if(list[j]?.value!=='from')throw TypeError('Unsupported static runtime import: '+path);dependencies.push(specifier(list[j+1]));
   if(list[j+2]?.value==='with'||list[j+2]?.value==='assert')throw TypeError('Runtime import attributes are unsupported');
  }
  if(token.value==='export'&&['*','{'].includes(list[i+1]?.value)){
   let j=i+1,depth=0;for(;j<list.length;j++){if(list[j].value==='{')depth++;if(list[j].value==='}')depth--;if(depth===0&&['from',';'].includes(list[j].value))break;if(depth===0&&list[j].value==='}'&&list[j+1]?.value!=='from')break;}
   if(list[j]?.value==='from')dependencies.push(specifier(list[j+1]));
  }
 }
 return [...new Set(dependencies)];
}
export async function verifyFireRuntimeManifest({mode='reference',manifestPath,entryPath,expectedManifest=null,readBytes,cryptoImpl=globalThis.crypto,signal,prepareExport,budget={},retainResources=true,deferResources=false}={}){
 if(!['reference','optimized'].includes(mode)||typeof readBytes!=='function')throw TypeError('Invalid manifest verification request');
 withinMode(manifestPath,mode);withinMode(entryPath,mode);
 const raw=await verifiedRaw(readBytes,manifestPath,expectedManifest,cryptoImpl,signal),manifest=parseFireJson(raw.bytes,'manifest');
 if(!plain(manifest)||!Array.isArray(manifest.runtimeFiles)||!manifest.runtimeFiles.length)throw TypeError('Missing complete fire runtimeFiles');
 if(mode==='optimized'&&manifest.optimizedAvailable!==true)throw TypeError('Configured optimized manifest does not declare an optimized export');
 const records=new Map(),folded=new Set();
 for(const record of manifest.runtimeFiles){if(!plain(record))throw TypeError('Invalid runtime file record');const path=withinMode(record.path,mode);if(!path.endsWith('.js'))throw TypeError('Runtime closure must contain JavaScript modules');rawRecord(record.sha256,record.bytes,path);
  if(records.has(path)||folded.has(path.toLowerCase()))throw TypeError('Duplicate runtime path: '+path);records.set(path,record);folded.add(path.toLowerCase());}
 if(!records.has(entryPath))throw Error('Factory entry is missing from runtime closure');
 const resources=resourceRecords(manifest,{withinMode:path=>withinMode(path,mode),jsPaths:[...records.keys()]});if(resources.length&&!prepareExport||!resources.length&&prepareExport)throw Error('runtimeResources and prepareExport must be configured together');reserveFireBudget(budget,[...records.values()],resources);
 const hashes={},dependencies=new Map();
 for(const [path,record]of records){const file=await verifiedRaw(readBytes,path,record,cryptoImpl,signal);hashes[path]={sha256:file.sha256,expectedSha256:record.sha256,bytes:file.length,verified:true};dependencies.set(path,fireModuleImports(new TextDecoder('utf-8',{fatal:true}).decode(file.bytes),path));}
 const visited=new Set();function visit(path){if(visited.has(path))return;if(!records.has(path))throw Error('Incomplete runtime closure; unlisted import: '+path);visited.add(path);for(const dep of dependencies.get(path)){withinMode(dep,mode);visit(dep);}}visit(entryPath);
 if(visited.size!==records.size)throw Error('Runtime closure contains unreachable/extra files');
 const resourceProof=deferResources?{}:await verifyResourceBytes(resources,{readBytes,cryptoImpl,signal,retainResources});
 return {manifest,hashes,manifestRecord:{path:manifestPath,sha256:raw.sha256,bytes:raw.length},entryPath,...(resources.length?{pendingResources:resources,...resourceProof}:{})};
}
async function verifyResourceBytes(resources,{readBytes,cryptoImpl,signal,retainResources}){
 const resourceHashes={},resourceBuffers=new Map();try{for(const record of resources){const file=await verifiedRaw(readBytes,record.path,record,cryptoImpl,signal,{maxBytes:FIRE_BINARY_LIMITS.chunkCompressedBytes,requireStream:true});resourceHashes[record.path]={sha256:file.sha256,expectedSha256:record.sha256,bytes:file.length,verified:true,kind:record.kind,uncompressedBytes:record.uncompressedBytes};if(retainResources)resourceBuffers.set(record.path,file.bytes);}}catch(cause){resourceBuffers.clear();throw cause;}
 return resources.length?{resourceHashes,resourceBuffers}:{};
}
export async function verifyFireDeliveryDescriptor(descriptor,{readBytes,cryptoImpl=globalThis.crypto,signal,retainResources=true}={}){
 validateFireDeliveryDescriptor(descriptor);const byMode={},budget={},staged=[];
 try{for(const mode of ['reference','optimized']){
  const record=descriptor.byMode[mode];if(!record)continue;
  const verified=await verifyFireRuntimeManifest({mode,manifestPath:record.manifestUrl,entryPath:record.factoryModule,expectedManifest:{sha256:record.manifestSha256,bytes:record.manifestBytes},readBytes,cryptoImpl,signal,prepareExport:record.prepareExport,budget,retainResources,deferResources:true});
  byMode[mode]={...verified,record,acceptance:null};
 }
 for(const [mode,entry]of Object.entries(byMode)){const record=entry.record;Object.assign(entry,await verifyResourceBytes(entry.pendingResources||[],{readBytes,cryptoImpl,signal,retainResources}));if(entry.resourceBuffers)staged.push(entry.resourceBuffers);let acceptance=null;
  if(record.acceptanceUrl){const raw=await verifiedRaw(readBytes,record.acceptanceUrl,{sha256:record.acceptanceSha256,bytes:record.acceptanceBytes},cryptoImpl,signal);acceptance=parseFireJson(raw.bytes,'receipt');
   if(!validateQualityReceipt(acceptance,{kind:mode==='reference'?'architect-fire-reference-acceptance-v1':'architect-fire-optimized-acceptance-v1',mode,sourceCommit:record.sourceCommit,factoryModule:record.factoryModule,factoryExport:record.factoryExport,runtimeFiles:entry.hashes,...(entry.resourceHashes?{prepareExport:record.prepareExport,runtimeResources:entry.resourceHashes}:{}),...(mode==='optimized'?{referenceCommit:descriptor.byMode.reference.sourceCommit,referenceFactoryModule:descriptor.byMode.reference.factoryModule,referenceFactoryExport:descriptor.byMode.reference.factoryExport,...(byMode.reference?.resourceHashes?{referencePrepareExport:descriptor.byMode.reference.prepareExport,referenceRuntimeResources:byMode.reference.resourceHashes}:{})}:{})}))throw Error('Configured architect receipt does not match '+mode+' delivery');}
entry.acceptance=acceptance;
 }return byMode;}catch(cause){for(const buffers of staged)buffers.clear();throw cause;}
}
function projectBase(value){const url=new URL(value);if(!['http:','https:'].includes(url.protocol)||url.username||url.password||url.search||url.hash||url.pathname.includes('%')||!url.pathname.endsWith('/'))throw TypeError('Expected canonical HTTP project base URL');return url;}
export function fireProjectPath(value,projectUrl){if(typeof value==='string'&&(/[\\%?#]/.test(value)||value.split('/').some(part=>part==='.'||part==='..')))throw TypeError('Noncanonical local URL');const base=projectBase(projectUrl),url=new URL(value,base);if(url.origin!==base.origin||url.username||url.password||url.search||url.hash||!url.pathname.startsWith(base.pathname))throw TypeError('URL is outside the local project');const path=canonicalFirePath(url.pathname.slice(base.pathname.length));if(new URL(path,base).href!==url.href)throw TypeError('Noncanonical local URL');return path;}
export function createFireProjectReader({projectUrl,fetchImpl=globalThis.fetch,signal}={}){
 const base=projectBase(projectUrl);if(typeof fetchImpl!=='function')throw TypeError('Fetch is required');
 return async function read(path,{optional=false,...limits}={}){canonicalFirePath(path);abort(signal);const url=new URL(path,base),response=await fetchImpl(url.href,{signal,redirect:'error',cache:'no-store',credentials:'same-origin'});abort(signal);
  if(response.redirected||response.url&&response.url!==url.href)throw Error('Redirected fire delivery resource: '+path);
  if(optional&&response.status===404)return null;if(!response.ok)throw Error('Fire delivery HTTP '+response.status+': '+path);
  return readBoundedFireResponse(response,{...limits,signal});
 };
}
/** Call once on a cold new-document boot, before importing any artist module.
 * The host must serve immutable bytes for the whole boot. This does not vouch
 * for warm module caches, service workers or files mutated between requests. */
async function resolveFireReviewDelivery({descriptorUrl=new URL('../../'+FIRE_DELIVERY_PATH,import.meta.url),projectUrl=new URL('../../',import.meta.url),fetchImpl=globalThis.fetch,cryptoImpl=globalThis.crypto,importModule=url=>import(url),signal}={}){
 const scope=fireLoadScope(signal,FIRE_BINARY_LIMITS.transactionMs,'Fire cold load'),started=performance.now(),rollbacks=[],cleanupErrors=new Set();let success=false,verified=null;
 const rollback=()=>{for(let i=rollbacks.length-1;i>=0;i--)try{rollbacks[i]();}catch(cause){cleanupErrors.add(cause);}};scope.signal.addEventListener('abort',rollback,{once:true});
 try{return await scope.race((async()=>{
  const base=projectBase(projectUrl),path=fireProjectPath(descriptorUrl,base);if(path!==FIRE_DELIVERY_PATH)throw TypeError('Unexpected architect delivery descriptor path');
  const readBytes=createFireProjectReader({projectUrl:base,fetchImpl,signal:scope.signal}),raw=await readBytes(path,{optional:true});if(raw===null){success=true;return {status:'unconfigured',artistDelivery:null,referenceAcceptance:null,descriptor:null};}
  const descriptorHash=await fireRawHash(raw,cryptoImpl,scope.signal),descriptor=validateFireDeliveryDescriptor(parseFireJson(raw,'descriptor'));verified=await verifyFireDeliveryDescriptor(descriptor,{readBytes,cryptoImpl,signal:scope.signal});const byMode={};
  // ALL configured JavaScript, raw resources and receipts pass BEFORE import.
  for(const mode of ['reference','optimized']){const entry=verified[mode];if(!entry)continue;abort(scope.signal);const namespace=await importModule(new URL(entry.record.factoryModule,base).href);abort(scope.signal);
   const factory=namespace&&Object.hasOwn(namespace,entry.record.factoryExport)?namespace[entry.record.factoryExport]:null;if(typeof factory!=='function')throw TypeError('Configured '+mode+' factory export is missing or not a function');let prepare=null,preparation=null;
   if(entry.resourceHashes){prepare=Object.hasOwn(namespace,entry.record.prepareExport)?namespace[entry.record.prepareExport]:null;if(typeof prepare!=='function')throw TypeError('Configured preparation export is missing or not a function');const prepared=await prepareFireResources({prepare,prepareExport:entry.record.prepareExport,records:entry.manifest.runtimeResources,buffers:entry.resourceBuffers,signal:scope.signal,onCleanupError:cause=>cleanupErrors.add(cause)});rollbacks.push(prepared.cleanup);preparation=prepared.metadata;}
   abort(scope.signal);if(namespace[entry.record.factoryExport]!==factory||prepare&&namespace[entry.record.prepareExport]!==prepare)throw Error('Configured factory/preparation export changed during cold boot');const selected={...entry.record,mode,manifestUrl:new URL(entry.record.manifestUrl,base).href,createFireRealism:factory,...(mode==='optimized'?{retainedQualityAcceptance:entry.acceptance}:{})};
   const fields={mode,sourceCommit:selected.sourceCommit,factoryModule:selected.factoryModule,factoryExport:selected.factoryExport,manifestUrl:selected.manifestUrl,manifestSha256:selected.manifestSha256,manifestBytes:selected.manifestBytes,...(prepare?{prepareExport:selected.prepareExport}:{})};
   const fingerprint={mode,sourceCommit:selected.sourceCommit,factoryModule:selected.factoryModule,factoryExport:selected.factoryExport,runtimeFiles:structuredClone(entry.hashes),...(prepare?{prepareExport:selected.prepareExport,runtimeResources:structuredClone(entry.resourceHashes)}:{})};
   verifiedEntries.set(selected,{factory,prepare,namespace,fields,fingerprint,metadata:{manifest:structuredClone(entry.manifest),hashes:structuredClone(entry.hashes),manifestRecord:structuredClone(entry.manifestRecord),...(prepare?{resourceHashes:structuredClone(entry.resourceHashes),preparation}:{}),coldLoad:{setupMs:performance.now()-started,verifiedCompressedBytesTotal:Object.values(verified).reduce((sum,e)=>sum+Object.values(e.resourceHashes||{}).reduce((n,r)=>n+r.bytes,0),0),declaredSparseBytesTotal:Object.values(verified).reduce((sum,e)=>sum+Object.values(e.resourceHashes||{}).reduce((n,r)=>n+r.uncompressedBytes,0),0),compressedRetentionScope:'All configured resources are verified/staged together; asset consumption transfers ownership, not measured GC residency'}}});byMode[mode]=selected;
  }
  for(const selected of Object.values(byMode))verifiedEntries.get(selected).metadata.coldLoad.totalMs=performance.now()-started;success=true;return {status:'configured',artistDelivery:{byMode},referenceAcceptance:verified.reference.acceptance,descriptor:{url:new URL(path,base).href,sha256:descriptorHash,bytes:raw.byteLength}};
 })());}catch(cause){scope.abort(cause);rollback();if(cleanupErrors.size)throw new AggregateError([cause,...cleanupErrors],'Fire load failed; bootstrap cleanup also failed');throw cause;}finally{for(const entry of Object.values(verified||{}))entry.resourceBuffers?.clear();if(!success)rollback();scope.signal.removeEventListener('abort',rollback);scope.dispose();}
}

// Guards accidental record/function substitution inside this workbench. It is
// not a boundary against arbitrary same-origin JavaScript or test import hooks.
export function verifiedFireDeliveryFingerprint(record){
 const proof=verifiedEntries.get(record);if(!proof||record.createFireRealism!==proof.factory||proof.namespace[proof.fields.factoryExport]!==proof.factory||proof.prepare&&proof.namespace[proof.fields.prepareExport]!==proof.prepare||Object.entries(proof.fields).some(([key,value])=>record[key]!==value))return null;
 return structuredClone(proof.fingerprint);
}

/** A loader instance represents one cold document boot. Reconfiguration or
 * retry after a begun load requires a fresh document, not a warm module cache.
 * Separate instances/injected transports exist for isolated offline tests. */
export function verifiedFireDeliveryMetadata(record){if(!verifiedFireDeliveryFingerprint(record))return null;return structuredClone(verifiedEntries.get(record).metadata);}

export function createFireReviewDeliveryLoader(dependencies={}){
 let begun=false;
 return async options=>{if(begun)throw Error('Fire delivery load already began; start a cold new document instead of hot reload');begun=true;return resolveFireReviewDelivery({...dependencies,...options});};
}
export const loadFireReviewDelivery=createFireReviewDeliveryLoader();
