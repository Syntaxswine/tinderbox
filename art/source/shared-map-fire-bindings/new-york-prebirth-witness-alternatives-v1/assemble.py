"""Package saved source proposals; do not repeat the numeric attempt."""
from pathlib import Path
import json,hashlib,re,sys,runpy
sys.dont_write_bytecode=True
HERE=Path(__file__).resolve().parent
sys.argv=[str(HERE/'verify.py')]+([] if (HERE/'checks.json').exists() else ['--write']);runpy.run_path(str(HERE/'verify.py'),run_name='__main__')
rows=[]
for p in sorted(HERE.rglob('*')):
 if p.is_file() and p.name!='review-package.json':
  b=p.read_bytes();assert b'\r' not in b and (not b or b.endswith(b'\n')),str(p)
  rows.append({'path':p.relative_to(HERE).as_posix(),'bytes':len(b),'sha256':hashlib.sha256(b).hexdigest()})
packet={'version':1,'scope':'Exactly two pre-birth source alternatives, not approved or installed','paths':len(rows)+1,'payloadPins':len(rows),'files':rows,'prospectiveNativeIds':None,'runtimePolicyChanged':False,'retainedHelpers':0}
(HERE/'review-package.json').write_bytes((json.dumps(packet,separators=(',',':'))+'\n').encode())
for p in rows:assert hashlib.sha256((HERE/p['path']).read_bytes()).hexdigest()==p['sha256']
links=0
for target in re.findall(r'\]\(([^)]+)\)',(HERE/'README.md').read_text(encoding='ascii')):
 if not re.match(r'https?://',target):assert (HERE/target.split('#')[0]).resolve().exists(),target;links+=1
print(json.dumps({'result':'PACKET_HASHES_AND_LOCAL_LINKS_PASS','paths':len(rows)+1,'payloadPins':len(rows),'localLinks':links,'numericRetries':0}))
