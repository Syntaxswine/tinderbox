import {createRuntime} from '../../src/runtime/index.js';
import {TOOLS, DRUGS, worldToStick, DEFAULT_CONFIG} from '../../src/simulation/index.js';
const el = id => document.getElementById(id), params = new URLSearchParams(location.search);
const scenario = ['street', 'chase', 'chain', 'tiny'].includes(params.get('scenario')) ? params.get('scenario') : 'street';
let runtime, lastEvents = 0, stickId = null, primaryId = null, keys = new Set();
const records = [];
function command(value) {
  if (!runtime) return;
  const recorded = {...value, atTick: runtime.snapshot().tick + 1};
  if (runtime.dispatch(value)) records.push(recorded);
}
const labels = {'matches': 'Matches', 'jerry-can': 'Jerry can', 'molotov': 'Molotov', 'torch': 'Torch', 'flamethrower': 'Flamethrower'};
const resource = {matches: 'matches', 'jerry-can': 'gas', molotov: 'molotovs', torch: 'torchFuel', flamethrower: 'flamethrowerFuel'};
for (const tool of TOOLS) {
  const button = document.createElement('button'); button.dataset.tool = tool; button.textContent = labels[tool];
  button.onclick = () => command({type: 'select-tool', tool}); el('tools').append(button);
}
for (const drug of DRUGS) {
  const button = document.createElement('button'); button.dataset.drug = drug;
  button.onclick = () => command({type: 'drug', drug}); el('drugs').append(button);
}
function render(snapshot, metrics) {
  el('health').textContent = 'HP ' + snapshot.player.hp.toFixed(0) + ' / ' + snapshot.player.maxHp;
  el('pour-state').textContent = snapshot.player.pouring ? 'POURING' : 'Pour off';
  el('pause-state').textContent = snapshot.paused ? 'PAUSED' : snapshot.player.hp <= 0 ? 'RESET TO CONTINUE' : 'Running';
  for (const button of el('tools').children) {
    const tool = button.dataset.tool, count = snapshot.player.inventory[resource[tool]];
    button.setAttribute('aria-pressed', String(snapshot.player.tool === tool));
    button.textContent = labels[tool] + ' · ' + (Number.isInteger(count) ? count : count.toFixed(2));
  }
  for (const button of el('drugs').children) {
    const drug = button.dataset.drug; button.textContent = drug[0].toUpperCase() + drug.slice(1) + ' · ' + snapshot.player.inventory[drug];
    button.disabled = snapshot.paused || snapshot.player.hp <= 0 || snapshot.player.inventory[drug] < 1;
  }
  el('primary').textContent = snapshot.player.tool === 'jerry-can' ? snapshot.player.pouring ? 'Stop pouring' : 'Pour / toggle' : 'Primary / hold';
  el('primary').disabled = snapshot.paused || snapshot.player.hp <= 0 || snapshot.player.inventory[resource[snapshot.player.tool]] <= 0;
  el('pause').textContent = snapshot.paused ? 'Resume' : 'Pause';
  el('effects').textContent = `Powder: ${snapshot.effects.powder.active ? snapshot.effects.powder.remaining.toFixed(1) + 's · bear ×1.5 / world ×0.35' : 'off'} · Inversion: ${snapshot.effects.inversion.active ? snapshot.effects.inversion.remaining.toFixed(1) + 's · movement reversed' : 'off'}`;
  const f = snapshot.diagnostics.fuel;
  el('stats').textContent = `Fixture ${scenario} | tick ${snapshot.tick}\nActive ${snapshot.clocks.active.toFixed(2)}s · world ${snapshot.clocks.world.toFixed(2)}s\nBear (${snapshot.player.x.toFixed(2)}, ${snapshot.player.y.toFixed(2)}) · ${snapshot.player.travelled.toFixed(2)} m\nGas poured ${f.pouredFuel.toFixed(3)} L · burning ${snapshot.diagnostics.burningCells}\nFront X ${snapshot.diagnostics.frontX.toFixed(2)} · gap ${(snapshot.player.x - snapshot.diagnostics.frontX).toFixed(2)} m\nRender CPU p95 ${metrics.renderCpuP95Ms.toFixed(2)} ms · sim p95 ${(metrics.simulationCpuP95Ms ?? 0).toFixed(2)} ms · ${(metrics.observedHz ?? 0).toFixed(0)} Hz\n${metrics.drawCalls} draws · ${metrics.geometries} geometries · ${metrics.textures} textures · Three ${metrics.threeRevision}\n${metrics.viewport.width} × ${metrics.viewport.height} canvas · dropped ${snapshot.diagnostics.droppedRealSeconds.toFixed(2)}s\n${metrics.rendererDescription}\n${metrics.userAgent}`;
  const fresh = snapshot.events.filter(event => event.id > lastEvents);
  if (fresh.length) { lastEvents = fresh.at(-1).id; el('events').textContent = (el('events').textContent + fresh.map(e => `#${e.id} @${e.tick} ${e.type} ${e.drug || e.objectId || e.reason || ''}`).join('\n') + '\n').split('\n').slice(-20).join('\n'); }
}
function resetStick() { stickId = null; el('knob').style.transform = ''; command({type: 'move', x: 0, y: 0}); }
function moveStick(event) { const box = el('stick').getBoundingClientRect(), radius = box.width * 0.4;
  const x = (event.clientX - box.left - box.width / 2) / radius, y = -(event.clientY - box.top - box.height / 2) / radius;
  const n = Math.max(1, Math.hypot(x, y)); command({type: 'move', x: x / n, y: y / n}); el('knob').style.transform = `translate(${x / n * radius}px,${-y / n * radius}px)`; }
