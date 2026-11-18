"""One bounded remaining-family source page; authored points then the accepted construction."""
import argparse,collections,json,shutil,sys,time
from fractions import Fraction as F
from pathlib import Path
import source as S
sys.dont_write_bytecode=True
HERE=S.HERE;ROOT=S.ROOT

def within(point,box):return all(F(box['min'][a])<=F(point[a])<=F(box['max'][a]) for a in range(3))

def main():
    started=time.perf_counter();cpu=time.process_time()
    ap=argparse.ArgumentParser();ap.add_argument('--mode',choices=['calculate','verify'],required=True)
    ap.add_argument('--page',required=True);ap.add_argument('--output',required=True);ap.add_argument('--dictionary-sha',required=True)
    ap.add_argument('--inventory-sha',required=True);ap.add_argument('--saved-page');ap.add_argument('--journal',required=True);args=ap.parse_args()
    out=Path(args.output);out.mkdir(parents=True,exist_ok=True)
    b=(HERE/'dictionary.json').read_bytes();assert S.sha(b)==args.dictionary_sha;data=json.loads(b)
    b=(HERE/'inventory.json').read_bytes();assert S.sha(b)==args.inventory_sha;inventory=json.loads(b)
    plan=next(p for p in inventory['pages'] if p['id']==args.page);assert 0<plan['regions']<=64
    G=S.module('remaining_original_triangles','art/source/shared-map-fire-bindings/export.py')
    H=S.module('remaining_exact_face','art/source/shared-map-fire-bindings/cornice-wall-contact-proposal-v1/check.py')
    R=S.module('remaining_exact_membership','art/source/shared-map-fire-bindings/cornice-front-contact-repeat-v1/check.py')
    buffers={};triangles={};node_parts=[]
    for number in plan['partIds']:
        p=data['parts'][number];definition=data['geometries'][p['geometry']]
        if definition['sha256'] not in buffers:
            b=(ROOT/definition['path']).read_bytes();assert S.sha(b)==definition['sha256']
            buffers[definition['sha256']]=json.loads(b)
        ts=G.triangles(buffers[definition['sha256']],p['matrix'],p['sourceRange'])
        assert len(ts)==p['triangleCount'];triangles[number]=ts
        node_parts.append({**p,'triangles':ts})
    saved=json.loads(Path(args.saved_page).read_bytes()) if args.mode=='verify' else None
    saved_by_id={r['id']:r for r in saved['regions']} if saved else {}
    records=[];node_regions=[];partial=out/'partial-source-results.jsonl'
    for region_index in plan['regionIndices']:
        if time.perf_counter()-started>24:raise TimeoutError('Source page deadline guard; preserve partial page, no retry')
        old=data['regions'][region_index];pair=[old['parent'],old['child']];ts=[triangles[n] for n in pair]
        boxes=[old['selector'],*old['endpointBounds']]
        attempts=[];contact=None;reason='BOUNDED_COORDINATE_METHOD_UNPROVED'
        def attempt(candidate):
            test={k:v for k,v in candidate.items() if k not in ['sourceFace','faceHints']}
            points=candidate['points']
            if not all(within(points[i],old['selector']) and within(points[i],old['endpointBounds'][i]) for i in range(2)):
                test['result']='REJECTED_ORIGINAL_LOCAL_BOUNDS';attempts.append(test);return None
            hits=[[j for j,t in enumerate(triangles) if R.exact_membership(t,point) is not None] for triangles,point in zip(ts,points)]
            test['primitiveCandidates']=hits
            if any(len(h)!=1 for h in hits):
                test['result']='REJECTED_MISSING_OR_AMBIGUOUS_ORIGINAL_FACE';attempts.append(test);return None
            selected=[h[0] for h in hits]
            face=candidate.get('sourceFace')
            if face is not None:
                matching=[i for i,n in enumerate(pair) if data['parts'][n]['ownerId']==face['sourceCarrierId']]
                test['authoredFaceIdMatches']=len(matching)==1 and selected[matching[0]]==face['sourceTriangle']
                if not test['authoredFaceIdMatches']:
                    test['result']='REJECTED_AUTHORED_FACE_ID';attempts.append(test);return None
            try:faces=[H.exact_face(t[j],point) for t,j,point in zip(ts,selected,points)]
            except AssertionError:
                test['result']='REJECTED_NONSTRICT_OR_NONAXIS_FACE';attempts.append(test);return None
            hints=candidate.get('faceHints')
            if hints is not None:
                expected=[]
                for key in ['parentFace','childFace']:
                    normal=[0,0,0];normal[hints['axis']]=1 if hints[key]=='max' else -1;expected.append(normal)
                if expected!=[f['unitOutwardNormalExact'] for f in faces]:
                    test['result']='REJECTED_AUTHORED_NORMAL_HINT';attempts.append(test);return None
            test['result']='EXACT_ORIGINAL_FACE_POINTS';attempts.append(test)
            return {'method':candidate['method'],'points':points,'primitives':selected,
                'normals':[f['unitOutwardNormalExact'] for f in faces],
                'exactBarycentricWeights':[[[r['numerator'],r['denominator']] for r in f['barycentricWeightsExact']] for f in faces],
                'exactPlaneResiduals':[0,0]}
        if args.mode=='verify':
            previous=saved_by_id[old['id']]
            assert previous['sourceCanonicalSha256']==old['sourceCanonicalSha256']
            attempts=previous['candidateTests'];contact=previous.get('contact');reason=previous.get('reason',reason)
            for test in attempts:
                if 'primitiveCandidates' in test:
                    hits=[[j for j,t in enumerate(tlist) if R.exact_membership(t,point) is not None] for tlist,point in zip(ts,test['points'])]
                    assert hits==test['primitiveCandidates']
            if contact:
                assert all(within(contact['points'][i],old['selector']) and within(contact['points'][i],old['endpointBounds'][i]) for i in range(2))
                faces=[H.exact_face(t[j],point) for t,j,point in zip(ts,contact['primitives'],contact['points'])]
                assert contact['normals']==[f['unitOutwardNormalExact'] for f in faces]
                assert contact['exactBarycentricWeights']==[[[r['numerator'],r['denominator']] for r in f['barycentricWeightsExact']] for f in faces]
        else:
            for candidate in old['authoredCandidates']:
                contact=attempt(candidate)
                if contact:break
            if contact is None and old['historicalKind']=='bearing-face':
                reason='AUTHORED_BEARING_WITNESS_UNPROVED_BY_EXISTING_EXACT_METHOD'
            if contact is None and old['historicalKind']=='fixed-embed':
                planes={}
                for t in ts[0]:
                    n=R.axis_normal(t)
                    if n is not None and n[1]==0:
                        axis=next(i for i,v in enumerate(n) if v);planes.setdefault(axis,set()).add(F(t[0][axis]))
                spans=[(max(v)-min(v),a) for a,v in planes.items() if len(v)>=2]
                top={F(t[0][1]) for t in ts[1] if R.axis_normal(t)==[0,1,0]}
                if not spans or len(top)!=1:reason='PRIMARY_VERTICAL_FACE_OR_TOP_PLANE_NOT_UNIQUE'
                else:
                    _,axis=min(spans);free=next(a for a in [0,2] if a!=axis)
                    admitted=[v for v in sorted(planes[axis]) if all(F(b['min'][axis])<=v<=F(b['max'][axis]) for b in boxes)]
                    lo=max(F(b['min'][free]) for b in boxes);hi=min(F(b['max'][free]) for b in boxes)
                    if len(admitted)!=1 or hi<=lo:reason='PRIMARY_FACE_OR_FREE_INTERVAL_NOT_UNIQUE'
                    else:
                        free_values=[('selector-midpoint',(lo+hi)/2)];historical=F(old['historicalWitness'][free])
                        if lo<=historical<=hi and historical!=free_values[0][1]:free_values.append(('original-witness-free-coordinate',historical))
                        for method,value in free_values:
                            point=[0.,float(next(iter(top))),0.];point[axis]=float(admitted[0]);point[free]=float(value)
                            if F(point[free])!=value:
                                attempts.append({'method':method,'points':[point,point],'result':'REJECTED_NONREPRESENTABLE_FREE_COORDINATE'});continue
                            contact=attempt({'method':method,'points':[point,point]})
                            if contact:break
        record={'id':old['id'],'regionIndex':region_index,'sourcePointer':old['sourcePointer'],
            'sourceCanonicalSha256':old['sourceCanonicalSha256'],'certificateCanonicalSha256':old['certificateCanonicalSha256'],
            'parent':old['parent'],'child':old['child'],'historicalKind':old['historicalKind'],
            'historicalGeometricBearing':old['historicalGeometricBearing'],'candidateTests':attempts}
        if contact:record['contact']=contact
        else:record['reason']=reason
        records.append(record)
        node_regions.append({**old,'contact':contact,'reason':reason})
        with partial.open('a',encoding='ascii',newline='\n') as f:f.write(S.compact(record)+'\n');f.flush()
    elapsed=time.perf_counter()-started;assert elapsed<25
    payload={'root':str(ROOT),'parts':node_parts,'geometries':data['geometries'],'regions':node_regions}
    node_out,node_err,node_receipt=S.L.run_owned([shutil.which('node'),str(HERE/'check-page.mjs')],ROOT,
        'remaining cornice source page '+plan['id']+' '+args.mode,plan['regions'],min(25,55-elapsed),
        input_bytes=json.dumps(payload).encode(),journal_path=args.journal)
    S.dump(out/'node-process-receipt.json',node_receipt)
    if node_err:(out/'node-stderr.txt').write_bytes(node_err)
    (out/'node-stdout.json').write_bytes(node_out)
    assert node_receipt['exitCode']==0 and not node_receipt['timedOut'],'Unexpected predicate page failure; preserve partial output, no retry'
    native=json.loads(node_out);assert len(native['regions'])==len(records)
    for record,result in zip(records,native['regions']):
        assert record['id']==result['id'];record['status']=result['status']
        if result['status']=='SOURCE_CONTACT_PROPOSED':
            record['contact']['components']=result['components'];record['checks']=result['checks'];record.pop('reason',None)
        else:
            record['reason']=result['reason'];record['stage']=result.get('stage','exact-source-points')
            if result.get('detail'):record['detail']=result['detail']
    page={'version':1,'pageId':plan['id'],'childOwnerId':plan['childOwnerId'],'runtimeConsumable':False,
        'dictionarySha256':args.dictionary_sha,'inventorySha256':args.inventory_sha,'regions':records,
        'nativeLineage':'UNBOUND','originalCertificatesUnchanged':True}
    summary={**native['summary'],'candidateNegativeTests':sum(t['result']!='EXACT_ORIGINAL_FACE_POINTS' for r in records for t in r['candidateTests']),
        'authoredBearingRegions':sum(r['historicalKind']=='bearing-face' for r in records),
        'methods':dict(collections.Counter(r['contact']['method'] for r in records if r['status']=='SOURCE_CONTACT_PROPOSED')),
        'reasons':dict(collections.Counter(r['reason'] for r in records if r['status']=='UNPROVED'))}
    if args.mode=='verify':assert page==saved,'Saved source page differs'
    else:S.packed(out/'page.json',page)
    S.dump(out/'summary.json',summary)
    S.dump(out/'cost-and-node-receipt.json',{'pythonWorkerCpuMs':(time.process_time()-cpu)*1000,
        'pythonWorkerElapsedMs':(time.perf_counter()-started)*1000,'node':node_receipt,'nodeCost':native['cost'],
        'nodeStdoutSha256':S.sha(node_out),'nodeContext':native['context']})
    partial.unlink()
    print(json.dumps({'result':'checked','mode':args.mode,'page':plan['id'],'summary':summary},separators=(',',':')),flush=True)
if __name__=='__main__':main()
