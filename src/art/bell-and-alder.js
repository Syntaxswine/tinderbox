import {BELL_AND_ALDER} from '../content/bell-and-alder-layout.js';
import {Resources} from './resources.js';
import {cityProp} from '../../vendor/nautilus-engine/2fa0befbfbdc6b0e44f5a14a6f785f44e7a95d74/packages/city-props/index.js';
import {Sculpt} from '../../vendor/nautilus-engine/2fa0befbfbdc6b0e44f5a14a6f785f44e7a95d74/packages/city-props/sculpt.js';
import {CITY_PAINT_URL, createCityPropLibrary} from '../../vendor/nautilus-engine/2fa0befbfbdc6b0e44f5a14a6f785f44e7a95d74/packages/city-props/three.js';

const {door, lantern} = BELL_AND_ALDER;
const LAMPS = {
  'city1880-shop-pendant-lit': {color: 0xffbb7f, intensity: 8.5, reach: 4.7},
  'city1880-hand-lantern-lit': {color: 0xffad69, intensity: 4.8, reach: 3.4}
};

function loadAtlas(T, signal) {
  signal?.throwIfAborted();
  const loading = new T.TextureLoader().loadAsync(CITY_PAINT_URL);
  if (!signal) return loading;
  return new Promise((resolve, reject) => {
    const abort = () => reject(signal.reason);
    signal.addEventListener('abort', abort, {once: true});
    if (signal.aborted) abort();
    loading.then(texture => {
      signal.removeEventListener('abort', abort);
      if (signal.aborted) texture.dispose();
      else resolve(texture);
    }, error => {
      signal.removeEventListener('abort', abort);
      reject(error);
    });
  });
}

function addLamp(T, model, id, assetId) {
  const lamp = LAMPS[assetId];
  if (!lamp) return null;
  const light = new T.PointLight(lamp.color, lamp.intensity, lamp.reach, 2);
  light.name = id + ':flame-light';
  light.position.fromArray(cityProp(assetId).light);
  model.root.add(light);
  return light;
}

function addSculpt(T, sculpt, parent, finishes, pool) {
  for (const [finish, geometry] of sculpt.geometry()) {
    const mesh = new T.Mesh(pool.geometry(geometry), finishes.get(finish));
    mesh.name = finish;
    mesh.castShadow = mesh.receiveShadow = finish !== 'store-glass';
    parent.add(mesh);
  }
}

function makeLeaf(T, handleSide, finishes, pool) {
  const {width, depth, height} = door, half = width / 2;
  const stile = .078, span = width - 2 * stile, rail = .082;
  const lower = .53, upper = height - rail;
  const b = new Sculpt(T, 'map'), sage = {shade:.55};
  for (const side of [-1, 1]) b.box([side * (half - stile / 2), height / 2, 0], [stile, height, depth], 'sage', sage);
  for (const y of [rail / 2, lower - rail / 2, height - rail / 2]) {
    b.box([0, y, 0], [span, rail, depth], 'sage', sage);
  }
  b.box([0, lower / 2, 0], [span, lower - rail, .100], 'sage', sage);
  b.box([0, (upper + lower) / 2, 0], [.027, upper - lower, .088], 'sage', sage);
  for (const side of [-1, 1]) {
    const turn = side === 1 ? 0 : Math.PI;
    b.face([0, lower / 2, side * .0505], [span - .05, lower - 2 * rail], 'panel-green', {rotation:[0, turn, 0]});
    b.face([side * span / 4, (upper + lower) / 2, 0], [span / 2 - .02, upper - lower], 'store-glass');
    b.soft([handleSide * (half - stile / 2), .87, side * .053],
      [.036, .105, .012], 'brass', .004, {shade:.87});
  }
  const leaf = new T.Group();
  addSculpt(T, b, leaf, finishes, pool);
  return leaf;
}

