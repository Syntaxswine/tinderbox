// A trial of "a house's contents as fuel", applied IN MEMORY by hook.mjs. The checkout is never edited.
// It is evidence for an evaluation, not a proposal for this exact code: every number in PROFILES is
// an invented starting value, chosen only so the three kinds behave differently enough to measure.
//
// What it does: at the end of createHousingTopology (src/simulation/housing-topology.js) it adds one
// fire site per item of contents, placed from the plan's typed rooms, and links each to the floor
// patch under it and to that room's wall panels. Nothing else in the game changes: the new sites are
// stepped, published, sampled and retired by the code that already handles floor sites.
//
// TB_CONTENTS (JSON) picks what is placed:
//   {"furniture": true}                 one piece per room, at the room's centre
//   {"furniture": true, "lacquer": "all" | "some"}   lacquered pieces light sooner and flash
//   {"oil": true}                       a can in each kitchen and pantry
//   {"coal": true}                      a bin in each kitchen and basement service room
export const PROFILES = {
  // seconds = how long it burns; threshold = heat needed to light (wood 1.1, gas 0.6 in config.js);
  // output = heat it gives its neighbours, as a multiple of a wall panel's; gain = how strongly it
  // is coupled to its neighbours (a wall-to-wall link is 1.8); reach = how far its links go, metres.
  furniture: {seconds: 9, threshold: 'wood', output: 1, area: 1.5, gain: 1.8, reach: 2.2},
  lacquered: {seconds: 4, threshold: 'gas', output: 1.6, area: 1.5, gain: 2.6, reach: 2.2},
  oil: {seconds: 14, threshold: 'gas', output: 3, area: .3, gain: 2.6, reach: 3},
  coal: {seconds: 140, threshold: 'wood', output: 1.2, area: .6, gain: .3, reach: 1.5}
};

const ANCHOR = '  return {sites, panels, porch, porchPost, roofSeams};';
const BLOCK = `
  {
    const kinds = JSON.parse(process.env.TB_CONTENTS ?? '{}'), PROFILES = ${JSON.stringify(PROFILES)};
    const base = fuel.joinery, unit = base.seconds / 7;
    for (const [name, p] of Object.entries(PROFILES)) fuel['contents:' + name] = {...base, seconds: p.seconds * unit,
      threshold: config.fire.ignition[p.threshold], output: base.output * p.output};
    const inside = (polygon, x, z) => {
      let hit = false;
      for (let i = 0, j = polygon.length - 1; i < polygon.length; j = i++) {
        const [xi, zi] = polygon[i], [xj, zj] = polygon[j];
        if (zi > z !== zj > z && x < (xj - xi) * (z - zi) / (zj - zi) + xi) hit = !hit;
      }
      return hit;
    };
    const hash = text => [...text].reduce((h, c) => (h * 31 + c.charCodeAt(0)) >>> 0, 7);
    for (const [level, floor] of plan.floors.entries()) {
      const patches = floors[level];
      if (!patches?.size) continue;
      const y = plan.plinth + level * scale.floorSpacing;
      const floorAt = p => patches.get([...patches.keys()].find(patch => floorPatchContains(patch, [p.x, p.z]))) ?? nearest(p, [...patches.values()]);
      for (const room of floor.rooms) {
        const c = {x: 0, z: 0};
        for (const [px, pz] of room.polygon) { c.x += px / room.polygon.length; c.z += pz / room.polygon.length; }
        const walls = panels.filter(panel => panel.level === level && panel.low && inside(room.polygon, panel.x - panel.nx * .3, panel.z - panel.nz * .3));
        const placed = [];
        const place = (kind, name, dx, height) => {
          const p = PROFILES[name], at = {x: c.x + dx, z: c.z};
          const site = add({id: 'contents:' + level + ':' + room.id + ':' + kind, layer: 'floor', level, x: at.x, y: y + height, z: at.z,
            nx: 0, ny: 1, nz: 0, area: p.area, exposed: false, contents: name, room: room.type}, 'contents:' + name);
          link(site, floorAt(at), {gain: p.gain});
          for (const panel of walls) if (planar(site, panel) <= p.reach) link(site, panel.low, {gain: p.gain});
          for (const other of placed) link(site, other, {gain: p.gain});
          // In the slow-shell variant the timber is slowed and the contents keep their own pace.
          const slow = +process.env.TB_SHELL_SLOW || 1;
          if (slow !== 1) for (const edge of site.links) {
            edge.seconds /= slow;
            for (const back of edge.target.links) if (back.target === site) back.seconds /= slow;
          }
          placed.push(site);
        };
        if (kinds.furniture) {
          const lacquered = kinds.lacquer === 'all' || kinds.lacquer === 'some' && hash(building.prefabId + room.id) % 4 === 0;
          place('furniture', lacquered ? 'lacquered' : 'furniture', 0, .5);
        }
        if (kinds.oil && (room.type === 'kitchen' || room.type === 'pantry')) place('oil', 'oil', .45, .3);
        if (kinds.coal && (room.type === 'kitchen' || room.type === 'service')) place('coal', 'coal', -.45, .3);
      }
    }
  }
`;

export const CONTENTS_PATCH = {file: '/src/simulation/housing-topology.js', find: ANCHOR, replace: BLOCK + ANCHOR};
// A second, separate what-if: every link between sites takes TB_SHELL_SLOW times as long, so the
// timber shell spreads that much more slowly. It exists to ask one question: do contents matter
// more when the shell is not alight in ten seconds?
export const SLOW_SHELL_PATCH = {file: '/src/simulation/surface-fire.js', find: 'return run / (1.17 +',
  replace: 'return (+process.env.TB_SHELL_SLOW || 1) * run / (1.17 +'};
// A read-only tap, so the probe can read each house's sites after a run.
export const LOTS_TAP = {file: '/src/simulation/housing-fire.js', find: 'let groundField;',
  replace: 'let groundField;(globalThis.__lots??=[]).push({building,sites,sections,panels,plan});'};
