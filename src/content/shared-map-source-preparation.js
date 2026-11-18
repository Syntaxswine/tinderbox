import {inspectSharedMapInputs,HOST_INPUT_LIMITS,freezeInput,qualifyInputOwner} from './shared-map-admission.js';
import {sharedMapInputInventory,prepareSharedMapProjections} from './shared-map-inputs.js';
import {originalMaterialComponents} from '../simulation/original-support-ports.js';
import {segmentTriangle,dot,sub,EPS} from '../../workbenches/furnished-house/geometry.js';
import {sourceSurfaceSpan,selectFixedSourceCell} from './source-fixed-cell.js';
export {sourceSurfaceSpan} from './source-fixed-cell.js';

const used=new WeakSet(),vector=p=>Array.isArray(p)&&p.length===3&&p.every(Number.isFinite);
const pendingCodes=new Set(['SURFACE_PLAN_UNBOUND','ORDINARY_ALTERNATIVES_NOT_READY','ORDINARY_BINDINGS_NOT_READY','BIRTH_DERIVATION_PLAN_UNBOUND']);
const unprovedCodes=new Set(['CONTACT_PROOF_NOT_REVIEWED','SOURCE_BOND_WITNESS_NOT_APPROVED','SOURCE_ENDPOINT_UNBOUND']);
export class SourcePreparationBoundary extends Error{constructor(code,detail){super(code+': '+detail);this.name='SourcePreparationBoundary';this.code=code;}}

// Metadata only. Known pending saddle proofs are explicitly named by the caller;
// unknown identities, quantities, ranges, modes or source witnesses cannot pass.
export function preflightSharedMapSourcePreparation({descriptor,policy,inventory,budget,pendingBondIds=[]}){
  const admission=inspectSharedMapInputs(descriptor,inventory,policy),p=admission.plan,pending=new Set(pendingBondIds),problems=admission.findings.filter(f=>!pendingCodes.has(f.code)&&!(unprovedCodes.has(f.code)&&[...pending].some(id=>f.id===id||f.id===id+'/parent'||f.id===id+'/child')));
  const counts={owners:p.owners.length,parts:p.parts.length,physicalTriangles:p.parts.reduce((n,p)=>n+p.physicalTriangles,0)},knownShapes=HOST_INPUT_LIMITS.shapes-HOST_INPUT_LIMITS.fallbackShapes,knownTriangles=HOST_INPUT_LIMITS.triangles-HOST_INPUT_LIMITS.fallbackTriangles;
  if(!budget||!['owners','parts','physicalTriangles'].every(k=>Number.isSafeInteger(budget[k])&&budget[k]>0)||counts.owners>budget.owners||counts.parts>budget.parts||counts.physicalTriangles>budget.physicalTriangles||counts.parts>knownShapes||counts.physicalTriangles>knownTriangles||!Object.values(counts).every(Number.isSafeInteger))problems.push({code:'SOURCE_PREPARATION_BUDGET',id:p.placeId,detail:counts});
  if(!p.owners.length||p.owners.length!==p.parts.length||p.owners.some(o=>o.parts.length!==1)||p.parts.some(p=>!Number.isSafeInteger(p.physicalTriangles)||p.physicalTriangles<1))problems.push({code:'SOURCE_PREPARATION_COHORT',id:p.placeId,detail:'One complete physical part per selected canonical owner is required for this bounded phase.'});
  return freezeInput({version:1,status:problems.length?'NOT_READY':'PREFLIGHT_READY',phase:'SOURCE_PREPARATION_PREFLIGHT',counts,problems,pendingBondIds:[...pending],limits:HOST_INPUT_LIMITS,geometryFit:'Originals fit; derived arrays must acquire the same bounded registry reserve before use.',admission});
}

