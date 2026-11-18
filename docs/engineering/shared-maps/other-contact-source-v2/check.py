"""Metadata, hashes and saved proof receipts only. Never searches contacts or regenerates geometry."""
import collections, math, sys, time
sys.dont_write_bytecode = True
from common import *
from finalize import derive

def check(deadline=None):
    pins, plan = read(HERE / 'input-pins.json'), read(CACHE / 'plan.json')
    assert sha((CACHE / 'plan.json').read_bytes()) == pins['planSha256']
    assert len(plan['pages']) == 8 and [len(p['regionIds']) for p in plan['pages']] == [1, 256, 256, 256, 256, 256, 256, 38]
    assert len(set(plan['attemptRegionIds'])) == 1575 and len(set(plan['preservedRegionIds'])) == 7
    assert not set(plan['attemptRegionIds']) & set(plan['preservedRegionIds'])
    for pin in pins['sourcePins']:
        remaining(deadline)
        data = git_bytes(pin['commit'], pin['path'], deadline)
        assert sha(data) == pin['sha256'] and len(data) == pin['bytes'], pin['path']
        assert (HERE / pin['cache']).read_bytes() == data
    assert sha((HERE / 'authority.md').read_bytes()) == pins['authoritySha256']
    provenance = read(HERE / 'provenance.json')
    assert sha((HERE / 'provenance.json').read_bytes()) == pins['provenanceSha256']
    original_runner = (HERE / 'provenance/lifecycle-b93dcee2.py.txt').read_bytes()
    adapted_runner = (HERE / 'lifecycle.py').read_bytes()
    runner = provenance['lifecycle']
    assert sha(original_runner) == runner['rawSha256'] and sha(adapted_runner) == runner['adaptedRawSha256']
    assert original_runner == git_bytes(runner['commit'], runner['path'], deadline)
    assert adapted_runner.replace(('OWNER="' + runner['owner'] + '"').encode(), b'OWNER="01a17ea0-1362-7d13-a42d-f4a5fcff8902"') == original_runner
    saved_control = (HERE / 'provenance/runner-cleanup-control-b93dcee2.json').read_bytes()
    assert sha(saved_control) == runner['savedCleanupControlRawSha256']
    assert json.loads(saved_control)['result'] == 'INJECTED_JOURNAL_FAILURE_CLEANED'
    old_method = git_bytes(BASE, provenance['method']['path'], deadline).decode().replace('\r\n', '\n')
    new_method = (HERE / 'page.mjs').read_text(encoding='utf-8')
    select = lambda s: s[s.index('function boxes(row)'):s.index('const resultFile=')]
    assert select(old_method) == select(new_method)
    assert sha(select(new_method).encode()) == provenance['method']['unchangedWitnessContactFunctionBlockSha256']
    component = read(CACHE / 'component-function.json')
    assert component['commit'] == CORE and sha(component['function'].encode()) == pins['componentFunctionSha256']
    core_text = git_bytes(CORE, component['path'], deadline).decode().replace('\r\n', '\n')
    assert component['function'] == core_text[core_text.index('export function originalMaterialComponents('):core_text.index('\nexport function createOriginalSupportPorts(')]
    proposal, summary = derive()
    assert proposal == read(HERE / 'contacts-proposal.json') and summary == read(HERE / 'checks-summary.json')
    from normal_check import check_normals
    check_normals(proposal, deadline)
    old = cached(plan['oldProposal'])
    original = cached(plan['sourceRelationships'])['relationships']
    bindings = cached(plan['sourceGeometryBindings'])['carriers']
    index = cached(plan['globalIndex'])
    selected = [r for r in original if r['family'] in plan['families']]
    excluded = [r for r in original if r['family'] not in plan['families']]
    assert len(selected) == 1582 and len(excluded) == 1694 and all(r['family'].startswith('cornice') for r in excluded)
    assert {r['id'] for r in proposal['relationships']} == {r['id'] for r in selected}
    assert collections.Counter(r['family'] for r in selected) == plan['families']
    assert proposal['relationships'] == old['relationships']
    assert len(proposal['geometries']) == 92 and len(proposal['instances']) == 1703 and len(proposal['regions']) == 1582
    metadata_keys = ['id', 'ownerId', 'partId', 'sourcePartId', 'globalSourcePartId', 'globalSourcePartIndex', 'globalCarrierIndex', 'geometry', 'sourceRange', 'primitiveBase', 'emittedWorldMatrix', 'role', 'sourceBindingPointer', 'sourceCarrierCanonicalSha256', 'canonicalRecipe', 'nativeRecordId', 'nativeCell']
    topologies = {t['id']: read(HERE / t['path']) for t in proposal['topologies']}
    for topology in proposal['topologies']:
        assert sha((HERE / topology['path']).read_bytes()) == topology['rawSha256'] == topology['id']
        value = topologies[topology['id']]
        ids = [i for c in value['components'] for i in c['primitives']]
        empty = [f['primitive'] for f in value['nonmaterialFaces']]
        assert len(set(ids)) == len(ids) and len(set(empty)) == len(empty) and not set(ids) & set(empty)
        assert value['componentFunctionSha256'] == pins['componentFunctionSha256']
    for item, prior in zip(proposal['instances'], old['instances']):
        assert all(item[k] == prior[k] for k in metadata_keys)
        binding = bindings[item['ownerId']][0]
        row = index['parts'][item['globalSourcePartIndex']]
        carrier = index['carriers'][item['globalCarrierIndex']]
        assert row[0] == item['globalSourcePartId'] and carrier[0] == item['ownerId']
        assert sha(canonical(carrier).encode()) == item['sourceCarrierCanonicalSha256']
        assert binding['matrix'] == item['emittedWorldMatrix'] and binding['sourceRange'] == item['sourceRange']
        assert item['nativeRecordId'] is None and item['nativeCell'] is None
        proof = item.get('sourceGeometryProof')
        if proof and not proof['failure']:
            topology = topologies[proof['topologyDictionary']]
            material = {i for c in topology['components'] for i in c['primitives']}
            empty = {f['primitive'] for f in topology['nonmaterialFaces']}
            assert material | empty == set(range(proof['rawOriginalTriangles']))
            assert sorted(empty) == proof['nonmaterialPrimitives']
            assert len(material) == proof['positiveMaterialTriangles']
            start, count = item['primitiveBase'], proof['rawRangeTriangles']
            assert sum(start <= i < start + count for i in material) == proof['positiveRangeTriangles']
    for item, prior in zip(proposal['regions'], old['regions']):
        for key in ['id', 'relationship', 'family', 'parent', 'child', 'sourcePointer', 'originalRegionCanonicalSha256', 'selector', 'endpointBounds', 'historical']:
            assert item[key] == prior[key], (item['id'], key)
        ordinal = int(item['sourcePointer'].split('/')[2])
        original_region = original[ordinal]['localRegions'][0]
        assert sha(canonical(original_region).encode()) == item['originalRegionCanonicalSha256']
        assert item['selector'] == original_region['selector']
        assert item['endpointBounds'] == [original_region['parentBounds'], original_region['childBounds']]
        if item['id'] in plan['preservedRegionIds']:
            reference = item['priorProof']
            assert reference['canonicalSha256'] == sha(canonical(prior).encode())
            assert {k: v for k, v in item.items() if k != 'priorProof'} == prior
        elif item['status'] == 'source-contact-proposed':
            assert all(item['checks']['contact'])
            direction = next(r['direction'] for r in proposal['relationships'] if r['id'] == item['relationship'])
            assert len(item['checks']['contact']) == (6 if direction == 'symmetric-structural' else 3)
            for side, key in enumerate(['parent', 'child']):
                instance = proposal['instances'][item[key]]
                proof = instance['sourceGeometryProof']
                dictionary = topologies[proof['topologyDictionary']]
                component = next(c for c in dictionary['components'] if c['id'] == item['contact']['components'][side])
                primitive = item['contact']['primitives'][side]
                assert primitive in component['primitives'] and primitive not in proof['nonmaterialPrimitives']
                assert item['contact']['rangeLocalPrimitives'][side] == primitive - instance['primitiveBase']
                assert 0 <= item['contact']['rangeLocalPrimitives'][side] < proof['rawRangeTriangles']
                normal = item['contact']['normals'][side]
                assert all(math.isfinite(v) for v in normal) and abs(sum(v*v for v in normal) - 1) < 1e-10
        elif item['status'] == 'unproved':
            assert item['unprovedCode'] in ['original-component-unresolved', 'empty-selector-intersection', 'no-original-facets-in-selector', 'native-contact-rejected', 'ambiguous-original-point-membership', 'no-unambiguous-original-contact']
            assert 'contact' not in item and 'checks' not in item
        else:
            assert item['status'] == 'UNATTEMPTED' and 'contact' not in item and 'checks' not in item
    baluster = next(p for p in proposal['instances'] if p['globalSourcePartIndex'] == 2352)
    proof = baluster.get('sourceGeometryProof')
    if proof:
        assert proof['rawOriginalTriangles'] == 200
        if proof['failure']:
            assert proof['failure']['stage'] == 'raw-world-classification'
            assert proof['positiveMaterialTriangles'] == 0 and not proof['nonmaterialPrimitives']
            assert summary['balusterRecheck']['status'] == 'unproved'
        else:
            assert proof['positiveMaterialTriangles'] == 180
            assert proof['nonmaterialPrimitives'] == [n for i in range(10) for n in [i*20, i*20+19]]
        assert proof['rawOriginalTrianglesFloat64LittleEndianSha256'] == 'c039a9b9bc626d7ac45e8d60760230b331501a600f5eada95a68c67af5678a75'
        assert proof['originalPartWorldTrianglesFloat64LittleEndianSha256'] == 'afd88f2ecfba687f30f57f40255ba8126e6fad8903047230b7b12909842106de'
    journal = [json.loads(line) for line in (HERE / 'runs/process-events.jsonl').read_text(encoding='utf-8').splitlines()]
    completed = []
    for descriptor in plan['pages']:
        number = descriptor['page']
        page_path = HERE / 'pages' / ('page-%03d.json' % number)
        if not page_path.exists():
            continue
        page = read(page_path)
        verification = read(HERE / 'checks' / page_path.name)
        assert page['planSha256'] == pins['planSha256'] == verification['planSha256']
        worker_sha = sha((HERE / 'page.mjs').read_bytes())
        assert page['pageCheckerSha256'] == worker_sha == verification['pageCheckerSha256']
        assert verification['positiveProofsRechecked'] == sum(r['status'] == 'source-contact-proposed' for r in page['regions'])
        assert verification['searchesPerformed'] == 0
        for mode in ['page', 'verify']:
            label = mode + '-%03d' % number
            receipt = read(HERE / 'runs' / (label + '.json'))
            assert receipt['ownerTask'] == runner['owner'] and receipt['exited'] and receipt['exitCode'] == 0
            assert not receipt['timedOut'] and receipt['foreground'] and receipt['hiddenOnWindows'] and not receipt['retained']
            assert receipt['regions'] == len(descriptor['regionIds']) <= 256 and receipt['deadlineSeconds'] <= 60
            assert receipt['workerSha256'] == worker_sha and receipt['lifecycleSha256'] == sha(adapted_runner)
            assert receipt['coordinatorSha256'] == sha((HERE / 'run.py').read_bytes())
            assert sha((HERE / 'runs' / (label + '.log')).read_bytes()) == receipt['stdoutSha256']
            events = [e for e in journal if e['pid'] == receipt['pid'] and e['startedAt'] == receipt['startedAt']]
            assert [e['event'] for e in events] == ['started', 'exited'] and events[-1]['exited']
        completed.append(number)
    batch = read(HERE / 'batch.json')
    assert batch['completedPages'] == completed and not batch['failedPages'] and batch['elapsedSeconds'] <= 600
    if batch['status'] == 'failed-preserved':
        correction = read(HERE / 'metadata-audit-correction.json')
        assert batch['failure']['type'] == 'AssertionError' and len(completed) == 8
        assert sha((HERE / correction['originalCheckerPath']).read_bytes()) == correction['originalCheckerRawSha256']
        assert sha((HERE / correction['failurePath']).read_bytes()) == correction['failureRawSha256']
        assert sha((HERE / correction['batchPath']).read_bytes()) == correction['originalBatchRawSha256']
        assert correction['sourcePagesRerun'] == correction['sourceVerificationPagesRerun'] == 0
    known = read(HERE / 'provenance/known-nonmaterial-faces.json')
    diagnostic_bytes = git_bytes(known['commit'], known['path'], deadline)
    assert sha(diagnostic_bytes) == known['rawFileSha256']
    diagnostic = json.loads(diagnostic_bytes)
    assert known['rawOriginalPrimitiveOrdinals'] == diagnostic['raw']['exactBinaryZeroAreaPrimitives']
    assert known['geometryRawSha256'] == diagnostic['geometryRawSha256'] and known['contactProof'] is False
    assert len(list((HERE / 'pages').glob('*.json'))) == len(completed)
    assert len(list((HERE / 'checks').glob('*.json'))) == len(completed)
    assert summary['newAttempted'] + summary['UNATTEMPTED'] == 1575
    assert summary['proposedIncludingPrior'] + summary['unproved'] + summary['UNATTEMPTED'] == 1582
    assert summary['nativeCompilerCalls'] == summary['runtimeDecoderCalls'] == summary['sourceBlueprintExpansions'] == summary['graphWorldRendererBuildBenchmarkRuns'] == 0
    return {'checked': True, 'sourcePinsVerified': len(pins['sourcePins']), 'metadataRegionsPreserved': 1582,
        'priorPositiveReferencesExact': 7, 'oldUnprovedHistoricalReferenceRetained': True,
        'sourceMethodUnchanged': True, 'runnerOnlyOwnerAdapted': True, 'savedPositiveProofsVerifiedWithoutSearching': summary['newProposed'],
        'proposedIncludingPrior': summary['proposedIncludingPrior'], 'unproved': summary['unproved'], 'UNATTEMPTED': summary['UNATTEMPTED'],
        'completedPages': len(completed), 'retainedHelpers': [], 'ports': []}

if __name__ == '__main__':
    assert sys.argv[1:] in [[], ['--hydrate']]
    deadline = time.monotonic() + 50
    if '--hydrate' in sys.argv:
        from prepare import prepare
        prepare(deadline, hydrate=True)
        normal_inputs = read(HERE / 'normal-metadata/input-pins.json')
        for key in ['sourceProposal', 'canonicalCore', 'canonicalGeometry', 'canonicalAdapter']:
            pin = normal_inputs[key]
            data = git_bytes(pin['commit'], pin['path'], deadline)
            assert sha(data) == pin['sha256']
            target = HERE / pin['cache']
            target.parent.mkdir(parents=True, exist_ok=True)
            target.write_bytes(data)
    print(json.dumps(check(deadline)))
