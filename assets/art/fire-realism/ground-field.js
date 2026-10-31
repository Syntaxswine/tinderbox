// Original TB-034 source-derived presentation, not a heat/fluid simulation.
export const GROUND_SOURCE_SIDE = 256;
export const GROUND_DOMAIN_HEIGHT = 3.3;
const finite = Number.isFinite;
const compare = (a, b) => String(a.id).localeCompare(String(b.id));
const woodFuel = s => s.material === 'wood' && s.surfaceFuel > 0;
function hash(id) {let s = 2166136261; for (const c of String(id)) s = Math.imul(s ^ c.charCodeAt(0), 16777619); return (s >>> 0) / 4294967296;}

/** Fill one bounded owned texture. Unsupported layouts retain the old complete
 * presentation explicitly; they never silently discard a source or a floor. */
export function prepareGroundSources(sources, data) {
  if (!(data instanceof Float32Array) || data.length !== GROUND_SOURCE_SIDE ** 2 * 4) throw new TypeError('Ground source storage must be the bounded256-square RGBA float array');
  data.fill(0);
  const sorted = [...sources].sort(compare), result = {enabled: false, reason: 'no burning sources', origin: [0, 0], extent: [0, 0], cellSize: .5, coherentIds: [], sourceIds: sorted.map(s => s.id)};
  if (!sorted.length) return result;
  const size = sorted[0].size, x0 = sorted[0].x, z0 = sorted[0].y;
  if (!(size > 0) || sorted.some(s => ![s.x, s.y, s.elevation, s.intensity, s.size].every(finite) || Math.abs(s.size - size) > 1e-6)) return {...result, reason: 'mixed/invalid cell sizes; complete cell-envelope fallback'};
  const indexed = [], locations = new Map();
  let minX = Infinity, minZ = Infinity, maxX = -Infinity, maxZ = -Infinity;
  for (const s of sorted) {
    const x = Math.round((s.x - x0) / size), z = Math.round((s.y - z0) / size), key = `${x}:${z}`;
    if (Math.abs(s.x - x0 - x * size) > 1e-5 || Math.abs(s.y - z0 - z * size) > 1e-5 || locations.has(key)) return {...result, reason: 'nonuniform/overlapping floor layout; complete cell-envelope fallback'};
    const p = {s, x, z}; indexed.push(p); locations.set(key, p);
    minX = Math.min(minX, x); minZ = Math.min(minZ, z); maxX = Math.max(maxX, x); maxZ = Math.max(maxZ, z);
  }
  const width = maxX - minX + 1, height = maxZ - minZ + 1;
  if (width > GROUND_SOURCE_SIDE || height > GROUND_SOURCE_SIDE) return {...result, reason: 'spatial extent exceeds bounded256-square texture; complete cell-envelope fallback'};
  for (const {s, x, z} of indexed) {
    const at = ((z - minZ) * GROUND_SOURCE_SIDE + x - minX) * 4;
    data.set([s.intensity, Number(woodFuel(s)) + Number(s.gas) * 2, s.elevation, 1], at);
    let adjacent = false;
    for (let dz = -1; dz <= 1; dz++) for (let dx = -1; dx <= 1; dx++) {
      if (!dx && !dz) continue;
      const neighbor = locations.get(`${x + dx}:${z + dz}`)?.s;
      if (neighbor && Math.abs(neighbor.elevation - s.elevation) < 1e-4) adjacent = true;
    }
    if (adjacent) result.coherentIds.push(s.id);
  }
  return {...result, enabled: true, reason: 'all current sources encoded; adjacent cells share one world-space reaction field', origin: [x0 + minX * size - size * .5, z0 + minZ * size - size * .5], extent: [width, height], cellSize: size};
}

/** CPU audit of the actual uploaded source texture, also used by focused checks.
 * Filtering is shared across domains; missing neighbors do not invent fuel. */
export function sampleGroundSources(field, data, x, z, elevation = 0) {
  const gx = (x - field.origin[0]) / field.cellSize - .5, gz = (z - field.origin[1]) / field.cellSize - .5;
  const ix = Math.floor(gx), iz = Math.floor(gz), fx = gx - ix, fz = gz - iz, sum = [0, 0, 0, 0];
  for (let dz = 0; dz < 2; dz++) for (let dx = 0; dx < 2; dx++) {
    const px = ix + dx, pz = iz + dz;
    if (px < 0 || pz < 0 || px >= field.extent[0] || pz >= field.extent[1]) continue;
    const at = (pz * GROUND_SOURCE_SIDE + px) * 4;
    if (!data[at + 3] || Math.abs(data[at + 2] - elevation) > .1) continue;
    const w = (dx ? fx : 1 - fx) * (dz ? fz : 1 - fz), fuel = data[at + 1];
    sum[0] += data[at] * w; sum[1] += Number(fuel >= 1.5) * w; sum[2] += fuel % 2 * w; sum[3] += w;
  }
  return sum[3] > 0 ? [sum[0] / sum[3], sum[1] / sum[3], sum[2] / sum[3], sum[3]] : [0, 0, 0, 0];
}

