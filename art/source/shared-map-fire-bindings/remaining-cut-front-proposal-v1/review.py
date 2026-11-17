"""Bounded remaining-cut/front proposal. Reads original arrays; never writes a mesh."""
from pathlib import Path
from fractions import Fraction as F
import argparse,collections,hashlib,importlib.util,json,math,os,struct,subprocess,sys
sys.dont_write_bytecode=True
HERE=Path(__file__).resolve().parent;ROOT=HERE.parents[3]
PRE=HERE.parent/'remaining-geometry-readiness-v1'
PARENT='0b43868bbcc1965db9f1d1cdd132be0668e87e5d'
FROZEN='2b350309d9116812a1d3988af090614bdaefbc25'
AUTHORITY='63ec0566fe7fd0a8b57dc4b79d4335d6eb3e00b5'
AUTHORITY_PATH='docs/engineering/shared-maps/radial-measurement-decision.md'
s=importlib.util.spec_from_file_location('preserved_cut_front_exact',PRE/'exact.py')
X=importlib.util.module_from_spec(s);s.loader.exec_module(X)
SELECTED=['replacement/office-door-0/header','replacement/office-partition-0-tier-0:1:5/wall-1']
def load(path):return json.loads(path.read_text(encoding='utf-8'))
def sha(raw):return hashlib.sha256(raw).hexdigest()
def encode(v):return (json.dumps(v,indent=2,sort_keys=True)+'\n').encode()
def rat(v):return X.rational(F(v))
def git(path,commit):return subprocess.check_output(['git','show',commit+':'+path],cwd=ROOT)
def f32(v):return struct.unpack('<f',struct.pack('<f',v))[0]
def frozen_json_constant(path,marker):
 text=(ROOT/path).read_text(encoding='utf-8');return json.JSONDecoder().raw_decode(text[text.index(marker)+len(marker):])[0]
def preserve():
 n=0
 for name in ('remaining-material-proposal-v1','remaining-geometry-readiness-v1','radial-roundoff-policy-proposal-v1','radial-measurement-certificates-v1'):
  folder=HERE.parent/name;pkg=load(folder/'review-package.json')
  for row in pkg['files']:assert sha((ROOT/row['path']).read_bytes())==row['sha256']
  assert (folder/'review-package.json').read_bytes()==git((folder/'review-package.json').relative_to(ROOT).as_posix(),PARENT)
  n+=len(pkg['files'])+1
 pins=load(PRE/'geometry-pins.json')['files']
 for row in pins:assert sha((ROOT/row['path']).read_bytes())==row['sha256']
 assert (HERE/'authority-63ec0566.md').read_bytes()==git(AUTHORITY_PATH,AUTHORITY)
 return n,len(pins)
def input_pins():
 paths=['assets/art/exploration-access/fragments.js','assets/art/exploration-access/plans.js','assets/art/exploration-access/index.js','art/source/exploration-access/source-geometry.mjs','art/source/exploration-access/build-access.mjs','assets/art/exposition-administration/index.js','assets/art/exposition-administration/metadata.json','assets/art/exposition-administration/plan.js','assets/art/exposition-new-york/forms.js','src/runtime/three.js','vendor/farmyard-commando/30a3b8cae5f36bb0c1df3685b7fba16f701c2083/sites/tactical-animal/dist/aft/tactics/vendor/three.core.js']
 rows=[]
 for path in paths:
  working=(ROOT/path).read_bytes();original=git(path,FROZEN);assert working.replace(b'\r\n',b'\n')==original.replace(b'\r\n',b'\n')
  rows.append({'path':path,'commit':FROZEN,'gitObjectSha256':sha(original),'workingSha256':sha(working),'onlyWorkingLineEndingDifference':working!=original})
 return rows
