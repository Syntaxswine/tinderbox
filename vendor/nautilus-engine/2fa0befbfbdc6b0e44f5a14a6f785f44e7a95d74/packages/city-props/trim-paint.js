// One original paint recipe shared by the native renderer and the glTF PNG bake.
export const TRIM_COLUMNS = 4;
export const TRIM_ROWS = 3;
const swatch = 192;
export const TRIM_WIDTH = TRIM_COLUMNS * swatch;
export const TRIM_HEIGHT = TRIM_ROWS * swatch;
export const TRIM_PAINTS = Object.freeze({
  'panel-green': 0, 'panel-walnut': 1, 'panel-oxblood': 2, 'drawer-walnut': 3,
  'dentil-green': 4, 'dentil-walnut': 5, 'dentil-ivory': 6, 'fascia-green': 7,
  'sign-goods': 8, 'sign-apothecary': 9, 'sign-blank': 10
});
const palette = [[46, 69, 54], [99, 58, 43], [92, 50, 43], [108, 63, 44],
  [52, 76, 57], [111, 66, 46], [188, 164, 121], [41, 61, 48],
  [43, 65, 50], [94, 44, 40], [55, 60, 65]];
const inside = (u, v, l, t, r, b) => u >= l && u <= r && v >= t && v <= b;
const clamp = value => Math.round(Math.min(255, Math.max(0, value)));

function strokeDistance(u, v, ax, ay, bx, by) {
  const dx = bx - ax, dy = by - ay;
  const t = Math.min(1, Math.max(0, ((u - ax) * dx + (v - ay) * dy) / (dx * dx + dy * dy)));
  return Math.hypot(u - ax - dx * t, v - ay - dy * t);
}

function signInk(cell, u, v) {
  const edge = Math.min(u, v, 1 - u, 1 - v);
  if (edge > .081 && edge < .095 || edge > .126 && edge < .134) return 'border';
  if (Math.abs(u - .5) + 1.4 * Math.abs(v - .176) < .023 ||
      Math.abs(u - .5) + 1.4 * Math.abs(v - .826) < .023) return 'border';

  if (cell === 8) {
    const x = (u - .46) * .916 + (v - .478) * .401;
    const y = (v - .478) * .916 - (u - .46) * .401;
    if (Math.abs(x) < .149 && (Math.abs(y + .176) < .038 || Math.abs(y - .162) < .036)) return 'gold';
    if (Math.abs(x) < .106 && Math.abs(y) < .155) return Math.sin(y * 83 + x * 11) > .55 ? 'shade' : 'gold';
    if (u > .512 && u < .778 && Math.abs(v - (.554 + (u - .512) * .51 + Math.sin(u * 18) * .015)) < .039) return 'gold';
  }
  if (cell === 9) {
    if (strokeDistance(u, v, .49, .488, .673, .262) < .034) return 'gold';
    if (inside(u, v, .267, .466, .713, .535)) return 'gold';
    const bowl = Math.hypot((u - .49) / .214, (v - .508) / .193);
    if (v >= .531 && v <= .704 && bowl < 1) return u < .40 || v < .562 ? 'gold' : 'shade';
    if (inside(u, v, .382, .685, .603, .725)) return 'gold';
  }
  return null;
}

export function paintCityTrim() {
  const pixels = new Uint8Array(TRIM_WIDTH * TRIM_HEIGHT * 4);
  for (let cell = 0; cell < palette.length; cell++) {
    const col = cell % TRIM_COLUMNS, row = Math.floor(cell / TRIM_COLUMNS);
    for (let y = 0; y < swatch; y++) for (let x = 0; x < swatch; x++) {
      const u = x / (swatch - 1), v = y / (swatch - 1);
      const hash = (Math.imul(x + 5, 19349663) ^ Math.imul(y + 13, 83492791)) >>> 0;
      const grain = Math.sin(x * 2.53 + Math.sin(y * .053) * .9) * 1.8
        + Math.sin(x * .26 + Math.sin(y * .021) * 2.9) * 3
        + Math.sin(x * .075 + y * .063) * 2 + ((hash % 29) - 14) * .16;
      let color = palette[cell], light = grain + 3 - v * 5;

      if (cell < 4) {
        const edge = Math.min(u, v, 1 - u, 1 - v);
        const litEdge = u + v < 1;
        if (edge < .077) light -= 9;
        else if (edge < .115) light += litEdge ? 24 : 4;
        else if (edge < .138) light -= litEdge ? 22 : 14;
        else if (edge < .17) light += litEdge ? 9 : 22;
        else if (edge < .197) light -= 15;
        else light += 3 * Math.sin((u + .12) * 5.2) - 6;
        if (cell === 3) {
          if (inside(u, v, .34, .31, .66, .54)) { color = [122, 91, 54]; light += 4; }
          if (inside(u, v, .38, .35, .62, .49)) { color = [167, 137, 90]; light += 7; }
          if (inside(u, v, .43, .40, .57, .423) || inside(u, v, .45, .439, .54, .45)) light -= 60;
          const pull = Math.hypot((u - .5) * .73, v - .66);
          if (pull < .071 && pull > .047 && v > .635) { color = [129, 93, 54]; light += v > .68 ? 7 : 39; }
        }
      } else if (cell < 7) {
        // Painterly light and shadow describe the teeth on a single sloped face.
        const phase = ((u - .036) / .928 * 10 + 10.5) % 1;
        const cut = phase > .18 && phase < .79;
        if (v > .19 && v < .87) {
          light -= 34;
          if (cut && v < .746) light += 49 + (phase < .29 ? 16 : 0) + (v < .27 ? 21 : 0);
          if (cut && v > .67 && v < .77) light -= 18;
        }
        if (v < .14 || v > .889) light += v < .14 ? 17 : 5;
      } else if (cell === 7) {
        if (u > .063 && u < .937 && (Math.abs(v - .182) < .028 || Math.abs(v - .819) < .028)) color = [141, 110, 64];
      } else {
        const ink = signInk(cell, u, v);
        if (ink === 'border') color = [157, 124, 66];
        if (ink === 'gold') color = [218, 177, 93];
        if (ink === 'shade') color = [182, 138, 66];
        if (!ink) light -= 8 * Math.hypot(u - .46, v - .48);
      }

      const at = ((row * swatch + y) * TRIM_WIDTH + col * swatch + x) * 4;
      pixels[at] = clamp(color[0] + light);
      pixels[at + 1] = clamp(color[1] + light * .87);
      pixels[at + 2] = clamp(color[2] + light * .71);
      pixels[at + 3] = 255;
    }
  }
  return pixels;
}
