"""67 direct-front scalars and exactly two retained-cut mathematical prototypes."""
from pathlib import Path
from fractions import Fraction as F
import argparse,collections,copy,hashlib,importlib.util,json,math,os,struct,subprocess,sys
sys.dont_write_bytecode=True
HERE=Path(__file__).resolve().parent;ROOT=HERE.parents[3]
BATCH=HERE.parent/'remaining-measurement-batch-v1'
AUTHORITY='03de2860aa7f09e068922bb1b85aae3e24918849'
AUTHORITY_PATH='docs/engineering/shared-maps/cut-front-measurement-decision.md'
PARENT='e347fe4a3eec5d57c83447144982d3a7c70713cd'
FROZEN='2b350309d9116812a1d3988af090614bdaefbc25'
PROTOTYPES=['replacement/rotunda-gallery-guard-12/cap-0','replacement/rotunda-gallery-guard-12/baluster-2']
def module(name,path):
 s=importlib.util.spec_from_file_location(name,path);m=importlib.util.module_from_spec(s);s.loader.exec_module(m);return m
B=module('immutable_measurement_batch',BATCH/'review.py');C=B.C;P=B.P;X=B.X;G=B.G
R=module('retained_cut_exact_predicates',HERE/'reference.py')
def load(path):return json.loads(path.read_text(encoding='utf-8'))
def sha(raw):return hashlib.sha256(raw).hexdigest()
def encode(v):return B.encode(v)
def fr(v):return F(int(v['numerator']),int(v['denominator']))
def git(path,commit):return subprocess.check_output(['git','show',commit+':'+path],cwd=ROOT)
def preserve():
 count=0
 for name in ('remaining-material-proposal-v1','remaining-geometry-readiness-v1','radial-roundoff-policy-proposal-v1','radial-measurement-certificates-v1','remaining-cut-front-proposal-v1','remaining-measurement-batch-v1'):
  folder=HERE.parent/name;pkg=load(folder/'review-package.json')
  for row in pkg['files']:assert sha((ROOT/row['path']).read_bytes())==row['sha256']
  assert (folder/'review-package.json').read_bytes()==git((folder/'review-package.json').relative_to(ROOT).as_posix(),PARENT)
  count+=len(pkg['files'])+1
 for row in load(HERE.parent/'remaining-geometry-readiness-v1/geometry-pins.json')['files']:assert sha((ROOT/row['path']).read_bytes())==row['sha256']
 assert (HERE/'authority-03de2860.md').read_bytes()==git(AUTHORITY_PATH,AUTHORITY)
 return count
def descriptors(rows):
 out=[];specs=collections.defaultdict(list)
 for row in rows:specs[row['placeId']].append(row)
 for place,wanted in sorted(specs.items()):
  prefix='assets/art/place-scenes/'+place;folder=ROOT/prefix;raw=(folder/'index.json').read_bytes();assert raw==git(prefix+'/index.json',FROZEN)
  index=json.loads(raw);chunks={c['id']:c for c in index['chunks']};request=collections.defaultdict(list)
  for row in wanted:request[row['sectionId']].append(row)
  for sid,items in sorted(request.items()):
   path=prefix+'/'+chunks[sid]['url'];raw=(ROOT/path).read_bytes();assert raw==git(path,FROZEN)
   out.append({'path':path,'sha256':sha(raw),'bytes':len(raw),'context':FROZEN})
   parts={p['id']:p for p in json.loads(raw)['parts']}
   for row in items:
    part=parts[row['renderId']];assert part['id']==row['sourceId'] and part['matrix']==row['matrix']
    assert not part.get('sourceRanges') and prefix+'/'+index['geometries'][part['geometry']]==row['geometryPath']
 return out
def scope_for(row):
 return {'placeId':row['placeId'],'sourceId':row['sourceId'],'geometrySha256':row['geometrySha256'],'sourceRange':row['sourceRange'],'originalMatrix':row['matrix'],'selectedNativeMember':'positive-original-local-Z','sourceContext':FROZEN}
