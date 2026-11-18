"""One finite new-method coordinator; reused owned-child lifecycle."""
from pathlib import Path
import sys,time,json,hashlib,shutil,importlib.util
sys.dont_write_bytecode=True
HERE=Path(__file__).resolve().parent;ROOT=HERE.parents[3];started=time.perf_counter()
def sha(b):return hashlib.sha256(b).hexdigest()
def dump(n,d):
 with (HERE/n).open('xb') as f:f.write((json.dumps(d,separators=(',',':'))+'\n').encode())
plan=json.loads((HERE/'plan.json').read_bytes());oldpins=json.loads(ROOT.joinpath('art/source/shared-map-fire-bindings/new-york-lower-root-trace-v1/input-pins.json').read_bytes())
assert len(plan['partIds'])==36<=64 and len(plan['pairIds'])==34<=128
with (HERE/'CALCULATION_STARTED.json').open('xb') as f:f.write(b'{"newMethodAttempt":1,"sourceRetriesAuthorized":false,"additionalPartsAuthorized":false}\n')
three='vendor/farmyard-commando/30a3b8cae5f36bb0c1df3685b7fba16f701c2083/sites/tactical-animal/dist/aft/tactics/vendor/three.core.js'
deps=list(dict.fromkeys([p['path'] for p in oldpins['dependencies']]+[plan['priorAttempt']['planPath'],plan['priorAttempt']['resultPath'],
 'art/source/shared-map-fire-bindings/new-york-lower-root-trace-v1/input-pins.json','art/source/shared-map-fire-bindings/new-york-lower-root-trace-v1/selector-lineage.json',three]))
dpins=[]
for name in deps:
 b=ROOT.joinpath(name).read_bytes();dpins.append({'path':name,'sha256':sha(b),'bytes':len(b)})
for p in oldpins['dependencies']:assert next(x for x in dpins if x['path']==p['path'])==p
names=['plan.json','api-context.json','source-check.mjs','coordinate.py','prepare.py','authority.md','.gitattributes']
pins={'version':1,'local':[{'path':n,'sha256':sha((HERE/n).read_bytes())} for n in names],
 'dependencies':dpins,'partHelper':oldpins['partHelper'],'threeCorePath':three,'priorAttemptExactPinsRetained':True}
dump('input-pins.json',pins)
loader=importlib.util.spec_from_file_location('owned_lifecycle',ROOT/'art/source/shared-map-fire-bindings/cornice-family-contact-page-01-v1/lifecycle.py');L=importlib.util.module_from_spec(loader);loader.loader.exec_module(L)
try:
 out,err,receipt=L.run_owned([shutil.which('node'),str(HERE/'source-check.mjs')],str(ROOT),'new dual-endpoint source method, same admitted lower-root cohort',34,timeout=60,journal_path=HERE/'lifecycle.jsonl')
 (HERE/'source.stdout').write_bytes(out);(HERE/'source.stderr').write_bytes(err);dump('helper-receipt.json',receipt)
 assert receipt['exited'] and receipt['exitCode']==0 and not receipt['timedOut'],err.decode(errors='replace')
 result=json.loads((HERE/'result.json').read_bytes());assert result['counts']['refreshedSourceTransformations']==36
 assert time.perf_counter()-started<600
 dump('coordinator.json',{'result':'ONE_DERIVED_METHOD_COMPLETED','elapsedMs':(time.perf_counter()-started)*1000,'limitSeconds':600,
 'children':1,'childrenExited':1,'remainingHelpers':0,'retainedPorts':[],'newParts':0,'refreshTransforms':36,'sourceRetries':0,
 'coldCoreEvaluations':result['counts']['coldCoreEvaluations'],'outputSha256':sha((HERE/'result.json').read_bytes())})
 print(out.decode().strip())
except BaseException as e:
 dump('failure.json',{'type':type(e).__name__,'message':str(e),'sourceRetry':False,'elapsedMs':(time.perf_counter()-started)*1000})
 raise
