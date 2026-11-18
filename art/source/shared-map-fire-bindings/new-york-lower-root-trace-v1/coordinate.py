"""One <=10 minute coordinator, existing <=60 second owned child lifecycle."""
from pathlib import Path
import hashlib,json,sys,shutil,time,importlib.util
sys.dont_write_bytecode=True
HERE=Path(__file__).resolve().parent;ROOT=HERE.parents[3];started=time.perf_counter()
def sha(b):return hashlib.sha256(b).hexdigest()
def dump(n,d):
 with (HERE/n).open('xb') as f:f.write((json.dumps(d,separators=(',',':'))+'\n').encode())
plan=json.loads((HERE/'plan.json').read_bytes());assert plan['counts']['distinctOriginalParts']<=64 and plan['counts']['examinedDeclaredPairs']<=128
with (HERE/'CALCULATION_STARTED.json').open('xb') as f:f.write(b'{"cohort":1,"retriesAuthorized":false}\n')
deps=[plan['base']['path'],plan['overlay']['path'],
'art/source/shared-map-fire-bindings/cornice-wall-contact-proposal-v1/predicate-context.json',
'art/source/shared-map-fire-bindings/cornice-six-source-representatives-v1/component-context.json',
'art/source/shared-map-fire-bindings/cornice-six-source-representatives-v1/representative.mjs',
'art/source/shared-map-fire-bindings/cornice-six-source-representatives-v1/donor-facet-method.mjs.txt',
'art/source/shared-map-fire-bindings/cornice-family-contact-page-01-v1/source-producer-context.json',
'art/source/shared-map-fire-bindings/cornice-family-contact-page-01-v1/lifecycle.py']
deps+=list(dict.fromkeys(g['path'] for g in plan['geometries']))
deps+=[p['path'] for p in plan['existingCorniceResults']]
dependencyPins=[]
for n in deps:
 b=ROOT.joinpath(n).read_bytes();dependencyPins.append({'path':n,'bytes':len(b),'sha256':sha(b)})
rep=ROOT.joinpath(deps[4]).read_bytes();start=rep.index(b'const finite=p=>');end=rep.index(b'const block=pinned(');part=rep[start:end]
locals=['plan.json','source-check.mjs','coordinate.py','prepare.py','authority.md','.gitattributes']
pins={'version':1,'local':[{'path':n,'sha256':sha((HERE/n).read_bytes())} for n in locals],'dependencies':dependencyPins,
'partHelper':{'path':deps[4],'byteStart':start,'byteEnd':end,'sha256':sha(part)},
'geometryPins':'Opaque raw-byte hashes recorded only after plan freeze; no geometry is decoded until the single child.'}
dump('input-pins.json',pins)
loader=importlib.util.spec_from_file_location('owned_lifecycle',ROOT/deps[7]);L=importlib.util.module_from_spec(loader);loader.loader.exec_module(L)
try:
 out,err,receipt=L.run_owned([shutil.which('node'),str(HERE/'source-check.mjs')],str(ROOT),'one finite lower-root source cohort',len(plan['relationships']),timeout=60,journal_path=HERE/'lifecycle.jsonl')
 (HERE/'source.stdout').write_bytes(out);(HERE/'source.stderr').write_bytes(err);dump('helper-receipt.json',receipt)
 assert receipt['exited'] and receipt['exitCode']==0 and not receipt['timedOut'],err.decode(errors='replace')
 assert time.perf_counter()-started<600
 result=json.loads((HERE/'result.json').read_bytes());assert result['counts']['sourceTransformations']==plan['counts']['distinctOriginalParts']
 dump('coordinator.json',{'result':'ONE_COHORT_COMPLETED','elapsedMs':(time.perf_counter()-started)*1000,'limitSeconds':600,
 'children':1,'ownedChildrenExited':1,'remainingHelpers':0,'retainedPorts':[],'additionalCohorts':0,'coldEvaluations':0,'outputSha256':sha((HERE/'result.json').read_bytes())})
 print(out.decode().strip())
except BaseException as e:
 dump('failure.json',{'type':type(e).__name__,'message':str(e),'noRetry':True,'elapsedMs':(time.perf_counter()-started)*1000})
 raise
