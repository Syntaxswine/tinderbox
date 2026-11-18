"""Metadata/pin/saved-evidence audit; no geometry decoding or transformations."""
from pathlib import Path
import json,hashlib,ast,re,sys
sys.dont_write_bytecode=True
HERE=Path(__file__).resolve().parent;ROOT=HERE.parents[3]
def sha(b):return hashlib.sha256(b).hexdigest()
def load(n):return json.loads((HERE/n).read_bytes())
def pointer(root,p):
 for bit in p.strip('/').split('/'):
  bit=bit.replace('~1','/').replace('~0','~');root=root[int(bit)] if isinstance(root,list) else root[bit]
 return root
plan=load('plan.json');result=load('result.json');pins=load('input-pins.json');coordinator=load('coordinator.json')
for p in pins['local']:assert sha((HERE/p['path']).read_bytes())==p['sha256'],p['path']
for p in pins['dependencies']:
 b=ROOT.joinpath(p['path']).read_bytes();assert len(b)==p['bytes'] and sha(b)==p['sha256'],p['path']
base=json.loads(ROOT.joinpath(plan['base']['path']).read_bytes());overlay=json.loads(ROOT.joinpath(plan['overlay']['path']).read_bytes())
replaced={r['partId'] for r in overlay['replacements']}
assert result['planSha256']==sha((HERE/'plan.json').read_bytes())
assert result['inputPinsSha256']==sha((HERE/'input-pins.json').read_bytes())
assert coordinator['outputSha256']==sha((HERE/'result.json').read_bytes())
assert len(plan['instances'])==36<=64 and len(plan['relationships'])==34<=128
assert len({s['partId'] for s in plan['instances']})==36
for p in plan['instances']:
 c=pointer(base,p['sourceCarrierPointer']);binding=pointer(base,p['sourceBindingPointer'])
 assert p['originalMetadata']=={k:v for k,v in c.items() if k!='renderBindings'}
 for k,v in binding.items():assert p[k]==v
 assert p['sourceRange'] is None and p['partId'] not in replaced
 assert p['ownerId'] not in plan['forbiddenOwners'] and p['globalSourcePartIndex'] is None
for i,r in enumerate(plan['relationships']):
 assert pointer(base,r['candidatePointer'])==r['parentOwner']
 child=plan['instances'][r['child']];parent=plan['instances'][r['parent']]
 assert child['ownerId']==r['childOwner'] and parent['ownerId']==r['parentOwner']
 for e in r['historicalEvidence']+r['historicalAttachments']:assert pointer(base,e['pointer'])==e['record']
 saved=result['contacts'][i];assert saved['id']==r['id'] and saved['direction']==r['direction']
 assert saved['originalHistoryRef']['pointer']=='/relationships/'+str(i)
 ep=saved['sourceSelector']['actualEndpointBounds'];selector=saved['sourceSelector']['selector']
 assert selector=={'min':[max(b['min'][j] for b in ep) for j in range(3)],'max':[min(b['max'][j] for b in ep) for j in range(3)]}
 assert saved['sourceSelector']['empty']==any(selector['min'][j]>selector['max'][j] for j in range(3))
 if saved['result']['status']=='source-contact-proposed':
  p=saved['result']['contact']['point'];assert all(selector['min'][j]<=p[j]<=selector['max'][j] for j in range(3))
  assert all(saved['result']['checks']['contact'])
  assert max(saved['result']['checks']['planeResidualMetres'])<=1e-7
 else:assert saved['result']['reason'] in ['empty-selector-intersection','no-unambiguous-original-contact']
for p in result['parts']:
 assert p['proof']['absoluteOriginalPrimitiveIdsPreserved'] and p['proof']['positivePartitionsMatch']
 assert p['proof']['failure'] is None and p['proof']['closedFlagsNotUsedAsSurfaceContactGate']
for a in result['anchors']:
 assert pointer(base,a['sourcePointer'])==a['originalAnchor'] and a['status']=='declared-anchor-actual-material-verified'
 e=a['evidence'];assert e['areaSquareMetres']>0 and all(v[1]==a['originalAnchor']['elevation']==0 for v in e['triangle'])
