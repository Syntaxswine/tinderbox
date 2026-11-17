"""Per-case source measurement readiness; never exports geometry or runtime data."""
from pathlib import Path
from fractions import Fraction as F
import argparse,collections,hashlib,importlib.util,json,math,os,struct,subprocess,sys
sys.dont_write_bytecode=True
HERE=Path(__file__).resolve().parent;ROOT=HERE.parents[3]
PRIOR=HERE.parent/'remaining-cut-front-proposal-v1'
READY=HERE.parent/'remaining-geometry-readiness-v1'
MAT=HERE.parent/'remaining-material-proposal-v1'
AUTHORITY='6d818100d7c34502403e6b73c8d9e5619c09f483'
AUTHORITY_PATH='docs/engineering/shared-maps/cut-front-measurement-decision.md'
PARENT='f584ebcc7327da7ea9afa23364f78d538f8af625'
FROZEN='2b350309d9116812a1d3988af090614bdaefbc25'
def module(name,path):
 s=importlib.util.spec_from_file_location(name,path);m=importlib.util.module_from_spec(s);s.loader.exec_module(m);return m
P=module('preserved_cut_front',PRIOR/'review.py');X=P.X
C=module('preserved_radial_certificates',HERE.parent/'radial-measurement-certificates-v1/certify.py')
G=module('current_source_geometry_analysis',HERE/'geometry.py')
def load(path):return json.loads(path.read_text(encoding='utf-8'))
def sha(raw):return hashlib.sha256(raw).hexdigest()
def convert(v):
 if isinstance(v,F):return X.rational(v)
 if isinstance(v,dict):return {str(k):convert(x) for k,x in v.items()}
 if isinstance(v,(list,tuple)):return [convert(x) for x in v]
 return v
def encode(v):return (json.dumps(convert(v),sort_keys=True,indent=2)+'\n').encode()
def git(path,commit):return subprocess.check_output(['git','show',commit+':'+path],cwd=ROOT)
def ratf(v):return F(int(v['numerator']),int(v['denominator']))
def preserve():
 n=0
 for name in ('remaining-material-proposal-v1','remaining-geometry-readiness-v1','radial-roundoff-policy-proposal-v1','radial-measurement-certificates-v1','remaining-cut-front-proposal-v1'):
  folder=HERE.parent/name;pkg=load(folder/'review-package.json')
  for row in pkg['files']:assert sha((ROOT/row['path']).read_bytes())==row['sha256']
  assert (folder/'review-package.json').read_bytes()==git((folder/'review-package.json').relative_to(ROOT).as_posix(),PARENT)
  n+=len(pkg['files'])+1
 for pin in load(READY/'geometry-pins.json')['files']:assert sha((ROOT/pin['path']).read_bytes())==pin['sha256']
 assert (HERE/'authority-6d818100.md').read_bytes()==git(AUTHORITY_PATH,AUTHORITY)
 return n
def producer_pins():
 pins=P.input_pins()
 for path in ('assets/art/exposition-horticulture/index.js','assets/art/exposition-horticulture/metadata.json','assets/art/exposition-horticulture/plan.js'):
  raw=(ROOT/path).read_bytes();original=git(path,FROZEN);assert raw.replace(b'\r\n',b'\n')==original.replace(b'\r\n',b'\n')
  pins.append({'path':path,'commit':FROZEN,'gitObjectSha256':sha(original),'workingSha256':sha(raw),'onlyWorkingLineEndingDifference':raw!=original})
 return pins
