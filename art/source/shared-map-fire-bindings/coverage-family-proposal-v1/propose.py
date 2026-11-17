"""Unapplied family-level New York support proposal over exact original geometry."""
from pathlib import Path
import argparse,collections,copy,hashlib,importlib.util,json,math,re,subprocess,sys,time,traceback
sys.dont_write_bytecode=True
HERE=Path(__file__).resolve().parent;ROOT=HERE.parents[3]
def mod(name,file):
 s=importlib.util.spec_from_file_location(name,HERE/file);m=importlib.util.module_from_spec(s);s.loader.exec_module(m);return m
I=mod('family_input_data','inputs.py');C=mod('family_contact_geometry','geometry.py')
def canonical(value):return json.dumps(value,sort_keys=True,separators=(',',':'))
def identity(value):return hashlib.sha256(canonical(value).encode()).hexdigest()[:24]
def encode(value):return json.dumps(value,indent=2,sort_keys=True)+'\n'
def compact_rows(value,key):
 rows=[]
 for k in sorted(value):
  v=value[k];encoded='[\n'+',\n'.join('    '+canonical(r) for r in v)+'\n  ]' if k==key else json.dumps(v,indent=2,sort_keys=True).replace('\n','\n  ')
  rows.append('  '+json.dumps(k)+': '+encoded)
 return '{\n'+',\n'.join(rows)+'\n}\n'
def stem(cid):return cid.removeprefix('carrier/').removeprefix('replacement/')
def family(cid,by):return by[cid]['role']+'/'+stem(cid).split('/')[0]

