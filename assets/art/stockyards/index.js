// Original editable source. Export with art/source/stockyards/export.mjs.
import {WALL_KIT} from '../../../vendor/nautilus-engine/90054d07134116a5d9661f8318a76fe68f922aad/packages/map-core/wall-runs.js';
import {makeSculpt} from './forms.js';
import {recipes, lettering} from './parts.js';

export const ENGINE_PIN = '90054d07134116a5d9661f8318a76fe68f922aad';
export const STOCKYARD_PROFILE = Object.freeze({tile: WALL_KIT.panel, wallHeight: WALL_KIT.height,
  wallThickness: WALL_KIT.thickness, floorPitch: WALL_KIT.floorSpacing, slab: .12,
  bayWidth: 4, bayDepth: 4, serviceGateClearWidth: 2});
export const STOCKYARD_SKINS = Object.freeze(['working', 'jubilee']);
export const STOCKYARD_PIECES = Object.freeze([
  'fence-straight-1m', 'fence-closure-0p72m', 'roof-header-4m', 'swine-sign', 'fence-end', 'fence-corner', 'timber-post', 'roof-post-front', 'roof-post-back',
  'gate-jamb', 'service-gate-2m', 'roof-shed-span-1m', 'roof-end-left', 'roof-end-right',
  'trough-1m', 'earth-cell-1m', 'approach-cell-1m', 'jubilee-fan', 'ribbon-bow',
  'gate-main-pier', 'gate-outer-pier', 'gate-central-arch', 'gate-pedestrian-arch', 'gate-south-arch',
  'gate-turret', 'gate-pediment', 'gate-bull-relief', 'gate-mansard-centre', 'gate-mansard-wing', 'gate-mansard-south',
  'postcard-framework', 'postcard-welcome', 'postcard-flags', 'postcard-crown-cloth', 'postcard-eagle'
]);
export const STOCKYARD_ASSETS = Object.freeze(['covered-swine-pen', 'union-stockyard-gate']);
export const STOCKYARD_SLOTS = Object.freeze(['timber', 'endgrain', 'roofwood', 'earth', 'paving', 'iron', 'stone',
  'stoneTrim', 'mortar', 'gateRoof', 'clothRed', 'clothCream', 'clothBlue', 'gilt', 'sign', 'signInk', 'water', 'frame']);
const PALETTE = {timber: 0x806043, endgrain: 0x9c7b51, roofwood: 0x65513d, earth: 0x514333, paving: 0x80715b,
  iron: 0x302e2b, stone: 0xb9aa8d, stoneTrim: 0xd0bea0, mortar: 0x6d6558, gateRoof: 0x655348,
  clothRed: 0x9c3d30, clothCream: 0xe3d3af, clothBlue: 0x334c5b, gilt: 0xb69450, sign: 0xefe0b4,
  signInk: 0x863628, water: 0x514e3e, frame: 0x64503c};
