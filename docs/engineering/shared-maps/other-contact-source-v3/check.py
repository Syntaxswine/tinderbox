"""Metadata, pins, frame conditions and saved source proofs; no contact searching."""
import sys,time
sys.dont_write_bytecode=True
from common import *
from finalize import derive

def check(deadline=None):
    pins,plan=read(HERE/'input-pins.json'),read(CACHE/'plan.json')
    assert sha((CACHE/'plan.json').read_bytes())==pins['planSha256']
    for pin in pins['sourcePins']:
        data=git_bytes(pin['commit'],pin['path'],deadline)
        assert sha(data)==pin['sha256'] and len(data)==pin['bytes']
        assert (HERE/pin['cache']).read_bytes()==data
    assert sha((HERE/'authority.md').read_bytes())==pins['authoritySha256']
    life=pins['lifecycle'];assert sha((HERE/'lifecycle.py').read_bytes())==life['sha256']
    assert (HERE/'lifecycle.py').read_bytes()==git_bytes(life['sourceCommit'],life['sourcePath'],deadline)
    for pin in pins['architectDiagnostic']:
        assert sha((HERE/pin['path']).read_bytes())==pin['sha256'] and not pin['rerun']
    old_worker=git_bytes(BASE,'docs/engineering/shared-maps/other-contact-source-v2/page.mjs',deadline).decode().replace('\r\n','\n')
    worker=(HERE/'page.mjs').read_text();old_block=old_worker[old_worker.index('function boxes(row)'):old_worker.index('const resultFile=')];new_block=worker[worker.index('function boxes(row)'):worker.index('function eligibility(row)')]
    assert old_block==new_block
    assert sha(new_block.encode())==read(HERE/'provenance.json')['unchangedWitnessContactFunctionBlockSha256']
    result,summary=derive();assert result==read(HERE/'contacts-delta.json') and summary==read(HERE/'checks-summary.json')
    base=cached(plan['baseProposal']);base_regions={r['id']:r for r in base['regions']}
    expected={r['id'] for r in base['regions'] if r['status']=='unproved' and r['unprovedCode']=='original-component-unresolved'}
    assert {r['id'] for r in result['regions']}==expected and len(expected)==419
    assert not expected & {r['id'] for r in base['regions'] if r['status']=='source-contact-proposed'}
    assert [len(p['regionIds']) for p in plan['pages']]==[1,256,162] and plan['pages'][0]['regionIds']==['5b1da7c755e4d73f34574c7e']
    dictionaries={d['id']:read(HERE/d['path']) for d in result['dictionaries']}
    for d in result['dictionaries']:assert sha((HERE/d['path']).read_bytes())==d['sha256']==d['id']
    instances={p['id']:p for p in result['frameInstances']}
    for p in instances.values():
        prior=base['instances'][p['id']]
        assert prior['globalSourcePartIndex']==p['globalSourcePartIndex']
        old=prior['sourceGeometryProof']
        for key in ['rawOriginalTrianglesFloat64LittleEndianSha256','originalPartWorldTrianglesFloat64LittleEndianSha256','orderedWorldTrianglesFloat64LittleEndianSha256']:
            assert p[key]==old[key],(p['id'],key)
        frame=dictionaries[p['frameDictionary']]
        assert frame['volumeBearingClosedSolidClaim'] is False
        if p['admission']=='same-partition-closed-flags-only':
            assert p['id'] in plan['blockedInstanceIds'] and old['failure']['stage']=='raw-world-classification'
            raw,world=frame['raw'],frame['emittedWorld']
            partitions=lambda comps:[{'id':c['id'],'primitives':c['primitives']} for c in comps]
            assert partitions(raw['components'])==partitions(world['components'])
            assert raw['nonmaterialPrimitives']==world['nonmaterialPrimitives']
            assert any(a['closed']!=b['closed'] for a,b in zip(raw['components'],world['components']))
            assert frame['samePositivePrimitivePartitions'] and frame['sameNonmaterialOrdinals'] and frame['soleDiscrepancyClosedFlags']
            assert frame['actualEmittedWorldComponentsUsed'] and not p['failure']
    for row in result['regions']:
        old=base_regions[row['id']];ref=row['sourceRegion']
        assert ref['canonicalSha256']==sha(canonical(old).encode()) and ref['rawFileSha256']==plan['baseProposal']['sha256']
        assert row['parent']==old['parent'] and row['child']==old['child'] and row['family']==old['family'] and row['relationship']==old['relationship']
        assert old['status']=='unproved' and old['unprovedCode']==row['priorUnprovedCode']=='original-component-unresolved'
        eligibility=row['eligibility']
        assert eligibility['volumeBearingClosedSolidClaim'] is False
        if eligibility['allowed']:
            assert eligibility['positivePartitionsAndNonmaterialOrdinalsMatch'] and eligibility['soleDiscrepancyClosedFlags'] and eligibility['actualWorldComponentsUsedForSurfaceMembership']
            assert eligibility['previouslyBlockedInstances']
            assert all(instances[i]['admission']=='same-partition-closed-flags-only' for i in eligibility['previouslyBlockedInstances'])
        if row['status']=='source-contact-proposed':
            assert eligibility['allowed'] and all(row['checks']['contact'])
            assert row['contact']['normals']==row['normalMetadata']['canonicalNormals']
            assert row['normalMetadata']['normalDeclarationSha256']==plan['normalDeclarationSha256']
            assert row['normalMetadata']['historicalSourcePredicateNormals'] is not None
            for side,key in enumerate(['parent','child']):
                p=instances[row[key]];source=base['instances'][row[key]];frame=dictionaries[p['frameDictionary']]
                comp=next(c for c in frame['emittedWorld']['components'] if c['id']==row['contact']['components'][side])
                primitive=row['contact']['primitives'][side]
                assert primitive in comp['primitives'] and primitive not in frame['emittedWorld']['nonmaterialPrimitives']
                assert row['contact']['rangeLocalPrimitives'][side]==primitive-source['primitiveBase']
        else:
            assert row['status']=='unproved' and 'contact' not in row and 'checks' not in row
            if not eligibility['allowed']:assert row['unprovedCode']=='closed-flags-only-condition-not-met'
    baluster=next(p for p in instances.values() if p['globalSourcePartIndex']==2352);frame=dictionaries[baluster['frameDictionary']]
    assert baluster['rawOriginalTriangles']==200 and baluster['positiveMaterialTriangles']==180
    assert frame['raw']['components'][0]['closed'] is False and frame['emittedWorld']['components'][0]['closed'] is True
    assert frame['raw']['nonmaterialPrimitives']==[n for i in range(10) for n in [i*20,i*20+19]]
    journal=[json.loads(line) for line in (HERE/'runs/process-events.jsonl').read_text().splitlines()]
    for descriptor in plan['pages']:
        n=descriptor['page'];page_path=HERE/'pages'/('page-%03d.json'%n);page=read(page_path);proof=read(HERE/'checks'/page_path.name)
        assert proof['pageSha256']==sha(page_path.read_bytes())
        assert page['pageCheckerSha256']==proof['pageCheckerSha256']==sha((HERE/'page.mjs').read_bytes())
        assert proof['searchesPerformed']==0 and proof['positiveProofsRechecked']==sum(r['status']=='source-contact-proposed' for r in page['regions'])
        for mode in ['page','verify']:
            label=mode+'-%03d'%n;receipt=read(HERE/'runs'/(label+'.json'))
            assert receipt['exitCode']==0 and receipt['exited'] and not receipt['timedOut']
            assert receipt['ownerTask']==life['owner'] and receipt['foreground'] and receipt['hiddenOnWindows'] and not receipt['retained']
            assert receipt['regions']==len(descriptor['regionIds'])<=256 and receipt['deadlineSeconds']<=60
            assert receipt['workerSha256']==sha((HERE/'page.mjs').read_bytes()) and receipt['coordinatorSha256']==sha((HERE/'run.py').read_bytes())
            assert receipt['lifecycleSha256']==life['sha256'] and receipt['stdoutSha256']==sha((HERE/'runs'/(label+'.log')).read_bytes())
            events=[e for e in journal if e['pid']==receipt['pid'] and e['startedAt']==receipt['startedAt']]
            assert [e['event'] for e in events]==['started','exited'] and events[-1]['exited']
    batch=read(HERE/'batch.json');assert batch['completedPages']==[0,1,2] and not batch.get('failedPages') and batch['elapsedSeconds']<=600
    assert summary['combinedProposed']+summary['combinedUnproved']==1582
    assert summary['preservedPositives']==1019 and summary['preservedOtherFailures']==144
    assert summary['existingPositiveRegionsReexecuted']==summary['otherFailureRegionsReexecuted']==0
    return {'checked':True,'sourcePins':len(pins['sourcePins']),'candidateRegions':419,'newProposed':summary['newProposed'],'deltaUnproved':summary['deltaUnproved'],'combinedProposed':summary['combinedProposed'],'combinedUnproved':summary['combinedUnproved'],'firstBaluster':summary['originalBaluster'],'sourceMethodUnchanged':True,'existingPositiveRegionCalculations':0,'otherFailureRegionCalculations':0,'nativeCompilerCalls':0,'volumeBearingClosedSolidClaim':False}

if __name__=='__main__':
    assert sys.argv[1:] in [[],['--hydrate']]
    deadline=time.monotonic()+50
    if '--hydrate' in sys.argv:
        from hydrate import hydrate
        hydrate(deadline)
    print(json.dumps(check(deadline)))
