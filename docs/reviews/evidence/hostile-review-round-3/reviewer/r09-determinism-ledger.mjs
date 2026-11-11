// r09: after the two passes, on regular Catalogue Street with a script that uses the new code paths
// (match on Hopkins 9's set-back east wall line, flamethrower into the notch, a lantern at the wall, a lantern
// onto Hopkins 12's deck from the lawn):
//   (a) frame chunking: the same tick-stamped inputs stepped as 1/60 s frames, as 0.25 s frames and as random
//       0..0.1 s frames must give byte-identical published state at the same tick;
//   (b) reset equals fresh: play 25 s, reset, replay the script -> identical to a fresh simulation's run;
//       and a second fresh simulation in the same process equals the first (no state kept in module caches);
//   (c) ground fuel ledger closes at every check: surface fuel left + burned = initial; deposited left + burned = poured;
//       burnedFraction of every house never falls and sections never come back;
//   (d) the published snapshot equals live state (read-only tap): every cell, the three running diagnostics,
//       the obstacle list, and the set of structure samples.
// Run: node r09-determinism-ledger.mjs [seconds=200] [--reset-only]
import {createHash} from 'node:crypto';
import {HEAD, TAPS, underPatches, load, r} from './lib.mjs';
underPatches(import.meta.url, TAPS);
const SECONDS = +process.argv[2] || 200, api = await load(HEAD), TICKS = SECONDS * 60;

function script(sim, base = 0) {
  const at = (tick, command) => { if (!sim.dispatch({...command, atTick: base + tick})) throw Error('rejected ' + JSON.stringify(command)); };
  at(1, {type: 'aim', x: 10.3, y: 34.5}); at(1, {type: 'primary', pressed: true}); at(2, {type: 'primary', pressed: false});         // match, Hopkins 9 flush east wall
  at(20, {type: 'select-tool', tool: 'flamethrower'}); at(21, {type: 'aim', x: 9.2, y: 32.6}); at(22, {type: 'primary', pressed: true}); at(70, {type: 'primary', pressed: false});
  at(80, {type: 'select-tool', tool: 'molotov'}); at(81, {type: 'primary', pressed: true}); at(82, {type: 'primary', pressed: false});
  at(83, {type: 'move', x: -.56, y: -.15}); at(84, {type: 'move', x: 0, y: 0}); at(86, {type: 'primary', pressed: true}); at(87, {type: 'primary', pressed: false});
  at(100, {type: 'primary', pressed: true}); at(101, {type: 'primary', pressed: false});                                             // second lantern: north, at Hopkins 12's porch
  at(102, {type: 'move', x: .1, y: -.95}); at(103, {type: 'move', x: 0, y: 0}); at(105, {type: 'primary', pressed: true}); at(106, {type: 'primary', pressed: false});
  at(130, {type: 'drug', drug: 'powder'});
}
const make = () => api.createSimulation({scenario: {...api.NEIGHBORHOOD_SCENARIO, player: {...api.NEIGHBORHOOD_SCENARIO.player, x: 11.2, y: 34.2, tool: 'matches'}},
  config: {input: {cameraRelative: false}, fire: {damagePerSecond: 0}, events: {capacity: 4096}}});
function digest(snapshot, {offset = 0, strip = false} = {}) {
  const {diagnostics, events, tick, ...rest} = snapshot;
  const {alpha, lastSteps, droppedRealSeconds, generation, ...diag} = diagnostics;
  const body = {...rest, discharge: {...rest.discharge, tick: rest.discharge.tick - offset}, diag,
    events: strip ? events.filter(e => e.type !== 'reset').map(({id, tick, ...e}) => ({...e, tick: tick - offset})).filter(e => e.tick > 0) : events};
  return createHash('sha256').update(JSON.stringify(body)).digest('hex').slice(0, 16);
}

