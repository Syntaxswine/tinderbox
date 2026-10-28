"""One-shot CPU render of exported original house meshes. This does not run WebGL."""
from pathlib import Path
import sys, json, os, time, threading, datetime, argparse
ROOT=Path(__file__).resolve().parents[2]
parser=argparse.ArgumentParser(description=__doc__)
parser.add_argument('--deps',type=Path,help='Optional existing Mitsuba/Python dependency folder; read only')
parser.add_argument('--owner',default='Tinderbox offline review')
args=parser.parse_args()
if args.deps:sys.path.insert(0,str(args.deps))
started=time.time()
expiry=threading.Timer(90,lambda:os._exit(124));expiry.daemon=True;expiry.start()
record={'owner':args.owner,'purpose':'Single offline layout render from source meshes','pid':os.getpid(),'executable':sys.executable,'startedAt':datetime.datetime.now(datetime.timezone.utc).isoformat(),'intendedExpirySeconds':90,'stopMethod':'Natural exit after bitmap/receipt; same-process 90 second deadline','port':None,'source':str(Path(__file__))}
try:
 import ctypes
 ctypes.windll.kernel32.GetCurrentProcess.restype=ctypes.c_void_p
 ctypes.windll.kernel32.GetProcessTimes.argtypes=[ctypes.c_void_p]+[ctypes.POINTER(ctypes.c_ulonglong)]*4
 ctypes.windll.kernel32.GetProcessTimes.restype=ctypes.c_bool
 creation,exit_time,kernel,user=(ctypes.c_ulonglong() for _ in range(4))
 if ctypes.windll.kernel32.GetProcessTimes(ctypes.windll.kernel32.GetCurrentProcess(),ctypes.byref(creation),ctypes.byref(exit_time),ctypes.byref(kernel),ctypes.byref(user)):record['creationFiletime']=creation.value
except Exception:pass
out=ROOT/'artifacts/qa/catalogue-layout';(out/'run.json').write_text(json.dumps(record,indent=2)+'\n')
try:
 import mitsuba as mi
 import numpy as np
 from PIL import Image
 mi.set_variant('scalar_rgb')
 data=json.loads((out/'scene.json').read_text())
 camera=data['camera'];cache={}
 def reflectance(material):
  if not material['texture']:return {'type':'rgb','value':material['color']}
  key=(material['texture'],tuple(material['color']))
  if key not in cache:
   srgb=np.asarray(Image.open(material['texture']).convert('RGB'),dtype=np.float32)/255
   linear=np.where(srgb<=.04045,srgb/12.92,((srgb+.055)/1.055)**2.4)
   cache[key]=mi.Bitmap(np.ascontiguousarray(linear*np.array(material['color'],dtype=np.float32)))
  return {'type':'bitmap','bitmap':cache[key],'raw':True,'wrap_mode':'repeat','to_uv':mi.ScalarTransform3f.scale(material['repeat'])}
 scene={'type':'scene','integrator':{'type':'path','max_depth':4},'sensor':{'type':'orthographic','to_world':mi.ScalarTransform4f.look_at(origin=camera['origin'],target=camera['target'],up=[0,1,0]) @ mi.ScalarTransform4f.scale([camera['halfWidth'],camera['halfWidth'],1]),'sampler':{'type':'independent','sample_count':24},'film':{'type':'hdrfilm','width':1280,'height':800,'pixel_format':'rgb','rfilter':{'type':'tent'}}},'ambient':{'type':'constant','radiance':{'type':'rgb','value':[.65,.68,.58]}},'sun':{'type':'directional','direction':[.5,-1,.4],'irradiance':{'type':'rgb','value':[2.9,2.7,2.25]}},'outside-ground':{'type':'rectangle','to_world':mi.ScalarTransform4f.translate([18,-.32,13]) @ mi.ScalarTransform4f.rotate([1,0,0],-90) @ mi.ScalarTransform4f.scale([100,100,100]),'bsdf':{'type':'diffuse','reflectance':{'type':'rgb','value':[.39,.43,.32]}}}}
 for i,m in enumerate(data['materials']):scene['mesh-'+str(i)]={'type':'ply','filename':str(out/m['file']),'face_normals':True,'bsdf':{'type':'twosided','material':{'type':'diffuse','reflectance':reflectance(m)}}}
 image=mi.render(mi.load_dict(scene),spp=24,seed=123)
 target=out/'catalogue-street-offline.png';mi.util.write_bitmap(str(target),image)
 record.update(passed=True,renderer='Mitsuba scalar_rgb',seconds=round(time.time()-started,3),output=str(target),triangles=data['triangles'],limitations=data['limitations'])
 print(json.dumps(record),flush=True)
finally:
 expiry.cancel();record['finishedAt']=datetime.datetime.now(datetime.timezone.utc).isoformat();(out/'run.json').write_text(json.dumps(record,indent=2)+'\n')
