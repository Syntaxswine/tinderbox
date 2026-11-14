// Pure presentation selection. Runtime assigns stable origin ownership, including
// generated fragments crossing buildings; this function never assigns fuel/heat.
const selections=new WeakMap();
const collections=['boundaries','supports','items','parts','falls','rubble','fireSamples','occupancy','events','tombstones'];
export function catalogueFrameView(frame,owner){
 if(frame.catalogueModules?.version!==1)throw Error('Authoritative Catalogue module frame metadata required');
 let cached=selections.get(frame);if(cached&&cached.meta===frame.catalogueModules&&cached.revision===frame.revision&&cached.worldTime===frame.worldTime&&cached.full===frame.full&&collections.every(key=>cached.inputs[key]===frame[key])&&cached.owners.has(owner))return cached.owners.get(owner);
 if(!cached||cached.meta!==frame.catalogueModules||cached.revision!==frame.revision||cached.worldTime!==frame.worldTime||cached.full!==frame.full||collections.some(key=>cached.inputs[key]!==frame[key])){cached={meta:frame.catalogueModules,revision:frame.revision,worldTime:frame.worldTime,full:frame.full,inputs:Object.fromEntries(collections.map(key=>[key,frame[key]])),owners:new Map()};selections.set(frame,cached);}
 const result={...frame};for(const key of collections)result[key]=(frame[key]||[]).filter(row=>row.ownerInstanceId===owner);cached.owners.set(owner,result);return result;
}
