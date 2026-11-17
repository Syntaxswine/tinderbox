// Isolated compiler/quantity pilot. No map factory or world activation uses it.
import {compileScene} from '../../workbenches/furnished-house/scene.js';
import {bounds,EPS} from '../../workbenches/furnished-house/geometry.js';
import {sourcePartitionAllowance} from '../../workbenches/furnished-house/partition-error.js';
import {createRegionalCompileDomain} from '../../workbenches/furnished-house/regional-domain.js';

const descriptors=new WeakMap(),receipts=new WeakMap(),pilots=new WeakMap();
const freeze=value=>{if(value&&typeof value==='object'){for(const v of Object.values(value))freeze(v);Object.freeze(value);}return value;};
const sum=list=>list.reduce((a,b)=>a+b,0);
const finiteVector=value=>Array.isArray(value)&&value.length===3&&value.every(Number.isFinite);
const roundoff=(q,n)=>64*Number.EPSILON*Math.max(1,q)*Math.max(1,n);
function span(surface,origin,pitch){
  const box=bounds(surface.triangles.flat()),min=box.min.map((v,i)=>Math.floor((v-origin[i])/pitch[i]+EPS)),max=box.max.map((v,i)=>box.max[i]-box.min[i]<EPS?min[i]:Math.ceil((v-origin[i])/pitch[i]-EPS)-1);return {min,max};
}
function clearScene(scene){for(const map of [scene.index.surfaces,scene.index.bins,scene.cells,scene.fuels,scene.items,scene.parts,scene.sourceDefinitions])map.clear();}
function checkCertificate(c,native){
  if(![c.canonicalQuantity,c.canonicalRoundoff,c.positive,c.negative,c.roundoffBound,native].every(v=>Number.isFinite(v)&&v>=0)||c.epsilon!==EPS)throw Error('Invalid regional quantity certificate');
  const delta=native-c.canonicalQuantity;if(delta>c.positive||delta< -c.negative)throw Error('Regional native quantity exceeds its source-local certificate');
}
export function createRegionalSourcePilot({data,owners,sourceRevision}){
  if(!/^[a-f0-9]{64}$/.test(sourceRevision)||data?.version!==1||data.runtimeAdapterVersion!==1||data.implicitGround!==false||!finiteVector(data.gridOrigin)||!finiteVector(data.thermalCell)||data.thermalCell.some((v,i)=>v!==[.5,1.06,.5][i]))throw Error('Static regional pilot needs a pinned native grid/source');
  if(['openings','items','furnitureParts','stores'].some(k=>data[k]?.length))throw Error('Only static isolated source surfaces are allowed');
  const input=freeze(structuredClone(data)),ownerMap=new Map(),sourceIds=new Set(),activeReceipts=new Set();let epoch=0,closed=false,nativeCalls=0,visitedCells=0,certificateBuilds=0;
  for(const record of owners||[]){
    const q=record.fuelAmount+(record.finish?.amount??0),surfaces=input.surfaces.filter(s=>s.sourceCarrierId===record.id);
    if(typeof record.id!=='string'||ownerMap.has(record.id)||!Number.isFinite(record.fuelAmount)||record.fuelAmount<0||!Number.isFinite(record.finish?.amount??0)||(record.finish?.amount??0)<0||!Number.isFinite(q)||!surfaces.length)throw Error('Invalid original regional owner');
    for(const s of surfaces){if(!s.id||sourceIds.has(s.id)||!s.triangles?.length||!s.triangles.every(t=>Array.isArray(t)&&t.length===3&&t.every(finiteVector))||!Number.isFinite(s.fuelAmount)||s.fuelAmount<0||!Number.isFinite(s.finish?.amount??0)||(s.finish?.amount??0)<0||s.finish?.amount>0&&!(s.fuelAmount>0))throw Error('Uncertifiable original regional surface');sourceIds.add(s.id);}
    const assigned=sum(surfaces.map(s=>s.fuelAmount+(s.finish?.amount||0))),inputRoundoff=roundoff(q,surfaces.length);
    if(Math.abs(assigned-q)>inputRoundoff)throw Error('Original surface allocation differs from its canonical owner');
    const spans=surfaces.map(s=>span(s,input.gridOrigin,input.thermalCell)),lo=[0,1,2].map(i=>Math.min(...spans.map(s=>s.min[i]))),hi=[0,1,2].map(i=>Math.max(...spans.map(s=>s.max[i]))),mins=[];
    for(let y=lo[1];y<=hi[1];y++)for(let z=Math.floor(lo[2]/4)*4;z<=hi[2];z+=4)for(let x=Math.floor(lo[0]/4)*4;x<=hi[0];x+=4)mins.push([x,y,z]);
    ownerMap.set(record.id,{id:record.id,q,surfaces,mins,keys:new Set(mins.map(m=>m.join(','))),inputRoundoff,certificates:new Map()});
  }
  if(!ownerMap.size||input.surfaces.some(s=>!ownerMap.has(s.sourceCarrierId)))throw Error('Every source needs its one original owner');
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
    let scene;try{
      nativeCalls++;scene=compileScene(local,{regionalPilot:token});visitedCells+=trace.visitedCells;checkCertificate(cert,scene.initialFuel);
      const boundaryIds=[...scene.index.surfaces.keys()],fuelIds=[...scene.fuels.keys()],expected=new Map([...scene.fuels].map(([id,f])=>[id,{amount:f.amount,initial:f.initial,cls:f.cls,sourceSurfaceId:f.sourceSurfaceId}]));
      let disposed=false;
      const receipt=Object.freeze({kind:'isolated-regional-compiler-receipt-v1',partialCompilation:true,descriptor,certificate:cert,nativeQuantity:scene.initialFuel,trace:freeze(trace),scene,
        dispose(){if(disposed)return;disposed=true;clearScene(scene);activeReceipts.delete(receipt);}});
      receipts.set(receipt,{pilot,epoch,key:d.key,owner:d.owner,boundaryIds,fuelIds,expected,isDisposed:()=>disposed});activeReceipts.add(receipt);return receipt;
    }catch(error){if(scene)clearScene(scene);throw error;}
  }
  function validateReceipt(receipt){
    live();const r=receipts.get(receipt);if(!r||r.pilot!==pilot||r.epoch!==epoch||r.isDisposed())throw Error('Unknown or stale regional receipt');
    const scene=receipt.scene;
    if(scene.index.surfaces.size!==r.boundaryIds.length||r.boundaryIds.some(id=>!scene.index.surfaces.has(id))||scene.fuels.size!==r.fuelIds.length)throw Error('Regional receipt IDs changed');
    let native=0;for(const [id,value]of r.expected){const f=scene.fuels.get(id);if(!f||f.amount!==value.amount||f.initial!==value.initial||f.cls!==value.cls||f.sourceSurfaceId!==value.sourceSurfaceId)throw Error('Regional receipt quantity/profile changed');native+=f.amount;}
    if(native!==receipt.nativeQuantity)throw Error('Regional receipt sum changed');checkCertificate(receipt.certificate,native);return r;
  }
  const pilot=Object.freeze({region,regions(id){live();const owner=ownerMap.get(id);if(!owner)throw Error('Unknown original region owner');return owner.mins.map(min=>region(id,min));},compile,
    diagnostics:()=>({productionEnabled:false,closed,epoch,nativeCalls,visitedCells,certificateBuilds,retainedReceipts:activeReceipts.size,owners:[...ownerMap.values()].map(o=>({id:o.id,quantity:o.q,regions:o.mins.length,cachedCertificates:o.certificates.size}))}),
    dispose(){if(closed)return;for(const receipt of activeReceipts)receipt.dispose();closed=true;epoch++;ownerMap.clear();}});
  pilots.set(pilot,{live,ownerMap,validateReceipt,ledger:null,get closed(){return closed;},get epoch(){return epoch;},advance(){live();for(const receipt of activeReceipts)receipt.dispose();epoch++;}});return pilot;
}

