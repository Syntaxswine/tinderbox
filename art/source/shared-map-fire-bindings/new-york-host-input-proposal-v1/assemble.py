"""Metadata/hash/pointer projection only. Never imports geometry or runtime code."""
import argparse,collections,hashlib,json,re,subprocess,sys
from pathlib import Path
sys.dont_write_bytecode=True
HERE=Path(__file__).resolve().parent;ROOT=HERE.parents[3];REL=HERE.relative_to(ROOT).as_posix()
NATIVE='c1ed407aedfc5ffec8b473dc7b88c697e140c054'
HOST='2b350309d9116812a1d3988af090614bdaefbc25'
UI='aeb6e169b85c805ea97d642fbff5a1951a0e7be1'
ASSET='assets/art/shared-map-support-additions/new-york-roof-saddle-native-v1/'
EVIDENCE='art/source/shared-map-fire-bindings/roof-saddle-native-buffer-v1/'
BASE='assets/art/shared-map-fire-bindings/new-york-complete-v1.json'
SADDLE='carrier/roof-saddle-native/main-parapet-6/bay-01'
MEMBERS={'cornice':'carrier/edge-6/cornice-7','roof':'carrier/roof/rear-tail','upper':'carrier/main-parapet-6/base'}
UNBOUND={'status':'UNBOUND','value':None}
def sha(b):return hashlib.sha256(b).hexdigest()
def dump(path,x):Path(path).write_bytes((json.dumps(x,indent=2,ensure_ascii=True,allow_nan=False)+'\n').encode('ascii'))
def esc(s):return str(s).replace('~','~0').replace('/','~1')
def pointer(value,path):
    for key in path.split('/')[1:]:
        key=key.replace('~1','/').replace('~0','~');value=value[int(key)] if isinstance(value,list) else value[key]
    return value

class Inputs:
    def __init__(self):self.files={};self.bytes={};self.objects={};self.references=0
    def add(self,key,path,kind='metadata',commit=None,expected=None):
        if key in self.files:return key
        if commit:
            raw=subprocess.run(['git','show',commit+':'+path],cwd=ROOT,capture_output=True,check=True,timeout=30,
                creationflags=getattr(subprocess,'CREATE_NO_WINDOW',0)).stdout
        else:raw=(ROOT/path).read_bytes()
        if expected:assert sha(raw)==expected,path
        self.files[key]={'kind':'git-object' if commit else 'repository-file','path':path,'bytes':len(raw),'sha256':sha(raw),'content':kind,**({'commit':commit} if commit else {})}
        self.bytes[key]=raw;return key
    def data(self,key):
        assert self.files[key]['content'] not in ['opaque-geometry','opaque-library','binary','source-text'],key
        if key not in self.objects:self.objects[key]=json.loads(self.bytes[key])
        return self.objects[key]
    def ref(self,key,path=''):
        assert key in self.files
        if path:pointer(self.data(key),path)
        self.references+=1;return {'$file':key,'$pointer':path}

