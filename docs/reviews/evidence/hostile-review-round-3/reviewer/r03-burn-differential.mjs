// r03: did the floor / deck / tool-collision passes change how the street burns? Ten strikes through the public
// entry point on regular Catalogue Street, each run to the end on this tree and on tip2 (26931d9, the control),
// then compared house by house: first ignition, section collapse order and times, burnout, site ignitions by part,
// and the ground fuel ledger.
// Run: TB_TREES=<dir with tip2/> node r03-burn-differential.mjs [seconds=330] [case filter]
// With TB_CONTROL=base3 and TB_BASE3=<export of 968e88a> the control is 968e88a instead, which isolates the floor pass.
import {HEAD, TIP2, BASE3, load, r} from './lib.mjs';
const SECONDS = +process.argv[2] || 330;

const CASES = [
  {name: 'hopkins9-east-siding', player: {x: 10.68, y: 34.5, tool: 'matches'}, aim: [10.02, 34.5]},
  {name: 'hopkins13-west-siding', player: {x: 14.3, y: 33.5, tool: 'matches'}, aim: [14.95, 33.5]},
  {name: 'monroe-middle-front', player: {x: 36.7, y: 30.3, tool: 'matches'}, aim: [36.7, 31.15]},
  {name: 'monroe-east-front', player: {x: 44.5, y: 30.3, tool: 'matches'}, aim: [44.5, 31.15]},
  {name: 'hopkins12-porch-deck', player: {x: 7, y: 12.7, tool: 'matches'}, aim: [7, 12.0]},
  {name: 'hopkins15-side-siding', player: {x: 24.7, y: 8, tool: 'matches'}, aim: [24.05, 8]},
  {name: 'ashland-side-siding', player: {x: 33.7, y: 6, tool: 'matches'}, aim: [33.05, 6]},
  {name: 'south-lawn-grass', player: {x: 12, y: 27, tool: 'matches'}, aim: [12, 27.6]},
  {name: 'north-lawn-grass', player: {x: 22.5, y: 15, tool: 'matches'}, aim: [22.5, 14.4]},
  {name: 'lantern-on-hopkins9', player: {x: 13.2, y: 34.63, tool: 'molotov', heading: Math.PI}, lantern: [-(.12 + .88 * 4.7 / 6), 0]}
];

function run(api, spec) {
  const scenario = {...api.NEIGHBORHOOD_SCENARIO, player: {...api.NEIGHBORHOOD_SCENARIO.player, ...spec.player}};
  const sim = api.createSimulation({scenario, config: {input: {cameraRelative: false}, fire: {damagePerSecond: 0}, events: {capacity: 4096}}});
  const houses = new Map(), seen = new Set(), barrels = [], out = {tool: null, groundIgnitions: 0, lastGroundIgnition: 0};
  const house = id => houses.get(id) ?? houses.set(id, {first: null, burnout: null, sections: [], parts: {ground: 0, walls: 0, roof: 0}, lastIgnition: null}).get(id);
  const take = snapshot => {
    for (const e of snapshot.events) {
      if (seen.has(e.id)) continue; seen.add(e.id);
      if (e.type === 'structure-ignition') { const h = house(e.buildingId); h.first ??= e.worldTime; h.parts[e.part]++; h.lastIgnition = e.worldTime; }
      else if (e.type === 'building-section-burnout') house(e.buildingId).sections.push([e.section, e.worldTime]);
      else if (e.type === 'building-burnout') house(e.buildingId).burnout = e.worldTime;
      else if (e.type === 'barrel-explosion') barrels.push([e.objectId, e.tick]);
      else if (e.type === 'ignition') { out.groundIgnitions++; out.lastGroundIgnition = e.tick; }
      else if (e.type === 'tool-use' || e.type === 'tool-rejected') out.tool ??= `${e.type}:${e.result ?? ''}:${(e.cellIds ?? []).join('+')}`;
    }
    return snapshot;
  };
  if (spec.aim) { sim.dispatch({type: 'aim', x: spec.aim[0], y: spec.aim[1]}); sim.dispatch({type: 'primary', pressed: true}); take(sim.advance(api.STEP)); sim.dispatch({type: 'primary', pressed: false}); }
  else {
    sim.dispatch({type: 'primary', pressed: true}); sim.dispatch({type: 'primary', pressed: false});
    sim.dispatch({type: 'move', x: spec.lantern[0], y: spec.lantern[1]}); sim.dispatch({type: 'move', x: 0, y: 0});
    take(sim.advance(api.STEP)); sim.dispatch({type: 'primary', pressed: true}); take(sim.advance(api.STEP)); sim.dispatch({type: 'primary', pressed: false});
  }
  let last;
  for (let i = 0; i < SECONDS * 4; i++) last = take(sim.advance(.25));
  out.fuel = last.diagnostics.fuel; out.burningCells = last.diagnostics.burningCells; out.barrels = barrels;
  out.houses = Object.fromEntries([...houses].sort());
  out.burned = Object.fromEntries(last.world.buildings.map(b => [b.id, [b.destroyed, r(b.burnedFraction, 4)]]));
  out.structureFireLeft = last.structureFire.length;
  sim.dispose();
  return out;
}

