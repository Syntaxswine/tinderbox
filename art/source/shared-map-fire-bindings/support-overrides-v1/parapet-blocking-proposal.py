"""Unapplied geometry/quantity proposal: one timber block per native parapet bay."""
from pathlib import Path
import argparse,collections,hashlib,importlib.util,json,math,subprocess,sys
sys.dont_write_bytecode=True
HERE=Path(__file__).resolve().parent;ROOT=HERE.parents[3]
def module(name,path):
 s=importlib.util.spec_from_file_location(name,ROOT/path);m=importlib.util.module_from_spec(s);s.loader.exec_module(m);return m
M=module('original_binding_measures','art/source/shared-map-fire-bindings/export.py');P=module('original_convex_planes','art/source/shared-map-fire-bindings/propose-new-york-coverage.py')
BASE='assets/art/shared-map-fire-bindings/new-york-complete-v1.json';BASE_SHA='407c0f8bd582f8d95b9ade1471cd51892ac7b9a40fd2c005696bcc5485991eba'
OUTPUT=HERE/'parapet-blocking-proposal.json';CHECKS=HERE/'parapet-blocking-checks.json'
def sha(path):return hashlib.sha256(path.read_bytes()).hexdigest()
def geometry(width,height,depth):
 # A new fitting primitive; no original wall, door, roof or other mesh is scaled.
 faces=[([1,0,0],[(.5,-.5,-.5),(.5,.5,-.5),(.5,.5,.5),(.5,-.5,.5)]),([-1,0,0],[(-.5,-.5,.5),(-.5,.5,.5),(-.5,.5,-.5),(-.5,-.5,-.5)]),([0,1,0],[(-.5,.5,-.5),(-.5,.5,.5),(.5,.5,.5),(.5,.5,-.5)]),([0,-1,0],[(-.5,-.5,.5),(-.5,-.5,-.5),(.5,-.5,-.5),(.5,-.5,.5)]),([0,0,1],[(-.5,-.5,.5),(.5,-.5,.5),(.5,.5,.5),(-.5,.5,.5)]),([0,0,-1],[(.5,-.5,-.5),(-.5,-.5,-.5),(-.5,.5,-.5),(.5,.5,-.5)])]
 position=[];normal=[];uv=[];indices=[]
 for n,quad in faces:
  start=len(position)//3
  for p in quad:
   position.extend(p);normal.extend(n)
   if n[0]:coords=(-n[0]*p[2]*depth,p[1]*height)
   elif n[1]:coords=(p[0]*width,-n[1]*p[2]*depth)
   else:coords=(n[2]*p[0]*width,p[1]*height)
   uv.extend(coords)
  indices.extend(start+i for i in (0,1,2,0,2,3))
 return {'type':'proposal-unit-fitting-box','attributes':{'position':{'itemSize':3,'array':position},'normal':{'itemSize':3,'array':normal},'uv':{'itemSize':2,'array':uv},'grossUV':{'itemSize':2,'array':list(uv)}},'index':{'array':indices,'type':'Uint16Array'},'geometryUse':'Study-only primitive and 48 proposed transforms; not registered or exported to game assets.'}

