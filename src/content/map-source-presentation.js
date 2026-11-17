import {bounds,unit,cross,sub,dot} from '../../workbenches/furnished-house/geometry.js';

// A presentation projection over the same effective buffers and native sources.
// This record is never passed to a physical compiler or canonical fuel ledger.
export function mapSectionPresentation(compiled,sectionId){
  const {model,sources}=compiled,surfaces=[],openings=[],sourceMeshes=[],geometry=[],ownedParts=new Set(),nativeSourceIds=new Set(),followBindings=[];
  const own=model.parts.filter(p=>p.sectionId===sectionId&&p.physical),bundles=[...new Set(own.map(p=>p.carrierId))].map(id=>compiled.presentationSourcesForCarrier(id)),openingBySource=new Map(bundles.flatMap(b=>b.openings).map(o=>[o.surfaceId,o])),byPart=new Map();
  for(const s of bundles.flatMap(b=>b.surfaces)){if(!byPart.has(s.nativePartId))byPart.set(s.nativePartId,[]);byPart.get(s.nativePartId).push(s);}
  function addMesh(id,part,triangles){sourceMeshes.push({id,name:part.material==='glass'?'glass / '+part.id:part.id,level:Math.floor(part.bounds.min[1]/2.12+1e-5),bounds:part.bounds});geometry.push({id,triangles});}
  for(const part of own){
    const raw=sources.renderGeometry(part.id);
    for(const s of byPart.get(part.id)){
      const meshId=s.renderNormal?part.id+' / '+s.id:part.id,triangles=s.renderNormal?raw.triangles.filter(t=>{const points=t.vertices.map(v=>v.slice(0,3)),normal=unit(cross(sub(points[1],points[0]),sub(points[2],points[0])));return dot(normal,s.normal)>1-1e-6&&Math.abs(dot(sub(points[0],s.triangles[0][0]),s.normal))<1e-5;}):raw.triangles;
      if(!triangles.length)throw Error('Effective source facet has no matching authored appearance '+s.id);
      addMesh(meshId,part,triangles);const copy={...s,sourceMeshBindings:[meshId],...(s.kind==='floor'?{supportType:'native-source-slab'}:{})};surfaces.push(copy);nativeSourceIds.add(s.id);
      const opening=openingBySource.get(s.id);if(opening)openings.push({...opening,sourceMeshBindings:[meshId]});
    }ownedParts.add(part.id);
  }
  for(const f of model.follows){const part=model.partById.get(f.partId);if(part.sectionId!==sectionId)continue;
    const raw=sources.renderGeometry(part.id);addMesh(part.id,part,raw.triangles);ownedParts.add(part.id);
    const level=f.parents.flatMap(id=>model.carrierById.get(id).parts).flatMap(n=>byPart.get(model.parts[n].id)||[])[0]?.level??Math.floor(part.bounds.min[1]/2.12+1e-5);
    for(const chunk of compiled.followPartition(part.id)){
      const id='follow:'+part.id+'/t'+chunk.sourceTriangle+'/'+chunk.cell.join(','),normal=unit(cross(sub(chunk.triangles[0][1],chunk.triangles[0][0]),sub(chunk.triangles[0][2],chunk.triangles[0][0])));
      surfaces.push({id,kind:'attachment',presentationKind:'wall',normal,renderNormal:normal,triangles:chunk.triangles,bounds:bounds(chunk.triangles.flat()),thickness:0,material:'appearance-only',fuelAmount:0,level,sourceMeshBindings:[part.id],renderAppearanceIds:[part.appearance]});followBindings.push({id,partId:part.id,sourceTriangle:chunk.sourceTriangle,cell:chunk.cell,triangles:chunk.triangles,parentGroups:chunk.parentGroups});
    }
  }
  const data={...compiled.data,presentationOnly:true,prefabId:model.placeId+'/'+sectionId,module:[1,2,2.12],sourceMeshes,surfaces,openings,render:{geometry,materials:Object.entries(model.library.materials).map(([id,spec])=>({...spec,id,name:id}))}};
  return {data,ownedParts,nativeSourceIds,followBindings,sectionId};
}

export function followBoundaryRows(bindings,live){return bindings.map(b=>{
  const groups=b.parentGroups.map(ids=>ids.map(id=>id.startsWith('cold:')?{intact:true,charFraction:0,heatFraction:0}:live.get(id)||{intact:false}));
  const intact=groups.every(rows=>rows.some(r=>r.intact)),rows=groups.flat();return {id:b.id,sourceSurfaceId:b.id,triangles:b.triangles,intact,openFraction:0,charFraction:Math.max(0,...rows.filter(r=>r.intact).map(r=>r.charFraction||0)),heatFraction:Math.max(0,...rows.map(r=>r.heatFraction||0)),queryOnly:false};
});}

// The reused renderer already partitions source faces at native thermal cell
// edges. Relabel those existing patch vertices by their real world storey so a
// long column does not disappear solely because its source starts below us.
// Positions, normals, UVs, patch identities and the original renderer stay intact.
export function labelNativePatchStoreys(art){
  const patches=art.inspect().patches,levels=patches.map(p=>{const points=p.triangles.flat();return Math.max(0,Math.floor((points.reduce((n,v)=>n+v[1],0)/points.length+1e-5)/2.12));});let vertices=0;
  art.root.traverse(o=>{const indices=o.geometry?.attributes.fhPatch,attribute=o.geometry?.attributes.fhStorey;if(!indices||!attribute)return;for(let i=0;i<indices.count;i++){const level=levels[Math.round(indices.getX(i))];if(level!==undefined&&attribute.getX(i)!==level){attribute.setX(i,level);vertices++;}}if(vertices)attribute.needsUpdate=true;});
  return {patches:patches.length,relabeledVertices:vertices};
}
