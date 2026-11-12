import {createSplatPatch} from '../../../src/reuse/ashland/splats.js';

const LIMIT = 80;
const SPLATS_PER_CELL = 8;
const SOOT_LIFETIME = 1.8;
const TAU = Math.PI * 2;

function cellPhase(id) {
  const key = String(id);
  let hash = 2166136261;
  for (let i = 0; i < key.length; i += 1) hash = Math.imul(hash ^ key.charCodeAt(i), 16777619);
  // Grid-neighbour IDs should not share nearly identical motion phases.
  hash = Math.imul(hash ^ (hash >>> 16), 0x45d9f3b);
  return ((hash ^ (hash >>> 16)) >>> 0) / 4294967296;
}

export function createWallShroud(T, {maxCells = LIMIT, profile = 'wall'} = {}) {
  if (profile !== 'wall' && profile !== 'house') throw RangeError('Unknown surface fire profile');
  const house = profile === 'house';
  const windOffset = house ? .50 : .12;
  if (!Number.isInteger(maxCells) || maxCells < 1 || maxCells > LIMIT) {
    throw new RangeError('maxCells must be an integer from 1 to 80');
  }

  const maxSplats = maxCells * SPLATS_PER_CELL;
  const batch = createSplatPatch(T, {maxPatches: 0, extraCapacity: maxSplats});
  const {root} = batch;
  root.name = 'Gaussian wall shroud';
  const pool = Array.from({length: maxSplats}, () => ({}));
  const splats = [];
  const wind = new Float64Array(3);
  const surface = {};
  const {clamp, smoothstep} = T.MathUtils;
  const amber = new T.Color(0xff952c).multiplyScalar(2.35);
  const hot = new T.Color(0xffc65a).multiplyScalar(2.55);
  const faceHeat = new T.Color(0xffb044).multiplyScalar(2.25);
  const tip = new T.Color(0xff691b).multiplyScalar(1.95);
  const soot = new T.Color(0x625c50);
  const preheatSoot = new T.Color(0x8c887a);
  const roofSoot = new T.Color(0x514d44);
  let activeCells = 0;
  let disposed = false;
  let supportCell = null;

  function airAt(sampleWind, x, y, z) {
    wind.fill(0);
    return sampleWind?.(x, y, z, wind) ?? wind;
  }

  function splat(x, y, z, sx, sy, sz, leanX, leanZ, heading, color, alpha, smoke = false) {
    if (!smoke && supportCell) {
      const c = supportCell, radius = c.supportRadius;
      if (radius > 0 && Math.abs(c.ny) > .15) {
        const dx=x-c.x, dz=z-c.z, spread=2.6*Math.hypot(sx,sz,sy*Math.hypot(leanX,leanZ));
        const fit=Math.min(1,radius/(Math.hypot(dx,dz)+spread));
        const oldX=x,oldZ=z;x=c.x+dx*fit;z=c.z+dz*fit;
        if(c.part==='roof'&&Math.abs(c.ny)>.05)y+=(-c.nx/c.ny)*(x-oldX)+(-c.nz/c.ny)*(z-oldZ);
        sx*=fit;sz*=fit;leanX*=fit;leanZ*=fit;
      } else if (c.tangentRadius > 0) {
        const h=Math.hypot(c.nx,c.nz)||1,tx=c.nz/h,tz=-c.nx/h,along=(x-c.x)*tx+(z-c.z)*tz;
        const spread=2.6*Math.hypot(sx,sz,sy*Math.hypot(leanX,leanZ)),fit=Math.min(1,c.tangentRadius/(Math.abs(along)+spread));
        x+=tx*along*(fit-1);z+=tz*along*(fit-1);sx*=fit;sz*=fit;leanX*=fit;leanZ*=fit;
      }
    }
    if(!smoke&&supportCell?.part==='walls'&&supportCell.supportBounds){
      const lo=supportCell.supportBounds.min[1]+.012,hi=Math.min(supportCell.supportBounds.max[1]+.16,supportCell.cutawayTopY??Infinity);
      if(y<=lo||y>=hi)return;
      const fit=Math.min(1,Math.min(y-lo,hi-y)/(2.6*Math.hypot(sy,sx*Math.hypot(leanX,leanZ))));sy*=fit;
    }
    // Ceiling-side combustion cannot manufacture flame/smoke above an intact slab.
    if (supportCell?.part === 'ceiling') {
      const ceiling=supportCell.y-.012,extent=2.6*Math.hypot(sx,sy,sz);
      y=Math.min(y,ceiling-extent);
    }
    const item = pool[splats.length];
    item.x = x;
    item.y = y;
    item.z = z;
    item.sx = sx;
    item.sy = sy;
    item.sz = sz;
    item.leanX = leanX;
    item.leanZ = leanZ;
    item.heading = heading;
    item.color = color;
    item.alpha = alpha;
    item.smoke = smoke;
    item.sourceId=supportCell?.id;
    item.supportY=supportCell?.y;
    item.part=supportCell?.part;
    splats.push(item);
  }

  function onFace(cell, tx, tz, heading, along, rise, offset, sx, sy, sz, leanX, leanZ, color, alpha) {
    const travel = Math.max(0, rise) * .51;
    if (cell.part === 'ground' && cell.floorRadius > 0) {
      const dx = tx * along + cell.nx * offset + leanX * travel;
      const dz = tz * along + cell.nz * offset + leanZ * travel;
      // Bound the flame footprint, including tilt, at the splat shader's 2.6 sigma cutoff.
      const spread = 2.6 * Math.hypot(sx, sz, sy * Math.hypot(leanX, leanZ));
      const fit = Math.min(1, cell.floorRadius / (Math.hypot(dx, dz) + spread));
      splat(cell.x + dx * fit, cell.y + rise + cell.ny * offset, cell.z + dz * fit,
        sx * fit, sy, sz * fit, leanX * fit, leanZ * fit, heading, color, alpha);
      return;
    }
    splat(cell.x + tx * along + cell.nx * offset + leanX * travel,
      cell.y + rise + cell.ny * offset,
      cell.z + tz * along + cell.nz * offset + leanZ * travel,
      sx, sy, sz, leanX, leanZ, heading, color, alpha);
  }

  // Same accepted soft Gaussian body, composed as a low connected flame with
  // sparse head-sized folds. The thermal subdivision is never drawn as a tall icon.
  function houseFlames(cell,age,phase,heat,sampleWind){
    const wall=cell.part==='walls',roof=cell.part==='roof',ceiling=cell.part==='ceiling';
    const h=Math.hypot(cell.nx,cell.nz),tx=h>1e-5?cell.nz/h:1,tz=h>1e-5?-cell.nx/h:0,heading=Math.atan2(tz,tx),angle=phase*TAU,wave=age*(6.3+phase*2.1)+angle;
    const air=airAt(sampleWind,cell.x+cell.nx*windOffset,cell.y+cell.ny*windOffset,cell.z+cell.nz*windOffset),pressure=air[0]*cell.nx+air[2]*cell.nz;
    const held=.17*Math.max(0,pressure)-pressure,leanX=clamp((air[0]+held*cell.nx)*.22,-.26,.26),leanZ=clamp((air[2]+held*cell.nz)*.22,-.26,.26);
    const strength=heat*(.74+.10*Math.sin(wave*.83)),size=.75+.25*Math.sqrt(heat);
    const pitch=roof&&h>.05?cell.ny/h:0,upX=roof?-cell.nx/(h||1)*pitch:0,upZ=roof?-cell.nz/(h||1)*pitch:0;
    if(wall){
      const b=cell.supportBounds,span=b?Math.max(.10,b.max[1]-b.min[1]):.55;
      for(let i=0;i<3;i++){
        const rise=(i-1)*span*.31+.025*Math.sin(wave+i*2.1),along=.055*Math.sin(angle+i*2.8);
        onFace(cell,tx,tz,heading,along,rise,.061,.245*size,.15*size,.028,leanX*.12,leanZ*.12,i===1?amber:faceHeat,strength*.67);
      }
    }else{
      // Overlap adjacent live support polygons; no lobe can cross the active union.
      for(let i=0;i<3;i++){
        const a=angle+i*TAU/3,along=.075*Math.cos(a),across=.055*Math.sin(a);
        const x=cell.x+tx*along-(tz)*across,z=cell.z+tz*along+tx*across,y=cell.y+(roof?(-cell.nx/(cell.ny||1))*(x-cell.x)+(-cell.nz/(cell.ny||1))*(z-cell.z):0);
        splat(x+cell.nx*.045,y+(ceiling?-.06:.055)+cell.ny*.025,z+cell.nz*.045,.235*size,.045*size,roof?.045:.215*size,upX||leanX*.12,upZ||leanZ*.12,heading,amber,strength*.36);
      }
    }
    // Detailed tongues are sparse; all sources still contribute their lower body.
    if(phase<.46||cell.vent){
      const ripple=Math.sin(wave*1.13),along=.09*Math.cos(angle),rise=wall?.12+.06*ripple:.10+.035*ripple;
      onFace(cell,tx,tz,heading+.2*ripple,along,rise,.069,.033*size,.033*size,.022,leanX,leanZ,hot,heat*(.57+.08*ripple));
      onFace(cell,tx,tz,heading-.16*ripple,along+.023*ripple,rise+.075,.072,.021*size,.025*size,.015,leanX+tx*.11*ripple,leanZ+tz*.11*ripple,tip,heat*.47);
    }
  }

  function flames(cell, age, phase, heat, sampleWind) {
    if(house){houseFlames(cell,age,phase,heat,sampleWind);return;}
    const {x, y, z, nx, ny, nz} = cell;
    const roof = house && cell.part === 'roof';
    const top = house ? cell.part !== 'walls' : ny > .5;
    const broad = house ? cell.part !== 'ground' : Math.abs(nz) > .5;
    const horizontal = house ? Math.hypot(nx, nz) : 0;
    const tx = house ? (horizontal > 1e-5 ? nz / horizontal : 1) : (top ? 1 : nz);
    const tz = house ? (horizontal > 1e-5 ? -nx / horizontal : 0) : -nx;
    const heading = Math.atan2(tz, tx);
    const size = .56 + .44 * Math.sqrt(heat);
    const widthFactor = house ? (broad ? 1.80 : .75) : (Math.abs(nx) > .5 ? .43 : 1);
    const heightFactor = house ? (broad ? (top ? 1.24 : 1.38) : .53) : 1;
    const span = widthFactor * size;
    const height = (.65 + .35 * smoothstep(age, 0, .28)) * size * heightFactor;
    const angle = phase * TAU;
    let anchorCell = cell;
    if (house && broad) {
      // Follow the downhill tangent on a roof pitch or a folding facade.
      const down = roof ? -.10 + .32 * Math.sin(angle + 1.05) : (top ? -.17 : -.25);
      const alongSlope = horizontal > 1e-5 ? ny * down / horizontal : 0;
      surface.x = x - nx * alongSlope;
      surface.z = z - nz * alongSlope;
      // As a burning piece sinks, keep its remaining flame above the rubble.
      surface.y = Math.max(.055, y + horizontal * down);
      surface.nx = nx;
      surface.ny = ny;
      surface.nz = nz;
      anchorCell = surface;
    }
    const wave = angle + age * (7.9 + phase * 3.4);
    const stagger = broad ? (roof ? .137 : .096) * Math.sin(angle) * span : 0;
    const base = house ? (.028 + (broad ? .053 * Math.cos(angle + 1.7) : 0))
      : (top ? .029 : -.145 + (broad ? .069 * Math.cos(angle + 1.7) : 0));
    const stretch = broad ? 1.28 : 1;
    const pinch = broad ? .76 : 1;
    const air = airAt(sampleWind, x + nx * windOffset, y + ny * windOffset, z + nz * windOffset);
    const inward = air[0] * nx + air[2] * nz;
    const held = .17 * Math.max(0, inward) - inward;
    const leanX = clamp((air[0] + held * nx) * .46, -.34, .34);
    const leanZ = clamp((air[2] + held * nz) * .46, -.34, .34);
    const lift = 1 + clamp(air[1] * .20, -.10, .16);

    // The amber underlay carries across rows while the hotter folds stay
    // narrow. Stagger their roots so the bright cores break up the grid.
    const underlay = stagger + .031 * Math.sin(wave) * span;
    if (roof) {
      // Stretch the low flame along the pitch while its short axis stays
      // close to the shingles. The higher folds still rise in world space.
      const incline = ny / Math.max(horizontal, .075);
      const uphillX = horizontal > 1e-5 ? -nx / horizontal * incline : 0;
      const uphillZ = horizontal > 1e-5 ? -nz / horizontal * incline : incline;
      const off = .077 + .013 * Math.cos(wave * .77);
      splat(anchorCell.x + tx * underlay + nx * off, anchorCell.y + ny * off,
        anchorCell.z + tz * underlay + nz * off,
        .174 * span, (.397 + .041 * Math.cos(angle)) * size, .047,
        uphillX, uphillZ, heading, amber, heat * (.56 + .10 * Math.sin(wave * .71)));
    } else {
      onFace(anchorCell, tx, tz, heading, underlay, base + .025, .043,
        (broad ? .108 : .128) * span, .112 * size * stretch * heightFactor, .028,
        leanX * .35, leanZ * .35, amber, heat * (broad ? .57 : .74));
    }

    for (let i = 0; i < 2; i += 1) {
      const ripple = Math.sin(wave + i * 2.6);
      const crest = Math.cos(wave * .82 - i * 2.8 + angle);
      const side = 2 * i - 1;
      const tall = (.52 + .12 * ripple + .055 * side) * height * lift * stretch;
      const anchor = stagger + (side * .104 + .029 * crest) * span;
      const sway = (broad ? .23 : .14) * ripple;
      const curlX = leanX + tx * sway;
      const curlZ = leanZ + tz * sway;
      onFace(anchorCell, tx, tz, heading, anchor, base + .33 * tall, .052,
        (.081 + .009 * crest) * span * pinch, .24 * tall * stretch, .036, curlX, curlZ,
        broad ? faceHeat : hot, heat * (.72 + .12 * crest));
      onFace(anchorCell, tx, tz, heading + .12 * crest, anchor + .058 * ripple * span, base + .75 * tall, .062,
        (.052 + .009 * ripple) * span * pinch, .17 * tall * stretch, .028, curlX, curlZ,
        tip, heat * (.55 + .15 * ripple));
    }

    const roll = Math.sin(wave * 1.41 + angle * .7);
    onFace(anchorCell, tx, tz, heading + .27 * roll, stagger + (.181 + .04 * roll) * span,
      base + (.22 + .051 * roll) * height, .073,
      .044 * span, .066 * height, .026, leanX + tx * .13 * roll, leanZ + tz * .13 * roll,
      amber, heat * (.40 + .10 * roll));
  }

  function smoke(cell, age, phase, strength, sampleWind) {
    const {x, y, z, nx, ny, nz} = cell;
    const large = house && cell.part !== 'ground';
    const roof = house && cell.part === 'roof';
    const plumeScale = cell.preheat ? .84 : roof ? 1.45 : (large ? 1.28 : 1);
    const wallTop = house ? (cell.part === 'walls' ? (cell.wallTopY??cell.supportBounds?.max[1]??y) : 0) : 2;
    for (let puff = 0; puff < 2; puff += 1) {
      const cycle = age / SOOT_LIFETIME + phase + puff * .5;
      const life = cycle - Math.floor(cycle);
      const seconds = life * SOOT_LIFETIME;
      if (seconds > age) continue;

      const fade = smoothstep(life, 0, .17) * (1 - smoothstep(life, .56, 1));
      const air = airAt(sampleWind, x + nx * windOffset,
        y + (house ? ny * windOffset : 0) + .32 + seconds * .43, z + nz * windOffset);
      // Restrict inward motion while the plume is still climbing the face.
      const pressure = air[0] * nx + air[2] * nz;
      const lift = (cell.preheat ? .38 : roof ? 1.08 : (large ? .87 : .70)) + clamp(air[1] * .43, -.19, .37);
      const altitude = y + (cell.preheat?.06:.16) + ny * .085 + lift * seconds;
      const hold = altitude < wallTop ? Math.min(0, pressure) : 0;
      const dx = clamp(air[0] - nx * hold, -1.25, 1.25);
      const dz = clamp(air[2] - nz * hold, -1.25, 1.25);
      const eddy = TAU * phase + puff * 2.7 + age - seconds + 3.2 * life;
      const spread = .063 + .065 * life;
      const offset = .105 + .066 * life;
      splat(x + nx * offset + dx * seconds + Math.cos(eddy) * spread,
        altitude,
        z + nz * offset + dz * seconds + Math.sin(eddy) * spread,
        (.086 + .174 * life) * plumeScale, (.122 + .174 * life) * plumeScale, (.080 + .163 * life) * plumeScale,
        dx * .42, dz * .42, eddy, cell.preheat ? preheatSoot : roof ? roofSoot : soot, strength * (cell.preheat ? .72 : roof ? .63 : .59) * fade, true);
    }
  }

  function update({time, cells, camera, sampleWind}) {
    if (disposed) return;
    activeCells = 0;
    splats.length = 0;
    for (const cell of cells) {
      if (activeCells === maxCells) break;
      supportCell=cell;
      const age = time - cell.ignitionTime;
      if (!Number.isFinite(age) || age < 0) continue;
      const heat = clamp(cell.flame, 0, 1);
      const sootStrength = clamp(cell.smoke, 0, 1);
      if (!(heat > 0 || sootStrength > 0)) continue;
      const phase = cellPhase(cell.id);
      if (heat > 0) flames(cell, age, phase, heat, sampleWind);
      if (sootStrength > 0) smoke(cell, age, phase, sootStrength, sampleWind);
      activeCells += 1;
    }
    supportCell=null;
    batch.update({time, camera, extraSplats: splats});
  }

  function stats() {
    const {flameSplats, smokeSplats} = batch.stats();
    return {activeCells, flameSplats, smokeSplats, maxSplats};
  }

  function dispose() {
    if (disposed) return;
    disposed = true;
    activeCells = 0;
    splats.length = 0;
    batch.dispose();
  }

  return {root, update, stats, dispose,inspect(){return splats.map(s=>({sourceId:s.sourceId,part:s.part,smoke:s.smoke,position:[s.x,s.y,s.z],sigma:[s.sx,s.sy,s.sz],lean:[s.leanX,s.leanZ],alpha:s.alpha,supportY:s.supportY}));}};
}
