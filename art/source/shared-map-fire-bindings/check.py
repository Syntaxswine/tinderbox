"""Independent source/finite-ledger checks for the additive M29 art candidate.
No renderer, source rewrite, solver tuning or live-game acceptance is performed.
"""
from pathlib import Path
import argparse, collections, hashlib, json, math, subprocess, sys
ROOT=Path(__file__).resolve().parents[3]
BASE='6d1061cd3ab7e6c9bff212381193376473413b30'
SCENE='assets/art/place-scenes/new-york'
checks=collections.Counter()
POLICY_PATHS={'docs/art/shared-modular-art-workflow.md','docs/milestones/29-shared-gameplay-maps.md'}
def check(ok,label):
    assert ok,label
    checks[label.split(':')[0]]+=1

def read(path):return json.loads((ROOT/path).read_text(encoding='utf-8'),parse_constant=lambda v:(_ for _ in ()).throw(ValueError(v)))
def sha(path):return hashlib.sha256((ROOT/path).read_bytes()).hexdigest()
def near(a,b,tol=0.00003):return abs(a-b)<=tol

def vertex(p,m):return [m[k]*p[0]+m[k+4]*p[1]+m[k+8]*p[2]+m[k+12] for k in range(3)]
def triangle_list(g,m,ran=None):
    pos=g['attributes']['position']['array'];ind=g.get('index')
    if isinstance(ind,dict):ind=ind['array']
    if ind is None:ind=list(range(len(pos)//3))
    if ran:ind=ind[ran['start']:ran['start']+ran['count']]
    return [[vertex(pos[k*3:k*3+3],m) for k in ind[j:j+3]] for j in range(0,len(ind),3)]
def vec(a,b):return [a[k]-b[k] for k in range(3)]
def normal(t):
    a,b=vec(t[1],t[0]),vec(t[2],t[0]);return [a[1]*b[2]-a[2]*b[1],a[2]*b[0]-a[0]*b[2],a[0]*b[1]-a[1]*b[0]]
def length(v):return sum(x*x for x in v)**.5

def numeric_facts(ts):
    o=ts[0][0];vol=0;up=0;projected=0;surface=0
    for t in ts:
        n=normal(t);ar=length(n)/2;surface+=ar
        a,b,c=[vec(v,o) for v in t]
        vol+=(a[0]*(b[1]*c[2]-b[2]*c[1])+a[1]*(b[2]*c[0]-b[0]*c[2])+a[2]*(b[0]*c[1]-b[1]*c[0]))/6
        if n[1]>1e-10:up+=ar;projected+=n[1]/2
    return abs(vol),surface,up,projected

def check_binding(binding,source,geoms):
    check(binding['partId']==source['id'],'binding:render part')
    check(binding['matrix']==source['matrix'],'binding:exact world matrix')
    check(binding['geometryId']==source['geometry'],'binding:geometry reference')
    check(binding['appearanceMaterialId']==source['material'],'binding:appearance identity')
    check(binding['sectionId']==source['_section'],'binding:section identity')
    for key in ('openMatrix','openBounds'):check(binding.get(key)==source.get(key),'binding:live door '+key)
    if binding.get('sourceRange'):check(binding['sourceRange'] in source['sourceRanges'],'binding:exact merged range')
    ts=triangle_list(geoms[source['geometry']],source['matrix'],binding.get('sourceRange'))
    check(binding['triangleCount']==len(ts),'binding:triangle count')
    for name,fn in [('min',min),('max',max)]:
        for k in range(3):check(near(binding['bounds'][name][k],fn(v[k] for t in ts for v in t)),'binding:measured bounds')
    return ts

def check_quantity(c,ts):
    check(math.isfinite(c['fuelAmount']) and c['fuelAmount']>=0,'quantity:finite nonnegative core')
    rule=c['quantityBasis']['rule'];volume,surface,up,projected=numeric_facts(ts)
    check(near(volume,c['quantityBasis']['volumeMetresCubed']),'quantity:source volume')
    if rule=='wall-area':check(near(c['fuelAmount'],volume/.16),'quantity:one primary wall face')
    elif rule=='leaf-area':check(near(c['fuelAmount'],volume/.12*.45),'quantity:complete native leaf and extension')
    elif rule=='closed-volume':
        check(c['quantityBasis']['closedSourceSolids'],'quantity:closed fitting source required')
        check(near(c['fuelAmount'],volume/.12),'quantity:closed fitting volume')
    elif rule=='top-area':check(near(c['fuelAmount'],projected),'quantity:single top footprint')
    elif rule=='whole-awning':check(c['fuelAmount']==.3,'quantity:whole cloth item once')
    elif rule=='weather-area':
        qb=c['quantityBasis'];check(near(qb['grossWeatherArea'],up),'quantity:gross roof source')
        check(c['area']<=up+0.00003 and qb['excludedBuriedOrDuplicateArea']>=0,'quantity:roof area never increases')
        exposed=0
        for f in qb['weatherFaces']:
            orig=ts[f['triangleIndex']];n=normal(orig);fragments_area=0
            for poly in f['surfaceFragments']:
                # Independently triangulate the exported 3D polygons; no exporter clipping code is imported.
                area=sum(length(normal([poly[0],poly[j],poly[j+1]]))/2 for j in range(1,len(poly)-1));fragments_area+=area
                for v in poly:
                    check(abs(sum(n[k]*(v[k]-orig[0][k]) for k in range(3)))/length(n)<0.00003,'roof:fragments lie on original plane')
                    check(all(min(w[k] for w in orig)-0.00003<=v[k]<=max(w[k] for w in orig)+0.00003 for k in range(3)),'roof:fragments stay within source triangle bounds')
            check(near(fragments_area,f['exposedArea'],.0002),'roof:independent fragment area')
            exposed+=fragments_area
        check(near(exposed,c['area'],.001) and near(c['fuelAmount'],c['area']),'quantity:finite exposed roof area')
    elif rule=='inert':check(c['fuelClass'] is None and c['fuelAmount']==0,'quantity:inert cannot become timber')
    else:raise AssertionError('Unknown quantity rule '+rule)
    if c['fuelClass']:check(c['quantityBasis']['closedSourceSolids'],'quantity:fuel uses geometrically closed source')

def check_ownership(a,logical):
    owned=[x for c in a['carriers'] for x in c['sourcePartIds']]+[x['sourcePartId'] for x in a['visualOnlyBindings']]+[x['sourcePartId'] for x in a['unassignedBindings']]
    check(len(owned)==len(set(owned)),'ownership:no duplicate physical/render fuel ownership')
    check(set(owned)==logical,'ownership:complete emitted logical-source coverage')
    check(len({c['id'] for c in a['carriers']})==len(a['carriers']),'ownership:canonical carrier IDs unique')

def check_ledger(a):
    profiles=collections.defaultdict(float);finish=[]
    for c in a['carriers']:
        if c['fuelClass']:profiles[c['fuelClass']]+=c['fuelAmount']
        if c.get('finish'):finish.append(c)
    ledger=a['finiteLedger']
    check({k:round(v,6) for k,v in profiles.items()}==ledger['coreByClass'],'ledger:core finite class totals')
    check(len(finish)==1 and finish[0]['id']=='carrier/main/0/cell-1-22/1' and finish[0]['finish']['fuelAmount']==.1,'ledger:only accepted pilot has coating')
    check(near(sum(profiles.values()),ledger['coreTotal']),'ledger:core total')
    check(ledger['finishTotal']==.1 and near(sum(profiles.values())+.1,ledger['total']),'ledger:core plus separate finite coating')
    check(len([c for c in a['carriers'] if c['role']=='awning'])==58 and near(profiles['cloth'],17.4),'ledger:58 complete awnings')
    check(len([c for c in a['carriers'] if c['role']=='door'])==10 and near(profiles['door'],12.6),'ledger:ten native paired-door leaves')

def rejects(fn,label):
    try:fn()
    except AssertionError:checks['negative controls']+=1;return
    raise AssertionError('Invalid mutation was accepted: '+label)

def check_source_dependencies(rows,reader=None):
    reader=reader or (lambda path:(ROOT/path).read_bytes())
    for row in rows:
        check(row['path'] not in POLICY_PATHS,'pin:mutable policy excluded from physical dependencies')
        check(hashlib.sha256(reader(row['path'])).hexdigest()==row['sha256'],'pin:source dependency hash: '+row['path'])

def check_policy_evidence(rows,snapshot_reader=None):
    expected={'shared-workflow-read-at-authoring':(BASE,'63415856848ab3c26f509cb09eed2b079ea8973b'),
              'original-brief-read-at-authoring':(BASE,'d52cb2372fbe966b04d9bf53cc041802116339b6'),
              'accepted-pilot-contract':('15672d1187dd01ca6557f0459247adc0d4971a11','4eb7a9880a4b2f9affdc0c13eb3c2e81ad56925a')}
    check(len(rows)==len(expected) and {r['role'] for r in rows}==set(expected),'policy:exact original and accepted committed contexts')
    snapshot_reader=snapshot_reader or (lambda path:(ROOT/path).read_bytes())
    for row in rows:
        check((row['commit'],row['gitBlob'])==expected[row['role']],'policy:known committed object identity')
        ref=row['commit']+':'+row['path']
        blob=subprocess.check_output(['git','rev-parse',ref],cwd=ROOT,text=True).strip()
        committed=subprocess.check_output(['git','show',ref],cwd=ROOT)
        check(blob==row['gitBlob'],'policy:reference resolves exact blob')
        check(hashlib.sha256(committed).hexdigest()==row['sha256'],'policy:committed object sha256')
        check(snapshot_reader(row['snapshotPath'])==committed,'policy:snapshot is exact committed source')
        if row['role']=='shared-workflow-read-at-authoring':check(b'Version 2' in committed.splitlines()[2],'policy:Version 2 workflow actually committed')
        if row['role']=='accepted-pilot-contract':check(b'## Reconciled pilot contracts' in committed,'policy:accepted amendment preserved')
        if 'originalDeliveryWorkingCopySha256' in row:
            observed=committed.replace(b'\n',b'\r\n') if row['originalDeliveryLineEndings']=='CRLF' else committed
            check(hashlib.sha256(observed).hexdigest()==row['originalDeliveryWorkingCopySha256'],'policy:original delivery serialization explained')

def policy_context(rows,worktree,source_rows):
    # Diagnostic context only: current policy text is never a physical source pin.
    head=subprocess.check_output(['git','rev-parse','HEAD'],cwd=worktree,text=True).strip()
    accepted=next(r['commit'] for r in rows if r['role']=='accepted-pilot-contract')
    contains=subprocess.run(['git','merge-base','--is-ancestor',accepted,head],cwd=worktree).returncode==0
    originals={r['path']:r for r in rows if 'originalDeliveryWorkingCopySha256' in r};latest={r['path']:r for r in rows};documents=[]
    owned_authoring={'art/source/shared-map-fire-bindings/export.py','art/source/shared-map-fire-bindings/check.py','art/source/shared-map-fire-bindings/.gitattributes','assets/art/shared-map-fire-bindings/.gitattributes','docs/art/shared-map-fire-bindings/.gitattributes'}
    physical_rows=[r for r in source_rows if r['path'] not in owned_authoring]
    check_source_dependencies(physical_rows,reader=lambda path:(worktree/path).read_bytes())
    for path,row in sorted(latest.items()):
        data=(worktree/path).read_bytes();raw=hashlib.sha256(data).hexdigest();normalized=hashlib.sha256(data.replace(b'\r\n',b'\n')).hexdigest()
        documents.append({'path':path,'currentSha256':raw,'currentLFTextSha256':normalized,'latestPinnedPolicySha256':row['sha256'],'matchesLatestPolicyText':normalized==row['sha256'],'wouldFailOriginalCoupledPin':raw!=originals[path]['originalDeliveryWorkingCopySha256']})
    return {'gitCommit':head,'containsAcceptedAmendment':contains,'documents':documents,'currentPolicyHashesArePhysicalGates':False,'physicalDependenciesVerified':len(physical_rows)}

def main():
    parser=argparse.ArgumentParser();parser.add_argument('--record',action='store_true');parser.add_argument('--policy-worktree',type=Path);parser.add_argument('--compare-binding-ref');args=parser.parse_args()
    a=read('assets/art/shared-map-fire-bindings/new-york.json');ev=read('art/source/shared-map-fire-bindings/new-york-evidence.json');index=read(SCENE+'/index.json');nav=read(SCENE+'/navigation.json')
    check(sha(SCENE+'/index.json')=='1025e434bea1724b0212100cb92687faf95650d3c39c71734bf1b56fbf9713ad','pin:frozen scene index')
    check(a['sourceScene']['navigationSha256']==sha(SCENE+'/navigation.json'),'pin:frozen navigation')
    check_source_dependencies(ev['sourceLedger'])
    check_policy_evidence(ev['policyEvidence'])
    check(a['policyEvidence']==ev['policyEvidence'],'policy:sidecar and evidence agree')
    policy_canonical=json.dumps(ev['policyEvidence'],sort_keys=True,separators=(',',':')).encode()
    check(hashlib.sha256(policy_canonical).hexdigest()==a['evidence']['policyEvidenceSha256']==ev['policyEvidenceSha256'],'policy:separate immutable policy digest')
    context=policy_context(ev['policyEvidence'],args.policy_worktree or ROOT,ev['sourceLedger'])
    if args.policy_worktree:check(context['containsAcceptedAmendment'],'policy-context:architect includes accepted 15672d1 amendment')
    canonical=json.dumps(ev['sourceLedger'],sort_keys=True,separators=(',',':')).encode()
    check(hashlib.sha256(canonical).hexdigest()==a['evidence']['sourceLedgerSha256']==ev['sourceLedgerSha256'],'pin:aggregate source ledger')
    protected=['assets/art/place-scenes/new-york','assets/art/exposition-new-york','assets/art/exposition-new-york-tile','assets/art/exploration-access','art/source/exposition-new-york','art/source/exposition-new-york-tile','art/source/exploration-access','art/source/furnished-house/export.mjs']
    check(subprocess.run(['git','diff','--quiet',BASE,'--',*protected],cwd=ROOT).returncode==0,'pin:original workproduct unchanged against common base')
    sources={};logical=set();ranges=0
    for chunk in index['chunks']:
        for p in read(SCENE+'/'+chunk['url'])['parts']:
            p['_section']=chunk['id'];sources[p['id']]=p
            for r in p.get('sourceRanges') or [{'id':p['id']}]:logical.add(r['id'])
            if p.get('sourceRanges'):ranges+=len(p['sourceRanges'])
    check(len(sources)==12840 and len(logical)==12858 and ranges==20,'coverage:real emitted composition and range split')
    check_ownership(a,logical);geoms={key:read(SCENE+'/'+path) for key,path in index['geometries'].items()};all_bindings=[];byid={c['id']:c for c in a['carriers']};tri_count=0
    for c in a['carriers']:
        check(c['id'].startswith('carrier/') and not c['id'].startswith('new-york/'),'binding:IDs remain place-local')
        check(c['retirement']['ownerId']==c['id'] and c['retirement']['stateKey']==c['id'],'ownership:one persistent retirement owner')
        ts=[]
        for b in c['renderBindings']:ts+=check_binding(b,sources[b['partId']],geoms);all_bindings.append(b)
        tri_count+=len(ts);check_quantity(c,ts)
        check(set(c['sourcePartIds'])=={b['sourcePartId'] for b in c['renderBindings']},'ownership:carrier source/render correspondence')
        check(c['physicalSourcePartIds']==[b['sourcePartId'] for b in c['renderBindings'] if b['physicalContribution']=='carrier-solid'],'ownership:cosmetic stripes add no physical surface')
        check(c['physicalTriangleCount']==sum(b['triangleCount'] for b in c['renderBindings'] if b['physicalContribution']=='carrier-solid'),'ownership:physical and render counts distinguished')
        for key in ('supportCarrierIds','adjacencyCarrierIds'):
            check(len(c[key])==len(set(c[key])) and all(x in byid and x!=c['id'] for x in c[key]),'support:known unique local dependencies')
        for x in c['adjacencyCarrierIds']:check(c['id'] in byid[x]['adjacencyCarrierIds'],'support:symmetric native face adjacency')
        for e in c['supportEvidence']:
            check(e['carrierId'] in c['supportCarrierIds'],'support:evidence refers to bound dependency')
            if e['kind']=='coplanar-horizontal-triangle-contact':
                lower=byid[e['carrierId']];check(near(lower['physicalBounds']['max'][1],c['physicalBounds']['min'][1]),'support:bearing is at actual source elevation')
                check(e['area']>0,'support:positive source contact area')
        if c.get('portalId'):
            check(any(p['id']==c['portalId'] for p in nav['portals']),'door:existing native portal')
            if c['role']=='door':check(len(c['renderBindings'])==2 and all('openMatrix' in b for b in c['renderBindings']),'door:both native body/extension poses')
        if c['physicalMaterial']=='glass':check(c['fuelAmount']==0 and c['supportCarrierIds'],'glass:inert attached to real native frame')
    for u in a['visualOnlyBindings']+a['unassignedBindings']:
        b=u['renderBinding'];ts=check_binding(b,sources[b['partId']],geoms);tri_count+=len(ts);all_bindings.append(b)
    check(tri_count==252406,'coverage:every emitted triangle accounted exactly once')
    check(a['coordinateFrame']['sourceOffset']==[56,0,26] and a['coordinateFrame']['sourceOffsetAlreadyApplied'],'frame:offset already applied')
    check(a['nativeAccess']['floorOpenings']==nav['accessPlan']['floorOpenings'] and a['nativeAccess']['portals']==nav['portals'],'access:real holes and portal metadata preserved')
    check([c['id'] for c in a['carriers'][:3]]==a['pilotCarrierIds'],'pilot:exact three first records')
    wall,floor,glass=a['carriers'][:3]
    check(wall['fuelAmount']==2 and wall['finish']['fuelAmount']==.1 and wall['supportCarrierIds'],'pilot:exterior wall and separate coating')
    check(floor['fuelAmount']==1 and floor['nativeFloorId']=='upper-floor' and near(floor['bounds']['max'][1],8.48),'pilot:elevated actual one-metre slab')
    check(glass['physicalMaterial']=='glass' and glass['fuelAmount']==0,'pilot:inert real window blocker')
    check(a['coverage']['unassignedSourceIds']==[u['sourcePartId'] for u in a['unassignedBindings']],'coverage:explicit remaining unassigned list')
    check(all('fuelAmount' not in u and 'fuelClass' not in u for u in a['unassignedBindings']),'coverage:unknown has no invented inert/timber fuel default')
    check(sum(u['kind']=='material-unassigned' for u in a['unassignedBindings'])==75,'coverage:75 explicitly unresolved ornaments')
    check(sum(u['kind']=='quantity-unassigned-open-source' for u in a['unassignedBindings'])==29,'coverage:29 reproduced source cap gaps withheld')
    check(all(u['sourceClosedness']['unmatchedEdgesAfterCollinearSplit']>0 for u in a['unassignedBindings'] if u['kind']=='quantity-unassigned-open-source'),'coverage:source gap reproduction retained')
    gap=next(u for u in a['unassignedBindings'] if u['sourcePartId']=='replacement/main/1/cell-3-13/1')
    gb=gap['renderBinding'];gts=triangle_list(geoms[gb['geometryId']],gb['matrix']);top=gb['bounds']['max'][1]
    cap_area=sum(length(normal(t))/2 for t in gts if all(abs(v[1]-top)<0.00002 for v in t))
    check(cap_area<1e-8 and near(top,8.32),'source-gap:independent missing top cap reproduction')
    check_ledger(a)
    # Adversarial controls: duplicate ownership, double offset, extra coating and inert fuel.
    a['carriers'].append(wall)
    rejects(lambda:check_ownership(a,logical),'duplicate fuel owner');a['carriers'].pop()
    b=wall['renderBindings'][0];old=b['matrix'];b['matrix']=old.copy();b['matrix'][12]+=56
    rejects(lambda:check_binding(b,sources[b['partId']],geoms),'offset applied twice');b['matrix']=old
    floor['finish']={'fuelAmount':.1};rejects(lambda:check_ledger(a),'blanket painted-wall coat');del floor['finish']
    old=glass['fuelAmount'];glass['fuelAmount']=1
    rejects(lambda:check_quantity(glass,triangle_list(geoms[glass['renderBindings'][0]['geometryId']],glass['renderBindings'][0]['matrix'])),'glass as fuel');glass['fuelAmount']=old
    comparison=None
    if args.compare_binding_ref:
        ref=subprocess.check_output(['git','rev-parse',args.compare_binding_ref],cwd=ROOT,text=True).strip()
        previous=json.loads(subprocess.check_output(['git','show',ref+':assets/art/shared-map-fire-bindings/new-york.json'],cwd=ROOT))
        keys=set(previous)|set(a)
        for key in sorted(keys-{'policyEvidence','evidence','gameplayAssignments'}):check(a.get(key)==previous.get(key),'regression:unchanged binding content: '+key)
        check({k:v for k,v in a['gameplayAssignments'].items() if k!='authority'}=={k:v for k,v in previous['gameplayAssignments'].items() if k!='authority'},'regression:unchanged material assignments and quantities')
        comparison={'commit':ref,'onlyChanges':'Policy evidence and source-ledger metadata; physical bindings, finite quantities, coverage and source references identical.'}
    # Regression: current policy edits are outside physical pins, while physical/snapshot corruption still fails.
    index_row=next(r for r in ev['sourceLedger'] if r['path']==SCENE+'/index.json')
    rejects(lambda:check_source_dependencies([index_row],reader=lambda path:(ROOT/path).read_bytes()+b'changed physical source'),'physical source byte mutation')
    rejects(lambda:check_policy_evidence(ev['policyEvidence'],snapshot_reader=lambda path:(ROOT/path).read_bytes()+b'changed policy snapshot'),'immutable policy evidence mutation')
    result={'result':'PASS','checks':dict(checks),'carriers':len(a['carriers']),'logicalSourceParts':len(logical),'triangles':tri_count,'unassigned':len(a['unassignedBindings']),'supportUnresolved':len(a['coverage']['supportUnresolvedCarrierIds']),'runtimeOrVisualAcceptance':False,'artifactSha256':sha('assets/art/shared-map-fire-bindings/new-york.json'),'pythonVersion':sys.version.split()[0],'policyContext':context,'bindingComparison':comparison}
    if args.record:(ROOT/'art/source/shared-map-fire-bindings/new-york-check-results.json').write_text(json.dumps(result,indent=2,sort_keys=True)+'\n',encoding='utf-8',newline='\n')
    print(json.dumps(result,sort_keys=True))
if __name__=='__main__':main()
