/** Identity-only layer over the exact R31 source generator. No asset import/store. */
import {createHash} from 'node:crypto';
import {diagnosticFactorySource as frozenFactory,localNormalizationSource} from '../half-rate-diagnostic-asset/factory-source.mjs';
export {localNormalizationSource};
export const BASE_FACTORY=Object.freeze({bytes:13701,sha256:'df2fd1c2db58b72c96f59d20d3a15ce583d982ac0d34028af53bb94b62866a43'});
export const IDENTITY_EDITS=Object.freeze([
 ['prepareHalfRateDiagnosticData','prepareWeightedSourceDiagnosticData'],
 ['halfRateDiagnosticPayloadEvidence','weightedSourceDiagnosticPayloadEvidence'],
 ['auditHalfRateDiagnosticRGBA','auditWeightedSourceDiagnosticRGBA'],
 ['createHalfRateContactDiagnostic','createWeightedSourceContactDiagnostic'],
 ['0.1.0-half-rate-failed-terminal-diagnostic','0.1.0-weighted-source-failed-terminal-diagnostic'],
 ['Unaccepted exact cfe01 half-rate diagnostic','Unaccepted exact weighted01 source diagnostic'],
 ['cfe01-half-rate-terminal-diagnostic','weighted01-source-terminal-diagnostic'],
 ['1a3bb8d2af92f6a9c7017ad37a49b76977baa227d94ae3a0cded781229a2c77e','7efd87ecfd54502d99ff837ae95fb50866458ece0f2e420014094dbc91269d56'],
 ['exact-half-rate-failed-terminal-fixed6r','exact-weighted-source-failed-terminal-fixed6r'],
 ['distinct measured half-rate support.','distinct measured weighted-source support.']
].map(Object.freeze));
const sha=s=>createHash('sha256').update(s).digest('hex');
export function diagnosticFactorySource(template){
 const original=frozenFactory(template);if(Buffer.byteLength(original)!==BASE_FACTORY.bytes||sha(original)!==BASE_FACTORY.sha256)throw Error('Exact frozen R31 complete factory required');
 let source=original;for(const [before,after]of IDENTITY_EDITS){if(source.split(before).length!==2||source.includes(after))throw Error('Exact single identity edit required');source=source.replace(before,after);}
 let inverse=source;for(const [before,after]of [...IDENTITY_EDITS].reverse())inverse=inverse.replace(after,before);
 if(inverse!==original)throw Error('Weighted identity adapter must invert byte-exactly');return source;
}
