import {startGame} from '../../src/main.js';
import {SCENARIOS, worldToStick} from '../../src/simulation/index.js';
import {DEFAULT_CONFIG} from '../../src/simulation/config.js';
import {scenarioDefinition} from '../../src/simulation/fixtures.js';
let runtime, closed = false, busy = false, startupError = null;
const positions = {street: [20, 18], twelve: [5.5, 13.8], fifteen: [18.5, 16.4], ashland: [27.5, 14.5],
  'back-twelve': [7, 1.7], 'back-fifteen': [19, 1.7], 'back-ashland': [30, 1.7], 'gap-west': [12.5, 7], 'gap-east': [25.5, 7]};
const nextFrame = () => new Promise(resolve => requestAnimationFrame(resolve));
async function rebuild({position = 'street', autoStart = true, burnout = false} = {}) {
  if (closed) throw Error('Review page closed');
  runtime?.dispose(); runtime = null; startupError = null;
  const scenario = structuredClone(SCENARIOS.neighborhood), [x, y] = positions[position]; scenario.player.x = x; scenario.player.y = y;
  if (burnout) scenario.ignitions = scenarioDefinition('neighborhood').buildings.flatMap(building => building.footprints.map(box => ({x: box.x, y: box.y, radius: 60, heat: 4})));
  try {
    runtime = await startGame({autoStart, scenario, ...(burnout ? {config: {fuel: {surfaceBurnRate: .1}, fire: {damagePerSecond: 0}}} : {})});
    window.neighborhoodReview.ready = true; return sample();
  } catch (error) { startupError = error.message; window.neighborhoodReview.ready = false; throw error; }
}
function sample() {
  if (!runtime) return {rendered: false, error: startupError || 'Scene is loading', visualAcceptance: 'pending'};
  const snapshot = runtime.snapshot(), art = runtime.artDiagnostics();
  return {rendered: runtime.metrics().drawCalls > 0, frame: {width: innerWidth, height: innerHeight}, viewport: runtime.metrics().viewport, metrics: runtime.metrics(),
    scenario: snapshot.diagnostics.scenario, player: snapshot.player, clocks: snapshot.clocks, paused: snapshot.paused,
    buildings: snapshot.world.buildings, bear: art.bearProtagonist, housing: art.housing, fire: art.fire,
    burningCells: snapshot.diagnostics.burningCells, fuel: snapshot.diagnostics.fuel, visualAcceptance: 'Requires independent appearance and interaction inspection.'};
}
function advance(seconds) { for (let i = 0; i < Math.round(seconds * 60); i++) runtime.advance(1 / 60); }
function move(x, y) { runtime.dispatch({type: 'move', ...worldToStick({x, y}, DEFAULT_CONFIG.input)}); }
function requireCheck(ok, message) { if (!ok) throw Error(message); }
async function run() {
  if (busy) throw Error('Review already running'); busy = true;
  const checks = [];
  try {
    for (const position of Object.keys(positions)) {
      await rebuild({position, autoStart: false}); const result = sample();
      requireCheck(result.rendered && result.housing.active === 3 && result.bear.species === 'bear', 'Actual scene missing at ' + position);
      requireCheck(result.housing.projection.bearHeightPixels > 45, 'Native bear projects too small at ' + position);
      if (position.startsWith('back-') || position.startsWith('gap-')) requireCheck(result.housing.occludingBuildingIds.length > 0, 'Occlusion fade missing at ' + position);
      checks.push({position, rendered: result.rendered, housing: result.housing, camera: result.metrics.camera}); await nextFrame();
    }
    await rebuild({autoStart: false});
    for (const tool of ['matches', 'jerry-can', 'molotov', 'torch', 'flamethrower']) {
      runtime.dispatch({type: 'select-tool', tool}); runtime.dispatch({type: 'aim', x: 20, y: 15});
      runtime.dispatch({type: 'primary', pressed: true}); advance(.1); runtime.dispatch({type: 'primary', pressed: false}); advance(1 / 60);
      requireCheck(sample().bear.finiteAnchors, 'Invalid held tool anchors: ' + tool); checks.push({tool, bear: sample().bear, fire: sample().fire});
    }
    await rebuild({autoStart: false}); runtime.dispatch({type: 'primary', pressed: true}); runtime.dispatch({type: 'drug', drug: 'powder'}); move(1, 0); advance(.4); move(0, 0); advance(1 / 60);
    let result = sample(); requireCheck(result.player.travelled > 1.7 && result.fuel.pouredFuel > .13 && result.clocks.world < result.clocks.player, 'Powder accepted-distance trail failed');
    checks.push({powderPour: result});
    runtime.dispatch({type: 'pause', paused: true}); advance(1 / 60); const paused = JSON.stringify(runtime.snapshot().clocks); advance(.3);
    requireCheck(JSON.stringify(runtime.snapshot().clocks) === paused, 'Pause changed world/player clocks');
    await rebuild({autoStart: false, burnout: true});
    for (let i = 0; i < 24; i++) { runtime.advance(.25); await nextFrame(); }
    result = sample(); requireCheck(result.buildings.every(building => building.destroyed) && result.housing.active === 0, 'Coarse group burnout did not remove actual prefabs');
    checks.push({burnoutFixture: result, fixtureTuning: {surfaceBurnRate: .1, damagePerSecond: 0}});
    await rebuild({autoStart: false}); await rebuild({autoStart: false});
    checks.push({repeatedRebuild: sample()});
    return {passed: true, rendered: true, viewport: sample().viewport, checks, visualAcceptance: 'Behavior/render API checks completed. Independent desktop/phone visual review remains required.'};
  } catch (error) { return {passed: false, rendered: !!runtime, error: error.message, checks, visualAcceptance: 'pending'}; }
  finally { busy = false; }
}
window.neighborhoodReview = {ready: false, rebuild, sample, run};
try { await rebuild(); } catch { /* The visible production loading error and sample retain the failure. */ }
window.addEventListener('pagehide', () => { closed = true; runtime?.dispose(); runtime = null; }, {once: true});
