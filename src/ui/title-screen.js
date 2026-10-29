import {ETCHING_SIZE, ETCHING_FRAMES} from './etching-frames.js';
import {bindInterfacePreferences, interfacePreferences} from './preferences.js';

const engraving = new URL('../../assets/art/ui/engraved-atlas.png', import.meta.url).href;
let instance = 0;

// DOM-only opening screen. The application owns the transition into map selection.
export function mountTitleScreen({root, onStart, preferences = interfacePreferences} = {}) {
  if (!root?.ownerDocument || typeof onStart !== 'function') throw new TypeError('mountTitleScreen requires a root and onStart.');
  const doc = root.ownerDocument, suffix = String(++instance), shell = doc.createElement('section');
  shell.className = 'tb-ui tb-title-screen'; shell.dataset.screen = 'title';
  shell.setAttribute('aria-labelledby', 'tb-title-' + suffix);
  const mark = (id, name) => {
    const frame = ETCHING_FRAMES[id], clip = 'tb-title-' + name + '-hand-' + suffix;
    return '<span class="tb-title-hand" aria-hidden="true"><svg viewBox="0 0 64 64"><svg viewBox="' + frame.join(' ') + '" width="64" height="64"><defs><clipPath id="' + clip + '" clipPathUnits="userSpaceOnUse"><rect x="' + frame[0] + '" y="' + frame[1] + '" width="' + frame[2] + '" height="' + frame[3] + '"></rect></clipPath></defs><image clip-path="url(#' + clip + ')" href="' + engraving + '" width="' + ETCHING_SIZE.width + '" height="' + ETCHING_SIZE.height + '"></image></svg></svg></span>';
  };
  shell.innerHTML = '<div class="tb-title-book tb-wood-panel"><div class="tb-title-paper"><p class="tb-title-kicker">AN EXPOSITION CHRONICLE · 1893</p><div class="tb-title-rule"></div><h1 id="tb-title-' + suffix + '">TINDERBOX</h1><p class="tb-title-invitation" data-title-invitation>The Exposition awaits.</p><div class="tb-title-actions" data-title-actions><button type="button" class="tb-title-action tb-title-play" data-title-start>' + mark('play','play') + '<span>Play</span></button><button type="button" class="tb-title-action tb-title-options-button" data-title-options-open>' + mark('options','options') + '<span>Options</span></button><p class="tb-title-map-note">Choose a map after Play.</p></div><section class="tb-title-options" data-title-options hidden aria-labelledby="tb-title-options-' + suffix + '"><h2 id="tb-title-options-' + suffix + '" tabindex="-1">Options</h2><p class="tb-title-options-note">Interface preferences apply to this session.</p><fieldset><legend>Display</legend><label class="tb-title-option"><input type="checkbox" data-reduce-motion><span>Reduce interface motion<small>Keep interface movement to a minimum.</small></span></label><label class="tb-title-option"><input type="checkbox" data-contrast><span>High contrast labels<small>Stronger ink and clearer control labels.</small></span></label></fieldset><details class="tb-title-controls"><summary>Controls</summary><dl><div><dt>Move</dt><dd>WASD, arrows or the movement stick</dd></div><div><dt>Street tools</dt><dd>Tap a tool or press Space; 1–5 selects</dd></div><div><dt>Explore</dt><dd>E or Space when an action is available</dd></div><div><dt>Pause</dt><dd>Esc or P</dd></div><div><dt>Medicine</dt><dd>Walk over it to use it</dd></div></dl></details><button type="button" class="tb-title-back" data-title-options-back>Back to title</button></section><div class="tb-title-rule"></div><p class="tb-title-edition">FIELD EDITION</p></div></div>';
  const style = doc.createElement('link'); style.rel = 'stylesheet'; style.href = new URL('./styles.css', import.meta.url).href;
  shell.prepend(style); root.append(shell);
  const find = selector => shell.querySelector(selector), button = find('[data-title-start]'), optionsButton = find('[data-title-options-open]');
  const unbindPreferences = bindInterfacePreferences(shell, preferences), listeners = [];
  let disposed = false, started = false, optionsOpen = false;
  const on = (target, type, handler) => { target.addEventListener(type, handler); listeners.push(() => target.removeEventListener(type, handler)); };
  function showOptions(open, focus = true) {
    if (disposed) return;
    optionsOpen = open; shell.dataset.screen = open ? 'options' : 'title';
    find('[data-title-actions]').hidden = open; find('[data-title-invitation]').hidden = open; find('[data-title-options]').hidden = !open;
    shell.setAttribute('aria-labelledby', (open ? 'tb-title-options-' : 'tb-title-') + suffix);
    if (focus) (open ? find('.tb-title-options h2') : optionsButton).focus();
  }
  on(button, 'click', () => { if (disposed || started || optionsOpen) return; started = true; onStart(); });
  on(optionsButton, 'click', () => { if (!disposed && !started) showOptions(true); });
  on(find('[data-title-options-back]'), 'click', () => showOptions(false));
  on(shell, 'keydown', event => {
    if (event.repeat && ['Enter','Space'].includes(event.code) && event.target.tagName === 'BUTTON') event.preventDefault();
    if (event.code === 'Escape' && optionsOpen) { event.preventDefault(); showOptions(false); }
  });
  function focusStart() { if (disposed) return false; showOptions(false, false); button.focus(); return true; }
  if (shell.isConnected && (doc.activeElement === doc.body || root.contains(doc.activeElement))) focusStart();
  return {
    focusStart,
    dispose() { if (disposed) return; disposed = true; unbindPreferences(); for (const remove of listeners.splice(0)) remove(); shell.remove(); }
  };
}
