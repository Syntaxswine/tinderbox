import {TOOLS, DRUGS, normalizeStick, pointerStick, stockText, viewOf} from './model.js';
const marks = new URL('../../assets/art/ui/control-symbols.svg', import.meta.url).href;
const donorMarks = new URL('../../vendor/farmyard-commando/30a3b8cae5f36bb0c1df3685b7fba16f701c2083/sites/tactical-animal/dist/assets/ui/industrial-switches/symbols.svg', import.meta.url).href;
const icon = (id, donor = false) => '<svg class="switch-glyph" viewBox="0 0 32 32" aria-hidden="true"><use href="' + (donor ? donorMarks : marks) + '#' + id + '"></use></svg>';
const toolButtons = TOOLS.map((tool, index) => '<button type="button" class="industrial-switch tb-tool" data-tool="' + tool.id + '" aria-pressed="false"><span class="switch-legend">' + icon(tool.id) + '<span class="switch-label">' + tool.face.replace('|', '<br>') + '</span><span class="switch-cost" data-stock></span></span><kbd>' + (index + 1) + '</kbd></button>').join('');
const drugButtons = DRUGS.map(drug => '<button type="button" class="industrial-switch tb-drug" data-drug="' + drug.id + '" data-face="' + (drug.id === 'inversion' ? 'red' : 'green') + '"><span class="switch-legend">' + icon(drug.id) + '<span class="switch-label">' + drug.face + '</span><span class="switch-cost" data-stock></span></span><kbd>' + drug.key + '</kbd></button>').join('');
let instance = 0;
const markup = '<header class="tb-top">' +
  '<div class="tb-vitals map-metal-frame"><span class="tb-wordmark">TINDERBOX<span>BURNING TRAIL</span></span><div class="tb-health"><span class="tb-micro">HEALTH <b data-health-text>—</b></span><div class="tb-health-meter" role="meter" aria-label="Bear health" aria-valuemin="0" aria-valuemax="100" aria-valuenow="0"><span data-health-fill></span></div></div></div>' +
  '<button type="button" class="industrial-switch tb-pause" data-pause aria-label="Pause and open scene menu" aria-expanded="false"><span class="switch-legend">' + icon('pause') + '<span class="switch-label">PAUSE</span></span></button></header>' +
  '<div class="tb-effects" aria-label="Active effects"><div class="tb-effect tb-powder" data-effect="powder" hidden><b>POWDER <span data-time></span></b><span>Bear faster · world & fire slower</span></div><div class="tb-effect tb-inversion" data-effect="inversion" hidden><b>STICK 180° <span data-time></span></b><span>Movement reversed · aim unchanged</span></div></div>' +
  '<p class="tb-death map-metal-frame" data-death hidden>BEAR DOWN <span>Open pause to reset the scene.</span></p>' +
  '<section class="tb-console map-metal-frame" aria-label="Player control deck">' +
  '<div class="tb-rack-label"><span>TOOLS</span><span data-loadout-state>SELECT A TOOL</span></div><div class="tb-tools" role="group" aria-label="Five tools">' + toolButtons + '</div>' +
  '<div class="tb-controls"><div class="tb-stick-group"><button type="button" class="tb-stick" data-stick aria-label="Movement joystick. Drag to move. Keyboard: W A S D or arrow keys." aria-describedby="tb-movement-help"><span class="tb-stick-ring"></span><span class="tb-stick-cross"></span><span class="tb-stick-thumb">' + icon('movement', true) + '</span><span class="tb-stick-n">N</span></button><span class="tb-micro tb-stick-caption" id="tb-movement-help">MOVE <span>WASD / ↑↓←→</span></span></div>' +
  '<div class="tb-action-cluster"><div class="tb-selected"><span class="tb-micro">IN HAND</span><strong data-tool-name>—</strong><span data-tool-hint></span><span class="tb-selected-stock" data-selected-stock></span></div>' +
  '<button type="button" class="industrial-switch tb-primary" data-primary data-face="red" aria-label="Primary action" aria-pressed="false"><span class="switch-legend"><span class="tb-primary-icon"></span><span class="switch-label" data-primary-label>—</span><span class="switch-cost" data-primary-mode></span></span><kbd>SPACE</kbd></button>' +
  '<div class="tb-drugs" role="group" aria-label="Three drug actions">' + drugButtons + '</div></div></div></section>' +
  '<div class="tb-menu-backdrop" data-menu hidden><section class="tb-menu map-metal-frame" role="dialog" aria-modal="true" aria-labelledby="tb-menu-title"><div class="tb-menu-heading"><span class="tb-micro">TINDERBOX / SCENE MENU</span><h1 id="tb-menu-title" tabindex="-1" data-menu-title>Paused</h1></div>' +
  '<div data-pause-panel><p class="tb-menu-note" data-pause-note>The trail can wait.</p><button type="button" class="tb-menu-button tb-resume" data-resume>' + icon('play') + '<span>Resume scene</span><kbd>ESC</kbd></button><button type="button" class="tb-menu-button" data-options>' + icon('options', true) + '<span>Controls & options</span></button><button type="button" class="tb-menu-button" data-reset>' + icon('reset') + '<span>Reset test scene</span></button></div>' +
  '<div data-options-panel hidden><p class="tb-menu-note">Interface preferences apply to this session.</p><label class="tb-option"><input type="checkbox" data-reduce-motion>Reduce interface motion</label><label class="tb-option"><input type="checkbox" data-contrast>High contrast labels</label><dl class="tb-key-guide"><div><dt>Move</dt><dd>Drag stick · WASD · arrows</dd></div><div><dt>Tools</dt><dd>1–5</dd></div><div><dt>Use / pour</dt><dd>Space · action button</dd></div><div><dt>Drugs</dt><dd>Q powder · E heal · R invert</dd></div><div><dt>Pause</dt><dd>Esc · P</dd></div></dl><p class="tb-menu-note">Pour toggles on a press. You can keep moving and take drugs while pouring. Inversion reverses movement only.</p><button type="button" class="tb-menu-button" data-back>Back to pause</button></div></section></div>' +
  '<span class="tb-sr-only" role="status" aria-live="polite" data-announcement></span>';

