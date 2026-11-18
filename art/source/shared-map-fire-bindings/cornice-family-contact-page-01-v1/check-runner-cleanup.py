"""One injected journal failure, one harmless finite child, no source calculation."""
import argparse,errno,hashlib,importlib.util,json,sys,time
from pathlib import Path
sys.dont_write_bytecode=True
HERE=Path(__file__).resolve().parent;ROOT=HERE.parents[3]

def check():
    spec=importlib.util.spec_from_file_location("cleanup_control_lifecycle",HERE/"lifecycle.py")
    L=importlib.util.module_from_spec(spec);spec.loader.exec_module(L)
    old=(HERE/"historical-lifecycle-6c13bc5e.py.txt").read_bytes()
    assert hashlib.sha256(old).hexdigest()==json.loads((HERE/"calculation-started.json").read_bytes())["lifecycleSha256"]
    children=[];events=[];real_popen=L.subprocess.Popen;real_journal=L.journal
    first=PermissionError(errno.EACCES,"injected launch journal creation failure","<injected>/process-events.jsonl")
    last=PermissionError(errno.EACCES,"injected exit journal creation failure","<injected>/process-events.jsonl")
    def capture(*args,**kwargs):
        child=real_popen(*args,**kwargs);children.append(child);return child
    def deny(path,event,value):
        events.append(event)
        if event=="started":
            assert len(children)==1 and children[0].poll() is None
            raise first
        assert event=="exited" and children[0].poll() is not None
        raise last
    L.subprocess.Popen=capture;L.journal=deny
    started=time.perf_counter();caught=None;record=None
    try:
        try:
            L.run_owned([sys.executable,"-B","-c","import time; time.sleep(10)"],ROOT,
                "one injected journal-write-failure cleanup control",1,15,journal_path="<injected>/process-events.jsonl")
        except PermissionError as error:
            caught=error
            assert error is first
            receipt=error.process_cleanup_receipt
            assert len(children)==1 and events==["started","exited"]
            child=children[0]
            assert child.poll() is not None and receipt["exitCode"]==child.returncode and child.returncode!=0
            assert receipt["pid"]==child.pid and receipt["exited"] and receipt["terminationRequested"]
            assert receipt["failurePhase"]=="journal-started" and not receipt["timedOut"]
            assert receipt["finalJournalError"]=={"type":"PermissionError","message":str(last)}
            assert not receipt.get("cleanupErrors") and all(pipe.closed for pipe in (child.stdout,child.stderr))
            assert any("Owned child cleanup:" in note for note in error.__notes__)
            assert time.perf_counter()-started<5,"The child must be stopped before its own ten-second expiry"
            record={"result":"INJECTED_JOURNAL_FAILURE_CLEANED","child":receipt,
                "checks":{"exactOriginalExceptionPreserved":True,"childAliveAtInitialJournalFailure":True,
                    "bothJournalWritesFailed":True,"pidAndExitEvidenceSurviveWithoutJournal":True,
                    "ownedHandleExitConfirmed":True,"stdioClosed":True,"stoppedBeforeOwnFiniteExpiry":True},
                "exception":{"type":type(error).__name__,"message":str(error)},
                "events":events,"sourceCalculationRuns":0,"nativeCompilations":0,"retainedHelpers":False}
    finally:
        L.subprocess.Popen=real_popen;L.journal=real_journal
        # A failing control also owns and cleans its exact captured child handle.
        for child in children:
            try:
                if child.poll() is None:child.kill()
                child.wait(timeout=5)
            finally:
                for pipe in (child.stdin,child.stdout,child.stderr):
                    if pipe is not None:pipe.close()
    assert caught is first and record is not None,"Expected the injected original PermissionError"
    return record

if __name__=="__main__":
    ap=argparse.ArgumentParser();ap.add_argument("--record",action="store_true");args=ap.parse_args()
    result=check()
    if args.record:
        with (HERE/"runner-cleanup-control.json").open("xb") as f:
            f.write((json.dumps(result,indent=2)+"\n").encode('ascii'))
    print(json.dumps(result,separators=(",",":")))
