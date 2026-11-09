import {BELL_AND_ALDER} from '../content/bell-and-alder-layout.js';
import {discOverlapsObstacle, distance, sweptDiscClear} from './geometry.js';

const {id: shopId, entrance, door, lantern} = BELL_AND_ALDER;
const {id: doorId, width: doorWidth, depth: doorThickness, height: doorHeight} = door;
const {id: lanternId, pedestalId, position} = lantern;
const lanternPoint = {x: position[0], y: position[2]};
const reach = 1.65;

function entryLeaves(open) {
  return [-1, 1].map(side => ({
    id: doorId + (side < 0 ? ':left' : ':right'), shopId, portalId: doorId,
    kind: 'door', material: 'glass', solid: true, blocksHeat: true, destroyed: false,
    x: entrance.x + side * (open ? entrance.width / 2 : doorWidth / 2),
    y: entrance.y - (open ? doorWidth / 2 : 0),
    width: open ? doorThickness : doorWidth, depth: open ? doorWidth : doorThickness,
    height: doorHeight, heading: open ? side * Math.PI / 2 : 0
  }));
}

export function createShopInteractions(world, state, event) {
  if (world.shopId !== shopId) return null;
  const {obstacles, player, actors} = state;
  const poses = {open: entryLeaves(true), close: entryLeaves(false)};
  const firstLeaf = obstacles.length;
  if (poses.close.some(leaf => obstacles.some(box => box.id === leaf.id))) throw Error('Scenario IDs must be unique');
  // Keep movable leaves out of the static ground material and timber footprints.
  obstacles.push(...poses.close.map(leaf => ({...leaf})));
  const support = obstacles.find(box => box.id === pedestalId);
  let open = false, taken = false;

  const lanternState = () => taken ? 'carried' : support && !support.destroyed ? 'placed' : 'spent';
  function inReach(point, ignore) {
    return distance(player, point) <= reach &&
      sweptDiscClear(player, point, player.radius, world, obstacles.filter(box => !ignore(box)));
  }
  function occupied(leaves) {
    return [player, ...actors].some(actor => actor.hp > 0 && leaves.some(leaf =>
      discOverlapsObstacle(actor, actor.radius ?? .2, leaf)));
  }
  function interaction() {
    if (player.hp <= 0 || player.lanternAim) return null;
    const paused = state.paused ? 'Paused.' : '';
    if (inReach(entrance, box => box.portalId === doorId)) {
      const action = open ? 'close' : 'open';
      const reason = paused || (occupied(poses[action]) ? 'Move clear of the door.' : '');
      return {id: doorId, kind: 'door', action, label: (open ? 'Close' : 'Open') + ' shop doors',
        enabled: !reason, reason, anchor: [entrance.x, 2.15, entrance.y]};
    }
    if (lanternState() === 'placed' && inReach(lanternPoint, box => box.id === pedestalId)) {
      return {id: lanternId, kind: 'lantern', action: 'take', label: 'Take lantern',
        enabled: !paused, reason: paused, anchor: [lanternPoint.x, 1.35, lanternPoint.y]};
    }
    return null;
  }
  return {
    interaction,
    carriesLantern: () => taken,
    accepts(command) {
      if (Object.hasOwn(command, 'portalId')) {
        return !Object.hasOwn(command, 'objectId') && command.portalId === doorId &&
          (command.action === 'open' || command.action === 'close');
      }
      return Object.hasOwn(command, 'objectId') && command.objectId === lanternId && command.action === 'take';
    },
    interact(command) {
      const target = interaction();
      if (!target?.enabled || target.id !== (command.portalId ?? command.objectId) || target.action !== command.action) return;
      if (target.kind === 'door') {
        open = command.action === 'open';
        // Preserve the array shared by HeatField. New box identities invalidate
        // any cached lantern trajectory that used the previous poses.
        poses[command.action].forEach((leaf, index) => { obstacles[firstLeaf + index] = {...leaf}; });
        event('portal-state', entrance, {portalId: doorId, open});
      } else {
        taken = true;
        event('lantern-taken', lanternPoint, {objectId: lanternId, actorId: player.id});
      }
    },
    snapshot() {
      const leaves = obstacles.slice(firstLeaf, firstLeaf + poses.close.length)
        .map(({id, x, y, width, depth, height, heading}) => ({id, x, y, width, depth, height, heading}));
      const state = lanternState();
      return {door: {id: doorId, open, leaves}, lantern: {id: lanternId, state,
        position: state === 'placed' ? [...position] : null}};
    }
  };
}
