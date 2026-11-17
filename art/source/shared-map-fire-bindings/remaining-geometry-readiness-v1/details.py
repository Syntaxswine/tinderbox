"""Bounded compound, cut-frame, glazing and living-plant source proposals."""
from pathlib import Path
from fractions import Fraction as F
import argparse,collections,hashlib,importlib.util,itertools,json,re,sys
sys.dont_write_bytecode=True
HERE=Path(__file__).resolve().parent;ROOT=HERE.parents[3];PRE=HERE.parent/'remaining-material-proposal-v1'
def module(name,path):
 s=importlib.util.spec_from_file_location(name,path);m=importlib.util.module_from_spec(s);s.loader.exec_module(m);return m
A=module('readiness_audit_functions',HERE/'analyze.py');X=A.X;M=A.M
def read(path):return json.loads(path.read_text(encoding='utf-8'))
def encoded(v):return json.dumps(v,indent=2,sort_keys=True)+'\n'
def build():
 lookup={};parts={};pin_rows=read(HERE/'geometry-pins.json')['files'];pin_by={p['path']:p for p in pin_rows};geometries={};shape_cache={}
 for place in ['administration','horticulture']:
  folder=ROOT/'assets/art/place-scenes'/place;index=read(folder/'index.json');rules=M.rules(place)
  for section in index['chunks']:
   for part in read(folder/section['url'])['parts']:
    for draw in part.get('sourceRanges') or [{'id':part['id']}]:
     sid=draw['id'];semantic={'sourceId':sid.removeprefix('replacement/'),'role':part.get('role'),'fromAccess':part.get('fromAccess',False)}
     rule=next(r for r in rules if M.match(r['scope'],semantic));path=(folder/index['geometries'][part['geometry']]).relative_to(ROOT).as_posix()
     row={'placeId':place,'sourceId':sid,'renderId':part['id'],'sectionId':section['id'],'familyId':rule['id'],'recipe':rule['quantityRule'],'geometryId':part['geometry'],'geometryPath':path,'geometrySha256':pin_by[path]['sha256'],'sourceRange':{k:draw[k] for k in ['start','count']} if 'start' in draw else None,'matrix':part['matrix'],'openMatrix':part.get('openMatrix'),'role':part.get('role')}
     lookup[place,sid]=row
     parts[place,sid]=part
 def geometry(row):
  path=row['geometryPath']
  if path not in geometries:
   raw=(ROOT/path).read_bytes();assert A.digest(raw)==row['geometrySha256'];geometries[path]=json.loads(raw)
  return geometries[path]
 def shape(row):
  key=(row['geometryPath'],tuple((row['sourceRange'] or {}).values()))
  if key not in shape_cache:shape_cache[key]=X.effective(geometry(row),row['sourceRange'])
  return shape_cache[key]
 def reference(row):return {k:row[k] for k in ['placeId','sourceId','renderId','sectionId','familyId','geometryPath','geometryId','geometrySha256','sourceRange']}
 def world_bounds(row):
  sh=shape(row);m=list(map(F,row['matrix']));s=sh['scale'];pts=[tuple(sum(m[j*4+k]*F(p[j],s) for j in range(3))+m[12+k] for k in range(3)) for p in sh['points']]
  bb={'min':tuple(min(p[k] for p in pts) for k in range(3)),'max':tuple(max(p[k] for p in pts) for k in range(3))}
  corners=set(itertools.product(*[(bb['min'][k],bb['max'][k]) for k in range(3)]))
  return bb,sh['facts']['closedSolidProof'] and set(pts)==corners
 def box_volume(box):return max(F(0),box['max'][0]-box['min'][0])*max(F(0),box['max'][1]-box['min'][1])*max(F(0),box['max'][2]-box['min'][2])
 def intersection(boxes):return {'min':tuple(max(b['min'][k] for b in boxes) for k in range(3)),'max':tuple(min(b['max'][k] for b in boxes) for k in range(3))}
 compounds=[]
 for original in read(PRE/'compound-owner-proposals.json')['groups']:
  rows=[lookup[original['placeId'],sid] for sid in original['originalSourceIds']];shapes=[shape(row) for row in rows];bbs=[world_bounds(row) for row in rows];all_closed=all(s['facts']['closedSolidProof'] for s in shapes);union=F(0);unknown=[];relations=[]
  for n in range(1,len(rows)+1):
   for ids in itertools.combinations(range(len(rows)),n):
    if n==1:
     r=rows[ids[0]];s=shapes[ids[0]];v=s['facts']['signedVolumeIntegral'];v=abs(F(int(v['numerator']),int(v['denominator']))*X.determinant(X.matrix_linear(r['matrix'])))
    else:
     overlap=box_volume(intersection([bbs[i][0] for i in ids]))
     if overlap and not all(bbs[i][1] for i in ids):unknown.append(list(ids))
     v=overlap
     if n==2:
      gaps=[max(F(0),max(bbs[i][0]['min'][k] for i in ids)-min(bbs[i][0]['max'][k] for i in ids)) for k in range(3)]
      relations.append({'componentIndices':list(ids),'literalAxisSeparations':[X.rational(g) for g in gaps],'positiveBoxOverlapVolume':X.rational(overlap),'overlapIsActualSolidProof':not overlap or all(bbs[i][1] for i in ids),'notJointOrConnectivityAcceptance':True})
    union+=v if n%2 else -v
  proved=all_closed and not unknown
  item={'placeId':original['placeId'],'proposalKey':original['proposalKey'],'kind':original['kind'],'members':[reference(r) for r in rows],'allComponentSolidsProved':all_closed,'closedUnionVolumeProof':proved,'unionVolume':X.rational(union) if proved else None,'unprovedOverlapSubsets':unknown,'pairGeometry':relations,'quantityAssigned':False,'supportOrJointAccepted':False,'physicalGeometryChanged':False}
  if original['kind']=='native-leaf':
   body,extension=rows;cb,ce=body['matrix'],extension['matrix'];ob,oe=body['openMatrix'],extension['openMatrix']
   pose=ob is not None and oe is not None and X.matrix_linear(cb)==X.matrix_linear(ce) and X.matrix_linear(ob)==X.matrix_linear(oe) and [F(ce[i])-F(cb[i]) for i in [12,13,14]]==[F(oe[i])-F(ob[i]) for i in [12,13,14]]
   areas=[X.linear_metrics(s,r['matrix'],'leaf-area') for s,r in zip(shapes,rows)];area_proof=all(a['readiness']=='proved-leaf-component-area' for a in areas) and all(not p['positiveBoxOverlapVolume']['approximate'] for p in relations)
   item.update({'declaredPoseRelativeOffsetInvariant':pose,'areaUnionProof':area_proof,'panelAreaApproximate':sum(a.get('primaryFaceAreaApproximate',0) for a in areas) if area_proof else None,'areaFormula':'Sum of two source front-cap areas with their unchanged affine factors; disjoint source Y intervals. No gap is filled.','literalBodyExtensionGap':X.rational(bbs[1][0]['min'][1]-bbs[0][0]['max'][1]),'hardwareSourceIds':[sid for (place,sid),p in parts.items() if place==body['placeId'] and p.get('role')=='door-hardware' and sid==body['sourceId'].split('/')[0]+'/handle-'+body['sourceId'].rsplit('leaf-',1)[1]],'poseScope':'Only the two declared body/extension matrix relationships; no posed sweep or scene traversal.'})
  compounds.append(item)
 glazing=[];glazing_roles={'window-glass','dome-glass','roof-glass','lantern-glass','cupola-vent'}
 for (place,sid),row in sorted(lookup.items()):
  if row['familyId'] not in {'A09','H12'}:continue
  g=geometry(row);idx=g['index']['array'] if isinstance(g.get('index'),dict) else list(range(len(g['attributes']['position']['array'])//3));sr=row['sourceRange'];start=sr['start'] if sr else 0;count=sr['count'] if sr else len(idx);prefix=sid.removeprefix('replacement/').rsplit('/',1)[0]
  frames=[s for (p,s),r in lookup.items() if p==place and s.removeprefix('replacement/').startswith(prefix+'/') and r['familyId'] not in {'A09','H12'}]
  large_skin=row['role'] in {'dome-glass','roof-glass','lantern-glass','cupola-vent'};quad_candidates=False
  if large_skin and count%6==0:
   pos=g['attributes']['position']['array'];quad_candidates=True
   for i in range(start,start+count,6):
    a={tuple(pos[j*3:j*3+3]) for j in idx[i:i+3]};b={tuple(pos[j*3:j*3+3]) for j in idx[i+3:i+6]}
    if len(a)!=3 or len(b)!=3 or len(a|b)!=4 or len(a&b)!=2:quad_candidates=False;break
  result={**reference(row),'sourceIndexStart':start,'sourceIndexCount':count,'sourceTriangleCount':count//3,'sourceFrameAssociationIds':sorted(frames),'associationIsNotContactProof':True,'localDamageOwnerApproved':False,'geometrySplitAuthored':False,'quantityAssigned':False,'readiness':'requires-reviewed-local-damage-correspondence','reason':'A source slab with multiple face contributors is not a final pane/patch map; local retirement must remove matching front/back/edge contributions.' if not large_skin else 'Large/open source skin needs local source-facet correspondence; no first-hit whole-skin retirement.'}
  if quad_candidates:result['unappliedSourceMeshCellCandidate']={'sourceStart':start,'sourceStopExclusive':start+count,'step':6,'indexCountPerCandidate':6,'candidateCount':count//6,'validation':'Each existing consecutive triangle pair has four exact source positions and one shared edge. These are mesh cells, not verified framed panes.','newGeometry':False}
  glazing.append(result)
 cuts=[]
 exception_ids={(r['placeId'],r['sourceId']) for r in read(HERE/'quantity-exceptions.json')['records']}
 for (place,sid),row in sorted(lookup.items()):
  if sid.startswith('replacement/') and (row['familyId'] in {'A10','H19'} or re.search(r'/(?:jamb-|header$|mullion|transom|arch|sash-|entry-header|leaf-header|fan-)',sid)):
   sh=shape(row);cuts.append({**reference(row),'closedSolidProved':sh['facts']['closedSolidProof'],'boundaryOrNonmanifoldEdges':sh['facts']['boundaryOrNonmanifoldEdges'],'quantityException':(place,sid) in exception_ids,'quantityAssigned':False,'repairProposedOrApplied':False,'reason':'Original effective cut triangles only; open boundaries/ownership remain explicit. No New York restoration or cap copied.'})
 plant_rows={sid:row for (place,sid),row in lookup.items() if place=='horticulture' and row['familyId']=='H15'};owners=[];used=set()
 def plant_owner(key,kind,sources,patches,followers):
  assert all(s in plant_rows and s not in used for s in sources);used.update(sources)
  owners.append({'proposalKey':key,'kind':kind,'sourceIds':sources,'damagePatchSourceIds':patches,'visualFollowSourceIds':followers,'profileId':None,'finiteStock':None,'moistureResponse':None,'accepted':False,'applied':False,'sourceGeometryRefs':[reference(plant_rows[s]) for s in sources],'sourceAssociationNotJointProof':True,'followMeaning':'No independent quantity is assigned, including no implicit zero: future measured foliage/fruit stock must be included exactly once in the owner budget.'})
 for sid in sorted(plant_rows):
  if sid.endswith('/trunk'):plant_owner(sid,'trunk',[sid],[sid],[])
 for prefix in sorted({s.split('/')[0] for s in plant_rows if s.startswith(('palm-','fern-'))}):
  sources=sorted(s for s in plant_rows if s.startswith(prefix+'/frond-'));plant_owner(prefix+'/foliage','frond-crown',sources,sources,[])
 for sid in sorted(plant_rows):
  if sid.endswith('/canopy'):
   prefix=sid.rsplit('/',1)[0];fruit=sorted(s for s in plant_rows if s.startswith(prefix+'/fruit-'));plant_owner(prefix+'/foliage','orange-canopy-and-fruit',[sid]+fruit,[sid],fruit)
 for sid in sorted(plant_rows):
  m=re.fullmatch(r'front-shrub-(-?\d+)-(\d+)',sid)
  if m:
   x,j=m.groups();flowers=['front-flower-'+x+'-'+j+'-'+dx for dx in ['-0.25','0.25']];plant_owner(sid+'/clump','flowering-shrub-clump',[sid]+flowers,[sid],flowers)
 assert used==set(plant_rows) and len(used)==412 and len(owners)==98
 plant={'version':1,'status':'UNACCEPTED_FUTURE_LIVING_PLANT_REPRESENTATION','currentAll412PartsWithheld':True,'runtimeConsumable':False,'proposedStockOwners':len(owners),'proposedLocalDamagePatches':sum(len(o['damagePatchSourceIds']) for o in owners),'proposedVisualFollowParts':sum(len(o['visualFollowSourceIds']) for o in owners),'owners':owners,'stockRecipeProposal':{'trunks':'Actual authored closed-solid volume may be measured, but dry-stock density/conversion and parent profile need review; no automatic frame fuel.','fronds':'One-sided authored surface area, once per actual source frond. Areal dry-stock loading/conversion remains unmeasured; no cloth or grass assignment.','canopyShrubAndFruit':'The closed icosahedral meshes are visual envelopes, not solid dry biomass. Use an explicitly reviewed finite per-owner foliage/fruit dry-stock budget, never envelope volume as timber. Values remain withheld.','localShares':'Each physical damage patch must have reviewed finite shares that sum to the owner budget; no duplicate, refill, hidden or zero-default stock.'},'supportLimits':'Source botanical associations are not joints or earth anchors. Plants do not brace the greenhouse; source floor/bed contacts remain unproved. No new root/pot/collider geometry.'}
 summary={'version':1,'status':'BOUNDED_SOURCE_REVIEW_ONLY','compoundGroups':len(compounds),'provedUnionGroups':sum(c['closedUnionVolumeProof'] for c in compounds),'leafAreaGroupsProved':sum(c.get('areaUnionProof',False) for c in compounds),'compoundGroupsWithheld':[{'placeId':c['placeId'],'proposalKey':c['proposalKey'],'kind':c['kind']} for c in compounds if not c['closedUnionVolumeProof']],'glazingSourceRecords':len(glazing),'glazingLocalDamageOwnersApproved':0,'sourceMeshCellCandidateRecords':sum('unappliedSourceMeshCellCandidate' in g for g in glazing),'cutFrameRecords':len(cuts),'cutFrameQuantityExceptions':sum(c['quantityException'] for c in cuts),'plantStockOwnersProposed':98,'plantDamagePatchesProposed':plant['proposedLocalDamagePatches'],'plantFollowPartsProposed':plant['proposedVisualFollowParts'],'allPlantStockWithheld':True,'quantityAssignments':0,'geometryExports':0,'repairs':0,'runtimeChanges':0,'renderers':0,'helpers':0}
 outputs={'compound-review.json':encoded({'version':1,'groups':compounds}),'glazing-ownership-review.json':encoded({'version':1,'records':glazing}),'cut-frame-review.json':encoded({'version':1,'records':cuts}),'living-plant-representation-proposal.json':encoded(plant),'detail-summary.json':encoded(summary)}
 return outputs,summary
if __name__=='__main__':
 parser=argparse.ArgumentParser(description=__doc__);parser.add_argument('--save-review',action='store_true');parser.add_argument('--check',action='store_true');args=parser.parse_args();assert not(args.save_review and args.check)
 outputs,summary=build()
 for name,value in outputs.items():
  if args.save_review:(HERE/name).write_text(value,encoding='utf-8',newline='\n')
  if args.check:assert (HERE/name).read_bytes()==value.encode(),'Detail review differs: '+name
 print(json.dumps(summary,sort_keys=True))
