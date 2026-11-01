"""Pure limits/permit/envelope/terminal policy; never starts authoring."""
import math,re,json,hashlib
from pathlib import Path
from copy import deepcopy
OWNER='01a17e9b-a6db-7490-94cd-7d863747e5d3'
PROPOSAL='62487a9255b4b06e04ba7844615ff4162f7f2aff'
EDITOR_SELECTION_AMENDMENT='2b6991fc40079fa7801b7f273f1e1067fe3a0867'
FLAT_FACE_AMENDMENT='25af559873dd15bb0a0fbc0c93f77c61f38a10f3'
SCIENTIFIC_PROPOSAL='f915375c4f8df71dbb1a9e1f932406e7e10a32b6'
REALIZATION_AMENDMENT='7f74a68eaeee13ee84509b4792e8a14b48891f43'
CORE_FILES=('author.py','grid.py','policy.py','state.py','surface.py','supervisor.py','winjob.py','settings.json','helper-provenance.json','weights.py','authoring.py','clipping.py','realization.py','source.py','prediction.py','source-plan.json')

V5_SETTINGS_CANONICAL_SHA='b54ecd2b9c3d769c303ffd1ebc8c4ba0566cd379357917bfce123c152eb07280'
V5_CONTROLS={'prepareReport': {'path': 'artifacts/qa/fire-realism/mantaflow-surface-source/stage-2026-10-31-v5/prepare.json', 'bytes': 107511, 'sha256': 'b8c902c637447ccada9377b30dedfe2711b1c578a4613b0731cc9767c3bf86df'}, 'preparedScene': {'path': 'artifacts/qa/fire-realism/mantaflow-surface-source/stage-2026-10-31-v5/surface-source.blend', 'bytes': 472919, 'sha256': '86fd4f8f5e5c00857fa9f812b78a311c26b20318c06fcc58518890f7bec43da6'}, 'rawManifest': {'path': 'artifacts/qa/fire-realism/mantaflow-surface-source/stage-2026-10-31-v5/raw-manifest.json', 'bytes': 4626878, 'sha256': 'dc257c0200ea12dcea9c48fdf711cb33e6de62ab989732c731cdd7099f16a4ce'}}
V5_VOLATILE=('domain_resolution','cell_size','has_cache_baked_data','cache_frame_pause_data')

def validate_settings(s):
    from source import validate_settings as validate_recipe
    validate_recipe(s)
    if s['proposalCommit']!=SCIENTIFIC_PROPOSAL:raise ValueError('Scientific recipe authority changed')

def source_envelope(age,sim):
    if not math.isfinite(age)or age<0:raise ValueError('Finite nonnegative source age required')
    if age<=0 or age>=sim['inflowOffAge']:return 0.0
    if age<=sim['withdrawalStart']:return 1.0
    x=(age-sim['withdrawalStart'])/(sim['inflowOffAge']-sim['withdrawalStart'])
    return 1-x*x*(3-2*x)

def expected_inputs(frame,s,active):
    age=(frame-1)/30;gain=source_envelope(age,s['simulation'])
    return {'age':age,'use_inflow':0<age<s['simulation']['inflowOffAge'],'fuel_amount':active['fuel_amount']*gain,'density':active['density']*gain,'temperature':active['temperature']*gain}

def new_deadline(start_epoch,start_tick_ms):
    if not all(math.isfinite(v)and v>=0 for v in [start_epoch,start_tick_ms]):raise ValueError('Invalid actual start clocks')
    return {'startEpoch':start_epoch,'startTickMs':start_tick_ms,'deadlineEpoch':start_epoch+900,'deadlineTickMs':start_tick_ms+900000}

def remaining_seconds(run,now_epoch,now_tick_ms):
    if run['deadlineEpoch']-run['startEpoch']!=900 or run['deadlineTickMs']-run['startTickMs']!=900000:raise ValueError('Deadline extension/reset rejected')
    if now_tick_ms<run['startTickMs']:raise ValueError('Windows uptime rewound; no resumed run')
    return min(run['deadlineEpoch']-now_epoch,(run['deadlineTickMs']-now_tick_ms)/1000)

