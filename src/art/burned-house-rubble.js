import {HOUSING_PLANS} from '../content/housing-plans.js';
import {housingSectionAt,housingSectionGrid,RUBBLE_BURN_SECONDS} from '../content/housing-sections.js';
import {createHousingSectionMask} from './housing-section-mask.js';
import {Resources, clamp, hash, seedOf} from './resources.js';

export {RUBBLE_BURN_SECONDS};
const EMBER_BED = [[.24, .25], [.70, .22], [.47, .53], [.23, .74], [.74, .73]];
// Irregular timber with a split point at each end. Coordinates are in the
// piece's own length and width, so rotating the lot does not stretch any piece.
const SPLINTER = [[-.50,-.38],[-.36,-.50],[.38,-.46],[.50,-.22],[.37,-.03],
  [.47,.24],[.28,.48],[-.42,.50],[-.50,.23],[-.38,.04]];
const BRICK = [[-.49,-.48],[.34,-.50],[.50,-.29],[.47,.43],[-.40,.50],[-.50,.22]];

function buildPile(T, plan, id, material, grid) {
  const {width, depth} = plan;
  let randomIndex = seedOf(id) * 10000;
  const random = () => hash(++randomIndex);
  const between = (a, b) => a + (b - a) * random();
  const solid = {position: [], color: []}, coals = {position: [], color: []};
  const shade = new T.Color();
  function face(batch, a, b, c, color, variation = 1) {
    batch.position.push(...a, ...b, ...c);
    shade.setHex(color).multiplyScalar(variation);
    for (let i = 0; i < 3; i++) batch.color.push(shade.r, shade.g, shade.b);
  }

  function fragment({x, z, y, length, breadth, thickness, yaw, pitch, stone}) {
    const outline = stone ? BRICK : SPLINTER;
    const c = Math.cos(yaw), s = Math.sin(yaw);
    const marginX = (Math.abs(c) * length + Math.abs(s) * breadth) / 2 + .025;
    const marginZ = (Math.abs(s) * length + Math.abs(c) * breadth) / 2 + .025;
    x = clamp(x, marginX, width - marginX);
    z = clamp(z, marginZ, depth - marginZ);
    const variation = between(.68, 1.30);
    const topColor = stone ? [0x513b35, 0x66493d, 0x745044][Math.floor(random() * 3)]
      : [0x352d29, 0x413733, 0x2b2725, 0x4d4037][Math.floor(random() * 4)];
    const sideColor = stone ? 0x4e3934 : 0x292525;
    const endColor = stone ? 0x76574b : 0x5d4940;
    const bottom = [], top = [];
    for (const [u, v] of outline) {
      const along = u * length, across = v * breadth;
      const px = x + c * along - s * across, pz = z + s * along + c * across;
      const height = y + along * pitch;
      bottom.push([px, height, pz]);
      top.push([px, height + thickness * between(.82, 1.16), pz]);
    }
    for (let i = 0; i < top.length; i++) {
      const next = (i + 1) % top.length;
      const end = Math.abs(outline[i][0]) > .32 && Math.abs(outline[next][0]) > .32 &&
        Math.sign(outline[i][0]) === Math.sign(outline[next][0]);
      face(solid, [x, y + thickness, z], top[next], top[i], topColor, variation);
      face(solid, bottom[i], top[i], top[next], end ? endColor : sideColor, variation);
      face(solid, bottom[i], top[next], bottom[next], end ? endColor : sideColor, variation);
    }
  }

  // A continuous ash print ties the hot pockets back to one collapsed house.
  // Interrupted sill pieces still pick out the main axes of the native lot.
  const ashEdge = [[.045,.16],[.10,.07],[.25,.10],[.43,.045],[.66,.084],[.86,.048],[.955,.135],
    [.927,.34],[.978,.54],[.926,.73],[.952,.91],[.79,.959],[.59,.917],[.40,.966],
    [.20,.933],[.066,.884],[.084,.70],[.034,.52],[.079,.34]];
  const rim = [], coalFloor = [];
  for (const [u, v] of ashEdge) {
    const x = (u + between(-.015,.015)) * width, z = (v + between(-.016,.016)) * depth;
    rim.push([x, .003, z]);
    coalFloor.push([x * .79 + width * .105, between(.020,.035), z * .79 + depth * .105]);
  }
  for (let i = 0; i < rim.length; i++) {
    const j = (i + 1) % rim.length;
    face(solid, [width * .5, .035, depth * .5], coalFloor[j], coalFloor[i], 0x292523, between(.86,1.16));
    face(solid, coalFloor[i], coalFloor[j], rim[j], 0x37302a, between(.78,1.16));
    face(solid, coalFloor[i], rim[j], rim[i], 0x34302a, between(.81,1.19));
  }

  const pockets = EMBER_BED.map(([u, v], i) => {
    const x = (u + between(-.045, .045)) * width;
    const z = (v + between(-.050, .050)) * depth;
    const rx = Math.min(x, width - x, between(1.30, 2.05));
    const rz = Math.min(z, depth - z, between(1.05, 1.72));
    const crest = between(.115, .24), phase = random(), flameSeconds = between(13, 19);
    const outer = [], inner = [];
    for (let j = 0; j < 11; j++) {
      const angle = j * Math.PI * 2 / 11;
      const r = between(.70, 1);
      const dx = Math.cos(angle) * rx * r, dz = Math.sin(angle) * rz * r;
      outer.push([x + dx, .012, z + dz]);
      inner.push([x + dx * .54, crest * between(.58, .90), z + dz * .54]);
    }
    for (let j = 0; j < outer.length; j++) {
      const k = (j + 1) % outer.length;
      face(solid, [x, crest, z], inner[k], inner[j], 0x383331, between(.75, 1.38));
      face(solid, inner[j], inner[k], outer[k], 0x292525, between(.72, 1.21));
      face(solid, inner[j], outer[k], outer[j], 0x302925, between(.72, 1.21));
    }

    // Narrow, broken surfaces between the boards, each with a dim outer edge.
    for (let j = 0; j < 9; j++) {
      const dx = between(-.41, .41), dz = between(-.32, .32);
      const cy = crest + between(.024, .075);
      const length = between(.045, .18), spread = between(.018, .069);
      const a = [x + dx - length, cy, z + dz], b = [x + dx + length, cy, z + dz + .025];
      const c = [x + dx, cy + .015, z + dz - spread], d = [x + dx - .02, cy, z + dz + spread];
      face(coals, a, c, b, j % 3 ? 0xc83d15 : 0xff7c30, between(.52, 1));
      face(coals, a, b, d, 0x6f2313, between(.70, 1));
    }
    return {id: id + ':coals:' + i, x, y: crest + .075, z, rx, rz, crest, phase, flameSeconds, buildingId: id, area: .24};
  });

  const count = Math.round(clamp(width * depth * 1.08, 42, 96));
  for (let i = 0; i < count; i++) {
    const bed = pockets[i % pockets.length], heavy = i < 17;
    const length = heavy ? between(1.06, 2.15) : between(.28, 1.24);
    const pitch = between(-.13, .13);
    const x = bed.x + between(-.87, .87) * bed.rx, z = bed.z + between(-.83, .83) * bed.rz;
    const nearCrest = clamp(1 - Math.hypot((x - bed.x) / bed.rx, (z - bed.z) / bed.rz));
    fragment({x, z, y: Math.max(.021 + Math.abs(pitch) * length / 2, bed.crest * nearCrest + between(.04, .21)),
      length, breadth: heavy ? between(.11, .28) : between(.07, .25),
      thickness: heavy ? between(.11, .25) : between(.038, .12),
      yaw: (i % 2) * Math.PI / 2 + between(-.57, .57), pitch, stone: false});
  }
  for (const [u, v, yaw] of [[.21,.13,0],[.65,.135,.11],[.82,.31,Math.PI/2],
    [.15,.51,Math.PI/2],[.18,.82,0],[.50,.84,-.12],[.78,.86,.17]]) {
    fragment({x:u*width,z:v*depth,y:.033,length:between(.90,1.85),breadth:between(.13,.21),
      thickness:between(.087,.15),yaw,pitch:between(-.025,.025),stone:false});
  }
  for (let i = 0; i < 27; i++) {
    fragment({x:between(.11,.90)*width,z:between(.105,.91)*depth,y:between(.031,.064),
      length:between(.16,.66),breadth:between(.047,.14),thickness:between(.036,.10),
      yaw:between(0,Math.PI),pitch:between(-.07,.07),stone:i%6===0});
  }
  for (let i = 0; i < 21; i++) {
    const rear = pockets[4], length = between(.15, .46), pitch = between(-.26, .26);
    fragment({x: rear.x + between(-1.14, .83), z: rear.z + between(-.80, .82),
      y: .025 + Math.abs(pitch) * length / 2 + between(.04, .23), length,
      breadth: between(.085, .27), thickness: between(.068, .16), yaw: between(0, Math.PI), pitch, stone: true});
  }

  if (grid) {
    const {cols, rows, metres} = grid;
    const occupied = new Set(pockets.map(pocket => housingSectionAt(grid, pocket.x, pocket.z)));
    for (let index = 0; index < cols * rows; index++) {
      if (occupied.has(index)) continue;
      // Keep some small crevices in every native cell, even when the
      // artist's five larger coal pockets happen to lie in other cells.
      const x0 = index % cols * metres, z0 = Math.floor(index / cols) * metres;
      const x = x0 + (Math.min(width, x0 + metres) - x0) * between(.37, .63);
      const z = z0 + (Math.min(depth, z0 + metres) - z0) * between(.38, .62);
      const y = .105;
      for (let n = 0; n < 3; n++) {
        const cx = x + between(-.17, .17), cz = z + between(-.14, .14);
        face(coals, [cx-.10,y,cz], [cx,y+.01,cz+.044], [cx+.09,y,cz+.022], 0xc83d15, between(.55, .95));
      }
      pockets.push({id:id+':coals:section:'+index,x,y:y+.02,z,phase:random(),flameSeconds:between(13,19),buildingId:id,area:.19});
    }
  }

  function mesh(batch, material) {
    const geometry = new T.BufferGeometry();
    geometry.setAttribute('position', new T.Float32BufferAttribute(batch.position, 3));
    geometry.setAttribute('color', new T.Float32BufferAttribute(batch.color, 3));
    geometry.computeVertexNormals();
    return new T.Mesh(geometry, material);
  }
  const root = new T.Group();
  root.name = 'Collapsed house: ' + id;
  const rubble = mesh(solid, material);
  rubble.name = 'Splintered joists, ash and fallen chimney';
  rubble.castShadow = rubble.receiveShadow = true;
  const glow = mesh(coals, new T.MeshBasicMaterial({
    vertexColors: true, side: T.DoubleSide, transparent: true, opacity: 0, depthWrite: false, blending: T.AdditiveBlending
  }));
  glow.name = 'Glowing crevices between the timber';
  glow.renderOrder = 2;
  root.add(rubble, glow);
  return {root, rubble, glow, pockets, retiredAt: null};
}

