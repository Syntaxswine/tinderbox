"""Bounded remaining-source delta coordinator. Uses the accepted owned runner."""
import argparse,collections,datetime,json,os,re,shutil,sys,time,traceback,uuid
from pathlib import Path
import metadata as M
sys.dont_write_bytecode=True
HERE=M.HERE;ROOT=M.ROOT;REL=M.REL
LOCAL=['metadata.py','page.mjs','run.py','authority.md','plan.json','provenance.json']
def local_pin(name):
    b=(HERE/name).read_bytes();return {'name':name,'bytes':len(b),'sha256':M.sha(b)}

def prepare():
    assert not (HERE/'source-started.json').exists(),'Preserve started source delta; do not retry preparation'
    plan,provenance,pins=M.prepare();M.packed(HERE/'plan.json',plan);M.dump(HERE/'provenance.json',provenance)
    pins['local']=[local_pin(name) for name in LOCAL];M.dump(HERE/'input-pins.json',pins)
    print(json.dumps({'result':'prepared',**plan['counts']},separators=(',',':')))

def validate(reproduce=False):
    pins=M.read(REL+'/input-pins.json')
    for row in pins['references']+pins['geometryPins']:M.verify(row)
    for row in pins['local']:
        b=(HERE/row['name']).read_bytes();assert len(b)==row['bytes'] and M.sha(b)==row['sha256'],row['name']
    for package in pins['preservedPackages']:
        M.verify(package)
        for row in M.read(package['path'])['files']:M.verify(row)
    # Hash-only preservation of original physical/source inputs, not proof reruns.
    for row in M.read(M.PRIOR+'input-pins.json')['dependencies']:M.verify(row)
    plan=M.read(REL+'/plan.json');provenance=M.read(REL+'/provenance.json')
    if reproduce:
        expected,expected_provenance,expected_pins=M.prepare()
        assert plan==expected and provenance==expected_provenance
        for key,value in expected_pins.items():assert pins[key]==value,key
    assert len(plan['targets'])==2946 and len(plan['pages'])==125 and all(0<p['regions']<=32 for p in plan['pages'])
    assert {i for p in plan['pages'] for i in p['targetIndices']}==set(range(2946))
    return plan

def aggregate(plan,records,mode,started,cpu):
    completed=[r for r in records if r['status']=='COMPLETE'];failed=[r for r in records if r['status']=='FAILED_STOPPED']
    done={r['pageId'] for r in completed};attempted={r['pageId'] for r in records};counts=collections.Counter();reasons=collections.Counter();prior={};residual=0.
    for row in completed:
        c=row['reported']['counts']
        for key in ['regions','proved','unproved','contactChecks','negativeChecks']:counts[key]+=c[key]
        reasons.update(c['reasons']);residual=max(residual,c['maxPlaneResidualMetres'])
        for key,values in c['priorReasons'].items():
            dst=prior.setdefault(key,collections.Counter());dst.update(values)
    return {'version':1,'mode':mode,'scope':{'targets':2946,'children':62,'pages':125},'completedPages':len(completed),'failedPages':[r['pageId'] for r in failed],
        'unattemptedPages':[p['id'] for p in plan['pages'] if p['id'] not in attempted],
        'counts':dict(counts),'remainingReasons':dict(reasons),'byPriorReason':{k:dict(v) for k,v in prior.items()},'maxPlaneResidualMetres':residual,
        'preserved':{'firstPageRegions':96,'previousPositiveRegions':1388,'acceptedSixReferences':6,'rerunAcceptedReferences':0,'originalUnprovedReportRegions':2952},
        'combinedSourceContacts':96+1388+6+counts['proved'],'allLaunchedChildrenExited':all(r['worker'] and r['worker']['exited'] for r in records),
        'coordinatorWallMs':(time.perf_counter()-started)*1000,'coordinatorCpuMs':(time.process_time()-cpu)*1000,
        'longestOwnedChildMs':max((r['worker']['elapsedMs'] for r in records if r['worker']),default=0),
        'nativeCompilations':0,'nativeLineage':'UNBOUND','geometryPayloadsCopied':0,'originalDictionaryCopies':0,'ports':[],'retainedHelpers':False}

