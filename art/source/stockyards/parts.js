import {LETTERS} from './letters.js';
export function lettering(T, b, parent, text, width, height, x, y, z, slot = 'signInk') {
  const advance = [...text].reduce((n, c) => n + LETTERS[c].advance + .045, -.045);
  const sx = width / advance, sy = height / .76; let cursor = -width / 2;
  for (const [i, c] of [...text].entries()) {
    const letter = LETTERS[c], path = new T.ShapePath();
    for (const contour of letter.contours) {
      contour.forEach(([px, py], j) => j ? path.lineTo(x - cursor - px * sx, y + py * sy) : path.moveTo(x - cursor - px * sx, y + py * sy));
      path.currentPath.closePath();
    }
    for (const shape of path.toShapes(false)) {
      const g = new T.ExtrudeGeometry(shape, {depth: .012, bevelEnabled: false, steps: 1, curveSegments: 8});
      b.add(parent, 'letter/' + i, g, slot, [0, 0, z]);
    }
    cursor += (letter.advance + .045) * sx;
  }
}
export function recipes(T, b) {
  const box = b.box, beam = b.beam;
  function post(g, height = 1.55) {
    box(g, 'shaft', [.18, height - .06, .18], [0, (height - .06) / 2, 0]);
    b.profile(g, 'shed cap', [[-.09, 0], [.09, 0], [.07, .06], [-.09, .025]], .18, [0, height - .06, 0], 'endgrain');
    for (const z of [-.095, .095]) box(g, 'grain split', [.011, .24, .004], [-.031, height - .19, z], 'roofwood');
  }
  function fence(g, length = 1) {
    for (let i = 0; i < 6; i++) {
      const y = .19 + i * .232; box(g, 'rail/' + i, [length, .186, .055], [length / 2, y, 0]);
      for (const x of [.055, length - .055]) box(g, 'cut nail/' + i + '/' + x, [.013, .013, .008], [x, y + .036, -.032], 'iron');
    }
    beam(g, 'back diagonal', [.09, .19, .055], [length - .09, 1.39, .055], .062, .034);
  }
  const roofY = z => 3.06 - .14 * z;
  function roof(g, start = 0, width = 1) {
    const deck = b.group('continuous roof deck', g, [start, 0, 0], -Math.PI / 2);
    b.profile(deck, 'roof deck', [[-.25, roofY(-.25)-.04], [4.265, roofY(4.265)-.04], [4.265, roofY(4.265)-.065], [-.25, roofY(-.25)-.065]],
      width, [0, 0, -width / 2], 'roofwood');
    beam(g, 'rafter', [start + width / 2, roofY(-.25) - .13, -.25], [start + width / 2, roofY(4.25) - .13, 4.25], .11, .16);
    for (let row = 0; row < 10; row++) for (let col = 0; col < Math.ceil(width / .25); col++) {
      const x0 = start + col * .25, x1 = Math.min(start + width, x0 + .25) - .005, z0 = -.25 + row * .45, z1 = z0 + .465;
      const poly = [[z0, roofY(z0)], [z1, roofY(z1)], [z1, roofY(z1) - .04], [z0, roofY(z0) - .04]];
      const p = b.group('roof board', g, [x0, 0, 0], -Math.PI / 2);
      b.profile(p, 'board/' + row + '/' + col, poly, x1 - x0, [0, 0, -(x1 - x0) / 2], 'roofwood');
    }
    for (const z of [-.27, 4.27]) box(g, 'fascia/' + z, [width, .16, .065], [start + width / 2, roofY(z) - .07, z], 'endgrain');
  }
  function trough(g) {
    for (const x of [-.46, .46]) box(g, 'foot/' + x, [.11, .15, .50], [x, .075, 0], 'roofwood');
    box(g, 'bottom', [1, .065, .34], [0, .19, 0]);
    for (const z of [-.20, .20]) box(g, 'side/' + z, [1, .27, .065], [0, .31, z]);
    for (const x of [-.485, .485]) box(g, 'end/' + x, [.065, .27, .34], [x, .31, 0]);
    box(g, 'water surface', [.89, .012, .32], [0, .36, 0], 'water');
    for (const x of [-.32, .32]) for (const z of [-.238, .238]) box(g, 'strap/' + x + z, [.028, .28, .009], [x, .31, z], 'iron');
  }
  function fan(g, width = 1.7, drop = .62) {
    const steps = 48, bands = 11, slots = ['clothBlue', 'clothBlue', 'clothCream', 'clothRed', 'clothCream', 'clothCream', 'clothRed', 'clothCream', 'clothCream', 'clothRed', 'clothCream'];
    for (let band = 0; band < bands; band++) for (let i = 0; i < steps; i++) {
      const vertex = (s, r) => { const a = Math.PI * s / steps; return [Math.cos(a) * r * width / 2, -Math.sin(a) * r * drop, -.022 * Math.sin(a * 24) * r]; };
      b.surface(g, 'pleat/' + band + '/' + i, [vertex(i, band / bands), vertex(i + 1, band / bands), vertex(i + 1, (band + 1) / bands), vertex(i, (band + 1) / bands)], slots[band], [0, 1, 2, 0, 2, 3]);
    }
    for (const x of [-width / 2, width / 2]) b.sphere(g, 'cloth knot', [.055, .055, .035], [x, 0, 0], 'clothRed');
  }
  function ribbon(g) {
    for (const side of [-1, 1]) {
      const pts = [];
      for (let i = 0; i <= 24; i++) {
        const a = Math.PI * 2 * i / 24, c = Math.cos(a), s = Math.sin(a);
        pts.push([[side * (.12 + .17 * c), .11 * s, .034 * s], [side * (.12 + .11 * c), .066 * s, .034 * s]]);
      }
      for (let i = 0; i < 24; i++) b.surface(g, 'loop/' + side + '/' + i, [pts[i][0], pts[i + 1][0], pts[i + 1][1], pts[i][1]], 'clothRed', [0, 1, 2, 0, 2, 3]);
      b.surface(g, 'swallowtail/' + side, [[side * .025, -.025, 0], [side * .12, -.43, -.03], [side * .03, -.37, -.035], [side * -.02, -.47, -.03], [side * -.05, -.025, 0]], 'clothCream');
    }
    b.sphere(g, 'knot', [.065, .052, .052], [0, 0, -.005], 'clothRed');
  }
  function masonry(g, w, h, depth = 1.4) {
    box(g, 'mortar core', [w, h, depth - .08], [0, h / 2, 0], 'mortar');
    const rows = Math.ceil(h / .34), rise = h / rows;
    for (let row = 0; row < rows; row++) {
      const cuts = [-w / 2, w / 2]; for (let x = -w / 2 + (row % 2 ? .43 : .73); x < w / 2 - .04; x += .73) cuts.push(x);
      cuts.sort((a, b) => a - b);
      for (let i = 1; i < cuts.length; i++) box(g, 'ashlar/' + row + '/' + i, [cuts[i] - cuts[i - 1] - .012, rise - .018, depth], [(cuts[i] + cuts[i - 1]) / 2, (row + .5) * rise, 0], 'stone');
    }
    box(g, 'plinth', [w + .08, .18, depth + .10], [0, .09, 0], 'stoneTrim');
    box(g, 'cap', [w + .12, .15, depth + .15], [0, h - .075, 0], 'stoneTrim');
  }
  function arch(g, width, spring, rise, top) {
    const rx = width / 2, n = 30, curve = x => spring + rise * Math.sqrt(Math.max(0, 1 - (x / rx) ** 2));
    const p = Array.from({length: n + 1}, (_, i) => { const a = Math.PI - i * Math.PI / n; return [rx * Math.cos(a), spring + rise * Math.sin(a)]; });
    p.push([rx, top], [-rx, top]); b.profile(g, 'arch spandrel core', p, 1.36, [0, 0, 0], 'mortar');
    for (const z of [-.715, .715]) {
      for (let row = 0; row < Math.ceil((top - spring) / .33); row++) {
        const y0 = spring + row * .33 + .009, y1 = Math.min(top - .009, y0 + .312);
        for (let col = 0; col < Math.ceil(width / .68); col++) {
          const x0 = -rx + col * .68 + .007, x1 = Math.min(rx - .007, x0 + .662); if (x1 <= x0) continue;
          const lower = Array.from({length: 7}, (_, k) => { const x = x0 + (x1 - x0) * k / 6; return [x, Math.max(y0, curve(x) + .34)]; });
          if (lower.some(a => a[1] >= y1)) continue;
          b.profile(g, 'spandrel face/' + row + '/' + col, [...lower, [x1, y1], [x0, y1]], .09, [0, 0, z], 'stone');
        }
      }
      for (let i = 0; i < 28; i++) {
        const a = i * Math.PI / 28 + .004, c = (i + 1) * Math.PI / 28 - .004;
        const pt = (angle, outer) => [(rx + (outer ? .31 : 0)) * Math.cos(angle), spring + (rise + (outer ? .31 : 0)) * Math.sin(angle)];
        b.profile(g, 'voussoir/' + i, [pt(a, false), pt(c, false), pt(c, true), pt(a, true)], .14, [0, 0, z], 'stoneTrim');
      }
    }
  }
  function turret(g) {
    b.sphere(g, 'corbel bowl', [.46, .37, .40], [0, 3.85, 0], 'stoneTrim');
    for (let i = 0; i < 11; i++) b.cylinder(g, 'drum/' + i, .33, .34, .31, [0, 4.15 + i * .26, 0], 'stone', 12);
    for (const y of [4.04, 4.22, 6.91, 7.02]) b.cylinder(g, 'collar/' + y, .39, .40, .10, [0, y, 0], 'stoneTrim', 12);
    for (let i = 0; i < 4; i++) b.cylinder(g, 'pinnacle/' + i, .05 + (3 - i) * .065, .12 + (3 - i) * .065, .23, [0, 7.15 + i * .20, 0], 'stoneTrim', 12);
    b.sphere(g, 'finial', [.065, .09, .065], [0, 7.95, 0], 'stoneTrim');
  }
  function mansard(g, w, base, top) {
    const low = [[-w / 2, base, -.15], [w / 2, base, -.15], [w / 2, base, 2.3], [-w / 2, base, 2.3]],
      high = [[-w * .35, top, .72], [w * .35, top, .72], [w * .35, top, 1.43], [-w * .35, top, 1.43]];
    for (let i = 0; i < 4; i++) b.surface(g, 'roof face/' + i, [low[i], low[(i + 1) % 4], high[(i + 1) % 4], high[i]], 'gateRoof', [0, 1, 2, 0, 2, 3]);
    b.surface(g, 'crown', high, 'gateRoof', [0, 1, 2, 0, 2, 3]);
    for (let i = 0; i <= Math.floor(w / .55); i++) {
      const x = -w / 2 + i * .55; beam(g, 'front seam/' + i, [x, base, -.17], [x * .7, top, .70], .025, .025, 'iron');
    }
    box(g, 'eave', [w + .16, .12, 2.6], [0, base - .05, 1.075], 'stoneTrim');
    box(g, 'ridge cap', [w * .7 + .1, .10, .80], [0, top + .02, 1.075], 'gateRoof');
  }
  function bull(g) {
    b.sphere(g, 'carved field', [.45, .50, .10], [0, 0, .07], 'stoneTrim');
    b.sphere(g, 'forehead', [.25, .32, .15], [0, .06, -.08], 'stone');
    b.sphere(g, 'muzzle', [.24, .14, .14], [0, -.22, -.20], 'stoneTrim');
    for (const s of [-1, 1]) {
      b.sphere(g, 'ear/' + s, [.19, .075, .07], [s * .30, .03, -.08], 'stone');
      const points = [[s * .20, .17, -.05], [s * .36, .20, -.10], [s * .43, .36, -.08], [s * .41, .47, -.04]];
      for (let i = 1; i < points.length; i++) beam(g, 'horn/' + s + '/' + i, points[i - 1], points[i], .075 - i * .014, .06 - i * .01, 'stoneTrim');
      b.sphere(g, 'eye/' + s, [.024, .018, .012], [s * .12, .07, -.223], 'mortar');
      b.sphere(g, 'nostril/' + s, [.03, .018, .012], [s * .10, -.22, -.325], 'mortar');
    }
  }
  function flags(g) {
    for (let i = 0; i < 9; i++) {
      const x0 = -.46 + i * .102;
      box(g, 'stripe/' + i, [.105, 1.38, .012], [x0 + .052, -.69, -.025 + .025 * Math.sin(i * 2.2)], i % 2 ? 'clothCream' : 'clothRed');
    }
    box(g, 'canton', [.49, .63, .012], [-.215, -.315, -.060], 'clothBlue');
    for (let row = 0; row < 6; row++) for (let col = 0; col < 7; col++)
      b.sphere(g, 'star/' + row + '/' + col, [.012, .012, .004], [-.415 + col * .067, -.06 - row * .101, -.071], 'clothCream');
  }
  return {
    'timber-post': g => post(g), 'roof-post-front': g => post(g, 3.04), 'roof-post-back': g => post(g, 2.48),
    'gate-jamb': g => { post(g); for (const y of [.35, 1.24]) box(g, 'hinge pad/' + y, [.20, .075, .09], [0, y, -.10], 'iron'); },
    'fence-straight-1m': g => fence(g),
    'fence-closure-0p72m': g => { for (let i = 0; i < 6; i++) box(g, 'short closure/' + i, [.72, .186, .055], [.36, .19 + i * .232, 0]); },
    'roof-header-4m': g => {
      for (const [z, y] of [[0, 2.80], [4, 2.24]]) box(g, 'header/' + z, [4, .18, .16], [2, y, z]);
      for (const [x, direction] of [[0, 1], [4, -1]]) {
        beam(g, 'front knee brace/' + x, [x, 2.14, 0], [x + direction * .65, 2.77, 0], .10, .10);
        beam(g, 'back knee brace/' + x, [x, 1.68, 4], [x + direction * .55, 2.20, 4], .09, .09);
      }
    },
    'swine-sign': g => { box(g, 'wood sign', [1.03, .32, .045], [0, 0, 0], 'clothBlue'); lettering(T, b, g, 'SWINE', .86, .19, 0, -.095, -.031, 'clothCream'); },
    'fence-end': g => { post(g); fence(g); },
    'fence-corner': g => { post(g); fence(g); const a = b.group('return', g, [0, 0, 0], -Math.PI / 2); fence(a); },
    'service-gate-2m': g => {
      const leaf = 2.03; for (let i = 0; i < 6; i++) box(g, 'gate rail/' + i, [leaf - .04, .186, .055], [(leaf + .04) / 2, .19 + i * .232, 0]);
      for (const x of [.13, leaf - .08]) box(g, 'stile/' + x, [.09, 1.42, .08], [x, .76, -.055]);
      beam(g, 'diagonal gate brace', [.14, .15, -.095], [leaf - .09, 1.40, -.095], .085, .055);
      for (const y of [.35, 1.24]) {
        box(g, 'strap hinge/' + y, [.55, .052, .024], [.28, y, -.045], 'iron');
        b.cylinder(g, 'pintle/' + y, .027, .027, .12, [0, y, 0], 'iron', 8);
      }
      box(g, 'latch', [.22, .035, .055], [leaf - .07, 1.15, -.05], 'iron');
    },
    'roof-shed-span-1m': g => roof(g), 'roof-end-left': g => roof(g, -.20, .20), 'roof-end-right': g => roof(g, 0, .20),
    'trough-1m': trough,
    'earth-cell-1m': g => {
      box(g, 'earth base', [1, .12, 1], [.5, -.06, .5], 'earth');
      for (let i = 0; i < 14; i++) {
        const x = .08 + b.hash(g.name + i) * .84, z = .08 + b.hash(g.name + 'z' + i) * .84;
        box(g, 'surface wear/' + i, [.035 + .12 * b.hash(g.name + 'w' + i), .006, .035], [x, .003, z], i % 3 ? 'earth' : 'paving', i * .83);
      }
    },
    'approach-cell-1m': g => {
      box(g, 'bedding', [1, .12, 1], [.5, -.06, .5], 'earth');
      for (let row = 0; row < 5; row++) for (let col = 0; col < 4; col++) box(g, 'worn setts/' + row + '/' + col, [.24, .04, .185], [.125 + col * .25, -.014, .1 + row * .2], 'paving');
    },
    'jubilee-fan': g => fan(g), 'ribbon-bow': ribbon,
    'gate-main-pier': g => masonry(g, 1.5, 6.20), 'gate-outer-pier': g => masonry(g, 1.25, 3.60),
    'gate-central-arch': g => arch(g, 5, 3.80, 1.38, 6.20), 'gate-pedestrian-arch': g => arch(g, 2.5, 2.18, .77, 3.60), 'gate-south-arch': g => arch(g, 2, 2.18, .77, 3.60),
    'gate-turret': turret,
    'gate-pediment': g => {
      b.profile(g, 'gable field', [[-3.12, 5.50], [0, 8.02], [3.12, 5.50]], .32, [0, 0, -.80], 'stone');
      for (const s of [-1, 1]) {
        beam(g, 'gable moulding/' + s, [s * 3.18, 5.52, -1.03], [0, 8.09, -1.03], .14, .14, 'stoneTrim');
        beam(g, 'inner moulding/' + s, [s * 2.96, 5.51, -1.06], [0, 7.85, -1.06], .052, .055, 'mortar');
        b.sphere(g, 'gable rosette/' + s, [.14, .14, .06], [s * 2.55, 5.82, -1.09], 'stoneTrim');
      }
      box(g, 'gable base', [6.22, .13, .18], [0, 5.51, -1.01], 'stoneTrim');
      b.cylinder(g, 'apex bud', .08, .14, .22, [0, 8.16, -.91], 'stoneTrim', 8);
    },
    'gate-bull-relief': bull,
    'gate-mansard-centre': g => mansard(g, 8, 6.23, 9.70), 'gate-mansard-wing': g => mansard(g, 3.75, 3.63, 4.98), 'gate-mansard-south': g => mansard(g, 3.25, 3.63, 4.98),
    'postcard-framework': g => {
      for (const s of [-1, 1]) beam(g, 'frame upright/' + s, [s * 2.8, 6.7, -.30], [s * 3.0, 10.70, -.30], .075, .075, 'frame');
      beam(g, 'top crossbar', [-3.1, 10.70, -.30], [3.1, 10.70, -.30], .09, .09, 'frame');
      for (const s of [-1, 1]) beam(g, 'frame stay/' + s, [s * 3.5, 6.35, .1], [s * 2.8, 10.55, -.3], .042, .042, 'frame');
    },
    'postcard-welcome': g => {
      box(g, 'cream welcome board', [3.65, .63, .10], [0, 0, 0], 'sign');
      for (const y of [-.32, .32]) box(g, 'gilt rule/' + y, [3.80, .038, .13], [0, y, -.025], 'gilt');
      for (const x of [-1.86, 1.86]) box(g, 'gilt edge/' + x, [.035, .65, .13], [x, 0, -.025], 'gilt');
      lettering(T, b, g, 'WELCOME', 3.15, .39, 0, -.19, -.072);
      for (const x of [-1.60, 1.60]) beam(g, 'suspension/' + x, [x, .33, 0], [x, 1.0, 0], .025, .025, 'frame');
    },
    'postcard-flags': flags,
    'postcard-crown-cloth': g => {
      const f = b.group('large fan', g, [0, -.72, -.1]); fan(f, 5.15, 1.72);
      for (let j = 0; j < 3; j++) for (let i = 0; i < 24; i++) {
        const point = (u, v) => [-3 + j * 2 + u * 2, -.10 * Math.sin(Math.PI * u) - v * (.22 + .50 * Math.sin(Math.PI * u)), -.05 - .055 * Math.sin(Math.PI * u * 8)];
        b.surface(g, 'valance/' + j + '/' + i, [point(i / 24, 0), point((i + 1) / 24, 0), point((i + 1) / 24, 1), point(i / 24, 1)], 'clothRed', [0, 1, 2, 0, 2, 3]);
        b.surface(g, 'cream swag/' + j + '/' + i, [point(i / 24, .10), point((i + 1) / 24, .10), point((i + 1) / 24, .32), point(i / 24, .32)], 'clothCream', [0, 1, 2, 0, 2, 3]);
      }
      for (const x of [-3, -1, 1, 3]) { const r = b.group('crown bow', g, [x, 0, -.13]); ribbon(r); }
    },
    'postcard-eagle': g => {
      b.sphere(g, 'eagle body', [.18, .27, .09], [0, 0, 0], 'gilt'); b.sphere(g, 'eagle head', [.095, .095, .07], [.04, .26, 0], 'gilt');
      for (const s of [-1, 1]) {
        b.profile(g, 'wing/' + s, [[s * .06, .12], [s * 1.0, .40], [s * .84, .16], [s * .65, .02], [s * .42, -.03], [s * .1, -.13]], .045, [0, 0, 0], 'gilt');
        for (let i = 0; i < 5; i++) beam(g, 'feather/' + s + i, [s * (.22 + i * .13), .10 + i * .035, -.035], [s * (.35 + i * .13), .20 + i * .03, -.035], .035, .018, 'frame');
      }
    }
  };
}