def source_geometry(row,fragment):
 raw=(ROOT/row['geometryPath']).read_bytes();assert sha(raw)==row['geometrySha256'] and raw==git(row['geometryPath'],FROZEN)
 g=json.loads(raw);position=g['attributes']['position']['array'];pts=[tuple(map(F,position[i:i+3])) for i in range(0,len(position),3)]
 idx=g['index']['array'] if isinstance(g.get('index'),dict) else list(range(len(pts)))
 assert row['sourceRange']=={'start':0,'count':len(idx)}
 if fragment is not None:
  assert g.get('index') is None and len(fragment['vertices'])==len(pts)
  for attr,start,size in (('position',0,3),('normal',3,3),('uv',6,2),('grossUV',8,2)):
   assert g['attributes'][attr]['array']==[P.f32(v) for p in fragment['vertices'] for v in p[start:start+size]]
 tris=[tuple(pts[i] for i in idx[j:j+3]) for j in range(0,len(idx),3)]
 linear=C.linear_of(row['matrix']);det=X.determinant(linear);assert det!=0
 world=[tuple(C.apply(linear,p) for p in t) for t in tris]
 return {'g':g,'points':pts,'indices':idx,'triangles':tris,'worldTriangles':world,'linear':linear,'determinant':det}
def area_interval(triangles):
 lo,hi=F(0),F(0);zero=0
 for t in triangles:
  n=G.cross(G.sub(t[1],t[0]),G.sub(t[2],t[0]))
  if n==(0,0,0):zero+=1;continue
  a,b=C.sqrt_bounds(sum(x*x for x in n));lo+=a/2;hi+=b/2
 return {'lower':lo,'upper':hi,'scalarEvaluationWidth':hi-lo,'sqrtEnclosureBits':128,'zeroAreaSourceTriangles':zero}
def source_quantity(lower,recipe):
 assert lower>0
 q=lower/F(.12) if recipe=='closed-volume' else lower
 return {'exactConservativeGeometricReference':lower,'acceptedMaterialRecipe':'volume / pinned binary64 .12 m' if recipe=='closed-volume' else 'actual primary area * 1','exactReferenceDepthIfUsed':F(.12) if recipe=='closed-volume' else None,'exactLowerRecipeValue':q,'sourceRepresentation':C.lower_representation(q),'canonicalRuntimeOrStockExport':None}
def box_case(row,fragment,cut,data):
 tri=data['triangles'];components,zero=G.components(tri);certs=[]
 for ids in components:
  cert=G.rectangular_reference([tri[i] for i in ids],cut,P.f32,X.nonoverlap2)
  cert['originalTriangleIndexOffsets']=[3*i for i in ids];certs.append(cert)
 ready=all(c['proved'] for c in certs) and bool(certs);separations=[]
 if ready:
  for i,a in enumerate(certs):
   for j,b in enumerate(certs[:i]):
    overlap=math.prod(max(F(0),min(a['hi'][k],b['hi'][k])-max(a['lo'][k],b['lo'][k])) for k in range(3))
    separations.append({'componentIndices':[j,i],'actualReferenceIntersectionVolume':overlap})
    if overlap>0:ready=False
 volume=sum(c['volume'] for c in certs)*abs(data['determinant']) if ready else None
 return {'sourceId':row['sourceId'],'placeId':row['placeId'],'sourceConstructorMetadata':fragment['sourceData'],'recordedCut':cut,'actualAffineLinear':data['linear'],'exactAffineDeterminant':data['determinant'],'vertexConnectedSourceSurfaceComponents':len(certs),'zeroAreaTrianglesExcludedOnlyFromMeasures':zero,'componentProofs':certs,'componentReferenceDisjointness':separations,'proofComplete':ready,'referenceVolumeExact':volume,'quantityReference':source_quantity(volume,'closed-volume') if ready else None,'unresolvedReason':None if ready else 'At least one actual component/domain/cut relation is unproved; no nonrectangular or envelope fallback.','physicalMeshRepair':False,'bindingOrStockAssigned':False}