el('stick').onpointerdown = e => { if (e.button !== 0 || stickId !== null) return; e.preventDefault(); stickId = e.pointerId; el('stick').setPointerCapture(e.pointerId); moveStick(e); };
el('stick').onpointermove = e => { if (e.pointerId === stickId) moveStick(e); };
for (const type of ['pointerup', 'pointercancel', 'lostpointercapture']) el('stick').addEventListener(type, e => { if (e.pointerId === stickId) resetStick(); });
el('primary').onpointerdown = e => { if (e.button !== 0 || primaryId !== null) return; primaryId = e.pointerId; el('primary').setPointerCapture(e.pointerId); command({type: 'primary', pressed: true}); };
for (const type of ['pointerup', 'pointercancel', 'lostpointercapture']) el('primary').addEventListener(type, e => { if (e.pointerId === primaryId) { primaryId = null; command({type: 'primary', pressed: false}); } });
el('primary').onclick = e => { if (e.detail === 0) { command({type: 'primary', pressed: true}); command({type: 'primary', pressed: false}); } };
el('pause').onclick = () => command({type: 'pause', paused: !runtime.snapshot().paused});
el('reset').onclick = () => { keys.clear(); resetStick(); command({type: 'reset'}); };
el('chase-demo').onclick = () => {
  if (scenario !== 'chase') { location.assign('?scenario=chase&demo=1'); return; }
  keys.clear(); command({type: 'reset'}); runtime.advance(DEFAULT_CONFIG.step);
  // Commit reset before queuing this new, explicit demo recording.
  const tick = runtime.snapshot().tick + 1;
  for (const value of [{type: 'drug', drug: 'powder'}, {type: 'primary', pressed: true}, {type: 'primary', pressed: false},
    {type: 'move', ...worldToStick({x: 1, y: 0}, DEFAULT_CONFIG.input)}]) runtime.dispatch({...value, atTick: tick});
};
el('step').onclick = () => runtime.advance(0.25);
el('zoom-in').onclick = () => runtime.zoom(1.2); el('zoom-out').onclick = () => runtime.zoom(1 / 1.2);
const movementKeys = new Set(['w', 'a', 's', 'd', 'arrowup', 'arrowleft', 'arrowdown', 'arrowright']);
function keyboardMove() { command({type: 'move', x: Number(keys.has('d') || keys.has('arrowright')) - Number(keys.has('a') || keys.has('arrowleft')),
  y: Number(keys.has('w') || keys.has('arrowup')) - Number(keys.has('s') || keys.has('arrowdown'))}); }
addEventListener('keydown', e => {
  if (e.target.matches('button,input,select,a,summary')) return;
  const key = e.key.toLowerCase();
  if (movementKeys.has(key)) { e.preventDefault(); keys.add(key); keyboardMove(); }
  if (key === ' ' && !e.repeat) { e.preventDefault(); command({type: 'primary', pressed: true}); }
  if (key === 'escape' && !e.repeat) { command({type: 'cancel-input'}); keys.clear(); resetStick(); }
});
addEventListener('keyup', e => { const key = e.key.toLowerCase(); keys.delete(key); if (movementKeys.has(key)) keyboardMove(); if (key === ' ') command({type: 'primary', pressed: false}); });
addEventListener('blur', () => { keys.clear(); resetStick(); primaryId = null; });
try {
  runtime = await createRuntime({root: el('viewport'), scenario, autoStart: !params.has('manual'), onSnapshot: render, onError: error => { el('error').textContent = String(error); }});
  window.tinderboxDiagnostic = {runtime, recording: records, scenario, startChase: () => el('chase-demo').click()};
  if (params.has('demo')) el('chase-demo').click();
} catch (error) { el('error').textContent = error.stack || String(error); }
addEventListener('pagehide', () => runtime?.dispose(), {once: true});
