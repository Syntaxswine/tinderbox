import {WALL_HEIGHT, roomBoxes} from '../../vendor/farmyard-commando/30a3b8cae5f36bb0c1df3685b7fba16f701c2083/sites/tactical-animal/dist/aft/tactics/hybrid-geometry.js';
// Native dimensions, derived from unchanged source templates. hybrid-world.js
// DIMENSIONS independently uses wall=2, slab=.12, floorSpacing=2.12, tile=1.
const native = roomBoxes({doorClosed: true, roof: true});
const get = name => native.find(part => part.name === name);
export const ASSET_SCALE = Object.freeze({
  worldUnitsPerMetre: 1, tile: get('Left pier').size[0], wallHeight: WALL_HEIGHT,
  wallThickness: get('Left pier').size[2], slab: get('Roof').size[1],
  floorSpacing: WALL_HEIGHT + get('Roof').size[1],
  doorWidth: get('Closed door').size[0], doorHeight: get('Closed door').size[1],
  doorThickness: get('Closed door').size[2]
});
export function wallStoryHeight(stories) {
  if (!Number.isInteger(stories) || stories < 1 || stories > 5) throw Error('Wall stories must be an integer from 1 to 5');
  return ASSET_SCALE.wallHeight + (stories - 1) * ASSET_SCALE.floorSpacing;
}
