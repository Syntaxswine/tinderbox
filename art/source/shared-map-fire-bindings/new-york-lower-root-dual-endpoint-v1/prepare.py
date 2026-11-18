"""Pin current immutable APIs and the unchanged previously admitted cohort."""
from pathlib import Path
import json,hashlib,subprocess
HERE=Path(__file__).resolve().parent;ROOT=HERE.parents[3]
OLD='art/source/shared-map-fire-bindings/new-york-lower-root-trace-v1/'
def sha(b):return hashlib.sha256(b).hexdigest()
def dump(n,d):
 with (HERE/n).open('xb') as f:f.write((json.dumps(d,separators=(',',':'))+'\n').encode())
def obj(commit,path):return subprocess.run(['git','show',commit+':'+path],capture_output=True,check=True,creationflags=getattr(subprocess,'CREATE_NO_WINDOW',0)).stdout
sources=[('core','6432b450c39971f714894c434ee974be77651e1b','src/simulation/original-support-ports.js'),
 ('tolerance','989ecd6777f8a77791b0fa8ad32fcc618a2d3438','src/simulation/source-support-calculations.js'),
 ('support','dfac8dcb15c7d1820f2585068400dbbbbb189bd8','workbenches/furnished-house/support.js'),
 ('geometry','d3f14a33a933cffb96bf1a7c1a28cd71f1d93318','workbenches/furnished-house/geometry.js'),
 ('collision','6432b450c39971f714894c434ee974be77651e1b','src/runtime/collision.js')]
ctx={}
for name,commit,path in sources:
 raw=obj(commit,path);ctx[name]={'commit':commit,'path':path,'sha256':sha(raw),'moduleText':raw.decode()}
support=ctx['support']['moduleText'];a=support.index('function inPrism(');b=support.index('// Read-only geometry query',a)
ctx['support']['closureText']=support[a:b];ctx['support']['closureSha256']=sha(support[a:b].encode())
# Exact tolerance source expression; retain the full original as provenance, execute only this constant.
s=ctx['tolerance']['moduleText'];a=s.index('export const SOURCE_SUPPORT_TOLERANCE=');b=s.index(';',a)+1
ctx['tolerance']['declaration']=s[a:b]
assert ctx['tolerance']['declaration']=='export const SOURCE_SUPPORT_TOLERANCE=.00002;'
dump('api-context.json',ctx)
oldplan=ROOT.joinpath(OLD+'plan.json').read_bytes();oldresult=ROOT.joinpath(OLD+'result.json').read_bytes()
plan=json.loads(oldplan)
newplan={'version':1,'authority':'authority.md','priorAttempt':{'commit':'f48af0cc42588e507e1d8919aad4193c532f2975','planPath':OLD+'plan.json','planSha256':sha(oldplan),'resultPath':OLD+'result.json','resultSha256':sha(oldresult)},
 'scope':'New dual-endpoint method on the exact already-admitted 36 parts /34 pairs; no old common-point attempt replay.',
 'counts':plan['counts'],'partIds':[p['partId'] for p in plan['instances']],'pairIds':[r['id'] for r in plan['relationships']],
 'refresh':{'allowed':True,'maximumTransforms':36,'reason':'Prior hidden child exited and its transformed world buffers were not persisted. One explicitly authorized refresh of the same admitted parts for this new method only; persist refreshed tables for reuse.'},
 'limits':plan['limits'],'methods':{'membership':'Unchanged segmentTriangle own-original-primitive EPS 1e-7.',
 'contact':'Unchanged supportSurfacesTouch on the two original triangles and independently clipped endpoint facets.',
 'portDistance':'Existing original-support-ports dual-endpoint distance <= SOURCE_SUPPORT_TOLERANCE (2e-5 m).',
 'parallel':'Project the actual child facet to the actual parent plane, use existing overlapPolygon clipping, require positive area and strict interior own-triangle witnesses; closest-point uses the engine Three Triangle helper.',
 'selectors':'Keep both existing typed endpoint selectors separately. Otherwise each actual original endpoint bounds is its own source selector. No common selector spanning or closing gaps.',
 'oldPositive':'Reuse saved common-point witness as two equal points; validate on refreshed unchanged original slots, no old search replay.',
 'negativeControls':['Actual unrelated source faces rejected by native predicate','Actual distant points on accepted original faces rejected by port-distance rule','Wrong original primitive membership']},
 'coldCore':'One source-only existing-core cold evaluation if both exact paths become complete; fitting/upper/descendants excluded, ordinary alternatives retained. No thermal/native/compiler/clock/render/whole-map calls.',
 'nativeRecords':'UNBOUND','nativeCells':'UNBOUND'}
dump('plan.json',newplan)
print(json.dumps({'result':'NEW_METHOD_PLAN_FROZEN','parts':36,'pairs':34,'newParts':0,'planSha256':sha((HERE/'plan.json').read_bytes())}))
