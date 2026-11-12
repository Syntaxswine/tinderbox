// r05: the flamethrower against every house, one house alone on paving, every quarter turn for the two set-back
// plans. For each legal stance on rings 0.8 / 2.0 / 3.5 m from the coarse box and three headings, hold the trigger
// for 0.2 s (12 frames: long enough to heat, too short for any site to ignite and spread) and read which fire sites
// gained heat (read-only tap on the house's site list).
// Judged against geometry written here, not the repository's blockers: the ground-storey outside walls as 0.16 m
// strips from the room plan.
//   ILLEGIT  a heated wall panel with no point of its outer face that is in front of the muzzle, inside the 4.5 m
//            22.5-degree cone (+2 cm / +1.5 degree slack) and not hidden behind another wall strip  -> lit through a wall
//   OTHER    a heated site that is neither a ground-storey wall panel nor a deck / stair section
//   MISSED   a wood panel whose face centre is plainly exposed (in front, >= 0.3 m inside range, >= 4 degrees inside
//            the cone, clear of every other wall strip and of the porch / stair boxes) that gained no heat -> blocked by air
// Control: tip2 (26931d9). Run: TB_TREES=<dir with tip2/> node r05-flame-sweep.mjs [prefab filter]
import {HEAD, TIP2, TAPS, underPatches, load, houseWorld, r} from './lib.mjs';
underPatches(import.meta.url, TAPS);
const filter = process.argv[2];
const CASES = [
  ...[0, 1, 2, 3].map(q => ['hopkins-4-09', q]), ...[0, 1, 2, 3].map(q => ['hopkins-4-13', q]),
  ['hopkins-4-12', 0], ['hopkins-4-15', 0], ['monroe-row', 0], ['ashland-worker', 0]
].filter(([id]) => !filter || id.includes(filter));
const RANGE = 4.5, HALF = Math.PI / 8;

function segmentHitsQuad(p, q, quad) {            // convex quad, any winding
  let lo = 0, hi = 1;
  const area = quad.reduce((s, a, i) => { const b = quad[(i + 1) % 4]; return s + a[0] * b[1] - a[1] * b[0]; }, 0), sign = Math.sign(area);
  for (let i = 0; i < 4; i++) {
    const a = quad[i], b = quad[(i + 1) % 4], nx = -(b[1] - a[1]) * sign, ny = (b[0] - a[0]) * sign;   // inward normal
    const s = (p[0] - a[0]) * nx + (p[1] - a[1]) * ny, e = (q[0] - a[0]) * nx + (q[1] - a[1]) * ny;
    if (s < 0 && e < 0) return false;
    if (s < 0) lo = Math.max(lo, s / (s - e)); else if (e < 0) hi = Math.min(hi, s / (s - e));
    if (lo > hi) return false;
  }
  return hi - lo > 1e-9;
}

