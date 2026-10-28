"""Finite CPU review of actual row and carried-torch mesh exports; no WebGL recovery."""
from pathlib import Path
import sys,json,time,os,threading,datetime,ctypes
ROOT=Path(__file__).resolve().parents[3]
sys.path.insert(0,str(ROOT/'artifacts/render-deps'))
import mitsuba as mi
import numpy as np
from PIL import Image
mi.set_variant('scalar_rgb')
base=ROOT/'artifacts/row-ignition-renders';out=ROOT/'docs/art/row-ignition/previews';out.mkdir(parents=True,exist_ok=True)
started=time.time();deadline=threading.Timer(120,lambda:os._exit(124));deadline.daemon=True;deadline.start()
record=dict(owner='01a17ea0-1362-7d13-a42d-f4a5fcff8902',task='TB-019',purpose='One finite source-mesh render export',pid=os.getpid(),executable=sys.executable,startedAt=datetime.datetime.now(datetime.timezone.utc).isoformat(),intendedExpirySeconds=120,stopMethod='Natural exit; actual same-process 120-second deadline',port=None)
try:
 ctypes.windll.kernel32.GetCurrentProcess.restype=ctypes.c_void_p
 ctypes.windll.kernel32.GetProcessTimes.argtypes=[ctypes.c_void_p]+[ctypes.POINTER(ctypes.c_ulonglong)]*4
 values=[ctypes.c_ulonglong() for _ in range(4)]
 if ctypes.windll.kernel32.GetProcessTimes(ctypes.windll.kernel32.GetCurrentProcess(),*[ctypes.byref(v) for v in values]):record['creationFiletime']=str(values[0].value)
except Exception:pass
(base/'run.json').write_text(json.dumps(record,indent=2)+'\n',encoding='utf-8')
images=[]
try:
 for item in json.loads((base/'index.json').read_text(encoding='utf-8')):
  directory=Path(item['directory']);data=json.loads((directory/'scene.json').read_text(encoding='utf-8'));camera=data['camera'];cache={}
  scene={'type':'scene','integrator':{'type':'path','max_depth':5},'sensor':{'type':'orthographic','to_world':mi.ScalarTransform4f.look_at(origin=camera['origin'],target=camera['target'],up=[0,1,0])@mi.ScalarTransform4f.scale([camera['halfWidth'],camera['halfWidth'],1]),'sampler':{'type':'independent','sample_count':32},'film':{'type':'hdrfilm','width':1100,'height':800,'pixel_format':'rgb','rfilter':{'type':'tent'}}},'ambient':{'type':'constant','radiance':{'type':'rgb','value':[.65,.68,.58]}},'sun':{'type':'directional','direction':[.5,-1,.4],'irradiance':{'type':'rgb','value':[2.9,2.7,2.25]}},'ground':{'type':'rectangle','to_world':mi.ScalarTransform4f.translate([0,-1.22 if data['name'].startswith('row-') else -.035,0])@mi.ScalarTransform4f.rotate([1,0,0],-90)@mi.ScalarTransform4f.scale([100,100,100]),'bsdf':{'type':'diffuse','reflectance':{'type':'rgb','value':[.39,.43,.32]}}}}
  for i,m in enumerate(data['materials']):
   opacity=None
   if m['texture']:
    rgba=np.asarray(Image.open(m['texture']).convert('RGBA'),dtype=np.float32)/255
    rgb=rgba[:,:,:3];linear=np.where(rgb<=.04045,rgb/12.92,((rgb+.055)/1.055)**2.4)*np.asarray(m['color'],dtype=np.float32)
    transform=mi.ScalarTransform3f.translate(m['offset'])@mi.ScalarTransform3f.scale(m['repeat'])
    reflectance={'type':'bitmap','bitmap':mi.Bitmap(np.ascontiguousarray(linear)),'raw':True,'wrap_mode':'repeat','to_uv':transform}
    if m['alpha']:opacity={'type':'bitmap','bitmap':mi.Bitmap(np.ascontiguousarray(rgba[:,:,3])),'raw':True,'wrap_mode':'repeat','to_uv':transform}
   else:reflectance={'type':'rgb','value':m['color']}
   bsdf={'type':'twosided','material':{'type':'diffuse','reflectance':reflectance}}
   if opacity is not None:bsdf={'type':'mask','opacity':opacity,'nested':bsdf}
   scene['mesh-'+str(i)]={'type':'ply','filename':str(directory/m['file']),'face_normals':True,'bsdf':bsdf}
  rendered=mi.render(mi.load_dict(scene),spp=32,seed=79);target=directory/(data['name']+'.png');mi.util.write_bitmap(str(target),rendered,write_async=False)
  with Image.open(target) as image:image.convert('RGB').save(out/(data['name']+'.jpg'),quality=94,subsampling=0,optimize=True)
  images.append(dict(name=data['name'],path='docs/art/row-ignition/previews/'+data['name']+'.jpg',width=1100,height=800,samplesPerPixel=32,triangles=data['triangles'],limitations=data['limitations']))
  print(data['name']+' rendered',flush=True)
 record.update(passed=True,seconds=round(time.time()-started,3),images=len(images))
 (out.parent/'offline-review.json').write_text(json.dumps(dict(passed=False,renderer='Mitsuba 3.9.1 scalar_rgb',images=images,visualReview='Pending image inspection',limits='CPU geometry proofs; real browser acceptance remains architect-owned.'),indent=2)+'\n',encoding='utf-8')
finally:
 deadline.cancel();record['finishedAt']=datetime.datetime.now(datetime.timezone.utc).isoformat();(base/'run.json').write_text(json.dumps(record,indent=2)+'\n',encoding='utf-8')
