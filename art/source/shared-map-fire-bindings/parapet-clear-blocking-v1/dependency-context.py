"""Frozen producer provenance and exact, paired verification-source admission."""
from pathlib import Path
import copy,hashlib,json,subprocess,sys
sys.dont_write_bytecode=True
HERE=Path(__file__).resolve().parent;ROOT=HERE.parents[3]
ORIGINAL='7698e083b36635694e73dc07aa38748355e670a8'
APPROVED='df3dbcea7d6823e4c44479ded6c58d8bb176a94a'
PACKAGE=(HERE/'review-package.json').relative_to(ROOT).as_posix()
PACKAGE_SHA='38c7028cd0551c96a1119a570036c7f056fa6057732888edc95ee6e8a8e03fb3'
PATHS=('workbenches/furnished-house/geometry.js','workbenches/furnished-house/support.js')
CONTACT_SHA='4a1c082c518c22d31bfbf6c6d01ff49d4b6589a246eb8182b662b48d16f58441'
ALLOWED=(
 ('original-producer',ORIGINAL,('04b9019305d6cfe8eb5843cbd05506f6698999400d92857c41afbd2d2098c847','b223335247526ff50971401d6cfa3e26dc1fb849b9fff29982b1a13fefd9f49b')),
 ('approved-combined-m29',APPROVED,('b58a40073a4047cb00383409c67d971d94dbda94e3bcdc9e6fff386a7df0834c','7de66c0954bfa606c74f659209867d6d2cb08236e327e7fc8265a334b14fe372')),
)
GRAVITY_ADDITION=b'// One world-time gravity integration for native debris and supported bodies.\n// The caller owns velocity; preserve the existing semi-implicit operation order.\nexport function gravityStep(position,velocity,delta){velocity[1]-=9.81*delta;return add(position,mul(velocity,delta));}\n'
_cache=None
def sha(raw):return hashlib.sha256(raw).hexdigest()
def encode(data):return (json.dumps(data,indent=2,sort_keys=True)+'\n').encode()
def git(commit,path):return subprocess.check_output(['git','show',commit+':'+path],cwd=ROOT)
def normalize(raw):
 raw=raw.replace(b'\r\n',b'\n');assert b'\r' not in raw,'Only CRLF-to-LF normalization is approved'
 return raw
def source_blocks(sources):
 geom,support=[normalize(sources[p]) for p in PATHS]
 assert geom.count(b'export function createBoundaryIndex(')==1
 math=geom.partition(b'export function createBoundaryIndex(')[0]
 assert math.count(GRAVITY_ADDITION)<=1
 math=math.replace(GRAVITY_ADDITION,b'')
 assert support.count(b'function touching(a,b) {')==1 and support.count(b'// Read-only geometry query')==1
 contact=support[support.index(b'function touching(a,b) {'):support.index(b'// Read-only geometry query')]
 assert sha(contact)==CONTACT_SHA,'Native contact predicate changed'
 assert support.count(b'export function createSupportGraph(scene) {')==1
 prefix=support.partition(b'export function createSupportGraph(scene) {')[0]
 return {'nativeTouchingFunctionSha256':sha(contact),'supportImportsPrismAndContactPrefixLFSha256':sha(prefix),'geometryMathPrefixWithoutExactApprovedGravityAdditionLFSha256':sha(math)}
def producer_package():
 raw=git(ORIGINAL,PACKAGE);assert sha(raw)==PACKAGE_SHA,'Historical producer package changed'
 archived=(HERE/'context-portability-v1/review-package-before.json').read_bytes()
 assert archived==raw,'Historical package snapshot changed'
 return json.loads(raw)
def expected_policy():
 original=producer_package();contexts=[];blobs={};required=None
 for identity,commit,hashes in ALLOWED:
  sources={p:git(commit,p) for p in PATHS};files=[]
  for p,h in zip(PATHS,hashes):
   raw=sources[p];lf=normalize(raw)
   assert sha(lf)==h
   files.append({'path':p,'gitBlobSha1':hashlib.sha1(b'blob '+str(len(raw)).encode()+b'\0'+raw).hexdigest(),'committedBytes':len(raw),'committedSha256':sha(raw),'lfBytes':len(lf),'lfSha256':h})
  blocks=source_blocks(sources)
  if required is None:required=blocks
  assert blocks==required,'Consumed contact/math blocks differ between the frozen contexts'
  contexts.append({'id':identity,'sourceCommit':commit,'files':files,'admission':'Exact paired verification source only; no new runtime or geometry acceptance.'})
  blobs[identity]={p:normalize(b) for p,b in sources.items()}
 policy={'version':1,'historicalProducer':{'commit':ORIGINAL,'packagePath':PACKAGE,'packageSha256':PACKAGE_SHA,'snapshotPath':(HERE/'context-portability-v1/review-package-before.json').relative_to(ROOT).as_posix(),'dependencyPins':original['dependencyPins']},
  'allowedVerificationContexts':contexts,'normalization':'Only CRLF-to-LF; reject bare CR. Unknown whole sources and mixed original/approved pairs are rejected.',
  'requiredUnchangedSourceBlocks':required,'approvedAdditionExcludedFromMathEquality':'Exactly the recorded three-line gravity helper addition, only for comparing unchanged contact math. Whole-file hashes are still required.',
  'currentVerificationContextIsNotHistoricalProducerProvenance':True,'runtimeAcceptanceGranted':False,'sourceGeometryOrProducerPinsRefreshed':False}
 return policy,blobs
