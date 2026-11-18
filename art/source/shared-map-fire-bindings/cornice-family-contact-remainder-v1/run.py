"""Finite remaining-family source coordinator; reuse the accepted owned runner."""
import argparse,collections,datetime,json,os,re,sys,time,traceback,uuid
from pathlib import Path
import source as S
sys.dont_write_bytecode=True
HERE=S.HERE;ROOT=S.ROOT
CODES=['source.py','worker.py','check-page.mjs','run.py']

def prepare():
    assert not (HERE/'calculation-started.json').exists(),'Do not alter prepared inputs after a calculation starts'
    dictionary,inventory,pins=S.prepare();pins['code']=[S.pin(S.REL+'/'+name) for name in CODES]
    S.packed(HERE/'dictionary.json',dictionary);S.packed(HERE/'inventory.json',inventory);S.dump(HERE/'input-pins.json',pins)
    print(json.dumps({'result':'prepared','children':95,'pairs':1645,'regions':4340,'pages':len(inventory['pages']),
        'sourceParts':len(dictionary['parts']),'geometryBuffers':len(dictionary['geometries']),'firstPage':'unchanged'},separators=(',',':')))

def validate_metadata(reproduce):
    pins=S.read(S.REL+'/input-pins.json')
    for row in pins['dependencies']+pins['code']:S.verify_pin(row)
    dictionary=S.read(S.REL+'/dictionary.json');inventory=S.read(S.REL+'/inventory.json')
    if reproduce:
        expected,expected_inventory,expected_pins=S.prepare()
        assert dictionary==expected and inventory==expected_inventory
        assert all(pins[k]==expected_pins[k] for k in expected_pins)
    assert len(dictionary['regions'])==4340 and len(inventory['pages'])==127
    assert len({i for page in inventory['pages'] for i in page['regionIndices']})==4340
    assert all(0<page['regions']<=64 for page in inventory['pages'])
    return dictionary,inventory

def journal(path,event,value):S.L.journal(path,event,value)

def clear_work(folder,work_root):
    assert folder.resolve().parent==work_root.resolve() and folder.name.startswith('child-')
    allowed={'page.json','summary.json','cost-and-node-receipt.json','node-process-receipt.json','node-stdout.json','node-stderr.txt'}
    files=list(folder.iterdir());assert all(f.is_file() and f.name in allowed for f in files)
    for f in files:f.unlink()
    folder.rmdir()

def aggregate(dictionary,inventory,records,mode,elapsed,cpu):
    good=[r for r in records if r['status']=='COMPLETE'];failed=[r for r in records if r['status']=='FAILED_STOPPED']
    done={r['pageId'] for r in good};unattempted=[p['id'] for p in inventory['pages'] if p['id'] not in {r['pageId'] for r in records}]
    sums=collections.Counter();reasons=collections.Counter();methods=collections.Counter();negatives=collections.Counter()
    for row in good:
        summary=row['summary']
        for k in ['regions','proved','unproved','contactChecks','attemptedContactChecks','negativeChecks','pilotCopyRejected','candidateNegativeTests','authoredBearingRegions']:sums[k]+=summary[k]
        reasons.update(summary['reasons']);methods.update(summary['methods']);negatives.update(summary['negativeCounts'])
    child_status=[]
    for child in inventory['children']:
        completed=sum(p in done for p in child['pages']);bad=any(r['pageId'] in child['pages'] for r in failed)
        status='COMPLETE' if completed==len(child['pages']) else 'FAILED_PAGE_STOPPED' if bad else 'PARTIAL' if completed else 'UNATTEMPTED'
        child_status.append({'childOwnerId':child['childOwnerId'],'status':status,'completedPages':completed,'plannedPages':len(child['pages'])})
    completed_region_indices={i for p in inventory['pages'] if p['id'] in done for i in p['regionIndices']}
    costs=[r['cost'] for r in good]
    return {'version':1,'mode':mode,'status':'SOURCE_BATCH_COMPLETE' if len(good)==len(inventory['pages']) else 'SOURCE_BATCH_PARTIAL',
        'remainingScope':{'children':95,'pairs':1645,'regions':4340},'pagesPlanned':len(inventory['pages']),'pagesCompleted':len(good),
        'failedPages':[r['pageId'] for r in failed],'unattemptedPages':unattempted,
        'completedPairs':len({dictionary['regions'][i]['relationship'] for i in completed_region_indices}),
        'unattemptedRegions':4340-len(completed_region_indices)-sum(p['regions'] for p in inventory['pages'] if p['id'] in {r['pageId'] for r in failed}),
        'counts':dict(sums),'unprovedReasons':dict(reasons),'provedMethods':dict(methods),'negativeCounts':dict(negatives),
        'children':child_status,'firstPage':{'unchanged':True,'pairs':49,'regions':96,'repeated':False},
        'uniqueSourceParts':len(dictionary['parts']),'uniqueGeometryBuffers':len(dictionary['geometries']),
        'cost':{'coordinatorWallMs':elapsed,'coordinatorCpuMs':cpu,'pythonPageCpuMs':sum(r['pythonWorkerCpuMs'] for r in costs),
            'nodeCpuMs':sum((r['nodeCost']['cpu']['user']+r['nodeCost']['cpu']['system'])/1000 for r in costs),
            'longestOwnedPythonMs':max((r['worker']['elapsedMs'] for r in good),default=0),
            'longestOwnedNodeMs':max((r['node']['elapsedMs'] for r in costs),default=0),'rendererBenchmark':False},
        'allLaunchedChildrenExited':all(r['worker']['exited'] for r in records if r.get('worker')),
        'ports':[],'retainedHelpers':False,'nativeCompilations':0,'runtimeNativeLineage':'UNBOUND'}

