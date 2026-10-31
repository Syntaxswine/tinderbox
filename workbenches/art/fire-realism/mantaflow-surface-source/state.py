"""Actual writable-RNA/geometry observations and strict declared-delta checks."""
import hashlib,json,math

def normal(value):
    if value is None or isinstance(value,(str,bool,int)):return value
    if isinstance(value,float):
        if not math.isfinite(value):raise ValueError('Nonfinite actual RNA state')
        return value
    if isinstance(value,(set,frozenset)):
        # RNA enum flags are unordered; Python hash seeds differ across the
        # separate prepare/bake processes. Preserve vector/matrix order below.
        return sorted((normal(v)for v in value),key=lambda v:json.dumps(v,sort_keys=True,separators=(',',':')))
    if hasattr(value,'bl_rna'):return {'rnaType':value.bl_rna.identifier,'name':getattr(value,'name',None)}
    try:return [normal(v)for v in value]
    except TypeError:raise ValueError('Unsupported actual RNA value:'+type(value).__name__)

def rna_properties(obj):
    result={}
    for prop in obj.bl_rna.properties:
        if prop.is_readonly or prop.identifier=='rna_type' or prop.type=='COLLECTION':continue
        if prop.type not in ['BOOLEAN','INT','FLOAT','ENUM','STRING','POINTER']:raise ValueError('Unreviewed writable RNA type:'+prop.identifier)
        try:result[prop.identifier]=normal(getattr(obj,prop.identifier))
        except Exception as exc:raise ValueError('Cannot capture writable RNA:'+prop.identifier)from exc
    return result

def nested_physics(ds):
    if not hasattr(ds,'effector_weights')or ds.effector_weights is None:raise ValueError('Actual nested domain effector weights unavailable')
    return {'effector_weights':rna_properties(ds.effector_weights)}

def mesh_record(obj):
    data={'vertices':[[float(v)for v in p.co]for p in obj.data.vertices],'polygons':[list(p.vertices)for p in obj.data.polygons]}
    return {'name':obj.data.name,'vertices':len(data['vertices']),'polygons':len(data['polygons']),'sha256':hashlib.sha256(json.dumps(data,separators=(',',':')).encode()).hexdigest()}

def capture(scene,domain,ground,source):
    ds=domain.modifiers['MantaflowContactGas'].domain_settings;gs=ground.modifiers['StationaryGroundEffector'].effector_settings;fs=source.modifiers['FiniteGrassInflow'].flow_settings
    return {'scene':rna_properties(scene),'render':rna_properties(scene.render),'units':rna_properties(scene.unit_settings),'domainObject':rna_properties(domain),'groundObject':rna_properties(ground),'sourceObject':rna_properties(source),'domainSettings':rna_properties(ds),'domainNestedPhysics':nested_physics(ds),'groundSettings':rna_properties(gs),'sourceSettings':rna_properties(fs),'domainMesh':mesh_record(domain),'groundMesh':mesh_record(ground),'sourceMesh':mesh_record(source),'domainWorld':normal(domain.matrix_world),'groundWorld':normal(ground.matrix_world),'sourceWorld':normal(source.matrix_world),'domainDimensions':normal(domain.dimensions),'domainBounds':[[float(v)for v in corner]for corner in domain.bound_box],'groundDimensions':normal(ground.dimensions),'modifiers':{obj.name:[{'name':m.name,'type':m.type,'show_viewport':m.show_viewport,'show_render':m.show_render}for m in obj.modifiers]for obj in [domain,ground,source]},'volatileCache':{name:normal(getattr(ds,name))for name in ['domain_resolution','cell_size','has_cache_baked_data','cache_frame_pause_data']}}

def flatten(value,prefix=''):
    result={}
    for key,item in value.items():
        path=prefix+'.'+key if prefix else key
        if isinstance(item,dict)and not ('rnaType'in item):result.update(flatten(item,path))
        else:result[path]=item
    return result

def compare_actual(before,after,expected):
    a=flatten(before);b=flatten(after);changes=[];errors=[]
    for key in sorted(set(a)|set(b)):
        if key.startswith('volatileCache.'):continue
        if key not in a or key not in b:errors.append('actual state shape changed:'+key);continue
        if a[key]!=b[key]:
            changes.append({'path':key,'before':a[key],'after':b[key]})
            if key not in expected or b[key]!=expected[key]:errors.append('undeclared actual property change:'+key)
    for key,value in expected.items():
        if key not in b or b[key]!=value:errors.append('declared prepared property not observed:'+key)
    return {'passed':not errors,'differences':changes,'errors':errors,'volatileBefore':before.get('volatileCache'),'volatileAfter':after.get('volatileCache'),'comparison':'All serialized writable primitive/pointer RNA plus original transforms/mesh hashes; read-only cache state reported separately. No default reconstruction.'}
