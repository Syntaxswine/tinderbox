// Fix B claim: "every exposed half metre of a wooden wall can now catch from the ground". r03 found wall pieces whose
// whole frontage table lies inside their own house's collision box. This probe lists those panels (exterior clapboard
// walls that stand back from the edge of the full-rectangle plinth collider) and tries to light each one directly:
//   ground : gas burning in the nearest cell OUTSIDE the plinth, straight out from the panel (8.5 s burn)
//   tools  : match, torch, flamethrower (1.5 s) and a thrown lantern, from the nearest standing point straight out
// CONTROL: the same five attempts on a flush wall panel of the same house.
// 'LIT' / 'warm' count only heat whose recorded cause on the live site is the tool or a ground cell; heat that arrived
// along the structure from another site is shown as [indirect].
// Reads panel geometry and site causes through the read-only taps. Usage: node r04-setback-walls.mjs
import {underPatches, TAPS, load, r} from './lib.mjs';
underPatches(import.meta.url, TAPS);
const api = await load();
const {freePoint} = await import(api.root + 'simulation/geometry.js');
const STEP = api.STEP, base = api.NEIGHBORHOOD_SCENARIO;
const DIRECT = new Set(['matches', 'torch', 'flamethrower', 'molotov', 'ground-heat']);

function open(extra = {}) {
  globalThis.__lots = [];
  return api.createSimulation({scenario: {...base, actors: [], pickups: [], ...extra}, config: {input: {cameraRelative: false}, fire: {damagePerSecond: 0}}});
}
const probe = open(); probe.advance(STEP);
const lots = globalThis.__lots, obstacles = globalThis.__tb.state.obstacles.map(o => ({...o})), field = globalThis.__tb.field;
const cellsInfo = field.cells.map(c => ({id: c.id, x: c.x, y: c.y, material: c.material}));
probe.dispose();

function attempt(house, panel, how) {
  const {x, z, nx, nz} = panel.low.world, ids = [panel.low, panel.high].map(site => house.building.id + '/' + site.id);
  // nearest standing point straight out from the panel
  let stand = null;
  for (let d = .6; d < 8 && !stand; d += .05) {
    const point = {x: x + nx * d, y: z + nz * d};
    if (freePoint(point, .56, base, obstacles)) stand = {...point, d};
  }
  if (!stand) return {result: 'no standing point'};
  const heading = Math.atan2(-nz, -nx);
  let sim, extra = {};
  if (how === 'ground') {
    // first cell centre straight out that is outside every collision box
    let cell = null;
    for (let d = .2; d < 8 && !cell; d += .1) {
      const point = {x: x + nx * d, y: z + nz * d};
      if (!obstacles.some(o => Math.abs(point.x - o.x) <= o.width / 2 && Math.abs(point.y - o.y) <= o.depth / 2)) {
        cell = cellsInfo.find(c => Math.abs(c.x - point.x) <= .25 && Math.abs(c.y - point.y) <= .25);
      }
    }
    extra = {fuelLines: [{from: {x: cell.x - .2, y: cell.y}, to: {x: cell.x + .2, y: cell.y}, litresPerMetre: .4}], ignitions: [{x: cell.x, y: cell.y, radius: .01, heat: 3}],
      patches: [...base.patches, {x: 0, y: 25, width: 51, depth: 22, material: 'paving'}]}; // bare ground: only this one cell burns
    sim = open(extra);
  } else {
    sim = open({player: {x: stand.x, y: stand.y, heading, tool: how === 'lantern' ? 'molotov' : how}});
  }
  // Attribute heat on the live sites of THIS simulation: only a direct cause counts (a tool or a ground cell),
  // not heat that arrived along the structure from a neighbouring site.
  const live = globalThis.__lots.find(lot => lot.building.id === house.building.id).sites.filter(site => site.id === panel.low.id || site.id === panel.high.id);
  const events = new Map(), kinds = new Set(); let s, peak = 0;
  const run = seconds => { for (let i = 0; i < Math.round(seconds / STEP); i++) { s = sim.advance(STEP); for (const e of s.events) events.set(e.id, e);
    for (const site of live) if (site.phase === 'cold' && site.heat > 0 && site.cause) { kinds.add(site.cause.kind); if (DIRECT.has(site.cause.kind)) peak = Math.max(peak, site.heat / site.fuel.threshold); } } };
  const click = () => { sim.dispatch({type: 'aim', x: x + nx * .02, y: z + nz * .02}); sim.dispatch({type: 'primary', pressed: true}); run(STEP); sim.dispatch({type: 'primary', pressed: false}); run(STEP); };
  if (how === 'ground') run(4);
  else if (how === 'matches') { click(); run(1); }
  else if (how === 'torch') { click(); click(); run(1); }
  else if (how === 'flamethrower') { sim.dispatch({type: 'aim', x: x + nx * .02, y: z + nz * .02}); sim.dispatch({type: 'primary', pressed: true}); run(1.5); sim.dispatch({type: 'primary', pressed: false}); run(.2); }
  else {
    const reach = Math.min(6, stand.d + .3);
    sim.dispatch({type: 'primary', pressed: true}); sim.dispatch({type: 'primary', pressed: false});
    sim.dispatch({type: 'move', x: -nx * (.12 + .88 * reach / 6), y: -nz * (.12 + .88 * reach / 6)}); sim.dispatch({type: 'move', x: 0, y: 0});
    run(STEP); sim.dispatch({type: 'primary', pressed: true}); run(STEP); sim.dispatch({type: 'primary', pressed: false}); run(2.5);
  }
  const mine = [...events.values()].filter(e => e.type === 'structure-ignition' && ids.includes(e.siteId) && DIRECT.has(e.cause));
  const any = [...events.values()].filter(e => e.type === 'structure-ignition' && e.buildingId === house.building.id && DIRECT.has(e.cause));
  const tool = [...events.values()].findLast(e => e.type === 'tool-use' || e.type === 'tool-rejected');
  sim.dispose();
  return {lit: mine.length > 0, peak, kinds: [...kinds].filter(k => !DIRECT.has(k)), stand: stand.d, other: any.filter(e => !ids.includes(e.siteId)).map(e => e.siteId.split('/')[1])[0], tool: tool?.result ?? tool?.reason};
}

