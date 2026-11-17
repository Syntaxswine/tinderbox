"""Independent CPU/source checks of the additive NY completion; never starts a renderer."""
from pathlib import Path
import collections, hashlib, importlib.util, json, math, re, struct, subprocess, sys
sys.dont_write_bytecode=True
ROOT=Path(__file__).resolve().parents[4];HERE=Path(__file__).parent
s=importlib.util.spec_from_file_location('original_binding_math',HERE.parent/'export.py');M=importlib.util.module_from_spec(s);s.loader.exec_module(M)
checks=collections.Counter()
def check(ok,label):
 assert ok,label
 checks[label.split(':')[0]]+=1

def read(path):return json.loads((ROOT/path).read_text(encoding='utf-8'))
def sha(path):return hashlib.sha256((ROOT/path).read_bytes()).hexdigest()
def near(a,b,tol=3e-5):return abs(a-b)<=tol

def bary(p,t):
 a,b,q=M.sub(t[1],t[0]),M.sub(t[2],t[0]),M.sub(p,t[0]);aa,bb,ab,qa,qb=M.dot(a,a),M.dot(b,b),M.dot(a,b),M.dot(q,a),M.dot(q,b);d=aa*bb-ab*ab;v=(bb*qa-ab*qb)/d;w=(aa*qb-ab*qa)/d;return [1-v-w,v,w]
def area(t):n=M.cross(M.sub(t[1],t[0]),M.sub(t[2],t[0]));return math.sqrt(M.dot(n,n))/2

def clip_y(poly,height,above):
 out=[]
 for a,b in zip(poly,poly[1:]+poly[:1]):
  da=(a[1]-height)*(1 if above else -1);db=(b[1]-height)*(1 if above else -1);ia,ib=da>=0,db>=0
  if ia:out.append(a)
  if ia!=ib:
   t=da/(da-db);out.append([a[k]+t*(b[k]-a[k]) for k in range(3)])
 return out

def point_segment(p,a,b):
 d=[b[k]-a[k] for k in range(2)];dd=sum(x*x for x in d);t=max(0,min(1,sum((p[k]-a[k])*d[k] for k in range(2))/dd)) if dd else 0
 return math.dist(p,[a[k]+t*d[k] for k in range(2)])
def segment_distance(a,b,c,d):
 def side(p,q,r):return (q[0]-p[0])*(r[1]-p[1])-(q[1]-p[1])*(r[0]-p[0])
 v=[side(a,b,c),side(a,b,d),side(c,d,a),side(c,d,b)]
 if v[0]*v[1]<0 and v[2]*v[3]<0:return 0
 return min(point_segment(a,c,d),point_segment(b,c,d),point_segment(c,a,b),point_segment(d,a,b))
def sweep_distance(a,b,poly):
 if not poly:return float('inf')
 if len(poly)>2 and M.polygon_area(poly)>1e-10:
  for p in (a,b):
   signs=[(y[0]-x[0])*(p[1]-x[1])-(y[1]-x[1])*(p[0]-x[0]) for x,y in zip(poly,poly[1:]+poly[:1])]
   if min(signs)>=-1e-10 or max(signs)<=1e-10:return 0
 return min(segment_distance(a,b,x,y) for x,y in zip(poly,poly[1:]+poly[:1])) if len(poly)>1 else point_segment(poly[0],a,b)

def on_surface(point,ts):
 for t in ts:
  n=M.cross(M.sub(t[1],t[0]),M.sub(t[2],t[0]));ln=math.sqrt(M.dot(n,n))
  if ln<1e-10:continue
  if abs(M.dot(n,M.sub(point,t[0])))/ln>2e-5:continue
  if min(bary(point,t))>=-1e-6:return True
 return False

