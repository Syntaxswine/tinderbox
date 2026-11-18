"""Metadata/source-cache preflight for exactly three fixed saddle interfaces."""
from pathlib import Path
import json,hashlib,subprocess,struct
HERE=Path(__file__).resolve().parent;ROOT=HERE.parents[3]
def sha(b):return hashlib.sha256(b).hexdigest()
def dump(n,d):
 with (HERE/n).open('xb') as f:f.write((json.dumps(d,separators=(',',':'))+'\n').encode())
def git(commit,p):return subprocess.run(['git','show',commit+':'+p],capture_output=True,check=True,creationflags=getattr(subprocess,'CREATE_NO_WINDOW',0)).stdout
commit='c1ed407aedfc5ffec8b473dc7b88c697e140c054';brief='docs/engineering/shared-maps/new-york-source-preparation.md'
authority=git('b7958c76',brief);(HERE/'authority-b7958c76.md').write_bytes(authority)
manifest='assets/art/shared-map-support-additions/new-york-roof-saddle-native-v1/index.json'
archive='art/source/shared-map-fire-bindings/roof-saddle-native-buffer-v1/actual-buffer-results.json'
semantics='art/source/shared-map-fire-bindings/roof-saddle-native-buffer-v1/fixed-port-semantics.json'
paths=[manifest,archive,semantics];a=json.loads(ROOT.joinpath(manifest).read_bytes());saved=json.loads(ROOT.joinpath(archive).read_bytes())
paths += [a['geometry']['path'],a['renderGeometry']['path'],a['physicalRenderMapping']['path'],a['quantityCertificate']['path']]
paths += [r['path'] for r in a['binaryBuffers'].values()]
sourcepins=[]
for p in dict.fromkeys(paths):
 b=ROOT.joinpath(p).read_bytes();assert b==git(commit,p),p;sourcepins.append({'path':p,'commit':commit,'sha256':sha(b),'bytes':len(b)})
assert sha(ROOT.joinpath(manifest).read_bytes())=='0d1469e541657fa6f3ed537ff2f4ba7fe01f3952c273e0eba2720c224a436bcd'
assert saved['manifestSha256']==sha(ROOT.joinpath(manifest).read_bytes()) and saved['physicalRenderBitMappingEqual']
body=a['members'][0];assert body['quantityReference']==0.04011965567822286
assert struct.pack('<d',body['quantityReference']).hex()=='a2262142908aa43f'
assert saved['actualPhysicalIndex']==json.loads(ROOT.joinpath(a['geometry']['path']).read_bytes())['index']['array']
assert len(saved['actualPhysicalIndex'])==48 and len(saved['actualPhysicalWorldVertices'])==10
assert saved['actualPhysicalLocalPositions']==json.loads(ROOT.joinpath(a['geometry']['path']).read_bytes())['attributes']['position']['array']
assert sum(len(v) for v in saved['originalParentWorldTriangles'].values())+len(saved['actualPhysicalIndex'])//3==48
pilotpath='assets/runtime/map-inputs/new-york/saddle6-01-v1/pilot-plan.json';pilotraw=git('b7958c76',pilotpath);pilot=json.loads(pilotraw)
basepath=a['baseBindings']['path'];basebytes=ROOT.joinpath(basepath).read_bytes();assert sha(basebytes)==a['baseBindings']['sha256'];base=json.loads(basebytes)
parts=[]
for owner in [*a['namedOriginalParents'],body['id']]:
 if owner==body['id']:
  partId='roof-saddle-native/main-parapet-6/bay-01';metadata=body;quantity={'canonicalOwner':owner,'quantity':body['quantityReference'],'quantityCertificate':a['quantityCertificate'],'registeredRuntimeStock':0}
  sourceRef={'path':archive,'verticesPointer':'/actualPhysicalWorldVertices','indicesPointer':'/actualPhysicalIndex','approvedPhysicalGeometry':a['geometry']}
  triangleCount=16
 else:
  ref=a['namedOriginalParents'][owner][0];partId=ref['partId'];metadata=next(c for c in base['carriers'] if c['id']==owner)
  quantity={k:metadata[k] for k in ['id','fuelClass','fuelAmount','area','thickness','quantityBasis','retirement']}
  sourceRef={'path':archive,'trianglesPointer':'/originalParentWorldTriangles/'+owner.replace('~','~0').replace('/','~1'),'geometryRef':ref}
  triangleCount=len(saved['originalParentWorldTriangles'][owner])
 pp=next(p for p in pilot['parts'] if p['id']==partId);assert pp['ownerId']=='new-york::'+owner and pp['physicalTriangles']==triangleCount and pp['sourceRange'] is None
 parts.append({'ownerId':owner,'partId':partId,'pilotPartPointer':'/parts/'+str(pilot['parts'].index(pp)),'declaredPilotPart':pp,'physicalTriangleCount':triangleCount,
 'sourceWorldRef':sourceRef,'quantity':quantity,'sourceRange':None,'nativeRecordId':None,'nativeCell':None})
