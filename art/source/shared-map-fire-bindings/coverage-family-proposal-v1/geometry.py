"""Read-only exact-source contact certificates for bounded local selectors."""
from pathlib import Path
import collections,hashlib,importlib.util,json,math,sys
sys.dont_write_bytecode=True
HERE=Path(__file__).resolve().parent;ROOT=HERE.parents[3]
def module(name,path):
 s=importlib.util.spec_from_file_location(name,ROOT/path);m=importlib.util.module_from_spec(s);s.loader.exec_module(m);return m
G=module('accepted_binding_math','art/source/shared-map-fire-bindings/export.py');P=module('accepted_intersection_math','art/source/shared-map-fire-bindings/propose-new-york-coverage.py');R=module('review_distance_math','art/source/shared-map-fire-bindings/reachability-review-v1/review.py')
INTERIOR=2e-5;NATIVE=1e-5

def intersection(*boxes):
 result={'min':[max(b['min'][k] for b in boxes) for k in range(3)],'max':[min(b['max'][k] for b in boxes) for k in range(3)]}
 return result if all(result['max'][k]>=result['min'][k]-1e-12 for k in range(3)) else None
def overlaps(a,b,tolerance=0):return all(min(a['max'][k],b['max'][k])>=max(a['min'][k],b['min'][k])-tolerance for k in range(3))
def centre(box):return [(box['min'][k]+box['max'][k])/2 for k in range(3)]
def clip3(poly,box):
 for axis in range(3):
  for sign,boundary in [(1,box['min'][axis]),(-1,box['max'][axis])]:
   before=poly;poly=[]
   if not before:return []
   for a,b in zip(before,before[1:]+before[:1]):
    da,db=sign*(a[axis]-boundary),sign*(b[axis]-boundary);ia,ib=da>=-1e-10,db>=-1e-10
    if ia:poly.append(a)
    if ia!=ib:
     t=da/(da-db);poly.append([a[k]+t*(b[k]-a[k]) for k in range(3)])
 return poly
def polygon3_area(poly):return sum(math.sqrt(G.dot(n,n))/2 for n in [G.cross(G.sub(poly[i],poly[0]),G.sub(poly[i+1],poly[0])) for i in range(1,len(poly)-1)]) if len(poly)>2 else 0

def clip2(a,b):
 orient=sum(x[0]*y[1]-x[1]*y[0] for x,y in zip(b,b[1:]+b[:1]));poly=a
 for x,y in zip(b,b[1:]+b[:1]):
  poly=G.clip_linear(poly,lambda p:((y[0]-x[0])*(p[1]-x[1])-(y[1]-x[1])*(p[0]-x[0]))*(1 if orient>0 else -1))
 return poly

