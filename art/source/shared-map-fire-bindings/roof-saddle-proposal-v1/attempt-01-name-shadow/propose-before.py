"""One unapproved roof-saddle profile and bounded classification of twenty frozen obstructions."""
from pathlib import Path
from fractions import Fraction as F
import argparse,collections,copy,hashlib,importlib.util,json,math,subprocess,sys
sys.dont_write_bytecode=True
HERE=Path(__file__).resolve().parent;ROOT=HERE.parents[3]
PARENT='11f0a153e02ed0ad68673e5b3403497941308d6d'
AUTHORITY='8263a876cfa911c8a11b72fdfd3328a295039fa2'
TABLE='art/source/shared-map-fire-bindings/coverage-family-proposal-v1/separate-parapet-gap-design.json'
TABLE_SHA='481294255d3afd8dd0ea208d2dc0cc1c7adf1f2e6108e5929a0e887bbb1abfa4'
BASE='assets/art/shared-map-fire-bindings/new-york-complete-v1.json'
BASE_SHA='407c0f8bd582f8d95b9ade1471cd51892ac7b9a40fd2c005696bcc5485991eba'
FRONT='assets/art/shared-map-support-additions/new-york-parapet-blocking-v1/index.json'
FRONT_SHA='a5a34f18a4d18b5a316096edf58b941e727a7546e544636a5a29469bc5c5b1c2'
ROOF='carrier/roof/rear-tail'
ROOF_SHA='9f3ed10d083a5a52c316b83f1579e4fa6148e3b4974b5d7969257d3beddf6669'
DIRECTORY=HERE.relative_to(ROOT).as_posix()
GEOMETRY=DIRECTORY+'/geometry/proposed-saddle.json'
PROPOSAL=DIRECTORY+'/source-proposal.json'
def mod(name,p):
 s=importlib.util.spec_from_file_location(name,ROOT/p);m=importlib.util.module_from_spec(s);s.loader.exec_module(m);return m
G=mod('saddle_original_measures','art/source/shared-map-fire-bindings/export.py')
def digest(b):return hashlib.sha256(b).hexdigest()
def sha(p):return digest((ROOT/p).read_bytes())
def read(p):return json.loads((ROOT/p).read_text(encoding='utf-8'))
def encode(a):return (json.dumps(a,indent=2,sort_keys=True)+'\n').encode()
def rational(q):
 q=F(q);return {'numerator':str(q.numerator),'denominator':str(q.denominator)}
def xyz(p):return [F(x) for x in p]
def cross(a,b):return [a[1]*b[2]-a[2]*b[1],a[2]*b[0]-a[0]*b[2],a[0]*b[1]-a[1]*b[0]]
def sub(a,b):return [x-y for x,y in zip(a,b)]
def dot(a,b):return sum(x*y for x,y in zip(a,b))
def height_plane(t):
 a,b,c=[xyz(p) for p in t];n=cross(sub(b,a),sub(c,a));assert n[1]!=0
 return (-n[0]/n[1],-n[2]/n[1],dot(n,a)/n[1])
def height(plane,x,z):return plane[0]*x+plane[1]*z+plane[2]
def area_xz(poly):return abs(sum(a[0]*b[2]-a[2]*b[0] for a,b in zip(poly,poly[1:]+poly[:1])))/2 if len(poly)>2 else F(0)
def clip_footprint(triangle,box):
 poly=[xyz(p) for p in triangle]
 for axis in [0,2]:
  for sign,key in [(1,'min'),(-1,'max')]:
   boundary=F(box[key][axis]);before=poly;poly=[]
   if not before:return []
   for a,b in zip(before,before[1:]+before[:1]):
    da,db=sign*(a[axis]-boundary),sign*(b[axis]-boundary);inside_a,inside_b=da>=0,db>=0
    if inside_a:poly.append(a)
    if inside_a!=inside_b:
     q=da/(da-db);poly.append([a[k]+q*(b[k]-a[k]) for k in range(3)])
 return poly
