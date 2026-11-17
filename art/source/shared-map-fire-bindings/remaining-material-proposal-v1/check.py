"""Focused, read-only verification of the two unapplied material proposals."""
from pathlib import Path
import argparse,collections,hashlib,importlib.util,json,os,re,subprocess,sys
sys.dont_write_bytecode=True
HERE=Path(__file__).resolve().parent;ROOT=HERE.parents[3]
def digest(data):return hashlib.sha256(data).hexdigest()
def read(name):return json.loads((HERE/name).read_text(encoding='utf-8'))
def git(path,commit):return subprocess.check_output(['git','show',commit+':'+path],cwd=ROOT)
def encode(value):return json.dumps(value,indent=2,sort_keys=True)+'\n'
def module():
 s=importlib.util.spec_from_file_location('remaining_material_analysis',HERE/'analyze.py');m=importlib.util.module_from_spec(s);s.loader.exec_module(m);return m
def raw_parts(place):
 folder=ROOT/'assets/art/place-scenes'/place;idx=json.loads((folder/'index.json').read_text());out=[]
 for chunk in idx['chunks']:
  for p in json.loads((folder/chunk['url']).read_text())['parts']:
   for r in p.get('sourceRanges') or [{'id':p['id']}]:out.append({'sourceId':r['id'].removeprefix('replacement/'),'originalSourceId':r['id'],'role':p.get('role'),'fromAccess':p.get('fromAccess',False),'renderId':p['id']})
 return out
def owner_groups(place,parts):
 by={p['sourceId']:p for p in parts};groups=[];used=set()
 def emit(kind,key,ids):
  assert all(cid in by and cid not in used for cid in ids)
  used.update(ids);groups.append({'placeId':place,'proposalKey':key,'kind':kind,'originalSourceIds':[by[cid]['originalSourceId'] for cid in ids],'profile':'door' if kind=='native-leaf' else 'furniture','actualContactAndClosureVerified':False,'actualQuantityAssigned':False,'accepted':False,'applied':False})
 for s in sorted(by):
  m=re.fullmatch(r'(.+)/native-leaf-(-?1)',s)
  if m:
   prefix,sign=m.groups();emit('native-leaf',prefix+'/leaf-'+sign,[s,prefix+'/leaf-extension-'+sign])
 if place=='administration':
  for s in sorted(by):
   if s.endswith('/desk'):
    root=s[:-5];emit('desk',root+'/desk-assembly',[s,root+'/desk-leg--1',root+'/desk-leg-1'])
 else:
  for s in sorted(by):
   if s.startswith('cafe/') and s.endswith('/top'):
    root=s[:-4];emit('table',root+'/table-assembly',[s,root+'/leg'])
    for dx in ['-1.1','1.1']:emit('bench',root+'/bench-'+dx,[root+'/bench-'+dx,root+'/foot-'+dx+'--0.15',root+'/foot-'+dx+'-0.15'])
 return groups
