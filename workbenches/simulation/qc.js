import {createRuntime} from '../../src/runtime/index.js';
const el = id => document.getElementById(id);
const wall = {id: 'front', x: 3, y: 5, width: 0.1, depth: 10, height: 2, material: 'masonry'};
let runtime, current;
function report(snapshot) {
  const d = snapshot.discharge, reach = d.rays.length ? Math.max(...d.rays.map(r => r.distance)) : 0;
  const ray = d.rays.reduce((best, r) => !best || Math.abs(r.angle - d.heading) < Math.abs(best.angle - d.heading) ? r : best, null);
  const blocked = current === 'wall' || current === 'torch';
  const pass = snapshot.player.radius === 0.56 && (!d.active || d.rays.length <= 256 && (!blocked || d.rays.every(r => r.x < 2.95)));
  el('result').dataset.status = pass ? 'pass' : 'fail';
  el('result').textContent = `${pass ? 'PASS' : 'FAIL'} · ${current}\nBody radius ${snapshot.player.radius.toFixed(2)} m\nActive ${d.active} · ${d.tool ?? 'none'} · tick ${d.tick}\nOrigin ${d.origin ? `${d.origin.x.toFixed(2)}, ${d.origin.y.toFixed(2)}, h=${d.origin.h.toFixed(2)}` : 'none'}\n${d.rays.length} rays · filled fan ${d.connectRays}\nConfigured range ${d.range.toFixed(2)} m · maximum ray ${reach.toFixed(3)} m\nCentre ray ${ray ? ray.distance.toFixed(3) + ' m' : 'none'}\nTorch lead ${d.lead ? Math.hypot(d.lead.to.x - d.lead.from.x, d.lead.to.y - d.lead.from.y).toFixed(3) + ' m' : 'none'}\nFuel ${snapshot.player.inventory.flamethrowerFuel.toFixed(4)} flamer / ${snapshot.player.inventory.torchFuel.toFixed(4)} torch\nClocks player ${snapshot.clocks.player.toFixed(3)} / world ${snapshot.clocks.world.toFixed(3)}`;
}
async function preset(name) {
  runtime?.dispose(); current = name;
  const obstacles = name === 'wall' || name === 'torch' ? [wall] : name === 'corner' ? [
    {id: 'narrow', x: 4, y: 5.4, width: 0.06, depth: 0.03, height: 2, material: 'masonry'},
    {id: 'edge', x: 5, y: 4.6, width: 0.3, depth: 0.7, height: 2, material: 'masonry'}] : [];
  runtime = await createRuntime({root: el('viewport'), autoStart: false, onSnapshot: report,
    scenario: {id: 'qc-' + name, width: 12, height: 10, player: {x: 2.25, y: 5.25, tool: name === 'torch' ? 'torch' : 'flamethrower'}, obstacles, actors: []},
    onError: error => { el('error').textContent = String(error); }});
  runtime.dispatch({type: 'aim', x: 10, y: 5.25}); runtime.dispatch({type: 'primary', pressed: true}); runtime.advance(1 / 60);
}
for (const button of document.querySelectorAll('[data-preset]')) button.onclick = () => preset(button.dataset.preset).catch(error => { el('error').textContent = String(error); });
el('release').onclick = () => { runtime.dispatch({type: 'primary', pressed: false}); runtime.advance(1 / 60); };
el('pause').onclick = () => { runtime.dispatch({type: 'pause', paused: true}); runtime.advance(1 / 60); };
el('powder').onclick = () => { runtime.dispatch({type: 'drug', drug: 'powder'}); runtime.advance(0.25); };
await preset('free');
addEventListener('pagehide', () => runtime?.dispose(), {once: true});