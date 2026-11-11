// r01: structural census of the house fire graph on this tree, for every prefab, quarter turn and party-wall variant.
// Run: node r01-topology-census.mjs            (from this directory; no environment needed)
// Reports per variant: floor patches (count, total/min area, min radius), duplicate ids, sites with no links,
// graph components, floor-level components, wall panels with no floor link, stair links, deck pieces.
// Control: the same census on tip2 (26931d9) when TB_TREES is set, for the wall->floor link and component counts.
import {HEAD, TIP2, r} from './lib.mjs';

async function census(root, label) {
  const {HOUSING_PLANS} = await import(root + 'content/housing-plans.js');
  const {compileBuildings, buildingPoint, localHousingFootprints} = await import(root + 'content/buildings.js');
  const {createHousingTopology} = await import(root + 'simulation/housing-topology.js');
  const {DEFAULT_CONFIG} = await import(root + 'simulation/config.js');
  const rows = [], problems = [];
  let variants = 0;
  for (const prefabId of Object.keys(HOUSING_PLANS)) for (let quarterTurns = 0; quarterTurns < 4; quarterTurns++) {
    const plan = HOUSING_PLANS[prefabId];
    const first = {id: 'a', prefabId, x: 24, y: 24, quarterTurns};
    const placements = prefabId === 'monroe-row'
      ? [first, {id: 'b', prefabId, ...buildingPoint(first, {x: plan.width, y: 0}), quarterTurns}, {id: 'c', prefabId, ...buildingPoint(first, {x: 2 * plan.width, y: 0}), quarterTurns}]
      : [first];
    const compiled = compileBuildings(placements).buildings;
    const cases = prefabId === 'monroe-row' ? [compileBuildings([first]).buildings[0], ...compiled] : compiled;
    for (const building of cases) {
      variants++;
      const tag = `${prefabId} q${quarterTurns} party=${building.partyWalls.left ? 'L' : '-'}${building.partyWalls.right ? 'R' : '-'}`;
      const topo = createHousingTopology(building, plan, localHousingFootprints(prefabId, building.partyWalls), DEFAULT_CONFIG);
      const {sites, panels, porch} = topo;
      const ids = sites.map(s => s.id), dup = ids.filter((id, i) => ids.indexOf(id) !== i);
      if (dup.length) problems.push(`${tag}: duplicate site ids ${dup.join(' ')}`);
      const unlinked = sites.filter(s => !s.links.length);
      if (unlinked.length) problems.push(`${tag}: ${unlinked.length} sites with no links: ${unlinked.map(s => s.id).join(' ')}`);
      // components of the whole graph
      const seen = new Set(); let components = 0; const sizes = [];
      for (const s of sites) {
        if (seen.has(s)) continue; components++;
        const queue = [s]; seen.add(s); let n = 0;
        for (const q of queue) { n++; for (const {target} of q.links) if (!seen.has(target)) { seen.add(target); queue.push(target); } }
        sizes.push(n);
      }
      if (components > 1) problems.push(`${tag}: graph has ${components} components, sizes ${sizes.join('/')}`);
      const floorSites = sites.filter(s => s.id.startsWith('floor:'));
      const levels = [...new Set(floorSites.map(s => s.level))];
      const perLevel = levels.map(level => {
        const mine = floorSites.filter(s => s.level === level), seenL = new Set(); let comps = 0;
        for (const s of mine) {
          if (seenL.has(s)) continue; comps++;
          const queue = [s]; seenL.add(s);
          for (const q of queue) for (const {target} of q.links) if (target.id.startsWith('floor:') && target.level === level && !seenL.has(target)) { seenL.add(target); queue.push(target); }
        }
        const areas = mine.map(s => s.area), radii = mine.map(s => s.floorRadius ?? NaN);
        return {level, n: mine.length, area: r(areas.reduce((a, b) => a + b, 0)), minArea: r(Math.min(...areas), 4), minRadius: r(Math.min(...radii), 4), comps};
      });
      // wall panels: floor link present?
      let wood = 0, noFloor = 0; const noFloorIds = [];
      for (const panel of panels) {
        if (!panel.low) continue; wood++;
        if (!panel.low.links.some(({target}) => target.id.startsWith('floor:'))) { noFloor++; noFloorIds.push(panel.low.id); }
      }
      if (noFloor) problems.push(`${tag}: ${noFloor}/${wood} wood wall panels have no floor link: ${noFloorIds.slice(0, 6).join(' ')}${noFloor > 6 ? ' ...' : ''}`);
      const stairLinks = floorSites.flatMap(s => s.links.filter(({target}) => target.id.startsWith('floor:') && target.level === s.level + 1).map(l => `${s.id}->${l.target.id}`));
      const wantStairs = plan.floors.filter((f, level) => f.stairs && plan.floors[level + 1]).length;
      if (stairLinks.length !== wantStairs) problems.push(`${tag}: ${stairLinks.length} stair links, plan has ${wantStairs} stairs with a floor above`);
      const deck = porch instanceof Map ? [...porch].map(([role, v]) => `${role}:${Array.isArray(v) ? v.length + 'x' + r(v[0].area, 3) : '1x' + r(v.area, 3)}`).join(' ') : '';
      rows.push(`${tag.padEnd(34)} sites=${String(sites.length).padStart(3)} comps=${components} ` +
        perLevel.map(l => `L${l.level}[n=${l.n} A=${l.area} minA=${l.minArea} minR=${l.minRadius} comps=${l.comps}]`).join(' ') +
        ` woodPanels=${wood} noFloorLink=${noFloor} stair=${stairLinks.length}/${wantStairs} deck{${deck}}`);
    }
  }
  console.log(`== ${label}: ${variants} variants`);
  for (const row of rows) console.log(row);
  console.log(`-- ${label}: ${problems.length} problems`);
  for (const p of problems) console.log('  ' + p);
}
await census(HEAD, 'HEAD c855e62');
if (process.env.TB_TREES) await census(TIP2, 'tip2 26931d9 (control)');