class Geometry:
 def __init__(self,by):self.by=by;self.geometries={};self.shapes={};self.proofs={};self.membership={}
 def shape(self,cid):
  if cid in self.shapes:return self.shapes[cid]
  c=self.by[cid];ts=[];refs=[]
  for b in c['renderBindings']:
   if b['physicalContribution']!='carrier-solid':continue
   path=b['geometryPath']
   if path not in self.geometries:self.geometries[path]=json.loads((ROOT/path).read_text(encoding='utf-8'))
   refs.append({**{k:b.get(k) for k in ['partId','sourcePartId','geometryId','geometryPath','matrix','sourceRange']},'sha256':hashlib.sha256((ROOT/path).read_bytes()).hexdigest()})
   ts+=G.triangles(self.geometries[path],b['matrix'],b.get('sourceRange'))
  facts=G.measures(ts);vertices=sorted({tuple(p) for t in ts for p in t});planes=P.convex_planes(ts)
  result={'id':cid,'triangles':ts,'vertices':vertices,'bounds':c['physicalBounds'],'closed':facts['closed'],'volume':facts['volume'],'planes':planes,'refs':refs,'faces':G.face_triangles(ts,c['physicalBounds'])};self.shapes[cid]=result;return result
 def inside(self,shape,p):
  if not shape['closed'] or shape['volume']<=0:return None
  if shape['planes'] is not None:
   margin=min(d-G.dot(n,p) for n,d in shape['planes'])
   return {'method':'actual-closed-convex-halfspaces','minimumInteriorMarginMetres':margin} if margin>INTERIOR else None
  total=0
  for t in shape['triangles']:
   a,b,c=[G.sub(v,p) for v in t];la,lb,lc=[math.sqrt(G.dot(v,v)) for v in (a,b,c)]
   if min(la,lb,lc)<INTERIOR:return None
   numerator=G.dot(a,G.cross(b,c));denominator=la*lb*lc+G.dot(a,b)*lc+G.dot(b,c)*la+G.dot(c,a)*lb
   total+=2*math.atan2(numerator,denominator)
  if abs(abs(total)-4*math.pi)>1e-4:return None
  distance=min(math.dist(p,R.closest_point(p,t)) for t in shape['triangles'])
  return {'method':'actual-closed-triangle-solid-angle-winding','windingAbsoluteTurns':abs(total)/(4*math.pi),'minimumSurfaceDistanceMetres':distance} if distance>INTERIOR else None
 def volume(self,child,parent,roi=None):
  a,b=self.shape(child),self.shape(parent);box=intersection(a['bounds'],b['bounds'],*([roi] if roi else []))
  if box is None or any(box['max'][k]-box['min'][k]<=2*INTERIOR for k in range(3)):return None
  def witness(method,p,origin):
   if any(p[k]<=box['min'][k]+INTERIOR or p[k]>=box['max'][k]-INTERIOR for k in range(3)):return None
   left=self.inside(a,p)
   if not left:return None
   right=self.inside(b,p)
   if right:return {'kind':'actual-common-strict-solid-interior','worldWitness':p,'witnessConstruction':method,'sourceFace':origin,'childMembership':left,'parentMembership':right,'localOverlapBounds':box,'groundAnchor':False}
   return None
  result=witness('local-overlap-centre',centre(box),None)
  if result:return result
  for source in (a,b):
   for i,t in enumerate(source['triangles']):
    if not overlaps(G.bounds([t]),box):continue
    poly=clip3(t,box)
    if polygon3_area(poly)<1e-10:continue
    p=[sum(v[k] for v in poly)/len(poly) for k in range(3)];n=P.norm(G.cross(G.sub(t[1],t[0]),G.sub(t[2],t[0])))
    if n is None:continue
    result=witness('actual-clipped-source-face-stepped-inward',[p[k]-n[k]*.0001 for k in range(3)],{'sourceCarrierId':source['id'],'sourceTriangle':i,'actualSurfacePoint':p})
    if result:return result
  return None
 def face(self,child,parent,roi=None,require_bearing=False):
  a,b=self.shape(child),self.shape(parent);best=None
  for axis in ([1] if require_bearing else range(3)):
   remaining=[k for k in range(3) if k!=axis]
   for child_side,parent_side in ([('min','max')] if require_bearing else [('min','max'),('max','min')]):
    ca,pb=a['bounds'][child_side][axis],b['bounds'][parent_side][axis]
    if abs(ca-pb)>NATIVE:continue
    if roi and any(v<roi['min'][axis]-NATIVE or v>roi['max'][axis]+NATIVE for v in (ca,pb)):continue
    area=0;witness=None
    for ta in a['faces'].get((axis,child_side),[]):
     for tb in b['faces'].get((axis,parent_side),[]):
      poly=clip2(ta,tb)
      if roi:
       for j,k in enumerate(remaining):
        poly=G.clip_linear(poly,lambda p,j=j,k=k:p[j]-roi['min'][k]);poly=G.clip_linear(poly,lambda p,j=j,k=k:roi['max'][k]-p[j])
      measure=G.polygon_area(poly) if len(poly)>2 else 0
      if measure>1e-10 and witness is None:
       point=[sum(v[j] for v in poly)/len(poly) for j in range(2)];left=[0.,0.,0.];right=[0.,0.,0.];left[axis]=ca;right[axis]=pb
       for j,k in enumerate(remaining):left[k]=right[k]=point[j]
       witness=[left,right]
      area+=measure
    if area>1e-6 and (best is None or area>best['actualFaceAreaMetresSquared']):best={'kind':'actual-coplanar-source-face-area','axis':axis,'childFace':child_side,'parentFace':parent_side,'actualFaceAreaMetresSquared':area,'actualSurfaceWitness':witness,'witnessSeparationMetres':math.dist(*witness),'nativePrecisionToleranceMetres':NATIVE,'geometricHorizontalBearing':axis==1 and child_side=='min' and parent_side=='max','groundAnchor':False}
  return best
 def nearest_witness(self,child,parent,roi=None):
  a,b=self.shape(child),self.shape(parent);minimum=float('inf');witness=None
  for first,second,reverse in [(a,b,False),(b,a,True)]:
   candidates=first['vertices']
   if roi:candidates=[p for p in candidates if all(roi['min'][k]-NATIVE<=p[k]<=roi['max'][k]+NATIVE for k in range(3))]
   for p in candidates:
    for t in second['triangles']:
     q=R.closest_point(p,t)
     if roi and any(q[k]<roi['min'][k]-NATIVE or q[k]>roi['max'][k]+NATIVE for k in range(3)):continue
     distance=math.dist(p,q)
     if distance<minimum:minimum=distance;witness=[list(q),list(p)] if reverse else [list(p),list(q)]
  return {'vertexToTriangleUpperBoundMetres':minimum,'actualSurfaceWitness':witness,'meaning':'Actual point-pair upper bound only, not a minimum-distance proof.'} if witness else None
 def certificate(self,child,parent,roi=None,allow_fastening=False,structural_seam=False):
  key=(child,parent,tuple(roi['min']+roi['max']) if roi else None,allow_fastening,structural_seam)
  if key in self.proofs:return self.proofs[key]
  if not overlaps(self.by[child]['physicalBounds'],self.by[parent]['physicalBounds'],NATIVE):self.proofs[key]=None;return None
  volume=self.volume(child,parent,roi)
  if volume:result={'proposedKind':'fixed-embed','geometricBearing':False,'proof':volume}
  else:
   face=self.face(child,parent,roi,require_bearing=True)
   if face:result={'proposedKind':'bearing-face','geometricBearing':True,'proof':face}
   elif allow_fastening:
    face=self.face(child,parent,roi,require_bearing=False)
    result={'proposedKind':'carpentry-butt-joint','geometricBearing':False,'proof':face,'fasteningMeaning':'Explicit prototype timber carpentry at the measured contact; physical touch alone does not determine load/dependency direction.'} if face else None
   else:result=None
   if result is None and structural_seam:
    witness=self.nearest_witness(child,parent,roi)
    if witness and witness['vertexToTriangleUpperBoundMetres']<=NATIVE:result={'proposedKind':'structural-seam','geometricBearing':False,'proof':witness,'meaning':'Exact named native source-closure seam candidate; fresh unchanged-kernel contact check required.'}
  self.proofs[key]=result;return result
 def occupancy(self,cid,box):
  shape=self.shape(cid);local=intersection(shape['bounds'],box)
  if local is None:return {'occupied':False,'method':'disjoint-actual-source-bounds'}
  def certified(point,method,triangle=None):
   if not all(local['min'][k]+INTERIOR<point[k]<local['max'][k]-INTERIOR for k in range(3)):return None
   membership=self.inside(shape,point)
   return {'occupied':True,'method':method,'worldWitness':point,'actualSolidMembership':membership,'sourceTriangle':triangle} if membership else None
  result=certified(centre(local),'strict-source-solid-interior-in-native-cell')
  if result:return result
  for i,t in enumerate(shape['triangles']):
   if not overlaps(G.bounds([t]),local):continue
   poly=clip3(t,local)
   if polygon3_area(poly)<1e-10:continue
   point=[sum(v[k] for v in poly)/len(poly) for k in range(3)];n=P.norm(G.cross(G.sub(t[1],t[0]),G.sub(t[2],t[0])))
   if n is None:continue
   result=certified([point[k]-n[k]*.0001 for k in range(3)],'actual-clipped-source-face-stepped-into-native-cell',i)
   if result:return result
  # The cell spans the entire source Y interval. A closed solid can occupy a
  # positive-volume part of that column only if its boundary has positive XZ
  # projection there. This is a conservative source-triangle emptiness proof,
  # including mitred ends and the existing curved/portal cuts, not an AABB fill.
  area=0
  for triangle in shape['triangles']:
   poly=[[v[0],v[2]] for v in triangle]
   for j,k in enumerate((0,2)):
    poly=G.clip_linear(poly,lambda v,j=j,k=k:v[j]-box['min'][k])
    poly=G.clip_linear(poly,lambda v,j=j,k=k:box['max'][k]-v[j])
   if len(poly)>2:area+=G.polygon_area(poly)
  return {'occupied':False if area<=1e-9 else None,'method':'actual-source-boundary-projection-over-full-height-column','absoluteProjectedTriangleAreaMetresSquared':area,'areaPrecisionMetresSquared':1e-9,'closedSource':shape['closed'],'sourceVolumeMetresCubed':shape['volume'],'fullSourceHeightIncluded':box['min'][1]<=shape['bounds']['min'][1] and box['max'][1]>=shape['bounds']['max'][1]}
 def occupies(self,cid,box):return self.occupancy(cid,box)['occupied'] is True
