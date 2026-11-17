"""Review only this proposal package; no renderer, geometry activation, world or runtime export."""
from pathlib import Path
import argparse,ast,hashlib,importlib.util,json,re,subprocess,sys
sys.dont_write_bytecode=True
HERE=Path(__file__).resolve().parent;ROOT=HERE.parents[3]
def mod(name,path):
 s=importlib.util.spec_from_file_location(name,path);m=importlib.util.module_from_spec(s);s.loader.exec_module(m);return m
P=mod('saddle_package_producer',HERE/'propose.py')
D=mod('saddle_package_source_contexts',HERE.parent/'parapet-clear-blocking-v1/dependency-context.py')
def rel(p):return p.relative_to(ROOT).as_posix()
def jpeg_size(p):
 raw=p.read_bytes();assert raw[:2]==b'\xff\xd8';i=2
 while i<len(raw):
  assert raw[i]==255
  while raw[i]==255:i+=1
  marker=raw[i];i+=1
  if marker in [0xd8,0xd9] or 0xd0<=marker<=0xd7:continue
  n=int.from_bytes(raw[i:i+2],'big')
  if marker in [0xc0,0xc1,0xc2,0xc3]:return int.from_bytes(raw[i+5:i+7],'big'),int.from_bytes(raw[i+3:i+5],'big')
  i+=n
 raise AssertionError('JPEG size missing')
