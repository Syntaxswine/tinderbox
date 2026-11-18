"""Saved-only audit of exactly three independent immutable source proposals."""
from pathlib import Path
import json,hashlib,struct,ast,sys
sys.dont_write_bytecode=True
HERE=Path(__file__).resolve().parent;ROOT=HERE.parents[3]
def sha(b):return hashlib.sha256(b).hexdigest()
def load(n):return json.loads((HERE/n).read_bytes())
def pointer(root,p):
 for key in p.strip('/').split('/'):
  key=key.replace('~1','/').replace('~0','~');root=root[int(key)] if isinstance(root,list) else root[key]
 return root
def binaryHash(ts):return sha(b''.join(struct.pack('<d',v) for t in ts for p in t for v in p))
pins=load('input-pins.json');plan=load('plan.json');summary=load('summary.json');world=load('world-tables.json')
for p in pins['local']:assert sha((HERE/p['path']).read_bytes())==p['sha256'],p['path']
for p in pins['dependencies']:
 b=ROOT.joinpath(p['path']).read_bytes();assert len(b)==p['bytes'] and sha(b)==p['sha256'],p['path']
manifest=json.loads(ROOT.joinpath(plan['manifest']['path']).read_bytes());archive=json.loads(ROOT.joinpath(plan['savedWorldArchive']['path']).read_bytes())
assert sha((HERE/'authority-b7958c76.md').read_bytes())==plan['authority']['sha256']
assert len(world['parts'])==4 and sum(len(p['triangles']) for p in world['parts'])==48
assert world['counts']['sourceTransforms']==world['counts']['rawGeometryBuffersCreated']==world['counts']['nativeGeometryObjectsCreated']==0
byOwner={p['ownerId']:p for p in world['parts']};body=manifest['members'][0]['id']
for p in world['parts']:
 assert binaryHash(p['triangles'])==p['worldTrianglesFloat64LittleEndianSha256']
 if p['ownerId']!=body:assert p['triangles']==archive['originalParentWorldTriangles'][p['ownerId']]
 else:assert p['triangles']==[[archive['actualPhysicalWorldVertices'][j] for j in archive['actualPhysicalIndex'][i:i+3]] for i in range(0,48,3)]
 assert sum(len(c['primitives']) for c in p['components'])==len(p['triangles'])
for i,row in enumerate(summary['proofs']):
 b=(HERE/row['path']).read_bytes();assert sha(b)==row['sha256'];p=json.loads(b);port=plan['ports'][i]
 assert p['status']=='SOURCE_WITNESS_PROPOSAL' and p['approval']=='PROPOSAL_FOR_INDEPENDENT_ARCHITECT_REVIEW'
 assert p['portId']==port['id'] and p['direction']=='parent-to-child'
 assert p['declaredPrimitiveSets']==port['declaredPrimitiveSets'] and pointer(manifest,port['manifestPointer'])==port['originalPort']
 assert p['planSha256']==sha((HERE/'plan.json').read_bytes()) and p['worldTablesSha256']==sha((HERE/'world-tables.json').read_bytes())
 for side,owner in [('parent',port['parentOwnerId']),('child',port['childOwnerId'])]:
  e=p[side];part=byOwner[owner];allowed=port['declaredPrimitiveSets']['saddle' if owner==body else 'original']
  assert e['ownerId']==owner and e['qualifiedOwnerId']=='new-york::'+owner and e['declaredPrimitiveIds']==allowed and e['primitive'] in allowed
  assert e['primitive'] in part['components'][e['component']]['primitives']
  assert e['nativeRecordId'] is None and e['nativeCell'] is None and e['nativeSurfaceId'] is None
  assert e['sourceRange'] is None and e['worldPartFloat64LittleEndianSha256']==part['worldTrianglesFloat64LittleEndianSha256']
  assert all(e['selector']['min'][j]<=e['point'][j]<=e['selector']['max'][j] for j in range(3))
  if port['upperIntervalX'] and owner!=body:assert e['upperOriginalIntervalX']==[49,50] and e['selector']['min'][0]==49 and e['selector']['max'][0]==50
 q=p['geometryWitness'];assert q['projectedFootprint']['areaSquareMetres']>0 and all(q['ownSurfaceMembership']) and all(q['ownSelectorMembership'])
 assert all(min(b)>0 for b in q['ownBarycentricCoordinates']) and max(q['ownPlaneResidualMetres'])<=1e-7
 assert q['nativeOriginalTriangleContact'] and q['nativeOwnClippedTriangleContact'] and q['existingPortDistanceRule']['accepted']
 assert q['gapMetres']<=q['existingPortDistanceRule']['toleranceMetres']==2e-5 and q['membershipToleranceMetres']==1e-7
 assert q['stats']['fixedOriginalPrimitivePairsExamined']<=4
 for k,side in enumerate(['parent','child']):
  e=p[side];t=byOwner[e['ownerId']]['triangles'][e['primitive']];assert q['selectedOriginalTriangles'][k]==t and q['selectedTrianglesFloat64LittleEndianSha256'][k]==binaryHash([t])
 assert p['negativeControls']['complete']
 for n in p['negativeControls']['wrongOriginalFaces']:assert not n['wrongFaceOwnMembership'] and not n['wrongFaceAllowedByPort'] and not n['geometryChanged']
 n=p['negativeControls']['beyondPortDistance'];assert n['distanceMetres']>n['existingToleranceMetres']==2e-5 and not n['portDistanceAccepted']
 assert all(n['ownSurfaceMembership']) and all(n['ownSelectorMembership']) and n['sameOriginalFaceNativeContactAccepted']
 assert p['fixedPortSemantics']==manifest['selectedSupportSemantics'] and p['canonicalSaddleQuantityRef']==plan['canonicalSaddleQuantity']
 assert p['counts']['sourceTransforms']==p['counts']['supportSolves']==p['counts']['nativeCompiles']==p['counts']['clockSteps']==0
