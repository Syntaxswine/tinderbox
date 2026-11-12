// Shared helpers for the round-1 reviewer's probes. Read-only against the checkout.
// Written by the hostile reviewer; only the two path constants were changed to make the probes portable.
export const ROOT = new URL('../../../../../src/', import.meta.url).href;
export const REPO = new URL('../../../../../', import.meta.url);
export const sim$ = await import(ROOT + 'simulation/index.js');
export const {createSimulation, DEFAULT_CONFIG} = sim$;
export const {NEIGHBORHOOD_SCENARIO, NEIGHBORHOOD_BASE} = await import(ROOT + 'content/neighborhood.js');
export const {COTTAGE_PAIR_SCENARIO} = await import(ROOT + 'content/cottage-pair.js');
export const {calmCottageWind} = await import(ROOT + 'reuse/ashland/wind.js');
export const STEP = DEFAULT_CONFIG.step;

// Same input sequence the repo's own tests use to strike a match.
export function press(sim, x, y) {
  sim.dispatch({type: 'aim', x, y});
  sim.dispatch({type: 'primary', pressed: true});
  const snapshot = sim.advance(STEP);
  sim.dispatch({type: 'primary', pressed: false});
  return snapshot;
}
export const lastTool = s => s.events.findLast(e => e.type === 'tool-use' || e.type === 'tool-rejected');
export const r = (v, n = 3) => v === null || v === undefined || !Number.isFinite(v) ? v : +v.toFixed(n);
export function buildingSummary(s) {
  return s.world.buildings.map(b => ({id: b.id, destroyed: b.destroyed, burned: r(b.burnedFraction),
    first: r(Math.min(...(b.sections ?? []).map(x => x.firstIgnition ?? Infinity))),
    sectionsLeft: (b.sections ?? []).filter(x => x.present).length + '/' + (b.sections ?? []).length}));
}
export function groundSummary(s) {
  let burning = 0, spent = 0, heating = 0, fuel = 0;
  for (const c of s.cells) {
    if (c.phase === 'burning') burning++; else if (c.phase === 'spent') spent++; else if (c.phase === 'heating') heating++;
    fuel += c.surfaceFuel + c.depositedFuel;
  }
  return {burning, spent, heating, fuel: r(fuel, 4)};
}
// Advance by whole ticks so the sampled world time is exact.
export function run(sim, seconds, each) {
  const ticks = Math.round(seconds / STEP);
  let s;
  for (let i = 0; i < ticks; i++) { s = sim.advance(STEP); if (each && each(s, i) === false) break; }
  return s;
}