def geometry_ref(binding):
 return {**{k:binding.get(k) for k in ['partId','sourcePartId','geometryId','geometryPath','matrix','sourceRange']},'sha256':sha(binding['geometryPath'])}
def inputs():
 for p,h in [(TABLE,TABLE_SHA),(BASE,BASE_SHA),(FRONT,FRONT_SHA)]:assert sha(p)==h,'Frozen input changed: '+p
 table,base,front=read(TABLE),read(BASE),read(FRONT);by={c['id']:c for c in base['carriers']}
 binding=by[ROOF]['renderBindings'][0];assert sha(binding['geometryPath'])==ROOF_SHA
 roof_mesh=read(binding['geometryPath']);roof=G.triangles(roof_mesh,binding['matrix'],binding.get('sourceRange'))
 rows={c['proposalId']:c for f in table['families'] for c in f['candidates'] if not c['rectangularRepeatReadyForApproval']}
 assert len(rows)==20 and set(rows)=={o['candidateId'] for o in table['obstructions']}
 return table,base,front,by,rows,roof
def classify(table,by,rows,roof):
 records=[];internal={};obstructions={o['candidateId']:o for o in table['obstructions']}
 for identity,row in sorted(rows.items()):
  patches=[]
  for number,t in enumerate(roof):
   if cross(sub(xyz(t[1]),xyz(t[0])),sub(xyz(t[2]),xyz(t[0])))[1]<=0:continue
   poly=clip_footprint(t,row['bounds'])
   if area_xz(poly)>0:patches.append({'number':number,'polygon':poly,'plane':height_plane(t)})
  assert patches
  planes={p['plane'] for p in patches};assert len(planes)==1
  footprint=(F(row['bounds']['max'][0])-F(row['bounds']['min'][0]))*(F(row['bounds']['max'][2])-F(row['bounds']['min'][2]))
  assert sum(area_xz(p['polygon']) for p in patches)==footprint
  captured=obstructions[identity]['collisions'];assert len(captured)==1 and captured[0]['originalCarrierId']==ROOF
  old=captured[0]['separateRoofSaddleAlternative'];assert [p['number'] for p in patches]==[p['sourceTriangle'] for p in old['sourceUpperRoofPatches']]
  low=min(v[1] for p in patches for v in p['polygon']);high=max(v[1] for p in patches for v in p['polygon']);top=F(row['bounds']['max'][1]);gap=top-high
  assert gap>0 and abs(float(high)-old['roofSurfaceYRangeMetres'][1])<1e-12
  record={'sourceProposalId':identity,'axis':row['axis'],'originalBayIntervalMetres':row['bayIntervalMetres'],'originalBounds':row['bounds'],
   'originalLowerCorniceId':row['lowerSourceCarrierId'],'upperParapetId':row['upperSourceCarrierId'],'proposedRoofParentId':ROOF,
   'class':'rear-slope-crossing-triangulation-seam' if len(patches)==2 else ('rear-slope-single-facet' if patches[0]['number'] in [2,3] else ('east-hip' if patches[0]['number']==5 else 'west-hip')),
   'actualRoofSourceTriangles':[p['number'] for p in patches],'sourcePatchCount':len(patches),'roofHeightRangeMetres':[float(low),float(high)],
   'minimumRemainingToEnvelopeTopMetres':float(gap),'minimumRemainingToEnvelopeTopExact':rational(gap),
   'minimumRemainingToActualParapetUndersideMetres':float(F(by[row['upperSourceCarrierId']]['physicalBounds']['min'][1])-high),
   'capturedOriginalClearanceEvidence':copy.deepcopy(old),'capturedOriginalIntersection':copy.deepcopy(captured[0]['actualCommonInterior']),
   'actualClippedRoofPatches':[{'sourceTriangle':p['number'],'polygonMetres':[[float(q) for q in v] for v in p['polygon']],'polygonExact':[[rational(q) for q in v] for v in p['polygon']],'projectedAreaExact':rational(area_xz(p['polygon']))} for p in patches],
   'proposedBearingPath':'retained local cornice patch plus separately proposed actual roof patch -> fitted body -> unchanged upper parapet contact',
   'perInstanceProfileAuthored':False,'perInstanceAcceptance':False,
   'remainingUnproved':'No per-instance closed fitting, conservative rounding, UV, volume, all-source exclusion or fresh native contact accepted for this row; a shared plane class is not acceptance.'}
  records.append(record);internal[identity]={'row':row,'patches':patches,'plane':next(iter(planes)),'clearance':gap}
 chosen=min(internal,key=lambda k:(internal[k]['clearance'],-len(internal[k]['patches']),k))
 for r in records:
  if r['sourceProposalId']==chosen:r.update(perInstanceProfileAuthored=True,remainingUnproved='One source prototype and finite checks only; new roof bearing, runtime ports, load interpretation and damage behavior need separate review.')
 return {'version':1,'status':'BOUNDED_CLASSIFICATION_NOT_TWENTY_ASSET_EXPORT','sourceTablePath':TABLE,'sourceTableSha256':TABLE_SHA,'obstructedRows':20,'authoredProfiles':1,
  'selectionRule':'Least exact remaining thickness to the frozen envelope top; ties choose most intersected actual source triangles, then lexicographic proposal ID. Exact captured binary64 inputs are rationalized for ranking, not snapped.',
  'selectedSourceProposalId':chosen,'classCounts':dict(collections.Counter(r['class'] for r in records)),'records':records},internal[chosen]
