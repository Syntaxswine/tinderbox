"""Final eight per-case retained-cut references; immutable accepted predicates."""
from pathlib import Path
import argparse,hashlib,importlib.util,json,os,subprocess,sys
sys.dont_write_bytecode=True
HERE=Path(__file__).resolve().parent;ROOT=HERE.parents[3]
AUTHORITY='000de69adafad7b4792a59b7b456ed557f91bf39'
AUTHORITY_PATH='docs/engineering/shared-maps/cut-front-measurement-decision.md'
PARENT='5607a80b482543554cbead3ba0333b654b94cb01'
FROZEN='2b350309d9116812a1d3988af090614bdaefbc25'
EXACT=(
 ('administration','replacement/office-door-7/jamb-1'),
 ('horticulture','replacement/court-0-0-arch-10/jamb-1'),
 ('horticulture','replacement/court-0-2-arch-10/jamb--1'),
 ('horticulture','replacement/court-0-2-arch-10/jamb-1'),
 ('horticulture','replacement/court-1-0-arch-10/jamb--1'),
 ('horticulture','replacement/court-1-0-arch-10/jamb-1'),
 ('horticulture','replacement/court-1-2-arch-10/jamb--1'),
 ('horticulture','replacement/court-1-2-arch-10/jamb-1'),
)
def module(name,path):
 s=importlib.util.spec_from_file_location(name,path);m=importlib.util.module_from_spec(s);s.loader.exec_module(m);return m
T=module('accepted_partition_and_edge_ownership',HERE.parent/'cut-partition-edge-ownership-v1/review.py');B=T.B;P=T.P
def load(path):return json.loads(path.read_text(encoding='utf-8'))
def sha(raw):return hashlib.sha256(raw).hexdigest()
def git(path,commit):return subprocess.check_output(['git','show',commit+':'+path],cwd=ROOT)
def preserve():
 count=0
 for name in ('remaining-material-proposal-v1','remaining-geometry-readiness-v1','radial-roundoff-policy-proposal-v1','radial-measurement-certificates-v1','remaining-cut-front-proposal-v1','remaining-measurement-batch-v1','direct-front-retained-cut-v1','retained-cut-case-batch-v1','cut-partition-edge-ownership-v1'):
  folder=HERE.parent/name;pkg=load(folder/'review-package.json')
  for row in pkg['files']:
   raw=(ROOT/row['path']).read_bytes();assert sha(raw)==row['sha256'] and len(raw)==row['bytes']
  assert (folder/'review-package.json').read_bytes()==git((folder/'review-package.json').relative_to(ROOT).as_posix(),PARENT)
  count+=len(pkg['files'])+1
 assert count==133
 pins=load(HERE.parent/'remaining-geometry-readiness-v1/geometry-pins.json')['files'];assert len(pins)==1572
 for pin in pins:assert sha((ROOT/pin['path']).read_bytes())==pin['sha256']
 assert (HERE/'authority-000de69a.md').read_bytes()==git(AUTHORITY_PATH,AUTHORITY)
 return count
def remaining():
 original=load(HERE.parent/'retained-cut-case-batch-v1/resolved-unresolved-ledger.json')['cases']
 prototypes=load(HERE.parent/'cut-partition-edge-ownership-v1/resolved-unresolved-ledger.json')['cases']
 accepted={(r['placeId'],r['sourceId']) for r in prototypes if r['proofCompleteForReview']}
 keys=[(r['placeId'],r['sourceId']) for r in original if not r['sourceProofCompleteForReview'] and (r['placeId'],r['sourceId']) not in accepted]
 assert tuple(keys)==EXACT and len(set(keys))==8
 old=load(HERE.parent/'remaining-cut-front-proposal-v1/scope-ledger.json')['records'];by={(r['placeId'],r['sourceId']):r for r in old}
 return [by[key] for key in keys]
def tally(records):
 ready=[r for r in records if r['proofCompleteForReview']]
 triangles=sum(len(r['originalTriangleIndexOffsets']) for r in records);pairs=0;patches=0;splits=0
 for r in ready:
  proof=r['referenceComplexProof'];n=proof['topology']['sourceAndImplicitFaces'];count=sum(proof['facePairClassifications'].values())
  assert count==n*(n-1)//2 and not proof['badFacePairs']
  pairs+=count;patches+=len(r['implicitPlanarPatchCertificates'])
  edges={tuple(sorted(p['originalEndpointReferences'])) for f in r['analyticalSourceFaceProofs'] for p in f['edgePartitions'] if len(p['orderedExistingPointReferences'])>2}
  splits+=len(edges)
 return triangles,pairs,patches,splits
