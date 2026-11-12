// Round 3 mutant table: small in-memory edits of lines added between 26931d9 and c855e62.
// Every find string must occur exactly once in its file; the checkout is never edited (see hook.mjs).
// The file suffix starts at the worktree name so a control tree loaded in the same process is never patched.
const S = 'tinderbox/src/';
const TOPO = S + 'simulation/housing-topology.js', HOUSE = S + 'simulation/housing-fire.js', VOL = S + 'simulation/housing-heat-volumes.js';
const GEO = S + 'simulation/geometry.js', TOOLS = S + 'simulation/tools.js', DIS = S + 'simulation/discharge.js';
const FLOORS = S + 'content/housing-floors.js', MAP = S + 'ui/map.js', SHROUD = S + 'reuse/ashland/wall-shroud.js';
const COTTAGE = S + 'simulation/cottage-fire.js', CTOPO = S + 'simulation/cottage-topology.js';

export const MUTANTS = {
  // --- harness controls ---
  'control-identity': {file: S + 'simulation/combustion.js', find: 'return fuel > 0 && heat >= threshold;', replace: 'return fuel > 0 && heat >= threshold ;'},
  'control-never-ignite': {file: S + 'simulation/combustion.js', find: 'return fuel > 0 && heat >= threshold;', replace: 'return false;'},

  // --- porch deck sections (housing-topology.js deckPieces and its links) ---
  'D01-deck-is-one-piece-again': {file: TOPO, find: 'const count = Math.ceil(alongX ? width : depth);', replace: 'const count = 1;'},
  'D02-cut-edges-exchange-ground-heat': {file: TOPO, find: 'if (!alongX || index === 0) fronts.push({x: cx - w / 2, z: cz, nx: -1, nz: 0, span: d});', replace: 'fronts.push({x: cx - w / 2, z: cz, nx: -1, nz: 0, span: d});'},
  'D03-last-section-has-no-end-edge': {file: TOPO, find: 'if (!alongX || index === count - 1) fronts.push({x: cx + w / 2, z: cz, nx: 1, nz: 0, span: d});', replace: 'if (!alongX) fronts.push({x: cx + w / 2, z: cz, nx: 1, nz: 0, span: d});'},
  'D04-deck-sections-not-linked': {file: TOPO, find: 'for (let index = 1; index < pieces.length; index++) link(pieces[index - 1], pieces[index]);', replace: ''},
  'D05-stairs-not-linked-to-deck': {file: TOPO, find: 'if (stairs.length) link(stairs.at(-1), nearest(stairs.at(-1), deck));', replace: ''},
  'D06-entry-door-not-linked-to-deck': {file: TOPO, find: 'if (entry?.low) link(nearest(entry, deck), entry.low);', replace: ''},
  'D07-stair-sample-at-full-height': {file: TOPO, find: 'const y = stairs ? height * (1 + Math.floor((index + .5) * steps / count)) / steps : height;', replace: 'const y = height;'},
  'D08-post-linked-to-far-deck-end': {file: TOPO, find: 'postDeck = nearest(position, deck);', replace: 'postDeck = deck.at(-1);'},
  'D09-each-section-claims-whole-deck-area': {file: TOPO, find: 'return {id, x: cx, y, z: cz, area: w * d, fronts};', replace: 'return {id, x: cx, y, z: cz, area: width * depth, fronts};'},
  'D10-deck-front-edge-dropped': {file: TOPO, find: 'if (alongX || index === 0) fronts.push({x: cx, z: cz - d / 2, nx: 0, nz: -1, span: w});', replace: 'if (!alongX && index === 0) fronts.push({x: cx, z: cz - d / 2, nx: 0, nz: -1, span: w});'},

  // --- tool strikes on decks and setback walls (housing-fire.js) ---
  'F01-deck-strike-always-first-section': {file: HOUSE, find: 'const site=pieces?.reduce((best,piece)=>!best||distance(piece)<distance(best)?piece:best,null);', replace: 'const site=pieces?.[0];'},
  'F02-post-or-rail-hit-heats-deck': {file: HOUSE, find: "if(contact.volume&&contact.volume.surface!=='deck')return null;", replace: ''},
  'F03-plinth-or-slab-hit-may-heat-wall': {file: HOUSE, find: "if(native&&native!=='wall'&&native!=='rim')return null;", replace: ''},
  'F04-rim-hit-heats-wall-half-metre-back': {file: HOUSE, find: "gap > (native==='rim'?.011:EPS)", replace: "gap > (native==='rim'?.5:EPS)"},
  'F05-contact-need-not-be-on-wall-face': {file: HOUSE, find: "if(native&&(gap < -EPS || gap > (native==='rim'?.011:EPS)))continue;", replace: ''},
  'F06-fragments-keep-whole-house-volumes': {file: HOUSE, find: 'attachCatalogueHeatVolumes(box,building,heatVolumes,section.bounds);', replace: 'attachCatalogueHeatVolumes(box,building,heatVolumes);'},
  'F07-rim-hit-picks-band-by-height': {file: HOUSE, find: "if(to.h!==undefined&&native!=='rim'){", replace: 'if(to.h!==undefined){'},

  // --- authored tool blockers (housing-heat-volumes.js) ---
  'H01-no-wall-blockers': {file: VOL, find: "add(wallStrip(run, scale.wallThickness / 2), base, base + scale.wallHeight, 'wall');", replace: ''},
  'H02-plinth-is-a-full-height-block': {file: VOL, find: "add(rectangle(0, 0, plan.width, plan.depth), 0, plan.plinth - scale.slab, 'plinth');", replace: "add(rectangle(0, 0, plan.width, plan.depth), 0, plan.plinth + 4, 'plinth');"},
  'H03-only-hopkins-9-has-volumes': {file: VOL, find: "prefabId === 'hopkins-4-09' || prefabId === 'hopkins-4-13'", replace: "prefabId === 'hopkins-4-09'"},
  'H04-no-posts-rails-balusters': {file: VOL, find: "porch.push({vertices: rectangle(x0, z0, x1, z1), bottom, top, surface: 'porch-cover'});", replace: ''},
  'H05-collapse-does-not-clip-volumes': {file: VOL, find: 'const local = clipConvexPolygon(volume.vertices, clips);', replace: 'const local = volume.vertices;'},
  'H06-every-stair-tread-full-height': {file: VOL, find: "bottom: 0, top: y * (index + 1) / count, surface: 'deck'});", replace: "bottom: 0, top: y, surface: 'deck'});"},
  'H07-no-floor-rim': {file: VOL, find: "add(wallStrip(run, .09), base - scale.slab, base, 'rim');", replace: ''},
  'H08-no-floor-slabs': {file: VOL, find: "add(slab, base - scale.slab, base, 'slab');", replace: ''},
  'H09-walls-twice-as-thick': {file: VOL, find: "add(wallStrip(run, scale.wallThickness / 2), base, base + scale.wallHeight, 'wall');", replace: "add(wallStrip(run, scale.wallThickness), base, base + scale.wallHeight, 'wall');"},

  // --- geometry queries (geometry.js) ---
  'G01-shapes-tested-as-bounding-boxes': {file: GEO, find: 'if (isElevatedBlocker(o)) for (const [nx, ny, k] of o.planes) {', replace: 'if (false) for (const [nx, ny, k] of o.planes) {'},
  'G02-blocker-bottom-ignored': {file: GEO, find: 'const a = (bottom - from) / delta, b = (top - from) / delta;', replace: 'const a = (0 - from) / delta, b = (top - from) / delta;'},
  'G03-lantern-stops-on-not-before-surface': {file: GEO, find: 'first = {t, travel: Math.max(0, t - .002), box: elevated ? box.owner : box, volume: elevated ? box : null};', replace: 'first = {t, travel: t, box: elevated ? box.owner : box, volume: elevated ? box : null};'},
  'G04-heat-contact-takes-any-not-first': {file: GEO, find: 'if (!interval || interval[1] <= 1e-8 || first && interval[0] >= first.t) continue;', replace: 'if (!interval || interval[1] <= 1e-8) continue;'},
  'G05-level-flight-ignores-blocker-height': {file: GEO, find: 'if (Math.abs(delta) < 1e-8) return from >= bottom && from <= top ? span : null;', replace: 'if (Math.abs(delta) < 1e-8) return span;'},

  // --- tool code (tools.js, discharge.js) ---
  'T01-flush-wall-pool-not-moved-out': {file: TOOLS, find: 'if (margin < 0 || margin > .011) return position;', replace: 'return position;'},
  'T02-flame-never-reaches-low-deck': {file: TOOLS, find: "if (contact?.volume?.surface === 'deck') {", replace: 'if (false) {'},
  'T03-flame-end-height-always-drops': {file: TOOLS, find: 'const endHeight = elevatedBlockers(box) ? ray.h : Math.min(ray.h, height);', replace: 'const endHeight = Math.min(ray.h, height);'},
  'T04-lantern-volume-hit-also-asks-cottages': {file: TOOLS, find: "if (!impact?.volume) surfaceHit = cottages?.heatSurface(", replace: 'surfaceHit = cottages?.heatSurface('},
  'T05-deck-search-range-zero': {file: TOOLS, find: 'if (distance(from, box) > discharge.range + Math.hypot(box.width, box.depth) / 2) continue;', replace: 'if (distance(from, box) > Math.hypot(box.width, box.depth) / 2) continue;'},
  'X01-flamethrower-fan-uses-coarse-boxes': {file: DIS, find: "world, state.obstacles, tool === 'flamethrower');", replace: 'world, state.obstacles, false);'},
  'X02-fan-ignores-blocker-height': {file: DIS, find: 'if (origin.h >= shape.bottom && origin.h <= shape.top && solidDistance(origin, shape) <= reach) blockers.push(shape);', replace: 'if (solidDistance(origin, shape) <= reach) blockers.push(shape);'},
  'X03-corner-trim-uses-box-distance': {file: DIS, find: 'if (!isElevatedBlocker(box)) return boxDistance;', replace: 'return boxDistance;'},

  // --- floor support and links (housing-floors.js, housing-topology.js, wall-shroud.js, cottage) ---
  'P01-stair-opening-not-cut': {file: FLOORS, find: 'if (shaft && x > shaft.x && x < shaft.x + 1 && z > shaft.z && z < shaft.z + 3) return;', replace: ''},
  'P02-floor-patches-not-linked': {file: TOPO, find: 'for (const [patch, site] of deck) for (const neighbor of patch.neighbors) link(site, deck.get(neighbor));', replace: ''},
  'P03-walls-not-linked-to-floor': {file: TOPO, find: 'link(panel.low, nearest(panel.low, touching.map(patch => deck.get(patch))), {gain: 1.65});', replace: ''},
  'P04-stairs-carry-no-fire-up': {file: TOPO, find: 'link(lower.get(lowerPatch), nearest(landing, candidates.map(patch => upper.get(patch))), {gain: 1.4});', replace: ''},
  'P05-every-patch-area-four': {file: TOPO, find: "nx: 0, ny: 1, nz: 0, area, floorRadius, exposed: false}, 'floor');", replace: "nx: 0, ny: 1, nz: 0, area: 4, floorRadius, exposed: false}, 'floor');"},
  'P06-flame-radius-doubled': {file: FLOORS, find: 'return {x: point[0], z: point[1], area, floorRadius: radius - EPS};', replace: 'return {x: point[0], z: point[1], area, floorRadius: radius * 2};'},
  'P07-floor-fuel-14cm-above-oak': {file: FLOORS, find: 'const patch = {section: triangle.section, y: plan.plinth + level * ASSET_SCALE.floorSpacing,', replace: 'const patch = {section: triangle.section, y: plan.plinth + level * ASSET_SCALE.floorSpacing + .14,'},
  'P08-one-patch-spans-sections': {file: FLOORS, find: 'for (const {triangles: [a, b]} of uses.values()) if (b && a.section === b.section) {', replace: 'for (const {triangles: [a, b]} of uses.values()) if (b) {'},
  'P09-shroud-not-fitted-to-patch': {file: SHROUD, find: 'const fit = Math.min(1, cell.floorRadius / (Math.hypot(dx, dz) + spread));', replace: 'const fit = 1;'},
  'P10-ashland-debris-lands-at-zero': {file: COTTAGE, find: 'const floor=receiver?.y??0;', replace: 'const floor=0;'},
  'P11-any-collinear-edge-borders': {file: FLOORS, find: 'return Math.min(length, Math.max(u, v)) - Math.max(0, Math.min(u, v)) > EPS;', replace: 'return true;'},
  'P12-nearest-helper-picks-farthest': {file: TOPO, find: '!best || planar(point, site) < planar(point, best) ? site : best, null);', replace: '!best || planar(point, site) > planar(point, best) ? site : best, null);'},
  'P13-anchor-is-first-triangle': {file: FLOORS, find: 'if (clearance > radius + EPS) { point = candidate; radius = clearance; }', replace: 'if (!point) { point = candidate; radius = clearance; }'},
  'P14-ashland-floor-radius-dropped': {file: CTOPO, find: 'if(floor)geometry.floorRadius=floor.floorRadius;', replace: ''},
  'P15-stair-foot-anywhere-on-lower-floor': {file: TOPO, find: 'const lowerPatch = [...lower.keys()].find(patch => floorPatchContains(patch, foot));', replace: 'const lowerPatch = [...lower.keys()][0];'},

  // --- ground plan record check (ui/map.js) ---
  'M01-mutable-cell-not-detected-in-frozen-list': {file: MAP, find: 'if (!Object.isFrozen(cell)) {', replace: 'if (false) {'},
  'M02-frozen-list-trusted-without-record-check': {file: MAP, find: 'if (records.every(Object.isFrozen)) return true;', replace: 'return true;'},
  'M03-mutable-list-not-remembered': {file: MAP, find: 'listsWithMutableRecords.add(cells);', replace: ''},

  // --- the three old survivors recorded by earlier rounds, as reconstructed by this reviewer (old code, not new) ---
  'K01-burning-ground-cell-holds-no-heat': {file: S + 'simulation/field.js', find: 'cell.heat = Math.max(cell.heat, fire.burnHeat);', replace: ''},
  'K02-thrown-lantern-always-hits-low-band': {file: HOUSE, find: 'else if(height>ASSET_SCALE.wallHeight/2)site=panel.high;', replace: ''},
  'K03-house-fire-ignores-powder-clock': {file: S + 'simulation/index.js', find: 'for(const lot of housing?.values()??[])lot.step(worldDelta,state.clocks.world,event);', replace: 'for(const lot of housing?.values()??[])lot.step(config.step,state.clocks.active,event);'},
  'K03b-house-heat-step-ignores-powder-scale': {file: S + 'simulation/index.js', find: 'for(const lot of housing?.values()??[])lot.step(worldDelta,state.clocks.world,event);', replace: 'for(const lot of housing?.values()??[])lot.step(config.step,state.clocks.world,event);'}
};
