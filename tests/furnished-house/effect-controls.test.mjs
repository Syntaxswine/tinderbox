import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import {mountEffectControls} from '../../workbenches/furnished-house/effect-controls.js';

// A finite DOM host exercises subscriptions/events without a browser or GPU.
// Native focus, label activation and Space remain combined browser acceptance.
class Element extends EventTarget {
  constructor(tagName, ownerDocument) {
    super();
    this.tagName = tagName.toUpperCase();
    this.ownerDocument = ownerDocument;
    this.children = [];
    this.dataset = {};
    this.attributes = new Map();
    this.checked = false;
  }
  append(...nodes) {
    for (const node of nodes) {
      node.parentElement = this;
      this.children.push(node);
    }
  }
  remove() {
    if (this.parentElement) {
      this.parentElement.children = this.parentElement.children.filter(node => node !== this);
      this.parentElement = null;
    }
  }
  setAttribute(name, value) { this.attributes.set(name, String(value)); }
  getAttribute(name) { return this.attributes.get(name) ?? null; }
}
function host() {
  const document = {createElement: tagName => new Element(tagName, document)};
  const root = document.createElement('section');
  root.id = 'fire-effect-settings';
  return root;
}
function store(initial = {}) {
  let value = {flames:true, smoke:true, lighting:true, ...initial};
  const listeners = new Set(), calls = [];
  return {
    calls,
    get subscriptions() { return listeners.size; },
    snapshot: () => ({...value}),
    set(patch) {
      calls.push({...patch});
      value = {...value, ...patch};
      for (const listener of [...listeners]) listener({...value});
    },
    subscribe(listener) {
      listeners.add(listener);
      listener({...value});
      return () => listeners.delete(listener);
    }
  };
}
function controls(root) {
  const group = root.children.find(node => node.tagName === 'FIELDSET');
  const labels = group.children.filter(node => node.tagName === 'LABEL');
  const inputs = Object.fromEntries(labels.map(label => [label.children[0].dataset.effect, label.children[0]]));
  return {group, labels, inputs};
}
const checked = inputs => Object.fromEntries(Object.entries(inputs).map(([key, input]) => [key, input.checked]));
function change(input, value) {
  input.checked = value;
  input.dispatchEvent(new Event('change', {bubbles:true}));
}

test('effect settings use three labelled native checkboxes, defaults and lighting help', () => {
  const root = host(), preferences = store(), dispose = mountEffectControls({root, preferences});
  const {group, labels, inputs} = controls(root);
  assert.equal(group.children[0].tagName, 'LEGEND');
  assert.equal(group.children[0].textContent, 'Settings');
  assert.deepEqual(labels.map(label => label.children[1].textContent), ['Flames', 'Smoke', 'Fire lighting']);
  for (const input of Object.values(inputs)) {
    assert.equal(input.tagName, 'INPUT');
    assert.equal(input.type, 'checkbox');
    assert.equal(input.getAttribute('tabindex'), null);
  }
  assert.deepEqual(checked(inputs), {flames:true, smoke:true, lighting:true});
  const help = group.children.find(node => node.id === inputs.lighting.getAttribute('aria-describedby'));
  assert.match(help.textContent, /cast by fire onto the surroundings/);
  assert.match(help.textContent, /Ambient night light stays on/);
  assert.equal(preferences.calls.length, 0, 'mount must not overwrite saved choices');
  dispose();
});

test('each checkbox changes only its own store key through all eight combinations', () => {
  const root = host(), preferences = store(), dispose = mountEffectControls({root, preferences});
  const {inputs} = controls(root), keys = ['flames', 'smoke', 'lighting'];
  for (let mask = 0; mask < 8; mask++) {
    const expected = Object.fromEntries(keys.map((key, index) => [key, Boolean(mask & (1 << index))]));
    for (const key of keys) {
      const before = preferences.calls.length;
      change(inputs[key], expected[key]);
      assert.equal(preferences.calls.length, before + 1);
      assert.deepEqual(preferences.calls.at(-1), {[key]:expected[key]});
    }
    assert.deepEqual(preferences.snapshot(), expected);
    assert.deepEqual(checked(inputs), expected);
  }
  dispose();
});

test('external preference updates synchronize without writes, remount preserves saved choices', () => {
  const root = host(), preferences = store({smoke:false});
  const dispose = mountEffectControls({root, preferences});
  let view = controls(root);
  assert.deepEqual(checked(view.inputs), {flames:true, smoke:false, lighting:true});
  preferences.set({flames:false, lighting:false});
  assert.deepEqual(checked(view.inputs), {flames:false, smoke:false, lighting:false});
  assert.equal(preferences.calls.length, 1, 'subscription render must not dispatch a change');
  const remount = mountEffectControls({root, preferences});
  view = controls(root);
  assert.equal(root.children.length, 1);
  assert.equal(preferences.subscriptions, 1);
  assert.deepEqual(checked(view.inputs), preferences.snapshot());
  dispose(); // A stale disposer cannot remove the replacement mount.
  assert.equal(root.children[0], view.group);
  remount();
  assert.equal(preferences.subscriptions, 0);
});

test('focused settings isolate keydown while retaining native keyboard defaults', () => {
  const root = host(), preferences = store(), dispose = mountEffectControls({root, preferences});
  const {group} = controls(root);
  for (const key of [' ', 'Tab', 'w', 'ArrowUp']) {
    const event = new Event('keydown', {bubbles:true, cancelable:true});
    Object.defineProperty(event, 'key', {value:key});
    group.dispatchEvent(event);
    assert.equal(event.defaultPrevented, false, key + ' browser default was cancelled');
    assert.equal(event.cancelBubble, true, key + ' reached the walking handler');
  }
  assert.equal(preferences.calls.length, 0, 'keydown must not synthesize preference changes');
  dispose();
});

test('disposal removes owned DOM, subscriptions and input handlers without resetting preferences', () => {
  const root = host(), preferences = store(), dispose = mountEffectControls({root, preferences});
  const {group, inputs} = controls(root), sibling = root.ownerDocument.createElement('p');
  root.append(sibling);
  change(inputs.smoke, false);
  dispose();
  dispose();
  assert.equal(preferences.subscriptions, 0);
  assert.deepEqual(root.children, [sibling]);
  const before = checked(inputs), writes = preferences.calls.length;
  preferences.set({flames:false});
  assert.deepEqual(checked(inputs), before, 'disposed controls received store updates');
  change(inputs.smoke, true);
  assert.equal(preferences.calls.length, writes + 1, 'detached input retained its change handler');
  const event = new Event('keydown', {bubbles:true, cancelable:true});
  group.dispatchEvent(event);
  assert.equal(event.cancelBubble, false, 'detached group retained keyboard isolation');
  assert.deepEqual(preferences.snapshot(), {flames:false, smoke:false, lighting:true});
});

test('the workbench has one scoped settings placeholder and phone-sized native control styles', () => {
  const html = fs.readFileSync(new URL('../../workbenches/furnished-house/index.html', import.meta.url), 'utf8');
  assert.equal([...html.matchAll(/id="fire-effect-settings"/g)].length, 1);
  assert.match(html, /#fire-effect-settings label\{[^}]*min-height:44px/);
  assert.match(html, /#fire-effect-settings input:focus-visible\{/);
});
