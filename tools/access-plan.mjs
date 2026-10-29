// Normalize the descriptive artist API in the coder-owned compiler. Never
// mutate a frozen original plan or silently discard an unrecognized opening.
export function normalizeAccessPlan(original,placeId){
  if(original?.version!==1||original.placeId!==placeId)throw Error('Mismatched artist access plan: '+placeId);
  const plan=structuredClone(original);
  for(const key of ['portals','stairs','floorOpenings','hiddenSourceParts'])if(!Array.isArray(plan[key]))throw Error('Access plan needs '+key+': '+placeId);
  const ids=new Set();plan.portals=plan.portals.map(portal=>{
    if(typeof portal.id!=='string'||!portal.id||ids.has(portal.id)||!Array.isArray(portal.position||portal.anchor)||(portal.position||portal.anchor).length!==3||(portal.position||portal.anchor).some(v=>!Number.isFinite(v)))throw Error('Invalid artist portal: '+portal.id);
    ids.add(portal.id);const stateful=portal.stateful!==false;
    if(!stateful&&portal.defaultOpen===false)throw Error('A permanent passage cannot be initially closed: '+portal.id);
    return {...portal,position:portal.position||portal.anchor,stateful,defaultOpen:stateful?!!portal.defaultOpen:true};
  });
  plan.floorOpenings=plan.floorOpenings.map(opening=>{
    if(opening.floorId&&opening.sourceFloorId&&opening.floorId!==opening.sourceFloorId)throw Error('Conflicting source floor IDs in access opening');
    const floorId=opening.floorId||opening.sourceFloorId;
    if(typeof floorId!=='string'||!floorId||!Number.isInteger(opening.level)||!Array.isArray(opening.polygon)||opening.polygon.length<3||opening.polygon.some(p=>!Array.isArray(p)||p.length!==2||p.some(v=>!Number.isFinite(v))))throw Error('Incomplete artist floor opening: '+floorId);
    return {...opening,floorId};
  });return plan;
}
