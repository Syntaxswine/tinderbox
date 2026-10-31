/** Only this byte-pinned weighted failure is construction-eligible; never raw-valid. */
import {validateSamples,compareTerminal,equal,need,CHANNELS} from '../half-rate-assessment/metrics.mjs';
import {validateWeightedIdentity,PROFILE} from '../weighted-source-assessment/identity.mjs';
export {verifyPinnedBytes,verifyPayloadSizing} from '../half-rate-diagnostic-asset/eligibility.mjs';
export const STUDY=Object.freeze({id:'weighted01-source-terminal-diagnostic',manifestSha256:'7efd87ecfd54502d99ff837ae95fb50866458ece0f2e420014094dbc91269d56',validationSha256:'5b7035d9a1d81b0f0f80c92a71f1985459aa4ef00092d5c3c8c090a9d2f3ff6d',assessmentSha256:'b2f088c27a68c5920966ab00141143548b515d02a079779fab9cdedcb40ffe41',hashLedgerSha256:'5c965f13654c304a18892d327509648b9cc67f22bb2ce3b7fe43688cfbebcb82',terminalProofSha256:'a362292ec940fb04a000fed29cc324839763d5f8b7d3a103c998462db42401f3',weightProfileSha256:PROFILE,rawGatesPassed:false,admitted:false});
export function validateEligibility({manifest,validation,assessment,ledger,proof,prepared,settings,identity,reloadedWeights,reloadedState},plan){
 need(equal(plan.study,STUDY),'Only the exact frozen weighted failed study is eligible');
 need(plan.authoringCommit==='6afbcf3e288bd39d7ec6a291572bb472779ef8cd'&&plan.executionCommit==='39ba942b7162462c3da8431967917dc2696c3a88'&&plan.readerCommit==='8da674f755d7787dcf4721151d9688a1a72fb494','Authored/executed/assessed identities differ');
 const pins={manifest:identity.manifest,validation:identity.validation,prepared:identity.prepare,settings:identity.settings,scene:identity.scene,reloadedWeights:identity.witnesses.reloadedWeights,reloadedState:identity.witnesses.reloadedState};
 need(equal(Object.keys(plan.inputs).sort(),[...Object.keys(pins),'identity','assessment','ledger','proof'].sort()),'Exact metadata input closure required');
 for(const [key,pin]of Object.entries(pins))need(equal(plan.inputs[key],pin),'Weighted metadata pin linkage mismatch:'+key);
 for(const [key,bytes,hash]of [['identity',10800,'74b2a0cd4b34b02683cd30130fc5dcfa866a00e8795331077b3d34a425944062'],['assessment',796304,STUDY.assessmentSha256],['ledger',172673,STUDY.hashLedgerSha256],['proof',8751,STUDY.terminalProofSha256]])need(plan.inputs[key].bytes===bytes&&plan.inputs[key].sha256===hash,'Frozen assessment/identity pin required:'+key);
 need(equal(manifest.sourcePins,plan.authoringPins)&&equal(plan.authoringPins,identity.sourcePins),'Exact ten authoring pins required');
 need(equal(plan.sourcePins,{rawManifestSha256:STUDY.manifestSha256,settingsSha256:identity.settings.sha256,prepareReportSha256:identity.prepare.sha256,sourceBlendSha256:identity.scene.sha256}),'Raw source identity linkage changed');
 const weighted=validateWeightedIdentity(identity,manifest,validation,prepared,settings,reloadedWeights,reloadedState);
 need(manifest.version===1&&manifest.sampleCount===193&&equal(manifest.ageRange,[0,6.4])&&equal(manifest.burnAgeRange,[0,3.2])&&manifest.tailMaximum===3.2,'Finite source clock changed');
 need(equal(validation.failures,['raw flame not exactly zero at/after3.2 frame97'])&&validation.lastPositiveAge===3.2,'Sole original terminal failure required');
 const residual=validation.requiredSamples?.find(x=>x.frame===97),zero=validation.requiredSamples?.find(x=>x.frame===98);
 need(residual?.age===3.2&&residual.positive===29&&residual.nonzero===29&&residual.max===.35069775581359863&&residual.integral===.000210758693335884&&residual.belowGroundPositive===0&&residual.boundaryPositive===0,'Frozen weighted frame97 residual changed');
 need(zero?.age===97/30&&zero.nonzero===0&&zero.positive===0&&zero.max===0&&zero.integral===0,'Frozen weighted frame98 zero changed');
 need(equal(manifest.terminalValidation,validation),'Manifest validation disagreement');
 need(manifest.initialConditionObservedZero===true&&validation.initialAllThreeChannelsActuallyZero===true&&manifest.boundaryReactionFailed===false&&manifest.belowGroundReactionFailed===false&&manifest.upperOverhangApproved===false,'Original raw condition flags changed');
 need(equal(manifest.burningRateCounterfactual,{property:'burning_rate',baseline:.75,target:.375})&&equal(settings.counterfactual,manifest.burningRateCounterfactual)&&equal(manifest.canonicalSource,settings.source)&&equal(manifest.controlV5,settings.controlV5),'Frozen source/control recipe changed');
 need(equal(manifest.cachePrecision,{requested:'32',observed:'32'})&&manifest.scalarFormat==='Original observed f32LE Xfastest,YthenZ; no quantization/crop/terminal overwrite','Original scalar precision/order changed');
 const grid={resolution:plan.grid.resolution,voxelSize:plan.grid.spacing,gridOrigin:plan.grid.origin,domainBounds:plan.domainBounds,contactBandHeight:plan.contactBandHeight};
 need(equal(identity.gridMapping,{resolution:grid.resolution,voxelSize:grid.voxelSize,gridOrigin:grid.gridOrigin,domainBounds:grid.domainBounds})&&equal(grid.resolution,[48,48,96])&&grid.contactBandHeight===.2733333358168602,'Original mapping/contact band changed');
 const names=validateSamples(manifest,grid);
 need(assessment.status==='complete-bytes-reconciled-raw-gates-still-failed'&&assessment.rawGatesPassed===false&&assessment.admitted===false&&assessment.frames?.length===193&&equal(assessment.weightedIdentity,weighted),'Completed weighted assessment/witness required');
 compareTerminal(assessment.terminal,validation);
 need(proof.kind==='weighted-assessment-terminal-index-v1'&&proof.sourceCommit===plan.readerCommit&&proof.status===assessment.status&&proof.rawGatesPassed===false&&proof.admitted===false&&equal(proof.exitCodes,[0,0])&&proof.forced===false&&proof.retained===false,'Accepted terminal proof qualification changed');
 need(equal(proof.fieldReads,{new:579,old:2,total:581,uniqueNewKeys:579,bytes:514031616,bufferBytes:884736,oldFrames:[31,61],oldTerminal:'8da JSON only'})&&equal(proof.weightedFrame97,residual)&&proof.frame98Zero===true,'Accepted original read/terminal evidence changed');
 for(const [name,pin]of [['report.json',plan.inputs.assessment],['hashes.json',plan.inputs.ledger]]){const r=proof.readerFiles.find(x=>x.name===name);need(r?.bytes===pin.bytes&&r.sha256===pin.sha256,'Proof/assessment metadata linkage changed');}
 need(ledger.all579RawHashesVerified===true&&ledger.candidateFields?.length===579&&ledger.candidateReads===579&&ledger.controlReads===2&&ledger.totalFieldReads===581&&ledger.baselineSelectedFields?.length===2,'Complete independently assessed ledger required');
 const expected=new Map();
 for(let i=0;i<579;i++){
  const frame=Math.floor(i/3)+1,channel=CHANNELS[i%3],r=ledger.candidateFields[i],source=manifest.samples[frame-1].channels[channel],a=assessment.frames[frame-1];
  need(r.frame===frame&&r.channel===channel&&r.path===source.path&&r.bytes===884736&&r.sha256===source.sha256&&a.frame===frame&&a.age===(frame-1)/30,'Ledger/assessment clock/channel/source mismatch');
  for(const k of ['min','max','nonzero','positive'])need(r[k]===source[k]&&a.channels[channel][k]===source[k],'Assessed raw statistics mismatch');
  const key=frame+':'+channel;need(!expected.has(key),'Repeated original channel');expected.set(key,r);
 }
 return{grid:plan.grid,expected,names,study:{...STUDY},weightedIdentity:weighted,qualification:'Exact weighted diagnostic-construction eligibility only; raw failure/admission remain false'};
}
