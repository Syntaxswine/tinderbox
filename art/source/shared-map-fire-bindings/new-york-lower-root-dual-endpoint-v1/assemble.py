"""Package saved evidence and links; never repeat numerical phases."""
from pathlib import Path
import json,hashlib,re,sys,runpy
sys.dont_write_bytecode=True
HERE=Path(__file__).resolve().parent
sys.argv=[str(HERE/'verify.py')]+([] if (HERE/'checks.json').exists() else ['--write']);runpy.run_path(str(HERE/'verify.py'),run_name='__main__')
rows=[]
for p in sorted(HERE.iterdir()):
 if p.is_file() and p.name!='review-package.json':
  b=p.read_bytes();assert b'\r' not in b and (not b or b.endswith(b'\n')),p.name
  rows.append({'path':p.name,'bytes':len(b),'sha256':hashlib.sha256(b).hexdigest()})
packet={'version':1,'scope':'Same-cohort dual-endpoint source-root certificate; no native admission','paths':len(rows)+1,'payloadPins':len(rows),'files':rows,'nativeRecords':'UNBOUND','nativeCells':'UNBOUND','retainedHelpers':0}
(HERE/'review-package.json').write_bytes((json.dumps(packet,separators=(',',':'))+'\n').encode())
for p in rows:assert hashlib.sha256((HERE/p['path']).read_bytes()).hexdigest()==p['sha256']
links=0
for n in ['README.md','authority.md']:
 for target in re.findall(r'\]\(([^)]+)\)',(HERE/n).read_text(encoding='ascii')):
  if not re.match(r'https?://',target):assert (HERE/target.split('#')[0]).resolve().exists(),target;links+=1
print(json.dumps({'result':'PACKET_HASHES_AND_LOCAL_LINKS_PASS','paths':len(rows)+1,'payloadPins':len(rows),'localLinks':links,'numericalReruns':0}))
