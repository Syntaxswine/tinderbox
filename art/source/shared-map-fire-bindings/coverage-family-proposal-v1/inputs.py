"""Read exact source-only inputs and independently reconstruct the proposed cold graph."""
from pathlib import Path
import collections,hashlib,json,subprocess
HERE=Path(__file__).resolve().parent;ROOT=HERE.parents[3]
RUNTIME='2b350309d9116812a1d3988af090614bdaefbc25'
DIAGNOSTIC='docs/engineering/shared-maps/unrooted-components-v3.json';DIAG_SHA='83ac99b3895cfa2df23810d518b4669dee975c763123e597bec393b00243120c'
INDEX='assets/runtime/map-sources/new-york/index.json';INDEX_SHA='e9bee63a5a4afb0f8513d083b7e5f1ce83f25c0441ea543e14901b70e4e0cdab'
BASE='assets/art/shared-map-fire-bindings/new-york-complete-v1.json';BASE_SHA='407c0f8bd582f8d95b9ade1471cd51892ac7b9a40fd2c005696bcc5485991eba'
CONTROLS='assets/art/shared-map-support-overrides/new-york-controls-v1.json';CONTROLS_SHA='f3f28fda72742c6bc04d32f70331ab96e036662f953153952297fae9ce3bc915'
BLOCKS='assets/art/shared-map-support-additions/new-york-parapet-blocking-v1/index.json';BLOCKS_SHA='a5a34f18a4d18b5a316096edf58b941e727a7546e544636a5a29469bc5c5b1c2'
def digest(data):return hashlib.sha256(data).hexdigest()
def sha(path):return digest((ROOT/path).read_bytes())
def read(path):return json.loads((ROOT/path).read_text(encoding='utf-8'))
def git_file(path):return subprocess.check_output(['git','show',RUNTIME+':'+path],cwd=ROOT)
def reachable(links,roots):
 seen=set(roots);queue=list(seen)
 for cid in queue:
  for other in links[cid]:
   if other not in seen:seen.add(other);queue.append(other)
 return seen

def load():
 raw=git_file(DIAGNOSTIC);assert digest(raw)==DIAG_SHA;diag=json.loads(raw)
 raw=git_file(INDEX);assert digest(raw)==INDEX_SHA;index=json.loads(raw)
 assert sha(BASE)==BASE_SHA and sha(CONTROLS)==CONTROLS_SHA and sha(BLOCKS)==BLOCKS_SHA
 base=read(BASE);by={c['id']:c for c in base['carriers']};rows=index['carriers'];ids=[c[0] for c in rows];assert len(ids)==12446 and set(ids)==set(by)
 structural=set(diag['convention']['structuralRoles']);links={cid:set() for cid in ids};relations=collections.defaultdict(list);anchors=[]
 for i,c in enumerate(rows):
  child=ids[i]
  if c[16]:anchors.append(child)
  for number in c[12]:
   parent=ids[number];attachment=next((a for a in c[15] if a[0]==number),None);evidence=next((e for e in c[14] if e[0]==number),None)
   assert attachment or evidence
   kind=attachment[1] if attachment else evidence[1];direction=attachment[6] if attachment and len(attachment)>6 else None
   symmetric=direction=='symmetric-structural' if direction else c[7] in structural and rows[number][7] in structural and not any(s in kind for s in ['mount','hinge','hardware'])
   links[parent].add(child)
   if symmetric:links[child].add(parent)
   def region(raw_box,point):return {'bounds':{'min':raw_box[:3],'max':raw_box[3:]},'point':point}
   relations[child].append({'child':child,'parent':parent,'kind':kind,'direction':direction,'symmetric':symmetric,'childRegion':region(attachment[2],attachment[3]) if attachment else None,'parentRegion':region(attachment[4],attachment[5]) if attachment else None})
 for i,j in index['contacts']:links[ids[i]].add(ids[j]);links[ids[j]].add(ids[i])
 supported=reachable(links,anchors);unrooted=set(ids)-supported;declared={s.split('::',1)[1] for c in diag['components'] for s in c['members']}
 assert len(anchors)==231 and len(supported)==11408 and len(unrooted)==1038 and unrooted==declared
 source_pins=[]
 for path,expected in [(diag['producer']['path'],diag['producer']['sha256']),('src/simulation/source-support.js',diag['producer']['graphSha256']),('src/content/map-source-support-data.js',diag['producer']['classificationSha256'])]:
  data=git_file(path);source_pins.append({'path':path,'commit':RUNTIME,'committedSha256':digest(data),'diagnosticReportedSha256':expected,'exactMatch':digest(data)==expected,'lfSha256':digest(data.replace(b'\r\n',b'\n'))})
 return {'base':base,'by':by,'diagnostic':diag,'index':index,'ids':ids,'links':links,'relations':relations,'anchors':anchors,'supported':supported,'unrooted':unrooted,'sourcePins':source_pins,'blocks':read(BLOCKS),'controls':read(CONTROLS)}
if __name__=='__main__':
 a=load();print(json.dumps({'result':'PASS','scope':'Reproduction of the proposed interpretation only; no graph acceptance, source join or geometry change.','runtimeCommit':RUNTIME,'diagnosticSha256':DIAG_SHA,'compactIndexSha256':INDEX_SHA,'carriers':len(a['ids']),'rooted':len(a['supported']),'unrooted':len(a['unrooted']),'anchors':len(a['anchors']),'separate48BlocksIncludedInCurrentGraph':False,'sourcePins':a['sourcePins']},sort_keys=True))
