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
    p=subprocess.Popen(command,cwd=cwd,stdin=subprocess.PIPE if input_bytes is not None else subprocess.DEVNULL,
        stdout=subprocess.PIPE,stderr=subprocess.PIPE,creationflags=getattr(subprocess,"CREATE_NO_WINDOW",0))
    receipt={"pid":p.pid,"executable":str(Path(command[0]).resolve()),"arguments":command[1:],
        "ownerTask":OWNER,"project":"Tinderbox","purpose":purpose,"regions":regions,
        "cwd":str(Path(cwd).resolve()),"startedAt":started.isoformat(),"deadlineSeconds":timeout,
        "intendedExpiry":(started+datetime.timedelta(seconds=timeout)).isoformat(),
        "identity":"the immutable Popen object/owned process handle returned by this exact launch",
        "port":None,"retained":False,"foreground":True,"hiddenOnWindows":True,
        "endCondition":"finite source page completes or deadline expires",
        "stopMethod":"owning Popen handle on timeout; never reopen a PID or terminate by executable name"}
    journal(journal_path,"started",receipt)
    timed_out=False
    try:
        try:stdout,stderr=p.communicate(input_bytes,timeout=timeout)
        except subprocess.TimeoutExpired:
            timed_out=True
            p.kill()
            stdout,stderr=p.communicate(timeout=5)
    finally:
        if p.poll() is None:
            p.kill();p.wait(timeout=5)
    receipt.update({"exitCode":p.returncode,"timedOut":timed_out,"exited":p.poll() is not None,
        "endedAt":datetime.datetime.now(datetime.timezone.utc).isoformat(),
        "elapsedMs":(time.perf_counter()-clock)*1000,"releasedPorts":[],
        "cleanup":"finite foreground child exited; no port or retained process",
        "cpuAccounting":"calculation workers report their own actual process CPU; no post-exit executable query"})
    journal(journal_path,"exited",receipt)
    return stdout,stderr,receipt
