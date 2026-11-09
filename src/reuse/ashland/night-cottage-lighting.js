const CLUSTER_RADIUS_SQUARED = 5.52;
const SEPARATION_SQUARED = 7.29;
const SKY_FILL = .99;

function category(cell) {
  if (cell.face === 'falling fuel') return 'timber';
  if (cell.face === 'upper' || cell.face === 'lower') return 'floor';
  return 'shell';
}

function distanceSquared(a, b) {
  return (a.x - b.x) ** 2 + (a.y - b.y) ** 2 + (a.z - b.z) ** 2;
}

function setLocalLight(light, seed, cells, strength) {
  light.userData.outdoorFire = Boolean(seed && category(seed) === 'shell');
  if (!seed) {
    light.position.set(0, 0, 0);
    light.intensity = 0;
    light.distance = 0;
    return;
  }

  const kind = category(seed);
  if (kind === 'timber') {
    light.position.set(seed.x, Math.max(.22, seed.y + .18), seed.z);
    light.intensity = Math.min(3.2, 3.2 * Math.sqrt(seed.flame));
    light.distance = 3.15;
    return;
  }

  let energy = 0, x = 0, y = 0, z = 0;
  for (const cell of cells) {
    if (!(cell.flame > 0) || category(cell) !== kind) continue;
    const distance = distanceSquared(seed, cell);
    if (distance >= CLUSTER_RADIUS_SQUARED) continue;
    const edge = 1 - distance / CLUSTER_RADIUS_SQUARED;
    const heat = Math.min(1, cell.flame) * edge * edge;
    energy += heat;
    x += cell.x * heat;
    y += cell.y * heat;
    z += cell.z * heat;
  }

  // Offsets follow the exposed face while the source position stays attached
  // to the supplied roof, wall, floor, or ember footprint.
  const nx = seed.nx ?? (seed.face === 'left' ? -1 : seed.face === 'right' ? 1 : 0);
  const nz = seed.nz ?? (seed.face === 'front' ? -1 : seed.face === 'back' ? 1 : 0);
  const outward = seed.part === 'roof' ? .25 : seed.part === 'walls' ? .36 : 0;
  const lift = seed.part === 'roof' ? .49 : kind === 'floor' ? .36 : .42;
  light.position.set(x / energy + nx * outward, Math.max(.22, y / energy + lift), z / energy + nz * outward);

  const heat = Math.sqrt(energy);
  const emberFade = seed.face === 'ground' ? .55 : 1;
  light.intensity = Math.min(kind === 'floor' ? 3.45 : 5.4, 2.7 * heat) * strength * emberFade;
  light.distance = Math.min(kind === 'floor' ? 3.55 : 5.0, 3.0 + .45 * heat);
}

function lightCottage(cells, [primary, detail], cutaway) {
  let shell, floor, timber;
  for (const cell of cells) {
    if (!(cell.flame > 0)) continue;
    const kind = category(cell);
    if (kind === 'timber') {
      if (!timber || cell.flame > timber.flame) timber = cell;
    } else if (kind === 'floor') {
      if (!floor || cell.flame > floor.flame) floor = cell;
    } else if (!shell || cell.flame > shell.flame) shell = cell;
  }

  const key = shell ?? floor ?? timber;
  let second = timber && timber !== key ? timber : cutaway && floor !== key ? floor : undefined;
  if (!second && key) {
    for (const cell of cells) {
      if (!(cell.flame > 0) || distanceSquared(key, cell) < SEPARATION_SQUARED) continue;
      if (!second || cell.flame > second.flame) second = cell;
    }
  }

  setLocalLight(primary, key, cells, key === floor && !cutaway ? .65 : 1);
  setLocalLight(detail, second, cells, second === floor ? (cutaway ? .93 : .57) : .76);
}

export function createNightCottageLighting(T) {
  const root = new T.Group();
  root.name = 'Paired cottages at night';
  const clearColor = new T.Color(0x101b30);
  const sky = new T.HemisphereLight(0x8ca9df, 0x4a5672, SKY_FILL);
  sky.name = 'Cool night sky fill';
  const moon = new T.DirectionalLight(0xb9cdff, 1.0);
  moon.name = 'Ashland moonlight';
  moon.position.set(-13, 21, 22);
  moon.target.position.set(7.5, 1, 9);
  moon.castShadow = true;
  moon.shadow.mapSize.set(1024, 1024);
  Object.assign(moon.shadow.camera, {left: -19, right: 19, top: 19, bottom: -19, near: .4, far: 58});
  moon.shadow.camera.updateProjectionMatrix();
  moon.shadow.normalBias = .024;
  moon.shadow.bias = -.00018;
  moon.shadow.autoUpdate = false;
  root.add(sky, moon, moon.target);

  const cottages = ['Source', 'Receiver'].map(name => {
    const primary = new T.PointLight(0xffa451, 0, 0, 2);
    const detail = new T.PointLight(0xff8e3b, 0, 0, 2);
    primary.name = name + ' fire light';
    detail.name = name + ' fire detail light';
    root.add(primary, detail);
    return [primary, detail];
  });
  let disposed = false;

  function update({sourceCells = [], receiverCells = [], cutaway = false} = {}) {
    if (disposed) return;
    sky.intensity = cutaway ? 1.05 : SKY_FILL;
    lightCottage(sourceCells, cottages[0], false);
    lightCottage(receiverCells, cottages[1], cutaway);
  }

  function dispose() {
    if (disposed) return;
    disposed = true;
    root.removeFromParent();
    moon.dispose();
    for (const lights of cottages) for (const light of lights) light.dispose();
    root.clear();
  }

  return {root, moon, clearColor, fireLights: cottages, update, dispose};
}