def actual_descriptors(rows):
 out={};pins=[];section_pin_root=HERE.parent/'remaining-material-proposal-v1'
 for place in ('administration','horticulture'):
  prefix='assets/art/place-scenes/'+place;folder=ROOT/prefix;raw=(folder/'index.json').read_bytes();assert raw==git(prefix+'/index.json',FROZEN)
  index=json.loads(raw);chunks={c['id']:c for c in index['chunks']};oldpins={p['id']:p for p in load(section_pin_root/(place+'-section-pins.json'))['sections']}
  requests=collections.defaultdict(list)
  for row in rows:
   if row['placeId']==place:requests[row['sectionId']].append(row)
  for sid,wanted in sorted(requests.items()):
   path=prefix+'/'+chunks[sid]['url'];raw=(ROOT/path).read_bytes();assert sha(raw)==oldpins[sid]['sha256'] and raw==git(path,FROZEN)
   pins.append({'path':path,'sha256':sha(raw),'bytes':len(raw),'context':FROZEN})
   parts={p['id']:p for p in json.loads(raw)['parts']}
   for row in wanted:
    part=parts[row['renderId']];assert part['id']==row['sourceId'] and part['matrix']==row['matrix']
    assert not part.get('sourceRanges') and prefix+'/'+index['geometries'][part['geometry']]==row['geometryPath']
    out[row['placeId'],row['sourceId']]=part
 assert len(out)==194
 return out,pins
def edge_audit(original_points):
 points=sorted(set(original_points));by={p:i for i,p in enumerate(points)}
 refs={i:min(j for j,p in enumerate(original_points) if p==point) for i,point in enumerate(points)}
 triangles=[tuple(by[p] for p in original_points[j:j+3]) for j in range(0,len(original_points),3)]
 edges=collections.Counter();balance=collections.Counter();volume6=F(0)
 for tri in triangles:
  a,b,c=[points[i] for i in tri];assert X.cross(X.sub(b,a),X.sub(c,a))!=(0,0,0)
  volume6+=X.dot(a,X.cross(b,c))
  for a,b in zip(tri,tri[1:]+tri[:1]):
   key=tuple(sorted((a,b)));edges[key]+=1;balance[key]+=1 if a<b else -1
 raw_bad=[e for e in edges if edges[e]!=2 or balance[e]]
 atomic=collections.Counter();ab=collections.Counter();split=0
 for (a,b),count in edges.items():
  A,B=points[a],points[b];u=X.sub(B,A);length=X.dot(u,u)
  on=[i for i,p in enumerate(points) if X.cross(u,X.sub(p,A))==(0,0,0) and 0<=X.dot(u,X.sub(p,A))<=length]
  on.sort(key=lambda i:X.dot(u,X.sub(points[i],A)));split+=len(on)-2
  for v,w in zip(on,on[1:]):
   key=tuple(sorted((v,w)));atomic[key]+=count;ab[key]+=balance[a,b]*(1 if v<w else -1)
 bad=[e for e in atomic if atomic[e]!=2 or ab[e]];assert all(atomic[e]==1 for e in bad)
 graph=collections.defaultdict(list)
 for a,b in bad:graph[a].append(b);graph[b].append(a)
 assert graph and all(len(n)==2 for n in graph.values())
 loop=[min(graph)];previous=None
 while True:
  choices=sorted(v for v in graph[loop[-1]] if v!=previous);nxt=choices[0];previous=loop[-1]
  if nxt==loop[0]:break
  assert nxt not in loop;loop.append(nxt)
 assert len(loop)==len(graph)
 axes=[k for k in range(3) if len({points[i][k] for i in loop})==1];assert len(axes)==1
 axis=axes[0];other=[k for k in range(3) if k!=axis]
 area=abs(sum(points[a][other[0]]*points[b][other[1]]-points[b][other[0]]*points[a][other[1]] for a,b in zip(loop,loop[1:]+loop[:1])))/2
 spans=[max(points[i][k] for i in loop)-min(points[i][k] for i in loop) for k in other]
 assert area==spans[0]*spans[1]>0
 collinear=sum(X.cross(X.sub(points[loop[i-1]],points[v]),X.sub(points[loop[(i+1)%len(loop)]],points[v]))==(0,0,0) for i,v in enumerate(loop))
 return {'originalBoundaryOrNonmanifoldEdges':len(raw_bad),'exactExistingVertexEdgeSplits':split,'remainingAtomicBoundaryEdges':len(bad),'exactEdgeAtomisationCreatesNoCoordinates':True,'closedAfterExactCollinearSubdivision':False,'boundaryComponents':1,'collinearBoundarySubdivisionVertices':collinear,'boundaryPlaneAxis':axis,'boundaryPlaneValue':rat(points[loop[0]][axis]),'finiteMissingCutFaceArea':rat(area),'existingBoundaryVertexReferences':[refs[i] for i in loop],'boundaryReferencesMeaning':'Original source position-array vertex indices only. No replacement vertex/index array, cap polygon or triangulation is authored.','sourceOriginSignedSurfaceIntegral':rat(volume6/6)},area,axis,points[loop[0]][axis]
