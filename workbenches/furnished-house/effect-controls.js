// Presentation-only controls for the furnished-house preferences store.
// The host owns persistence, redraws and simulation.
const mounts = new WeakMap();
const channels = [
  ['flames', 'Flames'],
  ['smoke', 'Smoke'],
  ['lighting', 'Fire lighting']
];

export function mountEffectControls({root, preferences}) {
  if (!root?.ownerDocument?.createElement) throw new TypeError('An effect settings root is required.');
  if (['snapshot', 'set', 'subscribe'].some(key => typeof preferences?.[key] !== 'function')) {
    throw new TypeError('An effect preferences store is required.');
  }
  mounts.get(root)?.();

  const document = root.ownerDocument;
  const group = document.createElement('fieldset');
  group.className = 'fire-effect-controls';
  const legend = document.createElement('legend');
  legend.textContent = 'Settings';
  group.append(legend);

  const help = document.createElement('p');
  help.id = 'fire-effect-lighting-help';
  help.textContent = 'Light cast by fire onto the surroundings. Ambient night light stays on.';
  const inputs = new Map();
  const removers = [];
  for (const [key, title] of channels) {
    const label = document.createElement('label');
    const input = document.createElement('input');
    input.type = 'checkbox';
    input.name = 'fire-effect-' + key;
    input.dataset.effect = key;
    if (key === 'lighting') input.setAttribute('aria-describedby', help.id);
    const text = document.createElement('span');
    text.textContent = title;
    label.append(input, text);
    group.append(label);
    inputs.set(key, input);
    const change = () => preferences.set({[key]: input.checked});
    input.addEventListener('change', change);
    removers.push(() => input.removeEventListener('change', change));
  }
  group.append(help);

  // Leave Tab and Space to the browser; keep focused settings out of walking.
  const isolateKeyboard = event => event.stopPropagation();
  group.addEventListener('keydown', isolateKeyboard);
  const render = value => {
    for (const [key, input] of inputs) input.checked = value[key];
  };
  render(preferences.snapshot());
  const unsubscribe = preferences.subscribe(render);
  root.append(group);

  let disposed = false;
  const dispose = () => {
    if (disposed) return;
    disposed = true;
    unsubscribe();
    for (const remove of removers) remove();
    group.removeEventListener('keydown', isolateKeyboard);
    group.remove();
    if (mounts.get(root) === dispose) mounts.delete(root);
  };
  mounts.set(root, dispose);
  return dispose;
}
