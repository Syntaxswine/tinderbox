import {boxInterval, clamp, distance} from './geometry.js';
import {BELL_AND_ALDER} from '../content/bell-and-alder-layout.js';
import {patrolMuzzle} from '../content/patrol-pistol.js';

export const SHOP_WITNESS_RULES = Object.freeze({sightMetres: 6, halfAngle: Math.PI / 3,
  memorySeconds: 8, memoryMetres: 3, suspiciousSeconds: 5, aggressiveSeconds: 4.5, ignitionHeight: .2,
  drawSeconds: 1.2, cooldownSeconds: 1.8, shotMetres: 6, minShotMetres: .85, damage: 24, shotSeconds: .16});
const DIRECT_TOOLS = new Set(['matches', 'torch', 'flamethrower', 'molotov']);
const APRON_HEIGHT = .53, EPS = 1e-8, POST_HEADING = -Math.PI / 2;
const position = ({x, y}) => ({x, y});

function blocked(from, to, obstacles, sight = false) {
  function intersects(box) {
    const span = boxInterval(from, to, box);
    if (!span || span[1] <= EPS || span[0] >= 1 - EPS) return false;
    const a = from.h + (to.h - from.h) * span[0], b = from.h + (to.h - from.h) * span[1];
    const base = box.baseHeight ?? 0;
    const height = sight && box.portalId === BELL_AND_ALDER.door.id ? APRON_HEIGHT : box.height;
    return Math.min(a, b) <= base + height && Math.max(a, b) >= base;
  }
  return obstacles.some(box => !box.destroyed && box.solid !== false &&
    (intersects(box) || box.heatBarriers?.some(intersects)));
}

