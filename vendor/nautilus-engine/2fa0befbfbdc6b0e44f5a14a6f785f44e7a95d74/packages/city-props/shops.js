import {corniceRun} from './trim.js';

const wood = 'walnut', trim = 'ebony', green = 'sage';
const agedGreen = {shade: .56};

function salesBay(b, {caseBase = false} = {}) {
  const top = caseBase ? .742 : .947;
  b.box([0, (top - .034) / 2, 0], [.986, top - .034, .54], green, agedGreen);
  b.box([0, .051, .008], [.994, .102, .558], trim, {grain: true, shade: .82});
  b.soft([0, top - .022, .004], [.998, .049, .645], wood, .008, {grain: true});
  const panelHeight = top - .24;
  for (const x of [-.244, .244]) {
    b.face([x, .112 + panelHeight / 2, .271], [.453, panelHeight], 'panel-green');
    b.face([x, top - .171, -.271], [.414, .113], 'drawer-walnut', {rotation: [0, Math.PI, 0]});
  }
  corniceRun(b, [[-.499, .271], [.499, .271]],
    {top: top - .048, rise: .062, depth: .026, caps: false});
}

function cornerBay(b) {
  for (const [x, z, w, d] of [[-.113, 0, .773, .54], [0, -.384, .54, .228]]) {
    b.box([x, .456, z], [w, .912, d], green, agedGreen);
    b.box([x, .051, z], [w, .102, d], trim);
  }
  const outline = [[-.493, -.319], [-.319, -.319], [-.319, -.493], [.319, -.493],
    [.319, .326], [-.493, .326]];
  b.plate([0, .925, 0], outline, .049, wood, {rotation: [Math.PI / 2, 0, 0], grain: true, bevel: .006});
  for (const x of [-.288, .07]) b.face([x, .465, .271], [.35, .706], 'panel-green');
  for (const z of [-.293, .068]) b.face([.2745, .465, z], [.345, .706], 'panel-green', {rotation: [0, Math.PI / 2, 0]});
  corniceRun(b, [[-.499, .271], [.2745, .271], [.2745, -.499]],
    {top: .899, rise: .062, depth: .026, caps: false});
}

function displayCase(b) {
  salesBay(b, {caseBase: true});
  for (const x of [-.465, .465]) for (const z of [-.268, .274]) b.box([x, .919, z], [.031, .354, .031], trim);
  for (const y of [.769, 1.09]) {
    for (const z of [-.268, .274]) b.box([0, y, z], [.959, .034, .033], trim, {grain: true});
    for (const x of [-.465, .465]) b.box([x, y, .003], [.033, .034, .556], trim);
  }
  b.box([0, 1.088, .003], [.899, .009, .515], 'glass');
  for (const z of [-.273, .273]) b.box([0, .932, z], [.899, .287, .009], 'glass');
  for (const x of [-.464, .464]) b.box([x, .932, .003], [.009, .287, .515], 'glass');
  for (const [i, x] of [-.33, -.10, .14, .34].entries()) {
    b.soft([x, .789, .058], [.164, .044, .264], ['wine', 'ticking', 'blue', 'leather'][i], .008);
    b.box([x, .812, .062], [.035, .004, .271], 'paper');
  }
  b.box([.006, .934, -.282], [.021, .285, .025], 'brass', {shade: .68});
}

const shelves = [.248, .697, 1.154, 1.602];
function cabinetFrame(b, y = 1.91) {
  b.box([0, y / 2, -.466], [.974, y, .051], green, agedGreen);
  for (const x of [-.457, .457]) b.box([x, y / 2, -.218], [.059, y, .499], wood, {shade: .67});
  b.box([0, .072, -.219], [.993, .144, .547], trim);
  b.soft([0, y + .034, -.222], [.998, .058, .552], wood, .01, {grain: true, shade: .74});
  corniceRun(b, [[-.485, -.463], [-.485, .031], [.485, .031], [.485, -.463]],
    {top: y + .005, rise: .091, depth: .014, paint: 'dentil-walnut'});
}

function shelf(b, y, d = .45) {
  b.box([0, y - .018, -.451 + d / 2], [.886, .036, d], wood, {grain: true});
  b.box([0, y - .025, -.441 + d], [.894, .052, .032], trim, {grain: true});
}

function bottle(b, x, y, z, h, paint = 'bottle') {
  const r = h * .24;
  b.turn([x, y, z], [[0, 0], [0, r * .92], [h * .08, r], [h * .69, r],
    [h * .80, r * .48], [h * .92, r * .48], [h * .94, r * .58], [h, r * .58], [h, 0]], paint, {small: true});
  b.turn([x, y + h * .98, z], [[0, r * .42], [.025 * h, r * .47], [.09 * h, r * .44], [.09 * h, 0]], 'canvas', {small: true});
  const label = z + r + .001;
  b.box([x, y + .37 * h, label], [r * 1.33, h * .249, .0015], 'paper', {shade: .84});
  b.mark([x - r * .45, y + .40 * h], [x + r * .45, y + .40 * h], label + .001, .0026, trim, .74);
}
function parcel(b, x, y, z, w, h, paint) {
  b.soft([x, y + h / 2, z], [w, h, .204], paint, .011);
  b.box([x, y + h / 2, z + .103], [w * .21, h * .62, .002], 'paper', {shade: .74});
}

