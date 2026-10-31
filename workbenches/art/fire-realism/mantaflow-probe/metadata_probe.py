"""Read-only metadata from the existing probe cache. No bake or mesh export."""
import argparse,bpy,hashlib,json,sys,time,traceback
from pathlib import Path
from mathutils import Vector
p=argparse.ArgumentParser();p.add_argument('--phase');p.add_argument('--settings');p.add_argument('--output');p.add_argument('--permit');p.add_argument('--stop');a=p.parse_args(sys.argv[sys.argv.index('--')+1:]);out=Path(a.output)
def guard():
 if Path(a.stop).exists()or time.time()>=json.loads((out/'run.json').read_text())['deadlineEpoch']:raise RuntimeError('Metadata task stopped/deadline')
def matrix(m):return [[float(v)for v in row]for row in m]
def sha(path):return hashlib.sha256(path.read_bytes()).hexdigest()
start=time.monotonic()
while not Path(a.permit).exists():
 if time.monotonic()-start>90:raise RuntimeError('No guarded registration permit')
 guard();time.sleep(.05)
try:
 guard();manifest=json.loads((out/'export-manifest.json').read_text());cache=out/manifest['vdb']['path'];before_hash=sha(cache)
 if before_hash!=manifest['vdb']['sha256']:raise RuntimeError('Existing cache identity changed')
 scene=bpy.context.scene;domain=bpy.data.objects['ProbeGasDomain'];scene.frame_set(12);scene.frame_set(13);bpy.context.view_layer.update();original=domain.modifiers['ActualMantaflowGas'].domain_settings;evaluated=domain.evaluated_get(bpy.context.evaluated_depsgraph_get()).modifiers['ActualMantaflowGas'].domain_settings
 corners=[domain.matrix_world@Vector(c)for c in domain.bound_box]
 def rna(value):
  try:return list(value)
  except TypeError:return value
 before=set(bpy.data.objects);bpy.ops.object.volume_import(filepath=str(cache));volume=next(o for o in bpy.data.objects if o not in before);volume.data.is_sequence=False;volume.data.grids.load();bpy.context.view_layer.update();grids=[]
 for grid in volume.data.grids:
  if grid.name not in ['flame','density','temperature']:continue
  native=grid.matrix_object;chain=volume.matrix_world@native;grids.append({'name':grid.name,'matrixObject':matrix(native),'volumeMatrixWorld':matrix(volume.matrix_world),'indexToImportedWorld':matrix(chain),'index000Object':list(native@Vector((0,0,0))),'index000ImportedWorld':list(chain@Vector((0,0,0))),'index100ImportedWorld':list(chain@Vector((1,0,0))),'index010ImportedWorld':list(chain@Vector((0,1,0))),'index001ImportedWorld':list(chain@Vector((0,0,1)))})
 if len(grids)!=3:raise RuntimeError('Required named grids absent')
 guard()
 if sha(cache)!=before_hash:raise RuntimeError('Read-only cache hash changed')
 report={'scope':'Read-only existing-cache metadata; no simulation, export repair, transform fitting or previous output edits.','tool':{'version':bpy.app.version_string,'buildHash':bpy.app.build_hash.decode()},'sourceVdb':{'path':manifest['vdb']['path'],'sha256Before':before_hash,'sha256After':sha(cache)},'sourceBlendSha256':sha(out/'probe.blend'),'frame':13,'domain':{'matrixWorld':matrix(domain.matrix_world),'physicalBounds':{'min':[min(v[i]for v in corners)for i in range(3)],'max':[max(v[i]for v in corners)for i in range(3)]},'dimensions':list(domain.dimensions),'originalCellSize':rna(original.cell_size),'evaluatedCellSize':rna(evaluated.cell_size),'originalResolution':list(original.domain_resolution),'evaluatedResolution':list(evaluated.domain_resolution),'cacheDirectory':original.cache_directory},'importedVolume':{'matrixWorld':matrix(volume.matrix_world),'boundBoxLocal':[list(c)for c in volume.bound_box]},'namedGrids':grids,'note':'matrix_object is the actual public Blender voxel-index-to-object matrix. ImportedVolume uses its untouched import transform. No assumption is made here about index corners/centres relative to the solver domain.'}
 (out/'metadata.json').write_text(json.dumps(report,indent=2)+'\n',encoding='utf-8');print('READ_ONLY_METADATA_OK',flush=True)
except BaseException as e:
 (out/'metadata-failure.json').write_text(json.dumps({'error':str(e),'traceback':traceback.format_exc()},indent=2)+'\n',encoding='utf-8');raise
