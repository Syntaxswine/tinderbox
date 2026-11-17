"""Bounded source-evidence proposal only. Does not change geometry, bindings or policy."""
from pathlib import Path
import collections, hashlib, importlib.util, json, math, re, subprocess, sys
sys.dont_write_bytecode=True
ROOT=Path(__file__).resolve().parents[3]
SPEC=importlib.util.spec_from_file_location('binding_math',Path(__file__).with_name('export.py'))
M=importlib.util.module_from_spec(SPEC);SPEC.loader.exec_module(M)
INPUT='assets/art/shared-map-fire-bindings/new-york.json'
OUTPUT='art/source/shared-map-fire-bindings/new-york-coverage-proposal.json'
EPS=0.00002

def sha(path):return hashlib.sha256((ROOT/path).read_bytes()).hexdigest()
def read(path):return json.loads((ROOT/path).read_text(encoding='utf-8'))
def norm(v):
    ln=math.sqrt(M.dot(v,v));return [x/ln for x in v] if ln>1e-12 else None

def box_description(g,b):
    if b.get('sourceRange') or b['triangleCount']!=12:return None
    pts=g['attributes']['position']['array'];vs=[pts[i:i+3] for i in range(0,len(pts),3)]
    lo=[min(p[k] for p in vs) for k in range(3)];hi=[max(p[k] for p in vs) for k in range(3)]
    corners=set(tuple(round(x,7) for x in p) for p in vs)
    if len(corners)!=8 or any(not all(min(abs(p[k]-lo[k]),abs(p[k]-hi[k]))<1e-7 for k in range(3)) for p in vs):return None
    local=M.triangles(g,[1,0,0,0,0,1,0,0,0,0,1,0,0,0,0,1])
    if any(not any(all(abs(p[k]-v)<1e-7 for p in t) for k in range(3) for v in (lo[k],hi[k])) for t in local):return None
    mat=b['matrix'];axes=[];halves=[]
    for k in range(3):
        axis=mat[k*4:k*4+3];scale=math.sqrt(M.dot(axis,axis));axes.append([x/scale for x in axis]);halves.append((hi[k]-lo[k])*scale/2)
    if any(abs(M.dot(axes[i],axes[j]))>1e-7 for i in range(3) for j in range(i)):return None
    return {'centre':M.point([(lo[k]+hi[k])/2 for k in range(3)],mat),'axes':axes,'halfExtents':halves}

def sat(a,b):
    axes=a['axes']+b['axes']+[M.cross(x,y) for x in a['axes'] for y in b['axes']];delta=M.sub(b['centre'],a['centre']);smallest=float('inf');largest_gap=-float('inf');gap_axis=None
    for axis in axes:
        n=norm(axis)
        if n is None:continue
        ra=sum(a['halfExtents'][k]*abs(M.dot(n,a['axes'][k])) for k in range(3));rb=sum(b['halfExtents'][k]*abs(M.dot(n,b['axes'][k])) for k in range(3));gap=abs(M.dot(delta,n))-ra-rb
        smallest=min(smallest,-gap)
        if gap>largest_gap:largest_gap=gap;gap_axis=n
    return {'positiveVolumeOverlap':smallest>EPS,'minimumProjectionOverlap':round(smallest,9),'separatingAxisGap':round(max(0,largest_gap),9),'separatingAxis':gap_axis}

def convex_planes(ts):
    vertices=list({tuple(round(x,7) for x in v) for t in ts for v in t});centre=[sum(v[k] for v in vertices)/len(vertices) for k in range(3)];planes={}
    for t in ts:
        n=norm(M.cross(M.sub(t[1],t[0]),M.sub(t[2],t[0])))
        if n is None:continue
        if M.dot(n,M.sub(t[0],centre))<0:n=[-x for x in n]
        d=M.dot(n,t[0])
        if any(M.dot(n,v)-d>EPS for v in vertices):return None
        planes[tuple(round(x,7) for x in n+[d])]=(n,d)
    return list(planes.values())

def strictly_inside(p,planes):return planes is not None and all(M.dot(n,p)<d-EPS for n,d in planes)