def wall_case(row,fragment,metadata,data,cut):
 source=fragment['sourceData'];run=next(r for r in metadata['plan']['runs'] if r['id']==source['runId'])
 dx=F(run['b'][0])-F(run['a'][0]);dz=F(run['b'][1])-F(run['a'][1]);length2=dx*dx+dz*dz;assert length2>0
 tangent=(dx,F(0),dz);front=(-dz,F(0),dx);selected=[];back=[];orientation_bad=[]
 for i,t in enumerate(data['triangles']):
  raw=fragment['vertices'][3*i:3*i+3];normals=[tuple(map(F,p[3:6])) for p in raw];assert normals[0]==normals[1]==normals[2]
  n=normals[0];pf=G.dot(n,front);pt=G.dot(n,tangent)
  if pf*pf>pt*pt and pf*pf>n[1]*n[1]*length2:
   normal=G.cross(G.sub(t[1],t[0]),G.sub(t[2],t[0]))
   if normal!=(0,0,0) and G.dot(normal,n)<=0:orientation_bad.append(3*i)
   (selected if pf>0 else back).append(i)
 def proj(ids):
  out=[];valid=[]
  for i in ids:
   t=data['triangles'][i];n=G.cross(G.sub(t[1],t[0]),G.sub(t[2],t[0]))
   if n==(0,0,0):continue
   out.append(tuple((G.dot(p,tangent),p[1]) for p in t));valid.append(i)
  return out,valid
 ft,fi=proj(selected);bt,bi=proj(back);area=area_interval([data['worldTriangles'][i] for i in fi]) if fi else None
 if not ft or not bt:
  return {'placeId':row['placeId'],'sourceId':row['sourceId'],'proofComplete':False,'reason':'original native primary front or opposite member absent; no zero or rear-only fallback','actualFrontTriangleOffsets':[3*i for i in fi],'actualBackTriangleOffsets':[3*i for i in bi],'quantityReference':None}
 pool={p for t in ft+bt for p in t}
 fproof,fb=G.projected_region(ft,pool,X.nonoverlap2);bproof,bb=G.projected_region(bt,pool,X.nonoverlap2)
 domain_equal=bool(fproof['proved'] and bproof['proved'] and fb==bb)
 back_area=area_interval([data['worldTriangles'][i] for i in bi])
 area_overlap=max(area['lower'],back_area['lower'])<=min(area['upper'],back_area['upper'])
 ready=domain_equal and area_overlap and not orientation_bad and area['lower']>0
 front_triangle_evidence=[]
 for i in fi:
  t=data['triangles'][i];wt=data['worldTriangles'][i]
  n=G.cross(G.sub(t[1],t[0]),G.sub(t[2],t[0]));wn=G.cross(G.sub(wt[1],wt[0]),G.sub(wt[2],wt[0]))
  source_normal=tuple(map(F,fragment['vertices'][3*i][3:6]))
  squared=sum(x*x for x in wn)/4;low,high=C.sqrt_bounds(squared)
  front_triangle_evidence.append({'originalSourceIndexOffset':3*i,'originalGeometryVertexIndices':data['indices'][3*i:3*i+3],'preservedSourceFaceNormalClass':source_normal,'actualSourceGeometricDoubleAreaNormal':n,'sourceWindingDotPreservedNormal':G.dot(n,source_normal),'actualWorldGeometricDoubleAreaNormal':wn,'actualWorldTriangleAreaSquaredExact':squared,'actualWorldTriangleAreaInterval':[low,high]})
 raw_comparison=None
 if not ready:
  raw_front=[tuple((G.dot(tuple(map(F,p[:3])),tangent),F(p[1])) for p in fragment['vertices'][3*i:3*i+3]) for i in fi]
  raw_back=[tuple((G.dot(tuple(map(F,p[:3])),tangent),F(p[1])) for p in fragment['vertices'][3*i:3*i+3]) for i in bi]
  raw_front=[t for t in raw_front if G.cross2(*t)!=0];raw_back=[t for t in raw_back if G.cross2(*t)!=0]
  raw_pool={p for t in raw_front+raw_back for p in t}
  rp,rb=G.projected_region(raw_front,raw_pool,X.nonoverlap2);sp,sb=G.projected_region(raw_back,raw_pool,X.nonoverlap2)
  raw_comparison={'frontProjection':rp,'backProjection':sp,'rawPrimaryProjectedDomainsEqual':bool(rp['proved'] and sp['proved'] and rb==sb),'frontMinusBackProjectedAreaBeforeFloat32':rp['area']-sp['area'],'frontMinusBackProjectedAreaAfterFloat32':fproof['area']-bproof['area'],'interpretation':'Different raw source slices may be an intended consequence of a cut through wall thickness; differing slices are not automatically a damaged wall. The accepted paired-domain route is not silently relaxed.'}
 def boundary_hash(boundary):return sha(encode(sorted((a,b,n) for (a,b),n in (boundary or {}).items())))
 return {'placeId':row['placeId'],'sourceId':row['sourceId'],'originalNativeForm':source['form'],'nativeDimensions':source['dimensions'],'recordedCut':cut,'sourceRunId':source['runId'],'sourceRunTangent':tangent,'nativePositiveZMemberDirection':front,'selection':'Pinned source normal class/run frame; never selected from geometry extents.','originalFrontTriangleIndexOffsets':[3*i for i in fi],'allOriginalSelectedFrontTriangleIndexOffsets':[3*i for i in selected],'selectedFrontExactlyZeroAreaTriangleOffsets':[3*i for i in selected if i not in fi],'fullSelectedFrontTriangleEvidence':front_triangle_evidence,'directOneFaceRouteApproved':False,'strongerPairedRouteUnchanged':True,'projectionCoordinateDefinition':'u = dot(original source XYZ, unnormalised original run tangent); v = source Y. Projection measures compare domains only; physical area comes from actual 3D triangle edges.','originalBackTriangleIndexOffsets':[3*i for i in bi],'frontProjectionProof':fproof,'backProjectionProof':bproof,'frontBoundarySha256':boundary_hash(fb),'backBoundarySha256':boundary_hash(bb),'actualPrimaryDomainsCongruentExactly':domain_equal,'unresolvedPreFloat32PrimaryPairComparison':raw_comparison,'actualAffineLinear':data['linear'],'exactAffineDeterminant':data['determinant'],'frontActualIntrinsicAreaInterval':area,'backActualIntrinsicAreaInterval':back_area,'frontBackAreaEnclosuresOverlap':area_overlap,'inconsistentSourceWindingTriangleOffsets':orientation_bad,'proofComplete':ready,'quantityReference':source_quantity(area['lower'],'wall-area') if ready else None,'unresolvedReason':None if ready else 'Both actual native faces are measured separately, but exact paired-domain/area proof does not apply. This can reflect the intended through-thickness cut or captured coordinates; an independent per-front cut-domain reference needs review. No tolerance or equal-slice assumption.','areaCountedOnce':True,'missingCapOrPhysicalClosureInferred':False,'stockOrRuntimeAssigned':False}
