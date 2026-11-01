/** Construction eligibility for ONLY immutable corridor04; raw/admission stayfalse. */
import {validateSamples,compareTerminal,equal,need,CHANNELS} from '../half-rate-assessment/metrics.mjs';
export {verifyPinnedBytes,verifyPayloadSizing} from '../half-rate-diagnostic-asset/eligibility.mjs';
export const AUTHORING_COMMIT='d54703344c3339cbd65a4c4f8fdc78cbb46f44b1';
export const RAW_AUDIT=Object.freeze({path:'C:/Users/baals/.codex/worktrees/tinderbox-code/tinderbox/artifacts/qa/fire-realism/corridor04-independent-raw-audit.json',bytes:1591172,sha256:'5ae65c4c5741f91e6f2b119ffb058dc97edbc4353c5fc95d99e6f1345988b49c'});
export const STUDY=Object.freeze({id:'corridor04-source-terminal-diagnostic',manifestSha256:'c10c27a9bb18a910033f33a16986a5f1a5907d7bdeaee1ef6d8de77e3b049443',validationSha256:'d5912e0308f3addcb6d3fc3b7d72a69c079e2c1d3151b2dbc0ebd31de83e6e2b',rawAuditSha256:RAW_AUDIT.sha256,rawGatesPassed:false,admitted:false});
const IDENTITY=[[1,0,0,0],[0,1,0,0],[0,0,1,0],[0,0,0,1]];
export function validateEligibility({manifest,validation,audit,prepared,settings,reloaded,reloadedState},plan){
 need(equal(plan.study,STUDY)&&plan.authoringCommit===AUTHORING_COMMIT&&plan.executionCommit===AUTHORING_COMMIT,'Exact corridor04 source/study required');
 need(plan.proposalCommit==='16b7caee5828ca33d76df7aadbc150dd0a394172'&&equal(plan.inputs.audit,RAW_AUDIT),'Exact architect scope/independent report pin required');
 need(equal(Object.keys(plan.inputs).sort(),['manifest','validation','audit','prepared','settings','reloaded','reloadedState'].sort()),'Exact seven metadata inputs required');
 need(plan.inputs.manifest.bytes===4834289&&plan.inputs.manifest.sha256===STUDY.manifestSha256&&plan.inputs.validation.bytes===5138&&plan.inputs.validation.sha256===STUDY.validationSha256,'Exact failed export/validator pins required');
 need(plan.inputs.prepared.bytes===1167042&&plan.inputs.prepared.sha256==='c23ed17fb363534e57233e7655c44a0aacffb681072d165682df7c9a694aa66e'&&plan.inputs.settings.bytes===10168&&plan.inputs.settings.sha256==='46018be54fe187a8acb03f71c0a045e4b34444251a1d0297126f3588c144268b'&&plan.inputs.reloaded.bytes===186129&&plan.inputs.reloaded.sha256==='3bd19e07e6c307ed63ebf7a4b9b51017c7b1ac92b83df6e8d86175f0154f0424','Frozen preparation/settings/reload required');
 need(manifest.version===1&&manifest.id===settings.id&&settings.id==='tinderbox-mantaflow-corridor-source'&&manifest.status==='raw-export-failed-preserved'&&manifest.sampleCount===193,'Exact original corridor source/status required');
 need(equal(manifest.sourcePins,plan.authoringPins)&&equal(prepared.sourcePins,plan.authoringPins)&&Object.keys(plan.authoringPins).length===16,'All16 authoring pins required');
 need(equal(plan.sourcePins,{rawManifestSha256:STUDY.manifestSha256,settingsSha256:plan.inputs.settings.sha256,prepareReportSha256:plan.inputs.prepared.sha256,sourceBlendSha256:'c1121b23154b71531f71670618ebb71b27ae7626d1b011280ac427cc83ad1150'}),'Four immutable field-source pins changed');
 need(manifest.sourceBlendSha256===plan.sourcePins.sourceBlendSha256&&prepared.preparedBlendSha256===plan.sourcePins.sourceBlendSha256&&prepared.observedValid===true&&prepared.actualStateComparison?.passed===true,'Pinned actual preparation identity/gate required');
 need(prepared.corridorSourceGate?.passed===true&&prepared.corridorSourceGate.curveRows===193&&equal(prepared.corridorSourceGate.frames,[1,2,91,193])&&prepared.corridorSourceGate.actualInputGridProof===false&&prepared.corridorSourceGate.nominalCrossings===8&&prepared.corridorSourceGate.strictOpenStripPassed===false,'Pinned separate actual-source/nominal-realization gates required');
 need(prepared.evaluatedCurve?.length===193&&prepared.evaluatedCurve.every((r,i)=>r.frame===i+1&&r.age===i/30),'Complete source193 clock required');
 need(equal(prepared.activeOriginalBOTH,{fuel_amount:1,density:1,temperature:2})&&equal(manifest.burningRateCounterfactual,{property:'burning_rate',baseline:.75,target:.375})&&equal(settings.counterfactual,manifest.burningRateCounterfactual),'Original active inputs/burnrate changed');
 const state=prepared.preparedActualState,flags={density_vertex_group:'TinderboxSurfaceFeed1893',volume_density:0,use_absolute:true,use_plane_init:true,surface_distance:.5,flow_type:'BOTH'};
 need(state.domainSettings.burning_rate===.375&&state.domainSettings.vorticity===.25&&state.domainSettings.flame_vorticity===.5&&equal(state.sourceWorld,IDENTITY)&&Object.entries(flags).every(([k,v])=>state.sourceSettings[k]===v),'Pinned source physics/flags changed');
 need(equal(manifest.inheritedUnclippedSourceSettings,settings.source)&&equal(manifest.controlV5,settings.controlV5)&&equal(manifest.actualClippedEmitter.mesh,state.sourceMesh)&&manifest.actualClippedEmitter.planSha256===prepared.corridorSourceGate.planSha256&&manifest.actualClippedEmitter.savedFrame1WitnessSha256===plan.inputs.reloaded.sha256,'Clipped source provenance changed');
 need(reloaded.kind==='corridor-source-prebake-observation-v1'&&reloaded.passed===true&&reloaded.gate?.passed===true&&reloaded.observation.frame===1&&reloaded.observation.effectiveInputGridProved===false&&equal(reloaded.observation.original,prepared.corridorInstall.observation)&&equal(reloaded.observation.original,reloaded.observation.evaluated)&&equal(reloaded.observation.attributeAnchor,prepared.corridorInstall.attributeInstalled.observation),'Fresh externally anchored saved-frame1 proof changed');
 need(reloadedState.passed===true&&equal(reloadedState.differences,[])&&equal(reloadedState.errors,[]),'Saved complete state comparison required');
 need(validation.rawGatesPassed===false&&equal(validation.failures,['raw flame not exactly zero at/after3.2 frame97'])&&validation.lastPositiveAge===3.2,'Sole exact original terminal failure required');
 const residual=validation.requiredSamples?.find(r=>r.frame===97),zero=validation.requiredSamples?.find(r=>r.frame===98);
 need(residual?.age===3.2&&residual.min===0&&residual.nonzero===50&&residual.positive===50&&residual.max===.2538328468799591&&residual.integral===.0002875112247816121&&residual.belowGroundPositive===0&&residual.boundaryPositive===0,'Exact50-positive frame97 residual required');
 need(zero?.age===97/30&&zero.min===0&&zero.max===0&&zero.nonzero===0&&zero.positive===0&&zero.integral===0,'Exact frame98 zero required');
 need(equal(manifest.terminalValidation,validation)&&manifest.initialConditionObservedZero===true&&validation.initialAllThreeChannelsActuallyZero===true&&manifest.boundaryReactionFailed===false&&manifest.belowGroundReactionFailed===false&&manifest.upperOverhangApproved===false,'Original failed validation/condition flags changed');
 need(equal(manifest.ageRange,[0,6.4])&&equal(manifest.burnAgeRange,[0,3.2])&&manifest.tailMaximum===3.2&&equal(manifest.cachePrecision,{requested:'32',observed:'32'})&&manifest.scalarFormat==='Original observed f32LE Xfastest,YthenZ; no quantization/crop/terminal overwrite','Source clock/precision/order changed');
 const grid={resolution:plan.grid.resolution,voxelSize:plan.grid.spacing,gridOrigin:plan.grid.origin,domainBounds:plan.domainBounds,contactBandHeight:plan.contactBandHeight},names=validateSamples(manifest,grid);
 need(audit.kind==='corridor04-independent-one-pass-raw-audit-v1'&&audit.complete===true&&audit.diagnosticEligibilityCandidate===true&&equal(audit.additionalDefects,[])&&audit.rawGatesPassed===false&&audit.admitted===false&&audit.actualInputGridProof===false,'Complete independent unadmitted-only audit required');
 need(audit.sourceCandidate===AUTHORING_COMMIT&&equal(audit.sourcePins,plan.authoringPins)&&audit.preparedSceneHashMetadataOnly===plan.sourcePins.sourceBlendSha256&&equal(audit.grid,plan.grid)&&equal(audit.metadata,plan.rawAuditMetadata),'Independent source/grid/metadata linkage changed');
 need(audit.fieldReads===579&&audit.fieldBytesRead===512262144&&audit.completedChannelAnalyses===579&&audit.records?.length===193&&audit.ledger?.length===579&&audit.firstZeroAfterLastPositiveFrame===98&&audit.terminalDefectVoxels?.length===50,'Complete one-pass579/terminal evidence required');
 compareTerminal(audit.terminal,validation);
 const expected=new Map();
 for(let i=0;i<193;i++){
  const sample=manifest.samples[i],a=audit.records[i];need(a.frame===i+1&&a.ageSeconds===i/30,'Independent frame/age changed');
  for(const k of ['resolution','voxelSize','scalarCentreOriginBlender','domainBoundsBlender','contactBandHeight'])need(equal(a[k],sample[k]),'Independent mapping changed:'+k);
  for(const channel of CHANNELS){
   const row=a.channels[channel],source=sample.channels[channel],ledger=audit.ledger[i*3+CHANNELS.indexOf(channel)];
   need(row.finite===true&&row.nonnegative===true&&ledger.frame===i+1&&ledger.ageSeconds===i/30&&ledger.channel===channel&&ledger.path===source.path&&ledger.bytes===884736&&ledger.sha256===source.sha256,'Independent field identity/finite/nonnegative changed');
   for(const k of ['path','bytes','sha256','min','max','nonzero','positive'])need(row[k]===source[k],'Independent scalar mismatch:'+k);
   need(Number.isFinite(row.integral)&&Number.isFinite(row.descriptiveSum),'Finite descriptive scalar statistics required');
   if(channel!=='temperature')need(equal(a.support[channel],sample.support[channel])&&a.support[channel].threshold===0,'Full strict-positive support/halo/layer claims changed');
   const key=(i+1)+':'+channel;need(!expected.has(key),'Repeated channel');expected.set(key,{...ledger,...source});
  }
 }
 need(equal(audit.onePassOrder,[...expected.values()].map(r=>r.path))&&equal(audit.terminalDefectSupport,manifest.samples[96].support.flame),'Independent read-order/terminal support changed');
 return{grid:plan.grid,expected,names,study:{...STUDY},qualification:'Exact failed corridor04 construction eligibility only; ROOT source/report/execution clearance remains separate. Raw/admissionfalse.'};
}
