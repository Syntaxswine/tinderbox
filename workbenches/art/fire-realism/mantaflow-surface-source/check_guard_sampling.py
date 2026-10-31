"""Pure mocked guard API tests: no real Job/controller/Blender/child is created.
Uninitialized OwnedJob records receive only Python fake callables, as approved.
"""
import ast,ctypes,json,os,tempfile,unittest
from pathlib import Path
from unittest.mock import patch
import winjob,supervisor
from policy import new_deadline
from winjob import OwnedJob,ProcessQueryError,WAIT_OBJECT_0,WAIT_TIMEOUT,WAIT_FAILED,SAMPLE_EVENT_LIMIT,SamplingBudgetError
from supervisor import join_and_record_limits,sample_and_record

PID=13211;HANDLE=101;LIMIT=2*1024**3

def run_record():
    return {'candidateCommit':'f'*40,'sourcePins':{'mock':'not-a-delivery'},'deadlineEpoch':1900,'deadlineTickMs':900000}

class FakeKernel:
    def __init__(self,stage=None,waits=None,owned=True,open_error=None,membership_error=False,wait_durations=None):
        self.stage=stage;self.waits=list(waits or []);self.owned=owned;self.open_error=open_error;self.membership_error=membership_error;self.error=0;self.events=[];self.closed=[];self.terminated=[];self.clock=1000;self.requests=[];self.wait_durations=list(wait_durations or [])
    def OpenProcess(self,rights,inherit,pid):
        self.events.append(('open',rights,pid));assert rights&0x100000 # SYNCHRONIZE is present.
        if self.open_error is not None:self.error=self.open_error;return 0
        return HANDLE
    def IsProcessInJob(self,handle,job,out):
        self.events.append(('membership',handle,job))
        if self.membership_error:self.error=5;return False
        out._obj.value=self.owned;return True
    def WaitForSingleObject(self,handle,timeout):
        assert handle==HANDLE and 0<=timeout<=250
        self.requests.append(timeout);self.clock+=self.wait_durations.pop(0)if self.wait_durations else 0
        value=self.waits.pop(0)if self.waits else WAIT_TIMEOUT;self.events.append(('wait',value))
        self.error=1113 if value==WAIT_FAILED else 9997 # Deliberately overwrites last-error.
        return value
    def GetProcessTimes(self,handle,creation,exit_time,kernel,user):
        self.events.append(('creation',handle))
        if self.stage=='creation-time':self.error=5;return False
        creation._obj.dwHighDateTime=0;creation._obj.dwLowDateTime=200;return True
    def QueryFullProcessImageNameW(self,handle,flags,text,length):
        self.events.append(('image',handle))
        if self.stage=='executable-image':self.error=5;return False
        text.value='C:/verified/mock-child.exe';length._obj.value=len(text.value);return True
    def GetProcessMemoryInfo(self,handle,memory,size):
        self.events.append(('memory',handle))
        if self.stage=='private-memory':self.error=5;return False
        memory._obj.PrivateUsage=123;memory._obj.WorkingSetSize=456;memory._obj.PeakWorkingSetSize=789;return True
    def CloseHandle(self,handle):self.events.append(('close',handle));self.closed.append(handle);return True
    def TerminateProcess(self,handle,code):self.terminated.append((handle,code));return True
    def AssignProcessToJobObject(self,job,handle):self.events.append(('join',job,handle));return True
    def GetCurrentProcess(self):return 999
    def GetTickCount64(self):return self.clock