def face_groups(points):
 groups=collections.defaultdict(list)
 for offset in range(0,len(points),3):
  tri=points[offset:offset+3];normal=X.cross(X.sub(tri[1],tri[0]),X.sub(tri[2],tri[0]))
  nonzero=[k for k in range(3) if normal[k]];assert len(nonzero)==1
  k=nonzero[0];assert len({p[k] for p in tri})==1
  groups[k,1 if normal[k]>0 else -1,tri[0][k]].append(offset)
 return groups
def coverage(points,offsets,axis):
 other=[k for k in range(3) if k!=axis]
 triangles=[tuple(tuple(points[i+j][k] for k in other) for j in range(3)) for i in offsets]
 proof=X.nonoverlap2(triangles);area=sum(abs(X.cross2(*t)) for t in triangles)/2
 uv=[p for t in triangles for p in t];lo=[min(p[k] for p in uv) for k in (0,1)];hi=[max(p[k] for p in uv) for k in (0,1)]
 corners={(lo[0],lo[1]),(lo[0],hi[1]),(hi[0],lo[1]),(hi[0],hi[1])}
 return {'originalTriangleVertexOffsets':offsets,'sourceTriangles':len(offsets),'exactTriangleProjectionNonoverlap':proof,'actualTriangleArea':rat(area),'projectedCoordinateAxes':other,'projectedMin':[rat(v) for v in lo],'projectedMax':[rat(v) for v in hi],'rectangleAreaFromFaceCoordinates':rat((hi[0]-lo[0])*(hi[1]-lo[1])),'allFourCornersAreOriginalFacePositions':corners<=set(uv),'actualTrianglesCoverFullRectangle':proof['proved'] and area==(hi[0]-lo[0])*(hi[1]-lo[1]) and corners<=set(uv)},area,tuple(lo),tuple(hi)
def integral(points,origin):
 return sum(X.dot(X.sub(a,origin),X.cross(X.sub(b,origin),X.sub(c,origin))) for a,b,c in zip(points[0::3],points[1::3],points[2::3]))/6
