import {buildingPoint} from '../content/buildings.js';
import {clamp, lineClear} from './geometry.js';
import {activeFuel} from './field.js';
import {ignites, storedHeat} from './combustion.js';

const EPS = 1e-8;
const contacts = [[.38, .024], [.84, .018]];
const unit = value => clamp(value, 0, 1);

export function surfaceSite(geometry, fuel) {
  return {...geometry, fuel, links: [], heat: 0, ignitedAt: null, phase: 'cold', parentId: null, cause: null};
}

export function surfaceDuration(site) {
  return site.burnSeconds ?? site.fuel.seconds;
}

export function surfaceFlame(site, time) {
  if (site.phase !== 'burning') return 0;
  const age = time - site.ignitedAt;
  return (.14 + .86 * unit(age / .28)) * (1 - .64 * unit((age - 1.3) / 3)) *
    (1 - .70 * unit((age - surfaceDuration(site) + 1.5) / 1.5));
}

export function surfaceTravel(a, b, wa, wb, {length, corner = false, eave = false} = {}) {
  const dx = b.x - a.x, dy = b.y - a.y, dz = b.z - a.z, chord = Math.hypot(dx, dy, dz);
  if (chord <= EPS) return .16;
  const run = length ?? (eave ? Math.hypot(dx, dz, dy) + .16 : corner ? Math.hypot(Math.abs(dx) + Math.abs(dz), dy) : chord);
  const slope = dy / run;
  const along = wa && wb ? ((wa[0] + wb[0]) * dx + (wa[1] + wb[1]) * dy + (wa[2] + wb[2]) * dz) / (2 * chord) : 0;
  return run / (1.17 + slope * (slope >= 0 ? .95 : .42) + clamp(.48 * along, -.40, .40)) + (eave ? .53 : corner ? .18 : 0);
}

export function heatSurfaceSite(site, amount, cause, anchor) {
  if (!site || site.phase === 'spent' || !(amount > 0)) return null;
  if (site.phase !== 'burning') {
    site.heat = Math.min(site.fuel.limit, site.heat + amount);
    if (!site.cause || amount >= site.cause.amount) site.cause = {...cause, amount, anchor};
  }
  return site;
}

export function stepSurfaceFire(sites, dt, time, present, onIgnition, onSpent) {
  // New ignitions are resolved only after this pass over already active sources.
  for (const site of sites) {
    if (site.phase !== 'burning' || !present(site)) continue;
    const age = time - site.ignitedAt;
    if (age < .16 || age >= surfaceDuration(site)) continue;
    const activity = (.66 + .34 * surfaceFlame(site, time)) * (site.fuel.output ?? 1);
    for (const {target, seconds, gain = 1} of site.links) {
      if (present(target)) heatSurfaceSite(target, dt / seconds * activity * gain, {kind: 'surface-spread', cellId: site.id});
    }
  }
  for (const site of sites) {
    if (!present(site) || site.phase === 'spent') continue;
    if (site.phase === 'burning') {
      if (time - site.ignitedAt >= surfaceDuration(site)) {
        site.phase = 'spent';
        onSpent?.(site);
      }
      continue;
    }
    site.heat = storedHeat(site.heat, 0, site.fuel.cooling, dt, site.fuel.limit);
    if (site.heat > 0 && ignites(site.heat, site.fuel.threshold, surfaceDuration(site))) {
      site.phase = 'burning';
      site.ignitedAt = time;
      site.parentId = site.cause?.cellId ?? null;
      site.ignitionKind = site.cause?.kind ?? 'heat';
      if (site.cause?.anchor) site.anchor = site.cause.anchor;
      onIgnition(site);
    } else if (site.heat <= EPS) site.cause = null;
  }
}

export function worldSurface(building, local) {
  const world = buildingPoint(building, {x: local.x, y: local.z});
  const normal = buildingPoint({x: 0, y: 0, quarterTurns: building.quarterTurns}, {x: local.nx, y: local.nz});
  return {x: world.x, y: local.y, z: world.y, nx: normal.x, ny: local.ny, nz: normal.y};
}

export function surfaceSample(building, site, time, exposed) {
  const flame = surfaceFlame(site, time);
  if (!flame && (site.phase !== 'cold' || !(site.heat > 0))) return null;
  return {id: `${building.id}/${site.id}`, buildingId: building.id,
    part: site.layer === 'walls' || site.layer === 'roof' ? site.layer : 'ground',
    ...worldSurface(building, site.anchor ?? site), area: site.area, exposed, flame,
    smoke: flame ? flame * unit((time - site.ignitedAt - .12) / .55) * .56 : 0,
    heatFraction: unit(site.heat / (site.fuel.threshold || 1)),
    ignitionTime: site.ignitedAt};
}

export function exchangeSurfaceGround(site, world, field, obstacles, dt, time, cause) {
  const burning = site.phase === 'burning';
  if (site.phase === 'spent' || burning && time - site.ignitedAt >= surfaceDuration(site)) return;
  const {x, z, nx, nz} = world, edge = {x: x + nx * .12, y: z + nz * .12};
  let previous;
  for (const [distance, coupling] of contacts) {
    const cell = field.at({x: x + nx * distance, y: z + nz * distance});
    if (!cell || cell === previous) continue;
    previous = cell;
    if (burning) {
      if (cell.phase !== 'burning' && cell.surfaceFuel + cell.depositedFuel > EPS) {
        field.seed(edge, [cell], dt * coupling * field.heatOutput(site.fuel.material), cause);
      }
    } else if (cell.phase === 'burning' && lineClear(cell, edge, obstacles)) {
      heatSurfaceSite(site, dt * coupling * field.heatOutput(activeFuel(cell)), {kind: 'ground-heat', cellId: cell.id});
    }
  }
}
