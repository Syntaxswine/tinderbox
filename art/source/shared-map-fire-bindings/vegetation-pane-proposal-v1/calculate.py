"""Reproduce source-only vegetation and glazing proposals; no runtime exports."""
from pathlib import Path
from fractions import Fraction as F
import argparse,collections,copy,hashlib,importlib.util,json,os,re,subprocess,sys
sys.dont_write_bytecode=True
HERE=Path(__file__).resolve().parent;ROOT=HERE.parents[3]
AUTHORITY='02aa95bbcc2b95927837fbab05a4a6002f201ff9';AUTHORITY_PATH='docs/engineering/shared-maps/vegetation-and-pane-proposal.md'
PARENT='e3b301860fad13855c7d2a8926f81bb1c4aed6be'
CODER='5478eb5cbb4c701ce88e3642c58a13eb7547f282';CODER_PATH='docs/engineering/shared-maps/bounded-source-regions-v1.md'
def module(name,path):
 s=importlib.util.spec_from_file_location(name,path);m=importlib.util.module_from_spec(s);s.loader.exec_module(m);return m
S=module('vegetation_pane_sources',HERE/'source.py')
P=module('vegetation_controls',HERE/'vegetation.py');P.configure(S)
M=module('original_native_scale_masks',HERE/'cells.py');M.configure(S)
G=module('glazing_source_catalogue',HERE/'glazing.py');G.configure(S,M)
def preserve():
 count=0
 names=('remaining-material-proposal-v1','remaining-geometry-readiness-v1','radial-roundoff-policy-proposal-v1','radial-measurement-certificates-v1','remaining-cut-front-proposal-v1','remaining-measurement-batch-v1','direct-front-retained-cut-v1','retained-cut-case-batch-v1','cut-partition-edge-ownership-v1','remaining-eight-cut-references-v1')
 for name in names:
  folder=HERE.parent/name;pkg=S.load(folder/'review-package.json')
  for pin in pkg['files']:
   raw=(ROOT/pin['path']).read_bytes();assert S.sha(raw)==pin['sha256'] and len(raw)==pin['bytes']
  assert (folder/'review-package.json').read_bytes()==S.git((folder/'review-package.json').relative_to(ROOT).as_posix(),PARENT)
  count+=len(pkg['files'])+1
 assert count==144
 pins=S.load(HERE.parent/'remaining-geometry-readiness-v1/geometry-pins.json')['files'];assert len(pins)==1572
 for pin in pins:assert S.sha((ROOT/pin['path']).read_bytes())==pin['sha256']
 assert (HERE/'authority-02aa95bb.md').read_bytes()==S.git(AUTHORITY_PATH,AUTHORITY)
 assert (HERE/'coder-bounded-source-5478eb5c.md').read_bytes()==S.git(CODER_PATH,CODER)
 return count
def source_profiles():
 path='workbenches/furnished-house/scene.js';raw=(ROOT/path).read_bytes();original=S.git(path,PARENT)
 assert raw.replace(b'\r\n',b'\n')==original.replace(b'\r\n',b'\n')
 def read(text):
  result={}
  for profile in ('frame','cloth'):
   m=re.search(r'\b'+profile+r':\{([^}]+)\}',text);assert m
   result[profile]={k:float(v) for k,v in re.findall(r'(\w+):([.\d]+)',m[1])}
  return result
 profiles=read(raw.decode('utf-8'));assert profiles==read(original.decode('utf-8'))
 assert profiles=={'frame':{'threshold':1.3,'delay':3.,'seconds':180.,'energy':2250.},'cloth':{'threshold':.8,'delay':.5,'seconds':20.,'energy':600.}}
 return {'sourcePath':path,'workingSha256':S.sha(raw),'committedSha256':S.sha(original),'sourceCommit':PARENT,'existingProfiles':profiles,'selectedResponseScale':{'threshold':1,'delay':1},'otherProfileUsersUnchanged':True,'wetFieldOrSolver':False,'globalOverrides':False,'profileInstallation':False,'existingThermalCell':[.5,1.06,.5],'existingDefaultGridOrigin':[0,.48,0],'authoredAssetTile':[1,2.12,1]}
