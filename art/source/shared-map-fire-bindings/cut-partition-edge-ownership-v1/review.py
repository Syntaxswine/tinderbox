"""Exactly two analytical prototypes; no physical geometry or stock export."""
from pathlib import Path
from fractions import Fraction as F
import argparse,collections,hashlib,importlib.util,json,os,subprocess,sys
sys.dont_write_bytecode=True
HERE=Path(__file__).resolve().parent;ROOT=HERE.parents[3]
AUTHORITY='89d4073103f436187236ee0272c1ceac6067fe02'
AUTHORITY_PATH='docs/engineering/shared-maps/cut-front-measurement-decision.md'
PARENT='30499d04069bea041bf7cf06b4b0e6ba9bff0291'
FROZEN='2b350309d9116812a1d3988af090614bdaefbc25'
SELECTED=(('administration','replacement/office-door-7/header'),('horticulture','replacement/court-0-0-arch-10/jamb--1'))
def module(name,path):
 s=importlib.util.spec_from_file_location(name,path);m=importlib.util.module_from_spec(s);s.loader.exec_module(m);return m
V=module('accepted_per_case',HERE.parent/'retained-cut-case-batch-v1/review.py');B=V.B;P=V.P;C=V.C;G=V.G
E=module('exact_partition_edge_proof',HERE/'reference.py');E.configure(V.R)
def load(path):return json.loads(path.read_text(encoding='utf-8'))
def sha(raw):return hashlib.sha256(raw).hexdigest()
def git(path,commit):return subprocess.check_output(['git','show',commit+':'+path],cwd=ROOT)
def preserve():
 count=0
 for name in ('remaining-material-proposal-v1','remaining-geometry-readiness-v1','radial-roundoff-policy-proposal-v1','radial-measurement-certificates-v1','remaining-cut-front-proposal-v1','remaining-measurement-batch-v1','direct-front-retained-cut-v1','retained-cut-case-batch-v1'):
  folder=HERE.parent/name;pkg=load(folder/'review-package.json')
  for row in pkg['files']:
   raw=(ROOT/row['path']).read_bytes();assert sha(raw)==row['sha256'] and len(raw)==row['bytes']
  assert (folder/'review-package.json').read_bytes()==git((folder/'review-package.json').relative_to(ROOT).as_posix(),PARENT)
  count+=len(pkg['files'])+1
 for pin in load(HERE.parent/'remaining-geometry-readiness-v1/geometry-pins.json')['files']:
  assert sha((ROOT/pin['path']).read_bytes())==pin['sha256']
 assert count==121
 assert (HERE/'authority-89d40731.md').read_bytes()==git(AUTHORITY_PATH,AUTHORITY)
 return count
def refs(data):
 out={}
 for i,p in enumerate(data['points']):out.setdefault(p,i)
 return out
def source_correspondence(loop,vector,data,fragment,cuts):
 matches=[]
 for operation,cut in enumerate(cuts):
  corr=V.boundary_correspondence(loop,vector,data,fragment,cut)
  for row in corr['matchingRecordedPlanes']:
   matches.append({**row,'recordedCutId':cut['id'],'recordedOperationIndex':operation,'sourcePlaneKey':cut['id']+'::'+row['recordedPlane']['label']})
 return matches
def edge_ownership(a,b,data,fragment,cuts):
 matches=[]
 for operation,cut in enumerate(cuts):
  for plane in V.cut_planes(cut):
   corr=V.boundary_correspondence([a,b],plane['normal'],data,fragment,cut)
   for row in corr['matchingRecordedPlanes']:
    if row['recordedPlane']['label']==plane['label']:matches.append({**row,'recordedCutId':cut['id'],'recordedOperationIndex':operation,'sourcePlaneKey':cut['id']+'::'+plane['label']})
 return matches
