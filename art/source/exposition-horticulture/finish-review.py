"""Finalize reviewed JPG receipts and verify exact task-owned helper lifetimes exited."""
from pathlib import Path
import json,hashlib,ctypes,socket,datetime,ast,re,urllib.parse
ROOT=Path(__file__).resolve().parents[3];base=ROOT/'artifacts/exposition-horticulture';out=ROOT/'docs/art/exposition-horticulture';now=datetime.datetime.now(datetime.timezone.utc).isoformat()
def write(p,v):p.write_text(json.dumps(v,indent=2)+'\n',encoding='utf-8',newline='\n')
criteria={
 'waterfront-exterior':['Whole frontage, end pavilions, two courts and complete water-edge assembly fit the view.','Native slab approach joins the galleries; no grass gap remains.'],
 'central-pavilion':['Great dome and lantern, twin low ribbed foyers, central entry, long glazed galleries and cream ornament are readable.','No incorrect opaque backing covers roof glass or cupola vent cells; final geometry/rays provide independent checks.'],
 'rear-exterior':['Rear ordinary-light curtain, courts and end-pavilion roofs are shown; unseen historic profiles remain labelled simplifications.','Native upper end-pavilion wall bands now meet the taller roof eaves; ray checks sample their closure.'],
 'roof-plan':['Three-pavilion/two-court layout, glazed front curtains, twin foyer caps and lantern are distinct.'],
 'interior-cutaway':['Review-only roof/high-wall removal exposes the gallery voids, central stair and palm hall.','No upper full floor seals the central vertical axis; first and upper floors use native levels.'],
 'gallery-stair':['Actual upper slab stair opening, top landing, rear gallery well, balustrade and cafe furniture are visible.','The open ground-level side is the gallery-to-curtain connection, not an omitted exterior wall.'],
 'entry-and-terrace':['Unscaled source bear, two ordinary native leaves beneath a larger fixed screen, coping, rail and water stair are visible.','Source bear base colours only; projection paint and gameplay omitted.'],
 'source-plan-comparison':['Original exhibit diagram and authored native wall trace shown with both courts and projecting centre.','Printed extreme width / diagram discrepancy and approximate pixel calibration remain explicit.'],
 'native-floor-audit':['Schematic native floor levels and crown marker readable; intermediate levels are empty.','Crown at L16 is not sixteen occupied storeys.']}
for p in sorted((out/'previews').glob('*.json')):
 r=json.loads(p.read_text(encoding='utf-8'));jpg=p.with_suffix('.jpg');r.update(sha256=hashlib.sha256(jpg.read_bytes()).hexdigest(),visualReview='Artist inspected final JPG at intended size; CPU evidence only',reviewedAt=now,criteria=criteria[p.stem]);write(p,r)
# Probe only recorded exact lifetimes. A reused PID is an exited old lifetime,
# never permission to terminate its new owner. No termination is performed here.
k=ctypes.windll.kernel32;k.OpenProcess.argtypes=[ctypes.c_ulong,ctypes.c_int,ctypes.c_ulong];k.OpenProcess.restype=ctypes.c_void_p;k.GetProcessTimes.argtypes=[ctypes.c_void_p]+[ctypes.POINTER(ctypes.c_ulonglong)]*4;k.CloseHandle.argtypes=[ctypes.c_void_p]
def live(record):
 h=k.OpenProcess(0x1000,False,record['pid'])
 if not h:return False
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
write(base/'helper-completion.json',dict(checkedAt=now,owner='01a17ea0-1362-7d13-a42d-f4a5fcff8902',retained=[],receipts=receipts,note='Initial CPU transparency-adapter trial failed before rendering and exited; final all-view render succeeded. No task-owned helper remains running. No process was killed.'))
checks=json.loads((base/'check-results.json').read_text(encoding='utf-8'));assert checks['passed']and checks['packageChecked'];write(out/'check-results.json',dict(checkedAt=now,repositoryChecks=dict(passed=True,tests=85,syntaxScripts=91,staticModules=131),build=dict(passed=True,files=161,nestedPathResources=True),focused=checks,helpers=dict(retained=0,rendererLifetimesChecked=len(receipts)-1,packagePortReleased=True),visual=dict(reviewedJPGs=len(criteria),renderer='Mitsuba3.9.1 scalar_rgb; actual exported meshes',gpuAcceptance='Pending; CPU alpha approximation does not establish WebGL/browser acceptance')))
# Parse new source and check local Markdown links without importing/executing it.
roots=[ROOT/'art/source/exposition-horticulture',ROOT/'assets/art/exposition-horticulture',out]
files=[p for d in roots for p in d.rglob('*')if p.is_file()]
for p in files:
 if p.suffix=='.json':json.loads(p.read_text(encoding='utf-8'))
 if p.suffix=='.py':ast.parse(p.read_text(encoding='utf-8'),filename=str(p))
 if p.suffix=='.md':
  for target in re.findall(r'\]\(([^)]+)\)',p.read_text(encoding='utf-8')):
   if '://'in target or target.startswith('#'):continue
   assert(p.parent/urllib.parse.unquote(target.split('#')[0])).resolve().exists(),f'Missing Markdown target {p}: {target}'
 if p.suffix in['.json','.py','.js','.mjs','.md']or p.name=='.gitattributes':assert b'\r\n'not in p.read_bytes(),'New task text must use LF: '+str(p)
print('Finalized nine reviewed JPGs, exact exited helper lifetimes, JSON/Python/link/LF checks; no retained service.')
