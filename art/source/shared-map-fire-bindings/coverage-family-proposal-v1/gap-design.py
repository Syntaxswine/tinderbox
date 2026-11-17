"""Separate, unapplied proposal for the eleven remaining measured parapet gaps."""
from pathlib import Path
import argparse,collections,copy,hashlib,importlib.util,json,math,sys
sys.dont_write_bytecode=True
HERE=Path(__file__).resolve().parent;ROOT=HERE.parents[3]
def mod(name,file):
 s=importlib.util.spec_from_file_location(name,HERE/file);m=importlib.util.module_from_spec(s);s.loader.exec_module(m);return m
I=mod('gap_inputs','inputs.py');C=mod('gap_geometry','geometry.py')
def encode(value):return json.dumps(value,indent=2,sort_keys=True)+'\n'
def build():
 a=I.load();by=copy.deepcopy(a['by']);g=C.Geometry(by);prototype=a['blocks']['members'][0];geo=a['blocks']['geometry'];rows=[];obstructions=[];source_bindings={}
 original=list(by.values())
 for n in range(1,12):
  child=f'carrier/main-parapet-{n}/base';parent=f'carrier/edge-{n}/cornice-7';cb=by[child]['physicalBounds'];pb=by[parent]['physicalBounds'];axis=max((0,2),key=lambda k:cb['max'][k]-cb['min'][k]);cross=2 if axis==0 else 0;length=cb['max'][axis]-cb['min'][axis];count=round(length)
  assert abs(count-length)<C.NATIVE
  candidates=[]
  for bay in range(count):
   cid=f'proposal-only/blocking/main-parapet-{n}/bay-{bay:02d}';matrix=list(prototype['matrix']);matrix[12+axis]=cb['min'][axis]+bay+.5;matrix[12+cross]=(cb['min'][cross]+cb['max'][cross])/2
   binding={'partId':cid,'sourcePartId':cid,'geometryId':geo['id'],'geometryPath':geo['path'],'matrix':matrix,'sourceRange':None,'physicalContribution':'carrier-solid'}
   triangles=C.G.triangles(json.loads((ROOT/geo['path']).read_text()),matrix);bb=C.G.bounds(triangles)
   by[cid]={'id':cid,'physicalBounds':bb,'role':'timber-fitting','renderBindings':[binding]}
   lower=g.face(cid,parent,require_bearing=True);upper=g.face(child,cid,require_bearing=True)
   assert lower and upper and abs(lower['actualFaceAreaMetresSquared']-.0256)<1e-10 and abs(upper['actualFaceAreaMetresSquared']-.0256)<1e-10
   collisions=[]
   for c in original:
    if c['id'] in {child,parent} or not C.overlaps(bb,c['physicalBounds']):continue
    proof=g.volume(cid,c['id'],roi=bb)
    if proof:
     collision={'originalCarrierId':c['id'],'role':c['role'],'actualCommonInterior':proof}
     if c['role']=='roof-covering':
      footprint={'min':[bb['min'][0],c['physicalBounds']['min'][1],bb['min'][2]],'max':[bb['max'][0],c['physicalBounds']['max'][1],bb['max'][2]]};patches=[]
      for number,t in enumerate(g.shape(c['id'])['triangles']):
       normal=C.G.cross(C.G.sub(t[1],t[0]),C.G.sub(t[2],t[0]))
       if normal[1]<=1e-10:continue
       polygon=C.clip3(t,footprint)
       if C.polygon3_area(polygon)>1e-10:patches.append({'sourceTriangle':number,'actualClippedUpwardSurfacePolygon':polygon})
      assert patches
      heights=[v[1] for patch in patches for v in patch['actualClippedUpwardSurfacePolygon']]
      collision['separateRoofSaddleAlternative']={'proposalOnly':True,'sourceUpperRoofPatches':patches,'roofSurfaceYRangeMetres':[min(heights),max(heights)],'minimumRemainingPadHeightMetres':cb['min'][1]-max(heights),'design':'Trim the proposed lower block face to these actual upward roof facets. This needs a separately authored closed roof-saddle profile, source contact/UV/finite-stock validation and approval. Do not bury the full rectangular repeat in the existing roof.','newGeometryAuthored':False}
     collisions.append(collision)
   if collisions:obstructions.append({'candidateId':cid,'collisions':collisions})
   interval=[cb['min'][axis]+bay,cb['min'][axis]+bay+1]
   candidates.append({'proposalId':cid,'axis':'x' if axis==0 else 'z','bayIntervalMetres':interval,'matrix':matrix,'bounds':bb,'lowerSourceCarrierId':parent,'upperSourceCarrierId':child,'actualLowerNativeBearing':lower,'actualUpperNativeBearing':upper,'additionalSourceSolidIntersections':collisions,'designDisposition':'needs-separate-roof-saddle-profile' if collisions else 'clear-rectangular-repeat-proposal','rectangularRepeatReadyForApproval':not collisions,'accepted':False,'applied':False,'newAnchor':False,'newFuelAssigned':False})
  source_bindings[child]=g.shape(child)['refs'];source_bindings[parent]=g.shape(parent)['refs']
  rows.append({'parapet':n,'upperSourceCarrierId':child,'lowerSourceCarrierId':parent,'verticalSeparationMetres':cb['min'][1]-pb['max'][1],'actualYSeparatingPlaneProof':{'sourceUpperMaximumY':pb['max'][1],'sourceLowerMinimumY':cb['min'][1],'strictlyPositiveSeparation':cb['min'][1]>pb['max'][1]},'nativeBayPitchMetres':1,'candidateCount':count,'candidates':candidates})
 total=sum(r['candidateCount'] for r in rows)
 result={'version':1,'status':'SEPARATE_UNAPPROVED_NEW_GEOMETRY_DESIGN','authority':'Read-only family follow-up; these instances and joins are not asset additions or accepted mounts.','originalSourceBindingsSha256':I.BASE_SHA,'existingApprovedFront48Excluded':True,'existingApprovedPrototype':{'artistCommit':'88538bb687e06911d63f728a17bd8668448805fe','manifestPath':I.BLOCKS,'sha256':I.BLOCKS_SHA,'sharedGeometry':geo,'prototypeMemberId':prototype['id'],'dimensionsMetres':[prototype['matrix'][0],prototype['matrix'][5],prototype['matrix'][10]],'scaleUnchanged':True},'designChoice':'Repeat the approved compact timber block on each original 1 m bay, meeting the true cornice top and base underside within unchanged native source precision. Preserve all existing railing dimensions and original roof/wall pieces.','families':rows,'originalGeometryBindings':source_bindings,'summary':{'remainingParapetBases':11,'tentativeMembers':total,'tentativeDirectedJoins':2*total,'clearRectangularRepeatCandidates':total-len(obstructions),'sourceSolidCollisionCandidates':len(obstructions),'separateRoofSaddleProfilesRequired':len(obstructions),'newGeometryApplied':0,'newFuelApplied':0,'newAnchors':0,'rendererStarted':False},'ifSeparatelyApprovedAccountingEstimate':{'notAssigned':True,'unit':'prototype-fuel-unit','class':'frame','perMemberSameAsApprovedPrototype':prototype['fuelAmount'],'untrimmedAll116UpperEstimate':round(total*prototype['fuelAmount'],6),'clear96RectangularRepeatEstimate':round((total-len(obstructions))*prototype['fuelAmount'],6),'roofSaddleStockRequiresActualAcceptedGeometry':True,'oneAccountPerActualSolid':True,'noFinish':True,'staticInitialAccountingBeforeActivation':True},'explicitReviewRequired':['Approve or reject the repetition for these eleven named bases, separately from original-geometry joins.','Any actual solid collision must be resolved by a bounded design before authoring.','Export and independently check accepted instances, UVs, finite stock and all lower/upper contacts.','Coder must preserve cold/active accounting and local child loss; this proposal does not pass runtime or rendered acceptance.'],'obstructions':obstructions,'producer':{'path':Path(__file__).relative_to(ROOT).as_posix(),'sha256':hashlib.sha256(Path(__file__).read_bytes()).hexdigest()}}
 assert total==116
 return result
if __name__=='__main__':
 parser=argparse.ArgumentParser(description=__doc__);parser.add_argument('--record',action='store_true');parser.add_argument('--check',action='store_true');args=parser.parse_args();assert not(args.record and args.check)
 report=build();data=encode(report);file=HERE/'separate-parapet-gap-design.json'
 if args.record:file.write_text(data,encoding='utf-8',newline='\n')
 if args.check:assert file.read_bytes()==data.encode()
 print(json.dumps({'status':report['status'],**report['summary'],'accountingEstimate':report['ifSeparatelyApprovedAccountingEstimate'],'obstructionIds':[c['candidateId'] for c in report['obstructions']]},sort_keys=True))
