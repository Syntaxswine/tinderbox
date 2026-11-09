import {pedestal} from './furniture.js';

function flame(b, x, y, z, lit) {
  if (!lit) return;
  b.turn([x, y, z], [[-.009, 0], [-.006, .009], [.008, .015], [.028, .01], [.047, 0]],
    'flame', {small: true, rotation: [0, 0, -.12]});
}

function oilLamp(b, y, z, lit, reservoir = 'bottle') {
  b.turn([0, y, z], [[0, 0], [0, .082], [.012, .103], [.032, .097], [.045, .064],
    [.062, .047], [.071, .043]], 'brass');
  b.turn([0, y, z], [[.065, .039], [.085, .084], [.115, .109], [.152, .103], [.175, .073],
    [.196, .052], [.202, .051], [.202, 0]], reservoir);
  b.turn([0, y, z], [[.193, .050], [.211, .068], [.222, .066], [.234, .052], [.244, .046], [.244, 0]], 'brass');
  for (let i = 0; i < 8; i++) {
    const a = i * Math.PI / 4;
    b.rod([Math.sin(a) * .054, y + .224, z + Math.cos(a) * .054],
      [Math.sin(a) * .059, y + .245, z + Math.cos(a) * .059], .004, 'iron');
  }
  b.rod([.046, y + .215, z], [.091, y + .215, z], .006, 'brass');
  b.turn([.086, y + .215, z], [[0, 0], [0, .017], [.012, .018], [.012, 0]],
    'brass', {small: true, rotation: [0, 0, -Math.PI / 2]});
  b.box([0, y + .249, z], [.023, .019, .007], 'iron');
  b.turn([0, y, z], [[.235, .053], [.262, .061], [.307, .071], [.354, .063],
    [.387, .048], [.418, .041], [.516, .041], [.526, .046]], lit ? 'amber' : 'glass');
  b.ring([0, y + .525, z], .044, .003, 'glass', {rotation: [Math.PI / 2, 0, 0]});
  flame(b, 0, y + .262, z, lit);
}

function tableLamp(b, lit) {
  pedestal(b, .747);
  oilLamp(b, .747, 0, lit);
}
function sconce(b, lit) {
  const z = -.299;
  b.soft([0, 1.355, -.472], [.118, .273, .050], 'iron', .009);
  for (const y of [1.25, 1.454]) b.ring([0, y, -.443], .013, .005, 'brass');
  b.sweep([[0, 1.257, -.446], [0, 1.212, -.412], [0, 1.196, -.355], [0, 1.209, z]], .019, 'iron');
  b.turn([0, 1.478, -.444], [[0, 0], [0, .085], [.012, .125], [.031, .146], [.041, .143],
    [.041, .136], [.025, .120], [.013, .084], [.01, 0]], 'brass', {rotation: [Math.PI / 2, 0, 0]});
  oilLamp(b, 1.208, z, lit, 'brass');
}
function pendant(b, lit) {
  b.turn([0, 0, 0], [[2.063, 0], [2.063, .083], [2.083, .122], [2.12, .133], [2.12, 0]], 'iron');
  for (let i = 0; i < 3; i++) {
    const a = i * 2 * Math.PI / 3;
    const x = Math.sin(a), z = Math.cos(a);
    b.rod([.047 * x, 2.073, .047 * z], [.252 * x, 1.59, .252 * z], .006, 'iron');
    for (let j = 0; j < 4; j++) {
      const t = j / 5;
      b.ring([(.052 + .196 * t) * x, 2.05 - .454 * t, (.052 + .196 * t) * z], .016, .003,
        'brass', {rotation: [0, a, -.36]});
    }
    b.rod([0, 1.518, 0], [.252 * x, 1.590, .252 * z], .009, 'brass');
  }
  oilLamp(b, 1.474, 0, lit, 'brass');
  b.turn([0, 0, 0], [[1.788, .267], [1.8, .271], [1.824, .245], [1.903, .102],
    [1.92, .068], [1.909, .066], [1.818, .237], [1.794, .264]], 'ceramic');
  b.ring([0, 1.795, 0], .268, .007, 'brass', {rotation: [Math.PI / 2, 0, 0]});
}

function cage(b, baseY, z, lit, large) {
  const foot = large ? .128 : .106;
  const top = large ? .107 : .086;
  const height = large ? .320 : .276;
  b.turn([0, baseY, z], [[0, 0], [0, foot], [.017, foot + .005], [.037, foot],
    [.054, foot * .83], [.087, foot * .83], [.094, foot * .56], [.094, 0]], large ? 'iron' : 'brass');
  b.turn([0, baseY, z], [[.091, .045], [.111, .041], [.126, .032], [.126, 0]], 'brass', {small: true});
  b.box([0, baseY + .13, z], [.022, .017, .008], 'iron');
  flame(b, 0, baseY + .138, z, lit);

  // Four sloped glazed sides, fitted to the iron corner bars.
  for (let i = 0; i < 4; i++) {
    const a = i * Math.PI / 2, sin = Math.sin(a), cos = Math.cos(a);
    const paint = lit ? 'amber' : 'glass';
    const lower = foot * .85, upper = top * .93, rise = height - .089;
    const half = Math.hypot(rise, lower - upper) / 2;
    const tilt = -Math.atan2(lower - upper, rise);
    const quaternion = new b.T.Quaternion().setFromEuler(new b.T.Euler(tilt, a, 0, 'YXZ'));
    b.plate([sin * (lower + upper) / 2, baseY + .089 + rise / 2, z + cos * (lower + upper) / 2],
      [[-lower, -half], [lower, -half], [upper, half], [-upper, half]], .004, paint, {quaternion});
    const dx = Math.sin(a + Math.PI / 4), dz = Math.cos(a + Math.PI / 4);
    b.rod([dx * lower * Math.SQRT2, baseY + .080, z + dz * lower * Math.SQRT2],
      [dx * upper * Math.SQRT2, baseY + height, z + dz * upper * Math.SQRT2], large ? .012 : .008, 'iron');
  }
  b.box([0, baseY + .082, z], [foot * 1.87, .016, foot * 1.87], 'iron');
  b.box([0, baseY + height, z], [top * 2.12, .028, top * 2.12], 'iron');
  b.turn([0, baseY + height, z], [[.011, top * 1.22], [.032, top * 1.18], [.07, top * .58],
    [.096, top * .45], [.105, top * .5], [.119, top * .45], [.12, 0]], 'iron');
  b.ring([0, baseY + height + .168, z], .055, .009, 'iron');
}
function handLantern(b, lit) { cage(b, 0, 0, lit, false); }
function entryLantern(b, lit) {
  const z = -.268;
  b.soft([0, 1.769, -.477], [.129, .342, .042], 'iron', .008);
  b.sweep([[0, 1.83, -.457], [0, 1.947, -.393], [0, 1.994, -.321], [0, 1.973, z],
    [0, 1.943, z]], .014, 'iron');
  b.sweep([[0, 1.643, -.459], [0, 1.601, -.424], [0, 1.542, -.406], [0, 1.465, -.368]], .011, 'iron');
  cage(b, 1.421, z, lit, true);
}

export const OIL_LIGHTS = {
  'table-lamp': tableLamp, 'reflector-sconce': sconce, 'shop-pendant': pendant,
  'hand-lantern': handLantern, 'entry-lantern': entryLantern
};