def fake_job(**options):
    api=FakeKernel(**options);job=object.__new__(OwnedJob) # __init__ is NEVER called.
    job.k=api;job.p=api;job.h=77;job.joined=False;job.disarmed=False;job.known={};job.me={'pid':os.getpid(),'creationFileTime':100,'executable':'mock-controller'}
    job.process_limit=job.aggregate_limit=LIMIT;job.limit_readback={'status':'not-queried','actual':None};job.sampling_events=[];job.sampling_counts={'events':0,'confirmedExitedSkips':0,'failures':0,'dropped':0};job.sample_sequence=0;job.last_sample=None
    job.members=lambda:[PID]
    def info():
        api.events.append(('info',));return {'processLimitBytes':LIMIT,'aggregateLimitBytes':LIMIT,'peakProcessCommittedBytes':777,'peakJobCommittedBytes':888,'flags':0x2300}
    job.info=info
    return job,api

class SamplingTests(unittest.TestCase):
    def sample(self,job,api,wait_check=None):
        with patch.object(winjob.ctypes,'get_last_error',side_effect=lambda:api.error):return job.sample(wait_check or(lambda:10000))
    def test_live_member_is_unchanged_and_handle_closes_once(self):
        job,api=fake_job();r=self.sample(job,api)
        self.assertEqual(r['sumPrivateBytes'],123);self.assertEqual(r['members'][0]['pid'],PID);self.assertEqual(r['job']['peakJobCommittedBytes'],888)
        self.assertEqual(api.closed,[HANDLE]);self.assertEqual(job.sampling_counts['events'],0);self.assertTrue(job.last_sample['complete'])
    def test_preidentity_signaled_owned_handle_skips_without_queries(self):
        job,api=fake_job(waits=[WAIT_OBJECT_0]);r=self.sample(job,api)
        self.assertEqual(r['members'],[]);self.assertEqual(api.closed,[HANDLE]);self.assertEqual(r['job']['peakJobCommittedBytes'],888)
        self.assertFalse(any(e[0]in ['creation','image','memory']for e in api.events))
        event=job.sampling_events[-1];self.assertTrue(event['exactJobMembershipConfirmed']);self.assertFalse(event['observedIdentityComplete']);self.assertEqual(event['disposition'],'skip-confirmed-exited')
    def test_three_specific_query_errors_skip_only_after_confirmed_exit(self):
        for stage in ['creation-time','executable-image','private-memory']:
            with self.subTest(stage=stage):
                job,api=fake_job(stage=stage,waits=[WAIT_TIMEOUT,WAIT_OBJECT_0]);r=self.sample(job,api);event=job.sampling_events[-1]
                self.assertEqual(r['members'],[]);self.assertEqual(r['job']['peakJobCommittedBytes'],888);self.assertEqual(api.closed,[HANDLE])
                self.assertEqual(event['pid'],PID);self.assertEqual(event['queryStage'],stage);self.assertEqual(event['originalWin32Error'],5);self.assertEqual(api.error,9997)
                self.assertEqual(event['waitResult'],WAIT_OBJECT_0);self.assertTrue(event['exitObservationDoesNotProveQueryErrorCause'])
                if stage=='creation-time':self.assertEqual(event['observedIdentity'],{'pid':PID})
                if stage=='executable-image':self.assertEqual(event['observedIdentity'],{'pid':PID,'creationFileTime':200})
                if stage=='private-memory':self.assertTrue(event['observedIdentityComplete']);self.assertTrue(event['observedIdentityRevalidated'])
    def test_same_query_errors_for_live_handle_keep_original_cause(self):
        for stage in ['creation-time','executable-image','private-memory']:
            with self.subTest(stage=stage):
                job,api=fake_job(stage=stage,waits=[WAIT_TIMEOUT,WAIT_TIMEOUT])
                with self.assertRaises(ProcessQueryError)as raised:self.sample(job,api)
                self.assertEqual(raised.exception.original_win32_error,5);self.assertEqual(raised.exception.query_stage,stage)
                self.assertEqual(job.sampling_events[-1]['disposition'],'abort-live-query-error');self.assertEqual(api.closed,[HANDLE]);self.assertFalse(job.last_sample['complete'])
    def test_failed_or_unexpected_wait_is_never_an_exit_proof(self):
        for waits,stage in [([WAIT_FAILED],None),([0x80],None),([WAIT_TIMEOUT,WAIT_FAILED],'executable-image')]:
            with self.subTest(waits=waits,stage=stage):
                job,api=fake_job(stage=stage,waits=waits)
                with self.assertRaises(RuntimeError):self.sample(job,api)
                event=job.sampling_events[-1];self.assertEqual(event['disposition'],'abort-failed-or-unexpected-wait');self.assertEqual(api.closed,[HANDLE])
                if event['waitResult']==WAIT_FAILED:self.assertEqual(event['waitWin32Error'],1113)
                if stage:self.assertEqual(event['originalWin32Error'],5)
    def test_open_permission_or_missing_handle_cannot_be_skipped(self):
        for error in [5,87,1168]:
            with self.subTest(error=error):
                job,api=fake_job(open_error=error,waits=[WAIT_OBJECT_0])
                with self.assertRaises(OSError):self.sample(job,api)
                self.assertEqual(api.closed,[]);self.assertFalse(any(e[0]=='wait'for e in api.events));self.assertEqual(job.sampling_events[-1]['originalWin32Error'],error);self.assertFalse(job.sampling_events[-1]['exactJobMembershipConfirmed'])
    def test_membership_failure_is_fatal_before_wait(self):
        for options in [{'owned':False},{'membership_error':True}]:
            with self.subTest(options=options):
                job,api=fake_job(**options,waits=[WAIT_OBJECT_0])
                with self.assertRaises((OSError,RuntimeError)):self.sample(job,api)
                self.assertEqual(api.closed,[HANDLE]);self.assertFalse(any(e[0]=='wait'for e in api.events));self.assertFalse(job.sampling_events[-1]['exactJobMembershipConfirmed'])
    def test_identity_mismatch_and_unclassified_errors_are_strict(self):
        job,api=fake_job(waits=[WAIT_TIMEOUT,WAIT_OBJECT_0]);job.known[PID]={'pid':PID,'creationFileTime':999,'executable':'prior'}
        with self.assertRaises(RuntimeError):self.sample(job,api)
        self.assertEqual(len([e for e in api.events if e[0]=='wait']),1);self.assertEqual(api.closed,[HANDLE]);self.assertEqual(job.sampling_events[-1]['disposition'],'abort-identity-validation')
        job,api=fake_job(waits=[WAIT_TIMEOUT,WAIT_OBJECT_0])
        def other_error(handle,pid):raise OSError(5,'unclassified error')
        job.remember=other_error
        with self.assertRaises(OSError):self.sample(job,api)
        self.assertEqual(len([e for e in api.events if e[0]=='wait']),1);self.assertEqual(api.closed,[HANDLE])
        job,api=fake_job(waits=[WAIT_TIMEOUT,WAIT_OBJECT_0])
        def unknown_query(handle,pid):raise ProcessQueryError(5,pid,'unapproved-query','not a targeted API',{'pid':pid})
        job.remember=unknown_query
        with self.assertRaises(RuntimeError):self.sample(job,api)
        self.assertEqual(len([e for e in api.events if e[0]=='wait']),1);self.assertEqual(api.closed,[HANDLE]);self.assertEqual(job.sampling_events[-1]['disposition'],'abort-unrecognized-query-error')
    def test_remember_and_termination_never_gain_exit_tolerance(self):
        for method in ['remember','terminate_exact']:
            with self.subTest(method=method):
                job,api=fake_job(stage='executable-image',waits=[WAIT_OBJECT_0]);job.known[PID]={'pid':PID,'creationFileTime':200,'executable':str(Path('C:/verified/mock-child.exe').resolve())}
                with patch.object(winjob.ctypes,'get_last_error',side_effect=lambda:api.error):
                    with self.assertRaises(ProcessQueryError):getattr(job,method)(HANDLE,PID,*([88]if method=='terminate_exact'else[]))
                self.assertFalse(any(e[0]=='wait'for e in api.events));self.assertEqual(api.terminated,[])
        for expected in [None,{'pid':PID,'creationFileTime':201,'executable':str(Path('C:/verified/mock-child.exe').resolve())},{'pid':PID,'creationFileTime':200,'executable':'wrong executable'}]:
            job,api=fake_job(waits=[WAIT_OBJECT_0])
            if expected is not None:job.known[PID]=expected
            with self.assertRaises(RuntimeError):job.terminate_exact(HANDLE,PID,88)
            self.assertFalse(any(e[0]=='wait'for e in api.events));self.assertEqual(api.terminated,[])
    def test_journal_is_bounded_and_departures_keep_job_peaks(self):
        job,api=fake_job(waits=[WAIT_OBJECT_0]*(SAMPLE_EVENT_LIMIT+6))
        for _ in range(SAMPLE_EVENT_LIMIT+6):self.assertEqual(self.sample(job,api)['job']['peakJobCommittedBytes'],888)
        self.assertEqual(len(job.sampling_events),SAMPLE_EVENT_LIMIT);self.assertEqual(job.sampling_counts,{'events':70,'confirmedExitedSkips':70,'failures':0,'dropped':6});self.assertEqual(len(api.closed),70)
        api.stage='executable-image';api.waits=[WAIT_TIMEOUT,WAIT_TIMEOUT]
        with self.assertRaises(ProcessQueryError):self.sample(job,api)
        self.assertEqual(len(job.sampling_events),SAMPLE_EVENT_LIMIT);self.assertEqual(job.sampling_events[-1]['originalWin32Error'],5);self.assertEqual(job.sampling_counts['failures'],1);self.assertEqual(job.sampling_counts['dropped'],7)
    def test_fatal_sample_details_are_persisted_before_rethrow(self):
        job,api=fake_job(stage='executable-image',waits=[WAIT_TIMEOUT,WAIT_TIMEOUT]);run=run_record();before=json.dumps(run,sort_keys=True)
        with tempfile.TemporaryDirectory(prefix='mock-sample-record-')as folder:
            with patch.object(winjob.ctypes,'get_last_error',side_effect=lambda:api.error),patch.object(supervisor,'remaining_sampling_wait_ms',return_value=10000):
                with self.assertRaises(ProcessQueryError):sample_and_record(job,folder,run)
            saved=json.loads((Path(folder)/'job-sampling-diagnostics.json').read_text());event=saved['sampling']['events'][-1]
            self.assertEqual(event['pid'],PID);self.assertEqual(event['queryStage'],'executable-image');self.assertEqual(event['originalWin32Error'],5);self.assertEqual(saved['sourcePins'],run['sourcePins']);self.assertFalse(saved['sampling']['lastSample']['complete'])
        self.assertEqual(before,json.dumps(run,sort_keys=True),'Sampling must not rewrite the prepared run hash')

    def test_one_deadline_clipped_wait_and_one_aggregate_requested_budget(self):
        job,api=fake_job(stage='executable-image',waits=[WAIT_TIMEOUT,WAIT_OBJECT_0],wait_durations=[0,20]);budgets=iter([37.9,10.0])
        self.sample(job,api,lambda:next(budgets));timing=job.sampling_events[-1]['waitTiming']
        self.assertEqual(api.requests,[0,37]);self.assertEqual(timing['requestedMs'],37);self.assertEqual(timing['elapsedMs'],20);self.assertEqual(timing['remainingRunBeforeMs'],37.9);self.assertEqual(timing['remainingRunAfterMs'],10);self.assertEqual(timing['aggregateAfterMs'],213)
        job,api=fake_job(stage='executable-image',waits=[WAIT_TIMEOUT,WAIT_OBJECT_0,WAIT_TIMEOUT,WAIT_OBJECT_0],wait_durations=[0,3,0,0]);job.members=lambda:[PID,PID+1];calls=[]
        self.sample(job,api,lambda:calls.append(api.clock)or 10000)
        self.assertEqual(api.requests,[0,250,0,0]);self.assertEqual(sum(api.requests),250);self.assertEqual(len(calls),4)
        self.assertEqual([e['waitTiming']['aggregateAfterMs']for e in job.sampling_events],[0,0]);self.assertEqual(len([e for e in api.events if e[0]=='image']),2,'No image-query retry')
        job,api=fake_job(stage='executable-image',waits=[WAIT_TIMEOUT,WAIT_OBJECT_0],wait_durations=[0,280]);self.sample(job,api)
        timing=job.sampling_events[-1]['waitTiming'];self.assertEqual(timing['requestedMs'],250);self.assertEqual(timing['elapsedMs'],280);self.assertTrue(timing['elapsedExceededRequested']);self.assertEqual(timing['aggregateAfterMs'],0)
    def test_callback_stop_deadline_or_unknown_failure_never_skips(self):
        for phase,failure in [('before',SamplingBudgetError('STOP',700)),('after',SamplingBudgetError('deadline',0)),('after',RuntimeError('unknown callback failure'))]:
            with self.subTest(phase=phase,failure=type(failure).__name__):
                job,api=fake_job(stage='executable-image',waits=[WAIT_TIMEOUT,WAIT_OBJECT_0],wait_durations=[0,20]);calls=[]
                def callback():
                    calls.append(api.clock)
                    if phase=='before'or len(calls)==2:raise failure
                    return 1000
                with self.assertRaises(type(failure)):self.sample(job,api,callback)
                event=job.sampling_events[-1];timing=event['waitTiming']
                self.assertEqual(event['originalWin32Error'],5);self.assertEqual(event['observedIdentity'],{'pid':PID,'creationFileTime':200});self.assertEqual(event['disposition'],'abort-clock-stop-'+phase);self.assertEqual(job.sampling_counts['confirmedExitedSkips'],0)
                self.assertEqual(timing['callbackFailure']['phase'],phase);self.assertEqual(timing['remainingRun'+phase.title()+'Ms'],getattr(failure,'remaining_ms',None));self.assertEqual(api.closed,[HANDLE])
                self.assertEqual(api.requests,[0]if phase=='before'else[0,250]);self.assertEqual(timing['elapsedMs'],0 if phase=='before'else 20);self.assertEqual(timing['aggregateAfterMs'],250 if phase=='before'else 0)
    def test_actual_callback_uses_original_clock_and_stop_without_recursion(self):
        job,api=fake_job();run={**run_record(),**new_deadline(1000,50000)};api.clock=51000
        with tempfile.TemporaryDirectory(prefix='mock-original-wait-budget-')as folder,patch.object(supervisor.time,'time',return_value=1001):
            self.assertEqual(supervisor.remaining_sampling_wait_ms(job,folder,run),899000)
            (Path(folder)/'supervisor.stop').write_text('pure test stop',encoding='utf-8')
            with self.assertRaises(SamplingBudgetError)as raised:supervisor.remaining_sampling_wait_ms(job,folder,run)
            self.assertEqual(raised.exception.remaining_ms,899000)
        with tempfile.TemporaryDirectory(prefix='mock-expired-wait-budget-')as folder,patch.object(supervisor.time,'time',return_value=1001):
            api.clock=950000
            with self.assertRaises(SamplingBudgetError)as raised:supervisor.remaining_sampling_wait_ms(job,folder,run)
            self.assertEqual(raised.exception.remaining_ms,0)
        source=Path(__file__).with_name('supervisor.py').read_text(encoding='utf-8');tree=ast.parse(source);callback=next(n for n in tree.body if isinstance(n,ast.FunctionDef)and n.name=='remaining_sampling_wait_ms')
        self.assertFalse(any(isinstance(n,(ast.While,ast.For))for n in ast.walk(callback)))
        self.assertFalse(any(isinstance(n,ast.Call)and isinstance(n.func,ast.Attribute)and n.func.attr in ['sample','guard']for n in ast.walk(callback)))

