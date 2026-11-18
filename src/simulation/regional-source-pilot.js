// Isolated compiler/quantity pilot. No map factory or world activation uses it.
import {compileScene} from '../../workbenches/furnished-house/scene.js';
import {bounds,EPS} from '../../workbenches/furnished-house/geometry.js';
import {sourcePartitionAllowance} from '../../workbenches/furnished-house/partition-error.js';
import {createRegionalCompileDomain} from '../../workbenches/furnished-house/regional-domain.js';

const descriptors=new WeakMap(),receipts=new WeakMap(),pilots=new WeakMap(),querySlices=new WeakMap();
const worldAdmissions=new WeakMap();
const freeze=value=>{if(value&&typeof value==='object'){for(const v of Object.values(value))freeze(v);Object.freeze(value);}return value;};
const sum=list=>list.reduce((a,b)=>a+b,0);
const finiteVector=value=>Array.isArray(value)&&value.length===3&&value.every(Number.isFinite);
const roundoff=(q,n)=>64*Number.EPSILON*Math.max(1,q)*Math.max(1,n);
// Deliberately limited to the accepted static roof's 320 potential descriptors.
export const REGIONAL_SOURCE_PILOT_LIMITS=Object.freeze({descriptors:320});
function span(surface,origin,pitch){
  const box=bounds(surface.triangles.flat()),min=box.min.map((v,i)=>Math.floor((v-origin[i])/pitch[i]+EPS)),max=box.max.map((v,i)=>box.max[i]-box.min[i]<EPS?min[i]:Math.ceil((v-origin[i])/pitch[i]-EPS)-1);
  if(![...min,...max,...max.map(v=>v+1)].every(Number.isSafeInteger)||min.some((v,i)=>v>max[i]))throw Error('Unsafe native source span/exclusive end');return {min,max};
}
function clearScene(scene){for(const map of [scene.index.surfaces,scene.index.bins,scene.cells,scene.fuels,scene.items,scene.parts,scene.sourceDefinitions])map.clear();}
function guardPhysicalReceipt(scene){
  // Only local record/field references are retained. Geometry is frozen in
  // place, never cloned/serialized into a second full physical snapshot.
  const index=scene.index,readers=[()=>scene.index.surfaces,()=>scene.index.bins,()=>scene.cells,()=>scene.fuels,()=>scene.items,()=>scene.parts,()=>scene.sourceDefinitions];
  const tables=readers.map(read=>({read,map:read(),entries:[...read()]})),records=[scene,index,scene.profile,...Object.values(scene.profile),...tables.flatMap(t=>t.entries.map(([,v])=>v)).filter(v=>!(v instanceof Set))],terminals=new Set(records),seen=new WeakSet();
  function immutable(value){if(!value||typeof value!=='object'||terminals.has(value)||seen.has(value))return;seen.add(value);if(!(value instanceof Map)&&!(value instanceof Set))for(const v of Object.values(value))immutable(v);Object.freeze(value);}
  const fields=records.map(record=>{const descriptors=Object.getOwnPropertyDescriptors(record);for(const d of Object.values(descriptors))immutable(d.value);return {record,prototype:Object.getPrototypeOf(record),descriptors};});
  const bins=tables[1].entries.map(([,set])=>({set,records:[...set]}));
  function changed(){throw Error('Regional physical receipt changed');}
  return {validate(){
    if(scene.index!==index)changed();
    for(const t of tables)if(t.read()!==t.map||t.map.size!==t.entries.length||t.entries.some(([id,value])=>t.map.get(id)!==value))changed();
    for(const b of bins)if(b.set.size!==b.records.length||b.records.some(record=>!b.set.has(record)))changed();
    for(const {record,prototype,descriptors}of fields){if(Object.getPrototypeOf(record)!==prototype||Reflect.ownKeys(record).length!==Reflect.ownKeys(descriptors).length)changed();for(const key of Reflect.ownKeys(descriptors)){const expected=descriptors[key],current=Object.getOwnPropertyDescriptor(record,key);if(!current||!Object.is(current.value,expected.value)||current.get!==expected.get||current.set!==expected.set||current.enumerable!==expected.enumerable||current.configurable!==expected.configurable||current.writable!==expected.writable)changed();}}
  },dispose(){for(const t of tables){t.map.clear();t.entries.length=0;}records.length=0;fields.length=0;bins.length=0;terminals.clear();}};
}
function checkCertificate(c,native){
  if(![c.canonicalQuantity,c.canonicalRoundoff,c.positive,c.negative,c.roundoffBound,native].every(v=>Number.isFinite(v)&&v>=0)||c.epsilon!==EPS)throw Error('Invalid regional quantity certificate');
  const delta=native-c.canonicalQuantity;if(delta>c.positive||delta< -c.negative)throw Error('Regional native quantity exceeds its source-local certificate');
}
export function regionalStockRow(owner,list){
  const totalRegions=owner.totalRegions??owner.mins.length,q=sum(list.map(c=>c.q)),native=sum(list.map(c=>c.native)),full=list.length===totalRegions,proved=owner.inputRoundoff+sum(list.map(c=>c.canonicalRoundoff))+roundoff(owner.q,list.length);
  if(![q,native,proved].every(v=>Number.isFinite(v)&&v>=0))throw Error('Invalid finite regional parent quantity/proof');
  const remainder=full?owner.q-q:0;if(full&&Math.abs(remainder)>proved)throw Error('Unproved canonical parent remainder');
  if(q>owner.q+proved)throw Error('Regional claims exceed original canonical stock');
  const canonical=full?owner.q:Math.min(owner.q,q),carry=canonical-q;
  if(!Number.isFinite(carry)||Math.abs(carry)>proved)throw Error('Unproved canonical parent arithmetic carry');
  const positive=sum(list.map(c=>c.positive))+Math.max(0,-carry)+roundoff(native,list.length),negative=sum(list.map(c=>c.negative))+Math.max(0,carry)+roundoff(native,list.length),delta=native-canonical;
  if(![positive,negative].every(Number.isFinite))throw Error('Invalid finite regional parent clipping proof');
  if(delta>positive||delta< -negative)throw Error('Regional parent native roll-up exceeds its local proof');
  return {id:owner.id,quantity:owner.q,state:full?'full':list.length?'partial':'cold',claimedRegions:list.length,totalRegions,canonicalMeasured:q,canonicalTransferred:canonical,coldReserve:owner.q-canonical,parentArithmeticCarry:carry,canonicalRemainder:remainder,remainderClosed:full,provedRemainderBound:proved,nativeBorn:native,clippingDelta:delta,partitionError:{epsilon:EPS,positive,negative}};
}
const stockRow=regionalStockRow;
export function createRegionalSourcePilot({data,owners,sourceRevision}){
  if(!/^[a-f0-9]{64}$/.test(sourceRevision)||data?.version!==1||data.runtimeAdapterVersion!==1||data.implicitGround!==false||!finiteVector(data.gridOrigin)||!finiteVector(data.thermalCell)||data.thermalCell.some((v,i)=>v!==[.5,1.06,.5][i]))throw Error('Static regional pilot needs a pinned native grid/source');
  if(['openings','items','furnitureParts','stores'].some(k=>data[k]?.length))throw Error('Only static isolated source surfaces are allowed');
  const input=freeze(structuredClone(data)),ownerMap=new Map(),sourceIds=new Set(),activeReceipts=new Set();let epoch=0,closed=false,nativeCalls=0,visitedCells=0,certificateBuilds=0,catalogueSize=0;
  for(const record of owners||[]){
    const q=record.fuelAmount+(record.finish?.amount??0),surfaces=input.surfaces.filter(s=>s.sourceCarrierId===record.id);
    if(typeof record.id!=='string'||ownerMap.has(record.id)||!Number.isFinite(record.fuelAmount)||record.fuelAmount<0||!Number.isFinite(record.finish?.amount??0)||(record.finish?.amount??0)<0||!Number.isFinite(q)||!surfaces.length)throw Error('Invalid original regional owner');
    for(const s of surfaces){if(!s.id||sourceIds.has(s.id)||!s.triangles?.length||!s.triangles.every(t=>Array.isArray(t)&&t.length===3&&t.every(finiteVector))||!Number.isFinite(s.fuelAmount)||s.fuelAmount<0||!Number.isFinite(s.finish?.amount??0)||(s.finish?.amount??0)<0||s.finish?.amount>0&&!(s.fuelAmount>0))throw Error('Uncertifiable original regional surface');sourceIds.add(s.id);}
    const assigned=sum(surfaces.map(s=>s.fuelAmount+(s.finish?.amount||0))),inputRoundoff=roundoff(q,surfaces.length);
    if(Math.abs(assigned-q)>inputRoundoff)throw Error('Original surface allocation differs from its canonical owner');
    const spans=surfaces.map(s=>span(s,input.gridOrigin,input.thermalCell)),lo=[0,1,2].map(i=>Math.min(...spans.map(s=>s.min[i]))),hi=[0,1,2].map(i=>Math.max(...spans.map(s=>s.max[i]))),stride=[4,1,4],first=lo.map((v,i)=>Math.floor(v/stride[i])*stride[i]),end=hi.map((v,i)=>(Math.floor(v/stride[i])+1)*stride[i]);
    if(![...first,...end].every(Number.isSafeInteger))throw Error('Unsafe native regional origin/exclusive end');
    const counts=end.map((v,i)=>(v-first[i])/stride[i]);let size=1;
    for(const n of counts){if(!Number.isSafeInteger(n)||n<1||n>REGIONAL_SOURCE_PILOT_LIMITS.descriptors||size>Math.floor(REGIONAL_SOURCE_PILOT_LIMITS.descriptors/n))throw Error('Static roof descriptor catalogue exceeds 320');size*=n;}
    catalogueSize+=size;if(catalogueSize>REGIONAL_SOURCE_PILOT_LIMITS.descriptors)throw Error('Static roof descriptor catalogue exceeds 320');
    ownerMap.set(record.id,{id:record.id,q,surfaces,first,counts,mins:[],keys:new Set(),inputRoundoff,certificates:new Map()});
  }
  if(!ownerMap.size||input.surfaces.some(s=>!ownerMap.has(s.sourceCarrierId)))throw Error('Every source needs its one original owner');
  // No descriptor is enumerated until every owner/span and the total pass.
  for(const owner of ownerMap.values())for(let y=0;y<owner.counts[1];y++)for(let z=0;z<owner.counts[2];z++)for(let x=0;x<owner.counts[0];x++){const min=owner.first.map((v,i)=>v+[x,y,z][i]*[4,1,4][i]);owner.mins.push(min);owner.keys.add(min.join(','));}
  function live(){if(closed)throw Error('Regional compiler pilot disposed');}
  function region(id,min){
    live();const owner=ownerMap.get(id);
    if(!owner||!Array.isArray(min)||min.length!==3||!min.every(Number.isSafeInteger)||min[0]%4||min[2]%4||!owner.keys.has(min.join(',')))throw Error('Malformed or off-grid regional descriptor');
    const descriptor=freeze({version:1,sourceRevision,ownerId:id,epoch,cellMin:[...min],cellMaxExclusive:[min[0]+4,min[1]+1,min[2]+4],span:[4,1,4],origin:[...input.gridOrigin],pitch:[...input.thermalCell]});
    descriptors.set(descriptor,{pilot,owner,epoch,key:min.join(',')});return descriptor;
  }
  function validateDescriptor(descriptor){
    live();const d=descriptors.get(descriptor);if(!d||d.pilot!==pilot||d.epoch!==epoch)throw Error('Unknown or stale regional descriptor');return d;
  }
  function certificate(owner,descriptor,key){
    if(owner.certificates.has(key))return owner.certificates.get(key);
    const domain={min:descriptor.cellMin,max:descriptor.cellMaxExclusive.map(v=>v-1)},rows=owner.surfaces.map(s=>({sourceId:s.id,...sourcePartitionAllowance(s,{origin:input.gridOrigin,pitch:input.thermalCell,region:domain})}));
    const result=freeze({epsilon:EPS,canonicalQuantity:sum(rows.map(r=>r.canonicalQuantity)),canonicalRoundoff:sum(rows.map(r=>r.canonicalRoundoff)),positive:sum(rows.map(r=>r.positive)),negative:sum(rows.map(r=>r.negative)),roundoffBound:sum(rows.map(r=>r.roundoffBound)),sourceInputRoundoff:owner.inputRoundoff,rows});
    checkCertificate(result,result.canonicalQuantity);owner.certificates.set(key,result);certificateBuilds++;return result;
  }
  function compile(descriptor){
    const d=validateDescriptor(descriptor),cert=certificate(d.owner,descriptor,d.key),trace={visitedCells:0,sources:[]},local={...input,surfaces:d.owner.surfaces,partialCompilation:true},token=createRegionalCompileDomain(local,descriptor.cellMin,trace);
    let scene,physical;try{
      nativeCalls++;scene=compileScene(local,{regionalPilot:token});visitedCells+=trace.visitedCells;checkCertificate(cert,scene.initialFuel);
      physical=guardPhysicalReceipt(scene);
      const boundaryIds=[...scene.index.surfaces.keys()],fuelIds=[...scene.fuels.keys()],expected=new Map([...scene.fuels].map(([id,f])=>[id,{amount:f.amount,initial:f.initial,cls:f.cls,sourceSurfaceId:f.sourceSurfaceId}]));
      let disposed=false;
      const receipt=Object.freeze({kind:'isolated-regional-compiler-receipt-v1',partialCompilation:true,descriptor,certificate:cert,nativeQuantity:scene.initialFuel,trace:freeze(trace),scene,
        dispose(){if(disposed)return;disposed=true;const r=receipts.get(receipt);if(r?.slice)querySlices.delete(r.slice);if(r)r.slice=null;physical.dispose();expected.clear();activeReceipts.delete(receipt);}});
      receipts.set(receipt,{pilot,epoch,key:d.key,owner:d.owner,boundaryIds,fuelIds,expected,physical,isDisposed:()=>disposed});activeReceipts.add(receipt);return receipt;
    }catch(error){if(physical)physical.dispose();else if(scene)clearScene(scene);throw error;}
  }
  function validateReceipt(receipt){
    live();const r=receipts.get(receipt);if(!r||r.pilot!==pilot||r.epoch!==epoch||r.isDisposed())throw Error('Unknown or stale regional receipt');
    r.physical.validate();
    const scene=receipt.scene;
    if(scene.index.surfaces.size!==r.boundaryIds.length||r.boundaryIds.some(id=>!scene.index.surfaces.has(id))||scene.fuels.size!==r.fuelIds.length)throw Error('Regional receipt IDs changed');
    let native=0;for(const [id,value]of r.expected){const f=scene.fuels.get(id);if(!f||f.amount!==value.amount||f.initial!==value.initial||f.cls!==value.cls||f.sourceSurfaceId!==value.sourceSurfaceId)throw Error('Regional receipt quantity/profile changed');native+=f.amount;}
    if(native!==receipt.nativeQuantity)throw Error('Regional receipt sum changed');checkCertificate(receipt.certificate,native);return r;
  }
  function querySlice(receipt){
    const r=validateReceipt(receipt);if(r.slice)return r.slice;
    // The producer attests its completed original source/cell loops, including
    // cells that emitted nothing. Neither zero fuel nor a caller flag is proof.
    const descriptor=receipt.descriptor,trace=receipt.trace,entries=[],byPart=new Map(),seen=new Set();let visits=0;
    if(trace.sources.length!==r.owner.surfaces.length)throw Error('Incomplete restricted source loops');
    for(const [i,s]of r.owner.surfaces.entries()){
      if(typeof s.nativePartId!=='string'||!s.nativePartId)throw Error('Original source part metadata required for query slice');
      const full=span(s,input.gridOrigin,input.thermalCell),min=full.min.map((v,j)=>Math.max(v,descriptor.cellMin[j])),max=full.max.map((v,j)=>Math.min(v,descriptor.cellMaxExclusive[j]-1)),t=trace.sources[i],count=min.reduce((n,v,j)=>n*Math.max(0,max[j]-v+1),1);
      if(t.sourceId!==s.id||JSON.stringify(t.full)!==JSON.stringify(full)||JSON.stringify(t.restricted)!==JSON.stringify({min,max})||t.cells!==count)throw Error('Incomplete restricted part-cell loops');visits+=count;
      let part=byPart.get(s.nativePartId);if(!part){part={partId:s.nativePartId,min:[...full.min],max:[...full.max],cells:[],sourceIds:[]};byPart.set(s.nativePartId,part);}else for(let j=0;j<3;j++){part.min[j]=Math.min(part.min[j],full.min[j]);part.max[j]=Math.max(part.max[j],full.max[j]);}part.sourceIds.push(s.id);
      const single=full.min.every((v,j)=>v===full.max[j]);
      for(let z=min[2];z<=max[2];z++)for(let y=min[1];y<=max[1];y++)for(let x=min[0];x<=max[0];x++){
        const cell=[x,y,z],id=single?s.id:`${s.id}@${cell.join(',')}`,b=receipt.scene.index.surfaces.get(id);if(!b)continue;
        if(seen.has(id)||b.sourceSurfaceId!==s.id||b.sourceCarrierId!==r.owner.id||b.nativePartId!==s.nativePartId)throw Error('Original query slice identity mismatch');seen.add(id);
        const {heatCells,...record}=b;entries.push({cell,record});
      }
    }
    if(visits!==trace.visitedCells||seen.size!==r.boundaryIds.length)throw Error('Incomplete restricted compiler coverage');
    for(const part of byPart.values()){
      const min=part.min.map((v,i)=>Math.max(v,descriptor.cellMin[i])),max=part.max.map((v,i)=>Math.min(v,descriptor.cellMaxExclusive[i]-1));
      for(let z=min[2];z<=max[2];z++)for(let y=min[1];y<=max[1];y++)for(let x=min[0];x<=max[0];x++)part.cells.push([x,y,z]);
    }
    const token=Object.freeze({kind:'authenticated-regional-query-slice-v1',epoch,sourceRevision,ownerId:r.owner.id}),payload=freeze({epoch,sourceRevision,origin:descriptor.origin,pitch:descriptor.pitch,ownerId:r.owner.id,descriptor,parts:[...byPart.values()],entries});
    querySlices.set(token,{pilot,receipt,payload});r.slice=token;return token;
  }
  const pilot=Object.freeze({region,regions(id){live();const owner=ownerMap.get(id);if(!owner)throw Error('Unknown original region owner');return owner.mins.map(min=>region(id,min));},compile,querySlice,
    diagnostics:()=>({productionEnabled:false,closed,epoch,nativeCalls,visitedCells,certificateBuilds,retainedReceipts:activeReceipts.size,owners:[...ownerMap.values()].map(o=>({id:o.id,quantity:o.q,regions:o.mins.length,cachedCertificates:o.certificates.size}))}),
    dispose(){if(closed)return;for(const receipt of activeReceipts)receipt.dispose();closed=true;epoch++;ownerMap.clear();}});
  pilots.set(pilot,{live,ownerMap,validateReceipt,sourceRevision,grid:freeze({origin:input.gridOrigin,pitch:input.thermalCell}),ledger:null,get closed(){return closed;},get epoch(){return epoch;},advance(){live();for(const receipt of activeReceipts)receipt.dispose();epoch++;}});return pilot;
}

