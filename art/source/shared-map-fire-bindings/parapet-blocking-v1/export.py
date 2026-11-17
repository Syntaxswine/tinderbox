"""Export only the separately approved 48-member New York support addition."""
from pathlib import Path
import argparse,copy,importlib.util,json,subprocess,sys
sys.dont_write_bytecode=True
HERE=Path(__file__).resolve().parent;ROOT=HERE.parents[3]
spec=importlib.util.spec_from_file_location('blocking_source_model',HERE/'model.py');M=importlib.util.module_from_spec(spec);spec.loader.exec_module(M)
OUTPUT=M.DIRECTORY+'/index.json';EVIDENCE='art/source/shared-map-fire-bindings/parapet-blocking-v1/export-evidence.json'
def pinned_policy(commit,path,snapshot):
 raw=subprocess.check_output(['git','show',commit+':'+path],cwd=ROOT);assert (ROOT/snapshot).read_bytes()==raw
 return {'commit':commit,'path':path,'snapshotPath':snapshot,'sha256':M.digest(raw)}
def encode_manifest(a):
 rows=[]
 for key in sorted(a):
  value=a[key]
  if key in ('members','joins'):encoded='[\n'+',\n'.join('    '+M.canonical(row).decode() for row in value)+'\n  ]'
  else:encoded=json.dumps(value,indent=2,sort_keys=True).replace('\n','\n  ')
  rows.append('  '+json.dumps(key)+': '+encoded)
 return '{\n'+',\n'.join(rows)+'\n}\n'
