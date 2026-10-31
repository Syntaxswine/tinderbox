"""One hidden registered self-Job; no run without two distinct explicit permits.
Implementation-only delivery: do NOT invoke before architect reviews exact pins.
Prepare exits; controller reports its bounded wait, never claims itself retired.
"""
import argparse,ctypes,hashlib,json,math,os,re,shutil,subprocess,sys,time,traceback
from pathlib import Path
from datetime import datetime,timezone
sys.dont_write_bytecode=True
from policy import OWNER,CORE_FILES,validate_settings,validate_permit,new_deadline,remaining_seconds,check_bake_permit_presence,registration_reserve,unresolved_registration_charge,unique_json_pairs
from winjob import OwnedJob,HANDLE,SamplingBudgetError
HERE=Path(__file__).resolve().parent;ROOT=HERE.parents[3];QA=ROOT/'artifacts/qa/fire-realism/mantaflow-surface-source';CLEANUP=Path('C:/Users/baals/Local Storage/AI/GTP/helper-lifecycle/cleanup.py');AUTH_ROOT=Path('C:/Users/baals/Documents/ChatGPT/tinderbox/artifacts/qa/fire-realism/surface-source-authorizations')

def sha(path):
    h=hashlib.sha256()
    with Path(path).open('rb')as f:
        for block in iter(lambda:f.read(1024*1024),b''):h.update(block)
    return h.hexdigest()
def save(path,value):
    path=Path(path);temp=path.with_name(path.name+'.writing');
    with temp.open('w',encoding='utf-8',newline='\n')as f:json.dump(value,f,indent=2);f.write('\n');f.flush();os.fsync(f.fileno())
    os.replace(temp,path)
def once(path,value):
    with Path(path).open('x',encoding='utf-8',newline='\n')as f:json.dump(value,f,indent=2);f.write('\n');f.flush();os.fsync(f.fileno())
def create_owned_claim(path,value):
    # Exclusive creation must succeed before any ownership record is retained.
    # FileExistsError never adopts, rewrites or removes a prior run's claim.
    path=Path(path).absolute();once(path,value)
    return {'path':str(path),'bytes':path.stat().st_size,'sha256':sha(path)}

def owned_claim_bytes(claim):
    if claim is None:return 0
    path=Path(claim['path']);st=path.lstat()
    if path.is_symlink()or getattr(st,'st_file_attributes',0)&0x400:raise RuntimeError('Owned claim became a reparse point')
    if st.st_size!=claim['bytes']or sha(path)!=claim['sha256']:raise RuntimeError('Owned claim changed; preserve and stop')
    return st.st_size

def join_and_record_limits(job,out,run):
    """Persist raw numeric readback (or explicit unknown/failure) before commands."""
    path=Path(out)/'job-limit-readback.json'
    receipt={'version':1,'valid':False,'actual':None,'controllerIdentity':job.me,'sourcePins':run['sourcePins'],'candidateCommit':run['candidateCommit'],'deadlineEpoch':run['deadlineEpoch'],'deadlineTickMs':run['deadlineTickMs'],'expected':{'processLimitBytes':job.process_limit,'aggregateLimitBytes':job.aggregate_limit,'requiredFlags':0x2300}}
    try:receipt['actual']=job.join_self();receipt['valid']=True
    except BaseException as exc:receipt['error']=str(exc);raise
    finally:
        receipt['queryReadback']=job.limit_readback
        if receipt['actual']is None:receipt['actual']=job.limit_readback.get('actual')
        save(path,receipt);run['jobLimitReadback']={'path':str(path),'sha256':sha(path),'valid':receipt['valid']};save(Path(out)/'run.json',run)
    return receipt

def remaining_sampling_wait_ms(job,out,run):
    # Nonrecursive: no sampling/full guard, no deadline mutation or wait loop.
    remaining=remaining_seconds(run,time.time(),job.tick_ms())*1000
    if(Path(out)/'supervisor.stop').exists():raise SamplingBudgetError('Private graceful STOP requested before/after sampling wait',remaining)
    if remaining<=0:raise SamplingBudgetError('Shared UTC/uptime deadline expired before/after sampling wait',remaining)
    return remaining