def actual_point(local,m):return G.point(local,m)
def ceil_local(axis,target,m):
 # Round only the NEW cut vertex conservatively. Never move an old source.
 world=float(target)
 if F(world)<target:world=math.nextafter(world,math.inf)
 value=float((F(world)-F(m[12+axis]))/F(m[axis*5]));steps=0
 def emitted(q):
  p=[0.,0.,0.];p[axis]=q;return F(actual_point(p,m)[axis])
 while emitted(value)<target:
  value=math.nextafter(value,math.inf);steps+=1;assert steps<4096
 return value,{'targetWorldExact':rational(target),'emittedWorldExact':rational(emitted(value)),'outwardLocalNextafterSteps':steps,'worldExcessExact':rational(emitted(value)-target)}
def outward_faces(vertices,faces):
 centre=[sum(v[k] for v in vertices)/len(vertices) for k in range(3)];out=[]
 for f in faces:
  t=[vertices[i] for i in f[:3]];n=G.cross(G.sub(t[1],t[0]),G.sub(t[2],t[0]));fc=[sum(vertices[i][k] for i in f)/len(f) for k in range(3)]
  out.append(list(reversed(f)) if G.dot(n,G.sub(fc,centre))<0 else f)
 return out
def solid_volume(vertices,index):
 points=[xyz(p) for p in vertices];origin=points[0]
 return sum(dot(sub(points[a],origin),cross(sub(points[b],origin),sub(points[c],origin))) for a,b,c in zip(index[::3],index[1::3],index[2::3]))/6
