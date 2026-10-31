"""Pure authoring units/clock/grid audit helpers; no Blender or custom solver."""
import array, hashlib, math, sys

def sample_age(frame,sim):
    if not sim['firstFrame'] <= frame <= sim['lastFrame']:
        raise ValueError('Cache frame outside the finite asset')
    return (frame-sim['firstFrame'])/sim['fps']

def source_gain(age,sim):
    if not 0 < age < sim['burnSeconds']:
        return 0.0
    x=max(0.0,min(1.0,(sim['burnSeconds']-age)/sim['fuelTaperSeconds']))
    return x*x*(3-2*x)

def centre(index,resolution,origin,spacing):
    nx,ny,nz=resolution
    if index < 0 or index >= nx*ny*nz:
        raise ValueError('Invalid voxel index')
    return [origin[0]+index%nx*spacing[0],origin[1]+(index//nx)%ny*spacing[1],origin[2]+index//(nx*ny)*spacing[2]]

def native_point(point,translation=(5.5,0,8.5)):
    return [point[0]+translation[0],point[2]+translation[1],-point[1]+translation[2]]

def little_endian_bytes(values):
    data=array.array('f',values)
    if sys.byteorder!='little':
        data.byteswap()
    return data.tobytes()

def scalar_stats(values):
    if not values or any(not math.isfinite(v)for v in values):
        raise ValueError('Empty/nonfinite scalar data')
    return {'min':min(values),'max':max(values),'nonzero':sum(v!=0 for v in values),'positive':sum(v>0 for v in values)}

def positive_support(values,resolution,origin,spacing,contact_height,patch_half=.5):
    nx,ny,nz=resolution
    if len(values)!=nx*ny*nz:
        raise ValueError('Full-sized grid required')
    lo=[math.inf]*3;hi=[-math.inf]*3;faces={name:0 for name in ['xMin','xMax','yMin','yMax','zMin','zMax']};layers=[None]*nz;contact_outside=0;count=0
    for index,value in enumerate(values):
        if value<=0:
            continue
        count+=1;ix=index%nx;iy=(index//nx)%ny;iz=index//(nx*ny);p=centre(index,resolution,origin,spacing)
        for axis in range(3):
            lo[axis]=min(lo[axis],p[axis]);hi[axis]=max(hi[axis],p[axis])
        for name,hit in [('xMin',ix==0),('xMax',ix==nx-1),('yMin',iy==0),('yMax',iy==ny-1),('zMin',iz==0),('zMax',iz==nz-1)]:
            if hit:faces[name]+=1
        if p[2]<=contact_height and (abs(p[0])>patch_half or abs(p[1])>patch_half):contact_outside+=1
        if layers[iz] is None:layers[iz]={'minXY':[ix,iy],'maxXY':[ix,iy],'positiveVoxels':0}
        layer=layers[iz];layer['positiveVoxels']+=1
        for axis,coordinate in enumerate([ix,iy]):
            layer['minXY'][axis]=min(layer['minXY'][axis],coordinate);layer['maxXY'][axis]=max(layer['maxXY'][axis],coordinate)
    bounds=None if count==0 else {'min':lo,'max':hi}
    halo=None if bounds is None else {'min':[lo[i]-spacing[i]for i in range(3)],'max':[hi[i]+spacing[i]for i in range(3)]}
    return {'positiveVoxels':count,'positiveCentreBoundsBlender':bounds,'oneVoxelHaloBoundsBlender':halo,'boundaryVoxels':faces,'hasBoundaryReaction':any(faces.values()),'lowerBandOutsidePatchVoxels':contact_outside,'layers':layers,'threshold':0}
