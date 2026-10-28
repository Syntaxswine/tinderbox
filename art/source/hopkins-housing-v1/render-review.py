"""Offline visual review of the exact Three.js mesh export; no generated texture edits.
Requires mitsuba==3.9.1, drjit==1.5.0, numpy and Pillow. Not a WebGL shader test.
"""
from pathlib import Path
import sys, json, time, argparse
ROOT=Path(__file__).resolve().parents[3]
DEPS=ROOT/'artifacts/render-deps'
if DEPS.exists():sys.path.insert(0,str(DEPS))
import mitsuba as mi
import numpy as np
from PIL import Image
mi.set_variant('scalar_rgb')
parser=argparse.ArgumentParser();parser.add_argument('--id');parser.add_argument('--width',type=int,default=800);parser.add_argument('--spp',type=int,default=24);parser.add_argument('--only-exterior',action='store_true');args=parser.parse_args()
base=ROOT/'artifacts/hopkins-renders';out=base/'images';out.mkdir(parents=True,exist_ok=True)
texture_cache={};results=[]
def color_texture(m):
 if not m['texture']:return {'type':'rgb','value':m['color']}
 key=(m['texture'],tuple(m['color']))
 if key not in texture_cache:
  srgb=np.asarray(Image.open(ROOT/m['texture']).convert('RGB'),dtype=np.float32)/255
  linear=np.where(srgb<=.04045,srgb/12.92,((srgb+.055)/1.055)**2.4)
  texture_cache[key]=mi.Bitmap(np.ascontiguousarray(linear*np.array(m['color'],dtype=np.float32)))
 return {'type':'bitmap','bitmap':texture_cache[key],'raw':True,'wrap_mode':'repeat','to_uv':mi.ScalarTransform3f.scale(m['repeat'])}
for entry in json.loads((base/'scenes/index.json').read_text(encoding='utf-8')):
 if args.id and entry['house']!=args.id:continue
 if args.only_exterior and entry['view']!='exterior':continue
 started=time.time();directory=base/'scenes'/entry['id'];data=json.loads((directory/'scene.json').read_text(encoding='utf-8'));lo=np.array(data['bounds']['min']);hi=np.array(data['bounds']['max']);target=(lo+hi)/2
 direction=np.array([-19,37 if entry['view']=='cutaway' else 16,-22],dtype=float);origin=target+direction
 forward=(target-origin);forward/=np.linalg.norm(forward);right=np.cross(forward,[0,1,0]);right/=np.linalg.norm(right);up=np.cross(right,forward)
 corners=np.array([[x,y,z] for x in [lo[0],hi[0]] for y in [lo[1],hi[1]] for z in [lo[2],hi[2]]])-target
 height=round(args.width*.75);scale=max(np.abs(corners@right).max(),np.abs(corners@up).max()*args.width/height)*1.12
 scene={'type':'scene','integrator':{'type':'path','max_depth':4},'sensor':{'type':'orthographic','to_world':mi.ScalarTransform4f.look_at(origin=origin.tolist(),target=target.tolist(),up=[0,1,0]) @ mi.ScalarTransform4f.scale([scale,scale,1]),'sampler':{'type':'independent','sample_count':args.spp},'film':{'type':'hdrfilm','width':args.width,'height':height,'pixel_format':'rgb','rfilter':{'type':'tent'}}},'ambient':{'type':'constant','radiance':{'type':'rgb','value':[.65,.68,.58]}},'sun':{'type':'directional','direction':[.5,-1,.4],'irradiance':{'type':'rgb','value':[2.9,2.7,2.25]}},'ground':{'type':'rectangle','to_world':mi.ScalarTransform4f.translate([0,data['groundY'],0]) @ mi.ScalarTransform4f.rotate([1,0,0],-90) @ mi.ScalarTransform4f.scale([100,100,100]),'bsdf':{'type':'diffuse','reflectance':{'type':'rgb','value':[.39,.43,.32]}}}}
 for i,m in enumerate(data['materials']):scene['mesh_'+str(i)]={'type':'ply','filename':str(directory/m['file']),'face_normals':True,'bsdf':{'type':'twosided','material':{'type':'diffuse','reflectance':color_texture(m)}}}
 loaded=mi.load_dict(scene);render=mi.render(loaded,spp=args.spp,seed=123);file=out/(entry['id']+'.png');mi.util.write_bitmap(str(file),render)
 result={'id':entry['id'],'file':str(file.relative_to(ROOT)).replace('\\','/'),'samplesPerPixel':args.spp,'seconds':round(time.time()-started,3),'triangles':sum(m['triangles'] for m in data['materials'])};results.append(result);print(json.dumps(result),flush=True)
(base/'offline-review.json').write_text(json.dumps({'renderer':'Mitsuba 3.9.1 scalar_rgb','drjit':'1.5.0','width':args.width,'height':height,'samplesPerPixel':args.spp,'images':results,'limits':'Actual exported geometry, material tints, shared source texture bytes and Three cut planes; diffuse path tracing substitutes for WebGL shaders. WebGL review remains unavailable on this host.'},indent=2)+'\n',encoding='utf-8')
