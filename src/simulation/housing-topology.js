import {ASSET_SCALE as scale} from '../content/asset-scale.js';
import {exteriorPlanEdges, roofPanels} from '../content/housing-envelope.js';
import {compileFloorSupport, floorPatchBorders, floorPatchContains} from '../content/housing-floors.js';
import {housingSectionAt, housingSectionGrid} from '../content/housing-sections.js';
import {DEFAULT_CONFIG} from './config.js';
import {surfaceSite, surfaceTravel, worldSurface} from './surface-fire.js';

const planar = (a, b) => Math.hypot(a.x - b.x, a.z - b.z);
const vertexKey = point => point.map(v => Math.round(v * 1e5)).join(',');
const burnSeconds = {floor: 10, wall: 8, joinery: 7, fascia: 7, roof: 10, porch: 8};
const woodOutput = fire => fire.heatRate * fire.propagation.wood.heatScale;
const nearest = (point, sites) => sites.reduce((best, site) =>
  !best || planar(point, site) < planar(point, best) ? site : best, null);

function deckPieces({role, x, y: z, height, width, depth}) {
  const stairs = role === 'stairs';
  const alongX = !stairs && width >= depth;
  const count = Math.ceil(alongX ? width : depth);
  const steps = Math.max(3, Math.ceil(height / .18));
  return Array.from({length: count}, (_, index) => {
    const w = alongX ? width / count : width, d = alongX ? depth : depth / count;
    const cx = alongX ? x - width / 2 + (index + .5) * w : x;
    const cz = alongX ? z : z - depth / 2 + (index + .5) * d;
    const fronts = [];
    // Cut edges between pieces are covered by the adjacent timber.
    if (!alongX || index === 0) fronts.push({x: cx - w / 2, z: cz, nx: -1, nz: 0, span: d});
    if (!alongX || index === count - 1) fronts.push({x: cx + w / 2, z: cz, nx: 1, nz: 0, span: d});
    if (alongX || index === 0) fronts.push({x: cx, z: cz - d / 2, nx: 0, nz: -1, span: w});
    if (alongX || index === count - 1) fronts.push({x: cx, z: cz + d / 2, nx: 0, nz: 1, span: w});
    const y = stairs ? height * (1 + Math.floor((index + .5) * steps / count)) / steps : height;
    const id = count === 1 ? `deck:${role}` : `deck:${role}:${index}`;
    return {id, x: cx, y, z: cz, area: w * d, fronts};
  });
}