// Pure receipt staging. It owns no trial/index installation, query proxy or clock.
export function createRegionalClaimLedger(pilot){
  const p=pilots.get(pilot);if(!p)throw Error('Unknown isolated regional compiler');p.live();if(p.ledger)throw Error('Regional compiler already has a staging ledger');
  let closed=false,generation=p.epoch;const claims=new Map(),ids=new Set();
  function live(){p.live();if(closed||generation!==p.epoch)throw Error('Regional staging ledger is stale/disposed');}
  function row(owner,extra=null){
    const list=[...(claims.get(owner.id)?.values()||[])];if(extra)list.push(extra);
    // A partial sum below Q is untouched. Only a proved roundoff overshoot
    // is capped in parent bookkeeping (negative carry, zero cold reserve).
    // Measured shares/native fuel stay unchanged; full closure is booked once.
    return stockRow(owner,list);
  }
  function prepare(receipt){
    live();const r=p.validateReceipt(receipt),claim={key:r.key,q:receipt.certificate.canonicalQuantity,native:receipt.nativeQuantity,canonicalRoundoff:receipt.certificate.canonicalRoundoff,positive:receipt.certificate.positive,negative:receipt.certificate.negative};let committed=false;
    function validate(){live();p.validateReceipt(receipt);if(committed||claims.get(r.owner.id)?.has(r.key))throw Error('Duplicate/overlapping regional claim');if([...r.boundaryIds,...r.fuelIds].some(id=>ids.has(id)))throw Error('Duplicate regional native ID');row(r.owner,claim);}
    validate();return Object.freeze({validate,commit(){validate();if(!claims.has(r.owner.id))claims.set(r.owner.id,new Map());claims.get(r.owner.id).set(r.key,claim);for(const id of [...r.boundaryIds,...r.fuelIds])ids.add(id);committed=true;return row(r.owner);}});
  }
  const ledger=Object.freeze({prepare,snapshot(){live();return {generation,owners:[...p.ownerMap.values()].map(o=>row(o)),claimedNativeIds:ids.size};},
    reset(){live();p.advance();generation=p.epoch;claims.clear();ids.clear();},
    dispose(){if(closed)return;if(!p.closed&&generation===p.epoch)p.advance();closed=true;claims.clear();ids.clear();if(p.ledger===ledger)p.ledger=null;}});
  p.ledger=ledger;return ledger;
}