// ---------- (a) chunking, with (c) and (d) checked on the 1/60 run ----------
let problems = 0, checks = 0, cellsCompared = 0;
function audit(snapshot, memory) {
  const tb = globalThis.__tb, field = tb.field, state = tb.state;
  checks++;
  let surface = 0, deposited = 0, burning = 0, front = -1;
  for (let i = 0; i < field.cells.length; i++) {
    const live = field.cells[i], pub = snapshot.cells[i]; cellsCompared++;
    if (pub.phase !== live.phase || !Object.is(pub.heat, live.heat) || !Object.is(pub.surfaceFuel, live.surfaceFuel) || !Object.is(pub.depositedFuel, live.depositedFuel) || !Object.is(pub.intensity, live.intensity)) { if (problems++ < 5) console.log(`  (d) cell ${live.id} published != live at tick ${snapshot.tick}`); }
    surface += live.surfaceFuel; deposited += live.depositedFuel;
    if (live.phase === 'burning') { burning++; front = Math.max(front, i % field.cols); }
  }
  const fuel = snapshot.diagnostics.fuel;
  memory.surface0 ??= surface + fuel.burnedSurfaceFuel;
  const surfaceError = Math.abs(surface + fuel.burnedSurfaceFuel - memory.surface0);
  const depositError = Math.abs(deposited + fuel.burnedDepositedFuel - (fuel.pouredFuel + fuel.fixtureFuel + fuel.molotovFuel));
  memory.worstSurface = Math.max(memory.worstSurface ?? 0, surfaceError); memory.worstDeposit = Math.max(memory.worstDeposit ?? 0, depositError);
  if (surfaceError > 1e-9 || depositError > 1e-9) { if (problems++ < 5) console.log(`  (c) ledger open at tick ${snapshot.tick}: surface ${surfaceError} deposited ${depositError}`); }
  if (snapshot.diagnostics.burningCells !== burning || Math.abs(fuel.remainingDepositedFuel - deposited) > 1e-12 || snapshot.diagnostics.frontX !== (front < 0 ? 0 : (front + .5) * field.size)) { if (problems++ < 5) console.log(`  (d) diagnostics differ at tick ${snapshot.tick}: burning ${snapshot.diagnostics.burningCells}/${burning} frontX ${snapshot.diagnostics.frontX} remaining ${fuel.remainingDepositedFuel}/${deposited}`); }
  const liveBoxes = state.obstacles.filter(o => !o.destroyed).map(o => [o.id, o.x, o.y, o.width, o.depth, o.height].join()).sort().join(';');
  const pubBoxes = snapshot.world.obstacles.map(o => [o.id, o.x, o.y, o.width, o.depth, o.height].join()).sort().join(';');
  if (liveBoxes !== pubBoxes) { if (problems++ < 5) console.log(`  (d) obstacle list differs at tick ${snapshot.tick} (live ${state.obstacles.length}, published ${snapshot.world.obstacles.length})`); }
  const liveSites = new Set();
  for (const lot of globalThis.__lots.slice(-memory.lots)) if (!lot.building.destroyed) for (const site of lot.sites) {
    if (lot.sections[site.section].view.present && (site.phase === 'burning' || site.phase === 'cold' && site.heat > 0)) liveSites.add(`${lot.building.id}/${site.id}`);
  }
  const pubSites = new Set(snapshot.structureFire.filter(s => !s.id.endsWith(':smolder')).map(s => s.id));
  // A burning site whose flame has reached zero is omitted from the samples by design (surfaceSample returns null); only extra or missing live flames count.
  for (const id of pubSites) if (!liveSites.has(id)) { if (problems++ < 5) console.log(`  (d) published structure sample ${id} has no live burning/heated site at tick ${snapshot.tick}`); }
  for (const b of snapshot.world.buildings) {
    const before = memory.burned?.get(b.id) ?? 0;
    if (b.burnedFraction < before - 1e-12 || b.burnedFraction > 1 + 1e-12) { if (problems++ < 5) console.log(`  (c) ${b.id} burnedFraction fell ${before} -> ${b.burnedFraction}`); }
    (memory.burned ??= new Map()).set(b.id, b.burnedFraction);
    for (const s of b.sections ?? []) { const key = b.id + ':' + s.index; if (memory.gone?.has(key) && s.present) { if (problems++ < 5) console.log(`  (c) section ${key} came back`); } if (!s.present) (memory.gone ??= new Set()).add(key); }
  }
}
function runFrames(mode, seed = 7) {
  globalThis.__lots = [];
  const sim = make(), memory = {lots: globalThis.__lots.length}, marks = [];
  script(sim);
  let snapshot = sim.snapshot(), rng = seed;
  const random = () => (rng = (rng * 1103515245 + 12345) % 2147483648) / 2147483648;
  const marksAt = new Set([120, 600, 1800, 3600, 6000, 9600, TICKS].filter(t => t <= TICKS));
  while (snapshot.tick < TICKS) {
    const left = TICKS - snapshot.tick, nextMark = Math.min(...[...marksAt].filter(t => t > snapshot.tick));
    let dt = mode === 'frame' ? api.STEP : mode === 'quarter' ? .25 : random() * .1;
    const maxSteps = nextMark - snapshot.tick;                         // never step past a comparison tick
    dt = Math.min(dt, maxSteps * api.STEP - (mode === 'frame' ? 0 : 1e-7));
    if (mode !== 'frame' && maxSteps === 1) dt = api.STEP;
    snapshot = sim.advance(Math.max(0, dt));
    if (mode === 'frame' && snapshot.tick % 20 === 0) audit(snapshot, memory);
    if (marksAt.has(snapshot.tick) && snapshot.diagnostics.lastSteps > 0) marks.push([snapshot.tick, digest(snapshot)]);
  }
  const end = {marks, memory, burning: snapshot.diagnostics.burningCells, destroyed: snapshot.world.buildings.filter(b => b.destroyed).length, molotov: snapshot.diagnostics.fuel.molotovFuel, tools: snapshot.events.filter(e => e.type === 'tool-use').length};
  sim.dispose();
  return end;
}
const RESET_ONLY = process.argv.includes('--reset-only');
if (!RESET_ONLY) {
const frame = runFrames('frame'), quarter = runFrames('quarter'), jitter = runFrames('random'), jitter2 = runFrames('random', 99);
console.log(`(a) chunking over ${SECONDS} s (${TICKS} ticks): comparison ticks ${frame.marks.map(m => m[0]).join(', ')}`);
for (const [name, other] of [['0.25 s frames', quarter], ['random frames seed 7', jitter], ['random frames seed 99', jitter2]]) {
  const same = frame.marks.length === other.marks.length && frame.marks.every((m, i) => m[0] === other.marks[i][0] && m[1] === other.marks[i][1]);
  console.log(`    1/60 s frames vs ${name}: ${same ? 'IDENTICAL at every comparison tick' : 'DIFFERENT ' + JSON.stringify([frame.marks, other.marks])}`);
  if (!same) problems++;
}
console.log(`    end state: ${frame.destroyed} houses destroyed, ${frame.burning} cells burning, lantern fuel laid ${frame.molotov} L`);
console.log(`(c)(d) ${checks} audits on the 1/60 run (every 20 ticks), ${cellsCompared} published-vs-live cell comparisons; worst ledger error surface ${frame.memory.worstSurface} deposited ${frame.memory.worstDeposit}`);
}