def validate_plants(data,original):
 owners=data['owners'];patches=data['patches'];followers=data['followers']
 assert len(owners)==98 and len(patches)==208 and len(followers)==204
 assert len({o['logicalOwnerKey'] for o in owners})==98
 expected={o['proposalKey']:o for o in original['owners']};by={o['logicalOwnerKey']:o for o in owners};assert set(by)==set(expected)
 assert len({p['localPatchKey'] for p in patches})==208
 assert {p['originalSourceReference']['sourceId'] for p in patches+followers}=={sid for o in original['owners'] for sid in o['sourceIds']}
 for owner in owners:
  key=owner['logicalOwnerKey'];prior=expected[key]
  assert owner['originalSourceIds']==prior['sourceIds'] and owner['localPatchKeys']==prior['damagePatchSourceIds']
  assert owner['proposedExistingProfileId']==('frame' if prior['kind']=='trunk' else 'cloth')
  assert owner['profileResponseControl']=={'thresholdScale':1,'delayScale':1,'globalOverride':False,'wetField':False}
  if prior['kind']!='trunk':assert owner['finiteOwnerBudget']==P.BUDGET
  assert not owner['canBraceGreenhouse'] and not owner['runtimeInstalled']
  local=[p for p in patches if p['logicalOwnerKey']==key];assert {p['localPatchKey'] for p in local}==set(prior['damagePatchSourceIds'])
  for patch in local:
   assert patch['additionalIndependentStock']==0 and patch['ownerAccountIsSoleStock'] and patch['localHitDoesNotRetireOwner']
   share=patch['proposedStockShare']
   if prior['kind']=='frond-crown':
    expectedareas={sid+'::one-sided-area' for sid in prior['damagePatchSourceIds']}
    assert set(share['denominatorMeasureIds'])==expectedareas and len(share['denominatorMeasureIds'])==12
    assert share['numeratorMeasureId']==patch['localPatchKey']+'::one-sided-area' and share['ownerBudget']==P.BUDGET
   else:assert share=={'operation':'entire-owner-budget','weight':F(1)}
 for follower in followers:
  assert follower['additionalCombustibleStock']==0 and follower['alreadyIncludedOnceInOwnerBudget'] and not follower['runtimeInstalled']
  assert follower['fixedOriginalParentPatchKeys']==expected[follower['logicalOwnerKey']]['damagePatchSourceIds']
  assert follower['parentSemantics']=='all-of-fixed-original-parent-patches'
 return True
def validate_mask(template):
 mask=template['mask'];start=template['sourceRange']['start'] if template.get('sourceRange') else 0
 allids=set(range(start,start+mask['sourceOriginalTriangleCount']*3,3));sums=collections.defaultdict(F);zero=set(mask.get('zeroAreaSourceTriangleOffsets',[]));seen=set()
 assert len({c['cellKey'] for c in mask['cells']})==len(mask['cells'])
 for cell in mask['cells']:
  for item in cell['originalTrianglePortions']:
   idx=item['originalTriangleOffset'];assert idx in allids;seen.add(idx)
   q=item['exactOrientedAreaFraction']
   if idx not in zero:assert q is not None and q>0;sums[idx]+=q
 assert seen==allids and all(sums[i]==1 for i in allids-zero)
 return True
def validate_glazing(data):
 catalogue=data['sourceCatalogue'];assert len(catalogue)==433
 by={(r['placeId'],r['originalSourceId']):r for r in catalogue};assert len(by)==433
 for template in data['maskTemplates']:validate_mask(template)
 for group in data['localDamageGroups']:
  parent=by[group['placeId'],group['originalOwnerSourceId']]
  assert group['combustibleStock']==0 and not group['additionalStockAccount'] and group['physicalScreenParticipation']
  assert not group['runtimeInstalled'] and not group['newAnchorOrBrace']
  assert group['originalMatrix']==parent['originalSourceReference']['matrix']
  assert all(c['originalFrameSourceId'] in parent['sourceFrameAssociationIdsPreserved'] for c in group['fixedOriginalFrameContacts'])
  assert 'nearest' not in group['parentSemantics'] and not group['mechanicalFasteningAndLoadCapacityApproved']
 return True
