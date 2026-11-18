"""Freeze two pre-birth interfaces and copy only immutable saved evidence/APIs."""
from pathlib import Path
import json,hashlib,subprocess
HERE=Path(__file__).resolve().parent;ROOT=HERE.parents[3]
COMMIT='beafca54b7f6c18058a4a56f700e7303acede7aa';BASE='docs/engineering/shared-maps/new-york-two-panel-native-diagnostic-v1/'
def sha(b):return hashlib.sha256(b).hexdigest()
def git(c,p):return subprocess.run(['git','show',c+':'+p],check=True,capture_output=True,creationflags=getattr(subprocess,'CREATE_NO_WINDOW',0)).stdout
def dump(n,v):
 p=HERE/n;p.parent.mkdir(parents=True,exist_ok=True)
 with p.open('xb') as f:f.write((json.dumps(v,separators=(',',':'))+'\n').encode())
brief='docs/engineering/shared-maps/new-york-witness-alternatives-and-stock.md';authority=git('29b46945',brief);(HERE/'authority-29b46945.md').write_bytes(authority)
files=['selected-originals.json','selected-blueprints.json','native-legacy-pair-008.json','native-legacy-pair-026.json','result-legacy-pair-008.json','result-legacy-pair-026.json']
sourcepins=[];inputs={}
for name in files:
 raw=git(COMMIT,BASE+name);p=HERE/'inputs'/name;p.parent.mkdir(exist_ok=True);p.write_bytes(raw)
 sourcepins.append({'commit':COMMIT,'sourcePath':BASE+name,'path':'inputs/'+name,'bytes':len(raw),'sha256':sha(raw)});inputs[name]=json.loads(raw)
metadataPath='docs/engineering/shared-maps/new-york-native-cell-correction-v1/mapped-plan-proposal.json';metadataRaw=git(COMMIT,metadataPath);metadata=json.loads(metadataRaw)
ids=['legacy-pair-008','legacy-pair-026'];parts=inputs['selected-originals.json']['parts'];bps=inputs['selected-blueprints.json']['surfaces']
snapshot={'source':{'commit':COMMIT,'path':metadataPath,'sha256':sha(metadataRaw)},'sourceRevision':metadata['sourceRevision'],'grid':metadata['grid'],
 'bonds':metadata['support']['bonds'],'selectedOwners':[o for o in metadata['owners'] if any(o['id']==p['ownerId'] for p in parts)],
 'preservation':'Metadata snapshot only. All 37 old tuples, old certificates and null mappings are immutable. No production policy file is changed.'}
assert len(snapshot['bonds'])==37 and len(snapshot['selectedOwners'])==4
dump('inputs/bond-snapshot.json',snapshot)
sourcepins.append({'commit':COMMIT,'sourcePath':metadataPath,'sourceSha256':sha(metadataRaw),'path':'inputs/bond-snapshot.json','sha256':sha((HERE/'inputs/bond-snapshot.json').read_bytes()),'derived':'Exact /support/bonds plus the four named owner rows and source/grid metadata; no mesh data extracted.'})
apiPaths={'geometry':'workbenches/furnished-house/geometry.js','support':'workbenches/furnished-house/support.js',
 'fixedCell':'src/content/source-fixed-cell.js','projection':'src/content/shared-map-source-preparation.js',
 'lineage':'src/content/cornice-wall-contact-pilot.js','component':'src/simulation/original-support-ports.js','tolerance':'src/simulation/source-support-calculations.js'}
api={}
for key,path in apiPaths.items():
 b=git(COMMIT,path);api[key]={'commit':COMMIT,'path':path,'sha256':sha(b),'moduleText':b.decode()}