def validate_permit(p,phase,output,pins,candidate,now_epoch,run=None,run_sha=None):
    common={'version','kind','phase','owner','proposalCommit','candidateCommit','output','sourcePins','toolExeSha256','originalBlendSha256','authorizationPaths','issuedAtEpoch','notAfterEpoch','nonce'}
    extra={'runRecordSha256','preparedBlendSha256','prepareReportSha256','deadlineEpoch','deadlineTickMs'}if phase=='bake'else set()
    if set(p)!=common|extra or p['version']!=1 or p['kind']!='tinderbox-corridor-source-authorization-v1':raise ValueError('Explicit exact phase permit required')
    if p['phase']!=phase or p['owner']!=OWNER or p['proposalCommit']!=PROPOSAL or p['candidateCommit']!=candidate or p['sourcePins']!=pins or p['output']!=output:raise ValueError('Phase/source/owner/output permit mismatch')
    if not re.fullmatch('[A-Za-z0-9_-]{8,128}',p['nonce']) or not all(math.isfinite(p[k])for k in ['issuedAtEpoch','notAfterEpoch'])or p['issuedAtEpoch']>now_epoch or p['issuedAtEpoch']>=p['notAfterEpoch']or now_epoch>=p['notAfterEpoch']:raise ValueError('Expired/malformed phase permit')
    if phase=='bake':
        if not run or run.get('state')!='awaiting-separate-bake-permit' or run.get('bakeClaimed') or p['runRecordSha256']!=run_sha:raise ValueError('Prepared exact run receipt required; no retry')
        for key in ['deadlineEpoch','deadlineTickMs']:
            if p[key]!=run[key]:raise ValueError('Baking may not reset the preparation deadline')
        if p['issuedAtEpoch']<run['preparedEpoch']or p['nonce']==run['prepareNonce']:raise ValueError('Preissued/stale bake permit rejected')
        if p['notAfterEpoch']>run['deadlineEpoch']or p['preparedBlendSha256']!=run['preparedBlendSha256']or p['prepareReportSha256']!=run['prepareReportSha256']:raise ValueError('Prepared data/deadline permit mismatch')

def terminal_report(samples,s):
    if len(samples)!=193 or any(r['frame']!=i+1 or r['age']!=i/30 for i,r in enumerate(samples)):raise ValueError('Require every actual finite sample')
    peak_i=max(samples,key=lambda r:r['integral']);peak_m=max(samples,key=lambda r:r['max']);positive=[r for r in samples if r['positive']>0]
    reasons=[];sentinel=samples[90]
    for r in samples:
        if r['age']>=3.2 and r['nonzero']!=0:reasons.append('raw flame not exactly zero at/after3.2 frame'+str(r['frame']))
        if 2.8<=r['age']<=3.0 and r['positive']==0:reasons.append('early cold gap in final persistence frame'+str(r['frame']))
        if r.get('belowGroundPositive',0)or r.get('boundaryPositive',0):reasons.append('raw below-ground/domain-boundary reaction frame'+str(r['frame']))
        if r['min']<0:reasons.append('negative flame proxy frame'+str(r['frame']))
    if sentinel['max']<.05:reasons.append('age3.0 flame maximum below.05 author sentinel')
    if peak_i['integral']<=0 or sentinel['integral']<.01*peak_i['integral']:reasons.append('age3.0 integral below1%candidatepeak author sentinel')
    return {'rawGatesPassed':not reasons,'failures':reasons,'peakMaximum':{'value':peak_m['max'],'age':peak_m['age']},'peakIntegral':{'value':peak_i['integral'],'age':peak_i['age']},'lastPositiveAge':positive[-1]['age']if positive else None,'requiredSamples':[deepcopy(samples[f-1])for f in [91,96,97,98]],'finalApproach':[deepcopy(r)for r in samples if 2.8<=r['age']<=97/30], 'nativePhase180':'PENDING real All visibility/age and smoothfinal.2s review; raw sentinels are not acceptance','scope':'Exact raw data gates only; no threshold/crop/fade or GPU quality proof'}


