"""Bounded, read-only reconciliation of an unaccepted runtime support diagnostic."""
from pathlib import Path
import argparse,collections,hashlib,importlib.util,json,math,re,subprocess,sys
sys.dont_write_bytecode=True
HERE=Path(__file__).resolve().parent;ROOT=HERE.parents[3]
def module(name,path):
 s=importlib.util.spec_from_file_location(name,ROOT/path);m=importlib.util.module_from_spec(s);s.loader.exec_module(m);return m
M=module('binding_geometry','art/source/shared-map-fire-bindings/export.py')
P=module('old_overlap_proof','art/source/shared-map-fire-bindings/propose-new-york-coverage.py')
REF='029e7876faa7dfb62b6d2fced15fda39e518d224';DIAG='docs/engineering/shared-maps/unrooted-components-v1.json'
DIAG_LF_SHA='d1c678454b8720dabafd24f8f27a053d3d4d67b1206814f7ccf0d8611186a920'
BINDINGS='assets/art/shared-map-fire-bindings/new-york-complete-v1.json';BINDINGS_SHA='407c0f8bd582f8d95b9ade1471cd51892ac7b9a40fd2c005696bcc5485991eba'
def digest(data):return hashlib.sha256(data).hexdigest()
def git(*args):return subprocess.check_output(['git',*args],cwd=ROOT)
def load(path):return json.loads((ROOT/path).read_text(encoding='utf-8'))
def q(v):return [float(x) for x in v]
def add(a,b):return [a[i]+b[i] for i in range(3)]
def scale(a,n):return [x*n for x in a]
def bounds_gap(a,b):return math.sqrt(sum(max(0,a['min'][i]-b['max'][i],b['min'][i]-a['max'][i])**2 for i in range(3)))
def local_id(s):return s.split('::',1)[-1]
def family(c):return c['role']+'/'+c['sourcePartIds'][0].split('/')[0]

def closest_point(p,t):
 a,b,c=t
 normal=M.cross(M.sub(b,a),M.sub(c,a))
 if M.dot(normal,normal)<1e-24:
  candidates=[]
  for start,end in ((a,b),(b,c),(c,a)):
   direction=M.sub(end,start);length=M.dot(direction,direction)
   fraction=max(0,min(1,M.dot(M.sub(p,start),direction)/length)) if length else 0
   candidates.append(add(start,scale(direction,fraction)))
  return min(candidates,key=lambda q:math.dist(p,q))
 ab=M.sub(b,a);ac=M.sub(c,a);ap=M.sub(p,a);d1=M.dot(ab,ap);d2=M.dot(ac,ap)
 if d1<=0 and d2<=0:return a
 bp=M.sub(p,b);d3=M.dot(ab,bp);d4=M.dot(ac,bp)
 if d3>=0 and d4<=d3:return b
 vc=d1*d4-d3*d2
 if vc<=0 and d1>=0 and d3<=0:return add(a,scale(ab,d1/(d1-d3)))
 cp=M.sub(p,c);d5=M.dot(ab,cp);d6=M.dot(ac,cp)
 if d6>=0 and d5<=d6:return c
 vb=d5*d2-d1*d6
 if vb<=0 and d2>=0 and d6<=0:return add(a,scale(ac,d2/(d2-d6)))
 va=d3*d6-d5*d4
 if va<=0 and d4-d3>=0 and d5-d6>=0:return add(b,scale(M.sub(c,b),(d4-d3)/((d4-d3)+(d5-d6))))
 denominator=va+vb+vc
 if abs(denominator)<1e-24:return min(t,key=lambda a:math.dist(p,a))
 return add(a,add(scale(ab,vb/denominator),scale(ac,vc/denominator)))