def detailed_case(row,fragment,hidden,plan,metadata):
 raw=(ROOT/row['geometryPath']).read_bytes();assert sha(raw)==row['geometrySha256'] and raw==git(row['geometryPath'],FROZEN)
 g=json.loads(raw);assert g['index'] is None and row['sourceRange']=={'start':0,'count':42}
 source=fragment['vertices'];assert len(source)==42
 for attr,start,size in (('position',0,3),('normal',3,3),('uv',6,2),('grossUV',8,2)):
  assert g['attributes'][attr]['array']==[f32(v) for p in source for v in p[start:start+size]]
 points=[tuple(map(F,g['attributes']['position']['array'][i:i+3])) for i in range(0,126,3)]
 raw_points=[tuple(map(F,v[:3])) for v in source]
 audit,hole_area,axis,plane=edge_audit(points);raw_audit,raw_area,raw_axis,raw_plane=edge_audit(raw_points)
 assert audit['remainingAtomicBoundaryEdges']==8 and audit['exactExistingVertexEdgeSplits']==0 and raw_axis==axis
 assert raw_audit['remainingAtomicBoundaryEdges']==8
 strict=X.effective(g,row['sourceRange'])['facts'];assert not strict['closedSolidProof'] and strict['boundaryOrNonmanifoldEdges']==8
 groups=face_groups(points);assert len(groups)==5;faces=[];face_internal={}
 for (k,sign,c),offsets in sorted(groups.items()):
  cov,area,lo,hi=coverage(points,offsets,k);assert cov['actualTrianglesCoverFullRectangle']
  faces.append({'axis':k,'outwardSign':sign,'existingPlane':rat(c),'coverage':cov});face_internal[k,sign]=(c,cov,area,lo,hi,offsets)
 moved_origin=tuple(F(1) if i==axis else F(0) for i in range(3))
 v0,v1=integral(points,(F(0),)*3),integral(points,moved_origin)
 assert abs(v1-v0)==hole_area/3
 cut=next(c for c in plan['cutVolumes'] if c['id']==hidden['reasons'][0])
 common={'source':row,'originalConstructorMetadata':fragment['sourceData'],'originalSourcePartId':fragment['sourcePartId'],'recordedPrecutSourceSurfaceHash':hidden['sourceGeometrySha256'],'precutHashReconstructedHere':False,'frozenHiddenSourceRecord':hidden,'actualCutVolume':cut,'sourceTriangleCount':14,'originalStrictFacts':strict,'compiledBoundaryAudit':audit,'preFloat32SourceBoundaryAudit':raw_audit,'allFiveExistingFaceCoverages':faces,'rawToCompiledMaximumCoordinateChanges':[rat(max(abs(points[i][k]-raw_points[i][k]) for i in range(42))) for k in range(3)],'originalSurfaceIntegralAtZeroOrigin':rat(v0),'originalSurfaceIntegralAfterOneMetreOriginShift':rat(v1),'integralOriginShiftAxis':axis,'absoluteOriginDependence':rat(abs(v1-v0)),'originDependenceEqualsMissingFaceAreaOverThree':True,'cause':'Finite cut-plane face omitted by the surface clipper; exact collinear edge subdivision does not close it. Tiny captured Float32 changes are not the cause of this missing face.','newGeometryOrCapOrUVExport':False,'measurementReferenceAccepted':False,'quantityAssigned':False,'anchorsOrRuntimeOrOpeningChanged':False}
 assert row['matrix']==[1,0,0,0,0,1,0,0,0,0,1,0,62,0,22,1]
 if row['sourceId']==SELECTED[0]:
  assert fragment['sourceData']['form']=='box' and fragment['sourceData']['dimensions']==[1.18,.14,.25]
  assert axis==2 and plane==7
  assert set(face_internal)=={(0,-1),(0,1),(1,-1),(1,1),(2,1)}
  dx=face_internal[0,1][0]-face_internal[0,-1][0]
  dy=face_internal[1,1][0]-face_internal[1,-1][0]
  dz=face_internal[2,1][0]-plane
  assert dx*dy==hole_area and min(dx,dy,dz)>0
  lo3=[face_internal[0,-1][0],face_internal[1,-1][0],plane];hi3=[face_internal[0,1][0],face_internal[1,1][0],face_internal[2,1][0]]
  for (k,sign),(_,_,_,lo,hi,_) in face_internal.items():
   other=[j for j in range(3) if j!=k]
   assert lo==tuple(lo3[j] for j in other) and hi==tuple(hi3[j] for j in other)
  assert max(F(p[1]) for p in cut['polygon'])==plane
  assert min(F(p[0]) for p in cut['polygon'])<lo3[0]<hi3[0]<max(F(p[0]) for p in cut['polygon'])
  assert F(cut['minY'])<lo3[1]<hi3[1]<F(cut['maxY'])
  proposal={'status':'UNACCEPTED_HEADER_MEASUREMENT_REFERENCE_PROPOSAL','scopeExactSourceId':row['sourceId'],'reference':'Closed remainder of the authored BoxGeometry under the recorded portal subtraction, using the verified existing five face planes and the recorded z=7 cut boundary. This is a mathematical measurement interpretation; no sixth face is generated.','planeProofUsesActualFaceTrianglesNotBounds':True,'allFiveFullFaceDomainsMatchTheSameReferenceHalfspaces':True,'cutBoundaryMatchesRecordedPortalMaximumZExactly':True,'actualRetainedDimensionsFromProvedFacePlanes':[rat(v) for v in (dx,dy,dz)],'proposedReferenceVolumeExact':rat(dx*dy*dz),'missingCutBoundaryAreaExact':rat(hole_area),'strictPortalInteriorDisjointnessProof':'The retained reference occupies z>=7; the recorded portal interior occupies 5<z<7. Their interiors are disjoint. Do not restore the original 1.18 m header across the enlarged opening.','openingWidthUnchanged':2,'openingHeightUnchanged':2.8,'virtualBoundaryNotAnAuthoredCap':True,'physicalSourceStillOpen':True,'radialRuleOrDistanceToleranceUsed':False,'measurementOrStockExport':None}
 else:
  data=fragment['sourceData'];assert data['form']=='native-wall' and data['dimensions']==[1,2,.16] and data['engineSource']=='wallPanels'
  run=next(r for r in metadata['plan']['runs'] if r['id']==data['runId'])
  dx,dz=F(run['b'][0])-F(run['a'][0]),F(run['b'][1])-F(run['a'][1])
  frame=(-dz,F(0),dx);axes=[i for i,v in enumerate(frame) if v];assert axes==[0] and frame[0]<0
  normals=[tuple(map(F,p[3:6])) for p in source]
  selected=[];back=[]
  for offset in range(0,42,3):
   n=normals[offset];assert all(normals[offset+j]==n for j in range(3))
   if abs(n[0])>max(abs(n[1]),abs(n[2])):
    (selected if n[0]<0 else back).append(offset)
  front_cov,area,lo,hi=coverage(points,selected,0);back_cov,back_area,blo,bhi=coverage(points,back,0)
  assert front_cov['actualTrianglesCoverFullRectangle'] and back_cov['actualTrianglesCoverFullRectangle'] and area==back_area and (lo,hi)==(blo,bhi)
  assert len(selected)==3 and axis==1 and plane==F(f32(cut['maxY']))
  negative=None
  for remove in selected:
   kept=[i for i in selected if i!=remove];cov,remaining,nlo,nhi=coverage(points,kept,0)
   if (nlo,nhi)==(lo,hi):
    assert not cov['actualTrianglesCoverFullRectangle'] and remaining<area
    negative={'originalTriangleVertexOffsetOmittedFromAnalysisView':remove,'sameFaceCoordinateExtentsAsCompleteView':True,'remainingActualTriangleArea':rat(remaining),'completeOriginalFaceArea':rat(area),'actualFullFaceCoverageAfterOmission':False,'quantityReadinessResult':'REJECT_FRONT_AREA_PROOF','sourceGeometryOrIndexArrayChanged':False};break
  assert negative
  common['originalPlanRun']=run
  common['nativePrimaryFaceCorrespondence']={'nativeThinAxis':'local Z','selectedNativeSide':'+Z member of the original primary face pair; counted once','sourceRunTangentXZ':[rat(dx),rat(dz)],'nativePositiveZFrontUnnormalisedInSourceXYZ':[rat(v) for v in frame],'selection':'Preserved original BoxGeometry face-normal class under the pinned run frame; actual geometry is then checked. No front is inferred from a bounding box.','sourceFrontNormalClass':[rat(v) for v in normals[selected[0]]],'frontOriginalTriangleVertexOffsets':selected,'backOriginalTriangleVertexOffsets':back,'frontCoverage':front_cov,'backCoverage':back_cov,'bothActualPrimaryProjectionsEqual':True,'areaCountedOnce':True}
  common['missingFrontTriangleNegative']=negative
  proposal={'status':'UNACCEPTED_PRIMARY_FACE_MEASUREMENT_PROPOSAL','scopeExactSourceId':row['sourceId'],'reference':'Use the existing three native-primary-front source triangles after exact source-normal/run-frame correspondence and projection coverage proof. Count that side once; the back cross-check is not another area account.','proposedPrimaryAreaExact':rat(area),'closedSolidOrMissingBottomCapProofRequiredForThisAreaRoute':False,'missingBottomCutFaceStillUnrepaired':True,'missingBottomCutBoundaryAreaExact':rat(hole_area),'rawCutMaximumY':rat(F(cut['maxY'])),'actualStoredCutBoundaryY':rat(plane),'capturedFloat32CutPlaneDifference':rat(plane-F(cut['maxY'])),'strictPortalInteriorDisjointnessProof':'All retained front vertices have Y >= stored cut boundary, which exceeds the original portal maximum Y. No opening or passage face is filled.','nativeDimensionsAndUVsUnchanged':True,'radialRuleOrDistanceToleranceUsed':False,'canonicalAreaOrStockExport':None}
 return {**common,'proposal':proposal}