def validate_membership(expected_scope,expected_members,declared_scope,members):
 if declared_scope!=expected_scope:return False
 return collections.Counter(members)==collections.Counter(expected_members)
def direct_front(row,parent,fragment,metadata,data):
 source=fragment['sourceData'];run=next(r for r in metadata['plan']['runs'] if r['id']==source['runId'])
 tangent=(F(run['b'][0])-F(run['a'][0]),F(0),F(run['b'][1])-F(run['a'][1]));front=(-tangent[2],F(0),tangent[0]);length2=sum(v*v for v in tangent)
 normals=data['g']['attributes']['normal']['array'];expected=[];selected=[];zero=[];orientation=[];triangle_proof=[]
 # Independently select from pinned compiled normal arrays, not the parent list.
 for i,t in enumerate(data['triangles']):
  vertex_ids=data['indices'][3*i:3*i+3];ns=[tuple(map(F,normals[3*j:3*j+3])) for j in vertex_ids];assert ns[0]==ns[1]==ns[2]
  n=ns[0];pf=G.dot(n,front);pt=G.dot(n,tangent)
  if not (pf>0 and pf*pf>pt*pt and pf*pf>n[1]*n[1]*length2):continue
  expected.append(3*i);normal=G.cross(G.sub(t[1],t[0]),G.sub(t[2],t[0]))
  if normal==(0,0,0):zero.append(3*i);continue
  winding=G.dot(normal,n);assert winding>0;selected.append(i)
  wt=data['worldTriangles'][i];wn=G.cross(G.sub(wt[1],wt[0]),G.sub(wt[2],wt[0]));squared=sum(v*v for v in wn)/4
  triangle_proof.append({'originalSourceIndexOffset':3*i,'originalGeometryVertexIndices':vertex_ids,'compiledSourceNormalClass':n,'actualSourceWindingDot':winding,'actualWorldAreaSquaredExact':squared})
 assert expected==parent['allOriginalSelectedFrontTriangleIndexOffsets']
 assert zero==parent['selectedFrontExactlyZeroAreaTriangleOffsets']
 assert [3*i for i in selected]==parent['originalFrontTriangleIndexOffsets']
 assert [r['originalSourceIndexOffset'] for r in triangle_proof]==[r['originalSourceIndexOffset'] for r in parent['fullSelectedFrontTriangleEvidence']]
 projected=[tuple((G.dot(p,tangent),p[1]) for p in data['triangles'][i]) for i in selected]
 nonoverlap=X.nonoverlap2(projected);assert nonoverlap['proved']
 area=B.area_interval([data['worldTriangles'][i] for i in selected])
 assert area['lower']==fr(parent['frontActualIntrinsicAreaInterval']['lower']) and area['upper']==fr(parent['frontActualIntrinsicAreaInterval']['upper'])
 scope=scope_for(row);assert validate_membership(scope,expected,scope,expected)
 controls=[]
 for i,offset in enumerate(expected):
  omitted=expected[:i]+expected[i+1:];duplicated=expected+[offset]
  other=expected[(i+1)%len(expected)] if len(expected)>1 else next(3*j for j in range(len(data['triangles'])) if 3*j not in expected);balanced=omitted+[other]
  assert not validate_membership(scope,expected,scope,omitted)
  assert not validate_membership(scope,expected,scope,duplicated)
  assert len(balanced)==len(expected) and not validate_membership(scope,expected,scope,balanced)
  controls.append({'originalSourceIndexOffset':offset,'omissionRejected':True,'duplicationRejected':True,'sameCountOmitAndDuplicateRejected':True,'balancedReplacementOriginalOffset':other,'balancedReplacementIsAnotherSelectedMember':other in expected})
 scope_controls=[]
 for field in ('sourceId','geometrySha256','sourceRange','originalMatrix','selectedNativeMember'):
  wrong=copy.deepcopy(scope)
  if field=='sourceId':wrong[field]+='/invalid-source-control'
  elif field=='geometrySha256':wrong[field]='0'*64
  elif field=='sourceRange':wrong[field]['count']-=3
  elif field=='originalMatrix':wrong[field][0]+=1
  else:wrong[field]='negative-original-local-Z'
  assert not validate_membership(scope,expected,wrong,expected)
  scope_controls.append({'changedDeclaredField':field,'rejectedBeforeMembership':True})
 lower=area['lower'];assert lower>0
 return {'placeId':row['placeId'],'sourceId':row['sourceId'],'familyId':row['familyId'],'sourceScope':scope,'geometryPath':row['geometryPath'],'sectionId':row['sectionId'],'sourceRunId':source['runId'],'nativeSourceTangent':tangent,'nativePositiveZDirection':front,'exhaustiveExpectedOriginalFrontIndexOffsets':expected,'exactZeroAreaOffsetsIncludedInMembership':zero,'actualNonzeroOriginalFrontIndexOffsets':[3*i for i in selected],'exactTriangleEvidence':triangle_proof,'actualFrontProjectionNonoverlap':nonoverlap,'actualAffineDeterminant':data['determinant'],'exactGeometricAreaInterval':area,'acceptedAreaRecipeCoefficientExact':F(1),'exactLowerRecipeQuantity':lower,'directedLowerSourceRepresentation':C.lower_representation(lower),'directGeometricRouteAcceptedByAuthority':True,'sourceScalarReferenceComplete':True,'parentStrongerPairedProofComplete':parent['proofComplete'],'pairedFailurePreserved':not parent['proofComplete'],'parentPairedFailureReason':parent.get('unresolvedReason'),'canonicalStockBindingOrRuntimeExport':None}, {'placeId':row['placeId'],'sourceId':row['sourceId'],'sourceScopeSha256':sha(encode(scope)),'expectedSelectionDerivedFromOriginalCompiledNormalArrays':True,'positiveCompleteOriginalSelectionAccepted':True,'selectedOriginalTriangles':len(expected),'triangleControls':controls,'sourceScopeControls':scope_controls}
