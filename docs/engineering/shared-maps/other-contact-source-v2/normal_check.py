"""Normal ledger/provenance audit only; selected-face arithmetic is in bounded saved workers."""
import copy, struct
from common import *

N = HERE / 'normal-metadata'

def check_normals(proposal, deadline=None):
    pins, document = read(N / 'input-pins.json'), read(HERE / 'normal-conventions.json')
    assert document['inputPinsSha256'] == sha((N / 'input-pins.json').read_bytes())
    assert document['canonicalConvention'] == pins['canonicalConvention']
    assert document['historicalConvention'] == pins['historicalConvention']
    for key in ['canonicalCore', 'canonicalGeometry', 'canonicalAdapter']:
        assert document[key] == {k:v for k,v in pins[key].items() if k != 'cache'}
    for key in ['sourceProposal', 'canonicalCore', 'canonicalGeometry', 'canonicalAdapter']:
        pin = pins[key]
        data = git_bytes(pin['commit'], pin['path'], deadline)
        assert sha(data) == pin['sha256'], key
    old = json.loads(git_bytes(pins['sourceProposal']['commit'], pins['sourceProposal']['path'], deadline))
    core = git_bytes(pins['canonicalCore']['commit'], pins['canonicalCore']['path'], deadline).decode()
    adapter = git_bytes(pins['canonicalAdapter']['commit'], pins['canonicalAdapter']['path'], deadline).decode()
    assert pins['canonicalCore']['normalDeclaration'] in core
    assert pins['canonicalCore']['normalExpression'] in adapter and pins['canonicalAdapter']['comparison'] in adapter
    reference = proposal['normalConventions']
    assert reference['rawSha256'] == sha((HERE / reference['path']).read_bytes())
    entries = document['entries']
    assert [e['region'] for e in entries] == pins['regionIds']
    assert len(entries) == 1019 and len({e['region'] for e in entries}) == 1019
    prior_by_id = {r['id']: r for r in old['regions']}
    current_by_id = {r['id']: r for r in proposal['regions']}
    by_id = {e['region']: e for e in entries}
    restored = copy.deepcopy(proposal)
    restored.pop('normalConventions')
    float_hash = lambda normals: sha(b''.join(struct.pack('<d', value) for vector in normals for value in vector))
    for index, entry in enumerate(entries):
        prior, current = prior_by_id[entry['region']], current_by_id[entry['region']]
        assert entry['historicalConvention'] == pins['historicalConvention']['id']
        assert entry['canonicalConvention'] == pins['canonicalConvention']['id']
        assert entry['instances'] == [prior['parent'], prior['child']]
        assert entry['primitives'] == prior['contact']['primitives']
        assert entry['historicalNormals'] == prior['contact']['normals']
        assert float_hash(entry['historicalNormals']) == entry['historicalSerializedFloat64LittleEndianSha256']
        assert float_hash(entry['canonicalNormals']) == entry['canonicalSerializedFloat64LittleEndianSha256']
        assert entry['endpointComponentsDiffer'] == [any(a != b for a, b in zip(legacy, canonical)) for legacy, canonical in zip(entry['historicalNormals'], entry['canonicalNormals'])]
        if entry['appliedToProposal']:
            assert 'priorProof' not in prior
            assert current['contact']['normals'] == entry['canonicalNormals']
            assert current['normalMetadata'] == {'convention': pins['canonicalConvention']['id'], 'path': 'normal-conventions.json', 'pointer': '/entries/' + str(index)}
        else:
            assert 'priorProof' in prior and current == prior
    for region in restored['regions']:
        if region['id'] in by_id and by_id[region['id']]['appliedToProposal']:
            region.pop('normalMetadata')
            region['contact']['normals'] = by_id[region['id']]['historicalNormals']
    assert restored == old, 'Only new normal metadata may differ from 6f5d8981'
    journal = [json.loads(line) for line in (N / 'runs/process-events.jsonl').read_text().splitlines()]
    saved_entries = []
    for page, ids in enumerate(pins['pages']):
        page_path = N / 'pages' / ('page-%03d.json' % page)
        result, checked = read(page_path), read(N / 'checks' / page_path.name)
        assert result['workerSha256'] == checked['workerSha256'] == sha((HERE / 'normals.mjs').read_bytes())
        assert result['inputPinsSha256'] == document['inputPinsSha256']
        assert checked['pageSha256'] == sha(page_path.read_bytes())
        assert [e['region'] for e in result['entries']] == ids
        assert checked['entriesRechecked'] == len(ids) and checked['selectedOriginalFacesRechecked'] == len(ids)*2
        assert result['contactSearches'] == result['contactPredicatesReexecuted'] == checked['contactSearches'] == checked['contactPredicatesReexecuted'] == 0
        saved_entries.extend(result['entries'])
        for mode in ['derive', 'verify']:
            label = mode + '-%03d' % page
            receipt = read(N / 'runs' / (label + '.json'))
            assert receipt['exited'] and receipt['exitCode'] == 0 and not receipt['timedOut']
            assert receipt['foreground'] and receipt['hiddenOnWindows'] and not receipt['retained']
            assert receipt['regions'] == len(ids) <= 256 and receipt['deadlineSeconds'] <= 60
            assert receipt['metadataOnly'] and receipt['contactSearches'] == receipt['contactPredicatesReexecuted'] == 0
            assert receipt['workerSha256'] == sha((HERE / 'normals.mjs').read_bytes())
            assert receipt['coordinatorSha256'] == sha((HERE / 'normals-run.py').read_bytes())
            assert receipt['lifecycleSha256'] == sha((HERE / 'lifecycle.py').read_bytes())
            assert sha((N / 'runs' / (label + '.log')).read_bytes()) == receipt['stdoutSha256']
            events = [e for e in journal if e['pid'] == receipt['pid'] and e['startedAt'] == receipt['startedAt']]
            assert [e['event'] for e in events] == ['started', 'exited'] and events[-1]['exited']
    assert saved_entries == entries
    batch = read(N / 'batch.json')
    assert batch['status'] == 'complete' and batch['completedPages'] == list(range(4)) and batch['elapsedSeconds'] <= 600
    summary = document['summary']
    assert summary == read(N / 'summary.json') == batch['summary']
    assert summary['newV2Regions'] == 1012 and summary['priorHistoricalReferences'] == 7
    assert summary['contactSearches'] == summary['contactPredicatesReexecuted'] == summary['actualNativeCompilerCalls'] == summary['sourceBlueprintExpansions'] == summary['runtimeEdits'] == 0
    return summary