def build():
 start=time.monotonic();a=I.load();by=a['by'];g=C.Geometry(by);relations=a['relations'];current={(r['child'],r['parent']):r for records in relations.values() for r in records};groups={};preserved=collections.Counter();cornice_cells=[];scanned=[];attempted=set();pending=[];retired=[]
 # Candidate discovery is only a bounded spatial search, not support evidence.
 primary_roles={'exterior-wall','perimeter-closure','building-deck','raised-base','column','exterior-paving','approach-stair'}
 primary=[c for c in by.values() if c['role'] in primary_roles or '/column-' in c['id'] and c['id'].rsplit('/',1)[-1] in {'base','shaft','neck','capital'}]
 bins=collections.defaultdict(set)
 for c in primary:
  b=c['physicalBounds']
  for x in range(math.floor((b['min'][0]-C.NATIVE)/2),math.floor((b['max'][0]+C.NATIVE)/2)+1):
   for y in range(math.floor((b['min'][1]-C.NATIVE)/2),math.floor((b['max'][1]+C.NATIVE)/2)+1):
    for z in range(math.floor((b['min'][2]-C.NATIVE)/2),math.floor((b['max'][2]+C.NATIVE)/2)+1):bins[x,y,z].add(c['id'])
 def neighbors(box):
  result=set()
  for x in range(math.floor((box['min'][0]-C.NATIVE)/2),math.floor((box['max'][0]+C.NATIVE)/2)+1):
   for y in range(math.floor((box['min'][1]-C.NATIVE)/2),math.floor((box['max'][1]+C.NATIVE)/2)+1):
    for z in range(math.floor((box['min'][2]-C.NATIVE)/2),math.floor((box['max'][2]+C.NATIVE)/2)+1):result.update(bins[x,y,z])
  return [cid for cid in sorted(result) if C.overlaps(by[cid]['physicalBounds'],box,C.NATIVE)]
 def within(inner,outer):return all(inner['min'][k]>=outer['min'][k]-C.NATIVE and inner['max'][k]<=outer['max'][k]+C.NATIVE for k in range(3))
 def emit(child,parent,certificate,group,roi=None):
  if certificate is None:return None
  before=current.get((child,parent));kind=certificate['proposedKind'];direction='symmetric-structural' if kind=='structural-seam' else 'parent-to-child';proof=certificate['proof']
  if kind=='fixed-embed':
   child_bounds=parent_bounds=proof['localOverlapBounds'];child_point=parent_point=proof['worldWitness']
  elif 'axis' in proof:
   axis=proof['axis'];box=C.intersection(by[child]['physicalBounds'],by[parent]['physicalBounds'],*([roi] if roi else []))
   if box is None:
    box={'min':[max(by[child]['physicalBounds']['min'][k],by[parent]['physicalBounds']['min'][k]) for k in range(3)],'max':[min(by[child]['physicalBounds']['max'][k],by[parent]['physicalBounds']['max'][k]) for k in range(3)]}
   child_bounds=copy.deepcopy(box);parent_bounds=copy.deepcopy(box);ca=by[child]['physicalBounds'][proof['childFace']][axis];pb=by[parent]['physicalBounds'][proof['parentFace']][axis];child_bounds['min'][axis]=child_bounds['max'][axis]=ca;parent_bounds['min'][axis]=parent_bounds['max'][axis]=pb;child_point,parent_point=proof['actualSurfaceWitness']
  else:
   child_point,parent_point=proof['actualSurfaceWitness'];box=C.intersection(by[child]['physicalBounds'],by[parent]['physicalBounds'],*([roi] if roi else []));child_bounds=copy.deepcopy(box) if box else {'min':child_point,'max':child_point};parent_bounds=copy.deepcopy(box) if box else {'min':parent_point,'max':parent_point}
  action='add-exact-local-dependency';old=None
  if before:
   old={k:before[k] for k in ('kind','direction','symmetric','childRegion','parentRegion')}
   if before['childRegion'] is None:
    preserved[group]+=1;return {'status':'existing-actual-contact-relation','parent':parent,'proof':certificate}
   # Existing local attachments already within one native horizontal metre stay
   # untouched. Broad existing embeds are projected to actual local regions.
   broad=any(region and any(region['bounds']['max'][k]-region['bounds']['min'][k]>1+C.NATIVE for k in (0,2)) for region in (before['childRegion'],before['parentRegion']))
   if not broad and within(child_bounds,before['childRegion']['bounds']) and within(parent_bounds,before['parentRegion']['bounds']):preserved[group]+=1;return {'status':'existing-bounded-attachment','parent':parent,'proof':certificate}
   action='normalize-existing-pair-to-local-regions';kind=before['kind'];direction='symmetric-structural' if before['symmetric'] else 'parent-to-child'
  pair_key=(group,child,parent,kind,direction,action)
  entry=groups.setdefault(pair_key,{'family':group,'childCarrierId':child,'parentCarrierId':parent,'proposedKind':kind,'direction':direction,'action':action,'beforeRelation':old,'childRole':by[child]['role'],'parentRole':by[parent]['role'],'localRegions':[],'groundAnchor':False,'wholeCarrierRetirement':False,'accepted':False,'applied':False})
  region={'frame':'emitted-world','childBounds':copy.deepcopy(child_bounds),'parentBounds':copy.deepcopy(parent_bounds),'childWitness':child_point,'parentWitness':parent_point,'selector':copy.deepcopy(roi),'actualGeometryCertificate':certificate,'meaning':'Finite selectors over original physical geometry, never substitute solids or forced local breaks.'};rid=identity(region)
  if not any(r['id']==rid for r in entry['localRegions']):entry['localRegions'].append({'id':rid,**region})
  return {'status':action,'parent':parent,'pairId':identity(list(pair_key)),'regionId':rid,'proofKind':certificate['proposedKind']}
 def try_pair(child,parent,group,roi=None,fastening=False,seam=False):
  if child==parent or parent not in by:return None
  if roi and not C.overlaps(by[parent]['physicalBounds'],roi,C.NATIVE):return None
  cert=g.certificate(child,parent,roi,allow_fastening=fastening,structural_seam=seam);attempted.add((child,parent))
  return emit(child,parent,cert,group,roi) if cert else None
 def batch(child,parents,group,roi=None,fastening=False,seam=False):
  return [result for parent in sorted(set(parents)) if (result:=try_pair(child,parent,group,roi,fastening,seam))]
 # Retain physical contact evidence, but propose retiring the old reversed
 # interpretation where dependent teeth or an upper railing brace a cornice.
 dependent_retired=[]
 for child,records in relations.items():
  if 'cornice' not in stem(child):continue
  for relation in records:
   parent=relation['parent'];src=stem(parent)
   if '/dentil-' in src or parent.startswith('carrier/clerestory/front-rail/') and (src.endswith('/base') or '/pier-' in src):
    dependent_retired.append({'childCarrierId':child,'parentCarrierId':parent,'originalRelation':copy.deepcopy(relation),'actualSourceContactEvidence':g.certificate(child,parent),'geometryEvidenceRetained':True,'reason':'Dependent decorative teeth or an upper railing do not brace their underlying cornice. Preserve actual overlap evidence and use the separately listed downward dependency family.','accepted':False,'applied':False})
 retired_dependent_pairs={(r['childCarrierId'],r['parentCarrierId']) for r in dependent_retired}
 # Fixed portal frames: use actual floor footers and fixed jambs, preserving all
 # original hinges/hardware. Only observed moving-leaf header support is retired.
 for cid in sorted(by):
  src=stem(cid);c=by[cid]
  if c['role']!='window-or-portal-frame' or not re.fullmatch(r'ny-[^/]+/(?:jamb--1|jamb-1|header)',src):continue
  if src.endswith('/header'):
   prefix=cid.rsplit('/',1)[0];results=batch(cid,[prefix+'/jamb--1',prefix+'/jamb-1'],'fixed-portal-frame')
   for r in relations[cid]:
    if by[r['parent']]['role']=='door' and r['kind']=='coplanar-horizontal-triangle-contact':retired.append({'childCarrierId':cid,'parentCarrierId':r['parent'],'originalEvidenceKind':r['kind'],'geometryEvidenceRetained':True,'reason':'Observed moving-leaf contact is not permanent fixed-frame support. Use the exact fixed-jamb family joins.','applied':False})
  else:
   box=c['physicalBounds'];foot={'min':list(box['min']),'max':[box['max'][0],min(box['max'][1],box['min'][1]+.12),box['max'][2]]};parents=[p for p in neighbors(foot) if by[p]['role'] in {'building-deck','exterior-paving'} and p in a['supported']];results=batch(cid,parents,'fixed-portal-frame',roi=foot)
  scanned.append({'id':cid,'family':'fixed-portal-frame','results':len(results)})
 print('Fixed portals measured',flush=True)
 for cid in sorted(by):
  c=by[cid];src=stem(cid)
  if c['role']=='window-or-portal-frame' and '/ny-' not in cid and re.search(r'/(?:jamb--1|jamb-1)$',src) and not src.startswith('ny-'):
   parents=[p for p in neighbors(c['physicalBounds']) if by[p]['role'] in {'exterior-wall','perimeter-closure','building-deck'} and p in a['supported']];results=batch(cid,parents,'fixed-window-frame');scanned.append({'id':cid,'family':'fixed-window-frame','results':len(results)})
 print('Window frames measured',flush=True)
 # Full native grid coverage is checked for every original cornice, including
 # already-rooted long pieces. Opening-cut empty cells never acquire a relation.
 cornices=[c for c in by.values() if any(re.search(r'(?:^|/)cornice(?:-\d+)?$',s) for s in c['sourcePartIds'])]
 for number,c in enumerate(cornices):
  cid=c['id'];box=c['physicalBounds'];own=stem(cid).rsplit('/',1)[0];existing=[r['parent'] for r in relations[cid] if (cid,r['parent']) not in retired_dependent_pairs];lower=[x['id'] for x in cornices if stem(x['id']).rsplit('/',1)[0]==own and C.centre(x['physicalBounds'])[1]<C.centre(box)[1] and x['id']!=cid]
  for x in range(math.floor(box['min'][0]+C.INTERIOR),math.ceil(box['max'][0]-C.INTERIOR)):
   for z in range(math.floor(box['min'][2]+C.INTERIOR),math.ceil(box['max'][2]-C.INTERIOR)):
    cell={'min':[x,box['min'][1],z],'max':[x+1,box['max'][1],z+1]};occupancy=g.occupancy(cid,cell)
    if occupancy['occupied'] is not True:cornice_cells.append({'carrierId':cid,'grid':[x,z],'selector':cell,'status':'source-native-empty-column' if occupancy['occupied'] is False else 'unresolved-source-occupancy','occupancyEvidence':occupancy,'newRelationship':False});continue
    candidates=existing+lower+[p for p in neighbors(cell) if p in a['supported']]
    results=batch(cid,candidates,'cornice-full-local-coverage',roi=cell)
    cornice_cells.append({'carrierId':cid,'grid':[x,z],'selector':cell,'status':'actual-local-hosts' if results else 'occupied-source-native-continuity-only','occupancyEvidence':occupancy,'results':results,'forcedBreak':False,'newGeometry':False})
  if (number+1)%10==0:print('Cornices measured '+str(number+1)+'/'+str(len(cornices)),flush=True)
 print('All cornice occupied cells measured',flush=True)
 # Dentils attach to their own actual cornice overlap. A projected decorative
 # tooth never braces an unrelated wall or gets inferred gap fastening.
 for cid in sorted(by):
  src=stem(cid)
  if re.search(r'/dentil-\d+$',src):
   own=src.rsplit('/',1)[0];parents=[c['id'] for c in cornices if stem(c['id']).rsplit('/',1)[0]==own];valid=[]
   for parent in parents:
    cert=g.certificate(cid,parent)
    if cert and cert['proposedKind']=='fixed-embed':valid.append((parent,cert))
   # Prefer an actual rooted volume host, then the strongest certified margin.
   valid.sort(key=lambda v:(v[0] not in a['supported'],-min(v[1]['proof']['childMembership'].get('minimumInteriorMarginMetres',v[1]['proof']['childMembership'].get('minimumSurfaceDistanceMetres',0)),v[1]['proof']['parentMembership'].get('minimumInteriorMarginMetres',v[1]['proof']['parentMembership'].get('minimumSurfaceDistanceMetres',0))),v[0]))
   results=[emit(cid,*valid[0],'dentil-to-own-cornice')] if valid else []
   scanned.append({'id':cid,'family':'dentil-to-own-cornice','results':len(results)})
 print('Dentil family measured',flush=True)
 for cid in sorted(by):
  c=by[cid];src=stem(cid);results=[];group=None
  if re.search(r'/pier-\d+$',src):
   prefix=cid.rsplit('/',1)[0];group='railing-pier-to-base';results=batch(cid,[prefix+'/base'],'railing-pier-to-base')
  elif re.search(r'/cap-\d+$',src):
   prefix=src.rsplit('/',1)[0];group='railing-cap-to-real-members';parents=[p for p in by if stem(p).rsplit('/',1)[0]==prefix and re.search(r'/(?:baluster|pier)-\d+$',stem(p))];results=batch(cid,parents,group,fastening=True)
  elif c['role']=='rail' and (src.endswith('/top') or '/handrail-' in src):
   prefix=src.rsplit('/',1)[0];group='native-rail-to-real-posts';parents=[p for p in by if stem(p).rsplit('/',1)[0]==prefix and '/post-' in p];results=batch(cid,parents,group,fastening=True)
  elif c['role']=='timber-fitting' and src.startswith(('porch-east/','porch-west/')) and ('rail-cap' in src):
   prefix=src.split('/')[0];group='porch-rail-and-neck-frame';parents=[p for p in by if stem(p).startswith(prefix+'/') and ('baluster' in p or 'neck-rail-cap' in p) and p!=cid];parents += [p for p in neighbors(c['physicalBounds']) if p in a['supported'] and by[p]['role'] in {'exterior-wall','perimeter-closure'}];results=batch(cid,parents,group,fastening=True)
  if group:scanned.append({'id':cid,'family':group,'results':len(results)})
 print('Railing families measured',flush=True)
 for cid in sorted(by):
  if cid.startswith('carrier/visit-cap/ny-side-approach'):
   parent='carrier/porch-west-1' if '/ny-side-approach--1/' in cid else 'carrier/porch-east-1';results=batch(cid,[parent],'native-source-paving-seams',seam=True);scanned.append({'id':cid,'family':'native-source-paving-seams','results':len(results)})
 # New relationships are projected only into an explicitly hypothetical source
 # reachability view. No runtime graph, asset, stock or profile is changed.
 rows=[]
 for key,entry in groups.items():entry['id']=identity(list(key));rows.append(entry)
 rows.sort(key=lambda r:(r['family'],r['childCarrierId'],r['parentCarrierId'],r['action']))
 graph={k:set(v) for k,v in a['links'].items()}
 for row in rows:
  graph[row['parentCarrierId']].add(row['childCarrierId'])
  if row['direction']=='symmetric-structural':graph[row['childCarrierId']].add(row['parentCarrierId'])
 for r in retired+dependent_retired:graph[r['parentCarrierId']].discard(r['childCarrierId'])
 after_families=I.reachable(graph,a['anchors']);with_blocks={k:set(v) for k,v in graph.items()}
 for member in a['blocks']['members']:with_blocks[member['id']]=set()
 for join in a['blocks']['joins']:with_blocks[join['parentCarrierId']].add(join['childCarrierId'])
 after_approved=I.reachable(with_blocks,a['anchors']);remaining=sorted(set(a['ids'])-after_approved)
 # Classify every residual explicitly; true gaps are not silently mounted.
 residual=[]
 for cid in remaining:
  c=by[cid];src=stem(cid);group=family(cid,by);entry={'id':cid,'family':group,'role':c['role'],'bounds':c['physicalBounds'],'existingParents':[r['parent'] for r in relations[cid]],'status':'needs-further-source-geometry-or-intent-review','newGroundAnchor':False}
  if re.fullmatch(r'main-parapet-\d+/base',src):entry['status']='separated-parapet-base-requires-separate-modeled-support-design'
  elif c['role']=='cast-mineral-urn':entry['status']='existing-local-urn-bearing-chain-awaits-upstream-parent-support'
  elif '/main-parapet-' in cid or src.startswith('main-parapet-'):entry['status']='existing-native-railing-chain-awaits-separated-base-design'
  residual.append(entry)
 bindings={cid:g.shape(cid)['refs'] for cid in sorted({v for row in rows for v in (row['childCarrierId'],row['parentCarrierId'])})}
 totals=collections.Counter();regions=collections.Counter();actions=collections.Counter()
 for row in rows:totals[row['family']]+=1;regions[row['family']]+=len(row['localRegions']);actions[row['action']]+=1
 report={'version':1,'status':'UNACCEPTED_FAMILY_PROPOSAL','scope':'Bounded New York original-geometry/source interpretation review only. No new support, anchors, stock, roles, geometry, runtime or rendered acceptance.','inputs':{'runtimeCommit':I.RUNTIME,'diagnosticPath':I.DIAGNOSTIC,'diagnosticSha256':I.DIAG_SHA,'compactIndexPath':I.INDEX,'compactIndexSha256':I.INDEX_SHA,'baseBindings':{'path':I.BASE,'sha256':I.BASE_SHA},'tenControls':{'path':I.CONTROLS,'sha256':I.CONTROLS_SHA},'separateApprovedBlocks':{'artistCommit':'88538bb687e06911d63f728a17bd8668448805fe','path':I.BLOCKS,'sha256':I.BLOCKS_SHA,'includedInCurrentDiagnostic':False},'producerPins':a['sourcePins']},'currentDiagnostic':a['diagnostic']['totals'],'groupPairCounts':dict(totals),'groupRegionCounts':dict(regions),'actions':dict(actions),'proposedCanonicalPairs':len(rows),'proposedLocalRegions':sum(len(r['localRegions']) for r in rows),'retiredObservedMovingLeafSupportCount':len(retired),'retiredDependentBracingInterpretations':len(dependent_retired),'corniceCoverage':{'pieces':len(cornices),'gridCells':len(cornice_cells),'cellStatuses':dict(collections.Counter(c['status'] for c in cornice_cells)),'newForcedBreaks':0},'hypotheticalInterpretationOnly':{'afterFamilyRecordsOriginalUnrooted':len(set(a['ids'])-after_families),'afterAlsoSeparateApprovedBlocksOriginalUnrooted':len(remaining),'rootRuntimeAcceptance':False,'newUnapprovedGeometryIncluded':False,'newAnchors':0},'normalizationRequirement':'Every local region of a canonical pair must be consumed with actual local patch correspondence. Current first-attachment-per-parent and all-selected cross pairing cannot be assumed to implement this proposal. Existing raw records remain evidence.','sourceQuantitiesAndRolesUnchanged':True,'unapprovedFamilyRecordsApplied':0,'newGeometryApplied':0,'newFuelApplied':0,'rendererStarted':False,'preservedExistingFamilyMeasurements':dict(preserved),'authoringSources':[{'path':f.relative_to(ROOT).as_posix(),'sha256':hashlib.sha256(f.read_bytes()).hexdigest()} for f in [HERE/'inputs.py',HERE/'geometry.py',HERE/'propose.py',ROOT/'art/source/shared-map-fire-bindings/export.py',ROOT/'art/source/shared-map-fire-bindings/propose-new-york-coverage.py',ROOT/'art/source/shared-map-fire-bindings/reachability-review-v1/review.py']]}
 return report,rows,bindings,cornice_cells,scanned,retired,residual,g,dependent_retired

