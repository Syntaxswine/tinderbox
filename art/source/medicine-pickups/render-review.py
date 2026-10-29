"""Finite actual-mesh CPU art review. Does not establish browser acceptance."""
from pathlib import Path
import sys,json,time,os,threading,datetime,ctypes
ROOT=Path(__file__).resolve().parents[3]
sys.path.insert(0,str(ROOT/'artifacts/render-deps'))
import mitsuba as mi
from PIL import Image,ImageDraw,ImageFont
mi.set_variant('scalar_rgb')
base=ROOT/'artifacts/medicine-pickups/renders';out=ROOT/'docs/art/medicine-pickups/previews';out.mkdir(parents=True,exist_ok=True)
started=time.time();deadline=threading.Timer(120,lambda:os._exit(124));deadline.daemon=True;deadline.start()
record=dict(owner='01a17ea0-1362-7d13-a42d-f4a5fcff8902',task='Medicine ground props',purpose='Finite actual-model CPU render',pid=os.getpid(),executable=sys.executable,startedAt=datetime.datetime.now(datetime.timezone.utc).isoformat(),intendedExpirySeconds=120,stopMethod='Natural exit; same-process 120-second deadline',port=None)
ctypes.windll.kernel32.GetCurrentProcess.restype=ctypes.c_void_p
ctypes.windll.kernel32.GetProcessTimes.argtypes=[ctypes.c_void_p]+[ctypes.POINTER(ctypes.c_ulonglong)]*4
values=[ctypes.c_ulonglong() for _ in range(4)]
if ctypes.windll.kernel32.GetProcessTimes(ctypes.windll.kernel32.GetCurrentProcess(),*[ctypes.byref(v) for v in values]):record['creationFiletime']=str(values[0].value)
run=base/('run-'+str(os.getpid())+'.json');run.write_text(json.dumps(record,indent=2)+'\n',encoding='utf-8',newline='\n')
try:
 for item in json.loads((base/'index.json').read_text(encoding='utf-8')):
  directory=Path(item['directory']);data=json.loads((directory/'scene.json').read_text(encoding='utf-8'));c=data['camera'];w=data['width'];h=data['height']
  scene={'type':'scene','integrator':{'type':'path','max_depth':8},'sensor':{'type':'orthographic','to_world':mi.ScalarTransform4f.look_at(origin=c['origin'],target=c['target'],up=[0,1,0])@mi.ScalarTransform4f.scale([c['halfWidth'],c['halfWidth'],1]),'sampler':{'type':'independent','sample_count':24},'film':{'type':'hdrfilm','width':w,'height':h,'pixel_format':'rgb','rfilter':{'type':'tent'}}},'ambient':{'type':'constant','radiance':{'type':'rgb','value':[.64,.61,.50]}},'sun':{'type':'directional','direction':[.5,-1,.35],'irradiance':{'type':'rgb','value':[2.7,2.3,1.8]}},'ground':{'type':'rectangle','to_world':mi.ScalarTransform4f.translate([0,-.002,0])@mi.ScalarTransform4f.rotate([1,0,0],-90)@mi.ScalarTransform4f.scale([50,50,50]),'bsdf':{'type':'diffuse','reflectance':{'type':'rgb','value':[.32,.28,.205]}}}}
  for i,m in enumerate(data['materials']):scene['mesh-'+str(i)]={'type':'ply','filename':str(directory/m['file']),'face_normals':True,'bsdf':{'type':'twosided','material':{'type':'diffuse','reflectance':{'type':'rgb','value':m['color']}}}}
  rendered=mi.render(mi.load_dict(scene),spp=24,seed=1893);png=directory/(data['name']+'.png');mi.util.write_bitmap(str(png),rendered,write_async=False)
  canvas=Image.new('RGB',(w,h+160),'#392b22');canvas.paste(Image.open(png).convert('RGB'),(0,0));d=ImageDraw.Draw(canvas);font=lambda n:ImageFont.truetype('C:/Windows/Fonts/arial.ttf',n)
  d.text((32,h+16),data['title'],font=font(30),fill='#f3e7c6');d.text((32,h+64),data['caption'],font=font(19),fill='#f3e7c6');d.text((32,h+108),'Actual meshes; CPU base colours. Borrowed texture maps and native bear projection paint omitted. Combined WebGL review pending.',font=font(18),fill='#cbbb9c')
  canvas.save(out/(data['name']+'.jpg'),quality=95,subsampling=0,optimize=True)
  evidence=dict(name=data['name'],path='docs/art/medicine-pickups/previews/'+data['name']+'.jpg',dimensions=[w,h+160],camera=c,triangles=data['triangles'],renderer='Mitsuba 3.9.1 scalar_rgb',samplesPerPixel=24,caption=data['caption'],limitations=data['limitations'],visualReview='pending')
  (out/(data['name']+'.json')).write_text(json.dumps(evidence,indent=2)+'\n',encoding='utf-8',newline='\n');print(data['name']+' rendered',flush=True)
 record.update(passed=True,seconds=round(time.time()-started,3))
finally:
 deadline.cancel();record['finishedAt']=datetime.datetime.now(datetime.timezone.utc).isoformat();run.write_text(json.dumps(record,indent=2)+'\n',encoding='utf-8',newline='\n')
