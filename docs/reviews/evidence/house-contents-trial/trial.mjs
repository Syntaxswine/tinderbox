// What does it change if a house's contents are fuel? A trial on the shipped Catalogue Street.
// The contents patch (contents-patch.mjs) is applied in memory; the checkout is not edited.
// One real match is struck on an outside wall of Hopkins 15, once on a wall of its kitchen and once
// on a wall of its sitting room, for each variant of contents. The run lasts 165 s, past the 150 s
// clock that retires a house's sections.
//   node docs/reviews/evidence/house-contents-trial/trial.mjs            (all variants, about 3 minutes)
//   node docs/reviews/evidence/house-contents-trial/trial.mjs --child '<json>'   (one run; used by the parent)
import {spawn} from 'node:child_process';
import {fileURLToPath, pathToFileURL} from 'node:url';
import fs from 'node:fs';
import path from 'node:path';
import {CONTENTS_PATCH, LOTS_TAP, PROFILES, SLOW_SHELL_PATCH} from './contents-patch.mjs';

const here = path.dirname(fileURLToPath(import.meta.url)), root = path.resolve(here, '../../../..');
const HOUSE = 'hopkins-fifteen', SECONDS = 165;
const VARIANTS = [
  {name: 'shell only (today)', contents: {}},
  {name: 'furniture, varnished', contents: {furniture: true}},
  {name: 'furniture, all lacquered', contents: {furniture: true, lacquer: 'all'}},
  {name: 'furniture + oil cans', contents: {furniture: true, oil: true}},
  {name: 'furniture + coal bins', contents: {furniture: true, coal: true}},
  {name: 'all three, 1 piece in 4 lacquered', contents: {furniture: true, lacquer: 'some', oil: true, coal: true}},
  // The what-if: the timber shell spreads six times more slowly; contents keep their pace.
  {name: 'SLOW SHELL x6, shell only', contents: {}, slow: 6},
  {name: 'SLOW SHELL x6, furniture varnished', contents: {furniture: true}, slow: 6},
  {name: 'SLOW SHELL x6, all three, 1 in 4 lacquered', contents: {furniture: true, lacquer: 'some', oil: true, coal: true}, slow: 6}
];
const STRIKES = ['kitchen', 'sitting'];
const round = (v, d = 2) => v === null || v === undefined || !Number.isFinite(v) ? null : +v.toFixed(d);