def sample_and_record(job,out,run):
    # The finally receipt also preserves a fatal member diagnostic when sample()
    # raises before returning; the prepared run record remains stable while waiting.
    try:return job.sample(lambda:remaining_sampling_wait_ms(job,out,run))
    finally:save(Path(out)/'job-sampling-diagnostics.json',{'controllerIdentity':job.me,'candidateCommit':run['candidateCommit'],'sourcePins':run['sourcePins'],'deadlineEpoch':run['deadlineEpoch'],'deadlineTickMs':run['deadlineTickMs'],'sampling':job.sampling_report()})

def utc(epoch):return datetime.fromtimestamp(epoch,timezone.utc).isoformat().replace('+00:00','Z')
def safe_tree_bytes(folder):
    total=0
    for base,dirs,files in os.walk(folder,followlinks=False):
        for name in dirs+files:
            p=Path(base)/name;st=p.lstat()
            if p.is_symlink()or getattr(st,'st_file_attributes',0)&0x400:raise RuntimeError('Scratch contains reparse point; refuse uncertain accounting')
        total+=sum((Path(base)/name).stat().st_size for name in files)
    return total

def read_atomic_json(path):
    p=Path(path);a=p.stat();raw=p.read_bytes();b=p.stat()
    if(a.st_size,a.st_mtime_ns)!=(b.st_size,b.st_mtime_ns)or len(raw)!=a.st_size:raise RuntimeError('Permit changed while reading; no hot retry')
    return json.loads(raw,object_pairs_hook=unique_json_pairs),hashlib.sha256(raw).hexdigest(),b

