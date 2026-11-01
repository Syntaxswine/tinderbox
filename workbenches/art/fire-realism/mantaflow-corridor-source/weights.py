"""One frozen surface-weight profile, plain readback checks and predictions.
No bpy/scene/controller import, stored field access or solver implementation.
"""
import hashlib,json,math,struct
from surface import triangulate,cross,contains,kernel_influence
GROUP_NAME='TinderboxSurfaceFeed1893'
PROFILE_ID='unequal-resolved-surface-feed-v1'
FROZEN_WEIGHTS=(1.,1.,1.,.875,.875,.375,.25,.375,.25,.0625,.5,.75,.625,.375,.125,.0625,.125,.375,.5,.375,.125,.125,.375,.75,1.)
READBACK_FRAMES=(1,2,91,193)
def need(v,message):
    if not v:raise ValueError(message)
def f32(v):return struct.unpack('<f',struct.pack('<f',v))[0]
def bits(v):return struct.pack('<f',v).hex()
def digest(value):return hashlib.sha256(json.dumps(value,sort_keys=True,separators=(',',':')).encode()).hexdigest()

def profile_values(profile):
    n=profile['vertexCount'];rows=profile['vertexWeights']
    need(type(n)is int and n>0 and len(rows)==n,'Complete explicit vertex mapping required')
    need([r['vertex']for r in rows]==list(range(n)),'Unique ordered source vertex indices required')
    values=[]
    for r in rows:
        need(set(r)=={'vertex','weight'}and type(r['vertex'])is int,'Unexpected vertex-weight record')
        w=r['weight'];need(type(w)is float and math.isfinite(w)and 0<=w<=1,'Finite typed FLOAT weights in[0,1] required');values.append(w)
    zeros=[i for i,w in enumerate(values)if w==0]
    need(profile['deliberateZeroIndices']==zeros,'Every deliberate zero must be declared')
    need(any(w>0 for w in values),'An entirely zero/missing-deform source is unsupported')
    return values

def validate_frozen_profile(profile,source):
    values=profile_values(profile)
    need(set(profile)=={'id','objectName','groupName','groupIndex','vertexCount','vertexWeights','deliberateZeroIndices','triangleIndexMap','rationale'},'Unexpected frozen profile schema')
    need(profile['id']==PROFILE_ID and profile['objectName']=='CanonicalFourCellBed'and profile['groupName']==GROUP_NAME and type(profile['groupIndex'])is int and profile['groupIndex']==0,'Exact fixed object/group/index identity required')
    need(profile['vertexCount']==25 and tuple(values)==FROZEN_WEIGHTS,'Only the reviewed single25-vertex profile is permitted')
    need(profile['triangleIndexMap']==triangulate(source['polygon']),'Profile/triangulation index mapping changed')
    return values

def expected_record(profile):
    values=profile_values(profile);g=profile['groupIndex']
    return {'objectName':profile['objectName'],'vertexCount':len(values),'groups':[{'index':g,'name':profile['groupName']}],
            'vertices':[{'vertex':i,'memberships':[{'group':g,'weight':f32(w)}]}for i,w in enumerate(values)]}

def verify_blank_record(record,profile):
    need(set(record)=={'objectName','vertexCount','groups','vertices'},'Unexpected original group observation schema')
    need(record['objectName']==profile['objectName']and record['groups']==[],'Original source has groups/name collision; never delete them to reach index0')
    need(type(record['vertexCount'])is int and record['vertexCount']>0 and all(set(r)=={'vertex','memberships'}and type(r['vertex'])is int for r in record['vertices'])and [r['vertex']for r in record['vertices']]==list(range(record['vertexCount'])),'Original source vertex map unavailable')
    need(all(r['memberships']==[]for r in record['vertices']),'Unexpected original deform memberships')
    return True

