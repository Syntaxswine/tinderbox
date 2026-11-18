"""One-shot bounded source delta; reuse the exact existing exception-safe owned-handle runner."""
import datetime,os,sys,time,traceback
sys.dont_write_bytecode=True
from common import *
from lifecycle import run_owned
NODE=r'C:\Program Files\nodejs\node.exe'

def main():
    assert sys.argv[1:]==['batch'] and not (HERE/'batch.json').exists(), 'Fresh batch only; preserve failed attempts'
    deadline=time.monotonic()+540;started=time.monotonic()
    batch={'owner':'Tinderbox UI specialist: codex/shared-map-tools-ui','pid':os.getpid(),'executable':sys.executable,'arguments':['-B',str(HERE/'run.py'),'batch'],'cwd':str(ROOT),'purpose':'Closed-flag-only source delta; original baluster first, then eligible previously blocked cases','startedAt':datetime.datetime.now(datetime.timezone.utc).isoformat(),'intendedExpiry':(datetime.datetime.now(datetime.timezone.utc)+datetime.timedelta(seconds=600)).isoformat(),'foreground':True,'maximumSeconds':600,'workingDeadlineSeconds':540,'endCondition':'Checked source delta completes or preserve first failure','stopMethod':'Finite foreground exit; all child handles cleaned by pinned runner','status':'preparing','completedPages':[],'failedPages':[],'retainedHelpers':[],'ports':[]}
    for name in ['pages','checks','runs','dictionaries']:(HERE/name).mkdir(exist_ok=True)
    def update(status):
        batch['status']=status;batch['elapsedSeconds']=time.monotonic()-started;write(HERE/'batch.json',batch)
    update('preparing')
    try:
        from hydrate import hydrate
        pins=hydrate(deadline)
        for descriptor in pins['pages']:
            n=descriptor['page'];batch['currentPage']=n
            for mode in ['page','verify']:
                remaining(deadline);label=mode+'-%03d'%n;update(label)
                assert not (HERE/'runs'/(label+'.json')).exists()
                stdout,stderr,receipt=run_owned([NODE,'--max-old-space-size=384',str(HERE/'page.mjs'),mode,str(n)],ROOT,'UI closed-flag-only source '+label,len(descriptor['regionIds']),min(60,remaining(deadline)-10),journal_path=HERE/'runs/process-events.jsonl')
                (HERE/'runs'/(label+'.log')).write_bytes(stdout)
                if stderr:(HERE/'runs'/(label+'.stderr.log')).write_bytes(stderr)
                receipt.update({'label':label,'workerSha256':sha((HERE/'page.mjs').read_bytes()),'coordinatorSha256':sha((HERE/'run.py').read_bytes()),'lifecycleSha256':sha((HERE/'lifecycle.py').read_bytes()),'stdoutSha256':sha(stdout),'stderrSha256':sha(stderr)})
                write(HERE/'runs'/(label+'.json'),receipt)
                assert receipt['exitCode']==0 and receipt['exited'] and not receipt['timedOut'], label+' failed; stop and preserve'
                print(stdout.decode().strip(),flush=True)
            batch['completedPages'].append(n);update('page-verified')
        from finalize import record
        update('assembling');summary=record()
        from check import check
        update('auditing');audit=check(deadline);write(HERE/'audit.json',audit)
        batch['summary']=summary;batch['status']='complete'
    except BaseException as error:
        batch['status']='failed-preserved';batch['failure']={'type':type(error).__name__,'message':str(error)}
        if batch.get('currentPage') not in batch['completedPages']:batch['failedPages'].append(batch.get('currentPage'))
        receipt=getattr(error,'process_cleanup_receipt',None)
        if receipt:write(HERE/'exception-cleanup.json',receipt)
        (HERE/'failure.txt').write_text(traceback.format_exc(),encoding='utf-8')
        raise
    finally:
        batch['endedAt']=datetime.datetime.now(datetime.timezone.utc).isoformat();batch['elapsedSeconds']=time.monotonic()-started;write(HERE/'batch.json',batch)
    print(json.dumps({'status':batch['status'],'elapsedSeconds':batch['elapsedSeconds'],'summary':batch['summary']}),flush=True)

if __name__=='__main__':main()
