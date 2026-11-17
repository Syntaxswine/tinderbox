"""Export only the 96 approved clear parapet repeats; all previous assets stay immutable."""
from pathlib import Path
from fractions import Fraction as F
from decimal import Decimal
import argparse,copy,hashlib,json,subprocess,sys
sys.dont_write_bytecode=True
HERE=Path(__file__).resolve().parent;ROOT=HERE.parents[3]
PARENT='0f5ef12e737588361b42da6ed30973218eec295d'
ASSIGNMENT='efe2b030e36d5887d616dfde5940d6e4541b8543'
APPROVAL='c915d1822d24bfe3175c6a1f9396330cfd910aad'
DESIGN='art/source/shared-map-fire-bindings/coverage-family-proposal-v1/separate-parapet-gap-design.json'
DESIGN_SHA='481294255d3afd8dd0ea208d2dc0cc1c7adf1f2e6108e5929a0e887bbb1abfa4'
FRONT='assets/art/shared-map-support-additions/new-york-parapet-blocking-v1/index.json'
FRONT_SHA='a5a34f18a4d18b5a316096edf58b941e727a7546e544636a5a29469bc5c5b1c2'
BASE='assets/art/shared-map-fire-bindings/new-york-complete-v1.json'
BASE_SHA='407c0f8bd582f8d95b9ade1471cd51892ac7b9a40fd2c005696bcc5485991eba'
PINS='art/source/shared-map-fire-bindings/coverage-family-proposal-v1/geometry-bindings.json'
PINS_SHA='4cd550cf603008e76819877f5c32bf1f731e496b05a95a66927b32cde41bcada'
DIRECTORY='assets/art/shared-map-support-additions/new-york-parapet-clear-blocking-v1'
MANIFEST=DIRECTORY+'/index.json'
def digest(data):return hashlib.sha256(data).hexdigest()
def sha(path):return digest((ROOT/path).read_bytes())
def read(path):return json.loads((ROOT/path).read_text(encoding='utf-8'))
def encode(value):return (json.dumps(value,indent=2,sort_keys=True)+'\n').encode()
def git_blob(commit,path):return subprocess.check_output(['git','show',commit+':'+path],cwd=ROOT)
def cid(row):return row['proposalId'].replace('proposal-only/blocking/','carrier/clear-parapet-blocking/',1)
def selected(design):return [c for f in design['families'] for c in f['candidates'] if c['rectangularRepeatReadyForApproval']]
def inputs():
 for p,h in [(DESIGN,DESIGN_SHA),(FRONT,FRONT_SHA),(BASE,BASE_SHA),(PINS,PINS_SHA)]:assert sha(p)==h,'Pinned source changed: '+p
 design,front,base=read(DESIGN),read(FRONT),read(BASE)
 assert len(selected(design))==96 and design['summary']['sourceSolidCollisionCandidates']==20
 assert design['existingApprovedPrototype']['sharedGeometry']==front['geometry']
 assert sha(front['geometry']['path'])==front['geometry']['sha256']
 return design,front,base
def rational(value):
 q=value if isinstance(value,F) else F(value)
 return {'numerator':str(q.numerator),'denominator':str(q.denominator)}
def quantities(front):
 m=front['members'][0];dims=[m['matrix'][k] for k in [0,5,10]]
 v=F(dims[0])*F(dims[1])*F(dims[2]);raw=v/F(.12);q=F(.0448);batch=96*q
 return {'recipe':'Existing approved frame fitting: measured closed volume / .12, rounded to six decimal prototype units as in the original front block. This is not historical timber mass.',
 'perMemberStored':.0448,'batchStored':4.3008,'decimalSum':'4.3008',
 'authoredDimensionsMetres':dims,'capturedDimensionVolumeMetresCubed':float(v),
 'capturedDimensionVolumeExact':rational(v),'unroundedRecipeFromCapturedDimensionsExact':rational(raw),
 'unroundedRecipeFromCapturedDimensionsApproximate':float(raw),
 'perMemberBinary64Hex':(.0448).hex(),'perMemberExact':rational(q),'batchBinary64Hex':(4.3008).hex(),
 'batchStoredExact':rational(F(4.3008)),'sumOf96StoredMemberValuesExact':rational(batch),
 'storedBatchMinusExactMemberSum':rational(F(4.3008)-batch),
 'storedMemberMinusUnroundedMeasuredRecipe':rational(q-raw),
 'note':'Keep the accepted .0448 / 4.3008 prototype convention; exact measurement and binary64 sum are separately recorded. No new combined stock ledger or runtime allocation.'}
