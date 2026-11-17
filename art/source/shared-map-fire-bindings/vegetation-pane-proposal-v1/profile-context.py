"""Exact compiler-context admission for the current source-proposal verifier."""
from pathlib import Path
import hashlib,json,re,subprocess
HERE=Path(__file__).resolve().parent;ROOT=HERE.parents[3]
BASE='c50f590c6d62676cabbca87c24a13e8fee16849e'
PATH='workbenches/furnished-house/scene.js'
ALLOWED=(
 ('e3b301860fad13855c7d2a8926f81bb1c4aed6be','5629ace39f09b407b6c2ef0567ea5b4cfba2e90916f4820dd65d821bf07ab859'),
 ('1a88cf4748bf62c1456285ff43412c929d311199','5f763d6e9a28174f64d908e4ffca8284beca24ecfaf8afff671870a448473f36'),
 ('c66e659451284309e48dc420791369dd5af37e1e','8acefb0429d03033ecb81d8fa76fc3d56d6bba3ef910dbe104aa75ed5411d21b'),
)
VALUES={'frame':{'threshold':1.3,'delay':3.,'seconds':180.,'energy':2250.},'cloth':{'threshold':.8,'delay':.5,'seconds':20.,'energy':600.}}
_cache=None
def sha(raw):return hashlib.sha256(raw).hexdigest()
def load(path):return json.loads(path.read_text(encoding='utf-8'))
def git(path,commit):return subprocess.check_output(['git','show',commit+':'+path],cwd=ROOT)
def normalize(raw):
 raw=raw.replace(b'\r\n',b'\n');assert b'\r' not in raw,'Only CRLF-to-LF normalization is approved'
 return raw
def profile_blocks(raw):
 source=normalize(raw)
 table=re.findall(rb'export const DEFAULT_PROFILES=Object\.freeze\(\{\n(.*?)\n\}\);',source,re.S)
 assert len(table)==1,'Required DEFAULT_PROFILES table is not unique'
 blocks={};values={}
 for name in ('frame','cloth'):
  lines=re.findall(rb'(?m)^  '+name.encode()+rb':\{([^}\n]+)\},$',table[0]);assert len(lines)==1
  fields={}
  for field in lines[0].split(b','):
   match=re.fullmatch(rb'([A-Za-z]\w*):([+-]?(?:\d+(?:\.\d*)?|\.\d+))',field);assert match,'Unparsed required profile field'
   key=match[1].decode();assert key not in fields;fields[key]=float(match[2])
  values[name]=fields;blocks[name]='  '+name+':{'+lines[0].decode('ascii')+'},\n'
 assert values==VALUES,'Required frame/cloth values differ from the unchanged controls'
 return blocks,values
def policy():
 global _cache
 if _cache is not None:return _cache
 data=load(HERE/'compiler-contexts.json')
 assert data['sourcePath']==PATH
 assert tuple((r['sourceCommit'],r['lfSha256']) for r in data['allowedContexts'])==ALLOWED
 assert data['requiredValues']==VALUES
 blobs={}
 for row in data['allowedContexts']:
  raw=git(PATH,row['sourceCommit']);text=normalize(raw)
  assert sha(text)==row['lfSha256'] and len(text)==row['lfBytes'],'Committed whole-source LF pin differs'
  blob=hashlib.sha1(b'blob '+str(len(raw)).encode()+b'\0'+raw).hexdigest();assert blob==row['gitBlobSha1']
  blocks,values=profile_blocks(text)
  assert blocks==data['requiredProfileBlocksLF'],'Required profile blocks are not byte-identical'
  assert {k:sha(v.encode()) for k,v in blocks.items()}==data['requiredProfileBlockSha256']
  blobs[row['sourceCommit']]=text
 _cache=(data,blobs);return _cache
def admit(raw):
 data,blobs=policy();text=normalize(raw);digest=sha(text)
 matches=[r for r in data['allowedContexts'] if r['lfSha256']==digest and r['lfBytes']==len(text)]
 assert len(matches)==1,'Unapproved whole compiler source; unchanged profile blocks alone do not admit it'
 selected=matches[0]
 assert text==blobs[selected['sourceCommit']],'LF whole-source bytes do not match the pinned context'
 blocks,values=profile_blocks(text)
 assert blocks==data['requiredProfileBlocksLF'] and values==data['requiredValues']
 return {'contextId':selected['id'],'sourceCommit':selected['sourceCommit'],'sourcePath':PATH,'wholeSourceLFSha256':digest,'requiredProfileBlocksEqual':True,'requiredProfileValuesEqual':True,'verificationStatus':selected['verificationStatus'],'runtimeAcceptanceGrantedByThisCheck':False}
def verify_working_scene():return admit((ROOT/PATH).read_bytes())
def preserve_checkpoint():
 old=load_bytes(git((HERE/'review-package.json').relative_to(ROOT).as_posix(),BASE));count=0
 allowed_changes={str((HERE/'review.py').relative_to(ROOT)).replace('\\','/'),'docs/art/shared-map-fire-bindings/vegetation-pane-proposal-v1.md'}
 for row in old['files']:
  if row['path'] in allowed_changes:continue
  raw=(ROOT/row['path']).read_bytes()
  assert len(raw)==row['bytes'] and sha(raw)==row['sha256'],'Original source-proposal evidence changed: '+row['path'];count+=1
 assert count==34
 return count
def load_bytes(raw):return json.loads(raw.decode('utf-8'))
def audit():
 data,blobs=policy();controls=[]
 for row in data['allowedContexts']:
  text=blobs[row['sourceCommit']]
  for ending,raw in (('LF',text),('CRLF',text.replace(b'\n',b'\r\n'))):
   matched=admit(raw);assert matched['sourceCommit']==row['sourceCommit']
   controls.append({'control':row['id']+' / '+ending,'result':'ADMIT_EXACT_PIN','sourceCommit':matched['sourceCommit']})
 source=blobs[ALLOWED[1][0]]
 mutated=source+b'// Unapproved compiler text with the same profile blocks.\n'
 assert profile_blocks(mutated)==profile_blocks(source)
 for name,fn in (
  ('unapproved compiler change with unchanged required blocks',lambda:admit(mutated)),
  ('unapproved required profile change in whole source',lambda:admit(source.replace(b'frame:{threshold:1.3',b'frame:{threshold:1.4',1))),
  ('required profile value/block predicate rejects drift',lambda:profile_blocks(source.replace(b'frame:{threshold:1.3',b'frame:{threshold:1.4',1))),
 ):
  rejected=False
  try:fn()
  except AssertionError:rejected=True
  assert rejected,'Compiler-context negative control unexpectedly accepted: '+name
  controls.append({'control':name,'result':'REJECT'})
 return {'version':1,'result':'PASS_EXACT_COMPILER_CONTEXT_CONTROLS','sourcePath':PATH,'allowedContexts':data['allowedContexts'],'requiredProfileBlockSha256':data['requiredProfileBlockSha256'],'requiredValues':data['requiredValues'],'controls':controls,'positiveControls':2*len(ALLOWED),'rejectingControls':3,'originalPayloadFilesPreserved':preserve_checkpoint(),'archivesOrOriginalCalculatorRewritten':False,'sourceGeometryRefreshed':False,'nativeWorldRendererRun':False}
