"""One <=30 second owned source child, three fixed interfaces only."""
from pathlib import Path
import json,hashlib,sys,time,shutil,importlib.util,ast
sys.dont_write_bytecode=True
HERE=Path(__file__).resolve().parent;ROOT=HERE.parents[3];started=time.perf_counter()
def sha(b):return hashlib.sha256(b).hexdigest()
def dump(n,d):
 with (HERE/n).open('xb') as f:f.write((json.dumps(d,separators=(',',':'))+'\n').encode())
plan=json.loads((HERE/'plan.json').read_bytes());preflight=json.loads((HERE/'preflight.json').read_bytes())
assert preflight['result']=='EXACT_FOUR_PART_THREE_INTERFACE_PREFLIGHT_PASS'
assert len(plan['parts'])==4 and len(plan['ports'])==3 and sum(p['physicalTriangleCount'] for p in plan['parts'])==48
assert plan['limits']['sourceTransformsPlanned']==0 and plan['limits']['childDeadlineSeconds']==30
for name in ['prepare.py','coordinate.py']:ast.parse((HERE/name).read_text(encoding='ascii'))
three='vendor/farmyard-commando/30a3b8cae5f36bb0c1df3685b7fba16f701c2083/sites/tactical-animal/dist/aft/tactics/vendor/three.core.js'
deps=[p['path'] for p in plan['sourcePins']]+[
 'art/source/shared-map-fire-bindings/new-york-lower-root-dual-endpoint-v1/api-context.json',
 'art/source/shared-map-fire-bindings/cornice-six-source-representatives-v1/component-context.json',
 'art/source/shared-map-fire-bindings/cornice-six-source-representatives-v1/donor-facet-method.mjs.txt',
 'art/source/shared-map-fire-bindings/cornice-family-contact-page-01-v1/lifecycle.py',three]
dpins=[]
for name in dict.fromkeys(deps):
 b=ROOT.joinpath(name).read_bytes();dpins.append({'path':name,'sha256':sha(b),'bytes':len(b)})
for p in plan['sourcePins']:assert next(q['sha256'] for q in dpins if q['path']==p['path'])==p['sha256']
facet=ROOT.joinpath('art/source/shared-map-fire-bindings/cornice-six-source-representatives-v1/donor-facet-method.mjs.txt').read_bytes();a=facet.index(b'function overlapPolygon(');b=facet.index(b'function pairPoints(')
names=['plan.json','preflight.json','authority-b7958c76.md','source-proofs.mjs','coordinate.py','prepare.py','.gitattributes']
dump('input-pins.json',{'version':1,'local':[{'path':n,'sha256':sha((HERE/n).read_bytes())} for n in names],'dependencies':dpins,'threeCorePath':three,
 'overlapHelper':{'path':'art/source/shared-map-fire-bindings/cornice-six-source-representatives-v1/donor-facet-method.mjs.txt','byteStart':a,'byteEnd':b,'sha256':sha(facet[a:b])}})
with (HERE/'CALCULATION_STARTED.json').open('xb') as f:f.write(b'{"threeFixedInterfacesOnly":true,"sourceTransformsAuthorized":0,"supportSolvesAuthorized":0,"nativeExperimentsAuthorized":0,"retriesAuthorized":false}\n')
loader=importlib.util.spec_from_file_location('owned_lifecycle',ROOT/'art/source/shared-map-fire-bindings/cornice-family-contact-page-01-v1/lifecycle.py');L=importlib.util.module_from_spec(loader);loader.loader.exec_module(L)
try:
 out,err,receipt=L.run_owned([shutil.which('node'),str(HERE/'source-proofs.mjs')],str(ROOT),'three fixed saddle source-witness proposals from accepted saved buffers',3,timeout=30,journal_path=HERE/'lifecycle.jsonl')
 (HERE/'source.stdout').write_bytes(out);(HERE/'source.stderr').write_bytes(err);dump('helper-receipt.json',receipt)
 assert receipt['exited'] and receipt['exitCode']==0 and not receipt['timedOut'],err.decode(errors='replace')
 result=json.loads((HERE/'summary.json').read_bytes());assert result['counts']['sourceTransforms']==0 and result['counts']['supportSolves']==0
 dump('coordinator.json',{'result':'THREE_INTERFACE_SOURCE_CHILD_COMPLETED','elapsedMs':(time.perf_counter()-started)*1000,'children':1,'childrenExited':1,'childDeadlineSeconds':30,
  'remainingHelpers':0,'retainedPorts':[],'sourceTransforms':0,'supportSolves':0,'nativeCompiles':0,'outputSha256':sha((HERE/'summary.json').read_bytes())})
 print(out.decode().strip())
except BaseException as error:
 dump('failure.json',{'type':type(error).__name__,'message':str(error),'sourceRetry':False})
 raise
