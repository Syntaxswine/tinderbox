const EPS=1e-7;
// Canonical static stock exists before thermal activation. Visual section
// residency cannot create, refill or discard it. The trial retains combustion.
export function createSourceCarrierLedger(records){
  const carriers=new Map();let nativeStaticBirths=0,activeInitial=0,activeCarriers=0,closed=false;const allowance={positive:0,negative:0,roundoffBound:0};
  for(const input of records){
    const quantity=input.fuelAmount+(input.finish?.amount||0);
    if(typeof input.id!=='string'||!input.id||carriers.has(input.id)||!Number.isFinite(input.fuelAmount)||input.fuelAmount<0||!Number.isFinite(quantity)||quantity<0)throw Error('Invalid canonical source quantity');
    if(input.finish&&(!Number.isFinite(input.finish.amount)||input.finish.amount<0))throw Error('Invalid canonical finish quantity');
    if(input.fuelAmount>0&&!input.fuelClass||input.finish?.amount>0&&!input.finish.fuelClass)throw Error('Finite source fuel needs an explicit accepted profile');
    carriers.set(input.id,{id:input.id,quantity,active:false,initialInTrial:false});
  }
  const total=[...carriers.values()].reduce((n,c)=>n+c.quantity,0);let coldReserve=total;
  function prepareActivations(records,{initialInTrial=false,nativeBirthQuantity}={}){
    if(closed)throw Error('Source carrier ledger disposed');const ids=new Set(),pending=records.map(record=>{
      const c=carriers.get(record.id);if(!c||ids.has(record.id))throw Error('Unknown/duplicate source carrier '+record.id);ids.add(record.id);
      const nativeQuantity=record.nativeQuantity??c.quantity;
      let positive=1e-6*Math.max(1,c.quantity),negative=positive,roundoffBound=0;
      if(record.partitionError){
        const p=record.partitionError,inputRoundoff=64*Number.EPSILON*Math.max(1,c.quantity)*record.sourceCount;
        if(!Number.isSafeInteger(record.sourceCount)||record.sourceCount<=0||!Number.isFinite(record.sourceQuantity)||Math.abs(record.sourceQuantity-c.quantity)>inputRoundoff)throw Error('Assigned native input differs from its canonical stock');
        if(p.epsilon!==EPS||![p.positive,p.negative,p.roundoffBound].every(n=>Number.isFinite(n)&&n>=0))throw Error('Invalid local source partition allowance');
        positive=p.positive+inputRoundoff;negative=p.negative+inputRoundoff;roundoffBound=p.roundoffBound+inputRoundoff;
      }
      const delta=nativeQuantity-c.quantity;if(!Number.isFinite(nativeQuantity)||nativeQuantity<0||delta>positive||delta< -negative)throw Error('Native source quantity differs from its canonical stock');
      return {c,nativeQuantity,positive,negative,roundoffBound};
    });const groupedQuantity=pending.reduce((n,p)=>n+p.nativeQuantity,0),batchQuantity=nativeBirthQuantity??groupedQuantity;
    if(!Number.isFinite(batchQuantity)||batchQuantity<0||Math.abs(batchQuantity-groupedQuantity)>64*Number.EPSILON*Math.max(1,groupedQuantity)*Math.max(1,pending.length))throw Error('Native source batch differs from its local carrier quantities');let committed=false;
    function validate(){if(closed)throw Error('Source carrier ledger disposed');if(committed)throw Error('Source transfer already committed');for(const {c}of pending)if(c.active)throw Error('Source already active '+c.id);}
    validate();return {validate,commit(){validate();for(const {c,nativeQuantity,positive,negative,roundoffBound}of pending){c.active=true;c.initialInTrial=initialInTrial;c.nativeQuantity=nativeQuantity;c.partitionAllowance={positive,negative,roundoffBound};allowance.positive+=positive;allowance.negative+=negative;allowance.roundoffBound+=roundoffBound;activeInitial+=c.quantity;activeCarriers++;}if(!initialInTrial)nativeStaticBirths+=batchQuantity;coldReserve=[...carriers.values()].filter(c=>!c.active).reduce((n,c)=>n+c.quantity,0);committed=true;}};
  }
  function activate(id,install,{initialInTrial=false,nativeQuantity}={}){
    if(closed)throw Error('Source carrier ledger disposed');const c=carriers.get(id);if(!c)throw Error('Unknown source carrier '+id);if(c.active)return false;
    const plan=prepareActivations([{id,nativeQuantity}],{initialInTrial}),result=install?.(id);if(result&&typeof result.then==='function')throw Error('Source activation must commit synchronously after geometry is ready');plan.commit();return true;
  }
  function metrics(nativeFuel){
    if(closed)throw Error('Source carrier ledger disposed');
    const result={staticInitial:total,activeInitial,coldReserve,canonicalCarriers:carriers.size,activeCarriers,reservedCarriers:carriers.size-activeCarriers,nativeStaticBirths};
    if(nativeFuel){
      // The unchanged native clipper includes metre epsilon at fragment edges.
      // Sum only accepted source-local geometry envelopes. Neither active stock
      // nor an unrelated reserve supplies a relative quantity tolerance.
      const delta=nativeFuel.initial+nativeStaticBirths-activeInitial;
      if(delta>allowance.positive||delta< -allowance.negative)throw Error('Active native quantity does not match the canonical transfer ledger');
      const added=nativeFuel.added-nativeStaticBirths;if(added<-EPS)throw Error('Static source transfer exceeds native fuel births');
      const remaining=nativeFuel.remaining+coldReserve,airborne=nativeFuel.airborne||0,burned=nativeFuel.burned||0,escaped=nativeFuel.escaped||0,error=total+added-remaining-airborne-burned-escaped;
      Object.assign(result,{nativeClippingDelta:delta,nativePartitionError:{signedDelta:delta,...allowance},world:{initial:total,added:Math.max(0,added),remaining,airborne,burned,escaped,error}});
    }return result;
  }
  return {activate,prepareActivations,isActive:id=>!closed&&!!carriers.get(id)?.active,metrics,snapshot:()=>[...carriers.values()].map(c=>({...c})),dispose(){closed=true;carriers.clear();}};
}