// Private participant for the disabled bridge. Snapshots are detached numeric
// states; preparing one never advances another snapshot's stock or native IDs.
export function createRegionalStockParticipant(pilot){
  const p=pilots.get(pilot);if(!p)throw Error('Unknown isolated regional compiler');p.live();if(p.ledger)throw Error('Regional compiler already has a staging ledger');
  let closed=false,generation=p.epoch;const states=new Map();
  function live(){p.live();if(closed||generation!==p.epoch)throw Error('Regional stock participant stale/disposed');}
  function make(claims=new Map(),ids=new Set()){
    const snapshot=freeze({generation,owners:[...p.ownerMap.values()].map(o=>stockRow(o,[...(claims.get(o.id)?.values()||[])])),claimedNativeIds:ids.size});states.set(snapshot,{claims,ids});return snapshot;
  }
  function release(snapshot){const state=states.get(snapshot);if(state){for(const claims of state.claims.values())claims.clear();state.claims.clear();state.ids.clear();states.delete(snapshot);}}
  const participant=Object.freeze({context(){live();return freeze({generation,sourceRevision:p.sourceRevision,grid:{...p.grid},owners:[...p.ownerMap.keys()],parts:[...p.ownerMap.values()].flatMap(o=>[...new Set(o.surfaces.map(s=>s.nativePartId))].map(id=>({id,ownerId:o.id})))});},initial(){live();return make();},slice:receipt=>pilot.querySlice(receipt),inspect(slice){
    live();const s=querySlices.get(slice);if(!s||s.pilot!==pilot||s.payload.epoch!==generation)throw Error('Unknown/foreign/stale query slice');p.validateReceipt(s.receipt);return s.payload;
  },prepare(snapshot,list){
    live();const state=states.get(snapshot);if(!state||!Array.isArray(list)||list.length>REGIONAL_SOURCE_PILOT_LIMITS.descriptors)throw Error('Unknown stock snapshot or bounded receipt batch required');
    const captured=[...list],claims=new Map([...state.claims].map(([id,rows])=>[id,new Map(rows)])),ids=new Set(state.ids);
    for(const receipt of captured){const r=p.validateReceipt(receipt);let rows=claims.get(r.owner.id);if(!rows){rows=new Map();claims.set(r.owner.id,rows);}if(rows.has(r.key))throw Error('Duplicate/overlapping regional claim');
      for(const id of [...r.boundaryIds,...r.fuelIds]){if(ids.has(id))throw Error('Duplicate regional native ID');ids.add(id);}
      rows.set(r.key,{key:r.key,q:receipt.certificate.canonicalQuantity,native:receipt.nativeQuantity,canonicalRoundoff:receipt.certificate.canonicalRoundoff,positive:receipt.certificate.positive,negative:receipt.certificate.negative});
    }
    const next=make(claims,ids);let discarded=false;
    return Object.freeze({snapshot:next,validate(){live();if(discarded||!states.has(snapshot)||!states.has(next))throw Error('Stale/discarded stock stage');for(const receipt of captured)p.validateReceipt(receipt);},dispose(){if(discarded)return;discarded=true;captured.length=0;release(next);}});
  },release,reset(){live();p.advance();generation=p.epoch;for(const snapshot of states.keys())release(snapshot);return make();},
    dispose({advance=true}={}){if(closed)return;if(advance&&!p.closed&&generation===p.epoch)p.advance();closed=true;for(const snapshot of states.keys())release(snapshot);if(p.ledger===participant)p.ledger=null;},
    diagnostics:()=>({generation,closed,retainedStockStates:states.size})});
  p.ledger=participant;return participant;
}