def f32_cell(v):
 bits=struct.unpack('<I',struct.pack('<f',v))[0];assert v>0
 prev=F(struct.unpack('<f',struct.pack('<I',bits-1))[0]);nxt=F(struct.unpack('<f',struct.pack('<I',bits+1))[0]);exact=F(v)
 return bits,(prev+exact)/2,(exact+nxt)/2
def prototype(row,fragment,cut,data,kind):
 audit,loops,bad=G.boundary_audit(data['triangles']);assert audit['degreeTwoBoundaryLoops'] and audit['exactExistingVertexEdgeSplits']==0
 proof=R.prove_reference(data['triangles'],loops);caps=proof.pop('implicitCaps')
 assert proof['proofComplete']
 assert len(caps)==(1 if kind=='box' else 3) and all(c['axis']==0 and c['areaVector'][0]<0 for c in caps)
 captured=caps[0]['loop'][0][0];assert all(c['loop'][0][0]==captured for c in caps)
 recorded=max(F(p[0]) for p in cut['polygon']);token=json.dumps(float(recorded));decimal=F(token)
 assert F(P.f32(float(recorded)))==captured and captured<recorded
 bits,cell_low,cell_high=f32_cell(float(captured))
 boundary_points={p for loop in loops for p in loop}
 raw_boundary_values=[F(fragment['vertices'][i][0]) for i,p in enumerate(data['points']) if p in boundary_points]
 assert raw_boundary_values and all(cell_low<v<cell_high for v in raw_boundary_values)
 assert cell_low<recorded<cell_high
 ref_map={p:min(i for i,q in enumerate(data['points']) if q==p) for p in boundary_points}
 cap_records=[{'existingOrientedBoundaryVertexReferences':[ref_map[p] for p in c['loop']],'axis':c['axis'],'capturedPlane':captured,'simpleExistingPlanarLoopProved':c['simplePlanarLoopProved'],'orientedAreaVector':c['areaVector'],'areaExact':c['area'],'sourceOriginVolumeContribution':c['sourceOriginVolumeContribution']} for c in caps]
 source_volume=proof['closedReferenceVolumeExact'];world_volume=source_volume*abs(data['determinant'])
 assert min(p[0] for p in data['points'])==captured
 clearance={'recordedDecimalToken':token,'recordedDecimalExact':decimal,'recordedProducerBinary64Plane':recorded,'capturedFloat32Plane':captured,'capturedFloat32BitsUint32Hex':f'0x{bits:08x}','exactFloat32RoundingCell':[cell_low,cell_high],'sourceLocalHalfUlpBound':max(captured-cell_low,cell_high-captured),'rawBoundaryCoordinateRangeBeforeFloat32':[min(raw_boundary_values),max(raw_boundary_values)],'maxObservedRawToFloat32BoundaryChange':max(abs(v-captured) for v in raw_boundary_values),'allRawBoundaryValuesAndRecordedPlaneInsideCertifiedCell':True,'signedCapturedMinusRecordedBinary64':captured-recorded,'signedCapturedMinusRecordedDecimal':captured-decimal,'retainedHalfspaceMinimumSignedClearance':captured-recorded,'negativeMeansCapturedBoundaryInsideRecordedGuardGap':True,'sourceOrOpeningPlaneMoved':False,'notAGlobalWeldOrClosureTolerance':True}
 intersection=None;crosscheck=None
 if kind=='box':
  groups=G.plane_groups(data['triangles']);assert groups is not None and len(groups)==5
  planes={(axis,sgn):c for axis,sgn,c in groups};planes[0,-1]=captured
  lo=tuple(planes[k,-1] for k in range(3));hi=tuple(planes[k,1] for k in range(3))
  face_proofs=[]
  for (axis,sgn,c),ids in groups.items():
   cov=G.rectangle_coverage([data['triangles'][i] for i in ids],axis,X.nonoverlap2);assert cov['proved']
   other=[k for k in range(3) if k!=axis]
   assert cov['lo']==tuple(lo[k] for k in other) and cov['hi']==tuple(hi[k] for k in other)
   face_proofs.append({'axis':axis,'sign':sgn,'actualFullFaceCoverage':cov})
  crosscheck=math.prod(hi[k]-lo[k] for k in range(3));assert crosscheck==source_volume
  intersection=G.box_mask_intersection(lo,hi,cut);assert intersection>0
 else:face_proofs=None
 return {'prototypeKind':kind,'placeId':row['placeId'],'sourceId':row['sourceId'],'geometryPath':row['geometryPath'],'geometrySha256':row['geometrySha256'],'sourceRange':row['sourceRange'],'originalMatrix':row['matrix'],'actualAffineDeterminant':data['determinant'],'originalConstructorMetadata':fragment['sourceData'],'recordedCut':cut,'sourceBoundaryAudit':audit,'mathematicalRetainedReferenceProof':proof,'implicitReferenceFaceEvidence':cap_records,'referenceBoundaryMeaning':'Existing source vertex references and continuous oriented disk integrals only. No cap polygon coordinate buffer, cap triangle/index buffer or UV mesh is generated.','sourceAndFloat32CutPlaneEvidence':clearance,'referenceVolumeWorldExact':world_volume,'sourceAxisPlaneVolumeCrosscheck':crosscheck,'boxFiveFaceCoverageCrosscheck':face_proofs,'signedRecordedCutIntersectionVolume':intersection,'balusterRecordedCutIntersectionVolumeUnproved':kind!='box','intersectionNote':'The box has a proven positive captured-reference intrusion. The baluster has proven negative boundary clearance; no zero intersection is asserted.','candidateSourceRepresentationForReview':C.lower_representation(world_volume/F(.12)),'interpretation':'Captured retained source surface plus only its own oriented simple cut-boundary disks. This describes the captured material; it does not replace the source with an ideal unquantized solid.','referenceConstructionCompleteNonSelfIntersecting':True,'prototypeInterpretationAccepted':False,'instanceAdopted':False,'physicalSourceStrictClosureStillFailed':True,'originalPhysicalStrictFactsUnchanged':True,'sourceStrictFactsChanged':False,'stockRuntimeCapMeshUVOrOpeningExport':None},caps
