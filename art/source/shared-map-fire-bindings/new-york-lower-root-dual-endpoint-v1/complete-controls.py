"""Complete controls and evaluate once using persisted tables, never retransform."""
from pathlib import Path
import json,hashlib,sys,shutil,importlib.util,time
sys.dont_write_bytecode=True
HERE=Path(__file__).resolve().parent;ROOT=HERE.parents[3];started=time.perf_counter()
def sha(b):return hashlib.sha256(b).hexdigest()
def dump(n,d):
 with (HERE/n).open('xb') as f:f.write((json.dumps(d,separators=(',',':'))+'\n').encode())
with (HERE/'CONTROL_COMPLETION_STARTED.json').open('xb') as f:f.write(b'{"preservedTablesOnly":true,"sourceTransformsAuthorized":0,"coldCoreEvaluationsAuthorized":1}\n')
names=['plan.json','api-context.json','input-pins.json','result.json','world-tables.json','complete-controls.mjs','complete-controls.py']
dump('completion-pins.json',{'version':1,'local':[{'path':n,'sha256':sha((HERE/n).read_bytes())} for n in names],'sourceTransforms':0,'contactSearches':0})
loader=importlib.util.spec_from_file_location('owned_lifecycle',ROOT/'art/source/shared-map-fire-bindings/cornice-family-contact-page-01-v1/lifecycle.py');L=importlib.util.module_from_spec(loader);loader.loader.exec_module(L)
out,err,receipt=L.run_owned([shutil.which('node'),str(HERE/'complete-controls.mjs')],str(ROOT),'complete two distance controls from preserved tables and one original cold evaluation',34,timeout=60,journal_path=HERE/'completion-lifecycle.jsonl')
(HERE/'completion.stdout').write_bytes(out);(HERE/'completion.stderr').write_bytes(err);dump('completion-helper-receipt.json',receipt)
assert receipt['exited'] and receipt['exitCode']==0 and not receipt['timedOut'],err.decode(errors='replace')
assert time.perf_counter()-started<600
result=json.loads((HERE/'final-source-certificate.json').read_bytes())
dump('completion-coordinator.json',{'result':'PRESERVED_TABLE_CONTROL_COMPLETION_FINISHED','elapsedMs':(time.perf_counter()-started)*1000,'children':1,'childrenExited':1,'remainingHelpers':0,'retainedPorts':[],
'additionalTransforms':0,'additionalContactSearches':0,'coldCoreEvaluations':result['counts']['coldCoreEvaluations'],'outputSha256':sha((HERE/'final-source-certificate.json').read_bytes())})
print(out.decode().strip())
