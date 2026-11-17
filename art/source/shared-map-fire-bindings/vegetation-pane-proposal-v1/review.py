"""Compact source-proposal checkpoint; archive integrity and representative paths."""
from pathlib import Path
from fractions import Fraction as F
import argparse,collections,gzip,hashlib,importlib.util,json,os,sys
sys.dont_write_bytecode=True
HERE=Path(__file__).resolve().parent;ROOT=HERE.parents[3]
def module(name,path):
 s=importlib.util.spec_from_file_location(name,path);m=importlib.util.module_from_spec(s);s.loader.exec_module(m);return m
A=module('preserved_source_calculator',HERE/'calculate.py');S=A.S
Q=module('exact_profile_context',HERE/'profile-context.py')
OBSERVED_COMPILER_CONTEXT=None
REPRESENTATIVES=('great-crystal-dome/glass-skin','front-glass-gallery-0/surface--1','replacement/body-12-entrance/glass','court-0-0-arch-0/arched-glass')
def load_archive(name):
 with gzip.open(HERE/'calculation-archive'/(name+'.gz'),'rt',encoding='utf-8') as h:return json.load(h)
def decode(v):
 if isinstance(v,dict):
  if set(v)=={'numerator','denominator','approximate'}:return F(int(v['numerator']),int(v['denominator']))
  return {k:decode(x) for k,x in v.items()}
 if isinstance(v,list):return [decode(x) for x in v]
 return v
def digest_stream(h):
 out=hashlib.sha256();n=0
 for chunk in iter(lambda:h.read(1024*1024),b''):out.update(chunk);n+=len(chunk)
 return out.hexdigest(),n
def verify_inputs():
 prior=A.preserve();manifest=S.load(HERE/'calculation-archive/manifest.json')
 for pin in manifest['outputs']:
  p=HERE/pin['archivePath']
  with p.open('rb') as h:assert digest_stream(h)==(pin['sha256'],pin['bytes'])
  with gzip.open(p,'rb') as h:assert digest_stream(h)==(pin['uncompressedSha256'],pin['uncompressedBytes'])
 with gzip.open(HERE/'calculation-archive/original-calculator.py.gz','rb') as h:assert hashlib.sha256(h.read()).hexdigest()==manifest['originalCalculatorSha256']
 for pin in manifest['sourceModules']:assert S.sha((HERE/pin['path']).read_bytes())==pin['sha256']
 inputs=load_archive('input-pins.json')
 for pin in inputs['sourceInputs']:assert S.sha((ROOT/pin['path']).read_bytes())==pin['sha256']
 global OBSERVED_COMPILER_CONTEXT
 OBSERVED_COMPILER_CONTEXT=Q.verify_working_scene()
 assert Q.audit()==S.load(HERE/'profile-context-verification.json'),'Compiler-context control report differs'
 return prior,manifest,inputs
def triangle_graph(row):
 g=S.load(ROOT/row['geometryPath']);assert S.sha((ROOT/row['geometryPath']).read_bytes())==row['geometrySha256']
 pts=S.RP.vertices(g);idx=g['index']['array'] if isinstance(g.get('index'),dict) else list(range(len(pts)))
 sr=row.get('sourceRange');start=sr['start'] if sr else 0;count=sr['count'] if sr else len(idx);edges=collections.defaultdict(list);pointrefs={}
 for i,p in enumerate(pts):pointrefs.setdefault(p,i)
 for offset in range(start,start+count,3):
  tri=[pts[i] for i in idx[offset:offset+3]]
  if not S.R.nonzero(tri):continue
  for a,b in zip(tri,tri[1:]+tri[:1]):edges[tuple(sorted((a,b)))].append(offset)
 graph=collections.defaultdict(set);witness={}
 for e,owners in edges.items():
  if len(owners)==2 and owners[0]!=owners[1]:
   a,b=owners;graph[a].add(b);graph[b].add(a);witness[min(a,b),max(a,b)]=[pointrefs[p] for p in e]
 return graph,witness,g
def path_to(graph,starts,targets):
 for start in starts:
  queue=[start];before={start:None}
  for i in queue:
   if i in targets:
    path=[i]
    while before[path[-1]] is not None:path.append(before[path[-1]])
    return list(reversed(path))
   for j in sorted(graph[i]):
    if j not in before:before[j]=i;queue.append(j)
 return None
def source_triangle(row,offset):
 g=S.load(ROOT/row['geometryPath']);assert S.sha((ROOT/row['geometryPath']).read_bytes())==row['geometrySha256']
 pts=S.RP.vertices(g);idx=g['index']['array'] if isinstance(g.get('index'),dict) else list(range(len(pts)))
 return tuple(S.apply(row['matrix'],pts[i]) for i in idx[offset:offset+3])