export async function createBellAndAlder(T, {renderer, signal} = {}) {
  const root = new T.Group();
  root.name = 'Bell & Alder Dry Goods';
  const doorRoot = new T.Group(), beltTab = new T.Group(), geometry = new Resources();
  doorRoot.name = door.id;
  doorRoot.visible = false;
  beltTab.name = 'Lantern leather hanger';
  beltTab.visible = false;
  const records = [], leaves = [];
  let atlas, library, portable, portableLight, disposed = false;
  let lanternState = 'placed', doorOpen = null;

  function dispose() {
    if (disposed) return;
    disposed = true;
    root.removeFromParent();
    portableLight?.dispose();
    portable?.dispose();
    portable = portableLight = null;
    for (const record of records) {
      record.light?.dispose();
      record.model.dispose();
    }
    records.length = 0;
    for (const leaf of leaves) leaf.clear();
    leaves.length = 0;
    beltTab.clear();
    doorRoot.clear();
    geometry.dispose();
    library?.dispose();
    atlas?.dispose();
    library = atlas = null;
    root.clear();
  }

  try {
    atlas = await loadAtlas(T, signal);
    signal?.throwIfAborted();
    atlas.colorSpace = T.SRGBColorSpace;
    atlas.anisotropy = Math.min(8, renderer?.capabilities?.getMaxAnisotropy?.() ?? 1);
    library = createCityPropLibrary(T, atlas);
    let finishes;
    for (const prop of BELL_AND_ALDER.props) {
      const model = library.build(prop.assetId);
      const record = {prop, model, light: null};
      records.push(record);
      model.root.position.set(prop.x, 0, prop.y);
      model.root.rotation.y = -prop.quarterTurns * Math.PI / 2;
      model.root.userData = {placementId: prop.id, assetId: prop.assetId, colliderId: prop.material ? prop.id : null};
      root.add(model.root);
      record.light = addLamp(T, model, prop.id, prop.assetId);
      if (!finishes && prop.assetId === 'city1880-shop-window') {
        finishes = new Map(model.root.children.map(mesh => [mesh.name, mesh.material]));
      }
    }
    for (const handleSide of [1, -1]) leaves.push(makeLeaf(T, handleSide, finishes, geometry));
    doorRoot.add(...leaves);
    root.add(doorRoot);

    portable = library.build(lantern.assetId);
    portable.root.name = lantern.id;
    portable.root.userData = {objectId:lantern.id, assetId:lantern.assetId};
    portable.root.position.fromArray(lantern.position);
    portableLight = addLamp(T, portable, lantern.id, lantern.assetId);
    const hanger = new Sculpt(T, 'map');
    hanger.rod([0, .472, 0], [0, .525, -.106], .018, 'leather', {shade:.77});
    addSculpt(T, hanger, beltTab, finishes, geometry);
    portable.root.add(beltTab);
    root.add(portable.root);
  } catch (error) {
    dispose();
    throw error;
  }

  function updateDoor(state) {
    const poses = state?.id === door.id && Array.isArray(state.leaves) ? state.leaves : [];
    doorRoot.visible = poses.length === 2 && poses.every(p => p && typeof p.id === 'string' && [p.x, p.y, p.heading].every(Number.isFinite));
    doorOpen = doorRoot.visible ? state.open : null;
    if (!doorRoot.visible) return;
    const leftToRight = poses[0].x <= poses[1].x ? poses : [poses[1], poses[0]];
    for (const [i, leaf] of leaves.entries()) {
      const pose = leftToRight[i];
      leaf.name = pose.id;
      leaf.userData.colliderId = pose.id;
      leaf.position.set(pose.x, 0, pose.y);
      leaf.rotation.y = -pose.heading;
    }
  }

  function updateLantern(state, standPresent, player, legacy) {
    const model = portable.root;
    lanternState = legacy ? (standPresent ? 'placed' : 'spent') : (state?.id === lantern.id ? state.state : 'spent');
    model.visible = beltTab.visible = false;
    if (lanternState === 'placed' && standPresent) {
      const position = legacy ? lantern.position : state.position;
      if (!Array.isArray(position) || position.length !== 3 || !position.every(Number.isFinite)) return;
      model.position.fromArray(position);
      model.rotation.y = 0;
      model.visible = true;
    } else if (lanternState === 'carried' && player && [player.x, player.y, player.heading].every(Number.isFinite)) {
      const c = Math.cos(player.heading), s = Math.sin(player.heading);
      const side = (player.radius ?? .56) * .63, back = -.10;
      // The native hand loop reaches half a metre above its floor pivot.
      const h = (player.elevation ?? 0) + (player.height ?? 1.68) * .58 - .50;
      model.position.set(player.x + c * back - s * side, h, player.y + s * back + c * side);
      model.rotation.y = -player.heading;
      model.visible = beltTab.visible = true;
    }
  }

  const lightInfo = (id, objectId, model, light) => ({
    id, objectId, visible: model.root.visible, position: light.getWorldPosition(new T.Vector3()).toArray(),
    intensity: light.intensity, reach: light.distance
  });
  return {
    root,
    update(world, {player} = {}) {
      if (disposed) return;
      const present = new Set((world.obstacles || []).filter(o =>
        o.shopId === BELL_AND_ALDER.id && !o.destroyed).map(o => o.id));
      for (const {prop, model} of records) {
        if (prop.material) model.root.visible = present.has(prop.id);
      }
      updateDoor(world.shop?.door);
      updateLantern(world.shop?.lantern, present.has(lantern.pedestalId), player, !world.shop);
    },
    dispose,
    diagnostics() {
      return {
        disposed,
        placements: records.map(({prop, model}) => ({
          id: prop.id, assetId: prop.assetId, colliderId: prop.material ? prop.id : null, visible: model.root.visible
        })),
        door: {id:door.id, open:doorOpen, leaves:doorRoot.visible ? leaves.map(leaf => ({
          id:leaf.name, position:leaf.position.toArray(), heading:-leaf.rotation.y
        })) : []},
        lantern: {id:lantern.id, state:lanternState, visible:portable?.root.visible ?? false,
          position:portable?.root.visible ? portable.root.position.toArray() : null},
        lights: [
          ...(portableLight ? [lightInfo(lantern.pedestalId, lantern.id, portable, portableLight)] : []),
          ...records.filter(({light}) => light).map(({prop, model, light}) => lightInfo(prop.id, prop.id, model, light))
        ]
      };
    }
  };
}
