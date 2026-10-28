// Fixed UI examples only. No movement, fuel, fire, damage, duration or stock simulation.
const base = {
  version: 1, tick: 0, paused: false,
  clocks: {active: 0, player: 0, world: 0, playerScale: 1, worldScale: 1},
  player: {id: 'bear', x: 10, y: 8, heading: 0, moving: false, hp: 66, maxHp: 100,
    tool: 'matches', pouring: false,
    torch: {phase:'unlit',remainingSeconds:41.6666667,durationSeconds:41.6666667},
    inventory: {matches: 9, gas: 24.8, molotovs: 3, torchFuel: 5, flamethrowerFuel: 120, powder: 2, healing: 3, inversion: 1}},
  effects: {powder: {active: false, remaining: 0}, inversion: {active: false, remaining: 0}},
  world: {width: 20, height: 16, tileSize: 1, fireCellSize: 0.5, tiles: [], obstacles: []},
  cells: [], actors: [], events: [], diagnostics:{generation:0}
};
export const FIXTURE_NAMES = ['ready', 'pouring', 'reversed', 'low-stock', 'empty', 'paused', 'down', 'torch-unlit', 'torch-lit', 'torch-paused', 'torch-powder', 'torch-spent', 'torch-unknown', 'torch-blocked', 'matches-no-fuel'];
export function fixture(name = 'ready') {
  const value = structuredClone(base);
  if(name.startsWith('torch-')){
    value.player.tool='torch';
    if(name!=='torch-unlit') {value.player.torch.phase='lit';value.player.torch.remainingSeconds=26.2;value.player.inventory.torchFuel=3.144;}
    if(name==='torch-spent'){value.player.torch.phase='spent';value.player.torch.remainingSeconds=0;value.player.inventory.torchFuel=0;}
    else if(name==='torch-unknown')delete value.player.torch;
    else if(name==='torch-paused')value.paused=true;
    else if(name==='torch-powder'){value.effects.powder={active:true,remaining:6.4};value.clocks.worldScale=.35;value.clocks.playerScale=1.5;}
    else if(name==='torch-blocked'){value.tick=1;value.events=[{id:1,tick:1,type:'tool-rejected',tool:'torch',reason:'blocked'}];}
  } else if(name==='matches-no-fuel'){value.tick=1;value.events=[{id:1,tick:1,type:'tool-use',tool:'matches',result:'no-fuel'}];}
  else if (name === 'pouring') {
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
  let value = fixture(), pressed = false, generation=0;
  return {
    choose(name) {
      value=fixture(name);value.diagnostics.generation=++generation;pressed=false;
      if(value.events.length){const before=structuredClone(value);before.events=[];onSnapshot(before);}
      onSnapshot(structuredClone(value));
    },
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
      } else if (command.type === 'reset') { value = fixture(); value.diagnostics.generation=++generation; pressed = false; }
      onSnapshot(structuredClone(value));
    }
  };
}