def validate_path(record):
 assert record['sameOriginalSourceComponentOnly'] and not record['bridgeDisconnectedPanes']
 assert not record['allowRetiredOrBrokenPortions'] and not record['remapToAnotherSurvivingFrame']
 row=record['sourceReference'];assert record['originalSourceId']==row['sourceId']
 graph,witness,_=triangle_graph(row);path=record['originalTrianglePath']
 assert path and path[0] in record['startMaskOriginalTriangleOffsets']
 assert all(b in graph[a] for a,b in zip(path,path[1:]))
 port=record['fixedOriginalFramePort'];assert path[-1]==port['originalGlassTriangleOffset']
 assert port['originalFrameSourceId'] in record['originalAssociatedFrameIds']
 frame=record['fixedOriginalFrameReference']
 assert frame['sourceId']==port['originalFrameSourceId']
 assert S.intersection(source_triangle(row,path[-1]),source_triangle(frame,port['originalFrameTriangleOffset']))
 return True
def extract_local_data():
 # Decode one saved observation at a time; never reconstruct a native/world.
 with gzip.open(HERE/'calculation-archive/glazing-local-damage-proposal.json.gz','rt',encoding='utf-8') as h:text=h.read()
 decoder=json.JSONDecoder();key='"sourceLocalNativeScaleMaskTemplates"';pos=text.index('[',text.index(key));templates,end=decoder.raw_decode(text,pos)
 key='"authoredVentOpeningMemberships"';pos=text.index('[',text.index(key));authored,end=decoder.raw_decode(text,pos)
 pos=text.index('[',text.index('"localDamageGroups"'))+1;selected={sid:{'start':None,'ports':{}} for sid in REPRESENTATIVES};count=0;direct=0
 while True:
  while text[pos].isspace() or text[pos]==',':pos+=1
  if text[pos]==']':break
  group,pos=decoder.raw_decode(text,pos);count+=1
  if group['fixedOriginalFrameContacts']:direct+=1
  sid=group['originalOwnerSourceId']
  if sid in selected:
   item=selected[sid]
   if item['start'] is None or (item['start']['fixedOriginalFrameContacts'] and not group['fixedOriginalFrameContacts']):item['start']=group
   for port in group['fixedOriginalFrameContacts']:
    tid=port['originalGlassTriangleOffset']
    if tid not in item['ports'] and len(item['ports'])<128:item['ports'][tid]=port
 return templates,authored,selected,count,direct
