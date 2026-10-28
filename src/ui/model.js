export const TOOLS = Object.freeze([
  {id: 'matches', label: 'Matches', face: 'MATCHES', stock: 'matches', action: 'Strike', hint: 'One press · one ground tile', unit: 'left'},
  {id: 'jerry-can', label: 'Oil barrel', face: 'OIL|BARREL', stock: 'gas', action: 'Pour', hint: 'Tap to pour · keep moving', unit: 'gas'},
  {id: 'molotov', label: 'Oil lantern', face: 'OIL|LANTERN', stock: 'molotovs', action: 'Throw', hint: 'Throw toward your aim', unit: 'left'},
  {id: 'torch', label: 'Torch', face: 'TORCH', stock: 'torchFuel', action: 'Light', hint: 'Press once to light, then press to ignite nearby fuel', unit: 'fuel'},
  {id: 'flamethrower', label: 'Flamethrower', face: 'FLAME|THROWER', stock: 'flamethrowerFuel', action: 'Spray', hint: 'Hold to spray toward your aim', unit: 'fuel'}
].map(Object.freeze));

export const DRUGS = Object.freeze([
  {id: 'powder', label: 'Powder', face: 'POWDER', key: 'Q', hint: 'Bear faster · world and fire slower'},
  {id: 'healing', label: 'Healing pills', face: 'HEAL', key: 'E', hint: 'Restore health'},
  {id: 'inversion', label: 'Inversion pills', face: 'INVERT', key: 'R', hint: 'Movement stick reversed 180°'}
].map(Object.freeze));

export function normalizeStick(x, y) {
  if (!Number.isFinite(x) || !Number.isFinite(y)) return {x: 0, y: 0};
  const length = Math.hypot(x, y);
  const scale = Math.max(1, length);
  return {x: x / scale || 0, y: y / scale || 0};
}

export function pointerStick(clientX, clientY, rect) {
  const radius = Math.min(rect.width, rect.height) * 0.36;
  if (radius <= 0) return {x: 0, y: 0};
  const x = (clientX - rect.left - rect.width / 2) / radius;
  const y = (rect.top + rect.height / 2 - clientY) / radius;
  return Math.hypot(x, y) < 0.12 ? {x: 0, y: 0} : normalizeStick(x, y);
}

export function stockText(value) {
  const safe = Number.isFinite(value) ? Math.max(0, value) : 0;
  return safe >= 1000 ? '999+' : Number.isInteger(safe) ? String(safe) : safe.toFixed(1);
}

export function remainingText(value) {
  return (Math.ceil(Math.max(0, Number(value) || 0) * 10) / 10).toFixed(1) + 's';
}

// Presentation only: phase and seconds always come from the authoritative snapshot.
export function torchViewOf(player) {
  const value=player.torch;
  const known=Boolean(value && ['unlit','lit','spent'].includes(value.phase) &&
    Number.isFinite(value.remainingSeconds) && Number.isFinite(value.durationSeconds) &&
    value.remainingSeconds>=0 && value.durationSeconds>=value.remainingSeconds);
  if(!known) return {known:false,phase:'unknown',remaining:null,label:'Light',status:'WAIT',resource:'Awaiting torch state',hint:'Waiting for torch state.',disabled:true};
  const status=value.phase.toUpperCase(),remaining=remainingText(value.remainingSeconds);
  return {known:true,phase:value.phase,remaining,label:value.phase==='unlit'?'Light':value.phase==='lit'?'Ignite':'Spent',status,
    resource:status+' · '+remaining+' left',hint:value.phase==='unlit'?'Press once to light. Keeps burning until spent.':value.phase==='lit'?'Press once to ignite nearby fuel.':'Torch spent. No fuel remains.',
    disabled:value.phase==='spent'||value.remainingSeconds<=0};
}

// Unknown results stay neutral; UI never treats a particle or accepted press as success.
export function toolFeedbackOf(event) {
  if(!event) return null;
  const tool=event.tool??(['torch-lit','torch-spent'].includes(event.type)?'torch':null);
  if(!['matches','torch'].includes(tool)) return null;
  if(event.type==='torch-lit') return 'Torch lit. Press Ignite to light nearby fuel.';
  if(event.type==='torch-spent') return 'Torch spent. No fuel remains.';
  if(!['tool-use','tool-rejected'].includes(event.type)) return null;
  const result=typeof event.reason==='string'?event.reason:event.result;
  if(result==='empty') return tool==='matches'?'No matches left.':'No torch fuel remains.';
  if(result==='spent') return 'Torch spent. No fuel remains.';
  if(result==='blocked') return 'Target blocked. Aim at reachable ground.';
  if(result==='range') return 'Target out of reach. Move closer.';
  if(result==='no-fuel') return tool==='matches'?'No burnable fuel on this tile.':'No burnable fuel nearby.';
  if(event.type==='tool-rejected') return 'Ignition was not applied.';
  if(result==='ignited') return tool==='matches'?'Match ignited the targeted tile.':'Nearby fuel ignited.';
  return tool==='matches'?'Match used.':'Torch action used.';
}

// Presentation only. This function neither mutates a snapshot nor advances time.
export function viewOf(snapshot) {
  if (!snapshot || snapshot.version !== 1 || !snapshot.player) throw new TypeError('Tinderbox UI requires a v1 snapshot.');
  const {player, effects = {}} = snapshot;
  const inventory = player.inventory ?? {};
  const tool = TOOLS.find(item => item.id === player.tool) ?? TOOLS[0];
  const dead = !(player.hp > 0);
  const locked = Boolean(snapshot.paused || dead);
  const stock = Math.max(0, Number(inventory[tool.stock]) || 0);
  const pouring = Boolean(player.pouring && tool.id === 'jerry-can');
  const torch=torchViewOf(player),torchSelected=tool.id==='torch';
  return {
    torch, player, tool, inventory, dead, locked, paused: Boolean(snapshot.paused), stock, pouring,
    hp: Math.max(0, Math.min(player.maxHp || 100, player.hp || 0)),
    maxHp: Math.max(1, player.maxHp || 100),
    primaryLabel: pouring ? 'Stop' : torchSelected ? torch.label : tool.action,
    primaryMode: pouring ? 'POURING' : torchSelected ? torch.status : stock<=0 ? 'EMPTY' : tool.id==='flamethrower' ? 'HOLD' : 'PRESS',
    resourceText: torchSelected ? torch.resource : stockText(stock)+' '+tool.unit+(stock<=0?' · EMPTY':''),
    toolHint: torchSelected ? torch.hint : tool.hint,
    primaryDisabled: locked || (stock <= 0 && !pouring) || (torchSelected && torch.disabled),
    effects: {
      powder: {active: Boolean(effects.powder?.active), remaining: remainingText(effects.powder?.remaining)},
      inversion: {active: Boolean(effects.inversion?.active), remaining: remainingText(effects.inversion?.remaining)}
    }
  };
}
