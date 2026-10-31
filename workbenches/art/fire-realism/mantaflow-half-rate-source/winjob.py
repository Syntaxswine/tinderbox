"""Reviewed Windows Job/handle concepts, extended to cover the controller itself.
No Job or process is created merely by importing this module. OS enforcement
still requires actual separately permitted execution; static checks cannot prove it.
"""
import ctypes,math,os
from ctypes import wintypes as W
from pathlib import Path
SIZE=ctypes.c_size_t;HANDLE=W.HANDLE
WAIT_OBJECT_0=0;WAIT_TIMEOUT=258;WAIT_FAILED=0xffffffff;SAMPLE_EVENT_LIMIT=64;SAMPLE_WAIT_BUDGET_MS=250
class IO(ctypes.Structure):_fields_=[(n,ctypes.c_ulonglong)for n in ['ReadOperationCount','WriteOperationCount','OtherOperationCount','ReadTransferCount','WriteTransferCount','OtherTransferCount']]
class BASIC(ctypes.Structure):_fields_=[('PerProcessUserTimeLimit',ctypes.c_longlong),('PerJobUserTimeLimit',ctypes.c_longlong),('LimitFlags',W.DWORD),('MinimumWorkingSetSize',SIZE),('MaximumWorkingSetSize',SIZE),('ActiveProcessLimit',W.DWORD),('Affinity',SIZE),('PriorityClass',W.DWORD),('SchedulingClass',W.DWORD)]
class EXTENDED(ctypes.Structure):_fields_=[('BasicLimitInformation',BASIC),('IoInfo',IO),('ProcessMemoryLimit',SIZE),('JobMemoryLimit',SIZE),('PeakProcessMemoryUsed',SIZE),('PeakJobMemoryUsed',SIZE)]
class MEMORY(ctypes.Structure):_fields_=[('cb',W.DWORD),('PageFaultCount',W.DWORD)]+[(n,SIZE)for n in ['PeakWorkingSetSize','WorkingSetSize','QuotaPeakPagedPoolUsage','QuotaPagedPoolUsage','QuotaPeakNonPagedPoolUsage','QuotaNonPagedPoolUsage','PagefileUsage','PeakPagefileUsage','PrivateUsage']]

def check(value,label):
    if not value:raise OSError(ctypes.get_last_error(),label)

class ProcessQueryError(OSError):
    """Strict query failure; only sample() may test this held object's later exit."""
    def __init__(self,error,pid,stage,label,partial):
        super().__init__(error,label);self.original_win32_error=error;self.pid=pid;self.query_stage=stage;self.partial_identity=dict(partial)

class SamplingBudgetError(RuntimeError):
    def __init__(self,message,remaining_ms=None):
        super().__init__(message);self.remaining_ms=remaining_ms

def process_query_check(value,pid,stage,label,partial):
    if not value:
        error=ctypes.get_last_error() # Capture BEFORE a wait or any further API.
        raise ProcessQueryError(error,pid,stage,label,partial)