def partition(boundary,data,fragment,cuts):
 pool=E.source_pool(data['triangles']);ref=refs(data);groups=collections.defaultdict(list);ledger=[]
 for item in boundary:
  a,b=item['referenceDirectedEdge'];owners=edge_ownership(a,b,data,fragment,cuts)
  E.require(len(owners)==1,'boundary edge does not have exactly one proven recorded cut-plane owner')
  label=owners[0]['sourcePlaneKey'];groups[label].append((a,b))
  ledger.append({'sourceTriangleIndexOffset':3*item['sourceFace'],'sourceDirectedEdgeReferences':[ref[p] for p in item['sourceDirectedEdge']],'opposedReferenceDirectedEdgeReferences':[ref[a],ref[b]],'recordedCutPlaneOwner':owners[0]})
 patches=[];certs=[]
 for label,edges in sorted(groups.items()):
  outgoing={};incoming={}
  for a,b in edges:
   E.require(a not in outgoing and b not in incoming,'cut-plane boundary ownership branches')
   outgoing[a]=b;incoming[b]=a
  starts=set(outgoing)-set(incoming);ends=set(incoming)-set(outgoing)
  E.require((not starts and not ends) or (len(starts)==len(ends)==1),'cut-plane boundary is not one directed chain or cycle')
  start=next(iter(starts)) if starts else min(outgoing);loop=[start];used=0
  while loop[-1] in outgoing:
   nxt=outgoing[loop[-1]];used+=1
   if nxt==start:break
   E.require(nxt not in loop,'cut-plane boundary chain repeats a source vertex')
   loop.append(nxt)
  E.require(used==len(edges),'cut-plane ownership contains disconnected chains')
  joint=None
  if starts:
   a,b=loop[-1],loop[0]
   other=[r for r in edge_ownership(a,b,data,fragment,cuts) if r['sourcePlaneKey']!=label and r['sourcePlaneKey'] in groups]
   E.require(len(other)==1,'patch closure joint is not on exactly one other owned captured cut plane')
   joint={'existingEndpointReferences':[ref[a],ref[b]],'otherRecordedCutPlaneOwner':other[0],'newSourcePoint':False}
  loop,subdivisions=E.atom_loop(loop,pool);normal,_=E.face_geometry(loop)
  corr=source_correspondence(loop,normal,data,fragment,cuts)
  selected=[r for r in corr if r['sourcePlaneKey']==label]
  E.require(len(selected)==1,'planar patch orientation/source correspondence is unproved')
  patches.append({'kind':'implicit-patch','recordedCutPlaneKey':label,'loop':loop})
  certs.append({'recordedCutPlaneKey':label,'existingOrientedSourceVertexReferences':[ref[p] for p in loop],'exactPlanarityAndConvexityProved':True,'orientedAreaVector':normal,'continuousPatchVolumeContribution':E.flux(loop),'sourcePlaneCorrespondence':selected[0],'jointClosureEvidence':joint,'physicalCapVertexOrIndexBuffer':False})
 return patches,certs,ledger
def captured_cut_planes(cut):
 out=[]
 for plane in V.cut_planes(cut):
  axis=plane['axis'];E.require(axis is not None,'non-axis captured finite cut needs separate proof')
  E.require(all(plane['normal'][k]==0 for k in range(3) if k!=axis),'finite cut plane is not exactly axis aligned')
  values=plane['endpointAxisValues'];captured=F(P.f32(float(values[0])))
  E.require(all(F(P.f32(float(v)))==captured for v in values),'recorded finite plane endpoints do not share a captured coordinate')
  sign=1 if plane['normal'][axis]>0 else -1
  normal=tuple(F(sign) if k==axis else F(0) for k in range(3))
  bits,low,high=V.float32_cell(captured)
  E.require(all(V.in_cell(v,bits,low,high) for v in values),'recorded finite cut coordinate lies outside its captured rounding cell')
  out.append({'label':plane['label'],'normal':normal,'constant':sign*captured,'recordedPlane':plane,'capturedCoordinate':captured,'capturedBitsUint32Hex':f'0x{bits:08x}','roundingCell':[low,high],'recordedEndpointValuesInsideCell':True})
 return out
