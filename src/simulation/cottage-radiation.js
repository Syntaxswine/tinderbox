import {boxInterval} from './geometry.js';
import {DEPTH, EAVE, OVERHANG, PITCH, RIDGE, WIDTH, tileIndex} from './cottage-topology.js';
import {heatSurfaceSite, surfaceOutput} from './surface-fire.js';

const EPS = 1e-7;
const MAX_RANGE = 16;
const NEAR_FLOOR = 1;
const GAIN = 2.4;

// Game heat per burning square metre. NIST SP 1169 §6.1 motivates
// distance and target incidence. The source angle and cap are game choices.
export function radiantWeight(from, to) {
  const dx = to.x - from.x, dy = to.h - from.h, dz = to.y - from.y;
  const distance = Math.hypot(dx, dy, dz);
  if (distance < EPS || distance > MAX_RANGE) return 0;
  const outgoing = (dx * from.nx + dy * from.ny + dz * from.nz) / distance;
  const incident = -(dx * to.nx + dy * to.ny + dz * to.nz) / distance;
  return GAIN * Math.max(0, outgoing) * Math.max(0, incident) / Math.max(NEAR_FLOOR ** 2, distance ** 2);
}

function facePoint(lot, site) {
  // Stay just outside the .09 m conservative wall rim. Roof emission
  // originates a little above the fuel plane, inside the visible flame.
  const offset = site.layer === 'roof' ? .16 : .04;
  return {x: lot.building.x + site.x + offset * site.nx, y: lot.building.y + site.z + offset * site.nz,
    h: site.y + offset * site.ny, nx: site.nx, ny: site.ny, nz: site.nz};
}

function coverSpan(from, to, box) {
  const span = boxInterval(from, to, box);
  if (!span || span[1] - span[0] <= EPS || span[1] <= EPS || span[0] >= 1 - EPS) return null;
  const a = from.h + (to.h - from.h) * span[0], b = from.h + (to.h - from.h) * span[1];
  return {box, low: Math.min(a, b), high: Math.max(a, b)};
}

function solid({box, low, high}) {
  const bottom = box.baseHeight ?? 0;
  return !box.destroyed && box.blocksHeat !== false && low < bottom + box.height - EPS && high > bottom + EPS;
}

function roofCover(lot, from, to) {
  const x0 = lot.building.x, z0 = lot.building.y;
  const hits = [];
  for (const sign of [-1, 1]) {
    const offset = point => point.h - (RIDGE - sign * PITCH * (point.x - x0 - WIDTH / 2));
    const a = offset(from), b = offset(to);
    if (a * b >= 0) continue;
    const t = a / (a - b);
    if (t <= EPS || t >= 1 - EPS) continue;
    const x = from.x + (to.x - from.x) * t - x0, z = from.y + (to.y - from.y) * t - z0;
    if (x < -OVERHANG || x > WIDTH + OVERHANG || z < -OVERHANG || z > DEPTH + OVERHANG || sign * (x - WIDTH / 2) < -EPS) continue;
    hits.push({lot, tile: tileIndex(x, z)});
  }
  return hits;
}

export function createCottageRadiation(lots, obstacles, present) {
  const tileBoxes = lots.flatMap(lot => lot.colliders.filter(box => box.cottageTile !== undefined));
  const ownTiles = new Set(tileBoxes);
  const sources = lots.flatMap(lot => lot.sites.filter(site => site.layer === 'walls' || site.layer === 'roof')
    .map(site => ({lot, site, point: facePoint(lot, site), output: 0})));
  const targets = lots.flatMap(lot => lot.walls.map(site => {
    const to = facePoint(lot, site);
    const links = [];
    for (const from of sources) {
      if (from.lot === lot) continue;
      const weight = radiantWeight(from.point, to);
      if (!weight) continue;
      links.push({from, weight, columns: tileBoxes.map(box => coverSpan(from.point, to, box)).filter(span => span && span.low < EAVE - EPS),
        roofs: lots.flatMap(cottage => roofCover(cottage, from.point, to))});
    }
    return {lot, site, to, links};
  }));
  const bounds = {
    minHeight: Math.min(...sources.map(from => from.point.h)),
    minX: Math.min(...lots.map(lot => lot.building.x)) - OVERHANG,
    maxX: Math.max(...lots.map(lot => lot.building.x)) + WIDTH + OVERHANG,
    minZ: Math.min(...lots.map(lot => lot.building.y)) - OVERHANG,
    maxZ: Math.max(...lots.map(lot => lot.building.y)) + DEPTH + OVERHANG
  };
  return {
    links: targets.reduce((n, target) => n + target.links.length, 0),
    exchange(dt, time) {
      let active = false;
      for (const from of sources) {
        from.output = present(from.lot, from.site) ? from.site.area * surfaceOutput(from.site, time) : 0;
        active ||= from.output > 0;
      }
      if (!active) return;
      // The pair's moving tile mask is checked through the precomputed
      // columns. Other props use the live obstacle list, including replacements.
      const outside = obstacles.filter(box => !ownTiles.has(box) && !box.destroyed && box.blocksHeat !== false &&
        box.x + box.width / 2 >= bounds.minX && box.x - box.width / 2 <= bounds.maxX &&
        box.y + box.depth / 2 >= bounds.minZ && box.y - box.depth / 2 <= bounds.maxZ &&
        (box.baseHeight ?? 0) + box.height >= bounds.minHeight)
        .flatMap(box => [box, ...(box.heatBarriers ?? [])]);
      for (const {lot, site, to, links} of targets) {
        if (site.phase !== 'cold' || !present(lot, site)) continue;
        let total = 0, strongest = 0, donor, donorCount = 0;
        for (const {from, weight, columns, roofs} of links) {
          if (from.output <= 0 || columns.some(solid) ||
              roofs.some(({lot, tile}) => !lot.building.destroyed && lot.tiles[tile].roof)) continue;
          if (outside.length && outside.some(box => {
            const span = coverSpan(from.point, to, box);
            return span && solid(span);
          })) continue;
          const rate = from.output * weight;
          total += rate;
          donorCount++;
          if (rate > strongest) { strongest = rate; donor = from; }
        }
        if (donor) {
          const sourceBuildingId = donor.lot.building.id, sourceSiteId = donor.site.id;
          heatSurfaceSite(site, total * dt, {kind: 'radiation', cellId: sourceSiteId,
            sourceId: sourceBuildingId + '/' + sourceSiteId, sourceBuildingId, sourceSiteId, donorCount});
        }
      }
    }
  };
}
