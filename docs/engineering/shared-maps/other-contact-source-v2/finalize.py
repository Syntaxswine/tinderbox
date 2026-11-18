"""Assemble dictionaries/references and aggregate saved results; never calculate geometry."""
import collections, copy
from common import *

def derive():
    pins = read(HERE / 'input-pins.json')
    plan = read(CACHE / 'plan.json')
    assert sha((CACHE / 'plan.json').read_bytes()) == pins['planSha256']
    old = cached(plan['oldProposal'])
    normal_document = read(HERE / 'normal-conventions.json')
    normal_entries = {entry['region']: (i, entry) for i, entry in enumerate(normal_document['entries'])}
    old_region_index = {r['id']: i for i, r in enumerate(old['regions'])}
    reports, proofs, page_refs = {}, {}, []
    for descriptor in plan['pages']:
        number = descriptor['page']
        page_path = HERE / 'pages' / ('page-%03d.json' % number)
        check_path = HERE / 'checks' / page_path.name
        if not page_path.exists():
            assert not check_path.exists()
            continue
        assert check_path.exists(), 'An unverified page must not be published'
        page, check = read(page_path), read(check_path)
        page_hash = sha(page_path.read_bytes())
        assert check['pageSha256'] == page_hash
        assert [r['id'] for r in page['regions']] == descriptor['regionIds']
        page_refs.append({'page': number, 'path': page_path.relative_to(HERE).as_posix(),
            'sha256': page_hash, 'checkPath': check_path.relative_to(HERE).as_posix(),
            'checkSha256': sha(check_path.read_bytes())})
        for i, report in enumerate(page['regions']):
            assert report['id'] not in reports
            reports[report['id']] = (report, number, i, page_hash)
        for proof in page['instanceProofs']:
            if proof['id'] in proofs:
                assert proofs[proof['id']] == proof, 'Repeated source instance classification changed'
            else:
                proofs[proof['id']] = proof
    def prior_ref(kind, index, value):
        return {'commit': BASE, 'path': plan['oldProposal']['path'],
                'rawFileSha256': plan['oldProposal']['sha256'],
                'pointer': '/' + kind + '/' + str(index), 'canonicalSha256': sha(canonical(value).encode())}
    instances = []
    for original in plan['instances']:
        item = copy.deepcopy(original)
        for key in ['topology', 'componentFailure']:
            item.pop(key, None)
        item['priorInstance'] = prior_ref('instances', item['id'], original)
        proof = proofs.get(item['id'])
        if proof:
            item['originalGeometryStatus'] = 'v2-source-evaluated'
            item['sourceGeometryProof'] = copy.deepcopy(proof)
            item['orderedWorldTrianglesFloat64LittleEndianSha256'] = proof['orderedWorldTrianglesFloat64LittleEndianSha256']
            item['originalPartWorldTrianglesFloat64LittleEndianSha256'] = proof['originalPartWorldTrianglesFloat64LittleEndianSha256']
        else:
            item['originalGeometryStatus'] = 'preserved-v1-only' if original['originalGeometryStatus'] != 'UNATTEMPTED' else 'UNATTEMPTED'
        instances.append(item)
    regions = []
    transient = ['status', 'calculationStats', 'contact', 'checks', 'unprovedCode', 'unprovedInstances']
    for original in plan['regions']:
        item = copy.deepcopy(original)
        if item['id'] in plan['preservedRegionIds']:
            assert item['status'] == 'source-contact-proposed'
            item['priorProof'] = prior_ref('regions', old_region_index[item['id']], original)
        else:
            for key in transient:
                item.pop(key, None)
            if original['status'] == 'unproved':
                item['priorHistoricalResult'] = prior_ref('regions', old_region_index[item['id']], original)
            entry = reports.get(item['id'])
            if entry is None:
                item['status'] = 'UNATTEMPTED'
            else:
                report, number, index, page_hash = entry
                item['status'] = report['status']
                item['calculationStats'] = report['stats']
                item['proofOrigin'] = {'path': 'pages/page-%03d.json' % number,
                    'pointer': '/regions/' + str(index), 'rawFileSha256': page_hash}
                if item['status'] == 'source-contact-proposed':
                    contact = copy.deepcopy(report['contact'])
                    contact['rangeLocalPrimitives'] = [contact['primitives'][side] - plan['instances'][item[key]]['primitiveBase'] for side, key in enumerate(['parent', 'child'])]
                    normal_index, normal_entry = normal_entries[item['id']]
                    assert normal_entry['appliedToProposal'] and normal_entry['historicalNormals'] == contact['normals']
                    contact['normals'] = copy.deepcopy(normal_entry['canonicalNormals'])
                    item['normalMetadata'] = {'convention': normal_document['canonicalConvention']['id'], 'path': 'normal-conventions.json', 'pointer': '/entries/' + str(normal_index)}
                    item['contact'], item['checks'] = contact, report['checks']
                else:
                    assert item['status'] == 'unproved'
                    item['unprovedCode'] = report['reason']
                    item['unprovedInstances'] = [item[key] for key in ['parent', 'child'] if proofs[item[key]]['failure']]
        regions.append(item)
    counts = collections.Counter(r['status'] for r in regions)
    positives = [r for r in regions if r['status'] == 'source-contact-proposed']
    new_positives = [r for r in positives if 'proofOrigin' in r]
    unproved = [r for r in regions if r['status'] == 'unproved']
    topology_keys = sorted({p['topologyDictionary'] for p in proofs.values() if p['topologyDictionary'] is not None})
    topologies = []
    for key in topology_keys:
        path = HERE / 'dictionaries' / (key + '.json')
        assert sha(path.read_bytes()) == key
        dictionary = read(path)
        topologies.append({'id': key, 'path': path.relative_to(HERE).as_posix(), 'rawSha256': key,
            'components': len(dictionary['components']), 'positiveOriginalFaces': sum(len(c['primitives']) for c in dictionary['components']),
            'nonmaterialOriginalFaces': len(dictionary['nonmaterialFaces'])})
    families = {}
    for family, total in plan['families'].items():
        rows = [r for r in regions if r['family'] == family]
        c = collections.Counter(r['status'] for r in rows)
        families[family] = {'regions': total, 'preservedPositiveReferences': sum('priorProof' in r for r in rows),
            'newAttempted': sum('proofOrigin' in r for r in rows), 'proposed': c['source-contact-proposed'],
            'unproved': c['unproved'], 'UNATTEMPTED': c['UNATTEMPTED']}
    baluster = next(r for r in regions if r['id'] == '5b1da7c755e4d73f34574c7e')
    summary = {'inventory': 1582, 'preservedPositiveReferences': 7, 'newAttempted': len(reports),
        'newProposed': len(new_positives), 'proposedIncludingPrior': len(positives),
        'unproved': len(unproved), 'UNATTEMPTED': counts['UNATTEMPTED'],
        'unprovedReasons': dict(sorted(collections.Counter(r['unprovedCode'] for r in unproved).items())),
        'families': families, 'completedPages': len(page_refs), 'plannedPages': len(plan['pages']),
        'sourceBuffersReferenced': 92, 'sourceBuffersPinned': len(plan['geometries']),
        'instances': len(instances), 'newInstanceGeometriesEvaluated': len(proofs),
        'sharedTopologyDictionaries': len(topologies), 'sourceRangeInstances': 16,
        'newContactPredicateChecks': sum(len(r['checks']['contact']) for r in new_positives),
        'preservedPriorContactPredicateChecks': sum(len(r['checks']['contact']) for r in positives if 'priorProof' in r),
        'newNegativeChecks': {k: sum(r['checks'][k] for r in new_positives) for k in ['wrongPrimitiveNegatives', 'outsideSelectorNegatives', 'legacyWitnessNegatives']},
        'balusterRecheck': {'region': baluster['id'], 'status': baluster['status'],
            'primitives': baluster.get('contact', {}).get('primitives'), 'unprovedCode': baluster.get('unprovedCode'),
            'priorHistoricalResultPreserved': 'priorHistoricalResult' in baluster},
        'nativeCompilerCalls': 0, 'runtimeDecoderCalls': 0, 'sourceBlueprintExpansions': 0,
        'graphWorldRendererBuildBenchmarkRuns': 0}
    proposal = {'version': 2, 'status': 'UNACCEPTED_DERIVED_SOURCE_CONTACT_INPUTS', 'runtimeConsumable': False,
        'authority': ['authority.md'], 'sourceRef': SOURCE, 'componentCore': CORE,
        'inputPinsSha256': sha((HERE / 'input-pins.json').read_bytes()),
        'priorCheckpoint': plan['oldProposal'],
        'normalConventions': {'path': 'normal-conventions.json', 'rawSha256': sha((HERE / 'normal-conventions.json').read_bytes()), 'newV2Convention': normal_document['canonicalConvention']['id'], 'priorReferenceConvention': normal_document['historicalConvention']['id'], 'priorReferencePayloadsPreserved': True},
        'coordinateFrame': old['coordinateFrame'], 'derivation': old['derivation'],
        'pointMembership': old['pointMembership'], 'primitiveConvention': old['primitiveConvention'],
        'selectionPolicy': 'Preserve seven exact v1 positive references; recheck only the original unproved baluster representative first, then all 1574 previously UNATTEMPTED regions in original order. No replacement or retry.',
        'helpers': {'contact': {k: v for k, v in plan['contact'].items() if k != 'cache'},
                    'components': {'commit': CORE, 'path': 'src/simulation/original-support-ports.js', 'functionSha256': pins['componentFunctionSha256']}},
        'geometries': [{k: v for k, v in g.items() if k != 'cache'} for g in plan['geometries']],
        'topologies': topologies, 'instances': instances, 'relationships': plan['relationships'],
        'regions': regions, 'pageEvidence': page_refs, 'scopeInventory': plan['scopeInventory'], 'summary': summary,
        'limitations': ['Proposed original physical contacts only; no bearing strength, fastening, anchor, grounding or gameplay acceptance.',
            'Raw buffers, source ordinals/ranges, historical null/false fields and original quantities remain immutable. Only proven duplicate-coordinate empty faces are absent from material membership.',
            'The seven old positives and the old unproved baluster result remain exact historical references; this packet contains separately checked new source results.',
            'Named unproved results are retained without geometry repair, a solver, nearest survivor, cap, changed tolerance or retry.',
            'No native/compiler, runtime source decoder, source-blueprint expansion, graph/world/publication, renderer/build/benchmark, full-New-York diagnostic or consumer mapping.']}
    return proposal, summary

def record():
    assert not (HERE / 'contacts-proposal.json').exists() and not (HERE / 'checks-summary.json').exists()
    proposal, summary = derive()
    write(HERE / 'contacts-proposal.json', proposal)
    write(HERE / 'checks-summary.json', summary)
    return summary