/** Exact world-metre ray interval of a cell domain, not a cone envelope. */
export function groundDomainInterval(origin, direction, center, size, height = GROUND_DOMAIN_HEIGHT * .85) {
  let entry = 0, exit = Infinity;
  const low = [center[0] - size * .5, center[1], center[2] - size * .5], high = [center[0] + size * .5, center[1] + height, center[2] + size * .5];
  for (let i = 0; i < 3; i++) {
    if (Math.abs(direction[i]) < 1e-10) {if (origin[i] < low[i] || origin[i] >= high[i]) return null; continue;}
    const a = (low[i] - origin[i]) / direction[i], b = (high[i] - origin[i]) / direction[i];
    entry = Math.max(entry, Math.min(a, b)); exit = Math.min(exit, Math.max(a, b));
  }
  return exit > entry ? [entry, exit] : null;
}

/** Irregular, deterministic catchments. The bins accelerate neighbor searches;
 * they never place a plume. Every live/tail source is assigned exactly once. */
export function prepareSmokeRegions(history, time, tail) {
  const sources = [...history].map(([id, h]) => ({...h, id, age: time - h.lastBurn, weight: h.intensity * (1 - (time - h.lastBurn) / tail)})).filter(h => h.weight > .0001).sort(compare);
  const candidates = [...sources].sort((a, b) => hash(`plume:${a.id}`) - hash(`plume:${b.id}`) || compare(a, b));
  const bins = new Map(), centers = [], binSize = 2.2;
  const floor = s => Math.round(s.elevation * 10), binKey = (x, z, level) => `${level}:${x}:${z}`;
  function nearby(s, range) {
    const bx = Math.floor(s.x / binSize), bz = Math.floor(s.y / binSize), found = [];
    for (let dz = -range; dz <= range; dz++) for (let dx = -range; dx <= range; dx++) found.push(...(bins.get(binKey(bx + dx, bz + dz, floor(s))) || []));
    return found;
  }
  for (const s of candidates) {
    const spacing = 1.35 + hash(`spacing:${s.id}`) * .8;
    if (nearby(s, 1).some(c => Math.hypot(c.x - s.x, c.y - s.y) < (spacing + c.spacing) * .5)) continue;
    const c = {id: s.id, x: s.x, y: s.y, spacing, sourceIds: [], xSum: 0, zSum: 0, elevationSum: 0, ageSum: 0, squareSum: 0, weight: 0, area: 0, wood: 0, gas: 0};
    centers.push(c); const key = binKey(Math.floor(s.x / binSize), Math.floor(s.y / binSize), floor(s));
    if (!bins.has(key)) bins.set(key, []); bins.get(key).push(c);
  }
  for (const s of sources) {
    const matches = nearby(s, 2).sort((a, b) => Math.hypot(a.x - s.x, a.y - s.y) - Math.hypot(b.x - s.x, b.y - s.y) || compare(a, b)), c = matches[0];
    if (!c) throw new Error('No regional plume accounts for a retained smoke source');
    const w = s.weight; c.sourceIds.push(s.id); c.xSum += s.x * w; c.zSum += s.y * w; c.elevationSum += s.elevation * w; c.ageSum += s.age * w;
    c.squareSum += (s.x * s.x + s.y * s.y) * w; c.weight += w; c.area += s.size * s.size * w; c.wood += Number(woodFuel(s)) * w; c.gas += Number(s.gas) * w;
  }
  return centers.sort(compare).map(c => {
    const w = c.weight, x = c.xSum / w, y = c.zSum / w;
    return {id: c.id, sourceIds: c.sourceIds, x, y, elevation: c.elevationSum / w, age: c.ageSum / w, weight: w, count: c.sourceIds.length, area: c.area, spread: Math.sqrt(Math.max(0, c.squareSum / w - x * x - y * y)), wood: c.wood / w, gas: c.gas / w};
  });
}

