import {corniceRun} from './trim.js';
import {hangingSign} from './signs.js';

const wood = 'sage';
const finish = {shade: .55};
const brass = {shade: .52};
const cap = {top: 2.12, rise: .113, depth: .077};

function header(b, path) {
  corniceRun(b, path, cap);
}
function leg(b, x, y, z, w, h, d) {
  b.box([x, y, z], [w, h, d], wood, finish);
}
function pier(b, x, z, turn = 0) {
  b.box([x, .993, z], [.054, 1.986, .117], wood, {...finish, rotation: [0, turn, 0]});
  const dx = Math.sin(turn) * .059, dz = Math.cos(turn) * .059;
  b.face([x + dx, 1.098, z + dz], [.045, 1.35], 'panel-green', {rotation: [0, turn, 0]});
}

function displayBay(b, x0 = -.5, x1 = .5, z = 0, turn = 0) {
  const w = x1 - x0, center = (x0 + x1) / 2;
  const cos = Math.cos(turn), sin = Math.sin(turn);
  const draw = (x, y, d) => [x * cos + d * sin, y, -x * sin + d * cos];
  const rotation = [0, turn, 0];
  const board = (x, y, d, size, paint = wood, options = finish) => b.box(draw(x, y, z + d), size, paint, {...options, rotation});
  board(center, .223, 0, [w, .446, .114]);
  b.face(draw(center, .221, z + .058), [w - .069, .37], 'panel-green', {rotation});
  board(center, .035, .008, [w, .07, .13], 'walnut', {shade: .56});
  board(center, .453, .008, [w, .045, .133]);
  for (const [x, width] of [[x0 + .029, .058], [x1 - .029, .058], [center, .029]]) {
    board(x, 1.228, 0, [width, 1.565, .112]);
  }
  board(center, 1.717, .006, [w, .041, .11]);
  for (const [y, h] of [[1.083, 1.218], [1.819, .159]]) {
    for (const x of [center - w / 4, center + w / 4]) {
      b.face(draw(x, y, z + .012), [w / 2 - .05, h], 'store-glass', {rotation});
    }
  }
  board(center, 1.951, .004, [w, .112, .122]);
  b.face(draw(center, 1.951, z + .066), [w - .011, .1], 'fascia-green', {rotation});
  b.face(draw(center, .467, z + .075), [w - .03, .011], 'brass', {...brass, rotation});
}

function shopWindow(b) {
  displayBay(b);
  header(b, [[-.5, .058], [.5, .058]]);
}
function shopEntry(b) {
  // The jambs step back 23 cm at the threshold. The entrance is open.
  for (const sign of [-1, 1]) {
    const from = [sign * .481, 0, .019], to = [sign * .338, 0, -.215];
    const dx = to[0] - from[0], dz = to[2] - from[2];
    const rotation = [0, Math.atan2(-dz, dx), 0];
    const mid = [(from[0] + to[0]) / 2, .981, (from[2] + to[2]) / 2];
    b.box(mid, [Math.hypot(dx, dz), 1.83, .038], wood, {...finish, rotation});
    pier(b, sign * .472, .008);
    pier(b, sign * .325, -.226);
  }
  leg(b, 0, 1.835, -.109, .673, .039, .268);
  b.face([0, 1.885, -.195], [.61, .071], 'store-glass');
  leg(b, 0, 1.887, -.214, .028, .091, .039);
  leg(b, 0, 1.951, .004, 1, .112, .122);
  b.face([0, 1.951, .066], [.989, .1], 'fascia-green');
  b.box([0, .013, -.196], [.675, .025, .314], 'marble', {shade: .63});
  header(b, [[-.5, .058], [.5, .058]]);
}
function shopCorner(b) {
  displayBay(b, -.5, .041);
  // The second bay faces +X and joins a northward return at the cell boundary.
  displayBay(b, 0, .5, 0, Math.PI / 2);
  pier(b, 0, 0);
  header(b, [[-.5, .058], [.058, .058], [.058, -.5]]);
}

const room = {top: 2.116, rise: .112, depth: .078, paint: 'dentil-ivory'};
export const STOREFRONT_FORMS = {
  'shop-window': shopWindow,
  'shop-entry': shopEntry,
  'shop-corner': shopCorner,
  'hanging-sign-goods': b => hangingSign(b, 'sign-goods'),
  'hanging-sign-apothecary': b => hangingSign(b, 'sign-apothecary'),
  'hanging-sign-blank': b => hangingSign(b, 'sign-blank'),
  'room-cornice': b => corniceRun(b, [[-.5, -.49], [.5, -.49]], room),
  'room-cornice-corner': b => corniceRun(b, [[-.49, .5], [-.49, -.49], [.5, -.49]], room)
};
