"""Package verification for one actual native-buffer pilot; no compiler or scene."""
from pathlib import Path
import argparse,ast,importlib.util,json,re,subprocess,sys
sys.dont_write_bytecode=True
HERE=Path(__file__).resolve().parent;ROOT=HERE.parents[3]
def mod(name,p):
 s=importlib.util.spec_from_file_location(name,p);m=importlib.util.module_from_spec(s);s.loader.exec_module(m);return m
E=mod('native_pilot_package',HERE/'export.py')
D=mod('native_pilot_verification_context',HERE.parent/'parapet-clear-blocking-v1/dependency-context.py')
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
 p=argparse.ArgumentParser(description=__doc__);p.add_argument('--record',action='store_true');args=p.parse_args();context=D.verify_working_sources(ROOT)
 a=E.read(E.MANIFEST);actual=E.read(E.DIRECTORY+'/actual-buffer-results.json');check=E.read(E.DIRECTORY+'/check-results.json');preview=E.read(E.DIRECTORY+'/preview-evidence.json')
 assert actual['result']=='PASS_ACTUAL_NATIVE_BUFFERS_AND_THREE_CONTACTS' and actual['manifestSha256']==E.sha(E.MANIFEST) and actual['producerSha256']==E.sha(E.DIRECTORY+'/check-buffers.mjs')
 assert check['result']=='PASS_ONE_ACTUAL_NATIVE_BUFFER_PILOT' and sum(check['checks'].values())==170 and len(check['negativeControls'])==4
 assert check['producerSha256']==E.sha(E.DIRECTORY+'/check.py') and check['actualBufferProducerSha256']==actual['producerSha256']
 assert check['nativePhysicalShapeCount']==4 and check['createdGeometryBufferCount']==5 and check['nativeTriangleContacts']==3
 assert preview['sessionCount']==1 and preview['jpgCount']==2 and preview['visualInspection']['result']=='PASS'
 assert preview['actualBufferEvidence']['sha256']==E.sha(E.DIRECTORY+'/actual-buffer-results.json') and preview['manifestSha256']==E.sha(E.MANIFEST)
 assert preview['rendererSourceSha256']==E.sha(E.DIRECTORY+'/render-preview.mjs') and preview['encoderSourceSha256']==E.sha(E.DIRECTORY+'/encode-preview.ps1')
 assert {p.name for p in (HERE/'previews').glob('*.jpg')}=={'assembled-proposal.jpg','isolated-profile.jpg'}
 for o in preview['outputs']:assert jpeg_size(ROOT/o['path'])==(1600,1100) and E.sha(o['path'])==o['sha256']
 cleanup=E.read(E.DIRECTORY+'/preview-session/cleanup-receipt.json');run=E.read(E.DIRECTORY+'/preview-session/render-run.json');encoder=E.read(E.DIRECTORY+'/preview-session/encoder-run.json')
 assert cleanup['retainedHelpers']==cleanup['ownedTcpConnectionCount']==cleanup['serversStarted']==cleanup['browsersStarted']==0
 assert len(cleanup['processes'])==2 and all(not r['recordedLifetimeStillExists'] for r in cleanup['processes'])
 assert run['passed'] and encoder['passed'] and run['seconds']==32.393 and run['intendedExpirySeconds']==120 and run['port'] is None
 quantity=E.read(a['quantityCertificate']['path']);assert quantity['selectedGreatestFiniteBinary64']==a['members'][0]['quantityReference'] and quantity['selectionProof']=={'nextStrictlyAboveLower':True,'selectedNotAboveLower':True}
 assert a['selectedSupportSemantics']['fittingRequirement']['operator']=='ALL_FIXED_PORTS' and not a['selectedSupportSemantics']['anyParentSubstitutionAllowed']
 assert E.read(a['interfaceGates']['path'])['status']=='GEOMETRY_BUFFERS_VALID; DATA_MAPPING_AND_ALL_FIXED_PORT_CONSUMER_GATE_OPEN'
 for ref in [a['geometry'],a['renderGeometry'],a['physicalRenderMapping'],a['quantityCertificate'],a['interfaceGates'],*a['binaryBuffers'].values()]:assert E.sha(ref['path'])==ref['sha256']
 # All source data exported by this pilot uses self-contained Tinderbox paths.
 for refs in a['namedOriginalParents'].values():
  for r in refs:assert E.sha(r['geometryPath'])==r['sha256']
 for path,data in E.build().items():assert (ROOT/path).read_bytes()==data,'Native asset/source export changed: '+path
 for path in HERE.rglob('*.py'):ast.parse(path.read_text(encoding='utf-8'),filename=str(path))
 links=[];package=HERE/'review-package.json'
 for target in re.findall(r'\[[^\]\n]+\]\(([^)\n]+)\)',(HERE/'README.md').read_text(encoding='utf-8')):
  dest=(HERE/target.split('#',1)[0]).resolve();assert dest.is_relative_to(ROOT) and (dest.exists() or args.record and dest==package),'Missing local reference: '+target
  links.append(target)
 prefixes=[E.DIRECTORY,E.ASSET];paths=sorted({p for prefix in prefixes for p in (ROOT/prefix).rglob('*') if p.is_file() and p!=package})
 assert not any('__pycache__' in p.parts or p.suffix=='.pyc' for p in paths)
 files=[{'path':rel(p),'bytes':p.stat().st_size,'sha256':E.sha(rel(p))} for p in paths]
 dependencies=[]
 for old in D.historical_dependencies():
  raw=subprocess.check_output(['git','show',E.PARENT+':'+old['path']],cwd=ROOT);assert E.digest(raw)==old['sha256'];dependencies.append({'path':old['path'],'producerCommit':E.PARENT,'sha256':old['sha256']})
 result={'version':1,'status':'ONE_NATIVE_BUFFER_PILOT_CONSUMER_GATE_OPEN','containingCommitIsCandidateIdentity':True,'authorityCommit':E.AUTHORITY,'artistParent':E.PARENT,'scopedDirectories':prefixes,
  'files':files,'payloadCount':len(files),'payloadBytes':sum(f['bytes'] for f in files),'assetIndexPath':E.MANIFEST,'assetIndexSha256':E.sha(E.MANIFEST),
  'historicalProducerDependencies':dependencies,'verificationContextPolicy':{'path':'art/source/shared-map-fire-bindings/parapet-clear-blocking-v1/dependency-contexts.json','sha256':E.sha('art/source/shared-map-fire-bindings/parapet-clear-blocking-v1/dependency-contexts.json'),'currentContextOnlyInCommandOutput':True},
  'physicalVertices':10,'renderVertices':48,'triangles':16,'physicalShapesChecked':4,'geometryBuffersCreated':5,'nativeContacts':3,'sourceChecks':170,'rejectingControls':4,
  'selectedQuantityReference':quantity['selectedGreatestFiniteBinary64'],'selectedQuantityHex':quantity['selectedHex'],'quantityIsGreatestFiniteNotAboveCertifiedLower':True,
  'oldTrackedSourceArtProofPathsPreserved':check['preservedOldTrackedPaths'],'renderSessions':1,'jpgs':2,'previewSeconds':run['seconds'],'helpersRetained':0,'reviewedReferences':len(links),
  'runtimeInstalled':False,'compilerActivationWorldGraphBuildOrGameRendererRun':False,'remainingNineteenExported':0,'combinedWorldLedgerComputed':False,
  'limitations':['Geometry buffers are native-compatible and verified, but no compiler/runtime installation is claimed.','Existing consumer must retain physical/render mapping and enforce BOTH fixed lower ports with independent parent support; flat OR joins are not a substitute.','Native fragment/port retirement and transitive old-edge compatibility remain open without changing old edges.','No GPU/game-renderer, world, damage or cold/active acceptance; earlier double source/previews remain distinct.']}
 if args.record:package.write_bytes(E.encode(result))
 else:assert package.read_bytes()==E.encode(result),'Native pilot package changed'
 print(json.dumps({k:result[k] for k in ['status','payloadCount','payloadBytes','physicalVertices','renderVertices','triangles','nativeContacts','sourceChecks','rejectingControls','selectedQuantityReference','renderSessions','jpgs','helpersRetained','reviewedReferences']}))
 print(json.dumps({'currentVerificationContext':context,'historicalProducerPinsPreserved':True}))
if __name__=='__main__':main()
