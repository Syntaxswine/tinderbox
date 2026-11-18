"""Pinned metadata for the remaining original cornice family; no geometry solver."""
import collections,hashlib,importlib.util,json,subprocess,sys
from pathlib import Path
sys.dont_write_bytecode=True
HERE=Path(__file__).resolve().parent;ROOT=HERE.parents[3];REL=HERE.relative_to(ROOT).as_posix()
FIRST="art/source/shared-map-fire-bindings/cornice-family-contact-page-01-v1/"
SOURCE="art/source/shared-map-fire-bindings/coverage-family-proposal-v1/"
BASE="assets/art/shared-map-fire-bindings/new-york-complete-v1.json"
EXCLUDED="carrier/edge-0/cornice-1"
PARENT="b93dcee24c8ffcbb8eff9dd1022e19c0cae31c8f"
PAGE_SIZE=64

def sha(b):return hashlib.sha256(b).hexdigest()
def compact(x):return json.dumps(x,separators=(",",":"),sort_keys=True,ensure_ascii=True,allow_nan=False)
def read(path):return json.loads((ROOT/path).read_bytes())
def dump(path,x):Path(path).write_bytes((json.dumps(x,indent=2,ensure_ascii=True,allow_nan=False)+"\n").encode('ascii'))
def packed(path,x):
    rows=[]
    for k,v in x.items():
        body="[\n"+",\n".join("    "+compact(r) for r in v)+"\n  ]" if isinstance(v,list) else compact(v)
        rows.append("  "+json.dumps(k)+": "+body)
    Path(path).write_bytes(("{\n"+",\n".join(rows)+"\n}\n").encode('ascii'))
def pin(path):
    b=(ROOT/path).read_bytes();return {"path":path,"bytes":len(b),"sha256":sha(b)}
def verify_pin(row):
    b=(ROOT/row['path']).read_bytes();assert len(b)==row['bytes'] and sha(b)==row['sha256'],row['path']
def module(name,path):
    spec=importlib.util.spec_from_file_location(name,ROOT/path);m=importlib.util.module_from_spec(spec);spec.loader.exec_module(m);return m
L=module("accepted_finite_runner",FIRST+"lifecycle.py")