def build():
 proposal,base,geometry,geometry_ref,members,joins=M.records();before=M.read('art/source/shared-map-fire-bindings/parapet-blocking-v1/before-and-authority.json')
 authority=pinned_policy('ca5fc5ba7d0b87a8c16f16ff80bcf13185c308a5','docs/milestones/29-shared-gameplay-maps.md','art/source/shared-map-fire-bindings/parapet-blocking-v1/authority-ca5fc5ba.md')
 contract=pinned_policy('4e8dacc0720234e7f630606b91e067f90cf4bb7c','docs/engineering/shared-maps/support-additions-contract.md','art/source/shared-map-fire-bindings/parapet-blocking-v1/contract-4e8dacc0.md')
 assert before['authority']==authority and before['contract']==contract
 original_proposal=subprocess.check_output(['git','show','9a88959d2011d182377a9eeb95d5ed9d222e46b1:'+M.PROPOSAL],cwd=ROOT);assert original_proposal==(ROOT/M.PROPOSAL).read_bytes()
 ledger=copy.deepcopy(base['finiteLedger']);ledger.update(addedCanonicalAccounts=48,canonicalFuelPerMember=.0448,addedCoreByClass={'frame':2.1504},addedCoreTotal=2.1504,addedFinishTotal=0,addedTotal=2.1504,baseTotal=base['finiteLedger']['total'],accounting='static-initial-canonical-source',activationBirth=0,activationRefill=0,oneOwnerPerMember=True)
 ledger['coreByClass']['frame']=round(ledger['coreByClass']['frame']+2.1504,6);ledger['coreTotal']=round(ledger['coreTotal']+2.1504,6);ledger['total']=round(ledger['total']+2.1504,6)
 a={'version':1,'placeId':'new-york','scope':'Only the exact 48 approved modeled blocks and 96 local bearings; separate source intake after the base plus ten-control pilot.','coordinateFrame':base['coordinateFrame'],'authority':authority,'contract':contract,'approvedProposal':{'commit':'9a88959d2011d182377a9eeb95d5ed9d222e46b1','path':M.PROPOSAL,'sha256':M.PROPOSAL_SHA},'baseBindings':{'path':M.BASE,'sha256':M.BASE_SHA},'effectiveGeometryOverlay':{'indexPath':M.OVERLAY,'sha256':M.OVERLAY_SHA},'supportOverrides':{'path':M.CONTROLS,'sha256':M.CONTROLS_SHA},'geometry':geometry_ref,'appearanceSource':{'indexPath':base['sourceScene']['indexPath'],'sha256':base['sourceScene']['sha256'],'materialId':proposal['appearance']['reuseAppearanceMaterialId'],'sourceCarrierId':'carrier/edge-0/cornice-7'},'members':members,'joins':joins,'finiteLedger':ledger,'retirementAndOwnership':{'canonicalFuelAccountPerMember':True,'stockCreatedAt':'initial-source-registration-before-activation','activationBirth':0,'activationRefill':0,'geometryStateOwner':'same-shared-source-registry-render-and-physical-owner','upperDirectBearingScope':'only-the-exact-one-metre-localChildLossBounds','wholeParapetRetirement':False,'wholeCorniceRetirement':False,'extraCrossBayBraces':0,'newGroundAnchors':0,'forcedBayBreak':False,'remainingNeighborStability':'existing-shared-native-kernel','originalCarrierGeometryAndStockUntouched':True},'evidence':{'path':EVIDENCE,'beforePath':'art/source/shared-map-fire-bindings/parapet-blocking-v1/before-and-authority.json','originalGroundPath':proposal['existingExplicitGroundPath'],'noRuntimeAcceptanceImplied':True}}
 sources=['art/source/shared-map-fire-bindings/parapet-blocking-v1/'+p for p in ['model.py','export.py','check.py','check-native-contacts.mjs','.gitattributes']]
 evidence={'version':1,'placeId':'new-york','output':{'path':OUTPUT,'sha256':M.digest(encode_manifest(a).encode())},'geometry':geometry_ref,'authority':authority,'contract':contract,'approvedProposal':a['approvedProposal'],'beforePath':a['evidence']['beforePath'],'beforeSha256':M.sha(a['evidence']['beforePath']),'immutableSourceInputs':before['immutableSourceInputs'],'sourceGeometryAndQuantityStudy':{'path':'art/source/shared-map-fire-bindings/support-overrides-v1/parapet-blocking-checks.json','sha256':M.sha('art/source/shared-map-fire-bindings/support-overrides-v1/parapet-blocking-checks.json')},'authoringSources':[{'path':p,'sha256':M.sha(p)} for p in sources],'physicalMathSources':[{'path':'art/source/shared-map-fire-bindings/export.py','sha256':M.sha('art/source/shared-map-fire-bindings/export.py')}],'newCanonicalMembers':48,'sharedGeometries':1,'trianglesPerMember':12,'addedTriangles':576,'directedLocalBearings':96,'addedStaticFrameFuel':2.1504,'combinedStaticTotal':15770.094353,'existingCanonicalOwners':before['beforeCanonicalCarrierCount'],'combinedCanonicalOwners':before['beforeCanonicalCarrierCount']+48,'originalGroundPath':proposal['existingExplicitGroundPath'],'existingSourceAssetsChanged':False,'otherUnrootedComponentsAccepted':False,'runtimeActivationOrLocalLossAcceptance':False,'rendererStarted':False}
 return a,geometry,evidence
if __name__=='__main__':
 parser=argparse.ArgumentParser(description=__doc__);parser.add_argument('--check',action='store_true');args=parser.parse_args();a,geometry,evidence=build()
 outputs=[(a['geometry']['path'],M.canonical(geometry)+b'\n'),(OUTPUT,encode_manifest(a).encode()),(EVIDENCE,(json.dumps(evidence,indent=2,sort_keys=True)+'\n').encode())]
 for path,data in outputs:
  target=ROOT/path
  if args.check:assert target.read_bytes()==data,path
  else:target.parent.mkdir(parents=True,exist_ok=True);target.write_bytes(data)
 print(json.dumps({'passed':True,'path':OUTPUT,'sha256':M.sha(OUTPUT),'manifestBytes':(ROOT/OUTPUT).stat().st_size,'geometryId':a['geometry']['id'],'geometryFileSha256':a['geometry']['sha256'],'geometryBytes':(ROOT/a['geometry']['path']).stat().st_size,'members':48,'localBearings':96,'addedStaticFrameFuel':2.1504,'combinedStaticTotal':15770.094353,'rendererStarted':False},sort_keys=True))
