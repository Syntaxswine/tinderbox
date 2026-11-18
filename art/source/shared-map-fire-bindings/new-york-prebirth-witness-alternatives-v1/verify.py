"""Opaque pins and saved proposal metadata audit; no mesh math/queries/solves."""
from pathlib import Path
import json,hashlib,ast,sys
sys.dont_write_bytecode=True
HERE=Path(__file__).resolve().parent;ROOT=HERE.parents[3]
def sha(b):return hashlib.sha256(b).hexdigest()
def load(n):return json.loads((HERE/n).read_bytes())
pins=load('input-pins.json');plan=load('plan.json');summary=load('summary.json');snapshot=load('inputs/bond-snapshot.json');parts=load('inputs/selected-originals.json')['parts'];blueprints=load('inputs/selected-blueprints.json')['surfaces'];api=load('api-context.json')
for p in pins['local']:
 b=(HERE/p['path']).read_bytes();assert len(b)==p['bytes'] and sha(b)==p['sha256'],p['path']
for k in ['threeCore','ownedLifecycle']:
 p=pins[k];assert sha(ROOT.joinpath(p['path']).read_bytes())==p['sha256']
for c in api.values():
 if 'moduleText' in c:assert sha(c['moduleText'].encode())==c['sha256'] and c['commit']==plan['evidenceCommit']
assert api['tolerance']['declaration']=='export const SOURCE_SUPPORT_TOLERANCE=.00002;'
assert len(snapshot['bonds'])==37 and len(snapshot['selectedOwners'])==4
assert [o['fuelAmount'] for o in snapshot['selectedOwners']]==[2,.12,2,.12]
assert all(o['fuelClass']=='clapboard' and o['finish'] is None for o in snapshot['selectedOwners'])
assert plan['workingSet']['borrowedShapesAfterSharing']+plan['workingSet']['scratchShapesReserved']==32
assert plan['workingSet']['borrowedTrianglesAfterSharing']+plan['workingSet']['scratchTrianglesReserved']==512
for spec,row in zip(plan['cases'],summary['outcomes']):
 old=spec['oldBond'];assert old==snapshot['bonds'][int(spec['oldBondPointer'].split('/')[-1])]
 legacy=load(spec['oldResultPath']);assert legacy['sourceWitness']=={'parent':old['parent'],'child':old['child']} and old['child']['bindingPlan'] is None
 raw=(HERE/row['path']).read_bytes();assert sha(raw)==row['sha256'];p=json.loads(raw)
 assert p['status']=='PRE_BIRTH_SOURCE_ALTERNATIVE_UNREVIEWED' and p['approvalRequired'] and p['preBirthOnly'] and not p['afterBirthRetargeting'] and not p['runtimePolicyIntake']
 assert p['prospectiveNativeIds']=={'parent':None,'child':None} and p['prospectiveSourceRevision'] is None
 assert p['oldCertificateRef']==old['proofRef'] and p['oldCertificatePointer']==old['proofPointer']
 new=p['proposedBond'];assert new['id']==old['id'] and new['kind']==old['kind']=='bearing-face' and new['direction']==old['direction']=='symmetric-structural'
 assert new['proofRef'] is None and new['proofPointer'] is None
 for side in ['parent','child']:
  for k in ['partId','ownerId','component','selector']:assert new[side][k]==old[side][k]
  assert new[side]['nativeRecordId'] is None and new[side]['point']==new[side]['originalWitness']
  expected=[{'field':k,'old':old[side].get(k),'proposed':new[side].get(k)} for k in dict.fromkeys([*old[side],*new[side]]) if old[side].get(k)!=new[side].get(k)]
  assert p['tupleDiff'][side]==expected
 assert p['parentChangeJustification']['unchangedParentCandidates']==12 and not p['unchangedParentPreferred'] and new['parent']['bindingPlan'] is None
 assert p['search']['originalFacetPairs']<=144
 w=p['sourceWitness'];assert w['positiveOriginalContactFootprintArea']>0 and all(w['sourceOriginalNativeContact']) and all(w['ownOriginalMembership']) and all(w['ownSelectorMembership'])
 assert w['gapMetres']<=w['existingDistanceToleranceMetres']==2e-5 and w['membershipToleranceMetres']==1e-7
 data=load(spec['nativePath']);child=next(c for c in parts if c['id']==new['child']['partId']);surface=next(s for s in blueprints if s['nativePartId']==child['id']);assert data['sourceSurface']==surface
 n=p['nativePhysicalAndThermalEvidence'];record=next(r for r in data['records'] if r['id']==n['diagnosticRecordId'])
 assert record['nativePartId']==child['id'] and record['sourceCarrierId']==child['ownerId'] and record['sourceSurfaceId']==surface['id']==n['sourceSurfaceId']
 assert record['sourceCell']==n['sourceCell']==new['child']['bindingPlan']['cell'] and n['originalComponent']==new['child']['component']
 assert n['originalPrimitive']==new['child']['primitive'] and n['originalPrimitive'] in n['retainedOriginalPrimitiveSet']
 assert n['pointInActualPhysical'] and n['pointInActualOriginalLineagePatch'] and n['projectedPointInActualRetainedThermal']
 assert all(0<=i<len(record['solidTriangles'] or record['triangles']) for i in n['nativePhysicalPrimitives'])
 assert all(0<=i<len(record['triangles']) for i in n['nativeThermalPrimitives']) and n['nativePhysicalComponents']==[0]
 mapping=n['currentThermalProjection'];assert mapping['status']=='DERIVED_SOURCE_PLAN_UNREVIEWED' and mapping['cellOwnership']['status']=='FIXED_SOURCE_CELL_DERIVED'
 assert mapping['bindingPlan']==new['child']['bindingPlan'] and n['futureNativeRecordId'] is None and n['futureNativeCellId'] is None
 assert new['child']['bindingPlan']['nativeRecordId'] is None and new['child']['bindingPlan']['nativeCellId'] is None and new['child']['bindingPlan']['proofRef'] is None
 neg=p['negativeControls'];assert len(neg['oldChildPointStillUnowned'])==6 and all(not r['oldPhysicalPointMember'] for r in neg['oldChildPointStillUnowned'])
 assert not neg['wrongOriginalChildPrimitive']['pointMember'] and not neg['wrongNativePhysicalPrimitive']['pointMember'] and not neg['wrongSavedCell']['pointMember'] and not neg['wrongSavedCell']['sameSelectedCell']
 assert not neg['beyondDistanceRule']['distanceRuleAccepted'] and neg['beyondDistanceRule']['distanceMetres']>2e-5 and not neg['beyondDistanceRule']['geometryChanged']
 assert p['quantity']==spec['quantity'] and p['quantity']['canonicalInput']==2 and p['quantity']['savedNativeOutput']==2.0000007051926145 and not p['quantity']['adapted']
 assert p['planSha256']==sha((HERE/'plan.json').read_bytes()) and p['inputPinsSha256']==sha((HERE/'input-pins.json').read_bytes())
