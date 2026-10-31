"""Original one-run Mantaflow contact authoring. NEVER run without root approval.
No gameplay changes, fluid solver implementation, hidden warmup or automatic repair.
"""
import argparse,array,bpy,hashlib,json,math,os,random,struct,sys,time,traceback
from pathlib import Path
from mathutils import Vector
sys.path.insert(0,str(Path(__file__).resolve().parent))
from grid import sample_age,source_gain,little_endian_bytes,scalar_stats,positive_support
p=argparse.ArgumentParser();p.add_argument('--phase',choices=['prepare','bake'],required=True);p.add_argument('--settings',required=True);p.add_argument('--output',required=True);p.add_argument('--permit',required=True);p.add_argument('--stop',required=True);args=p.parse_args(sys.argv[sys.argv.index('--')+1:]);out=Path(args.output).resolve();settings=json.loads(Path(args.settings).read_text(encoding='utf-8'));sim=settings['simulation'];source=settings['source']
def save(name,value):
    target=out/name;target.parent.mkdir(parents=True,exist_ok=True);target.write_text(json.dumps(value,indent=2)+'\n',encoding='utf-8',newline='\n')
def sha(path):
    h=hashlib.sha256()
    with Path(path).open('rb')as f:
        for chunk in iter(lambda:f.read(1024*1024),b''):h.update(chunk)
    return h.hexdigest()
def guard():
    if Path(args.stop).exists():raise RuntimeError('Stop requested at a safe Python boundary')
    if time.time()>=json.loads((out/'run.json').read_text())['deadlineEpoch']:raise RuntimeError('Whole authoring deadline reached')
def prop(obj,name,value):
    if not hasattr(obj,name):raise RuntimeError('Missing required Blender RNA:'+name)
    setattr(obj,name,value)
    if getattr(obj,name)!=value:raise RuntimeError('Setting not preserved:'+name)
def surface_distance_readback(obj,requested):
    # This one RNA FLOAT value stores float32. Do not add a tolerance or change
    # the physical .001 request; record the actual typed readback before a gate.
    name='surface_distance';rna_type=obj.bl_rna.properties[name].type
    setattr(obj,name,requested);observed=getattr(obj,name);expected=struct.unpack('<f',struct.pack('<f',requested))[0]
    save('surface-distance-readback.json',{'setting':name,'requested':requested,'expectedStoredFloat32':expected,'observed':observed,'rnaType':rna_type,'comparison':'exact equality to float32 storage; no arbitrary tolerance','proved':rna_type=='FLOAT'and observed==expected})
    if rna_type!='FLOAT'or observed!=expected:raise RuntimeError('Ground surface_distance float32 readback failed; see recorded actual value')
def select(obj):
    bpy.ops.object.select_all(action='DESELECT');obj.select_set(True);bpy.context.view_layer.objects.active=obj
start=time.monotonic()
while not Path(args.permit).exists():
    guard()
    if time.monotonic()-start>90:raise RuntimeError('No registered/guarded launch permit')
    time.sleep(.05)
guard()
if bpy.app.version!=(4,5,15)or bpy.app.build_hash.decode()!=settings['tool']['buildHash']:raise RuntimeError('Unexpected authoring tool')

