"""Package-only review with immutable Git-source context reads; no native activation or render."""
from pathlib import Path
import argparse,datetime,hashlib,importlib.util,json,math,re,struct,sys
sys.dont_write_bytecode=True
HERE=Path(__file__).resolve().parent;ROOT=HERE.parents[3]
spec=importlib.util.spec_from_file_location('clear_package_export',HERE/'export.py');E=importlib.util.module_from_spec(spec);spec.loader.exec_module(E)
context_spec=importlib.util.spec_from_file_location('parapet_dependency_context',HERE/'dependency-context.py');D=importlib.util.module_from_spec(context_spec);context_spec.loader.exec_module(D)
DOC='docs/art/shared-map-fire-bindings/parapet-clear-blocking-v1'
PREFIXES=[HERE.relative_to(ROOT).as_posix(),E.DIRECTORY,DOC]
def rel(p):return p.relative_to(ROOT).as_posix()
def jpeg_size(p):
 data=p.read_bytes();assert data[:2]==b'\xff\xd8','Not JPEG'
 i=2
 while i<len(data):
  assert data[i]==255,'JPEG segment alignment'
  while data[i]==255:i+=1
  marker=data[i];i+=1
  if marker in [0xd8,0xd9] or 0xd0<=marker<=0xd7:continue
  n=int.from_bytes(data[i:i+2],'big')
  if marker in [0xc0,0xc1,0xc2,0xc3]:return (int.from_bytes(data[i+5:i+7],'big'),int.from_bytes(data[i+3:i+5],'big'))
  i+=n
 raise AssertionError('JPEG size missing')
def elapsed(a):
 return (datetime.datetime.fromisoformat(a['finishedAt'].replace('Z','+00:00'))-datetime.datetime.fromisoformat(a['startedAt'].replace('Z','+00:00'))).total_seconds()