// Pure receipt staging. It owns no trial/index installation, query proxy or clock.
export function createRegionalClaimLedger(pilot){
  const p=pilots.get(pilot);if(!p)throw Error('Unknown isolated regional compiler');p.live();if(p.ledger)throw Error('Regional compiler already has a staging ledger');
  let closed=false,generation=p.epoch;const claims=new Map(),ids=new Set();
  function live(){p.live();if(closed||generation!==p.epoch)throw Error('Regional staging ledger is stale/disposed');}
  function row(owner,extra=null){
    const list=[...(claims.get(owner.id)?.values()||[])];if(extra)list.push(extra);
    const q=sum(list.map(c=>c.q)),native=sum(list.map(c=>c.native)),full=list.length===owner.mins.length,proved=owner.inputRoundoff+sum(list.map(c=>c.canonicalRoundoff))+roundoff(owner.q,list.length);
    const remainder=full?owner.q-q:0;if(full&&Math.abs(remainder)>proved)throw Error('Unproved canonical parent remainder');
    if(q>owner.q+proved)throw Error('Regional claims exceed original canonical stock');
    // Only a proved parent arithmetic carry is bounded here; physical amounts
    // remain the compiler's originals. Full closure is booked exactly once.
    const canonical=full?owner.q:Math.min(owner.q,q),carry=canonical-q;
    const positive=sum(list.map(c=>c.positive))+Math.max(0,-carry)+roundoff(native,list.length),negative=sum(list.map(c=>c.negative))+Math.max(0,carry)+roundoff(native,list.length),delta=native-canonical;
    if(delta>positive||delta< -negative)throw Error('Regional parent native roll-up exceeds its local proof');
    return {id:owner.id,quantity:owner.q,state:full?'full':list.length?'partial':'cold',claimedRegions:list.length,totalRegions:owner.mins.length,canonicalMeasured:q,canonicalTransferred:canonical,coldReserve:owner.q-canonical,parentArithmeticCarry:carry,canonicalRemainder:remainder,remainderClosed:full,provedRemainderBound:proved,nativeBorn:native,clippingDelta:delta,partitionError:{epsilon:EPS,positive,negative}};
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
