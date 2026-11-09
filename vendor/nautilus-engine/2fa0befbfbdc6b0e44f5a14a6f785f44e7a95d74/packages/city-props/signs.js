// All three skins use the same perpendicular board, bracket and wall mounting point.
export function hangingSign(b, paint) {
  const turn = Math.PI / 2;
  const iron = 'iron', dark = {shade: .60};
  b.soft([0, 1.999, -.479], [.106, .225, .040], iron, .007, dark);
  b.sweep([[0, 2.062, -.453], [0, 2.066, -.208], [0, 2.071, .175], [0, 2.060, .438]], .014, iron, dark);
  b.sweep([[0, 1.904, -.453], [0, 1.928, -.330], [0, 1.964, -.188],
    [0, 2.015, -.101], [0, 2.052, -.056]], .010, iron, dark);
  b.sweep([[0, 2.061, .437], [0, 2.036, .454], [0, 2.017, .435],
    [0, 2.018, .401], [0, 2.040, .393]], .008, iron, dark);
  const boardY = 1.754, boardZ = .116;
  const rim = [[-.287, -.158], [.287, -.158], [.306, -.138], [.306, .142],
    [.276, .170], [-.276, .170], [-.306, .142], [-.306, -.138]];
  b.plate([0, boardY, boardZ], rim, .036, 'walnut', {rotation: [0, turn, 0], shade: .64});
  for (const face of [-1, 1]) b.face([face * .0186, boardY + .004, boardZ], [.577, .295], paint,
    {rotation: [0, face * turn, 0]});
  for (const z of [-.075, .31]) {
    b.rod([0, 2.065, z], [0, 1.955, z], .0055, iron, dark);
    b.ring([0, 1.955, z], .026, .005, iron, {rotation: [0, turn, 0], shade: .69});
    b.box([0, 1.928, z], [.052, .016, .047], iron, dark);
  }
}
