"""Hydrate immutable raw cache/metadata only. No contact, decoder or blueprint execution."""
from common import *

def hydrate(deadline=None):
    pins = read(HERE / 'input-pins.json')
    CACHE.mkdir(exist_ok=True)
    (CACHE / 'objects').mkdir(exist_ok=True)
    for pin in pins['sourcePins']:
        data = git_bytes(pin['commit'], pin['path'], deadline)
        assert sha(data) == pin['sha256'] and len(data) == pin['bytes']
        target = HERE / pin['cache']
        if target.exists():
            assert target.read_bytes() == data
        else:
            target.write_bytes(data)
    proposal_pin = next(p for p in pins['sourcePins'] if p['path'].endswith('/other-contact-source-v2/contacts-proposal.json'))
    prior_input_pin = next(p for p in pins['sourcePins'] if p['path'].endswith('/other-contact-source-v2/input-pins.json'))
    proposal = cached(proposal_pin)
    core_pin = next(p for p in pins['sourcePins'] if p['path'] == 'src/simulation/original-support-ports.js')
    core = (HERE / core_pin['cache']).read_bytes()
    text = core.decode().replace('\r\n', '\n')
    declaration = next(line for line in text.splitlines() if line.startswith('const vector='))
    function = text[text.index('export function originalMaterialComponents('):text.index('\nexport function createOriginalSupportPorts(')]
    component = {'commit': CORE, 'path': core_pin['path'], 'coreRawSha256': sha(core),
        'declaration': declaration, 'declarationSha256': sha(declaration.encode()),
        'function': function, 'functionSha256': sha(function.encode())}
    assert component['functionSha256'] == pins['componentFunctionSha256']
    write(CACHE / 'component-function.json', component)
    candidates = [r for r in proposal['regions'] if r['status'] == 'unproved' and r['unprovedCode'] == 'original-component-unresolved']
    first = next(r for r in candidates if r['id'] == '5b1da7c755e4d73f34574c7e')
    ordered = [first] + [r for r in candidates if r['id'] != first['id']]
    owners = {r[k] for r in candidates for k in ['parent', 'child']}
    needed = {proposal['instances'][i]['geometry'] for i in owners}
    assert len(candidates) == 419 and len(needed) == 12
    source_by = {(p['commit'], p['path']): p for p in pins['sourcePins']}
    geometries = []
    for i, geometry in enumerate(proposal['geometries']):
        item = dict(geometry)
        item['cache'] = source_by[(geometry['commit'], geometry['path'])]['cache'] if i in needed else None
        geometries.append(item)
    blocked = sorted(i for i in owners if proposal['instances'][i].get('sourceGeometryProof', {}).get('failure'))
    pages = [{'page': 0, 'kind': 'original-baluster-only', 'regionIds': [first['id']]}]
    for start in range(1, len(ordered), 256):
        pages.append({'page': len(pages), 'kind': 'remaining-previously-blocked', 'regionIds': [r['id'] for r in ordered[start:start+256]]})
    normal = next(line for line in text.splitlines() if line.startswith('const normal='))
    contact = next(p for p in pins['sourcePins'] if p['path'].endswith('cornice-wall-contact-proposal-v1/predicate-context.json'))
    plan = {'version': 3, 'geometries': geometries, 'instances': proposal['instances'], 'relationships': proposal['relationships'],
        'regions': proposal['regions'], 'pages': pages, 'candidateRegionIds': [r['id'] for r in ordered],
        'blockedInstanceIds': blocked, 'baseProposal': proposal_pin, 'baseInputPins': prior_input_pin,
        'contact': contact, 'component': {'cache': '.cache/component-function.json', 'sha256': sha((CACHE/'component-function.json').read_bytes())},
        'normalDeclaration': normal, 'normalDeclarationSha256': sha(normal.encode()),
        'componentFunctionSha256': component['functionSha256'], 'scopeInventory': proposal['scopeInventory'], 'baseSummary': proposal['summary']}
    data = (canonical(plan) + '\n').encode()
    assert sha(data) == pins['planSha256'], 'Hydrated plan must exactly match the initial preparation'
    (CACHE / 'plan.json').write_bytes(data)
    return pins
