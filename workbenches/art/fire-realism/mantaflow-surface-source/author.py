"""ADDITIVE authored source; run ONLY inside explicitly permitted Blender child.
No actions occur on ordinary Python import. Never calls a renderer or changes the
original scene/cache/runtime. Geometry prediction never waives actual raw gates.
"""
import argparse,array,ctypes,hashlib,json,math,os,struct,sys,time,traceback
from pathlib import Path
sys.dont_write_bytecode=True
sys.path.insert(0,str(Path(__file__).resolve().parent))
from grid import sample_age,little_endian_bytes,scalar_stats,positive_support
from policy import CORE_FILES,validate_settings,expected_inputs,remaining_seconds,terminal_report
from surface import triangulate,plan_report
from state import capture,compare_actual,normal
HERE=Path(__file__).resolve().parent;ROOT=HERE.parents[3]

def sha(path):
    h=hashlib.sha256()
    with Path(path).open('rb')as f:
        for block in iter(lambda:f.read(1024*1024),b''):h.update(block)
    return h.hexdigest()
def save(path,value):
    path=Path(path);temp=path.with_name(path.name+'.writing');temp.write_text(json.dumps(value,indent=2)+'\n',encoding='utf-8',newline='\n');os.replace(temp,path)
def f32(x):return struct.unpack('<f',struct.pack('<f',x))[0]
def set_observed(obj,name,value):
    if not hasattr(obj,name):raise RuntimeError('Unsupported required RNA:'+name)
    prop=obj.bl_rna.properties[name];setattr(obj,name,value);actual=getattr(obj,name)
    expected=f32(value)if prop.type=='FLOAT'else value
    if actual!=expected:raise RuntimeError('Requested/typed-stored/observed RNA mismatch:'+name)
    return {'property':name,'requested':value,'expectedStored':expected,'observed':actual,'rnaType':prop.type}