def finite_source_ownership(triangles,patches,cutcerts,cuts):
 bycut={cut['id']:captured_cut_planes(cut) for cut in cuts}
 def residuals(points,plane):return [E.dot(plane['normal'],p)-plane['constant'] for p in points]
 source_checks=[]
 for i,t in enumerate(triangles):
  for cut in cuts:
   separating=[{'plane':p['label'],'signedCapturedResidualRange':[min(residuals(t,p)),max(residuals(t,p))]} for p in bycut[cut['id']] if max(residuals(t,p))<=0]
   E.require(separating,'an original source triangle enters a captured cut interior')
   source_checks.append({'sourceTriangleIndexOffset':3*i,'recordedCutId':cut['id'],'outsideCapturedCutInteriorHalfspaces':separating})
 patch_checks=[]
 for patch,cert in zip(patches,cutcerts):
  owner=cert['sourcePlaneCorrespondence']['recordedCutId'];ownplanes=bycut[owner];loop=patch['loop'];bounds=[]
  for p in ownplanes:
   q=residuals(loop,p)
   E.require(min(q)>=0,'reference patch leaves its finite captured cut domain')
   rawq=[E.dot(p['recordedPlane']['normal'],point)-p['recordedPlane']['constant'] for point in loop]
   bounds.append({'plane':p['label'],'capturedInsideResidualRange':[min(q),max(q)],'originalRecordedPlaneResidualRange':[min(rawq),max(rawq)],'nonzeroRecordedDifferencePreserved':any(v!=0 for v in rawq)})
  other_checks=[]
  for other in cuts:
   if other['id']==owner:continue
   separating=[{'plane':p['label'],'signedCapturedResidualRange':[min(residuals(loop,p)),max(residuals(loop,p))]} for p in bycut[other['id']] if max(residuals(loop,p))<=0]
   E.require(separating,'reference patch enters another recorded captured cut interior')
   other_checks.append({'otherRecordedCutId':other['id'],'outsideOtherCapturedCutInteriorHalfspaces':separating})
  patch_checks.append({'recordedCutPlaneKey':patch['recordedCutPlaneKey'],'ownerFiniteCapturedCutId':owner,'finiteDomainVertexHalfspaces':bounds,'convexPatchInteriorIncludedByVertexHalfspaces':True,'survivesAllOtherRecordedCuts':other_checks,'planeDifferenceZeroedOrToleranceUsed':False})
 return {'allOriginalSourceTrianglesOutsideEveryCapturedCutInterior':source_checks,'finitePatchOwnership':patch_checks,'capturedPlaneCertificates':[{'recordedCutId':cut['id'],'planes':bycut[cut['id']]} for cut in cuts],'recordedOperationOrder':[cut['id'] for cut in cuts],'physicalCoordinateOrClearanceChange':False}
def analytical_records(source,proofs,data):
 ref=refs(data);out=[]
 for face,p in zip(source,proofs):
  partitions=[]
  for row in p['edgePartitions']:
   partitions.append({'originalEndpointReferences':[ref[q] for q in row['originalEdge']],'orderedExistingPointReferences':[ref[q] for q in row['orderedExistingPoints']],'exactParameters':row['parameters'],'coverageExactlyOnce':row['coverageExactlyOnce']})
  out.append({k:v for k,v in p.items() if k!='edgePartitions'}|{'analyticalBoundaryReferences':[ref[q] for q in face['loop']],'edgePartitions':partitions})
 return out
def joint_records(faces,data):
 ref=refs(data);out=[]
 for key,owners in E.incidence(faces).items():
  if len(owners)==2 and all(faces[o[0]]['kind']=='implicit-patch' for o in owners):
   out.append({'existingSourcePointReferences':[ref[q] for q in key],'referenceFaceIndices':[o[0] for o in owners],'oppositeUsesProved':sum(o[1] for o in owners)==0,'newPointOrPhysicalEdge':False})
 return out
