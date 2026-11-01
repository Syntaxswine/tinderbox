"""Exact finite planar triangle clipping; pure original authoring geometry only.
Inputs are interpreted as exact binary rationals, with no geometric epsilon.
No bpy, controller, scene, field, renderer or third-party package import.
"""
from fractions import Fraction as Q
import math


def rational(value):
    if type(value) not in (int,float) or not math.isfinite(value):
        raise ValueError('Finite scalar number required; bool/NaN/Inf unsupported')
    return Q(value)


def area2(points):
    a,b,c=points
    return (b[0]-a[0])*(c[1]-a[1])-(b[1]-a[1])*(c[0]-a[0])


def _halfspace(bary,positions,normal,bound,negative):
    def distance(row):
        xy=[sum(row[k]*positions[k][j] for k in range(3)) for j in range(2)]
        d=sum(normal[j]*xy[j] for j in range(2))-bound
        return -d if negative else d
    result=[]
    if not bary:return result
    previous=bary[-1];d0=distance(previous)
    for current in bary:
        d1=distance(current)
        if (d0>=0)!=(d1>=0):
            t=d0/(d0-d1)
            point=tuple(previous[k]+t*(current[k]-previous[k]) for k in range(3))
            if not result or result[-1]!=point:result.append(point)
        if d1>=0 and (not result or result[-1]!=current):result.append(current)
        previous=current;d0=d1
    if len(result)>1 and result[0]==result[-1]:result.pop()
    return result


def clip_mesh(positions,triangles,attributes,normal,lower,upper):
    """Keep closed n.p<=lower / n.p>=upper; omit the open strip.

    Each output face retains source-face identity and exact barycentric triples.
    Scalar vertex attributes interpolate on the original face, never across it.
    Original degenerate/duplicate faces refuse. Certified zero-area boundary
    pieces are reported explicitly, not silently emitted or epsilon-filtered.
    """
    if not isinstance(positions,list) or not 3<=len(positions)<=4096:raise ValueError('Bounded nonempty vertex list required')
    if not isinstance(triangles,list) or not 1<=len(triangles)<=4096:raise ValueError('Bounded triangle list required')
    if not isinstance(attributes,dict) or not attributes or any(not isinstance(k,str) or not k or len(k)>64 for k in attributes):raise ValueError('Named scalar attributes required')
    p=[]
    for v in positions:
        if not isinstance(v,(list,tuple)) or len(v)!=3:raise ValueError('Three position components required')
        p.append(tuple(map(rational,v)))
    if any(v[2]!=p[0][2] for v in p):raise ValueError('One exact planar source Z required')
    names=sorted(attributes);attrs={}
    for name in names:
        rows=attributes[name]
        if not isinstance(rows,(list,tuple)) or len(rows)!=len(p):raise ValueError('Complete per-vertex attribute map required')
        attrs[name]=list(map(rational,rows))
    if 'weight' in attrs and any(not 0<=w<=1 for w in attrs['weight']):raise ValueError('Weight outside[0,1]')
    if not isinstance(normal,(list,tuple)) or len(normal)!=2:raise ValueError('Two-component plane normal required')
    n=tuple(map(rational,normal));lo=rational(lower);hi=rational(upper)
    if n==(0,0) or lo>=hi:raise ValueError('Nonzero normal and ordered distinct boundaries required')
    seen_faces=set();source=[]
    for face in triangles:
        if not isinstance(face,(list,tuple)) or len(face)!=3 or any(type(i)is not int or not 0<=i<len(p) for i in face) or len(set(face))!=3:raise ValueError('Unique in-range triangle indices required')
        key=tuple(sorted(face))
        if key in seen_faces:raise ValueError('Duplicate source face; overlapping integration unsupported')
        seen_faces.add(key);face=tuple(face);a=area2([p[i] for i in face])
        if a==0:raise ValueError('Degenerate original triangle; no silent omission')
        source.append((face,a))
    vertices=[];faces=[];dedup={};provenance=[];zero_pieces=[]
    total_original=Q(0);total_kept=Q(0);weight_integral=Q(0)
    unit=[(Q(1),Q(0),Q(0)),(Q(0),Q(1),Q(0)),(Q(0),Q(0),Q(1))]
    for fi,(original,a0) in enumerate(source):
        local=[p[i] for i in original];retained=Q(0);face_start=len(faces)
        for side,bound,negative in [('negative',lo,True),('positive',hi,False)]:
            polygon=_halfspace(unit,local,n,bound,negative)
            if not polygon:continue
            def position(b):return tuple(sum(b[k]*local[k][j] for k in range(3)) for j in range(3))
            if len(polygon)<3:
                zero_pieces.append({'sourceFace':fi,'side':side,'reason':'boundary-only point/edge','vertices':len(polygon)});continue
            for j in range(1,len(polygon)-1):
                bary=[polygon[0],polygon[j],polygon[j+1]];points=[position(b) for b in bary];a=area2(points)
                if a==0:
                    zero_pieces.append({'sourceFace':fi,'side':side,'reason':'exact zero-area boundary fan','vertices':3});continue
                if a*a0<=0:raise ValueError('Clipping changed winding')
                ids=[]
                for point,b in zip(points,bary):
                    if min(b)<0 or sum(b)!=1:raise ValueError('Invalid exact intersection barycentric coordinates')
                    d=sum(n[k]*point[k] for k in range(2))
                    if not (d<=lo if negative else d>=hi):raise ValueError('Clipped point crossed open strip')
                    values=tuple(sum(b[k]*attrs[name][original[k]] for k in range(3)) for name in names)
                    key=(point,values)
                    if key not in dedup:
                        index=len(vertices);dedup[key]=index
                        vertices.append({'position':[float(v) for v in point],'exactPosition':[str(v) for v in point],
                                         'attributes':{name:float(v) for name,v in zip(names,values)},'exactAttributes':{name:str(v) for name,v in zip(names,values)}})
                    ids.append(dedup[key])
                faces.append({'indices':ids,'sourceFace':fi,'side':side,'barycentric':[[str(v) for v in b] for b in bary]})
                area=abs(a)/2;retained+=area
                if 'weight' in attrs:
                    weights=[sum(b[k]*attrs['weight'][original[k]] for k in range(3)) for b in bary]
                    weight_integral+=area*sum(weights)/3
        original_area=abs(a0)/2
        if retained>original_area:raise ValueError('Retained area exceeds original face')
        provenance.append({'sourceFace':fi,'originalTriangle':list(original),'originalAreaExact':str(original_area),'retainedAreaExact':str(retained),
                           'removedAreaExact':str(original_area-retained),'outputFaces':list(range(face_start,len(faces)))})
        total_original+=original_area;total_kept+=retained
    if not faces:raise ValueError('Corridor removes all source area')
    return {'kind':'exact-planar-corridor-source-mesh-v1','vertices':vertices,'faces':faces,'sourceFaces':provenance,'zeroAreaBoundaryPieces':zero_pieces,
            'normalExact':[str(v) for v in n],'lowerExact':str(lo),'upperExact':str(hi),
            'originalAreaExact':str(total_original),'retainedAreaExact':str(total_kept),'removedAreaExact':str(total_original-total_kept),
            'retainedSurfaceWeightIntegralExact':str(weight_integral) if 'weight' in attrs else None,
            'scope':'Exact intended source surface only; not Blender storage/evaluation, kernel feed, CFD or visible/radiometric proof'}
