"""One-shot fixed-face normal metadata, using the existing pinned owned-handle runner."""
import datetime, os, sys, time
sys.dont_write_bytecode = True
from common import *
from lifecycle import run_owned
N = HERE / 'normal-metadata'
NODE = r'C:\Program Files\nodejs\node.exe'

def main():
    assert sys.argv[1:] == ['batch']
    assert not (N / 'batch.json').exists(), 'Preserve the earlier attempt; do not silently retry'
    pins = read(N / 'input-pins.json')
    deadline = time.monotonic() + 540
    batch = {'owner': 'Tinderbox UI specialist: codex/shared-map-tools-ui',
        'pid': os.getpid(), 'executable': sys.executable, 'arguments': ['-B', str(HERE / 'normals-run.py'), 'batch'],
        'cwd': str(ROOT), 'purpose': 'Fixed-face canonical normal metadata; no contact search',
        'startedAt': datetime.datetime.now(datetime.timezone.utc).isoformat(),
        'foreground': True, 'maximumSeconds': 600, 'workingDeadlineSeconds': 540,
        'endCondition': 'Exit after four checked metadata pages or preserve first failure',
        'stopMethod': 'Normal foreground exit; child cleanup through pinned b93dcee2 owned handle',
        'status': 'running', 'completedPages': [], 'ports': [], 'retainedHelpers': []}
    started = time.monotonic()
    write(N / 'batch.json', batch)
    try:
        for page, ids in enumerate(pins['pages']):
            for mode in ['derive', 'verify']:
                remaining(deadline)
                label = mode + '-%03d' % page
                assert not (N / 'runs' / (label + '.json')).exists()
                stdout, stderr, receipt = run_owned([NODE, '--max-old-space-size=384', str(HERE / 'normals.mjs'), mode, str(page)],
                    ROOT, 'UI fixed selected-face normal metadata ' + label, len(ids), min(60, remaining(deadline) - 10),
                    journal_path=N / 'runs/process-events.jsonl')
                (N / 'runs' / (label + '.log')).write_bytes(stdout)
                if stderr:
                    (N / 'runs' / (label + '.stderr.log')).write_bytes(stderr)
                receipt.update({'label': label, 'metadataOnly': True, 'contactSearches': 0,
                    'contactPredicatesReexecuted': 0, 'workerSha256': sha((HERE / 'normals.mjs').read_bytes()),
                    'lifecycleSha256': sha((HERE / 'lifecycle.py').read_bytes()),
                    'coordinatorSha256': sha((HERE / 'normals-run.py').read_bytes()),
                    'stdoutSha256': sha(stdout), 'stderrSha256': sha(stderr)})
                write(N / 'runs' / (label + '.json'), receipt)
                assert receipt['exitCode'] == 0 and receipt['exited'] and not receipt['timedOut'], label + ' failed; preserve it'
                print(stdout.decode().strip(), flush=True)
            batch['completedPages'].append(page)
            write(N / 'batch.json', batch)
        entries = []
        references = []
        for page in range(len(pins['pages'])):
            page_path = N / 'pages' / ('page-%03d.json' % page)
            check_path = N / 'checks' / page_path.name
            result, check = read(page_path), read(check_path)
            assert check['pageSha256'] == sha(page_path.read_bytes())
            entries.extend(result['entries'])
            references.append({'page': page, 'path': page_path.relative_to(HERE).as_posix(), 'sha256': sha(page_path.read_bytes()),
                'checkPath': check_path.relative_to(HERE).as_posix(), 'checkSha256': sha(check_path.read_bytes())})
        assert [e['region'] for e in entries] == pins['regionIds']
        summary = {'regions': len(entries), 'selectedEndpoints': len(entries) * 2,
            'newV2Regions': sum(e['appliedToProposal'] for e in entries),
            'priorHistoricalReferences': sum(not e['appliedToProposal'] for e in entries),
            'differentNewV2Endpoints': sum(sum(e['endpointComponentsDiffer']) for e in entries if e['appliedToProposal']),
            'differentPriorHistoricalEndpoints': sum(sum(e['endpointComponentsDiffer']) for e in entries if not e['appliedToProposal']),
            'newV2RegionsWithDifferentComponents': sum(any(e['endpointComponentsDiffer']) for e in entries if e['appliedToProposal']),
            'priorReferencesWithDifferentComponents': sum(any(e['endpointComponentsDiffer']) for e in entries if not e['appliedToProposal']),
            'contactSearches': 0, 'contactPredicatesReexecuted': 0, 'actualNativeCompilerCalls': 0,
            'sourceBlueprintExpansions': 0, 'runtimeEdits': 0}
        conventions = {'version': 1, 'scope': 'Normal metadata over fixed selected original primitive IDs only',
            'inputPinsSha256': sha((N / 'input-pins.json').read_bytes()), 'sourceCheckpoint': pins['sourceCheckpoint'],
            'canonicalConvention': pins['canonicalConvention'], 'historicalConvention': pins['historicalConvention'],
            'canonicalCore': {k:v for k,v in pins['canonicalCore'].items() if k != 'cache'},
            'canonicalGeometry': {k:v for k,v in pins['canonicalGeometry'].items() if k != 'cache'},
            'canonicalAdapter': {k:v for k,v in pins['canonicalAdapter'].items() if k != 'cache'},
            'historicalReferencePolicy': 'All seven v1 payloads remain exact. Their derived canonical values are recorded here but never overwrite the historical reference.',
            'newV2Policy': 'contacts-proposal new v2 normals use accepted componentwise division; source calculation page normals remain immutable reciprocal-multiplication history.',
            'entries': entries, 'pageEvidence': references, 'summary': summary}
        assert not (HERE / 'normal-conventions.json').exists()
        write(HERE / 'normal-conventions.json', conventions)
        write(N / 'summary.json', summary)
        batch['summary'] = summary
        batch['status'] = 'complete'
    except BaseException as error:
        batch['status'] = 'failed-preserved'
        batch['failure'] = {'type': type(error).__name__, 'message': str(error)}
        receipt = getattr(error, 'process_cleanup_receipt', None)
        if receipt:
            write(N / 'exception-cleanup.json', receipt)
        raise
    finally:
        batch['endedAt'] = datetime.datetime.now(datetime.timezone.utc).isoformat()
        batch['elapsedSeconds'] = time.monotonic() - started
        write(N / 'batch.json', batch)
    print(json.dumps({'status': batch['status'], 'elapsedSeconds': batch['elapsedSeconds'], 'summary': batch['summary']}), flush=True)

if __name__ == '__main__':
    main()
