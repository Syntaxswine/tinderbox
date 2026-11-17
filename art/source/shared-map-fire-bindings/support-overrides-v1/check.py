"""Independent exact-scope and physical-source checks of ten additive support overrides."""
from pathlib import Path
import argparse,collections,copy,hashlib,importlib.util,json,math,subprocess,sys
sys.dont_write_bytecode=True
HERE=Path(__file__).resolve().parent;ROOT=HERE.parents[3]
def mod(name,path):
 s=importlib.util.spec_from_file_location(name,ROOT/path);m=importlib.util.module_from_spec(s);s.loader.exec_module(m);return m
M=mod('original_binding_math','art/source/shared-map-fire-bindings/export.py');P=mod('original_overlap_math','art/source/shared-map-fire-bindings/propose-new-york-coverage.py')
PATH='assets/art/shared-map-support-overrides/new-york-controls-v1.json';BASE='assets/art/shared-map-fire-bindings/new-york-complete-v1.json';OVERLAY='assets/art/shared-map-derived-geometry/new-york/v1/index.json'
BASE_SHA='407c0f8bd582f8d95b9ade1471cd51892ac7b9a40fd2c005696bcc5485991eba';OVERLAY_SHA='f1252c7364adfeb025f573fc4650020e71915a3e17e71bcf2e725e56c3f1c941'
EXPECTED={
 ('carrier/ny-front/jamb--1','carrier/main-floor/tile--2-0'):('fixed-embed','portal-jamb-to-floor'),
 ('carrier/ny-front/jamb-1','carrier/main-floor/tile-1-0'):('fixed-embed','portal-right-jamb-to-floor'),
 ('carrier/ny-front/header','carrier/ny-front/jamb--1'):('fixed-embed','portal-header-to-fixed-jamb'),
 ('carrier/ny-front/header','carrier/ny-front/jamb-1'):('fixed-embed','portal-header-to-right-fixed-jamb'),
 ('carrier/main/0/frieze-1/jamb--1','carrier/main/0/cell-7-7/1'):('fixed-embed','window-jamb-to-wall'),
 ('carrier/edge-0/cornice-1','carrier/main/0/cell-3-0/1'):('fixed-embed','cornice-to-wall'),
 ('carrier/clerestory/front-rail/base','carrier/clerestory/cornice'):('fixed-embed','clerestory-base-to-existing-cornice'),
 ('carrier/ny-main-flight-2/handrail--1','carrier/ny-main-flight-2/post--1-10'):('fixed-embed','sloped-handrail-to-interior-post'),
 ('carrier/visit-cap/ny-side-approach--1/7','carrier/porch-west-1'):('structural-seam','closure-cap-to-actual-deck'),
 ('carrier/upper-terrace/rail-front/cap-2','carrier/upper-terrace/rail-front/pier-2'):('carpentry-butt-joint','cap-to-parent-pier')}
def sha(path):return hashlib.sha256((ROOT/path).read_bytes()).hexdigest()
def read(path):return json.loads((ROOT/path).read_text(encoding='utf-8'))
def point_on_surface(p,ts):
 for t in ts:
  e,f,q=M.sub(t[1],t[0]),M.sub(t[2],t[0]),M.sub(p,t[0]);n=M.cross(e,f);ln=math.sqrt(M.dot(n,n))
  if ln<1e-12 or abs(M.dot(n,q))/ln>2e-5:continue
  ee,ff,ef,qe,qf=M.dot(e,e),M.dot(f,f),M.dot(e,f),M.dot(q,e),M.dot(q,f);d=ee*ff-ef*ef
  if abs(d)<1e-24:continue
  v=(ff*qe-ef*qf)/d;w=(ee*qf-ef*qe)/d
  if min(1-v-w,v,w)>-1e-6:return True
 return False

