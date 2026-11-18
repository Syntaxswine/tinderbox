import {inspectSharedMapInputs,MapInputNotReadyError,qualifyInputOwner,freezeInput,sameInput} from './shared-map-admission.js';
import {createRegionalSourcePilot} from '../simulation/regional-source-pilot.js';
import {createOriginalSupportPorts,originalMaterialComponents} from '../simulation/original-support-ports.js';
import {materialTransmission} from '../../workbenches/furnished-house/scene.js';
import {segmentTriangle,EPS} from '../../workbenches/furnished-house/geometry.js';
import {selectFixedSourceCell} from './source-fixed-cell.js';

// This inventory reads identities/counts, never transforms source positions.
export function sharedMapInputInventory(model){
  return {placeId:model.placeId,partCount:model.parts.length,ownerCount:model.carriers.length,geometryIds:Object.keys(model.library.geometries),
    owners:model.carriers.map((o,i)=>({id:o.id,globalIndex:i,parts:o.parts.map(n=>model.parts[n]).filter(p=>p.physical).map(p=>p.id),supports:o.supports,fuelAmount:o.fuelAmount,fuelClass:o.fuelClass,finish:o.finish??null})),
    parts:model.parts.flatMap((p,globalIndex)=>{if(!p.physical)return [];const g=model.library.geometries[p.physicalGeometry||p.geometry];return [{id:p.id,ownerId:p.carrierId,globalIndex,geometry:p.geometry,physicalTriangles:(g.index?.array.length??g.attributes.position.array.length/3)/3,bounds:p.bounds,static:!p.portalId&&!p.openMatrix,sourceRange:p.originalRange??null}];})};
}

export async function loadMapInputJSON(resource,signal){
  const url=new URL('../../'+resource.path,import.meta.url);signal?.throwIfAborted();const response=await fetch(url,{signal});if(!response.ok)throw Error('Map input HTTP '+response.status);
  const bytes=new Uint8Array(await response.arrayBuffer()),digest=await crypto.subtle.digest('SHA-256',bytes),hash=Array.from(new Uint8Array(digest),b=>b.toString(16).padStart(2,'0')).join('');
  if(hash!==resource.sha256)throw Error('Map input pin mismatch: '+resource.path);signal?.throwIfAborted();return JSON.parse(new TextDecoder().decode(bytes));
}

function checkProjection(projection,physical,render,mapping){
  for(const [raw,expected]of [[physical,projection.physical],[render,projection.render]]){
    const a=raw?.attributes?.position;if(a?.type!=='Float32Array'||a.itemSize!==3||a.array.length!==expected.vertices*3||a.array.some(n=>!Number.isFinite(n)||Math.fround(n)!==n)||(raw.index?.array.length??a.array.length/3)!==expected.triangles*3)throw Error('Final Float32 projection identity/count changed');
  }
  const physicalIndices=physical.index?.array??Array.from({length:projection.physical.vertices},(_,i)=>i),renderIndices=render.index?.array??Array.from({length:projection.render.vertices},(_,i)=>i),map=mapping.renderToPhysicalVertex;
  if(!Array.isArray(map)||map.length!==projection.render.vertices||renderIndices.length!==physicalIndices.length)throw Error('Projection mapping incomplete');
  for(let i=0;i<renderIndices.length;i++){
    const r=renderIndices[i],p=physicalIndices[i];if(!Number.isSafeInteger(r)||r<0||r>=projection.render.vertices||!Number.isSafeInteger(p)||p<0||p>=projection.physical.vertices||map[r]!==p)throw Error('Projection primitive/vertex lineage changed');
    for(let k=0;k<3;k++)if(!Object.is(render.attributes.position.array[r*3+k],physical.attributes.position.array[p*3+k]))throw Error('Render vertex differs from final physical Float32 buffer');
  }
}

// Shared by the disabled host factory and the separately authorized source-only
// preparation phase. Its caller must first admit the exact projection metadata.
export async function prepareSharedMapProjections({model,sources,projections,loadProjection=loadMapInputJSON,signal,assertLive=()=>signal?.throwIfAborted()}){
  assertLive();const loaded=[];
  for(const p of projections){const buffers=await Promise.all([p.physical,p.render,p.mapping].map(ref=>loadProjection(ref,signal)));assertLive();checkProjection(p,...buffers);loaded.push({p,buffers});}
  assertLive();
  // No mutation until every pinned resource/mapping and abort check passes.
  model.library={...model.library,geometries:{...model.library.geometries}};
  for(const {p,buffers:[physical,render]}of loaded){
    if(model.parts.length!==p.part.globalIndex||model.carriers.length!==p.owner.globalIndex)throw Error('Projection append revision changed');
    const owner={...structuredClone(p.owner),id:qualifyInputOwner(model.placeId,p.owner.id),parts:[p.part.globalIndex],supports:[],adjacency:[],supportEvidence:[],attachments:[],anchors:[]},part={...structuredClone(p.part),carrier:p.owner.globalIndex,carrierId:owner.id,material:owner.material,physical:true};
    model.library.geometries[part.physicalGeometry]=physical;model.library.geometries[part.geometry]=render;model.carriers.push(owner);model.carrierById.set(owner.id,owner);model.parts.push(part);model.partById.set(part.id,part);sources.registerProjectionCarrier(owner.id);
  }
}

