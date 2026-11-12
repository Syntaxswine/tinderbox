// r12: porch deck sections, every plan. One house alone, quarter turn 0 unless stated.
//  (1) static: the ground-contact edges ("fronts") of all sections of a deck must add up to exactly the deck's
//      perimeter, with no front on a cut between two sections (read-only tap on the house's ground sites);
//  (2) one match on the west end section, then on the east end section, on paving: ignition time of every deck /
//      stair section, the post and the porch roof. The two directions should mirror each other;
//  (3) one match on the stairs: when does the deck catch, and the other way round;
//  (4) grass only in a 1 m strip beside ONE end of the deck (paving elsewhere), lit by a match on the grass:
//      the nearest deck section must catch first (fire must not skip along the deck), and an end edge must take
//      heat from the ground;
//  (5) all four quarter turns of Hopkins 12 give the same deck ignition sequence.
// Control: tip2 (26931d9) for (2)-(4). Run: TB_TREES=<dir with tip2/> node r12-deck-sections.mjs
import {HEAD, TIP2, TAPS, underPatches, load, houseWorld, r} from './lib.mjs';
underPatches(import.meta.url, TAPS);
const PREFABS = ['hopkins-4-12', 'hopkins-4-15', 'hopkins-4-09', 'hopkins-4-13', 'monroe-row', 'ashland-worker'];

