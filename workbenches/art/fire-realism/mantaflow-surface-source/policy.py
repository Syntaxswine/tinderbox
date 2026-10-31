"""Pure limits/permit/envelope/terminal policy; never starts authoring."""
import math,re,json
from pathlib import Path
from copy import deepcopy
OWNER='01a17e9b-a6db-7490-94cd-7d863747e5d3'
PROPOSAL='b1f88905622c08840f4e0b20a4528a7e7fdf3736'
CORE_FILES=('author.py','grid.py','policy.py','state.py','surface.py','supervisor.py','winjob.py','settings.json','helper-provenance.json')

def validate_settings(s):
    lim=s['limits'];sim=s['simulation'];src=s['source']
    if s['owner']!=OWNER or s['proposalCommit']!=PROPOSAL:raise ValueError('Unexpected owner/proposal')
    expected=(900,2*1024**3,2*1024**3,2*1024**3,4,0,0,0)
    if tuple(lim[k]for k in ['wallSeconds','processCommittedBytes','aggregateCommittedBytes','scratchBytes','threads','automaticRepairs','automaticRetries','automaticRebakes'])!=expected:raise ValueError('Reviewed limits changed')
    if (sim['firstFrame'],sim['lastFrame'],sim['fps'],sim['burnSeconds'],sim['withdrawalStart'],sim['inflowOffAge'])!=(1,193,30,3.2,2.6,3.0):raise ValueError('Reviewed clocks changed')
    if (src['planeZ'],src['surfaceDistanceVoxels'],src['volumeDensity'],src['planar'],sim['globalVorticity'])!=(.02,.5,0,True,.25):raise ValueError('Reviewed source settings changed')
    if sim['expectedResolution']!=[48,48,96] or sim['expectedDimensions']!=[2,2,4] or sim['cacheDepth']!='32' or sim['cacheFormat']!='OPENVDB':raise ValueError('Original grid/cache contract changed')

def source_envelope(age,sim):
    if not math.isfinite(age)or age<0:raise ValueError('Finite nonnegative source age required')
    if age<=0 or age>=sim['inflowOffAge']:return 0.0
    if age<=sim['withdrawalStart']:return 1.0
    x=(age-sim['withdrawalStart'])/(sim['inflowOffAge']-sim['withdrawalStart'])
    return 1-x*x*(3-2*x)

def expected_inputs(frame,s,active):
    age=(frame-1)/30;gain=source_envelope(age,s['simulation'])
    return {'age':age,'use_inflow':0<age<3.0,'fuel_amount':active['fuel_amount']*gain,'density':active['density']*gain,'temperature':active['temperature']*gain}

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
    if set(p)!=common|extra or p['version']!=1 or p['kind']!='tinderbox-surface-source-authorization-v1':raise ValueError('Explicit exact phase permit required')
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
