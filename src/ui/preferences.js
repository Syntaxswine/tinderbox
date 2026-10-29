const keys = ['reduceMotion', 'highContrast'];

export function createInterfacePreferences(initial = {}) {
  let value = Object.freeze(Object.fromEntries(keys.map(key => [key, initial?.[key] === true])));
  const listeners = new Set();
  return {
    get: () => value,
    update(patch = {}) {
      const next = {...value};
      for (const key of keys) if (typeof patch?.[key] === 'boolean') next[key] = patch[key];
      if (keys.every(key => next[key] === value[key])) return value;
      value = Object.freeze(next);
      for (const listener of [...listeners]) listener(value);
      return value;
    },
    subscribe(listener) {
      if (typeof listener !== 'function') throw new TypeError('A preference listener is required.');
      listeners.add(listener);
      return () => listeners.delete(listener);
    }
  };
}

// A browser-page session, shared by the title, map picker and successive HUDs.
export const interfacePreferences = createInterfacePreferences();

export function bindInterfacePreferences(shell, preferences = interfacePreferences) {
  const inputs = [...shell.querySelectorAll('[data-reduce-motion],[data-contrast]')];
  const keyFor = input => input.hasAttribute('data-reduce-motion') ? 'reduceMotion' : 'highContrast';
  const render = value => {
    shell.classList.toggle('tb-reduced-motion', value.reduceMotion);
    shell.classList.toggle('tb-high-contrast', value.highContrast);
    for (const input of inputs) input.checked = value[keyFor(input)];
  };
  render(preferences.get());
  const unsubscribe = preferences.subscribe(render);
  const handlers = inputs.map(input => {
    const change = () => preferences.update({[keyFor(input)]: input.checked});
    input.addEventListener('change', change);
    return () => input.removeEventListener('change', change);
  });
  return () => { unsubscribe(); for (const remove of handlers) remove(); };
}
