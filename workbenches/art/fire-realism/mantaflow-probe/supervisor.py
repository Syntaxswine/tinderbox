"""Windows-only finite authoring supervisor; never launches a production bake.

Every child has a guard/registration barrier, exact identity, a hard Windows Job
memory limit and a shared absolute wall deadline. Derived scratch is preserved
on failure. No registry, driver, install or system settings are changed.
"""
import argparse, ctypes, hashlib, json, os, subprocess, sys, time, traceback
from ctypes import wintypes as W
from datetime import datetime, timezone
from pathlib import Path

OWNER = '01a17e9b-a6db-7490-94cd-7d863747e5d3'
ROOT = Path(__file__).resolve().parents[4]
HERE = Path(__file__).resolve().parent
CLEANUP = Path('C:/Users/baals/Local Storage/AI/GTP/helper-lifecycle/cleanup.py')
K = ctypes.WinDLL('kernel32', use_last_error=True)
P = ctypes.WinDLL('psapi', use_last_error=True)
SIZE = ctypes.c_size_t
HANDLE = W.HANDLE

class IO(ctypes.Structure):
    _fields_ = [(n, ctypes.c_ulonglong) for n in ['ReadOperationCount','WriteOperationCount','OtherOperationCount','ReadTransferCount','WriteTransferCount','OtherTransferCount']]
class BASIC(ctypes.Structure):
    _fields_ = [('PerProcessUserTimeLimit',ctypes.c_longlong),('PerJobUserTimeLimit',ctypes.c_longlong),('LimitFlags',W.DWORD),('MinimumWorkingSetSize',SIZE),('MaximumWorkingSetSize',SIZE),('ActiveProcessLimit',W.DWORD),('Affinity',SIZE),('PriorityClass',W.DWORD),('SchedulingClass',W.DWORD)]
class EXTENDED(ctypes.Structure):
    _fields_ = [('BasicLimitInformation',BASIC),('IoInfo',IO),('ProcessMemoryLimit',SIZE),('JobMemoryLimit',SIZE),('PeakProcessMemoryUsed',SIZE),('PeakJobMemoryUsed',SIZE)]
class MEMORY(ctypes.Structure):
    _fields_ = [('cb',W.DWORD),('PageFaultCount',W.DWORD)] + [(n,SIZE) for n in ['PeakWorkingSetSize','WorkingSetSize','QuotaPeakPagedPoolUsage','QuotaPagedPoolUsage','QuotaPeakNonPagedPoolUsage','QuotaNonPagedPoolUsage','PagefileUsage','PeakPagefileUsage','PrivateUsage']]
K.CreateJobObjectW.argtypes=[ctypes.c_void_p,W.LPCWSTR]; K.CreateJobObjectW.restype=HANDLE
K.SetInformationJobObject.argtypes=[HANDLE,ctypes.c_int,ctypes.c_void_p,W.DWORD]; K.SetInformationJobObject.restype=W.BOOL
K.AssignProcessToJobObject.argtypes=[HANDLE,HANDLE]; K.AssignProcessToJobObject.restype=W.BOOL
K.SetProcessWorkingSetSizeEx.argtypes=[HANDLE,SIZE,SIZE,W.DWORD]; K.SetProcessWorkingSetSizeEx.restype=W.BOOL
K.GetProcessTimes.argtypes=[HANDLE,ctypes.POINTER(W.FILETIME),ctypes.POINTER(W.FILETIME),ctypes.POINTER(W.FILETIME),ctypes.POINTER(W.FILETIME)]; K.GetProcessTimes.restype=W.BOOL
K.QueryFullProcessImageNameW.argtypes=[HANDLE,W.DWORD,W.LPWSTR,ctypes.POINTER(W.DWORD)]; K.QueryFullProcessImageNameW.restype=W.BOOL
K.GetCurrentProcess.restype=HANDLE
K.TerminateProcess.argtypes=[HANDLE,W.UINT]; K.TerminateProcess.restype=W.BOOL
K.CloseHandle.argtypes=[HANDLE]; K.CloseHandle.restype=W.BOOL
P.GetProcessMemoryInfo.argtypes=[HANDLE,ctypes.POINTER(MEMORY),W.DWORD]; P.GetProcessMemoryInfo.restype=W.BOOL

def check(value, label):
    if not value: raise OSError(ctypes.get_last_error(), label)
