"""Audit saved evidence and pins; never retransform, search or reevaluate."""
from pathlib import Path
import json,hashlib,ast,sys
sys.dont_write_bytecode=True
HERE=Path(__file__).resolve().parent;ROOT=HERE.parents[3]
def sha(b):return hashlib.sha256(b).hexdigest()
def load(n):return json.loads((HERE/n).read_bytes())
plan=load('plan.json');phase=load('result.json');final=load('final-source-certificate.json');world=load('world-tables.json');api=load('api-context.json')
for pinfile in ['input-pins.json','completion-pins.json']:
 pins=load(pinfile)
 for p in pins['local']:assert sha((HERE/p['path']).read_bytes())==p['sha256'],(pinfile,p['path'])
 for p in pins.get('dependencies',[]):
  b=ROOT.joinpath(p['path']).read_bytes();assert len(b)==p['bytes'] and sha(b)==p['sha256'],p['path']
prior=plan['priorAttempt'];assert sha(ROOT.joinpath(prior['planPath']).read_bytes())==prior['planSha256']
assert sha(ROOT.joinpath(prior['resultPath']).read_bytes())==prior['resultSha256']
oldplan=json.loads(ROOT.joinpath(prior['planPath']).read_bytes());old=json.loads(ROOT.joinpath(prior['resultPath']).read_bytes())
oldPacket=ROOT/'art/source/shared-map-fire-bindings/new-york-lower-root-trace-v1'
oldReview=json.loads((oldPacket/'review-package.json').read_bytes())
for p in oldReview['files']:
 b=(oldPacket/p['path']).read_bytes();assert len(b)==p['bytes'] and sha(b)==p['sha256']
assert [p['partId'] for p in world['parts']]==plan['partIds']==[p['partId'] for p in oldplan['instances']]
assert [p['id'] for p in phase['contacts']]==plan['pairIds']==[p['id'] for p in final['contacts']]
assert len(world['parts'])==36<=64 and len(phase['contacts'])==34<=128
for p in world['parts']:
 priorPart=next(v for v in old['parts'] if v['partId']==p['partId']);assert p['proof']==priorPart['proof']
 assert p['ownerId'] not in oldplan['forbiddenOwners']
assert sha((HERE/'world-tables.json').read_bytes())==phase['worldTablesSha256']==final['worldTablesSha256']
assert sha((HERE/'result.json').read_bytes())==final['phase1ResultSha256']
for c in api.values():assert sha(c['moduleText'].encode())==c['sha256']
assert api['tolerance']['declaration']=='export const SOURCE_SUPPORT_TOLERANCE=.00002;'
assert 'parts:14000,bonds:20000,fragments:65536,triangles:400000' in api['core']['moduleText']
byOwner={p['ownerId']:p for p in world['parts']}
for i,r in enumerate(phase['contacts']):
 q=r['proof'];assert q and all(q['nativeContactChecks']) and all(q['ownPrimitiveMembership']) and all(q['ownSelectors'])
 assert q['gapMetres']<=2e-5 and q['existingPortDistanceRule']['toleranceMetres']==2e-5
 assert max(q['ownPlaneResidualMetres'])==0
 for side,owner in enumerate([r['parentOwner'],r['childOwner']]):
  p=byOwner[owner];assert q['primitives'][side] in p['proof']['emittedWorldComponents'][q['components'][side]]['primitives']
  point=q['points'][side];b=r['endpointSelectors']['bounds'][side];assert all(b['min'][j]<=point[j]<=b['max'][j] for j in range(3))
 if q['parallel']:assert q['projectedFootprint']['areaSquareMetres']>0 and all(min(b)>0 for b in q['barycentricCoordinates'])
 assert all(not x['ownWrongPrimitiveMembership'] for x in r['negativeControls']['wrongOriginalFace'])
 native=r['negativeControls']['beyondNativeAcceptance'];assert not native['nativeContact'] and native['minimumBoundsSeparationMetres']>1e-5 and native['actualSourceFaces']
 distance=r['negativeControls']['beyondPortDistance']
 if distance is None:distance=next(c['beyondPortDistance'] for c in final['completedControls'] if c['id']==r['id'])
 assert not distance['portDistanceAccepted'] and distance['distanceMetres']>distance['toleranceMetres']==2e-5
 assert final['contacts'][i]['status']=='source-contact-proposed'
