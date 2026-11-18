"""Exact audit of saved binary64 polygons/points; no contact search or transforms."""
from pathlib import Path
from fractions import Fraction as F
import json,sys
HERE=Path(__file__).resolve().parent
d=json.loads((HERE/'result.json').read_bytes());w=json.loads((HERE/'world-tables.json').read_bytes());by={q['ownerId']:q for q in w['parts']};rows=[]
for r in d['contacts']:
 q=r['proof']
 if not q['parallel']:continue
 axis=max(range(3),key=lambda i:abs(q['normals'][0][i]));axes=[i for i in range(3) if i!=axis];poly=q['projectedFootprint']['polygonOnParentPlane']
 area=sum(F(a[axes[0]])*F(b[axes[1]])-F(b[axes[0]])*F(a[axes[1]]) for a,b in zip(poly,poly[1:]+poly[:1]))/2
 interior=[];barys=[]
 for side,owner in enumerate([r['parentOwner'],r['childOwner']]):
  tri=by[owner]['triangles'][q['primitives'][side]];point=q['points'][side]
  a,b,c=[[F(v[j]) for j in axes] for v in tri];x=[F(point[j]) for j in axes]
  u=[b[i]-a[i] for i in range(2)];v=[c[i]-a[i] for i in range(2)];s=[x[i]-a[i] for i in range(2)]
  det=u[0]*v[1]-u[1]*v[0];b1=(s[0]*v[1]-s[1]*v[0])/det;b2=(u[0]*s[1]-u[1]*s[0])/det;b0=1-b1-b2
  interior.append(min(b0,b1,b2)>0 and all(t[axis]==point[axis] for t in tri));barys.append([float(b0),float(b1),float(b2)])
 rows.append({'id':r['id'],'exactDyadicPolygonAreaPositive':area!=0,'absoluteAreaSquareMetres':float(abs(area)),'exactOwnPlaneAndStrictInterior':interior,'exactBarycentricToFloat':barys})
report={'version':1,'purpose':'Exact rational audit of saved binary64 points and polygons; no new contacts, transformations, selectors or tolerances. Validates genuine strict interiors even for small authored seam overlaps. No strength inference.',
 'rows':rows,'result':'PASS' if all(x['exactDyadicPolygonAreaPositive'] and all(x['exactOwnPlaneAndStrictInterior']) for x in rows) else 'FAIL','additionalTransforms':0,'additionalContactSearches':0}
assert report==json.loads((HERE/'precision-audit.json').read_bytes()) and report['result']=='PASS'
print(json.dumps({'result':'SAVED_EXACT_POINT_AUDIT_VERIFIED','parallelProofs':len(rows),'exactPositiveAreas':sum(x['exactDyadicPolygonAreaPositive'] for x in rows),'exactInteriorEndpoints':sum(sum(x['exactOwnPlaneAndStrictInterior']) for x in rows),'sourceTransforms':0,'contactSearches':0}))
