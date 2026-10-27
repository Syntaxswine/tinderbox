import {createRuntime} from './runtime/index.js';
import {createArtScene} from './art/index.js';
import {mountUI} from './ui/index.js';

// The production composition. Every view consumes the same authoritative model.
export async function startGame({root = document.querySelector('#game'), autoStart = true, onSnapshot, ...options} = {}) {
  const viewport = root.querySelector('#viewport'), hud = root.querySelector('#hud');
  const loading = root.querySelector('#load-state');
  let art, runtime;
  function showError(error) {
    if (!loading) return;
    loading.hidden = false;
    loading.querySelector('span').textContent = 'The yard could not open. Check that WebGL 2 is enabled, then reload to try again.';
    if (!loading.querySelector('button')) {
      const retry = document.createElement('button'); retry.type = 'button'; retry.textContent = 'Reload';
      retry.addEventListener('click', () => location.reload(), {once:true}); loading.append(retry);
    }
    console.error(error);
  }
  try {
    runtime = await createRuntime({root:viewport, uiRoot:hud, scenario:'street', seed:1947, ...options,
      autoStart, mountUI, createArtScene:async args => (art = await createArtScene(args)), onSnapshot, onError:showError});
    const canvas = viewport.querySelector('canvas');
    canvas.tabIndex = 0; canvas.setAttribute('aria-label', 'Neighborhood. Point or tap to aim. Move with WASD or arrows.');
    if (loading) loading.hidden = true;
  } catch (error) { showError(error); throw error; }
  const onPageHide = event => { if (!event.persisted) runtime.dispose(); };
  window.addEventListener('pagehide', onPageHide);
  return {...runtime, artDiagnostics:() => art?.diagnostics(), dispose() {
    window.removeEventListener('pagehide', onPageHide); runtime.dispose();
  }};
}

if (document.querySelector('#game[data-autostart]')) startGame().catch(() => {});
