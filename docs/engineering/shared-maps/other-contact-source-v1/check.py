"""Compact metadata/pin/saved-proof audit. Geometry validation has its own bounded page receipt."""
from pathlib import Path
import subprocess,json,hashlib,importlib.util,collections,re
HERE=Path(__file__).resolve().parent;ROOT=HERE.parents[3];sha=lambda b:hashlib.sha256(b).hexdigest();canonical=lambda x:json.dumps(x,sort_keys=True,separators=(',',':'),allow_nan=False)
def read(p):return json.loads(p.read_bytes())
def main():
 pins=read(HERE/'input-pins.json');plan=read(HERE/'.cache/plan.json');assert sha((HERE/'.cache/plan.json').read_bytes())==pins['planSha256'];assert pins['pageCount']==1 and len(plan['representativeIds'])==8
 for pin in pins['sourcePins']:
  data=subprocess.check_output(['git','show',pin['commit']+':'+pin['path']],cwd=ROOT);assert sha(data)==pin['sha256'] and len(data)==pin['bytes'],pin['path']
  if 'cache' in pin:assert (HERE/pin['cache']).read_bytes()==data
 assert sha((HERE/'authority.md').read_bytes())==pins['authoritySha256']
 spec=importlib.util.spec_from_file_location('source_contact_finalize',HERE/'finalize.py');module=importlib.util.module_from_spec(spec);spec.loader.exec_module(module);proposal,summary=module.derive();assert proposal==read(HERE/'contacts-proposal.json') and summary==read(HERE/'checks-summary.json')
 original=read(HERE/plan['sourceRelationships']['cache'])['relationships'];bindings=read(HERE/plan['sourceGeometryBindings']['cache'])['carriers'];index=read(HERE/plan['globalIndex']['cache']);oldIds=set();corniceIds=set();attempted=set(plan['representativeIds']);counts=collections.Counter()
 for i,r in enumerate(original):
  if r['family'] in pins['families']:oldIds.add(r['id']);counts[r['family']]+=1
  else:assert r['family'].startswith('cornice');corniceIds.add(r['id'])
 assert len(oldIds)==1582 and len(corniceIds)==1694 and not oldIds&corniceIds and dict(counts)==pins['families']
 assert {r['id'] for r in proposal['relationships']}==oldIds
 for row in proposal['relationships']:
  old=original[row['sourceRelationshipOrdinal']];assert sha(canonical(old).encode())==row['sourceRelationshipCanonicalSha256'];assert row['id']==old['id'] and row['originalKind']==old['proposedKind'] and row['direction']==old['direction'] and row['groundAnchor']==old['groundAnchor']==False and row['wholeCarrierRetirement']==old['wholeCarrierRetirement']==False
 for p in proposal['instances']:
  b=bindings[p['ownerId']][0];row=index['parts'][p['globalSourcePartIndex']];carrier=index['carriers'][p['globalCarrierIndex']];assert carrier[0]==p['ownerId'] and row[0]==p['globalSourcePartId'] and sha(canonical(carrier).encode())==p['sourceCarrierCanonicalSha256'];assert p['sourceRange']==b['sourceRange'] and p['emittedWorldMatrix']==b['matrix'];assert p['nativeRecordId'] is None and p['nativeCell'] is None
 for r in proposal['regions']:
  old=original[int(r['sourcePointer'].split('/')[2])]['localRegions'][0];assert sha(canonical(old).encode())==r['originalRegionCanonicalSha256'] and r['selector']==old['selector'] and r['endpointBounds']==[old['parentBounds'],old['childBounds']];assert r['historical']['geometricBearing']==old['actualGeometryCertificate']['geometricBearing']==False
  for k in ['kind','worldWitness','sourceFace','sourceRange','actualSurfaceWitness']:
   proof=old['actualGeometryCertificate'].get('proof',{});assert (k in r['historical'])==(k in proof)
   if k in proof:assert r['historical'][k]==proof[k]
  assert (r['status']!='UNATTEMPTED')==(r['id'] in attempted)
  if r['status']=='source-contact-proposed':
   assert all(r['checks']['contact']) and len(r['contact']['primitives'])==2
   for side,key in enumerate(['parent','child']):
    p=proposal['instances'][r[key]];primitive=r['contact']['primitives'][side];assert r['contact']['rangeLocalPrimitives'][side]==primitive-p['primitiveBase']
    if p['sourceRange']:assert p['primitiveBase']<=primitive<p['primitiveBase']+p['sourceRange']['count']//3
  elif r['status']=='UNATTEMPTED':assert 'contact' not in r and 'checks' not in r
  else:assert r['status']=='unproved' and r['unprovedCode']=='original-component-unresolved'
 for label in ['prepare','page-000','verify-000']:
  run=read(HERE/'runs'/(label+'.json'));assert run['exitCode']==0 and run['foregroundCompleted'] and not run.get('timedOut') and run['timeoutSeconds']<=60 and run['ports']==[] and run['maximumRegions']<=8;assert sha((HERE/'runs'/(label+'.log')).read_bytes())==run['logSha256']
 page=read(HERE/'pages/page-000.json');check=read(HERE/'checks/page-000.json');assert check['positiveProofsRechecked']==7 and check['unprovedRetained']==1 and check['regions']==8 and check['pageSha256']==sha((HERE/'pages/page-000.json').read_bytes());assert sha((HERE/'page.mjs').read_bytes())==page['pageCheckerSha256']==check['pageCheckerSha256']
 for p in read(HERE/'drafts.json'):assert sha((HERE/p['path']).read_bytes())==p['sha256']
 for link in re.findall(r'\]\(([^)]+)\)',(HERE/'README.md').read_text(encoding='utf-8')):assert (HERE/link).resolve().is_file(),link
 print(json.dumps({'checked':True,'pairs':1582,'regions':1582,'attempted':8,'proposed':7,'unproved':1,'UNATTEMPTED':1574,'contactPredicateChecks':24,'negativeChecks':38,'rawSourcePins':len(pins['sourcePins']),'newNativeCompilerCalls':0}))
if __name__=='__main__':main()
