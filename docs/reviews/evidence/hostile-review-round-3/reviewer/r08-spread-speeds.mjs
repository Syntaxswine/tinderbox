// r08: how fast does fire actually move along each kind of link in a house, in m/s, and how wrong is the
// straight-line travel time between floor patch anchors?
// One house alone on paving (no ground fire). One match on a ground-storey wall panel (public input), then run 40 s.
// Every site's ignition time and parent come from the read-only tap. For each parent -> child ignition the delay
// and the straight distance between the two anchors give a speed. Classes:
//   floor>floor same storey, floor>floor up the stairs, wall>wall along, wall>wall up, wall>floor, floor>wall,
//   deck>deck, deck/stairs, wall>eave>roof, roof>roof.
// Second table: for every floor-to-floor link of the same storey, the shortest path that stays on the two oak
// patches (Dijkstra on a 5 cm grid over the two patches) against the straight chord the runtime uses.
// Control: tip2 (26931d9) speeds. Run: TB_TREES=<dir with tip2/> node r08-spread-speeds.mjs
import {HEAD, TIP2, TAPS, underPatches, load, houseWorld, r} from './lib.mjs';
underPatches(import.meta.url, TAPS);
const median = list => { const s = [...list].sort((a, b) => a - b); return s.length ? s[s.length >> 1] : NaN; };
const STRIKES = {   // local stance offsets are found by walking the outline: stand 0.75 m outside the middle of a long flush wall
  'hopkins-4-12': {wall: [8, 3.5], n: [1, 0]}, 'hopkins-4-15': {wall: [10, 5.5], n: [1, 0]}, 'hopkins-4-09': {wall: [7, 5.5], n: [1, 0]},
  'hopkins-4-13': {wall: [0, 2.5], n: [-1, 0]}, 'monroe-row': {wall: [2.7, 0], n: [0, -1]}, 'ashland-worker': {wall: [6, 3.5], n: [1, 0]}
};