def review():
 controls=[([.5,1,0],[[0,0,0],[1,0,0],[1,0,0]],[.5,0,0]),([2,3,4],[[1,1,1]]*3,[1,1,1]),([.3,.3,1],[[0,0,0],[1,0,0],[0,1,0]],[.3,.3,0]),([-1,-1,0],[[0,0,0],[1,0,0],[0,1,0]],[0,0,0]),([.5,-.5,0],[[0,0,0],[1,0,0],[0,1,0]],[.5,0,0])]
 for point,triangle,expected in controls:assert math.dist(closest_point(point,triangle),expected)<1e-12
 raw=git('show',REF+':'+DIAG);assert digest(raw.replace(b'\r\n',b'\n'))==DIAG_LF_SHA
 diagnostic=json.loads(raw)
 v2ref='51a386449c4f36ca72a8a7a51da6ea4abcd25586';source_path='docs/engineering/shared-maps/support-diagnostic-source-v2.json';v2path='docs/engineering/shared-maps/unrooted-components-v2.json'
 source_bytes=git('show',v2ref+':'+source_path);v2bytes=git('show',v2ref+':'+v2path)
 assert digest(source_bytes)=='3309e34f0b55deee7cb20c72012fcae67f73e999dcbeb0fbf024860c0393ea21'
 assert digest(v2bytes)=='18abfccc505145e9064a15bd38042a870fbc2e60470a9312929a7b9a91283c56'
 snapshot=json.loads(source_bytes);v2=json.loads(v2bytes)
 assert v2['components']==diagnostic['components'] and v2['totals']==diagnostic['totals']
 for file in snapshot['files']:
  text=next(file[k] for k in ('content','source','text') if k in file)
  assert digest(text.encode())==file['sha256']
  if file['path']=='src/content/map-source-support-data.js':
   roles=re.findall(r"'([^']+)'",re.search(r'const STRUCTURE=new Set\((\[[^\]]+\])\)',text).group(1))
   assert set(roles)==set(diagnostic['convention']['structuralRoles'])
 source_snapshot={'commit':v2ref,'path':source_path,'sha256':digest(source_bytes),'diagnosticPath':v2path,'diagnosticSha256':digest(v2bytes),'sourceStringHashesVerified':len(snapshot['files']),'componentsAndTotalsEqualV1':True,'classifierConstantMatchesDiagnostic':True,'installedOrExecuted':False}
 raw_binding=(ROOT/BINDINGS).read_bytes();assert digest(raw_binding)==BINDINGS_SHA
 bindings=json.loads(raw_binding);by={c['id']:c for c in bindings['carriers']}
 components=diagnostic['components'];component_of={local_id(x):c['id'] for c in components for x in c['members']};unrooted=set(component_of)
 assert len(unrooted)==1092 and len(components)==464
 rooted=set(by)-unrooted;structural=set(diagnostic['convention']['structuralRoles'])
 inverse=collections.defaultdict(list)
 for c in by.values():
  for parent in c['supportCarrierIds']:inverse[parent].append(c['id'])
 declared={local_id(r['child']):set() for c in components for r in c['declaredParents']}
 for c in components:
  for r in c['declaredParents']:declared[local_id(r['child'])].add(local_id(r['parent']))
 omitted=[[cid,p] for cid in sorted(unrooted) for p in by[cid]['supportCarrierIds'] if p not in declared.get(cid,set())]
 assert not omitted,'Diagnostic drops existing declared parents'
 families={};family_totals=collections.Counter()
 for c in components:
  family_totals.update(c['families'])
  for f in c['families']:families.setdefault(f,c)
 assert len(families)==74
 geoms={};shapes={};pair_cache={}
 def shape(cid):
  if cid in shapes:return shapes[cid]
  c=by[cid];ts=[];refs=[];box=None
  physical=[b for b in c['renderBindings'] if b['physicalContribution']=='carrier-solid']
  for b in physical:
   path=b['geometryPath']
   if path not in geoms:geoms[path]=load(path)
   ts.extend(M.triangles(geoms[path],b['matrix'],b.get('sourceRange')))
   refs.append({k:b.get(k) for k in ['sourcePartId','geometryPath','matrix','sourceRange']})
  if len(physical)==1:box=P.box_description(geoms[physical[0]['geometryPath']],physical[0])
  vertices=sorted({tuple(p) for t in ts for p in t});planes=P.convex_planes(ts)
  samples=[list(p) for p in vertices]+[[sum(p[k] for p in t)/3 for k in range(3)] for t in ts]
  out={'id':cid,'triangles':ts,'vertices':vertices,'convex':planes,'box':box,'samples':samples,'refs':refs}
  shapes[cid]=out;return out
 def pair(cid,pid):
  key=(cid,pid)
  if key in pair_cache:return pair_cache[key]
  a,b=shape(cid),shape(pid);ca,cb=by[cid],by[pid];ba,bb=ca['physicalBounds'],cb['physicalBounds']
  overlap=P.intersection_proof(a,b)
  interior=None
  if all(min(ba['max'][k],bb['max'][k])>max(ba['min'][k],bb['min'][k]) for k in range(3)):
   centre=[(min(ba['max'][k],bb['max'][k])+max(ba['min'][k],bb['min'][k]))/2 for k in range(3)]
   if P.strictly_inside(centre,a['convex']) and P.strictly_inside(centre,b['convex']):interior=centre
  axes=[(1,0,0),(0,1,0),(0,0,1)]
  for s in (a,b):
   if s['convex']:axes.extend(n for n,d in s['convex'])
  lower=bounds_gap(ba,bb);axis=None
  for n in axes:
   pa=[M.dot(p,n) for p in a['vertices']];pb=[M.dot(p,n) for p in b['vertices']]
   gap=max(min(pa)-max(pb),min(pb)-max(pa),0)
   if gap>lower:lower=gap;axis=n
  upper=float('inf');witness=None
  # These actual vertex-to-triangle samples are upper bounds. A positive
  # separating projection proves a gap; AABB overlap never proves contact.
  for first,second,reverse in [(a,b,False),(b,a,True)]:
   for v in first['vertices']:
    for t in second['triangles']:
     p=closest_point(v,t);distance=math.dist(v,p)
     if distance<upper:upper=distance;witness=[q(p),q(v)] if reverse else [q(v),q(p)]
  assert lower<=upper+2e-5,(cid,pid,lower,upper)
  if overlap:assert lower<2e-5,(cid,pid,'overlap contradicts gap')
  intersection={k:[(max if k=='min' else min)(ba[k][i],bb[k][i]) for i in range(3)] for k in ('min','max')}
  out={'source':cid,'candidate':pid,'candidateRootedOnlyUnderDiagnostic':pid in rooted,'sourceRole':ca['role'],'candidateRole':cb['role'],'boundsGapLowerBoundMetres':bounds_gap(ba,bb),'separatingProjectionGapLowerBoundMetres':lower,'separatingAxis':axis,'closestVertexToTriangleUpperBoundMetres':upper,'actualSurfaceWitness':witness,'positiveVolumeProof':overlap,'commonStrictInteriorWitness':interior,'contactWithinExistingSourcePrecision':upper<=2e-5,'geometricGapProven':lower>2e-5,'overlapSelectorBounds':intersection if all(intersection['max'][k]>=intersection['min'][k] for k in range(3)) else None,'sourceGeometryRefs':a['refs'],'candidateGeometryRefs':b['refs'],'meaning':'Projection/AABB values are lower bounds; actual source vertex-to-triangle witnesses are upper bounds, not exact global minima. No link is applied.'}
  pair_cache[key]=out;return out
 audits=[]
 for f,component in families.items():
  members=[by[local_id(s)] for s in component['members'] if family(by[local_id(s)])==f]
  source=min(members,key=lambda c:(bool(c['supportCarrierIds']),0 if c['id'].endswith('/base') else 1,len(c['supportCarrierIds']),c['id']))
  cid=source['id'];incoming=[x for x in inverse[cid] if x in rooted]
  primary=sorted((c for c in by.values() if c['id'] in rooted and c['role'] in structural),key=lambda c:(bounds_gap(source['physicalBounds'],c['physicalBounds']),c['id']))[:3]
  original_adjacent=[x for x in source['adjacencyCarrierIds'] if x in rooted]
  audit={'family':f,'familyUnrootedCount':family_totals[f],'componentId':component['id'],'componentSize':len(component['members']),'representativeId':cid,'role':source['role'],'bounds':source['physicalBounds'],'supportResolution':source['supportResolution'],'existingParents':[{'id':p,'rootedOnlyUnderDiagnostic':p in rooted,'componentId':component_of.get(p),'evidence':[e for e in source['supportEvidence'] if e.get('carrierId')==p]} for p in source['supportCarrierIds']],'rootedExistingChildren':[{'id':x,'evidence':[e for e in by[x]['supportEvidence'] if e.get('carrierId')==cid]} for x in incoming],'rootedOriginalAdjacency':original_adjacent,'nearestPrimaryCandidateScope':'Only the first three rooted primary carriers ordered by AABB gap; no nearest-solid or global separation claim. Rooted is only the unaccepted diagnostic interpretation.','nearestPrimaryCandidatesByBounds':[pair(cid,c['id']) for c in primary],'declaredIncomingGeometry':[pair(cid,x) for x in incoming[:2]],'diagnosticCandidates':[r for r in component['rootedAdjacencyCandidates'] if local_id(r['source'])==cid],'classificationAcceptance':False,'newLinksApplied':False}
  audits.append(audit)
  if len(audits)%10==0:print(json.dumps({'reviewedFamilies':len(audits)},separators=(',',':')),flush=True)
 # Specific extra representatives expose internal assembly orientation and the
 # different geometry hidden by a single broad family label.
 focused_ids=['carrier/main-parapet-0/pier-0','carrier/main-parapet-0/cap-0','carrier/main/0/frieze-1/jamb--1','carrier/main/0/frieze-1/sill','carrier/edge-0/cornice-2','carrier/edge-1/cornice-5','carrier/ny-front/header','carrier/porch-east/column-0-0/base']
 focused=[]
 for cid in focused_ids:
  c=by[cid];nearest=sorted((p for p in by.values() if p['id']!=cid and p['id'] in rooted and p['role'] in structural),key=lambda p:(bounds_gap(c['physicalBounds'],p['physicalBounds']),p['id']))[:2]
  incoming=[p for p in inverse[cid] if p in rooted]
  any_role=[]
  if cid in ('carrier/main-parapet-0/pier-0',):
   neighbors=sorted((p for p in by.values() if p['id']!=cid and p['id'] in rooted),key=lambda p:(bounds_gap(c['physicalBounds'],p['physicalBounds']),p['id']))[:6]
   any_role=[pair(cid,p['id']) for p in neighbors]
  focused.append({'nearestRootedAnyRoleCandidates':any_role,'id':cid,'rootedOnlyUnderDiagnostic':cid in rooted,'role':c['role'],'bounds':c['physicalBounds'],'originalParents':c['supportCarrierIds'],'rootedExistingChildren':incoming,'nearestPrimaryCandidatesByBounds':[pair(cid,p['id']) for p in nearest],'declaredIncomingGeometry':[pair(cid,p) for p in incoming[:2]]})
 # Pairwise source cases for an exact, small proposal; these are evidence only.
 targets=[
  ('portal-jamb-to-floor','carrier/ny-front/jamb--1','carrier/main-floor/tile--2-0'),
  ('portal-header-to-fixed-jamb','carrier/ny-front/header','carrier/ny-front/jamb--1'),
  ('portal-right-jamb-to-floor','carrier/ny-front/jamb-1','carrier/main-floor/tile-1-0'),
  ('portal-header-to-right-fixed-jamb','carrier/ny-front/header','carrier/ny-front/jamb-1'),
  ('window-jamb-to-wall','carrier/main/0/frieze-1/jamb--1','carrier/main/0/cell-7-7/1'),
  ('closure-cap-to-actual-deck','carrier/visit-cap/ny-side-approach--1/7','carrier/porch-west-1'),
  ('sloped-handrail-to-post','carrier/ny-main-flight-2/handrail--1','carrier/ny-main-flight-2/post--1-0'),
  ('guard-top-to-existing-cross-rail','carrier/ny-middle-guard-right/top','carrier/ny-middle-guard-back/top'),
  ('window-jamb-to-existing-sill','carrier/main/0/frieze-1/jamb--1','carrier/main/0/frieze-1/sill'),
  ('cornice-to-wall','carrier/edge-0/cornice-1','carrier/main/0/cell-3-0/1'),
  ('parapet-base-to-roof','carrier/main-parapet-0/base','carrier/roof/front-centre'),
  ('parapet-base-to-rooted-cornice','carrier/main-parapet-0/base','carrier/edge-0/cornice-7'),
  ('clerestory-base-to-existing-cornice','carrier/clerestory/front-rail/base','carrier/clerestory/cornice'),
  ('sloped-handrail-to-interior-post','carrier/ny-main-flight-2/handrail--1','carrier/ny-main-flight-2/post--1-10'),
  ('parapet-pier-to-base','carrier/main-parapet-0/pier-0','carrier/main-parapet-0/base'),
  ('parapet-cap-to-pier','carrier/main-parapet-0/cap-0','carrier/main-parapet-0/pier-0'),
  ('cap-to-parent-pier','carrier/upper-terrace/rail-front/cap-2','carrier/upper-terrace/rail-front/pier-2')
 ]
 target_evidence=[{'case':name,**pair(child,parent)} for name,child,parent in targets]
 try:producer=subprocess.check_output(['git','show',REF+':'+diagnostic['producer']['path']],cwd=ROOT,stderr=subprocess.DEVNULL);producer_available=True
 except subprocess.CalledProcessError:producer=None;producer_available=False
 unchanged_paths=['assets/art','vendor','src','art/source/exploration-access','art/source/shared-map-fire-bindings/completion-v1','workbenches/art/check-exposition-new-york-tile.mjs','workbenches/art/check-exploration-access.mjs']
 assert subprocess.run(['git','diff','--quiet','90c226f674d51a2d030fcdd4679e61a3bdd9ebfe','--',*unchanged_paths],cwd=ROOT).returncode==0
 return {'version':1,'scope':'Source-only bounded reconciliation; graph interpretation and every proposal remain unapplied and unaccepted. No geometry/runtime WIP imported.','diagnostic':{'commit':REF,'path':DIAG,'lfSha256':DIAG_LF_SHA,'interpretationAccepted':False,'declaredProducerPresentInThatCommit':producer_available,'resolvedByEvidenceOnlySnapshot':source_snapshot},'geometryMathControlCount':len(controls),'inputs':{'bindings':{'path':BINDINGS,'sha256':BINDINGS_SHA},'reviewSourceSha256':digest(Path(__file__).read_bytes()),'mathSources':[{'path':p,'sha256':digest((ROOT/p).read_bytes())} for p in ['art/source/shared-map-fire-bindings/export.py','art/source/shared-map-fire-bindings/propose-new-york-coverage.py']]},'totals':diagnostic['totals'],'originalDeclaredParentEdgesOmittedByDiagnostic':omitted,'sampleCoverage':{'affectedFamilies':len(families),'familyRepresentatives':len(audits),'focusedAdditionalIds':len(focused),'targetPairs':len(targets),'largestComponentSize':max(len(c['members']) for c in components),'all1092IndividuallyAdjudicated':False},'familyReview':audits,'focusedReview':focused,'targetPairEvidence':target_evidence,'geometrySources':[{'path':p,'sha256':digest((ROOT/p).read_bytes())} for p in sorted(geoms)],'completedArtAndCheckersChanged':False,'newLinksApplied':0,'newGroundAnchors':0,'geometryChanges':0,'rendererStarted':False}

if __name__=='__main__':
 parser=argparse.ArgumentParser(description=__doc__);parser.add_argument('--record',action='store_true');args=parser.parse_args();report=review()
 if args.record:(HERE/'review-evidence.json').write_text(json.dumps(report,indent=2,sort_keys=True)+'\n',encoding='utf-8',newline='\n')
 print(json.dumps({k:v for k,v in report.items() if k not in ['familyReview','focusedReview','geometrySources','targetPairEvidence']},sort_keys=True))
