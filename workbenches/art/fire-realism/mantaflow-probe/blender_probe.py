# Original finite stage1 Mantaflow probe. Run only through supervisor.py.
import bpy,sys,json,time,os,math,struct,hashlib,random,argparse,traceback,re
from pathlib import Path
from mathutils import Matrix,Vector
args=sys.argv[sys.argv.index('--')+1:];parser=argparse.ArgumentParser();parser.add_argument('--phase',choices=['prepare','bake'],required=True);parser.add_argument('--settings',required=True);parser.add_argument('--output',required=True);parser.add_argument('--permit',required=True);parser.add_argument('--stop',required=True);parser.add_argument('--repair',action='store_true');a=parser.parse_args(args)
out=Path(a.output).resolve();settings=json.loads(Path(a.settings).read_text(encoding='utf-8'));sim=settings['simulation'];stop=Path(a.stop)
def write(name,value):
 p=out/name;p.parent.mkdir(parents=True,exist_ok=True);p.write_text(json.dumps(value,indent=2)+'\n',encoding='utf-8')
def sha(p):return hashlib.sha256(Path(p).read_bytes()).hexdigest()
def guard():
 if stop.exists():raise RuntimeError('Task stop requested at safe Python boundary')
 run=json.loads((out/'run.json').read_text());
 if time.time()>=run['deadlineEpoch']:raise RuntimeError('Probe deadline reached')
start=time.monotonic()
while not Path(a.permit).exists():
 if stop.exists() or time.monotonic()-start>90:raise RuntimeError('Guard/registration permit not received')
 time.sleep(.05)
guard()
if bpy.app.version!=(4,5,15) or bpy.app.build_hash.decode()!=settings['tool']['buildHash']:raise RuntimeError('Unexpected Blender version/build')
def prop(obj,name,value):
 if not hasattr(obj,name):raise RuntimeError('Missing required4.5 RNA:'+name)
 setattr(obj,name,value)
 if getattr(obj,name)!=value:raise RuntimeError('RNA did not preserve setting:'+name)
def matrix_list(m):return [[float(v)for v in row]for row in m]
def select(obj):
 bpy.ops.object.select_all(action='DESELECT');obj.select_set(True);bpy.context.view_layer.objects.active=obj

