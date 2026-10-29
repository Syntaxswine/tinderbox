import {ETCHING_SIZE, ETCHING_FRAMES} from './etching-frames.js';
import {bindInterfacePreferences, interfacePreferences} from './preferences.js';

const engraving = new URL('../../assets/art/ui/engraved-atlas.png', import.meta.url).href;
let instance = 0;
const text = (element, value) => { if (element.textContent !== value) element.textContent = value; };
const errorText = error => typeof error === 'string' ? error : typeof error?.message === 'string' ? error.message : error ? 'This place could not be opened. Please try again.' : '';

function visitMark(doc, suffix, number) {
  const frame = ETCHING_FRAMES.play, clip = 'tb-place-hand-' + suffix + '-' + number;
  const mark = doc.createElement('span');
  mark.className = 'tb-place-hand'; mark.setAttribute('aria-hidden', 'true');
  mark.innerHTML = '<svg viewBox="0 0 64 64"><svg viewBox="' + frame.join(' ') + '" width="64" height="64"><defs><clipPath id="' + clip + '" clipPathUnits="userSpaceOnUse"><rect x="' + frame[0] + '" y="' + frame[1] + '" width="' + frame[2] + '" height="' + frame[3] + '"></rect></clipPath></defs><image clip-path="url(#' + clip + ')" href="' + engraving + '" width="' + ETCHING_SIZE.width + '" height="' + ETCHING_SIZE.height + '"></image></svg></svg>';
  return mark;
}

