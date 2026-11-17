"""Pinned source readers and exact analytical masks; no factories or runtime."""
from pathlib import Path
from fractions import Fraction as F
import collections,hashlib,importlib.util,itertools,json,math,subprocess,sys
sys.dont_write_bytecode=True
HERE=Path(__file__).resolve().parent;ROOT=HERE.parents[3];BASE=HERE.parent
FROZEN='2b350309d9116812a1d3988af090614bdaefbc25';PARENT='e3b301860fad13855c7d2a8926f81bb1c4aed6be'
def module(name,path):
 s=importlib.util.spec_from_file_location(name,path);m=importlib.util.module_from_spec(s);s.loader.exec_module(m);return m
N=module('previous_eight_source_review',BASE/'remaining-eight-cut-references-v1/review.py')
C=N.T.C;RP=C.P;X=C.X;R=N.T.V.R;G=N.T.G;B=N.B
def load(path):return json.loads(path.read_text(encoding='utf-8'))
def sha(raw):return hashlib.sha256(raw).hexdigest()
def git(path,commit=FROZEN):return subprocess.check_output(['git','show',commit+':'+path],cwd=ROOT)
def fraction(row):return F(int(row['numerator']),int(row['denominator']))
def add(a,b):return tuple(x+y for x,y in zip(a,b))
def sub(a,b):return tuple(x-y for x,y in zip(a,b))
def dot(a,b):return sum(x*y for x,y in zip(a,b))
def cross(a,b):return X.cross(a,b)
def area_vector(poly):return tuple(sum(cross(a,b)[k] for a,b in zip(poly,poly[1:]+poly[:1]))/2 for k in range(3))
def apply(matrix,p):return tuple(sum(F(matrix[4*j+k])*p[j] for j in range(3))+F(matrix[12+k]) for k in range(3))
def inverse(matrix):
 a=tuple(F(matrix[4*j+k]) for k in range(3) for j in range(3));det=X.determinant(a);assert det
 # Columns of cofactors transposed, in row-major form.
 aa,bb,cc,dd,ee,ff,gg,hh,ii=a
 inv=(ee*ii-ff*hh,cc*hh-bb*ii,bb*ff-cc*ee,ff*gg-dd*ii,aa*ii-cc*gg,cc*dd-aa*ff,dd*hh-ee*gg,bb*gg-aa*hh,aa*ee-bb*dd)
 inv=tuple(x/det for x in inv);t=tuple(F(matrix[12+k]) for k in range(3))
 return lambda p:tuple(sum(inv[3*k+j]*(p[j]-t[j]) for j in range(3)) for k in range(3))
def bbox(points):return {'min':tuple(min(p[k] for p in points) for k in range(3)),'max':tuple(max(p[k] for p in points) for k in range(3))}
def overlaps(a,b):return all(a['min'][k]<=b['max'][k] and b['min'][k]<=a['max'][k] for k in range(3))
def corners(box):return itertools.product(*zip(box['min'],box['max']))
def inside2(p,t):
 s=R.cross2(*t);assert s
 q=[R.cross2(a,b,p) for a,b in zip(t,t[1:]+t[:1])]
 return all(v>=0 for v in q) if s>0 else all(v<=0 for v in q)
def clip(poly,axis,lower,upper):
 for sign,c in ((1,lower),(-1,-upper)):
  old=poly;poly=[]
  if not old:break
  for a,b in zip(old,old[1:]+old[:1]):
   da,db=sign*a[axis]-c,sign*b[axis]-c
   if da>=0:poly.append(a)
   if (da>=0)!=(db>=0):
    u=da/(da-db);poly.append(tuple(a[k]+u*(b[k]-a[k]) for k in range(3)))
  poly=R.dedup(poly)
 return poly
