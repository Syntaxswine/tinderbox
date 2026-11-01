/** Text-only identity/import adapter over the complete frozen b820 factory. */
import {createHash} from 'node:crypto';
export {localNormalizationSource} from '../half-rate-diagnostic-asset/factory-source.mjs';
export const PRESENTATION_CONTRACT='common-linear-hdr-neutral-v1';
export const BASE_FACTORY=Object.freeze({bytes:14590,sha256:'dfcea630c797ce00ce1c08a9a1f7c7e90849f286bc3b9dd9e1876495a2cfc508'});
export const BASE_HDR_TRANSFER=Object.freeze({bytes:1666,sha256:'e60ac0c207aaeefd4fd873aefd0dab7727b583e8425e1192af2f21ce17f61d48'});
export const IDENTITY_EDITS=Object.freeze([
 ['./fluid-contact-weighted-source-diagnostic-01/','./',10],
 ['./fluid-weighted-linear-hdr-transfer.js','./linear-hdr-transfer.js',1],
 ['prepareWeightedLinearHdrData','prepareCorridorSourceDiagnosticData',1],
 ['weightedLinearHdrPayloadEvidence','corridorSourceDiagnosticPayloadEvidence',1],
 ['auditWeightedLinearHdrRGBA','auditCorridorSourceDiagnosticRGBA',1],
 ['createWeightedLinearHdrDiagnostic','createCorridorSourceLinearHdrDiagnostic',1],
 ['0.1.0-weighted-linear-hdr-neutral-prototype','0.1.0-corridor04-linear-hdr-neutral-diagnostic',1],
 ['Unaccepted exact weighted01 common-linear-HDR diagnostic','Unaccepted exact corridor04 common-linear-HDR diagnostic',1],
 ['weighted01-source-terminal-diagnostic','corridor04-source-terminal-diagnostic',1],
 ['7efd87ecfd54502d99ff837ae95fb50866458ece0f2e420014094dbc91269d56','c10c27a9bb18a910033f33a16986a5f1a5907d7bdeaee1ef6d8de77e3b049443',1],
 ['exact-weighted-source-linear-hdr-fixed6F','exact-corridor04-source-linear-hdr-fixed6F',1],
 ['Same5ad fields, fixed6F','Exact corridor04 fields, fixed6F',1]
].map(Object.freeze));
const sha=s=>createHash('sha256').update(s).digest('hex');
export function diagnosticFactorySource(template){
 if(typeof template!=='string'||Buffer.byteLength(template)!==BASE_FACTORY.bytes||sha(template)!==BASE_FACTORY.sha256)throw Error('Complete frozen b820 linear-HDR factory required');
 let source=template;
 for(const [before,after,count]of IDENTITY_EDITS){if(source.split(before).length-1!==count)throw Error('Frozen factory identity edit count mismatch');source=source.split(before).join(after);}
 let inverse=source;
 for(const [before,after,count]of [...IDENTITY_EDITS].reverse()){
  if(before==='./fluid-contact-weighted-source-diagnostic-01/')continue;
  if(inverse.split(after).length-1!==count)throw Error('Factory identity inverse count mismatch');inverse=inverse.split(after).join(before);
 }
 // Only import specifiers were localized. Restore their ten original prefixes,
 // not every ./ string in the function body.
 const files=['metadata.js','geometry-data.js','payload/payload.js','source-clock.js','support.js','space.js','shaders.js','floor.js','emission-transfer.js','normalization-transfer.js'];
 for(const file of files){const local="'./"+file+"'",original="'./fluid-contact-weighted-source-diagnostic-01/"+file+"'";if(inverse.split(local).length!==2)throw Error('Exact local factory import required');inverse=inverse.replace(local,original);}
 if(inverse!==template)throw Error('Complete b820 factory optical/body inverse failed');return source;
}
export function localLinearHdrSource(source){
 if(typeof source!=='string'||Buffer.byteLength(source)!==BASE_HDR_TRANSFER.bytes||sha(source)!==BASE_HDR_TRANSFER.sha256)throw Error('Exact b820 linear-source transfer required');
 const prefix='./fluid-contact-weighted-source-diagnostic-01/';if(source.split(prefix).length!==4)throw Error('Exact three pure HDR imports required');
 const result=source.split(prefix).join('./');let inverse=result;
 for(const file of ['shaders.js','emission-transfer.js','normalization-transfer.js'])inverse=inverse.replace("'./"+file+"'","'"+prefix+file+"'");
 if(inverse!==source)throw Error('HDR transfer import-only inverse failed');return result;
}
