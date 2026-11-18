"""Freeze a finite metadata cohort before opening any source geometry."""
from pathlib import Path
import json,hashlib
HERE=Path(__file__).resolve().parent;ROOT=HERE.parents[3]
def sha(b):return hashlib.sha256(b).hexdigest()
def dump(n,d):
 p=HERE/n
 with p.open('xb') as f:f.write((json.dumps(d,ensure_ascii=True,separators=(',',':'))+'\n').encode())
basepath='assets/art/shared-map-fire-bindings/new-york-complete-v1.json'
b=ROOT.joinpath(basepath).read_bytes();assert sha(b)=='407c0f8bd582f8d95b9ade1471cd51892ac7b9a40fd2c005696bcc5485991eba'
base=json.loads(b);by={c['id']:(i,c) for i,c in enumerate(base['carriers'])}
starts=['carrier/edge-6/cornice-7','carrier/roof/rear-tail']
forbidden=['carrier/roof-saddle-native/main-parapet-6/bay-01','carrier/main-parapet-6/base']
paths=[];examined=[];ordered=[]
def add(cid):
 assert cid not in forbidden
 if cid not in ordered:ordered.append(cid)
def trace(start,label):
 cid=start;seen=set();ids=[]
 while True:
  assert cid not in seen and len(ids)<25
  seen.add(cid);add(cid);ids.append(cid);i,c=by[cid]
  if c['anchors'] or not c['supportCarrierIds']:break
  parent=c['supportCarrierIds'][0];pair=(cid,parent)
  if pair not in examined:examined.append(pair)
  cid=parent
 paths.append({'id':label,'childToAncestor':ids,'terminal':cid,'declaredAnchorCount':len(by[cid][1]['anchors'])})
trace(starts[0],'cornice-first-declared-chain')
roof=by[starts[1]][1];add(starts[1])
for i,parent in enumerate(roof['supportCarrierIds'][:3]):
 examined.append((starts[1],parent));trace(parent,'roof-alternative-'+str(i))
assert len(ordered)<=64 and len(examined)<=128
instances=[];geometries=[];gindex={};unexamined=[];relations=[]
overlaypath='assets/art/shared-map-derived-geometry/new-york/v1/index.json';overlaybytes=ROOT.joinpath(overlaypath).read_bytes();overlay=json.loads(overlaybytes)
replacements={r['partId']:r for r in overlay['replacements']}
for j,cid in enumerate(ordered):
 ci,c=by[cid];physical=[(bi,p) for bi,p in enumerate(c['renderBindings']) if p['physicalContribution']=='carrier-solid']
 assert len(physical)==1
 bi,p=physical[0];assert p.get('sourceRange') is None
 assert p['partId'] not in replacements,'Effective replacement needs separate explicit lineage review'
 gp=p['geometryPath']
 if gp not in gindex:
  gindex[gp]=len(geometries);geometries.append({'id':p['geometryId'],'path':gp,'sha256':None,'bytes':None})
 instances.append({**p,'id':j,'geometry':gindex[gp],'sourceRange':None,'ownerId':cid,'globalSourcePartIndex':None,'globalCarrierIndex':ci,
  'sourceBindingPointer':'/carriers/'+str(ci)+'/renderBindings/'+str(bi),
  'sourceCarrierPointer':'/carriers/'+str(ci),'originalMetadata':{k:v for k,v in c.items() if k!='renderBindings'},
  'effectiveGeometry':{'replacement':False,'overlayPath':overlaypath,'overlaySha256':sha(overlaybytes),'preservedOriginalBuffer':True}})
 picked=[p for ch,p in examined if ch==cid]
 unexamined.append({'ownerId':cid,'candidateListPointer':'/carriers/'+str(ci)+'/supportCarrierIds','totalCandidates':len(c['supportCarrierIds']),
  'examinedCandidateIndices':[c['supportCarrierIds'].index(p) for p in picked],'remainingCount':len(c['supportCarrierIds'])-len(picked),
  'attachmentsPointer':'/carriers/'+str(ci)+'/attachmentRecords','adjacencyPointer':'/carriers/'+str(ci)+'/adjacencyCarrierIds',
  'scope':'Remaining alternatives/ancestors are metadata references only; absence from cohort is not absence of support.'})
