"""Per-case captured retained-material references; no physical closure/export."""
from pathlib import Path
from fractions import Fraction as F
import argparse,collections,hashlib,importlib.util,json,math,os,struct,subprocess,sys
sys.dont_write_bytecode=True
HERE=Path(__file__).resolve().parent;ROOT=HERE.parents[3]
AUTHORITY='54502507c8984b0b9c7f3b37126be2737141a80e'
AUTHORITY_PATH='docs/engineering/shared-maps/cut-front-measurement-decision.md'
PARENT='0625c637bb649a55838a5d143e52b066434450c1'
FROZEN='2b350309d9116812a1d3988af090614bdaefbc25'
def module(name,path):
 s=importlib.util.spec_from_file_location(name,path);m=importlib.util.module_from_spec(s);s.loader.exec_module(m);return m
D=module('accepted_direct_and_reference',HERE.parent/'direct-front-retained-cut-v1/review.py');B=D.B;P=D.P;C=D.C;X=D.X;G=D.G
R=module('per_case_planar_references',HERE/'reference.py')
def load(path):return json.loads(path.read_text(encoding='utf-8'))
def sha(raw):return hashlib.sha256(raw).hexdigest()
def encode(value):return B.encode(value)
def fr(value):return F(int(value['numerator']),int(value['denominator']))
def git(path,commit):return subprocess.check_output(['git','show',commit+':'+path],cwd=ROOT)
def preserve():
 n=0
 for name in ('remaining-material-proposal-v1','remaining-geometry-readiness-v1','radial-roundoff-policy-proposal-v1','radial-measurement-certificates-v1','remaining-cut-front-proposal-v1','remaining-measurement-batch-v1','direct-front-retained-cut-v1'):
  folder=HERE.parent/name;pkg=load(folder/'review-package.json')
  for row in pkg['files']:assert sha((ROOT/row['path']).read_bytes())==row['sha256']
  assert (folder/'review-package.json').read_bytes()==git((folder/'review-package.json').relative_to(ROOT).as_posix(),PARENT)
  n+=len(pkg['files'])+1
 for pin in load(HERE.parent/'remaining-geometry-readiness-v1/geometry-pins.json')['files']:assert sha((ROOT/pin['path']).read_bytes())==pin['sha256']
 assert (HERE/'authority-54502507.md').read_bytes()==git(AUTHORITY_PATH,AUTHORITY)
 return n
def float32_cell(value):
 v=float(value);bits=struct.unpack('<I',struct.pack('<f',v))[0]
 if v==0:prev,nxt=-F(1,2**149),F(1,2**149)
 else:
  before=bits-1 if v>0 else bits+1;after=bits+1 if v>0 else bits-1
  prev=F(struct.unpack('<f',struct.pack('<I',before))[0]);nxt=F(struct.unpack('<f',struct.pack('<I',after))[0])
 return bits,(prev+value)/2,(value+nxt)/2
def in_cell(v,bits,lo,hi):return lo<v<hi or (v in (lo,hi) and bits%2==0)
def cut_planes(cut):
 out=[{'label':'minimum-Y','normal':(F(0),F(1),F(0)),'constant':F(cut['minY']),'axis':1,'endpointAxisValues':[F(cut['minY'])]}, {'label':'maximum-Y','normal':(F(0),F(-1),F(0)),'constant':-F(cut['maxY']),'axis':1,'endpointAxisValues':[F(cut['maxY'])]}]
 poly=[tuple(map(F,p)) for p in cut['polygon']];orientation=1 if G.area2(poly)>0 else -1
 for j,(a,b) in enumerate(zip(poly,poly[1:]+poly[:1])):
  n=tuple(F(orientation)*v for v in (-(b[1]-a[1]),F(0),b[0]-a[0]));c=n[0]*a[0]+n[2]*a[1]
  axes=[(axis,[a[uv],b[uv]]) for uv,axis in ((0,0),(1,2)) if P.f32(float(a[uv]))==P.f32(float(b[uv]))]
  out.append({'label':'polygon-edge-'+str(j),'normal':n,'constant':c,'axis':axes[0][0] if axes else None,'endpointAxisValues':axes[0][1] if axes else [],'recordedEdgeXZ':[a,b]})
 return out
def distance_interval(q,n):
 lo,hi=C.sqrt_bounds(sum(x*x for x in n));assert lo>0
 return (q/hi,q/lo) if q>=0 else (q/lo,q/hi)
