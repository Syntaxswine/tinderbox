"""Read immutable metadata and raw buffers only; no source decoder/blueprint/native call."""
import copy, json, math
from common import *

def prepare(deadline=None, hydrate=False):
    assert hydrate == (HERE / 'input-pins.json').exists(), 'Fresh preparation or explicit metadata-only cache hydration required'
    CACHE.mkdir(exist_ok=True)
    (CACHE / 'objects').mkdir(exist_ok=True)
    source_pins = []
    def pin(commit, path, expected=None):
        data = git_bytes(commit, path, deadline)
        digest = sha(data)
        if expected:
            assert digest == expected, path
        target = CACHE / 'objects' / (digest + '.json')
        if target.exists():
            assert target.read_bytes() == data
        else:
            target.write_bytes(data)
        record = {'commit': commit, 'path': path, 'bytes': len(data), 'sha256': digest,
                  'cache': target.relative_to(HERE).as_posix()}
        source_pins.append(record)
        return json.loads(data), record
    old_path = 'docs/engineering/shared-maps/other-contact-source-v1/'
    old, old_pin = pin(BASE, old_path + 'contacts-proposal.json', sha((OLD / 'contacts-proposal.json').read_bytes()))
    old_inputs, old_inputs_pin = pin(BASE, old_path + 'input-pins.json')
    old_page, old_page_pin = pin(BASE, old_path + 'pages/page-000.json')
    old_check, old_check_pin = pin(BASE, old_path + 'checks/page-000.json')
    assert sha(git_bytes(BASE, old_path + 'pages/page-000.json', deadline)) == old_check['pageSha256']
    assert old['summary']['proposed'] == 7 and old['summary']['unproved'] == 1
    originals = {}
    for item in old_inputs['sourcePins']:
        if item['path'] in [g['path'] for g in old['geometries']]:
            continue
        value, record = pin(item['commit'], item['path'], item['sha256']) if item.get('cache') else (None, None)
        if record:
            originals[item['path']] = record
    # The full accepted runtime file is pinned but never imported or executed.
    core_path = 'src/simulation/original-support-ports.js'
    core = git_bytes(CORE, core_path, deadline)
    assert sha(core.replace(b'\r\n', b'\n')) == '5fd1b729132c74099cd42f9f2647c52721b44a53468bab3b69d23a5f4ba7d02d'
    prior = git_bytes('0ce79739c8b45a249395253f361964f343c2e576', core_path, deadline)
    def extract(data):
        text = data.decode('utf-8').replace('\r\n', '\n')
        declaration = next(line for line in text.splitlines() if line.startswith('const vector='))
        function = text[text.index('export function originalMaterialComponents('):text.index('\nexport function createOriginalSupportPorts(')]
        return declaration, function
    declaration, function = extract(core)
    assert extract(prior) == (declaration, function)
    component = {'commit': CORE, 'path': core_path, 'coreRawSha256': sha(core),
                 'declaration': declaration, 'declarationSha256': sha(declaration.encode()),
                 'function': function, 'functionSha256': sha(function.encode())}
    write(CACHE / 'component-function.json', component)
    component_pin = {'commit': CORE, 'path': core_path, 'bytes': len(core), 'sha256': sha(core),
                     'cache': '.cache/objects/' + sha(core) + '.json'}
    (HERE / component_pin['cache']).write_bytes(core)
    source_pins.append(component_pin)
    geometries = copy.deepcopy(old['geometries'])
    for geometry in geometries:
        raw, record = pin(geometry['commit'], geometry['path'], geometry['rawSha256'])
        attr = raw['attributes']['position']
        assert attr['itemSize'] == 3
        index = raw.get('index')
        count = len(index['array']) if isinstance(index, dict) else len(index) if index else len(attr['array']) // 3
        assert count % 3 == 0
        geometry.update({'cache': record['cache'], 'positionType': attr['type'],
                         'originalTriangles': count // 3, 'status': 'pinned-source-buffer'})
    preserved = [r for r in old['regions'] if r['status'] == 'source-contact-proposed']
    recheck = [r for r in old['regions'] if r['status'] == 'unproved']
    untouched = [r for r in old['regions'] if r['status'] == 'UNATTEMPTED']
    assert len(preserved) == 7 and len(recheck) == 1 and len(untouched) == 1574
    assert recheck[0]['id'] == '5b1da7c755e4d73f34574c7e'
    ordered = recheck + untouched
    pages = [{'page': 0, 'kind': 'original-baluster-recheck', 'regionIds': [recheck[0]['id']]}]
    for start in range(0, len(untouched), 256):
        pages.append({'page': len(pages), 'kind': 'remaining-original-regions', 'regionIds': [r['id'] for r in untouched[start:start + 256]]})
    contact_path = old['helpers']['contact']['path']
    contact_pin = originals[contact_path]
    plan = {'version': 2, 'geometries': geometries, 'instances': old['instances'],
            'relationships': old['relationships'], 'regions': old['regions'],
            'pages': pages, 'attemptRegionIds': [r['id'] for r in ordered],
            'preservedRegionIds': [r['id'] for r in preserved], 'oldProposal': old_pin,
            'oldPage': old_page_pin, 'oldCheck': old_check_pin, 'oldInputs': old_inputs_pin,
            'sourceRelationships': next(p for p in source_pins if p['path'].endswith('coverage-family-proposal-v1/relationships.json')),
            'sourceGeometryBindings': next(p for p in source_pins if p['path'].endswith('coverage-family-proposal-v1/geometry-bindings.json')),
            'globalIndex': next(p for p in source_pins if p['path'] == 'assets/runtime/map-sources/new-york/index.json'),
            'contact': contact_pin, 'component': {'cache': '.cache/component-function.json', 'sha256': sha((CACHE / 'component-function.json').read_bytes())},
            'families': old_inputs['families'], 'scopeInventory': old['scopeInventory']}
    assert len(pages) == 8 and sum(len(p['regionIds']) for p in pages) == 1575
    write(CACHE / 'plan.json', plan)
    output = {'version': 2, 'sourceRef': SOURCE, 'priorCheckpoint': BASE,
              'componentCore': CORE, 'componentFunctionSha256': component['functionSha256'],
              'sourcePins': sorted(source_pins, key=lambda p: (p['commit'], p['path'])),
              'planSha256': sha((CACHE / 'plan.json').read_bytes()), 'pages': pages,
              'preservedRegionIds': plan['preservedRegionIds'], 'families': plan['families'],
              'authoritySha256': sha((HERE / 'authority.md').read_bytes()),
              'provenanceSha256': sha((HERE / 'provenance.json').read_bytes()),
              'scope': {'inventory': 1582, 'preservedPositiveReferences': 7, 'balusterRecheck': 1,
                        'remainingOriginalRegions': 1574, 'sourceBuffers': 92},
              'nativeCompilerCalls': 0, 'runtimeDecoderCalls': 0, 'sourceBlueprintExpansions': 0}
    if hydrate:
        assert read(HERE / 'input-pins.json') == output, 'Immutable hydration plan changed'
    else:
        write(HERE / 'input-pins.json', output)
    return output

if __name__ == '__main__':
    raise SystemExit('Use the finite run.py coordinator; preparation is not replayed automatically')
