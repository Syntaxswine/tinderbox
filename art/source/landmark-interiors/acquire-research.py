"""Finite public-source acquisition for historical interior art; originals stay ignored."""
from pathlib import Path
import urllib.request,json,hashlib,time,threading,os,sys,datetime,ctypes
root=Path(__file__).resolve().parents[3];out=root/'artifacts/landmark-interiors/raw';out.mkdir(parents=True,exist_ok=True)
items=[
 ('new-york-report.pdf','https://upload.wikimedia.org/wikipedia/commons/d/de/Report_of_the_Board_of_general_managers_of_the_exhibit_of_the_state_of_New_York%2C_at_the_World%27s_Columbian_exposition-_transmitted_to_the_Legislature_April_18%2C_1894_%28IA_reportofboardofg00newy%29.pdf'),
 ('new-york-report-metadata.json','https://archive.org/metadata/reportofboardofg00newy'),
 ('todd-camera.pdf','https://tile.loc.gov/storage-services/public/gdcmassbookdig/worldsfairthroug02todd/worldsfairthroug02todd.pdf'),
 ('columbian-album.pdf','https://tile.loc.gov/storage-services/public/gdcmassbookdig/columbianexposit00rand/columbianexposit00rand.pdf'),
 ('fish-commission-aquarium.pdf','https://spo.nmfs.noaa.gov/sites/default/files/pdf-content/fish-bull/fb13.18.pdf')]
selected=set(sys.argv[1:]);items=[v for v in items if not selected or v[0] in selected]
started=time.time();deadline=threading.Timer(120,lambda:os._exit(124));deadline.daemon=True;deadline.start()
record=dict(owner='01a17ea0-1362-7d13-a42d-f4a5fcff8902',task='Landmark interiors',purpose='Finite public historical-source download',pid=os.getpid(),executable=sys.executable,startedAt=datetime.datetime.now(datetime.timezone.utc).isoformat(),expirySeconds=120,stopMethod='Natural exit; same-process 120-second deadline',port=None)
ctypes.windll.kernel32.GetCurrentProcess.restype=ctypes.c_void_p;ctypes.windll.kernel32.GetProcessTimes.argtypes=[ctypes.c_void_p]+[ctypes.POINTER(ctypes.c_ulonglong)]*4
values=[ctypes.c_ulonglong() for _ in range(4)]
if ctypes.windll.kernel32.GetProcessTimes(ctypes.windll.kernel32.GetCurrentProcess(),*[ctypes.byref(v) for v in values]):record['creationFiletime']=str(values[0].value)
run=out.parent/('acquire-run-'+str(os.getpid())+'.json');run.write_text(json.dumps(record,indent=2)+'\n',encoding='utf-8',newline='\n')
results=[]
try:
 for name,url in items:
  file=out/name
  try:
   if not file.exists():
    request=urllib.request.Request(url,headers={'User-Agent':'Tinderbox historical asset research (public archival publications)'})
    with urllib.request.urlopen(request,timeout=25) as response:file.write_bytes(response.read())
   data=file.read_bytes()
   if name.endswith('.pdf') and not data.startswith(b'%PDF'):raise RuntimeError('Expected PDF, got another content type')
   results.append(dict(path=str(file.relative_to(root)).replace('\\','/'),url=url,bytes=len(data),sha256=hashlib.sha256(data).hexdigest()))
   print(name+' '+str(len(data))+' bytes',flush=True)
  except Exception as exc:
   results.append(dict(url=url,error=str(exc)));print(name+' FAILED '+str(exc),flush=True)
 previous=out.parent/'downloads.json';saved=json.loads(previous.read_text(encoding='utf-8')) if previous.exists() else []
 for item in results:saved=[v for v in saved if v['url']!=item['url']]+[item]
 previous.write_text(json.dumps(saved,indent=2)+'\n',encoding='utf-8',newline='\n')
 record.update(completed=True,seconds=round(time.time()-started,3))
finally:
 deadline.cancel();record['finishedAt']=datetime.datetime.now(datetime.timezone.utc).isoformat();run.write_text(json.dumps(record,indent=2)+'\n',encoding='utf-8',newline='\n')