def intersection_proof(a,b):
    if a['box'] and b['box']:
        result=sat(a['box'],b['box'])
        if result['positiveVolumeOverlap']:return {'kind':'exact-native-box-sat-volume-overlap','minimumProjectionOverlapMetres':result['minimumProjectionOverlap']}
        return None
    # Witnesses are actual source vertices or points on actual source triangles,
    # strictly within the other verified closed convex source solid. Bounds only cull.
    for child,parent,label in [(a,b,'child-source-point-inside-parent-solid'),(b,a,'parent-source-point-inside-child-solid')]:
        if not parent['convex']:continue
        for p in child['samples']:
            if strictly_inside(p,parent['convex']):return {'kind':label,'worldWitness':[round(x,7) for x in p],'minimumInteriorPlaneMarginMetres':round(min(d-M.dot(n,p) for n,d in parent['convex']),9)}
    return None

def components(edges):
    graph=collections.defaultdict(set)
    for (a,b),count in edges.items():
        if count!=2:graph[a].add(b);graph[b].add(a)
    out=[];seen=set()
    for start in sorted(graph):
        if start in seen:continue
        stack=[start];v=[]
        while stack:
            x=stack.pop()
            if x in seen:continue
            seen.add(x);v.append(x);stack.extend(graph[x]-seen)
        out.append({'vertices':len(v),'degreeCounts':dict(sorted(collections.Counter(len(graph[x]) for x in v).items())),'simpleBoundaryCycle':all(len(graph[x])==2 for x in v)})
    return out

def boundary_edges(ts):
    edges=collections.Counter()
    for t in ts:
        n=M.cross(M.sub(t[1],t[0]),M.sub(t[2],t[0]))
        if math.sqrt(M.dot(n,n))/2<=1e-10:continue
        vs=[tuple(round(x,5) for x in v) for v in t]
        for a,b in zip(vs,vs[1:]+vs[:1]):
            if a!=b:edges[tuple(sorted([a,b]))]+=1
    vertices=set(v for e in edges for v in e);out=collections.Counter()
    for (a,b),count in edges.items():
        d=M.sub(b,a);length=M.dot(d,d);cuts=[(0,a),(1,b)]
        for v in vertices:
            t=M.dot(M.sub(v,a),d)/length
            if 1e-6<t<1-1e-6 and math.dist(v,[a[k]+t*d[k] for k in range(3)])<EPS:cuts.append((t,v))
        cuts.sort()
        for (_,x),(_,y) in zip(cuts,cuts[1:]):
            if math.dist(x,y)>EPS:out[tuple(sorted([x,y]))]+=count
    return {e:n for e,n in out.items() if n!=2}

def original_jambs():
    script="""import {createHash} from 'node:crypto';
import * as T from './src/runtime/three.js';
import {createNewYorkStateBuildingTile} from './assets/art/exposition-new-york-tile/index.js';
import {partsOf} from './art/source/exploration-access/source-geometry.mjs';
const view=createNewYorkStateBuildingTile(T);
try {const wanted=new Set(['main/1/entry/jamb--1','main/1/entry/jamb-1','main/11/entry/jamb--1','main/11/entry/jamb-1']);
const out=partsOf(view.root,'new-york').filter(p=>wanted.has(p.id)).map(p=>({id:p.id,bounds:p.bounds,sourceGeometrySha256:createHash('sha256').update(JSON.stringify(p.vertices)).digest('hex'),positions:p.vertices.map(v=>v.slice(0,3))}));
if(out.length!==4)throw Error('Original jamb evidence incomplete');process.stdout.write(JSON.stringify(out));}finally{view.dispose();}"""
    out=json.loads(subprocess.check_output(['node','--input-type=module'],input=script.encode(),cwd=ROOT))
    return {x['id']:x for x in out}

def family(source):
    if '/handrail-' in source:return source.split('/handrail-')[0]
    return source.rsplit('/',1)[0]