def check_bake_permit_presence(exists,state,bake_claimed):
    if exists and not bake_claimed and state!='awaiting-separate-bake-permit':raise ValueError('Preissued bake authorization rejected')

def registration_reserve(spec,identity,sizes,utility_root):
    # Pinned cleanup.py copies each source once, then writes restart+registry
    # metadata atomically. Reserve BEFORE launch; no registry scan/UUID guess.
    if len(sizes)!=len(spec['sourceFiles'])or any(not isinstance(n,int)or n<0 or n>10*1024*1024 for n in sizes):raise ValueError('Unbounded registration source inputs')
    fake_id='0'*32;root=Path(utility_root)/'restart-records'/fake_id/'registration'
    process={'pid':identity['pid'],'creationFiletime':identity['creationFileTime'],'executable':identity['executable']}
    files=[{'original':name,'saved':str(root/(str(i)+'-'+Path(name).name)),'sha256':'0'*64}for i,name in enumerate(spec['sourceFiles'])]
    restart={'restart':spec['restart'],'owners':spec['owners'],'purpose':spec['purpose'],'process':process,'files':files,'automaticRestart':False}
    entry={**spec,'id':fake_id,'process':process,'registeredAt':'Z'*64,'status':'running','restartRecord':str(root/'restart.json')}
    metadata=sum(len(json.dumps(value,indent=2).encode())+1 for value in [restart,entry])
    return {'sourceCopyBytes':sum(sizes),'metadataUpperModelBytes':metadata,'reservedBytes':sum(sizes)+2*metadata+4096,'sharedMetadataReserveBytes':4096,'basis':'One controlled-source copy plus double atomic-metadata allowance and4KiB shared-overhead reserve; exact pinned utility required. Unknown failed paths are not claimed or scanned.'}

def unresolved_registration_charge(attempts):
    return sum(a['budget']['sharedMetadataReserveBytes']if a['status']=='resolved'else a['budget']['reservedBytes']for a in attempts)


def unique_json_pairs(pairs):
    result={}
    for key,value in pairs:
        if key in result:raise ValueError('Duplicate authorization JSON key:'+key)
        result[key]=value
    return result



# These additional inputs are immutable references, not another scene/solver.
BASELINE_SETTINGS_REL='workbenches/art/fire-realism/mantaflow-weighted-source/settings.json'
BASELINE_SETTINGS_SHA='c60d9a76c306d04a21fc97733a00d69c45e4e8dd280de6d5c141af518bdd6a40'
WEIGHTED_CONTROL={
 'prepareReport':{'path':'artifacts/qa/fire-realism/mantaflow-weighted-source/weighted-source-20261031-01/prepare.json','bytes':214114,'sha256':'ccdb1e67e8611c138e6763dc6b69744865281b9e77150210c3a095c483da21e3'},
 'preparedScene':{'path':'artifacts/qa/fire-realism/mantaflow-weighted-source/weighted-source-20261031-01/surface-source.blend','bytes':474375,'sha256':'362fe0bd5731a7aaf5043c39f49d15ceb602e67b4acb11a747f8bd42bdb03162'}}


def registration_sources(here,root,tool_record,claim_path):
    rows=[str(Path(here)/name)for name in CORE_FILES]+[str(Path(here)/'README.md'),str(Path(root)/'package.json'),str(Path(root)/'docs/source-baseline.json'),str(Path(tool_record).resolve()),str(Path(claim_path))]
    rows += [str(Path(root)/BASELINE_SETTINGS_REL),str(Path(here)/'README-binding.md')]
    if len(rows)!=23 or len({str(Path(v)).casefold()for v in rows})!=23:raise ValueError('Exact23distinct official source paths required')
    return rows


