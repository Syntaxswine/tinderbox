"""Independent scope, solid/contact, metre-UV and finite-account checks for the addition."""
from pathlib import Path
from decimal import Decimal
import argparse,collections,copy,hashlib,importlib.util,json,math,subprocess,sys
sys.dont_write_bytecode=True
HERE=Path(__file__).resolve().parent;ROOT=HERE.parents[3];DIRECTORY='assets/art/shared-map-support-additions/new-york-parapet-blocking-v1';MANIFEST=DIRECTORY+'/index.json'
BASE='assets/art/shared-map-fire-bindings/new-york-complete-v1.json';BASE_SHA='407c0f8bd582f8d95b9ade1471cd51892ac7b9a40fd2c005696bcc5485991eba'
OVERLAY='assets/art/shared-map-derived-geometry/new-york/v1/index.json';OVERLAY_SHA='f1252c7364adfeb025f573fc4650020e71915a3e17e71bcf2e725e56c3f1c941'
CONTROL='assets/art/shared-map-support-overrides/new-york-controls-v1.json';CONTROL_SHA='f3f28fda72742c6bc04d32f70331ab96e036662f953153952297fae9ce3bc915'
PROPOSAL='art/source/shared-map-fire-bindings/support-overrides-v1/parapet-blocking-proposal.json';PROPOSAL_SHA='ba25706bd1cf0895e36b16465dd2c6a5acebbcafe30d30b8e51b9d56ec9d13b4'
s=importlib.util.spec_from_file_location('original_physical_measures',HERE.parent/'export.py');G=importlib.util.module_from_spec(s);s.loader.exec_module(G)
def sha(path):return hashlib.sha256((ROOT/path).read_bytes()).hexdigest()
def read(path):return json.loads((ROOT/path).read_text(encoding='utf-8'))
def money(value):return Decimal(str(value))
def main():
 parser=argparse.ArgumentParser(description=__doc__);parser.add_argument('--record',action='store_true');args=parser.parse_args();a=read(MANIFEST);geometry=read(a['geometry']['path']);base=read(BASE);by={c['id']:c for c in base['carriers']};proposal=read(PROPOSAL);approved={c['id']:c for c in proposal['proposedInstances']};contact_before={(c['childCarrierId'],c['parentCarrierId']):c for c in proposal['modeledContactEvidence']};expected_ids={f'carrier/proposed-blocking/main-parapet-0/bay-{n:02d}' for n in range(48)}
 original_hashes={p:sha(p) for p in (BASE,OVERLAY,CONTROL,PROPOSAL)};checks=collections.Counter();host_shapes={};host_geoms={}
 def check(ok,label):
  assert ok,label
  checks[label.split(':')[0]]+=1
 def host_shape(cid):
  if cid not in host_shapes:
   c=by[cid];ts=[]
   for b in c['renderBindings']:
    if b['physicalContribution']!='carrier-solid':continue
    if b['geometryPath'] not in host_geoms:host_geoms[b['geometryPath']]=read(b['geometryPath'])
    ts+=G.triangles(host_geoms[b['geometryPath']],b['matrix'],b.get('sourceRange'))
   host_shapes[cid]=(ts,G.face_triangles(ts,c['physicalBounds']))
  return host_shapes[cid]
 def validate(data,mesh):
  check(set(data)=={'version','placeId','scope','coordinateFrame','authority','contract','approvedProposal','baseBindings','effectiveGeometryOverlay','supportOverrides','geometry','appearanceSource','members','joins','finiteLedger','retirementAndOwnership','evidence'},'schema:exact separate addition fields')
  check(data['version']==1 and data['placeId']=='new-york','schema:version and place')
  ids=[c['id'] for c in data['members']];check(len(ids)==48 and len(set(ids))==48 and set(ids)==expected_ids and not(set(ids)&set(by)),'scope:exact 48 new canonical identities only')
  check(data['baseBindings']=={'path':BASE,'sha256':BASE_SHA} and original_hashes[BASE]==BASE_SHA,'pin:unchanged original bindings')
  check(data['effectiveGeometryOverlay']=={'indexPath':OVERLAY,'sha256':OVERLAY_SHA} and original_hashes[OVERLAY]==OVERLAY_SHA,'pin:unchanged effective overlay')
  check(data['supportOverrides']=={'path':CONTROL,'sha256':CONTROL_SHA} and original_hashes[CONTROL]==CONTROL_SHA,'pin:immutable ten-control descriptor')
  check(data['coordinateFrame']==base['coordinateFrame'],'frame:existing emitted-world frame and native pitch')
  check(data['approvedProposal']=={'commit':'9a88959d2011d182377a9eeb95d5ed9d222e46b1','path':PROPOSAL,'sha256':PROPOSAL_SHA} and original_hashes[PROPOSAL]==PROPOSAL_SHA,'pin:exact approved before proposal')
  for key,commit,path,snapshot in [('authority','ca5fc5ba7d0b87a8c16f16ff80bcf13185c308a5','docs/milestones/29-shared-gameplay-maps.md','authority-ca5fc5ba.md'),('contract','4e8dacc0720234e7f630606b91e067f90cf4bb7c','docs/engineering/shared-maps/support-additions-contract.md','contract-4e8dacc0.md')]:
   blob=subprocess.check_output(['git','show',commit+':'+path],cwd=ROOT);expected={'commit':commit,'path':path,'snapshotPath':str((HERE/snapshot).relative_to(ROOT)).replace('\\','/'),'sha256':hashlib.sha256(blob).hexdigest()}
   check(data[key]==expected and (HERE/snapshot).read_bytes()==blob,'authority:exact immutable '+key)
  ref=data['geometry'];raw=(ROOT/ref['path']).read_bytes();check(ref['path']==DIRECTORY+'/geometry/'+ref['id']+'.json' and raw.endswith(b'\n') and hashlib.sha256(raw).hexdigest()==ref['sha256'] and hashlib.sha256(raw[:-1]).hexdigest()==ref['id'] and ref['triangleCount']==12,'geometry:canonical identity versus exact file hash')
  check(set(mesh)=={'attributes','index'} and set(mesh['attributes'])=={'position','normal','uv','grossUV'},'geometry:one flat indexed buffer')
  for name,old in proposal['geometryTemplate']['attributes'].items():
   attr=mesh['attributes'][name];check(attr=={'array':old['array'],'itemSize':old['itemSize'],'type':'Float32Array','normalized':False},'geometry:exact approved '+name+' array')
  check(mesh['index']==proposal['geometryTemplate']['index'] and len(mesh['index']['array'])==36,'geometry:exact approved 12 triangle index')
  appearance=data['appearanceSource'];check(appearance=={'indexPath':base['sourceScene']['indexPath'],'sha256':base['sourceScene']['sha256'],'materialId':'1889c49c58682807c8a86350feff6f3d04caab236cdd480952cdb1ce56996490','sourceCarrierId':'carrier/edge-0/cornice-7'} and sha(appearance['indexPath'])==appearance['sha256'],'appearance:exact existing painted material source')
  check(appearance['materialId'] in read(appearance['indexPath'])['materials'],'appearance:material exists in pinned source registry')
  member_by={c['id']:c for c in data['members']};world_shapes={};sections=collections.Counter()
  for member in data['members']:
   cid=member['id'];old=approved[cid];check(member['sourcePartId']==cid.removeprefix('carrier/') and member['geometryId']==ref['id'],'identity:one source part one shared geometry')
   check(member['role']=='timber-fitting' and member['physicalMaterial']=='timber' and member['fuelClass']=='frame' and member['physicalContribution']=='carrier-solid','scope:approved new member physical role only')
   check(member['matrix']==old['matrix'] and member['bounds']==old['bounds'] and member['nativeBay']==old['nativeBay'],'placement:exact original approved matrix bounds and metre bay')
   check(member['appearanceMaterialId']==appearance['materialId'] and member['finish'] is None and member['anchors']==[] and member['groundAnchor'] is False,'scope:no extra coating or ground anchors')
   check(money(member['fuelAmount'])==Decimal('.0448') and member['quantityBasis']['rule']=='closed-volume' and member['quantityBasis']['oneCanonicalAccount'] is True and member['quantityBasis']['volumeMetresCubed']==old['volumeMetresCubed'],'fuel:one exact closed-volume account per member')
   ts=G.triangles(mesh,member['matrix']);facts=G.measures(ts);world_shapes[cid]=ts
   check(facts['closed'] and facts['volume']>0 and len(ts)==12,'solid:closed positive volume')
   check(G.bounds(ts)==member['bounds'] and abs(facts['volume']-old['volumeMetresCubed'])<1e-13 and round(facts['volume']/.12,6)==member['fuelAmount'],'solid:actual bounds and finite closed quantity')
   oriented=collections.Counter()
   for i,t in enumerate(ts):
    vs=[tuple(round(v,9) for v in p) for p in t]
    for p,q in zip(vs,vs[1:]+vs[:1]):oriented[p,q]+=1
    vertex=mesh['index']['array'][i*3];normal=mesh['attributes']['normal']['array'][vertex*3:vertex*3+3];check(G.dot(G.cross(G.sub(t[1],t[0]),G.sub(t[2],t[0])),normal)>0,'normal:actual outward winding')
   check(all(n==1 and oriented[q,p]==1 for (p,q),n in oriented.items()),'solid:opposite oriented manifold edges')
   sections[f'{math.floor(member["matrix"][12]/16)}_1_{math.floor(member["matrix"][13]/2.12)}']+=1
  check(sections=={'2_1_8':16,'3_1_8':16,'4_1_8':16},'placement:existing native section convention')
  # UV edge distance in physical metres is independent of the normalized box.
  for face in range(6):
   for corner in range(4):
    p=face*4+corner;q=face*4+(corner+1)%4;pos=mesh['attributes']['position']['array'];uv=mesh['attributes']['uv']['array'];dims=[.16,.20999999821185966,.16]
    length=math.dist([pos[p*3+k]*dims[k] for k in range(3)],[pos[q*3+k]*dims[k] for k in range(3)])
    check(abs(length-math.dist(uv[p*2:p*2+2],uv[q*2:q*2+2]))<1e-12,'uv:physical metre density on new face')
  joins=data['joins'];pairs=[(j['childCarrierId'],j['parentCarrierId']) for j in joins]
  check(len(pairs)==96 and len(set(pairs))==96 and set(pairs)==set(contact_before),'scope:exact 48 bottom and 48 top pairs only')
  for join in joins:
   pair=join['childCarrierId'],join['parentCarrierId'];old=contact_before[pair];cid=old['blockCarrierId'];member=member_by[cid];top=old['blockFace']=='top';plane='max' if top else 'min';host=old['hostCarrierId'];host_plane='min' if top else 'max';member_ts=world_shapes[cid];faces=G.face_triangles(member_ts,member['bounds']);host_ts,host_faces=host_shape(host)
   check(join['kind']=='bearing-face' and join['direction']=='parent-to-child' and join['groundAnchor'] is False and join['wholeCarrierRetirement'] is False,'bearing:direct local dependency only')
   check(join['localChildLossBounds']==(old['upperLocalBaySelector'] if top else member['bounds']),'bearing:exact local direct-bearing loss selector')
   expected_evidence={k:old[k] for k in ['kind','blockFace','blockCarrierId','actualContactBounds','contactAreaMetresSquared','gapMetres','witnessPoint']};expected_evidence.update(geometryFrame=old['geometryFrame'],sourceProposalPath=PROPOSAL,sourceProposalSha256=PROPOSAL_SHA)
   check(join['evidence']==expected_evidence,'bearing:approved actual measurement retained')
   check(abs(member['bounds'][plane][1]-by[host]['physicalBounds'][host_plane][1])<1e-12,'bearing:actual coplanar host plane')
   area=sum(G.overlap_area(a,b) for a in faces[(1,plane)] for b in host_faces[(1,host_plane)])
   check(abs(area-.0256)<1e-10 and abs(area-old['contactAreaMetresSquared'])<1e-12,'bearing:actual source-triangle union area')
   for name,is_member in [('childRegion',not top),('parentRegion',top)]:
    region=join[name];check(region['frame']=='emitted-world' and region['bounds']==old['actualContactBounds'] and region['witnessPoint']==old['witnessPoint'] and len(region['geometryRefs'])==1,'region:exact actual contact face and witness')
    r=region['geometryRefs'][0]
    if is_member:expected={'partId':member['sourcePartId'],'sourcePartId':member['sourcePartId'],'geometryId':ref['id'],'geometryPath':ref['path'],'sha256':ref['sha256'],'matrix':member['matrix'],'sourceRange':None}
    else:expected={**old['hostGeometryRef'],'sha256':old['hostGeometrySha256']}
    check(r==expected and r['sha256']==sha(r['geometryPath']),'region:exact physical buffer matrix and source reference')
  ledger=data['finiteLedger'];check(ledger['accounting']=='static-initial-canonical-source' and ledger['activationBirth']==0 and ledger['activationRefill']==0,'fuel:static stock before activation only')
  check(ledger['addedCanonicalAccounts']==48 and money(ledger['canonicalFuelPerMember'])==Decimal('.0448') and sum(money(c['fuelAmount']) for c in data['members'])==Decimal('2.1504') and ledger['oneOwnerPerMember'] is True,'fuel:exact static member sum')
  check(ledger['addedCoreByClass']=={'frame':2.1504} and ledger['addedCoreTotal']==2.1504 and ledger['addedFinishTotal']==0 and ledger['addedTotal']==2.1504,'fuel:bounded addition only')
  check(money(ledger['baseTotal'])==Decimal('15767.943953') and money(ledger['total'])==Decimal('15770.094353') and ledger['finishTotal']==base['finiteLedger']['finishTotal']==.1,'fuel:combined total with original coating retained')
  expected_core=copy.deepcopy(base['finiteLedger']['coreByClass']);expected_core['frame']=float(money(expected_core['frame'])+Decimal('2.1504'));check(ledger['coreByClass']==expected_core and money(ledger['coreTotal'])==Decimal('15769.994353'),'fuel:unchanged other profiles and existing class quantities')
  retirement=data['retirementAndOwnership'];check(retirement=={'canonicalFuelAccountPerMember':True,'stockCreatedAt':'initial-source-registration-before-activation','activationBirth':0,'activationRefill':0,'geometryStateOwner':'same-shared-source-registry-render-and-physical-owner','upperDirectBearingScope':'only-the-exact-one-metre-localChildLossBounds','wholeParapetRetirement':False,'wholeCorniceRetirement':False,'extraCrossBayBraces':0,'newGroundAnchors':0,'forcedBayBreak':False,'remainingNeighborStability':'existing-shared-native-kernel','originalCarrierGeometryAndStockUntouched':True},'retirement:local bearing with shared remaining neighbor stability')
  path=data['evidence']['originalGroundPath'];check(path==proposal['existingExplicitGroundPath'] and all(parent in by[child]['supportCarrierIds'] for child,parent in zip(path,path[1:])) and any(r['kind']=='native-ground-contact' and r['elevation']==0 for r in by[path[-1]]['anchors']),'history:existing original ground path only')
 validate(a,geometry);direct_checks=dict(checks);negative=[]
 def reject(name,change,geometry_change=None):
  bad=copy.deepcopy(a);g=copy.deepcopy(geometry);change(bad)
  if geometry_change:geometry_change(g)
  try:validate(bad,g)
  except AssertionError as e:negative.append({'name':name,'result':'EXPECTED_REJECTION','reason':str(e)})
  else:raise AssertionError('Invalid addition accepted: '+name)
 reject('extra 49th member',lambda b:b['members'].append(copy.deepcopy(b['members'][0])))
 reject('unapproved or original member identity',lambda b:b['members'][0].update(id='carrier/main-parapet-0/base'))
 reject('static fuel inflation',lambda b:b['members'][0].update(fuelAmount=.5))
 reject('activation stock birth',lambda b:b['finiteLedger'].update(activationBirth=2.1504))
 reject('activation stock refill',lambda b:b['finiteLedger'].update(activationRefill=2.1504))
 reject('source offset applied twice',lambda b:b['members'][0]['matrix'].__setitem__(12,b['members'][0]['matrix'][12]+56))
 reject('superseded new role or global promotion',lambda b:b['members'][0].update(role='support-blocking'))
 reject('invented earth anchor',lambda b:b['members'][0]['anchors'].append({'kind':'native-ground-contact','elevation':0}))
 reject('extra coating',lambda b:b['members'][0].update(finish={'fuelAmount':.1}))
 reject('parent redirected to separated roof',lambda b:b['joins'][0].update(parentCarrierId='carrier/roof/front-centre'))
 reject('missing local bearing',lambda b:b['joins'].pop())
 reject('reversed or symmetric direction',lambda b:b['joins'][0].update(direction='symmetric-structural'))
 reject('whole 48 metre loss selector',lambda b:next(j for j in b['joins'] if j['evidence']['blockFace']=='top')['localChildLossBounds']['max'].__setitem__(0,80))
 reject('whole carrier retirement',lambda b:b['joins'][0].update(wholeCarrierRetirement=True))
 reject('forced bay break rule',lambda b:b['retirementAndOwnership'].update(forcedBayBreak=True))
 reject('changed immutable ten-control descriptor',lambda b:b['supportOverrides'].update(sha256='0'*64))
 reject('new primitive paint stretched',lambda b:None,lambda g:g['attributes']['grossUV']['array'].__setitem__(0,4))
 reject('changed shared solid index',lambda b:None,lambda g:g['index']['array'].__setitem__(0,7))
 native=read('art/source/shared-map-fire-bindings/parapet-blocking-v1/native-contact-results.json');check(native['manifestSha256']==sha(MANIFEST) and native['geometrySha256']==a['geometry']['sha256'] and native['nativeTriangleContacts']==96 and native['uniqueMembers']==48 and native['result']=='PASS','native:96 fresh physical contact controls')
 check(native['producerSha256']==sha('art/source/shared-map-fire-bindings/parapet-blocking-v1/check-native-contacts.mjs'),'native:current contact checker source')
 for p,h in original_hashes.items():check(sha(p)==h,'preserved:all immutable source inputs after controls')
 protected=['assets/art/place-scenes','assets/art/shared-map-fire-bindings','assets/art/shared-map-derived-geometry','assets/art/shared-map-support-overrides','assets/art/exposition-new-york','assets/art/exposition-new-york-tile','assets/art/exploration-access','art/source/exploration-access','art/source/shared-map-fire-bindings/completion-v1','art/source/shared-map-fire-bindings/support-overrides-v1','art/source/shared-map-fire-bindings/reachability-review-v1','art/source/shared-map-fire-bindings/export.py','art/source/shared-map-fire-bindings/check.py','art/source/shared-map-fire-bindings/propose-new-york-coverage.py','vendor','workbenches/art/check-exposition-new-york-tile.mjs','workbenches/art/check-exploration-access.mjs']
 check(subprocess.run(['git','diff','--quiet','9a88959d2011d182377a9eeb95d5ed9d222e46b1','--',*protected],cwd=ROOT).returncode==0,'preserved:all original geometry paint stock source history and controls')
 evidence=read('art/source/shared-map-fire-bindings/parapet-blocking-v1/export-evidence.json');check(evidence['output']=={'path':MANIFEST,'sha256':sha(MANIFEST)},'hash:exact current export ledger')
 check({p.name for p in (ROOT/DIRECTORY/'geometry').glob('*.json')}=={a['geometry']['id']+'.json'},'geometry:one deduplicated file only')
 for row in evidence['authoringSources']+evidence['physicalMathSources']:check(sha(row['path'])==row['sha256'],'hash:current authoring source')
 result={'version':1,'result':'PASS','manifestPath':MANIFEST,'manifestSha256':sha(MANIFEST),'manifestBytes':(ROOT/MANIFEST).stat().st_size,'geometryId':a['geometry']['id'],'geometrySha256':a['geometry']['sha256'],'geometryBytes':(ROOT/a['geometry']['path']).stat().st_size,'memberCount':48,'geometryCount':1,'triangleCount':576,'localBearings':96,'nativeContacts':96,'addedStaticFrameFuel':2.1504,'combinedStaticTotal':15770.094353,'originalCanonicalOwners':12446,'combinedCanonicalOwners':12494,'checks':direct_checks,'negativeControls':negative,'negativeControlCount':len(negative),'originalInputsUnchanged':True,'runtimeColdActiveParityOrLocalLossAcceptance':False,'rendererStarted':False}
 if args.record:(HERE/'check-results.json').write_text(json.dumps(result,indent=2,sort_keys=True)+'\n',encoding='utf-8',newline='\n')
 print(json.dumps(result,sort_keys=True))
if __name__=='__main__':main()