def build():
    a=read(INPUT);assert sha(INPUT)=='7490e3bfeeab4a6080d2c9d97b99fc81bac875d711c83fcbe4c10e34e008b1f9'
    assert sha(a['sourceScene']['indexPath'])==a['sourceScene']['sha256']
    assert sha(a['sourceScene']['navigationPath'])==a['sourceScene']['navigationSha256']
    originals=original_jambs()
    scene=read(a['sourceScene']['indexPath']);nav=read(a['sourceScene']['navigationPath']);geom={k:read('assets/art/place-scenes/new-york/'+v) for k,v in scene['geometries'].items()};carriers={c['id']:c for c in a['carriers']};targets=set(a['coverage']['supportUnresolvedCarrierIds']);shapes={};bins=collections.defaultdict(set)
    for cid,c in carriers.items():
        if c['physicalMaterial'] not in ('timber','stone') or c['role'] in ('door','awning','roof-covering'):continue
        bindings=[b for b in c['renderBindings'] if b['physicalContribution']=='carrier-solid'];ts=[t for b in bindings for t in M.triangles(geom[b['geometryId']],b['matrix'],b.get('sourceRange'))];bb=c['physicalBounds'];box=box_description(geom[bindings[0]['geometryId']],bindings[0]) if len(bindings)==1 else None
        samples=list({tuple(v) for t in ts for v in t});samples += [tuple(sum(v[k] for v in t)/3 for k in range(3)) for t in ts]
        shapes[cid]={'triangles':ts,'box':box,'convex':None if box else convex_planes(ts),'samples':samples,'bounds':bb}
        if box:
            shapes[cid]['convex']=[(ax,M.dot(ax,box['centre'])+box['halfExtents'][j]) for j,axis in enumerate(box['axes']) for ax in (axis,[-x for x in axis])]
        for x in range(math.floor(bb['min'][0]/4),math.floor(bb['max'][0]/4)+1):
          for y in range(math.floor(bb['min'][1]/4),math.floor(bb['max'][1]/4)+1):
            for z in range(math.floor(bb['min'][2]/4),math.floor(bb['max'][2]/4)+1):bins[x,y,z].add(cid)
    candidates={};proof_types=collections.Counter()
    for cid in sorted(targets):
        shape=shapes[cid];bb=shape['bounds'];nearby=set()
        for x in range(math.floor(bb['min'][0]/4),math.floor(bb['max'][0]/4)+1):
          for y in range(math.floor(bb['min'][1]/4),math.floor(bb['max'][1]/4)+1):
            for z in range(math.floor(bb['min'][2]/4),math.floor(bb['max'][2]/4)+1):nearby.update(bins[x,y,z])
        matches=[]
        for other in sorted(nearby-{cid}):
            ob=shapes[other]['bounds']
            if any(min(bb['max'][k],ob['max'][k])-max(bb['min'][k],ob['min'][k])<=EPS for k in range(3)):continue
            proof=intersection_proof(shape,shapes[other])
            if proof:
                matches.append({'carrierId':other,'role':carriers[other]['role'],'baselineSupportResolution':carriers[other]['supportResolution'],'evidence':proof});proof_types[proof['kind']]+=1
        candidates[cid]=matches
    # Connect to an already documented native carrier, not to earth. Keep directed
    # proposed parents descending in distance, avoiding new mutual-support cycles.
    graph=collections.defaultdict(set);distance={};queue=collections.deque()
    for cid,matches in candidates.items():
        for match in matches:
            parent=match['carrierId'];graph[cid].add(parent);graph[parent].add(cid)
            if parent not in targets and parent not in distance:distance[parent]=0;queue.append(parent)
    while queue:
        parent=queue.popleft()
        for child in sorted(graph[parent]):
            if child not in distance:distance[child]=distance[parent]+1;queue.append(child)
    support=[]
    rank={'raised-base':0,'exterior-wall':1,'perimeter-closure':1,'building-deck':2,'interior-stair':2,'column':3,'rail':4,'window-or-portal-frame':5,'timber-fitting':6}
    for cid in sorted(targets):
        c=carriers[cid];matches=candidates[cid];parents=[x for x in matches if distance.get(x['carrierId'],999)<distance.get(cid,999)];parents.sort(key=lambda x:(rank.get(x['role'],9),distance.get(x['carrierId'],999),x['carrierId']))
        record={'carrierId':cid,'sourcePartIds':c['sourcePartIds'],'role':c['role'],'status':'proposal-only-not-applied','groundAnchor':False,'verifiedEmbeddedCandidates':matches,'proposedParentCarrierIds':[x['carrierId'] for x in parents],'distanceToExistingDocumentedCarrier':distance.get(cid),'relationship':'geometric-embed-join-needs-explicit-acceptance' if parents else 'unresolved-geometric-support','parentRetirement':'Dependent joins retire/lose support with actual parents; never stay alive through an earth anchor.'}
        if not parents:
            fam=family(c['sourcePartIds'][0]);siblings=[p for p,v in carriers.items() if p!=cid and any(s.startswith(fam+'/post-') for s in v['sourcePartIds'])]
            record['authoredParentAssembly']={'id':fam,'sourcePath':'assets/art/exploration-access/index.js' if fam.startswith('ny-') else 'assets/art/exposition-new-york-tile/index.js','geometricContactAsserted':False}
            if siblings and '/handrail-' in c['sourcePartIds'][0]:
                sign='--1' if c['sourcePartIds'][0].endswith('/handrail--1') else '-1'
                siblings=[pid for pid in siblings if any(v.startswith(fam+'/post'+sign+'-') for v in carriers[pid]['sourcePartIds'])]
            if siblings:
                gaps=[]
                for pid in siblings:
                    if shapes[cid]['box'] and shapes.get(pid,{}).get('box'):gaps.append({'carrierId':pid,**sat(shapes[cid]['box'],shapes[pid]['box'])})
                record['authoredParentAssembly']['postSeparationEvidence']=gaps
                record['authoredParentAssembly']['proposedParentCarrierIds']=sorted(siblings)
                record['authoredParentAssembly']['sourcePostTopToRailCentrelineVerticalDistanceMetres']=.05
                record['authoredParentAssembly']['proposedDecision']='Approve an explicit fixed rail-to-post assembly joint across the measured source gap, or separately authorize a bounded connector/placement correction. No collision inflation or earth anchoring.'
        panel=re.match(r'(tower-(?:east|west))/lower-panel-(\d+)-(-?1)$',c['sourcePartIds'][0])
        if not parents and panel:
            run=panel.group(1)+'/'+panel.group(2);wall=[]
            for pid,pc in carriers.items():
                if pc['role'] not in ('exterior-wall','perimeter-closure') or not any(v.startswith(run+'/') for v in pc['sourcePartIds']):continue
                if not shapes[cid]['box'] or not shapes.get(pid,{}).get('box'):continue
                detail=sat(shapes[cid]['box'],shapes[pid]['box'])
                panel_box=shapes[cid]['box'];wall_box=shapes[pid]['box'];delta=M.sub(wall_box['centre'],panel_box['centre']);tangential=[]
                for axis in panel_box['axes'][:2]:
                    pa=sum(panel_box['halfExtents'][k]*abs(M.dot(axis,panel_box['axes'][k])) for k in range(3));pb=sum(wall_box['halfExtents'][k]*abs(M.dot(axis,wall_box['axes'][k])) for k in range(3))
                    tangential.append(pa+pb-abs(M.dot(delta,axis)))
                if 0<detail['separatingAxisGap']<.011 and min(tangential)>EPS:
                    wall.append({'carrierId':pid,'positiveMountProjectionOverlapMetres':[round(v,9) for v in tangential],**detail})
            assert wall,'Missing exact wall standoff evidence: '+cid
            record['authoredParentAssembly']={'id':run,'sourcePath':'assets/art/exposition-new-york-tile/index.js','geometricContactAsserted':False,'wallSeparationEvidence':wall,'proposedParentCarrierIds':[v['carrierId'] for v in wall],'proposedDecision':'Approve a fixed decorative-panel mount to these native wall/closure carriers across the measured 10 mm standoff; no earth anchor, mesh scaling or collision inflation.'}
        support.append(record)
    # Explicit finite ID groups, each a proposed gameplay choice rather than historical fact.
    group_defs=[('substantial-entry-timber',2,lambda s:s in ('entry/entablature','entry/relief-band'),'timber','frame','closed-volume/.12'),('large-upper-relief',1,lambda s:s=='entry/upper-relief','stone',None,'zero; mineral plaster/staff proxy'),('medallion-and-cameo',8,lambda s:s.startswith(('entry/medallion','entry/cameo-')),'stone',None,'zero; mineral plaster/staff proxy'),('swag-reliefs',15,lambda s:s.startswith(('entry/relief-swag-','frieze-swag-')),'stone',None,'zero; mineral plaster/staff proxy'),('niche-surrounds',16,lambda s:s.startswith('niche-'),'stone',None,'zero; mineral plaster/staff proxy'),('urns',31,lambda s:'urn-' in s,'stone',None,'zero; cast-mineral/stone proxy'),('tower-finials',2,lambda s:s in ('tower-east/terminal','tower-west/terminal'),'metal',None,'zero; metal finial proxy')]
    materials=[];counts=collections.Counter()
    for u in a['unassignedBindings']:
        if u['kind']!='material-unassigned':continue
        source=u['sourcePartId'];selected=[r for r in group_defs if r[2](source)];assert len(selected)==1,source
        group,_,_,material,profile,basis=selected[0];counts[group]+=1;b=u['renderBinding'];ts=M.triangles(geom[b['geometryId']],b['matrix']);m=M.measures(ts)
        materials.append({'sourcePartId':source,'group':group,'status':'proposed-gameplay-choice-not-historical-fact-not-applied','physicalMaterial':material,'materialDetail':'Painted substantial timber fitting' if material=='timber' else 'Mineral plaster/staff uses the existing inert stone behavior' if 'plaster' in basis else 'Cast-mineral/stone ornament' if material=='stone' else 'Metal finial','fuelClass':profile,'proposedFuelAmount':round(m['volume']/.12,6) if profile else 0,'quantityBasis':basis,'closedSourceSolid':m['closed'],'measuredClosedVolume':round(m['volume'],9),'worldBounds':b['bounds'],'worldDimensions':[round(b['bounds']['max'][k]-b['bounds']['min'][k],6) for k in range(3)],'geometryId':b['geometryId'],'sectionId':b['sectionId'],'solidAndRetirement':'Retain real geometry/screening; detach/retire through actual parent support rather than burning mineral/metal as timber.'})
    assert dict(counts)=={r[0]:r[1] for r in group_defs},counts
    hidden={v['replacementId']:v for v in nav['accessPlan']['hiddenSourceParts'] if v.get('replacementId')};cutmap={x['id']:x for x in nav['accessPlan']['cutVolumes']};offset=nav['sourceOffset'];repairs=[]
    for u in a['unassignedBindings']:
        if u['kind']!='quantity-unassigned-open-source':continue
        b=u['renderBinding'];ts=M.triangles(geom[b['geometryId']],b['matrix']);edges=boundary_edges(ts);h=hidden[u['sourcePartId']];planes=[]
        for cutid in h['reasons']:
            cut=cutmap[cutid]
            for axis,vals in [(0,[p[0]+offset[0] for p in cut['polygon']]),(1,[cut['minY']+offset[1],cut['maxY']+offset[1]]),(2,[p[1]+offset[2] for p in cut['polygon']])]:
                for side,value in [('min',min(vals)),('max',max(vals))]:planes.append({'cutId':cutid,'axis':axis,'side':side,'worldValue':round(value,9)})
        edge_rows=[]
        for (p,q),mult in sorted(edges.items()):
            on=[x for x in planes if abs(p[x['axis']]-x['worldValue'])<EPS and abs(q[x['axis']]-x['worldValue'])<EPS]
            edge_rows.append({'a':p,'b':q,'multiplicity':mult,'existingCutPlanes':on})
        repairs.append({'sourcePartId':u['sourcePartId'],'sourceOriginalId':h['id'],'geometryId':b['geometryId'],'sectionId':b['sectionId'],'sourceGeometrySha256':h['sourceGeometrySha256'],'cutIds':h['reasons'],'existingCutPlanes':planes,'unmatchedEdgeCount':len(edges),'edgeMultiplicityCounts':dict(sorted(collections.Counter(edges.values()).items())),'boundaryComponents':components(edges),'unmatchedEdges':edge_rows,'edgesOffKnownCutPlanes':sum(not x['existingCutPlanes'] for x in edge_rows),'proposal':'Derived-only closure/retriangulation of this ID at these existing planes. Preserve original source, all retained surface attributes, aperture volumes, native dimensions and world matrix. Do not fill an aperture or cap a nonmanifold sliver as a guessed polygon.'})
    for record in repairs:
        if set(record['edgeMultiplicityCounts'])=={1}:
            assert record['edgesOffKnownCutPlanes']==0 and all(x['simpleBoundaryCycle'] for x in record['boundaryComponents'])
            record['repairKind']='derived-cut-plane-caps'
            record['exactOperation']='Recover cross-section patches on the listed existing cut planes, constrained by the original solid and cut prism. Triangulate each plane separately, preserving holes and orientation. Append only missing retained-solid closure faces; leave the opening empty and all retained source attributes unchanged.'
        else:
            original=originals[record['sourceOriginalId']]
            assert original['sourceGeometrySha256']==record['sourceGeometrySha256']
            ts=[original['positions'][i:i+3] for i in range(0,len(original['positions']),3)];measure=M.measures(ts);assert measure['closed']
            b=original['bounds'];contacts=[]
            for cutid in record['cutIds']:
                cut=cutmap[cutid];lo=[min(v[0] for v in cut['polygon']),cut['minY'],min(v[1] for v in cut['polygon'])];hi=[max(v[0] for v in cut['polygon']),cut['maxY'],max(v[1] for v in cut['polygon'])]
                overlap=[min(b['max'][k],hi[k])-max(b['min'][k],lo[k]) for k in range(3)]
                assert min(overlap)<EPS
                contacts.append({'cutId':cutid,'sourceLocalInteriorOverlapByAxis':overlap,'positiveInteriorVolumeAtAuthoredTolerance':False})
            record['repairKind']='reuse-original-closed-jamb-at-zero-interior-cut-contact'
            record['originalClosedSourceEvidence']={'boundsSourceLocal':b,'sourceGeometrySha256':original['sourceGeometrySha256'],'closed':True,'closedVolume':measure['volume'],'cutContacts':contacts}
            record['exactOperation']='Skip this zero-interior-volume cut contact and use the exact original closed jamb in the derived map. The original only touches the cut prism within native float tolerance. Do not cap multiplicity-four edges as a polygon, add fuel from the defective fragment or enlarge the opening.'
    assert collections.Counter(r['repairKind'] for r in repairs)=={'derived-cut-plane-caps':25,'reuse-original-closed-jamb-at-zero-interior-cut-contact':4}
    roles=collections.Counter(x['role'] for x in support);assert roles=={'window-or-portal-frame':569,'timber-fitting':79,'column':4,'rail':12}
    summary={'materialDecisions':dict(sorted(counts.items())),'materialSourceIds':len(materials),'openCutSourceIds':len(repairs),'repairKinds':dict(collections.Counter(r['repairKind'] for r in repairs)),'supportByRole':dict(sorted(roles.items())),'supportCarrierIds':len(support),'supportsWithVerifiedEmbeddedPath':sum(bool(x['proposedParentCarrierIds']) for x in support),'supportsNeedingExplicitAssemblyDecision':sum(not x['proposedParentCarrierIds'] for x in support),'newGroundAnchors':0,'geometryChanged':False,'bindingsChanged':False,'rendered':False,'intersectionProofCounts':dict(proof_types)}
    return {'version':1,'placeId':'new-york','status':'bounded coverage-completion proposal; no assignments or repairs applied','inputBindings':{'path':INPUT,'sha256':sha(INPUT),'commit':'59b9373f47d51531c7e505613f67dd1e426b37f1'},'analysisDependencies':[{'path':path,'sha256':sha(path)} for path in ['art/source/shared-map-fire-bindings/export.py','art/source/exploration-access/source-geometry.mjs','assets/art/exposition-new-york-tile/index.js','assets/art/exposition-new-york-tile/plan.js','assets/art/exposition-new-york/forms.js']],'sourceIndexSha256':sha(a['sourceScene']['indexPath']),'navigationSha256':sha(a['sourceScene']['navigationPath']),'authoringScriptSha256':sha(Path(__file__).relative_to(ROOT).as_posix()),'coordinateFrame':a['coordinateFrame'],'evidenceRules':{'bounds':'Broadphase only; actual native box geometry/SAT or closed-convex source-point containment proves positive-volume embed.','attachment':'Geometric overlap supports a proposed authored join, not an independent earth anchor or demonstrated collapse behavior. Chosen parents descend toward already documented native carriers, avoiding new mutual-support cycles.','toleranceMetres':EPS,'currentGaps':'A declared parent assembly without geometric contact is labelled explicitly and requires a decision.','originals':'All existing raw/compiled geometry and accepted bindings stay unchanged.'},'decisionsRequired':[{'id':'materials-75','proposal':'Approve the explicit per-ID material table: two substantial timber fittings; separate mineral relief/niche/urn proxies and metal finials. Historical materials remain unassigned.'},{'id':'derived-cuts-29','proposal':'Authorize a versioned additive derived-only overlay: cap 25 existing cut-boundary surfaces; reuse four original closed jambs for zero-interior cut contacts. Do not mutate raw source/history or fill apertures.'},{'id':'embedded-joins-652','proposal':'Approve the listed per-carrier fixed embed attachments to actual native parents, with local parent retirement/support propagation, zero new earth anchors and no global all-overlaps-support rule.'},{'id':'authored-mounts-12','proposal':'Approve explicit fixed assembly mounts for four rail/post sets and eight panel/wall sets across measured gaps, or return these 12 for a separately bounded connector/placement change. No geometric bearing is claimed.'}],'summary':summary,'materialChoices':materials,'derivedCutRepairs':repairs,'supportAttachments':support}