def verify_record(record,profile):
    values=profile_values(profile);g=profile['groupIndex']
    need(set(record)=={'objectName','vertexCount','groups','vertices'},'Unexpected group observation schema')
    need(record['objectName']==profile['objectName']and type(record['vertexCount'])is int and record['vertexCount']==len(values),'Observed object/vertex extent mismatch')
    need(record['groups']==[{'index':g,'name':profile['groupName']}]and type(record['groups'][0]['index'])is int,'Named group/index missing, renamed or collided')
    need(all(type(r['vertex'])is int for r in record['vertices'])and [r['vertex']for r in record['vertices']]==list(range(len(values))),'Complete unique observed vertex-index map required')
    missing_zero=[];observed=[]
    for i,row in enumerate(record['vertices']):
        need(set(row)=={'vertex','memberships'},'Unexpected observed vertex schema')
        members=row['memberships'];need(isinstance(members,list),'Deform memberships unavailable')
        if not members:
            need(values[i]==0 and i in profile['deliberateZeroIndices'],'Missing positive deform membership; weighting could be silently skipped')
            missing_zero.append(i);observed.append(0.);continue
        need(len(members)==1 and set(members[0])=={'group','weight'}and type(members[0]['group'])is int and members[0]['group']==g,'Foreign/duplicate deform membership')
        v=members[0]['weight'];need(type(v)is float and math.isfinite(v)and v==f32(values[i])and bits(v)==bits(values[i]),'Observed weight/float32 bits differ from frozen target')
        observed.append(v)
    need(any(v>0 for v in observed),'Entire effective deform layer unavailable')
    return {'observedFloat32Bits':[bits(v)for v in observed],'documentedAbsentZeroMemberships':missing_zero,'positiveMemberships':sum(v>0 for v in observed)}

def verify_pair(e,settings):
    profile=settings['emissionWeights'];validate_frozen_profile(profile,settings['source'])
    a=verify_record(e['original'],profile);b=verify_record(e['evaluated'],profile)
    flags={'density_vertex_group':profile['groupName'],'volume_density':0.0,'use_absolute':True,'use_plane_init':True,'surface_distance':.5,'flow_type':'BOTH'}
    need(e['flowFlags']==flags and e['flowFlags']['use_absolute']is True and e['flowFlags']['use_plane_init']is True and type(e['flowFlags']['volume_density'])is float and type(e['flowFlags']['surface_distance'])is float,'Actual flow flags/group selector changed')
    need(e.get('evaluatedId')is True and type(e['frame'])is int,'Actual evaluated source/frame witness required')
    for key in ['originalMesh','evaluatedMesh']:
        need(e[key]['vertices']==25 and e[key]['polygons']==len(profile['triangleIndexMap']),'Original/evaluated mesh extent changed')
    need(e['originalMesh']['sha256']==e['evaluatedMesh']['sha256'],'Evaluated vertices/faces/index order differs')
    need(e['originalWorld']==e['evaluatedWorld'],'Evaluated source transform differs')
    need(all(len(e[k])==2 and all(type(v)is bool for v in e[k])for k in ['domainFlagsDuring','domainFlagsBefore','domainFlagsAfter'])and e['domainFlagsDuring']==[False,False]and e['domainFlagsBefore']==e['domainFlagsAfter'],'Domain evaluation isolation/restoration failed')
    need(a['observedFloat32Bits']==b['observedFloat32Bits'],'Original/evaluated profile differs')
    return {'frame':e['frame'],'original':a,'evaluated':b,'cppOneBasedGroupIndexExpected':profile['groupIndex']+1,
            'internalIndexMeaning':'Expected from pinned RNA/C++ mapping, not direct internal field readback','effectiveInputGridProof':False}

def verify_preparation(report,settings):
    profile=settings['emissionWeights'];validate_frozen_profile(profile,settings['source'])
    verify_blank_record(report['baselineActualState']['sourceVertexGroups'],profile)
    need(report['baselineActualState']['sourceSettings']['density_vertex_group']=='','Original RNA group selector was not blank')
    expected=expected_record(profile);after=report['preparedActualState']
    need(after['sourceVertexGroups']==expected,'Prepared group state is not the explicit frozen target')
    need(after['sourceSettings']['density_vertex_group']==profile['groupName'],'Prepared selector mismatch')
    rows=report['weightReadbacks'];need(set(rows)==set(map(str,READBACK_FRAMES)),'All four selected static/evaluated frame witnesses required')
    for frame in READBACK_FRAMES:
        row=rows[str(frame)];need(row['frame']==frame,'Readback frame mismatch');verify_pair(row,settings)
        need(all(after['sourceSettings'].get(k)==v and type(after['sourceSettings'].get(k))is type(v)for k,v in row['flowFlags'].items()),'Group witness flow flags not bound to prepared state')
        need(row['original']==expected and row['originalMesh']==after['sourceMesh']and row['originalWorld']==after['sourceWorld'],'Witness not bound to prepared mesh/world/profile')
    return {'kind':'strict-weighted-source-preparation-witness-v1','passed':True,'profileSha256':digest(profile),'frames':list(READBACK_FRAMES),
            'vertexCount':25,'originalAndEvaluated':True,'float32BitMatched':True,'cppOneBasedGroupIndexExpected':1,'effectiveInputGridProof':False}