def build():
    src=Inputs()
    src.add('asset',ASSET+'index.json',expected='0d1469e541657fa6f3ed537ff2f4ba7fe01f3952c273e0eba2720c224a436bcd')
    src.add('nativeApprovalPackage',EVIDENCE+'review-package.json',commit=NATIVE)
    approved={r['path']:r for r in src.data('nativeApprovalPackage')['files']}
    src.add('base',BASE,expected='407c0f8bd582f8d95b9ade1471cd51892ac7b9a40fd2c005696bcc5485991eba')
    src.add('runtimeIndex','assets/runtime/map-sources/new-york/index.json',commit=HOST,expected='e9bee63a5a4afb0f8513d083b7e5f1ce83f25c0441ea543e14901b70e4e0cdab')
    src.add('runtimeLibrary','assets/runtime/map-sources/new-york/library.json','opaque-library',commit=HOST)
    src.add('hostDataContract','src/content/map-source-data.js','source-text',commit=HOST)
    src.add('hostSurfaceContract','src/content/map-source-geometry.js','source-text',commit=HOST)
    src.add('hostAssemblyContext',REL+'/host-assembly-context.md','source-text')
    src.add('ancestorContext',REL+'/ancestor-context-summary.json')
    base=src.data('base');asset=src.data('asset');index=src.data('runtimeIndex')
    assert index['encoding']=='tuples-v1' and index['sourceOffsetApplied'] is True
    assert b"return place+'::'+id" in src.bytes['hostDataContract']
    assert b"prefix=id+'/part/'+number" in src.bytes['hostSurfaceContract']
    assert b"id:prefix+'/face/'+i++" in src.bytes['hostSurfaceContract']
    src.add('overlay',base['effectiveGeometryOverlay']['indexPath'],expected=base['effectiveGeometryOverlay']['sha256'])
    src.add('mapping',asset['physicalRenderMapping']['path'],expected=asset['physicalRenderMapping']['sha256'])
    src.add('quantityCertificate',asset['quantityCertificate']['path'],expected=asset['quantityCertificate']['sha256'])
    src.add('nativeChecks',EVIDENCE+'check-results.json')
    src.add('nativeBufferEvidence',EVIDENCE+'actual-buffer-results.json','opaque-geometry')
    src.add('fixedPortSemantics',EVIDENCE+'fixed-port-semantics.json')
    src.add('interfaceGates',asset['interfaceGates']['path'],expected=asset['interfaceGates']['sha256'])
    src.add('saddlePhysical',asset['geometry']['path'],'opaque-geometry',expected=asset['geometry']['sha256'])
    src.add('saddleRender',asset['renderGeometry']['path'],'opaque-geometry',expected=asset['renderGeometry']['sha256'])
    binaries={}
    for name,row in asset['binaryBuffers'].items():
        key='binary:'+name;src.add(key,row['path'],'binary',expected=row['sha256']);binaries[name]=src.ref(key)
        assert src.files[key]['bytes']==row['count']*row.get('itemSize',1)*(2 if name.endswith('/index') else 4)
    for key,row in src.files.items():
        if row['path'] in approved:assert row['sha256']==approved[row['path']]['sha256'] and row['bytes']==approved[row['path']]['bytes'],row['path']
    by_base={c['id']:(i,c) for i,c in enumerate(base['carriers'])};by_carrier={c[0]:(i,c) for i,c in enumerate(index['carriers'])};by_part={p[0]:(i,p) for i,p in enumerate(index['parts'])}
    mapping=src.data('mapping');qcert=src.data('quantityCertificate');checks=src.data('nativeChecks');saddle=asset['members'][0]
    assert saddle['id']==SADDLE and saddle['quantityReference']==qcert['selectedGreatestFiniteBinary64']==0.04011965567822286
    assert qcert['selectedBitsLE']=='a2262142908aa43f' and checks['nativeTriangleContacts']==3 and checks['selectedQuantityReference']==saddle['quantityReference']
    assert mapping['physicalVertexCount']==10 and mapping['renderVertexCount']==48 and mapping['physicalTriangleCount']==mapping['renderTriangleCount']==16
    assert len(mapping['renderToPhysicalVertex'])==48 and len(mapping['renderTriangleToPhysicalTriangle'])==16
    for r,p in enumerate(mapping['renderToPhysicalVertex']):assert r in mapping['physicalToRenderVertices'][p]
    assert mapping['renderTriangleToPhysicalTriangle']==list(range(16))
    assert asset['selectedSupportSemantics']==src.data('fixedPortSemantics')
    assert asset['selectedSupportSemantics']['fittingRequirement']['operator']=='ALL_FIXED_PORTS'
    members=[]
    for label,cid in MEMBERS.items():
        bi,c=by_base[cid];gi,gc=by_carrier[cid];assert gc[3]==c['fuelAmount'] and gc[2]==c['fuelClass'] and gc[7]==c['role']
        physical=[(n,p) for n,p in enumerate(c['renderBindings']) if p['physicalContribution']=='carrier-solid'];assert len(physical)==1
        bn,b=physical[0];pi,rp=by_part[b['sourcePartId']];assert rp[2]==gi and index['tables']['geometries'][rp[3]]==b['geometryId'] and rp[12] is None
        assert rp[1] is None or rp[1]==b['partId']
        assert not rp[9] and not rp[10] and not rp[11] and not b.get('openMatrix')
        declared=asset['namedOriginalParents'][cid][0];assert declared['geometryId']==b['geometryId'] and declared['matrix']==b['matrix'] and declared['sourceRange'] is None
        src.add(label+'Geometry',b['geometryPath'],'opaque-geometry',expected=declared['sha256'])
        replacements=[(i,r) for i,r in enumerate(src.data('overlay')['replacements']) if r['partId']==b['partId'] or r['sourcePartId']==b['sourcePartId']]
        assert not replacements,'A selected existing member unexpectedly requires an effective replacement'
        bp='/carriers/'+str(bi);bind=bp+'/renderBindings/'+str(bn);part='/parts/'+str(pi);global_owner='new-york::'+cid
        members.append({'key':label,'originalCarrierId':cid,'qualifiedCanonicalOwnerId':global_owner,'canonicalSource':src.ref('base',bp),
            'globalCarrierOrdinal':gi,'globalCarrierRecord':src.ref('runtimeIndex','/carriers/'+str(gi)),
            'originalPartId':b['partId'],'sourcePartId':b['sourcePartId'],'hostRenderPartId':rp[1] or rp[0],
            'globalPartOrdinal':pi,'globalPartRecord':src.ref('runtimeIndex',part),'sourceBinding':src.ref('base',bind),
            'role':c['role'],'physicalMaterial':c['physicalMaterial'],'fuelClass':c['fuelClass'],
            'quantity':{'canonicalOwnerCount':1,'amount':c['fuelAmount'],'valueRef':src.ref('base',bp+'/fuelAmount'),'recipe':src.ref('base',bp+'/quantityBasis'),
                'certificateKind':'preserved declared canonical gameplay quantity; no new geometric measurement','sourceFacts':src.ref('base','/sourceFacts'),
                'gameplayAssignments':src.ref('base','/gameplayAssignments'),'finishFieldPresent':'finish' in c,'finishValue':c.get('finish'),
                'finishSourceMember':src.ref('base',bp),'selectedBirthMode':UNBOUND,'surfaceQuantityAllocation':UNBOUND},
            'sourcePose':{'classification':'STATIC_AUTHORED_POSE','matrix':src.ref('base',bind+'/matrix'),'noAuthoredMovingPortal':True},
            'physicalRenderSourceMap':{'kind':'same original unsliced geometry and original part identity','geometry':src.ref(label+'Geometry'),
                'geometryId':b['geometryId'],'declaredTriangles':b['triangleCount'],'originalNativeCellToRenderMap':UNBOUND},
            'ranges':{'status':'DECLARED_UNSLICED_SOURCE','approvedOriginalRange':src.ref('asset','/namedOriginalParents/'+esc(cid)+'/0/sourceRange'),
                'runtimeOriginalRange':src.ref('runtimeIndex',part+'/12'),'originalPrimitiveFrame':'absolute original buffer ordinals',
                'generatedNativeRangeAndCapMapping':UNBOUND},
            'effectiveRepairSubdivision':{'applies':False,'overlay':src.ref('overlay'),'matchingReplacementRecords':[]},
            'sourceSurfaceIdentity':{'status':'UNBOUND','actualIds':None,'knownPrefixFromPinnedSourceText':global_owner+'/part/'+str(pi),
                'unboundSuffix':'/face/<group ordinal>','groupOrdinalToOriginalPrimitives':UNBOUND,'contract':src.ref('hostSurfaceContract')},
            'nativeRecordIds':UNBOUND,'nativeCellIds':UNBOUND,'nativePortBindings':UNBOUND,'rootPath':{'status':'UNPROVED','proof':None},
            'originalAnchors':src.ref('base',bp+'/anchors'),'retirement':src.ref('base',bp+'/retirement')})
    members.insert(0,{'key':'saddle','originalCarrierId':SADDLE,'qualifiedCanonicalOwnerId':'new-york::'+SADDLE,
        'globalCarrierOrdinal':UNBOUND,'globalPartOrdinal':UNBOUND,'originalPartId':UNBOUND,'sourcePartId':UNBOUND,
        'cataloguedInPinnedHost':SADDLE in by_carrier,'sourceMember':src.ref('asset','/members/0'),
        'historicalDoubleProposalId':saddle['sourceProposalId'],'role':saddle['role'],'physicalMaterial':saddle['physicalMaterial'],'fuelClass':saddle['fuelClass'],
        'quantity':{'canonicalOwnerCount':1,'amount':saddle['quantityReference'],'valueRef':src.ref('asset','/members/0/quantityReference'),
            'exactCertificate':src.ref('quantityCertificate'),'selectedBitsLE':qcert['selectedBitsLE'],'finishFieldPresent':True,'finishValue':saddle['finish'],
            'selectedBirthMode':UNBOUND,'surfaceQuantityAllocation':UNBOUND},
        'sourcePose':{'classification':'ONLY_APPROVED_ORIGINAL_STATIC_POSE','matrix':src.ref('asset','/members/0/matrix'),
            'authoredStockTileOccupancy':src.ref('asset','/modularInterface/occupiedCells'),'occupancyIsNotNativeCellIdentity':True},
        'physicalRenderSourceMap':{'kind':'one physical body with alternate mapped render buffer','physicalGeometry':src.ref('saddlePhysical'),
            'renderGeometry':src.ref('saddleRender'),'mapping':src.ref('mapping'),'binaryBuffers':binaries,
            'physicalVertices':10,'renderVertices':48,'physicalTriangles':16,'renderTriangles':16,'sourceFaceIds':list(range(7)),
            'sourceConnectivityCertificate':src.ref('nativeChecks','/physicalTopology'),'nativeFragmentCellAndRenderPatchMapping':UNBOUND},
        'sourceSurfaceIdentity':{'status':'UNBOUND','hostPartAndSurfaceIds':None,'assetLocalFaceIdsRef':src.ref('mapping','/sourceFaceTriangles'),
            'assetFaceIdsAreNotHostSurfaceIds':True},'ranges':{'approvedAssetBuffer':'complete declared physical/render buffers','nativeSourceRangeMapping':UNBOUND,'generatedNativeCaps':UNBOUND},
        'sourceOrigin':{'approvedCommit':NATIVE,'finalFloat32Buffers':True,'historicalSourceNotReplaced':True},
        'nativeRecordIds':UNBOUND,'nativeCellIds':UNBOUND,'nativePortBindings':UNBOUND,'rootPath':{'status':'UNPROVED','proof':None}})
    assert members[0]['cataloguedInPinnedHost'] is False
    ports=[]
    for i,port in enumerate(asset['ports']):
        face=next(j for j,f in enumerate(mapping['sourceFaceTriangles']) if f['physicalTriangleIds']==port['physicalTriangleIds'])
        contact=next((j,c) for j,c in enumerate(asset['proposedContacts']) if c['portId']==port['id']);j,c=contact
        ports.append({'authoredPortId':port['id'],'sourceDeclaration':src.ref('asset','/ports/'+str(i)),
            'fittingPhysicalTriangles':port['physicalTriangleIds'],'assetLocalSourceFaceId':mapping['sourceFaceTriangles'][face]['sourceFaceId'],
            'physicalRenderFaceMap':src.ref('mapping','/sourceFaceTriangles/'+str(face)),
            'declaredCounterpartCarrierId':port['fixedParentCarrierId'],'counterpartSourceTriangles':port['fixedOriginalParentGeometry'][0]['sourceTriangleIds'],
            'counterpartSourceDeclaration':src.ref('asset','/ports/'+str(i)+'/fixedOriginalParentGeometry/0'),
            'directedSourceAssignment':src.ref('asset','/proposedContacts/'+str(j)),'parent':c['parent'],'child':c['child'],
            'nativeFixedPortRecordCellComponentBinding':UNBOUND,'survivingParentRemapAllowed':port['survivingParentRemapAllowed']})

    src.add('family','art/source/shared-map-fire-bindings/coverage-family-proposal-v1/relationships.json')
    family=src.data('family')['relationships'];ordinary=[];normalized=[]
    for label,cid in MEMBERS.items():
        bi,c=by_base[cid];gi,gc=by_carrier[cid];parents=c['supportCarrierIds']
        assert [index['carriers'][n][0] for n in gc[12]]==parents
        exact_matches=[(i,r) for i,r in enumerate(family) if r['childCarrierId']==cid and r['parentCarrierId'] in parents]
        ordinary.append({'member':label,'semantics':'ORDINARY_PARENT_ALTERNATIVES_NOT_REQUIRED_ALL','compatibilityIndexIsNotPortBindingAuthority':True,
            'originalParentIds':src.ref('base','/carriers/'+str(bi)+'/supportCarrierIds'),'count':len(parents),
            'globalParentOrdinals':[by_carrier[parent][0] for parent in parents],
            'typedSourceEvidence':src.ref('base','/carriers/'+str(bi)+'/supportEvidence'),
            'declaredLocalAttachmentRecords':src.ref('base','/carriers/'+str(bi)+'/attachmentRecords'),
            'normalizedRowsForTheseExactLegacyPairs':[src.ref('family','/relationships/'+str(i)) for i,r in exact_matches],
            'normalizedImmutablePortBindings':'UNBOUND' if not exact_matches else 'SOURCE_REFERENCES_ONLY',
            'independentRootPath':'UNPROVED','sourceCataloguesDoNotProveARequiredOrMinimalClosure':True})
    # Resolve existing records by ID/pointer only; no point or geometry evaluation.
    cornice_relation=next((i,r) for i,r in enumerate(family) if r['id']=='38bd992fc06c649aa5a21f58')
    fi,relation=cornice_relation;assert relation['childCarrierId']==MEMBERS['cornice'] and len(relation['localRegions'])==34
    delta_pages=['art/source/shared-map-fire-bindings/cornice-facet-delta-v1/pages/child-032-page-00.json',
                 'art/source/shared-map-fire-bindings/cornice-facet-delta-v1/pages/child-032-page-01.json']
    proof_by_id={}
    for n,path in enumerate(delta_pages):
        alias='corniceProofPage'+str(n);src.add(alias,path)
        for i,row in enumerate(src.data(alias)['regions']):proof_by_id[row['id']]=(alias,i,row)
    local=[]
    for i,g in enumerate(relation['localRegions']):
        alias,j,row=proof_by_id[g['id']];assert row['sourcePointer']=='/relationships/'+str(fi)+'/localRegions/'+str(i)
        result=row['result'];local.append({'regionId':g['id'],'originalRegion':src.ref('family','/relationships/'+str(fi)+'/localRegions/'+str(i)),
            'existingProof':src.ref(alias,'/regions/'+str(j)+'/result'),'status':result['status'],
            **({'remainingReason':result['reason']} if result['status']=='unproved' else {}),'nativeBinding':'UNBOUND'})
    assert collections.Counter(r['status'] for r in local)=={'source-contact-proposed':23,'unproved':11}
    pci,_=by_base[relation['parentCarrierId']]
    normalized.append({'kind':'ADDITIONAL_NORMALIZED_INCOMING_CANDIDATE','member':'cornice','relationshipId':relation['id'],
        'originalRelationship':src.ref('family','/relationships/'+str(fi)),'parentCarrierId':relation['parentCarrierId'],
        'parentCatalogue':src.ref('base','/carriers/'+str(pci)),'parentGlobalCarrierOrdinal':by_carrier[relation['parentCarrierId']][0],
        'childCarrierId':relation['childCarrierId'],'direction':relation['direction'],'wholeCarrierRetirement':relation['wholeCarrierRetirement'],
        'regions':local,'notReplacementForLegacyAlternatives':True,'requiredSubsetOrRootedAdmission':'UNPROVED'})
    src.add('upperIncidentProofs','docs/engineering/shared-maps/other-contact-source-v2/contacts-proposal.json',commit=UI,
        expected='150e7d22cd130ea1f9f542a2809c86886047065b896f239a22ff9027131feaa7')
    ui=src.data('upperIncidentProofs');ui_instance={p['id']:p for p in ui['instances']}
    outgoing=[]
    for i,row in enumerate(ui['regions']):
        parent=ui_instance[row['parent']]['ownerId'];child=ui_instance[row['child']]['ownerId']
        if parent==MEMBERS['upper']:
            outgoing.append({'regionId':row['id'],'relationshipId':row['relationship'],'parentCarrierId':parent,'childCarrierId':child,
                'existingProof':src.ref('upperIncidentProofs','/regions/'+str(i)),'status':row['status'],
                'sourcePointer':row['sourcePointer'],'nativeBinding':'UNBOUND','notAnIncomingRootForUpper':True})
    assert len(outgoing)==5 and all(r['status']=='source-contact-proposed' for r in outgoing)
    rules=asset['selectedSupportSemantics'];lower=rules['fittingRequirement']['fixedPortIds']
    assert set(lower)=={p['authoredPortId'] for p in ports[:2]}
    assert rules['upperDependency']['childCarrierId']==MEMBERS['upper'] and rules['upperDependency']['parentCarrierId']==SADDLE
    assert all(not c['anchors'] for cid,(i,c) in by_base.items() if cid in MEMBERS.values()) and not saddle['anchors']
    context=src.data('ancestorContext');assert context['combinedSummary']['physicalPartIds']==393 and context['combinedSummary']['basePhysicalTriangles']==4712
    inventory={'version':1,'status':'SOURCE_METADATA_INPUT_PROPOSAL_NOT_ADMITTED','target':'existing New York host / existing destination',
        'authority':{'source':'direct architect message','instruction':{'path':REL+'/authority.md'},
            'upcomingHostAssembly':src.ref('hostAssemblyContext'),'assemblyRuntimeExecutionGranted':False},
        'sourceFiles':src.files,'selectedMembers':members,'fixedAuthoredPorts':ports,
        'approvedGameplayAssembly':{'source':src.ref('asset','/selectedSupportSemantics'),'exactAssignment':rules,
            'scope':'selected conservative ALL lower assembly plus local directed upper; not stress capacity',
            'actualIndependentLowerRootPaths':'UNPROVED','actualNativeFixedPortBindings':'UNBOUND','retirementMustRemainLocal':True},
        'ordinaryImmediateCandidates':ordinary,'normalizedImmediateCandidates':normalized,'upperOutgoingIncidentReferences':outgoing,
        'ancestorMetadata':{'canonicalCatalogue':src.ref('base','/carriers'),'globalCatalogue':src.ref('runtimeIndex','/carriers'),
            'contextOnly':src.ref('ancestorContext'),'ancestorGraphFlattened':False,'393IsNotARequiredOrMinimalClosure':True,
            'requiredRootedClosure':UNBOUND,'capacityAdmission':UNBOUND},
        'hostIdentityContract':{'qualificationSourceText':src.ref('hostDataContract'),'surfaceGenerationSourceText':src.ref('hostSurfaceContract'),
            'catalogueRevision':HOST,'newSaddleHostPartProjection':'UNBOUND','sourceSurfaceGroupOrdinals':'UNBOUND',
            'generatedNativeCapsCannotClaimOriginalSurfaceIds':True,'unknownSourceRangesMustNotBeNormalized':True,
            'completeOwnerQuantitiesAndFinishRequiredBeforeBirth':True,'selectedWholeOrRegionalModeBeforeBirth':'UNBOUND',
            'wholeFallbackAfterRegionalRejectionAllowed':False,'rootAndFixedPortBindingsRequiredBeforeRuntimeAdmission':True},
        'scope':{'selectedCanonicalMembers':4,'declaredImmediatePhysicalTriangles':48,'declaredCountIsNotSupportClosure':True,
            'legacyImmediateCandidateCounts':{'cornice':34,'roof':72,'upper':0},'normalizedCorniceRegions':34,
            'normalizedCorniceSourceProposals':23,'normalizedCorniceUnresolved':11,'outgoingUpperSourceReferences':5,
            'otherNineteenSaddlesFront48Clear96Selected':False,'geometryDecodedOrTransformed':0,'newContactSearches':0,
            'nativeCompilations':0,'supportGraphSolves':0,'worldOrTrialCalls':0,'rendererBuildBenchmarkCalls':0,'cacheOrLimitChanges':0},
        'admissionUnbound':['saddle host part/global ordinals and concrete source-surface identities','complete owner surface/finish allocation and selected mode before birth',
            'native cell/record/source-range/generated-cap/physical-render-patch lineage','fixed-port binding and BOTH independent rooted lower paths',
            'required ancestry and source/query/support-cache capacity admission']}
    assert sum(p['count'] for p in ordinary)==106
    return inventory,src

