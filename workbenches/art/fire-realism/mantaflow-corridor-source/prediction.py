"""Pure stored-triangle kernel model and in-memory early solver-response metadata.
Neither is effective Mantaflow input-E observation. No I/O or tool API.
"""
import math,hashlib,json
from realization import expected_realization,IDENTITY
from authoring import verify_observation


def _finite(v):return type(v)in(int,float)and math.isfinite(v)
def _distance2(a,b):return sum((a[k]-b[k])**2 for k in range(3))
def closest_triangle(point,triangle):
    """Closest point on one planar XY triangle; retain barycentric weights."""
    if len(point)!=3 or len(triangle)!=3 or any(len(v)!=3 for v in triangle)or not all(_finite(v)for row in [point,*triangle]for v in row):raise ValueError('Finite point/triangle required')
    a,b,c=triangle
    if not a[2]==b[2]==c[2]:raise ValueError('Planar triangle required')
    den=(b[0]-a[0])*(c[1]-a[1])-(b[1]-a[1])*(c[0]-a[0])
    if den==0:raise ValueError('Degenerate triangle')
    u=((b[0]-point[0])*(c[1]-point[1])-(b[1]-point[1])*(c[0]-point[0]))/den
    v=((c[0]-point[0])*(a[1]-point[1])-(c[1]-point[1])*(a[0]-point[0]))/den
    w=1-u-v
    if min(u,v,w)>=0:
        q=[point[0],point[1],a[2]];return {'point':q,'barycentric':[u,v,w],'distanceSquared':_distance2(point,q)}
    candidates=[]
    for i,j in [(0,1),(1,2),(2,0)]:
        x,y=triangle[i],triangle[j];edge=[y[k]-x[k]for k in range(3)];length=sum(v*v for v in edge)
        if length<=0:raise ValueError('Zero source edge')
        t=max(0.,min(1.,sum((point[k]-x[k])*edge[k]for k in range(3))/length));q=[x[k]+t*edge[k]for k in range(3)];bary=[0.,0.,0.];bary[i]=1-t;bary[j]=t
        candidates.append({'point':q,'barycentric':bary,'distanceSquared':_distance2(point,q)})
    return min(candidates,key=lambda r:r['distanceSquared'])


def union_sample(point,positions,faces,weights,sides,radius):
    if not _finite(radius)or radius<=0:raise ValueError('Positive finite radius required')
    if len(weights)!=len(positions)or len(sides)!=len(faces)or not faces:raise ValueError('Complete stored mesh mapping required')
    if any(not _finite(w)or not 0<=w<=1 for w in weights):raise ValueError('Stored weights outside[0,1]')
    rows=[]
    for i,face in enumerate(faces):
        if len(face)!=3 or len(set(face))!=3 or any(type(k)is not int or not 0<=k<len(positions)for k in face):raise ValueError('Invalid triangle mapping')
        row=closest_triangle(point,[positions[k]for k in face]);row['face']=i;row['weight']=sum(w*weights[k]for w,k in zip(row['barycentric'],face));row['bank']=sides[i];rows.append(row)
    minimum=min(r['distanceSquared']for r in rows);tied=[r for r in rows if r['distanceSquared']==minimum];distance=math.sqrt(minimum)
    base=0. if distance>=radius else math.sqrt(1-max(0.,min(1.,distance/radius)))
    targets=[base*r['weight']for r in tied]
    return {'distance':distance,'baseInfluence':base,'minimumE':min(targets),'maximumE':max(targets),
            'nearestFaces':[r['face']for r in tied],'nearestBanks':sorted(set(r['bank']for r in tied)),
            'tie':len(tied)>1,'tieRuleObserved':False,'uncertainty':'Binary64 closest-point/equal-distance model; actual solver BVH tie/interpolation is unobserved. Not a sum across source faces.'}


def _grid(grid):
    n=grid['resolution'];o=grid['origin'];h=grid['spacing']
    if len(n)!=3 or any(type(v)is not int or not 1<=v<=96 for v in n)or math.prod(n)>96**3:raise ValueError('Bounded integer grid required')
    if len(o)!=3 or len(h)!=3 or any(not _finite(v)for v in [*o,*h])or min(h)<=0:raise ValueError('Finite positive grid mapping required')
    return n,o,h

def _cell(point):return 'cell:'+str(math.floor((point[0]+5.5)/.5))+','+str(math.floor((8.5-point[1])/.5))

