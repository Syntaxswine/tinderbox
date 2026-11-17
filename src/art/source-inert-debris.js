import {unit,cross,sub} from '../../workbenches/furnished-house/geometry.js';

// Zero-fuel solids keep their original opaque appearance and actual shape;
// they are not drawn as the shared combustible shallow char/ash footprints.
export function createSourceInertDebris(T,{appearanceForSource}){
  const root=new T.Group(),bodies=new Map(),materials=new Map();root.name='Native inert falling and landed geometry';let closed=false;
  function material(record){const source=record.geometry?.sourceSurfaceIds?.[0]||record.sourceSurfaceIds?.[0],appearance=appearanceForSource(source),key=appearance?.id||record.kind||record.geometry?.material;
    if(!materials.has(key)){const spec=appearance?.spec||{color:[.5,.5,.5],emissive:[0,0,0],roughness:.9,metalness:0};materials.set(key,new T.MeshStandardMaterial({...spec,color:new T.Color().fromArray(spec.color),emissive:new T.Color().fromArray(spec.emissive||[0,0,0])}));}return materials.get(key);}
  function retire(id){const b=bodies.get(id);if(b){b.mesh.removeFromParent();b.mesh.geometry.dispose();bodies.delete(id);}}
  function update(frame){if(closed)return;const active=new Set();
    for(const record of [...(frame.falls||[]).filter(f=>f.geometry?.nativeInertBody),...(frame.rubble||[]).filter(r=>r.inert)]){
      const id=record.bodyBoundaryId;if(!id)throw Error('Native inert presentation needs its real body identity');active.add(id);const triangles=record.geometry.solidTriangles||record.geometry.triangles,origin=record.origin||record.position;let entry=bodies.get(id);
      if(!entry||entry.triangles!==triangles){retire(id);const geometry=new T.BufferGeometry(),positions=[],normals=[];
        for(const t of triangles){const normal=unit(cross(sub(t[1],t[0]),sub(t[2],t[0])));for(const p of t){positions.push(...sub(p,origin));normals.push(...normal);}}
        geometry.setAttribute('position',new T.Float32BufferAttribute(positions,3));geometry.setAttribute('normal',new T.Float32BufferAttribute(normals,3));geometry.computeBoundingSphere();const mesh=new T.Mesh(geometry,material(record));mesh.castShadow=mesh.receiveShadow=true;root.add(mesh);entry={mesh,triangles};bodies.set(id,entry);
      }entry.mesh.position.fromArray(record.position);entry.mesh.quaternion.fromArray(record.quaternion||[0,0,0,1]);
    }for(const id of bodies.keys())if(!active.has(id))retire(id);
  }
  return {root,update,diagnostics:()=>({bodies:bodies.size,geometries:bodies.size,materials:materials.size}),dispose(){if(closed)return;closed=true;for(const id of [...bodies.keys()])retire(id);for(const m of materials.values())m.dispose();materials.clear();root.removeFromParent();root.clear();}};
}