def predicate_controls(data,loops,caps):
 triangles=[t for t in data['triangles'] if R.nonzero(t)];t=triangles[0]
 assert not R.triangle_pair_intersection_allowed(t,t)[0]
 assert not R.triangle_pair_intersection_allowed(t,tuple(reversed(t)))[0]
 a=tuple(tuple(map(F,p)) for p in ((0,0,0),(2,0,0),(0,2,0)))
 b=tuple(tuple(map(F,p)) for p in ((.5,.5,-1),(.5,.5,1),(1.5,.5,0)))
 assert not R.triangle_pair_intersection_allowed(a,b)[0]
 shifted=tuple((p[0],p[1],p[2]+4) for p in a);assert R.triangle_pair_intersection_allowed(a,shifted)[0]
 assert R.triangle_pair_intersection_allowed(triangles[0],triangles[1])[0]
 missing_rejected=False
 try:R.prove_reference(data['triangles'],loops[:-1])
 except (AssertionError,ValueError):missing_rejected=True
 assert missing_rejected
 cap=caps[0];axis=cap['axis'];other=[(axis+1)%3,(axis+2)%3]
 poly=[tuple(p[k] for k in other) for p in cap['loop']];probe=R.polygon_interior_point(poly);c=cap['loop'][0][axis]
 p=[F(0)]*3;p[axis]=c;p[other[0]],p[other[1]]=probe
 a=list(p);a[axis]-=1;b=list(p);b[axis]+=1;d=list(b);d[other[0]]+=F(1,4)
 assert not R.triangle_cap_allowed((tuple(a),tuple(b),tuple(d)),cap['loop'],axis)[0]
 return [{'control':name,'expectedReject':reject,'result':'PASS','scope':'Exact arithmetic/source-reference predicate only; no asset geometry or fixture exported.'} for name,reject in [('duplicate actual source face',True),('reversed duplicate actual source face',True),('analytic nonshared 3D crossing',True),('analytic separated triangles',False),('actual adjacent source faces',False),('missing one original boundary loop',True),('analytic source triangle crossing an actual implicit reference-face interior',True)]]