def cut_axis_planes(cut):
 out=[(1,F(cut['minY'])),(1,F(cut['maxY']))]
 for a,b in zip(cut['polygon'],cut['polygon'][1:]+cut['polygon'][:1]):
  for uv,axis in ((0,0),(1,2)):
   if a[uv]==b[uv]:out.append((axis,F(P.f32(a[uv]))))
 return out
def baluster_case(row,fragment,cut,data):
 audit,loops,bad=G.boundary_audit(data['triangles']);surface_components,zero=G.components(data['triangles']);planes=cut_axis_planes(cut);matches=collections.Counter();unmatched=0
 refs={p:min(i for i,v in enumerate(data['points']) if v==p) for p in {p for e in bad for p in e}}
 for a,b in bad:
  match=[(axis,c) for axis,c in planes if a[axis]==b[axis]==c]
  if match:matches[str([(axis,float(c)) for axis,c in match])]+=1
  else:unmatched+=1
 loop_evidence=[]
 def segments_intersect(a,b,c,d):
  if any(min(max(a[k],b[k]),max(c[k],d[k]))<max(min(a[k],b[k]),min(c[k],d[k])) for k in (0,1)):return False
  u,v=G.cross2(a,b,c),G.cross2(a,b,d);w,x=G.cross2(c,d,a),G.cross2(c,d,b)
  return u*v<=0 and w*x<=0
 for loop in loops:
  axes=[k for k in range(3) if len({p[k] for p in loop})==1];record={'sourceVertexReferences':[refs[p] for p in loop],'constantCoordinateAxes':axes}
  if len(axes)==1:
   axis=axes[0];other=[k for k in range(3) if k!=axis];uv=[tuple(p[k] for k in other) for p in loop]
   simple=True
   for i in range(len(uv)):
    for j in range(i):
     if j==i-1 or (i==len(uv)-1 and j==0):continue
     if segments_intersect(uv[i],uv[(i+1)%len(uv)],uv[j],uv[(j+1)%len(uv)]):simple=False
   record.update({'capturedCutPlane':loop[0][axis],'simpleExistingPlanarBoundaryProved':simple,'planarBoundaryAreaExact':abs(G.area2(uv))/2,'actualMinimumY':min(p[1] for p in loop),'actualMaximumY':max(p[1] for p in loop)})
  loop_evidence.append(record)
 separation=[]
 for i,a in enumerate(loop_evidence):
  for j,b in enumerate(loop_evidence[:i]):
   separation.append({'loopIndices':[j,i],'positiveYSeparation':max(a['actualMinimumY'],b['actualMinimumY'])-min(a['actualMaximumY'],b['actualMaximumY'])})
 return {'placeId':row['placeId'],'sourceId':row['sourceId'],'constructor':'original accepted baluster-profile LatheGeometry, now independently clipped','sourceData':fragment['sourceData'],'recordedCut':cut,'boundaryAudit':audit,'retainedSourceSurfaceComponents':len(surface_components),'zeroAreaSourceTrianglesExcludedOnlyFromMeasures':zero,'boundaryEdgeReferences':[[refs[a],refs[b]] for a,b in bad],'matchedRecordedCutPlaneBoundaryEdges':sum(matches.values()),'matchedPlaneClasses':dict(matches),'otherUnprovedBoundaryEdges':unmatched,'sourceBoundaryLoops':loop_evidence,'loopYSeparation':separation,'proofComplete':False,'quantityReference':None,'radialReferenceOrWholeOriginalVolumeInherited':False,'smallestReferenceOrRepairProposal':'Review exactly three separate planar closure/reference faces per original baluster, using only these existing recorded guard-cut loops. All 38 boundary edges match the captured cut plane; the loop areas and simple-boundary proofs are given. Preserve every retained source piece, the three separate cut-boundary patches, source triangles/UVs and recorded clearance; do not restore a full lathe, fill between patches or apply a weld tolerance. No closure polygons/triangles are generated. A complete non-self-intersecting cut-remnant quantity proof and source-plane quantization decision still need review.','newCapMeshUVOrOpeningChange':False}
