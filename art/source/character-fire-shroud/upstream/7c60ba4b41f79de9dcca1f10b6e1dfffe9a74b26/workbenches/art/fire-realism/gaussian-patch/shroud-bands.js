// Close flame bands around the native bear's skinned bounds, in local metres.
// [height, front/back center, front/back radius, side radius, splat count].
const RINGS = [
  [.19, -.023, .170, .337, 6],
  [.43, .018, .184, .337, 6],
  [.68, -.041, .274, .390, 6],
  [.95, -.048, .291, .411, 8],
  [1.24, -.043, .251, .337, 6],
];
const TAU = Math.PI * 2;

export function createShroudBands(T, rig, hitPatch) {
  const root = rig.worker.root;
  const point = new T.Vector3();
  const air = new Float64Array(3);
  const hit = root.worldToLocal(point.set(hitPatch.x, hitPatch.y, hitPatch.z));
  const hitAngle = Math.atan2(hit.z, hit.x);
  const bands = [];
  for (const [row, [y, x, rx, rz, count]] of RINGS.entries()) {
    for (let i = 0; i < count; i++) {
      const angle = (i + .37 * row) * TAU / count;
      const around = Math.acos(Math.cos(angle - hitAngle)) / Math.PI;
      bands.push({
        row, x, y, rx, rz, angle, delay: around * .27 + row * .013,
        width: .55 * TAU * Math.hypot(rx, rz) / (Math.SQRT2 * count),
        thickness: .045, hot: (i + row) % 3 === 0,
        worldX: 0, worldY: 0, worldZ: 0, height: 0, heading: 0, alpha: 0, leanX: 0, leanZ: 0
      });
    }
  }
  return {
    update(time, heading, fade, sampleWind) {
      const matrix = root.matrixWorld;
      const world = matrix.elements;
      sampleWind(world[12], world[13] + .8, world[14], air);
      for (const band of bands) {
        const ripple = Math.sin(time * 9.7 + band.angle * 2 + band.row * 1.2);
        const crest = Math.sin(time * 6.3 - band.angle * 3 + band.row * .61);
        const angle = band.angle + .09 * ripple;
        const cos = Math.cos(angle), sin = Math.sin(angle);
        point.set(band.x + (band.rx + .016 * ripple) * cos, band.y + .058 * crest,
          (band.rz + .017 * ripple) * sin).applyMatrix4(matrix);
        band.worldX = point.x;
        band.worldY = point.y;
        band.worldZ = point.z;
        band.heading = heading + Math.atan2(band.rz * cos, -band.rx * sin);
        band.leanX = T.MathUtils.clamp(air[0] * .5, -.24, .24) + .12 * ripple;
        band.leanZ = T.MathUtils.clamp(air[2] * .5, -.24, .24) + .11 * crest;
        band.height = .112 + .027 * (1 + crest);
        band.alpha = (.78 + .15 * ripple) * fade * T.MathUtils.smoothstep(time - band.delay, .02, .26);
      }
      return bands;
    }
  };
}