encoding=load('normal-encoding.json');assert len(encoding['endpoints'])==6
for row in encoding['endpoints']:
 raw=(HERE/row['proof']).read_bytes();p=json.loads(raw);encoded=bytes.fromhex(row['canonicalNormalBinary64LittleEndianHex'])
 assert len(encoded)==24 and sha(raw)==row['proofSha256'] and sha(encoded)==row['canonicalNormalSha256']
 i=0 if row['endpoint']=='parent' else 1
 assert row['canonicalNormalSha256']==p['geometryWitness']['canonicalNormalFloat64LittleEndianSha256'][i]
 assert list(struct.unpack('<ddd',encoded))==p['geometryWitness']['normals'][i]
assert struct.pack('<d',plan['canonicalSaddleQuantity']['value']).hex()==plan['canonicalSaddleQuantity']['binary64LittleEndian']=='a2262142908aa43f'
assert plan['canonicalSaddleQuantity']['uniqueOwners']==1 and not plan['semantics']['newAnchor'] and plan['semantics']['fittingRequirement']['operator']=='ALL_FIXED_PORTS'
assert plan['semantics']['upperDependency']['direction']=='parent-to-child' and plan['semantics']['upperDependency']['localOneMetreIntervalX']==[49,50]
assert summary['counts']['interfaces']==3 and summary['counts']['sourceTransforms']==summary['counts']['nativeCompiles']==summary['counts']['supportSolves']==summary['counts']['historicalNativeExperimentsRerun']==0
assert summary['counts']['wrongFaceNegatives']==6 and summary['counts']['distanceNegatives']==3 and not summary['runtimeApprovalChanged']
receipt=load('helper-receipt.json');events=[json.loads(s) for s in (HERE/'lifecycle.jsonl').read_text().splitlines()]
assert len(events)==2 and events[0]['event']=='started' and events[1]['event']=='exited'
assert all(events[0][k]==events[1][k]==receipt[k] for k in ['pid','startedAt','purpose'])
assert receipt['exited'] and receipt['exitCode']==0 and not receipt['timedOut'] and receipt['deadlineSeconds']==30 and receipt['elapsedMs']<30000 and receipt['port'] is None
coord=load('coordinator.json');assert coord['remainingHelpers']==0 and coord['retainedPorts']==[] and coord['outputSha256']==sha((HERE/'summary.json').read_bytes())
for p in HERE.glob('*.py'):ast.parse(p.read_text(encoding='ascii'))
checks={'result':'THREE_IMMUTABLE_SOURCE_PROPOSALS_AND_PINS_PASS','localPins':len(pins['local']),'dependencyPins':len(pins['dependencies']),'acceptedSourcePins':len(plan['sourcePins']),
 'parts':4,'originalPhysicalTriangles':48,'proofs':3,'sourceTransforms':0,'verificationTransforms':0,'verificationContactSearches':0,
 'fixedOriginalPrimitivePairsExamined':summary['counts']['fixedOriginalPrimitivePairsExamined'],'numericNativePredicateCalls':summary['counts']['numericNativePredicateCalls'],
 'ownEndpointMemberships':6,'positiveFootprints':3,'wrongFaceNegatives':6,'distanceNegatives':3,'uniqueSaddleQuantityOwners':1,'quantityBits':'a2262142908aa43f',
 'nativeCompiles':0,'supportSolves':0,'historicalNativeExperimentsRerun':0,'ownedChildrenExited':1,'retainedHelpers':0,'runtimeApprovalChanged':False,'nativeBindings':'UNBOUND'}
if '--write' in sys.argv:
 with (HERE/'checks.json').open('xb') as f:f.write((json.dumps(checks,separators=(',',':'))+'\n').encode())
else:
 if (HERE/'checks.json').exists():assert load('checks.json')==checks
print(json.dumps(checks,separators=(',',':')))