export function createShopWitness(actor, player, obstacles, {event, hurt}) {
  const rules = SHOP_WITNESS_RULES;
  const eye = actor.height * .85, torso = player.height * .76;
  actor.heading = POST_HEADING;
  let time = 0, memory = null, reaction = {kind: 'relaxed', worldTime: 0};
  let pending = [], shot = null, nextShotAt = 0;
  const contacts = new Map(), launches = new Map(), ignitions = [];

  function canSee(target, height) {
    const range = distance(actor, target);
    const facing = Math.cos(actor.heading) * (target.x - actor.x) + Math.sin(actor.heading) * (target.y - actor.y);
    return actor.hp > 0 && range <= rules.sightMetres && facing + EPS >= range * Math.cos(rules.halfAngle) &&
      !blocked({...position(actor), h: eye}, {...position(target), h: height}, obstacles, true);
  }

  function watchHeat(tool, seenPlayer, projectileId) {
    return (site, before) => {
      if (site.phase === 'burning' || site.heat <= before || (!site.fuel && site.surfaceFuel + site.depositedFuel <= EPS)) return;
      const fire = site.world ? {x: site.world.x, y: site.world.z} : site;
      const height = (site.world?.y ?? 0) + rules.ignitionHeight;
      const hit = {tool, before, after: site.heat, projectileId,
        seenPlayer: seenPlayer && canSee(fire, height) ? seenPlayer : null};
      if (!contacts.has(site)) contacts.set(site, []);
      contacts.get(site).push(hit);
    };
  }

  function face(target) {
    if (distance(actor, target) > EPS) actor.heading = Math.atan2(target.y - actor.y, target.x - actor.x);
  }

  function relax() {
    if (reaction.kind === 'relaxed') return;
    reaction = {kind: 'relaxed', worldTime: time};
    actor.heading = POST_HEADING;
  }

  function aim() {
    if (reaction.kind !== 'aggressive') return null;
    const elapsed = time - reaction.worldTime;
    const progress = elapsed + EPS >= rules.drawSeconds ? 1 : clamp(elapsed / rules.drawSeconds, 0, 1);
    return {x: reaction.x, y: reaction.y, h: torso, progress};
  }

  function tryShot() {
    // Track only the visible player. The pose holds on the last sighting while covered.
    if (!canSee(player, torso)) return;
    Object.assign(reaction, position(player));
    face(player);
    const range = distance(actor, player);
    if (time + EPS < nextShotAt || range < rules.minShotMetres || range > rules.shotMetres) return;
    const muzzle = patrolMuzzle(actor), target = {...position(player), h: torso};
    if (blocked(muzzle, target, obstacles)) return;
    nextShotAt = time + rules.cooldownSeconds;
    const fired = event('officer-shot', muzzle, {actorId: actor.id, targetId: player.id,
      muzzle, target, damage: Math.min(player.hp, rules.damage), worldTime: time});
    shot = {id: fired.id, muzzle, target, worldTime: time, duration: rules.shotSeconds};
    hurt(player, rules.damage, 'officer:' + actor.id);
  }

  return {
    observeAction(tool) { return watchHeat(tool, player.hp > 0 && canSee(player, torso) ? position(player) : null); },
    observeRelease(projectile) {
      if (player.hp > 0 && canSee(player, torso) && canSee(projectile, projectile.h)) launches.set(projectile.id, position(player));
    },
    observeImpact(projectile, impact) {
      const release = launches.get(projectile.id);
      launches.delete(projectile.id);
      return watchHeat('molotov', release && canSee(impact, impact.h) ? release : null, projectile.id);
    },
    confirmIgnition(record, site, proof) {
      if (!proof?.independent || record.parentSiteId != null || record.cause?.startsWith('cell:') || record.cause === 'structure-siding') return;
      // The exact site caught after a heat addition that could cross the cooled
      // threshold on its own. A stale tool cause or sufficient incoming spread
      // cannot turn a later fire into evidence of an observed action.
      const contact = contacts.get(site)?.find(hit => hit.tool === record.cause &&
        hit.after >= proof.required && hit.before + proof.incoming < proof.required);
      if (!contact && DIRECT_TOOLS.has(record.cause)) return;
      ignitions.push({site, contact, ...position(record), height: (record.height ?? 0) + rules.ignitionHeight});
    },
    update(worldTime, carryingLantern) {
      // Clear contacts after an advancing step, so pausing before combustion
      // preserves evidence for the already accepted action.
      const origins = ignitions.splice(0);
      contacts.clear();
      time = worldTime;
      if (shot && time - shot.worldTime >= shot.duration) shot = null;
      if (actor.hp <= 0 || player.hp <= 0) { memory = null; pending = []; launches.clear(); relax(); return; }
      const fresh = sighting => time - sighting.worldTime <= rules.memorySeconds;
      if (memory && !fresh(memory)) memory = null;
      if (reaction.kind !== 'relaxed' && time - reaction.worldTime + EPS >= rules[reaction.kind + 'Seconds']) relax();

      const direct = origins.find(fire => fire.contact?.seenPlayer && canSee(fire, fire.height));
      if (direct && reaction.kind !== 'aggressive') {
        reaction = {kind: 'aggressive', ...direct.contact.seenPlayer, worldTime: time,
          tool: direct.contact.tool, ...(direct.contact.projectileId ? {projectileId: direct.contact.projectileId} : {})};
        face(reaction);
        pending = [];
        nextShotAt = Math.max(nextShotAt, time + rules.drawSeconds);
      }
      if (reaction.kind === 'aggressive') tryShot();
      else {
        if (memory && time > memory.worldTime) {
          for (const fire of origins) if (distance(fire, memory) <= rules.memoryMetres) pending.push({fire, sighting: memory});
        }
        let notice;
        pending = pending.filter(({fire, sighting}) => {
          if (fire.site.phase !== 'burning' || !fresh(sighting)) return false;
          if (!canSee(fire, fire.height)) return true;
          notice ??= fire;
          return false;
        });
        if (notice && reaction.kind === 'relaxed') {
          reaction = {kind: 'suspicious', ...position(notice), worldTime: time};
          face(notice);
        }
      }
      if (carryingLantern && player.hp > 0 && canSee(player, torso)) memory = {playerId: player.id, ...position(player), worldTime: time};
    },
    snapshot: () => structuredClone({actorId: actor.id, memory, reaction, aim: aim(), shot})
  };
}
