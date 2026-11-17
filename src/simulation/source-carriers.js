const EPS=1e-7;
// Canonical static stock exists before thermal activation. Visual section
// residency cannot create, refill or discard it. The trial retains combustion.
export function createSourceCarrierLedger(records){
  const carriers=new Map();let nativeStaticBirths=0,activeInitial=0,activeCarriers=0,closed=false;
  for(const input of records){
    const quantity=input.fuelAmount+(input.finish?.amount||0);
    if(typeof input.id!=='string'||!input.id||carriers.has(input.id)||!Number.isFinite(input.fuelAmount)||input.fuelAmount<0||!Number.isFinite(quantity)||quantity<0)throw Error('Invalid canonical source quantity');
    if(input.finish&&(!Number.isFinite(input.finish.amount)||input.finish.amount<0))throw Error('Invalid canonical finish quantity');
    if(input.fuelAmount>0&&!input.fuelClass||input.finish?.amount>0&&!input.finish.fuelClass)throw Error('Finite source fuel needs an explicit accepted profile');
    carriers.set(input.id,{id:input.id,quantity,active:false,initialInTrial:false});
  }
  const total=[...carriers.values()].reduce((n,c)=>n+c.quantity,0);let coldReserve=total;
  function activate(id,install,{initialInTrial=false}={}){
    if(closed)throw Error('Source carrier ledger disposed');const c=carriers.get(id);if(!c)throw Error('Unknown source carrier '+id);if(c.active)return false;
    const result=install?.(id);if(result&&typeof result.then==='function')throw Error('Source activation must commit synchronously after geometry is ready');
    c.active=true;c.initialInTrial=initialInTrial;activeInitial+=c.quantity;activeCarriers++;coldReserve=[...carriers.values()].filter(c=>!c.active).reduce((n,c)=>n+c.quantity,0);if(!initialInTrial)nativeStaticBirths+=c.quantity;return true;
  }
  function metrics(nativeFuel){
    if(closed)throw Error('Source carrier ledger disposed');
    const result={staticInitial:total,activeInitial,coldReserve,canonicalCarriers:carriers.size,activeCarriers,reservedCarriers:carriers.size-activeCarriers,nativeStaticBirths};
    if(nativeFuel){
      // The native plane clipper includes metre epsilon at fragment edges.
      // Bound that reported discrepancy by ACTIVE stock; unrelated reserves
      // must never weaken validation of a local activation.
      if(Math.abs(nativeFuel.initial+nativeStaticBirths-activeInitial)>1e-6*Math.max(1,activeInitial))throw Error('Active native quantity does not match the canonical transfer ledger');
      const added=nativeFuel.added-nativeStaticBirths;if(added<-EPS)throw Error('Static source transfer exceeds native fuel births');
      const remaining=nativeFuel.remaining+coldReserve,airborne=nativeFuel.airborne||0,burned=nativeFuel.burned||0,escaped=nativeFuel.escaped||0,error=total+added-remaining-airborne-burned-escaped;
      Object.assign(result,{nativeClippingDelta:nativeFuel.initial+nativeStaticBirths-activeInitial,world:{initial:total,added:Math.max(0,added),remaining,airborne,burned,escaped,error}});
    }return result;
  }
  return {activate,isActive:id=>!closed&&!!carriers.get(id)?.active,metrics,snapshot:()=>[...carriers.values()].map(c=>({...c})),dispose(){closed=true;carriers.clear();}};
}