export function createHousingTopology(building, plan, footprints, config, wind) {
  const grid = housingSectionGrid(building.prefabId), sites = [], panels = [], roofSites = [], floors = [], porch = new Map();
  const brick = plan.style.wall === 'brick';
  const fuel = Object.fromEntries(Object.entries(burnSeconds).map(([part, seconds]) => [part, {
    material: 'wood', threshold: config.fire.ignition.wood, limit: config.fire.maxHeat, cooling: .075,
    output: woodOutput(config.fire) / woodOutput(DEFAULT_CONFIG.fire),
    seconds: config.fuel.surfaceBurnRate > 0 ? seconds * DEFAULT_CONFIG.fuel.surfaceBurnRate / config.fuel.surfaceBurnRate : Infinity
  }]));

  function add(geometry, profile) {
    const {id, x, z} = geometry;
    const site = surfaceSite({...geometry, publicId: `${building.id}/${id}`, section: housingSectionAt(grid, x, z)}, fuel[profile]);
    site.world = worldSurface(building, site);
    const p = site.world;
    if (wind && site.exposed) site.wind = wind(p.x + .56 * p.nx, p.y + .56 * p.ny, p.z + .56 * p.nz, [0, 0, 0]);
    sites.push(site);
    return site;
  }
  function link(a, b, {gain = 1.8, corner, eave} = {}) {
    if (!a || !b || a === b || a.links.some(edge => edge.target === b)) return;
    const forward = surfaceTravel(a.world, b.world, a.wind, b.wind, {corner, eave});
    const back = surfaceTravel(b.world, a.world, b.wind, a.wind, {corner, eave});
    a.links.push({target: b, seconds: forward, gain});
    b.links.push({target: a, seconds: back, gain});
  }

  for (const [level, floor] of plan.floors.entries()) {
    const deckY = plan.plinth + level * scale.floorSpacing;
    const support = compileFloorSupport(plan, level, grid);
    const deck = new Map();
    for (const patch of support.patches) {
      const {section, x, y, z, area, floorRadius} = patch;
      const col = section % grid.cols, row = Math.floor(section / grid.cols);
      const pieces = support.bySection.get(section);
      const suffix = pieces.length === 1 ? '' : ':' + pieces.indexOf(patch);
      const site = add({id: `floor:${level}:${col},${row}${suffix}`, layer: 'floor', level, x, y, z,
        nx: 0, ny: 1, nz: 0, area, floorRadius, exposed: false}, 'floor');
      deck.set(patch, site);
    }
    for (const [patch, site] of deck) for (const neighbor of patch.neighbors) link(site, deck.get(neighbor));
    floors.push(deck);
    for (const edge of exteriorPlanEdges(floor)) {
      const {nx, nz, x, z, opening} = edge;
      const side = nx === -1 && x === 0 ? 'left' : nx === 1 && x === plan.width ? 'right' : null;
      const party = side && building.partyWalls[side];
      const panel = {...edge, level, y: deckY, low: null, high: null};
      panels.push(panel);
      // The masonry face has no fuel. Exposed sashes and doors are wood.
      if (party || brick && !opening) continue;
      const part = brick ? 'joinery' : 'wall';
      const offset = scale.wallThickness / 2;
      for (const [band, height] of [brick ? opening === 'entry' ? .63 : .35 : .5, brick ? 1.59 : 1.5].entries()) {
        const site = add({id: `wall:${level}:${edge.id}:${band}`, layer: 'walls', level, band, x: x + nx * offset, y: deckY + height,
          z: z + nz * offset, nx, ny: 0, nz, area: brick ? .28 : edge.length, exposed: true}, part);
        panel[band ? 'high' : 'low'] = site;
      }
      link(panel.low, panel.high);
      const touching = support.patches.filter(patch => floorPatchBorders(patch, edge.a, edge.b));
      link(panel.low, nearest(panel.low, touching.map(patch => deck.get(patch))), {gain: 1.65});
    }
  }

  for (const [i, a] of panels.entries()) {
    if (!a.low) continue;
    for (const b of panels.slice(i + 1)) {
      if (!b.low) continue;
      const sharesCorner = [a.a, a.b].some(p => [b.a, b.b].some(q => p[0] === q[0] && p[1] === q[1]));
      if (a.level === b.level && sharesCorner) {
        const corner = a.nx !== b.nx || a.nz !== b.nz;
        link(a.low, b.low, {corner});
        link(a.high, b.high, {corner});
      } else if (Math.abs(a.level - b.level) === 1 && a.nx * b.nx + a.nz * b.nz > .7 && planar(a, b) <= 1.01) {
        const [lower, higher] = a.level < b.level ? [a, b] : [b, a];
        link(lower.high, higher.low);
      }
    }
  }
  for (const [level, floor] of plan.floors.entries()) {
    const stairs = floor.stairs, upper = floors[level + 1];
    if (!stairs || !upper?.size) continue;
    const {x, z} = stairs, lower = floors[level];
    const foot = [x + .5, z + .125], landing = {x: x + .5, z: z + 3};
    const lowerPatch = [...lower.keys()].find(patch => floorPatchContains(patch, foot));
    const topEdge = [[x, landing.z], [x + 1, landing.z]];
    const sideEdges = [[[x, landing.z - .25], topEdge[0]], [[x + 1, landing.z - .25], topEdge[1]]];
    const candidates = [...upper.keys()].filter(patch =>
      [topEdge, ...sideEdges].some(([a, b]) => floorPatchBorders(patch, a, b)));
    link(lower.get(lowerPatch), nearest(landing, candidates.map(patch => upper.get(patch))), {gain: 1.4});
  }

  const roofVertices = new Map(), roofSeams = {left: [], right: []};
  for (const {id, vertices, seamEdges, level, x, y, z, nx, ny, nz, area} of roofPanels(plan, building.partyWalls)) {
    const site = add({id: `roof:${id}`, layer: 'roof', level, x, y, z, nx, ny, nz, area, exposed: true}, 'roof');
    roofSites.push({site, vertices});
    for (const {side, a, b} of seamEdges) roofSeams[side].push({site, a, b});
    for (const key of new Set(vertices.map(vertexKey))) {
      const neighbors = roofVertices.get(key) ?? [];
      for (const other of neighbors) link(other, site, {gain: 1.55});
      neighbors.push(site);
      roofVertices.set(key, neighbors);
    }
  }
  for (const panel of panels) {
    if (!panel.high) continue;
    const top = panel.y + scale.wallHeight;
    let best, score = Infinity;
    for (const {site, vertices} of roofSites) {
      if (site.level !== panel.level || planar(site, panel) > 1.8) continue;
      for (const [x, y, z] of vertices) {
        const distance = planar({x, z}, panel), rise = Math.abs(y - top);
        const cost = distance + rise * .4;
        if (distance <= 1.25 && rise <= 2.3 && cost < score) { best = {site, x, y, z}; score = cost; }
      }
    }
    if (!best) continue;
    const {site, x, y, z} = best;
    const fascia = add({id: `eave:${panel.level}:${panel.id}`, layer: 'walls', level: panel.level, x, y: y - .025, z,
      nx: panel.nx, ny: 0, nz: panel.nz, area: .14 * panel.length, exposed: true}, 'fascia');
    link(panel.high, fascia, {eave: true});
    link(fascia, site, {eave: true});
  }

  for (const footprint of footprints.filter(box => box.role !== 'foundation')) {
    const pieces = deckPieces(footprint).map(piece => add({...piece, layer: 'floor', level: 0,
      nx: 0, ny: 1, nz: 0, exposed: true}, 'porch'));
    for (let index = 1; index < pieces.length; index++) link(pieces[index - 1], pieces[index]);
    porch.set(footprint.role, pieces);
  }
  const deck = porch.get('porch') ?? [], stairs = porch.get('stairs') ?? [];
  const entry = panels.find(panel => panel.level === 0 && panel.opening === 'entry');
  if (entry?.low) link(nearest(entry, deck), entry.low);
  if (stairs.length) link(stairs.at(-1), nearest(stairs.at(-1), deck));

  const porchRoof = roofSites.filter(({site}) => site.id.startsWith('roof:porch:'));
  let porchPost;
  if (porchRoof.length) {
    const {x, z} = plan.porch;
    const position = {x: x + .12, z: z + .12}, postDeck = nearest(position, deck);
    const {site: roof} = porchRoof.reduce((a, b) => planar(b.site, position) < planar(a.site, position) ? b : a);
    porchPost = add({id: 'porch-post', layer: 'walls', level: 0, ...position, y: postDeck.y + .95, nx: 0, ny: 0, nz: -1,
      area: .36, exposed: true}, 'joinery');
    link(postDeck, porchPost);
    link(porchPost, roof, {eave: true});
  }
  return {sites, panels, porch, porchPost, roofSeams};
}