const METHODS = ['ground', 'matches', 'torch', 'flamethrower', 'lantern'];
let unreachable = 0, total = 0;
for (const house of lots) {
  const foundation = house.localBoxes.find(b => b.role === 'foundation'), porch = house.localBoxes.find(b => b.role === 'porch');
  const ground = house.panels.filter(p => p.level === 0 && p.low);
  const setback = p => { const edge = Math.abs(p.nx) > Math.abs(p.nz) ? (p.nx > 0 ? foundation.x + foundation.width / 2 - p.x : p.x - (foundation.x - foundation.width / 2))
    : (p.nz > 0 ? foundation.y + foundation.depth / 2 - p.z : p.z - (foundation.y - foundation.depth / 2)); return edge; };
  const back = ground.filter(p => setback(p) > .5);
  if (!back.length) { console.log(`${house.building.id}: no ground-storey wall panel stands back from its collision box (${ground.length} panels)`); continue; }
  const length = panels => r(panels.reduce((sum, p) => sum + p.length, 0), 2);
  console.log(`\n== ${house.building.id}: ${back.length} of ${ground.length} ground-storey wood panels (${length(back)} m of ${length(ground)} m) stand 1 m or more inside the plinth collider ==`);
  const control = ground.find(p => setback(p) < .2 && !p.opening && Math.abs(p.nx) === 1 &&
    !(porch && Math.abs(p.z - porch.y) < porch.depth / 2 + 1.2 && Math.abs(p.x - porch.x) < porch.width / 2 + 1.2));
  const row = (label, p) => {
    const cells = METHODS.map(how => { const a = attempt(house, p, how); return `${how} ${a.lit ? 'LIT' : a.peak > .01 ? 'warm ' + r(a.peak, 2) : 'cold'}${how !== 'ground' && a.tool ? '(' + a.tool + ')' : ''}${!a.lit && a.kinds?.length ? '[indirect: ' + a.kinds.join(',') + ']' : ''}`; });
    const reached = cells.some(c => / LIT| warm/.test(c));
    console.log(`   ${label} ${p.id} normal (${r(p.nx, 2)},${r(p.nz, 2)}) setback ${r(setback(p), 2)} m ${p.opening ?? 'plain'} | ${cells.join(' | ')}`);
    return reached;
  };
  row('CONTROL flush panel', control);
  for (const p of back) { total++; if (!row('set-back panel     ', p)) unreachable++; }
}
console.log(`\nRESULT: ${unreachable} of ${total} set-back ground-storey wood panels cannot be heated by ground fire or by any of the four tools aimed straight at them.`);