def extra_inputs():
    return {'baselineWeightedSettings':{'path':BASELINE_SETTINGS_REL,'bytes':9676,'sha256':BASELINE_SETTINGS_SHA},
            **{'weighted'+k[0].upper()+k[1:]:v for k,v in WEIGHTED_CONTROL.items()}}


def checked_input(root,record):
    path=Path(root)/record['path'];raw=path.read_bytes()
    if len(raw)!=record['bytes']or hashlib.sha256(raw).hexdigest()!=record['sha256']:raise ValueError('Pinned binding input changed:'+record['path'])
    return raw


def load_weighted_control(root):
    c=json.loads(checked_input(root,WEIGHTED_CONTROL['prepareReport']),object_pairs_hook=unique_json_pairs)
    if c.get('observedValid')is not True or not c['actualStateComparison']['passed']or not c['controlV5Comparison']['passed']or not c['weightSourceGate']['passed']or c['preparedBlendSha256']!=WEIGHTED_CONTROL['preparedScene']['sha256']:raise ValueError('Frozen weighted preparation control invalid')
    return c


def check_volatile(*states):
    for state in states:
        if set(state.get('volatileCache',{}))!=set(V5_VOLATILE):raise ValueError('Only exact four volatile-cache observations supported')


def expected_model(settings):
    from source import derive_plan,f32
    from realization import IDENTITY,expected_realization
    original=[[f32(x),f32(y),f32(settings['source']['planeZ'])]for x,y in settings['source']['polygon']]
    data={'vertices':original,'polygons':settings['emissionWeights']['triangleIndexMap']}
    if hashlib.sha256(json.dumps(data,separators=(',',':')).encode()).hexdigest()!='20ff4e997b3ab044871268963d3c145834d378ce00a1b5535d5f69ac647c91d5':raise ValueError('Pinned original25primitive model changed')
    plan=derive_plan(settings,original_positions=original);realized=expected_realization(plan,IDENTITY)
    return plan,realized


def expected_mesh_and_groups(settings):
    from source import f32
    plan,realized=expected_model(settings);profile=plan['derivedProfile'];positions=realized['positionsFloat32'];faces=[r['indices']for r in plan['mesh']['faces']]
    payload={'vertices':positions,'polygons':faces}
    mesh={'name':'CorridorSource1893','vertices':len(positions),'polygons':len(faces),'sha256':hashlib.sha256(json.dumps(payload,separators=(',',':')).encode()).hexdigest()}
    group={'objectName':profile['objectName'],'vertexCount':len(positions),'groups':[{'index':0,'name':profile['groupName']}],
           'vertices':[{'vertex':i,'memberships':[{'group':0,'weight':f32(row['weight'])}]}for i,row in enumerate(profile['vertexWeights'])]}
    dimensions=[f32(max(p[k]for p in positions)-min(p[k]for p in positions))for k in range(3)]
    return mesh,group,dimensions


def prepared_delta(settings,fresh_cache):
    mesh,group,dimensions=expected_mesh_and_groups(settings)
    expected={'domainSettings.cache_directory':str(fresh_cache),'sourceObject.data':{'rnaType':'Mesh','name':mesh['name']},'sourceObject.dimensions':dimensions}
    expected.update({'sourceMesh.'+k:v for k,v in mesh.items()});expected.update({'sourceVertexGroups.'+k:v for k,v in group.items()})
    return expected


def compare_original(control,before,fresh_cache):
    from state import compare_actual
    check_volatile(control['baselineActualState'],before)
    return compare_actual(control['baselineActualState'],before,{'domainSettings.cache_directory':str(fresh_cache)})


def compare_prepared(control,after,fresh_cache,settings):
    from state import compare_actual
    check_volatile(control['preparedActualState'],after)
    return compare_actual(control['preparedActualState'],after,prepared_delta(settings,fresh_cache))