def boundary_correspondence(loop,vector,data,fragment,cut):
 raw=[tuple(map(F,fragment['vertices'][i][:3])) for i,p in enumerate(data['points']) if p in set(loop)]
 matches=[]
 for plane in cut_planes(cut):
  n,c=plane['normal'],plane['constant']
  if R.dot(vector,n)<=0:continue
  rawq=[R.dot(n,p)-c for p in raw];capturedq=[R.dot(n,p)-c for p in loop];route=None;cell=None
  if all(q==0 for q in rawq):route='exact-precast-boundary-on-recorded-cut-plane'
  axis=plane['axis']
  if axis is not None and len({p[axis] for p in loop})==1:
   captured=loop[0][axis];values=plane['endpointAxisValues']
   if all(F(P.f32(float(v)))==captured for v in values):
    bits,low,high=float32_cell(captured)
    if all(in_cell(v[axis],bits,low,high) for v in raw) and all(in_cell(v,bits,low,high) for v in values):
     route=route or 'recorded-edge-and-raw-boundary-share-exact-captured-Float32-axis-cell'
     cell={'axis':axis,'capturedCoordinate':captured,'capturedBitsUint32Hex':f'0x{bits:08x}','recordedEndpointCoordinateRange':[min(values),max(values)],'rawBoundaryCoordinateRange':[min(p[axis] for p in raw),max(p[axis] for p in raw)],'roundingCell':[low,high],'halfCellBound':max(captured-low,high-captured),'maximumObservedRawToCapturedChange':max(abs(p[axis]-captured) for p in raw),'allCastsAndCellsVerified':True}
  if route:
   # Positive recorded-plane residual is inside the removed convex cut.
   outside=[distance_interval(-q,n) for q in capturedq]
   matches.append({'recordedPlane':plane,'sourceCorrespondenceRoute':route,'sourceCellEvidence':cell,'precastRecordedPlaneResidualRange':[min(rawq),max(rawq)],'capturedRecordedPlaneResidualRange':[min(capturedq),max(capturedq)],'signedOutsideClearanceInterval':[min(v[0] for v in outside),max(v[1] for v in outside)],'negativeClearancePreserved':min(v[0] for v in outside)<0,'sourceLocalCoordinateCastBound':[max(abs(p[k]-F(P.f32(float(p[k])))) for p in raw) for k in range(3)],'geometryToleranceUsed':False})
 return {'proved':bool(matches),'matchingRecordedPlanes':matches,'note':'Exact recorded/source cast correspondence; signed clearances are data, not a permission to snap, weld or move an opening.'}
def loop_diagnostic(loop,data):
 refs={p:min(i for i,q in enumerate(data['points']) if q==p) for p in loop}
 vector=tuple(sum(R.cross(a,b)[k] for a,b in zip(loop,loop[1:]+loop[:1]))/2 for k in range(3))
 if vector==(0,0,0):
  vector=next((R.cross(R.sub(loop[i],loop[0]),R.sub(loop[j],loop[0])) for i in range(1,len(loop)) for j in range(i+1,len(loop)) if R.cross(R.sub(loop[i],loop[0]),R.sub(loop[j],loop[0]))!=(0,0,0)),(F(0),)*3)
 residuals=[R.dot(vector,R.sub(p,loop[0])) for p in loop]
 return {'originalBoundaryVertexReferences':[refs[p] for p in loop],'existingConstantAxes':[k for k in range(3) if len({p[k] for p in loop})==1],'candidateExactPlaneNormal':vector,'exactPlaneResidualRange':[min(residuals),max(residuals)],'exactPlanarityProved':vector!=(0,0,0) and all(q==0 for q in residuals),'newVertexOrFaceBuffer':False}