if __name__=='__main__':
 parser=argparse.ArgumentParser(description=__doc__);parser.add_argument('--record',action='store_true');parser.add_argument('--check',action='store_true');args=parser.parse_args();assert not (args.record and args.check)
 try:
  report,rows,bindings,cells,scanned,retired,residual,g,dependent_retired=build()
  if args.record or args.check:
   outputs={'proposal-index.json':encode(report),'relationships.json':compact_rows({'version':1,'status':'UNACCEPTED_PROPOSAL','geometryBindingsPath':'geometry-bindings.json','relationships':rows},'relationships'),'geometry-bindings.json':encode({'version':1,'coordinateFrame':'emitted-world','sourceGeometryUnchanged':True,'carriers':bindings}),'cornice-coverage.json':compact_rows({'version':1,'meaning':'Actual occupied/source-contact evidence only, not forced breaks or stress acceptance.','cells':cells},'cells'),'family-scan.json':compact_rows({'version':1,'sourceOnly':True,'scanned':scanned},'scanned'),'retired-moving-frame-interpretations.json':encode({'version':1,'status':'PROPOSED_ONLY','originalContactGeometryRetained':True,'records':retired}),'retired-dependent-bracing-interpretations.json':encode({'version':1,'status':'PROPOSED_ONLY','originalContactGeometryRetained':True,'records':dependent_retired}),'remaining-explicit-findings.json':compact_rows({'version':1,'unapprovedGeometryApplied':False,'records':residual},'records')}
   for name,data in outputs.items():
    if args.record:(HERE/name).write_text(data,encoding='utf-8',newline='\n')
    else:assert (HERE/name).read_bytes()==data.encode(), 'Nondeterministic proposal output: '+name
  print(json.dumps(report,sort_keys=True))
 except Exception as error:
  failure={'version':1,'stage':'read-only family proposal generation','exception':type(error).__name__,'message':str(error),'traceback':traceback.format_exc(),'assetsChanged':False}
  (HERE/'last-failure.json').write_text(encode(failure),encoding='utf-8',newline='\n');raise