def prototype(row,fragment,cuts,data):
 audit,loops,_=G.boundary_audit(data['triangles'])
 result={'placeId':row['placeId'],'sourceId':row['sourceId'],'geometryPath':row['geometryPath'],'geometrySha256':row['geometrySha256'],'sourceRange':row['sourceRange'],'originalMatrix':row['matrix'],'actualAffineDeterminant':data['determinant'],'recordedCutReasons':row['recordedCutReasons'],'recordedCutsInOriginalOrder':cuts,'originalConstructorMetadata':fragment['sourceData'],'originalTriangleIndexOffsets':list(range(0,3*len(data['triangles']),3)),'preservedRawBoundaryAudit':audit,'wholeBoundaryLoopDiagnostics':[V.loop_diagnostic(loop,data) for loop in loops],'proofCompleteForReview':False,'closedMeasurementReference':False,'closedSourceSolids':False,'physicalContainmentCollisionSupportShortcutAuthorized':False,'physicalGeometryUVCoordinateOpeningChanges':False,'stockBindingSupportRuntimeProfileExport':None,'sourceReferenceVolumeExact':None,'sourceDirectedLowerReference':None,'otherEightCasesAdopted':False}
 try:
  source,proofs=E.source_faces(data['triangles'])
  result['analyticalSourceFaceProofs']=analytical_records(source,proofs,data)
  result['analyticalSourceCoverageAreaAndIntegralsUnchanged']=True
  boundary=E.source_boundary(source)
  patches,patchcerts,ownership=partition(boundary,data,fragment,cuts)
  result['boundaryCutPlaneOwnership']=ownership;result['implicitPlanarPatchCertificates']=patchcerts
  result['finiteCutSourceOwnership']=finite_source_ownership(data['triangles'],patches,patchcerts,cuts)
  proof,faces=E.prove(data['triangles'],source,patches)
  result['referenceComplexProof']=proof;result['sharedPatchEdgeProofs']=joint_records(faces,data)
  volume=proof['closedReferenceVolumeExact']*abs(data['determinant'])
  result.update({'proofCompleteForReview':True,'closedMeasurementReference':True,'sourceReferenceVolumeExact':volume,'sourceDirectedLowerReference':C.lower_representation(volume/F(.12)),'withheldReason':None})
  return result,(source,patches,loops)
 except E.ProofError as error:
  result['withheldReason']=str(error)
  return result,None
def negative_controls(records,private,datasets):
 controls=[]
 def rejects(source,name,fn):
  try:fn()
  except (E.ProofError,ValueError) as error:
   controls.append({'sourceId':source,'control':name,'result':'REJECT','reason':str(error),'sourcePhysicalArraysChanged':False});return
  raise AssertionError('Negative control unexpectedly accepted: '+name)
 for record in records:
  if not record['proofCompleteForReview']:continue
  key=(record['placeId'],record['sourceId']);data=datasets[key];source,patches,loops=private[key];triangles=data['triangles']
  rejects(key[1],'omit an actual recorded-plane patch',lambda:E.prove(triangles,source,patches[:-1]))
  reversedpatch=[{**patches[0],'loop':list(reversed(patches[0]['loop']))}]+patches[1:]
  rejects(key[1],'reverse one implicit patch orientation',lambda:E.prove(triangles,source,reversedpatch))
  rejects(key[1],'duplicate an original source triangle record',lambda:E.prove(triangles,source+[source[0]],patches))
  rejects(key[1],'omit an original source triangle record',lambda:E.prove(triangles,source[:-1],patches))
  rejects(key[1],'replace the cut-plane partition by the whole nonplanar boundary',lambda:E.face_geometry(loops[0]))
  if key[0]=='horticulture':
   rawsource=[{'kind':'source','sourceTriangleIndexOffset':3*i,'loop':list(t)} for i,t in enumerate(triangles)]
   rejects(key[1],'bypass exact existing-node atomisation for the original nonconforming edges',lambda:E.topology(rawsource+patches))
   p=triangles[0][0];invented=(p[0]+F(1,3),p[1],p[2]);pool=E.source_pool(triangles);assert invented not in pool
   rejects(key[1],'offer a non-source endpoint as an analytical split/weld',lambda:E.atom_loop([invented,*triangles[0][1:]],pool))
 return controls