def intersection(a,b):
 if not overlaps(bbox(a),bbox(b)):return []
 na,nb=cross(sub(a[1],a[0]),sub(a[2],a[0])),cross(sub(b[1],b[0]),sub(b[2],b[0]))
 if na==(0,0,0) or nb==(0,0,0):return []
 ca,cb=dot(na,a[0]),dot(nb,b[0]);da=[dot(nb,p)-cb for p in a];db=[dot(na,p)-ca for p in b]
 if all(q>0 for q in da) or all(q<0 for q in da) or all(q>0 for q in db) or all(q<0 for q in db):return []
 direction=cross(na,nb)
 if direction==(0,0,0):
  if any(db):return []
  drop=max(range(3),key=lambda k:abs(na[k]));axes=[k for k in range(3) if k!=drop]
  p=R.convex_intersection([tuple(v[k] for k in axes) for v in a],[tuple(v[k] for k in axes) for v in b]);out=[]
  for v in p:
   q=[F(0)]*3
   for j,k in enumerate(axes):q[k]=v[j]
   q[drop]=(ca-sum(na[k]*q[k] for k in axes))/na[drop];out.append(tuple(q))
  return out
 sa,sb=R.plane_slice(a,nb,cb),R.plane_slice(b,na,ca)
 if not sa or not sb:return []
 axis=max(range(3),key=lambda k:abs(direction[k]));lo=max(min(p[axis] for p in sa),min(p[axis] for p in sb));hi=min(max(p[axis] for p in sa),max(p[axis] for p in sb))
 return [] if hi<lo else [next(p for p in sa+sb if p[axis]==v) for v in sorted({lo,hi})]
class BVH:
 def __init__(self,triangles,ids=None):
  self.triangles=triangles;ids=list(range(len(triangles))) if ids is None else ids
  self.box=bbox([p for i in ids for p in triangles[i]]);self.ids=None;self.children=[]
  if len(ids)<=8:self.ids=ids
  else:
   axis=max(range(3),key=lambda k:self.box['max'][k]-self.box['min'][k]);ids.sort(key=lambda i:sum(p[axis] for p in triangles[i]));middle=len(ids)//2
   self.children=[BVH(triangles,ids[:middle]),BVH(triangles,ids[middle:])]
 def query(self,box):
  if not overlaps(self.box,box):return []
  if self.ids is not None:return [i for i in self.ids if overlaps(bbox(self.triangles[i]),box)]
  return [i for child in self.children for i in child.query(box)]
