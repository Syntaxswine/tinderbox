import {corniceRun} from './trim.js';

const TAU = Math.PI * 2;
const wood = 'walnut', black = 'ebony';

function turning(b, x, z, height, width, paint = wood, base = 0) {
  b.turn([x, base, z], [
    [0, 0], [0, .56 * width], [.09 * height, .63 * width], [.15 * height, .42 * width],
    [.54 * height, .57 * width], [.69 * height, .94 * width], [.75 * height, .70 * width],
    [.83 * height, width], [height, width], [height, 0]
  ], paint, {small: width < .04});
}

function fan(b, x, y, z, radius, paint = black) {
  for (let i = 0; i < 7; i++) {
    const a = .24 + i * (Math.PI - .48) / 6;
    b.mark([x, y], [x + radius * Math.cos(a), y + radius * Math.sin(a)], z, .0035, paint);
  }
  b.mark([x - radius, y - .006], [x + radius, y - .006], z, .003, paint);
}

function inlay(b, x, y, z, w, h, paint = black) {
  const a = [x - w / 2, y - h / 2], c = [x + w / 2, y + h / 2];
  b.mark(a, [c[0], a[1]], z, .003, paint);
  b.mark([c[0], a[1]], c, z, .003, paint);
  b.mark(c, [a[0], c[1]], z, .003, paint);
  b.mark([a[0], c[1]], a, z, .003, paint);
}

function crest(b, x, y, z, width, paint = wood) {
  const w = width / 2;
  b.plate([x, y, z], [
    [-w, -.044], [w, -.044], [w, .027], [w - .042, .027], [w - .068, .065],
    [-w + .068, .065], [-w + .042, .027], [-w, .027]
  ], .042, paint);
  fan(b, x, y - .022, z + .022, .053, paint === black ? 'brass' : black);
  for (const sign of [-1, 1]) {
    const x0 = x + sign * (w - .067);
    b.mark([x0 - .023, y - .012], [x0 + .023, y - .012], z + .022, .004, paint === black ? 'brass' : black);
  }
}

function parlorSeat(b, {width, depth, arms = false, runner = false, paint, fabric, backs = 1}) {
  const seatY = runner ? .457 : .435, rear = -.224, half = width / 2;
  const posts = backs === 1 ? [-half + .035, half - .035] : [-half + .04, 0, half - .04];
  for (const x of [posts[0], posts.at(-1)]) {
    const foot = runner ? .048 : 0;
    turning(b, x, depth / 2 - .056, seatY - .038 - foot, .031, paint, foot);
    b.box([x, (seatY + foot) / 2, rear + .025], [.043, seatY - foot, .045], paint);
    b.box([x, .746, rear + .025], [.048, .63, .051], paint);
    b.turn([x, 1.047, rear + .025], [[0, .017], [.018, .027], [.042, .022], [.053, 0]], paint, {small: true});
    b.box([x, .352, .015], [.045, .063, depth - .066], paint);
    if (arms) {
      turning(b, x, .14, .19, .025, paint, .435);
      b.soft([x, .638, -.007], [.075, .049, .424], paint, .013, {grain: true});
      b.box([x, .652, .11], [.046, .014, .148], fabric, {shade: .9});
    }
    if (runner) {
      const rail = [[x, .098, -.408], [x, .051, -.29], [x, .028, -.095],
        [x, .028, .115], [x, .059, .283], [x, .096, .383]];
      b.sweep(rail, .028, paint);
    }
  }
  if (backs > 1) {
    turning(b, 0, depth / 2 - .056, .40, .029, paint);
    b.box([0, .724, rear + .025], [.043, .596, .047], paint);
  }
  const railZ = depth / 2 - .052;
  b.soft([0, seatY - .068, railZ], [width - .03, .084, .047], paint, .009, {grain: true});
  b.box([0, seatY - .058, rear + .025], [width - .05, .078, .046], paint);
  b.soft([0, seatY, .012], [width - .06, .10, depth - .068], fabric, .021);
  b.mark([-half + .052, seatY - .012], [half - .052, seatY - .012], .012 + (depth - .068) / 2 + .001, .005, 'brass', .71);
  for (let i = 0; i < backs; i++) {
    const x = (posts[i] + posts[i + 1]) / 2, w = posts[i + 1] - posts[i] - .045;
    b.soft([x, .832, rear + .021], [w, .235, .070], paint, .011);
    b.soft([x, .833, rear + .056], [w - .054, .175, .031], fabric, .012);
    crest(b, x, .999, rear + .027, w, paint);
    for (const dx of [-1, 0, 1]) turning(b, x + dx * w * .23, rear + .032, .247, .015, paint, .462);
    fan(b, x, seatY - .084, railZ + .026, .035, paint === black ? 'brass' : black);
  }
}

function legTable(b) {
  for (const x of [-.804, .804]) for (const z of [-.321, .321]) turning(b, x, z, .694, .051);
  b.soft([0, .737, 0], [1.83, .066, .82], wood, .013, {grain: true});
  for (const z of [-.346, .346]) {
    b.box([0, .642, z], [1.64, .101, .041], wood, {grain: true});
    inlay(b, 0, .642, z + .022, 1.48, .058);
    if (z > 0) fan(b, 0, .612, z + .023, .046);
  }
  for (const x of [-.813, .813]) b.box([x, .641, 0], [.04, .105, .668], wood);
}

