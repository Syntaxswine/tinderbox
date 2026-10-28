import {createRuntime} from '../../src/runtime/index.js';
import {createSimulation} from '../../src/simulation/index.js';
import {buildingFireScenario} from '../../src/content/building-fire.js';
const $ = id => document.getElementById(id);
const experiments = {
  climb: {gap: 0.75, moisture: 0},
  wind: {gap: 0.75, moisture: 0, wind: {x: 0, y: 6}},
  gap: {gap: 3, moisture: 0}
};
let runtime, sim, busy = false, closed = false;
const controller = new AbortController(), options = {signal: controller.signal};
function report(snapshot) {
  const fire = snapshot.structureFire, d = fire.diagnostics;
  $('time').textContent = snapshot.clocks.world.toFixed(1) + ' s';
  $('power').textContent = (d.powerW / 1000).toFixed(0) + ' kW';
  $('height').textContent = d.highestBurningM.toFixed(2) + ' m';
  $('frontages').replaceChildren(...['source', 'receiver', ...(experiments[$('experiment').value].barrier ? ['firebreak'] : [])].map(id => {
    const surfaces = fire.surfaces.filter(p => p.buildingId === id), row = document.createElement('tr');
    const values = [id === 'source' ? 'Source' : id === 'receiver' ? 'Next building' : 'Masonry screen',
      (Math.max(293.15, ...surfaces.map(p => p.temperatureK)) - 273.15).toFixed(0) + ' °C', surfaces.filter(p => p.phase === 'burning').length];
    for (const value of values) { const cell = document.createElement('td'); cell.textContent = value; row.append(cell); } return row;
  }));
}
async function reset() {
  runtime?.dispose();
  const conditions = {...experiments[$('experiment').value], stories: Number($('stories').value)};
  sim = createSimulation({scenario: buildingFireScenario(conditions)});
  runtime = await createRuntime({root: $('viewport'), simulation: sim, cameraFocus: {x: 6, y: 4.5, h: (conditions.stories * 2.12 - 0.12) / 2}, autoStart: false, pauseOnBlur: false, onSnapshot: report});
  runtime.zoom(conditions.stories >= 4 ? 1.65 : 2.1); runtime.advance(0);
  $('conditions').textContent = 'Gap ' + conditions.gap + ' m · wood moisture ' + Math.round(conditions.moisture * 100) + '% dry mass · wind ' + (conditions.wind?.y ?? 0) + ' m/s toward the next building';
  $('status').textContent = 'Ready · finite 30-second source exposure';
}
async function step(seconds) {
  if (busy || closed) return; busy = true;
  document.querySelectorAll('button,select').forEach(e => e.disabled = true);
  try {
    sim.dispatch({type: 'pause', paused: false});
    for (let elapsed = 0; elapsed < seconds && !closed; elapsed += 2) {
      for (let i = 0; i < Math.min(2, seconds - elapsed) * 4; i++) sim.advance(0.25);
      runtime.advance(0); await new Promise(requestAnimationFrame);
    }
    $('status').textContent = 'Complete · source burner ' + (sim.snapshot().clocks.world >= 30 ? 'off' : 'active');
  } finally { busy = false; if (!closed) document.querySelectorAll('button,select').forEach(e => e.disabled = false); }
}
$('step').addEventListener('click', () => step(10).catch(showError), options);
$('minute').addEventListener('click', () => step(60).catch(showError), options);
for (const id of ['experiment', 'stories']) $(id).addEventListener('change', () => reset().catch(showError), options);
$('reset').addEventListener('click', () => reset().catch(showError), options);
function showError(e) { $('status').textContent = e.message; console.error(e); }
addEventListener('pagehide', () => { closed = true; controller.abort(); runtime?.dispose(); }, {once: true});
await reset();