def component_reference(ids,data,fragment,cut):
 tris=[data['triangles'][i] for i in ids];audit,loops,bad=G.boundary_audit(tris);diagnostics=[loop_diagnostic(loop,data) for loop in loops]
 result={'originalTriangleIndexOffsets':[3*i for i in ids],'sourceBoundaryAudit':audit,'boundaryDiagnostics':diagnostics,'proofComplete':False,'closedSourceSolids':False,'physicalClosednessOrContainmentShortcutAuthorized':False}
 if not audit['degreeTwoBoundaryLoops']:
  return {**result,'reason':'raw/captured boundary graph does not give separate simple loops'}
 if audit['exactExistingVertexEdgeSplits']:
  return {**result,'reason':'proved prototype requires original edge ownership; an exact existing-node atomisation extension needs separate review'}
 if any(not r['exactPlanarityProved'] for r in diagnostics):
  return {**result,'reason':'one or more literal captured boundary loops are not exactly planar; no plane fit or hull'}
 try:proof=R.prove_reference(tris,loops)
 except (AssertionError,ValueError) as error:
  return {**result,'reason':'oriented planar reference topology/loop predicate remains unproved','predicateExceptionClass':type(error).__name__}
 caps=proof.pop('implicitCaps');correspondence=[boundary_correspondence(c['loop'],c['areaVector'],data,fragment,cut) for c in caps]
 cap_records=[]
 for c,corr in zip(caps,correspondence):
  refs=[min(i for i,p in enumerate(data['points']) if p==q) for q in c['loop']]
  cap_records.append({'existingOrientedSourceVertexReferences':refs,'projectionDropAxis':c['projectionDropAxis'],'constantSourceAxes':c['constantSourceAxes'],'simplePlanarLoopProved':c['simplePlanarLoopProved'],'orientedAreaVector':c['areaVector'],'intrinsicAreaSquaredExact':c['intrinsicAreaSquaredExact'],'sourceOriginVolumeContribution':c['sourceOriginVolumeContribution'],'recordedCutCorrespondence':corr})
 complete=proof['proofComplete'] and all(c['proved'] for c in correspondence)
 points=[p for t in tris for p in t];lo=tuple(min(p[k] for p in points) for k in range(3));hi=tuple(max(p[k] for p in points) for k in range(3))
 return {**result,'proofComplete':complete,'reason':None if complete else 'embedded reference or exact source-cut correspondence remains unproved','mathematicalReferenceProof':proof,'implicitReferenceFaceEvidence':cap_records,'sourceReferenceVolumeExact':proof['closedReferenceVolumeExact'] if complete else None,'coordinateHalfspaceLimitsForDisjointnessOnly':{'min':lo,'max':hi},'closedMeasurementReference':complete,'sourceTrianglesOrCapsChanged':False}
def separation(a,b):
 lo1,hi1=a['coordinateHalfspaceLimitsForDisjointnessOnly']['min'],a['coordinateHalfspaceLimitsForDisjointnessOnly']['max'];lo2,hi2=b['coordinateHalfspaceLimitsForDisjointnessOnly']['min'],b['coordinateHalfspaceLimitsForDisjointnessOnly']['max']
 candidates=[]
 for k in range(3):
  if hi1[k]<=lo2[k]:candidates.append({'axis':k,'firstMaximum':hi1[k],'secondMinimum':lo2[k],'signedGap':lo2[k]-hi1[k]})
  if hi2[k]<=lo1[k]:candidates.append({'axis':k,'firstMaximum':hi2[k],'secondMinimum':lo1[k],'signedGap':lo1[k]-hi2[k]})
 return {'disjointReferenceInteriorsProved':bool(candidates),'separatingActualCoordinateHalfspaces':candidates,'actualVolumeFromBounds':False,'jointOrSupportProof':False}
def reference_case(row,fragment,cut,data):
 components,zero=G.components(data['triangles'])
 assert sum(len(ids) for ids in components)+zero==len(data['triangles'])
 certs=[component_reference(ids,data,fragment,cut) for ids in components];ready=bool(certs) and all(c['proofComplete'] for c in certs);pairs=[]
 if ready:
  for i,a in enumerate(certs):
   for j,b in enumerate(certs[:i]):
    proof=separation(a,b);pairs.append({'componentIndices':[j,i],**proof})
    if not proof['disjointReferenceInteriorsProved']:ready=False
 volume=sum(c['sourceReferenceVolumeExact'] for c in certs)*abs(data['determinant']) if ready else None
 return {'placeId':row['placeId'],'sourceId':row['sourceId'],'geometryPath':row['geometryPath'],'geometrySha256':row['geometrySha256'],'sourceRange':row['sourceRange'],'originalMatrix':row['matrix'],'actualAffineDeterminant':data['determinant'],'originalConstructorMetadata':fragment['sourceData'],'recordedCut':cut,'allOriginalTriangleIndexOffsets':[3*i for i in range(len(data['triangles']))],'exactZeroAreaTrianglesExcludedOnlyFromMeasures':zero,'sourceSurfaceComponents':len(certs),'componentCertificates':certs,'componentDisjointInteriorProofs':pairs,'sourceProofCompleteForReview':ready,'closedMeasurementReference':ready,'closedSourceSolids':False,'physicalContainmentCollisionSupportShortcutAuthorized':False,'singleSourceUnionReferenceVolumeExact':volume,'sourceDirectedLowerReferenceForReview':C.lower_representation(volume/F(.12)) if ready else None,'componentStockPlusUnionStockCreated':False,'stockBindingRuntimeOrMeshExport':None,'rawSourceFactsChanged':False}