export function createBurnedHouseRubble(T) {
  const root = new T.Group(), pool = new Resources(), lots = new Map();
  root.name = 'House burnout aftermath';
  const material = pool.material(new T.MeshStandardMaterial({vertexColors: true, roughness: .97}));
  let previous = new Set(), lastTime = -Infinity, lastTick = -1, generation, disposed = false;

  function remove(record) {
    record.root.removeFromParent();
    record.rubble.geometry.dispose();
    record.glow.geometry.dispose();
    record.glow.material.dispose();
    record.mask?.dispose();
    if (record.mask) record.rubble.material.dispose();
  }

  function update(snapshot, time) {
    if (disposed) return [];
    if (time < lastTime || snapshot.tick < lastTick || snapshot.diagnostics?.generation !== generation) {
      for (const record of lots.values()) remove(record);
      lots.clear();
      previous.clear();
    }
    lastTime = time;
    lastTick = snapshot.tick;
    generation = snapshot.diagnostics?.generation;
    const active = new Set(), standing = new Set(), sites = [];
    const sectional = snapshot.world.rubble;
    const byBuilding = new Map(sectional?.map(lot => [lot.buildingId, lot]));
    for (const building of snapshot.world.buildings || []) {
      const sectionLot = byBuilding.get(building.id);
      if (!sectionLot && (sectional || !building.destroyed)) {
        standing.add(building.id);
        continue;
      }
      const {id, prefabId, x, y, quarterTurns} = building, plan = HOUSING_PLANS[prefabId];
      if (!plan) continue;
      active.add(id);
      let record = lots.get(id);
      if (!record) {
        const grid = sectionLot && housingSectionGrid(prefabId, sectionLot.metres);
        record = buildPile(T, plan, id, grid ? material.clone() : material, grid);
        record.root.position.set(x, 0, y);
        record.root.rotation.y = -quarterTurns * Math.PI / 2;
        root.add(record.root);
        record.root.updateMatrixWorld(true);
        if (grid) {
          record.mask = createHousingSectionMask(T, record.root, prefabId, {metres:grid.metres, glowMaterial:record.glow.material});
          record.sections = Array.from({length:grid.cols*grid.rows}, (_,index)=>({index,present:false,glow:0,age:0,heat:0}));
        }
        for (const pocket of record.pockets) {
          if (grid) pocket.section = housingSectionAt(grid, pocket.x, pocket.z);
          const point = record.root.localToWorld(new T.Vector3(pocket.x, pocket.y, pocket.z));
          Object.assign(pocket, {x: point.x, y: point.y, z: point.z});
        }
        const cottage = snapshot.cottageFire?.buildings.find(item => item.id === id);
        const burnout = snapshot.events?.findLast(event => event.type === 'building-burnout' && event.buildingId === id);
        const retiredAt = cottage?.retiredAt ?? burnout?.worldTime;
        // A restored ruin with no dated transition starts cold. A live to
        // destroyed edge covers older snapshots without a timed event.
        record.retiredAt = sectionLot?.sections[0]?.retiredAt ?? (Number.isFinite(retiredAt) && retiredAt <= time ? retiredAt : previous.has(id) ? time : null);
        lots.set(id, record);
      }
      const age = record.retiredAt === null ? RUBBLE_BURN_SECONDS : Math.max(0, time - record.retiredAt);
      const flutterGlow = .70 + .11 * Math.sin(time * 4.2 + seedOf(id) * 16);
      let remaining = clamp(1 - age / RUBBLE_BURN_SECONDS);
      if (sectionLot) {
        for (const {index, retiredAt, retainedHeat} of sectionLot.sections) {
          const section = record.sections[index], age = Math.max(0, time - retiredAt);
          const left = clamp(1 - age / RUBBLE_BURN_SECONDS);
          Object.assign(section, {present:true, age, heat:retainedHeat, glow:retainedHeat * left ** 1.35});
        }
        record.mask.update(record.sections);
        record.glow.visible = record.sections.some(section => section.glow > 0);
        record.glow.material.opacity = flutterGlow;
      } else {
        record.glow.visible = remaining > 0;
        record.glow.material.opacity = remaining ** 1.35 * flutterGlow;
      }
      if (!record.glow.visible) continue;
      for (const pocket of record.pockets) {
        const section = record.sections?.[pocket.section], ageInSection = section?.age ?? age;
        const heat = section?.heat ?? 1;
        remaining = clamp(1 - ageInSection / RUBBLE_BURN_SECONDS);
        if (!remaining || !heat) continue;
        const {phase, flameSeconds} = pocket;
        const flutter = .73 + .27 * Math.sin(time * (4 + phase * 2) + phase * 34);
        const flame = heat * clamp(1 - ageInSection / flameSeconds) ** .82 * flutter;
        sites.push({...pocket, flame, smoke: heat * remaining ** .9, glow: heat * remaining * flutter});
      }
    }
    for (const [id, record] of lots) if (!active.has(id)) {
      remove(record);
      lots.delete(id);
    }
    previous = standing;
    return sites;
  }

  return {root, update, diagnostics: () => [...lots].map(([id, record]) => ({
    id, retiredAt: record.retiredAt, glowing: record.glow.visible,
    ...(record.sections ? {sections:record.sections.filter(section => section.present).map(({index,glow}) => ({index,glow}))} : {}),
    triangles: (record.rubble.geometry.attributes.position.count + record.glow.geometry.attributes.position.count) / 3
  })), dispose() {
    if (disposed) return;
    disposed = true;
    for (const record of lots.values()) remove(record);
    lots.clear();
    previous.clear();
    root.removeFromParent();
    pool.dispose();
  }};
}