async function run(root, label) {
  const api = await load(root);
  console.log(`\n== ${label}`);
  function world(prefabId, quarterTurns, localPlayer, tool, patches) {
    const plan = api.HOUSING_PLANS[prefabId];
    const centre = api.buildingPoint({x: 0, y: 0, quarterTurns}, {x: plan.width / 2, y: plan.depth / 2});
    const placement = {id: 'house', prefabId, x: 20 - centre.x, y: 20 - centre.y, quarterTurns};
    const toWorld = p => api.buildingPoint(placement, {x: p[0], y: p[1]});
    const scenario = houseWorld(api, [placement], {player: {...toWorld(localPlayer), tool}, size: 40});
    if (patches) scenario.patches = patches.map(([x0, z0, x1, z1]) => {            // local rectangle -> world axis-aligned patch
      const a = toWorld([x0, z0]), b = toWorld([x1, z1]);
      return {x: Math.min(a.x, b.x), y: Math.min(a.y, b.y), width: Math.abs(a.x - b.x), depth: Math.abs(a.y - b.y), material: 'grass'};
    });
    globalThis.__lots = [];
    const sim = api.createSimulation({scenario, config: {input: {cameraRelative: false}, fire: {damagePerSecond: 0}, events: {capacity: 2048}}});
    return {sim, lot: globalThis.__lots.at(-1), toWorld, plan};
  }
  function strikeAndRun({sim, lot, toWorld}, localAim, seconds = 20) {
    const aim = toWorld(localAim);
    sim.dispatch({type: 'aim', x: aim.x, y: aim.y}); sim.dispatch({type: 'primary', pressed: true});
    const first = sim.advance(api.STEP); sim.dispatch({type: 'primary', pressed: false});
    const used = first.events.find(e => e.type === 'tool-use' || e.type === 'tool-rejected');
    for (let i = 0; i < seconds * 60; i++) sim.advance(api.STEP);
    const decks = lot.sites.filter(s => s.id.startsWith('deck:') || s.id === 'porch-post' || s.id.startsWith('roof:porch'));
    const firstRoof = decks.filter(s => s.id.startsWith('roof:porch') && s.ignitedAt !== null).reduce((m, s) => Math.min(m, s.ignitedAt), Infinity);
    const line = decks.filter(s => !s.id.startsWith('roof:')).map(s => `${s.id.replace('deck:', '')}@${s.ignitedAt === null ? '-' : r(s.ignitedAt, 2)}${s.ignitionKind && s.ignitionKind !== 'surface-spread' ? '(' + s.ignitionKind + ')' : ''}`).join(' ');
    sim.dispose();
    return `${used?.type}:${used?.result}:${(used?.cellIds ?? []).map(id => id.split('/')[1] ?? id).join('+')} | ${line} | porch roof@${Number.isFinite(firstRoof) ? r(firstRoof, 2) : '-'}`;
  }

  if (label.startsWith('HEAD')) {
    console.log('(1) fronts vs perimeter');
    for (const prefabId of PREFABS) for (const quarterTurns of [0, 1]) {
      const {sim, lot} = world(prefabId, quarterTurns, [-3, -5], 'matches');
      for (const local of lot.localBoxes.filter(b => b.role !== 'foundation')) {
        const pieces = lot.porch.get(local.role), fronts = lot.groundSites.filter(g => pieces.includes(g.site)).flatMap(g => g.fronts);
        const total = fronts.reduce((sum, f) => sum + f.span, 0), perimeter = 2 * (local.width + local.depth);
        const box = lot.obstacles.find(o => o.role === local.role);
        // every front must lie on the outline of the world box of this deck
        const off = fronts.filter(f => !(Math.abs(Math.abs(f.x - box.x) - box.width / 2) < 1e-9 || Math.abs(Math.abs(f.z - box.y) - box.depth / 2) < 1e-9)).length;
        const areas = pieces.reduce((sum, s) => sum + s.area, 0);
        console.log(`    ${prefabId} q${quarterTurns} ${local.role}: ${pieces.length} sections (${r(local.width, 3)} x ${r(local.depth, 3)} m), sum of section areas ${r(areas, 4)} vs ${r(local.width * local.depth, 4)} m2, fronts ${fronts.length}, total span ${r(total, 4)} m vs perimeter ${r(perimeter, 4)} m, fronts off the outline ${off}, heights ${[...new Set(pieces.map(s => r(s.y, 3)))].join('/')}`);
      }
      sim.dispose();
    }
  }
  console.log('(2) match on one end of the deck, paving, 20 s: section@ignition time');
  for (const prefabId of PREFABS) {
    const plan = api.HOUSING_PLANS[prefabId], p = plan.porch, zMid = p.z + p.depth / 2;
    for (const [name, stand, aim] of [['west end', [p.x - .75, zMid], [p.x + .05, zMid]], ['east end', [p.x + p.width + .75, zMid], [p.x + p.width - .05, zMid]]]) {
      try { console.log(`    ${prefabId} ${name}: ${strikeAndRun(world(prefabId, 0, stand, 'matches'), aim)}`); }
      catch (error) { console.log(`    ${prefabId} ${name}: stance not legal (${error.message})`); }
    }
  }
  console.log('(3) match on the stairs, paving, 20 s');
  for (const prefabId of PREFABS) {
    const local = api.localHousingFootprints(prefabId).find(b => b.role === 'stairs');
    const stand = [local.x, local.y - local.depth / 2 - .75], aim = [local.x, local.y - local.depth / 2 + .05];
    try { console.log(`    ${prefabId}: ${strikeAndRun(world(prefabId, 0, stand, 'matches'), aim)}`); }
    catch (error) { console.log(`    ${prefabId}: stance not legal (${error.message})`); }
  }
  console.log('(4) grass strip 1 m wide beside one END of the deck only, match on the grass, 25 s');
  for (const prefabId of ['hopkins-4-12', 'hopkins-4-15']) {
    const p = api.HOUSING_PLANS[prefabId].porch;
    for (const [name, strip, stand, aim] of [
      ['west end strip', [p.x - 1, p.z, p.x, p.z + p.depth], [p.x - 1.3, p.z + 1], [p.x - .5, p.z + 1]],
      ['east end strip', [p.x + p.width, p.z, p.x + p.width + 1, p.z + p.depth], [p.x + p.width + 1.3, p.z + 1], [p.x + p.width + .5, p.z + 1]],
      ['front strip under section 1 only', [p.x + 1, p.z - 1, p.x + 2, p.z], [p.x + 1.5, p.z - 1.3], [p.x + 1.5, p.z - .5]]]) {
      try { console.log(`    ${prefabId} ${name}: ${strikeAndRun(world(prefabId, 0, stand, 'matches', [strip]), aim, 25)}`); }
      catch (error) { console.log(`    ${prefabId} ${name}: stance not legal (${error.message})`); }
    }
  }
  if (label.startsWith('HEAD')) {
    console.log('(5) Hopkins 12, match on the west end, each quarter turn');
    const p = api.HOUSING_PLANS['hopkins-4-12'].porch;
    for (const quarterTurns of [0, 1, 2, 3]) console.log(`    q${quarterTurns}: ${strikeAndRun(world('hopkins-4-12', quarterTurns, [p.x - .75, p.z + 1], 'matches'), [p.x + .05, p.z + 1])}`);
  }
}
await run(HEAD, 'HEAD c855e62');
if (process.env.TB_TREES) await run(TIP2, 'tip2 26931d9 (control)');
