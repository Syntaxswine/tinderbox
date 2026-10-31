/** Eligibility is this exact failed-terminal study, never an allow-failure mode. */
import {createHash} from 'node:crypto';
import {validateSamples,compareTerminal,equal,need,CHANNELS} from '../half-rate-assessment/metrics.mjs';
export const STUDY=Object.freeze({id:'cfe01-half-rate-terminal-diagnostic',manifestSha256:'1a3bb8d2af92f6a9c7017ad37a49b76977baa227d94ae3a0cded781229a2c77e',validationSha256:'8da43a63ab134deeadb3e1791baaf4bd3762c7be19ac9670167a58b68f2379f4',assessmentSha256:'fa4e588f59e7a9dbbd81b329356114295fdcc2df7dd2b2dfd59142c2d1e4f132',hashLedgerSha256:'5447a6b8ce8b42f5043fe8bd4ced73c5e1260b1c44802197e91e87285f192f81',terminalProofSha256:'b4a523f2b0e04965e5881b610528f2dc7b049fd3d27e693a6914d7edc3ded4b1',rawGatesPassed:false,admitted:false});
export function verifyPinnedBytes(bytes,pin){need(bytes instanceof Uint8Array&&Number.isSafeInteger(pin?.bytes)&&pin.bytes>=0&&pin.bytes<=8*1024**2&&bytes.length===pin.bytes&&createHash('sha256').update(bytes).digest('hex')===pin.sha256,'Exact bounded input byte/hash pin required');return bytes;}
export function validateEligibility({manifest,validation,assessment,ledger,proof,prepared,settings},plan){
 need(equal(Object.keys(plan.study).sort(),Object.keys(STUDY).sort())&&plan.study.id===STUDY.id&&Object.keys(STUDY).every(k=>plan.study[k]===STUDY[k]),'Only the exact frozen failed study is eligible');
 need(manifest.version===1&&manifest.id==='tinderbox-mantaflow-half-rate-source'&&manifest.status==='raw-export-failed-preserved'&&manifest.sampleCount===193,'Wrong preserved source/status');
 need(validation.rawGatesPassed===false&&equal(validation.failures,['raw flame not exactly zero at/after3.2 frame97'])&&validation.lastPositiveAge===3.2,'Exact original failure required');
 const residual=validation.requiredSamples?.find(x=>x.frame===97),zero=validation.requiredSamples?.find(x=>x.frame===98);
 need(residual?.age===3.2&&residual.positive===55&&residual.nonzero===55&&residual.max===.3547821044921875&&residual.integral===.0002870405151671375,'Frozen frame97 residual changed');
 need(zero?.age===97/30&&zero.nonzero===0&&zero.positive===0&&zero.max===0&&zero.integral===0,'Frozen frame98 zero changed');
 need(equal(manifest.terminalValidation,validation),'Manifest validation disagreement');
 need(assessment.status==='complete-bytes-reconciled-raw-gates-still-failed'&&assessment.rawGatesPassed===false&&assessment.admitted===false&&assessment.frames?.length===193,'Completed unadmitted assessment required');
 compareTerminal(assessment.terminal,validation);
 need(proof.rawGatesPassed===false&&proof.admitted===false&&proof.all579CandidateFieldHashesVerified===true&&proof.baselineFieldHashesVerified===2,'Accepted terminal proof shape changed');
 need(manifest.initialConditionObservedZero===true&&validation.initialAllThreeChannelsActuallyZero===true&&manifest.boundaryReactionFailed===false&&manifest.belowGroundReactionFailed===false&&manifest.upperOverhangApproved===false,'Original raw condition flags changed');
 need(equal(manifest.burningRateCounterfactual,{property:'burning_rate',baseline:.75,target:.375})&&equal(settings.counterfactual,manifest.burningRateCounterfactual),'Only the frozen half-rate recipe is eligible');
 need(equal(manifest.ageRange,[0,6.4])&&equal(manifest.burnAgeRange,[0,3.2])&&manifest.tailMaximum===3.2&&equal(manifest.cachePrecision,{requested:'32',observed:'32'}),'Finite source clock/precision changed');
 need(manifest.scalarFormat==='Original observed f32LE Xfastest,YthenZ; no quantization/crop/terminal overwrite','Original f32LE ordering changed');
 need(equal(manifest.sourcePins,plan.authoringPins)&&equal(prepared.sourcePins,plan.authoringPins)&&manifest.sourceBlendSha256===plan.sourcePins.sourceBlendSha256&&prepared.preparedBlendSha256===plan.sourcePins.sourceBlendSha256&&prepared.observedValid===true,'Source/prepared identity mismatch');
 need(equal(manifest.canonicalSource,settings.source)&&equal(manifest.controlV5,settings.controlV5),'Frozen source/control recipe changed');
 const grid={resolution:plan.grid.resolution,voxelSize:plan.grid.spacing,gridOrigin:plan.grid.origin,domainBounds:plan.domainBounds,contactBandHeight:plan.contactBandHeight},names=validateSamples(manifest,grid);
 need(ledger.all579RawHashesVerified===true&&ledger.candidateFields?.length===579&&ledger.baselineSelectedFields?.length===2,'Complete independently assessed ledger required');
 const expected=new Map();
 for(let i=0;i<579;i++){
  const frame=Math.floor(i/3)+1,channel=CHANNELS[i%3],r=ledger.candidateFields[i],source=manifest.samples[frame-1].channels[channel],a=assessment.frames[frame-1];
  need(r.frame===frame&&r.channel===channel&&r.path===source.path&&r.bytes===884736&&r.sha256===source.sha256&&a.frame===frame&&a.age===(frame-1)/30,'Ledger/assessment clock/channel/source mismatch');
  for(const k of['min','max','nonzero','positive'])need(r[k]===source[k]&&a.channels[channel][k]===source[k],'Assessed raw statistics mismatch');
  const key=frame+':'+channel;need(!expected.has(key),'Repeated original channel');expected.set(key,r);
 }
 return{grid:plan.grid,expected,names,study:{...STUDY},qualification:'diagnostic-construction-eligibility-only; raw failure remains false'};
}

export function verifyPayloadSizing(actual,limits){
 for(const [key,limit]of [['sourceBytes','sourceBytes'],['sparseBytes','sparseBytes'],['compressedBytes','compressedBytes'],['chunks','chunks'],['frameSparseBytes','chunkSparseBytes'],['frameCompressedBytes','chunkCompressedBytes']])need(Number.isSafeInteger(actual[key])&&actual[key]>=0&&actual[key]<=limits[limit],'Measured lossless payload ceiling exceeded: '+key);
 return actual;
}
