"""Read-only verification of the bounded source geometry-readiness handoff."""
from pathlib import Path
from fractions import Fraction as F
import argparse,collections,hashlib,importlib.util,json,os,subprocess,sys
sys.dont_write_bytecode=True
HERE=Path(__file__).resolve().parent;ROOT=HERE.parents[3];PRE=HERE.parent/'remaining-material-proposal-v1'
def read(name):return json.loads((HERE/name).read_text(encoding='utf-8'))
def sha(raw):return hashlib.sha256(raw).hexdigest()
def encode(value):return json.dumps(value,indent=2,sort_keys=True)+'\n'
def git(path,commit):return subprocess.check_output(['git','show',commit+':'+path],cwd=ROOT)
def verify():
 if (HERE/'review-package.json').exists():
  for row in read('review-package.json')['files']:
   raw=(ROOT/row['path']).read_bytes();assert len(raw)==row['bytes'] and sha(raw)==row['sha256'],'Payload differs: '+row['path']
 authority=git('docs/engineering/shared-maps/remaining-material-decision.md','4c2019abcc006b4b55c8293781a9741b9b9e3448')
 assert authority==(HERE/'authority-4c2019ab.md').read_bytes()
 old_package=json.loads((PRE/'review-package.json').read_text())
 for row in old_package['files']:assert sha((ROOT/row['path']).read_bytes())==row['sha256']
 old_rel=(PRE/'review-package.json').relative_to(ROOT).as_posix()
 assert (PRE/'review-package.json').read_bytes()==git(old_rel,'5da6393cc5be1041d1042f7b6214d2d7ff9ae764')
 old_inputs=json.loads((PRE/'input-pins.json').read_text());blobs={}
 for tree in old_inputs['compiledSceneTrees']:
  actual=subprocess.check_output(['git','rev-parse',tree['compiledInputCommit']+':'+tree['path']],cwd=ROOT,text=True).strip();assert actual==tree['gitTree']
  for entry in subprocess.check_output(['git','ls-tree','-r','-z',tree['compiledInputCommit'],'--',tree['path']],cwd=ROOT).split(b'\0'):
   if entry:
    meta,path=entry.split(b'\t');blobs[path.decode()]=meta.split()[2].decode()
 geometry_pins=read('geometry-pins.json')['files'];pin_by={p['path']:p for p in geometry_pins}
 for row in geometry_pins:
  raw=(ROOT/row['path']).read_bytes();assert len(raw)==row['bytes'] and sha(raw)==row['sha256']
  assert hashlib.sha1(b'blob '+str(len(raw)).encode()+b'\0'+raw).hexdigest()==blobs[row['path']]
 for row in old_inputs['preservedNewYorkCandidates']:assert (ROOT/row['path']).read_bytes()==git(row['path'],row['commit'])
 summary=read('readiness-summary.json');groups=read('geometry-groups.json')['groups'];cases=read('geometry-cases.json')['cases'];linear=read('linear-transforms.json')['transforms'];exceptions=read('quantity-exceptions.json')['records']
 assert len(geometry_pins)==1572 and len(cases)==5100 and len(groups)==7446 and len(exceptions)==724
 assert summary['logicalSourceCounts']=={'administration':41522,'horticulture':63788}
 assert sum(g['logicalSourceCount'] for g in groups)==105310
 group_by={g['id']:g for g in groups};case_by={c['id']:c for c in cases};linear_by={m['id']:m for m in linear};assert len(group_by)==len(groups) and len(case_by)==len(cases)
 for group in groups:
  assert group['baseCaseId'] in case_by and group['linearTransformId'] in linear_by
  assert sum(group['byFamily'].values())==group['logicalSourceCount']
  assert all(not v['measurementsApplied'] for v in group['recipes'].values())
 assert sum(c['facts']['closedSolidProof'] for c in cases)==4618
 assert all(c['facts']['closedOrientedManifold'] and c['facts']['surfaceComponents']==1 for c in cases if c['facts']['closedSolidProof'])
 assert len({(e['placeId'],e['sourceId']) for e in exceptions})==724
 assert collections.Counter(e['quantityRecipe'] for e in exceptions)=={'closed-volume':595,'wall-area':126,'weather-area':3}
 for row in exceptions:
  assert row['baseCaseId'] in case_by and row['geometryGroupId'] in group_by
  assert row['geometrySha256']==pin_by[row['geometryPath']]['sha256']
  assert not row['quantityAssigned'] and not row['sourceGeometryChanged']
 compounds=read('compound-review.json')['groups'];glass=read('glazing-ownership-review.json')['records'];cuts=read('cut-frame-review.json')['records'];plant=read('living-plant-representation-proposal.json');wet=read('wet-material-interface-proposal.json')
 assert len(compounds)==53 and sum(c['closedUnionVolumeProof'] for c in compounds)==45
 assert sum(c.get('areaUnionProof',False) for c in compounds)==18
 pending=[c for c in compounds if not c['closedUnionVolumeProof']]
 assert len(pending)==8 and all(c['kind']=='table' and c['unionVolume'] is None for c in pending)
 for row in compounds:
  assert not row['quantityAssigned'] and not row['supportOrJointAccepted'] and not row['physicalGeometryChanged']
  if row['kind']=='native-leaf':
   gap=row['literalBodyExtensionGap'];assert F(int(gap['numerator']),int(gap['denominator']))>0
   assert row['declaredPoseRelativeOffsetInvariant'] and row['areaUnionProof']
 assert len(glass)==433 and collections.Counter(g['placeId'] for g in glass)=={'administration':52,'horticulture':381}
 assert all(not g['localDamageOwnerApproved'] and not g['geometrySplitAuthored'] for g in glass)
 assert len(cuts)==67 and sum(c['quantityException'] for c in cuts)==58
 assert all(not c['repairProposedOrApplied'] for c in cuts)
 source=[];patches=[];followers=[]
 for row in plant['owners']:
  assert row['profileId'] is row['finiteStock'] is row['moistureResponse'] is None
  assert not row['accepted'] and not row['applied']
  source+=row['sourceIds'];patches+=row['damagePatchSourceIds'];followers+=row['visualFollowSourceIds']
 assert len(plant['owners'])==98 and len(source)==len(set(source))==412
 assert len(patches)==208 and len(followers)==204 and set(patches).isdisjoint(followers) and set(patches)|set(followers)==set(source)
 assert plant['currentAll412PartsWithheld'] and not plant['runtimeConsumable']
 assert wet['existingBaseProfileId'] is None and wet['selectedPreset'] is None
 assert not wet['applied'] and not wet['runtimeConsumable'] and not wet['newProfileIds'] and not wet['moistureSolverProposed']
 # Four bounded controls: two known complete native cells and removal of one
 # source triangle in memory. No original geometry or helper is created.
 spec=importlib.util.spec_from_file_location('readiness_exact_controls',HERE/'exact.py');x=importlib.util.module_from_spec(spec);spec.loader.exec_module(x)
 folder=ROOT/'assets/art/place-scenes/administration';idx=json.loads((folder/'index.json').read_text());selected={};wanted={'body-0-tier-0:0:0/wall-1':('wall-area',2),'ground-floor/cell--40-0-0':('top-area',1)}
 for chunk in idx['chunks']:
  for part in json.loads((folder/chunk['url']).read_text())['parts']:
   if part['id'] in wanted:selected[part['id']]=part
 assert set(selected)==set(wanted)
 for sid,(recipe,expected) in wanted.items():
  part=selected[sid];geometry=json.loads((folder/idx['geometries'][part['geometry']]).read_text());shape=x.effective(geometry)
  assert shape['facts']['uniqueSourcePositions']==8 and shape['facts']['sourceTriangles']==12
  metric=x.linear_metrics(shape,part['matrix'],recipe);value=metric.get('primaryFaceAreaApproximate',metric.get('upwardProjectedArea',{}).get('approximate'))
  assert value==expected,(sid,value,expected)
  indices=geometry['index']['array'] if isinstance(geometry.get('index'),dict) else list(range(len(geometry['attributes']['position']['array'])//3))
  removed={'attributes':geometry['attributes'],'index':{'array':indices[3:]}}
  assert not x.effective(removed)['facts']['closedSolidProof']
 return {'version':1,'result':'PASS','scope':'Bounded source readiness and ownership review; no stock, support, repair, pane split, wet response or runtime acceptance.','authorityCommit':'4c2019abcc006b4b55c8293781a9741b9b9e3448','sourceGeometryFiles':1572,'effectiveRangeCases':5100,'linearGeometryGroups':7446,'logicalSourceParts':105310,'quantityExceptions':724,'compoundGroups':53,'provedCompoundUnions':45,'withheldTables':8,'leafAreaGroups':18,'cutFrameRecords':67,'cutFrameQuantityExceptions':58,'glazingSourceParts':433,'glazingDamageMappingsApplied':0,'plantPartsWithheld':412,'proposedPlantOwners':98,'proposedPlantDamagePatches':208,'plantFollowers':204,'boundedSourceControls':4,'priorCandidatesAndOriginalInputsUnchanged':True,'quantitiesApplied':0,'repairsOrGeometryExports':0,'newProfiles':0,'runtimeEdits':0,'rendererOrBuild':False,'retainedHelper':False,'producerSha256':sha(Path(__file__).read_bytes())}
if __name__=='__main__':
 parser=argparse.ArgumentParser(description=__doc__);parser.add_argument('--save-review',action='store_true');args=parser.parse_args()
 if not args.save_review:
  def readonly(event,args):
   if event=='open' and (any(c in (args[1] or '') for c in 'wax+') or (args[2] or 0)&(os.O_WRONLY|os.O_RDWR|os.O_CREAT|os.O_TRUNC|os.O_APPEND)):raise PermissionError('Read-only readiness check refuses writes')
   if event in {'os.remove','os.rename','os.mkdir','os.rmdir','os.truncate','os.utime','os.chmod'}:raise PermissionError('Read-only readiness check refuses mutation')
  sys.addaudithook(readonly)
 result=verify()
 if args.save_review:(HERE/'check-results.json').write_bytes(encode(result).encode())
 else:assert (HERE/'check-results.json').read_bytes()==encode(result).encode()
 print(json.dumps(result,sort_keys=True))