def run_pages(mode,save=False):
    started=time.perf_counter();cpu=time.process_time();deadline=started+600
    dictionary,inventory=validate_metadata(reproduce=mode=='verify')
    dictionary_sha=S.sha((HERE/'dictionary.json').read_bytes());inventory_sha=S.sha((HERE/'inventory.json').read_bytes())
    if mode=='calculate':
        marker={'ownerTask':S.L.OWNER,'purpose':'remaining 95 children source-only batch','startedAt':datetime.datetime.now(datetime.timezone.utc).isoformat(),
            'deadlineSeconds':600,'pageRegionLimit':64,'childDeadlineSeconds':60,'dictionarySha256':dictionary_sha,'inventorySha256':inventory_sha,
            'codePins':S.read(S.REL+'/input-pins.json')['code'],'noAutomaticRetry':True,'acceptedFirstPageRepeated':False}
        with (HERE/'calculation-started.json').open('xb') as f:f.write((json.dumps(marker,indent=2)+'\n').encode('ascii'))
        work_root=HERE/'work';work_root.mkdir();(HERE/'pages').mkdir()
        progress=HERE/'calculation-progress.jsonl';events=HERE/'calculation-events.jsonl'
        plans=inventory['pages']
    else:
        original=S.read(S.REL+'/summary.json')
        source_rows=[json.loads(line) for line in (HERE/'calculation-progress.jsonl').read_text().splitlines()]
        completed={r['pageId'] for r in source_rows if r.get('event')=='page-finished' and r['status']=='COMPLETE'}
        plans=[p for p in inventory['pages'] if p['id'] in completed]
        assert len(plans)==original['pagesCompleted']
        work_root=ROOT/'artifacts'/('cornice-remainder-verification-'+uuid.uuid4().hex)
        assert work_root.parent.resolve()==(ROOT/'artifacts').resolve();work_root.mkdir(parents=True)
        progress=HERE/'verification-progress.jsonl' if save else work_root/'verification-progress.jsonl'
        events=HERE/'verification-events.jsonl' if save else work_root/'verification-events.jsonl'
        if save:assert not progress.exists() and not (HERE/'verification-summary.json').exists()
    records=[]
    try:
        for index,plan in enumerate(plans):
            # Reserve a complete owned-child deadline and small receipt/summary time.
            if deadline-time.perf_counter()<62:break
            folder=work_root/plan['id'];folder.mkdir()
            command=[sys.executable,'-B',str(HERE/'worker.py'),'--mode',mode,'--page',plan['id'],'--output',str(folder),
                '--dictionary-sha',dictionary_sha,'--inventory-sha',inventory_sha,'--journal',str(events)]
            if mode=='verify':command.extend(['--saved-page',str(HERE/'pages'/(plan['id']+'.json'))])
            journal(progress,'page-started',{'pageId':plan['id'],'regions':plan['regions'],'mode':mode})
            receipt=None
            try:
                out,err,receipt=S.L.run_owned(command,ROOT,'remaining cornice '+mode+' '+plan['id'],plan['regions'],60,journal_path=events)
                if receipt['exitCode']!=0 or receipt['timedOut']:
                    (folder/'worker-stdout.txt').write_bytes(out);(folder/'worker-stderr.txt').write_bytes(err)
                    raise RuntimeError('Unexpected source page worker failure; stopped without retry')
                reported=json.loads(out);summary=json.loads((folder/'summary.json').read_bytes())
                assert reported['summary']==summary and summary['regions']==plan['regions']
                cost=json.loads((folder/'cost-and-node-receipt.json').read_bytes())
                assert cost['node']['exited'] and cost['node']['exitCode']==0
                target=HERE/'pages'/(plan['id']+'.json')
                if mode=='calculate':
                    assert not target.exists();(folder/'page.json').replace(target)
                row={'pageId':plan['id'],'childOwnerId':plan['childOwnerId'],'status':'COMPLETE','summary':summary,
                    'page':S.pin(target.relative_to(ROOT).as_posix()),'worker':receipt,'cost':cost,
                    'workerStdoutSha256':S.sha(out),'workerStderr':err.decode('utf-8','replace')}
                journal(progress,'page-finished',row);records.append(row)
                clear_work(folder,work_root)
            except BaseException as error:
                failure={'pageId':plan['id'],'childOwnerId':plan['childOwnerId'],'status':'FAILED_STOPPED','worker':receipt or getattr(error,'process_cleanup_receipt',None),
                    'errorType':type(error).__name__,'error':str(error),'traceback':traceback.format_exc(),'partialResults':str(folder.relative_to(ROOT))}
                S.dump(folder/'failure.json',failure);journal(progress,'page-finished',failure);records.append(failure)
                print(json.dumps({'result':'FAILED_PAGE_STOPPED','page':plan['id'],'error':str(error)},separators=(',',':')),flush=True)
                break
            if (index+1)%10==0 or index+1==len(plans):
                print(json.dumps({'mode':mode,'completed':len(records),'planned':len(plans),'regions':sum(r['summary']['regions'] for r in records),
                    'proved':sum(r['summary']['proved'] for r in records),'unproved':sum(r['summary']['unproved'] for r in records),
                    'elapsedSeconds':round(time.perf_counter()-started,3)},separators=(',',':')),flush=True)
        summary=aggregate(dictionary,inventory,records,mode,(time.perf_counter()-started)*1000,(time.process_time()-cpu)*1000)
        if mode=='calculate':S.dump(HERE/'summary.json',summary)
        elif save:S.dump(HERE/'verification-summary.json',summary)
        if mode=='verify':
            assert not summary['failedPages'] and summary['pagesCompleted']==len(plans),'Verification incomplete; partial progress preserved'
            for key in ['counts','unprovedReasons','provedMethods','negativeCounts','completedPairs']:assert summary[key]==original[key],key
        if mode=='verify' and (HERE/'review-package.json').exists():
            for row in S.read(S.REL+'/review-package.json')['files']:S.verify_pin(row)
        if not summary['failedPages']:
            if not save and mode=='verify':
                for f in [progress,events]:
                    if f.exists():f.unlink()
            assert not any(work_root.iterdir());work_root.rmdir()
        print(json.dumps({'result':summary['status'],'mode':mode,'pages':summary['pagesCompleted'],'counts':summary['counts'],
            'unattemptedPages':len(summary['unattemptedPages']),'elapsedMs':summary['cost']['coordinatorWallMs'],
            'allLaunchedChildrenExited':summary['allLaunchedChildrenExited'],'nativeCompilations':0},separators=(',',':')),flush=True)
        return not summary['failedPages']
    except BaseException:
        print('Preserved failed source batch scratch: '+str(work_root),file=sys.stderr);raise

