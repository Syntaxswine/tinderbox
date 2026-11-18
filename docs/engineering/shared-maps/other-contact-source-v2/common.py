"""Shared metadata/cache helpers. No geometry or subprocess lifecycle implementation."""
from pathlib import Path
import hashlib, json, subprocess, time
HERE = Path(__file__).resolve().parent
ROOT = HERE.parents[3]
OLD = HERE.parent / 'other-contact-source-v1'
BASE = 'e67235b6e9d87760b1b36d802833de44456b1bd8'
CORE = '25c74d2d2b9ae749a721e2ff71e6c116023c2379'
SOURCE = '0e9ffa764610f7ab047e3d4cdebd05342273463f'
CACHE = HERE / '.cache'
sha = lambda b: hashlib.sha256(b).hexdigest()
canonical = lambda x: json.dumps(x, sort_keys=True, separators=(',', ':'), allow_nan=False)
read = lambda p: json.loads(p.read_bytes())

def write(path, value):
    path.parent.mkdir(parents=True, exist_ok=True)
    data = (canonical(value) + '\n').encode('utf-8')
    temporary = path.with_suffix(path.suffix + '.tmp')
    temporary.write_bytes(data)
    temporary.replace(path)

def remaining(deadline):
    if deadline is None:
        return 60
    left = deadline - time.monotonic()
    if left < 15:
        raise TimeoutError('Coordinator deadline reserve reached; preserve unexecuted pages')
    return left

def git_bytes(commit, path, deadline=None):
    timeout = min(10, remaining(deadline) - 5)
    return subprocess.check_output(['git', 'show', commit + ':' + path], cwd=ROOT,
        timeout=timeout, creationflags=getattr(subprocess, 'CREATE_NO_WINDOW', 0))

def cached(pin):
    data = (HERE / pin['cache']).read_bytes()
    assert sha(data) == pin.get('sha256', pin.get('rawSha256'))
    return json.loads(data)
