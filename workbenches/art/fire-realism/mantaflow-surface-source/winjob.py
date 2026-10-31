"""Reviewed Windows Job/handle concepts, extended to cover the controller itself.
No Job or process is created merely by importing this module. OS enforcement
still requires actual separately permitted execution; static checks cannot prove it.
"""
import ctypes,os
from ctypes import wintypes as W
from pathlib import Path
SIZE=ctypes.c_size_t;HANDLE=W.HANDLE
WAIT_OBJECT_0=0;WAIT_TIMEOUT=258;WAIT_FAILED=0xffffffff;SAMPLE_EVENT_LIMIT=64
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

def process_query_check(value,pid,stage,label,partial):
    if not value:
        error=ctypes.get_last_error() # Capture BEFORE a wait or any further API.
        raise ProcessQueryError(error,pid,stage,label,partial)

class OwnedJob:
    def __init__(self,process_limit,aggregate_limit):
        if os.name!='nt':raise RuntimeError('Windows Job enforcement required; no fallback')
        self.k=ctypes.WinDLL('kernel32',use_last_error=True);self.p=ctypes.WinDLL('psapi',use_last_error=True);self.h=None;self.joined=False;self.disarmed=False;self.known={};self.process_limit=process_limit;self.aggregate_limit=aggregate_limit;self.limit_readback={'status':'not-queried','actual':None};self.sampling_events=[];self.sampling_counts={'events':0,'confirmedExitedSkips':0,'failures':0,'dropped':0};self.sample_sequence=0;self.last_sample=None
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
    def sampling_report(self):
        return {'counts':dict(self.sampling_counts),'eventLimit':SAMPLE_EVENT_LIMIT,'events':[dict(e)for e in self.sampling_events],'lastSample':self.last_sample}
    def _sample_note(self,pid,stage,disposition,owned,error=None,partial=None,identity_verified=False,wait_result=None,wait_error=None):
        known=self.known.get(pid);observed=dict(partial or {'pid':pid})
        event={'sequence':self.sample_sequence,'pid':pid,'queryStage':stage,'disposition':disposition,'exactJobMembershipConfirmed':owned,'originalWin32Error':getattr(error,'original_win32_error',getattr(error,'winerror',None)or getattr(error,'errno',None)),'error':str(error)if error is not None else None,'waitResult':wait_result,'waitWin32Error':wait_error,'previouslyKnownIdentity':dict(known)if known is not None else None,'knownIdentityMeaning':'previously recorded; this event does not revalidate it'if known is not None else'not previously obtained','observedIdentity':observed,'observedIdentityComplete':all(k in observed for k in ['pid','creationFileTime','executable']),'observedIdentityRevalidated':identity_verified,'exitObservationDoesNotProveQueryErrorCause':True}
        self.sampling_counts['events']+=1
        self.sampling_counts['confirmedExitedSkips'if disposition=='skip-confirmed-exited'else'failures']+=1
        self.sampling_events.append(event)
        if len(self.sampling_events)>SAMPLE_EVENT_LIMIT:self.sampling_events.pop(0);self.sampling_counts['dropped']+=1
    def _sample_exit(self,handle,pid,stage,error=None,partial=None,identity_verified=False):
        # Called ONLY by sample(), with a held SYNCHRONIZE handle whose exact
        # Job membership was positively checked. No generic ignore-error path.
        if error is not None and(not isinstance(error,ProcessQueryError)or error.pid!=pid or error.query_stage not in ['creation-time','executable-image','private-memory']):
            self._sample_note(pid,stage,'abort-unrecognized-query-error',True,error,partial,identity_verified)
            raise RuntimeError('Only a specific held-member query error may get a sampling exit check')from error
        result=int(self.k.WaitForSingleObject(handle,0))
        wait_error=ctypes.get_last_error()if result==WAIT_FAILED else None
        if result==WAIT_TIMEOUT and error is None:return False
        disposition='skip-confirmed-exited'if result==WAIT_OBJECT_0 else'abort-live-query-error'if result==WAIT_TIMEOUT else'abort-failed-or-unexpected-wait'
        self._sample_note(pid,stage,disposition,True,error,partial,identity_verified,result,wait_error)
        if result==WAIT_OBJECT_0:return True
        if result==WAIT_TIMEOUT:return False # Caller re-raises its original error.
        raise RuntimeError('Sampling exit wait failed or unexpected: '+str(result)+'; Win32='+str(wait_error))from error
    def sample(self):
        records=[];self.sample_sequence+=1;self.last_sample={'sequence':self.sample_sequence,'complete':False,'members':records,'sumPrivateBytes':0,'job':None}
        try:
            for pid in self.members():
                # No missing/denied OpenProcess is treated as a proved exit.
                # Termination's separate open_member()/identity policy is intact.
                h=self.k.OpenProcess(0x1000|0x400|0x10|0x100000|1,False,pid)
                if not h:
                    error=ctypes.get_last_error();exc=OSError(error,'Open sampling member handle')
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
                        if self._sample_exit(h,pid,exc.query_stage,exc,exc.partial_identity):continue
                        raise
                    except BaseException as exc:
                        self._sample_note(pid,'strict-identity-validation','abort-identity-validation',True,exc);raise
                    mem=MEMORY();mem.cb=ctypes.sizeof(mem)
                    try:process_query_check(self.p.GetProcessMemoryInfo(h,ctypes.byref(mem),mem.cb),pid,'private-memory','Read task member private/working-set memory',who)
                    except ProcessQueryError as exc:
                        if self._sample_exit(h,pid,exc.query_stage,exc,exc.partial_identity,True):continue
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