def walk_refs(value,src):
    count=0
    if isinstance(value,dict):
        if '$file' in value:
            assert value['$file'] in src.files
            if value['$pointer']:pointer(src.data(value['$file']),value['$pointer'])
            count+=1
        for child in value.values():count+=walk_refs(child,src)
    elif isinstance(value,list):
        for child in value:count+=walk_refs(child,src)
    return count

def check_inventory(inventory,src):
    refs=walk_refs(inventory,src)
    assert inventory['scope']['selectedCanonicalMembers']==4 and len(inventory['fixedAuthoredPorts'])==3
    assert inventory['scope']['declaredImmediatePhysicalTriangles']==16+sum(m['physicalRenderSourceMap']['declaredTriangles'] for m in inventory['selectedMembers'][1:])
    assert inventory['selectedMembers'][0]['quantity']['amount']==0.04011965567822286
    assert [m['quantity']['amount'] for m in inventory['selectedMembers'][1:]]==[24.47992,42.088619,5.333333]
    assert all(m['quantity']['selectedBirthMode']['status']=='UNBOUND' for m in inventory['selectedMembers'])
    assert inventory['approvedGameplayAssembly']['exactAssignment']==src.data('asset')['selectedSupportSemantics']
    return {'status':'METADATA_HASH_POINTER_CHECKS_PASS','sourceFiles':len(src.files),'checkedPointerReferences':refs,
        'selectedMembers':4,'authoredFixedPorts':3,'legacyImmediateCandidates':106,'existingNormalizedCorniceProofs':23,'retainedUnresolvedCorniceRegions':11,
        'existingUpperOutgoingProofRefs':5,'geometryArraysDecodedOrTransformed':0,'geometryOpaqueFilesHashedOnly':sum(row['content'] in ['opaque-geometry','opaque-library','binary'] for row in src.files.values()),
        'newContactSearches':0,'nativeCompilations':0,'supportGraphSolves':0,'worldTrialRendererBuildBenchmarkCalls':0,'temporaryServersOrWorkers':0,'retainedHelpers':False,
        'unknownNativeRootRangeAndProjectionMappingsExplicit':True,'ancestorContextNotAnAdmissionProof':True}

