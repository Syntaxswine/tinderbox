import {buildingPoint} from './buildings.js';
import {ASSET_SCALE} from './asset-scale.js';

const SHOP_ID = 'bell-and-alder';
const lot = Object.freeze({x: 36, y: 9, width: 8, depth: 8});
const skins = Object.freeze({
  facade: 'inherited-plaster', trim: 'inherited-wood', door: 'inherited-wood', roof: 'inherited-roof'
});
const wallSource = Object.freeze(['farmyard:native-wall']);
const wall = (id, x, y, heading = 0) => Object.freeze({
  id: SHOP_ID + ':wall-' + id, form: 'wall', x, y, heading,
  width: ASSET_SCALE.tile, depth: ASSET_SCALE.wallThickness, height: ASSET_SCALE.wallHeight,
  physicalMaterial: 'masonry', skinSlots: skins, sourceRefs: wallSource
});
const along = (length, callback) => Array.from({length}, (_, i) => callback(i));

const prop = (id, form, x, y, {quarterTurns = 0, material = null} = {}) => Object.freeze({
  id: SHOP_ID + ':' + id, assetId: 'city1880-' + form, x, y, quarterTurns, material
});
const wood = {material: 'wood'};
const faceAisle = {...wood, quarterTurns: 3};
const props = [
  prop('shelf-west', 'shelf-stocked', 37.5, 9.58, wood),
  prop('shelf-east', 'shelf-stocked', 38.5, 9.58, wood),
  prop('counter', 'counter', 37.5, 12.5, wood),
  prop('scale', 'scale-counter', 38.5, 12.5, wood),
  prop('case', 'glass-case', 37.1, 14.85, faceAisle),
  prop('fabric', 'bolt-rack', 37.25, 15.95, faceAisle),
  prop('settee', 'settee', 42.6, 10.48, wood),
  prop('table', 'pedestal-table', 42.6, 12, wood),
  prop('chair', 'side-chair', 42.15, 13.45, wood),
  prop('parlor-lamp', 'table-lamp-lit', 41.65, 11.6, wood),
  prop('shop-lamp', 'shop-pendant-lit', 38.5, 12.5),
  prop('trade-sign', 'hanging-sign-goods', 43.5, 17.579),
  ...[37.5, 38.5, 41.5, 42.5].map((x, i) => prop('cornice-' + i, 'room-cornice', x, 9.57)),
  ...[37.5, 38.5, 41.5, 42.5].map((x, i) => prop('front-glazing-' + i, 'shop-window', x, 17, {material: 'glass'})),
  ...along(5, i => prop('east-glazing-' + i, 'shop-window', 44, 12.5 + i, {material: 'glass', quarterTurns: 3}))
];

// Native map-density envelopes from the pinned Nautilus catalogue, in local
// X, Z and top height. Rotation uses the same planar transform as street lots.
const measured = {
  'city1880-shelf-stocked': [-.499, -.498, .499, .0545, 1.973],
  'city1880-counter': [-.499, -.3185, .499, .3265, .9495],
  'city1880-scale-counter': [-.499, -.3185, .499, .3265, 1.297],
  'city1880-glass-case': [-.499, -.3185, .499, .3265, 1.107],
  'city1880-bolt-rack': [-.484, -.4195, .484, .3935, 1.181497],
  'city1880-settee': [-.8705, -.3025, .8705, .3305, 1.1],
  'city1880-pedestal-table': [-.311947, -.328, .311947, .328, .747],
  'city1880-side-chair': [-.241, -.238, .241, .2255, 1.1],
  'city1880-table-lamp-lit': [-.311947, -.328, .311947, .328, 1.275],
  'city1880-shop-window': [-.5, -.0585, .5, .135, 2.12]
};
function obstacle(placement) {
  const [x0, y0, x1, y1, height] = measured[placement.assetId];
  const center = buildingPoint(placement, {x: (x0 + x1) / 2, y: (y0 + y1) / 2});
  const [width, depth] = placement.quarterTurns % 2 ? [y1 - y0, x1 - x0] : [x1 - x0, y1 - y0];
  return Object.freeze({id: placement.id, shopId: SHOP_ID, kind: 'shop-prop', ...center,
    width, depth, height, material: placement.material, solid: true, blocksHeat: true});
}

export const BELL_AND_ALDER = Object.freeze({
  id: SHOP_ID,
  entrance: Object.freeze({x: 40, y: 17, width: 2}),
  patches: Object.freeze([Object.freeze({...lot, material: 'wood'})]),
  modules: Object.freeze([
    ...along(8, i => wall('rear-' + i, 36.5 + i, 9)),
    ...along(8, i => wall('west-' + i, 36, 9.5 + i, Math.PI / 2)),
    ...along(3, i => wall('east-' + i, 44, 9.5 + i, Math.PI / 2)),
    wall('front-west', 36.5, 17),
    wall('front-east', 43.5, 17)
  ]),
  obstacles: Object.freeze(props.filter(p => p.material).map(obstacle)),
  props: Object.freeze(props)
});