def roof_case(row,fragment,data):
 up=[];down=[];vertical=[]
 for i,t in enumerate(data['worldTriangles']):
  n=G.cross(G.sub(t[1],t[0]),G.sub(t[2],t[0]))
  (up if n[1]>0 else down if n[1]<0 else vertical).append(i)
 ts=[tuple((p[0]+F(row['matrix'][12]),p[2]+F(row['matrix'][14])) for p in data['worldTriangles'][i]) for i in up]
 self_proof=X.nonoverlap2(ts);area=area_interval([data['worldTriangles'][i] for i in up])
 pts=[tuple(p[k]+F(row['matrix'][12+k]) for k in range(3)) for i in up for p in data['worldTriangles'][i]]
 bounds={'min':[min(p[k] for p in pts) for k in range(3)],'max':[max(p[k] for p in pts) for k in range(3)]}
 lowest_up=min(p[1] for i in up for p in data['worldTriangles'][i]);down_below=all(p[1]<=lowest_up for i in down for p in data['worldTriangles'][i])
 self_exposed=self_proof['proved'] and down_below and not vertical
 return {'placeId':row['placeId'],'sourceId':row['sourceId'],'geometryPath':row['geometryPath'],'actualMatrix':row['matrix'],'exactAffineDeterminant':data['determinant'],'upwardWeatherTriangleIndexOffsets':[3*i for i in up],'downwardTriangleIndexOffsetsExcluded':[3*i for i in down],'verticalTriangleIndexOffsetsExcluded':[3*i for i in vertical],'actualUpperSurfaceAreaInterval':area,'roofSelfUpperEnvelopeProved':self_exposed,'ownDownwardFacesAtOrBelowLowestUpperY':down_below,'possibleExposedAreaUpperBound':area['upper'],'provedExposedAreaLowerBound':None,'upperProjectionNonoverlap':self_proof,'actualUpperProjectedArea':sum(abs(G.cross2(*t)) for t in ts)/2,'upperFaceWorldBoundsForContextOnly':bounds,'intentionalUndersideRemovalPreserved':fragment is not None,'proofComplete':False,'exposedWeatherArea':None,'quantityReference':None,'reason':'Actual upper-face/self-overlap evidence supplied; external covering/exposure remains unproved. Metadata candidates below are not area or solid proof.','stairArrivalOrCapChanged':False},ts
