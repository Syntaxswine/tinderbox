// The mutant table shared by r10 (run each against the test gate) and r11 (show what a survivor does).
// Every find string must occur exactly once in its file; the checkout is never edited (see hook.mjs).
const S = 'tinderbox/src/', N = '\r\n';
const FIELD = S + 'simulation/field.js', PUB = S + 'simulation/published-obstacles.js', SURF = S + 'simulation/surface-fire.js';
const HOUSE = S + 'simulation/housing-fire.js', FIRE = S + 'art/fire.js', MAP = S + 'ui/map.js';

export const MUTANTS = {
  // --- harness controls ---
  'control-identity': {file: S + 'simulation/combustion.js', find: 'return fuel > 0 && heat >= threshold;', replace: 'return fuel > 0 && heat >= threshold ;'},
  'control-never-ignite': {file: S + 'simulation/combustion.js', find: 'return fuel > 0 && heat >= threshold;', replace: 'return false;'},
  // --- Fix A: dirty marks in the ground field ---
  'A01-pour-not-marked-dirty': {file: FIELD, find: `      this.#dirty.add(index);${N}      if (cell.phase === 'spent')`, replace: `      if (cell.phase === 'spent')`},
  'A02-pool-not-marked-dirty': {file: FIELD, find: `      this.#markCell(cell);${N}    }${N}    this.stats.molotovFuel`, replace: `    }${N}    this.stats.molotovFuel`},
  'A03-direct-heat-not-marked-dirty': {file: FIELD, find: 'if (!Object.is(cell.heat, before)) this.#markCell(cell);', replace: ''},
  'A04-burning-cell-not-marked-dirty': {file: FIELD, find: `        this.#dirty.add(i);${N}        const gas =`, replace: `        const gas =`},
  'A05-heat-only-change-not-marked-dirty': {file: FIELD, find: 'if (!Object.is(cell.heat, preTransfer) || cell.phase !== phase) this.#dirty.add(i);', replace: 'if (cell.phase !== phase) this.#dirty.add(i);'},
  // --- Fix A: the publication comparison ---
  'A06-compare-drops-surfaceFuel': {file: FIELD, find: 'Object.is(old.surfaceFuel, cell.surfaceFuel) && ', replace: ''},
  'A07-compare-drops-intensity': {file: FIELD, find: ` &&${N}          Object.is(old.intensity, cell.intensity)) continue;`, replace: ') continue;'},
  'A08-compare-drops-heat': {file: FIELD, find: 'old.phase === cell.phase && Object.is(old.heat, cell.heat) &&', replace: 'old.phase === cell.phase &&'},
  'A09-compare-drops-depositedFuel': {file: FIELD, find: ' && Object.is(old.depositedFuel, cell.depositedFuel)', replace: ''},
  // --- Fix A: running diagnostics ---
  'A10-remaining-fuel-total-frozen-after-first-publish': {file: FIELD, find: 'if (depositedChanged) {', replace: 'if (depositedChanged && !previous) {'},
  'A11-remaining-fuel-summed-out-of-order': {file: FIELD, find: '[...this.#deposited].sort((a,b) => a-b)', replace: '[...this.#deposited]'},
  'A12-frontX-never-retreats': {file: FIELD, find: 'while (this.#frontColumn >= 0 && !this.#burningColumns[this.#frontColumn]) this.#frontColumn--;', replace: ''},
  'A13-burningCells-never-falls': {file: FIELD, find: 'this.publishedStats.burningCells += change;', replace: 'this.publishedStats.burningCells += Math.max(0, change);'},
  // --- Fix A: obstacle publication ---
  'A14-collider-height-edit-not-republished': {file: PUB, find: 'if (!view || !Object.is(view.height,box.height)) {', replace: 'if (!view) {'},
  'A15-removed-tail-obstacles-stay-published': {file: PUB, find: 'else if (index !== published.length) published = Object.freeze(published.slice(0,index));', replace: ''},
  'A16-obstacle-records-left-mutable': {file: PUB, find: 'sameData(copy,previous) ? previous : freezeData(copy)) : copy;', replace: 'sameData(copy,previous) ? previous : copy) : copy;'},
  // --- Fix A: art and map consumers ---
  'A17-fire-cards-not-rebuilt-on-rewind': {file: FIRE, find: 'if(changed||earlier){', replace: 'if(changed){'},
  'A18-fire-phase-change-not-tracked': {file: FIRE, find: 'for(const i of changes)if(cells[i].phase!==publishedCells[i].phase)trackCell(cells[i],clock);', replace: ''},
  'A19-fire-spent-tail-dropped': {file: FIRE, find: "if(cell.phase==='spent'&&clock-entry.at>=3.2)continue;", replace: "if(cell.phase==='spent')continue;"},
  'A20-ground-texture-trusts-any-change-list': {file: S + 'art/ground-field.js', find: 'const changes=view&&rowMajor&&view.previous===previousCells?view.changes:null;', replace: 'const changes=view&&rowMajor?view.changes:null;'},
  'A21-firelight-ignores-cell-size-change': {file: S + 'art/street-firelight.js', find: 'if (view && terrainCells === cells && terrainSize === size) return cachedTerrain;', replace: 'if (view && terrainCells === cells) return cachedTerrain;'},
  'A22-trail-ignores-player-movement': {file: S + 'art/cell-publication.js', find: 'if (view && previous === cells && x === player.x && y === player.y) return trail;', replace: 'if (view && previous === cells) return trail;'},
  'A23-map-cell-going-out-not-redrawn': {file: MAP, find: 'if (burningByIndex.delete(index)) changed = true;', replace: 'burningByIndex.delete(index);'},
  'A24-map-ignores-cell-size-change': {file: MAP, find: 'if (cells !== frozenCells || map.cellSize !== lastCellSize) {', replace: 'if (cells !== frozenCells) {'},
  'A25-map-keeps-box-of-moved-cell': {file: MAP, find: 'if (burningByIndex.has(index) && previousCell.x === cell.x && previousCell.y === cell.y) continue;', replace: 'if (burningByIndex.has(index)) continue;'},
  // --- Fix B: ground <-> structure contact ---
  'B01-contact-coupling-halved': {file: SURF, find: 'coupling:coupling*run.length/.5', replace: 'coupling:coupling*run.length'},
  'B02-porch-and-stairs-fronts-dropped': {file: HOUSE, find: '    groundSites.push({site,fronts});', replace: ''},
  'B03-porch-post-front-dropped': {file: HOUSE, find: '  if(porchPost){', replace: '  if(false){'},
  'B04-collapsed-section-still-takes-ground-heat': {file: SURF, find: 'if (supported && !supported(support) || !lineClear(cell,edge,obstacles)) continue;', replace: 'if (!lineClear(cell,edge,obstacles)) continue;'},
  'B05-collapsed-section-still-lights-ground': {file: SURF, find: 'if (supported && !supported(support)) continue;', replace: ''},
  'B06-masonry-no-longer-blocks-ground-heat': {file: SURF, find: 'if (supported && !supported(support) || !lineClear(cell,edge,obstacles)) continue;', replace: 'if (supported && !supported(support)) continue;'},
  'B07-flamethrower-porch-reach-reverted': {file: S + 'simulation/tools.js', find: "const height = box.role === 'porch' ? box.height : box.role === 'stairs' ? box.height / 2 : ray.h;", replace: 'const height = ray.h;'},
  'B08-ashland-frontage-half-span': {file: S + 'simulation/cottage-fire.js', find: 'span:1}])', replace: 'span:.5}])'},
  'B09-burning-house-heats-ground-at-half-rate': {file: SURF, find: 'if (field.seed(edge,[cell],dt*coupling*field.heatOutput(site.fuel.material),cause).cells.length) break;', replace: 'if (field.seed(edge,[cell],dt*coupling*.5*field.heatOutput(site.fuel.material),cause).cells.length) break;'},
  'B10-far-band-moved-half-a-metre-out': {file: SURF, find: 'const contacts = [[.38, .024], [.84, .018]];', replace: 'const contacts = [[.38, .024], [1.34, .018]];'},
  'B11-porch-deck-takes-no-heat-from-its-sides': {file: HOUSE, find: '{x:x-width/2,z,nx:-1,nz:0,span:depth}, {x:x+width/2,z,nx:1,nz:0,span:depth},', replace: ''},
  'B12-ashland-ground-contact-ignores-cover': {file: SURF, find: "if (supported && !supported(support) || !lineClear(cell,edge,obstacles)) continue;", replace: "if (supported && (!supported(support) || !lineClear(cell,edge,obstacles))) continue;"}
};