async function sweep(root, label) {
  const api = await load(root);
  const {exteriorPlanEdges} = await import(root + 'content/housing-envelope.js');
  const rows = [];
  for (const [prefabId, quarterTurns] of CASES) {
    const plan = api.HOUSING_PLANS[prefabId];
    const centre = api.buildingPoint({x: 0, y: 0, quarterTurns}, {x: plan.width / 2, y: plan.depth / 2});
    const placement = {id: 'house', prefabId, x: 20 - centre.x, y: 20 - centre.y, quarterTurns};
    const {obstacles, buildings: [building]} = api.compileBuildings([placement]);
    const box = obstacles.find(o => o.role === 'foundation');
    const coarse = api.localHousingFootprints(prefabId).filter(b => b.role !== 'foundation')
      .map(b => [[b.x - b.width / 2, b.y - b.depth / 2], [b.x + b.width / 2, b.y - b.depth / 2], [b.x + b.width / 2, b.y + b.depth / 2], [b.x - b.width / 2, b.y + b.depth / 2]]);
    const toLocal = p => { const l = api.buildingPoint({x: 0, y: 0, quarterTurns: (4 - quarterTurns) % 4}, {x: p.x - building.x, y: p.y - building.y}); return [l.x, l.y]; };
    const strips = exteriorPlanEdges(plan.floors[0]).map(e => {
      const tx = (e.b[0] - e.a[0]) / e.length, tz = (e.b[1] - e.a[1]) / e.length, h = .08;
      return {id: e.id, e, quad: [[e.a[0] + e.nx * h, e.a[1] + e.nz * h], [e.b[0] + e.nx * h, e.b[1] + e.nz * h], [e.b[0] - e.nx * h, e.b[1] - e.nz * h], [e.a[0] - e.nx * h, e.a[1] - e.nz * h]], tx, tz};
    });
    const count = {shots: 0, skipped: 0, heatedPanels: 0, heatedDecks: 0, illegit: 0, other: 0, exposed: 0, missed: 0, unconnected: 0, maxRays: 0};
    const examples = {illegit: [], other: [], missed: []}, everHeated = new Set(), everExposed = new Set();
    for (const [nx, ny] of [[1, 0], [-1, 0], [0, 1], [0, -1]]) {
      const half = nx ? box.depth / 2 : box.width / 2, reach = nx ? box.width / 2 : box.depth / 2;
      for (let along = -half - 1; along <= half + 1 + 1e-9; along += 1) for (const standoff of [.8, 2.0, 3.5]) for (const turn of [-35, 0, 35]) {
        const player = {x: box.x + nx * (reach + standoff) - ny * along, y: box.y + ny * (reach + standoff) + nx * along, tool: 'flamethrower'};
        const heading = Math.atan2(-ny, -nx) + turn * Math.PI / 180;
        globalThis.__lots = [];
        let sim;
        try { sim = api.createSimulation({scenario: houseWorld(api, [placement], {player, size: 40}), config: {input: {cameraRelative: false}, fire: {damagePerSecond: 0}}}); }
        catch { count.skipped++; continue; }
        const lot = globalThis.__lots.at(-1);
        count.shots++;
        sim.dispatch({type: 'aim', x: player.x + Math.cos(heading) * 3, y: player.y + Math.sin(heading) * 3});
        sim.dispatch({type: 'primary', pressed: true});
        let snapshot;
        for (let i = 0; i < 12; i++) snapshot = sim.advance(api.STEP);
        if (snapshot.discharge.active) { if (!snapshot.discharge.connectRays) count.unconnected++; count.maxRays = Math.max(count.maxRays, snapshot.discharge.rays.length); }
        const P = toLocal(player), localHeading = heading - quarterTurns * Math.PI / 2;
        const inCone = (point, slackRange, slackAngle) => {
          const dx = point[0] - P[0], dz = point[1] - P[1], d = Math.hypot(dx, dz);
          let a = Math.atan2(dz, dx) - localHeading; a = Math.atan2(Math.sin(a), Math.cos(a));
          return d <= RANGE + slackRange && Math.abs(a) <= HALF + slackAngle;
        };
        const clear = (point, own) => !strips.some(s => s.id !== own && segmentHitsQuad(P, point, s.quad));
        const where = `stance local(${r(P[0], 2)},${r(P[1], 2)}) world(${r(player.x, 2)},${r(player.y, 2)}) heading ${r(heading * 180 / Math.PI, 0)}deg`;
        const heated = new Set(lot.sites.filter(s => s.heat > 0 || s.phase !== 'cold'));
        for (const site of heated) {
          if (site.id.startsWith('deck:')) { count.heatedDecks++; continue; }
          const strip = site.id.startsWith('wall:0:') && strips.find(s => site.id === `wall:0:${s.id}:0` || site.id === `wall:0:${s.id}:1`);
          if (!strip) { count.other++; if (examples.other.length < 5) examples.other.push(`${site.id} heat ${r(site.heat)} ${where}`); continue; }
          count.heatedPanels++; everHeated.add(site.id);
          const {e, tx, tz} = strip;
          let legit = false;
          for (let k = 0; k <= 20 && !legit; k++) {
            const u = (k / 20 - .5) * e.length, face = [e.x + tx * u + e.nx * .1, e.z + tz * u + e.nz * .1];
            // "In front" is measured from the real outer face (0.08 m from the wall line): a muzzle 1 cm off the face firing along it is a grazing shot, not a shot from behind.
            if ((P[0] - face[0]) * e.nx + (P[1] - face[1]) * e.nz > -.02 + 1e-6 && inCone(face, .12, 1.5 * Math.PI / 180) && clear(face, e.id)) legit = true;
          }
          if (!legit) { count.illegit++; if (examples.illegit.length < 8) examples.illegit.push(`${site.id} heat ${r(site.heat)} ${where}`); }
        }
        for (const strip of strips) {
          const {e} = strip, site = lot.sites.find(s => s.id === `wall:0:${e.id}:0`);
          if (!site) continue;
          const face = [e.x + e.nx * .1, e.z + e.nz * .1];
          if (!((P[0] - face[0]) * e.nx + (P[1] - face[1]) * e.nz > .05) || !inCone(face, -.3, -4 * Math.PI / 180) || !clear(face, e.id) || coarse.some(quad => segmentHitsQuad(P, face, quad))) continue;
          count.exposed++; everExposed.add(site.id);
          if (!heated.has(site)) { count.missed++; if (examples.missed.length < 8) examples.missed.push(`${site.id} ${where} distance ${r(Math.hypot(face[0] - P[0], face[1] - P[1]), 2)}`); }
        }
        sim.dispose();
      }
    }
    const lot = globalThis.__lots.at(-1), wood = lot.sites.filter(s => /^wall:0:.*:0$/.test(s.id)).map(s => s.id);
    const never = wood.filter(id => !everHeated.has(id));
    rows.push({prefabId, quarterTurns, ...count, wood: wood.length, never: never.length});
    console.log(`${label} ${prefabId} q${quarterTurns}: shots ${count.shots} (skipped ${count.skipped}); heated wall panels ${count.heatedPanels} of which ILLEGIT ${count.illegit}; heated deck sections ${count.heatedDecks}; OTHER sites ${count.other}; plainly exposed panels ${count.exposed} of which MISSED ${count.missed}; ` +
      `ground-storey wood panels never heated by any shot ${never.length}/${wood.length}; fans not connected ${count.unconnected}/${count.shots}, max rays ${count.maxRays}`);
    if (never.length) console.log(`    never heated: ${never.join(' ')}`);
    for (const [kind, list] of Object.entries(examples)) for (const line of list) console.log(`    ${kind}: ${line}`);
  }
  const sum = key => rows.reduce((n, row) => n + row[key], 0);
  console.log(`TOTAL ${label}: shots ${sum('shots')}, heated panels ${sum('heatedPanels')}, ILLEGIT ${sum('illegit')}, OTHER ${sum('other')}, exposed ${sum('exposed')}, MISSED ${sum('missed')}, never-heated wood panels ${sum('never')}/${sum('wood')}, unconnected fans ${sum('unconnected')}`);
}
await sweep(HEAD, 'HEAD');
if (process.env.TB_TREES) await sweep(TIP2, 'tip2');