def group_cases(rows,fragments,plans,cases):
 fr={(place,p['id']):p for place,parts in fragments.items() for p in parts};hidden={(place,h['replacementId']):h for place,p in plans.items() for h in p['hiddenSourceParts'] if h.get('replacementId')}
 groups={};ledger=[]
 for row in rows:
  key=(row['placeId'],row['sourceId']);part=fr.get(key);h=hidden.get(key)
  if row['quantityRecipe']=='weather-area':
   form='hip';constructor='authored hip BufferGeometry';reason='intentional-underside-removal' if h else 'original-weather-exposure-unproved';role='weather-roof'
  else:
   assert part is not None and h is not None
   form=part['sourceData'].get('form')
   if row['quantityRecipe']=='wall-area':assert form in ('native-wall','level-closure')
   constructor='BoxGeometry' if form in ('box','native-wall','level-closure') else 'LatheGeometry'
   if constructor=='LatheGeometry':assert '/baluster-' in row['sourceId'] and row['familyId']=='H20'
   reason=h['reasons'][0];cut=next(c for c in plans[row['placeId']]['cutVolumes'] if c['id']==reason);role=cut['role']
   if 'base-rail-opening' in reason:role='gallery-base-rail'
   if 'upper-rail-opening' in reason:role='gallery-upper-rail'
   reason='cut-volume'
  bucket_key=(row['quantityRecipe'],constructor,form,role,reason)
  bid=sha(json.dumps(bucket_key).encode())[:16]
  if bid not in groups:groups[bid]={'id':bid,'recipe':row['quantityRecipe'],'originalConstructor':constructor,'sourceForm':form,'cutRole':role,'provenanceKind':reason,'count':0,'byPlaceFamily':collections.Counter(),'sourceIds':[],'readiness':'withheld; only provenance grouped, no unreviewed quantity route inherited'}
  group=groups[bid];group['count']+=1;group['byPlaceFamily'][row['placeId']+'/'+row['familyId']]+=1;group['sourceIds'].append(row['placeId']+'::'+row['sourceId'])
  facts=cases[row['baseCaseId']]['facts']
  ledger.append({**row,'bucketId':bid,'originalSourceConstructor':constructor,'originalFragmentSourceData':part['sourceData'] if part else None,'recordedPrecutSourceSurfaceHash':h['sourceGeometrySha256'] if h else None,'recordedCutReasons':h['reasons'] if h else [],'sourceStrictFactsReference':{'baseCaseId':row['baseCaseId'],'boundaryOrNonmanifoldEdges':facts['boundaryOrNonmanifoldEdges'],'sourceTriangles':facts['sourceTriangles']},'detailedInThisPackage':row['sourceId'] in SELECTED,'radialMeasurementRuleInherited':False,'referenceOrStockAssigned':False})
 for group in groups.values():group['byPlaceFamily']=dict(sorted(group['byPlaceFamily'].items()));group['sourceIds'].sort()
 assert len(ledger)==194 and sum(g['count'] for g in groups.values())==194 and len(groups)==12
 return sorted(groups.values(),key=lambda g:g['id']),sorted(ledger,key=lambda r:(r['placeId'],r['sourceId'])),fr,hidden
