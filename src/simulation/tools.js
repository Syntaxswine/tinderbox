import {distance, firstHeatContact, impactPoint, clamp} from './geometry.js';
import {resolveDischarge, inactiveDischarge} from './discharge.js';
export function aimHeading(player, aim) { return Math.atan2(aim.y - player.y, aim.x - player.x); }
export function localPoint(player, aim, range) {
  const heading = aimHeading(player, aim), reach = Math.min(range, distance(player, aim));
  return {x: player.x + Math.cos(heading) * reach, y: player.y + Math.sin(heading) * reach};
}
function closeTarget(player, aim, range, world) {
  if (aim) return localPoint(player, aim, range);
  const x = Math.cos(player.heading), y = Math.sin(player.heading);
  const edgeX = x === 0 ? Infinity : ((x > 0 ? world.width : 0) - player.x) / x;
  const edgeY = y === 0 ? Infinity : ((y > 0 ? world.height : 0) - player.y) / y;
  const reach = Math.min(range, edgeX, edgeY);
  return {x: player.x + x * reach, y: player.y + y * reach};
}
function heatAhead(state, field, target, spec, cottages, housing) {
  const {player, obstacles} = state, tool = player.tool;
  const siding = cottages?.igniteSiding(player, state.closeAim ?? target, spec.range, spec.heat, tool);
  if (siding) return siding;
  const contact = housing ? firstHeatContact(player, target, obstacles) : null;
  if (contact) {
    const dx = target.x - player.x, dy = target.y - player.y;
    const pointAt = t => ({x: player.x + dx * t, y: player.y + dy * t});
    const lot = housing.get(contact.box.buildingId);
    if (lot) {
      const strike = lot.strike(contact.box, player, target, spec.heat, tool);
      const t = strike?.t ?? contact.t;
      if (!strike?.site) return {point: pointAt(t), cells: [], result: strike?.result ?? 'blocked'};
      // The thermal site can lie just inside the coarse collision rim.
      // Start the visible torch fan outside that rim so it can open outward.
      const outside = Math.max(0, Math.min(t, contact.t) - .0001 / Math.hypot(dx, dy));
      return {point: pointAt(t), dischargePoint: {...pointAt(outside), h: strike.site.y}, cells: [strike.site], result: 'heated'};
    }
    const point = pointAt(contact.t);
    // A blocked ray cannot seed a raster cell shared by the screen and siding.
    if (contact.box.material !== 'wood') return {point, cells: [], result: 'blocked'};
    // The first face is already reachable. Sample its fuel just inside the edge.
    const inside = {x: point.x + dx * .00001, y: point.y + dy * .00001};
    const cell = field.at(inside);
    if (cell) return {point, tile: field.tileAt(inside), ...field.seed(inside, [cell], spec.heat, tool)};
    return {point, cells: [], result: 'no-fuel'};
  }
  if (tool === 'matches') {
    const tile = field.tileAt(target);
    return {point: target, tile, ...field.seed(player, field.tileCells(tile), spec.heat, tool)};
  }
  const point = impactPoint(player, target, obstacles);
  const result = field.seed(player, field.candidates(point, spec.radius), spec.heat, tool);
  if (result.result === 'no-fuel' && distance(point, target) > 1e-8) result.result = 'blocked';
  return {point, ...result};
}
export function discreteTool(state, field, config, event, cottages, housing) {
  const p = state.player, stock = p.inventory, tool = p.tool;
  if (tool === 'jerry-can') {
    if (stock.gas <= 1e-10) return event('tool-rejected', p, {tool, reason: 'empty'});
    p.pouring = !p.pouring; event('pour', p, {active: p.pouring}); return;
  }
  if (tool === 'matches' || tool === 'torch') {
    const spec = config.tools[tool], target = closeTarget(p, state.closeAim, spec.range, field.def);
    if (tool === 'matches') {
      if (stock.matches < 1) return event('tool-rejected', target, {tool, reason: 'empty', result: 'empty', tile: field.tileAt(target)});
      stock.matches--;
    } else {
      if (p.torch.phase === 'spent' || stock.torchFuel <= 1e-10) return event('tool-rejected', p, {tool, reason: 'empty', result: 'empty'});
      if (p.torch.phase === 'unlit') {
        p.torch.phase = 'lit'; event('torch-lit', p, {tool, durationSeconds: p.torch.durationSeconds});
        event('tool-use', p, {tool, result: 'lit'}); return;
      }
    }
    const result = heatAhead(state, field, target, spec, cottages, housing);
    const point = result.point ?? target;
    recordIgnition(state, event, tool, point, result, tool === 'matches' ? {tile: result.tile ?? field.tileAt(point)} : {});
    if (tool === 'torch' && result.cells.length) {
      p.usingTool = true; state.discharge = resolveDischarge(state, config, field.def, result.dischargePoint ?? point);
    }
    return;
  }
  if (tool === 'molotov') {
    const spec = config.tools.molotov;
    if (stock.molotovs < 1 || distance(p, state.aim) > spec.range || distance(p, state.aim) < 0.15) {
      return event('tool-rejected', p, {tool, reason: stock.molotovs < 1 ? 'empty' : 'range'});
    }
    stock.molotovs--;
    const projectile = {id: 'molotov:' + ++state.projectileSequence, x: p.x, y: p.y, fromX: p.x, fromY: p.y,
      targetX: state.aim.x, targetY: state.aim.y, progress: 0, h: 0.8};
    state.projectiles.push(projectile); event('tool-use', p, {tool, projectileId: projectile.id});
  }
}
function recordIgnition(state, event, tool, point, result, extra = {}) {
  const accepted = result.cells.length > 0;
  const record = event(accepted ? 'tool-use' : 'tool-rejected', point, {tool, result: result.result,
    ...(!accepted ? {reason: result.result} : {}), ...extra, heatedCells: result.cells.length, cellIds: result.cells.map(cell => cell.publicId ?? cell.id)});
  if (accepted) state.ignitionResults.push({record, cells: result.cells});
}
export function ageTorch(state, config, worldDelta, event) {
  const p = state.player;
  if (p.torch.phase !== 'lit') return;
  p.inventory.torchFuel = Math.max(0, p.inventory.torchFuel - config.tools.torch.fuelPerSecond * worldDelta);
  if (p.inventory.torchFuel <= 1e-10) {
    p.inventory.torchFuel = 0; p.torch.phase = 'spent';
    if (state.discharge.tool === 'torch') { state.discharge = inactiveDischarge(state.tick); p.usingTool = false; }
    event('torch-spent', p, {tool: 'torch'});
  }
}
function heatHousingDischarge(discharge, amount, obstacles, housing) {
  const boxes = new Map(obstacles.map(box => [box.id, box]));
  const touched = new Set(), from = discharge.origin;
  for (const ray of discharge.rays) {
    const box = boxes.get(ray.obstacleId), lot = housing.get(box?.buildingId);
    if (!lot) continue;
    // Allow the collision rim and ray skin without applying heat beyond reach.
    const reach = Math.min(discharge.range, ray.distance + .02);
    const to = {x: from.x + Math.cos(ray.angle) * reach, y: from.y + Math.sin(ray.angle) * reach};
    if (firstHeatContact(from, to, obstacles, ray.h)?.box === box) {
      lot.strike(box, from, to, amount * .42, 'flamethrower', touched);
    }
  }
}
export function heldTool(state, field, config, delta, event, world, cottages, housing) {
  const p = state.player, tool = p.tool;
  if (!state.input.primary || tool !== 'flamethrower') return;
  const spec = config.tools[tool], key = 'flamethrowerFuel';
  const used = Math.min(p.inventory[key], spec.fuelPerSecond * delta);
  if (used <= 1e-10) { state.input.primary = false; event('tool-empty', p, {tool}); return; }
  p.inventory[key] = Math.max(0, p.inventory[key] - used);
  const heat = spec.heatPerSecond * (spec.fuelPerSecond > 0 ? used / spec.fuelPerSecond : delta);
  p.heading = aimHeading(p, state.aim); p.usingTool = true;
  field.cone(p, p.heading, spec.range, spec.halfAngle, heat, tool);
  state.discharge = resolveDischarge(state, config, world);
  cottages?.heatDischarge(state.discharge,heat);
  if(housing?.size)heatHousingDischarge(state.discharge,heat,state.obstacles,housing);
  if (p.inventory[key] <= 1e-10) {
    p.inventory[key] = 0; state.input.primary = false; p.usingTool = false;
    state.discharge = inactiveDischarge(state.tick); event('tool-empty', p, {tool});
  }
}
export function projectilesStep(state, field, config, delta, event, cottages, housing) {
  const spec = config.tools.molotov, alive = [];
  for (const projectile of state.projectiles) {
    const target = {x: projectile.targetX, y: projectile.targetY}, d = distance(projectile, target);
    const step = Math.min(d, spec.speed * delta), ratio = d > 1e-10 ? step / d : 1;
    const next = {x: projectile.x + (target.x - projectile.x) * ratio, y: projectile.y + (target.y - projectile.y) * ratio};
    const full = Math.hypot(projectile.targetX - projectile.fromX, projectile.targetY - projectile.fromY);
    const nextProgress = full ? clamp(1 - distance(next, target) / full, 0, 1) : 1;
    const height = t => 0.8 * (1 - t) + 0.1 * t + Math.sin(t * Math.PI) * Math.min(2, full * 0.35);
    const nextHeight = height(nextProgress);
    const impact = impactPoint(projectile, next, state.obstacles, {startHeight: projectile.h, endHeight: nextHeight});
    const hit = distance(impact, next) > 1e-8;
    let surfaceHit;
    if(hit){
      surfaceHit=cottages?.heatSurface(projectile,next,spec.heat*.70,'molotov',projectile.h,nextHeight);
      const contact=housing&&firstHeatContact(projectile,next,state.obstacles,projectile.h,nextHeight);
      if(contact&&!surfaceHit)surfaceHit=housing.get(contact.box.buildingId)?.strike(
        contact.box,projectile,{...next,h:nextHeight},spec.heat*.70,'molotov')?.site;
    }
    projectile.x = impact.x; projectile.y = impact.y;
    projectile.progress = full ? clamp(1 - distance(projectile, target) / full, 0, 1) : 1;
    projectile.h = height(projectile.progress);
    if (hit || step >= d - 1e-10) {
      field.addPool(impact, spec.radius, spec.fuel);
      if(!surfaceHit)field.emit(impact, spec.radius, spec.heat, 'molotov');
      event('molotov-impact', impact, {projectileId: projectile.id});
    } else alive.push(projectile);
  }
  state.projectiles = alive;
}
