"""Focused source-only validation; no simulator, render, stock, roles or geometry writes."""
from pathlib import Path
import argparse,collections,copy,hashlib,importlib.util,json,math,sys,traceback
sys.dont_write_bytecode=True
HERE=Path(__file__).resolve().parent;ROOT=HERE.parents[3]
def mod(name,file):
 spec=importlib.util.spec_from_file_location(name,HERE/file);m=importlib.util.module_from_spec(spec);spec.loader.exec_module(m);return m
I=mod('audit_inputs','inputs.py');C=mod('audit_geometry','geometry.py')
def read(name):return json.loads((HERE/name).read_text())
def digest(path):return hashlib.sha256(path.read_bytes()).hexdigest()
def encode(value):return json.dumps(value,indent=2,sort_keys=True)+'\n'
def inside_box(point,box,tolerance=1e-5):return all(box['min'][k]-tolerance<=point[k]<=box['max'][k]+tolerance for k in range(3))
def validate():
 a=I.load();by=a['by'];g=C.Geometry(by);report=read('proposal-index.json');rows=read('relationships.json')['relationships'];cells=read('cornice-coverage.json')['cells'];bindings=read('geometry-bindings.json')['carriers'];native=read('native-contact-results.json');residual=read('remaining-explicit-findings.json')['records'];gaps=read('separate-parapet-gap-design.json')
 assert all(p['exactMatch'] for p in a['sourcePins'])
 for pin in report['authoringSources']:assert digest(ROOT/pin['path'])==pin['sha256']
 assert report['status']=='UNACCEPTED_FAMILY_PROPOSAL' and report['newFuelApplied']==report['newGeometryApplied']==report['unapprovedFamilyRecordsApplied']==0
 assert len(rows)==report['proposedCanonicalPairs'] and len({(r['childCarrierId'],r['parentCarrierId']) for r in rows})==len(rows)
 used={r[k] for r in rows for k in ('childCarrierId','parentCarrierId')};assert set(bindings)==used
 for cid,refs in bindings.items():assert refs==g.shape(cid)['refs']
 # Independent triangle solid-angle membership with a source-surface-distance
 # guard. This does not use the proposal's convex halfspace witness predicate.
 membership_cache={}
 def winding_member(cid,point):
  key=(cid,tuple(point))
  if key in membership_cache:return membership_cache[key]
  sh=g.shape(cid);total=0
  assert sh['closed'] and sh['volume']>0
  for t in sh['triangles']:
   x,y,z=[C.G.sub(v,point) for v in t];lx,ly,lz=[math.sqrt(C.G.dot(v,v)) for v in (x,y,z)]
   total+=2*math.atan2(C.G.dot(x,C.G.cross(y,z)),lx*ly*lz+C.G.dot(x,y)*lz+C.G.dot(y,z)*lx+C.G.dot(z,x)*ly)
  assert abs(abs(total)-4*math.pi)<1e-3, 'Point is not inside actual source solid: '+cid
  distance=min(math.dist(point,C.R.closest_point(point,t)) for t in sh['triangles'])
  assert distance>C.INTERIOR, 'Point is too close to actual solid boundary: '+cid
  membership_cache[key]=True;return True
 def stem(cid):return cid.removeprefix('carrier/').removeprefix('replacement/')
 counts=collections.Counter();regions=0;geometric=collections.Counter()
 for row in rows:
  child,parent=row['childCarrierId'],row['parentCarrierId'];family=row['family'];cs,ps=stem(child),stem(parent)
  assert child!=parent and child in by and parent in by
  assert row['childRole']==by[child]['role'] and row['parentRole']==by[parent]['role']
  assert row['groundAnchor'] is row['wholeCarrierRetirement'] is row['accepted'] is row['applied'] is False
  assert row['direction']==('symmetric-structural' if family=='native-source-paving-seams' else 'parent-to-child')
  assert row['proposedKind'] in {'fixed-embed','bearing-face','carpentry-butt-joint','structural-seam'}
  assert by[parent]['role'] not in {'glass','door','door-hardware','cast-mineral-urn'}
  if family=='cornice-full-local-coverage':
   assert 'cornice' in cs and (by[parent]['role'] in {'exterior-wall','perimeter-closure','building-deck','raised-base','column','exterior-paving','approach-stair'} or 'cornice' in ps or '/column-' in parent or ps.endswith('/cap-eave') and row['action']=='normalize-existing-pair-to-local-regions')
  elif family=='fixed-window-frame':
   assert cs.endswith(('/jamb--1','/jamb-1')) and not cs.startswith('ny-')
   assert by[parent]['role'] in {'exterior-wall','perimeter-closure','building-deck'}
  elif family=='fixed-portal-frame':
   assert cs.startswith('ny-')
   if cs.endswith('/header'):assert cs.rsplit('/',1)[0]==ps.rsplit('/',1)[0] and '/jamb-' in ps
   else:assert by[parent]['role'] in {'building-deck','exterior-paving'}
  elif family=='dentil-to-own-cornice':
   assert '/dentil-' in cs and 'cornice' in ps and cs.rsplit('/',1)[0]==ps.rsplit('/',1)[0]
  elif family=='railing-pier-to-base':
   assert '/pier-' in cs and ps==cs.rsplit('/',1)[0]+'/base'
  elif family=='railing-cap-to-real-members':
   assert '/cap-' in cs and ('/baluster-' in ps or '/pier-' in ps) and cs.rsplit('/',1)[0]==ps.rsplit('/',1)[0]
  elif family=='native-rail-to-real-posts':
   assert '/post-' in ps and cs.rsplit('/',1)[0]==ps.rsplit('/',1)[0]
  elif family=='porch-rail-and-neck-frame':
   assert cs.startswith(('porch-east/','porch-west/')) and 'rail-cap' in cs
   assert 'baluster' in ps or 'neck-rail-cap' in ps or by[parent]['role'] in {'exterior-wall','perimeter-closure'}
  elif family=='native-source-paving-seams':
   assert child.startswith('carrier/visit-cap/ny-side-approach') and parent==('carrier/porch-west-1' if '/ny-side-approach--1/' in child else 'carrier/porch-east-1')
  else:raise AssertionError('Unreviewed family '+family)
  assert row['localRegions'] and len({r['id'] for r in row['localRegions']})==len(row['localRegions'])
  for region in row['localRegions']:
   regions+=1;cert=region['actualGeometryCertificate'];proof=cert['proof'];geometric[cert['proposedKind']]+=1
   assert region['frame']=='emitted-world'
   for name,point_name in [('childBounds','childWitness'),('parentBounds','parentWitness')]:
    b=region[name];p=region[point_name];assert all(math.isfinite(v) for v in b['min']+b['max']+p) and all(b['min'][k]<=b['max'][k]+1e-12 for k in range(3)) and inside_box(p,b)
    if region['selector']:assert all(inside_box(v,region['selector']) for v in [b['min'],b['max']])
   if cert['proposedKind']=='fixed-embed':
    p=proof['worldWitness'];assert p==region['childWitness']==region['parentWitness'];winding_member(child,p);winding_member(parent,p)
   elif cert['proposedKind'] in {'bearing-face','carpentry-butt-joint'}:
    measured=g.face(child,parent,region['selector'],require_bearing=cert['proposedKind']=='bearing-face')
    assert measured and abs(measured['actualFaceAreaMetresSquared']-proof['actualFaceAreaMetresSquared'])<1e-9
   else:
    assert cert['proposedKind']=='structural-seam' and math.dist(*proof['actualSurfaceWitness'])<=C.NATIVE
    for cid,p in zip((child,parent),proof['actualSurfaceWitness']):
     assert min(math.dist(p,C.R.closest_point(p,t)) for t in g.shape(cid)['triangles'])<C.NATIVE
  counts[family]+=1
 assert dict(counts)==report['groupPairCounts'] and regions==report['proposedLocalRegions']
 for cell in cells:
  evidence=cell['occupancyEvidence'];fresh=g.occupancy(cell['carrierId'],cell['selector'])
  assert evidence==fresh
  if evidence['occupied']:
   winding_member(cell['carrierId'],evidence['worldWitness'])
   assert cell['status'] in {'actual-local-hosts','occupied-source-native-continuity-only'}
  else:
   assert evidence['occupied'] is False and cell['status']=='source-native-empty-column' and evidence['fullSourceHeightIncluded'] and evidence['absoluteProjectedTriangleAreaMetresSquared']<=1e-9
 assert len({c['carrierId'] for c in cells})==109 and len(cells)==3844
 assert len({(c['carrierId'],*c['grid']) for c in cells})==len(cells)
 assert 'unresolved-source-occupancy' not in {c['status'] for c in cells}
 assert native['proposalSha256']==digest(HERE/'relationships.json') and native['uniqueDirectedPairs']==len(rows)
 misses={(r['childCarrierId'],r['parentCarrierId']) for r in native['noSourceFacetCrossing']}
 # A lack of boundary-surface intersection is not a lack of closed-solid
 # overlap. Every such case must be certified by actual strict membership.
 for row in rows:
  if (row['childCarrierId'],row['parentCarrierId']) in misses:assert all(r['actualGeometryCertificate']['proposedKind']=='fixed-embed' for r in row['localRegions'])
 controls=[]
 for join in a['controls']['joins']:
  cert=g.certificate(join['childCarrierId'],join['parentCarrierId'],allow_fastening=True,structural_seam=join['kind']=='structural-seam')
  assert cert and cert['proposedKind']==join['kind']
  controls.append({'control':'existing-accepted-native-pattern','child':join['childCarrierId'],'parent':join['parentCarrierId'],'kind':join['kind'],'pass':True})
 for child,parent in [('carrier/main-parapet-0/base','carrier/roof/front-centre'),('carrier/ny-main-flight-2/handrail--1','carrier/ny-main-flight-2/post--1-0')]:
  assert not g.certificate(child,parent,allow_fastening=True)
  controls.append({'control':'real-gap-is-not-a-mount-or-embed','child':child,'parent':parent,'pass':True})
 # A contact at a rail endpoint cannot count for a distant bay selector.
 joint=a['controls']['joins'][-1];child,parent=joint['childCarrierId'],joint['parentCarrierId'];face=g.face(child,parent);axis=face['axis'];roi=copy.deepcopy(by[child]['physicalBounds']);mid=(roi['min'][axis]+roi['max'][axis])/2
 if face['childFace']=='min':roi['min'][axis]=mid
 else:roi['max'][axis]=mid
 assert not g.certificate(child,parent,roi,allow_fastening=True)
 controls.append({'control':'endpoint-contact-cannot-cover-distant-local-region','pass':True,'selector':roi})
 # Project the exact proposal only into a labelled cold interpretation.
 graph={k:set(v) for k,v in a['links'].items()}
 for row in rows:
  graph[row['parentCarrierId']].add(row['childCarrierId'])
  if row['direction']=='symmetric-structural':graph[row['childCarrierId']].add(row['parentCarrierId'])
 retired=read('retired-moving-frame-interpretations.json')['records'];assert len(retired)==8
 for r in retired:
  assert by[r['parentCarrierId']]['role']=='door' and r['geometryEvidenceRetained'] and not r['applied']
  assert r['childCarrierId']!='carrier/ny-front/header'
  graph[r['parentCarrierId']].discard(r['childCarrierId'])
 dependent_retired=read('retired-dependent-bracing-interpretations.json')['records'];assert len(dependent_retired)==216
 for r in dependent_retired:
  child,parent=r['childCarrierId'],r['parentCarrierId']
  assert 'cornice' in child and ('/dentil-' in parent or parent.startswith('carrier/clerestory/front-rail/')) and r['geometryEvidenceRetained'] and not r['applied'] and not r['accepted']
  assert any(q['parent']==parent for q in a['relations'][child])
  assert all(not(row['childCarrierId']==child and row['parentCarrierId']==parent) for row in rows)
  graph[parent].discard(child)
 after=I.reachable(graph,a['anchors']);with_blocks={k:set(v) for k,v in graph.items()}
 for member in a['blocks']['members']:with_blocks[member['id']]=set()
 for join in a['blocks']['joins']:with_blocks[join['parentCarrierId']].add(join['childCarrierId'])
 after_blocks=I.reachable(with_blocks,a['anchors']);remaining=set(a['ids'])-after_blocks
 assert len(set(a['ids'])-after)==346 and len(remaining)==235 and remaining=={r['id'] for r in residual}
 dispositions=[]
 for cid in sorted(a['unrooted']):
  dispositions.append({'id':cid,'role':by[cid]['role'],'status':'hypothetically-reachable-with-family-records' if cid in after else 'hypothetically-reachable-only-with-separate-approved-front-48' if cid in after_blocks else 'awaiting-separate-parapet-gap-design','runtimeAcceptance':False,'newGeometryApplied':False})
 assert len(dispositions)==1038 and all('main-parapet-' in cid or by[cid]['role']=='cast-mineral-urn' for cid in remaining)
 # The gap proposals are separate and are not projected into this graph.
 assert gaps['status']=='SEPARATE_UNAPPROVED_NEW_GEOMETRY_DESIGN' and gaps['summary']['newGeometryApplied']==gaps['summary']['newFuelApplied']==gaps['summary']['newAnchors']==0
 assert gaps['summary']['tentativeMembers']==116 and gaps['summary']['clearRectangularRepeatCandidates']==96 and gaps['summary']['separateRoofSaddleProfilesRequired']==20
 assert all(c['collisions'][0]['originalCarrierId']=='carrier/roof/rear-tail' for c in gaps['obstructions'])
 assert all(r['separateRoofSaddleAlternative']['minimumRemainingPadHeightMetres']>C.INTERIOR for c in gaps['obstructions'] for r in c['collisions'])
 summary={'version':1,'result':'PASS','scope':'Unapplied source proposal validation; no runtime graph, stress, cold/active accounting, fire or rendered acceptance.','runtimeCommit':I.RUNTIME,'baseBindingsSha256':I.BASE_SHA,'relationshipsSha256':digest(HERE/'relationships.json'),'canonicalPairs':len(rows),'localRegions':regions,'certificateKindsByRegion':dict(geometric),'independentActualSolidWindingMemberships':len(membership_cache),'nativeFacetContacts':native['nativeSourceFacetContacts'],'strictSolidOverlapsWithoutFacetCrossing':len(misses),'cornicePieces':109,'corniceCells':len(cells),'corniceStatuses':dict(collections.Counter(c['status'] for c in cells)),'controls':controls,'originalDiagnosticDispositions':dict(collections.Counter(r['status'] for r in dispositions)),'remainingOriginalIds':len(remaining),'proposedDependentBracingRetirements':len(dependent_retired),'proposedMovingLeafRetirements':len(retired),'separateGapDesign':gaps['summary'],'unapprovedRecordsApplied':0,'newAnchors':0,'newFuel':0,'rendererStarted':False,'producerSha256':digest(Path(__file__))}
 return summary,{'version':1,'scope':'Hypothetical source interpretation only; original 1038 are not declared art defects.','diagnosticSha256':I.DIAG_SHA,'records':dispositions}
if __name__=='__main__':
 parser=argparse.ArgumentParser(description=__doc__);parser.add_argument('--record',action='store_true');args=parser.parse_args()
 try:
  result,dispositions=validate()
  if args.record:
   (HERE/'check-results.json').write_text(encode(result),encoding='utf-8',newline='\n');(HERE/'original-diagnostic-dispositions.json').write_text(encode(dispositions),encoding='utf-8',newline='\n')
  print(json.dumps({**result,'controls':len(result['controls'])},sort_keys=True))
 except Exception as error:
  (HERE/'check-failure.json').write_text(encode({'exception':type(error).__name__,'message':str(error),'traceback':traceback.format_exc(),'assetsChanged':False}),encoding='utf-8',newline='\n');raise