for a in phase['anchors']:
 p=byOwner[a['ownerId']];t=p['triangles'][a['evidence']['primitive']];assert t==a['evidence']['triangle'] and all(v[1]==a['originalAnchor']['elevation']==0 for v in t)
for trace in final['selectedTraces'].values():
 assert len(trace['edgeIds'])==16
 for i,eid in enumerate(trace['edgeIds']):
  r=next(r for r in phase['contacts'] if r['id']==eid);assert r['childOwner']==trace['childToAncestor'][i] and r['parentOwner']==trace['childToAncestor'][i+1]
 assert trace['actualMaterialAnchorRef']
eval=final['evaluation'];assert eval['invoked'] and eval['evaluations']==1 and phase['evaluation']['evaluations']==0
assert all(p['supported'] for p in eval['lowerParents']) and all(p['live'] for p in eval['result']['ports'])
assert len(eval['result']['ports'])==34 and len(eval['result']['supportedIds'])==36 and not eval['result']['unrootedIds']
assert not eval['result']['unresolvedBindings'] and not eval['result']['oldEdgeConflicts']
assert eval['disposed']['closed'] and eval['disposed']['parts']==eval['disposed']['bindings']==0
counts=final['counts'];assert counts['newParts']==counts['newPairs']==counts['additionalSourceTransformations']==counts['additionalContactSearches']==0
assert counts['sourceTransformationsThisMethod']==36 and counts['totalAcrossMethods']==72 and counts['coldCoreEvaluations']==1
precision=load('precision-audit.json');assert precision['result']=='PASS' and len(precision['rows'])==33
assert all(r['exactDyadicPolygonAreaPositive'] and all(r['exactOwnPlaneAndStrictInterior']) for r in precision['rows'])
assert counts['wrongFaceNegatives']==68 and counts['beyondNativeNegatives']==counts['beyondPortDistanceNegatives']==34
for prefix in ['', 'completion-']:
 receipt=load(prefix+'helper-receipt.json');events=[json.loads(s) for s in (HERE/(prefix+'lifecycle.jsonl')).read_text().splitlines()]
 assert len(events)==2 and events[0]['event']=='started' and events[1]['event']=='exited'
 assert all(events[0][k]==events[1][k]==receipt[k] for k in ['pid','startedAt','purpose'])
 assert receipt['exited'] and receipt['exitCode']==0 and not receipt['timedOut'] and receipt['elapsedMs']<60000 and receipt['port'] is None
 coordinator=load(prefix+'coordinator.json');assert coordinator['remainingHelpers']==0 and coordinator['retainedPorts']==[] and coordinator['elapsedMs']<600000
for p in HERE.glob('*.py'):ast.parse(p.read_text(encoding='ascii'))
checks={'result':'SAVED_SOURCE_CERTIFICATE_AND_METADATA_PASS','localInputPins':len(load('input-pins.json')['local']),
 'dependencyPins':len(load('input-pins.json')['dependencies']),'completionPins':len(load('completion-pins.json')['local']),
 'preservedPriorPayloadPins':len(oldReview['files']),'sourceParts':36,'declaredPairs':34,'sourceContactProofs':34,
 'positiveParallelFootprints':33,'exactStrictInteriorEndpoints':66,'savedNativePredicateChecks':sum(len(r['proof']['nativeContactChecks']) for r in phase['contacts']),
 'wrongOriginalFaceNegatives':68,'beyondNativeNegatives':34,'beyondPortDistanceNegatives':34,'actualMaterialAnchors':2,
 'coldCoreEvaluations':1,'supportedOriginalLowerParents':2,'supportedColdComponents':36,'livePorts':34,'unresolvedBindings':0,'oldEdgeConflicts':0,
 'sourceTransformsThisMethod':36,'verificationTransforms':0,'verificationContactSearches':0,'ownedChildrenExited':2,'retainedHelpers':0,
 'nativeRecords':'UNBOUND','nativeCells':'UNBOUND'}
if '--write' in sys.argv:
 with (HERE/'checks.json').open('xb') as f:f.write((json.dumps(checks,separators=(',',':'))+'\n').encode())
else:
 if (HERE/'checks.json').exists():assert load('checks.json')==checks
print(json.dumps(checks,separators=(',',':')))