def main():
 parser=argparse.ArgumentParser(description=__doc__);parser.add_argument('--record',action='store_true');args=parser.parse_args()
 a=read(PATH);base=read(BASE);by={c['id']:c for c in base['carriers']};before=read('art/source/shared-map-fire-bindings/reachability-review-v1/proposal.json');proposed={(r['childCarrierId'],r['parentCarrierId']):r for r in before['proposedLocalPairs']};study=read('art/source/shared-map-fire-bindings/reachability-review-v1/review-evidence.json');measurements={e['case']:e for e in study['targetPairEvidence']};native=read('art/source/shared-map-fire-bindings/reachability-review-v1/native-contact-results.json');native_by={r['case']:r for r in native['controls']};geoms={};shapes={};checks=collections.Counter()
 def check(ok,label):
  assert ok,label
  checks[label.split(':')[0]]+=1
 def shape(cid):
  if cid in shapes:return shapes[cid]
  c=by[cid];physical=[b for b in c['renderBindings'] if b['physicalContribution']=='carrier-solid'];ts=[]
  for b in physical:
   path=b['geometryPath']
   if path not in geoms:geoms[path]=read(path)
   ts.extend(M.triangles(geoms[path],b['matrix'],b.get('sourceRange')))
  vertices={tuple(p) for t in ts for p in t};samples=[list(p) for p in vertices]+[[sum(p[k] for p in t)/3 for k in range(3)] for t in ts]
  box=P.box_description(geoms[physical[0]['geometryPath']],physical[0]) if len(physical)==1 else None
  result={'triangles':ts,'convex':P.convex_planes(ts),'box':box,'samples':samples};shapes[cid]=result;return result
 def validate(value):
  check(set(value)=={'version','placeId','scope','baseBindings','effectiveGeometryOverlay','coordinateFrame','authority','contract','joins','retiredSupportInterpretations','sourceEvidence','geometryAdditions','fuelChanges','profileChanges','groundAnchorAdditions'},'schema:only support descriptor fields')
  check(value['version']==1 and value['placeId']=='new-york','schema:version and place')
  check(value['baseBindings']=={'path':BASE,'sha256':BASE_SHA} and sha(BASE)==BASE_SHA,'pin:accepted completed bindings')
  check(value['effectiveGeometryOverlay']=={'indexPath':OVERLAY,'sha256':OVERLAY_SHA} and sha(OVERLAY)==OVERLAY_SHA,'pin:accepted effective index')
  check(value['coordinateFrame']==base['coordinateFrame'],'frame:exact original emitted-world frame')
  check(all(value[k]==0 for k in ('geometryAdditions','fuelChanges','profileChanges','groundAnchorAdditions')),'scope:no geometry fuel profile or anchors')
  for key,commit,path,snapshot in [('authority','01da2407d22dcb9dbfb607a7559ed8c56c379ba5','docs/milestones/29-shared-gameplay-maps.md','authority-01da2407.md'),('contract','6a01e2bb1281fcb037c25208d0a70b35442c9c1c','docs/engineering/shared-maps/support-overrides-contract.md','contract-6a01e2bb.md')]:
   row=value[key];data=subprocess.check_output(['git','show',commit+':'+path],cwd=ROOT)
   check(row=={'commit':commit,'path':path,'snapshotPath':str((HERE/snapshot).relative_to(ROOT)).replace('\\','/'),'sha256':hashlib.sha256(data).hexdigest()} and (HERE/snapshot).read_bytes()==data,'authority:exact committed snapshot '+key)
  joins=value['joins'];keys=[(r['childCarrierId'],r['parentCarrierId']) for r in joins]
  check(len(keys)==10 and len(set(keys))==10 and set(keys)==set(EXPECTED),'scope:exact ten approved pairs only')
  check(collections.Counter(r['kind'] for r in joins)=={'fixed-embed':8,'structural-seam':1,'carpentry-butt-joint':1},'scope:exact eight seam butt kinds')
  for join in joins:
   pair=join['childCarrierId'],join['parentCarrierId'];kind,case=EXPECTED[pair];original=proposed[pair];measured=measurements[case]
   check(join['kind']==kind and join['direction']==('symmetric-structural' if kind=='structural-seam' else 'parent-to-child'),'scope:exact approved direction '+case)
   check(join['groundAnchor'] is False and join['wholeCarrierRetirement'] is False,'scope:local dependency no anchor '+case)
   check(join['evidence']['caseId']==case and join['evidence']['nativeTriangleContact'] is True and native_by[case]['nativeContact'] is True,'native:preserved actual triangle contact '+case)
   check(all(join['evidence'][k]==measured[k] for k in ['positiveVolumeProof','commonStrictInteriorWitness','actualSurfaceWitness','boundsGapLowerBoundMetres','separatingProjectionGapLowerBoundMetres','closestVertexToTriangleUpperBoundMetres']),'evidence:measurements unchanged '+case)
   for name,cid in [('childRegion',pair[0]),('parentRegion',pair[1])]:
    region=join[name];old=original[name]
    check(all(region[k]==old[k] for k in old if k!='geometryRefs'),'region:exact approved bounds frame and witness '+case+'/'+name)
    check(region['boundsMeaning']==old['meaning'] and len(region['geometryRefs'])==len(old['geometryRefs']),'region:exact selector shape '+case+'/'+name)
    for ref,old_ref in zip(region['geometryRefs'],old['geometryRefs']):
     check(all(ref[k]==v for k,v in old_ref.items()),'geometry:original reference matrix and range '+case+'/'+name)
     bindings=[b for b in by[cid]['renderBindings'] if b['physicalContribution']=='carrier-solid' and b['sourcePartId']==ref['sourcePartId'] and b['geometryPath']==ref['geometryPath'] and b['matrix']==ref['matrix'] and b.get('sourceRange')==ref['sourceRange']]
     check(len(bindings)==1 and ref['geometryId']==bindings[0]['geometryId'] and ref['partId']==bindings[0]['partId'] and ref['sha256']==sha(ref['geometryPath']),'geometry:exact actual effective buffer '+case+'/'+name)
    s=shape(cid);point=region['witnessPoint'];inside=s['convex'] and all(M.dot(n,point)<=d+2e-5 for n,d in s['convex'])
    check(inside or point_on_surface(point,s['triangles']),'geometry:witness in actual solid or surface '+case+'/'+name)
   if kind=='fixed-embed':
    proof=P.intersection_proof(shape(pair[0]),shape(pair[1]));check(proof is not None and proof==measured['positiveVolumeProof'],'embed:independent actual positive volume '+case)
   if kind=='carpentry-butt-joint':
    check(join['evidence']['geometricBearing'] is False and join['evidence']['positiveVolumeOverlap'] is False and measured['positiveVolumeProof'] is None,'butt:explicit fastening is not invented volume or bearing')
    check(0<math.dist(*measured['actualSurfaceWitness'])<1e-7,'butt:actual native face precision preserved')
  retired=value['retiredSupportInterpretations'];expected_retired={('carrier/ny-front/header','carrier/ny-front/leaf--1'),('carrier/ny-front/header','carrier/ny-front/leaf-1')}
  check(len(retired)==2 and {(r['childCarrierId'],r['parentCarrierId']) for r in retired}==expected_retired,'retired:only two moving leaf to fixed header interpretations')
  for row in retired:
   check(row['geometryEvidenceRetained'] is True and row['originalEvidenceKind']=='coplanar-horizontal-triangle-contact','retired:contact stays physical evidence')
   check(any(e.get('carrierId')==row['parentCarrierId'] and e['kind']==row['originalEvidenceKind'] for e in by[row['childCarrierId']]['supportEvidence']),'retired:original historical observation still exists')
  for side in ('--1','-1'):
   leaf=by['carrier/ny-front/leaf'+side];hardware=by['carrier/ny-front/handle'+side]
   check(leaf['supportCarrierIds']==['carrier/ny-front/jamb'+side] and leaf['supportEvidence'][0]['kind']=='native-portal-hinge-attachment','preserved:real native hinge')
   check(hardware['supportCarrierIds']==['carrier/ny-front/leaf'+side] and hardware['supportEvidence'][0]['kind']=='native-leaf-hardware-attachment','preserved:real hardware owner')
  check(value['sourceEvidence']['beforeProposalSha256']=='218ef7c7ebd7dfee6de11430bcc49c494b51bb954533c76ac9da21bec662d58c' and sha(value['sourceEvidence']['beforeProposalPath'])==value['sourceEvidence']['beforeProposalSha256'],'evidence:unchanged before proposal')
 validate(a);passing_checks=dict(checks)
 controls=[]
 def reject(name,mutate):
  bad=copy.deepcopy(a);mutate(bad)
  try:validate(bad)
  except AssertionError as error:controls.append({'name':name,'result':'EXPECTED_REJECTION','reason':str(error)})
  else:raise AssertionError('Invalid override accepted: '+name)
 reject('unapproved eleventh pair',lambda b:b['joins'].append(copy.deepcopy(b['joins'][0])))
 reject('unapproved parent',lambda b:b['joins'][0].update(parentCarrierId='carrier/main-parapet-0/base'))
 reject('seam loses exact symmetry',lambda b:next(r for r in b['joins'] if r['kind']=='structural-seam').update(direction='parent-to-child'))
 reject('butt joint falsely becomes volume embed',lambda b:next(r for r in b['joins'] if r['kind']=='carpentry-butt-joint').update(kind='fixed-embed'))
 reject('fabricated ground anchor',lambda b:b['joins'][0].update(groundAnchor=True))
 reject('altered local region',lambda b:b['joins'][0]['childRegion']['bounds']['min'].__setitem__(0,0))
 reject('source offset applied twice',lambda b:b['joins'][0]['childRegion']['geometryRefs'][0]['matrix'].__setitem__(12,b['joins'][0]['childRegion']['geometryRefs'][0]['matrix'][12]+56))
 reject('unreviewed base bindings',lambda b:b['baseBindings'].update(sha256='0'*64))
 reject('fuel addition smuggled into support override',lambda b:b.update(fuelChanges=1))
 reject('new geometry payload smuggled into descriptor',lambda b:b.update(geometryPayload={'attributes':{}}))
 reject('retiring a hinge instead of observed header contact',lambda b:b['retiredSupportInterpretations'][0].update(childCarrierId='carrier/ny-front/leaf--1',parentCarrierId='carrier/ny-front/jamb--1'))
 reject('removing original geometry evidence',lambda b:b['retiredSupportInterpretations'][0].update(geometryEvidenceRetained=False))
 check(sha(BASE)==BASE_SHA and sha(OVERLAY)==OVERLAY_SHA,'preserved:accepted art byte pins after all controls')
 protected=['assets/art/place-scenes','assets/art/shared-map-fire-bindings','assets/art/shared-map-derived-geometry','assets/art/exposition-new-york','assets/art/exposition-new-york-tile','assets/art/exploration-access','art/source/exploration-access','art/source/shared-map-fire-bindings/completion-v1','vendor','workbenches/art/check-exposition-new-york-tile.mjs','workbenches/art/check-exploration-access.mjs']
 check(subprocess.run(['git','diff','--quiet','90c226f674d51a2d030fcdd4679e61a3bdd9ebfe','--',*protected],cwd=ROOT).returncode==0,'preserved:accepted art raw history vendor and historical checkers')
 evidence=read('art/source/shared-map-fire-bindings/support-overrides-v1/export-evidence.json')
 for row in evidence['authoringSources']+evidence['reviewEvidence']:check(sha(row['path'])==row['sha256'],'hash:source and archived receipt')
 check({r['id'] for r in evidence['beforeFixtureSupportRows']}=={r['childCarrierId'] for r in a['joins']},'history:exact affected children before state')
 for row in evidence['beforeFixtureSupportRows']:check(all(by[row['id']].get(k)==v for k,v in row.items()),'history:original support material stock and bounds preserved')
 check(evidence['baseFiniteLedger']==base['finiteLedger'] and evidence['baseCarriers']==12446,'preserved:all stock quantities and original owners')
 result={'version':1,'result':'PASS','descriptorPath':PATH,'descriptorSha256':sha(PATH),'descriptorBytes':(ROOT/PATH).stat().st_size,'baseBindingsSha256':sha(BASE),'effectiveOverlaySha256':sha(OVERLAY),'checks':passing_checks,'joinCount':10,'kinds':dict(collections.Counter(r['kind'] for r in a['joins'])),'retiredInterpretationCount':2,'negativeControls':controls,'negativeControlCount':len(controls),'existingNativeContactReceiptSha256':sha('art/source/shared-map-fire-bindings/reachability-review-v1/native-contact-results.json'),'geometryChanges':0,'fuelChanges':0,'groundAnchorAdditions':0,'runtimeBehaviorAcceptance':False,'parapetProposalApplied':False,'rendererStarted':False}
 if args.record:(HERE/'check-results.json').write_text(json.dumps(result,indent=2,sort_keys=True)+'\n',encoding='utf-8',newline='\n')
 print(json.dumps(result,sort_keys=True))
if __name__=='__main__':main()
