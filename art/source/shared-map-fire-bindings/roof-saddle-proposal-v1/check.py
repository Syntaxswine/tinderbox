"""Independent exact-topology, separation, bearing and rejecting controls for one proposal."""
from pathlib import Path
from fractions import Fraction as F
import argparse,collections,copy,hashlib,importlib.util,json,math,subprocess,sys
sys.dont_write_bytecode=True
HERE=Path(__file__).resolve().parent;ROOT=HERE.parents[3]
def mod(name,path):
 s=importlib.util.spec_from_file_location(name,path);m=importlib.util.module_from_spec(s);s.loader.exec_module(m);return m
P=mod('saddle_producer',HERE/'propose.py');C=mod('saddle_contact_measures',HERE.parent/'coverage-family-proposal-v1/geometry.py')
D=mod('accepted_native_contexts',HERE.parent/'parapet-clear-blocking-v1/dependency-context.py')
def points(mesh,m):return [P.G.point(mesh['attributes']['position']['array'][i:i+3],m) for i in range(0,len(mesh['attributes']['position']['array']),3)]
def topology(vertices,index):
 edges=collections.Counter();used=set(index);neighbors={i:set() for i in used}
 for a,b,c in zip(index[::3],index[1::3],index[2::3]):
  for x,y in [(a,b),(b,c),(c,a)]:edges[x,y]+=1;neighbors[x].add(y);neighbors[y].add(x)
 assert all(x!=y and n==1 and edges[y,x]==1 for (x,y),n in edges.items()),'physical closure: actual shared indexed edges must pair with opposite winding'
 unseen=set(used);components=[]
 while unseen:
  seed=min(unseen);group={seed};todo=[seed]
  for node in todo:
   for q in neighbors[node]:
    if q not in group:group.add(q);todo.append(q)
  unseen-=group;components.append(sorted(group))
 return {'components':components,'vertices':len(vertices),'edges':len(edges)//2,'triangles':len(index)//3,'euler':len(vertices)-len(edges)//2+len(index)//3}
def validate(vertices,index,envelope,plane):
 facts=topology(vertices,index)
 assert len(facts['components'])==1,'disconnected candidate: no continuous material body'
 assert P.solid_volume(vertices,index)>0,'outward orientation: nonpositive solid'
 for v in vertices:
  assert all(F(envelope['min'][k])<=F(v[k])<=F(envelope['max'][k]) for k in range(3)),'outside original envelope'
  assert F(v[1])>=P.height(plane,F(v[0]),F(v[2])),'intersecting candidate: vertex below actual global roof support plane'
 return facts
def main():
 parser=argparse.ArgumentParser(description=__doc__);parser.add_argument('--record',action='store_true');args=parser.parse_args()
 table,base,front,by,rows,roof=P.inputs();a=P.read(P.PROPOSAL);mesh=P.read(P.GEOMETRY);classification=P.read(P.DIRECTORY+'/classification.json');maths=P.read(P.DIRECTORY+'/mathematical-evidence.json')
 row=rows[classification['selectedSourceProposalId']];m=a['members'][0]['matrix'];vs=points(mesh,m);index=mesh['index']['array'];plane=P.height_plane(roof[2]);checks=collections.Counter()
 def check(ok,label):assert ok,label;checks[label.split(':')[0]]+=1
 for path,raw in P.build().items():check((ROOT/path).read_bytes()==raw,'determinism: '+path)
 check(len(a['members'])==1 and a['status']=='UNAPPROVED_SINGLE_SOURCE_PROTOTYPE' and a['newRuntimeStock']==a['newGroundAnchors']==a['otherNineteenProfilesExported']==0,'scope: exactly one proposal, no stock or anchors')
 check(len(list((HERE/'geometry').glob('*.json')))==1 and a['members'][0]['sourceProposalId']==row['proposalId'],'scope: no twenty-profile export')
 check(m==row['matrix'] and a['originalEnvelope']['bounds']==row['bounds'] and P.G.bounds(P.G.triangles(mesh,m))==row['bounds'],'placement: original matrix and occupied bounds retained')
 facts=validate(vs,index,row['bounds'],plane)
 check(facts=={'components':[list(range(10))],'vertices':10,'edges':24,'triangles':16,'euler':2},'physical: true indexed sphere topology, one connected closed body')
 for tri in zip(index[::3],index[1::3],index[2::3]):
  t=[P.xyz(vs[i]) for i in tri];n=P.cross(P.sub(t[1],t[0]),P.sub(t[2],t[0]));check(P.dot(n,n)>0,'orientation: nondegenerate source triangle')
  # Convexity is verified against exact emitted binary64 coordinates.
  check(all(P.dot(n,P.sub(P.xyz(v),t[0]))<=0 for v in vs),'convexity: every vertex inside each actual outward face plane')
 check(all(F(v[1])<=P.height(plane,F(v[0]),F(v[2])) for t in roof for v in t),'separation: roof entirely below the unchanged support plane')
 margins=[F(v[1])-P.height(plane,F(v[0]),F(v[2])) for v in vs]
 check(min(margins)>=0,'separation: actual emitted fitting entirely above the same plane, no hidden penetration')
 check(P.solid_volume(vs,index)>0 and float(P.solid_volume(vs,index))==maths['actualEmittedClosedSolidVolumeMetresCubed'],'quantity: actual closed emitted volume')
 check(maths['proposedFrameQuantity']['sixDecimalPrototypeProposal']==.04012 and maths['proposedFrameQuantity']['assignedRuntimeStock']==0,'quantity: separate proposed measured quantity only')
 # Original roof coordinate closure is recorded separately from its unchanged nonindexed layout.
 roof_edges=collections.Counter((tuple(x),tuple(y)) for t in roof for x,y in zip(t,t[1:]+t[:1]))
 check(all(n==roof_edges[y,x] for (x,y),n in roof_edges.items()),'reference: exact-coordinate source roof closure without tolerance welding')
 check(len(set(tuple(v) for t in roof for v in t))==6,'reference: six original roof coordinates, unchanged eight facets')
 # Three actual parent geometries only; no world/native graph is created.
 identity=a['members'][0]['id'];local=copy.copy(by);local[identity]={'id':identity,'physicalBounds':row['bounds'],'renderBindings':[{'partId':identity,'sourcePartId':identity,'geometryId':a['geometry']['sha256'],'geometryPath':P.GEOMETRY,'matrix':m,'sourceRange':None,'physicalContribution':'carrier-solid'}]}
 geometry=C.Geometry(local);bottom=geometry.face(identity,row['lowerSourceCarrierId'],require_bearing=True);top=geometry.face(row['upperSourceCarrierId'],identity,require_bearing=True)
 check(bottom and bottom['actualFaceAreaMetresSquared']>0,'cornice-bearing: actual retained horizontal source face')
 check(top and abs(top['actualFaceAreaMetresSquared']-row['actualUpperNativeBearing']['actualFaceAreaMetresSquared'])<1e-12,'upper-bearing: full unchanged upper contact area')
 check(top['witnessSeparationMetres']==row['actualUpperNativeBearing']['witnessSeparationMetres'],'upper-bearing: original captured separation retained')
 roof_shape=geometry.shape(P.ROOF)
 check(set(geometry.shapes)=={identity,row['lowerSourceCarrierId'],row['upperSourceCarrierId'],P.ROOF},'scope: source body/bearing measures only one prototype and three named parents')
 # Sloping underside is face for polygon edge 0 -> 1. Verify its four real emitted corners.
 undersides=[0,1,5,6]
 # Put corners in boundary order, matching the actual shared underside face.
 actual_roof_face=next(f['vertices'] for f in mesh['faces'] if set(f['vertices'])==set(undersides))
 actual_poly=[P.xyz(vs[i]) for i in actual_roof_face];source_poly=[[p[0],P.height(plane,p[0],p[2]),p[2]] for p in actual_poly]
 projected=P.area_xz(source_poly);check(projected>0,'roof-bearing: positive actual source patch projection')
 gaps=[p[1]-q[1] for p,q in zip(actual_poly,source_poly)];check(min(gaps)>=0 and max(gaps)<F(1e-5),'roof-bearing: all actual face corners above roof and within unchanged native precision')
 nx,ny,nz=P.cross(P.sub(P.xyz(roof[2][1]),P.xyz(roof[2][0])),P.sub(P.xyz(roof[2][2]),P.xyz(roof[2][0])))
 source_area=float(projected)*math.sqrt(float(nx*nx+ny*ny+nz*nz))/abs(float(ny))
 # Piece is convex and has positive remaining thickness. An interior vertical material segment reaches the full top.
 x=sum(p[0] for p in actual_poly)/4;z=sum(p[2] for p in actual_poly)/4
 n=P.cross(P.sub(actual_poly[1],actual_poly[0]),P.sub(actual_poly[2],actual_poly[0]));lower=(P.dot(n,actual_poly[0])-n[0]*x-n[2]*z)/n[1];upper=F(row['bounds']['max'][1])
 check(upper-lower>F(.148),'material-path: positive local body between actual lower and upper faces')
 start=[x,lower,z];end=[x,upper,z]
 for k in range(1,10):
  p=[start[j]+F(k,10)*(end[j]-start[j]) for j in range(3)]
  check(all(P.dot(P.cross(P.sub(P.xyz(vs[b]),P.xyz(vs[a0])),P.sub(P.xyz(vs[c]),P.xyz(vs[a0]))),P.sub(p,P.xyz(vs[a0])))<0 for a0,b,c in zip(index[::3],index[1::3],index[2::3])),'material-path: strict interior along the same connected convex body')
 # Exact per-face metre UV distances use separate corners, leaving the physical indices shared.
 offset=0;uv=mesh['perCornerUV']['array']
 for f in mesh['faces']:
  face=f['vertices']
  for j in range(1,len(face)-1):
   tri=[face[0],face[j],face[j+1]];coords=[uv[(offset+k)*2:(offset+k)*2+2] for k in range(3)]
   for k in range(3):check(abs(math.dist(coords[k],coords[(k+1)%3])-math.dist(vs[tri[k]],vs[tri[(k+1)%3]]))<1e-12,'uv: physical metre distance on each new triangle')
   offset+=3
 check(offset==48 and len(uv)==96,'uv: sixteen triangles with separate metric UV corners')
 negative=[]
 def reject(name,vertices,indices,reason):
  try:validate(vertices,indices,row['bounds'],plane)
  except AssertionError as e:
   check(reason in str(e),'negative: intended failure reason')
   negative.append({'name':name,'result':'EXPECTED_REJECTION','reason':str(e),'actualWorldVertices':vertices,'index':indices})
  else:raise AssertionError('Invalid candidate accepted: '+name)
 # Weld only the rejection fixture's exact coordinate duplicates; production buffers remain unchanged.
 cube_ts=P.G.triangles(P.read(front['geometry']['path']),m);welded=[];lookup={};cube_index=[]
 for t in cube_ts:
  for p in t:
   key=tuple(p)
   if key not in lookup:lookup[key]=len(welded);welded.append(p)
   cube_index.append(lookup[key])
 reject('untrimmed envelope intersecting original roof',welded,cube_index,'intersecting candidate')
 collision=next(o for o in table['obstructions'] if o['candidateId']==row['proposalId'])['collisions'][0]['actualCommonInterior'];w=P.xyz(collision['worldWitness'])
 check(all(F(row['bounds']['min'][k])<w[k]<F(row['bounds']['max'][k]) for k in range(3)),'negative: original common-interior witness inside untrimmed fixture')
 check(all(P.dot(P.cross(P.sub(P.xyz(t[1]),P.xyz(t[0])),P.sub(P.xyz(t[2]),P.xyz(t[0]))),P.sub(w,P.xyz(t[0])))<0 for t in roof),'negative: witness strictly inside all actual closed roof halfspaces')
 negative[-1]['actualOriginalRoofInteriorWitness']=collision
 def box(x0,x1,y0,y1,z0,z1):
  v=[[x,y,z] for x in [x0,x1] for y in [y0,y1] for z in [z0,z1]];faces=[[0,1,3,2],[4,6,7,5],[0,4,5,1],[2,3,7,6],[0,2,6,4],[1,5,7,3]];faces=P.outward_faces(v,faces)
  return v,[k for f in faces for j in [1,2] for k in [f[0],f[j],f[j+1]]]
 lower_v,lower_i=box(49.47,49.53,row['bounds']['min'][1],17.11,60.05,60.075);upper_v,upper_i=box(49.47,49.53,17.20,row['bounds']['max'][1],60.05,60.075)
 check(validate(lower_v,lower_i,row['bounds'],plane)['euler']==2 and validate(upper_v,upper_i,row['bounds'],plane)['euler']==2,'negative: both disconnected control pieces individually closed and clear')
 reject('two individually closed pieces separated by an air gap',lower_v+upper_v,lower_i+[i+8 for i in upper_i],'disconnected candidate')
 native=P.read(P.DIRECTORY+'/native-contact-results.json')
 check(native['result']=='PASS_PROPOSED_SOURCE_CONTACTS' and native['prototypeCount']==1 and native['sourceShapesRead']==4 and native['nativeTriangleContacts']==3,'native: finite one-prototype/three-parent predicate checks')
 check(native['proposalSha256']==P.sha(P.PROPOSAL) and native['geometrySha256']==P.sha(P.GEOMETRY) and native['producerSha256']==P.sha(P.DIRECTORY+'/check-native-contacts.mjs'),'native: fresh source identity pins')
 # Every new point lies within the old intersecting envelope. The old proof excluded every other source solid.
 check(all(all(F(row['bounds']['min'][k])<=F(v[k])<=F(row['bounds']['max'][k]) for k in range(3)) for v in vs),'other-source-exclusion: subset of exact old envelope')
 source_pins=P.read('art/source/shared-map-fire-bindings/coverage-family-proposal-v1/geometry-bindings.json')['carriers'];unique={r['geometryPath']:r['sha256'] for refs in source_pins.values() for r in refs}
 for path,h in unique.items():check(P.sha(path)==h,'other-source-exclusion: original New York geometry byte identity')
 protected=['assets/art','art/source/shared-map-fire-bindings','docs/art/shared-map-fire-bindings'];before=set(subprocess.check_output(['git','ls-tree','-r','--name-only',P.PARENT,'--',*protected],cwd=ROOT,text=True).splitlines());changed=set(subprocess.check_output(['git','diff','--name-only',P.PARENT,'--',*protected],cwd=ROOT,text=True).splitlines())
 check(not(before&changed),'preserved: original sources, front48, clear96, proofs and images unchanged')
 context=D.verify_working_sources(ROOT)
 report={'version':1,'result':'PASS_ONE_UNAPPROVED_SOURCE_PROTOTYPE','selectedSourceProposalId':row['proposalId'],'proposalSha256':P.sha(P.PROPOSAL),'geometrySha256':P.sha(P.GEOMETRY),'producerSha256':P.sha(P.DIRECTORY+'/check.py'),
  'checks':dict(checks),'physicalIndexedTopology':facts,'actualClosedVolumeMetresCubed':float(P.solid_volume(vs,index)),'retainedCorniceBearing':bottom,'unchangedUpperBearing':top,
  'proposedRoofBearing':{'status':'NEW_UNAPPROVED_SOURCE_BEARING','sourceCarrierId':P.ROOF,'sourceTriangles':[2,3],'actualFittingFaceVertices':actual_roof_face,'fittingFacePolygonMetres':[[float(q) for q in p] for p in actual_poly],'originalRoofSurfacePolygonMetres':[[float(q) for q in p] for p in source_poly],
   'actualRoofPatchAreaMetresSquared':source_area,'minimumVerticalGapMetres':float(min(gaps)),'maximumVerticalGapMetres':float(max(gaps)),'gapExact':[P.rational(g) for g in gaps],'nativeToleranceMetres':1e-5,'mathematicallyIdenticalPlanes':all(g==0 for g in gaps),
   'meaning':'Actual source roof patch and new fitting face matched under unchanged captured native precision. Nonzero representation gaps are explicit; this is not an already accepted physical joint or anchor.'},
  'continuousMaterialPath':{'fittingLowerEndpointMetres':[float(q) for q in start],'upperEndpointMetres':[float(q) for q in end],'lengthMetres':float(upper-lower),'proof':'One connected exact-indexed convex solid; this vertical line is strictly internal between its two boundary endpoints. No filled reference envelope substitutes for the actual body.'},
  'negativeControls':negative,'unchangedOldTrackedPaths':len(before),'otherSourceExclusion':'Exact subset substitution into frozen complete obstruction proof, with all 182 original geometry byte pins reverified. Roof separation is freshly proved against its actual unchanged supporting plane.',
  'sourceContextPolicy':{'path':'art/source/shared-map-fire-bindings/parapet-clear-blocking-v1/dependency-contexts.json','sha256':P.sha('art/source/shared-map-fire-bindings/parapet-clear-blocking-v1/dependency-contexts.json'),'allowedCommits':[D.ORIGINAL,D.APPROVED],'producerArtistCommit':P.PARENT},'remainingNineteen':'Classified actual roof facets/clearances only; no remaining fitting meshes, per-instance contact/UV/stock or runtime acceptance.',
  'runtimeStockAssigned':0,'nativeActivationWorldGraphBuildOrGameRun':False,'rendererStartedByChecker':False}
 if args.record:(HERE/'check-results.json').write_bytes(P.encode(report))
 else:assert (HERE/'check-results.json').read_bytes()==P.encode(report),'Check evidence changed'
 print(json.dumps({k:report[k] for k in ['result','selectedSourceProposalId','physicalIndexedTopology','actualClosedVolumeMetresCubed','unchangedOldTrackedPaths','runtimeStockAssigned']}))
 print(json.dumps({'checks':sum(checks.values()),'rejectedCases':len(negative),'corniceArea':bottom['actualFaceAreaMetresSquared'],'roofArea':source_area,'upperArea':top['actualFaceAreaMetresSquared'],'maxRoofGap':float(max(gaps)),'currentVerificationContext':context['id']}))
if __name__=='__main__':main()