def build():
 preserved=preserve()
 parent_walls=load(BATCH/'wall-face-certificates.json')['cases'];direct=[r for r in parent_walls if not r['proofComplete']];assert len(direct)==67
 oldrows=load(HERE.parent/'remaining-cut-front-proposal-v1/scope-ledger.json')['records'];by={(r['placeId'],r['sourceId']):r for r in oldrows}
 chosen=[by[r['placeId'],r['sourceId']] for r in direct]+[next(r for r in oldrows if r['sourceId']==sid) for sid in PROTOTYPES]
 assert len(chosen)==69 and len({(r['placeId'],r['sourceId']) for r in chosen})==69
 sectionpins=descriptors(chosen)
 fragments=P.frozen_json_constant('assets/art/exploration-access/fragments.js','SOURCE_FRAGMENTS=')
 frags={(place,f['id']):f for place,fs in fragments.items() for f in fs}
 plans=P.frozen_json_constant('assets/art/exploration-access/plans.js','ACCESS_PLANS=freeze(')
 admin=load(ROOT/'assets/art/exposition-administration/metadata.json')
 refs=[];controls=[]
 for parent in direct:
  row=by[parent['placeId'],parent['sourceId']];fragment=frags[row['placeId'],row['sourceId']];data=B.source_geometry(row,fragment)
  ref,control=direct_front(row,parent,fragment,admin,data);assert ref['pairedFailurePreserved'];refs.append(ref);controls.append(control)
 prototypes=[];prototype_data=[]
 for sid in PROTOTYPES:
  row=next(r for r in oldrows if r['sourceId']==sid);fragment=frags[row['placeId'],sid];cut=next(c for c in plans[row['placeId']]['cutVolumes'] if c['id']==row['recordedCutReasons'][0]);data=B.source_geometry(row,fragment)
  result,caps=prototype(row,fragment,cut,data,'box' if sid==PROTOTYPES[0] else 'baluster');prototypes.append(result)
  _,loops,_=G.boundary_audit(data['triangles']);prototype_data.append((data,loops,caps))
 predicate=predicate_controls(*prototype_data[1])
 triangles=sum(c['selectedOriginalTriangles'] for c in controls);assert triangles==508
 rejected=3*triangles+sum(len(c['sourceScopeControls']) for c in controls);assert rejected==1859
 assert len(prototypes)==2 and all(r['referenceConstructionCompleteNonSelfIntersecting'] and not r['instanceAdopted'] for r in prototypes)
 summary={'version':1,'result':'PASS','authorityCommit':AUTHORITY,'directFrontScalarReferences':67,'directSelectedOriginalTriangles':508,'exhaustiveOmissionControlsRejected':508,'exhaustiveDuplicationControlsRejected':508,'exhaustiveSameCountReplacementControlsRejected':508,'sourceScopeControlsRejected':335,'totalExhaustiveNegativeSelectionsRejected':1859,'positiveOriginalSelectionsAccepted':67,'pairedFailuresPreserved':67,'retainedCutPrototypeOriginalSources':2,'completeEmbeddedReferencePrototypes':2,'implicitReferenceFacesOnly':4,'sourceTrianglePairProofs':sum(sum(r['mathematicalRetainedReferenceProof']['trianglePairClassificationCounts'].values()) for r in prototypes),'sourceTriangleImplicitReferenceFaceProofs':sum(sum(r['mathematicalRetainedReferenceProof']['sourceTriangleImplicitCapClassificationCounts'].values()) for r in prototypes),'predicateControls':len(predicate),'prototypeInstancesAdopted':0,'targetedOriginalSourceSections':len(sectionpins),'previousPayloadAndPackageFilesPreserved':preserved,'originalGeometryInputsPreserved':1572,'oldRawFactsOrPairedResultsChanged':0,'physicalMeshCapUVOpeningChanges':0,'stockBindingRuntimeOrProfileExports':0,'roofWorkDuplicated':False,'factoriesRenderersHelpersOrBenchmarks':0}
 pins=B.producer_pins()
 return {'input-pins.json':{'version':1,'authorityCommit':AUTHORITY,'authoritySha256':sha((HERE/'authority-03de2860.md').read_bytes()),'parentArtistCommit':PARENT,'originalSourceContext':FROZEN,'producerPins':pins,'targetedOriginalSections':sectionpins,'parentAll126FrontCertificateSha256':sha((BATCH/'wall-face-certificates.json').read_bytes()),'prototypeScopeExactly':PROTOTYPES,'roofAnalysisAssignedElsewhere':True},'direct-front-scalar-references.json':{'version':1,'references':refs},'exhaustive-source-selection-controls.json':{'version':1,'cases':controls},'retained-cut-prototypes.json':{'version':1,'prototypes':prototypes,'noInstanceAdoptionOrPhysicalCapExport':True},'reference-predicate-controls.json':{'version':1,'controls':predicate},'check-results.json':summary}
