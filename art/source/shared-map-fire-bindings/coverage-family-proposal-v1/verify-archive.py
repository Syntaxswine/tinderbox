"""Read-only reproduction of the exact archived, unaccepted source review."""
import sys
sys.dont_write_bytecode=True
from pathlib import Path
import argparse,hashlib,importlib.util,json,os
HERE=Path(__file__).resolve().parent;ROOT=HERE.parents[3]
EXPECTED_BEFORE_PACKAGE='a61291dc69000c7511db975c6688e02eeb39d5e2257b575bffc632c3e45bb271'
MUTATING_FLAGS=os.O_WRONLY|os.O_RDWR|os.O_CREAT|os.O_TRUNC|os.O_APPEND
def deny_writes(event,args):
 if event=='open':
  mode=args[1] or '';flags=args[2] or 0
  if any(s in mode for s in 'wax+') or flags&MUTATING_FLAGS:raise PermissionError('Read-only archive verification refuses filesystem writes')
 if event in {'os.remove','os.rename','os.mkdir','os.rmdir','os.chmod','os.chown','os.link','os.symlink','os.truncate','os.utime'}:raise PermissionError('Read-only archive verification refuses filesystem mutation')
sys.addaudithook(deny_writes)
def sha(path):return hashlib.sha256(path.read_bytes()).hexdigest()
def read(path):return json.loads(path.read_text(encoding='utf-8'))
def module(name,file):
 spec=importlib.util.spec_from_file_location(name,HERE/file);m=importlib.util.module_from_spec(spec);spec.loader.exec_module(m);return m
def inventory():
 package=read(HERE/'review-package.json')
 assert package['status']=='ARCHIVED_UNACCEPTED_UNAPPLIED_SOURCE_REVIEW'
 for row in package['files']:
  path=ROOT/row['path'];assert path.is_file() and path.stat().st_size==row['bytes'] and sha(path)==row['sha256'],'Archive file differs: '+row['path']
 before=HERE/'archive-before/review-package.json';assert sha(before)==EXPECTED_BEFORE_PACKAGE
 original=read(before);remap=package['preservedBefore']['pathRemapping']
 for row in original['files']:
  path=ROOT/remap.get(row['path'],row['path'])
  assert path.stat().st_size==row['bytes'] and sha(path)==row['sha256'],'Before-review bytes differ: '+row['path']
 pins=read(HERE/'proposal-index.json')['inputs']
 for key in ['baseBindings','tenControls','separateApprovedBlocks']:
  assert sha(ROOT/pins[key]['path'])==pins[key]['sha256'],'Original physical input differs: '+key
 assert not package['familyOverridesExported'] and not package['gapModelsExported'] and not package['implementationAuthorized']
 return {'result':'PASS','scope':'Exact archive and original reviewed bytes; no asset/runtime acceptance.','archiveFiles':len(package['files']),'preservedOriginalReviewFiles':len(original['files']),'originalPhysicalInputsUnchanged':True,'writeGuardEnabled':True}
def proposal():
 p=module('archived_family_proposal','propose.py')
 report,rows,bindings,cells,scanned,retired,residual,g,dependent_retired=p.build()
 outputs={'proposal-index.json':p.encode(report),'relationships.json':p.compact_rows({'version':1,'status':'UNACCEPTED_PROPOSAL','geometryBindingsPath':'geometry-bindings.json','relationships':rows},'relationships'),'geometry-bindings.json':p.encode({'version':1,'coordinateFrame':'emitted-world','sourceGeometryUnchanged':True,'carriers':bindings}),'cornice-coverage.json':p.compact_rows({'version':1,'meaning':'Actual occupied/source-contact evidence only, not forced breaks or stress acceptance.','cells':cells},'cells'),'family-scan.json':p.compact_rows({'version':1,'sourceOnly':True,'scanned':scanned},'scanned'),'retired-moving-frame-interpretations.json':p.encode({'version':1,'status':'PROPOSED_ONLY','originalContactGeometryRetained':True,'records':retired}),'retired-dependent-bracing-interpretations.json':p.encode({'version':1,'status':'PROPOSED_ONLY','originalContactGeometryRetained':True,'records':dependent_retired}),'remaining-explicit-findings.json':p.compact_rows({'version':1,'unapprovedGeometryApplied':False,'records':residual},'records')}
 for name,text in outputs.items():assert (HERE/name).read_bytes()==text.encode(),'Fresh proposal differs: '+name
 return {'result':'PASS','mode':'proposal','byteExactOutputs':len(outputs),'pairs':len(rows),'regions':report['proposedLocalRegions'],'writeGuardEnabled':True}
def gaps():
 m=module('archived_gap_proposal','gap-design.py');result=m.build()
 assert (HERE/'separate-parapet-gap-design.json').read_bytes()==m.encode(result).encode()
 return {'result':'PASS','mode':'gaps','byteExactOutputs':1,**result['summary'],'writeGuardEnabled':True}
def source():
 m=module('archived_source_check','check.py');result,dispositions=m.validate()
 assert (HERE/'check-results.json').read_bytes()==m.encode(result).encode()
 assert (HERE/'original-diagnostic-dispositions.json').read_bytes()==m.encode(dispositions).encode()
 return {'result':'PASS','mode':'source','byteExactOutputs':2,'independentSolidMemberships':result['independentActualSolidWindingMemberships'],'controls':len(result['controls']),'diagnosticIds':len(dispositions['records']),'writeGuardEnabled':True}
if __name__=='__main__':
 parser=argparse.ArgumentParser(description=__doc__);parser.add_argument('mode',choices=['inventory','proposal','gaps','source']);args=parser.parse_args()
 checked=inventory()
 print(json.dumps(checked if args.mode=='inventory' else globals()[args.mode](),sort_keys=True))