function shopShelving(b, stocked) {
  cabinetFrame(b);
  for (const y of shelves) shelf(b, y);
  if (!stocked) return;
  const paints = ['blue', 'canvas', 'leather', 'sage'];
  for (const [i, x] of [-.337, -.113, .113, .337].entries()) {
    parcel(b, x, .25, -.212, .179, .222 - i * .028, paints[i]);
    bottle(b, x, .70, -.157, .219 + (i % 2) * .083, i === 3 ? 'ceramic' : 'bottle');
    parcel(b, x, 1.155, -.224, .177, .147 + (i % 2) * .06, paints[(i + 1) % 4]);
  }
  b.turn([-.18, 1.605, -.247], [[0, 0], [0, .089], [.037, .10], [.16, .097], [.188, .079], [.192, 0]], 'ceramic');
  for (const x of [.061, .233, .352]) bottle(b, x, 1.605, -.216, .145, 'leather');
}

function apothecary(b) {
  cabinetFrame(b);
  b.box([0, .555, -.234], [.874, .846, .422], trim);
  for (const y of [.256, .447, .638, .829]) for (const x of [-.335, -.112, .112, .335]) {
    b.face([x, y, -.022], [.207, .174], 'drawer-walnut');
  }
  for (const y of [1.004, 1.443]) {
    shelf(b, y);
    for (const [i, x] of [-.349, -.21, -.07, .071, .213, .35].entries()) {
      bottle(b, x, y + .004, -.221, .146 + i % 3 * .038, i % 3 === 0 ? 'ceramic' : i % 2 === 0 ? 'bottle' : 'leather');
    }
  }
}

function dryBins(b) {
  for (const x of [-.457, .457]) for (const z of [-.365, .331]) b.box([x, .346, z], [.056, .692, .061], trim);
  b.box([0, .461, -.035], [.973, .071, .785], wood);
  for (const x of [-.47, -.16, .16, .47]) {
    const side = [[-.389, .447], [.412, .447], [.412, .921], [.284, .921], [-.389, .67]];
    b.plate([x, 0, 0], side, .04, wood, {rotation: [0, Math.PI / 2, 0]});
  }
  b.box([0, .701, -.405], [.968, .444, .042], green);
  b.box([0, .557, .388], [.969, .217, .042], green);
  for (const x of [-.314, .313]) {
    b.soft([x, .548, -.033], [.272, .117, .560], x > 0 ? 'canvas' : 'leather', .025);
    for (let i = 0; i < 5; i++) {
      b.turn([x + (i % 2 ? .056 : -.035), .57, -.204 + i * .071],
        [[0, .041], [.028, .057], [.074, .052], [.083, .032], [.083, 0]], x > 0 ? 'ceramic' : 'walnut', {small: true});
    }
  }
  for (const x of [-.315, 0, .315]) {
    b.box([x, .584, .411], [.126, .039, .006], 'brass', {shade: .64});
    b.box([x, .584, .415], [.106, .026, .003], 'paper', {shade: .90});
  }
}

function boltRack(b) {
  for (const x of [-.45, .45]) {
    b.box([x, .581, -.341], [.064, 1.162, .067], trim);
    b.box([x, .137, -.017], [.068, .274, .786], wood);
  }
  b.soft([0, .302, -.024], [.96, .065, .791], wood, .009);
  b.box([0, .998, -.336], [.908, .144, .058], wood, {grain: true});
  b.box([0, .422, .366], [.919, .134, .055], trim, {grain: true});
  for (const [i, x] of [-.337, -.117, .112, .333].entries()) {
    const rotation = [-.29, 0, .07 * (i - 1)];
    const z = -.08 + (i % 2) * .067, h = .66 + i * .058, paint = ['wine', 'olive', 'ticking', 'blue'][i];
    b.soft([x, .33 + h / 2, z], [.185, h, .237], paint, .026, {rotation});
    b.box([x, .33 + h * .52, z], [.189, .039, .241], 'paper', {rotation, shade: .82});
  }
}

function balance(b) {
  const y = .95;
  b.soft([.012, y + .021, -.038], [.443, .042, .204], trim, .013, {grain: true});
  b.turn([.012, y + .04, -.038], [[0, .075], [.022, .07], [.041, .038], [.239, .017],
    [.269, .026], [.297, .021], [.307, 0]], 'brass', {small: true});
  b.rod([-.277, 1.235, -.038], [.3, 1.235, -.038], .013, 'brass');
  for (const x of [-.257, .278]) {
    for (const [dx, dz] of [[-.059, -.052], [.059, -.052], [0, .070]]) b.rod([x, 1.237, -.038], [x + dx, 1.107, dz - .038], .004, 'brass');
    b.turn([x, 1.089, -.038], [[0, 0], [0, .058], [.013, .086], [.022, .101],
      [.025, .092], [.016, .051], [.016, 0]], 'brass');
  }
  for (const [x, r, h] of [[.203, .034, .039], [.29, .024, .029], [.35, .016, .021]]) {
    b.turn([x, y, .178], [[0, 0], [0, r], [h, r * .7], [h + .009, r * .48], [h + .009, 0]], 'iron', {small: true});
  }
}

export const SHOP_FIXTURES = {
  counter: b => salesBay(b),
  'corner-counter': cornerBay,
  'glass-case': displayCase,
  'shelf-empty': b => shopShelving(b, false),
  'shelf-stocked': b => shopShelving(b, true),
  apothecary,
  'dry-bin': dryBins,
  'bolt-rack': boltRack,
  'scale-counter': b => { salesBay(b); balance(b); }
};