def verify():
 m=module();pins=read('input-pins.json');objects=0
 if (HERE/'review-package.json').exists():
  package=read('review-package.json')
  assert package['status']=='UNACCEPTED_UNAPPLIED_MATERIAL_SOURCE_REVIEW'
  for item in package['files']:
   raw=(ROOT/item['path']).read_bytes();assert len(raw)==item['bytes'] and digest(raw)==item['sha256'],'Review payload differs: '+item['path']
 for row in pins['files']:
  raw=git(row['path'],row['commit']);assert len(raw)==row['bytes'] and digest(raw)==row['sha256'];objects+=1
 ui=pins['acceptedUI'];assert git(ui['originalPath'],ui['commit'])==(ROOT/ui['snapshotPath']).read_bytes() and digest((ROOT/ui['snapshotPath']).read_bytes())==ui['sha256']
 for row in pins['originalFactoryPins']:assert digest(git(row['path'],row['commit']))==row['sha256']
 for row in pins['preservedNewYorkCandidates']:
  assert digest((ROOT/row['path']).read_bytes())==row['sha256'] and git(row['path'],row['commit'])==(ROOT/row['path']).read_bytes()
 # Tree entries certify exact working section descriptor bytes, without reading
 # geometry arrays or executing either original source factory.
 sections=0
 for tree in pins['compiledSceneTrees']:
  actual=subprocess.check_output(['git','rev-parse',tree['compiledInputCommit']+':'+tree['path']],cwd=ROOT,text=True).strip();assert actual==tree['gitTree']
  entries=subprocess.check_output(['git','ls-tree','-r','-z',tree['compiledInputCommit'],'--',tree['path']],cwd=ROOT).split(b'\0');blobs={}
  for entry in entries:
   if not entry:continue
   metadata,path=entry.split(b'\t',1);blobs[path.decode()]=metadata.split()[2].decode()
  place=tree['path'].rsplit('/',1)[-1]
  for row in read(place+'-section-pins.json')['sections']:
   raw=(ROOT/row['path']).read_bytes();assert digest(raw)==row['sha256'] and len(raw)==row['descriptorBytes'];assert hashlib.sha1(b'blob '+str(len(raw)).encode()+b'\0'+raw).hexdigest()==blobs[row['path']];sections+=1
 # Existing profile declaration is frozen separately from other later runtime edits.
 profile=pins['existingSharedProfiles'];raw=git(profile['path'],profile['commit']);block=re.search(rb'export const DEFAULT_PROFILES=Object.freeze\(\{(.*?)\}\);',raw,re.S).group(0);assert digest(block)==profile['declarationSha256']
 available=set(profile['ids']);assert len(available)==12
 outputs=m.build()
 for name,text in outputs.items():assert (HERE/name).read_bytes()==text.encode(),'Proposal reproduction differs: '+name
 summaries=[];all_groups=[]
 for place,expected,stateful,cut_count,glazing in [('administration',41522,4,210,52),('horticulture',63788,5,61,381)]:
  proposal=read(place+'-proposal.json');parts=raw_parts(place);rules=m.rules(place);groups=owner_groups(place,parts);all_groups.extend(groups);counts=collections.Counter()
  assert len(parts)==expected and len({p['originalSourceId'] for p in parts})==expected
  for part in parts:counts[next(r['id'] for r in rules if m.match(r['scope'],part))]+=1
  assert sum(counts.values())==proposal['logicalSourceParts']==expected and not proposal['runtimeConsumable'] and proposal['actualCarrierCount']=='not assigned' and proposal['finiteFuel']=='not assigned'
  assert not proposal['sourceGeometryChanged'] and not proposal['geometryArraysRead'] and not proposal['newCombustionProfiles'] and not proposal['supportOrAnchorAssignments'] and not proposal['familyOverridesExported']
  for f in proposal['families']:
   assert counts[f['id']]==f['logicalSourceCount'] and not f['accepted'] and not f['applied']
   assert f['existingSharedProfile'] is None or f['existingSharedProfile'] in available
   assert f['existingSharedProfile'] not in {'grass','lacquer','cloth'}
   if f['quantityRule']=='withheld':assert f['existingSharedProfile'] is None
  assert proposal['families'][-1]['logicalSourceCount']==0
  assert sum(p['stateful'] for p in proposal['nativeAccessExceptions']['portals'])==stateful
  assert len(read(place+'-cut-exceptions.json')['records'])==cut_count
  family={f['id']:f for f in proposal['families']}
  assert family['A09' if place=='administration' else 'H12']['logicalSourceCount']==glazing
  assert family['A07' if place=='administration' else 'H10']['logicalSourceCount']==stateful*4
  assert sum(g['kind']=='native-leaf' for g in groups)==stateful*2
  if place=='administration':
   assert sum(g['kind']=='desk' for g in groups)==11
   assert family['A02']['existingSharedProfile']=='partition'
   assert proposal['manifestWaterRectangle'] is None
  else:
   assert sum(g['kind']=='table' for g in groups)==8 and sum(g['kind']=='bench' for g in groups)==16
   assert family['H15']['logicalSourceCount']==412 and family['H15']['quantityRule']=='withheld'
   assert family['H17']['logicalSourceCount']==2 and family['H13']['logicalSourceCount']==453
   assert sum(p['role']=='dome-frame' for p in parts)==166 and sum(p['role']=='lantern-frame' for p in parts)==2
   assert sum(p['sourceId'].startswith('great-dome/lantern-') and p['role'] not in {'lantern-frame','lantern-glass'} for p in parts)==25
   assert sum(p['sourceId'].startswith(('front-glass-gallery-','curved-gallery-connector-')) and p['role']!='roof-glass' for p in parts)==260
   assert proposal['manifestWaterRectangle']=={'x':176,'y':10.5,'width':352,'depth':21,'height':0}
  meta=json.loads(git('assets/art/exposition-'+place+'/metadata.json',pins['runtimeSourceCommit']));assert meta['physicalMaterial']=={'structure':'unassigned','finish':'unassigned'}
  summaries.append({'placeId':place,'logicalSourceIds':expected,'renderRecords':proposal['renderRecords'],'nonemptyProposalFamilies':sum(bool(f['logicalSourceCount']) for f in proposal['families']),'proposedCompoundOwners':len(groups),'statefulPortals':stateful,'glazingSourceIds':glazing,'explicitSubstitutionExceptions':cut_count,'actualFuelAssigned':False})
 research=read('research-notes.json');assert all(r['status']=='SEARCH_LEAD_ONLY_NOT_USED_AS_VERIFIED_MATERIAL_EVIDENCE' for r in research['unverifiedLeads'])
 assert not any('New York' in f['name'] for place in ['administration','horticulture'] for f in read(place+'-proposal.json')['families'])
 ownership={'version':1,'status':'UNACCEPTED_SOURCE_GROUPING_PROPOSAL_NOT_BINDINGS','runtimeConsumable':False,'meaning':'These are candidate connected assemblies only. Actual contacts, closed union quantities, poses and approval precede a runtime account. No whole render batch or furniture row shares an account by default. Other source IDs remain per-logical-solid candidates pending physical/cosmetic ownership review.','groups':all_groups}
 result={'version':1,'result':'PASS','scope':'Source metadata, exact identity/proposal coverage and existing-profile checks only. No physical quantity, support, repair, fire, traversal, performance or visual acceptance.','inputGitObjects':objects,'originalFactoryPins':4,'acceptedUISnapshotSha256':ui['sha256'],'exactSectionDescriptors':sections,'logicalSourceIds':sum(s['logicalSourceIds'] for s in summaries),'existingSharedProfileIds':sorted(available),'newProfiles':0,'newAnchors':0,'newMaterialAssignmentsApplied':0,'geometryArraysRead':False,'originalPhysicalSourcesUnchanged':True,'newYorkArchiveAnd48KitUnchanged':True,'newYork96And20Expanded':False,'checks':summaries,'compoundOwnerProposals':len(all_groups),'proposalSha256':{p:digest((HERE/(p+'-proposal.json')).read_bytes()) for p in ['administration','horticulture']},'producerSha256':digest(Path(__file__).read_bytes()),'rendererStarted':False,'retainedHelper':False}
 return result,ownership
if __name__=='__main__':
 parser=argparse.ArgumentParser(description=__doc__);parser.add_argument('--save-review',action='store_true');args=parser.parse_args()
 if not args.save_review:
  def readonly(event,args):
   if event=='open' and (any(c in (args[1] or '') for c in 'wax+') or (args[2] or 0)&(os.O_WRONLY|os.O_RDWR|os.O_CREAT|os.O_TRUNC|os.O_APPEND)):raise PermissionError('Read-only review check refuses writes')
   if event in {'os.remove','os.rename','os.mkdir','os.rmdir','os.truncate','os.utime','os.chmod'}:raise PermissionError('Read-only review check refuses mutation')
  sys.addaudithook(readonly)
 result,ownership=verify()
 if args.save_review:
  (HERE/'check-results.json').write_text(encode(result),encoding='utf-8',newline='\n');(HERE/'compound-owner-proposals.json').write_text(encode(ownership),encoding='utf-8',newline='\n')
 else:
  assert (HERE/'check-results.json').read_bytes()==encode(result).encode()
  assert (HERE/'compound-owner-proposals.json').read_bytes()==encode(ownership).encode()
 print(json.dumps(result,sort_keys=True))