def package():
    assert (HERE/'verification-summary.json').is_file()
    for link in re.findall(r'\]\(([^)]+)\)',(HERE/'README.md').read_text()):assert (HERE/link).resolve().is_file(),link
    rows=[]
    for p in sorted(HERE.rglob('*')):
        if p.is_file() and p.name!='review-package.json':rows.append(S.pin(p.relative_to(ROOT).as_posix()))
    S.dump(HERE/'review-package.json',{'version':1,'artistParent':S.PARENT,'scope':[S.REL+'/'],'files':rows,
        'status':'SOURCE_ONLY_REMAINING_FAMILY','acceptedFirstPageUnchanged':True,'nativeCompilations':0,'retainedHelpers':False,
        'verification':'python -B '+S.REL+'/run.py --verify','remaining':'Architect source review, native binding/liveness and live-family acceptance remain separate.'})

def main():
    ap=argparse.ArgumentParser();group=ap.add_mutually_exclusive_group()
    for name in ['prepare','calculate','verify','record-verification','package']:group.add_argument('--'+name,action='store_true')
    args=ap.parse_args()
    if args.prepare:prepare()
    elif args.calculate:
        if not run_pages('calculate'):sys.exit(2)
    elif args.package:package()
    elif not run_pages('verify',args.record_verification):sys.exit(2)
if __name__=='__main__':main()