def build():
 preserved=preserve();rows=remaining();sectionpins=T.V.D.descriptors(rows)
 fragments=P.frozen_json_constant('assets/art/exploration-access/fragments.js','SOURCE_FRAGMENTS=');frags={(p,f['id']):f for p,fs in fragments.items() for f in fs}
 plans=P.frozen_json_constant('assets/art/exploration-access/plans.js','ACCESS_PLANS=freeze(')
 records=[];private={};datasets={}
 for row in rows:
  key=row['placeId'],row['sourceId'];fragment=frags[key];data=B.source_geometry(row,fragment);datasets[key]=data
  cuts=[next(c for c in plans[row['placeId']]['cutVolumes'] if c['id']==reason) for reason in row['recordedCutReasons']]
  assert cuts and [c['id'] for c in cuts]==row['recordedCutReasons']
  record,parts=T.prototype(row,fragment,cuts,data)
  # Drop only the earlier prototype's scope-specific bookkeeping flag.
  # Its immutable original certificate is preserved; no proof result is altered.
  record.pop('otherEightCasesAdopted')
  record.update({'automaticConstructorWideAdoption':False,'perCaseSourceProofRecomputed':True,'sourceReferenceReviewStatus':'complete for review' if record['proofCompleteForReview'] else 'withheld; no scalar','stockBindingRuntimeAdoptionInstalled':False})
  assert record['closedSourceSolids'] is False and record['physicalContainmentCollisionSupportShortcutAuthorized'] is False
  if not record['proofCompleteForReview']:assert record['sourceReferenceVolumeExact'] is None and record['sourceDirectedLowerReference'] is None
  records.append(record);private[key]=parts
 negative=T.negative_controls(records,private,datasets)
 triangles,pairs,patches,splits=tally(records);ready=sum(r['proofCompleteForReview'] for r in records);held=8-ready
 dependencies=[]
 for name in ('review.py','reference.py'):
  p=HERE.parent/'cut-partition-edge-ownership-v1'/name
  assert p.read_bytes()==git(p.relative_to(ROOT).as_posix(),PARENT)
  dependencies.append({'path':p.relative_to(ROOT).as_posix(),'bytes':len(p.read_bytes()),'sha256':sha(p.read_bytes()),'acceptedAtArtistCommit':PARENT,'modified':False})
 summary={'version':1,'result':'PASS','authorityCommit':AUTHORITY,'exactFinalCases':8,'sourceReferencesCompleteForReview':ready,'unprovedCasesWithheld':held,'originalSourceTrianglesPreserved':triangles,'exhaustiveReferenceFacePairs':pairs,'continuousPlanarPatchesProved':patches,'exactExistingNodeSubdividedSourceEdges':splits,'negativeControls':len(negative),'priorPayloadAndPackageFilesPreserved':preserved,'originalGeometryInputsPreserved':1572,'targetedOriginalSections':len(sectionpins),'acceptedPredicateFilesChanged':0,'automaticConstructorWideAdoption':False,'physicalClosedSourceSolidsSetTrue':0,'physicalMeshCapUVCoordinateOpeningScaleChanges':0,'stockBindingSupportProfileRuntimeExports':0,'roofWorkRendererFactoryBenchmarkRetainedHelper':False}
 ledger=[{k:r[k] for k in ('placeId','sourceId','geometryPath','geometrySha256','sourceRange','originalMatrix','recordedCutReasons','proofCompleteForReview','closedMeasurementReference','closedSourceSolids','physicalContainmentCollisionSupportShortcutAuthorized','sourceReferenceVolumeExact','sourceDirectedLowerReference','withheldReason')} for r in records]
 return {'input-pins.json':{'version':1,'authorityCommit':AUTHORITY,'authoritySha256':sha((HERE/'authority-000de69a.md').read_bytes()),'parentArtistCommit':PARENT,'frozenOriginalSourceContext':FROZEN,'exactSelectedCases':[{'placeId':p,'sourceId':s} for p,s in EXACT],'producerPins':B.producer_pins(),'targetedOriginalSections':sectionpins,'unchangedAcceptedConstructionDependencies':dependencies,'sourceSelection':'Exact remaining eight from preserved ledger minus the two separately accepted prototype IDs; no constructor selection.','roofScope':'UI-owned, excluded; no roof source calculation.'},'case-reference-certificates.json':{'version':1,'cases':records},'resolved-unresolved-ledger.json':{'version':1,'scope':'final eight sources only; earlier references and UI roof decisions retain their own evidence','resolvedForReview':ready,'unresolvedWithheld':held,'constructorWideAdoption':False,'cases':ledger},'negative-controls.json':{'version':1,'controls':negative},'check-results.json':summary}
if __name__=='__main__':
 parser=argparse.ArgumentParser(description=__doc__);parser.add_argument('--save-review',action='store_true');args=parser.parse_args()
 if not args.save_review:
  def readonly(event,args):
   if event=='open' and (any(c in (args[1] or '') for c in 'wax+') or (args[2] or 0)&(os.O_WRONLY|os.O_RDWR|os.O_CREAT|os.O_TRUNC|os.O_APPEND)):raise PermissionError('Final eight-case checker refuses writes')
   if event in {'os.remove','os.rename','os.mkdir','os.rmdir','os.truncate','os.utime','os.chmod'}:raise PermissionError('Final eight-case checker refuses mutation')
  sys.addaudithook(readonly)
 outputs=build()
 for name,value in outputs.items():
  raw=B.encode(value)
  if args.save_review:(HERE/name).write_bytes(raw)
  else:assert (HERE/name).read_bytes()==raw,'Final eight-case report differs: '+name
 if not args.save_review and (HERE/'review-package.json').exists():
  for row in load(HERE/'review-package.json')['files']:
   raw=(ROOT/row['path']).read_bytes();assert len(raw)==row['bytes'] and sha(raw)==row['sha256']
 print(json.dumps(outputs['check-results.json'],sort_keys=True))