async function child({contents, strike}) {
  const load = file => import(pathToFileURL(path.join(root, file)).href);
  const {createSimulation, DEFAULT_CONFIG} = await load('src/simulation/index.js');
  const {NEIGHBORHOOD_SCENARIO} = await load('src/content/neighborhood.js');
  const {surfaceOutput} = await load('src/simulation/surface-fire.js');
  const STEP = DEFAULT_CONFIG.step;
  const make = player => createSimulation({seed: 1893, config: {input: {cameraRelative: false}},
    scenario: {...NEIGHBORHOOD_SCENARIO, actors: [], player: {...NEIGHBORHOOD_SCENARIO.player, ...player, tool: 'matches'}}});
  const lotOf = () => globalThis.__lots.findLast(lot => lot.building.id === HOUSE);
  const inside = (polygon, x, z) => {
    let hit = false;
    for (let i = 0, j = polygon.length - 1; i < polygon.length; j = i++) {
      const [xi, zi] = polygon[i], [xj, zj] = polygon[j];
      if (zi > z !== zj > z && x < (xj - xi) * (z - zi) / (zj - zi) + xi) hit = !hit;
    }
    return hit;
  };
  const roomWalls = (lot, room) => lot.panels.filter(panel => panel.level === 0 && panel.low &&
    inside(room.polygon, panel.x - panel.nx * .3, panel.z - panel.nz * .3));

  // A dry run to read the topology, then try each wall of the room until a real match lights it.
  let sim = make({}); sim.advance(STEP);
  let lot = lotOf();
  const room = lot.plan.floors[0].rooms.find(r => r.type === strike);
  const candidates = roomWalls(lot, room).map(panel => ({edge: panel.id, x: panel.low.world.x, y: panel.low.world.z, nx: panel.low.world.nx, ny: panel.low.world.nz}));
  sim.dispose();
  let struck = null, t0 = null, snapshot;
  for (const wall of candidates) {
    // A wall behind a porch or beside a neighbour has no legal place to stand; try the next one.
    try { sim = make({x: wall.x + wall.nx * .7, y: wall.y + wall.ny * .7}); } catch { continue; }
    sim.advance(STEP); sim.dispatch({type: 'pause', paused: false});
    sim.dispatch({type: 'aim', x: wall.x, y: wall.y}); sim.dispatch({type: 'primary', pressed: true});
    snapshot = sim.advance(STEP); sim.dispatch({type: 'primary', pressed: false});
    const use = snapshot.events.find(event => event.type === 'tool-use');
    if (use?.result === 'ignited' && snapshot.events.some(event => event.type === 'structure-ignition' && event.buildingId === HOUSE)) {
      struck = wall; t0 = snapshot.clocks.world; break;
    }
    sim.dispose();
  }
  if (!struck) { console.log(JSON.stringify({error: 'no wall of the ' + strike + ' could be lit by a match', tried: candidates.length})); return; }
  lot = lotOf();
  const sites = lot.sites, seen = new Set();
  const others = {}, hrr = [];
  let peakBurning = 0, peakRate = 0, peakRateAt = null, firstRetired = null, destroyedAt = null, coalAtRetire = null, rate = 0;
  for (let i = 0; i < SECONDS / STEP; i++) {
    const time = snapshot.clocks.world;
    for (const event of snapshot.events) {
      if (seen.has(event.id)) continue; seen.add(event.id);
      if (event.type === 'structure-ignition' && event.buildingId !== HOUSE) others[event.buildingId] ??= round(time - t0);
      if (event.type === 'building-section-burnout' && event.buildingId === HOUSE && firstRetired === null) {
        firstRetired = round(time - t0);
        coalAtRetire = sites.filter(site => site.contents === 'coal' && site.phase === 'burning')
          .map(site => ({room: site.room, 'seconds of burn left': round(site.fuel.seconds - (time - site.ignitedAt), 1)}));
      }
      if (event.type === 'building-burnout' && event.buildingId === HOUSE) destroyedAt = round(time - t0);
    }
    let burning = 0; rate = 0;
    for (const site of sites) if (site.phase === 'burning') { burning++; rate += site.area * surfaceOutput(site, time); }
    if (burning > peakBurning) peakBurning = burning;
    if (rate > peakRate) { peakRate = rate; peakRateAt = time - t0; }
    if (i % 60 === 0) hrr.push(round(rate, 1));
    snapshot = sim.advance(STEP);
  }
  const lit = sites.filter(site => site.ignitedAt !== null).map(site => site.ignitedAt - t0).sort((a, b) => a - b);
  const at = share => lit.length >= Math.ceil(share * sites.length) ? round(lit[Math.ceil(share * sites.length) - 1]) : null;
  const first = filter => { const times = sites.filter(site => filter(site) && site.ignitedAt !== null).map(site => site.ignitedAt - t0); return times.length ? round(Math.min(...times)) : null; };
  const fuelLoad = list => list.reduce((sum, site) => sum + site.area * (site.fuel.output ?? 1) * site.fuel.seconds, 0);
  const contentsSites = sites.filter(site => site.contents);
  console.log(JSON.stringify({
    struck: struck.edge, sites: sites.length, contentsSites: contentsSites.length,
    'half the house alight (s)': at(.5), '90% alight (s)': at(.9), 'never lit': sites.length - lit.length,
    'upper floor reached (s)': first(site => site.level === 1), 'roof reached (s)': first(site => site.layer === 'roof'),
    'peak sites burning': peakBurning, 'peak heat rate': round(peakRate, 1), 'at (s)': round(peakRateAt, 1),
    'fuel load': round(fuelLoad(sites), 0), 'contents share of load': round(fuelLoad(contentsSites) / fuelLoad(sites), 3),
    'first section retires (s)': firstRetired, 'house gone (s)': destroyedAt,
    'coal still burning at the first retirement': coalAtRetire, 'other houses first lit (s)': others,
    contents: contentsSites.map(site => ({room: site.room, kind: site.contents, 'lit (s)': site.ignitedAt === null ? null : round(site.ignitedAt - t0)})),
    hrr
  }));
  sim.dispose();
}