class Controller:
    def __init__(self,args):
        self.a=args;self.s=json.loads((HERE/'settings.json').read_text());validate_settings(self.s);self.out=Path(args.output).resolve();self.job=None;self.child=None;self.streams=[];self.run=None;self.registration_roots=[];self.registry_entries=[];self.registration_attempts=[];self.ephemeral=[];self.peaks={'sumPrivateBytes':0,'jobCommittedBytes':0,'scratchBytes':0};self.phase='starting';self.closed=False;self.owns_output=False;self.owned_claim=None;self.base_env=os.environ.copy()
        if not self.out.is_relative_to(QA.resolve())or self.out==QA.resolve():raise RuntimeError('Output escaped assigned scratch')
        if any(p.exists()and(p.is_symlink()or getattr(p.stat(),'st_file_attributes',0)&0x400)for p in [QA,*self.out.parents]if p.is_relative_to(ROOT)):raise RuntimeError('Scratch ancestor is a reparse point')
        self.pins={name:sha(HERE/name)for name in CORE_FILES};self.permit,self.permit_sha,_=read_atomic_json(args.prepare_permit)
        self.candidate=self.permit.get('candidateCommit','')
        if not re.fullmatch('[0-9a-f]{40}',self.candidate):raise RuntimeError('Exact reviewed candidate commit required')
        validate_permit(self.permit,'prepare',str(self.out),self.pins,self.candidate,time.time())
        if self.permit['toolExeSha256']!=self.s['tool']['exeSha256']or self.permit['originalBlendSha256']!=self.s['original']['blendSha256']:raise RuntimeError('Permit tool/original scene identity mismatch')
        if self.out.exists():raise RuntimeError('A fresh output is required; no phase/controller restart')
        self.auth_paths={'prepare':str(Path(args.prepare_permit).resolve()),'bake':str(Path(args.bake_permit).resolve())}
        auth_parent=Path(self.auth_paths['prepare']).parent
        if auth_parent==AUTH_ROOT.resolve()or not auth_parent.is_relative_to(AUTH_ROOT.resolve())or Path(self.auth_paths['bake']).parent!=auth_parent or Path(self.auth_paths['prepare']).name!='prepare.json'or Path(self.auth_paths['bake']).name!='bake.json':raise RuntimeError('Explicit architect-owned sibling permit paths required')
        if self.permit['authorizationPaths']!=self.auth_paths:raise RuntimeError('Permit path pair is not bound to explicit command inputs')
        self.bake_permit_path=Path(self.auth_paths['bake'])
        if self.bake_permit_path.exists():raise RuntimeError('Preissued bake permit rejected before initialization')
    def initialize(self):
        QA.mkdir(parents=True,exist_ok=True);self.out.mkdir();self.owns_output=True
        temp=self.out/'temp';temp.mkdir();self.base_env.update({'TEMP':str(temp),'TMP':str(temp),'PYTHONDONTWRITEBYTECODE':'1'})
        # Write-once per reviewed commit: another output cannot reset this run.
        self.owned_claim=create_owned_claim(QA/('one-run-'+self.candidate+'.claim.json'),{'owner':OWNER,'output':str(self.out),'preparePermitSha256':self.permit_sha,'nonce':self.permit['nonce']})
        self.job=OwnedJob(self.s['limits']['processCommittedBytes'],self.s['limits']['aggregateCommittedBytes'])
        now=time.time();start=(self.job.me['creationFileTime']-116444736000000000)/10000000;tick=self.job.tick_ms()-max(0,now-start)*1000
        self.run={'version':1,'owner':OWNER,'candidateCommit':self.candidate,'proposalCommit':self.s['proposalCommit'],'sourcePins':self.pins,**new_deadline(start,tick),'state':'validating-controller','prepareNonce':self.permit['nonce'],'preparePermitSha256':self.permit_sha,'authorizationPaths':self.auth_paths,'bakeClaimed':False,'rawExportComplete':False,'validForIntegration':False,'registrationRoots':[],'supervisorIdentity':self.job.me,'oneRunClaim':self.owned_claim}
        save(self.out/'run.json',self.run);save(self.out/'controller.json',{'state':self.phase,'identity':self.job.me,'run':self.run,'childrenVerifiedExited':False,'controllerExitPending':True})
        source_copy=self.out/'source-snapshot';source_copy.mkdir()
        for name in CORE_FILES:shutil.copyfile(HERE/name,source_copy/name)
        once(self.out/'prepare-authorization.used.json',{'permit':self.permit,'sha256':self.permit_sha,'consumedAtEpoch':time.time()})
        # No subprocess, even Git/registration, is started before self joins.
        join_and_record_limits(self.job,self.out,self.run);self.guard()
    def persist(self,state=None):
        if state:self.phase=state
        save(self.out/'controller.json',{'state':self.phase,'identity':self.job.me,'deadlineEpoch':self.run['deadlineEpoch'],'deadlineTickMs':self.run['deadlineTickMs'],'peaks':self.peaks,'oneRunClaim':self.owned_claim,'ephemeralCommands':self.ephemeral,'childrenVerifiedExited':self.child is None or self.child.poll()is not None,'controllerExitPending':True,'allHelpersRetired':False})
    def guard(self):
        if remaining_seconds(self.run,time.time(),self.job.tick_ms())<=0:raise RuntimeError('Shared 900-second UTC/uptime authoring deadline')
        if(self.out/'supervisor.stop').exists():raise RuntimeError('Private graceful STOP requested')
        check_bake_permit_presence(self.bake_permit_path.exists(),self.run['state'],self.run.get('bakeClaimed',False))
        sample=sample_and_record(self.job,self.out,self.run);self.peaks['sumPrivateBytes']=max(self.peaks['sumPrivateBytes'],sample['sumPrivateBytes']);self.peaks['jobCommittedBytes']=max(self.peaks['jobCommittedBytes'],sample['job']['peakJobCommittedBytes'])
        if sample['sumPrivateBytes']>=self.s['limits']['aggregateCommittedBytes']or any(m['privateBytes']>=self.s['limits']['processCommittedBytes']for m in sample['members']):raise RuntimeError('Per-process/aggregate private committed-memory guard')
        scratch=owned_claim_bytes(self.owned_claim)+safe_tree_bytes(self.out)+sum(safe_tree_bytes(Path(p))for p in self.registration_roots)+safe_tree_bytes(Path(self.auth_paths['prepare']).parent)
        # Own serialized registry metadata is additionally charged; shared registry
        # unrelated entries are not treated as this task's scratch.
        scratch+=sum(Path(p).stat().st_size for p in self.registry_entries)+unresolved_registration_charge(self.registration_attempts);self.peaks['scratchBytes']=max(self.peaks['scratchBytes'],scratch)
        if scratch>=self.s['limits']['scratchBytes']:raise RuntimeError('2GiB aggregate new scratch guard')
        return sample
    def hide_startup(self):
        st=subprocess.STARTUPINFO();st.dwFlags|=subprocess.STARTF_USESHOWWINDOW;st.wShowWindow=0;return st
    def launch(self,cmd,label,env=None):
        self.guard();stdout=(self.out/(label+'-stdout.log')).open('wb');stderr=(self.out/(label+'-stderr.log')).open('wb');self.streams.extend([stdout,stderr]);child=subprocess.Popen(cmd,cwd=ROOT,env=self.base_env if env is None else env,stdout=stdout,stderr=stderr,startupinfo=self.hide_startup(),creationflags=subprocess.CREATE_NO_WINDOW);handle=HANDLE(int(child._handle));who=self.job.remember(handle,child.pid);record={'role':label,**who,'startedAtEpoch':time.time(),'exitCode':None};self.ephemeral.append(record);self.persist();return child,record
    def wait(self,child,record,seconds=None):
        stop_at=time.monotonic()+seconds if seconds is not None else None
        while child.poll()is None:
            self.guard()
            if stop_at is not None and time.monotonic()>=stop_at:raise RuntimeError('Finite registration/source-check command timeout')
            time.sleep(.25)
        record.update({'exitCode':child.returncode,'exitedAtEpoch':time.time(),'verifiedExited':True});self.persist();return child.returncode
    def terminate_child(self,child,record):
        if child is None or child.poll()is not None:return
        (self.out/'supervisor.stop').write_text('Stop at safe boundary; no restart\n',encoding='utf-8');until=min(time.monotonic()+2,time.monotonic()+max(0,remaining_seconds(self.run,time.time(),self.job.tick_ms())))
        while child.poll()is None and time.monotonic()<until:time.sleep(.05)
        if child.poll()is None:record['forcedTerminationIdentity']=self.job.terminate_exact(HANDLE(int(child._handle)),child.pid,88)
        child.wait(timeout=5);record.update({'exitCode':child.returncode,'exitedAtEpoch':time.time(),'verifiedExited':True,'valid':False})
    def git_bytes(self,*args):
        self.guard();seconds=max(.01,min(10,remaining_seconds(self.run,time.time(),self.job.tick_ms())))
        return subprocess.check_output(['git','-c','core.fsmonitor=false','-c','maintenance.auto=false','-c','gc.auto=0',*args],cwd=ROOT,env=self.base_env,timeout=seconds,creationflags=subprocess.CREATE_NO_WINDOW)
    def verify_sources(self):
        if self.git_bytes('rev-parse','HEAD').decode().strip()!=self.candidate:raise RuntimeError('Checkout advanced beyond exact reviewed candidate')
        if self.git_bytes('status','--porcelain','--',str(HERE.relative_to(ROOT))).strip():raise RuntimeError('Authoring source is not clean/committed')
        for name,expected in self.pins.items():
            self.guard();relative=(HERE/name).relative_to(ROOT).as_posix()
            if hashlib.sha256(self.git_bytes('show',self.candidate+':'+relative)).hexdigest()!=expected or sha(HERE/name)!=expected:raise RuntimeError('Reviewed Git/source bytes mismatch:'+name)
    def original_inputs(self,full_cache=True):
        o=self.s['original'];blend=ROOT/o['blend'];grid=ROOT/o['gridSummary'];inventory=ROOT/o['cacheInventory']
        for file,key in [(blend,'blendSha256'),(grid,'gridSummarySha256'),(inventory,'cacheInventorySha256')]:
            self.guard()
            if sha(file)!=o[key]:raise RuntimeError('Original immutable input changed:'+str(file))
        if full_cache:
            count=total=0;entries=json.loads(inventory.read_text());cache_root=inventory.parent/'cache';safe_tree_bytes(cache_root)
            actual={p.relative_to(inventory.parent).as_posix()for p in cache_root.rglob('*')if p.is_file()}
            if actual!=set(entries):raise RuntimeError('Original cache file inventory changed')
            for rel,record in entries.items():
                self.guard();p=(inventory.parent/rel).resolve()
                if not rel.startswith('cache/')or not p.is_relative_to(inventory.parent/'cache'):raise RuntimeError('Original cache inventory escaped cache')
                if p.stat().st_size!=record['bytes']or sha(p)!=record['sha256']:raise RuntimeError('Original cache changed:'+rel)
                count+=1;total+=record['bytes']
            return {'originalSceneSha256':o['blendSha256'],'cacheInventorySha256':o['cacheInventorySha256'],'unchangedOriginalCacheFiles':count,'unchangedOriginalCacheBytes':total,'readOnly':True}
    def register(self,pid,label,args,exe):
        stop=self.out/'supervisor.stop';sources=[str(HERE/name)for name in CORE_FILES]+[str(HERE/'README.md'),str(ROOT/'package.json'),str(ROOT/'docs/source-baseline.json'),str(Path(self.a.tool_record).resolve()),self.owned_claim['path']]
        spec={'pid':pid,'kind':'task_owned','purpose':'One finite surface-source authoring: '+label,'ownershipEvidence':'Explicit root phase permit, durable exact identity/source/deadline and newly owned self-Job; never app-managed.','owners':[OWNER],'state':'stateless','safeToTerminateReason':'Only fresh disposable scene/cache/exports are written; originals are hash-checked read-only. Partial outputs/logs are preserved invalid. No user document or game visit is opened.','sourceFiles':sources,'helperDirectory':str(self.out),'ports':[],'expiresAt':utc(self.run['deadlineEpoch']),'stop':{'method':'stop_file','path':str(stop)},'restart':{'cwd':str(ROOT),'executable':str(exe),'args':args,'dependencies':['Windows x64 Python standard library','Pinned verified portable Blender4.5.15; no packages/addons'],'inputs':[str(ROOT/self.s['original']['blend']),str(ROOT/self.s['original']['cacheInventory']),str(ROOT/self.s['original']['gridSummary']),str(Path(self.a.tool_record).resolve()),*self.auth_paths.values(),str(self.out/'run.json'),self.owned_claim['path']],'outputs':[str(self.out)],'pendingWork':'Never automatically restart, retry, repair, rebake, reuse a consumed permit or reset the deadline. All restarts require a new architect decision. Preserve the one-run claim at '+self.owned_claim['path']+' with SHA-256 '+self.owned_claim['sha256']+'.','secretReferences':[]}}
        if sha(CLEANUP)!=self.s['lifecycleUtilitySha256']:raise RuntimeError('Lifecycle utility changed; reserve model requires reviewed exact code')
        specfile=self.out/(label+'-registration-spec.json');save(specfile,spec)
        budget=registration_reserve(spec,self.job.known[pid],[Path(p).stat().st_size for p in sources],CLEANUP.parent)
        attempt={'role':label,'targetIdentity':self.job.known[pid],'status':'inflight','budget':budget,'startedEpoch':time.time(),'exactExternalPathKnown':False}
        self.registration_attempts.append(attempt);save(self.out/'registration-reservations.json',self.registration_attempts);self.guard()
        child=record=None
        try:
            child,record=self.launch([sys.executable,'-B',str(CLEANUP),'register',str(specfile)],label+'-registration')
            code=self.wait(child,record,20)
            if code:raise RuntimeError('Lifecycle registration failed; no Blender continuation')
            receipt=json.loads((self.out/(label+'-registration-stdout.log')).read_text());identity=receipt['process'];expected=self.job.known[pid]
            if identity['pid']!=pid or identity['creationFiletime']!=expected['creationFileTime']or Path(identity['executable']).resolve()!=Path(expected['executable']).resolve():raise RuntimeError('Lifecycle exact identity mismatch')
            identifier=receipt['id'];root=CLEANUP.parent/'restart-records'/identifier;registry=CLEANUP.parent/'registry'/(identifier+'.json')
            if not re.fullmatch('[0-9a-f]{32}',identifier)or Path(receipt['restartRecord']).resolve()!=root/'registration/restart.json':raise RuntimeError('Uncertain lifecycle scratch ownership')
            entry=json.loads(registry.read_text())
            if entry['id']!=identifier or entry['process']!=identity or entry['owners']!=[OWNER]or entry['purpose']!=spec['purpose']:raise RuntimeError('Registry entry is not this exact task lifetime')
            self.registration_roots.append(str(root));self.registry_entries.append(str(registry));attempt.update({'status':'resolved','exactExternalPathKnown':True,'restartRoot':str(root),'registryFile':str(registry)})
            self.run['registrationRoots']=self.registration_roots;self.run.setdefault('registrations',[]).append({'id':identifier,'role':label,'process':identity,'restartRoot':str(root),'registryFile':str(registry)})
            save(self.out/(label+'-registration-receipt.json'),receipt);save(self.out/'registration-reservations.json',self.registration_attempts);save(self.out/'run.json',self.run);self.guard()
        except BaseException as exc:
            if child is not None:self.terminate_child(child,record if record is not None else{})
            # Keep the whole unresolved reserve charged. Do not guess UUID paths,
            # scan unrelated registrations or silently discard partial bundles.
            if attempt['status']!='resolved':attempt.update({'status':'failed-unresolved-reserve-retained','error':str(exc),'exactExternalPathKnown':False})
            save(self.out/'registration-reservations.json',self.registration_attempts);raise
    def run_blender(self,phase,permit):
        self.verify_sources();self.guard();self.child=None;record=None
        args=['--background','--factory-startup','--disable-autoexec','--threads','4','--python-exit-code','19',str(self.out/('original-copy.blend'if phase=='prepare'else'surface-source.blend')),'--python',str(HERE/'author.py'),'--','--phase',phase,'--settings',str(HERE/'settings.json'),'--output',str(self.out),'--nonce',permit['nonce']]
        env=self.base_env.copy()
        for key,sub in [('BLENDER_USER_CONFIG','config'),('BLENDER_USER_SCRIPTS','scripts'),('BLENDER_USER_DATAFILES','datafiles'),('TEMP','temp'),('TMP','temp')]:
            folder=self.out/sub;folder.mkdir(exist_ok=True);env[key]=str(folder)
        env.update({'OMP_NUM_THREADS':'4','OMP_DYNAMIC':'FALSE'})
        try:
            self.child,record=self.launch([str(self.exe),*args],phase+'-blender',env);save(self.out/(phase+'-process.json'),{'valid':False,'identity':self.job.known[self.child.pid],'deadlineEpoch':self.run['deadlineEpoch'],'deadlineTickMs':self.run['deadlineTickMs'],'sourcePins':self.pins,'controllerExitPending':True})
            self.register(self.child.pid,phase+'-blender',args,self.exe)
            save(self.out/(phase+'.author-ready.json'),{'phase':phase,'nonce':permit['nonce'],'child':self.job.known[self.child.pid],'sourcePins':self.pins,'deadlineEpoch':self.run['deadlineEpoch'],'deadlineTickMs':self.run['deadlineTickMs']})
            self.persist(phase);code=self.wait(self.child,record)
            expected=self.out/('prepare.json'if phase=='prepare'else'raw-manifest.json')
            valid=code==0 and expected.exists()and not(self.out/(phase+'-failure.json')).exists()
            save(self.out/(phase+'-process.json'),{'valid':valid,'identity':self.job.known[self.child.pid],'exitCode':code,'verifiedExited':True,'controllerExitPending':True,'peaks':self.peaks,'deadlineEpoch':self.run['deadlineEpoch']})
            if not valid:raise RuntimeError('Phase failed; preserve all output, no retry:'+phase)
        except BaseException:
            self.terminate_child(self.child,record if record is not None else{});raise
        finally:self.child=None
    def execute(self):
        self.guard();tool=json.loads(Path(self.a.tool_record).read_text());self.exe=Path(tool['executable']).resolve()
        if tool['authenticodeStatus']!='Valid'or sha(self.exe)!=self.s['tool']['exeSha256']:raise RuntimeError('Pinned verified tool mismatch')
        self.register(os.getpid(),'controller',['-B',str(Path(__file__).resolve()),*sys.argv[1:]],Path(sys.executable));self.verify_sources()
        before=self.original_inputs();save(self.out/'original-inputs-before.json',before);shutil.copyfile(ROOT/self.s['original']['blend'],self.out/'original-copy.blend')
        if sha(self.out/'original-copy.blend')!=self.s['original']['blendSha256']:raise RuntimeError('Fresh exact original copy failed')
        self.run['state']='preparing';save(self.out/'run.json',self.run);self.run_blender('prepare',self.permit)
        self.guard();report=json.loads((self.out/'prepare.json').read_text())
        if not report.get('observedValid')or not report['actualStateComparison']['passed']:raise RuntimeError('Preparation observations invalid')
        save(self.out/'original-inputs-after-prepare.json',self.original_inputs())
        self.run.update({'state':'awaiting-separate-bake-permit','preparedEpoch':time.time(),'preparedBlendSha256':sha(self.out/'surface-source.blend'),'prepareReportSha256':sha(self.out/'prepare.json')});save(self.out/'run.json',self.run);self.persist('awaiting-separate-bake-permit')
        print(json.dumps({'state':self.run['state'],'controllerIdentity':self.job.me,'controllerStillRunning':True,'deadlineUtc':utc(self.run['deadlineEpoch']),'runRecordSha256':sha(self.out/'run.json'),'preparedBlendSha256':self.run['preparedBlendSha256'],'prepareReportSha256':self.run['prepareReportSha256'],'bakePermitPath':str(self.bake_permit_path),'privateStopPath':str(self.out/'supervisor.stop')}),flush=True)
        permit_path=self.bake_permit_path
        while not permit_path.exists():self.guard();time.sleep(.25)
        self.guard();bake,bake_sha,stat=read_atomic_json(permit_path);run_sha=sha(self.out/'run.json');validate_permit(bake,'bake',str(self.out),self.pins,self.candidate,time.time(),self.run,run_sha)
        if bake['authorizationPaths']!=self.auth_paths or stat.st_ctime<self.run['preparedEpoch']or bake['toolExeSha256']!=self.s['tool']['exeSha256']or bake['originalBlendSha256']!=self.s['original']['blendSha256']:raise RuntimeError('Preissued/stale/foreign bake permit')
        once(self.out/'bake-authorization.used.json',{'permit':bake,'sha256':bake_sha,'consumedAtEpoch':time.time(),'runRecordSha256':run_sha});self.run.update({'state':'baking','bakeClaimed':True,'bakePermitSha256':bake_sha});save(self.out/'run.json',self.run)
        self.run_blender('bake',bake);save(self.out/'original-inputs-after-bake.json',self.original_inputs())
        raw=json.loads((self.out/'raw-manifest.json').read_text());valid=raw['terminalValidation']['rawGatesPassed']
        self.run.update({'state':'export-complete'if valid else'failed','rawExportComplete':valid,'rawManifestSha256':sha(self.out/'raw-manifest.json'),'completedEpoch':time.time()});save(self.out/'run.json',self.run);self.guard()
        if not valid:raise RuntimeError('Actual raw source validation failed')
        self.persist('export-complete');print(json.dumps({'state':'export-complete','rawExportComplete':True,'qualityAccepted':False,'controllerExitPending':True,'deadlineUtc':utc(self.run['deadlineEpoch'])}),flush=True)
    def finish(self,error=None):
        if self.closed:return
        self.closed=True
        try:
            if error and self.owns_output:
                if self.run:self.run.update({'state':'stopped-or-failed','rawExportComplete':False,'validForIntegration':False,'error':str(error)});save(self.out/'run.json',self.run)
                save(self.out/'controller-failure.json',{'error':str(error),'traceback':traceback.format_exc(),'samplingDiagnostics':self.job.sampling_report()if self.job else None,'oneRunClaim':self.owned_claim,'controllerExitPending':True,'peaks':self.peaks})
            if self.job and self.job.joined:
                if self.child is not None:self.terminate_child(self.child,{})
                # Any surviving member is inspected/revalidated individually. No
                # executable-name sweep, unrelated Job or application runtime.
                for pid in self.job.members():
                    if pid==os.getpid():continue
                    h=self.job.open_member(pid)
                    if h is None:continue
                    try:self.job.remember(h,pid);self.job.terminate_exact(h,pid,89)
                    finally:self.job.k.CloseHandle(h)
                end=time.monotonic()+3
                while sorted(self.job.members())!=[os.getpid()]and time.monotonic()<end:time.sleep(.05)
                for stream in self.streams:stream.flush();os.fsync(stream.fileno());stream.close()
                self.streams=[];self.persist('finishing-receipts');save(self.out/'controller-final.json',{'identity':self.job.me,'runState':self.run['state'],'peaks':self.peaks,'oneRunClaim':self.owned_claim,'childLifetimes':self.ephemeral,'controllerExitPending':True,'allHelpersRetired':False,'recordsFlushedBeforeDisarm':True})
                retirement=self.job.finish();save(self.out/'job-normal-close.json',retirement)
        finally:
            for stream in self.streams:
                try:stream.flush();stream.close()
                except Exception:pass
            if self.job:self.job.close()

def main():
    p=argparse.ArgumentParser();p.add_argument('--output',required=True);p.add_argument('--tool-record',required=True);p.add_argument('--prepare-permit',required=True);p.add_argument('--bake-permit',required=True);a=p.parse_args();controller=None;error=None
    try:controller=Controller(a);controller.initialize();controller.execute()
    except BaseException as exc:error=exc;raise
    finally:
        if controller:controller.finish(error)
if __name__=='__main__':main()
