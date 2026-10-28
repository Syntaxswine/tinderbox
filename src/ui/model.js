export const TOOLS = Object.freeze([
  {id: 'matches', label: 'Matches', face: 'MATCHES', stock: 'matches', action: 'Strike', hint: 'One local ignition', unit: 'left'},
  {id: 'jerry-can', label: 'Oil barrel', face: 'OIL|BARREL', stock: 'gas', action: 'Pour', hint: 'Tap to pour · keep moving', unit: 'gas'},
  {id: 'molotov', label: 'Oil lantern', face: 'OIL|LANTERN', stock: 'molotovs', action: 'Throw', hint: 'Throw toward your aim', unit: 'left'},
  {id: 'torch', label: 'Torch', face: 'TORCH', stock: 'torchFuel', action: 'Burn', hint: 'Hold for close ignition', unit: 'fuel'},
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
  return {
    player, tool, inventory, dead, locked, paused: Boolean(snapshot.paused), stock, pouring,
    hp: Math.max(0, Math.min(player.maxHp || 100, player.hp || 0)),
    maxHp: Math.max(1, player.maxHp || 100),
    primaryLabel: pouring ? 'Stop' : tool.action,
    primaryDisabled: locked || (stock <= 0 && !pouring),
    effects: {
      powder: {active: Boolean(effects.powder?.active), remaining: remainingText(effects.powder?.remaining)},
      inversion: {active: Boolean(effects.inversion?.active), remaining: remainingText(effects.inversion?.remaining)}
    }
  };
}
