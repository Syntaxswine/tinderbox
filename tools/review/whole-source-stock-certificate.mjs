// Numerical evidence only. Mirrors prepareSources' existing per-owner rows;
// it cannot issue native receipts or install any source/world state.
import {sourcePartitionAllowance} from '../../workbenches/furnished-house/partition-error.js';
import {EPS} from '../../workbenches/furnished-house/geometry.js';
import {sourceSurfaceSpan} from '../../src/content/source-fixed-cell.js';
import {createSourceCarrierLedger} from '../../src/simulation/source-carriers.js';
const counts={certificateCalculations:0,thermalInputTriangles:0,canonicalCells:0,ledgerValidations:0,ledgersCreated:0,ledgersDisposed:0};
export const stockCertificateDiagnostics=()=>({...counts});
export function wholeSourcePartitionRows(surfaces,nativeQuantities,grid,{maxSurfaces=2,maxTriangles=256,maxCells=64,onSurfaceCertificate=()=>{}}={}){
  if(!Array.isArray(surfaces)||surfaces.length>maxSurfaces||!surfaces.length)throw Error('Bounded explicit source surfaces required');
  const triangles=surfaces.reduce((n,s)=>n+s.triangles.length,0),cells=surfaces.reduce((n,s)=>{const span=sourceSurfaceSpan(s,grid);return n+span.min.reduce((v,lo,i)=>v*(span.max[i]-lo+1),1);},0);
  if(triangles>maxTriangles||cells>maxCells)throw Error('Source certificate geometry bound');
  const native=new Map(nativeQuantities.map(r=>[r.id,r.nativeQuantity])),proofs=new Map();
  // Match scene.prepareSources aggregation and arithmetic order exactly.
  for(const s of surfaces)if(s.sourceCarrierId){const id=s.sourceCarrierId;let p=proofs.get(id);if(!p){p={sourceQuantity:0,sourceCount:0,partitionError:{epsilon:EPS,positive:0,negative:0,roundoffBound:0,surfaces:[]}};proofs.set(id,p);}p.sourceQuantity+=s.fuelAmount+(s.finish?.amount||0);p.sourceCount++;
    if(s.fuelAmount>0||s.finish?.amount>0){counts.certificateCalculations++;const bound=sourcePartitionAllowance(s,grid);p.partitionError.positive+=bound.positive;p.partitionError.negative+=bound.negative;p.partitionError.roundoffBound+=bound.roundoffBound;p.partitionError.surfaces.push({id:s.id,...bound});onSurfaceCertificate({id:s.id,sourceCarrierId:id,...bound});}}
  counts.thermalInputTriangles+=triangles;counts.canonicalCells+=cells;
  return [...proofs].map(([id,p])=>{if(!native.has(id))throw Error('Saved native quantity required for '+id);return {id,nativeQuantity:native.get(id),...p};});
}
export function validateWholeStockCertificate(canonical,rows,nativeBirthQuantity=rows.reduce((n,r)=>n+r.nativeQuantity,0)){
  counts.ledgerValidations++;let ledger,stage;
  try{if(rows.some(r=>!r.partitionError))throw Error('Explicit partition certificate required; fallback forbidden in this diagnostic');ledger=createSourceCarrierLedger(canonical,{modes:Object.fromEntries(canonical.map(o=>[o.id,'whole']))});counts.ledgersCreated++;const before=ledger.metrics();stage=ledger.prepareHybridActivations(rows,[],nativeBirthQuantity);stage.validate();const after=ledger.metrics();
    return {status:'NUMERICAL_GATE_PASS',certificatePresent:true,committed:false,before,after,nativeBirthQuantity,canonicalQuantity:canonical.reduce((n,o)=>n+o.fuelAmount+(o.finish?.amount||0),0),note:'Disposable local numerical validation; no native receipt or coupled installation authority'};
  }catch(error){return {status:'NUMERICAL_GATE_REJECTED',certificatePresent:rows.every(r=>!!r.partitionError),committed:false,error:{name:error.name,message:error.message}};}
  finally{stage?.dispose();if(ledger){ledger.dispose();counts.ledgersDisposed++;}}
}
