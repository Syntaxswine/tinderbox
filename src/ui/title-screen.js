import {ETCHING_SIZE, ETCHING_FRAMES} from './etching-frames.js';

const engraving = new URL('../../assets/art/ui/engraved-atlas.png', import.meta.url).href;
let instance = 0;

// DOM-only opening screen. The application decides when to show the places menu.
export function mountTitleScreen({root, onStart} = {}) {
  if (!root?.ownerDocument || typeof onStart !== 'function') throw new TypeError('mountTitleScreen requires a root and onStart.');
  const doc = root.ownerDocument, suffix = String(++instance), shell = doc.createElement('section');
  shell.className = 'tb-ui tb-title-screen'; shell.setAttribute('aria-labelledby', 'tb-title-' + suffix);
  const frame = ETCHING_FRAMES.play, clip = 'tb-title-hand-' + suffix;
  shell.innerHTML = '<div class="tb-title-book tb-wood-panel"><div class="tb-title-paper"><p class="tb-title-kicker">AN EXPOSITION CHRONICLE · 1893</p><div class="tb-title-rule"></div><h1 id="tb-title-' + suffix + '">TINDERBOX</h1><p class="tb-title-invitation">The Exposition awaits.</p><button type="button" class="tb-title-play" data-title-start><span class="tb-title-hand" aria-hidden="true"><svg viewBox="0 0 64 64"><svg viewBox="' + frame.join(' ') + '" width="64" height="64"><defs><clipPath id="' + clip + '" clipPathUnits="userSpaceOnUse"><rect x="' + frame[0] + '" y="' + frame[1] + '" width="' + frame[2] + '" height="' + frame[3] + '"></rect></clipPath></defs><image clip-path="url(#' + clip + ')" href="' + engraving + '" width="' + ETCHING_SIZE.width + '" height="' + ETCHING_SIZE.height + '"></image></svg></svg></span><span>Play</span></button><div class="tb-title-rule"></div><p class="tb-title-edition">FIELD EDITION</p></div></div>';
  const style = doc.createElement('link'); style.rel = 'stylesheet'; style.href = new URL('./styles.css', import.meta.url).href;
  shell.prepend(style); root.append(shell);
  const button = shell.querySelector('[data-title-start]');
  let disposed = false, started = false;
  const start = () => { if (disposed || started) return; started = true; onStart(); };
  const repeat = event => { if (event.repeat && ['Enter','Space'].includes(event.code)) event.preventDefault(); };
  button.addEventListener('click', start); button.addEventListener('keydown', repeat);
  function focusStart() { if (disposed) return false; button.focus(); return true; }
  if (shell.isConnected && (doc.activeElement === doc.body || root.contains(doc.activeElement))) focusStart();
  return {
    focusStart,
    dispose() { if (disposed) return; disposed = true; button.removeEventListener('click', start); button.removeEventListener('keydown', repeat); shell.remove(); }
  };
}