function run(variant, strike) {
  return new Promise(resolve => {
    const hasContents = Object.keys(variant.contents).length > 0;
    const env = {...process.env, TB_CONTENTS: JSON.stringify(variant.contents), TB_SHELL_SLOW: String(variant.slow ?? 1),
      TB_PATCHES: JSON.stringify([...(hasContents ? [CONTENTS_PATCH] : []), ...(variant.slow ? [SLOW_SHELL_PATCH] : []), LOTS_TAP])};
    const proc = spawn(process.execPath, ['--import', pathToFileURL(path.join(here, 'hook.mjs')).href, fileURLToPath(import.meta.url),
      '--child', JSON.stringify({contents: variant.contents, strike})], {env, stdio: ['ignore', 'pipe', 'pipe']});
    let out = '', err = '';
    proc.stdout.on('data', chunk => out += chunk); proc.stderr.on('data', chunk => err += chunk);
    proc.on('close', code => {
      const line = out.trim().split('\n').at(-1);
      let result; try { result = JSON.parse(line); } catch { result = {error: (err || out).trim().split('\n').slice(-3).join(' | '), code}; }
      resolve({variant: variant.name, strike, ...result});
    });
  });
}

if (process.argv[2] === '--child') await child(JSON.parse(process.argv[3]));
else {
  const jobs = VARIANTS.flatMap(variant => STRIKES.map(strike => [variant, strike])), results = [];
  for (let i = 0; i < jobs.length; i += 4) results.push(...await Promise.all(jobs.slice(i, i + 4).map(([variant, strike]) => run(variant, strike))));
  fs.mkdirSync(path.join(here, 'results'), {recursive: true});
  fs.writeFileSync(path.join(here, 'results', 'trial.json'), JSON.stringify({house: HOUSE, seconds: SECONDS, profiles: PROFILES, results}, null, 1) + '\n');
  const columns = ['sites', 'contentsSites', 'half the house alight (s)', '90% alight (s)', 'never lit', 'upper floor reached (s)', 'roof reached (s)',
    'peak sites burning', 'peak heat rate', 'at (s)', 'contents share of load', 'first section retires (s)', 'house gone (s)'];
  for (const strike of STRIKES) {
    console.log('\n== one match on an outside wall of the ' + strike + (strike === 'sitting' ? ' room' : '') + ' of Hopkins 15 ==');
    for (const r of results.filter(r => r.strike === strike)) {
      if (r.error) { console.log(r.variant + ': ERROR ' + r.error); continue; }
      console.log('\n' + r.variant + ' (wall ' + r.struck + ')');
      console.log('  ' + columns.map(c => c + ' ' + r[c]).join(' | '));
      if (r.contents.length) console.log('  contents lit: ' + r.contents.map(c => c.room + ' ' + c.kind + ' ' + (c['lit (s)'] ?? 'never')).join(', '));
      if (r['coal still burning at the first retirement']?.length) console.log('  coal still burning when the first section retires: ' + JSON.stringify(r['coal still burning at the first retirement']));
      console.log('  other houses first lit (s): ' + JSON.stringify(r['other houses first lit (s)']));
    }
  }
}
