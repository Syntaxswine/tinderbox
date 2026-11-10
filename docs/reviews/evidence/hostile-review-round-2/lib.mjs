// Shared helpers for the round-1 hostile-review probes.
// Every probe drives the shipped simulation through its public entry point
// (createSimulation: dispatch / advance / snapshot). Nothing here edits game state directly.
import {createSimulation, DEFAULT_CONFIG} from '../../../../src/simulation/index.js';
import {scenarioDefinition} from '../../../../src/simulation/fixtures.js';
import {freePoint} from '../../../../src/simulation/geometry.js';
import {NEIGHBORHOOD_SCENARIO} from '../../../../src/content/neighborhood.js';

export {createSimulation, DEFAULT_CONFIG, scenarioDefinition, freePoint, NEIGHBORHOOD_SCENARIO};
export const STEP = DEFAULT_CONFIG.step;
export const round = (value, digits = 3) => value === null || value === undefined ? null : +(+value).toFixed(digits);

// One real match (or torch) press at a world point, exactly as the tests do it.
export function press(sim, x, y) {
  sim.dispatch({type: 'aim', x, y});
  sim.dispatch({type: 'primary', pressed: true});
  const snapshot = sim.advance(STEP);
  sim.dispatch({type: 'primary', pressed: false});
  return snapshot;
}

// The Catalogue Street the player gets from Play -> Catalogue Street, with the
// player moved next to a chosen target and holding matches.
export function street({player, patches, actors, extra = {}} = {}) {
  return {...NEIGHBORHOOD_SCENARIO, ...(patches ? {patches} : {}), ...(actors ? {actors} : {}),
    player: {...NEIGHBORHOOD_SCENARIO.player, ...player, tool: 'matches'}, ...extra};
}

// Collects every event exactly once across advance() calls (the ring holds 256 by default).
export function eventLog() {
  let last = 0;
  const all = [];
  return {all, take(snapshot) {
    const fresh = snapshot.events.filter(event => event.id > last);
    if (fresh.length) last = fresh.at(-1).id;
    all.push(...fresh);
    return fresh;
  }};
}

export function percentile(values, p) {
  if (!values.length) return null;
  const sorted = [...values].sort((a, b) => a - b);
  return sorted[Math.min(sorted.length - 1, Math.floor(p * sorted.length))];
}

export function table(rows, columns) {
  const cells = [columns, ...rows.map(row => columns.map(key => String(row[key] ?? '')))];
  const widths = columns.map((_, i) => Math.max(...cells.map(row => row[i].length)));
  return cells.map((row, n) => row.map((cell, i) => cell.padEnd(widths[i])).join('  ') +
    (n === 0 ? '\n' + widths.map(w => '-'.repeat(w)).join('  ') : '')).join('\n');
}