assert not result['evaluation']['invoked'] and result['counts']['coldOriginalSupportEvaluations']==0
assert result['counts']['distinctOriginalParts']==result['counts']['sourceTransformations']==36
assert result['counts']['examinedDeclaredPairs']==34 and result['counts']['positiveSourceContacts']==17 and result['counts']['unprovedSourceContacts']==17
assert result['nativeLineage']=='UNBOUND' and result['counts']['nativeRecordsBound']==result['counts']['nativeCellsBound']==result['counts']['nativeCompilations']==0
for p in plan['unexamined']:
 all_ids=pointer(base,p['candidateListPointer']);assert len(all_ids)==p['totalCandidates']
 assert len(all_ids)-len(p['examinedCandidateIndices'])==p['remainingCount']
for p in plan['existingCorniceResults']:
 d=json.loads(ROOT.joinpath(p['path']).read_bytes());assert len(d['regions'])==p['records']
 assert sum(r['result']['status']=='source-contact-proposed' for r in d['regions'])==p['positive']
 assert sum(r['result']['status']=='unproved' for r in d['regions'])==p['unproved']
events=[json.loads(line) for line in (HERE/'lifecycle.jsonl').read_text().splitlines()]
assert len(events)==2 and events[0]['event']=='started' and events[1]['event']=='exited'
a,z=events;assert (a['pid'],a['startedAt'],a['purpose'])==(z['pid'],z['startedAt'],z['purpose'])
assert z['exited'] and z['exitCode']==0 and not z['timedOut'] and z['elapsedMs']<60000 and z['port'] is None
assert coordinator['remainingHelpers']==0 and coordinator['retainedPorts']==[] and coordinator['elapsedMs']<600000
for n in ['prepare.py','coordinate.py','verify.py']:ast.parse((HERE/n).read_text(encoding='ascii'))
# Selector lineage and immutable referenced context, without geometry reads.
lineage=load('selector-lineage.json');assert lineage['existingTypedSelectorPairs']==1 and lineage['newLegacySelectorPairs']==33
for l in lineage['pairs']:
 if l['kind']=='existing-typed-local-selectors':
  rel=next(r for r in plan['relationships'] if r['id']==l['id']);r=next(r for r in result['contacts'] if r['id']==l['id'])
  original=pointer(base,l['sourcePointer'])
  assert original['parentRegion']['bounds']==l['parentSelector']==r['sourceSelector']['selector']
  assert original['childRegion']['bounds']==l['childSelector']==r['sourceSelector']['selector']
for ref in load('references.json')['references']:
 b=ROOT.joinpath(ref['path']).read_bytes();assert len(b)==ref['bytes'] and sha(b)==ref['sha256']
checks={'result':'SAVED_EVIDENCE_AND_METADATA_PASS','localInputPins':len(pins['local']),'dependencyPins':len(pins['dependencies']),
 'preservedCarrierMetadataRecords':36,'declaredPairPointers':34,'actualAnchorPointers':2,'additionalGeometryDecodes':0,'additionalSourceTransforms':0,
 'additionalContactSearches':0,'additionalCohorts':0,'sourceContacts':17,'namedUnproved':17,
 'savedContactPredicateChecks':sum(len(r['result'].get('checks',{}).get('contact',[])) for r in result['contacts']),
 'savedWrongPrimitiveNegatives':sum(r['result'].get('checks',{}).get('wrongPrimitiveNegatives',0) for r in result['contacts']),
 'maxSavedPlaneResidualMetres':max(v for r in result['contacts'] for v in r['result'].get('checks',{}).get('planeResidualMetres',[])),
 'helperChildrenLaunched':1,'helperChildrenExited':1,'nativeRecords':'UNBOUND','nativeCells':'UNBOUND'}
print(json.dumps(checks,separators=(',',':')))
if '--write' in sys.argv:
 with (HERE/'checks.json').open('xb') as f:f.write((json.dumps(checks,separators=(',',':'))+'\n').encode())