def prepare():
    oldpins=read(FIRST+"input-pins.json");gi=oldpins['globalIndexGitPin']
    blob=subprocess.run(['git','show',gi['commit']+':'+gi['path']],cwd=ROOT,capture_output=True,check=True,timeout=30,
        creationflags=getattr(subprocess,'CREATE_NO_WINDOW',0)).stdout
    assert len(blob)==gi['bytes'] and sha(blob)==gi['sha256']
    global_index=json.loads(blob);assert global_index['encoding']=='tuples-v1' and global_index['sourceOffsetApplied']
    global_parts={p[0]:(i,p) for i,p in enumerate(global_index['parts'])}
    rows=read(SOURCE+'relationships.json')['relationships'];refs=read(SOURCE+'geometry-bindings.json')['carriers']
    full=[(i,r) for i,r in enumerate(rows) if r['family']=='cornice-full-local-coverage']
    selected=[(i,r) for i,r in full if r['childCarrierId']!=EXCLUDED]
    assert len(full)==1694 and sum(len(r['localRegions']) for i,r in full)==4436
    assert len(selected)==1645 and sum(len(r['localRegions']) for i,r in selected)==4340
    base=read(BASE);by={c['id']:c for c in base['carriers']}
    overlay_path=base['effectiveGeometryOverlay']['indexPath'];overlay=read(overlay_path)
    assert sha((ROOT/overlay_path).read_bytes())==base['effectiveGeometryOverlay']['sha256']
    overlays={r['partId']:(i,r) for i,r in enumerate(overlay['replacements'])}
    owners=sorted({r[k] for i,r in selected for k in ['parentCarrierId','childCarrierId']},key=lambda c:global_parts[refs[c][0]['partId']][0])
    parts=[];geometries=[];geometry_ids={};section_cache={};dependencies={}
    def depend(path):
        if path not in dependencies:dependencies[path]=pin(path)
    for path in [SOURCE+'relationships.json',SOURCE+'geometry-bindings.json',BASE,'art/source/shared-map-fire-bindings/export.py',
        'art/source/shared-map-fire-bindings/cornice-wall-contact-proposal-v1/check.py',
        'art/source/shared-map-fire-bindings/cornice-front-contact-repeat-v1/check.py',
        'art/source/shared-map-fire-bindings/cornice-wall-contact-proposal-v1/predicate-context.json',
        'art/source/shared-map-fire-bindings/cornice-wall-one-binding-v1/predicate-context.json',
        FIRST+'source-producer-context.json',FIRST+'lifecycle.py',FIRST+'review-package.json',REL+'/authority-family.md']:
        depend(path)
    depend(overlay_path)
    for row in read(FIRST+'review-package.json')['files']:
        verify_pin(row);depend(row['path'])
    for owner in owners:
        carrier=by[owner];physical=[x for x in carrier['renderBindings'] if x['physicalContribution']=='carrier-solid']
        assert len(physical)==len(refs[owner])==1
        p=physical[0];ref=refs[owner][0]
        assert all(p[k]==ref[k] for k in ['partId','sourcePartId','geometryId','geometryPath','matrix'])
        assert p.get('sourceRange') is ref['sourceRange'] is None
        index,t=global_parts[p['partId']];ci=t[2];gc=global_index['carriers'][ci]
        assert gc[0]==owner and gc[7]==carrier['role'] and gc[2]==carrier['fuelClass'] and gc[3]==carrier['fuelAmount']
        assert global_index['tables']['geometries'][t[3]]==p['geometryId'] and t[12] is None
        matrix=t[5] if len(t[5])==16 else [1,0,0,0,0,1,0,0,0,0,1,0,*t[5],1]
        assert matrix==p['matrix']
        depend(p['geometryPath']);assert dependencies[p['geometryPath']]['sha256']==ref['sha256']
        if p['geometryPath'] not in geometry_ids:
            geometry_ids[p['geometryPath']]=len(geometries)
            geometries.append({'id':p['geometryId'],'path':p['geometryPath'],'sha256':ref['sha256'],'triangles':p['triangleCount'],'sourceRange':None})
        assert geometries[geometry_ids[p['geometryPath']]]['triangles']==p['triangleCount']
        path='assets/art/place-scenes/new-york/sections/'+p['sectionId']+'.json';depend(path)
        if path not in section_cache:section_cache[path]={x['id']:(i,x) for i,x in enumerate(read(path)['parts'])}
        ordinal,descriptor=section_cache[path][p['partId']]
        assert descriptor['matrix']==p['matrix']
        effective=None
        if p.get('effectiveOverlayPartId'):
            overlay_ordinal,replacement=overlays[p['effectiveOverlayPartId']]
            assert replacement['partId']==p['partId'] and replacement['matrix']==p['matrix']
            assert replacement['after']['geometryId']==p['geometryId'] and replacement['after']['sha256']==ref['sha256']
            assert replacement['before']['geometryId']==p['sourceGeometryId']==descriptor['geometry']
            depend(p['sourceGeometryPath'])
            assert dependencies[p['sourceGeometryPath']]['sha256']==replacement['before']['sha256']
            effective={'path':overlay_path,'pointer':'/replacements/'+str(overlay_ordinal),'operation':replacement['operation'],
                'beforeGeometryId':p['sourceGeometryId'],'afterGeometryId':p['geometryId'],'primitiveFrame':'accepted-effective-buffer, not unmodified pre-repair triangle IDs'}
        else:assert descriptor['geometry']==p['geometryId']
        parts.append({'id':len(parts),'partId':p['partId'],'sourcePartId':p['sourcePartId'],'ownerId':owner,
            'geometry':geometry_ids[p['geometryPath']],'matrix':p['matrix'],'sourceRange':None,'triangleCount':p['triangleCount'],
            'globalSourcePartIndex':index,'globalCarrierIndex':ci,'role':carrier['role'],'fuelClass':carrier['fuelClass'],'fuelAmount':carrier['fuelAmount'],
            'originalDescriptor':{'path':path,'pointer':'/parts/'+str(ordinal)},'acceptedEffectiveOverlay':effective,'nativeRecordId':None,'nativeCell':None})
    number={p['ownerId']:p['id'] for p in parts};relationships=[];regions=[]
    for ordinal,row in selected:
        assert row['direction']=='parent-to-child' and not row['groundAnchor']
        a,b=number[row['parentCarrierId']],number[row['childCarrierId']]
        assert parts[a]['role']==row['parentRole'] and parts[b]['role']==row['childRole']
        rid=len(relationships);relationships.append({'id':row['id'],'sourceOrdinal':ordinal,'parent':a,'child':b,
            'parentRole':row['parentRole'],'childRole':row['childRole'],'direction':row['direction'],'proposedKind':row['proposedKind'],
            'sourceCanonicalSha256':sha(compact(row).encode()),'regionIds':[g['id'] for g in row['localRegions']]})
        for local,g in enumerate(row['localRegions']):
            proof=g['actualGeometryCertificate']['proof'];kind=g['actualGeometryCertificate']['proposedKind']
            assert kind in ['fixed-embed','bearing-face'] and g['parentWitness']==g['childWitness']
            authored=[]
            if 'actualSurfaceWitness' in proof:
                assert len(proof['actualSurfaceWitness'])==2
                authored.append({'method':'authored-bearing-witness','points':proof['actualSurfaceWitness'],
                    'faceHints':{k:proof[k] for k in ['axis','parentFace','childFace']}})
            face=proof.get('sourceFace')
            if face is not None:
                assert 'actualSurfacePoint' in face
                authored.append({'method':'authored-source-face-witness','points':[face['actualSurfacePoint'],face['actualSurfacePoint']],'sourceFace':face})
            sibling=next((other['selector'] for other in row['localRegions'] if other['id']!=g['id']),None)
            regions.append({'id':g['id'],'relationship':rid,'sourcePointer':'/relationships/'+str(ordinal)+'/localRegions/'+str(local),
                'sourceCanonicalSha256':sha(compact(g).encode()),'certificateCanonicalSha256':sha(compact(g['actualGeometryCertificate']).encode()),
                'parent':a,'child':b,'selector':g['selector'],'endpointBounds':[g['parentBounds'],g['childBounds']],
                'historicalKind':kind,'historicalGeometricBearing':g['actualGeometryCertificate']['geometricBearing'],
                'historicalWitness':g['parentWitness'],'authoredCandidates':authored,'siblingSelector':sibling})
    assert len(parts)==1216 and len(geometries)==119 and len(regions)==4340
    pages=[];children=[]
    for child_index,child in enumerate(sorted({r['childCarrierId'] for i,r in selected})):
        indices=[i for i,g in enumerate(regions) if parts[g['child']]['ownerId']==child]
        child_pages=[]
        for page_index,start in enumerate(range(0,len(indices),PAGE_SIZE)):
            ri=indices[start:start+PAGE_SIZE];pid='child-'+str(child_index).zfill(3)+'-page-'+str(page_index).zfill(2)
            part_ids=sorted({regions[i][k] for i in ri for k in ['parent','child']})
            relationship_ids=sorted({regions[i]['relationship'] for i in ri})
            pages.append({'id':pid,'childOwnerId':child,'regionIndices':ri,'partIds':part_ids,'relationships':relationship_ids,'regions':len(ri)})
            child_pages.append(pid)
        children.append({'childOwnerId':child,'regions':len(indices),'pairs':len({regions[i]['relationship'] for i in indices}),'pages':child_pages,'initialStatus':'UNATTEMPTED'})
    assert len(children)==95 and len(pages)==127
    dictionary={'version':1,'family':'cornice-full-local-coverage','geometries':geometries,'parts':parts,'relationships':relationships,'regions':regions,
        'nativeLineage':'UNBOUND','limits':{'pageRegions':PAGE_SIZE,'childSeconds':60,'coordinatorSeconds':600}}
    inventory={'version':1,'fullFamily':{'children':96,'pairs':1694,'regions':4436},
        'preservedFirstPage':{'childOwnerId':EXCLUDED,'pairs':49,'regions':96,'status':'ACCEPTED_REFERENCE_UNCHANGED','package':FIRST+'review-package.json'},
        'remaining':{'children':95,'pairs':1645,'regions':4340},'children':children,'pages':pages}
    pins={'version':1,'artistParent':PARENT,'globalIndexGitPin':gi,'dependencies':[dependencies[k] for k in sorted(dependencies)],
        'firstPage':'Preserve all accepted packet bytes; do not repeat its calculation or verification for packaging.'}
    return dictionary,inventory,pins
