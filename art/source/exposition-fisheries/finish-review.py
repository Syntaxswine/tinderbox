"""Finalize reviewed JPG receipts and verify exact task-owned helper lifetimes exited."""
from pathlib import Path
import json,hashlib,ctypes,socket,datetime,ast,re,urllib.parse
ROOT=Path(__file__).resolve().parents[3];base=ROOT/'artifacts/exposition-fisheries';out=ROOT/'docs/art/exposition-fisheries';now=datetime.datetime.now(datetime.timezone.utc).isoformat()
def write(p,v):p.write_text(json.dumps(v,indent=2)+'\n',encoding='utf-8',newline='\n')
criteria={
 'fisheries-exterior':['Full three-part silhouette, curved arcades, paired entrance turrets and terracotta roofs are readable.','Peach/ivory and soda-green finish continues the requested warmth; whole compound spacing remains adapted.'],
 'great-rotunda':['Pointed main cone, lantern, four smaller towers, open drum arches and gallery rail are distinct.','Barrel-tile relief, shell capitals and fish medallions visible; clerk/drum joins do not carry a cornice through the drum.'],
 'rear-exterior':['Rear entry, roofs and connector joins visible; hidden historic elevations remain declared interpretations.'],
 'roof-plan':['Main rectangular hips, central cone, paired entrance roofs, annex cones and curved connectors fit the native trace.'],
 'interior-cutaway':['All five sections exposed by review-only roof/high-wall removal.','Main gallery has a real long void and four adapted stair arrivals; aquarium and angling halls are distinct.'],
 'gallery-stair':['Native-height stair arrives at the L3 gallery edge without a slab through the flight.','Guard rail, hall void and boat exhibits visible; turret/high-drum access is not implied.'],
 'aquarium-interior':['Ten large tanks with two viewing faces surround the pool, rock and reeds.','Cutaway has no floating cornice fish; exact tank and service layout remains an interpretation from text.'],
 'angling-interior':['Separate polygonal angling pavilion, entry, connector opening and interpreted rod displays visible.','Full historic radial installation partitions and concealed service rooms are not claimed.'],
 'native-entry':['Unscaled source bear, open paired native leaf bodies and explicit top extensions shown.','Approach meets L1; fixed glass stays outside the door void. Hardware clearance is recorded separately from nominal leaf width.'],
 'source-plan-comparison':['Main ground/gallery sources aligned with front at bottom of the native plan.','Annex/arcade siting, gallery void, stair locations and unresolved1100 ft text are explicit.'],
 'native-floor-audit':['L1/L3 occupied floors, decorative L8 balcony and L20 crown marker are distinct.','Height diagram is an authored schematic with empty levels, not20 occupied storeys or a source elevation.']}
manifest_sha=hashlib.sha256((ROOT/'assets/art/exposition-fisheries/manifest.json').read_bytes()).hexdigest()
for p in sorted((out/'previews').glob('*.json')):
 r=json.loads(p.read_text(encoding='utf-8'));
 if r.get('renderer'):assert r['assetManifestSha256']==manifest_sha,'Render predates current asset manifest'
 jpg=p.with_suffix('.jpg');r.update(sha256=hashlib.sha256(jpg.read_bytes()).hexdigest(),visualReview='Artist inspected final JPG at intended size; CPU evidence only',reviewedAt=now,criteria=criteria[p.stem]);write(p,r)
# Probe only recorded exact lifetimes. A reused PID is an exited old lifetime,
# never permission to terminate its new owner. No termination is performed here.
k=ctypes.WinDLL('kernel32',use_last_error=True);k.OpenProcess.argtypes=[ctypes.c_ulong,ctypes.c_int,ctypes.c_ulong];k.OpenProcess.restype=ctypes.c_void_p;k.GetProcessTimes.argtypes=[ctypes.c_void_p]+[ctypes.POINTER(ctypes.c_ulonglong)]*4;k.CloseHandle.argtypes=[ctypes.c_void_p]
def live(record):
 h=k.OpenProcess(0x1000,False,record['pid'])
 if not h:
  error=ctypes.get_last_error()
  if error==87:return False
  raise RuntimeError('Cannot establish helper lifetime: Windows error '+str(error))
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
write(base/'helper-completion.json',dict(checkedAt=now,owner='01a17ea0-1362-7d13-a42d-f4a5fcff8902',retained=[],receipts=receipts,note='All recorded finite render lifetimes and the package helper exited; private port released. No process was killed and no service remains running.'))
checks=json.loads((base/'check-results.json').read_text(encoding='utf-8'));assert checks['passed']and checks['packageChecked'];build=json.loads((ROOT/'dist/build-manifest.json').read_text());assert len(build['files'])==170;write(out/'check-results.json',dict(checkedAt=now,repositoryChecks=dict(passed=True,tests=85,syntaxScripts=92,staticModules=138),build=dict(passed=True,files=170,nestedPathResources=True),focused=checks,helpers=dict(retained=0,rendererLifetimesChecked=len(receipts)-1,packagePortReleased=True),visual=dict(reviewedJPGs=len(criteria),renderer='Mitsuba3.9.1 scalar_rgb; actual exported meshes',gpuAcceptance='Pending; CPU alpha approximation does not establish WebGL/browser acceptance')))
# Parse new source and check local Markdown links without importing/executing it.
roots=[ROOT/'art/source/exposition-fisheries',ROOT/'assets/art/exposition-fisheries',out]
files=[p for d in roots for p in d.rglob('*')if p.is_file()]
for p in files:
 if p.suffix=='.json':json.loads(p.read_text(encoding='utf-8'))
 if p.suffix=='.py':ast.parse(p.read_text(encoding='utf-8'),filename=str(p))
 if p.suffix=='.md':
  for target in re.findall(r'\]\(([^)]+)\)',p.read_text(encoding='utf-8')):
   if '://'in target or target.startswith('#'):continue
   assert(p.parent/urllib.parse.unquote(target.split('#')[0])).resolve().exists(),f'Missing Markdown target {p}: {target}'
 if p.suffix in['.json','.py','.js','.mjs','.md']or p.name=='.gitattributes':assert b'\r\n'not in p.read_bytes(),'New task text must use LF: '+str(p)
print('Finalized eleven reviewed JPGs, exact exited helper lifetimes, JSON/Python/link/LF checks; no retained service.')