def policy():
 global _cache
 if _cache is None:
  expected,blobs=expected_policy();actual=json.loads((HERE/'dependency-contexts.json').read_text(encoding='utf-8'));assert actual==expected,'Frozen dependency-context policy changed';_cache=(actual,blobs)
 return _cache
def admit(sources):
 data,blobs=policy();assert set(sources)==set(PATHS),'Exact two helper sources required'
 normalized={p:normalize(sources[p]) for p in PATHS};matches=[row for row in data['allowedVerificationContexts'] if all(sha(normalized[f['path']])==f['lfSha256'] and len(normalized[f['path']])==f['lfBytes'] for f in row['files'])]
 assert len(matches)==1,'Unapproved whole-source pair; unchanged contact predicate alone does not admit a context'
 chosen=matches[0];assert normalized==blobs[chosen['id']],'Whole-source bytes differ from the frozen Git context'
 assert source_blocks(normalized)==data['requiredUnchangedSourceBlocks']
 return {'id':chosen['id'],'sourceCommit':chosen['sourceCommit'],'lfSha256':{p:sha(normalized[p]) for p in PATHS},'nativeTouchingFunctionSha256':CONTACT_SHA,'requiredSourceBlocksUnchanged':True,'runtimeAcceptanceGranted':False}
def working_sources(root=ROOT):return {p:(root/p).read_bytes() for p in PATHS}
def verify_working_sources(root=ROOT):
 result=admit(working_sources(root));producer=producer_package()
 for row in producer['dependencyPins']:
  if row['path'] not in PATHS:assert sha((root/row['path']).read_bytes())==row['sha256'],'Unchanged producer math dependency differs: '+row['path']
 return result
def historical_dependencies():return copy.deepcopy(producer_package()['dependencyPins'])
def preserve_checkpoint():
 old=producer_package();allowed={(HERE/'review.py').relative_to(ROOT).as_posix(),'docs/art/shared-map-fire-bindings/parapet-clear-blocking-v1/README.md'};count=0
 for row in old['files']:
  if row['path'] in allowed:continue
  raw=(ROOT/row['path']).read_bytes();assert len(raw)==row['bytes'] and sha(raw)==row['sha256'],'Original payload changed: '+row['path'];count+=1
 path=(HERE/'review.py').relative_to(ROOT).as_posix()
 assert (HERE/'context-portability-v1/review-before.py').read_bytes()==git(ORIGINAL,path),'Original verifier snapshot changed'
 return count
def controls():
 data,blobs=policy();results=[]
 for row in data['allowedVerificationContexts']:
  for ending in ['LF','CRLF']:
   sources={p:b if ending=='LF' else b.replace(b'\n',b'\r\n') for p,b in blobs[row['id']].items()}
   result=admit(sources);assert result['id']==row['id'];results.append({'name':row['id']+' '+ending,'result':'PASS_EXACT_ADMISSION','context':result})
 original=blobs['original-producer'];approved=blobs['approved-combined-m29']
 def reject(name,sources):
  try:admit(sources)
  except AssertionError as e:results.append({'name':name,'result':'EXPECTED_REJECTION','reason':str(e),'sourceLFSha256':{p:sha(normalize(raw)) for p,raw in sources.items() if b'\r' not in raw.replace(b'\r\n',b'\n')}})
  else:raise AssertionError('Unknown context admitted: '+name)
 reject('unknown geometry source with unchanged predicate',{**original,PATHS[0]:original[PATHS[0]]+b'\n// unapproved change\n'})
 reject('unknown support scene marker with unchanged predicate',{**approved,PATHS[1]:approved[PATHS[1]].replace(b'scene.data.scene?.version===1',b'scene.data.scene?.version===2')})
 reject('changed contact predicate',{**original,PATHS[1]:original[PATHS[1]].replace(b'function touching(a,b) {',b'function touching(a,b) { /* changed */')})
 reject('mixed original geometry and approved support',{PATHS[0]:original[PATHS[0]],PATHS[1]:approved[PATHS[1]]})
 reject('bare carriage return',{**original,PATHS[0]:original[PATHS[0]]+b'\r'})
 return {'version':1,'result':'PASS_EXACT_DEPENDENCY_CONTEXT_CONTROLS','allowedVerificationContexts':data['allowedVerificationContexts'],'requiredUnchangedSourceBlocks':data['requiredUnchangedSourceBlocks'],'positiveControls':4,'rejectingControls':5,'controls':results,
  'historicalProducerDependencyPins':historical_dependencies(),'originalPayloadsPreserved':preserve_checkpoint(),'oldPhysicalSourcesAssetsImagesOrReceiptsRewritten':False,'nativeGeometryRendererOrWorldRun':False,'runtimeAcceptanceGranted':False}
if __name__=='__main__':
 import argparse
 p=argparse.ArgumentParser(description=__doc__);p.add_argument('--record',action='store_true');args=p.parse_args()
 if args.record:(HERE/'dependency-contexts.json').write_bytes(encode(expected_policy()[0]))
 report=controls();path=HERE/'context-portability-v1/verification-controls.json'
 if args.record:path.write_bytes(encode(report))
 else:assert path.read_bytes()==encode(report),'Context control evidence differs'
 print(json.dumps({'result':report['result'],'positiveControls':report['positiveControls'],'rejectingControls':report['rejectingControls'],'originalPayloadsPreserved':report['originalPayloadsPreserved'],'workingContext':verify_working_sources()}))
