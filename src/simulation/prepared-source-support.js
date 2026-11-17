// Conservative reference admission, not the future shipping loader/codec.
// Construct outside input callbacks. Runtime lookup performs no I/O or hashing.
export const PREPARED_SUPPORT_ALGORITHM='1e6bd6ec6921119af942cce3e3fc69bf2449b0b3ead543697f88e435039bd98c';
export const PREPARED_SUPPORT_LIMITS=Object.freeze({blocks:16,variantsPerKey:4,edgesPerBlock:65536,identityValues:500000,totalIdentityValues:1000000,totalEdges:200000,depth:64,stringLength:1024});
const states=new WeakMap();
const geometryFields=['id','sourceCarrierId','sourceSurfaceId','nativePartId','sourceMeshBindings','instanceId','kind','normal','closedNormal','thickness','bounds','triangles','solidTriangles','closedTriangles','closedSolidTriangles','position','intact','openFraction','queryOnly','supportType','stairFlightId','supportSurfaceIds','attachmentHostSurfaceIds','supportBinding','connectionTolerance','physicalShape','closedShape','role'];
const partFields=['id','carrierId','geometry','matrix','openMatrix','bounds','openBounds','physical','closed','portalId','originalRange'];
const object=value=>value!==null&&typeof value==='object';
const plain=value=>object(value)&&(Object.getPrototypeOf(value)===Object.prototype||Object.getPrototypeOf(value)===null);
const text=value=>typeof value==='string'&&value.length>0&&value.length<=4096;
function copy(value,limits,budget={count:0},depth=0,encoded=false){
  if(++budget.count>limits.identityValues||depth>limits.depth)throw Error('Prepared identity exceeds bounds');
  if(value===undefined)return {$undefined:true};
  if(typeof value==='number'){if(!Number.isFinite(value))throw Error('Nonfinite identity');return Object.is(value,-0)?{$number:'-0'}:value;}
  if(value===null||typeof value==='boolean')return value;
  if(typeof value==='string'){if(value.length>limits.stringLength)throw Error('Oversize identity string');return value;}
  if(!Array.isArray(value)&&!plain(value))throw Error('Unknown identity record');
  const descriptors=Object.getOwnPropertyDescriptors(value),keys=Object.keys(value);
  if(encoded&&plain(value)&&keys.length===1&&descriptors.$undefined?.value===true)return {$undefined:true};
  if(encoded&&plain(value)&&keys.length===1&&descriptors.$number?.value==='-0')return {$number:'-0'};
  for(const key of keys)if(descriptors[key].get||descriptors[key].set||key.startsWith('$'))throw Error('Custom identity field');
  if(Array.isArray(value)){if(keys.length!==value.length)throw Error('Sparse/custom identity array');return value.map(v=>copy(v,limits,budget,depth+1,encoded));}
  return Object.fromEntries(keys.sort().map(k=>[k,copy(value[k],limits,budget,depth+1,encoded)]));
}
function freeze(value){if(object(value)){for(const v of Object.values(value))freeze(v);Object.freeze(value);}return value;}
function equal(a,b){if(Object.is(a,b))return true;if(!object(a)||!object(b)||Array.isArray(a)!==Array.isArray(b))return false;const ak=Object.keys(a),bk=Object.keys(b);return ak.length===bk.length&&ak.every((k,i)=>k===bk[i]&&equal(a[k],b[k]));}
function sourceIdentity(value){if(!plain(value)||Object.values(Object.getOwnPropertyDescriptors(value)).some(d=>d.get||d.set))return false;return value.version===1&&['sourceModel','compiler','layout'].every(k=>/^[a-f0-9]{64}$/.test(value[k]))&&value.algorithm===PREPARED_SUPPORT_ALGORITHM;}
function selected(value,fields){const result={};for(const key of fields){const d=Object.getOwnPropertyDescriptor(value,key);if(d?.get||d?.set)throw Error('Custom geometry accessor');result[key]=d?d.value:undefined;}return result;}

export function encodeSourceCalculationResult(value){if(value===undefined)return {type:'undefined'};if(typeof value==='boolean')return {type:'boolean',value};throw Error('Unknown calculation result');}
function resultValue(result){if(!plain(result))throw Error('Missing typed result');if(result.type==='undefined'&&Object.keys(result).length===1)return undefined;if(result.type==='boolean'&&Object.keys(result).length===2&&typeof result.value==='boolean')return result.value;throw Error('Invalid typed result');}

// Full ordered state comparison is deliberately conservative and expensive.
// No retirement-only or revision-only identity shortcut is approved here.
export function sourceCalculationIdentity(context,identity,limits=PREPARED_SUPPORT_LIMITS){
  if(!sourceIdentity(identity)||!text(context.key)||!Array.isArray(context.owners)||!context.owners.length||context.owners.length>2||new Set(context.owners).size!==context.owners.length)throw Error('Unknown source calculation identity');
  const ownerStates=context.owners.map(id=>{
    const carrier=context.model.carrierById.get(id);if(!text(id)||!carrier)throw Error('Unknown source owner');
    const list=context.active.get(id),native=[];
    if(list)for(const b of list){
      if(!plain(b))throw Error('Unknown native record');const geometry=selected(b,geometryFields);
      if(geometry.queryOnly||geometry.sourceCarrierId!==id||context.nodes.get(geometry.id)!==b||context.index.surfaces.get(geometry.id)!==b||context.births?.get(geometry.id)!==b||context.scene.sourceDefinitions?.get(geometry.sourceSurfaceId)?.sourceCarrierId!==id)throw Error('Unknown/replaced native birth');
      native.push(geometry);
    }
    return {id,state:list?'active':'cold',orderedIds:list?list.map(b=>b.id):['cold:'+id],native,carrier,parts:carrier.parts.map(n=>selected(context.model.parts[n],partFields))};
  });
  return copy({version:1,source:identity,key:context.key,owners:context.owners,calculation:context.calculation,grid:{origin:context.scene.origin,pitch:context.scene.pitch},portalStates:context.querySource.portalStates?.()??null,ownerStates},limits);
}

