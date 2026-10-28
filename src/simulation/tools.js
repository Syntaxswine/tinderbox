import {distance, impactPoint, clamp} from './geometry.js';
import {resolveDischarge, inactiveDischarge} from './discharge.js';
export function aimHeading(player, aim) { return Math.atan2(aim.y - player.y, aim.x - player.x); }
export function localPoint(player, aim, range) {
  const heading = aimHeading(player, aim), reach = Math.min(range, distance(player, aim));
  return {x: player.x + Math.cos(heading) * reach, y: player.y + Math.sin(heading) * reach};
}
export function discreteTool(state, field, config, event) {
  const p = state.player, stock = p.inventory, tool = p.tool;
  if (tool === 'jerry-can') {
    if (stock.gas <= 1e-10) return event('tool-rejected', p, {tool, reason: 'empty'});
    p.pouring = !p.pouring; event('pour', p, {active: p.pouring}); return;
  }
  if (tool === 'matches') {
    if (stock.matches < 1) return event('tool-rejected', p, {tool, reason: 'empty'});
    const spec = config.tools.matches, point = impactPoint(p, localPoint(p, state.aim, spec.range), state.obstacles);
    stock.matches--; field.emit(point, spec.radius, spec.heat, tool); event('tool-use', point, {tool});
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
export function heldTool(state, field, config, delta, event, world) {
  const p = state.player, tool = p.tool;
  p.usingTool = false;
  if (!state.input.primary || !['torch', 'flamethrower'].includes(tool)) return;
  const spec = config.tools[tool], key = tool === 'torch' ? 'torchFuel' : 'flamethrowerFuel';
  const used = Math.min(p.inventory[key], spec.fuelPerSecond * delta);
  if (used <= 1e-10) { state.input.primary = false; event('tool-empty', p, {tool}); return; }
  p.inventory[key] = Math.max(0, p.inventory[key] - used);
  const heat = spec.heatPerSecond * (spec.fuelPerSecond > 0 ? used / spec.fuelPerSecond : delta);
  p.heading = aimHeading(p, state.aim); p.usingTool = true;
  if (tool === 'torch') {
    const point = impactPoint(p, localPoint(p, state.aim, spec.range), state.obstacles);
    field.emit(point, spec.radius, heat, tool);
    state.discharge = resolveDischarge(state, config, world, point);
  } else {
    field.cone(p, p.heading, spec.range, spec.halfAngle, heat, tool);
    state.discharge = resolveDischarge(state, config, world);
  }
  if (p.inventory[key] <= 1e-10) {
    p.inventory[key] = 0; state.input.primary = false; p.usingTool = false;
    state.discharge = inactiveDischarge(state.tick); event('tool-empty', p, {tool});
  }
}
export function projectilesStep(state, field, config, delta, event) {
  const spec = config.tools.molotov, alive = [];
  for (const projectile of state.projectiles) {
    const target = {x: projectile.targetX, y: projectile.targetY}, d = distance(projectile, target);
    const step = Math.min(d, spec.speed * delta), ratio = d > 1e-10 ? step / d : 1;
    const next = {x: projectile.x + (target.x - projectile.x) * ratio, y: projectile.y + (target.y - projectile.y) * ratio};
    const full = Math.hypot(projectile.targetX - projectile.fromX, projectile.targetY - projectile.fromY);
    const nextProgress = full ? clamp(1 - distance(next, target) / full, 0, 1) : 1;
    const height = t => 0.8 * (1 - t) + 0.1 * t + Math.sin(t * Math.PI) * Math.min(2, full * 0.35);
    const impact = impactPoint(projectile, next, state.obstacles, {startHeight: projectile.h, endHeight: height(nextProgress)});
    const hit = distance(impact, next) > 1e-8;
    projectile.x = impact.x; projectile.y = impact.y;
    projectile.progress = full ? clamp(1 - distance(projectile, target) / full, 0, 1) : 1;
    projectile.h = height(projectile.progress);
    if (hit || step >= d - 1e-10) {
      field.addPool(impact, spec.radius, spec.fuel); field.emit({...impact, h: projectile.h}, spec.radius, spec.heat, 'molotov');
      event('molotov-impact', impact, {projectileId: projectile.id});
    } else alive.push(projectile);
  }
  state.projectiles = alive;
}