s=api['support']['moduleText'];a=s.index('function inPrism(');b=s.index('// Read-only geometry query',a);api['support']['closure']=s[a:b]
s=api['lineage']['moduleText'];a=s.index('export function originalContactPatches(');b=s.index('export function proveCorniceWallContact(',a);api['lineage']['function']=s[a:b]
s=api['component']['moduleText'];api['component']['declaration']=s[s.index('const vector='):s.index('const normal=')];api['component']['normal']=s[s.index('const normal='):s.index('const shape=')]
a=s.index('export function originalMaterialComponents(');b=s.index('export function createOriginalSupportPorts(',a);api['component']['function']=s[a:b]
s=api['projection']['moduleText'];api['projection']['declaration']=s[s.index('const used='):s.index('const pendingCodes=')]
a=s.index('export class SourcePreparationBoundary');b=s.index('\n',a);api['projection']['boundaryClass']=s[a:b]
a=s.index('export function deriveSharedSourceEndpoint(');b=s.index('// Reuse the host',a);api['projection']['function']=s[a:b]
s=api['tolerance']['moduleText'];a=s.index('export const SOURCE_SUPPORT_TOLERANCE=');b=s.index(';',a)+1;api['tolerance']['declaration']=s[a:b];assert s[a:b]=='export const SOURCE_SUPPORT_TOLERANCE=.00002;'
facetPath='art/source/shared-map-fire-bindings/cornice-six-source-representatives-v1/donor-facet-method.mjs.txt';s=ROOT.joinpath(facetPath).read_bytes();a=s.index(b'function overlapPolygon(');b=s.index(b'function pairPoints(')
api['overlap']={'path':facetPath,'commit':'45c966efc64210402ef24c0c1d7849a397bb871c','sourceSha256':sha(s),'byteStart':a,'byteEnd':b,'function':s[a:b].decode(),'functionSha256':sha(s[a:b])}
dump('api-context.json',api)
cases=[]
for bid in ids:
 old=next(b for b in snapshot['bonds'] if b['id']==bid);result=inputs['result-'+bid+'.json'];native=inputs['native-'+bid+'.json']
 assert old['kind']=='bearing-face' and old['direction']=='symmetric-structural'
 assert result['sourceWitness']=={'parent':old['parent'],'child':old['child']}
 assert old['child']['bindingPlan'] is None and native['sourceRevision']==snapshot['sourceRevision']
 assert len(native['records'])==6 and native['sourceSurface']==next(s for s in bps if s['nativePartId']==old['child']['partId'])
 cases.append({'id':bid,'oldBond':old,'oldBondPointer':'/bonds/'+str(snapshot['bonds'].index(old)),'nativePath':'inputs/native-'+bid+'.json','oldResultPath':'inputs/result-'+bid+'.json',
 'candidateOrder':'First retain exact parent tuple and test its original primitive against all 12 child primitives. If none qualifies, visit the remaining parent primitives in ascending order against all 12 child primitives. Each original primitive pair is visited at most once.',
 'pointSeeds':'At most 8 points per candidate: unchanged-parent closest child first; otherwise positive overlap centroid then vertex/interior midpoint samples. Only closest points on unchanged original faces.',
 'parentChangeRule':'Only after the unchanged-parent phase refuses every candidate; explain the native physical/thermal obstruction, exact old-to-proposed tuple diff, and clear any stale parent bindingPlan to null. Parent stays original/cold; no absent parent blueprint is fabricated.',
 'quantity':{'canonicalInput':result['inputQuantity'],'savedNativeOutput':result['outputQuantity'],'finish':result['inputFinish'],'fuelClass':result['inputFuelClass'],'adapted':False}})
originals=sum(len(p['triangles']) for p in parts);physical=sum(len(r['solidTriangles'] or r['triangles']) for bid in ids for r in inputs['native-'+bid+'.json']['records']);thermal=sum(len(r['triangles']) for bid in ids for r in inputs['native-'+bid+'.json']['records']);blue=sum(len(s['triangles']) for s in bps)
assert (originals,physical,thermal,blue)==(48,176,32,4)
plan={'version':1,'status':'TWO_PRE_BIRTH_SOURCE_ALTERNATIVES_ONLY','authority':{'commit':'29b46945','path':brief,'sha256':sha(authority)},'evidenceCommit':COMMIT,
 'sourcePins':sourcepins,'sourceRevision':snapshot['sourceRevision'],'grid':snapshot['grid'],'cases':cases,
 'limits':{'originalParts':4,'nativeChildRecords':12,'interfaces':2,'originalFacetPairs':288,'shapes':32,'triangles':512,'sourceTransforms':0,'childSeconds':30},
 'workingSet':{'rawParsedShapes':32,'rawParsedTriangles':264,'restoreDuplicateBlueprintReferences':2,'borrowedShapesAfterSharing':30,'borrowedTrianglesAfterSharing':260,
 'scratchShapesReserved':2,'scratchTrianglesReserved':252,'sharedBufferRule':'Validate saved native sourceSurface equals the selected blueprint, then borrow that exact existing reference; drop duplicate JSON arrays before numeric work.'},
 'counts':{'originalTriangles':48,'nativePhysicalTriangles':176,'nativeThermalTriangles':32,'blueprintTriangles':4},
 'mappingRules':'Use beafca54 originalContactPatches, original components, physical native primitive membership, deriveSharedSourceEndpoint/selectFixedSourceCell, actual retained thermal membership and exact same sourceSurface/cell record. Diagnostic IDs evidence only; prospective IDs null.',
 'sourcePolicyIntake':False,'afterBirthRetargeting':False,'allOtherBondTuplesPreserved':35,'newPartsOrInterfaces':0}
dump('plan.json',plan)
dump('preflight.json',{'result':'EXACT_TWO_INTERFACE_BORROWED_INPUTS_READY','originalParts':4,'originalTriangles':48,'nativeRecords':12,'nativePhysicalTriangles':176,'nativeThermalTriangles':32,'blueprintTriangles':4,
 'rawShapes':32,'rawTriangles':264,'workingWithScratch':{'shapes':32,'triangles':512},'oldBondTuples':37,'unaffectedBondTuples':35,'originalFacetPairLimit':288,'sourceTransforms':0,'numericChildStarted':False})
print(json.dumps({'result':'PLAN_AND_PINNED_INPUTS_READY','cases':2,'rawShapes':32,'borrowedShapesAfterSharing':30,'borrowedTrianglesAfterSharing':260,'maxWorkingShapes':32,'maxWorkingTriangles':512,'candidateLimit':288}))