function validateBlock(block,limits){
  if(!plain(block)||block.version!==1||!plain(block.identity)||!text(block.identity.key)||!Array.isArray(block.identity.ownerStates)||!Array.isArray(block.edges)||block.edges.length>limits.edgesPerBlock)throw Error('Invalid prepared block');
  const result=resultValue(block.result),kind=block.identity.calculation?.kind;
  if(!['continuity','contact','declared-region'].includes(kind)||kind==='continuity'&&block.result.type!=='undefined'||kind!=='continuity'&&typeof result!=='boolean')throw Error('Wrong calculation return type');
  const ids=new Set();for(const s of block.identity.ownerStates){if(!Array.isArray(s.orderedIds))throw Error('Missing ordered births');for(const id of s.orderedIds){if(!text(id)||ids.has(id))throw Error('Duplicate/invalid original ID');ids.add(id);}}
  const seen=new Set();for(const pair of block.edges){if(!Array.isArray(pair)||pair.length!==2||pair[0]===pair[1]||!pair.every(id=>ids.has(id)))throw Error('Unknown edge endpoint');const key=JSON.stringify(pair);if(seen.has(key))throw Error('Duplicate prepared edge');seen.add(key);}
  if(result===false&&block.edges.length)throw Error('False calculation cannot emit edges');
  return {edges:block.edges,result};
}

// `admit` must authenticate a reviewed artifact/manifest before graph creation.
// The reference tools use SHA-256 here; no callback is kept for runtime lookup.
export function createPreparedSourceProvider({identity,blocks=[],admit,limits={}}={}){
  const policy={...PREPARED_SUPPORT_LIMITS,...limits},state={identity:null,entries:new Map(),owner:null,closed:false,hits:0,misses:0,rejected:0,admitted:0,identityValues:0,edges:0};
  const validPolicy=Object.keys(policy).every(k=>Object.hasOwn(PREPARED_SUPPORT_LIMITS,k)&&Number.isSafeInteger(policy[k])&&policy[k]>0&&policy[k]<=PREPARED_SUPPORT_LIMITS[k]);
  if(validPolicy&&sourceIdentity(identity)&&Array.isArray(blocks)&&blocks.length<=policy.blocks&&typeof admit==='function'){
    state.identity=freeze(copy(identity,policy));
    for(const input of blocks)try{
      // Clone before admission; getters/custom records are rejected, and the
      // immutable admitted value cannot change between validation and replay.
      const budget={count:0},block=freeze(copy(input,policy,budget,0,true));validateBlock(block,policy);
      if(state.identityValues+budget.count>policy.totalIdentityValues||state.edges+block.edges.length>policy.totalEdges)throw Error('Prepared residency exceeds bounds');
      const admitted=admit(block);if(admitted!==true){if(admitted instanceof Promise)void admitted.catch(()=>{});throw Error('Untrusted or unfinished artifact admission');}
      const list=state.entries.get(block.identity.key)||[];if(list.length>=policy.variantsPerKey||list.some(b=>equal(b.identity,block.identity)))throw Error('Duplicate/too many prepared variants');
      list.push(block);state.entries.set(block.identity.key,list);state.admitted++;state.identityValues+=budget.count;state.edges+=block.edges.length;
    }catch{state.rejected++;}
  }else state.rejected=Array.isArray(blocks)?blocks.length:1;
  function dispose(){if(state.closed)return;state.closed=true;state.entries.clear();state.identity=null;state.owner=null;state.identityValues=0;state.edges=0;}
  const provider=Object.freeze({dispose,diagnostics:()=>({admitted:state.admitted,keys:state.entries.size,hits:state.hits,misses:state.misses,rejected:state.rejected,identityValues:state.identityValues,edges:state.edges,owned:state.owner!==null,disposed:state.closed})});
  state.policy=policy;states.set(provider,state);return provider;
}
export function claimPreparedSourceProvider(provider,owner){const s=object(provider)&&states.get(provider);if(!s||s.closed||s.owner!==null)return null;s.owner=owner;return provider;}
export function readPreparedSourceCalculation(provider,owner,context,identity){
  const s=states.get(provider);if(!s||s.closed||s.owner!==owner)return null;
  const entries=s.entries.get(context.key);if(!entries){s.misses++;return null;}
  try{
    // A source hash string cannot authenticate a mutable/custom cold resolver.
    // Until native resolver/library admission is proved, mixed cases fall back.
    if(context.owners.some(id=>!context.active.has(id)))throw Error('Cold query source admission is not implemented');
    if(!equal(copy(identity,s.policy),s.identity))throw Error('Unknown source/model revision');
    const current=sourceCalculationIdentity(context,identity,s.policy),block=entries.find(b=>equal(b.identity,current));if(!block)throw Error('Stale geometry/pose/ownership');
    const valid=validateBlock(block,s.policy);if(!valid.edges.every(pair=>pair.every(id=>context.links.has(id))))throw Error('Missing graph endpoint');
    s.hits++;return valid;
  }catch{s.rejected++;return null;}
}
export function releasePreparedSourceProvider(provider,owner){const s=object(provider)&&states.get(provider);if(s?.owner===owner)provider.dispose();}