// One guarded producer reader for the disabled coupled world. This lock owns
// receipt authority, not another stock account. Geometry remains borrowed.
export function createRegionalWorldSource(pilot){
  const p=pilots.get(pilot);if(!p)throw Error('Unknown regional producer');p.live();if(p.ledger)throw Error('Regional producer already owned');
  let closed=false;const marker={},tickets=new Set();p.ledger=marker;
  const live=()=>{p.live();if(closed||p.ledger!==marker)throw Error('Regional world source disposed');};
  const inspect=slice=>{live();const s=querySlices.get(slice);if(!s||s.pilot!==pilot||s.payload.epoch!==p.epoch)throw Error('Unknown/foreign/stale regional slice');p.validateReceipt(s.receipt);return s.payload;};
  const api=Object.freeze({
    context(){live();return {generation:p.epoch,sourceRevision:p.sourceRevision,grid:p.grid,owners:[...p.ownerMap.values()].map(o=>({id:o.id,q:o.q,inputRoundoff:o.inputRoundoff,totalRegions:o.mins.length})),surfaces:[...p.ownerMap.values()].flatMap(o=>o.surfaces)};},
    slice(receipt){live();return pilot.querySlice(receipt);},inspect,
    admission(list){live();const captured=[...list],bundles=captured.map(receipt=>{const r=p.validateReceipt(receipt),slice=pilot.querySlice(receipt),payload=inspect(slice);return {scene:receipt.scene,entries:payload.entries,parts:payload.parts,slice,stock:{id:r.owner.id,q:r.owner.q,inputRoundoff:r.owner.inputRoundoff,totalRegions:r.owner.mins.length,key:r.key,claim:{q:receipt.certificate.canonicalQuantity,native:receipt.nativeQuantity,canonicalRoundoff:receipt.certificate.canonicalRoundoff,positive:receipt.certificate.positive,negative:receipt.certificate.negative}}};});
      for(const b of bundles){freeze(b.stock);Object.freeze(b);}Object.freeze(bundles);
      const token=Object.freeze({kind:'internal-hybrid-admission',generation:p.epoch}),entry={bundles,context:freeze({generation:p.epoch,sourceRevision:p.sourceRevision,grid:p.grid}),closed:false,validate(){live();if(entry.closed||token.generation!==p.epoch)throw Error('Stale regional world admission');for(const receipt of captured)p.validateReceipt(receipt);},dispose(){entry.closed=true;captured.length=0;entry.bundles=null;tickets.delete(entry);}};worldAdmissions.set(token,entry);tickets.add(entry);return token;
    },
    dispose({advance=true}={}){if(closed)return;for(const t of tickets)t.dispose();if(advance&&!p.closed)p.advance();closed=true;if(p.ledger===marker)p.ledger=null;}
  });return api;
}
export function readRegionalWorldAdmission(token){const a=worldAdmissions.get(token);if(!a)throw Error('Genuine regional world admission required');a.validate();return Object.freeze({context:a.context,get bundles(){a.validate();return a.bundles;},validate:()=>a.validate(),dispose:()=>a.dispose()});}