def negative_controls(plants,glazing,original):
 out=[]
 def reject(name,fn):
  try:fn()
  except AssertionError:out.append({'control':name,'result':'REJECT','sourceGeometryOrRuntimeChanged':False});return
  raise AssertionError('negative control unexpectedly accepted: '+name)
 bad={**plants,'owners':plants['owners']+[plants['owners'][0]]};reject('duplicate logical stock owner',lambda:validate_plants(bad,original))
 mutant={**plants['followers'][0],'additionalCombustibleStock':P.BUDGET};bad={**plants,'followers':[mutant]+plants['followers'][1:]};reject('add independent fruit/flower stock',lambda:validate_plants(bad,original))
 index=next(i for i,p in enumerate(plants['patches']) if p['proposedStockShare']['operation'].startswith('owner-budget'))
 local=plants['patches'][index];share={**local['proposedStockShare'],'denominatorMeasureIds':local['proposedStockShare']['denominatorMeasureIds'][:-1]};badpatch={**local,'proposedStockShare':share};bad={**plants,'patches':plants['patches'][:index]+[badpatch]+plants['patches'][index+1:]};reject('omit actual frond area from shared budget denominator',lambda:validate_plants(bad,original))
 badpatch={**local,'localHitDoesNotRetireOwner':False};bad={**plants,'patches':plants['patches'][:index]+[badpatch]+plants['patches'][index+1:]};reject('retire whole crown from first local hit',lambda:validate_plants(bad,original))
 i=next(i for i,o in enumerate(plants['owners']) if o['kind']!='trunk');owner=plants['owners'][i]
 mutant={**owner,'finiteOwnerBudget':F(.6)};bad={**plants,'owners':plants['owners'][:i]+[mutant]+plants['owners'][i+1:]};reject('silently double a selected foliage proxy budget',lambda:validate_plants(bad,original))
 mutant={**owner,'profileResponseControl':{**owner['profileResponseControl'],'thresholdScale':1.25}};bad={**plants,'owners':plants['owners'][:i]+[mutant]+plants['owners'][i+1:]};reject('activate a deferred wet-response variant',lambda:validate_plants(bad,original))
 template=next(t for t in glazing['maskTemplates'] if t['scope']=='native-cell' and t['mask']['ignoredThinAxis'] is not None)
 bad=copy.deepcopy(template);part=next(c for c in bad['mask']['cells'] if any(p['exactOrientedAreaFraction'] for p in c['originalTrianglePortions']));item=next(p for p in part['originalTrianglePortions'] if p['exactOrientedAreaFraction']);part['originalTrianglePortions'].remove(item);reject('omit an actual original glass triangle portion',lambda:validate_mask(bad))
 bad=copy.deepcopy(template);part=next(c for c in bad['mask']['cells'] if any(p['exactOrientedAreaFraction'] for p in c['originalTrianglePortions']));item=next(p for p in part['originalTrianglePortions'] if p['exactOrientedAreaFraction']);part['originalTrianglePortions'].append(item);reject('duplicate an original glass triangle portion',lambda:validate_mask(bad))
 group=glazing['localDamageGroups'][0];badgroup={**group,'combustibleStock':P.BUDGET};bad={**glazing,'localDamageGroups':[badgroup]+glazing['localDamageGroups'][1:]};reject('add fuel to a physical-only pane mask',lambda:validate_glazing(bad))
 i=next(i for i,g in enumerate(glazing['localDamageGroups']) if g['fixedOriginalFrameContacts']);group=glazing['localDamageGroups'][i];badgroup={**group,'fixedOriginalFrameContacts':[{**group['fixedOriginalFrameContacts'][0],'originalFrameSourceId':'unrelated-surviving-frame'}]};bad={**glazing,'localDamageGroups':glazing['localDamageGroups'][:i]+[badgroup]+glazing['localDamageGroups'][i+1:]};reject('rebind a pane to an unrelated surviving frame',lambda:validate_glazing(bad))
 return out