def prepare():
    bpy.ops.object.select_all(action='SELECT');bpy.ops.object.delete(use_global=False);scene=bpy.context.scene
    scene.unit_settings.system='METRIC';scene.unit_settings.scale_length=1;scene.gravity=(0,0,-9.81);scene.render.fps=sim['fps'];scene.render.fps_base=1;scene.render.threads_mode='FIXED';scene.render.threads=4;scene.frame_start=sim['firstFrame'];scene.frame_end=sim['lastFrame']
    bpy.ops.mesh.primitive_cube_add(size=1,location=sim['domainCentre']);domain=bpy.context.object;domain.name='FiniteContactDomain';domain.dimensions=sim['domainDimensions'];bpy.ops.object.transform_apply(location=False,rotation=False,scale=True)
    dm=domain.modifiers.new('MantaflowContactGas','FLUID');dm.fluid_type='DOMAIN';bpy.context.view_layer.update();ds=dm.domain_settings;ds.domain_type='GAS'
    configured={'resolution_max':sim['resolutionMax'],'use_adaptive_domain':False,'use_noise':False,'time_scale':1.0,'timesteps_min':sim['substeps'],'timesteps_max':sim['substeps'],'use_adaptive_timesteps':False,'cfl_condition':sim['cfl'],'cache_type':'MODULAR','cache_data_format':'OPENVDB','cache_frame_start':sim['firstFrame'],'cache_frame_end':sim['lastFrame'],'cache_resumable':False,'flame_ignition':sim['flameIgnition'],'flame_max_temp':sim['flameMaxTemp'],'burning_rate':sim['burningRate'],'flame_vorticity':sim['flameVorticity'],'flame_smoke':sim['flameSmoke'],'openvdb_cache_compress_type':'ZIP'}
    for name,value in configured.items():prop(ds,name,value)
    ds.cache_directory=str(out/'cache');precision={'requested':sim['requestedCacheDepth'],'before':getattr(ds,'openvdb_data_depth',None),'requestApplied':False}
    if hasattr(ds,'openvdb_data_depth'):
        try:prop(ds,'openvdb_data_depth',sim['requestedCacheDepth']);precision['requestApplied']=True
        except (TypeError,ValueError,RuntimeError)as e:precision['requestError']=str(e)
    precision['observed']=getattr(ds,'openvdb_data_depth',None)
    for side in ['front','back','left','right','top','bottom']:prop(ds,'use_collision_border_'+side,side=='bottom')
    if hasattr(ds,'use_dissolve_smoke'):prop(ds,'use_dissolve_smoke',False)
    ground_source=source['groundCollision'];bpy.ops.mesh.primitive_cube_add(size=1,location=(0,0,(ground_source['topZ']+ground_source['bottomZ'])/2));ground=bpy.context.object;ground.name='OriginalNativeGroundCollision';ground.dimensions=(*ground_source['dimensionsXY'],ground_source['topZ']-ground_source['bottomZ']);bpy.ops.object.transform_apply(location=False,rotation=False,scale=True)
    gm=ground.modifiers.new('StationaryGroundEffector','FLUID');gm.fluid_type='EFFECTOR';bpy.context.view_layer.update();gs=gm.effector_settings;prop(gs,'effector_type','COLLISION');surface_distance_readback(gs,ground_source['surfaceDistance']);prop(gs,'use_effector',True)
    h=max(sim['domainDimensions'])/sim['resolutionMax'];inset=source['sourceBedInsetVoxels']*h;half=.5-inset
    if half<=0:raise RuntimeError('Inflow inset consumed source bed')
    rng=random.Random(sim['seed']);n=source['bedSubdivisions'];vertices=[]
    for layer in [0,1]:
        for y in range(n+1):
            for x in range(n+1):vertices.append((-half+2*half*x/n,-half+2*half*y/n,source['bedBottom']if layer==0 else source['bedTopBase']+rng.random()*source['bedTopJitter']))
    count=(n+1)**2;faces=[]
    for y in range(n):
        for x in range(n):
            q=y*(n+1)+x;faces.extend([(q,q+n+1,q+n+2,q+1),(q+count,q+1+count,q+n+2+count,q+n+1+count)])
    edge=[x for x in range(n+1)]+[y*(n+1)+n for y in range(1,n+1)]+[n*(n+1)+x for x in range(n-1,-1,-1)]+[y*(n+1)for y in range(n-1,0,-1)]
    for i,q in enumerate(edge):r=edge[(i+1)%len(edge)];faces.append((q,r,r+count,q+count))
    mesh=bpy.data.meshes.new('OriginalInsetGrassBed');mesh.from_pydata(vertices,[],faces);mesh.update();bed=bpy.data.objects.new('CanonicalFourCellBed',mesh);scene.collection.objects.link(bed)
    fm=bed.modifiers.new('FiniteGrassInflow','FLUID');fm.fluid_type='FLOW';bpy.context.view_layer.update();fs=fm.flow_settings
    for name,value in {'flow_type':'BOTH','flow_behavior':'INFLOW','fuel_amount':1.0,'temperature':sim['flowTemperature'],'density':sim['smokeDensity'],'surface_distance':0.0}.items():prop(fs,name,value)
    if hasattr(fs,'volume_density'):prop(fs,'volume_density',1.0)
    curve=[]
    for frame in range(sim['firstFrame'],sim['lastFrame']+1):
        age=sample_age(frame,sim);gain=source_gain(age,sim);fs.use_inflow=0<age<sim['burnSeconds'];fs.fuel_amount=gain;fs.keyframe_insert(data_path='use_inflow',frame=frame);fs.keyframe_insert(data_path='fuel_amount',frame=frame);curve.append({'frame':frame,'age':age,'inflow':fs.use_inflow,'fuelGain':gain})
    action=bed.animation_data.action if bed.animation_data else None
    if action:
        for fc in action.fcurves:
            for key in fc.keyframe_points:key.interpolation='CONSTANT'if fc.data_path.endswith('use_inflow')else'LINEAR'
    scene.frame_set(1);select(domain);bpy.ops.wm.save_as_mainfile(filepath=str(out/'contact.blend'))
    save('prepare.json',{'scope':'One finite source scene, not visual approval','tool':{'version':bpy.app.version_string,'buildHash':bpy.app.build_hash.decode()},'settingsSha256':sha(args.settings),'savedBlendSha256':sha(out/'contact.blend'),'domainDimensions':list(domain.dimensions),'domainMatrixWorld':[list(row)for row in domain.matrix_world],'configured':{name:getattr(ds,name)for name in configured},'cachePrecision':precision,'sourceBed':{'halfWidth':half,'insetVoxels':2,'plannedVoxelSize':h,'vertices':len(mesh.vertices),'faces':len(mesh.polygons),'allFourCellsRepresented':True},'curve':curve,'initialInflowObserved':fs.use_inflow,'groundCollision':{'matrixWorld':[list(row)for row in ground.matrix_world],'dimensions':list(ground.dimensions),'source':ground_source,'observedSurfaceDistance':gs.surface_distance,'effectorType':gs.effector_type},'clock':'cacheframe1 age0 with flowOFF; require actual zero full grids, not synthetic data; cacheframe193 age6.4','threads':scene.render.threads})
    print('FINITE_CONTACT_PREPARED',flush=True)

