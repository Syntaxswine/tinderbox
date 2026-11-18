"""Assemble scalar dictionaries and one checked page. Never computes geometry."""
from pathlib import Path
import json,hashlib,collections,sys,copy
HERE=Path(__file__).resolve().parent;sha=lambda b:hashlib.sha256(b).hexdigest()
def canonical(x):return json.dumps(x,sort_keys=True,separators=(',',':'),allow_nan=False)
def read(path):return json.loads(path.read_bytes())
def derive():
 pins=read(HERE/'input-pins.json');plan=read(HERE/'.cache/plan.json');assert sha((HERE/'.cache/plan.json').read_bytes())==pins['planSha256'];page=read(HERE/'pages/page-000.json');check=read(HERE/'checks/page-000.json');assert sha((HERE/'pages/page-000.json').read_bytes())==check['pageSha256'];assert len(page['regions'])==8
 reports={r['id']:r for r in page['regions']};assert set(reports)==set(plan['representativeIds']);proofs={p['id']:p for p in page['instanceProofs']};topologies=[];topologyBy={};instances=[]
 for original in plan['instances']:
  item=copy.deepcopy(original);proof=proofs.get(item['id']);item['originalGeometryStatus']='representative-evaluated' if proof else 'UNATTEMPTED';item['topology']=None;item['orderedWorldTrianglesFloat64LittleEndianSha256']=proof['orderedWorldTrianglesFloat64LittleEndianSha256'] if proof else None;item['originalPartWorldTrianglesFloat64LittleEndianSha256']=proof['originalPartWorldTrianglesFloat64LittleEndianSha256'] if proof else None
  if proof:
   item['componentFailure']=proof['failure']
   if not proof['failure']:
    key=canonical(proof['topology'])
    if key not in topologyBy:topologyBy[key]=len(topologies);topologies.append({'id':len(topologies),'components':proof['topology']})
    item['topology']=topologyBy[key]
  instances.append(item)
 source=read(HERE/plan['sourceRelationships']['cache'])['relationships'];relationships=[]
 for r in plan['relationships']:
  item=copy.deepcopy(r);old=source[r['sourceRelationshipOrdinal']];item.update({'groundAnchor':old['groundAnchor'],'wholeCarrierRetirement':old['wholeCarrierRetirement'],'sourceRelationshipCanonicalSha256':sha(canonical(old).encode())});relationships.append(item)
 regions=[]
 for row in plan['regions']:
  item=copy.deepcopy(row);report=reports.get(row['id'])
  if not report:item['status']='UNATTEMPTED'
  else:
   item['status']=report['status'];item['calculationStats']=report['stats']
   if report['status']=='source-contact-proposed':
    contact=copy.deepcopy(report['contact']);contact['rangeLocalPrimitives']=[contact['primitives'][i]-plan['instances'][row[s]]['primitiveBase'] for i,s in enumerate(['parent','child'])];item['contact']=contact;item['checks']=report['checks']
   else:item['unprovedCode']=report['reason'];item['unprovedInstances']=[row[s] for s in ['parent','child'] if proofs[row[s]]['failure']]
  regions.append(item)
 families={}
 for family,pairs in plan['families'].items():
  rs=[r for r in regions if r['family']==family];counts=collections.Counter(r['status'] for r in rs);families[family]={'pairs':pairs,'regions':len(rs),'attempted':sum(counts[s] for s in ['source-contact-proposed','unproved']),'proposed':counts['source-contact-proposed'],'unproved':counts['unproved'],'UNATTEMPTED':counts['UNATTEMPTED']}
 positives=[r for r in regions if r['status']=='source-contact-proposed'];unproved=[r for r in regions if r['status']=='unproved'];counts=collections.Counter(r['status'] for r in regions);assert counts=={'source-contact-proposed':7,'unproved':1,'UNATTEMPTED':1574}
 summary={'scope':'Eight deterministic source representatives only','pairs':1582,'regions':1582,'attempted':8,'proposed':7,'unproved':1,'UNATTEMPTED':1574,'families':families,'geometryBuffersReferenced':92,'geometryBuffersRead':sum(g['cache'] is not None for g in plan['geometries']),'instances':len(instances),'instanceGeometriesEvaluated':len(proofs),'surfaceTopologyDictionaries':len(topologies),'sourceRangeInstances':16,'contactPredicateChecks':sum(len(r['checks']['contact']) for r in positives),'negativeChecks':{k:sum(r['checks'][k] for r in positives) for k in ['wrongPrimitiveNegatives','outsideSelectorNegatives','legacyWitnessNegatives']},'unprovedCases':[{'relationship':r['relationship'],'region':r['id'],'code':r['unprovedCode'],'instances':r['unprovedInstances']} for r in unproved],'nativeCompilerCalls':0,'runtimeSourceDecoderCalls':0,'sourceBlueprintExpansions':0,'graphWorldRendererBuildBenchmarkRuns':0}
 geometries=[{k:v for k,v in g.items() if k!='cache'} for g in plan['geometries']]
 proposal={'version':1,'status':'UNACCEPTED_FIRST_PAGE_SOURCE_CONTACT_INPUTS','runtimeConsumable':False,'authority':['authority.md','refinement.md'],'sourceRef':plan['sourceRef'],'inputPinsSha256':sha((HERE/'input-pins.json').read_bytes()),'coordinateFrame':{'frame':'emitted-world','units':'metres','sourceOffsetAlreadyApplied':True,'additionalOffsetApplied':False},'selectionPolicy':'First original relationship ordinal in each named family; one original local region each. All other regions UNATTEMPTED.','derivation':'Existing witnesses or centroids/interiors of actual original facet intersections only; unique original primitive membership and unchanged contact predicates required. No nearest survivor, cap, new tolerance or geometry repair.','pointMembership':'Original segmentTriangle predicate, geometry EPS 1e-7; float plane residuals are reported, not claimed as exact rational coplanarity.','primitiveConvention':'Contact primitives are absolute original buffer triangle ordinals. rangeLocalPrimitives separately subtract sourceRange.start/3. Components enumerate the full original physical mesh before selecting the original source range.','helpers':{'contact':{k:v for k,v in plan['helpers']['contact'].items() if k!='cache'},'components':{k:v for k,v in plan['helpers']['components'].items() if k!='cache'}},'geometries':geometries,'topologies':topologies,'instances':instances,'relationships':relationships,'regions':regions,'representatives':plan['representatives'],'scopeInventory':plan['scopeInventory'],'summary':summary,'limitations':['Proposed fixed physical contacts only. Original relationship kinds, roles, direction, recipes and historical witnesses/null/false fields are preserved; no new bearing strength, fastening, anchor or grounding claim.','Exact-edge connected surface components are the existing helper result, not a general material-volume solver. One original baluster mesh remains unproved; no repair or fallback was used.','Native IDs/cells/faces remain unbound. No native/compiler/source decoder/graph/world/publication/render/build or whole-map check was run.','The other 1574 regions and 76 unread geometry buffers remain unattempted. The disjoint 1694 cornice pairs remain the artist scope.']}
 return proposal,summary
def write_compact(path,x):
 entries=[]
 for k,v in x.items():
  if k in ['geometries','topologies','instances','relationships','regions']:body='[\n'+',\n'.join('    '+canonical(r) for r in v)+'\n  ]'
  else:body=canonical(v)
  entries.append('  '+json.dumps(k)+': '+body)
 path.write_text('{\n'+',\n'.join(entries)+'\n}\n',encoding='utf-8')
def main():
 proposal,summary=derive()
 if '--record' in sys.argv:
  assert not (HERE/'contacts-proposal.json').exists() and not (HERE/'checks-summary.json').exists();write_compact(HERE/'contacts-proposal.json',proposal);(HERE/'checks-summary.json').write_text(json.dumps(summary,indent=2)+'\n',encoding='utf-8')
 else:assert read(HERE/'contacts-proposal.json')==proposal and read(HERE/'checks-summary.json')==summary
 print(json.dumps({'attempted':8,'proposed':7,'unproved':1,'UNATTEMPTED':1574,'contactChecks':summary['contactPredicateChecks'],'negativeChecks':sum(summary['negativeChecks'].values())}))
if __name__=='__main__':main()
