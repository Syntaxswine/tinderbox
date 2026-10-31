import {validateQualityReceipt} from './profiling.js';
export const FIRE_DELIVERY_PATH='workbenches/fire-realism/delivery.json';
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
  keys(record,['sourceCommit','factoryModule','factoryExport','manifestUrl','manifestSha256','manifestBytes'],['acceptanceUrl','acceptanceSha256','acceptanceBytes'],mode+' delivery');
  if(!hex(record.sourceCommit,40)||typeof record.factoryExport!=='string'||!/^[A-Za-z_$][A-Za-z0-9_$]*$/.test(record.factoryExport))throw TypeError('Invalid '+mode+' commit/export');
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
async function verifiedRaw(readBytes,path,expected,cryptoImpl,signal){
 abort(signal);const bytes=await readBytes(path);abort(signal);if(!(bytes instanceof Uint8Array))throw TypeError('Missing raw bytes: '+path);
 const sha256=await fireRawHash(bytes,cryptoImpl,signal);if(expected&&(bytes.byteLength!==expected.bytes||sha256!==expected.sha256))throw Error('Raw byte/hash mismatch: '+path);
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
export async function verifyFireRuntimeManifest({mode='reference',manifestPath,entryPath,expectedManifest=null,readBytes,cryptoImpl=globalThis.crypto,signal}={}){
 if(!['reference','optimized'].includes(mode)||typeof readBytes!=='function')throw TypeError('Invalid manifest verification request');
 withinMode(manifestPath,mode);withinMode(entryPath,mode);
 const raw=await verifiedRaw(readBytes,manifestPath,expectedManifest,cryptoImpl,signal),manifest=parseFireJson(raw.bytes,'manifest');
 if(!plain(manifest)||!Array.isArray(manifest.runtimeFiles)||!manifest.runtimeFiles.length)throw TypeError('Missing complete fire runtimeFiles');
 if(mode==='optimized'&&manifest.optimizedAvailable!==true)throw TypeError('Configured optimized manifest does not declare an optimized export');
 const records=new Map(),folded=new Set();
 for(const record of manifest.runtimeFiles){if(!plain(record))throw TypeError('Invalid runtime file record');const path=withinMode(record.path,mode);if(!path.endsWith('.js'))throw TypeError('Runtime closure must contain JavaScript modules');rawRecord(record.sha256,record.bytes,path);
  if(records.has(path)||folded.has(path.toLowerCase()))throw TypeError('Duplicate runtime path: '+path);records.set(path,record);folded.add(path.toLowerCase());}
 if(!records.has(entryPath))throw Error('Factory entry is missing from runtime closure');
 const hashes={},dependencies=new Map();
 for(const [path,record]of records){const file=await verifiedRaw(readBytes,path,record,cryptoImpl,signal);hashes[path]={sha256:file.sha256,expectedSha256:record.sha256,bytes:file.length,verified:true};dependencies.set(path,fireModuleImports(new TextDecoder('utf-8',{fatal:true}).decode(file.bytes),path));}
 const visited=new Set();function visit(path){if(visited.has(path))return;if(!records.has(path))throw Error('Incomplete runtime closure; unlisted import: '+path);visited.add(path);for(const dep of dependencies.get(path)){withinMode(dep,mode);visit(dep);}}visit(entryPath);
 if(visited.size!==records.size)throw Error('Runtime closure contains unreachable/extra files');
 return {manifest,hashes,manifestRecord:{path:manifestPath,sha256:raw.sha256,bytes:raw.length},entryPath};
}
export async function verifyFireDeliveryDescriptor(descriptor,{readBytes,cryptoImpl=globalThis.crypto,signal}={}){
 validateFireDeliveryDescriptor(descriptor);const byMode={};
 for(const mode of ['reference','optimized']){
  const record=descriptor.byMode[mode];if(!record)continue;
  const verified=await verifyFireRuntimeManifest({mode,manifestPath:record.manifestUrl,entryPath:record.factoryModule,expectedManifest:{sha256:record.manifestSha256,bytes:record.manifestBytes},readBytes,cryptoImpl,signal});
  let acceptance=null;
  if(record.acceptanceUrl){const raw=await verifiedRaw(readBytes,record.acceptanceUrl,{sha256:record.acceptanceSha256,bytes:record.acceptanceBytes},cryptoImpl,signal);acceptance=parseFireJson(raw.bytes,'receipt');
   if(!validateQualityReceipt(acceptance,{kind:mode==='reference'?'architect-fire-reference-acceptance-v1':'architect-fire-optimized-acceptance-v1',sourceCommit:record.sourceCommit,runtimeFiles:verified.hashes,...(mode==='optimized'?{referenceCommit:descriptor.byMode.reference.sourceCommit}:{})}))throw Error('Configured architect receipt does not match '+mode+' delivery');}
  byMode[mode]={...verified,record,acceptance};
 }
 return byMode;
}
function projectBase(value){const url=new URL(value);if(!['http:','https:'].includes(url.protocol)||url.username||url.password||url.search||url.hash||url.pathname.includes('%')||!url.pathname.endsWith('/'))throw TypeError('Expected canonical HTTP project base URL');return url;}
export function fireProjectPath(value,projectUrl){if(typeof value==='string'&&(/[\\%?#]/.test(value)||value.split('/').some(part=>part==='.'||part==='..')))throw TypeError('Noncanonical local URL');const base=projectBase(projectUrl),url=new URL(value,base);if(url.origin!==base.origin||url.username||url.password||url.search||url.hash||!url.pathname.startsWith(base.pathname))throw TypeError('URL is outside the local project');const path=canonicalFirePath(url.pathname.slice(base.pathname.length));if(new URL(path,base).href!==url.href)throw TypeError('Noncanonical local URL');return path;}
export function createFireProjectReader({projectUrl,fetchImpl=globalThis.fetch,signal}={}){
 const base=projectBase(projectUrl);if(typeof fetchImpl!=='function')throw TypeError('Fetch is required');
 return async function read(path,{optional=false}={}){canonicalFirePath(path);abort(signal);const url=new URL(path,base),response=await fetchImpl(url.href,{signal,redirect:'error',cache:'no-store',credentials:'same-origin'});abort(signal);
  if(response.redirected||response.url&&response.url!==url.href)throw Error('Redirected fire delivery resource: '+path);
  if(optional&&response.status===404)return null;if(!response.ok)throw Error('Fire delivery HTTP '+response.status+': '+path);
  const bytes=new Uint8Array(await response.arrayBuffer());abort(signal);return bytes;
 };
}
/** Call once on a cold new-document boot, before importing any artist module.
 * The host must serve immutable bytes for the whole boot. This does not vouch
 * for warm module caches, service workers or files mutated between requests. */
async function resolveFireReviewDelivery({descriptorUrl=new URL('../../'+FIRE_DELIVERY_PATH,import.meta.url),projectUrl=new URL('../../',import.meta.url),fetchImpl=globalThis.fetch,cryptoImpl=globalThis.crypto,importModule=url=>import(url),signal}={}){
 const base=projectBase(projectUrl),path=fireProjectPath(descriptorUrl,base);if(path!==FIRE_DELIVERY_PATH)throw TypeError('Unexpected architect delivery descriptor path');
 const readBytes=createFireProjectReader({projectUrl:base,fetchImpl,signal}),raw=await readBytes(path,{optional:true});
 if(raw===null)return {status:'unconfigured',artistDelivery:null,referenceAcceptance:null,descriptor:null};
 const descriptorHash=await fireRawHash(raw,cryptoImpl,signal),descriptor=validateFireDeliveryDescriptor(parseFireJson(raw,'descriptor')),verified=await verifyFireDeliveryDescriptor(descriptor,{readBytes,cryptoImpl,signal}),byMode={};
 // All configured closures and receipts are verified before the FIRST import.
 for(const mode of ['reference','optimized']){const entry=verified[mode];if(!entry)continue;abort(signal);const namespace=await importModule(new URL(entry.record.factoryModule,base).href);abort(signal);const factory=namespace&&Object.hasOwn(namespace,entry.record.factoryExport)?namespace[entry.record.factoryExport]:null;if(typeof factory!=='function')throw TypeError('Configured '+mode+' factory export is missing or not a function');
  byMode[mode]={...entry.record,manifestUrl:new URL(entry.record.manifestUrl,base).href,createFireRealism:factory,...(mode==='optimized'?{retainedQualityAcceptance:entry.acceptance}:{})};}
 return {status:'configured',artistDelivery:{byMode},referenceAcceptance:verified.reference.acceptance,descriptor:{url:new URL(path,base).href,sha256:descriptorHash,bytes:raw.byteLength}};
}

/** A loader instance represents one cold document boot. Reconfiguration or
 * retry after a begun load requires a fresh document, not a warm module cache.
 * Separate instances/injected transports exist for isolated offline tests. */
export function createFireReviewDeliveryLoader(dependencies={}){
 let begun=false;
 return async options=>{if(begun)throw Error('Fire delivery load already began; start a cold new document instead of hot reload');begun=true;return resolveFireReviewDelivery({...dependencies,...options});};
}
export const loadFireReviewDelivery=createFireReviewDeliveryLoader();