def build():
 assert sha(ROOT/BASE)==BASE_SHA
 base=json.loads((ROOT/BASE).read_text(encoding='utf-8'));by={c['id']:c for c in base['carriers']};upper=by['carrier/main-parapet-0/base'];lower=by['carrier/edge-0/cornice-7'];geometries={}
 def triangles(c):
  out=[]
  for b in c['renderBindings']:
   if b['physicalContribution']!='carrier-solid':continue
   if b['geometryPath'] not in geometries:geometries[b['geometryPath']]=json.loads((ROOT/b['geometryPath']).read_text(encoding='utf-8'))
   out+=M.triangles(geometries[b['geometryPath']],b['matrix'],b.get('sourceRange'))
  return out
 upper_ts=triangles(upper);lower_ts=triangles(lower);upper_faces=M.face_triangles(upper_ts,upper['physicalBounds'])[(1,'min')];lower_faces=M.face_triangles(lower_ts,lower['physicalBounds'])[(1,'max')]
 bottom=lower['physicalBounds']['max'][1];top=upper['physicalBounds']['min'][1];height=top-bottom;width=depth=.16
 assert math.isclose(height,.21,abs_tol=1e-7) and upper['physicalBounds']['min'][0]==32 and upper['physicalBounds']['max'][0]==80
 mesh=geometry(width,height,depth);unit_triangles=M.triangles(mesh,[1,0,0,0,0,1,0,0,0,0,1,0,0,0,0,1]);assert M.measures(unit_triangles)['closed']
 uv_edge_controls=0
 for face in range(6):
  positions=mesh['attributes']['position']['array'];uvs=mesh['attributes']['uv']['array']
  for corner in range(4):
   a=face*4+corner;b=face*4+(corner+1)%4
   physical_length=math.dist([positions[a*3+k]*[width,height,depth][k] for k in range(3)],[positions[b*3+k]*[width,height,depth][k] for k in range(3)])
   assert abs(physical_length-math.dist(uvs[a*2:a*2+2],uvs[b*2:b*2+2]))<1e-12
   uv_edge_controls+=1

 # Existing explicit parent path only: no proposed override, adjacency shortcut,
 # hypothetical timber block or new anchor participates in this grounding evidence.
 queue=collections.deque([[lower['id']]]);seen={lower['id']};ground_path=None
 while queue:
  chain=queue.popleft();c=by[chain[-1]]
  if any(a['kind']=='native-ground-contact' and a['elevation']==0 for a in c['anchors']):ground_path=chain;break
  for parent in c['supportCarrierIds']:
   if parent not in seen:seen.add(parent);queue.append(chain+[parent])
 assert ground_path
 path_evidence=[{'childCarrierId':a,'parentCarrierId':b,'originalSupportEvidence':[e for e in by[a]['supportEvidence'] if e.get('carrierId')==b]} for a,b in zip(ground_path,ground_path[1:])]
 roots=[dict(a) for a in by[ground_path[-1]]['anchors']];assert roots
 # Pitched source roofs must remain geometrically separate from the proposed blocks.
 roofs=[]
 for c in base['carriers']:
  if c['id'] in ('carrier/roof/front-centre','carrier/roof/east-wing','carrier/roof/west-wing'):
   ts=triangles(c);planes=P.convex_planes(ts);assert planes is not None
   roofs.append((c['id'],ts,planes))
 instances=[];contacts=[];clearances=[];total_volume=0
 for bay in range(48):
  x=32.5+bay;z=26.;centre=[x,(bottom+top)/2,z];matrix=[width,0,0,0,0,height,0,0,0,0,depth,0,*centre,1];ts=M.triangles(mesh,matrix);facts=M.measures(ts)
  assert facts['closed'] and facts['volume']>0 and len(ts)==12
  oriented=collections.Counter()
  for index,triangle in enumerate(ts):
   points=[tuple(round(x,9) for x in p) for p in triangle]
   for a,b in zip(points,points[1:]+points[:1]):oriented[a,b]+=1
   normal=M.cross(M.sub(triangle[1],triangle[0]),M.sub(triangle[2],triangle[0]));vertex=mesh['index']['array'][index*3];authored=mesh['attributes']['normal']['array'][vertex*3:vertex*3+3]
   assert M.dot(normal,authored)>0
  assert all(count==1 and oriented[b,a]==1 for (a,b),count in oriented.items())

  assert math.isclose(facts['volume'],width*height*depth,abs_tol=1e-13)
  bbox=M.bounds(ts);assert abs(bbox['min'][1]-bottom)<1e-12 and abs(bbox['max'][1]-top)<1e-12
  # Actual coplanar triangle union area, not box overlap or an invented gap mount.
  footprint=[[x-width/2,z-depth/2],[x+width/2,z-depth/2],[x+width/2,z+depth/2],[x-width/2,z+depth/2]]
  footprint_tris=[footprint[:3],[footprint[0],footprint[2],footprint[3]]];contact_area=width*depth
  measured_areas={key:sum(M.overlap_area(a,b) for a in footprint_tris for b in faces) for key,faces in [('lower',lower_faces),('upper',upper_faces)]}
  assert all(abs(area-contact_area)<1e-10 for area in measured_areas.values()),(bay,measured_areas)
  proposed_id=f'carrier/proposed-blocking/main-parapet-0/bay-{bay:02d}';assert proposed_id not in by
  parent_binding=lower['renderBindings'][0];child_binding=upper['renderBindings'][0]
  instance={'id':proposed_id,'geometryTemplate':'unit-fitting-box','role':'timber-fitting','physicalMaterial':'timber','fuelClass':'frame','matrix':matrix,'bounds':bbox,'dimensionsMetres':[width,height,depth],'volumeMetresCubed':facts['volume'],'fuelAmount':round(facts['volume']/.12,6),'fuelQuantityBasis':'Own closed solid volume / .12; one canonical finite account, no finish or duplicate face fuel.','nativeBay':{'xMin':32+bay,'xMax':33+bay,'pitchMetres':1},'appearanceMaterialId':parent_binding['appearanceMaterialId'],'groundAnchor':False,'productionRegistered':False}
  instances.append(instance);total_volume+=facts['volume']
  for location,host,y,binding in [('bottom',lower['id'],bottom,parent_binding),('top',upper['id'],top,child_binding)]:
   bounds={'min':[x-width/2,y,z-depth/2],'max':[x+width/2,y,z+depth/2]}
   contacts.append({'blockCarrierId':proposed_id,'hostCarrierId':host,'blockFace':location,'kind':'modeled-horizontal-bearing-face','childCarrierId':proposed_id if location=='bottom' else upper['id'],'parentCarrierId':lower['id'] if location=='bottom' else proposed_id,'direction':'parent-to-child','geometryFrame':'emitted-world','actualContactBounds':bounds,'contactAreaMetresSquared':measured_areas['lower' if location=='bottom' else 'upper'],'gapMetres':0,'witnessPoint':[x,y,z],'hostGeometryRef':{k:binding.get(k) for k in ['partId','sourcePartId','geometryId','geometryPath','matrix','sourceRange']},'hostGeometrySha256':sha(ROOT/binding['geometryPath']),'upperLocalBaySelector':{'min':[32+bay,top,25.875],'max':[33+bay,upper['physicalBounds']['max'][1],26.125]} if location=='top' else None,'groundAnchor':False,'wholeCarrierRetirement':False})
  vertices={tuple(p) for t in ts for p in t}
  for cid,roof_ts,planes in roofs:
   rv={tuple(p) for t in roof_ts for p in t};separation=0
   for n,d in planes:
    pa=[M.dot(v,n) for v in vertices];pb=[M.dot(v,n) for v in rv];separation=max(separation,min(pa)-max(pb),min(pb)-max(pa))
   assert separation>1e-7,(proposed_id,cid,'roof separation not established')
   clearances.append({'blockCarrierId':proposed_id,'roofCarrierId':cid,'separatingProjectionGapLowerBoundMetres':separation,'meaning':'A true separating unit projection proves disjoint solids; not an exact distance.'})
 assert len(instances)==48 and len(contacts)==96 and len(clearances)==144
 total_fuel=round(total_volume/.12,6);assert total_fuel==2.1504 and round(sum(c['fuelAmount'] for c in instances),6)==total_fuel
 changed=['assets/art/place-scenes','assets/art/shared-map-fire-bindings','assets/art/shared-map-derived-geometry','assets/art/exposition-new-york','assets/art/exposition-new-york-tile','assets/art/exploration-access','vendor','art/source/exploration-access','art/source/shared-map-fire-bindings/completion-v1','workbenches/art/check-exposition-new-york-tile.mjs','workbenches/art/check-exploration-access.mjs']
 assert subprocess.run(['git','diff','--quiet','90c226f674d51a2d030fcdd4679e61a3bdd9ebfe','--',*changed],cwd=ROOT).returncode==0
 report={'version':1,'status':'UNAPPROVED_MODELED_SUPPORT_PROPOSAL','scope':'One bounded design: a reusable 160 mm square timber block at each of the 48 native one-metre bays under main-parapet-0/base. No production additions or support overrides are applied.','authorityForProposalOnly':{'commit':'01da2407d22dcb9dbfb607a7559ed8c56c379ba5','path':'docs/milestones/29-shared-gameplay-maps.md','geometryImplementationApproved':False},'existingBindings':{'path':BASE,'sha256':BASE_SHA},'existingUpperCarrierId':upper['id'],'existingRootedLowerCarrierId':lower['id'],'existingExplicitGroundPath':ground_path,'existingExplicitGroundPathEvidence':path_evidence,'originalExistingGroundContact':{'carrierId':ground_path[-1],'anchors':roots},'geometryTemplate':mesh,'appearance':{'reuseAppearanceMaterialId':lower['renderBindings'][0]['appearanceMaterialId'],'sourceCarrierId':lower['id'],'uvPolicy':'Each new face uv/grossUV is in physical metres at one UV unit per metre; dimensions are applied to UVs as well as the new primitive. Original meshes and all original UVs remain unchanged.','additionalFinishFuel':0,'historicalClaim':'Proposed engineering/gameplay timber blocking, not a newly established historical construction detail.'},'proposedInstances':instances,'modeledContactEvidence':contacts,'roofSeparationEvidence':clearances,'proposedFiniteLedger':{'fuelClass':'frame','unit':'prototype-fuel-unit','newCanonicalOwners':48,'volumeMetresCubed':total_volume,'formula':'sum of own closed volumes / .12','addedFuelIfApproved':total_fuel,'existingActualTotalUnchanged':base['finiteLedger']['total'],'hypotheticalTotalOnlyIfApproved':round(base['finiteLedger']['total']+total_fuel,6),'newCoatingFuel':0},'retirementAndOwnership':{'eachBlockOwnsItsGeometryAndFiniteFuel':True,'sourceCorniceLoss':'The corresponding actual local cornice patch removes that block bottom bearing. Shared existing support/fall/debris rules own its later behavior.','blockLoss':'Removes only that bay direct vertical bearing from the actual parapet patch. Remaining real geometry/neighbor connections are evaluated by the shared kernel.','localUpperSpanMetres':1,'wholeParapetRetirement':False,'wholeCorniceRetirement':False,'extraCrossBayBraces':0,'newGroundAnchors':0,'noSourceOffsetReapplication':True,'noCanonicalWholeBeamRigidity':True},'integrationBoundary':'This study stays under art/source. The accepted ten-fixture override has no reference to these proposed IDs, geometry or quantities. Architect approval plus later source/runtime ownership and parent-loss checks are required before addition.','productionAdditions':0,'appliedSupportLinks':0,'rendererStarted':False,'producerSha256':sha(Path(__file__))}
 checks={'version':1,'result':'PASS','scope':'Geometry/quantity study only; not runtime or visual acceptance.','blockCount':48,'trianglesPerBlock':12,'totalProposedTriangles':576,'closedPositiveVolumeSolids':48,'orientedManifoldSolidControls':48,'outwardTriangleNormalControls':576,'newPrimitiveUVMetreEdgeControls':uv_edge_controls,'actualHorizontalFaceContacts':96,'contactAreaPerFaceMetresSquared':.0256,'exactHostPlaneGapsMetres':0,'roofSeparationControls':144,'minimumProvenRoofSeparationLowerBoundMetres':min(c['separatingProjectionGapLowerBoundMetres'] for c in clearances),'existingExplicitGroundPathSteps':len(ground_path)-1,'newCanonicalFuelAccountsIfApproved':48,'addedFuelIfApproved':total_fuel,'existingBindingsUnchanged':True,'sourceDimensionsAndUvsUnchanged':True,'productionAdditions':0,'rendererStarted':False,'producerSha256':sha(Path(__file__))}
 return report,checks
if __name__=='__main__':
 parser=argparse.ArgumentParser(description=__doc__);parser.add_argument('--check',action='store_true');args=parser.parse_args();report,checks=build()
 for path,data in [(OUTPUT,report),(CHECKS,checks)]:
  text=json.dumps(data,indent=2,sort_keys=True)+'\n'
  if args.check:assert path.read_text(encoding='utf-8')==text,path
  else:path.write_text(text,encoding='utf-8',newline='\n')
 print(json.dumps({**checks,'proposalSha256':sha(OUTPUT),'proposalBytes':OUTPUT.stat().st_size},sort_keys=True))