// Factory is explicit and reusable. No destination/menu calls it by default.
// Its single owned session is attached AFTER the host decode/source owner.
export function createSharedMapInputFactory({descriptor,policy,loadProjection=loadMapInputJSON}){
  const captured=freezeInput(structuredClone(descriptor)),capturedPolicy=freezeInput(structuredClone(policy));
  return ({model,sources,signal})=>{
    const report=inspectSharedMapInputs(captured,sharedMapInputInventory(model),capturedPolicy);let prepared=false,closed=false,binding=null,preparing=null,binds=0,lastProducer=null;
    const live=()=>{if(closed)throw Error('Map input session disposed');signal?.throwIfAborted();};
    const ready=()=>{live();if(report.status!=='READY')throw new MapInputNotReadyError(report);};
    const plan=report.plan,qualify=id=>qualifyInputOwner(model.placeId,id),ownerModes=Object.freeze(Object.fromEntries(report.status==='READY'?plan.owners.map(o=>[o.id,o.mode]):[]));
    async function prepare(){
      ready();if(prepared)return;if(preparing)return preparing;
      preparing=prepareSharedMapProjections({model,sources,projections:plan.projections,loadProjection,signal,assertLive:live}).then(()=>{prepared=true;});try{await preparing;}finally{preparing=null;}
    }
    function bindRegistry(registry){
      ready();if(!prepared)throw Error('Prepare map inputs before creating the world');if(binding)throw Error('Previous map input binding must be disposed before reset');
      const pins=[],originals=new Map(),components=new Map(),bundles=new Map();let releaseProvider,producer,disposed=false;
      const dispose=()=>{if(disposed)return;disposed=true;producer?.dispose();if(producer)lastProducer=producer.diagnostics();releaseProvider?.();for(const p of pins)p.release();pins.length=0;originals.clear();components.clear();bundles.clear();binding=null;};
      try{
        for(const p of plan.parts){const pin=registry.pinOriginal(p.id);pins.push(pin);if(pin.shape.triangles.length!==p.physicalTriangles)throw Error('Original source triangle count changed');originals.set(p.id,pin.shape);components.set(p.id,originalMaterialComponents(pin.shape.triangles));}
        releaseProvider=sources.useOriginalShapes(id=>{const shape=originals.get(id);if(!shape)throw Error('Out-of-cohort original source: '+id);return shape;});
        for(const o of plan.owners){const b=sources.sourcesForCarrier(o.id);bundles.set(o.id,b);for(const p of plan.parts.filter(p=>p.ownerId===o.id)){
          const ss=b.surfaces.filter(s=>s.nativePartId===p.id);if(ss.length!==p.surfacePlan.definitions||ss.reduce((n,s)=>n+s.triangles.length,0)!==p.surfacePlan.triangles)throw Error('Source blueprint derivation differs from admitted plan');
        }for(const s of b.surfaces){pins.push(registry.reserveSourceGeometry('input/'+s.id,s.triangles));if(s.solidTriangles&&s.solidTriangles!==s.triangles)pins.push(registry.reserveSourceGeometry('input-solid/'+s.id,s.solidTriangles));}}
        const endpoint=(e,kind)=>{
          const part=model.partById.get(e.partId),ts=originals.get(e.partId).triangles,bp=e.bindingPlan,s=bundles.get(part.carrierId).surfaces.find(s=>s.id===part.carrierId+'/part/'+model.parts.indexOf(part)+'/'+bp.suffix),component=components.get(e.partId).find(c=>c.primitives.includes(e.primitive));
          if(component?.id!==e.component||kind!=='fixed-embed'&&segmentTriangle(e.point,e.point,ts[e.primitive])===null||!s)throw Error('Original endpoint component/primitive/surface differs from reviewed plan');
          const sourcePoint=bp.surfacePoint;if(!s.triangles.some(t=>segmentTriangle(sourcePoint,sourcePoint,t)!==null))throw Error('Own source projection differs from reviewed plan');
          if(bp.channel==='surface'&&!sameInput(sourcePoint,e.point))throw Error('Surface endpoint requires its own source-face point');
          if(bp.channel==='solid'&&!s.triangles.some(t=>segmentTriangle(e.point,e.point,t)!==null)){
            // Existing nativePanel projects a measured original solid to its
            // authored thermal plane. Validate this reviewed projection, then
            // leave actual clipped solid/record authority to genuine birth.
            if(!s.id.endsWith('/plane')||!(s.thickness>0)||s.solidTriangles?.length)throw Error('Solid projection derivation is not ready for this source');
            const offset=e.point.reduce((n,v,i)=>n+(v-sourcePoint[i])*s.normal[i],0),projected=e.point.map((v,i)=>v-offset*s.normal[i]),low=s.kind==='floor'?-s.thickness:-s.thickness/2,high=s.kind==='floor'?0:s.thickness/2;
            if(offset<low-EPS||offset>high+EPS||Math.hypot(...projected.map((v,i)=>v-sourcePoint[i]))>EPS)throw Error('Solid projection differs from measured original native panel');
          }
          const ownership=selectFixedSourceCell(s,sourcePoint,plan.grid);if(ownership.status==='UNBOUND'||!sameInput(ownership.cell,bp.cell))throw Error('Own source projection/cell differs from reviewed occupied incident-cell plan');const cell=ownership.cell;
          return {partId:e.partId,point:[...e.point],primitives:[e.primitive],sourceSurfaceId:s.id,cell,nativeRecordId:null};
        };
        const support={parts:plan.parts.map(p=>({id:p.id,ownerId:p.ownerId})),bonds:plan.support.bonds.map(b=>({id:b.id,kind:b.kind,direction:b.direction,sourceSha256:b.proofRef.sha256,parent:endpoint(b.parent,b.kind),child:endpoint(b.child,b.kind)})),anchors:plan.support.anchors.map(({partId,elevation,component})=>({partId,elevation,component})),requirements:plan.support.requirements.map(g=>({id:g.id,ownerId:qualify(g.ownerId),portIds:g.portIds,upperBondId:g.upperBondId})),approvedMounts:[]};
        for(const b of support.bonds)if(b.kind==='fixed-assembly-mount')support.approvedMounts.push(structuredClone(b));
        const core=createOriginalSupportPorts({...support,parts:support.parts.map(p=>({...p,triangles:originals.get(p.id).triangles}))});try{for(const b of core.bindings())for(const side of ['parent','child']){const spec=plan.support.bonds.find(v=>v.id===b.id)[side];if(b[side].component!==spec.component||b[side].primitive!==spec.primitive)throw Error('Original endpoint retarget forbidden');}}finally{core.dispose();}
        const regionalOwners=plan.owners.filter(o=>ownerModes[o.id]==='regional'),allowedOwnerIds=new Set(plan.owners.map(o=>o.id));
        const mode={mode:'hybrid-world-v1',sourceRevision:plan.sourceRevision,allowedOwnerIds,ownerModes,support,
          get producer(){if(disposed)throw Error('Map input binding disposed');return producer??=createRegionalSourcePilot({sourceRevision:plan.sourceRevision,owners:regionalOwners.map(o=>model.carrierById.get(o.id)),data:{version:1,runtimeAdapterVersion:1,implicitGround:false,gridOrigin:plan.grid.origin,thermalCell:plan.grid.pitch,surfaces:regionalOwners.flatMap(o=>bundles.get(o.id).surfaces),openings:[],items:[],furnitureParts:[],stores:[]}});},
          querySources(context){return plan.parts.filter(p=>allowedOwnerIds.has(p.ownerId)&&ownerModes[p.ownerId]==='regional').map(p=>{const original=originals.get(p.id),part=model.partById.get(p.id),ss=context.surfaces.filter(s=>s.nativePartId===p.id),surfaceTriangles=ss.length===1?ss[0].triangles:original.triangles;return {partRef:part,surfaceTriangles,solidTriangles:original.triangles,closed:part.closed,rayRecord:{id:registry.queryId(p.id),sourceSurfaceId:part.carrierId,sourceCarrierId:part.carrierId,nativePartId:p.id,triangles:surfaceTriangles,solidTriangles:original.triangles,bounds:part.bounds,intact:true,openFraction:0,transmission:materialTransmission(part.material)}};});}};
        binds++;binding={mode,dispose,metrics:()=>producer?.diagnostics()};return binding;
      }catch(error){dispose();throw new MapInputNotReadyError(freezeInput({...report,phase:'SOURCE_VALIDATION',status:'NOT_READY',sourceValidation:'REJECTED',findings:[{code:'SOURCE_BINDING_NOT_READY',id:model.placeId,detail:error.message}]}));}
    }
    return {report,ownerModes,prepare,bindRegistry,metrics:()=>({prepared,closed,binds,activeBindings:binding?1:0,producer:binding?.metrics()||lastProducer}),dispose(){if(closed)return;closed=true;binding?.dispose();}};
  };
}
