// Pure presentation selection. Runtime assigns stable origin ownership, including
// generated fragments crossing buildings; this function never assigns fuel/heat.
const collections=['boundaries','supports','items','parts','falls','rubble','fireSamples','occupancy','events','tombstones'];
export function catalogueFrameView(frame,owner){
 if(frame.catalogueModules?.version!==1)throw Error('Authoritative Catalogue module frame metadata required');
 const result={...frame};for(const key of collections)result[key]=(frame[key]||[]).filter(row=>row.ownerInstanceId===owner);return result;
}