def build():
 prior=preserve();profiles=source_profiles();sources=S.Sources()
 original=S.load(HERE.parent/'remaining-geometry-readiness-v1/living-plant-representation-proposal.json')
 glasses=S.load(HERE.parent/'remaining-geometry-readiness-v1/glazing-ownership-review.json')['records']
 print('Checking 98 original plant owners and their source geometry',flush=True)
 plants=P.build(original,sources);validate_plants(plants,original)
 print('Checking 433 original glazing parts and proposed local masks',flush=True)
 glazing=G.build(glasses,sources);validate_glazing(glazing)
 negatives=negative_controls(plants,glazing,original)
 gaps=[
 {'id':'one-owner-local-patch-stock','proposal':'One explicit logical owner account with finite budget; original local patches debit normalized shares and cannot mint/refill stock on activation. Frond shares are exact normalized area expressions; finite interval enclosures do not replace conservation.','accepted':False},
 {'id':'nonfuel-follower-local-parents','proposal':'Fixed original patch selections with all-of semantics and zero additional fuel; follower heat/damage routes into its existing owner budget. Local cold/native/retired state must not reparent to a distant survivor.','accepted':False},
 {'id':'original-triangle-portion-retirement','proposal':'Source-local native-scale masks retain original geometry/ranges, including front/back/edges for proven thin-axis sheets. Partial triangle retirement needs reviewed common physical/query/render semantics; membership alone cannot authorize deleting the whole triangle or sheet.','accepted':False},
 {'id':'canonical-native-grid-admission','proposal':'These source-local damage masks use existing .5/1.06/.5 scale, distinct from 1/2.12/1 authored tiles. Mapping to canonical native cell/region IDs needs pinned original world grid/compiler admission; no canonical selector is installed.','accepted':False},
 {'id':'physical-only-zero-fuel-screen','proposal':'Zero combustible stock with explicit source physical screening, local damage and retirement. Do not infer physical participation from the absence of fuel, or use a quantity reference as physical closedness.','accepted':False},
 {'id':'fixed-local-frame-ports','proposal':'Any-of fixed original local frame-contact selections for pane groups; all-of fixed original local patch for plant followers. Geometry contact is not mechanical fastening or capacity approval. No adjacent-pane/plant brace or automatic earth anchor.','accepted':False},
 {'id':'envelope-local-damage','proposal':'Preserve the 208 top-level plant patches; canopy/clump envelopes need finer original-source local damage state before first wiring. A first hit cannot retire a whole crown or all owner followers.','accepted':False},
 ]
 summary={'version':1,'result':'PASS_SOURCE_PROPOSAL_CHECKS_ONLY','authorityCommit':AUTHORITY,'runtimeConsumable':False,'plantLogicalOwners':98,'trunkTimberFrameOwners':22,'foliageClothProxyOwners':76,'finiteFoliageBudgetEachBinary64':.30,'localPlantDamagePatches':208,'zeroAdditionalStockFollowers':204,'trunkMeasurementCertificates':len(plants['trunkMeasurements']),'oneSidedFrondAreaCertificates':len(plants['frondAreas']),'plantSourceIds':412,'originalGlazingParts':433,'authoredDisconnectedVentOpeningGroups':len(glazing['authoredVentOpeningMemberships']),'localGlazingDamageGroupsProposed':len(glazing['localDamageGroups']),'maskGeometryTemplates':len(glazing['maskTemplates']),'exactCandidateGlassFrameTriangleTests':glazing['exactCandidateTriangleContactTests'],'localGlassGroupsWithGeometricFrameContact':sum(bool(g['fixedOriginalFrameContacts']) for g in glazing['localDamageGroups']),'plantLocalExceptions':len(plants['exceptions']),'glassLocalExceptions':len(glazing['exceptions']),'sourceParentIdsNotFound':len(sources.missing),'negativeControls':len(negatives),'priorPayloadAndPackageFilesPreserved':prior,'originalGeometryInputsPreserved':1572,'sourceFilesActuallyRead':len(sources.pins),'schemaProposalsUnaccepted':len(gaps),'profileWetFieldGlobalOverrideInstalled':False,'geometryBindingsStockRuntimeExports':0,'worldNativeFactoryRendererOrRetainedHelper':False}
 return {'input-pins.json':{'version':1,'authorityCommit':AUTHORITY,'parentArtistCommit':PARENT,'originalContext':S.FROZEN,'coderDraftCommit':CODER,'coderDraftPath':CODER_PATH,'coderGeneralPlantPaneSchemaAccepted':False,'sourceInputs':[sources.pins[k] for k in sorted(sources.pins)],'profileSource':profiles,'producerPins':S.B.producer_pins(),'originalPlantProposalPath':'art/source/shared-map-fire-bindings/remaining-geometry-readiness-v1/living-plant-representation-proposal.json','originalGlazingCataloguePath':'art/source/shared-map-fire-bindings/remaining-geometry-readiness-v1/glazing-ownership-review.json'},'vegetation-owners-proposal.json':{'version':1,'status':'source-only first-wiring dry controls; no runtime stock installation','profiles':profiles,'owners':plants['owners'],'localPatches':plants['patches'],'followers':plants['followers'],'totalFoliageOwnerBudgetExactBinary64':76*P.BUDGET,'botanicalBiomassOrMoistureClaim':False},'plant-quantity-proofs.json':{'version':1,'trunks':plants['trunkMeasurements'],'oneSidedFrondAreas':plants['frondAreas'],'radialPhaseProof':plants['phaseProof']},'plant-parent-evidence.json':{'version':1,'dependencies':plants['parentDependence'],'newJointsAnchorsOrGreenhouseBracing':False},'glazing-source-catalogue.json':{'version':1,'sources':glazing['sourceCatalogue'],'originalFrameReferences':glazing['originalFrameReferences'],'historicalPaneAssertion':False},'glazing-local-damage-proposal.json':{'version':1,'sourceLocalNativeScaleMaskTemplates':glazing['maskTemplates'],'localDamageGroups':glazing['localDamageGroups'],'authoredVentOpeningMemberships':glazing['authoredVentOpeningMemberships'],'canonicalNativeMappingInstalled':False,'physicalFuelStock':0},'dependency-exceptions.json':{'version':1,'plantExceptions':plants['exceptions'],'glazingExceptions':glazing['exceptions'],'missingOriginalSourceParents':sources.missing,'automaticAnchorsOrReplacementParents':False},'schema-proposal.json':{'version':1,'coderDraftCommit':CODER,'proposals':gaps,'accepted':False,'bindingsRuntimeOrCompilerInstalled':False,'nativeBehaviorControlsRun':False},'negative-controls.json':{'version':1,'controls':negatives},'check-results.json':summary}
