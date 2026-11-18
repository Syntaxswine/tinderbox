"""Finite hidden source-only children. Existing failed attempts are never replayed."""
from pathlib import Path
import subprocess,sys,json,hashlib,datetime,os
HERE=Path(__file__).resolve().parent;ROOT=HERE.parents[3];sha=lambda b:hashlib.sha256(b).hexdigest()
def dump(p,x):p.write_text(json.dumps(x,indent=2)+'\n',encoding='utf-8')
def run(label,args,result=None,folder=None):
 runs=folder or HERE/'runs';runs.mkdir(parents=True,exist_ok=True);record=runs/(label+'.json');log=runs/(label+'.log')
 assert not record.exists() and not log.exists(),'Attempt already exists; stop and preserve it'
 for p in runs.glob('*.json'):
  r=json.loads(p.read_bytes());assert r.get('exitCode')==0,'An earlier failed/incomplete child must be reviewed before any continuation: '+p.name
 row={'owner':'Set up Tinderbox UI worktree','project':'Tinderbox','purpose':'Offline non-cornice source normalization '+label,'executable':args[0],'arguments':args[1:],'cwd':str(ROOT),'startedAt':datetime.datetime.now(datetime.timezone.utc).isoformat(),'timeoutSeconds':60,'maximumRegions':8 if label.startswith(('page','verify')) else 0,'background':False,'ports':[],'endCondition':'Finite child exits; parent waits and enforces deadline.','sourcePins':{n:sha((HERE/n).read_bytes()) for n in ['prepare.py','page.mjs','finalize.py','check.py'] if (HERE/n).exists()}}
 flags=getattr(subprocess,'CREATE_NO_WINDOW',0);p=subprocess.Popen(args,cwd=ROOT,stdout=subprocess.PIPE,stderr=subprocess.STDOUT,creationflags=flags);row['pid']=p.pid;dump(record,row)
 try:out,_=p.communicate(timeout=60)
 except subprocess.TimeoutExpired:p.kill();out,_=p.communicate();row['timedOut']=True
 log.write_bytes(out);row.update({'endedAt':datetime.datetime.now(datetime.timezone.utc).isoformat(),'exitCode':p.returncode,'foregroundCompleted':p.poll() is not None,'logSha256':sha(out)})
 if result and result.exists():row['resultSha256']=sha(result.read_bytes())
 dump(record,row);print(json.dumps({'attempt':label,'exitCode':p.returncode,'pid':p.pid,'completed':row['foregroundCompleted']}),flush=True)
 if p.returncode or row.get('timedOut'):raise SystemExit(p.returncode or 1)
def main():
 mode=sys.argv[1]
 if mode=='prepare':run('prepare',[sys.executable,'-B',str(HERE/'prepare.py')]);return
 if mode in ['cache','check']:
  name=mode+'-'+datetime.datetime.now(datetime.timezone.utc).strftime('%Y%m%dT%H%M%S%f');run(name,[sys.executable,'-B',str(HERE/('prepare.py' if mode=='cache' else 'check.py'))],folder=HERE/'.cache/check-runs');return
 if mode=='finalize':run('assemble',[sys.executable,'-B',str(HERE/'finalize.py'),'--record']);return
 if mode=='audit':run('audit',[sys.executable,'-B',str(HERE/'check.py')]);return
 if mode in ['page','verify']:
  pins=json.loads((HERE/'input-pins.json').read_bytes());start=int(sys.argv[2]);end=int(sys.argv[3]) if len(sys.argv)>3 else start+1;assert 0<=start<end<=pins['pageCount']
  for n in range(start,end):
   folder=HERE/('pages' if mode=='page' else 'checks');folder.mkdir(exist_ok=True);result=folder/('page-%03d.json'%n);assert not result.exists()
   run(mode+'-%03d'%n,[r'C:\Program Files\nodejs\node.exe','--max-old-space-size=384',str(HERE/'page.mjs'),mode,str(n)],result)
  return
 raise SystemExit('Use prepare, page START [END], or verify START [END]')
if __name__=='__main__':main()