class ReadbackTests(unittest.TestCase):
    def test_numeric_readback_is_durable_before_any_fake_command(self):
        job,api=fake_job();run=run_record()
        with tempfile.TemporaryDirectory(prefix='mock-job-readback-')as folder:
            receipt=join_and_record_limits(job,folder,run)
            saved=json.loads((Path(folder)/'job-limit-readback.json').read_text());persisted_run=json.loads((Path(folder)/'run.json').read_text())
            self.assertTrue(saved['valid']);self.assertEqual(saved['actual']['processLimitBytes'],LIMIT);self.assertEqual(saved['actual']['aggregateLimitBytes'],LIMIT);self.assertEqual(saved['actual']['flags'],0x2300);self.assertEqual(saved['actual']['peakJobCommittedBytes'],888)
            self.assertEqual(saved['controllerIdentity'],job.me);self.assertEqual(saved['deadlineTickMs'],run['deadlineTickMs']);self.assertEqual(saved['sourcePins'],run['sourcePins']);self.assertTrue(persisted_run['jobLimitReadback']['valid'])
            api.events.append(('fake-command-not-launched',)) # No subprocess call.
            self.assertEqual(api.events[-1][0],'fake-command-not-launched');self.assertTrue(Path(run['jobLimitReadback']['path']).exists())
        # Static call-boundary check: the real controller records readback before
        # its first guard, then main reaches execute() and its command methods.
        source=Path(__file__).with_name('supervisor.py').read_text();tree=ast.parse(source)
        controller=next(n for n in tree.body if isinstance(n,ast.ClassDef)and n.name=='Controller')
        methods={n.name:n for n in controller.body if isinstance(n,ast.FunctionDef)}
        initialize=ast.get_source_segment(source,methods['initialize'])
        self.assertLess(initialize.index('join_and_record_limits('),initialize.index('self.guard()'))
        for name in ['__init__','initialize']:
            body=ast.get_source_segment(source,methods[name]);self.assertNotIn('subprocess.',body);self.assertNotIn('self.launch(',body)
        main=ast.get_source_segment(source,next(n for n in tree.body if isinstance(n,ast.FunctionDef)and n.name=='main'))
        self.assertLess(main.index('controller.initialize()'),main.index('controller.execute()'))
    def test_wrong_caps_flags_and_unknown_query_save_failure_without_command(self):
        for actual in [{'processLimitBytes':1,'aggregateLimitBytes':LIMIT,'peakProcessCommittedBytes':11,'peakJobCommittedBytes':22,'flags':0x2300},{'processLimitBytes':LIMIT,'aggregateLimitBytes':1,'peakProcessCommittedBytes':11,'peakJobCommittedBytes':22,'flags':0x2300},{'processLimitBytes':LIMIT,'aggregateLimitBytes':LIMIT,'peakProcessCommittedBytes':11,'peakJobCommittedBytes':22,'flags':0},None]:
            with self.subTest(actual=actual):
                job,api=fake_job();run=run_record()
                def info():
                    if actual is None:raise OSError(5,'mocked readback query failed')
                    return actual
                job.info=info
                with tempfile.TemporaryDirectory(prefix='mock-invalid-readback-')as folder:
                    with self.assertRaises((RuntimeError,OSError)):join_and_record_limits(job,folder,run)
                    saved=json.loads((Path(folder)/'job-limit-readback.json').read_text());self.assertFalse(saved['valid']);self.assertEqual(saved['actual'],actual);self.assertFalse(run['jobLimitReadback']['valid'])
                    self.assertFalse(any(e[0]=='fake-command-not-launched'for e in api.events))
                    self.assertEqual(saved['queryReadback']['status'],'query-failed'if actual is None else'read')

if __name__=='__main__':unittest.main(verbosity=2)