if __name__=='__main__':
 parser=argparse.ArgumentParser(description=__doc__);parser.add_argument('--save-review',action='store_true');args=parser.parse_args()
 if not args.save_review:
  def readonly(event,args):
   if event=='open' and (any(c in (args[1] or '') for c in 'wax+') or (args[2] or 0)&(os.O_WRONLY|os.O_RDWR|os.O_CREAT|os.O_TRUNC|os.O_APPEND)):raise PermissionError('Vegetation/pane proposal checker refuses writes')
   if event in {'os.remove','os.rename','os.mkdir','os.rmdir','os.truncate','os.utime','os.chmod'}:raise PermissionError('Vegetation/pane proposal checker refuses mutation')
  sys.addaudithook(readonly)
 outputs=build()
 for name,value in outputs.items():
  raw=S.B.encode(value)
  if args.save_review:
   scratch=HERE/'scratch-calculation-output';scratch.mkdir(exist_ok=True);(scratch/name).write_bytes(raw)
  else:
   import gzip
   assert gzip.open(HERE/'calculation-archive'/(name+'.gz'),'rb').read()==raw,'Archived calculation differs: '+name
 if not args.save_review and (HERE/'review-package.json').exists():
  for pin in S.load(HERE/'review-package.json')['files']:
   raw=(ROOT/pin['path']).read_bytes();assert len(raw)==pin['bytes'] and S.sha(raw)==pin['sha256']
 print(json.dumps(outputs['check-results.json'],sort_keys=True))
