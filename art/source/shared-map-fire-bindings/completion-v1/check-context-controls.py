"""Read-only regression controls for the explicit combined ownership gate."""
from pathlib import Path
from unittest.mock import patch
import argparse, importlib.util, json, sys
sys.dont_write_bytecode=True
HERE=Path(__file__).resolve().parent
spec=importlib.util.spec_from_file_location('completion_context',HERE/'check-completion.py')
C=importlib.util.module_from_spec(spec);spec.loader.exec_module(C)

def main():
 parser=argparse.ArgumentParser(description=__doc__)
 parser.add_argument('--context-worktree',type=Path,required=True,help='Read-only checkout with the exact accepted coder/UI runtime.')
 parser.add_argument('--record',action='store_true')
 args=parser.parse_args();context=args.context_worktree.resolve();results=[]
 def reject(name,run,prefix,input_kind):
  try:run()
  except AssertionError as error:
   assert str(error).startswith(prefix),(name,str(error))
   results.append({'control':name,'result':'EXPECTED_REJECTION','reason':str(error),'input':input_kind})
  else:raise AssertionError('Invalid context accepted: '+name)
 accepted=C.context_gate(True,context)
 results.append({'control':'exact accepted combined runtime','result':'PASS','input':'actual files, Git objects and read-only producer'})
 # Exercise the ordinary default against the actual integrated runtime, even when
 # this reproducer is run from the separate artist checkout.
 with patch.object(C,'ROOT',context):
  reject('default remains art-only',lambda:C.context_gate(),'preserved:raw sources runtime and historical checkers','actual combined checkout; no file changes')
 reject('external checkout requires explicit mode',lambda:C.context_gate(False,context),'context:external checkout requires explicit combined mode','actual combined checkout; no file changes')
 original_read=Path.read_bytes
 def altered(path):
  target=(context/path).resolve()
  def read(file):
   data=original_read(file)
   return data+b'\ncorrupted control\n' if file.resolve()==target else data
  return patch.object(Path,'read_bytes',read)
 cases=[
  ('mutable declaration cannot approve code',C.DECLARATION,'context:exact accepted runtime declaration'),
  ('producer must remain reviewed',C.PRODUCER,'context:exact accepted declaration producer'),
  ('existing runtime hash corruption','src/main.js','context:declared after LF hash src/main.js'),
  ('added runtime hash corruption','src/runtime/native-query-registry.js','context:declared added LF hash src/runtime/native-query-registry.js'),
  ('declared workbench remains exact','workbenches/furnished-house/scene.js','context:declared after LF hash workbenches/furnished-house/scene.js'),
  ('frozen previous runtime declaration','docs/engineering/house-traversal/runtime-integration.json','context:frozen prior runtime declaration')
 ]
 for name,path,reason in cases:
  with altered(path):reject(name,lambda:C.context_gate(True,context),reason,'corrupted read bytes in memory; disk unchanged')
 original_unchanged=C.unchanged
 def extra_tracked(root,ref,paths):
  return False if ref==C.RUNTIME_REF and paths==['src'] else original_unchanged(root,ref,paths)
 with patch.object(C,'unchanged',extra_tracked):
  reject('undeclared tracked src change',lambda:C.context_gate(True,context),'context:entire src tree equals reviewed runtime','injected nonzero Git src-diff result; disk unchanged')
 original_git=C.git
 def extra_untracked(root,*args):
  return b'src/unreviewed-control.js\n' if args==('ls-files','--others','--exclude-standard','--','src') else original_git(root,*args)
 with patch.object(C,'git',extra_untracked):
  reject('undeclared untracked src',lambda:C.context_gate(True,context),'context:no undeclared untracked src','injected Git untracked-src listing; disk unchanged')
 def changed_raw(root,ref,paths):
  return False if root==context and ref==C.PRESERVED_REF else original_unchanged(root,ref,paths)
 with patch.object(C,'unchanged',changed_raw):
  reject('raw vendor historical gate retained',lambda:C.context_gate(True,context),'preserved:raw sources and historical checkers','injected nonzero original protected-path diff; disk unchanged')
 # Whole export identity proves geometry, every carrier/material/fuel/support
 # record and cosmetic ownership are unchanged from the completed art candidate.
 completed='82b7fc604eb183d65e7569366c47f45e5f07c1b5'
 art_paths=['assets/art/shared-map-fire-bindings','assets/art/shared-map-derived-geometry/new-york/v1','art/source/shared-map-fire-bindings/completion-v1/effective-geometry.mjs','art/source/shared-map-fire-bindings/completion-v1/export-geometry.mjs','art/source/shared-map-fire-bindings/completion-v1/export-bindings.py','art/source/shared-map-fire-bindings/completion-v1/geometry-evidence.json','art/source/shared-map-fire-bindings/completion-v1/before-additional-mounts.json']
 assert C.unchanged(C.ROOT,completed,art_paths),'Completed art payload/source changed'
 assert not C.git(C.ROOT,'ls-files','--others','--exclude-standard','--',*art_paths).strip(),'Untracked art payload/source'
 checker_path='art/source/shared-map-fire-bindings/completion-v1/check-completion.py'
 old=C.git(C.ROOT,'show',completed+':'+checker_path).decode('utf-8')
 current=(C.ROOT/checker_path).read_text(encoding='utf-8')
 def section(text,start,end):return text.split(start,1)[1].split(end,1)[0]
 # Compare exact original physical math, input/pin checks and all later physical
 # assertions. Only the ownership gate, CLI and receipt metadata may differ.
 old_inputs=section(old," base=read("," protected=")
 new_inputs=section(current," base=read("," check({r['commit']")
 assert old_inputs==new_inputs,'Original input and hash checks changed'
 physical=section(old," check({r['commit']"," result={'version':")
 assert physical==section(current," check({r['commit']"," result={'version':"),'Physical assertions changed'
 assert section(old,'def bary(p,t):','def main():')==section(current,'def bary(p,t):','def main():'),'Physical math changed'
 identity={'completedArtCommit':completed,'completedBindingsSha256':C.sha('assets/art/shared-map-fire-bindings/new-york-complete-v1.json'),'effectiveIndexSha256':C.sha('assets/art/shared-map-derived-geometry/new-york/v1/index.json'),'physicalAssertionBlockSha256':C.digest(physical.encode()),'geometryCarriersMaterialsFuelSupportUnchanged':True,'physicalMathAndAssertionsUnchanged':True}
 assert identity['completedBindingsSha256']=='407c0f8bd582f8d95b9ade1471cd51892ac7b9a40fd2c005696bcc5485991eba'
 assert identity['effectiveIndexSha256']=='f1252c7364adfeb025f573fc4650020e71915a3e17e71bcf2e725e56c3f1c941'
 results.append({'control':'complete art bytes and physical assertions unchanged','result':'PASS','input':'exact Git 82b7fc60 payload/source diff and original physical checker sections'})
 # The declared domain deliberately normalizes CRLF, but no other content.
 def crlf_read(file):
  data=original_read(file)
  return C.lf(data).replace(b'\n',b'\r\n') if file.resolve().is_relative_to(context) else data
 with patch.object(Path,'read_bytes',crlf_read):
  assert C.context_gate(True,context)==accepted
 results.append({'control':'declared LF text domain accepts CRLF','result':'PASS','input':'line-ending conversion in memory; disk unchanged'})
 report={'version':1,'result':'PASS','checkerSha256':C.digest((HERE/'check-completion.py').read_bytes()),'controlSourceSha256':C.digest(Path(__file__).read_bytes()),'acceptedContext':accepted,'completedArtIdentity':identity,'controls':results,'controlCount':len(results),'rendererStarted':False,'otherCheckoutModified':False}
 if args.record:(HERE/'context-control-results.json').write_text(json.dumps(report,indent=2,sort_keys=True)+'\n',encoding='utf-8',newline='\n')
 print(json.dumps(report,sort_keys=True))
if __name__=='__main__':main()
