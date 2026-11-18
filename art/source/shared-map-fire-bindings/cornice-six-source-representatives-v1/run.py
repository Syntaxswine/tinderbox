"""Exactly six source representatives, using the accepted finite owned runner."""
import argparse,collections,hashlib,importlib.util,json,os,re,shutil,subprocess,sys,time,traceback,uuid
from pathlib import Path
sys.dont_write_bytecode=True
HERE=Path(__file__).resolve().parent;ROOT=HERE.parents[3];REL=HERE.relative_to(ROOT).as_posix()
FIRST='art/source/shared-map-fire-bindings/cornice-family-contact-page-01-v1/'
PRIOR='art/source/shared-map-fire-bindings/cornice-family-contact-remainder-v1/'
def read(path):return json.loads((ROOT/path).read_bytes())
def sha(b):return hashlib.sha256(b).hexdigest()
def dump(path,x):Path(path).write_bytes((json.dumps(x,indent=2,ensure_ascii=True)+'\n').encode('ascii'))
def pin(name):
    b=(HERE/name).read_bytes();return {'name':name,'bytes':len(b),'sha256':sha(b)}
spec=importlib.util.spec_from_file_location('accepted_six_finite_runner',ROOT/FIRST/'lifecycle.py');L=importlib.util.module_from_spec(spec);spec.loader.exec_module(L)
PACKET=['plan.json','selection.json','provenance.json','component-context.json','donor-facet-method.mjs.txt','authority.md','representative.mjs','run.py']

def pin_inputs():
    assert not (HERE/'source-started.json').exists()
    pins=read(REL+'/input-pins.json');pins['packet']=[pin(name) for name in PACKET];dump(HERE/'input-pins.json',pins)

def verify_inputs():
    pins=read(REL+'/input-pins.json')
    for row in pins['dependencies']:
        b=(ROOT/row['path']).read_bytes();assert len(b)==row['bytes'] and sha(b)==row['sha256'],row['path']
    for row in pins['packet']:
        b=(HERE/row['name']).read_bytes();assert len(b)==row['bytes'] and sha(b)==row['sha256'],row['name']
    old=read(PRIOR+'review-package.json')
    for row in old['files']:
        b=(ROOT/row['path']).read_bytes();assert len(b)==row['bytes'] and sha(b)==row['sha256'],row['path']
    selection=read(REL+'/selection.json');plan=read(REL+'/plan.json');source=read(selection['sourcePath'])['relationships']
    ordinals={};ordinal=0
    for ri,relationship in enumerate(source):
        for li,region in enumerate(relationship['localRegions']):ordinals[region['id']]=(ordinal,ri,li);ordinal+=1
    classes=collections.defaultdict(list)
    for path in sorted((ROOT/PRIOR/'pages').glob('*.json')):
        for region in json.loads(path.read_bytes())['regions']:
            if region['status']=='UNPROVED':classes[region['reason']].append(region)
    assert len(classes)==6 and sum(map(len,classes.values()))==2952
    assert len(selection['representatives'])==len(plan['regions'])==6
    assert len({r['priorUnprovedReason'] for r in selection['representatives']})==6
    prior_dictionary=read(PRIOR+'dictionary.json');prior_parts={p['id']:p for p in prior_dictionary['parts']}
    for selected,row in zip(selection['representatives'],plan['regions']):
        reason=selected['priorUnprovedReason'];prior=min(classes[reason],key=lambda r:ordinals[r['id']][0]);o,ri,li=ordinals[prior['id']]
        assert prior['id']==row['id']==selected['regionId'] and prior==row['priorResult']
        assert (o,ri,li)==(selected['originalRegionOrdinal'],selected['sourceRelationshipOrdinal'],selected['sourceLocalRegionOrdinal'])
        assert selected['classRegions']==len(classes[reason]);original=source[ri]['localRegions'][li]
        assert row['originalRegion']==original and row['selector']==original['selector'] and row['endpointBounds']==[original['parentBounds'],original['childBounds']]
        assert sha(json.dumps(original,separators=(',',':'),sort_keys=True,ensure_ascii=True,allow_nan=False).encode())==row['sourceCanonicalSha256']
        proof=original['actualGeometryCertificate']['proof']
        assert row['historical']=={'worldWitness':proof.get('worldWitness'),'sourceFace':proof.get('sourceFace'),'actualSurfaceWitness':proof.get('actualSurfaceWitness'),
            'parentWitness':original['parentWitness'],'childWitness':original['childWitness']}
    assert {p['id'] for p in plan['instances']}=={r[k] for r in plan['regions'] for k in ['parent','child']}
    for part in plan['instances']:assert part==prior_parts[part['id']]
    for key,g in plan['geometries'].items():assert g==prior_dictionary['geometries'][int(key)]
    provenance=read(REL+'/provenance.json');block=(HERE/'donor-facet-method.mjs.txt').read_bytes()
    assert sha(block)==provenance['unchangedFunctionBlockSha256']
    for row in provenance['facetMethod']:
        b=subprocess.run(['git','show',row['commit']+':'+row['path']],cwd=ROOT,capture_output=True,check=True,timeout=30,
            creationflags=getattr(subprocess,'CREATE_NO_WINDOW',0)).stdout
        assert len(b)==row['sourceBytes'] and sha(b)==row['sourceSha256']
        excerpt=b[row['excerptUtf8ByteStart']:row['excerptUtf8ByteEnd']]
        assert sha(excerpt)==row['excerptRawSha256'] and sha(excerpt.replace(b'\r\n',b'\n'))==row['excerptLfSha256']
        assert excerpt.replace(b'\r\n',b'\n')==block
    context=read(REL+'/component-context.json');row=provenance['componentCore']
    b=subprocess.run(['git','show',row['commit']+':'+row['path']],cwd=ROOT,capture_output=True,check=True,timeout=30,
        creationflags=getattr(subprocess,'CREATE_NO_WINDOW',0)).stdout
    assert sha(b)==row['moduleSha256']==context['moduleSha256']
    for key,hash_key in [('declaration','declarationSha256'),('function','functionSha256'),('canonicalNormal','canonicalNormalSha256')]:
        assert sha(context[key].encode())==context[hash_key] and context[key].rstrip() in b.decode()
    return pins,selection,plan

