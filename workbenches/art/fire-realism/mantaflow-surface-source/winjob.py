"""Reviewed Windows Job/handle concepts, extended to cover the controller itself.
No Job or process is created merely by importing this module. OS enforcement
still requires actual separately permitted execution; static checks cannot prove it.
"""
import ctypes,os
from ctypes import wintypes as W
from pathlib import Path
SIZE=ctypes.c_size_t;HANDLE=W.HANDLE
class IO(ctypes.Structure):_fields_=[(n,ctypes.c_ulonglong)for n in ['ReadOperationCount','WriteOperationCount','OtherOperationCount','ReadTransferCount','WriteTransferCount','OtherTransferCount']]
class BASIC(ctypes.Structure):_fields_=[('PerProcessUserTimeLimit',ctypes.c_longlong),('PerJobUserTimeLimit',ctypes.c_longlong),('LimitFlags',W.DWORD),('MinimumWorkingSetSize',SIZE),('MaximumWorkingSetSize',SIZE),('ActiveProcessLimit',W.DWORD),('Affinity',SIZE),('PriorityClass',W.DWORD),('SchedulingClass',W.DWORD)]
class EXTENDED(ctypes.Structure):_fields_=[('BasicLimitInformation',BASIC),('IoInfo',IO),('ProcessMemoryLimit',SIZE),('JobMemoryLimit',SIZE),('PeakProcessMemoryUsed',SIZE),('PeakJobMemoryUsed',SIZE)]
class MEMORY(ctypes.Structure):_fields_=[('cb',W.DWORD),('PageFaultCount',W.DWORD)]+[(n,SIZE)for n in ['PeakWorkingSetSize','WorkingSetSize','QuotaPeakPagedPoolUsage','QuotaPagedPoolUsage','QuotaPeakNonPagedPoolUsage','QuotaNonPagedPoolUsage','PagefileUsage','PeakPagefileUsage','PrivateUsage']]

def check(value,label):
    if not value:raise OSError(ctypes.get_last_error(),label)

class OwnedJob:
    def __init__(self,process_limit,aggregate_limit):
        if os.name!='nt':raise RuntimeError('Windows Job enforcement required; no fallback')
        self.k=ctypes.WinDLL('kernel32',use_last_error=True);self.p=ctypes.WinDLL('psapi',use_last_error=True);self.h=None;self.joined=False;self.disarmed=False;self.known={};self.process_limit=process_limit;self.aggregate_limit=aggregate_limit
        k=self.k
        for name,args,result in [('CreateJobObjectW',[ctypes.c_void_p,W.LPCWSTR],HANDLE),('SetInformationJobObject',[HANDLE,ctypes.c_int,ctypes.c_void_p,W.DWORD],W.BOOL),('QueryInformationJobObject',[HANDLE,ctypes.c_int,ctypes.c_void_p,W.DWORD,ctypes.POINTER(W.DWORD)],W.BOOL),('AssignProcessToJobObject',[HANDLE,HANDLE],W.BOOL),('IsProcessInJob',[HANDLE,HANDLE,ctypes.POINTER(W.BOOL)],W.BOOL),('GetProcessTimes',[HANDLE,*([ctypes.POINTER(W.FILETIME)]*4)],W.BOOL),('QueryFullProcessImageNameW',[HANDLE,W.DWORD,W.LPWSTR,ctypes.POINTER(W.DWORD)],W.BOOL),('OpenProcess',[W.DWORD,W.BOOL,W.DWORD],HANDLE),('TerminateProcess',[HANDLE,W.UINT],W.BOOL),('GetExitCodeProcess',[HANDLE,ctypes.POINTER(W.DWORD)],W.BOOL),('CloseHandle',[HANDLE],W.BOOL)]:
            fn=getattr(k,name);fn.argtypes=args;fn.restype=result
        k.GetCurrentProcess.restype=HANDLE;k.GetTickCount64.restype=ctypes.c_ulonglong
        self.p.GetProcessMemoryInfo.argtypes=[HANDLE,ctypes.POINTER(MEMORY),W.DWORD];self.p.GetProcessMemoryInfo.restype=W.BOOL
        self.me=self.identity(k.GetCurrentProcess(),os.getpid())
        self.h=k.CreateJobObjectW(None,None);check(self.h,'Create task-owned Job')
        limits=EXTENDED();limits.BasicLimitInformation.LimitFlags=0x100|0x200|0x2000;limits.ProcessMemoryLimit=process_limit;limits.JobMemoryLimit=aggregate_limit
        check(k.SetInformationJobObject(self.h,9,ctypes.byref(limits),ctypes.sizeof(limits)),'Set hard per-process/aggregate committed limits')
    def tick_ms(self):return int(self.k.GetTickCount64())
    def identity(self,handle,pid):
        a,b,c,d=(W.FILETIME()for _ in range(4));check(self.k.GetProcessTimes(handle,*[ctypes.byref(x)for x in [a,b,c,d]]),'Read exact process creation time')
        text=ctypes.create_unicode_buffer(32768);length=W.DWORD(len(text));check(self.k.QueryFullProcessImageNameW(handle,0,text,ctypes.byref(length)),'Read exact process executable')
        return {'pid':pid,'creationFileTime':(a.dwHighDateTime<<32)|a.dwLowDateTime,'executable':str(Path(text.value).resolve())}
    def join_self(self):
        check(self.k.AssignProcessToJobObject(self.h,self.k.GetCurrentProcess()),'Join supervisor to owned Job; nested failure stops before Blender')
        self.joined=True;self.known[os.getpid()]=self.me
        if not self.contains(self.k.GetCurrentProcess()):raise RuntimeError('Supervisor not inside own memory Job')
        actual=self.info()
        if actual['processLimitBytes']!=self.process_limit or actual['aggregateLimitBytes']!=self.aggregate_limit or actual['flags']&0x2300!=0x2300:raise RuntimeError('Hard Job limits did not read back')
        return actual
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
    def sample(self):
        records=[]
        for pid in self.members():
            h=self.open_member(pid)
            if h is None:continue
            try:
                who=self.remember(h,pid);mem=MEMORY();mem.cb=ctypes.sizeof(mem);check(self.p.GetProcessMemoryInfo(h,ctypes.byref(mem),mem.cb),'Read task member private/working-set memory')
                records.append({**who,'privateBytes':mem.PrivateUsage,'workingSetBytes':mem.WorkingSetSize,'peakWorkingSetBytes':mem.PeakWorkingSetSize})
            finally:self.k.CloseHandle(h)
        return {'members':records,'sumPrivateBytes':sum(r['privateBytes']for r in records),'job':self.info()}
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
