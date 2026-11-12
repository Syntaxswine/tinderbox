// r04: thrown lanterns against the houses, through the public entry point only. One house alone on paving.
// For every legal stance on a ring around the house and three throw lengths that end past the wall line:
//   - does the aim preview's impact equal the real impact (position and height)?
//   - what did the throw do: light the structure, lay a burning pool, or nothing at all (a "dud": the lantern is
//     spent, no fuel pool is laid and nothing ignites within 3 s)?
//   - did the lantern come to rest inside the house (inside a ground-storey room, > 0.25 m from every outside wall)?
// Control: the same throws on tip2 (26931d9), where tool collision was the coarse box.
// Run: TB_TREES=<dir with tip2/> node r04-lantern-sweep.mjs [prefab filter]
import {HEAD, TIP2, load, houseWorld, r} from './lib.mjs';
const filter = process.argv[2];
const SIZE = 40, AFTER = 3;
const CASES = [
  ...[0, 1, 2, 3].map(q => ['hopkins-4-09', q]), ...[0, 1, 2, 3].map(q => ['hopkins-4-13', q]),
  ['hopkins-4-12', 0], ['hopkins-4-15', 0], ['monroe-row', 0], ['ashland-worker', 0]
].filter(([id, q]) => (!filter || id.includes(filter)) && (!process.env.R04_TURNS || process.env.R04_TURNS.includes(String(q))));   // R04_TURNS=0 keeps quarter turn 0 only (used by r15)

async function sweep(root, label) {
  const api = await load(root);
  const {inRoom, exteriorPlanEdges} = await import(root + 'content/housing-envelope.js');
  const totals = [];
  for (const [prefabId, quarterTurns] of CASES) {
    const plan = api.HOUSING_PLANS[prefabId];
    const centre = api.buildingPoint({x: 0, y: 0, quarterTurns}, {x: plan.width / 2, y: plan.depth / 2});
    const placement = {id: 'house', prefabId, x: 20 - centre.x, y: 20 - centre.y, quarterTurns};
    const {obstacles, buildings: [building]} = api.compileBuildings([placement]);
    const box = obstacles.find(o => o.role === 'foundation');
    const toLocal = p => api.buildingPoint({x: 0, y: 0, quarterTurns: (4 - quarterTurns) % 4}, {x: p.x - building.x, y: p.y - building.y});
    const edges = exteriorPlanEdges(plan.floors[0]);
    const insideHouse = p => {
      const l = toLocal(p), point = [l.x, l.y];
      if (!plan.floors[0].rooms.some(room => inRoom(point, room.polygon))) return false;
      return edges.every(({a, b}) => {
        const dx = b[0] - a[0], dz = b[1] - a[1], t = Math.max(0, Math.min(1, ((l.x - a[0]) * dx + (l.y - a[1]) * dz) / (dx * dx + dz * dz)));
        return Math.hypot(l.x - a[0] - dx * t, l.y - a[1] - dz * t) > .25;
      });
    };
    const count = {throws: 0, skipped: 0, structure: 0, pool: 0, dud: 0, inside: 0, previewOff: 0, noImpact: 0}, examples = {dud: [], inside: [], previewOff: []};
    const sides = [[1, 0], [-1, 0], [0, 1], [0, -1]];
    for (const [nx, ny] of sides) {
      const half = nx ? box.depth / 2 : box.width / 2, reach = nx ? box.width / 2 : box.depth / 2;
      for (let along = -half - 1; along <= half + 1 + 1e-9; along += 1) for (const standoff of [1.2, 2.5, 4.0]) for (const beyond of [.3, 1.2, 2.5]) {
        const range = standoff + beyond;
        if (range > 6) continue;
        const player = {x: box.x + nx * (reach + standoff) - ny * along, y: box.y + ny * (reach + standoff) + nx * along, tool: 'molotov'};
        let sim;
        try { sim = api.createSimulation({scenario: houseWorld(api, [placement], {player, size: SIZE}), config: {input: {cameraRelative: false}, fire: {damagePerSecond: 0}, events: {capacity: 1024}}}); }
        catch { count.skipped++; continue; }
        count.throws++;
        const m = .12 + .88 * range / 6;
        sim.dispatch({type: 'primary', pressed: true}); sim.dispatch({type: 'primary', pressed: false});
        sim.dispatch({type: 'move', x: -nx * m, y: -ny * m}); sim.dispatch({type: 'move', x: 0, y: 0});
        const aimed = sim.advance(api.STEP), preview = aimed.player.lanternAim?.impact;
        sim.dispatch({type: 'primary', pressed: true}); sim.advance(api.STEP); sim.dispatch({type: 'primary', pressed: false});
        let impact = null, impactTime = null, structure = [], ground = 0, last;
        for (let i = 0; i < 60 * (2 + AFTER); i++) {
          last = sim.advance(api.STEP);
          for (const e of last.events) if (e.tick === last.tick) {
            if (e.type === 'molotov-impact') { impact = e; impactTime = last.clocks.world; }
            else if (e.type === 'structure-ignition') structure.push(e.siteId.split('/')[1] + '<' + e.cause);
            else if (e.type === 'ignition') ground++;
          }
          if (impactTime !== null && last.clocks.world > impactTime + AFTER) break;
        }
        const poolFuel = last.diagnostics.fuel.molotovFuel;
        const note = () => `stance(${r(player.x, 2)},${r(player.y, 2)}) dir(${-nx},${-ny}) range ${r(range, 2)} impact ${impact ? `world(${r(impact.x)},${r(impact.y)}) h=${r(impact.h)} local(${r(toLocal(impact).x)},${r(toLocal(impact).y)})` : 'none'} pool=${poolFuel}`;
        if (!impact) { count.noImpact++; sim.dispose(); continue; }
        if (!preview || Math.hypot(preview.x - impact.x, preview.y - impact.y) > 1e-6 || Math.abs(preview.h - impact.h) > 1e-6) { count.previewOff++; if (examples.previewOff.length < 4) examples.previewOff.push(note() + ` preview ${preview ? `(${r(preview.x)},${r(preview.y)}) h=${r(preview.h)}` : 'none'}`); }
        if (structure.length) count.structure++;
        else if (ground) count.pool++;
        else { count.dud++; if (examples.dud.length < 6) examples.dud.push(note()); }
        if (insideHouse(impact)) { count.inside++; if (examples.inside.length < 4) examples.inside.push(note()); }
        sim.dispose();
      }
    }
    totals.push({prefabId, quarterTurns, ...count});
    console.log(`${label} ${prefabId} q${quarterTurns}: throws ${count.throws} (stances skipped ${count.skipped}) -> structure lit ${count.structure}, pool fire only ${count.pool}, DUD ${count.dud}, came to rest inside ${count.inside}, preview != flight ${count.previewOff}, never landed ${count.noImpact}`);
    for (const [kind, list] of Object.entries(examples)) for (const line of list) console.log(`    ${kind}: ${line}`);
  }
  return totals;
}
const head = await sweep(HEAD, 'HEAD');
const tip = process.env.TB_TREES ? await sweep(TIP2, 'tip2') : [];
const sum = (rows, key) => rows.reduce((n, row) => n + row[key], 0);
for (const [label, rows] of [['HEAD', head], ['tip2', tip]]) if (rows.length) {
  console.log(`TOTAL ${label}: throws ${sum(rows, 'throws')}, structure lit ${sum(rows, 'structure')}, pool fire only ${sum(rows, 'pool')}, dud ${sum(rows, 'dud')}, inside ${sum(rows, 'inside')}, preview != flight ${sum(rows, 'previewOff')}`);
}