export function mountUI({root, onCommand} = {}) {
  if (!root?.ownerDocument || typeof onCommand !== 'function') throw new TypeError('mountUI requires a DOM root and onCommand callback.');
  const doc = root.ownerDocument, win = doc.defaultView;
  const shell = doc.createElement('section');
  shell.className = 'tb-ui';
  shell.setAttribute('aria-label', 'Tinderbox player controls');
  const suffix = '-' + (++instance);
  shell.innerHTML = markup.replaceAll('tb-movement-help', 'tb-movement-help' + suffix).replaceAll('tb-menu-title', 'tb-menu-title' + suffix);
  const style = doc.createElement('link');
  style.rel = 'stylesheet';
  style.href = new URL('./styles.css', import.meta.url).href;
  shell.prepend(style); root.append(shell);
  const find = selector => shell.querySelector(selector);
  const all = selector => [...shell.querySelectorAll(selector)];
  const stick = find('[data-stick]'), thumb = find('.tb-stick-thumb');
  const primary = find('[data-primary]'), pause = find('[data-pause]');
  const menuElement = find('[data-menu]'), listeners = [];
  let disposed = false, view = null, keys = new Set();
  let stickPointer = null, stickVector = {x: 0, y: 0}, lastMove = {x: 0, y: 0};
  let primaryPointer = null, primarySources = new Set();
  let menu = null, awaitingResume = false, previousFocus = null;
  let previousAnnouncement = '', wasBlocked = true, renderSignature = '';

  const on = (target, type, handler, options) => {
    target.addEventListener(type, handler, options);
    listeners.push(() => target.removeEventListener(type, handler, options));
  };
  const emit = command => { if (!disposed) onCommand(command); };
  const blocked = () => !view || view.locked || Boolean(menu);
  const capture = (element, id) => { try { element.setPointerCapture(id); } catch { /* Window listeners also handle synthetic/older pointers. */ } };
  const release = (element, id) => { if (id !== null) { try { if (element.hasPointerCapture(id)) element.releasePointerCapture(id); } catch { /* Already cancelled. */ } } };
  function sendMove(vector) {
    const value = normalizeStick(vector.x, vector.y);
    thumb.style.setProperty('--stick-x', String(value.x));
    thumb.style.setProperty('--stick-y', String(-value.y));
    stick.dataset.moving = String(value.x !== 0 || value.y !== 0);
    if (Math.abs(value.x - lastMove.x) > 0.00001 || Math.abs(value.y - lastMove.y) > 0.00001) {
      lastMove = value;
      emit({type: 'move', ...value}); // Raw stick: the simulation owns inversion.
    }
  }
  function keyboardVector() {
    return normalizeStick(Number(keys.has('KeyD') || keys.has('ArrowRight')) - Number(keys.has('KeyA') || keys.has('ArrowLeft')), Number(keys.has('KeyW') || keys.has('ArrowUp')) - Number(keys.has('KeyS') || keys.has('ArrowDown')));
  }
  function updateMovement() { sendMove(stickPointer !== null ? stickVector : keyboardVector()); }
  function trigger(source, pressed) {
    const before = primarySources.size > 0;
    if (pressed) primarySources.add(source); else primarySources.delete(source);
    const after = primarySources.size > 0;
    primary.classList.toggle('is-pressed', after);
    if (before !== after) emit({type: 'primary', pressed: after});
  }
  function releaseTrigger() {
    const id = primaryPointer; primaryPointer = null;
    const held = primarySources.size > 0; primarySources.clear();
    primary.classList.remove('is-pressed'); release(primary, id);
    if (held) emit({type: 'primary', pressed: false});
  }
  function cancelInput() {
    const id = stickPointer; stickPointer = null;
    keys.clear(); stickVector = {x: 0, y: 0}; release(stick, id);
    sendMove({x: 0, y: 0}); releaseTrigger(); emit({type: 'cancel-input'});
  }
  function focusMenu() { (menu === 'options' ? find('[data-reduce-motion]') : find('[data-resume]')).focus({preventScroll: true}); }
  function paintMenu() {
    menuElement.hidden = !menu;
    pause.setAttribute('aria-expanded', String(Boolean(menu)));
    find('[data-pause-panel]').hidden = menu === 'options';
    find('[data-options-panel]').hidden = menu !== 'options';
    find('[data-menu-title]').textContent = menu === 'options' ? 'Controls & options' : view?.paused ? 'Paused' : 'Pausing…';
    find('[data-pause-note]').textContent = view?.paused ? 'The trail can wait.' : 'Waiting for the scene to pause.';
  }
  function openMenu() {
    previousFocus = doc.activeElement; menu = 'pause'; awaitingResume = false;
    cancelInput(); paint(); focusMenu(); emit({type: 'pause', paused: true});
  }
  function resume() { awaitingResume = true; emit({type: 'pause', paused: false}); }
  function paint() {
    if (!view) return;
    const signature = JSON.stringify([view.tool.id, view.hp, view.maxHp, view.inventory, view.pouring, view.paused, view.effects, menu, primarySources.size]);
    if (signature === renderSignature) return;
    renderSignature = signature;
    const gated = blocked();
    stick.disabled = gated; stick.setAttribute('aria-disabled', String(gated));
    primary.disabled = view.primaryDisabled || Boolean(menu);
    primary.setAttribute('aria-pressed', String(view.pouring || primarySources.size > 0));
    primary.dataset.lit = String(view.pouring || primarySources.size > 0);
    primary.dataset.empty = String(view.stock <= 0);
    find('[data-primary-label]').textContent = view.primaryLabel.toUpperCase();
    find('[data-primary-mode]').textContent = view.pouring ? 'POURING' : view.stock <= 0 ? 'EMPTY' : ['torch', 'flamethrower'].includes(view.tool.id) ? 'HOLD' : 'PRESS';
    find('.tb-primary-icon').innerHTML = icon(view.pouring ? 'stop' : view.tool.id);
    primary.setAttribute('aria-label', view.primaryLabel + ' — ' + view.tool.label + (view.pouring ? '. Pouring is on.' : '. ' + stockText(view.stock) + ' ' + view.tool.unit));
    find('[data-tool-name]').textContent = view.tool.label;
    find('[data-tool-hint]').textContent = view.pouring ? 'Pouring · tap Stop to finish' : view.tool.hint;
    find('[data-selected-stock]').textContent = stockText(view.stock) + ' ' + view.tool.unit + (view.stock <= 0 ? ' · EMPTY' : '');
    find('[data-loadout-state]').textContent = view.dead ? 'BEAR DOWN' : view.paused ? 'PAUSED' : view.pouring ? '● POURING' : view.stock <= 0 ? 'EMPTY' : 'READY';
    for (const button of all('[data-tool]')) {
      const tool = TOOLS.find(item => item.id === button.dataset.tool);
      const stock = Number(view.inventory[tool.stock]) || 0, empty = stock <= 0;
      button.disabled = gated; // Empty tools stay inspectable; primary is disabled.
      button.dataset.empty = String(empty);
      button.setAttribute('aria-pressed', String(view.tool.id === tool.id));
      button.setAttribute('aria-label', tool.label + ', ' + stockText(stock) + ' ' + tool.unit + (empty ? ', empty' : ''));
      button.title = tool.label + ' · ' + tool.hint;
      button.querySelector('[data-stock]').textContent = empty ? 'EMPTY' : stockText(stock) + ' ' + tool.unit;
    }
    for (const button of all('[data-drug]')) {
      const drug = DRUGS.find(item => item.id === button.dataset.drug);
      const stock = Number(view.inventory[drug.id]) || 0;
      const full = drug.id === 'healing' && view.hp >= view.maxHp;
      const active = Boolean(view.effects[drug.id]?.active);
      button.disabled = gated || stock <= 0 || full;
      button.dataset.empty = String(stock <= 0); button.dataset.lit = String(active);
      button.setAttribute('aria-label', drug.label + ', ' + stockText(stock) + ' left. ' + drug.hint + (full ? '. Health full.' : ''));
      button.title = drug.label + ' · ' + drug.hint;
      button.querySelector('[data-stock]').textContent = stock <= 0 ? 'EMPTY' : full ? 'FULL' : '×' + stockText(stock);
    }
    find('[data-health-text]').textContent = Math.ceil(view.hp) + ' / ' + stockText(view.maxHp);
    find('[data-health-fill]').style.width = (view.hp / view.maxHp * 100) + '%';
    find('.tb-health-meter').setAttribute('aria-valuenow', String(view.hp));
    find('.tb-health-meter').setAttribute('aria-valuemax', String(view.maxHp));
    shell.dataset.lowHealth = String(view.hp / view.maxHp <= 0.3);
    for (const name of ['powder', 'inversion']) {
      const effect = find('[data-effect="' + name + '"]');
      effect.hidden = !view.effects[name].active;
      effect.querySelector('[data-time]').textContent = view.effects[name].remaining;
    }
    find('[data-death]').hidden = !view.dead; paintMenu();
    const announcement = view.tool.label + '. ' + (view.pouring ? 'Pouring on.' : 'Pouring off.') + (view.effects.powder.active ? ' Powder active.' : '') + (view.effects.inversion.active ? ' Movement reversed 180 degrees.' : '') + (view.dead ? ' Bear down.' : '');
    if (announcement !== previousAnnouncement) { find('[data-announcement]').textContent = announcement; previousAnnouncement = announcement; }
  }
  on(stick, 'pointerdown', event => {
    if (event.button !== 0 || stickPointer !== null || blocked()) return;
    event.preventDefault(); stickPointer = event.pointerId; stick.focus({preventScroll: true});
    capture(stick, event.pointerId);
    stickVector = pointerStick(event.clientX, event.clientY, stick.getBoundingClientRect()); updateMovement();
  });
  on(win, 'pointermove', event => {
    if (event.pointerId !== stickPointer || blocked()) return;
    event.preventDefault();
    stickVector = pointerStick(event.clientX, event.clientY, stick.getBoundingClientRect()); updateMovement();
  }, {passive: false});
  on(primary, 'pointerdown', event => {
    if (event.button !== 0 || primaryPointer !== null || primary.disabled) return;
    event.preventDefault(); primaryPointer = event.pointerId; primary.focus({preventScroll: true});
    capture(primary, event.pointerId); trigger('pointer', true); paint();
  });
  on(win, 'pointerup', event => {
    if (event.pointerId === stickPointer) {
      const id = stickPointer; stickPointer = null; stickVector = {x: 0, y: 0};
      release(stick, id); updateMovement();
    }
    if (event.pointerId === primaryPointer) {
      const id = primaryPointer; primaryPointer = null; release(primary, id);
      trigger('pointer', false); paint();
    }
  });
  on(win, 'pointercancel', event => {
    if (event.pointerId === stickPointer || event.pointerId === primaryPointer) { cancelInput(); paint(); }
  });
  for (const element of [stick, primary]) on(element, 'lostpointercapture', event => {
    if (event.pointerId === stickPointer || event.pointerId === primaryPointer) { cancelInput(); paint(); }
  });
  on(primary, 'click', event => {
    if (event.detail === 0 && !primary.disabled) { trigger('assistive', true); trigger('assistive', false); paint(); }
  });
  for (const button of all('[data-tool]')) on(button, 'click', () => {
    if (!button.disabled) { releaseTrigger(); emit({type: 'select-tool', tool: button.dataset.tool}); }
  });
  for (const button of all('[data-drug]')) on(button, 'click', () => {
    if (!button.disabled) emit({type: 'drug', drug: button.dataset.drug});
  });
  for (const button of all('button')) on(button, 'keydown', event => {
    if (event.repeat && (event.code === 'Space' || event.code === 'Enter')) event.preventDefault();
  });
  on(primary, 'keydown', event => {
    if (!['Space', 'Enter'].includes(event.code) || event.repeat || primary.disabled) return;
    event.preventDefault(); trigger('key:' + event.code, true); paint();
  });
  const moveCodes = new Set(['KeyW', 'KeyA', 'KeyS', 'KeyD', 'ArrowUp', 'ArrowDown', 'ArrowLeft', 'ArrowRight']);
  const editable = element => ['INPUT', 'TEXTAREA', 'SELECT'].includes(element?.tagName) || element?.isContentEditable;
  const gameplayFocus = element => element === doc.body || root.contains(element) || (element?.tagName === 'CANVAS' && root.parentElement?.contains(element));
  on(doc, 'focusin', event => {
    if (!gameplayFocus(event.target) && (keys.size || stickPointer !== null || primarySources.size || view?.pouring)) { cancelInput(); paint(); }
  });
  on(win, 'keydown', event => {
    if (event.defaultPrevented || event.ctrlKey || event.metaKey || event.altKey) return;
    const active = doc.activeElement;
    if (!gameplayFocus(active)) return;
    if (event.code === 'Tab' && menu) {
      const focusable = all('[data-menu] button, [data-menu] input').filter(element => !element.disabled && !element.closest('[hidden]'));
      const index = focusable.indexOf(active);
      if (event.shiftKey && index <= 0) { event.preventDefault(); focusable.at(-1)?.focus(); }
      else if (!event.shiftKey && (index < 0 || index === focusable.length - 1)) { event.preventDefault(); focusable[0]?.focus(); }
      return;
    }
    if (['Escape', 'KeyP'].includes(event.code)) {
      event.preventDefault();
      if (event.repeat) return;
      if (menu === 'options') { menu = 'pause'; paintMenu(); focusMenu(); }
      else if (menu) resume(); else openMenu();
      return;
    }
    if (blocked() || editable(event.target)) return;
    if (moveCodes.has(event.code)) {
      event.preventDefault(); keys.add(event.code); updateMovement();
    } else if (/^Digit[1-5]$/.test(event.code) && !event.repeat) {
      event.preventDefault(); all('[data-tool]')[Number(event.code.at(-1)) - 1].click();
    } else if (['KeyQ', 'KeyE', 'KeyR'].includes(event.code) && !event.repeat) {
      event.preventDefault(); all('[data-drug]')[['KeyQ', 'KeyE', 'KeyR'].indexOf(event.code)].click();
    } else if (event.code === 'Space' && (active === doc.body || active === stick || active?.tagName === 'CANVAS')) {
      event.preventDefault();
      if (!event.repeat && !primary.disabled) { trigger('key:Space', true); paint(); }
    }
  });
  on(win, 'keyup', event => {
    if (moveCodes.has(event.code) && keys.delete(event.code)) { event.preventDefault(); updateMovement(); }
    if (['Space', 'Enter'].includes(event.code) && primarySources.has('key:' + event.code)) {
      event.preventDefault(); trigger('key:' + event.code, false); paint();
    }
  });
  on(win, 'blur', () => { cancelInput(); paint(); });
  on(doc, 'visibilitychange', () => { if (doc.hidden) { cancelInput(); paint(); } });
  on(shell, 'contextmenu', event => { if (event.target.closest('[data-stick], [data-primary]')) event.preventDefault(); });
  on(pause, 'click', openMenu); on(find('[data-resume]'), 'click', resume);
  on(find('[data-options]'), 'click', () => { menu = 'options'; paintMenu(); focusMenu(); });
  on(find('[data-back]'), 'click', () => { menu = 'pause'; paintMenu(); focusMenu(); });
  on(find('[data-reset]'), 'click', () => { awaitingResume = true; cancelInput(); emit({type: 'reset'}); });
  on(find('[data-reduce-motion]'), 'change', event => shell.classList.toggle('tb-reduced-motion', event.target.checked));
  on(find('[data-contrast]'), 'change', event => shell.classList.toggle('tb-high-contrast', event.target.checked));
  for (const control of all('.tb-console button')) control.disabled = true;
  return {
    update(snapshot) {
      if (disposed) return;
      const previouslyPaused = view?.paused;
      view = viewOf(snapshot);
      if ((awaitingResume || previouslyPaused) && !view.paused) {
        awaitingResume = false; menu = null;
        if (previousFocus?.isConnected && previousFocus !== doc.body && gameplayFocus(previousFocus)) previousFocus.focus({preventScroll: true});
        else pause.focus({preventScroll: true});
      } else if (view.paused && !menu) {
        previousFocus = doc.activeElement; menu = 'pause'; paintMenu(); focusMenu();
      }
      const nowBlocked = blocked(), cancel = !wasBlocked && nowBlocked;
      wasBlocked = nowBlocked;
      if (cancel) cancelInput();
      if (view.primaryDisabled && primarySources.size) releaseTrigger();
      paint();
    },
    dispose() {
      if (disposed) return;
      cancelInput(); disposed = true;
      for (const remove of listeners.splice(0)) remove();
      shell.remove();
    }
  };
}