def build():
 prior_files,geometry_files=preserve();pins=input_pins()
 old=load(PRE/'quantity-exceptions.json')['records'];rows=[r for r in old if r['quantityRecipe']!='closed-volume' or r['sourceId'].startswith('replacement/')]
 assert len(rows)==194 and collections.Counter(r['quantityRecipe'] for r in rows)=={'closed-volume':65,'wall-area':126,'weather-area':3}
 fragments=frozen_json_constant('assets/art/exploration-access/fragments.js','SOURCE_FRAGMENTS=')
 plans=frozen_json_constant('assets/art/exploration-access/plans.js','ACCESS_PLANS=freeze(')
 cases={c['id']:c for c in load(PRE/'geometry-cases.json')['cases']}
 buckets,ledger,fr,hidden=group_cases(rows,fragments,plans,cases)
 actual,sections=actual_descriptors(rows);metadata=load(ROOT/'assets/art/exposition-administration/metadata.json')
 details=[]
 for sid in SELECTED:
  row=next(r for r in rows if r['placeId']=='administration' and r['sourceId']==sid)
  details.append(detailed_case(row,fr['administration',sid],hidden['administration',sid],plans['administration'],metadata))
 roofs=[r for r in ledger if r['quantityRecipe']=='weather-area'];assert len(roofs)==3
 summary={'version':1,'result':'PASS','sourceOnly':True,'authorityCommit':AUTHORITY,'priorArtistCandidate':PARENT,'remainingCases':194,'derivedSolidCases':65,'wallPrimaryFaceCases':126,'weatherRoofCasesKeptSeparate':3,'provenanceBuckets':12,'uniqueGeometryAndRangeCases':194,'originalRepresentativesAnalyzed':2,'representativeSourceTriangles':28,'compiledAtomicBoundaryEdges':[r['compiledBoundaryAudit']['remainingAtomicBoundaryEdges'] for r in details],'exactCollinearEdgeSplits':[r['compiledBoundaryAudit']['exactExistingVertexEdgeSplits'] for r in details],'preFloat32BoundaryEdges':[r['preFloat32SourceBoundaryAudit']['remainingAtomicBoundaryEdges'] for r in details],'existingFaceRectangleCoverageProofs':10,'originalStrictClosureStillFailed':True,'missingFrontTriangleNegativeRejected':True,'priorPayloadAndPackageFilesPreserved':prior_files,'originalGeometryFilesPreserved':geometry_files,'targetedOriginalSections':len(sections),'measurementReferenceProposalsAccepted':0,'quantitiesOrBindingsAssigned':0,'geometryCapsRepairsUVExports':0,'openingsChanged':0,'anchorsOrRuntimeChanges':0,'factoriesRenderersBuildsOrRetainedHelpers':0}
 return {'input-pins.json':{'version':1,'authorityCommit':AUTHORITY,'authorityPath':AUTHORITY_PATH,'authoritySha256':sha((HERE/'authority-63ec0566.md').read_bytes()),'originalContext':FROZEN,'sourceProducers':pins,'targetedOriginalSections':sections},'provenance-buckets.json':{'version':1,'buckets':buckets},'scope-ledger.json':{'version':1,'records':ledger},'two-representative-review.json':{'version':1,'cases':details},'roof-exceptions-separate.json':{'version':1,'records':roofs,'exposureOrAreaSolved':False,'capOrOtherRepairProposed':False},'check-results.json':summary}
