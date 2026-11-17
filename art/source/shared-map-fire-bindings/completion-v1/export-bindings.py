"""Additive approved NY completion. Preserves the accepted pilot and all raw assets."""
from pathlib import Path
import collections, copy, hashlib, importlib.util, json, math, subprocess, sys
sys.dont_write_bytecode=True
ROOT=Path(__file__).resolve().parents[4]
HERE=Path(__file__).parent

def module(name,path):
 s=importlib.util.spec_from_file_location(name,path);m=importlib.util.module_from_spec(s);s.loader.exec_module(m);return m
M=module('binding_v1',HERE.parent/'export.py')
P=module('coverage_math',HERE.parent/'propose-new-york-coverage.py')
INPUT='assets/art/shared-map-fire-bindings/new-york.json'
OVERLAY='assets/art/shared-map-derived-geometry/new-york/v1/index.json'
OUTPUT='assets/art/shared-map-fire-bindings/new-york-complete-v1.json'
EVIDENCE='art/source/shared-map-fire-bindings/completion-v1/binding-evidence.json'
EPS=2e-5

def read(path):return json.loads((ROOT/path).read_text(encoding='utf-8'))
def sha(path):return hashlib.sha256((ROOT/path).read_bytes()).hexdigest()
def q(v):return round(v,6)
def bounded_overlap(a,b):return {'min':[max(a['min'][k],b['min'][k]) for k in range(3)],'max':[min(a['max'][k],b['max'][k]) for k in range(3)]}
def point_bounds(point,radius,limit):return {'min':[max(limit['min'][k],point[k]-radius) for k in range(3)],'max':[min(limit['max'][k],point[k]+radius) for k in range(3)]}
def geom_refs(carrier):return [{'partId':b['partId'],'sourcePartId':b['sourcePartId'],'geometryId':b['geometryId'],'geometryPath':b['geometryPath'],'matrix':b['matrix'],'sourceRange':b.get('sourceRange')} for b in carrier['renderBindings'] if b['physicalContribution']=='carrier-solid']
def closest_obb(point,box):
 d=M.sub(point,box['centre']);return [box['centre'][k]+sum(max(-box['halfExtents'][j],min(box['halfExtents'][j],M.dot(d,box['axes'][j])))*box['axes'][j][k] for j in range(3)) for k in range(3)]
def intersection_polygon(a,b):
 orient=sum(x[0]*y[1]-x[1]*y[0] for x,y in zip(b,b[1:]+b[:1]));p=a
 for x,y in zip(b,b[1:]+b[:1]):
  def side(v):return ((y[0]-x[0])*(v[1]-x[1])-(y[1]-x[1])*(v[0]-x[0]))*(1 if orient>=0 else -1)
  before=p;p=[]
  for u,v in zip(before,before[1:]+before[:1]):
   du,dv=side(u),side(v);iu,iv=du>=-1e-10,dv>=-1e-10
   if iu:p.append(u)
   if iu!=iv:
    t=du/(du-dv);p.append([u[k]+t*(v[k]-u[k]) for k in range(2)])
  if len(p)<3:return []
 return p

def policy_records():
 rows=[]
 for ref,source,name,role in [('fe29be3a','docs/milestones/29-shared-gameplay-maps.md','m29-coverage-fe29be3a.md','accepted-coverage'),('2ec28370','docs/milestones/29-shared-gameplay-maps.md','m29-topology-2ec28370.md','accepted-retained-topology'),('b509e5c4','docs/engineering/shared-maps/overlay-response.md','coder-overlay-b509e5c4.md','reconciled-coder-contract'),('01299a68','docs/engineering/shared-maps/overlay-response.md','coder-overlay-01299a68.md','preserved-base-support-normalization'),('400eb8bc','docs/milestones/29-shared-gameplay-maps.md','m29-extra-mounts-400eb8bc.md','accepted-four-additional-local-mounts')]:
  commit=subprocess.check_output(['git','rev-parse',ref],cwd=ROOT,text=True).strip();data=subprocess.check_output(['git','show',commit+':'+source],cwd=ROOT);snapshot='art/source/shared-map-fire-bindings/completion-v1/policy-snapshots/'+name
  assert (ROOT/snapshot).read_bytes()==data
  rows.append({'role':role,'commit':commit,'path':source,'gitBlob':subprocess.check_output(['git','rev-parse',commit+':'+source],cwd=ROOT,text=True).strip(),'sha256':hashlib.sha256(data).hexdigest(),'snapshotPath':snapshot})
 return rows