def compare_reloaded(prepared,current):
    from state import compare_actual
    check_volatile(prepared,current)
    return compare_actual(prepared,current,{})


def _same(a,b):
    from source import canonical
    return canonical(a)==canonical(b)


def verify_pair(row,settings,prepared_state,frame,expected_attribute_anchor):
    from authoring import verify_observation,verify_attribute_pair
    from realization import IDENTITY
    plan,realized=expected_model(settings)
    if type(row['frame'])is not int or row['frame']!=frame:raise ValueError('Required source readback frame mismatch')
    flags={'density_vertex_group':plan['derivedProfile']['groupName'],'volume_density':0.0,'use_absolute':True,'use_plane_init':True,'surface_distance':.5,'flow_type':'BOTH'}
    if not _same(row['flowFlags'],flags):raise ValueError('Actual source flow/group flags changed')
    for key in ['domainFlagsBefore','domainFlagsDuring','domainFlagsAfter']:
        if len(row[key])!=2 or any(type(v)is not bool for v in row[key]):raise ValueError('Actual isolation flag readbacks required')
    if row['domainFlagsDuring']!=[False,False]or row['domainFlagsBefore']!=row['domainFlagsAfter']:raise ValueError('Source-only isolation/restoration failed')
    gates={key:verify_observation(row[key],plan,realized['positionsFloat32'],IDENTITY)for key in ['original','evaluated']}
    if not _same(row['original'],row['evaluated'])or not _same(row.get('gates'),gates)or row.get('effectiveInputGridProved')is not False:raise ValueError('Original/evaluated realization or reported gate mismatch')
    if not _same(row['attributeAnchor'],expected_attribute_anchor):raise ValueError('Record cannot choose its own installed selection anchor')
    attribute_gate=verify_attribute_pair(row['attributeReadbacks'],plan,row['attributeOrigin'],expected_attribute_anchor)
    if not _same(attribute_gate,row.get('attributeGates')):raise ValueError('Original/evaluated attribute proof corrupt')
    mesh,groups,_=expected_mesh_and_groups(settings)
    if prepared_state['sourceMesh']!=mesh or prepared_state['sourceVertexGroups']!=groups or prepared_state['sourceWorld']!=IDENTITY:raise ValueError('Source witness is not bound to prepared actual state')
    if any(prepared_state['sourceSettings'].get(k)!=v or type(prepared_state['sourceSettings'].get(k))is not type(v)for k,v in flags.items()):raise ValueError('Prepared flow flags differ from actual witness')
    return {'passed':True,'frame':frame,'expectedFloat32RealizationMatched':True,'strictOpenStripPassed':realized['strictOpenStripPassed'],
            'nominalCrossings':realized['nominalCrossingCount'],'maximumNominalPenetrationMetres':realized['maximumNominalPenetrationMetres'],'actualInputGridProof':False,'sourceMeshSha256':mesh['sha256'],'flatFaceAttributeProof':attribute_gate}