export function pedestal(b, y = .747) {
  b.turn([0, 0, 0], [[0, 0], [0, .269], [.036, .284], [.068, .246], [.086, .14],
    [.12, .096], [.15, .082], [.22, .103], [.29, .073], [.52, .055], [.62, .089],
    [y - .083, .08], [y - .047, .128], [y - .047, 0]], wood);
  for (let i = 0; i < 3; i++) {
    const a = i * TAU / 3;
    b.sweep([[0, .23, 0], [.12 * Math.sin(a), .12, .12 * Math.cos(a)],
      [.248 * Math.sin(a), .078, .248 * Math.cos(a)], [.286 * Math.sin(a), .05, .286 * Math.cos(a)]], .033, black);
  }
  b.turn([0, y - .055, 0], [[0, 0], [0, .306], [.014, .327], [.033, .328], [.055, .304], [.055, 0]], wood);
  b.turn([0, y - .045, 0], [[0, .327], [.008, .328], [.012, .328]], 'brass', {shade: .62});
}

function drawer(b, x, y, z, w, h) {
  b.face([x, y, z], [w, h], 'panel-walnut');
  b.box([x, y, z + .005], [.065, .028, .009], 'brass', {shade: .71});
  b.ring([x, y - .005, z + .019], .018, .004, 'brass');
}

function cabinet(b, washstand) {
  const h = washstand ? .695 : .874;
  for (const x of [-.356, .356]) for (const z of [-.216, .216]) turning(b, x, z, .185, .037);
  b.box([0, (h + .13) / 2, 0], [.82, h - .13, .516], wood);
  b.soft([0, h + .027, 0], [.881, .054, .565], washstand ? 'marble' : wood, .009);
  b.box([0, .152, .015], [.864, .056, .535], black);
  const z = .259;
  if (washstand) {
    for (const x of [-.19, .19]) {
      drawer(b, x, .565, z, .354, .144);
      b.face([x, .339, z], [.352, .262], 'panel-walnut');
      fan(b, x, .29, z + .001, .064);
      b.ring([x - Math.sign(x) * .09, .414, z + .034], .015, .004, 'brass');
    }
    b.soft([0, .809, -.238], [.861, .141, .058], 'marble', .007);
    b.turn([-.12, .752, .035], [[0, 0], [0, .083], [.02, .098], [.058, .145],
      [.072, .145], [.076, .133], [.054, .119], [.015, .057], [.015, 0]], 'ceramic');
    b.turn([.218, .751, -.035], [[0, 0], [0, .052], [.025, .077], [.102, .073],
      [.135, .047], [.172, .049], [.181, .056], [.189, .055], [.188, .04], [.144, .035]], 'ceramic');
    b.sweep([[.269, .908, -.035], [.32, .91, -.035], [.332, .87, -.035], [.282, .831, -.035]], .012, 'ceramic');
  } else {
    corniceRun(b, [[-.408, -.253], [-.408, .259], [.408, .259], [.408, -.253]],
      {top: h, rise: .043, depth: .019, paint: 'dentil-walnut'});
    for (const y of [.269, .477, .684]) {
      drawer(b, -.176, y, z, .33, .183);
      drawer(b, .176, y, z, .33, .183);
    }
    for (const x of [-.29, .29]) {
      b.box([x, 1.20, -.196], [.058, .605, .072], wood);
      b.turn([x, 1.49, -.196], [[0, .025], [.024, .025], [.043, .017], [.052, 0]], black, {small: true});
    }
    const outline = [[-.228, -.258], [.228, -.258], [.228, .191], [.166, .258], [-.166, .258], [-.228, .191]];
    b.plate([0, 1.213, -.164], outline, .053, wood);
    b.plate([0, 1.214, -.133], outline.map(([x, y]) => [x * .88, y * .90]), .012, 'mirror');
    crest(b, 0, 1.492, -.169, .506);
  }
}

function bed(b) {
  for (const x of [-.688, .688]) for (const z of [-.897, .897]) {
    const top = z < 0 ? 1.275 : .78;
    b.box([x, top / 2, z], [.074, top, .074], wood);
    turning(b, x, z, .116, .041, black, top);
    if (z < 0) b.box([x, .322, 0], [.075, .136, 1.802], wood);
  }
  for (const [z, h] of [[-.894, 1.17], [.893, .676]]) {
    b.soft([0, (h + .29) / 2, z], [1.37, h - .29, .071], wood, .012);
    b.soft([0, h + .014, z], [1.424, .075, .102], wood, .013, {grain: true});
    for (const x of [-.425, 0, .425]) {
      inlay(b, x, h - .158, z + .037, .36, .197);
      fan(b, x, h - .223, z + .038, .102);
    }
  }
  b.soft([0, .492, 0], [1.29, .267, 1.717], 'ticking', .045);
  b.soft([0, .595, .225], [1.327, .122, 1.261], 'wine', .038);
  b.box([0, .546, .755], [1.337, .125, .078], 'wine');
  b.soft([0, .662, -.385], [1.288, .051, .139], 'olive', .018, {grain: true});
  for (const x of [-.334, .334]) b.soft([x, .66, -.635], [.56, .102, .309], 'ceramic', .043);
}

export const FURNITURE = {
  'side-chair': b => parlorSeat(b, {width: .49, depth: .487, paint: black, fabric: 'wine'}),
  armchair: b => parlorSeat(b, {width: .652, depth: .564, paint: wood, fabric: 'olive', arms: true}),
  rocker: b => parlorSeat(b, {width: .608, depth: .558, paint: wood, fabric: 'blue', arms: true, runner: true}),
  settee: b => parlorSeat(b, {width: 1.746, depth: .697, paint: black, fabric: 'wine', arms: true, backs: 2}),
  'dining-table': legTable,
  'pedestal-table': b => pedestal(b),
  washstand: b => cabinet(b, true),
  dresser: b => cabinet(b, false),
  bedstead: bed
};