def main():
 base=read('assets/art/shared-map-fire-bindings/new-york.json');a=read('assets/art/shared-map-fire-bindings/new-york-complete-v1.json');ev=read('art/source/shared-map-fire-bindings/completion-v1/binding-evidence.json');ovpath=a['effectiveGeometryOverlay']['indexPath'];overlay=read(ovpath);geo_ev=read(overlay['evidencePath']);nav=read(a['sourceScene']['navigationPath']);proposal=read('art/source/shared-map-fire-bindings/new-york-coverage-proposal.json');geoms={}
 check(sha('assets/art/shared-map-fire-bindings/new-york.json')=='7490e3bfeeab4a6080d2c9d97b99fc81bac875d711c83fcbe4c10e34e008b1f9','preserved:accepted pilot bytes')
 check(sha(ovpath)==a['effectiveGeometryOverlay']['sha256'],'hash:effective index')
 check(sha(a['sourceScene']['indexPath'])==a['sourceScene']['sha256'] and sha(a['sourceScene']['navigationPath'])==a['sourceScene']['navigationSha256'],'preserved:original scene and navigation')
 protected=['assets/art/place-scenes','assets/art/exposition-new-york','assets/art/exposition-new-york-tile','assets/art/exploration-access','art/source/exploration-access','workbenches/art/check-exposition-new-york-tile.mjs','workbenches/art/check-exploration-access.mjs','src','vendor']
 check(subprocess.run(['git','diff','--quiet','c791c7b9','--',*protected],cwd=ROOT).returncode==0,'preserved:raw sources runtime and historical checkers')
 check({r['commit'] for r in a['completionAuthority']}=={'fe29be3a174121914cc762e1bc9f10004186fb65','2ec28370bdb7e0b4c57b687a5b58f8b2d78215ae','b509e5c4832c86291e8909a423fe92b8b030b18d','01299a68a7c769353f2f7f005a5969c0b7383f70','400eb8bca7ce4a5cee1196880861f1f14c6b268f'},'policy:exact completion and response authorities')
 for row in a['completionAuthority']:
  data=subprocess.check_output(['git','show',row['commit']+':'+row['path']],cwd=ROOT);check((ROOT/row['snapshotPath']).read_bytes()==data and hashlib.sha256(data).hexdigest()==row['sha256'],'policy:committed accepted authority snapshot')
 def geometry(b):
  p=b['geometryPath']
  if p not in geoms:geoms[p]=read(p)
  return geoms[p]
 overrides={r['sourcePartId']:r for r in overlay['replacements']};evidence={r['sourcePartId']:r for r in geo_ev['parts']};check(len(overrides)==29,'repair:exact replacement count');check(collections.Counter(r['operation'] for r in overrides.values())=={'append-cut-plane-caps':25,'restore-original-closed-jamb':4},'repair:exact operation kinds')
 retessellated=[];effective_tris=[]
 for source,r in overrides.items():
  before=read(r['before']['geometryPath']);after=read(r['after']['geometryPath']);bytes=(ROOT/r['after']['geometryPath']).read_bytes();check(hashlib.sha256(bytes).hexdigest()==r['after']['sha256'] and hashlib.sha256(bytes[:-1]).hexdigest()==r['after']['geometryId'],'hash:effective payload and canonical id');check(sha(r['before']['geometryPath'])==r['before']['sha256'],'hash:before payload preserved')
  ts=M.triangles(after,r['matrix']);facts=M.measures(ts);check(facts['closed'],'repair:independent closed solid');check(len(ts)==r['after']['triangleCount'],'repair:effective triangles');effective_tris.extend((source,t) for t in ts)
  proof=evidence[source];check(proof['closedness']['unmatchedEdges']==0 and proof['closedness']['degenerateTriangles']==0 and proof['closedness']['wrongNormalTriangles']==0,'repair:strict edge winding and normals')
  if r['operation']=='append-cut-plane-caps':
   for name,attr in before['attributes'].items():check(after['attributes'][name]['array'][:len(attr['array'])]==attr['array'],'prefix:original attributes unchanged')
   oldts=M.triangles(before,[1,0,0,0,0,1,0,0,0,0,1,0,0,0,0,1]);newts=M.triangles(after,[1,0,0,0,0,1,0,0,0,0,1,0,0,0,0,1]);maps=proof['sourceToEffectiveTriangleMap']
   for row in maps[:len(oldts)]:
    old=oldts[row['sourceTriangle']];parts=newts[row['afterTriangleStart']:row['afterTriangleStart']+row['afterTriangleCount']]
    if not row['retessellated']:check(parts==[old],'retained:unchanged triangle')
    else:
     retessellated.append(source);normal=M.cross(M.sub(old[1],old[0]),M.sub(old[2],old[0]));nl=math.sqrt(M.dot(normal,normal));check(abs(sum(area(t) for t in parts)-area(old))<1e-7*max(1,area(old)),'retained:independent covered area')
     n=[x/nl for x in normal];u=M.sub(old[1],old[0]);u=[x/math.sqrt(M.dot(u,u)) for x in u];v=M.cross(n,u);projected=[[[M.dot(M.sub(p,old[0]),u),M.dot(M.sub(p,old[0]),v)] for p in t] for t in parts]
     check(sum(M.overlap_area(projected[i],projected[j]) for i in range(len(projected)) for j in range(i+1,len(projected)))<1e-8,'retained:independent nonoverlapping union')
     for j,t in enumerate(parts):
      for k,p in enumerate(t):
       w=bary(p,old);check(min(w)>-1e-7 and abs(M.dot(normal,M.sub(p,old[0])))/nl<1e-7,'retained:coplanar contained subdivision')
       vertex=after['index']['array'][(row['afterTriangleStart']+j)*3+k]
       for name in ('normal','uv','grossUV'):
        item=before['attributes'][name];actual=after['attributes'][name]
        for c in range(item['itemSize']):
         expected=sum(w[q]*item['array'][(row['sourceTriangle']*3+q)*item['itemSize']+c] for q in range(3));value=actual['array'][vertex*item['itemSize']+c];ulp=2**(math.floor(math.log2(abs(expected)))-23) if expected else 2**-149
         check(abs(expected-value)<=max(1e-7,.51*ulp),'retained:independent Float32 shading and paint field')
   check(r['retainedSourceTriangles']['effectiveCount']+r['appendedClosureTriangles']['count']==len(ts),'repair:retained and closure intervals')
  else:
   check(r['retainedSourceTriangles'] is None and r['sourceAttributePrefix'] is None,'repair:restoration does not claim a retained triangle prefix')
   for name,expected in proof['restoredOriginalBuffers'].items():
    values=after['attributes'][name]['array'];check(hashlib.sha256(struct.pack('<'+'f'*len(values),*values)).hexdigest()==expected,'restored:actual original Float32 buffers')
 check(set(retessellated)=={'replacement/edge-1/cornice-1','replacement/edge-11/cornice-1','replacement/porch-east/cornice-1','replacement/porch-west/cornice-1'},'retained:exact four subdivision parts')
 by={c['id']:c for c in a['carriers']};oldby={c['id']:c for c in base['carriers']};check(len(by)==12446,'coverage:canonical carriers');check(not a['unassignedBindings'],'coverage:all accepted materials and closed quantities assigned')
 ids=[x for c in a['carriers'] for x in c['sourcePartIds']]+[v['sourcePartId'] for v in a['visualOnlyBindings']];check(len(ids)==len(set(ids))==12858,'coverage:every logical source owns one record')
 stock=collections.defaultdict(float)
 for cid,c in by.items():
  check(c['fuelAmount']>=0 and math.isfinite(c['fuelAmount']),'fuel:finite source budget')
  if c['fuelClass']:stock[c['fuelClass']]+=c['fuelAmount']
  if cid in oldby:
   check(c['fuelAmount']==oldby[cid]['fuelAmount'] and c['fuelClass']==oldby[cid]['fuelClass'] and c.get('finish')==oldby[cid].get('finish'),'fuel:base amount and finish unchanged')
   check(c['renderBindings']==oldby[cid]['renderBindings'],'preserved:base effective source unaffected')
  else:
   b=c['renderBindings'][0];facts=M.measures(M.triangles(geometry(b),b['matrix']));check(facts['closed'],'fuel:new carrier has closed source')
   expected=facts['volume']/.16 if c['quantityBasis']['rule']=='wall-area' else facts['volume']/.12 if c['fuelClass'] else 0
   check(near(expected,c['fuelAmount']),'fuel:new quantity independently measured')
   if b['sourcePartId'] in overrides:
    r=overrides[b['sourcePartId']];check(b['geometryId']==r['after']['geometryId'] and b['geometryPath']==r['after']['geometryPath'] and b['matrix']==r['matrix'] and b['triangleCount']==r['after']['triangleCount'],'ownership:one effective mesh for all consumers')
   check(not c['anchors'],'support:no new ground anchor')
  for row in c['attachmentRecords']:
   check(row['childCarrierId']==cid and row['parentCarrierId'] in by and row['groundAnchor'] is False,'support:typed known local parents')
   for name in ('childRegion','parentRegion'):
    reg=row[name];check(all(math.isfinite(x) for side in ('min','max') for x in reg['bounds'][side]) and all(reg['bounds']['min'][k]<=reg['bounds']['max'][k]+1e-8 for k in range(3)),'support:finite local regions')
    target=c if name=='childRegion' else by[row['parentCarrierId']];check({r['geometryId'] for r in reg['geometryRefs']}=={b['geometryId'] for b in target['renderBindings'] if b['physicalContribution']=='carrier-solid'},'ownership:support uses effective geometry')
   if row['kind']=='fixed-assembly-mount':
    proof=row['evidence'];check(proof['geometricBearing'] is False and proof['gapMetres']>=0,'support:mount never invents geometric bearing')
    if proof.get('mountType')=='socket-at-point-contact':check(cid in ('carrier/tower-east/terminal','carrier/tower-west/terminal') and proof['authorityCommit']=='400eb8bca7ce4a5cee1196880861f1f14c6b268f' and proof['bearingArea']==0 and proof['gapMetres']<2e-6,'support:only exact authorized point sockets')
    else:check(proof['gapMetres']>2e-5,'support:declared gaps stay real')
    check(near(math.dist(row['childRegion']['witnessPoint'],row['parentRegion']['witnessPoint']),row['evidence']['gapMetres'],1e-8),'support:separate actual mount witnesses')
    for name,target in [('childRegion',c),('parentRegion',by[row['parentCarrierId']])]:
     source_ts=[t for b in target['renderBindings'] if b['physicalContribution']=='carrier-solid' for t in M.triangles(geometry(b),b['matrix'],b.get('sourceRange'))];check(on_surface(row[name]['witnessPoint'],source_ts),'support:mount witness lies on actual effective triangles')
  check(c['retirement']['wholeCarrierRetirementFromSinglePatch'] is False,'retirement:local physical patch scope')
 check({k:round(v,6) for k,v in stock.items()}==a['finiteLedger']['coreByClass'],'fuel:canonical class ledger')
 check(near(sum(stock.values())+.1,a['finiteLedger']['total']),'fuel:total and one coating')
 check([c['id'] for c in a['carriers'] if c.get('finish')]==['carrier/main/0/cell-1-22/1'],'fuel:no extra coating')
 choices={r['sourcePartId']:r for r in proposal['materialChoices']}
 for source,choice in choices.items():
  c=by['carrier/'+source];check(c['physicalMaterial']==choice['physicalMaterial'] and c['fuelClass']==choice['fuelClass'] and c['fuelAmount']==choice['proposedFuelAmount'],'materials:exact accepted per-ID table')
 check(round(sum(by['carrier/'+s]['fuelAmount'] for s in ('entry/entablature','entry/relief-band')),6)==35.300002,'materials:two substantial timber quantities')
 embed={r['carrierId']:r for r in proposal['supportAttachments'] if r['proposedParentCarrierIds']};mount={r['carrierId']:r for r in proposal['supportAttachments'] if not r['proposedParentCarrierIds']}
 for cid,item in embed.items():check(by[cid]['supportCarrierIds']==item['proposedParentCarrierIds'] and all(r['kind']=='fixed-embed' for r in by[cid]['attachmentRecords']),'support:exact accepted 652 sets')
 for cid,item in mount.items():check(by[cid]['supportCarrierIds']==item['authoredParentAssembly']['proposedParentCarrierIds'] and all(r['kind']=='fixed-assembly-mount' for r in by[cid]['attachmentRecords']),'support:exact accepted 12 mount sets')
 unsupported=set(a['coverage']['supportUnresolvedCarrierIds']);check(not unsupported and not ev['additionalUnsupportedCarriers'],'support:all newly accepted sources now have real or explicit parents')
 previous=read(a['remainingExceptions']['beforeAdditionalMountEvidencePath']);check(len(previous['initialUnsupportedCarrierIds'])==10 and len(previous['additionalMountProposalsNotApplied'])==4,'history:before unsupported and proposed mounts retained')
 check(previous['effectiveGeometryOverlay']==a['effectiveGeometryOverlay'] and previous['finiteLedger']==a['finiteLedger'],'history:additional mounts do not change geometry or fuel')
 expected_extra={'carrier/entry/medallion--1':'carrier/main/0/cell-4-18/1','carrier/entry/medallion-1':'carrier/main/0/cell-4-28/1','carrier/tower-east/terminal':'carrier/tower-east/cap-hip','carrier/tower-west/terminal':'carrier/tower-west/cap-hip'}
 applied=a['remainingExceptions']['appliedAdditionalMounts'];check({r['proposedChildCarrierId']:r['proposedParentCarrierId'] for r in applied}==expected_extra and all(r['applied'] and r['authorityCommit']=='400eb8bca7ce4a5cee1196880861f1f14c6b268f' for r in applied),'support:only four exact additional authorized mounts')
 for row in applied:
  old=next(r for r in previous['additionalMountProposalsNotApplied'] if r['proposedChildCarrierId']==row['proposedChildCarrierId']);check(row['childRegion']==old['childRegion'] and row['parentRegion']==old['parentRegion'],'support:accepted actual child and parent regions preserved')
 new_ids=set(ev['newCarrierIds'])
 for cid in new_ids:
  c=by[cid];check(bool(c['supportCarrierIds']) and not c['anchors'],'support:new sources have parents and no ground anchors')
  for pid in c['supportCarrierIds']:
   if pid in new_ids:check(by[pid]['distanceToDocumentedNativeCarrier']<c['distanceToDocumentedNativeCarrier'],'support:new local dependency paths are acyclic')
 check(not a['remainingExceptions']['additionalMountProposalsNotApplied'],'exceptions:no unapplied support proposal silently retained')
 follow=a['followOwnership'];expected={b['sourcePartId'] for c in base['carriers'] for b in c['renderBindings'] if b['physicalContribution']=='appearance-only'}|{v['sourcePartId'] for v in base['visualOnlyBindings']}
 check(len(follow)==352 and {r['sourcePartId'] for r in follow}==expected,'follow:every cosmetic has one owner record')
 for row in follow:check(row['fuelAmount']==0 and row['parentCarrierIds'] and all(p in by for p in row['parentCarrierIds']) and row['localParentSemantics']=='any-live-local-parent' and 'fallback' in row['localProjection'],'follow:explicit real local parent and no fuel')
 # Swept vertical native-envelope controls against every repaired solid. Uses the
 # existing conservative .62 m / 2.3 m art fixture without rescaling any animal.
 animals=read('art/source/exploration-access/animal-envelopes.json')['records'];offset=nav['sourceOffset'];sweeps=[]
 for portal in nav['accessPlan']['portals']:
  pos=[portal['position'][k]+offset[k] for k in range(3)];yaw=portal['heading'];clear=portal['clearWidth']
  for animal in animals:
   r=max(.62,animal['radialEnvelope']);height=max(2.3,animal['fullHeight']+.08);check(animal['nativeScale']==[1,1,1] and 2*r<clear and height<portal['clearHeight'],'native:actual scale and clear dimensions')
   for lateral in (-(clear/2-r-.04),0,(clear/2-r-.04)):
    def horizontal(z):return [pos[0]+math.cos(yaw)*lateral+math.sin(yaw)*z,pos[2]-math.sin(yaw)*lateral+math.cos(yaw)*z]
    start,end=horizontal(-.7),horizontal(.7);minimum=float('inf');hit=None
    for source,t in effective_tris:
     poly=clip_y(clip_y(t,pos[1]+.03,True),pos[1]+height,False)
     if not poly:continue
     distance=sweep_distance(start,end,[[p[0],p[2]] for p in poly])
     if distance<minimum:minimum=distance;hit=source
    check(minimum>=r-1e-6,f'native:effective closed geometry blocks {animal["species"]}/{portal["id"]}/{lateral}: {hit}/{minimum}')
    sweeps.append({'portalId':portal['id'],'species':animal['species'],'lateral':lateral,'radius':r,'height':height,'minimumHorizontalSurfaceDistance':minimum,'passed':True})
 check(len(sweeps)==45,'native:all five portals three animals three lateral routes')
 result={'version':1,'result':'PASS','checks':dict(checks),'carrierCount':len(by),'replacementCount':29,'nativeSweeps':sweeps,'additionalUnsupportedCarrierIds':sorted(unsupported),'completedBindingsSha256':sha('assets/art/shared-map-fire-bindings/new-york-complete-v1.json'),'effectiveIndexSha256':sha(ovpath),'geometryTriangles':a['coverage']['sourceTriangles'],'finiteLedger':a['finiteLedger'],'rendererStarted':False,'actualInputAcceptance':False}
 if '--record' in sys.argv:(HERE/'check-results.json').write_text(json.dumps(result,indent=2,sort_keys=True)+'\n',encoding='utf-8',newline='\n')
 print(json.dumps({k:v for k,v in result.items() if k not in ('nativeSweeps','finiteLedger')},sort_keys=True))
if __name__=='__main__':main()