def execute(mode,record=False):
    started=time.perf_counter();cpu=time.process_time();deadline=started+600
    pins,selection,plan=verify_inputs()
    if mode=='calculate':
        marker={'purpose':'six deterministic cornice source representatives only','ownerTask':L.OWNER,'coordinatorPid':os.getpid(),'executable':sys.executable,
            'startedAtUtc':__import__('datetime').datetime.now(__import__('datetime').timezone.utc).isoformat(),
            'deadlineSeconds':600,'childDeadlineSeconds':60,'packetPins':pins['packet'],'noAutomaticRetry':True}
        with (HERE/'source-started.json').open('xb') as f:f.write((json.dumps(marker,indent=2)+'\n').encode('ascii'))
        folder=HERE/'results';folder.mkdir();progress=HERE/'calculation-progress.jsonl';events=HERE/'calculation-events.jsonl'
    elif record:
        folder=HERE/'verification';folder.mkdir();progress=HERE/'verification-progress.jsonl';events=HERE/'verification-events.jsonl'
    else:
        folder=ROOT/'artifacts'/('cornice-six-verification-'+uuid.uuid4().hex)
        assert folder.parent.resolve()==(ROOT/'artifacts').resolve();folder.mkdir(parents=True)
        progress=folder/'progress.jsonl';events=folder/'events.jsonl'
    rows=[]
    try:
        for index in range(6):
            if deadline-time.perf_counter()<62:break
            command=[shutil.which('node'),str(HERE/'representative.mjs'),mode,str(index)]
            if mode=='verify':command.append(str(folder))
            receipt=None
            try:
                out,err,receipt=L.run_owned(command,ROOT,'cornice six representative '+str(index)+' '+mode,1,60,journal_path=events)
                if receipt['exitCode']!=0 or receipt['timedOut']:
                    (folder/('failed-'+str(index)+'-stdout.txt')).write_bytes(out);(folder/('failed-'+str(index)+'-stderr.txt')).write_bytes(err)
                    raise RuntimeError('Unexpected representative worker failure; stop without retry')
                result=json.loads(out);row={'index':index,'status':'COMPLETE','reported':result,'worker':receipt,'stdoutSha256':sha(out),'stderr':err.decode('utf-8','replace')}
                L.journal(progress,'representative-finished',row);rows.append(row);print(json.dumps(result,separators=(',',':')),flush=True)
            except BaseException as error:
                row={'index':index,'status':'FAILED_STOPPED','worker':receipt or getattr(error,'process_cleanup_receipt',None),
                    'errorType':type(error).__name__,'error':str(error),'traceback':traceback.format_exc()}
                dump(folder/('failed-'+str(index)+'.json'),row);L.journal(progress,'representative-finished',row);rows.append(row);break
        good=[r for r in rows if r['status']=='COMPLETE'];reports=[r['reported'] for r in good]
        summary={'version':1,'mode':mode,'representativesPlanned':6,'completed':len(good),'failed':[r['index'] for r in rows if r['status']!='COMPLETE'],
            'unattempted':list(range(len(rows),6)),'proved':sum(r['status']=='source-contact-proposed' for r in reports),
            'unproved':sum(r['status']=='unproved' for r in reports),'results':reports,'allLaunchedChildrenExited':all(r['worker'] and r['worker']['exited'] for r in rows),
            'coordinatorWallMs':(time.perf_counter()-started)*1000,'coordinatorCpuMs':(time.process_time()-cpu)*1000,
            'nativeCompilations':0,'ports':[],'retainedHelpers':False,'otherFormerUnprovedRegionsRecalculated':0}
        if mode=='calculate':dump(HERE/'summary.json',summary)
        elif record:dump(HERE/'verification-summary.json',summary)
        if mode=='verify':
            assert len(good)==6 and not summary['failed'],'Saved representative verification incomplete'
            original=read(REL+'/summary.json');assert summary['proved']==original['proved'] and summary['unproved']==original['unproved']
            if (HERE/'review-package.json').exists():
                for p in read(REL+'/review-package.json')['files']:
                    b=(ROOT/p['path']).read_bytes();assert len(b)==p['bytes'] and sha(b)==p['sha256'],p['path']
        if mode=='verify' and not record:
            assert folder.resolve().parent==(ROOT/'artifacts').resolve() and folder.name.startswith('cornice-six-verification-')
            for f in folder.iterdir():assert f.is_file();f.unlink()
            folder.rmdir()
        print(json.dumps({k:v for k,v in summary.items() if k!='results'},separators=(',',':')),flush=True)
        return len(good)==6 and not summary['failed']
    except BaseException:
        print('Preserved failed six-representative output: '+str(folder),file=sys.stderr);raise

