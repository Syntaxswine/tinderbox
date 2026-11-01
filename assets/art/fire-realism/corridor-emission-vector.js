import {createCorridorSourceLinearHdrDiagnostic,prepareCorridorSourceDiagnosticData,corridorSourceDiagnosticPayloadEvidence,auditCorridorSourceDiagnosticRGBA} from './fluid-contact-corridor-source-diagnostic-01/index.js';
import {installCornerEmissionVector} from './corridor-emission-vector-transfer.js';
export {prepareCorridorSourceDiagnosticData as prepareCorridorEmissionVectorData,corridorSourceDiagnosticPayloadEvidence as corridorEmissionVectorPayloadEvidence,auditCorridorSourceDiagnosticRGBA as auditCorridorEmissionVectorRGBA};
export function createCorridorEmissionVectorDiagnostic(T,options={}){
 let effect;
 try{
  effect=createCorridorSourceLinearHdrDiagnostic(T,options);installCornerEmissionVector(effect);
  return {...effect,diagnostics(){const d=effect.diagnostics();return {...d,version:'0.1.0-corridor-corner-emission-vector',prototype:true,referenceAccepted:false,optimizedAvailable:false,diagnostic:{variant:'corridor04-corner-emission-vector',presentationContract:'common-linear-hdr-neutral-v1',sourcePaletteEncoding:'linear-working-rgb',dataControlCommit:'f93828adf59c96398b1b9c7e623ed5fefaf5de03',study:structuredClone(d.diagnostic.study),rawGatesPassed:false,admitted:false,actualInputGridProof:false,response:'Uncalibrated artist-selected F squared times excess-proxy palette at corners; complete vector filtered before existing G once',flameNormalization:6,extinction:'Unchanged smoke-only; flame coefficient0',scope:'Fixed fields/store193resources and raw reconstruction/smoke/alpha/light/depth/clocks/common Neutral1 preserved. Only private emission-vector transfer changes. No new data, reference/native/quality/cost acceptance.'}};}};
 }catch(error){try{effect?.dispose();}catch(cleanup){throw new AggregateError([error,cleanup],'Corner-vector refusal and original cleanup failure');}throw error;}
}