export const groundFieldGLSL = `
  uniform sampler2D groundSources;
  uniform vec2 groundOrigin,groundExtent;
  uniform float groundCellSize,groundFieldEnabled;
  vec4 groundTexel(ivec2 p) {
    if(any(lessThan(p,ivec2(0)))||any(greaterThanEqual(p,ivec2(groundExtent))))return vec4(0.);
    return texelFetch(groundSources,p,0);
  }
  vec4 groundSample(vec2 p) {
    vec2 g=(p-groundOrigin)/groundCellSize-.5,i=floor(g),f=fract(g); vec4 result=vec4(0.);
    for(int dz=0;dz<2;dz++)for(int dx=0;dx<2;dx++) {
      vec4 s=groundTexel(ivec2(i)+ivec2(dx,dz));
      if(s.a<.5||abs(s.z-(base.y-.018))>.1)continue;
      float w=(dx==0?1.-f.x:f.x)*(dz==0?1.-f.y:f.y);
      result+=vec4(s.x,step(1.5,s.y),mod(s.y,2.),1.)*w;
    }
    return result.a>0.?vec4(result.rgb/result.a,result.a):vec4(0.);
  }
  // The actual curved upper support and the interior use the same front. Dense
  // radial cap rings resolve its small licking edge; no cell-centred cone peak.
  float groundHeight(vec2 p,vec4 source) {
    if(source.a<=0.)return .03;
    vec3 slow=vec3(p.x*.73,p.y*.73,clock*.29);
    float macro=fb(slow+vec3(3.1,11.7,-5.2));
    float secondary=n3(vec3(p.x*1.72,p.y*1.72,clock*.53));
    float licking=fb(vec3(p.x*4.7,p.y*4.7,clock*1.35))-.5;
    return (.30+source.x*mix(.94,1.2,source.y))*(.48+macro+secondary*.22+licking*.16);
  }
  // A common world-space reaction field: no source-ID seed, local cone, or
  // per-cell height phase. Material and liquid fuel affect presentation only.
  vec4 groundReaction(vec3 wp) {
    vec4 source=groundSample(wp.xz); if(source.a<=0.)return vec4(0.);
    float h=wp.y-base.y; if(h<0.)return vec4(0.);
    float height=groundHeight(wp.xz,source);
    if(h>=height)return vec4(0.);
    vec3 slow=vec3(wp.x*.73,wp.z*.73,clock*.29);
    vec2 lean=(vec2(n3(slow+17.3),n3(slow-8.1))-.5)*h*.58;
    vec3 flow=vec3((wp.x-lean.x)*3.7,h*3.1-clock*2.85,(wp.z-lean.y)*3.7);
    flow+=vec3(n3(flow*.38+3.7),n3(flow*.38-9.4),n3(flow*.38+18.6))*.9;
    float wrinkle=fb(flow),sheet=1.-smoothstep(.058,.19,abs(wrinkle-.51));
    float pocket=smoothstep(.26,.64,fb(vec3(wp.x*.92,h*.84-clock*.77,wp.z*.92)+vec3(7.1,-2.3,11.8)));
    float envelope=1.-smoothstep(height*.68,height,h);
    float contact=exp(-h*10.)*(.045+.09*sheet);
    float density=(sheet*(.12+.88*pocket)*.76*envelope+contact)*source.x;
    float reaction=clamp(.28+wrinkle*.70+contact*.65-h/max(.1,height)*.14+source.y*.05-source.z*.025,0.,1.);
    return vec4(density,reaction,contact,pocket);
  }
  vec3 groundEmission(vec4 f) {
    vec3 color=mix(vec3(.72,.014,.0005),vec3(1.,.29,.008),smoothstep(.37,.75,f.y));
    color=mix(color,vec3(1.,.94,.71),smoothstep(.79,.98,f.y+f.z*.32));
    return color*1.65;
  }
  bool groundInterval(vec3 start,vec3 direction,out float entry,out float exit) {
    vec3 lo=base-vec3(groundCellSize*.5,0.,groundCellSize*.5),hi=base+vec3(groundCellSize*.5,shape.y*.85,groundCellSize*.5);
    entry=0.;exit=1.e20;
    for(int i=0;i<3;i++) {
      if(abs(direction[i])<1.e-10) {if(start[i]<lo[i]||start[i]>=hi[i])return false;}
      else {float a=(lo[i]-start[i])/direction[i],b=(hi[i]-start[i])/direction[i];entry=max(entry,min(a,b));exit=min(exit,max(a,b));}
    }
    return exit>entry;
  }
`;