def checkpoint():
 prior,manifest,inputs=verify_inputs()
 rawplants=decode(load_archive('vegetation-owners-proposal.json'));plants={'owners':rawplants['owners'],'patches':rawplants['localPatches'],'followers':rawplants['followers']}
 original=S.load(HERE.parent/'remaining-geometry-readiness-v1/living-plant-representation-proposal.json')
 A.validate_plants(plants,original)
 quantities=decode(load_archive('plant-quantity-proofs.json'));trunks=quantities['trunks'];assert len(trunks)==22 and len(quantities['oneSidedFrondAreas'])==120
 ownerby={o['logicalOwnerKey']:o for o in plants['owners']}
 for trunk in trunks:
  lo,hi=trunk['worldReferenceVolumeInterval'];assert 0<lo<=trunk['exactPeriodicReferenceVolume']<=hi
  rep=S.C.lower_representation(lo/F(.12));assert S.B.encode(rep)==S.B.encode(trunk['proposedQuantityRepresentation'])
  assert ownerby[trunk['sourceId']]['finiteOwnerBudget']==decode(rep['exactDyadicValue'])
  assert trunk['closedSourceSolids'] is False and not trunk['physicalContainmentOrSupportShortcut']
 for area in quantities['oneSidedFrondAreas']:assert area['areaIntervalMetresSquared'][0]>0 and area['doubleSideMaterialCountedOnce']
 rawcatalogue=load_archive('glazing-source-catalogue.json');frameby={(r['placeId'],r['sourceId']):r for r in rawcatalogue['originalFrameReferences']}
 catalogue=[]
 for row in rawcatalogue['sources']:
  item={k:v for k,v in row.items() if k not in ('localDamageGroupKeys','parentSelectionSemantics')}
  item['proposedLocalMaskCount']=len(row['localDamageGroupKeys'])
  item['localMaskAliasRecipe']=['original owner/source identity','original geometry/range/matrix','source-local native-scale template cell','original glass component/hit triangle']
  item['supportScope']='same original connected pane/sheet component with fixed original frame-contact ports; masks are local breakage selectors'
  item['directFrameContactRequiredAtEveryMask']=False
  item['livePathRule']='Remaining original glass portions must connect the hit component to a fixed original local frame port; broken/retired portions and other components cannot carry that path.'
  item['lossBehavior']='If all valid paths to original live frame ports are lost, the affected component becomes unsupported under the future common consumer. No new joint, anchor, brace or surviving-frame remap.'
  item['componentAndNativeMaskSchemaAccepted']=False;catalogue.append(item)
 templates,authored,selected,total,direct=extract_local_data();templateby={t['templateId']:t for t in templates};sourceby={r['originalSourceId']:r for r in catalogue};representatives=[];unproved=[]
 for sid in REPRESENTATIVES:
  chosen=selected[sid];start=chosen['start'];row=sourceby[sid]['originalSourceReference']
  template=templateby[start['maskTemplateId']];cell=next(c for c in template['mask']['cells'] if c['cellKey']==start['templateCellKey'])
  starts=[p['originalTriangleOffset'] for p in cell['originalTrianglePortions'] if not p['exactZeroAreaSourceTriangle']]
  graph,witness,_=triangle_graph(row);path=path_to(graph,starts,set(chosen['ports']))
  if path is None:
   unproved.append({'originalSourceId':sid,'reason':'no representative exact shared-source-edge path found; no weld, substitute frame or new joint'});continue
  port=chosen['ports'][path[-1]]
  record={'originalSourceId':sid,'sourceReference':row,'startLocalMaskKey':start['proposalDamageGroupKey'],'startTemplateCellKey':start['templateCellKey'],'startMaskOriginalTriangleOffsets':starts,'directFrameContactAtStartMask':bool(start['fixedOriginalFrameContacts']),'originalTrianglePath':path,'sharedOriginalSourceEdges':[{'originalTriangleOffsets':[a,b],'sourceGeometryVertexIndices':witness[min(a,b),max(a,b)]} for a,b in zip(path,path[1:])],'fixedOriginalFramePort':port,'fixedOriginalFrameReference':frameby[row['placeId'],port['originalFrameSourceId']],'originalAssociatedFrameIds':sourceby[sid]['sourceFrameAssociationIdsPreserved'],'sameOriginalSourceComponentOnly':True,'bridgeDisconnectedPanes':False,'allowRetiredOrBrokenPortions':False,'remapToAnotherSurvivingFrame':False,'pristineIntactSourcePathOnly':True,'dynamicPortionConnectivityProvedOrInstalled':False,'wholeTriangleSurvivalIsInsufficientAfterLocalDamage':True,'greenhouseBracingOrNewJoint':False}
  validate_path(decode(record));representatives.append(record)
 # Preserve the twelve explicitly authored, disconnected vent-opening memberships.
 assert len(authored)==12
 for r in authored:assert len(r['originalTriangleOffsets'])==6 and len(set(r['originalTriangleOffsets']))==6
 exceptions=load_archive('dependency-exceptions.json')
 exceptions['glazingExceptions']=[e for e in exceptions['glazingExceptions'] if e['kind']!='local-original-frame-contact-not-proved']
 exceptions['glazingExceptions']+=unproved
 exceptions['interiorMaskWithoutDirectFrameContactIsNotAnUnsupportedFinding']=True
 exceptions['sheetConnectivityAndLocalPortLiveness']='Schema gate: a retained mask may use an intact path inside its same original pane/sheet to fixed original local frame ports. No path may traverse broken/retired portions or another disconnected pane.'
 schema=load_archive('schema-proposal.json')
 for p in schema['proposals']:
  if p['id']=='fixed-local-frame-ports':p['proposal']='Sheet/component frame support is separate from local breakage masks. Keep fixed original local frame ports; require a live path through the same remaining original glass component. No direct frame contact is required at every mask, no adjacent-pane brace and no surviving-frame remap. Mechanical fastening/capacity remains unapproved.'
 schema['proposals'].append({'id':'live-original-sheet-component-path','proposal':'The consumer must maintain retained triangle-portion/native-mask connectivity within each original glass component, local frame-port liveness and path-loss behavior. The representative source paths prove pristine connectivity only. Canonical native admission, dynamic connectivity and all glass paths remain unproved/uninstalled.','accepted':False})
 controls=load_archive('negative-controls.json')['controls']
 for name,field in [('bridge a disconnected pane or another original source','sameOriginalSourceComponentOnly'),('allow a retired portion to carry a glass/frame path','allowRetiredOrBrokenPortions')]:
  bad=decode(representatives[0]);bad[field]=False if field=='sameOriginalSourceComponentOnly' else True
  rejected=False
  try:validate_path(bad)
  except AssertionError:rejected=True
  assert rejected;controls.append({'control':name,'result':'REJECT','sourceGeometryOrRuntimeChanged':False})
 raw=load_archive('check-results.json')
 summary={k:v for k,v in raw.items() if k not in ('glassLocalExceptions','schemaProposalsUnaccepted','negativeControls')}
 summary.update({'result':'PASS_COMPACT_SOURCE_PROPOSAL_CHECKS','glassLocalExceptions':len(exceptions['glazingExceptions']),'directLocalFrameContactRequiredForEveryMask':False,'representativePristineGlassFramePaths':len(representatives),'representativePathsWithoutDirectStartMaskContact':sum(not r['directFrameContactAtStartMask'] for r in representatives),'representativePathFailures':len(unproved),'allGlassLivePathsProved':False,'canonicalNativeCellAdmissionProved':False,'schemaProposalsUnaccepted':len(schema['proposals']),'negativeControls':len(controls),'preservedCompressedCalculationOutputs':len(manifest['outputs']),'compressedArchiveBytes':sum(p['bytes'] for p in manifest['outputs']),'fullAuthoringOrRuntimeDatasetExport':False})
 mask_summaries=[{'templateId':t['templateId'],'originalGeometryPath':t['originalGeometryPath'],'originalGeometrySha256':t['originalGeometrySha256'],'sourceRange':t['sourceRange'],'scope':t['scope'],'sourceOriginalTriangleCount':t['mask']['sourceOriginalTriangleCount'],'localCellCount':t['mask']['localCellCount'],'positiveAreaPortionsPartitionEachOriginalTriangleExactlyOnce':t['mask']['positiveAreaPortionsPartitionEachOriginalTriangleExactlyOnce'],'fullCalculationArchiveSelector':{'path':'calculation-archive/glazing-local-damage-proposal.json.gz','templateId':t['templateId']},'canonicalNativeAdmission':False} for t in templates]
 assert total==45970 and direct==30186
 return {'glazing-source-catalogue.json':{'version':1,'status':'compact source proposal; no general schema acceptance','sources':catalogue,'fullOriginalFrameReferencesArchive':'calculation-archive/glazing-source-catalogue.json.gz','historicalPaneAssertion':False},'glazing-local-damage-proposal.json':{'version':1,'status':'source-local mask recipes and memberships; not canonical native-cell admission or full authoring export','maskTemplateSummaries':mask_summaries,'proposedLocalDamageMaskCount':total,'directContactObservationCount':direct,'directContactAbsentDoesNotMeanUnsupported':True,'authoredVentOpeningMemberships':authored,'retainedOriginalComponentPathRequired':True,'neverBridgeDisconnectedPanesOrBraceGreenhouse':True,'completeCalculationEvidenceArchive':'calculation-archive/glazing-local-damage-proposal.json.gz','canonicalNativeMappingOrRuntimeInstalled':False},'glazing-component-path-proposal.json':{'version':1,'representatives':representatives,'unprovedRepresentatives':unproved,'scope':'Representative pristine source paths only, not exhaustive glass paths, live damage behavior, grounding or native admission.','requiredLossBehavior':exceptions['sheetConnectivityAndLocalPortLiveness']},'dependency-exceptions.json':exceptions,'schema-proposal.json':schema,'negative-controls.json':{'version':1,'controls':controls},'check-results.json':summary}