ports=[]
for i,(p,c) in enumerate(zip(a['ports'],a['proposedContacts'])):
 assert p['id']==c['portId'];sets={'saddle':p['physicalTriangleIds'],'original':p['fixedOriginalParentGeometry'][0]['sourceTriangleIds']}
 assert sets==[{'saddle':[8,9],'original':[0,2]},{'saddle':[6,7],'original':[2,3]},{'saddle':[12,13],'original':[6,7]}][i]
 ports.append({'id':p['id'],'manifestPointer':'/ports/'+str(i),'contactPointer':'/proposedContacts/'+str(i),'originalPort':p,
 'parentOwnerId':c['parent'],'childOwnerId':c['child'],'direction':'parent-to-child','declaredPrimitiveSets':sets,
 'selectorConstruction':'Each endpoint uses bounds of its own fixed declared primitive set. Upper endpoint additionally retains the original X interval [49,50]. No common box bridges a gap.',
 'upperIntervalX':[49,50] if i==2 else None,'name':['cornice','roof-seat','top'][i]})
assert len(parts)==4 and len(ports)==3 and sum(p['physicalTriangleCount'] for p in parts)==48
plan={'version':1,'status':'THREE_SOURCE_WITNESS_PROPOSALS_ONLY','authority':{'commit':'b7958c76','path':brief,'sha256':sha(authority)},
 'approvedSourceCommit':commit,'manifest':{'path':manifest,'sha256':sha(ROOT.joinpath(manifest).read_bytes())},
 'savedWorldArchive':{'path':archive,'sha256':sha(ROOT.joinpath(archive).read_bytes())},
 'pilotMetadata':{'commit':'b7958c76','path':pilotpath,'sha256':sha(pilotraw),'interpretation':'Existing declared source part IDs/global ordinals only; no native IDs assigned.'},
 'sourcePins':sourcepins,'parts':parts,'ports':ports,'semantics':a['selectedSupportSemantics'],
 'canonicalSaddleQuantity':{'value':body['quantityReference'],'binary64LittleEndian':struct.pack('<d',body['quantityReference']).hex(),'uniqueOwners':1,'referenceOnly':True},
 'limits':{'parts':4,'triangles':48,'fixedInterfaces':3,'declaredFacePairsPerInterface':4,'sourceTransformsPlanned':0,'childDeadlineSeconds':30},
 'derivation':'Separate own-face closest points from positive projected overlap of only fixed declared triangles, using unchanged clipped-facet/closest/native-contact/distance predicates.',
 'prohibitions':['historical check-buffers rerun','native compiler','support/root solve','trial','clock','render','build','runtime approval edit','new native IDs','geometry/tolerance/quantity/anchor change']}
dump('plan.json',plan)
dump('preflight.json',{'result':'EXACT_FOUR_PART_THREE_INTERFACE_PREFLIGHT_PASS','sourcePins':len(sourcepins),'parts':4,'originalPhysicalTriangles':48,'fixedInterfaces':3,
 'facePairsMaximum':12,'transformsRequired':0,'savedArchiveApprovedCommit':commit,'quantityBits':'a2262142908aa43f','historicalNativeExperimentRerun':False})
print(json.dumps({'result':'PLAN_AND_PREFLIGHT_FROZEN','parts':4,'triangles':48,'interfaces':3,'sourceTransformsPlanned':0,'sourcePins':len(sourcepins)}))
