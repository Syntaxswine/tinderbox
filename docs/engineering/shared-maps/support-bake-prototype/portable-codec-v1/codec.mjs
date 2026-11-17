// Fenced portable codec. Browser standards only; no filesystem or crypto imports.
export const WIRE_FORMAT = Object.freeze({magic:'TBSB', version:1, headerBytes:24, trailerBytes:4});
export const DEFAULT_LIMITS = Object.freeze({
  maxBytes:262144, maxEntries:64, maxEdgesPerEntry:4096, maxEdges:8192,
  maxIds:4096, maxIdBytes:1024, maxDictionaryBytes:131072,
  maxNodes:32768, maxDepth:24, maxKeys:128, maxArrayLength:8192
});
export class SupportCodecError extends Error {
  constructor(code,message){super(code+': '+message);this.name='SupportCodecError';this.code=code;}
}
const fail=(code,message)=>{throw new SupportCodecError(code,message);};
const own=(o,k)=>Object.prototype.hasOwnProperty.call(o,k);
const HEADER=24,TRAILER=4,ROOT=1,ENTRIES=2,ENTRY=3,EDGES=4,RESULT=5,IDENTITY=6,GENERAL=0;
const NIL=0,FALSE=1,TRUE=2,NUMBER=3,STRING=4,ARRAY=5,OBJECT=6,EDGE_LIST=7;
const OBJECT_MARKER=Symbol('object'),ARRAY_MARKER=Symbol('array');
const utf8=new TextEncoder();
const utf8Decoder=new TextDecoder('utf-8',{fatal:true,ignoreBOM:true});
const shaPattern=/^[0-9a-f]{64}$/;
const commitPattern=/^[0-9a-f]{40}$/;
function limitsOf(options={}){
  if(!options||typeof options!=='object'||Array.isArray(options)||Object.keys(options).some(k=>k!=='limits'))fail('SCHEMA','Unknown codec option');
  const limits={...DEFAULT_LIMITS},overrides=options.limits;
  if(overrides!==undefined){
    if(!overrides||typeof overrides!=='object'||Array.isArray(overrides))fail('SCHEMA','Limits must be a record');
    for(const k of Object.keys(overrides)){
      const n=overrides[k];
      if(!own(limits,k)||!Number.isSafeInteger(n)||n<0||n>limits[k])fail('LIMIT','Limits may only tighten known hard ceilings');
      limits[k]=n;
    }
  }
  return limits;
}
function limited(n,maximum,label){if(n>maximum)fail('LIMIT',label+' exceeds limit');}
function finiteNumber(n){
  if(!Number.isFinite(n)||Number.isInteger(n)&&!Number.isSafeInteger(n))fail('RANGE','Number must be finite and integers must be safe');
}
function stringLength(s,maximum){
  let size=0;
  for(let i=0;i<s.length;i++){
    const c=s.charCodeAt(i);
    if(c<0x80)size++;
    else if(c<0x800)size+=2;
    else if(c>=0xd800&&c<=0xdbff){
      const d=s.charCodeAt(++i);
      if(!(d>=0xdc00&&d<=0xdfff))fail('UTF8','Unpaired high surrogate');
      size+=4;
    }else if(c>=0xdc00&&c<=0xdfff)fail('UTF8','Unpaired low surrogate');
    else size+=3;
    limited(size,maximum,'ID/string UTF-8 bytes');
  }
  return size;
}
function properties(value,limits){
  if(!value||Object.getPrototypeOf(value)!==Object.prototype)fail('SCHEMA','Only plain JSON records are supported');
  const names=Reflect.ownKeys(value);limited(names.length,limits.maxKeys,'Object keys');
  const fields=new Map();
  for(const name of names){
    const d=Object.getOwnPropertyDescriptor(value,name);
    if(typeof name!=='string'||!d.enumerable||!own(d,'value'))fail('SCHEMA','Symbols, accessors and hidden fields are unsupported');
    fields.set(name,d.value);
  }
  return fields;
}
function isObject(v){return v===OBJECT_MARKER||v!==null&&typeof v==='object'&&!Array.isArray(v);}
function isArray(v){return v===ARRAY_MARKER||Array.isArray(v);}
function validateObject(fields,context,state){
  const requireKeys=names=>{for(const name of names)if(!fields.has(name))fail('SCHEMA','Missing '+name);};
  if(context===ROOT){
    requireKeys(['format','sourceCommit','base','scope','entries']);
    if(typeof fields.get('format')!=='string'||!fields.get('format')||typeof fields.get('sourceCommit')!=='string'||!commitPattern.test(fields.get('sourceCommit'))||
      !isObject(fields.get('base'))||!isObject(fields.get('scope'))||!isArray(fields.get('entries')))fail('SCHEMA','Invalid archive envelope');
  }else if(context===ENTRY){
    requireKeys(['descriptor','signature','edges','result','blockSha256']);
    if(!isObject(fields.get('descriptor'))||typeof fields.get('signature')!=='string'||!shaPattern.test(fields.get('signature'))||
      !isArray(fields.get('edges'))||!isObject(fields.get('result'))||typeof fields.get('blockSha256')!=='string'||!shaPattern.test(fields.get('blockSha256')))fail('SCHEMA','Invalid block envelope');
    const signature=fields.get('signature');
    if(state.signatures.has(signature))fail('DUPLICATE','Repeated block signature');
    state.signatures.add(signature);
  }else if(context===RESULT){
    const type=fields.get('type');
    if(type==='undefined'&&fields.size===1)return;
    if(type==='boolean'&&fields.size===2&&typeof fields.get('value')==='boolean')return;
    fail('SCHEMA','Result must tag undefined or a boolean');
  }
}
function childContext(context,key){
  if(context===ROOT)return key==='entries'?ENTRIES:['base','scope'].includes(key)?IDENTITY:GENERAL;
  if(context===ENTRY)return key==='edges'?EDGES:key==='result'?RESULT:key==='descriptor'?IDENTITY:GENERAL;
  return GENERAL;
}
function requireContext(context,kind){
  if([ROOT,ENTRY,RESULT,IDENTITY].includes(context)&&kind!==OBJECT)fail('SCHEMA','Expected identity/result record');
  if(context===ENTRIES&&kind!==ARRAY)fail('SCHEMA','Expected block array');
  if(context===EDGES&&kind!==EDGE_LIST)fail('SCHEMA','Expected ordered edge list');
  if(kind===EDGE_LIST&&context!==EDGES)fail('FORMAT','Edge tag outside block edges');
}
function newState(){return {nodes:0,entries:0,edges:0,signatures:new Set()};}
function countNode(state,limits,depth,extra=1){
  limited(depth,limits.maxDepth,'Nesting depth');
  state.nodes+=extra;limited(state.nodes,limits.maxNodes,'Decoded nodes');
}
function arrayData(value,limits){
  limited(value.length,limits.maxArrayLength,'Array length');
  const keys=Reflect.ownKeys(value);
  if(keys.length!==value.length+1)fail('SCHEMA','Array has holes or extra properties');
  for(let i=0;i<value.length;i++){
    const d=Object.getOwnPropertyDescriptor(value,String(i));
    if(!d||!d.enumerable||!own(d,'value'))fail('SCHEMA','Array holes/accessors are unsupported');
  }
}
export function packResult(value){
  if(value===undefined)return {type:'undefined'};
  if(typeof value==='boolean')return {type:'boolean',value};
  fail('SCHEMA','Only undefined, true and false are calculation results');
}
export function unpackResult(value){
  const fields=properties(value,DEFAULT_LIMITS);validateObject(fields,RESULT,newState());
  return fields.get('type')==='undefined'?undefined:fields.get('value');
}
function traverseInput(archive,limits,visitor){
  const state=newState(),ancestors=new Set();
  function visit(value,context,depth){
    countNode(state,limits,depth);
    if(context===EDGES){
      requireContext(context,EDGE_LIST);
      if(!Array.isArray(value))fail('SCHEMA','Edges must be an array');
      arrayData(value,limits);limited(value.length,limits.maxEdgesPerEntry,'Block edges');
      state.edges+=value.length;limited(state.edges,limits.maxEdges,'Total edges');
      countNode(state,limits,depth+2,value.length*3);
      const seen=new Map();visitor.edges(value.length);
      for(const edge of value){
        if(!Array.isArray(edge)||edge.length!==2)fail('SCHEMA','Edge must contain exactly two original IDs');
        arrayData(edge,limits);
        if(!edge.every(id=>typeof id==='string'&&id.length>0)||edge[0]===edge[1])fail('RANGE','Invalid edge IDs');
        let next=seen.get(edge[0]);if(next?.has(edge[1]))fail('DUPLICATE','Repeated directed edge');
        if(!next){next=new Set();seen.set(edge[0],next);}next.add(edge[1]);
        visitor.edge(edge[0],edge[1]);
      }
      return;
    }
    const kind=value===null?NIL:typeof value==='boolean'?(value?TRUE:FALSE):
      typeof value==='number'?NUMBER:typeof value==='string'?STRING:Array.isArray(value)?ARRAY:
      value&&typeof value==='object'?OBJECT:-1;
    requireContext(context,kind);
    if(kind===NIL||kind===FALSE||kind===TRUE){visitor.scalar(kind);return;}
    if(kind===NUMBER){finiteNumber(value);visitor.number(value);return;}
    if(kind===STRING){visitor.string(value);return;}
    if(kind!==ARRAY&&kind!==OBJECT)fail('SCHEMA','Value is not JSON data');
    if(ancestors.has(value))fail('SCHEMA','Cyclic input');
    ancestors.add(value);
    try{
      if(kind===ARRAY){
        arrayData(value,limits);
        if(context===ENTRIES)limited(value.length,limits.maxEntries,'Block entries');
        visitor.array(value.length);
        for(const item of value)visit(item,context===ENTRIES?ENTRY:GENERAL,depth+1);
      }else{
        const fields=properties(value,limits);validateObject(fields,context,state);
        if(context===ENTRY){state.entries++;limited(state.entries,limits.maxEntries,'Block entries');}
        visitor.object(fields.size);
        for(const [key,item]of fields){visitor.key(key);visit(item,childContext(context,key),depth+1);}
      }
    }finally{ancestors.delete(value);}
  }
  visit(archive,ROOT,0);return state;
}
function uvBytes(n){let count=1;while(n>=128){n=Math.floor(n/128);count++;}return count;}
function crc32(bytes,end=bytes.length){
  let crc=0xffffffff;
  for(let i=0;i<end;i++){crc^=bytes[i];for(let bit=0;bit<8;bit++)crc=(crc>>>1)^((crc&1)?0xedb88320:0);}
  return (crc^0xffffffff)>>>0;
}
export function encodeSupportBlocks(archive,options={}){
  const limits=limitsOf(options),strings=[],dictionary=[],ids=new Map();let dictionaryBytes=0,dictionaryWire=0,tokens=0;
  const checkSize=()=>limited(HEADER+dictionaryWire+tokens+TRAILER,limits.maxBytes,'Encoded bytes');
  function intern(s){
    if(ids.has(s))return ids.get(s);
    limited(ids.size+1,limits.maxIds,'Dictionary IDs/strings');
    const length=stringLength(s,limits.maxIdBytes);limited(length,limits.maxIdBytes,'ID/string UTF-8 bytes');
    limited(dictionaryBytes+length,limits.maxDictionaryBytes,'Dictionary UTF-8 bytes');
    dictionaryBytes+=length;dictionaryWire+=uvBytes(length)+length;checkSize();
    const id=ids.size;ids.set(s,id);strings.push(s);dictionary.push(utf8.encode(s));return id;
  }
  const bump=n=>{tokens+=n;checkSize();};
  const first=traverseInput(archive,limits,{
    scalar(){bump(1);},number(){bump(9);},string(s){bump(1+uvBytes(intern(s)));},
    array(n){bump(1+uvBytes(n));},object(n){bump(1+uvBytes(n));},key(s){bump(uvBytes(intern(s)));},
    edges(n){bump(1+uvBytes(n));},edge(a,b){bump(uvBytes(intern(a))+uvBytes(intern(b)));}
  });
  const bytes=new Uint8Array(HEADER+dictionaryWire+tokens+TRAILER),view=new DataView(bytes.buffer);
  bytes.set([84,66,83,66,1,0,0,0]);view.setUint32(8,bytes.length,true);
  view.setUint32(12,strings.length,true);view.setUint32(16,first.entries,true);view.setUint32(20,first.edges,true);
  let offset=HEADER;
  const put=n=>{if(offset>=bytes.length-TRAILER)fail('SCHEMA','Input changed during encoding');bytes[offset++]=n;};
  function uv(n){while(n>=128){put((n%128)|128);n=Math.floor(n/128);}put(n);}
  for(const data of dictionary){uv(data.length);bytes.set(data,offset);offset+=data.length;}
  const id=s=>{if(!ids.has(s))fail('SCHEMA','Input changed during encoding');return ids.get(s);};
  const second=traverseInput(archive,limits,{
    scalar(kind){put(kind);},number(n){put(NUMBER);if(offset+8>bytes.length-TRAILER)fail('SCHEMA','Input changed during encoding');view.setFloat64(offset,n,true);offset+=8;},
    string(s){put(STRING);uv(id(s));},array(n){put(ARRAY);uv(n);},object(n){put(OBJECT);uv(n);},
    key(s){uv(id(s));},edges(n){put(EDGE_LIST);uv(n);},edge(a,b){uv(id(a));uv(id(b));}
  });
  if(offset!==bytes.length-TRAILER||first.entries!==second.entries||first.edges!==second.edges)fail('SCHEMA','Input changed during encoding');
  view.setUint32(offset,crc32(bytes,offset),true);return bytes;
}
export function decodeSupportBlocks(input,options={}){
  const limits=limitsOf(options);
  if(!(input instanceof Uint8Array))fail('SCHEMA','Expected Uint8Array');
  limited(input.byteLength,limits.maxBytes,'Encoded bytes');
  if(input.byteLength<HEADER+TRAILER)fail('TRUNCATED','Incomplete header/checksum');
  // Own the snapshot so no caller/worker can change bytes between both passes.
  const bytes=new Uint8Array(input),view=new DataView(bytes.buffer),end=bytes.length-TRAILER;
  if(bytes[0]!==84||bytes[1]!==66||bytes[2]!==83||bytes[3]!==66||bytes[4]!==1||bytes[5]!==0||view.getUint16(6,true)!==0)fail('FORMAT','Unknown magic/version/flags');
  if(view.getUint32(8,true)!==bytes.length)fail('TRUNCATED','Exact byte length mismatch');
  const idCount=view.getUint32(12,true),entryCount=view.getUint32(16,true),edgeCount=view.getUint32(20,true);
  limited(idCount,limits.maxIds,'Dictionary IDs/strings');limited(entryCount,limits.maxEntries,'Block entries');limited(edgeCount,limits.maxEdges,'Total edges');
  if(view.getUint32(end,true)!==crc32(bytes,end))fail('CORRUPT','CRC32 mismatch');
  let offset=HEADER;
  function need(n){if(n>end-offset)fail('TRUNCATED','Incomplete value');}
  function uv(){
    let n=0;
    for(let i=0;i<5;i++){
      need(1);const b=bytes[offset++];
      if(i===4&&(b&0xf0))fail('RANGE','Unsigned integer overflow');
      n+=(b&127)*2**(7*i);
      if(!(b&128)){if(i>0&&(b&127)===0)fail('FORMAT','Overlong unsigned integer');return n;}
    }
    fail('RANGE','Unsigned integer overflow');
  }
  const strings=[],unique=new Set();let dictionaryBytes=0;
  for(let i=0;i<idCount;i++){
    const length=uv();limited(length,limits.maxIdBytes,'ID/string UTF-8 bytes');
    dictionaryBytes+=length;limited(dictionaryBytes,limits.maxDictionaryBytes,'Dictionary UTF-8 bytes');need(length);
    let s;try{s=utf8Decoder.decode(bytes.subarray(offset,offset+length));}catch{fail('UTF8','Invalid dictionary UTF-8');}
    offset+=length;if(unique.has(s))fail('DUPLICATE','Repeated dictionary string');unique.add(s);strings.push(s);
  }
  const body=offset;
  function stringId(){const i=uv();if(i>=strings.length)fail('RANGE','Dictionary index out of range');return i;}
  function pass(build){
    const state=newState();offset=body;
    function value(context,depth){
      countNode(state,limits,depth);need(1);const tag=bytes[offset++];requireContext(context,tag);
      if(tag===NIL)return null;if(tag===FALSE)return false;if(tag===TRUE)return true;
      if(tag===NUMBER){need(8);const n=view.getFloat64(offset,true);offset+=8;finiteNumber(n);return n;}
      if(tag===STRING)return strings[stringId()];
      if(tag===EDGE_LIST){
        const n=uv();limited(n,limits.maxEdgesPerEntry,'Block edges');
        limited(n,limits.maxArrayLength,'Edge array length');if(n)limited(2,limits.maxArrayLength,'Edge pair length');
        state.edges+=n;limited(state.edges,limits.maxEdges,'Total edges');countNode(state,limits,depth+2,n*3);
        need(n*2);const seen=new Set(),out=build?[]:ARRAY_MARKER;
        for(let i=0;i<n;i++){
          const a=stringId(),b=stringId();
          if(a===b||!strings[a]||!strings[b])fail('RANGE','Invalid edge IDs');
          const pair=a+':'+b;if(seen.has(pair))fail('DUPLICATE','Repeated directed edge');seen.add(pair);
          if(build)out.push([strings[a],strings[b]]);
        }
        return out;
      }
      if(tag===ARRAY){
        const n=uv();limited(n,limits.maxArrayLength,'Array length');
        if(context===ENTRIES&&n!==entryCount)fail('FORMAT','Entry count mismatch');
        need(n);const out=build?[]:ARRAY_MARKER;
        for(let i=0;i<n;i++){const item=value(context===ENTRIES?ENTRY:GENERAL,depth+1);if(build)out.push(item);}
        return out;
      }
      if(tag===OBJECT){
        const n=uv();limited(n,limits.maxKeys,'Object keys');need(n*2);
        const fields=new Map(),out=build?{}:OBJECT_MARKER;let lastInteger=-1,textKey=false;
        for(let i=0;i<n;i++){
          const key=strings[stringId()];
          if(fields.has(key))fail('DUPLICATE','Repeated object key');
          const number=Number(key),integer=Number.isInteger(number)&&number>=0&&number<4294967295&&String(number)===key;
          if(integer){if(textKey||number<=lastInteger)fail('FORMAT','Noncanonical integer-key order');lastInteger=number;}else textKey=true;
          const item=value(childContext(context,key),depth+1);fields.set(key,item);
          if(build)Object.defineProperty(out,key,{value:item,enumerable:true,writable:true,configurable:true});
        }
        validateObject(fields,context,state);
        if(context===ENTRY){state.entries++;limited(state.entries,limits.maxEntries,'Block entries');}
        return out;
      }
      fail('FORMAT','Unknown value tag');
    }
    const archive=value(ROOT,0);
    if(offset!==end)fail('FORMAT','Trailing token bytes');
    if(state.entries!==entryCount||state.edges!==edgeCount)fail('FORMAT','Header count mismatch');
    return archive;
  }
  pass(false); // Complete bounds/schema/range/duplicate scan before graph expansion.
  return pass(true);
}