class Author:
    def __init__(self,args):
        self.args=args;self.out=Path(args.output).resolve();self.s=json.loads((HERE/'settings.json').read_text());validate_settings(self.s)
        if not self.out.is_relative_to(ROOT/'artifacts/qa/fire-realism/mantaflow-surface-source')or Path(args.settings).resolve()!=HERE/'settings.json':raise RuntimeError('Assigned path/settings mismatch')
        self.run=json.loads((self.out/'run.json').read_text());self.k=ctypes.WinDLL('kernel32',use_last_error=True);self.k.GetTickCount64.restype=ctypes.c_ulonglong
        self.original=ROOT/self.s['original']['blend'];self.guard()
        if any(sha(HERE/name)!=self.run['sourcePins'][name]for name in CORE_FILES):raise RuntimeError('Authoring source changed after review')
        if sha(self.original)!=self.s['original']['blendSha256']:raise RuntimeError('Original scene changed')
    def guard(self):
        if (self.out/'supervisor.stop').exists()or (self.out/(self.args.phase+'.stop')).exists():raise RuntimeError('Private task STOP requested')
        if remaining_seconds(self.run,time.time(),int(self.k.GetTickCount64()))<=0:raise RuntimeError('Shared authoring deadline reached')
    def ready(self):
        marker=self.out/(self.args.phase+'.author-ready.json')
        while not marker.exists():self.guard();time.sleep(.05)
        barrier=json.loads(marker.read_text());self.guard()
        if barrier['phase']!=self.args.phase or barrier['nonce']!=self.args.nonce or barrier['child']['pid']!=os.getpid()or barrier['sourcePins']!=self.run['sourcePins']or barrier['deadlineEpoch']!=self.run['deadlineEpoch']or barrier['deadlineTickMs']!=self.run['deadlineTickMs']:raise RuntimeError('Registered guarded authoring barrier mismatch')
        import bpy
        if bpy.app.version!=(4,5,15)or bpy.app.build_hash.decode()!=self.s['tool']['buildHash']:raise RuntimeError('Pinned Blender version/build mismatch')
        self.bpy=bpy;expected=self.out/('original-copy.blend'if self.args.phase=='prepare'else'surface-source.blend')
        if Path(bpy.data.filepath).resolve()!=expected:raise RuntimeError('Only the guarded fresh scene copy may be opened')
    def objects(self):
        sc=self.bpy.context.scene;names=self.s['original'];return(sc,self.bpy.data.objects[names['domainName']],self.bpy.data.objects[names['groundName']],self.bpy.data.objects[names['sourceName']])
    def grid_input(self):
        file=ROOT/self.s['original']['gridSummary']
        if sha(file)!=self.s['original']['gridSummarySha256']:raise RuntimeError('Pinned original grid-summary changed')
        d=json.loads(file.read_text());return {'resolution':d['resolution'],'origin':d['gridOrigin'],'spacing':d['voxelSize']}
    def prepare(self):
        bpy=self.bpy;scene,domain,ground,source=self.objects();ds=domain.modifiers['MantaflowContactGas'].domain_settings;fs=source.modifiers['FiniteGrassInflow'].flow_settings
        if scene.frame_current!=1:raise RuntimeError('Pinned saved scene is not at observed initial frame')
        # Redirect before ANY curve evaluation or solver/source edit.
        old_cache=str(ds.cache_directory);cache=self.out/'cache';cache.mkdir(exist_ok=False);readbacks=[set_observed(ds,'cache_directory',str(cache))]
        if Path(ds.cache_directory).resolve()!=cache:raise RuntimeError('Fresh cache redirection did not persist')
        before=capture(scene,domain,ground,source)
        dm=domain.modifiers['MantaflowContactGas'];original_visibility=[dm.show_viewport,dm.show_render]
        dm.show_viewport=False;dm.show_render=False
        try:
            scene.frame_set(2);active={name:float(getattr(fs,name))for name in ['fuel_amount','density','temperature']};flow_type=fs.flow_type;scene.frame_set(1)
            if flow_type!='BOTH'or any(not math.isfinite(v)or v<=0 for v in active.values()):raise RuntimeError('Actual original active BOTH inputs unavailable')
            original_global=float(ds.vorticity);readbacks.append(set_observed(ds,'vorticity',.25))
            polygon=self.s['source']['polygon'];faces=triangulate(polygon)
            from mathutils import Vector
            inverse=source.matrix_world.inverted();wanted=[[x,y,self.s['source']['planeZ']]for x,y in polygon];local=[inverse@Vector(p)for p in wanted]
            mesh=bpy.data.meshes.new('SurfaceSource1893');mesh.from_pydata(local,[],faces);mesh.update();source.data=mesh
            source.animation_data_clear()
            for name,value in [('use_plane_init',True),('volume_density',0.0),('surface_distance',.5)]:readbacks.append(set_observed(fs,name,value))
            for frame in range(1,194):
                self.guard();values=expected_inputs(frame,self.s,active)
                for name in ['use_inflow','fuel_amount','density','temperature']:
                    set_observed(fs,name,values[name]);fs.keyframe_insert(data_path=name,frame=frame)
            action=source.animation_data.action if source.animation_data else None
            if action is None:raise RuntimeError('Source action was not created')
            for curve in action.fcurves:
                for key in curve.keyframe_points:key.interpolation='CONSTANT'if curve.data_path.endswith('use_inflow')else'LINEAR'
            curve=[]
            for frame in range(1,194):
                self.guard();scene.frame_set(frame);wanted_inputs=expected_inputs(frame,self.s,active);observed={name:getattr(fs,name)for name in ['use_inflow','fuel_amount','density','temperature']}
                for name,value in observed.items():
                    expected=wanted_inputs[name]if name=='use_inflow'else f32(wanted_inputs[name])
                    if value!=expected:raise RuntimeError('Evaluated source curve differs at frame'+str(frame)+':'+name)
                curve.append({'frame':frame,'age':wanted_inputs['age'],**observed})
        finally:
            scene.frame_set(1);dm.show_viewport,dm.show_render=original_visibility
        scene.frame_set(1);actual_vertices=[[float(v)for v in source.matrix_world@vertex.co]for vertex in mesh.vertices]
        if any(max(abs(a-b)for a,b in zip(p,q))>1e-7 for p,q in zip(actual_vertices,wanted)):raise RuntimeError('Source geometry did not preserve requested native metres')
        if any(abs(v[2]-actual_vertices[0][2])>1e-10 for v in actual_vertices)or any(p.normal.z<=0 for p in mesh.polygons):raise RuntimeError('Actual source is not a flat upward plane')
        prediction=plan_report(self.s,self.grid_input(),actual_vertices);after=capture(scene,domain,ground,source)
        expected={'domainSettings.cache_directory':str(cache),'domainSettings.vorticity':.25,'sourceSettings.use_plane_init':True,'sourceSettings.volume_density':0.0,'sourceSettings.surface_distance':.5,'sourceSettings.use_inflow':False,'sourceSettings.fuel_amount':0.0,'sourceSettings.density':0.0,'sourceSettings.temperature':0.0,'sourceObject.data':after['sourceObject']['data'],'sourceObject.dimensions':after['sourceObject']['dimensions']}
        expected.update({'sourceMesh.'+key:value for key,value in after['sourceMesh'].items()});diff=compare_actual(before,after,expected)
        report={'version':1,'status':'actual-preparation-observations-no-bake-approval','originalBlendSha256':self.s['original']['blendSha256'],'cacheRedirectBeforeEvaluation':{'originalObserved':old_cache,'newObserved':str(cache)},'curveIsolation':{'domainModifierDisabledDuringSourceOnlyEvaluation':True,'originalModifierFlags':original_visibility,'restoredBeforeStateComparisonAndSave':[dm.show_viewport,dm.show_render],'fluidBakeOperatorCalled':False},'activeOriginalBOTH':active,'originalGlobalVorticity':original_global,'preparedGlobalVorticity':float(ds.vorticity),'requestedTypedObserved':readbacks,'baselineActualState':before,'preparedActualState':after,'declaredPropertyDelta':expected,'actualStateComparison':diff,'sourceGeometryRequested':wanted,'geometricKernelPrediction':prediction,'gridPredictionBasis':'Pinned old actual grid with unchanged copied domain; the new bake must independently match it','evaluatedCurve':curve,'deleteInObstacle':{'original':before['domainSettings'].get('delete_in_obstacle'),'prepared':after['domainSettings'].get('delete_in_obstacle'),'clearanceProof':False},'nativeVisibility':'not rendered; phase180 and smoothfinal.2 remain required','sourcePins':self.run['sourcePins']}
        save(self.out/'prepare.json',report)
        if not diff['passed']:raise RuntimeError('Unexpected actual original-state delta; see prepare.json')
        if (ds.resolution_max,ds.cache_frame_start,ds.cache_frame_end,ds.cache_data_format,ds.openvdb_data_depth)!=(96,1,193,'OPENVDB','32'):raise RuntimeError('Copied grid/cache recipe does not match contract')
        if (scene.render.fps,scene.render.fps_base,scene.frame_start,scene.frame_end,scene.render.threads_mode,scene.render.threads)!=(30,1.0,1,193,'FIXED',4):raise RuntimeError('Original actual clock/thread state differs from reviewed recipe')
        if (ds.time_scale,ds.timesteps_min,ds.timesteps_max,ds.cfl_condition,ds.use_adaptive_domain,ds.use_noise)!=(1.0,2,2,2.0,False,False):raise RuntimeError('Original actual solver time/resolution settings differ; no reconstruction')
        target=self.out/'surface-source.blend'
        if target.exists():raise RuntimeError('Prepared scene already exists; no overwrite/retry')
        self.guard();bpy.ops.wm.save_as_mainfile(filepath=str(target));report['preparedBlendSha256']=sha(target);report['observedValid']=True;save(self.out/'prepare.json',report)
        if sha(self.original)!=self.s['original']['blendSha256']:raise RuntimeError('Original scene changed during preparation')
        print('SURFACE_PREPARED_NO_BAKE_PERMISSION',flush=True)
    def bake_export(self):
        bpy=self.bpy;scene,domain,ground,source=self.objects();ds=domain.modifiers['MantaflowContactGas'].domain_settings
        if sha(self.out/'surface-source.blend')!=self.run['preparedBlendSha256']or sha(self.out/'prepare.json')!=self.run['prepareReportSha256']:raise RuntimeError('Prepared state no longer matches explicit bake permit')
        prepared=json.loads((self.out/'prepare.json').read_text());scene.frame_set(1)
        current=capture(scene,domain,ground,source);recheck=compare_actual(prepared['preparedActualState'],current,{})
        save(self.out/'bake-state-recheck.json',recheck)
        if not recheck['passed']:raise RuntimeError('Prepared actual scene changed before the sole bake')
        if Path(ds.cache_directory).resolve()!=self.out/'cache':raise RuntimeError('Baking may only target fresh task cache')
        self.guard();bpy.ops.object.select_all(action='DESELECT');domain.select_set(True);bpy.context.view_layer.objects.active=domain
        def progress(sc):save(self.out/'progress.json',{'phase':'bake','frame':sc.frame_current,'atEpoch':time.time()});self.guard()
        bpy.app.handlers.frame_change_post.append(progress)
        try:result=bpy.ops.fluid.bake_data()
        finally:bpy.app.handlers.frame_change_post.remove(progress)
        if result!={'FINISHED'}or not ds.has_cache_baked_data:raise RuntimeError('The sole bake did not finish')
        fields=self.out/'fields';fields.mkdir(exist_ok=False);records=[];flame_curve=[];old_grid=self.grid_input();reaction_boundary=False;below=False;initial_zero=True
        for frame in range(1,194):
            self.guard();scene.frame_set(0 if frame==1 else frame-1);scene.frame_set(frame);bpy.context.view_layer.update();data=domain.evaluated_get(bpy.context.evaluated_depsgraph_get()).modifiers['MantaflowContactGas'].domain_settings
            resolution=list(data.domain_resolution);spacing=list(data.cell_size);count=math.prod(resolution)
            if resolution!=old_grid['resolution']or spacing!=old_grid['spacing']:raise RuntimeError('New actual resolution/spacing differs from preserved original')
            from mathutils import Vector
            corners=[domain.matrix_world@Vector(p)for p in domain.bound_box];bounds={'min':[min(p[k]for p in corners)for k in range(3)],'max':[max(p[k]for p in corners)for k in range(3)]};origin=[bounds['min'][k]+spacing[k]/2 for k in range(3)]
            if origin!=old_grid['origin']:raise RuntimeError('Actual scalar-centre mapping changed; no fitted shifts')
            channels={};supports={}
            for name,property_name in [('density','density_grid'),('temperature','temperature_grid'),('flame','flame_grid')]:
                self.guard();values=array.array('f',getattr(data,property_name))
                if len(values)!=count:raise RuntimeError('Missing full-sized actual '+name+' array')
                stats=scalar_stats(values)
                if frame==1 and stats['nonzero']!=0:initial_zero=False
                raw=little_endian_bytes(values);file=fields/(name+'-'+str(frame).zfill(3)+'.f32')
                with file.open('xb')as stream:stream.write(raw)
                channels[name]={'path':file.relative_to(self.out).as_posix(),'bytes':len(raw),'sha256':hashlib.sha256(raw).hexdigest(),**stats}
                if name in ['density','flame']:supports[name]=positive_support(values,resolution,origin,spacing,self.s['source']['contactBandHeight'])
                if name=='flame':
                    nx,ny,nz=resolution;bad_ground=sum(1 for i,v in enumerate(values)if v>0 and origin[2]+(i//(nx*ny))*spacing[2]<0);boundary=sum(1 for i,v in enumerate(values)if v>0 and(i%nx in [0,nx-1]or(i//nx)%ny in [0,ny-1]or i//(nx*ny)in [0,nz-1]))
                    reaction_boundary|=boundary>0;below|=bad_ground>0;flame_curve.append({'frame':frame,'age':(frame-1)/30,'min':stats['min'],'max':stats['max'],'nonzero':stats['nonzero'],'positive':stats['positive'],'integral':sum(values)*math.prod(spacing),'belowGroundPositive':bad_ground,'boundaryPositive':boundary})
            records.append({'frame':frame,'ageSeconds':(frame-1)/30,'resolution':resolution,'voxelSize':spacing,'scalarCentreOriginBlender':origin,'domainBoundsBlender':bounds,'contactBandHeight':self.s['source']['contactBandHeight'],'channels':channels,'support':supports});save(self.out/'progress.json',{'phase':'export','frame':frame,'age':(frame-1)/30,'atEpoch':time.time()})
        terminal=terminal_report(flame_curve,self.s);terminal['initialAllThreeChannelsActuallyZero']=initial_zero;terminal['rawGatesPassed']&=initial_zero
        if not initial_zero:terminal['failures'].append('Initial actual fields are not all zero; no preroll or fabrication permitted')
        save(self.out/'raw-validation.json',terminal)
        manifest={'version':1,'id':self.s['id'],'scope':'Original actual authoring fields only; no asset placeholder, native acceptance or optimization','status':'raw-export-valid-awaits-independent-review'if terminal['rawGatesPassed']else'raw-export-failed-preserved','tool':self.s['tool'],'sourcePins':self.run['sourcePins'],'sourceBlendSha256':self.run['preparedBlendSha256'],'originalBlendSha256':self.s['original']['blendSha256'],'sampleCount':193,'samples':records,'initialConditionObservedZero':initial_zero,'ageRange':[0,6.4],'burnAgeRange':[0,3.2],'tailMaximum':3.2,'boundaryReactionFailed':reaction_boundary,'belowGroundReactionFailed':below,'upperOverhangApproved':False,'scalarFormat':'Original observed f32LE Xfastest,YthenZ; no quantization/crop/terminal overwrite','scalarOrigin':'Actual domainMin+cell_size/2; no mesh modifier offset','canonicalSource':self.s['source'],'cachePrecision':{'requested':'32','observed':ds.openvdb_data_depth},'terminalValidation':terminal}
        save(self.out/'raw-manifest.json',manifest);self.guard()
        if sha(self.original)!=self.s['original']['blendSha256']:raise RuntimeError('Original saved scene changed')
        if not terminal['rawGatesPassed']:raise RuntimeError('Actual raw gates failed; preserve full data, no retry or integration')
        print('SURFACE_RAW_EXPORT_FINISHED_NOT_VISUALLY_ACCEPTED',flush=True)

def main():
    parser=argparse.ArgumentParser();parser.add_argument('--phase',choices=['prepare','bake'],required=True);parser.add_argument('--settings',required=True);parser.add_argument('--output',required=True);parser.add_argument('--nonce',required=True);a=parser.parse_args(sys.argv[sys.argv.index('--')+1:]);author=None
    try:
        author=Author(a);author.ready();author.prepare()if a.phase=='prepare'else author.bake_export()
    except BaseException as exc:
        if author is not None:save(author.out/(a.phase+'-failure.json'),{'error':str(exc),'traceback':traceback.format_exc(),'atEpoch':time.time(),'validForIntegration':False})
        raise
if __name__=='__main__':main()
