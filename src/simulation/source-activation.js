// One synchronous transaction installs prepared native geometry, claims its
// cold proxies and transfers canonical stock. It never owns a gameplay clock.
import {createHybridWorldPublication} from './hybrid-world-publication.js';
export function createSourceActivation({trial,querySource,ledger,sources,onActivated=()=>{},internalHybrid=null}){
  if(internalHybrid)return createHybridWorldPublication({trial,querySource,ledger,sources,onActivated,internalHybrid});
  const probed=new Set(),activeParts=new Map(),activeCarriers=new Map();let closed=false,batches=0,activated=0,lastBatchMs=0,totalBatchMs=0,peakBatchMs=0,peakBatchCarriers=0;
  function ensure(carrierIds,reason='frontier'){
    if(closed)throw Error('Source activation disposed');
    const ids=[...new Set(carrierIds)].filter(id=>!ledger.isActive(id)).sort((a,b)=>sources.order(a)-sources.order(b));if(!ids.length)return false;
    const started=performance.now(),bundles=ids.map(id=>sources.sourcesForCarrier(id,querySource.portalStates())),surfaces=bundles.flatMap(b=>b.surfaces),openings=bundles.flatMap(b=>b.openings||[]);
    const physical=trial.prepareSources({surfaces,openings}),claim=querySource.prepareClaim(ids),stock=ledger.prepareActivations(physical.quantities,{nativeBirthQuantity:physical.quantity});
    physical.validate();claim.validate();stock.validate();
    // No query, tick, publication or await may occur between these commits.
    const result=physical.commit();claim.commit();stock.commit();
    const reboundSupports=trial.replaceSupportReferences(claim.proxyIds);
    for(let i=0;i<ids.length;i++){
      activeCarriers.set(ids[i],bundles[i]);
      for(const s of bundles[i].surfaces)for(const part of s.sourceMeshBindings||[]){if(!activeParts.has(part))activeParts.set(part,[]);activeParts.get(part).push(s.id);}
    }
    batches++;activated+=ids.length;lastBatchMs=performance.now()-started;totalBatchMs+=lastBatchMs;peakBatchMs=Math.max(peakBatchMs,lastBatchMs);peakBatchCarriers=Math.max(peakBatchCarriers,ids.length);
    onActivated({carrierIds:ids,sourceIds:result.sourceIds,reason,nativeTick:trial.tick,quantity:result.quantity,boundaries:result.boundaries.length,fuels:result.fuelIds.length,reboundSupports,elapsedMs:lastBatchMs});return true;
  }
  function ensurePoint(position,reason='tool'){
    const coordinates=trial.scene.coords(position),key=trial.scene.key(coordinates);if(probed.has(key))return false;
    const centre=trial.scene.position(coordinates),radius=trial.rules.radiantRange+Math.hypot(...trial.scene.pitch)/2;
    const changed=ensure(sources.near(centre,radius),reason);probed.add(key);return changed;
  }
  function beforeStep(){
    const pending=trial.supportGraph.pendingSources?.()||[];if(pending.length)ensure(pending,'support-frontier');
    for(const site of trial.hotSites())ensurePoint(site.position,'thermal-frontier');
  }
  function ensurePortal(id){ensure(sources.portalCarriers?.(id)||[],'door');return (sources.portalCarriers?.(id)||[]).flatMap(cid=>(activeCarriers.get(cid)?.openings||[]).filter(o=>o.portalId===id).map(o=>o.id));}
  return {ensure,ensurePoint,beforeStep,isActive:id=>ledger.isActive(id),sourceIdsForPart:id=>activeParts.get(id)||[],sourceForCarrier:id=>activeCarriers.get(id),
    ensurePortal,
    metrics:()=>({batches,activatedCarriers:activated,probedCells:probed.size,lastBatchMs,totalBatchMs,peakBatchMs,peakBatchCarriers}),
    dispose(){closed=true;probed.clear();activeParts.clear();activeCarriers.clear();}};
}
