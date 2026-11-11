// Extracted original cloth recipes from Tinderbox stockyard candidate e98e46f11f818857a2f08054e9d1071e023cc2d3.
export function createClothRecipes(b) {
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
  return {fan,ribbon};
}
