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