def predict(observed,plan,grid,settings,active):
    realized=expected_realization(plan,IDENTITY);verify_observation(observed,plan,realized['positionsFloat32'],IDENTITY)
    if set(active)!={'fuel_amount','density','temperature'}or any(type(v)is not float or not math.isfinite(v)or v<=0 for v in active.values()):raise ValueError('Actual positive active BOTH input scalars required')
    n,o,h=_grid(grid);radius=settings['source']['surfaceDistanceVoxels']*max(h);positions=observed['worldPositions'];faces=observed['faces']
    weights=[r['memberships'][0]['weight']for r in observed['vertices']];sides=[r['side']for r in plan['mesh']['faces']]
    cells={c['id']:0 for c in settings['source']['cells']}
    if len(cells)!=4:raise ValueError('Exactly four source cells required')
    banks={'negative':0,'positive':0};ties=ambiguous=below=outside=positive=sampled=0;sums={'minimumE':0.,'maximumE':0.,'fuelTargetMinimum':0.,'densityTargetMinimum':0.,'reactionTargetMinimum':0.}
    bank_targets={k:0. for k in banks};z=positions[0][2]
    if any(p[2]!=z for p in positions):raise ValueError('Stored source is not planar')
    if len({tuple(sorted(f))for f in faces})!=len(faces):raise ValueError('Duplicate source face')
    for k in range(n[2]):
        pz=o[2]+k*h[2]
        if abs(pz-z)>=radius:continue
        for j in range(n[1]):
            for i in range(n[0]):
                point=[o[0]+i*h[0],o[1]+j*h[1],pz];sampled+=1;row=union_sample(point,positions,faces,weights,sides,radius)
                ties+=int(row['tie']);E=row['minimumE'];sums['minimumE']+=E;sums['maximumE']+=row['maximumE']
                if E<=0:continue
                positive+=1;below+=int(pz<0);cell=_cell(point)
                if cell in cells:cells[cell]+=1
                else:outside+=1
                if len(row['nearestBanks'])==1:
                    bank=row['nearestBanks'][0]
                    if bank not in banks:raise ValueError('Unknown source bank')
                    banks[bank]+=1;bank_targets[bank]+=E
                else:ambiguous+=1
                sums['fuelTargetMinimum']+=E*active['fuel_amount'];sums['densityTargetMinimum']+=E*active['density'];sums['reactionTargetMinimum']+=1-(1-E)**2
    return {'kind':'corridor-stored-triangle-kernel-prediction-v1','passed':all(cells.values())and not below and not outside,
            'scope':'Source-code-derived geometric targets only; NOT actual Mantaflow E/fuelIn/heatIn/transition input grids, mass, flux, CFD or radiance.',
            'actualInputGridProof':False,'gridModel':grid,'radiusMetres':radius,'sourceGeometrySha256':hashlib.sha256(json.dumps({'positions':positions,'faces':faces,'weights':weights},separators=(',',':')).encode()).hexdigest(),
            'predictedPositiveCounts':cells,'perBankExclusivePositiveCounts':banks,'perBankMinimumETargetSum':bank_targets,'ambiguousBankCentres':ambiguous,
            'positiveCentres':positive,'sampledGeometricCentres':sampled,'predictedBelowGround':below,'predictedOutsideA':outside,'equalDistanceTies':ties,
            'tieRuleObserved':False,'tieUncertainty':'Equal nearest-distance candidates are reported; minimum/maximum E bound model ties. No face sum/max-by-weight shortcut.',
            'sampledTargets':sums,'heatGatePositiveCount':positive,'requestedHeatScalarOnPositiveE':active['temperature'],'temperatureMultipliedByWeight':False,
            'nominalCrossings':realized['nominalCrossingCount'],'strictOpenStripPassed':realized['strictOpenStripPassed']}


def early_response(values,resolution,origin,spacing,source,frame,channel):
    """Already loaded export array only: no file reread, input-E or acceptance."""
    if frame not in [1,2,3]or channel not in ['density','flame']:raise ValueError('Only fixed early D/F response records')
    n,o,h=_grid({'resolution':resolution,'origin':origin,'spacing':spacing})
    if len(values)!=math.prod(n):raise ValueError('Full-sized already loaded solver output required')
    cells={c['id']:{'positive':0,'positiveMaximum':0.,'proxySum':0.,'negative':0}for c in source['cells']};outside=0;nx,ny,nz=n
    for index,v in enumerate(values):
        if not _finite(v):raise ValueError('Finite output proxy required; unchanged raw validator owns negative-flame failure')
        z=o[2]+(index//(nx*ny))*h[2]
        if not 0<=z<=source['contactBandHeight']:continue
        p=[o[0]+(index%nx)*h[0],o[1]+((index//nx)%ny)*h[1],z];cell=_cell(p)
        if cell not in cells:outside+=int(v>0);continue
        c=cells[cell];c['positive']+=int(v>0);c['negative']+=int(v<0);c['positiveMaximum']=max(c['positiveMaximum'],v);c['proxySum']+=v
    return {'frame':frame,'ageSeconds':(frame-1)/30,'channel':channel,'perCellLowerBand':cells,'positiveOutsideCellsLowerBand':outside,
            'actualSolverOutput':True,'actualInputGridProof':False,'scope':'Post-solver D/F response with transport/reaction; proxySum is not mass/energy or source injection proof.'}
