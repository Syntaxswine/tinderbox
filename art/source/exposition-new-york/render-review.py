"""Finite, task-owned CPU review of exported actual-model meshes."""
from pathlib import Path
import sys,json,time,os,threading,datetime,ctypes,argparse
ROOT=Path(__file__).resolve().parents[3]
sys.path.insert(0,str(ROOT/'artifacts/render-deps'))
import mitsuba as mi
import numpy as np
from PIL import Image,ImageDraw,ImageFont
mi.set_variant('scalar_rgb')
args=argparse.ArgumentParser();args.add_argument('--view');args.add_argument('--spp',type=int,default=24);opts=args.parse_args()
base=ROOT/'artifacts/exposition-new-york/renders';out=ROOT/'docs/art/exposition-new-york/previews';out.mkdir(parents=True,exist_ok=True)
started=time.time();deadline=threading.Timer(120,lambda:os._exit(124));deadline.daemon=True;deadline.start()
record=dict(owner='01a17ea0-1362-7d13-a42d-f4a5fcff8902',task='TB-022',purpose='Finite actual-model CPU render',pid=os.getpid(),executable=sys.executable,startedAt=datetime.datetime.now(datetime.timezone.utc).isoformat(),intendedExpirySeconds=120,stopMethod='Natural exit; actual same-process 120-second deadline',port=None,view=opts.view)
ctypes.windll.kernel32.GetCurrentProcess.restype=ctypes.c_void_p
ctypes.windll.kernel32.GetProcessTimes.argtypes=[ctypes.c_void_p]+[ctypes.POINTER(ctypes.c_ulonglong)]*4
values=[ctypes.c_ulonglong() for _ in range(4)]
if ctypes.windll.kernel32.GetProcessTimes(ctypes.windll.kernel32.GetCurrentProcess(),*[ctypes.byref(v) for v in values]):record['creationFiletime']=str(values[0].value)
run=base/('run-'+str(os.getpid())+'.json');run.write_text(json.dumps(record,indent=2)+'\n',encoding='utf-8')
try:
 for item in json.loads((base/'index.json').read_text(encoding='utf-8')):
  if opts.view and item['name']!=opts.view:continue
  directory=Path(item['directory']);data=json.loads((directory/'scene.json').read_text(encoding='utf-8'));camera=data['camera']
  scene={'type':'scene','integrator':{'type':'path','max_depth':4},'sensor':{'type':'orthographic','to_world':mi.ScalarTransform4f.look_at(origin=camera['origin'],target=camera['target'],up=camera.get('up',[0,1,0]))@mi.ScalarTransform4f.scale([camera['halfWidth'],camera['halfWidth'],1]),'sampler':{'type':'independent','sample_count':opts.spp},'film':{'type':'hdrfilm','width':1600,'height':1060,'pixel_format':'rgb','rfilter':{'type':'tent'}}},'ambient':{'type':'constant','radiance':{'type':'rgb','value':[.63,.66,.58]}},'sun':{'type':'directional','direction':[.5,-1,.35],'irradiance':{'type':'rgb','value':[2.8,2.6,2.2]}},'ground':{'type':'rectangle','to_world':mi.ScalarTransform4f.translate([0,-.035,0])@mi.ScalarTransform4f.rotate([1,0,0],-90)@mi.ScalarTransform4f.scale([300,300,300]),'bsdf':{'type':'diffuse','reflectance':{'type':'rgb','value':[.4,.445,.335]}}}}
  for i,m in enumerate(data['materials']):
   if m['texture']:
    rgb=np.asarray(Image.open(m['texture']).convert('RGB'),dtype=np.float32)/255
    tex=np.where(rgb<=.04045,rgb/12.92,((rgb+.055)/1.055)**2.4)
    blend=m.get('mapBlend',1);linear=(1-blend+blend*tex)*np.asarray(m['color'],dtype=np.float32)
    reflectance={'type':'bitmap','bitmap':mi.Bitmap(np.ascontiguousarray(linear)),'raw':True,'wrap_mode':'repeat','to_uv':mi.ScalarTransform3f.translate(m['offset'])@mi.ScalarTransform3f.scale(m['repeat'])}
   else:reflectance={'type':'rgb','value':m['color']}
   scene['mesh-'+str(i)]={'type':'ply','filename':str(directory/m['file']),'face_normals':True,'bsdf':{'type':'twosided','material':{'type':'diffuse','reflectance':reflectance}}}
  rendered=mi.render(mi.load_dict(scene),spp=opts.spp,seed=1893);target=directory/(data['name']+'.png');mi.util.write_bitmap(str(target),rendered,write_async=False)
  canvas=Image.new('RGB',(1600,1200),'#243a32');canvas.paste(Image.open(target).convert('RGB'),(0,0));d=ImageDraw.Draw(canvas);font=lambda n:ImageFont.truetype('C:/Windows/Fonts/arial.ttf',n)
  title={'front-isometric':'New York State Building | 1893','rear-isometric':'Rear / side study | inferred roof treatment','front-elevation':'Front elevation | 47 m facade','roof-plan':'Roof plan | complete exterior envelope','entry-detail':'Native scale | monumental entrance'}[data['name']]
  d.text((34,1074),title,font=font(30),fill='#f4e8cd');d.text((34,1117),data['caption'],font=font(20),fill='#f4e8cd');d.text((34,1153),'Actual-model CPU render. No crowds, fire, gameplay or UI. Historical colours unverified; bear paint shader omitted.',font=font(18),fill='#b9c9b0')
  canvas.save(out/(data['name']+'.jpg'),quality=95,subsampling=0,optimize=True)
  evidence=dict(name=data['name'],path='docs/art/exposition-new-york/previews/'+data['name']+'.jpg',width=1600,height=1200,renderPixels=[1600,1060],samplesPerPixel=opts.spp,camera=camera,triangles=data['triangles'],caption=data['caption'],limitations=data['limitations'],renderer='Mitsuba 3.9.1 scalar_rgb',visualReview='pending')
  (out/(data['name']+'.json')).write_text(json.dumps(evidence,indent=2)+'\n',encoding='utf-8');print(data['name']+' rendered',flush=True)
 record.update(passed=True,seconds=round(time.time()-started,3))
finally:
 deadline.cancel();record['finishedAt']=datetime.datetime.now(datetime.timezone.utc).isoformat();run.write_text(json.dumps(record,indent=2)+'\n',encoding='utf-8')