// DOM-only presentation. The application owns catalogue data, loading and scene lifetime.
export function mountMainMenu({root, places = [], onSelect, characters = [], selectedCharacterId = null, onSelectCharacter, onBackToTitle, preferences = interfacePreferences} = {}) {
  if (!root?.ownerDocument || !Array.isArray(places) || typeof onSelect !== 'function') throw new TypeError('mountMainMenu requires a root, places and onSelect.');
  const seen = new Set();
  const entries = places.map(place => {
    if (!place || typeof place.id !== 'string' || !place.id || seen.has(place.id) || typeof place.title !== 'string' || !place.title.trim()) throw new TypeError('Place IDs must be unique and titles must be present.');
    seen.add(place.id);
    return {id:place.id, title:place.title, description:typeof place.description === 'string' ? place.description : '', previewUrl:typeof place.previewUrl === 'string' ? place.previewUrl : place.previewUrl instanceof URL ? place.previewUrl.href : ''};
  });
  if (!Array.isArray(characters)) throw new TypeError('Characters must be an array.');
  const characterIds = new Set();
  const animals = characters.map(character => {
    if (!character || typeof character.id !== 'string' || !character.id || characterIds.has(character.id) || typeof character.title !== 'string' || !character.title.trim()) throw new TypeError('Character IDs must be unique and titles must be present.');
    characterIds.add(character.id);
    return {id:character.id,title:character.title,description:typeof character.description === 'string' ? character.description : ''};
  });
  let selectedAnimal = characterIds.has(selectedCharacterId) ? selectedCharacterId : null;
  const doc = root.ownerDocument, shell = doc.createElement('section'), suffix = String(++instance);
  shell.className = 'tb-ui tb-main-menu'; shell.setAttribute('aria-labelledby', 'tb-places-title-' + suffix);
  shell.innerHTML = '<div class="tb-place-book tb-wood-panel"><div class="tb-place-paper"><header class="tb-place-heading"><p class="tb-place-kicker">AN EXPOSITION FIELD GUIDE · 1893</p><div class="tb-place-masthead" aria-hidden="true">TINDERBOX</div><div class="tb-place-rule"></div><h1 id="tb-places-title-' + suffix + '" tabindex="-1">Choose a map</h1><p>Select a map to test.</p></header><fieldset class="tb-character-choice" data-character-choice hidden><legend>Travel as</legend><p class="tb-character-note">Your choice accompanies your next visit.</p><div class="tb-character-options" data-character-options></div><p class="tb-character-description" data-character-description></p></fieldset><p class="tb-place-status" role="status" aria-live="polite" data-place-status>Choose a map.</p><section class="tb-place-error" data-place-error hidden aria-labelledby="tb-place-error-title-' + suffix + '"><h2 id="tb-place-error-title-' + suffix + '" aria-describedby="tb-place-error-message-' + suffix + '" tabindex="-1">Unable to open this place</h2><p id="tb-place-error-message-' + suffix + '" data-place-error-message></p><div class="tb-place-recovery"><button type="button" data-place-retry>Try again</button><button type="button" data-place-back>Back to places</button></div></section><div class="tb-place-grid" data-place-grid></div><p class="tb-place-empty" data-place-empty hidden>No places are available yet.</p><footer class="tb-place-footer"><span>Each destination opens as its own map.</span><button type="button" data-back-to-title hidden>Title screen</button></footer></div></div>';
  const style = doc.createElement('link'); style.rel = 'stylesheet'; style.href = new URL('./styles.css', import.meta.url).href;
  shell.prepend(style); root.append(shell);
  const unbindPreferences = bindInterfacePreferences(shell, preferences);
  const find = selector => shell.querySelector(selector), listeners = [], cards = new Map(), characterButtons = new Map();
  const on = (target, type, handler) => { target.addEventListener(type, handler); listeners.push(() => target.removeEventListener(type, handler)); };
  const grid = find('[data-place-grid]'), status = find('[data-place-status]'), errorPanel = find('[data-place-error]');
  let disposed = false, loadingId = null, message = '', failedId = null, lastRequested = null, lastLoading = null, dismissed = false, signature = '';

  function focusPlace(id) {
    if (disposed) return false;
    const card = cards.get(id) ?? cards.values().next().value;
    if (!card || card.button.disabled) { find('h1').focus({preventScroll:true}); return false; }
    card.button.focus(); return true;
  }
  function request(id) {
    if (disposed || loadingId || !cards.has(id)) return;
    lastRequested = id; dismissed = true; paint();
    onSelect(id);
  }
  function back() {
    if (disposed || loadingId) return;
    dismissed = true; paint(); focusPlace(failedId ?? lastRequested);
  }
  find('[data-character-choice]').hidden = animals.length === 0;
  for (const [index, animal] of animals.entries()) {
    const button = doc.createElement('button'); button.type = 'button'; button.className = 'tb-character-button'; button.dataset.selectCharacter = animal.id;
    button.setAttribute('aria-pressed', 'false');
    const name = doc.createElement('span'); name.textContent = animal.title;
    const mark = doc.createElement('small'); mark.dataset.characterMark = ''; mark.setAttribute('aria-hidden', 'true');
    const description = doc.createElement('span'); description.className = 'tb-sr-only'; description.id = 'tb-character-' + suffix + '-' + index; description.textContent = animal.description;
    button.setAttribute('aria-describedby', description.id); button.append(name, mark, description);
    find('[data-character-options]').append(button); characterButtons.set(animal.id, button);
    on(button, 'click', () => { if (!disposed && !loadingId && animal.id !== selectedAnimal && typeof onSelectCharacter === 'function') onSelectCharacter(animal.id); });
  }
  entries.forEach((place, index) => {
    const card = doc.createElement('article'); card.className = 'tb-place-card'; card.dataset.place = place.id;
    const figure = doc.createElement('div'); figure.className = 'tb-place-preview';
    if (place.previewUrl) {
      const img = doc.createElement('img'); img.src = place.previewUrl; img.alt = place.title + ', exterior model preview'; img.width = 1600; img.height = 1200; img.loading = 'lazy'; img.decoding = 'async';
      figure.append(img);
      on(img, 'error', () => { if (disposed || img.hidden) return; img.hidden = true; const label = doc.createElement('span'); label.className = 'tb-place-preview-missing'; label.textContent = 'Preview unavailable'; figure.append(label); });
    } else {
      figure.classList.add('tb-place-sign');
      const sign = doc.createElement('span'); sign.setAttribute('aria-hidden', 'true'); sign.textContent = place.title;
      figure.append(sign);
    }
    const details = doc.createElement('div'); details.className = 'tb-place-details';
    const heading = doc.createElement('h2'); heading.id = 'tb-place-' + suffix + '-' + index; heading.textContent = place.title;
    const description = doc.createElement('p'); description.id = heading.id + '-description'; description.textContent = place.description;
    const button = doc.createElement('button'); button.type = 'button'; button.className = 'tb-place-visit'; button.dataset.selectPlace = place.id; button.setAttribute('aria-describedby', description.id);
    const label = doc.createElement('span'); label.className = 'tb-place-action-text'; label.textContent = 'Open map';
    button.append(visitMark(doc, suffix, index), label);
    details.append(heading, description, button); card.append(figure, details); grid.append(card);
    cards.set(place.id, {place, card, button, label});
    on(button, 'click', () => request(place.id));
  });
  find('[data-place-empty]').hidden = entries.length > 0;
  find('[data-back-to-title]').hidden = typeof onBackToTitle !== 'function';
  on(find('[data-back-to-title]'), 'click', () => { if (!disposed && !loadingId && typeof onBackToTitle === 'function') onBackToTitle(); });
  for (const button of shell.querySelectorAll('button')) on(button, 'keydown', event => {
    if (event.repeat && ['Enter','Space'].includes(event.code)) event.preventDefault();
  });
  on(find('[data-place-retry]'), 'click', () => { if (failedId) request(failedId); });
  on(find('[data-place-back]'), 'click', back);
  on(shell, 'keydown', event => { if (event.code === 'Escape' && message && !dismissed && !loadingId) { event.preventDefault(); back(); } });

  function paint() {
    if (disposed) return;
    const next = JSON.stringify([loadingId, message, failedId, dismissed, selectedAnimal]);
    if (next === signature) return; signature = next;
    grid.setAttribute('aria-busy', String(Boolean(loadingId)));
    find('[data-back-to-title]').disabled = Boolean(loadingId);
    for (const {place, card, button, label} of cards.values()) {
      const opening = loadingId === place.id;
      button.disabled = Boolean(loadingId); card.dataset.loading = String(opening);
      button.setAttribute('aria-label', (opening ? 'Opening ' : 'Open ') + place.title + (opening ? '' : ' map'));
      text(label, opening ? 'Opening…' : 'Open map');
    }
    const animal = animals.find(entry => entry.id === selectedAnimal);
    for (const [id, button] of characterButtons) {
      button.disabled = Boolean(loadingId) || typeof onSelectCharacter !== 'function';
      button.setAttribute('aria-pressed', String(id === selectedAnimal));
      text(button.querySelector('[data-character-mark]'), id === selectedAnimal ? 'Selected' : 'Choose');
    }
    text(find('[data-character-description]'), animal?.description || 'Choose an animal for your next visit.');
    const errorVisible = Boolean(message && !dismissed && !loadingId);
    errorPanel.hidden = !errorVisible;
    text(find('[data-place-error-message]'), message);
    find('[data-place-retry]').hidden = !failedId;
    const openingTitle = cards.get(loadingId)?.place.title ?? 'your destination';
    text(status, loadingId ? 'Opening ' + openingTitle + (animal ? ' as ' + animal.title : '') + '…' : errorVisible ? 'Unable to open this place. Try again or choose another destination.' : animal ? 'Travel as ' + animal.title + '. Choose a map.' : 'Choose a map.');
  }
  paint();
  if (shell.isConnected && (doc.activeElement === doc.body || root.contains(doc.activeElement))) find('h1').focus({preventScroll:true});
  return {
    update(state = {}) {
      if (disposed) return;
      const previousError = message + '\n' + failedId, wasLoading = loadingId;
      if (Object.hasOwn(state, 'selectedCharacterId')) selectedAnimal = characterIds.has(state.selectedCharacterId) ? state.selectedCharacterId : null;
      loadingId = typeof state.loadingId === 'string' && state.loadingId ? state.loadingId : null;
      if (loadingId) lastLoading = loadingId;
      message = errorText(state.error);
      failedId = message ? (cards.has(state.error?.placeId) ? state.error.placeId : lastRequested ?? lastLoading) : null;
      if (previousError !== message + '\n' + failedId || loadingId !== wasLoading) dismissed = false;
      paint();
      if (message && !loadingId && !dismissed && (previousError !== message + '\n' + failedId || wasLoading)) find('.tb-place-error h2').focus();
    },
    focusPlace,
    dispose() { if (disposed) return; disposed = true; unbindPreferences(); for (const remove of listeners.splice(0)) remove(); shell.remove(); }
  };
}
