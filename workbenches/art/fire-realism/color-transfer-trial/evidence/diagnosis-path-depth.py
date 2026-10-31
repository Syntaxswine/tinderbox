from pathlib import Path
import array,sys,json,hashlib,math
rawroot=Path('artifacts/qa/fire-realism/mantaflow-surface-source/stage-2026-10-31-v5');m=json.loads((rawroot/'raw-manifest.json').read_bytes());g=m['samples'][0];o=g['scalarCentreOriginBlender'];h=g['voxelSize'][0]
def data(f,c):
 r=m['samples'][f-1]['channels'][c];b=(rawroot/r['path']).read_bytes();assert hashlib.sha256(b).hexdigest()==r['sha256'];a=array.array('f');a.frombytes(b)
 if sys.byteorder!='little':a.byteswap()
 return a

def smooth(a,b,x):
 t=max(0,min(1,(x-a)/(b-a)));return t*t*(3-2*t)

def tri(a,p):
 q=[(p[k]-o[k])/h for k in range(3)];i=[math.floor(v)for v in q];f=[q[k]-i[k]for k in range(3)];v=0.
 for dz in [0,1]:
  z=i[2]+dz
  if not 0<=z<96:continue
  for dy in [0,1]:
   y=i[1]+dy
   if not 0<=y<48:continue
   for dx in [0,1]:
    x=i[0]+dx
    if 0<=x<48:v+=a[x+48*(y+48*z)]*(f[0]if dx else 1-f[0])*(f[1]if dy else 1-f[1])*(f[2]if dz else 1-f[2])
 return v
for tick,f0 in [(60,30),(120,60)]:
 fields={}
 for c in ['flame','density','temperature']:
  a,b=data(f0,c),data(f0+1,c);fields[c]=[(x+y)*.5 for x,y in zip(a,b)]
 for view in ['oblique','isometric']:
  file=Path('C:/Users/baals/Documents/ChatGPT/tinderbox/artifacts/qa/fire-realism/render-round-21-surface-v5')/f'reference-match-contact-{view}-bright-frame{tick}.json';meta=json.loads(file.read_bytes());mat=meta['camera']['matrixWorld'];back=[mat[8],mat[9],mat[10]];rays=[]
  for gx in [5.2,5.5,5.8]:
   for gz in [8.2,8.5,8.8]:
    tf=ts=0.;step=.005
    for j in range(1000):
     t=(j+.5)*step;p=[gx+back[0]*t,back[1]*t,gz+back[2]*t];scalar=[p[0]-5.5,-(p[2]-8.5),p[1]];F=max(0,tri(fields['flame'],scalar));D=max(0,tri(fields['density'],scalar));T=max(0,tri(fields['temperature'],scalar));edge=min(p[0]-5,6-p[0],p[2]-8,9-p[2]);A=1 if 5<=p[0]<6 and 8<=p[2]<9 else 0;base=A*smooth(0,h,max(0,edge));release=smooth(.2733333358168602,.2733333358168602+2*h,p[1]);react=F*(base*(1-release)+release);tf+=6*react*step;ts+=1.8*D*(1-.82*max(0,min(1,F*max(0,min(1,T/3)))))*step
    rays.append({'floorAnchor':[gx,gz],'tauFlame':tf,'flameOnlyOpacity':1-math.exp(-tf),'tauSmoke':ts})
  print(json.dumps({'tick':tick,'view':view,'scope':'Nine specified floor-anchored camera-parallel paths; CPU-double trilinear quadrature5mm, currentlowerA/taper; no nativeDepth/playerlegibility/GLSLstep/color/LDR equivalence or acceptance','rays':rays},indent=2))
