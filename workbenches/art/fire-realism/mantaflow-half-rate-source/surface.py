"""Pure surface geometry and geometric kernel predictions, NOT Mantaflow proof."""
import math

def cross(a,b,c):return (b[0]-a[0])*(c[1]-a[1])-(b[1]-a[1])*(c[0]-a[0])
def inside_triangle(p,a,b,c):return min(cross(a,b,p),cross(b,c,p),cross(c,a,p))>=-1e-12

def triangulate(poly):
    if len(poly)<3 or len(set(map(tuple,poly)))!=len(poly):raise ValueError('Simple unique source outline required')
    area=sum(a[0]*b[1]-b[0]*a[1]for a,b in zip(poly,poly[1:]+poly[:1]))/2
    if area<=0:raise ValueError('Source outline must face upward/CCW')
    for i in range(len(poly)):
        a,b=poly[i],poly[(i+1)%len(poly)]
        for j in range(i+1,len(poly)):
            if j in [i,(i+1)%len(poly)]or (j+1)%len(poly)==i:continue
            c,d=poly[j],poly[(j+1)%len(poly)]
            if cross(a,b,c)*cross(a,b,d)<0 and cross(c,d,a)*cross(c,d,b)<0:raise ValueError('Self-crossing source outline')
    remaining=list(range(len(poly)));faces=[]
    while len(remaining)>3:
        for n,b in enumerate(remaining):
            a=remaining[n-1];c=remaining[(n+1)%len(remaining)]
            if cross(poly[a],poly[b],poly[c])<=1e-12:continue
            if any(inside_triangle(poly[k],poly[a],poly[b],poly[c])for k in remaining if k not in [a,b,c]):continue
            faces.append([a,b,c]);remaining.pop(n);break
        else:raise ValueError('Cannot resolve source triangulation')
    faces.append(remaining);return faces

def segment_distance(p,a,b):
    dx=b[0]-a[0];dy=b[1]-a[1];den=dx*dx+dy*dy
    t=max(0,min(1,((p[0]-a[0])*dx+(p[1]-a[1])*dy)/den))if den else 0
    return math.hypot(p[0]-a[0]-t*dx,p[1]-a[1]-t*dy)

def contains(p,poly):
    inside=False
    for a,b in zip(poly,poly[1:]+poly[:1]):
        if segment_distance(p,a,b)<1e-12:return True
        if (a[1]>p[1])!=(b[1]>p[1])and p[0]<(b[0]-a[0])*(p[1]-a[1])/(b[1]-a[1])+a[0]:inside=not inside
    return inside

def kernel_influence(p,poly,z,radius):
    if radius<=0:raise ValueError('Positive declared surface radius required')
    dz=abs(p[2]-z)
    if dz>=radius:return 0.0
    edge=0 if contains(p,poly)else min(segment_distance(p,a,b)for a,b in zip(poly,poly[1:]+poly[:1]))
    distance=math.hypot(edge,dz)
    return math.sqrt(1-max(0,min(1,distance/radius)))

def line_sections(poly,point,direction):
    length=math.hypot(*direction);d=[v/length for v in direction];normal=[-d[1],d[0]];hits=[]
    for a,b in zip(poly,poly[1:]+poly[:1]):
        da=sum((a[i]-point[i])*normal[i]for i in [0,1]);db=sum((b[i]-point[i])*normal[i]for i in [0,1])
        if (da<=0<db)or(db<=0<da):
            f=da/(da-db);p=[a[i]+f*(b[i]-a[i])for i in [0,1]];hits.append(sum((p[i]-point[i])*d[i]for i in [0,1]))
    hits.sort();return [[hits[i],hits[i+1]]for i in range(0,len(hits)-1,2)]

def plan_report(settings,grid,actual_vertices=None):
    src=settings['source'];poly=[list(v[:2])for v in actual_vertices]if actual_vertices is not None else src['polygon'];z=actual_vertices[0][2]if actual_vertices is not None else src['planeZ']
    faces=triangulate(poly);spacing=grid['spacing'];h=max(spacing);radius=src['surfaceDistanceVoxels']*h
    inset=.5-src['insetVoxels']*h
    if any(abs(p[0])>inset+1e-7 or abs(p[1])>inset+1e-7 for p in poly):raise ValueError('Source vertices escaped original two-voxel inset')
    lobes=[];notches=[]
    for gauge in src['lobeGauges']:
        intervals=line_sections(poly,gauge['point'],gauge['direction']);found=next((q for q in intervals if q[0]<=0<=q[1]),None)
        if not found:raise ValueError('Lobe gauge missed source:'+gauge['id'])
        width=found[1]-found[0]
        lo,hi=src['lobeWidthRanges'][len(lobes)]
        if not lo<=width<=hi:raise ValueError('Lobe width escaped declared range:'+gauge['id'])
        lobes.append({'id':gauge['id'],'widthMetres':width,'widthVoxels':width/h,'kernelExpandedMetres':width+2*radius,'interval':found})
    for gauge in src['notchGauges']:
        intervals=line_sections(poly,gauge['point'],gauge['direction']);left=[q[1]for q in intervals if q[1]<0];right=[q[0]for q in intervals if q[0]>0]
        if not left or not right or any(q[0]<=0<=q[1]for q in intervals):raise ValueError('Notch gauge is not a bounded empty gap:'+gauge['id'])
        gap=min(right)-max(left);remaining=gap-2*radius
        if remaining<=0:raise ValueError('Declared kernel closes required notch:'+gauge['id'])
        notches.append({'id':gauge['id'],'rawGapMetres':gap,'rawGapVoxels':gap/h,'remainingAfterGeometricDilation':remaining,'notSolverProof':True})
    nx,ny,nz=grid['resolution'];coverage={c['id']:0 for c in src['cells']};below=outside=positive=0;planes=[]
    for k in range(nz):
        pz=grid['origin'][2]+k*spacing[2]
        if abs(pz-z)>=radius:continue
        planes.append({'index':k,'z':pz});
        for j in range(ny):
            for i in range(nx):
                p=[grid['origin'][0]+i*spacing[0],grid['origin'][1]+j*spacing[1],pz]
                if kernel_influence(p,poly,z,radius)<=0:continue
                positive+=1;below+=int(pz<0);native=[p[0]+5.5,8.5-p[1]];cell='cell:'+str(math.floor(native[0]/.5))+','+str(math.floor(native[1]/.5))
                if cell in coverage:coverage[cell]+=1
                else:outside+=1
    if below or outside or not all(coverage.values()):raise ValueError('Geometric source coverage misses cells/extends below ground/outside A')
    return {'scope':'Geometric cell-centre prediction only; actual Blender emission/obstacle/sample proof remains required','vertices':[[p[0],p[1],z]for p in poly],'faces':faces,'upwardNormals':all(cross(poly[a],poly[b],poly[c])>0 for a,b,c in faces),'grid':grid,'radiusMetres':radius,'kernelMinZ':z-radius,'predictedPositiveCellCentres':positive,'predictedBelowGround':below,'predictedOutsideA':outside,'perCellCoverage':coverage,'predictedPlanes':planes,'lobes':lobes,'notches':notches,'filterHalo':'Actual full-positive current/next one-voxel halos must be derived after the sole bake; this is not overhang approval'}
