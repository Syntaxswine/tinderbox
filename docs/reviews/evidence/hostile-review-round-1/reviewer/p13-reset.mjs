// D: stale state after reset. Burn the south block for 15 s, reset, then replay the same match; compare with a fresh simulation.
import {createHash} from 'node:crypto';
import {createSimulation, NEIGHBORHOOD_SCENARIO, COTTAGE_PAIR_SCENARIO, ROOT, press, r, STEP} from './lib.mjs';
import {readFileSync} from 'node:fs';
const {PAIR_WIND_URL, translateCottageWind} = await import(ROOT + 'reuse/ashland/wind.js');
const wind = translateCottageWind(JSON.parse(readFileSync(PAIR_WIND_URL)));
const digest = s => createHash('sha256').update(JSON.stringify({
  cells: s.cells.map(c => [c.phase, c.heat, c.surfaceFuel, c.depositedFuel]), sites: s.structureFire.map(x => [x.id, x.flame, x.heatFraction]),
  buildings: s.world.buildings.map(b => [b.id, b.destroyed, b.burnedFraction, (b.sections ?? []).map(x => x.present)]), obstacles: s.world.obstacles.map(o => [o.id, o.height]).sort(),
  world: s.clocks.world, cottage: s.cottageFire ? [s.cottageFire.buildings.map(b => [b.gone, b.deadline, b.tiles.map(t => [t.roof, t.upper, t.lower]), b.cells.length]), s.cottageFire.embers.length, s.cottageFire.diagnostics.launches] : null,
  inventory: s.player.inventory, hp: s.player.hp})).digest('hex').slice(0, 16);
for (const [label, scenario, aim, extra] of [
  ['default street', {...NEIGHBORHOOD_SCENARIO, player: {x: 13, y: 27.6, tool: 'matches'}}, [13, 28.4], {}],
  ['cottage pair + wind', {...COTTAGE_PAIR_SCENARIO}, [51, 13.5], {cottageWind: wind}]]) {
  const make = () => createSimulation({scenario, seed: 1893, config: {fire: {damagePerSecond: 0}}, ...extra});
  const used = make();
  press(used, ...aim); for (let i = 0; i < 60; i++) used.advance(.25);
  const dirty = digest(used.snapshot());
  used.dispatch({type: 'reset'}); used.advance(STEP);
  const fresh = make(); fresh.advance(STEP);
  const cold = [digest(used.snapshot()), digest(fresh.snapshot())];
  press(used, ...aim); press(fresh, ...aim);
  let a, b; for (let i = 0; i < 80; i++) { a = used.advance(.25); b = fresh.advance(.25); }
  console.log(label.padEnd(20), '| mid-fire digest', dirty, '| after reset vs fresh (cold):', cold[0] === cold[1] ? 'IDENTICAL' : 'DIFFERENT', cold.join(' / '),
    '| replay +20 s after reset vs fresh:', digest(a) === digest(b) ? 'IDENTICAL' : 'DIFFERENT', digest(a), digest(b));
  used.dispose(); fresh.dispose();
}