def interpolate(weights,bary):
    need(len(weights)==3 and len(bary)==3 and all(math.isfinite(v)for v in [*weights,*bary]),'Finite triangular data required')
    need(min(bary)>=-1e-12 and abs(sum(bary)-1)<1e-10,'Barycentric weights must span a triangle')
    return sum(w*b for w,b in zip(weights,bary))

def targets(E,active):
    need(math.isfinite(E)and 0<=E<=1,'Reviewed geometric E range required')
    return {'fuelTarget':E*active['fuel_amount'],'densityTarget':E*active['density'],
            'heatGate':E>0,'requestedHeatScalar':active['temperature']if E>0 else None,
            'reactionSurfaceFalloff':1-(1-E)**2,
            'meaning':'Targets/predicate only; absolute-mode max/current-field checks and react/fuel mixing are NOT observed here'}

def closest_mask(point,poly,faces,weights):
    if contains(point,poly):
        for face in faces:
            a,b,c=[poly[i]for i in face];den=cross(a,b,c)
            bary=[cross(point,b,c)/den,cross(a,point,c)/den,cross(a,b,point)/den]
            if min(bary)>=-1e-12:
                bary=[max(0,v)for v in bary];total=sum(bary);return interpolate([weights[i]for i in face],[v/total for v in bary])
        raise ValueError('No original source triangle spans interior point')
    best=None
    for i,a in enumerate(poly):
        j=(i+1)%len(poly);b=poly[j];dx=b[0]-a[0];dy=b[1]-a[1]
        t=max(0,min(1,((point[0]-a[0])*dx+(point[1]-a[1])*dy)/(dx*dx+dy*dy)))
        distance=math.hypot(point[0]-a[0]-t*dx,point[1]-a[1]-t*dy)
        if best is None or distance<best[0]:best=(distance,weights[i]*(1-t)+weights[j]*t)
    return best[1]

def clipped(poly,side):
    if not poly:return []
    out=[];previous=poly[-1];d0=side(previous)
    for current in poly:
        d1=side(current)
        if (d0>=0)!=(d1>=0):
            t=d0/(d0-d1);out.append([previous[k]+t*(current[k]-previous[k])for k in range(3)])
        if d1>=0:out.append(current)
        previous=current;d0=d1
    return out

def integral(poly):
    area=value=0.
    for i in range(1,len(poly)-1):
        tri=[poly[0],poly[i],poly[i+1]];a=abs(cross(*tri))/2;area+=a;value+=a*sum(p[2]for p in tri)/3
    return area,value

