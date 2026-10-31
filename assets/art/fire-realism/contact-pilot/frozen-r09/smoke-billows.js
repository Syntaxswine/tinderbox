// Original TB-034 reference smoke. Pure world-clock billow preparation feeds
// the actual instance attributes used by both the support mesh and density.
export const SMOKE_BILLOW_COUNT = 4;
const smooth = (a, b, x) => {const t = Math.max(0, Math.min(1, (x - a) / (b - a))); return t * t * (3 - 2 * t);};
function random(word) {let n = word | 0; n = Math.imul(n ^ n >>> 16, 0x7feb352d); n = Math.imul(n ^ n >>> 15, 0x846ca68b); return ((n ^ n >>> 16) >>> 0) / 4294967296;}

export function prepareSmokeBillows(seed, worldTime, kind = 1) {
  if (![seed, worldTime].every(Number.isFinite) || ![1, 3].includes(kind)) throw new TypeError('Billow parameters require finite seed/world time and a ground/building smoke kind.');
  const word = Math.floor(seed * 2147483647), cycle = worldTime * (kind === 3 ? .29 : .27) + seed;
  return Array.from({length: SMOKE_BILLOW_COUNT}, (_, i) => {
    const t = cycle + i / SMOKE_BILLOW_COUNT, birth = Math.floor(t), age = t - birth;
    const identity = word ^ Math.imul(birth + 271, 1597334677) ^ Math.imul(i + 1, 3812015801);
    const angle = random(identity) * Math.PI * 2, drift = .23 * age ** 1.35;
    return {x: Math.cos(angle) * drift, y: .08 + .62 * age, z: Math.sin(angle) * drift,
      radius: (.24 + .64 * Math.sqrt(age)) * (.86 + random(identity ^ 0x45d9f3b) * .28) * (kind === 3 ? 1.08 : 1), age};
  });
}

// Exposed source invariants for lifecycle/support checks, not visual approval.
export const smokeBillowFade = age => smooth(0, .12, age) * (1 - smooth(.82, 1, age));
export const smokeBillowHalfHeight = age => .12 + .12 * age;

// n3/fb are supplied by the host's original procedural noise block. The
// billow centres/radii below are actual CPU-prepared attributes, not a second
// approximation of their movement in GLSL.
export const smokeBillowGLSL = `
  bool billowSmoke(float kind) {return kind>.5&&abs(kind-2.)>.25;}
  float billowHalfHeight(float age) {return .12+.12*age;}
  float billowFade(float age) {return smoothstep(0.,.12,age)*(1.-smoothstep(.82,1.,age));}
  float billowSupport(vec4 b,float age,float y,float angle) {
    if(billowFade(age)<.001)return 0.;
    float dy=(y-b.y)/(billowHalfHeight(age)*1.22); if(abs(dy)>=1.)return 0.;
    vec2 u=vec2(cos(angle),sin(angle));
    float centre=dot(b.xz,u),side2=max(0.,dot(b.xz,b.xz)-centre*centre);
    float radius=b.w*1.22*sqrt(max(0.,1.-dy*dy));
    return radius*radius>side2?max(0.,centre+sqrt(radius*radius-side2)):0.;
  }
  float billowDensity(vec3 p,vec4 b,float age,float seed) {
    float fade=billowFade(age); if(fade<.001)return 0.;
    vec3 q=vec3((p.x-b.x)/b.w,(p.y-b.y)/billowHalfHeight(age),(p.z-b.z)/b.w);
    // The bounded erosion cannot contribute beyond1.2 radii. Reject known
    // empty support before evaluating procedural density, not after it.
    if(dot(q,q)>1.44)return 0.;
    float angle=age*4.4+seed*9.7,c=cos(angle),s=sin(angle);
    vec3 roll=vec3(c*q.x-s*q.y,s*q.x+c*q.y,q.z);
    float coarse=fb(roll*2.1+vec3(seed*17.1,age*.8,-seed*11.3));
    float fine=n3(roll*5.4+vec3(3.7,seed*31.2,age*1.3));
    // Actual ellipsoidal billows carry the macro shape. Coherent rotating
    // density and boundary erosion expose entrained/dilute gaps between them.
    float edge=length(q)+(coarse-.5)*.22+(fine-.5)*.10;
    float envelope=1.-smoothstep(.53,1.04,edge);
    float entrainment=.28+.72*smoothstep(.28,.68,coarse);
    return envelope*entrainment*fade;
  }
`;
