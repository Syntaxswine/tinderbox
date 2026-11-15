// Installed only by the bounded review, before the real game's context exists.
// Payload estimates from explicit GL allocation/deletion are not actual VRAM.
export function installStartupGpuLedger(){
 const contexts=[],byContext=new WeakMap();
 const get=gl=>{
  if(byContext.has(gl))return byContext.get(gl);
  let sequence=0,unit=33984,total=0,peak=0,lost=false,truncated=0;const defaultSamples=gl.getParameter(gl.SAMPLES);
  const ids=new WeakMap(),textures=new Map(),buffers=new Map(),renderbuffers=new Map(),boundTextures=new Map(),boundBuffers=new Map(),events=[];let boundRenderbuffer=null;
  const note=(operation,record,extra={})=>{if(events.length<4096)events.push({phase:window.__startupPhase||'bootstrap',operation,id:record?.id,bytes:record?.bytes||0,...extra});else truncated++;};
  const assign=(record,bytes)=>{total+=bytes-record.bytes;record.bytes=bytes;peak=Math.max(peak,total);};
  const table=kind=>kind==='texture'?textures:kind==='buffer'?buffers:renderbuffers;
  const made=(kind,handle)=>{if(!handle)return;const id=++sequence,record={id,kind,bytes:0,phase:window.__startupPhase||'bootstrap',levels:new Map()};ids.set(handle,id);table(kind).set(id,record);};
  const removed=(kind,handle)=>{const id=handle&&ids.get(handle),record=table(kind).get(id);if(record){assign(record,0);table(kind).delete(id);note('delete-'+kind,record);}};
  const textureTarget=t=>t>=34069&&t<=34074?34067:t;
  const texture=t=>textures.get(boundTextures.get(unit+':'+textureTarget(t)));
  const bpp=(format,type)=>{
   const sized={33321:1,33323:2,32849:3,32856:4,35907:4,33325:2,33327:4,34843:6,34842:8,33326:4,33328:8,34837:12,34836:16,33189:2,33190:3,36012:4,35056:4,36013:8};
   if(sized[format])return sized[format];const channels=format===6403||format===6402||format===6406||format===6409?1:format===33319||format===6410?2:format===6407?3:4;
   return channels*(type===5126||type===5125?4:type===5123||type===5131||type===36193?2:1);
  };
  const image=(target,level,format,type,width,height,source)=>{
   const record=texture(target);if(!record||!Number.isFinite(width)||!Number.isFinite(height))return;
   if(level===0){record.width=width;record.height=height;record.format=format;record.type=type;record.source=source==null?'target':ArrayBuffer.isView(source)?'typed':typeof source==='number'?'storage':'image';}
   const key=target+':'+level,old=record.levels.get(key)||0,bytes=Math.max(0,width*height*bpp(format,type));record.levels.set(key,bytes);assign(record,record.bytes+bytes-old);note('texture-image',record,{width,height,format,source:record.source});
  };
  const state={
   wrap(name,invoke){const original=gl[name];if(typeof original!=='function')return;gl[name]=function(...args){const value=original.apply(this,args);invoke(args,value);return value;};},
   summary(includeEvents){const sum=t=>[...t.values()].reduce((n,r)=>n+r.bytes,0),live=[...textures.values()].filter(r=>r.bytes).sort((a,b)=>b.bytes-a.bytes);return {lost,logicalBytes:total,peakLogicalBytes:peak,textures:textures.size,buffers:buffers.size,renderbuffers:renderbuffers.size,textureBytes:sum(textures),bufferBytes:sum(buffers),renderbufferBytes:sum(renderbuffers),largestTextures:live.slice(0,16).map(({levels,...r})=>({...r,levels:levels.size})),drawingBuffer:[gl.drawingBufferWidth,gl.drawingBufferHeight],defaultFramebufferBaseBytes:gl.drawingBufferWidth*gl.drawingBufferHeight*8,defaultSamples,events:includeEvents?events.slice():undefined,allocationEvents:events.length,truncatedEvents:truncated};}
  };
  state.wrap('createTexture',(_,handle)=>made('texture',handle));state.wrap('deleteTexture',([handle])=>removed('texture',handle));
  state.wrap('activeTexture',([value])=>{unit=value;});state.wrap('bindTexture',([target,handle])=>boundTextures.set(unit+':'+target,handle?ids.get(handle):null));
  state.wrap('texImage2D',a=>{const numeric=a.length>=9&&typeof a[3]==='number'&&typeof a[4]==='number',source=numeric?a[8]:a[5];image(a[0],a[1],a[2],numeric?a[7]:a[4],numeric?a[3]:source?.width,numeric?a[4]:source?.height,source);});
  state.wrap('texStorage2D',a=>{for(let level=0;level<a[1];level++)image(a[0],level,a[2],null,Math.max(1,a[3]>>level),Math.max(1,a[4]>>level),0);});
  state.wrap('generateMipmap',([target])=>{const r=texture(target);if(!r?.width)return;const {width,height}=r;for(let level=1;level<=Math.floor(Math.log2(Math.max(width,height)));level++)if(!r.levels.has(target+':'+level))image(target,level,r.format,r.type,Math.max(1,width>>level),Math.max(1,height>>level),0);});
  state.wrap('createBuffer',(_,handle)=>made('buffer',handle));state.wrap('deleteBuffer',([handle])=>removed('buffer',handle));state.wrap('bindBuffer',([target,handle])=>boundBuffers.set(target,handle?ids.get(handle):null));
  state.wrap('bufferData',([target,data])=>{const r=buffers.get(boundBuffers.get(target));if(r){assign(r,typeof data==='number'?data:data?.byteLength||0);note('buffer-data',r);}});
  state.wrap('createRenderbuffer',(_,handle)=>made('renderbuffer',handle));state.wrap('deleteRenderbuffer',([handle])=>removed('renderbuffer',handle));state.wrap('bindRenderbuffer',([,handle])=>{boundRenderbuffer=handle?ids.get(handle):null;});
  const renderbuffer=(format,w,h,samples)=>{const r=renderbuffers.get(boundRenderbuffer);if(r){assign(r,w*h*bpp(format,null)*samples);note('renderbuffer-storage',r,{width:w,height:h,samples});}};
  state.wrap('renderbufferStorage',a=>renderbuffer(a[1],a[2],a[3],1));state.wrap('renderbufferStorageMultisample',a=>renderbuffer(a[2],a[3],a[4],a[1]));
  gl.canvas.addEventListener('webglcontextlost',()=>{lost=true;total=0;textures.clear();buffers.clear();renderbuffers.clear();note('context-lost');});
  byContext.set(gl,state);contexts.push(state);return state;
 };
 const context=HTMLCanvasElement.prototype.getContext;HTMLCanvasElement.prototype.getContext=function(type,...args){const result=context.call(this,type,...args);if(result&&/^(webgl2?|experimental-webgl)$/.test(type))get(result);return result;};
 window.__startupGpu=(includeEvents=false)=>({scope:'Explicit GL payload estimates; excludes driver padding, default MSAA/layers, decoded images and engine overhead. Not an iPhone or actual VRAM measurement.',contexts:contexts.map(state=>state.summary(includeEvents))});
}
