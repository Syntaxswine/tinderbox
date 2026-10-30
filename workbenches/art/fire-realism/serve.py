"""Short-lived localhost-only art review server with a real five-minute deadline."""
from http.server import ThreadingHTTPServer,SimpleHTTPRequestHandler
from pathlib import Path
import os,sys,json,time,datetime,ctypes
ROOT=Path(__file__).resolve().parents[3]; OUT=ROOT/'artifacts/fire-realism/preview-server';OUT.mkdir(parents=True,exist_ok=True)
stop=OUT/'stop';stop.unlink(missing_ok=True)
class Handler(SimpleHTTPRequestHandler):
 def __init__(self,*a,**kw):super().__init__(*a,directory=str(ROOT),**kw)
 def log_message(self,*a):pass
server=ThreadingHTTPServer(('127.0.0.1',8766),Handler);server.timeout=.5
k=ctypes.windll.kernel32;k.GetCurrentProcess.restype=ctypes.c_void_p;k.GetProcessTimes.argtypes=[ctypes.c_void_p]+[ctypes.POINTER(ctypes.c_ulonglong)]*4;v=[ctypes.c_ulonglong() for _ in range(4)];k.GetProcessTimes(k.GetCurrentProcess(),*[ctypes.byref(x) for x in v])
rec=dict(owner='01a17ea0-1362-7d13-a42d-f4a5fcff8902',task='TB-034',purpose='Immediate actual WebGL art fixture review',pid=os.getpid(),creationFiletime=str(v[0].value),executable=sys.executable,startedAt=datetime.datetime.now(datetime.timezone.utc).isoformat(),expirySeconds=300,port=8766,stopMethod='Private stop file or automatic monotonic five-minute deadline',source=str(Path(__file__).resolve()))
record=OUT/f'run-{os.getpid()}.json';record.write_text(json.dumps(rec,indent=2),encoding='utf-8');print(json.dumps(rec),flush=True)
end=time.monotonic()+300
try:
 while time.monotonic()<end and not stop.exists():server.handle_request()
finally:
 server.server_close();rec['finishedAt']=datetime.datetime.now(datetime.timezone.utc).isoformat();rec['completed']=True;record.write_text(json.dumps(rec,indent=2),encoding='utf-8');print('Art preview stopped; socket closed.',flush=True)
