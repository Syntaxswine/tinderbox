"""Read-only grouped geometry readiness for the accepted remaining-landmark scopes."""
from pathlib import Path
import argparse,collections,hashlib,importlib.util,json,time,sys
sys.dont_write_bytecode=True
HERE=Path(__file__).resolve().parent;ROOT=HERE.parents[3];PRE=HERE.parent/'remaining-material-proposal-v1'
def module(name,path):
 s=importlib.util.spec_from_file_location(name,path);m=importlib.util.module_from_spec(s);s.loader.exec_module(m);return m
M=module('accepted_material_scopes',PRE/'analyze.py');X=module('exact_remaining_geometry',HERE/'exact.py')
def canon(value):return json.dumps(value,sort_keys=True,separators=(',',':'))
def digest(raw):return hashlib.sha256(raw).hexdigest()
def ident(value):return digest(canon(value).encode())[:24]
def encode(value):return json.dumps(value,sort_keys=True,indent=2)+'\n'
def rows(value,key):
 return '{'+','.join(json.dumps(k)+':'+('[\n'+',\n'.join(canon(r) for r in v)+'\n]' if k==key else canon(v)) for k,v in value.items())+'}\n'
def build():
 raw_cache={};shapes={};groups={};pins={};members=[];exceptions=[];lookup={};family_counts=collections.Counter();status_counts=collections.Counter();map_counts={};start=time.monotonic()
 for place in ['administration','horticulture']:
  folder=ROOT/'assets/art/place-scenes'/place;index=json.loads((folder/'index.json').read_text());rules=M.rules(place);count=0
  for section in index['chunks']:
   data=json.loads((folder/section['url']).read_text())
   for part in data['parts']:
    path=folder/index['geometries'][part['geometry']];rel=path.relative_to(ROOT).as_posix()
    if rel not in raw_cache:
     raw=path.read_bytes();g=json.loads(raw);raw_cache[rel]=(g,digest(raw));pins[rel]={'path':rel,'sha256':digest(raw),'bytes':len(raw),'geometryId':part['geometry'],'positionStorage':g['attributes']['position'].get('type'),'indexStorage':g['index'].get('type') if isinstance(g.get('index'),dict) else None}
    g,sha=raw_cache[rel];draws=part.get('sourceRanges') or [{'id':part['id'],'start':0,'count':len(g['index']['array']) if isinstance(g.get('index'),dict) else len(g['attributes']['position']['array'])//3}]
    for draw in draws:
     source=draw['id'];semantic={'sourceId':source.removeprefix('replacement/'),'role':part.get('role'),'fromAccess':part.get('fromAccess',False)};rule=next(r for r in rules if M.match(r['scope'],semantic));recipe=rule['quantityRule'];base_key=(sha,draw['start'],draw['count']);base_id=ident(base_key)
     if base_id not in shapes:shapes[base_id]=X.effective(g,draw)
     shape=shapes[base_id];linear=X.matrix_linear(part['matrix']);key=(base_id,linear);gid=ident(key)
     if gid not in groups:groups[gid]={'id':gid,'baseCaseId':base_id,'linear':list(linear),'recipes':{},'sourceGeometryRefs':set(),'memberIds':[],'byFamily':collections.Counter(),'representative':{'placeId':place,'sourceId':source,'renderId':part['id'],'sectionId':section['id'],'sourceRange':{'start':draw['start'],'count':draw['count']}}}
     group=groups[gid]
     if recipe not in group['recipes']:group['recipes'][recipe]=X.linear_metrics(shape,part['matrix'],recipe)
     group['sourceGeometryRefs'].add(rel);group['memberIds'].append(place+'::'+source);group['byFamily'][place+'/'+rule['id']]+=1
     status=group['recipes'][recipe]['readiness'];row={'placeId':place,'sourceId':source,'renderId':part['id'],'sectionId':section['id'],'familyId':rule['id'],'quantityRecipe':recipe,'geometryId':part['geometry'],'geometryPath':rel,'geometrySha256':sha,'sourceRange':{'start':draw['start'],'count':draw['count']},'geometryGroupId':gid,'baseCaseId':base_id,'matrix':part['matrix'],'openMatrix':part.get('openMatrix'),'portalId':part.get('portalId'),'readiness':status}
     lookup[place,source]=row;members.append(row);status_counts[place,status]+=1;family_counts[place,rule['id'],status]+=1;count+=1
     if recipe not in {'inert','withheld'} and status.startswith('withheld'):
      exceptions.append({**row,'quantityAssigned':False,'sourceGeometryChanged':False,'reason':status,'closedSolidMethod':shape['facts']['closedSolidMethod'],'boundaryOrNonmanifoldEdges':shape['facts']['boundaryOrNonmanifoldEdges']})
   if len(shapes)%250==0 and time.monotonic()-start>5:print('Grouped '+place+' '+str(count)+' source IDs; '+str(len(shapes))+' range cases',flush=True)
  map_counts[place]=count;print('Read '+place+' '+str(count)+' logical IDs',flush=True)
 linear_rows={};group_rows=[]
 def compact_metric(metric):
  out={}
  for name,value in metric.items():
   if isinstance(value,dict) and {'numerator','denominator','approximate'}<=set(value):out[name+'Approximate']=value['approximate']
   else:out[name]=value
  out['exactFormulaInputs']='Unchanged base-case rational measures and exact listed linear transform; approximate values are display only, not assigned stock.'
  return out
 for gid,group in sorted(groups.items()):
  ids=sorted(group.pop('memberIds'));group['logicalSourceCount']=len(ids);group['memberIdSetSha256']=digest(('\n'.join(ids)+'\n').encode());group['firstMember']=ids[0];group['lastMember']=ids[-1];group['sourceGeometryRefs']=sorted(group['sourceGeometryRefs']);group['byFamily']=dict(sorted(group['byFamily'].items()))
  linear=group.pop('linear');lid=ident(linear);linear_rows[lid]={'id':lid,'rowMajor3x3':linear,'exactDeterminant':X.rational(X.determinant(linear))};group['linearTransformId']=lid
  group['recipes']={k:compact_metric(v) for k,v in group['recipes'].items()};group_rows.append(group)
 case_rows=[]
 for bid,shape in sorted(shapes.items()):
  sample=next(g for g in group_rows if g['baseCaseId']==bid);rep=sample['representative'];member=lookup[rep['placeId'],rep['sourceId']]
  facts=dict(shape['facts']);valid=[p for p in facts.pop('sourcePrismProofs') if p['proved']];facts['prismWitness']=valid[0] if valid else None
  case_rows.append({'id':bid,'sourceGeometryPath':member['geometryPath'],'sourceGeometrySha256':member['geometrySha256'],'sourceRange':member['sourceRange'],'facts':facts,'actualSourceBounds':shape['bounds']})
 summary={'version':1,'status':'SOURCE_GEOMETRY_READINESS_ONLY','authorityCommit':'4c2019abcc006b4b55c8293781a9741b9b9e3448','acceptedMaterialCandidate':'5da6393cc5be1041d1042f7b6214d2d7ff9ae764','sourceContext':M.RUNTIME,'logicalSourceCounts':map_counts,'rawGeometryFiles':len(pins),'effectiveRangeCases':len(shapes),'linearGeometryGroups':len(groups),'readinessCounts':[{'placeId':p,'status':s,'logicalSourceIds':n} for (p,s),n in sorted(status_counts.items())],'familyReadiness':[{'placeId':p,'familyId':f,'status':s,'logicalSourceIds':n} for (p,f,s),n in sorted(family_counts.items())],'quantityExceptions':len(exceptions),'rawClosedCases':sum(s['facts']['closedOrientedManifold'] for s in shapes.values()),'closedSolidProvedCases':sum(s['facts']['closedSolidProof'] for s in shapes.values()),'notRuntimeOrStockAcceptance':True,'quantitiesApplied':0,'sourceGeometryChanged':False,'newYorkInputsChanged':False,'rendererStarted':False,'factoryExecution':False,'helpersStarted':False,'exactArithmetic':'Source binary coordinates are integers on an exact common power-of-two lattice. Topology uses equality, not welding tolerances. Degenerate triangles are recorded and excluded only from integrals. Affine matrices are retained as exact rationals. No source arrays are rewritten.','limits':'Closed manifold topology alone does not prove a non-self-intersecting solid. Only strict supporting-plane convexity or congruent nonoverlapping prismatic cap proof certifies volume here. Other cases remain withheld.'}
 outputs={'geometry-pins.json':encode({'version':1,'files':[pins[k] for k in sorted(pins)]}),'geometry-cases.json':rows({'version':1,'cases':case_rows},'cases'),'geometry-groups.json':rows({'version':1,'groups':group_rows},'groups'),'linear-transforms.json':encode({'version':1,'transforms':[linear_rows[k] for k in sorted(linear_rows)]}),'quantity-exceptions.json':rows({'version':1,'meaning':'Exact IDs requiring further recipe proof; no repairs or quantities applied.','records':exceptions},'records'),'readiness-summary.json':encode(summary)}
 return outputs,summary,lookup,shapes,raw_cache
if __name__=='__main__':
 parser=argparse.ArgumentParser(description=__doc__);parser.add_argument('--save-review',action='store_true');parser.add_argument('--check',action='store_true');args=parser.parse_args();assert not(args.save_review and args.check)
 outputs,summary,*_=build()
 for name,value in outputs.items():
  if args.save_review:(HERE/name).write_text(value,encoding='utf-8',newline='\n')
  if args.check:assert (HERE/name).read_bytes()==value.encode(),'Readiness output differs: '+name
 print(json.dumps({k:v for k,v in summary.items() if k not in ['familyReadiness']},sort_keys=True))
