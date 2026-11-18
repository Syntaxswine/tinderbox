"""Finalize hashes and local references after metadata checks, never source retries."""
from pathlib import Path
import json,hashlib,re,sys,runpy
sys.dont_write_bytecode=True
HERE=Path(__file__).resolve().parent
sys.argv=[str(HERE/'verify.py')]+([] if (HERE/'checks.json').exists() else ['--write']);runpy.run_path(str(HERE/'verify.py'),run_name='__main__')
payload=[]
for p in sorted(HERE.iterdir()):
 if p.is_file() and p.name!='review-package.json':
  b=p.read_bytes();assert b'\r' not in b and (not b or b.endswith(b'\n')),p.name
  payload.append({'path':p.name,'bytes':len(b),'sha256':hashlib.sha256(b).hexdigest()})
packet={'version':1,'scope':'One bounded lower-root source refusal; no runtime admission','paths':len(payload)+1,'payloadPins':len(payload),'files':payload,
 'nativeRecords':'UNBOUND','nativeCells':'UNBOUND','retainedHelpers':0,'additionalCohorts':0}
(HERE/'review-package.json').write_bytes((json.dumps(packet,separators=(',',':'))+'\n').encode())
for p in payload:assert hashlib.sha256((HERE/p['path']).read_bytes()).hexdigest()==p['sha256']
links=0
for n in ['README.md','authority.md']:
 for target in re.findall(r'\]\(([^)]+)\)',(HERE/n).read_text(encoding='ascii')):
  if not re.match(r'https?://',target):assert (HERE/target.split('#')[0]).resolve().exists(),target;links+=1
print(json.dumps({'result':'PACKET_HASHES_AND_LOCAL_LINKS_PASS','paths':packet['paths'],'payloadPins':len(payload),'localLinks':links,'sourceRetries':0}))
