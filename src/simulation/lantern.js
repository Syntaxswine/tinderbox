import {clamp, distance, impactPoint, movementVector, worldRayTarget} from './geometry.js';

const DEAD_ZONE = .12, MIN_RANGE = .15, LAUNCH_HEIGHT = .8, LANDING_HEIGHT = .1;
const MAX_TRACE_STEPS = 192, PATH_SEGMENTS = 12, EPS = 1e-9;

function canReach(player, target, config) {
  if (!target) return false;
  const range = distance(player, target), spec = config.tools.molotov;
  return range >= MIN_RANGE && range <= spec.range + EPS && spec.speed * config.step > 0;
}

export function adjustLanternAim(player, stick, world, config) {
  const aim = player.lanternAim, magnitude = Math.hypot(stick.x, stick.y);
  aim.adjusting = magnitude > 0;
  aim.canThrow = !aim.adjusting && canReach(player, aim.target, config);
  if (magnitude <= DEAD_ZONE) return;

  const ground = movementVector(stick, false, config.input);
  const reach = (Math.min(1, magnitude) - DEAD_ZONE) / (1 - DEAD_ZONE) * config.tools.molotov.range;
  const target = worldRayTarget(player, {x: ground.x / magnitude, y: ground.y / magnitude}, reach, world);
  player.heading = Math.atan2(ground.y, ground.x);
  if (aim.target && distance(aim.target, target) <= EPS) return;
  aim.target = target;
  aim.impact = null;
  aim.path = [];
}

export function cancelLanternAim(state) {
  if (!state.player.lanternAim) return;
  const {x, y} = state.input.move;
  state.moveNeedsNeutral ||= x !== 0 || y !== 0;
  state.input.move = {x: 0, y: 0};
  state.player.lanternAim = null;
  state.lanternPreview = null;
}

function launch(origin, target) {
  return {x: origin.x, y: origin.y, fromX: origin.x, fromY: origin.y,
    targetX: target.x, targetY: target.y, progress: 0, h: LAUNCH_HEIGHT};
}

export function useLantern(state, event) {
  const player = state.player, tool = player.tool, aim = player.lanternAim;
  if (player.inventory.molotovs < 1) return event('tool-rejected', player, {tool, reason: 'empty'});
  if (!aim) {
    player.lanternAim = {target: null, impact: null, path: [], adjusting: false, canThrow: false};
    state.closeAim = null;
    return;
  }
  if (!aim.target || aim.adjusting) return event('tool-rejected', player, {tool, reason: 'aim'});
  if (!aim.canThrow) return event('tool-rejected', player, {tool, reason: 'range'});

  const projectile = {id: 'molotov:' + ++state.projectileSequence, ...launch(player, aim.target)};
  cancelLanternAim(state);
  player.inventory.molotovs--;
  state.projectiles.push(projectile);
  event('tool-use', player, {tool, projectileId: projectile.id});
}

function arcHeight(progress, range) {
  return LAUNCH_HEIGHT * (1 - progress) + LANDING_HEIGHT * progress +
    Math.sin(progress * Math.PI) * Math.min(2, range * .35);
}

// Both the flight and the preview use the same step and the existing swept
// obstacle query. A live shot still rechecks obstacles as fire changes them.
export function advanceLantern(projectile, travel, obstacles) {
  const target = {x: projectile.targetX, y: projectile.targetY};
  const remaining = distance(projectile, target), step = Math.min(remaining, travel);
  const ratio = remaining > 1e-10 ? step / remaining : 1;
  const next = {x: projectile.x + (target.x - projectile.x) * ratio, y: projectile.y + (target.y - projectile.y) * ratio};
  const range = Math.hypot(projectile.targetX - projectile.fromX, projectile.targetY - projectile.fromY);
  const progressAt = point => range ? clamp(1 - distance(point, target) / range, 0, 1) : 1;
  next.h = arcHeight(progressAt(next), range);
  const point = impactPoint(projectile, next, obstacles, {startHeight: projectile.h, endHeight: next.h});
  const hit = distance(point, next) > 1e-8, progress = progressAt(point);
  const position = {...point, h: arcHeight(progress, range)};
  return {next, position, progress, hit, finished: hit || step >= remaining - 1e-10};
}

function sameBlockers(record, obstacles) {
  return record.length === obstacles.length && record.every(({box, height, destroyed}, i) =>
    box === obstacles[i] && box.height === height && box.destroyed === destroyed);
}

export function refreshLanternPreview(state, config) {
  const {player, obstacles} = state, aim = player.lanternAim;
  if (!canReach(player, aim?.target, config)) return;

  const range = distance(player, aim.target), travel = config.tools.molotov.speed * config.step;
  // The normal and powdered game traces fit within this budget. Bound work
  // for custom fixtures with tiny steps or travel speeds by sampling coarser.
  const minimumTravel = range / (MAX_TRACE_STEPS - 1);
  const normal = Math.max(travel, minimumTravel);
  const slowTravel = config.tools.molotov.speed * (config.step * config.drugs.worldScale);
  const slowed = Math.max(slowTravel, minimumTravel);
  const remainingPowder = Math.max(0, state.effects.powder.expiresAt - state.clocks.active - EPS);
  const slowSteps = slowTravel > 0 && slowed !== normal
    ? Math.min(Math.ceil(remainingPowder / config.step), Math.max(1, Math.ceil(range / slowed))) : 0;

  const cached = state.lanternPreview;
  if (cached?.target === aim.target && cached.slowSteps === slowSteps && sameBlockers(cached.obstacles, obstacles)) return;
  const projectile = launch(player, aim.target);
  let step;
  for (let i = 0; i < MAX_TRACE_STEPS; i++) {
    step = advanceLantern(projectile, i < slowSteps ? slowed : normal, obstacles);
    if (step.finished) break;
    Object.assign(projectile, step.position, {progress: step.progress});
  }
  aim.impact = step.position;
  aim.path = Array.from({length: PATH_SEGMENTS}, (_, i) => {
    const along = step.progress * i / PATH_SEGMENTS;
    return {x: player.x + (aim.target.x - player.x) * along, y: player.y + (aim.target.y - player.y) * along,
      h: arcHeight(along, range)};
  });
  aim.path.push(aim.impact);
  // Street collision boxes only change shape by replacement or by height
  // and retirement updates during a collapse.
  state.lanternPreview = {target: aim.target, slowSteps,
    obstacles: obstacles.map(box => ({box, height: box.height, destroyed: box.destroyed}))};
}