assert summary['counts']['originalFacetPairsExamined']==sum(o['originalFacetPairs'] for o in summary['outcomes'])==82<=288
for k in ['sourceTransforms','geometryFactories','nativeCompiles','supportSolves','trials','clockSteps','renderers','builds','oldNativeAllowancesReplayed']:assert summary['counts'][k]==0
assert summary['counts']['boundedWorkingShapes']==32 and summary['counts']['boundedWorkingTriangles']==512
assert summary['protected']['otherBondTuplesUnchanged']==35 and summary['protected']['oldCertificatesAndNullMappingsUnchanged'] and summary['protected']['stockUnchanged'] and summary['protected']['runtimePolicyUnchanged']
receipt=load('helper-receipt.json');events=[json.loads(s) for s in (HERE/'lifecycle.jsonl').read_text().splitlines()]
assert len(events)==2 and events[0]['event']=='started' and events[1]['event']=='exited'
assert all(events[0][k]==events[1][k]==receipt[k] for k in ['pid','startedAt','purpose'])
assert receipt['exited'] and receipt['exitCode']==0 and not receipt['timedOut'] and receipt['deadlineSeconds']==30 and receipt['elapsedMs']<30000 and receipt['port'] is None
coord=load('coordinator.json');assert coord['remainingHelpers']==0 and coord['retainedPorts']==[] and coord['outputSha256']==sha((HERE/'summary.json').read_bytes())
for p in HERE.glob('*.py'):ast.parse(p.read_text(encoding='ascii'))
code=(HERE/'source-alternatives.mjs').read_text()
for forbidden in ['compileScene(', 'createHybridSourceSupport(', 'createOriginalSupportPorts(', 'createRuntime(', '.applyMatrix4(', 'nativePanel(']:assert forbidden not in code
checks={'result':'TWO_UNREVIEWED_PRE_BIRTH_PROPOSALS_SAVED_METADATA_PASS','localInputPins':len(pins['local']),'rawDiagnosticInputs':6,'preservedOldBondTuples':37,'otherBondTuplesUnchanged':35,
 'proposals':2,'unchangedParentPhaseCandidates':24,'originalFacetPairs':82,'sourceTransforms':0,'verificationTransforms':0,'verificationContactQueries':0,
 'childSourceAndPhysicalMemberships':2,'sameCellThermalMappings':2,'oldPointNativeRefusalsPreserved':12,'wrongOriginalFaceNegatives':2,'wrongNativeFaceNegatives':2,'wrongCellNegatives':2,'distanceNegatives':2,
 'parentMappings':'UNBOUND_NEW_PARENT_TUPLES','prospectiveNativeIds':None,'canonicalChildQuantityEach':2,'rawSavedNativeQuantityEach':2.0000007051926145,'quantitiesChanged':False,
 'nativeCompiles':0,'supportSolves':0,'oldNativeAllowancesReplayed':0,'ownedChildrenExited':1,'retainedHelpers':0,'runtimePolicyChanged':False}
if '--write' in sys.argv:
 with (HERE/'checks.json').open('xb') as f:f.write((json.dumps(checks,separators=(',',':'))+'\n').encode())
else:
 if (HERE/'checks.json').exists():assert load('checks.json')==checks
print(json.dumps(checks,separators=(',',':')))
