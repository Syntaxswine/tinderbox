"""Finite foreground source subprocesses; no service, registry or Win32 queries."""
import datetime
import json
import os
import subprocess
import time
from pathlib import Path
OWNER="01a17ea0-1362-7d13-a42d-f4a5fcff8902"

def journal(path,event,value):
    if path:
        with Path(path).open("a",encoding="utf-8",newline="\n") as f:
            f.write(json.dumps({"event":event,**value},separators=(",",":"))+"\n")
            f.flush();os.fsync(f.fileno())

def run_owned(command,cwd,purpose,regions,timeout=60,input_bytes=None,journal_path=None):
    assert 0<regions<=256 and 0<timeout<=60
    started=datetime.datetime.now(datetime.timezone.utc);clock=time.perf_counter()
    receipt={"executable":str(Path(command[0]).resolve()),"arguments":command[1:],
        "ownerTask":OWNER,"project":"Tinderbox","purpose":purpose,"regions":regions,
        "cwd":str(Path(cwd).resolve()),"startedAt":started.isoformat(),"deadlineSeconds":timeout,
        "intendedExpiry":(started+datetime.timedelta(seconds=timeout)).isoformat(),
        "identity":"the immutable Popen object/owned process handle returned by this exact launch",
        "port":None,"retained":False,"foreground":True,"hiddenOnWindows":True,
        "endCondition":"finite source page completes or deadline expires",
        "stopMethod":"owning Popen handle on timeout or exception; never reopen a PID or terminate by executable name"}
    stdout=stderr=b"";timed_out=False;failure=None;phase="launch"
    p=subprocess.Popen(command,cwd=cwd,stdin=subprocess.PIPE if input_bytes is not None else subprocess.DEVNULL,
        stdout=subprocess.PIPE,stderr=subprocess.PIPE,creationflags=getattr(subprocess,"CREATE_NO_WINDOW",0))
    # Every operation after a successful launch is protected, including journals.
    try:
        receipt["pid"]=p.pid;receipt["terminationRequested"]=False
        phase="journal-started";journal(journal_path,"started",receipt)
        phase="communicate"
        try:stdout,stderr=p.communicate(input_bytes,timeout=timeout)
        except subprocess.TimeoutExpired:
            timed_out=True;receipt["terminationRequested"]=True
            p.kill()
            stdout,stderr=p.communicate(timeout=5)
    except BaseException as error:
        failure=error;receipt["failurePhase"]=phase
        raise
    finally:
        cleanup_errors=[]
        try:
            if p.poll() is None:
                receipt["terminationRequested"]=True
                p.kill()
        except BaseException as error:cleanup_errors.append(error)
        try:p.wait(timeout=5)
        except BaseException as error:cleanup_errors.append(error)
        finally:
            for pipe in (p.stdin,p.stdout,p.stderr):
                if pipe is not None:
                    try:pipe.close()
                    except BaseException as error:cleanup_errors.append(error)
        receipt.update({"exitCode":p.returncode,"timedOut":timed_out,"exited":p.returncode is not None,
            "endedAt":datetime.datetime.now(datetime.timezone.utc).isoformat(),
            "elapsedMs":(time.perf_counter()-clock)*1000,"releasedPorts":[],
            "cleanup":"finite foreground child exited; no port or retained process" if p.returncode is not None else "child exit not confirmed",
            "exitEvidence":"wait/returncode from this exact owned Popen object",
            "cpuAccounting":"calculation workers report their own actual process CPU; no post-exit executable query"})
        if cleanup_errors:
            receipt["cleanupErrors"]=[{"type":type(e).__name__,"message":str(e)} for e in cleanup_errors]
        journal_error=None
        try:journal(journal_path,"exited",receipt)
        except BaseException as error:
            journal_error=error
            receipt["finalJournalError"]={"type":type(error).__name__,"message":str(error)}
        error=failure or (cleanup_errors[0] if cleanup_errors else journal_error)
        if error is not None:
            # Keep the original exception and make cleanup evidence available even
            # when no journal can be created. Notes also survive a normal traceback.
            error.process_cleanup_receipt=receipt
            error.add_note("Owned child cleanup: "+json.dumps(receipt,separators=(",",":")))
            if failure is None:raise error
    return stdout,stderr,receipt