// ---------- (b) reset equals fresh ----------
function partial(viaReset) {
  globalThis.__lots = [];
  // A reset is applied at the start of a step and that step then runs, so "just after reset" equals a fresh
  // simulation after one idle step. Both runs therefore start the script one step in.
  const sim = make(); let base;
  if (viaReset) {
    script(sim); for (let i = 0; i < 1500; i++) sim.advance(api.STEP);
    sim.dispatch({type: 'reset'}); base = sim.advance(api.STEP).tick;
  } else base = sim.advance(api.STEP).tick;
  script(sim, base);
  const marks = [];
  for (let i = 1; i <= 3000; i++) { const s = sim.advance(api.STEP); if (i % 600 === 0) marks.push(digest(s, {offset: base - 1, strip: true})); }
  sim.dispose(); return marks;
}
const fresh = partial(false), fresh2 = partial(false), afterReset = partial(true);
const eq = (a, b) => a.length === b.length && a.every((v, i) => v === b[i]);
console.log(`(b) second fresh simulation in the same process vs the first, 50 s, 5 comparison points: ${eq(fresh, fresh2) ? 'IDENTICAL' : 'DIFFERENT'}`);
console.log(`(b) 25 s of fire, reset, replay vs fresh, 50 s, 5 comparison points: ${eq(fresh, afterReset) ? 'IDENTICAL' : 'DIFFERENT ' + JSON.stringify([fresh, afterReset])}`);
if (!eq(fresh, fresh2) || !eq(fresh, afterReset)) problems++;
console.log(`TOTAL problems: ${problems}`);