def mesh():
 table,base,front,by,rows,roof=inputs();classification,selected=classify(table,by,rows,roof);row=selected['row'];plane=selected['plane'];m=row['matrix']
 assert row['axis']=='x' and plane[0]==0 and plane[1]<0
 low,top=F(row['bounds']['min'][1]),F(row['bounds']['max'][1]);near,far=F(row['bounds']['min'][2]),F(row['bounds']['max'][2])
 crease=(low-plane[2])/plane[1];assert near<crease<far
 near_y=height(plane,F(row['matrix'][12]),near);assert low<near_y<top
 zcut,z_round=ceil_local(2,crease,m);ynear,y_round=ceil_local(1,near_y,m)
 yz=[(ynear,-.5),(-.5,zcut),(-.5,.5),(.5,.5),(.5,-.5)]
 local=[[x,y,z] for x in [-.5,.5] for y,z in yz];world=[actual_point(p,m) for p in local]
 faces=outward_faces(world,[list(range(5)),list(range(5,10))]+[[i,(i+1)%5,(i+1)%5+5,i+5] for i in range(5)])
 index=[v for f in faces for i in range(1,len(f)-1) for v in [f[0],f[i],f[i+1]]];assert len(index)==48
 corner_uv=[];triangle_normals=[];face_records=[]
 for face_number,face in enumerate(faces):
  a,b,c=[world[i] for i in face[:3]];u=G.sub(b,a);un=math.sqrt(G.dot(u,u));u=[q/un for q in u];normal=G.cross(G.sub(b,a),G.sub(c,a));nn=math.sqrt(G.dot(normal,normal));normal=[q/nn for q in normal];v=G.cross(normal,u)
  for i in range(1,len(face)-1):
   triangle=[face[0],face[i],face[i+1]]
   for k in triangle:
    d=G.sub(world[k],a);corner_uv.extend([G.dot(d,u),G.dot(d,v)])
   triangle_normals.extend(normal)
  face_records.append({'face':face_number,'vertices':face,'normal':normal,'uvBasisU':u,'uvBasisV':v,'uvOriginWorld':a})
 geometry={'attributes':{'position':{'itemSize':3,'type':'Float64Array','normalized':False,'array':[q for v in local for q in v]}},'index':{'type':'Uint16Array','array':index},
  'perCornerUV':{'itemSize':2,'unit':'metres','array':corner_uv},'perTriangleNormal':{'itemSize':3,'array':triangle_normals},'faces':face_records,
  'physicalTopology':'Ten shared indexed vertices, sixteen outward triangles; UV corners are separate data and do not split the physical solid.',
  'authoringPrecision':'Double-precision source proposal only. Runtime buffer quantization and physical port generation are not assessed.'}
 volume=solid_volume(world,index);width=F(row['bounds']['max'][0])-F(row['bounds']['min'][0]);reference=width*((far-near)*(top-low)-(near_y-low)*(crease-near)/2)
 assert 0<volume<=reference
 raw=encode(geometry);geometry_ref={'path':GEOMETRY,'sha256':digest(raw),'triangleCount':16,'vertexCount':10}
 identity=row['proposalId'].replace('proposal-only/blocking/','proposal-only/roof-saddle/',1);parents=[row['lowerSourceCarrierId'],ROOF,row['upperSourceCarrierId']]
 refs={cid:[geometry_ref(b) for b in by[cid]['renderBindings'] if b['physicalContribution']=='carrier-solid'] for cid in parents}
 proposal={'version':1,'status':'UNAPPROVED_SINGLE_SOURCE_PROTOTYPE','authorityCommit':AUTHORITY,'placeId':'new-york','sourceTable':{'path':TABLE,'sha256':TABLE_SHA},
  'baseBindings':{'path':BASE,'sha256':BASE_SHA},'appearanceSource':copy.deepcopy(front['appearanceSource']),'geometry':geometry_ref,
  'members':[{'id':identity,'sourceProposalId':row['proposalId'],'matrix':copy.deepcopy(m),'bounds':G.bounds(G.triangles(geometry,m)),'appearanceMaterialId':front['appearanceSource']['materialId'],
   'geometryId':geometry_ref['sha256'],'roleProposal':'timber-fitting','fuelAssigned':False,'canonicalStockAssigned':False,'anchors':[],'groundAnchor':False}],
  'originalEnvelope':{'geometry':front['geometry'],'matrix':row['matrix'],'bounds':row['bounds'],'unchangedUpperNativeBearing':row['actualUpperNativeBearing'],'oldLowerCorniceNativeBearing':row['actualLowerNativeBearing']},
  'namedOriginalParents':refs,'proposedContacts':[{'child':identity,'parent':row['lowerSourceCarrierId'],'meaning':'Retained outer flat underside on reduced original cornice patch; local source interpretation only.','accepted':False},
   {'child':identity,'parent':ROOF,'meaning':'NEW proposed sloping roof bearing, on actual source triangles '+','.join(str(p['number']) for p in selected['patches'])+'; not an approved joint or anchor.','accepted':False},
   {'child':row['upperSourceCarrierId'],'parent':identity,'meaning':'Preserve entire original upper footprint, plane and captured separation.','accepted':False}],
  'notRuntimeAssetExport':True,'newRuntimeStock':0,'newGroundAnchors':0,'otherNineteenProfilesExported':0,'placementChangesRequired':[],
  'modularInterface':{'stockCellSizeXYZMetres':[1,2.12,1],'originalOneMetreBay':row['bayIntervalMetres'],'originalEnvelopeDimensionsMetres':[.16,.20999999821185966,.16],'pivot':'Original normalized-box centre and original matrix.','rotationAndMirroring':'Only this measured source pose is proposed; no other placements are authorized.','connections':'Reduced cornice patch + separately proposed roof patch below; original complete parapet footprint above.'}}
 math_report={'version':1,'selectedSourceProposalId':row['proposalId'],'roofHeightPlaneXZ':{'xCoefficient':rational(plane[0]),'zCoefficient':rational(plane[1]),'constant':rational(plane[2])},
  'referenceCut':'Intersection of frozen rectangular envelope with y >= actual rear-roof plane. Piecewise underside retains the original outer horizontal cornice foot.',
  'referenceCreaseZExact':rational(crease),'referenceNearRoofYExact':rational(near_y),'newCutVertexRounding':{'creaseZ':z_round,'nearRoofY':y_round,'onlyNewVerticesRounded':True,'oldGeometrySnappedOrMoved':False,'nativeToleranceMetres':1e-5},
  'referenceExactCutVolumeMetresCubed':rational(reference),'actualEmittedClosedSolidVolumeExactMetresCubed':rational(volume),'actualEmittedClosedSolidVolumeMetresCubed':float(volume),
  'emittedMinusReferenceVolumeExact':rational(volume-reference),'minimumRemainingThicknessMetres':float(top-F(world[0][1])),
  'proposedFrameQuantity':{'status':'SEPARATE_UNAPPROVED_QUANTITY_NOT_CANONICAL_STOCK','unit':'prototype-fuel-unit','recipe':'Actual closed emitted volume / binary64 .12, using the existing frame fitting convention.','unroundedExact':rational(volume/F(.12)),'unroundedApproximate':float(volume/F(.12)),'sixDecimalPrototypeProposal':round(float(volume/F(.12)),6),'assignedRuntimeStock':0},
  'originalUpperBearing':row['actualUpperNativeBearing'],'sourceRoofTriangles':[p['number'] for p in selected['patches']],'sourceRoofCoordinateClosure':'Six exact-coordinate vertices and eight triangles; opposed coordinate edges close without tolerance welding. Original nonindexed source layout is unchanged.',
  'prototypeClosure':'Actual ten-vertex shared indexed physical solid; checked independently from any tolerance-based measurement closure.'}
 return classification,proposal,geometry,math_report
def build():
 classification,proposal,geometry,math_report=mesh()
 authority_path='docs/engineering/shared-maps/roof-saddle-proposal-brief.md';authority=subprocess.check_output(['git','show',AUTHORITY+':'+authority_path],cwd=ROOT)
 return {DIRECTORY+'/classification.json':encode(classification),PROPOSAL:encode(proposal),GEOMETRY:encode(geometry),DIRECTORY+'/mathematical-evidence.json':encode(math_report),DIRECTORY+'/authority-8263a876.md':authority}
if __name__=='__main__':
 p=argparse.ArgumentParser(description=__doc__);p.add_argument('--check',action='store_true');args=p.parse_args();outputs=build()
 for path,data in outputs.items():
  target=ROOT/path
  if args.check:assert target.read_bytes()==data,'Non-reproducing proposal: '+path
  else:target.parent.mkdir(parents=True,exist_ok=True);target.write_bytes(data)
 print(json.dumps({'result':'PASS_SOURCE_PROPOSAL','outputs':len(outputs),'prototypes':1,'classifiedObstructions':20,'selected':json.loads(outputs[DIRECTORY+'/classification.json'])['selectedSourceProposalId'],'geometrySha256':digest(outputs[GEOMETRY]),'runtimeInstalled':False}))
