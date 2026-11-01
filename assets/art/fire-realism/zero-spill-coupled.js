import {createCoupledCornerEmissionDiagnostic,prepareCoupledCornerEmissionData,coupledCornerEmissionPayloadEvidence,auditCoupledCornerEmissionRGBA} from './coupled-corner-emission.js';
import {guardZeroSpillCoupled,forceZeroSpill} from './zero-spill-coupled-transfer.js';
export {prepareCoupledCornerEmissionData as prepareZeroSpillCoupledData,coupledCornerEmissionPayloadEvidence as zeroSpillCoupledPayloadEvidence,auditCoupledCornerEmissionRGBA as auditZeroSpillCoupledRGBA};
export function createZeroSpillCoupledDiagnostic(T,options={}){
 let effect,light,closed=false,failed=false,failure=null,lastOperation='initial',lastRequested=0,lastUpdateRequested=0,updates=0,cleanupAttempted=false,cleanupReturned=false;
 function fail(error,cleanup=true){
  const errors=[error];closed=true;failed=true;
  if(light&&lastRequested===null)try{lastRequested=light.intensity;if(lastOperation==='update')lastUpdateRequested=lastRequested;}catch(e){errors.push(e);}
  if(light)try{light.intensity=0;if(light.intensity!==0)throw Error('Failed light suppression during retirement');}catch(e){errors.push(e);}
  if(cleanup&&effect){cleanupAttempted=true;try{effect.dispose();cleanupReturned=true;}catch(e){errors.push(e);}}
  failure=errors.length===1?error:new AggregateError(errors,'Zero-spill failure with suppression/cleanup errors');throw failure;
 }
 try{effect=createCoupledCornerEmissionDiagnostic(T,options);light=guardZeroSpillCoupled(effect);}catch(error){fail(error);}
 return {...effect,
  update(...args){
   if(failed)throw failure;if(closed)return;
   lastOperation='update';lastRequested=lastUpdateRequested=null;
   try{const result=Reflect.apply(effect.update,effect,args);lastRequested=lastUpdateRequested=light.intensity;updates++;forceZeroSpill(light,lastRequested);return result;}catch(error){fail(error);}
  },
  reset(...args){
   if(failed)throw failure;if(closed)return;
   lastOperation='reset';lastRequested=null;
   try{const result=Reflect.apply(effect.reset,effect,args);lastRequested=light.intensity;if(lastRequested!==0)throw Error('Delegated reset did not clear its owned light');return result;}catch(error){fail(error);}
  },
  dispose(...args){
   if(closed)return;closed=true;cleanupAttempted=true;lastOperation='dispose';lastRequested=null;
   try{const result=Reflect.apply(effect.dispose,effect,args);cleanupReturned=true;lastRequested=light.intensity;if(lastRequested!==0)throw Error('Delegated disposal did not clear its owned light');return result;}catch(error){fail(error,false);}
  },
  diagnostics(){const d=effect.diagnostics(),retained=light.parent===effect.root&&effect.root.children.includes(light);return {...d,version:'0.1.0-zero-local-spill-causal-control',prototype:true,referenceAccepted:false,optimizedAvailable:false,diagnostic:{...d.diagnostic,variant:'corridor04-coupled-zero-local-spill',opticalControlCommit:'34af2a3f091f05054387602291cf1876cd741606',zeroLocalSpill:{ablation:true,lastOperation,delegatedRequestedIntensity:lastRequested,lastUpdateRequestedIntensity:lastUpdateRequested,appliedIntensity:light.intensity,updates,ownedLightKeptAllocated:retained,retainedLightCount:Number(retained),delegateReportedLights:d.resources.lights,cleanupAttempted,cleanupReturned,status:failed?'failed':closed?'disposed':'active',renderingCostClaim:false},scope:'Causal local-spill ablation only, not a final unlit product or useful R. Exact R40 FP/j6/k6, palette, raw fields, smoke, associated blend, geometry, depth, masks, legibility, clocks, environment and underlay stay fixed. The owned light remains allocated; zero intensity is not a zero-GPU-work claim. Raw/admission/inputE/reference false; no quality/cost/native acceptance.'}};}
 };
}
