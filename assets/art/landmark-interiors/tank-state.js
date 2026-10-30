// Art presentation only. Simulation supplies the authoritative struck tank ID.
export const TANK_ASSET_IDS=Object.freeze(['aquarium-small','aquarium-large','aquarium-inner']);
export const TANK_DESTRUCTION=Object.freeze({status:'user-approved',requirementOrigin:'User requested aquarium tanks be destroyed when hit by a bullet.',trigger:'bullet-hit',hitsRequired:1,states:Object.freeze(['intact','destroyed']),response:'Shattered glazing, drained water and static glass/debris art',simulationOwner:'coder',selectionPaddingMetres:.45});
export function bindTankPresentation(T,{root,meshes,assembly,targets,destroyedIds=[],onChange=()=>{},onDispose}){
 const states=new Map(targets.map(t=>[t.id,'intact'])),batches=[],byTarget=new Map();let disposed=false;
 if(!Array.isArray(destroyedIds)||destroyedIds.some(id=>!states.has(id)))throw Error('Destroyed IDs must name selected aquarium tanks');
 for(const id of destroyedIds)states.set(id,'destroyed');
 const matrix=new T.Matrix4();root.updateMatrixWorld(true);
 for(const original of [...meshes]){
  let o=original;
  // A one-part variant also uses count=0/1, so no zero-scale hiding or stale ray target.
  if(!o.isInstancedMesh&&o.userData.visualState&&o.userData.visualState!=='common'){
   const part={id:o.name,...o.userData},batch=new T.InstancedMesh(o.geometry,o.material,1);batch.name='tank-state/'+o.name;batch.setMatrixAt(0,o.matrixWorld);batch.castShadow=o.castShadow;batch.receiveShadow=o.receiveShadow;batch.userData={componentId:batch.name,appearanceSlot:part.appearanceSlot,parts:[part]};o.removeFromParent();root.add(batch);meshes.splice(meshes.indexOf(o),1,batch);assembly.instances.push(batch);o=batch;
  }
  if(!o.isInstancedMesh||!o.userData.parts.some(p=>p.damageTargetId&&p.visualState!=='common'))continue;
  const records=o.userData.parts.map((part,i)=>{o.getMatrixAt(i,matrix);return{part,matrix:matrix.clone()};}),entry={mesh:o,records};batches.push(entry);
  for(const id of new Set(records.map(r=>r.part.damageTargetId).filter(Boolean))){if(!byTarget.has(id))byTarget.set(id,new Set());byTarget.get(id).add(entry);}
 }
 function repack(entry){const active=entry.records.filter(({part:p})=>!p.damageTargetId||p.visualState==='common'||p.visualState===states.get(p.damageTargetId));entry.mesh.count=active.length;entry.mesh.userData.parts=active.map(r=>r.part);active.forEach((r,i)=>entry.mesh.setMatrixAt(i,r.matrix));entry.mesh.instanceMatrix.needsUpdate=true;entry.mesh.computeBoundingBox();entry.mesh.computeBoundingSphere();}
 batches.forEach(repack);
 function ensure(id){if(disposed)throw Error('Tank presentation is disposed');if(!states.has(id))throw Error('Unknown or unselected aquarium tank '+id);}
 onDispose(()=>{disposed=true;states.clear();byTarget.clear();batches.length=0;});
 return{targets,policy:TANK_DESTRUCTION,getTankState(id){ensure(id);return states.get(id);},setTankDestroyed(id,destroyed=true){ensure(id);if(typeof destroyed!=='boolean')throw Error('Tank destroyed flag must be boolean');const state=destroyed?'destroyed':'intact';if(states.get(id)===state)return false;states.set(id,state);for(const batch of byTarget.get(id)||[])repack(batch);onChange();return true;}};
}
