"""Additive New York first-control support descriptor; never rewrites source bindings."""
from pathlib import Path
import argparse,copy,hashlib,json,subprocess
HERE=Path(__file__).resolve().parent;ROOT=HERE.parents[3]
OUTPUT='assets/art/shared-map-support-overrides/new-york-controls-v1.json';EVIDENCE='art/source/shared-map-fire-bindings/support-overrides-v1/export-evidence.json'
BEFORE='art/source/shared-map-fire-bindings/reachability-review-v1/proposal.json';BEFORE_SHA='218ef7c7ebd7dfee6de11430bcc49c494b51bb954533c76ac9da21bec662d58c'
BINDINGS='assets/art/shared-map-fire-bindings/new-york-complete-v1.json';BINDINGS_SHA='407c0f8bd582f8d95b9ade1471cd51892ac7b9a40fd2c005696bcc5485991eba'
OVERLAY='assets/art/shared-map-derived-geometry/new-york/v1/index.json';OVERLAY_SHA='f1252c7364adfeb025f573fc4650020e71915a3e17e71bcf2e725e56c3f1c941'
def sha(path):return hashlib.sha256((ROOT/path).read_bytes()).hexdigest()
def read(path):return json.loads((ROOT/path).read_text(encoding='utf-8'))
def policy(commit,path,snapshot):
 data=subprocess.check_output(['git','show',commit+':'+path],cwd=ROOT)
 assert (ROOT/snapshot).read_bytes()==data
 return {'commit':commit,'path':path,'snapshotPath':snapshot,'sha256':hashlib.sha256(data).hexdigest()}