class OwnedJob:
    def __init__(self,process_limit,aggregate_limit):
        if os.name!='nt':raise RuntimeError('Windows Job enforcement required; no fallback')
        self.k=ctypes.WinDLL('kernel32',use_last_error=True);self.p=ctypes.WinDLL('psapi',use_last_error=True);self.h=None;self.joined=False;self.disarmed=False;self.known={};self.process_limit=process_limit;self.aggregate_limit=aggregate_limit;self.limit_readback={'status':'not-queried','actual':None};self.sampling_events=[];self.sampling_counts={'events':0,'confirmedExitedSkips':0,'censusOmissions':0,'failures':0,'dropped':0};self.sample_sequence=0;self.last_sample=None
        k=self.k
        for name,args,result in [('CreateJobObjectW',[ctypes.c_void_p,W.LPCWSTR],HANDLE),('SetInformationJobObject',[HANDLE,ctypes.c_int,ctypes.c_void_p,W.DWORD],W.BOOL),('QueryInformationJobObject',[HANDLE,ctypes.c_int,ctypes.c_void_p,W.DWORD,ctypes.POINTER(W.DWORD)],W.BOOL),('AssignProcessToJobObject',[HANDLE,HANDLE],W.BOOL),('IsProcessInJob',[HANDLE,HANDLE,ctypes.POINTER(W.BOOL)],W.BOOL),('GetProcessTimes',[HANDLE,*([ctypes.POINTER(W.FILETIME)]*4)],W.BOOL),('QueryFullProcessImageNameW',[HANDLE,W.DWORD,W.LPWSTR,ctypes.POINTER(W.DWORD)],W.BOOL),('OpenProcess',[W.DWORD,W.BOOL,W.DWORD],HANDLE),('TerminateProcess',[HANDLE,W.UINT],W.BOOL),('GetExitCodeProcess',[HANDLE,ctypes.POINTER(W.DWORD)],W.BOOL),('WaitForSingleObject',[HANDLE,W.DWORD],W.DWORD),('CloseHandle',[HANDLE],W.BOOL)]:
            fn=getattr(k,name);fn.argtypes=args;fn.restype=result
        k.GetCurrentProcess.restype=HANDLE;k.GetTickCount64.restype=ctypes.c_ulonglong
        self.p.GetProcessMemoryInfo.argtypes=[HANDLE,ctypes.POINTER(MEMORY),W.DWORD];self.p.GetProcessMemoryInfo.restype=W.BOOL
        self.me=self.identity(k.GetCurrentProcess(),os.getpid())
        self.h=k.CreateJobObjectW(None,None);check(self.h,'Create task-owned Job')
        limits=EXTENDED();limits.BasicLimitInformation.LimitFlags=0x100|0x200|0x2000;limits.ProcessMemoryLimit=process_limit;limits.JobMemoryLimit=aggregate_limit
        check(k.SetInformationJobObject(self.h,9,ctypes.byref(limits),ctypes.sizeof(limits)),'Set hard per-process/aggregate committed limits')
    def tick_ms(self):return int(self.k.GetTickCount64())
    def identity(self,handle,pid):
        partial={'pid':pid};a,b,c,d=(W.FILETIME()for _ in range(4))
        process_query_check(self.k.GetProcessTimes(handle,*[ctypes.byref(x)for x in [a,b,c,d]]),pid,'creation-time','Read exact process creation time',partial)
        partial['creationFileTime']=(a.dwHighDateTime<<32)|a.dwLowDateTime
        text=ctypes.create_unicode_buffer(32768);length=W.DWORD(len(text))
        process_query_check(self.k.QueryFullProcessImageNameW(handle,0,text,ctypes.byref(length)),pid,'executable-image','Read exact process executable',partial)
        return {**partial,'executable':str(Path(text.value).resolve())}
    def join_self(self):
        check(self.k.AssignProcessToJobObject(self.h,self.k.GetCurrentProcess()),'Join supervisor to owned Job; nested failure stops before Blender')
        self.joined=True;self.known[os.getpid()]=self.me
        if not self.contains(self.k.GetCurrentProcess()):raise RuntimeError('Supervisor not inside own memory Job')
        try:actual=self.info()
        except BaseException as exc:
            self.limit_readback={'status':'query-failed','actual':None,'error':str(exc)};raise
        self.limit_readback={'status':'read','actual':actual,'validated':False}
        if actual['processLimitBytes']!=self.process_limit or actual['aggregateLimitBytes']!=self.aggregate_limit or actual['flags']&0x2300!=0x2300:raise RuntimeError('Hard Job limits did not read back')
        self.limit_readback['validated']=True;return actual
    def contains(self,handle):
        yes=W.BOOL();check(self.k.IsProcessInJob(handle,self.h,ctypes.byref(yes)),'Verify exact owned Job membership');return bool(yes.value)
    def info(self):
        value=EXTENDED();check(self.k.QueryInformationJobObject(self.h,9,ctypes.byref(value),ctypes.sizeof(value),None),'Read aggregate Job accounting')
        return {'processLimitBytes':value.ProcessMemoryLimit,'aggregateLimitBytes':value.JobMemoryLimit,'peakProcessCommittedBytes':value.PeakProcessMemoryUsed,'peakJobCommittedBytes':value.PeakJobMemoryUsed,'flags':value.BasicLimitInformation.LimitFlags}
    def members(self):
        for count in [16,64,256,1024]:
            class IDS(ctypes.Structure):_fields_=[('assigned',W.DWORD),('listed',W.DWORD),('pids',SIZE*count)]
            ids=IDS();ok=self.k.QueryInformationJobObject(self.h,3,ctypes.byref(ids),ctypes.sizeof(ids),None)
            if ok:return [int(ids.pids[i])for i in range(ids.listed)]
            if ctypes.get_last_error()!=234:check(ok,'Read owned Job members')
        raise RuntimeError('Unexpected authoring process count; no unbounded traversal')
    def open_member(self,pid):
        h=self.k.OpenProcess(0x1000|0x400|0x10|0x100000|1,False,pid)
        if not h:
            if ctypes.get_last_error()in [87,1168]:return None
            check(h,'Open exact task Job member')
        if not self.contains(h):self.k.CloseHandle(h);return None # PID reused outside this owned Job: never touch it.
        return h
    def remember(self,handle,pid):
        if not self.contains(handle):raise RuntimeError('Created child did not inherit owned Job; no fallback')
        who=self.identity(handle,pid)
        if who['creationFileTime']<self.me['creationFileTime']:raise RuntimeError('Unexpected older member of newly created owned Job')
        if pid in self.known and self.known[pid]!=who:raise RuntimeError('Owned member PID was reused; refuse identity confusion')
        self.known[pid]=who;return who
    def sample_census(self):
        # Sampling only: one bounded query, never a truncated/partial PID list.
        count=1024
        class IDS(ctypes.Structure):_fields_=[('assigned',W.DWORD),('listed',W.DWORD),('pids',SIZE*count)]
        ids=IDS();ok=self.k.QueryInformationJobObject(self.h,3,ctypes.byref(ids),ctypes.sizeof(ids),None)
        error=ctypes.get_last_error()if not ok else None
        assigned=int(ids.assigned);returned=int(ids.listed);pids=[int(ids.pids[i])for i in range(min(returned,count))]
        malformed=returned>count or any(pid<=0 for pid in pids)or len(set(pids))!=len(pids)
        return {'jobHandle':int(self.h.value)if hasattr(self.h,'value')else int(self.h),'capacity':count,'querySucceeded':bool(ok),'queryWin32Error':error,'assignedCount':assigned,'returnedCount':returned,'truncated':assigned!=returned or returned>count,'malformed':malformed,'complete':bool(ok)and assigned==returned and not malformed,'pids':pids}
    def _sample_absent_from_census(self,pid,error,wait_check):
        # ONLY sample's null-handle ERROR_INVALID_PARAMETER case calls this.
        # A census omission is never a lifetime identity/exit/termination proof.
        if not isinstance(error,OSError)or error.errno!=87:raise error
        evidence={'initialCensus':self.sample_initial_census,'refreshedCensus':None,'controllerMembershipConfirmed':False,'sameJobHandleVerified':False,'jobAccounting':None,'remainingRunBeforeMs':None,'remainingRunAfterMs':None,'predicateFailure':None,'afterBudgetFailure':None,'creationFileTime':None,'executable':None,'exitCause':None,'meaning':'absent from refreshed Job census; only current memory observation omitted'}
        def budget(phase):
            key='remainingRun'+phase.title()+'Ms'
            try:
                value=float(wait_check())
                if not math.isfinite(value):raise SamplingBudgetError('Unknown census budget')
                evidence[key]=value
                if value<=0:raise SamplingBudgetError('Original census deadline expired',value)
            except BaseException as exc:
                remaining=getattr(exc,'remaining_ms',None)
                if isinstance(remaining,(int,float))and math.isfinite(remaining):evidence[key]=remaining
                raise
        failure=None
        try:
            budget('before');refreshed=self.sample_census();evidence['refreshedCensus']=refreshed
            current=int(self.h.value)if hasattr(self.h,'value')else int(self.h)
            evidence['sameJobHandleVerified']=refreshed['jobHandle']==self.sample_initial_census['jobHandle']==current
            if not evidence['sameJobHandleVerified']or not refreshed['complete']:raise RuntimeError('Refreshed sampling census is not complete on the same owned Job')
            if pid in refreshed['pids']:raise RuntimeError('Failed-open PID is still in the complete refreshed Job census')
            evidence['controllerMembershipConfirmed']=self.contains(self.k.GetCurrentProcess())
            if not evidence['controllerMembershipConfirmed']or self.me['pid']!=os.getpid()or self.me['pid']not in refreshed['pids']:raise RuntimeError('Controller membership is not confirmed by the same owned Job and complete census')
            actual=self.info();evidence['jobAccounting']=actual
            if actual['processLimitBytes']!=self.process_limit or actual['aggregateLimitBytes']!=self.aggregate_limit or actual['flags']&0x2300!=0x2300 or actual['flags']&0x1800:raise RuntimeError('Census omission requires unchanged hard caps and disabled breakaway')
        except BaseException as exc:
            failure=exc;evidence['predicateFailure']={'type':type(exc).__name__,'error':str(exc)}
        finally:
            try:budget('after')
            except BaseException as exc:
                evidence['afterBudgetFailure']={'type':type(exc).__name__,'error':str(exc)}
                if failure is None:failure=exc
        if failure is not None:
            self._sample_note(pid,'open-process','abort-refreshed-census-check',False,error,census_evidence=evidence)
            raise error from failure
        self._sample_note(pid,'open-process','omit-absent-from-refreshed-job-census',False,error,census_evidence=evidence)
    def sampling_report(self):
        return {'counts':dict(self.sampling_counts),'eventLimit':SAMPLE_EVENT_LIMIT,'events':[dict(e)for e in self.sampling_events],'lastSample':self.last_sample}
    def _sample_note(self,pid,stage,disposition,owned,error=None,partial=None,identity_verified=False,wait_result=None,wait_error=None,wait_timing=None,census_evidence=None):
        known=self.known.get(pid);observed=dict(partial or {'pid':pid})
        event={'sequence':self.sample_sequence,'pid':pid,'queryStage':stage,'disposition':disposition,'exactJobMembershipConfirmed':owned,'originalWin32Error':getattr(error,'original_win32_error',getattr(error,'winerror',None)or getattr(error,'errno',None)),'error':str(error)if error is not None else None,'waitResult':wait_result,'waitWin32Error':wait_error,'waitTiming':wait_timing,'censusEvidence':census_evidence,'previouslyKnownIdentity':dict(known)if known is not None else None,'knownIdentityMeaning':'previously recorded; this event does not revalidate it'if known is not None else'not previously obtained','observedIdentity':observed,'observedIdentityComplete':all(k in observed for k in ['pid','creationFileTime','executable']),'observedIdentityRevalidated':identity_verified,'exitObservationDoesNotProveQueryErrorCause':True}
        self.sampling_counts['events']+=1
        self.sampling_counts['confirmedExitedSkips'if disposition=='skip-confirmed-exited'else'censusOmissions'if disposition=='omit-absent-from-refreshed-job-census'else'failures']+=1
        self.sampling_events.append(event)
        if len(self.sampling_events)>SAMPLE_EVENT_LIMIT:self.sampling_events.pop(0);self.sampling_counts['dropped']+=1
    def _sample_exit(self,handle,pid,stage,error=None,partial=None,identity_verified=False,wait_check=None):
        # Sampling only, held SYNCHRONIZE handle with positive exact-Job membership.
        # Normal pre-identity wait stays zero; only tagged errors get one grace wait.
        if error is not None and(not isinstance(error,ProcessQueryError)or error.pid!=pid or error.query_stage not in ['creation-time','executable-image','private-memory']):
            self._sample_note(pid,stage,'abort-unrecognized-query-error',True,error,partial,identity_verified)
            raise RuntimeError('Only a specific held-member query error may get a sampling exit check')from error
        timing={'requestedMs':0,'elapsedMs':0,'remainingRunBeforeMs':None,'remainingRunAfterMs':None,'aggregateBeforeMs':self.sample_grace_remaining_ms,'aggregateAfterMs':self.sample_grace_remaining_ms,'aggregateCharge':'requested timeout; early returns do not replenish','callbackFailure':None}
        result=wait_error=None
        def budget(phase):
            key='remainingRun'+phase.title()+'Ms'
            try:
                value=float(wait_check())
                if not math.isfinite(value):raise SamplingBudgetError('Unknown nonfinite sampling wait budget')
                timing[key]=value
                if value<=0:raise SamplingBudgetError('Original sampling wait deadline expired',value)
                return value
            except BaseException as exc:
                remaining=getattr(exc,'remaining_ms',None)
                if remaining is not None and math.isfinite(remaining):timing[key]=remaining
                timing['callbackFailure']={'phase':phase,'type':type(exc).__name__,'error':str(exc)}
                self._sample_note(pid,stage,'abort-clock-stop-'+phase,True,error,partial,identity_verified,result,wait_error,timing)
                raise exc from error
        if error is not None:
            before=self.tick_ms();remaining=budget('before');callback_elapsed=self.tick_ms()-before
            if callback_elapsed<0:
                self._sample_note(pid,stage,'abort-measurement-clock',True,error,partial,identity_verified,None,None,timing)
                raise SamplingBudgetError('Sampling uptime moved backwards',remaining)from error
            timing['requestedMs']=int(max(0,min(SAMPLE_WAIT_BUDGET_MS,self.sample_grace_remaining_ms,remaining-callback_elapsed)))
            self.sample_grace_remaining_ms-=timing['requestedMs'];timing['aggregateAfterMs']=self.sample_grace_remaining_ms
        started=self.tick_ms();result=int(self.k.WaitForSingleObject(handle,timing['requestedMs']))
        wait_error=ctypes.get_last_error()if result==WAIT_FAILED else None # Before clock/callback APIs.
        timing['elapsedMs']=self.tick_ms()-started;timing['elapsedExceededRequested']=timing['elapsedMs']>timing['requestedMs']
        if error is not None:budget('after') # STOP/deadline remains fatal even if signaled.
        if timing['elapsedMs']<0:
            self._sample_note(pid,stage,'abort-measurement-clock',True,error,partial,identity_verified,result,wait_error,timing)
            raise SamplingBudgetError('Sampling uptime moved backwards')from error
        if result==WAIT_TIMEOUT and error is None:return False
        disposition='skip-confirmed-exited'if result==WAIT_OBJECT_0 else'abort-live-query-error'if result==WAIT_TIMEOUT else'abort-failed-or-unexpected-wait'
        self._sample_note(pid,stage,disposition,True,error,partial,identity_verified,result,wait_error,timing)
        if result==WAIT_OBJECT_0:return True
        if result==WAIT_TIMEOUT:return False # Caller re-raises its original error.
        raise RuntimeError('Sampling exit wait failed or unexpected: '+str(result)+'; Win32='+str(wait_error))from error
    def sample(self,wait_check=None):
        self.sample_grace_remaining_ms=SAMPLE_WAIT_BUDGET_MS
        records=[];self.sample_sequence+=1;self.last_sample={'sequence':self.sample_sequence,'complete':False,'members':records,'sumPrivateBytes':0,'job':None}
        try:
            self.sample_initial_census=self.sample_census();self.last_sample['initialCensus']=self.sample_initial_census
            if not self.sample_initial_census['complete']:
                exc=OSError(self.sample_initial_census['queryWin32Error']or 0,'Initial sampling census is incomplete/malformed')
                self._sample_note(None,'initial-job-census','abort-incomplete-census',False,exc,census_evidence={'initialCensus':self.sample_initial_census});raise exc
            for pid in self.sample_initial_census['pids']:
                # Error 87 may omit one memory observation ONLY after a complete
                # fresh same-Job census and all safety/accounting/budget checks.
                # This gives no lifetime identity or termination authority.
                h=self.k.OpenProcess(0x1000|0x400|0x10|0x100000|1,False,pid)
                if not h:
                    error=ctypes.get_last_error();exc=OSError(error,'Open sampling member handle')
                    if error==87:self._sample_absent_from_census(pid,exc,wait_check);continue
                    self._sample_note(pid,'open-process','abort-no-owned-handle',False,exc);raise exc
                try:
                    try:owned=self.contains(h)
                    except BaseException as exc:
                        self._sample_note(pid,'job-membership','abort-membership-query',False,exc);raise
                    if not owned:
                        exc=RuntimeError('Sample PID is not inside the exact owned Job; no exit inference')
                        self._sample_note(pid,'job-membership','abort-not-owned',False,exc);raise exc
                    if self._sample_exit(h,pid,'pre-identity-exit-check'):continue
                    try:who=self.remember(h,pid)
                    except ProcessQueryError as exc:
                        if self._sample_exit(h,pid,exc.query_stage,exc,exc.partial_identity,wait_check=wait_check):continue
                        raise
                    except BaseException as exc:
                        self._sample_note(pid,'strict-identity-validation','abort-identity-validation',True,exc);raise
                    mem=MEMORY();mem.cb=ctypes.sizeof(mem)
                    try:process_query_check(self.p.GetProcessMemoryInfo(h,ctypes.byref(mem),mem.cb),pid,'private-memory','Read task member private/working-set memory',who)
                    except ProcessQueryError as exc:
                        if self._sample_exit(h,pid,exc.query_stage,exc,exc.partial_identity,True,wait_check):continue
                        raise
                    records.append({**who,'privateBytes':mem.PrivateUsage,'workingSetBytes':mem.WorkingSetSize,'peakWorkingSetBytes':mem.PeakWorkingSetSize})
                finally:self.k.CloseHandle(h)
            result={'members':records,'sumPrivateBytes':sum(r['privateBytes']for r in records),'job':self.info()}
            self.last_sample.update(result);self.last_sample['complete']=True;return result
        except BaseException as exc:
            self.last_sample.update({'error':str(exc),'exceptionType':type(exc).__name__,'sumPrivateBytes':sum(r['privateBytes']for r in records)})
            raise
    def terminate_exact(self,handle,pid,code):
        expected=self.known.get(pid)
        if pid==os.getpid():raise RuntimeError('Never explicitly terminate the controller before durable receipts')
        if not expected or not self.contains(handle)or self.identity(handle,pid)!=expected:raise RuntimeError('Refused termination: exact handle/creation/executable/Job identity unavailable')
        check(self.k.TerminateProcess(handle,code),'Stop exact disposable task-owned lifetime');return expected
    def finish(self):
        # Receipts must be durable BEFORE this call. Normal close cannot kill the
        # controller itself; disarm only when the only remaining member is self.
        current=self.members()
        if current!=[os.getpid()] and sorted(current)!=[os.getpid()]:raise RuntimeError('Children remain; do not claim retirement or disarm kill-on-close')
        if self.identity(self.k.GetCurrentProcess(),os.getpid())!=self.me:raise RuntimeError('Controller identity changed')
        limits=EXTENDED();check(self.k.QueryInformationJobObject(self.h,9,ctypes.byref(limits),ctypes.sizeof(limits),None),'Read final Job limit state');limits.BasicLimitInformation.LimitFlags&=~0x2000
        check(self.k.SetInformationJobObject(self.h,9,ctypes.byref(limits),ctypes.sizeof(limits)),'Disarm normal kill-on-close after all children exit');self.disarmed=True
        return {'childrenVerifiedExited':True,'membersAtDisarm':current,'killOnCloseDisarmed':True,'controllerExitPending':True}
    def close(self):
        if self.h:self.k.CloseHandle(self.h);self.h=None