def build_proposals(cases):
 proposals=[];seen=set()
 for record in cases:
  if record['sourceProofCompleteForReview']:continue
  for component in record['componentCertificates']:
   reason=component.get('reason','')
   category='nonplanar-boundary' if 'not exactly planar' in reason else 'edge-ownership-or-source-correspondence'
   if category in seen:continue
   seen.add(category)
   text='Partition the one existing nonplanar cut boundary by its recorded source cut-plane ownership, then prove each planar patch, shared-edge orientation, full embedded reference and volume. Preserve every captured source triangle/coordinate; no single fitted disk, enclosing hull or restored whole solid.' if category=='nonplanar-boundary' else 'Trace the exact remaining boundary edge ownership and original pre-Float32 source-plane mapping for this source only. If existing-node atomisation or a typed producer-coordinate reference is needed, prove it explicitly and repeat embedding/volume checks before adoption; no distance weld or coordinate snap.'
   proposals.append({'scopeExactSourceId':record['sourceId'],'placeId':record['placeId'],'category':category,'currentFailure':reason,'minimalProposal':text,'accepted':False,'applied':False,'quantity':None,'meshCapUVOrOpeningExport':False})
   if len(proposals)==2:return proposals
 return proposals
def controls(cases,rows,frags,plans,datasets):
 out=[]
 for record in cases:
  if not record['sourceProofCompleteForReview']:continue
  cert=record['componentCertificates'][0]
  assert not separation(cert,cert)['disjointReferenceInteriorsProved']
  out.append({'sourceId':record['sourceId'],'control':'same positive-volume reference offered twice as disjoint components','result':'REJECT_DOUBLE_COUNT','physicalMeshChanged':False})
  # At least one original boundary is required for every currently open case.
  row=next(r for r in rows if r['sourceId']==record['sourceId']);data=datasets[row['placeId'],row['sourceId']]
  ids=cert['originalTriangleIndexOffsets'];triangles=[data['triangles'][offset//3] for offset in ids]
  _,loops,_=G.boundary_audit(triangles);assert loops
  rejected=False
  try:R.prove_reference(triangles,loops[:-1])
  except (AssertionError,ValueError):rejected=True
  assert rejected
  out.append({'sourceId':record['sourceId'],'control':'omit one actual source boundary loop','result':'REJECT_INCOMPLETE_REFERENCE','physicalMeshChanged':False})
 return out
def build():
 prior=preserve()
 previous=load(HERE.parent/'remaining-measurement-batch-v1/box-certificates.json')['cases']
 selected=[r for r in previous if not r['proofComplete'] and r['sourceId']!='replacement/rotunda-gallery-guard-12/cap-0'];assert len(selected)==29
 oldrows=load(HERE.parent/'remaining-cut-front-proposal-v1/scope-ledger.json')['records'];by={(r['placeId'],r['sourceId']):r for r in oldrows}
 rows=[by[r['placeId'],r['sourceId']] for r in selected]+[next(r for r in oldrows if r['sourceId']=='replacement/rotunda-gallery-guard-12/baluster-6')]
 assert len(rows)==30
 sectionpins=D.descriptors(rows)
 fragments=P.frozen_json_constant('assets/art/exploration-access/fragments.js','SOURCE_FRAGMENTS=');frags={(place,f['id']):f for place,fs in fragments.items() for f in fs}
 plans=P.frozen_json_constant('assets/art/exploration-access/plans.js','ACCESS_PLANS=freeze(')
 cases=[];datasets={}
 for row in rows:
  fragment=frags[row['placeId'],row['sourceId']];data=B.source_geometry(row,fragment);datasets[row['placeId'],row['sourceId']]=data
  cut=next(c for c in plans[row['placeId']]['cutVolumes'] if c['id']==row['recordedCutReasons'][0])
  cases.append(reference_case(row,fragment,cut,data))
 proposals=build_proposals(cases);negative=controls(cases,rows,frags,plans,datasets)
 ready=[r for r in cases if r['sourceProofCompleteForReview']];held=[r for r in cases if not r['sourceProofCompleteForReview']]
 assert len(ready)+len(held)==30 and len(proposals)<=2 and all(r['closedSourceSolids'] is False for r in cases)
 component_negative=sum(len(r['componentDisjointInteriorProofs']) for r in ready)
 summary={'version':1,'result':'PASS','authorityCommit':AUTHORITY,'remainingBoxSourcesExamined':29,'remainingBalusterSourcesExamined':1,'exactCaseCount':30,'sourceReferencesCompleteForReview':len(ready),'unprovedCasesWithheld':len(held),'completeBoxReferences':sum(r['sourceId']!='replacement/rotunda-gallery-guard-12/baluster-6' for r in ready),'completeOtherBalusterReference':any(r['sourceId']=='replacement/rotunda-gallery-guard-12/baluster-6' for r in ready),'multiComponentDisjointInteriorProofs':component_negative,'negativeControls':len(negative),'minimalUnadoptedProposals':len(proposals),'priorPayloadAndPackageFilesPreserved':prior,'originalGeometryInputsPreserved':1572,'targetedOriginalSections':len(sectionpins),'physicalClosedSourceSolidsSetTrue':0,'oldRawSourceFactsChanged':0,'meshCapUVCoordinateOpeningScaleChanges':0,'stockSupportBindingRuntimeProfileExports':0,'roofWorkDuplicated':False,'rendererFactoryRetainedHelperBenchmark':False}
 ledger=[{k:r[k] for k in ('placeId','sourceId','geometryPath','geometrySha256','sourceRange','originalMatrix','actualAffineDeterminant','sourceProofCompleteForReview','closedMeasurementReference','closedSourceSolids','physicalContainmentCollisionSupportShortcutAuthorized','singleSourceUnionReferenceVolumeExact','rawSourceFactsChanged')} for r in cases]
 return {'input-pins.json':{'version':1,'authorityCommit':AUTHORITY,'authoritySha256':sha((HERE/'authority-54502507.md').read_bytes()),'parentArtistCommit':PARENT,'frozenOriginalSourceContext':FROZEN,'producerPins':B.producer_pins(),'targetedOriginalSections':sectionpins,'acceptedPredicateSourcePath':'art/source/shared-map-fire-bindings/direct-front-retained-cut-v1/reference.py','acceptedPredicateSourceSha256':sha((HERE.parent/'direct-front-retained-cut-v1/reference.py').read_bytes()),'extension':'Exact arbitrary planar-loop projection only; no planarity allowance, fit, weld or physical mesh change.','roofScope':'UI-owned; not calculated here.'},'case-reference-certificates.json':{'version':1,'cases':cases},'resolved-unresolved-ledger.json':{'version':1,'cases':ledger},'minimal-proposals.json':{'version':1,'proposals':proposals,'adopted':False},'negative-controls.json':{'version':1,'controls':negative},'check-results.json':summary}
if __name__=='__main__':
 parser=argparse.ArgumentParser(description=__doc__);parser.add_argument('--save-review',action='store_true');args=parser.parse_args()
 if not args.save_review:
  def readonly(event,args):
   if event=='open' and (any(c in (args[1] or '') for c in 'wax+') or (args[2] or 0)&(os.O_WRONLY|os.O_RDWR|os.O_CREAT|os.O_TRUNC|os.O_APPEND)):raise PermissionError('Per-case source checker refuses writes')
   if event in {'os.remove','os.rename','os.mkdir','os.rmdir','os.truncate','os.utime','os.chmod'}:raise PermissionError('Per-case source checker refuses mutation')
  sys.addaudithook(readonly)
 outputs=build()
 for name,value in outputs.items():
  raw=encode(value)
  if args.save_review:(HERE/name).write_bytes(raw)
  else:assert (HERE/name).read_bytes()==raw,'Per-case reference output differs: '+name
 if not args.save_review and (HERE/'review-package.json').exists():
  for row in load(HERE/'review-package.json')['files']:
   raw=(ROOT/row['path']).read_bytes();assert len(raw)==row['bytes'] and sha(raw)==row['sha256']
 print(json.dumps(outputs['check-results.json'],sort_keys=True))
