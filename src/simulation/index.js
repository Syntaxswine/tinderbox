import {configuration, TOOLS, DRUGS} from './config.js';
import {scenarioDefinition} from './fixtures.js';
import {HeatField, materialAt} from './field.js';
import {clamp, normalized, movementVector, moveDisc, distance, lineClear, freePoint} from './geometry.js';
import {aimHeading, discreteTool, heldTool, projectilesStep, ageTorch} from './tools.js';
import {inactiveDischarge} from './discharge.js';
import {adjustLanternAim, cancelLanternAim, refreshLanternPreview} from './lantern.js';
import {CHARACTER_PROFILES} from '../content/characters.js';
import {pickupContacts} from './pickups.js';
import {COTTAGE_IDS} from '../content/cottage-pair.js';
import {createCottageFire,prepareCottageFootprints} from './cottage-fire.js';
import {createHousingFire,prepareHousingFootprints} from './housing-fire.js';
export {DEFAULT_CONFIG, TOOLS, DRUGS} from './config.js';
export {SCENARIOS} from './fixtures.js';
export {movementVector, worldToStick} from './geometry.js';
const EPS = 1e-9;
export function createSimulation({seed = 1947, scenario, config: override,characterId='bear',cottageWind} = {}) {
  const profile=CHARACTER_PROFILES[characterId];if(!profile)throw Error('Unknown player character');
  const config = configuration(characterId==='bear'?override:{...override,player:{...override?.player,radius:profile.radius}}), definition = scenarioDefinition(scenario);
  if (!Number.isSafeInteger(seed)) throw Error('Seed must be a safe integer');
  const playableCottages=definition.id==='cottage-pair';
  const catalogue=playableCottages||definition.id==='neighborhood';
  if(playableCottages)prepareCottageFootprints(definition);
  if(catalogue)prepareHousingFootprints(definition,playableCottages?COTTAGE_IDS:[]);
  let state, field, buildingFuel, housing, cottages, accumulator = 0, disposed = false, commands = [], commandSequence = 0, eventId = 0, generation = -1;
  let droppedRealSeconds = 0, lastSteps = 0;
  function event(type, point = state.player, extra = {}) {
    const record = {id: ++eventId, tick: state.tick, type, x: point.x, y: point.y, ...extra};
    state.events.push(record); if (state.events.length > config.events.capacity) state.events.shift();
    return record;
  }
  function clearInput(reason) {
    const pouring = state.player.pouring;
    cancelLanternAim(state);
    state.discharge = inactiveDischarge(state.tick);
    state.primaryNeedsRelease ||= state.input.primary;
    state.input = {move: {x: 0, y: 0}, primary: false};
    state.player.pouring = state.player.moving = state.player.usingTool = false;
    if (pouring) event('pour', state.player, {active: false, reason});
  }
  function initialize(tick = 0) {
    generation++;
    const def = structuredClone(definition), start = def.player;
    const inventory = {...config.inventory, ...start.inventory};
    for (const value of Object.values(inventory)) if (!Number.isFinite(value) || value < 0) throw Error('Invalid initial stock');
    if (inventory.torchFuel <= 1e-10) inventory.torchFuel = 0;
    const torchDuration = inventory.torchFuel / config.tools.torch.fuelPerSecond;
    if (!Number.isFinite(torchDuration)) throw Error('Invalid initial torch duration');
    state = {tick, paused: false, seed, events: [], input: {move: {x: 0, y: 0}, primary: false},
      clocks: {active: 0, player: 0, world: 0, playerScale: 1, worldScale: 1},
      player: {id:characterId==='bear'?'bear':'hero',characterId,species:characterId,height:profile.height, x: start.x, y: start.y, radius: config.player.radius, heading: start.heading ?? 0, moving: false,
        hp: clamp(start.hp ?? config.player.maxHp, 0, config.player.maxHp), maxHp: config.player.maxHp,
        tool: start.tool ?? 'matches', pouring: false, usingTool: false, inventory, travelled: 0, lanternAim: null},
      effects: {powder: {expiresAt: 0}, inversion: {expiresAt: 0}},
      pickups:def.pickups.map(pickup=>({...pickup,consumed:false})),
      obstacles: def.obstacles.map(o => ({...o, destroyed: false})),
      buildings: def.buildings.map(building => ({...building, destroyed: false, burnedFraction: 0})),
      actors: def.actors.map(a => ({...a, route: a.route?.map(p => ({...p})) ?? [{x: a.x, y: a.y}],
        routeIndex: a.route?.length > 1 ? 1 : 0, heading: 0, moving: false, hp: a.hp ?? 100, travelled: 0})),
      aim: {x: Math.min(def.width - 0.01, start.x + 0.8), y: start.y}, closeAim: null,
      discharge: inactiveDischarge(tick), projectiles: [], projectileSequence: 0, primaryNeedsRelease: false,
      moveNeedsNeutral: false, lanternPreview: null, ignitionResults: [], acceptedPath: [{x: start.x, y: start.y}]};
    state.player.torch = {phase: inventory.torchFuel > 0 ? 'unlit' : 'spent', durationSeconds: torchDuration};
    if (!TOOLS.includes(state.player.tool) || !freePoint(state.player, config.player.radius, def, state.obstacles)) throw Error('Invalid player spawn/tool');
    for (const actor of state.actors) if (actor.species && !freePoint(actor, actor.radius, def, state.obstacles)) throw Error('Invalid civilian spawn');
    state.tiles = [];
    for (let y = 0; y < def.height; y += def.tileSize) for (let x = 0; x < def.width; x += def.tileSize) {
      const point = {x: x + def.tileSize / 2, y: y + def.tileSize / 2};
      state.tiles.push({...point, size: def.tileSize, material: materialAt(def, point)});
    }
    field = new HeatField(def, config, state.obstacles);
    cottages=playableCottages?createCottageFire({buildings:state.buildings,obstacles:state.obstacles,sampleWind:cottageWind,seed}):null;
    const lots=state.buildings.filter(building=>!cottages||!COTTAGE_IDS.includes(building.id)).map(building=>({
      building,colliders:state.obstacles.filter(obstacle=>obstacle.buildingId===building.id)
    }));
    housing=catalogue?new Map(lots.map(lot=>[lot.building.id,createHousingFire(lot,state.obstacles,config,cottageWind)])):null;
    buildingFuel = catalogue ? [] : lots.map(({building,colliders}) => {
      const cells = field.cells.filter(cell => colliders.some(obstacle => inBox(cell, obstacle)));
      const initialSurfaceFuel = cells.reduce((sum, cell) => sum + cell.surfaceFuel, 0);
      if (!cells.length || initialSurfaceFuel <= EPS) throw Error('Building needs a finite dry-wood footprint');
      return {building,colliders,cells,initialSurfaceFuel};
    });
  }
  initialize();
  const activeEffect = name => state.effects[name].expiresAt > state.clocks.active + EPS;
  function faceMovement(inverted = activeEffect('inversion')) {
    const direction = movementVector(state.input.move, inverted, config.input);
    if (Math.hypot(direction.x, direction.y) > EPS) {
      state.player.heading = Math.atan2(direction.y, direction.x);
      state.closeAim = null;
    }
    return direction;
  }
  function facePointAim(explicit = false) {
    const p = state.player;
    if ((p.tool === 'matches' || p.tool === 'torch' || explicit && p.tool === 'flamethrower') &&
        state.closeAim && distance(p, state.closeAim) > EPS) {
      p.heading = aimHeading(p, state.closeAim);
    }
  }
  function useDrug(kind,point=state.player,extra={}){
    const p=state.player;if(kind==='healing'&&p.hp>=p.maxHp)return false;
    if(kind==='healing')p.hp=Math.min(p.maxHp,p.hp+config.drugs.healing);
    else state.effects[kind].expiresAt=state.clocks.active+config.drugs.duration;
    event('drug',point,{drug:kind,...extra});return true;
  }
  function apply(command) {
    const p = state.player;
    if (command.type === 'reset') {
      cancelLanternAim(state);
      const {tick, moveNeedsNeutral} = state, held = state.input.primary || state.primaryNeedsRelease;
      commands = [];
      initialize(tick);
      state.primaryNeedsRelease = held;
      state.moveNeedsNeutral = moveNeedsNeutral;
      event('reset', state.player, {generation});
      return 'reset';
    }
    if (command.type === 'pause') {
      state.paused = command.paused; if (state.paused) clearInput('pause'); event('pause', p, {paused: state.paused}); return;
    }
    if (command.type === 'cancel-input') { clearInput('cancel-input'); return; }
    if (command.type === 'select-tool') {
      if (p.tool !== command.tool) {
        cancelLanternAim(state);
        state.primaryNeedsRelease ||= state.input.primary;
        state.input.primary = false; p.usingTool = false; state.discharge = inactiveDischarge(state.tick);
        if (p.pouring) event('pour', p, {active: false, reason: 'tool-change'});
        p.pouring = false; p.tool = command.tool; event('tool-selected', p, {tool: p.tool});
        facePointAim();
      }
      return;
    }
    if (command.type === 'primary' && !command.pressed) { state.input.primary = false; state.primaryNeedsRelease = false; return; }
    if (command.type === 'move' && command.x === 0 && command.y === 0) state.moveNeedsNeutral = false;
    if (state.paused || p.hp <= 0) {
      if (command.type === 'primary' && command.pressed) state.primaryNeedsRelease = true;
      return;
    }
    if (command.type === 'move') {
      if (state.moveNeedsNeutral) return;
      state.input.move = normalized(command.x, command.y);
      if (p.lanternAim) adjustLanternAim(p, state.input.move, definition, config);
      else faceMovement();
      return;
    }
    if (command.type === 'aim') {
      state.aim = {x: command.x, y: command.y};
      if (command.hover !== true && !p.lanternAim) {
        state.closeAim = state.aim;
        facePointAim(true);
      }
      return;
    }
    if (command.type === 'primary') {
      if (state.primaryNeedsRelease) return;
      const rising = command.pressed && !state.input.primary;
      state.input.primary = command.pressed;
      if (rising) discreteTool(state, field, config, event,cottages,housing);
      return;
    }
    if (command.type === 'drug') {
      const kind = command.drug;
      if (p.inventory[kind] < 1 || kind === 'healing' && p.hp >= p.maxHp) { event('drug-rejected', p, {drug: kind}); return; }
      p.inventory[kind]--;
      // Intentionally leave tool, movement, held trigger and pouring untouched.
      useDrug(kind);
    }
  }
  function hurt(target, amount, cause) {
    if (target.hp <= 0 || amount <= 0) return;
    target.hp = Math.max(0, target.hp - amount);
    if (target.hp === 0) {
      target.moving = false; event('death', target, {actorId: target.id, cause});
      if (target === state.player) clearInput('death');
    }
  }
  function barrels() {
    const pending = state.obstacles.filter(o => o.kind === 'barrel' && !o.destroyed &&
      field.candidates(o, o.radius ?? o.width / 2).some(c => c.heat >= config.barrel.ignitionHeat)).map(o => o.id).sort();
    for (let i = 0; i < pending.length; i++) {
      const barrel = state.obstacles.find(o => o.id === pending[i] && !o.destroyed);
      if (!barrel) continue;
      // Remove before queue expansion. Rendering and duplicate IDs cannot reapply.
      barrel.destroyed = true;
      event('barrel-explosion', barrel, {objectId: barrel.id, radius: config.barrel.blastRadius});
      field.emit(barrel, config.barrel.blastRadius, config.barrel.heat, 'barrel:' + barrel.id, {wallsProtect: config.barrel.wallsProtect});
      for (const target of [state.player, ...state.actors]) {
        const d = distance(barrel, target);
        if (d <= config.barrel.blastRadius && (!config.barrel.wallsProtect || lineClear(barrel, target, state.obstacles))) {
          hurt(target, config.barrel.damage * Math.max(0.2, 1 - d / config.barrel.blastRadius), 'barrel:' + barrel.id);
        }
      }
      for (const next of state.obstacles) if (next.kind === 'barrel' && !next.destroyed &&
        distance(barrel, next) <= config.barrel.blastRadius && (!config.barrel.wallsProtect || lineClear(barrel, next, state.obstacles))) pending.push(next.id);
    }
  }
  function actorStep(actor, delta) {
    actor.moving = false; if (actor.hp <= 0 || actor.route.length < 2) return;
    let budget = (actor.speed ?? 1) * delta;
    while (budget > EPS) {
      const target = actor.route[actor.routeIndex], d = distance(actor, target);
      if (d < EPS) { actor.routeIndex = (actor.routeIndex + 1) % actor.route.length; break; }
      const amount = Math.min(budget, d);
      const path = moveDisc(actor, (target.x - actor.x) / d * amount, (target.y - actor.y) / d * amount, actor.radius ?? 0.2, definition, state.obstacles, field.size);
      const next = path.at(-1), walked = path.slice(1).reduce((sum, p, i) => sum + distance(path[i], p), 0);
      actor.heading = Math.atan2(next.y - actor.y, next.x - actor.x); actor.x = next.x; actor.y = next.y;
      actor.travelled += walked; actor.moving ||= walked > EPS; budget -= amount;
      if (walked < amount - EPS) break;
      if (amount >= d - EPS) actor.routeIndex = (actor.routeIndex + 1) % actor.route.length;
    }
  }
  function step() {
    state.tick++;
    state.player.moving = state.player.usingTool = false; state.discharge = inactiveDischarge(state.tick); state.ignitionResults = [];
    const due = commands.filter(c => c.atTick <= state.tick).sort((a, b) => a.atTick - b.atTick || a.sequence - b.sequence);
    commands = commands.filter(c => c.atTick > state.tick);
    let resetting=false;for (const command of due) if (apply(command) === 'reset') {resetting=true;break;}
    const p = state.player;
    if (state.paused) return;
    const powder = activeEffect('powder'), inverted = activeEffect('inversion');
    const playerScale = powder ? config.drugs.playerScale : 1, worldScale = powder ? config.drugs.worldScale : 1;
    const playerDelta = config.step * playerScale, worldDelta = config.step * worldScale;
    state.clocks.active += config.step; state.clocks.player += playerDelta; state.clocks.world += worldDelta;
    if (p.hp > 0) {
      let path = [{x: p.x, y: p.y}];
      if (!p.lanternAim) {
        const direction = faceMovement(inverted);
        path = moveDisc(p, direction.x * config.player.speed * playerDelta, direction.y * config.player.speed * playerDelta,
          p.radius, definition, state.obstacles, field.size);
      }
      state.acceptedPath = path;
      let walked = 0;
      for (let i = 1; i < path.length; i++) {
        walked += distance(path[i - 1], path[i]);
        if (p.pouring) {
          const used = field.addLine(path[i - 1], path[i], config.fuel.gasPerMetre, p.inventory.gas);
          p.inventory.gas = Math.max(0, p.inventory.gas - used);
          if (p.inventory.gas <= EPS) { p.inventory.gas = 0; p.pouring = false; event('pour', path[i], {active: false, reason: 'empty'}); }
        }
      }
      if (walked > EPS) { const end = path.at(-1); p.x = end.x; p.y = end.y; p.moving = true; p.travelled += walked; }
      for(const {pickup,point}of resetting?[]:pickupContacts(state.pickups,path,p.radius,state.obstacles)){
        if(useDrug(pickup.kind,point,{source:'pickup',pickupId:pickup.id})){
          pickup.consumed=true;event('pickup-used',pickup,{pickupId:pickup.id,kind:pickup.kind,actorId:p.id});
        }
      }
      heldTool(state, field, config, config.tools.emissionClock === 'player' ? playerDelta : config.step, event, definition,cottages,housing);
    }
    for (const actor of state.actors) actorStep(actor, worldDelta);
    projectilesStep(state, field, config, worldDelta, event,cottages,housing);
    ageTorch(state, config, worldDelta, event);
    cottages?.exchangeGround(field,worldDelta,state.clocks.world);
    for(const lot of housing?.values()??[])lot.exchangeGround(field,worldDelta,state.clocks.world);
    field.step(worldDelta, state.clocks.world, event); barrels();
    cottages?.step(worldDelta,state.clocks.world,event);
    for(const lot of housing?.values()??[])lot.step(worldDelta,state.clocks.world,event);
    for (const result of state.ignitionResults) result.record.result = result.cells.some(cell => cell.phase === 'burning') ? 'ignited' : 'heated';
    state.ignitionResults = [];
    for (const target of [p, ...state.actors]) hurt(target, field.exposure(target) * config.fire.damagePerSecond * worldDelta, 'heat');
    for (const group of buildingFuel) if (!group.building.destroyed) {
      const surface = group.cells.reduce((sum, cell) => sum + cell.surfaceFuel, 0);
      group.building.burnedFraction = clamp(1 - surface / group.initialSurfaceFuel, 0, 1);
      if (group.cells.every(cell => cell.surfaceFuel + cell.depositedFuel <= EPS)) {
        group.building.destroyed = true;
        for (const collider of group.colliders) collider.destroyed = true;
        event('building-burnout', {x: group.building.x, y: group.building.y}, {buildingId: group.building.id});
      }
    }
    // Legacy ungrouped wood keeps its reviewed individual-footprint behavior.
    for (const o of state.obstacles) if (!o.buildingId && !o.destroyed && o.material === 'wood') {
      const cells = field.cells.filter(c => inBox(c, o));
      if (cells.length && cells.every(c => c.surfaceFuel + c.depositedFuel <= EPS)) { o.destroyed = true; event('obstacle-burnout', o, {objectId: o.id}); }
    }
    for (const name of ['powder', 'inversion']) if (state.effects[name].expiresAt > 0 && !activeEffect(name)) {
      state.effects[name].expiresAt = 0; event('drug-expired', p, {drug: name});
    }
    refreshLanternPreview(state, config);
    state.clocks.playerScale = activeEffect('powder') ? config.drugs.playerScale : 1;
    state.clocks.worldScale = activeEffect('powder') ? config.drugs.worldScale : 1;
  }
  function snapshot() {
    if (disposed) throw Error('Simulation disposed');
    const cells = field.snapshot(), present = new Set(state.obstacles.filter(o => !o.destroyed).map(o => o.id));
    const intactSupport = new Map(definition.modules.map(m => [m.id, m.colliderIds.length > 0 && m.colliderIds.every(id => present.has(id))]));
    const modules = definition.modules.map(module => {
      const copy = structuredClone(module);
      copy.destroyed = copy.supportModuleIds ? copy.supportModuleIds.some(id => !intactSupport.get(id)) : copy.colliderIds.length > 0 && copy.colliderIds.every(id => !present.has(id));
      copy.parts = copy.parts.map(part => ({...part, destroyed: part.solid ? !present.has(part.id) : part.role === 'lintel' ? !present.has(copy.id + ':pier-left') || !present.has(copy.id + ':pier-right') : copy.destroyed}));
      return copy;
    });
    return {version: 1, tick: state.tick, paused: state.paused,
      clocks: {...state.clocks}, player: {...state.player, inventory: {...state.player.inventory}, lanternAim: structuredClone(state.player.lanternAim),
        torch: {...state.player.torch, remainingSeconds: state.player.inventory.torchFuel / config.tools.torch.fuelPerSecond}},
      effects: Object.fromEntries(['powder', 'inversion'].map(name => [name,
        {active: activeEffect(name), remaining: Math.max(0, state.effects[name].expiresAt - state.clocks.active)}])),
      world: {width: definition.width, height: definition.height, tileSize: definition.tileSize, modules,
        buildings: state.buildings.map(building => structuredClone(building)),
        ...(definition.camera ? {camera: structuredClone(definition.camera)} : {}),
        fireCellSize: definition.fireCellSize, tiles: state.tiles.map(t => ({...t})),
        obstacles: state.obstacles.filter(o => !o.destroyed).map(({destroyed, ...o}) => structuredClone(o))},
      cells,pickups:state.pickups.map(pickup=>({...pickup})), actors: state.actors.map(({route, routeIndex, ...actor}) => ({...actor})),
      discharge: structuredClone(state.discharge), events: structuredClone(state.events), aim: {...state.aim}, projectiles: state.projectiles.map(p => ({...p})),
      ...(cottages?{cottageFire:cottages.snapshot(state.clocks.world)}:{}),
      structureFire:[...(cottages?.samples(state.clocks.world)??[]), ...Array.from(housing?.values()??[]).flatMap(lot=>lot.samples(state.clocks.world))],
      diagnostics: {scenario: definition.id, seed, generation, alpha: accumulator / config.step, lastSteps, droppedRealSeconds,
        acceptedPath: state.acceptedPath.map(p => ({...p})), fuel: {...field.stats,
          remainingDepositedFuel: cells.reduce((sum, c) => sum + c.depositedFuel, 0)},
        burningCells: cells.filter(c => c.phase === 'burning').length,
        frontX: Math.max(0, ...cells.filter(c => c.phase === 'burning').map(c => c.x))}};
  }
  function dispatch(command) {
    if (disposed || !command || typeof command !== 'object') return false;
    const {type} = command;
    if (!['move', 'aim', 'select-tool', 'primary', 'drug', 'pause', 'reset', 'cancel-input'].includes(type)) return false;
    if (['move', 'aim'].includes(type) && ![command.x, command.y].every(Number.isFinite)) return false;
    if (type === 'aim' && (command.x < 0 || command.y < 0 || command.x >= definition.width || command.y >= definition.height)) return false;
    if (type === 'select-tool' && !TOOLS.includes(command.tool) || type === 'drug' && !DRUGS.includes(command.drug)) return false;
    if (type === 'primary' && typeof command.pressed !== 'boolean' || type === 'pause' && typeof command.paused !== 'boolean') return false;
    const atTick = command.atTick ?? state.tick + 1;
    if (!Number.isSafeInteger(atTick) || atTick <= state.tick) return false;
    commands.push({...structuredClone(command), atTick, sequence: ++commandSequence}); return true;
  }
  return {dispatch, snapshot,
    advance(realDeltaSeconds) {
      if (disposed) throw Error('Simulation disposed');
      if (!Number.isFinite(realDeltaSeconds) || realDeltaSeconds < 0) throw Error('advance requires a finite nonnegative delta');
      const accepted = Math.min(realDeltaSeconds, config.maxCatchUp);
      droppedRealSeconds += realDeltaSeconds - accepted; accumulator += accepted; lastSteps = 0;
      const limit = Math.ceil(config.maxCatchUp / config.step);
      while (accumulator + EPS >= config.step && lastSteps < limit) { accumulator = Math.max(0, accumulator - config.step); step(); lastSteps++; }
      return snapshot();
    },
    dispose() { disposed = true; commands = []; state = null; field = null; buildingFuel = null; housing=null; cottages=null; }
  };
}
function inBox(p, o) { return Math.abs(p.x - o.x) < o.width / 2 + p.size / 2 - EPS && Math.abs(p.y - o.y) < o.depth / 2 + p.size / 2 - EPS; }
