"""Independent bounded geometry, bearing, source identity and rejecting-control review."""
from pathlib import Path
from fractions import Fraction as F
from decimal import Decimal
import argparse,collections,copy,hashlib,importlib.util,json,math,subprocess,sys
sys.dont_write_bytecode=True
HERE=Path(__file__).resolve().parent;ROOT=HERE.parents[3]
def module(name,path):
 s=importlib.util.spec_from_file_location(name,path);m=importlib.util.module_from_spec(s);s.loader.exec_module(m);return m
E=module('clear_export',HERE/'export.py')
C=module('clear_source_geometry',HERE.parent/'coverage-family-proposal-v1/geometry.py')
G=C.G
def require(ok,label):
 assert ok,label
def main():
 p=argparse.ArgumentParser(description=__doc__);p.add_argument('--record',action='store_true');args=p.parse_args()
 design,front,base=E.inputs();a=E.read(E.MANIFEST);mesh=E.read(a['geometry']['path']);rows={E.cid(r):r for r in E.selected(design)};by={c['id']:c for c in base['carriers']}
 earlier={m['id'] for m in front['members']};blocked={c['proposalId'] for f in design['families'] for c in f['candidates'] if not c['rectangularRepeatReadyForApproval']}
 counts=collections.Counter()
 def check(ok,label):require(ok,label);counts[label.split(':')[0]]+=1
 def validate(data):
  ids=[m['id'] for m in data['members']]
  require(len(ids)==96 and len(set(ids))==96 and set(ids)==set(rows) and not(set(ids)&(set(by)|earlier)),'scope: exact 96 distinct new IDs, excluding original/front IDs')
  require(all(m['sourceProposalId'] not in blocked for m in data['members']),'scope: obstructed roof-saddle row rejected')
  for m in data['members']:
   r=rows[m['id']]
   require(m['sourceProposalId']==r['proposalId'] and m['matrix']==r['matrix'] and m['bounds']==r['bounds'],'placement: exact approved row identity and dimensions')
   require(not m['groundAnchor'] and m['anchors']==[] and m['finish'] is None,'scope: no anchor or extra finish')
   require(m['fuelAmount']==.0448 and m['fuelClass']=='frame','quantity: same accepted frame prototype amount')
  joins=data['joins'];want={(cid,face) for cid in rows for face in ['bottom','top']}
  require(len(joins)==192 and {(j['evidence']['blockCarrierId'],j['evidence']['blockFace']) for j in joins}==want,'bearing: missing or duplicated lower/upper bearing')
  require(len({j['id'] for j in joins})==192,'bearing: distinct stable selection IDs')
  for j in joins:
   cid=j['evidence']['blockCarrierId'];r=rows[cid];top=j['evidence']['blockFace']=='top';proof=r['actualUpperNativeBearing' if top else 'actualLowerNativeBearing']
   require(j['evidence']['actualBearing']==proof and proof['nativePrecisionToleranceMetres']==1e-5,'bearing: exact witnesses, separation and unchanged native tolerance')
   require((j['childCarrierId'],j['parentCarrierId'])==((r['upperSourceCarrierId'],cid) if top else (cid,r['lowerSourceCarrierId'])),'bearing: fixed original named parent and direction')
   require(j['direction']=='parent-to-child' and not j['groundAnchor'] and not j['wholeCarrierRetirement'],'bearing: local dependency only')
  ledger=data['finiteLedger']
  require(ledger['addedCanonicalAccounts']==96 and ledger['addedCoreByClass']=={'frame':4.3008} and ledger['addedTotal']==4.3008 and ledger['addedFinishTotal']==0,'quantity: separate addition only')
  require(ledger['activationBirth']==ledger['activationRefill']==0 and not any(k in ledger for k in ['total','baseTotal','coreTotal']),'quantity: no combined ledger, birth or refill')
 validate(a)
 for path,data in E.build().items():check((ROOT/path).read_bytes()==data,'determinism: exact source export '+path)
 check(a['geometry']==front['geometry'] and E.sha(a['geometry']['path'])==a['geometry']['sha256'],'geometry: exact shared primitive file')
 check(a['appearanceSource']==front['appearanceSource'] and E.sha(a['appearanceSource']['indexPath'])==a['appearanceSource']['sha256'],'appearance: existing source material and provenance')
 scene=E.read(a['appearanceSource']['indexPath'])
 check(a['appearanceSource']['materialId'] in scene['materials'],'appearance: source material resolves')
 check('map' not in scene['materials'][a['appearanceSource']['materialId']],'appearance: no missing bitmap dependency')
 check(len(mesh['index']['array'])==36 and set(mesh['attributes'])=={'position','normal','uv','grossUV'},'geometry: original indexed twelve triangles and attributes')
 local_by=copy.copy(by);members={m['id']:m for m in a['members']}
 for m in a['members']:
  local_by[m['id']]={'id':m['id'],'physicalBounds':m['bounds'],'renderBindings':[{'partId':m['sourcePartId'],'sourcePartId':m['sourcePartId'],'geometryId':a['geometry']['id'],'geometryPath':a['geometry']['path'],'matrix':m['matrix'],'sourceRange':None,'physicalContribution':'carrier-solid'}]}
 geo=C.Geometry(local_by);member_facts=[];bearing_facts=[]
 for m in a['members']:
  ts=G.triangles(mesh,m['matrix']);facts=G.measures(ts);r=rows[m['id']]
  check(facts['closed'] and facts['volume']>0 and len(ts)==12,'solid: finite closed twelve-triangle source')
  check(G.bounds(ts)==m['bounds'],'placement: transformed geometry exact original bounds')
  check(round(facts['volume']/.12,6)==m['fuelAmount'],'quantity: measured volume uses accepted six-decimal prototype recipe')
  check(m['geometryId']==a['geometry']['id'] and m['appearanceMaterialId']==a['appearanceSource']['materialId'],'identity: shared primitive and existing finish')
  check(m['nativeBay']=={'axis':r['axis'],'intervalMetres':r['bayIntervalMetres'],'pitchMetres':1},'modular: exact original one-metre bay')
  check(m['matrix'][:12]==front['members'][0]['matrix'][:12],'placement: no rescale or rotation of original cube')
  member_facts.append({'id':m['id'],'sourceProposalId':r['proposalId'],'triangleCount':12,'volumeMetresCubed':facts['volume'],'bounds':G.bounds(ts),'closed':True,'acceptedStaticFrameAmount':m['fuelAmount']})
  for top in [False,True]:
   child,parent=(r['upperSourceCarrierId'],m['id']) if top else (m['id'],r['lowerSourceCarrierId'])
   actual=geo.face(child,parent,require_bearing=True);expected=r['actualUpperNativeBearing' if top else 'actualLowerNativeBearing']
   check(actual==expected,'bearing: reproduce actual source face area, two witnesses and captured separation')
   bearing_facts.append({'blockCarrierId':m['id'],'face':'top' if top else 'bottom','actualBearing':actual})
 for j in a['joins']:
  top=j['evidence']['blockFace']=='top';m=members[j['evidence']['blockCarrierId']];r=rows[m['id']];proof=j['evidence']['actualBearing'];host=r['upperSourceCarrierId' if top else 'lowerSourceCarrierId']
  blockref={'partId':m['sourcePartId'],'sourcePartId':m['sourcePartId'],'geometryId':a['geometry']['id'],'geometryPath':a['geometry']['path'],'sha256':a['geometry']['sha256'],'matrix':m['matrix'],'sourceRange':None}
  for child in [True,False]:
   region=j['childRegion' if child else 'parentRegion'];is_block=(not top) if child else top
   expected_refs=[blockref] if is_block else design['originalGeometryBindings'][host]
   expected_bound=copy.deepcopy(m['bounds']);expected_bound['min'][1]=expected_bound['max'][1]=proof['actualSurfaceWitness'][0 if child else 1][1]
   check(region['geometryRefs']==expected_refs and region['witnessPoint']==proof['actualSurfaceWitness'][0 if child else 1] and region['bounds']==expected_bound,'region: actual distinct original face plane and physical reference')
  loss=copy.deepcopy(by[host]['physicalBounds']) if top else copy.deepcopy(m['bounds'])
  if top:
   axis=0 if r['axis']=='x' else 2;loss['min'][axis],loss['max'][axis]=r['bayIntervalMetres']
  check(j['localChildLossBounds']==loss,'region: one-metre local child loss selector')
 permitted=set(members)|{r[k] for r in rows.values() for k in ['lowerSourceCarrierId','upperSourceCarrierId']}
 check(set(geo.shapes)==permitted and len(geo.shapes)==112,'scope: geometry measures limited to 96 pieces and 16 named parents')
 pos=mesh['attributes']['position']['array'];uv=mesh['attributes']['uv']['array'];dims=[.16,.20999999821185966,.16]
 for f in range(6):
  for c in range(4):
   p=f*4+c;q=f*4+(c+1)%4
   check(abs(math.dist([pos[p*3+k]*dims[k] for k in range(3)],[pos[q*3+k]*dims[k] for k in range(3)])-math.dist(uv[p*2:p*2+2],uv[q*2:q*2+2]))<1e-12,'uv: unchanged physical metre density')
 check(sum(Decimal(str(m['fuelAmount'])) for m in a['members'])==Decimal('4.3008'),'quantity: exact accepted decimal addition')
 check(E.read((HERE/'quantity-evidence.json').relative_to(ROOT).as_posix())==E.quantities(front),'quantity: exact dyadic and measured representation')
 pins=E.read(E.PINS)['carriers'];unique={r['geometryPath']:r['sha256'] for refs in pins.values() for r in refs}
 for path,h in unique.items():check(E.sha(path)==h,'source-proof: unchanged original geometry byte pin')
 exclusions=[]
 for m in a['members']:
  r=rows[m['id']]
  check(r['rectangularRepeatReadyForApproval'] and r['additionalSourceSolidIntersections']==[] and m['matrix']==r['matrix'] and m['bounds']==r['bounds'],'source-proof: exact alias of approved clear source-solid proof')
  exclusions.append({'exportedCarrierId':m['id'],'originalProposalId':r['proposalId'],'additionalSourceSolidIntersections':[]})
 exclusions_report={'version':1,'method':'Identity substitution, not a fresh whole-building intersection calculation. Approved proof applies to identical primitive/transforms/bounds and original source geometry whose byte pins are reverified.',
  'acceptedProofPath':E.DESIGN,'acceptedProofSha256':E.DESIGN_SHA,'originalGeometryPinsPath':E.PINS,'originalGeometryPinsSha256':E.PINS_SHA,'originalGeometryBytePinsVerified':len(unique),
  'freshNativeCheckScope':'96 pieces and 16 named parents only','clearRowsReproduced':96,'excludedObstructedProposalIds':sorted(blocked),'excludedEarlierFrontIds':sorted(earlier),'rows':exclusions}
 negative=[]
 def reject(name,change):
  bad=copy.deepcopy(a);change(bad)
  try:validate(bad)
  except AssertionError as e:negative.append({'name':name,'result':'EXPECTED_REJECTION','reason':str(e),'invalidManifestSha256':E.digest(E.encode(bad))})
  else:raise AssertionError('Invalid input accepted: '+name)
 reject('missing top bearing',lambda d:d['joins'].pop())
 reject('duplicate earlier front ID',lambda d:d['members'][0].update(id=front['members'][0]['id']))
 reject('obstructed roof-saddle row',lambda d:d['members'][0].update(sourceProposalId=sorted(blocked)[0]))
 reject('widen native contact tolerance',lambda d:d['joins'][0]['evidence']['actualBearing'].update(nativePrecisionToleranceMetres=.001))
 reject('inflate accepted static quantity',lambda d:d['members'][0].update(fuelAmount=.05))
 native=E.read((HERE/'native-contact-results.json').relative_to(ROOT).as_posix())
 check(native['result']=='PASS' and native['manifestSha256']==E.sha(E.MANIFEST) and native['uniqueMembers']==96 and native['nativeTriangleContacts']==192 and native['sourceShapesRead']==112 and native['originalParentCount']==16,'native: current finite 192-contact result')
 check(native['producerSha256']==E.sha((HERE/'check-native-contacts.mjs').relative_to(ROOT).as_posix()),'native: exact checker source')
 protected=['art/source/shared-map-fire-bindings','assets/art/place-scenes','assets/art/shared-map-derived-geometry','assets/art/shared-map-fire-bindings','assets/art/shared-map-support-overrides','assets/art/shared-map-support-additions/new-york-parapet-blocking-v1']
 before=set(subprocess.check_output(['git','ls-tree','-r','--name-only',E.PARENT,'--',*protected],cwd=ROOT,text=True).splitlines())
 changed=set(subprocess.check_output(['git','diff','--name-only',E.PARENT,'--',*protected],cwd=ROOT,text=True).splitlines())
 check(not(before&changed),'preserved: all earlier proof and original source asset paths unchanged')
 archives=[{'path':p.relative_to(ROOT).as_posix(),'bytes':p.stat().st_size,'sha256':E.sha(p.relative_to(ROOT).as_posix())} for p in sorted((HERE.parent/'vegetation-pane-proposal-v1').rglob('*.gz'))]
 check(len(archives)==10 and sum(r['bytes'] for r in archives)==10031978,'preserved: complete compressed vegetation calculation archive')
 result={'version':1,'result':'PASS','manifestPath':E.MANIFEST,'manifestSha256':E.sha(E.MANIFEST),'sourceProducerSha256':E.sha((HERE/'check.py').relative_to(ROOT).as_posix()),
  'members':96,'instanceTriangles':1152,'localBearings':192,'originalParents':16,'nativeTriangleContacts':192,'addedStaticFramePrototypeUnits':4.3008,'newGroundAnchors':0,
  'checks':dict(counts),'negativeControls':negative,'preservation':{'artistBaseline':E.PARENT,'earlierTrackedPathsUnchanged':len(before),'vegetationArchives':archives},
  'scope':'Additive source export and finite contacts only. Source-solid exclusions replay the already accepted proof by exact geometry identity; no whole-building native activation or runtime installation.',
  'nativeActivationStarted':False,'runtimeBehaviorAcceptance':False,'rendererStartedByChecker':False}
 outputs={'check-results.json':result,'source-solid-exclusions.json':exclusions_report,'geometry-bearing-evidence.json':{'version':1,'members':member_facts,'bearings':bearing_facts}}
 if args.record:
  for name,data in outputs.items():(HERE/name).write_bytes(E.encode(data))
 else:
  for name,data in outputs.items():check((HERE/name).read_bytes()==E.encode(data),'reproduction: '+name)
 print(json.dumps({k:v for k,v in result.items() if k not in ['preservation','negativeControls']},sort_keys=True))
 print(json.dumps({'negativeControls':len(negative),'earlierTrackedPathsUnchanged':len(before),'vegetationArchiveBytes':sum(r['bytes'] for r in archives)}))
if __name__=='__main__':main()
