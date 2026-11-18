"""Overlay saved source results only; preserve the entire base packet by reference."""
import collections, copy
from common import *

def derive():
    pins, plan = read(HERE/'input-pins.json'), read(CACHE/'plan.json')
    base = cached(plan['baseProposal'])
    regions_by = {r['id']: (i,r) for i,r in enumerate(base['regions'])}
    reports, instances, evidence = {}, {}, []
    for descriptor in plan['pages']:
        number = descriptor['page']
        page_path = HERE/'pages'/('page-%03d.json'%number)
        check_path = HERE/'checks'/page_path.name
        assert page_path.exists() and check_path.exists()
        page, check = read(page_path), read(check_path)
        digest = sha(page_path.read_bytes())
        assert check['pageSha256'] == digest
        assert [r['id'] for r in page['regions']] == descriptor['regionIds']
        evidence.append({'page':number,'path':page_path.relative_to(HERE).as_posix(),'sha256':digest,'checkPath':check_path.relative_to(HERE).as_posix(),'checkSha256':sha(check_path.read_bytes())})
        for i,r in enumerate(page['regions']):
            assert r['id'] not in reports
            reports[r['id']] = (r,number,i,digest)
        for instance in page['instanceProofs']:
            if instance['id'] in instances:assert instances[instance['id']]==instance
            instances[instance['id']] = instance
    assert set(reports)==set(plan['candidateRegionIds'])
    delta = []
    for region_id in plan['candidateRegionIds']:
        original_index, original = regions_by[region_id]
        report, page, index, digest = reports[region_id]
        row = {'id':region_id,'relationship':original['relationship'],'family':original['family'],
            'parent':original['parent'],'child':original['child'],
            'sourceRegion':{'commit':BASE,'path':plan['baseProposal']['path'],'rawFileSha256':plan['baseProposal']['sha256'],'pointer':'/regions/'+str(original_index),'canonicalSha256':sha(canonical(original).encode())},
            'priorStatus':original['status'],'priorUnprovedCode':original['unprovedCode'],
            'sourceResult':{'path':'pages/page-%03d.json'%page,'pointer':'/regions/'+str(index),'sha256':digest},
            'eligibility':report['eligibility'],'status':report['status'],'calculationStats':report['stats']}
        if report['status']=='source-contact-proposed':
            contact=copy.deepcopy(report['contact'])
            contact['normals']=report['normalMetadata']['canonicalNormals']
            contact['rangeLocalPrimitives']=[contact['primitives'][side]-plan['instances'][original[key]]['primitiveBase'] for side,key in enumerate(['parent','child'])]
            row.update({'contact':contact,'checks':report['checks'],'normalMetadata':report['normalMetadata']})
        else:row['unprovedCode']=report['reason']
        delta.append(row)
    positives=[r for r in delta if r['status']=='source-contact-proposed']
    unproved=[r for r in delta if r['status']=='unproved']
    admitted=[r for r in delta if r['eligibility']['allowed']]
    dictionaries=[]
    for key in sorted({p[k] for p in instances.values() for k in ['frameDictionary','topologyDictionary'] if p[k] is not None}):
        path=HERE/'dictionaries'/(key+'.json');assert sha(path.read_bytes())==key
        dictionaries.append({'id':key,'path':path.relative_to(HERE).as_posix(),'sha256':key})
    families={}
    for family in sorted({r['family'] for r in delta}):
        rows=[r for r in delta if r['family']==family]
        families[family]={'candidateRegions':len(rows),'eligible':sum(r['eligibility']['allowed'] for r in rows),'newProposed':sum(r['status']=='source-contact-proposed' for r in rows),'unproved':sum(r['status']=='unproved' for r in rows)}
    first=delta[0]
    summary={'candidateRegions':419,'eligible':len(admitted),'conditionNotMet':419-len(admitted),'newProposed':len(positives),'deltaUnproved':len(unproved),
        'unprovedReasons':dict(sorted(collections.Counter(r['unprovedCode'] for r in unproved).items())),
        'preservedPositives':1019,'preservedOtherFailures':144,'combinedProposed':1019+len(positives),'combinedUnproved':563-len(positives),'UNATTEMPTED':0,
        'families':families,'endpointInstancesClassified':len(instances),'closedFlagsOnlyInstances':sum(p['admission']=='same-partition-closed-flags-only' for p in instances.values()),
        'sharedDictionaries':len(dictionaries),'contactPredicateChecks':sum(len(r['checks']['contact']) for r in positives),
        'negativeChecks':{key:sum(r['checks'][key] for r in positives) for key in ['wrongPrimitiveNegatives','outsideSelectorNegatives','legacyWitnessNegatives']},
        'originalBaluster':{'region':first['id'],'eligible':first['eligibility']['allowed'],'status':first['status'],'primitives':first.get('contact',{}).get('primitives'),'point':first.get('contact',{}).get('point'),'unprovedCode':first.get('unprovedCode')},
        'existingPositiveRegionsReexecuted':0,'otherFailureRegionsReexecuted':0,
        'nativeCompilerCalls':0,'runtimeDecoderCalls':0,'sourceBlueprintExpansions':0,'graphWorldRendererBuildPagesRuns':0,'volumeBearingClosedSolidClaim':False}
    result={'version':3,'status':'UNACCEPTED_CLOSED_FLAG_SOURCE_DELTA','runtimeConsumable':False,
        'baseProposal':{k:v for k,v in plan['baseProposal'].items() if k!='cache'},'priorSourceCheckpoint':pins['priorSourceCheckpoint'],
        'componentCore':CORE,'coordinateFrame':base['coordinateFrame'],'normalConvention':'core-componentwise-division',
        'admissionRule':'Previously blocked instance; identical original positive component primitive partitions and nonmaterial ordinals; sole discrepancy is closed flags. Use actual emitted-world components for surface membership only.',
        'preservationRule':'Overlay only these 419 original-component-unresolved regions. All existing positives, other failures, base data, prior receipts and original failed gates are unchanged historical records.',
        'frameInstances':[instances[i] for i in sorted(instances)],'dictionaries':dictionaries,'regions':delta,'pageEvidence':evidence,'summary':summary,
        'limitations':['Closed flags and positive surface membership prove no volume, bearing capacity, closed solid, anchor or gameplay support.','Original witness/facet contact predicates, geometry, tolerance, absolute/range-local IDs, quantities, historical nulls and directions are unchanged.','No new solver, repair, snapping, generated fill, nearest fallback or replacement representative. Named unproved results remain valid.','No compiler/native, runtime decoder/blueprint, live world/graph, rendering/build/Pages; consumer mapping and gameplay acceptance remain separate.']}
    return result,summary

def record():
    assert not (HERE/'contacts-delta.json').exists()
    result,summary=derive();write(HERE/'contacts-delta.json',result);write(HERE/'checks-summary.json',summary)
    return summary
