import {BELL_AND_ALDER} from '../content/bell-and-alder-layout.js';
import {cityProp} from '../../vendor/nautilus-engine/2fa0befbfbdc6b0e44f5a14a6f785f44e7a95d74/packages/city-props/index.js';
import {CITY_PAINT_URL, createCityPropLibrary} from '../../vendor/nautilus-engine/2fa0befbfbdc6b0e44f5a14a6f785f44e7a95d74/packages/city-props/three.js';

const LAMPS = {
  'city1880-shop-pendant-lit': {color: 0xffbb7f, intensity: 8.5, reach: 4.7},
  'city1880-table-lamp-lit': {color: 0xffad69, intensity: 4.8, reach: 3.4}
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

export async function createBellAndAlder(T, {renderer, signal} = {}) {
  const root = new T.Group();
  root.name = 'Bell & Alder Dry Goods';
  const records = [];
  let atlas, library, disposed = false;

  function dispose() {
    if (disposed) return;
    disposed = true;
    root.removeFromParent();
    for (const record of records) {
      record.light?.dispose();
      record.model.dispose();
    }
    records.length = 0;
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
    for (const prop of BELL_AND_ALDER.props) {
      const model = library.build(prop.assetId);
      const record = {prop, model, light: null};
      records.push(record);
      model.root.position.set(prop.x, 0, prop.y);
      model.root.rotation.y = -prop.quarterTurns * Math.PI / 2;
      model.root.userData = {placementId: prop.id, assetId: prop.assetId, colliderId: prop.material ? prop.id : null};
      root.add(model.root);
      const lamp = LAMPS[prop.assetId];
      if (lamp) {
        const light = new T.PointLight(lamp.color, lamp.intensity, lamp.reach, 2);
        record.light = light;
        light.name = prop.id + ':flame-light';
        light.position.fromArray(cityProp(prop.assetId).light);
        model.root.add(light);
      }
    }
  } catch (error) {
    dispose();
    throw error;
  }

  return {
    root,
    update(world) {
      if (disposed) return;
      const present = new Set((world.obstacles || []).filter(o =>
        o.shopId === BELL_AND_ALDER.id && !o.destroyed).map(o => o.id));
      for (const {prop, model} of records) {
        if (prop.material) model.root.visible = present.has(prop.id);
      }
    },
    dispose,
    diagnostics() {
      return {
        disposed,
        placements: records.map(({prop, model}) => ({
          id: prop.id, assetId: prop.assetId, colliderId: prop.material ? prop.id : null, visible: model.root.visible
        })),
        lights: records.filter(({light}) => light).map(({prop, model, light}) => ({
          id: prop.id, visible: model.root.visible, position: light.getWorldPosition(new T.Vector3()).toArray(),
          intensity: light.intensity, reach: light.distance
        }))
      };
    }
  };
}