def main():
 parser=argparse.ArgumentParser(description=__doc__);parser.add_argument('--record',action='store_true');args=parser.parse_args();context=D.verify_working_sources(ROOT)
 a=P.read(P.PROPOSAL);c=P.read(P.DIRECTORY+'/classification.json');e=P.read(P.DIRECTORY+'/check-results.json');n=P.read(P.DIRECTORY+'/native-contact-results.json');v=P.read(P.DIRECTORY+'/preview-evidence.json')
 assert c['obstructedRows']==20 and c['authoredProfiles']==1 and c['selectedSourceProposalId']=='proposal-only/blocking/main-parapet-6/bay-01'
 assert c['classCounts']=={'east-hip':2,'west-hip':2,'rear-slope-single-facet':14,'rear-slope-crossing-triangulation-seam':2}
 assert len(a['members'])==1 and a['members'][0]['matrix']==a['originalEnvelope']['matrix'] and a['members'][0]['bounds']==a['originalEnvelope']['bounds']
 assert e['result']=='PASS_ONE_UNAPPROVED_SOURCE_PROTOTYPE' and sum(e['checks'].values())==303 and len(e['negativeControls'])==2
 assert e['proposalSha256']==P.sha(P.PROPOSAL) and e['geometrySha256']==P.sha(P.GEOMETRY) and e['producerSha256']==P.sha(P.DIRECTORY+'/check.py')
 assert n['result']=='PASS_PROPOSED_SOURCE_CONTACTS' and n['prototypeCount']==1 and n['sourceShapesRead']==4 and n['nativeTriangleContacts']==3
 assert n['producerSha256']==P.sha(P.DIRECTORY+'/check-native-contacts.mjs') and n['nativeTouchingFunctionSha256']==D.CONTACT_SHA
 assert v['sessionCount']==1 and v['jpgCount']==2 and v['visualInspection']['result']=='PASS' and v['manifestSha256']==P.sha(P.PROPOSAL)
 assert v['rendererSourceSha256']==P.sha(P.DIRECTORY+'/render-preview.mjs') and v['encoderSourceSha256']==P.sha(P.DIRECTORY+'/encode-preview.ps1')
 assert {p.name for p in (HERE/'previews').glob('*.jpg')}=={'assembled-proposal.jpg','isolated-profile.jpg'}
 for o in v['outputs']:assert P.sha(o['path'])==o['sha256'] and jpeg_size(ROOT/o['path'])==(1600,1100)
 cleanup=P.read(P.DIRECTORY+'/preview-session/cleanup-receipt.json');render=P.read(P.DIRECTORY+'/preview-session/render-run.json');encoder=P.read(P.DIRECTORY+'/preview-session/encoder-run.json')
 assert cleanup['ownedTcpConnectionCount']==cleanup['retainedHelpers']==cleanup['serversStarted']==cleanup['browsersStarted']==0
 assert len(cleanup['processes'])==2 and all(not p['recordedLifetimeStillExists'] for p in cleanup['processes'])
 assert render['passed'] and encoder['passed'] and render['seconds']==31.809 and render['intendedExpirySeconds']==120 and render['port'] is None
 # Producer input pins use immutable authoring Git objects; verification contexts stay separate.
 dependencies=[]
 for old in D.historical_dependencies():
  raw=subprocess.check_output(['git','show',P.PARENT+':'+old['path']],cwd=ROOT)
  assert P.digest(raw)==old['sha256'],'New producer Git pin differs from original dependency identity'
  dependencies.append({'path':old['path'],'sourceCommit':P.PARENT,'sha256':old['sha256']})
 body=P.read(P.GEOMETRY);assert body['attributes']['position']['type']=='Float64Array' and a['geometry']['triangleCount']==16
 for refs in a['namedOriginalParents'].values():
  for r in refs:assert P.sha(r['geometryPath'])==r['sha256']
 assert a['newRuntimeStock']==a['newGroundAnchors']==a['otherNineteenProfilesExported']==0
 for p in HERE.rglob('*.py'):ast.parse(p.read_text(encoding='utf-8'),filename=str(p))
 links=[];package=HERE/'review-package.json'
 for target in re.findall(r'\[[^\]\n]+\]\(([^)\n]+)\)',(HERE/'README.md').read_text(encoding='utf-8')):
  dest=(HERE/target.split('#',1)[0]).resolve();assert dest.is_relative_to(ROOT)
  assert dest.exists() or (args.record and dest==package),'Missing handoff reference: '+target
  links.append(target)
 paths=sorted(p for p in HERE.rglob('*') if p.is_file() and p!=package)
 assert not any('__pycache__' in p.parts or p.suffix=='.pyc' for p in paths)
 files=[{'path':rel(p),'bytes':p.stat().st_size,'sha256':P.sha(rel(p))} for p in paths]
 source_inputs=[{'path':path,'sha256':sha} for path,sha in [(P.TABLE,P.TABLE_SHA),(P.BASE,P.BASE_SHA),(P.FRONT,P.FRONT_SHA)]]
 shared_renderer=P.DIRECTORY.replace('roof-saddle-proposal-v1','parapet-clear-blocking-v1')+'/render-preview.mjs'
 result={'version':1,'status':'ONE_UNAPPROVED_ROOF_SADDLE_SOURCE_PROPOSAL','candidateCommitIdentity':'Containing Git commit; candidate worker push is not promotion.',
  'authorityCommit':P.AUTHORITY,'artistParent':P.PARENT,'scopeDirectory':P.DIRECTORY,'files':files,'payloadCount':len(files),'payloadBytes':sum(f['bytes'] for f in files),
  'originalInputs':source_inputs,'historicalProducerDependencies':dependencies,
  'verificationContextPolicy':{'path':'art/source/shared-map-fire-bindings/parapet-clear-blocking-v1/dependency-contexts.json','sha256':P.sha('art/source/shared-map-fire-bindings/parapet-clear-blocking-v1/dependency-contexts.json'),'currentVerificationContextRecordedOnlyInCommandOutput':True,'runtimeAcceptanceGranted':False},
  'sourceProposalSha256':P.sha(P.PROPOSAL),'prototypeGeometrySha256':P.sha(P.GEOMETRY),'prototypes':1,'classifiedRows':20,'remainingUnauthored':19,'physicalVertices':10,'physicalTriangles':16,'sourceChecks':303,'nativeSourceContacts':3,'nativeShapes':4,'negativeControls':2,
  'sharedSoftwareRendererSource':{'path':shared_renderer,'sha256':P.sha(shared_renderer),'commit':P.PARENT},
  'renderSessions':1,'jpgs':2,'previewSeconds':render['seconds'],'helpersRetained':0,'reviewedLocalReferences':len(links),
  'priorTrackedSourceArtProofPathsPreserved':e['unchangedOldTrackedPaths'],'runtimeStockAssigned':0,'runtimeExportOrInstallation':False,'nativeActivationWorldGraphBuildOrGameRun':False,
  'limitations':['One proposed profile and three geometric source contacts only; the new roof bearing is unapproved.','Roof source keeps its roof-covering role; no structural role or anchor is invented.','Physical double-precision authoring closure is distinct from reference closure and future runtime-buffer quantization.','Other nineteen are classified but have no authored meshes or per-instance acceptance.','Native ports, cold/active accounting and damage behavior remain separate; no combined world quantity.']}
 raw=P.encode(result)
 if args.record:package.write_bytes(raw)
 else:assert package.read_bytes()==raw,'Proposal package inventory changed'
 print(json.dumps({k:result[k] for k in ['status','payloadCount','payloadBytes','prototypes','classifiedRows','sourceChecks','nativeSourceContacts','negativeControls','renderSessions','jpgs','helpersRetained','reviewedLocalReferences']}))
 print(json.dumps({'currentVerificationContext':context,'historicalProducerDependenciesPreserved':True}))
if __name__=='__main__':main()
