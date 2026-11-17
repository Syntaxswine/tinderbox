"""Additive M29 artist export. Never edits source scenes, navigation or geometry."""
from pathlib import Path
import collections, hashlib, json, math, subprocess, sys
ROOT=Path(__file__).resolve().parents[3]
SCENE='assets/art/place-scenes/new-york'
OUTPUT='assets/art/shared-map-fire-bindings/new-york.json'
EVIDENCE='art/source/shared-map-fire-bindings/new-york-evidence.json'
INDEX_SHA='1025e434bea1724b0212100cb92687faf95650d3c39c71734bf1b56fbf9713ad'
BASE='6d1061cd3ab7e6c9bff212381193376473413b30'

POLICY_EVIDENCE=[
    {'role':'shared-workflow-read-at-authoring','path':'docs/art/shared-modular-art-workflow.md','commit':BASE,'gitBlob':'63415856848ab3c26f509cb09eed2b079ea8973b','sha256':'3321b5bc7b40786898e06dd43f3bc17ae84b29fc1cf221ee2bf9e2481ab64238','snapshotPath':'art/source/shared-map-fire-bindings/policy-snapshots/workflow-v2-6d1061cd.md','label':'Shared modular art workflow, Version 2, 12 November 2026','originalDeliveryWorkingCopySha256':'3321b5bc7b40786898e06dd43f3bc17ae84b29fc1cf221ee2bf9e2481ab64238','originalDeliveryLineEndings':'LF'},
    {'role':'original-brief-read-at-authoring','path':'docs/milestones/29-shared-gameplay-maps.md','commit':BASE,'gitBlob':'d52cb2372fbe966b04d9bf53cc041802116339b6','sha256':'09fe8fac960a6c215fcfa461e67eed7779773cfafc16ee15c74e6c7b9f4e4170','snapshotPath':'art/source/shared-map-fire-bindings/policy-snapshots/m29-authoring-6d1061cd.md','label':'Original M29 common brief','originalDeliveryWorkingCopySha256':'706b51a2d763478fefc50b8311b51105f998f1ba2d8df44ba64eae6bd66f529d','originalDeliveryLineEndings':'CRLF'},
    {'role':'accepted-pilot-contract','path':'docs/milestones/29-shared-gameplay-maps.md','commit':'15672d1187dd01ca6557f0459247adc0d4971a11','gitBlob':'4eb7a9880a4b2f9affdc0c13eb3c2e81ad56925a','sha256':'932198df389751522c75235afed21fc4baf045c244fd32db87787ca849bfe591','snapshotPath':'art/source/shared-map-fire-bindings/policy-snapshots/m29-accepted-15672d11.md','label':'M29 reconciled pilot material and capability contract'}
]
def policy_evidence():
    # Historical policy is verified against committed objects and deliberate snapshots,
    # never against whichever mutable policy text is in the current working tree.
    for row in POLICY_EVIDENCE:
        ref=row['commit']+':'+row['path']
        blob=subprocess.check_output(['git','rev-parse',ref],cwd=ROOT,text=True).strip()
        data=subprocess.check_output(['git','show',ref],cwd=ROOT)
        assert blob==row['gitBlob'] and digest(data)==row['sha256'],'Committed policy object differs: '+ref
        assert (ROOT/row['snapshotPath']).read_bytes()==data,'Policy snapshot differs from committed object: '+row['snapshotPath']
    return [dict(row) for row in POLICY_EVIDENCE]
EPS=0.00002
PILOTS=['main/0/cell-1-22/1','upper-floor/tile-1-16','main/0/lower-3/glass']
def digest(data): return hashlib.sha256(data).hexdigest()
def load(path): return json.loads((ROOT/path).read_text(encoding='utf-8'))
def q(n): return round(n,6)
def sub(a,b): return [a[i]-b[i] for i in range(3)]
def cross(a,b): return [a[1]*b[2]-a[2]*b[1],a[2]*b[0]-a[0]*b[2],a[0]*b[1]-a[1]*b[0]]
def dot(a,b): return sum(x*y for x,y in zip(a,b))
def point(v,m): return [sum(m[j*4+k]*v[j] for j in range(3))+m[12+k] for k in range(3)]
def bounds(tris):
    return {key:[f(v[k] for t in tris for v in t) for k in range(3)] for key,f in [('min',min),('max',max)]}
