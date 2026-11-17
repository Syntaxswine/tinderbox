"""Source-side radial measurement certificates; no binding, mesh or runtime exports."""
from pathlib import Path
from fractions import Fraction as F
import argparse,collections,hashlib,importlib.util,json,math,os,struct,subprocess,sys
sys.dont_write_bytecode=True
HERE=Path(__file__).resolve().parent;ROOT=HERE.parents[3]
PRIOR=HERE.parent/'radial-roundoff-policy-proposal-v1'
READINESS=HERE.parent/'remaining-geometry-readiness-v1'
MATERIAL=HERE.parent/'remaining-material-proposal-v1'
AUTHORITY='cba32e4a588488d1a730589f1001759740e76f33'
AUTHORITY_PATH='docs/engineering/shared-maps/radial-measurement-decision.md'
PARENT='fe9145a70b91c692bd0def6e05a248b23091cd0d'
FROZEN='2b350309d9116812a1d3988af090614bdaefbc25'
ACCEPTED={'165a9dab','8bab8c76'}
s=importlib.util.spec_from_file_location('preserved_radial_proposal',PRIOR/'review.py')
P=importlib.util.module_from_spec(s);s.loader.exec_module(P)
X=P.X
def load(path):return json.loads(path.read_text(encoding='utf-8'))
def sha(raw):return hashlib.sha256(raw).hexdigest()
def encode(v):return (json.dumps(v,indent=2,sort_keys=True)+'\n').encode()
def fr(v):return F(int(v['numerator']),int(v['denominator']))
def rat(v):return P.rat(v)
def git(path,commit):return subprocess.check_output(['git','show',commit+':'+path],cwd=ROOT)
def ident(v):return sha(json.dumps(v,sort_keys=True,separators=(',',':')).encode())[:24]
def apply(linear,v):return tuple(sum(linear[3*i+j]*v[j] for j in range(3)) for i in range(3))
def sqrt_bounds(value,bits=128):
 assert value>=0
 denominator=1<<bits
 n=math.isqrt((value.numerator*denominator*denominator)//value.denominator)
 low=F(n,denominator)
 assert low*low<=value and (low+F(1,denominator))**2>value
 return low,low if low*low==value else low+F(1,denominator)
def float_candidates(value):
 nearest=float(value);assert math.isfinite(nearest) and value>=0
 lower=(F(math.nextafter(nearest,-math.inf))+F(nearest))/2
 upper=(F(math.nextafter(nearest,math.inf))+F(nearest))/2
 even=struct.unpack('<Q',struct.pack('<d',nearest))[0]%2==0
 assert lower<value<upper or (value in (lower,upper) and even)
 down=math.nextafter(nearest,-math.inf) if F(nearest)>value else nearest
 assert F(down)<=value and F(math.nextafter(down,math.inf))>value
 return {'nearestEvenRoundingCellCertified':True,'nearestEvenBinary64':nearest,'nearestEvenHex':nearest.hex(),'nearestEvenRoundsAboveExact':F(nearest)>value,'nearestEvenSignedConversionError':rat(F(nearest)-value),'downwardBinary64Candidate':down,'downwardHex':down.hex(),'candidateAdditionalUndermeasurement':rat(value-F(down)),'candidateSelectedForExport':False}
def lower_representation(value):
 converted=float_candidates(value);number=converted['downwardBinary64Candidate']
 up=math.nextafter(number,math.inf);assert math.isfinite(up)
 exact,up_exact=F(number),F(up)
 assert 0<=exact<=value<up_exact
 bits=struct.unpack('<Q',struct.pack('<d',number))[0]
 up_bits=struct.unpack('<Q',struct.pack('<d',up))[0];assert up_bits==bits+1
 token=json.dumps(number,allow_nan=False,separators=(',',':'))
 decoded=json.loads(token);decoded_bits=struct.unpack('<Q',struct.pack('<d',decoded))[0]
 assert decoded_bits==bits
 # Exact decimal-token containment proves the binary64 parse independently of
 # the observed JSON decoder round-trip.
 decimal=F(token);previous=F(math.nextafter(number,-math.inf))
 cell=((previous+exact)/2,(exact+up_exact)/2);even=bits%2==0
 assert cell[0]<decimal<cell[1] or (decimal in cell and even)
 return {'rule':'largest finite nonnegative binary64 <= exact rational conservative lower recipe quantity','value':number,'bitsUint64Hex':f'0x{bits:016x}','hexFloat':number.hex(),'exactDyadicValue':rat(exact),'exactRationalLower':rat(value),'dyadicLEExactLower':True,'nextUpValue':up,'nextUpBitsUint64Hex':f'0x{up_bits:016x}','nextUpExactDyadicValue':rat(up_exact),'nextUpGTExactLower':True,'adjacentNonnegativeBinary64BitsProved':True,'additionalRepresentationUndermeasurement':rat(value-exact),'jsonToken':token,'jsonRoundTripBitsUint64Hex':f'0x{decoded_bits:016x}','jsonRoundTripPreservesExactDyadic':True,'jsonDecimalTokenInsideCorrectRoundingCell':True,'runtimeExportOrFuelAssignment':False}
def representation_controls():
 cases=[('exact-zero',F(0),F(0)),('exact-representable',F(3,2),F(3,2)),('between-floats-midpoint',F(1)+F(1,2**53),F(1)),('between-floats-nearest-rounds-up',F(1)+F(3,2**54),F(1))]
 out=[]
 for name,value,expected in cases:
  rep=lower_representation(value);assert fr(rep['exactDyadicValue'])==expected
  if name=='between-floats-nearest-rounds-up':assert float_candidates(value)['nearestEvenRoundsAboveExact']
  out.append({'control':name,'exactInput':rat(value),'expectedFloorDyadic':rat(expected),'representation':rep,'scope':'Scalar arithmetic control only; no asset stock or binding.'})
 return out
def rounding(vlo,vhi,qlo,qhi,accepted=False):
 lo,hi=float(qlo),float(qhi)
 bins=struct.unpack('<Q',struct.pack('<d',hi))[0]-struct.unpack('<Q',struct.pack('<d',lo))[0]+1
 assert bins>=1
 return {'status':'CERTIFIED_SOURCE_REPRESENTATION_FOR_ACCEPTED_INTERPRETATION' if accepted else 'CONDITIONAL_SOURCE_REPRESENTATION_PROPOSAL','sourceRepresentationInterpretationAccepted':accepted,'selectedLowerReferenceNotWholeInterval':True,'quantityIntervalNearestEvenOutcomeCount':bins,'quantityIntervalHasMultipleBinary64Outcomes':bins>1,'multipleIntervalOutcomesDoNotBlockLowerRepresentation':True,'conservativeLowerRecipeRepresentation':lower_representation(qlo),'conservativeVolumeConversionDiagnosticOnly':float_candidates(vlo),'conservativeRecipeQuantityConversionDiagnosticOnly':float_candidates(qlo),'canonicalRuntimeExport':None,'runtimeOrFuelAssignment':False,'scope':'Apply the unchanged exact reference-depth recipe first, then conservatively represent its selected lower value. The full measurement interval remains. This representation does not identify the unknown actual volume or install/export a fuel quantity.'}
def view_boundary(g,pairs,start,count):
 pts=P.vertices(g);labels=list(pts)
 for a,b,_ in pairs:labels[b]=labels[a]
 edges=collections.Counter();directed=collections.Counter()
 idx=P.index_list(g);assert start%3==count%3==0 and start+count<=len(idx)
 for offset in range(start,start+count,3):
  ids=idx[offset:offset+3];a,b,c=[pts[i] for i in ids]
  if X.cross(P.sub(b,a),P.sub(c,a))==(0,0,0):continue
  t=[labels[i] for i in ids]
  for a,b in zip(t,t[1:]+t[:1]):
   key=tuple(sorted((a,b)));edges[key]+=1;directed[key]+=1 if a<b else -1
 return sum(n!=2 or directed[e]!=0 for e,n in edges.items())
def linear_of(matrix):
 assert len(matrix)==16 and all(math.isfinite(v) for v in matrix)
 assert [matrix[i] for i in (3,7,11,15)]==[0,0,0,1]
 return tuple(map(F,X.matrix_linear(matrix)))
def area_certificate(g,pairs,linear):
 pts=[apply(linear,v) for v in P.vertices(g)]
 displacements={b:apply(linear,P.sub(P.vertices(g)[a],P.vertices(g)[b])) for a,b,_ in pairs}
 delta={i:P.l1(v) for i,v in displacements.items()}
 al,au,ea=F(0),F(0),F(0)
 idx=P.index_list(g)
 for offset in range(0,len(idx),3):
  ids=idx[offset:offset+3];a,b,c=[pts[i] for i in ids];u,v=P.sub(b,a),P.sub(c,a)
  normal=X.cross(u,v);lo,hi=sqrt_bounds(sum(c*c for c in normal))
  al+=lo/2;au+=hi/2
  da,db,dc=[delta.get(i,F(0)) for i in ids];alpha,beta=da+db,da+dc
  ea+=(alpha*P.l1(v)+beta*P.l1(u)+alpha*beta)/2
 return {'actualAffineTriangleAreaEvaluationInterval':[rat(al),rat(au)],'areaEvaluationIntervalWidthNotPartOfSeamError':rat(au-al),'seamOnlyAreaChangeUpperBound':rat(ea),'periodicReferenceIntrinsicAreaInterval':[rat(max(F(0),al-ea)),rat(au+ea)],'scalarSquareRootEnclosureBits':128,'areaApproximateDisplay':float((al+au)/2),'endpointWorldL1DisplacementMaximum':rat(max(delta.values())),'translationExcluded':True,'unitRotationAssumed':False}
def preserve_inputs():
 preserved=0
 for folder in (PRIOR,READINESS,MATERIAL):
  pkg=load(folder/'review-package.json')
  for row in pkg['files']:
   raw=(ROOT/row['path']).read_bytes();assert sha(raw)==row['sha256']
  assert (folder/'review-package.json').read_bytes()==git((folder/'review-package.json').relative_to(ROOT).as_posix(),PARENT)
  preserved+=len(pkg['files'])+1
 geometry_pins=load(READINESS/'geometry-pins.json')['files']
 for row in geometry_pins:assert sha((ROOT/row['path']).read_bytes())==row['sha256']
 assert sha((HERE/'canonical-clarification.md').read_bytes())=='78cd6b43f412258709df6166bd52ab3a72efdf04e58ab267204e8d1f552775da'
 authority=git(AUTHORITY_PATH,AUTHORITY)
 assert authority==(HERE/'authority-cba32e4a.md').read_bytes()
 previous_inputs=load(PRIOR/'input-pins.json')
 for row in previous_inputs['files']:
  assert sha((ROOT/row['path']).read_bytes())==row['workingSha256']
  assert sha(git(row['path'],row['contextCommit']))==row['gitObjectSha256']
 return preserved,len(geometry_pins),sha(authority)
def targeted_descriptors(rows):
 rawpins=[];actual={}
 allblobs={}
 for place in ('administration','horticulture'):
  prefix='assets/art/place-scenes/'+place
  for entry in subprocess.check_output(['git','ls-tree','-r','-z',FROZEN,'--',prefix],cwd=ROOT).split(b'\0'):
   if entry:
    meta,path=entry.split(b'\t');allblobs[path.decode()]=meta.split()[2].decode()
  folder=ROOT/prefix;raw=(folder/'index.json').read_bytes();assert raw==git(prefix+'/index.json',FROZEN)
  idx=json.loads(raw);chunks={r['id']:r for r in idx['chunks']}
  pins={r['id']:r for r in load(MATERIAL/(place+'-section-pins.json'))['sections']}
  requested=collections.defaultdict(list)
  for row in rows:
   if row['placeId']==place:requested[row['sectionId']].append(row)
  for sid,wanted in sorted(requested.items()):
   path=prefix+'/'+chunks[sid]['url'];raw=(ROOT/path).read_bytes();pin=pins[sid]
   assert sha(raw)==pin['sha256']
   assert hashlib.sha1(b'blob '+str(len(raw)).encode()+b'\0'+raw).hexdigest()==allblobs[path]
   rawpins.append({'path':path,'bytes':len(raw),'sha256':sha(raw),'gitBlobSha1':allblobs[path],'sourceContext':FROZEN})
   parts={p['id']:p for p in json.loads(raw)['parts']}
   for row in wanted:
    part=parts[row['renderId']];assert part['id']==row['sourceId'] and part['matrix']==row['matrix']
    assert not part.get('openMatrix') and not part.get('sourceRanges')
    assert part['geometry']==Path(row['geometryPath']).stem
    geometry_path=prefix+'/'+idx['geometries'][part['geometry']];assert geometry_path==row['geometryPath']
    actual[row['placeId'],row['sourceId']]=part
 assert len(actual)==530 and len(rawpins)==50
 return actual,rawpins
def local_templates(buckets,sine):
 out=[];internal={}
 plans_text=(ROOT/'assets/art/exploration-access/plans.js').read_text(encoding='utf-8')
 start=plans_text.index('ACCESS_PLANS=freeze(')+len('ACCESS_PLANS=freeze(')
 plans=json.JSONDecoder().raw_decode(plans_text[start:])[0]
 stairs={s['id']:s for s in plans['administration']['stairs']}
 for bucket in buckets:
  bid=bucket['bucketId'];g=P.raw_geometry(bucket);n=bucket['constructorSegments']
  kind='lathe' if bucket['sourceConstructor']=='LatheGeometry' else 'cylinder'
  profile=bucket.get('constructorProfile',[])
  if kind=='cylinder':
   rt,rb=bucket['constructorRadii'];pairs=P.cylinder_pairs(n,rt,rb)
   if bid in ('330d7160','b62cb7b5'):
    heights={stairs[sid.removesuffix('/centre-column')]['toY']-stairs[sid.removesuffix('/centre-column')]['fromY'] for sid in bucket['sourceIds']};assert len(heights)==1;height=heights.pop()
   else:height={'165a9dab':2.12*17-2.12*11-.64,'7f3008f8':.3,'a0784d61':.08,'eb49ad7c':.76}[bid]
   points=P.vertices(g);assert {p[1] for p in points}=={F(P.f32(height/2)),-F(P.f32(height/2))}
   parameters={'radiusTop':rt,'radiusBottom':rb,'heightBinary64':height,'radialSegments':n,'heightSegments':1,'openEnded':False,'thetaStart':0,'thetaLengthBinary64':math.tau}
  else:
   pairs=[(j,n*len(profile)+j,p[0]) for j,p in enumerate(profile)]
   parameters={'profile':profile,'segments':n,'phiStart':0,'phiLengthBinary64':math.tau}
  P.schedule(g,kind,n,len(profile) if kind=='lathe' else 0)
  assert bucket['fullSourceRange']=={'start':0,'count':len(P.index_list(g))}
  bits=P.pair_review(g,pairs,sine);strict=X.effective(g)['facts'];symbolic=P.symbolic_topology(g,pairs)
  assert not strict['closedSolidProof'] and symbolic['closedOrientedSymbolicManifold'] and symbolic['eulerCharacteristic']==2
  radial=P.profile_certificate(g,kind,n,profile);radial['heightBandNoSelfIntersectionProof']=P.radial_band_certificate(g,kind,n,profile)
  measures=P.measures(g,pairs)
  negative=None
  if kind=='cylinder':
   count=6*n;boundary=view_boundary(g,pairs,0,count);assert boundary==2*n
   negative={'originalSourceIndexView':{'start':0,'count':count},'actualViewMeaning':'Existing original torso triangle range; original caps excluded from this read-only source view, no new geometry/index array or fixture mesh.','fullDrawRangeRequirementFails':True,'boundaryEdgesAfterPeriodicLabels':boundary,'expectedActualOpenEndRings':2,'capTriangleSourceIndexStart':count,'capTriangleSourceIndexCount':len(P.index_list(g))-count,'result':'REJECT_CLOSED_SOLID_QUANTITY','sourceBytesChanged':False}
  record={'templateId':bid,'placeId':bucket['placeId'],'familyId':bucket['familyId'],'geometryPath':bucket['geometryPath'],'geometrySha256':bucket['geometrySha256'],'sourceRange':bucket['fullSourceRange'],'sourceInstances':bucket['sourceInstances'],'measurementInterpretationAccepted':bid in ACCEPTED,'status':'ACCEPTED_TWO_TEMPLATE_INTERPRETATION_SOURCE_CERTIFICATE' if bid in ACCEPTED else 'ADDITIONAL_TEMPLATE_CERTIFICATE_PROPOSAL_UNACCEPTED','constructorParameters':parameters,'producerIndexScheduleMatches':True,'originalStrictFacts':strict,'periodicEndpointPairEvidence':bits,'symbolicReferenceTopology':symbolic,'radialReferenceCertificate':radial,'localMeasurementsAndSeamBounds':measures,'ownOriginalTorsoOpenViewNegative':negative,'canonicalQuantityExport':None,'physicalGeometryChanged':False,'stockAssigned':False}
  out.append(record);internal[bid]={'geometry':g,'pairs':pairs,'record':record}
 return out,internal
def actual_open_negative(sine):
 previous=load(PRIOR/'open-gap-negative.json');source=previous['source'];g=P.raw_geometry(source)
 P.schedule(g,'cylinder',48,capped=False);pairs=P.cylinder_pairs(48,4,4,capped=False)
 bit=P.pair_review(g,pairs,sine);top=P.symbolic_topology(g,pairs)
 assert top['boundaryOrNonmanifoldEdges']==96 and not top['closedOrientedSymbolicManifold']
 return {'source':source,'constructor':previous['constructor'],'producerOpenEnded':True,'periodicEndpointBitChecksPass':all(r['analyticProductInsideObservedFloat32Cell'] for r in bit),'actualOpenBoundaryEdges':96,'result':'REJECT_CLOSED_SOLID_QUANTITY','newNegativeGeometryCreated':False}
def affine_groups(rows,local):
 groups={};instances=[];depth=F(.12)
 for row in rows:
  bid=row['bucketId'];data=local[bid]
  assert all(row[k]==data['record'][k] for k in ('geometryPath','geometrySha256','sourceRange'))
  linear=linear_of(row['matrix']);det=X.determinant(linear);assert det!=0
  key=ident([bid,[float(x) for x in linear],row['sourceRange']])
  if key not in groups:
   m=data['record']['localMeasurementsAndSeamBounds'];v=fr(m['uncorrectedSignedVolumeIntegral']);e=fr(m['periodicEndpointVolumeChangeUpperBound']);reference=fr(m['exactPeriodicReferenceVolume'])
   nominal=abs(det)*v;error=abs(det)*e;lo,hi=nominal-error,nominal+error;qlo,qhi=lo/depth,hi/depth
   assert lo>0 and lo<=abs(det)*reference<=hi
   groups[key]={'id':key,'templateId':bid,'measurementInterpretationAccepted':bid in ACCEPTED,'originalLinearMatrixRowMajor':[float(x) for x in linear],'exactDeterminant':rat(det),'exactAbsoluteDeterminant':rat(abs(det)),'determinantExactlyOne':det==1,'matrixStoredValuesTreatedAsExactRationals':True,'matrixAuthoringOrFloat32ErrorIncludedInSeamBound':False,'sourceOriginTranslationExcluded':True,'worldNominalAbsoluteVolumeIntegral':rat(nominal),'worldPeriodicReferenceVolumeExact':rat(abs(det)*reference),'worldSeamOnlyVolumeErrorBound':rat(error),'worldPeriodicReferenceVolumeInterval':[rat(lo),rat(hi)],'acceptedOrProposedConservativeGeometricVolume':rat(lo),'referenceDepthExactBinary64':rat(depth),'unassignedGeometricRecipeInterval':[rat(qlo),rat(qhi)],'unassignedConservativeRecipeExact':rat(qlo),'affineAreaCertificate':area_certificate(data['geometry'],data['pairs'],linear),'canonicalRoundingReview':rounding(lo,hi,qlo,qhi,bid in ACCEPTED),'canonicalQuantityExport':None,'fuelBindingCreated':False}
  group=groups[key]
  instances.append({'placeId':row['placeId'],'sourceId':row['sourceId'],'renderId':row['renderId'],'sectionId':row['sectionId'],'geometryPath':row['geometryPath'],'geometrySha256':row['geometrySha256'],'sourceRange':row['sourceRange'],'originalMatrix':row['matrix'],'templateId':bid,'affineCertificateId':key,'measurementInterpretationAccepted':bid in ACCEPTED,'exactAffineDeterminant':group['exactDeterminant'],'nominalAbsoluteVolumeIntegral':group['worldNominalAbsoluteVolumeIntegral'],'seamOnlyVolumeErrorBound':group['worldSeamOnlyVolumeErrorBound'],'periodicReferenceVolumeInterval':group['worldPeriodicReferenceVolumeInterval'],'conservativeGeometricVolumeExact':group['acceptedOrProposedConservativeGeometricVolume'],'unassignedConservativeRecipeExact':group['unassignedConservativeRecipeExact'],'areaBoundsAndRoundingCertificateId':key,'canonicalMeasurementExport':None,'sourceLowerQuantityRepresentation':group['canonicalRoundingReview']['conservativeLowerRecipeRepresentation'],'sourceRepresentationInterpretationAccepted':bid in ACCEPTED,'sourceIdentityNotMergedByGeometryReuse':True,'quantityAssigned':False,'rawStrictClosureStillFailed':True})
 assert len(instances)==530 and len(groups)==36
 return groups,instances
def table_unions(instances,groups,local):
 by={(r['placeId'],r['sourceId']):r for r in instances};out=[];depth=F(.12)
 for old in load(READINESS/'compound-review.json')['groups']:
  if old['kind']!='table':continue
  members=[by[old['placeId'],m['sourceId']] for m in old['members']]
  assert len(members)==2 and {m['templateId'] for m in members}=={'a0784d61','eb49ad7c'}
  planes={}
  for member in members:
   data=local[member['templateId']];linear=linear_of(member['originalMatrix']);translation=tuple(map(F,member['originalMatrix'][12:15]));pts=P.vertices(data['geometry'])
   ys=[apply(linear,p)[1]+translation[1] for p in pts]
   dy=max(abs(apply(linear,P.sub(pts[a],pts[b]))[1]) for a,b,_ in data['pairs']);assert dy==0
   planes[member['templateId']]={'minimumY':min(ys),'maximumY':max(ys),'maximumEndpointReferenceYDisplacement':dy}
  gap=planes['a0784d61']['minimumY']-planes['eb49ad7c']['maximumY'];assert gap>0
  # Certified radial references lie within the actual source Y slabs and their
  # endpoint interpretation has exactly zero Y displacement in these matrices.
  lo=sum(fr(m['periodicReferenceVolumeInterval'][0]) for m in members);hi=sum(fr(m['periodicReferenceVolumeInterval'][1]) for m in members)
  nominal=sum(fr(m['nominalAbsoluteVolumeIntegral']) for m in members);error=sum(fr(m['seamOnlyVolumeErrorBound']) for m in members)
  assert lo==nominal-error and hi==nominal+error
  reference=sum(fr(groups[m['affineCertificateId']]['worldPeriodicReferenceVolumeExact']) for m in members)
  assert lo<=reference<=hi
  out.append({'placeId':old['placeId'],'proposalKey':old['proposalKey'],'status':'TABLE_UNION_MEASUREMENT_PROPOSAL_UNACCEPTED','members':[{'sourceId':m['sourceId'],'templateId':m['templateId'],'affineCertificateId':m['affineCertificateId'],'originalMatrix':m['originalMatrix']} for m in members],'actualDisjointnessProof':{'separatingPlaneNormal':[0,1,0],'topMinimumWorldY':rat(planes['a0784d61']['minimumY']),'legMaximumWorldY':rat(planes['eb49ad7c']['maximumY']),'positiveLiteralSeparation':rat(gap),'endpointReferenceYDisplacementExactlyZero':True,'proof':'Each certified periodic component solid is within the Y halfspaces proved from all its original transformed positions. The positive gap separates the closed reference sets, so their actual intersection is empty. Bounding envelopes are not substituted for component volume.','intersectionVolumeExact':rat(F(0))},'nominalUnionVolumeIntegral':rat(nominal),'periodicReferenceUnionVolumeExact':rat(reference),'seamOnlyUnionVolumeError':rat(error),'periodicReferenceUnionVolumeInterval':[rat(lo),rat(hi)],'proposedConservativeUnionVolume':rat(lo),'unassignedGeometricRecipeInterval':[rat(lo/depth),rat(hi/depth)],'canonicalRoundingReview':rounding(lo,hi,lo/depth,hi/depth),'canonicalMeasurementExport':None,'quantityAssigned':False,'geometryRepairOrGapFilled':False,'jointOrSupportOrConnectivityAccepted':False})
 assert len(out)==8
 return out
def build():
 preserved,geometry_count,authority_sha=preserve_inputs()
 buckets=load(PRIOR/'provenance-buckets.json')['buckets'];rows=load(PRIOR/'scope-ledger.json')['records'];assert len(rows)==530
 actual,section_pins=targeted_descriptors(rows)
 phase,sine=P.phase_bounds();templates,local=local_templates(buckets,sine)
 controls=representation_controls();assert len(controls)==4
 negative=actual_open_negative(sine)
 groups,instances=affine_groups(rows,local)
 unions=table_unions(instances,groups,local)
 accepted=[r for r in instances if r['measurementInterpretationAccepted']];extra=[r for r in instances if not r['measurementInterpretationAccepted']]
 assert len(accepted)==476 and len(extra)==54
 # Matrix coefficients and original source IDs are checked again against the
 # unchanged targeted descriptors rather than inferred from template reuse.
 assert all(actual[r['placeId'],r['sourceId']]['matrix']==r['originalMatrix'] for r in instances)
 ambiguities=sum(groups[r['affineCertificateId']]['canonicalRoundingReview']['quantityIntervalHasMultipleBinary64Outcomes'] for r in instances)
 upward=sum(groups[r['affineCertificateId']]['canonicalRoundingReview']['conservativeRecipeQuantityConversionDiagnosticOnly']['nearestEvenRoundsAboveExact'] for r in instances)
 exact_one=sum(fr(r['exactAffineDeterminant'])==1 for r in instances)
 summary={'version':1,'result':'PASS','authorityCommit':AUTHORITY,'sourceOnly':True,'acceptedInterpretationInstanceCertificates':476,'additionalTemplateProposals':5,'additionalInstanceProposals':54,'allSourceInstances':530,'localTemplateCertificates':7,'actualLinearMatrices':25,'geometryLinearGroups':36,'acceptedGeometryLinearGroups':sum(g['measurementInterpretationAccepted'] for g in groups.values()),'targetedOriginalSourceSections':50,'instancesWithDeterminantExactlyOne':exact_one,'instancesWithDeterminantNotExactlyOne':530-exact_one,'perTemplateTorsoOpenViewNegatives':sum(t['ownOriginalTorsoOpenViewNegative'] is not None for t in templates),'actualAuthoredOpenNegativeBoundaryEdges':96,'exactHeightBandPolarOrderTests':sum(t['radialReferenceCertificate']['heightBandNoSelfIntersectionProof']['exactQuadraticPolarOrderTests'] for t in templates),'tableUnionProposals':8,'tableIntersectionsExactlyEmpty':8,'instanceQuantityIntervalsSpanningMultipleBinary64Outcomes':ambiguities,'nearestEvenConservativeRecipeCandidatesRoundingUp':upward,'acceptedInstanceSourceRepresentationsCertified':476,'conditionalInstanceRepresentationProposals':54,'scalarRepresentationControls':4,'canonicalExportsSelected':0,'fuelBindingsOrStockAssignments':0,'originalStrictClosurePassesAdded':0,'priorPayloadAndPackageFilesPreserved':preserved,'originalGeometryFilesPreserved':geometry_count,'sourceMeshesChanged':0,'meshRepairsWeldsOrGeometryExports':0,'runtimeChanges':0,'factoriesRenderersBuildsOrRetainedHelpers':0}
 rounding_report={'version':1,'sourceLowerRepresentationRuleSelectedByArchitect':True,'canonicalRuntimeExportOrBindingAssigned':False,'rule':'After unchanged accepted reference-depth recipe, greatest finite nonnegative binary64 <= exact rational lower quantity.','acceptedInstanceRepresentationCertificates':476,'conditionalInstanceRepresentationProposals':54,'conditionalTableUnionRepresentationProposals':8,'instanceCertificates':530,'multipleOutcomeIntervals':ambiguities,'nearestEvenDiagnosticConservativeCandidatesRoundingUp':upward,'selectedRepresentationsRoundingAboveExactLower':0,'acceptedIntervalMultipleOutcomes':sum(groups[r['affineCertificateId']]['canonicalRoundingReview']['quantityIntervalHasMultipleBinary64Outcomes'] for r in accepted),'multipleIntervalOutcomesDoNotBlockSelectedLower':True,'scalarControls':controls,'scope':'Deterministic source-side representation of the selected conservative lower quantity only. All intervals remain; no claim about unknown actual volume, runtime export or finite fuel assignment. Five unaccepted templates and eight unions remain conditional.','additionalScalarRepresentationErrorSeparateFromSeamOnlyBounds':True}

 return {'input-pins.json':{'version':1,'authorityCommit':AUTHORITY,'authorityPath':AUTHORITY_PATH,'authoritySha256':authority_sha,'canonicalClarificationSnapshot':{'path':(HERE/'canonical-clarification.md').relative_to(ROOT).as_posix(),'sha256':'78cd6b43f412258709df6166bd52ab3a72efdf04e58ab267204e8d1f552775da','authority':'Explicit architect delegation to the owning artist chat, 17 November 2026; root working decision captured byte-exact.','observedRootHeadAtCapture':'a6d66feb27e4de486fd285f51d99c5758f56a5f9','snapshotWasCommittedAtCapture':False},'parentArtistCommit':PARENT,'frozenOriginalSourceContext':FROZEN,'priorProducerPinsPath':(PRIOR/'input-pins.json').relative_to(ROOT).as_posix(),'priorProducerPinsSha256':sha((PRIOR/'input-pins.json').read_bytes()),'targetedSourceSections':section_pins},'template-certificates.json':{'version':1,'templates':templates,'phaseEnclosureMethodUnchanged':phase,'actualAuthoredOpenGapNegative':negative},'affine-certificates.json':{'version':1,'certificates':sorted(groups.values(),key=lambda g:g['id'])},'instance-certificates.json':{'version':1,'instances':instances},'table-union-proposals.json':{'version':1,'proposals':unions},'rounding-review.json':rounding_report,'check-results.json':summary}
if __name__=='__main__':
 parser=argparse.ArgumentParser(description=__doc__);parser.add_argument('--save-review',action='store_true');args=parser.parse_args()
 if not args.save_review:
  def readonly(event,args):
   if event=='open' and (any(c in (args[1] or '') for c in 'wax+') or (args[2] or 0)&(os.O_WRONLY|os.O_RDWR|os.O_CREAT|os.O_TRUNC|os.O_APPEND)):raise PermissionError('Read-only radial certificates refuse writes')
   if event in {'os.remove','os.rename','os.mkdir','os.rmdir','os.truncate','os.utime','os.chmod'}:raise PermissionError('Read-only radial certificates refuse mutation')
  sys.addaudithook(readonly)
 outputs=build()
 for name,value in outputs.items():
  raw=encode(value)
  if args.save_review:(HERE/name).write_bytes(raw)
  else:assert (HERE/name).read_bytes()==raw,'Certificate output differs: '+name
 if not args.save_review and (HERE/'review-package.json').exists():
  for row in load(HERE/'review-package.json')['files']:
   raw=(ROOT/row['path']).read_bytes();assert len(raw)==row['bytes'] and sha(raw)==row['sha256']
 print(json.dumps(outputs['check-results.json'],sort_keys=True))
