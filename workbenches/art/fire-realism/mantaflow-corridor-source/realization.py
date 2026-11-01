"""Pure expected IEEE float32 realization of a nominal rational source mesh.
No tool API. Nominal geometry and stored geometry are explicitly different.
"""
from fractions import Fraction as Q
import math,struct
IDENTITY=[[float(i==j) for j in range(4)] for i in range(4)]
CONTRACT='nominal-corridor-expected-f32-v1'

def require_identity(world):
    if not isinstance(world,list) or len(world)!=4 or any(not isinstance(row,list) or len(row)!=4 or any(type(v)is not float or not math.isfinite(v) for v in row) for row in world) or world!=IDENTITY:
        raise ValueError('Only the recorded exact typed identity source transform is supported')

def words(positions):
    if not isinstance(positions,list) or any(not isinstance(row,list) or len(row)!=3 or any(type(v)is not float or not math.isfinite(v) for v in row) for row in positions):raise ValueError('Complete finite typed three-component coordinates required')
    try:
        if any(struct.unpack('<f',struct.pack('<f',v))[0]!=v for row in positions for v in row):raise ValueError('Coordinate is not an exact float32 value')
        return [[struct.pack('<f',v).hex() for v in row] for row in positions]
    except (OverflowError,struct.error) as exc:raise ValueError('Coordinate is outside finite float32 storage') from exc

def expected_realization(plan,world):
    require_identity(world);mesh=plan['mesh'];positions=[];errors=[]
    # Boundary is exactly RN32(RN64(nominal rational)), before any Vector/tool.
    for i,vertex in enumerate(mesh['vertices']):
        exact=[Q(v) for v in vertex['exactPosition']]
        if len(exact)!=3 or [float(v) for v in exact]!=vertex['position']:raise ValueError('Nominal rational/decimal source plan mismatch')
        stored=[struct.unpack('<f',struct.pack('<f',float(v)))[0] for v in exact]
        if any(not math.isfinite(v) for v in stored):raise ValueError('Expected float32 source coordinate is nonfinite')
        positions.append(stored);delta=[Q(a)-b for a,b in zip(stored,exact)]
        errors.append({'vertex':i,'signedCoordinateErrorExact':[str(v) for v in delta],'signedCoordinateErrorMetres':[float(v) for v in delta]})
    n=list(map(Q,mesh['normalExact']));lo=Q(mesh['lowerExact']);hi=Q(mesh['upperExact']);sides={}
    for face in mesh['faces']:
        if face['side']not in ['negative','positive']:raise ValueError('Unknown nominal source side')
        for i in face['indices']:
            exact=list(map(Q,mesh['vertices'][i]['exactPosition']));nominal=sum(n[k]*exact[k] for k in range(2));actual=sum(n[k]*Q(positions[i][k]) for k in range(2))
            if face['side']=='negative':nominal_inward=nominal-lo;inward=actual-lo
            else:nominal_inward=hi-nominal;inward=hi-actual
            if nominal_inward>0:raise ValueError('Nominal rational source is not certified outside the open strip')
            key=(i,face['side']);positive=max(Q(0),inward)
            sides[key]={'vertex':i,'side':face['side'],'nominalSignedInwardExact':str(nominal_inward),'storedSignedInwardExact':str(inward),
                        'penetrationExact':str(positive),'penetrationMetres':float(positive)}
    rows=list(sides.values());positive=[r for r in rows if Q(r['penetrationExact'])>0];maximum=max((Q(r['penetrationExact']) for r in rows),default=Q(0))
    return {'kind':CONTRACT,'conversion':'Python binary64 float(exact rational), then IEEE754 binary32 struct <f; no Vector/API-derived expectation',
            'positionsFloat32':positions,'positionBitsLE':words(positions),'signedCoordinateErrors':errors,'perSide':rows,
            'nominalRationalCertified':True,'strictOpenStripPassed':not positive,'nominalCrossingCount':len(positive),
            'maximumNominalPenetrationExact':str(maximum),'maximumNominalPenetrationMetres':float(maximum),'roundingToleranceUsed':False,
            'scope':'Expected stored representation only; no tool/grid/field/native proof and no geometry or weight adjustment.'}