def build():
 assert sha(BINDINGS)==BINDINGS_SHA and sha(OVERLAY)==OVERLAY_SHA and sha(BEFORE)==BEFORE_SHA
 before=read(BEFORE);base=read(BINDINGS);by={c['id']:c for c in base['carriers']};study=read('art/source/shared-map-fire-bindings/reachability-review-v1/review-evidence.json');pairs={e['case']:e for e in study['targetPairEvidence']}
 authority=policy('01da2407d22dcb9dbfb607a7559ed8c56c379ba5','docs/milestones/29-shared-gameplay-maps.md','art/source/shared-map-fire-bindings/support-overrides-v1/authority-01da2407.md')
 contract=policy('6a01e2bb1281fcb037c25208d0a70b35442c9c1c','docs/engineering/shared-maps/support-overrides-contract.md','art/source/shared-map-fire-bindings/support-overrides-v1/contract-6a01e2bb.md')
 joins=[]
 for proposed in before['proposedLocalPairs']:
  case=proposed['case'];measured=pairs[case];child=proposed['childCarrierId'];parent=proposed['parentCarrierId'];kind={'fixed-embed':'fixed-embed','verified-source-contact-candidate':'structural-seam','explicit-carpentry-face-joint-proposal':'carpentry-butt-joint'}[proposed['proposedKind']]
  def region(name,cid):
   result=copy.deepcopy(proposed[name]);result['boundsMeaning']=result['meaning']
   for ref in result['geometryRefs']:
    b=next(b for b in by[cid]['renderBindings'] if b['physicalContribution']=='carrier-solid' and b['sourcePartId']==ref['sourcePartId'] and b['geometryPath']==ref['geometryPath'] and b['matrix']==ref['matrix'] and b.get('sourceRange')==ref['sourceRange'])
    ref.update(partId=b['partId'],geometryId=b['geometryId'],sha256=sha(b['geometryPath']))
   return result
  evidence={'caseId':case,'beforeProposalPath':BEFORE,'positiveVolumeProof':measured['positiveVolumeProof'],'nativeTriangleContact':True,'commonStrictInteriorWitness':measured['commonStrictInteriorWitness'],'actualSurfaceWitness':measured['actualSurfaceWitness'],'boundsGapLowerBoundMetres':measured['boundsGapLowerBoundMetres'],'separatingProjectionGapLowerBoundMetres':measured['separatingProjectionGapLowerBoundMetres'],'closestVertexToTriangleUpperBoundMetres':measured['closestVertexToTriangleUpperBoundMetres'],'distanceMeaning':measured['meaning'],'nativeContactReceiptPath':'art/source/shared-map-fire-bindings/reachability-review-v1/native-contact-results.json'}
  if kind=='carpentry-butt-joint':evidence.update(fastening='Explicit architect-approved local timber carpentry butt joint at measured native face precision.',geometricBearing=False,positiveVolumeOverlap=False)
  joins.append({'childCarrierId':child,'parentCarrierId':parent,'kind':kind,'direction':'symmetric-structural' if kind=='structural-seam' else 'parent-to-child','groundAnchor':False,'childRegion':region('childRegion',child),'parentRegion':region('parentRegion',parent),'evidence':evidence,'patchScope':'Only the named actual local geometry regions; no whole long-carrier support/retirement switch.','wholeCarrierRetirement':False})
 retired=[{'childCarrierId':r['childCarrierId'],'parentCarrierId':r['parentCarrierId'],'originalEvidenceKind':r['kind'],'reason':'Retain this observed moving-leaf contact as geometry evidence. Permanent fixed-header support comes from the two named fixed jambs, independent of leaf survival or pose.','geometryEvidenceRetained':True} for r in before['portalNormalizationProposal']['originalClosedPoseBearings']]
 a={'version':1,'placeId':'new-york','scope':'Exact ten-pair first-control source override only; remaining reachability findings and complete long-span support remain separate.','baseBindings':{'path':BINDINGS,'sha256':BINDINGS_SHA},'effectiveGeometryOverlay':{'indexPath':OVERLAY,'sha256':OVERLAY_SHA},'coordinateFrame':base['coordinateFrame'],'authority':authority,'contract':contract,'joins':joins,'retiredSupportInterpretations':retired,'sourceEvidence':{'path':EVIDENCE,'beforeProposalPath':BEFORE,'beforeProposalSha256':BEFORE_SHA},'geometryAdditions':0,'fuelChanges':0,'profileChanges':0,'groundAnchorAdditions':0}
 evidence={'version':1,'placeId':'new-york','baseBindings':a['baseBindings'],'effectiveGeometryOverlay':a['effectiveGeometryOverlay'],'authority':authority,'contract':contract,'beforeProposal':{'path':BEFORE,'sha256':BEFORE_SHA},'reviewEvidence':[{'path':p,'sha256':sha(p)} for p in ['art/source/shared-map-fire-bindings/reachability-review-v1/review-evidence.json','art/source/shared-map-fire-bindings/reachability-review-v1/native-contact-results.json','art/source/shared-map-fire-bindings/support-overrides-v1/before-review.md']],'authoringSources':[{'path':p,'sha256':sha(p)} for p in ['art/source/shared-map-fire-bindings/support-overrides-v1/export.py','art/source/shared-map-fire-bindings/support-overrides-v1/check.py','art/source/shared-map-fire-bindings/support-overrides-v1/.gitattributes']],'beforeFixtureSupportRows':[{k:by[cid].get(k) for k in ['id','supportCarrierIds','supportEvidence','supportResolution','anchors','physicalMaterial','fuelClass','fuelAmount','finish','physicalBounds']} for cid in sorted({r['childCarrierId'] for r in joins})],'joinCount':len(joins),'retiredSupportInterpretationCount':len(retired),'baseFiniteLedger':base['finiteLedger'],'baseCarriers':len(base['carriers']),'remainingReachabilityAccepted':False,'runtimeBehaviorAcceptance':False,'parapetProposalApplied':False,'rendererStarted':False}
 return a,evidence
if __name__=='__main__':
 parser=argparse.ArgumentParser(description=__doc__);parser.add_argument('--check',action='store_true');args=parser.parse_args();a,e=build()
 for path,value in [(OUTPUT,a),(EVIDENCE,e)]:
  data=json.dumps(value,indent=2,sort_keys=True)+'\n'
  if args.check:assert (ROOT/path).read_text(encoding='utf-8')==data,path
  else:(ROOT/path).write_text(data,encoding='utf-8',newline='\n')
 print(json.dumps({'passed':True,'path':OUTPUT,'sha256':sha(OUTPUT),'bytes':(ROOT/OUTPUT).stat().st_size,'joins':len(a['joins']),'retiredInterpretations':len(a['retiredSupportInterpretations']),'baseBindingsUnchanged':sha(BINDINGS)==BINDINGS_SHA,'geometryOverlayUnchanged':sha(OVERLAY)==OVERLAY_SHA,'rendererStarted':False},sort_keys=True))