def build():
 assert sha(INPUT)=='7490e3bfeeab4a6080d2c9d97b99fc81bac875d711c83fcbe4c10e34e008b1f9'
 base=read(INPUT);a=copy.deepcopy(base);proposal=read('art/source/shared-map-fire-bindings/new-york-coverage-proposal.json');overlay=read(OVERLAY);overrides={r['sourcePartId']:r for r in overlay['replacements']};index=read(base['sourceScene']['indexPath']);nav=read(base['sourceScene']['navigationPath']);geometries={};sources={}
 for chunk in index['chunks']:
  for row in read('assets/art/place-scenes/new-york/'+chunk['url'])['parts']:sources[row['id']]=row
 def geometry(binding):
  path=binding['geometryPath']
  if path not in geometries:geometries[path]=read(path)
  return geometries[path]
 def effective(binding):
  b=copy.deepcopy(binding);r=overrides.get(b['sourcePartId'])
  if r:
   assert not b.get('sourceRange'),'Repaired ranges require explicit effective mapping'
   assert b['geometryId']==r['before']['geometryId'] and b['matrix']==r['matrix']
   b.update(sourceGeometryId=b['geometryId'],sourceGeometryPath=b['geometryPath'],geometryId=r['after']['geometryId'],geometryPath=r['after']['geometryPath'],geometrySha256=r['after']['sha256'],triangleCount=r['after']['triangleCount'],bounds=r['bounds'],effectiveOverlayPartId=r['sourcePartId'])
  return b
 by={c['id']:c for c in a['carriers']}
 for c in a['carriers']:
  c['attachmentRecords']=[]
  c['retirement']={'ownerId':c['id'],'stateKey':c['id'],'policy':'retirementPolicy','fuelOwnership':'canonical-carrier-once','physicalRetirement':'local-effective-geometry-patches','wholeCarrierRetirementFromSinglePatch':False}
 # Add all 104 explicitly accepted records, not defaults.
 choices={c['sourcePartId']:c for c in proposal['materialChoices']};new_ids=[]
 for pending in base['unassignedBindings']:
  source=pending['sourcePartId'];b=effective(pending['renderBinding']);ts=M.triangles(geometry(b),b['matrix'],b.get('sourceRange'));facts=M.measures(ts);assert facts['closed'],source
  if source in choices:
   choice=choices[source];mat,profile=choice['physicalMaterial'],choice['fuelClass'];rule='closed-volume' if profile else 'inert';amount=choice['proposedFuelAmount'];role='timber-fitting' if profile else 'metal-finial' if mat=='metal' else 'cast-mineral-urn' if choice['group']=='urns' else 'mineral-relief';layer='structure' if profile else 'ornament';detail=choice['materialDetail']
   assert abs(amount-(facts['volume']/.12 if profile else 0))<3e-5
  else:
   assert source in overrides and pending['kind']=='quantity-unassigned-open-source'
   role,mat,profile,rule=M.classify(sources[b['partId']]);assert mat==pending['acceptedGameplayMaterial'] and profile==pending['proposedFuelClass']
   amount=facts['volume']/.16 if rule=='wall-area' else facts['volume']/.12 if rule=='closed-volume' else None;assert amount is not None;layer='structure';detail='Accepted repaired derived source; no new material default'
  cid='carrier/'+source;area=facts['volume']/.16 if rule=='wall-area' else facts['surfaceArea'];thickness=.16 if rule=='wall-area' else None
  c={'id':cid,'sourcePartIds':[source],'sectionIds':[b['sectionId']],'role':role,'layer':layer,'physicalMaterial':mat,'materialDetail':detail,'fuelClass':profile,'fuelAmount':q(amount),'area':q(area),'thickness':thickness,'quantityBasis':{'rule':rule,'unit':'prototype-fuel-unit','historicalMass':False,'closedSourceSolids':True,'volumeMetresCubed':q(facts['volume']),'formula':'0; explicitly accepted inert assignment' if not profile else 'Verified closed effective volume / .16' if rule=='wall-area' else 'Verified closed effective volume / .12'},'renderBindings':[b],'physicalSourcePartIds':[source],'physicalTriangleCount':b['triangleCount'],'triangleCount':b['triangleCount'],'bounds':b['bounds'],'physicalBounds':b['bounds'],'supportCarrierIds':[],'supportEvidence':[],'attachmentRecords':[],'adjacencyCarrierIds':[],'anchors':[],'supportResolution':'new-source-awaiting-measured-parent','evidence':{'sourceFact':'sourceFacts','gameplayAssignment':'Accepted coverage at fe29be3a174121914cc762e1bc9f10004186fb65','geometryOverlayPartId':source if source in overrides else None},'retirement':{'ownerId':cid,'stateKey':cid,'policy':'retirementPolicy','fuelOwnership':'canonical-carrier-once','physicalRetirement':'local-effective-geometry-patches','wholeCarrierRetirementFromSinglePatch':False}}
  assert cid not in by;by[cid]=c;a['carriers'].append(c);new_ids.append(cid)
 assert len(new_ids)==104
 shapes={};bins=collections.defaultdict(set)
 for cid,c in by.items():
  bs=[b for b in c['renderBindings'] if b['physicalContribution']=='carrier-solid'];ts=[t for b in bs for t in M.triangles(geometry(b),b['matrix'],b.get('sourceRange'))];box=P.box_description(geometry(bs[0]),bs[0]) if len(bs)==1 else None
  samples=list({tuple(v) for t in ts for v in t});samples += [tuple(sum(v[k] for v in t)/3 for k in range(3)) for t in ts]
  shape={'triangles':ts,'box':box,'convex':None if box else P.convex_planes(ts),'samples':samples,'bounds':c['physicalBounds']}
  if box:shape['convex']=[(ax,M.dot(ax,box['centre'])+box['halfExtents'][j]) for j,axis in enumerate(box['axes']) for ax in (axis,[-x for x in axis])]
  shapes[cid]=shape
  if c['physicalMaterial'] not in ('timber','stone','timber-covering') or c['role'] in ('door','awning'):continue
  b=c['physicalBounds']
  for x in range(math.floor(b['min'][0]/4),math.floor(b['max'][0]/4)+1):
   for y in range(math.floor(b['min'][1]/4),math.floor(b['max'][1]/4)+1):
    for z in range(math.floor(b['min'][2]/4),math.floor(b['max'][2]/4)+1):bins[x,y,z].add(cid)
 def region(c,bounds,point=None):return {'frame':'emitted-world','bounds':bounds,'geometryRefs':geom_refs(c),'witnessPoint':point,'boundsMeaning':'local selector only; exact effective source geometry remains authoritative'}
 def embedded_record(child,parent,proof,origin):
  c,p=by[child],by[parent];b=bounded_overlap(c['physicalBounds'],p['physicalBounds']);assert all(b['max'][k]>=b['min'][k]-EPS for k in range(3));point=proof.get('worldWitness')
  return {'childCarrierId':child,'parentCarrierId':parent,'kind':'fixed-embed','groundAnchor':False,'evidence':proof,'origin':origin,'childRegion':region(c,b,point),'parentRegion':region(p,b,point),'patchScope':'actual local effective-geometry overlap; never a whole-long-carrier support/retirement switch'}
 # Apply only exact accepted support sets from the c791 evidence.
 for item in proposal['supportAttachments']:
  c=by[item['carrierId']];parents=item['proposedParentCarrierIds'];matches={r['carrierId']:r for r in item['verifiedEmbeddedCandidates']}
  if parents:
   c['supportCarrierIds']=list(parents);c['supportEvidence']=[]
   for pid in parents:
    proof=matches[pid]['evidence'];c['attachmentRecords'].append(embedded_record(c['id'],pid,proof,'exact accepted c791 fixed join'));c['supportEvidence'].append({'carrierId':pid,'kind':'approved-fixed-embed','evidence':proof})
   c['supportResolution']='approved-fixed-embed-local-joins'
  else:
   ass=item['authoredParentAssembly'];parents=ass['proposedParentCarrierIds'];c['supportCarrierIds']=list(parents);c['supportEvidence']=[]
   for pid in parents:
    child_box,parent_box=shapes[c['id']]['box'],shapes[pid]['box'];assert child_box and parent_box
    pp=parent_box['centre'][:]
    for _ in range(12):cp=closest_obb(pp,child_box);pp=closest_obb(cp,parent_box)
    cp=closest_obb(pp,child_box);gap=math.dist(cp,pp);assert gap>EPS
    cr=min(child_box['halfExtents']);pr=min(parent_box['halfExtents']);proof={'kind':'declared-fixed-assembly-mount','sourceAssemblyId':ass['id'],'sourcePath':ass['sourcePath'],'gapMetres':gap,'geometricBearing':False,'acceptedAuthority':'fe29be3a174121914cc762e1bc9f10004186fb65'}
    c['attachmentRecords'].append({'childCarrierId':c['id'],'parentCarrierId':pid,'kind':'fixed-assembly-mount','groundAnchor':False,'evidence':proof,'origin':'exact accepted 12 declared mount sets','childRegion':region(c,point_bounds(cp,cr,c['physicalBounds']),cp),'parentRegion':region(by[pid],point_bounds(pp,pr,by[pid]['physicalBounds']),pp),'patchScope':'mount points on the actual local child and parent members; gaps remain open to geometry queries'})
    c['supportEvidence'].append({'carrierId':pid,'kind':'approved-declared-mount','gapMetres':gap,'geometricBearing':False})
   c['supportResolution']='approved-fixed-assembly-mount-local'
 # Real bearing/embed evidence for the 104 new carriers. No new declared mount fallback.
 candidates={};face_cache={}
 def faces(cid):
  if cid not in face_cache:face_cache[cid]=M.face_triangles(shapes[cid]['triangles'],by[cid]['physicalBounds'])
  return face_cache[cid]
 for cid in new_ids:
  c=by[cid];b=c['physicalBounds'];near=set()
  for x in range(math.floor((b['min'][0]-EPS)/4),math.floor((b['max'][0]+EPS)/4)+1):
   for y in range(math.floor((b['min'][1]-EPS)/4),math.floor((b['max'][1]+EPS)/4)+1):
    for z in range(math.floor((b['min'][2]-EPS)/4),math.floor((b['max'][2]+EPS)/4)+1):near.update(bins[x,y,z])
  found=[]
  for pid in sorted(near-{cid}):
   p=by[pid];pb=p['physicalBounds']
   if any(min(b['max'][k],pb['max'][k])<max(b['min'][k],pb['min'][k])-EPS for k in range(3)):continue
   overlap=all(min(b['max'][k],pb['max'][k])-max(b['min'][k],pb['min'][k])>EPS for k in range(3))
   proof=P.intersection_proof(shapes[cid],shapes[pid]) if overlap else None
   if proof:found.append(embedded_record(cid,pid,proof,'new accepted material/cut carrier measured source overlap'));continue
   if abs(b['min'][1]-pb['max'][1])<EPS:
    polygons=[intersection_polygon(x,y) for x in faces(cid).get((1,'min'),[]) for y in faces(pid).get((1,'max'),[])];polygons=[x for x in polygons if M.polygon_area(x)>1e-8];area=sum(M.polygon_area(x) for x in polygons)
    if area>1e-6:
     poly=polygons[0];xz=[sum(p[k] for p in poly)/len(poly) for k in range(2)];cp=[xz[0],b['min'][1],xz[1]];pp=[xz[0],pb['max'][1],xz[1]];bb=bounded_overlap(b,pb);bb['min'][1]=b['min'][1];bb['max'][1]=b['min'][1]
     found.append({'childCarrierId':cid,'parentCarrierId':pid,'kind':'bearing-face','groundAnchor':False,'origin':'new accepted material/cut carrier actual horizontal source faces','evidence':{'kind':'positive-area-coplanar-horizontal-triangle-contact','areaMetresSquared':area,'toleranceMetres':EPS},'childRegion':region(c,bb,cp),'parentRegion':region(p,{**bb,'min':[bb['min'][0],pb['max'][1],bb['min'][2]],'max':[bb['max'][0],pb['max'][1],bb['max'][2]]},pp),'patchScope':'actual local bearing face only'})
  candidates[cid]=found
 graph=collections.defaultdict(set);dist={};queue=collections.deque()
 for cid,rows in candidates.items():
  for row in rows:
   pid=row['parentCarrierId'];graph[cid].add(pid);graph[pid].add(cid)
   if pid not in new_ids and pid not in dist:dist[pid]=0;queue.append(pid)
 while queue:
  pid=queue.popleft()
  for cid in sorted(graph[pid]):
   if cid not in dist:dist[cid]=dist[pid]+1;queue.append(cid)
 unsupported=[]
 for cid in new_ids:
  c=by[cid];rows=[r for r in candidates[cid] if dist.get(r['parentCarrierId'],999)<dist.get(cid,999)];c['attachmentRecords']=rows;c['supportCarrierIds']=sorted({r['parentCarrierId'] for r in rows});c['supportEvidence']=[{'carrierId':r['parentCarrierId'],'kind':r['kind'],'evidence':r['evidence']} for r in rows]
  c['supportResolution']='measured-local-parent-joins' if rows else 'additional-unsupported-source-no-grounding';c['distanceToDocumentedNativeCarrier']=dist.get(cid)
  if not rows:unsupported.append({'carrierId':cid,'sourcePartIds':c['sourcePartIds'],'role':c['role'],'reason':'No positive-area bearing or positive-volume embed path to an already documented native carrier. No extra declared mount or earth anchor is authorized.','potentialMeasuredParentLinks':candidates[cid],'bounds':c['physicalBounds']})
 # Concrete additional mount proposals are evidence only, never applied to the 10 exceptions.
 additional_mounts=[]
 for sign in ('--1','-1'):
  cid='carrier/entry/medallion'+sign;c=by[cid];options=[]
  for pid,parent in by.items():
   if parent['role'] not in ('exterior-wall','perimeter-closure') or not any(x.startswith('main/0/') for x in parent['sourcePartIds']) or not shapes[pid]['box']:continue
   pb=parent['physicalBounds']
   if abs(pb['min'][2]-c['physicalBounds']['max'][2]-.02)>.0001:continue
   for cp in shapes[cid]['samples']:
    if abs(cp[2]-c['physicalBounds']['max'][2])>EPS:continue
    pp=closest_obb(cp,shapes[pid]['box']);gap=math.dist(cp,pp)
    if .0199<gap<.0201 and abs(cp[0]-pp[0])<EPS and abs(cp[1]-pp[1])<EPS:
     options.append((round(gap,9),pid,tuple(cp),tuple(pp)))
  assert options,'Missing concrete medallion standoff proposal: '+cid
  _,pid,cp,pp=min(options);members=[x for x in unsupported if x['sourcePartIds'][0].startswith(('entry/cameo-','entry/medallion')) and x['sourcePartIds'][0].endswith(sign) and (sign=='--1' or not x['sourcePartIds'][0].endswith('--1'))]
  additional_mounts.append({'proposedChildCarrierId':cid,'proposedParentCarrierId':pid,'kind':'fixed-assembly-mount','applied':False,'authorityRequired':True,'groundAnchor':False,'affectedUnsupportedCarrierIds':[x['carrierId'] for x in members],'reason':'Medallion assembly has actual internal overlaps but its backing disc stands about 20 mm off the real facade.','childRegion':region(c,point_bounds(cp,.05,c['physicalBounds']),cp),'parentRegion':region(by[pid],point_bounds(pp,.05,by[pid]['physicalBounds']),pp),'gapMetres':math.dist(cp,pp),'geometricBearing':False})
 for side in ('east','west'):
  cid='carrier/tower-'+side+'/terminal';pid='carrier/tower-'+side+'/cap-hip';c=by[cid];peak=max(shapes[pid]['samples'],key=lambda p:p[1]);bottom=[p for p in shapes[cid]['samples'] if abs(p[1]-c['physicalBounds']['min'][1])<EPS];cp=min(bottom,key=lambda p:math.dist(p,peak));additional_mounts.append({'proposedChildCarrierId':cid,'proposedParentCarrierId':pid,'kind':'fixed-assembly-mount','applied':False,'authorityRequired':True,'groundAnchor':False,'affectedUnsupportedCarrierIds':[cid],'reason':'Finial foot meets the roof apex at a point; no positive-area bearing or embedded fastening is modelled.','childRegion':region(c,point_bounds(cp,.05,c['physicalBounds']),cp),'parentRegion':region(by[pid],point_bounds(peak,.05,by[pid]['physicalBounds']),peak),'pointSeparationMetres':math.dist(cp,peak),'bearingArea':0,'geometricBearing':False})
 assert len(additional_mounts)==4
 # Apply only the four exact accepted extra mounts, then reconnect the real internal joins.
 extra_authority=subprocess.check_output(['git','rev-parse','400eb8bc'],cwd=ROOT,text=True).strip()
 expected_pairs={'carrier/entry/medallion--1':'carrier/main/0/cell-4-18/1','carrier/entry/medallion-1':'carrier/main/0/cell-4-28/1','carrier/tower-east/terminal':'carrier/tower-east/cap-hip','carrier/tower-west/terminal':'carrier/tower-west/cap-hip'}
 assert {r['proposedChildCarrierId']:r['proposedParentCarrierId'] for r in additional_mounts}==expected_pairs
 applied_mounts=[];mounted=set()
 for proposed in additional_mounts:
  cid,pid=proposed['proposedChildCarrierId'],proposed['proposedParentCarrierId'];c=by[cid];gap=proposed.get('gapMetres',proposed.get('pointSeparationMetres'));proof={'kind':'explicit-fixed-assembly-mount','authorityCommit':extra_authority,'gapMetres':gap,'geometricBearing':False,'mountType':'socket-at-point-contact' if '/terminal' in cid else 'stand-off-backing-mount','bearingArea':0 if '/terminal' in cid else None}
  c['attachmentRecords']=[{'childCarrierId':cid,'parentCarrierId':pid,'kind':'fixed-assembly-mount','groundAnchor':False,'evidence':proof,'origin':'four exact additional mounts accepted at '+extra_authority,'childRegion':copy.deepcopy(proposed['childRegion']),'parentRegion':copy.deepcopy(proposed['parentRegion']),'patchScope':'actual local fastening regions only; geometry gap and parent loss retained'}];c['supportCarrierIds']=[pid];c['supportEvidence']=[{'carrierId':pid,'kind':'approved-additional-assembly-mount','evidence':proof}];c['supportResolution']='approved-additional-fixed-assembly-mount-local';mounted.add(cid)
  graph[cid].add(pid);graph[pid].add(cid);dist[pid]=0;queue.append(pid)
  applied_mounts.append({**copy.deepcopy(proposed),'applied':True,'authorityRequired':False,'authorityCommit':extra_authority})
 while queue:
  pid=queue.popleft()
  for cid in sorted(graph[pid]):
   if cid not in dist:dist[cid]=dist[pid]+1;queue.append(cid)
 unsupported=[]
 for cid in new_ids:
  c=by[cid]
  if cid not in mounted:
   rows=[r for r in candidates[cid] if dist.get(r['parentCarrierId'],999)<dist.get(cid,999)];c['attachmentRecords']=rows;c['supportCarrierIds']=sorted({r['parentCarrierId'] for r in rows});c['supportEvidence']=[{'carrierId':r['parentCarrierId'],'kind':r['kind'],'evidence':r['evidence']} for r in rows];c['supportResolution']='measured-local-parent-joins' if rows else 'additional-unsupported-source-no-grounding'
  c['distanceToDocumentedNativeCarrier']=dist.get(cid)
  if not c['supportCarrierIds']:unsupported.append({'carrierId':cid,'sourcePartIds':c['sourcePartIds'],'role':c['role'],'reason':'Still lacks a real/explicitly authorized parent; no grounding fallback.','potentialMeasuredParentLinks':candidates[cid],'bounds':c['physicalBounds']})
 assert not unsupported
 # Every graphic has exact follow ownership; no cosmetic creates fuel or a broad fallback.
 follow=[]
 for c in a['carriers']:
  for b in c['renderBindings']:
   if b['physicalContribution']=='appearance-only':follow.append({'sourcePartId':b['sourcePartId'],'kind':'awning-stripe','fuelAmount':0,'parentCarrierIds':[c['id']],'localParentSemantics':'any-live-local-parent','localProjection':{'mode':'nearest physical canopy/valance patch in this exact awning','frame':'emitted-world','sourceBounds':b['bounds'],'parentGeometryRefs':geom_refs(c),'fallback':'none'},'finalRetirementCondition':'retire the corresponding local cosmetic region when no live local parent patch remains; full source only after all projected regions are gone','queryOwnership':{'physicalContribution':'appearance-only','independentThermalSurface':False}})
 visual=[]
 for old in base['visualOnlyBindings']:
  item=copy.deepcopy(old);source=item['sourcePartId'];prefix=source.rsplit('/',1)[0];suffixes=['arch','pilaster--1','pilaster-1'] if '/arch-opening/' in source else ['arch','jamb--1','jamb-1','base'];parents=['carrier/'+prefix+'/'+s for s in suffixes if 'carrier/'+prefix+'/'+s in by];assert parents,source
  record={'sourcePartId':source,'kind':'authored-opening-shadow','fuelAmount':0,'parentCarrierIds':parents,'localParentSemantics':'any-live-local-parent','localProjection':{'mode':'nearest declared parent patch within this exact original opening assembly','frame':'emitted-world','sourceBounds':item['renderBinding']['bounds'],'assemblyBounds':M.union([item['renderBinding']['bounds']]+[by[x]['bounds'] for x in parents]),'parentGeometryRefs':[{ 'carrierId':x,'geometryRefs':geom_refs(by[x])} for x in parents],'fallback':'none; no whole-building parent search'},'finalRetirementCondition':'retire local shadow regions when no declared local parent remains; retire full source after all regions lose parents','queryOwnership':{'preserveExistingSourceSolidForScreening':True,'sourcePartId':source,'retireWithActualLocalParentState':True,'fuelAmount':0}}
  follow.append(record);item['followOwnershipSourcePartId']=source;item['retirementDependencyCarrierIds']=parents;item['retirement']='Explicit local followOwnership; no independent fuel, support or whole-building fallback.';visual.append(item)
 assert len({r['sourcePartId'] for r in follow})==len(follow)
 # Summaries count canonical stock once; closures are not additional fuel carriers.
 a['status']='complete artist source/export candidate; shared-runtime and visual acceptance pending'
 a['sourceScene']['preservedSourceEvidencePath']=base['sourceScene']['evidencePath'];a['sourceScene']['evidencePath']=EVIDENCE
 a['sourceScene']['preservedPilotBindings']={'path':INPUT,'sha256':sha(INPUT),'commit':'59b9373f47d51531c7e505613f67dd1e426b37f1'}
 a['effectiveGeometryOverlay']={'version':1,'indexPath':OVERLAY,'sha256':sha(OVERLAY)}
 a['completionAuthority']=policy_records();a['unassignedBindings']=[];a['visualOnlyBindings']=visual;a['followOwnership']=follow
 a['retirementPolicy']={'fuelOwnership':'canonical carrier once, across all components/sections/local thermal patches','physicalState':'local effective native geometry patches','singleHotPatchRetiresWholeCarrier':False,'disconnectedComponents':'same finite fuel account does not create a rigid or thermal bridge across empty space','support':'evaluate each witnessed local join at its child and parent region; no whole-carrier all-parent failure shortcut','cosmetics':'explicit local followOwnership only; never duplicate fuel or resurrect a retired physical patch'}
 a['sourceFacts']['geometry']='Original emitted source is preserved. Exactly 29 explicit additive effective replacements drive every physical and visual consumer; before/after hashes and retained topology proofs are versioned.'
 a['gameplayAssignments']['authority']='Accepted exact c791 coverage at fe29be3a174121914cc762e1bc9f10004186fb65; retained topology amendment 2ec28370bdb7e0b4c57b687a5b58f8b2d78215ae; independent policy snapshots in completion evidence.'
 a['geometryPolicy']['retirement']='Local effective-geometry retirement under retirementPolicy; a canonical fuel account is not whole-long-part state. All consumers share the same effective buffer.'
 a['geometryPolicy']['support']='Approved exact local fixed embeds/mounts plus measured new-carrier bearing/embed records. Actual gaps preserved; existing native base evidence retained; no new ground anchor.'
 roles=collections.Counter(c['role'] for c in a['carriers']);a['coverage'].update(carriers=len(a['carriers']),assignedSourceParts=sum(len(c['sourcePartIds']) for c in a['carriers']),sourceTriangles=sum(b['triangleCount'] for c in a['carriers'] for b in c['renderBindings'])+sum(v['renderBinding']['triangleCount'] for v in visual),preservedOriginalSourceTriangles=base['coverage']['sourceTriangles'],byRole=dict(sorted(roles.items())),unassignedSourceIds=[],supportUnresolvedCarrierIds=[x['carrierId'] for x in unsupported],visualRetirementUnresolvedSourceIds=[],geometryChanges=29,profileConstantsChanged=0,newGroundAnchors=0)
 a['coverage']['noDirectBearingCarrierIds']=[c['id'] for c in a['carriers'] if not c['supportCarrierIds'] and not c['anchors']]
 fuel=collections.defaultdict(float)
 for c in a['carriers']:
  if c['fuelClass']:fuel[c['fuelClass']]+=c['fuelAmount']
 a['finiteLedger'].update(coreByClass={k:q(v) for k,v in sorted(fuel.items())},coreTotal=q(sum(fuel.values())),finishTotal=.1,total=q(sum(fuel.values())+.1),unassignedExcluded=False,unverifiedClosedVolumeExcluded=False)
 a['remainingExceptions']={'additionalUnsupportedCarriers':unsupported,'additionalMountProposalsNotApplied':[],'appliedAdditionalMounts':applied_mounts,'beforeAdditionalMountEvidencePath':'art/source/shared-map-fire-bindings/completion-v1/before-additional-mounts.json','runtimeAndVisualAcceptance':False,'preservedBaseSupportEvidence':'Original documented native supportCarrierIds/supportEvidence remain; new typed records are exact approved joins/mounts or measured additional source joins.'}
 a['evidence']={'path':EVIDENCE,'geometryEvidencePath':'art/source/shared-map-fire-bindings/completion-v1/geometry-evidence.json','preservedSourceEvidencePath':base['sourceScene']['evidencePath'],'rendererStarted':False}
 evidence={'version':1,'placeId':'new-york','inputBindings':{'path':INPUT,'sha256':sha(INPUT)},'overlay':a['effectiveGeometryOverlay'],'authorityEvidence':a['completionAuthority'],'newCarrierIds':new_ids,'acceptedEmbeddedCarrierIds':[r['carrierId'] for r in proposal['supportAttachments'] if r['proposedParentCarrierIds']],'acceptedMountCarrierIds':[r['carrierId'] for r in proposal['supportAttachments'] if not r['proposedParentCarrierIds']],'newSourceParentCandidates':candidates,'additionalUnsupportedCarriers':unsupported,'additionalMountProposalsNotApplied':[],'appliedAdditionalMounts':applied_mounts,'beforeAdditionalMountEvidencePath':'art/source/shared-map-fire-bindings/completion-v1/before-additional-mounts.json','followOwnershipCount':len(follow),'finiteLedger':a['finiteLedger'],'coverage':a['coverage'],'authoringSources':[{'path':p,'sha256':sha(p)} for p in ['art/source/shared-map-fire-bindings/completion-v1/export-bindings.py','art/source/shared-map-fire-bindings/completion-v1/effective-geometry.mjs','art/source/shared-map-fire-bindings/completion-v1/export-geometry.mjs','art/source/shared-map-fire-bindings/completion-v1/check-completion.py','art/source/shared-map-fire-bindings/completion-v1/.gitattributes']],'originalGeometryAndPilotChanged':False,'newGroundAnchors':0,'rendererStarted':False}
 return a,evidence

def encode(a):return M.encode(a)
if __name__=='__main__':
 a,e=build();payload=encode(a);proof=json.dumps(e,indent=2,sort_keys=True)+'\n'
 if '--check' in sys.argv:
  assert (ROOT/OUTPUT).read_text(encoding='utf-8')==payload
  assert (ROOT/EVIDENCE).read_text(encoding='utf-8')==proof
 else:(ROOT/OUTPUT).write_text(payload,encoding='utf-8',newline='\n');(ROOT/EVIDENCE).write_text(proof,encoding='utf-8',newline='\n')
 print(json.dumps({'passed':True,'carriers':len(a['carriers']),'unassigned':len(a['unassignedBindings']),'newCarrierCount':len(e['newCarrierIds']),'newCarrierUnsupported':[x['carrierId'] for x in e['additionalUnsupportedCarriers']],'followOwnership':len(a['followOwnership']),'finiteLedger':a['finiteLedger'],'sourceTriangles':a['coverage']['sourceTriangles'],'rendererStarted':False}))