// Restore only exact original facets after independent JSON serialization.
// Native-panel planes are derived even when coordinates equal a source face.
export function restoreSavedSourceFacetSharing({world,blueprints}){
  if(world.sourceRevision!==blueprints.sourceRevision)throw new SourcePreparationBoundary('SAVED_SOURCE_REVISION','World/blueprint revisions differ');
  const parts=new Map(world.parts.map(p=>[p.id,p])),same=(a,b)=>a.length===b.length&&a.every((v,i)=>v.length===b[i].length&&v.every((n,j)=>Object.is(n,b[i][j])));let restoredTriangles=0,facetedSurfaces=0,derivedPlanes=0;
  for(const s of blueprints.surfaces){const part=parts.get(s.nativePartId);if(!part||part.ownerId!==s.sourceCarrierId)throw new SourcePreparationBoundary('SAVED_SOURCE_OWNER',s.id);if(s.id.endsWith('/plane')){derivedPlanes++;continue;}
    const restore=t=>{const matches=part.triangles.filter(original=>same(original,t));if(matches.length!==1)throw new SourcePreparationBoundary('SAVED_ORIGINAL_FACET_NOT_UNIQUE',s.id);restoredTriangles++;return matches[0];};
    s.triangles=s.triangles.map(restore);if(s.solidTriangles){if(s.solidTriangles.length===s.triangles.length&&s.solidTriangles.every((t,i)=>same(t,s.triangles[i])))s.solidTriangles=s.triangles;else s.solidTriangles=s.solidTriangles.map(restore);}facetedSurfaces++;
  }
  return {facetedSurfaces,derivedPlanes,restoredTriangleReferences:restoredTriangles,restoredDerivedPlaneReferences:0,sourceTransforms:0};
}

// Map ONE already fixed original face. No contact search, nearest-face choice,
// common selector, cell clamping, native record inference or support evaluation.
export function deriveSharedSourceEndpoint({endpoint,part,components,surfaces,grid}){
  const e=endpoint,t=part.triangles[e.primitive],component=components.find(c=>c.primitives.includes(e.primitive));
  if(component?.id!==e.component||!t||!vector(e.point)||segmentTriangle(e.point,e.point,t)===null)throw new SourcePreparationBoundary('ORIGINAL_WITNESS_NOT_REPRESENTED',e.partId);
  if(e.selector&&(!vector(e.selector.min)||!vector(e.selector.max)||e.point.some((v,i)=>v<e.selector.min[i]-EPS||v>e.selector.max[i]+EPS)))throw new SourcePreparationBoundary('ORIGINAL_SELECTOR_NOT_REPRESENTED',e.partId);
  let candidates=surfaces.filter(s=>s.nativePartId===e.partId&&s.triangles.includes(t)),surfacePoint=[...e.point],channel='surface';
  if(!candidates.length){
    candidates=surfaces.filter(s=>s.nativePartId===e.partId&&s.id.endsWith('/plane')&&s.thickness>0&&!s.solidTriangles?.length).filter(s=>{const d=dot(sub(e.point,s.triangles[0][0]),s.normal),lo=s.kind==='floor'?-s.thickness:-s.thickness/2,hi=s.kind==='floor'?0:s.thickness/2;return d>=lo-EPS&&d<=hi+EPS;});
    if(candidates.length===1){const s=candidates[0],d=dot(sub(e.point,s.triangles[0][0]),s.normal);surfacePoint=e.point.map((v,i)=>v-d*s.normal[i]);channel='solid';}
  }
  if(candidates.length!==1||!candidates[0].triangles.some(t=>segmentTriangle(surfacePoint,surfacePoint,t)!==null))throw new SourcePreparationBoundary('SOURCE_PROJECTION_NOT_UNIQUE',e.partId);
  const s=candidates[0],ownership=selectFixedSourceCell(s,surfacePoint,grid);if(ownership.status==='UNBOUND'){const error=new SourcePreparationBoundary(ownership.reason,e.partId);error.cellOwnership=ownership;throw error;}const cell=ownership.cell;
  const suffix=s.id.slice(s.id.lastIndexOf('/part/')+6).split('/').slice(1).join('/');
  return {status:'DERIVED_SOURCE_PLAN_UNREVIEWED',sourceSurfaceId:s.id,sourceSpan:ownership.sourceSpan,cellOwnership:ownership,originalPrimitive:e.primitive,originalComponent:e.component,bindingPlan:{kind:'source-blueprint-original-face-v1',channel,suffix,surfacePoint,cell,nativeRecordId:null,nativeCellId:null,proofRef:null},nativeAuthority:'UNBORN_UNPROVED'};
}