def encode(proposal):
    lines=['{'];items=list(proposal.items())
    for i,(key,value) in enumerate(items):
        comma=',' if i<len(items)-1 else ''
        if key in ('materialChoices','derivedCutRepairs','supportAttachments'):
            lines.append('  '+json.dumps(key)+': [')
            lines.extend('    '+json.dumps(row,sort_keys=True,separators=(',',':'))+(',' if j<len(value)-1 else '') for j,row in enumerate(value))
            lines.append('  ]'+comma)
        else:lines.append('  '+json.dumps(key)+': '+json.dumps(value,sort_keys=True,separators=(',',':'))+comma)
    return '\n'.join(lines+['}'])+'\n'

def controls():
    def cube(centre,axes=None,half=(1,1,1)):return {'centre':centre,'axes':axes or [[1,0,0],[0,1,0],[0,0,1]],'halfExtents':half}
    assert sat(cube([0,0,0]),cube([1,0,0]))['positiveVolumeOverlap']
    assert not sat(cube([0,0,0]),cube([2,0,0]))['positiveVolumeOverlap']
    # Crossing beams intersect without a contained endpoint; SAT must retain the real intersection.
    assert sat(cube([0,0,0],half=(3,.1,.1)),cube([0,0,0],half=(.1,.1,3)))['positiveVolumeOverlap']
    angle=math.pi/4;axes=[[math.cos(angle),0,-math.sin(angle)],[0,1,0],[math.sin(angle),0,math.cos(angle)]]
    assert not sat(cube([0,0,0],axes,(3,.1,.05)),cube([.2*math.sin(angle),0,.2*math.cos(angle)],axes,(3,.1,.05)))['positiveVolumeOverlap']
    planes=[([1,0,0],1),([-1,0,0],1),([0,1,0],1),([0,-1,0],1),([0,0,1],1),([0,0,-1],1)]
    assert strictly_inside([0,0,0],planes) and not strictly_inside([1,0,0],planes)

if __name__=='__main__':
    controls();proposal=build();payload=encode(proposal);path=ROOT/OUTPUT
    if '--check' in sys.argv:assert path.read_text(encoding='utf-8')==payload,'Proposal is not reproducible'
    else:path.write_text(payload,encoding='utf-8',newline='\n')
    assert sha(INPUT)==proposal['inputBindings']['sha256'];assert all(not x['groundAnchor'] for x in proposal['supportAttachments'])
    print(json.dumps({'result':'PASS','proposalOnly':True,'controls':5,'summary':proposal['summary'],'bytes':len(payload.encode())},sort_keys=True))