def union(bs): return {key:[f(b[key][k] for b in bs) for k in range(3)] for key,f in [('min',min),('max',max)]}
def triangles(geom,m,ran=None):
    pos=geom['attributes']['position']['array'];ind=geom.get('index')
    if isinstance(ind,dict): ind=ind['array']
    if ind is None: ind=list(range(len(pos)//3))
    if ran: ind=ind[ran['start']:ran['start']+ran['count']]
    return [[point(pos[3*j:3*j+3],m) for j in ind[i:i+3]] for i in range(0,len(ind),3)]
def measures(ts):
    # Translate the origin near the solid before the signed-volume sum.
    origin=ts[0][0];volume=0;area=0;up=0;projected=0;edges=collections.Counter()
    for t in ts:
        a,b,c=[sub(v,origin) for v in t];n=cross(sub(t[1],t[0]),sub(t[2],t[0]));ar=math.sqrt(dot(n,n))/2
        volume+=dot(a,cross(b,c))/6;area+=ar
        if n[1]>1e-10: up+=ar;projected+=n[1]/2
        vs=[tuple(round(x,5) for x in v) for v in t]
        if ar>1e-10:
            for x,y in zip(vs,vs[1:]+vs[:1]):
                if x!=y: edges[tuple(sorted([x,y]))]+=1
    boundary_count=sum(n!=2 for n in edges.values())
    closed=not boundary_count
    split_boundary_count=boundary_count
    if not closed:
        # Offline topology diagnostic: split an edge at existing collinear vertices.
        # Access clipping may leave T-junctions; this does not modify exported geometry.
        vertices=set(v for e in edges for v in e);split=collections.Counter()
        for (a,b),count in edges.items():
            d=sub(b,a);length=dot(d,d);cuts=[(0,a),(1,b)]
            for v in vertices:
                t=dot(sub(v,a),d)/length
                if 1e-6<t<1-1e-6 and math.dist(v,[a[k]+t*d[k] for k in range(3)])<EPS:cuts.append((t,v))
            cuts.sort()
            for (_,x),(_,y) in zip(cuts,cuts[1:]):
                if math.dist(x,y)>EPS:split[tuple(sorted([x,y]))]+=count
        split_boundary_count=sum(n!=2 for n in split.values())
        closed=not split_boundary_count
    return {'closed':closed,'unmatchedSourceEdges':boundary_count,'unmatchedEdgesAfterCollinearSplit':split_boundary_count,'volume':abs(volume),'surfaceArea':area,'upArea':up,'projectedUpArea':projected}

def classify(a):
    import re
    raw=a['id'];s=raw.removeprefix('replacement/');role=a.get('role')
    if s.endswith(('/shadow','/recess')): return ('visual-shadow',None,None,None)
    if s.endswith(('/glass','/fixed-transom')): return ('glazing','glass',None,'inert')
    if role=='door-hardware': return ('door-hardware','metal',None,'inert')
    if role in ('door-leaf','door-extension'): return ('door','timber','door','leaf-area')
    if s.startswith('roof/') or s in ('tower-east/cap-hip','tower-west/cap-hip'): return ('roof-covering','timber-covering','roof','weather-area')
    if re.search(r'/(canopy(?:-stripe-\d+)?|valance|awning|stripe-\d+)$',s): return ('awning','cloth','cloth','whole-awning')
    if re.match(r'tower-(?:east|west)/\d+/arch-opening/spandrel-',s): return ('exterior-wall','timber','clapboard','wall-area')
    if re.match(r'tower-(?:east|west)/\d+/arch-opening/(?:arch|pilaster-)',s): return ('timber-fitting','timber','frame','closed-volume')
    if role in ('structural-wall','perimeter-closure'):
        level=int(re.search(r'/(?:cell|seam)-(\d+)-',s).group(1))
        if level==0: return ('raised-base','stone',None,'inert')
        return ('perimeter-closure' if role=='perimeter-closure' else 'exterior-wall','timber','clapboard','wall-area')
    if role=='floor':
        mineral=a.get('floorId') in ('front-landing','porch-east-1','porch-west-1') or s.startswith('visit-cap/')
        return ('exterior-paving','stone',None,'inert') if mineral else ('building-deck','timber','frame','top-area')
    if role=='access-support' or s in ('landing/fascia','porch-east/plinth','porch-west/plinth'):
        return ('raised-base','stone',None,'inert')
    if role in ('stair-tread','stair-trim'):
        exterior=s.startswith(('front-stair/','ny-side-approach','porch-east/stair-','porch-west/stair-'))
        return ('approach-stair','stone',None,'inert') if exterior else ('interior-stair','timber','frame','top-area')
    # Explicit semantic families. Visual material colors and generic authoring tokens are never inspected.
    window=re.match(r'(main/\d+/(?:lower-\d+|upper-\d+|frieze-\d+|entry)|clerestory/\d+/window-\d+)/',s)
    if window or role=='portal-frame': return ('window-or-portal-frame','timber','frame','closed-volume')
    if role in ('stair-rail','guard-rail') or s.startswith(('ny-main-flight-','ny-side-approach','ny-well-guard-','ny-middle-guard-')):
        return ('rail','timber','frame','closed-volume')
    if re.match(r'(?:main-parapet-\d+/|edge-\d+/(?:cornice|dentil)-|landing/rail-|upper-terrace/(?:rail-|support-)|clerestory/(?:front-rail/|cornice))',s):
        return ('timber-fitting','timber','frame','closed-volume')
    if re.match(r'porch-(?:east|west)/(?:column-|cornice-|rail-|neck-rail-|baluster-|pier-)',s):
        return ('timber-fitting','timber','frame','closed-volume')
    if re.match(r'tower-(?:east|west)/(?:balcony-|cornice-|cap-eave|lower-panel-)',s):
        return ('timber-fitting','timber','frame','closed-volume')
    if re.match(r'entry/column(?:-|$)',s): return ('column','timber','frame','closed-volume')
    return ('unassigned',None,None,None)

def canonical(a,kind):
    import re
    if kind=='awning': return 'carrier/'+re.sub(r'/(canopy(?:-stripe-\d+)?|valance|awning|stripe-\d+)$','/awning',a['id'])
    if kind=='door': return 'carrier/'+re.sub(r'/(native-leaf|leaf-extension)(--?\d+)$',r'/leaf\2',a['id'])
    return 'carrier/'+a['id']

def polygon_area(p): return abs(sum(a[0]*b[1]-a[1]*b[0] for a,b in zip(p,p[1:]+p[:1])))/2

def overlap_area(a,b):
    # Sutherland-Hodgman clipping of two coplanar triangles, projected on an axis plane.
    orient=sum(x[0]*y[1]-x[1]*y[0] for x,y in zip(b,b[1:]+b[:1]));p=a
    def side(v,x,y): return ((y[0]-x[0])*(v[1]-x[1])-(y[1]-x[1])*(v[0]-x[0]))*(1 if orient>0 else -1)
    for x,y in zip(b,b[1:]+b[:1]):
        before=p;p=[]
        if not before: break
        for u,v in zip(before,before[1:]+before[:1]):
            du,dv=side(u,x,y),side(v,x,y)
            if du>=-1e-10:p.append(u)
            if (du>1e-10 and dv< -1e-10) or (du< -1e-10 and dv>1e-10):
                t=du/(du-dv);p.append([u[k]+(v[k]-u[k])*t for k in range(2)])
    return polygon_area(p) if len(p)>2 else 0

def face_triangles(ts,b):
    faces={}
    for axis in range(3):
        other=[k for k in range(3) if k!=axis]
        for name in ('min','max'):
            out=[]
            for t in ts:
                if all(abs(v[axis]-b[name][axis])<EPS for v in t):
                    projected=[[v[k] for k in other] for v in t]
                    if polygon_area(projected)>1e-9: out.append(projected)
            if out: faces[axis,name]=out
    return faces

def clip_linear(poly,value):
    out=[]
    if not poly:return out
    for a,b in zip(poly,poly[1:]+poly[:1]):
        da,db=value(a),value(b);ia,ib=da>=-1e-10,db>=-1e-10
        if ia:out.append(a)
        if ia!=ib:
            t=da/(da-db);out.append([a[k]+(b[k]-a[k])*t for k in range(2)])
    clean=[]
    for v in out:
        if not clean or math.dist(v,clean[-1])>1e-8:clean.append(v)
    if len(clean)>1 and math.dist(clean[0],clean[-1])<1e-8:clean.pop()
    return clean if len(clean)>2 else []

def subtract_convex(poly,cut):
    orient=sum(a[0]*b[1]-a[1]*b[0] for a,b in zip(cut,cut[1:]+cut[:1]));sign=1 if orient>0 else -1
    current=poly;outside=[]
    for a,b in zip(cut,cut[1:]+cut[:1]):
        if math.dist(a,b)<1e-8:continue
        def side(v):return sign*((b[0]-a[0])*(v[1]-a[1])-(b[1]-a[1])*(v[0]-a[0]))
        piece=clip_linear(current,lambda v:-side(v))
        if polygon_area(piece)>1e-9:outside.append(piece)
        current=clip_linear(current,side)
        if not current:break
    assert sum(polygon_area(p) for p in outside)<=polygon_area(poly)+1e-6,'Clipping duplicated area'
    return outside

def exposed_roofs(carriers,shapes):
    roofs=[c for c in carriers if c['role']=='roof-covering'];up={}
    for c in roofs:
        up[c['id']]=[(j,t,cross(sub(t[1],t[0]),sub(t[2],t[0]))) for j,t in enumerate(shapes[c['id']]) if cross(sub(t[1],t[0]),sub(t[2],t[0]))[1]>1e-9]
    for c in roofs:
        cid=c['id'];faces=[];gross=0;exposed=0
        for j,t,n in up[cid]:
            def height(v,t=t,n=n):return t[0][1]-(n[0]*(v[0]-t[0][0])+n[2]*(v[1]-t[0][2]))/n[1]
            poly=[[v[0],v[2]] for v in t];pieces=[poly];factor=math.sqrt(dot(n,n))/n[1];gross+=polygon_area(poly)*factor
            for other in roofs:
                if other['id']==cid:continue
                bottom=min(v[1] for tri in shapes[other['id']] for v in tri)
                for _,ot,on in up[other['id']]:
                    def oh(v,ot=ot,on=on):return ot[0][1]-(on[0]*(v[0]-ot[0][0])+on[2]*(v[1]-ot[0][2]))/on[1]
                    cut=[[v[0],v[2]] for v in ot]
                    coplanar=all(abs(oh(v)-height(v))<1e-7 for v in cut)
                    if coplanar and other['id']>cid:continue
                    cut=clip_linear(cut,lambda v:height(v)-bottom)
                    if not coplanar:cut=clip_linear(cut,lambda v:oh(v)-height(v))
                    if polygon_area(cut)<1e-9:continue
                    pieces=[out for piece in pieces for out in subtract_convex(piece,cut)]
            area=sum(polygon_area(x)*factor for x in pieces);exposed+=area
            faces.append({'triangleIndex':j,'grossArea':q(polygon_area(poly)*factor),'exposedArea':q(area),'surfaceFragments':[[[q(v[0]),q(height(v)),q(v[1])] for v in piece] for piece in pieces]})
        c['area']=exposed;c['fuelAmount']=exposed
        c['quantityBasis'].update(grossWeatherArea=q(gross),excludedBuriedOrDuplicateArea=q(gross-exposed),weatherFaces=faces,formula='Exposed upward roof-triangle area * 1; subtract portions inside another original closed roof, and count coplanar overlaps once. No geometry is edited.')

def add_contacts(carriers,shapes):
    # Exact coplanar triangle area, after an AABB spatial broadphase. No expanded collision boxes.
    bins=collections.defaultdict(list);pairs=set();byid={c['id']:c for c in carriers};fs={}
    for c in carriers:
        cid=c['id'];b=c['physicalBounds'];fs[cid]=face_triangles(shapes[cid],b)
        for x in range(math.floor((b['min'][0]-EPS)/4),math.floor((b['max'][0]+EPS)/4)+1):
          for y in range(math.floor((b['min'][1]-EPS)/4),math.floor((b['max'][1]+EPS)/4)+1):
            for z in range(math.floor((b['min'][2]-EPS)/4),math.floor((b['max'][2]+EPS)/4)+1):
                for other in bins[x,y,z]: pairs.add(tuple(sorted([cid,other])))
                bins[x,y,z].append(cid)
    counts=collections.Counter()
    for aid,bid in sorted(pairs):
        a,b=byid[aid],byid[bid];ba,bb=a['physicalBounds'],b['physicalBounds']
        if any(min(ba['max'][k],bb['max'][k])<max(ba['min'][k],bb['min'][k])-EPS for k in range(3)):continue
        for axis in range(3):
          for an,bn in [('max','min'),('min','max')]:
            if abs(ba[an][axis]-bb[bn][axis])>EPS:continue
            area=sum(overlap_area(x,y) for x in fs[aid].get((axis,an),[]) for y in fs[bid].get((axis,bn),[]))
            if area<1e-6:continue
            a['adjacencyCarrierIds'].append(bid);b['adjacencyCarrierIds'].append(aid);counts['faceContacts']+=1
            if axis==1:
                upper,lower=(b,a) if an=='max' else (a,b)
                # Dynamic leaves are hinge-supported; a closed-pose floor touch is not a hinge.
                if upper['role']!='door':
                    upper['supportCarrierIds'].append(lower['id'])
                    upper['supportEvidence'].append({'carrierId':lower['id'],'kind':'coplanar-horizontal-triangle-contact','area':q(area),'toleranceMetres':EPS})
                    counts['bearingContacts']+=1
            break
    for c in carriers:
        c['supportCarrierIds']=sorted(set(c['supportCarrierIds']));c['adjacencyCarrierIds']=sorted(set(c['adjacencyCarrierIds']))
    return dict(counts)

def build():
    raw=(ROOT/SCENE/'index.json').read_bytes();assert digest(raw)==INDEX_SHA,'Source index pin changed'
    index=json.loads(raw);nav=load(SCENE+'/navigation.json');geoms={k:load(SCENE+'/'+v) for k,v in index['geometries'].items()}
    filepaths=[SCENE+'/index.json',SCENE+'/navigation.json']+[SCENE+'/'+c['url'] for c in index['chunks']]+[SCENE+'/'+v for v in index['geometries'].values()]
    filepaths+=['assets/art/exposition-new-york-tile/index.js','assets/art/exposition-new-york-tile/plan.js','assets/art/exposition-new-york/forms.js','assets/art/exposition-new-york/native-contract.js','assets/art/exploration-access/index.js','art/source/exposition-new-york/sources.json','art/source/exposition-new-york-tile/preserved-original.json','art/source/exploration-access/source-pins.json','art/source/furnished-house/export.mjs','art/source/shared-map-fire-bindings/export.py','art/source/shared-map-fire-bindings/check.py','art/source/shared-map-fire-bindings/.gitattributes','assets/art/shared-map-fire-bindings/.gitattributes','docs/art/shared-map-fire-bindings/.gitattributes']
    ledger=[{'path':x,'sha256':digest((ROOT/x).read_bytes())} for x in sorted(set(filepaths))]
    policies=policy_evidence();policy_digest=digest(json.dumps(policies,sort_keys=True,separators=(',',':')).encode())
    parts=[];render_count=0;triangle_count=0
    for chunk in index['chunks']:
        for src in load(SCENE+'/'+chunk['url'])['parts']:
            render_count+=1
            geom=geoms[src['geometry']];triangles_all=triangles(geom,src['matrix']);triangle_count+=len(triangles_all)
            ranges=src.get('sourceRanges') or [None]
            for ran in ranges:
                a=dict(src,sectionId=chunk['id'],renderPartId=src['id'])
                if ran: a.update(id=ran['id'],sourceRange=ran)
                ts=triangles(geom,a['matrix'],ran);a['_triangles']=ts;a['_measures']=measures(ts);a['_bounds']=bounds(ts)
                parts.append(a)
    groups={};unassigned=[];visual=[];shapes={}
    for a in sorted(parts,key=lambda a:a['id']):
        role,material,profile,basis=classify(a)
        bind={'partId':a['renderPartId'],'sourcePartId':a['id'],'sectionId':a['sectionId'],'geometryId':a['geometry'],'geometryPath':SCENE+'/'+index['geometries'][a['geometry']],'appearanceMaterialId':a['material'],'matrix':a['matrix'],'bounds':a['_bounds'],'triangleCount':len(a['_triangles'])}
        bind['physicalContribution']='appearance-only' if __import__('re').search(r'/(?:canopy-stripe-\d+|stripe-\d+)$',a['id']) else 'carrier-solid'
        if a.get('sourceRange'):bind['sourceRange']=a['sourceRange']
        if a.get('openMatrix'):bind.update(openMatrix=a['openMatrix'],openBounds=a['openBounds'])
        if role=='unassigned' or (profile and not a['_measures']['closed']):
            pending=role!='unassigned'
            unassigned.append({'sourcePartId':a['id'],'kind':'quantity-unassigned-open-source' if pending else 'material-unassigned','sourceClosedness':{k:a['_measures'][k] for k in ('closed','unmatchedSourceEdges','unmatchedEdgesAfterCollinearSplit')},'acceptedGameplayMaterial':material if pending else None,'proposedFuelClass':profile if pending else None,'reason':'Derived access-cut mesh has unmatched boundary edges after collinear T-junction analysis; a closed-volume fuel quantity is unverified. Preserve geometry and request a separate bounded cap correction.' if pending else 'Ornamental sculpture/relief/terminal has no accepted physical-material assignment; not timber and not an inert-material claim.','renderBinding':bind});continue
        if role=='visual-shadow':
            visual.append({'sourcePartId':a['id'],'renderBinding':bind,'kind':'authored-shadow-graphic','geometryTreatment':'Fuel/retirement classification only; existing navigation blockers are not removed and traversability is not asserted by this sidecar.','fuelAmount':0,'retirement':'Follow containing native opening/wall assembly; never an independent fuel or support carrier.'});continue
        cid=canonical(a,role)
        if cid not in groups:
            groups[cid]={'id':cid,'sourcePartIds':[],'sectionIds':[],'role':role,'layer':'covering' if role in ('awning','roof-covering') else 'glazing' if material=='glass' else 'hardware' if material=='metal' else 'structure','physicalMaterial':material,'fuelClass':profile,'fuelAmount':0,'area':0,'thickness':None,'quantityBasis':{'rule':basis,'unit':'prototype-fuel-unit','historicalMass':False},'renderBindings':[],'supportCarrierIds':[],'supportEvidence':[],'adjacencyCarrierIds':[],'anchors':[],'evidence':{'sourceFact':'sourceFacts','gameplayAssignment':'gameplayAssignments/'+basis},'retirement':{'ownerId':cid,'stateKey':cid,'policy':'geometryPolicy/retirement'}}
            shapes[cid]=[]
        c=groups[cid];c['sourcePartIds'].append(a['id']);c['sectionIds'].append(a['sectionId']);c['renderBindings'].append(bind)
        if bind['physicalContribution']=='carrier-solid':shapes[cid]+=a['_triangles']
        m=a['_measures'];qb=c['quantityBasis'];qb['closedSourceSolids']=qb.get('closedSourceSolids',True) and m['closed'];qb['volumeMetresCubed']=qb.get('volumeMetresCubed',0)+m['volume']
        if basis in ('wall-area','leaf-area'):
            thick=.16 if basis=='wall-area' else .12;area=m['volume']/thick;c['thickness']=thick;c['area']+=area;c['fuelAmount']+=area*(.45 if basis=='leaf-area' else 1)
            qb['formula']='closed mesh volume / native thickness * '+('.45' if basis=='leaf-area' else '1')
        elif basis in ('top-area','weather-area'):
            area=m['projectedUpArea'] if basis=='top-area' else m['upArea'];c['area']+=area;c['fuelAmount']+=area
            c['thickness']=.12 if role=='building-deck' else None
            qb['formula']='upward-facing triangle '+('projected footprint' if basis=='top-area' else 'surface')+' area * 1; no underside or duplicate face fuel'
            if role=='roof-covering':qb['thermalThickness']='Unassigned: preserve closed pitched volume; solver must not invent a thin collision shell.'
        elif basis=='closed-volume':
            c['area']+=m['surfaceArea'];c['fuelAmount']+=m['volume']/.12;qb['formula']='actual closed solid volume / .12 (existing fitting convention); area is total surface evidence, not fuel area'
        elif basis=='whole-awning':
            c['fuelAmount']=.3;qb['formula']='.3 per complete logical awning, inclusive of canopy, valance and every stripe; not .3 per mesh'
            if a['id'].endswith(('/canopy','/awning')):c['area']+=m['upArea']
        else:
            c['area']+=m['surfaceArea'];qb['formula']='0; inert, retains physical screening/support/retirement'
        if a.get('portalId'):
            c['portalId']=a['portalId']
            if role=='door':c['doorPose']='Closed/open matrices are exact emitted-world matrices in each renderBinding; native body and upper panel share one leaf owner.'
        if a.get('floorId'): c['nativeFloorId']=a['floorId'];c['structuralAssemblyId']='floor/'+a['floorId']
        if a.get('level') is not None:c['nativeLevel']=a['level']
    carriers=list(groups.values())
    exposed_roofs(carriers,shapes)
    for c in carriers:
        c['sectionIds']=sorted(set(c['sectionIds']));c['bounds']=union([b['bounds'] for b in c['renderBindings']]);c['triangleCount']=sum(b['triangleCount'] for b in c['renderBindings'])
        c['physicalSourcePartIds']=[b['sourcePartId'] for b in c['renderBindings'] if b['physicalContribution']=='carrier-solid']
        c['physicalBounds']=union([b['bounds'] for b in c['renderBindings'] if b['physicalContribution']=='carrier-solid'])
        c['physicalTriangleCount']=sum(b['triangleCount'] for b in c['renderBindings'] if b['physicalContribution']=='carrier-solid')
        for k in ('fuelAmount','area'):c[k]=q(c[k])
        c['quantityBasis']['volumeMetresCubed']=q(c['quantityBasis']['volumeMetresCubed'])
        if abs(c['bounds']['min'][1])<EPS:c['anchors']=[{'kind':'native-ground-contact','elevation':0,'evidence':'Exact source minimum at the preserved ground datum; native navigation remains authoritative.'}]
        if c['id']=='carrier/'+PILOTS[0]:c['finish']={'id':c['id']+'/finish','fuelClass':'lacquer','fuelAmount':.10,'quantityBasis':'Explicit architect-accepted pilot coating: .10 total; intentional gameplay adaptation, not inferred from paint or applied to other walls.','area':c['area'],'retirementOwnerId':c['id'],'separateFiniteAccount':True}
    contacts=add_contacts(carriers,shapes)
    # Declared native hinge/leaf attachments, distinct from inferred closed-pose surface contacts.
    byid={c['id']:c for c in carriers}
    for c in carriers:
        if c['role']=='door':
            p=c['portalId'];s=c['sourcePartIds'][0].rsplit('-',1)[-1];side='--1' if any(x.endswith('--1') for x in c['sourcePartIds']) else '-1'
            frame='carrier/'+p+'/jamb'+side
            assert frame in byid
            c['supportCarrierIds']=[frame];c['supportEvidence']=[{'carrierId':frame,'kind':'native-portal-hinge-attachment','portalId':p,'poseInvariant':True}]
        if c['role']=='door-hardware':
            side='--1' if c['sourcePartIds'][0].endswith('--1') else '-1';owner='carrier/'+c['portalId']+'/leaf'+side
            c['supportCarrierIds']=[owner];c['supportEvidence']=[{'carrierId':owner,'kind':'native-leaf-hardware-attachment','poseInvariant':True}]
    for c in carriers:
        if c['role'] in ('glazing','awning'):
            prefix=c['sourcePartIds'][0].rsplit('/',1)[0]
            candidates=['carrier/'+prefix+'/'+tag for tag in ('jamb--1','jamb-1','pilaster--1','pilaster-1','arch')]
            prefixes={prefix,prefix.removeprefix('replacement/')}
            candidates += [x['id'] for x in carriers if x['role']=='window-or-portal-frame' and any(v.rsplit('/',1)[0].removeprefix('replacement/') in prefixes for v in x['sourcePartIds'])]
            attached=sorted(set(x for x in candidates if x in byid))
            c['supportCarrierIds']=sorted(set(c['supportCarrierIds']+attached))
            c['supportEvidence'] += [{'carrierId':x,'kind':'native-opening-assembly-attachment','evidence':'Original window/awning or tower arch component grouping; source shape and offsets retained.'} for x in attached]
    for v in visual:
        prefix=v['sourcePartId'].rsplit('/',1)[0]
        v['assemblyId']='opening/'+prefix
        v['retirementDependencyCarrierIds']=[x for x in ['carrier/'+prefix+'/'+tag for tag in ('jamb--1','jamb-1','arch','pilaster--1','pilaster-1')] if x in byid]
        v['retirement']='Follow native opening assembly when its recorded dependencies retire; no independent fuel/support carrier. Missing dependencies stay unresolved.'
    rank={'carrier/'+x:i for i,x in enumerate(PILOTS)};carriers.sort(key=lambda c:(rank.get(c['id'],3),c['id']))
    fuel=collections.defaultdict(float)
    for c in carriers:
        if c['fuelClass']:fuel[c['fuelClass']]+=c['fuelAmount']
    finish_total=sum(c.get('finish',{}).get('fuelAmount',0) for c in carriers)
    roles=collections.Counter(c['role'] for c in carriers)
    no_direct_bearing=[c['id'] for c in carriers if not c['supportCarrierIds'] and not c['anchors']]
    for c in carriers:
        c['supportResolution']='direct-bearing-or-native-attachment' if c['supportCarrierIds'] else 'ground-anchor' if c['anchors'] else 'native-face-connected-span-needs-kernel-resolution' if c['adjacencyCarrierIds'] else 'unresolved-no-recorded-bearing-or-face-contact'
    unresolved_support=[c['id'] for c in carriers if c['supportResolution']=='unresolved-no-recorded-bearing-or-face-contact']
    rules={
      'inert':'Raised base, approach/paving, glazing and door hardware have zero fuel; this does not disable physical screening, breakage or unsupported retirement.',
      'wall-area':'Above-base exterior wall and native level-closure core: timber/clapboard; .16 m native depth; primary area times 1. Level 0 raised-base segments are stone.',
      'top-area':'Building floors/decks, elevated porch/terrace/balcony/roof-decks and interior stair treads are timber/frame; upward projected area times 1. Front landing and level-1 porch paving plus approach caps/treads are stone. Slabs preserve .12 m thickness; stair solids retain original depth.',
      'weather-area':'Closed authored pitched roof treated as timber-covering/roof; actual upward weather-face area times 1; buried underside excluded. This is a gameplay approximation, not a historical roofing-material finding.',
      'closed-volume':'Window/portal frames, columns, rails and named substantial fittings: timber/frame; actual closed-solid volume divided by .12. Fine painted details add no separate coating fuel.',
      'leaf-area':'Native 1 x 1.65 x .12 leaf plus its 1 x 1.15 x .12 extension share one door account: total panel area times .45. Metal handle remains a separate inert attached carrier.',
      'whole-awning':'.3 cloth units once per whole canopy/valance/stripe assembly, including tower arch awnings.',
      'lacquer':'Exactly .10 units on carrier/'+PILOTS[0]+' only; separate finite pilot coating. No blanket lacquer assignment.'}
    artifact={
      'version':1,'placeId':'new-york','status':'artist source-binding candidate; shared-runtime integration and visual acceptance pending',
      'sourceScene':{'indexPath':SCENE+'/index.json','sha256':INDEX_SHA,'navigationPath':SCENE+'/navigation.json','navigationSha256':digest((ROOT/SCENE/'navigation.json').read_bytes()),'accessCommit':index['sourceAccess']['commit'],'tileIntakeCommit':'b689f5501ab06f54822f2aa724ac77de106e3b71','commonBriefCommit':BASE,'evidencePath':EVIDENCE},
      'policyEvidence':policies,
      'coordinateFrame':{'units':'metres','frame':'emitted-world','sourceOffset':nav['sourceOffset'],'sourceOffsetAlreadyApplied':True,'upAxis':'+Y','levelPitch':2.12,'idScope':'place-local; consuming compiler qualifies once with placeId; never prefix new-york twice'},
      'sourceFacts':{'historicalMaterialStatus':'Original landmark structure and finish remain explicitly unassigned. None of this table changes that source history.','geometry':'Exact emitted composition after hidden-source replacements and actual floor cuts, including merged sourceRanges; not raw source plus access twice.','appearance':'Original appearance hashes/UVs/grossUV/normals/matrices remain unchanged; appearance does not assign physical material.','originalSourceId':'TB009-R02','originalStudyCommit':'5e8d64b8b41637637d57ed762eb5157e5d521b4f','sourcesPath':'art/source/exposition-new-york/sources.json','rights':'Preserve existing source provenance and rights limitations; no new license grant.'},
      'gameplayAssignments':{'authority':'Architect-accepted pilot contract at 15672d1187dd01ca6557f0459247adc0d4971a11:docs/milestones/29-shared-gameplay-maps.md; exact snapshot in policyEvidence','historicalFacts':False,'quantityUnit':'prototype-fuel-unit; finite gameplay quantities, not real-world mass','profileOwner':'Existing shared combustion kernel; this artifact does not tune rates or thresholds.','rules':rules,'unknownPolicy':'Explicit unassigned records below are not timber and must not receive an implicit dry-timber fallback.'},
      'geometryPolicy':{'physicalGeometry':'Only carrier-solid bindings contribute physical surfaces; awning stripes are appearance-only, following the same owner with no additional thermal surface or fuel.','collisions':'Preserve exact closed solids/apertures and openMatrix/openBounds. Bounds are evidence and broadphase only, not replacement collision shapes.','support':'Positive-area coplanar source-triangle contacts are recorded; hinges/hardware use native attachments. Side-face adjacency is separate from bearing. Unresolved/support-through-overlap or span decisions remain explicit; compiler/kernel owns live support resolution.','contactToleranceMetres':EPS,'minimumContactAreaMetresSquared':1e-6,'retirement':'Canonical local carrier owns fuel/char/retirement persistently; all renderBindings follow it, including only sourceRange when present. Geometry/collision/support/sight retire together. Never remove an entire unrelated instanced batch or duplicate fuel on section reload. Inert support loss never creates timber fuel.'},
      'nativeAccess':{'navigationPath':SCENE+'/navigation.json','occupiedLevels':nav['occupiedLevels'],'floorOpenings':nav['accessPlan']['floorOpenings'],'floorOpeningCoordinates':'access-plan source-local; add sourceOffset once when reading THIS original metadata; emitted carrier geometry already includes offset.','supportSurfaces':'navigation.surfaces (emitted-world); exact existing walking support including stairs/holes remains authoritative.','portals':nav['portals'],'stairs':'navigation.accessPlan.stairs retains native source-local paths and treads; navigation.surfaces is the compiled-world walking evidence.'},
      'pilotCarrierIds':['carrier/'+x for x in PILOTS],'carriers':carriers,'visualOnlyBindings':visual,'unassignedBindings':unassigned,
      'coverage':{'renderParts':render_count,'logicalSourceParts':len(parts),'sourceTriangles':triangle_count,'assignedSourceParts':sum(len(c['sourcePartIds']) for c in carriers),'carriers':len(carriers),'byRole':dict(sorted(roles.items())),'visualOnlySourceIds':[x['sourcePartId'] for x in visual],'visualRetirementUnresolvedSourceIds':[x['sourcePartId'] for x in visual if not x['retirementDependencyCarrierIds']],'unassignedSourceIds':[x['sourcePartId'] for x in unassigned],'noDirectBearingCarrierIds':no_direct_bearing,'supportUnresolvedCarrierIds':unresolved_support,'interiorPartitionCount':0,'interiorPartitionNote':'Original New York halls are unpartitioned. No historical partition walls are fabricated by this sidecar.','geometryChanges':0,'profileConstantsChanged':0},
      'finiteLedger':{'unit':'prototype-fuel-unit','coreByClass':{k:q(v) for k,v in sorted(fuel.items())},'coreTotal':q(sum(fuel.values())),'finishTotal':q(finish_total),'total':q(sum(fuel.values())+finish_total),'oneOwnerPerLogicalSourcePart':True,'awningCount':roles['awning'],'doorLeafCount':roles['door'],'finishCarrierIds':[c['id'] for c in carriers if c.get('finish')],'unassignedExcluded':True,'unverifiedClosedVolumeExcluded':True},
      'evidence':{'sourceLedgerPath':EVIDENCE,'sourceLedgerScope':'Exact physical source/provenance and authoring-tool dependencies; current policy documents are excluded.','policyEvidenceSha256':policy_digest,'sourceLedgerSha256':digest(json.dumps(ledger,sort_keys=True,separators=(',',':')).encode()),'contactCounts':contacts,'reviewLimits':['Source/art metadata and finite accounting only; no renderer, JPG, gameplay, ignition, collision traversal or actual-input acceptance claimed.','Exact material assignments are gameplay choices; original historical material uncertainty remains.','Non-coplanar overlap, side-supported attachments and floor span/load semantics need the shared compiler/kernel; unresolved support is not silently grounded.','Administration and Horticulture require separately accepted material overrides.']}}
    evidence={'version':1,'placeId':'new-york','commonBriefCommit':BASE,'sourceLedger':ledger,'sourceLedgerScope':'Exact physical source/provenance and authoring-tool dependencies; current policy documents are excluded.','policyEvidence':policies,'policyEvidenceSha256':policy_digest,'sourceLedgerSha256':artifact['evidence']['sourceLedgerSha256'],'nativeContract':{'cell':[1,1,2.12],'wall':[1,2,.16],'door':[1,1.65,.12],'slab':.12},'sourceGaps':[{'sourcePartId':u['sourcePartId'],'kind':u['kind'],'sourceClosedness':u['sourceClosedness'],'geometryId':u['renderBinding']['geometryId'],'sectionId':u['renderBinding']['sectionId'],'bounds':u['renderBinding']['bounds']} for u in unassigned if u['kind']=='quantity-unassigned-open-source'],'quantitySources':[{'path':'art/source/furnished-house/export.mjs','basis':'wall/floor/roof area; door area*.45; actual fittings volume/.12; whole cloth item .3; one explicit pilot coating .10'}],'outputPath':OUTPUT,'checksRequired':'python art/source/shared-map-fire-bindings/check.py; includes source pins, exact ownership/ranges/poses, independent finite quantity checks, pilot facts and unchanged native sources.'}
    return artifact,evidence

def encode(artifact):
    # One carrier per line keeps the large generated ledger reviewable in Git.
    lines=['{'];items=list(artifact.items())
    for i,(key,value) in enumerate(items):
        suffix=',' if i<len(items)-1 else ''
        if key in ('carriers','visualOnlyBindings','unassignedBindings'):
            lines.append('  '+json.dumps(key)+': [')
            lines.extend('    '+json.dumps(row,separators=(',',':'),ensure_ascii=True)+(',' if j<len(value)-1 else '') for j,row in enumerate(value))
            lines.append('  ]'+suffix)
        else:lines.append('  '+json.dumps(key)+': '+json.dumps(value,separators=(',',':'),ensure_ascii=True)+suffix)
    lines.append('}')
    return '\n'.join(lines)+'\n'

if __name__=='__main__':
    artifact,evidence=build();payload=encode(artifact);ev=json.dumps(evidence,indent=2,ensure_ascii=True)+'\n'
    if '--check' in sys.argv:
        assert (ROOT/OUTPUT).read_text(encoding='utf-8')==payload,'Export differs: run exporter deliberately'
        assert (ROOT/EVIDENCE).read_text(encoding='utf-8')==ev,'Evidence differs'
        print('Deterministic artifact and source ledger match')
    else:
        (ROOT/OUTPUT).parent.mkdir(parents=True,exist_ok=True);(ROOT/OUTPUT).write_text(payload,encoding='utf-8',newline='\n');(ROOT/EVIDENCE).write_text(ev,encoding='utf-8',newline='\n')
        print(json.dumps({'carriers':len(artifact['carriers']),'coverage':{k:v for k,v in artifact['coverage'].items() if not isinstance(v,(list,dict))},'roles':artifact['coverage']['byRole'],'unresolvedSupport':len(artifact['coverage']['supportUnresolvedCarrierIds']),'finiteLedger':artifact['finiteLedger'],'bytes':len(payload.encode())}))