// Reuse the host's one decoded model/source owner and one registry. This source
// phase is explicit, single-use, and never calls the hybrid producer or trial.
export async function prepareSharedMapSourceInputs({compiled,descriptor,policy,budget,pendingBondIds=[],loadProjection,signal,onWorldTable=()=>{},onBlueprints=()=>{}}){
  const live=()=>{compiled.assertLive();signal?.throwIfAborted();};live();
  if(used.has(compiled)||compiled.sources.metrics().transformedQueries||compiled.sources.metrics().nativeSourceExpansions)throw new SourcePreparationBoundary('SOURCE_OWNER_ALREADY_USED','A second preparation/transform is not permitted');
  const inventory=sharedMapInputInventory(compiled.model),preflight=preflightSharedMapSourcePreparation({descriptor,policy,inventory,budget,pendingBondIds});
  if(preflight.status!=='PREFLIGHT_READY')throw new SourcePreparationBoundary('SOURCE_PREFLIGHT_NOT_READY',JSON.stringify(preflight.problems));
  used.add(compiled);
  const p=preflight.admission.plan,pins=[],originals=new Map(),components=new Map(),bundles=new Map(),findings=[];let query,releaseProvider,worldTable,blueprints;
  const qualify=id=>qualifyInputOwner(p.placeId,id),before=compiled.sources.metrics();
  try{
    await prepareSharedMapProjections({model:compiled.model,sources:compiled.sources,projections:p.projections,loadProjection,signal,assertLive:live});live();query=compiled.createQuerySource();
    for(const spec of p.parts){live();const pin=query.pinOriginal(spec.id);pins.push(pin);if(pin.shape.triangles.length!==spec.physicalTriangles)throw new SourcePreparationBoundary('ORIGINAL_COUNT_CHANGED',spec.id);originals.set(spec.id,pin.shape);components.set(spec.id,originalMaterialComponents(pin.shape.triangles));}
    worldTable={version:1,sourceRevision:p.sourceRevision,frame:'emitted-world',grid:p.grid,parts:p.parts.map(spec=>({id:spec.id,ownerId:spec.ownerId,globalIndex:spec.globalIndex,geometry:spec.geometry,physicalGeometry:compiled.model.partById.get(spec.id).physicalGeometry??spec.geometry,matrix:compiled.model.partById.get(spec.id).matrix,closed:originals.get(spec.id).closed,triangles:originals.get(spec.id).triangles,components:components.get(spec.id)}))};
    await onWorldTable(worldTable);live();
    releaseProvider=compiled.sources.useOriginalShapes(id=>{const original=originals.get(id);if(!original)throw new SourcePreparationBoundary('OUTSIDE_PREPARATION_COHORT',id);return original;});
    const ownerRows=[];
    for(const owner of p.owners){live();const b=compiled.sources.sourcesForCarrier(owner.id);if(b.openings.length)throw new SourcePreparationBoundary('MOVING_SOURCE_NOT_ADMITTED',owner.id);bundles.set(owner.id,b);
      for(const s of b.surfaces){pins.push(query.reserveSourceGeometry('preparation/'+s.id,s.triangles));if(s.solidTriangles&&s.solidTriangles!==s.triangles)pins.push(query.reserveSourceGeometry('preparation-solid/'+s.id,s.solidTriangles));}
      const fuelAssigned=b.surfaces.reduce((n,s)=>n+s.fuelAmount,0),finishAssigned=b.surfaces.reduce((n,s)=>n+(s.finish?.amount??0),0),allowance=64*Number.EPSILON*Math.max(1,owner.fuelAmount+(owner.finish?.amount??0))*b.surfaces.length;
      if(Math.abs(fuelAssigned-owner.fuelAmount)>allowance||Math.abs(finishAssigned-(owner.finish?.amount??0))>allowance)throw new SourcePreparationBoundary('CANONICAL_ALLOCATION_CHANGED',owner.id);
      ownerRows.push({id:owner.id,mode:owner.mode,canonicalFuelAmount:owner.fuelAmount,fuelClass:owner.fuelClass,canonicalFinish:owner.finish,fuelAssigned,finishAssigned,arithmeticAllowance:allowance,surfaces:b.surfaces.map(s=>({id:s.id,nativePartId:s.nativePartId,kind:s.kind,normal:s.normal,thickness:s.thickness,triangles:s.triangles.length,fuelAmount:s.fuelAmount,fuelClass:s.fuelClass,finish:s.finish??null,span:sourceSurfaceSpan(s,p.grid)}))});
    }
    blueprints={version:1,sourceRevision:p.sourceRevision,surfaces:[...bundles.values()].flatMap(b=>b.surfaces),openings:[]};await onBlueprints(blueprints);live();
    const derived=structuredClone(p);for(const part of derived.parts){const ss=bundles.get(part.ownerId).surfaces.filter(s=>s.nativePartId===part.id);part.surfacePlan={kind:'existing-blueprint-v1',allocation:'full-canonical-owner',definitions:ss.length,triangles:ss.reduce((n,s)=>n+s.triangles.length,0),proofRef:null};}
    const endpoints=[];
    for(const b of derived.support.bonds){if(pendingBondIds.includes(b.id)){findings.push({code:'PENDING_INDEPENDENT_SOURCE_PROOF',id:b.id});continue;}for(const side of ['parent','child']){const e=b[side];try{const mapping=deriveSharedSourceEndpoint({endpoint:e,part:{triangles:originals.get(e.partId).triangles},components:components.get(e.partId),surfaces:bundles.get(qualify(compiled.model.partById.get(e.partId).carrierId)).surfaces,grid:p.grid});e.bindingPlan=mapping.bindingPlan;endpoints.push({bondId:b.id,side,originalWitness:structuredClone(p.support.bonds.find(v=>v.id===b.id)[side]),...mapping});}catch(error){if(!(error instanceof SourcePreparationBoundary))throw error;findings.push({code:error.code,id:b.id+'/'+side,detail:error.message});endpoints.push({bondId:b.id,side,status:'UNBOUND',originalWitness:structuredClone(e),reason:error.code});}}}
    const ownerSet=new Set(p.owners.map(o=>o.id)),alternatives=p.support.ordinaryAlternatives.map(row=>({ownerId:row.ownerId,semantics:row.semantics,parents:row.parentIds.map(parentId=>({parentId,inCohort:ownerSet.has(parentId),status:ownerSet.has(parentId)?'IN_COHORT_NATIVE_ALTERNATIVE_UNPROVED':'OUTSIDE_SELECTED_COHORT_UNRESOLVED'}))}));
    const after=compiled.sources.metrics();if(after.transformedQueries-before.transformedQueries!==p.parts.length||after.nativePartTransforms||after.renderExpansions||after.presentationPartTransforms)throw new SourcePreparationBoundary('SOURCE_TRANSFORM_BUDGET','Every selected original must transform exactly once');
    return {version:1,status:'NOT_READY',phase:'SOURCE_MAPPING_PROPOSAL',preflight:{counts:preflight.counts,limits:preflight.limits},owners:ownerRows,endpoints,findings,ordinaryAlternatives:alternatives,originalRootBoundaries:p.context?.reviewedSourceRoots?.alternativeBoundaries??[],proposedDescriptor:derived,admission:inspectSharedMapInputs(derived,inventory,policy),resources:{geometry:after,query:query.metrics(),originalParts:p.parts.length,originalTriangles:worldTable.parts.reduce((n,p)=>n+p.triangles.length,0),blueprintSurfaces:blueprints.surfaces.length,blueprintTriangles:blueprints.surfaces.reduce((n,s)=>n+s.triangles.length,0),nativeCompiles:0,producers:0,trials:0,supportEvaluations:0,clockSteps:0,renderers:0,builds:0}};
  }catch(error){if(!error.preparation)error.preparation={code:error.code??(/combined.*cache|source.*cache/i.test(error.message)?'SOURCE_PREPARATION_CACHE_LIMIT':'SOURCE_PREPARATION_FAILED'),detail:error.message,worldTableProduced:!!worldTable,geometry:compiled.sources.metrics(),query:query?.metrics()};throw error;}
  finally{releaseProvider?.();for(const pin of pins)pin.release();query?.dispose();}
}