class Sources:
 def __init__(self):
  self.indexes={};self.sections={};self.parts={};self.geometries={};self.world={};self.pins={};self.tree={};self.missing=[]
  self.geometry_pins={p['path']:p for p in load(BASE/'remaining-geometry-readiness-v1/geometry-pins.json')['files']}
 def index(self,place):
  if place not in self.indexes:
   prefix='assets/art/place-scenes/'+place
   raw=(ROOT/(prefix+'/index.json')).read_bytes();assert raw==git(prefix+'/index.json')
   self.indexes[place]=json.loads(raw);self.pins[prefix+'/index.json']={'path':prefix+'/index.json','bytes':len(raw),'sha256':sha(raw)}
   self.tree[place]={}
   for entry in subprocess.check_output(['git','ls-tree','-r','-z',FROZEN,'--',prefix],cwd=ROOT).split(b'\0'):
    if entry:
     meta,path=entry.split(b'\t');self.tree[place][path.decode()]=meta.split()[2].decode()
  return self.indexes[place]
 def section(self,place,sid):
  key=place,sid
  if key not in self.sections:
   index=self.index(place);chunk=next(c for c in index['chunks'] if c['id']==sid);path='assets/art/place-scenes/'+place+'/'+chunk['url'];raw=(ROOT/path).read_bytes()
   assert hashlib.sha1(b'blob '+str(len(raw)).encode()+b'\0'+raw).hexdigest()==self.tree[place][path]
   self.pins[path]={'path':path,'bytes':len(raw),'sha256':sha(raw),'gitBlobSha1':self.tree[place][path]}
   parts=json.loads(raw)['parts'];self.sections[key]=parts
   for p in parts:
    for draw in p.get('sourceRanges') or [{'id':p['id']}]:
     rid=draw['id'];geompath='assets/art/place-scenes/'+place+'/'+index['geometries'][p['geometry']]
     self.parts[place,rid]={'placeId':place,'sourceId':rid,'renderId':p['id'],'sectionId':sid,'geometryId':p['geometry'],'geometryPath':geompath,'geometrySha256':self.geometry_pins[geompath]['sha256'],'sourceRange':{k:draw[k] for k in ('start','count')} if 'start' in draw else None,'matrix':p['matrix'],'openMatrix':p.get('openMatrix'),'role':p.get('role'),'floorId':p.get('floorId'),'bounds':p['bounds']}
  return self.sections[key]
 def ref(self,ref):
  self.section(ref['placeId'],ref['sectionId']);r=self.parts[ref['placeId'],ref['sourceId']]
  for key in ('renderId','geometryPath','geometrySha256','sourceRange'):
   assert r[key]==ref[key],(ref['sourceId'],key)
  self.geometry(r);return r
 def geometry(self,row):
  path=row['geometryPath']
  if path not in self.geometries:
   raw=(ROOT/path).read_bytes();assert sha(raw)==row['geometrySha256'];self.index(row['placeId']);assert hashlib.sha1(b'blob '+str(len(raw)).encode()+b'\0'+raw).hexdigest()==self.tree[row['placeId']][path]
   self.geometries[path]=json.loads(raw);self.pins[path]={'path':path,'bytes':len(raw),'sha256':sha(raw),'sourceContext':FROZEN}
  return self.geometries[path]
 def local_triangles(self,row):
  g=self.geometry(row);p=RP.vertices(g);idx=g['index']['array'] if isinstance(g.get('index'),dict) else list(range(len(p)))
  sr=row.get('sourceRange');start=sr['start'] if sr else 0;count=sr['count'] if sr else len(idx);assert start%3==count%3==0
  return [tuple(p[idx[i+j]] for j in range(3)) for i in range(start,start+count,3)],start
 def triangles(self,row):
  key=(row['placeId'],row['sourceId'])
  if key not in self.world:
   ts,start=self.local_triangles(row);self.world[key]=([tuple(apply(row['matrix'],p) for p in t) for t in ts],start)
  return self.world[key]
 def seek(self,place,ids,windows):
  self.index(place);wanted=set(ids)
  for chunk in self.indexes[place]['chunks']:
   if any(all(chunk['bounds']['min'][k]<=w['max'][k]+4 and chunk['bounds']['max'][k]>=w['min'][k]-4 for k in range(3)) for w in windows):self.section(place,chunk['id'])
  missing=wanted-{sid for p,sid in self.parts if p==place}
  self.missing.extend({'placeId':place,'sourceId':sid,'reason':'not found in bounded original descriptor search; no substitute parent'} for sid in sorted(missing))
  return [self.parts[place,sid] for sid in sorted(wanted-missing)]
 def actual_bounds(self,row):return bbox([p for t in self.triangles(row)[0] for p in t])
 def point_clearance(self,child,parent):
  a,astart=self.triangles(child);b,bstart=self.triangles(parent);low=min(p[1] for t in a for p in t);points=sorted({p for t in a for p in t if p[1]==low});matches=[]
  for p in points:
   for i,t in enumerate(b):
    if len({q[1] for q in t})!=1:continue
    n=cross(sub(t[1],t[0]),sub(t[2],t[0]))
    if n[1]<=0:continue
    if inside2((p[0],p[2]),[(q[0],q[2]) for q in t]):
     gap=p[1]-t[0][1];matches.append({'actualChildSourceVertex':p,'parentOriginalTriangleOffset':bstart+3*i,'parentActualHorizontalFaceY':t[0][1],'signedVerticalClearance':gap,'exactZero':gap==0})
  return {'sourceId':parent['sourceId'],'geometryReference':parent,'actualLowestSourceVertexHorizontalFaceWitnesses':matches,'mechanicalJointProved':False,'groundAnchor':False}
 def surface_contact(self,child,parent):
  a,astart=self.triangles(child);b,bstart=self.triangles(parent)
  if not overlaps(bbox([p for t in a for p in t]),bbox([p for t in b for p in t])):return {'kind':'actual-source-coordinate-halfspace-separation','mechanicalJointProved':False,'groundAnchor':False}
  tree=BVH(a)
  for j,t in enumerate(b):
   for i in tree.query(bbox(t)):
    hit=intersection(a[i],t)
    if hit:return {'kind':'exact-original-triangle-surface-intersection','childOriginalTriangleOffset':astart+3*i,'parentOriginalTriangleOffset':bstart+3*j,'actualIntersectionWitness':hit[0],'mechanicalJointProved':False,'groundAnchor':False}
  return {'kind':'no-source-triangle-contact-found','notAMinimumDistanceProof':True,'mechanicalJointProved':False,'groundAnchor':False}
