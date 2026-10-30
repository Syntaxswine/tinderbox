"""Finite public reference acquisition. Unverified responses stay ignored until reviewed."""
from pathlib import Path
import urllib.request,json,hashlib,datetime,time,threading,os,ctypes,concurrent.futures
ROOT=Path(__file__).resolve().parents[3];out=ROOT/'artifacts/fire-realism/research';out.mkdir(parents=True,exist_ok=True)
items=[
 ('dvids-history-motion.html','https://www.dvidshub.net/image/8746592/history-motion'),
 ('dvids-room-fire.html','https://www.dvidshub.net/image/9219073/firefighters-extinguish-fire-training-room-during-live-burn-training'),
 ('dvids-structure-film.html','https://www.dvidshub.net/video/723217/fort-benning-fire-department-conducts-training-burning-building'),
 ('dvids-rights.html','https://www.dvidshub.net/about/copyright'),
 ('loc-harbor-fire.json','https://www.loc.gov/item/2020736829/?fo=json'),
 ('nara-6349328.html','https://catalog.archives.gov/id/6349328'),
 ('nara-6349328-v2.json','https://catalog.archives.gov/api/v2/records/6349328'),
 ('nara-6349328-v1.json','https://catalog.archives.gov/api/v1/?naIds=6349328'),
 ('nara-6349328-blog.html','https://text-message.blogs.archives.gov/2025/07/29/what-could-possibly-go-wrong-searching-for-new-roles-for-submarines-at-the-dawn-of-the-cold-war/')]
started=time.time();deadline=threading.Timer(120,lambda:os._exit(124));deadline.daemon=True;deadline.start()
record=dict(owner='01a17ea0-1362-7d13-a42d-f4a5fcff8902',task='TB-034 fire realism art',purpose='Finite public reference metadata fetch',pid=os.getpid(),executable=os.sys.executable,startedAt=datetime.datetime.now(datetime.timezone.utc).isoformat(),expirySeconds=120,stopMethod='Natural exit; same-process120-second deadline',port=None)
k=ctypes.windll.kernel32;k.GetCurrentProcess.restype=ctypes.c_void_p;k.GetProcessTimes.argtypes=[ctypes.c_void_p]+[ctypes.POINTER(ctypes.c_ulonglong)]*4;v=[ctypes.c_ulonglong() for _ in range(4)]
if k.GetProcessTimes(k.GetCurrentProcess(),*[ctypes.byref(x) for x in v]):record['creationFiletime']=str(v[0].value)
run=out/('acquire-run-'+str(os.getpid())+'.json');run.write_text(json.dumps(record,indent=2)+'\n',encoding='utf-8')
def fetch(item):
 name,url=item;p=out/name
 try:
  if not p.exists():
   request=urllib.request.Request(url,headers={'User-Agent':'Tinderbox public-domain visual reference research'})
   with urllib.request.urlopen(request,timeout=18) as response:data=response.read(32*1024*1024);content=response.headers.get('Content-Type','');status=response.status
   p.write_bytes(data)
  else:data=p.read_bytes();content='cached';status=200
  return dict(path=p.relative_to(ROOT).as_posix(),url=url,bytes=len(data),sha256=hashlib.sha256(data).hexdigest(),contentType=content,status=status)
 except Exception as e:return dict(url=url,error=str(e))
try:
 with concurrent.futures.ThreadPoolExecutor(max_workers=4) as pool:results=list(pool.map(fetch,items))
 (out/'acquired.json').write_text(json.dumps(results,indent=2)+'\n',encoding='utf-8',newline='\n')
 for r in results:print(r['url'],r.get('status',r.get('error')),r.get('bytes',0),flush=True)
 record['completed']=True
finally:
 deadline.cancel();record['finishedAt']=datetime.datetime.now(datetime.timezone.utc).isoformat();record['seconds']=round(time.time()-started,3);run.write_text(json.dumps(record,indent=2)+'\n',encoding='utf-8',newline='\n')