def utc(epoch=None):
    return datetime.fromtimestamp(time.time() if epoch is None else epoch,timezone.utc).isoformat().replace('+00:00','Z')
def save(path,value):
    Path(path).write_text(json.dumps(value,indent=2)+'\n',encoding='utf-8',newline='\n')
def sha(path):
    h=hashlib.sha256()
    with Path(path).open('rb') as f:
        for b in iter(lambda:f.read(1024*1024),b''): h.update(b)
    return h.hexdigest()
def identity(handle,pid):
    a,b,c,d=(W.FILETIME() for _ in range(4)); check(K.GetProcessTimes(handle,ctypes.byref(a),ctypes.byref(b),ctypes.byref(c),ctypes.byref(d)),'GetProcessTimes')
    name=ctypes.create_unicode_buffer(32768); length=W.DWORD(len(name)); check(K.QueryFullProcessImageNameW(handle,0,name,ctypes.byref(length)),'QueryFullProcessImageNameW')
    return {'pid':pid,'creationFileTime':(a.dwHighDateTime<<32)|a.dwLowDateTime,'executable':str(Path(name.value).resolve())}
def memory(handle):
    m=MEMORY();m.cb=ctypes.sizeof(m);check(P.GetProcessMemoryInfo(handle,ctypes.byref(m),m.cb),'GetProcessMemoryInfo')
    return {'privateBytes':m.PrivateUsage,'workingSetBytes':m.WorkingSetSize,'peakWorkingSetBytes':m.PeakWorkingSetSize}
def bytes_used(directory):
    total=0
    for p in directory.rglob('*'):
        try:
            if p.is_file(): total+=p.stat().st_size
        except FileNotFoundError: pass
    return total

def register(pid,label,args,executable,out,run,source_files,stop):
    spec={'pid':pid,'kind':'task_owned','purpose':'Delegated stage1 Mantaflow export probe: '+label,'ownershipEvidence':'Architect explicitly authorized the bounded probe in root chat; this PID was created by this saved supervisor lifetime.','owners':[OWNER],'state':'stateless','safeToTerminateReason':'All original sources/settings/restart inputs are durable. Process only derives disposable authoring cache and exports; interrupted outputs are preserved and marked invalid. No user documents or active game are opened.','sourceFiles':[str(p)for p in source_files],'helperDirectory':str(out),'ports':[],'expiresAt':utc(run['deadlineEpoch']),'stop':{'method':'stop_file','path':str(stop)},'restart':{'cwd':str(ROOT),'executable':str(executable),'args':args,'dependencies':['Windows x64 Python3.12 standard library','Verified portable Blender4.5.15 build5afeabba6097; no installed dependencies'],'inputs':[str(HERE/'settings.json'),str(out/'run.json')],'outputs':[str(out)],'pendingWork':'Explicit manual authoring probe only; never automatically restart or reuse an expired deadline. Partial exports are invalid unless validated after natural completion.','secretReferences':[]}}
    path=out/(label+'-registration-spec.json');save(path,spec)
    result=subprocess.run([sys.executable,str(CLEANUP),'register',str(path)],capture_output=True,text=True,timeout=20,creationflags=subprocess.CREATE_NO_WINDOW)
    (out/(label+'-registration-receipt.json')).write_text(result.stdout,encoding='utf-8')
    if result.returncode: raise RuntimeError('Lifecycle registration failed:'+result.stderr[-1000:])
    return str(out/(label+'-registration-receipt.json'))

