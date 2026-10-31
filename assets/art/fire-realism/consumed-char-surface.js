// Original Tinderbox art prototype, architect contract e1fe8913ea6aca8d4bfdc32090fe41a637b526fc.
// No borrowed photo pixels, texture, time, fuel simulation or retained state.
export const CONSUMED_CHAR_SURFACE_GLSL = `
float consumedCharScar(vec2 worldMetres, float nativeDistance, float charWidth, float consumed, float cellMetres) {
  float c = clamp(consumed, 0., 1.);
  float cell = max(cellMetres, .0001);
  float width = max(charWidth, 0.) * cell;
  if (c <= 0. || width <= 0.) return 0.;
  float distanceMetres = max(nativeDistance, 0.) * cell;
  float qx = (.8 * worldMetres.x - .6 * worldMetres.y) / .72 + .73;
  float qy = (.6 * worldMetres.x + .8 * worldMetres.y) / .72 - 1.19;
  float field = 0.;
  float fine = 0.;
  float weight = .56;
  for (int octave = 0; octave < 3; octave++) {
    float ix = floor(qx), iy = floor(qy);
    float fx = fract(qx), fy = fract(qy);
    float ux = fx * fx * (3. - 2. * fx), uy = fy * fy * (3. - 2. * fy);
    float a = fract(sin(ix * 73.156 + iy * 52.235 + 11.73) * 17313.371);
    float b = fract(sin((ix + 1.) * 73.156 + iy * 52.235 + 11.73) * 17313.371);
    float d = fract(sin(ix * 73.156 + (iy + 1.) * 52.235 + 11.73) * 17313.371);
    float e = fract(sin((ix + 1.) * 73.156 + (iy + 1.) * 52.235 + 11.73) * 17313.371);
    fine = mix(mix(a, b, ux), mix(d, e, ux), uy);
    field += weight * fine;
    weight = octave == 0 ? .29 : .15;
    qx = qx * 2.5 + 17.17;
    qy = qy * 2.5 - 9.23;
  }
  field = clamp(field, 0., 1.);
  float erosion = cell * (.02 + .21 * (1. - field));
  float radius = max(0., width - erosion);
  // Derivatives do not include consumed/width: increasing fuel loss cannot
  // widen the AA band and erase an already covered point.
  float aa = clamp(fwidth(distanceMetres + erosion), cell * .0125, cell * .12);
  float body = 1. - smoothstep(radius - aa, radius + aa, distanceMetres);
  float extent = 1. - smoothstep(max(0., width - aa), width, distanceMetres);
  float breakAA = clamp(fwidth(fine), .02, .12);
  float pores = smoothstep(.20 - breakAA, .32 + breakAA, fine);
  return c * body * extent * pores;
}

vec3 consumedCharPigment(vec2 worldMetres, float consumed) {
  float c = clamp(consumed, 0., 1.);
  float qx = (.8 * worldMetres.x - .6 * worldMetres.y) / .72 + .73;
  float qy = (.6 * worldMetres.x + .8 * worldMetres.y) / .72 - 1.19;
  float field = 0.;
  float fine = 0.;
  float weight = .56;
  for (int octave = 0; octave < 3; octave++) {
    float ix = floor(qx), iy = floor(qy);
    float fx = fract(qx), fy = fract(qy);
    float ux = fx * fx * (3. - 2. * fx), uy = fy * fy * (3. - 2. * fy);
    float a = fract(sin(ix * 73.156 + iy * 52.235 + 11.73) * 17313.371);
    float b = fract(sin((ix + 1.) * 73.156 + iy * 52.235 + 11.73) * 17313.371);
    float d = fract(sin(ix * 73.156 + (iy + 1.) * 52.235 + 11.73) * 17313.371);
    float e = fract(sin((ix + 1.) * 73.156 + (iy + 1.) * 52.235 + 11.73) * 17313.371);
    fine = mix(mix(a, b, ux), mix(d, e, ux), uy);
    field += weight * fine;
    weight = octave == 0 ? .29 : .15;
    qx = qx * 2.5 + 17.17;
    qy = qy * 2.5 - 9.23;
  }
  field = clamp(field, 0., 1.);
  float shade = mix(1., .84, c) * (.90 + .10 * fine);
  return vec3(mix(.035, .092, field) * shade,
              mix(.024, .060, field) * shade,
              mix(.014, .030, field) * shade);
}
`;