if __name__=='__main__':
 parser=argparse.ArgumentParser(description=__doc__);parser.add_argument('--save-checkpoint',action='store_true');args=parser.parse_args()
 if not args.save_checkpoint:
  def readonly(event,args):
   if event=='open' and (any(c in (args[1] or '') for c in 'wax+') or (args[2] or 0)&(os.O_WRONLY|os.O_RDWR|os.O_CREAT|os.O_TRUNC|os.O_APPEND)):raise PermissionError('Compact source checkpoint refuses writes')
   if event in {'os.remove','os.rename','os.mkdir','os.rmdir','os.truncate','os.utime','os.chmod'}:raise PermissionError('Compact source checkpoint refuses mutation')
  sys.addaudithook(readonly)
 outputs=checkpoint()
 for name,value in outputs.items():
  raw=S.B.encode(value)
  if args.save_checkpoint:(HERE/name).write_bytes(raw)
  else:assert (HERE/name).read_bytes()==raw,'Compact source checkpoint differs: '+name
 # These focused plant/input evidence files are unchanged from the preserved calculation.
 manifest=S.load(HERE/'calculation-archive/manifest.json')
 for name in ('input-pins.json','vegetation-owners-proposal.json','plant-quantity-proofs.json','plant-parent-evidence.json'):
  pin=next(p for p in manifest['outputs'] if p['calculationOutput']==name);assert S.sha((HERE/name).read_bytes())==pin['uncompressedSha256']
 if not args.save_checkpoint and (HERE/'review-package.json').exists():
  for pin in S.load(HERE/'review-package.json')['files']:
   raw=(ROOT/pin['path']).read_bytes();assert len(raw)==pin['bytes'] and S.sha(raw)==pin['sha256']
 print(json.dumps({**outputs['check-results.json'],'compilerSourceContext':OBSERVED_COMPILER_CONTEXT,'compilerContextAdmissionControls':{'admitted':6,'rejected':3}},sort_keys=True))