structure={'building-deck','exterior-wall','perimeter-closure','interior-stair','roof-covering','raised-base','approach-stair','exterior-paving','column'}
for n,(child,parent) in enumerate(examined):
 ci,c=by[child];pi,p=by[parent];k=c['supportCarrierIds'].index(parent)
 evidence=[{'pointer':'/carriers/'+str(ci)+'/supportEvidence/'+str(ei),'record':e} for ei,e in enumerate(c['supportEvidence']) if e['carrierId']==parent]
 attachments=[{'pointer':'/carriers/'+str(ci)+'/attachmentRecords/'+str(ei),'record':e} for ei,e in enumerate(c.get('attachmentRecords',[])) if e.get('parentCarrierId')==parent]
 direction='symmetric-structural' if c['role'] in structure and p['role'] in structure and not any('mount' in str(x['record'].get('kind','')) for x in attachments) else 'parent-to-child'
 relations.append({'id':'legacy-pair-'+str(n).zfill(3),'parent':ordered.index(parent),'child':ordered.index(child),'parentOwner':parent,'childOwner':child,
  'candidatePointer':'/carriers/'+str(ci)+'/supportCarrierIds/'+str(k),'historicalEvidence':evidence,'historicalAttachments':attachments,
  'direction':direction,'interpretation':'ordinary-alternative; a newly proved surface contact remains bearing evidence, never a rewritten historical fixed embed',
  'newSelectorRule':'Exact intersection of actual transformed endpoint triangle bounds; original endpoint facets clipped by unchanged facet method. No expansion/padding/snapping; empty intersection is named unproved.',
  'originalSelector':None})
prior=[]
for filename in ['child-032-page-00.json','child-032-page-01.json']:
 rp='art/source/shared-map-fire-bindings/cornice-facet-delta-v1/pages/'+filename;raw=ROOT.joinpath(rp).read_bytes();d=json.loads(raw)
 prior.append({'path':rp,'sha256':sha(raw),'records':len(d['regions']),'positive':sum(r['result']['status']=='source-contact-proposed' for r in d['regions']),
 'unproved':sum(r['result']['status']=='unproved' for r in d['regions']),'pointer':'/regions','reuse':'Reference only; no recalculation of the 34 normalized cornice records.'})
assert sum(x['positive'] for x in prior)==23 and sum(x['unproved'] for x in prior)==11
plan={'version':1,'scope':'One finite original-source lower-root cohort; source evidence only, no runtime admission',
 'planning':'Frozen before geometry payload reads, expansion or transformation; first declared cornice path and first three roof alternatives, first declared parent thereafter.',
 'authority':'authority.md','limits':{'distinctOriginalParts':64,'examinedDeclaredPairs':128,'transformationsPerAdmittedPart':1,'coordinatorSeconds':600,'hiddenChildSeconds':60},
 'base':{'path':basepath,'sha256':sha(b)},'overlay':{'path':overlaypath,'sha256':sha(overlaybytes)},'starts':starts,'forbiddenOwners':forbidden,
 'independence':'Only declared original-parent chains admitted. No fitting, upper or descendant-derived links; genuine original ancestors only.',
 'paths':paths,'instances':instances,'geometries':geometries,'relationships':relations,'unexamined':unexamined,'existingCorniceResults':prior,
 'counts':{'distinctOriginalParts':len(instances),'examinedDeclaredPairs':len(relations),'geometryBuffers':len(geometries)},
 'semantics':{'ordinaryAlternatives':'One proved grounded declared route suffices for each ordinary lower parent; unexamined alternatives remain unresolved.',
 'saddle':'ALL_FIXED_PORTS remains required; three approved ports and Float32 maps are references only; saddle and upper excluded from this evaluation.',
 'upperLocalInterval':[49,50],'nativeRecords':'UNBOUND','nativeCells':'UNBOUND','coldEvaluation':'At most one existing-core source-only cold evaluation, conditional on BOTH complete independently rooted paths; none if a required selected trace contact remains unproved.'}}
dump('plan.json',plan)
print(json.dumps({'plan':'FROZEN_BEFORE_GEOMETRY','sha256':sha((HERE/'plan.json').read_bytes()),**plan['counts']}))
