/** Fixed JSON identity gates only; no authoring, scene, data or API import. */
import {need,equal} from './metrics.mjs';
export const TARGET=Object.freeze({bytes:4836989,sha256:'7efd87ecfd54502d99ff837ae95fb50866458ece0f2e420014094dbc91269d56'});
export const VALIDATION=Object.freeze({bytes:5134,sha256:'5b7035d9a1d81b0f0f80c92a71f1985459aa4ef00092d5c3c8c090a9d2f3ff6d'});
export const CONTROL=Object.freeze({bytes:4982197,sha256:'1a3bb8d2af92f6a9c7017ad37a49b76977baa227d94ae3a0cded781229a2c77e'});
export const PREPARATION=Object.freeze({bytes:214114,sha256:'ccdb1e67e8611c138e6763dc6b69744865281b9e77150210c3a095c483da21e3'});
export const SETTINGS=Object.freeze({bytes:9676,sha256:'c60d9a76c306d04a21fc97733a00d69c45e4e8dd280de6d5c141af518bdd6a40'});
export const SCENE=Object.freeze({bytes:474375,sha256:'362fe0bd5731a7aaf5043c39f49d15ceb602e67b4acb11a747f8bd42bdb03162'});
export const RELOADED=Object.freeze({bytes:12182,sha256:'fa99a5281369aa0e348fdae3f6801ec3dae282ef7b3bbd9275e9de2c65ae8daf'});
export const RELOADED_STATE=Object.freeze({bytes:654,sha256:'e803cb07137a1de0dc6d5ca8edb23339c7a15838fc82a75b64de33a886a3c32a'});
export const PROFILE='e15ae7b81b312bae3dd339da75b62c4d8687ba9e15bf2e83c45292ec23b0c29b';
export const WEIGHTS=Object.freeze([1,1,1,.875,.875,.375,.25,.375,.25,.0625,.5,.75,.625,.375,.125,.0625,.125,.375,.5,.375,.125,.125,.375,.75,1]);
export const CONTROL_FIELDS=Object.freeze([{frame:31,ageSeconds:1,sha256:'be25f7485b653341afdcbb269cc6d3d607e5fcb98d50d4d70dee1724851ea171'},{frame:61,ageSeconds:2,sha256:'23c9cf2bff8a8afda10fe0ab3931dcfd56bd5d4ffb58be369b918fd774030f4c'}].map(Object.freeze));
const frames=[1,2,91,193],group='TinderboxSurfaceFeed1893',object='CanonicalFourCellBed';
const flags={density_vertex_group:group,volume_density:0,use_absolute:true,use_plane_init:true,surface_distance:.5,flow_type:'BOTH'};
const bits=v=>{const b=Buffer.alloc(4);b.writeFloatLE(v);return b.toString('hex');};
const targetBits=WEIGHTS.map(bits);
export function groupRecord(record){
 need(record?.objectName===object&&record.vertexCount===25,'Exact weighted source object/extent required');
 need(equal(record.groups,[{index:0,name:group}])&&record.vertices?.length===25,'Named group/index and complete deform layer required');
 record.vertices.forEach((r,i)=>{need(r.vertex===i&&r.memberships?.length===1&&r.memberships[0].group===0,'Complete unique vertex/group indices required');const w=r.memberships[0].weight;need(Number.isFinite(w)&&Object.is(w,Math.fround(w))&&bits(w)===targetBits[i],'Exact frozen F32 weight bits required');});
}
function observation(e,prepared,frame){
 need(e?.frame===frame&&e.evaluatedId===true,'Actual selected evaluated frame witness required');groupRecord(e.original);groupRecord(e.evaluated);
 need(equal(e.original,e.evaluated)&&equal(e.flowFlags,flags),'Original/evaluated weights or flow flags differ');
 const state=prepared.preparedActualState;need(equal(e.originalMesh,state.sourceMesh)&&equal(e.evaluatedMesh,state.sourceMesh)&&state.sourceMesh.vertices===25&&state.sourceMesh.polygons===23,'Exact original/evaluated topology binding required');
 need(equal(e.originalWorld,state.sourceWorld)&&equal(e.evaluatedWorld,state.sourceWorld),'Original/evaluated world binding required');
 for(const k of ['domainFlagsBefore','domainFlagsDuring','domainFlagsAfter'])need(e[k]?.length===2&&e[k].every(v=>typeof v==='boolean'),'Actual domain modifier flags required');
 need(equal(e.domainFlagsDuring,[false,false])&&equal(e.domainFlagsBefore,e.domainFlagsAfter),'Domain isolation/restoration failed');
}
export function validateWeightedIdentity(spec,manifest,validation,prepared,settings,reloaded,reloadedState){
 for(const [r,pin]of [[spec.manifest,TARGET],[spec.validation,VALIDATION],[spec.prepare,PREPARATION],[spec.settings,SETTINGS],[spec.scene,SCENE],[spec.witnesses.reloadedWeights,RELOADED],[spec.witnesses.reloadedState,RELOADED_STATE]])need(r?.bytes===pin.bytes&&r.sha256===pin.sha256,'Exact frozen failed weighted input required');
 need(spec.stage==='artifacts/qa/fire-realism/mantaflow-weighted-source/weighted-source-20261031-01'&&spec.id==='weighted-source-frozen-assessment-v1','Exact weighted namespace required');
 need(equal(spec.selectedTargetFrames,[31,61,96,97,98])&&equal(spec.selectedControlFrames,[31,61]),'Fixed target/control phases required');
 need(settings.id==='tinderbox-mantaflow-weighted-source'&&settings.proposalCommit==='fe109488fd23b3d8481e93c6f88414b829d4e6a9','Exact reviewed weighted recipe required');
 need(Object.keys(spec.sourcePins).length===10&&spec.sourceSnapshots?.length===10&&equal(manifest.sourcePins,spec.sourcePins)&&equal(prepared.sourcePins,spec.sourcePins),'Exact ten-source map required');
 need(spec.settings.sha256===spec.sourcePins['settings.json'],'Settings/source pin linkage mismatch');
 const names=spec.sourceSnapshots.map(r=>r.path.split('/').at(-1));need(new Set(names).size===10&&names.every((name,i)=>spec.sourceSnapshots[i].sha256===spec.sourcePins[name]),'Snapshot/source mapping mismatch');
 need(prepared.observedValid===true&&prepared.actualStateComparison?.passed===true&&prepared.controlV5Comparison?.passed===true&&prepared.controlV5Comparison.state?.passed===true&&prepared.evaluatedCurve?.length===193,'Actual original/fullV5 preparation evidence required');
 need(manifest.sourceBlendSha256===spec.scene.sha256&&prepared.preparedBlendSha256===spec.scene.sha256,'Pinned weighted scene/report mismatch');
 need(manifest.id===settings.id&&manifest.status==='raw-export-failed-preserved'&&validation.rawGatesPassed===false,'Raw failure cannot be admitted or replaced');
 const p=settings.emissionWeights;need(p?.id==='unequal-resolved-surface-feed-v1'&&p.objectName===object&&p.groupName===group&&p.groupIndex===0&&p.vertexCount===25&&equal(p.deliberateZeroIndices,[]),'Exact one-profile identity required');
 need(equal(p.vertexWeights,WEIGHTS.map((weight,vertex)=>({vertex,weight})))&&p.triangleIndexMap?.length===23,'Frozen25 index/weight profile required');
 const before=prepared.baselineActualState;need(before.sourceSettings?.density_vertex_group===''&&before.sourceVertexGroups?.objectName===object&&equal(before.sourceVertexGroups.groups,[]),'Observed blank original premise required');
 const blank=before.sourceVertexGroups;need(Number.isInteger(blank.vertexCount)&&blank.vertexCount>0&&blank.vertices?.length===blank.vertexCount&&blank.vertices.every((r,i)=>r.vertex===i&&equal(r.memberships,[])),'Original complete blank membership witness required');
 const state=prepared.preparedActualState;groupRecord(state.sourceVertexGroups);for(const [k,v]of Object.entries(flags))need(state.sourceSettings[k]===v,'Prepared flow flag mismatch:'+k);
 need(state.domainSettings.burning_rate===.375&&state.domainSettings.vorticity===.25&&state.domainSettings.flame_vorticity===.5,'Observed rate/vorticity changed');
 const gate=prepared.weightSourceGate;need(gate?.kind==='strict-weighted-source-preparation-witness-v1'&&gate.passed===true&&gate.profileSha256===PROFILE&&spec.expectedProfileSha256===PROFILE&&equal(gate.frames,frames)&&gate.vertexCount===25&&gate.originalAndEvaluated===true&&gate.float32BitMatched===true&&gate.cppOneBasedGroupIndexExpected===1&&gate.effectiveInputGridProof===false,'Required nonvolatile weight gate missing');
 need(equal(Object.keys(prepared.weightReadbacks).sort(),frames.map(String).sort()),'All four static/evaluated observations required');for(const frame of frames)observation(prepared.weightReadbacks[String(frame)],prepared,frame);
 const isolation=prepared.curveIsolation;need(equal(isolation.originalModifierFlags,isolation.restoredBeforeStateComparisonAndSave)&&isolation.domainModifierDisabledDuringSourceOnlyEvaluation===true&&isolation.fluidBakeOperatorCalled===false,'Outer curve isolation/restoration mismatch');
 need(reloaded?.kind==='weighted-source-prebake-observation-v1'&&reloaded.passed===true&&reloaded.gate?.passed===true&&reloaded.gate.profileSha256===PROFILE&&reloaded.gate.freshOriginalAndEvaluated===true&&reloaded.gate.effectiveInputGridProof===false,'Saved/reloaded weight proof required');observation(reloaded.observation,prepared,1);
 for(const which of ['original','evaluated']){const proof=reloaded.gate.proof[which];need(equal(proof.observedFloat32Bits,targetBits)&&proof.positiveMemberships===25&&equal(proof.documentedAbsentZeroMemberships,[]),'Reloaded proof bits/memberships mismatch');}
 need(reloadedState?.passed===true&&equal(reloadedState.differences,[])&&equal(reloadedState.errors,[]),'Saved/reloaded full-state comparison failed');
 return{profileSha256:PROFILE,originalAndEvaluatedMemberships:200,reloadedMemberships:50,frames,observationsReconciled:true,effectiveInputGridProof:false};
}
export function validateUnweightedControl(spec,oldManifest,oldValidation,oldPrepare,oldSettings,oldReport,prepared,settings){
 need(spec.controlManifest?.bytes===CONTROL.bytes&&spec.controlManifest.sha256===CONTROL.sha256&&spec.controlStage==='artifacts/qa/fire-realism/mantaflow-half-rate-source/half-rate-20261031-01','Only the unweighted.375 control is supported');
 need(equal(oldManifest.sourcePins,spec.controlSourcePins)&&Object.keys(spec.controlSourcePins).length===9&&equal(oldPrepare.sourcePins,spec.controlSourcePins),'Unweighted source map mismatch');
 need(oldSettings.id==='tinderbox-mantaflow-half-rate-source'&&oldPrepare.observedValid===true&&oldPrepare.controlV5Comparison?.passed===true&&oldPrepare.preparedActualState.domainSettings.burning_rate===.375,'Actual unweighted.375 preparation required');
 need(oldManifest.sourceBlendSha256===spec.controlScene.sha256&&oldPrepare.preparedBlendSha256===spec.controlScene.sha256,'Control scene/report identity mismatch');
 need(oldPrepare.preparedActualState.domainSettings.vorticity===.25&&oldPrepare.preparedActualState.domainSettings.flame_vorticity===.5,'Control observed vorticity changed');
 need(oldPrepare.preparedActualState.sourceSettings.density_vertex_group===''&&!oldSettings.emissionWeights,'Selected baseline must be unweighted');
 need(equal(oldManifest.burningRateCounterfactual,{property:'burning_rate',baseline:.75,target:.375})&&oldManifest.status==='raw-export-failed-preserved'&&oldValidation.rawGatesPassed===false&&equal(oldManifest.terminalValidation,oldValidation),'Frozen control qualification changed');
 for(const key of ['source','simulation','counterfactual','original','controlV5','limits','tool'])need(equal(oldSettings[key],settings[key]),'Unweighted/weighted recipe mismatch:'+key);
 need(equal(oldPrepare.evaluatedCurve,prepared.evaluatedCurve)&&equal(oldPrepare.activeOriginalBOTH,prepared.activeOriginalBOTH)&&equal(oldPrepare.sourceGeometryRequested,prepared.sourceGeometryRequested)&&equal(oldPrepare.preparedActualState.sourceMesh,prepared.preparedActualState.sourceMesh)&&equal(oldPrepare.preparedActualState.sourceWorld,prepared.preparedActualState.sourceWorld),'Like-age input/mesh/world comparison required');
 need(oldReport.status==='complete-bytes-reconciled-raw-gates-still-failed'&&oldReport.rawGatesPassed===false&&oldReport.admitted===false&&oldReport.inputs.some(r=>equal(r,spec.controlManifest)),'Pinned exercised control assessment required');
 const metric=oldReport.sources.find(r=>r.name==='metrics.mjs');need(metric?.bytes===spec.metricDefinition.bytes&&metric.sha256===spec.metricDefinition.sha256,'Control metric definitions differ');
 need(spec.controlSelectedFields?.length===2,'Exactly two control reads required');
 for(let i=0;i<2;i++){const fixed=CONTROL_FIELDS[i],r=spec.controlSelectedFields[i],s=oldManifest.samples[fixed.frame-1];need(r.frame===fixed.frame&&r.ageSeconds===fixed.ageSeconds&&s.frame===fixed.frame&&s.ageSeconds===fixed.ageSeconds&&equal(r.input,s.channels.flame)&&r.input.bytes===884736&&r.input.sha256===fixed.sha256,'Only fixed F31/F61 baseline buffers are allowed');}
 return{burningRate:.375,selectedFrames:[31,61],freshControlReads:2,oldTerminalSource:'Preserved8da43a63 JSON metadata only; no oldF96/97/98 read',doseEquivalent:false};
}
