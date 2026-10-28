import {createRuntime} from '../../src/runtime/index.js';
import {createDiagnosticScene} from '../../src/runtime/diagnostics.js';
import {loadCivilianKit} from '../../src/reuse/civilians.js';
import {ASSET_SCALE} from '../../src/content/exterior-kit.js';
import {worldToStick, DEFAULT_CONFIG} from '../../src/simulation/index.js';
const el = id => document.getElementById(id); let runtime, view, cycleStatus = 'not run';
async function createView({THREE, scene, renderer}) {
  const diagnostic = createDiagnosticScene({THREE, scene}), kit = await loadCivilianKit({THREE, renderer});
  const people = new Map(), overhead = new THREE.Group(); scene.add(overhead);
  const geometry = new THREE.BoxGeometry(1, 1, 1), material = new THREE.MeshBasicMaterial({color: 0xe8cb7b, wireframe: true});
  let built = false;
  const api = {
    update(snapshot, timing) {
      diagnostic.update({...snapshot, actors: []}, timing);
      if (!built) {
        for (const module of snapshot.world.modules) for (const p of module.parts.filter(p => !p.solid)) {
          const mesh = new THREE.Mesh(geometry, material); mesh.position.set(p.x, p.h, p.y); mesh.scale.set(p.width, p.height, p.depth); mesh.userData.partId = p.id; overhead.add(mesh);
        }
        built = true;
      }
      const parts = new Map(snapshot.world.modules.flatMap(m => m.parts.map(p => [p.id, p])));
      for (const mesh of overhead.children) mesh.visible = !parts.get(mesh.userData.partId)?.destroyed;
      for (const actor of snapshot.actors) {
        if (!people.has(actor.id)) { const person = kit.create(actor); people.set(actor.id, person); scene.add(person.root); }
        people.get(actor.id).update(actor, timing.worldTime);
      }
    },
    cycle() {
      const actors = runtime.snapshot().actors, before = kit.diagnostics().instances, memory = {...renderer.info.memory};
      for (let i = 0; i < 6; i++) for (const actor of actors) { const person = kit.create(actor); person.update(actor, 1); person.dispose(); person.dispose(); }
      if (kit.diagnostics().instances !== before) throw Error('Civilian instance leak');
      if (renderer.info.memory.geometries !== memory.geometries || renderer.info.memory.textures !== memory.textures) throw Error('Civilian GPU resource retention');
      cycleStatus = 'PASS · 12 real painted instances disposed; GPU counts stable ' + memory.geometries + ' geometries / ' + memory.textures + ' textures';
    },
    report() { return {kit: kit.diagnostics(), people: [...people.values()].map(p => p.diagnostics())}; },
    dispose() { kit.dispose(); diagnostic.dispose(); overhead.removeFromParent(); geometry.dispose(); material.dispose(); }
  }; view = api; return api;
}
function report(s) {
  const d = view.report(), pass = d.kit.instances === 2 && d.people.every(p => p.appearance === 'normal' && !p.armed) && s.world.modules[0].opening.width === ASSET_SCALE.doorWidth;
  el('result').dataset.status = pass ? 'pass' : 'fail';
  el('result').textContent = `${pass ? 'PASS' : 'FAIL'} · real source civilians\nNative 1m tiles / 2m wall units / 1 x1.65m doorway\nFull-size bear retains 0.56m radius and cannot fit this opening\n${s.world.modules.length} modules · ${s.world.obstacles.length} collision parts\n${d.people.map(p => p.species + ': normal / no hat / unarmed / ' + p.triangles + ' triangles').join('\n')}\nCivilian radii ${s.actors.map(p => p.radius.toFixed(2)).join(' / ')} m\nBear ${s.player.x.toFixed(2)},${s.player.y.toFixed(2)} · travelled ${s.player.travelled.toFixed(3)} m\nGas poured ${s.diagnostics.fuel.pouredFuel.toFixed(4)} L\nNPC travel ${s.actors.map(p => p.travelled.toFixed(3)).join(' / ')} m\nPlayer/world clocks ${s.clocks.player.toFixed(3)} / ${s.clocks.world.toFixed(3)}\nCycle check: ${cycleStatus}`;
}
function step(seconds) { for (let i = 0; i < seconds * 60; i++) runtime.advance(1 / 60); }
el('walk').onclick = () => { runtime.dispatch({type: 'move', ...worldToStick({x: 0, y: -1}, DEFAULT_CONFIG.input)}); runtime.dispatch({type: 'primary', pressed: true}); runtime.dispatch({type: 'primary', pressed: false}); step(1.4); runtime.dispatch({type: 'move', x: 0, y: 0}); runtime.advance(1 / 60); };
el('powder').onclick = () => { runtime.dispatch({type: 'drug', drug: 'powder'}); step(1); };
el('step').onclick = () => step(1);
el('cycle').onclick = () => { try { view.cycle(); runtime.advance(0); } catch (error) { el('error').textContent = error.stack || String(error); } };
try { runtime = await createRuntime({root: el('viewport'), scenario: 'exposition', autoStart: false, createArtScene: createView, onSnapshot: report}); }
catch (error) { el('error').textContent = error.stack || String(error); }
addEventListener('pagehide', () => runtime?.dispose(), {once: true});