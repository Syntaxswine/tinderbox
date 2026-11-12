// r11: tool blockers while a set-back house is falling down. Hopkins 9 and Hopkins 13, alone on paving, each
// quarter turn. One match on a wall; from the first section retirement until the house is gone, every 0.25 s:
//   (1) every live collider fragment belongs to a section that is still standing;
//   (2) every authored blocker ("heat volume") attached to a live fragment lies inside that fragment's section
//       bounds (so nothing blocks the air where a section has already fallen), and no blocker is attached to a
//       retired fragment that is still in the obstacle list;
//   (3) the wall blockers of the standing sections add up to the wall length that should still stand
//       (authored ground-storey wall strips clipped to the standing sections), so nothing standing became passable;
//   (4) behaviour: a horizontal tool ray at flamethrower height (1.05 m) fired from 6 m out through the middle of
//       every RETIRED section toward the house centre must not be stopped inside that section's bounds.
// Teeth: with TB_EXTRA set to mutant H05 (collapse does not clip the blockers) this probe must report problems.
// The blockers are read through the same module the simulation uses (geometry.js elevatedBlockers) on the live
// obstacle list from the read-only tap. Run: node r11-collapse-blockers.mjs
import {HEAD, TAPS, underPatches, load, houseWorld, r} from './lib.mjs';
underPatches(import.meta.url, TAPS);
const api = await load(HEAD);
const {elevatedBlockers, firstHeatContact} = await import(HEAD + 'simulation/geometry.js');
const {housingSectionBounds, housingSectionGrid} = await import(HEAD + 'content/housing-sections.js');
const {exteriorPlanEdges} = await import(HEAD + 'content/housing-envelope.js');
let problems = 0, samples = 0, rays = 0, volumesChecked = 0;
for (const prefabId of ['hopkins-4-09', 'hopkins-4-13']) for (const quarterTurns of [0, 1, 2, 3]) {
  const plan = api.HOUSING_PLANS[prefabId], grid = housingSectionGrid(prefabId);
  const centre = api.buildingPoint({x: 0, y: 0, quarterTurns}, {x: plan.width / 2, y: plan.depth / 2});
  const placement = {id: 'house', prefabId, x: 20 - centre.x, y: 20 - centre.y, quarterTurns};
  const toWorld = p => api.buildingPoint(placement, {x: p[0], y: p[1]});
  const toLocal = p => { const l = api.buildingPoint({x: 0, y: 0, quarterTurns: (4 - quarterTurns) % 4}, {x: p.x - placement.x, y: p.y - placement.y}); return [l.x, l.y]; };
  const strikeLocal = prefabId === 'hopkins-4-09' ? {stand: [7.75, 5.5], aim: [6.95, 5.5]} : {stand: [-.75, 2.5], aim: [.05, 2.5]};
  globalThis.__lots = [];
  const sim = api.createSimulation({scenario: houseWorld(api, [placement], {player: {...toWorld(strikeLocal.stand), tool: 'matches'}, size: 40}), config: {input: {cameraRelative: false}, fire: {damagePerSecond: 0}}});
  const lot = globalThis.__lots.at(-1), state = globalThis.__tb.state;
  const aim = toWorld(strikeLocal.aim);
  sim.dispatch({type: 'aim', x: aim.x, y: aim.y}); sim.dispatch({type: 'primary', pressed: true}); sim.advance(api.STEP); sim.dispatch({type: 'primary', pressed: false});
  const edges = exteriorPlanEdges(plan.floors[0]);
  const clipLength = (e, b) => {            // length of wall-line edge e inside section bounds b
    let lo = 0, hi = 1;
    for (const [p0, d, min, max] of [[e.a[0], e.b[0] - e.a[0], b.minX, b.maxX], [e.a[1], e.b[1] - e.a[1], b.minZ, b.maxZ]]) {
      if (Math.abs(d) < 1e-12) { if (p0 < min - 1e-9 || p0 > max + 1e-9) return 0; continue; }
      const t0 = (min - p0) / d, t1 = (max - p0) / d; lo = Math.max(lo, Math.min(t0, t1)); hi = Math.min(hi, Math.max(t0, t1));
    }
    return Math.max(0, hi - lo) * e.length;
  };
  let retiredSeen = 0, firstRetire = null, done = false, snapshot;
  for (let i = 0; i < 175 * 4 && !done; i++) {
    snapshot = sim.advance(.25);
    const present = lot.sections.map(s => s.view.present), gone = present.filter(p => !p).length;
    if (!gone) continue;
    firstRetire ??= snapshot.clocks.world; retiredSeen = Math.max(retiredSeen, gone);
    if (lot.building.destroyed) { done = true; break; }
    samples++;
    const boxes = state.obstacles.filter(o => o.buildingId === 'house' && !o.destroyed);
    for (const box of boxes) {
      if (box.catalogueSection === undefined) { if (problems++ < 6) console.log(`  (1) ${prefabId} q${quarterTurns} t=${r(snapshot.clocks.world, 2)}: whole-house collider ${box.id} still live after a retirement`); continue; }
      if (!present[box.catalogueSection]) { if (problems++ < 6) console.log(`  (1) ${prefabId} q${quarterTurns} t=${r(snapshot.clocks.world, 2)}: fragment ${box.id} of a retired section is live`); }
      const bounds = housingSectionBounds(grid, box.catalogueSection);
      for (const shape of elevatedBlockers(box) ?? []) {
        volumesChecked++;
        for (const vertex of shape.vertices) {
          const [x, z] = toLocal(vertex);
          if (x < bounds.minX - 1e-6 || x > bounds.maxX + 1e-6 || z < bounds.minZ - 1e-6 || z > bounds.maxZ + 1e-6) { if (problems++ < 6) console.log(`  (2) ${prefabId} q${quarterTurns}: ${shape.surface} blocker of ${box.id} reaches local (${r(x)},${r(z)}) outside its section`); break; }
        }
      }
    }
    // (3) expected standing wall length vs wall blockers present (sum of longest side of each ground-storey wall shape; diagonal strips use their true length)
    let expected = 0, actual = 0;
    for (const [index, section] of lot.sections.entries()) if (present[index]) for (const e of edges) expected += clipLength(e, section.bounds);
    for (const box of boxes) if (box.role === 'foundation') for (const shape of elevatedBlockers(box) ?? []) if (shape.surface === 'wall' && shape.bottom < plan.plinth + 1) {
      const v = shape.vertices, sides = v.map((p, k) => Math.hypot(p.x - v[(k + 1) % v.length].x, p.y - v[(k + 1) % v.length].y));
      actual += Math.max(...sides);
    }
    // wall strips are extended by half their thickness nowhere, but clipping a strip at a corner section can shorten or split it by up to the strip width per cut
    if (Math.abs(expected - actual) > .17 * Math.max(1, boxes.length)) { if (problems++ < 6) console.log(`  (3) ${prefabId} q${quarterTurns} t=${r(snapshot.clocks.world, 2)}: standing wall line ${r(expected, 2)} m, wall blockers ${r(actual, 2)} m`); }
    // (4) rays
    const mid = [plan.width / 2, plan.depth / 2];
    for (const [index, section] of lot.sections.entries()) {
      const b = section.bounds, cx = (Math.max(0, b.minX) + Math.min(plan.width, b.maxX)) / 2, cz = (Math.max(0, b.minZ) + Math.min(plan.depth, b.maxZ)) / 2;
      const dx = cx - mid[0], dz = cz - mid[1], d = Math.hypot(dx, dz) || 1;
      const from = toWorld([cx + dx / d * 6, cz + dz / d * 6]), to = toWorld([cx, cz]);
      const contact = firstHeatContact(from, to, state.obstacles, 1.05, 1.05); rays++;
      const hit = contact ? toLocal({x: from.x + (to.x - from.x) * contact.t, y: from.y + (to.y - from.y) * contact.t}) : null;
      const insideSection = hit && hit[0] > b.minX + 1e-6 && hit[0] < b.maxX - 1e-6 && hit[1] > b.minZ + 1e-6 && hit[1] < b.maxZ - 1e-6;
      if (!present[index] && insideSection) { if (problems++ < 6) console.log(`  (4) ${prefabId} q${quarterTurns} t=${r(snapshot.clocks.world, 2)}: ray stopped by ${contact.volume?.surface ?? 'box'} inside retired section ${index} at local (${r(hit[0])},${r(hit[1])})`); }
    }
  }
  console.log(`${prefabId} q${quarterTurns}: first retirement ${r(firstRetire, 2)} s, house gone ${r(snapshot.clocks.world, 2)} s, most sections down while sampled ${retiredSeen}/${lot.sections.length}`);
  sim.dispose();
}
console.log(`${samples} partial-collapse samples, ${volumesChecked} blocker shapes checked against their section, ${rays} rays: ${problems} problems`);