def prediction(settings,grid,active):
    profile=settings['emissionWeights'];w=validate_frozen_profile(profile,settings['source']);poly=settings['source']['polygon'];faces=triangulate(poly)
    triangles=[[[*poly[i],w[i]]for i in face]for face in faces]
    def summary(parts):
        area=weighted=0.
        for part in parts:a,v=integral(part);area+=a;weighted+=v
        return {'area':area,'surfaceWeightIntegral':weighted,'meanWeight':weighted/area if area else None,'positiveFootprintArea':area,
                'predictionOnly':True}
    total=summary(triangles);cells={}
    for cell in settings['source']['cells']:
        xmin=cell['x']-.25-5.5;xmax=cell['x']+.25-5.5;ymin=8.5-cell['y']-.25;ymax=8.5-cell['y']+.25
        parts=[]
        for tri in triangles:
            part=tri
            for fn in [lambda p:p[0]-xmin,lambda p:xmax-p[0],lambda p:p[1]-ymin,lambda p:ymax-p[1]]:part=clipped(part,fn)
            parts.append(part)
        cells[cell['id']]=summary(parts)
    lobes={}
    gauges=settings['source']['lobeGauges']
    for gauge in gauges:
        point=gauge['point'];parts=[]
        for tri in triangles:
            part=tri
            for other in gauges:
                if other is gauge:continue
                q=other['point'];constant=q[0]**2+q[1]**2-point[0]**2-point[1]**2
                part=clipped(part,lambda p,q=q,constant=constant:constant-2*((q[0]-point[0])*p[0]+(q[1]-point[1])*p[1]))
            parts.append(part)
        lobes[gauge['id']]={**summary(parts),'gaugeWeight':closest_mask(point,poly,faces,w)}
    features={}
    h=max(grid['spacing'])
    for name,threshold,high in [('high',.75,True),('weak',.25,False)]:
        parts=[clipped(t,lambda p:(p[2]-threshold)if high else(threshold-p[2]))for t in triangles];s=summary(parts)
        s['equivalentAreaDiameterVoxels']=2*math.sqrt(s['area']/math.pi)/h;features[name]=s
    keys=['baselineE','weightedE','baselineFuelTarget','baselineDensityTarget','baselineReactionSurfaceFalloff','fuelTarget','densityTarget','reactionSurfaceFalloff','positiveHeatGates']
    sums={key:0. for key in keys};coverage={k:0 for k in cells};heat_count=baseline_count=below=outside=0
    for part in [*cells.values(),*lobes.values()]:part['sampledTargets']={key:0. for key in keys}
    nx,ny,nz=grid['resolution'];radius=settings['source']['surfaceDistanceVoxels']*h;z=settings['source']['planeZ']
    for k in range(nz):
        pz=grid['origin'][2]+k*grid['spacing'][2]
        if abs(pz-z)>=radius:continue
        for j in range(ny):
            for i in range(nx):
                p=[grid['origin'][0]+i*grid['spacing'][0],grid['origin'][1]+j*grid['spacing'][1],pz];E0=kernel_influence(p,poly,z,radius)
                if E0<=0:continue
                baseline_count+=1;E=E0*closest_mask(p[:2],poly,faces,w);t=targets(E,active)
                terms={'baselineE':E0,'weightedE':E,'baselineFuelTarget':E0*active['fuel_amount'],'baselineDensityTarget':E0*active['density'],'baselineReactionSurfaceFalloff':1-(1-E0)**2,'fuelTarget':t['fuelTarget'],'densityTarget':t['densityTarget'],'reactionSurfaceFalloff':t['reactionSurfaceFalloff'],'positiveHeatGates':int(t['heatGate'])}
                for key,value in terms.items():sums[key]+=value
                heat_count+=int(t['heatGate']);below+=int(E>0 and pz<0)
                native=[p[0]+5.5,8.5-p[1]];key='cell:'+str(math.floor(native[0]/.5))+','+str(math.floor(native[1]/.5))
                if key in coverage:
                    coverage[key]+=int(E>0)
                    for name,value in terms.items():cells[key]['sampledTargets'][name]+=value
                else:outside+=int(E>0)
                lobe=min(gauges,key=lambda g:(p[0]-g['point'][0])**2+(p[1]-g['point'][1])**2)['id']
                for name,value in terms.items():lobes[lobe]['sampledTargets'][name]+=value
    need(all(v>0 for v in coverage.values())and not below and not outside,'Predicted coverage escapes source cells/floor')
    return {'scope':'Pure geometric mask/kernel targets, NOT Mantaflow observation, flux/mass/energy or aggregate delivery equivalence',
            'profileSha256':digest(profile),'vertexIndexWeights':[{'vertex':i,'weight':v,'float32Bits':bits(v)}for i,v in enumerate(w)],'triangleIndexMap':faces,
            'total':total,'perCell':cells,'lobeVoronoiPartitions':lobes,'resolvedFeatureAreas':features,
            'gridModel':grid,'sampledTargets':sums,'predictedPositiveCounts':coverage,'baselinePositiveCount':baseline_count,'weightedHeatGateCount':heat_count,
            'requestedHeatScalarOnPositiveE':active['temperature'],'deliberateZeroIndices':[],'predictedBelowGround':below,'predictedOutsideA':outside,
            'coupling':'Weights reduce shared E/fuel/density and nonlinear react target; positive E gates heat without multiplying temperature. Absolute-mode current/max and fuel/react mixing prevent an aggregate-dose claim.',
            'actualInputGridExposure':'UNRESOLVED; group readbacks/final DTF do not expose effective fuelIn/heatIn/transition grids'}

def verify_bake_witness(record,settings,prepared_state):
    need(record.get('kind')=='weighted-source-prebake-observation-v1','Fresh weighted pre-bake witness required')
    e=record['observation'];need(e['frame']==1,'Pre-bake source witness must use unchanged initial frame')
    proof=verify_pair(e,settings)
    need(e['original']==expected_record(settings['emissionWeights'])and e['originalMesh']==prepared_state['sourceMesh']and e['originalWorld']==prepared_state['sourceWorld'],'Reloaded effective weights/topology/world differ from prepared scene')
    return {'passed':True,'profileSha256':digest(settings['emissionWeights']),'freshOriginalAndEvaluated':True,'proof':proof,'effectiveInputGridProof':False}