def expected():
 a=E.read(E.MANIFEST);plan=E.read(rel(HERE/'preview-session/plan.json'));cleanup=E.read(rel(HERE/'preview-session/cleanup-receipt.json'))
 render=E.read(rel(HERE/'preview-session/render-run.json'));first=E.read(rel(HERE/'preview-session/first-encoding-run.json'));final=E.read(rel(HERE/'preview-session/final-encoding-run.json'))
 assert cleanup['ownedTcpConnectionCount']==0 and cleanup['retainedHelpers']==0 and all(not p['recordedLifetimeStillExists'] for p in cleanup['processes'])
 assert render['seconds']<120 and not render['passed'] and first['passed'] and final['passed']
 assert len(plan['views'])==2 and len(list((ROOT/DOC/'previews').glob('*.jpg')))==2
 members=[]
 for m in a['members']:
  cells=[[x,y,z] for x in range(math.floor(m['bounds']['min'][0]),math.ceil(m['bounds']['max'][0])) for y in range(math.floor(m['bounds']['min'][1]/2.12),math.ceil(m['bounds']['max'][1]/2.12)) for z in range(math.floor(m['bounds']['min'][2]),math.ceil(m['bounds']['max'][2]))]
  joins=[j for j in a['joins'] if j['evidence']['blockCarrierId']==m['id']]
  assert len(joins)==2 and len(cells)==2
  members.append({'id':m['id'],'pivotWorldMetres':m['matrix'][12:15],'physicalBounds':m['bounds'],'occupiedStockCells':cells,'nativeBay':m['nativeBay'],
   'connections':[{'joinId':j['id'],'childCarrierId':j['childCarrierId'],'parentCarrierId':j['parentCarrierId'],'childPoint':j['childRegion']['witnessPoint'],'parentPoint':j['parentRegion']['witnessPoint']} for j in joins]})
 modular={'version':1,'manifestPath':E.MANIFEST,'manifestSha256':E.sha(E.MANIFEST),'stockCellSizeXYZMetres':[1,2.12,1],'cellIndices':'X, Y/level, Z; zero-based world-cell coordinates, positive occupied volume only.',
  'pivot':'Original normalized cube centre. Original world matrix and attachment surfaces retained.','dimensionsMetres':[.16,.20999999821185966,.16],
  'geometryBufferShared':a['geometry'],'physicalTextureDensity':'Original metre-scaled UV and grossUV arrays unchanged.',
  'allowedPlacementTransforms':'Only the exact approved source matrices in this batch; no new rotated, mirrored or procedural placements approved.',
  'connectionRule':'One block at each selected clear one-metre bay; bottom cornice bearing and top parapet bearing only. No saddle, brace or anchor.',
  'levelNote':'These are subcell architectural fittings, not new floor surfaces. No floor height or native level pitch changes.',
  'members':members}
 historical=(HERE/'preview-attempt-01/render-preview.mjs').read_text(encoding='utf-8');current=(HERE/'render-preview.mjs').read_text(encoding='utf-8')
 separator='}else{\n const a=read(manifestPath)'
 assert separator in historical and separator in current
 original_worker=historical.partition(separator)[2];assert original_worker==current.partition(separator)[2],'Rendered geometry/shading worker changed'
 outputs=[]
 for v in plan['views']:
  path=DOC+'/previews/'+v['name']+'.jpg';assert jpeg_size(ROOT/path)==(1600,1100)
  outputs.append({'path':path,'sha256':E.sha(path),'width':1600,'height':1100,'camera':v['camera'],'originalParentCarrierIds':v['sourceCarrierIds'],'newCarrierIds':v['newCarrierIds'],
   'triangles':v['triangles'],'imageWidthMetres':2*v['camera']['halfWidth'],'imagePixelsPerMetre':1600/(2*v['camera']['halfWidth']),'rulerMetres':v['rulerMetres'],
   'visualInspection':'PASS: actual blocks and original parents readable at declared scale; labels/ruler readable with opaque backing. Tiny retained separation is below pixel scale.'})
 raster_hashes=E.read(rel(HERE/'preview-session/raster-output-hashes.json'))
 preview={'version':1,'result':'PASS','rasterSessions':1,'rasterViews':2,'deliveredJpgs':2,'activeRenderAndConversionSeconds':round(render['seconds']+elapsed(first)+elapsed(final),6),
  'scope':'Offline actual-source triangle close-ups only. No game, UI, fire, whole-building context, native activation or full support acceptance.',
  'renderer':'Pure JavaScript orthographic triangle rasterizer with original linear source material colours, diffuse directional light/shadow, 2x sampling; OS JPEG encoding.',
  'renderedWorkerSha256':E.digest(original_worker.encode()),'executedRasterizer':{'path':rel(HERE/'preview-attempt-01/render-preview.mjs'),'sha256':E.sha(rel(HERE/'preview-attempt-01/render-preview.mjs'))},
  'currentRasterizer':{'path':rel(HERE/'render-preview.mjs'),'sha256':E.sha(rel(HERE/'render-preview.mjs')),'sameWorkerAsExecuted':True,'change':'Encoder command invocation only; no geometry rerender.'},
  'finalEncoder':{'path':rel(HERE/'encode-preview.ps1'),'sha256':E.sha(rel(HERE/'encode-preview.ps1')),'execution':'Ordinary authorized command runner, using the exact saved BMPs; header/ruler backing added after visual QA.'},
  'initialFailureArchive':rel(HERE/'preview-attempt-01/failures.json'),'renderStageOriginalRecordPreserved':rel(HERE/'preview-session/render-run.json'),
  'finalEncodingRecord':rel(HERE/'preview-session/final-encoding-run.json'),'cleanupReceipt':rel(HERE/'preview-session/cleanup-receipt.json'),
  'rasterOutputHashes':raster_hashes,'outputs':outputs,'policySettingsChanged':False,'bypassFlagsUsed':False,'newRenderForEncodingRecovery':False,'runtimeBehaviorAcceptance':False}
 return {'modular-evidence.json':modular,'preview-evidence.json':preview}
