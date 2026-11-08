import {createSplatPatch} from './splats.js';

const LIMIT = 80;
const SPLATS_PER_CELL = 8;
const SOOT_LIFETIME = 1.8;
const TAU = Math.PI * 2;

function cellPhase(id) {
  const key = String(id);
  let hash = 2166136261;
  for (let i = 0; i < key.length; i += 1) hash = Math.imul(hash ^ key.charCodeAt(i), 16777619);
  // Grid-neighbour IDs should not share nearly identical motion phases.
  hash = Math.imul(hash ^ (hash >>> 16), 0x45d9f3b);
  return ((hash ^ (hash >>> 16)) >>> 0) / 4294967296;
}

export function createWallShroud(T, {maxCells = LIMIT, profile = 'wall'} = {}) {
  if (profile !== 'wall' && profile !== 'house') throw RangeError('Unknown surface fire profile');
  const house = profile === 'house';
  const windOffset = house ? .50 : .12;
  if (!Number.isInteger(maxCells) || maxCells < 1 || maxCells > LIMIT) {
    throw new RangeError('maxCells must be an integer from 1 to 80');
  }

  const maxSplats = maxCells * SPLATS_PER_CELL;
  const batch = createSplatPatch(T, {maxPatches: 0, extraCapacity: maxSplats});
  const {root} = batch;
  root.name = 'Gaussian wall shroud';
  const pool = Array.from({length: maxSplats}, () => ({}));
  const splats = [];
  const wind = new Float64Array(3);
  const surface = {};
  const {clamp, smoothstep} = T.MathUtils;
  const amber = new T.Color(0xff952c).multiplyScalar(2.35);
  const hot = new T.Color(0xffc65a).multiplyScalar(2.55);
  const faceHeat = new T.Color(0xffb044).multiplyScalar(2.25);
  const tip = new T.Color(0xff691b).multiplyScalar(1.95);
  const soot = new T.Color(0x231c19);
  const roofSoot = new T.Color(0x191614);
  let activeCells = 0;
  let disposed = false;

  function airAt(sampleWind, x, y, z) {
    wind.fill(0);
    return sampleWind?.(x, y, z, wind) ?? wind;
  }

  function splat(x, y, z, sx, sy, sz, leanX, leanZ, heading, color, alpha, smoke = false) {
    const item = pool[splats.length];
    item.x = x;
    item.y = y;
    item.z = z;
    item.sx = sx;
    item.sy = sy;
    item.sz = sz;
    item.leanX = leanX;
    item.leanZ = leanZ;
    item.heading = heading;
    item.color = color;
    item.alpha = alpha;
    item.smoke = smoke;
    splats.push(item);
  }

  function onFace(cell, tx, tz, heading, along, rise, offset, sx, sy, sz, leanX, leanZ, color, alpha) {
    const travel = Math.max(0, rise) * .51;
    splat(cell.x + tx * along + cell.nx * offset + leanX * travel,
      cell.y + rise + cell.ny * offset,
      cell.z + tz * along + cell.nz * offset + leanZ * travel,
      sx, sy, sz, leanX, leanZ, heading, color, alpha);
  }

  function flames(cell, age, phase, heat, sampleWind) {
    const {x, y, z, nx, ny, nz} = cell;
    const roof = house && cell.part === 'roof';
    const top = house ? cell.part !== 'walls' : ny > .5;
    const broad = house ? cell.part !== 'ground' : Math.abs(nz) > .5;
    const horizontal = house ? Math.hypot(nx, nz) : 0;
    const tx = house ? (horizontal > 1e-5 ? nz / horizontal : 1) : (top ? 1 : nz);
    const tz = house ? (horizontal > 1e-5 ? -nx / horizontal : 0) : -nx;
    const heading = Math.atan2(tz, tx);
    const size = .56 + .44 * Math.sqrt(heat);
    const widthFactor = house ? (broad ? 1.80 : .75) : (Math.abs(nx) > .5 ? .43 : 1);
    const heightFactor = house ? (broad ? (top ? 1.24 : 1.38) : .53) : 1;
    const span = widthFactor * size;
    const height = (.65 + .35 * smoothstep(age, 0, .28)) * size * heightFactor;
    const angle = phase * TAU;
    let anchorCell = cell;
    if (house && broad) {
      // Follow the downhill tangent on a roof pitch or a folding facade.
      const down = roof ? -.10 + .32 * Math.sin(angle + 1.05) : (top ? -.17 : -.25);
      const alongSlope = horizontal > 1e-5 ? ny * down / horizontal : 0;
      surface.x = x - nx * alongSlope;
      surface.z = z - nz * alongSlope;
      // As a burning piece sinks, keep its remaining flame above the rubble.
      surface.y = Math.max(.055, y + horizontal * down);
      surface.nx = nx;
      surface.ny = ny;
      surface.nz = nz;
      anchorCell = surface;
    }
    const wave = angle + age * (7.9 + phase * 3.4);
    const stagger = broad ? (roof ? .137 : .096) * Math.sin(angle) * span : 0;
    const base = house ? (.028 + (broad ? .053 * Math.cos(angle + 1.7) : 0))
      : (top ? .029 : -.145 + (broad ? .069 * Math.cos(angle + 1.7) : 0));
    const stretch = broad ? 1.28 : 1;
    const pinch = broad ? .76 : 1;
    const air = airAt(sampleWind, x + nx * windOffset, y + ny * windOffset, z + nz * windOffset);
    const inward = air[0] * nx + air[2] * nz;
    const held = .17 * Math.max(0, inward) - inward;
    const leanX = clamp((air[0] + held * nx) * .46, -.34, .34);
    const leanZ = clamp((air[2] + held * nz) * .46, -.34, .34);
    const lift = 1 + clamp(air[1] * .20, -.10, .16);

    // The amber underlay carries across rows while the hotter folds stay
    // narrow. Stagger their roots so the bright cores break up the grid.
    const underlay = stagger + .031 * Math.sin(wave) * span;
    if (roof) {
      // Stretch the low flame along the pitch while its short axis stays
      // close to the shingles. The higher folds still rise in world space.
      const incline = ny / Math.max(horizontal, .075);
      const uphillX = horizontal > 1e-5 ? -nx / horizontal * incline : 0;
      const uphillZ = horizontal > 1e-5 ? -nz / horizontal * incline : incline;
      const off = .077 + .013 * Math.cos(wave * .77);
      splat(anchorCell.x + tx * underlay + nx * off, anchorCell.y + ny * off,
        anchorCell.z + tz * underlay + nz * off,
        .174 * span, (.397 + .041 * Math.cos(angle)) * size, .047,
        uphillX, uphillZ, heading, amber, heat * (.56 + .10 * Math.sin(wave * .71)));
    } else {
      onFace(anchorCell, tx, tz, heading, underlay, base + .025, .043,
        (broad ? .108 : .128) * span, .112 * size * stretch * heightFactor, .028,
        leanX * .35, leanZ * .35, amber, heat * (broad ? .57 : .74));
    }

    for (let i = 0; i < 2; i += 1) {
      const ripple = Math.sin(wave + i * 2.6);
      const crest = Math.cos(wave * .82 - i * 2.8 + angle);
      const side = 2 * i - 1;
      const tall = (.52 + .12 * ripple + .055 * side) * height * lift * stretch;
      const anchor = stagger + (side * .104 + .029 * crest) * span;
      const sway = (broad ? .23 : .14) * ripple;
      const curlX = leanX + tx * sway;
      const curlZ = leanZ + tz * sway;
      onFace(anchorCell, tx, tz, heading, anchor, base + .33 * tall, .052,
        (.081 + .009 * crest) * span * pinch, .24 * tall * stretch, .036, curlX, curlZ,
        broad ? faceHeat : hot, heat * (.72 + .12 * crest));
      onFace(anchorCell, tx, tz, heading + .12 * crest, anchor + .058 * ripple * span, base + .75 * tall, .062,
        (.052 + .009 * ripple) * span * pinch, .17 * tall * stretch, .028, curlX, curlZ,
        tip, heat * (.55 + .15 * ripple));
    }

    const roll = Math.sin(wave * 1.41 + angle * .7);
    onFace(anchorCell, tx, tz, heading + .27 * roll, stagger + (.181 + .04 * roll) * span,
      base + (.22 + .051 * roll) * height, .073,
      .044 * span, .066 * height, .026, leanX + tx * .13 * roll, leanZ + tz * .13 * roll,
      amber, heat * (.40 + .10 * roll));
  }

  function smoke(cell, age, phase, strength, sampleWind) {
    const {x, y, z, nx, ny, nz} = cell;
    const large = house && cell.part !== 'ground';
    const roof = house && cell.part === 'roof';
    const plumeScale = roof ? 1.76 : (large ? 1.62 : 1);
    const wallTop = house ? (cell.part === 'walls' ? 4.12 : 0) : 2;
    for (let puff = 0; puff < 2; puff += 1) {
      const cycle = age / SOOT_LIFETIME + phase + puff * .5;
      const life = cycle - Math.floor(cycle);
      const seconds = life * SOOT_LIFETIME;
      if (seconds > age) continue;

      const fade = smoothstep(life, 0, .17) * (1 - smoothstep(life, .56, 1));
      const air = airAt(sampleWind, x + nx * windOffset,
        y + (house ? ny * windOffset : 0) + .32 + seconds * .43, z + nz * windOffset);
      // Restrict inward motion while the plume is still climbing the face.
      const pressure = air[0] * nx + air[2] * nz;
      const lift = (roof ? 1.28 : (large ? 1.05 : .82)) + clamp(air[1] * .43, -.19, .37);
      const altitude = y + .23 + ny * .085 + lift * seconds;
      const hold = altitude < wallTop ? Math.min(0, pressure) : 0;
      const dx = clamp(air[0] - nx * hold, -1.25, 1.25);
      const dz = clamp(air[2] - nz * hold, -1.25, 1.25);
      const eddy = TAU * phase + puff * 2.7 + age - seconds + 3.2 * life;
      const spread = .063 + .065 * life;
      const offset = .105 + .066 * life;
      splat(x + nx * offset + dx * seconds + Math.cos(eddy) * spread,
        altitude,
        z + nz * offset + dz * seconds + Math.sin(eddy) * spread,
        (.086 + .174 * life) * plumeScale, (.122 + .174 * life) * plumeScale, (.080 + .163 * life) * plumeScale,
        dx * .42, dz * .42, eddy, roof ? roofSoot : soot, strength * (roof ? .65 : .49) * fade, true);
    }
  }

  function update({time, cells, camera, sampleWind}) {
    if (disposed) return;
    activeCells = 0;
    splats.length = 0;
    for (const cell of cells) {
      if (activeCells === maxCells) break;
      const age = time - cell.ignitionTime;
      if (!Number.isFinite(age) || age < 0) continue;
      const heat = clamp(cell.flame, 0, 1);
      const sootStrength = clamp(cell.smoke, 0, 1);
      if (!(heat > 0 || sootStrength > 0)) continue;
      const phase = cellPhase(cell.id);
      if (heat > 0) flames(cell, age, phase, heat, sampleWind);
      if (sootStrength > 0) smoke(cell, age, phase, sootStrength, sampleWind);
      activeCells += 1;
    }
    batch.update({time, camera, extraSplats: splats});
  }

  function stats() {
    const {flameSplats, smokeSplats} = batch.stats();
    return {activeCells, flameSplats, smokeSplats, maxSplats};
  }

  function dispose() {
    if (disposed) return;
    disposed = true;
    activeCells = 0;
    splats.length = 0;
    batch.dispose();
  }

  return {root, update, stats, dispose};
}