def roof_context(roofs):
 folder=ROOT/'assets/art/place-scenes/horticulture';index=load(folder/'index.json');pins={r['id']:r for r in load(MAT/'horticulture-section-pins.json')['sections']}
 roofids={r['sourceId'] for r in roofs};candidates={r['sourceId']:[] for r in roofs};context_pins=[]
 for chunk in index['chunks']:
  path=folder/chunk['url'];raw=path.read_bytes();assert sha(raw)==pins[chunk['id']]['sha256']
  # Existing metadata only: no occluder geometry or global triangle index.
  context_pins.append({'path':path.relative_to(ROOT).as_posix(),'sha256':sha(raw)})
  for part in json.loads(raw)['parts']:
   if part['id'] in roofids:continue
   b=part.get('bounds')
   if not b:continue
   for roof in roofs:
    rb=roof['upperFaceWorldBoundsForContextOnly']
    if F(b['max'][1])<=rb['min'][1]:continue
    if any(min(F(b['max'][k]),rb['max'][k])<=max(F(b['min'][k]),rb['min'][k]) for k in (0,2)):continue
    candidates[roof['sourceId']].append({'renderId':part['id'],'sectionId':chunk['id'],'bounds':b,'geometryId':part['geometry']})
 for roof in roofs:
  found=candidates[roof['sourceId']];roof['coarsePotentialCoveringSourceCount']=len(found)
  roof['coarsePotentialCoveringSourceIdSetSha256']=sha(('\n'.join(sorted(r['renderId'] for r in found))+'\n').encode())
 return {'scope':'Pinned existing descriptor bounds only; possible covers, not actual triangle exposure. No scene geometry reconstructed.','metadataSectionsRead':len(context_pins),'sectionPins':context_pins,'roofCandidates':candidates}
def negatives(oldrows,fragments,datasets):
 sid='replacement/office-door-0/header';row=next(r for r in oldrows if r['sourceId']==sid);data=datasets['administration',sid];cut=next(c for c in PLANS['administration']['cutVolumes'] if c['id']=='admin-office-partition-0/opening')
 original=G.rectangular_reference(data['triangles'],cut,P.f32,X.nonoverlap2);assert original['proved']
 omitted=G.rectangular_reference(data['triangles'][1:],cut,P.f32,X.nonoverlap2);assert not omitted['proved']
 wall=next(r for r in oldrows if r['sourceId']=='replacement/office-partition-0-tier-0:1:5/wall-1');wd=datasets['administration',wall['sourceId']]
 ft=[tuple((p[2]*12,p[1]) for p in wd['triangles'][i]) for i in (8,9,10)];bt=[tuple((p[2]*12,p[1]) for p in wd['triangles'][i]) for i in (11,12,13)]
 pool={p for t in ft+bt for p in t};fp,fb=G.projected_region(ft,pool,X.nonoverlap2);bp,bb=G.projected_region(bt,pool,X.nonoverlap2)
 assert fp['proved'] and bp['proved'] and fb==bb
 missing,mb=G.projected_region(ft[1:],pool,X.nonoverlap2);assert mb!=bb
 duplicate,_=G.projected_region(ft+[ft[0]],pool,X.nonoverlap2);assert not duplicate['proved']
 return [{'control':'original header missing retained face triangle','result':'REJECT_RECTANGULAR_REFERENCE','meshOrIndexWritten':False},{'control':'native primary triangle omitted, opposite member kept','result':'REJECT_PRIMARY_DOMAIN_PAIR','meshOrIndexWritten':False},{'control':'native primary source triangle counted twice','result':'REJECT_PROJECTION_NONOVERLAP','meshOrIndexWritten':False}]