if __name__=='__main__':
 parser=argparse.ArgumentParser(description=__doc__);parser.add_argument('--save-review',action='store_true');args=parser.parse_args()
 if not args.save_review:
  def readonly(event,args):
   if event=='open' and (any(c in (args[1] or '') for c in 'wax+') or (args[2] or 0)&(os.O_WRONLY|os.O_RDWR|os.O_CREAT|os.O_TRUNC|os.O_APPEND)):raise PermissionError('Read-only direct/prototype check refuses writes')
   if event in {'os.remove','os.rename','os.mkdir','os.rmdir','os.truncate','os.utime','os.chmod'}:raise PermissionError('Read-only direct/prototype check refuses mutation')
  sys.addaudithook(readonly)
 outputs=build()
 for name,value in outputs.items():
  raw=encode(value)
  if args.save_review:(HERE/name).write_bytes(raw)
  else:assert (HERE/name).read_bytes()==raw,'Direct/prototype evidence differs: '+name
 if not args.save_review and (HERE/'review-package.json').exists():
  for row in load(HERE/'review-package.json')['files']:
   raw=(ROOT/row['path']).read_bytes();assert len(raw)==row['bytes'] and sha(raw)==row['sha256']
 print(json.dumps(outputs['check-results.json'],sort_keys=True))