const round = n => Math.round(n * 1e6) / 1e6;
const clone = v => JSON.parse(JSON.stringify(v));
const freeze = v => { if (v && typeof v === 'object') { Object.values(v).forEach(freeze); Object.freeze(v); } return v; };
const face = (g, v) => g.userData.visibleWhen = v;
function appearance(T, inputs, textures) {
  const result = {}, owned = [];
  try {
    for (const slot of STOCKYARD_SLOTS) {
      const input = inputs[slot], texture = textures[slot];
      if (input && !input.isMaterial) throw Error('Expected a Three material for ' + slot);
      if (texture && !texture.isTexture) throw Error('Expected a Three texture for ' + slot);
      const m = input ? input.clone() : new T.MeshStandardMaterial({color: PALETTE[slot],
        roughness: slot === 'water' ? .43 : slot === 'iron' ? .68 : .91,
        metalness: slot === 'iron' ? .24 : slot === 'gilt' ? .28 : 0});
      m.vertexColors = true; m.side = T.DoubleSide; m.name = 'Stockyards / ' + slot;
      if (Object.hasOwn(textures, slot)) m.map = texture;
      const prior = m.onBeforeCompile, key = m.customProgramCacheKey.call(m), wood = ['timber', 'endgrain', 'roofwood'].includes(slot);
      m.onBeforeCompile = (s, renderer) => {
        prior?.call(m, s, renderer);
        s.vertexShader = 'varying vec3 stockPosition;\n' + s.vertexShader;
        s.vertexShader = s.vertexShader.replace('#include <begin_vertex>', '#include <begin_vertex>\nstockPosition = position;');
        s.fragmentShader = 'varying vec3 stockPosition;\n' + s.fragmentShader;
        const grain = wood
          ? 'float fibres=sin(stockPosition.y*290.0+sin(stockPosition.x*9.0+stockPosition.z*13.0)*4.0); diffuseColor.rgb *= 0.93+0.07*fibres;'
          : 'float pores=fract(sin(dot(floor(stockPosition*94.0),vec3(127.1,311.7,74.7)))*43758.5453); diffuseColor.rgb *= 0.95+0.05*pores;';
        s.fragmentShader = s.fragmentShader.replace('#include <color_fragment>', '#include <color_fragment>\n' + grain);
      };
      m.customProgramCacheKey = () => key + '/stockyard-metric-v1/' + (wood ? 'wood' : 'mineral');
      result[slot] = m; owned.push(m);
    }
    return {materials: result, owned};
  } catch (e) { for (const m of owned) m.dispose(); throw e; }
}
function physical(id) {
  if (/^gate-(?:main|outer|central|pedestrian|south-arch|turret|pediment|bull)/.test(id)) return 'limestone';
  if (id.includes('mansard')) return 'roof-cover-unverified';
  if (id === 'earth-cell-1m') return 'packed-earth';
  if (id === 'approach-cell-1m') return 'stone-on-earth';
  if (/fan|ribbon|flags|cloth/.test(id)) return 'cloth';
  if (id === 'postcard-framework') return 'frame-material-unverified';
  if (/postcard/.test(id)) return 'decorative-material-unverified';
  return 'timber-with-iron-fittings';
}
export function createStockyardAsset(T, {id = 'covered-swine-pen', bays = 1, skin = 'working', gateAngles = [],
  quarterTurns = 0, position = [0, 0, 0], materials = {}, textures = {}, seed = 1893, ground = true} = {}) {
  if (!T?.Mesh || !T?.ShapePath) throw Error('Inject the host shared Three.js namespace');
  if (![...STOCKYARD_ASSETS, ...STOCKYARD_PIECES].includes(id)) throw Error('Unknown stockyard asset ' + id);
  if (!Number.isInteger(bays) || bays < 1 || bays > 16) throw Error('bays must be an integer 1..16');
  if (!STOCKYARD_SKINS.includes(skin)) throw Error('Unknown stockyard skin');
  if (!Number.isInteger(quarterTurns) || quarterTurns < 0 || quarterTurns > 3) throw Error('quarterTurns must be 0..3');
  if (!Array.isArray(position) || position.length !== 3 || position.some(n => !Number.isFinite(n)) ||
    !Number.isInteger(position[0]) || !Number.isInteger(position[2]) ||
    Math.abs(position[1] / WALL_KIT.floorSpacing - Math.round(position[1] / WALL_KIT.floorSpacing)) > 1e-8)
    throw Error('Use integer metre X/Z positions and a native floor-pitch Y');
  for (const key of [...Object.keys(materials), ...Object.keys(textures)]) if (!STOCKYARD_SLOTS.includes(key)) throw Error('Unknown skin slot ' + key);
  if (!Array.isArray(gateAngles) || gateAngles.some(a => !Number.isFinite(a) || a < 0 || a > Math.PI / 2)) throw Error('Gate angles must be within 0..PI/2');
  const root = new T.Group(); root.name = 'stockyards/' + id; root.position.fromArray(position); root.rotation.y = quarterTurns * Math.PI / 2;
  let disposed = false, currentSkin = skin;
  const pool = appearance(T, materials, textures), b = makeSculpt(T, root, pool.materials, seed), make = recipes(T, b);
  const parts = [], doors = [], surfaces = [], connectors = [], partitions = [], postKeys = new Set();
  const rect = (x0, z0, x1, z1) => [[x0, z0], [x1, z0], [x1, z1], [x0, z1]];
  function part(assetId, instanceId, pos = [0, 0, 0], yaw = 0, dressing = false, parent = root) {
    const g = b.group(instanceId, parent, pos, yaw); make[assetId](g); if (dressing) face(g, 'jubilee');
    parts.push({assetId, instanceId, group: g, physicalMaterial: physical(assetId), dressing}); return g;
  }
  const floor = (assetId, x, z) => {
    part(assetId, 'ground/' + x + '/' + z, [x, 0, z]);
    surfaces.push({id: 'floor/' + x + '/' + z, kind: 'floor', physicalMaterial: assetId === 'earth-cell-1m' ? 'packed-earth' : 'stone-on-earth',
      polygon: rect(x, z, x + 1, z + 1).map(([px, pz]) => [px, 0, pz]), holes: [], level: 0, elevation: 0, walkable: true});
  };
  try {
    if (STOCKYARD_PIECES.includes(id)) {
      part(id, id);
      if (/^fence/.test(id)) connectors.push({id:'run-start',position:[0,0,0],outward:[-1,0,0]},{id:'run-end',position:[id==='fence-closure-0p72m'?.72:1,0,0],outward:[1,0,0]});
      if (/^roof-(?:shed|end)/.test(id)) connectors.push({id:'roof-left',position:[id==='roof-end-left'?-.2:0,2.74,2],outward:[-1,0,0]},{id:'roof-right',position:[id==='roof-end-left'?0:id==='roof-end-right'?.2:1,2.74,2],outward:[1,0,0]});
      if (id==='fence-corner')connectors.push({id:'return-end',position:[0,0,1],outward:[0,0,1]});
    }
    if (id === 'covered-swine-pen') {
      const width = 4 * bays;
      const post = (x, z, kind = 'timber-post') => {
        const key = x + '/' + z; if (postKeys.has(key)) return; postKeys.add(key); part(kind, 'post/' + key, [x, 0, z]);
      };
      for (let k = 0; k <= bays; k++) {
        const x = k * 4;
        for (let z = 0; z <= 4; z++) post(x, z, z === 0 ? 'roof-post-front' : z === 4 ? 'roof-post-back' : 'timber-post');
        for (let z = 0; z < 4; z++) part('fence-straight-1m', 'partition/' + k + '/' + z, [x, 0, z], -Math.PI / 2);
        partitions.push({id: 'partition/' + k, position: x, shared: k > 0 && k < bays, length: 4, runs: 4, postCount: 5});
      }
      for (let k = 0; k < bays; k++) {
        const x = k * 4;
        for (let i = 0; i < 4; i++) { part('fence-straight-1m', 'back/' + k + '/' + i, [x + i, 0, 4]); if (i > 0) post(x + i, 4); }
        for (const xx of [x + .9, x + 3.1]) post(xx, 0, 'gate-jamb');
        part('fence-closure-0p72m', 'front closure/' + k + '/left', [x + .09, 0, 0]);
        part('fence-closure-0p72m', 'front closure/' + k + '/right', [x + 3.19, 0, 0]);
        const leaf = part('service-gate-2m', 'gate/' + k, [x + .96, 0, -.07]); leaf.rotation.y = gateAngles[k] || 0;
        doors.push({group: leaf, angle: leaf.rotation.y, pivot: [x + .96, 0, -.07]});
        part('roof-header-4m', 'headers/' + k, [x, 0, 0]);
        for (let xx = 0; xx < 4; xx++) part('roof-shed-span-1m', 'roof/' + k + '/' + xx, [x + xx, 0, 0]);
        part('trough-1m', 'trough/' + k, [x + 2.75, 0, 3.55]);
        for (const xx of [x + 1, x + 3]) part('jubilee-fan', 'pen bunting/' + k + '/' + xx, [xx, 3.00, -.36], 0, true);
        for (const xx of [x + .05, x + 3.95]) part('ribbon-bow', 'pen ribbon/' + k + '/' + xx, [xx, 2.65, -.16], 0, true);
        part('swine-sign', 'pen sign/' + k, [x + 2, 2.80, -.42]);
        if (ground) { for (let dx = 0; dx < 4; dx++) for (let dz = 0; dz < 4; dz++) floor('earth-cell-1m', x + dx, dz); for (let dx = 0; dx < 4; dx++) floor('approach-cell-1m', x + dx, -1); }
        connectors.push({id: 'service/' + k, position: [x + 2, 0, 0], outward: [0, 0, -1], clearWidth: 2});
      }
      part('roof-end-left', 'roof/left end', [0, 0, 0]); part('roof-end-right', 'roof/right end', [width, 0, 0]);
      const ry = z => 3.02 - .14 * z;
      surfaces.push({id: 'shed roof', kind: 'roof', physicalMaterial: 'timber', walkable: false,
        polygon: [[-.2, ry(-.25), -.25], [width + .2, ry(-.25), -.25], [width + .2, ry(4.265), 4.265], [-.2, ry(4.265), 4.265]],
        supportSurface: 'continuous timber deck top; overlapping cover boards sit 0.04 m above this plane', holes: [], supportedPolygon: rect(0, 0, width, 4), overhang: {left: .2, right: .2, front: .3025, back: .3025}, deckOverhang: {front:.25,back:.265}});
      connectors.push({id: 'row-left', position: [0, 0, 2], outward: [-1, 0, 0]}, {id: 'row-right', position: [width, 0, 2], outward: [1, 0, 0]});
    }
    if (id === 'union-stockyard-gate') {
      for (const x of [-3.25, 3.25]) part('gate-main-pier', 'main pier/' + x, [x, 0, 0]);
      for (const x of [-7.125, 6.625]) part('gate-outer-pier', 'outer pier/' + x, [x, 0, 0]);
      part('gate-central-arch', 'central arch');
      part('gate-pedestrian-arch', 'north side arch', [-5.25, 0, 0]);
      part('gate-south-arch', 'south side arch', [5, 0, 0]);
      part('gate-mansard-centre', 'central roof');
      part('gate-mansard-wing', 'north wing roof', [-5.875, 0, 0]);
      part('gate-mansard-south', 'south wing roof', [5.625, 0, 0]);
      part('gate-pediment', 'central gable');
      part('gate-pediment', 'rear gable', [0,0,0], Math.PI);
      for (const x of [-3.25, 3.25]) part('gate-turret', 'turret/' + x, [x, 0, -.81]);
      part('gate-bull-relief', 'bull keystone', [0, 7.06, -1.055]);
      part('postcard-framework', 'postcard frame', [0, 0, 0], 0, true);
      part('postcard-crown-cloth', 'postcard crown cloth', [0, 10.67, -.51], 0, true);
      part('postcard-welcome', 'welcome sign', [0, 3.90, -1.15], 0, true);
      for (const x of [-3.25, 3.25]) part('postcard-flags', 'turret flag/' + x, [x, 7.22, -1.23], 0, true);
      for (const x of [-5.25, 5]) {
        part('jubilee-fan', 'side fan/' + x, [x, 3.48, -.91], 0, true);
        part('ribbon-bow', 'side ribbon/' + x, [x, 3.51, -1.02], 0, true);
      }
      const archDrape = b.group('arch bunting', root, [0, 5.61, -1.19]); face(archDrape, 'jubilee');
      for (const x of [-1.47, 1.47]) { const g = b.group('arch fan/' + x, archDrape, [x, 0, 0]); make['jubilee-fan'](g); g.scale.set(1.70, 1.43, 1); }
      parts.push({assetId: 'jubilee-fan', instanceId: 'arch bunting', group: archDrape, physicalMaterial: 'cloth', dressing: true});
      part('postcard-eagle', 'eagle on arch', [0, 5.97, -1.27], 0, true);
      if (ground) for (let x = -8; x < 8; x++) for (let z = -2; z < 3; z++) floor('approach-cell-1m', x, z);
      connectors.push({id: 'centre', position: [0, 0, 0], outward: [0, 0, -1], clearWidth: 4.92},
        {id: 'left-pedestrian', position: [-5.25, 0, 0], outward: [0, 0, -1], clearWidth: 2.42},
        {id: 'right-pedestrian', position: [5, 0, 0], outward: [0, 0, -1], clearWidth: 1.92},
        {id: 'west-fence', position: [-7, 0, 0], outward: [-1, 0, 0]}, {id: 'east-fence', position: [7, 0, 0], outward: [1, 0, 0]});
      for (const [name, cx, w, y0, y1] of [['centre', 0, 8, 6.23, 9.70], ['north', -5.875, 3.75, 3.63, 4.98], ['south', 5.625, 3.25, 3.63, 4.98]]) {
        const a = [[cx - w / 2, y0, -.15], [cx + w / 2, y0, -.15], [cx + w / 2, y0, 2.3], [cx - w / 2, y0, 2.3]],
          c = [[cx - w * .35, y1, .72], [cx + w * .35, y1, .72], [cx + w * .35, y1, 1.43], [cx - w * .35, y1, 1.43]];
        for (let i = 0; i < 4; i++) surfaces.push({id: name + '/roof/' + i, kind: 'roof', physicalMaterial: 'roof-cover-unverified', polygon: [a[i], a[(i + 1) % 4], c[(i + 1) % 4], c[i]], holes: [], walkable: false});
        surfaces.push({id: name + '/roof/crown', kind: 'roof', physicalMaterial: 'roof-cover-unverified', polygon: c, holes: [], walkable: false});
      }
    }
    b.finalize(); setSkin(skin);
  } catch (e) { b.dispose(); for (const m of pool.owned) m.dispose(); root.clear(); throw e; }
  function setSkin(next) {
    if (disposed) throw Error('Stockyard asset disposed');
    if (!STOCKYARD_SKINS.includes(next)) throw Error('Unknown stockyard skin');
    currentSkin = next; root.traverse(g => { if (g.userData.visibleWhen) g.visible = g.userData.visibleWhen === next; }); root.updateMatrixWorld(true);
  }
  function setGateAngle(index, radians) {
    if (disposed) throw Error('Stockyard asset disposed');
    if (!Number.isInteger(index) || !doors[index] || !Number.isFinite(radians) || radians < 0 || radians > Math.PI / 2) throw Error('Invalid gate leaf angle');
    doors[index].angle = radians; doors[index].group.rotation.y = radians; root.updateMatrixWorld(true);
  }
  function measure(g = root, visible = true) {
    root.updateMatrixWorld(true); const bounds = new T.Box3(), v = new T.Vector3();
    const visit = o => { if (o.isMesh) { const p = o.geometry.attributes.position; for (let i = 0; i < p.count; i++) bounds.expandByPoint(v.fromBufferAttribute(p, i).applyMatrix4(o.matrixWorld)); } };
    if (visible) g.traverseVisible(visit); else g.traverse(visit);
    return bounds.isEmpty() ? null : {min: bounds.min.toArray().map(round), max: bounds.max.toArray().map(round)};
  }
  const transformPoint = p => new T.Vector3(...p).applyMatrix4(root.matrixWorld).toArray().map(round);
  const transformNormal = p => new T.Vector3(...p).transformDirection(root.matrixWorld).toArray().map(round);
  function metadata() {
    root.updateMatrixWorld(true);
    const minClear = id === 'union-stockyard-gate' ? [
      {id: 'central passage', polygon: rect(-2.46, -.65, 2.46, .65), width: 4.92, nominalArchWidth: 5, minHeight: currentSkin === 'jubilee' ? 3.55 : 3.80},
      {id: 'left passage', polygon: rect(-6.46, -.65, -4.04, .65), width: 2.42, nominalArchWidth: 2.5, minHeight: 2.18},
      {id: 'right passage', polygon: rect(4.04, -.65, 5.96, .65), width: 1.92, nominalArchWidth: 2, minHeight: 2.18}
    ] : id === 'covered-swine-pen' ? doors.map((d, i) => ({id: 'service/' + i, width: 2, minHeight: 2.15, open: d.angle === Math.PI / 2,
      polygon: rect(i * 4 + 1, -.25, i * 4 + 3, .25)})) : [];
    const partRecords = parts.filter(p => !p.dressing || currentSkin === 'jubilee').map(({group, ...p}) => {
      const bounds = measure(group), slots = new Set(); group.traverse(o => { if (o.isMesh) slots.add(o.material.name.split(' / ')[1]); });
      return {...p, bounds, skinSlots: [...slots], footprint: bounds ? rect(bounds.min[0], bounds.min[2], bounds.max[0], bounds.max[2]) : []};
    });
    return freeze({assetId: id, version: 1, units: 'metres', nativeProfile: STOCKYARD_PROFILE, enginePin: ENGINE_PIN,
      skin: currentSkin, placement: {position: [...position], quarterTurns}, bays: id === 'covered-swine-pen' ? bays : null,
      bounds: measure(), parts: partRecords, partitions: clone(partitions), postCount: postKeys.size,
      groundFootprints: parts.filter(p=>!p.dressing||currentSkin==='jubilee').flatMap(p=>b.contactFootprints(p.group).map((poly,i)=>({id:p.instanceId+'/contact/'+i,physicalMaterial:p.physicalMaterial,polygon:poly.map(v=>v.map(round))}))),
      dressingAttachments: parts.filter(p=>p.dressing||/fan|ribbon|flags|cloth|framework/.test(p.assetId)).map(p=>{
        const g=p.group,anchors=p.instanceId==='arch bunting'?[[-2.915,0,0],[0,0,0],[2.915,0,0]]:p.assetId==='postcard-crown-cloth'?[[-3,0,0],[-1,0,0],[1,0,0],[3,0,0]]:p.assetId==='postcard-framework'?[[-2.8,6.7,-.3],[2.8,6.7,-.3]]:p.assetId==='postcard-welcome'?[[-1.6,1,0],[1.6,1,0]]:p.assetId==='jubilee-fan'?[[-.85,0,0],[.85,0,0]]:p.assetId==='postcard-flags'?[[-.46,0,0],[.46,0,0]]:[[0,0,0]];
        const origin=g.getWorldPosition(new T.Vector3()).toArray().map(round),quaternion=g.getWorldQuaternion(new T.Quaternion()).toArray().map(round);
        return {id:p.instanceId,assetId:p.assetId,active:currentSkin==='jubilee'||!p.dressing,position:origin,quaternion,
          anchors:anchors.map((v,i)=>({id:'tie/'+i,position:new T.Vector3(...v).applyMatrix4(g.matrixWorld).toArray().map(round)})),
          replaceableSlots:['clothRed','clothCream','clothBlue','gilt','frame']};
      }),
      surfaces: surfaces.map(s => ({...s, polygon: s.polygon.map(transformPoint), elevation: s.kind === 'floor' ? position[1] : undefined,
        ...(s.supportedPolygon ? {supportedPolygon: s.supportedPolygon.map(([x, z]) => transformPoint([x, 0, z]))} : {})})),
      connectors: connectors.map(c => ({...c, position: transformPoint(c.position), outward: transformNormal(c.outward)})),
      gates: doors.map((d, i) => ({id: 'gate/' + i, pivot: transformPoint(d.pivot), axis: transformNormal([0, 1, 0]), angle: d.angle,
        closedAngle: 0, fullOpenAngle: Math.PI / 2, swing: 'outward into -Z approach before assembly rotation', clearWidth: 2})),
      apertures: (id==='union-stockyard-gate'?[
        ['central',0,5,3.8,1.38],['north',-5.25,2.5,2.18,.77],['south',5,2,2.18,.77]
      ]:id==='gate-central-arch'?[['central',0,5,3.8,1.38]]:id==='gate-pedestrian-arch'?[['north',0,2.5,2.18,.77]]:id==='gate-south-arch'?[['south',0,2,2.18,.77]]:[]).map(([name,cx,width,spring,rise])=>({
        id:name,kind:'arch-opening-profile-before-plinth',nominalWidth:width,spring,crown:spring+rise,depth:1.57,
        profile:[[cx-width/2,0,0],[cx+width/2,0,0],...Array.from({length:31},(_,i)=>{const a=i*Math.PI/30;return[cx+width/2*Math.cos(a),spring+rise*Math.sin(a),0];})].map(transformPoint)
      })),
      passages: minClear.map(p => ({...p, polygon: p.polygon.map(([x, z]) => transformPoint([x, 0, z]))})),
      sourceIds: id === 'covered-swine-pen' ? ['SY-1878', 'SY-1890', ...(currentSkin === 'jubilee' ? ['SY-POSTCARD'] : [])] : ['SY-CITY', 'SY-NPS-1977', 'SY-POSTCARD'],
      measurementStatus: 'Source-derived silhouette; gate openings rounded from the later NPS written measurements. Pen dimensions and unseen details are game adaptations.',
      integration: 'Art provider only. No runtime placement, collision, fire response, traversal or gate-interaction wiring.'});
  }
  function diagnostics() {
    const meshes = [], mats = new Set(); root.traverseVisible(o => { if (o.isMesh) { meshes.push(o); mats.add(o.material); } });
    return {disposed, id, skin: currentSkin, parts: parts.length, visibleMeshes: meshes.length,
      triangles: meshes.reduce((n, m) => n + m.geometry.attributes.position.count / 3, 0),
      geometries: b.resources().length, ownedMaterials: pool.owned.length, borrowedTextures: new Set(Object.values(textures).filter(Boolean)).size,
      bounds: disposed ? null : measure()};
  }
  function dispose() { if (disposed) return; disposed = true; root.removeFromParent(); b.dispose(); for (const m of pool.owned) m.dispose(); root.clear(); }
  return {root, get bounds() { return measure(); }, get metadata() { return metadata(); }, setSkin, setGateAngle, diagnostics, dispose};
}
export const createStockyardPiece = (T, options) => createStockyardAsset(T, options);