def build():
 preserved=preserve();pins=producer_pins();rows=load(PRIOR/'scope-ledger.json')['records'];assert len(rows)==194
 fragments=P.frozen_json_constant('assets/art/exploration-access/fragments.js','SOURCE_FRAGMENTS=')
 global PLANS
 PLANS=P.frozen_json_constant('assets/art/exploration-access/plans.js','ACCESS_PLANS=freeze(')
 fr={(place,p['id']):p for place,parts in fragments.items() for p in parts}
 metadata={p:load(ROOT/('assets/art/exposition-'+p+'/metadata.json')) for p in ('administration','horticulture')}
 actual,sectionpins=P.actual_descriptors(rows);cases={c['id']:c for c in load(READY/'geometry-cases.json')['cases']}
 boxes=[];walls=[];balusters=[];roofs=[];roofproj=[];ledger=[];datasets={}
 for row in rows:
  key=row['placeId'],row['sourceId'];fragment=fr.get(key);data=source_geometry(row,fragment);datasets[key]=data
  if row['quantityRecipe']=='weather-area':
   cert,projection=roof_case(row,fragment,data);roofs.append(cert);roofproj.append(projection);kind='roof'
  else:
   reason=row['recordedCutReasons'][0];cut=next(c for c in PLANS[row['placeId']]['cutVolumes'] if c['id']==reason)
   if row['quantityRecipe']=='wall-area':cert=wall_case(row,fragment,metadata[row['placeId']],data,cut);walls.append(cert);kind='wall'
   elif row['originalSourceConstructor']=='BoxGeometry':cert=box_case(row,fragment,cut,data);boxes.append(cert);kind='box'
   else:cert=baluster_case(row,fragment,cut,data);balusters.append(cert);kind='clipped-baluster'
  previously_accepted=row['placeId']=='administration' and row['sourceId'] in P.SELECTED
  if previously_accepted:assert cert['proofComplete']
  ledger.append({'placeId':row['placeId'],'sourceId':row['sourceId'],'sectionId':row['sectionId'],'geometryPath':row['geometryPath'],'geometrySha256':row['geometrySha256'],'sourceRange':row['sourceRange'],'originalMatrix':row['matrix'],'exactAffineDeterminant':data['determinant'],'familyId':row['familyId'],'recipe':row['quantityRecipe'],'certificateKind':kind,'proofComplete':cert['proofComplete'],'previousExactReferenceAccepted':previously_accepted,'status':'previous-exact-reference-accepted' if previously_accepted else 'source-proof-complete-for-review' if cert['proofComplete'] else 'unresolved-withheld','originalStrictFactsPreserved':cases[row['baseCaseId']]['facts'],'radialRuleInherited':False,'geometryOrStockOrRuntimeAssigned':False})
 assert len(boxes)==63 and len(walls)==126 and len(roofs)==3 and len(balusters)==2
 oldheader=next(r for r in boxes if r['sourceId']==P.SELECTED[0]);assert oldheader['referenceVolumeExact']==F(6926928393,2199023255552)
 oldwall=next(r for r in walls if r['sourceId']==P.SELECTED[1]);assert oldwall['frontActualIntrinsicAreaInterval']['lower']==F(173015,131072)
 pairs=[]
 for i,a in enumerate(roofproj):
  for j,b in enumerate(roofproj[:i]):
   overlap=any(X.overlap2(x,y) for x in a for y in b);pairs.append({'roofSources':[roofs[j]['sourceId'],roofs[i]['sourceId']],'positiveProjectedOverlapAmongTheseUpperPatches':overlap})
 context=roof_context(roofs);negative=negatives(rows,fr,datasets)
 rear=next(r for r in roofs if r['sourceId']=='rear-curtain-roof');assert rear['downwardTriangleIndexOffsetsExcluded']
 duplicate_roof=X.nonoverlap2(roofproj[0]+[roofproj[0][0]]);assert not duplicate_roof['proved']
 negative += [{'control':'original roof underside faces requested as weather area','result':'REJECT_DOWNWARD_NORMALS','originalDownwardOffsets':rear['downwardTriangleIndexOffsetsExcluded'],'meshOrIndexWritten':False},{'control':'one original upper roof triangle counted twice','result':'REJECT_UPPER_PROJECTION_OVERLAP','meshOrIndexWritten':False}]
 complete=sum(r['proofComplete'] for r in ledger);accepted=sum(r['previousExactReferenceAccepted'] for r in ledger)
 summary={'version':1,'result':'PASS','authorityCommit':AUTHORITY,'scopeCases':194,'cutBoxes':63,'cutBoxProofsComplete':sum(r['proofComplete'] for r in boxes),'nativePrimaryFaces':126,'nativePrimaryProofsComplete':sum(r['proofComplete'] for r in walls),'previousAcceptedExactReferences':accepted,'totalSourceProofsCompleteIncludingPrevious':complete,'newSourceProofsCompleteForReview':complete-accepted,'unresolvedCases':194-complete,'weatherRoofsExposureWithheld':3,'clippedBalustersSeparateWithheld':2,'negativeControls':len(negative),'originalTargetedSections':len(sectionpins),'roofMetadataOnlySections':context['metadataSectionsRead'],'priorPayloadAndPackageFilesPreserved':preserved,'originalGeometryInputsPreserved':1572,'rawStrictProofsChanged':0,'sourceArraysScaleOpeningsCapsUVsChanged':0,'actualStockBindingsSupportsRuntimeExports':0,'factoriesRenderersBuildsRetainedHelpers':0}
 return {'input-pins.json':{'version':1,'authorityCommit':AUTHORITY,'authoritySha256':sha((HERE/'authority-6d818100.md').read_bytes()),'parentArtistCommit':PARENT,'frozenOriginalSourceContext':FROZEN,'sourceProducerPins':pins,'targetedOriginalSections':sectionpins},'case-ledger.json':{'version':1,'meaning':'Proof readiness is source-measurement evidence for review; no new runtime/stock approval. Prior exact two references retain their recorded acceptance.','cases':ledger},'box-certificates.json':{'version':1,'cases':boxes},'wall-face-certificates.json':{'version':1,'cases':walls},'roof-area-exposure-review.json':{'version':1,'cases':roofs,'threeRoofUpperProjectionPairs':pairs},'roof-possible-cover-context.json':{'version':1,**context},'clipped-baluster-proposals.json':{'version':1,'cases':balusters},'negative-controls.json':{'version':1,'controls':negative},'check-results.json':summary}
if __name__=='__main__':
 parser=argparse.ArgumentParser(description=__doc__);parser.add_argument('--save-review',action='store_true');args=parser.parse_args()
 if not args.save_review:
  def readonly(event,args):
   if event=='open' and (any(c in (args[1] or '') for c in 'wax+') or (args[2] or 0)&(os.O_WRONLY|os.O_RDWR|os.O_CREAT|os.O_TRUNC|os.O_APPEND)):raise PermissionError('Source batch checker refuses writes')
   if event in {'os.remove','os.rename','os.mkdir','os.rmdir','os.truncate','os.utime','os.chmod'}:raise PermissionError('Source batch checker refuses mutation')
  sys.addaudithook(readonly)
 outputs=build()
 for name,value in outputs.items():
  raw=encode(value)
  if args.save_review:(HERE/name).write_bytes(raw)
  else:assert (HERE/name).read_bytes()==raw,'Batch evidence differs: '+name
 if not args.save_review and (HERE/'review-package.json').exists():
  for row in load(HERE/'review-package.json')['files']:
   raw=(ROOT/row['path']).read_bytes();assert len(raw)==row['bytes'] and sha(raw)==row['sha256']
 print(json.dumps(outputs['check-results.json'],sort_keys=True))
