from pathlib import Path
import urllib.request,json,re,hashlib,concurrent.futures,threading,os,datetime,time,ctypes
ROOT=Path(__file__).resolve().parents[3]; OUT=ROOT/'artifacts/fire-realism/research'; OUT.mkdir(parents=True,exist_ok=True)
items=[('dvids-8746604.html','https://www.dvidshub.net/image/8746604/history-motion'),('dvids-8746602.html','https://www.dvidshub.net/image/8746602/history-motion'),('dvids-8746591.html','https://www.dvidshub.net/image/8746591/history-motion'),('dvids-8746603.html','https://www.dvidshub.net/image/8746603/history-motion'),('dvids-8746601.html','https://www.dvidshub.net/image/8746601/history-motion'),('loc-gotfryd-rights.html','https://www.loc.gov/rr/print/res/592_gotf.html'),('nara-6349328-original.jpeg','https://catalog.archives.gov/medialz/stillpix/330-cfd/DN-SC-82-03009.jpeg'),('dvids-room-fire-2000w.jpg','https://d1ldvf68ux039x.cloudfront.net/thumbs/photos/2507/9219073/2000w_q95.jpg')]
items += [('dvids-8746603-color.jpg','https://d1ldvf68ux039x.cloudfront.net/thumbs/photos/2411/8746603/1000w_q95.jpg'),('dvids-8746601-color.jpg','https://d1ldvf68ux039x.cloudfront.net/thumbs/photos/2411/8746601/1000w_q95.jpg'),('dvids-723217-training.mp4','https://d34w7g4gy10iej.cloudfront.net/video/1911/DOD_107455303/DOD_107455303-1024x576-1769k.mp4')]
started=time.time();deadline=threading.Timer(120,lambda:os._exit(124));deadline.daemon=True;deadline.start()
k=ctypes.windll.kernel32;k.GetCurrentProcess.restype=ctypes.c_void_p;k.GetProcessTimes.argtypes=[ctypes.c_void_p]+[ctypes.POINTER(ctypes.c_ulonglong)]*4;v=[ctypes.c_ulonglong() for _ in range(4)];k.GetProcessTimes(k.GetCurrentProcess(),*[ctypes.byref(x) for x in v])
rec=dict(owner='01a17ea0-1362-7d13-a42d-f4a5fcff8902',task='TB-034',purpose='Finite original fire reference acquisition',pid=os.getpid(),creationFiletime=str(v[0].value),executable=os.sys.executable,startedAt=datetime.datetime.now(datetime.timezone.utc).isoformat(),expirySeconds=120,stopMethod='Natural exit or same-process deadline',port=None)
run=OUT/f'acquire-run-{os.getpid()}.json';run.write_text(json.dumps(rec,indent=2),encoding='utf-8')
def fetch(item):
 name,url=item;p=OUT/name
 try:
  if not p.exists():
   with urllib.request.urlopen(urllib.request.Request(url,headers={'User-Agent':'Tinderbox visual reference research'}),timeout=30) as r:data=r.read(64*1024*1024)
   p.write_bytes(data)
  else:data=p.read_bytes()
  return dict(name=name,url=url,bytes=len(data),sha256=hashlib.sha256(data).hexdigest())
 except Exception as e:return dict(name=name,url=url,error=str(e))
try:
 with concurrent.futures.ThreadPoolExecutor(max_workers=4) as pool:results=list(pool.map(fetch,items))
 (OUT/'acquired-2.json').write_text(json.dumps(results,indent=2),encoding='utf-8')
 for x in results:print(x,flush=True)
 rec['completed']=True
finally:
 deadline.cancel();rec['finishedAt']=datetime.datetime.now(datetime.timezone.utc).isoformat();rec['seconds']=round(time.time()-started,2);run.write_text(json.dumps(rec,indent=2),encoding='utf-8')