def execute(mode,record=False):
    started=time.perf_counter();cpu=time.process_time();deadline=started+600;plan=validate(reproduce=mode=='verify')
    if mode=='calculate':
        marker={'ownerTask':M.L.OWNER,'purpose':'only 2946 remaining former-unproved source regions','coordinatorPid':os.getpid(),'executable':sys.executable,
            'startedAtUtc':datetime.datetime.now(datetime.timezone.utc).isoformat(),'deadlineSeconds':600,'childSeconds':60,'pageRegions':32,
            'planSha256':M.sha((HERE/'plan.json').read_bytes()),'localPins':M.read(REL+'/input-pins.json')['local'],'noAutomaticRetry':True}
        with (HERE/'source-started.json').open('xb') as f:f.write((json.dumps(marker,indent=2)+'\n').encode('ascii'))
        for name in ['pages','topologies','partial']:(HERE/name).mkdir()
        plans=plan['pages'];folder=HERE/'pages';progress=HERE/'calculation-progress.jsonl';events=HERE/'calculation-events.jsonl'
    else:
        original=M.read(REL+'/summary.json')
        done={r['pageId'] for r in [json.loads(line) for line in (HERE/'calculation-progress.jsonl').read_text().splitlines()] if r['status']=='COMPLETE'}
        plans=[p for p in plan['pages'] if p['id'] in done];assert len(plans)==original['completedPages']
        if record:
            folder=HERE/'checks';folder.mkdir();progress=HERE/'verification-progress.jsonl';events=HERE/'verification-events.jsonl'
        else:
            folder=ROOT/'artifacts'/('cornice-facet-delta-verify-'+uuid.uuid4().hex)
            assert folder.parent.resolve()==(ROOT/'artifacts').resolve();folder.mkdir(parents=True)
            progress=folder/'progress.jsonl';events=folder/'events.jsonl'
    records=[]
    try:
        for index,page in enumerate(plans):
            if deadline-time.perf_counter()<62:break
            command=[shutil.which('node'),str(HERE/'page.mjs'),mode,page['id']]
            if mode=='verify':command.append(str(folder))
            receipt=None
            try:
                out,err,receipt=M.L.run_owned(command,ROOT,'cornice facet delta '+mode+' '+page['id'],page['regions'],60,journal_path=events)
                if receipt['exitCode']!=0 or receipt['timedOut']:
                    failure_folder=HERE/'failures'/page['id'];failure_folder.mkdir(parents=True)
                    (failure_folder/'stdout.txt').write_bytes(out);(failure_folder/'stderr.txt').write_bytes(err)
                    raise RuntimeError('Unexpected page failure; preserve partial results and stop without retry')
                report=json.loads(out);assert report['counts']['regions']==page['regions']
                path=HERE/'pages'/(page['id']+'.json')
                row={'pageId':page['id'],'status':'COMPLETE','reported':report,'worker':receipt,'page':M.pin(path.relative_to(ROOT).as_posix()),
                    'stdoutSha256':M.sha(out),'stderr':err.decode('utf-8','replace')}
                M.L.journal(progress,'page-finished',row);records.append(row)
            except BaseException as error:
                row={'pageId':page['id'],'status':'FAILED_STOPPED','worker':receipt or getattr(error,'process_cleanup_receipt',None),
                    'errorType':type(error).__name__,'error':str(error),'traceback':traceback.format_exc(),
                    'partialResult':(HERE/'partial'/(page['id']+'.jsonl')).relative_to(ROOT).as_posix()}
                failure_folder=HERE/'failures'/page['id'];failure_folder.mkdir(parents=True,exist_ok=True);M.dump(failure_folder/'failure.json',row)
                M.L.journal(progress,'page-finished',row);records.append(row);print(json.dumps({'result':'FAILED_STOPPED','page':page['id'],'error':str(error)}),flush=True);break
            if (index+1)%10==0 or index+1==len(plans):
                print(json.dumps({'mode':mode,'pages':len(records),'planned':len(plans),
                    'regions':sum(r['reported']['counts']['regions'] for r in records),'proved':sum(r['reported']['counts']['proved'] for r in records),
                    'unproved':sum(r['reported']['counts']['unproved'] for r in records),'elapsedSeconds':round(time.perf_counter()-started,3)},separators=(',',':')),flush=True)
        summary=aggregate(plan,records,mode,started,cpu)
        if mode=='calculate':
            M.dump(HERE/'summary.json',summary)
            if not any((HERE/'partial').iterdir()):(HERE/'partial').rmdir()
        else:
            if record:M.dump(HERE/'verification-summary.json',summary)
            assert not summary['failedPages'] and summary['completedPages']==len(plans),'Delta verification incomplete; preserve progress'
            for key in ['counts','remainingReasons','byPriorReason','maxPlaneResidualMetres']:assert summary[key]==original[key],key
            if (HERE/'review-package.json').exists():
                for row in M.read(REL+'/review-package.json')['files']:M.verify(row)
            if not record:
                assert folder.resolve().parent==(ROOT/'artifacts').resolve() and folder.name.startswith('cornice-facet-delta-verify-')
                for f in folder.iterdir():assert f.is_file();f.unlink()
                folder.rmdir()
        print(json.dumps({k:v for k,v in summary.items() if k not in ['byPriorReason','preserved','unattemptedPages']},separators=(',',':')),flush=True)
        return not summary['failedPages']
    except BaseException:
        print('Preserved failed source delta outputs: '+str(folder),file=sys.stderr);raise

def package():
    original=M.read(REL+'/summary.json');verified=M.read(REL+'/verification-summary.json')
    assert not original['failedPages'] and verified['completedPages']==original['completedPages']
    rows=[]
    for p in sorted(HERE.rglob('*')):
        if p.is_file() and p.name!='review-package.json':rows.append(M.pin(p.relative_to(ROOT).as_posix()))
    M.dump(HERE/'review-package.json',{'version':1,'artistParent':M.PARENT,'scope':[REL+'/'],'files':rows,
        'status':'SOURCE_ONLY_FACET_DELTA','acceptedSourcesAndHistoryPreserved':True,'nativeCompilations':0,'retainedHelpers':False})
    for link in re.findall(r'\]\(([^)]+)\)',(HERE/'README.md').read_text()):assert (HERE/link).resolve().is_file(),link

def main():
    ap=argparse.ArgumentParser();g=ap.add_mutually_exclusive_group()
    for name in ['prepare','calculate','verify','record-verification','package']:g.add_argument('--'+name,action='store_true')
    a=ap.parse_args()
    if a.prepare:prepare()
    elif a.package:package()
    elif not execute('calculate' if a.calculate else 'verify',a.record_verification):sys.exit(2)
if __name__=='__main__':main()
