// Round 3, finding M-1, checked independently of the reviewer's probes.
// The shipped Catalogue Street. The bear stands on the lawn east of Hopkins 9 and lobs one lantern
// west at the house, once per reach from 0.8 m to 3.4 m. Two rows of the house are tried: y 33.5,
// where the clapboard wall stands 1.09 m behind the stone plinth, and y 34.5, where it is flush.
// For each throw: where the lantern came down, how much oil reached the ground ledger, and what
// caught in the next 3 s. A throw that leaves no oil and lights nothing is a dud.
//   node docs/reviews/evidence/hostile-review-round-3/lantern-dud.mjs [path to another source tree]
import {pathToFileURL} from 'node:url';
import path from 'node:path';

const root = process.argv[2] ? path.resolve(process.argv[2]) : path.resolve(import.meta.dirname, '../../../..');
const load = file => import(pathToFileURL(path.join(root, file)).href);
const {createSimulation, DEFAULT_CONFIG} = await load('src/simulation/index.js');
const {NEIGHBORHOOD_SCENARIO} = await load('src/content/neighborhood.js');
const STEP = DEFAULT_CONFIG.step, RANGE = DEFAULT_CONFIG.tools.molotov.range;
const round = (v, d = 2) => v === null || v === undefined ? null : +(+v).toFixed(d);
const STANCE_X = 11.4;

function lob(y, reach) {
  const sim = createSimulation({seed: 1893, config: {input: {cameraRelative: false}},
    scenario: {...NEIGHBORHOOD_SCENARIO, actors: [],
      player: {...NEIGHBORHOOD_SCENARIO.player, x: STANCE_X, y, heading: Math.PI, tool: 'molotov'}}});
  try {
    sim.advance(STEP); sim.dispatch({type: 'pause', paused: false});
    sim.dispatch({type: 'primary', pressed: true}); sim.advance(STEP);
    sim.dispatch({type: 'primary', pressed: false});
    const magnitude = .12 + .88 * reach / RANGE;
    sim.dispatch({type: 'move', x: -magnitude, y: 0}); sim.dispatch({type: 'move', x: 0, y: 0});
    let snapshot = sim.advance(STEP);
    const preview = snapshot.player.lanternAim?.impact;
    const before = snapshot.player.inventory.molotovs;
    sim.dispatch({type: 'primary', pressed: true});
    let impact = null, sites = 0, cells = 0, oil = 0;
    const seen = new Set();
    for (let i = 0; i < 5 / STEP; i++) {
      snapshot = sim.advance(STEP);
      for (const event of snapshot.events) {
        if (seen.has(event.id)) continue; seen.add(event.id);
        if (event.type === 'molotov-impact') impact = {...event, tick: i};
        if (event.type === 'structure-ignition') sites++;
        if (event.type === 'ignition') cells++;
      }
      oil = Math.max(oil, snapshot.diagnostics?.fuel?.molotovFuel ?? 0);
      if (impact && i > impact.tick + 3 / STEP) break;
    }
    return {reach, preview, impact, oil, sites, cells, spent: before - snapshot.player.inventory.molotovs};
  } finally { sim.dispose(); }
}

console.log('tree: ' + (process.argv[2] ? path.basename(root) + ' (given as an argument)' : 'this checkout'));
console.log('The bear stands at x ' + STANCE_X + '. The plinth face is at x 10.09.');
for (const [label, y, wallX] of [['wall set back 1.09 m behind the plinth (wall face x 9.08)', 33.5, 9.08], ['wall flush with the plinth (wall face x 10.08)', 34.5, 10.08]]) {
  console.log('\n== y ' + y + ': ' + label + ' ==');
  console.log('reach m  marker x  came down at   lanterns spent  oil in ledger L  house sites lit in 3 s  ground cells lit in 3 s  verdict');
  let duds = 0, throws = 0;
  for (let reach = .8; reach < 3.45; reach += .2) {
    const r = lob(y, round(reach, 1));
    if (!r.impact) { console.log(String(r.reach).padEnd(9) + 'no impact within 5 s'); continue; }
    throws++;
    const dud = r.oil === 0 && r.sites === 0 && r.cells === 0;
    if (dud) duds++;
    console.log([String(r.reach).padEnd(7), String(round(STANCE_X - r.reach)).padEnd(8),
      ('x ' + round(r.impact.x) + ' h ' + round(r.impact.h)).padEnd(13), String(r.spent).padEnd(14),
      String(round(r.oil)).padEnd(15), String(r.sites).padEnd(22), String(r.cells).padEnd(23),
      dud ? 'DUD' : r.oil === 0 ? 'fire, but no oil laid' : 'fire'].join('  '));
    if (r.preview && (Math.abs(r.preview.x - r.impact.x) > 1e-6 || Math.abs(r.preview.h - r.impact.h) > 1e-6)) console.log('   preview differs: x ' + r.preview.x + ' h ' + r.preview.h);
  }
  console.log('duds: ' + duds + ' of ' + throws + ' throws');
}