def verify_preparation(report,settings,control):
    from source import digest,f32
    from authoring import verify_observation,verify_install_attributes
    from realization import IDENTITY
    from prediction import predict
    if report.get('editorSelectionAmendmentCommit')!=EDITOR_SELECTION_AMENDMENT:raise ValueError('Explicit editor-selection source amendment required')
    if report.get('flatFaceAmendmentCommit')!=FLAT_FACE_AMENDMENT:raise ValueError('Explicit flat-face source amendment required')
    validate_settings(settings);plan,realized=expected_model(settings);cache=report['cacheRedirectBeforeEvaluation']['newObserved']
    before=compare_original(control,report['baselineActualState'],cache);after=compare_prepared(control,report['preparedActualState'],cache,settings)
    combined={'passed':before['passed']and after['passed'],'openedOriginal':before,'preparedAgainstWeighted':after}
    if not combined['passed']or report['actualStateComparison']!=combined or report['weightedControlComparison']!=after:raise ValueError('Full original/prepared weighted-control state comparison failed')
    active={'fuel_amount':1.0,'density':1.0,'temperature':2.0}
    if not _same(report['activeOriginalBOTH'],active)or not _same(control['activeOriginalBOTH'],active):raise ValueError('Actual active BOTH inputs changed')
    wanted=[]
    for frame in range(1,194):
        values=expected_inputs(frame,settings,active);wanted.append({'frame':frame,'age':values['age'],**{k:values[k]if k=='use_inflow'else f32(values[k])for k in ['use_inflow','fuel_amount','density','temperature']}})
    if not _same(report['evaluatedCurve'],wanted)or not _same(control['evaluatedCurve'],wanted):raise ValueError('Complete193-row actual/control/expected curve mismatch')
    installed=report['corridorInstall']
    if not _same(installed['plan'],plan)or not _same(installed['expectedRealization'],realized):raise ValueError('Installed nominal/realization plan differs from independent model')
    gate=verify_observation(installed['observation'],plan,installed['expectedLocalFloat32'],installed['originalWorld'])
    if not _same(gate,installed['geometryAndGroupGate'])or installed['effectiveInputGridProved']is not False:raise ValueError('Installed source gate mismatch')
    attribute_gate=verify_install_attributes(installed,plan)
    if not _same(attribute_gate,installed.get('attributeGate')):raise ValueError('Installed attribute proof corrupt')
    descriptor={'mesh':report['preparedActualState']['sourceMesh'],'planSha256':digest(plan),'observation':installed['observation']}
    if not _same(report['actualClippedEmitter'],descriptor):raise ValueError('Actual clipped-emitter descriptor mismatch')
    rows=report['sourceReadbacks']
    if set(rows)!=set(map(str,[1,2,91,193])):raise ValueError('Exactly four source frame observations required')
    if any(not _same(row['attributeOrigin'],installed['attributePreflight']['observation'])for row in rows.values()):raise ValueError('Readback historical attribute origin differs from install')
    proofs=[verify_pair(rows[str(frame)],settings,report['preparedActualState'],frame,installed['attributeInstalled']['observation'])for frame in [1,2,91,193]]
    prediction=predict(rows['1']['original'],plan,control['geometricKernelPrediction']['grid'],settings,active)
    if not prediction['passed']or prediction['actualInputGridProof']is not False or not _same(prediction,report['kernelPrediction']):raise ValueError('Labelled source kernel prediction invalid; not actual input-E')
    if report.get('actualInputGridProof')is not False:raise ValueError('Actual input-E is not exposed by this route')
    return {'kind':'corridor-source-preparation-witness-v1','passed':True,'frames':[1,2,91,193],'curveRows':193,'planSha256':digest(plan),
            'sourceMeshSha256':proofs[0]['sourceMeshSha256'],'expectedFloat32RealizationMatched':True,'strictOpenStripPassed':realized['strictOpenStripPassed'],
            'nominalCrossings':realized['nominalCrossingCount'],'actualMeshGroupRnaCurvesObserved':True,'kernelIsSourcePrediction':True,'flatFaceAttributesPreserved':True,'flatFaceAmendmentCommit':FLAT_FACE_AMENDMENT,'editorSelectionAmendmentCommit':EDITOR_SELECTION_AMENDMENT,'actualInputGridProof':False}


def verify_bake_witness(record,settings,prepared_state,expected_attribute_anchor):
    if record.get('kind')!='corridor-source-prebake-observation-v1':raise ValueError('Fresh saved/reloaded source witness required')
    proof=verify_pair(record['observation'],settings,prepared_state,1,expected_attribute_anchor)
    return {'passed':True,'freshFrame1Only':True,'rechecked193RowsAfterReload':False,'proof':proof,'actualInputGridProof':False}