def main():
 p=argparse.ArgumentParser(description=__doc__);p.add_argument('--record',action='store_true');args=p.parse_args()
 current_context=D.verify_working_sources(ROOT);D.preserve_checkpoint()
 if args.record and not (HERE/'preview-session/raster-output-hashes.json').exists():
  art=ROOT/'artifacts/shared-map-fire-bindings/parapet-clear-blocking-v1'
  rows=[{'path':rel(art/n),'bytes':(art/n).stat().st_size,'sha256':E.sha(rel(art/n)),'requiredForPackageVerification':False} for n in ['repeat-closeup.bmp','bearing-closeup.bmp']]
  (HERE/'preview-session/raster-output-hashes.json').write_bytes(E.encode({'version':1,'files':rows,'note':'Preserved transient raster identities; source/cameras regenerate them. Final JPGs are self-contained and no raster rerun is part of package checking.'}))
 for name,data in expected().items():
  target=HERE/name
  if args.record and not target.exists():target.write_bytes(E.encode(data))
  else:assert target.read_bytes()==E.encode(data),'Evidence changed: '+name
 linked=[]
 docpath=ROOT/DOC/'README.md'
 for target in re.findall(r'\[[^\]\n]+\]\(([^)\n]+)\)',docpath.read_text(encoding='utf-8')):
  assert not target.startswith(('http:','https:','file:')),'Expected local handoff reference'
  resolved=(docpath.parent/target.split('#',1)[0]).resolve();assert resolved.is_relative_to(ROOT) and resolved.exists(),'Missing local handoff reference: '+target
  linked.append(target)
 files=sorted({p for prefix in PREFIXES for p in (ROOT/prefix).rglob('*') if p.is_file() and p.name!='review-package.json'})
 assert not any('__pycache__' in p.parts or p.suffix=='.pyc' for p in files)
 entries=[{'path':rel(p),'bytes':p.stat().st_size,'sha256':E.sha(rel(p))} for p in files]
 dependencies=D.historical_dependencies()
 context_policy={'path':rel(HERE/'dependency-contexts.json'),'sha256':E.sha(rel(HERE/'dependency-contexts.json')),'dependencyPinsMeaning':'Frozen historical producer dependencies from '+D.ORIGINAL+'; current verification context is admitted separately and reported only in command output.','historicalProducerPackageSha256':D.PACKAGE_SHA,'approvedVerificationCommit':D.APPROVED,'runtimeAcceptanceGranted':False}
 checks=E.read(rel(HERE/'check-results.json'))
 package={'version':1,'task':'M29 separate 96 accepted clear parapet blocks','candidateCommitIdentity':'Containing Git commit; pushed worker branch is a candidate, not promotion.',
  'artistParent':E.PARENT,'assignmentCommit':E.ASSIGNMENT,'approvalCommit':E.APPROVAL,'scopedDirectories':PREFIXES,'files':entries,'payloadCount':len(entries),'payloadBytes':sum(e['bytes'] for e in entries),
  'dependencyPins':dependencies,'dependencyContextPolicy':context_policy,'manifestPath':E.MANIFEST,'manifestSha256':E.sha(E.MANIFEST),'geometrySharedFromExistingPrototype':True,
  'members':96,'instanceTriangles':1152,'localBearings':192,'originalParents':16,'newGroundAnchors':0,'additionalStaticFrameUnits':4.3008,
  'sourceChecks':sum(checks['checks'].values()),'rejectingControls':len(checks['negativeControls']),'earlierTrackedPathsPreserved':checks['preservation']['earlierTrackedPathsUnchanged'],
  'handoffReferencesReviewed':len(linked),'rasterSessions':1,'deliveredJpgs':2,'previewHelpersClosed':True,'runtimeInstalled':False,'nativeActivationRun':False,'wholeBuildingIntersectionRerun':False,'combinedWorldLedgerComputed':False,
  'sourceSolidExclusionMethod':'Exact approved proof identity substitution with original geometry byte pins reverified; fresh finite native contact checks limited to named pieces/parents.',
  'limitations':['Cold/active accounting, native fragment mapping and damage behavior remain coder work.','No running-game or full structural acceptance.','Roof saddles remain unapproved.','Existing provenance/rights are preserved; no new license grant.']}
 path=HERE/'review-package.json'
 if args.record:path.write_bytes(E.encode(package))
 else:assert path.read_bytes()==E.encode(package),'Package hash or reference inventory changed'
 print(json.dumps({k:package[k] for k in ['payloadCount','payloadBytes','members','instanceTriangles','localBearings','sourceChecks','rejectingControls','handoffReferencesReviewed','rasterSessions','deliveredJpgs','previewHelpersClosed']}))
 print(json.dumps({'currentVerificationContext':current_context,'historicalProducerDependencyPinsPreserved':True}))
 print('PASS: exact package hashes, frozen producer provenance, admitted source context, JPEG sizes, lifecycle receipts and local handoff references.')
if __name__=='__main__':main()
