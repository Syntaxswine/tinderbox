// Fixed UI examples only. No movement, fuel, fire, damage, duration or stock simulation.
const base = {
  version: 1, tick: 0, paused: false,
  clocks: {active: 0, player: 0, world: 0, playerScale: 1, worldScale: 1},
  player: {id: 'bear', x: 10, y: 8, heading: 0, moving: false, hp: 66, maxHp: 100,
    tool: 'matches', pouring: false,
    inventory: {matches: 9, gas: 24.8, molotovs: 3, torchFuel: 42, flamethrowerFuel: 120, powder: 2, healing: 3, inversion: 1}},
  effects: {powder: {active: false, remaining: 0}, inversion: {active: false, remaining: 0}},
  world: {width: 20, height: 16, tileSize: 1, fireCellSize: 0.5, tiles: [], obstacles: []},
  cells: [], actors: [], events: []
};
export const FIXTURE_NAMES = ['ready', 'pouring', 'reversed', 'low-stock', 'empty', 'paused', 'down'];
export function fixture(name = 'ready') {
  const value = structuredClone(base);
  if (name === 'pouring') {
    value.player.tool = 'jerry-can'; value.player.pouring = true;
    value.effects.powder = {active: true, remaining: 6.4};
    value.clocks.playerScale = 1.5; value.clocks.worldScale = 0.35;
  } else if (name === 'reversed') {
    value.player.tool = 'flamethrower';
    value.effects.inversion = {active: true, remaining: 7.2};
  } else if (name === 'low-stock') {
    value.player.tool = 'jerry-can'; value.player.hp = 21;
    Object.assign(value.player.inventory, {gas: 0.4, matches: 0, molotovs: 0, healing: 1, powder: 0});
  } else if (name === 'empty') {
    value.player.tool = 'flamethrower';
    for (const key of Object.keys(value.player.inventory)) value.player.inventory[key] = 0;
  } else if (name === 'paused') value.paused = true;
  else if (name === 'down') value.player.hp = 0;
  else if (name !== 'ready') throw Error('Unknown UI fixture: ' + name);
  return value;
}

// Commands choose fixed presentation examples. They never resolve gameplay.
export function createFakeSnapshotAdapter({onSnapshot, onCommand = () => {}}) {
  let value = fixture(), pressed = false;
  return {
    choose(name) { value = fixture(name); pressed = false; onSnapshot(structuredClone(value)); },
    snapshot() { return structuredClone(value); },
    dispatch(command) {
      onCommand(structuredClone(command));
      if (command.type === 'select-tool') {
        value.player.tool = command.tool; value.player.pouring = false;
      } else if (command.type === 'primary') {
        if (command.pressed && !pressed && value.player.tool === 'jerry-can') value.player.pouring = !value.player.pouring;
        pressed = command.pressed;
      } else if (command.type === 'drug') {
        if (command.drug === 'healing') value.player.hp = 100;
        else {
          value.effects[command.drug] = {active: true, remaining: 8};
          if (command.drug === 'powder') { value.clocks.playerScale = 1.5; value.clocks.worldScale = 0.35; }
        }
      } else if (command.type === 'pause') {
        value.paused = command.paused;
        if (value.paused) value.player.pouring = false;
      } else if (command.type === 'cancel-input') {
        pressed = false; value.player.pouring = false;
      } else if (command.type === 'reset') { value = fixture(); pressed = false; }
      onSnapshot(structuredClone(value));
    }
  };
}