def export():
    scene=bpy.context.scene;domain=bpy.data.objects['FiniteContactDomain'];ds=domain.modifiers['MantaflowContactGas'].domain_settings;select(domain);scene.frame_set(1)
    if ds.resolution_max!=96 or ds.cache_frame_end!=193 or ds.use_noise or ds.use_adaptive_domain:raise RuntimeError('Prepared scene escaped its finite contract')
    def progress(scene):save('progress.json',{'cacheFrame':scene.frame_current,'at':time.time()});guard()
    bpy.app.handlers.frame_change_post.append(progress)
    try:result=bpy.ops.fluid.bake_data()
    finally:bpy.app.handlers.frame_change_post.remove(progress)
    if result!={'FINISHED'}or not ds.has_cache_baked_data:raise RuntimeError('Finite data bake did not finish')
    exports=out/'fields';exports.mkdir(exist_ok=False);records=[];reactive_boundary=False;source_sha=sha(out/'contact.blend')
    for frame in range(1,194):
        guard();scene.frame_set(0 if frame==1 else frame-1);scene.frame_set(frame);bpy.context.view_layer.update();evaluated=domain.evaluated_get(bpy.context.evaluated_depsgraph_get());data=evaluated.modifiers['MantaflowContactGas'].domain_settings
        resolution=list(data.domain_resolution);spacing=list(data.cell_size);count=math.prod(resolution)
        if any(abs(h-max(sim['domainDimensions'])/sim['resolutionMax'])>1e-7 for h in spacing):raise RuntimeError('Measured voxel size differs from the pinned two-voxel inset recipe')
        if count<=32 or max(resolution)>96 or any(h<=0 for h in spacing):raise RuntimeError('Missing full bounded evaluated domain:'+str(resolution))
        corners=[domain.matrix_world@Vector(c)for c in domain.bound_box];bounds={'min':[min(v[i]for v in corners)for i in range(3)],'max':[max(v[i]for v in corners)for i in range(3)]};origin=[bounds['min'][i]+spacing[i]/2 for i in range(3)];contact=source['bedTopBase']+source['bedTopJitter']+2*max(spacing);channels={};supports={}
        for name,propname in [('density','density_grid'),('temperature','temperature_grid'),('flame','flame_grid')]:
            values=array.array('f',getattr(data,propname))
            if len(values)!=count:raise RuntimeError('Missing full-sized actual '+name+' grid')
            stats=scalar_stats(values)
            if frame==1 and stats['nonzero']!=0:raise RuntimeError('Observed initial condition is not zero: '+name)
            raw=little_endian_bytes(values);path=exports/('%s-%03d.f32'%(name,frame));path.write_bytes(raw);channels[name]={'path':str(path.relative_to(out)).replace('\\','/'),'bytes':len(raw),'sha256':hashlib.sha256(raw).hexdigest(),**stats}
            if name in ['density','flame']:supports[name]=positive_support(values,resolution,origin,spacing,contact)
        reactive_boundary|=supports['flame']['hasBoundaryReaction'];records.append({'frame':frame,'ageSeconds':sample_age(frame,sim),'resolution':resolution,'voxelSize':spacing,'scalarCentreOriginBlender':origin,'domainBoundsBlender':bounds,'contactBandHeight':contact,'channels':channels,'support':supports});save('progress.json',{'exportedFrame':frame,'ageSeconds':sample_age(frame,sim),'at':time.time()})
    for channel in ['density','temperature','flame']:
        if not any(f['channels'][channel]['positive']>0 for f in records[1:97]):raise RuntimeError('No positive active '+channel)
        if len({f['channels'][channel]['sha256']for f in records})<2:raise RuntimeError('No temporal change:'+channel)
    if sha(out/'contact.blend')!=source_sha:raise RuntimeError('Prepared scene changed during export')
    manifest={'version':1,'id':settings['id'],'status':'raw-export-complete-bounds-failed'if reactive_boundary else'raw-export-complete-bounds-await-review','scope':'Actual finite Mantaflow fields, not production integration, R acceptance or cost evidence','tool':{'version':bpy.app.version_string,'buildHash':bpy.app.build_hash.decode(),'exeSha256':settings['tool']['exeSha256']},'settingsSha256':sha(args.settings),'sourceBlendSha256':source_sha,'samples':records,'initialConditionObservedZero':True,'sampleCount':len(records),'ageRange':[0,6.4],'burnAgeRange':[0,3.2],'tailMaximum':3.2,'boundaryReactionFailed':reactive_boundary,'upperOverhangApproved':False,'scalarFormat':'IEEE754f32LE Xfastest,YthenZ; exact observed Blender values; uncalibrated temperature/reaction; no quantization','scalarOrigin':'domainMin+voxelSize/2; no VolumeToMesh modifier offset','blenderWorldToGameRowMajor':source['blenderWorldToGameRowMajor'],'canonicalSource':source,'cachePrecision':json.loads((out/'prepare.json').read_text())['cachePrecision']}
    save('raw-manifest.json',manifest);print('FINITE_CONTACT_RAW_EXPORT_COMPLETE boundaryReactionFailed='+str(reactive_boundary),flush=True)
try:prepare()if args.phase=='prepare'else export()
except BaseException as e:save(args.phase+'-failure.json',{'error':str(e),'traceback':traceback.format_exc(),'at':time.time()});raise