const control = process.env.TB_CONTROL === 'base3' ? BASE3 : TIP2;
console.log('control tree: ' + (process.env.TB_CONTROL === 'base3' ? '968e88a (labelled tip2 below)' : '26931d9 (tip2)'));
const head = await load(HEAD), tip = await load(control);
let worstBurnout = 0, worstSection = 0, orderChanges = 0, setChanges = 0;
const only = process.argv[3] ? new RegExp(process.argv[3]) : null;   // optional third argument: case-name filter
for (const spec of CASES.filter(c => !only || only.test(c.name))) {
  const t0 = performance.now(), a = run(head, spec), t1 = performance.now(), b = run(tip, spec), t2 = performance.now();
  console.log(`\n== ${spec.name}  (HEAD ${(t1 - t0) / 1000 | 0}s, tip2 ${(t2 - t1) / 1000 | 0}s wall)`);
  console.log(`  tool: HEAD ${a.tool} | tip2 ${b.tool}`);
  console.log(`  ground ignitions HEAD ${a.groundIgnitions} tip2 ${b.groundIgnitions}; burned surface fuel HEAD ${r(a.fuel.burnedSurfaceFuel, 4)} tip2 ${r(b.fuel.burnedSurfaceFuel, 4)}; deposited burned HEAD ${r(a.fuel.burnedDepositedFuel, 4)} tip2 ${r(b.fuel.burnedDepositedFuel, 4)}`);
  console.log(`  barrels HEAD ${JSON.stringify(a.barrels)} tip2 ${JSON.stringify(b.barrels)}; still-burning cells HEAD ${a.burningCells} tip2 ${b.burningCells}; structure samples left HEAD ${a.structureFireLeft} tip2 ${b.structureFireLeft}`);
  const ids = [...new Set([...Object.keys(a.houses), ...Object.keys(b.houses)])].sort();
  if (ids.join() !== Object.keys(a.houses).sort().join() || ids.join() !== Object.keys(b.houses).sort().join()) { setChanges++; console.log('  AFFECTED-HOUSE SET DIFFERS'); }
  for (const id of ids) {
    const x = a.houses[id], y = b.houses[id];
    if (!x || !y) { console.log(`  ${id}: only on ${x ? 'HEAD' : 'tip2'}`); continue; }
    const orderA = x.sections.map(s => s[0]).join(','), orderB = y.sections.map(s => s[0]).join(',');
    const timeB = new Map(y.sections), shifts = x.sections.filter(s => timeB.has(s[0])).map(s => s[1] - timeB.get(s[0]));
    const maxShift = shifts.reduce((m, v) => Math.abs(v) > Math.abs(m) ? v : m, 0);
    const dBurn = x.burnout !== null && y.burnout !== null ? x.burnout - y.burnout : null;
    if (dBurn !== null) worstBurnout = Math.max(worstBurnout, Math.abs(dBurn));
    worstSection = Math.max(worstSection, Math.abs(maxShift));
    if (orderA !== orderB) orderChanges++;
    console.log(`  ${id.padEnd(18)} first ${r(x.first, 2)}/${r(y.first, 2)} burnout ${r(x.burnout, 2)}/${r(y.burnout, 2)} (d=${r(dBurn, 3)}) sections ${x.sections.length}/${y.sections.length} order ${orderA === orderB ? 'same' : 'DIFFERS'} maxSectionShift ${r(maxShift, 3)}s ` +
      `ignitions floor ${x.parts.ground}/${y.parts.ground} walls ${x.parts.walls}/${y.parts.walls} roof ${x.parts.roof}/${y.parts.roof} lastIgnition ${r(x.lastIgnition, 2)}/${r(y.lastIgnition, 2)} burned ${a.burned[id]}/${b.burned[id]}`);
    if (orderA !== orderB) console.log(`     HEAD order ${orderA}\n     tip2 order ${orderB}`);
  }
}
console.log(`\nSUMMARY over ${CASES.length} strikes x ${SECONDS}s (HEAD/tip2 in each pair above): worst house burnout shift ${r(worstBurnout, 3)} s; worst section retirement shift ${r(worstSection, 3)} s; houses with a different section collapse order ${orderChanges}; cases with a different affected-house set ${setChanges}`);