async function measure(root, label, geodesic) {
  const api = await load(root);
  const floorsModule = geodesic ? await import(root + 'content/housing-floors.js') : null;
  const {housingSectionGrid} = await import(root + 'content/housing-sections.js');
  console.log(`\n== ${label}: one match on a wall, 40 s, per-link speeds in m/s as min / median / max (count)`);
  for (const [prefabId, strike] of Object.entries(STRIKES)) {
    const plan = api.HOUSING_PLANS[prefabId];
    const placement = {id: 'house', prefabId, x: 20 - plan.width / 2, y: 20 - plan.depth / 2, quarterTurns: 0};
    const stand = .75;
    const player = {x: placement.x + strike.wall[0] + strike.n[0] * stand, y: placement.y + strike.wall[1] + strike.n[1] * stand, tool: 'matches'};
    globalThis.__lots = [];
    const sim = api.createSimulation({scenario: houseWorld(api, [placement], {player, size: 40}), config: {input: {cameraRelative: false}, fire: {damagePerSecond: 0}, events: {capacity: 4096}}});
    const lot = globalThis.__lots.at(-1), byId = new Map(lot.sites.map(s => [s.id, s]));
    sim.dispatch({type: 'aim', x: player.x - strike.n[0] * .8, y: player.y - strike.n[1] * .8});
    sim.dispatch({type: 'primary', pressed: true});
    const first = sim.advance(api.STEP); sim.dispatch({type: 'primary', pressed: false});
    const used = first.events.find(e => e.type === 'tool-use' || e.type === 'tool-rejected');
    for (let i = 0; i < 160; i++) sim.advance(.25);
    const classes = new Map(), add = (name, v) => (classes.get(name) ?? classes.set(name, []).get(name)).push(v);
    const kind = s => s.id.startsWith('floor:') ? 'floor' : s.id.startsWith('deck:') ? 'deck' : s.id.startsWith('wall:') ? 'wall' : s.id.startsWith('eave:') ? 'eave' : s.id.startsWith('roof:') ? 'roof' : 'post';
    let lit = 0;
    for (const site of lot.sites) {
      if (site.ignitedAt === null) continue; lit++;
      const parent = site.ignitionKind === 'surface-spread' ? byId.get(site.parentId) : null;
      if (!parent) continue;
      const d = Math.hypot(site.x - parent.x, site.y - parent.y, site.z - parent.z), dt = site.ignitedAt - parent.ignitedAt;
      const a = kind(parent), b = kind(site);
      let name = `${a}>${b}`;
      if (a === 'floor' && b === 'floor') name = parent.level === site.level ? 'floor>floor same storey' : 'floor>floor stairs';
      if (a === 'wall' && b === 'wall') name = Math.abs(site.y - parent.y) > .3 ? 'wall>wall up/down' : 'wall>wall along';
      add(name, d / dt); add(name + ' delay s', dt);
    }
    const floorTimes = lot.sites.filter(s => kind(s) === 'floor' && s.ignitedAt !== null);
    console.log(`${prefabId}: strike ${used?.type}:${used?.result} ${used?.cellIds?.[0] ?? ''}; sites lit ${lit}/${lot.sites.length}; floor patches lit ${floorTimes.length}/${lot.sites.filter(s => kind(s) === 'floor').length}, first ${r(Math.min(...floorTimes.map(s => s.ignitedAt)), 2)} s last ${r(Math.max(...floorTimes.map(s => s.ignitedAt)), 2)} s`);
    for (const [name, values] of [...classes].sort()) if (!name.endsWith('delay s')) {
      const delays = classes.get(name + ' delay s');
      console.log(`    ${name.padEnd(26)} ${r(Math.min(...values), 2)} / ${r(median(values), 2)} / ${r(Math.max(...values), 2)} m/s (${values.length})   delay ${r(Math.min(...delays), 2)} / ${r(median(delays), 2)} / ${r(Math.max(...delays), 2)} s`);
    }
    if (geodesic) {
      const grid = housingSectionGrid(prefabId), rows = [];
      for (const [level] of plan.floors.entries()) {
        const {patches} = floorsModule.compileFloorSupport(plan, level, grid);
        for (const a of patches) for (const b of a.neighbors) {
          if (patches.indexOf(b) < patches.indexOf(a)) continue;
          const inside = (x, z) => floorsModule.floorPatchContains(a, [x, z]) || floorsModule.floorPatchContains(b, [x, z]);
          const H = .05, key = (i, j) => i * 4096 + j, cell = v => Math.round(v / H);
          const start = key(cell(a.x), cell(a.z)), goal = key(cell(b.x), cell(b.z));
          const dist = new Map([[start, 0]]), open = [[0, cell(a.x), cell(a.z)]];
          let found = Infinity;
          while (open.length) {
            let best = 0; for (let i = 1; i < open.length; i++) if (open[i][0] < open[best][0]) best = i;
            const [d, i, j] = open.splice(best, 1)[0];
            if (key(i, j) === goal) { found = d; break; }
            if (d > dist.get(key(i, j))) continue;
            for (const [di, dj] of [[1, 0], [-1, 0], [0, 1], [0, -1], [1, 1], [1, -1], [-1, 1], [-1, -1], [2, 1], [1, 2], [-2, 1], [-1, 2], [2, -1], [1, -2], [-2, -1], [-1, -2]]) {
              const ni = i + di, nj = j + dj, k = key(ni, nj);
              if (!inside(ni * H, nj * H) || !inside((i + di / 2) * H, (j + dj / 2) * H)) continue;
              const nd = d + Math.hypot(di, dj) * H;
              if (nd < (dist.get(k) ?? Infinity)) { dist.set(k, nd); open.push([nd, ni, nj]); }
            }
          }
          const chord = Math.hypot(a.x - b.x, a.z - b.z);
          rows.push({level, a, b, chord, found, ratio: found / chord});
        }
      }
      const finite = rows.filter(x => Number.isFinite(x.found)), worst = [...finite].sort((x, y) => y.ratio - x.ratio).slice(0, 3);
      console.log(`    oak path vs straight chord over ${rows.length} same-storey floor links: median ratio ${r(median(finite.map(x => x.ratio)), 3)}, links over 1.10: ${finite.filter(x => x.ratio > 1.1).length}, over 1.5: ${finite.filter(x => x.ratio > 1.5).length}, no on-oak path found: ${rows.length - finite.length}`);
      for (const w of worst) console.log(`      worst: L${w.level} (${r(w.a.x, 2)},${r(w.a.z, 2)}) -> (${r(w.b.x, 2)},${r(w.b.z, 2)}) chord ${r(w.chord, 2)} m, on-oak path ${r(w.found, 2)} m, ratio ${r(w.ratio, 2)}; chord time ${r(w.chord / 1.17, 2)} s vs path time ${r(w.found / 1.17, 2)} s`);
      const chords = rows.map(x => x.chord);
      console.log(`    floor link chord lengths: min ${r(Math.min(...chords), 2)} m, median ${r(median(chords), 2)} m, max ${r(Math.max(...chords), 2)} m`);
    }
    sim.dispose();
  }
}
await measure(HEAD, 'HEAD c855e62', true);
if (process.env.TB_TREES) await measure(TIP2, 'tip2 26931d9 (control)', false);