def prepare():
 bpy.ops.object.select_all(action='SELECT');bpy.ops.object.delete(use_global=False)
 scene=bpy.context.scene;scene.unit_settings.system='METRIC';scene.unit_settings.scale_length=1;scene.gravity=(0,0,-9.81);scene.render.fps=sim['fps'];scene.render.fps_base=1;scene.frame_start=1;scene.frame_end=24;scene.render.threads_mode='FIXED';scene.render.threads=4
 bpy.ops.mesh.primitive_cube_add(size=1,location=sim['domainCentre']);domain=bpy.context.object;domain.name='ProbeGasDomain';domain.dimensions=sim['domainDimensions'];bpy.ops.object.transform_apply(location=False,rotation=False,scale=True)
 modifier=domain.modifiers.new('ActualMantaflowGas','FLUID');modifier.fluid_type='DOMAIN';bpy.context.view_layer.update();ds=modifier.domain_settings;ds.domain_type='GAS'
 configured={'resolution_max':32,'use_adaptive_domain':False,'use_noise':False,'time_scale':1.0,'timesteps_min':2,'timesteps_max':2,'use_adaptive_timesteps':False,'cfl_condition':2.0,'cache_type':'MODULAR','cache_data_format':'OPENVDB','cache_frame_start':1,'cache_frame_end':24,'cache_resumable':False,'flame_ignition':1.5,'flame_max_temp':3.0,'burning_rate':.75,'flame_vorticity':.5,'flame_smoke':1.0}
 for k,v in configured.items():prop(ds,k,v)
 ds.cache_directory=str(out/'cache')
 cache_rna={p.identifier:{'type':p.type,'enum':[e.identifier for e in p.enum_items]if p.type=='ENUM'else None}for p in ds.bl_rna.properties if 'vdb'in p.identifier or 'cache'in p.identifier}
 if hasattr(ds,'openvdb_cache_compress_type'):prop(ds,'openvdb_cache_compress_type','ZIP');configured['openvdb_cache_compress_type']='ZIP'
 precision=[k for k in cache_rna if 'depth'in k]
 for k in precision:
  enums=cache_rna[k]['enum'] or []
  if '32'in enums:prop(ds,k,'32');configured[k]='32'
 for side in ['front','back','left','right','top','bottom']:
  name='use_collision_border_'+side
  if hasattr(ds,name):prop(ds,name,side=='bottom');configured[name]=side=='bottom'
 if hasattr(ds,'use_dissolve_smoke'):prop(ds,'use_dissolve_smoke',False);configured['use_dissolve_smoke']=False
 # Closed1m bed, seeded irregular top; all flow stays inside the four eligible cells.
 rng=random.Random(1893);n=8;verts=[]
 for layer in [0,1]:
  for j in range(n+1):
   for i in range(n+1):verts.append((-.5+i/n,-.5+j/n,.02 if layer==0 else .17+rng.random()*.02))
 count=(n+1)**2;faces=[]
 for j in range(n):
  for i in range(n):
   q=j*(n+1)+i;faces.append((q,q+n+1,q+n+2,q+1));faces.append((q+count,q+1+count,q+n+2+count,q+n+1+count))
 boundary=[i for i in range(n+1)]+[j*(n+1)+n for j in range(1,n+1)]+[n*(n+1)+i for i in range(n-1,-1,-1)]+[j*(n+1)for j in range(n-1,0,-1)]
 for i,q in enumerate(boundary):r=boundary[(i+1)%len(boundary)];faces.append((q,r,r+count,q+count))
 mesh=bpy.data.meshes.new('OriginalSeed1893FuelBed');mesh.from_pydata(verts,[],faces);mesh.update();bed=bpy.data.objects.new('FourCellOriginalFuelBed',mesh);scene.collection.objects.link(bed)
 fm=bed.modifiers.new('ActualMantaflowInflow','FLUID');fm.fluid_type='FLOW';bpy.context.view_layer.update();fs=fm.flow_settings
 for k,v in {'flow_type':'BOTH','flow_behavior':'INFLOW','fuel_amount':1.0,'temperature':2.0,'density':1.0,'surface_distance':0.0}.items():prop(fs,k,v)
 if hasattr(fs,'volume_density'):prop(fs,'volume_density',1.0)
 for frame,on in [(1,True),(16,True),(17,False),(24,False)]:fs.use_inflow=on;fs.keyframe_insert(data_path='use_inflow',frame=frame)
 action=bed.animation_data.action if bed.animation_data else None
 if action:
  for fc in action.fcurves:
   for key in fc.keyframe_points:key.interpolation='CONSTANT'
 scene.frame_set(1);select(domain)
 bpy.ops.wm.save_as_mainfile(filepath=str(out/'probe.blend'))
 observed={'phase':'prepare','version':bpy.app.version_string,'buildHash':bpy.app.build_hash.decode(),'settingsSha256':sha(a.settings),'savedBlend':{'path':str(out/'probe.blend'),'sha256':sha(out/'probe.blend')},'domainMatrixWorld':matrix_list(domain.matrix_world),'domainDimensions':list(domain.dimensions),'configured':{k:getattr(ds,k)for k in configured},'cacheRna':cache_rna,'flow':{k:getattr(fs,k)for k in ['flow_type','flow_behavior','fuel_amount','temperature','density','surface_distance','use_inflow']},'sourceBed':{'vertices':len(mesh.vertices),'faces':len(mesh.polygons),'worldXYBounds':[-.5,.5,-.5,.5],'topSeed':1893},'threads':scene.render.threads,'noWind':not any(o.type=='EMPTY'and o.field.type!='NONE'for o in scene.objects)}
 write('prepare.json',observed);print('PROBE_PREPARE_OK',flush=True)

def floats(path,values):
 data=struct.pack('<%sf'%len(values),*values);path.write_bytes(data);return{'path':str(path.relative_to(out)).replace('\\','/'),'bytes':len(data),'sha256':hashlib.sha256(data).hexdigest()}
