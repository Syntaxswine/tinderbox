import {boxInterval, distance} from './geometry.js';
import {BELL_AND_ALDER} from '../content/bell-and-alder-layout.js';

export const SHOP_WITNESS_RULES = Object.freeze({sightMetres: 6, halfAngle: Math.PI / 3,
  memorySeconds: 8, memoryMetres: 3, suspiciousSeconds: 5, alarmedSeconds: 7, ignitionHeight: .2});
const doorApronHeight = .53;

export function createShopWitness(actor, player, obstacles) {
  const rules = SHOP_WITNESS_RULES;
  const eye = actor.height * .85, torso = player.height * .76;
  const position = ({x, y}) => ({x, y});
  actor.heading = -Math.PI / 2;
  let memory = null, reaction = null, pending = [];
  const strikes = new Map(), ignitions = [];

  function canSee(target, height) {
    const range = distance(actor, target);
    const facing = Math.cos(actor.heading) * (target.x - actor.x) + Math.sin(actor.heading) * (target.y - actor.y);
    if (actor.hp <= 0 || range > rules.sightMetres || facing < range * Math.cos(rules.halfAngle)) return false;
    return !obstacles.some(box => {
      if (box.destroyed || box.solid === false) return false;
      const span = boxInterval(actor, target, box);
      if (!span || span[1] <= 0 || span[0] >= 1) return false;
      const low = Math.min(eye + (height - eye) * span[0], eye + (height - eye) * span[1]);
      // The shop's glazed leaves have a solid lower apron and clear glass above it.
      const top = box.portalId === BELL_AND_ALDER.door.id ? doorApronHeight : box.height;
      return low <= top;
    });
  }

  function react(kind, target, worldTime) {
    if (reaction?.kind === 'alarmed' || reaction?.kind === kind) return;
    reaction = {kind, ...position(target), worldTime};
    actor.heading = Math.atan2(target.y - actor.y, target.x - actor.x);
  }

  return {
    beginStep() { strikes.clear(); ignitions.length = 0; },
    recordStrike({record, cells}) {
      const playerAtStrike = canSee(player, torso) ? position(player) : null;
      for (const cell of cells) if (cell.phase !== 'burning') {
        const fire = cell.world ? {x: cell.world.x, y: cell.world.z} : position(cell);
        const height = (cell.world?.y ?? 0) + rules.ignitionHeight;
        const seenPlayer = playerAtStrike && canSee(fire, height) ? playerAtStrike : null;
        strikes.set(cell.publicId ?? cell.id, {tool: record.tool, seenPlayer});
      }
    },
    confirmIgnition(record, fuelSite) {
      // A propagated ignition still belongs to its earlier fire.
      if (record.parentSiteId != null || record.cause?.startsWith('cell:') || record.cause === 'structure-siding') return;
      const strike = strikes.get(record.cellId ?? record.siteId);
      // Only direct alarm needs the solver to confirm the same strike and target.
      const seenPlayer = strike && strike.tool === record.cause ? strike.seenPlayer : null;
      ignitions.push({fuelSite, seenPlayer, ...position(record), height: (record.height ?? 0) + rules.ignitionHeight});
    },
    update(worldTime, carryingLantern) {
      if (actor.hp <= 0) { memory = reaction = null; pending = []; return; }
      const fresh = sighting => worldTime - sighting.worldTime <= rules.memorySeconds;
      if (memory && !fresh(memory)) memory = null;
      if (reaction && worldTime - reaction.worldTime >= rules[reaction.kind + 'Seconds']) reaction = null;

      const alarm = ignitions.find(fire => fire.seenPlayer && canSee(fire, fire.height));
      if (memory && worldTime > memory.worldTime) {
        for (const fire of ignitions) if (distance(fire, memory) <= rules.memoryMetres) pending.push({fire, sighting: memory});
      }
      let notice;
      pending = pending.filter(({fire, sighting}) => {
        if (fire.fuelSite.phase !== 'burning' || !fresh(sighting)) return false;
        if (!canSee(fire, fire.height)) return true;
        notice ??= fire;
        return false;
      });
      if (alarm) react('alarmed', alarm.seenPlayer, worldTime);
      else if (notice) react('suspicious', notice, worldTime);
      if (carryingLantern && player.hp > 0 && canSee(player, torso)) {
        memory = {playerId: player.id, ...position(player), worldTime};
      }
    },
    snapshot: () => structuredClone({actorId: actor.id, memory, reaction})
  };
}
