"""Full default package checks against four frozen helper source contexts; no native JS."""
from pathlib import Path
import argparse,contextlib,copy,importlib.util,io,json,sys
sys.dont_write_bytecode=True
HERE=Path(__file__).resolve().parent;ART=HERE.parent;ROOT=ART.parents[3]
def run():
 spec=importlib.util.spec_from_file_location('parapet_corrected_default_review',ART/'review.py');review=importlib.util.module_from_spec(spec);spec.loader.exec_module(review)
 policy,blobs=review.D.policy();rows=[];original=review.D.working_sources;argv=sys.argv
 try:
  for identity in ['original-producer','approved-combined-m29']:
   for ending in ['LF','CRLF']:
    sources={p:b if ending=='LF' else b.replace(b'\n',b'\r\n') for p,b in blobs[identity].items()}
    review.D.working_sources=lambda root=ROOT,sources=sources:copy.deepcopy(sources)
    output=io.StringIO();sys.argv=['review.py']
    with contextlib.redirect_stdout(output):review.main()
    lines=output.getvalue().splitlines();reported=json.loads(lines[-2])
    assert reported['currentVerificationContext']['id']==identity and reported['historicalProducerDependencyPinsPreserved']
    rows.append({'context':identity,'lineEndings':ending,'defaultPackageVerifier':'PASS','historicalProducerDependencyPinsPreserved':True,'verificationContext':reported['currentVerificationContext']})
 finally:review.D.working_sources=original;sys.argv=argv
 return {'version':1,'result':'PASS_FULL_DEFAULT_PACKAGE_IN_BOTH_FROZEN_CONTEXTS','method':'Run the unmodified corrected default main in-process, substituting only the two working helper byte reads with exact frozen Git sources. The preserved original-failure record separately byte-matches approved Git sources to actual root read-only files. No checkout mutation or JavaScript execution.',
  'originalProducerCommit':review.D.ORIGINAL,'approvedVerificationCommit':review.D.APPROVED,'positiveDefaultVerifierRuns':4,'controls':rows,'originalPayloadsPreserved':review.D.preserve_checkpoint(),'nativeGeometryRendererOrWorldRun':False,'runtimeAcceptanceGranted':False}
if __name__=='__main__':
 p=argparse.ArgumentParser(description=__doc__);p.add_argument('--record',action='store_true');args=p.parse_args();report=run();raw=(json.dumps(report,indent=2,sort_keys=True)+'\n').encode();path=HERE/'package-context-verification.json'
 if args.record:path.write_bytes(raw)
 else:assert path.read_bytes()==raw,'Default context evidence changed'
 print(json.dumps({k:report[k] for k in ['result','positiveDefaultVerifierRuns','originalPayloadsPreserved','nativeGeometryRendererOrWorldRun','runtimeAcceptanceGranted']}))
