"""Metadata-only target partition and immutable references; no geometry calculation."""
import collections,hashlib,importlib.util,json,sys
from pathlib import Path
sys.dont_write_bytecode=True
HERE=Path(__file__).resolve().parent;ROOT=HERE.parents[3];REL=HERE.relative_to(ROOT).as_posix()
FIRST='art/source/shared-map-fire-bindings/cornice-family-contact-page-01-v1/'
PRIOR='art/source/shared-map-fire-bindings/cornice-family-contact-remainder-v1/'
SIX='art/source/shared-map-fire-bindings/cornice-six-source-representatives-v1/'
ORIGINAL='art/source/shared-map-fire-bindings/coverage-family-proposal-v1/relationships.json'
PARENT='45c966efc64210402ef24c0c1d7849a397bb871c'

def sha(b):return hashlib.sha256(b).hexdigest()
def read(path):return json.loads((ROOT/path).read_bytes())
def compact(x):return json.dumps(x,separators=(',',':'),sort_keys=True,ensure_ascii=True,allow_nan=False)
def dump(path,x):Path(path).write_bytes((json.dumps(x,indent=2,ensure_ascii=True)+'\n').encode('ascii'))
def packed(path,x):
    rows=[]
    for key,value in x.items():
        body='[\n'+',\n'.join('    '+compact(r) for r in value)+'\n  ]' if isinstance(value,list) else compact(value)
        rows.append('  '+json.dumps(key)+': '+body)
    Path(path).write_bytes(('{\n'+',\n'.join(rows)+'\n}\n').encode('ascii'))
def pin(path):
    b=(ROOT/path).read_bytes();return {'path':path,'bytes':len(b),'sha256':sha(b)}
def verify(row):
    b=(ROOT/row['path']).read_bytes();assert len(b)==row['bytes'] and sha(b)==row['sha256'],row['path']
spec=importlib.util.spec_from_file_location('delta_accepted_runner',ROOT/FIRST/'lifecycle.py');L=importlib.util.module_from_spec(spec);spec.loader.exec_module(L)

def prepare():
    dictionary=read(PRIOR+'dictionary.json');selection=read(SIX+'selection.json');six={r['regionId'] for r in selection['representatives']}
    assert len(six)==6
    targets=[];prior_pages=[];classes=collections.Counter();old_unproved=set();old_positive=set()
    for page in sorted((ROOT/PRIOR/'pages').glob('*.json')):
        content=json.loads(page.read_bytes());selected=[]
        for ri,r in enumerate(content['regions']):
            if r['status']=='UNPROVED':old_unproved.add(r['id'])
            else:assert r['status']=='SOURCE_CONTACT_PROPOSED';old_positive.add(r['id'])
            if r['status']=='UNPROVED' and r['id'] not in six:selected.append((ri,r))
        if selected:
            number=len(prior_pages);prior_pages.append(pin(page.relative_to(ROOT).as_posix()))
            for ri,r in selected:
                original=dictionary['regions'][r['regionIndex']]
                assert original['id']==r['id'] and original['sourceCanonicalSha256']==r['sourceCanonicalSha256']
                targets.append({'dictionaryRegion':r['regionIndex'],'priorPage':number,'priorRecord':ri,'priorReason':r['reason']});classes[r['reason']]+=1
    assert len(old_unproved)==2952 and len(old_positive)==1388 and six<=old_unproved and len(targets)==2946
    targets.sort(key=lambda t:t['dictionaryRegion'])
    assert len({t['dictionaryRegion'] for t in targets})==2946
    grouped=collections.defaultdict(list)
    for i,t in enumerate(targets):grouped[dictionary['parts'][dictionary['regions'][t['dictionaryRegion']]['child']]['ownerId']].append(i)
    pages=[]
    for child_number,child in enumerate(sorted(grouped)):
        for part_number,start in enumerate(range(0,len(grouped[child]),32)):
            ids=grouped[child][start:start+32]
            pages.append({'id':'child-'+str(child_number).zfill(3)+'-page-'+str(part_number).zfill(2),'childOwnerId':child,'targetIndices':ids,'regions':len(ids)})
    assert len(grouped)==62 and len(pages)==125
    references={name:pin(path) for name,path in {
        'dictionary':PRIOR+'dictionary.json','originalRelationships':ORIGINAL,'facetMethod':SIX+'donor-facet-method.mjs.txt',
        'componentContext':SIX+'component-context.json','acceptedHarness':SIX+'representative.mjs',
        'predicateContext':'art/source/shared-map-fire-bindings/cornice-wall-contact-proposal-v1/predicate-context.json',
        'sourceProducer':FIRST+'source-producer-context.json','runner':FIRST+'lifecycle.py'}.items()}
    harness=(ROOT/references['acceptedHarness']['path']).read_bytes();start=harness.index(b'const finite=p=>');end=harness.index(b'const block=pinned(',start);helper=harness[start:end]
    geometry_ids=sorted({dictionary['parts'][dictionary['regions'][t['dictionaryRegion']][k]]['geometry'] for t in targets for k in ['parent','child']})
    assert len(geometry_ids)==94
    preservation=[pin(prefix+'review-package.json') for prefix in [FIRST,PRIOR,SIX]]
    first_six=[]
    for i in range(6):
        result=read(SIX+'results/representative-'+str(i)+'.json');assert result['result']['status']=='source-contact-proposed'
        first_six.append({'regionId':result['regionId'],'result':pin(SIX+'results/representative-'+str(i)+'.json')})
    plan={'version':1,'references':references,'priorPages':prior_pages,'targets':targets,'pages':pages,
        'counts':{'targets':2946,'children':62,'pages':125,'geometryIdentities':94,'priorUnprovedReasons':dict(classes)},
        'preserved':{'firstPageRegions':96,'existingPositiveRegions':1388,'sixSourceReferences':first_six,'originalUnprovedReportRegions':2952},
        'limits':{'pageRegions':32,'childSeconds':60,'coordinatorSeconds':600}}
    provenance={'artistParent':PARENT,'authority':'direct architect follow-up to six source proofs',
        'facetMethod':references['facetMethod'],'facetMethodSha256':'5524fa0bb40139e90d5f8377ee8c3a681d5d95aa45b9b1f05a2b17ca8eb17ae2',
        'componentContext':references['componentContext'],'canonicalComponentCommit':'25c74d2d2b9ae749a721e2ff71e6c116023c2379',
        'partHelper':{'source':references['acceptedHarness'],'byteStart':start,'byteEnd':end,'excerptSha256':sha(helper)},
        'methodChanges':'None. Existing pure helper and facet block are evaluated from pinned accepted files. Page selection and compact output only.',
        'geometryPayloadsCopied':0,'originalDictionaryCopies':0,'closedFlagsAreNotSurfaceContactGates':True}
    pins={'version':1,'references':list(references.values()),'preservedPackages':preservation,'geometryPins':[pin(dictionary['geometries'][i]['path']) for i in geometry_ids]}
    return plan,provenance,pins