def snapshot(commit,path,name):
 data=git_blob(commit,path)
 return {'commit':commit,'path':path,'snapshotPath':(HERE/name).relative_to(ROOT).as_posix(),'sha256':digest(data)},data
def build():
 design,front,base=inputs();by={c['id']:c for c in base['carriers']};prototype=front['members'][0];members=[];joins=[]
 for row in selected(design):
  assert not row['additionalSourceSolidIntersections']
  identity=cid(row);part=identity.removeprefix('carrier/')
  member={k:copy.deepcopy(prototype[k]) for k in ['role','physicalMaterial','fuelClass','fuelAmount','geometryId','appearanceMaterialId','groundAnchor','anchors','finish','physicalContribution']}
  member.update(id=identity,sourcePartId=part,sourceProposalId=row['proposalId'],matrix=copy.deepcopy(row['matrix']),bounds=copy.deepcopy(row['bounds']),
   nativeBay={'axis':row['axis'],'intervalMetres':row['bayIntervalMetres'],'pitchMetres':1},
   quantityBasis=copy.deepcopy(prototype['quantityBasis']))
  member['quantityBasis']['roundingConvention']='Same accepted six-decimal .0448 prototype amount as the original front block; numeric evidence is separate.'
  members.append(member)
  blockref={'partId':part,'sourcePartId':part,'geometryId':front['geometry']['id'],'geometryPath':front['geometry']['path'],'sha256':front['geometry']['sha256'],'matrix':copy.deepcopy(row['matrix']),'sourceRange':None}
  for top in [False,True]:
   proof=copy.deepcopy(row['actualUpperNativeBearing' if top else 'actualLowerNativeBearing']);host=row['upperSourceCarrierId' if top else 'lowerSourceCarrierId']
   child,parent=(host,identity) if top else (identity,host)
   def region(is_block,is_child):
    bound=copy.deepcopy(row['bounds']);y=proof['actualSurfaceWitness'][0 if is_child else 1][1];bound['min'][1]=bound['max'][1]=y
    return {'frame':'emitted-world','bounds':bound,'geometryRefs':[copy.deepcopy(blockref)] if is_block else copy.deepcopy(design['originalGeometryBindings'][host]),
     'witnessPoint':copy.deepcopy(proof['actualSurfaceWitness'][0 if is_child else 1]),'boundsMeaning':'Local actual bearing face selector; original triangles remain authoritative.'}
   loss=copy.deepcopy(by[host]['physicalBounds']) if top else copy.deepcopy(row['bounds'])
   if top:
    axis=0 if row['axis']=='x' else 2
    loss['min'][axis],loss['max'][axis]=row['bayIntervalMetres']
   joins.append({'id':identity+'/bearing-'+('top' if top else 'bottom'),'childCarrierId':child,'parentCarrierId':parent,'kind':'bearing-face','direction':'parent-to-child','groundAnchor':False,
    'childRegion':region(not top,True),'parentRegion':region(top,False),'localChildLossBounds':loss,'wholeCarrierRetirement':False,
    'evidence':{'blockCarrierId':identity,'blockFace':'top' if top else 'bottom','sourceProposalId':row['proposalId'],'sourceProposalPath':DESIGN,'sourceProposalSha256':DESIGN_SHA,'actualBearing':proof}})
 contract,contract_bytes=snapshot(ASSIGNMENT,'docs/engineering/shared-maps/clear-parapet-blocks-export.md','contract-efe2b030.md')
 approval,approval_bytes=snapshot(APPROVAL,'docs/engineering/shared-maps/support-region-decision.md','approval-c915d182.md')
 workflow_path='docs/art/shared-modular-art-workflow.md';workflow_bytes=git_blob(PARENT,workflow_path)
 manifest={'version':1,'placeId':'new-york','scope':'Separate accepted 96 clear block addition; source export only. No world binding, source compiler refresh, native activation or runtime installation.',
  'coordinateFrame':copy.deepcopy(base['coordinateFrame']),'contract':contract,'approval':approval,
  'sourceDesign':{'path':DESIGN,'sha256':DESIGN_SHA},'baseBindings':{'path':BASE,'sha256':BASE_SHA},
  'reviewedFrontPrototype':{'commit':'88538bb687e06911d63f728a17bd8668448805fe','path':FRONT,'sha256':FRONT_SHA},
  'geometry':copy.deepcopy(front['geometry']),'appearanceSource':copy.deepcopy(front['appearanceSource']),
  'modularInterface':{'dimensionsMetres':[.16,.20999999821185966,.16],'geometryPivot':'centre of normalized cube; original positive-scale matrix retained',
   'forwardAxis':'+Z','gridMetres':[1,1,2.12],'bayPitchMetres':1,'occupiedCells':'Subcell fitting centered on each recorded one-metre bay; exact per-instance bounds are authoritative.',
   'connections':['actual block min-Y to fixed source cornice max-Y','fixed source parapet min-Y to actual block max-Y'],
   'rotationPolicy':'Only the original approved matrices are placements in this batch. Cube has square XZ section; procedural rotation/mirroring outside these placements requires separate review.',
   'repetition':'One block per selected clear one-metre bay; no corners, saddles, invented braces or extra anchors.',
   'paintPolicy':'Shared original cornice material and primitive UV/grossUV arrays, unchanged physical metre density. Source material has no bitmap map; no new painted layer or finish is invented.'},
  'members':members,'joins':joins,
  'finiteLedger':{'accounting':'static-initial-addition-only','addedCanonicalAccounts':96,'canonicalFuelPerMember':.0448,'addedCoreByClass':{'frame':4.3008},'addedCoreTotal':4.3008,'addedFinishTotal':0,'addedTotal':4.3008,
   'oneOwnerPerMember':True,'activationBirth':0,'activationRefill':0,'combinedStockTotal':'Deferred to coder; not calculated or installed by this export.'},
  'retirementAndOwnership':{'canonicalFuelAccountPerMember':True,'stockCreatedAt':'initial-source-registration-before-activation-if-installed','activationBirth':0,'activationRefill':0,
   'upperDirectBearingScope':'exact recorded one-metre localChildLossBounds','wholeParapetRetirement':False,'wholeCorniceRetirement':False,'newGroundAnchors':0,'extraBraces':0,
   'remainingNeighborStability':'Existing shared native kernel; runtime behavior is not accepted by this source export.'},
  'evidence':{'originalSourceSolidExclusions':{'path':DESIGN,'sha256':DESIGN_SHA,'method':'Identity substitution into the accepted pinned source-solid exclusion proof: identical primitive, matrices, bounds and unchanged original source geometry. No fresh whole-building intersection run.',
    'geometryBindingsPath':PINS,'geometryBindingsSha256':PINS_SHA,'clearRows':96,'obstructedRowsExcluded':20,'front48Excluded':True},
   'numericRepresentationPath':(HERE/'quantity-evidence.json').relative_to(ROOT).as_posix(),
   'sharedWorkflow':{'commit':PARENT,'path':workflow_path,'sha256':digest(workflow_bytes)}}}
 sources=[{'path':(HERE/'export.py').relative_to(ROOT).as_posix(),'sha256':sha((HERE/'export.py').relative_to(ROOT).as_posix())}]
 evidence={'version':1,'output':{'path':MANIFEST,'sha256':digest(encode(manifest))},'sourcePins':[manifest['sourceDesign'],manifest['baseBindings'],manifest['reviewedFrontPrototype'],manifest['geometry'],{'path':PINS,'sha256':PINS_SHA}],
  'authoringSources':sources,'scope':{'members':96,'instanceTriangles':1152,'localBearings':192,'uniqueOriginalParents':len({j['parentCarrierId'] for j in joins if j['parentCarrierId'] in by}|{j['childCarrierId'] for j in joins if j['childCarrierId'] in by}),'newGroundAnchors':0,'newGeometryBuffers':0,'newFinishAccounts':0},
  'additionalStaticFramePrototypeUnits':4.3008,'runtimeInstallation':False}
 return {MANIFEST:encode(manifest),(HERE/'export-evidence.json').relative_to(ROOT).as_posix():encode(evidence),
  (HERE/'quantity-evidence.json').relative_to(ROOT).as_posix():encode(quantities(front)),contract['snapshotPath']:contract_bytes,approval['snapshotPath']:approval_bytes}
def main():
 p=argparse.ArgumentParser(description=__doc__);p.add_argument('--check',action='store_true');args=p.parse_args();outputs=build()
 for name,data in outputs.items():
  path=ROOT/name
  if args.check:assert path.read_bytes()==data,'Non-deterministic export: '+name
  else:path.parent.mkdir(parents=True,exist_ok=True);path.write_bytes(data)
 print(json.dumps({'result':'PASS','mode':'check' if args.check else 'export','outputs':len(outputs),'members':96,'triangles':1152,'bearings':192,'addedStaticFrame':4.3008,'manifestSha256':digest(outputs[MANIFEST])}))
if __name__=='__main__':main()
