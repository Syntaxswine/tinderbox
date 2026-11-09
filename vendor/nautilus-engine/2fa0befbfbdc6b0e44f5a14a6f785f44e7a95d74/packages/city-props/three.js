import {cityProp, cityPropURLs} from './index.js';
import {Sculpt} from './sculpt.js';
import {FURNITURE} from './furniture.js';
import {SHOP_FIXTURES} from './shops.js';
import {OIL_LIGHTS} from './lamps.js';
import {STOREFRONT_FORMS} from './storefront.js';
import {paintCityTrim, TRIM_WIDTH, TRIM_HEIGHT} from './trim-paint.js';

export const CITY_PAINT_URL = cityPropURLs('city1880-side-chair').atlas;
const forms = {...FURNITURE, ...SHOP_FIXTURES, ...STOREFRONT_FORMS, ...OIL_LIGHTS};
export function sculptCityProp(THREE, id, detail = 'map') {
  if (!['map', 'sculpt'].includes(detail)) throw new RangeError('Unknown city prop mesh density: ' + detail);
  const prop = cityProp(id), sculpt = new Sculpt(THREE, detail);
  forms[prop.form](sculpt, prop.lit);
  return sculpt.geometry();
}

function cityTrimTexture(THREE) {
  const painted = paintCityTrim();
  const pixels = new Uint8Array(painted.length);
  const stride = TRIM_WIDTH * 4;
  for (let y = 0; y < TRIM_HEIGHT; y++) {
    pixels.set(painted.subarray(y * stride, (y + 1) * stride), (TRIM_HEIGHT - y - 1) * stride);
  }
  const texture = new THREE.DataTexture(pixels, TRIM_WIDTH, TRIM_HEIGHT, THREE.RGBAFormat);
  texture.colorSpace = THREE.SRGBColorSpace;
  texture.magFilter = THREE.LinearFilter;
  texture.minFilter = THREE.LinearMipmapLinearFilter;
  texture.generateMipmaps = true;
  texture.needsUpdate = true;
  return texture;
}

export function createCityPropLibrary(THREE, atlas) {
  if (!atlas?.isTexture) throw new TypeError('Load the city paint atlas before creating models.');
  const glass = (color, opacity) => new THREE.MeshStandardMaterial({
    color, opacity, transparent: true, depthWrite: false, roughness: .25, side: THREE.DoubleSide
  });
  const materials = {
    paint: new THREE.MeshStandardMaterial({map: atlas, vertexColors: true, roughness: .75}),
    trim: new THREE.MeshStandardMaterial({vertexColors: true, roughness: .77}),
    glass: glass(0xb6c9bb, .27),
    'store-glass': glass(0x9db8b4, .23),
    amber: glass(0xf1c475, .28),
    mirror: new THREE.MeshStandardMaterial({color: 0x8b9c9e, metalness: .38, roughness: .26}),
    flame: new THREE.MeshBasicMaterial({color: 0xffbf55, toneMapped: false})
  };
  const templates = new Map();
  let disposed = false;
  return Object.freeze({
    build(id) {
      if (disposed) throw new Error('City prop library is disposed.');
      if (!templates.has(id)) templates.set(id, sculptCityProp(THREE, id));
      const root = new THREE.Group();
      root.name = cityProp(id).name;
      for (const [finish, geometry] of templates.get(id)) {
        if (finish === 'trim' && !materials.trim.map) {
          materials.trim.map = cityTrimTexture(THREE);
          materials.trim.needsUpdate = true;
        }
        const mesh = new THREE.Mesh(geometry, materials[finish]);
        mesh.name = finish;
        mesh.castShadow = finish === 'paint' || finish === 'trim';
        mesh.receiveShadow = mesh.castShadow;
        root.add(mesh);
      }
      // Individual placements borrow immutable geometry, materials and the shared atlas.
      return {root, dispose() { root.removeFromParent(); root.clear(); }};
    },
    dispose() {
      if (disposed) return;
      disposed = true;
      for (const parts of templates.values()) for (const geometry of parts.values()) geometry.dispose();
      materials.trim.map?.dispose();
      for (const material of Object.values(materials)) material.dispose();
      templates.clear();
    }
  });
}