if __name__=='__main__':
 parser=argparse.ArgumentParser(description=__doc__);parser.add_argument('--save-review',action='store_true');args=parser.parse_args()
 if not args.save_review:
  def readonly(event,args):
   if event=='open' and (any(c in (args[1] or '') for c in 'wax+') or (args[2] or 0)&(os.O_WRONLY|os.O_RDWR|os.O_CREAT|os.O_TRUNC|os.O_APPEND)):raise PermissionError('Read-only bounded cut/front review refuses writes')
   if event in {'os.remove','os.rename','os.mkdir','os.rmdir','os.truncate','os.utime','os.chmod'}:raise PermissionError('Read-only bounded cut/front review refuses mutation')
  sys.addaudithook(readonly)
 outputs=build()
 for name,value in outputs.items():
  raw=encode(value)
  if args.save_review:(HERE/name).write_bytes(raw)
  else:assert (HERE/name).read_bytes()==raw,'Saved cut/front proposal differs: '+name
 if not args.save_review and (HERE/'review-package.json').exists():
  for row in load(HERE/'review-package.json')['files']:
   raw=(ROOT/row['path']).read_bytes();assert len(raw)==row['bytes'] and sha(raw)==row['sha256']
 print(json.dumps(outputs['check-results.json'],sort_keys=True))
