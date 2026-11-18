"""One finite foreground coordinator. Source children use the exact b93dcee2 owned-handle runner."""
import datetime, os, sys, time, traceback
sys.dont_write_bytecode = True
from common import *
from lifecycle import run_owned

NODE = r'C:\Program Files\nodejs\node.exe'

def main():
    assert sys.argv[1:] == ['batch'], 'Use run.py batch once; saved attempts are never replayed'
    assert not (HERE / 'batch.json').exists(), 'A batch exists. Preserve it; no automatic restart/retry.'
    deadline = time.monotonic() + 540
    batch = {'owner': 'Tinderbox UI specialist: codex/shared-map-tools-ui', 'project': 'Tinderbox',
        'foreground': True, 'maximumSeconds': 600, 'workingDeadlineSeconds': 540,
        'startedAt': datetime.datetime.now(datetime.timezone.utc).isoformat(), 'status': 'preparing',
        'completedPages': [], 'failedPages': [], 'ports': [], 'retainedHelpers': []}
    batch['coordinator'] = {'pid': os.getpid(), 'executable': sys.executable, 'arguments': ['-B', str(HERE / 'run.py'), 'batch'], 'cwd': str(ROOT), 'owner': batch['owner'], 'purpose': 'Finite original non-cornice source page coordinator', 'startedAt': batch['startedAt'], 'intendedExpiry': (datetime.datetime.now(datetime.timezone.utc) + datetime.timedelta(seconds=600)).isoformat(), 'endCondition': 'Exit after checked batch or preserved failure; bounded source children and 540-second working deadline', 'stopMethod': 'Normal foreground exit; page handles cleaned by pinned runner; no service or port'}
    for name in ['runs', 'pages', 'checks', 'dictionaries']:
        (HERE / name).mkdir(exist_ok=True)
    write(HERE / 'batch.json', batch)
    started = time.monotonic()
    def update(status):
        batch['status'] = status
        batch['elapsedSeconds'] = time.monotonic() - started
        write(HERE / 'batch.json', batch)
    def child(mode, page, region_count):
        label = mode + '-%03d' % page
        receipt_path = HERE / 'runs' / (label + '.json')
        assert not receipt_path.exists()
        for old in (HERE / 'runs').glob('*.json'):
            assert read(old).get('exitCode') == 0, 'Earlier failed/incomplete child blocks continuation'
        update(label)
        commands = [NODE, '--max-old-space-size=384', str(HERE / 'page.mjs'), mode, str(page)]
        timeout = min(60, remaining(deadline) - 10)
        try:
            stdout, stderr, receipt = run_owned(commands, ROOT,
                'UI offline non-cornice source ' + label, region_count, timeout,
                journal_path=HERE / 'runs/process-events.jsonl')
        except BaseException as error:
            receipt = getattr(error, 'process_cleanup_receipt', None)
            if receipt:
                write(receipt_path, receipt)
            raise
        (HERE / 'runs' / (label + '.log')).write_bytes(stdout)
        if stderr:
            (HERE / 'runs' / (label + '.stderr.log')).write_bytes(stderr)
        receipt.update({'label': label, 'stdoutSha256': sha(stdout), 'stderrSha256': sha(stderr),
            'workerSha256': sha((HERE / 'page.mjs').read_bytes()),
            'lifecycleSha256': sha((HERE / 'lifecycle.py').read_bytes()),
            'coordinatorSha256': sha((HERE / 'run.py').read_bytes())})
        write(receipt_path, receipt)
        assert receipt['exitCode'] == 0 and receipt['exited'] and not receipt['timedOut'], label + ' failed; stop and preserve it'
        assert receipt['elapsedMs'] < 65000
        print(stdout.decode('utf-8').strip(), flush=True)
    try:
        from prepare import prepare
        pins = prepare(deadline)
        batch['plannedPages'] = len(pins['pages'])
        update('prepared')
        for descriptor in pins['pages']:
            remaining(deadline)
            page = descriptor['page']
            count = len(descriptor['regionIds'])
            batch['currentPage'] = page
            child('page', page, count)
            child('verify', page, count)
            batch['completedPages'].append(page)
            update('page-verified')
        remaining(deadline)
        update('assembling')
        from finalize import record
        summary = record()
        update('auditing')
        from check import check
        audit = check(deadline)
        write(HERE / 'checks-summary-audit.json', audit)
        batch['summary'] = summary
        batch['status'] = 'complete'
    except BaseException as error:
        batch['status'] = 'failed-preserved'
        batch['failure'] = {'type': type(error).__name__, 'message': str(error)}
        if 'currentPage' in batch and batch['currentPage'] not in batch['completedPages']:
            batch['failedPages'].append(batch['currentPage'])
        (HERE / 'failure.txt').write_text(traceback.format_exc(), encoding='utf-8')
        raise
    finally:
        batch['endedAt'] = datetime.datetime.now(datetime.timezone.utc).isoformat()
        batch['elapsedSeconds'] = time.monotonic() - started
        write(HERE / 'batch.json', batch)
    print(json.dumps({'status': batch['status'], 'elapsedSeconds': batch['elapsedSeconds'], 'summary': batch['summary']}), flush=True)

if __name__ == '__main__':
    main()