def main():
    parser=argparse.ArgumentParser();parser.add_argument('--phase',choices=['prepare','bake','metadata'],required=True);parser.add_argument('--tool-record',required=True);parser.add_argument('--output',required=True);parser.add_argument('--repair',action='store_true');a=parser.parse_args()
    settings=json.loads((HERE/'settings.json').read_text(encoding='utf-8'));tool=json.loads(Path(a.tool_record).read_text(encoding='utf-8'));exe=Path(tool['executable']).resolve();out=Path(a.output).resolve()
    if not out.is_relative_to(ROOT/'artifacts/qa/fire-realism/mantaflow-probe'): raise RuntimeError('Output escapes assigned authoring scratch')
    if sha(exe)!=settings['tool']['exeSha256'] or tool['authenticodeStatus']!='Valid': raise RuntimeError('Verified tool identity mismatch')
    out.mkdir(parents=True,exist_ok=True); run_file=out/'run.json'
    if run_file.exists():
        run=json.loads(run_file.read_text(encoding='utf-8'))
        if run['settingsSha256']!=sha(HERE/'settings.json'): raise RuntimeError('Settings changed within a run')
        if a.repair:
            if run['repairAttempts']>=1: raise RuntimeError('The one allowed repair was already used')
            run['repairAttempts']+=1
        elif (out/(a.phase+'-process.json')).exists(): raise RuntimeError('Phase already launched; explicit one repair required')
    else:
        if a.phase!='prepare' or a.repair: raise RuntimeError('New run must begin with prepare')
        run={'owner':OWNER,'startUtc':utc(),'deadlineEpoch':time.time()+settings['limits']['wallSeconds'],'repairAttempts':0,'settingsSha256':sha(HERE/'settings.json'),'toolExeSha256':sha(exe),'limitBytes':settings['limits']['processMemoryBytes'],'outputLimitBytes':settings['limits']['outputBytes'],'valid':False}
    if time.time()>=run['deadlineEpoch']: raise RuntimeError('Original whole-probe deadline expired; no automatic extension')
    save(run_file,run)
    if a.phase=='bake' and not (out/'prepare.json').exists(): raise RuntimeError('Prepared observed settings are required')
    tag=a.phase+('-repair'if a.repair else'');permit=out/(tag+'.permit');stop=out/(tag+'.stop');supervisor_stop=out/(tag+'-supervisor.stop')
    if permit.exists()or stop.exists()or supervisor_stop.exists(): raise RuntimeError('Control markers already exist')
    args=['--background','--factory-startup','--disable-autoexec','--threads','4','--python-exit-code','19']
    if a.phase in ['bake','metadata']: args.append(str(out/'probe.blend'))
    script=HERE/('metadata_probe.py'if a.phase=='metadata'else'blender_probe.py')
    args+=['--python',str(script),'--','--phase',a.phase,'--settings',str(HERE/'settings.json'),'--output',str(out),'--permit',str(permit),'--stop',str(stop)]
    if a.repair:args.append('--repair')
    env=os.environ.copy()
    for name,folder in [('BLENDER_USER_CONFIG','config'),('BLENDER_USER_SCRIPTS','scripts'),('BLENDER_USER_DATAFILES','datafiles'),('TEMP','temp'),('TMP','temp')]:
        d=out/folder;d.mkdir(exist_ok=True);env[name]=str(d)
    env.update({'OMP_NUM_THREADS':'4','OMP_DYNAMIC':'FALSE'})
    sources=[HERE/n for n in ['supervisor.py','blender_probe.py','settings.json','reader.mjs','check.mjs','metadata_probe.py','blender-mesh-adapter.mjs','modifier-adapter-proof.json','check-adapter.mjs','validate-existing.mjs','original-inputs.json']]+[Path(a.tool_record),ROOT/'package.json']
    sources=[p for p in sources if p.exists()]
    own_args=[str(Path(__file__).resolve()),*sys.argv[1:]]
    register(os.getpid(),tag+'-supervisor',own_args,Path(sys.executable),out,run,sources,supervisor_stop)
    child=None;job=None;process_record={'phase':a.phase,'startedAt':utc(),'deadlineUtc':utc(run['deadlineEpoch']),'owner':OWNER,'ports':[],'valid':False,'peakPrivateBytes':0,'peakWorkingSetBytes':0,'peakOutputBytes':0,'monitorIntervalSeconds':.25,'resourceSemantics':'Windows Job process+job committed-memory hard caps and hard working-set max; output byte watchdog terminates on threshold crossing (one polling interval write overshoot possible).'}
    try:
        stdout=(out/(tag+'-stdout.log')).open('wb');stderr=(out/(tag+'-stderr.log')).open('wb')
        startup=subprocess.STARTUPINFO();startup.dwFlags|=subprocess.STARTF_USESHOWWINDOW;startup.wShowWindow=0
        child=subprocess.Popen([str(exe),*args],cwd=ROOT,env=env,stdout=stdout,stderr=stderr,startupinfo=startup,creationflags=subprocess.CREATE_NO_WINDOW)
        handle=HANDLE(int(child._handle));original=identity(handle,child.pid);process_record['process']=original;save(out/(tag+'-process.json'),process_record)
        job=K.CreateJobObjectW(None,None);check(job,'CreateJobObjectW');limits=EXTENDED();limits.BasicLimitInformation.LimitFlags=0x100|0x200|0x2000;limits.ProcessMemoryLimit=run['limitBytes'];limits.JobMemoryLimit=run['limitBytes'];check(K.SetInformationJobObject(job,9,ctypes.byref(limits),ctypes.sizeof(limits)),'SetInformationJobObject');check(K.AssignProcessToJobObject(job,handle),'AssignProcessToJobObject');check(K.SetProcessWorkingSetSizeEx(handle,16*1024*1024,run['limitBytes'],4),'Hard working-set maximum')
        process_record['guards']={'jobMemoryBytes':run['limitBytes'],'processMemoryBytes':run['limitBytes'],'hardWorkingSetMaxBytes':run['limitBytes'],'killOnOwnedJobClose':True}
        process_record['registrationReceipt']=register(child.pid,tag+'-blender',args,exe,out,run,sources,stop)
        save(out/(tag+'-process.json'),process_record);permit.write_text('Guards and lifecycle registrations ready\n',encoding='utf-8')
        print(json.dumps({'launched':original,'deadlineUtc':process_record['deadlineUtc'],'phase':a.phase,'owner':OWNER,'guards':process_record['guards']}),flush=True)
        reason=None
        while child.poll()is None:
            m=memory(handle);size=bytes_used(out);process_record['peakPrivateBytes']=max(process_record['peakPrivateBytes'],m['privateBytes']);process_record['peakWorkingSetBytes']=max(process_record['peakWorkingSetBytes'],m['peakWorkingSetBytes']);process_record['peakOutputBytes']=max(process_record['peakOutputBytes'],size)
            if time.time()>=run['deadlineEpoch']: reason='Whole probe 15-minute deadline'
            elif m['privateBytes']>=run['limitBytes'] or m['workingSetBytes']>run['limitBytes']: reason='2GiB process-memory guard'
            elif size>=run['outputLimitBytes']: reason='512MiB output/cache guard'
            elif supervisor_stop.exists()or stop.exists(): reason='Explicit task stop marker'
            if reason:
                stop.write_text(reason,encoding='utf-8');process_record['stopReason']=reason
                # Give safe Python boundaries a short chance, never past absolute deadline.
                until=min(time.time()+2,run['deadlineEpoch'])
                while child.poll()is None and time.time()<until: time.sleep(.05)
                if child.poll()is None:
                    current=identity(handle,child.pid)
                    if current!=original: raise RuntimeError('Refused stop: exact child identity changed')
                    check(K.TerminateProcess(handle,88),'Terminate exact task-owned child');process_record['forcedTerminationIdentity']=current
                break
            time.sleep(.25)
        code=child.wait(timeout=10);process_record.update({'exitCode':code,'exitedAt':utc(),'naturalExit':reason is None,'valid':code==0 and reason is None});stdout.close();stderr.close()
        failure=out/(tag+'-failure.json')
        expected=out/({'prepare':'prepare.json','bake':'export-manifest.json','metadata':'metadata.json'}[a.phase])
        if not process_record['valid'] or failure.exists()or not expected.exists(): raise RuntimeError('Probe phase invalid; preserve logs/cache:'+str(code))
        if a.phase=='bake':run['valid']=True;run['completedAt']=utc();save(run_file,run)
    except BaseException as e:
        process_record['error']=str(e);process_record['traceback']=traceback.format_exc();run['valid']=False;save(run_file,run);raise
    finally:
        if child is not None and child.poll()is None:
            handle=HANDLE(int(child._handle));current=identity(handle,child.pid)
            if current==process_record.get('process'):
                check(K.TerminateProcess(handle,89),'Stop exact owned child on supervisor failure');child.wait(timeout=10);process_record['forcedTerminationIdentity']=current;process_record['valid']=False
        if job:K.CloseHandle(job)
        process_record['verifiedExited']=child is not None and child.poll()is not None;process_record['finalOutputBytes']=bytes_used(out);save(out/(tag+'-process.json'),process_record)
        print(json.dumps({'phaseComplete':a.phase,'valid':process_record['valid'],'verifiedExited':process_record['verifiedExited'],'exitCode':process_record.get('exitCode'),'peakPrivateBytes':process_record['peakPrivateBytes'],'peakOutputBytes':process_record['peakOutputBytes'],'output':str(out)}),flush=True)

if __name__=='__main__':main()
