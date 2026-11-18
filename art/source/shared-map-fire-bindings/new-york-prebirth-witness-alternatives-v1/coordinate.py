"""One 30-second source-numeric child. No actual native allowance or retry."""
from pathlib import Path
import json,hashlib,sys,shutil,subprocess,importlib.util,time,ast
sys.dont_write_bytecode=True
HERE=Path(__file__).resolve().parent;ROOT=HERE.parents[3];started=time.perf_counter()
def sha(b):return hashlib.sha256(b).hexdigest()
def dump(n,v):
 with (HERE/n).open('xb') as f:f.write((json.dumps(v,separators=(',',':'))+'\n').encode())
plan=json.loads((HERE/'plan.json').read_bytes());assert plan['limits']['originalFacetPairs']==288 and plan['limits']['childSeconds']==30
assert plan['workingSet']['borrowedShapesAfterSharing']+plan['workingSet']['scratchShapesReserved']==32
assert plan['workingSet']['borrowedTrianglesAfterSharing']+plan['workingSet']['scratchTrianglesReserved']==512
for n in ['prepare.py','coordinate.py']:ast.parse((HERE/n).read_text(encoding='ascii'))
three='vendor/farmyard-commando/30a3b8cae5f36bb0c1df3685b7fba16f701c2083/sites/tactical-animal/dist/aft/tactics/vendor/three.core.js'
raw=ROOT.joinpath(three).read_bytes();original=subprocess.run(['git','show',plan['evidenceCommit']+':'+three],check=True,capture_output=True,creationflags=getattr(subprocess,'CREATE_NO_WINDOW',0)).stdout
assert raw==original
names=['plan.json','preflight.json','api-context.json','authority-29b46945.md','source-alternatives.mjs','prepare.py','coordinate.py','.gitattributes']+[p['path'] for p in plan['sourcePins']]
assert len(names)==len(set(names))
for p in plan['sourcePins']:assert sha((HERE/p['path']).read_bytes())==p['sha256']
lifecycle='art/source/shared-map-fire-bindings/cornice-family-contact-page-01-v1/lifecycle.py'
pins={'version':1,'local':[{'path':n,'bytes':(HERE/n).stat().st_size,'sha256':sha((HERE/n).read_bytes())} for n in names],
 'threeCore':{'path':three,'sha256':sha(raw),'commit':plan['evidenceCommit']},'ownedLifecycle':{'path':lifecycle,'sha256':sha(ROOT.joinpath(lifecycle).read_bytes())}}
dump('input-pins.json',pins)
with (HERE/'SOURCE_NUMERIC_STARTED.json').open('xb') as f:f.write(b'{"interfaces":2,"originalFacetPairLimit":288,"workingShapes":32,"workingTriangles":512,"sourceTransforms":0,"nativeCompiles":0,"graphEvaluations":0,"retriesAuthorized":false}\n')
loader=importlib.util.spec_from_file_location('owned_lifecycle',ROOT/lifecycle);L=importlib.util.module_from_spec(loader);loader.loader.exec_module(L)
try:
 out,err,receipt=L.run_owned([shutil.which('node'),str(HERE/'source-alternatives.mjs')],str(ROOT),'two pre-birth source alternatives from pinned beaf diagnostic arrays',2,timeout=30,journal_path=HERE/'lifecycle.jsonl')
 (HERE/'source.stdout').write_bytes(out);(HERE/'source.stderr').write_bytes(err);dump('helper-receipt.json',receipt)
 assert receipt['exited'] and receipt['exitCode']==0 and not receipt['timedOut'],err.decode(errors='replace')
 result=json.loads((HERE/'summary.json').read_bytes());assert result['counts']['originalFacetPairsExamined']<=288
 dump('coordinator.json',{'result':'ONE_SOURCE_NUMERIC_ATTEMPT_COMPLETED','elapsedMs':(time.perf_counter()-started)*1000,'children':1,'childrenExited':1,'remainingHelpers':0,'retainedPorts':[],
 'nativeCompiles':0,'supportSolves':0,'sourceTransforms':0,'sourceRetries':0,'outputSha256':sha((HERE/'summary.json').read_bytes())})
 print(out.decode().strip())
except BaseException as error:
 dump('failure.json',{'type':type(error).__name__,'message':str(error),'noRetry':True})
 raise
