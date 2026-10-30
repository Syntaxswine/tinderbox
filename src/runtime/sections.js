const ARRAY_TYPES={Float32Array,Float64Array,Uint8Array,Uint16Array,Uint32Array,Int8Array,Int16Array,Int32Array};
export async function fetchJSON(url,signal){const response=await fetch(url,{signal});if(!response.ok)throw Error('Section HTTP '+response.status+': '+new URL(url).pathname);return response.json();}
function intersects(bounds,point,radius,below,above){return point.x>=bounds.min[0]-radius&&point.x<=bounds.max[0]+radius&&point.y>=bounds.min[2]-radius&&point.y<=bounds.max[2]+radius&&point.elevation>=bounds.min[1]-above&&point.elevation<=bounds.max[1]+below;}
// Independent spatial/height sections with shared, reference-counted geometry.
// Only the offline build invokes the original whole-building factories.
export function createSectionStreamer({THREE:T,root,manifest,baseUrl,loadJSON=fetchJSON,signal,onError=()=>{},limits={},presentation=null}){
  const policy={loadRadius:21,retainRadius:32,below:2.3,above:6.5,maxSections:192,concurrency:4,...limits};
  const lifetime=new AbortController(),abort=()=>dispose();signal?.addEventListener('abort',abort,{once:true});
  const resident=new Map(),geometries=new Map(),materials=new Map(),jobs=new Map();let desired=new Map(),queue=[],closed=false,view='follow',point,key='',doorKey='',doorStates={},failure=null,loads=0,releases=0,peakSections=0,peakGeometries=0;
  const plane=new T.Plane(new T.Vector3(0,-1,0),10000);let cutaway=false;
  const url=file=>new URL(file,baseUrl).href;
  async function acquireGeometry(id){
    let entry=geometries.get(id);
    if(!entry){entry={refs:0,geometry:null,promise:null};geometries.set(id,entry);
      entry.promise=(async()=>{const data=await loadJSON(url(manifest.geometries[id]),lifetime.signal),geometry=new T.BufferGeometry();
        try{for(const [name,a]of Object.entries(data.attributes)){const Type=ARRAY_TYPES[a.type];if(!Type||!Array.isArray(a.array)||a.array.length%a.itemSize)throw Error('Invalid source geometry '+id);geometry.setAttribute(name,new T.BufferAttribute(new Type(a.array),a.itemSize,a.normalized));}
          if(data.index){const Type=ARRAY_TYPES[data.index.type];if(!Type)throw Error('Invalid source index');geometry.setIndex(new T.BufferAttribute(new Type(data.index.array),1));}
          geometry.computeBoundingBox();geometry.computeBoundingSphere();entry.geometry=geometry;if(closed||entry.refs===0){geometry.dispose();geometries.delete(id);}return geometry;
        }catch(error){geometry.dispose();throw error;}})();
    }
    entry.refs++;peakGeometries=Math.max(peakGeometries,geometries.size);
    try{return await entry.promise;}catch(error){entry.failed=true;releaseGeometry(id);throw error;}
  }
  function releaseGeometry(id){const entry=geometries.get(id);if(!entry)return;if(--entry.refs<=0&&(entry.geometry||entry.failed)){entry.geometry?.dispose();geometries.delete(id);}}
  function acquireMaterial(id,halo=false){
    let entry=materials.get(id);if(!entry){const spec=manifest.materials[id];if(!spec)throw Error('Missing source appearance '+id);
      const material=new T.MeshStandardMaterial({...spec,color:new T.Color().fromArray(spec.color),emissive:new T.Color().fromArray(spec.emissive)});
      material.clippingPlanes=[plane];material.clipShadows=true;
      material.onBeforeCompile=shader=>{shader.vertexShader='attribute vec2 grossUV;\n'+shader.vertexShader;shader.vertexShader=shader.vertexShader.replace('#include <uv_vertex>','#include <uv_vertex>\n#ifdef USE_MAP\nvMapUv = (mapTransform * vec3(grossUV, 1.0)).xy;\n#endif');};
      material.customProgramCacheKey=()=> 'tinderbox/source-section-physical-uv-v1';entry={refs:0,material};materials.set(id,entry);
    }
    try{const material=halo?(entry.haloMaterial??=presentation.material(entry.material)):entry.material;entry.refs++;return material;}
    catch(error){if(!entry.refs){presentation?.releaseMaterial(entry.material);entry.material.dispose();materials.delete(id);}throw error;}
  }
  function releaseMaterial(id){const entry=materials.get(id);if(entry&&--entry.refs===0){presentation?.releaseMaterial(entry.material);entry.material.dispose();materials.delete(id);}}
  function retire(id){const record=resident.get(id);if(!record)return;resident.delete(id);record.root.removeFromParent();for(const batch of record.batches){batch.mesh.dispose();releaseGeometry(batch.geometryId);releaseMaterial(batch.materialId);}record.root.clear();releases++;}
  async function build(section){
    const data=await loadJSON(url(section.url),lifetime.signal),group=new T.Group(),batches=[],byKey=new Map();group.name='Place section '+section.id;
    for(const part of data.parts){const id=part.geometry+'/'+part.material+'/'+(presentation?.isHaloSurface(part)?'halo':'solid');if(!byKey.has(id))byKey.set(id,[]);byKey.get(id).push(part);}
    try{
      for(const parts of byKey.values()){
        const geometryId=parts[0].geometry,materialId=parts[0].material,geometry=await acquireGeometry(geometryId);let material;
        try{material=acquireMaterial(materialId,!!presentation?.isHaloSurface(parts[0]));}catch(error){releaseGeometry(geometryId);throw error;}
        const mesh=new T.InstancedMesh(geometry,material,parts.length);mesh.name=section.id+'/'+geometryId.slice(0,8);mesh.castShadow=mesh.receiveShadow=true;
        mesh.userData={parts,sectionId:section.id,sourceGeometry:true};
        const batch={mesh,parts,geometryId,materialId};batches.push(batch);pose(batch);mesh.computeBoundingBox();mesh.computeBoundingSphere();group.add(mesh);
      }
      if(closed||view!=='follow'||!desired.has(section.id)){for(const b of batches){b.mesh.dispose();releaseGeometry(b.geometryId);releaseMaterial(b.materialId);}group.clear();return;}
      if(resident.size>=policy.maxSections){const removable=[...resident.keys()].find(id=>!desired.has(id));if(removable)retire(removable);else throw Error('Nearby source sections exceed the bounded visit budget');}
      root.add(group);resident.set(section.id,{root:group,batches,bounds:section.bounds});loads++;peakSections=Math.max(peakSections,resident.size);
    }catch(error){group.removeFromParent();for(const b of batches){b.mesh.dispose();releaseGeometry(b.geometryId);releaseMaterial(b.materialId);}group.clear();throw error;}
  }
  function pose(batch){const matrix=new T.Matrix4();batch.parts.forEach((part,i)=>batch.mesh.setMatrixAt(i,matrix.fromArray(part.openMatrix&&doorStates[part.portalId]?part.openMatrix:part.matrix)));batch.mesh.instanceMatrix.needsUpdate=true;batch.mesh.computeBoundingBox();batch.mesh.computeBoundingSphere();}
  function pump(){
    if(closed||failure){queue=[];return;}
    while(jobs.size<policy.concurrency&&queue.length){const section=queue.shift();if(!desired.has(section.id)||resident.has(section.id)||jobs.has(section.id))continue;
      const promise=build(section).catch(error=>{if(!closed&&error.name!=='AbortError'){failure=error;onError(error);}}).finally(()=>{jobs.delete(section.id);pump();});jobs.set(section.id,promise);
    }
  }
  function update(player,{viewMode='follow',interior=false,portalStates={}}={}){
    if(closed)return;point=player;view=viewMode;cutaway=interior;plane.constant=interior?player.elevation+1.25:10000;
    const nextDoors=JSON.stringify(portalStates);if(nextDoors!==doorKey){doorKey=nextDoors;doorStates={...portalStates};for(const r of resident.values())for(const b of r.batches)pose(b);}
    const nextKey=[view,Math.floor(player.x/4),Math.floor(player.y/4),Math.floor(player.elevation/1.06)].join('/');
    if(nextKey===key)return;key=nextKey;
    const wanted=view==='overview'?[]:manifest.chunks.filter(section=>intersects(section.bounds,player,policy.loadRadius,policy.below,policy.above));
    if(wanted.length>policy.maxSections){failure=Error('Nearby source sections exceed the bounded visit budget');onError(failure);return;}
    desired=new Map(wanted.map(section=>[section.id,section]));
    for(const [id,record]of resident)if(view==='overview'||!intersects(record.bounds,player,policy.retainRadius,policy.below+2.12,policy.above+2.12))retire(id);
    queue=wanted.filter(section=>!resident.has(section.id)&&!jobs.has(section.id)).sort((a,b)=>Math.hypot((a.bounds.min[0]+a.bounds.max[0])/2-player.x,(a.bounds.min[2]+a.bounds.max[2])/2-player.y)-Math.hypot((b.bounds.min[0]+b.bounds.max[0])/2-player.x,(b.bounds.min[2]+b.bounds.max[2])/2-player.y));pump();
  }
  function readyAt(player){return !closed&&!failure&&(view==='overview'||manifest.chunks.filter(section=>intersects(section.bounds,player,1.1,.3,2.4)).every(section=>resident.has(section.id)));}
  async function settled(){while(jobs.size||queue.length){await Promise.allSettled([...jobs.values()]);}if(failure)throw failure;}
  function metrics(){const haloMaterials=[...materials.values()].filter(m=>m.haloMaterial).length;return{activeSections:resident.size,pendingSections:jobs.size+queue.length,geometries:geometries.size,materials:materials.size+haloMaterials,haloMaterials,peakSections,peakGeometries,sectionLoads:loads,sectionReleases:releases,maxSections:policy.maxSections,view,cutaway,failed:!!failure};}
  function dispose(){if(closed)return;closed=true;lifetime.abort();signal?.removeEventListener('abort',abort);queue=[];desired.clear();for(const id of [...resident.keys()])retire(id);for(const [id,entry]of geometries)if(entry.geometry&&entry.refs<=0){entry.geometry.dispose();geometries.delete(id);}}
  if(signal?.aborted)dispose();
  return {update,isReadyAt:readyAt,settled,metrics,dispose};
}