def build():
 preserved=preserve()
 rows0=load(HERE.parent/'remaining-cut-front-proposal-v1/scope-ledger.json')['records'];by={(r['placeId'],r['sourceId']):r for r in rows0};rows=[by[key] for key in SELECTED]
 sectionpins=V.D.descriptors(rows)
 fragments=P.frozen_json_constant('assets/art/exploration-access/fragments.js','SOURCE_FRAGMENTS=');frags={(p,f['id']):f for p,fs in fragments.items() for f in fs}
 plans=P.frozen_json_constant('assets/art/exploration-access/plans.js','ACCESS_PLANS=freeze(')
 records=[];private={};datasets={}
 for row in rows:
  key=row['placeId'],row['sourceId'];fragment=frags[key];data=B.source_geometry(row,fragment);datasets[key]=data
  cuts=[next(c for c in plans[row['placeId']]['cutVolumes'] if c['id']==reason) for reason in row['recordedCutReasons']]
  assert cuts
  record,parts=prototype(row,fragment,cuts,data);records.append(record);private[key]=parts
 negative=negative_controls(records,private,datasets)
 complete=sum(r['proofCompleteForReview'] for r in records)
 summary={'version':1,'result':'PASS','authorityCommit':AUTHORITY,'exactPrototypeCases':2,'completeReferencesForReview':complete,'unprovedWithheld':2-complete,'negativeControls':len(negative),'priorPayloadAndPackageFilesPreserved':preserved,'originalGeometryInputsPreserved':1572,'targetedOriginalSections':len(sectionpins),'physicalClosedSourceSolidsSetTrue':0,'otherEightCasesAdopted':0,'physicalGeometryCoordinateUVOpeningChanges':0,'stockBindingSupportProfileRuntimeExports':0,'roofWorkRendererFactoryBenchmarkRetainedHelper':False}
 ledger=[{k:r[k] for k in ('placeId','sourceId','geometryPath','geometrySha256','proofCompleteForReview','closedMeasurementReference','closedSourceSolids','physicalContainmentCollisionSupportShortcutAuthorized','sourceReferenceVolumeExact','withheldReason')} for r in records]
 return {'input-pins.json':{'version':1,'authorityCommit':AUTHORITY,'authoritySha256':sha((HERE/'authority-89d40731.md').read_bytes()),'parentArtistCommit':PARENT,'frozenOriginalSourceContext':FROZEN,'exactSelectedCases':[{'placeId':p,'sourceId':s} for p,s in SELECTED],'producerPins':B.producer_pins(),'targetedOriginalSections':sectionpins,'acceptedReferencePredicatePath':'art/source/shared-map-fire-bindings/retained-cut-case-batch-v1/reference.py','acceptedReferencePredicateSha256':sha((HERE.parent/'retained-cut-case-batch-v1/reference.py').read_bytes()),'extensions':'Cut-plane-owned continuous patches sharing proven existing-point edges; analytical source-edge atomisation only at actual existing captured source points; exact polygon-complex topology and embedding. No physical mesh.','otherEightCases':'untouched; no automatic adoption','roofScope':'UI-owned; not calculated here'},'prototype-certificates.json':{'version':1,'cases':records},'resolved-unresolved-ledger.json':{'version':1,'cases':ledger},'negative-controls.json':{'version':1,'controls':negative},'check-results.json':summary}
if __name__=='__main__':
 parser=argparse.ArgumentParser(description=__doc__);parser.add_argument('--save-review',action='store_true');args=parser.parse_args()
 if not args.save_review:
  def readonly(event,args):
   if event=='open' and (any(c in (args[1] or '') for c in 'wax+') or (args[2] or 0)&(os.O_WRONLY|os.O_RDWR|os.O_CREAT|os.O_TRUNC|os.O_APPEND)):raise PermissionError('Two-prototype checker refuses writes')
   if event in {'os.remove','os.rename','os.mkdir','os.rmdir','os.truncate','os.utime','os.chmod'}:raise PermissionError('Two-prototype checker refuses mutation')
  sys.addaudithook(readonly)
 outputs=build()
 for name,value in outputs.items():
  raw=B.encode(value)
  if args.save_review:(HERE/name).write_bytes(raw)
  else:assert (HERE/name).read_bytes()==raw,'Two-prototype report differs: '+name
 if not args.save_review and (HERE/'review-package.json').exists():
  for row in load(HERE/'review-package.json')['files']:
   raw=(ROOT/row['path']).read_bytes();assert len(raw)==row['bytes'] and sha(raw)==row['sha256']
 print(json.dumps(outputs['check-results.json'],sort_keys=True))
