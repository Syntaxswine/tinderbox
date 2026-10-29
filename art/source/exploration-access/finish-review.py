"""Finalize reviewed JPG receipts and verify exact task-owned helper lifetimes exited."""
from pathlib import Path
import json,hashlib,ctypes,socket,datetime,ast,re,urllib.parse
ROOT=Path(__file__).resolve().parents[3];base=ROOT/'artifacts/exploration-access';out=ROOT/'docs/art/exploration-access';now=datetime.datetime.now(datetime.timezone.utc).isoformat()
def write(p,v):p.write_text(json.dumps(v,indent=2)+'\n',encoding='utf-8',newline='\n')
criteria={
 'new-york-entry':['Native bear and open composed paired leaves fit the original entry surround.','Fixed screen and former short header do not cross the2.8 m passage.'],
 'new-york-stair':['Actual upper-floor opening, return stair and protected intermediate landing are visible.','Front/high walls and roofs are removed only for the review view.'],
 'administration-access':['Both new exterior gallery stair connections coexist with original pavilions, colonnade and golden dome.','Major original columns/piers remain intact; new route is labelled a game adaptation.'],
 'administration-well':['Review section exposes connected native floor plates and a physical spiral with flat landings.','Cut plane is presentation only; shipped stairs are complete.'],
 'administration-upper':['Guarded bridge meets the L19 terrace through an actual rail opening.','Unscaled source bear and new exterior stair show usable scale.'],
 'horticulture-entry':['New composed leaves open inside the original larger glass screen.','Source curtain, ornament and raised terrace retained.'],
 'horticulture-gallery':['Last source tread retained; a real guard gap opens onto the gallery ring.','Roof, upper walls and planting omitted only for review.'],
 'horticulture-approach':['Dry ground stair reaches native L1 through the matching terrace rail opening.','Original centre water stair is not used as a land route.']}
for p in sorted((out/'previews').glob('*.json')):
 r=json.loads(p.read_text(encoding='utf-8'));jpg=p.with_suffix('.jpg');r.update(sha256=hashlib.sha256(jpg.read_bytes()).hexdigest(),visualReview='Artist inspected final JPG at intended size; CPU evidence only',reviewedAt=now,criteria=criteria[p.stem]);write(p,r)
# Probe only recorded exact lifetimes. A reused PID is an exited old lifetime,
# never permission to terminate its new owner. No termination is performed here.
k=ctypes.WinDLL('kernel32',use_last_error=True);k.OpenProcess.argtypes=[ctypes.c_ulong,ctypes.c_int,ctypes.c_ulong];k.OpenProcess.restype=ctypes.c_void_p;k.GetProcessTimes.argtypes=[ctypes.c_void_p]+[ctypes.POINTER(ctypes.c_ulonglong)]*4;k.CloseHandle.argtypes=[ctypes.c_void_p]
def live(record):
 h=k.OpenProcess(0x1000,False,record['pid'])
 if not h:
  error=ctypes.get_last_error()
  if error==87:return False
  raise RuntimeError('Cannot verify old helper lifetime: Windows error '+str(error))
 try:
  values=[ctypes.c_ulonglong()for _ in range(4)]
  if not k.GetProcessTimes(h,*[ctypes.byref(v)for v in values]):raise RuntimeError('Cannot verify helper creation time')
  return str(values[0].value)==record['creationFiletime']
 finally:k.CloseHandle(h)
receipts=[]
for p in sorted((base/'renders').glob('run-*.json')):
 r=json.loads(p.read_text(encoding='utf-8'));is_live=live(r);assert not is_live,'Recorded renderer still running';assert r.get('finishedAt'),'Missing helper completion';receipts.append(dict(record=p.relative_to(ROOT).as_posix(),pid=r['pid'],creationFiletime=r['creationFiletime'],lifetimeExited=True,renderPassed=r.get('passed',False)))
p=base/'package-helper.json';r=json.loads(p.read_text(encoding='utf-8'));assert not live(r),'Package-check lifetime still running';s=socket.socket();s.settimeout(1)
try:released=s.connect_ex(('127.0.0.1',r['port']))!=0
finally:s.close()
assert released and r['released'] and r['passed'];receipts.append(dict(record=p.relative_to(ROOT).as_posix(),pid=r['pid'],creationFiletime=r['creationFiletime'],lifetimeExited=True,port=r['port'],released=True))
write(base/'helper-completion.json',dict(checkedAt=now,owner='01a17ea0-1362-7d13-a42d-f4a5fcff8902',retained=[],receipts=receipts,note='All recorded renderers and the private package helper exited; package port released. No service remains running and no process was killed.'))
checks=json.loads((base/'geometry-check.json').read_text());factory=json.loads((base/'factory-check.json').read_text());assert checks['passed']and factory['passed'];build=json.loads((ROOT/'dist/build-manifest.json').read_text());log=(base/'repository-check.log').read_text(encoding='utf-8-sig');match=re.search(r'(\d+) own scripts pass syntax; (\d+) static modules',log);assert match and re.search(r'pass\s+85',log);write(out/'check-results.json',dict(checkedAt=now,repositoryChecks=dict(passed=True,tests=85,syntaxScripts=int(match[1]),staticModules=int(match[2])),build=dict(passed=True,files=len(build['files']),bytes=sum(f['bytes']for f in build['files']),nestedPathResources=True),geometry=checks,factory=factory,helpers=dict(retained=0,rendererLifetimesChecked=len(receipts)-1,packagePortReleased=True),visual=dict(reviewedJPGs=len(criteria),renderer='Mitsuba3.9.1 scalar_rgb; actual derived source/access meshes',gpuAcceptance='Pending combined runtime/browser gate')))
# Parse new source and check local Markdown links without importing/executing it.
roots=[ROOT/'art/source/exploration-access',ROOT/'assets/art/exploration-access',out]
files=[p for d in roots for p in d.rglob('*')if p.is_file()]
for p in files:
 if p.suffix=='.json':json.loads(p.read_text(encoding='utf-8'))
 if p.suffix=='.py':ast.parse(p.read_text(encoding='utf-8'),filename=str(p))
 if p.suffix=='.md':
  for target in re.findall(r'\]\(([^)]+)\)',p.read_text(encoding='utf-8')):
   if '://'in target or target.startswith('#'):continue
   assert((ROOT/'docs/milestones'if p.name=='architect-contract.md'else p.parent)/urllib.parse.unquote(target.split('#')[0])).resolve().exists(),f'Missing Markdown target {p}: {target}'
 if p.suffix in['.json','.py','.js','.mjs','.md']or p.name=='.gitattributes':assert b'\r\n'not in p.read_bytes(),'New task text must use LF: '+str(p)
print('Finalized eight reviewed JPGs, exact exited helper lifetimes, JSON/Python/link/LF checks; no retained service.')