def package():
    assert read(REL+'/verification-summary.json')['completed']==6
    files=[]
    for p in sorted(HERE.rglob('*')):
        if p.is_file() and p.name!='review-package.json':
            b=p.read_bytes();files.append({'path':p.relative_to(ROOT).as_posix(),'bytes':len(b),'sha256':sha(b)})
    dump(HERE/'review-package.json',{'version':1,'artistParent':'3f77f03b2c411d2613e6b1e8f73d25286afb5aca','scope':[REL+'/'],'files':files,
        'status':'SIX_SOURCE_REPRESENTATIVES_ONLY','otherFormerUnprovedRegionsRecalculated':0,'nativeCompilations':0,'retainedHelpers':False})
    for link in re.findall(r'\]\(([^)]+)\)',(HERE/'README.md').read_text()):assert (HERE/link).resolve().is_file(),link

def main():
    ap=argparse.ArgumentParser();g=ap.add_mutually_exclusive_group()
    for name in ['pin-inputs','calculate','verify','record-verification','package']:g.add_argument('--'+name,action='store_true')
    a=ap.parse_args()
    if a.pin_inputs:pin_inputs()
    elif a.package:package()
    elif not execute('calculate' if a.calculate else 'verify',a.record_verification):sys.exit(2)
if __name__=='__main__':main()
