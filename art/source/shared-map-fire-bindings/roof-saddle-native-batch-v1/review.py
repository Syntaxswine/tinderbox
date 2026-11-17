"""Compact package review for nineteen native assets; no renderer or graph."""
from pathlib import Path
import argparse,ast,importlib.util,json,re,subprocess,sys
sys.dont_write_bytecode=True
HERE=Path(__file__).resolve().parent;ROOT=HERE.parents[3]
def mod(name,p):
 s=importlib.util.spec_from_file_location(name,p);m=importlib.util.module_from_spec(s);s.loader.exec_module(m);return m
E=mod('batch_package_export',HERE/'export.py');D=mod('batch_package_contexts',HERE.parent/'parapet-clear-blocking-v1/dependency-context.py')
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
 raise AssertionError('JPEG header missing')
def main():
 p=argparse.ArgumentParser(description=__doc__);p.add_argument('--record',action='store_true');args=p.parse_args();context=D.verify_working_sources(ROOT)
 a=E.read(E.MANIFEST);proof=E.read(E.DIRECTORY+'/check-results.json');actual=E.read(E.DIRECTORY+'/actual-buffer-results.json');preview=E.read(E.DIRECTORY+'/preview-evidence.json');audits=E.read(a['conversionAudit']['path'])
 assert len(a['members'])==19 and len(a['profiles'])==3 and sum(p['reusedAcceptedPilotBuffers'] for p in a['profiles'].values())==1
 assert proof['result']=='PASS_NINETEEN_NATIVE_FITTINGS' and sum(proof['checks'].values())==1759 and proof['pieceCount']==19 and len(proof['preservedFailedInitialConversions'])==4
 assert proof['manifestSha256']==E.sha(E.MANIFEST) and proof['producerSha256']==E.sha(E.DIRECTORY+'/check.py') and proof['bufferProducerSha256']==actual['producerSha256']
 assert actual['manifestSha256']==E.sha(E.MANIFEST) and actual['producerSha256']==E.sha(E.DIRECTORY+'/check-buffers.mjs') and actual['physicalShapesChecked']==26 and actual['distinctGeometryBuffersCreated']==12 and actual['nativeFixedPortContacts']==57
 assert len([r for r in audits['pieces'] if r['initialConversion']=='FAILED_ROOF_SEPARATION_PRESERVED'])==4
 assert all(len(p['occupiedStockCells'])==2 for p in proof['pieces'])
 for profile in a['profiles'].values():
  for ref in [profile['physicalGeometry'],profile['renderGeometry'],profile['physicalRenderMapping'],*profile['binaryBuffers'].values()]:assert E.sha(ref['path'])==ref['sha256']
 for refs in a['namedOriginalParents'].values():
  for r in refs:assert E.sha(r['geometryPath'])==r['sha256']
 for path,data in E.build().items():assert (ROOT/path).read_bytes()==data,'Deterministic batch differs: '+path
 assert a['runtimeStockAssigned']==0 and not a['runtimeInstalled'] and not a['worldLedgerComputed']
 assert E.sha(a['firstPilotPreserved']['path'])==a['firstPilotPreserved']['sha256']
 assert preview['sessionCount']==1 and preview['jpgCount']==2 and preview['visualInspection']['result']=='PASS' and preview['manifestSha256']==E.sha(E.MANIFEST)
 assert preview['rendererSourceSha256']==E.sha(E.DIRECTORY+'/render-preview.mjs') and preview['encoderSourceSha256']==E.sha(E.DIRECTORY+'/encode-preview.ps1') and preview['actualBufferEvidence']['sha256']==E.sha(E.DIRECTORY+'/actual-buffer-results.json')
 assert {p.name for p in (HERE/'previews').glob('*.jpg')}=={'assemblies.jpg','profiles.jpg'}
 ids={m['id'] for m in a['members']}
 for out in preview['outputs']:
  assert E.sha(out['path'])==out['sha256'] and jpeg_size(ROOT/out['path'])==(1600,1640)
  assert len(out['cells'])==19 and {c['id'] for c in out['cells']}==ids
 cleanup=E.read(E.DIRECTORY+'/preview-session/cleanup-receipt.json');run=E.read(E.DIRECTORY+'/preview-session/render-run.json');encoder=E.read(E.DIRECTORY+'/preview-session/encoder-run.json')
 assert cleanup['retainedHelpers']==cleanup['ownedTcpConnectionCount']==cleanup['serversStarted']==cleanup['browsersStarted']==0 and len(cleanup['processes'])==2 and all(not r['recordedLifetimeStillExists'] for r in cleanup['processes'])
 assert run['passed'] and encoder['passed'] and run['seconds']==85.218 and run['intendedExpirySeconds']==120
 dependencies=[]
 for r in D.historical_dependencies():
  raw=subprocess.check_output(['git','show',E.PARENT+':'+r['path']],cwd=ROOT);assert E.digest(raw)==r['sha256'];dependencies.append({'path':r['path'],'producerCommit':E.PARENT,'sha256':r['sha256']})
 for path in HERE.rglob('*.py'):ast.parse(path.read_text(encoding='utf-8'),filename=str(path))
 package=HERE/'review-package.json';links=[]
 for target in re.findall(r'\[[^\]\n]+\]\(([^)\n]+)\)',(HERE/'README.md').read_text(encoding='utf-8')):
  dest=(HERE/target.split('#',1)[0]).resolve();assert dest.is_relative_to(ROOT) and (dest.exists() or args.record and dest==package),'Missing handoff path: '+target;links.append(target)
 prefixes=[E.DIRECTORY,E.ASSET];paths=sorted({p for prefix in prefixes for p in (ROOT/prefix).rglob('*') if p.is_file() and p!=package})
 assert not any('__pycache__' in p.parts or p.suffix=='.pyc' for p in paths)
 entries=[{'path':rel(p),'bytes':p.stat().st_size,'sha256':E.sha(rel(p))} for p in paths]
 result={'version':1,'status':'NINETEEN_NATIVE_ASSETS_RUNTIME_SUPPORT_GATE_OPEN','containingCommitIsCandidateIdentity':True,'authorityCommit':E.AUTHORITY,'artistParent':E.PARENT,'scopedDirectories':prefixes,
  'files':entries,'payloadCount':len(entries),'payloadBytes':sum(r['bytes'] for r in entries),'assetIndexPath':E.MANIFEST,'assetIndexSha256':E.sha(E.MANIFEST),'members':19,'instanceTriangles':304,'profiles':3,'reusedAcceptedPilotProfiles':1,
  'sourceChecks':1759,'preservedFailedInitialConversions':4,'nativeFixedPortContacts':57,'physicalShapesChecked':26,'distinctGeometryBuffersCreated':12,'allQuantitiesIndividuallyDirectedDown':True,
  'historicalProducerDependencies':dependencies,'verificationContextPolicy':{'path':'art/source/shared-map-fire-bindings/parapet-clear-blocking-v1/dependency-contexts.json','sha256':E.sha('art/source/shared-map-fire-bindings/parapet-clear-blocking-v1/dependency-contexts.json'),'currentContextOnlyInCommandOutput':True},
  'preservedOldTrackedPaths':proof['preservedOldTrackedPaths'],'renderSessions':1,'actualBufferJpgs':2,'previewSeconds':run['seconds'],'helpersRetained':0,'reviewedReferences':len(links),'runtimeInstalled':False,'runtimeStockAssigned':0,'aggregateWorldLedgerComputed':False,'compilerActivationWorldTrialGraphBuildBenchmarkOrGameRendererRun':False,
  'limitations':['Physical/render mapping and BOTH independent fixed lower-port liveness/support remain a coder consumer gate.','Native source port selectors are not installed native fragment bindings.','No old edges change; transitive runtime compatibility is not established by graph execution.','JPGs show all nineteen new actual buffers with whole-building context omitted; first accepted pilot remains excluded and unchanged.']}
 if args.record:package.write_bytes(E.encode(result))
 else:assert package.read_bytes()==E.encode(result),'Batch package differs'
 print(json.dumps({k:result[k] for k in ['status','payloadCount','payloadBytes','members','profiles','sourceChecks','preservedFailedInitialConversions','nativeFixedPortContacts','physicalShapesChecked','renderSessions','actualBufferJpgs','helpersRetained','reviewedReferences']}))
 print(json.dumps({'currentVerificationContext':context,'historicalProducerPinsPreserved':True}))
if __name__=='__main__':main()