def aabb(points):return{'min':[min(p[i]for p in points)for i in range(3)],'max':[max(p[i]for p in points)for i in range(3)]}
def bake():
 guard();domain=bpy.data.objects['ProbeGasDomain'];ds=domain.modifiers['ActualMantaflowGas'].domain_settings;select(domain);bpy.context.scene.frame_set(1)
 if ds.resolution_max!=32 or ds.cache_frame_end!=24 or ds.use_adaptive_domain or ds.use_noise:raise RuntimeError('Saved probe settings escaped stage1 bounds')
 def progress(scene):
  write('progress.json',{'frame':scene.frame_current,'at':time.time()});guard()
 bpy.app.handlers.frame_change_post.append(progress)
 if a.repair:ds.cache_directory=str(out/'cache-repair')
 result=bpy.ops.fluid.bake_data()
 if result!={'FINISHED'}or not ds.has_cache_baked_data:raise RuntimeError('Mantaflow data bake did not finish:'+str(result))
 bpy.app.handlers.frame_change_post.remove(progress)
 frames=[];arrays={};out.joinpath('exports').mkdir(exist_ok=True)
 for frame in range(1,25):
  guard();bpy.context.scene.frame_set(0 if frame==1 else frame-1);bpy.context.scene.frame_set(frame);bpy.context.view_layer.update();evaluated_domain=domain.evaluated_get(bpy.context.evaluated_depsgraph_get());grid_settings=evaluated_domain.modifiers['ActualMantaflowGas'].domain_settings;res=list(grid_settings.domain_resolution);count=math.prod(res)
  write('grid-access.json',{'frame':frame,'originalResolution':list(ds.domain_resolution),'evaluatedResolution':res,'cacheDirectory':ds.cache_directory})
  if count<=32 or max(res)>32:raise RuntimeError('No full-sized bounded domain grid:'+str(res))
  bounds=aabb([domain.matrix_world@Vector(c)for c in domain.bound_box]);spacing=[(bounds['max'][i]-bounds['min'][i])/res[i]for i in range(3)];origin=[bounds['min'][i]+spacing[i]*.5 for i in range(3)];channels={}
  for channel,propname in [('density','density_grid'),('temperature','temperature_grid'),('flame','flame_grid')]:
   values=list(getattr(grid_settings,propname))
   if len(values)!=count or not all(math.isfinite(v)for v in values):raise RuntimeError('Invalid full-sized '+channel+' '+str((len(values),count)))
   record=floats(out/'exports'/('%s-%03d.f32'% (channel,frame)),values);record.update({'min':min(values),'max':max(values),'nonzero':sum(v != 0 for v in values),'samples':[{'index':i,'value':values[i]}for i in sorted(set([0,count//3,count//2,count-1,values.index(max(values))]))]});channels[channel]=record
   arrays[(frame,channel)]=values
  frames.append({'frame':frame,'timeSeconds':(frame-1)/30,'resolution':res,'voxelCentreOriginBlenderWorld':origin,'voxelSize':spacing,'domainWorldBounds':bounds,'channels':channels});write('progress.json',{'exportedFrame':frame,'at':time.time()})
 active=[f for f in frames if f['frame']<=16]
 for channel in ['density','temperature','flame']:
  if not any(f['channels'][channel]['max'] > 0 for f in active):raise RuntimeError('Active '+channel+' grid remained zero')
  if len({f['channels'][channel]['sha256']for f in frames})<2:raise RuntimeError('No temporal variation:'+channel)
 chosen=max(active,key=lambda f:f['channels']['flame']['max']);frame=chosen['frame'];bpy.context.scene.frame_set(frame);guard()
 candidates=[p for p in Path(ds.cache_directory).rglob('*.vdb') if re.search(r'(\d+)$',p.stem) and int(re.search(r'(\d+)$',p.stem).group(1)) == frame]
 # Most Mantaflow caches use a trailing frame number; enumerate rather than assume names.
 if len(candidates)!=1:raise RuntimeError('Expected one actualVDB for chosenframe:'+str([(p.name)for p in candidates]))
 vdb=candidates[0];before=set(bpy.data.objects);bpy.ops.object.volume_import(filepath=str(vdb));volume_obj=next(o for o in bpy.data.objects if o not in before);volume_obj.data.is_sequence=False;volume_obj.data.grids.load();grids=list(volume_obj.data.grids)
 flame=next((g for g in grids if g.name=='flame'),None)
 if flame is None:raise RuntimeError('Actual cache has no named flame grid:'+str([g.name for g in grids]))
 if not hasattr(flame,'matrix_object'):raise RuntimeError('Named grid lacks public voxel/object transform')
 vdb_matrix=Matrix(flame.matrix_object);origin=chosen['voxelCentreOriginBlenderWorld'];spacing=chosen['voxelSize'];desired=Matrix.Translation(Vector(origin))@Matrix.Diagonal(Vector([*spacing,1]));alignment=desired@vdb_matrix.inverted();volume_obj.matrix_world=alignment
 mesh_reports=[];thresholds=[chosen['channels']['flame']['max']*.1,chosen['channels']['flame']['max']*.5]
 for index,threshold in enumerate(thresholds):
  guard();empty=bpy.data.meshes.new('EMPTY_PROBE_TARGET_'+str(index));target=bpy.data.objects.new('ActualFlameIsoSurface_'+str(index),empty);bpy.context.scene.collection.objects.link(target);assert len(empty.vertices)==0 and len(empty.polygons)==0
  mod=target.modifiers.new('NamedFlameGridOnly','VOLUME_TO_MESH');mod.object=volume_obj;mod.grid_name=flame.name;mod.resolution_mode='GRID';mod.threshold=threshold;mod.adaptivity=0;select(target);bpy.context.view_layer.update();evaluated=target.evaluated_get(bpy.context.evaluated_depsgraph_get());mesh=evaluated.to_mesh();mesh.calc_loop_triangles()
  if not len(mesh.vertices)or not len(mesh.loop_triangles):raise RuntimeError('Empty named-grid volume mesh')
  points=[target.matrix_world@v.co for v in mesh.vertices];triangles=[i for t in mesh.loop_triangles for i in t.vertices];values=[float(x)for p in points for x in p]
  if not all(math.isfinite(x)for x in values):raise RuntimeError('Nonfinite mesh')
  bbox=aabb(points);positive=[i for i,x in enumerate(arrays[(frame,'flame')])if x>threshold];nx,ny,nz=chosen['resolution'];voxel_points=[[origin[0]+(i%nx)*spacing[0],origin[1]+((i//nx)%ny)*spacing[1],origin[2]+(i//(nx*ny))*spacing[2]]for i in positive];field_bounds=aabb(voxel_points)
  for axis in range(3):
   if bbox['min'][axis]<field_bounds['min'][axis]-spacing[axis]*1.1 or bbox['max'][axis]>field_bounds['max'][axis]+spacing[axis]*1.1:raise RuntimeError('VDB mesh/array axis or coordinate mismatch:'+str((bbox,field_bounds,spacing)))
  vertex_record=floats(out/'exports'/('mesh-%s.vertices.f32'%index),values);idata=struct.pack('<%sI'%len(triangles),*triangles);ipath=out/'exports'/('mesh-%s.indices.u32'%index);ipath.write_bytes(idata)
  mesh_reports.append({'emptyTargetBefore':{'vertices':0,'polygons':0},'sourceType':'actual cachedVDB scalar grid through VolumeToMeshModifier','grid':mod.grid_name,'threshold':threshold,'vertices':len(mesh.vertices),'triangles':len(mesh.loop_triangles),'boundsBlenderWorld':bbox,'fieldBoundsBlenderWorld':field_bounds,'verticesFile':vertex_record,'indicesFile':{'path':str(ipath.relative_to(out)).replace('\\','/'),'bytes':len(idata),'sha256':hashlib.sha256(idata).hexdigest()}});evaluated.to_mesh_clear()
 if mesh_reports[0]['verticesFile']['sha256']==mesh_reports[1]['verticesFile']['sha256']:raise RuntimeError('Threshold-insensitive mesh; no-op geometry suspected')
 report={'version':1,'status':'data-and-mesh-export-pass','scope':'Stage1 authoring/review data only; not engine integration, image quality or production bake','tool':{'version':bpy.app.version_string,'buildHash':bpy.app.build_hash.decode()},'settingsSha256':sha(a.settings),'frames':frames,'format':{'scalar':'IEEE754float32 little-endian','flatten':'X fastest, thenY, thenZ; VDB named-grid transform alignment cross-checked','temperature':'Raw Blender4.5temperature_grid, documented0..1 corresponds0..1000K; solver values recorded, not measured real-fire temperature','flame':'Blender flame_grid reaction proxy, not gameplay heat'},'blenderWorldToGameRowMajor':settings['source']['blenderWorldToGameRowMajor'],'canonicalSource':settings['source'],'vdb':{'path':str(vdb.relative_to(out)).replace('\\','/'),'sha256':sha(vdb),'gridNames':[g.name for g in grids],'rawGridMatrixObject':matrix_list(vdb_matrix),'desiredVoxelWorldMatrix':matrix_list(desired),'alignmentMatrix':matrix_list(alignment)},'meshes':mesh_reports,'noCustomSolver':True,'newRuntimeAsset':False}
 write('export-manifest.json',report);print('PROBE_EXPORT_OK',flush=True)
try:
 prepare()if a.phase=='prepare'else bake()
except BaseException as e:
 write(a.phase+('-repair' if a.repair else '')+'-failure.json',{'status':'failed','error':str(e),'traceback':traceback.format_exc(),'phase':a.phase,'at':time.time()});raise