def package():
    files=[]
    for path in sorted(HERE.iterdir()):
        if path.is_file() and path.name!='review-package.json':
            b=path.read_bytes();files.append({'path':path.relative_to(ROOT).as_posix(),'bytes':len(b),'sha256':sha(b)})
    dump(HERE/'review-package.json',{'version':1,'artistParent':'cc5629e08cea64010ee3817e703b5300a8b4c61c','scope':[REL+'/'],'files':files,
        'status':'METADATA_ONLY_EXISTING_HOST_PROPOSAL','runtimeAdmission':'UNBOUND','retainedHelpers':False})
    for link in re.findall(r'\]\(([^)]+)\)',(HERE/'README.md').read_text()):assert (HERE/link).resolve().is_file(),link

def main():
    ap=argparse.ArgumentParser();g=ap.add_mutually_exclusive_group();g.add_argument('--write',action='store_true');g.add_argument('--package',action='store_true');ap.add_argument('--check',action='store_true');a=ap.parse_args()
    if a.package:package();return
    inventory,src=build();result=check_inventory(inventory,src)
    if a.write:
        assert not (HERE/'input-proposal.json').exists();dump(HERE/'input-proposal.json',inventory);dump(HERE/'checks.json',result)
    else:
        assert json.loads((HERE/'input-proposal.json').read_bytes())==inventory
        assert json.loads((HERE/'checks.json').read_bytes())==result
        if (HERE/'review-package.json').exists():
            for row in json.loads((HERE/'review-package.json').read_bytes())['files']:
                b=(ROOT/row['path']).read_bytes();assert len(b)==row['bytes'] and sha(b)==row['sha256'],row['path']
    print(json.dumps(result,separators=(',',':')))
if __name__=='__main__':main()
